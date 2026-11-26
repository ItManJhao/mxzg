/**
 * 核对永恒梦境恢复的战斗监听。使用真实技能配置与独立战斗状态，覆盖原目标、死亡与复活顺序。
 */
package com.funsgamex.mxzg;

import java.util.List;
import java.util.Map;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroBattleTargetUtils;
import com.funsgamex.mxzg.hero.HeroEvolutionRules;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroDreamlandReactionRulesTest {
    /** 每项战斗型被动都必须有预检通过的完整安装和后续动作。 */
    @ParameterizedTest
    @ValueSource(ints = {101050143, 101050133, 101050184, 101050194, 103050194,
        103050204, 103050213, 103050223, 103050233, 105050073, 105050074})
    void prechecksCompleteReaction(int skillId) {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        assertTrue(HeroSkillPanelRules.usesOpeningBattlePassive(skillId));
        for (int level = 1; level <= 3; level++) {
            assertFalse(rules.openingPassiveArts(skillId, level).isEmpty(), "未接入等级 " + level);
        }
    }

    /** 主动技能经过战斗实际入口预检，包括条件、护盾和每回合后续。 */
    @ParameterizedTest
    @ValueSource(ints = {102050093, 103050203, 103050143, 103050131, 101050153, 102050143})
    void prechecksCompleteActiveSkill(int skillId) {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var skill = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(skillId, 1))).getFirst();
        assertFalse(rules.damageSkillArts(skill).isEmpty());
    }

    /** 目标数相同选更靠左的一列，并保留该列的原候选顺序。 */
    @Test
    void mostPopulatedColumnPreservesCandidateOrder() {
        var source = new HeroBattleTargetUtils.Unit(1, 1, 1, 1000, 10000, 10000);
        var enemies = List.of(new HeroBattleTargetUtils.Unit(2, 2, 8, 1, 1, 1),
            new HeroBattleTargetUtils.Unit(3, 2, 6, 1, 1, 1),
            new HeroBattleTargetUtils.Unit(4, 2, 2, 1, 1, 1),
            new HeroBattleTargetUtils.Unit(5, 2, 4, 1, 1, 1));
        var action = new HeroBattleTargetUtils.Plan(3143101, List.of(3, 4, 19), 1);
        assertEquals(List.of(enemies.get(1), enemies.get(2)),
            HeroBattleTargetUtils.select(action, source, enemies, List.of(), false));
    }

    /** 自然伤害触发反击灼烧，概率失败无实例，命中只灼烧实际攻击者。 */
    @Test
    void dragonBurnUsesOriginalAttackerAndChance() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var engine = createBattle(rules, 10105014, 1000, true);
        engine.initializePassive(2, 101050143, 1);
        engine.beginRound(1, List.of(1, 2, 3), elements, chance -> chance >= 1D);

        engine.act(1, 2, 100, elements, chance -> chance >= 1D);
        assertTrue(engine.buffs(1).isEmpty());
        engine.act(1, 2, 100, elements, chance -> chance >= 1D || chance == 0.35D);
        var burn = engine.buffs(1).getFirst();
        assertEquals(1143301, burn.spec().id());
        assertEquals(2, burn.sourceId());
        assertEquals(3, burn.expiresAt());
        assertTrue(engine.buffs(3).isEmpty());

        engine.beginRound(2, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        assertEquals(100, engine.damages().stream().filter(hit -> hit.buffId() == 1143301).findFirst().orElseThrow().incoming());
    }

    /** 莫露可受击把两回合监听留在实际攻击者，准时追加伤害并按独立概率回复自身。 */
    @Test
    void mollucoRetaliationFiresAfterTwoRounds() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var engine = createBattle(rules, 10505007, 1000, true);
        engine.initializePassive(2, 105050073, 1);
        var order = List.of(1, 2, 3);
        engine.beginRound(1, order, elements, chance -> chance >= 1D);
        engine.act(1, 2, 100, elements, chance -> chance >= 1D);
        var countdown = engine.buffs(1).getFirst();
        assertEquals(5073201, countdown.spec().id());
        assertEquals(2, countdown.sourceId());
        assertEquals(3, countdown.expiresAt());

        engine.beginRound(2, order, elements, chance -> chance >= 1D);
        assertEquals(1, engine.damages().size());
        engine.beginRound(3, order, elements, chance -> chance >= 1D || chance == 0.1D);
        assertEquals(5073301, engine.damages().getLast().buffId());
        assertEquals(1, engine.damages().getLast().targetId());
        assertEquals(5073401, engine.recoveries().getFirst().buffId());
        assertEquals(500, engine.recoveries().getFirst().base());
        assertTrue(engine.buffs(1).isEmpty());
    }

    /** 森林之主可在队友仍存活时重生一次，队伍已全灭时不会重新开启战斗。 */
    @ParameterizedTest
    @CsvSource({"1,2500", "2,3500", "3,5500"})
    void forestLordRebirthKeepsDeathOrderAndOneUse(int level, int restoredHp) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var engine = createBattle(rules, 10305023, 100_000, true);
        engine.initializePassive(2, 103050233, level);
        engine.beginRound(1, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        engine.act(1, 2, 100, elements, chance -> chance >= 1D);
        assertEquals(restoredHp, engine.state(2).hp());
        assertEquals("revival", engine.trace().stream().filter(event -> event.configId() == 3233300 + level)
            .findFirst().orElseThrow().kind());
        assertTrue(engine.buffs(2).isEmpty());
        engine.act(1, 2, 100, elements, chance -> chance >= 1D);
        assertEquals(0, engine.state(2).hp());
        assertEquals(1, engine.trace().stream().filter(event -> event.kind().equals("revival")).count());

        var lastSurvivor = createBattle(rules, 10305023, 100_000, false);
        lastSurvivor.initializePassive(2, 103050233, level);
        lastSurvivor.beginRound(1, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        lastSurvivor.act(1, 2, 100, elements, chance -> chance >= 1D);
        assertEquals(0, lastSurvivor.state(2).hp());
        assertTrue(lastSurvivor.recoveries().isEmpty());
    }

    /** 三档森林之主烈火都继承受击来源，附加概率分别为 50%、70% 和 100%。 */
    @ParameterizedTest
    @CsvSource({"1,0.50", "2,0.70", "3,1.00"})
    void forestLordBurnsOnlyTheAttacker(int level, double fireChance) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var engine = createBattle(rules, 10305023, 1000, true);
        engine.initializePassive(2, 103050234, level);
        engine.beginRound(1, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        assertEquals(fireChance, rules.attackDamageOverTime(3234200 + level).chance());

        engine.act(1, 2, 100, elements, chance -> chance >= fireChance);

        var burn = engine.buffs(1).getFirst();
        assertEquals(3234200 + level, burn.spec().id());
        assertEquals(2, burn.sourceId());
        assertTrue(engine.buffs(3).isEmpty());
        engine.beginRound(2, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        var wound = engine.damages().getLast();
        assertEquals(700, wound.incoming());
        assertEquals(1, wound.targetId());
    }

    /** 光环来源死亡时撤回同阵营队友身上的监听，保留其他来源的同配置监听。 */
    @Test
    void haloOwnerDeathRemovesOnlyItsOwnAllyBuffs() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var ordinary = new HeroEvolutionRules.Skill(103050180, 0);
        var halo = new HeroEvolutionRules.Skill(103050204, 1);
        var schedule = rules.battleSchedule(List.of(ordinary, halo));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, rules.battleSchedule(List.of(ordinary))), 1, 1, 10000, 10000, 100000, 0, 0, 0),
            new State(new Actor(2, schedule), 2, 1, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(3, List.of()), 2, 8, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(4, schedule), 2, 7, 10000, 10000, 1000, 0, 0, 0)));
        engine.bindCombatData(1, 10305018, Map.of(220, 100000L, 150, 500L));
        engine.bindCombatData(2, 10305020, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(3, 10305018, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(4, 10305020, Map.of(220, 1000L, 150, 500L));
        engine.initializePassive(2, halo.skillId(), 1);
        engine.initializePassive(4, halo.skillId(), 1);
        assertEquals(List.of(2, 4), engine.buffs(3).stream().map(entry -> entry.sourceId()).toList());

        engine.beginRound(1, List.of(1, 2, 3, 4), elements, chance -> chance >= 1D);
        engine.act(1, 2, 100, elements, chance -> chance >= 1D);
        assertEquals(0, engine.state(2).hp());
        assertEquals(List.of(4), engine.buffs(3).stream().map(entry -> entry.sourceId()).toList());
    }

    /** 萝莫拉的团队守护反弹实际攻击的一成且不递归反弹，来源为受击者。 */
    @Test
    void flameShieldReflectsOriginalDamageToAttacker() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var engine = createSupportBattle(rules, 10305020, 103050203, 10000);
        engine.beginRound(2, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        engine.act(2, 1, 100, elements, chance -> chance >= 1D);
        assertTrue(engine.buffs(3).stream().anyMatch(entry -> entry.spec().id() == 3203201));
        engine.act(1, 2, 100, elements, chance -> chance >= 1D);
        var records = engine.damages();
        assertEquals(2, records.size());
        assertEquals(2, records.getLast().sourceId());
        assertEquals(1, records.getLast().targetId());
        assertEquals(records.getFirst().incoming() / 10, records.getLast().incoming());
    }

    /** 乃音三档治疗分别保留该档护盾和后续治疗，一级零概率治疗不会补发。 */
    @ParameterizedTest
    @CsvSource({"1,900,0", "2,1080,150", "3,1300,250"})
    void overflowHealingSplitsBeforeTreatmentAndKeepsShield(int level, int amount, int periodic) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var engine = createSupportBattle(rules, 10205014, 102050143, level, 9500);
        engine.beginRound(2, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        engine.act(2, 1, 100, elements, chance -> chance >= 1D);
        assertEquals(10000, engine.state(2).hp());
        assertEquals(500, engine.recoveries().getFirst().base());
        int shieldId = 2143600 + level;
        assertEquals(amount - 500, engine.buffs(2).stream().filter(entry -> entry.spec().id() == shieldId)
            .findFirst().orElseThrow().value());
        assertEquals(amount, engine.buffs(3).stream().filter(entry -> entry.spec().id() == shieldId)
            .findFirst().orElseThrow().value());

        engine.beginRound(3, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        if (periodic == 0) {
            assertEquals(1, engine.recoveries().size());
        } else {
            assertTrue(engine.recoveries().stream().anyMatch(recovery ->
                recovery.buffId() == 2143500 + level && recovery.base() == periodic));
        }
    }

    /** 混乱按原概率限制为普攻，候选覆盖双方与自身；绝对到期后按原敌方目标出招。 */
    @ParameterizedTest
    @CsvSource({"2,0.20,0,1", "2,0.20,1,2", "3,0.25,2,3"})
    void confusionSelectsOneLivingUnit(int level, double probability, int index, int expectedTarget) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var active = new HeroEvolutionRules.Skill(101050203, 1);
        var ordinary = new HeroEvolutionRules.Skill(101050200, 0);
        var hero = new Actor(1, rules.battleSchedule(List.of(ordinary, active)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(hero, 1, 2, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of()), 1, 3, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(3, List.of()), 2, 2, 10000, 10000, 1000, 0, 0, 0)),
            new HeroBattleHealingExecutor.RandomDecision() {
                /** 保证和配置相同的技能重选次数下，普通伤害命中条件稳定。 */
                @Override public boolean hit(int configuredRate) { return configuredRate > 0; }
                /** 选择配置索引对应的存活目标，独立的较小候选集合使用末位。 */
                @Override public int index(int bound) { return Math.min(index, bound - 1); }
            });
        for (int id : List.of(1, 2, 3)) {
            engine.bindCombatData(id, 10105020, Map.of(220, 1000L, 150, 500L));
        }
        var order = List.of(1, 2, 3);
        int buffId = 3143400 + level;
        engine.beginRound(2, order, elements, chance -> chance >= 1D);
        engine.applySimpleControl(buffId, 3, 1, chance -> chance > probability);
        assertTrue(engine.buffs(1).isEmpty());
        engine.applySimpleControl(buffId, 3, 1, chance -> chance == probability);
        assertTrue(hero.hasControl(1011));

        engine.act(1, 3, 100, elements, chance -> chance >= 1D);

        var hit = engine.damages().getFirst();
        assertEquals(expectedTarget, hit.targetId());
        assertTrue(engine.trace().stream().anyMatch(event -> event.kind().equals("skill.begin")
            && event.configId() == ordinary.skillId()));
        engine.expireAt(4);
        assertFalse(hero.hasControl(1011));
    }

    /** 创建支援英雄与队友测试战场，使用入场第二回合发动的真实主动技能。 */
    private HeroBattleHealingExecutor createSupportBattle(HeroSkillPanelRules rules, int template, int skillId, long hp) {
        return createSupportBattle(rules, template, skillId, 1, hp);
    }

    /** 创建指定技能等级的独立战场，使队友有完整血量可观察溢出治疗和护盾。 */
    private HeroBattleHealingExecutor createSupportBattle(HeroSkillPanelRules rules, int template, int skillId,
            int level, long hp) {
        var ordinary = new HeroEvolutionRules.Skill(103050180, 0);
        var support = new HeroEvolutionRules.Skill(skillId, level);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, rules.battleSchedule(List.of(ordinary))), 1, 1, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, rules.battleSchedule(List.of(ordinary, support))), 2, 1, hp, 10000, 1000, 0, 0, 0),
            new State(new Actor(3, List.of()), 2, 8, 10000, 10000, 1000, 0, 0, 0)));
        engine.bindCombatData(1, 10305018, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, template, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(3, 10305018, Map.of(220, 1000L, 150, 500L));
        return engine;
    }

    /** 创建使用原普攻的独立三单位战斗，第三个单位可充当被攻击方的存活队友。 */
    private HeroBattleHealingExecutor createBattle(HeroSkillPanelRules rules, int defenderTemplate,
            long attackerDamage, boolean allySurvives) {
        var schedule = rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(103050180, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, schedule), 1, 1, 10000, 10000, attackerDamage, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 1, 10000, 10000, 1000, 0, 0, 0),
            new State(new Actor(3, List.of()), allySurvives ? 2 : 1, 8, 10000, 10000, 1000, 0, 0, 0)));
        engine.bindCombatData(1, 10305018, Map.of(220, attackerDamage, 150, 500L));
        engine.bindCombatData(2, defenderTemplate, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(3, 10305018, Map.of(220, 1000L, 150, 500L));
        return engine;
    }
}
