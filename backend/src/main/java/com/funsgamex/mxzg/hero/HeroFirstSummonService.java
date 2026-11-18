/**
 * 角色唯一的普通免费首抽事务，英雄与积分进入现有发奖链。
 * 肯定回执与角色资产同事务提交，重试和重新鉴权分别从原回执和统一快照恢复。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class HeroFirstSummonService {
    /** 只接受客户端持久日志使用的规范小写 UUID。 */
    private static final Pattern REQUEST_ID = Pattern.compile("[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}");
    /** 二进制协议在客户端可精确接收的整数上限。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
    /** 锁前后从当前有效凭证读取角色归属。 */
    private final SessionService sessions;
    /** 复用角色锁与持久资产版本。 */
    private final RoleRepository roles;
    /** 事务内读写首抽完成状态和原始回执。 */
    private final JdbcTemplate jdbc;
    /** 读取包含 VIP 加成的实际名册容量。 */
    private final HeroCapacityService capacity;
    /** 仅对新首抽计算奖励和免费时间。 */
    private final HeroFirstSummonRules rules;
    /** 原子创建真实英雄并发放普通召唤积分。 */
    private final RewardGrantService grants;
    /** 同事务登记统一状态更新，回滚时不对外发送。 */
    private final AssetSyncService sync;
    /** 冻结实际到账回执用于内部持久审计，网络仍使用强类型协议。 */
    private final ObjectMapper mapper;

    /** 当前资格随角色快照恢复；完成时附原普通免费时间，未完成为0。 */
    public record State(int schemaVersion, boolean firstNormalCompleted, long normalFreeAtSeconds) {
        /** 拒绝坏版本或资格与免费时间互相矛盾的持久值。 */
        public State {
            if (schemaVersion != 1 || normalFreeAtSeconds < 0 || normalFreeAtSeconds > MAX_SAFE_INTEGER
                    || firstNormalCompleted != (normalFreeAtSeconds > 0)) {
                throw new IllegalStateException("普通首抽资格和免费时间无效");
            }
        }
    }

    /** 冻结已发放的首次结果，包含真实英雄实例及实际入账积分。 */
    public record Receipt(int schemaVersion, String requestId, String receiptId, String roleId, long assetRevision,
                          State state, RewardGrantResult actual) {}

    /** 指定持久请求的状态；未找到回执时返回found=false。 */
    public record Status(String requestId, boolean found, Receipt receipt) {}

    /** 已知业务拒绝，客户端按错误码保留或清理对应请求日志。 */
    public static class Rejected extends IllegalArgumentException {
        /** 可安全传给客户端的稳定错误码。 */
        private final String code;

        /** 保存失败原因，未产生首抽或资产修改。 */
        public Rejected(String code, String message) {
            super(message);
            this.code = code;
        }

        /** 返回协议错误码用于客户端恢复。 */
        public String code() {
            return code;
        }
    }

    /** 注入共享领域，首抽服务不缓存账号或名册。 */
    public HeroFirstSummonService(SessionService sessions, RoleRepository roles, JdbcTemplate jdbc,
            HeroCapacityService capacity, HeroFirstSummonRules rules, RewardGrantService grants,
            AssetSyncService sync, ObjectMapper mapper) {
        this.sessions = sessions;
        this.roles = roles;
        this.jdbc = jdbc;
        this.capacity = capacity;
        this.rules = rules;
        this.grants = grants;
        this.sync = sync;
        this.mapper = mapper;
    }

    /** 同一角色最多成功一次；同一请求重试回放，其余重复或名册满均明确拒绝。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt summon(String token, String requestId) {
        String role = authorize(token, requestId);
        var previous = load(role, requestId);
        if (previous != null) {
            return previous;
        }
        if (current(role).firstNormalCompleted()) {
            throw new Rejected("SUMMON_ALREADY_COMPLETED", "普通免费首抽已完成");
        }
        if (!capacity.hasRoom(role, 1)) {
            throw new Rejected("SUMMON_CAPACITY_FULL", "英雄名册已满，无法召唤");
        }

        long now = Instant.now().getEpochSecond();
        var state = new State(1, true, rules.nextFreeAt(now));
        var actual = grants.grant(role, rules.rewards(), new RewardGrantService.Context(now, 0),
                ThreadLocalRandom.current());
        sync.changed(role);
        var receipt = new Receipt(1, requestId, UUID.randomUUID().toString(), role, roles.revision(role), state, actual);
        validate(receipt, role, requestId);
        String payload = mapper.writeValueAsString(receipt);
        jdbc.update("INSERT INTO game_hero_first_summon(role_id,request_id,receipt_id,asset_revision,"
                        + "normal_free_at_seconds,payload_json,payload_hash) VALUES (?,?,?,?,?,?,?)",
                role, requestId, receipt.receiptId(), receipt.assetRevision(), state.normalFreeAtSeconds(),
                payload, digest(payload));
        return receipt;
    }

    /** 查原持久业务键，隔离其他角色请求；不发奖、不变更资格。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Status status(String token, String requestId) {
        String role = authorize(token, requestId);
        var receipt = load(role, requestId);
        return new Status(requestId, receipt != null, receipt);
    }

    /** 由角色锁内的统一快照读取，首抽状态与资产版本一起提交给客户端。 */
    @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
    public State current(String role) {
        var times = jdbc.queryForList("SELECT normal_free_at_seconds FROM game_hero_first_summon WHERE role_id=?",
                Long.class, role);
        return times.isEmpty() ? new State(1, false, 0) : new State(1, true, times.getFirst());
    }

    /** 在锁内复验凭证，避免连接替换期间的旧请求修改当前角色。 */
    private String authorize(String token, String requestId) {
        if (!validId(requestId)) {
            throw new Rejected("SUMMON_INVALID", "普通首抽请求编号无效");
        }
        String role = sessions.requireRole(token);
        roles.lock(role);
        if (!role.equals(sessions.requireRole(token))) {
            throw new IllegalArgumentException("普通首抽期间身份失效");
        }
        return role;
    }

    /** 恢复的结果以冻结明细为准，损坏摘要或归属不允许伪装成未找到。 */
    private Receipt load(String role, String requestId) {
        return jdbc.query("SELECT receipt_id,asset_revision,normal_free_at_seconds,payload_json,payload_hash "
                + "FROM game_hero_first_summon WHERE role_id=? AND request_id=?", result -> {
                    if (!result.next()) {
                        return null;
                    }
                    String payload = result.getString("payload_json");
                    if (!digest(payload).equals(result.getString("payload_hash"))) {
                        throw new IllegalStateException("普通首抽历史回执摘要损坏");
                    }
                    var receipt = mapper.readValue(payload, Receipt.class);
                    validate(receipt, role, requestId);
                    if (!receipt.receiptId().equals(result.getString("receipt_id"))
                            || receipt.assetRevision() != result.getLong("asset_revision")
                            || receipt.state().normalFreeAtSeconds() != result.getLong("normal_free_at_seconds")) {
                        throw new IllegalStateException("普通首抽历史回执字段损坏");
                    }
                    return receipt;
                }, role, requestId);
    }

    /** 保证归属、英雄实例和协议范围有效，检查历史记录时无需读取当前配置与名册。 */
    private void validate(Receipt receipt, String role, String requestId) {
        if (receipt == null || receipt.schemaVersion() != 1 || !requestId.equals(receipt.requestId())
                || !validId(receipt.receiptId()) || !role.equals(receipt.roleId()) || receipt.assetRevision() <= 0
                || receipt.state() == null || !receipt.state().firstNormalCompleted()
                || receipt.actual() == null || !role.equals(receipt.actual().roleId())
                || receipt.actual().heroes().size() != 1) {
            throw new IllegalStateException("普通首抽回执身份、状态或新英雄实例无效");
        }
        requireSafeNumbers(mapper.valueToTree(receipt));
    }

    /** 检查原钱包和库存等冻结字段，避免提交后发现服务端值无法精确发给客户端。 */
    private static void requireSafeNumbers(JsonNode value) {
        if (value.isIntegralNumber() && (!value.canConvertToLong() || value.asLong() < 0
                || value.asLong() > MAX_SAFE_INTEGER)) {
            throw new IllegalStateException("普通首抽回执超出协议精确非负整数范围");
        }
        for (var child : value) {
            requireSafeNumbers(child);
        }
    }

    /** 标识必须为规范小写 UUID，避免不同文本代表同一个业务键。 */
    private static boolean validId(String id) {
        return id != null && REQUEST_ID.matcher(id).matches();
    }

    /** 计算原始持久回执内容的稳定摘要，使用UTF-8与数据库编码解耦。 */
    private static String digest(String payload) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少普通首抽回执摘要算法", error);
        }
    }
}
