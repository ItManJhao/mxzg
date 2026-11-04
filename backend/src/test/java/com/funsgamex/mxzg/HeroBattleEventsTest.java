/** 最小行动/Buff事件回归：只使用本场内存单位与真实配置，不连接玩家库、不伪造伤害完成。 */
package com.funsgamex.mxzg;

import java.util.*;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleSkillUtils.Skill;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;
import tools.jackson.databind.ObjectMapper;

class HeroBattleEventsTest {
    /** 固定主动和普攻，用于隔离行动规则。 */
    private static final Skill ACTIVE = new Skill(10, 1, 1, 1, 3, false, false);
    /** 普攻只在主动不可用或受控制时选中。 */
    private static final Skill ORDINARY = new Skill(20, 0, 2, 0, 0, false, false);

    /** 创建独立临时单位。 */
    private Actor actor() { return new Actor(1, List.of(ACTIVE, ORDINARY)); }
    /** 创建本批支持的事件定义，触发动作交给用例检查。 */
    private Listener listener(long id, int source, int event, int filter, int art) {
        return new Listener(id, source, new Definition((int) id, event, filter, List.of(new Art(art, 0, false))));
    }
    /** 注入可观察的执行器；只记录动作调用，不宣称完成真实伤害。 */
    private Executor executor(List<String> trace, Consumer<Invocation> effect) {
        return new Executor() {
            public void skill(Actor actor, Skill skill) { trace.add("skill:" + skill.skillId()); }
            public void art(Invocation action) { trace.add("art:" + action.artId()); effect.accept(action); }
        };
    }

    /** 死亡、9999、先手及普通/主动不同控制集合均按旧分支判断。 */
    @Test void actionEligibilityMatchesControlSets() {
        assertFalse(HeroBattleActionUtils.canAct(true, ACTIVE, 9999, Set.of()));
        for (int type : List.of(1003, 1004, 1005, 1006, 1010, 1012, 1014)) {
            assertFalse(HeroBattleActionUtils.canAct(false, ACTIVE, 0, Set.of(type)));
            assertFalse(HeroBattleActionUtils.canAct(false, ORDINARY, 0, Set.of(type)));
            assertTrue(HeroBattleActionUtils.canAct(false, ACTIVE, 9999, Set.of(type)));
        }
        assertTrue(HeroBattleActionUtils.canAct(false, ACTIVE, 0, Set.of(1002)));
        assertFalse(HeroBattleActionUtils.canAct(false, ORDINARY, 0, Set.of(1002)));
        var first = new Skill(30, 1, 1, 1, 3, false, true);
        assertTrue(HeroBattleActionUtils.canAct(false, first, 0, Set.of(1005)));
        assertFalse(HeroBattleActionUtils.canAct(true, first, 0, Set.of()));
        for (int type : List.of(1001, 1011, 1013, 1015)) {
            assertTrue(HeroBattleActionUtils.onlyAttack(Set.of(type)));
        }
        assertFalse(HeroBattleActionUtils.onlyAttack(Set.of(1007)));
    }

    /** 行动前控制影响资格；候选已经选定，不能因行动前新增沉默而偷偷重选。 */
    @Test void beforeActionChangesEligibilityWithoutReselection() {
        var processor = new HeroBattleEventProcessor();
        var actor = actor();
        actor.listen(listener(1, 1, 197, 0, 101));
        var trace = new ArrayList<String>();
        assertFalse(processor.act(actor, 1, null, 0, executor(trace, action -> actor.control(1005, true))));
        assertEquals(List.of("art:101"), trace);
        actor.control(1005, false);
        trace.clear();
        assertTrue(processor.act(actor, 1, null, 0, executor(trace, action -> actor.control(1001, true))));
        assertEquals(List.of("art:101", "skill:10"), trace);
        trace.clear();
        assertTrue(processor.act(actor, 1, null, 0, executor(trace, action -> {})));
        assertEquals(List.of("art:101", "skill:20"), trace);
    }

