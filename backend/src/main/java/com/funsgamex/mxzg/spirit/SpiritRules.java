/**
 * 当前月兔精灵的纯生成与只读规则：按同源投影抽取一个基础能力和一个被动技能。
 * 由精灵库存领域调用，生成结果不含实例ID；本类不访问角色、数据库、时钟或资产同步。
 * 仅支持当前挂机真实产出的2000002，其他精灵及穿脱、养成和重铸均不在此入口开放。
 */
package com.funsgamex.mxzg.spirit;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.random.RandomGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public final class SpiritRules {
    /** 已核实的月兔精灵物品配置ID，不是持久实例ID。 */
    private static final int ITEM_ID = 2000002;
    /** 四种基础能力均匀抽取，排序仅固定随机区间映射，不改变旧均匀分布。 */
    private final List<Ability> abilities;
    /** 基础能力ID索引，用于校验持久读入的实例。 */
    private final Map<Integer, Ability> abilitiesById;
    /** 保留源JSON顺序的技能等级权重；本批只有1级和2级。 */
    private final List<WeightedLevel> levels;
    /** 技能等级的总权重，启动时校验求和，不在抽样后发现配置溢出。 */
    private final int levelWeight;
    /** 旧固定单技能仍消费一次技能数量随机，此值是其真实总权重。 */
    private final int countWeight;
    /** 技能等级到按旧idx升序保存的候选项。 */
    private final Map<Integer, List<SkillDefinition>> skillsByLevel;
    /** 技能等级到启动时冻结的总权重。 */
    private final Map<Integer, Integer> skillWeights;
    /** 技能ID及等级到只读说明，不包含角色技能状态。 */
    private final Map<SkillKey, SkillDefinition> skillsByKey;
    /** 实际投影原字节的内容摘要，随真实规则或展示闭包变化。 */
    private final String version;

    /** 单个已生成技能；sort是旧精灵内部技能位置，不是装备或背包位置。 */
    public record Skill(int sort, int skillId, int level) {
        /** 拒绝不合法的基本字段；具体成员资格由规则validate统一检查。 */
        public Skill {
            if (sort <= 0 || skillId <= 0 || level <= 0) {
                throw new IllegalArgumentException("精灵技能字段非法");
            }
        }
    }

    /** 不含实例身份的冻结生成结果，持久ID和角色归属由库存事务负责。 */
    public record Generation(int itemId, int abilityId, List<Skill> skills) {
        /** 冻结技能列表，不接受空或含null的候选，避免持久之后被外部修改。 */
        public Generation {
            if (itemId <= 0 || abilityId <= 0 || skills == null || skills.isEmpty()
                    || skills.stream().anyMatch(skill -> skill == null)) {
                throw new IllegalArgumentException("精灵生成结果非法");
            }
            skills = List.copyOf(skills);
        }
    }

    /** 当前稀有度2的平值基础属性及同源中文说明，不参与英雄面板加成。 */
    public record Ability(int id, int attributeId, long value, String name, String description) {}

    /** 单个可抽技能的真实权重及只读展示，index保留旧策划idx优先顺序。 */
    public record SkillDefinition(int index, int skillId, int level, int weight,
                                  String name, String description, String icon) {}

    /** 仅用于已加载配置索引，不保存角色技能或抽样进度。 */
    private record SkillKey(int skillId, int level) {}

    /** 原技能等级权重项；候选顺序取自旧配置JSON而非Map迭代顺序。 */
    private record WeightedLevel(int level, int weight) {}

    /** 启动读取实际规则资源，缺失或坏配置拒绝启动，不返回假生成结果。 */
    @Autowired
    public SpiritRules(ObjectMapper json) {
        this(json, readContent());
    }

    /** 隔离纯规则测试入口，与生产入口共用全部结构、权重和展示校验。 */
    SpiritRules(ObjectMapper json, byte[] content) {
        var root = json.readTree(new ByteArrayInputStream(content));
        if (root == null || !root.isObject() || integer(root, "schema") != 1) {
            throw new IllegalStateException("精灵规则投影版本非法");
        }
        var item = root.path("item");
        if (integer(item, "itemId") != ITEM_ID || integer(item, "rare") != 2
                || integer(item, "skillMaximum") != 1) {
            throw new IllegalStateException("精灵规则超出已核实物品范围");
        }
        var counts = array(item, "skillCounts");
        if (counts.size() != 1 || integer(counts.get(0), "count") != 1) {
            throw new IllegalStateException("月兔精灵必须固定生成一个技能");
        }
        countWeight = positive(counts.get(0), "weight");
        var loadedLevels = new ArrayList<WeightedLevel>();
        var levelIds = new HashSet<Integer>();
        int totalLevels = 0;
        for (var row : array(item, "skillLevels")) {
            int level = positive(row, "level");
            int weight = positive(row, "weight");
            if (!Set.of(1, 2).contains(level) || !levelIds.add(level)) {
                throw new IllegalStateException("精灵技能等级未知或重复");
            }
            totalLevels = sum(totalLevels, weight);
            loadedLevels.add(new WeightedLevel(level, weight));
        }
        if (!levelIds.equals(Set.of(1, 2))) {
            throw new IllegalStateException("精灵技能等级配置不完整");
        }
        levels = List.copyOf(loadedLevels);
        levelWeight = totalLevels;

        var loadedAbilities = new ArrayList<Ability>();
        var abilityIndex = new HashMap<Integer, Ability>();
        for (var row : array(root, "abilities")) {
            int id = positive(row, "id");
            int attribute = positive(row, "attributeId");
            long value = positive(row, "value");
            if (!Set.of(1, 2, 3, 4).contains(id) || !Set.of(101, 220, 223, 224).contains(attribute)) {
                throw new IllegalStateException("精灵基础能力超出已核实范围");
            }
            var ability = new Ability(id, attribute, value, text(row, "name"), text(row, "description"));
            if (abilityIndex.put(id, ability) != null) {
                throw new IllegalStateException("精灵基础能力ID重复");
            }
            loadedAbilities.add(ability);
        }
        if (!abilityIndex.keySet().equals(Set.of(1, 2, 3, 4))) {
            throw new IllegalStateException("精灵四项基础能力配置不完整");
        }
        loadedAbilities.sort(java.util.Comparator.comparingInt(Ability::id));
        abilities = List.copyOf(loadedAbilities);
        abilitiesById = Map.copyOf(abilityIndex);

        var grouped = new HashMap<Integer, List<SkillDefinition>>();
        var totals = new HashMap<Integer, Integer>();
        var skillIndex = new HashMap<SkillKey, SkillDefinition>();
        var indices = new HashSet<Integer>();
        for (var row : array(root, "skills")) {
            int index = positive(row, "index");
            int id = positive(row, "id");
            int level = positive(row, "level");
            int weight = positive(row, "weight");
            if (!levelIds.contains(level) || !indices.add(index)) {
                throw new IllegalStateException("精灵技能等级未知或索引重复");
            }
            var skill = new SkillDefinition(index, id, level, weight, text(row, "name"),
                    text(row, "description"), text(row, "icon"));
            if (skillIndex.put(new SkillKey(id, level), skill) != null) {
                throw new IllegalStateException("精灵技能ID及等级重复");
            }
            grouped.computeIfAbsent(level, ignored -> new ArrayList<>()).add(skill);
            totals.put(level, sum(totals.getOrDefault(level, 0), weight));
        }
        if (!grouped.keySet().equals(levelIds)) {
            throw new IllegalStateException("精灵技能候选缺少已配置等级");
        }
        grouped.replaceAll((level, rows) -> rows.stream()
                .sorted(java.util.Comparator.comparingInt(SkillDefinition::index)).toList());
        skillsByLevel = Map.copyOf(grouped);
        skillWeights = Map.copyOf(totals);
        skillsByKey = Map.copyOf(skillIndex);
        try {
            version = "spirit-rules-v1:" + HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少精灵规则摘要算法", error);
        }
    }

    /**
     * 按旧真实顺序消费四次随机：能力、技能数、技能等级、技能ID。
     * 单技能数也按真实总权重消费一次随机；不创建实例ID，不修改库存。
     */
    public Generation create(int itemId, RandomGenerator random) {
        if (itemId != ITEM_ID || random == null) {
            throw new IllegalArgumentException("精灵生成物品或随机源非法");
        }
        int abilityId = abilities.get(draw(random, abilities.size())).id();
        draw(random, countWeight);
        int levelPoint = draw(random, levelWeight) + 1;
        int level = 0;
        for (var choice : levels) {
            levelPoint -= choice.weight();
            if (levelPoint <= 0) {
                level = choice.level();
                break;
            }
        }
        int skillPoint = draw(random, skillWeights.get(level)) + 1;
        for (var candidate : skillsByLevel.get(level)) {
            skillPoint -= candidate.weight();
            if (skillPoint <= 0) {
                return new Generation(itemId, abilityId, List.of(new Skill(1, candidate.skillId(), level)));
            }
        }
        throw new IllegalStateException("精灵权重抽样未命中合法区间");
    }

    /** 校验已保存生成结果仍属于当前已核实规则；不重抽、不修改原技能或回退配置。 */
    public void validate(Generation generation) {
        if (generation == null || generation.itemId() != ITEM_ID
                || !abilitiesById.containsKey(generation.abilityId()) || generation.skills().size() != 1) {
            throw new IllegalArgumentException("精灵实例不属于已核实规则");
        }
        var skill = generation.skills().getFirst();
        if (skill.sort() != 1 || !skillsByKey.containsKey(new SkillKey(skill.skillId(), skill.level()))) {
            throw new IllegalArgumentException("精灵实例技能位置或配置非法");
        }
    }

    /** 返回当前基础属性的不可变只读说明，未知能力不能显示为有效零属性。 */
    public Ability ability(int abilityId) {
        var result = abilitiesById.get(abilityId);
        if (result == null) {
            throw new IllegalArgumentException("精灵能力配置不存在：" + abilityId);
        }
        return result;
    }

    /** 返回精确技能ID及等级的说明；不使用邻级或同名技能回退。 */
    public SkillDefinition skill(int skillId, int level) {
        var result = skillsByKey.get(new SkillKey(skillId, level));
        if (result == null) {
            throw new IllegalArgumentException("精灵技能配置不存在：" + skillId + "/" + level);
        }
        return result;
    }

    /** 返回实际规则内容版本，用于发放回执记录生成依据。 */
    public String version() {
        return version;
    }

    /** 消费一个有界随机值；自定义随机源违反范围契约时明确拒绝。 */
    private static int draw(RandomGenerator random, int bound) {
        int value = random.nextInt(bound);
        if (value < 0 || value >= bound) {
            throw new IllegalArgumentException("精灵随机源返回越界值");
        }
        return value;
    }

    /** 读取必要数组，空候选和结构缺失均拒绝。 */
    private static JsonNode array(JsonNode parent, String field) {
        var value = parent.path(field);
        if (!value.isArray() || value.isEmpty()) {
            throw new IllegalStateException("精灵规则数组缺失：" + field);
        }
        return value;
    }

    /** 读取明确的整数，不让Jackson默认0掩盖缺失或过大字段。 */
    private static int integer(JsonNode parent, String field) {
        var value = parent.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToInt()) {
            throw new IllegalStateException("精灵规则整数字段非法：" + field);
        }
        return value.asInt();
    }

    /** 读取正整数权重、ID或当前已核实平值属性。 */
    private static int positive(JsonNode parent, String field) {
        int value = integer(parent, field);
        if (value <= 0) {
            throw new IllegalStateException("精灵规则正整数字段非法：" + field);
        }
        return value;
    }

    /** 在任何随机消费之前拒绝权重求和溢出。 */
    private static int sum(int left, int right) {
        try {
            return Math.addExact(left, right);
        } catch (ArithmeticException error) {
            throw new IllegalStateException("精灵规则总权重溢出", error);
        }
    }

    /** 展示配置必须有真实非空文本，不用策划备注或默认图标掩盖缺失。 */
    private static String text(JsonNode parent, String field) {
        var value = parent.path(field);
        if (!value.isTextual() || value.asText().isBlank()) {
            throw new IllegalStateException("精灵规则展示文本缺失：" + field);
        }
        return value.asText();
    }

    /** 只读加载构建资源，缺失时阻止不完整生成链启动。 */
    private static byte[] readContent() {
        try (var input = SpiritRules.class.getResourceAsStream("/gameplay/spirit-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("精灵生成规则资源缺失");
            }
            return input.readAllBytes();
        } catch (IOException error) {
            throw new IllegalStateException("精灵生成规则读取失败", error);
        }
    }
}
