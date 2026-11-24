/**
 * 按旧服获得规则迁移新版已留存的五星发放证据。只读取原成功回执，
 * 不以当前名册或图鉴反推历史。已到五星的升星回执继续原表读取。
 */
package db.migration;

import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Set;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public class V58_1__backfill_hero_five_star_grants extends BaseJavaMigration {
    /** 仅用于 V58 之前的 GM 回执。原导入 5fe6e5ae 至 V57 的英雄类型表只做过路径迁移。 */
    private static final Set<Integer> LEGACY_FIVE_STAR_TEMPLATES = Set.of(
            10105006, 10105007, 10105008, 10105009, 10105010, 10105011, 10105013, 10105014,
            10105015, 10105018, 10105019, 10105020, 10105021, 10105022, 10105023,
            10205006, 10205007, 10205008, 10205009, 10205010, 10205011, 10204013, 10205014,
            10205015, 10205018, 10205019, 10205020, 10205021, 10205022, 10205023,
            10305006, 10305007, 10305008, 10305009, 10305010, 10305011, 10305013, 10305014,
            10305015, 10305018, 10305019, 10305020, 10305021, 10305022, 10305023,
            10405004, 10405005, 10405006, 10405007, 10405008, 10405009, 10405010, 10405014,
            10405015, 10405016, 10405017, 10405018, 10405019, 10405020,
            10504003, 10505004, 10505005, 10505006, 10505007, 10505009, 10505010, 10505011,
            10505014, 10505015, 10505016, 10505017, 10505018, 10505019, 10505020, 10505021,
            10701001, 10701003, 10701004, 10701006);

    /** 复用原回执使用的 JSON 格式。 */
    private final ObjectMapper mapper = new ObjectMapper();
    /** 核对已持久化的原始字节摘要，再从回执提取发放实例。 */
    private final RewardReceiptPayloads payloads = new RewardReceiptPayloads(mapper);

    /** 迁移默认可证明的英雄发放来源。实例 ID 去重允许同一结果同时留存在多个旧入口。 */
    @Override
    public void migrate(Context context) throws SQLException {
        Connection connection = context.getConnection();
        try (var insert = connection.prepareStatement("""
                INSERT INTO game_hero_five_star_grant(role_id,acquisition_key,quantity)
                VALUES (?,?,?)
                ON DUPLICATE KEY UPDATE quantity=quantity
                """)) {
            for (String table : Set.of("game_hero_normal_summon", "game_hero_summon_receipt",
                    "game_hero_fragment_combination", "game_main_chapter_first_reward",
                    "game_main_chapter_milestone_receipt", "game_vip_task_claim")) {
                backfillReceipts(connection, insert, table, "payload_json", "payload_hash", "/actual");
            }
            for (String table : Set.of("game_daily_dungeon_request", "game_tower_request", "game_arena_challenge")) {
                backfillReceipts(connection, insert, table, "receipt_json", "receipt_hash", "/actual");
            }
            backfillReceipts(connection, insert, "game_main_chapter_idle_receipt",
                    "payload_json", "payload_hash", "/receipt/actual");
            backfillReceipts(connection, insert, "game_role_welcome_gift",
                    "payload_json", "payload_hash", "");
            backfillReceipts(connection, insert, "game_main_chapter_battle",
                    "settlement_json", null, "/actual");
            backfillGmGrants(connection, insert);
        }
    }

    /** 从冻结的实际奖励或初始阶段直接保存的发奖通知提取英雄，不读计划、名册或展示数据。 */
    private void backfillReceipts(Connection connection, PreparedStatement insert, String table,
                                  String payloadColumn, String hashColumn, String rewardPath) throws SQLException {
        String hashProjection = hashColumn == null ? "" : "," + hashColumn;
        String select = "SELECT role_id," + payloadColumn + hashProjection + " FROM " + table
                + " WHERE " + payloadColumn + " LIKE '%\"heroes\":[{%'";
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(select)) {
            while (rows.next()) {
                String roleId = rows.getString(1);
                String json = rows.getString(2);
                JsonNode reward = (hashColumn == null ? mapper.readTree(json)
                        : payloads.read(json, rows.getString(3), JsonNode.class)).at(rewardPath);
                var heroes = reward.path("heroes");
                if (!heroes.isArray() || heroes.isEmpty()) {
                    continue;
                }
                if (!roleId.equals(reward.path("roleId").asString(""))) {
                    throw new IllegalStateException("历史发奖角色归属无效：" + table + "/" + roleId);
                }
                for (var hero : heroes) {
                    var star = hero.path("star");
                    if (star.isIntegralNumber() && star.asLong() == 5) {
                        String instanceId = hero.path("instanceId").asString("");
                        if (!RewardReceiptPayloads.validId(instanceId)) {
                            throw new IllegalStateException("历史五星发奖实例编号无效：" + table + "/" + roleId);
                        }
                        insertGrant(insert, roleId, instanceId, 1);
                    }
                }
            }
        }
    }

    /** 旧 GM 回执只保存固定模板和数量，原 GM 按模板初始星级批量创建，使用原请求编号去重。 */
    private void backfillGmGrants(Connection connection, PreparedStatement insert) throws SQLException {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery("""
                SELECT role_id,request_id,config_id,quantity FROM game_gm_grant WHERE kind='hero'
                """)) {
            while (rows.next()) {
                if (LEGACY_FIVE_STAR_TEMPLATES.contains(rows.getInt("config_id"))) {
                    insertGrant(insert, rows.getString("role_id"), "gm:" + rows.getString("request_id"),
                            rows.getInt("quantity"));
                }
            }
        }
    }

    /** 同一角色、同一历史实例或开发请求只补一次，源码迁移重复执行时不会增加已补进度。 */
    private void insertGrant(PreparedStatement statement, String roleId, String key, int quantity) throws SQLException {
        statement.setString(1, roleId);
        statement.setString(2, key);
        statement.setInt(3, quantity);
        statement.executeUpdate();
    }
}
