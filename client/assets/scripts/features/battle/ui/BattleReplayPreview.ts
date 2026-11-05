/** 独立战报画面验收：复用BattlePage及真实资源，不连接账号、数据库或奖励接口。 */
import { UIOpacity, Color, AudioClip, AudioSource, JsonAsset, Node, resources, Sprite, SpriteFrame, Tween, tween, Vec3, UITransform } from "cc";
import { mountBattlePrefab } from "./BattlePage";
import { mountBattleSpine, SpineActor } from "./battleSpine";
import { paintBattleFloats } from "./battlePresentView";
import { BattleReplayPlayer } from "../BattleReplayPlayer";
import { BattleReplayUtils } from "../utils/BattleReplayUtils";
import { BattleAttackUtils } from "../utils/BattleAttackUtils";
import { GameLog } from "../../../core/GameLog";
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { ChapterEndView } from "./ChapterEndView";
import { UIManager } from "../../../framework/ui/UIManager";
import { registerView } from "../../../framework/ui/UIRegistry";
import { UILayer } from "../../../framework/ui/UILayer";
import { setText } from "../../../framework/ui/UiKit";

/** 同源配置行，只消费当前已核对的近身/远程、伤害音效和201图标字段。 */
interface BuffRow { idx: number; type: number; ani_base: string; file: string; sound: string; buff_icon: number; delay: number; shake: number; dimly: number; }

