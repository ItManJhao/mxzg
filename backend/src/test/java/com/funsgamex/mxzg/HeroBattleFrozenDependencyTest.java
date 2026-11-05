/** 冰冻及207真实配置依赖核对；不把解析支持等同于已开放战斗效果。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleFrozenDependencyTest {
    /** 真实冰冻的概率、破冰计数和抗性与旧处理器一致。 */
    @Test void frozenConfigurationRetainsLegacyCounters() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var frozen = rules.battleFrozenDefinition(2051301);
        assertEquals(.15, frozen.rate());
        assertEquals(999, frozen.hitCount());
        assertEquals(216, frozen.resistanceAttribute());
        assertEquals(2, frozen.duration());
        assertEquals(.35, rules.battleFrozenDefinition(2101403).rate());
        assertThrows(IllegalArgumentException.class, () -> rules.battleFrozenDefinition(1041301));
        assertEquals(1004, rules.battleBuff(2051301).type());
    }

    /** 三级攻击仍引用一级增益，忠实保留旧表，不按等级自行修正。 */
    @Test void controllingChainKeepsThirdLevelReference() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var first = rules.controllingAttributes(2234201);
        var second = rules.controllingAttributes(2234202);
        var third = rules.controllingAttributes(2234203);
        assertEquals(List.of(201, 207), first.stream().map(v -> v.attribute()).toList());
        assertEquals(List.of(500L, 500L), first.stream().map(v -> v.amount()).toList());
        assertEquals(List.of(1000L, 1000L), second.stream().map(v -> v.amount()).toList());
        assertEquals(List.of(500L, 1500L), third.stream().map(v -> v.amount()).toList());
        assertEquals(2234301, third.getFirst().buffId());
        assertTrue(third.stream().allMatch(v -> v.duration() == 2));
        assertThrows(IllegalArgumentException.class, () -> rules.controllingAttributes(1041301));
    }
    /** 固定属性增益改变真实攻击/暴击读取，到期反向增减恢复，快照撤回异常动作。 */
    @Test void attributeBuffAffectsReadsAndRestores() {
        var state = new com.funsgamex.mxzg.hero.HeroBattleAttributeState(java.util.Map.of(220, 100L));
        var before = state.baseSnapshot();
        state.addBase(201, 500);
        state.addBase(207, 1500);
        assertEquals(105, state.get(220));
        assertEquals(.15, state.rate(207));
        state.addBase(201, -500);
        state.addBase(207, -1500);
        assertEquals(100, state.get(220));
        assertEquals(0, state.rate(207));
        state.addBase(201, 1000);
        state.restoreBase(before);
        assertEquals(100, state.get(220));
    }

    /** 原表208的0不视为通配；209按配置ID和对应技能等级精确匹配。 */
    @Test void remainingPassiveFiltersFollowOriginalValues() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        for (int level = 1; level <= 3; level++) {
            assertEquals(208, rules.battleTrigger(2234500 + level).event());
            assertFalse(rules.matchesControlTrigger(2234500 + level, 1004));
            assertEquals(209, rules.battleTrigger(2234700 + level).event());
            assertTrue(rules.matchesExpiredTrigger(2234700 + level, 2233300 + level));
            assertFalse(rules.matchesExpiredTrigger(2234700 + level, 1004));
            assertFalse(rules.matchesExpiredTrigger(2234700 + level, 2233300 + (level % 3 + 1)));
        }
    }

}
