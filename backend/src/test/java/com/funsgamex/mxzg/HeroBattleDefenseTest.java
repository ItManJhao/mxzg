/** 防御规则回归：核对真实星级表、旧防御率上限及非法输入，不连接玩家数据库。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleAttributeUtils;
import com.funsgamex.mxzg.hero.HeroBattleDefenseRules;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleDefenseTest {
    /** 用真实14档配置验证星级来源，缺失星级拒绝而不是降级。 */
    @Test void resolvesRealStarsWithoutFallback() {
        var rules = new HeroBattleDefenseRules(new ObjectMapper());
        long[] expected = {500, 520, 540, 560, 600, 640, 680, 720, 780, 840, 900, 960, 1020, 1080};
        for (int star = 1; star <= expected.length; star++) {
            assertEquals(expected[star - 1], rules.coefficient(star));
        }
        assertThrows(IllegalArgumentException.class, () -> rules.coefficient(0));
        assertThrows(IllegalArgumentException.class, () -> rules.coefficient(15));
    }

    /** 同防御不同星级系数有不同减伤；高防御截在80%，零防御不减伤。 */
    @Test void computesDefenseAndUpperCap() {
        assertEquals(0.5D, HeroBattleAttributeUtils.defenseRate(500, 500));
        assertEquals(500D / 1580, HeroBattleAttributeUtils.defenseRate(500, 1080));
        assertEquals(0.8D, HeroBattleAttributeUtils.defenseRate(10000, 500));
        assertEquals(0D, HeroBattleAttributeUtils.defenseRate(0, 500));
    }

    /** 旧公式没有零下限；负防御的有限结果不能被静默归零。 */
    @Test void preservesNegativeDefenseRate() {
        assertEquals(-0.25D, HeroBattleAttributeUtils.defenseRate(-100, 500));
    }

    /** 不能把溢出或除零变成合法减伤；交给调用边界拒绝此次战斗计算。 */
    @Test void rejectsUndefinedOrOverflowedInput() {
        assertThrows(IllegalArgumentException.class, () -> HeroBattleAttributeUtils.defenseRate(-500, 500));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleAttributeUtils.defenseRate(0, 0));
        assertThrows(ArithmeticException.class, () -> HeroBattleAttributeUtils.defenseRate(Long.MAX_VALUE, 500));
    }
}