export class BattleReplayPreview {
    /** 装载资源及真实预制体后执行二进制战报；返回用于关场的清理函数。 */
    public static async open(parent: Node, bytes: Uint8Array, defeatPresentation = false): Promise<() => void> {
        const steps = BattleReplayUtils.decode(bytes);
        const units = BattleReplayUtils.units(bytes);
        const templates = await new Promise<JsonAsset>((resolve, reject) => resources.load("config/herotype", JsonAsset,
            (error, asset) => error ? reject(error) : resolve(asset)));
        const templateRows = (templates.json as { rows: { type: number; elem: number }[] }).rows;
        const elementPaths = [ResourceCatalog.hero.hero_icon_elem_1.loadPath, ResourceCatalog.hero.hero_icon_elem_2.loadPath,
            ResourceCatalog.hero.hero_icon_elem_3.loadPath, ResourceCatalog.hero.hero_icon_elem_4.loadPath,
            ResourceCatalog.hero.hero_icon_elem_5.loadPath];
        const config = await new Promise<JsonAsset>((resolve, reject) => resources.load("config/buff", JsonAsset,
            (error, asset) => error ? reject(error) : resolve(asset)));
        const rows = (config.json as { rows: BuffRow[] }).rows;
        const selected = new Map<number, BuffRow>();
        for (const step of steps) {
            if (step.kind === "presentation" || step.kind === "buff.upsert" || step.kind === "damage") {
                const row = rows.find(row => row.idx === step.configId);
                if (!row) throw new Error("缺少战斗表现配置：" + step.configId);
                if (step.kind === "presentation") BattleAttackUtils.plan(row);
                if (step.kind === "damage" && row.type === 100) BattleAttackUtils.damageSounds(row);
                selected.set(row.idx, row);
            }
        }
        const shell = await mountBattlePrefab(parent);
        const unregisterEnd = registerView(ChapterEndView, {
            id: "chapter-end", prefab: "prefabs/ui/chapter/ChapterEndView", layer: UILayer.Popup,
            hostId: "battle-settlement", cache: false, allowMultiple: false
        });
        const releaseEndHost = UIManager.instance.setResidentHost("battle-settlement", () => shell.root.isValid ? shell.root : null);
        for (const path of ["LayerAppear", "LayerHud/SkillBars"]) {
            const node = shell.root.getChildByPath(path);
            if (node) node.active = false;
        }
        setText(shell.root.getChildByPath("LayerHud/MatchInfo/AllyNameLabel")!, "独立测试阵容");
        setText(shell.root.getChildByPath("LayerHud/MatchInfo/EnemyNameLabel")!, units[1].templateId === 10505005 ? "主线第2关" : "主线第1关");
        const actors = new Map<number, SpineActor>();
        const slots = new Map<number, Node>();
        /** 当前出场单位的头顶血条，随英雄槽移动；页面关闭时随预制体销毁。 */
        const hpRows = new Map<number, Node>();
        const origins = new Map<number, Vec3>();
        const sounds = new Map<string, AudioClip>();
        const icons = new Map<number, SpriteFrame>();
        const activeBuffs = new Map<number, Map<string, number>>([[1, new Map()], [2, new Map()]]);
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
        /** 停止动画等待、声音并恢复站位；不更改服务器数据。 */
        const stop = () => {
            Tween.stopAllByTarget(shell.root);
            effectEpoch++;
            Tween.stopAllByTarget(dimOpacity);
            dimOpacity.opacity = 0;
            shell.root.setPosition(rootOrigin);
            const pending = Array.from(waits);
            waits.clear();
            for (const [id, slot] of slots) {
                Tween.stopAllByTarget(slot);
                if (slot.isValid) slot.setPosition(origins.get(id)!);
            }
            audio.stop();
            for (const finish of pending) finish();
        };
        /** 战场销毁才释放结算入口；正常播放结束仍需打开结算。 */
        const releaseSettlement = () => {
            UIManager.instance.closeById("chapter-end");
            releaseEndHost();
            unregisterEnd();
        };
        /** 延迟使用引擎时钟，随Creator暂停；关页清理结束等待，避免遗留Promise。 */
        const wait = (seconds: number) => new Promise<void>(resolve => {
            const finish = () => { waits.delete(finish); resolve(); };
            waits.add(finish);
            tween(shell.root).delay(seconds).call(finish).start();
        });
        /** 只更新预制体血条，实际扣血已由整包校验确认。 */
        const hp = (id: number, value: number) => {
            const label = hpRows.get(id)?.getChildByName("Label");
            if (!label?.parent) throw new Error("战斗血条挂点缺失");
            label.parent.active = value > 0;
            // 等级来自整包校验后的服务器快照，不按关卡或模板猜测。
            setText(label, String(units.find(unit => unit.unitId === id)!.level));
            const fill = label.parent.getChildByName("Fill")!;
            const max = id === 1 ? steps[0].attackerHp : steps[0].defenderHp;
            fill.active = value > 0;
            fill.getComponent(Sprite)!.fillRange = Math.max(0, Math.min(1, value / max));
        };
        /** 按实例维护图标；同配置多实例移除一层不误清全部。 */
        const paintBuffs = (id: number) => {
            const row = slots.get(id)!.getChildByPath("HeadAnchor/BuffRow");
            if (!row) throw new Error("战斗Buff挂点缺失");
            const values = Array.from(activeBuffs.get(id)!.values());
            row.active = values.length > 0;
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
        try {
            for (const row of selected.values()) {
                if (row.type === 2 || row.type === 3 || row.type === 100) {
                    const names = row.type === 100 ? BattleAttackUtils.damageSounds(row) : BattleAttackUtils.plan(row).sounds;
                    for (const name of names) {
                        sounds.set(name, await new Promise<AudioClip>((resolve, reject) => resources.load("audio/" + name,
                            AudioClip, (error, asset) => error ? reject(error) : resolve(asset))));
                    }
                } else if (row.buff_icon) {
                    icons.set(row.idx, await new Promise<SpriteFrame>((resolve, reject) => resources.load(
                        "ui/hero/skill-icon_" + row.buff_icon + "/spriteFrame", SpriteFrame,
                        (error, asset) => error ? reject(error) : resolve(asset))));
                }
            }
            for (const side of ["ally", "enemy"] as const) {
                const id = side === "ally" ? 1 : 2;
                const unit = units.find(unit => unit.unitId === id)!;
                const index = unit.position - 1;
                for (let i = 0; i < 8; i++) {
                    shell.slot(side, i).active = i === index;
                    const label = shell.hpLabel(side, i);
                    if (label?.parent) label.parent.active = i === index;
                }
                const slot = shell.slot(side, index);
                const template = templateRows.find(row => row.type === unit.templateId);
                if (!template || !elementPaths[template.elem - 1]) throw new Error("战斗英雄元素配置缺失");
                const element = shell.hpLabel(side, index)!.parent!.getChildByName("ElementIcon")!;
                element.getComponent(Sprite)!.spriteFrame = await new Promise<SpriteFrame>((resolve, reject) => resources.load(
                    elementPaths[template.elem - 1], SpriteFrame, (error, asset) => error ? reject(error) : resolve(asset)));
                element.active = true;
                const hpRow = element.parent!;
                hpRows.set(id, hpRow);
                hpRow.parent = slot;
                hpRow.setPosition(0, 90, 0);
                slots.set(id, slot);
                origins.set(id, slot.position.clone());
                for (const name of ["Placeholder", "Label"]) {
                    const node = slot.getChildByName(name);
                    if (node) node.active = false;
                }
                const actor = await new Promise<SpineActor>((resolve, reject) => {
                    const actor = mountBattleSpine(slot, String(unit.templateId), () => reject(new Error("英雄骨骼加载失败")),
                        { face: id === 1 ? 1 : -1, scale: 0.36, seatY: 0, onReady: () => resolve(actor) });
                });
                actors.set(id, actor);
                const head = slot.getChildByName("HeadAnchor");
                if (head) head.setSiblingIndex(slot.children.length - 1);
                hp(id, id === 1 ? steps[0].attackerHp : steps[0].defenderHp);
                paintBuffs(id);
            }
            player = new BattleReplayPlayer({
                stop,
                play: async step => {
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
                                shake = shake.by(0.016, { position: new Vec3(range, range, 0) })
                                    .by(0.032, { position: new Vec3(-2 * range, -2 * range, 0) })
                                    .by(0.016, { position: new Vec3(range, range, 0) });
                            }
                            shake.start();
                        }
                        if (effectRow.dimly === 1) {
                            Tween.stopAllByTarget(dimOpacity);
                            dimOpacity.opacity = 0;
                            const times = BattleAttackUtils.dimly(effectRow);
                            tween(dimOpacity).to(times[0], { opacity: 128 }, { easing: "expoOut" })
                                .delay(times[1]).to(times[2], { opacity: 0 }, { easing: "expoOut" }).start();
                        }
                        GameLog.shared.classified("MODULE", "debug", "BattleReplayPreview",
                            "effect.start " + step.configId + " delay=" + BattleAttackUtils.delaySeconds(effectRow));
                    }
                    setText(shell.roundLabel, "第" + step.round + "/15回合");
                    setText(shell.logLabel, "独立测试 · 第" + step.round + "回合");
                    if (step.kind === "presentation") {
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
                        world.x += step.targetId === 1 ? 100 : -100;
                        const point = slot.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(world);
                        if (plan.melee) {
                            tween(slot).to(plan.moveSeconds, { position: point }).start();
                            await wait(plan.moveSeconds);
                        }
                        if (cancelled()) return;
                        if (!actors.get(step.sourceId)!.gesture(plan.action)) throw new Error("缺少英雄动作：" + plan.action);
                        await wait(plan.attackSeconds + plan.attackDelaySeconds + plan.actionSeconds + plan.beforeReturnSeconds);
                        if (cancelled()) return;
                        if (plan.melee) {
                            tween(slot).to(plan.moveSeconds, { position: origins.get(step.sourceId)! }).start();
                            await wait(plan.moveSeconds);
                        }
                        if (!cancelled()) actors.get(step.sourceId)!.play("stand");
                    } else if (step.kind === "damage") {
                        const row = selected.get(step.configId)!;
                        // 持续伤害201不冒充直接伤害100；这里只恢复已核对的伤害音效来源。
                        if (row.type === 100) {
                            for (const name of BattleAttackUtils.damageSounds(row)) {
                                audio.clip = sounds.get(name)!;
                                audio.play();
                                GameLog.shared.classified("MODULE", "info", "BattleReplayPreview", "damage.sound " + name);
                            }
                        }
                        hp(step.targetId, step.targetId === 1 ? step.attackerHp : step.defenderHp);
                        const target = slots.get(step.targetId)!;
                        const point = shell.root.getComponent(UITransform)!.convertToNodeSpaceAR(target.worldPosition);
                        paintBattleFloats(shell.present, [{ anchor: 0, hurt: step.reportedHpChange!, crit: false }], [point]);
                        actors.get(step.targetId)!.play(step.dead ? "die" : "hit");
                        await wait(0.35);
                        if (!cancelled()) {
                            if (step.dead) actors.get(step.targetId)!.node.active = false;
                            else actors.get(step.targetId)!.play("stand");
                        }
                    } else if (step.kind === "buff.upsert" || step.kind === "buff.remove") {
                        const active = activeBuffs.get(step.targetId)!;
                        if (step.kind === "buff.upsert") active.set(step.buffInstanceId!, step.configId);
                        else active.delete(step.buffInstanceId!);
                        paintBuffs(step.targetId);
                        GameLog.shared.classified("MODULE", "info", "BattleReplayPreview", "buff " + step.kind + " target=" + step.targetId + " instance=" + step.buffInstanceId + " visible=" + active.size);
                    }
                }
            });
            // 复用已有按钮启动，确保浏览器用户手势允许音频，不自动绕过音频策略。
            setText(shell.logLabel, "测试已就绪，请点击开始");
            const button = shell.root.getChildByPath("LayerHud/BtnSkip")!;
            setText(button.getChildByName("Label")!, defeatPresentation ? "失败样式验收" : "开始");
            let started = false;
            shell.bindSkip(() => {
                if (started || closed) return;
                if (defeatPresentation) {
                    void UIManager.instance.open(ChapterEndView, { won: false, presentationOnly: true }).catch(error => {
                        GameLog.shared.classified("MODULE", "error", "BattleReplayPreview", "失败样式打开失败：" + String(error));
                    });
                    return;
                }
                started = true;
                button.active = false;
                void player!.play(bytes).then(async completed => {
                    if (!closed && completed) {
                        paintBattleFloats(shell.present, []);
                        const last = steps[steps.length - 1];
                        setText(shell.logLabel, "战报结束 · 剩余生命 " + last.attackerHp);
                        await UIManager.instance.open(ChapterEndView, { won: last.attackerHp > 0 && last.defenderHp === 0 });
                        GameLog.shared.classified("MODULE", "info", "BattleReplayPreview", "completed hp=" + last.attackerHp + "/" + last.defenderHp + " round=" + last.round);
                    }
                }).catch(error => {
                    if (!closed) setText(shell.logLabel, "战报播放失败，请查看日志");
                    GameLog.shared.classified("MODULE", "error", "BattleReplayPreview", "播放失败：" + String(error));
                });
            });
            const close = () => {
                closed = true;
                releaseSettlement();
                player?.stop();
                stop();
                if (shell.root.isValid) shell.root.destroy();
            };
            shell.bindRetreat(close);
            shell.bindClose(close);
        } catch (error) {
            releaseSettlement();
            stop();
            if (shell.root.isValid) shell.root.destroy();
            throw error;
        }
        return () => { closed = true; releaseSettlement(); player?.stop(); stop(); if (shell.root.isValid) shell.root.destroy(); };
    }
}
