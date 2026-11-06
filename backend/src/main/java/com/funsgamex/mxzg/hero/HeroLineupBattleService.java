/**
 * 持久主线阵容的只读战斗审计：鉴权读取同一版本输入，再在独立内存中执行前三关。
 * 由受开发开关保护的battle.preview调用，不修改通关、奖励、阵容或英雄；未恢复属性以pending明确返回。
 */
package com.funsgamex.mxzg.hero;

import java.util.List;
import java.util.function.DoublePredicate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
public class HeroLineupBattleService {
    /** 同一角色锁内读取的持久阵容与资产版本，服务端决定角色归属。 */
    private final HeroBattleInputService inputs;
    /** 无跨场可变状态的现有战斗执行器，不复制伤害和技能逻辑。 */
    private final HeroBattleChapterScenario battles;

    /** 审计结果保留输入版本及覆盖缺口，不能冒充完整主线结算。 */
    public record Preview(long assetRevision, long lineupVersion, int formationId,
                          List<String> pending, HeroBattleChapterScenario.Result battle) {
        /** 缺口列表不可被调用方修改。 */
        public Preview {
            pending = List.copyOf(pending);
        }
    }

    /** 注入鉴权读取口和同源配置；不持有客户端提交的阵容或属性。 */
    public HeroLineupBattleService(HeroBattleInputService inputs, ObjectMapper mapper) {
        this.inputs = inputs;
        this.battles = new HeroBattleChapterScenario(mapper);
    }

    /**
     * 读取当前角色真实阵容并运行独立战场；未知技能明确失败，禁止静默删技能。
     * decision由调用方提供；开发请求保留概率待审，独立测试可固定分支，不伪称原随机算法已验收。
     */
    public Preview preview(String token, int mission, DoublePredicate decision) {
        if (mission < 1 || mission > 3) {
            throw new IllegalArgumentException("只读审计仅支持第一章前三关");
        }
        var input = inputs.current(token);
        var report = battles.runSavedFormation(mission, input, decision);
        HeroBattleReplayUtils.validate(report);
        return new Preview(input.assetRevision(), input.lineupVersion(), input.formationId(), input.pending(), report);
    }
}
