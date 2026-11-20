/**
 * 头像解锁和头像框激活配置，供个人空间查询与写操作共用。
 * 读取随服务端部署的旧表，资格由调用方结合持久图鉴和库存判断。
 */
package com.funsgamex.mxzg.role;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
class RoleDecorationRules {
    /** 旧策划的免费激活类型。 */
    private static final int FREE = 1;
    /** 旧策划的物品兑换类型。 */
    private static final int ITEM = 2;
    /** 旧协议头像框查询中的永久期限。 */
    static final long PERMANENT = -1;

    /** 所有角色可用的头像配置 ID。 */
    private final Set<Integer> freeHeads;
    /** 已获得的英雄模板到其解锁的头像配置 ID。 */
    private final Map<Integer, List<Integer>> headsByHero;
    /** 配置 ID 到头像框及其激活要求。 */
    private final Map<Integer, Border> borders;

    /** 激活头像框需要消耗的普通库存物品。 */
    record Material(int itemId, int count) {}

    /** 头像框的旧激活方式、期限天数和物品消耗。 */
    record Border(int id, int activation, int limitDays, List<Material> costs) {
        /** 免费头像框按配置直接可用。 */
        boolean free() {
            return activation == FREE;
        }

        /** 只有道具激活型头像框能在装饰页主动兑换。 */
        boolean itemActivated() {
            return activation == ITEM;
        }
    }

    /** 装配旧配置，皮肤头像等待获得皮肤后再交对应领域接入。 */
    RoleDecorationRules(ObjectMapper mapper) {
        var free = new HashSet<Integer>();
        var byHero = new HashMap<Integer, List<Integer>>();
        var seen = new HashSet<Integer>();
        for (var row : rows(mapper, "headunlock")) {
            int id = number(row, "icon", 1);
            int type = number(row, "unlock_type", 1);
            if (!seen.add(id)) {
                throw new IllegalStateException("头像配置 ID 重复：" + id);
            }
            if (type == FREE) {
                free.add(id);
                continue;
            }
            var task = mapper.readTree(row.path("unlock_task").asString());
            if ("GET_NEW_HERO".equals(task.path("type").asString())) {
                int template = number(task, "condition", 1);
                byHero.computeIfAbsent(template, key -> new ArrayList<>()).add(id);
            }
        }
        if (!free.contains(1)) {
            throw new IllegalStateException("默认头像 1 未配置为免费");
        }
        freeHeads = Set.copyOf(free);
        byHero.replaceAll((id, icons) -> List.copyOf(icons));
        headsByHero = Map.copyOf(byHero);

        var definitions = new HashMap<Integer, Border>();
        for (var row : rows(mapper, "border")) {
            int id = number(row, "icon", 0);
            int type = number(row, "active_type", 1);
            int limit = number(row, "limit_time", -1);
            var costs = type == ITEM ? costs(mapper, row) : List.<Material>of();
            if ((type == FREE && limit != PERMANENT) || (type == ITEM && limit == 0)
                    || definitions.put(id, new Border(id, type, limit, costs)) != null) {
                throw new IllegalStateException("头像框配置无效：" + id);
            }
        }
        if (definitions.get(0) == null || !definitions.get(0).free()) {
            throw new IllegalStateException("默认头像框 0 未配置为免费");
        }
        borders = Map.copyOf(definitions);
    }

    /** 将历史获得过的英雄及免费默认项合并为角色的可用头像配置。 */
    List<Integer> heads(List<com.funsgamex.mxzg.hero.HeroRepository.Illustration> heroes) {
        var ids = new HashSet<>(freeHeads);
        for (var hero : heroes) {
            ids.addAll(headsByHero.getOrDefault(hero.templateId(), List.of()));
        }
        return ids.stream().sorted().toList();
    }

    /** 返回旧配置中全部免费头像框 ID。 */
    List<Integer> freeBorderIds() {
        return borders.values().stream().filter(Border::free).map(Border::id).sorted().toList();
    }

    /** 查询单个框配置，未知 ID 返回 null。 */
    Border border(int id) {
        return borders.get(id);
    }

    /** 读取激活消耗，拒绝缺失、重复物品或无消耗的兑换配置。 */
    private static List<Material> costs(ObjectMapper mapper, JsonNode row) {
        var values = mapper.readTree(row.path("condition").asString());
        if (!values.isArray() || values.isEmpty()) {
            throw new IllegalStateException("头像框激活缺少消耗配置");
        }
        var seen = new HashSet<Integer>();
        var costs = new ArrayList<Material>();
        for (var value : values) {
            int item = number(value, "item_type", 1);
            if (!seen.add(item)) {
                throw new IllegalStateException("头像框激活的消耗物品重复：" + item);
            }
            costs.add(new Material(item, number(value, "item_num", 1)));
        }
        return List.copyOf(costs);
    }

    /** 读取有明确下限的整型列，拒绝把缺字段当作头像框 0。 */
    private static int number(JsonNode row, String key, int min) {
        var value = row.path(key);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() < min) {
            throw new IllegalStateException("个人装饰配置数值无效：" + key);
        }
        return value.asInt();
    }

    /** 读取同源策划表，配置缺失时拒绝启动。 */
    private static JsonNode rows(ObjectMapper mapper, String table) {
        try (var input = RoleDecorationRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input == null) {
                throw new IllegalStateException("个人装饰缺少配置表：" + table);
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("个人装饰配置表为空：" + table);
            }
            return rows;
        } catch (IOException failure) {
            throw new IllegalStateException("个人装饰配置读取失败：" + table, failure);
        }
    }
}
