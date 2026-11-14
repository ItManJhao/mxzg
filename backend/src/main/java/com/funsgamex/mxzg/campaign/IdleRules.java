/**
 * 普通挂机纯规则：计算基础资源、分窗随机掉落与持久保底计数，不读取权益或发奖。
 * 基础资源与各随机窗口保留独立分项，供后续神职按旧合并边界取整；合并总量仍供既有领域调用。
 * 调用方负责服务器随机源及事务，当前新主线只读挂机尚未调用本规则领取。
 */
package com.funsgamex.mxzg.campaign;

import java.util.*;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class IdleRules {
    public record Stage(int id, int group, List<CampaignRules.Reward> base) {}
    public record Trigger(int group, int type, int table, int chance, int guarantee, int maximum) {}
    public record Drop(int table, int itemId, int weight, int minimum, int maximum) {}
    public record Data(String version, int frequency, int initialSeconds, int maxSeconds, int resetSeconds,
        List<Stage> stages, List<Trigger> triggers, List<Drop> drops) {}
    public record Counter(long quantity, int misses) {}
    /** 一次计算的冻结结果，不是领取回执或资产快照。
     * @param rewards 基础与随机掉落合并后的总量，按物品ID升序
     * @param dropSeconds 重置窗口内累计秒数
     * @param counters 类别ID到原始随机掉落数量/未中次数，不含加成
     * @param baseRewards 仅本次基础资源，保持配置顺序及零项，不与随机奖励合并
     * @param dropRewards 每个随机窗口内先合并同物品，跨窗口保留分项；神职计算前不得再次合并
     */
    public record Roll(List<CampaignRules.Reward> rewards, int dropSeconds, Map<Integer, Counter> counters,
                       List<CampaignRules.Reward> baseRewards, List<CampaignRules.Reward> dropRewards) {
        /** 冻结奖励分项与计数，后续调用者不能通过可变集合改写本次结果。 */
        public Roll {
            rewards = List.copyOf(rewards);
            counters = Map.copyOf(counters);
            baseRewards = List.copyOf(baseRewards);
            dropRewards = List.copyOf(dropRewards);
        }
    }
    /** 启动加载的规则投影；不保存角色计数或领取状态。 */
    private final Data data;

    /** 启动读取策划投影；缺失或非法时间参数使服务启动失败，不使用默认免费收益。 */
    public IdleRules(ObjectMapper json) {
        try (var stream = IdleRules.class.getResourceAsStream("/gameplay/idle-rules.json")) {
            if (stream == null) throw new IllegalStateException("Idle rules missing");
            data = json.readValue(stream, Data.class);
        } catch (java.io.IOException error) { throw new IllegalStateException(error); }
        if (data.frequency() <= 0 || data.maxSeconds() < data.frequency() || data.resetSeconds() <= 0)
            throw new IllegalStateException("Invalid idle timing");
    }
    /** 返回只读版本及时间参数。 */
    public Data data() { return data; }
    /** 按已通关关卡查询，未通关由调用者传 1；缺配置明确失败。 */
    public Stage stage(int id) { return data.stages().stream().filter(s -> s.id() == id).findFirst().orElseThrow(); }

    /**
     * 只计算一次领取候选，不修改传入计数；调用方须同事务保存随机结果、计时和资产。
     * 基础次数向下取整，随机次数按每个重置窗口分别四舍五入；窗口内合并、窗口间保留分项。
     * @param seconds 本次已按基础挂机上限截取的秒数，含VIP时长的后续装配使用带上限重载
     * @param dropSeconds 上次计算后累计的窗口秒数，必须小于重置周期
     * @param previous 上次持久化的类别计数，不会原地修改
     * @param random 服务端随机源，不得在只读快照查询中调用本方法
     */
    public Roll roll(int stageId, int seconds, int dropSeconds, Map<Integer, Counter> previous, RandomGenerator random) {
        return roll(stageId, seconds, dropSeconds, previous, random, data.maxSeconds());
    }

    /**
     * 按同次权威VIP输入提供的时长上限计算，支持跨多个重置窗口；其余随机/分项规则不变。
     * @param maxSeconds 从服务端IdleRewardRules/VIP输入取得的最大秒数，不接纳客户端自报上限
     * @throws IllegalArgumentException 上限小于基础上限，或时长/累计窗口非法时不抽样
     */
    public Roll roll(int stageId, int seconds, int dropSeconds, Map<Integer, Counter> previous,
                     RandomGenerator random, int maxSeconds) {
        if (maxSeconds < data.maxSeconds() || seconds < 0 || seconds > maxSeconds
                || dropSeconds < 0 || dropSeconds >= data.resetSeconds()) {
            throw new IllegalArgumentException("Invalid idle interval");
        }
        var stage = stage(stageId);
        var counters = new HashMap<>(previous);
        var rewards = new TreeMap<Integer, Long>();
        var baseRewards = new ArrayList<CampaignRules.Reward>();
        var dropRewards = new ArrayList<CampaignRules.Reward>();
        for (var reward : stage.base()) {
            long quantity = Math.multiplyExact(reward.quantity(), seconds / data.frequency());
            baseRewards.add(new CampaignRules.Reward(reward.itemId(), quantity));
            add(rewards, reward.itemId(), quantity);
        }
        int remaining = seconds;
        int accumulated = dropSeconds;
        while ((long) remaining + accumulated >= data.resetSeconds()) {
            int slice = data.resetSeconds() - accumulated;
            dropRewards.addAll(drops(stage.group(), Math.round((float) slice / data.frequency()), counters, rewards, random));
            remaining -= slice;
            accumulated = 0;
            counters.clear();
        }
        if (remaining > 0) {
            dropRewards.addAll(drops(stage.group(), Math.round((float) remaining / data.frequency()), counters, rewards, random));
        }
        return new Roll(toRewards(rewards), accumulated + remaining, counters, baseRewards, dropRewards);
    }

    /**
     * 计算一个窗口的随机掉落，更新本次计数副本及合并总量；达到上限后不再抽样。
     * 沿旧getRewardUnique在窗口内合并同物品，避免将每次单件抽取都当成神职ceil的独立项。
     * 普通0/满概率和保底不抽命中率；权重沿旧Hutool抽double，固定数量仍抽半开数量区间。
     * 总量仍在每次抽取时累计，保留溢出立即拒绝及其后的随机不再消费的边界。
     */
    private List<CampaignRules.Reward> drops(int group, int count, Map<Integer, Counter> counters,
                                           Map<Integer, Long> total, RandomGenerator random) {
        var rewards = new TreeMap<Integer, Long>();
        var triggers = data.triggers().stream().filter(t -> t.group() == group).toList();
        for (int i = 0; i < count; i++) {
            for (var trigger : triggers) {
                var old = counters.getOrDefault(trigger.type(), new Counter(0, 0));
                if (old.quantity() >= trigger.maximum()) {
                    continue;
                }
                if (old.misses() >= trigger.guarantee() - 1 || triggered(trigger.chance(), random)) {
                    var chosen = weightedDrop(trigger.table(), random);
                    int quantityBound = Math.addExact(chosen.maximum(), 1);
                    int quantity = random.nextInt(chosen.minimum(), quantityBound);
                    if (quantity < chosen.minimum() || quantity >= quantityBound) {
                        throw new IllegalArgumentException("挂机数量随机源返回值越界");
                    }
                    add(rewards, chosen.itemId(), quantity);
                    add(total, chosen.itemId(), quantity);
                    counters.put(trigger.type(), new Counter(Math.addExact(old.quantity(), quantity), 0));
                } else {
                    counters.put(trigger.type(), new Counter(old.quantity(), old.misses() + 1));
                }
            }
        }
        return toRewards(rewards);
    }

    /** 沿旧RandomUtil.lucky短路0和满概率；其余只抽一次百万半开整数并严格小于概率命中。 */
    private static boolean triggered(int chance, RandomGenerator random) {
        if (chance == 0) {
            return false;
        }
        if (chance == 1_000_000) {
            return true;
        }
        int point = random.nextInt(1_000_000);
        if (point < 0 || point >= 1_000_000) {
            throw new IllegalArgumentException("挂机命中率随机源返回值越界");
        }
        return point < chance;
    }

    /**
     * 沿旧Hutool WeightRandom.next按正权重累计区间抽取，单行配置也消费一次double。
     * 同源投影保留旧idx升序；零/负权重不进入权重表，首个累计权重大于抽样点的条目命中。
     * 总权重先精确相加，溢出或缺合法条目在消费权重随机前拒绝。
     */
    private Drop weightedDrop(int table, RandomGenerator random) {
        var options = data.drops().stream().filter(drop -> drop.table() == table && drop.weight() > 0).toList();
        int totalWeight = options.stream().mapToInt(Drop::weight).reduce(0, Math::addExact);
        if (totalWeight == 0) {
            throw new IllegalStateException("Missing idle drop");
        }
        double point = random.nextDouble();
        if (!Double.isFinite(point) || point < 0 || point >= 1) {
            throw new IllegalArgumentException("挂机权重随机源返回值越界");
        }
        double weightedPoint = totalWeight * point;
        int cumulative = 0;
        for (var option : options) {
            cumulative = Math.addExact(cumulative, option.weight());
            if (weightedPoint < cumulative) {
                return option;
            }
        }
        throw new IllegalStateException("Missing idle drop");
    }

    /** 将当前窗口或最终累计量按物品ID输出；不跨调用合并分项。 */
    private static List<CampaignRules.Reward> toRewards(Map<Integer, Long> rewards) {
        return rewards.entrySet().stream()
                .map(entry -> new CampaignRules.Reward(entry.getKey(), entry.getValue())).toList();
    }

    /** 合并同类资源，溢出时拒绝整个领取。 */
    private static void add(Map<Integer, Long> rewards, int id, long quantity) {
        if (quantity > 0) {
            rewards.merge(id, quantity, Math::addExact);
        }
    }
}
