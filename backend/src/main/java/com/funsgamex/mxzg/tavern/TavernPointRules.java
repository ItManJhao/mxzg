/**
 * 酒馆冒险点的同源初始规则：只读取system.tavern_initial_item，不持有角色状态。
 * 由TavernPointService在真正缺少持久记录时使用；不生成酒馆任务，也不发放其他资源。
 */
package com.funsgamex.mxzg.tavern;

import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public final class TavernPointRules {
    /** WS客户端以number保存点数，只接受JS安全整数；独立领域和V26迁移共同遵守此上限。 */
    public static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;

    /** 旧酒馆缺记录时的一次初始冒险点，单位为点；0是合法配置，缺配置不能默认0。 */
    private final long initialAdventureCount;

    /** 读取唯一同源配置，缺失、重复、负数或非整数均拒绝启动，不用旧常量兜底。 */
    public TavernPointRules(ObjectMapper mapper) {
        Long initial = null;
        try (var input = getClass().getResourceAsStream("/gameplay/system.json")) {
            if (input == null) {
                throw new IllegalStateException("酒馆冒险点缺少system配置");
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("酒馆system配置结构无效");
            }
            for (var row : rows) {
                if (!row.path("key").asString().equals("tavern_initial_item")) {
                    continue;
                }
                var value = row.path("value");
                if (initial != null || !value.isIntegralNumber() || !value.canConvertToLong()
                        || value.asLong() < 0 || value.asLong() > MAX_SAFE_INTEGER) {
                    throw new IllegalStateException("酒馆初始冒险点配置无效或重复");
                }
                initial = value.asLong();
            }
        } catch (java.io.IOException failure) {
            throw new IllegalStateException("酒馆初始冒险点配置读取失败", failure);
        }
        if (initial == null) {
            throw new IllegalStateException("酒馆初始冒险点配置缺失");
        }
        initialAdventureCount = initial;
    }

    /** 返回旧缺记录懒初始化的真实初值，不对已有0余额补差或施加关卡上限。 */
    public long initialAdventureCount() {
        return initialAdventureCount;
    }
}
