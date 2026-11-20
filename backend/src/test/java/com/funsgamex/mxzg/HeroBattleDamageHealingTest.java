/** 复验蒂芬妮实际主动技能的伤害转治疗、职业条件和战斗记录。 */
package com.funsgamex.mxzg;

import java.util.List;
import java.util.Map;
import java.util.function.DoublePredicate;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Signal;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleDamageHealingTest {
    /** 真实蒂芬妮技能，敌方后排有两种职业和防御，双方前后排分别可观察。 */
    private HeroBattleHealingExecutor engine() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var skills = rules.battleSchedule(List.of(
            new HeroEvolutionRules.Skill(104040021, 1), new HeroEvolutionRules.Skill(104040020, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, skills), 1, 5, 500, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of()), 1, 1, 1000, 10000, 0, 0, 0, 0),
            new State(new Actor(3, List.of()), 2, 5, 10000, 10000, 0, 0, 0, 0),
            new State(new Actor(4, List.of()), 2, 6, 10000, 10000, 0, 0, 0, 0)));
        engine.bindCombatData(1, 10404002, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10404002, Map.of(150, 500L));
        engine.bindCombatData(3, 10403001, Map.of(150, 500L));
        engine.bindCombatData(4, 10404002, Map.of(150, 500L, 224, 300L));
        return engine;
    }

    /** 执行首回合主动，调用方逐次控制命中、暴击和格挡抽样。 */
    private void cast(HeroBattleHealingExecutor engine, boolean... rolls) {
        int[] next = {0};
        DoublePredicate decision = rate -> rolls[next[0]++];
        var elements = new HeroBattleElementRules(new ObjectMapper());
        engine.beginRound(1, List.of(1, 2, 3, 4), elements, decision);
        engine.act(1, 3, 100, elements, decision);
        assertEquals(rolls.length, next[0]);
    }

    /** 以最后一个后排敌人的初始伤害计算44%，仅治疗己方前排并为职业2施加降攻。 */
    @Test void healsFrontAllyFromLatestInitialDamageAndAppliesJobDebuff() {
        var engine = engine();
        cast(engine, true, false, false, true, false, false);

        var last = engine.ordinaryResults().getLast();
        long expected = Math.abs((long) (last.damage() * 0.44));
        assertTrue(expected > 0);
        assertEquals(List.of(new HeroBattleHealingExecutor.Recovery(4021501, 1, 2, expected, expected, expected)),
            engine.recoveries());
        assertEquals(1000 + expected, engine.state(2).hp());
        assertEquals(500, engine.state(1).hp());
        assertEquals(4021401, engine.buffs(3).getFirst().spec().id());
        assertTrue(engine.buffs(4).isEmpty());
        assertEquals(List.of(186, 206, 311), engine.signals().stream().map(Signal::event)
            .filter(event -> event == 186 || event == 206 || event == 311).toList());
    }

    /** 最后目标闪避会覆盖先前命中结果，治疗不得读取上一个敌人的伤害。 */
    @Test void doesNotHealWhenLatestAttemptMisses() {
        var engine = engine();
        cast(engine, true, false, false, false);

        assertEquals(1, engine.damages().size());
        assertTrue(engine.ordinaryResults().getLast().missed());
        assertTrue(engine.recoveries().isEmpty());
        assertEquals(1000, engine.state(2).hp());
    }

    /** 格挡盾可以归零扣血，治疗继续使用同一目标格挡盾处理前保存的初始伤害。 */
    @Test void usesInitialDamageBeforeBlockShield() {
        var unblocked = engine();
        cast(unblocked, true, false, false, true, false, false);

        var blocked = engine();
        blocked.applyBlockShield(2141401, 4, 4);
        cast(blocked, true, false, false, true, false, false);

        assertEquals(0, blocked.ordinaryResults().getLast().damage());
        assertEquals(10000, blocked.state(4).hp());
        assertEquals(unblocked.recoveries(), blocked.recoveries());
    }
}
