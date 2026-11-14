/**
 * 活动044可信发布持久回归：独立H2迁移至V22，以真实事务代理核对发布版本、内容幂等及同服并发。
 * 使用真实周期、掉落与发布编码；只准备测试控制和资产，不启动Spring或调用运营HTTP、兑换和领取。
 * 发布与初始化失败必须整体回滚；内容版本不等同控制revision，也不能重置已消费的开始标记。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.IdleActivityControlRules;
import com.funsgamex.mxzg.campaign.IdleActivityMaintenanceService;
import com.funsgamex.mxzg.campaign.IdleActivityPublicationUtils;
import com.funsgamex.mxzg.campaign.IdleActivityPublicationUtils.Exchange;
import com.funsgamex.mxzg.campaign.IdleActivityPublicationUtils.Publication;
import com.funsgamex.mxzg.campaign.IdleActivityRules;
import com.funsgamex.mxzg.campaign.IdleActivityService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class IdleActivityPublicationServiceTest {
    /** 独立测试服明确给定的开服Unix秒，不使用当前机器时钟补值。 */
    private static final long OPENED_AT = Instant.parse("2026-11-13T04:00:00Z").getEpochSecond();
    /** 本用例活动开始秒，与开服同天，避免普通周期维护在发布边界测试中同时推进。 */
    private static final long START = OPENED_AT + 1000;
    /** 本用例独享数据库地址，生命周期仅覆盖一项测试。 */
    private String databaseUrl;
    /** 只准备当前独立库的控制和可核对资产。 */
    private JdbcTemplate jdbc;
    /** 所有代理共享的事务管理器，区服锁与发布写入实际使用同一事务。 */
    private DataSourceTransactionManager transactions;
    /** 已有只读映射代理，验证真实提交后可读到完整三控制快照。 */
    private IdleActivityService reader;
    /** 实际发布和初始化服务代理，不绕过生产@Transactional边界。 */
    private IdleActivityMaintenanceService service;
    /** 编码依赖只用于构造预期规范内容，不保存活动状态。 */
    private ObjectMapper json;

    /** 创建真实V22结构和生产注解事务代理，初始不写开服时间或控制。 */
    @BeforeEach
    void createIsolatedSchema() {
        databaseUrl = "jdbc:h2:mem:idle_publication_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000";
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("22").load().migrate();
        var source = new DriverManagerDataSource(databaseUrl, "sa", "");
        jdbc = new JdbcTemplate(source);
        transactions = new DataSourceTransactionManager(source);
        json = new ObjectMapper();
        reader = proxy(new IdleActivityService(jdbc), IdleActivityService.class);
        service = proxy(new IdleActivityMaintenanceService(jdbc, reader,
                new IdleActivityControlRules(json), new IdleActivityRules(json), json),
                IdleActivityMaintenanceService.class);
    }

    /** 释放本用例内存库，测试不保留持久状态或后台线程。 */
    @AfterEach
    void closeDatabase() {
        jdbc.execute("SHUTDOWN");
    }

    /** 让真实事务注解生效，确保内部自调用由外层configure事务统一回滚。 */
    private <T> T proxy(T target, Class<T> type) {
        var interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(transactions);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(target);
        factory.addAdvice(interceptor);
        return type.cast(factory.getProxy());
    }

    /** 使用旧六字段交换结构，物品JSON保留原三字段语义，测试不实际兑换或发放。 */
    private Exchange exchange(long quantity) {
        return new Exchange(1, "[{\"item_type\":901702,\"item_num\":" + quantity + "}]",
                "[{\"item_type\":900001,\"item_num\":3}]", 5, 0, 1);
    }

    /** 构造合法发布意图，测试只改变版本、开始秒或奖励数量来区分内容指纹。 */
    private Publication publication(long version, long start, long quantity) {
        return new Publication(version, start, start + 100, start + 200, 0, List.of(exchange(quantity)));
    }

    /** 初始化当前测试服并发布一项可信内容，不通过网络或GM。 */
    private IdleActivityService.Snapshot publish(Publication publication) {
        service.initialize("local-1", OPENED_AT);
        return service.publish044("local-1", publication, publication.startSeconds());
    }

    /** 返回044原始控制及发布元数据，TEXT按字符串核对，避免驱动LOB对象身份影响前后比较。 */
    private Map<String, Object> row() {
        var result = jdbc.queryForMap("SELECT * FROM game_idle_activity_control WHERE server_id='local-1' AND activity_id=44");
        result.put("publication_config", jdbc.queryForObject("SELECT publication_config FROM game_idle_activity_control "
                + "WHERE server_id='local-1' AND activity_id=44", String.class));
        return result;
    }

    /** 单独读取可空开始标记，不能把NULL错误解释成已安排在零秒。 */
    private Long next() {
        return jdbc.queryForObject("SELECT next_start_seconds FROM game_idle_activity_control "
                + "WHERE server_id='local-1' AND activity_id=44", Long.class);
    }

    /** 首次发布保存真实规范内容及版本，完整快照包含044且保留旧运营轮次0。 */
    @Test
    void firstPublicationPersistsCanonicalMetadataAndCompleteSnapshot() {
        var publication = publication(1, START, 2);
        var expected = IdleActivityPublicationUtils.encode(json, publication);
        var result = service.configure("local-1", OPENED_AT, Optional.of(publication), START);
        var control = result.controls().get(2);
        assertEquals(List.of(16, 34, 44), result.controls().stream().map(value -> value.activityId()).toList());
        assertTrue(control.published());
        assertEquals(2, control.revision());
        assertEquals(0, control.period().orElseThrow().turns());
        assertEquals(0, control.period().orElseThrow().turnsTimeSeconds());
        assertEquals(START, control.period().orElseThrow().startSeconds());
        assertEquals(START, next());
        var raw = row();
        assertEquals(1L, ((Number) raw.get("publication_version")).longValue());
        assertEquals(expected.fingerprint(), raw.get("publication_fingerprint"));
        assertEquals(expected.configJson(), raw.get("publication_config"));
        var committed = new TransactionTemplate(transactions).execute(status -> reader.current("local-1"));
        assertEquals(result, committed);
    }

    /** 同版本规范等义JSON重放在开始标记消费后仍幂等，不能重置next、身份时间或控制revision。 */
    @Test
    void canonicalSameVersionReplayDoesNotRearmTheConsumedStartMarker() {
        var publication = publication(1, START, 2);
        publish(publication);
        service.maintain("local-1", START + 1);
        var before = row();
        assertNull(next());
        var equivalent = new Publication(1, START, START + 100, START + 200, 0, List.of(new Exchange(1,
                "[ { \"item_num\": 2, \"chance\": 0, \"item_type\": 901702 } ]",
                "[ { \"item_num\":3, \"item_type\":900001, \"chance\":0 } ]", 5, 0, 1)));

        service.publish044("local-1", equivalent, START + 2);

        assertEquals(before, row());
        assertNull(next());
    }

    /** 同版本异内容与倒退版本都拒绝，不能覆盖已有意图、期次或维护版本。 */
    @Test
    void conflictingSameVersionAndOlderVersionAreRejectedWithoutWrites() {
        publish(publication(3, START, 2));
        var before = row();
        assertThrows(IllegalStateException.class, () -> service.publish044("local-1", publication(3, START, 9), START));
        assertEquals(before, row());
        assertThrows(IllegalStateException.class, () -> service.publish044("local-1", publication(2, START, 2), START));
        assertEquals(before, row());
    }

    /** 内容未变化的新发布版本只确认意图版本，不增控制revision、不重开已消费标记。 */
    @Test
    void newerVersionWithIdenticalPayloadOnlyUpdatesPublicationVersion() {
        publish(publication(1, START, 2));
        service.maintain("local-1", START + 1);
        var before = row();
        long revision = ((Number) before.get("revision")).longValue();

        var result = service.publish044("local-1", publication(7, START, 2), START + 2);

        var after = row();
        assertEquals(7L, ((Number) after.remove("publication_version")).longValue());
        before.remove("publication_version");
        assertEquals(before, after);
        assertEquals(revision, result.controls().get(2).revision());
        assertNull(next());
    }

    /** 同start修订内容属于同一期，发布保留turns/turnsTime，仅重新安排该start的控制标记。 */
    @Test
    void sameStartContentRevisionPreservesPeriodIdentity() {
        publish(publication(1, START, 2));
        service.maintain("local-1", START + 1);
        var before = row();
        long revision = ((Number) before.get("revision")).longValue();

        var result = service.publish044("local-1", publication(2, START, 9), START + 2);

        var control = result.controls().get(2);
        assertEquals(revision + 1, control.revision());
        assertEquals(0, control.period().orElseThrow().turns());
        assertEquals(START, control.period().orElseThrow().turnsTimeSeconds());
        assertEquals(START, next());
        assertEquals(IdleActivityPublicationUtils.encode(json, publication(2, START, 9)).configJson(),
                row().get("publication_config"));
    }

    /** 旧活动[start,clear]双包含，期间不能向后改start；开始前或clear后一秒才允许。 */
    @Test
    void movingStartForwardIsRejectedThroughTheExactClearSecond() {
        var first = publication(1, START, 2);
        publish(first);
        var moved = publication(2, START + 10, 2);
        var before = row();
        for (long now : List.of(START, START + 100, START + 200)) {
            assertThrows(IllegalStateException.class, () -> service.publish044("local-1", moved, now));
            assertEquals(before, row());
        }
        var afterClear = service.publish044("local-1", moved, START + 201);
        assertEquals(START + 10, afterClear.controls().get(2).period().orElseThrow().startSeconds());

        service.initialize("local-2", OPENED_AT);
        service.publish044("local-2", first, START - 1);
        var beforeStart = service.publish044("local-2", moved, START - 1);
        assertEquals(START + 10, beforeStart.controls().get(2).period().orElseThrow().startSeconds());
    }

    /** 发布结构合法但超过旧99999开服日覆盖时，configure中之前的开服和三控制写入全部回滚。 */
    @Test
    void configureRollsBackInitializationWhenThePublicationDayGateFails() {
        long tooLate = Math.addExact(OPENED_AT, Math.multiplyExact(100_001L, 86_400));
        var publication = publication(1, tooLate, 2);
        assertNotNull(IdleActivityPublicationUtils.encode(json, publication));

        assertThrows(IllegalArgumentException.class,
                () -> service.configure("local-1", OPENED_AT, Optional.of(publication), OPENED_AT));

        assertNull(jdbc.queryForObject("SELECT opened_at_seconds FROM game_server WHERE id='local-1'", Long.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_idle_activity_control", Integer.class));
    }

    /** 同服同版本异内容并发由真实区服行锁串行化，仅一份内容成为已提交意图。 */
    @Test
    void concurrentConflictingPublicationsHaveExactlyOneWinner() throws Exception {
        service.initialize("local-1", OPENED_AT);
        var intents = List.of(publication(1, START, 2), publication(1, START, 9));
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        int winners = 0;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var futures = new ArrayList<java.util.concurrent.Future<Boolean>>();
            for (var intent : intents) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    if (!start.await(10, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("测试发布并发起点等待超时");
                    }
                    try {
                        service.publish044("local-1", intent, START);
                        return true;
                    } catch (IllegalStateException conflict) {
                        return false;
                    }
                }));
            }
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            for (var future : futures) {
                if (future.get(10, TimeUnit.SECONDS)) {
                    winners++;
                }
            }
        }
        assertEquals(1, winners);
        var persisted = row();
        assertEquals(1L, ((Number) persisted.get("publication_version")).longValue());
        assertEquals(2L, ((Number) persisted.get("revision")).longValue());
        assertTrue(intents.stream().map(intent -> IdleActivityPublicationUtils.encode(json, intent).fingerprint())
                .anyMatch(fingerprint -> fingerprint.equals(persisted.get("publication_fingerprint"))));
    }

    /** 控制revision加一溢出时不提交新的发布版本、内容或期次，不能饱和或变成负版本。 */
    @Test
    void revisionOverflowRollsBackPublicationMetadataAndPeriod() {
        publish(publication(1, START, 2));
        jdbc.update("UPDATE game_idle_activity_control SET revision=? WHERE server_id='local-1' AND activity_id=44", Long.MAX_VALUE);
        var before = row();

        assertThrows(ArithmeticException.class, () -> service.publish044("local-1", publication(2, START, 9), START));

        assertEquals(before, row());
    }

    /** 可信配置省略044不代表撤销或重新发布，重启式configure保留已消费标记和现存发布版本。 */
    @Test
    void configureWithoutPublicationPreservesTheExistingIntent() {
        publish(publication(3, START, 2));
        service.maintain("local-1", START + 1);
        var before = row();

        var result = service.configure("local-1", OPENED_AT, Optional.empty(), START + 2);

        assertEquals(before, row());
        assertTrue(result.controls().get(2).published());
        assertNull(next());
    }

    /** 发布和维护只改变本服控制，另一服、角色钱包/版本、活动道具和挂机时钟均保持原值。 */
    @Test
    void publicationIsServerScopedAndNeverChangesRoleAssets() {
        String role = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,"
                        + "server_id,state_revision,role_experience) VALUES (?,?,?,7,123,45,?,'local-1',9,33)",
                role, "publication_" + role, "Existing", "publication_" + role);
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,901702,41,?)",
                role, "fires:" + role);
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,123456)", role);
        var roleBefore = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role);
        var inventory = jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", role);
        var clock = jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role);
        service.initialize("local-2", OPENED_AT);
        var otherControls = jdbc.queryForList("SELECT * FROM game_idle_activity_control WHERE server_id='local-2' ORDER BY activity_id");

        publish(publication(1, START, 2));
        service.maintain("local-1", START + 1);

        assertEquals(otherControls, jdbc.queryForList("SELECT * FROM game_idle_activity_control WHERE server_id='local-2' ORDER BY activity_id"));
        assertEquals(roleBefore, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role));
        assertEquals(inventory, jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", role));
        assertEquals(clock, jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role));
    }
}
