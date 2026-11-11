/** 主线及独立战报播放器：复用BattlePage及真实资源，只展示服务端战报，不请求奖励或修改资产。 */
import { AudioClip,AudioSource,Button,Color,director,Director,Material,Node,sp,Sprite,SpriteFrame,Tween,tween,UIOpacity,UITransform,Vec3 } from "cc";
import { GameLog } from "../../../core/GameLog";
import { createAssetScope, ResourceAssetsUtils } from "../../../framework/assets/ResourceAssets";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { registerView } from "../../../framework/ui/UIRegistry";
import { setText } from "../../../framework/ui/UiKit";
import { BattleReplayPlayer } from "../BattleReplayPlayer";
import { BattleAttackUtils } from "../utils/BattleAttackUtils";
import { BattleReplayUtils } from "../utils/BattleReplayUtils";
import { BattleInfoUtils } from "../utils/BattleInfoUtils";
import { bindVisibleRefresh, readVisibleBox } from "../../../framework/ui/visibleFit";
import { mountBattlePrefab } from "./BattlePage";
import { ChapterEndView } from "./ChapterEndView";
import { MainChapterIdleDisplay } from "./MainChapterIdleDisplay";
import { paintBattleFloats } from "./battlePresentView";
import { mountBattleSpine,mountNamedSpine,SpineActor } from "./battleSpine";

/** 同源配置行，只消费当前已核对的近身/远程、伤害音效和201图标字段。 */
interface BuffRow { idx: number; type: number; ani_base: string; file: string; sound: string; buff_icon: number; delay: number; shake: number; dimly: number; }

/** 技能台展示上下文：主动按真实事件定位，被动保留完整触发过程。 */
export interface SkillReplayFocus {
    skillId: number;
    level: number;
    name: string;
    passive: boolean;
    replay: () => void;
}

