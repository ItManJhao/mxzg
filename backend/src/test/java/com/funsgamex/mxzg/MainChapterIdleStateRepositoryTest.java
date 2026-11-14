/**
 * 新主线累计的独立H2回归：验证真实V23到V24迁移、首次创建、完整类别及带版本原子消费。
 * 每项使用独享数据库和真实Spring事务/角色行锁，不启动服务、不访问日常玩家库或执行发奖。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.IdleRules;
import com.funsgamex.mxzg.campaign.MainChapterIdleStateRepository;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class MainChapterIdleStateRepositoryTest {
    /** 每项独享H2地址；从真实V23前置结构开始，只迁移到本批V24。 */
    private String databaseUrl;
    /** 当前独立库的唯一数据入口，用于迁移前夹具和持久结果核对。 */
    private JdbcTemplate jdbc;
    /** 真实本地事务入口，角色锁和累计写入共用连接。 */
    private TransactionTemplate transaction;
    /** 被验证的真实累计仓库，不使用Mock替代持久SQL。 */
    private MainChapterIdleStateRepository states;
    /** 当前用例唯一角色；资产版本固定9，用于证明仓库不擅自推进统一版本。 */
    private String role;

    /** 建立真实V23独立库及一个既有角色，不预先创建挂机时钟。 */
    @BeforeEach
    void preparePreviousSchema() {
        databaseUrl = "jdbc:h2:mem:main_idle_state_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000";
        var source = new DriverManagerDataSource(databaseUrl, "sa", "");
        Flyway.configure().dataSource(source).target("23").load().migrate();
        jdbc = new JdbcTemplate(source);
        transaction = new TransactionTemplate(new DataSourceTransactionManager(source));
        states = new MainChapterIdleStateRepository(jdbc, new IdleRules(new ObjectMapper()));
        role = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,"
                        + "login_account,server_id,state_revision,role_experience,goddess_vip) "
                        + "VALUES (?,?,?,7,123,45,?,'local-1',9,33,2)",
                role, "idle_" + role, "Existing", "idle_" + role);
    }

    /** 关闭独享数据库，避免并发或重复测试复用旧累计。 */
    @AfterEach
    void closeDatabase() {
        jdbc.execute("SHUTDOWN");
    }

    /** 只运行本批V24，不让后续迁移改变累计专项的历史前置边界。 */
    private void migrateAccumulation() {
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("24").load().migrate();
    }

    /** 在真实角色锁事务中执行一个可信业务片段，返回其候选结果。 */
    private <T> T locked(Supplier<T> operation) {
        return transaction.execute(status -> {
            jdbc.queryForObject("SELECT id FROM game_role WHERE id=? FOR UPDATE", String.class, role);
            return operation.get();
        });
    }

    /** 返回本角色累计行数，检查失败或只读请求没有悄悄创建可领取起点。 */
    private int clockCount() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_idle WHERE role_id=?", Integer.class, role);
    }

    /** 旧起点与全部角色资产原样保留，新链仅增加明确初值和空类别表。 */
    @Test
    void migrationPreservesExistingStartedAtAndAssets() {
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,123456)", role);
        var beforeRole = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role);
        migrateAccumulation();

        var value = locked(() -> states.require(role));

        assertEquals(new MainChapterIdleStateRepository.Accumulation(1, 1, 60, 43200,
                123456, 1, 0, Map.of()), value);
        assertEquals(beforeRole, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role));
        assertFalse(locked(() -> states.initializeForChallenge(role, 200000)));
        assertEquals(value, locked(() -> states.require(role)));
    }

    /** 首次挑战仅建一次60秒预置；后续挑战不修改起点或资产版本，读取缺行明确失败。 */
    @Test
    void challengeInitializationIsExplicitAndIdempotent() {
        migrateAccumulation();
        assertThrows(IllegalStateException.class, () -> locked(() -> states.require(role)));
        assertEquals(0, clockCount());
        assertTrue(locked(() -> states.initializeForChallenge(role, 2000)));
        var first = locked(() -> states.require(role));
        assertEquals(1940, first.startedAt());
        assertEquals(1, first.operationVersion());
        assertEquals(0, first.dropSeconds());
        assertTrue(first.counters().isEmpty());
        assertFalse(locked(() -> states.initializeForChallenge(role, 3000)));
        assertEquals(first, locked(() -> states.require(role)));
        assertEquals(9, jdbc.queryForObject("SELECT state_revision FROM game_role WHERE id=?", Long.class, role));
        assertThrows(IllegalStateException.class, () -> states.initializeForChallenge(role, 4000));
        assertThrows(IllegalStateException.class, () -> states.require(role));
    }

    /** 受理异常使首次创建随外层回滚；后续成功受理才建立新起点。 */
    @Test
    void outerRollbackRemovesInitializationAndAllowsRetry() {
        migrateAccumulation();
        transaction.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT id FROM game_role WHERE id=? FOR UPDATE", String.class, role);
            assertTrue(states.initializeForChallenge(role, 2000));
            status.setRollbackOnly();
        });
        assertEquals(0, clockCount());
        assertTrue(locked(() -> states.initializeForChallenge(role, 3000)));
        assertEquals(2940, locked(() -> states.require(role)).startedAt());
    }

    /** 服务器秒不足以形成非负预置或超出精确整数上界时整单拒绝，不插免费累计。 */
    @Test
    void invalidInitializationTimeDoesNotCreateClock() {
        migrateAccumulation();
        for (long now : new long[]{-1, 59, 9_007_199_254_740_992L}) {
            assertThrows(IllegalArgumentException.class, () -> locked(() -> states.initializeForChallenge(role, now)));
            assertEquals(0, clockCount());
        }
    }

    /** 未知格式、语义或时间尺度拒绝使用，读取和初始化均不自动迁移或清零。 */
    @Test
    void incompatibleStoredFormatsRejectWithoutRewriting() {
        migrateAccumulation();
        locked(() -> states.initializeForChallenge(role, 2000));
        var values = Map.of("schema_version", 2, "semantics_version", 2,
                "frequency_seconds", 61, "reset_seconds", 43201);
        for (var entry : values.entrySet()) {
            String field = entry.getKey();
            jdbc.update("UPDATE game_main_chapter_idle SET " + field + "=? WHERE role_id=?", entry.getValue(), role);
            var stored = jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role);
            assertThrows(IllegalStateException.class, () -> locked(() -> states.require(role)));
            assertThrows(IllegalStateException.class, () -> locked(() -> states.initializeForChallenge(role, 3000)));
            assertEquals(stored, jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role));
            int original = field.equals("frequency_seconds") ? 60 : field.equals("reset_seconds") ? 43200 : 1;
            jdbc.update("UPDATE game_main_chapter_idle SET " + field + "=? WHERE role_id=?", original, role);
        }
    }

    /** 全类别按真实键读取；旧单次越过类别上限合法，未知键与负数持久记录明确拒绝。 */
    @Test
    void categoriesPreserveOvershootAndRejectInvalidPersistence() {
        migrateAccumulation();
        locked(() -> states.initializeForChallenge(role, 2000));
        jdbc.update("INSERT INTO game_main_chapter_idle_counter VALUES (?,1,999,7)", role);
        assertEquals(Map.of(1, new IdleRules.Counter(999, 7)), locked(() -> states.require(role)).counters());
        jdbc.update("INSERT INTO game_main_chapter_idle_counter VALUES (?,99,0,0)", role);
        assertThrows(IllegalStateException.class, () -> locked(() -> states.require(role)));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_idle_counter WHERE role_id=?",
                Integer.class, role));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE game_main_chapter_idle_counter SET quantity=-1 WHERE role_id=? AND group_type=1", role));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE game_main_chapter_idle_counter SET misses=-1 WHERE role_id=? AND group_type=1", role));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE game_main_chapter_idle SET drop_seconds=43200 WHERE role_id=?", role));
    }

    /** 数据库拒绝孤立类别、重复类别及零版本，结构约束不能依赖Java读取后才发现。 */
    @Test
    void databaseConstraintsGuardClockOwnershipAndVersions() {
        migrateAccumulation();
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("INSERT INTO game_main_chapter_idle_counter VALUES (?,1,0,0)", role));
        locked(() -> states.initializeForChallenge(role, 2000));
        jdbc.update("INSERT INTO game_main_chapter_idle_counter VALUES (?,1,0,0)", role);
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("INSERT INTO game_main_chapter_idle_counter VALUES (?,1,0,0)", role));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("INSERT INTO game_main_chapter_idle_counter VALUES (?,0,0,0)", role));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE game_main_chapter_idle SET operation_version=0 WHERE role_id=?", role));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE game_main_chapter_idle SET operation_version=NULL WHERE role_id=?", role));
        assertEquals(1, locked(() -> states.require(role)).operationVersion());
    }

    /** 一次消费替换完整类别、递增独立版本；旧版本重放失败，满窗候选可以清空全部类别。 */
    @Test
    void consumeReplacesCategoriesAndGuardsOldVersion() {
        migrateAccumulation();
        locked(() -> states.initializeForChallenge(role, 2000));
        jdbc.update("INSERT INTO game_main_chapter_idle_counter VALUES (?,1,999,7)", role);
        var before = locked(() -> states.require(role));
        var candidate = Map.of(2, new IdleRules.Counter(4, 3), 6, new IdleRules.Counter(11, 0));
        var after = locked(() -> states.consume(role, before, 2060, 119, candidate));
        assertEquals(2, after.operationVersion());
        assertEquals(2060, after.startedAt());
        assertEquals(119, after.dropSeconds());
        assertEquals(candidate, after.counters());
        assertEquals(after, locked(() -> states.require(role)));
        assertThrows(IllegalStateException.class, () -> locked(() -> states.consume(role, before, 2120, 179, Map.of())));
        assertEquals(after, locked(() -> states.require(role)));
        var reset = locked(() -> states.consume(role, after, 2120, 0, Map.of()));
        assertTrue(reset.counters().isEmpty());
        assertEquals(0, reset.dropSeconds());
        assertEquals(3, reset.operationVersion());
        assertEquals(9, jdbc.queryForObject("SELECT state_revision FROM game_role WHERE id=?", Long.class, role));
    }

    /** 无效候选在第一个SQL写入前拒绝，不能部分推进计时或删除旧类别。 */
    @Test
    void invalidCandidatesLeaveEveryFieldUnchanged() {
        migrateAccumulation();
        locked(() -> states.initializeForChallenge(role, 2000));
        var before = locked(() -> states.require(role));
        assertThrows(IllegalArgumentException.class,
                () -> locked(() -> states.consume(role, before, 1939, 60, Map.of())));
        assertThrows(IllegalStateException.class,
                () -> locked(() -> states.consume(role, before, 2060, 43200, Map.of())));
        assertThrows(IllegalStateException.class,
                () -> locked(() -> states.consume(role, before, 2060, 60, Map.of(99, new IdleRules.Counter(1, 0)))));
        assertThrows(IllegalStateException.class,
                () -> locked(() -> states.consume(role, before, 2060, 60, Map.of(1, new IdleRules.Counter(1, -1)))));
        assertThrows(IllegalArgumentException.class,
                () -> locked(() -> states.consume(role, before, 2060, 60,
                        Map.of(1, new IdleRules.Counter(9_007_199_254_740_992L, 0)))));
        assertEquals(before, locked(() -> states.require(role)));
        assertThrows(UnsupportedOperationException.class,
                () -> before.counters().put(1, new IdleRules.Counter(1, 0)));
    }

    /** 到达最大精确版本后不能消费下一版本；候选失败不改起点、累计或类别。 */
    @Test
    void maximumOperationVersionRejectsIncrement() {
        migrateAccumulation();
        locked(() -> states.initializeForChallenge(role, 2000));
        jdbc.update("UPDATE game_main_chapter_idle SET operation_version=9007199254740991 WHERE role_id=?", role);
        var before = locked(() -> states.require(role));
        assertThrows(IllegalArgumentException.class, () -> locked(() -> states.consume(role, before, 2060, 60, Map.of())));
        assertEquals(before, locked(() -> states.require(role)));
    }

    /** 消费后的外层发奖或回执失败必须连计时、操作版本和类别一起回滚，允许原前态重试。 */
    @Test
    void consumptionRollsBackWithOuterTransaction() {
        migrateAccumulation();
        locked(() -> states.initializeForChallenge(role, 2000));
        jdbc.update("INSERT INTO game_main_chapter_idle_counter VALUES (?,1,2,3)", role);
        var before = locked(() -> states.require(role));
        transaction.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT id FROM game_role WHERE id=? FOR UPDATE", String.class, role);
            states.consume(role, before, 2060, 60, Map.of(2, new IdleRules.Counter(4, 0)));
            status.setRollbackOnly();
        });
        assertEquals(before, locked(() -> states.require(role)));
        assertEquals(2, locked(() -> states.consume(role, before, 2060, 60, Map.of())).operationVersion());
    }

    /** 两个并发意图使用同一前态时仅一笔消费成功，数据库角色锁与旧版本条件共同保护。 */
    @Test
    void concurrentConsumersCannotSpendTheSameOperationVersion() throws Exception {
        migrateAccumulation();
        locked(() -> states.initializeForChallenge(role, 2000));
        var before = locked(() -> states.require(role));
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> consumeAfterSignal(start, before, 1));
            var second = pool.submit(() -> consumeAfterSignal(start, before, 2));
            start.countDown();
            boolean firstCommitted = first.get(10, TimeUnit.SECONDS);
            boolean secondCommitted = second.get(10, TimeUnit.SECONDS);
            assertNotEquals(firstCommitted, secondCommitted);
            var result = locked(() -> states.require(role));
            assertEquals(2, result.operationVersion());
            assertEquals(Map.of(1, new IdleRules.Counter(firstCommitted ? 1 : 2, 0)), result.counters());
        }
    }

    /** 并发夹具在角色锁之前同时起跑；版本失败只作为本次竞争失败，不在事务内吞SQL异常。 */
    private boolean consumeAfterSignal(CountDownLatch start, MainChapterIdleStateRepository.Accumulation before,
                                       int quantity) throws InterruptedException {
        assertTrue(start.await(5, TimeUnit.SECONDS));
        try {
            locked(() -> states.consume(role, before, 2060, 60, Map.of(1, new IdleRules.Counter(quantity, 0))));
            return true;
        } catch (IllegalStateException conflict) {
            assertEquals("新主线挂机累计操作版本已变化", conflict.getMessage());
            return false;
        }
    }
}
