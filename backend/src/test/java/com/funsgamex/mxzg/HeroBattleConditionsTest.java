/** 血量条件回归：真实配置解析、边界比较及实际出手中断状态，不连接玩家库。 */
package com.funsgamex.mxzg;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleConditionUtils.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;
import tools.jackson.databind.ObjectMapper;

class HeroBattleConditionsTest {
    /** 创建本场独立的施法者。 */
    private Actor actor() {
        return new Actor(1, List.of());
    }

    /** 真实配置1083201要求目标血量严格小于30%，等于时中断。 */
    @Test void realConditionBoundary() {
        var rule = new HeroSkillPanelRules(new ObjectMapper()).battleHpCondition(1083201);
        assertEquals(new HpCondition(1083201, 3000, 0, 0), rule);
        var source = actor();
        var health = new Health(1, 100, 100);
        assertTrue(HeroBattleConditionUtils.apply(rule, source, health,
            new Health(2, 29, 100), List.of(health)));
        assertFalse(source.interrupted(2));
        assertFalse(HeroBattleConditionUtils.apply(rule, source, health,
            new Health(2, 30, 100), List.of(health)));
        assertTrue(source.interrupted(2));
        assertTrue(HeroBattleConditionUtils.apply(rule, source, health,
            new Health(2, 1, 100), List.of(health)));
        assertTrue(source.interrupted(2), "后续通过不能清除此前中断");
    }

    /** 非零比较值沿旧实现使用大于等于；来源1读取施法者，不读取目标。 */
    @Test void attackerAndComparison() {
        var source = actor();
        var rule = new HpCondition(1, 3000, 7, 1);
        assertTrue(HeroBattleConditionUtils.apply(rule, source, new Health(1, 30, 100),
            new Health(2, 0, 100), List.of()));
        assertFalse(HeroBattleConditionUtils.apply(rule, source, new Health(1, 29, 100),
            new Health(3, 100, 100), List.of()));
        assertFalse(source.interrupted(2));
        assertTrue(source.interrupted(3));
    }

    /** 队伍血量按总血量/总上限加权，不取每个英雄比例的平均值。 */
    @Test void teamRatio() {
        var small = new Health(1, 100, 100);
        var large = new Health(2, 0, 900);
        assertTrue(HeroBattleConditionUtils.apply(new HpCondition(1, 2000, 0, 2), actor(),
            small, small, List.of(small, large)));
        assertFalse(HeroBattleConditionUtils.apply(new HpCondition(1, 1000, 0, 9), actor(),
            small, small, List.of(small, large)));
    }

    /** 零分母沿旧double处理：0/0的两类比较均失败；不人为返回满血。 */
    @Test void zeroDenominatorAndValidation() {
        var source = actor();
        var zero = new Health(1, 0, 0);
        for (int comparison : List.of(0, 1)) {
            assertFalse(HeroBattleConditionUtils.apply(new HpCondition(1, 3000, comparison, 0),
                source, zero, zero, List.of()));
            assertFalse(HeroBattleConditionUtils.apply(new HpCondition(1, 3000, comparison, 2),
                source, zero, zero, List.of()));
        }
        assertThrows(IllegalArgumentException.class, () -> HeroBattleConditionUtils.apply(
            new HpCondition(1, 3000, 0, 0), source, new Health(2, 10, 10), zero, List.of()));
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        assertThrows(IllegalArgumentException.class, () -> rules.battleHpCondition(2114101));
    }

    /** 接入真实事件回调：条件写入同一Actor，监听结束后由既有restore清理。 */
    @Test void eventRestoresConditionInterrupt() {
        var source = actor();
        var processor = new HeroBattleEventProcessor();
        source.listen(new Listener(1, 1, new Definition(1, 197, 0,
            List.of(new Art(1, 0, false)))));
        var rule = new HeroSkillPanelRules(new ObjectMapper()).battleHpCondition(1083201);
        int[] calls = {0};
        processor.dispatch(197, source, 2, new Executor() {
            /** 此测试只分发触发事件，不允许伪造技能执行。 */
            public void skill(Actor actor, HeroBattleSkillUtils.Skill skill) {
                fail("不应执行技能");
            }
            /** 执行血量条件，并检查它修改了本次出手的真实中断集合。 */
            public void art(Invocation invocation) {
                calls[0]++;
                assertFalse(HeroBattleConditionUtils.apply(rule, source, new Health(1, 100, 100),
                    new Health(invocation.targetContext(), 50, 100), List.of()));
                assertTrue(source.interrupted(2));
            }
        });
        assertEquals(1, calls[0]);
        assertFalse(source.interrupted(2));
    }
}
