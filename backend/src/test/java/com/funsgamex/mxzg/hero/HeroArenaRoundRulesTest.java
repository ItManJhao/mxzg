/** 用实际战斗执行器验证竞技场回合上限和双方累计攻击，不改生产阵容配置。 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.ConfiguredEnemy;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.Result;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Damage;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroArenaRoundRulesTest {
    /** 双方高生命保持至上限，按实际单位伤害检查第 7、8 回合累加，兼顾守方和攻方。 */
    @Test
    void incrementsBothTeamsAndEndsAtTwenty() {
        var json = new ObjectMapper();
        var engine = new HeroBattleChapterScenario(json);
        int template = 10101001;
        var skills = new HeroSkillPanelRules(json);
        var selected = skills.select(template, 1, 0);
        var attrs = Map.of(220, 1000L, 223, 20_000_000L, 224, 0L, 101, 100L,
                150, new HeroBattleDefenseRules(json).coefficient(1));
        var hero = new HeroProfile("attacker", template, 1, 1, false, true, 0, null, null, null,
                new HeroEvolutionRules.State(0, 0, null), null, Map.of(), List.of());
        var unit = new HeroBattleInputService.Unit(2, hero, attrs, selected,
                HeroBattleAttributeUtils.opening(attrs), skills.battleSchedule(selected),
                new HeroBattleElementRules(json).element(template));
        var input = new HeroBattleInputService.Input(0, 0, 1, List.of(unit), List.of());
        var opponents = IntStream.of(2, 3, 5, 6).mapToObj(position -> new ConfiguredEnemy(position, position,
                template, 1, 1, """
                    [{"type":220,"value":1000,"kind":1},{"type":223,"value":20000000,"kind":1},
                     {"type":224,"value":0,"kind":1}]
                    """, "[]", "[]")).toList();
        var bonuses = IntStream.rangeClosed(7, 20).boxed().collect(Collectors.toMap(round -> round, round -> 1000L));
        var baseline = engine.runArenaFormation("arena:1", input, opponents, Map.of(), chance -> chance >= 0.99);
        var result = engine.runArenaFormation("arena:1", input, opponents, bonuses, chance -> chance >= 0.99);
        HeroBattleReplayUtils.validate(result);
        assertEquals(20, result.rounds());
        assertEquals(HeroBattleRoundUtils.Outcome.DEFENDER_WIN, result.outcome());
        assertTrue(result.finalHp().values().stream().allMatch(hp -> hp > 0));
        for (int actor : List.of(2, 10)) {
            assertEquals(damage(baseline, 6, actor), damage(result, 6, actor));
            // 原 201 倍率加在元素光环上，配置攻击 1000 对应每轮增加约 100 的实际伤害。
            assertEquals(100, damage(result, 7, actor) - damage(baseline, 7, actor), 2);
            assertEquals(200, damage(result, 8, actor) - damage(baseline, 8, actor), 2);
        }
    }

    /** 返回该单位本回合造成的实际伤害合计，去掉战报扣血的负号。 */
    private static long damage(Result report, int round, int actor) {
        return -report.frames().stream().filter(frame -> frame.round() == round && frame.sourceId() == actor)
                .flatMap(frame -> frame.damages().stream()).mapToLong(Damage::actual).sum();
    }
}
