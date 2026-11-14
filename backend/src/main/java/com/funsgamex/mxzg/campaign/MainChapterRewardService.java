/**
 * 前三关首通奖励适配：冻结原首通计划，委托共享可信发奖入口，返回当前协议所需实际基础奖励。
 * 由MainChapterService持久结算调用，不注册协议；外层负责鉴权、待领奖凭据和幂等控制。
 */
package com.funsgamex.mxzg.campaign;

import java.time.Instant;
import java.util.List;
import java.util.random.RandomGenerator;
import com.funsgamex.mxzg.reward.RewardGrantService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MainChapterRewardService {
    /** 只接受已核验前三关的首通奖励，不收客户端奖励清单。 */
    private final MainChapterRules rules;
    /** 共用类型校验、实际入账与领域明细，不在首通模块维护第二份分发表。 */
    private final RewardGrantService grants;

    /** 预检同源前三关奖励的支持能力，不在此保存第二份类型索引。 */
    public MainChapterRewardService(MainChapterRules rules, RewardGrantService grants) {
        this.rules = rules;
        this.grants = grants;
        for (int index = 1; index <= 3; index++) {
            grants.requireSupported(rules.stage(index).firstRewards().stream()
                    .map(MainChapterRules.Reward::itemId).toList());
        }
    }

    /**
     * 分发可信待领奖状态对应的原配置奖励，返回实际基础量；满级经验与封顶酒馆量不伪称到账。
     * progress必须由外层从角色持久记录读取；本方法不能独立用于重复请求或玩家领奖协议。
     * 英雄经验沿新版既有900101余额存储；酒馆点沿900401余额存储并施加旧上限，不开放酒馆。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<MainChapterRules.Reward> grant(String roleId, MainChapterRules.Progress progress) {
        return grantPlan(roleId, plan(progress));
    }

    /** 持久战报冻结的首通奖励与酒馆上限；重试不能重新读取已变化的奖励配置。 */
    public record Plan(List<MainChapterRules.Reward> rewards, long tavernLimit) {
        /** 冻结清单，拒绝负上限。 */
        public Plan {
            rewards = List.copyOf(rewards);
            if (tavernLimit < 0) {
                throw new IllegalArgumentException("酒馆上限无效");
            }
        }
    }

    /** 在生成权威战报时保存原奖励配置，无待领奖时计划为空。 */
    public Plan plan(MainChapterRules.Progress progress) {
        return new Plan(rules.pendingRewards(progress), rules.tavernLimit(progress.maxCleared()));
    }

    /** 仅消费服务端持久战报中的奖励计划，调用方须已核对归属、胜利和未结算凭据。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<MainChapterRules.Reward> grantPlan(String roleId, Plan plan) {
        var result = grants.grant(roleId, plan.rewards().stream()
                        .map(reward -> new RewardGrantService.Reward(reward.itemId(), reward.quantity())).toList(),
                new RewardGrantService.Context(Instant.now().getEpochSecond(), plan.tavernLimit()),
                RandomGenerator.getDefault());
        // 当前主线协议仍保留基础奖励和独立经验动画，升级赠钻实际发放但不冒充基础奖励。
        return result.items().stream().filter(item -> item.credited() > 0)
                .map(item -> new MainChapterRules.Reward(item.itemId(), item.credited())).toList();
    }
}
