/**
 * BattlePage 节点路径和血条填充。
 * 坐标对齐 docs/battle-prefab-layout.md。不加载 Prefab，不发协议。
 * 八槽展示壳为左我右敌，每列四行，按旧公式由站位号定位。
 * 血条 Fill 锚点在中心，满血 112×14、本地 x=-24，左缘固定在 -80。
 * VfxSkill / VfxHit 的页面原点是 (0, 180) / (0, 120)。子节点本地坐标从这里减。
 */
export const BATTLE_PREFAB_PATH = "bundles/module/battle/prefabs/BattlePage";
export const HP_FILL_FULL = 112;
export const HP_FILL_HEIGHT = 14;
export const HP_FILL_FULL_X = -24;
export type BattleSlotSide = "ally" | "enemy";
export type BattleVfxRole = "skill" | "hit" | "screen";
/** 战斗预制体路径与几何工具：统一站位、血条、等级、状态图标及特效挂点的查询和坐标转换。 */
export class BattlePrefabLayoutUtils {
    /** 纯展示或数据转换入口，无需创建工具类实例。 */
    private constructor() { }

    /** 返回指定阵营和合法站位的英雄节点路径，越界返回null。 */
    public static battleSlotPath(side: BattleSlotSide, index: number): string | null {
        if (!BattlePrefabLayoutUtils.slotIndex(index, 7)) {
            return null;
        }
        const folder = side === "ally" ? "AllySlots/Slot_A" : "EnemySlots/Slot_E";
        return "LayerField/" + folder + index;
    }

    /** 返回指定阵营和合法站位的血条节点路径，越界返回null。 */
    public static battleHpPath(side: BattleSlotSide, index: number): string | null {
        if (!BattlePrefabLayoutUtils.slotIndex(index, 7)) {
            return null;
        }
        const name = side === "ally" ? "AllyHp_" : "EnemyHp_";
        return "LayerHud/HpBars/" + name + index;
    }

    /** 返回合法技能条索引的文字节点路径，越界返回null。 */
    public static battleSkillLabelPath(index: number): string | null {
        if (!BattlePrefabLayoutUtils.slotIndex(index, 2)) {
            return null;
        }
        return "LayerHud/SkillBars/SkillBar_" + index + "/Label";
    }

    /** 返回技能、受击或辅助特效的既有挂点路径。 */
    public static battleVfxPath(role: BattleVfxRole): string {
        if (role === "skill") {
            return "LayerVfx/VfxSkill";
        }
        if (role === "hit") {
            return "LayerVfx/VfxHit";
        }
        return "LayerVfx/VfxScreen";
    }

    /** 返回合法飘字格索引的节点路径，越界返回null。 */
    public static battleFloatDmgPath(index: number): string | null {
        if (!BattlePrefabLayoutUtils.slotIndex(index, BATTLE_FLOAT_SLOT_COUNT - 1)) {
            return null;
        }
        return BATTLE_FLOAT_ROOT_PATH + "/FloatDmg_" + index;
    }

    /** 八个站位均有独立头顶挂点，后排也能显示Buff。 */
    public static battleHeadPath(side: BattleSlotSide, index: number): string | null {
        if (!BattlePrefabLayoutUtils.slotIndex(index, 7)) {
            return null;
        }
        const slot = BattlePrefabLayoutUtils.battleSlotPath(side, index);
        if (!slot) {
            return null;
        }
        return slot + "/HeadAnchor";
    }

    /** 根据阵营与站位返回等级文字路径，站位无效返回null。 */
    public static battleLevelLabelPath(side: BattleSlotSide, index: number): string | null {
        const head = BattlePrefabLayoutUtils.battleHeadPath(side, index);
        if (!head) {
            return null;
        }
        return head + "/LevelLabel";
    }

    /** 根据阵营与站位返回状态图标行路径，站位无效返回null。 */
    public static battleBuffRowPath(side: BattleSlotSide, index: number): string | null {
        const head = BattlePrefabLayoutUtils.battleHeadPath(side, index);
        if (!head) {
            return null;
        }
        return head + "/BuffRow";
    }

    /** 返回合法状态图标的节点路径，英雄站位或图标索引越界时返回null。 */
    public static battleBuffIconPath(side: BattleSlotSide, index: number, buffIndex: number): string | null {
        const row = BattlePrefabLayoutUtils.battleBuffRowPath(side, index);
        if (!row || !BattlePrefabLayoutUtils.slotIndex(buffIndex, BATTLE_BUFF_SLOT_COUNT - 1)) {
            return null;
        }
        return row + "/Buff_" + buffIndex;
    }

