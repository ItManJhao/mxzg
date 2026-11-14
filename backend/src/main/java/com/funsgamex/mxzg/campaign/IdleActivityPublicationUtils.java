/**
 * 活动044可信发布内容的无状态校验与规范化：保留旧兑换配置六字段和ImmutableThing三字段。
 * 由控制发布写服务在事务前准备配置文本与内容指纹，不读取物品表、玩家、时钟或资产。
 * 保存配置不代表兑换/回收入口开放；chance仅保留旧字段，不在本工具抽样或解释为本次发奖概率。
 */
package com.funsgamex.mxzg.campaign;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;

public final class IdleActivityPublicationUtils {
    /** 旧ImmutableThing只包含这三项，拒绝额外字段，避免规范化时静默丢失有含义的输入。 */
    private static final Set<String> THING_FIELDS = Set.of("item_type", "item_num", "chance");
    /** 负责人确认的区服自然日时区；旧发布筛选按两时刻各自的上海零点秒数相减。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 旧apartDay固定按86400秒整除，不以LocalDate天数替换历史夏令时差。 */
    private static final long DAY_SECONDS = 86_400;

    /** 阻止实例化，发布内容与解析依赖都由调用方显式提供。 */
    private IdleActivityPublicationUtils() {}

    /** 旧044单项兑换配置，item/cost仍保存JSON文本，不在这里解读购买或兑换资格。
     * @param idx 正整数配置键，同次发布不能重复
     * @param item 非空JSON文本，encode时验证为非空ImmutableThing列表
     * @param cost 非空JSON文本，encode时允许空列表表示原配置的免费成本
     * @param limit 原兑换次数限制，非负，0不在本工具重解释
     * @param markIcon 原标记图配置，非负，不查询美术是否存在
     * @param showMark 原显示标记值，非负，不擅自缩成布尔值
     */
    public record Exchange(int idx, String item, String cost, int limit, int markIcon, int showMark) {
        /** 拒绝配置键、原始文本及数值结构非法；完整JSON解析留给显式encode入口。 */
        public Exchange {
            if (idx <= 0 || item == null || item.isBlank() || cost == null || cost.isBlank()
                    || limit < 0 || markIcon < 0 || showMark < 0) {
                throw new IllegalArgumentException("活动044兑换配置字段非法");
            }
        }
    }

    /** 一次可信发布的完整输入，不从当前时间或已有玩家数据补默认值。
     * @param version 正的可信发布版本；不参与内容指纹
     * @param startSeconds 记录期起始Unix秒，非负
     * @param endSeconds 记录期结束Unix秒，不能早于开始
     * @param clearSeconds 清理期结束Unix秒，不能早于记录期结束
     * @param limitDays 最低开服天数，非负
     * @param exchanges 非空旧兑换配置列表，保持原次序，不能有重复idx
     */
    public record Publication(long version, long startSeconds, long endSeconds, long clearSeconds,
                              int limitDays, List<Exchange> exchanges) {
        /** 检查完整发布形状并冻结列表，不创建控制状态或执行任何兑换。 */
        public Publication {
            if (version <= 0 || startSeconds < 0 || endSeconds < startSeconds || clearSeconds < endSeconds
                    || limitDays < 0 || exchanges == null || exchanges.isEmpty()) {
                throw new IllegalArgumentException("活动044发布期限、版本或兑换配置非法");
            }
            var ids = new HashSet<Integer>();
            for (var exchange : exchanges) {
                if (exchange == null || !ids.add(exchange.idx())) {
                    throw new IllegalArgumentException("活动044兑换配置缺失或idx重复");
                }
            }
            exchanges = List.copyOf(exchanges);
        }
    }

    /** 纯编码结果，不代表已经发布或提交。
     * @param configJson 旧六字段数组的规范JSON，item/cost仍为规范后的JSON文本
     * @param fingerprint 期限、最低日数和规范配置的SHA-256，不含发布版本
     */
    public record Encoded(String configJson, String fingerprint) {}

    /**
     * 沿旧发布默认筛选计算绝对开服日：两时刻分别取上海零点，实际秒差除86400后向0截断、取绝对值加1。
     * 与挂机serverOpenDays的ceil算法不同，发布起点早于开服仍按旧绝对差计算，不在本方法判断99999上限。
     * @param startSeconds 本次可信发布起始Unix秒，必须非负且可转换为旧Date毫秒
     * @param openedAtSeconds 区服真实开服Unix秒，必须非负且可转换为旧Date毫秒
     * @throws IllegalArgumentException 任一时刻为负
     * @throws ArithmeticException Date毫秒转换、差值或最终日数溢出
     */
    public static long publicationOpenDay(long startSeconds, long openedAtSeconds) {
        if (startSeconds < 0 || openedAtSeconds < 0) {
            throw new IllegalArgumentException("活动044发布和开服时刻不能为负");
        }
        // 旧Date以long毫秒保存，不能只通过Instant允许的更大Unix秒范围放宽输入。
        Math.multiplyExact(startSeconds, 1000L);
        Math.multiplyExact(openedAtSeconds, 1000L);
        long startDay = Instant.ofEpochSecond(startSeconds).atZone(SERVER_ZONE).toLocalDate()
                .atStartOfDay(SERVER_ZONE).toEpochSecond();
        long openedDay = Instant.ofEpochSecond(openedAtSeconds).atZone(SERVER_ZONE).toLocalDate()
                .atStartOfDay(SERVER_ZONE).toEpochSecond();
        long difference = Math.subtractExact(startDay, openedDay);
        return Math.addExact(Math.absExact(difference / DAY_SECONDS), 1L);
    }

