/**
 * 战斗头像快照规则：按旧skin星级分段及进化配置解析开战时头像ID。
 * 由战斗输入构建调用，不读取当前名册、不开放进化或皮肤操作；结果随战报持久化。
 */
package com.funsgamex.mxzg.hero;

import java.util.HashMap;
import java.util.Map;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public final class HeroBattleAppearanceRules {
    /** 模板到同源星级分段，初始化后仅供查询。 */
    private final Map<Integer, JsonNode> skins = new HashMap<>();
    /** 模板/分支/等级到进化头像ID，禁止跨分支回退。 */
    private final Map<String, Integer> evolutionIcons = new HashMap<>();
    /** 注入的配置解析器，用于旧表内JSON数组。 */
    private final ObjectMapper mapper;

    /** 加载同源配置；缺表直接拒绝，不能伪造默认进化外观。 */
    public HeroBattleAppearanceRules(ObjectMapper mapper) {
        this.mapper = mapper;
        for (var row : rows("skin")) {
            skins.put(row.path("type").asInt(), row);
        }
        for (var row : rows("heroevolvelevel")) {
            evolutionIcons.put(key(row.path("hero_type").asInt(), row.path("evolve_type").asInt(),
                row.path("level").asInt()), row.path("evolve_icon_id").asInt());
        }
    }

    /** 解析本场只读外观；0/0为未进化，未知或不完整进化状态拒绝。皮肤系统未恢复，不伪造穿戴。 */
    public int icon(int template, int star, int evolutionType, int evolutionLevel) {
        if (template <= 0 || star <= 0 || evolutionType < 0 || evolutionLevel < 0
            || (evolutionType == 0) != (evolutionLevel == 0)) {
            throw new IllegalArgumentException("战斗头像输入无效");
        }
        if (evolutionType > 0) {
            var icon = evolutionIcons.get(key(template, evolutionType, evolutionLevel));
            if (icon == null || icon <= 0) {
                throw new IllegalArgumentException("战斗进化头像配置缺失");
            }
            return icon;
        }
        var row = skins.get(template);
        int skin = template;
        if (row != null) {
            var limits = mapper.readTree(row.path("star_limit").asText());
            var values = mapper.readTree(row.path("skin").asText());
            if (!limits.isArray() || limits.isEmpty() || limits.size() != values.size()) {
                throw new IllegalStateException("战斗星级头像分段无效");
            }
            // 沿旧getHeroIconByStar：取首个上限覆盖当前星级的分段，超出时保留最后一档。
            for (int index = 0; index < limits.size(); index++) {
                skin = values.get(index).asInt();
                if (limits.get(index).asInt() >= star) {
                    break;
                }
            }
        }
        return Math.addExact(skin, 10000000);
    }

    /** 形成同一英雄的进化精确键，不使用展示名称匹配。 */
    private static String key(int template, int type, int level) {
        return template + ":" + type + ":" + level;
    }

    /** 读取构建时打包的同源表，资源关闭后只保留解析结果。 */
    private JsonNode rows(String name) {
        try (var input = getClass().getResourceAsStream("/gameplay/" + name + ".json")) {
            if (input == null) {
                throw new IllegalStateException("战斗头像配置缺失：" + name);
            }
            return mapper.readTree(input).path("rows");
        } catch (java.io.IOException error) {
            throw new IllegalStateException("战斗头像配置读取失败：" + name, error);
        }
    }
}
