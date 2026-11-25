/** 普通竞技场原每两秒运维入口。逐服结算，逐封邮件投递，每次失败独立处理。 */
package com.funsgamex.mxzg.arena;

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
final class ArenaSeasonMaintenance {
    /** 区服结算和系统邮件运维异常在此层统一记录。 */
    private static final Logger LOG = LoggerFactory.getLogger(ArenaSeasonMaintenance.class);
    /** 每轮最多投递 50 个持久待处理奖励，下一轮继续剩余记录。 */
    private static final int MAIL_BATCH_SIZE = 50;
    /** 已有独立事务的竞技场区服维护及邮件投递入口。 */
    private final ArenaSeasonService seasons;
    /** 只结算本部署已启用、来自实际目录的区服。 */
    private final ServerCatalog servers;
    /** 原秒级业务边界来自游戏时钟，不依赖宿主机时区。 */
    private final GameClock clock;
    /** 本部署是否启用维护，隔离测试可显式关闭调度。 */
    private final boolean enabled;
    /** 同一区服连续同类原因只记录一次，成功后清除。 */
    private final Map<String, String> loggedFailures = new HashMap<>();

    /** 注入真实区服目录、服务端时钟和按期事务能力。 */
    ArenaSeasonMaintenance(ArenaSeasonService seasons, ServerCatalog servers, GameClock clock,
                           @Value("${mxzg.arena-maintenance.enabled:true}") boolean enabled) {
        this.seasons = seasons;
        this.servers = servers;
        this.clock = clock;
        this.enabled = enabled;
    }

    /** 每轮先按区服结算，再恢复各角色尚未成功送达的邮件。 */
    @Scheduled(fixedDelayString = "${mxzg.arena-maintenance.interval-millis:2000}",
            initialDelayString = "${mxzg.arena-maintenance.interval-millis:2000}")
    void maintain() {
        if (!enabled) {
            return;
        }
        for (var server : servers.list()) {
            if (!server.enabled()) {
                continue;
            }
            try {
                seasons.maintain(server.id());
                loggedFailures.remove(server.id());
            } catch (RuntimeException failure) {
                String reason = failure.getClass().getName() + failure.getMessage();
                if (!reason.equals(loggedFailures.put(server.id(), reason))) {
                    LOG.error("竞技场区服结算未提交，区服={}", server.id(), failure);
                }
            }
        }
        long now = clock.epochSeconds();
        for (var key : seasons.pending(now, MAIL_BATCH_SIZE)) {
            try {
                seasons.deliver(key, now);
            } catch (RuntimeException failure) {
                seasons.delay(key, now + 60);
                if (!(failure instanceof ResponseStatusException http) || !"MAIL_FULL".equals(http.getReason())) {
                    LOG.error("竞技场排名奖励邮件未投递，奖励类型={},期次={}", key.kind(), key.periodEnd(), failure);
                }
            }
        }
    }
}
