/**
 * 铁匠铺普通装备配方。使用客户端共用的旧策划导出，按部位保留由低到高的合成顺序。
 * 本类只在启动时读取和核验配置，由铁匠铺服务计算报价与结算。
 */
package com.funsgamex.mxzg.smith;

import java.io.IOException;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
class SmithRules {
    /** 主城开放表 main_smith_shop 的角色等级。 */
    static final int REQUIRED_LEVEL = 5;
    /** 原装备部位按 1～4 编号。 */
    static final int SLOT_COUNT = 4;

    /** 成品及原配方的同部位前一档装备，每次消耗所列材料和金币。 */
    record Recipe(int itemId, int slot, int materialId, long materialQuantity, long goldCost) {}

    /** 可以锻造的装备配置 ID 到配方，基础装备只有作为材料的定义。 */
    private final Map<Integer, Recipe> recipes;
    /** 一键锻造所需角色等级，已充值角色走同一原版豁免条件。 */
    private final int quickLevel;

    /** 读取固定配方并核验同部位、递增的材料链，防止错误配置形成循环或扣错材料。 */
    SmithRules(ObjectMapper mapper) {
        var byItem = new HashMap<Integer, Recipe>();
        var slots = new HashMap<Integer, Integer>();
        try {
            for (var row : rows(mapper, "equipmenttype")) {
                int itemId = Math.toIntExact(positive(row, "equipment_type"));
                int slot = Math.toIntExact(positive(row, "place"));
                if (slot > SLOT_COUNT || slots.put(itemId, slot) != null) {
                    throw new IllegalStateException("铁匠铺装备部位无效或重复：" + itemId);
                }
                var materials = mapper.readTree(row.path("need_equipment").asString());
                if (materials == null || !materials.isArray() || materials.size() > 1) {
                    throw new IllegalStateException("铁匠铺普通装备需要同部位的单种前置材料：" + itemId);
                }
                if (!materials.isEmpty()) {
                    var material = materials.get(0);
                    int materialId = Math.toIntExact(positive(material, "item_type"));
                    byItem.put(itemId, new Recipe(itemId, slot, materialId, positive(material, "item_num"),
                            positive(row, "need_gold")));
                }
            }
            if (byItem.isEmpty() || byItem.values().stream().anyMatch(recipe -> recipe.materialId() >= recipe.itemId()
                    || slots.getOrDefault(recipe.materialId(), 0) != recipe.slot())) {
                throw new IllegalStateException("铁匠铺普通装备配方链无效");
            }
            recipes = Map.copyOf(byItem);
            quickLevel = readQuickLevel(rows(mapper, "system"));
        } catch (IOException error) {
            throw new IllegalStateException("铁匠铺配置读取失败", error);
        }
    }

    /** 读取可锻造的目标配置，基础档或不属于普通装备返回空。 */
    Recipe find(int itemId) {
        return recipes.get(itemId);
    }

    /** 按旧客户端的装备配置 ID 递增顺序返回指定部位配方。 */
    List<Recipe> forSlot(int slot) {
        return recipes.values().stream().filter(recipe -> recipe.slot() == slot)
                .sorted(Comparator.comparingInt(Recipe::itemId)).toList();
    }

    /** 返回原配置中一键锻造的角色等级门槛。 */
    int quickLevel() {
        return quickLevel;
    }

    /** 定位唯一一键锻造等级，不使用客户端显示值替代服务端配置。 */
    private static int readQuickLevel(JsonNode rows) {
        var levels = rows.valueStream()
                .filter(row -> row.path("key").asString().equals("equipment_compose_quickly_level")).toList();
        if (levels.size() != 1) {
            throw new IllegalStateException("铁匠铺一键锻造等级缺失或重复");
        }
        return Math.toIntExact(positive(levels.getFirst(), "value"));
    }

    /** 打开 Maven 打包的原策划共用表并验证结构。 */
    private static JsonNode rows(ObjectMapper mapper, String table) throws IOException {
        try (var input = SmithRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input == null) {
                throw new IllegalStateException("铁匠铺缺少策划表：" + table);
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("铁匠铺策划表无有效行：" + table);
            }
            return rows;
        }
    }

    /** 数值必须为正整数，防止无效成本被识别成免费锻造。 */
    private static long positive(JsonNode row, String field) {
        var value = row.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToLong() || value.asLong() <= 0) {
            throw new IllegalStateException("铁匠铺策划字段无效：" + field);
        }
        return value.asLong();
    }
}
