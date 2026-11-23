/**
 * 从同源英雄类型、星级与系统表读取旧版升星配方，供英雄升星事务校验。
 * 这里只处理静态配方和素材匹配，角色拥有的英雄、道具和区服等级由服务端事务读取。
 */
package com.funsgamex.mxzg.hero;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class HeroStarRules {
    /** 对应旧版 4020 的最后一段升星，额外要求名册持有足够高星英雄。 */
    private static final int LAST_STAR = 14;
    /** 模板与当前星级到配方的索引；素材行顺序对应界面位置。 */
    private final Map<Integer, Map<Integer, List<Material>>> recipes;
    /** 当前星级到两种等级门槛和共同消耗的索引。 */
    private final Map<Integer, Gate> gates;
    /** 达到最后一段时计入名册条件的最低英雄星级。 */
    private final int minimumOwnedStar;
    /** 达到最后一段时必须持有的英雄数，包含目标本身。 */
    private final int minimumOwnedHeroes;
    /** 同元素材料通过真实英雄模板查元素。 */
    private final HeroBattleElementRules elements;

    /** 配方中 type、elem 为 0 表示任意，为 -1 表示与目标英雄相同。 */
    public record Material(int type, int element, int star, int count, int replacementItem) {}
    /** 本段消耗的真实物品配置编号和数量。 */
    public record Amount(int itemId, long quantity) {}
    /** 满足角色等级或区服世界等级其中一项即可；两者来自同一星级配置行。 */
    public record Gate(int roleLevel, int worldLevel, List<Amount> costs) {}
    /** 本次升星所用的完整规则，材料按原配置顺序排列。 */
    public record Recipe(int toStar, List<Material> materials, Gate gate, int minimumStar, int minimumHeroes) {}

    /** 启动读取旧版表，非法配方启动失败，不能在资产事务中当作零消耗。 */
    public HeroStarRules(ObjectMapper mapper, HeroBattleElementRules elements) {
        this.elements = elements;
        recipes = readRecipes(mapper);
        gates = readGates(mapper);
        var system = rows(mapper, "system");
        var requirement = system.valueStream()
                .filter(row -> row.path("key").asString("").equals("need_star_num"))
                .findFirst().orElseThrow(() -> new IllegalStateException("缺少 14 星名册门槛"));
        var values = array(mapper, requirement.path("value"));
        if (values.size() != 2) {
            throw new IllegalStateException("14 星名册条件配置非法");
        }
        minimumOwnedStar = number(values.get(0), 1, LAST_STAR - 1);
        minimumOwnedHeroes = number(values.get(1), 1, Integer.MAX_VALUE);
    }

    /** 按目标当前星级取同一模板的下一段配方，已经到顶或无配方时返回 null。 */
    public Recipe find(int templateId, int star) {
        var materials = recipes.getOrDefault(templateId, Map.of()).get(star);
        if (materials == null) {
            return null;
        }
        var gate = gates.get(star);
        if (gate == null) {
            throw new IllegalStateException("升星条件缺失：" + star);
        }
        int next = star + 1;
        return new Recipe(next, materials, gate, next == LAST_STAR ? minimumOwnedStar : 0,
                next == LAST_STAR ? minimumOwnedHeroes : 0);
    }

    /** 目标英雄与本行素材必须满足实际配置的星级、指定类型及元素。 */
    public boolean matches(int targetTemplate, Material requirement, HeroProfile candidate) {
        int type = requirement.type() == -1 ? targetTemplate : requirement.type();
        int element = requirement.element() == -1 ? elements.element(targetTemplate) : requirement.element();
        return candidate.star() == requirement.star()
                && (type == 0 || candidate.templateId() == type)
                && (element == 0 || elements.element(candidate.templateId()) == element);
    }

    /** 解析英雄类型中的 to_X_star 字段，空数组表示没有这一段。 */
    private static Map<Integer, Map<Integer, List<Material>>> readRecipes(ObjectMapper mapper) {
        var templates = new HashMap<Integer, Map<Integer, List<Material>>>();
        for (var row : rows(mapper, "herotype")) {
            int template = number(row.path("type"), 1, Integer.MAX_VALUE);
            var levels = new HashMap<Integer, List<Material>>();
            for (int next = 5; next <= LAST_STAR; next++) {
                var source = row.path("to_" + next + "_star");
                if (source.isMissingNode()) {
                    continue;
                }
                var materials = new ArrayList<Material>();
                for (var entry : array(mapper, source)) {
                    int replacement = entry.has("replace_item")
                            ? number(entry.path("replace_item"), 0, Integer.MAX_VALUE) : 0;
                    int count = number(entry.path("num"), 1, 32);
                    if (replacement > 0 && count != 1) {
                        throw new IllegalStateException("旧选择窗每行只允许选择一件替代道具：" + template);
                    }
                    materials.add(new Material(number(entry.path("type"), -1, Integer.MAX_VALUE),
                            number(entry.path("elem"), -1, 5), number(entry.path("star"), 1, LAST_STAR),
                            count, replacement));
                }
                if (!materials.isEmpty()) {
                    levels.put(next - 1, List.copyOf(materials));
                }
            }
            if (templates.put(template, Map.copyOf(levels)) != null) {
                throw new IllegalStateException("升星英雄模板重复：" + template);
            }
        }
        return Map.copyOf(templates);
    }

    /** 保留原星级等级门槛，升星石与额外物品按配置编号合并扣除。 */
    private static Map<Integer, Gate> readGates(ObjectMapper mapper) {
        var result = new HashMap<Integer, Gate>();
        for (var row : rows(mapper, "herostar")) {
            var costs = new LinkedHashMap<Integer, Long>();
            for (String field : List.of("upstar_cost", "need_item")) {
                for (var item : array(mapper, row.path(field))) {
                    costs.merge(number(item.path("item_type"), 1, Integer.MAX_VALUE),
                            (long) number(item.path("item_num"), 1, Integer.MAX_VALUE), Math::addExact);
                }
            }
            int star = number(row.path("star"), 1, LAST_STAR);
            var gate = new Gate(number(row.path("role_level_require"), 0, Integer.MAX_VALUE),
                    number(row.path("world_level_require"), 0, Integer.MAX_VALUE),
                    costs.entrySet().stream().map(item -> new Amount(item.getKey(), item.getValue())).toList());
            if (result.put(star, gate) != null) {
                throw new IllegalStateException("升星门槛配置重复：" + star);
            }
        }
        return Map.copyOf(result);
    }

    /** 读取实际打入服务端资源的同源配置 rows。 */
    private static JsonNode rows(ObjectMapper mapper, String name) {
        try (var input = HeroStarRules.class.getResourceAsStream("/gameplay/" + name + ".json")) {
            if (input == null) {
                throw new IllegalStateException("升星配置缺失：" + name);
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("升星配置为空：" + name);
            }
            return rows;
        } catch (java.io.IOException cause) {
            throw new IllegalStateException("升星配置读取失败：" + name, cause);
        }
    }

    /** xlsx 导出的材料单元格是 JSON 数组文本；空文本沿用旧配方未填写语义。 */
    private static JsonNode array(ObjectMapper mapper, JsonNode raw) {
        String text = raw.asString("");
        var value = mapper.readTree(text.isEmpty() ? "[]" : text);
        if (!value.isArray()) {
            throw new IllegalStateException("升星数组配置非法");
        }
        return value;
    }

    /** 读取有明确范围的整数，避免无效数值转换成通配零。 */
    private static int number(JsonNode node, int min, int max) {
        if (!node.isIntegralNumber() || !node.canConvertToInt() || node.asInt() < min || node.asInt() > max) {
            throw new IllegalStateException("升星数值配置非法：" + node);
        }
        return node.asInt();
    }
}
