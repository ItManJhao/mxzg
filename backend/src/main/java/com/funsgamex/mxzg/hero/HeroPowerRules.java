/**
 * 旧BattleTemplate.computeStrength的英雄战力评分：属性初始化后加权，逐英雄截断再乘倍率。
 * 不负责属性来源组装，不读取临时战斗Buff，也不把评分当作伤害或胜负依据。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public final class HeroPowerRules {
    /** 按原表顺序保存属性编号和万分比权重，保留double累加次序。 */
    private final List<Weight> weights;
    /** 原system.hero_fight_mul倍率，在截断后相乘。 */
    private final int multiplier;
    /** 单个评分属性的原配置，不保存玩家值。 */
    private record Weight(int attribute, int ratio) {}

    /** 加载评分表和系统倍率，禁止缺失时回退四维之和或硬编码3。 */
    public HeroPowerRules(ObjectMapper mapper) {
        var configured = new ArrayList<Weight>();
        var seen = new HashSet<Integer>();
        for (var row : rows(mapper, "scorecount")) {
            int attribute = positive(row, "mapping");
            int ratio = positive(row, "ratio");
            if (!seen.add(attribute)) {
                throw new IllegalStateException("重复战力属性：" + attribute);
            }
            configured.add(new Weight(attribute, ratio));
        }
        weights = List.copyOf(configured);
        int found = 0;
        for (var row : rows(mapper, "system")) {
            if (row.path("key").asString().equals("hero_fight_mul")) {
                if (found != 0) {
                    throw new IllegalStateException("重复战力倍率");
                }
                found = positive(row, "value");
            }
        }
        if (found == 0) {
            throw new IllegalStateException("战力倍率缺失");
        }
        multiplier = found;
    }

    /**
     * 输入原始属性，不接受已经折算的四维。沿旧initAttribute先把223生命变为最大生命，
     * 攻防速与控制效果通过同源属性读取折算，合计截断后乘倍率，再加130额外战力。
     * 不修改输入；超出旧int战力范围明确拒绝，避免溢出绕过关卡门槛。
     */
    public int score(Map<Integer, Long> raw) {
        var initialized = new HashMap<>(raw);
        initialized.put(223, HeroBattleAttributeUtils.opening(raw).maxHp());
        var attributes = new HeroBattleAttributeState(initialized);
        double sum = 0;
        for (var weight : weights) {
            sum += Math.multiplyExact(attributes.get(weight.attribute()), (long) weight.ratio()) / 10000D;
        }
        if (!Double.isFinite(sum) || sum < 0 || sum > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("英雄战力评分越界");
        }
        long scaled = Math.multiplyExact((long) (int) sum, multiplier);
        long result = Math.addExact(scaled, attributes.get(130));
        if (result < 0) {
            throw new IllegalArgumentException("英雄战力不能为负数");
        }
        return Math.toIntExact(result);
    }

    /** 读取共享配置，不生成另一份手工评分表。 */
    private static JsonNode rows(ObjectMapper mapper, String table) {
        try (var input = HeroPowerRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input == null) {
                throw new IllegalStateException("战力配置缺失：" + table);
            }
            var result = mapper.readTree(input).path("rows");
            if (!result.isArray() || result.isEmpty()) {
                throw new IllegalStateException("战力配置为空：" + table);
            }
            return result;
        } catch (java.io.IOException error) {
            throw new IllegalStateException("战力配置读取失败", error);
        }
    }

    /** 配置字段必须是正整数，不静默截断小数或解析字符串。 */
    private static int positive(JsonNode row, String key) {
        var value = row.path(key);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() <= 0) {
            throw new IllegalStateException("战力配置字段无效：" + key);
        }
        return value.asInt();
    }
}
