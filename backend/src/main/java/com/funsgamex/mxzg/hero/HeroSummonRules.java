/**
 * 读取普通、友情、高级和积分召唤的同源策划规则。
 * 权重只在服务端使用，先确定星级再按对应池抽英雄；高级计数跟随实际抽取结果。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.reward.RewardGrantService;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.ToIntFunction;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class HeroSummonRules {
    /** 召唤动作按客户端协议池和次数找到原 lotterypoint 编号。 */
    public enum Pool {
        NORMAL(1), FRIENDSHIP(3), ADVANCED(5), POINTS(7);

        /** 原池单抽配置编号。 */
        private final int single;

        /** 关联原配置，双次数入口以相邻编号读取。 */
        Pool(int single) {
            this.single = single;
        }

    }

    /** 一种召唤动作的消耗物品、获得积分和免费冷却秒数。 */
    public record Offer(RewardGrantService.Reward cost, List<RewardGrantService.Reward> points, int freeSeconds) {}

    /** 高级召唤持久规则输入，一次请求无论单抽或十连共用相同计数。 */
    public record Advanced(long freeAt, long singles, long tens, long total, int withoutFive,
                           int sinceFour, int sinceFive) {
        /** 新角色还未使用高级免费和保底。 */
        public static Advanced initial() {
            return new Advanced(0, 0, 0, 0, 0, 0, 0);
        }

        /** 更新免费单抽时间，同时完整保留其他高级历史计数。 */
        public Advanced withFreeAt(long value) {
            return new Advanced(value, singles, tens, total, withoutFive, sinceFour, sinceFive);
        }
    }

    /** 高级抽取顺序及对应的新保底计数。 */
    public record AdvancedDraw(List<Integer> heroes, Advanced progress) {}
    /** 受策划权重约束的候选英雄。 */
    private record Hero(int id, int weight) {}
    /** 某一星级的权重、保底限制和星内候选。 */
    private record StarPool(int star, int weight, List<Hero> heroes, int lower, int upper) {}
    /** 从原策划表生成的服务端抽选材料。 */
    private record Projection(Map<String, List<StarPool>> pools, Map<Integer, List<Hero>> groups,
                              int advancedSingleDiamonds) {}

    /** 原 lotterypoint 的 idx 到免费时长、消耗和积分。 */
    private final Map<Integer, Offer> offers = new HashMap<>();
    /** 各类召唤和保底奖组，两级权重均来自原表。 */
    private final Projection projection;
    /** 首次普通单抽的配置英雄。 */
    private final int firstNormal;
    /** 首、次高级单抽配置；首抽配置为零时按旧规则抽三星。 */
    private final int firstAdvanced;
    /** 第二次高级单抽的配置英雄。 */
    private final int secondAdvanced;
    /** 高级十连缺一张券时替代的实际钻石数。 */
    private final int advancedTenPerTicket;
    /** 原积分兑换的累计实付条件，日服按真实充值单位校验。 */
    private final long pointRechargeRequired;
    /** 原神职积分减免的开启等级。 */
    private final int pointDiscountLevel;
    /** 原神职积分减免后的应付基点。 */
    private final int pointDiscountBasis;
    /** 高级全局 T1 保底的累计触发次数。 */
    private final int t1Every;
    /** 未中五星的保底次数。 */
    private final int fiveEvery;
    /** T1 保底组编号。 */
    private final int t1Group;
    /** 连续未中五星时的奖组编号。 */
    private final int fiveGroup;
    /** 第一次高级十连的固定入选奖组编号。 */
    private final int firstTenGroup;
    /** 祈愿道具的单次消耗量，也是无有效特权时的积累上限。 */
    private final int prayerCost;

    /** 初始化所有召唤配置，并预检奖组中每个英雄均能真实入册。 */
    public HeroSummonRules(ObjectMapper mapper, RewardGrantService grants) {
        for (JsonNode row : rows(mapper, "lotterypoint")) {
            int idx = positive(row, "idx");
            if (idx > 7) {
                continue;
            }
            var costs = items(mapper.readTree(row.path("need_item").asString()));
            var points = items(mapper.readTree(row.path("point").asString()));
            if (costs.size() != 1 || offers.put(idx, new Offer(costs.getFirst(), points,
                    nonnegative(row, "free_time"))) != null) {
                throw new IllegalStateException("召唤消耗配置重复或无效：" + idx);
            }
        }
        if (offers.size() != 7) {
            throw new IllegalStateException("召唤动作缺少原策划配置");
        }
        var system = new HashMap<String, JsonNode>();
        rows(mapper, "system").forEach(row -> system.put(row.path("key").asString(), row.path("value")));
        firstNormal = configured(system, "first_ordinary_lottery", false);
        firstAdvanced = configured(system, "first_senior_lottery", true);
        secondAdvanced = configured(system, "second_senior_lottery", false);
        t1Every = configured(system, "adv_summon_t1_guarantee_times", false);
        fiveEvery = configured(system, "adv_summon_guarantee_times", false);
        t1Group = configured(system, "adv_summon_t1_guarantee_reward_group", false);
        fiveGroup = configured(system, "adv_summon_guarantee_reward_group", false);
        firstTenGroup = configured(system, "first_adv_summon_guarantee_reward_group", false);
        prayerCost = configured(system, "adv_summon_wish_time", false);
        // 新版共用 system 保留通用表 1500；日服实际服务器策划及覆盖 Lua 均为 200000。
        pointRechargeRequired = 200_000;
        var pay = items(mapper.readTree(system.get("adv_summon_10_fixed_prize").asString()));
        if (pay.size() != 1 || pay.getFirst().itemId() != 900002) {
            throw new IllegalStateException("高级十连钻石抵扣配置无效");
        }
        advancedTenPerTicket = Math.toIntExact(pay.getFirst().quantity());

        int discountLevel = -1;
        int discountBasis = -1;
        for (JsonNode row : rows(mapper, "clergyprivilege")) {
            var privilege = mapper.readTree(row.path("unlock_privilege").asString("{}"));
            if (privilege != null && privilege.path("type").asString().equals("POINT_SUMMON")) {
                if (discountLevel >= 0) {
                    throw new IllegalStateException("积分召唤神职减免重复");
                }
                discountLevel = nonnegative(row, "clergy_level");
                discountBasis = positive(privilege, "value");
            }
        }
        if (discountLevel < 0 || discountBasis > 10_000) {
            throw new IllegalStateException("积分召唤神职减免无效");
        }
        pointDiscountLevel = discountLevel;
        pointDiscountBasis = discountBasis;

        try (var input = HeroSummonRules.class.getResourceAsStream("/gameplay/hero-summon-pools.json")) {
            if (input == null) {
                throw new IllegalStateException("召唤权重文件缺失");
            }
            projection = mapper.readValue(input, Projection.class);
        } catch (IOException error) {
            throw new IllegalStateException("无法读取召唤权重", error);
        }
        var check = new ArrayList<>(List.of(firstNormal, secondAdvanced, 900303));
        if (firstAdvanced > 0) {
            check.add(firstAdvanced);
        }
        projection.pools().values().forEach(stars ->
            stars.forEach(star -> star.heroes().forEach(hero -> check.add(hero.id()))));
        projection.groups().values().forEach(group -> group.forEach(hero -> check.add(hero.id())));
        offers.values().forEach(offer -> offer.points().forEach(point -> check.add(point.itemId())));
        grants.requireSupported(check);
    }

    /** 返回已验证池与次数对应的消耗规则。 */
    public Offer offer(Pool pool, int count) {
        return offers.get(pool.single + (count == 10 ? 1 : 0));
    }

    /** 返回高级单抽或十连每张缺券折算的钻石数。 */
    public long diamondPerTicket(int count) {
        return count == 1 ? projection.advancedSingleDiamonds() : advancedTenPerTicket;
    }

    /** 返回本服积分兑换需要的实际累计充值。 */
    public long pointRechargeRequired() {
        return pointRechargeRequired;
    }

    /** 依据已解锁神职等级计算真实应扣积分。 */
    public int pointsCost(int clergyLevel) {
        long base = offer(Pool.POINTS, 1).cost().quantity();
        return Math.toIntExact(clergyLevel < pointDiscountLevel ? base : base * pointDiscountBasis / 10_000);
    }

    /** 返回每次祈愿消耗的道具量。 */
    public int prayerCost() {
        return prayerCost;
    }

    /** 普通/友情/积分按各自原表独立抽取；普通固定首抽只属于单次入口。 */
    public int hero(Pool pool, boolean first, RandomGenerator random) {
        if (pool == Pool.NORMAL && first) {
            return firstNormal;
        }
        var star = draw(stars(pool), StarPool::weight, random);
        return draw(star.heroes(), Hero::weight, random).id();
    }

    /** 原接口仍供普通单抽及现有回归使用。 */
    public List<RewardGrantService.Reward> rewards(boolean first, RandomGenerator random) {
        return List.of(new RewardGrantService.Reward(hero(Pool.NORMAL, first, random), 1),
                offer(Pool.NORMAL, 1).points().getFirst());
    }

    /** 高级单抽独有冷却，普通首抽继续使用自己的配置。 */
    public long nextFreeAt(long nowSeconds) {
        return Math.addExact(nowSeconds, offer(Pool.NORMAL, 1).freeSeconds());
    }

    /** 返回普通单抽券，供旧单抽入口及测试共享同一份配置。 */
    public RewardGrantService.Reward ticket() {
        return offer(Pool.NORMAL, 1).cost();
    }

    /** 按旧服高级首两次单抽、首次十连、四星兜底及持久保底依次抽取。 */
    public AdvancedDraw advanced(Advanced progress, int count, RandomGenerator random) {
        var heroes = new ArrayList<Integer>(count);
        long singles = progress.singles();
        long tens = progress.tens();
        long total = progress.total();
        var misses = new int[]{progress.withoutFive(), progress.sinceFour(), progress.sinceFive()};
        if (count == 1 && singles < 2) {
            int id = singles == 0 ? firstAdvanced : secondAdvanced;
            heroes.add(id > 0 ? id : heroAtStar(Pool.ADVANCED, 3, random));
            return new AdvancedDraw(List.copyOf(heroes), new Advanced(
                    progress.freeAt(), singles + 1, tens, total + 1, misses[0], misses[1], misses[2]));
        }
        if (count == 10 && tens++ == 0) {
            heroes.add(groupHero(firstTenGroup, random));
        }
        var stars = stars(Pool.ADVANCED);
        boolean hasFour = false;
        while (heroes.size() < count) {
            if (++total % t1Every == 0) {
                heroes.add(groupHero(t1Group, random));
                continue;
            }
            int star = advancedStar(stars, misses[1], misses[2], random);
            misses[0] = star >= 5 ? 0 : misses[0] + 1;
            misses[1] = star == 4 ? 0 : misses[1] + 1;
            misses[2] = star == 5 ? 0 : misses[2] + 1;
            if (misses[0] >= fiveEvery) {
                heroes.add(groupHero(fiveGroup, random));
                misses[0] = 0;
                misses[2] = 0;
                hasFour = true;
                continue;
            }
            hasFour |= star >= 4;
            if (count == 10 && heroes.size() == count - 1 && !hasFour) {
                star = 4;
                misses[1] = 0;
            }
            heroes.add(heroAtStar(Pool.ADVANCED, star, random));
        }
        return new AdvancedDraw(List.copyOf(heroes), new Advanced(
                progress.freeAt(), singles, tens, total, misses[0], misses[1], misses[2]));
    }

    /** 原规则先按表顺序处理达到上限的必出星级，再过滤未过下限的星级。 */
    private int advancedStar(List<StarPool> stars, int sinceFour, int sinceFive, RandomGenerator random) {
        for (var star : stars) {
            int misses = star.star() == 4 ? sinceFour : sinceFive;
            if (star.upper() > 0 && misses >= star.upper()) {
                return star.star();
            }
        }
        var candidates = stars.stream().filter(star -> star.lower() <= 0
                || (star.star() == 4 ? sinceFour : sinceFive) >= star.lower()).toList();
        return draw(candidates, StarPool::weight, random).star();
    }

    /** 取指定池全部星级及对应权重。 */
    private List<StarPool> stars(Pool pool) {
        return projection.pools().get(pool.name());
    }

    /** 按指定星级内的原权重抽取真实英雄。 */
    private int heroAtStar(Pool pool, int star, RandomGenerator random) {
        var choices = stars(pool).stream().filter(entry -> entry.star() == star).findFirst().orElseThrow().heroes();
        return draw(choices, Hero::weight, random).id();
    }

    /** 从原保底奖组的有效权重段抽取唯一英雄。 */
    private int groupHero(int group, RandomGenerator random) {
        return draw(projection.groups().get(group), Hero::weight, random).id();
    }

    /** 同一累计区间抽样用于星级、英雄、保底三类原权重。 */
    private static <T> T draw(List<T> candidates, ToIntFunction<T> weight, RandomGenerator random) {
        long pick = random.nextLong(candidates.stream().mapToLong(weight::applyAsInt).sum());
        for (T candidate : candidates) {
            pick -= weight.applyAsInt(candidate);
            if (pick < 0) {
                return candidate;
            }
        }
        throw new IllegalStateException("英雄召唤权重区间不完整");
    }

    /** 保留原奖励项目的次序，策划数量须是正整数。 */
    private static List<RewardGrantService.Reward> items(JsonNode values) {
        if (values == null || !values.isArray()) {
            throw new IllegalStateException("召唤物品配置无效");
        }
        var items = new ArrayList<RewardGrantService.Reward>();
        values.forEach(item -> items.add(new RewardGrantService.Reward(
                positive(item, "item_type"), positive(item, "item_num"))));
        return List.copyOf(items);
    }

    /** 读取 Maven 打包的同源策划表。 */
    private static JsonNode rows(ObjectMapper mapper, String table) {
        try (var input = HeroSummonRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input == null) {
                throw new IllegalStateException("召唤配置表缺失：" + table);
            }
            return mapper.readTree(input).path("rows");
        } catch (IOException error) {
            throw new IllegalStateException("召唤配置读取失败：" + table, error);
        }
    }

    /** 只接受明确配置且在指定范围内的整数。 */
    private static int configured(Map<String, JsonNode> values, String key, boolean zeroAllowed) {
        var value = values.get(key);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt()
                || value.asInt() < (zeroAllowed ? 0 : 1)) {
            throw new IllegalStateException("召唤系统配置数值无效：" + key);
        }
        return value.asInt();
    }

    /** 读取原配置中严格正值。 */
    private static int positive(JsonNode row, String key) {
        int value = nonnegative(row, key);
        if (value <= 0) {
            throw new IllegalStateException("召唤配置必须为正：" + key);
        }
        return value;
    }

    /** 读取非负整数列，拒绝缺值和溢出。 */
    private static int nonnegative(JsonNode row, String key) {
        var value = row.path(key);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() < 0) {
            throw new IllegalStateException("召唤配置数值无效：" + key);
        }
        return value.asInt();
    }
}
