/** 战斗统计投影：仅消费冻结战报名册，计算旧版双方共用的三项最大值和条形比例，不查询英雄或资产。 */
import { ResManager } from "../../../framework/assets/ResManager";
import { BattleReplayUnit } from "./BattleReplayUtils";

/** 单项数值与进度；null明确表示旧战报缺失，不能用零替代。 */
export interface BattleStatisticValue {
    readonly value: number | null;
    readonly ratio: number;
}

/** 每个战场单位独立成格，重复模板也不合并；顺序沿用战报名册。 */
export interface BattleStatisticsRow {
    readonly unit: BattleReplayUnit;
    readonly damage: BattleStatisticValue;
    readonly taken: BattleStatisticValue;
    readonly recovery: BattleStatisticValue;
}

export class BattleStatisticsUtils {
    /** 无状态工具不创建实例。 */
    private constructor() {}

    /** 只解析历史头像ID；旧战报缺字段返回null，实际缺图由统一加载记录并回退。 */
    public static portrait(unit: BattleReplayUnit): string | null {
        const path = unit.portraitIconId == null ? null : ResManager.portrait(unit.portraitIconId);
        return path?.startsWith("ui/hero/hero-icon_") ? path : null;
    }

    /** 旧头像星级分组：1至5金星，6至9红星，10至13高星牌，14觉醒牌；缺失不补当前星级。 */
    public static stars(star: number | null | undefined): { row: number; high: boolean; awakened: boolean; number: number; rarity: number } {
        const value = star ?? 0;
        if (!Number.isInteger(value) || value < 0 || value > 14) {
            throw new Error("战报星级样式未核实");
        }
        return {
            row: value > 0 && value < 10 ? value - 1 : -1,
            high: value >= 10,
            awakened: value === 14,
            number: value > 10 && value < 14 ? value - 10 : 0,
            rarity: value >= 10 ? 5 : value >= 5 ? 4 : value >= 3 ? value - 1 : value > 0 ? 1 : 0,
        };
    }

    /** 旧effect2.speed/100为每帧秒数；13帧后保留末帧1.5秒，再开始下一轮。 */
    public static starFrame(elapsed: number): number {
        const local = Math.max(0, elapsed) % (13 * 0.12 + 1.5);
        return Math.min(12, Math.floor(local / 0.12));
    }

    /** 每项分别取攻守双方最大值；任一单位缺该项时保留已知文字但不绘制误导性比例。 */
    public static rows(units: readonly BattleReplayUnit[]): readonly BattleStatisticsRow[] {
        const damage = this.maximum(units.map(unit => unit.totalDamage));
        const taken = this.maximum(units.map(unit => unit.totalTakenDamage));
        const recovery = this.maximum(units.map(unit => unit.totalRecovery));
        return Object.freeze(units.map(unit => Object.freeze({
            unit,
            damage: this.value(unit.totalDamage, damage),
            taken: this.value(unit.totalTakenDamage, taken),
            recovery: this.value(unit.totalRecovery, recovery),
        })));
    }

    /** 缺失任一值返回null；全零或全负治疗时最大值为0，旧版不绘制负向条形。 */
    private static maximum(values: readonly (number | null | undefined)[]): number | null {
        return values.some(value => value == null) ? null : Math.max(0, ...(values as number[]));
    }

    /** 数字原样显示（包括负治疗）；仅在完整且最大值大于0时绘制非负比例。 */
    private static value(value: number | null | undefined, maximum: number | null): BattleStatisticValue {
        return Object.freeze({ value: value ?? null, ratio: value != null && maximum && value > 0 ? value / maximum : 0 });
    }
}
