/** 按原配置运行指定范围的守军实战，验证高战力玩家快速通关时容易跳过的守军动作和回放。 */
package com.funsgamex.mxzg.dreamland;

import com.funsgamex.mxzg.hero.HeroBattleAttributeUtils;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.Unit;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class DreamlandGuardReplayTest {
    /** 让守军有充分出手时间；指定起点时导出实际守军战报，供客户端交叉解码。 */
    @Test
    void guardsCanActAcrossConfiguredRange() throws Exception {
        int limit = Integer.getInteger("mxzg.test.dreamland.floor-limit", 35);
        int exportFrom = Integer.getInteger("mxzg.test.dreamland.guard-replays.from", 0);
        var exportDirectory = Path.of("target", "dreamland-guard-replays");
        if (exportFrom > 0) {
            Files.createDirectories(exportDirectory);
        }
        var mapper = new ObjectMapper();
        var config = new DreamlandRules(mapper, limit);
        var simulator = new HeroLineupBattleService(null, mapper);
        var observer = observerTeam(mapper);
        for (int floor = 1; floor <= limit; floor++) {
            var stage = config.stage(floor);
            var result = assertDoesNotThrow(() -> simulator.dreamland(stage.floor(), observer, stage.enemies(),
                    Map.of(), Map.of(), 0, 0, chance -> chance > 0D), "守军实战第 " + stage.floor() + " 层");
            assertEquals("dreamland:" + floor, result.report().scenario());
            assertTrue(result.report().turns().stream().anyMatch(turn -> turn.sourceId() > 8),
                    "守军须真实出手：第 " + floor + " 层");
            if (exportFrom > 0 && floor >= exportFrom) {
                Files.write(exportDirectory.resolve("floor-" + floor + ".pb"),
                        HeroBattleReplayProtocolUtils.encode(result.report()).toByteArray());
            }
        }
    }

    /** 使用真实普攻和基础速度，给测试攻方提高生命、降低攻击，延长观察守军的窗口。 */
    private List<Unit> observerTeam(ObjectMapper mapper) {
        var growth = new HeroGrowthRules(mapper);
        var rules = new HeroSkillPanelRules(mapper);
        int[] positions = {2, 3, 5, 6, 7, 8};
        int[] templates = {10204013, 10105010, 10205011, 10105011, 10305010, 10205023};
        int star = 9;
        int level = 100;
        int stage = 3;
        var team = new ArrayList<Unit>();
        for (int index = 0; index < positions.length; index++) {
            int template = templates[index];
            int position = positions[index];
            var stats = growth.stats(template, star, level, stage);
            var attributes = Map.of(101, (long) stats.spd(), 150, 500L, 220, 1L, 223, 1_000_000L,
                    224, (long) stats.def());
            var ordinary = rules.battleSchedule(rules.select(template, star, stage)).stream()
                    .filter(skill -> skill.activeType() == 2).toList();
            team.add(new Unit(position, 1, template, level, star, stage, position, attributes,
                    HeroBattleAttributeUtils.opening(attributes), ordinary, null));
        }
        return List.copyOf(team);
    }
}
