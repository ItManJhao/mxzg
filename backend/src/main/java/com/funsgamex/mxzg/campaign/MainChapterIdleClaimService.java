/**
 * 新主线挂机领取事务：锁角色后先恢复成功回执，再冻结时间/输入、计算、真实发奖并消费累计状态。
 * 起点、保底计数、操作版本、资产版本与版本化审计回执同库原子提交，重复/并发请求不重新抽样。
 * 由WS＋Protobuf调用；默认关闭新领取，status与历史成功重放仍可查询，不在读取时补建免费计时。
 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.random.RandomGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;

@Service
public class MainChapterIdleClaimService {
    /** 复用后端日志出口，仅在把前置异常翻译为业务拒绝的边界保留原原因，不输出凭证或原始请求。 */
    private static final Logger LOG = LoggerFactory.getLogger(MainChapterIdleClaimService.class);
    /** 第1版请求规范，不因传输Frame.id变化而变化。 */
    private static final int REQUEST_FORMAT = 1;
    /** 第1版冻结审计格式；发布后改变字段语义须新增格式分支，不能重算历史回执。 */
    private static final int STORAGE_VERSION = 1;
    /** 网络展示回执的独立格式，不随数据库审计格式维护而隐式改变。 */
    private static final int RECEIPT_SCHEMA_VERSION = 1;
    /** 沿当前协议拒绝超过JS安全整数的版本及数量，禁止客户端精度丢失。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
    /** 真实会话归属，取得角色锁后再次鉴权。 */
    private final SessionService sessions;
    /** 角色锁及唯一钱包/资产版本查询。 */
    private final RoleRepository roles;
    /** 同一事务内读写主线进度和成功回执。 */
    private final JdbcTemplate jdbc;
    /** 旧基础、随机分窗与保底规则，不在本服务重写公式。 */
    private final IdleRules rules;
    /** 已恢复关卡范围和最高通关关卡酒馆上限。 */
    private final MainChapterRules chapters;
    /** 同时刻冻结真实权益与三活动控制，读取不抽奖。 */
    private final IdleRewardInputService inputs;
    /** 共享真实发奖及实例结果，加入本业务外层事务。 */
    private final RewardGrantService grants;
    /** 唯一累计行及类别计数的校验与条件消费。 */
    private final MainChapterIdleStateRepository states;
    /** 经验动画门槛与真实经验规则同源，历史动画冻结后不重读。 */
    private final RoleRules roleRules;
    /** 同角色同事务仅递增一次版本，并在成功提交后通知。 */
    private final AssetSyncService sync;
    /** 仅用于明确版本的数据库审计格式，网络仍使用生成Protobuf。 */
    private final ObjectMapper json;
    /** 可信服务器时钟，每次新领取只捕获一次，历史重放不读取。 */
    private final Clock clock;
    /** 服务端线程安全随机源；拒绝及历史查询不能消费它。 */
    private final RandomGenerator random;
    /** true仅允许新内部领取请求；日常默认false，历史成功回执不受此开关影响。 */
    private final boolean enabled;

    /**
     * 冻结的历史领取展示，不能作为当前资产或起点覆盖唯一Model。
     * @param schemaVersion 展示回执格式，当前1
     * @param requestId 原业务意图ID，跨重连不改变
     * @param receiptId 唯一成功回执ID
     * @param expectedOperationVersion 原请求期望版本，重放指纹包含此值
     * @param beforeOperationVersion 本次消费前操作版本
     * @param afterOperationVersion 本次消费后操作版本
     * @param committedAtSeconds 同次计算和发奖使用的服务器Unix秒
     * @param previousStartedAtSeconds 消费前的真实持久起点
     * @param seconds 按发奖前VIP截顶的完整秒数，包含基础舍弃的尾数
     * @param maxSeconds 本次冻结的VIP时长上限
     * @param rewardStage 锁内最高已通关关卡，不要求首通挑战奖励已经领取
     * @param assetRevision 本次提交的统一资产版本，不用后来的快照版本改写
     * @param theoreticalRewards 最终加成取整及合并后的理论量
     * @param actual 真实到账、忽略原因、升级附赠及实际实例
     * @param experience 仅供经验动画使用，未发角色经验时为空
     */
    public record Receipt(int schemaVersion, String requestId, String receiptId,
                          long expectedOperationVersion, long beforeOperationVersion, long afterOperationVersion,
                          long committedAtSeconds, long previousStartedAtSeconds, int seconds, int maxSeconds,
                          int rewardStage, long assetRevision, List<CampaignRules.Reward> theoreticalRewards,
                          RewardGrantResult actual, MainChapterService.Experience experience) {
        /** 冻结奖励清单，不与最新资产共享可变列表。 */
        public Receipt {
            theoreticalRewards = List.copyOf(theoreticalRewards);
        }
    }

    /**
     * 指定意图的查询结果，不创建处理中状态或触发新领取。
     * @param requestId 被查询的原意图ID
     * @param status 仅COMMITTED或NOT_FOUND，锁超时不表示未找到
     * @param receipt COMMITTED时为原成功回执，NOT_FOUND时为空
     */
    public record Status(String requestId, String status, Receipt receipt) {}

    /**
     * 第1版数据库审计载荷：字段语义固定，未来格式新增分支，不以当前规则重算旧结果。
     * @param storageVersion 固定1，外部列与载荷必须一致
     * @param roleId 原发放角色归属
     * @param serverId 原角色所属区服
     * @param requestFormat 原请求格式版本
     * @param requestName 固定chapter.idle.claim
     * @param requestFingerprint 规范请求指纹，不包含凭证或传输帧ID
     * @param receipt 该次提交的历史展示及真实到账
     * @param before 消费前完整累计状态，包含所有已保存类别
     * @param after 消费后完整累计状态
     * @param calculation 完整冻结Input、各来源/分窗、加成及理论候选
     */
    public record AuditV1(int storageVersion, String roleId, String serverId, int requestFormat,
                          String requestName, String requestFingerprint, Receipt receipt,
                          MainChapterIdleStateRepository.Accumulation before,
                          MainChapterIdleStateRepository.Accumulation after,
                          IdleRewardUtils.Result calculation) {}

    /** 可恢复业务拒绝，协议边界保留稳定错误码和原因，不能误报连接失败或假成功。 */
    public static final class Rejected extends RuntimeException {
        /** 业务错误码，协议边界原样映射，不依赖错误文字判断。 */
        private final String code;
        /** true表示前置或时间变化后可重试原意图；版本/指纹冲突不能自动换参数。 */
        private final boolean retryable;

        /** 保存明确业务原因，当前没有持久处理中记录。 */
        public Rejected(String code, String message, boolean retryable) {
            super(message);
            this.code = code;
            this.retryable = retryable;
        }

        /** 返回交给Failure信封的稳定业务码。 */
        public String code() {
            return code;
        }

        /** 返回是否可在前置变化后继续原请求，不能据此丢弃已发送意图。 */
        public boolean retryable() {
            return retryable;
        }
    }

    /** 注入真实领域服务和可控时间/随机边界，不保存第二份角色资产。 */
    public MainChapterIdleClaimService(SessionService sessions, RoleRepository roles, JdbcTemplate jdbc,
            IdleRules rules, MainChapterRules chapters, IdleRewardInputService inputs, RewardGrantService grants,
            MainChapterIdleStateRepository states, RoleRules roleRules, AssetSyncService sync, ObjectMapper json,
            @Qualifier("mainChapterIdleClaimClock") Clock clock,
            @Qualifier("mainChapterIdleClaimRandom") RandomGenerator random,
            @Value("${mxzg.main-chapter.idle-claim-enabled:false}") boolean enabled) {
        this.sessions = sessions;
        this.roles = roles;
        this.jdbc = jdbc;
        this.rules = rules;
        this.chapters = chapters;
        this.inputs = inputs;
        this.grants = grants;
        this.states = states;
        this.roleRules = roleRules;
        this.sync = sync;
        this.json = json;
        this.clock = clock;
        this.random = random;
        this.enabled = enabled;
    }

    /**
     * 锁内先查原回执，再对新意图计算和发奖；起点/计数/资产/回执任一保存失败均整笔回滚。
     * 相同请求异内容先于当前开关和权益拒绝；不同请求不能消费同一操作版本。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt claim(String token, String requestId, long expectedOperationVersion) {
        requireId(requestId);
        requireSafePositive(expectedOperationVersion, "期望操作版本");
        String role = authorizedRole(token);
        String fingerprint = fingerprint(expectedOperationVersion);
        var stored = load(role, requestId);
        if (stored != null) {
            if (!stored.requestFingerprint().equals(fingerprint)) {
                throw new Rejected("IDLE_REQUEST_CONFLICT", "挂机请求编号已用于不同内容", false);
            }
            return stored.receipt();
        }
        if (!enabled) {
            throw new Rejected("IDLE_CLOSED", "挂机领取尚未开放", false);
        }
        int stage = rewardStage(role);
        var before = states.require(role);
        if (before.operationVersion() != expectedOperationVersion) {
            throw new Rejected("IDLE_VERSION_CONFLICT", "挂机累计版本已变化，请先确认原请求结果", false);
        }
        if (expectedOperationVersion == MAX_SAFE_INTEGER) {
            throw new Rejected("IDLE_STATE_INVALID", "挂机操作版本已超出可消费范围", false);
        }
        long now = clock.instant().getEpochSecond();
        if (now < before.startedAt() || now > MAX_SAFE_INTEGER) {
            throw new Rejected("IDLE_CLOCK_INVALID", "挂机计时异常，尚不能领取", true);
        }
        int maximum = inputs.maximumSeconds(role);
        int seconds = Math.toIntExact(Math.min(now - before.startedAt(), maximum));
        if (seconds / rules.data().frequency() == 0) {
            throw new Rejected("IDLE_TOO_SOON", "挂机累计尚未满60秒", true);
        }
        var input = currentInput(role, now);
        if (!input.roleId().equals(role) || input.maxSeconds() != maximum) {
            throw new IllegalStateException("同一角色锁内挂机输入归属或时长改变");
        }
        grants.requireSupported(possibleRewards(stage, input));
        var calculation = IdleRewardUtils.calculate(rules, input, stage, seconds,
                before.dropSeconds(), before.counters(), random);
        long tavernLimit = chapters.tavernLimit(stage);
        var theoretical = calculation.outcome().total();
        var actual = grants.grant(role, theoretical.stream()
                        .map(reward -> new RewardGrantService.Reward(reward.itemId(), reward.quantity())).toList(),
                new RewardGrantService.Context(now, tavernLimit), random);
        var after = states.consume(role, before, now, calculation.ordinary().dropSeconds(),
                calculation.ordinary().counters());
        // 即使全是封顶/满级零到账，消费起点也必须推统一版本，防止客户端过滤掉新累计状态。
        sync.changed(role);
        long assetRevision = roles.revision(role);
        requireSafePositive(assetRevision, "提交资产版本");
        var receipt = new Receipt(RECEIPT_SCHEMA_VERSION, requestId, UUID.randomUUID().toString(),
                expectedOperationVersion, before.operationVersion(), after.operationVersion(), now, before.startedAt(),
                seconds, maximum, stage, assetRevision, theoretical, actual, experience(actual));
        requireSafeReceiptNumbers(json.valueToTree(receipt));
        var audit = new AuditV1(STORAGE_VERSION, role, input.serverId(), REQUEST_FORMAT, "chapter.idle.claim",
                fingerprint, receipt, before, after, calculation);
        save(audit);
        return receipt;
    }

    /** 只查指定角色意图的已提交回执，等待同一角色写事务后才判断NOT_FOUND，不读取权益或创建计时。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Status status(String token, String requestId) {
        requireId(requestId);
        var audit = load(authorizedRole(token), requestId);
        return new Status(requestId, audit == null ? "NOT_FOUND" : "COMMITTED", audit == null ? null : audit.receipt());
    }

    /** 获取真实角色锁后再次鉴权，等锁期间撤销的会话不能继续领取或查询。 */
    private String authorizedRole(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        if (!role.equals(sessions.requireRole(token))) {
            throw new IllegalStateException("持锁鉴权角色改变");
        }
        return role;
    }

    /** 当前仅接已恢复前三关；未通关不沿旧服务端旁路回落第一关，也不补建计时。 */
    private int rewardStage(String role) {
        var stages = jdbc.query("SELECT max_cleared FROM game_main_chapter WHERE role_id=?",
                (row, index) -> row.getInt(1), role);
        if (stages.isEmpty() || stages.getFirst() < 1) {
            throw new Rejected("IDLE_NOT_AVAILABLE", "请先完成主线挑战", false);
        }
        int stage = stages.getFirst();
        chapters.stage(stage);
        return stage;
    }

    /** 只在新领取中装配一次完整输入，缺世界/活动等前置明确拒绝并保留原原因供协议边界记录。 */
    private IdleRewardInputService.Input currentInput(String role, long now) {
        try {
            return inputs.current(role, now);
        } catch (IllegalArgumentException | IllegalStateException failure) {
            try {
                LOG.warn("挂机领取输入前置未就绪，角色={}；累计和资产未消费", role, failure);
            } catch (RuntimeException ignored) {
                // 日志出口故障不能替换原业务拒绝或改变外层事务结果，也不能再次递归记录。
            }
            var rejected = new Rejected("IDLE_INPUT_UNAVAILABLE", "挂机收益前置尚未就绪", true);
            rejected.initCause(failure);
            throw rejected;
        }
    }

    /** 从本关普通配置与已冻结适用活动行求完整候选闭包，概率0/已封顶也不隐藏未支持分路。 */
    private Set<Integer> possibleRewards(int stageId, IdleRewardInputService.Input input) {
        var stage = rules.stage(stageId);
        var ids = new TreeSet<Integer>();
        stage.base().forEach(reward -> ids.add(reward.itemId()));
        for (var trigger : rules.data().triggers()) {
            if (trigger.group() != stage.group()) {
                continue;
            }
            int totalWeight = 0;
            for (var drop : rules.data().drops()) {
                if (drop.table() == trigger.table() && drop.weight() > 0) {
                    totalWeight = Math.addExact(totalWeight, drop.weight());
                    ids.add(drop.itemId());
                }
            }
            if (totalWeight == 0) {
                throw new IllegalStateException("挂机候选掉落表缺少正权重条目：" + trigger.table());
            }
        }
        for (var activity : input.activities().entries()) {
            activity.drop().ifPresent(drop -> drop.rewards().forEach(reward -> ids.add(reward.itemId())));
        }
        return Set.copyOf(ids);
    }

    /** 将实际经验的前后门槛单独冻结供动画使用，不以历史经验字段更新当前角色。 */
    private MainChapterService.Experience experience(RewardGrantResult actual) {
        if (actual.experience().isEmpty()) {
            return null;
        }
        var gain = actual.experience().getFirst();
        return new MainChapterService.Experience(gain.beforeLevel(), gain.beforeExperience(),
                roleRules.threshold(gain.beforeLevel()), gain.level(), gain.experience(), roleRules.threshold(gain.level()));
    }

    /** 保存完整第1版审计格式及摘要，唯一键或写入失败交由外层回滚，不能异步补回执。 */
    private void save(AuditV1 audit) {
        var receipt = audit.receipt();
        String payload = json.writeValueAsString(audit);
        int inserted = jdbc.update("INSERT INTO game_main_chapter_idle_receipt(role_id,request_id,receipt_id,server_id,"
                        + "request_format,request_fingerprint,expected_operation_version,before_operation_version,"
                        + "after_operation_version,committed_at_seconds,asset_revision,storage_version,payload_json,payload_hash) "
                        + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                audit.roleId(), receipt.requestId(), receipt.receiptId(), audit.serverId(), audit.requestFormat(),
                audit.requestFingerprint(), receipt.expectedOperationVersion(), receipt.beforeOperationVersion(),
                receipt.afterOperationVersion(), receipt.committedAtSeconds(), receipt.assetRevision(),
                audit.storageVersion(), payload, digest(payload));
        if (inserted != 1) {
            throw new IllegalStateException("挂机成功回执写入行数异常");
        }
    }

    /** 恢复并校验原格式、摘要及列/载荷归属；不查询当前权益、规则内容或完整资产快照。 */
    private AuditV1 load(String role, String requestId) {
        var found = jdbc.query("SELECT * FROM game_main_chapter_idle_receipt WHERE role_id=? AND request_id=?",
                (row, index) -> {
                    String payload = row.getString("payload_json");
                    if (row.getInt("storage_version") != STORAGE_VERSION
                            || row.getInt("request_format") != REQUEST_FORMAT
                            || payload == null || !digest(payload).equals(row.getString("payload_hash"))) {
                        throw new IllegalStateException("挂机历史回执格式或摘要无效");
                    }
                    var audit = json.readValue(payload, AuditV1.class);
                    validateStored(audit, role, requestId);
                    var receipt = audit.receipt();
                    if (!Objects.equals(audit.serverId(), row.getString("server_id"))
                            || !Objects.equals(audit.requestFingerprint(), row.getString("request_fingerprint"))
                            || !Objects.equals(receipt.receiptId(), row.getString("receipt_id"))
                            || receipt.expectedOperationVersion() != row.getLong("expected_operation_version")
                            || receipt.beforeOperationVersion() != row.getLong("before_operation_version")
                            || receipt.afterOperationVersion() != row.getLong("after_operation_version")
                            || receipt.committedAtSeconds() != row.getLong("committed_at_seconds")
                            || receipt.assetRevision() != row.getLong("asset_revision")) {
                        throw new IllegalStateException("挂机历史回执列与审计载荷不一致");
                    }
                    return audit;
                }, role, requestId);
        return found.isEmpty() ? null : found.getFirst();
    }

    /** 只校验冻结数据自身一致性，不把当前规则版本或新资产覆盖历史；未知审计格式明确停止恢复。 */
    private void validateStored(AuditV1 audit, String role, String requestId) {
        if (audit == null || audit.storageVersion() != STORAGE_VERSION || audit.requestFormat() != REQUEST_FORMAT
                || !"chapter.idle.claim".equals(audit.requestName()) || !role.equals(audit.roleId())
                || audit.serverId() == null || audit.serverId().isBlank() || audit.receipt() == null
                || audit.before() == null || audit.after() == null || audit.calculation() == null) {
            throw new IllegalStateException("挂机历史回执审计结构或归属无效");
        }
        var receipt = audit.receipt();
        var calculation = audit.calculation();
        requireSafeReceiptNumbers(json.valueToTree(receipt));
        requireId(receipt.receiptId());
        requireSafePositive(receipt.beforeOperationVersion(), "历史操作版本");
        requireSafePositive(receipt.afterOperationVersion(), "历史操作版本");
        requireSafePositive(receipt.assetRevision(), "历史提交资产版本");
        if (receipt.schemaVersion() != RECEIPT_SCHEMA_VERSION || !requestId.equals(receipt.requestId())
                || receipt.expectedOperationVersion() != receipt.beforeOperationVersion()
                || receipt.afterOperationVersion() != receipt.beforeOperationVersion() + 1
                || !fingerprint(receipt.expectedOperationVersion()).equals(audit.requestFingerprint())
                || audit.before().operationVersion() != receipt.beforeOperationVersion()
                || audit.after().operationVersion() != receipt.afterOperationVersion()
                || audit.before().startedAt() != receipt.previousStartedAtSeconds()
                || audit.after().startedAt() != receipt.committedAtSeconds()
                || calculation.input() == null || !role.equals(calculation.input().roleId())
                || !audit.serverId().equals(calculation.input().serverId())
                || calculation.input().serverTimeSeconds() != receipt.committedAtSeconds()
                || calculation.input().maxSeconds() != receipt.maxSeconds()
                || calculation.seconds() != receipt.seconds() || calculation.stageId() != receipt.rewardStage()
                || receipt.actual() == null || !role.equals(receipt.actual().roleId())
                || !receipt.theoreticalRewards().equals(calculation.outcome().total())
                || audit.after().dropSeconds() != calculation.ordinary().dropSeconds()
                || !audit.after().counters().equals(calculation.ordinary().counters())
                || audit.before().dropSeconds() != calculation.previousDropSeconds()
                || !audit.before().counters().equals(calculation.previousCounters())) {
            throw new IllegalStateException("挂机历史回执冻结状态不一致");
        }
    }

    /** 请求键使用与现有主线一致的规范UUID字符串，避免任意长度键或大小写别名。 */
    private static void requireId(String id) {
        if (id == null || !id.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) {
            throw new IllegalArgumentException("挂机领取请求或回执ID无效");
        }
    }

    /** 协议已有int64按JS安全正整数传输，不能接受溢出/零值并在前端静默舍入。 */
    private static void requireSafePositive(long value, String name) {
        if (value < 1 || value > MAX_SAFE_INTEGER) {
            throw new IllegalArgumentException(name + "超出安全正整数范围");
        }
    }

    /** 在提交前保证历史回执的所有数值可由现有JS安全整数协议精确交付，不能先提交再因序列化溢出失联。 */
    private static void requireSafeReceiptNumbers(JsonNode value) {
        if (value.isIntegralNumber()
                && (!value.canConvertToLong() || value.asLong() < 0 || value.asLong() > MAX_SAFE_INTEGER)) {
            throw new IllegalStateException("挂机回执数值超出协议精确非负整数范围");
        }
        if (value.isObject() || value.isArray()) {
            for (var child : value) {
                requireSafeReceiptNumbers(child);
            }
        }
    }

    /** 指纹只包含固定请求名、格式与原expected版本，传输重发和凭证变化不改变同一意图。 */
    private static String fingerprint(long expectedVersion) {
        return digest("chapter.idle.claim\nformat=" + REQUEST_FORMAT + "\nexpected=" + expectedVersion);
    }

    /** 对原始持久载荷求SHA-256检测意外损坏，不把摘要当作客户端授权或签名。 */
    private static String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException failure) {
            throw new IllegalStateException("缺少挂机回执摘要算法", failure);
        }
    }
}
