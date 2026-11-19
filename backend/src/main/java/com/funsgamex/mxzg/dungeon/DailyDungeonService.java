/**
 * 金币副本首关的服务端列表、挑战与扫荡。在同角色锁内执行原战斗、扣费和实际奖励。
 * 发奖随原战报回执返回，资产继续通过统一快照同步，重复提交不再交费或结算。
 */
package com.funsgamex.mxzg.dungeon;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.dungeon.DailyDungeonRepository.Access;
import com.funsgamex.mxzg.dungeon.DailyDungeonRepository.Progress;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleRoundUtils;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.hero.HeroMainPowerService.Measured;
import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DailyDungeonService {
    /** 自然日按区服统一上海时区推算，独立于操作系统默认时区。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 与既有战报解析约定的金币副本首关来源标识。 */
    private static final String REPLAY_SCENARIO = "dungeon:gold:1";
    /** 认证真实角色，角色锁等待完成后重新鉴权。 */
    private final SessionService sessions;
    /** 共用角色行锁、钱包和服务器资产版本。 */
    private final RoleRepository roles;
    /** 持久资格、胜场、战报及幂等记录。 */
    private final DailyDungeonRepository dungeon;
    /** 原关卡配置、每日次数、费用和神职特权。 */
    private final DailyDungeonRules rules;
    /** 历史最高战力用于旧版入场，实时主队伍用于实际战斗。 */
    private final HeroMainPowerService powers;
    /** 由服务器用真实玩家阵容与关卡守军执行战斗。 */
    private final HeroLineupBattleService battles;
    /** 发奖、扣费与版本共用外层事务，发奖表现随原回执交付。 */
    private final RewardGrantService grants;
    /** 每日次数和本次奖励统一以同一游戏时点计算。 */
    private final GameClock clock;

    /** 首关的权威读取结果；power 为历史峰值，nextCostDiamonds 为下一有效次数的原报价。 */
    public record State(int stageId, int titleLanguageId, int wins, int freeLimit, int totalLimit,
                        long nextCostDiamonds, long resetAtSeconds, long power, long requiredPower,
                        boolean cleared, boolean unlocked, boolean canChallenge, List<Reward> rewardPreview) {
        /** 冻结基础奖励预览，零点轮换不覆盖历史回执。 */
        public State {
            rewardPreview = List.copyOf(rewardPreview);
        }
    }

    /** 已提交的冻结战斗或扫荡；失败的战斗没有到账，扫荡没有战报。 */
    public record Challenge(String requestId, String roleId, long assetRevision, String battleId, boolean won,
                            boolean sweep, BattleReplay replay, State state, RewardGrantResult actual) {
        /** 回执模式、胜负、战报与真实发奖必须一致。 */
        public Challenge {
            if (!RewardReceiptPayloads.validId(requestId) || !RewardReceiptPayloads.validId(battleId)
                    || roleId == null || roleId.isBlank() || assetRevision < 0 || state == null
                    || (actual != null) != won || (replay == null) != sweep || (sweep && !won)) {
                throw new IllegalArgumentException("金币副本结算回执不一致");
            }
            if (replay != null && (!REPLAY_SCENARIO.equals(replay.getScenario())
                    || HeroBattleRoundUtils.Outcome.ATTACKER_WIN.name().equals(replay.getOutcome()) != won)) {
                throw new IllegalArgumentException("金币副本战报与回执不一致");
            }
        }
    }

    /** 注入游戏时钟和通用服务，预检全部可能到账的奖励物品。 */
    public DailyDungeonService(SessionService sessions, RoleRepository roles, DailyDungeonRepository dungeon,
                               DailyDungeonRules rules, HeroMainPowerService powers, HeroLineupBattleService battles,
                               RewardGrantService grants, GameClock clock) {
        this.sessions = sessions;
        this.roles = roles;
        this.dungeon = dungeon;
        this.rules = rules;
        this.powers = powers;
        this.battles = battles;
        this.grants = grants;
        this.clock = clock;
        grants.requireSupported(rules.rewardPreview().stream().map(Reward::itemId).toList());
    }

    /** 查询时按游戏时钟的上海零点口径投影当前次数，并观察已有角色最高战力。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State current(String token) {
        String role = lock(token);
        var now = clock.instant();
        return state(dungeon.access(role), roll(dungeon.progress(role), now), powers.observe(role));
    }

    /**
     * 一次请求完成挑战或扫荡及其结算。旧副本胜利才计次数，付费失败仍扣原次报价。
     * 当日次数和实际奖励共享同一次游戏时间采样。
     * @param requestId 结果不明时重发原 UUID，成功和失败的战报结果都可重取
     * @param sweep 已通关后只发奖励，不生成战报
     * @param maxDiamonds 玩家此次确认的最高钻石扣费，报价上涨须重新确认
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Challenge challenge(String token, String requestId, boolean sweep, long maxDiamonds) {
        if (!RewardReceiptPayloads.validId(requestId) || maxDiamonds < 0 || maxDiamonds > 9_007_199_254_740_991L) {
            throw rejected(HttpStatus.BAD_REQUEST, "DUNGEON_REQUEST_INVALID");
        }
        String role = lock(token);
        var saved = dungeon.receipt(role, requestId);
        if (saved != null) {
            if (saved.sweep() != sweep || saved.maxDiamonds() != maxDiamonds) {
                throw rejected(HttpStatus.CONFLICT, "DUNGEON_REQUEST_CONFLICT");
            }
            return saved.result();
        }
        Instant now = clock.instant();
        var access = dungeon.access(role);
        var stored = dungeon.progress(role);
        var progress = roll(stored, now);
        var power = powers.observe(role);
        var before = state(access, progress, power);
        requireAccess(before, power, sweep, maxDiamonds);

        var random = ThreadLocalRandom.current();
        BattleReplay replay = sweep ? null : battle(token, access, random);
        boolean won = sweep || HeroBattleRoundUtils.Outcome.ATTACKER_WIN.name().equals(replay.getOutcome());
        long cost = before.nextCostDiamonds();
        if (cost > 0 && !roles.debitDiamonds(role, cost)) {
            throw rejected(HttpStatus.CONFLICT, "DUNGEON_DIAMONDS");
        }
        RewardGrantResult actual = null;
        if (won) {
            progress = new Progress(progress.wins() + 1, true, progress.resetAtSeconds());
            // 原金币奖励不含酒馆点，和当前主线关卡无关。通用资产事务会自行推送资产变化。
            actual = grants.grant(role, rules.rewards(access.clergy(), random),
                    new RewardGrantService.Context(now.getEpochSecond(), 0), random);
        }
        dungeon.saveProgress(role, stored, progress);
        var result = new Challenge(requestId, role, roles.revision(role), UUID.randomUUID().toString(), won, sweep,
                replay, state(access, progress, power), actual);
        dungeon.saveReceipt(maxDiamonds, result);
        return result;
    }

    /** 把当前角色授权绑定到这次写操作的角色行，防止旧会话继续消费。 */
    private String lock(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        if (!role.equals(sessions.requireRole(token))) {
            throw rejected(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        return role;
    }

    /** 旧服在到点后的第一秒翻日，清扫资格跨日保留。 */
    private static Progress roll(Progress stored, Instant now) {
        if (stored != null && stored.resetAtSeconds() >= now.getEpochSecond()) {
            return stored;
        }
        long reset = now.atZone(SERVER_ZONE).toLocalDate().plusDays(1).atStartOfDay(SERVER_ZONE).toEpochSecond();
        return new Progress(0, stored != null && stored.cleared(), reset);
    }

    /** 将同一角色锁内的旧规则、真实胜场和阵容门槛组合为当前状态。 */
    private State state(Access access, Progress progress, Measured power) {
        int limit = rules.totalLimit(access.vip());
        boolean unlocked = rules.unlocked(access.level());
        boolean available = unlocked && progress.wins() < limit && (progress.cleared() || power.current() > 0)
                && power.maximum() > rules.requiredPower();
        return new State(rules.stageId(), rules.titleLanguageId(), progress.wins(), rules.freeLimit(), limit,
                rules.nextCost(progress.wins(), limit), progress.resetAtSeconds(), power.maximum(), rules.requiredPower(),
                progress.cleared(), unlocked, available, rules.rewardPreview());
    }

    /** 依次核验角色等级、主队、旧历史战力、真实次数、扫荡资格和玩家确认报价。 */
    private static void requireAccess(State state, Measured power, boolean sweep, long maxDiamonds) {
        if (!state.unlocked()) {
            throw rejected(HttpStatus.FORBIDDEN, "DUNGEON_LEVEL");
        }
        if (!sweep && power.current() <= 0) {
            throw rejected(HttpStatus.CONFLICT, "DUNGEON_FORMATION");
        }
        if (state.power() <= state.requiredPower()) {
            throw rejected(HttpStatus.CONFLICT, "DUNGEON_POWER");
        }
        if (state.wins() >= state.totalLimit()) {
            throw rejected(HttpStatus.CONFLICT, "DUNGEON_COUNT");
        }
        if (sweep && !state.cleared()) {
            throw rejected(HttpStatus.CONFLICT, "DUNGEON_SWEEP_LOCKED");
        }
        if (state.nextCostDiamonds() > maxDiamonds) {
            throw rejected(HttpStatus.CONFLICT, "DUNGEON_COST_CHANGED");
        }
    }

    /** 执行并冻结真实战报，未接入的阵容技能显式拒绝且不会产生扣费或发奖。 */
    private BattleReplay battle(String token, Access access, ThreadLocalRandom random) {
        try {
            var result = battles.daily(token, REPLAY_SCENARIO, rules.enemies(),
                    probability -> random.nextDouble() < probability);
            return HeroBattleReplayProtocolUtils.encode(result.battle()).toBuilder()
                    .setAttackerName(access.nickname()).setDefenderName(rules.opponentName()).build();
        } catch (IllegalArgumentException failure) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "DUNGEON_BATTLE_UNAVAILABLE", failure);
        }
    }

    /** 返回现有 WS 错误边界识别的明确业务拒绝码。 */
    private static ResponseStatusException rejected(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
