/**
 * 核对主线新守军的入场站位与实际触发子动作，使用真实技能表和独立战斗状态。
 * 固定命中仅用于覆盖因果和选人边界，不接触玩家库。
 */
package com.funsgamex.mxzg;

import java.util.ArrayList;
import java.util.HashMap;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
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

    /** 安妮雅一、三级均在旧50%判定成功时治疗最低生命比例队友，治疗量按原等级变化。 */
    @ParameterizedTest
    @CsvSource({"1, 1062201, 900", "3, 1062203, 1200"})
    void ordinaryDamageCanHealLowestAllyAtConfiguredChance(int level, int healingBuff, long amount) {
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
        engine.initializePassive(1, 101050062, level);

        var elements = new HeroBattleElementRules(mapper);
        engine.beginRound(1, List.of(1, 2, 3), elements, chance -> true);
        engine.act(1, 3, 100, elements, chance -> chance > 0.5D);
        assertTrue(engine.recoveries().isEmpty());
        engine.act(1, 3, 100, elements, chance -> chance >= 0.5D);
        var recovery = engine.recoveries().getFirst();
        assertEquals(healingBuff, recovery.buffId());
        assertEquals(2, recovery.targetId());
        assertEquals(amount, recovery.actual());
        assertEquals(2000 + amount, engine.state(2).hp());
    }

    /** 寒冰战姬普攻对原目标安装两回合标记，伤害按实际回合开始时间处理。 */
    @Test
    void thirdLevelIcePassiveTicksTwiceAgainstTheOriginalTarget() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var skills = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(102050070, 0)));
        var order = List.of(1, 2);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, skills), 1, 2, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 2, 10000, 10000, 0, 0, 0, 0)));
        engine.bindCombatData(1, 10205007, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10205007, Map.of(150, 500L));
        engine.initializePassive(1, 102050072, 3);
        assertThrows(IllegalArgumentException.class, () -> rules.openingPassiveArts(105040032, 3));

        engine.beginRound(1, order, elements, chance -> true);
        engine.act(1, 2, 100, elements, chance -> true);
        assertEquals(3, engine.buffs(2).stream().filter(entry -> entry.spec().id() == 2072203)
            .findFirst().orElseThrow().expiresAt());
        for (int round = 2; round <= 4; round++) {
            engine.beginRound(round, order, elements, chance -> true);
        }

        assertEquals(10000, rules.battleOrdinaryDamageRate(2072303));
        assertEquals(List.of(2, 3), engine.trace().stream()
            .filter(event -> event.kind().equals("damage") && event.configId() == 2072303
                && event.sourceId() == 1 && event.targetId() == 2)
            .map(HeroBattleHealingExecutor.Trace::round).toList());
        assertTrue(engine.buffs(2).isEmpty());
    }

    /** 唤潮剑姬的普攻和主动伤害都给目标施加同一三级降攻，挂满三回合后独立到期。 */
    @Test
    void thirdLevelTidePassiveReducesAttackAfterBothKindsOfDamage() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var skills = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(102040130, 0),
            new HeroEvolutionRules.Skill(102040131, 1)));
        var order = List.of(1, 2);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, skills), 1, 2, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 2, 10000, 10000, 0, 0, 0, 0)));
        engine.bindCombatData(1, 10204013, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10204013, Map.of(150, 500L));
        engine.initializePassive(1, 102040132, 3);

        for (int round = 1; round <= 2; round++) {
            engine.beginRound(round, order, elements, chance -> true);
            engine.act(1, 2, 100, elements, chance -> true);
        }

        assertEquals(List.of(102040131, 102040130), engine.trace().stream()
            .filter(event -> event.kind().equals("skill.begin")).map(HeroBattleHealingExecutor.Trace::configId).toList());
        var effect = rules.controlAttribute(2132303);
        assertEquals(201, effect.attribute());
        assertEquals(-900, effect.amount());
        assertEquals(List.of(4, 5), engine.buffs(2).stream().filter(entry -> entry.spec().id() == 2132303)
            .map(entry -> entry.expiresAt()).toList());
        engine.expireAt(4);
        assertEquals(List.of(5), engine.buffs(2).stream().filter(entry -> entry.spec().id() == 2132303)
            .map(entry -> entry.expiresAt()).toList());
        engine.expireAt(5);
        assertTrue(engine.buffs(2).stream().noneMatch(entry -> entry.spec().id() == 2132303));
    }

    /** 伊芙普攻使敌方中毒并提高自身护甲，森镜受伤时按自己攻击向攻击者施加中毒。 */
    @Test
    void thirdLevelPoisonPassivesKeepTheirOwnCarrierAndAttackSource() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var skills = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(103050090, 0)));
        var forestAttributes = new HashMap<>(Map.of(101, 100L, 220, 1000L, 150, 500L));
        rules.contribute(10305008, 8, 1, (id, value) -> forestAttributes.merge(id, value, Long::sum));
        assertEquals(Map.of(101, 115L, 102, 4000L, 150, 500L, 201, 2000L, 220, 1000L), forestAttributes);
        var order = List.of(1, 2);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, skills), 1, 2, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 2, 10000, 10000, 1200, 0, 0, 0)));
        engine.bindCombatData(1, 10305009, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10305008, forestAttributes);
        engine.initializePassive(1, 103050092, 3);
        engine.initializePassive(2, 103050082, 3);
        assertEquals(List.of(3082403), engine.buffs(2).stream().map(entry -> entry.spec().id()).toList());

        engine.beginRound(1, order, elements, chance -> true);
        engine.act(1, 2, 100, elements, chance -> chance > 0.8D);
        assertFalse(engine.buffs(1).stream().anyMatch(entry -> entry.spec().id() == 3082503));
        engine.act(1, 2, 100, elements, chance -> chance >= 0.8D);
        assertTrue(engine.buffs(1).stream().anyMatch(entry -> entry.spec().id() == 3082503
            && entry.sourceId() == 2 && entry.expiresAt() == 3));
        assertTrue(engine.buffs(1).stream().anyMatch(entry -> entry.spec().id() == 3092303
            && entry.sourceId() == 1 && entry.expiresAt() == 5));
        assertTrue(engine.buffs(2).stream().anyMatch(entry -> entry.spec().id() == 3092203
            && entry.sourceId() == 1 && entry.expiresAt() == 5));
        assertEquals(1000, rules.controlAttribute(3092303).amount());

        long eveHp = engine.state(1).hp();
        long forestHp = engine.state(2).hp();
        engine.beginRound(2, order, elements, chance -> true);
        assertEquals(eveHp - 240, engine.state(1).hp());
        assertEquals(forestHp - 150, engine.state(2).hp());
    }

    /** 七项新入场被动按各自等级得到准确监听或普攻替换，后续等级仍由预检拒绝。 */
    @ParameterizedTest
    @CsvSource({"101050063, 1063103", "101050093, 1093103", "103050063, 3063103", "103050113, 3113103",
        "102050063, 2063103", "102050083, 2083103", "102050153, 2153103"})
    void thirdLevelPassivesOpenWithTheirOwnLegacyBuff(int skill, int buff) {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        assertEquals(List.of(buff), rules.openingPassiveArts(skill, 3).stream()
            .flatMap(art -> art.buffs().stream()).toList());
        assertThrows(IllegalArgumentException.class, () -> rules.openingPassiveArts(skill, 4));
    }

    /** 安妮雅受击仍按自己当时的攻击自疗，使用三级90%倍率，并消费原一次性攻击覆盖。 */
    @Test
    void thirdLevelFireShieldRestoresNinetyPercentOfCurrentAttack() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var attacks = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(101050060, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, attacks), 1, 2, 5000, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 2, 5000, 10000, 1000, 0, 0, 0)));
        engine.bindCombatData(1, 10105006, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10105006, Map.of(220, 1000L, 150, 500L));
        engine.initializePassive(2, 101050063, 3);
        assertTrue(engine.recoveries().isEmpty());

        engine.beginRound(1, List.of(1, 2), elements, chance -> true);
        engine.setOnceAttribute(2, 220, 1500L);
        engine.act(1, 2, 100, elements, chance -> true);

        assertEquals(List.of(new HeroBattleHealingExecutor.Recovery(1063203, 2, 2, 1350, 1350, 1350)),
            engine.recoveries());
        assertTrue(engine.onceAttributes(2).isEmpty());
    }

    /** 海神祭司只在普攻伤害后以原50%对敌沉默，凯萨丁在普攻动作后以原40%恢复自身生命。 */
    @Test
    void thirdLevelSilenceAndSandHealingUseDifferentEventsAndTargets() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var prophet = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(102050060, 0)));
        var sand = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(102050150, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, prophet), 1, 2, 5000, 20000, 1000, 0, 0, 0),
            new State(new Actor(2, sand), 1, 3, 5000, 20000, 1000, 0, 0, 0),
            new State(new Actor(3, List.of()), 2, 2, 20000, 20000, 1000, 0, 0, 0)));
        engine.bindCombatData(1, 10205006, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10205015, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(3, 10205006, Map.of(150, 500L));
        engine.initializePassive(1, 102050063, 3);
        engine.initializePassive(2, 102050153, 3);
        engine.beginRound(1, List.of(1, 2, 3), elements, chance -> true);

        engine.act(1, 3, 100, elements, chance -> chance > 0.5D);
        engine.act(2, 3, 100, elements, chance -> chance > 0.4D);
        assertTrue(engine.buffs(3).isEmpty());
        assertTrue(engine.recoveries().isEmpty());

        engine.act(1, 3, 100, elements, chance -> chance >= 0.5D);
        engine.act(2, 3, 100, elements, chance -> chance >= 0.4D);
        var silence = engine.buffs(3).getFirst();
        assertEquals(2063203, silence.spec().id());
        assertEquals(3, silence.expiresAt());
        assertEquals(List.of(new HeroBattleHealingExecutor.Recovery(2153303, 2, 2, 1100, 1100, 1100)),
            engine.recoveries());
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
