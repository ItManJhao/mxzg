/**
 * 勇者试炼助战邮件定时结算。不依赖派遣角色在线，逐角色提交，
 * 失败的角色下一轮重试而不影响其他角色。
 */
package com.funsgamex.mxzg.trial;

import com.funsgamex.mxzg.time.GameClock;
import java.util.LinkedHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class TrialAssistMaintenance {
    /** 定时任务的失败只在这里集中报告。 */
    private static final Logger LOG = LoggerFactory.getLogger(TrialAssistMaintenance.class);
    /** 到期角色读取索引。 */
    private final TrialRepository repository;
    /** 以独立角色事务投递邮件。 */
    private final TrialService service;
    /** 和在线试炼共用同一玩法时钟。 */
    private final GameClock clock;
    /** 隔离测试可关闭时钟轮询，直接调用真实投递事务。 */
    private final boolean enabled;
    /** 本轮上一次看过的角色 ID，空字符串表示从头扫描。 */
    private String afterRole = "";
    /** 角色 ID 到最近错误原因，仅在定时任务线程写入并限制缓存大小。 */
    private final LinkedHashMap<String, String> failures = new LinkedHashMap<>();

    /** 装配角色查询、邮件结算服务及当前区服玩法时钟。 */
    TrialAssistMaintenance(TrialRepository repository, TrialService service, GameClock clock,
                           @Value("${mxzg.trial-maintenance.enabled:true}") boolean enabled) {
        this.repository = repository;
        this.service = service;
        this.clock = clock;
        this.enabled = enabled;
    }

    /** 扫描已到期未发的 50 个角色，失败与成功的结果各自隔离。 */
    @Scheduled(fixedDelayString = "${mxzg.trial-maintenance.interval-millis:60000}",
            initialDelayString = "${mxzg.trial-maintenance.interval-millis:60000}")
    void settle() {
        if (!enabled) {
            return;
        }
        var roles = repository.dueAssistRoles(clock.epochSeconds(), afterRole, 50);
        afterRole = roles.size() == 50 ? roles.getLast() : "";
        for (var role : roles) {
            try {
                service.mailAssistRewards(role);
                failures.remove(role);
            } catch (RuntimeException failure) {
                String reason = failure.getClass().getName() + failure.getMessage();
                if (!reason.equals(failures.put(role, reason))) {
                    LOG.warn("勇者试炼好友支援奖励邮件未提交，角色={}", role, failure);
                }
                if (failures.size() > 200) {
                    failures.pollFirstEntry();
                }
            }
        }
    }
}
