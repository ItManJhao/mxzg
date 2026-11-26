/** 用真实技能配置验证永恒梦境守军的主动状态、属性移除和概率分支。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroBattleSkillUtils;
import com.funsgamex.mxzg.hero.HeroEvolutionRules.Skill;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class HeroDreamlandStatusRulesTest {
    /** 每例独立加载原配置；伤害元素和技能解析共享同一份表数据。 */
    private final ObjectMapper mapper = new ObjectMapper();
    /** 使用生产技能选择和效果预检。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(mapper);
    /** 沿用生产元素和伤害计算，概率由各例控制。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(mapper);

    /** 原三个等级在回合首用实时血量选择暴击或攻击；30% 整数边界属于暴击分支。 */
    @Test
    void astrologerUsesTheExactThirtyPercentBoundaryAtRoundStart() {
        for (int level = 1; level <= 3; level++) {
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    new State(new Actor(1, List.of()), 1, 1, 2999, 10000, 100, 0, 0, 0),
                    new State(new Actor(2, List.of()), 1, 2, 3000, 10000, 100, 0, 0, 0),
                    new State(new Actor(3, List.of()), 2, 1, 10000, 10000, 100, 0, 0, 0)));
            battle.bindCombatData(1, 10205021, Map.of(220, 100L));
            battle.bindCombatData(2, 10205021, Map.of(220, 100L));
            battle.bindCombatData(3, 10105020, Map.of(220, 100L));
            battle.initializePassive(1, 102050214, level);
            battle.initializePassive(2, 102050214, level);
            assertEquals(List.of(2214100 + level), battle.buffs(1).stream().map(entry -> entry.spec().id()).toList());
            assertEquals(level * 1000L, rules.controlAttribute(2214500 + level).amount());
            assertEquals(500L + level * 500L, rules.controlAttribute(2214400 + level).amount());
            var order = List.of(1, 2, 3);
            for (int round = 1; round <= 2; round++) {
                battle.beginRound(round, order, elements, chance -> chance >= 1D);
                assertEquals(List.of(2214100 + level, 2214500 + level),
                        battle.buffs(1).stream().map(entry -> entry.spec().id()).toList());
                assertEquals(List.of(2214100 + level, 2214400 + level),
                        battle.buffs(2).stream().map(entry -> entry.spec().id()).toList());
                assertTrue(battle.buffs(3).isEmpty());
            }
            battle.expireAt(3);
            assertEquals(1, battle.buffs(1).size());
            assertEquals(1, battle.buffs(2).size());
        }
    }

    /** 兔兔三档沿用原驱散率；三级按施法者当前生命附伤，并受自身攻击的 350% 上限约束。 */
    @Test
    void rabbitDispelKeepsEachLevelProbabilityAndExtraDamage() {
        assertRabbitDispel(1, 0.5D, 0);
        assertRabbitDispel(2, 0.6D, 0);
        assertRabbitDispel(3, 0.6D, 350);
    }

    /** 先给敌方施加可驱散速度增益，再以同一个根动作分别覆盖概率失败和成功。 */
    private void assertRabbitDispel(int level, double dispelChance, long expectedDamage) {
        var battle = new HeroBattleHealingExecutor(rules, List.of(
                fighter(1, 1, 104050100, 104050103, level),
                fighter(2, 2, 101050200, 101050203),
                new State(new Actor(3, List.of()), 2, 2, 10000, 10000, 100, 0, 0, 0)));
        battle.bindCombatData(1, 10405010, Map.of(220, 100L, 150, 500L));
        battle.bindCombatData(2, 10105020, Map.of(220, 100L, 150, 500L));
        battle.bindCombatData(3, 10105020, Map.of(220, 100L, 150, 500L));
        battle.beginRound(2, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        battle.act(2, 1, 100, elements, chance -> chance >= 1D || chance == 0.6D);
        assertTrue(battle.buffs(3).stream().anyMatch(entry -> entry.spec().id() == 1203301));
        battle.act(1, 2, 100, elements, chance -> chance >= 1D);
        assertTrue(battle.buffs(3).stream().anyMatch(entry -> entry.spec().id() == 1203301));
        battle.act(1, 2, 100, elements, chance -> chance >= 1D || chance == dispelChance);
        assertTrue(battle.buffs(3).stream().noneMatch(entry -> entry.spec().id() == 1203301));
        assertEquals(expectedDamage, battle.damages().stream()
                .filter(hit -> hit.buffId() == 4103300 + level).findFirst().orElseThrow().incoming());
    }

    /** 灵魂印记和死亡监听只装到己方，印记两回合后撤销，死亡子动作保持零附加。 */
    @Test
    void soulMarkInstallsOnAlliesAndExpires() {
        var battle = new HeroBattleHealingExecutor(rules, List.of(
                fighter(1, 1, 104050140, 104050141),
                fighter(2, 2, 101050200, 101050203)));
        battle.bindCombatData(1, 10405014, Map.of(220, 100L, 150, 500L));
        battle.bindCombatData(2, 10105020, Map.of(220, 100L, 150, 500L));
        battle.beginRound(1, List.of(1, 2), elements, chance -> chance >= 1D);
        battle.act(1, 2, 100, elements, chance -> chance >= 1D);
        assertEquals(List.of(4141301, 4141401), battle.buffs(1).stream().map(entry -> entry.spec().id()).toList());
        assertTrue(battle.buffs(2).isEmpty());
        assertEquals(List.of(291, 205), rules.battleSoulMark(4141301).stream()
                .map(HeroSkillPanelRules.ControlAttributeDefinition::attribute).toList());
        assertTrue(rules.battleStatusCondition(4141501));
        assertTrue(rules.inertBattleEffect(4141601));
        battle.expireAt(3);
        assertEquals(List.of(4141401), battle.buffs(1).stream().map(entry -> entry.spec().id()).toList());
    }

    /** 印记的20%施疗叠入实时205，先加固定治疗，再按施疗与受疗顺序报告溢出值。 */
    @Test
    void soulMarkUsesLiveTreatmentAndAppliesBeforeReceivedRate() {
        var healer = rules.battleSchedule(List.of(new Skill(102050140, 0), new Skill(102050143, 1)));
        var battle = new HeroBattleHealingExecutor(rules, List.of(
                fighter(1, 1, 104050140, 104050141),
                new State(new Actor(2, healer), 1, 2, 9419, 10000, 1000, 0, 0, 0),
                fighter(3, 2, 101050200, 101050203)));
        battle.bindCombatData(1, 10405014, Map.of(220, 100L, 150, 500L));
        battle.bindCombatData(2, 10205014, Map.of(220, 1000L, 100, 20L, 205, 1000L, 206, 2000L, 150, 500L));
        battle.bindCombatData(3, 10105020, Map.of(220, 100L, 150, 500L));
        var order = List.of(1, 2, 3);
        battle.beginRound(1, order, elements, chance -> chance >= 1D);
        battle.act(1, 3, 100, elements, chance -> chance >= 1D);
        assertEquals(9500, battle.state(2).hp());
        battle.beginRound(2, order, elements, chance -> chance >= 1D);
        battle.act(2, 3, 100, elements, chance -> chance >= 1D);
        var healing = battle.recoveries().stream().filter(event -> event.buffId() == 2143301 && event.targetId() == 2)
                .findFirst().orElseThrow();
        assertEquals(500, healing.base());
        assertEquals(811, healing.reported());
        assertEquals(500, healing.actual());
    }

    /** 露希安直接冰冻仍存在，针对霜寒的第二段同原配置为零概率。 */
    @Test
    void lucianUsesOrdinaryFreezeAndKeepsFrostBranchDormant() {
        var skill = rules.battleSchedule(List.of(new Skill(102050223, 1))).getFirst();
        assertEquals(List.of(2223101, 2223201, 2223301, 2223401), rules.damageSkillArts(skill).getFirst().buffs());
        assertTrue(rules.battleFrozen(2223301));
        assertEquals(java.util.Set.of(1202), rules.statusConditionValues(2223401));
        assertTrue(rules.inertBattleEffect(2223501));
    }

    /** 尼罗每档沿用原加速概率及数值；只命中一名队友也会重选其他队友发放攻击增益。 */
    @Test
    void nileSpeedRollsPerAllyAndAttackBonusReselectsTheGroup() {
        for (int level = 1; level <= 3; level++) {
            int speedId = 1203300 + level;
            int attackId = 1203400 + level;
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    fighter(1, 1, 101050200, 101050203, level),
                    inactive(2, 1, 2), inactive(3, 1, 3), inactive(4, 2, 1)));
            for (int id : List.of(1, 2, 3, 4)) {
                battle.bindCombatData(id, 10105020, Map.of(220, 100L, 150, 500L));
            }
            battle.beginRound(2, List.of(1, 2, 3, 4), elements, chance -> chance >= 1D);
            double speedChance = level == 1 ? 0.6D : level == 2 ? 0.8D : 1D;
            assertEquals(speedChance, rules.directAttributeChance(speedId));
            assertEquals(level == 1 ? 10 : level == 2 ? 30 : 70, rules.controlAttribute(speedId).amount());
            assertEquals(level == 3 ? 2500 : 2000, rules.controlAttribute(attackId).amount());
            var rollCount = new AtomicInteger();
            if (level < 3) {
                battle.act(1, 4, 100, elements, chance -> chance >= 1D);
                assertTrue(battle.buffs(2).isEmpty());
                assertTrue(battle.buffs(3).isEmpty());
            }
            battle.act(1, 4, 100, elements, chance -> chance >= 1D
                    || (chance == speedChance && rollCount.getAndIncrement() == 0));
            assertEquals(level == 3 ? 0 : 2, rollCount.get());
            assertTrue(battle.buffs(1).isEmpty());
            assertTrue(battle.buffs(4).isEmpty());
            assertEquals(List.of(speedId, attackId), buffIds(battle, 2));
            assertEquals(level == 3 ? List.of(speedId, attackId) : List.of(attackId), buffIds(battle, 3));
            battle.expireAt(3);
            assertEquals(List.of(speedId), buffIds(battle, 2));
            assertEquals(level == 3 ? List.of(speedId) : List.of(), buffIds(battle, 3));
            battle.expireAt(4);
            assertTrue(battle.buffs(2).isEmpty());
            assertTrue(battle.buffs(3).isEmpty());
        }
    }

    /** 主宰者二三级只让带原毒伤的目标尝试追加沉默，直接伤害仍命中整个原目标组。 */
    @Test
    void poisonSilenceInheritsOnlyPoisonedTargets() {
        for (int level = 2; level <= 3; level++) {
            var moves = rules.battleSchedule(List.of(new Skill(104050060, 0), new Skill(104050061, 1),
                    new Skill(104050063, level)));
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    new State(new Actor(1, moves), 1, 1, 10000, 10000, 100, 0, 0, 0),
                    inactive(2, 2, 1), inactive(3, 2, 2)));
            battle.bindCombatData(1, 10405006, Map.of(220, 100L, 150, 500L));
            battle.bindCombatData(2, 10105020, Map.of(220, 100L, 150, 500L));
            battle.bindCombatData(3, 10105020, Map.of(220, 100L, 150, 500L));
            var rollCount = new AtomicInteger();
            var order = List.of(1, 2, 3);
            battle.beginRound(1, order, elements, chance -> chance >= 1D);
            battle.act(1, 2, 100, elements, chance -> chance >= 1D || (chance == 0.3D && rollCount.getAndIncrement() == 0));
            assertEquals(List.of(4061301), buffIds(battle, 2));
            assertTrue(battle.buffs(3).isEmpty());
            battle.beginRound(2, order, elements, chance -> chance >= 1D);
            double conditionChance = level == 2 ? 0.35D : 0.2666D;
            int expectedSilence = 4063500 + level;
            assertEquals(conditionChance, rules.simpleControl(expectedSilence).rate());
            battle.act(1, 2, 100, elements, chance -> chance >= 1D || chance == conditionChance);
            assertTrue(buffIds(battle, 2).contains(expectedSilence));
            assertFalse(buffIds(battle, 3).contains(expectedSilence));
            int damageId = 4063200 + level;
            assertEquals(List.of(2, 3), battle.damages().stream().filter(hit -> hit.buffId() == damageId)
                    .map(HeroBattleHealingExecutor.Damage::targetId).distinct().toList());
        }
    }

    /** 霜寒追加段按二三级各自概率安装冰冻，未受霜寒的目标不会收到追加控制。 */
    @Test
    void extraFreezeUsesFrostAndEachLevelsOwnProbability() {
        for (int level = 2; level <= 3; level++) {
            var ordinary = rules.battleSchedule(List.of(new Skill(102050220, 0))).getFirst();
            // 只将测试出手放在开场霜寒尚未到期的回合，正式技能的配置、选择及概率照常解析。
            var reaction = new HeroBattleSkillUtils.Skill(102050223, level, 1, 1, 3, false, false);
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    new State(new Actor(1, List.of(ordinary, reaction)), 1, 1, 10000, 10000, 100, 0, 0, 0),
                    inactive(2, 2, 1), inactive(3, 2, 2)));
            battle.bindCombatData(1, 10205022, Map.of(220, 100L, 150, 500L));
            battle.bindCombatData(2, 10105020, Map.of(220, 100L, 150, 500L));
            battle.bindCombatData(3, 10105020, Map.of(220, 100L, 150, 500L, 322, 10000L));
            battle.initializePassive(1, 102050224, 1);
            assertTrue(buffIds(battle, 2).contains(2224101));
            assertFalse(buffIds(battle, 3).contains(2224101));
            battle.beginRound(1, List.of(1, 2, 3), elements, chance -> chance >= 1D);
            double extraFreezeChance = level == 2 ? 0.53D : 0.6D;
            int freezeId = 2223500 + level;
            assertEquals(extraFreezeChance, rules.battleFrozenDefinition(freezeId).rate());
            battle.act(1, 2, 100, elements, chance -> chance >= 1D || chance == extraFreezeChance);
            assertTrue(buffIds(battle, 2).contains(freezeId));
            assertFalse(buffIds(battle, 3).contains(freezeId));
        }
    }

    /** 已核对的高档职业、速度和随机属性条件由正常技能排期预检，并保留原分支数据。 */
    @Test
    void highLevelConditionsKeepTheirOriginalSelectorsAndStats() {
        for (int level = 2; level <= 3; level++) {
            for (int id : List.of(101050153, 103050131, 105050113)) {
                var schedule = rules.battleSchedule(List.of(new Skill(id, level)));
                assertFalse(rules.damageSkillArts(schedule.getFirst()).isEmpty());
            }
            assertEquals(1000L + level * 500L, rules.onceDamageAttribute(1153300 + level).amount());
            assertTrue(rules.battleRoundListener(3131500 + level));
            var selection = rules.battleArtSelection(5113200 + level);
            assertEquals(2, selection.count());
            assertEquals(4, selection.candidates().size());
            assertEquals(-3000, rules.controlAttribute(5113300 + level).amount());
            assertTrue(rules.untickedPlague(5113600 + level));
        }
    }

    /** 提米入场替换普通攻击，三档保留原技能等级、目标个数和独立眩晕概率。 */
    @Test
    void timiOpeningPassiveUsesTheMatchingOrdinaryReplacementLevel() {
        for (int level = 1; level <= 3; level++) {
            var oldOrdinary = rules.battleSchedule(List.of(new Skill(103050150, 0)));
            var actor = new Actor(1, oldOrdinary);
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    new State(actor, 1, 1, 10000, 10000, 100, 0, 0, 0),
                    inactive(2, 2, 1), inactive(3, 2, 2), inactive(4, 2, 3)));
            battle.bindCombatData(1, 10305015, Map.of(220, 100L, 150, 500L));
            for (int targetId : List.of(2, 3, 4)) {
                battle.bindCombatData(targetId, 10105020, Map.of(220, 100L, 150, 500L));
            }
            battle.initializePassive(1, 103050152, level);
            assertEquals(103050155, actor.generalAttack().skillId());
            assertEquals(level, actor.generalAttack().level());
            battle.beginRound(1, List.of(1, 2, 3, 4), elements, chance -> chance >= 1D);
            double dizzyChance = (500 + level * 500) / 10000D;
            battle.attack(1, 2, elements, chance -> chance >= 1D || chance == dizzyChance);
            int damageId = 3155300 + level;
            var damaged = battle.damages().stream().filter(hit -> hit.buffId() == damageId)
                    .map(HeroBattleHealingExecutor.Damage::targetId).distinct().toList();
            assertEquals(level == 3 ? 3 : 2, damaged.size());
            int dizzyId = 3155400 + level;
            assertTrue(damaged.stream().allMatch(targetId -> buffIds(battle, targetId).contains(dizzyId)));
        }
    }

    /** 创建合法回合技能排期的战斗单位；阵营和实例号独立，便于检查实际受术目标。 */
    private State fighter(int id, int faction, int ordinary, int active) {
        return fighter(id, faction, ordinary, active, 1);
    }

    /** 在保留普通攻击的同时选择要复验的原主动等级。 */
    private State fighter(int id, int faction, int ordinary, int active, int level) {
        var schedule = rules.battleSchedule(List.of(new Skill(ordinary, 0), new Skill(active, level)));
        return new State(new Actor(id, schedule), faction, 1, 10000, 10000, 100, 0, 0, 0);
    }

    /** 创建不主动出手的观察目标，指定阵营与站位以复验选人。 */
    private State inactive(int id, int faction, int position) {
        return new State(new Actor(id, List.of()), faction, position, 10000, 10000, 100, 0, 0, 0);
    }

    /** 从真实战斗状态读取 Buff 按安装顺序记录的原配置编号。 */
    private List<Integer> buffIds(HeroBattleHealingExecutor battle, int unitId) {
        return battle.buffs(unitId).stream().map(entry -> entry.spec().id()).toList();
    }
}
