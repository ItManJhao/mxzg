/**
 * 全部主线关卡的离线能力证据：调用实际关卡目录、敌方组装和逐技能预检，不运行战斗或发奖。
 * 由 tools/audit_main_chapter_dependencies.cjs 单独执行；不创建 Spring、数据库或玩家身份。
 * JSON 仅为扫描报告输入，记录源摘要以拒绝旧 target 产物，不作为运行时资源清单或开放依据。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.MainChapterRules;
import com.funsgamex.mxzg.hero.HeroBattleAppearanceRules;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import com.funsgamex.mxzg.inventory.TimedItemRules;
import com.funsgamex.mxzg.reward.RewardGrantService;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class MainChapterDependencyAuditTest {
    /** 真实能力证据格式；Node 入口拒绝其他版本，防止静默误用旧报告。 */
    private static final int SCHEMA_VERSION = 1;

    /** 输出全部关卡及独立技能/奖励能力，不因第一项拒绝而漏掉其余配置依赖。 */
    @Test
    void exportCurrentCatalogAndCapabilitiesWithoutRunningGameplay() throws Exception {
        var json = new ObjectMapper();
        var catalog = new MainChapterRules(json);
        var scenario = new HeroBattleChapterScenario(json);
        var growth = new HeroGrowthRules(json);
        var skills = new HeroSkillPanelRules(json);
        var appearance = new HeroBattleAppearanceRules(json);
        var enemyCapabilities = new LinkedHashMap<String, Map<String, Object>>();
        for (var row : rows(json, "chapter")) {
            int template = row.path("hero_type").asInt();
            if (template == 0) {
                continue;
            }
            int level = row.path("hero_level").asInt();
            int star = row.path("hero_star").asInt();
            String key = template + ":" + level + ":" + star;
            if (!enemyCapabilities.containsKey(key)) {
                enemyCapabilities.put(key, enemySkills(template, level, star, growth, skills, appearance, scenario));
            }
        }
        var stages = new ArrayList<Map<String, Object>>();
        for (var stage : catalog.catalog()) {
            var output = new LinkedHashMap<String, Object>();
            output.put("index", stage.index());
            output.put("mode", stage.mode());
            output.put("chapter", stage.chapter());
            output.put("mission", stage.mission());
            output.put("enemyAssemblyError", rejection(() -> scenario.enemies(stage.index())));
            var enemies = new ArrayList<Map<String, Object>>();
            for (var enemy : catalog.enemies(stage.index())) {
                var entry = new LinkedHashMap<String, Object>();
                entry.put("input", enemy);
                entry.putAll(enemyCapabilities.get(enemy.template() + ":" + enemy.level() + ":" + enemy.star()));
                enemies.add(entry);
            }
            output.put("enemies", enemies);
            stages.add(output);
        }
        // requireSupported 只读配置；所有写服务刻意不装配，任何越界调用都会失败，不能产生资产。
        var grant = new RewardGrantService(null, null, null, new TimedItemRules(json),
                null, null, null, null, json);
        var rewardCapabilities = new LinkedHashMap<String, Object>();
        for (var item : rows(json, "item")) {
            int id = item.path("idx").asInt();
            rewardCapabilities.put(Integer.toString(id), Map.of("type", item.path("type").asInt(),
                    "rejection", rejection(() -> grant.requireSupported(List.of(id)))));
        }
        var report = new LinkedHashMap<String, Object>();
        report.put("schemaVersion", SCHEMA_VERSION);
        report.put("scope", "真实配置与生产纯预检；未执行战斗、概率抽样、领取或资产写入，不表示开放或完整验收");
        report.put("sourceHashes", sourceHashes());
        report.put("auditSourceHash", digest(Files.readAllBytes(Path.of(
                "src/test/java/com/funsgamex/mxzg/MainChapterDependencyAuditTest.java"))));
        report.put("pomHash", digest(Files.readAllBytes(Path.of("pom.xml"))));
        report.put("classpathHashes", classpathHashes());
        report.put("stages", stages);
        report.put("rawEnemyCapabilities", enemyCapabilities);
        report.put("semanticBuffReferences", semanticBuffReferences(json, skills));
        report.put("rewardCapabilities", rewardCapabilities);
        assertEquals(rows(json, "chapterreward").size(), stages.size(), "不得只扫描已开放前三关");
        assertEquals(850, stages.size(), "本批真实源应有850关，数量变化须重新确认扫描边界");
        assertTrue(stages.stream().allMatch(row -> !((List<?>) row.get("enemies")).isEmpty()));
        Files.createDirectories(Path.of("target"));
        Files.writeString(Path.of("target/main-chapter-dependency-capabilities.json"),
                json.writerWithDefaultPrettyPrinter().writeValueAsString(report) + "\n", StandardCharsets.UTF_8);
    }

    /** 所有非空源敌人均选择完整技能并逐项预检；注释孤组也会扫描，但不据此改写实际关卡定位。 */
    private static Map<String, Object> enemySkills(int template, int level, int star,
            HeroGrowthRules growth, HeroSkillPanelRules skills, HeroBattleAppearanceRules appearance,
            HeroBattleChapterScenario scenario) throws Exception {
        var output = new LinkedHashMap<String, Object>();
        var selected = new ArrayList<Map<String, Object>>();
        output.put("selectionError", rejection(() -> {
            int npcStage = growth.npcStage(level);
            output.put("growthStage", npcStage);
            output.put("portraitIconId", appearance.icon(template, star, 0, 0));
            var plan = skills.battleSchedule(skills.select(template, star, npcStage));
            for (var skill : plan) {
                selected.add(Map.of("key", skill.skillId() + ":" + skill.level(), "schedule", skill,
                        "rejection", rejection(() -> scenario.requireSupportedSkill(skill))));
            }
        }));
        output.put("skills", selected);
        return output;
    }

    /** 复用真实199处理器解析value中的反向契约引用，不把任意数字猜成Buff或动作ID。 */
    private static Map<String, List<Integer>> semanticBuffReferences(ObjectMapper json,
            HeroSkillPanelRules skills) throws Exception {
        var output = new LinkedHashMap<String, List<Integer>>();
        for (var buff : rows(json, "buff")) {
            if (buff.path("type").asInt() != 199) {
                continue;
            }
            int id = buff.path("idx").asInt();
            try {
                int reverse = skills.battleContract(id).reverseBuff();
                if (reverse > 0) {
                    output.put(Integer.toString(id), List.of(reverse));
                }
            } catch (IllegalArgumentException | IllegalStateException unsupported) {
                // 真实技能预检会保留此拒绝；此处不能猜测尚未支持的value格式并伪造依赖。
            }
        }
        return output;
    }

    /** 执行生产只读预检并保留具体拒绝原因；未知编程异常不转成假支持或普通领域缺口。 */
    private static String rejection(CheckedRead action) throws Exception {
        try {
            action.run();
            return "";
        } catch (IllegalArgumentException | IllegalStateException error) {
            return error.getClass().getSimpleName() + ": " + error.getMessage();
        }
    }

    /** 只读回调允许表解析异常正常传播，不能在审计中吞掉读取失败。 */
    @FunctionalInterface
    private interface CheckedRead {
        /** 完成一项不访问玩家状态的配置能力检查。 */
        void run() throws Exception;
    }

    /** 读取本次 Maven 打包的真实配置，空表或缺表使审计失败。 */
    private static List<JsonNode> rows(ObjectMapper json, String name) throws Exception {
        try (var input = MainChapterDependencyAuditTest.class.getResourceAsStream("/gameplay/" + name + ".json")) {
            assertNotNull(input, name);
            var rows = json.readTree(input).path("rows");
            assertTrue(rows.isArray() && !rows.isEmpty(), name);
            var output = new ArrayList<JsonNode>();
            rows.forEach(output::add);
            return output;
        }
    }

    /** 保存全部手写后端能力源的摘要；后续源码变化时不得拿旧审计结果冒充新规则。 */
    private static Map<String, String> sourceHashes() throws Exception {
        var output = new LinkedHashMap<String, String>();
        try (var files = Files.walk(Path.of("src/main/java"))) {
            for (var file : files.filter(path -> path.toString().endsWith(".java")).sorted().toList()) {
                output.put("backend/" + file.toString().replace('\\', '/'), digest(Files.readAllBytes(file)));
            }
        }
        return output;
    }

    /** 自动枚举本次Maven测试classpath中的全部配置字节，与源文件比较，防止遗漏加成表或过期资源。 */
    private static Map<String, String> classpathHashes() throws Exception {
        var output = new LinkedHashMap<String, String>();
        var directory = MainChapterDependencyAuditTest.class.getResource("/gameplay");
        assertNotNull(directory, "测试classpath缺少gameplay目录");
        assertEquals("file", directory.getProtocol(), "本工具只支持Maven测试file classpath，不猜jar枚举内容");
        try (var files = Files.walk(Path.of(directory.toURI()))) {
            for (var file : files.filter(path -> path.toString().endsWith(".json")).sorted().toList()) {
                String name = Path.of(directory.toURI()).relativize(file).toString().replace('\\', '/');
                try (var input = MainChapterDependencyAuditTest.class.getResourceAsStream("/gameplay/" + name)) {
                    assertNotNull(input, name);
                    output.put(name.substring(0, name.length() - ".json".length()), digest(input.readAllBytes()));
                }
            }
        }
        assertFalse(output.isEmpty(), "不能将空classpath报告为完整配置证据");
        return output;
    }

    /** 计算稳定的内容摘要，不记录运行时间、机器绝对路径或玩家信息。 */
    private static String digest(byte[] content) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
    }
}
