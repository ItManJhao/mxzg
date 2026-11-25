/**
 * type1空客户端动作的通用预检与实际执行回归，沿旧BT_AMIN/ClientBuffHandler记录表现。
 * 新版保留原表声明及既有wire顺序，不声称等同旧Cache的非逻辑前置排序；Lua覆盖演出另核。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import static org.junit.jupiter.api.Assertions.*;

class HeroBattleEmptyAnimationTest {
    /** 每例创建独立解析器和规则，非法值注入不影响共享对象或源表。 */
    private final ObjectMapper mapper = new ObjectMapper();

    /** 直接复用生产客户端表现预检，不维护第5关专属动作映射。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(mapper);

    /** 四个空占位及金妮原表遮罩可以播放；错配的金妮遮罩与神祇音效仍须被拒绝。 */
    @Test
    void acceptsEmptyPlaceholdersAndJinnyMaskWithoutOpeningSoundOnlyTypeOne() throws Exception {
        for (int id : List.of(1130200, 2050100, 2160100, 4130100)) {
            assertTrue(rules.battleProjectile(id));
        }
        assertTrue(rules.battleProjectile(1150100));
        mutableBuff(1150100).put("dimly", 0);
        assertThrows(IllegalArgumentException.class, () -> rules.battleProjectile(1150100));
        assertThrows(IllegalArgumentException.class, () -> rules.battleProjectile(9011601));
        var ordinary = rules.battleSchedule(rules.select(10204005, 4, 0)).stream()
            .filter(skill -> skill.activeType() == 2).findFirst().orElseThrow();
        assertEquals(List.of(2050100, 2050200, 2050300), rules.damageSkillArts(ordinary).getFirst().buffs());
    }

    /** 寒冬普攻保留新版原表声明/既有wire的type1、唯一伤害、type3顺序，不按客户端覆盖删记录。 */
    @Test
    void winterOrdinaryAttackKeepsEmptyDamageAndRangeOrder() {
        var schedule = rules.battleSchedule(rules.select(10204005, 4, 0));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(2, schedule), 1, 2, 1000, 1000, 100, 0, 0, 0),
            new State(new Actor(10, schedule), 2, 2, 1000, 1000, 100, 0, 0, 0)));
        for (int id : List.of(2, 10)) {
            engine.bindCombatData(id, 10204005, Map.of(220, 100L, 223, 1000L, 150, 500L));
        }
        engine.attack(2, 10, new HeroBattleElementRules(mapper), rate -> rate == 1D);
        assertEquals(List.of("skill.begin", "presentation", "damage", "presentation", "skill.end"),
            engine.trace().stream().map(HeroBattleHealingExecutor.Trace::kind).toList());
        assertEquals(List.of(2050100, 2050300), engine.presentations().stream()
            .map(HeroBattleHealingExecutor.Presentation::buffId).toList());
        assertEquals(1, engine.damages().size());
        assertEquals(2050200, engine.damages().getFirst().buffId());
        assertEquals(100, engine.damages().getFirst().incoming());
        assertEquals(-100, engine.damages().getFirst().actual());
        assertEquals(100, HeroBattleReplayProtocolUtils.totalDamage(engine.damages(), 2));
        assertEquals(900, engine.state(10).hp());
        assertTrue(engine.buffs(2).isEmpty());
        assertTrue(engine.buffs(10).isEmpty());
        assertTrue(engine.recoveries().isEmpty());
    }

    /** 空1号仍严格拒绝未知概率、下游、音效/动画/资源、震屏或遮罩，不能靠缺字段默认为空。 */
    @Test
    void rejectsNonemptyOrUnresolvedPlaceholderBranches() throws Exception {
        var row = mutableBuff(2050100);
        row.put("attach_percent", 9999);
        assertThrows(IllegalArgumentException.class, () -> rules.battleProjectile(2050100));
        row.put("attach_percent", 10000);
        row.put("art_list", "[2051101]");
        assertThrows(IllegalArgumentException.class, () -> rules.battleProjectile(2050100));
        row.put("art_list", "{}");
        assertThrows(IllegalArgumentException.class, () -> rules.battleProjectile(2050100));
        row.put("art_list", "[]");
        for (String field : List.of("file", "sound")) {
            row.put(field, "[\"unknown\"]");
            assertThrows(IllegalArgumentException.class, () -> rules.battleProjectile(2050100));
            row.put(field, "[]");
        }
        row.put("ani_base", "{\"format\":\"unknown/%d.png\"}");
        assertThrows(IllegalArgumentException.class, () -> rules.battleProjectile(2050100));
        row.put("ani_base", "{}");
        for (String field : List.of("shake", "dimly")) {
            row.put(field, 1);
            assertThrows(IllegalArgumentException.class, () -> rules.battleProjectile(2050100));
            row.put(field, 0);
        }
        row.remove("sound");
        assertThrows(RuntimeException.class, () -> rules.battleProjectile(2050100));
    }

    /** 只改本例规则实例中的表对象，测试结束即丢弃，不修改原JSON及其他测试的规则。 */
    @SuppressWarnings("unchecked")
    private ObjectNode mutableBuff(int id) throws Exception {
        var field = HeroSkillPanelRules.class.getDeclaredField("tables");
        field.setAccessible(true);
        var tables = (Map<String, Map<Integer, JsonNode>>) field.get(rules);
        return (ObjectNode) tables.get("buff").get(id);
    }
}
