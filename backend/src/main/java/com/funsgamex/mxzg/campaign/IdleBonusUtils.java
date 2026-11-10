/**
 * 已核实挂机加成的无状态计算：基础资源加成独立截断，神职按原始奖励分项向上取整。
 * 未来由服务端奖励装配层传入已确认适用的条目；当前没有生产调用，不判断VIP、活动或礼包权益。
 * 不读取数据库、不更新计时/保底、不发奖；随机源由调用方提供，结果供测试及后续事务冻结使用。
 */
package com.funsgamex.mxzg.campaign;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.TreeMap;
import java.util.function.IntUnaryOperator;

public final class IdleBonusUtils {
    /** 旧加成与神职概率使用万分比；活动概率不属于本工具。 */
    private static final int BASIS = 10_000;

    /** 防止将无状态公式工具实例化。 */
    private IdleBonusUtils() {}

    /** 已由调用方确认适用的基础资源加成；每条单独取整，不预先合并同物品系数。
     * @param key 来源与配置条目标识，用于结果追溯，不参与权益判断
     * @param itemId 基础资源配置ID，不是库存实例ID
     * @param basisPoints 非负万分比；VIP配置百分比须先通过vipBasisPoints转换
     */
    public record BaseBonus(String key, int itemId, int basisPoints) {}

    /** 已解锁的神职条目；多条分别抽样及追加，不只取最高等级。
     * @param key 神职配置条目标识，用于结果追溯
     * @param basisPoints 非负奖励万分比
     * @param chance 命中万分比，0至10000；每条只抽一次，命中后作用于全部原始分项
     */
    public record ClergyBonus(String key, int basisPoints, int chance) {}

    /** 单条加成对一个原始奖励项的贡献；保留重复物品及零值，供核对独立取整。
     * @param key 输入中的来源条目标识
     * @param reward 本条追加量，不含原奖励
     */
    public record Addition(String key, CampaignRules.Reward reward) {}

    /** 完成的纯计算结果；总量合并同物品且不保留零项，不是领取回执或资产快照。
     * @param baseAdditions VIP/世界等级/礼包等基础资源追加，按输入顺序保存
     * @param clergyAdditions 神职追加，按条目和原始奖励分项顺序保存
     * @param total 原奖励与全部追加的合并结果，按配置ID升序
     */
    public record Result(List<Addition> baseAdditions, List<Addition> clergyAdditions,
                         List<CampaignRules.Reward> total) {
        /** 冻结三份结果列表，调用者不能通过外部列表或返回值改写本次结果。 */
        public Result {
            baseAdditions = List.copyOf(baseAdditions);
            clergyAdditions = List.copyOf(clergyAdditions);
            total = List.copyOf(total);
        }
    }

    /** 沿旧GoddessVipSysCache将非负配置百分比转换为万分比，溢出拒绝。 */
    public static int vipBasisPoints(int percent) {
        if (percent < 0) {
            throw new IllegalArgumentException("VIP挂机加成不能为负");
        }
        return Math.multiplyExact(percent, 100);
    }

