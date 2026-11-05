/** 候选主线关卡依赖审计：用同源表和实际技能预检生成清单，不执行未支持效果、不连接玩家库。 */
package com.funsgamex.mxzg;

import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.*;
import com.funsgamex.mxzg.hero.*;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleChapterDependencyTest {
    /** 枚举第一章前三关，区分“技能可预检”与“整场/画面可开放”。 */
    @Test void auditFirstThreeChaptersWithoutSkippingUnknownEffects() throws Exception {
        var mapper = new ObjectMapper();
        var growth = new HeroGrowthRules(mapper);
        var rules = new HeroSkillPanelRules(mapper);
        var tables = new HashMap<String, List<JsonNode>>();
        for (String table : List.of("chapter", "heroskill", "buffart", "buff")) {
            tables.put(table, rows(mapper, table));
        }
        var chapters = new ArrayList<Map<String, Object>>();
        for (int mission = 1; mission <= 3; mission++) {
            var enemies = new ArrayList<Map<String, Object>>();
            for (var row : tables.get("chapter")) {
                if (row.path("mode_id").asInt() != 1 || row.path("chapter_id").asInt() != 1
                    || row.path("mission_id").asInt() != mission || row.path("hero_type").asInt() == 0) continue;
                int template = row.path("hero_type").asInt();
                int stage = growth.npcStage(row.path("hero_level").asInt());
                var plan = rules.battleSchedule(rules.select(template, row.path("hero_star").asInt(), stage));
                var skillReports = new ArrayList<Map<String, Object>>();
                for (var skill : plan) {
                    var config = tables.get("heroskill").stream().filter(value -> value.path("type").asInt() == skill.skillId()
                        && value.path("level").asInt() == skill.level()).findFirst().orElseThrow();
                    String rejection = "";
                    try {
                        if (skill.first() || (skill.activeType() != 1 && skill.activeType() != 2)) {
                            throw new IllegalArgumentException("当前场景执行器未接先手/被动");
                        }
                        rules.damageSkillArts(skill);
                    } catch (IllegalArgumentException | IllegalStateException error) {
                        rejection = error.getMessage();
                    }
                    var effects = new ArrayList<Map<String, Object>>();
                    collectArts(mapper, tables, mapper.readTree(config.path("art_list").asString()),
                        new HashSet<>(), effects);
                    skillReports.add(Map.of("skillId", skill.skillId(), "level", skill.level(),
                        "supportedByCurrentDamagePreflight", rejection.isEmpty(), "rejection", rejection, "effects", effects));
                }
                enemies.add(Map.of("templateId", template, "level", row.path("hero_level").asInt(),
                    "star", row.path("hero_star").asInt(), "stage", stage, "position", row.path("pos").asInt(),
                    "skills", skillReports));
            }
            chapters.add(Map.of("scenario", "main:1:1:" + mission, "enemyCount", enemies.size(), "enemies", enemies));
        }
        assertEquals(List.of(1, 1, 2), chapters.stream().map(chapter -> chapter.get("enemyCount")).toList());
        String json = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(chapters);
        Files.writeString(Path.of("target/chapter-dependency-audit.json"), json);
        var audit = mapper.readTree(json);
        assertTrue(audit.get(0).path("enemies").get(0).path("skills").get(0).path("supportedByCurrentDamagePreflight").asBoolean());
        assertTrue(audit.get(1).path("enemies").get(0).path("skills").get(0).path("supportedByCurrentDamagePreflight").asBoolean());
        assertFalse(audit.get(2).path("enemies").get(1).path("skills").get(0).path("supportedByCurrentDamagePreflight").asBoolean());
        assertTrue(json.contains("1205"));
        assertTrue(json.contains("1005"));
    }

    /** 递归保留动作→Buff→子动作依赖，已访问动作只记一次，避免配置环无限递归。 */
    private static void collectArts(ObjectMapper mapper, Map<String, List<JsonNode>> tables, JsonNode artIds,
        Set<Integer> visited, List<Map<String, Object>> effects) {
        for (var artId : artIds) {
            int id = artId.asInt();
            if (!visited.add(id)) continue;
            var art = find(tables.get("buffart"), id);
            for (var buffId : mapper.readTree(art.path("buff_list").asString())) {
                var buff = find(tables.get("buff"), buffId.asInt());
                effects.add(Map.of("artId", id, "selectors", art.path("target").asString(),
                    "targetCount", art.path("target_num").asInt(), "buffId", buffId.asInt(),
                    "type", buff.path("type").asInt(), "attachPercent", buff.path("attach_percent").asInt(),
                    "value", buff.path("value").asString()));
                collectArts(mapper, tables, mapper.readTree(buff.path("art_list").asString()), visited, effects);
            }
        }
    }

    /** 读取当前构建打包的同源配置，缺失即失败，不使用测试自造技能。 */
    private static List<JsonNode> rows(ObjectMapper mapper, String table) throws Exception {
        try (var stream = HeroBattleChapterDependencyTest.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            assertNotNull(stream, table);
            var result = new ArrayList<JsonNode>();
            mapper.readTree(stream).path("rows").forEach(result::add);
            return result;
        }
    }

    /** 按真实配置主键查找动作/Buff，缺失行阻断审计。 */
    private static JsonNode find(List<JsonNode> rows, int id) {
        return rows.stream().filter(row -> row.path("idx").asInt() == id).findFirst().orElseThrow();
    }
}
