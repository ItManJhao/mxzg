/** 普通挂机规则：基础资源向下取整，道具次数四舍五入；累计保底/上限跨领取保存，按旧服时间窗口重置。 */
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
    public record Roll(List<CampaignRules.Reward> rewards, int dropSeconds, Map<Integer, Counter> counters) {}
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

    /** 只计算一次领取；调用方须将随机结果、计时和资产在同一事务保存，不能在查询中抽奖。 */
    public Roll roll(int stageId, int seconds, int dropSeconds, Map<Integer, Counter> previous, RandomGenerator random) {
        if (seconds < 0 || seconds > data.maxSeconds() || dropSeconds < 0 || dropSeconds >= data.resetSeconds())
            throw new IllegalArgumentException("Invalid idle interval");
        var stage = stage(stageId);
        var counters = new HashMap<>(previous);
        var rewards = new TreeMap<Integer, Long>();
        for (var reward : stage.base()) add(rewards, reward.itemId(), Math.multiplyExact(reward.quantity(), seconds / data.frequency()));
        int remaining = seconds, accumulated = dropSeconds;
        while (remaining + accumulated >= data.resetSeconds()) {
            int slice = data.resetSeconds() - accumulated;
            drops(stage.group(), Math.round((float) slice / data.frequency()), counters, rewards, random);
            remaining -= slice; accumulated = 0; counters.clear();
        }
        if (remaining > 0) drops(stage.group(), Math.round((float) remaining / data.frequency()), counters, rewards, random);
        return new Roll(rewards.entrySet().stream().map(e -> new CampaignRules.Reward(e.getKey(), e.getValue())).toList(),
            accumulated + remaining, Map.copyOf(counters));
    }
    /** 每轮每类独立概率与保底；达到数量上限后停止，成功时按组权重及闭区间数量抽取。 */
    private void drops(int group, int count, Map<Integer, Counter> counters, Map<Integer, Long> rewards, RandomGenerator random) {
        var triggers = data.triggers().stream().filter(t -> t.group() == group).toList();
        for (int i = 0; i < count; i++) for (var trigger : triggers) {
            var old = counters.getOrDefault(trigger.type(), new Counter(0, 0));
            if (old.quantity() >= trigger.maximum()) continue;
            if (old.misses() >= trigger.guarantee() - 1 || random.nextInt(1000000) < trigger.chance()) {
                var options = data.drops().stream().filter(d -> d.table() == trigger.table()).toList();
                int point = random.nextInt(options.stream().mapToInt(Drop::weight).reduce(0, Math::addExact));
                Drop chosen = null;
                for (var option : options) { point -= option.weight(); if (point < 0) { chosen = option; break; } }
                if (chosen == null) throw new IllegalStateException("Missing idle drop");
                int quantity = random.nextInt(chosen.minimum(), Math.addExact(chosen.maximum(), 1));
                add(rewards, chosen.itemId(), quantity);
                counters.put(trigger.type(), new Counter(Math.addExact(old.quantity(), quantity), 0));
            } else counters.put(trigger.type(), new Counter(old.quantity(), old.misses() + 1));
        }
    }
    /** 合并同类资源，溢出时拒绝整个领取。 */
    private static void add(Map<Integer, Long> rewards, int id, long quantity) {
        if (quantity > 0) rewards.merge(id, quantity, Math::addExact);
    }
}
