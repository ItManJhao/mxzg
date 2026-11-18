/**
 * 精英碎片使用规则，按原 item 表消耗和使用等级，按 elitepieces 中的正权重投影真实英雄池。
 * 服务只开放所有可抽中英雄都能正常发放的碎片，抽取在锁内事务中进行。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.reward.RewardGrantService;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class HeroFragmentRules {
    /** 旧精英碎片动作号，其他道具不会误入此合成。 */
    private static final int ELITE_COMBINE_USE_TYPE = 4;
    /** 当前可执行配方，以实际消耗的物品配置ID索引。 */
    private final Map<Integer, Recipe> recipes;

    /** 一个能抽中的真实英雄模板，以及其原表权重。 */
    public record Candidate(int templateId, int weight) {}

    /** 一次合成的固定消耗、等级及有序权重池。 */
    public record Recipe(int costPerHero, int requiredLevel, List<Candidate> candidates, long totalWeight) {
        /** 保留源表顺序，单次执行不修改配置池。 */
        public Recipe {
            candidates = List.copyOf(candidates);
        }

        /** 按原累计权重独立抽一名英雄，零权重来源不会入池。 */
        public int draw(RandomGenerator random) {
            long choice = random.nextLong(totalWeight);
            for (var candidate : candidates) {
                if (choice < candidate.weight()) {
                    return candidate.templateId();
                }
                choice -= candidate.weight();
            }
            throw new IllegalStateException("精英碎片随机权重池不完整");
        }
    }

    /** 同源装配全部精英碎片，只要一名可能抽中的英雄不可发放，整组不开放。 */
    public HeroFragmentRules(ObjectMapper mapper, RewardGrantService grants) {
        var pools = readPools(mapper);
        var supported = new HashMap<Integer, Recipe>();
        var items = rows(mapper, "item");
        var heroItems = new HashSet<Integer>();
        for (var item : items) {
            if (item.path("type").asInt() == 7) {
                heroItems.add(integer(item, "idx", 1));
            }
        }
        for (var item : items) {
            if (item.path("use_type").asInt() != ELITE_COMBINE_USE_TYPE || item.path("type").asInt() != 6) {
                continue;
            }
            int itemId = integer(item, "idx", 1);
            var pool = pools.get(itemId);
            if (pool == null || pool.stream().anyMatch(candidate -> !heroItems.contains(candidate.templateId()))) {
                continue;
            }
            int cost = integer(item, "use_value", 1);
            int level = integer(item, "level_require", 0);
            try {
                grants.requireSupported(pool.stream().map(Candidate::templateId).distinct().toList());
            } catch (IllegalArgumentException unsupported) {
                continue;
            }
            var recipe = new Recipe(cost, level, pool, pool.stream().mapToLong(Candidate::weight).sum());
            if (supported.put(itemId, recipe) != null) {
                throw new IllegalStateException("重复精英碎片配方：" + itemId);
            }
        }
        recipes = Map.copyOf(supported);
    }

    /** 查配置ID对应的完整配方；不存在返回null，业务拒绝且不扣任何材料。 */
    public Recipe recipe(int itemId) {
        return recipes.get(itemId);
    }

    /** 按原表顺序读取正权重候选，权重0等价于旧抽样永不命中。 */
    private static Map<Integer, List<Candidate>> readPools(ObjectMapper mapper) {
        var ids = new HashSet<Integer>();
        var pools = new HashMap<Integer, List<Candidate>>();
        for (var row : rows(mapper, "elitepieces")) {
            if (!ids.add(integer(row, "idx", 1))) {
                throw new IllegalStateException("重复精英碎片池条目");
            }
            int itemId = integer(row, "item_type", 1);
            int templateId = integer(row, "hero_id", 1);
            int weight = integer(row, "weight", 0);
            if (weight > 0) {
                pools.computeIfAbsent(itemId, key -> new ArrayList<>()).add(new Candidate(templateId, weight));
            }
        }
        return pools;
    }

    /** 读取共享配置包导出的原表，缺失或错误格式在服务启动时报告。 */
    private static JsonNode rows(ObjectMapper mapper, String table) {
        try (var input = HeroFragmentRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input == null) {
                throw new IllegalStateException("缺少精英碎片配置表：" + table);
            }
            var entries = mapper.readTree(input).path("rows");
            if (!entries.isArray() || entries.isEmpty()) {
                throw new IllegalStateException("精英碎片表无效：" + table);
            }
            return entries;
        } catch (IOException error) {
            throw new IllegalStateException("读取精英碎片配置失败：" + table, error);
        }
    }

    /** 检查配置数量、ID和数值边界，不将非法文本或缺字段转换成0。 */
    private static int integer(JsonNode node, String key, int minimum) {
        var value = node.path(key);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() < minimum) {
            throw new IllegalStateException("精英碎片表字段无效：" + key);
        }
        return value.asInt();
    }
}
