/** 真实普攻及被暴击反击链回归，固定判定序列，不连接玩家数据库。 */
package com.funsgamex.mxzg;

import java.util.*;
import java.util.function.DoublePredicate;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.*;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattlePostCounterTest {
    /** 同源配置，每个测试独立使用。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(new ObjectMapper());
    /** 返回真实101050080普通攻击计划，不以手写伤害倍率替代配置。 */
    private HeroBattleSkillUtils.Skill skill() {
        return rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(101050080, 0))).getFirst();
    }
    /** 创建两个火元素战士，攻击100，守方血量按用例指定。 */
    private HeroBattleHealingExecutor engine(long hp, boolean brokenAttackerDefense) {
        var a = new Actor(1, List.of(skill()));
        var d = new Actor(2, List.of(skill()));
        var e = new HeroBattleHealingExecutor(rules, List.of(
            new State(a, 1, 1, 1000, 1000, 100, 0, 0, 0),
            new State(d, 2, 2, hp, 1000, 100, 0, 0, 0)));
        e.bindCombatData(1, 10105008, Map.of(220, 100L, 150, brokenAttackerDefense ? 0L : 500L));
        e.bindCombatData(2, 10105008, Map.of(220, 100L, 150, 500L));
        return e;
    }
    /** 固定抽样次数及结果，额外抽样直接使测试失败。 */
    private DoublePredicate decisions(boolean... values) {
        int[] index = {0};
        return rate -> values[index[0]++];
    }
    /** 从真实175配置安装监听，保留真实动作1093201和来源，不伪造反击行为。 */
    private void counter(HeroBattleHealingExecutor e, int id) {
        e.state(id).actor().listen(new Listener(100 + id, id, rules.battleTrigger(1093101)));
    }
    /** 暴击后由被暴击监听入队，反击固定原攻击者且不再次引出反击。 */
    @Test void realCriticalCounterattackChain() {
        var e = engine(1000, false);
        counter(e, 1);
        counter(e, 2);
        e.attack(1, 2, new HeroBattleElementRules(new ObjectMapper()), decisions(true, true, false, true, true, false));
        assertEquals(850, e.state(1).hp());
        assertEquals(850, e.state(2).hp());
        assertEquals(List.of(2, 1), e.damages().stream().map(Damage::targetId).toList());
        assertEquals(2, e.presentations().size());
        assertEquals(1, e.signals().stream().filter(x -> x.event() == 175).count());
        // signals记录效果执行器时点；行动调度自身的197/172/170走既有dispatch，不在此列表。
        assertEquals(List.of(187,188,189,174,181,194,177,175,176,178,171,187,188,189,177),
            e.signals().stream().map(Signal::event).toList());
    }
    /** 击杀事件在死亡事件之前，死亡目标不触发受击反击。 */
    @Test void killPrecedesDeathCleanup() {
        var e = engine(80, false);
        counter(e, 2);
        e.attack(1, 2, new HeroBattleElementRules(new ObjectMapper()), decisions(true, false, false));
        var events = e.signals().stream().map(Signal::event).toList();
        assertTrue(events.indexOf(190) < events.indexOf(180));
        assertFalse(events.contains(178));
        assertEquals(1, e.damages().size());
        assertTrue(e.state(2).actor().isDead());
    }
    /** 反击执行失败应撤回原攻击伤害、表现、事件和一次性消费，队列不残留。 */
    @Test void counterFailureRestoresRootAction() {
        var e = engine(1000, true);
        counter(e, 2);
        e.setOnceAttribute(1, 220, 200);
        assertThrows(IllegalArgumentException.class, () -> e.attack(1, 2,
            new HeroBattleElementRules(new ObjectMapper()), decisions(true, true, false)));
        assertEquals(1000, e.state(2).hp());
        assertEquals(Map.of(220, 200L), e.onceAttributes(1));
        assertTrue(e.damages().isEmpty());
        assertTrue(e.signals().isEmpty());
        assertTrue(e.presentations().isEmpty());
        assertTrue(e.trace().isEmpty());
        e.attack(1, 2, new HeroBattleElementRules(new ObjectMapper()), decisions(false));
        assertEquals(1000, e.state(2).hp());
    }
    /** 同一单位下一次合法出手重新允许受击触发，不继承上一次目标关闭集合。 */
    @Test void nextActionResetsTargetGate() {
        var e = engine(1000, false);
        e.attack(1, 2, new HeroBattleElementRules(new ObjectMapper()), decisions(true, false, false));
        e.attack(1, 2, new HeroBattleElementRules(new ObjectMapper()), decisions(true, false, false));
        assertEquals(800, e.state(2).hp());
        assertEquals(2, e.signals().stream().filter(x -> x.event() == 178).count());
    }
}
