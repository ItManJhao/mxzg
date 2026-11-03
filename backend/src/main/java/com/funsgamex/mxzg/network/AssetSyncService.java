/** 资产事务同步出口：事务内递增持久版本，提交后合并通知；回滚不发送，离线不缓存推送。 */
package com.funsgamex.mxzg.network;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.support.*;
@Service
public class AssetSyncService {
    /** 已提交的角色标识；处理者重新读取完整权威状态，不传递未提交的资产。 */
    public record Changed(String roleId) {}
    /** 持久版本唯一入口，与业务资产使用同一事务。 */
    private final JdbcTemplate jdbc;
    /** 仅通知本进程在线连接；重连从数据库读取，不依赖内存历史。 */
    private final ApplicationEventPublisher events;
    /** 注入共享数据库与事件发布器，不持有玩家资产副本。 */
    public AssetSyncService(JdbcTemplate jdbc, ApplicationEventPublisher events) { this.jdbc=jdbc; this.events=events; }
    /** 资产写入前检查，防止自动提交模式先写数据再因缺少事务而报错。 */
    public void requireTransaction() {
        if (!TransactionSynchronizationManager.isActualTransactionActive() || !TransactionSynchronizationManager.isSynchronizationActive())
            throw new IllegalStateException("资产修改必须在事务内执行");
    }
    /** 调用者须在持有角色锁的事务内修改资产；同事务同角色仅发布一次提交事件。 */
    @SuppressWarnings("unchecked")
    public void changed(String role) {
        requireTransaction();
        Set<String> changed=(Set<String>)TransactionSynchronizationManager.getResource(this);
        if (changed==null) {
            changed=new LinkedHashSet<>(); TransactionSynchronizationManager.bindResource(this,changed);
            final Set<String> committed=changed;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                /** 提交成功后只发送已落库状态；推送失败由重连恢复，不回滚已经提交的业务。 */
                @Override public void afterCommit() { for(String roleId:committed) events.publishEvent(new Changed(roleId)); }
                /** 成功和回滚均解除线程资源，避免后续请求误复用去重集合。 */
                @Override public void afterCompletion(int status) { TransactionSynchronizationManager.unbindResourceIfPossible(AssetSyncService.this); }
            });
        }
        if (changed.add(role)) jdbc.update("UPDATE game_role SET state_revision=state_revision+1 WHERE id=?",role);
    }
}
