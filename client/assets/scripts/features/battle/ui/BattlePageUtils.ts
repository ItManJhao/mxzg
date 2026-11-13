/**
 * 绑定序列化战场 BattlePage，节点契约见 docs/battle-prefab-layout.md。
 * 当前主线使用宫殿远景、地板和紧凑血条；静态布局由预制体维护。
 * 只装配显示与事件，不发协议。缺失必要挂点时拒绝打开，由调用边界报告错误。
 */
import { Node, Sprite, UITransform } from "cc";
import { PrefabLoader } from "../../../framework/assets/PrefabLoader";
import { UiKitUtils } from "../../../framework/ui/UiKitUtils";
import { BATTLE_PREFAB_PATH, BattlePrefabLayoutUtils, BattleSlotSide, BattleVfxRole, HP_FILL_HEIGHT } from "./BattlePrefabLayoutUtils";
import { BattlePresentMount, BattlePresentViewUtils } from "./BattlePresentViewUtils";
export { BATTLE_PREFAB_PATH };
/** 战斗预制体显示工具：加载完整战斗页并绑定已有英雄槽、血条与特效挂点，不维护业务战报或账号状态。 */
export class BattlePageUtils {
    /** 纯展示或数据转换入口，无需创建工具类实例。 */
    private constructor() { }

    /** 加载并绑定完整战斗预制体，父节点失效或绑定缺失时拒绝打开。 */
    public static async mountBattlePrefab(parent: Node): Promise<BattlePrefabShell> {
        const prefab = await PrefabLoader.loadPrefab(BATTLE_PREFAB_PATH);
        if (!parent.isValid) {
            throw new Error("战斗页面已关闭");
        }
        const root = PrefabLoader.spawnPrefab(prefab, parent);
        try {
            return BattlePageUtils.bindBattlePrefab(root);
        }
        catch (err) {
            root.destroy();
            throw err;
        }
    }

