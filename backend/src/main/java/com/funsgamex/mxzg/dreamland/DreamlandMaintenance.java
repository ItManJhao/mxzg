/**
 * 推进到期的活跃梦境。一批角色独立事务推进并记录错误，失败不会撤销其他角色的结算。
 * 未在线的角色也可正常模拟和结算，登录后从持久状态及资产同步恢复。
 */
package com.funsgamex.mxzg.dreamland;

import com.funsgamex.mxzg.time.GameClock;
import java.util.LinkedHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
final class DreamlandMaintenance {
    /** 调度失败统一在维护边界记录，不把日志当成玩家结算。 */
    private static final Logger LOG = LoggerFactory.getLogger(DreamlandMaintenance.class);
    /** 单轮从到期索引取 50 个角色，避免调度线程一次处理无限请求。 */
    private static final int BATCH_SIZE = 50;
    /** 控制异常去重缓存的角色大上限；只在调度线程上读取和更新。 */
    private static final int FAILED_ROLE_CACHE_LIMIT = 200;
    /** 读取到期索引，无需查询在线连接。 */
    private final DreamlandRepository repository;
    /** 逐角色调用带有事务和角色锁的业务服务。 */
    private final DreamlandService service;
    /** 以部署游戏时钟推进，隔离测试可修改时刻。 */
    private final GameClock clock;
    /** 测试环境可关闭后台推进，直接调用同一服务验证时序。 */
    private final boolean enabled;
    /** 保存角色最近失败摘要，同一故障只记录一次，恢复后移除。 */
    private final LinkedHashMap<String, String> loggedFailures = new LinkedHashMap<>();

    /** 维护与在线请求使用同一角色状态，不持有会话或战斗对象。 */
    DreamlandMaintenance(DreamlandRepository repository, DreamlandService service, GameClock clock,
                         @Value("${mxzg.dreamland-maintenance.enabled:true}") boolean enabled) {
        this.repository = repository;
        this.service = service;
        this.clock = clock;
        this.enabled = enabled;
    }

    /** 批次时间只查达到索引时刻的角色，实际进度按角色锁内重新读取的时刻推进。 */
    @Scheduled(fixedDelayString = "${mxzg.dreamland-maintenance.interval-millis:2000}",
            initialDelayString = "${mxzg.dreamland-maintenance.interval-millis:2000}")
    void maintain() {
        if (!enabled) {
            return;
        }
        long now = clock.epochSeconds();
        for (String role : repository.due(now, BATCH_SIZE)) {
            try {
                service.advanceDue(role);
                loggedFailures.remove(role);
            } catch (RuntimeException failure) {
                String reason = failure.getClass().getName() + failure.getMessage();
                if (!reason.equals(loggedFailures.put(role, reason))) {
                    LOG.warn("永恒梦境自动推进未提交，角色={}", role, failure);
                }
                if (loggedFailures.size() > FAILED_ROLE_CACHE_LIMIT) {
                    loggedFailures.pollFirstEntry();
                }
            }
        }
    }
}
