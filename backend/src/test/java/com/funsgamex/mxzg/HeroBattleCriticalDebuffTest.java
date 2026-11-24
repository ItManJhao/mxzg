/**
 * type8纯表现与固定207暴击属性动作的领域回归，依据旧ClientBuffHandler和AbilityAdd处理链。
 * 使用同源技能及独立内存战场，验证负属性、真实读取、生命周期和事务回滚，不开放玩家范围。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroBattleSkillUtils;
import com.funsgamex.mxzg.hero.HeroEvolutionRules;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import static org.junit.jupiter.api.Assertions.*;

class HeroBattleCriticalDebuffTest {
    /** 每例独立配置解析器，非法配置只改本测试对象，不修改源JSON。 */
    private final ObjectMapper mapper = new ObjectMapper();
    /** 共用真实预检和技能元数据，没有第9关专属编号分发表。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(mapper);
    /** 同源元素规则；边界靶使用相同模板以隔离元素修正。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(mapper);

    /** 完整主动的三个真实等级都保留type8、90%伤害及原固定-1250，而不是只跳过第一项预检。 */
    @Test
    void preflightKeepsWholeSkillAndAllPureTypeEightDefinitions() throws Exception {
        for (int level : List.of(1, 2, 3)) {
            assertEquals(List.of(1051100 + level, 1051200 + level, 1051300 + level),
                rules.damageSkillArts(active(level)).getFirst().buffs());
            assertTrue(rules.battleDirectAttribute(1051300 + level));
            assertEquals(new HeroSkillPanelRules.ControlAttributeDefinition(1051300 + level, 207, -1250, 2),
                rules.controlAttribute(1051300 + level));
        }
        try (var stream = getClass().getResourceAsStream("/gameplay/buff.json")) {
            assertNotNull(stream);
            int count = 0;
            for (var row : mapper.readTree(stream).path("rows")) {
                if (row.path("type").asInt() == 8) {
                    assertTrue(rules.battleProjectile(row.path("idx").asInt()));
                    count++;
                }
            }
            assertTrue(count > 3);
        }
    }

    /** 后排选择沿真实[3,4,7]；每个目标先记录伤害再安装属性，不影响前排或额外扣血。 */
    @Test
    void fullSkillOnlyReducesBackRowCriticalAndKeepsDeclaredWireOrder() {
        var engine = engine(5000, true, false);
        engine.attack(2, 13, elements, rate -> rate == 1D);
        assertTrue(engine.buffs(10).isEmpty());
        assertEquals(List.of(13, 14), engine.damages().stream().map(HeroBattleHealingExecutor.Damage::targetId).toList());
        assertEquals(List.of(90L, 90L), engine.damages().stream().map(HeroBattleHealingExecutor.Damage::incoming).toList());
        var trace = engine.trace();
        assertEquals(List.of("skill.begin", "presentation", "presentation", "damage", "damage",
            "buff.upsert", "buff.upsert", "skill.end"), trace.stream().map(HeroBattleHealingExecutor.Trace::kind).toList());
        for (int target : List.of(13, 14)) {
            var entry = engine.buffs(target).getFirst();
            assertEquals(1051301, entry.spec().id());
            assertEquals(2, entry.sourceId());
            assertEquals(3, entry.expiresAt());
            assertEquals(2, entry.spec().effect());
            assertEquals(0.375D, criticalRate(engine, target));
        }
    }

    /** 207固定减值可能使暴击率为负，沿原读取不夹零、不改为当前暴击率乘12.5%。 */
    @Test
    void negativeCriticalRateIsReadWithoutClampingOrRescaling() {
        var engine = engine(0, false, false);
        engine.attack(2, 13, elements, rate -> rate == 1D);
        assertEquals(-0.125D, criticalRate(engine, 13));
        engine.expireAt(3);
        assertEquals(0D, criticalRate(engine, 13));
    }

    /** 冲突按组跨来源替换，驱散/到期只减回一次；死亡沿原清理，不能遗留或重复撤销属性。 */
    @Test
    void replaceDispelExpireAndDeathReuseExistingLifecycleExactlyOnce() {
        for (String mode : List.of("replace", "dispel", "expire", "death")) {
            var engine = engine(5000, false, false);
            engine.attack(2, 13, elements, rate -> rate == 1D);
            long original = engine.buffs(13).getFirst().instanceId();
            switch (mode) {
                case "replace" -> {
                    engine.attack(3, 13, elements, rate -> rate == 1D);
                    assertEquals(1, engine.buffs(13).size());
                    assertEquals(3, engine.buffs(13).getFirst().sourceId());
                    assertNotEquals(original, engine.buffs(13).getFirst().instanceId());
                    assertEquals("replace", engine.removals().getFirst().reason());
                    assertEquals(0.375D, criticalRate(engine, 13));
                    engine.expireAt(3);
                }
                case "dispel" -> {
                    engine.dispel(13, 2);
                    engine.dispel(13, 2);
                }
                case "expire" -> {
                    engine.expireAt(2);
                    assertEquals(0.375D, criticalRate(engine, 13));
                    engine.expireAt(3);
                }
                case "death" -> {
                    engine.setOnceAttribute(2, 220, 10_000_000L);
                    engine.ordinaryDamage(1011401, 2, List.of(13), 1, false, 0, elements, rate -> rate == 1D);
                    assertTrue(engine.state(13).actor().isDead());
                    assertEquals("death", engine.removals().getLast().reason());
                }
                default -> fail("未知生命周期夹具");
            }
            assertTrue(engine.buffs(13).isEmpty());
            if (!mode.equals("death")) {
                assertEquals(0.5D, criticalRate(engine, 13));
            }
            int removed = engine.removals().size();
            engine.expireAt(5);
            assertEquals(removed, engine.removals().size());
            assertEquals(mode.equals("replace") ? 2 : 1, removed);
        }
    }

    /** 后目标属性溢出时撤回前目标的扣血、属性和实例，不能在完整技能失败后留下半组结果。 */
    @Test
    void laterAttributeFailureRollsBackEarlierTargetsAndDamage() {
        var engine = engine(5000, true, true);
        assertThrows(ArithmeticException.class, () -> engine.attack(2, 13, elements, rate -> rate == 1D));
        for (int target : List.of(13, 14)) {
            assertEquals(100_000, engine.state(target).hp());
            assertTrue(engine.buffs(target).isEmpty());
        }
        assertTrue(engine.damages().isEmpty());
        assertTrue(engine.trace().isEmpty());
        assertTrue(engine.removals().isEmpty());
        assertEquals(0.5D, criticalRate(engine, 13));
    }

    /** 配置化概率保留万分比，非法值、未核对复制分支与真实子动作仍做完整预检。 */
    @Test
    void unsupportedConditionalAttributeAndPresentationRemainRejected() throws Exception {
        var row = mutableBuff(1051301);
        for (String value : List.of("208|-1250|0|0", "207|-1250|1|0", "207|-2147483649|0|0")) {
            row.put("value", value);
            assertThrows(IllegalArgumentException.class, () -> rules.damageSkillArts(active(1)));
        }
        row.put("value", "207|-1250|0|0");
        row.put("attach_percent", 10001);
        assertThrows(IllegalArgumentException.class, () -> rules.damageSkillArts(active(1)));
        row.put("attach_percent", 9999);
        assertEquals(0.9999D, rules.directAttributeChance(1051301));
        assertDoesNotThrow(() -> rules.damageSkillArts(active(1)));
        row.put("copy_target", 1);
        assertThrows(IllegalArgumentException.class, () -> rules.damageSkillArts(active(1)));
        row.put("copy_target", 0);
        row.put("attach_percent", 10000);
        row.put("art_list", "[1051101]");
        assertThrows(IllegalArgumentException.class, () -> rules.damageSkillArts(active(1)));
        row.put("art_list", "[]");
        var presentation = mutableBuff(1051101);
        presentation.put("attach_percent", 5000);
        assertThrows(IllegalArgumentException.class, () -> rules.damageSkillArts(active(1)));
        presentation.put("attach_percent", 10000);
        presentation.put("art_list", "[1051101]");
        assertThrows(IllegalArgumentException.class, () -> rules.damageSkillArts(active(1)));
    }

    /** 幻境原守军保留负暴击、负攻防、虚弱以及数值为零的固定状态，一次性护甲与条件虚弱分开。 */
    @Test
    void readsIndependentFixedProbabilitiesAndInheritedStatusEffect() {
        var attributes = Map.of(
            2211501, List.of(207, -1000, 2, 3000),
            3201301, List.of(230, 2000, 2, 5000),
            4071401, List.of(202, -3000, 2, 7000),
            4101301, List.of(201, -2000, 2, 6000),
            1151301, List.of(222, 0, 1, 10000));
        attributes.forEach((id, row) -> {
            assertTrue(rules.battleDirectAttribute(id));
            assertEquals(new HeroSkillPanelRules.ControlAttributeDefinition(id, row.get(0), row.get(1), row.get(2)),
                rules.controlAttribute(id));
            assertEquals(row.get(3) / 10000D, rules.directAttributeChance(id));
        });
        assertTrue(rules.battleStatusCondition(4091201));
        assertEquals(Set.of(1204), rules.statusConditionValues(4091201));
        assertTrue(rules.immediateArts(4091201).getFirst().targets().selectors().isEmpty());
        assertEquals(List.of(4091301), rules.immediateArts(4091201).getFirst().buffs());
        assertEquals(new HeroSkillPanelRules.ControlAttributeDefinition(4091301, 230, 1500, 0),
            rules.onceDamageAttribute(4091301));
        assertEquals(new HeroSkillPanelRules.ControlAttributeDefinition(4091401, 202, -3000, 0),
            rules.onceDamageAttribute(4091401));
    }

    /** 由原技能行解析等级元数据，不用手工技能表代替真实动作列表。 */
    private HeroBattleSkillUtils.Skill active(int level) {
        return rules.battleSchedule(List.of(new HeroEvolutionRules.Skill(101040051, level))).getFirst();
    }

    /** 独立高血量属性边界靶；两个来源和前后排用于观察冲突及多目标，不冒充玩家关卡。 */
    private HeroBattleHealingExecutor engine(long critical, boolean twoBackTargets, boolean overflow) {
        var active = rules.battleSchedule(rules.select(10104005, 4, 0));
        var ordinary = active.stream().filter(skill -> skill.activeType() == 2).toList();
        var states = new ArrayList<State>();
        states.add(new State(new Actor(2, active), 1, 2, 100_000, 100_000, 100, 0, 0, 0));
        states.add(new State(new Actor(3, active), 1, 3, 100_000, 100_000, 100, 0, 0, 0));
        states.add(new State(new Actor(10, ordinary), 2, 2, 100_000, 100_000, 100, 0, 0, 0));
        states.add(new State(new Actor(13, ordinary), 2, 5, 100_000, 100_000, 100, 0, 0, 0));
        if (twoBackTargets) {
            states.add(new State(new Actor(14, ordinary), 2, 6, 100_000, 100_000, 100, 0, 0, 0));
        }
        var engine = new HeroBattleHealingExecutor(rules, states);
        for (var state : states) {
            engine.bindCombatData(state.actor().id(), 10104005, Map.of(220, 100L, 223, 100_000L,
                150, 500L, 207, state.faction() == 1 ? 0L : state.actor().id() == 14 && overflow ? Long.MIN_VALUE : critical));
        }
        engine.beginRound(1, states.stream().map(state -> state.actor().id()).toList(), elements, rate -> rate == 1D);
        return engine;
    }

    /** 从目标下一次真实伤害的暴击抽样读取当前207，不增加另一份战斗属性访问口。 */
    private double criticalRate(HeroBattleHealingExecutor engine, int source) {
        var rates = new ArrayList<Double>();
        engine.ordinaryDamage(1011401, source, List.of(2), 1, false, 0, elements, rate -> {
            rates.add(rate);
            return rate == 1D;
        });
        assertTrue(rates.size() >= 2);
        return rates.get(1);
    }

    /** 对本例规则对象注入非法配置，源文件与其他测试配置不变。 */
    @SuppressWarnings("unchecked")
    private ObjectNode mutableBuff(int id) throws Exception {
        var field = HeroSkillPanelRules.class.getDeclaredField("tables");
        field.setAccessible(true);
        var tables = (Map<String, Map<Integer, JsonNode>>) field.get(rules);
        return (ObjectNode) tables.get("buff").get(id);
    }
}
