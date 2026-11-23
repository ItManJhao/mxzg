/**
 * 验证神装四件套的配置等级、触发时点、伤害和护盾。
 * 使用旧表中的技能和独立战斗执行器，固定命中与触发抽样，避免随机通过。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.GodEquipmentRepository;
import com.funsgamex.mxzg.hero.GodEquipmentRules;
import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Invocation;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Damage;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleGodEquipmentTest {
    /** 使用与正式服务相同的打包配置。 */
    private final ObjectMapper mapper = new ObjectMapper();
    /** 提供实际技能排期、目标选择和效果参数。 */
    private final HeroSkillPanelRules skills = new HeroSkillPanelRules(mapper);
    /** 使用真实元素规则，本测试双方同模板，无额外克制。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(mapper);

    /** 同套四个不同槽位才生效，混搭无技能，等级取四件中最低星级。 */
    @Test
    void fourMatchingSlotsUseTheLowestStar() {
        var equipment = new GodEquipmentRules(mapper);
        var items = new ArrayList<GodEquipmentRepository.Item>();
        // 本例只比较选出的技能，数值叠加由神装属性用例覆盖。
        BiConsumer<Integer, Long> ignoreAttribute = (type, value) -> {};
        for (int setType = 10; setType <= 13; setType++) {
            items.clear();
            for (int slot = 1; slot <= 4; slot++) {
                int starPrefix = slot == 4 ? 1_040_000 : 1_080_000;
                int template = starPrefix + slot * 100 + setType;
                var item = equipment.require(template);
                items.add(new GodEquipmentRepository.Item("slot-" + slot, item.templateId(), item.slot(),
                    "hero", List.of(), List.of(), item.star(), item.quality()));
            }
            assertTrue(equipment.contribute(items.subList(0, 3), ignoreAttribute).isEmpty());
            assertEquals(List.of(new HeroEvolutionRules.Skill(300100001 + (13 - setType) * 100000, 1)),
                equipment.contribute(items, ignoreAttribute));
            var mixed = new ArrayList<>(items);
            mixed.set(3, new GodEquipmentRepository.Item("mixed", 1040401, 4, "hero", List.of(), List.of(), 1, 1));
            assertTrue(equipment.contribute(mixed, ignoreAttribute).isEmpty());
        }
    }

    /** 五级治疗盾按本次基础治疗的24%创建，接收治疗和禁疗都不会替佩戴者触发。 */
    @Test
    void treatmentShieldUsesCurrentBaseHeal() {
        var engine = engine(false, 9_960, 10_000, 10_000);
        engine.initializePassive(1, 300100001, 5);
        engine.art(new Invocation(1, 2143502, 2, 1));
        assertTrue(engine.recoveries().stream().anyMatch(heal -> heal.sourceId() == 2 && heal.targetId() == 1));
        assertFalse(engine.buffs(1).stream().anyMatch(entry -> entry.spec().id() == 10011205));

        engine.state(1).actor().control(1009, true);
        engine.art(new Invocation(1, 1063201, 1, 1));
        assertFalse(engine.buffs(1).stream().anyMatch(entry -> entry.spec().id() == 10011205));

        engine.state(1).actor().control(1009, false);
        engine.art(new Invocation(1, 1063201, 1, 1));
        assertTrue(engine.recoveries().getLast().actual() < 500, "治疗溢出不改变盾值");
        var shield = engine.buffs(1).stream().filter(entry -> entry.spec().id() == 10011205).findFirst().orElseThrow();
        assertEquals(120, shield.value());
        assertEquals(2, shield.expiresAt());
        assertEquals(1, shield.sourceId());
    }

    /** 只有真正暴击才进入配置抽样，附伤取敌方最大生命15%，受自身攻击120%限制。 */
    @Test
    void criticalDamageRequiresActualCriticalAndCapsAtAttackPercent() {
        var rolls = new ArrayList<Double>();
        var noCrit = engine(false, 10_000, 10_000, 10_000);
        noCrit.initializePassive(1, 300200001, 1);
        noCrit.attack(1, 2, elements, chance -> {
            rolls.add(chance);
            return chance >= 1;
        });
        assertFalse(rolls.contains(0.25));
        assertEquals(1, noCrit.damages().size());
        rolls.clear();

        var rejected = engine(false, 10_000, 10_000, 10_000);
        rejected.initializePassive(1, 300200001, 1);
        rejected.attack(1, 2, elements, chance -> {
            rolls.add(chance);
            return chance > 0 && chance != 0.25;
        });
        assertTrue(rolls.contains(0.25));
        assertEquals(1, rejected.damages().size());

        var critical = engine(false, 10_000, 10_000, 10_000);
        critical.initializePassive(1, 300200001, 1);
        critical.attack(1, 2, elements, chance -> chance > 0);
        assertEquals(List.of(new Damage(10021201, 1, 2, 1200, 0, -1200, -1200, false)),
            critical.damages().stream().filter(hit -> hit.buffId() == 10021201).toList());

        rolls.clear();
        var lowerHp = engine(false, 10_000, 10_000, 4_000);
        lowerHp.initializePassive(1, 300200001, 5);
        lowerHp.attack(1, 2, elements, chance -> {
            rolls.add(chance);
            return chance > 0;
        });
        assertTrue(rolls.contains(0.29));
        assertEquals(600, lowerHp.damages().stream()
            .filter(hit -> hit.buffId() == 10021205).findFirst().orElseThrow().incoming());
    }

    /** 强蓄力在首回合开始即生效，后续按五回合独立期限保留最近五层。 */
    @Test
    void chargeStacksFromFirstRoundAndExpiresIndividually() {
        var engine = engine(false, 20_000, 20_000, 30_000);
        engine.initializePassive(1, 300300001, 1);
        var damage = new ArrayList<Long>();
        for (int round = 1; round <= 7; round++) {
            engine.beginRound(round, List.of(1, 2), elements, chance -> chance >= 1);
            engine.attack(1, 2, elements, chance -> chance >= 1);
            damage.add(engine.damages().getLast().incoming());
        }
        assertEquals(List.of(1030L, 1060L, 1090L, 1120L, 1150L, 1150L, 1150L), damage);
        var layers = engine.buffs(1).stream().filter(entry -> entry.spec().id() == 10031201).toList();
        assertEquals(List.of(8, 9, 10, 11, 12), layers.stream().map(entry -> entry.expiresAt()).sorted().toList());
    }

    /** 普攻和主动命中后分别反噬一次，扣当前攻击者生命，按佩戴者最大生命计算。 */
    @Test
    void backlashRetaliatesAfterEachQualifiedHit() {
        var ordinary = engine(false, 10_000, 10_000, 20_000);
        ordinary.initializePassive(2, 300400001, 1);
        ordinary.beginRound(1, List.of(1, 2), elements, chance -> chance > 0);
        ordinary.attack(1, 2, elements, chance -> false);
        assertTrue(ordinary.damages().isEmpty());
        ordinary.attack(1, 2, elements, chance -> chance > 0);
        assertEquals(List.of(new Damage(10041301, 2, 1, 500, 0, -500, -500, false)),
            ordinary.damages().stream().filter(hit -> hit.buffId() == 10041301).toList());
        assertEquals(1, ordinary.damages().getFirst().sourceId());

        var active = engine(true, 10_000, 10_000, 20_000);
        active.initializePassive(2, 300400001, 5);
        active.beginRound(1, List.of(1, 2), elements, chance -> chance > 0);
        active.act(1, 2, 100, elements, chance -> chance > 0);
        assertEquals(List.of(new Damage(10041305, 2, 1, 580, 0, -580, -580, false)),
            active.damages().stream().filter(hit -> hit.buffId() == 10041305).toList());
    }

    /** 构造同模板的受控双方，保留50%暴击概率以便区分命中、暴击和附伤抽样。 */
    private HeroBattleHealingExecutor engine(boolean active, long sourceHp, long sourceMax,
                                            long targetMax) {
        var selected = new ArrayList<HeroEvolutionRules.Skill>();
        selected.add(new HeroEvolutionRules.Skill(101010010, 0));
        if (active) {
            selected.add(new HeroEvolutionRules.Skill(101010011, 1));
        }
        var engine = new HeroBattleHealingExecutor(skills, List.of(
            new State(new Actor(1, skills.battleSchedule(selected)), 1, 2, sourceHp, sourceMax, 1000, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 2, targetMax, targetMax, 1000, 0, 0, 0)));
        engine.bindCombatData(1, 10101001, Map.of(220, 1000L, 223, sourceMax, 150, 500L, 207, 5_000L));
        engine.bindCombatData(2, 10101001, Map.of(220, 1000L, 223, targetMax, 150, 500L));
        return engine;
    }
}
