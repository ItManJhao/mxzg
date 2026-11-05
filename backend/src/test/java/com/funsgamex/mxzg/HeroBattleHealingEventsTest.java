/** 治疗事件与真实受击被动链回归；全部状态仅在独立内存战场中。 */
package com.funsgamex.mxzg;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.*;

class HeroBattleHealingEventsTest {
    /** 构造独立单位，攻击100、自身治疗50。 */
    private State unit(int id) {
        return new State(new Actor(id, List.of()), 1, id, 100, 1000, 100, 0, 0, 0);
    }

    /** 构造独立执行器，复用真实打包配置。 */
    private HeroBattleHealingExecutor executor(State... states) {
        return new HeroBattleHealingExecutor(new HeroSkillPanelRules(new ObjectMapper()), List.of(states));
    }

    /** 使用明确编号安装测试监听；不把测试组合描述成原配置链。 */
    private Listener listener(long id, int event, int source, int art) {
        return new Listener(id, source, new Definition((int) id, event, 0,
            List.of(new Art(art, 0, true))));
    }

    /** 真实101050063:1→1063101→171→1063201，安装时不回血，受击时才回血。 */
    @Test void realPassiveChain() {
        var one = unit(1);
        var engine = executor(one, unit(2));
        engine.initializePassive(1, 101050063, 1);
        assertEquals(100, engine.state(1).hp());
        assertTrue(engine.signals().isEmpty());
        assertThrows(IllegalArgumentException.class, () -> engine.initializePassive(1, 101050063, 1));
        engine.signal(171, 1, 2);
        assertEquals(150, engine.state(1).hp());
        assertEquals(100, engine.state(2).hp());
        assertEquals(List.of(171, 186, 206, 311), engine.signals().stream().map(Signal::event).toList());
        assertEquals(100, engine.signals().get(1).carrierHp());
        assertEquals(100, engine.signals().get(2).carrierHp());
        assertEquals(150, engine.signals().get(3).carrierHp());
        assertEquals(50, one.actor().lastTreatment());
        engine.signal(171, 1, 2);
        assertEquals(200, engine.state(1).hp());
        assertThrows(IllegalStateException.class, () -> engine.initializePassive(2, 101050063, 1));
    }

    /** 治疗前186可执行另一施法者的动作；其回血先完成，外层不能覆盖内层状态。 */
    @Test void nestedTreatmentOrdering() {
        var one = unit(1);
        var two = unit(2);
        one.actor().listen(listener(1, 186, 2, 1063201));
        var engine = executor(one, two);
        engine.art(new Invocation(1, 1063201, 1, 2));
        assertEquals(150, engine.state(1).hp());
        assertEquals(150, engine.state(2).hp());
        assertEquals(List.of(2, 1), engine.recoveries().stream().map(Recovery::sourceId).toList());
        assertEquals(List.of(186, 186, 206, 311, 206, 311), engine.signals().stream().map(Signal::event).toList());
    }

    /** 受治疗206在回血前触发，携带者为被治疗者，上下文为施法者。 */
    @Test void receivedTreatmentListener() {
        var one = unit(1);
        one.actor().listen(listener(1, 206, 2, 1063201));
        var engine = executor(one, unit(2));
        engine.art(new Invocation(1, 1063201, 1, 2));
        assertEquals(List.of(186, 206, 186, 206, 311, 311), engine.signals().stream().map(Signal::event).toList());
        assertEquals(100, engine.signals().get(1).carrierHp());
        assertEquals(150, engine.state(2).hp());
    }

    /** 真实空目标动作2143502继承目标2；186与206的携带者/上下文必须互换。 */
    @Test void distinctSourceAndRecipient() {
        var engine = executor(unit(1), unit(2));
        engine.art(new Invocation(1, 2143502, 1, 2));
        assertEquals(100, engine.state(1).hp());
        assertEquals(115, engine.state(2).hp());
        assertEquals(new Signal(186, 1, 2, 100, 100, 15), engine.signals().get(0));
        assertEquals(new Signal(206, 2, 1, 100, 100, 0), engine.signals().get(1));
        assertEquals(new Signal(311, 1, 2, 100, 115, 15), engine.signals().get(2));
    }

    /** 禁疗不产生治疗事件；封印不阻止直接治疗，但阻止其监听执行。 */
    @Test void blockedAndSealed() {
        var one = unit(1);
        one.actor().listen(listener(1, 186, 2, 1063201));
        var engine = executor(one, unit(2));
        one.actor().control(1009, true);
        engine.art(new Invocation(1, 1063201, 1, 2));
        assertTrue(engine.signals().isEmpty());
        one.actor().control(1009, false);
        one.actor().control(1007, true);
        engine.art(new Invocation(1, 1063201, 1, 2));
        assertEquals(150, engine.state(1).hp());
        assertEquals(100, engine.state(2).hp());
    }

    /** 内层已回血后再遇未知效果，连同内层血量、治疗量、日志和中断一起回滚。 */
    @Test void nestedFailureRollback() {
        var one = unit(1);
        var two = unit(2);
        one.actor().listen(listener(1, 186, 2, 1063201));
        one.actor().listen(listener(2, 186, 2, 2114201));
        one.actor().interrupt(2);
        var engine = executor(one, two);
        assertThrows(IllegalArgumentException.class, () -> engine.art(new Invocation(1, 1063201, 1, 2)));
        assertEquals(100, engine.state(1).hp());
        assertEquals(100, engine.state(2).hp());
        assertEquals(0, one.actor().lastTreatment());
        assertEquals(0, two.actor().lastTreatment());
        assertTrue(one.actor().interrupted(2));
        assertTrue(engine.recoveries().isEmpty());
        assertTrue(engine.signals().isEmpty());
    }

    /** 自身治疗事件递归必须明确失败并恢复状态，不能截断后报告成功。 */
    @Test void cycleAndUnsupportedSpecialListener() {
        var one = unit(1);
        one.actor().listen(listener(1, 186, 1, 1063201));
        var engine = executor(one, unit(2));
        assertThrows(IllegalStateException.class, () -> engine.art(new Invocation(1, 1063201, 1, 2)));
        assertEquals(100, engine.state(1).hp());
        assertEquals(0, one.actor().lastTreatment());
        assertTrue(engine.signals().isEmpty());
        assertThrows(IllegalArgumentException.class, () -> new Definition(1, 9999, 0, List.of()));
        assertThrows(IllegalArgumentException.class, () -> new Definition(1, 199, 0, List.of()));
    }
}
