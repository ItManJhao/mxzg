/**
 * 个人空间的服务端配置。形象按旧图鉴星级索引，二次改名读取原系统表的改名卡和钻石报价。
 * 由个人空间服务注入使用，不读取或修改角色状态。
 */
package com.funsgamex.mxzg.role;

import java.io.IOException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
class RoleProfileRules {
    /** 旧形象 ID 以亿位保存星级，亿位以下保留英雄模板 ID。 */
    private static final int IMAGE_STAR_SCALE = 100_000_000;

    /** 商品系统中对应角色钻石钱包的物品配置 ID。 */
    private static final int DIAMONDS = 900002;

    /** 以普通英雄模板为键、按星级升序保存的旧图鉴形象。 */
    private final Map<Integer, List<Integer>> handbookStars;

    /** 粒度与旧昵称页相同，服务端从原系统表确认本次消耗。 */
    private final RenameCost renameCard;

    /** 没有足够改名卡时的钻石报价。 */
    private final RenameCost renameDiamonds;

    /** 原系统表中改名的物品配置 ID 及单次消耗。 */
    record RenameCost(int itemId, long quantity) {}

    /** 加载随应用打包的原策划表，规则缺失时拒绝装配。 */
    RoleProfileRules(ObjectMapper mapper) {
        var ordinary = new HashSet<Integer>();
        for (var row : rows(mapper, "herotype")) {
            if (row.path("kind").asInt() == 1) {
                ordinary.add(positiveInt(row.path("type")));
            }
        }
        var stars = new HashMap<Integer, List<Integer>>();
        for (var row : rows(mapper, "skin")) {
            int templateId = positiveInt(row.path("type"));
            if (!ordinary.contains(templateId)) {
                continue;
            }
            var values = mapper.readTree(row.path("handbook").asString());
            if (!values.isArray() || values.isEmpty()) {
                throw new IllegalStateException("角色形象星级配置为空：" + templateId);
            }
            var templateStars = new HashSet<Integer>();
            for (var value : values) {
                int star = positiveInt(value);
                if (!templateStars.add(star)) {
                    throw new IllegalStateException("角色形象星级配置重复：" + templateId);
                }
                imageId(templateId, star);
            }
            if (stars.put(templateId, templateStars.stream().sorted().toList()) != null) {
                throw new IllegalStateException("角色形象英雄配置重复：" + templateId);
            }
        }
        if (stars.isEmpty()) {
            throw new IllegalStateException("角色形象目录为空");
        }
        handbookStars = Map.copyOf(stars);

        var system = rows(mapper, "system");
        renameCard = readRenameCost(mapper, system, "consumption_props");
        renameDiamonds = readRenameCost(mapper, system, "nick_change_cost");
        if (renameCard.itemId() == DIAMONDS || renameDiamonds.itemId() != DIAMONDS) {
            throw new IllegalStateException("角色改名报价币种无效");
        }
    }

    /** 返回图鉴记录已解锁的旧普通形象，图鉴以外的星级不能作为形象。 */
    List<Integer> unlockedImages(int templateId, int maxStar) {
        return handbookStars.getOrDefault(templateId, List.of()).stream()
            .filter(star -> star <= maxStar)
            .map(star -> imageId(templateId, star))
            .toList();
    }

    /** 返回持有足够改名卡时应扣的普通物品成本。 */
    RenameCost renameCard() {
        return renameCard;
    }

    /** 返回未持有足够改名卡时可选的钻石钱包成本。 */
    RenameCost renameDiamonds() {
        return renameDiamonds;
    }

    /** 编码旧形象 ID，启动时校验正值和协议 int32 的范围。 */
    private static int imageId(int templateId, int star) {
        if (templateId >= IMAGE_STAR_SCALE) {
            throw new IllegalStateException("角色形象英雄 ID 超过旧编码范围");
        }
        return Math.addExact(Math.multiplyExact(star, IMAGE_STAR_SCALE), templateId);
    }

    /** 读取唯一报价数组，现行旧配置每种付款只有一种消耗物品。 */
    private static RenameCost readRenameCost(ObjectMapper mapper, JsonNode system, String key) {
        var rows = system.valueStream().filter(row -> key.equals(row.path("key").asString())).toList();
        if (rows.size() != 1) {
            throw new IllegalStateException("角色改名报价缺失或重复：" + key);
        }
        var entries = mapper.readTree(rows.getFirst().path("value").asString());
        if (!entries.isArray() || entries.size() != 1) {
            throw new IllegalStateException("角色改名报价配置无效：" + key);
        }
        var entry = entries.get(0);
        return new RenameCost(positiveInt(entry.path("item_type")), positiveInt(entry.path("item_num")));
    }

    /** 拒绝缺失、负数和无法精确表示的整数字段。 */
    private static int positiveInt(JsonNode value) {
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() <= 0) {
            throw new IllegalStateException("个人空间配置应为正整数");
        }
        return value.asInt();
    }

    /** 读取客户端同源的随包配置，空表视作部署缺失。 */
    private static JsonNode rows(ObjectMapper mapper, String table) {
        try (var input = RoleProfileRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input == null) {
                throw new IllegalStateException("个人空间缺少配置：" + table);
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("个人空间配置为空：" + table);
            }
            return rows;
        } catch (IOException failure) {
            throw new IllegalStateException("个人空间配置读取失败：" + table, failure);
        }
    }
}
