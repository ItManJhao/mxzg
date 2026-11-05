/** 同源英雄元素与克制配置，供战斗输入和普通伤害计算读取；伤害倍率与命中倍率分开保存。 */
package com.funsgamex.mxzg.hero;

import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public final class HeroBattleElementRules {
    /** 单组攻守元素的万分比配置，第一个是伤害，第二个是命中克制。 */
    public record Pair(int damage, int hit) {}
    /** 英雄模板到真实元素编号1至5的索引。 */
    private final Map<Integer, Integer> elements;
    /** 攻方元素乘10加守方元素作为键，保存25组方向相关配置。 */
    private final Map<Integer, Pair> pairs;

    /** 启动加载herotype和heroelemmul，缺行、重复键或非法字段明确拒绝。 */
    public HeroBattleElementRules(ObjectMapper mapper) {
        var heroes = new HashMap<Integer, Integer>();
        for (var row : rows(mapper, "herotype")) {
            int id = integer(row.path("type"));
            int element = integer(row.path("elem"));
            checkElement(element);
            if (heroes.put(id, element) != null) {
                throw new IllegalStateException("英雄元素模板重复：" + id);
            }
        }
        var values = new HashMap<Integer, Pair>();
        String[] columns = {"fire", "water", "wood", "light", "dark"};
        for (var row : rows(mapper, "heroelemmul")) {
            int attacker = integer(row.path("idx"));
            checkElement(attacker);
            for (int defender = 1; defender <= 5; defender++) {
                var pair = mapper.readTree(row.path(columns[defender - 1]).asString());
                if (!pair.isArray() || pair.size() != 2) {
                    throw new IllegalStateException("元素克制配置必须包含伤害与命中两项");
                }
                if (values.put(attacker * 10 + defender,
                    new Pair(integer(pair.get(0)), integer(pair.get(1)))) != null) {
                    throw new IllegalStateException("元素克制配置重复");
                }
            }
        }
        if (heroes.isEmpty() || values.size() != 25) {
            throw new IllegalStateException("英雄元素或克制配置不完整");
        }
        elements = Map.copyOf(heroes);
        pairs = Map.copyOf(values);
    }

    /** 从真实英雄模板获取元素，不使用外观、进化等级或默认元素代替。 */
    public int element(int template) {
        var element = elements.get(template);
        if (element == null) {
            throw new IllegalArgumentException("英雄元素模板缺失：" + template);
        }
        return element;
    }

    /** 按攻守方向返回两项配置；当前英雄路径要求双方元素存在，不猜测缺失配置。 */
    public Pair pair(int attacker, int defender) {
        checkElement(attacker);
        checkElement(defender);
        return pairs.get(attacker * 10 + defender);
    }

    /** 旧元素伤害为配置倍率加攻方对守方元素的增伤；只读取对应属性一次。 */
    public double damageMultiplier(int attacker, int defender, HeroBattleAttributeState attributes) {
        var pair = pair(attacker, defender);
        int type = switch (defender) {
            case 1 -> 251;
            case 2 -> 253;
            case 3 -> 252;
            case 4 -> 254;
            case 5 -> 255;
            default -> throw new IllegalArgumentException("未知守方元素");
        };
        return attributes.rate(type) + pair.damage() / 10000D;
    }

    /** 读取非空同源配置行，不访问客户端运行时或玩家数据库。 */
    private static JsonNode rows(ObjectMapper mapper, String name) {
        try (var input = HeroBattleElementRules.class.getResourceAsStream("/gameplay/" + name + ".json")) {
            if (input == null) {
                throw new IllegalStateException("战斗元素配置缺失：" + name);
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("战斗元素配置为空：" + name);
            }
            return rows;
        } catch (java.io.IOException error) {
            throw new IllegalStateException("战斗元素配置读取失败：" + name, error);
        }
    }

    /** 验证配置整数，避免缺字段被解析为零。 */
    private static int integer(JsonNode value) {
        if (!value.isIntegralNumber() || !value.canConvertToInt()) {
            throw new IllegalStateException("战斗元素配置不是有效整数");
        }
        return value.asInt();
    }

    /** 当前英雄只允许旧五种元素；非法编号不按中性倍率处理。 */
    private static void checkElement(int element) {
        if (element < 1 || element > 5) {
            throw new IllegalArgumentException("战斗元素编号无效：" + element);
        }
    }
}
