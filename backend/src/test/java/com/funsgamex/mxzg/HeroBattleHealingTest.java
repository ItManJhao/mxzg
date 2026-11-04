/** 真实1063201治疗动作回归：选目标、分步取整、禁疗和失败原子性，不连接玩家数据库。 */
package com.funsgamex.mxzg;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.*;

class HeroBattleHealingTest {
    /** 每次创建独立配置入口，使用打包的原始表。 */
    private HeroSkillPanelRules rules() {
        return new HeroSkillPanelRules(new ObjectMapper());
    }

    /** 构造仅含当前测试所需治疗属性的本场单位。 */
    private State unit(int id, long hp, long treatment, long rate, long received) {
        return new State(new Actor(id, List.of()), 1, id, hp, 1000, 100, treatment, rate, received);
    }

    /** 调用真实动作，目标配置[1]应覆盖传入的其他目标上下文。 */
    private void heal(HeroBattleHealingExecutor executor) {
        executor.art(new Invocation(1063201, 1063201, 1, 2));
    }

    /** 50%攻击→固定治疗→治疗比例→受治疗比例，最终上限截断与战报值分开。 */
    @Test void realActionAndCap() {
        var source = unit(1, 950, 10, 5000, 2000);
        var other = unit(2, 100, 0, 0, 0);
        var executor = new HeroBattleHealingExecutor(rules(), List.of(source, other));
        heal(executor);
        assertEquals(1000, executor.state(1).hp());
        assertEquals(100, executor.state(2).hp());
        assertEquals(List.of(new Recovery(1063201, 1, 1, 50, 108, 50)), executor.recoveries());
        assertEquals(950, source.hp(), "原输入快照不回写");
        assertThrows(UnsupportedOperationException.class, () -> executor.recoveries().clear());
        heal(executor);
        assertEquals(0, executor.recoveries().getLast().actual());
        assertEquals(108, executor.recoveries().getLast().reported());
    }

    /** 百分比必须逐步截断，不能将比例合并后只截断一次。 */
    @Test void truncation() {
        var executor = new HeroBattleHealingExecutor(rules(), List.of(
            unit(1, 100, 1, 3333, 3333), unit(2, 100, 0, 0, 0)));
        heal(executor);
        assertEquals(189, executor.state(1).hp());
        assertEquals(89, executor.recoveries().getFirst().reported());
    }

    /** 禁疗和既有中断均不回血；动作结束清中断，下一次可执行。 */
    @Test void blockedAndRestored() {
        var source = unit(1, 100, 0, 0, 0);
        var executor = new HeroBattleHealingExecutor(rules(), List.of(source, unit(2, 100, 0, 0, 0)));
        source.actor().control(1009, true);
        heal(executor);
        assertEquals(100, executor.state(1).hp());
        assertTrue(executor.recoveries().isEmpty());
        source.actor().control(1009, false);
        source.actor().interrupt(1);
        heal(executor);
        assertEquals(100, executor.state(1).hp());
        assertFalse(source.actor().interrupted(1));
        heal(executor);
        assertEquals(150, executor.state(1).hp());
    }

    /** 真实条件不满足→中断治疗目标→当前动作跳过，接通上批条件状态。 */
    @Test void conditionToTreatment() {
        var source = unit(1, 500, 0, 0, 0);
        var executor = new HeroBattleHealingExecutor(rules(), List.of(source, unit(2, 100, 0, 0, 0)));
        var hp = new HeroBattleConditionUtils.Health(1, 500, 1000);
        assertFalse(HeroBattleConditionUtils.apply(rules().battleHpCondition(1083201),
            source.actor(), hp, hp, List.of(hp)));
        heal(executor);
        assertEquals(500, executor.state(1).hp());
        assertTrue(executor.recoveries().isEmpty());
    }

    /** 未支持效果/控制改选/整组技能均拒绝；溢出前不写状态也不清中断。 */
    @Test void rejectWithoutMutation() {
        var source = unit(1, 100, Long.MAX_VALUE, 0, 0);
        var executor = new HeroBattleHealingExecutor(rules(), List.of(source, unit(2, 100, 0, 0, 0)));
        source.actor().interrupt(2);
        assertThrows(ArithmeticException.class, () -> heal(executor));
        assertEquals(100, executor.state(1).hp());
        assertTrue(source.actor().interrupted(2));
        assertTrue(executor.recoveries().isEmpty());
        assertThrows(IllegalArgumentException.class,
            () -> executor.art(new Invocation(1, 2114201, 1, 2)));
        source.actor().control(1011, true);
        assertThrows(UnsupportedOperationException.class, () -> heal(executor));
        assertThrows(UnsupportedOperationException.class, () -> executor.skill(source.actor(), null));
    }

    /** 死亡目标不因治疗复活；场内编号重复及上下文缺失拒绝。 */
    @Test void deadAndIdentity() {
        var source = unit(1, 0, 0, 0, 0);
        var executor = new HeroBattleHealingExecutor(rules(), List.of(source, unit(2, 100, 0, 0, 0)));
        heal(executor);
        assertEquals(0, executor.state(1).hp());
        assertTrue(executor.recoveries().isEmpty());
        assertThrows(IllegalArgumentException.class,
            () -> new HeroBattleHealingExecutor(rules(), List.of(source, source)));
        assertThrows(IllegalArgumentException.class,
            () -> executor.art(new Invocation(1, 1063201, 1, 99)));
    }
}
