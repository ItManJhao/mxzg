/** 主线及独立战报播放器：复用BattlePage及真实资源，开始骨骼到70%时并行出场、出场到60%时渐入模型；只展示战报，不请求奖励或修改资产。 */
import { AudioClip,AudioSource,Button,Color,director,Director,Material,Node,sp,Sprite,SpriteFrame,Tween,tween,UIOpacity,UITransform,Vec3 } from "cc";
import { GameLog } from "../../../core/GameLog";
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { UIManager } from "../../../framework/ui/UIManager";
import { UIRegistry } from "../../../framework/ui/UIRegistry";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { BattleReplayPlayer } from "../BattleReplayPlayer";
import { BattleAttackUtils } from "../utils/BattleAttackUtils";
import { BattleReplayUtils } from "../utils/BattleReplayUtils";
import { BattleInfoUtils } from "../utils/BattleInfoUtils";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
import { BattlePageUtils } from "./BattlePageUtils";
import { ChapterEndView } from "./ChapterEndView";
import { MainChapterIdleDisplay } from "./MainChapterIdleDisplay";
import { BattlePresentViewUtils } from "./BattlePresentViewUtils";
import { BattleSpineService, SpineActor } from "./BattleSpineService";

/** 同源配置行，只消费已核对动作、伤害音效及持续控制/图标字段。 */
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
    /** 一次解析战场装配所需的战报数据，读取已安装配置并装载美术资源，开始骨骼到70%时出场、出场特效到60%时渐入模型，全部完成才显示HP并播放战报。
     * 只读结果传原冻结名册；遇敌可借行军骨骼，关闭先归还再销毁，onIdleDeath不是奖励事件。 */
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
        const { steps, units, names } = BattleReplayUtils.parse(bytes);
        const config = GameConfig.instance.getFileByPath("config/buff");
        const rows = (config as { rows: BuffRow[] }).rows;
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
        const shell = await BattlePageUtils.mountBattlePrefab(parent);
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
            const speedButton = hud.getChildByPath("TopBar/BtnSpeed")!;
            speedButton.active = true;
            const explainSpeed = () => UIManager.instance.toast(BattleInfoUtils.speedLockedNotice());
            speedButton.on(Button.EventType.CLICK, explainSpeed);
            shell.root.once(Node.EventType.NODE_DESTROYED, () => speedButton.off(Button.EventType.CLICK, explainSpeed));
            hud.getChildByName("BtnSkip")!.active = BattleInfoUtils.mainChapterSkipVisible();
        }
        if (persistentChapter) {
            ViewportLayoutUtils.bindVisibleRefresh(shell.root, () => {
                const scale = BattleInfoUtils.contentScale(ViewportLayoutUtils.readVisibleBox().width);
                shell.root.setScale(scale, scale, 1);
                if (formalOpening) {
                    BattlePageUtils.alignChapterInfo(shell, parent);
                }
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
        // 提供结束回调时，结果窗口归调用方；播放器不能改宿主或清理调用方后来交接的结算。
        const ownsSettlement = !idleEncounter && !onCompleted;
        const unregisterEnd = !ownsSettlement ? () => {} : UIRegistry.bindViewRuntime(ChapterEndView, {
            hostId: persistentChapter ? "remake-modal" : "battle-settlement",
        });
        // 正常结算必须在应用弹层，避免完整旧胜利页被挂机面板遮挡；技能台仍归本地战场清理。
        const releaseEndHost = !ownsSettlement || persistentChapter ? () => {} : UIManager.instance.setResidentHost("battle-settlement", () => shell.root.isValid ? shell.root : null);
        for (const path of ["LayerAppear", "LayerHud/SkillBars"]) {
            const node = shell.root.getChildByPath(path);
            if (node) node.active = false;
        }
        UiKitUtils.setText(shell.root.getChildByPath("LayerHud/MatchInfo/AllyNameLabel")!, persistentChapter ? "主线挑战阵容" : lineupTitle ? "当前保存阵容·只读" : "独立测试阵容");
        UiKitUtils.setText(shell.root.getChildByPath("LayerHud/MatchInfo/EnemyNameLabel")!, names.defender || lineupTitle || (units.some(unit => unit.templateId === 10105011) ? "魅惑之拥·随机目标验收" : units.every(unit => unit.templateId === 10505005) ? "三级流血专项" : units.every(unit => unit.templateId === 10205023) ? "奈奈子技能验收" : units.length === 4 ? "独立多目标验收" : units.length === 3 ? "主线第3关" : units.find(unit => unit.faction === 2)!.templateId === 10505005 ? "主线第2关" : "主线第1关"));
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
        /** 单位ID:状态类型到共享持续帧节点；同类型最后一份实例解除才移除，关场清空。 */
        const roundEffects = new Map<string, Node>();
        /** 本场实际需要的眩晕/沉默/格挡帧，类型作键，资源仍归原节点作用域。 */
        const roundFrames = new Map<1001 | 1005 | 234, SpriteFrame[]>();
        /** 冰冻1004/石化1006材质只归本战场持有，退出时释放，不修改共享骨架。 */
        const controlMaterials = new Map<number, Material>();
        /** 受shader控制的单位到原材质与当前控制类型；解除最后控制恢复原材质和动画。 */
        const controlledActors = new Map<number, { original: Material | null; type: number }>();
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
        /** 本场首个播放异常已经报告；并行帧序列取消后不再重复报告同一失败。 */
        let failureReported = false;
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
            roundEffects.clear();
            for (const [id, saved] of controlledActors) {
                const skeleton = actors.get(id)?.node.getComponent(sp.Skeleton);
                if (skeleton?.isValid) {
                    skeleton.customMaterial = saved.original;
                    skeleton.paused = false;
                }
            }
            controlledActors.clear();
            for (const material of controlMaterials.values()) {
                if (material.isValid) material.destroy();
            }
            controlMaterials.clear();
            if (audio.isValid) audio.stop();
            for (const finish of pending) finish();
        };
        /** 活跃战场的表现失败统一停止并记录一次有界原因/堆栈；关页或取消后的迟到失败不触碰节点。 */
        const failPlayback = (error: unknown) => {
            if (failureReported || closed || isCancelled() || !shell.root.isValid) {
                return;
            }
            failureReported = true;
            UiKitUtils.setText(shell.logLabel, "战报播放失败，请查看日志");
            const detail = error instanceof Error ? error.stack || error.message : String(error);
            GameLog.shared.classified("MODULE", "error", "BattleReplayPreview", "播放失败：" + detail.slice(0, 4096));
            player?.stop();
            stop();
        };
        /** 只读演示释放自己装配的结算入口；带结束回调的主线/遇敌只清播放器，不接管外层结果。 */
        const releaseSettlement = () => {
            if (ownsSettlement) {
                UIManager.instance.closeById("chapter-end");
            }
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
            UiKitUtils.setText(label, String(units.find(unit => unit.unitId === id)!.level));
            const fill = label.parent.getChildByName("Fill")!;
            const max = units.find(unit => unit.unitId === id)!.maxHp;
            fill.active = value > 0;
            fill.getComponent(Sprite)!.fillRange = Math.max(0, Math.min(1, value / max));
        };
        /** 按完整实例维护状态；图标过滤icon0，循环按类型共享，shader按旧新增/解除顺序选取。 */
        const paintBuffs = (id: number, change?: { kind: "upsert" | "remove"; type: number }) => {
            const row = slots.get(id)!.getChildByPath("HeadAnchor/BuffRow");
            if (!row) throw new Error("战斗Buff挂点缺失");
            const values = Array.from(activeBuffs.get(id)!.values());
            const visible = values.filter(configId => !!selected.get(configId)?.buff_icon);
            row.active = visible.length > 0;
            const skeleton = actors.get(id)?.node.getComponent(sp.Skeleton);
            const shaderTypes = values.map(configId => selected.get(configId)?.type)
                .filter(type => type === 1004 || type === 1006) as number[];
            const saved = controlledActors.get(id);
            // 旧addHeroShader立即采用新shader；removeHeroShader从仍在的列表选第一项，不能直接解除其他控制。
            const changedShader = change?.type === 1004 || change?.type === 1006;
            const selectedType = change?.kind === "upsert" && changedShader ? change.type
                : change?.kind === "remove" && changedShader ? shaderTypes[0]
                : saved && shaderTypes.includes(saved.type) ? saved.type : shaderTypes[shaderTypes.length - 1];
            if (skeleton && selectedType !== undefined) {
                if (!saved) controlledActors.set(id, { original: skeleton.customMaterial, type: selectedType });
                else saved.type = selectedType;
                skeleton.customMaterial = controlMaterials.get(selectedType)!;
                skeleton.paused = true;
            } else if (skeleton && saved) {
                skeleton.customMaterial = saved.original;
                skeleton.paused = false;
                controlledActors.delete(id);
                actors.get(id)!.play("stand");
            }
            for (const type of [1001, 1005, 234] as const) {
                const active = values.some(configId => selected.get(configId)?.type === type);
                const key = id + ":" + type;
                const previous = roundEffects.get(key);
                if (!active && previous) {
                    Tween.stopAllByTarget(previous);
                    effects.delete(previous);
                    previous.destroy();
                    roundEffects.delete(key);
                } else if (active && !previous) {
                    const definition = BattleAttackUtils.roundEffect(type);
                    const sequence = roundFrames.get(type)!;
                    const node = new Node(type === 1005 ? "DizzyEffect" : type === 1001 ? "SilenceEffect" : "ParryEffect");
                    node.layer = row.layer;
                    node.parent = slots.get(id)!;
                    // 旧NODE_SIZE.height=120，节点缩放0.65，顶部额外50*0.65。
                    node.setPosition(0, (120 + 50 * 0.65) * 0.65, 0);
                    node.setScale(0.65 * definition.scale, 0.65 * definition.scale, 1);
                    node.addComponent(UITransform).setAnchorPoint(0.5, definition.anchorY);
                    const sprite = node.addComponent(Sprite);
                    sprite.sizeMode = Sprite.SizeMode.RAW;
                    sprite.trim = false;
                    sprite.spriteFrame = sequence[0];
                    let cycle = tween(node);
                    for (const frame of sequence) {
                        cycle = cycle.call(() => { sprite.spriteFrame = frame; }).delay(definition.interval / playbackScale);
                    }
                    tween(node).repeatForever(cycle).start();
                    effects.add(node);
                    roundEffects.set(key, node);
                }
            }
            for (let i = 0; i < 3; i++) {
                const chip = row.getChildByName("Buff_" + i);
                if (!chip) throw new Error("战斗Buff槽缺失");
                chip.active = i < visible.length;
                if (i < visible.length) {
                    const sprite = chip.getComponent(Sprite);
                    if (!sprite) throw new Error("战斗Buff槽缺少Sprite");
                    sprite.color = Color.WHITE;
                    sprite.spriteFrame = icons.get(visible[i])!;
                }
            }
        };
        const assets = ResourceAssetsUtils.forNode(shell.root);
        try {
            for (const [type, path] of [[1004, "effects/legacy-frozen"], [1006, "effects/legacy-stone"]] as const) {
                if (!Array.from(selected.values()).some(row => row.type === type)) continue;
                const effect = await assets.loadPath(path, "EffectAsset");
                const material = new Material();
                material.initialize({ effectAsset: effect });
                controlMaterials.set(type, material);
                if (type === 1004 && !lineupTitle && !persistentChapter && !names.defender
                    && !units.every(unit => unit.templateId === 10205023)) {
                    UiKitUtils.setText(shell.root.getChildByPath("LayerHud/MatchInfo/EnemyNameLabel")!, "独立冰冻验收");
                }
            }
            for (const type of [1001, 1005, 234] as const) {
                if (!Array.from(selected.values()).some(row => row.type === type)) continue;
                roundFrames.set(type, await Promise.all(BattleAttackUtils.roundEffect(type).paths.map(path =>
                    assets.loadPath(path, "SpriteFrame"))));
            }
            for (const row of selected.values()) {
                if (row.type === 1 || row.type === 11 || row.type === 2 || row.type === 3 || row.type === 5 || row.type === 6 || row.type === 7 || row.type === 8 || row.type === 9 || row.type === 100) {
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
                shell.hpLabel(side, index)!.parent!.active = !formalOpening && !(idleEncounter && unit.faction === 2);
                const slot = shell.slot(side, index);
                if (idleEncounter && unit.faction === 2) {
                    const order = units.filter(value => value.faction === 2).indexOf(unit) + 1;
                    slot.setPosition(idleLayout.getChildByName("Enemy" + order)!.position);
                }
                const template = GameConfig.instance.getConfig(GConfig.HeroType, unit.templateId);
                const elem = template?.elem;
                // 模板允许说明行省略元素，但真实战斗单位必须有1～5的已知元素，不能猜默认图标。
                if (typeof elem !== "number" || !Number.isInteger(elem) || elem < 1 || elem > 5) {
                    throw new Error("战斗英雄元素配置缺失");
                }
                const element = shell.hpLabel(side, index)!.parent!.getChildByName("ElementIcon")!;
                element.getComponent(Sprite)!.spriteFrame = await assets.loadPath(
                    elementPaths[elem - 1], "SpriteFrame");
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
                    const actor = BattleSpineService.instance.mountBattleSpine(slot, String(unit.templateId), () => reject(new Error("英雄骨骼加载失败")),
                        { face: unit.faction === 1 ? 1 : -1, scale: heroScale, seatY: 0, onReady: () => resolve(actor) });
                    // 在骨骼资源完成前就隐藏模型，揭开战场或慢载出场图片时都不能先闪出角色。
                    if (formalOpening || (idleEncounter && unit.faction === 2)) {
                        (actor.node.getComponent(UIOpacity) || actor.node.addComponent(UIOpacity)).opacity = 0;
                    }
                });
                actors.set(id, actor);
                if (idleEncounter && unit.faction === 2) {
                    (actor.node.getComponent(UIOpacity) || actor.node.addComponent(UIOpacity)).opacity = 0;
                    slot.active = true;
                }
                const head = slot.getChildByName("HeadAnchor");
                if (head) head.setSiblingIndex(slot.children.length - 1);
                hp(id, unit.initialHp);
                if (formalOpening || (idleEncounter && unit.faction === 2)) hpRow.active = false;
                paintBuffs(id);
            }
            syncHpRows();
            /** 两侧出场帧先全部就绪再展示战场；不让异步下载发生在模型/血条已经可见之后。 */
            const loadEntry = (side: "left" | "right") => Promise.all(Array.from({ length: 15 }, (_, index) =>
                assets.loadPath("battle/ui/battle-appear-" + side + "_" + index + "/spriteFrame", "SpriteFrame")));
            const [rightFrames, leftFrames] = idleEncounter || formalOpening
                ? await Promise.all([loadEntry("right"), formalOpening ? loadEntry("left") : Promise.resolve([])])
                : [[], []];
            if (closed || isCancelled() || !shell.root.isValid) throw new Error("战斗进场已取消");
            /** 开始骨骼保留完整播放；70%后与人物出场并行，关页由原waits同时释放两条等待。 */
            let openingComplete = Promise.resolve();
            if (formalOpening) {
                // 原ZDKS/stand实际仅约1.2333秒；按真实轨道70%接出场，不再沿旧2.5秒固定空等。
                await assets.loadPath("spine/ZDKS", "SkeletonData");
                if (closed || isCancelled()) throw new Error("挑战开场已取消");
                const opening = new Node("ChallengeOpeningEffect");
                opening.layer = shell.root.layer;
                opening.parent = shell.root;
                opening.setPosition(0, shell.root.getComponent(UITransform)!.height * 0.1, 0);
                effects.add(opening);
                const openingEpoch = effectEpoch;
                let releaseComplete = () => {};
                openingComplete = new Promise<void>(resolve => {
                    const finish = () => { waits.delete(finish); resolve(); };
                    releaseComplete = finish;
                    waits.add(finish);
                });
                await new Promise<void>((resolve, reject) => {
                    let finished = false;
                    /** 进度门只放行一次；兑现或失败后立即移除引擎监听，不留下每帧回调。 */
                    const detach = () => {
                        director.off(Director.EVENT_AFTER_UPDATE, observeProgress);
                        waits.delete(finish);
                    };
                    /** 关闭释放等待不代表成功；下方仍检查战场代次和取消状态。 */
                    const finish = () => {
                        if (finished) return;
                        finished = true;
                        detach();
                        resolve();
                    };
                    /** 读取Spine实际轨道时间，暂停/变速/慢帧均跟随动画，不另起墙钟计时。 */
                    const observeProgress = () => {
                        if (closed || isCancelled() || openingEpoch !== effectEpoch || !opening.isValid) {
                            finish();
                            return;
                        }
                        const entry = opening.getComponent(sp.Skeleton)?.getCurrent(0);
                        const duration = entry ? entry.animationEnd - entry.animationStart : NaN;
                        if (!entry || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(entry.trackTime)) {
                            finished = true;
                            detach();
                            releaseComplete();
                            reject(new Error("挑战开场骨骼缺少有效播放进度"));
                            return;
                        }
                        if (entry.trackTime >= duration * 0.7) {
                            GameLog.shared.classified("MODULE", "debug", "BattleReplayPreview",
                                "opening.zdks.progress progress=0.7 time=" + entry.trackTime + " duration=" + duration);
                            finish();
                        }
                    };
                    waits.add(finish);
                    BattleSpineService.instance.mountNamedSpine(opening, "ZDKS", "stand", {
                        loop: false,
                        onReady: () => {
                            if (finished) return;
                            director.on(Director.EVENT_AFTER_UPDATE, observeProgress);
                            observeProgress();
                        },
                        onComplete: () => {
                            // 低帧率跨过70%时完成事件也可放行；完整骨骼结束后才销毁自己。
                            finish();
                            releaseComplete();
                            effects.delete(opening);
                            if (opening.isValid) opening.destroy();
                        },
                        onFail: () => {
                            if (finished) return;
                            finished = true;
                            detach();
                            releaseComplete();
                            reject(new Error("挑战开场骨骼加载失败"));
                        },
                    });
                });
                if (closed || isCancelled() || !shell.root.isValid) throw new Error("挑战开场已取消");
                shell.layerField.active = true;
                GameLog.shared.classified("MODULE", "debug", "BattleReplayPreview", "opening.effects.started");
            }
            if (idleEncounter || formalOpening) {
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
                const entering = units.filter(unit => formalOpening || unit.faction === 2);
                // 双方全部出场特效并行；正式挑战在特效60%处开始模型渐入，HP等待两路全部完成。
                await Promise.all(entering.map(async unit => {
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
                    // 挂机保留旧0时刻并行淡入；正式挑战的渐入等待由下方独立任务承担。
                    if (idleEncounter) tween(opacity).to(1, { opacity: 255 }).start();
                    const entryFrames = unit.faction === 1 ? leftFrames : rightFrames;
                    const frameSeconds = 0.05;
                    const fadeAfterFrames = Math.ceil(entryFrames.length * 0.6);
                    const entryEpoch = effectEpoch;
                    /** 出场进度和渐入共享本战场代次，失败stop释放gate后也不能迟到创建Tween。 */
                    const entryCancelled = () => closed || isCancelled() || entryEpoch !== effectEpoch;
                    let releaseFadeProgress = () => {};
                    // gate归原waits持有；关页/失败stop与第9帧完成均可释放，Promise只兑现一次。
                    const fadeProgress = !formalOpening ? Promise.resolve() : new Promise<void>(resolve => {
                        const finish = () => { waits.delete(finish); resolve(); };
                        releaseFadeProgress = finish;
                        waits.add(finish);
                    });
                    // 帧序列保留完整15帧和原寿命，不为60%渐入阈值裁掉最后的出场帧。
                    const appearance = (async () => {
                        for (let index = 0; index < entryFrames.length; index++) {
                            if (entryCancelled() || !node.isValid) break;
                            sprite.spriteFrame = entryFrames[index];
                            await wait(frameSeconds);
                            if (formalOpening && index + 1 === fadeAfterFrames) releaseFadeProgress();
                        }
                        effects.delete(node);
                        if (node.isValid) node.destroy();
                        releaseFadeProgress();
                    })();
                    // 必须等完整第9帧结束；名义9*.05=.45秒，真实帧调度变慢时不能用独立墙钟提前渐入。
                    const fading = !formalOpening ? Promise.resolve() : (async () => {
                        await fadeProgress;
                        if (entryCancelled() || !node.isValid || !actorNode.isValid || !opacity.isValid) return;
                        GameLog.shared.classified("MODULE", "debug", "BattleReplayPreview",
                            "opening.fade.started unit=" + unit.unitId + " progress=0.6");
                        tween(opacity).to(1, { opacity: 255 }).start();
                        await wait(1);
                        if (!entryCancelled() && opacity.isValid) opacity.opacity = 255;
                    })();
                    // 立即持有两路拒绝与取消，避免渐入异步失败在帧序列结束前成为未处理拒绝。
                    await Promise.all([appearance, fading]);
                    if (idleEncounter && actorNode.isValid && !closed && !isCancelled()) {
                        await wait(0.25);
                        if (opacity.isValid) opacity.opacity = 255;
                        if (idleEncounter && hpRows.get(unit.unitId)?.isValid) hpRows.get(unit.unitId)!.active = true;
                    }
                }));
                if (closed || isCancelled() || !shell.root.isValid) throw new Error("战斗进场已取消");
                if (formalOpening) {
                    await openingComplete;
                    if (closed || isCancelled() || !shell.root.isValid) throw new Error("挑战开场已取消");
                    GameLog.shared.classified("MODULE", "debug", "BattleReplayPreview", "opening.effects-and-fade.completed");
                    // 所有单位的出场帧与1秒渐入均已结束，才放行双方HP和下方原战报入口。
                    for (const unit of entering) {
                        hpRows.get(unit.unitId)!.active = unit.initialHp > 0;
                    }
                    shell.root.getChildByPath("LayerHud/HpBars")!.active = true;
                }
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
                UiKitUtils.setText(shell.logLabel, (audit ? audit.name + " Lv." + audit.level + " · " : "") + process.join(" → "));
            };
            player = new BattleReplayPlayer({
                stop,
                restore,
                // 旧格挡盾189在damage前耗尽；图像等这次命中完成才撤，不泛化其他trigger-limit。
                waitForFollowingHit: step => step.removalReason === "trigger-limit"
                    && selected.get(step.configId)?.type === 234,
                /**
                 * 播放真实步骤或旧覆盖子动作；type8按战场比例往返，空动作仅等待配置延迟。
                 * 独立帧及投射不延长角色动作，仍归本战场持有；关闭后丢弃迟到回调，活跃帧失败统一取消。
                 */
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
                    if (step.kind === "presentation" && effectRow?.type === 1) {
                        // 旧覆盖已在上方展开；这里只完成其中的空动作，不能连带丢弃同组真实特效。
                        BattleAttackUtils.plan(effectRow);
                        const delay = BattleAttackUtils.delaySeconds(effectRow);
                        if (delay > 0) {
                            await wait(delay);
                        }
                        if (!cancelled()) {
                            GameLog.shared.classified("MODULE", "debug", "BattleReplayPreview",
                                "effect.empty " + step.configId + " delay=" + delay);
                        }
                        return;
                    }
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
                    UiKitUtils.setText(shell.roundLabel, "第" + step.round + "/15回合");
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
                        const moving = plan.melee || plan.moveOffset !== null;
                        if (moving) {
                            let world: Vec3;
                            if (plan.moveOffset) {
                                // 旧type8按整张战场比例定位，敌方镜像X；不能借某个命中目标的站位代替。
                                const field = shell.root.getComponent(UITransform)!;
                                const ratioX = units.find(unit => unit.unitId === step.sourceId)!.faction === 2
                                    ? 1 - plan.moveOffset[0] : plan.moveOffset[0];
                                world = field.convertToWorldSpaceAR(new Vec3(
                                    field.width * (ratioX - field.anchorX),
                                    field.height * (plan.moveOffset[1] - field.anchorY), 0));
                            } else {
                                world = slots.get(step.targetId)!.worldPosition.clone();
                                world.x += units.find(unit => unit.unitId === step.targetId)!.faction === 1 ? 100 : -100;
                            }
                            // 转回施法者槽的父坐标，保留双方槽组和战场缩放，不手写屏幕坐标。
                            const point = slot.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(world);
                            tween(slot).to(plan.moveSeconds / playbackScale, { position: point }).start();
                            await wait(plan.moveSeconds);
                        }
                        if (cancelled()) return;
                        if (!plan.effectOnly && !actors.get(step.sourceId)!.gesture(plan.action)) throw new Error("缺少英雄动作：" + plan.action);
                        // 施法只播一次。独立帧由本战场持有，按旧attack_time挂出并继续播放，不延长角色动作。
                        const targetEffects = (async () => {
                            if (plan.attackSeconds > 0) {
                                await wait(plan.attackSeconds);
                            }
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
                        const actorSeconds = plan.attackSeconds + plan.attackDelaySeconds
                            + plan.actionSeconds + plan.beforeReturnSeconds;
                        // 旧type5投射与type3帧均独立持有，完成只等角色动作；type6/7/9挂出即完成。
                        // 立即接住独立任务异常，角色完成后发生的帧失败仍停止整场，关场后不重复报告。
                        void targetEffects.catch(error => {
                            if (!cancelled()) {
                                failPlayback(error);
                            }
                        });
                        if (actorSeconds > 0) {
                            await wait(actorSeconds);
                        }
                        if (cancelled()) return;
                        if (moving) {
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
                        BattlePresentViewUtils.paintBattleFloats(shell.present, [{ anchor: 0, hurt: step.reportedHpChange!, crit: false }], [point]);
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
                        BattlePresentViewUtils.paintBattleFloats(shell.present, [{ anchor: 0, hurt: step.reportedHpChange!, crit: false }], [point]);
                        await wait(0.35);
                    } else if (step.kind === "buff.upsert" || step.kind === "buff.remove") {
                        const active = activeBuffs.get(step.targetId)!;
                        if (step.kind === "buff.upsert") active.set(step.buffInstanceId!, step.configId);
                        else active.delete(step.buffInstanceId!);
                        const type = selected.get(step.configId)?.type;
                        paintBuffs(step.targetId, { kind: step.kind === "buff.upsert" ? "upsert" : "remove", type: type! });
                        const name = type === 1205 ? "流血" : type === 1004 ? "冰冻" : type === 1005 ? "眩晕"
                            : type === 1006 ? "石化" : type === 1001 ? "沉默" : type === 1014 ? "深睡" : type === 234 ? "格挡盾"
                            : step.configId >= 2233301 && step.configId <= 2233303 ? "降攻"
                            : step.configId >= 2231201 && step.configId <= 2231203 ? "降护甲" : "状态";
                        record("单位" + step.targetId + " " + name + (step.kind === "buff.remove" ? "解除" : "生效"));
                        GameLog.shared.classified("MODULE", "info", "BattleReplayPreview", "buff " + step.kind + " config=" + step.configId + " round=" + step.round + " target=" + step.targetId + " instance=" + step.buffInstanceId + " visible=" + active.size);
                    }
                }
            });
            // 复用已有按钮启动，确保浏览器用户手势允许音频，不自动绕过音频策略。
            UiKitUtils.setText(shell.logLabel, audit ? audit.name + " Lv." + audit.level + (audit.passive ? " · 播放完整触发过程" : " · 从首次施法开始") : persistentChapter ? "战斗准备完成" : lineupTitle ? "属性尚未完整；只读试战，不发奖励" : "测试已就绪，请点击开始");
            const button = shell.root.getChildByPath("LayerHud/BtnSkip")!;
            UiKitUtils.setText(button.getChildByName("Label")!, defeatPresentation ? "失败样式验收" : "开始");
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
                        BattlePresentViewUtils.paintBattleFloats(shell.present, []);
                        const last = steps[steps.length - 1];
                        const allyHp = units.filter(unit => unit.faction === 1)
                            .reduce((total, unit) => total + last.hpByUnit[unit.unitId], 0);
                        const enemyHp = units.filter(unit => unit.faction === 2)
                            .reduce((total, unit) => total + last.hpByUnit[unit.unitId], 0);
                        UiKitUtils.setText(shell.logLabel, "战报结束 · 剩余生命 " + allyHp);
                        if (audit) {
                            replayReady = true;
                            button.active = true;
                            UiKitUtils.setText(button.getChildByName("Label")!, "重播");
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
                            await UIManager.instance.open(ChapterEndView, {
                                won, persistentChapter, units, names,
                            });
                        }
                        GameLog.shared.classified("MODULE", "info", "BattleReplayPreview",
                            "completed hp=" + JSON.stringify(last.hpByUnit) + " round=" + last.round);
                    }
                }).catch(failPlayback);
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
