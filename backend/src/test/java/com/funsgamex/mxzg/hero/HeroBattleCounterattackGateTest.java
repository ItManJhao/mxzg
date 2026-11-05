/** 旧反击资格与一次出手目标标记回归；不把资格检查等同于反击技能执行。 */
package com.funsgamex.mxzg.hero;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;

class HeroBattleCounterattackGateTest {
    /** 创建普通攻击计划，不启用实际伤害或数据库。 */
    private HeroBattleSkillUtils.Skill ordinary() {
        return new HeroBattleSkillUtils.Skill(1, 0, 2, 0, 1, false, false);
    }

    /** 提供能观测技能开始时状态的执行器；本用例不应执行其他动作。 */
    private Executor executor(Runnable action) {
        return new Executor() {
            /** 在真实行动调度的技能入口验证本次资格。 */
            public void skill(Actor actor, HeroBattleSkillUtils.Skill skill) { action.run(); }
            /** 该用例没有配置动作，意外调用必须失败。 */
            public void art(Invocation invocation) { throw new AssertionError("意外触发动作"); }
        };
    }

    /** 固定伤害/禁反击配置不开放后置事件；关闭目标不影响其他目标。 */
    @Test void gateDistinguishesDamageAndTargets() {
        var actor = new Actor(1, List.of(ordinary()));
        assertTrue(actor.canTriggerDamage(false, true, 2));
        assertFalse(actor.canTriggerDamage(true, true, 2));
        assertFalse(actor.canTriggerDamage(false, false, 2));
        actor.finishDamage(false, 2);
        assertTrue(actor.canTriggerDamage(false, true, 2));
        actor.finishDamage(true, 2);
        assertFalse(actor.canTriggerDamage(false, true, 2));
        assertTrue(actor.canTriggerDamage(false, true, 3));
    }

    /** 同一次技能中的第二段不再触发，下一次合法出手清空旧目标。 */
    @Test void onlyLegalNewActionResetsTargets() {
        var actor = new Actor(1, List.of(ordinary()));
        var events = new HeroBattleEventProcessor();
        var execute = executor(() -> {
            assertTrue(actor.canTriggerDamage(false, true, 2));
            actor.finishDamage(true, 2);
            assertFalse(actor.canTriggerDamage(false, true, 2));
        });
        assertTrue(events.act(actor, 1, null, 100, execute));
        assertTrue(events.act(actor, 2, null, 100, execute));
        actor.setDead(true);
        assertFalse(events.act(actor, 3, null, 100, executor(() -> fail("死亡不能出手"))));
        assertFalse(actor.canTriggerDamage(false, true, 2));
    }

    /** 队列反击不再开放同组后置触发；回到普通出手后恢复。 */
    @Test void queuedCounterattackDoesNotReenter() {
        var actor = new Actor(1, List.of(ordinary()));
        var events = new HeroBattleEventProcessor();
        assertTrue(events.act(actor, 1, ordinary(), 100,
            executor(() -> assertFalse(actor.canTriggerDamage(false, true, 2)))));
        assertTrue(events.act(actor, 2, null, 100,
            executor(() -> assertTrue(actor.canTriggerDamage(false, true, 2)))));
    }

    /** 动作快照恢复目标关闭、队列标志和控制状态，不只恢复血量监听。 */
    @Test void checkpointRestoresActionAndControlState() {
        var actor = new Actor(1, List.of(ordinary()));
        actor.finishDamage(true, 2);
        var before = actor.checkpoint();
        new HeroBattleEventProcessor().act(actor, 1, ordinary(), 100, executor(() -> {
            actor.finishDamage(true, 3);
            actor.control(1007, true);
            actor.setHangUpSeal(true);
        }));
        actor.rollback(before);
        assertFalse(actor.canTriggerDamage(false, true, 2));
        assertTrue(actor.canTriggerDamage(false, true, 3));
        assertFalse(actor.hasControl(1007));
        assertEquals(before, actor.checkpoint());
    }
}
