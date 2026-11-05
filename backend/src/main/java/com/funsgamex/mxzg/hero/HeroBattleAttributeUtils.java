/** 旧服入场基础属性折算：计算初始血量、攻防速和防御率，不替代战斗中的一次性属性、Buff或伤害公式。 */
package com.funsgamex.mxzg.hero;

import java.util.Map;

public final class HeroBattleAttributeUtils {
    /** 入场满血值及无临时效果时的攻防速；原始属性Map仍独立保留。 */
    public record Opening(long hp, long maxHp, long attack, long defense, long speed) {}

    /** 无状态工具禁止实例化。 */
    private HeroBattleAttributeUtils() {}

    /** 沿旧initMaxHp与getAttribute的double后向零截断；生命比例不使用攻防速上限。 */
    public static Opening opening(Map<Integer, Long> attributes) {
        long hp = scale(attributes.getOrDefault(223, 0L), attributes.getOrDefault(102, 0L));
        return new Opening(hp, hp, attribute(attributes, 220, 201),
            attribute(attributes, 224, 202), attribute(attributes, 101, 204));
    }

    /**
     * 沿旧 FightUtil 计算防御率，仅设80%上限，不添加零下限。
     * defense 是已折算一次的当前防御；coefficient 是当前150号属性，不是星级。
     * 此结果仅是普通伤害公式的一项，不含法术防御、破甲、命中或暴击。
     */
    public static double defenseRate(long defense, long coefficient) {
        long denominator = Math.addExact(defense, coefficient);
        double result = 1D * defense / denominator;
        if (!Double.isFinite(result)) {
            throw new IllegalArgumentException("战斗防御率分母为零或结果无效");
        }
        return Math.min(result, 0.8D);
    }

    /** 攻防速读取只折算一次；旧伤害入口使用getAttribute而非再次折算的getAttack。 */
    private static long attribute(Map<Integer, Long> attributes, int base, int percent) {
        return scale(attributes.getOrDefault(base, 0L), Math.min(attributes.getOrDefault(percent, 0L), 50000L));
    }

    /** 保留旧double精度与截断顺序，不自行添加比例下限；非有限或超出long范围时拒绝输入。 */
    private static long scale(long value, long percent) {
        double result = value * (1 + percent / 10000D);
        if (!Double.isFinite(result) || result >= 0x1p63 || result < -0x1p63) {
            throw new IllegalArgumentException("战斗入场属性超出long范围");
        }
        return (long) result;
    }
}
