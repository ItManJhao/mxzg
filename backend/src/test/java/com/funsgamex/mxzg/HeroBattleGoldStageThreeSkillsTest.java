/** 使用副本和试炼共用的旧技能配置检查治疗守护、庇护分伤、烈焰护盾与石化普攻替换。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules.Skill;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleGoldStageThreeSkillsTest {
    /** 三档治疗均在抬血后重新选守护对象，暴伤只落在三级的原治疗目标。 */
    @Test void lightSpiritSelectsProtectionAfterHealing() {
        assertLightSpiritProtection(1, 760, 5000, List.of(3071401, 3071601));
        assertLightSpiritProtection(2, 900, 5000, List.of(3071402, 3071502, 3071602));
        assertLightSpiritProtection(3, 1080, 8000, List.of(3071403, 3071503, 3071603));
    }

    /** 按原等级实战验证治疗量、增益目标、烈火来源和下一轮到期。 */
    private static void assertLightSpiritProtection(int level, int recovery, int fireRate, List<Integer> protection) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var lightSpirit = new Actor(1, rules.battleSchedule(List.of(
                new Skill(103050070, 0), new Skill(103050071, level))));
        var enemy = actor(rules, 4, 10301001, 1);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                new State(lightSpirit, 1, 3, 5_000, 10_000, 100, 0, 0, 0),
                new State(new Actor(2, List.of()), 1, 5, 4_600, 10_000, 100, 0, 0, 0),
                new State(new Actor(3, List.of()), 1, 8, 480, 1_000, 100, 0, 0, 0),
                new State(enemy, 2, 2, 13_000, 13_000, 100, 0, 0, 0),
                new State(new Actor(5, List.of()), 1, 2, 5_100, 10_000, 100, 0, 0, 0)));
        bind(engine, 1, 10305007, 1_000);
        for (int id : List.of(2, 3, 4, 5)) {
            bind(engine, id, 10301001, 300);
        }
        var order = List.of(1, 2, 3, 4, 5);
        engine.beginRound(1, order, elements, chance -> chance > 0);
        engine.act(1, 4, 100, elements, chance -> chance > 0);
        assertEquals(List.of(2, 3, 1), engine.recoveries().stream()
                .map(HeroBattleHealingExecutor.Recovery::targetId).toList());
        assertEquals(5_000 + recovery, engine.state(1).hp());
        assertEquals(4_600 + recovery, engine.state(2).hp());
        assertEquals(1_000, engine.state(3).hp());
        var criticalDamage = level == 3 ? List.of(3071303) : List.of();
        assertEquals(criticalDamage, buffs(engine, 1));
        assertEquals(criticalDamage, buffs(engine, 3));
        assertEquals(protection, buffs(engine, 5));
        assertEquals(switch (level) {
            case 1 -> List.of();
            case 2 -> protection;
            case 3 -> List.of(3071403, 3071503, 3071603, 3071303);
            default -> throw new IllegalArgumentException("未配置的圣光精灵等级");
        }, buffs(engine, 2));
        if (level == 3) {
            assertEquals(222, rules.controlAttribute(3071303).attribute());
            assertEquals(2000, rules.controlAttribute(3071303).amount());
        }
        assertEquals(fireRate, rules.battleReactiveProtection(3071600 + level).rate());
        engine.attack(4, 5, elements, chance -> chance > 0);
        assertEquals(List.of(3071700 + level), buffs(engine, 4));
        assertEquals(5, engine.buffs(4).getFirst().sourceId());
        engine.beginRound(2, order, elements, chance -> chance > 0);
        var fire = engine.damages().getLast();
        assertEquals(3071700 + level, fire.buffId());
        assertEquals(700, fire.incoming());
        assertEquals(12_300, engine.state(4).hp());
        assertTrue(buffs(engine, 1).isEmpty());
        assertTrue(buffs(engine, 2).isEmpty());
        assertTrue(buffs(engine, 3).isEmpty());
        assertTrue(buffs(engine, 4).isEmpty());
        assertTrue(buffs(engine, 5).isEmpty());
    }

    /** 三档庇护均保护最高攻击的两名其他队友；分伤与减伤、免控各自沿用原档数值。 */
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    void flameKnightShelterTransfersDamageToItsCaster(int level) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var knight = shelterActor(rules, 1, 101050070, 101050071, level);
        var enemy = actor(rules, 4, 10301001, 1);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                state(knight, 1, 8), state(new Actor(2, List.of()), 1, 2),
                state(new Actor(3, List.of()), 1, 3), state(enemy, 2, 2),
                state(new Actor(5, List.of()), 1, 7)));
        bind(engine, 1, 10105007, 500);
        bind(engine, 2, 10301001, 400);
        bind(engine, 3, 10301001, 600);
        bind(engine, 4, 10301001, 1_500);
        bind(engine, 5, 10301001, 10);
        var order = List.of(1, 2, 3, 4, 5);
        engine.beginRound(1, order, elements, chance -> chance > 0);
        engine.act(1, 4, 100, elements, chance -> chance > 0);
        assertEquals(List.of(1071500 + level, 1071600 + level), buffs(engine, 1));
        var allyBuffs = List.of(1071200 + level, 1071300 + level, 1071400 + level);
        assertEquals(allyBuffs, buffs(engine, 2));
        assertEquals(allyBuffs, buffs(engine, 3));
        assertTrue(buffs(engine, 5).isEmpty());
        assertEquals(500L * level, rules.controlAttribute(1071300 + level).amount());
        assertEquals(500L * level, rules.controlAttribute(1071400 + level).amount());
        assertEquals(500L * level, rules.controlAttribute(1071500 + level).amount());
        assertEquals(500L * level, rules.controlAttribute(1071600 + level).amount());
        engine.attack(4, 2, elements, chance -> chance > 0);
        assertEquals(2, engine.damages().size());
        var share = engine.damages().getFirst();
        var direct = engine.damages().getLast();
        assertEquals(1, share.targetId());
        assertEquals(2, direct.targetId());
        assertEquals(4, share.sourceId());
        assertEquals(direct.buffId(), share.buffId());
        double shareRate = level == 3 ? 0.5D : 0.4D;
        assertEquals((long) ((share.incoming() + direct.incoming()) * shareRate), share.incoming());
        engine.beginRound(2, order, elements, chance -> chance > 0);
        assertFalse(buffs(engine, 2).isEmpty());
        engine.beginRound(3, order, elements, chance -> chance > 0);
        assertTrue(buffs(engine, 2).isEmpty());
    }

    /** 亚瑟只净化并庇护攻击最高的其他队友；当分伤击败亚瑟后，下一次命中由原目标全额承担。 */
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    void arthurShelterCleansesAndStopsWhenCasterFalls(int level) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var arthur = shelterActor(rules, 1, 102050090, 102050093, level);
        var enemy = actor(rules, 4, 10301001, 1);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                new State(arthur, 1, 8, 1, 10_000, 100, 0, 0, 0),
                state(new Actor(2, List.of()), 1, 2), state(new Actor(3, List.of()), 1, 3),
                state(enemy, 2, 2)));
        bind(engine, 1, 10205009, 700);
        bind(engine, 2, 10301001, 600);
        bind(engine, 3, 10301001, 400);
        bind(engine, 4, 10301001, 1_500);
        var order = List.of(1, 2, 3, 4);
        engine.beginRound(2, order, elements, chance -> chance > 0);
        engine.applyDizzy(1041301, 4, 2, chance -> chance > 0);
        engine.applyDizzy(1041301, 4, 3, chance -> chance > 0);
        assertEquals(List.of(1041301), buffs(engine, 2));
        engine.act(1, 4, 100, elements, chance -> chance > 0);
        assertEquals(List.of(2093600 + level, 2093700 + level), buffs(engine, 1));
        assertEquals(List.of(2093200 + level, 2093400 + level, 2093500 + level), buffs(engine, 2));
        assertEquals(List.of(1041301), buffs(engine, 3));
        long reduction = level == 3 ? 3000 : 2000;
        assertEquals(reduction, rules.controlAttribute(2093400 + level).amount());
        assertEquals(reduction, rules.controlAttribute(2093600 + level).amount());
        long resistance = level == 3 ? 2000 : 1500;
        assertEquals(resistance, rules.controlAttribute(2093500 + level).amount());
        assertEquals(resistance, rules.controlAttribute(2093700 + level).amount());
        engine.attack(4, 2, elements, chance -> chance > 0);
        assertEquals(2, engine.damages().size());
        var share = engine.damages().getFirst();
        var direct = engine.damages().getLast();
        assertEquals(1, share.targetId());
        assertEquals(2, direct.targetId());
        assertEquals((share.incoming() + direct.incoming()) / 2, share.incoming());
        assertEquals(0, engine.state(1).hp());
        engine.attack(4, 2, elements, chance -> chance > 0);
        assertEquals(3, engine.damages().size());
        assertEquals(2, engine.damages().getLast().targetId());
    }

    /** 烈焰护盾在庇护分摊后仍使用未分摊的伤害反弹，配套的固定分伤不会触发第二次反弹。 */
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    void flameShieldUsesInitialDamageEvenWhenSheltered(int level) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var knight = shelterActor(rules, 1, 101050070, 101050071, 3);
        var romora = shelterActor(rules, 3, 103050200, 103050203, level);
        var enemy = actor(rules, 4, 10301001, 1);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                state(knight, 1, 8), state(new Actor(2, List.of()), 1, 2), state(romora, 1, 7),
                state(enemy, 2, 2)));
        bind(engine, 1, 10105007, 500);
        bind(engine, 2, 10301001, 600);
        bind(engine, 3, 10305020, 400);
        bind(engine, 4, 10301001, 1_532);
        var order = List.of(1, 2, 3, 4);
        engine.beginRound(1, order, elements, chance -> chance > 0);
        engine.act(1, 4, 100, elements, chance -> chance > 0);
        engine.beginRound(2, order, elements, chance -> chance > 0);
        engine.act(3, 4, 100, elements, chance -> chance > 0);
        assertTrue(buffs(engine, 1).contains(3203200 + level));
        assertTrue(buffs(engine, 2).contains(3203200 + level));
        engine.attack(4, 2, elements, chance -> chance > 0);
        var records = engine.damages();
        assertEquals(3, records.size());
        assertEquals(List.of(1, 2, 4), records.stream().map(HeroBattleHealingExecutor.Damage::targetId).toList());
        var bounced = records.getLast();
        assertEquals(2, bounced.sourceId());
        assertEquals(records.getFirst().buffId(), bounced.buffId());
        long initialDamage = records.get(0).incoming() + records.get(1).incoming();
        assertEquals((long) (initialDamage * ((1000D + (level - 1) * 500D) / 10000D)), bounced.incoming());
        engine.beginRound(4, order, elements, chance -> chance > 0);
        assertTrue(buffs(engine, 2).contains(3203200 + level));
        engine.beginRound(5, order, elements, chance -> chance > 0);
        assertTrue(buffs(engine, 2).isEmpty());
    }

    /** 两个庇护按安装次序分摊剩余伤害，转给同样被庇护的亚瑟时不会再次进入分摊。 */
    @Test
    void overlappingSheltersShareOnlyTheRemainingHit() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var knight = shelterActor(rules, 1, 101050070, 101050071, 2);
        var arthur = shelterActor(rules, 2, 102050090, 102050093, 2);
        var enemy = actor(rules, 4, 10301001, 1);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                state(knight, 1, 8), state(arthur, 1, 7), state(new Actor(3, List.of()), 1, 2),
                state(enemy, 2, 2)));
        bind(engine, 1, 10105007, 100);
        bind(engine, 2, 10205009, 400);
        bind(engine, 3, 10301001, 600);
        bind(engine, 4, 10301001, 1_541);
        var order = List.of(1, 2, 3, 4);
        engine.beginRound(1, order, elements, chance -> chance > 0);
        engine.act(1, 4, 100, elements, chance -> chance > 0);
        assertTrue(buffs(engine, 2).contains(1071202));
        engine.beginRound(2, order, elements, chance -> chance > 0);
        engine.act(2, 4, 100, elements, chance -> chance > 0);
        engine.attack(4, 3, elements, chance -> chance > 0);
        var records = engine.damages();
        assertEquals(List.of(1, 2, 3), records.stream().map(HeroBattleHealingExecutor.Damage::targetId).toList());
        long original = records.stream().mapToLong(HeroBattleHealingExecutor.Damage::incoming).sum();
        long knightShare = (long) (original * 0.4D);
        long arthurShare = (original - knightShare) / 2;
        assertEquals(List.of(knightShare, arthurShare, original - knightShare - arthurShare),
                records.stream().map(HeroBattleHealingExecutor.Damage::incoming).toList());
    }

    /** 爱德华三个档位按同一原始伤害分档，只叠加对应级的两种临时属性。 */
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    void edwardDamageThresholdUsesTheMatchingFollowup(int level) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var enemy = actor(rules, 1, 10301001, 1);
        var edward = new Actor(2, rules.battleSchedule(List.of(new Skill(105050040, 0), new Skill(105050044, level))));
        var engine = new HeroBattleHealingExecutor(rules, List.of(state(enemy, 1, 2), state(edward, 2, 2)));
        bind(engine, 1, 10301001, 3_000);
        bind(engine, 2, 10505004, 400);
        engine.initializePassive(2, 105050044, level);
        var order = List.of(1, 2);
        engine.beginRound(1, order, elements, chance -> chance > 0);
        engine.attack(1, 2, elements, chance -> chance > 0);
        int count = (int) ((engine.damages().getFirst().incoming() / 10_000D) / 0.1D);
        assertTrue(count >= 2);
        assertEquals(count, engine.buffs(2).getFirst().value());
        assertEquals(count, buffs(engine, 2).stream().filter(id -> id == 5044200 + level).count());
        assertEquals(count, buffs(engine, 2).stream().filter(id -> id == 5044300 + level).count());
        assertEquals(1 + 2 * count, buffs(engine, 2).size());
        assertEquals(List.of(200L, 300L, 500L).get(level - 1).longValue(),
                rules.controlAttribute(5044200 + level).amount());
        assertEquals(100L * level, rules.controlAttribute(5044300 + level).amount());
        engine.beginRound(7, order, elements, chance -> chance > 0);
        assertEquals(List.of(5044100 + level), buffs(engine, 2));
    }

    /** 爱德华的入场被动替换普攻，主动与替换普攻独立石化，两个能量配置均不写战报。 */
    @Test void edwardKeepsPetrifyWithoutDormantEnergyMutation() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var edward = actor(rules, 1, 10505004, 5);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                state(edward, 1, 2), state(new Actor(2, List.of()), 2, 2),
                state(new Actor(3, List.of()), 2, 3)));
        bind(engine, 1, 10505004, 1_000);
        bind(engine, 2, 10301001, 100);
        bind(engine, 3, 10301001, 100);
        engine.initializePassive(1, 105050042, 1);
        engine.beginRound(1, List.of(1, 2, 3), elements, chance -> chance > 0);
        engine.act(1, 2, 100, elements, chance -> chance > 0);
        assertEquals(Set.of(2, 3), engine.damages().stream()
                .filter(damage -> damage.buffId() == 5041201)
                .map(HeroBattleHealingExecutor.Damage::targetId).collect(Collectors.toSet()));
        assertEquals(List.of(5041701), buffs(engine, 1));
        assertEquals(List.of(5041501), buffs(engine, 2));
        assertEquals(List.of(5041501), buffs(engine, 3));
        engine.beginRound(2, List.of(1, 2, 3), elements, chance -> chance > 0);
        engine.attack(1, 2, elements, chance -> chance > 0);
        assertEquals(5042301, engine.damages().getLast().buffId());
        assertEquals(List.of(5042401), buffs(engine, 2));
        assertTrue(engine.trace().stream().anyMatch(event -> event.configId() == 5042201));
        assertFalse(engine.trace().stream().anyMatch(event -> event.configId() == 5041301 || event.configId() == 5042601));
    }

    /** 读取真实模板的现有技能排期，复用副本的初始强化档。 */
    private static Actor actor(HeroSkillPanelRules rules, int id, int template, int stars) {
        return new Actor(id, rules.battleSchedule(rules.select(template, stars, 0)));
    }

    /** 从原配置读取指定档位的普攻和保护技，隔离其它成长技能对分伤战报的影响。 */
    private static Actor shelterActor(HeroSkillPanelRules rules, int id, int ordinary, int protection, int level) {
        return new Actor(id, rules.battleSchedule(List.of(new Skill(ordinary, 0), new Skill(protection, level))));
    }

    /** 提供比单次技能伤害更高的固定生命，留出多段验证空间。 */
    private static State state(Actor actor, int faction, int position) {
        return new State(actor, faction, position, 10_000, 10_000, 100, 0, 0, 0);
    }

    /** 冻结本专项用到的真实计算输入，控制与护甲保持常规基值。 */
    private static void bind(HeroBattleHealingExecutor engine, int id, int template, long attack) {
        engine.bindCombatData(id, template, Map.of(220, attack, 150, 500L));
    }

    /** 方便核对某个单位身上仍有效的配置及安装顺序。 */
    private static List<Integer> buffs(HeroBattleHealingExecutor engine, int unitId) {
        return engine.buffs(unitId).stream().map(entry -> entry.spec().id()).toList();
    }
}
