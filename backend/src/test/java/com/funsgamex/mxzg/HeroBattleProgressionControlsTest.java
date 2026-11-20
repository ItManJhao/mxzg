/**
 * 主线实际依赖的控制、职业条件、一次属性、格挡盾与选目标回归。
 * 使用同源配置和独立场内边界数据，不连接玩家库、不修改通关范围或发放资产。
 */
package com.funsgamex.mxzg;

import java.util.*;
import java.util.function.DoublePredicate;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.*;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleProgressionControlsTest {
    /** 同源技能/元素规则；每场执行器独立持有动态状态。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(new ObjectMapper());
    /** 不隐含概率的真实元素表。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(new ObjectMapper());

    /** 使用普通火元素战士和两个职业目标；高生命仅为控制生命周期边界夹具。 */
    private HeroBattleHealingExecutor engine(int template, int wakeIndex, boolean brokenThird) {
        return engine(template, wakeIndex, brokenThird, true);
    }

    /** 可显式移除职业2目标，验证条件失败时不留下加成。 */
    private HeroBattleHealingExecutor engine(int template, int wakeIndex, boolean brokenThird, boolean matchingJob) {
        var normal = new HeroBattleSkillUtils.Skill(101010010, 0, 2, 0, 0, false, false);
        var active = new HeroBattleSkillUtils.Skill(template * 10 + 1, 1, 1, 1, 3, false, false);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, List.of(active, normal)), 1, 1, 100000, 100000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of(active, normal)), 2, 1, 100000, 100000, 1000, 0, 0, 0),
            new State(new Actor(3, List.of(active, normal)), 2, 5, 100000, 100000, 1000, 0, 0, 0)), new RandomDecision() {
                /** 测试只固定清心等独立整数命中，控制仍使用调用方判定。 */
                public boolean hit(int rate) { return rate > 0; }
                /** 选择器有界随机取首个，深睡显式使用待测整数边界。 */
                public int index(int bound) { return bound == 10000 ? wakeIndex : 0; }
            });
        var attributes = Map.of(220, 1000L, 150, 500L, 101, 50L, 226, 10000L, 211, 10000L);
        engine.bindCombatData(1, template, attributes);
        engine.bindCombatData(2, matchingJob ? 10101001 : 10103003, attributes);
        engine.bindCombatData(3, 10103003, brokenThird
            ? Map.of(220, 1000L, 150, 500L, 101, 60L, 226, 10000L, 211, 10000L, 340, -1L) : attributes);
        return engine;
    }

    /** 显式普通伤害命中、暴击、格挡判定序列；耗尽即失败，避免默认成功掩盖额外调用。 */
    private DoublePredicate decisions(boolean... values) {
        int[] index = {0};
        return rate -> values[index[0]++];
    }

    /** 执行真实允许反击的普通伤害；171等后置事件必须走技能根入口。 */
    private void attack(HeroBattleHealingExecutor engine, boolean... values) {
        engine.attack(1, 2, elements, decisions(values));
    }

    /** 实际第10至20关每个敌人完整技能预检均通过；不把预检等同整场或玩家开放。 */
    @Test void allElevenStagesBuildEveryRealEnemySkill() {
        var scenario = new HeroBattleChapterScenario(new ObjectMapper());
        for (int stage = 10; stage <= 20; stage++) {
            var enemies = scenario.enemies(stage);
            assertFalse(enemies.isEmpty(), "stage " + stage);
            for (var enemy : enemies) {
                assertEquals(2, enemy.skills().size(), "stage " + stage + "/" + enemy.template());
                enemy.skills().forEach(scenario::requireSupportedSkill);
            }
        }
    }

    /** 153免控优先，石化读218/212/219组合概率；成功185→207，驱散后恢复出手。 */
    @Test void petrifyUsesResistanceAndUnifiedLifecycle() {
        var engine = engine(10503001, 0, false);
        engine.setOnceAttribute(2, 212, 2000);
        engine.setOnceAttribute(2, 218, 2500);
        engine.setOnceAttribute(1, 219, 5000);
        engine.applySimpleControl(5011301, 1, 2, chance -> {
            assertEquals(0.9D, chance, 0.0000001);
            return true;
        });
        assertTrue(engine.state(2).actor().hasControl(1006));
        assertEquals(List.of(185, 207), engine.signals().stream().map(Signal::event).toList());
        assertFalse(HeroBattleActionUtils.canAct(false,
            new HeroBattleSkillUtils.Skill(101010010, 0, 2, 0, 0, false, false), 100, Set.of(1006)));
        engine.dispel(2, 3);
        assertFalse(engine.state(2).actor().hasControl(1006));
        assertTrue(engine.buffs(2).isEmpty());
        engine.state(2).actor().control(153, true);
        engine.applySimpleControl(5011301, 1, 2, chance -> { fail("免控不应抽样"); return true; });
        assertTrue(engine.buffs(2).isEmpty());
    }

    /** 沉默只禁主动仍可普攻；到期移除真实实例恢复主动资格。 */
    @Test void silenceOnlyForcesNormalAttackAndExpires() {
        var engine = engine(10105008, 0, false);
        engine.applySimpleControl(1081501, 1, 2, chance -> {
            assertEquals(0.35D, chance);
            return true;
        });
        assertTrue(engine.state(2).actor().hasControl(1001));
        assertTrue(HeroBattleActionUtils.onlyAttack(Set.of(1001)));
        engine.expireAt(1);
        assertFalse(engine.state(2).actor().hasControl(1001));
    }

    /** 职业条件只影响一次270，后续根伤害仍打两个原目标；首个实际读取后加成消失。 */
    @Test void jobConditionInstallsOneCasterBonusAndRestoresRootTargets() {
        var engine = engine(10105008, 0, false);
        engine.expireAt(1);
        engine.act(1, 2, 100, elements, chance -> chance > 0);
        var damage = engine.damages().stream().filter(value -> value.buffId() == 1081401).toList();
        assertEquals(List.of(3, 2), damage.stream().map(Damage::targetId).toList());
        // 后排职业1先命中也吃掉已由另一目标职业2触发的加成，不能将加成绑定在职业2目标上。
        assertEquals(2392, damage.getFirst().incoming());
        assertEquals(1885, damage.getLast().incoming());
        assertTrue(engine.onceAttributes(1).isEmpty());
        assertEquals(1, engine.buffs(1).stream().filter(value -> value.spec().type() == 167).count());
    }

    /** 未选择职业2时不安装一次属性；原伤害和独立沉默照常执行。 */
    @Test void unmatchedJobNeverCreatesOnceBonus() {
        var engine = engine(10105008, 0, false, false);
        engine.expireAt(1);
        engine.act(1, 2, 100, elements, chance -> chance > 0);
        assertFalse(engine.buffs(1).stream().anyMatch(value -> value.spec().type() == 167));
        assertEquals(2, engine.damages().stream().filter(value -> value.buffId() == 1081401).count());
    }

    /** 真实伤害miss后仍进入深睡子动作；之后miss/105固定伤害都不触发171唤醒。 */
    @Test void missedDamageStillAppliesDeepSleepButMissAndFixedNeverWake() {
        var engine = engine(10205014, 0, false);
        engine.setOnceAttribute(1, 226, 0);
        engine.setOnceAttribute(2, 227, 10000);
        engine.expireAt(1);
        engine.act(1, 2, 100, elements, chance -> chance > 0);
        assertTrue(engine.ordinaryResults().getFirst().missed());
        assertTrue(engine.state(2).actor().hasControl(1014));
        var sleep = engine.buffs(2).stream().filter(value -> value.spec().type() == 1014).findFirst().orElseThrow();
        assertEquals(0, sleep.value());
        engine.ordinaryDamage(1011401, 1, List.of(2), 1, false, 0, elements, decisions(false));
        engine.realDamage(9011201, 1, 2);
        assertTrue(engine.state(2).actor().hasControl(1014));
    }

    /** 深睡首抽保留旧<=5000整数边界，成功移除快照仍为0，不额外触发破冰事件。 */
    @Test void deepSleepInclusiveBoundaryAndDamageBeforeWake() {
        var engine = engine(10101001, 5000, false);
        engine.applySimpleControl(2141301, 1, 2, chance -> true);
        attack(engine, true, false, false);
        assertFalse(engine.state(2).actor().hasControl(1014));
        var removed = engine.removals().stream().filter(value -> value.reason().equals("wake")).findFirst().orElseThrow();
        assertEquals(0, removed.entry().value());
        var trace = engine.trace();
        int damage = -1;
        int wake = -1;
        for (int i = 0; i < trace.size(); i++) {
            if (trace.get(i).kind().equals("damage")) damage = i;
            if (trace.get(i).reason().equals("wake")) wake = i;
        }
        assertTrue(damage >= 0 && wake > damage);
        assertFalse(engine.signals().stream().anyMatch(value -> value.event() == 208));
    }

    /** 首抽5001不醒并累计1，第二次必醒；期限与监听未因计数重建，第二次移除快照为1。 */
    @Test void deepSleepSecondHitAlwaysWakes() {
        var engine = engine(10101001, 5001, false);
        engine.applySimpleControl(2141301, 1, 2, chance -> true);
        long identity = engine.buffs(2).getFirst().instanceId();
        attack(engine, true, false, false);
        assertTrue(engine.state(2).actor().hasControl(1014));
        assertEquals(1, engine.buffs(2).getFirst().value());
        assertEquals(identity, engine.buffs(2).getFirst().instanceId());
        attack(engine, true, false, false);
        assertFalse(engine.state(2).actor().hasControl(1014));
        assertEquals(1, engine.removals().getFirst().entry().value());
    }

    /** 格挡盾不拦105；普通暴击被清为0且不冒充原格挡抽样，消耗前后顺序可回放。 */
    @Test void blockShieldConsumesOnlyOrdinaryHitAndPreservesIndependentBlockFlag() {
        var engine = engine(10101001, 0, false);
        engine.applyBlockShield(2141401, 1, 2);
        engine.realDamage(9011201, 1, 2);
        assertEquals(1, engine.buffs(2).size());
        long hp = engine.state(2).hp();
        attack(engine, true, true, false);
        assertEquals(hp, engine.state(2).hp());
        assertTrue(engine.buffs(2).isEmpty());
        var result = engine.ordinaryResults().getLast();
        assertTrue(result.rolledCritical());
        assertFalse(result.critical());
        assertFalse(result.blocked());
        assertEquals(0, result.damage());
        assertEquals(1, engine.removals().getFirst().entry().value());
        assertEquals("trigger-limit", engine.removals().getFirst().reason());
        assertFalse(engine.signals().stream().anyMatch(value -> Set.of(174, 175, 184).contains(value.event())));
    }

    /** 同次189通知全部格挡盾；不能在前盾已将剩余伤害置0后漏消耗后盾。 */
    @Test void allBlockShieldInstancesConsumeAndExpiryCleansListener() {
        var engine = engine(10101001, 0, false);
        engine.applyBlockShield(2141401, 1, 2);
        engine.applyBlockShield(2141401, 3, 2);
        attack(engine, true, false, false);
        assertTrue(engine.buffs(2).isEmpty());
        assertEquals(2, engine.removals().size());
        engine.applyBlockShield(2141401, 1, 2);
        engine.expireAt(2);
        long hp = engine.state(2).hp();
        attack(engine, true, false, false);
        assertTrue(engine.state(2).hp() < hp);
    }

    /** 后目标计算失败时撤回首目标格挡计数/监听/移除/0伤害记录，重试仍有效。 */
    @Test void laterFailureRollsBackNewShieldLifecycle() {
        var engine = engine(10101001, 0, true);
        engine.applyBlockShield(2141401, 1, 2);
        var before = engine.buffs(2);
        var trace = engine.trace();
        assertThrows(IllegalArgumentException.class, () -> engine.ordinaryDamage(1011401, 1, List.of(2, 3),
            1, false, 0, elements, decisions(true, false, false, true, false, false)));
        assertEquals(before, engine.buffs(2));
        assertEquals(trace, engine.trace());
        assertTrue(engine.removals().isEmpty());
        attack(engine, true, false, false);
        assertEquals(100000, engine.state(2).hp());
    }

    /** 第17关201加攻作用于真实普通伤害折算，移除按原整数减回，不误作防御或永久增益。 */
    @Test void fixedAttackPercentAddsAndExpiresWithRealSkill() {
        var engine = engine(10205014, 0, false);
        engine.expireAt(1);
        engine.act(1, 2, 100, elements, chance -> chance > 0);
        assertTrue(engine.buffs(1).stream().anyMatch(value -> value.spec().id() == 2141501));
        engine.ordinaryDamage(1011401, 1, List.of(2), 1, false, 0, elements, decisions(true, false, false));
        assertEquals(965, engine.damages().getLast().incoming());
        engine.expireAt(3);
        engine.ordinaryDamage(1011401, 1, List.of(2), 1, false, 0, elements, decisions(true, false, false));
        assertEquals(839, engine.damages().getLast().incoming());
        assertFalse(engine.buffs(1).stream().anyMatch(value -> value.spec().id() == 2141501));
    }

    /** 后目标故障使已安装的一次270、沉默及其真实监听/记录一起回滚，不留下跨动作加成。 */
    @Test void laterFailureRestoresConditionAndControlState() {
        var engine = engine(10105008, 0, true);
        engine.expireAt(1);
        assertThrows(IllegalArgumentException.class, () -> engine.act(1, 2, 100, elements, chance -> chance > 0));
        assertTrue(engine.trace().isEmpty());
        assertTrue(engine.buffs(1).isEmpty());
        assertTrue(engine.onceAttributes(1).isEmpty());
        assertFalse(engine.state(2).actor().hasControl(1001));
        assertEquals(100000, engine.state(2).hp());
    }

    /** 用合法成长冰晶女巫对每关原敌队进行真实多回合计算，导出覆盖最多敌技能的只读PB。 */
    @Test void runsAllElevenRealEnemyTeamsAndExportsReports() throws Exception {
        var mapper = new ObjectMapper();
        var scenario = new HeroBattleChapterScenario(mapper);
        var summaries = new ArrayList<Map<String, Object>>();
        for (int stage = 10; stage <= 20; stage++) {
            HeroBattleChapterScenario.Result selected = null;
            Set<String> selectedSkills = Set.of();
            var expected = new LinkedHashSet<String>();
            for (var enemy : scenario.enemies(stage)) {
                enemy.skills().forEach(skill -> expected.add(enemy.id() + ":" + skill.skillId()));
            }
            for (int level : List.of(1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30)) {
                var input = new ArrayList<HeroBattleChapterScenario.Unit>();
                input.add(legalHealer(level));
                input.addAll(scenario.enemies(stage));
                var report = scenario.runIndependentTeams(input, chance -> chance > 0);
                var occurred = new LinkedHashSet<String>();
                report.frames().stream().flatMap(frame -> frame.trace().stream())
                    .filter(trace -> trace.kind().equals("skill.begin") && trace.sourceId() > 8)
                    .forEach(trace -> occurred.add(trace.sourceId() + ":" + trace.configId()));
                if (selected == null || occurred.size() > selectedSkills.size()) {
                    selected = report;
                    selectedSkills = occurred;
                }
                if (occurred.containsAll(expected)) {
                    break;
                }
            }
            assertNotNull(selected);
            assertEquals(expected, selectedSkills, "第" + stage + "关尚缺敌技能自然执行样本");
            assertNotEquals(HeroBattleRoundUtils.Outcome.ONGOING, selected.outcome());
            var path = java.nio.file.Path.of("target/chapter-controls-stage-" + stage + ".pb");
            java.nio.file.Files.write(path, HeroBattleReplayProtocolUtils.encode(selected).toByteArray());
            summaries.add(Map.of("stage", stage, "heroLevel", selected.initial().getFirst().level(),
                "scenario", selected.scenario(), "outcome", selected.outcome().name(), "rounds", selected.rounds(),
                "expectedEnemySkills", expected, "occurredEnemySkills", selectedSkills,
                "upserts", selected.frames().stream().flatMap(frame -> frame.trace().stream())
                    .filter(trace -> trace.kind().equals("buff.upsert")).map(Trace::configId).distinct().toList(),
                "report", path.toString()));
        }
        java.nio.file.Files.writeString(java.nio.file.Path.of("target/chapter-controls-stage-10-20.json"),
            mapper.writerWithDefaultPrettyPrinter().writeValueAsString(summaries));
    }

    /** 独立场内我方使用真实模板、合法等级/强化、基础成长与技能属性；不借用边界夹具的高生命。 */
    private HeroBattleChapterScenario.Unit legalHealer(int level) {
        var mapper = new ObjectMapper();
        var growth = new HeroGrowthRules(mapper);
        int stage = growth.npcStage(level);
        var stats = growth.stats(10203003, 3, level, stage);
        var attributes = new HashMap<Integer, Long>();
        attributes.put(220, (long) stats.atk());
        attributes.put(223, (long) stats.hp());
        attributes.put(224, (long) stats.def());
        attributes.put(101, (long) stats.spd());
        attributes.put(150, new HeroBattleDefenseRules(mapper).coefficient(3));
        rules.contribute(10203003, 3, stage, (type, value) -> attributes.merge(type, value, Math::addExact));
        return new HeroBattleChapterScenario.Unit(1, 1, 10203003, level, 3, stage, 2,
            attributes, HeroBattleAttributeUtils.opening(attributes),
            rules.battleSchedule(rules.select(10203003, 3, stage)));
    }

    /** 14实时速度降序，23按配置排优先级和每目标整数随机；无真实速度/参数明确拒绝。 */
    @Test void selectorsUseSpeedAndFrontBackArguments() {
        var source = new HeroBattleTargetUtils.Unit(1, 1, 1, 1, 100, 100);
        var front = new HeroBattleTargetUtils.Unit(2, 2, 1, 1, 100, 100, () -> 90L);
        var back = new HeroBattleTargetUtils.Unit(3, 2, 5, 1, 100, 100, () -> 100L);
        var live = List.of(source, front, back);
        assertEquals(List.of(back), HeroBattleTargetUtils.select(rules.battleTargets(2141101), source,
            live, List.of(front), false));
        var draws = new ArrayList<Integer>();
        assertEquals(List.of(back, front), HeroBattleTargetUtils.select(rules.battleTargets(1081101), source,
            live, List.of(front), false, bound -> { draws.add(bound); return 0; }));
        assertEquals(List.of(899, 899), draws);
        assertThrows(IllegalArgumentException.class, () -> new HeroBattleTargetUtils.Plan(1, List.of(23), 1));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleTargetUtils.select(rules.battleTargets(2141101),
            source, List.of(source, new HeroBattleTargetUtils.Unit(2, 2, 1, 1, 100, 100)), List.of(), false));
    }

    /** 22优先放在原敌方集合内按旧状态排列，缺少指定状态时保持战场顺序。 */
    @Test void selectsByConfiguredBuffOrder() {
        var source = new HeroBattleTargetUtils.Unit(1, 1, 1, 1, 100, 100);
        var unmarked = new HeroBattleTargetUtils.Unit(2, 2, 1, 1, 100, 100, null, null, type -> false);
        var fire = new HeroBattleTargetUtils.Unit(3, 2, 2, 1, 100, 100, null, null, type -> type == 1206);
        var burn = new HeroBattleTargetUtils.Unit(4, 2, 3, 1, 100, 100, null, null, type -> type == 1201);
        var plan = new HeroBattleTargetUtils.Plan(1, List.of(3, 22), 2, List.of(1201, 1206));
        assertEquals(List.of(burn, fire), HeroBattleTargetUtils.select(plan, source,
            List.of(source, unmarked, fire, burn), List.of(), false));
        assertEquals(List.of(unmarked), HeroBattleTargetUtils.select(plan, source,
            List.of(source, unmarked), List.of(), false));
    }

    /** 真实105固定100伤害击中严格半血边界，恢复后再次跨线仍只享受一次210增益。 */
    @Test void healthThresholdChecksBothSidesAndAppliesLimitedEffectOnce() {
        var engine = progressionEngine(10105009, 600, 1000, 1_000, 1000, 1000);
        engine.initializePassive(2, 101050094, 2);
        engine.realDamage(9011201, 1, 2);
        assertEquals(500, engine.state(2).hp());
        assertTrue(engine.buffs(2).stream().noneMatch(entry -> entry.spec().id() == 1094302));
        engine.realDamage(9011201, 1, 2);
        assertEquals(400, engine.state(2).hp());
        assertTrue(engine.buffs(2).stream().anyMatch(entry -> entry.spec().id() == 1094302));
        engine.expireAt(3);
        engine.art(new HeroBattleEventProcessor.Invocation(1, 1063201, 2, 2));
        assertTrue(engine.state(2).hp() > 500);
        while (engine.state(2).hp() >= 500) {
            engine.realDamage(9011201, 1, 2);
        }
        assertEquals(1, engine.trace().stream().filter(event -> event.kind().equals("buff.upsert")
            && event.configId() == 1094302).count());
    }

    /** 攻击偷取重装先退还旧百分比再读攻击，期限到达后移除保存过的同一固定攻击。 */
    @Test void attackStealReplacementAndExpiryKeepTheActualValue() {
        var engine = progressionEngine(10205007, 100_000, 100_000, 2_000, 100_000, 100_000);
        engine.initializePassive(2, 102050074, 2);
        engine.attack(2, 1, elements, rate -> rate >= 1D);
        engine.attack(2, 1, elements, rate -> rate >= 1D);
        var retained = engine.buffs(1).stream().filter(entry -> entry.spec().id() == 2075302).toList();
        assertEquals(1, retained.size());
        assertEquals(100, retained.getFirst().value());
        assertTrue(engine.removals().stream().anyMatch(removed -> removed.reason().equals("replace")
            && removed.entry().spec().id() == 2075302 && removed.entry().value() == 100));
        engine.expireAt(3);
        assertTrue(engine.buffs(1).stream().noneMatch(entry -> entry.spec().id() == 2075302));
    }

    /** 伊芙施加给敌人的死亡监听治疗施加者；最后一名敌人倒下之后不再执行。 */
    @Test void enemyDeathHealsEveOnlyWhileBattleContinues() {
        var engine = progressionEngine(10305009, 400, 1000, 1000, 100, 100);
        engine.initializePassive(2, 103050094, 2);
        engine.realDamage(9011201, 2, 1);
        assertEquals(700, engine.state(2).hp());
        engine.realDamage(9011201, 2, 3);
        assertEquals(700, engine.state(2).hp());
        assertEquals(List.of(3094202), engine.recoveries().stream().map(Recovery::buffId).toList());
    }

    /** 单独设置阈值所需血量，所有技能、属性与固定伤害通过生产执行器计算。 */
    private HeroBattleHealingExecutor progressionEngine(int template, long hp, long maxHp, long attack,
                                                        long attackerHp, long allyHp) {
        var ordinary = new HeroBattleSkillUtils.Skill(101010010, 0, 2, 0, 0, false, false);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, List.of(ordinary)), 1, 1, attackerHp, maxHp, 100, 0, 0, 0),
            new State(new Actor(2, List.of(ordinary)), 2, 2, hp, maxHp, attack, 0, 0, 0),
            new State(new Actor(3, List.of(ordinary)), 1, 5, allyHp, maxHp, 1000, 0, 0, 0)));
        var shared = Map.of(220, 1000L, 150, 500L, 101, 50L, 226, 10000L, 211, 10000L);
        engine.bindCombatData(1, 10101001, shared);
        engine.bindCombatData(2, template, Map.of(220, attack, 150, 500L, 101, 50L, 226, 10000L, 211, 10000L));
        engine.bindCombatData(3, 10101001, shared);
        return engine;
    }
}
