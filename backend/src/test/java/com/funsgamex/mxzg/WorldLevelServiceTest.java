/**
 * 世界等级只读快照回归：使用本用例独享的内存库验证分区、前列平均、缓存刷新与事务隔离。
 * 不启动Web服务、不连接玩家库、不写游戏资产；服务的定时入口由测试显式调用，不等待五分钟。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.world.WorldLevelService;
import java.io.InputStream;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WorldLevelServiceTest {
    /** 每个用例独享的内存库访问器，只保存统计所需最小表结构。 */
    private JdbcTemplate jdbc;

    /** 与用例JdbcTemplate共用同一个数据源，用于验证外层事务被独立快照读取挂起。 */
    private DataSourceTransactionManager transactions;

    /** 本用例的世界快照服务，按真实system配置取前50名。 */
    private WorldLevelService service;

    /** 创建隔离内存库及最小角色表，不借用已有Spring上下文或target中的角色数据。 */
    @BeforeEach
    void createDatabase() {
        var dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:world_snapshot_" + UUID.randomUUID()
                        + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(dataSource);
        transactions = new DataSourceTransactionManager(dataSource);
        jdbc.execute("CREATE TABLE game_role(id VARCHAR(64) PRIMARY KEY,server_id VARCHAR(32),role_level INT)");
        service = new WorldLevelService(jdbc, transactions, new ObjectMapper());
    }

    /** 关闭当前用例独享的内存库，避免重复运行保留无用H2实例。 */
    @AfterEach
    void closeDatabase() {
        jdbc.execute("SHUTDOWN");
    }

    /** 插入本用例的已提交角色等级；不通过GM或正式资产接口。 */
    private void role(String serverId, int level) {
        jdbc.update("INSERT INTO game_role(id,server_id,role_level) VALUES (?,?,?)",
                UUID.randomUUID().toString(), serverId, level);
    }

    /** 真正空服返回1，采样数为0；正常少量角色按实际人数平均，不补50人的分母。 */
    @Test
    void emptyAndSmallServersUseActualSampleCount() {
        long before = Instant.now().getEpochSecond();
        var empty = service.current("empty");
        assertEquals(1, empty.level());
        assertEquals(0, empty.sampledRoles());
        assertEquals("empty", empty.serverId());
        assertTrue(empty.computedAtSeconds() >= before);
        role("small", 70);
        role("small", 71);
        var small = service.current("small");
        assertEquals(70, small.level());
        assertEquals(2, small.sampledRoles());
    }

    /** SQL先限制本区再取最高50名，其他区高等级以及本区第51名都不进入平均。 */
    @Test
    void topFiftyIsIsolatedByServer() {
        for (int level = 1; level <= 51; level++) {
            role("local-1", level);
        }
        role("other", 1000);
        var snapshot = service.current("local-1");
        assertEquals(50, snapshot.sampledRoles());
        assertEquals(26, snapshot.level(), "2至51平均26.5，沿旧口径截断");
        assertEquals(1000, service.current("other").level());
    }

    /** 每次current复用同一对象，刷新后替换快照且不修改旧对象。 */
    @Test
    void currentFreezesUntilScheduledRefresh() {
        role("local-1", 10);
        var before = service.current("local-1");
        role("local-1", 100);
        assertSame(before, service.current("local-1"));
        assertEquals(10, before.level());
        service.refreshKnownServers();
        var after = service.current("local-1");
        assertNotSame(before, after);
        assertEquals(55, after.level());
        assertEquals(10, before.level());
        assertTrue(after.generation() > before.generation());
        assertTrue(after.computedAtSeconds() >= before.computedAtSeconds());
    }

    /** 定时回调使用旧五分钟初始延迟和固定完成间隔，不增加测试中的真实等待。 */
    @Test
    void scheduleKeepsFiveMinuteFixedDelay() throws ReflectiveOperationException {
        var scheduled = WorldLevelService.class.getMethod("refreshKnownServers").getAnnotation(Scheduled.class);
        assertNotNull(scheduled);
        assertEquals(300_000, scheduled.initialDelay());
        assertEquals(300_000, scheduled.fixedDelay());
    }

    /** 外层尚未提交的等级更新及随后回滚不能进入首次快照缓存。 */
    @Test
    void initialReadIgnoresUncommittedOuterChanges() {
        role("local-1", 10);
        var outer = new TransactionTemplate(transactions);
        outer.executeWithoutResult(status -> {
            jdbc.update("UPDATE game_role SET role_level=100 WHERE server_id='local-1'");
            assertEquals(10, service.current("local-1").level());
            status.setRollbackOnly();
        });
        assertEquals(10, jdbc.queryForObject("SELECT role_level FROM game_role", Integer.class));
        assertEquals(10, service.current("local-1").level());
    }

    /** 外层新建但未提交的角色不被当成已存在玩家；其提交后只在下次刷新进入快照。 */
    @Test
    void committedOuterInsertAppearsOnlyOnNextRefresh() {
        var outer = new TransactionTemplate(transactions);
        outer.executeWithoutResult(status -> {
            role("local-1", 88);
            assertEquals(0, service.current("local-1").sampledRoles());
        });
        assertEquals(0, service.current("local-1").sampledRoles());
        service.refreshKnownServers();
        assertEquals(88, service.current("local-1").level());
    }

    /** 某区角色状态损坏时只失效本区，其他区继续刷新；恢复数据后读取会真实重算。 */
    @Test
    void failedRefreshInvalidatesOnlyItsServer() {
        role("broken", 10);
        role("healthy", 20);
        var brokenBefore = service.current("broken");
        var healthyBefore = service.current("healthy");
        jdbc.update("UPDATE game_role SET role_level=0 WHERE server_id='broken'");
        jdbc.update("UPDATE game_role SET role_level=30 WHERE server_id='healthy'");
        service.refreshKnownServers();
        assertThrows(IllegalStateException.class, () -> service.current("broken"));
        assertEquals(30, service.current("healthy").level());
        assertTrue(service.current("healthy").generation() > healthyBefore.generation());
        jdbc.update("UPDATE game_role SET role_level=40 WHERE server_id='broken'");
        var restored = service.current("broken");
        assertEquals(40, restored.level());
        assertTrue(restored.generation() > brokenBefore.generation());
    }

    /** SQL失败必须抛出，不能伪造空服等级1，也不能把旧快照标成新代次。 */
    @Test
    void databaseFailureCannotBecomeAnEmptyServer() {
        role("local-1", 40);
        service.current("local-1");
        jdbc.execute("DROP TABLE game_role");
        service.refreshKnownServers();
        assertThrows(RuntimeException.class, () -> service.current("local-1"));
        assertThrows(RuntimeException.class, () -> service.current("never_read"));
    }

    /** 非法区服直接拒绝，不能落成不带条件的跨区全表平均。 */
    @Test
    void invalidServerIdIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> service.current(null));
        assertThrows(IllegalArgumentException.class, () -> service.current(""));
        assertThrows(IllegalArgumentException.class, () -> service.current("local-1' OR 1=1"));
    }

    /** 使用long累计合法int等级，不能在高值样本中发生int求和溢出。 */
    @Test
    void averageDoesNotOverflowIntegerSum() {
        role("local-1", Integer.MAX_VALUE);
        role("local-1", Integer.MAX_VALUE - 1);
        assertEquals(Integer.MAX_VALUE - 1, service.current("local-1").level());
    }

    /** 缺项、重复、非整数或非正数配置拒绝启动，不用缺省50掩盖坏配置。 */
    @Test
    void invalidSampleConfigurationCannotDefaultToFifty() {
        for (String payload : new String[]{
                "{\"rows\":[]}",
                "{\"rows\":[{\"key\":\"other\",\"value\":50}]}",
                "{\"rows\":[{\"key\":\"world_level_people\",\"value\":0}]}",
                "{\"rows\":[{\"key\":\"world_level_people\",\"value\":\"50\"}]}",
                "{\"rows\":[{\"key\":\"world_level_people\",\"value\":50},"
                        + "{\"key\":\"world_level_people\",\"value\":50}]}"}) {
            var mapper = mock(ObjectMapper.class);
            when(mapper.readTree(any(InputStream.class))).thenReturn(new ObjectMapper().readTree(payload));
            assertThrows(IllegalStateException.class, () -> new WorldLevelService(jdbc, transactions, mapper));
        }
    }
}
