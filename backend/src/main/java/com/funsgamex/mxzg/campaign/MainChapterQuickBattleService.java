/**
 * 主线快速战斗。按当前上海游戏日给出普通报价，在角色事务内校验报价、扣钻、发奖并保存原回执。
 * 收益沿用挂机计算及共享掉落分窗；快速战斗不消费普通宝箱的已累计时间。
 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.tavern.TavernPointService;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MainChapterQuickBattleService {
    /** 保留前置配置失败的后端原因，业务回包只返回可读提示。 */
    private static final Logger LOG = LoggerFactory.getLogger(MainChapterQuickBattleService.class);
    /** 日服和当前策划表的普通价格，按当日已成功次数取下一笔。 */
    private static final List<Integer> ORDINARY_COSTS = List.of(0, 50, 100, 200);
    /** system.quick_battle_level_need，达到该角色等级可快速战斗。 */
    private static final int MINIMUM_LEVEL = 20;
    /** system.idle_speed_up，每笔按 7,200 秒计算挂机收益。 */
    private static final int REWARD_SECONDS = 7_200;
    /** 与当前游戏服的自然日玩法统一。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 当前角色锁、等级、钻石扣费及统一资产版本。 */
    private final RoleRepository roles;
    /** 读取权威最高通关关卡。 */
    private final JdbcTemplate jdbc;
    /** 读写已成功的快速战斗记录。 */
    private final MainChapterQuickBattleRepository battles;
    /** 沿用原挂机基础收益、掉落及分窗规则。 */
    private final IdleRules idleRules;
    /** 用于当前通关阶段的酒馆点数上限。 */
    private final MainChapterRules chapters;
    /** 冻结同次挂机权益、活动控制与世界等级。 */
    private final IdleRewardInputService inputs;
    /** 持久保存宝箱与快速战斗共用的掉落窗口。 */
    private final MainChapterIdleStateRepository idleStates;
    /** 用真实酒馆余额判断确认提示并沿用上限。 */
    private final TavernPointService tavernPoints;
    /** 发放同次实际挂机奖励。 */
    private final RewardGrantService grants;
    /** 发奖成功后记入新的统一资产版本，令任务读取到最新次数。 */
    private final AssetSyncService sync;
    /** 事务提交后走统一奖励反馈，历史重试只返回已保存的反馈。 */
    private final RewardFeedbackService feedback;
    /** 用于上海自然日和本次发奖时刻，支持现有本机 GM 校时。 */
    private final GameClock clock;
    /** 成功回执用于任务计数；在原领取事务内通知任务服务重新读取。 */
    private final ApplicationEventPublisher events;

    /** 本游戏日的玩家报价；次数用完后，费用字段为 0。 */
    public record State(boolean unlocked, int usedCount, int maxCount, int costDiamonds,
                        long resetAt, boolean tavernFull) {}

    /** 初次发奖冻结的结果。历史报价只用于核对原意图，不能用于覆盖客户端最新报价。 */
    public record Receipt(String requestId, String receiptId, long assetRevision, State state,
                          RewardGrantResult actual, String roleId, RewardFeedbackService.Notice notice) {}

    /** 协议层按稳定码区分报价变化、未开放条件与余额不足。 */
    public static class Rejected extends RuntimeException {
        /** 业务失败对应的协议码。 */
        private final String code;

        /** 保存玩家可理解的拒绝原因和稳定业务码。 */
        public Rejected(String code, String message) {
            super(message);
            this.code = code;
        }

        /** 返回协议层使用的业务码。 */
        public String code() {
            return code;
        }
    }

    /** 装配快速战斗，计算及写资产均走当前权威服务。 */
    public MainChapterQuickBattleService(RoleRepository roles, JdbcTemplate jdbc, MainChapterQuickBattleRepository battles,
                                         IdleRules idleRules, MainChapterRules chapters, IdleRewardInputService inputs,
                                         MainChapterIdleStateRepository idleStates, TavernPointService tavernPoints,
                                         RewardGrantService grants, AssetSyncService sync, RewardFeedbackService feedback,
                                         GameClock clock, ApplicationEventPublisher events) {
        this.roles = roles;
        this.jdbc = jdbc;
        this.battles = battles;
        this.idleRules = idleRules;
        this.chapters = chapters;
        this.inputs = inputs;
        this.idleStates = idleStates;
        this.tavernPoints = tavernPoints;
        this.grants = grants;
        this.sync = sync;
        this.feedback = feedback;
        this.clock = clock;
        this.events = events;
    }

    /** 查询当前日次数、下次价格和酒馆满额状态，未做快速战斗时不新增操作记录。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State info(String roleId) {
        roles.lock(roleId);
        long resetAt = nextReset(clock.instant());
        int used = battles.used(roleId, resetAt);
        boolean unlocked = roles.findById(roleId).orElseThrow().level() >= MINIMUM_LEVEL;
        return state(unlocked, used, resetAt, unlocked && tavernFull(roleId, rewardStage(roleId)));
    }

    /**
     * 应用一次玩家已确认的报价。旧请求原样重放，跨日或同日报价已被另一笔使用时要求重新确认。
     * 发奖、掉落分窗、历史回执、任务进度和资产版本由同一角色事务提交。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt claim(String roleId, String requestId, long resetAt, int usedCount) {
        if (!RewardReceiptPayloads.validId(requestId) || resetAt < 1 || usedCount < 0 || usedCount > ORDINARY_COSTS.size()) {
            throw new IllegalArgumentException("快速战斗请求参数无效");
        }
        roles.lock(roleId);
        var saved = battles.receipt(roleId, requestId);
        if (saved != null) {
            if (saved.state().resetAt() != resetAt || saved.state().usedCount() != usedCount + 1) {
                throw new Rejected("QUICK_BATTLE_REQUEST_CONFLICT", "快速战斗请求编号已用于其他次数");
            }
            return saved;
        }
        var role = roles.findById(roleId).orElseThrow();
        if (role.level() < MINIMUM_LEVEL) {
            throw new Rejected("QUICK_BATTLE_LOCKED", "角色达到 20 级后开放快速战斗");
        }
        Instant now = clock.instant();
        int used = battles.used(roleId, resetAt);
        if (resetAt != nextReset(now) || used != usedCount) {
            throw new Rejected("QUICK_BATTLE_QUOTE_CHANGED", "快速战斗次数已变化，请重新确认");
        }
        if (used >= ORDINARY_COSTS.size()) {
            throw new Rejected("QUICK_BATTLE_LIMIT", "今日快速战斗次数已用完");
        }
        int cost = ORDINARY_COSTS.get(used);
        if (cost > 0 && !roles.debitDiamonds(roleId, cost)) {
            throw new Rejected("QUICK_BATTLE_DIAMONDS", "钻石不足");
        }
        int stage = rewardStage(roleId);
        idleStates.initializeForChallenge(roleId, role.basics().createdAtSeconds());
        var before = idleStates.require(roleId);
        var random = ThreadLocalRandom.current();
        var input = currentInput(roleId, now.getEpochSecond());
        var calculation = IdleRewardUtils.calculate(idleRules, input, stage, REWARD_SECONDS,
                before.dropSeconds(), before.counters(), random);
        var actual = grants.grant(roleId, calculation.outcome().total().stream()
                        .map(reward -> new RewardGrantService.Reward(reward.itemId(), reward.quantity())).toList(),
                new RewardGrantService.Context(now.getEpochSecond(), chapters.tavernLimit(stage)), random);
        idleStates.advanceDropWindow(roleId, before, calculation.ordinary().dropSeconds(), calculation.ordinary().counters());
        sync.changed(roleId);
        var receiptId = UUID.randomUUID().toString();
        long revision = roles.revision(roleId);
        var notice = feedback.publish(receiptId, roleId, revision, RewardFeedbackService.Mode.POPUP, actual, requestId);
        var receipt = new Receipt(requestId, receiptId, revision, state(true, used + 1, resetAt, tavernFull(roleId, stage)),
                actual, roleId, notice);
        battles.save(receipt);
        events.publishEvent(new QuestProgressEvent(roleId, QuestMetric.QUICK_BATTLE));
        return receipt;
    }

    /** 旧快速战斗使用最高已通关关卡，首关未通关时取第 1 关。 */
    private int rewardStage(String roleId) {
        var stages = jdbc.query("SELECT max_cleared FROM game_main_chapter WHERE role_id=?",
                (row, index) -> row.getInt(1), roleId);
        return stages.isEmpty() ? 1 : Math.max(1, stages.getFirst());
    }

    /** 按最新的酒馆余额及本关上限判断是否需要提醒。 */
    private boolean tavernFull(String roleId, int stage) {
        return tavernPoints.isFull(roleId, chapters.tavernLimit(stage));
    }

    /** 冻结本次权威收益输入。活动控制或权益缺失时退回玩家提示，让同笔事务整体回滚。 */
    private IdleRewardInputService.Input currentInput(String roleId, long now) {
        try {
            return inputs.current(roleId, now);
        } catch (IllegalArgumentException | IllegalStateException missing) {
            try {
                LOG.warn("快速战斗收益前置未就绪，角色={}，本笔回滚", roleId, missing);
            } catch (RuntimeException ignored) {
                // 日志出口失败时仍交付原业务拒绝。
            }
            var rejected = new Rejected("QUICK_BATTLE_INPUT_UNAVAILABLE", "本区服挂机收益尚未就绪，请稍后重试");
            rejected.initCause(missing);
            throw rejected;
        }
    }

    /** 从已使用次数生成当前日的下一笔报价。 */
    private static State state(boolean unlocked, int used, long resetAt, boolean tavernFull) {
        int cost = used < ORDINARY_COSTS.size() ? ORDINARY_COSTS.get(used) : 0;
        return new State(unlocked, used, ORDINARY_COSTS.size(), cost, resetAt, tavernFull);
    }

    /** 以服务器游戏时刻所在的上海自然日计算下一次重置的 Unix 秒。 */
    private static long nextReset(Instant now) {
        return now.atZone(SERVER_ZONE).toLocalDate().plusDays(1).atStartOfDay(SERVER_ZONE).toEpochSecond();
    }
}
