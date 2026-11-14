/**
 * 钱包入账专项回归：使用真实H2角色行锁，验证两币种独立精确加法及原子写入。
 * 复用生产RoleRepository和AssetSyncService，外层事务由测试提供，不启动游戏服务或发放玩家资产。
 * 测试仅需V6已建立的钱包及持久版本结构，不把后续业务迁移或角色初始规则作为夹具依赖。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroCapacityService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class RoleCurrencyCreditTest {
    /** 本用例独享内存库地址，结束时关闭，不连接日常库。 */
    private String databaseUrl;
    /** 仅为本用例准备余额并核对真实已提交数据。 */
    private JdbcTemplate jdbc;
    /** 与JdbcTemplate共享数据源的真实事务管理器，行锁持有至外层事务完成。 */
    private DataSourceTransactionManager transactions;
    /** 生产钱包入口，不替换SQL或用内存余额模拟。 */
    private RoleRepository roles;
    /** 生产提交事件记录；并发事务可安全追加，回滚不得留下通知。 */
    private List<AssetSyncService.Changed> notifications;

    /** 创建独立V6结构与生产钱包/同步入口，仅模拟本测试不调用的角色规则和容量依赖。 */
    @BeforeEach
    void createIsolatedWallet() {
        databaseUrl = "jdbc:h2:mem:currency_credit_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000";
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("6").load().migrate();
        var source = new DriverManagerDataSource(databaseUrl, "sa", "");
        jdbc = new JdbcTemplate(source);
        transactions = new DataSourceTransactionManager(source);
        notifications = new CopyOnWriteArrayList<>();
        var sync = new AssetSyncService(jdbc, event -> notifications.add((AssetSyncService.Changed) event));
        roles = new RoleRepository(jdbc, sync, mock(RoleRules.class), mock(HeroCapacityService.class));
    }

    /** 释放测试独占内存库，不保留连接、资产或工作线程。 */
    @AfterEach
    void closeDatabase() {
        jdbc.execute("SHUTDOWN");
    }

    /** 在隔离库直接建立钱包边界夹具，不通过开发GM或角色初始化流程。 */
    private String role(long gold, long diamonds) {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id) "
                        + "VALUES (?,?,?,1,?,?,?,'local-1')", id, "wallet_" + id, "Wallet", gold, diamonds, "wallet_" + id);
        return id;
    }

    /** 读取两个持久余额和资产版本，避免只看请求返回值误判已入账。 */
    private Map<String, Object> wallet(String roleId) {
        return jdbc.queryForMap("SELECT gold,diamonds,state_revision FROM game_role WHERE id=?", roleId);
    }

    /** 为生产入账方法提供调用方拥有的真实事务，不替方法预先加角色锁。 */
    private void credit(String roleId, long gold, long diamonds) {
        new TransactionTemplate(transactions).executeWithoutResult(status -> roles.creditCurrency(roleId, gold, diamonds));
    }

    /** 非法奖励及缺事务调用均拒绝，不能先写钱包后才发现同步上下文缺失。 */
    @Test
    void invalidAwardsAndMissingTransactionNeverWriteTheWallet() {
        String id = role(100, 20);
        var before = wallet(id);
        for (long[] amount : List.of(new long[]{0, 0}, new long[]{-1, 1}, new long[]{1, -1},
                new long[]{Long.MIN_VALUE, Long.MAX_VALUE})) {
            assertThrows(IllegalArgumentException.class, () -> roles.creditCurrency(id, amount[0], amount[1]));
        }
        assertThrows(IllegalStateException.class, () -> roles.creditCurrency(id, 1, 0));
        assertEquals(before, wallet(id));
        assertTrue(notifications.isEmpty());
    }

    /** 金币和钻石没有共享总额上限，两个合法大数不能因跨币种相加溢出被误拒绝。 */
    @Test
    void independentCurrenciesCanEachReachTheLongLimit() {
        String id = role(0, 0);
        credit(id, Long.MAX_VALUE, Long.MAX_VALUE);
        assertEquals(Map.of("gold", Long.MAX_VALUE, "diamonds", Long.MAX_VALUE, "state_revision", 1L), wallet(id));
        assertEquals(List.of(new AssetSyncService.Changed(id)), notifications);
    }

    /** 任一币种溢出均在SQL和同步之前拒绝，即使调用方捕获异常后提交也不能写入另一币种。 */
    @Test
    void eitherCurrencyOverflowLeavesBothBalancesAndVersionUntouched() {
        for (long[] balances : List.of(new long[]{Long.MAX_VALUE, 10}, new long[]{10, Long.MAX_VALUE})) {
            String id = role(balances[0], balances[1]);
            var before = wallet(id);
            new TransactionTemplate(transactions).executeWithoutResult(status ->
                    assertThrows(ArithmeticException.class, () -> roles.creditCurrency(id, 1, 1)));
            assertEquals(before, wallet(id));
        }
        assertTrue(notifications.isEmpty());
    }

    /** 后续业务失败回滚同次钱包和同步版本，不提前发送已经提交的资产通知。 */
    @Test
    void outerFailureRollsBackTheWalletVersionAndNotification() {
        String id = role(100, 20);
        var before = wallet(id);
        assertThrows(IllegalStateException.class, () -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.creditCurrency(id, 5, 7);
            assertTrue(notifications.isEmpty());
            throw new IllegalStateException("模拟后续奖励发放失败");
        }));
        assertEquals(before, wallet(id));
        assertTrue(notifications.isEmpty());
    }

    /** 已锁角色可安全重复调用，同事务内两次入账仍只递增一次版本并在提交后通知。 */
    @Test
    void repeatedCreditsReuseTheExistingRoleLockAndAssetSyncBoundary() {
        String id = role(100, 20);
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(id);
            roles.creditCurrency(id, 5, 0);
            roles.creditCurrency(id, 0, 7);
            assertEquals(Map.of("gold", 105L, "diamonds", 27L, "state_revision", 1L), wallet(id));
            assertTrue(notifications.isEmpty());
        });
        assertEquals(Map.of("gold", 105L, "diamonds", 27L, "state_revision", 1L), wallet(id));
        assertEquals(List.of(new AssetSyncService.Changed(id)), notifications);
    }

    /** 竞争入账必须等到拿到行锁再读取余额，不能在阻塞UPDATE之前先读旧余额并覆盖已提交奖励。 */
    @Test
    void concurrentCreditReadsTheBalanceOnlyAfterAcquiringTheRealRowLock() throws Exception {
        String id = role(100, 20);
        var entered = new CountDownLatch(1);
        var contender = new AtomicReference<Future<?>>();
        try (var executor = Executors.newSingleThreadExecutor()) {
            new TransactionTemplate(transactions).executeWithoutResult(status -> {
                roles.lock(id);
                contender.set(executor.submit(() -> {
                    entered.countDown();
                    credit(id, 7, 11);
                }));
                assertTrue(assertDoesNotThrow(() -> entered.await(10, TimeUnit.SECONDS)));
                assertThrows(TimeoutException.class, () -> contender.get().get(200, TimeUnit.MILLISECONDS));
                roles.creditCurrency(id, 3, 5);
                assertTrue(notifications.isEmpty());
            });
            contender.get().get(10, TimeUnit.SECONDS);
        }
        assertEquals(Map.of("gold", 110L, "diamonds", 36L, "state_revision", 2L), wallet(id));
        assertEquals(2, notifications.size());
        assertTrue(notifications.stream().allMatch(event -> event.roleId().equals(id)));
    }

    /** 缺角色或损坏负余额不能当作0余额继续发奖，也不能制造对应的版本通知。 */
    @Test
    void missingRoleAndCorruptBalanceAreRejectedBeforeWriting() {
        assertThrows(EmptyResultDataAccessException.class, () -> credit("missing-wallet-role", 1, 0));
        String id = role(-1, 20);
        var before = wallet(id);
        assertThrows(IllegalStateException.class, () -> credit(id, 1, 1));
        assertEquals(before, wallet(id));
        assertTrue(notifications.isEmpty());
    }
}
