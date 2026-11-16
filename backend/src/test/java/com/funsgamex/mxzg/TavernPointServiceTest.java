/**
 * 冒险点独立领域专项：随机H2、真实角色锁和统一事务同步验证初始化、封顶、并发及回滚。
 * 只调用生产领域，不启动服务、不访问日常数据库，也不注册酒馆任务或玩家领取协议。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroCapacityService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import com.funsgamex.mxzg.tavern.TavernPointRules;
import com.funsgamex.mxzg.tavern.TavernPointService;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.Future;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TavernPointServiceTest {
    /** 每项随机独占H2，故障注入及结束时SHUTDOWN均只作用于该库。 */
    private JdbcTemplate jdbc;
    /** 真实外层事务和角色行锁使用同一数据源。 */
    private TransactionTemplate transaction;
    /** 角色锁和持久资产版本读取入口，不模拟SQL或锁行为。 */
    private RoleRepository roles;
    /** 被测生产领域，安装MANDATORY事务代理，不给它独立提交能力。 */
    private TavernPointService points;
    /** 普通库存边界，用于证明冒险点不能走堆叠绕过领域规则。 */
    private InventoryService inventory;
    /** 真实提交后的统一事件；并发用例同样按提交次数核对。 */
    private List<AssetSyncService.Changed> notifications;

    /** 真实迁移至V26，装配唯一冒险点持久入口和真实角色锁。 */
    @BeforeEach
    void createIsolatedDomain() {
        String url = "jdbc:h2:mem:tavern_point_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000";
        Flyway.configure().dataSource(url, "sa", "").load().migrate();
        var source = new DriverManagerDataSource(url, "sa", "");
        jdbc = new JdbcTemplate(source);
        var manager = new DataSourceTransactionManager(source);
        transaction = new TransactionTemplate(manager);
        notifications = new CopyOnWriteArrayList<>();
        var sync = new AssetSyncService(jdbc, event -> notifications.add((AssetSyncService.Changed) event));
        roles = new RoleRepository(jdbc, sync, mock(RoleRules.class), mock(HeroCapacityService.class));
        var json = new ObjectMapper();
        inventory = new InventoryService(jdbc, sync, json, roles);
        var target = new TavernPointService(jdbc, roles, new TavernPointRules(json), sync);
        var interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(manager);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(target);
        factory.addAdvice(interceptor);
        points = (TavernPointService) factory.getProxy();
    }

    /** 销毁本项独立数据库，不保留资产、会话或后台服务。 */
    @AfterEach
    void closeDatabase() {
        if (jdbc != null) {
            jdbc.execute("SHUTDOWN");
        }
    }

    /** 直接创建独立测试角色，不顺带创建冒险点或触发登录业务。 */
    private String role() {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id) "
                        + "VALUES (?,?,?,1,0,0,?,'local-1')", id, "tavern_" + id, "Tavern", "tavern_" + id);
        return id;
    }

    /** 准备已有独立领域原量，合法0与超cap均属于已初始化记录，不推进测试版本。 */
    private void seed(String role, long count) {
        jdbc.update("INSERT INTO game_tavern_point(role_id,adventure_count) VALUES (?,?)", role, count);
    }

    /** 通过生产领域读取当前状态，可能在外层事务中懒初始化一次。 */
    private TavernPointService.State current(String role, long limit) {
        return transaction.execute(status -> points.current(role, limit));
    }

    /** 读取本测试库原始持久余额，用于证明失败未留下补发或重复记录。 */
    private long stored(String role) {
        return jdbc.queryForObject("SELECT adventure_count FROM game_tavern_point WHERE role_id=?", Long.class, role);
    }

    /** 同源真实初值为2000；同事务及跨事务重复读不补差、不重复版本或通知。 */
    @Test
    void missingRowInitializesExactlyOnceAndCommitsOneRevision() {
        String role = role();
        var first = transaction.execute(status -> {
            var state = points.current(role, 11_000);
            assertEquals(state, points.current(role, 11_000));
            assertEquals(1, roles.revision(role));
            assertTrue(notifications.isEmpty());
            return state;
        });
        assertEquals(new TavernPointService.State(1, 2_000, 11_000), first);
        assertEquals(first, current(role, 11_000));
        assertEquals(2_000, stored(role));
        assertEquals(1, roles.revision(role));
        assertEquals(List.of(new AssetSyncService.Changed(role)), notifications);
        assertTrue(inventory.list(role).isEmpty());
    }

    /** 已有0不重新初始化，超cap不裁回；读取其他角色同样不串资产或推进版本。 */
    @Test
    void existingZeroAndAboveLimitBalancesArePreserved() {
        String zero = role();
        String above = role();
        seed(zero, 0);
        seed(above, 12_000);
        assertEquals(new TavernPointService.State(1, 0, 0), current(zero, 0));
        assertEquals(new TavernPointService.State(1, 12_000, 11_000), current(above, 11_000));
        assertEquals(0, roles.revision(zero));
        assertEquals(0, roles.revision(above));
        assertTrue(notifications.isEmpty());
    }

    /** 缺行初值与本次截顶奖励同事务提交，初值不计入实际奖励数量。 */
    @Test
    void firstCreditUsesTheInitialBalanceButOnlyReportsTheRequestedGain() {
        String role = role();
        var result = transaction.execute(status -> points.credit(role, 7, 2_005));
        assertEquals(new TavernPointService.Credit(2_000, 5, 2_005), result);
        assertEquals(2_005, stored(role));
        assertEquals(1, roles.revision(role));
        assertEquals(List.of(new AssetSyncService.Changed(role)), notifications);
    }

    /** 已满与超cap只返回零到账，开发准备明确无cap并仍走同一持久记录和事务版本。 */
    @Test
    void businessCapsDoNotReduceOldBalanceAndDevelopmentCanPrepareAboveTheCap() {
        String role = role();
        seed(role, 11_000);
        assertEquals(new TavernPointService.Credit(11_000, 0, 11_000),
                transaction.execute(status -> points.credit(role, 8, 11_000)));
        assertEquals(0, roles.revision(role));
        assertTrue(notifications.isEmpty());
        assertEquals(new TavernPointService.Credit(11_000, 7, 11_007),
                transaction.execute(status -> points.creditForDevelopment(role, 7)));
        assertEquals(new TavernPointService.Credit(11_007, 0, 11_007),
                transaction.execute(status -> points.credit(role, 9, 11_000)));
        assertEquals(11_007, stored(role));
        assertEquals(1, roles.revision(role));
        assertEquals(1, notifications.size());
    }

    /** 并发缺行读取等待真实角色锁；第二个事务看到首笔已提交初值，不再次补发。 */
    @Test
    void concurrentInitializationWaitsForTheRoleLockAndDoesNotDuplicateTheInitialGrant() throws Exception {
        String role = role();
        var started = new CountDownLatch(1);
        var next = new AtomicReference<Future<TavernPointService.State>>();
        try (var executor = Executors.newSingleThreadExecutor()) {
            var first = transaction.execute(status -> {
                roles.lock(role);
                next.set(executor.submit(() -> {
                    started.countDown();
                    return current(role, 11_000);
                }));
                assertTrue(assertDoesNotThrow(() -> started.await(10, TimeUnit.SECONDS)));
                assertThrows(TimeoutException.class, () -> next.get().get(200, TimeUnit.MILLISECONDS));
                return points.current(role, 11_000);
            });
            assertEquals(first, next.get().get(10, TimeUnit.SECONDS));
        }
        assertEquals(2_000, stored(role));
        assertEquals(1, roles.revision(role));
        assertEquals(1, notifications.size());
    }

    /** 两笔临近上限发奖串行读取真实前值；总余额不会因同时读取旧值而越过业务上限。 */
    @Test
    void concurrentCappedCreditsAcceptOnlyTheRemainingAllowance() throws Exception {
        String role = role();
        seed(role, 10_995);
        var started = new CountDownLatch(1);
        var next = new AtomicReference<Future<TavernPointService.Credit>>();
        try (var executor = Executors.newSingleThreadExecutor()) {
            var first = transaction.execute(status -> {
                roles.lock(role);
                next.set(executor.submit(() -> {
                    started.countDown();
                    return transaction.execute(inner -> points.credit(role, 4, 11_000));
                }));
                assertTrue(assertDoesNotThrow(() -> started.await(10, TimeUnit.SECONDS)));
                assertThrows(TimeoutException.class, () -> next.get().get(200, TimeUnit.MILLISECONDS));
                return points.credit(role, 4, 11_000);
            });
            assertEquals(new TavernPointService.Credit(10_995, 4, 10_999), first);
            assertEquals(new TavernPointService.Credit(10_999, 1, 11_000), next.get().get(10, TimeUnit.SECONDS));
        }
        assertEquals(11_000, stored(role));
        assertEquals(2, roles.revision(role));
        assertEquals(2, notifications.size());
    }

    /** 外层回滚同时撤销懒初始化、实际奖励和revision；重新读取才能提交一次初值。 */
    @Test
    void rollbackRemovesTheInitializationAndAllChangesWithoutSendingAnEvent() {
        String role = role();
        transaction.executeWithoutResult(status -> {
            points.current(role, 11_000);
            points.credit(role, 5, 11_000);
            status.setRollbackOnly();
        });
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_tavern_point WHERE role_id=?", Integer.class, role));
        assertEquals(0, roles.revision(role));
        assertTrue(notifications.isEmpty());
        assertEquals(2_000, current(role, 11_000).adventureCount());
        assertEquals(1, roles.revision(role));
        assertEquals(1, notifications.size());
    }

    /** 写入前先精确相加；既有或缺行开发发放溢出时都不能留下余额或初始化。 */
    @Test
    void overflowDoesNotLeaveAnUpdatedBalanceOrPartialInitialization() {
        String existing = role();
        seed(existing, TavernPointRules.MAX_SAFE_INTEGER);
        assertThrows(ArithmeticException.class,
                () -> transaction.executeWithoutResult(status -> points.creditForDevelopment(existing, 1)));
        assertEquals(TavernPointRules.MAX_SAFE_INTEGER, stored(existing));
        assertEquals(0, roles.revision(existing));
        String missing = role();
        assertThrows(ArithmeticException.class,
                () -> transaction.executeWithoutResult(status -> points.creditForDevelopment(missing, TavernPointRules.MAX_SAFE_INTEGER)));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_tavern_point WHERE role_id=?", Integer.class, missing));
        assertEquals(0, roles.revision(missing));
        assertTrue(notifications.isEmpty());
    }

    /** 故障注入的NULL与负数必须拒绝，不能借懒建覆盖坏记录或发送新版本。 */
    @Test
    void damagedStoredBalancesRejectInsteadOfReinitializing() {
        jdbc.execute("ALTER TABLE game_tavern_point DROP CONSTRAINT ck_tavern_point_nonnegative");
        jdbc.execute("ALTER TABLE game_tavern_point ALTER COLUMN adventure_count DROP NOT NULL");
        for (Long invalid : new Long[]{null, -1L, TavernPointRules.MAX_SAFE_INTEGER + 1}) {
            String role = role();
            jdbc.update("INSERT INTO game_tavern_point(role_id,adventure_count) VALUES (?,?)", role, invalid);
            assertThrows(IllegalStateException.class, () -> current(role, 11_000));
            assertThrows(IllegalStateException.class,
                    () -> transaction.executeWithoutResult(status -> points.creditForDevelopment(role, 1)));
            assertEquals(invalid, jdbc.queryForObject("SELECT adventure_count FROM game_tavern_point WHERE role_id=?", Long.class, role));
            assertEquals(0, roles.revision(role));
        }
        assertTrue(notifications.isEmpty());
    }

    /** 普通库存的读写与全量快照均拒绝冒险点，连错入的0堆叠也不能静默过滤。 */
    @Test
    void ordinaryInventoryCannotReadWriteOrHideAnAdventurePointStack() {
        String role = role();
        assertThrows(IllegalArgumentException.class, () -> inventory.find(role, 900401));
        assertThrows(IllegalArgumentException.class,
                () -> transaction.executeWithoutResult(status -> inventory.credit(role, 900401, 1)));
        assertThrows(IllegalArgumentException.class,
                () -> transaction.executeWithoutResult(status -> inventory.debit(role, 900401, 1)));
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,900401,0,?)",
                role, "legacy-error:" + role);
        assertThrows(IllegalStateException.class, () -> inventory.list(role));
        assertEquals(0, roles.revision(role));
        assertTrue(notifications.isEmpty());
    }

    /** 无事务、无角色、非正奖励和负上限均在任何资产写入之前拒绝。 */
    @Test
    void invalidCallsCannotInitializeOrChangeTheRole() {
        String role = role();
        assertThrows(IllegalTransactionStateException.class, () -> points.current(role, 11_000));
        assertThrows(IllegalArgumentException.class, () -> current(role, -1));
        assertThrows(IllegalArgumentException.class, () -> current(role, TavernPointRules.MAX_SAFE_INTEGER + 1));
        assertThrows(IllegalArgumentException.class, () -> current("", 11_000));
        for (long quantity : List.of(0L, -1L, TavernPointRules.MAX_SAFE_INTEGER + 1)) {
            assertThrows(IllegalArgumentException.class,
                    () -> transaction.executeWithoutResult(status -> points.credit(role, quantity, 11_000)));
        }
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_tavern_point", Integer.class));
        assertEquals(0, roles.revision(role));
        assertTrue(notifications.isEmpty());
    }

    /** 配置必须真实存在且唯一、非负整数；0可以作为配置，但缺失不能默认为0。 */
    @Test
    void initialRuleRejectsMissingDuplicateAndInvalidValues() {
        assertEquals(2_000, new TavernPointRules(new ObjectMapper()).initialAdventureCount());
        assertEquals(0, parsedRules("{\"rows\":[{\"key\":\"tavern_initial_item\",\"value\":0}]}").initialAdventureCount());
        for (String content : List.of("{\"rows\":[]}", "{\"rows\":[{\"key\":\"other\",\"value\":1}]}",
                "{\"rows\":[{\"key\":\"tavern_initial_item\",\"value\":-1}]}",
                "{\"rows\":[{\"key\":\"tavern_initial_item\",\"value\":\"2000\"}]}",
                "{\"rows\":[{\"key\":\"tavern_initial_item\",\"value\":9007199254740992}]}",
                "{\"rows\":[{\"key\":\"tavern_initial_item\",\"value\":1},{\"key\":\"tavern_initial_item\",\"value\":2}]}")) {
            assertThrows(IllegalStateException.class, () -> parsedRules(content));
        }
    }

    /** 仅替换配置解析输入，不修改共享生产文件，也不绕过生产规则构造校验。 */
    private TavernPointRules parsedRules(String content) {
        var reader = mock(ObjectMapper.class);
        when(reader.readTree(any(InputStream.class))).thenReturn(new ObjectMapper().readTree(content));
        return new TavernPointRules(reader);
    }
}
