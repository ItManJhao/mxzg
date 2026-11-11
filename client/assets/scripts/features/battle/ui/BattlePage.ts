/**
 * 绑定序列化战场 BattlePage，节点契约见 docs/battle-prefab-layout.md。
 * 当前主线使用宫殿远景、地板和紧凑血条；静态布局由预制体维护。
 * 只装配显示与事件，不发协议。缺失必要挂点时拒绝打开，由调用边界报告错误。
 */
import { Node,Sprite,UITransform } from "cc";
import { bindClick,loadPrefab,requireNode,spawnPrefab } from "../../../framework/assets/PrefabLoader";
import { ResManager } from "../../../framework/assets/ResManager";
import { setText } from "../../../framework/ui/UiKit";
import {
BATTLE_PREFAB_PATH,
battleHpPath,
battlePrefabRequiredPaths,
battleSkillLabelPath,
battleSlotPath,
BattleSlotSide,
battleVfxPath,
BattleVfxRole,
HP_FILL_HEIGHT,
hpFillLayout,
vfxLocal,
} from "./battlePrefabLayout";
import { BattlePresentMount,bindBattlePresent } from "./battlePresentView";

export { BATTLE_PREFAB_PATH };

/** 顶栏加速钮。1 / 2 / 3 对 battle-scene_btn-speed-1 / 2 / 3。 */
export const BATTLE_SPEED_ICON = [
    "battle/ui/battle-scene_btn-speed-1",
    "battle/ui/battle-scene_btn-speed-2",
    "battle/ui/battle-scene_btn-speed-3",
];

/** 加速图标随按钮节点持有，不留下无所有者的加载缓存。 */
export function paintSpeedIcon(node: Node, speed: number): void {
    const index = speed === 2 ? 1 : speed === 3 ? 2 : 0;
    ResManager.setSprite(node, [BATTLE_SPEED_ICON[index]]);
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

export async function mountBattlePrefab(parent: Node): Promise<BattlePrefabShell> {
    const prefab = await loadPrefab(BATTLE_PREFAB_PATH);
    if (!parent.isValid) throw new Error("战斗页面已关闭");
    const root = spawnPrefab(prefab, parent);
    try {
        return bindBattlePrefab(root);
    } catch (err) {
        root.destroy();
        throw err;
    }
}

function bindBattlePrefab(root: Node): BattlePrefabShell {
    const paths = battlePrefabRequiredPaths();
    for (let i = 0; i < paths.length; i++) requireNode(root, paths[i]);
    const roundLabel = requireNode(root, "LayerHud/TopBar/RoundLabel");
    const logLabel = requireNode(root, "LayerHud/Log");
    const layerField = requireNode(root, "LayerField");
    const skip = requireNode(root, "LayerHud/BtnSkip");
    const retreat = requireNode(root, "LayerHud/BtnRetreat");
    const close = requireNode(root, "LayerHud/TopBar/BtnClose");
    const vfxSkill = requireNode(root, battleVfxPath("skill"));
    const vfxHit = requireNode(root, battleVfxPath("hit"));
    const vfxScreen = requireNode(root, battleVfxPath("screen"));
    const vfxOf = (role: BattleVfxRole): Node => (role === "skill" ? vfxSkill : role === "hit" ? vfxHit : vfxScreen);

    return {
        root,
        roundLabel,
        logLabel,
        layerField,
        slot(side: BattleSlotSide, index: number): Node {
            const path = battleSlotPath(side, index);
            if (!path) throw new Error("站位超出 Prefab " + side + " " + index);
            return requireNode(root, path);
        },
        hpLabel(side: BattleSlotSide, index: number): Node | null {
            const path = battleHpPath(side, index);
            if (!path) return null;
            return requireNode(root, path + "/Label");
        },
        setHpFill(side: BattleSlotSide, index: number, hp: number | null, maxHp: number | null): void {
            const path = battleHpPath(side, index);
            if (!path || hp === null || maxHp === null || maxHp <= 0) return;
            paintHpFill(requireNode(root, path + "/Fill"), hp / maxHp);
        },
        clearSkillLabels(): void {
            for (let i = 0; i < 3; i++) setText(requireNode(root, "LayerHud/SkillBars/SkillBar_" + i + "/Label"), "");
        },
        setSkillLabel(index: number, text: string): void {
            const path = battleSkillLabelPath(index);
            if (!path) return;
            setText(requireNode(root, path), text);
        },
        vfxAnchor(role: BattleVfxRole): Node {
            return vfxOf(role);
        },
        placeVfx(holder: Node, role: "skill" | "hit", pageX: number, pageY: number): void {
            const anchor = vfxOf(role);
            if (holder.parent !== anchor) holder.parent = anchor;
            const local = vfxLocal(role, pageX, pageY);
            holder.setPosition(local.x, local.y, 0);
        },
        bindSkip(fn: () => void): void {
            bindClick(skip, fn);
        },
        bindRetreat(fn: () => void): void {
            bindClick(retreat, fn);
        },
        bindClose(fn: () => void): void {
            bindClick(close, fn);
        },
        present: bindBattlePresent(root),
    };
}

/** 更新血条比例；正式资源采用裁切填充，旧占位填充保留原尺寸算法。 */
function paintHpFill(node: Node, ratio: number): void {
    const sprite = node.getComponent(Sprite);
    if (sprite?.type === Sprite.Type.FILLED) {
        sprite.fillRange = Math.max(0, Math.min(1, ratio));
        node.active = ratio > 0;
        return;
    }
    const ui = node.getComponent(UITransform);
    if (!ui) return;
    const layout = hpFillLayout(ratio);
    node.active = layout.visible;
    if (!layout.visible) return;
    ui.setContentSize(layout.width, HP_FILL_HEIGHT);
    node.setPosition(layout.x, 0, 0);
}
