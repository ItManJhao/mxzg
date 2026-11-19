/**
 * 普通装备配置的槽位和单件评分。复用原装备和评分表，供持久关系校验与一键穿装择优。
 * 本类只持有配置，不保留任何背包或英雄状态。
 */
package com.funsgamex.mxzg.hero;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class HeroEquipmentRules {
    /** 真实普通装备模板、槽位与旧客户端的单件评分。 */
    public record Definition(int templateId, int slot, long score) {}

    /** 普通装备模板 ID 到规则，构造时校验后不再写入。 */
    private final Map<Integer, Definition> equipment;

    /** 从构建时共用装备表读取普通四槽的真实规则。 */
    public HeroEquipmentRules(ObjectMapper mapper, HeroPowerRules powers) {
        var definitions = new HashMap<Integer, Definition>();
        try (var input = getClass().getResourceAsStream("/gameplay/equipmenttype.json")) {
            if (input == null) {
                throw new IllegalStateException("普通装备配置缺失");
            }
            for (var row : mapper.readTree(input).path("rows")) {
                int id = row.path("equipment_type").asInt();
                int slot = row.path("place").asInt();
                if (id <= 0 || slot < 1 || slot > 4 || definitions.containsKey(id)) {
                    throw new IllegalStateException("普通装备配置无效：" + id);
                }
                long score = score(mapper.readTree(row.path("ability").asString()), powers);
                definitions.put(id, new Definition(id, slot, score));
            }
        } catch (IOException error) {
            throw new IllegalStateException("普通装备配置读取失败", error);
        }
        if (definitions.isEmpty()) {
            throw new IllegalStateException("普通装备配置为空");
        }
        equipment = Map.copyOf(definitions);
    }

    /** 返回指定模板的规则；背包中的非普通装备返回 null。 */
    public Definition find(int templateId) {
        return equipment.get(templateId);
    }

    /** 校验已持久化的模板仍与其槽位一致，不能把坏记录视为空。 */
    public Definition require(int templateId, int slot) {
        var definition = find(templateId);
        if (definition == null || definition.slot() != slot) {
            throw new IllegalStateException("持久普通装备不属于该槽位：" + templateId + "/" + slot);
        }
        return definition;
    }

    /** 逐个属性计算贡献，保留先取整再累加的旧算法。 */
    private static long score(JsonNode attributes, HeroPowerRules powers) {
        if (!attributes.isArray()) {
            throw new IllegalStateException("普通装备属性必须是数组");
        }
        long result = 0;
        for (var attribute : attributes) {
            if (!attribute.isObject()) {
                throw new IllegalStateException("普通装备属性条目无效");
            }
            for (var type : attribute.propertyNames()) {
                var amount = attribute.path(type);
                if (!amount.isIntegralNumber() || !amount.canConvertToLong()) {
                    throw new IllegalStateException("普通装备属性数值无效");
                }
                result = Math.addExact(result, powers.equipmentScore(Integer.parseInt(type), amount.asLong()));
            }
        }
        return result;
    }
}
