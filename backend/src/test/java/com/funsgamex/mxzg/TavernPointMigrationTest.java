/**
 * 冒险点V26迁移专项：在每例独享的H2旧库中保存真实库存，再运行生产Flyway迁移。
 * 验证已有零余额及超上限余额按原量移交、缺记录不预发初值，历史回包和资产版本不变。
 * 非法旧库存由隔离夹具准备，迁移必须拒绝且保留旧记录；不连接日常库或启动游戏服务。
 */
package com.funsgamex.mxzg;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TavernPointMigrationTest {
    /** 已有成功回包的原始字符串，含旧点数结果；迁移不得重算或改写其中的历史字段。 */
    private static final String HISTORICAL_RESULT = """
            {"auditVersion":1,"rewards":[{"itemId":900401,"quantity":100}],"tavern":{"before":0,"after":100}}
            """.strip();

    /** 每例随机生成的独立内存库地址，结束时关闭；不读取日常服务的数据库配置。 */
    private String databaseUrl;

    /** 只用于本例准备V25旧记录和核对迁移后的实际持久数据。 */
    private JdbcTemplate jdbc;

    /** 建立完整V25旧结构，使生产V26读取真实旧库存，而非测试内重写迁移SQL。 */
    @BeforeEach
    void createIsolatedLegacyDatabase() {
        databaseUrl = "jdbc:h2:mem:tavern_migration_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        var source = new DriverManagerDataSource(databaseUrl, "sa", "");
        jdbc = new JdbcTemplate(source);
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("25").load().migrate();
    }

    /** 释放本例独占内存库；准备失败时也不留下可复用的测试数据库。 */
    @AfterEach
    void closeIsolatedDatabase() {
        if (jdbc != null) {
            jdbc.execute("SHUTDOWN");
        }
    }

    /** 正、零、超额余额都原量迁入，缺记录不预建，重跑不会补发或改历史成功回包。 */
    @Test
    void migratesStoredBalancesWithoutGrantingMissingRolesOrRewritingHistory() {
        String positiveRole = createRole(7);
        String zeroRole = createRole(8);
        String overCapRole = createRole(9);
        String missingRole = createRole(10);
        seedInventory(positiveRole, 900401, 345);
        seedInventory(zeroRole, 900401, 0);
        seedInventory(overCapRole, 900401, 12_001);
        seedInventory(positiveRole, 1001001, 9);
        var otherInventoryBefore = jdbc.queryForMap(
                "SELECT * FROM game_inventory WHERE role_id=? AND item_id=1001001", positiveRole);
        var revisionsBefore = roleRevisions();
        String historicalRequest = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_main_chapter_command(role_id,request_id,result_json) VALUES (?,?,?)",
                positiveRole, historicalRequest, HISTORICAL_RESULT);

        migrateTo26();

        var expectedBalances = List.of(
                Map.of("role_id", positiveRole, "adventure_count", 345L),
                Map.of("role_id", zeroRole, "adventure_count", 0L),
                Map.of("role_id", overCapRole, "adventure_count", 12_001L));
        var migrated = jdbc.queryForList("SELECT role_id,adventure_count FROM game_tavern_point");
        assertEquals(3, migrated.size());
        assertEquals(java.util.Set.copyOf(expectedBalances), java.util.Set.copyOf(migrated));
        assertEquals(0L, number("SELECT COUNT(*) FROM game_inventory WHERE item_id=900401"));
        assertEquals(0L, number("SELECT COUNT(*) FROM game_tavern_point WHERE role_id=?", missingRole));
        assertEquals(otherInventoryBefore, jdbc.queryForMap(
                "SELECT * FROM game_inventory WHERE role_id=? AND item_id=1001001", positiveRole));
        assertEquals(revisionsBefore, roleRevisions());
        assertEquals(HISTORICAL_RESULT, jdbc.queryForObject(
                "SELECT result_json FROM game_main_chapter_command WHERE role_id=? AND request_id=?",
                String.class, positiveRole, historicalRequest));

        migrateTo26();

        assertEquals(3L, number("SELECT COUNT(*) FROM game_tavern_point"));
        assertEquals(java.util.Set.copyOf(expectedBalances), java.util.Set.copyOf(
                jdbc.queryForList("SELECT role_id,adventure_count FROM game_tavern_point")));
        assertEquals(0L, number("SELECT COUNT(*) FROM game_tavern_point WHERE role_id=?", missingRole));
        assertEquals(1L, number("SELECT COUNT(*) FROM flyway_schema_history WHERE version='26' AND success=TRUE"));
        assertEquals(revisionsBefore, roleRevisions());
        assertEquals(HISTORICAL_RESULT, jdbc.queryForObject(
                "SELECT result_json FROM game_main_chapter_command WHERE role_id=? AND request_id=?",
                String.class, positiveRole, historicalRequest));
    }

    /** 坏负数量不能被过滤成缺行后获得初值；迁移失败必须保留全部旧库存和资产版本。 */
    @Test
    void negativeLegacyQuantityRejectsMigrationWithoutDeletingOldBalances() {
        String invalidRole = createRole(11);
        String validRole = createRole(12);
        jdbc.execute("ALTER TABLE game_inventory DROP CONSTRAINT ck_inventory_quantity");
        seedInventory(invalidRole, 900401, -1);
        seedInventory(validRole, 900401, 456);
        seedInventory(validRole, 1001001, 3);
        var inventoryBefore = inventoryRows();
        var revisionsBefore = roleRevisions();

        assertThrows(FlywayException.class, this::migrateTo26);

        assertEquals(inventoryBefore, inventoryRows());
        assertEquals(revisionsBefore, roleRevisions());
        assertEquals(0L, number("SELECT COUNT(*) FROM flyway_schema_history WHERE version='26' AND success=TRUE"));
    }

    /** 坏NULL数量必须由新表非空约束拒绝，不能当成0、初始化或删除旧冒险点记录。 */
    @Test
    void nullLegacyQuantityRejectsMigrationWithoutDeletingOldBalances() {
        String invalidRole = createRole(13);
        String validRole = createRole(14);
        seedInventory(invalidRole, 900401, 1);
        seedInventory(validRole, 900401, 789);
        seedInventory(validRole, 1001001, 4);
        jdbc.execute("ALTER TABLE game_inventory ALTER COLUMN quantity DROP NOT NULL");
        jdbc.update("UPDATE game_inventory SET quantity=NULL WHERE role_id=? AND item_id=900401", invalidRole);
        var inventoryBefore = inventoryRows();
        var revisionsBefore = roleRevisions();

        assertThrows(FlywayException.class, this::migrateTo26);

        assertEquals(inventoryBefore, inventoryRows());
        assertEquals(revisionsBefore, roleRevisions());
        assertEquals(0L, number("SELECT COUNT(*) FROM flyway_schema_history WHERE version='26' AND success=TRUE"));
    }

    /** 超过JS安全整数的旧余额必须拒绝迁移，不得截成安全上限、归零或删除原记录。 */
    @Test
    void unsafeLegacyQuantityRejectsMigrationWithoutDeletingOldBalances() {
        String invalidRole = createRole(15);
        String validRole = createRole(16);
        seedInventory(invalidRole, 900401, 9_007_199_254_740_992L);
        seedInventory(validRole, 900401, 1_000);
        seedInventory(validRole, 1001001, 5);
        var inventoryBefore = inventoryRows();
        var revisionsBefore = roleRevisions();

        assertThrows(FlywayException.class, this::migrateTo26);

        assertEquals(inventoryBefore, inventoryRows());
        assertEquals(revisionsBefore, roleRevisions());
        assertEquals(0L, number("SELECT COUNT(*) FROM flyway_schema_history WHERE version='26' AND success=TRUE"));
    }

    /** 创建仅用于迁移的独立角色，显式保留非零资产版本以检测迁移意外推进。 */
    private String createRole(long revision) {
        String roleId = UUID.randomUUID().toString();
        String account = "migration_" + roleId;
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,"
                        + "login_account,server_id,state_revision) VALUES (?,?,?,1,0,0,?,'local-1',?)",
                roleId, account, "Migration", account, revision);
        return roleId;
    }

    /** 保存有稳定身份的旧普通堆叠；损坏数量只在各测试显式解除约束后注入。 */
    private void seedInventory(String roleId, int itemId, long quantity) {
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,?,?,?)",
                roleId, itemId, quantity, "stack:" + roleId + ":" + itemId);
    }

    /** 执行仓库内生产V26迁移；已成功时Flyway应识别版本并保持全部数据。 */
    private void migrateTo26() {
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("26").load().migrate();
    }

    /** 按稳定顺序冻结所有旧库存字段，包括合法0、损坏值和原instance_id。 */
    private List<Map<String, Object>> inventoryRows() {
        return jdbc.queryForList("SELECT * FROM game_inventory ORDER BY role_id,item_id");
    }

    /** 读取所有角色的真实资产版本，迁移不应触发任何业务发奖或版本更新。 */
    private List<Map<String, Object>> roleRevisions() {
        return jdbc.queryForList("SELECT id,state_revision FROM game_role ORDER BY id");
    }

    /** 读取本例隔离库中的单个计数，用于核对缺记录和迁移成功标记。 */
    private long number(String sql, Object... parameters) {
        return jdbc.queryForObject(sql, Long.class, parameters);
    }
}
