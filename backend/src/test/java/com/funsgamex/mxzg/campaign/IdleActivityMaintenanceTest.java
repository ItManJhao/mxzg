/**
 * 活动控制实际启动入口回归：在独立内存H2验证可信配置确实驱动初始化，再用固定时钟检查定时隔离。
 * 真实Spring事务代理负责持久维护，mock只用于观察入口的校验、同次时刻和失败重试，不替代业务规则测试。
 * 日期只用于此测试库，不连接日常库、不发布真实服活动、不操作角色资产或玩家协议。
 */
package com.funsgamex.mxzg.campaign;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
        "spring.datasource.url=jdbc:h2:mem:idle_activity_maintenance_runner;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.websocket.enabled=false",
        "mxzg.idle-activity-maintenance.enabled=true",
        "mxzg.idle-activity-maintenance.interval-millis=86400000",
        "mxzg.idle-activity-maintenance.servers[0].id=local-1",
        "mxzg.idle-activity-maintenance.servers[0].opened-at=2026-11-13T00:00:00+08:00",
        "mxzg.idle-activity-maintenance.servers[1].id=local-2",
        "mxzg.idle-activity-maintenance.servers[1].opened-at=2026-11-13T00:00:00+08:00",
        "mxzg.idle-activity-maintenance.servers[1].activity44.version=1",
        "mxzg.idle-activity-maintenance.servers[1].activity44.start-at=2026-11-13T00:00:00+08:00",
        "mxzg.idle-activity-maintenance.servers[1].activity44.end-at=2026-11-20T00:00:00+08:00",
        "mxzg.idle-activity-maintenance.servers[1].activity44.clear-at=2026-11-22T00:00:00+08:00",
        "mxzg.idle-activity-maintenance.servers[1].activity44.exchanges[0].idx=1",
        "mxzg.idle-activity-maintenance.servers[1].activity44.exchanges[0].item=[{\"item_type\":900001,\"item_num\":2}]",
        "mxzg.idle-activity-maintenance.servers[1].activity44.exchanges[0].cost=[{\"item_type\":901702,\"item_num\":1}]",
        "mxzg.idle-activity-maintenance.servers[1].activity44.exchanges[0].limit=5"})
