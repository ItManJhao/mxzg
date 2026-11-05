/** 旧普通伤害命中分支回归：验证概率、暴击抵消及格挡差异，不猜测缺失的随机实现。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleHitUtils;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleHitTest {
    /** 命中先抵消闪避，暴击抗性按乘法生效。 */
    @Test void hitAndCriticalUseLegacyMultiplication() {
        assertEquals(0.6D, HeroBattleHitUtils.hitChance(0.2D, 0.5D), 1e-12);
        assertEquals(1D, HeroBattleHitUtils.hitChance(0D, 0D));
        assertEquals(0.3D, HeroBattleHitUtils.criticalChance(0.6D, 0.5D), 1e-12);
    }

    /** 元素命中克制参与格挡，不使用伤害克制倍率。 */
    @Test void precisionAndElementHitReduceBlock() {
        assertEquals(0.24D, HeroBattleHitUtils.blockChance(0.2D, 1.2D, 0.4D), 1e-12);
        assertEquals(0.4D, HeroBattleHitUtils.blockChance(0D, 1D, 0.4D));
    }

    /** 公式本身无概率上下限；是否必中/必失败由后续随机边界负责。 */
    @Test void keepsUnclampedProbabilitiesAndDamageLowerBound() {
        assertTrue(HeroBattleHitUtils.hitChance(2D, 0.5D) > 1D);
        assertTrue(HeroBattleHitUtils.criticalChance(0.5D, 2D) < 0D);
        assertTrue(HeroBattleHitUtils.blockChance(2D, 1D, 0.5D) < 0D);
        assertEquals(3D, HeroBattleHitUtils.criticalMultiplier(2D));
        assertEquals(1D, HeroBattleHitUtils.criticalMultiplier(-0.5D));
    }

    /** 抗暴Buff仅在实际可暴击分支消耗，并跳过暴伤读取；固定/封印仍读取暴伤。 */
    @Test void criticalBranchesPreserveTemporaryAttributeConsumption() {
        assertEquals(new HeroBattleHitUtils.Critical(true, false, true),
            HeroBattleHitUtils.critical(false, true, false, false));
        assertEquals(new HeroBattleHitUtils.Critical(false, true, false),
            HeroBattleHitUtils.critical(false, true, false, true));
        assertEquals(new HeroBattleHitUtils.Critical(false, false, true),
            HeroBattleHitUtils.critical(true, true, false, true));
        assertEquals(new HeroBattleHitUtils.Critical(false, false, true),
            HeroBattleHitUtils.critical(false, true, true, true));
        assertEquals(new HeroBattleHitUtils.Critical(false, false, true),
            HeroBattleHitUtils.critical(false, false, false, true));
    }

    /** 即使抗暴取消了最终暴击，格挡仍按原始暴击成功增加减伤。 */
    @Test void blockUsesOriginalCriticalRoll() {
        assertFalse(HeroBattleHitUtils.critical(false, true, false, true).critical());
        assertEquals(0.5D, HeroBattleHitUtils.blockReduction(true, true));
        assertEquals(0.3D, HeroBattleHitUtils.blockReduction(true, false));
        assertEquals(0D, HeroBattleHitUtils.blockReduction(false, true));
    }

    /** 非有限输入和运算溢出必须失败，不得伪装成未命中。 */
    @Test void rejectsInvalidProbabilities() {
        assertThrows(IllegalArgumentException.class, () -> HeroBattleHitUtils.hitChance(Double.NaN, 0));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleHitUtils.criticalChance(1, Double.POSITIVE_INFINITY));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleHitUtils.blockChance(Double.MAX_VALUE, 1, Double.MAX_VALUE));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleHitUtils.criticalMultiplier(Double.NEGATIVE_INFINITY));
    }
}
