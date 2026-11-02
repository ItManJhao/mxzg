/** 普通升级可信配置及基础属性计算；详情预览与真实战斗共用，不包含技能、装备或其他成长系统。 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class HeroGrowthRules {
    public record Stats(int hp, int atk, int def, int spd) {}
    public record Cost(long gold, long experience) {}
    private final String version;
    private final Map<String, Map<String, JsonNode>> tables = new HashMap<>();

    /** 启动时加载版本化最小投影，拒绝重复配置键，绝不缺表后按零消耗继续。 */
    public HeroGrowthRules(ObjectMapper mapper) {
        try (var input = HeroGrowthRules.class.getResourceAsStream("/gameplay/hero-growth.json")) {
            if (input == null) throw new IllegalStateException("HERO_CONFIG_MISSING");
            var data = mapper.readTree(input); version = data.get("version").asText();
            for (String name : List.of("herolevel", "heroupgrade", "heroupgraderate", "herobase", "herostar")) {
                var rows = new HashMap<String, JsonNode>();
                for (var row : data.get(name)) {
                    String key = switch (name) {
                        case "herolevel" -> row.get("level").asText();
                        case "heroupgrade" -> row.get("grade").asText();
                        case "herostar" -> row.get("star").asText();
                        case "herobase" -> row.get("type").asText() + ":" + row.get("star").asText();
                        default -> row.get("hero_id").asText() + ":" + row.get("grade").asText();
                    };
                    if (rows.put(key, row) != null) throw new IllegalStateException("HERO_CONFIG_DUPLICATE");
                }
                if (rows.isEmpty()) throw new IllegalStateException("HERO_CONFIG_MISSING");
                tables.put(name, Map.copyOf(rows));
            }
        } catch (java.io.IOException failure) { throw new IllegalStateException("HERO_CONFIG_MISSING", failure); }
    }

    /** 返回内容哈希版本，幂等收据记录实际执行时的规则版本。 */
    public String version() { return version; }

    /** 查找准确配置行，缺失属于规则错误，不退回其他模板或等级。 */
    private JsonNode row(String table, String key) {
        var result = tables.get(table).get(key);
        if (result == null) throw new IllegalStateException("HERO_CONFIG_MISSING: " + table + ":" + key);
        return result;
    }

    /** 消耗使用当前英雄等级行，而非目标等级；英雄经验为库存 900101。 */
    public Cost cost(int level) {
        var row = row("herolevel", Integer.toString(level));
        var result = new Cost(row.get("gold_need").asLong(), row.get("exp_need").asLong());
        if (result.gold() <= 0 || result.experience() <= 0) throw new IllegalStateException("HERO_CONFIG_INVALID_COST");
        return result;
    }

    /** 沿用旧服普通升级分支：达到最后等阶的等级阈值前使用本阶上限，之后使用星级上限。 */
    public int limit(int level, int stage, int star) {
        int last = tables.get("heroupgrade").values().stream().mapToInt(row -> row.get("level").asInt()).max().orElseThrow();
        int starLimit = row("herostar", Integer.toString(star)).get("level_limit").asInt();
        int stageLimit = row("heroupgrade", Integer.toString(stage)).get("level").asInt();
        return level < last ? stageLimit : starLimit;
    }

    /** NPC 沿旧服规则按等级查最高 begin_level 所属等阶；玩家必须使用持久化等阶。 */
    public int npcStage(int level) {
        return tables.get("heroupgrade").values().stream().filter(row -> level >= row.get("begin_level").asInt())
            .max(Comparator.comparingInt(row -> row.get("begin_level").asInt())).orElseThrow().get("grade").asInt();
    }

    /** 按旧服基础倍率/成长与取整顺序计算四属性；防御/速度先截断基础项，再加成长后截断。 */
    public Stats stats(int template, int star, int level, int stage) {
        var base = row("herobase", template + ":" + star);
        var growth = row("heroupgraderate", template + ":" + stage);
        int difference = level - row("heroupgrade", Integer.toString(stage)).get("begin_level").asInt();
        if (difference < 0) throw new IllegalStateException("HERO_CONFIG_INVALID_LEVEL");
        int[] values = new int[4]; String[] names = {"hp", "atk", "def", "spd"};
        for (int i = 0; i < names.length; i++) {
            String name = names[i]; long b = base.get(name).asLong();
            double first = b * (growth.get(name + "_rate").asLong() / 10000D);
            if (i >= 2) first = (long) first;
            long value = (long) (first + b * difference * (growth.get(name + "_grow").asLong() / 10000D));
            if (value <= 0 || value > Integer.MAX_VALUE) throw new IllegalStateException("HERO_CONFIG_INVALID_ATTRIBUTE");
            values[i] = (int) value;
        }
        return new Stats(values[0], values[1], values[2], values[3]);
    }
}
