/** 选定旧1-1-1关卡的配置与主动技能依赖回归；尚非完整关卡胜负验收。 */
package com.funsgamex.mxzg;

import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.*;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleActiveScenarioTest {
    /** 核对关卡复合键，不能只按mission_id选出其他章节的第一关。 */
    @Test void selectedChapterHasOneRealEnemy() throws Exception {
        var rows = new ObjectMapper().readTree(getClass().getResourceAsStream("/gameplay/chapter.json")).path("rows");
        var enemies = new ArrayList<tools.jackson.databind.JsonNode>();
        for (var row : rows) if (row.path("mode_id").asInt() == 1 && row.path("chapter_id").asInt() == 1
            && row.path("mission_id").asInt() == 1 && row.path("hero_type").asInt() != 0) enemies.add(row);
        assertEquals(1, enemies.size());
        var enemy = enemies.getFirst();
        assertEquals(10101001, enemy.path("hero_type").asInt());
        assertEquals(1, enemy.path("hero_level").asInt());
        assertEquals(1, enemy.path("hero_star").asInt());
        assertEquals(2, enemy.path("pos").asInt());
    }

    /** 以真实1星/强化0技能计划创建单位；血量/攻击为规则夹具，非关卡完整数值声明。 */
    private HeroBattleHealingExecutor engine() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var selected = rules.select(10101001, 1, 0);
        assertEquals(Set.of(101010011, 101010010), new HashSet<>(selected.stream().map(HeroEvolutionRules.Skill::skillId).toList()));
        var plan = rules.battleSchedule(selected);
        var e = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, plan), 1, 2, 10000, 10000, 100, 0, 0, 0),
            new State(new Actor(2, plan), 2, 2, 10000, 10000, 100, 0, 0, 0)));
        e.bindCombatData(1, 10101001, Map.of(220, 100L, 150, 500L));
        e.bindCombatData(2, 10101001, Map.of(220, 100L, 150, 500L));
        return e;
    }

    /** 第一回合释放真实主动，201持续到期当回合仍先造成48%伤害，再移除。 */
    @Test void activeSkillInstallsAndExecutesRoundEffect() {
        var e = engine();
        var elements = new HeroBattleElementRules(new ObjectMapper());
        java.util.function.DoublePredicate hitOnly = rate -> rate >= 1;
        e.beginRound(1, List.of(1, 2), elements, hitOnly);
        e.act(1, 2, 100, elements, hitOnly);
        assertEquals(9900, e.state(2).hp());
        assertEquals(201, e.buffs(2).getFirst().spec().type());
        int expiry = e.buffs(2).getFirst().expiresAt();
        long hp = e.state(2).hp();
        for (int round = 2; round <= expiry; round++) {
            e.beginRound(round, List.of(1, 2), elements, hitOnly);
            hp -= 48;
            assertEquals(hp, e.state(2).hp());
        }
        assertTrue(e.buffs(2).isEmpty());
        e.beginRound(expiry + 1, List.of(1, 2), elements, hitOnly);
        assertEquals(hp, e.state(2).hp());
    }

    /** 冷却期间自动回退普通攻击，不能把每次出手都强行执行主动。 */
    @Test void cooldownFallsBackToOrdinaryAttack() {
        var e = engine();
        var elements = new HeroBattleElementRules(new ObjectMapper());
        java.util.function.DoublePredicate hitOnly = rate -> rate >= 1;
        e.beginRound(1, List.of(1, 2), elements, hitOnly);
        e.act(1, 2, 100, elements, hitOnly);
        e.beginRound(2, List.of(1, 2), elements, hitOnly);
        int count = e.buffs(2).size();
        e.act(1, 2, 100, elements, hitOnly);
        assertEquals(1010300, e.damages().getLast().buffId());
        assertEquals(count, e.buffs(2).size());
    }
}
