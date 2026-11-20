/**
 * 使用亡灵之刃的真实技能配置核对职业条件追击，覆盖后排筛选、伤害比例和战报。
 * 通过场内固定命中判定验证技能分支，不连接玩家库。
 */
package com.funsgamex.mxzg;

import java.util.List;
import java.util.Map;
import java.util.function.DoublePredicate;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Damage;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Signal;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleJobFollowupTest {
    /** 对照同元素的前后排目标；暗化幼龙为坦克，暗黑女爵为法师。 */
    private HeroBattleHealingExecutor engine() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var skills = rules.battleSchedule(List.of(
            new HeroEvolutionRules.Skill(105050081, 1), new HeroEvolutionRules.Skill(105050080, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, skills), 1, 5, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 2, 10000, 10000, 0, 0, 0, 0),
            new State(new Actor(3, List.of()), 2, 5, 10000, 10000, 0, 0, 0, 0),
            new State(new Actor(4, List.of()), 2, 6, 10000, 10000, 0, 0, 0, 0)));
        engine.bindCombatData(1, 10505008, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10504012, Map.of(150, 500L));
        engine.bindCombatData(3, 10504012, Map.of(150, 500L));
        engine.bindCombatData(4, 10504003, Map.of(150, 500L));
        return engine;
    }

    /** 以100能量执行首回合主动，按顺序消耗每段伤害的命中、暴击和格挡判定。 */
    private void cast(HeroBattleHealingExecutor engine, boolean... rolls) {
        int[] next = {0};
        DoublePredicate decision = chance -> rolls[next[0]++];
        var elements = new HeroBattleElementRules(new ObjectMapper());
        engine.beginRound(1, List.of(1, 2, 3, 4), elements, decision);
        engine.act(1, 2, 100, elements, decision);
        assertEquals(rolls.length, next[0]);
    }

    /** 主伤害命中两名后排，50%追击只命中原后排坦克，并且没有重复的主动伤害后置事件。 */
    @Test
    void followsWithFiftyPercentOnSelectedTankOnly() {
        var engine = engine();
        cast(engine, true, false, false, true, false, false, true, false, false);

        var damages = engine.damages();
        assertEquals(List.of(5081301, 5081301, 5081501), damages.stream().map(Damage::buffId).toList());
        assertEquals(List.of(3, 4, 3), damages.stream().map(Damage::targetId).toList());
        assertEquals(List.of(1250L, 1250L, 500L), damages.stream().map(Damage::incoming).toList());
        assertEquals(10000, engine.state(2).hp());
        assertEquals(8250, engine.state(3).hp());
        assertEquals(8750, engine.state(4).hp());
        assertEquals(List.of(3, 4), engine.signals().stream().filter(signal -> signal.event() == 182)
            .map(Signal::targetId).toList());
        assertTrue(engine.trace().stream().anyMatch(trace -> trace.kind().equals("damage")
            && trace.configId() == 5081501 && trace.sourceId() == 1 && trace.targetId() == 3));
    }

    /** 主伤害闪避不取消职业条件；同一后排坦克仍独立判定追击命中。 */
    @Test
    void judgesFollowupSeparatelyFromMissedMainDamage() {
        var engine = engine();
        cast(engine, false, true, false, false, true, false, false);

        assertTrue(engine.ordinaryResults().getFirst().missed());
        assertEquals(List.of(5081301, 5081501), engine.damages().stream().map(Damage::buffId).toList());
        assertEquals(List.of(4, 3), engine.damages().stream().map(Damage::targetId).toList());
        assertEquals(9500, engine.state(3).hp());
    }
}
