/** 普通伤害实际血量/护盾/死亡和抗暴移除回归，全部使用独立场内数据。 */
package com.funsgamex.mxzg;

import java.util.*;
import java.util.function.DoublePredicate;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.*;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleOrdinaryRuntimeTest {
    /** 同模板火元素战士，避免测试额外混入元素或职业倍率；攻击1000。 */
    private HeroBattleHealingExecutor engine(long targetHp, boolean brokenThird) {
        var states = new ArrayList<State>();
        for (int id = 1; id <= 3; id++) {
            states.add(new State(new Actor(id, List.of()), id == 1 ? 1 : 2, id,
                id == 2 ? targetHp : 1000, 1000, 1000, 0, 0, 0));
        }
        var engine = new HeroBattleHealingExecutor(new HeroSkillPanelRules(new ObjectMapper()), states);
        for (int id = 1; id <= 3; id++) {
            engine.bindCombatData(id, 10105008, Map.of(220, 1000L, 150, 500L,
                340, id == 3 && brokenThird ? -1L : 0L));
        }
        return engine;
    }

    /** 显式提供普通伤害判定序列，不复用清心的待审概率算法。 */
    private DoublePredicate decisions(boolean... values) {
        int[] next = {0};
        return rate -> values[next[0]++];
    }

    /** 执行真实1011401：48%普通伤害、配置禁止反击；技能上下文为非主动。 */
    private void hit(HeroBattleHealingExecutor engine, List<Integer> targets, boolean... values) {
        engine.ordinaryDamage(1011401, 1, targets, 1, false, 0,
            new HeroBattleElementRules(new ObjectMapper()), decisions(values));
    }

    /** 抗暴移除首个真实实例，取消暴击但保留暴伤一次性值及后续层。 */
    @Test void counterCritRemovesOnlyFirstAndSkipsCriticalDamageRead() {
        var e = engine(1000, false);
        e.installCounterCrit(19004303, 1, 1);
        e.installCounterCrit(19004303, 1, 1);
        long first = e.buffs(1).getFirst().instanceId();
        e.setOnceAttribute(1, 222, 5000);
        hit(e, List.of(2), true, true, false);
        assertEquals(520, e.state(2).hp());
        assertEquals(1, e.buffs(1).size());
        assertEquals(first, e.removals().getFirst().entry().instanceId());
        assertEquals("counter-crit", e.removals().getFirst().reason());
        assertEquals(Map.of(222, 5000L), e.onceAttributes(1));
        assertFalse(e.ordinaryResults().getFirst().critical());
    }

    /** 沿旧源码护盾报告抵消而实际血量未抵消，保留疑点；耗尽移除与死亡清理共用事务。 */
    @Test void ordinaryDamageUsesShieldAndDeathPipeline() {
        var e = engine(400, false);
        e.art(new Invocation(1, 1063201, 1, 1));
        e.art(new Invocation(1, 10011201, 1, 2));
        e.installCounterCrit(19004303, 2, 2);
        hit(e, List.of(2), true, false, false);
        var damage = e.damages().getFirst();
        assertEquals(480, damage.incoming());
        assertEquals(100, damage.absorbed());
        assertEquals(-380, damage.reported());
        assertEquals(-400, damage.actual());
        assertTrue(e.state(2).actor().isDead());
        assertTrue(e.buffs(2).isEmpty());
        assertTrue(e.signals().stream().anyMatch(signal -> signal.event() == 180));
    }

    /** 未命中只记录判定与事件，不扣1点血、不消耗护盾。 */
    @Test void missNeverDeductsHealth() {
        var e = engine(1000, false);
        e.setOnceAttribute(1, 220, 2000);
        hit(e, List.of(2), false);
        assertEquals(1000, e.state(2).hp());
        assertTrue(e.damages().isEmpty());
        assertTrue(e.ordinaryResults().getFirst().missed());
        assertTrue(e.onceAttributes(1).isEmpty());
        assertEquals(List.of(187, 204), e.signals().stream().map(Signal::event).toList());
    }

    /** 后目标失败须撤回前目标死亡、护盾消耗、抗暴移除、属性消费及全部记录。 */
    @Test void laterFailureRestoresWholeBattleAction() {
        var e = engine(400, true);
        e.art(new Invocation(1, 1063201, 1, 1));
        e.art(new Invocation(1, 10011201, 1, 2));
        e.installCounterCrit(19004303, 1, 1);
        e.setOnceAttribute(1, 220, 2000);
        var shields = e.buffs(2);
        var counter = e.buffs(1);
        var signals = e.signals();
        assertThrows(IllegalArgumentException.class, () -> hit(e, List.of(2, 3), true, true, false, true, false, false));
        assertEquals(400, e.state(2).hp());
        assertFalse(e.state(2).actor().isDead());
        assertEquals(shields, e.buffs(2));
        assertEquals(counter, e.buffs(1));
        assertEquals(Map.of(220, 2000L), e.onceAttributes(1));
        assertEquals(signals, e.signals());
        assertTrue(e.damages().isEmpty());
        assertTrue(e.ordinaryResults().isEmpty());
        assertTrue(e.removals().isEmpty());
    }

    /** 未恢复的反击配置拒绝，不能只扣血然后省略应有受击链。 */
    @Test void unsupportedCounterattackIsRejectedBeforeMutation() {
        var e = engine(1000, false);
        assertThrows(IllegalArgumentException.class, () -> e.ordinaryDamage(1010300, 1, List.of(2),
            1, false, 0, new HeroBattleElementRules(new ObjectMapper()), decisions()));
        assertEquals(1000, e.state(2).hp());
        assertTrue(e.signals().isEmpty());
    }
}
