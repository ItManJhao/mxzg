/**
 * 普通竞技场的赛季、每日榜、周宝箱、点赞与兑换入口。
 * 同区服的定时结算与挑战积分先按区服行串行化，角色资产继续走通用奖励与快照。
 */
package com.funsgamex.mxzg.arena;

import com.funsgamex.mxzg.arena.ArenaSeasonRepository.Action;
import com.funsgamex.mxzg.arena.ArenaSeasonRepository.Prize;
import com.funsgamex.mxzg.arena.ArenaSeasonRepository.PrizeKey;
import com.funsgamex.mxzg.arena.ArenaSeasonRepository.RankRow;
import com.funsgamex.mxzg.arena.ArenaSeasonRepository.Schedule;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.mail.MailService;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardFeedbackService.Mode;
import com.funsgamex.mxzg.reward.RewardFeedbackService.Notice;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ArenaSeasonService {
    /** 竞技场排行榜、点赞和商店使用上海时区。 */
    private static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");
    /** 原各服赛季从开服日上海零点起每隔七天轮换，单位为秒。 */
    private static final long SEASON_SECONDS = 7 * 86_400L;
    /** 原竞技场最高名次的首档成就从前十名开始。 */
    private static final int RANK_ACHIEVEMENT_LIMIT = 10;
    /** 原请求标记，对应唯一持久化动作类型。 */
    private static final String CHEST = "chest";
    /** 原请求标记，用来统计点赞次数和对象。 */
    private static final String LIKE = "like";
    /** 原请求标记，用来汇总同一周兑换数量。 */
    private static final String SHOP = "shop";

    /** 原档位的首末名次（含端点）和展示物品。 */
    public record RewardTier(int minRank, int maxRank, List<Reward> rewards) {
        /** 冻结原档位奖励列表。 */
        public RewardTier {
            rewards = List.copyOf(rewards);
        }
    }

    /** 当前赛季内一档可预览的累计挑战宝箱。 */
    public record Chest(int id, int requiredChallenges, int boxPic, List<Reward> rewards, boolean claimed) {}

    /** 赛季尚无可信开服时间时 seasonEndsAt 为 0，其他玩法仍可读取本服榜。 */
    public record State(long seasonEndsAt, long dailyEndsAt, int seasonChallenges, List<Chest> chests,
                        List<RewardTier> dailyTiers, List<RewardTier> seasonTiers) {}

    /** 名次为 0 表示本人榜外；点赞收入长期累计，本期已点赞由当前请求人决定。 */
    public record RankEntry(int rank, String roleId, String name, int score, long power, int level, int headId,
                            int borderId, int receivedLikes, boolean liked) {}

    /** 原榜前五十、独立本人行及当日点赞剩余次数。 */
    public record Ranking(List<RankEntry> entries, RankEntry own, int likesRemaining, long dailyEndsAt) {}

    /** 原宝箱请求冻结通用发奖，状态根据当前真实赛季返回。 */
    public record Claim(String requestId, State state, Notice notice) {}

    /** 原点赞请求冻结通用奖励，最新榜单与原发奖回执独立返回。 */
    public record Like(String requestId, Ranking ranking, Notice notice) {}

    /** 原商品展示和报价，purchaseLimit 为 0 表示不限量。 */
    public record Offer(int id, int requiredLevel, int purchaseLimit, int purchased, long price, List<Reward> rewards) {}

    /** 兑换币余额来自当前库存，刷新后购买累计重新开始。 */
    public record ShopState(long currencyBalance, long refreshAt, List<Offer> offers) {}

    /** 同一兑换原反馈用于断线恢复，显示字段始终取本周真实结果。 */
    public record Purchase(String requestId, ShopState state, Notice notice) {}

    /** 进数据库前和锁后校验角色会话。 */
    private final SessionService sessions;
    /** 获得角色锁、重算积分、读取权威资料以及资产版本。 */
    private final RoleRepository roles;
    /** 区服与角色的原积分、期次和已结算动作存储。 */
    private final ArenaSeasonRepository arena;
    /** 展示与结算使用同一旧配置。 */
    private final ArenaSeasonRules rules;
    /** 竞技场入口的旧最低等级从已有新手配置读取。 */
    private final int minimumLevel;
    /** 获取本次读或写使用的真实游戏时间。 */
    private final GameClock clock;
    /** 保持旧排名奖励邮件到账、领取分离。 */
    private final MailService mail;
    /** 兑换币使用已存在普通背包物品。 */
    private final InventoryService inventory;
    /** 宝箱、点赞和兑换发放统一资产。 */
    private final RewardGrantService grants;
    /** 原操作反馈在真实资产事务提交后发出。 */
    private final RewardFeedbackService feedback;
    /** 持久校验原操作回执和结算邮件的附件内容。 */
    private final RewardReceiptPayloads payloads;
    /** 在真实比分与战报写入后，在同一事务交付实际排名供成就保存。 */
    private final ApplicationEventPublisher events;

    /** 注入同一个角色、邮箱、资产事务和可信游戏时间的依赖。 */
    ArenaSeasonService(SessionService sessions, RoleRepository roles, ArenaSeasonRepository arena,
                       ArenaSeasonRules rules, ArenaRules access, GameClock clock, MailService mail,
                       InventoryService inventory, RewardGrantService grants, RewardFeedbackService feedback,
                       RewardReceiptPayloads payloads, ApplicationEventPublisher events) {
        this.sessions = sessions;
        this.roles = roles;
        this.arena = arena;
        this.rules = rules;
        this.minimumLevel = access.config().minimumLevel();
        this.clock = clock;
        this.mail = mail;
        this.inventory = inventory;
        this.grants = grants;
        this.feedback = feedback;
        this.payloads = payloads;
        this.events = events;
        grants.requireSupported(rules.rewardItems());
    }

    /** 调用方的挑战事务必须在任何角色写锁之前请求时点，结算和随后挑战使用同一个区服行锁。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public long prepare(String serverId) {
        long openedAt = arena.lockServer(serverId);
        long now = clock.epochSeconds();
        advance(serverId, openedAt, now);
        return now;
    }

    /** 仅在真实新战斗结算后为参战双方记录实际本服名次；调用方已经持有区服与这些角色锁。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordRanks(String serverId, String attackerId, String defenderId) {
        var ranking = arena.ranks(serverId, minimumLevel, ArenaSeasonRules.RANK_LIMIT);
        for (int index = 0; index < ranking.size(); index++) {
            String roleId = ranking.get(index).roleId();
            if (roleId.equals(attackerId) || roleId.equals(defenderId)) {
                recordRank(roleId, index + 1);
            }
        }
    }

    /** 当前事务中的正名次是历史事实，回滚不保留成就或在线提示。 */
    private void recordRank(String roleId, int rank) {
        events.publishEvent(new QuestProgressEvent(roleId, QuestMetric.ARENA_MAX_RANK, 0, rank));
    }

    /** 由后台在独立事务维护一个区服，每个结算周期最多写入一组排名邮件。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void maintain(String serverId) {
        prepare(serverId);
    }

    /** 读取当前开服周期的挑战次数和全部原奖励档。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State current(String token) {
        var role = authenticated(token);
        prepare(role.serverId());
        return state(role);
    }

    /** 读取前五十名和本人，按上海自然日显示当前可点赞额度。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Ranking ranking(String token) {
        var role = authenticated(token);
        return ranking(role, likeEnd(prepare(role.serverId())));
    }

    /** 在调用方已准备好的区服事务内读取实时竞技场名次，0 表示不在前五十名。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public int rankForRole(String serverId, String roleId) {
        var ranking = arena.ranks(serverId, minimumLevel, ArenaSeasonRules.RANK_LIMIT);
        for (int index = 0; index < ranking.size(); index++) {
            if (ranking.get(index).roleId().equals(roleId)) {
                return index + 1;
            }
        }
        return 0;
    }

    /** 在固定期次核对真实挑战次数，每个宝箱一赛季只发一次，重试找原回执。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Claim claimChest(String token, String requestId, int chestId, long seasonEndsAt) {
        requireRequest(requestId, seasonEndsAt);
        var profile = authenticated(token);
        long now = prepare(profile.serverId());
        var role = lock(token, profile);
        String key = String.valueOf(chestId);
        var saved = recover(role, requestId, CHEST, seasonEndsAt, key, 1);
        if (saved != null) {
            return new Claim(requestId, state(role), saved);
        }
        var state = state(role);
        if (state.seasonEndsAt() == 0 || state.seasonEndsAt() != seasonEndsAt) {
            throw error("ARENA_SEASON_CHANGED");
        }
        var chest = state.chests().stream().filter(row -> row.id() == chestId).findFirst()
                .orElseThrow(() -> error("ARENA_CHEST"));
        if (chest.claimed()) {
            throw error("ARENA_CHEST_CLAIMED");
        }
        if (state.seasonChallenges() < chest.requiredChallenges()) {
            throw error("ARENA_CHEST_COUNT");
        }
        var notice = grant(role, requestId, CHEST, seasonEndsAt, key, 1, chest.rewards(), Mode.POPUP, now);
        return new Claim(requestId, state(role), notice);
    }

    /** 同服角色每天各能被本角色点赞一次，受每日总次数限制。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Like like(String token, String requestId, String targetRoleId, long dailyEndsAt) {
        requireRequest(requestId, dailyEndsAt);
        if (!RewardReceiptPayloads.validId(targetRoleId)) {
            throw error("ARENA_LIKE_TARGET");
        }
        var role = lock(token, authenticated(token));
        long now = clock.epochSeconds();
        long end = likeEnd(now);
        var saved = recover(role, requestId, LIKE, dailyEndsAt, targetRoleId, 1);
        if (saved != null) {
            return new Like(requestId, ranking(role, end), saved);
        }
        if (end != dailyEndsAt) {
            throw error("ARENA_LIKE_DAY");
        }
        var liked = arena.used(role.id(), LIKE, end);
        if (liked.contains(targetRoleId)) {
            throw error("ARENA_LIKED");
        }
        if (liked.size() >= rules.likeLimit()) {
            throw error("ARENA_LIKE_COUNT");
        }
        var target = roles.findById(targetRoleId).orElseThrow(() -> error("ARENA_LIKE_TARGET"));
        if (target.id().equals(role.id()) || !target.serverId().equals(role.serverId())) {
            throw error("ARENA_LIKE_TARGET");
        }
        var notice = grant(role, requestId, LIKE, end, targetRoleId, 1, rules.likeRewards(), Mode.TIPS, now);
        return new Like(requestId, ranking(role, end), notice);
    }

    /** 获取当前原固定目录，显示真实竞技币和每周已购买量。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ShopState shop(String token) {
        return shop(authenticated(token), shopEnd(clock.epochSeconds()));
    }

    /** 服务端计算原报价和限购总量，扣币和发奖在同一角色事务提交。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Purchase buy(String token, String requestId, int offerId, int quantity, long refreshAt) {
        requireRequest(requestId, refreshAt);
        if (offerId <= 0 || quantity <= 0) {
            throw error("ARENA_SHOP_REQUEST");
        }
        var role = lock(token, authenticated(token));
        long now = clock.epochSeconds();
        long end = shopEnd(now);
        String key = Integer.toString(offerId);
        var saved = recover(role, requestId, SHOP, refreshAt, key, quantity);
        if (saved != null) {
            return new Purchase(requestId, shop(role, end), saved);
        }
        if (refreshAt != end) {
            throw error("ARENA_SHOP_REFRESH");
        }
        var offer = shop(role, end).offers().stream().filter(row -> row.id() == offerId).findFirst()
                .orElseThrow(() -> error("ARENA_SHOP_OFFER"));
        long total = (long) offer.purchased() + quantity;
        if (total > Integer.MAX_VALUE || (offer.purchaseLimit() > 0 && total > offer.purchaseLimit())) {
            throw error("ARENA_SHOP_LIMIT");
        }
        if (!inventory.debit(role.id(), rules.shopCurrency(), Math.multiplyExact(offer.price(), quantity))) {
            throw error("ARENA_SHOP_CURRENCY");
        }
        var rewards = offer.rewards().stream()
                .map(reward -> new Reward(reward.itemId(), Math.multiplyExact(reward.quantity(), quantity))).toList();
        var notice = grant(role, requestId, SHOP, end, key, quantity, rewards, Mode.POPUP, now);
        return new Purchase(requestId, shop(role, end), notice);
    }

    /** 启动后根据实际当前期次维护奖励；首次接入不凭空发过去没有快照的排名奖励。 */
    private void advance(String serverId, long openedAt, long now) {
        var previous = arena.schedule(serverId);
        if (previous == null) {
            arena.saveSchedule(serverId, null, new Schedule(openedAt, nextMidnight(now), seasonEnd(openedAt, now)));
            return;
        }
        long dailyEnd = previous.dailyEndsAt();
        long seasonEnd = previous.openedAt() == openedAt ? previous.seasonEndsAt() : seasonEnd(openedAt, now);
        boolean dailyDue = now >= dailyEnd;
        boolean seasonDue = seasonEnd > 0 && now >= seasonEnd;
        if (dailyDue || seasonDue) {
            var ranks = arena.ranks(serverId, minimumLevel, ArenaSeasonRules.RANK_LIMIT);
            var scores = seasonDue ? arena.scores(serverId) : Map.<String, Integer>of();
            // 排名附件外键也会锁角色，先按与好友和公会一致的 UUID 顺序取得角色锁。
            var affected = new TreeSet<>(scores.keySet());
            ranks.forEach(rank -> affected.add(rank.roleId()));
            affected.forEach(roles::lock);
            if (dailyDue) {
                savePrizes(ranks, "daily", dailyEnd, rules.daily());
                dailyEnd = nextMidnight(now);
            }
            if (seasonDue) {
                savePrizes(ranks, "season", seasonEnd, rules.season());
                resetScores(serverId, scores);
                seasonEnd = seasonEnd(openedAt, now);
            }
        }
        arena.saveSchedule(serverId, previous, new Schedule(openedAt, dailyEnd, seasonEnd));
    }

    /** 排名和真实资产附件同时冻结，邮件写入由提交后的投递维护完成。 */
    private void savePrizes(List<RankRow> ranks, String kind, long end, ArenaSeasonRules.RankReward configured) {
        for (int index = 0; index < ranks.size(); index++) {
            int rank = index + 1;
            var key = new PrizeKey(ranks.get(index).roleId(), kind, end);
            var frozen = payloads.freeze(configured.tier(rank).rewards());
            arena.savePrize(new Prize(key, configured.title(), configured.content().replace("[1]", Integer.toString(rank)),
                    frozen.json(), frozen.hash(), null, 0));
        }
    }

    /** 在本区角色锁内重算赛季积分，未扣分角色也会按轮换后的实际名次记录成就。 */
    private void resetScores(String serverId, Map<String, Integer> scores) {
        scores.forEach((role, score) -> {
            int reduced = rules.resetScore(score);
            if (score != reduced) {
                roles.setArenaScore(role, reduced);
            }
        });
        var ranking = arena.ranks(serverId, minimumLevel, RANK_ACHIEVEMENT_LIMIT);
        for (int index = 0; index < ranking.size(); index++) {
            String roleId = ranking.get(index).roleId();
            if (scores.containsKey(roleId)) {
                recordRank(roleId, index + 1);
            }
        }
    }

    /** 投递单个冻结奖励，消息及投递标记要么一起提交，要么一起重试。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    void deliver(PrizeKey key, long now) {
        var prize = arena.lockPrize(key);
        if (prize.mailId() != null || prize.retryAt() > now) {
            return;
        }
        var rewards = Arrays.asList(payloads.read(prize.json(), prize.hash(), Reward[].class));
        var mailId = mail.deliver(key.roleId(), prize.title(), prize.body(), rewards);
        arena.markDelivered(key, mailId);
    }

    /** 把满信箱等可恢复的单份投递失败排到后续批次。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    void delay(PrizeKey key, long retryAt) {
        arena.delayPrize(key, retryAt);
    }

    /** 返回指定时点可发的冻结邮件键，后台逐条提交。 */
    List<PrizeKey> pending(long now, int limit) {
        return arena.pending(now, limit);
    }

    /** 读取当前进度，已到新赛季时只统计新一期主攻方的真实战斗。 */
    private State state(RoleProfile role) {
        var schedule = arena.schedule(role.serverId());
        long end = schedule.seasonEndsAt();
        int count = end == 0 ? 0 : arena.seasonChallenges(role.id(), end - SEASON_SECONDS, end);
        var used = end == 0 ? Set.<String>of() : arena.used(role.id(), CHEST, end);
        var chests = rules.chests().stream().map(row -> new Chest(row.id(), row.requiredChallenges(), row.boxPic(),
                row.rewards(), used.contains(String.valueOf(row.id())))).toList();
        return new State(end, schedule.dailyEndsAt(), count, chests, rules.daily().tiers(), rules.season().tiers());
    }

    /** 排名前两百决定本人位置，前五十用于展示；点赞金额不由查询计算。 */
    private Ranking ranking(RoleProfile role, long end) {
        var liked = arena.used(role.id(), LIKE, end);
        var ranks = arena.ranks(role.serverId(), minimumLevel, ArenaSeasonRules.RANK_LIMIT);
        var visible = new ArrayList<RankEntry>();
        RankEntry own = null;
        for (int index = 0; index < ranks.size(); index++) {
            var row = ranks.get(index);
            var result = rank(index + 1, row, liked);
            if (row.roleId().equals(role.id())) {
                own = result;
            }
            if (index < ArenaSeasonRules.VISIBLE_RANKS) {
                visible.add(result);
            }
        }
        if (own == null) {
            own = rank(0, arena.own(role.id()), liked);
        }
        return new Ranking(List.copyOf(visible), own, Math.max(0, rules.likeLimit() - liked.size()), end);
    }

    /** 将数据库原排行行和当前请求人的点赞状态组合成协议展示数据。 */
    private static RankEntry rank(int rank, RankRow row, Set<String> liked) {
        return new RankEntry(rank, row.roleId(), row.name(), row.score(), row.power(), row.level(),
                row.headId(), row.borderId(), row.receivedLikes(), liked.contains(row.roleId()));
    }

    /** 读取周购买期次实际余额及商品，对高等级隐藏项同时执行后台准入。 */
    private ShopState shop(RoleProfile role, long end) {
        var counts = arena.purchases(role.id(), end);
        var offers = rules.offers().stream().filter(row -> role.level() >= row.requiredLevel())
                .map(row -> new Offer(row.id(), row.requiredLevel(), row.purchaseLimit(),
                        counts.getOrDefault(row.id(), 0), row.price(), row.rewards())).toList();
        long amount = inventory.find(role.id(), rules.shopCurrency()).map(InventoryService.Item::quantity).orElse(0L);
        return new ShopState(amount, end, offers);
    }

    /** 冻结实际奖励后保存原请求参数，回滚时不会提示或消耗资格。 */
    private Notice grant(RoleProfile role, String requestId, String type, long end, String key, int quantity,
                         List<Reward> rewards, Mode mode, long now) {
        var random = ThreadLocalRandom.current();
        var actual = grants.grant(role.id(), rewards, new RewardGrantService.Context(now, 0), random);
        var notice = feedback.publish(UUID.randomUUID().toString(), role.id(), roles.revision(role.id()),
                mode, actual, requestId);
        var frozen = payloads.freeze(notice);
        arena.saveAction(role.id(), requestId, new Action(type, end, key, quantity, frozen.json(), frozen.hash()));
        return notice;
    }

    /** 请求重复必须命中同玩法、同目标、同数量和原期次，再返回真实奖励。 */
    private Notice recover(RoleProfile role, String requestId, String type, long end, String key, int quantity) {
        var saved = arena.action(role.id(), requestId);
        if (saved == null) {
            return null;
        }
        if (!type.equals(saved.type()) || saved.periodEnd() != end || !key.equals(saved.key())
                || quantity != saved.quantity()) {
            throw error("ARENA_REQUEST_CONFLICT");
        }
        var notice = payloads.read(saved.json(), saved.hash(), Notice.class);
        if (!role.id().equals(notice.roleId()) || !requestId.equals(notice.requestId())) {
            throw new IllegalStateException("竞技场历史奖品回执归属无效");
        }
        return notice;
    }

    /** 入口只使用真实凭证，限等级角色无法打开竞技场附属功能。 */
    private RoleProfile authenticated(String token) {
        var role = roles.findById(sessions.requireRole(token)).orElseThrow();
        if (role.level() < minimumLevel) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ARENA_LEVEL");
        }
        return role;
    }

    /** 锁角色后重新鉴权，购物和点赞不需要写区服结算行。 */
    private RoleProfile lock(String token, RoleProfile role) {
        roles.lock(role.id());
        var latest = authenticated(token);
        if (!role.id().equals(latest.id())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        return latest;
    }

    /** 先判断原命令与正 Unix 期次的格式，重复命令在业务期次校验前另行恢复。 */
    private static void requireRequest(String requestId, long end) {
        if (!RewardReceiptPayloads.validId(requestId) || end <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ARENA_REQUEST_INVALID");
        }
    }

    /** 普通区服每日零点结算，返回严格未来的上海零点。 */
    private static long nextMidnight(long now) {
        return Instant.ofEpochSecond(now).atZone(ZONE).toLocalDate().plusDays(1).atStartOfDay(ZONE).toEpochSecond();
    }

    /** 旧个人点赞在严格超过当前日结算秒才翻期，沿用当秒仍处旧日的判断。 */
    private static long likeEnd(long now) {
        var date = Instant.ofEpochSecond(now).atZone(ZONE).toLocalDate();
        long midnight = date.atStartOfDay(ZONE).toEpochSecond();
        return now == midnight ? midnight : nextMidnight(now);
    }

    /** 原商店自动刷新类型2为下一个周一上海零点。 */
    private static long shopEnd(long now) {
        var date = Instant.ofEpochSecond(now).atZone(ZONE).toLocalDate();
        return date.with(TemporalAdjusters.next(DayOfWeek.MONDAY)).atStartOfDay(ZONE).toEpochSecond();
    }

    /** 按可信开服日锚定每七天的周期，缺可信值时赛季和周宝箱无起点。 */
    private static long seasonEnd(long openedAt, long now) {
        if (openedAt <= 0) {
            return 0;
        }
        long start = Instant.ofEpochSecond(openedAt).atZone(ZONE).toLocalDate().atStartOfDay(ZONE).toEpochSecond();
        long elapsed = Math.max(0, now - start);
        return start + (elapsed / SEASON_SECONDS + 1) * SEASON_SECONDS;
    }

    /** 错误码由统一 WS 边界使用，角色状态保持不写入。 */
    private static ResponseStatusException error(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
