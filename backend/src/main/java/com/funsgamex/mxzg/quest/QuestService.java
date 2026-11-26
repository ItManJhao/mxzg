/**
 * 每日任务、日活跃宝箱及成就的权威服务。
 * 源领域在角色锁内报告已发生的变化，任务进度与原事务一起提交；领取沿统一发奖和持久回执。
 * 客户端读取当前角色的任务快照，达成提示仅在真正提交后发一次。
 */
package com.funsgamex.mxzg.quest;

import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.quest.QuestRepository.MetricKey;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
public class QuestService {
    /** 每日任务在上海自然日零点重置，任务快照携带结束时刻的 Unix 秒。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 提示交付异常只记日志，玩家可用最新快照继续领奖。 */
    private static final Logger LOG = LoggerFactory.getLogger(QuestService.class);
    /** 旧端先展示可领，再展示进行中，已领取移到最后；同组按原配置编号顺排。 */
    private static final Comparator<QuestTask> DISPLAY_ORDER = Comparator
            .comparingInt(QuestService::displayPriority).thenComparingInt(QuestTask::id);
    /** 竞技场最优名次只存一笔，所有成就档共用同一个实际记录。 */
    private static final MetricKey ARENA_BEST_RANK = new MetricKey(QuestMetric.ARENA_MAX_RANK, 0);
    /** 角色锁和领取后的权威资产版本。 */
    private final RoleRepository roles;
    /** 已有的五星实际发放和升星回执账本。 */
    private final HeroRepository heroes;
    /** 当前角色的补充计数、成就历史及领奖凭据。 */
    private final QuestRepository repository;
    /** 所有角色共用的原配置，不保存客户端进度。 */
    private final QuestRules rules;
    /** 使用游戏服时间，支持测试时钟与上海日界。 */
    private final GameClock clock;
    /** 使用已有发奖入口修改真实钱包和库存。 */
    private final RewardGrantService grants;
    /** 统一获得窗，按实际到账登记通知。 */
    private final RewardFeedbackService feedback;
    /** 保存原通知字节及摘要，回包失败可找回同一个回执。 */
    private final RewardReceiptPayloads receipts;
    /** 仅交付提交后的任务失效事件和首次完成提示。 */
    private final ApplicationEventPublisher events;
    /** 与日常表匹配的计数类型，控制是否需要登记日计数。 */
    private final Set<MetricKey> dailyKeys;
    /** 成就的全量条件类型，刷新权威快照时按类型匹配条件。 */
    private final Set<QuestMetric> achievementMetrics;
    /** 成就实际配置的指标和条件，跳过没有对应任务的低星和非目标品质。 */
    private final Set<MetricKey> achievementKeys;

    /** 原任务和宝箱有独立资格，成就周期始终为 0。 */
    public enum QuestKind { DAILY, ACHIEVEMENT, MILESTONE }

    /** 一项已开放任务的原标题、实际进度、奖励及原前往入口，destination 为空表示没有跳转。 */
    public record QuestTask(int id, String title, long current, long target, boolean claimed, List<Reward> rewards,
                            String destination) {}
    /** 当前日活跃档及预计获得的配置奖励。 */
    public record QuestMilestone(int id, int points, boolean claimed, List<Reward> rewards) {}
    /** 本事务首次达成的配置档及用于顶部提示的标题。 */
    public record QuestCompletion(int id, String title) {}
    /** 当前上海日和已接取的成就链组成的权威展示状态。 */
    public record QuestSnapshot(long resetAt, int activityPoints, List<QuestTask> daily,
                                List<QuestTask> achievements, List<QuestMilestone> milestones) {}
    /** 领取时返回最新任务状态与该请求原始实际奖励，重放沿用同一奖励回执。 */
    public record ClaimResult(QuestSnapshot snapshot, RewardFeedbackService.Notice rewardNotice) {}
    /** 服务器判定已达标的领奖命令，points 只在日常任务实际领取时增加。 */
    private record ClaimPlan(List<Reward> rewards, int points) {}
    /** 一次请求冻结的查询事实，保留其 Shanghai 自然日以免跨零点混合数据。 */
    private record Progress(String roleId, long resetAt, QuestRepository.Actor actor,
                            Map<MetricKey, Long> daily, Map<MetricKey, Long> lifetime, Map<Integer, Long> heroLevels,
                            Map<Integer, Long> completions) {}

