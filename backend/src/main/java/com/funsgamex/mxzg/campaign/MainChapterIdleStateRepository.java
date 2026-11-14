/**
 * 新主线挂机累计的唯一持久入口：保存计时起点、操作版本、随机窗口和跨关类别计数。
 * 挑战负责首次创建，领取事务负责带旧版本消费；调用方须先取得角色锁并统一推进资产版本。
 * 本仓库不鉴权、不抽奖、不发奖、不发送同步，也不在缺行或格式不兼容时补免费累计。
 */
package com.funsgamex.mxzg.campaign;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Repository
public class MainChapterIdleStateRepository {
    /** 当前累计字段布局；未知正版本可以持久存在，但本实现拒绝消费。 */
    private static final int SCHEMA_VERSION = 1;
    /** 旧普通随机累计及类别计数的已核实语义，配置内容哈希变化不代表允许重置。 */
    private static final int SEMANTICS_VERSION = 1;
    /** 当前已核实基础/随机结算周期，单位秒。 */
    private static final int FREQUENCY_SECONDS = 60;
    /** 当前已核实的普通累计重置窗口，单位秒。 */
    private static final int RESET_SECONDS = 43_200;
    /** 协议和回执共同使用的精确整数上界，避免浏览器丢失操作版本或审计数量。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;

    /** 与角色资产使用同一数据源，所有变更加入调用方事务。 */
    private final JdbcTemplate jdbc;
    /** 启动加载的普通规则，只用于核对时间语义、类别和首次预置秒数。 */
    private final IdleRules rules;
    /** 全部关卡触发器的类别并集，不按当前关卡裁剪持久保底计数。 */
    private final Set<Integer> supportedGroupTypes;

    /**
     * 一份已核对的持久累计状态；时间字段单位秒，操作版本独立于统一资产revision。
     * @param schemaVersion 累计字段布局版本，当前仅接受1
     * @param semanticsVersion 普通随机累计与类别保底的语义版本，当前仅接受1
     * @param frequencySeconds 基础结算与随机次数换算周期，当前60秒
     * @param resetSeconds 普通随机累计的重置窗口，当前43200秒
     * @param startedAt 上次成功消费或首次挑战预置后的服务器Unix秒起点
     * @param operationVersion 当前持久消费版本，正整数；读取和时间流逝不递增
     * @param dropSeconds 已结算秒数在当前随机窗口的位置，范围0至resetSeconds-1
     * @param counters 全部已触发类别的原始数量和连续未中次数，缺类别表示尚未触发的零值
     */
    public record Accumulation(int schemaVersion, int semanticsVersion, int frequencySeconds, int resetSeconds,
                               long startedAt, long operationVersion, int dropSeconds,
                               Map<Integer, IdleRules.Counter> counters) {
        /** 冻结整组类别，避免候选计算或调用者修改已经读取的状态。 */
        public Accumulation {
            counters = Map.copyOf(counters);
        }
    }

    /** 注入唯一持久连接和同源规则，构造时建立跨关类别索引，不持有角色状态副本。 */
    public MainChapterIdleStateRepository(JdbcTemplate jdbc, IdleRules rules) {
        this.jdbc = jdbc;
        this.rules = rules;
        supportedGroupTypes = rules.data().triggers().stream()
                .map(IdleRules.Trigger::type).collect(Collectors.toUnmodifiableSet());
    }

