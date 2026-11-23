/**
 * 通用发奖反馈：将真实发放结果投影为展示通知，在原业务事务提交后才交给在线连接。
 * 业务保存的成功回执ID是唯一展示身份；本服务不写资产、不增加版本，也不保存第二份发奖队列。
 * 离线或交付失败时由业务持久回执恢复展示，不能因此重新发奖。
 */
package com.funsgamex.mxzg.reward;

import com.funsgamex.mxzg.role.RoleRules;
import com.funsgamex.mxzg.hero.HeroGrantService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class RewardFeedbackService {
    /** 反馈投影和协议保持一致，拒绝JavaScript不能精确表达的数量与资产版本。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
    /** 持久成功回执的标准小写UUID格式，不生成第二个通知身份。 */
    private static final String UUID_PATTERN = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
    /** 提交后交付失败的统一日志，不影响已经完成的发奖事务。 */
    private static final Logger LOG = LoggerFactory.getLogger(RewardFeedbackService.class);
    /** 只向当前进程在线会话分发已提交展示，不拥有资产和持久回执。 */
    private final ApplicationEventPublisher events;

    /** 旧通用发奖的三种反馈；SILENT保持资产同步但不推送展示通知。 */
    public enum Mode { SILENT, POPUP, TIPS }

    /**
     * 同一配置ID合并后的实际到账，不是理论奖励或钱包余额。
     * @param itemId 奖励的真实配置ID。
     * @param credited 合并后的正安全整数数量。
     */
    public record Item(int itemId, long credited) {}

    /**
     * 同笔发奖经验链实际发生的起止等级，只供显示，不读取当前角色或复制经验资产。
     * @param beforeLevel 本次真实发放前的正角色等级。
     * @param afterLevel 全部连续经验发放后的等级，必须严格高于beforeLevel。
     */
    public record RoleUpgrade(int beforeLevel, int afterLevel) {
        /** 拒绝不升或倒退的摘要，不能以非升级通知打开升级窗口。 */
        public RoleUpgrade {
            if (beforeLevel < 1 || afterLevel <= beforeLevel) {
                throw new IllegalArgumentException("通用升级反馈的前后等级无效");
            }
        }
    }

    /**
     * 已验证、不可变的通用展示消息；不用于写入客户端资产。
     * @param schemaVersion 固定为1的通用反馈格式版本。
     * @param receiptId 原业务持久成功回执ID，恢复展示时仍使用它。
     * @param roleId 真实发放结果所属角色。
     * @param assetRevision 原资产事务的持久版本，客户端等待该版本提交后展示。
     * @param mode 本次业务选择的通用展示方式。
     * @param items 按首次出现顺序合并的正实际到账，包含独立升级附赠。
     * @param requestId 可空的原业务请求关联，只帮助识别提前到达的通知，不改变回执展示身份。
     * @param roleUpgrade 同笔真实经验链的升级摘要；没有升级时为空，不用当前角色等级推断。
     */
    public record Notice(int schemaVersion, String receiptId, String roleId, long assetRevision,
            Mode mode, List<Item> items, String requestId, RoleUpgrade roleUpgrade,
            List<HeroGrantService.Granted> heroes) {
        /** 原无英雄反馈保持原明细，新增字段为空不从名册补查。 */
        public Notice(int schemaVersion, String receiptId, String roleId, long assetRevision,
                Mode mode, List<Item> items, String requestId, RoleUpgrade roleUpgrade) {
            this(schemaVersion, receiptId, roleId, assetRevision, mode, items, requestId, roleUpgrade, List.of());
        }

        /** 复制明细，避免调用者在事务登记后改变已验证的展示数据。 */
        public Notice {
            items = List.copyOf(items);
            heroes = List.copyOf(heroes);
        }
    }

    /** 仅在原事务提交后发布；连接层只能发送notice，不能据此再次修改资产。 */
    public record Committed(Notice notice) {}

    /** 注入应用事件出口；事务去重随线程事务绑定，不跨账号积累展示状态。 */
    public RewardFeedbackService(ApplicationEventPublisher events) {
        this.events = events;
    }

    /**
     * 在业务事务内登记通用反馈；回滚无通知，静默或零到账也不弹空窗。
     * 通用业务不提供请求关联，可将同一份反馈随本笔回执持久化，用于失败重试。
     * @param actual 本事务真实发放结果；items.credited不包含bonuses，二者各计一次。
     * @return 同时用于本次在线通知和回执恢复的反馈。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Notice publish(String receiptId, String roleId, long assetRevision, Mode mode,
            RewardGrantResult actual) {
        return publish(receiptId, roleId, assetRevision, mode, actual, null);
    }

    /**
     * 在业务事务内登记可选的原请求关联，便于客户端识别先于业务回包到达的反馈。
     * 同事务同角色同回执只登记一次；关联或明细不一致都拒绝事务，不新建发奖或展示身份。
     * @param actual 本事务真实发放结果；items.credited与bonuses各计一次。
     * @param requestId 原业务请求的小写UUID；null表示业务无需请求关联，空串或非法UUID拒绝。
     * @return 本次已登记的不可变反馈，只有原事务成功提交后才交付在线连接。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Notice publish(String receiptId, String roleId, long assetRevision, Mode mode,
            RewardGrantResult actual, String requestId) {
        requireTransaction();
        return register(project(receiptId, roleId, assetRevision, mode, actual, requestId));
    }

    /**
     * 提交独立实例领域本事务已完成的到账明细，例如神装商城新建的随机实例。
     * 只接收写库后汇总的实际模板和正数量，与通用发奖共用提交后反馈。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Notice publishItems(String receiptId, String roleId, long assetRevision, Mode mode,
            List<Item> items, String requestId) {
        requireTransaction();
        validateIdentity(receiptId, roleId, assetRevision, mode, requestId);
        Map<Integer, Long> merged = new LinkedHashMap<>();
        for (var item : items) {
            add(merged, item.itemId(), item.credited());
        }
        List<Item> actual = merged.entrySet().stream().map(row -> new Item(row.getKey(), row.getValue())).toList();
        return register(new Notice(1, receiptId, roleId, assetRevision, mode, actual, requestId, null));
    }

    /** 登记不可变通知，事务内共享去重与提交钩子。 */
    @SuppressWarnings("unchecked")
    private Notice register(Notice notice) {
        Map<String, Notice> batch = (Map<String, Notice>) TransactionSynchronizationManager.getResource(this);
        if (batch == null) {
            batch = new LinkedHashMap<>();
            TransactionSynchronizationManager.bindResource(this, batch);
            registerBatch(batch);
        }
        String key = notice.roleId() + ":" + notice.receiptId();
        Notice previous = batch.putIfAbsent(key, notice);
        if (previous != null && !previous.equals(notice)) {
            throw new IllegalStateException("同一发奖回执的反馈内容不一致");
        }
        return notice;
    }

    /** 验证归属、请求关联及连续历史经验，只投影正实际量与真实升级，不能取当前资产差分。 */
    private Notice project(String receiptId, String roleId, long revision, Mode mode,
            RewardGrantResult actual, String requestId) {
        validateIdentity(receiptId, roleId, revision, mode, requestId);
        if (actual == null || !roleId.equals(actual.roleId())) {
            throw new IllegalArgumentException("通用发奖反馈缺少当前角色的实际结果");
        }
        Map<Integer, Long> merged = new LinkedHashMap<>();
        for (var item : Objects.requireNonNull(actual.items(), "实际发放明细缺失")) {
            add(merged, item.itemId(), item.credited());
        }
        for (var bonus : Objects.requireNonNull(actual.bonuses(), "实际附赠明细缺失")) {
            add(merged, bonus.itemId(), bonus.quantity());
        }
        List<Item> items = merged.entrySet().stream().map(row -> new Item(row.getKey(), row.getValue())).toList();
        return new Notice(1, receiptId, roleId, revision, mode, items, requestId, roleUpgrade(actual), actual.heroes());
    }

    /** 反馈和独立资产到账使用同一协议身份约束。 */
    private static void validateIdentity(String receiptId, String roleId, long revision, Mode mode, String requestId) {
        if (receiptId == null || !receiptId.matches(UUID_PATTERN) || roleId == null || roleId.isBlank()
                || roleId.length() > 128 || revision < 1 || revision > MAX_SAFE_INTEGER
                || mode == null || (requestId != null && !requestId.matches(UUID_PATTERN))) {
            throw new IllegalArgumentException("通用发奖反馈身份、请求关联或版本无效");
        }
    }

    /**
     * 校验原实际经验链并提取首尾等级；允许零接纳及没有升级，不因零赠钻漏掉真实升级。
     * 连续性同时核对本级经验，避免把不同事务或角色的片段拼成一次升级；不查询当前等级配置或资产。
     */
    private RoleUpgrade roleUpgrade(RewardGrantResult actual) {
        var gains = Objects.requireNonNull(actual.experience(), "实际经验明细缺失");
        if (gains.isEmpty()) {
            return null;
        }
        RoleRules.ExperienceGain previous = null;
        for (var gain : gains) {
            if (gain.beforeLevel() < 1 || gain.level() < gain.beforeLevel()
                    || !safeAmount(gain.beforeExperience()) || !safeAmount(gain.requested())
                    || gain.requested() == 0 || !safeAmount(gain.accepted()) || !safeAmount(gain.ignored())
                    || !safeAmount(gain.experience()) || !safeAmount(gain.diamonds())
                    || Math.addExact(gain.accepted(), gain.ignored()) != gain.requested()
                    || (gain.level() > gain.beforeLevel() && gain.accepted() == 0)
                    || (gain.level() == gain.beforeLevel() && gain.diamonds() != 0)
                    || (previous != null && (previous.level() != gain.beforeLevel()
                        || previous.experience() != gain.beforeExperience()))) {
                throw new IllegalArgumentException("通用升级反馈的实际经验链无效或不连续");
            }
            previous = gain;
        }
        int beforeLevel = gains.getFirst().beforeLevel();
        int afterLevel = gains.getLast().level();
        return afterLevel > beforeLevel ? new RoleUpgrade(beforeLevel, afterLevel) : null;
    }

    /** 历史经验和附赠数量必须能由JavaScript精确表达，零值属于合法领域结果。 */
    private static boolean safeAmount(long value) {
        return value >= 0 && value <= MAX_SAFE_INTEGER;
    }

    /** 过滤零实际到账；负数、无效配置ID、单项或合并溢出都拒绝，避免展示假奖励。 */
    private void add(Map<Integer, Long> merged, int itemId, long quantity) {
        if (itemId < 1 || quantity < 0 || quantity > MAX_SAFE_INTEGER) {
            throw new IllegalArgumentException("通用发奖反馈数量或配置ID无效");
        }
        if (quantity == 0) {
            return;
        }
        long total = Math.addExact(merged.getOrDefault(itemId, 0L), quantity);
        if (total > MAX_SAFE_INTEGER) {
            throw new IllegalArgumentException("通用发奖反馈合并数量超过安全范围");
        }
        merged.put(itemId, total);
    }

    /** 为一个真实事务登记提交与清理钩子；独立新事务不能复用外层去重集合。 */
    private void registerBatch(Map<String, Notice> owned) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            /** 挂起时移除本事务资源，让REQUIRES_NEW独立登记和提交。 */
            @Override
            public void suspend() {
                unbindOwnedBatch(owned);
            }

            /** 内层结束后恢复原集合，避免外层重复登记已存在的回执。 */
            @Override
            public void resume() {
                TransactionSynchronizationManager.bindResource(RewardFeedbackService.this, owned);
            }

            /** 可见模式交付正到账或真实升级；静默仍不展示，不补发资产或制造空窗。 */
            @Override
            public void afterCommit() {
                for (Notice notice : owned.values()) {
                    if (notice.mode() != Mode.SILENT && (!notice.items().isEmpty() || notice.roleUpgrade() != null)) {
                        notifyCommitted(notice);
                    }
                }
            }

            /** 提交或回滚均释放本事务集合，不清掉外层或另一事务资源。 */
            @Override
            public void afterCompletion(int status) {
                unbindOwnedBatch(owned);
            }
        });
    }

    /** 提交后交付失败只记日志；异常不能使客户端把已完成事务误判为可重新发奖。 */
    private void notifyCommitted(Notice notice) {
        try {
            events.publishEvent(new Committed(notice));
        } catch (RuntimeException failure) {
            try {
                LOG.warn("奖励已提交但反馈交付失败，等待业务回执恢复：roleId={} receiptId={}",
                        notice.roleId(), notice.receiptId(), failure);
            } catch (RuntimeException loggingFailure) {
                // 日志也不可用时仍保留持久成功结果，不能改变业务或再次发奖。
            }
        }
    }

    /** 直接构造的测试对象也必须遵守原事务约束，不能绕过MANDATORY自动提交展示。 */
    private void requireTransaction() {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("发奖反馈必须在原业务事务内登记");
        }
    }

    /** 仅解除对象身份相同的集合；重复清理和内外事务切换均不会误删其他登记。 */
    private void unbindOwnedBatch(Map<String, Notice> owned) {
        if (TransactionSynchronizationManager.getResource(this) == owned) {
            TransactionSynchronizationManager.unbindResource(this);
        }
    }
}
