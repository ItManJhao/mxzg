/**
 * 普通竞技场负责同服真人匹配、新手机器人、专用防守和攻防双方的历史战报。
 * 候选、积分、消耗及奖励由服务端事务结算，同一请求重试恢复原冻结结果。
 */
package com.funsgamex.mxzg.arena;

import com.funsgamex.mxzg.arena.ArenaRepository.Progress;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.HeroBattleInputService;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleRoundUtils.Outcome;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroPowerRules;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationRules;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
    /** 战斗使用真实角色阵容或同源机器人配置。 */
    private final HeroLineupBattleService battles;
    /** 组装已锁定角色的真实攻防战斗输入。 */
    private final HeroBattleInputService battleInputs;
    /** 读取回退主阵及永久解锁阵型。 */
    private final MainFormationStateService formations;
    /** 复用主线阵位规则，专用防守阵不含尚未接入的助战位。 */
    private final MainFormationRules formationRules;
    /** 查询当前角色的自有英雄，验证防守站位。 */
    private final HeroRepository heroes;
    /** 同服赛季结算与杯数写入使用相同锁及服务端结算时点。 */
    private final ArenaSeasonService season;
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

    /** 机器人使用正数配置 ID，真人使用持久角色 ID，此时配置 ID 为 0。 */
    public record Opponent(int id, String name, int level, int score, long power, int avatarId, String roleId,
                           int borderId) {}

    /** 原场次的战报编号、对手、胜负和积分差，历史显示按实际提交时点冻结。 */
    public record History(String battleId, int opponentId, String opponentName, boolean won, int scoreDelta,
                          long settledAtSeconds, String opponentRoleId, boolean defense) {}

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

    /** 专用阵防守读取结果；未保存或人员被消耗时回退主阵，原防守版本保留。 */
    public record Defense(long version, int formationId, List<Lineup.Slot> slots, boolean fallback) {
        /** 将显示和回执用的阵容站位冻结。 */
        public Defense {
            slots = List.copyOf(slots);
        }
    }

    /** 保存成功返回原命令编号与实际防守阵；同键重试保持原结果。 */
    public record DefenseSaveResult(String requestId, Defense defense) {}

    /** 原挑战的权威结果、战报和实际到账；requestId 用于安全重发。 */
    public record Challenge(String requestId, String roleId, long assetRevision, History record, BattleReplay replay,
                            State state, RewardGrantResult actual) {
        /** 核对同一角色、对手、胜负和战斗结算，禁止恢复错场次的奖励或战报。 */
        public Challenge {
            if (!RewardReceiptPayloads.validId(requestId) || !RewardReceiptPayloads.validId(record.battleId())
                    || assetRevision <= 0 || !roleId.equals(actual.roleId()) || state.history().isEmpty()
                    || !state.history().getFirst().equals(record)
                    || record.defense() || !replay.getScenario().equals(scenario(record.opponentId(), record.opponentRoleId()))
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
                 RewardGrantService grants, AssetSyncService sync, GameClock clock, ApplicationEventPublisher events,
                 HeroBattleInputService battleInputs, MainFormationStateService formations,
                 MainFormationRules formationRules, HeroRepository heroes, ArenaSeasonService season) {
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
        this.battleInputs = battleInputs;
        this.formations = formations;
        this.formationRules = formationRules;
        this.heroes = heroes;
        this.season = season;
        grants.requireSupported(List.of(ArenaRules.TICKET_ID));
        grants.requireSupported(rules.config().rewards().stream().flatMap(drop -> drop.items().stream())
                .map(Reward::itemId).distinct().toList());
        var catalog = new HashMap<Integer, Opponent>();
        for (var bot : rules.config().bots()) {
            catalog.put(bot.id(), new Opponent(bot.id(), bot.name(), bot.level(), bot.score(),
                    battles.configuredPower(bot.enemies(), powers), bot.avatarId(), null, 0));
        }
        opponentsById = Map.copyOf(catalog);
    }

    /** 进入竞技场，按已完成新手胜场选择阶段，重进和重连复用持久名单。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State current(String token) {
        return view(token, false);
    }

    /** 刷新旧名单只重抽候选，不扣货币、不分配场次、不修改已有挑战。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State refresh(String token) {
        return view(token, true);
    }

    /** 兼容原新手机器人请求，结算仍使用统一入口。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Challenge challenge(String token, String requestId, int opponentId) {
        return challenge(token, requestId, opponentId, null);
    }

    /** 根据已持久化的真人或机器人候选执行战斗，消耗和攻防记录原子提交。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Challenge challenge(String token, String requestId, int opponentId, String opponentRoleId) {
        if (!RewardReceiptPayloads.validId(requestId) || (opponentRoleId == null && opponentId <= 0)
                || (opponentRoleId != null && (opponentId != 0 || !RewardReceiptPayloads.validId(opponentRoleId)))) {
            throw rejected(HttpStatus.BAD_REQUEST, "ARENA_REQUEST_INVALID");
        }
        var authenticated = requireRole(token);
        requireLevel(authenticated);
        var now = Instant.ofEpochSecond(season.prepare(authenticated.serverId()));
        requireSameSession(token, authenticated.id());
        var saved = repository.receipt(authenticated.id(), requestId);
        if (saved != null) {
            if (saved.record().opponentId() != opponentId || !Objects.equals(saved.record().opponentRoleId(), opponentRoleId)) {
                throw rejected(HttpStatus.CONFLICT, "ARENA_REQUEST_CONFLICT");
            }
            return saved;
        }
        if (opponentRoleId != null && repository.candidates(authenticated.id(), authenticated.serverId()).stream()
                .noneMatch(candidate -> candidate.roleId().equals(opponentRoleId))) {
            throw rejected(HttpStatus.CONFLICT, "ARENA_OPPONENT");
        }
        var role = lock(token, authenticated.id(), opponentRoleId);
        requireLevel(role);
        var stored = repository.progress(role.id());
        var progress = dayProgress(stored, now);
        boolean robot = opponentRoleId == null;
        if (robot != newcomerActive(progress) || (robot && !progress.opponents().contains(opponentId))) {
            throw rejected(HttpStatus.CONFLICT, "ARENA_OPPONENT");
        }
        var defender = robot ? null : roles.findById(opponentRoleId).orElseThrow();
        if (defender != null && (!role.serverId().equals(defender.serverId())
                || repository.candidates(role.id(), role.serverId()).stream()
                    .noneMatch(candidate -> candidate.roleId().equals(opponentRoleId)))) {
            throw rejected(HttpStatus.CONFLICT, "ARENA_OPPONENT");
        }
        if (progress.dailyChallenges() >= rules.config().freeLimit()
                && !inventory.debit(role.id(), ArenaRules.TICKET_ID, 1)) {
            throw rejected(HttpStatus.CONFLICT, "ARENA_TICKETS");
        }

        var random = ThreadLocalRandom.current();
        var bot = robot ? rules.bot(opponentId) : null;
        int opponentScore = robot ? bot.score() : defender.basics().cup();
        String opponentName = robot ? bot.name() : defender.nickname();
        var replay = robot ? battle(token, role, bot, random) : playerBattle(role, defender, random);
        boolean won = Outcome.ATTACKER_WIN.name().equals(replay.getOutcome());
        int scoreDelta = won ? rules.scoreGain(role.basics().cup(), opponentScore) : 0;
        int score = Math.addExact(role.basics().cup(), scoreDelta);
        if (won) {
            roles.setArenaScore(role.id(), score);
        }
        int defenderLoss = !robot && won ? rules.scoreLoss(opponentScore, role.basics().cup()) : 0;
        if (defenderLoss > 0) {
            roles.setArenaScore(defender.id(), opponentScore - defenderLoss);
        }
        int wins = progress.robotWins() + (robot && won ? 1 : 0);
        int total = Math.incrementExact(progress.settledChallenges());
        var latest = new Progress(wins, total, Math.incrementExact(progress.dailyChallenges()),
                progress.resetAtSeconds(), wins < rules.config().newcomerWins() ? progress.opponents() : List.of());
        repository.saveProgress(role.id(), stored, latest);
        repository.observeBattle(role.id(), now.getEpochSecond());
        if (robot && !newcomerActive(latest)) {
            replaceCandidates(role);
        }
        sync.changed(role.id());

        var actual = grants.grant(role.id(), rules.rewards(repository.clergyLevel(role.id()), random),
                new RewardGrantService.Context(now.getEpochSecond(), 0), random);
        var record = new History(UUID.randomUUID().toString(), opponentId, opponentName, won, scoreDelta,
                now.getEpochSecond(), opponentRoleId, false);
        var history = new ArrayList<History>();
        history.add(record);
        history.addAll(repository.history(role.id(), rules.config().historyLimit() - 1));
        var result = new Challenge(requestId, role.id(), roles.revision(role.id()), record, replay,
                state(role, score, latest, history), actual);
        repository.saveChallenge(result);
        if (defender != null) {
            repository.observeBattle(defender.id(), now.getEpochSecond());
            var defensive = new History(record.battleId(), 0, role.nickname(), !won, -defenderLoss,
                    record.settledAtSeconds(), role.id(), true);
            repository.saveDefenseHistory(defender.id(), defensive);
            events.publishEvent(new QuestProgressEvent(defender.id(), QuestMetric.ARENA_SCORE));
        }
        season.recordRanks(role.serverId(), role.id(), defender == null ? null : defender.id());
        events.publishEvent(new QuestProgressEvent(role.id(), QuestMetric.ARENA_CHALLENGE));
        events.publishEvent(new QuestProgressEvent(role.id(), QuestMetric.ARENA_SCORE));
        return result;
    }

    /** 恢复当前角色参与的攻方或防守战报，不重复结算或发放奖励。 */
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

    /** 玩家打开防守编辑，空专用阵使用当前主阵作为草稿。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Defense defense(String token) {
        var role = lock(token);
        requireLevel(role);
        return currentDefense(role.id(), repository.defense(role.id()));
    }

    /** 校验独立版本、自有英雄和原阵位规则，保存后冻结同请求的原成功回执。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DefenseSaveResult saveDefense(String token, String requestId, long expectedVersion,
                                         int formationId, List<Lineup.Slot> slots) {
        if (!RewardReceiptPayloads.validId(requestId) || expectedVersion < 0 || formationId <= 0
                || invalidDefenseSlots(slots)) {
            throw rejected(HttpStatus.BAD_REQUEST, "ARENA_FORMATION_INVALID");
        }
        var role = lock(token);
        requireLevel(role);
        var saved = repository.defenseReceipt(role.id(), requestId);
        if (saved != null) {
            if (!saved.result().requestId().equals(requestId) || saved.expectedVersion() != expectedVersion
                    || saved.formationId() != formationId || !saved.slots().equals(slots)) {
                throw rejected(HttpStatus.CONFLICT, "ARENA_REQUEST_CONFLICT");
            }
            return saved.result();
        }
        var stored = repository.defense(role.id());
        long version = stored == null ? 0 : stored.version();
        if (version != expectedVersion) {
            throw rejected(HttpStatus.CONFLICT, "ARENA_FORMATION_CHANGED");
        }
        var accepted = defenseSlots(role.id(), formationId, slots);
        var current = stored;
        if (stored == null || stored.formationId() != formationId || !stored.slots().equals(accepted)) {
            current = new Defense(Math.incrementExact(version), formationId, accepted, false);
            repository.saveDefense(role.id(), stored, current);
        }
        var result = new DefenseSaveResult(requestId, current);
        repository.saveDefenseReceipt(role.id(), new ArenaRepository.DefenseReceipt(expectedVersion, formationId,
                List.copyOf(slots), result));
        return result;
    }

    /** 确保阵位、英雄唯一持久身份和阵容人数都有可校验的输入。 */
    private static boolean invalidDefenseSlots(List<Lineup.Slot> slots) {
        return slots == null || slots.isEmpty() || slots.size() > 8
                || slots.stream().anyMatch(slot -> slot == null || slot.position() == null || slot.position() < 1
                        || slot.position() > 8 || !RewardReceiptPayloads.validId(slot.heroId()));
    }

    /** 同源归一化拒绝未解锁阵型、外部英雄、重复站位和不可出战英雄。 */
    private List<Lineup.Slot> defenseSlots(String roleId, int formationId, List<Lineup.Slot> slots) {
        var current = formations.current(roleId);
        var owned = heroes.list(roleId).stream().map(hero -> new MainFormationRules.Hero(
                hero.id(), hero.templateId(), hero.level(), hero.star())).toList();
        List<Lineup.Slot> valid;
        try {
            valid = formationRules.normalize(formationId,
                    new MainFormationRules.Unlocks(new HashSet<>(current.unlockedIds()), false), owned, slots);
        } catch (IllegalArgumentException failure) {
            throw rejected(HttpStatus.BAD_REQUEST, "ARENA_FORMATION_INVALID");
        }
        if (valid.size() != slots.size()) {
            throw rejected(HttpStatus.BAD_REQUEST, "ARENA_FORMATION_INVALID");
        }
        return valid.stream().sorted(Comparator.comparingInt(Lineup.Slot::position)).toList();
    }

    /** 读取当前有效防守，主阵回退保留原有专用版本，并且只公开八个战斗位置。 */
    private Defense currentDefense(String roleId, Defense stored) {
        if (stored != null && !stored.slots().isEmpty()) {
            return stored;
        }
        var main = formations.current(roleId);
        var slots = main.slots().stream().filter(slot -> slot.position() <= 8).toList();
        return new Defense(stored == null ? 0 : stored.version(), main.formationId(), slots, true);
    }

    /** 持久维护两个匹配阶段及自然日进度，真人候选不足时返回实际可战人数。 */
    private State view(String token, boolean refresh) {
        var current = requireRole(token);
        requireLevel(current);
        var now = Instant.ofEpochSecond(season.prepare(current.serverId()));
        var role = lock(token, current.id(), null);
        requireLevel(role);
        var stored = repository.progress(role.id());
        var progress = dayProgress(stored, now);
        if (newcomerActive(progress) && (refresh || progress.opponents().isEmpty())) {
            progress = progress.withOpponents(rules.drawOpponents(ThreadLocalRandom.current()));
        }
        if (!newcomerActive(progress) && (refresh || repository.candidates(role.id(), role.serverId()).isEmpty())) {
            replaceCandidates(role);
        }
        repository.saveProgress(role.id(), stored, progress);
        return state(role, role.basics().cup(), progress, repository.history(role.id(), rules.config().historyLimit()));
    }

    /** 只从原杯数附近的当前区服角色中抽取可战候选。 */
    private void replaceCandidates(RoleProfile role) {
        var pool = repository.matchPool(role.id(), role.serverId(), ArenaRules.MATCH_POOL_SIZE);
        var matched = rules.drawPlayers(pool, role.power() == null ? 0 : role.power(), ThreadLocalRandom.current());
        repository.replaceCandidates(role.id(), matched);
    }

    /** 对手卡片保留真实角色身份、头像和头像框。 */
    private static Opponent asOpponent(ArenaRepository.MatchPlayer candidate) {
        return new Opponent(0, candidate.name(), candidate.level(), candidate.score(), candidate.power(), candidate.avatarId(),
                candidate.roleId(), candidate.borderId());
    }

    /** 冻结此次角色、对手、门票和历史；真人阶段不再混入配置机器人。 */
    private State state(RoleProfile role, int score, Progress progress, List<History> history) {
        boolean active = newcomerActive(progress);
        var selection = progress.opponents();
        if ((active && (selection.size() != rules.config().opponentCount()
                || new HashSet<>(selection).size() != selection.size())) || (!active && !selection.isEmpty())) {
            throw new IllegalStateException("竞技场持久候选数量或阶段无效");
        }
        var opponents = active ? selection.stream().map(rules::bot).map(bot -> opponentsById.get(bot.id())).toList()
                : repository.candidates(role.id(), role.serverId()).stream().map(ArenaService::asOpponent).toList();
        long tickets = inventory.find(role.id(), ArenaRules.TICKET_ID).map(InventoryService.Item::quantity).orElse(0L);
        return new State(score, Math.max(0, rules.config().freeLimit() - progress.dailyChallenges()),
                progress.robotWins(), progress.settledChallenges(), progress.resetAtSeconds(),
                active, opponents, history, tickets, rules.config().ticketPriceDiamonds());
    }

    /** 调用统一引擎执行新手机器人战，未恢复的技能或阵容会回滚本次扣费。 */
    private BattleReplay battle(String token, RoleProfile role, ArenaRules.Bot bot, ThreadLocalRandom random) {
        try {
            var preview = battles.arena(token, scenario(bot.id(), null), bot.enemies(), rules.config().attackRates(),
                    probability -> random.nextDouble() < probability);
            return HeroBattleReplayProtocolUtils.encode(preview.battle()).toBuilder()
                    .setAttackerName(role.nickname()).setDefenderName(bot.name()).build();
        } catch (IllegalArgumentException failure) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ARENA_BATTLE_UNAVAILABLE", failure);
        }
    }

    /** 攻方使用主阵，守方优先用专设阵；双方角色锁在读取直至结算期间一直持有。 */
    private BattleReplay playerBattle(RoleProfile role, RoleProfile defender, ThreadLocalRandom random) {
        try {
            var main = formations.current(role.id());
            var offensive = battleInputs.forFormation(role.id(), main.version(), main.formationId(), main.slots());
            var defense = currentDefense(defender.id(), repository.defense(defender.id()));
            var defensive = battleInputs.forFormation(defender.id(), defense.version(), defense.formationId(), defense.slots());
            var preview = battles.arena(scenario(0, defender.id()), offensive, defensive, rules.config().attackRates(),
                    probability -> random.nextDouble() < probability);
            return HeroBattleReplayProtocolUtils.encode(preview.battle()).toBuilder()
                    .setAttackerName(role.nickname()).setDefenderName(defender.nickname()).build();
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

    /** 单角色操作复用角色锁和等待后的会话确认。 */
    private RoleProfile lock(String token) {
        return lock(token, sessions.requireRole(token), null);
    }

    /** 真人互相挑战按同一角色编号顺序取锁，避免两边赛前等待对方。 */
    private RoleProfile lock(String token, String roleId, String opponentRoleId) {
        if (opponentRoleId == null) {
            roles.lock(roleId);
        } else {
            var ids = List.of(roleId, opponentRoleId).stream().sorted().toList();
            ids.forEach(roles::lock);
        }
        requireSameSession(token, roleId);
        return roles.findById(roleId).orElseThrow();
    }

    /** 读取提交前必须确认连接仍属于进入事务时的角色。 */
    private void requireSameSession(String token, String roleId) {
        if (!roleId.equals(sessions.requireRole(token))) {
            throw rejected(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
    }

    /** 区服锁先于角色行锁，先读取已鉴权角色的真实区服。 */
    private RoleProfile requireRole(String token) {
        return roles.findById(sessions.requireRole(token)).orElseThrow();
    }

    /** 角色等级达到原表值才能生成名单、挑战或购买门票。 */
    private void requireLevel(RoleProfile role) {
        if (role.level() < rules.config().minimumLevel()) {
            throw rejected(HttpStatus.FORBIDDEN, "ARENA_LEVEL");
        }
    }

    /** 旧版达到配置机器人胜场后，下一场起使用同服真人候选。 */
    private boolean newcomerActive(Progress progress) {
        return progress.robotWins() < rules.config().newcomerWins();
    }

    /** 战报明确区分机器人配置与真实守方身份，历史场次使用另一个独立持久 UUID。 */
    private static String scenario(int opponentId, String opponentRoleId) {
        return opponentRoleId == null ? "arena:" + opponentId : "arena:pvp:" + opponentRoleId;
    }

    /** 向现有 WS 业务错误映射返回明确原因。 */
    private static ResponseStatusException rejected(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
