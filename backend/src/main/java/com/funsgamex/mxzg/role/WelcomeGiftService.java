/**
 * 新手赠礼领取事务。角色锁内读取命名资格与原回执，
 * 真实入账和回执同事务保存，成功后复用统一资产快照和发奖通知。
 */
package com.funsgamex.mxzg.role;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.campaign.MainChapterRules;
import com.funsgamex.mxzg.campaign.MainChapterService;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.time.GameClock;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WelcomeGiftService {
    /** 当前连接凭证提供唯一领取角色，角色锁前后均校验。 */
    private final SessionService sessions;
    /** 统一角色锁、资格和持久资产版本入口。 */
    private final RoleRepository roles;
    /** 读取本次领取的主线进度，为通用发奖提供冒险点上限。 */
    private final MainChapterService chapters;
    /** 将真实通关进度映射为当前适用的冒险点上限。 */
    private final MainChapterRules chapterRules;
    /** 启动时从共享系统策划表取得的唯一发奖计划。 */
    private final List<RewardGrantService.Reward> plan;
    /** 通用发奖事务在本用例中修改钱包及背包，并登记提交后快照。 */
    private final RewardGrantService grants;
    /** 将本次真实发奖投影成回包和在线推送共用的原始反馈。 */
    private final RewardFeedbackService feedback;
    /** 每个角色一笔持久回执，原始内容与摘要由共享工具冻结和检查。 */
    private final RewardReceiptPayloads payloads;
    /** 只读写领取回执，角色状态和资产归各自服务。 */
    private final JdbcTemplate jdbc;
    /** 计算赠礼期限奖励起点的游戏时钟。 */
    private final GameClock clock;

    /** 注入角色、规则、发奖入口和游戏时钟，启动时预检赠礼配置。 */
    public WelcomeGiftService(SessionService sessions, RoleRepository roles, RoleRules rules,
            MainChapterService chapters, MainChapterRules chapterRules, RewardGrantService grants,
            RewardFeedbackService feedback, RewardReceiptPayloads payloads, JdbcTemplate jdbc, GameClock clock) {
        this.sessions = sessions;
        this.roles = roles;
        this.chapters = chapters;
        this.chapterRules = chapterRules;
        this.grants = grants;
        this.feedback = feedback;
        this.payloads = payloads;
        this.jdbc = jdbc;
        this.clock = clock;
        this.plan = rules.welcomeGift();
        grants.requireSupported(plan.stream().map(RewardGrantService.Reward::itemId).toList());
    }

    /**
     * 每角色按游戏时间发放一次，重复调用原样回包。领取资格、真实资产和回执写入共用角色事务。
     * @param token 当前鉴权连接持有的服务端凭证。
     * @return 实际入账的不可变原回执，统一快照负责更新客户端资产。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RewardFeedbackService.Notice claim(String token) {
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        sessions.requireRole(token);
        var previous = load(roleId);
        if (previous != null) {
            return previous;
        }
        var role = roles.findById(roleId).orElseThrow();
        if (!role.welcomeGiftAvailable()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "WELCOME_GIFT_UNAVAILABLE");
        }
        int maxCleared = chapters.current(token).maxCleared();
        var context = new RewardGrantService.Context(clock.epochSeconds(), chapterRules.tavernLimit(maxCleared));
        var actual = grants.grant(roleId, plan, context, ThreadLocalRandom.current());
        String receiptId = UUID.randomUUID().toString();
        var notice = feedback.publish(receiptId, roleId, roles.revision(roleId), RewardFeedbackService.Mode.POPUP, actual);
        var frozen = payloads.freeze(notice);
        jdbc.update("INSERT INTO game_role_welcome_gift(role_id,receipt_id,payload_json,payload_hash) VALUES (?,?,?,?)",
            roleId, receiptId, frozen.json(), frozen.hash());
        return notice;
    }

    /** 按角色领取键恢复原回执，损坏或跨角色回执直接拒绝，防止从当前配置补发。 */
    private RewardFeedbackService.Notice load(String roleId) {
        return jdbc.query("SELECT receipt_id,payload_json,payload_hash FROM game_role_welcome_gift WHERE role_id=?",
            result -> {
                if (!result.next()) {
                    return null;
                }
                String receiptId = result.getString("receipt_id");
                var notice = payloads.read(result.getString("payload_json"), result.getString("payload_hash"),
                    RewardFeedbackService.Notice.class);
                if (notice == null || notice.schemaVersion() != 1 || !RewardReceiptPayloads.validId(receiptId)
                    || !receiptId.equals(notice.receiptId()) || !roleId.equals(notice.roleId())
                    || notice.assetRevision() <= 0 || notice.mode() != RewardFeedbackService.Mode.POPUP) {
                    throw new IllegalStateException("新手赠礼回执不完整或归属错误");
                }
                return notice;
            }, roleId);
    }
}
