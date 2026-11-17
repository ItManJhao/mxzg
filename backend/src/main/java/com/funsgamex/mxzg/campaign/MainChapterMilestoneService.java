/**
 * 主线里程碑领取事务：沿旧3008按目标绝对关卡和真实已领集合校验，允许已达成项乱序领取。
 * rewardId是每角色稳定业务键；原成功回执先于当前资格和配置读取，恢复不重发英雄或重算奖励。
 * 发奖、V27集合、统一版本和冻结回执同事务提交；展示由已确认回执复用通用反馈，不另推提前奖励。
 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class MainChapterMilestoneService {
    /** 鉴权和锁后复验，不接收客户端角色ID。 */
    private final SessionService sessions;
    /** 原角色行锁与持久版本入口。 */
    private final RoleRepository roles;
    /** 本次领取回执与原V27集合共用连接。 */
    private final JdbcTemplate jdbc;
    /** 仅新领取使用当前同源目录，旧回执不依赖它重算。 */
    private final MainChapterMilestoneRules rules;
    /** 真实主线当前状态及已领集合的唯一投影。 */
    private final MainChapterService chapters;
    /** 原关卡酒馆上限规则，不用客户端奖励计划。 */
    private final MainChapterRules chapterRules;
    /** 统一可信发奖，英雄进入真实领域，不作为普通堆叠。 */
    private final RewardGrantService grants;
    /** 同事务递增一次持久版本，提交后统一状态推送。 */
    private final AssetSyncService sync;
    /** 只用于持久不可变审计JSON，网络仍为强类型PB。 */
    private final ObjectMapper mapper;

    /** 原成功结果及当时状态，资产由最新Snapshot交付，不能回写历史余额。 */
    public record Receipt(int schemaVersion, int rewardId, String receiptId, String roleId,
                          long assetRevision, MainChapterService.State state, RewardGrantResult actual,
                          int targetChapter, String rulesVersion) {}
    /** 指定稳定业务键的只读查询，未找到不补发、不修改已领集合。 */
    public record Status(int rewardId, boolean found, Receipt receipt) {}

    /** 明确业务拒绝，连接层保留可读原因，不把数据库异常伪装成未领取。 */
    public static class Rejected extends IllegalArgumentException {
        /** 稳定拒绝原因，供UI通过统一飘字展示。 */
        private final String code;
        /** 保存业务原因，不携带凭据或资产内容。 */
        public Rejected(String code, String message) {
            super(message);
            this.code = code;
        }
        /** 返回协议错误原因，重试不得绕过资格。 */
        public String code() { return code; }
    }

    /** 注入原事务领域，服务不保存另一份角色或领取队列。 */
    public MainChapterMilestoneService(SessionService sessions, RoleRepository roles, JdbcTemplate jdbc,
            MainChapterMilestoneRules rules, MainChapterService chapters, MainChapterRules chapterRules,
            RewardGrantService grants, AssetSyncService sync, ObjectMapper mapper) {
        this.sessions = sessions;
        this.roles = roles;
        this.jdbc = jdbc;
        this.rules = rules;
        this.chapters = chapters;
        this.chapterRules = chapterRules;
        this.grants = grants;
        this.sync = sync;
        this.mapper = mapper;
    }

    /**
     * 沿原角色锁原子领取；重复同rewardId读取原结果，失败整体回滚，不占用已领ID。
     * 不要求先领更小ID，也不要求首通pending为空，符合旧3008资格边界。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt claim(String token, int rewardId) {
        String role = authorizedRole(token, rewardId);
        var previous = load(role, rewardId);
        if (previous != null) {
            return previous;
        }
        var state = chapters.current(token);
        if (state.milestoneProgress().claimedIds().contains(rewardId)) {
            throw new Rejected("MILESTONE_ALREADY_CLAIMED", "这项通关奖励已经领取，旧记录没有可恢复的领取回执");
        }
        MainChapterMilestoneRules.Entry entry;
        try {
            entry = rules.require(rewardId);
        } catch (IllegalArgumentException error) {
            throw new Rejected("MILESTONE_UNKNOWN", "通关奖励配置不存在");
        }
        if (state.maxCleared() < entry.targetChapter()) {
            throw new Rejected("MILESTONE_NOT_REACHED", "尚未通关第" + entry.targetChapter() + "关");
        }
        grants.requireSupported(entry.rewards().stream().map(RewardGrantService.Reward::itemId).toList());
        var actual = grants.grant(role, entry.rewards(), new RewardGrantService.Context(
                Instant.now().getEpochSecond(), chapterRules.tavernLimit(state.maxCleared())), ThreadLocalRandom.current());
        jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,?)", role, rewardId);
        sync.changed(role);
        var after = chapters.current(token);
        var receipt = new Receipt(1, rewardId, UUID.randomUUID().toString(), role, after.assetRevision(),
                after, actual, entry.targetChapter(), rules.version());
        validateReceipt(receipt, role, rewardId);
        String payload = mapper.writeValueAsString(receipt);
        jdbc.update("INSERT INTO game_main_chapter_milestone_receipt(role_id,reward_id,receipt_id,asset_revision,payload_json,payload_hash) "
                        + "VALUES (?,?,?,?,?,?)", role, rewardId, receipt.receiptId(), receipt.assetRevision(), payload, hash(payload));
        return receipt;
    }

    /** 按原稳定键查询历史结果，角色锁与资格变化不影响已有成功回执。 */
    @Transactional(isolation = Isolation.READ_COMMITTED, readOnly = true)
    public Status status(String token, int rewardId) {
        String role = authorizedRole(token, rewardId);
        var receipt = load(role, rewardId);
        return new Status(rewardId, receipt != null, receipt);
    }

    /** 锁前后复验同一凭证；业务键只能为正配置ID，不由客户端提交领取清单。 */
    private String authorizedRole(String token, int rewardId) {
        if (rewardId <= 0) {
            throw new Rejected("MILESTONE_INVALID", "通关奖励编号无效");
        }
        String role = sessions.requireRole(token);
        roles.lock(role);
        if (!role.equals(sessions.requireRole(token))) {
            throw new IllegalArgumentException("里程碑领取期间身份失效");
        }
        return role;
    }

    /** 校验冻结摘要及归属后读取原结果，不按当前名册、钱包或配置重新推算。 */
    private Receipt load(String role, int rewardId) {
        var records = jdbc.query("SELECT receipt_id,asset_revision,payload_json,payload_hash FROM game_main_chapter_milestone_receipt "
                + "WHERE role_id=? AND reward_id=?", (row, index) -> {
            String payload = row.getString("payload_json");
            if (!hash(payload).equals(row.getString("payload_hash"))) {
                throw new IllegalStateException("里程碑历史回执摘要损坏");
            }
            var receipt = mapper.readValue(payload, Receipt.class);
            validateReceipt(receipt, role, rewardId);
            if (!receipt.receiptId().equals(row.getString("receipt_id"))
                    || receipt.assetRevision() != row.getLong("asset_revision")) {
                throw new IllegalStateException("里程碑历史回执身份或版本损坏");
            }
            return receipt;
        }, role, rewardId);
        return records.isEmpty() ? null : records.getFirst();
    }

    /**
     * 提交前及恢复时验证整份历史结果；不能在资产已提交后才发现PB安全整数或归属不合法。
     * 只检查原冻结字段，不查询当前配置、钱包、名册或新开放范围。
     */
    private void validateReceipt(Receipt receipt, String role, int rewardId) {
        if (receipt == null || receipt.schemaVersion() != 1 || receipt.rewardId() != rewardId
                || !role.equals(receipt.roleId()) || receipt.receiptId() == null
                || !receipt.receiptId().matches("[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}")
                || receipt.assetRevision() <= 0 || receipt.state() == null || receipt.actual() == null
                || receipt.state().assetRevision() != receipt.assetRevision()
                || receipt.state().milestoneProgress() == null
                || !receipt.state().milestoneProgress().claimedIds().contains(rewardId)
                || !role.equals(receipt.actual().roleId()) || receipt.targetChapter() <= 0
                || receipt.state().maxCleared() < receipt.targetChapter() || receipt.rulesVersion() == null
                || !receipt.rulesVersion().matches("chapter-milestone-v1:[a-f0-9]{64}")) {
            throw new IllegalStateException("里程碑原回执身份、集合或配置版本无效");
        }
        requireSafeNumbers(mapper.valueToTree(receipt));
    }

    /** 递归拒绝协议无法精确传输的负数/大整数，冻结钱包只校验而不写回当前资产。 */
    private static void requireSafeNumbers(tools.jackson.databind.JsonNode value) {
        if (value.isIntegralNumber() && (!value.canConvertToLong() || value.asLong() < 0
                || value.asLong() > 9_007_199_254_740_991L)) {
            throw new IllegalStateException("里程碑回执超出协议精确非负整数范围");
        }
        if (value.isObject() || value.isArray()) {
            for (var child : value) {
                requireSafeNumbers(child);
            }
        }
    }

    /** 稳定摘要只覆盖本次原JSON，后续不因配置变化重写。 */
    private static String hash(String payload) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少回执摘要算法", error);
        }
    }
}