    /** 核对预制体必需节点并生成显示操作，布局仍由预制体保存。 */
    private static bindBattlePrefab(root: Node): BattlePrefabShell {
        const paths = BattlePrefabLayoutUtils.battlePrefabRequiredPaths();
        for (let i = 0; i < paths.length; i++) {
            PrefabLoader.requireNode(root, paths[i]);
        }
        const roundLabel = PrefabLoader.requireNode(root, "LayerHud/TopBar/RoundLabel");
        const logLabel = PrefabLoader.requireNode(root, "LayerHud/Log");
        const layerField = PrefabLoader.requireNode(root, "LayerField");
        const skip = PrefabLoader.requireNode(root, "LayerHud/BtnSkip");
        const retreat = PrefabLoader.requireNode(root, "LayerHud/BtnRetreat");
        const close = PrefabLoader.requireNode(root, "LayerHud/TopBar/BtnClose");
        const vfxSkill = PrefabLoader.requireNode(root, BattlePrefabLayoutUtils.battleVfxPath("skill"));
        const vfxHit = PrefabLoader.requireNode(root, BattlePrefabLayoutUtils.battleVfxPath("hit"));
        const vfxScreen = PrefabLoader.requireNode(root, BattlePrefabLayoutUtils.battleVfxPath("screen"));
        const vfxOf = (role: BattleVfxRole): Node => (role === "skill" ? vfxSkill : role === "hit" ? vfxHit : vfxScreen);
        return {
            root,
            roundLabel,
            logLabel,
            layerField,
            /** 取得指定阵营和站位的现有挂点；越界或缺失挂点时拒绝继续绑定。 */
            slot(side: BattleSlotSide, index: number): Node {
                const path = BattlePrefabLayoutUtils.battleSlotPath(side, index);
                if (!path) {
                    throw new Error("站位超出 Prefab " + side + " " + index);
                }
                return PrefabLoader.requireNode(root, path);
            },
            /** 取得站位血量文本；无效站位返回null，已配置挂点缺失仍报告错误。 */
            hpLabel(side: BattleSlotSide, index: number): Node | null {
                const path = BattlePrefabLayoutUtils.battleHpPath(side, index);
                if (!path) {
                    return null;
                }
                return PrefabLoader.requireNode(root, path + "/Label");
            },
            /** 按已知当前/最大血量刷新血条；缺失数据或无效最大值时保持原显示。 */
            setHpFill(side: BattleSlotSide, index: number, hp: number | null, maxHp: number | null): void {
                const path = BattlePrefabLayoutUtils.battleHpPath(side, index);
                if (!path || hp === null || maxHp === null || maxHp <= 0) {
                    return;
                }
                BattlePageUtils.paintHpFill(PrefabLoader.requireNode(root, path + "/Fill"), hp / maxHp);
            },
            /** 清空三条技能横幅文本，不销毁预制体节点或改变技能数据。 */
            clearSkillLabels(): void {
                for (let i = 0; i < 3; i++) {
                    UiKitUtils.setText(PrefabLoader.requireNode(root, "LayerHud/SkillBars/SkillBar_" + i + "/Label"), "");
                }
            },
            /** 更新指定技能横幅；没有对应横幅索引时不写入其他节点。 */
            setSkillLabel(index: number, text: string): void {
                const path = BattlePrefabLayoutUtils.battleSkillLabelPath(index);
                if (!path) {
                    return;
                }
                UiKitUtils.setText(PrefabLoader.requireNode(root, path), text);
            },
            /** 返回本页已有的技能、受击或全屏特效挂点。 */
            vfxAnchor(role: BattleVfxRole): Node {
                return vfxOf(role);
            },
            /** 把演出节点挂到对应特效层，并将页面坐标转换为该层局部位置。 */
            placeVfx(holder: Node, role: "skill" | "hit", pageX: number, pageY: number): void {
                const anchor = vfxOf(role);
                if (holder.parent !== anchor) {
                    holder.parent = anchor;
                }
                const local = BattlePrefabLayoutUtils.vfxLocal(role, pageX, pageY);
                holder.setPosition(local.x, local.y, 0);
            },
            /** 为预制体跳过按钮绑定当前回放操作，随页面节点销毁清理。 */
            bindSkip(fn: () => void): void {
                PrefabLoader.bindClick(skip, fn);
            },
            /** 为撤退按钮绑定当前回放操作，不在显示工具内结算资产。 */
            bindRetreat(fn: () => void): void {
                PrefabLoader.bindClick(retreat, fn);
            },
            /** 为关闭按钮绑定页面提供的结束操作，保持原有返回流程。 */
            bindClose(fn: () => void): void {
                PrefabLoader.bindClick(close, fn);
            },
            present: BattlePresentViewUtils.bindBattlePresent(root),
        };
    }

    /** 更新血条比例；正式资源采用裁切填充，旧占位填充保留原尺寸算法。 */
    private static paintHpFill(node: Node, ratio: number): void {
        const sprite = node.getComponent(Sprite);
        if (sprite?.type === Sprite.Type.FILLED) {
            sprite.fillRange = Math.max(0, Math.min(1, ratio));
            node.active = ratio > 0;
            return;
        }
        const ui = node.getComponent(UITransform);
        if (!ui) {
            return;
        }
        const layout = BattlePrefabLayoutUtils.hpFillLayout(ratio);
        node.active = layout.visible;
        if (!layout.visible) {
            return;
        }
        ui.setContentSize(layout.width, HP_FILL_HEIGHT);
        node.setPosition(layout.x, 0, 0);
    }
}
export interface BattlePrefabShell {
    root: Node;
    roundLabel: Node;
    logLabel: Node;
    layerField: Node;
    slot(side: BattleSlotSide, index: number): Node;
    hpLabel(side: BattleSlotSide, index: number): Node | null;
    setHpFill(side: BattleSlotSide, index: number, hp: number | null, maxHp: number | null): void;
    clearSkillLabels(): void;
    setSkillLabel(index: number, text: string): void;
    vfxAnchor(role: BattleVfxRole): Node;
    placeVfx(holder: Node, role: "skill" | "hit", pageX: number, pageY: number): void;
    bindSkip(fn: () => void): void;
    bindRetreat(fn: () => void): void;
    bindClose(fn: () => void): void;
    /** 大伤害数字和中场技能名。等级、buff 挂在站位上，不在这里。 */
    present: BattlePresentMount;
}