    /**
     * 校验原ImmutableThing内容，生成稳定旧配置文本与独立内容指纹；保留所有数组次序及重复奖励。
     * @param mapper 调用方现有JSON编解码器，本方法不修改它的全局配置
     * @param publication 已有完整结构但尚未解析item/cost的可信发布输入
     * @throws IllegalArgumentException JSON非法、字段缺失或数值越界，不返回部分配置
     */
    public static Encoded encode(ObjectMapper mapper, Publication publication) {
        Objects.requireNonNull(mapper, "活动044JSON解析器缺失");
        Objects.requireNonNull(publication, "活动044发布输入缺失");
        var exchanges = new ArrayList<Map<String, Object>>();
        for (var exchange : publication.exchanges()) {
            var normalized = new TreeMap<String, Object>();
            String location = "exchange[" + exchange.idx() + "]";
            normalized.put("idx", exchange.idx());
            normalized.put("item", thingsJson(mapper, exchange.item(), false, location + ".item"));
            normalized.put("cost", thingsJson(mapper, exchange.cost(), true, location + ".cost"));
            normalized.put("limit", exchange.limit());
            normalized.put("mark_icon", exchange.markIcon());
            normalized.put("show_mark", exchange.showMark());
            exchanges.add(normalized);
        }
        var contents = new TreeMap<String, Object>();
        contents.put("start_seconds", publication.startSeconds());
        contents.put("end_seconds", publication.endSeconds());
        contents.put("clear_seconds", publication.clearSeconds());
        contents.put("limit_days", publication.limitDays());
        contents.put("exchanges", exchanges);
        byte[] canonical = compactJson(mapper, contents).getBytes(StandardCharsets.UTF_8);
        try {
            String fingerprint = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical));
            return new Encoded(compactJson(mapper, exchanges), fingerprint);
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少活动044内容摘要算法", error);
        }
    }

    /** 解析恰好一个完整列表，保留重复物品和chance；缺省chance规范为0，与显式0等义。 */
    private static String thingsJson(ObjectMapper mapper, String text, boolean allowEmpty, String location) {
        JsonNode values;
        try {
            values = mapper.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .with(DeserializationFeature.FAIL_ON_READING_DUP_TREE_KEY).readTree(text);
        } catch (RuntimeException error) {
            throw new IllegalArgumentException("活动044物品JSON非法：" + location, error);
        }
        if (values == null || !values.isArray() || (!allowEmpty && values.isEmpty())) {
            throw new IllegalArgumentException("活动044物品必须为" + (allowEmpty ? "" : "非空") + "列表：" + location);
        }
        var normalized = new ArrayList<Map<String, Object>>();
        for (var value : values) {
            if (!value.isObject()) {
                throw new IllegalArgumentException("活动044物品条目必须为对象：" + location);
            }
            for (var field : value.propertyNames()) {
                if (!THING_FIELDS.contains(field)) {
                    throw new IllegalArgumentException("活动044物品含未知字段：" + location + "." + field);
                }
            }
            int itemId = positiveInt(value.get("item_type"), location + ".item_type");
            var quantity = value.get("item_num");
            // 旧发布保存ImmutableThing原值，显式0与缺字段不同，不能擅自删除零条目或当作空配置。
            if (quantity == null || !quantity.isIntegralNumber() || !quantity.canConvertToLong() || quantity.asLong() < 0) {
                throw new IllegalArgumentException("活动044物品数量必须为非负long：" + location + ".item_num");
            }
            var chance = value.get("chance");
            if (chance != null && (!chance.isIntegralNumber() || !chance.canConvertToInt() || chance.asInt() < 0)) {
                throw new IllegalArgumentException("活动044物品chance必须为非负int：" + location + ".chance");
            }
            var thing = new TreeMap<String, Object>();
            thing.put("item_type", itemId);
            thing.put("item_num", quantity.asLong());
            thing.put("chance", chance == null ? 0 : chance.asInt());
            normalized.add(thing);
        }
        return compactJson(mapper, normalized);
    }

    /** 仅接纳JSON正整数且能安全表示为旧int；拒绝字符串、布尔、小数和越界数。 */
    private static int positiveInt(JsonNode value, String location) {
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() <= 0) {
            throw new IllegalArgumentException("活动044物品ID必须为正int：" + location);
        }
        return value.asInt();
    }

    /** 按TreeMap键顺序生成紧凑文本，不沿用调用方的缩进选项或修改共享mapper配置。 */
    private static String compactJson(ObjectMapper mapper, Object value) {
        return mapper.writer().without(SerializationFeature.INDENT_OUTPUT).writeValueAsString(value);
    }
}
