/**
 * 核对主线新守军的入场站位与实际触发子动作，使用真实技能表和独立战斗状态。
 * 固定命中仅用于覆盖因果和选人边界，不接触玩家库。
 */
package com.funsgamex.mxzg;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.DoublePredicate;

import com.funsgamex.mxzg.hero.HeroBattleAttributeUtils;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario;
import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroBattleReplayUtils;
import com.funsgamex.mxzg.hero.HeroEvolutionRules;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleOpeningPassiveTest {
    /** 相同单位分别站在第2格和第3格，第3格才获得暴击；负生命倍率不重算已初始化生命。 */
    @Test
    void openingPositionKeepsFrozenHpAndAddsCriticalOnlyToMatchingSeat() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var attacks = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(103040050, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, attacks), 1, 2, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, attacks), 1, 3, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(3, List.of()), 2, 2, 10000, 10000, 0, 0, 0, 0)));
        engine.bindCombatData(1, 10304005, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10304005, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(3, 10304005, Map.of(150, 500L));
        engine.initializePassive(1, 103040052, 1);
        engine.initializePassive(2, 103040052, 1);

        assertTrue(engine.buffs(1).isEmpty());
        assertEquals(List.of(3052201, 3052401), engine.buffs(2).stream().map(entry -> entry.spec().id()).toList());
        assertEquals(10000, engine.state(2).hp());
        assertEquals(10000, engine.state(2).maxHp());

        var probabilities = new ArrayList<Double>();
        DoublePredicate decision = chance -> {
            probabilities.add(chance);
            return chance >= 1D;
        };
        var elements = new HeroBattleElementRules(mapper);
        engine.beginRound(1, List.of(1, 2, 3), elements, decision);
        engine.act(1, 3, 100, elements, decision);
        assertFalse(probabilities.contains(0.3D));
        probabilities.clear();
        engine.act(2, 3, 100, elements, decision);
        assertTrue(probabilities.contains(0.3D));
    }

    /** 安妮雅的普攻命中后，仅在旧50%判定成功时治疗最低生命比例队友。 */
    @Test
    void ordinaryDamageCanHealLowestAllyAtConfiguredChance() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var attacks = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(101050060, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, attacks), 1, 2, 5000, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of()), 1, 3, 2000, 10000, 0, 0, 0, 0),
            new State(new Actor(3, List.of()), 2, 2, 10000, 10000, 0, 0, 0, 0)));
        engine.bindCombatData(1, 10105006, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10105006, Map.of(150, 500L));
        engine.bindCombatData(3, 10105006, Map.of(150, 500L));
        engine.initializePassive(1, 101050062, 1);

        var elements = new HeroBattleElementRules(mapper);
        engine.beginRound(1, List.of(1, 2, 3), elements, chance -> true);
        engine.act(1, 3, 100, elements, chance -> chance > 0.5D);
        assertTrue(engine.recoveries().isEmpty());
        engine.act(1, 3, 100, elements, chance -> chance >= 0.5D);
        var recovery = engine.recoveries().getFirst();
        assertEquals(1062201, recovery.buffId());
        assertEquals(2, recovery.targetId());
        assertEquals(900, recovery.actual());
        assertEquals(2900, engine.state(2).hp());
    }

    /** 格伦主动增加速度后改变下一回合顺序，到期后复原，回放校验接受同一份实际顺序。 */
    @Test
    void attackSpeedBuffReordersAndExpiresInBattleAndReplay() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var slow = Map.of(101, 90L, 220, 100L, 223, 10000L, 150, 500L);
        var fast = Map.of(101, 100L, 220, 100L, 223, 10000L, 150, 500L);
        var basic = new HeroEvolutionRules.Skill(102050080, 0);
        var active = new HeroEvolutionRules.Skill(102050081, 1);
        var attacker = new HeroBattleChapterScenario.Unit(1, 1, 10205008, 50, 5, 0, 2,
            slow, HeroBattleAttributeUtils.opening(slow), rules.battleSchedule(List.of(basic, active)));
        var defender = new HeroBattleChapterScenario.Unit(2, 2, 10205008, 50, 5, 0, 2,
            fast, HeroBattleAttributeUtils.opening(fast), rules.battleSchedule(List.of(basic)));

        var report = new HeroBattleChapterScenario(mapper).runIndependentDuel(List.of(attacker, defender), chance -> true);
        var firstMoves = report.turns().stream().filter(turn -> turn.round() <= 4)
            .map(HeroBattleChapterScenario.Turn::sourceId).toList();
        assertEquals(List.of(2, 1, 1, 2, 1, 2, 2, 1), firstMoves);
        assertTrue(report.frames().stream().flatMap(frame -> frame.trace().stream())
            .anyMatch(trace -> trace.configId() == 2081501 && trace.speedDelta() == 15));
        assertTrue(report.frames().stream().flatMap(frame -> frame.trace().stream())
            .anyMatch(trace -> trace.configId() == 2081501 && trace.speedDelta() == -15));
        HeroBattleReplayUtils.validate(report);
    }
}
