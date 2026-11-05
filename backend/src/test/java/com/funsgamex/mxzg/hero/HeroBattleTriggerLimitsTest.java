/** 旧174/175限制回归：回合边界、来源过滤、次数耗尽及失败快照恢复。 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;

class HeroBattleTriggerLimitsTest {
    /** 记录真实动作分发次数，技能入口不用于本测试。 */
    private Executor executor(List<Integer> calls) {
        return new Executor() {
            /** 用例不调用技能。 */
            public void skill(Actor a, HeroBattleSkillUtils.Skill s) { throw new AssertionError(); }
            /** 记录被事件放行的动作。 */
            public void art(Invocation i) { calls.add(i.artId()); }
        };
    }
    /** 174上限包含指定回合，0表示不限制。 */
    @Test void criticalRoundLimitIsInclusive() {
        var actor = new Actor(1, List.of());
        actor.listen(new Listener(1, 1, new Definition(1, 174, 0, List.of(new Art(1, 0, false)), 2, false, 0)));
        var e = new HeroBattleEventProcessor();
        var calls = new ArrayList<Integer>();
        e.round(2); e.dispatch(174, actor, 2, executor(calls));
        actor.interrupt(2);
        e.round(3); e.dispatch(174, actor, 2, executor(calls));
        assertFalse(actor.interrupted(2));
        assertEquals(List.of(1), calls);
    }
    /** 175来源不匹配不执行、不扣次数；达到次数才移除该实例。 */
    @Test void sourceFilterDoesNotSpendCount() {
        var actor = new Actor(1, List.of());
        actor.listen(new Listener(1, 2, new Definition(1, 175, 0, List.of(new Art(1, 0, false)), 0, true, 2)));
        var e = new HeroBattleEventProcessor();
        var calls = new ArrayList<Integer>();
        actor.interrupt(3);
        e.dispatch(175, actor, 3, executor(calls));
        assertFalse(actor.interrupted(3));
        e.dispatch(175, actor, 2, executor(calls));
        e.dispatch(175, actor, 2, executor(calls));
        e.dispatch(175, actor, 2, executor(calls));
        assertEquals(List.of(1, 1), calls);
    }
    /** 同配置不同实例分别计数；零次数上限不会第一次就移除。 */
    @Test void instancesCountIndependently() {
        var actor = new Actor(1, List.of());
        actor.listen(new Listener(1, 1, new Definition(1, 175, 0, List.of(new Art(1, 0, false)), 0, false, 1)));
        actor.listen(new Listener(2, 1, new Definition(1, 175, 0, List.of(new Art(2, 0, false)), 0, false, 0)));
        var e = new HeroBattleEventProcessor();
        var calls = new ArrayList<Integer>();
        e.dispatch(175, actor, 2, executor(calls));
        e.dispatch(175, actor, 2, executor(calls));
        assertEquals(List.of(1, 2, 2), calls);
    }
    /** 回滚同时恢复耗尽移除的监听和次数，下一次可重新触发。 */
    @Test void checkpointRestoresConsumedListener() {
        var actor = new Actor(1, List.of());
        actor.listen(new Listener(1, 1, new Definition(1, 175, 0, List.of(new Art(1, 0, false)), 0, false, 1)));
        var before = actor.checkpoint();
        var e = new HeroBattleEventProcessor();
        var calls = new ArrayList<Integer>();
        e.dispatch(175, actor, 2, executor(calls));
        actor.rollback(before);
        e.dispatch(175, actor, 2, executor(calls));
        assertEquals(List.of(1, 1), calls);
    }
    /** 旧175在super触发之后计数，即便ended使动作跳过，次数仍会耗尽。 */
    @Test void endedStillConsumesMatchingBecriticalCount() {
        var actor = new Actor(1, List.of());
        actor.listen(new Listener(1, 1, new Definition(1, 175, 0, List.of(new Art(1, 0, false)), 0, false, 1)));
        var e = new HeroBattleEventProcessor(); e.end();
        var calls = new ArrayList<Integer>();
        e.dispatch(175, actor, 2, executor(calls));
        new HeroBattleEventProcessor().dispatch(175, actor, 2, executor(calls));
        assertTrue(calls.isEmpty());
    }
}
