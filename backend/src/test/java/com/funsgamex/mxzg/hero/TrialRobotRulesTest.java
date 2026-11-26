/**
 * 勇者试炼机器人配置预检。全部机器人可能被原匹配规则选中，
 * 这里构建真实守军以发现旧模板、成长、初始属性和技能配置缺口，并按需逐队生成战报。
 */
package com.funsgamex.mxzg.hero;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class TrialRobotRulesTest {
    /** 全量构建原守军，按需导出实战战报供客户端复验。 */
    @Test
    void reportsSupportForEveryLegacyTeamWithoutReplacingAnySkills() throws Exception {
        var mapper = new ObjectMapper();
        var battle = new HeroBattleChapterScenario(mapper);
        var executor = new HeroLineupBattleService(null, mapper);
        var observer = observerFormation(mapper);
        boolean verifyAllReplays = Boolean.getBoolean("mxzg.test.trial.all-robot-replays");
        var exportDirectory = Path.of("target", "trial-guard-replays");
        if (verifyAllReplays) {
            Files.createDirectories(exportDirectory);
        }
        try (var source = getClass().getResourceAsStream("/gameplay/trial-rules.json")) {
            assertNotNull(source);
            var config = mapper.readTree(source);
            var robots = config.path("robots");
            int rounds = config.path("battleRounds").asInt();
            assertEquals(1_000, robots.size());
            var blocked = new ArrayList<Map<String, Object>>();
            var supported = new ArrayList<Integer>();
            var replayed = new ArrayList<Integer>();
            var replayFailures = new LinkedHashMap<Integer, String>();
            var groups = new LinkedHashMap<HeroBattleChapterScenario.TrialSkillGap, Integer>();
            for (var robot : robots) {
                var enemies = new ArrayList<HeroBattleChapterScenario.ConfiguredEnemy>();
                for (var sourceEnemy : robot.path("enemies")) {
                    enemies.add(mapper.treeToValue(sourceEnemy, HeroBattleChapterScenario.ConfiguredEnemy.class));
                }
                var units = battle.trialDefensePanel(battle.freezeTrialDefense(null, enemies), Map.of());
                assertEquals(6, units.size());
                var positions = new HashSet<Integer>();
                for (var unit : units) {
                    assertTrue(unit.faction() == 2 && unit.position() >= 1 && unit.position() <= 8
                            && unit.opening().hp() > 0 && positions.add(unit.position()));
                }
                var missing = battle.trialDefenseGaps(units);
                int id = robot.path("id").asInt();
                if (missing.isEmpty()) {
                    supported.add(id);
                    if (verifyAllReplays || id == 15) {
                        verifyGuardReplay(executor, observer, units, rounds, id, replayed, replayFailures,
                                verifyAllReplays ? exportDirectory : null);
                    }
                } else {
                    blocked.add(Map.of("id", id, "power", robot.path("power").asLong(), "gaps", missing));
                    missing.forEach(gap -> groups.merge(gap, 1, Integer::sum));
                }
            }
            var summarized = groups.entrySet().stream().sorted(Map.Entry.<HeroBattleChapterScenario.TrialSkillGap,
                    Integer>comparingByValue().reversed()).map(entry -> Map.of("gap", entry.getKey(),
                            "teams", entry.getValue())).toList();
            mapper.writerWithDefaultPrettyPrinter().writeValue(java.nio.file.Path
                    .of("target/trial-robot-compatibility.json").toFile(),
                    Map.of("supportedTeams", supported, "blockedTeams", blocked, "groups", summarized,
                            "replayedTeams", replayed, "replayFailures", replayFailures));
            assertTrue(replayFailures.isEmpty(), "守军技能预检通过后仍无法生成战报：" + replayFailures);
            assertTrue(blocked.isEmpty(), "原守军仍有技能缺口：" + summarized);
        }
    }

    /** 使用真实试炼回合数和原守军技能执行战斗，可选将成功战报写入指定目录。 */
    private static void verifyGuardReplay(HeroLineupBattleService executor, HeroBattleInputService.Input observer,
            List<HeroBattleChapterScenario.Unit> units, int rounds, int id,
            List<Integer> replayed, Map<Integer, String> failures, Path exportDirectory) throws java.io.IOException {
        try {
            var replay = executor.trial("trial:1:1", observer, units, Map.of(), rounds, chance -> chance > 0D);
            if (replay.turns().stream().noneMatch(turn -> turn.sourceId() > 8)) {
                failures.put(id, "守军没有出手");
                return;
            }
            if (exportDirectory != null) {
                Files.write(exportDirectory.resolve("team-" + id + ".pb"),
                        HeroBattleReplayProtocolUtils.encode(replay).toByteArray());
            }
            replayed.add(id);
        } catch (RuntimeException failure) {
            failures.put(id, failure.getClass().getSimpleName() + ": " + failure.getMessage());
        }
    }

    /** 测试攻方只使用原始普攻，提高生命以观察守军多个回合，不覆盖其模板、属性或技能。 */
    private static HeroBattleInputService.Input observerFormation(ObjectMapper mapper) {
        int template = 10101001;
        var rules = new HeroSkillPanelRules(mapper);
        var defense = new HeroBattleDefenseRules(mapper);
        var elementRules = new HeroBattleElementRules(mapper);
        var selected = rules.select(template, 1, 0);
        var schedule = rules.battleSchedule(selected);
        var attributes = Map.of(101, 100L, 150, defense.coefficient(1), 220, 1L, 223, 20_000_000L, 224, 100L);
        var units = new ArrayList<HeroBattleInputService.Unit>();
        for (int position : List.of(2, 3, 5, 6, 7, 8)) {
            var hero = new HeroProfile("trial-observer-" + position, template, 1, 1, false, true, 0, null, null,
                    null, new HeroEvolutionRules.State(0, 0, null), null, Map.of(), List.of());
            units.add(new HeroBattleInputService.Unit(position, hero, attributes, selected,
                    HeroBattleAttributeUtils.opening(attributes), schedule, elementRules.element(template)));
        }
        return new HeroBattleInputService.Input(0, 0, 1, units, List.of());
    }
}
