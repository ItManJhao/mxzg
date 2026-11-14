/**
 * 挂机活动016、034的纯周期规则：读取同源控制投影，计算首轮及一次定时维护的候选周期。
 * 由活动控制维护服务调用，不读取当前时钟或数据库，不操作角色状态、资产、兑换及清理回调。
 * 044由运营发布且没有策划循环；非零星期限制保留旧疑点并明确拒绝初始化，不推测修复规则。
 */
package com.funsgamex.mxzg.campaign;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public final class IdleActivityControlRules {
    /** 本批有真实策划循环依据的活动，044不能套用这些周期参数。 */
    private static final Set<Integer> CONTROL_IDS = Set.of(16, 34);
    /** 负责人确认的区服自然日时区，不随部署机器默认时区改变。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 旧周期天数按固定86400秒累加，不改成每天重新按日历加一天。 */
    private static final long DAY_SECONDS = 86_400;
    /** 活动ID到启动后冻结的循环参数，不持有已发布状态或当前轮次。 */
    private final Map<Integer, Schedule> schedules;
    /** 实际投影原字节摘要，不采用投影自报版本或持久控制revision。 */
    private final String version;

    /**
     * 旧策划控制行及真实最大轮次来源的冻结投影。
     * @param activityId 活动16或34，非掉落行idx
     * @param openServerDay 开服第几天开始首轮，1表示开服当天，保留034的9999
     * @param durationDays 每轮记录期天数，允许0，整个周期长度必须为正
     * @param cleanDays 记录结束后的展示/清理期天数，非负
     * @param intervalDays 清理期结束至下轮开始的间隔天数，非负
     * @param cycleType 0到顶停止，1到顶复用最后轮，2到顶回第1轮
     * @param openTimeLimit 原星期限制0至7；当前实际为0，非0初始化明确拒绝
     * @param maxTurns 016来自龙鳞掉落表，034来自诸神阶段表，不从034掉落表推断
     */
    public record Schedule(int activityId, int openServerDay, int durationDays, int cleanDays,
                           int intervalDays, int cycleType, int openTimeLimit, int maxTurns) {
        /** 拒绝非法控制配置或零长周期，避免定时维护产生无期限推进。 */
        public Schedule {
            long totalDays = Math.addExact(Math.addExact((long) durationDays, cleanDays), intervalDays);
            if (!CONTROL_IDS.contains(activityId) || openServerDay < 1 || durationDays < 0
                    || cleanDays < 0 || intervalDays < 0 || totalDays <= 0 || cycleType < 0
                    || cycleType > 2 || openTimeLimit < 0 || openTimeLimit > 7 || maxTurns < 1) {
                throw new IllegalArgumentException("挂机活动循环参数非法：" + activityId);
            }
        }
    }

    /**
     * 一次纯周期计算的冻结结果，不包含资产已清理标记或持久写入结果。
     * @param period 首轮或推进后的完整控制期，轮次身份时间使用本轮开始秒
     * @param nextStartSeconds 下一轮候选开始Unix秒，等于清理期结束加配置间隔
     */
    public record Timing(IdleActivityService.Period period, long nextStartSeconds) {
        /** 校验候选周期与下轮时间，避免调用方保存不完整或逆序周期。 */
        public Timing {
            validatePeriod(period);
            if (nextStartSeconds < period.clearSeconds()) {
                throw new IllegalArgumentException("挂机活动下轮时间早于清理期结束");
            }
        }
    }

    /** 启动读取唯一活动投影，缺少两类控制配置或字段非法时拒绝，不生成默认周期。 */
    @Autowired
    public IdleActivityControlRules(ObjectMapper json) {
        this(json, readContent());
    }

    /** 包内隔离输入入口，测试与生产共享完整校验和原字节摘要，不修改配置文件。 */
    IdleActivityControlRules(ObjectMapper json, byte[] content) {
        var root = json.readTree(new ByteArrayInputStream(content));
        if (root == null || !root.isObject() || number(root, "schema") != 1) {
            throw new IllegalStateException("挂机活动控制投影版本非法");
        }
        var controls = root.path("controls");
        if (!controls.isArray()) {
            throw new IllegalStateException("挂机活动控制投影缺失");
        }
        var loaded = new HashMap<Integer, Schedule>();
        for (var row : controls) {
            int id = number(row, "activityId");
            Schedule schedule;
            try {
                schedule = new Schedule(id, number(row, "openServerDay"), number(row, "durationDays"),
                        number(row, "cleanDays"), number(row, "intervalDays"), number(row, "cycleType"),
                        number(row, "openTimeLimit"), number(row, "maxTurns"));
            } catch (IllegalArgumentException error) {
                throw new IllegalStateException("挂机活动控制投影字段非法：" + id, error);
            }
            if (loaded.putIfAbsent(id, schedule) != null) {
                throw new IllegalStateException("挂机活动控制投影重复：" + id);
            }
        }
        if (!loaded.keySet().equals(CONTROL_IDS)) {
            throw new IllegalStateException("挂机活动控制投影缺少016或034");
        }
        schedules = Map.copyOf(loaded);
        try {
            version = "idle-activity-control-v1:" + HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少挂机活动控制摘要算法", error);
        }
    }

    /** 返回真实循环参数；044或未知活动拒绝，不伪造运营发布周期。 */
    public Schedule schedule(int id) {
        var schedule = schedules.get(id);
        if (schedule == null) {
            throw new IllegalStateException("挂机活动没有策划循环配置：" + id);
        }
        return schedule;
    }

    /**
     * 按上海开服当天零点及原openServerDay计算首轮，轮次1、身份时间等于开始秒、limitDays为0。
     * 非零openTimeLimit涉及旧星期分支疑点，本批明确拒绝，不根据当前日期猜测活动开始时间。
     * @param openedAtSeconds 已持久化的真实开服Unix秒，缺失不得使用当前时间替代
     * @throws IllegalArgumentException 时间为负、日期不可表示或计算结果早于Unix纪元时拒绝
     * @throws ArithmeticException 秒数精确乘加溢出时拒绝，不复现旧int时间回绕
     */
    public Timing initial(int id, long openedAtSeconds) {
        var schedule = schedule(id);
        if (schedule.openTimeLimit() != 0) {
            throw new IllegalStateException("挂机活动非零星期限制尚未核实：" + id);
        }
        if (openedAtSeconds < 0) {
            throw new IllegalArgumentException("挂机活动开服时间不能为负");
        }
        long midnight;
        try {
            midnight = Instant.ofEpochSecond(openedAtSeconds).atZone(SERVER_ZONE)
                    .toLocalDate().atStartOfDay(SERVER_ZONE).toEpochSecond();
        } catch (DateTimeException error) {
            throw new IllegalArgumentException("挂机活动开服时间超出日期范围", error);
        }
        long offset = Math.multiplyExact((long) schedule.openServerDay() - 1, DAY_SECONDS);
        return timing(schedule, Math.addExact(midnight, offset), 1, 0);
    }

    /**
     * 只计算一次定时维护候选：严格now大于冻结next才推进，积压多期也最多推进一轮。
     * cycle0到最大轮次返回空，cycle1保留已到顶轮次，cycle2回第1轮；limitDays沿旧持久记录保留。
     * @param current 当前已发布且完整的周期，不在此处判断资格或执行清理回调
     * @param frozenNext 已持久化并冻结的下轮开始Unix秒，不用当前时间重新定位周期
     * @param now 本次维护统一冻结的服务器Unix秒
     * @return 无需推进或已终止时为空；否则返回以frozenNext为开始秒的新一轮
     */
    public Optional<Timing> advance(int id, IdleActivityService.Period current, long frozenNext, long now) {
        var schedule = schedule(id);
        validatePeriod(current);
        if (now < 0 || frozenNext < current.clearSeconds()) {
            throw new IllegalArgumentException("挂机活动维护时刻或下轮时间非法");
        }
        if (now <= frozenNext) {
            return Optional.empty();
        }
        int turns = current.turns();
        if (turns < schedule.maxTurns()) {
            turns = Math.addExact(turns, 1);
        } else if (schedule.cycleType() == 0) {
            return Optional.empty();
        } else if (schedule.cycleType() == 2) {
            turns = 1;
        }
        return Optional.of(timing(schedule, frozenNext, turns, current.limitDays()));
    }

    /** 返回规则原字节内容版本；持久控制维护版本仍由所属服务管理。 */
    public String version() {
        return version;
    }

    /** 使用精确long秒运算建立一轮候选，跨2038仍保留真实未来时间，不更新持久状态。 */
    private static Timing timing(Schedule schedule, long start, int turns, int limitDays) {
        long end = Math.addExact(start, Math.multiplyExact((long) schedule.durationDays(), DAY_SECONDS));
        long clear = Math.addExact(end, Math.multiplyExact((long) schedule.cleanDays(), DAY_SECONDS));
        long next = Math.addExact(clear, Math.multiplyExact((long) schedule.intervalDays(), DAY_SECONDS));
        return new Timing(new IdleActivityService.Period(start, end, clear, turns, start, limitDays), next);
    }

    /** 检查当前或候选周期完整性，不把负时间、逆序期限或缺轮次当作未开启。 */
    private static void validatePeriod(IdleActivityService.Period period) {
        if (period == null || period.startSeconds() < 0 || period.endSeconds() < period.startSeconds()
                || period.clearSeconds() < period.endSeconds() || period.turns() < 1
                || period.turnsTimeSeconds() < 0 || period.limitDays() < 0) {
            throw new IllegalArgumentException("挂机活动循环周期非法");
        }
    }

    /** 读取投影原字节，缺资源或读取失败时拒绝启动，不补默认控制配置。 */
    private static byte[] readContent() {
        try (var input = IdleActivityControlRules.class.getResourceAsStream("/gameplay/idle-activities.json")) {
            if (input == null) {
                throw new IllegalStateException("挂机活动控制规则投影缺失");
            }
            return input.readAllBytes();
        } catch (IOException error) {
            throw new IllegalStateException("读取挂机活动控制规则投影失败", error);
        }
    }

    /** 读取必须显式存在的非负int字段，缺失、小数、字符串和越界不以0代替。 */
    private static int number(JsonNode row, String field) {
        var value = row.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() < 0) {
            throw new IllegalStateException("挂机活动控制字段非法：" + field);
        }
        return value.asInt();
    }
}
