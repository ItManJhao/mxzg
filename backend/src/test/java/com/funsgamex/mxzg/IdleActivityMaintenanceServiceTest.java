/**
 * 挂机活动控制维护回归：独立H2执行真实V21到V22迁移，验证显式开服初始化与单步推进事务。
 * 使用生产事务代理和真实规则；小周期夹具只替换纯规则，核对并发锁、回滚及调度持久语义。
 * 不启动游戏服务、不连接玩家库，不调用兑换、任务重置、资产回收或任何领取入口。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.CampaignRules;
import com.funsgamex.mxzg.campaign.IdleActivityControlRules;
import com.funsgamex.mxzg.campaign.IdleActivityControlRules.Timing;
import com.funsgamex.mxzg.campaign.IdleActivityMaintenanceService;
import com.funsgamex.mxzg.campaign.IdleActivityRules;
import com.funsgamex.mxzg.campaign.IdleActivityService;
import com.funsgamex.mxzg.campaign.IdleActivityService.Period;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
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
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

class IdleActivityMaintenanceServiceTest {
    /** 明确给测试服的真实开服秒，不读取机器当前时间，也不写入日常数据库。 */
    private static final long OPENED_AT = Instant.parse("2026-11-13T04:00:00Z").getEpochSecond();
    /** 当前用例独享内存库地址，用于控制迁移版本及关闭释放。 */
    private String databaseUrl;
    /** 只向本测试库准备区服控制和可核对资产。 */
    private JdbcTemplate jdbc;
    /** 所有代理复用该事务管理器，确保区服锁和控制写入使用同一连接。 */
    private DataSourceTransactionManager transactions;
    /** 生产MANDATORY只读映射代理，不绕过维护内的事务约定。 */
    private IdleActivityService reader;
    /** 从真实构建投影加载的周期规则，不保存控制状态。 */
    private IdleActivityControlRules schedules;
    /** 从真实构建投影加载的活动掉落规则，新轮次缺失时必须拒绝。 */
    private IdleActivityRules drops;
    /** 待测维护服务，生产事务注解由Spring代理实际执行。 */
    private IdleActivityMaintenanceService service;

    /** 创建真实V21结构和事务代理，尚不执行待测调度字段迁移。 */
    @BeforeEach
    void createPreviousSchema() {
        databaseUrl = "jdbc:h2:mem:idle_activity_maintenance_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000";
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("21").load().migrate();
        var source = new DriverManagerDataSource(databaseUrl, "sa", "");
        jdbc = new JdbcTemplate(source);
        transactions = new DataSourceTransactionManager(source);
        reader = proxy(new IdleActivityService(jdbc), IdleActivityService.class);
        schedules = new IdleActivityControlRules(new ObjectMapper());
        drops = new IdleActivityRules(new ObjectMapper());
        service = maintenance(schedules, drops);
    }

    /** 关闭本项独享内存库，不保留测试数据或后台线程。 */
    @AfterEach
    void closeDatabase() {
        jdbc.execute("SHUTDOWN");
    }

    /** 为同一数据源创建真实注解事务代理，不以手动提交掩盖业务方法的事务缺失。 */
    private <T> T proxy(T target, Class<T> type) {
        var interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(transactions);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(target);
        factory.addAdvice(interceptor);
        return type.cast(factory.getProxy());
    }

    /** 可替换纯规则夹具，服务持久连接与事务仍走生产实现。 */
    private IdleActivityMaintenanceService maintenance(IdleActivityControlRules timings, IdleActivityRules dropRules) {
        return proxy(new IdleActivityMaintenanceService(jdbc, reader, timings, dropRules, new ObjectMapper()),
                IdleActivityMaintenanceService.class);
    }

    /** 仅升级到V22维护结构，未来迁移不扩大本历史边界。 */
    private void migrateMaintenance() {
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("22").load().migrate();
    }

    /** 用调用者事务读取快照，避免绕过MANDATORY读取门槛。 */
    private <T> T withinTransaction(Supplier<T> read) {
        return new TransactionTemplate(transactions).execute(status -> read.get());
    }

    /** 查询某一活动的原始调度点；NULL保持为null，不能解释成零秒。 */
    private Long next(String serverId, int activityId) {
        return jdbc.queryForObject("SELECT next_start_seconds FROM game_idle_activity_control "
                + "WHERE server_id=? AND activity_id=?", Long.class, serverId, activityId);
    }

    /** 只在本用例准备完整三项未发布记录，可用于维护缺开服时间的拒绝边界。 */
    private void unpublished(String serverId) {
        for (int activityId : List.of(16, 34, 44)) {
            jdbc.update("INSERT INTO game_idle_activity_control(server_id,activity_id,publication_state,revision) "
                    + "VALUES (?,?,0,1)", serverId, activityId);
        }
    }

    /** 准备与角色无关的044控制，运营轮次保持0，开始标记由测试明确指定。 */
    private void publish44(long start, Long pendingStart) {
        jdbc.update("UPDATE game_idle_activity_control SET publication_state=1,start_seconds=?,end_seconds=?,"
                        + "clear_seconds=?,turns=0,turns_time=0,limit_days=0,revision=5,next_start_seconds=? "
                        + "WHERE server_id='local-1' AND activity_id=44",
                start, start + 100, start + 200, pendingStart);
    }

    /** 构造短周期纯规则：每次过点只返回一期，便于验证维护没有自行循环补跑。 */
    private IdleActivityControlRules shortSchedules() {
        var rules = mock(IdleActivityControlRules.class);
        when(rules.initial(anyInt(), anyLong())).thenAnswer(call ->
                new Timing(new Period(100, 110, 120, 1, 100, 0), 130));
        when(rules.advance(anyInt(), any(Period.class), anyLong(), anyLong())).thenAnswer(call -> {
            Period current = call.getArgument(1);
            long frozenNext = call.getArgument(2);
            long now = call.getArgument(3);
            if (now <= frozenNext) {
                return Optional.empty();
            }
            return Optional.of(new Timing(new Period(frozenNext, frozenNext + 10, frozenNext + 20,
                    current.turns() + 1, frozenNext, current.limitDays()), frozenNext + 30));
        });
        return rules;
    }

    /** 新轮次校验的隔离掉落行，允许测试推进至2/3轮而不篡改真实策划投影。 */
    private IdleActivityRules allTurnsAvailable() {
        var rules = mock(IdleActivityRules.class);
        when(rules.selectedDrop(anyInt(), anyInt())).thenAnswer(call ->
                new IdleActivityRules.Drop(call.getArgument(0), call.getArgument(1),
                        List.of(new CampaignRules.Reward(901701, 1)), 60, 0));
        return rules;
    }

    /** V22只加空调度字段，不替区服填开服时间、不创建控制行或补猜旧期次。 */
    @Test
    void migrationDoesNotInventOpeningTimeOrControlRows() {
        var before = jdbc.queryForList("SELECT * FROM game_server ORDER BY id");
        migrateMaintenance();
        assertEquals(before, jdbc.queryForList("SELECT * FROM game_server ORDER BY id"));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_idle_activity_control", Integer.class));
        assertThrows(IllegalStateException.class, () -> service.maintain("local-1", OPENED_AT));
        assertNull(jdbc.queryForObject("SELECT opened_at_seconds FROM game_server WHERE id='local-1'", Long.class));
    }

    /** 真实16/34首期使用已确认时间，034开服第9999天的开始秒不因2038整数边界截断。 */
    @Test
    void initializationUsesActualSchedulesAndLongSecondPeriods() {
        migrateMaintenance();
        var result = service.initialize("local-1", OPENED_AT);
        assertEquals(OPENED_AT, result.openedAtSeconds().orElseThrow());
        assertEquals(List.of(16, 34, 44), result.controls().stream().map(control -> control.activityId()).toList());
        for (int index = 0; index < 2; index++) {
            int activityId = result.controls().get(index).activityId();
            var expected = schedules.initial(activityId, OPENED_AT);
            assertTrue(result.controls().get(index).published());
            assertEquals(expected.period(), result.controls().get(index).period().orElseThrow());
            assertEquals(expected.nextStartSeconds(), next("local-1", activityId));
            assertEquals(1, result.controls().get(index).revision());
        }
        long midnight = Instant.parse("2026-11-12T16:00:00Z").getEpochSecond();
        assertEquals(midnight, result.controls().getFirst().period().orElseThrow().startSeconds());
        assertEquals(9999, schedules.schedule(34).openServerDay());
        assertEquals(midnight + 9998L * 86_400, result.controls().get(1).period().orElseThrow().startSeconds());
        assertTrue(result.controls().get(1).period().orElseThrow().startSeconds() > Integer.MAX_VALUE);
        assertFalse(result.controls().get(2).published());
        assertTrue(result.controls().get(2).period().isEmpty());
        assertNull(next("local-1", 44));
    }

    /** 同时刻重复初始化保留全部旧期次与revision，不同开服时刻整体拒绝。 */
    @Test
    void repeatedInitializationDoesNotResetExistingControl() {
        migrateMaintenance();
        service.initialize("local-1", OPENED_AT);
        jdbc.update("UPDATE game_idle_activity_control SET revision=7 WHERE server_id='local-1' AND activity_id=16");
        var before = jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY server_id,activity_id");

        service.initialize("local-1", OPENED_AT);
        assertEquals(before, jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY server_id,activity_id"));
        assertThrows(IllegalStateException.class, () -> service.initialize("local-1", OPENED_AT + 1));
        assertEquals(before, jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY server_id,activity_id"));
        assertEquals(OPENED_AT, jdbc.queryForObject("SELECT opened_at_seconds FROM game_server WHERE id='local-1'", Long.class));
    }

    /** 已明确未发布的循环活动保持原状；初始化只补缺行，不能覆盖负责人的停用选择。 */
    @Test
    void existingUnpublishedControlsAreNotAutomaticallyReopened() {
        migrateMaintenance();
        unpublished("local-1");
        var before = jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY activity_id");
        var result = service.initialize("local-1", OPENED_AT);
        assertTrue(result.controls().stream().noneMatch(control -> control.published()));
        assertEquals(before, jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY activity_id"));
    }

    /** 旧已发布循环记录缺冻结next时拒绝，不能按新配置猜测，前面的开服和补行全部回滚。 */
    @Test
    void missingExistingFrozenNextRollsBackOpeningAndNewRows() {
        migrateMaintenance();
        jdbc.update("INSERT INTO game_idle_activity_control(server_id,activity_id,publication_state,start_seconds,"
                + "end_seconds,clear_seconds,turns,turns_time,limit_days,revision) "
                + "VALUES ('local-1',16,1,100,200,300,1,100,0,8)");
        var before = jdbc.queryForList("SELECT * FROM game_idle_activity_control");
        assertThrows(IllegalStateException.class, () -> service.initialize("local-1", OPENED_AT));
        assertEquals(before, jdbc.queryForList("SELECT * FROM game_idle_activity_control"));
        assertNull(jdbc.queryForObject("SELECT opened_at_seconds FROM game_server WHERE id='local-1'", Long.class));
    }

    /** 未迁移、缺服、非法参数或缺开服时刻都拒绝，不补now或把维护当初始化。 */
    @Test
    void missingSchemaAndInitializationCannotBecomeSuccessfulMaintenance() {
        assertThrows(DataAccessException.class, () -> service.initialize("local-1", OPENED_AT));
        assertNull(jdbc.queryForObject("SELECT opened_at_seconds FROM game_server WHERE id='local-1'", Long.class));
        migrateMaintenance();
        assertThrows(IllegalArgumentException.class, () -> service.initialize("local-1", -1));
        assertThrows(IllegalArgumentException.class, () -> service.maintain("local-1", -1));
        assertThrows(IllegalArgumentException.class, () -> service.initialize("UPPER", OPENED_AT));
        assertThrows(IllegalStateException.class, () -> service.initialize("missing", OPENED_AT));
        unpublished("local-1");
        assertThrows(IllegalStateException.class, () -> service.maintain("local-1", OPENED_AT));
        jdbc.update("UPDATE game_server SET opened_at_seconds=? WHERE id='local-1'", OPENED_AT);
        jdbc.update("DELETE FROM game_idle_activity_control WHERE server_id='local-1' AND activity_id=34");
        assertThrows(IllegalStateException.class, () -> service.maintain("local-1", OPENED_AT));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM game_idle_activity_control", Integer.class));
    }

    /** 周期只在严格超过next后推进，即使服务器落后很多年，一次调用也只推进一轮。 */
    @Test
    void strictNextBoundaryAndOneStepPerCallArePreserved() {
        migrateMaintenance();
        var shortRules = shortSchedules();
        var available = allTurnsAvailable();
        var maintenance = maintenance(shortRules, available);
        maintenance.initialize("local-1", OPENED_AT);
        var exact = maintenance.maintain("local-1", 130);
        assertEquals(1, exact.controls().getFirst().period().orElseThrow().turns());
        assertEquals(1, exact.controls().getFirst().revision());

        var first = maintenance.maintain("local-1", 1000);
        assertEquals(2, first.controls().getFirst().period().orElseThrow().turns());
        assertEquals(130, first.controls().getFirst().period().orElseThrow().startSeconds());
        assertEquals(2, first.controls().getFirst().revision());
        assertEquals(160, next("local-1", 16));
        var second = maintenance.maintain("local-1", 1000);
        assertEquals(3, second.controls().getFirst().period().orElseThrow().turns());
        assertEquals(160, second.controls().getFirst().period().orElseThrow().startSeconds());
        assertEquals(3, second.controls().getFirst().revision());
    }

    /** 真实cycle0活动到最大轮次后仍保留旧控制，不因维护次数增加revision或重开首轮。 */
    @Test
    void actualCyclesStopAtTheirConfiguredMaximum() {
        migrateMaintenance();
        var initial = service.initialize("local-1", OPENED_AT);
        long afterNext = Math.max(next("local-1", 16), next("local-1", 34)) + 1;
        assertEquals(0, schedules.schedule(16).cycleType());
        assertEquals(0, schedules.schedule(34).cycleType());
        assertEquals(1, schedules.schedule(16).maxTurns());
        assertEquals(1, schedules.schedule(34).maxTurns());
        var before = jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY activity_id");

        assertEquals(initial, service.maintain("local-1", afterNext));
        assertEquals(initial, service.maintain("local-1", afterNext + 1));
        assertEquals(before, jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY activity_id"));
    }

    /** 044严格过开始点才消费标记，保持运营轮次0，只改turnsTime/next和维护revision。 */
    @Test
    void activity44ConsumesItsStartMarkerOnceAndKeepsZeroTurns() {
        migrateMaintenance();
        service.initialize("local-1", OPENED_AT);
        publish44(1000, 1000L);
        var atStart = service.maintain("local-1", 1000).controls().get(2);
        assertEquals(5, atStart.revision());
        assertEquals(0, atStart.period().orElseThrow().turnsTimeSeconds());
        assertEquals(1000, next("local-1", 44));

        var afterStart = service.maintain("local-1", 1001).controls().get(2);
        assertEquals(6, afterStart.revision());
        assertEquals(0, afterStart.period().orElseThrow().turns());
        assertEquals(1000, afterStart.period().orElseThrow().turnsTimeSeconds());
        assertNull(next("local-1", 44));
        assertEquals(afterStart, service.maintain("local-1", 1002).controls().get(2));
    }

    /** 044待消费点必须就是当前start，非法记录不应更新为另一活动期或静默丢弃。 */
    @Test
    void activity44RejectsMismatchedPendingStartWithoutChangingRows() {
        migrateMaintenance();
        service.initialize("local-1", OPENED_AT);
        publish44(1000, 999L);
        var before = jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY activity_id");
        assertThrows(IllegalStateException.class, () -> service.maintain("local-1", 1001));
        assertEquals(before, jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY activity_id"));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "UPDATE game_idle_activity_control SET next_start_seconds=-1 WHERE server_id='local-1' AND activity_id=44"));
    }

    /** 第二项活动缺新轮次掉落时，前一项已经执行的更新也回滚，不能留下半批控制。 */
    @Test
    void unavailableNewTurnRollsBackEarlierActivityChanges() {
        migrateMaintenance();
        var available = allTurnsAvailable();
        when(available.selectedDrop(34, 2)).thenThrow(new IllegalStateException("测试：34新轮次掉落缺失"));
        var maintenance = maintenance(shortSchedules(), available);
        maintenance.initialize("local-1", OPENED_AT);
        var before = jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY activity_id");

        assertThrows(IllegalStateException.class, () -> maintenance.maintain("local-1", 1000));

        assertEquals(before, jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY activity_id"));
    }

    /** revision加一溢出时也要回滚前一项，不将持久维护版本饱和或绕回负数。 */
    @Test
    void revisionOverflowRollsBackTheWholeMaintenanceTransaction() {
        migrateMaintenance();
        var maintenance = maintenance(shortSchedules(), allTurnsAvailable());
        maintenance.initialize("local-1", OPENED_AT);
        jdbc.update("UPDATE game_idle_activity_control SET revision=? WHERE server_id='local-1' AND activity_id=34", Long.MAX_VALUE);
        var before = jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY activity_id");
        assertThrows(ArithmeticException.class, () -> maintenance.maintain("local-1", 1000));
        assertEquals(before, jdbc.queryForList("SELECT * FROM game_idle_activity_control ORDER BY activity_id"));
    }

    /** 同服并发首次初始化由真实区服行锁串行化，两次都返回同一首期且不制造重复控制。 */
    @Test
    void concurrentInitializationUsesTheSameServerRowLock() throws Exception {
        migrateMaintenance();
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var tasks = new java.util.ArrayList<java.util.concurrent.Future<IdleActivityService.Snapshot>>();
            for (int index = 0; index < 2; index++) {
                tasks.add(executor.submit(() -> {
                    ready.countDown();
                    if (!start.await(10, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("测试并发起点等待超时");
                    }
                    return service.initialize("local-1", OPENED_AT);
                }));
            }
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            assertEquals(tasks.get(0).get(10, TimeUnit.SECONDS), tasks.get(1).get(10, TimeUnit.SECONDS));
        }
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM game_idle_activity_control", Integer.class));
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM game_idle_activity_control WHERE revision=1", Integer.class));
    }

    /** 控制初始化与过期维护不执行回收，钱包/资产revision、两种活动道具及挂机时钟保持原值。 */
    @Test
    void controlMaintenanceNeverTouchesRolesInventoryOrIdleClock() {
        migrateMaintenance();
        String role = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,"
                        + "server_id,state_revision,role_experience) VALUES (?,?,?,7,123,45,?,'local-1',9,33)",
                role, "activity_" + role, "Existing", "activity_" + role);
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,901701,37,?)",
                role, "dragon:" + role);
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,901702,41,?)",
                role, "fires:" + role);
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,123456)", role);
        var roleBefore = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role);
        var inventory = jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=? ORDER BY item_id", role);
        var clock = jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role);
        service.initialize("local-1", OPENED_AT);
        publish44(1000, 1000L);

        service.maintain("local-1", Math.max(next("local-1", 16), next("local-1", 34)) + 1);

        assertEquals(roleBefore, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role));
        assertEquals(inventory, jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=? ORDER BY item_id", role));
        assertEquals(clock, jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role));
        assertNull(jdbc.queryForObject("SELECT opened_at_seconds FROM game_server WHERE id='local-2'", Long.class));
        assertThrows(IllegalStateException.class,
                () -> withinTransaction(() -> reader.current("local-2")));
    }
}
