/**
 * 持久阵容的只读战斗入口：鉴权读取同一版本输入，按相应玩法的配置执行。
 * 战斗本身不修改通关、奖励或阵容；领域服务在外层事务决定结算。
 */
package com.funsgamex.mxzg.hero;

import java.util.List;
import java.util.Map;
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
    public Preview preview(String token, int stageIndex, DoublePredicate decision) {
        var input = inputs.current(token);
        var report = battles.runSavedFormation(stageIndex, input, decision);
        HeroBattleReplayUtils.validate(report);
        return new Preview(input.assetRevision(), input.lineupVersion(), input.formationId(), input.pending(), report);
    }

    /** 日常副本用同一持久主阵容与真实守军执行并检验完整战报。 */
    public Preview daily(String token, String scenario, List<HeroBattleChapterScenario.ConfiguredEnemy> enemies,
                         DoublePredicate decision) {
        return configured(scenario, inputs.current(token), enemies, decision);
    }

    /** 幻境之塔等玩法提交已经鉴权读取的指定阵容，按普通回合规则执行并校验战报。 */
    public Preview configured(String scenario, HeroBattleInputService.Input input,
                              List<HeroBattleChapterScenario.ConfiguredEnemy> enemies, DoublePredicate decision) {
        var report = battles.runDailyFormation(scenario, input, enemies, decision);
        return validate(input, report);
    }

    /** 永恒梦境开始时冻结攻方阵容，随后不再查询可能已经升级或替换的英雄。 */
    public List<HeroBattleChapterScenario.Unit> freezeDreamlandFormation(HeroBattleInputService.Input input) {
        return battles.freezeDreamlandFormation(input);
    }

    /** 永恒梦境按类型 11 执行当前楼层，生成真实战报及续战状态。 */
    public HeroBattleChapterScenario.DreamlandResult dreamland(int floor,
            List<HeroBattleChapterScenario.Unit> attacker, List<HeroBattleChapterScenario.ConfiguredEnemy> enemies,
            Map<Integer, Long> remainingHp, Map<Integer, Map<Integer, Integer>> effectUses,
            int buffAttribute, long buffValue, DoublePredicate decision) {
        var result = battles.runDreamlandFormation(floor, attacker, enemies, remainingHp, effectUses,
                buffAttribute, buffValue, decision);
        HeroBattleReplayUtils.validate(result.report());
        return result;
    }

    /** 保存首次匹配到的试炼守方阵容，无论真人后来如何改阵都使用该快照。 */
    public List<HeroBattleChapterScenario.Unit> freezeTrialDefense(HeroBattleInputService.Input defender,
            List<HeroBattleChapterScenario.ConfiguredEnemy> robots) {
        return battles.freezeTrialDefense(defender, robots);
    }

    /** 计算试炼守方预览面板及当前剩余生命。 */
    public List<HeroBattleChapterScenario.Unit> trialDefensePanel(List<HeroBattleChapterScenario.Unit> defense,
            Map<Integer, Long> health) {
        return battles.trialDefensePanel(defense, health);
    }

    /** 保留原匹配名单，只有所有守方技能都可执行时允许挑战。 */
    public boolean trialDefenseReady(List<HeroBattleChapterScenario.Unit> defense) {
        return battles.trialDefenseGaps(defense).isEmpty();
    }

    /** 试炼在同一关内保留守军生命，并以当前已保存阵容读取攻方续战生命。 */
    public HeroBattleChapterScenario.Result trial(String scenario, HeroBattleInputService.Input attacker,
            List<HeroBattleChapterScenario.Unit> defender, Map<Integer, Long> health,
            int rounds, DoublePredicate decision) {
        var result = battles.runTrialFormation(scenario, attacker, defender, health, rounds, decision);
        HeroBattleReplayUtils.validate(result);
        return result;
    }

    /** 竞技场沿用持久主阵容，并根据旧配置给存活双方追加每回合攻击倍率。 */
    public Preview arena(String token, String scenario, List<HeroBattleChapterScenario.ConfiguredEnemy> enemies,
                         Map<Integer, Long> attackRates, DoublePredicate decision) {
        var input = inputs.current(token);
        var report = battles.runArenaFormation(scenario, input, enemies, attackRates, decision);
        return validate(input, report);
    }

    /** 竞技场事务已锁定双方角色，使用当时的攻防持久阵容生成一份双方共用的战报。 */
    public Preview arena(String scenario, HeroBattleInputService.Input attacker, HeroBattleInputService.Input defender,
                         Map<Integer, Long> attackRates, DoublePredicate decision) {
        var report = battles.runArenaFormation(scenario, attacker, defender, attackRates, decision);
        return validate(attacker, report);
    }

    /** 配置机器人列表使用真实守军的开战属性计算战力，禁止根据角色等级伪造战力。 */
    public int configuredPower(List<HeroBattleChapterScenario.ConfiguredEnemy> enemies, HeroPowerRules powers) {
        return battles.configuredPower(enemies, powers);
    }

    /** 确保不同玩法返回同样完整的战报与其阵容输入版本。 */
    private static Preview validate(HeroBattleInputService.Input input, HeroBattleChapterScenario.Result report) {
        HeroBattleReplayUtils.validate(report);
        return new Preview(input.assetRevision(), input.lineupVersion(), input.formationId(), input.pending(), report);
    }
}
