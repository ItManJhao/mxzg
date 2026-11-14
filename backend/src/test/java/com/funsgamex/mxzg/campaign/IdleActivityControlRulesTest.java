/**
 * 挂机活动控制纯规则回归：核对真实首轮、最大轮次来源、严格推进边界及三种循环类型。
 * 直接加载同源投影或使用包内隔离输入，不启动Spring、不维护数据库或触发资产清理。
 * 合成多轮配置只验证已核实旧算法，不表示当前单轮活动已扩展或开放。
 */
package com.funsgamex.mxzg.campaign;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class IdleActivityControlRulesTest {
    /** 测试使用的固定上海开服日，避免读取机器当前日期或默认时区。 */
    private static final long OPENED = Instant.parse("2026-11-13T06:00:00Z").getEpochSecond();
    /** 上述开服日上海零点对应的Unix秒。 */
    private static final long MIDNIGHT = Instant.parse("2026-11-12T16:00:00Z").getEpochSecond();
    /** 旧周期天数使用的固定秒数，测试不以本机日历替代。 */
    private static final long DAY = 86_400;

    /** 构造独立控制行，字段与生产投影一一对应，不省略合法0值。 */
    private Map<String, Object> control(int id, int openDay, int duration, int clean, int interval,
                                         int cycle, int timeLimit, int maxTurns) {
        return new HashMap<>(Map.of("activityId", id, "openServerDay", openDay,
                "durationDays", duration, "cleanDays", clean, "intervalDays", interval,
                "cycleType", cycle, "openTimeLimit", timeLimit, "maxTurns", maxTurns));
    }

    /** 默认夹具沿真实控制参数，调用者可以单独替换016来验证其他旧循环类型。 */
    private List<Map<String, Object>> controls() {
        return new ArrayList<>(List.of(control(16, 1, 7, 2, 0, 0, 0, 1),
                control(34, 9999, 7, 0, 0, 0, 0, 1)));
    }

    /** 编码独立schema1控制投影，自报version不作为规则真实版本。 */
    private byte[] content(List<Map<String, Object>> controls) {
        return new ObjectMapper().writeValueAsBytes(Map.of("schema", 1, "version", "untrusted",
                "controls", controls));
    }

    /** 从包内原字节入口加载控制夹具，沿生产校验，不访问文件或持久状态。 */
    private IdleActivityControlRules rules(List<Map<String, Object>> controls) {
        return new IdleActivityControlRules(new ObjectMapper(), content(controls));
    }

    /** 组合一份多轮016配置及真实034默认值，不误用44作为循环活动。 */
    private IdleActivityControlRules loopRules(int cycle, int maxTurns) {
        var controls = controls();
        controls.set(0, control(16, 1, 1, 1, 1, cycle, 0, maxTurns));
        return rules(controls);
    }

    /** 真实投影保留034的9999，两个cache最大轮次均为1，44没有自动循环配置。 */
    @Test
    void actualProjectionPreservesTheVerifiedSchedules() {
        var rules = new IdleActivityControlRules(new ObjectMapper());
        assertEquals(new IdleActivityControlRules.Schedule(16, 1, 7, 2, 0, 0, 0, 1), rules.schedule(16));
        assertEquals(new IdleActivityControlRules.Schedule(34, 9999, 7, 0, 0, 0, 0, 1), rules.schedule(34));
        assertThrows(IllegalStateException.class, () -> rules.schedule(44));
        assertThrows(IllegalStateException.class, () -> rules.schedule(99));
    }

    /** 首轮起于上海开服日零点，期限按配置天数独立累加，身份与limitDays不能从当前时间推断。 */
    @Test
    void initialPeriodUsesShanghaiOpeningMidnightAndConfiguredDurations() {
        var rules = new IdleActivityControlRules(new ObjectMapper());
        var timing = rules.initial(16, OPENED);
        assertEquals(new IdleActivityService.Period(MIDNIGHT, MIDNIGHT + 7 * DAY,
                MIDNIGHT + 9 * DAY, 1, MIDNIGHT, 0), timing.period());
        assertEquals(MIDNIGHT + 9 * DAY, timing.nextStartSeconds());
    }

    /** 034首轮必须保留真实未来日期，long计算跨2038不回绕为已过期负秒。 */
    @Test
    void day9999KeepsTheFuturePeriodWithoutIntegerTimeOverflow() {
        var timing = new IdleActivityControlRules(new ObjectMapper()).initial(34, OPENED);
        assertEquals(MIDNIGHT + 9998 * DAY, timing.period().startSeconds());
        assertTrue(timing.period().startSeconds() > Integer.MAX_VALUE);
        assertEquals(timing.period().startSeconds() + 7 * DAY, timing.period().endSeconds());
        assertEquals(timing.period().endSeconds(), timing.period().clearSeconds());
        assertEquals(timing.period().clearSeconds(), timing.nextStartSeconds());
    }

    /** 严格大于冻结next才推进；积压很多期也只按旧next建立下一轮，不跳到当前日期。 */
    @Test
    void advanceIsStrictAndMovesAtMostOneFrozenPeriod() {
        var rules = loopRules(0, 5);
        var initial = rules.initial(16, OPENED);
        long next = initial.nextStartSeconds();
        assertTrue(rules.advance(16, initial.period(), next, next - 1).isEmpty());
        assertTrue(rules.advance(16, initial.period(), next, next).isEmpty());
        var once = rules.advance(16, initial.period(), next, next + 100 * DAY).orElseThrow();
        assertEquals(next, once.period().startSeconds());
        assertEquals(next, once.period().turnsTimeSeconds());
        assertEquals(2, once.period().turns());
        assertEquals(next + 3 * DAY, once.nextStartSeconds());
    }

    /** 类型0达到最大轮次就永久停止，真实两个单轮活动不因计时已过而重开。 */
    @Test
    void cycleZeroStopsAtTheMaximumConfiguredTurn() {
        var rules = new IdleActivityControlRules(new ObjectMapper());
        for (int id : List.of(16, 34)) {
            var initial = rules.initial(id, OPENED);
            assertTrue(rules.advance(id, initial.period(), initial.nextStartSeconds(),
                    initial.nextStartSeconds() + 1).isEmpty());
        }
    }

    /** 类型1到顶沿旧保留原轮次但更新身份时间，类型2到顶回到第1轮。 */
    @Test
    void repeatLastAndRestartCyclesKeepTheirDistinctTurnSemantics() {
        for (int cycle : List.of(1, 2)) {
            var rules = loopRules(cycle, 2);
            var initial = rules.initial(16, OPENED);
            var second = rules.advance(16, initial.period(), initial.nextStartSeconds(),
                    initial.nextStartSeconds() + 1).orElseThrow();
            assertEquals(2, second.period().turns());
            var third = rules.advance(16, second.period(), second.nextStartSeconds(),
                    second.nextStartSeconds() + 1).orElseThrow();
            assertEquals(cycle == 1 ? 2 : 1, third.period().turns());
            assertEquals(second.nextStartSeconds(), third.period().turnsTimeSeconds());
        }
    }

    /** 配置上限降低时旧类型1仍保留已存轮次，推进只改新周期并保留limitDays。 */
    @Test
    void repeatLastPreservesExistingTurnAndOpenDayLimit() {
        var rules = loopRules(1, 2);
        var current = new IdleActivityService.Period(MIDNIGHT, MIDNIGHT + DAY,
                MIDNIGHT + 2 * DAY, 7, MIDNIGHT, 13);
        long next = MIDNIGHT + 3 * DAY;
        var advanced = rules.advance(16, current, next, next + 1).orElseThrow();
        assertEquals(7, advanced.period().turns());
        assertEquals(13, advanced.period().limitDays());
        assertEquals(next + DAY, advanced.period().endSeconds());
        assertEquals(next + 2 * DAY, advanced.period().clearSeconds());
    }

    /** 非零星期限制带有旧循环疑点，只明确拒绝初始化，不悄悄换成任意星期算法。 */
    @Test
    void nonZeroWeekLimitIsNotSilentlyRedesigned() {
        var controls = controls();
        controls.set(0, control(16, 1, 7, 2, 0, 0, 7, 1));
        var rules = rules(controls);
        assertEquals(7, rules.schedule(16).openTimeLimit());
        assertThrows(IllegalStateException.class, () -> rules.initial(16, OPENED));
    }

    /** 维护期限精确相加，靠近long上界时直接拒绝，不返回回绕时间或部分候选。 */
    @Test
    void overflowRejectsTheNewPeriod() {
        var rules = loopRules(1, 1);
        var current = new IdleActivityService.Period(0, 0, 0, 1, 0, 0);
        assertThrows(ArithmeticException.class,
                () -> rules.advance(16, current, Long.MAX_VALUE - 1, Long.MAX_VALUE));
        assertEquals(new IdleActivityService.Period(0, 0, 0, 1, 0, 0), current);
    }

    /** 缺失、逆序或负时间不得转成未开启；44也不能绕过循环类型约束。 */
    @Test
    void invalidOpeningOrCurrentPeriodIsRejected() {
        var rules = loopRules(1, 2);
        assertThrows(IllegalArgumentException.class, () -> rules.initial(16, -1));
        assertThrows(IllegalArgumentException.class, () -> rules.initial(16, Long.MAX_VALUE));
        var initial = rules.initial(16, OPENED);
        assertThrows(IllegalArgumentException.class,
                () -> rules.advance(16, null, initial.nextStartSeconds(), OPENED));
        assertThrows(IllegalArgumentException.class,
                () -> rules.advance(16, initial.period(), initial.period().clearSeconds() - 1, OPENED));
        assertThrows(IllegalArgumentException.class,
                () -> rules.advance(16, initial.period(), initial.nextStartSeconds(), -1));
        var invalid = new IdleActivityService.Period(10, 9, 10, 1, 10, 0);
        assertThrows(IllegalArgumentException.class, () -> rules.advance(16, invalid, 10, 11));
        assertThrows(IllegalStateException.class, () -> rules.initial(44, OPENED));
    }

    /** 两类配置必须完整唯一；无效字段、非法循环类型或零长周期都不能用默认0补齐。 */
    @Test
    void incompleteOrInvalidProjectionCannotBecomeADefaultSchedule() {
        var missing = controls();
        missing.removeLast();
        assertThrows(IllegalStateException.class, () -> rules(missing));
        var duplicate = controls();
        duplicate.add(duplicate.getFirst());
        assertThrows(IllegalStateException.class, () -> rules(duplicate));
        for (String field : List.of("openServerDay", "durationDays", "cleanDays", "intervalDays",
                "cycleType", "openTimeLimit", "maxTurns")) {
            var incomplete = controls();
            incomplete.getFirst().remove(field);
            assertThrows(IllegalStateException.class, () -> rules(incomplete), field);
        }
        for (Map<String, Object> invalid : List.of(
                control(16, 0, 1, 0, 0, 0, 0, 1), control(16, 1, 0, 0, 0, 0, 0, 1),
                control(16, 1, 1, -1, 0, 0, 0, 1), control(16, 1, 1, 0, 0, 3, 0, 1),
                control(16, 1, 1, 0, 0, 0, 8, 1), control(16, 1, 1, 0, 0, 0, 0, 0))) {
            var controls = controls();
            controls.set(0, invalid);
            assertThrows(IllegalStateException.class, () -> rules(controls));
        }
    }

    /** 控制版本摘要来自实际原字节，独立于活动运营状态和投影自报version。 */
    @Test
    void versionHashesTheActualProjectionBytes() throws Exception {
        byte[] bytes = content(controls());
        var rules = new IdleActivityControlRules(new ObjectMapper(), bytes);
        assertEquals("idle-activity-control-v1:" + HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(bytes)), rules.version());
        byte[] changed = (new String(bytes, StandardCharsets.UTF_8) + "\n").getBytes(StandardCharsets.UTF_8);
        assertNotEquals(rules.version(), new IdleActivityControlRules(new ObjectMapper(), changed).version());
    }
}