    /** 装配事务、配置和真实发奖依赖，校验所有原表奖励都可走通用分发。 */
    QuestService(RoleRepository roles, HeroRepository heroes, QuestRepository repository, QuestRules rules,
                 GameClock clock, RewardGrantService grants, RewardFeedbackService feedback, RewardReceiptPayloads receipts,
                 ApplicationEventPublisher events) {
        this.roles = roles;
        this.heroes = heroes;
        this.repository = repository;
        this.rules = rules;
        this.clock = clock;
        this.grants = grants;
        this.feedback = feedback;
        this.receipts = receipts;
        this.events = events;
        dailyKeys = rules.keys(rules.config().daily());
        achievementKeys = rules.keys(rules.config().achievements());
        achievementMetrics = achievementKeys.stream().map(MetricKey::metric).collect(Collectors.toUnmodifiableSet());
        var items = new java.util.HashSet<Integer>();
        rules.config().daily().forEach(task -> task.rewards().forEach(reward -> items.add(reward.itemId())));
        rules.config().achievements().forEach(task -> task.rewards().forEach(reward -> items.add(reward.itemId())));
        rules.config().milestones().forEach(box -> box.rewards().forEach(reward -> items.add(reward.itemId())));
        grants.requireSupported(items);
    }

    /** 供当前已鉴权的在线角色读取两页任务和红点，同一次读取使用一致的数据库快照。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public QuestSnapshot snapshot(String roleId) {
        return snapshot(loadProgress(roleId, resetAt(clock.epochSeconds())));
    }

    /**
     * 使用角色锁检查当日或永久成就资格，与统一奖励同事务写入成功回执。
     * @param observedResetAt 玩家看到的日界 Unix 秒，成就没有日界限制。
     * @param operationId 本次业务幂等键，相同键必须匹配任务及领取周期。
     * @param requestId 当前信封的请求关联，奖励通知使用原有效业务请求号。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ClaimResult claim(String roleId, QuestKind kind, int id, long observedResetAt,
            String operationId, String requestId) {
        if (kind == null || id <= 0 || !RewardReceiptPayloads.validId(operationId)
                || (kind != QuestKind.ACHIEVEMENT && observedResetAt <= 0)) {
            throw failure(HttpStatus.BAD_REQUEST, "QUEST_REQUEST_INVALID");
        }
        roles.lock(roleId);
        long now = clock.epochSeconds();
        long currentResetAt = resetAt(now);
        long period = kind == QuestKind.ACHIEVEMENT ? 0 : observedResetAt;
        QuestRepository.Receipt previous = repository.receipt(roleId, operationId);
        if (previous != null) {
            return restore(roleId, kind, id, period, currentResetAt, operationId, previous);
        }
        if (period > 0 && period != currentResetAt) {
            throw failure(HttpStatus.CONFLICT, "QUEST_RESET");
        }
        var progress = loadProgress(roleId, currentResetAt);
        var before = snapshot(progress);
        var plan = claimPlan(kind, id, before);
        if (kind == QuestKind.ACHIEVEMENT && !progress.completions().containsKey(id)) {
            long value = before.achievements().stream().filter(task -> task.id() == id).findFirst().orElseThrow().current();
            repository.complete(roleId, id, value, now);
        }
        var actual = grants.grant(roleId, plan.rewards(), new RewardGrantService.Context(now, 0),
                ThreadLocalRandom.current());
        String receiptId = UUID.randomUUID().toString();
        var notice = feedback.publish(receiptId, roleId, roles.revision(roleId), RewardFeedbackService.Mode.POPUP,
                actual, operationId);
        var payload = receipts.freeze(notice);
        repository.saveReceipt(roleId, operationId,
                new QuestRepository.Receipt(kind.name(), id, period, plan.points(), payload.json(), payload.hash()));
        registerChange(roleId, List.of());
        return new ClaimResult(snapshot(loadProgress(roleId, currentResetAt)), notice);
    }

    /**
     * 同步处理实质业务事件。来源已经取得角色锁并判断了原操作的幂等性。
     * 已捕获期次时间的来源与玩法使用同一日界；操作回滚时增量、成就标记和通知一起撤销。
     */
    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onSourceChanged(QuestProgressEvent event) {
        if (event.amount() < 0 || event.condition() < 0 || event.occurredAtSeconds() < 0 || event.metric() == null
                || event.roleId() == null || event.roleId().isBlank()) {
            throw new IllegalArgumentException("任务来源事件无效");
        }
        if (event.metric() == ARENA_BEST_RANK.metric()) {
            recordArenaRank(event);
            return;
        }
        var key = new MetricKey(event.metric(), event.condition());
        boolean daily = dailyKeys.contains(key);
        boolean achievement = event.amount() == 0
                ? achievementMetrics.contains(event.metric()) : achievementKeys.contains(key);
        if (!daily && !achievement) {
            return;
        }
        long now = event.occurredAtSeconds() == 0 ? clock.epochSeconds() : event.occurredAtSeconds();
        long period = resetAt(now);
        var metric = event.metric();
        String roleId = event.roleId();
        if (event.amount() > 0 && metric != QuestMetric.LOGIN) {
            if (daily) {
                repository.increase(roleId, period, metric, event.condition(), event.amount());
            }
            if (achievement && metric != QuestMetric.DAILY_DUNGEON_CHALLENGE) {
                repository.increase(roleId, 0, metric, event.condition(), event.amount());
            }
        }
        if (metric == QuestMetric.LOGIN) {
            // 登录只初始化静默历史；旧客户端也不会在每次进入时重复播成就。
            recordCompleted(loadProgress(roleId, period), null, now, false);
            registerChange(roleId, List.of());
        } else if (achievement) {
            registerChange(roleId, recordCompleted(loadProgress(roleId, period), metric, now, true));
        } else {
            registerChange(roleId, List.of());
        }
    }

