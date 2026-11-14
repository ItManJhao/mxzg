/**
 * 普通库存到账明细专项：在独立H2和真实角色行锁中核对前后数量、稳定身份及精确加法。
 * 测试只调用生产InventoryService和AssetSyncService，不启动业务协议或访问日常角色数据库。
 * 每项使用独享V7结构，外层事务由用例提供，确保无事务和溢出均不留下资产或通知。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroCapacityService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class InventoryCreditTest {
    /** 每项独占内存库，供夹具准备及已提交资产核对，结束时关闭。 */
    private JdbcTemplate jdbc;

    /** 与生产数据库入口共享连接的真实外层事务。 */
    private TransactionTemplate transaction;

    /** 本次被验证的普通库存入口，不以替身模拟SQL或余额。 */
    private InventoryService inventory;

    /** 真实角色行锁和持久版本入口；测试不使用角色初始化规则。 */
    private RoleRepository roles;

    /** 仅记录真正提交后的资产事件，事务内及回滚时必须保持不变。 */
    private List<AssetSyncService.Changed> notifications;

    /** 创建独立V7数据库并装配生产库存、角色锁及统一提交同步。 */
    @BeforeEach
    void createIsolatedInventory() {
        String databaseUrl = "jdbc:h2:mem:inventory_credit_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("7").load().migrate();
        var source = new DriverManagerDataSource(databaseUrl, "sa", "");
        jdbc = new JdbcTemplate(source);
        transaction = new TransactionTemplate(new DataSourceTransactionManager(source));
        notifications = new ArrayList<>();
        var sync = new AssetSyncService(jdbc, event -> notifications.add((AssetSyncService.Changed) event));
        roles = new RoleRepository(jdbc, sync, mock(RoleRules.class), mock(HeroCapacityService.class));
        inventory = new InventoryService(jdbc, sync, new ObjectMapper(), roles);
    }

    /** 关闭用例独享数据库，不保存测试资产或连接。 */
    @AfterEach
    void closeDatabase() {
        jdbc.execute("SHUTDOWN");
    }

    /** 建立仅属于本独立库的角色，不通过GM或玩家发奖入口。 */
    private String role() {
        String roleId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id) "
                        + "VALUES (?,?,?,1,0,0,?,'local-1')",
                roleId, "credit_" + roleId, "Inventory", "credit_" + roleId);
        return roleId;
    }

    /** 调用方只提供事务，由生产credit自行获得真实角色锁。 */
    private InventoryService.Credit credit(String roleId, int itemId, long quantity) {
        return transaction.execute(status -> inventory.credit(roleId, itemId, quantity));
    }

    /** 新建和再次入账返回真实前后数量，同一装备配置只维护一条稳定普通库存记录。 */
    @Test
    void creditReturnsActualQuantitiesAndPreservesTheStackIdentity() {
        String roleId = role();
        int itemId = 1_004_001;
        var first = credit(roleId, itemId, 2);
        assertEquals(new InventoryService.Credit(itemId, first.instanceId(), 0, 2, 2), first);
        assertEquals(UUID.fromString(first.instanceId()).toString(), first.instanceId());
        var second = credit(roleId, itemId, 3);
        assertEquals(new InventoryService.Credit(itemId, first.instanceId(), 2, 3, 5), second);
        assertEquals(new InventoryService.Item(itemId, 5, first.instanceId()),
                inventory.find(roleId, itemId).orElseThrow());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_inventory WHERE role_id=?", Integer.class, roleId));
        assertEquals(2, roles.revision(roleId));
        assertEquals(List.of(new AssetSyncService.Changed(roleId), new AssetSyncService.Changed(roleId)), notifications);
    }

    /** 历史零余额仍是已存在记录，查询和重新入账都保留stack:字符串身份，不另建UUID。 */
    @Test
    void zeroBalanceKeepsItsExistingNonUuidIdentity() {
        String roleId = role();
        String identity = "stack:" + roleId + ":900401";
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,900401,0,?)",
                roleId, identity);
        assertEquals(new InventoryService.Item(900401, 0, identity), inventory.find(roleId, 900401).orElseThrow());
        assertTrue(inventory.find(roleId, 900102).isEmpty());
        assertEquals(0, roles.revision(roleId));
        assertTrue(notifications.isEmpty());
        assertEquals(new InventoryService.Credit(900401, identity, 0, 7, 7), credit(roleId, 900401, 7));
        assertEquals(new InventoryService.Item(900401, 7, identity), inventory.find(roleId, 900401).orElseThrow());
        assertEquals(1, roles.revision(roleId));
    }

    /** 溢出在写SQL和推进版本前拒绝，调用方即使捕获异常后提交也不能改变旧记录。 */
    @Test
    void overflowDoesNotRewriteQuantityIdentityOrRevision() {
        String roleId = role();
        String identity = "inventory-boundary";
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,900101,?,?)",
                roleId, Long.MAX_VALUE, identity);
        var before = inventory.find(roleId, 900101).orElseThrow();
        transaction.executeWithoutResult(status ->
                assertThrows(ArithmeticException.class, () -> inventory.credit(roleId, 900101, 1)));
        assertEquals(before, inventory.find(roleId, 900101).orElseThrow());
        assertEquals(0, roles.revision(roleId));
        assertTrue(notifications.isEmpty());
    }

    /** 无外层事务和非正数量不能先写资产，精灵仍必须走独立实例入口。 */
    @Test
    void missingTransactionAndInvalidCreditsNeverCreateInventory() {
        String roleId = role();
        assertThrows(IllegalStateException.class, () -> inventory.credit(roleId, 900101, 1));
        for (long quantity : List.of(0L, -1L, Long.MIN_VALUE)) {
            assertThrows(IllegalArgumentException.class, () -> credit(roleId, 900101, quantity));
        }
        assertThrows(IllegalArgumentException.class, () -> credit(roleId, 2_000_002, 1));
        assertThrows(IllegalArgumentException.class, () -> inventory.find(roleId, 2_000_002));
        assertTrue(inventory.list(roleId).isEmpty());
        assertEquals(0, roles.revision(roleId));
        assertTrue(notifications.isEmpty());
    }
}
