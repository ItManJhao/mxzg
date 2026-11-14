/**
 * 挂机活动权威输入回归：每项使用独立H2库，核对真实V20到V21迁移与只读服务的拒绝边界。
 * 事务代理沿用生产MANDATORY注解；测试仅准备控制数据，不发布线上活动或调用发奖入口。
 * 缺初始状态与明确未发布必须区分，区服、原始期限、版本及已有资产都不能被读取隐式修改。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.IdleActivityService;
import com.funsgamex.mxzg.campaign.IdleActivityService.Period;
import com.funsgamex.mxzg.campaign.IdleActivityService.Snapshot;
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

class IdleActivityServiceTest {
    /** 每项测试独享内存库地址，精确控制V21执行前后的持久结构。 */
    private String databaseUrl;
    /** 仅向本测试库准备控制数据并核对读取前后的原始行。 */
    private JdbcTemplate jdbc;
    /** 与待测服务共用数据源，模拟已有角色事务，不额外启动游戏服务。 */
    private DataSourceTransactionManager transactions;
    /** 使用生产事务注解代理的只读服务，不能绕过MANDATORY门槛。 */
    private IdleActivityService service;

    /** 创建真实V20前置结构和事务代理；迁移不连接本机玩家库。 */
    @BeforeEach
    void createPreviousSchema() {
        databaseUrl = "jdbc:h2:mem:idle_activity_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("20").load().migrate();
        var source = new DriverManagerDataSource(databaseUrl, "sa", "");
        jdbc = new JdbcTemplate(source);
        transactions = new DataSourceTransactionManager(source);
        var interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(transactions);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(new IdleActivityService(jdbc));
        factory.addAdvice(interceptor);
        service = (IdleActivityService) factory.getProxy();
    }

    /** 关闭本用例内存库，避免多次运行保留测试数据。 */
    @AfterEach
    void closeDatabase() {
        jdbc.execute("SHUTDOWN");
    }

    /** 只执行到V21活动输入迁移，不让后续迁移扩大本用例边界。 */
    private void migrateActivities() {
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("21").load().migrate();
    }

    /** 在调用者事务中执行只读入口；活动服务自身不查询角色或加角色锁。 */
    private <T> T withinTransaction(Supplier<T> read) {
        return new TransactionTemplate(transactions).execute(status -> read.get());
    }

    /** 读取当前区服控制，复用同一测试事务入口。 */
    private Snapshot current(String serverId) {
        return withinTransaction(() -> service.current(serverId));
    }

    /** 只在测试库显式准备三项未发布状态，不依赖迁移默认行或首次读取补行。 */
    private void unpublished(String serverId) {
        for (int activityId : List.of(16, 34, 44)) {
            jdbc.update("INSERT INTO game_idle_activity_control(server_id,activity_id,publication_state,revision) "
                    + "VALUES (?,?,0,1)", serverId, activityId);
        }
    }

    /** 把测试指定活动改为已发布，原始时间不与机器当前时间比较。 */
    private void published(String serverId, int activityId, long start, long end, long clear,
                           int turns, long turnsTime, int limitDays, long revision) {
        jdbc.update("UPDATE game_idle_activity_control SET publication_state=1,start_seconds=?,end_seconds=?,"
                        + "clear_seconds=?,turns=?,turns_time=?,limit_days=?,revision=? "
                        + "WHERE server_id=? AND activity_id=?",
                start, end, clear, turns, turnsTime, limitDays, revision, serverId, activityId);
    }

    /** 044沿旧运营发布保留默认轮次0；016/034的配置循环轮次仍必须从1开始。 */
    @Test
    void operationalActivity44CanRetainZeroTurns() {
        migrateActivities();
        unpublished("local-1");
        published("local-1", 44, 100, 200, 300, 0, 100, 0, 2);
        var control = current("local-1").controls().get(2);
        assertTrue(control.published());
        assertEquals(0, control.period().orElseThrow().turns());
        for (int activityId : List.of(16, 34)) {
            assertThrows(DataIntegrityViolationException.class,
                    () -> published("local-1", activityId, 100, 200, 300, 0, 100, 0, 2));
        }
    }

    /** 准备可比对的既有角色与资产版本，不通过游戏玩法或GM发放。 */
    private String role() {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,"
                        + "login_account,server_id,state_revision,role_experience) "
                        + "VALUES (?,?,?,7,123,45,?,'local-1',9,33)",
                id, "activity_" + id, "Existing", "activity_" + id);
        return id;
    }

    /** V21只加未知开服时刻与空控制表，既有角色、库存、挂机起点及资产版本全部保留。 */
    @Test
    void migrationPreservesExistingAssetsWithoutInventingActivityState() {
        String role = role();
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,900007,37,?)",
                role, "existing-item:" + role);
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,123456)", role);
        var roleBefore = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role);
        var inventoryBefore = jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", role);
        var idleBefore = jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role);
        var serversBefore = jdbc.queryForList("SELECT * FROM game_server ORDER BY id");

        migrateActivities();

        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_idle_activity_control", Integer.class));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM game_server WHERE opened_at_seconds IS NULL", Integer.class));
        var serversAfter = jdbc.queryForList("SELECT * FROM game_server ORDER BY id");
        serversAfter.forEach(server -> assertNull(server.remove("opened_at_seconds")));
        assertEquals(serversBefore, serversAfter);
        assertEquals(roleBefore, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role));
        assertEquals(inventoryBefore, jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", role));
        assertEquals(idleBefore, jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role));
        assertThrows(IllegalStateException.class, () -> current("local-1"));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_idle_activity_control", Integer.class));
    }

    /** 三项显式未发布可以形成可信快照，未知开服时刻仍为空，读取不填默认时间。 */
    @Test
    void threeExplicitUnpublishedControlsRemainDistinctFromMissingState() {
        migrateActivities();
        unpublished("local-1");

        var result = current("local-1");

        assertEquals("local-1", result.serverId());
        assertTrue(result.openedAtSeconds().isEmpty());
        assertEquals(List.of(16, 34, 44), result.controls().stream().map(control -> control.activityId()).toList());
        for (var control : result.controls()) {
            assertFalse(control.published());
            assertTrue(control.period().isEmpty());
            assertEquals(1, control.revision());
        }
        assertThrows(UnsupportedOperationException.class, result.controls()::clear);
        assertNull(jdbc.queryForObject("SELECT opened_at_seconds FROM game_server WHERE id='local-1'", Long.class));
    }

    /** 已发布与未发布可共存，时间保留long精度，读取不根据当前时间过滤过去或未来控制。 */
    @Test
    void freezesMixedPublishedControlsAndLongTimes() {
        migrateActivities();
        unpublished("local-1");
        long future = 5_000_000_000L;
        jdbc.update("UPDATE game_server SET opened_at_seconds=? WHERE id='local-1'", future);
        published("local-1", 16, future, future + 10, future + 20, 7, future + 1, 9, 6);
        published("local-1", 44, 0, 0, 0, 1, 0, 0, 2);

        var result = current("local-1");

        assertEquals(future, result.openedAtSeconds().orElseThrow());
        assertEquals(new Period(future, future + 10, future + 20, 7, future + 1, 9),
                result.controls().getFirst().period().orElseThrow());
        assertEquals(6, result.controls().getFirst().revision());
        assertTrue(result.controls().get(1).period().isEmpty());
        assertEquals(new Period(0, 0, 0, 1, 0, 0), result.controls().get(2).period().orElseThrow());
        published("local-1", 16, 1, 2, 3, 8, 1, 0, 7);
        assertEquals(7, result.controls().getFirst().period().orElseThrow().turns());
        assertEquals(6, result.controls().getFirst().revision());
        assertEquals(8, current("local-1").controls().getFirst().period().orElseThrow().turns());
    }

    /** 同一活动ID允许不同区服独立控制，缺行区服不能借用另一区的完整状态。 */
    @Test
    void controlsAndOpenedTimeAreIsolatedByServer() {
        migrateActivities();
        unpublished("local-1");
        assertThrows(IllegalStateException.class, () -> current("local-2"));
        unpublished("local-2");
        jdbc.update("UPDATE game_server SET opened_at_seconds=123 WHERE id='local-2'");
        published("local-2", 34, 10, 20, 30, 3, 10, 2, 9);

        assertTrue(current("local-1").openedAtSeconds().isEmpty());
        assertTrue(current("local-1").controls().stream().noneMatch(control -> control.published()));
        var second = current("local-2");
        assertEquals(123, second.openedAtSeconds().orElseThrow());
        assertTrue(second.controls().get(1).published());
        assertEquals(3, second.controls().get(1).period().orElseThrow().turns());
    }

    /** 已经过期的已发布控制也原样保留，不清状态、改版本、初始化角色记录或改变资产。 */
    @Test
    void readingDoesNotExpireControlsOrMutateAnyExistingState() {
        migrateActivities();
        unpublished("local-1");
        String role = role();
        published("local-1", 16, 1, 2, 3, 1, 1, 0, 8);
        var controlsBefore = jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY server_id,activity_id");
        var serverBefore = jdbc.queryForList("SELECT * FROM game_server ORDER BY id");
        var roleBefore = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role);

        assertTrue(current("local-1").controls().getFirst().published());
        assertTrue(current("local-1").controls().getFirst().published());

        assertEquals(controlsBefore, jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY server_id,activity_id"));
        assertEquals(serverBefore, jdbc.queryForList("SELECT * FROM game_server ORDER BY id"));
        assertEquals(roleBefore, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role));
    }

    /** 明确事务与区服参数门槛，缺服、缺一个控制或整个空表都不能形成空活动假成功。 */
    @Test
    void rejectsNoTransactionInvalidServerAndIncompleteControls() {
        migrateActivities();
        assertThrows(IllegalTransactionStateException.class, () -> service.current("local-1"));
        assertThrows(IllegalArgumentException.class, () -> current(null));
        assertThrows(IllegalArgumentException.class, () -> current(" "));
        assertThrows(IllegalArgumentException.class, () -> current("UPPER"));
        assertThrows(IllegalStateException.class, () -> current("missing-server"));
        assertThrows(IllegalStateException.class, () -> current("local-1"));
        unpublished("local-1");
        jdbc.update("DELETE FROM game_idle_activity_control WHERE server_id='local-1' AND activity_id=34");
        assertThrows(IllegalStateException.class, () -> current("local-1"));
    }

    /** 缺列或缺表直接保留数据库失败，不能用空快照掩盖未迁移或依赖损坏。 */
    @Test
    void missingSchemaDoesNotBecomeUnpublishedState() {
        assertThrows(DataAccessException.class, () -> current("local-1"));
        migrateActivities();
        jdbc.execute("DROP TABLE game_idle_activity_control");
        assertThrows(DataAccessException.class, () -> current("local-1"));
    }

    /** 数据库约束拒绝非法类型、发布状态、版本、期限和缺必填项，不给新行任何活动默认值。 */
    @Test
    void schemaEnforcesCompletePublishedPeriodsAndNonnegativeAuthority() {
        migrateActivities();
        unpublished("local-1");
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO game_idle_activity_control(server_id,activity_id,publication_state,revision) VALUES ('local-2',17,0,1)"));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO game_idle_activity_control(server_id,activity_id,publication_state,revision) VALUES ('missing',16,0,1)"));
        for (String change : List.of("publication_state=2", "revision=0", "revision=NULL", "start_seconds=-1",
                "turns=-1", "turns_time=-1", "limit_days=-1", "publication_state=1")) {
            assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                    "UPDATE game_idle_activity_control SET " + change + " WHERE server_id='local-1' AND activity_id=16"));
        }
        assertThrows(DataIntegrityViolationException.class,
                () -> published("local-1", 16, 2, 1, 3, 1, 1, 0, 1));
        assertThrows(DataIntegrityViolationException.class,
                () -> published("local-1", 16, 1, 3, 2, 1, 1, 0, 1));
        assertThrows(DataIntegrityViolationException.class,
                () -> published("local-1", 16, 0, 0, 0, 0, 0, 0, 1));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE game_server SET opened_at_seconds=-1 WHERE id='local-1'"));
    }

    /** 未发布允许缺期字段，已发布但缺开服时间仍如实返回未知，读取层不擅自决定日数规则。 */
    @Test
    void unknownOpenedTimeAndUnpublishedPeriodFieldsRemainExplicit() {
        migrateActivities();
        unpublished("local-1");
        jdbc.update("UPDATE game_idle_activity_control SET start_seconds=123,turns=0 "
                + "WHERE server_id='local-1' AND activity_id=34");
        published("local-1", 16, 1, 2, 3, 1, 1, 0, 1);

        var result = current("local-1");

        assertTrue(result.openedAtSeconds().isEmpty());
        assertTrue(result.controls().getFirst().published());
        assertTrue(result.controls().get(1).period().isEmpty());
        assertNull(jdbc.queryForObject("SELECT opened_at_seconds FROM game_server WHERE id='local-1'", Long.class));
    }

    /** 即使测试放宽数据库约束，读取也拒绝空版本、坏期限和缺字段，不把SQL null映射成0。 */
    @Test
    void damagedPersistedControlFieldsAreRejectedDuringMapping() {
        migrateActivities();
        unpublished("local-1");
        for (String constraint : List.of("ck_idle_activity_publication", "ck_idle_activity_revision",
                "ck_idle_activity_nonnegative", "ck_idle_activity_dates", "ck_idle_activity_ready")) {
            jdbc.execute("ALTER TABLE game_idle_activity_control DROP CONSTRAINT " + constraint);
        }
        jdbc.execute("ALTER TABLE game_idle_activity_control ALTER COLUMN revision DROP NOT NULL");
        jdbc.execute("ALTER TABLE game_idle_activity_control ALTER COLUMN publication_state DROP NOT NULL");
        for (String change : List.of("revision=NULL", "revision=0", "publication_state=NULL", "publication_state=2",
                "start_seconds=-1", "publication_state=1", "start_seconds=2,end_seconds=1")) {
            jdbc.update("UPDATE game_idle_activity_control SET publication_state=0,revision=1,start_seconds=NULL,"
                    + "end_seconds=NULL,clear_seconds=NULL,turns=NULL,turns_time=NULL,limit_days=NULL "
                    + "WHERE server_id='local-1' AND activity_id=16");
            jdbc.update("UPDATE game_idle_activity_control SET " + change
                    + " WHERE server_id='local-1' AND activity_id=16");
            assertThrows(IllegalStateException.class, () -> current("local-1"), change);
        }
        jdbc.execute("ALTER TABLE game_server DROP CONSTRAINT ck_server_opened_at");
        jdbc.update("UPDATE game_server SET opened_at_seconds=-1 WHERE id='local-2'");
        unpublished("local-2");
        assertThrows(IllegalStateException.class, () -> current("local-2"));
    }
}