    /** 只有正式榜的正名次能改善历史；离榜、掉名次和重试保留已经达到的档位。 */
    private void recordArenaRank(QuestProgressEvent event) {
        if (event.condition() != ARENA_BEST_RANK.condition() || event.amount() <= 0) {
            throw new IllegalArgumentException("竞技场历史名次来源无效");
        }
        if (repository.observeArenaRank(event.roleId(), event.amount())) {
            long now = clock.epochSeconds();
            var progress = loadProgress(event.roleId(), resetAt(now));
            registerChange(event.roleId(), recordCompleted(progress, event.metric(), now, true));
        }
    }

    /** 复用原发奖回执确认重试，当前自然日已经切换时仍返回最新任务快照。 */
    private ClaimResult restore(String roleId, QuestKind kind, int id, long period, long currentResetAt,
            String operationId, QuestRepository.Receipt previous) {
        if (!previous.kind().equals(kind.name()) || previous.id() != id || previous.period() != period) {
            throw failure(HttpStatus.CONFLICT, "QUEST_REQUEST_CONFLICT");
        }
        var notice = receipts.read(previous.noticeJson(), previous.noticeHash(), RewardFeedbackService.Notice.class);
        if (notice == null || !roleId.equals(notice.roleId()) || !operationId.equals(notice.requestId())
                || !RewardReceiptPayloads.validId(notice.receiptId())) {
            throw new IllegalStateException("日常成就发奖回执归属不符");
        }
        return new ClaimResult(snapshot(loadProgress(roleId, currentResetAt)), notice);
    }

