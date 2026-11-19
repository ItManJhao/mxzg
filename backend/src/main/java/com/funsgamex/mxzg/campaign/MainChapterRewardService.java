/**
 * 配置化主线首通奖励适配：冻结原首通计划，委托共享可信发奖入口，保留基础到账与升级附赠的完整结果。
 * 由MainChapterService持久结算调用，不注册协议；外层负责鉴权、待领奖凭据和幂等控制。
 */
package com.funsgamex.mxzg.campaign;

import java.util.List;
import java.util.random.RandomGenerator;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.time.GameClock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class MainChapterRewardService {
    /** 读取完整首通目录；实际新挑战范围由同一可信服务端配置独立限制。 */
    private final MainChapterRules rules;
    /** 共用类型校验、实际入账与领域明细，不在首通模块维护第二份分发表。 */
    private final RewardGrantService grants;
    /** 主线结算使用的游戏时钟，确定期限奖励的生效时间。 */
    private final GameClock clock;

    /** 注入发奖时钟并预检开放关卡所需战斗、首通奖励及挂机规则。 */
    public MainChapterRewardService(MainChapterRules rules, RewardGrantService grants, IdleRules idle,
                                    ObjectMapper mapper, GameClock clock) {
        this.rules = rules;
        this.grants = grants;
        this.clock = clock;
        var battle = new HeroBattleChapterScenario(mapper);
        for (int index = 1; index <= rules.challengeLimit(); index++) {
            try {
                // 新胜利提交后首包必须可读；缺挂机投影或战斗依赖时不能靠提高上限绕过缺口。
                idle.stage(index);
                battle.enemies(index);
                grants.requireSupported(rules.stage(index).firstRewards().stream()
                        .map(MainChapterRules.Reward::itemId).toList());
            } catch (RuntimeException error) {
                throw new IllegalStateException("主线开放范围依赖未就绪：" + index, error);
            }
        }
    }

    /**
     * 分发可信待领奖状态对应的原配置奖励，返回实际基础量；满级经验与封顶酒馆量不伪称到账。
     * progress必须由外层从角色持久记录读取；本方法不能独立用于重复请求或玩家领奖协议。
     * 英雄经验沿新版既有900101余额存储；冒险点由酒馆独立领域持久保存并施加旧上限，不开放酒馆任务。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<MainChapterRules.Reward> grant(String roleId, MainChapterRules.Progress progress) {
        return grantPlan(roleId, plan(progress)).items().stream().filter(item -> item.credited() > 0)
                .map(item -> new MainChapterRules.Reward(item.itemId(), item.credited())).toList();
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

    /** 以本次游戏时间消费原奖励计划，调用方在同一事务保存实际发奖结果。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public RewardGrantResult grantPlan(String roleId, Plan plan) {
        return grants.grant(roleId, plan.rewards().stream()
                        .map(reward -> new RewardGrantService.Reward(reward.itemId(), reward.quantity())).toList(),
                new RewardGrantService.Context(clock.epochSeconds(), plan.tavernLimit()),
                RandomGenerator.getDefault());
    }
}
