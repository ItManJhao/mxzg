/**
 * 永恒梦境排行后台作业，按区服零点归档名次，再逐个恢复冻结的系统邮件。
 * 每个写入口自带事务，单一区服或邮箱失败不阻塞其他奖励。
 */
package com.funsgamex.mxzg.dreamland;

import com.funsgamex.mxzg.server.ServerCatalog;
import com.funsgamex.mxzg.time.GameClock;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
final class DreamlandRankMaintenance {
    /** 记录区服结算与意外邮件错误，满信箱按限期自动重试。 */
    private static final Logger LOG = LoggerFactory.getLogger(DreamlandRankMaintenance.class);
    /** 每轮处理的邮件上限，其他记录留到下次继续。 */
    private static final int MAIL_BATCH_SIZE = 50;
    /** 邮件投递失败后延迟一分钟，避免反复排到队首。 */
    private static final long MAIL_RETRY_SECONDS = 60;
    /** 持有并推进排行游标和冻结邮件的业务服务。 */
    private final DreamlandRankService ranks;
    /** 维护只初始化本机开放的真实区服。 */
    private final ServerCatalog servers;
    /** 读取游戏秒作为冻结、投递与重试基准。 */
    private final GameClock clock;
    /** 测试可停调度以便直接验证指定截止点。 */
    private final boolean enabled;
    /** 每服最近一次失败签名，相同原因不重复记录。 */
    private final Map<String, String> loggedFailures = new HashMap<>();

    /** 注入与业务一致的区服目录、时钟和结算入口。 */
    DreamlandRankMaintenance(DreamlandRankService ranks, ServerCatalog servers, GameClock clock,
            @Value("${mxzg.dreamland-rank-maintenance.enabled:${mxzg.dreamland-maintenance.enabled:true}}")
            boolean enabled) {
        this.ranks = ranks;
        this.servers = servers;
        this.clock = clock;
        this.enabled = enabled;
    }

    /** 调度首先归档已到期区服，然后只尝试已经持久化的待发邮件。 */
    @Scheduled(fixedDelayString = "${mxzg.dreamland-rank-maintenance.interval-millis:5000}",
            initialDelayString = "${mxzg.dreamland-rank-maintenance.interval-millis:5000}")
    void maintain() {
        if (!enabled) {
            return;
        }
        for (var server : servers.list()) {
            if (server.enabled()) {
                settle(server.id());
            }
        }
        long now = clock.epochSeconds();
        for (var key : ranks.pending(now, MAIL_BATCH_SIZE)) {
            try {
                ranks.deliver(key, now);
            } catch (RuntimeException failure) {
                try {
                    ranks.delay(key, now + MAIL_RETRY_SECONDS);
                } catch (RuntimeException retryFailure) {
                    failure.addSuppressed(retryFailure);
                }
                if (!(failure instanceof ResponseStatusException status) || !"MAIL_FULL".equals(status.getReason())
                        || failure.getSuppressed().length != 0) {
                    LOG.warn("梦境名次奖励邮件待重试，区服={}，期次={}，角色={}",
                            key.serverId(), key.periodEnd(), key.roleId(), failure);
                }
            }
        }
    }

    /** 只在同一个区服首次出现某类结算故障时记录，恢复后可再次报告。 */
    private void settle(String serverId) {
        try {
            ranks.settleServer(serverId);
            loggedFailures.remove(serverId);
        } catch (RuntimeException failure) {
            String key = failure.getClass().getName() + failure.getMessage();
            if (!key.equals(loggedFailures.put(serverId, key))) {
                LOG.warn("永恒梦境名次结算未提交，区服={}", serverId, failure);
            }
        }
    }
}
