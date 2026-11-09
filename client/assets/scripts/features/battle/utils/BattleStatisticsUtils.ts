/** 战斗统计投影：仅消费冻结战报名册，计算旧版双方共用的三项最大值和条形比例，不查询英雄或资产。 */
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
