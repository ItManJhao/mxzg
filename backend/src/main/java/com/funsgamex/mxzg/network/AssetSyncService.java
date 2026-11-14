/**
 * 资产事务同步出口：在角色锁事务内递增持久版本，同一事务同角色只登记一次。
 * 由真实资产写入调用；独立事务拥有各自的去重集合，提交后通知，回滚不发送。
 * 通知失败只记录交付异常，不改变已经提交的业务结果；离线状态由重新鉴权恢复。
 */
package com.funsgamex.mxzg.network;

import java.util.LinkedHashSet;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class AssetSyncService {
    /** 提交后交付失败的唯一日志出口，不建立第二份通知队列或重放资产。 */
    private static final Logger LOG = LoggerFactory.getLogger(AssetSyncService.class);
    /** 已提交的角色标识；处理者重新读取完整权威状态，不传递未提交的资产。 */
    public record Changed(String roleId) {}
    /** 持久版本唯一入口，与业务资产使用同一事务。 */
    private final JdbcTemplate jdbc;
    /** 仅通知本进程在线连接；重连从数据库读取，不依赖内存历史。 */
    private final ApplicationEventPublisher events;

    /** 注入共享数据库与事件发布器，不持有玩家资产副本。 */
    public AssetSyncService(JdbcTemplate jdbc, ApplicationEventPublisher events) {
        this.jdbc = jdbc;
        this.events = events;
    }

    /** 资产写入前检查，防止自动提交模式先写数据再因缺少事务而报错。 */
    public void requireTransaction() {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("资产修改必须在事务内执行");
        }
    }

    /**
     * 调用者须在持有角色锁的事务内修改资产；同事务同角色仅增加一次版本并登记一次通知。
     * REQUIRES_NEW挂起外层集合，避免提交后快照的期限回收错误复用已提交事务的去重状态。
     */
    @SuppressWarnings("unchecked")
    public void changed(String role) {
        requireTransaction();
        Set<String> changed = (Set<String>) TransactionSynchronizationManager.getResource(this);
        if (changed == null) {
            changed = new LinkedHashSet<>();
            TransactionSynchronizationManager.bindResource(this, changed);
            final Set<String> committed = changed;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                /** 挂起本事务自定义资源，让独立事务建立自己的角色去重集合。 */
                @Override
                public void suspend() {
                    unbindOwnedBatch(committed);
                }

                /** 独立事务结束后恢复外层集合，外层后续写入继续共享原有登记。 */
                @Override
                public void resume() {
                    TransactionSynchronizationManager.bindResource(AssetSyncService.this, committed);
                }

                /** 只交付已提交状态；单角色通知失败不阻断其他角色，也不伪装成资产回滚。 */
                @Override
                public void afterCommit() {
                    for (String roleId : committed) {
                        notifyCommitted(roleId);
                    }
                }

                /** 提交和回滚均只解除自己登记的资源，不能清掉另一事务的集合。 */
                @Override
                public void afterCompletion(int status) {
                    unbindOwnedBatch(committed);
                }
            });
        }
        if (changed.add(role)) {
            jdbc.update("UPDATE game_role SET state_revision=state_revision+1 WHERE id=?", role);
        }
    }

    /** 已提交通知失败仅影响交付；日志系统故障同样不能改变业务结果或阻断其他角色。 */
    private void notifyCommitted(String role) {
        try {
            events.publishEvent(new Changed(role));
        } catch (RuntimeException failure) {
            try {
                LOG.warn("资产已提交但状态通知失败，等待重新鉴权恢复：roleId={}", role, failure);
            } catch (RuntimeException loggingFailure) {
                // 两种交付渠道都不可用时仍保留已提交结果，连接恢复依赖持久快照而不是重新发奖。
            }
        }
    }

    /** 按对象身份解除本事务的线程绑定；重复清理无副作用，不误删恢复后的其他集合。 */
    private void unbindOwnedBatch(Set<String> owned) {
        if (TransactionSynchronizationManager.getResource(this) == owned) {
            TransactionSynchronizationManager.unbindResource(this);
        }
    }
}
