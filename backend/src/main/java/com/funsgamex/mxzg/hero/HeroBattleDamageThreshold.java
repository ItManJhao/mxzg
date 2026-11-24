/**
 * 计算旧版受击百分比被动的触发次数。
 * 只负责伤害比例及取整，战斗执行器负责事件时机、累计限次和后续效果。
 */
package com.funsgamex.mxzg.hero;

final class HeroBattleDamageThreshold {
    /** 旧战斗表的万分比换算常量，保留双精度计算顺序。 */
    private static final double PERCENTAGE_RATIO = 10_000D;

    /** 只提供无状态的触发次数计算。 */
    private HeroBattleDamageThreshold() {
    }

    /**
     * 每达到一个最大生命阈值触发一次，沿用旧版两次浮点除法和向零取整。
     * @param initialDamage 本次初始伤害，取护盾和分摊前的绝对值
     * @param maxHp 被击中单位的当前最大生命
     * @param basisPoints 单次触发的最大生命比例，1000 表示 10%
     * @return 本次可触发次数，随后仍需检查旧被动的累计次数限制
     */
    static int occurrences(long initialDamage, long maxHp, int basisPoints) {
        if (maxHp <= 0 || basisPoints <= 0 || initialDamage == Long.MIN_VALUE) {
            throw new IllegalArgumentException("受击触发的初始伤害或生命阈值无效");
        }
        double damageRatio = (double) Math.abs(initialDamage) / maxHp;
        double threshold = basisPoints / PERCENTAGE_RATIO;
        return (int) (damageRatio / threshold);
    }
}