    /**
     * 计算已确认适用的全部加成；神职先抽样，其他加成只读取基础资源，不连乘。
     * @param base 原始基础奖励，同配置ID必须唯一；不会修改输入
     * @param other 原始随机及活动奖励分项，允许重复物品，禁止调用前跨来源提前合并
     * @param bonuses 已完成效果过滤的VIP/世界等级/礼包条目；空列表只表示调用方明确无适用条目
     * @param clergy 已解锁IDLE_AWARD条目；不在此处判断神职等级
     * @param randomIndex 返回[0,bound)内整数的服务端随机源；每条神职抽一次
     * @throws IllegalArgumentException 输入非法或随机源越界；依赖不可用不得用空列表冒充无加成
     * @throws ArithmeticException 金额计算或合并超出long范围，不返回部分结果
     */
    public static Result calculate(
            List<CampaignRules.Reward> base,
            List<CampaignRules.Reward> other,
            List<BaseBonus> bonuses,
            List<ClergyBonus> clergy,
            IntUnaryOperator randomIndex) {
        var baseItems = List.copyOf(base);
        var otherItems = List.copyOf(other);
        var baseRules = List.copyOf(bonuses);
        var clergyRules = List.copyOf(clergy);
        Objects.requireNonNull(randomIndex, "挂机加成随机源缺失");
        var byId = new HashMap<Integer, CampaignRules.Reward>();
        for (var reward : baseItems) {
            validateReward(reward);
            if (byId.putIfAbsent(reward.itemId(), reward) != null) {
                throw new IllegalArgumentException("挂机基础奖励配置ID重复");
            }
        }
        for (var reward : otherItems) {
            validateReward(reward);
        }
        for (var bonus : baseRules) {
            validateRule(bonus.key(), bonus.basisPoints());
            if (bonus.itemId() <= 0) {
                throw new IllegalArgumentException("挂机加成物品ID非法");
            }
        }
        for (var bonus : clergyRules) {
            validateRule(bonus.key(), bonus.basisPoints());
            if (bonus.chance() < 0 || bonus.chance() > BASIS) {
                throw new IllegalArgumentException("神职概率超出万分比范围");
            }
        }

        var original = new ArrayList<>(baseItems);
        original.addAll(otherItems);
        var clergyAdded = new ArrayList<Addition>();
        for (var bonus : clergyRules) {
            int point = randomIndex.applyAsInt(BASIS);
            if (point < 0 || point >= BASIS) {
                throw new IllegalArgumentException("神职随机源返回值越界");
            }
            // 旧代码rand(1,10001)<=chance，与零基抽样point<chance等价。
            if (point >= bonus.chance()) {
                continue;
            }
            for (var reward : original) {
                // 特意保留旧float乘法后ceil；不换成精确十进制或先合并分项。
                float factor = (float) bonus.basisPoints() / BASIS;
                long amount = checkedLong(Math.ceil(reward.quantity() * factor));
                clergyAdded.add(new Addition(bonus.key(), new CampaignRules.Reward(reward.itemId(), amount)));
            }
        }

        var baseAdded = new ArrayList<Addition>();
        for (var bonus : baseRules) {
            var reward = byId.get(bonus.itemId());
            if (reward == null) {
                continue;
            }
            // 沿旧ThingService的double表达式和long截断，各条只使用原基础资源。
            long amount = checkedLong(reward.quantity() * 1.0d * bonus.basisPoints() / BASIS);
            baseAdded.add(new Addition(bonus.key(), new CampaignRules.Reward(reward.itemId(), amount)));
        }
        var merged = new TreeMap<Integer, Long>();
        for (var reward : original) {
            merge(merged, reward);
        }
        for (var addition : baseAdded) {
            merge(merged, addition.reward());
        }
        for (var addition : clergyAdded) {
            merge(merged, addition.reward());
        }
        return new Result(baseAdded, clergyAdded, merged.entrySet().stream()
                .map(entry -> new CampaignRules.Reward(entry.getKey(), entry.getValue())).toList());
    }

    /** 拒绝无效ID和负奖励，避免用错误分项抵消其他收益。 */
    private static void validateReward(CampaignRules.Reward reward) {
        if (reward.itemId() <= 0 || reward.quantity() < 0) {
            throw new IllegalArgumentException("挂机奖励分项非法");
        }
    }

    /** 检查来源标识和非负万分比，不设未经旧配置确认的100%上限。 */
    private static void validateRule(String key, int basisPoints) {
        if (key == null || key.isBlank() || basisPoints < 0) {
            throw new IllegalArgumentException("挂机加成条目非法");
        }
    }

    /** 保留旧浮点取整口径，但禁止Java将溢出浮点数静默饱和为Long.MAX_VALUE。 */
    private static long checkedLong(double value) {
        if (!Double.isFinite(value) || value < 0 || value >= 0x1.0p63) {
            throw new ArithmeticException("挂机加成数量溢出");
        }
        return (long) value;
    }

    /** 最后统一合并正数奖励，溢出拒绝，不改变输入列表或资产。 */
    private static void merge(TreeMap<Integer, Long> merged, CampaignRules.Reward reward) {
        if (reward.quantity() > 0) {
            merged.merge(reward.itemId(), reward.quantity(), Math::addExact);
        }
    }
}