@ActiveProfiles("local")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@ExtendWith(OutputCaptureExtension.class)
class IdleActivityMaintenanceTest {
    /** 当前测试专用的可信开服时间；不是日常数据库或发布配置。 */
    private static final String OPENING = "2026-11-13T00:00:00+08:00";
    /** 与测试配置一致的真实Unix秒，不使用测试运行时刻代替。 */
    private static final long OPENING_SECONDS = OffsetDateTime.parse(OPENING).toEpochSecond();
    /** 隔离入口单测统一使用的时刻，定时测试不会休眠等待真实调度。 */
    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.ofEpochSecond(2000), ZoneOffset.UTC);

    /** Spring实际启动的Runner，验证配置绑定和ApplicationRunner真实执行链。 */
    @Autowired private IdleActivityMaintenance applicationRunner;
    /** 已由Spring事务代理保护的真实维护服务，不在集成用例中替换为mock。 */
    @Autowired private IdleActivityMaintenanceService realService;
    /** 仅连接本类独立H2库，核对启动与重启前后实际持久数据。 */
    @Autowired private JdbcTemplate jdbc;

    /** 将当前Server配置构造集中于此，字段仍按生产类型显式传入，不反射绕过配置契约。 */
    private IdleActivityMaintenanceProperties.Server server(String id, String openedAt) {
        return new IdleActivityMaintenanceProperties.Server(id, openedAt, null);
    }

    /** 构造明确启用的入口配置；原始列表由生产配置record负责冻结。 */
    private IdleActivityMaintenanceProperties enabled(List<IdleActivityMaintenanceProperties.Server> servers) {
        return new IdleActivityMaintenanceProperties(true, 86400000, servers);
    }

    /** 获取全部控制原始列，便于确认重放和冲突没有改写期次、调度点或版本。 */
    private List<Map<String, Object>> persistedControls() {
        return jdbc.queryForList("SELECT * FROM game_idle_activity_control WHERE server_id='local-1' ORDER BY activity_id");
    }

    /** 显式启用的真实Spring启动必须产生三控制和明确开服时刻，不能只证明调用了空API。 */
    @Test
    void realApplicationRunnerAppliesTrustedConfigurationToIsolatedDatabase() {
        assertNotNull(applicationRunner);
        assertEquals(OPENING_SECONDS, jdbc.queryForObject(
                "SELECT opened_at_seconds FROM game_server WHERE id='local-1'", Long.class));
        assertEquals(List.of(16, 34, 44), jdbc.queryForList(
                "SELECT activity_id FROM game_idle_activity_control WHERE server_id='local-1' ORDER BY activity_id",
                Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT publication_state FROM game_idle_activity_control "
                + "WHERE server_id='local-1' AND activity_id=44", Integer.class));
        assertEquals(3, persistedControls().size());
    }

    /** 真实配置绑定驱动044发布，消耗开始标记后重启同版本不能重开标记或改变期次。 */
    @Test
    void realPublicationConfigurationIsAppliedAndRestartedIdempotently() {
        var before = jdbc.queryForMap("SELECT * FROM game_idle_activity_control WHERE server_id='local-2' AND activity_id=44");
        assertEquals(1, ((Number) before.get("publication_state")).intValue());
        assertEquals(1L, ((Number) before.get("publication_version")).longValue());
        assertNotNull(before.get("publication_config"));
        assertEquals(0, ((Number) before.get("turns")).intValue());
        realService.maintain("local-2", OPENING_SECONDS + 1);
        var consumed = jdbc.queryForMap("SELECT * FROM game_idle_activity_control WHERE server_id='local-2' AND activity_id=44");
        assertNull(consumed.get("next_start_seconds"));
        var release = new IdleActivityMaintenanceProperties.Release(1, OPENING,
                "2026-11-20T00:00:00+08:00", "2026-11-22T00:00:00+08:00", 0,
                List.of(new IdleActivityPublicationUtils.Exchange(1,
                        "[{\"item_type\":900001,\"item_num\":2}]", "[{\"item_type\":901702,\"item_num\":1}]", 5, 0, 0)));
        var config = new IdleActivityMaintenanceProperties.Server("local-2", OPENING, release);
        new IdleActivityMaintenance(realService, enabled(List.of(config)), FIXED_CLOCK).run(new DefaultApplicationArguments());
        assertEquals(consumed, jdbc.queryForMap("SELECT * FROM game_idle_activity_control WHERE server_id='local-2' AND activity_id=44"));
    }

    /** 同配置再次经过真实Runner及事务服务，不重置已持久期次、调度点或版本。 */
    @Test
    void repeatedRunnerStartKeepsPersistedPeriodsAndRevisions() {
        var before = persistedControls();
        var properties = enabled(List.of(server("local-1", OPENING)));
        var restarted = new IdleActivityMaintenance(realService, properties, FIXED_CLOCK);
        restarted.run(new DefaultApplicationArguments());
        assertEquals(before, persistedControls());
        assertEquals(OPENING_SECONDS, jdbc.queryForObject(
                "SELECT opened_at_seconds FROM game_server WHERE id='local-1'", Long.class));
    }

    /** 不同开服时间经过真实事务服务必须拒绝，保留原时刻与全部控制，不以重启时间覆盖。 */
    @Test
    void conflictingOpeningCannotRewriteExistingServerOrControls() {
        var before = persistedControls();
        var properties = enabled(List.of(server("local-1", "2026-11-14T00:00:00+08:00")));
        var restarted = new IdleActivityMaintenance(realService, properties, FIXED_CLOCK);
        assertThrows(IllegalStateException.class, () -> restarted.run(new DefaultApplicationArguments()));
        assertEquals(before, persistedControls());
        assertEquals(OPENING_SECONDS, jdbc.queryForObject(
                "SELECT opened_at_seconds FROM game_server WHERE id='local-1'", Long.class));
    }

    /** 默认关闭允许没有配置区服，启动和手动触发tick都不调用任何维护方法。 */
    @Test
    void disabledEntryNeverInitializesOrMaintainsServers() {
        var service = mock(IdleActivityMaintenanceService.class);
        var properties = new IdleActivityMaintenanceProperties(false, 2000, null);
        var runner = new IdleActivityMaintenance(service, properties, FIXED_CLOCK);
        runner.run(new DefaultApplicationArguments());
        runner.tick();
        verifyNoInteractions(service);
    }

    /** 所有日期先完成校验，第二服缺失或无时区也不能先写入第一服。 */
    @Test
    void missingOrMalformedOpeningIsRejectedBeforeAnyServerWrite() {
        for (String opening : new String[]{null, "", "2026-11-13", "2026-11-13T00:00:00",
                "not-a-date", "1969-12-31T00:00:00Z"}) {
            var service = mock(IdleActivityMaintenanceService.class);
            var properties = enabled(List.of(server("entry-a", OPENING), server("entry-b", opening)));
            var runner = new IdleActivityMaintenance(service, properties, FIXED_CLOCK);
            assertThrows(IllegalArgumentException.class, () -> runner.run(new DefaultApplicationArguments()),
                    "缺失或无时区开服时间必须拒绝：" + opening);
            runner.tick();
            verifyNoInteractions(service);
        }
    }

    /** 缺ID、非法格式和重复ID先拒绝整份配置，不能先初始化另一服再发现错误。 */
    @Test
    void invalidOrDuplicateServerIdsAreRejectedBeforeAnyWrite() {
        for (String id : new String[]{null, "", "UPPER", "contains.dot", "entry-a"}) {
            var service = mock(IdleActivityMaintenanceService.class);
            var properties = enabled(List.of(server("entry-a", OPENING), server(id, OPENING)));
            var runner = new IdleActivityMaintenance(service, properties, FIXED_CLOCK);
            assertThrows(IllegalArgumentException.class, () -> runner.run(new DefaultApplicationArguments()));
            verifyNoInteractions(service);
        }
    }

    /** 显式启用必须有维护区服和正检查间隔，不能通过空配置形成看似已启用的空Runner。 */
    @Test
    void emptyServersOrInvalidIntervalCannotEnableMaintenance() {
        var service = mock(IdleActivityMaintenanceService.class);
        var empty = new IdleActivityMaintenance(service, enabled(List.of()), FIXED_CLOCK);
        assertThrows(IllegalArgumentException.class, () -> empty.run(new DefaultApplicationArguments()));
        for (long interval : new long[]{0, -1}) {
            var properties = new IdleActivityMaintenanceProperties(true, interval, List.of(server("entry-a", OPENING)));
            var runner = new IdleActivityMaintenance(service, properties, FIXED_CLOCK);
            assertThrows(IllegalArgumentException.class, () -> runner.run(new DefaultApplicationArguments()));
        }
        verifyNoInteractions(service);
    }

    /** 启用标记并不代表启动已完成；实际Runner运行前tick不得维护任何服。 */
    @Test
    void tickBeforeSuccessfulStartupDoesNotMaintainServers() {
        var service = mock(IdleActivityMaintenanceService.class);
        var runner = new IdleActivityMaintenance(service, enabled(List.of(server("entry-a", OPENING))), FIXED_CLOCK);
        runner.tick();
        verifyNoInteractions(service);
    }

    /** 每次tick只捕获一个服务器秒，单服失败仍继续后服，不回退配置未列出的区服。 */
    @Test
    void oneCapturedSecondIsSharedAndOneFailureDoesNotBlockOtherServers() {
        var service = mock(IdleActivityMaintenanceService.class);
        var clock = mock(Clock.class);
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(2000));
        var properties = enabled(List.of(server("entry-b", OPENING), server("entry-a", OPENING)));
        var runner = new IdleActivityMaintenance(service, properties, clock);
        runner.run(new DefaultApplicationArguments());
        clearInvocations(service, clock);
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(2000), Instant.ofEpochSecond(2001));
        when(service.maintain("entry-a", 2000)).thenThrow(new IllegalStateException("独立测试单服失败"));
        runner.tick();
        verify(clock, times(1)).instant();
        var order = inOrder(service);
        order.verify(service).maintain("entry-a", 2000);
        order.verify(service).maintain("entry-b", 2000);
        verifyNoMoreInteractions(service);
    }

    /** 同因重复失败只打印一次但继续重试，成功一次后再次失败应重新记录，日志不控制维护结果。 */
    @Test
    void repeatedFailureIsLoggedOnceUntilARecovery(CapturedOutput output) {
        var service = mock(IdleActivityMaintenanceService.class);
        var properties = enabled(List.of(server("runner-log-a", OPENING), server("runner-log-b", OPENING)));
        var runner = new IdleActivityMaintenance(service, properties, FIXED_CLOCK);
        runner.run(new DefaultApplicationArguments());
        clearInvocations(service);
        when(service.maintain("runner-log-a", 2000))
                .thenThrow(new IllegalStateException("固定故障原因"))
                .thenThrow(new IllegalStateException("固定故障原因"))
                .thenReturn(null)
                .thenThrow(new IllegalStateException("固定故障原因"));
        for (int attempt = 0; attempt < 4; attempt++) {
            runner.tick();
        }
        verify(service, times(4)).maintain("runner-log-a", 2000);
        verify(service, times(4)).maintain("runner-log-b", 2000);
        assertEquals(2, occurrences(output.getAll(), "挂机活动控制维护失败，区服=runner-log-a"));
    }

    /** 只统计特定测试区服的完整日志前缀，不依赖异常堆栈的行数或其他测试的输出。 */
    private long occurrences(String text, String needle) {
        long count = 0;
        int start = 0;
        while ((start = text.indexOf(needle, start)) >= 0) {
            count++;
            start += needle.length();
        }
        return count;
    }
}
