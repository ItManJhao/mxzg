/**
 * 日常副本的权威列表、挑战与扫荡。各类型分别推进通关与每日胜场，同类各关共用次数。
 * 发奖随原战报回执返回，资产继续通过统一快照同步，重复提交不再交费或结算。
 */
package com.funsgamex.mxzg.dungeon;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.dungeon.DailyDungeonRepository.Access;
import com.funsgamex.mxzg.dungeon.DailyDungeonRepository.Progress;
import com.funsgamex.mxzg.dungeon.DailyDungeonRules.Rules;
import com.funsgamex.mxzg.dungeon.DailyDungeonRules.Stage;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleRoundUtils;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.hero.HeroMainPowerService.Measured;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DailyDungeonService {
    /** 自然日按区服统一上海时区推算，独立于操作系统默认时区。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
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
    /** 新结算随事务提交更新快照，保障未扣费且未发奖的败局也能刷新参与进度。 */
    private final AssetSyncService assetSync;
    /** 每日次数和本次奖励统一以同一游戏时点计算。 */
    private final GameClock clock;
    /** 一次新挑战或扫荡结算后，同步发布真实参与进度。 */
    private final ApplicationEventPublisher events;

    /** 一个关卡的展示与资格，从历史通关和角色真实等级、战力构成。 */
    public record StageState(int stageId, int titleLanguageId, int minimumLevel, long requiredPower,
                             boolean cleared, boolean unlocked, boolean canChallenge, List<Reward> rewardPreview,
                             int ribbon) {
        /** 冻结该关配置奖品，不让回执读取当前配置重算。 */
        public StageState {
            rewardPreview = List.copyOf(rewardPreview);
        }
    }

    /** 当前或冻结的日常副本视图，胜场、报价和历史战力在同类关卡共享。 */
    public record State(int stageId, int titleLanguageId, int wins, int freeLimit, int totalLimit,
                        long nextCostDiamonds, long resetAtSeconds, long power, long requiredPower,
                        boolean cleared, boolean unlocked, boolean canChallenge, List<Reward> rewardPreview,
                        List<StageState> stages) {
        /** 冻结展示状态，兼容旧首关历史回执没有关卡列表。 */
        public State {
            rewardPreview = List.copyOf(rewardPreview);
            stages = stages == null ? List.of() : List.copyOf(stages);
        }
    }

    /** 已提交的冻结战斗或扫荡，类型来自接入协议，回放需与类型、关卡和胜负一致。 */
    public record Challenge(String requestId, DailyDungeonType type, String roleId, long assetRevision,
                            String battleId, boolean won, boolean sweep, BattleReplay replay, State state,
                            RewardGrantResult actual) {
        /** 校验回执类型、模式、胜负、战报与真实发奖的关系，拒绝损坏结果。 */
        public Challenge {
            if (!RewardReceiptPayloads.validId(requestId) || !RewardReceiptPayloads.validId(battleId)
                    || type == null || roleId == null || roleId.isBlank() || assetRevision < 0 || state == null
                    || (actual != null) != won || (replay == null) != sweep || (sweep && !won)) {
                throw new IllegalArgumentException("日常副本结算回执不一致");
            }
            if (replay != null && (!type.scenario(state.stageId()).equals(replay.getScenario())
                    || HeroBattleRoundUtils.Outcome.ATTACKER_WIN.name().equals(replay.getOutcome()) != won)) {
                throw new IllegalArgumentException("日常副本战报与回执不一致");
            }
        }
    }

    /** 注入游戏时钟和通用服务，预检全部奖励，并复用提交后的统一快照同步。 */
    public DailyDungeonService(SessionService sessions, RoleRepository roles, DailyDungeonRepository dungeon,
                               DailyDungeonRules rules, HeroMainPowerService powers, HeroLineupBattleService battles,
                               RewardGrantService grants, AssetSyncService assetSync, GameClock clock,
                               ApplicationEventPublisher events) {
        this.sessions = sessions;
        this.roles = roles;
        this.dungeon = dungeon;
        this.rules = rules;
        this.powers = powers;
        this.battles = battles;
        this.grants = grants;
        this.assetSync = assetSync;
        this.clock = clock;
        this.events = events;
        grants.requireSupported(Arrays.stream(DailyDungeonType.values()).flatMap(type -> rules.get(type).stages().stream())
                .flatMap(stage -> stage.rewardPreview().stream())
                .map(Reward::itemId).distinct().toList());
    }

    /** 查询本类型的上海日进度与最高战力，协议顶层仍对应第 1 关。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State current(String token, DailyDungeonType type) {
        String role = lock(token);
        var now = clock.instant();
        return state(rules.get(type), 1, dungeon.access(role), roll(dungeon.progress(role, type), now), powers.observe(role));
    }

    /**
     * 一次请求完成挑战或扫荡及其结算。每日次数按胜场计，付费失败仍扣原次报价。
     * 当日次数和实际奖励共享同一次游戏时间采样，任务累计参与按提交后的回执计算。
     * @param type 从实际协议入口决定的副本类型，绑定独立进度和本次奖励
     * @param requestId 结果不明时重发原 UUID，成功和失败的战报结果都可重取
     * @param stageId 选择的实际关卡，进入前按该类型的服务端关卡目录校验
     * @param sweep 已通关后只发奖励，不生成战报
     * @param maxDiamonds 玩家此次确认的最高钻石扣费，报价上涨须重新确认
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Challenge challenge(String token, DailyDungeonType type, String requestId, int stageId,
                               boolean sweep, long maxDiamonds) {
        if (!RewardReceiptPayloads.validId(requestId) || stageId < 1
                || maxDiamonds < 0 || maxDiamonds > 9_007_199_254_740_991L) {
            throw rejected(HttpStatus.BAD_REQUEST, "DUNGEON_REQUEST_INVALID");
        }
        String role = lock(token);
        var saved = dungeon.receipt(role, requestId);
        if (saved != null) {
            if (saved.result().type() != type || saved.result().state().stageId() != stageId
                    || saved.sweep() != sweep || saved.maxDiamonds() != maxDiamonds) {
                throw rejected(HttpStatus.CONFLICT, "DUNGEON_REQUEST_CONFLICT");
            }
            return saved.result();
        }
        var selectedRules = rules.get(type);
        if (stageId > selectedRules.stages().size()) {
            throw rejected(HttpStatus.FORBIDDEN, "DUNGEON_STAGE");
        }
        var stage = selectedRules.stages().get(stageId - 1);
        Instant now = clock.instant();
        var access = dungeon.access(role);
        var stored = dungeon.progress(role, type);
        var progress = roll(stored, now);
        var power = powers.observe(role);
        var before = state(selectedRules, stageId, access, progress, power);
        requireAccess(before, access.level(), stage.minimumLevel(), power, sweep, maxDiamonds);

        var random = ThreadLocalRandom.current();
        BattleReplay replay = sweep ? null : battle(token, type, access, stage, random);
        boolean won = sweep || HeroBattleRoundUtils.Outcome.ATTACKER_WIN.name().equals(replay.getOutcome());
        long cost = before.nextCostDiamonds();
        if (cost > 0 && !roles.debitDiamonds(role, cost)) {
            throw rejected(HttpStatus.CONFLICT, "DUNGEON_DIAMONDS");
        }
        RewardGrantResult actual = null;
        if (won) {
            progress = new Progress(progress.wins() + 1, Math.max(progress.highestCleared(), stageId), progress.resetAtSeconds());
            // 当前日常副本奖励不读取主线进度。通用资产事务会自行推送资产变化。
            actual = grants.grant(role, selectedRules.rewards(stage, access.clergy(), random),
                    new RewardGrantService.Context(now.getEpochSecond(), 0), random);
        }
        dungeon.saveProgress(role, type, stored, progress);
        // 免费败局也改变累计参与进度；与扣费、发奖共用一次版本更新，提交后才推送。
        assetSync.changed(role);
        var result = new Challenge(requestId, type, role, roles.revision(role), UUID.randomUUID().toString(), won, sweep,
                replay, state(selectedRules, stageId, access, progress, power), actual);
        dungeon.saveReceipt(maxDiamonds, result);
        events.publishEvent(new QuestProgressEvent(role, QuestMetric.DAILY_DUNGEON_CHALLENGE, 0, 1));
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
        return new Progress(0, stored == null ? 0 : stored.highestCleared(), reset);
    }

    /** 将指定类型规则、角色真实胜场和阵容门槛组合为同一版本状态。 */
    private static State state(Rules selectedRules, int stageId, Access access, Progress progress, Measured power) {
        int limit = selectedRules.totalLimit(access.vip());
        var stages = selectedRules.stages().stream()
                .map(stage -> stageState(stage, access.level(), progress, power, limit)).toList();
        var selected = stages.get(stageId - 1);
        return new State(stageId, selected.titleLanguageId(), progress.wins(), selectedRules.freeLimit(), limit,
                selectedRules.nextCost(progress.wins(), limit), progress.resetAtSeconds(), power.maximum(), selected.requiredPower(),
                selected.cleared(), selected.unlocked(), selected.canChallenge(), selected.rewardPreview(), stages);
    }

    /** 旧版顺序只允许挑战下一关或重打已过关卡，扫荡资格由 cleared 独立表示。 */
    private static StageState stageState(Stage stage, int level, Progress progress, Measured power, int limit) {
        boolean cleared = stage.id() <= progress.highestCleared();
        boolean unlocked = level >= stage.minimumLevel() && stage.id() - 1 <= progress.highestCleared();
        boolean available = unlocked && progress.wins() < limit && (cleared || power.current() > 0)
                && power.maximum() > stage.requiredPower();
        return new StageState(stage.id(), stage.titleLanguageId(), stage.minimumLevel(), stage.requiredPower(),
                cleared, unlocked, available, stage.rewardPreview(), stage.ribbon());
    }

    /** 核验等级、主队与旧历史战力，前关未通过不能消耗本关次数。 */
    private static void requireAccess(State state, int level, int minimumLevel, Measured power,
                                      boolean sweep, long maxDiamonds) {
        if (level < minimumLevel) {
            throw rejected(HttpStatus.FORBIDDEN, "DUNGEON_LEVEL");
        }
        if (!sweep && power.current() <= 0) {
            throw rejected(HttpStatus.CONFLICT, "DUNGEON_FORMATION");
        }
        if (state.power() <= state.requiredPower()) {
            throw rejected(HttpStatus.CONFLICT, "DUNGEON_POWER");
        }
        if (!state.unlocked()) {
            throw rejected(HttpStatus.CONFLICT, "DUNGEON_PREVIOUS_STAGE");
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

    /** 按副本类型与关卡执行并冻结真实战报，战斗拒绝时事务尚未扣费或发奖。 */
    private BattleReplay battle(String token, DailyDungeonType type, Access access, Stage stage, ThreadLocalRandom random) {
        try {
            var result = battles.daily(token, type.scenario(stage.id()), stage.enemies(),
                    probability -> random.nextDouble() < probability);
            return HeroBattleReplayProtocolUtils.encode(result.battle()).toBuilder()
                    .setAttackerName(access.nickname()).setDefenderName(stage.opponentName()).build();
        } catch (IllegalArgumentException failure) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "DUNGEON_BATTLE_UNAVAILABLE", failure);
        }
    }

    /** 返回现有 WS 错误边界识别的明确业务拒绝码。 */
    private static ResponseStatusException rejected(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