    /** 进战绑定时必须存在的节点。缺失必要挂点时拒绝打开。 */
    public static battlePrefabRequiredPaths(): string[] {
        const paths = [
            "Bg",
            "LayerField",
            "LayerField/EnemySlots",
            "LayerField/AllySlots",
            "LayerVfx",
            BattlePrefabLayoutUtils.battleVfxPath("skill"),
            BattlePrefabLayoutUtils.battleVfxPath("hit"),
            BattlePrefabLayoutUtils.battleVfxPath("screen"),
            "LayerHud",
            "LayerHud/TopBar",
            "LayerHud/TopBar/RoundLabel",
            "LayerHud/TopBar/BtnClose",
            "LayerHud/HpBars",
            "LayerHud/SkillBars",
            "LayerHud/LogBg",
            "LayerHud/Log",
            "LayerHud/BtnSkip",
            "LayerHud/BtnRetreat",
            BATTLE_FLOAT_LAYER_PATH,
            BATTLE_FLOAT_ROOT_PATH,
            BATTLE_FLOAT_CRIT_PATH,
            BATTLE_SKILL_NAME_BANNER_PATH,
            BATTLE_SKILL_NAME_BANNER_PATH + "/BannerBg",
            BATTLE_SKILL_NAME_LABEL_PATH,
        ];
        for (let f = 0; f < BATTLE_FLOAT_SLOT_COUNT; f++) {
            const dmg = BattlePrefabLayoutUtils.battleFloatDmgPath(f);
            if (dmg) {
                paths.push(dmg);
            }
        }
        for (let i = 0; i < 8; i++) {
            const enemy = BattlePrefabLayoutUtils.battleSlotPath("enemy", i);
            const ally = BattlePrefabLayoutUtils.battleSlotPath("ally", i);
            if (enemy) {
                paths.push(enemy);
            }
            if (ally) {
                paths.push(ally);
            }
            const enemyHp = BattlePrefabLayoutUtils.battleHpPath("enemy", i);
            const allyHp = BattlePrefabLayoutUtils.battleHpPath("ally", i);
            const skill = BattlePrefabLayoutUtils.battleSkillLabelPath(i);
            if (enemyHp) {
                paths.push(enemyHp);
                paths.push(enemyHp + "/Fill");
                paths.push(enemyHp + "/Label");
            }
            if (allyHp) {
                paths.push(allyHp);
                paths.push(allyHp + "/Fill");
                paths.push(allyHp + "/Label");
            }
            if (skill) {
                paths.push(skill);
            }
            for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
                const side: BattleSlotSide = sideIndex === 0 ? "enemy" : "ally";
                const head = BattlePrefabLayoutUtils.battleHeadPath(side, i);
                const level = BattlePrefabLayoutUtils.battleLevelLabelPath(side, i);
                const buffs = BattlePrefabLayoutUtils.battleBuffRowPath(side, i);
                if (head) {
                    paths.push(head);
                }
                if (level) {
                    paths.push(level);
                }
                if (buffs) {
                    paths.push(buffs);
                }
                for (let b = 0; b < BATTLE_BUFF_SLOT_COUNT; b++) {
                    const icon = BattlePrefabLayoutUtils.battleBuffIconPath(side, i, b);
                    if (icon) {
                        paths.push(icon);
                    }
                }
            }
        }
        return paths;
    }

    /**
     * 按当前血比改 Fill 的宽和 x。ratio 不是有限数时当成 0。
     * 大于 1 收成满血。visible 为 false 时调用方隐藏节点，不把缺血写成一条 0 宽的色条。
     */
    public static hpFillLayout(ratio: number): {
        width: number;
        x: number;
        visible: boolean;
    } {
        let clamped = ratio;
        if (!isFinite(clamped) || clamped < 0) {
            clamped = 0;
        }
        if (clamped > 1) {
            clamped = 1;
        }
        const width = HP_FILL_FULL * clamped;
        const left = HP_FILL_FULL_X - HP_FILL_FULL / 2;
        return { width, x: left + width / 2, visible: width > 0.5 };
    }

    /** 页面坐标换成挂点下的本地坐标。无锚点时技能 (0, 180)、受击 (0, 120)，本地就是 (0, 0)。 */
    public static vfxLocal(role: BattleVfxRole, pageX: number, pageY: number): {
        x: number;
        y: number;
    } {
        const origin = role === "skill" ? { x: 0, y: 180 } : role === "hit" ? { x: 0, y: 120 } : { x: 0, y: 0 };
        return { x: pageX - origin.x, y: pageY - origin.y };
    }

    /** 检查站位索引是否为指定闭区间内的整数。 */
    private static slotIndex(index: number, max: number): boolean {
        return index >= 0 && index <= max && index === Math.floor(index);
    }
}
/** #163 场内挂点。缺了就整页退回代码 UI，不另建同名节点。 */
export const BATTLE_FLOAT_LAYER_PATH = "LayerFloat";
export const BATTLE_FLOAT_ROOT_PATH = "LayerFloat/FloatDamageRoot";
export const BATTLE_FLOAT_CRIT_PATH = "LayerFloat/FloatCrit";
export const BATTLE_SKILL_NAME_BANNER_PATH = "SkillNameBanner";
export const BATTLE_SKILL_NAME_LABEL_PATH = "SkillNameBanner/SkillNameLabel";
export const BATTLE_FLOAT_SLOT_COUNT = 4;
export const BATTLE_BUFF_SLOT_COUNT = 3;
