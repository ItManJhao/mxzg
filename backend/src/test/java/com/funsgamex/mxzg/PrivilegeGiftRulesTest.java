/**
 * 特权礼包只读规则回归：核对原始礼包配置、挂机效果筛选和续购期限计算。
 * 直接读取本次Maven打包的源表或注入隔离解析结果，不写持有记录、不开放购买或发奖。
 * 时间按已确认Asia/Shanghai计算；重复加成保留为独立条目，配置缺失不能用零值掩盖。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.privilege.PrivilegeGiftRules;
import com.funsgamex.mxzg.privilege.PrivilegeGiftRules.Bonus;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import java.util.TimeZone;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;

class PrivilegeGiftRulesTest {
    /** 固定服务器秒：上海2026-11-13 15:45:30，不使用测试执行时钟。 */
    private static final long NOW = Instant.parse("2026-11-13T07:45:30Z").getEpochSecond();

    /** 从当前构造入口加载实际打包配置，不使用手工维护的运行时礼包清单。 */
    private PrivilegeGiftRules actualRules() {
        return new PrivilegeGiftRules(new ObjectMapper());
    }

    /** 读取本次POM打包的共享表；缺资源直接失败，不能借用其他旧文件。 */
    private ObjectNode table() {
        try (var input = PrivilegeGiftRulesTest.class.getResourceAsStream("/gameplay/promotionprivilegegift.json")) {
            assertNotNull(input, "测试缺少实际打包礼包配置");
            return (ObjectNode) new ObjectMapper().readTree(input);
        } catch (java.io.IOException error) {
            throw new AssertionError("测试礼包配置无法关闭", error);
        }
    }

    /** 仅替换礼包表流的解析结果，字符串bonus仍由真实ObjectMapper处理。 */
    private PrivilegeGiftRules fixture(JsonNode table) {
        var json = spy(new ObjectMapper());
        doReturn(table).when(json).readTree(any(InputStream.class));
        return new PrivilegeGiftRules(json);
    }

    /** 定位真实已有的礼包行，避免用新建空行覆盖错误ID。 */
    private ObjectNode row(ObjectNode table, int id) {
        for (var entry : table.path("rows")) {
            if (entry.path("idx").asInt() == id) {
                return (ObjectNode) entry;
            }
        }
        throw new AssertionError("测试找不到礼包配置：" + id);
    }

    /** 源表共13行，合法ID均可读取；未知礼包不能退回无加成配置。 */
    @Test
    void allThirteenConfiguredGiftsRemainReadable() {
        var rules = actualRules();
        assertEquals(13, table().path("rows").size());
        for (int id : List.of(100100, 100200, 100210, 100300, 100400, 100500, 100600,
                100610, 100620, 100700, 100800, 100900, 101000)) {
            assertEquals(id, rules.config(id).id());
        }
        assertThrows(IllegalStateException.class, () -> rules.config(999999));
        assertThrows(IllegalStateException.class, () -> rules.config(-1));
    }

    /** 永久经验礼包保留两种挂机效果，金币礼包排除BUY_GOLD，隐藏等级不屏蔽已持有加成。 */
    @Test
    void onlyIdleEffectsEnterThePreparedRules() {
        var rules = actualRules();
        assertEquals(List.of(new Bonus(900003, 5000, "IDLE_ROLE_EXP"),
                new Bonus(900101, 5000, "IDLE_HERO_EXP")), rules.config(100610).idleBonuses());
        assertEquals(List.of(new Bonus(900001, 5000, "IDLE_GOLD")), rules.config(100620).idleBonuses());
        assertEquals(List.of(new Bonus(900003, 5000, "IDLE_ROLE_EXP")), rules.config(100300).idleBonuses());
        for (int id : List.of(100100, 100200, 100210, 100600, 100700, 100800, 100900, 101000)) {
            assertTrue(rules.config(id).idleBonuses().isEmpty());
        }
    }

    /** 自然天从上海当天零点起算，不把7天期限解释为购买后满7乘24小时。 */
    @Test
    void naturalDaysStartAtShanghaiMidnight() {
        var rules = actualRules();
        assertEquals(7, rules.config(100100).limitDays());
        assertEquals(0, rules.config(100100).timeMode());
        assertEquals(Instant.parse("2026-11-19T16:00:00Z").getEpochSecond(),
                rules.renewedEndTime(100100, 0, NOW));
        assertEquals(Instant.parse("2026-12-12T16:00:00Z").getEpochSecond(),
                rules.renewedEndTime(100300, 0, NOW));
    }

    /** 购买时刻模式按固定86400秒计算一天，保留购买的时分秒。 */
    @Test
    void purchaseTimeModePreservesTheCurrentTimeOfDay() {
        var rules = actualRules();
        assertEquals(1, rules.config(100900).timeMode());
        assertEquals(Instant.parse("2026-11-20T07:45:30Z").getEpochSecond(),
                rules.renewedEndTime(100900, 0, NOW));
        assertEquals(Instant.parse("2026-12-13T07:45:30Z").getEpochSecond(),
                rules.renewedEndTime(101000, 0, NOW));
    }

    /** 服务器秒跨过上海零点后自然天期限随之增加一天，边界不是UTC零点。 */
    @Test
    void naturalDayBoundaryFollowsShanghaiDate() {
        var rules = actualRules();
        long before = Instant.parse("2026-11-13T15:59:59Z").getEpochSecond();
        long at = before + 1;
        assertEquals(Instant.parse("2026-11-19T16:00:00Z").getEpochSecond(),
                rules.renewedEndTime(100100, 0, before));
        assertEquals(Instant.parse("2026-11-20T16:00:00Z").getEpochSecond(),
                rules.renewedEndTime(100100, 0, at));
    }

    /** 机器默认时区变化不影响自然天结果，用例结束即恢复原设置。 */
    @Test
    void naturalDayCalculationDoesNotUseTheMachineTimeZone() {
        var rules = actualRules();
        TimeZone previous = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
            long utc = rules.renewedEndTime(100100, 0, NOW);
            TimeZone.setDefault(TimeZone.getTimeZone("America/Los_Angeles"));
            assertEquals(utc, rules.renewedEndTime(100100, 0, NOW));
            assertEquals(Instant.parse("2026-11-19T16:00:00Z").getEpochSecond(), utc);
        } finally {
            TimeZone.setDefault(previous);
        }
    }

    /** 限时礼包续购覆盖旧期限，不能把未到期的剩余秒数追加到新期限。 */
    @Test
    void renewalReplacesInsteadOfExtendingRemainingTime() {
        var rules = actualRules();
        long oldExpiry = NOW + 300L * 86400;
        for (int id : List.of(100100, 100300, 100900, 101000)) {
            assertEquals(rules.renewedEndTime(id, 0, NOW), rules.renewedEndTime(id, oldExpiry, NOW));
            assertTrue(rules.renewedEndTime(id, oldExpiry, NOW) < oldExpiry);
        }
    }

    /** 永久配置不改旧endTime：新记录0仍永久，旧非零期限也不能自动重置0。 */
    @Test
    void permanentGiftKeepsThePersistedEndTime() {
        var rules = actualRules();
        for (int id : List.of(100610, 100620, 100700, 100800)) {
            assertEquals(0, rules.config(id).limitDays());
            assertEquals(0, rules.renewedEndTime(id, 0, NOW));
            assertEquals(NOW + 500, rules.renewedEndTime(id, NOW + 500, NOW));
            assertEquals(NOW - 1, rules.renewedEndTime(id, NOW - 1, NOW));
        }
    }

    /** 同礼包内相同挂机加成保留为两个条目，其他玩法无挂机字段仍可忽略。 */
    @Test
    void duplicateIdleEntriesStayIndependentAndUnrelatedEffectsAreIgnored() {
        var table = table();
        row(table, 100610).put("bonus", "[{\"item_type\":900003,\"bonus\":5000,\"effect\":\"IDLE_ROLE_EXP\"},"
                + "{\"effect\":\"UNRESTORED_FEATURE\"},"
                + "{\"item_type\":900003,\"bonus\":5000,\"effect\":\"IDLE_ROLE_EXP\"}]");
        var bonus = new Bonus(900003, 5000, "IDLE_ROLE_EXP");
        assertEquals(List.of(bonus, bonus), fixture(table).config(100610).idleBonuses());
    }

    /** 旧空白/缺失/JSON null和空数组都表示该配置没有加成，不替代未知礼包ID。 */
    @Test
    void oldEmptyBonusFormsRemainValid() {
        for (String bonus : List.of("", "  ", "null", "[]")) {
            var table = table();
            row(table, 100610).put("bonus", bonus);
            assertTrue(fixture(table).config(100610).idleBonuses().isEmpty());
        }
        var missing = table();
        row(missing, 100610).remove("bonus");
        assertTrue(fixture(missing).config(100610).idleBonuses().isEmpty());
        var nullValue = table();
        row(nullValue, 100610).putNull("bonus");
        assertTrue(fixture(nullValue).config(100610).idleBonuses().isEmpty());
    }

    /** 重复礼包键、坏JSON及适用挂机条目缺ID/系数或负系数必须拒绝，不能补0。 */
    @Test
    void brokenApplicableConfigurationCannotBecomeZeroBonus() {
        var duplicate = table();
        var rows = new ObjectMapper().createArrayNode();
        for (var row : duplicate.path("rows")) {
            rows.add(row);
        }
        rows.add(rows.get(0));
        duplicate.set("rows", rows);
        assertThrows(IllegalStateException.class, () -> fixture(duplicate));
        for (String bonus : List.of(
                "[{\"effect\":\"IDLE_GOLD\",\"bonus\":5000}]",
                "[{\"effect\":\"IDLE_GOLD\",\"item_type\":900001}]",
                "[{\"effect\":\"IDLE_GOLD\",\"item_type\":900001,\"bonus\":-1}]",
                "[{\"effect\":\"IDLE_GOLD\",\"item_type\":0,\"bonus\":5000}]")) {
            var table = table();
            row(table, 100610).put("bonus", bonus);
            assertThrows(IllegalStateException.class, () -> fixture(table));
        }
        var malformed = table();
        row(malformed, 100610).put("bonus", "[broken-json");
        assertThrows(RuntimeException.class, () -> fixture(malformed));
    }

    /** 负数时刻/期限和未知礼包拒绝，时间加法溢出不能截断或回绕成永久0。 */
    @Test
    void invalidTimesAndOverflowAreRejected() {
        var rules = actualRules();
        assertThrows(IllegalArgumentException.class, () -> rules.renewedEndTime(100610, -1, NOW));
        assertThrows(IllegalArgumentException.class, () -> rules.renewedEndTime(100610, 0, -1));
        assertThrows(IllegalStateException.class, () -> rules.renewedEndTime(999999, 0, NOW));
        assertThrows(ArithmeticException.class, () -> rules.renewedEndTime(100900, 0, Long.MAX_VALUE));
        assertThrows(RuntimeException.class, () -> rules.renewedEndTime(100100, 0, Long.MAX_VALUE));
    }

    /** 返回规则列表冻结，实际同源配置的版本在重复构造后稳定。 */
    @Test
    void rulesAreImmutableAndSourceVersionIsStable() {
        var rules = actualRules();
        assertThrows(UnsupportedOperationException.class, () -> rules.config(100610).idleBonuses().clear());
        assertNotNull(rules.version());
        assertFalse(rules.version().isBlank());
        assertEquals(rules.version(), actualRules().version());
    }
}
