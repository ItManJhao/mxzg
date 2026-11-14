/**
 * 资产同步的独立事务回归：验证提交后期限回收、REQUIRES_NEW挂起恢复及通知失败。
 * 每项使用独立H2和真实Spring事务、AssetSyncService/TimedInventoryService，不启动业务协议或访问玩家库。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.inventory.TimedInventoryService;
import com.funsgamex.mxzg.inventory.TimedItemRules;
import com.funsgamex.mxzg.network.AssetSyncService;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class AssetSyncTransactionTest {
    /** 当前用例唯一的内存数据库，结束时关闭，不复用其他测试的角色。 */
    private JdbcTemplate jdbc;
    /** 当前独立库的默认事务入口，用于模拟一次资产业务。 */
    private TransactionTemplate transaction;
    /** 当前独立库的新事务入口，模拟提交后统一快照或显式独立写入。 */
    private TransactionTemplate requiresNew;
    /** 被验证的真实同步出口；每项测试重新创建，不跨用例保存去重状态。 */
    private AssetSyncService sync;
    /** 真实期限物品读取入口，用于触发快照中的过期删除。 */
    private TimedInventoryService timed;
    /** 已发布的角色通知，按实际触发顺序记录，回滚不得追加。 */
    private List<String> notifications;
    /** 本用例的同步监听行为；初始为空，由各项安装嵌套事务或异常场景。 */
    private Consumer<AssetSyncService.Changed> listener;

    /** 建立最小真实资产表及两个角色，每项持久版本从0开始。 */
    @BeforeEach
    void prepareDatabase() {
        var source = new DriverManagerDataSource(
                "jdbc:h2:mem:asset_sync_" + UUID.randomUUID()
                        + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE game_role(id VARCHAR(36) PRIMARY KEY,state_revision BIGINT NOT NULL)");
        jdbc.execute("CREATE TABLE game_timed_inventory(instance_id VARCHAR(36) PRIMARY KEY,"
                + "role_id VARCHAR(36),item_id INT,effect_type INT,active_at_seconds BIGINT,expires_at_seconds BIGINT)");
        jdbc.update("INSERT INTO game_role(id,state_revision) VALUES ('a',0),('b',0)");
        var manager = new DataSourceTransactionManager(source);
        transaction = new TransactionTemplate(manager);
        requiresNew = new TransactionTemplate(manager);
        requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        notifications = new ArrayList<>();
        listener = event -> {};
        sync = new AssetSyncService(jdbc, event -> {
            var changed = (AssetSyncService.Changed) event;
            notifications.add(changed.roleId());
            listener.accept(changed);
        });
        timed = new TimedInventoryService(jdbc, sync, new TimedItemRules(new ObjectMapper()));
    }

    /** 关闭唯一内存库，同时核对同步资源没有残留在测试线程。 */
    @AfterEach
    void closeDatabase() {
        try {
            assertFalse(TransactionSynchronizationManager.hasResource(sync));
        } finally {
            jdbc.execute("SHUTDOWN");
        }
    }

    /** 返回指定测试角色的已持久化版本，不读取本地通知集合推断版本。 */
    private long revision(String role) {
        return jdbc.queryForObject("SELECT state_revision FROM game_role WHERE id=?", Long.class, role);
    }

    /** 模拟受外层业务保护的角色行锁；不使用Java进程锁代替数据库锁。 */
    private void lockRole(String role) {
        jdbc.queryForObject("SELECT id FROM game_role WHERE id=? FOR UPDATE", String.class, role);
    }

    /** 放入一条在固定服务器秒100已过期的实例，不依赖测试机器时钟。 */
    private void prepareExpiredItem() {
        jdbc.update("INSERT INTO game_timed_inventory VALUES ('expired','a',902025,0,0,100)");
    }

    /** 统计真实期限记录，确认删除是否提交或回滚。 */
    private int timedCount() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_timed_inventory", Integer.class);
    }

    /** 同一业务对同角色重复登记只递增一次，并在事务真正提交之后才通知。 */
    @Test
    void repeatedChangesShareOneRevisionAndNotifyAfterCommit() {
        transaction.executeWithoutResult(status -> {
            lockRole("a");
            sync.changed("a");
            sync.changed("a");
            assertEquals(1, revision("a"));
            assertTrue(notifications.isEmpty());
        });
        assertEquals(1, revision("a"));
        assertEquals(List.of("a"), notifications);
    }

    /** 回滚既不留版本也不通知，后续事务仍能独立登记同角色。 */
    @Test
    void rollbackClearsBatchWithoutSuppressingTheNextTransaction() {
        transaction.executeWithoutResult(status -> {
            lockRole("a");
            sync.changed("a");
            status.setRollbackOnly();
        });
        assertEquals(0, revision("a"));
        assertTrue(notifications.isEmpty());
        transaction.executeWithoutResult(status -> {
            lockRole("a");
            sync.changed("a");
        });
        assertEquals(1, revision("a"));
        assertEquals(List.of("a"), notifications);
    }

    /** 正常REQUIRES_NEW必须拥有自己的去重集合，返回后外层继续复用原集合。 */
    @Test
    void requiresNewSuspendsAndRestoresTheOuterBatch() {
        transaction.executeWithoutResult(status -> {
            lockRole("a");
            sync.changed("a");
            requiresNew.executeWithoutResult(inner -> {
                lockRole("b");
                sync.changed("b");
                sync.changed("b");
            });
            assertEquals(List.of("b"), notifications);
            sync.changed("a");
        });
        assertEquals(1, revision("a"));
        assertEquals(1, revision("b"));
        assertEquals(List.of("b", "a"), notifications);
    }

    /** 外层回滚不会抹掉已提交的独立事务，也不发送外层未提交角色。 */
    @Test
    void outerRollbackPreservesOnlyTheInnerCommittedNotification() {
        transaction.executeWithoutResult(status -> {
            lockRole("a");
            sync.changed("a");
            requiresNew.executeWithoutResult(inner -> {
                lockRole("b");
                sync.changed("b");
            });
            status.setRollbackOnly();
        });
        assertEquals(0, revision("a"));
        assertEquals(1, revision("b"));
        assertEquals(List.of("b"), notifications);
    }

    /** 内层回滚后恢复原外层集合，不能丢掉或重复递增外层角色。 */
    @Test
    void innerRollbackDoesNotEraseTheOuterBatch() {
        transaction.executeWithoutResult(status -> {
            lockRole("a");
            sync.changed("a");
            requiresNew.executeWithoutResult(inner -> {
                lockRole("b");
                sync.changed("b");
                inner.setRollbackOnly();
            });
            sync.changed("a");
        });
        assertEquals(1, revision("a"));
        assertEquals(0, revision("b"));
        assertEquals(List.of("a"), notifications);
    }

    /** 提交后快照恰好删除过期物品时，真实删除必须另增版本并再次通知。 */
    @Test
    void afterCommitExpiryHasItsOwnRevisionAndNotification() {
        prepareExpiredItem();
        var firstNotification = new AtomicBoolean(true);
        listener = event -> {
            if (firstNotification.getAndSet(false)) {
                requiresNew.executeWithoutResult(status -> {
                    lockRole("a");
                    assertTrue(timed.current("a", 100).items().isEmpty());
                });
            }
        };
        transaction.executeWithoutResult(status -> {
            lockRole("a");
            sync.changed("a");
        });
        assertEquals(0, timedCount());
        assertEquals(2, revision("a"));
        assertEquals(List.of("a", "a"), notifications);
    }

    /** 快照期限清理回滚不推送该删除，外层提交仍成立，稍后重试可以真实回收。 */
    @Test
    void rolledBackAfterCommitExpiryDoesNotConsumeTheNextRevision() {
        prepareExpiredItem();
        listener = event -> requiresNew.executeWithoutResult(status -> {
            lockRole("a");
            timed.current("a", 100);
            status.setRollbackOnly();
        });
        transaction.executeWithoutResult(status -> {
            lockRole("a");
            sync.changed("a");
        });
        assertEquals(1, timedCount());
        assertEquals(1, revision("a"));
        assertEquals(List.of("a"), notifications);
        listener = event -> {};
        transaction.executeWithoutResult(status -> {
            lockRole("a");
            timed.current("a", 100);
        });
        assertEquals(0, timedCount());
        assertEquals(2, revision("a"));
        assertEquals(List.of("a", "a"), notifications);
    }

    /** 一个角色的通知异常不能使已提交业务报失败或阻断同事务其他角色的交付。 */
    @Test
    void notificationFailureDoesNotChangeCommitOrSkipOtherRoles() {
        listener = event -> {
            if (event.roleId().equals("a")) {
                throw new IllegalStateException("模拟提交后连接发送失败");
            }
        };
        assertDoesNotThrow(() -> transaction.executeWithoutResult(status -> {
            lockRole("a");
            lockRole("b");
            sync.changed("a");
            sync.changed("b");
        }));
        assertEquals(1, revision("a"));
        assertEquals(1, revision("b"));
        assertEquals(List.of("a", "b"), notifications);
    }

    /** 离开事务不得推进版本或遗留线程绑定。 */
    @Test
    void changeOutsideTransactionIsRejectedBeforeAnyWrite() {
        assertThrows(IllegalStateException.class, () -> sync.changed("a"));
        assertEquals(0, revision("a"));
        assertTrue(notifications.isEmpty());
    }
}