    /** 校验该档展示、完成及未领取三项资格，奖励始终由服务器原配置产生。 */
    private ClaimPlan claimPlan(QuestKind kind, int id, QuestSnapshot before) {
        if (kind == QuestKind.MILESTONE) {
            var box = before.milestones().stream().filter(item -> item.id() == id).findFirst()
                    .orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "QUEST_NOT_FOUND"));
            requireClaimable(box.claimed(), before.activityPoints() >= box.points());
            return new ClaimPlan(box.rewards(), 0);
        }
        var tasks = kind == QuestKind.DAILY ? before.daily() : before.achievements();
        var task = tasks.stream().filter(item -> item.id() == id).findFirst()
                .orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "QUEST_NOT_FOUND"));
        requireClaimable(task.claimed(), task.current() >= task.target());
        int points = kind == QuestKind.DAILY ? rules.config().daily().stream().filter(row -> row.id() == id)
                .findFirst().orElseThrow().points() : 0;
        return new ClaimPlan(task.rewards(), points);
    }

    /** 已领取或未达标均无任何发奖副作用。 */
    private static void requireClaimable(boolean claimed, boolean complete) {
        if (claimed) {
            throw failure(HttpStatus.CONFLICT, "QUEST_ALREADY_CLAIMED");
        }
        if (!complete) {
            throw failure(HttpStatus.CONFLICT, "QUEST_NOT_COMPLETE");
        }
    }

    /** 读取所有任务构造快照时共享的真实事实，减少每档重复查询。 */
    private Progress loadProgress(String roleId, long period) {
        var actor = repository.actor(roleId);
        Map<MetricKey, Long> daily = new HashMap<>();
        Map<MetricKey, Long> lifetime = new HashMap<>();
        if (actor.level() < rules.config().requiredLevel()) {
            return new Progress(roleId, period, actor, daily, lifetime, Map.of(), Map.of());
        }
        for (var row : repository.counters(roleId, period)) {
            var counters = row.period() == 0 ? lifetime : daily;
            counters.put(row.key(), row.amount());
        }
        return new Progress(roleId, period, actor, daily, lifetime, repository.heroLevels(roleId),
                repository.completions(roleId));
    }

    /** 将普通领域事实、当天回执和已接取链投影为按旧端排序的任务表。 */
    private QuestSnapshot snapshot(Progress progress) {
        var config = rules.config();
        if (progress.actor().level() < config.requiredLevel()) {
            return new QuestSnapshot(progress.resetAt(), 0, List.of(), List.of(), List.of());
        }
        var claims = repository.claims(progress.roleId(), progress.resetAt());
        var dailyClaimed = claimedIds(claims, QuestKind.DAILY);
        var achievementClaimed = claimedIds(claims, QuestKind.ACHIEVEMENT);
        var milestoneClaimed = claimedIds(claims, QuestKind.MILESTONE);
        int activity = claims.stream().mapToInt(QuestRepository.Claim::points).sum();
        var daily = config.daily().stream()
                .filter(task -> progress.actor().level() >= task.requiredLevel())
                .map(task -> present(task, Math.min(task.target(), dailyProgress(progress, task)), dailyClaimed))
                .sorted(DISPLAY_ORDER).toList();
        var achievements = config.achievements().stream()
                .filter(task -> task.previousId() == 0 || achievementClaimed.contains(task.previousId()))
                .filter(task -> !achievementClaimed.contains(task.id()) || !rules.hasSuccessor(task.id()))
                .map(task -> present(task, achievementProgress(progress, task), achievementClaimed))
                .sorted(DISPLAY_ORDER).toList();
        var milestones = config.milestones().stream()
                .map(box -> new QuestMilestone(box.id(), box.points(), milestoneClaimed.contains(box.id()), box.rewards()))
                .toList();
        return new QuestSnapshot(progress.resetAt(), activity, daily, achievements, milestones);
    }

    /** 从当前角色的回执去重集合中取指定来源业务。 */
    private static Set<Integer> claimedIds(List<QuestRepository.Claim> claims, QuestKind kind) {
        return claims.stream().filter(claim -> kind.name().equals(claim.kind()))
                .map(QuestRepository.Claim::id).collect(Collectors.toUnmodifiableSet());
    }

    /** 旧任务排序权重，编号相同时由调用方继续按编号排序。 */
    private static int displayPriority(QuestTask task) {
        if (task.claimed()) {
            return 2;
        }
        return task.current() >= task.target() ? 0 : 1;
    }

    /** 转换一条原配置及当前权威进度，展示的奖励列表不可被请求提交或更改。 */
    private static QuestTask present(QuestRules.Task task, long value, Set<Integer> claimed) {
        return new QuestTask(task.id(), task.title(), value, task.target(), claimed.contains(task.id()),
                task.rewards(), destination(task));
    }

    /** 保留已接通的原玩法目的地；梦境与两类市场均可从各自任务前往。 */
    private static String destination(QuestRules.Task task) {
        return switch (task.metric()) {
            case LOGIN, CHALLENGE_CLAN_DUNGEON, BEAT_CLAN_DUNGEON, ACCEPT_TAVERN_TASK,
                    PASS_ADVEN, ADVEN_LEVEL, COMBINE_RUNE, PROPHECY, SACRIFICE -> "";
            case SHOP_BUY -> task.condition() == 100100 || task.condition() == 100800 ? task.destination() : "";
            default -> task.destination();
        };
    }

    /** 优先复用按当日持久回执计算的次数，未接入的真实计数自然保持零。 */
    private long dailyProgress(Progress progress, QuestRules.Task task) {
        var key = new MetricKey(task.metric(), task.condition());
        return progress.daily().computeIfAbsent(key, ignored -> switch (task.metric()) {
            // 已鉴权的在线角色过零点也完成当日登录，和旧端常驻会话的零点事件行为一致。
            case LOGIN -> progress.actor().lastLogin() > 0 ? 1L : 0L;
            case ARENA_CHALLENGE -> repository.arenaChallenges(progress.roleId(), dayStart(progress.resetAt()),
                    progress.resetAt());
            case QUICK_BATTLE -> repository.quickBattles(progress.roleId(), progress.resetAt());
            case CLAN_DONATE -> repository.guildDonations(progress.roleId(), progress.resetAt());
            default -> 0L;
        });
    }

    /** 核对原任务条件；竞技场名次使用持久最优记录，积分仍读取当前角色值。 */
    private long achievementProgress(Progress progress, QuestRules.Task task) {
        var key = new MetricKey(task.metric(), task.condition());
        return progress.lifetime().computeIfAbsent(key, ignored -> switch (task.metric()) {
            case ADVENTURE_LEVEL -> (long) progress.actor().level();
            case ARENA_SCORE -> (long) progress.actor().arenaScore();
            case ARENA_MAX_RANK -> progress.lifetime().getOrDefault(ARENA_BEST_RANK, Long.MAX_VALUE)
                    <= task.condition() ? 1L : 0L;
            case ROLE_MAX_FIGHTING -> (long) progress.actor().maxPower();
            case JOIN_CLAN -> repository.hasJoinedGuild(progress.roleId()) ? 1L : 0L;
            case DAILY_DUNGEON_CHALLENGE -> repository.dungeonChallenges(progress.roleId());
            case HAD_HIGH_LEVEL_HERO -> progress.heroLevels().entrySet().stream()
                    .filter(level -> level.getKey() >= task.condition()).mapToLong(Map.Entry::getValue).sum();
            case GET_HERO -> task.condition() == 5 ? (long) heroes.countFiveStarAcquisitions(progress.roleId()) : 0L;
            default -> 0L;
        });
    }

    /** 旧成就通知扫描本次变化类型的全部档，前置领取只决定列表中当前可以领哪档。 */
    private List<QuestCompletion> recordCompleted(Progress progress, QuestMetric metric, long now, boolean notify) {
        List<QuestCompletion> completed = new ArrayList<>();
        if (progress.actor().level() < rules.config().requiredLevel()) {
            return completed;
        }
        for (var task : rules.config().achievements()) {
            if ((metric != null && task.metric() != metric) || progress.completions().containsKey(task.id())) {
                continue;
            }
            long value = achievementProgress(progress, task);
            if (value >= task.target()) {
                repository.complete(progress.roleId(), task.id(), value, now);
                if (notify) {
                    completed.add(new QuestCompletion(task.id(), task.title()));
                }
            }
        }
        return completed;
    }

    /** 聚合同一事务内逐次来源变化，提交后每个角色仅发送一批，回滚时不交付。 */
    @SuppressWarnings("unchecked")
    private void registerChange(String roleId, List<QuestCompletion> completed) {
        Map<String, List<QuestCompletion>> batch =
                (Map<String, List<QuestCompletion>>) TransactionSynchronizationManager.getResource(this);
        if (batch == null) {
            batch = new LinkedHashMap<>();
            TransactionSynchronizationManager.bindResource(this, batch);
            var pending = batch;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                /** 独立内层事务应拥有独立通知批次。 */
                @Override
                public void suspend() {
                    clearBatch(pending);
                }

                /** 恢复外层事务继续写入原批次。 */
                @Override
                public void resume() {
                    TransactionSynchronizationManager.bindResource(QuestService.this, pending);
                }

                /** 仅在业务提交后为受影响角色发送该事务的唯一通知。 */
                @Override
                public void afterCommit() {
                    pending.forEach((role, notices) -> {
                        try {
                            events.publishEvent(new QuestChanged(role, notices));
                        } catch (RuntimeException failure) {
                            LOG.warn("任务已提交但通知交付失败：roleId={}", role, failure);
                        }
                    });
                }

                /** 提交及回滚均移除本事务绑定。 */
                @Override
                public void afterCompletion(int status) {
                    clearBatch(pending);
                }
            });
        }
        batch.computeIfAbsent(roleId, ignored -> new ArrayList<>()).addAll(completed);
    }

    /** 仅解绑本批次，避免误清理已经恢复的外层事务。 */
    private void clearBatch(Map<String, List<QuestCompletion>> batch) {
        if (TransactionSynchronizationManager.getResource(this) == batch) {
            TransactionSynchronizationManager.unbindResource(this);
        }
    }

    /** 返回当前上海自然日结束的 Unix 秒。 */
    private static long resetAt(long now) {
        return Instant.ofEpochSecond(now).atZone(SERVER_ZONE).toLocalDate().plusDays(1)
                .atStartOfDay(SERVER_ZONE).toEpochSecond();
    }

    /** 从唯一日界还原当天开始的 Unix 秒。 */
    private static long dayStart(long resetAt) {
        return Instant.ofEpochSecond(resetAt).atZone(SERVER_ZONE).toLocalDate().minusDays(1)
                .atStartOfDay(SERVER_ZONE).toEpochSecond();
    }

    /** 业务错误交给现有连接错误出口，客端可以按稳定原因显示。 */
    private static ResponseStatusException failure(HttpStatus status, String reason) {
        return new ResponseStatusException(status, reason);
    }
}