    /** 正常行动依次执行前置、技能、对应使用事件、攻击事件；反击跳过使用与攻击事件。 */
    @Test void skillFilterAndCounterattackPreserveOrder() {
        var processor = new HeroBattleEventProcessor();
        var actor = actor();
        actor.listen(listener(1, 1, 197, 0, 101));
        actor.listen(listener(2, 1, 173, 10, 102));
        actor.listen(listener(3, 1, 173, 99, 103));
        actor.listen(listener(4, 1, 170, 0, 104));
        actor.listen(listener(5, 1, 172, 0, 105));
        var trace = new ArrayList<String>();
        var executor = executor(trace, action -> {});
        assertTrue(processor.act(actor, 1, null, 0, executor));
        assertEquals(List.of("art:101", "skill:10", "art:102", "art:104"), trace);
        trace.clear();
        assertTrue(processor.act(actor, 2, null, 0, executor));
        assertEquals(List.of("art:101", "skill:20", "art:105", "art:104"), trace);
        trace.clear();
        assertTrue(processor.act(actor, 2, ACTIVE, 0, executor));
        assertEquals(List.of("art:101", "skill:10"), trace);
    }

    /** 外来Buff先执行；增删监听只影响下一次事件，本次按快照稳定执行并清中断。 */
    @Test void listenerSnapshotOrderingAndRestore() {
        var processor = new HeroBattleEventProcessor();
        var actor = actor();
        actor.listen(listener(1, 1, 197, 0, 101));
        actor.listen(listener(2, 2, 197, 0, 102));
        var trace = new ArrayList<String>();
        processor.dispatch(197, actor, 3, executor(trace, action -> {
            if (action.artId() == 102) {
                assertEquals(2, action.sourceId());
                assertEquals(1, action.targetContext());
                actor.remove(1);
                actor.listen(listener(3, 1, 197, 0, 103));
                actor.interrupt(3);
            } else {
                assertFalse(actor.interrupted(3));
                assertEquals(3, action.targetContext());
            }
        }));
        assertEquals(List.of("art:102", "art:101"), trace);
        trace.clear();
        processor.dispatch(197, actor, 3, executor(trace, action -> {}));
        assertEquals(List.of("art:102", "art:103"), trace);
    }

    /** 封印阻止事件而非普通行动；未知处理器和执行失败必须向上报告。 */
    @Test void sealingEndingAndFailuresAreExplicit() {
        var processor = new HeroBattleEventProcessor();
        var actor = actor();
        actor.listen(listener(1, 1, 197, 0, 101));
        var trace = new ArrayList<String>();
        actor.control(1007, true);
        assertTrue(processor.act(actor, 1, null, 0, executor(trace, action -> {})));
        assertEquals(List.of("skill:10"), trace);
        actor.control(1007, false);
        actor.setHangUpSeal(true);
        trace.clear();
        processor.dispatch(197, actor, 1, executor(trace, action -> {}));
        assertTrue(trace.isEmpty());
        actor.setHangUpSeal(false);
        assertThrows(UnsupportedOperationException.class, () -> processor.dispatch(197, actor, 1,
            executor(trace, action -> { throw new UnsupportedOperationException("效果尚未实现"); })));
        assertThrows(IllegalArgumentException.class, () -> processor.dispatch(174, actor, 1, executor(trace, action -> {})));
        processor.end();
        trace.clear();
        assertFalse(processor.act(actor, 1, null, 0, executor(trace, action -> {})));
        assertTrue(trace.isEmpty());
    }

    /** 真实配置可解析限定技能触发、动作来源与先手标记；非支持Buff不会伪装为已实现。 */
    @Test void realConfigurationResolvesFirstAndTrigger() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var schedule = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(101050211, 1)));
        assertTrue(schedule.getFirst().first());
        var definition = rules.battleTrigger(2114101);
        assertEquals(173, definition.event());
        assertEquals(102050111, definition.skillFilter());
        assertEquals(List.of(new Art(2114201, 0, true)), definition.arts());
        assertThrows(IllegalArgumentException.class, () -> rules.battleTrigger(115101));
    }
}
