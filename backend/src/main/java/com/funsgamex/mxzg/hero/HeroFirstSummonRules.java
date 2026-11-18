/**
 * 普通首抽的同源策划规则：取原单抽配置的免费间隔和积分奖励、系统指定的首抽英雄。
 * 服务启动时校验首抽可用配置，购买、十连及后续免费次数不在这期规则中。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.reward.RewardGrantService;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class HeroFirstSummonRules {
    /** 从本次服务器时间计算下一次普通免费时间，单位秒。 */
    private final int freeIntervalSeconds;
    /** 服务器用作单次实际发奖的固定英雄与普通召唤积分，构造后不可修改。 */
    private final List<RewardGrantService.Reward> rewards;

    /** 读取原 idx=1 普通单抽和 first_ordinary_lottery，缺失、重复或不适用时拒绝启动。 */
    public HeroFirstSummonRules(ObjectMapper mapper, RewardGrantService grants) {
        JsonNode normal = row(mapper, "lotterypoint", value -> value.path("idx").asInt() == 1);
        if (positiveInt(normal, "type") != 1 || positiveInt(normal, "summon_times") != 1
                || positiveInt(normal, "free_summon") != 1) {
            throw new IllegalStateException("首抽配置必须是有一次免费次数的普通单抽");
        }
        freeIntervalSeconds = positiveInt(normal, "free_time");
        JsonNode first = row(mapper, "system", value -> value.path("key").asString().equals("first_ordinary_lottery"));
        int template = positiveInt(first, "value");
        var point = mapper.readTree(normal.path("point").asString());
        if (point == null || !point.isArray() || point.size() != 1
                || positiveInt(point.get(0), "item_type") != 900302) {
            throw new IllegalStateException("普通单抽缺少召唤积分奖励");
        }
        rewards = List.of(new RewardGrantService.Reward(template, 1),
                new RewardGrantService.Reward(900302, positiveInt(point.get(0), "item_num")));
        grants.requireSupported(rewards.stream().map(RewardGrantService.Reward::itemId).toList());
    }

    /** 按旧单抽成功时点计算持久冷却，客户端不提交时间。 */
    public long nextFreeAt(long nowSeconds) {
        return Math.addExact(nowSeconds, freeIntervalSeconds);
    }

    /** 返回同一笔并行提交的英雄和积分，供通用发奖入口消费。 */
    public List<RewardGrantService.Reward> rewards() {
        return rewards;
    }

    /** 从构建时同源表中取唯一匹配行，不回退到写死的替代奖励。 */
    private static JsonNode row(ObjectMapper mapper, String table, Predicate<JsonNode> matches) {
        try (var input = HeroFirstSummonRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input == null) {
                throw new IllegalStateException("缺少普通首抽配置表：" + table);
            }
            var candidates = new ArrayList<JsonNode>();
            for (var value : mapper.readTree(input).path("rows")) {
                if (matches.test(value)) {
                    candidates.add(value);
                }
            }
            if (candidates.size() != 1) {
                throw new IllegalStateException("普通首抽配置须对应唯一记录：" + table);
            }
            return candidates.getFirst();
        } catch (IOException error) {
            throw new IllegalStateException("无法读取普通首抽配置表：" + table, error);
        }
    }

    /** 只接受精确的正整数，拒绝空字段、字符串和溢出。 */
    private static int positiveInt(JsonNode row, String key) {
        var value = row.path(key);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() <= 0) {
            throw new IllegalStateException("普通首抽配置数值无效：" + key);
        }
        return value.asInt();
    }
}
