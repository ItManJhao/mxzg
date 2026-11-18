/**
 * 独立通关奖励事务。按真实通关和当前可发奖配置校验，回执即本角色已领记录。
 * 客户端从统一快照读取进度，断线按原绝对关卡号读取冻结实际奖励。
 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MainChapterFirstRewardService {
    /** 当前角色鉴权，锁前后核对凭证。 */
    private final SessionService sessions;
    /** 角色锁和统一资产版本。 */
    private final RoleRepository roles;
    /** 原绝对关卡通关与当前开放上限。 */
    private final MainChapterService chapters;
    /** 单次发奖上下文使用原酒馆点上限。 */
    private final MainChapterRules chapterRules;
    /** 从同源目录读取独立奖励计划，与快照资格共用。 */
    private final MainChapterFirstRewardRules rules;
    /** 通过现有领域发放真实资产。 */
    private final RewardGrantService grants;
    /** 提交后通知统一快照，事务内版本只变更一次。 */
    private final AssetSyncService sync;
    /** 回执与真实发奖共享一份事务。 */
    private final JdbcTemplate jdbc;
    /** 持久冻结回执和读取完整性检查。 */
    private final RewardReceiptPayloads payloads;

    /** 原成功回执，显示真实奖励并等待此版本的统一快照确认。 */
    public record Receipt(int schemaVersion, int chapter, String receiptId, String roleId, long assetRevision,
                          RewardGrantResult actual) {}

    /** 原关卡号的只读恢复结果，没有回执时 found=false。 */
    public record Status(int chapter, boolean found, Receipt receipt) {}

    /** 可安全发送给客户端的明确业务拒绝。 */
    public static class Rejected extends IllegalArgumentException {
        /** 用于客户端处理资格错误的稳定协议码。 */
        private final String code;

        /** 保留具体业务原因，不暴露凭证或内部数据库错误。 */
        public Rejected(String code, String message) {
            super(message);
            this.code = code;
        }

        /** 返回当前明确的业务拒绝码。 */
        public String code() {
            return code;
        }
    }

    /** 注入现有领域依赖，服务不保存本地分页或发奖状态。 */
    public MainChapterFirstRewardService(SessionService sessions, RoleRepository roles, MainChapterService chapters,
            MainChapterRules chapterRules, MainChapterFirstRewardRules rules, RewardGrantService grants,
            AssetSyncService sync, JdbcTemplate jdbc, RewardReceiptPayloads payloads) {
        this.sessions = sessions;
        this.roles = roles;
        this.chapters = chapters;
        this.chapterRules = chapterRules;
        this.rules = rules;
        this.grants = grants;
        this.sync = sync;
        this.jdbc = jdbc;
        this.payloads = payloads;
    }

    /** 领取旧绝对关卡对应的奖励；原回执优先，失败不会产生空已领记录。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt claim(String token, int chapter) {
        String role = authorize(token, chapter);
        var previous = load(role, chapter);
        if (previous != null) {
            return previous;
        }
        var state = chapters.current(token);
        var plan = rules.plan(chapter, state.challengeLimit());
        if (plan == null) {
            throw new Rejected("FIRST_REWARD_UNKNOWN", "该关卡的独立通关奖励暂不可领取");
        }
        if (state.maxCleared() < chapter) {
            throw new Rejected("FIRST_REWARD_NOT_REACHED", "尚未通关第" + chapter + "关");
        }
        var random = ThreadLocalRandom.current();
        var actual = grants.grant(role, plan, new RewardGrantService.Context(
                Instant.now().getEpochSecond(), chapterRules.tavernLimit(state.maxCleared())), random);
        sync.changed(role);
        var receipt = new Receipt(1, chapter, UUID.randomUUID().toString(), role, roles.revision(role), actual);
        validate(receipt, role, chapter, receipt.receiptId());
        var frozen = payloads.freeze(receipt);
        jdbc.update("INSERT INTO game_main_chapter_first_reward(role_id,chapter_id,receipt_id,payload_json,payload_hash) "
                + "VALUES (?,?,?,?,?)", role, chapter, receipt.receiptId(), frozen.json(), frozen.hash());
        return receipt;
    }

    /** 读取该角色指定关卡的原回执，不重算计划、不新增资产。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Status status(String token, int chapter) {
        var receipt = load(authorize(token, chapter), chapter);
        return new Status(chapter, receipt != null, receipt);
    }

    /** 校验正关卡号并取得真实角色锁，角色永远来自当前有效会话。 */
    private String authorize(String token, int chapter) {
        if (chapter <= 0) {
            throw new Rejected("FIRST_REWARD_INVALID", "通关奖励关卡编号无效");
        }
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        return role;
    }

    /** 按持久业务键查回执，摘要或角色身份错误时整条拒绝。 */
    private Receipt load(String role, int chapter) {
        return jdbc.query("SELECT receipt_id,payload_json,payload_hash FROM game_main_chapter_first_reward "
                + "WHERE role_id=? AND chapter_id=?", result -> {
                    if (!result.next()) {
                        return null;
                    }
                    var receipt = payloads.read(result.getString("payload_json"), result.getString("payload_hash"), Receipt.class);
                    validate(receipt, role, chapter, result.getString("receipt_id"));
                    return receipt;
                }, role, chapter);
    }

    /** 回执须与数据库业务键和本笔实际发奖角色一致，不依赖现在的通关和策划表。 */
    private static void validate(Receipt receipt, String role, int chapter, String receiptId) {
        if (receipt == null || receipt.schemaVersion() != 1 || receipt.chapter() != chapter
                || !RewardReceiptPayloads.validId(receiptId) || !receiptId.equals(receipt.receiptId())
                || !role.equals(receipt.roleId()) || receipt.assetRevision() <= 0 || receipt.actual() == null
                || !role.equals(receipt.actual().roleId()) || receipt.actual().items().isEmpty()) {
            throw new IllegalStateException("独立通关奖励回执不完整或归属错误");
        }
    }
}