    /**
     * 在首次受理挑战的角色锁事务中仅创建一次累计，已有起点与计数原样保留。
     * 不依赖活动或世界输入；挑战整体失败时由外层回滚，正常失败战斗仍保留该行。
     * @return true表示插入新行，调用方须同事务登记统一状态变化；false表示已存在且校验通过
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public boolean initializeForChallenge(String role, long nowSeconds) {
        requireTransaction();
        requireCompatibleRules();
        requireSafeNonnegative(nowSeconds, "挂机初始化服务器秒");
        int initialSeconds = rules.data().initialSeconds();
        if (initialSeconds < 0 || nowSeconds < initialSeconds) {
            throw new IllegalArgumentException("挂机首次预置秒数或服务器时间非法");
        }
        if (jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_idle WHERE role_id=?", Integer.class, role) != 0) {
            require(role);
            return false;
        }
        if (jdbc.update("INSERT INTO game_main_chapter_idle "
                        + "(role_id,started_at,schema_version,semantics_version,frequency_seconds,reset_seconds,operation_version,drop_seconds) "
                        + "VALUES (?,?,?,?,?,?,1,0)",
                role, nowSeconds - initialSeconds, SCHEMA_VERSION, SEMANTICS_VERSION,
                FREQUENCY_SECONDS, RESET_SECONDS) != 1) {
            throw new IllegalStateException("新主线挂机累计初始化行数异常");
        }
        return true;
    }

    /**
     * 在角色锁内读取并严格校验完整累计；缺行、未知格式或非法类别整包拒绝，不补建或清零。
     * 当前配置的类别并集决定合法键；保留其他关卡已经触发的合法类别及旧单次掉落超上限数量。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Accumulation require(String role) {
        requireTransaction();
        requireCompatibleRules();
        var rows = jdbc.query("SELECT schema_version,semantics_version,frequency_seconds,reset_seconds,"
                        + "started_at,operation_version,drop_seconds FROM game_main_chapter_idle WHERE role_id=?",
                (row, index) -> new Accumulation(row.getInt(1), row.getInt(2), row.getInt(3), row.getInt(4),
                        row.getLong(5), row.getLong(6), row.getInt(7), Map.of()), role);
        if (rows.size() != 1) {
            throw new IllegalStateException("新主线挂机累计缺失，不能在读取或领取时补建");
        }
        var counters = new HashMap<Integer, IdleRules.Counter>();
        jdbc.query("SELECT group_type,quantity,misses FROM game_main_chapter_idle_counter WHERE role_id=?",
                row -> {
                    int groupType = row.getInt(1);
                    var previous = counters.put(groupType, new IdleRules.Counter(row.getLong(2), row.getInt(3)));
                    if (previous != null) {
                        throw new IllegalStateException("新主线挂机累计类别重复");
                    }
                }, role);
        var stored = rows.getFirst();
        var result = new Accumulation(stored.schemaVersion(), stored.semanticsVersion(),
                stored.frequencySeconds(), stored.resetSeconds(), stored.startedAt(), stored.operationVersion(),
                stored.dropSeconds(), counters);
        validate(result);
        return result;
    }

    /**
     * 保存本次纯候选并将操作版本精确递增一次；旧版本条件必须恰好更新一行，否则拒绝消费。
     * 整组替换类别以保留纯规则的满窗清空结果；任何SQL失败均由外层事务回滚累计与实际资产。
     * @param before 同角色锁内require读取的前态，不接纳客户端提供的累计
     * @param newStartedAt 本次领取冻结的服务器秒，不得倒退到旧起点之前
     * @return 本次候选后态，仅外层提交后才代表持久消费成功；本方法不推进统一资产revision
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Accumulation consume(String role, Accumulation before, long newStartedAt, int newDropSeconds,
                                Map<Integer, IdleRules.Counter> newCounters) {
        requireTransaction();
        requireCompatibleRules();
        validate(Objects.requireNonNull(before, "挂机累计前态缺失"));
        if (newStartedAt < before.startedAt()) {
            throw new IllegalArgumentException("挂机消费起点不能倒退");
        }
        var after = new Accumulation(SCHEMA_VERSION, SEMANTICS_VERSION, FREQUENCY_SECONDS, RESET_SECONDS,
                newStartedAt, Math.addExact(before.operationVersion(), 1), newDropSeconds, newCounters);
        validate(after);
        if (jdbc.update("UPDATE game_main_chapter_idle SET started_at=?,operation_version=?,drop_seconds=? "
                        + "WHERE role_id=? AND operation_version=?",
                after.startedAt(), after.operationVersion(), after.dropSeconds(), role, before.operationVersion()) != 1) {
            throw new IllegalStateException("新主线挂机累计操作版本已变化");
        }
        jdbc.update("DELETE FROM game_main_chapter_idle_counter WHERE role_id=?", role);
        for (var entry : new TreeMap<>(after.counters()).entrySet()) {
            var counter = entry.getValue();
            if (jdbc.update("INSERT INTO game_main_chapter_idle_counter(role_id,group_type,quantity,misses) VALUES (?,?,?,?)",
                    role, entry.getKey(), counter.quantity(), counter.misses()) != 1) {
                throw new IllegalStateException("新主线挂机累计类别写入行数异常");
            }
        }
        return after;
    }

    /** 校验当前纯规则仍沿用已核实周期；不兼容变更必须显式迁移，不能自动取模或清计数。 */
    private void requireCompatibleRules() {
        if (rules.data().frequency() != FREQUENCY_SECONDS || rules.data().resetSeconds() != RESET_SECONDS) {
            throw new IllegalStateException("新主线挂机累计时间规则不兼容");
        }
    }

    /** 检查持久格式、精确整数范围和全部类别，不将损坏状态转换为可领取初值。 */
    private void validate(Accumulation value) {
        if (value.schemaVersion() != SCHEMA_VERSION || value.semanticsVersion() != SEMANTICS_VERSION
                || value.frequencySeconds() != FREQUENCY_SECONDS || value.resetSeconds() != RESET_SECONDS) {
            throw new IllegalStateException("新主线挂机累计格式或规则语义不兼容");
        }
        requireSafeNonnegative(value.startedAt(), "挂机累计起点");
        requireSafeNonnegative(value.operationVersion(), "挂机累计操作版本");
        if (value.operationVersion() == 0 || value.dropSeconds() < 0 || value.dropSeconds() >= RESET_SECONDS) {
            throw new IllegalStateException("新主线挂机累计版本或窗口秒数非法");
        }
        for (var entry : value.counters().entrySet()) {
            var counter = entry.getValue();
            if (!supportedGroupTypes.contains(entry.getKey()) || counter == null || counter.misses() < 0) {
                throw new IllegalStateException("新主线挂机累计类别或未中次数非法");
            }
            requireSafeNonnegative(counter.quantity(), "挂机累计原始数量");
        }
    }

    /** 所有持久时间、版本和原始数量须在精确非负整数范围内，超界不进行裁剪。 */
    private static void requireSafeNonnegative(long value, String field) {
        if (value < 0 || value > MAX_SAFE_INTEGER) {
            throw new IllegalArgumentException(field + "超出精确非负整数范围");
        }
    }

    /** 同时保护Spring代理和直接领域调用，避免方法被误用于无事务写入。 */
    private static void requireTransaction() {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("新主线挂机累计必须加入调用方事务");
        }
    }
}
