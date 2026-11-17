/**
 * type11纯客户端近身表现的通用规则回归，依据旧BuffType及ClientBuffHandler。
 * 使用同源动作和独立战场，验证表现不增加伤害；新版保留原表声明/既有wire，旧Cache另有排序。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import static org.junit.jupiter.api.Assertions.*;

class HeroBattleNearStrikeTest {
    /** 每例独立配置实例，坏配置注入不会影响其他测试或原配置文件。 */
    private final ObjectMapper mapper = new ObjectMapper();

    /** 直接复用生产预检，不维护仅供第4关通过的编号白名单。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(mapper);

    /** 当前真实type11均是必中、无下游动作的纯表现，包含其他英雄而非只特许诺亚。 */
    @Test
    void acceptsAllCurrentPureTypeElevenConfigurationsByType() throws Exception {
        try (var stream = getClass().getResourceAsStream("/gameplay/buff.json")) {
            assertNotNull(stream);
            var ids = new ArrayList<Integer>();
            for (var row : mapper.readTree(stream).path("rows")) {
                if (row.path("type").asInt() == 11) {
                    int id = row.path("idx").asInt();
                    ids.add(id);
                    assertTrue(rules.battleProjectile(id), "真实纯type11应通过：" + id);
                }
            }
            assertTrue(ids.containsAll(List.of(1110200, 1140200, 3050300, 5130200)));
        }
    }

    /** 诺亚沿新版原表声明/既有wire先伤害后表现；不声称这是旧Cache排序，type11不额外扣血。 */
    @Test
    void realNoahOrdinaryAttackRetainsDamageThenPresentationOrder() {
        var schedule = rules.battleSchedule(rules.select(10304005, 4, 0));
        var states = List.of(
            new State(new Actor(2, schedule), 1, 2, 1000, 1000, 100, 0, 0, 0),
            new State(new Actor(10, schedule), 2, 2, 1000, 1000, 100, 0, 0, 0));
        var engine = new HeroBattleHealingExecutor(rules, states);
        for (int id : List.of(2, 10)) {
            engine.bindCombatData(id, 10304005, Map.of(220, 100L, 223, 1000L, 150, 500L));
        }
        engine.attack(2, 10, new HeroBattleElementRules(mapper), rate -> rate == 1D);
        assertEquals(List.of("skill.begin", "damage", "presentation", "skill.end"),
            engine.trace().stream().map(HeroBattleHealingExecutor.Trace::kind).toList());
        assertEquals(3050200, engine.trace().get(1).configId());
        assertEquals(3050300, engine.trace().get(2).configId());
        assertEquals(1, engine.damages().size());
        assertEquals(100, engine.damages().getFirst().incoming());
        assertEquals(-100, engine.damages().getFirst().actual());
        assertEquals(-100, engine.damages().getFirst().reported());
        assertEquals(900, engine.state(10).hp());
        assertEquals(1, engine.presentations().size());
        assertTrue(engine.buffs(2).isEmpty());
        assertTrue(engine.buffs(10).isEmpty());
        assertTrue(engine.recoveries().isEmpty());
    }

    /** 通用type11不会放开概率或后续业务动作，未知表现类型也继续返回未支持。 */
    @Test
    void unsupportedProbabilityChildrenAndUnknownTypeRemainRejected() throws Exception {
        var row = mutableBuff(3050300);
        row.put("attach_percent", 5000);
        assertThrows(IllegalArgumentException.class, () -> rules.battleProjectile(3050300));
        row.put("attach_percent", 10000);
        row.put("art_list", "[3051101]");
        assertThrows(IllegalArgumentException.class, () -> rules.battleProjectile(3050300));
        row.put("art_list", "[]");
        row.put("type", 12);
        assertFalse(rules.battleProjectile(3050300));
        var ordinary = rules.battleSchedule(rules.select(10304005, 4, 0)).stream()
            .filter(skill -> skill.activeType() == 2).findFirst().orElseThrow();
        assertThrows(IllegalArgumentException.class, () -> rules.damageSkillArts(ordinary));
    }

    /** 仅对本测试独立规则对象注入非法表值，核验严格失败边界，不修改源JSON或共享对象。 */
    @SuppressWarnings("unchecked")
    private ObjectNode mutableBuff(int id) throws Exception {
        var field = HeroSkillPanelRules.class.getDeclaredField("tables");
        field.setAccessible(true);
        var tables = (Map<String, Map<Integer, JsonNode>>) field.get(rules);
        return (ObjectNode) tables.get("buff").get(id);
    }
}
