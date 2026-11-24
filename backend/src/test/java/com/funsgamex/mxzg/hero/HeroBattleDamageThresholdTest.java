/**
 * 覆盖受击阈值的实际旧版取整和合法输入边界。
 * 使用固定初始伤害调用比例计算，不依赖战斗随机数或构造护盾。
 */
package com.funsgamex.mxzg.hero;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class HeroBattleDamageThresholdTest {
    /** 以爱德华的 10% 门槛核对刚达标、接近和超过整倍数的行为。 */
    @Test
    void preservesLegacyFloatingPointThresholds() {
        assertEquals(0, HeroBattleDamageThreshold.occurrences(-9, 100, 1_000));
        assertEquals(1, HeroBattleDamageThreshold.occurrences(-10, 100, 1_000));
        assertEquals(2, HeroBattleDamageThreshold.occurrences(-20, 100, 1_000));
        // 原服务端的 0.3 / 0.1 略小于 3，整数运算会多触发一次。
        assertEquals(2, HeroBattleDamageThreshold.occurrences(-30, 100, 1_000));
        assertEquals(3, HeroBattleDamageThreshold.occurrences(-31, 100, 1_000));
        assertEquals(10, HeroBattleDamageThreshold.occurrences(-100, 100, 1_000));
        assertEquals(0, HeroBattleDamageThreshold.occurrences(0, 100, 1_000));
    }

    /** 拒绝不可换算的门槛和生命，以及无法以 long 表示的伤害绝对值。 */
    @Test
    void rejectsInvalidInputs() {
        assertThrows(IllegalArgumentException.class, () -> HeroBattleDamageThreshold.occurrences(-10, 0, 1_000));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleDamageThreshold.occurrences(-10, 100, 0));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleDamageThreshold.occurrences(Long.MIN_VALUE, 100, 1_000));
    }
}