export class BattleReplayPreview {
    /** 装载资源后执行二进制战报；遇敌可借用行军骨骼，返回的关场函数先归还骨骼再销毁战场。
     * onIdleDeath仅向挂机页提供真实阵亡的世界位置用于资源飞行，不是奖励事件，正式挑战不调用。 */
    public static async open(
        parent: Node,
        bytes: Uint8Array,
        defeatPresentation = false,
        onClosed?: () => void,
        audit?: SkillReplayFocus,
        lineupTitle?: string,
        persistentChapter = false,
        onCompleted?: (won: boolean) => Promise<void>,
        idleEncounter = false,
        isCancelled: () => boolean = () => false,
        retainedIdle?: MainChapterIdleDisplay,
        onIdleDeath?: (world: Readonly<Vec3>) => void,
    ): Promise<() => void> {
        const steps = BattleReplayUtils.decode(bytes);
        const units = BattleReplayUtils.units(bytes);
        const configScope = createAssetScope();
        let templateRows: { type: number; elem: number }[];
        let rows: BuffRow[];
        try {
            const templates = await configScope.loadPath("config/herotype", "JsonAsset");
            const config = await configScope.loadPath("config/buff", "JsonAsset");
            templateRows = (templates.json as { rows: { type: number; elem: number }[] }).rows;
            rows = (config.json as { rows: BuffRow[] }).rows;
        } finally {
            // 后续只读取普通配置对象，释放JsonAsset持有，不保留引擎资产缓存。
            configScope.dispose();
        }
        const elementPaths = ["hero/ui/hero-icon_elem-1/spriteFrame", "hero/ui/hero-icon_elem-2/spriteFrame",
            "hero/ui/hero-icon_elem-3/spriteFrame", "hero/ui/hero-icon_elem-4/spriteFrame",
            "hero/ui/hero-icon_elem-5/spriteFrame"];
        const selected = new Map<number, BuffRow>();
        // 一个旧Buff可展开多个并行表现，索引仅供本页资源缓存使用，不修改权威事件。
        const expanded = new Map<number, readonly BuffRow[]>();
        for (const step of steps) {
            if (step.kind === "presentation" || step.kind === "buff.upsert" || step.kind === "damage" || step.kind === "recovery") {
                const row = rows.find(row => row.idx === step.configId);
                if (!row) throw new Error("缺少战斗表现配置：" + step.configId);
                if (step.kind === "damage" && row.type === 100) BattleAttackUtils.damageSounds(row);
                if (step.kind === "presentation") {
                    const actions = BattleAttackUtils.legacyActions(row);
                    for (const action of actions) {
                        BattleAttackUtils.plan(action);
                        selected.set(action.idx, action);
                    }
                    if (actions[0].idx !== row.idx) {
                        expanded.set(row.idx, actions);
                    }
                } else {
                    selected.set(row.idx, row);
                }
            }
        }
        if (isCancelled() || !parent.isValid) throw new Error("战场打开已取消");
        const shell = await mountBattlePrefab(parent);
        // 正式挑战先播旧 ZDKS 开场；加载期间不提前露出英雄和血条。
        const formalOpening = persistentChapter && !idleEncounter;
        if (idleEncounter) {
            // 整个准备阶段不可见，不能让Prefab默认血条或异步骨骼先闪一帧。
            shell.layerField.active = false;
            shell.root.getChildByPath("LayerHud/HpBars")!.active = false;
        }
        // 只加速正式挑战的战报段；开场、挂机和结算继续使用各自的时钟。
        let playbackScale = 1;
        if (formalOpening) {
            shell.layerField.active = false;
            shell.root.getChildByPath("LayerHud/HpBars")!.active = false;
            const hud = shell.root.getChildByName("LayerHud")!;
            hud.getChildByName("MatchInfo")!.setPosition(hud.getChildByName("ChapterMatchInfoAnchor")!.position);
            hud.getChildByName("TopBar")!.setPosition(hud.getChildByName("ChapterTopBarAnchor")!.position);
            const speedButton = hud.getChildByPath("TopBar/BtnSpeed")!;
            speedButton.active = true;
            const explainSpeed = () => UIManager.instance.toast(BattleInfoUtils.speedLockedNotice());
            speedButton.on(Button.EventType.CLICK, explainSpeed);
            shell.root.once(Node.EventType.NODE_DESTROYED, () => speedButton.off(Button.EventType.CLICK, explainSpeed));
            hud.getChildByName("BtnSkip")!.active = BattleInfoUtils.mainChapterSkipVisible();
        }
        if (persistentChapter) {
            bindVisibleRefresh(shell.root, () => {
                const scale = BattleInfoUtils.contentScale(readVisibleBox().width);
                shell.root.setScale(scale, scale, 1);
            });
            // 正式主线复用主页背景；测试开始/撤退/调试文字不混入玩家战场。
            for (const path of ["Bg", "CampaignFloor", "LayerHud/Log", "LayerHud/LogBg",
                "LayerHud/BtnRetreat", "LayerHud/TopBar/BtnClose"]) {
                const node = shell.root.getChildByPath(path);
                if (node) {
                    node.active = false;
                }
            }
        }
        if (idleEncounter) {
            for (const path of ["LayerHud/MatchInfo", "LayerHud/TopBar", "LayerHud/BtnSpeed", "LayerHud/BtnSkip"]) {
                const node = shell.root.getChildByPath(path);
                if (node) node.active = false;
            }
        }
        const unregisterEnd = idleEncounter ? () => {} : registerView(ChapterEndView, {
            id: "chapter-end", prefab: "bundles/battle/prefabs/ChapterEndView", layer: UILayer.Popup,
            hostId: persistentChapter ? "remake-modal" : "battle-settlement", cache: false, allowMultiple: false
        });
        // 正常结算必须在应用弹层，避免完整旧胜利页被挂机面板遮挡；技能台仍归本地战场清理。
        const releaseEndHost = idleEncounter || persistentChapter ? () => {} : UIManager.instance.setResidentHost("battle-settlement", () => shell.root.isValid ? shell.root : null);
        for (const path of ["LayerAppear", "LayerHud/SkillBars"]) {
            const node = shell.root.getChildByPath(path);
            if (node) node.active = false;
        }
        setText(shell.root.getChildByPath("LayerHud/MatchInfo/AllyNameLabel")!, persistentChapter ? "主线挑战阵容" : lineupTitle ? "当前保存阵容·只读" : "独立测试阵容");
        setText(shell.root.getChildByPath("LayerHud/MatchInfo/EnemyNameLabel")!, lineupTitle || (units.some(unit => unit.templateId === 10105011) ? "魅惑之拥·随机目标验收" : units.every(unit => unit.templateId === 10505005) ? "三级流血专项" : units.every(unit => unit.templateId === 10205023) ? "奈奈子技能验收" : units.length === 4 ? "独立多目标验收" : units.length === 3 ? "主线第3关" : units.find(unit => unit.faction === 2)!.templateId === 10505005 ? "主线第2关" : "主线第1关"));
        const actors = new Map<number, SpineActor>();
        // 借用的我方骨骼在所有退出路径先归还，不能随临时战场销毁。
        const returnActors: (() => void)[] = [];
        const slots = new Map<number, Node>();
        /** 当前出场单位的头顶血条，随英雄槽移动；页面关闭时随预制体销毁。 */
        const hpRows = new Map<number, Node>();
        // 挂机挂点和模型比例独立保存在Prefab；正式八槽及技能台保持各自布局。
        const idleLayout = shell.root.getChildByName("IdleLayout")!;
        const heroScale = idleEncounter ? idleLayout.getChildByName("ModelScale")!.scale.x : 0.48;
        const hpOffset = idleEncounter ? idleLayout.getChildByName("HpOffset")!.position.y : 120;
        /** 血条保留HUD层，每帧跟随槽世界坐标，保证所有骨骼都绘制在血条下方。 */
        const syncHpRows = () => {
            for (const [id, row] of hpRows) {
                const slot = slots.get(id);
                if (!slot?.isValid || !row.isValid || !row.parent) continue;
                const world = slot.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(0, hpOffset, 0));
                row.setPosition(row.parent.getComponent(UITransform)!.convertToNodeSpaceAR(world));
            }
        };
        director.on(Director.EVENT_AFTER_UPDATE, syncHpRows);
        const origins = new Map<number, Vec3>();
        const sounds = new Map<string, AudioClip>();
        const icons = new Map<number, SpriteFrame>();
        /** 预载各效果真实帧，整页共享；临时特效节点在结束/取消时销毁。 */
        const frames = new Map<number, SpriteFrame[]>();
        const effects = new Set<Node>();
        /** 眩晕同类型共享一个循环节点；帧预载，实例变化时检查是否仍有1005。 */
        const dizzyEffects = new Map<number, Node>();
        let dizzyFrames: SpriteFrame[] = [];
        /** 本场冰冻材质及各骨骼原材质，最后一层解除时恢复，关场释放。 */
        let frozenMaterial: Material | null = null;
        const frozenActors = new Map<number, Material | null>();
        const activeBuffs = new Map<number, Map<string, number>>(units.map(unit => [unit.unitId, new Map<string, number>()]));
        const audio = shell.root.addComponent(AudioSource);
        audio.node.on(AudioSource.EventType.STARTED, () => {
            GameLog.shared.classified("MODULE", "info", "BattleReplayPreview", "audio.started " + audio.clip?.name);
        });
        let closed = false;
        /** 每个并行效果单独登记等待；停止时全部结束，代次使后续回调失效。 */
        const waits = new Set<() => void>();
        let effectEpoch = 0;
        const rootOrigin = shell.root.position.clone();
        const dimNode = shell.root.getChildByPath("LayerVfx/VfxScreen/DimOverlay")!;
        const dimOpacity = dimNode.getComponent(UIOpacity)!;
        const viewport = shell.root.getComponent(UITransform)!;
        dimNode.getComponent(UITransform)!.setContentSize(viewport.width + 50, viewport.height + 50);
        let player: BattleReplayPlayer | null = null;
        /** 窗口关闭与节点销毁共用一次清理，避免重复访问已销毁组件。 */
        let stopped = false;
        /** 停止动画等待、声音并恢复站位；不更改服务器数据。 */
        const stop = () => {
            if (stopped) return;
            stopped = true;
            for (const actor of actors.values()) {
                const opacity = actor.node.getComponent(UIOpacity);
                if (opacity) Tween.stopAllByTarget(opacity);
            }
            for (const release of returnActors) release();
            director.off(Director.EVENT_AFTER_UPDATE, syncHpRows);
            Tween.stopAllByTarget(shell.root);
            effectEpoch++;
            Tween.stopAllByTarget(dimOpacity);
            if (dimOpacity.isValid) dimOpacity.opacity = 0;
            if (shell.root.isValid) shell.root.setPosition(rootOrigin);
            const pending = Array.from(waits);
            waits.clear();
            for (const [id, slot] of slots) {
                Tween.stopAllByTarget(slot);
                if (slot.isValid) slot.setPosition(origins.get(id)!);
            }
            for (const node of effects) {
                Tween.stopAllByTarget(node);
                if (node.isValid) node.destroy();
            }
            effects.clear();
            dizzyEffects.clear();
            for (const [id, material] of frozenActors) {
                const skeleton = actors.get(id)?.node.getComponent(sp.Skeleton);
                if (skeleton?.isValid) {
                    skeleton.customMaterial = material;
                    skeleton.paused = false;
                }
            }
            frozenActors.clear();
            const releasedMaterial = frozenMaterial;
            frozenMaterial = null;
            if (releasedMaterial?.isValid) releasedMaterial.destroy();
            if (audio.isValid) audio.stop();
            for (const finish of pending) finish();
        };
        /** 战场销毁才释放结算入口；正常播放结束仍需打开结算。 */
        const releaseSettlement = () => {
            if (!idleEncounter) UIManager.instance.closeById("chapter-end");
            releaseEndHost();
            unregisterEnd();
        };
        // 异步开场尚未交出取消口时，父窗口销毁也必须释放计时与资源。
        shell.root.once(Node.EventType.NODE_DESTROYED, () => {
            closed = true;
            player?.stop();
            stop();
            releaseSettlement();
        });
        /** 延迟使用本场战报倍率与引擎时钟，随Creator暂停；关页结束等待，不改变全局导演速度。 */
        const wait = (seconds: number) => new Promise<void>(resolve => {
            if (closed || isCancelled() || !shell.root.isValid) { resolve(); return; }
            const finish = () => { waits.delete(finish); resolve(); };
            waits.add(finish);
            tween(shell.root).delay(seconds / playbackScale).call(finish).start();
        });
        /** 只更新预制体血条，实际扣血已由整包校验确认。 */
        const hp = (id: number, value: number) => {
            const label = hpRows.get(id)?.getChildByName("Label");
            if (!label?.parent) throw new Error("战斗血条挂点缺失");
            label.parent.active = value > 0;
            // 等级来自整包校验后的服务器快照，不按关卡或模板猜测。
            setText(label, String(units.find(unit => unit.unitId === id)!.level));
            const fill = label.parent.getChildByName("Fill")!;
            const max = units.find(unit => unit.unitId === id)!.maxHp;
            fill.active = value > 0;
            fill.getComponent(Sprite)!.fillRange = Math.max(0, Math.min(1, value / max));
        };
        /** 按实例维护图标；同配置多实例移除一层不误清全部。 */
        const paintBuffs = (id: number) => {
            const row = slots.get(id)!.getChildByPath("HeadAnchor/BuffRow");
            if (!row) throw new Error("战斗Buff挂点缺失");
            const values = Array.from(activeBuffs.get(id)!.values());
            row.active = values.length > 0;
            const skeleton = actors.get(id)?.node.getComponent(sp.Skeleton);
            const frozen = values.some(configId => selected.get(configId)?.type === 1004);
            if (skeleton && frozen && !frozenActors.has(id)) {
                frozenActors.set(id, skeleton.customMaterial);
                skeleton.customMaterial = frozenMaterial;
                skeleton.paused = true;
            } else if (skeleton && !frozen && frozenActors.has(id)) {
                skeleton.customMaterial = frozenActors.get(id)!;
                skeleton.paused = false;
                frozenActors.delete(id);
                actors.get(id)!.play("stand");
            }
            const dizzy = values.some(configId => selected.get(configId)?.type === 1005);
            const previous = dizzyEffects.get(id);
            if (!dizzy && previous) {
                Tween.stopAllByTarget(previous);
                effects.delete(previous);
                previous.destroy();
                dizzyEffects.delete(id);
            } else if (dizzy && !previous) {
                const node = new Node("DizzyEffect");
                node.layer = row.layer;
                node.parent = slots.get(id)!;
                // 旧NODE_SIZE.height=120，节点缩放0.65，顶部额外50*0.65。
                node.setPosition(0, (120 + 50 * 0.65) * 0.65, 0);
                node.setScale(0.65, 0.65, 1);
                node.addComponent(UITransform).setAnchorPoint(0.5, 0.43);
                const sprite = node.addComponent(Sprite);
                sprite.sizeMode = Sprite.SizeMode.RAW;
                sprite.trim = false;
                sprite.spriteFrame = dizzyFrames[0];
                let cycle = tween(node);
                for (const frame of dizzyFrames) {
                    cycle = cycle.call(() => { sprite.spriteFrame = frame; }).delay(0.05 / playbackScale);
                }
                tween(node).repeatForever(cycle).start();
                effects.add(node);
                dizzyEffects.set(id, node);
            }
            for (let i = 0; i < 3; i++) {
                const chip = row.getChildByName("Buff_" + i);
                if (!chip) throw new Error("战斗Buff槽缺失");
                chip.active = i < values.length;
                if (i < values.length) {
                    const sprite = chip.getComponent(Sprite);
                    if (!sprite) throw new Error("战斗Buff槽缺少Sprite");
                    sprite.color = Color.WHITE;
                    sprite.spriteFrame = icons.get(values[i])!;
                }
            }
        };
        const assets = ResourceAssetsUtils.forNode(shell.root);
        try {
            if (Array.from(selected.values()).some(row => row.type === 1004)) {
                const effect = await assets.loadPath("battle/effects/legacy-frozen", "EffectAsset");
                frozenMaterial = new Material();
                frozenMaterial.initialize({ effectAsset: effect });
                if (!units.every(unit => unit.templateId === 10205023)) {
                    setText(shell.root.getChildByPath("LayerHud/MatchInfo/EnemyNameLabel")!, "独立冰冻验收");
                }
            }
            if (Array.from(selected.values()).some(row => row.type === 1005)) {
                dizzyFrames = await Promise.all(BattleAttackUtils.dizzyFrames().map(path =>
                    assets.loadPath(path, "SpriteFrame")));
            }
            for (const row of selected.values()) {
                if (row.type === 1 || row.type === 11 || row.type === 2 || row.type === 3 || row.type === 5 || row.type === 6 || row.type === 7 || row.type === 9 || row.type === 100) {
                    const names = row.type === 100 ? BattleAttackUtils.damageSounds(row) : BattleAttackUtils.plan(row).sounds;
                    if (row.type !== 100) {
                        const effect = BattleAttackUtils.plan(row).effect;
                        if (effect) frames.set(row.idx, await Promise.all(effect.paths.map(path =>
                            assets.loadPath(path, "SpriteFrame"))));
                    }
                    for (const name of names) {
                        sounds.set(name, await assets.loadPath("audio/" + name, "AudioClip"));
                    }
                } else if (row.buff_icon) {
                    icons.set(row.idx, await assets.loadPath(
                        "hero/ui/skill-icon_" + row.buff_icon + "/spriteFrame", "SpriteFrame"));
                }
            }
            for (const side of ["ally", "enemy"] as const) {
                for (let index = 0; index < 8; index++) {
                    shell.slot(side, index).active = false;
                    const label = shell.hpLabel(side, index);
                    if (label?.parent) label.parent.active = false;
                }
            }
            for (const unit of units) {
                if (isCancelled()) throw new Error("战场打开已取消");
                const side = unit.faction === 1 ? "ally" : "enemy";
                const id = unit.unitId;
                const index = unit.position - 1;
                shell.slot(side, index).active = !(idleEncounter && unit.faction === 2);
                shell.hpLabel(side, index)!.parent!.active = !(idleEncounter && unit.faction === 2);
                const slot = shell.slot(side, index);
                if (idleEncounter && unit.faction === 2) {
                    const order = units.filter(value => value.faction === 2).indexOf(unit) + 1;
                    slot.setPosition(idleLayout.getChildByName("Enemy" + order)!.position);
                }
                const template = templateRows.find(row => row.type === unit.templateId);
                if (!template || !elementPaths[template.elem - 1]) throw new Error("战斗英雄元素配置缺失");
                const element = shell.hpLabel(side, index)!.parent!.getChildByName("ElementIcon")!;
                element.getComponent(Sprite)!.spriteFrame = await assets.loadPath(
                    elementPaths[template.elem - 1], "SpriteFrame");
                element.active = true;
                const hpRow = element.parent!;
                hpRows.set(id, hpRow);
                // 血条不再移入人物槽，保留预制体HUD层，避免被本方或其他骨骼遮挡。
                slots.set(id, slot);
                origins.set(id, slot.position.clone());
                for (const name of ["Placeholder", "Label"]) {
                    const node = slot.getChildByName(name);
                    if (node) node.active = false;
                }
                if (idleEncounter && unit.faction === 1 && retainedIdle) {
                    // 等敌方骨骼和出场帧全部就绪再一次性移交，资源加载期间行军英雄保持可见。
                    hp(id, unit.initialHp);
                    paintBuffs(id);
                    continue;
                }
                const actor = await new Promise<SpineActor>((resolve, reject) => {
                    const actor = mountBattleSpine(slot, String(unit.templateId), () => reject(new Error("英雄骨骼加载失败")),
                        { face: unit.faction === 1 ? 1 : -1, scale: heroScale, seatY: 0, onReady: () => resolve(actor) });
                });
                actors.set(id, actor);
                if (idleEncounter && unit.faction === 2) {
                    (actor.node.getComponent(UIOpacity) || actor.node.addComponent(UIOpacity)).opacity = 0;
                    slot.active = true;
                }
                const head = slot.getChildByName("HeadAnchor");
                if (head) head.setSiblingIndex(slot.children.length - 1);
                hp(id, unit.initialHp);
                if (idleEncounter && unit.faction === 2) hpRow.active = false;
                paintBuffs(id);
            }
            syncHpRows();
            if (formalOpening) {
                // 旧 BattleReportBaseLayer 使用 ZDKS/stand；BattleController 延迟 2.5 秒再出场。
                await assets.loadPath("spine/ZDKS", "SkeletonData");
                if (closed || isCancelled()) throw new Error("挑战开场已取消");
                const opening = new Node("ChallengeOpeningEffect");
                opening.layer = shell.root.layer;
                opening.parent = shell.root;
                opening.setPosition(0, shell.root.getComponent(UITransform)!.height * 0.1, 0);
                effects.add(opening);
                await new Promise<void>((resolve, reject) => {
                    const ready = () => { waits.delete(ready); resolve(); };
                    waits.add(ready);
                    mountNamedSpine(opening, "ZDKS", "stand", {
                        loop: false, onReady: ready,
                        onFail: () => { waits.delete(ready); reject(new Error("挑战开场骨骼加载失败")); },
                    });
                });
                await wait(2.5);
                effects.delete(opening);
                if (opening.isValid) opening.destroy();
                if (closed || isCancelled() || !shell.root.isValid) throw new Error("挑战开场已取消");
                shell.layerField.active = true;
                shell.root.getChildByPath("LayerHud/HpBars")!.active = true;
            }
            if (idleEncounter || formalOpening) {
                const loadEntry = (side: string) => Promise.all(Array.from({ length: 15 }, (_, index) =>
                    assets.loadPath("battle/ui/battle-appear-" + side + "_" + index + "/spriteFrame", "SpriteFrame")));
                const rightFrames = await loadEntry("right");
                const leftFrames = formalOpening ? await loadEntry("left") : [];
                if (closed || isCancelled()) throw new Error("战斗进场已取消");
                if (idleEncounter) {
                    for (const unit of units.filter(value => value.faction === 1)) {
                        if (!retainedIdle) continue;
                        const slot = slots.get(unit.unitId)!;
                        const retained = retainedIdle.borrow(unit.position, slot);
                        returnActors.push(retained.release);
                        actors.set(unit.unitId, retained.actor);
                        origins.set(unit.unitId, slot.position.clone());
                    }
                    if (retainedIdle) retainedIdle.root.active = false;
                    shell.layerField.active = true;
                    shell.root.getChildByPath("LayerHud/HpBars")!.active = true;
                    syncHpRows();
                }
                await Promise.all(units.filter(unit => formalOpening || unit.faction === 2).map(async unit => {
                    const slot = slots.get(unit.unitId)!;
                    const node = new Node(unit.faction === 1 ? "AllyAppearEffect" : "EnemyAppearEffect");
                    node.layer = slot.layer;
                    node.parent = slot;
                    effects.add(node);
                    node.addComponent(UITransform).setAnchorPoint(0.5, 0.25);
                    const sprite = node.addComponent(Sprite);
                    sprite.sizeMode = Sprite.SizeMode.RAW;
                    sprite.trim = false;
                    const actorNode = actors.get(unit.unitId)!.node;
                    const opacity = actorNode.getComponent(UIOpacity) || actorNode.addComponent(UIOpacity);
                    opacity.opacity = 0;
                    // 旧版模型连续淡入1秒；帧特效按自身时长移除，不把最后一帧额外停留。
                    tween(opacity).to(1, { opacity: 255 }).start();
                    const entryFrames = unit.faction === 1 ? leftFrames : rightFrames;
                    for (let index = 0; index < entryFrames.length; index++) {
                        if (closed || isCancelled() || !node.isValid) break;
                        sprite.spriteFrame = entryFrames[index];
                        await wait(0.05);
                    }
                    effects.delete(node);
                    if (node.isValid) node.destroy();
                    if (actorNode.isValid && !closed && !isCancelled()) {
                        await wait(0.25);
                        if (opacity.isValid) opacity.opacity = 255;
                        if (idleEncounter && hpRows.get(unit.unitId)?.isValid) hpRows.get(unit.unitId)!.active = true;
                    }
                }));
                if (closed || isCancelled() || !shell.root.isValid) throw new Error("战斗进场已取消");
                GameLog.shared.classified("MODULE", "info", "BattleReplayPreview",
                    formalOpening ? "opening.completed ZDKS; both teams ready" : "idle.entry.completed");
            }
            /** 只恢复服务端已记录的血量和Buff，用于跳过选中技能之前的动画。 */
            const restore = (step: typeof steps[number]) => {
                for (const unit of units) {
                    const value = step.hpByUnit[unit.unitId];
                    hp(unit.unitId, value);
                    actors.get(unit.unitId)!.node.active = value > 0;
                }
                if (step.kind === "buff.upsert" || step.kind === "buff.remove") {
                    const active = activeBuffs.get(step.targetId)!;
                    if (step.kind === "buff.upsert") active.set(step.buffInstanceId!, step.configId);
                    else active.delete(step.buffInstanceId!);
                    paintBuffs(step.targetId);
                }
            };
            const process: string[] = [];
            /** 展示最近三个真实事件，不把开发日志或推算结果当成战报。 */
            const record = (text: string) => {
                process.push(text);
                if (process.length > 3) process.shift();
                setText(shell.logLabel, (audit ? audit.name + " Lv." + audit.level + " · " : "") + process.join(" → "));
            };
            player = new BattleReplayPlayer({
                stop,
                restore,
                play: async function play(step, targets = [step]) {
                    const actions = step.kind === "presentation" ? expanded.get(step.configId) : undefined;
                    if (actions) {
                        await Promise.all(actions.map(action => play({ ...step, configId: action.idx }, targets)));
                        return;
                    }
                    const epoch = effectEpoch;
                    const cancelled = () => closed || epoch !== effectEpoch;
                    if (cancelled()) return;
                    const effectRow = selected.get(step.configId);
                    if (effectRow && step.kind !== "buff.remove") {
                        await wait(BattleAttackUtils.delaySeconds(effectRow));
                        if (cancelled()) return;
                        if (effectRow.shake === 1) {
                            let shake = tween(shell.root);
                            // 旧Lua的0..5为六次，最后幅度保持1；每组位移净值为0。
                            for (let index = 0; index <= 5; index++) {
                                const range = Math.max(1, 5 - index);
                                shake = shake.by(0.016 / playbackScale, { position: new Vec3(range, range, 0) })
                                    .by(0.032 / playbackScale, { position: new Vec3(-2 * range, -2 * range, 0) })
                                    .by(0.016 / playbackScale, { position: new Vec3(range, range, 0) });
                            }
                            shake.start();
                        }
                        if (effectRow.dimly === 1) {
                            Tween.stopAllByTarget(dimOpacity);
                            if (dimOpacity.isValid) dimOpacity.opacity = 0;
                            const times = BattleAttackUtils.dimly(effectRow);
                            tween(dimOpacity).to(times[0] / playbackScale, { opacity: 128 }, { easing: "expoOut" })
                                .delay(times[1] / playbackScale).to(times[2] / playbackScale, { opacity: 0 }, { easing: "expoOut" }).start();
                        }
                        GameLog.shared.classified("MODULE", "debug", "BattleReplayPreview",
                            "effect.start " + step.configId + " delay=" + BattleAttackUtils.delaySeconds(effectRow));
                    }
                    setText(shell.roundLabel, "第" + step.round + "/15回合");
                    if (step.kind === "skill.begin") record(step.skillType === 2 ? "普攻" : "释放技能");
                    else if (step.kind === "round.ready") record("第" + step.round + "回合");
                    if (step.kind === "round.ready") {
                        await wait(step.readySeconds!);
                    } else if (step.kind === "presentation") {
                        const plan = BattleAttackUtils.plan(selected.get(step.configId)!);
                        for (const sound of plan.sounds) {
                            audio.clip = sounds.get(sound)!;
                            audio.play();
                            GameLog.shared.classified("MODULE", "info", "BattleReplayPreview", "sound " + sound + " playing=" + audio.playing);
                        }
                        const slot = slots.get(step.sourceId)!;
                        const target = slots.get(step.targetId)!;
                        // 使用世界坐标转回攻击者父节点，避免双方槽组偏移导致移错位置。
                        const world = target.worldPosition.clone();
                        world.x += units.find(unit => unit.unitId === step.targetId)!.faction === 1 ? 100 : -100;
                        const point = slot.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(world);
                        if (plan.melee) {
                            tween(slot).to(plan.moveSeconds / playbackScale, { position: point }).start();
                            await wait(plan.moveSeconds);
                        }
                        if (cancelled()) return;
                        if (!plan.effectOnly && !actors.get(step.sourceId)!.gesture(plan.action)) throw new Error("缺少英雄动作：" + plan.action);
                        // 施法只播一次，各目标特效同时在旧attack_time时点启动。
                        const targetEffects = (async () => {
                            await wait(plan.attackSeconds);
                            if (cancelled() || !plan.effect) return;
                            const definition = plan.effect;
                            await Promise.all((plan.onSource ? [step] : targets).map(async hit => {
                                if (cancelled()) return;
                                const layer = shell.root.getChildByPath("LayerVfx")!;
                                const transform = layer.getComponent(UITransform)!;
                                const pointOf = (id: number, center: boolean) => {
                                    const world = slots.get(id)!.worldPosition.clone();
                                    // 旧BattleHeroNode中心高度由缩放后单位高度的一半确定。
                                    if (center) world.y += 120 * 0.65 / 2;
                                    return transform.convertToNodeSpaceAR(world);
                                };
                                const from = pointOf(step.sourceId, true);
                                const effectUnit = plan.onSource ? step.sourceId : hit.targetId;
                                const to = pointOf(effectUnit, plan.projectile);
                                if (plan.battlefieldOffset) {
                                    // 旧type9用战场尺寸定位，不随目标数量重复生成；旧敌方LeftEffectLayer横向镜像。
                                    const field = shell.root.getComponent(UITransform)!;
                                    const ratioX = units.find(unit => unit.unitId === step.sourceId)!.faction === 2
                                        ? 1 - plan.battlefieldOffset[0] : plan.battlefieldOffset[0];
                                    const world = field.convertToWorldSpaceAR(new Vec3(
                                        field.width * (ratioX - field.anchorX),
                                        field.height * (plan.battlefieldOffset[1] - field.anchorY), 0));
                                    to.set(transform.convertToNodeSpaceAR(world));
                                }
                                const node = new Node("SkillEffect");
                                node.layer = layer.layer;
                                node.parent = layer;
                                effects.add(node);
                                const ui = node.addComponent(UITransform);
                                ui.setAnchorPoint(definition.anchorX, definition.anchorY);
                                const sprite = node.addComponent(Sprite);
                                sprite.sizeMode = Sprite.SizeMode.RAW;
                                sprite.trim = false;
                                const sequence = frames.get(step.configId)!;
                                sprite.spriteFrame = sequence[0];
                                node.setScale(definition.scaleX * (plan.effectOnly && units.find(unit => unit.unitId === effectUnit)!.faction === 2 ? -1 : 1), definition.scaleY, 1);
                                node.setPosition(plan.projectile ? from : to);
                                if (plan.projectile) {
                                    node.angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
                                    tween(node).to(definition.flightSeconds / playbackScale, {position: to}).start();
                                }
                                GameLog.shared.classified("MODULE", "debug", "BattleReplayPreview",
                                    "effect.frames " + step.configId + " target=" + hit.targetId + " count=" + sequence.length);
                                const count = plan.projectile ? sequence.length + 1 : sequence.length;
                                for (let index = 0; index < count && !cancelled(); index++) {
                                    sprite.spriteFrame = sequence[index % sequence.length];
                                    await wait(definition.interval);
                                }
                                Tween.stopAllByTarget(node);
                                effects.delete(node);
                                if (node.isValid) node.destroy();
                            }));
                        })();
                        await Promise.all([targetEffects,
                            wait(plan.attackSeconds + plan.attackDelaySeconds + plan.actionSeconds + plan.beforeReturnSeconds)]);
                        if (cancelled()) return;
                        if (plan.melee) {
                            tween(slot).to(plan.moveSeconds / playbackScale, { position: origins.get(step.sourceId)! }).start();
                            await wait(plan.moveSeconds);
                        }
                        if (!cancelled() && !plan.effectOnly) actors.get(step.sourceId)!.play("stand");
                    } else if (step.kind === "damage") {
                        const row = selected.get(step.configId)!;
                        // 回合伤害不冒充直接伤害100；这里只恢复已核对的伤害音效来源。
                        if (row.type === 100) {
                            for (const name of BattleAttackUtils.damageSounds(row)) {
                                audio.clip = sounds.get(name)!;
                                audio.play();
                                GameLog.shared.classified("MODULE", "info", "BattleReplayPreview", "damage.sound " + name);
                            }
                        }
                        record("单位" + step.targetId + " 伤害" + Math.abs(step.actualHpChange || 0));
                        hp(step.targetId, step.hpByUnit[step.targetId]);
                        const target = slots.get(step.targetId)!;
                        const point = shell.root.getComponent(UITransform)!.convertToNodeSpaceAR(target.worldPosition);
                        paintBattleFloats(shell.present, [{ anchor: 0, hurt: step.reportedHpChange!, crit: false }], [point]);
                        actors.get(step.targetId)!.play(step.dead ? "die" : "hit");
                        if (idleEncounter && step.dead && !cancelled()) {
                            onIdleDeath?.(target.worldPosition.clone());
                        }
                        await wait(0.35);
                        if (!cancelled()) {
                            if (step.dead) actors.get(step.targetId)!.node.active = false;
                            else actors.get(step.targetId)!.play("stand");
                        }
                    } else if (step.kind === "recovery") {
                        // 回血不会播放受击/死亡；飘字使用旧报告值，血条只使用实际值，包含满血溢出治疗。
                        record("单位" + step.targetId + " 治疗" + step.reportedHpChange);
                        hp(step.targetId, step.hpByUnit[step.targetId]);
                        const target = slots.get(step.targetId)!;
                        const point = shell.root.getComponent(UITransform)!.convertToNodeSpaceAR(target.worldPosition);
                        paintBattleFloats(shell.present, [{ anchor: 0, hurt: step.reportedHpChange!, crit: false }], [point]);
                        await wait(0.35);
                    } else if (step.kind === "buff.upsert" || step.kind === "buff.remove") {
                        const active = activeBuffs.get(step.targetId)!;
                        if (step.kind === "buff.upsert") active.set(step.buffInstanceId!, step.configId);
                        else active.delete(step.buffInstanceId!);
                        paintBuffs(step.targetId);
                        const type = selected.get(step.configId)?.type;
                        const name = type === 1205 ? "流血" : type === 1004 ? "冰冻" : type === 1005 ? "眩晕"
                            : step.configId >= 2233301 && step.configId <= 2233303 ? "降攻"
                            : step.configId >= 2231201 && step.configId <= 2231203 ? "降护甲" : "状态";
                        record("单位" + step.targetId + " " + name + (step.kind === "buff.remove" ? "解除" : "生效"));
                        GameLog.shared.classified("MODULE", "info", "BattleReplayPreview", "buff " + step.kind + " config=" + step.configId + " round=" + step.round + " target=" + step.targetId + " instance=" + step.buffInstanceId + " visible=" + active.size);
                    }
                }
            });
            // 复用已有按钮启动，确保浏览器用户手势允许音频，不自动绕过音频策略。
            setText(shell.logLabel, audit ? audit.name + " Lv." + audit.level + (audit.passive ? " · 播放完整触发过程" : " · 从首次施法开始") : persistentChapter ? "战斗准备完成" : lineupTitle ? "属性尚未完整；只读试战，不发奖励" : "测试已就绪，请点击开始");
            const button = shell.root.getChildByPath("LayerHud/BtnSkip")!;
            setText(button.getChildByName("Label")!, defeatPresentation ? "失败样式验收" : "开始");
            let started = false;
            let replayReady = false;
            /** 启动一次已校验战报；正式主线默认档统一驱动骨骼、位移和帧等待。 */
            const startPlayback = () => {
                if (closed) return;
                if (replayReady && audit) {
                    audit.replay();
                    return;
                }
                if (started) return;
                if (defeatPresentation) {
                    void UIManager.instance.open(ChapterEndView, { won: false, presentationOnly: true }).catch(error => {
                        GameLog.shared.classified("MODULE", "error", "BattleReplayPreview", "失败样式打开失败：" + String(error));
                    });
                    return;
                }
                started = true;
                button.active = false;
                playbackScale = formalOpening ? BattleInfoUtils.defaultTimeScale() : 1;
                for (const actor of actors.values()) {
                    actor.node.getComponent(sp.Skeleton)!.timeScale = playbackScale;
                }
                void player!.play(bytes, audit && !audit.passive ? { skillId: audit.skillId, level: audit.level } : undefined).then(async completed => {
                    if (!closed && completed) {
                        paintBattleFloats(shell.present, []);
                        const last = steps[steps.length - 1];
                        const allyHp = units.filter(unit => unit.faction === 1)
                            .reduce((total, unit) => total + last.hpByUnit[unit.unitId], 0);
                        const enemyHp = units.filter(unit => unit.faction === 2)
                            .reduce((total, unit) => total + last.hpByUnit[unit.unitId], 0);
                        setText(shell.logLabel, "战报结束 · 剩余生命 " + allyHp);
                        if (audit) {
                            replayReady = true;
                            button.active = true;
                            setText(button.getChildByName("Label")!, "重播");
                        }
                        const won = allyHp > 0 && enemyHp === 0;
                        if (persistentChapter && !idleEncounter) {
                            // 主线结束先撤下双方单位和头顶信息，再弹结算；主页背景与导航继续保留。
                            shell.root.getChildByName("LayerHud")!.active = false;
                            for (const actor of actors.values()) {
                                if (actor.node.isValid) {
                                    actor.node.active = false;
                                }
                            }
                            for (const slot of slots.values()) {
                                if (slot.isValid) {
                                    slot.active = false;
                                }
                            }
                            for (const row of hpRows.values()) {
                                if (row.isValid) {
                                    row.active = false;
                                }
                            }
                        }
                        if (onCompleted) {
                            await onCompleted(won);
                        } else {
                            await UIManager.instance.open(ChapterEndView, { won, persistentChapter });
                        }
                        GameLog.shared.classified("MODULE", "info", "BattleReplayPreview",
                            "completed hp=" + JSON.stringify(last.hpByUnit) + " round=" + last.round);
                    }
                }).catch(error => {
                    if (!closed) setText(shell.logLabel, "战报播放失败，请查看日志");
                    GameLog.shared.classified("MODULE", "error", "BattleReplayPreview", "播放失败：" + String(error));
                });
            };
            shell.bindSkip(startPlayback);
            // 正常主线由已确认的出战操作启动；只读技能台保留手动开始和重播。
            if (isCancelled()) throw new Error("战场打开已取消");
            if (persistentChapter) {
                startPlayback();
            }
            const close = () => {
                if (closed) return;
                closed = true;
                releaseSettlement();
                player?.stop();
                stop();
                if (shell.root.isValid) shell.root.destroy();
                onClosed?.();
            };
            shell.bindRetreat(close);
            shell.bindClose(close);
        } catch (error) {
            releaseSettlement();
            stop();
            if (shell.root.isValid) shell.root.destroy();
            throw error;
        }
        // 退出按钮与应用切换可能先后调用同一清理函数；已关闭后不得再次操作销毁的节点。
        return () => {
            if (closed) {
                return;
            }
            closed = true;
            releaseSettlement();
            player?.stop();
            stop();
            if (shell.root.isValid) {
                shell.root.destroy();
            }
        };
    }
}
