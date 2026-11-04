/** 旧战斗折算与候选技能排期的特征回归；固定数值来自AttributeInfo/SkillDo/SkillInfo，不执行战斗。 */
package com.funsgamex.mxzg;

import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import com.funsgamex.mxzg.hero.HeroBattleAttributeUtils;
import com.funsgamex.mxzg.hero.HeroBattleSkillUtils;
import com.funsgamex.mxzg.hero.HeroBattleSkillUtils.Skill;

class HeroBattleRulesTest {
    /** 生命不封顶，攻防速封顶50000；折算后向零截断且不污染原值。 */
    @Test void capsOnlyAttackDefenseAndSpeed() {
        var raw = Map.of(223, 101L, 102, 60000L, 220, 101L, 201, 60000L,
            224, 101L, 202, 333L, 101, 101L, 204, -333L);
        var opening = HeroBattleAttributeUtils.opening(raw);
        assertEquals(new HeroBattleAttributeUtils.Opening(707, 707, 606, 104, 97), opening);
        assertEquals(101L, raw.get(220));
        assertEquals(opening, HeroBattleAttributeUtils.opening(raw));
    }

    /** 攻击比例只算一次；治疗、减伤等保留在原始Map，不冒充四维。 */
    @Test void doesNotDoubleApplyAttackOrClampNegativeRate() {
        var raw = Map.of(223, 100L, 220, 100L, 201, 3000L, 224, 100L,
            202, -15000L, 101, 100L, 205, 500L, 291, 800L);
        assertEquals(new HeroBattleAttributeUtils.Opening(100, 100, 130, -50, 100),
            HeroBattleAttributeUtils.opening(raw));
        assertEquals(500L, raw.get(205));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleAttributeUtils.opening(Map.of(223, Long.MAX_VALUE)));
    }

    /** 主动初始1、冷却3的真实配置为1/5/9回合，不能误写成每3回合。 */
    @Test void activeRoundsUseCooldownPlusOne() {
        var active = new Skill(101050081, 5, 1, 1, 3, false, false);
        for (int round : List.of(1, 5, 9)) {
            assertTrue(HeroBattleSkillUtils.canRelease(active, round, 0));
        }
        for (int round : List.of(2, 3, 4, 6, 7, 8)) {
            assertFalse(HeroBattleSkillUtils.canRelease(active, round, 0));
        }
        assertFalse(HeroBattleSkillUtils.canRelease(null, 1, 0));
    }

    /** 旧公式没有初始回合下限；负差整除仍命中，不能擅自修正规则。 */
    @Test void preservesInitialFallbackAndNegativeModulo() {
        var configured = new Skill(1, 0, 1, 5, 3, false, false);
        assertTrue(HeroBattleSkillUtils.canRelease(configured, 1, 0));
        var instance = new Skill(2, 0, 1, 0, 2, false, false);
        assertTrue(HeroBattleSkillUtils.canRelease(instance, 2, 2));
        assertTrue(HeroBattleSkillUtils.canRelease(instance, 5, 2));
        assertFalse(HeroBattleSkillUtils.canRelease(instance, 3, 2));
        assertTrue(HeroBattleSkillUtils.canRelease(new Skill(3, 0, 1, 1, 0, false, false), 2, 0));
    }

    /** 追加行动优先；只能普攻次之；主动按列表首项，0被动和3光环不参与主动排期。 */
    @Test void selectionPreservesLegacyPriority() {
        var ordinary = new Skill(1, 0, 2, 0, 0, false, false);
        var first = new Skill(2, 1, 1, 1, 3, false, false);
        var second = new Skill(3, 1, 1, 1, 1, false, false);
        var passive = new Skill(4, 1, 0, 0, 0, true, false);
        var halo = new Skill(5, 1, 3, 0, 0, false, false);
        var list = List.of(passive, halo, first, second, ordinary);
        assertEquals(first, HeroBattleSkillUtils.choose(list, 1, null, false));
        assertEquals(second, HeroBattleSkillUtils.choose(list, 3, null, false));
        assertEquals(ordinary, HeroBattleSkillUtils.choose(list, 2, null, false));
        assertEquals(ordinary, HeroBattleSkillUtils.choose(list, 1, null, true));
        assertEquals(second, HeroBattleSkillUtils.choose(list, 1, second, true));
        assertNull(HeroBattleSkillUtils.choose(List.of(passive, halo), 1, null, false));
    }
}
