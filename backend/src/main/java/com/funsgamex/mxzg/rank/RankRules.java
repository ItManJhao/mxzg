/** 排行榜开放条件和点赞奖励，使用 Maven 打包的同源客户端原表。 */
package com.funsgamex.mxzg.rank;

import java.io.IOException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
final class RankRules {
    /** 本服入口需要达到的角色等级。 */
    final int localLevel;
    /** 跨服页签需要达到的角色等级。 */
    final int crossLevel;
    /** 每次成功给榜首点赞实际奖励的金币数。 */
    final long likeGold;

    /** 应用启动时读取且校验两个原表的业务配置。 */
    RankRules(ObjectMapper mapper) {
        var conditions = readRows(mapper, "opencondition");
        localLevel = level(conditions, "main_rank");
        crossLevel = level(conditions, "main_rank_cross");
        likeGold = readRows(mapper, "system").valueStream()
                .filter(row -> "worship_get_gold".equals(row.path("key").asString()))
                .findFirst().orElseThrow(() -> new IllegalStateException("排行榜点赞缺少金币奖励配置"))
                .path("value").asLong(-1);
        if (crossLevel < localLevel || likeGold <= 0) {
            throw new IllegalStateException("排行榜配置的等级或奖励值无效");
        }
    }

    /** 读取只含使用角色等级判定的原开放条件，配置转型时拒绝误用。 */
    private static int level(JsonNode conditions, String atom) {
        var row = conditions.valueStream().filter(item -> atom.equals(item.path("atom").asString()))
                .findFirst().orElseThrow(() -> new IllegalStateException("缺少排行榜开放条件：" + atom));
        int level = row.path("condition_value").asInt(-1);
        if (row.path("condition_type").asInt() != 1 || level < 1 || row.path("world_level").asInt() != 1
                || row.path("open_server_day").asInt(-1) != 0) {
            throw new IllegalStateException("排行榜开放条件超出当前规则：" + atom);
        }
        return level;
    }

    /** 加载实际随服务发行的策划 JSON 行；缺失时终止装配。 */
    private static JsonNode readRows(ObjectMapper mapper, String table) {
        try (var input = RankRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input == null) {
                throw new IllegalStateException("排行榜配置文件缺失：" + table);
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray()) {
                throw new IllegalStateException("排行榜配置行无效：" + table);
            }
            return rows;
        } catch (IOException error) {
            throw new IllegalStateException("读取排行榜配置失败：" + table, error);
        }
    }
}
