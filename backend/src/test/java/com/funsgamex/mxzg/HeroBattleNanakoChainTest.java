/** 奈奈子真实降攻子链、职业筛选与到期控制的独立战场测试，不连接玩家库。 */
package com.funsgamex.mxzg;

import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleNanakoChainTest {
    /** 使用真实主动排期与两种职业目标；高生命仅用于防止验收过程中提前死亡。 */
    private HeroBattleHealingExecutor engine() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var ordinary = rules.battleSchedule(rules.select(10104004, 4, 0)).stream()
            .filter(v -> v.activeType() == 2).findFirst().orElseThrow();
        var skills = List.of(new HeroBattleSkillUtils.Skill(102050233, 1, 1, 2, 3, false, false), ordinary);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, skills), 1, 1, 10000, 10000, 100, 0, 0, 0),
            new State(new Actor(2, List.of(ordinary)), 2, 1, 10000, 10000, 100, 0, 0, 0),
            new State(new Actor(3, List.of(ordinary)), 2, 2, 10000, 10000, 100, 0, 0, 0)));
        var attributes = new HeroBattleChapterScenario(new ObjectMapper()).initial().getFirst().attributes();
        engine.bindCombatData(1, 10205023, attributes);
        engine.bindCombatData(2, 10103003, attributes);
        engine.bindCombatData(3, 10101001, attributes);
        engine.initializePassive(1, 102050234, 1);
        engine.expireAt(2);
        return engine;
    }

    /** 降攻命中两个职业，额外伤害只打职业1；到期后冰冻并触发207自身加成。 */
    @Test void debuffJobGateAndExpiryFreeze() {
        var engine = engine();
        var elements = new HeroBattleElementRules(new ObjectMapper());
        engine.act(1, 2, 100, elements, rate -> rate > 0);
        for (int id : List.of(2, 3)) assertTrue(engine.buffs(id).stream().anyMatch(v -> v.spec().id() == 2233301));
        assertTrue(engine.trace().stream().anyMatch(v -> v.configId() == 2233501 && v.targetId() == 2));
        assertFalse(engine.trace().stream().anyMatch(v -> v.configId() == 2233501 && v.targetId() == 3));
        engine.beginRound(4, List.of(1, 2, 3), elements, rate -> rate > 0);
        for (int id : List.of(2, 3)) {
            assertFalse(engine.buffs(id).stream().anyMatch(v -> v.spec().id() == 2233301));
            assertTrue(engine.buffs(id).stream().anyMatch(v -> v.spec().id() == 2234801));
        }
        assertTrue(engine.buffs(1).stream().anyMatch(v -> v.spec().id() == 2234301));
    }

    /** 降攻自身未命中时不进入职业子动作，也不留下供到期触发的属性实例。 */
    @Test void missedDebuffDoesNotRunChildren() {
        var engine = engine();
        engine.act(1, 2, 100, new HeroBattleElementRules(new ObjectMapper()), rate -> rate == 1D);
        assertFalse(engine.buffs(2).stream().anyMatch(v -> v.spec().id() == 2233301));
        assertFalse(engine.trace().stream().anyMatch(v -> v.configId() == 2233501));
    }
    /** 主伤害闪避仍保留子动作目标，降攻独立命中；不误按伤害结果过滤。 */
    @Test void damageMissStillAllowsDebuff() {
        var engine = engine();
        engine.setOnceAttribute(2, 227, 10000);
        engine.setOnceAttribute(1, 226, 0);
        engine.act(1, 2, 100, new HeroBattleElementRules(new ObjectMapper()), rate -> rate > 0);
        assertTrue(engine.ordinaryResults().getFirst().missed());
        assertTrue(engine.buffs(2).stream().anyMatch(v -> v.spec().id() == 2233301));
    }

    /** 到期冰冻概率调用失败时恢复原降攻和回合，重试后仍能完成控制链。 */
    @Test void expiryFailureRollsBackAndCanRetry() {
        var engine = engine();
        var elements = new HeroBattleElementRules(new ObjectMapper());
        engine.act(1, 2, 100, elements, rate -> rate > 0);
        var before = engine.buffs(2);
        int traceSize = engine.trace().size();
        assertThrows(IllegalStateException.class, () -> engine.beginRound(4, List.of(1, 2, 3), elements,
            rate -> { throw new IllegalStateException("独立到期故障注入"); }));
        assertEquals(before, engine.buffs(2));
        assertEquals(traceSize, engine.trace().size());
        assertFalse(engine.state(2).actor().hasControl(1004));
        engine.beginRound(4, List.of(1, 2, 3), elements, rate -> rate > 0);
        assertTrue(engine.state(2).actor().hasControl(1004));
    }

    /** 使用奈奈子本人的普攻和一技能，核实降护甲先于伤害，且到期移除；不借用其他英雄动作。 */
    @Test void firstSkillLowersArmorBeforeDamage() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var normal = new HeroBattleSkillUtils.Skill(102050230, 0, 2, 0, 0, false, false);
        var active = new HeroBattleSkillUtils.Skill(102050231, 1, 1, 1, 3, false, false);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, List.of(active, normal)), 1, 1, 10000, 10000, 100, 0, 0, 0),
            new State(new Actor(2, List.of(normal)), 2, 1, 10000, 10000, 100, 0, 0, 0)));
        var attributes = new HeroBattleChapterScenario(new ObjectMapper()).initial().getFirst().attributes();
        engine.bindCombatData(1, 10205023, attributes);
        engine.bindCombatData(2, 10101001, attributes);
        var elements = new HeroBattleElementRules(new ObjectMapper());
        engine.beginRound(1, List.of(1, 2), elements, rate -> rate > 0);
        engine.act(1, 2, 100, elements, rate -> rate > 0);
        var trace = engine.trace();
        int armorIndex = -1;
        int damageIndex = -1;
        for (int i = 0; i < trace.size(); i++) {
            if (trace.get(i).configId() == 2231201) armorIndex = i;
            if (trace.get(i).configId() == 2231301) damageIndex = i;
        }
        assertTrue(armorIndex >= 0 && damageIndex > armorIndex);
        assertTrue(engine.state(2).hp() < 10000);
        assertTrue(engine.buffs(2).stream().anyMatch(v -> v.spec().id() == 2231201));
        assertFalse(trace.stream().anyMatch(v -> v.configId() == 2231501));
        engine.beginRound(3, List.of(1, 2), elements, rate -> rate > 0);
        assertFalse(engine.buffs(2).stream().anyMatch(v -> v.spec().id() == 2231201));
    }

    /** 完整一技能三级均能预检，暴击追加沿真实1301动作执行。 */
    @Test void thirdLevelCriticalFollowupIsSupported() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        assertDoesNotThrow(() -> rules.damageSkillArts(
            new HeroBattleSkillUtils.Skill(102050231, 2, 1, 1, 3, false, false)));
        assertDoesNotThrow(() -> rules.damageSkillArts(
            new HeroBattleSkillUtils.Skill(102050231, 3, 1, 1, 3, false, false)));
    }

    /** 暴击追加一次本人的普攻；未暴击不追加，不能把条件动作当成固定额外伤害。 */
    @Test void criticalQueuesOwnGeneralAttackOnlyOnCritical() {
        for (boolean critical : List.of(false, true)) {
            var mapper = new ObjectMapper();
            var rules = new HeroSkillPanelRules(mapper);
            var normal = new HeroBattleSkillUtils.Skill(102050230, 0, 2, 0, 0, false, false);
            var active = new HeroBattleSkillUtils.Skill(102050231, 3, 1, 1, 3, false, false);
            var engine = new HeroBattleHealingExecutor(rules, List.of(
                new State(new Actor(1, List.of(active, normal)), 1, 1, 10000, 10000, 100, 0, 0, 0),
                new State(new Actor(2, List.of(normal)), 2, 1, 10000, 10000, 100, 0, 0, 0)));
            var attributes = new HeroBattleChapterScenario(mapper).initial().getFirst().attributes();
            engine.bindCombatData(1, 10205023, attributes);
            engine.bindCombatData(2, 10101001, attributes);
            engine.setOnceAttribute(1, 207, critical ? 10000 : 0);
            var elements = new HeroBattleElementRules(mapper);
            engine.beginRound(1, List.of(1, 2), elements, rate -> rate >= 1);
            engine.act(1, 2, 100, elements, rate -> rate >= 1);
            assertEquals(critical, engine.ordinaryResults().getFirst().critical());
            long ordinaryStarts = engine.trace().stream().filter(v ->
                v.kind().equals("skill.begin") && v.configId() == 102050230).count();
            assertEquals(critical ? 1L : 0L, ordinaryStarts);
        }
    }

    /** 三单位边界夹具：单位3攻击最高，生命可设为1验证致死分支；非真实玩家属性。 */
    private HeroBattleHealingExecutor criticalBoundaryEngine(long strongestHp) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var normal = new HeroBattleSkillUtils.Skill(102050230, 0, 2, 0, 0, false, false);
        var active = new HeroBattleSkillUtils.Skill(102050231, 3, 1, 1, 3, false, false);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, List.of(active, normal)), 1, 1, 10000, 10000, 100, 0, 0, 0),
            new State(new Actor(2, List.of(normal)), 2, 1, 10000, 10000, 100, 0, 0, 0),
            new State(new Actor(3, List.of(normal)), 2, 2, strongestHp, strongestHp, 200, 0, 0, 0)));
        var attributes = new HeroBattleChapterScenario(mapper).initial().getFirst().attributes();
        engine.bindCombatData(1, 10205023, attributes);
        engine.bindCombatData(2, 10101001, attributes);
        engine.bindCombatData(3, 10101001, attributes);
        engine.setOnceAttribute(1, 207, 10000);
        engine.beginRound(1, List.of(1, 2, 3), new HeroBattleElementRules(mapper), rate -> rate >= 1);
        return engine;
    }

    /** 根上下文传单位2，但真实技能及追加动作应打攻击最高的单位3。 */
    @Test void criticalFollowupUsesConfiguredTargetInsteadOfRootContext() {
        var engine = criticalBoundaryEngine(10000);
        engine.act(1, 2, 100, new HeroBattleElementRules(new ObjectMapper()), rate -> rate >= 1);
        var followups = engine.trace().stream().filter(v ->
            v.kind().equals("skill.begin") && v.configId() == 102050230).toList();
        assertEquals(1, followups.size());
        assertEquals(3, followups.getFirst().targetId());
        assertEquals(10000, engine.state(2).hp());
        assertTrue(engine.state(3).hp() < 10000);
    }

    /** 主技能暴击杀死目标后不再进入条件子链，也不转打剩余弱目标。 */
    @Test void lethalCriticalDoesNotQueueFollowup() {
        var engine = criticalBoundaryEngine(1);
        engine.act(1, 2, 100, new HeroBattleElementRules(new ObjectMapper()), rate -> rate >= 1);
        assertTrue(engine.ordinaryResults().getFirst().critical());
        assertEquals(0, engine.state(3).hp());
        assertEquals(10000, engine.state(2).hp());
        assertFalse(engine.trace().stream().anyMatch(v ->
            v.kind().equals("skill.begin") && v.configId() == 102050230));
    }

    /** 在追加普攻计算时注入故障，主技能伤害、护甲变化、一次性暴击与排队状态一并回滚。 */
    @Test void followupFailureRollsBackWholeSkillAndRetryMatchesCleanRun() {
        var engine = criticalBoundaryEngine(10000);
        var elements = new HeroBattleElementRules(new ObjectMapper());
        var traceBefore = engine.trace();
        assertThrows(IllegalStateException.class, () -> engine.act(1, 2, 100, elements, rate -> {
            if (!engine.ordinaryResults().isEmpty()) {
                throw new IllegalStateException("独立追加动作故障注入");
            }
            return rate >= 1;
        }));
        assertEquals(10000, engine.state(3).hp());
        assertTrue(engine.buffs(3).isEmpty());
        assertTrue(engine.ordinaryResults().isEmpty());
        assertEquals(traceBefore, engine.trace());
        engine.act(1, 2, 100, elements, rate -> rate >= 1);
        var clean = criticalBoundaryEngine(10000);
        clean.act(1, 2, 100, elements, rate -> rate >= 1);
        assertEquals(clean.state(3).hp(), engine.state(3).hp());
        assertEquals(clean.ordinaryResults(), engine.ordinaryResults());
        assertEquals(clean.trace(), engine.trace());
    }

}
