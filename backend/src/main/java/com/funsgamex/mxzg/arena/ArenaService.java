/**
 * 新手竞技场从配置机器人名单到真实对战、历史战报与奖励的完整事务。
 * 服务端持有候选、积分和计数；场次、消耗与发奖同提交，重发原请求可恢复冻结结果。
 */
package com.funsgamex.mxzg.arena;

import com.funsgamex.mxzg.arena.ArenaRepository.Progress;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleRoundUtils.Outcome;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroPowerRules;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ArenaService {
    /** 旧免费次数按区服自然日重置，时间统一用上海时区。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 统一会话验证，等待数据库角色锁后仍须确认连接身份。 */
    private final SessionService sessions;
    /** 角色锁、当前积分、钻石和资产版本使用共用角色持久层。 */
    private final RoleRepository roles;
    /** 竞技场对手、进度和历史回执的唯一持久入口。 */
    private final ArenaRepository repository;
    /** 原竞技场配置、胜场积分公式和奖励抽样。 */
    private final ArenaRules rules;
    /** 服务端读取真实进攻阵容，执行原机器人守军的战斗。 */
    private final HeroLineupBattleService battles;
    /** 当前竞技场门票使用已有普通库存。 */
    private final InventoryService inventory;
    /** 一次真实奖励和门票发放都使用通用发奖事务。 */
    private final RewardGrantService grants;
    /** 同一次结算无论胜负都推进参与任务快照。 */
    private final AssetSyncService sync;
    /** 提供同一操作的计次、结算及回执时间。 */
    private final GameClock clock;
    /** 消费成功的新结算回执及真实竞技场积分，由任务领域同步刷新。 */
    private final ApplicationEventPublisher events;
    /** 按机器人编号缓存与战场配置同源的静态展示数据。 */
    private final Map<Integer, Opponent> opponentsById;

    /** 旧竞技场候选对手的资料；id 为机器人阵容配置编号。 */
    public record Opponent(int id, String name, int level, int score, long power, int avatarId) {}

    /** 原场次的战报编号、对手、胜负和积分差，历史显示按实际提交时点冻结。 */
    public record History(String battleId, int opponentId, String opponentName, boolean won, int scoreDelta,
                          long settledAtSeconds) {}

    /** 当前积分、次数、门票信息及可挑战的持久名单；回执内也可冻结同一状态。 */
    public record State(int score, int freeRemaining, int robotWins, int settledChallenges, long resetAtSeconds,
                        boolean newcomerActive, List<Opponent> opponents, List<History> history,
                        long ticketBalance, int ticketPriceDiamonds) {
        /** 冻结名单和战斗历史，回执写入后不会受后续刷新改动。 */
        public State {
            opponents = List.copyOf(opponents);
            history = List.copyOf(history);
        }
    }

    /** 原挑战的权威结果、战报和实际到账；requestId 用于安全重发。 */
    public record Challenge(String requestId, String roleId, long assetRevision, History record, BattleReplay replay,
                            State state, RewardGrantResult actual) {
        /** 核对同一角色、对手、胜负和战斗结算，禁止恢复错场次的奖励或战报。 */
        public Challenge {
            if (!RewardReceiptPayloads.validId(requestId) || !RewardReceiptPayloads.validId(record.battleId())
                    || assetRevision <= 0 || !roleId.equals(actual.roleId()) || state.history().isEmpty()
                    || !state.history().getFirst().equals(record)
                    || !replay.getScenario().equals(scenario(record.opponentId()))
                    || !replay.getDefenderName().equals(record.opponentName())
                    || Outcome.ATTACKER_WIN.name().equals(replay.getOutcome()) != record.won()) {
                throw new IllegalArgumentException("竞技场战报与结算回执不一致");
            }
        }
    }

    /** 门票购买的真实数量、钻石费用和到账结果；最终余额从统一资产快照刷新。 */
    public record TicketPurchase(String requestId, String roleId, long assetRevision, int quantity,
                                 long spentDiamonds, RewardGrantResult actual) {
        /** 校验历史购买确实发放本次请求的门票且属于当前角色。 */
        public TicketPurchase {
            if (!RewardReceiptPayloads.validId(requestId) || assetRevision <= 0 || quantity <= 0
                    || spentDiamonds <= 0 || !roleId.equals(actual.roleId()) || actual.items().size() != 1
                    || actual.items().getFirst().itemId() != ArenaRules.TICKET_ID
                    || actual.items().getFirst().credited() != quantity) {
                throw new IllegalArgumentException("竞技场门票回执不一致");
            }
        }
    }

    /** 注入领域服务，预检可能到账的物品并从原守军属性计算所有机器人战力。 */
    ArenaService(SessionService sessions, RoleRepository roles, ArenaRepository repository, ArenaRules rules,
                 HeroLineupBattleService battles, HeroPowerRules powers, InventoryService inventory,
                 RewardGrantService grants, AssetSyncService sync, GameClock clock, ApplicationEventPublisher events) {
        this.sessions = sessions;
        this.roles = roles;
        this.repository = repository;
        this.rules = rules;
        this.battles = battles;
        this.inventory = inventory;
        this.grants = grants;
        this.sync = sync;
        this.clock = clock;
        this.events = events;
        grants.requireSupported(List.of(ArenaRules.TICKET_ID));
        grants.requireSupported(rules.config().rewards().stream().flatMap(drop -> drop.items().stream())
                .map(Reward::itemId).distinct().toList());
        var catalog = new HashMap<Integer, Opponent>();
        for (var bot : rules.config().bots()) {
            catalog.put(bot.id(), new Opponent(bot.id(), bot.name(), bot.level(), bot.score(),
                    battles.configuredPower(bot.enemies(), powers), bot.avatarId()));
        }
        opponentsById = Map.copyOf(catalog);
    }

    /** 进入竞技场，首次在角色行锁内生成旧版三个候选，重进或重连复用持久名单。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State current(String token) {
        return view(token, false);
    }

    /** 刷新旧名单只重抽候选，不扣货币、不分配场次、不修改已有挑战。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State refresh(String token) {
        return view(token, true);
    }

    /** 执行一次已选机器人的真实对战，在同一个角色事务中完成消耗、积分、奖励和场次。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Challenge challenge(String token, String requestId, int opponentId) {
        if (!RewardReceiptPayloads.validId(requestId) || opponentId <= 0) {
            throw rejected(HttpStatus.BAD_REQUEST, "ARENA_REQUEST_INVALID");
        }
        var role = lock(token);
        var saved = repository.receipt(role.id(), requestId);
        if (saved != null) {
            if (saved.record().opponentId() != opponentId) {
                throw rejected(HttpStatus.CONFLICT, "ARENA_REQUEST_CONFLICT");
            }
            return saved;
        }
        requireLevel(role);
        var now = clock.instant();
        var stored = repository.progress(role.id());
        var progress = dayProgress(stored, now);
        requireNewcomer(progress);
        if (!progress.opponents().contains(opponentId)) {
            throw rejected(HttpStatus.CONFLICT, "ARENA_OPPONENT");
        }
        if (progress.dailyChallenges() >= rules.config().freeLimit()
                && !inventory.debit(role.id(), ArenaRules.TICKET_ID, 1)) {
            throw rejected(HttpStatus.CONFLICT, "ARENA_TICKETS");
        }

        var random = ThreadLocalRandom.current();
        var bot = rules.bot(opponentId);
        var replay = battle(token, role, bot, random);
        boolean won = Outcome.ATTACKER_WIN.name().equals(replay.getOutcome());
        int scoreDelta = won ? rules.scoreGain(role.basics().cup(), bot.score()) : 0;
        int score = Math.addExact(role.basics().cup(), scoreDelta);
        if (won) {
            roles.setArenaScore(role.id(), score);
        }
        int wins = progress.robotWins() + (won ? 1 : 0);
        int total = Math.incrementExact(progress.settledChallenges());
        var latest = new Progress(wins, total, Math.incrementExact(progress.dailyChallenges()),
                progress.resetAtSeconds(), wins < rules.config().newcomerWins() ? progress.opponents() : List.of());
        repository.saveProgress(role.id(), stored, latest);
        sync.changed(role.id());

        var actual = grants.grant(role.id(), rules.rewards(repository.clergyLevel(role.id()), random),
                new RewardGrantService.Context(now.getEpochSecond(), 0), random);
        var record = new History(UUID.randomUUID().toString(), opponentId, bot.name(), won, scoreDelta,
                now.getEpochSecond());
        var history = new java.util.ArrayList<History>();
        history.add(record);
        history.addAll(repository.history(role.id(), rules.config().historyLimit() - 1));
        var result = new Challenge(requestId, role.id(), roles.revision(role.id()), record, replay,
                state(role.id(), score, latest, history), actual);
        repository.saveChallenge(result);
        events.publishEvent(new QuestProgressEvent(role.id(), QuestMetric.ARENA_CHALLENGE));
        events.publishEvent(new QuestProgressEvent(role.id(), QuestMetric.ARENA_SCORE));
        return result;
    }

    /** 恢复属于当前角色的旧战报，不重复播放结算或发放奖励。 */
    @Transactional(readOnly = true, isolation = Isolation.READ_COMMITTED)
    public BattleReplay replay(String token, String battleId) {
        if (!RewardReceiptPayloads.validId(battleId)) {
            throw rejected(HttpStatus.BAD_REQUEST, "ARENA_REQUEST_INVALID");
        }
        var result = repository.byBattle(sessions.requireRole(token), battleId);
        if (result == null) {
            throw rejected(HttpStatus.NOT_FOUND, "ARENA_REPORT");
        }
        return result.replay();
    }

    /** 按原固定单价购买正整数门票，扣钻和发放同一事务，旧购买回执可安全重取。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TicketPurchase buyTickets(String token, String requestId, int quantity) {
        if (!RewardReceiptPayloads.validId(requestId) || quantity <= 0) {
            throw rejected(HttpStatus.BAD_REQUEST, "ARENA_REQUEST_INVALID");
        }
        var role = lock(token);
        var saved = repository.ticketReceipt(role.id(), requestId);
        if (saved != null) {
            if (saved.quantity() != quantity) {
                throw rejected(HttpStatus.CONFLICT, "ARENA_REQUEST_CONFLICT");
            }
            return saved;
        }
        requireLevel(role);
        var now = clock.instant();
        requireNewcomer(dayProgress(repository.progress(role.id()), now));
        long cost = (long) rules.config().ticketPriceDiamonds() * quantity;
        if (!roles.debitDiamonds(role.id(), cost)) {
            throw rejected(HttpStatus.CONFLICT, "ARENA_DIAMONDS");
        }
        var actual = grants.grant(role.id(), List.of(new Reward(ArenaRules.TICKET_ID, quantity)),
                new RewardGrantService.Context(now.getEpochSecond(), 0), ThreadLocalRandom.current());
        var result = new TicketPurchase(requestId, role.id(), roles.revision(role.id()), quantity, cost, actual);
        repository.saveTicketReceipt(result);
        return result;
    }

    /** 持久维护上海日进度和候选名单；新手结束后仍能查看结算记录。 */
    private State view(String token, boolean refresh) {
        var role = lock(token);
        requireLevel(role);
        var stored = repository.progress(role.id());
        var progress = dayProgress(stored, clock.instant());
        if (newcomerActive(progress) && (refresh || progress.opponents().isEmpty())) {
            progress = progress.withOpponents(rules.drawOpponents(ThreadLocalRandom.current()));
        }
        repository.saveProgress(role.id(), stored, progress);
        return state(role.id(), role.basics().cup(), progress, repository.history(role.id(), rules.config().historyLimit()));
    }

    /** 冻结此次角色、名单、门票和历史状态；旧版胜场阶段结束后机器人列表为空。 */
    private State state(String roleId, int score, Progress progress, List<History> history) {
        boolean active = newcomerActive(progress);
        var selection = progress.opponents();
        if ((active && (selection.size() != rules.config().opponentCount()
                || new HashSet<>(selection).size() != selection.size())) || (!active && !selection.isEmpty())) {
            throw new IllegalStateException("竞技场持久候选数量或阶段无效");
        }
        var opponents = selection.stream().map(rules::bot).map(bot -> opponentsById.get(bot.id())).toList();
        long tickets = inventory.find(roleId, ArenaRules.TICKET_ID).map(InventoryService.Item::quantity).orElse(0L);
        return new State(score, Math.max(0, rules.config().freeLimit() - progress.dailyChallenges()),
                progress.robotWins(), progress.settledChallenges(), progress.resetAtSeconds(),
                active, opponents, history, tickets, rules.config().ticketPriceDiamonds());
    }

    /** 调用统一引擎和战报编码，技能或阵容尚未支持时回滚本次扣费。 */
    private BattleReplay battle(String token, RoleProfile role, ArenaRules.Bot bot, ThreadLocalRandom random) {
        try {
            var preview = battles.arena(token, scenario(bot.id()), bot.enemies(), rules.config().attackRates(),
                    probability -> random.nextDouble() < probability);
            return HeroBattleReplayProtocolUtils.encode(preview.battle()).toBuilder()
                    .setAttackerName(role.nickname()).setDefenderName(bot.name()).build();
        } catch (IllegalArgumentException failure) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ARENA_BATTLE_UNAVAILABLE", failure);
        }
    }

    /** 原服在严格超过上海零点才翻日；竞技场永久进度和候选不随每日次数重置。 */
    private static Progress dayProgress(Progress stored, Instant now) {
        if (stored != null && stored.resetAtSeconds() >= now.getEpochSecond()) {
            return stored;
        }
        long reset = now.atZone(SERVER_ZONE).toLocalDate().plusDays(1).atStartOfDay(SERVER_ZONE).toEpochSecond();
        return stored == null ? new Progress(0, 0, 0, reset, List.of())
                : new Progress(stored.robotWins(), stored.settledChallenges(), 0, reset, stored.opponents());
    }

    /** 先确认角色再等待其行锁，离开会话时不能继续扣费。 */
    private RoleProfile lock(String token) {
        var roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw rejected(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        return roles.findById(roleId).orElseThrow();
    }

    /** 角色等级达到原表值才能生成名单、挑战或购买门票。 */
    private void requireLevel(RoleProfile role) {
        if (role.level() < rules.config().minimumLevel()) {
            throw rejected(HttpStatus.FORBIDDEN, "ARENA_LEVEL");
        }
    }

    /** 旧版达到配置胜场后即进入真人阶段，当前新手接口不再接受机器人战斗。 */
    private boolean newcomerActive(Progress progress) {
        return progress.robotWins() < rules.config().newcomerWins();
    }

    /** 真人匹配未开放前明确拒绝继续挑战或为新手段购票。 */
    private void requireNewcomer(Progress progress) {
        if (!newcomerActive(progress)) {
            throw rejected(HttpStatus.FORBIDDEN, "ARENA_NEWCOMER_COMPLETE");
        }
    }

    /** 竞技场战报编号使用全局约定加配置机器人编号，和持久场次 UUID 各司其职。 */
    private static String scenario(int opponentId) {
        return "arena:" + opponentId;
    }

    /** 向现有 WS 业务错误映射返回明确原因。 */
    private static ResponseStatusException rejected(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
