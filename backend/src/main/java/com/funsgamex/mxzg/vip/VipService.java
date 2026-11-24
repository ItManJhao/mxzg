/**
 * 女神契约任务与领奖。首包及资产通知读取同一角色锁下的进度，领取复用通用发奖与回执。
 * 任务由业务持久状态计算，VIP 等级与钱包、领取记录在同一事务提交。
 */
package com.funsgamex.mxzg.vip;

import com.funsgamex.mxzg.arena.ArenaRepository;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.campaign.MainChapterRules;
import com.funsgamex.mxzg.campaign.MainChapterQuickBattleRepository;
import com.funsgamex.mxzg.dungeon.DailyDungeonRepository;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import com.funsgamex.mxzg.tower.TowerRepository;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VipService {
    /** 领取和重试使用当前 WebSocket 连接持有的已认证凭证。 */
    private final SessionService sessions;
    /** 任务资格和发奖共用角色行锁及持久资产版本。 */
    private final RoleRepository roles;
    /** 契约任务目录由同源配置提供，客户端不提交奖励内容。 */
    private final VipRules rules;
    /** 读取角色及成长进度，保存当前档位和领取记录。 */
    private final JdbcTemplate jdbc;
    /** 原主线的酒馆上限规则，用于通用发奖上下文。 */
    private final MainChapterRules chapters;
    /** 通用发奖入口，由钱包写入登记统一资产快照。 */
    private final RewardGrantService grants;
    /** 在线反馈随领取事务提交，重试沿用历史反馈。 */
    private final RewardFeedbackService feedback;
    /** 冻结原成功回执并校验存储摘要。 */
    private final RewardReceiptPayloads payloads;
    /** 提供本次发奖使用的可信游戏时间。 */
    private final GameClock clock;
    /** 按真实结算累计竞技场参与，胜负均计，未参加时为零。 */
    private final ArenaRepository arena;
    /** 读取爬塔事务持久化的最高通关层，和里程碑是否领取无关。 */
    private final TowerRepository tower;
    /** 按已结算的挑战与扫荡累计五类日常副本参与次数。 */
    private final DailyDungeonRepository dungeon;
    /** 读取角色累计获得的五星英雄记录，英雄被消耗后仍有效。 */
    private final HeroRepository heroes;
    /** 读取历次成功快速战斗的持久总数，跨日不重置。 */
    private final MainChapterQuickBattleRepository quickBattles;

    /** 当前档的任务。进度为空表示该条件的玩法数据尚未接入。 */
    public record Task(int id, int target, Integer progress, boolean claimed) {}

    /** 当前服务器 VIP 等级及同档任务进度。 */
    public record State(int level, List<Task> tasks) {}

    /** 已提交的单次真实发奖及共享反馈，固定请求编号和资产版本供重试。 */
    public record Receipt(String requestId, String receiptId, String roleId, long assetRevision, int taskId,
                          RewardGrantResult actual, RewardFeedbackService.Notice notice) {}

    /** 查询到的角色等级、VIP 档位和历史最高通关关卡。 */
    private record Progress(int level, int vipLevel, int maxCleared) {}

    /** 装配鉴权、任务配置、各玩法的持久进度、统一发奖和回执存储。 */
    public VipService(SessionService sessions, RoleRepository roles, VipRules rules, JdbcTemplate jdbc,
            MainChapterRules chapters, RewardGrantService grants, RewardFeedbackService feedback,
            RewardReceiptPayloads payloads, GameClock clock, ArenaRepository arena, TowerRepository tower,
            DailyDungeonRepository dungeon, HeroRepository heroes, MainChapterQuickBattleRepository quickBattles) {
        this.sessions = sessions;
        this.roles = roles;
        this.rules = rules;
        this.jdbc = jdbc;
        this.chapters = chapters;
        this.grants = grants;
        this.feedback = feedback;
        this.payloads = payloads;
        this.clock = clock;
        this.arena = arena;
        this.tower = tower;
        this.dungeon = dungeon;
        this.heroes = heroes;
        this.quickBattles = quickBattles;
    }

    /** 调用方在角色锁内读取登录、重连或资产通知需要的当前契约状态。 */
    public State current(String roleId) {
        return state(roleId, progress(roleId));
    }

    /**
     * 当前档的可领任务由服务端原子发奖，同请求恢复原回执；收齐本档时同时提升实际 VIP。
     * @param token 当前已鉴权的 Bearer 凭证。
     * @param requestId 请求的规范小写 UUID，重复键只允许恢复原任务结果。
     * @param taskId 主配置里的任务编号。
     * @return 已提交的到账与展示凭据，客户端资产仍从统一快照更新。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt claim(String token, String requestId, int taskId) {
        if (!RewardReceiptPayloads.validId(requestId) || taskId <= 0) {
            throw reject("VIP_REQUEST_INVALID");
        }
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        sessions.requireRole(token);
        var previous = receipt(roleId, requestId);
        if (previous != null) {
            if (previous.taskId() != taskId) {
                throw reject("VIP_REQUEST_CONFLICT");
            }
            return previous;
        }

        var progress = progress(roleId);
        var claimed = claimedIds(roleId);
        if (claimed.contains(taskId)) {
            throw reject("VIP_TASK_CLAIMED");
        }
        var entries = rules.entries(progress.vipLevel());
        var entry = entries.stream().filter(row -> row.id() == taskId).findFirst()
            .orElseThrow(() -> reject("VIP_TASK_TIER"));
        Integer actualProgress = taskProgress(roleId, progress, entry);
        if (actualProgress == null) {
            throw reject("VIP_TASK_UNAVAILABLE");
        }
        if (actualProgress < entry.target()) {
            throw reject("VIP_TASK_NOT_REACHED");
        }

        var context = new RewardGrantService.Context(clock.epochSeconds(), chapters.tavernLimit(progress.maxCleared()));
        var actual = grants.grant(roleId, entry.rewards(), context, ThreadLocalRandom.current());
        if (entries.stream().allMatch(row -> row.id() == taskId || claimed.contains(row.id()))) {
            jdbc.update("UPDATE game_role SET goddess_vip=? WHERE id=?", progress.vipLevel() + 1, roleId);
        }
        long revision = roles.revision(roleId);
        String receiptId = UUID.randomUUID().toString();
        var notice = feedback.publish(receiptId, roleId, revision, RewardFeedbackService.Mode.POPUP, actual, requestId);
        var result = new Receipt(requestId, receiptId, roleId, revision, taskId, actual, notice);
        var frozen = payloads.freeze(result);
        jdbc.update("""
            INSERT INTO game_vip_task_claim(role_id,task_id,request_id,receipt_id,asset_revision,payload_json,payload_hash)
            VALUES (?,?,?,?,?,?,?)
            """, roleId, taskId, requestId, receiptId, revision, frozen.json(), frozen.hash());
        return result;
    }

    /** 统一投影当前档任务；未接入条件保留配置位置，进度为空。 */
    private State state(String roleId, Progress progress) {
        var entries = rules.entries(progress.vipLevel());
        if (entries.isEmpty()) {
            return new State(progress.vipLevel(), List.of());
        }
        var claimed = claimedIds(roleId);
        return new State(progress.vipLevel(), entries.stream()
            .map(row -> new Task(row.id(), row.target(), taskProgress(roleId, progress, row), claimed.contains(row.id())))
            .toList());
    }

    /** 主线记录在新号首次读取前可能还未初始化，此时最高通关为零。 */
    private Progress progress(String roleId) {
        return jdbc.queryForObject("""
            SELECT r.role_level,r.goddess_vip,COALESCE(c.max_cleared,0) AS max_cleared
            FROM game_role r LEFT JOIN game_main_chapter c ON r.id=c.role_id WHERE r.id=?
            """, (row, index) -> new Progress(row.getInt("role_level"), row.getInt("goddess_vip"),
                row.getInt("max_cleared")), roleId);
    }

    /** 按原任务定义读取各玩法的实际进度，尚未接通的档位返回空进度。 */
    private Integer taskProgress(String roleId, Progress progress, VipRules.Entry entry) {
        if (progress.vipLevel() > VipRules.LAST_ACTIVE_LEVEL) {
            return null;
        }
        return switch (entry.type()) {
            case "PASS_MAIN_LEVEL" -> progress.maxCleared();
            case "ADVENTURE_LEVEL" -> progress.level();
            case "ARENA_CHALLENGE" -> arena.settledChallenges(roleId);
            case "TOWER_LEVEL" -> tower.highestCleared(roleId);
            case "QUICK_BATTLE" -> quickBattles.totalSuccessful(roleId);
            case "DAILY_DUNGEON_CHALLENGE" -> dungeon.participationCount(roleId);
            case "GET_HERO" -> entry.condition() == 5 ? heroes.countFiveStarAcquisitions(roleId) : null;
            case "HAD_HIGH_LEVEL_HERO" -> boundedCount(jdbc.queryForObject(
                "SELECT COUNT(*) FROM game_hero WHERE role_id=? AND hero_level>=?", Long.class, roleId, entry.condition()));
            // 首次十连的固定英雄不会增加高级保底计数；任务按旧召唤事件的本次实际次数取值。
            case "SUMMON" -> entry.condition() == 3 ? boundedCount(jdbc.queryForObject("""
                SELECT COALESCE(SUM(summon_count),0) FROM game_hero_summon_receipt WHERE role_id=? AND pool='ADVANCED'
                """, Long.class, roleId)) : null;
            default -> null;
        };
    }

    /** 限制超过协议整型范围的长期计数，仍保留对所有配置目标的达成判断。 */
    private static int boundedCount(long count) {
        return (int) Math.min(count, Integer.MAX_VALUE);
    }

    /** 成功回执表同时是本角色真实的已领集合。 */
    private Set<Integer> claimedIds(String roleId) {
        return Set.copyOf(jdbc.queryForList("SELECT task_id FROM game_vip_task_claim WHERE role_id=?", Integer.class, roleId));
    }

    /** 首先按角色及原请求键恢复成功回执，校验冻结归属与通知身份。 */
    private Receipt receipt(String roleId, String requestId) {
        return jdbc.query("""
            SELECT task_id,receipt_id,asset_revision,payload_json,payload_hash FROM game_vip_task_claim
            WHERE role_id=? AND request_id=?
            """, row -> {
                if (!row.next()) {
                    return null;
                }
                var stored = payloads.read(row.getString("payload_json"), row.getString("payload_hash"), Receipt.class);
                if (stored == null || !requestId.equals(stored.requestId()) || !roleId.equals(stored.roleId())
                        || !row.getString("receipt_id").equals(stored.receiptId()) || row.getInt("task_id") != stored.taskId()
                        || row.getLong("asset_revision") != stored.assetRevision() || stored.actual() == null
                        || !roleId.equals(stored.actual().roleId()) || stored.notice() == null
                        || !roleId.equals(stored.notice().roleId()) || !requestId.equals(stored.notice().requestId())
                        || !stored.receiptId().equals(stored.notice().receiptId())
                        || stored.notice().assetRevision() != stored.assetRevision()) {
                    throw new IllegalStateException("VIP 契约任务历史回执不完整或归属错误");
                }
                return stored;
            }, roleId, requestId);
    }

    /** 业务拒绝沿现有 WebSocket 错误投影处理。 */
    private static ResponseStatusException reject(String code) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
}
