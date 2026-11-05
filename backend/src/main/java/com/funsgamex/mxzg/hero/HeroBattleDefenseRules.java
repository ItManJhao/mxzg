/** 按旧 BattleTemplate 从同源星级表读取战斗防御系数；只用于战斗输入，不写英雄面板或资产。 */
package com.funsgamex.mxzg.hero;

import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public final class HeroBattleDefenseRules {
    /** 星级到防御系数的不可变索引，启动加载；缺失星级不能降级使用其他星级。 */
    private final Map<Integer, Long> coefficients;

    /** 加载 battledefend 的 star/rate，拒绝空表、重复星级和非法数值。 */
    public HeroBattleDefenseRules(ObjectMapper mapper) {
        var values = new HashMap<Integer, Long>();
        try (var input = getClass().getResourceAsStream("/gameplay/battledefend.json")) {
            if (input == null) {
                throw new IllegalStateException("战斗防御系数表缺失");
            }
            for (var row : mapper.readTree(input).path("rows")) {
                var star = row.path("star");
                var rate = row.path("rate");
                if (!star.isIntegralNumber() || !star.canConvertToInt() || star.asInt() <= 0
                    || !rate.isIntegralNumber() || !rate.canConvertToLong() || rate.asLong() <= 0) {
                    throw new IllegalStateException("战斗防御系数配置无效");
                }
                if (values.put(star.asInt(), rate.asLong()) != null) {
                    throw new IllegalStateException("战斗防御系数星级重复：" + star.asInt());
                }
            }
        } catch (java.io.IOException error) {
            throw new IllegalStateException("战斗防御系数表读取失败", error);
        }
        if (values.isEmpty()) {
            throw new IllegalStateException("战斗防御系数表为空");
        }
        coefficients = Map.copyOf(values);
    }

    /** 根据当前真实星级取系数；不使用进化等级、强化阶段或默认值代替。 */
    public long coefficient(int star) {
        var value = coefficients.get(star);
        if (value == null) {
            throw new IllegalArgumentException("战斗防御系数星级缺失：" + star);
        }
        return value;
    }
}
