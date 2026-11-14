/**
 * 活动044可信发布内容的纯校验回归：验证旧六字段与物品JSON规范化、内容指纹及发布日数。
 * 不启动Spring或数据库，不查物品/玩家，不抽样、不兑换或发布真实活动。
 */
package com.funsgamex.mxzg.campaign;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class IdleActivityPublicationUtilsTest {
    /** 现有JSON实现，测试不修改应用全局解析选项。 */
    private final ObjectMapper json = new ObjectMapper();

    /** 构造完整旧兑换条目；数值只是隔离输入，不代表对应物品或界面已开放。 */
    private IdleActivityPublicationUtils.Exchange exchange(int idx, String item, String cost) {
        return new IdleActivityPublicationUtils.Exchange(idx, item, cost, 3, 900001, 1);
    }

    /** 创建固定完整发布期，测试版本变化不会修改内容。 */
    private IdleActivityPublicationUtils.Publication publication(long version,
                                                                 List<IdleActivityPublicationUtils.Exchange> exchanges) {
        return new IdleActivityPublicationUtils.Publication(version, 100, 200, 300, 2, exchanges);
    }

    /** 经真实纯入口编码，不用预先拼接结果规避解析与规范化。 */
    private IdleActivityPublicationUtils.Encoded encoded(String item, String cost) {
        return IdleActivityPublicationUtils.encode(json, publication(1, List.of(exchange(1, item, cost))));
    }

    /** 空白/对象字段顺序/省略chance与显式0等义，旧六字段及重复奖励条目均保持。 */
    @Test
    void equivalentJsonNormalizesToTheSameOldShapeAndFingerprint() {
        var first = encoded("[ {\"item_num\":2, \"item_type\":900001},"
                        + "{\"item_type\":900001,\"chance\":0,\"item_num\":3} ]",
                "[ {\"item_num\":1,\"item_type\":900002} ]");
        var second = encoded("[{\"chance\":0,\"item_type\":900001,\"item_num\":2},"
                        + "{\"item_num\":3,\"chance\":0,\"item_type\":900001}]",
                "[{\"item_type\":900002,\"chance\":0,\"item_num\":1}]");
        assertEquals(first, second);
        assertTrue(first.fingerprint().matches("[0-9a-f]{64}"));
        var row = json.readTree(first.configJson()).get(0);
        var names = new HashSet<String>();
        row.propertyNames().forEach(names::add);
        assertEquals(Set.of("idx", "item", "cost", "limit", "mark_icon", "show_mark"), names);
        assertTrue(row.get("item").isString());
        assertTrue(row.get("cost").isString());
        var rewards = json.readTree(row.get("item").asString());
        assertEquals(2, rewards.size());
        assertEquals(2, rewards.get(0).get("item_num").asLong());
        assertEquals(3, rewards.get(1).get("item_num").asLong());
        assertEquals(0, rewards.get(0).get("chance").asInt());
    }

    /** 发布版本不进入内容指纹；期限、门槛和兑换内容任一变化都必须改变指纹。 */
    @Test
    void fingerprintTracksContentAndTimingButNotPublicationVersion() {
        var exchange = exchange(1, "[{\"item_type\":900001,\"item_num\":1}]", "[]");
        var baseline = IdleActivityPublicationUtils.encode(json, publication(1, List.of(exchange)));
        assertEquals(baseline, IdleActivityPublicationUtils.encode(json, publication(999, List.of(exchange))));
        var changes = List.of(
                new IdleActivityPublicationUtils.Publication(1, 101, 200, 300, 2, List.of(exchange)),
                new IdleActivityPublicationUtils.Publication(1, 100, 201, 300, 2, List.of(exchange)),
                new IdleActivityPublicationUtils.Publication(1, 100, 200, 301, 2, List.of(exchange)),
                new IdleActivityPublicationUtils.Publication(1, 100, 200, 300, 3, List.of(exchange)),
                publication(1, List.of(exchange(1, "[{\"item_type\":900001,\"item_num\":2}]", "[]"))),
                publication(1, List.of(new IdleActivityPublicationUtils.Exchange(1, exchange.item(), "[]", 4, 900001, 1))));
        for (var changed : changes) {
            assertNotEquals(baseline.fingerprint(), IdleActivityPublicationUtils.encode(json, changed).fingerprint());
        }
    }

    /** chance沿旧非负int原样保留，可大于百万；规范化不把它解释成掉落或发奖概率。 */
    @Test
    void optionalChanceIsPreservedWithoutInventingProbabilitySemantics() {
        var result = encoded("[{\"item_type\":900001,\"item_num\":9223372036854775807,\"chance\":3000000}]",
                "[{\"item_type\":900002,\"item_num\":1,\"chance\":7}]");
        var row = json.readTree(result.configJson()).get(0);
        var item = json.readTree(row.get("item").asString()).get(0);
        assertEquals(3_000_000, item.get("chance").asInt());
        assertEquals(Long.MAX_VALUE, item.get("item_num").asLong());
        assertEquals(7, json.readTree(row.get("cost").asString()).get(0).get("chance").asInt());
    }

    /** 非法JSON、非数组/对象、拼接JSON、重复对象键和未知字段必须拒绝，不静默丢内容。 */
    @Test
    void malformedOrAmbiguousJsonAndUnknownFieldsAreRejected() {
        for (String invalid : List.of("invalid", "null", "{}", "[null]", "[1]", "[[]]",
                "[{\"item_type\":900001,\"item_num\":1}] []",
                "[{\"item_type\":900001,\"item_type\":900002,\"item_num\":1}]",
                "[{\"item_type\":900001,\"item_num\":1,\"unexpected\":2}]")) {
            assertThrows(IllegalArgumentException.class, () -> encoded(invalid, "[]"), invalid);
        }
    }

    /** item_type为正整数、item_num显式非负，chance若出现为非负int，不把缺字段补为0。 */
    @Test
    void missingNullFractionalAndOutOfRangeThingValuesAreRejected() {
        var invalidRows = List.of("{}", "{\"item_type\":900001}", "{\"item_num\":1}",
                "{\"item_type\":null,\"item_num\":1}", "{\"item_type\":900001,\"item_num\":null}",
                "{\"item_type\":900001.0,\"item_num\":1}", "{\"item_type\":900001,\"item_num\":1.0}",
                "{\"item_type\":\"900001\",\"item_num\":1}", "{\"item_type\":true,\"item_num\":1}",
                "{\"item_type\":0,\"item_num\":1}", "{\"item_type\":2147483648,\"item_num\":1}",
                "{\"item_type\":900001,\"item_num\":-1}",
                "{\"item_type\":900001,\"item_num\":9223372036854775808}",
                "{\"item_type\":900001,\"item_num\":1,\"chance\":null}",
                "{\"item_type\":900001,\"item_num\":1,\"chance\":-1}",
                "{\"item_type\":900001,\"item_num\":1,\"chance\":1.0}",
                "{\"item_type\":900001,\"item_num\":1,\"chance\":2147483648}");
        for (var row : invalidRows) {
            String invalid = "[" + row + "]";
            assertThrows(IllegalArgumentException.class, () -> encoded(invalid, "[]"), row);
            assertThrows(IllegalArgumentException.class, () -> encoded(
                    "[{\"item_type\":900001,\"item_num\":1}]", invalid), row);
        }
    }

    /** item至少一项，cost空列表明确免费；显式零条目保留，空白或null不能当成免费。 */
    @Test
    void nonemptyItemsAndExplicitFreeCostsAreDistinctFromMissingContent() {
        var result = encoded("[{\"item_type\":900001,\"item_num\":1}]", "  []  ");
        assertEquals("[]", json.readTree(result.configJson()).get(0).get("cost").asString());
        var zero = encoded("[{\"item_type\":900001,\"item_num\":0}]",
                "[{\"item_type\":901702,\"item_num\":0}]");
        assertEquals(0, json.readTree(json.readTree(zero.configJson()).get(0).get("item").asString())
                .get(0).get("item_num").asLong());
        assertEquals(1, json.readTree(json.readTree(zero.configJson()).get(0).get("cost").asString()).size());
        assertThrows(IllegalArgumentException.class, () -> encoded("[]", "[]"));
        assertThrows(IllegalArgumentException.class, () -> exchange(1, " ", "[]"));
        assertThrows(IllegalArgumentException.class, () -> exchange(1, null, "[]"));
        assertThrows(IllegalArgumentException.class, () -> exchange(1,
                "[{\"item_type\":900001,\"item_num\":1}]", " "));
        assertThrows(IllegalArgumentException.class, () -> exchange(1,
                "[{\"item_type\":900001,\"item_num\":1}]", null));
    }

    /** 发布形状和旧六字段值域必须有效，重复idx或空配置列表不能形成待发布候选。 */
    @Test
    void invalidPublicationShapeAndDuplicateExchangeIdsAreRejected() {
        var item = "[{\"item_type\":900001,\"item_num\":1}]";
        var exchange = exchange(1, item, "[]");
        assertThrows(IllegalArgumentException.class, () -> exchange(0, item, "[]"));
        for (int[] fields : List.of(new int[]{-1, 0, 0}, new int[]{0, -1, 0}, new int[]{0, 0, -1})) {
            assertThrows(IllegalArgumentException.class, () -> new IdleActivityPublicationUtils.Exchange(
                    1, item, "[]", fields[0], fields[1], fields[2]));
        }
        assertThrows(IllegalArgumentException.class, () -> publication(0, List.of(exchange)));
        assertThrows(IllegalArgumentException.class, () -> publication(1, List.of()));
        assertThrows(IllegalArgumentException.class, () -> publication(1, null));
        assertThrows(IllegalArgumentException.class, () -> publication(1, List.of(exchange, exchange)));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityPublicationUtils.Publication(
                1, -1, 200, 300, 0, List.of(exchange)));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityPublicationUtils.Publication(
                1, 100, 99, 300, 0, List.of(exchange)));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityPublicationUtils.Publication(
                1, 100, 200, 199, 0, List.of(exchange)));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityPublicationUtils.Publication(
                1, 100, 200, 300, -1, List.of(exchange)));
    }

    /** 发布列表冻结但不按idx重排，交换原配置条目顺序也会改变内容指纹。 */
    @Test
    void exchangeOrderAndPublicationListStayImmutable() {
        var first = exchange(9, "[{\"item_type\":900001,\"item_num\":1}]", "[]");
        var second = exchange(2, "[{\"item_type\":900002,\"item_num\":1}]", "[]");
        var source = new ArrayList<>(List.of(first, second));
        var publication = publication(1, source);
        var result = IdleActivityPublicationUtils.encode(json, publication);
        source.clear();
        assertEquals(List.of(first, second), publication.exchanges());
        assertThrows(UnsupportedOperationException.class, publication.exchanges()::clear);
        assertEquals(9, json.readTree(result.configJson()).get(0).get("idx").asInt());
        assertNotEquals(result.fingerprint(), IdleActivityPublicationUtils.encode(json,
                publication(1, List.of(second, first))).fingerprint());
    }

    /** 发布日数沿旧绝对秒差截断，含反向日期、99999筛选界及上海历史夏令时，不能换成ceil日数。 */
    @Test
    void publicationDayPreservesAbsoluteMidnightSecondsAndHistoricalDst() {
        var zone = ZoneId.of("Asia/Shanghai");
        var openingDay = LocalDate.of(2026, 11, 13);
        long opened = openingDay.atTime(18, 0).atZone(zone).toEpochSecond();
        long sameDay = openingDay.atTime(1, 0).atZone(zone).toEpochSecond();
        assertEquals(1, IdleActivityPublicationUtils.publicationOpenDay(sameDay, opened));
        long previousDay = openingDay.minusDays(1).atStartOfDay(zone).toEpochSecond();
        assertEquals(2, IdleActivityPublicationUtils.publicationOpenDay(previousDay, opened));
        assertEquals(99999, IdleActivityPublicationUtils.publicationOpenDay(
                openingDay.plusDays(99998).atStartOfDay(zone).toEpochSecond(), opened));
        assertEquals(100000, IdleActivityPublicationUtils.publicationOpenDay(
                openingDay.plusDays(99999).atStartOfDay(zone).toEpochSecond(), opened));
        long beforeDst = LocalDate.of(1991, 4, 14).atStartOfDay(zone).toEpochSecond();
        long afterDst = LocalDate.of(1991, 4, 15).atStartOfDay(zone).toEpochSecond();
        assertEquals(23 * 3600, afterDst - beforeDst);
        assertEquals(1, IdleActivityPublicationUtils.publicationOpenDay(afterDst, beforeDst));
        assertEquals(1, IdleActivityPublicationUtils.publicationOpenDay(beforeDst, afterDst));
        assertThrows(IllegalArgumentException.class, () -> IdleActivityPublicationUtils.publicationOpenDay(-1, 0));
        assertThrows(ArithmeticException.class, () -> IdleActivityPublicationUtils.publicationOpenDay(Long.MAX_VALUE, 0));
    }
}
