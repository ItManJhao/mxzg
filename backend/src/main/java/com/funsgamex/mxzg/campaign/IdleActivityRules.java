/**
 * 挂机活动016、034、044的纯掉落规则：读取同源投影，按旧轮次选行并计算固定和随机次数。
 * 由权威输入层查询门槛/选行，IdleRewardUtils直接使用已冻结行计算；提供等级及开服日纯计算。
 * 不读取数据库、当前时钟或发奖，组合计算不必重新查找活动配置行。
 * 活动记录期、开服限制与持久状态有效性由外部权威输入统一判断。
 * 活动已确认适用却缺配置时明确失败；配置和计算结果冻结，不能以空奖励掩盖缺失输入。
 */
package com.funsgamex.mxzg.campaign;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;
import java.util.Set;
import java.util.function.IntUnaryOperator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public final class IdleActivityRules {
    /** 当前已核实的三个挂机活动ID，缺任一活动投影都不能启动完整规则。 */
    private static final Set<Integer> ACTIVITY_IDS = Set.of(16, 34, 44);
    /** 旧概率随机范围为[0,1000000)，命中比较仍使用小于等于。 */
    private static final int RANDOM_BOUND = 1_000_000;
    /** 旧实际随机周期为60秒，保留与源表5秒说明的差异，不由表头改写规则。 */
    private static final int RANDOM_FREQUENCY_SECONDS = 60;
    /** 当前已核实VIP13的最大挂机时长为18小时，本类不接受调用方任意放大。 */
    private static final int MAX_HANG_SECONDS = 64_800;
    /** 新版区服开服自然日统一采用负责人确认的上海时区，不依赖JVM部署默认时区。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 旧开服日按固定86400秒相除并向上取整，保留零点整秒属于前日的边界。 */
    private static final long DAY_SECONDS = 86_400;
    /** 活动ID到不可变门槛说明；实际角色资格由调用方使用权威输入判断。 */
    private final Map<Integer, Rule> rules;
    /** 活动ID到按旧idx升序冻结的掉落配置，不保存活动轮次或角色计数。 */
    private final Map<Integer, List<Drop>> drops;
    /** 实际读取投影原字节的SHA-256内容版本，不信任投影自报version。 */
    private final String version;

    /**
     * 活动规则说明，不代表活动正在记录。
     * @param activityId 已核实的活动ID
     * @param minimumRoleLevelExclusive 016/034的排他角色等级门槛；044明确为空
     */
    public record Rule(int activityId, OptionalInt minimumRoleLevelExclusive) {}

    /**
     * 单行掉落配置，保留奖励次序和同物品重复项。
     * @param id 旧表idx，016/034同轮次以最大idx生效，044以最小idx生效
     * @param turns 旧表轮次，044没有此字段而明确为null
     * @param rewards 单次奖励，不提前合并重复物品
     * @param frequencySeconds 固定掉落周期，单位秒且大于0
     * @param gainChance 旧百万概率值，0仍有随机值恰为0的命中机会
     */
    public record Drop(int id, Integer turns, List<CampaignRules.Reward> rewards,
                       int frequencySeconds, int gainChance) {
        /** 校验公开构造的全部字段并冻结奖励，防止组合入口接纳坏行或可变奖励列表。 */
        public Drop {
            if (id <= 0 || (turns != null && turns < 1) || frequencySeconds <= 0
                    || gainChance < 0 || gainChance > RANDOM_BOUND || rewards == null || rewards.isEmpty()) {
                throw new IllegalArgumentException("挂机活动冻结掉落行非法");
            }
            for (var reward : rewards) {
                if (reward == null || reward.itemId() <= 0 || reward.quantity() <= 0) {
                    throw new IllegalArgumentException("挂机活动冻结奖励分项非法");
                }
            }
            rewards = List.copyOf(rewards);
        }
    }

    /** 启动加载实际规则投影，缺资源或非法配置拒绝启动，不补造活动奖励。 */
    @Autowired
    public IdleActivityRules(ObjectMapper json) {
        this(json, readContent());
    }

    /** 包内隔离输入入口，与生产入口执行相同校验及原字节摘要，不读写资源文件。 */
    IdleActivityRules(ObjectMapper json, byte[] content) {
        var root = json.readTree(new ByteArrayInputStream(content));
        if (root == null || !root.isObject() || number(root, "schema") != 1
                || number(root, "randomFrequencySeconds") != RANDOM_FREQUENCY_SECONDS) {
            throw new IllegalStateException("挂机活动投影版本或随机周期非法");
        }
        var activities = root.path("activities");
        if (!activities.isArray()) {
            throw new IllegalStateException("挂机活动列表缺失");
        }
        var loadedRules = new HashMap<Integer, Rule>();
        var loadedDrops = new HashMap<Integer, List<Drop>>();
        for (var activity : activities) {
            int id = number(activity, "id");
            if (!ACTIVITY_IDS.contains(id) || loadedRules.containsKey(id)) {
                throw new IllegalStateException("挂机活动ID未知或重复：" + id);
            }
            var minimum = activity.path("minimumRoleLevelExclusive");
            OptionalInt minimumLevel;
            if (id == 44) {
                if (!minimum.isNull()) {
                    throw new IllegalStateException("挂机活动044不应带角色等级门槛");
                }
                minimumLevel = OptionalInt.empty();
            } else {
                minimumLevel = OptionalInt.of(number(activity, "minimumRoleLevelExclusive"));
            }
            loadedRules.put(id, new Rule(id, minimumLevel));
            loadedDrops.put(id, readDrops(activity, id));
        }
        if (!loadedRules.keySet().equals(ACTIVITY_IDS)) {
            throw new IllegalStateException("挂机活动投影缺少016、034或044");
        }
        rules = Map.copyOf(loadedRules);
        drops = Map.copyOf(loadedDrops);
        try {
            version = "idle-activities-v1:" + HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少挂机活动规则摘要算法", error);
        }
    }

    /** 返回已核实活动的等级门槛说明；未知活动拒绝，不解释为无门槛。 */
    public Rule rule(int activityId) {
        var rule = rules.get(activityId);
        if (rule == null) {
            throw new IllegalStateException("未知挂机活动：" + activityId);
        }
        return rule;
    }

    /**
     * 只检查已确认活动的角色等级门槛，不代表记录期或开服条件已满足。
     * 016/034按配置严格大于门槛，044无等级门槛；非法角色等级和未知活动仍拒绝。
     */
    public boolean roleEligible(int activityId, int roleLevel) {
        if (roleLevel < 1) {
            throw new IllegalArgumentException("挂机活动角色等级必须大于0");
        }
        var minimum = rule(activityId).minimumRoleLevelExclusive();
        return minimum.isEmpty() || roleLevel > minimum.getAsInt();
    }

    /**
     * 按上海开服当天零点计算旧开服日数，保留ceil的零点整秒边界，不改成日期差加1。
     * @param openedAtSeconds 已持久化的真实开服Unix秒，不得将缺失值替换为当前秒
     * @param nowSeconds 本次权威输入统一冻结的服务器Unix秒
     * @return ceil((now－开服日零点)/86400)，允许未来开服返回0或负日数
     * @throws IllegalArgumentException Unix秒为负或超出可表示日期范围时拒绝
     */
    public static long serverOpenDays(long openedAtSeconds, long nowSeconds) {
        if (openedAtSeconds < 0 || nowSeconds < 0) {
            throw new IllegalArgumentException("挂机活动开服时间或当前时间不能为负");
        }
        try {
            long midnight = Instant.ofEpochSecond(openedAtSeconds).atZone(SERVER_ZONE)
                    .toLocalDate().atStartOfDay(SERVER_ZONE).toEpochSecond();
            Instant.ofEpochSecond(nowSeconds).atZone(SERVER_ZONE);
            return Math.ceilDiv(Math.subtractExact(nowSeconds, midnight), DAY_SECONDS);
        } catch (DateTimeException | ArithmeticException error) {
            throw new IllegalArgumentException("挂机活动开服时间或当前时间超出有效范围", error);
        }
    }

    /**
     * 按旧缓存优先级选择实际行；016/034精确匹配轮次，044忽略轮次并使用最小idx。
     * 旧BaseExcelCache先按idx升序再put轮次Map，因此同轮次的较大idx覆盖较小idx。
     * @throws IllegalStateException 已适用活动缺少该轮次配置时拒绝，不回退前后轮或返回空
     */
    public Drop selectedDrop(int activityId, int turns) {
        rule(activityId);
        var rows = drops.get(activityId);
        if (activityId == 44) {
            return rows.getFirst();
        }
        if (turns < 1) {
            throw new IllegalArgumentException("挂机活动轮次必须大于0");
        }
        return rows.stream().filter(row -> row.turns() == turns)
                .max(Comparator.comparingInt(Drop::id))
                .orElseThrow(() -> new IllegalStateException(
                        "挂机活动缺少掉落轮次：" + activityId + "/" + turns));
    }

    /**
     * 按旧活动及轮次选行，再委托冻结掉落行入口完成计算；保留原调用的校验与选行语义。
     * @param turns 016/034的权威当前轮次，044忽略此参数
     * @param hangSeconds 本次已由权威时长截取的秒数，范围0至64800；非法值不消费随机源
     * @param random 服务端随机源，参数为排他上界1000000，结果必须处于[0,1000000)
     * @return 冻结奖励列表；确实没有任何掉落次数时为空，重复物品及原顺序保留
     * @throws ArithmeticException 奖励倍乘溢出时拒绝整个候选，不返回截断资产
     */
    public List<CampaignRules.Reward> drop(int activityId, int turns, int hangSeconds,
                                          IntUnaryOperator random) {
        if (hangSeconds < 0 || hangSeconds > MAX_HANG_SECONDS || random == null) {
            throw new IllegalArgumentException("挂机活动时长或随机源非法");
        }
        return drop(selectedDrop(activityId, turns), hangSeconds, random);
    }

    /**
     * 只使用已冻结行，将固定次数与每60秒一次的随机成功次数相加后倍乘每条奖励。
     * 不查询当前活动状态或配置，不改写行；概率为0仍抽样，并沿旧小于等于边界命中。
     * @param row 输入装配已冻结的适用掉落行，缺行不能解释为没有活动奖励
     * @param hangSeconds 已按同次权威上限截取的秒数，范围0至64800，非法值抽样前拒绝
     * @param random 服务端随机源，参数为排他上界1000000，结果必须处于[0,1000000)
     * @return 不可变奖励分项；次数为0时为空，重复物品及原始顺序保留
     * @throws IllegalArgumentException 缺行、非法时长或随机源返回值越界时拒绝
     * @throws ArithmeticException 倍乘溢出时拒绝整个候选，不返回部分奖励
     */
    public static List<CampaignRules.Reward> drop(Drop row, int hangSeconds, IntUnaryOperator random) {
        if (row == null || hangSeconds < 0 || hangSeconds > MAX_HANG_SECONDS || random == null) {
            throw new IllegalArgumentException("挂机活动冻结行、时长或随机源非法");
        }
        int count = hangSeconds / row.frequencySeconds();
        for (int i = 0; i < hangSeconds / RANDOM_FREQUENCY_SECONDS; i++) {
            int point = random.applyAsInt(RANDOM_BOUND);
            if (point < 0 || point >= RANDOM_BOUND) {
                throw new IllegalArgumentException("挂机活动随机源结果超出范围");
            }
            if (point <= row.gainChance()) {
                count = Math.addExact(count, 1);
            }
        }
        if (count == 0) {
            return List.of();
        }
        var result = new ArrayList<CampaignRules.Reward>();
        for (var reward : row.rewards()) {
            result.add(new CampaignRules.Reward(reward.itemId(),
                    Math.multiplyExact(reward.quantity(), count)));
        }
        return List.copyOf(result);
    }

    /** 返回实际投影原字节内容版本，供后续权威输入/回执冻结，不读取自报version。 */
    public String version() {
        return version;
    }

    /** 从唯一构建资源读取投影原字节，失败时阻止服务使用不完整规则。 */
    private static byte[] readContent() {
        try (var input = IdleActivityRules.class.getResourceAsStream("/gameplay/idle-activities.json")) {
            if (input == null) {
                throw new IllegalStateException("挂机活动规则投影缺失");
            }
            return input.readAllBytes();
        } catch (IOException error) {
            throw new IllegalStateException("读取挂机活动规则投影失败", error);
        }
    }

    /** 校验并冻结一个活动的原始配置行，重复idx拒绝，同轮次多行沿旧覆盖规则保留。 */
    private static List<Drop> readDrops(JsonNode activity, int activityId) {
        var rows = activity.path("drops");
        if (!rows.isArray() || rows.isEmpty()) {
            throw new IllegalStateException("挂机活动掉落配置缺失：" + activityId);
        }
        var loaded = new ArrayList<Drop>();
        var seen = new HashSet<Integer>();
        for (var row : rows) {
            int id = number(row, "id");
            int frequency = number(row, "frequencySeconds");
            int chance = number(row, "gainChance");
            if (id < 1 || !seen.add(id) || frequency < 1 || chance > RANDOM_BOUND) {
                throw new IllegalStateException("挂机活动掉落ID、周期或概率非法：" + activityId + "/" + id);
            }
            Integer turns = null;
            if (activityId == 44) {
                if (!row.path("turns").isNull()) {
                    throw new IllegalStateException("挂机活动044不应带掉落轮次");
                }
            } else {
                turns = number(row, "turns");
                if (turns < 1) {
                    throw new IllegalStateException("挂机活动掉落轮次必须大于0");
                }
            }
            var rewards = row.path("rewards");
            if (!rewards.isArray() || rewards.isEmpty()) {
                throw new IllegalStateException("挂机活动单次奖励缺失：" + activityId + "/" + id);
            }
            var rewardList = new ArrayList<CampaignRules.Reward>();
            for (var reward : rewards) {
                int itemId = number(reward, "itemId");
                var quantity = reward.path("quantity");
                if (itemId < 1 || !quantity.isIntegralNumber() || !quantity.canConvertToLong()
                        || quantity.asLong() < 1) {
                    throw new IllegalStateException("挂机活动奖励ID或数量非法：" + activityId + "/" + id);
                }
                rewardList.add(new CampaignRules.Reward(itemId, quantity.asLong()));
            }
            loaded.add(new Drop(id, turns, rewardList, frequency, chance));
        }
        loaded.sort(Comparator.comparingInt(Drop::id));
        return List.copyOf(loaded);
    }

    /** 读取必须显式存在的非负int字段，缺失、字符串、小数和超界不以0代替。 */
    private static int number(JsonNode row, String field) {
        var value = row.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() < 0) {
            throw new IllegalStateException("挂机活动规则字段非法：" + field);
        }
        return value.asInt();
    }
}
