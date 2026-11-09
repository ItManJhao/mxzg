/** 旧战力评分回归：初始化生命、属性比例、逐英雄截断、额外战力与数值边界。 */
package com.funsgamex.mxzg;

import java.util.Map;
import com.funsgamex.mxzg.hero.HeroPowerRules;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class HeroPowerRulesTest {
    /** 读取真实scorecount与system，不用测试手写权重替换实现。 */
    private final HeroPowerRules rules = new HeroPowerRules(new ObjectMapper());

    /** HP先初始化为2000，攻击变200：总和360.2先截断，再乘3，加7得到1087。 */
    @Test void legacyInitializationAndRoundingOrder() {
        var raw = Map.of(223, 1000L, 102, 10000L, 220, 100L, 201, 10000L,
            224, 20L, 101, 10L, 130, 7L);
        assertEquals(1087, rules.score(raw));
        assertEquals(1087, rules.score(raw));
        assertEquals(1000L, raw.get(223));
        assertEquals(7, rules.score(Map.of(223, 10L, 130, 7L)));
        assertEquals(0, rules.score(Map.of(223, 10L)) + rules.score(Map.of(223, 10L)),
            "每个英雄先截断，不能先合并队伍属性再评分");
    }

    /** 控制命中先受效果命中比例影响，速度按50000比例上限折算。 */
    @Test void scoreUsesLegacyAttributeReader() {
        assertEquals(42, rules.score(Map.of(219, 10L, 10, 10000L)));
        assertEquals(126, rules.score(Map.of(101, 10L, 204, 90000L)));
        assertEquals(210, rules.score(Map.of(207, 100L)));
    }

    /** 拒绝原int范围外或负分，避免门槛比较受溢出影响。 */
    @Test void rejectsOverflowInsteadOfWrapping() {
        assertThrows(IllegalArgumentException.class, () -> rules.score(Map.of(220, Long.MAX_VALUE)));
        assertThrows(IllegalArgumentException.class, () -> rules.score(Map.of(220, -1L)));
        assertThrows(ArithmeticException.class, () -> rules.score(Map.of(220, 1000000000L)));
    }
}
