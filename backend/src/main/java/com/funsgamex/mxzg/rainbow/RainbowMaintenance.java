/**
 * 彩虹圣殿的离线到期处理及邮件投递。每个区服释放和每封邮件使用各自事务，
 * 轮询不依赖占位人登录，暂时投递失败的邮件保留在数据库。
 */
package com.funsgamex.mxzg.rainbow;

import com.funsgamex.mxzg.time.GameClock;
import java.util.LinkedHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class RainbowMaintenance {
    /** 集中记录到期事务与投递异常。 */
    private static final Logger LOG = LoggerFactory.getLogger(RainbowMaintenance.class);
    /** 单轮最多处理的待发邮件数量。 */
    private static final int NOTICE_LIMIT = 50;

    /** 待处理区服及邮件的持久索引。 */
    private final RainbowRepository repository;
    /** 每次调用经过 Spring 事务代理提交。 */
    private final RainbowService service;
    /** 与玩家在线挑战使用同一个游戏时钟。 */
    private final GameClock clock;
    /** 专项测试可停轮询并直接调用到期事务。 */
    private final boolean enabled;
    /** 上次邮件扫描游标，读到末尾时归零。 */
    private String afterNotice = "";
    /** 区服或邮件键到最后一次错误摘要，避免满邮箱每轮刷日志。 */
    private final LinkedHashMap<String, String> failures = new LinkedHashMap<>();

    /** 注入共享事务服务和时钟；默认运行后台离线维护。 */
    RainbowMaintenance(RainbowRepository repository, RainbowService service, GameClock clock,
                       @Value("${mxzg.rainbow-maintenance.enabled:true}") boolean enabled) {
        this.repository = repository;
        this.service = service;
        this.clock = clock;
        this.enabled = enabled;
    }

    /** 先释放自然到期的神位，再尝试发送已提交的占位变化邮件。 */
    @Scheduled(fixedDelayString = "${mxzg.rainbow-maintenance.interval-millis:5000}",
            initialDelayString = "${mxzg.rainbow-maintenance.interval-millis:5000}")
    void settle() {
        if (!enabled) {
            return;
        }
        for (String server : repository.dueServers(clock.instant().toEpochMilli())) {
            run("区服 " + server, () -> service.releaseExpired(server));
        }
        var notices = repository.noticeIds(afterNotice, NOTICE_LIMIT);
        afterNotice = notices.size() == NOTICE_LIMIT ? notices.getLast() : "";
        for (String id : notices) {
            run("邮件 " + id, () -> service.deliverNotice(id));
        }
    }

    /** 单次失败不阻塞后续任务，仍保留失败原因和有限的去重信息。 */
    private void run(String source, Runnable action) {
        try {
            action.run();
            failures.remove(source);
        } catch (RuntimeException failure) {
            String reason = failure.getClass().getName() + failure.getMessage();
            if (!reason.equals(failures.put(source, reason))) {
                LOG.warn("彩虹圣殿后台结算未提交：{}", source, failure);
            }
            if (failures.size() > 200) {
                failures.pollFirstEntry();
            }
        }
    }
}
