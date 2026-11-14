/**
 * 礼包持有只读回归：每项使用独立H2和真实V19→V20迁移，核对原始字段、角色隔离及无副作用。
 * 事务代理沿用生产注解；仅在本测试库准备持有记录，不恢复购买或领取，也不读取玩家库。
 * 库存不转换为权益，缺表/坏字段不能被当作可信空持有列表。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.privilege.PrivilegeGiftService;
import com.funsgamex.mxzg.privilege.PrivilegeGiftService.Gift;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;

class PrivilegeGiftServiceTest {
    /** 本用例独享数据库地址，用于精确控制升级前后的迁移版本。 */
    private String databaseUrl;
    /** 仅操作本用例内存库的夹具入口。 */
    private JdbcTemplate jdbc;
    /** 与读取服务共用数据源，模拟调用者真实角色锁事务。 */
    private DataSourceTransactionManager transactions;
    /** 包含生产事务注解代理的待测服务，不直接绕过MANDATORY检查。 */
    private PrivilegeGiftService service;

    /** 创建真实V19结构，尚不执行礼包表迁移，以便验证缺表和升级边界。 */
    @BeforeEach
    void createPreviousSchema() {
        databaseUrl = "jdbc:h2:mem:privilege_gifts_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("19").load().migrate();
        var source = new DriverManagerDataSource(databaseUrl, "sa", "");
        jdbc = new JdbcTemplate(source);
        transactions = new DataSourceTransactionManager(source);
        var interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(transactions);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(new PrivilegeGiftService(jdbc));
        factory.addAdvice(interceptor);
        service = (PrivilegeGiftService) factory.getProxy();
    }

    /** 关闭当前用例的独立内存库，避免重复执行保留实例。 */
    @AfterEach
    void closeDatabase() {
        jdbc.execute("SHUTDOWN");
    }

    /** 仅执行到V20礼包表，未来迁移不扩大本历史边界回归。 */
    private void migrateGifts() {
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("20").load().migrate();
    }

    /** 直接准备本用例独享角色，保留可比对的资产版本及钱包初值。 */
    private String role() {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,"
                        + "login_account,server_id,state_revision,role_experience) "
                        + "VALUES (?,?,?,7,123,45,?,'local-1',9,33)",
                id, "gift_" + id, "GiftTest", "gift_" + id);
        return id;
    }

    /** 只在独立测试库准备原始持有记录，不能作为生产购买/发放入口。 */
    private void gift(String id, String role, int config, long bought, long ends, int count, int active) {
        jdbc.update("INSERT INTO game_privilege_gift(id,role_id,gift_id,purchased_at_seconds,"
                        + "ends_at_seconds,purchase_count,active) VALUES (?,?,?,?,?,?,?)",
                id, role, config, bought, ends, count, active);
    }

    /** 模拟上游先验证并锁定真实存在角色，再调用只读持有入口。 */
    private <T> T locked(String role, Supplier<T> read) {
        return new TransactionTemplate(transactions).execute(status -> {
            jdbc.queryForObject("SELECT id FROM game_role WHERE id=? FOR UPDATE", String.class, role);
            return read.get();
        });
    }

    /** V20只增加空持有表，不将既有库存、时钟或钱包推断成礼包权益。 */
    @Test
    void migrationStartsEmptyAndPreservesExistingState() {
        String role = role();
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,900007,37,?)",
                role, "existing-item:" + role);
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,123456)", role);
        var before = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role);
        var inventory = jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", role);
        var idle = jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role);

        migrateGifts();

        assertTrue(locked(role, () -> service.held(role)).isEmpty());
        assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role));
        assertEquals(inventory, jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", role));
        assertEquals(idle, jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role));
    }

    /** 可信表实际无记录才返回不可变空列表；不执行首次查询补记录。 */
    @Test
    void actualEmptyHoldingListIsImmutable() {
        migrateGifts();
        String role = role();
        var result = locked(role, () -> service.held(role));
        assertTrue(result.isEmpty());
        assertThrows(UnsupportedOperationException.class,
                () -> result.add(new Gift("test", 100300, 0, 0, 0, 0)));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_privilege_gift", Integer.class));
    }

    /** 同角色同配置可以多条；含过期和active0原样保留，字符串ID不丢高位，其他角色隔离。 */
    @Test
    void preservesDuplicateConfigsInactiveRecordsAndStringIds() {
        migrateGifts();
        String role = role();
        String other = role();
        gift("9007199254740993012", role, 100300, 5000, 1000, 0, 0);
        gift("gift-b", role, 100300, 5001, 0, 7, 1);
        gift("other", other, 100300, 1, 0, 1, 1);

        var result = locked(role, () -> service.held(role));

        assertEquals(List.of(new Gift("9007199254740993012", 100300, 5000, 1000, 0, 0),
                new Gift("gift-b", 100300, 5001, 0, 7, 1)), result);
        assertThrows(UnsupportedOperationException.class, result::clear);
    }

    /** 查询过期active1记录不能清active或次数，也不改变角色资产revision。 */
    @Test
    void readingNeverExpiresOrMutatesRawRecords() {
        migrateGifts();
        String role = role();
        gift("expired", role, 100400, 1, 2, 8, 1);
        var before = jdbc.queryForMap("SELECT * FROM game_privilege_gift WHERE id='expired'");
        var roleBefore = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role);

        assertEquals(new Gift("expired", 100400, 1, 2, 8, 1), locked(role, () -> service.held(role)).getFirst());

        assertEquals(before, jdbc.queryForMap("SELECT * FROM game_privilege_gift WHERE id='expired'"));
        assertEquals(roleBefore, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role));
    }

    /** 事务门槛与角色参数保持明确，不能以无事务读取跳过上游角色锁约定。 */
    @Test
    void requiresTransactionAndKnownRoleContext() {
        migrateGifts();
        String role = role();
        assertThrows(IllegalTransactionStateException.class, () -> service.held(role));
        assertThrows(IllegalArgumentException.class, () -> locked(role, () -> service.held(null)));
        assertThrows(IllegalArgumentException.class, () -> locked(role, () -> service.held(" ")));
    }

    /** 缺礼包表是依赖损坏而非零权益；迁移后真实零行才可返回空。 */
    @Test
    void missingTableDoesNotBecomeAnEmptySnapshot() {
        String role = role();
        assertThrows(DataAccessException.class, () -> locked(role, () -> service.held(role)));
        migrateGifts();
        assertTrue(locked(role, () -> service.held(role)).isEmpty());
    }

    /** 数据库拒绝非法字段、缺失归属及主键重复，但不限制同角色同配置或结束早于购买。 */
    @Test
    void schemaRejectsInvalidFieldsAndOwnership() {
        migrateGifts();
        String role = role();
        assertThrows(DataIntegrityViolationException.class, () -> gift("bad-owner", "missing-role", 100300, 0, 0, 0, 0));
        assertThrows(DataIntegrityViolationException.class, () -> gift("bad-config", role, 0, 0, 0, 0, 0));
        assertThrows(DataIntegrityViolationException.class, () -> gift("bad-bought", role, 100300, -1, 0, 0, 0));
        assertThrows(DataIntegrityViolationException.class, () -> gift("bad-end", role, 100300, 0, -1, 0, 0));
        assertThrows(DataIntegrityViolationException.class, () -> gift("bad-count", role, 100300, 0, 0, -1, 0));
        assertThrows(DataIntegrityViolationException.class, () -> gift("bad-active", role, 100300, 0, 0, 0, 2));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO game_privilege_gift(id,role_id,gift_id,purchased_at_seconds,ends_at_seconds,purchase_count,active) "
                        + "VALUES ('null-config',?,NULL,0,0,0,0)", role));
        gift("same-id", role, 100300, 100, 1, 0, 0);
        assertThrows(DataIntegrityViolationException.class, () -> gift("same-id", role, 100400, 0, 0, 0, 0));
    }

    /** 即使测试刻意放宽列约束，读取层也拒绝null配置和空白ID，不把getInt的0当合法权益。 */
    @Test
    void invalidPersistedFieldsCannotDefaultDuringMapping() {
        migrateGifts();
        String role = role();
        gift(" ", role, 100300, 0, 0, 0, 0);
        assertThrows(IllegalStateException.class, () -> locked(role, () -> service.held(role)));
        jdbc.update("DELETE FROM game_privilege_gift WHERE role_id=?", role);
        jdbc.execute("ALTER TABLE game_privilege_gift ALTER COLUMN gift_id DROP NOT NULL");
        jdbc.update("INSERT INTO game_privilege_gift(id,role_id,gift_id,purchased_at_seconds,ends_at_seconds,purchase_count,active) "
                + "VALUES ('null-config',?,NULL,0,0,0,0)", role);
        assertThrows(IllegalStateException.class, () -> locked(role, () -> service.held(role)));
    }
}
