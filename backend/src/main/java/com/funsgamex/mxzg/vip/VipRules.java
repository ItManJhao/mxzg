/**
 * 从客户端同源的女神契约配置读取任务顺序和奖励。
 * 保存静态任务规则，由 VipService 将实际业务状态投影为进度。
 */
package com.funsgamex.mxzg.vip;

import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
class VipRules {
    /** 以 VIP 档位为键，每档按原配置顺序保存任务。 */
    private final Map<Integer, List<Entry>> byLevel;

    /** 原任务条件及服务端选择的发奖清单。 */
    record Entry(int id, String type, int target, int condition, List<Reward> rewards) {}

    /** 应用启动时校验任务、唯一编号和奖励的基础结构。 */
    VipRules(ObjectMapper mapper) {
        var grouped = new TreeMap<Integer, List<Entry>>();
        var ids = new HashSet<Integer>();
        try (var input = getClass().getResourceAsStream("/gameplay/goddessmission.json")) {
            if (input == null) {
                throw new IllegalStateException("VIP 契约任务配置缺失");
            }
            JsonNode rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("VIP 契约任务表为空或结构错误");
            }
            for (var row : rows) {
                int id = integer(row, "idx", 1);
                int level = integer(row, "vip_level", 0);
                if (!ids.add(id)) {
                    throw new IllegalStateException("VIP 契约任务编号重复：" + id);
                }
                JsonNode task = readNode(mapper, row.path("task"));
                String type = task.path("type").asText("");
                int target = integer(task, "target", 1);
                int condition = task.has("condition") ? integer(task, "condition", 0) : 0;
                JsonNode rewards = readNode(mapper, row.path("reward"));
                if (type.isBlank() || !rewards.isArray() || rewards.isEmpty()) {
                    throw new IllegalStateException("VIP 契约任务类型或奖励缺失：" + id);
                }
                var plan = new ArrayList<Reward>();
                for (var reward : rewards) {
                    plan.add(new Reward(integer(reward, "item_type", 1), integer(reward, "item_num", 1)));
                }
                grouped.computeIfAbsent(level, ignored -> new ArrayList<>())
                    .add(new Entry(id, type, target, condition, List.copyOf(plan)));
            }
        } catch (IOException error) {
            throw new IllegalStateException("VIP 契约任务配置读取失败", error);
        }
        if (grouped.getOrDefault(0, List.of()).size() != 4 || grouped.getOrDefault(1, List.of()).size() != 4) {
            throw new IllegalStateException("前两档 VIP 契约任务配置不完整");
        }
        grouped.replaceAll((level, entries) -> List.copyOf(entries));
        byLevel = Map.copyOf(grouped);
    }

    /** 按当前 VIP 档位取配置；最后一档没有后续任务。 */
    List<Entry> entries(int level) {
        return byLevel.getOrDefault(level, List.of());
    }

    /** 兼容 Excel 导出保存的 JSON 字符串和已解析的表结构。 */
    private static JsonNode readNode(ObjectMapper mapper, JsonNode node) {
        return node.isTextual() ? mapper.readTree(node.asText()) : node;
    }

    /** 读取正整数或允许零的档位与限定值。 */
    private static int integer(JsonNode row, String field, int minimum) {
        var value = row.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() < minimum) {
            throw new IllegalStateException("VIP 契约任务配置整数无效：" + field);
        }
        return value.asInt();
    }
}
