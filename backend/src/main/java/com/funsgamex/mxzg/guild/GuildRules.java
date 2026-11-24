/**
 * 公会的开放条件、各级经验和容量、创建费用及离会冷却，统一从原策划表读取。
 * 服务端验证玩家提交的名称和公告，查询与展示同用本配置。
 */
package com.funsgamex.mxzg.guild;

import com.funsgamex.mxzg.role.RoleNameRules;
import java.io.IOException;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
final class GuildRules {
    /** 公告保留旧界面可预览的前 301 个字符以内，换行可用于分段。 */
    private static final int NOTICE_LIMIT = 301;
    /** 原公告支持可见字符、中日韩文字和分段，拒绝其他控制字符。 */
    private static final Pattern NOTICE_PATTERN =
            Pattern.compile("[\\p{Graph}\\p{Space}\\p{Blank}\\p{P}\\u1100-\\uFE4F]*");
    /** 某一级公会的成员上限及经验栏分母。 */
    record Level(int level, int capacity, int nextLevelExperience) {}

    /** 开放条件、日服名称上限与按等级升序排列的旧表投影。 */
    record Gate(int levelRequired, int worldLevelRequired, int nameLimit, List<Level> levels) {
        /** 冻结启动时读取的等级表，防止运行中发生变化。 */
        Gate {
            levels = List.copyOf(levels);
        }
    }

    /** 新公会和主导航共用按原开放表导出的门槛。 */
    final Gate gate;
    /** 创建单个公会消耗的钻石数。 */
    final int createCostDiamonds;
    /** 建会要求的持久累计充值点数，0 表示此条件关闭。 */
    final long createRechargeRequired;
    /** 公会名公开展示的计量上限，汉字等非 Latin-1 字符计 2。 */
    final int nameLimit;
    /** 主动退出后的等待时间，单位秒。 */
    final long rejoinSeconds;
    /** 系统通用名称与敏感词校验。 */
    private final RoleNameRules names;

    /** 启动时核对原配置的合法性，阻止缺表环境以默认费用放行创建。 */
    GuildRules(ObjectMapper mapper, RoleNameRules names) {
        this.names = names;
        gate = mapper.treeToValue(read(mapper, "/gameplay/guild-rules.json"), Gate.class);
        var system = read(mapper, "/gameplay/system.json").path("rows");
        var cost = mapper.readTree(setting(system, "create_clan_gem").asString());
        if (!cost.isArray() || cost.size() != 1 || cost.get(0).path("item_type").asInt() != 900002) {
            throw new IllegalStateException("创建公会费用必须为单项钻石");
        }
        createCostDiamonds = cost.get(0).path("item_num").asInt(-1);
        createRechargeRequired = setting(system, "create_clan_total_charge_require").asLong(-1);
        nameLimit = gate.nameLimit();
        rejoinSeconds = setting(system, "clan_rejoin_time").asLong(-1);
        if (gate.levelRequired() < 1 || gate.worldLevelRequired() < 1 || gate.levels().isEmpty()
                || createCostDiamonds < 0 || createRechargeRequired < 0 || nameLimit < 1 || nameLimit > 64
                || rejoinSeconds < 0) {
            throw new IllegalStateException("公会策划配置无效");
        }
        for (int index = 0; index < gate.levels().size(); index++) {
            var level = gate.levels().get(index);
            if (level.level() != index + 1 || level.capacity() <= 0 || level.nextLevelExperience() <= 0) {
                throw new IllegalStateException("公会等级、成员容量或经验门槛无效：" + level);
            }
        }
    }

    /** 从连续等级表读取持久等级对应的门槛，未知等级按数据异常处理。 */
    Level level(int level) {
        if (level < 1 || level > gate.levels().size()) {
            throw new IllegalStateException("公会等级缺少配置：" + level);
        }
        return gate.levels().get(level - 1);
    }

    /** 校验并规范前后空白，通过后返回实际保存的名字。 */
    String validatedName(String input) {
        return names.validate(input, nameLimit).orElseThrow(() -> GuildService.invalid("GUILD_NAME_INVALID"));
    }

    /** 空公告有效，非空公告在写入前应用单一长度及敏感词校验。 */
    String validatedNotice(String input) {
        String notice = input.strip();
        if (notice.length() > NOTICE_LIMIT || !NOTICE_PATTERN.matcher(notice).matches()
                || notice.chars().anyMatch(c -> Character.isISOControl(c) && c != '\n' && c != '\r')
                || names.containsBlocked(notice)) {
            throw GuildService.invalid("GUILD_DESCRIPTION_INVALID");
        }
        return notice;
    }

    /** 读取随应用发行的已校验 JSON，缺文件时终止错误装配。 */
    private static JsonNode read(ObjectMapper mapper, String path) {
        try (var stream = GuildRules.class.getResourceAsStream(path)) {
            if (stream == null) {
                throw new IllegalStateException("缺少公会配置：" + path);
            }
            return mapper.readTree(stream);
        } catch (IOException failure) {
            throw new IllegalStateException("公会配置读取失败：" + path, failure);
        }
    }

    /** 在原 system 主表按已确认的配置键读取单值。 */
    private static JsonNode setting(JsonNode system, String key) {
        return system.valueStream().filter(row -> key.equals(row.path("key").asString()))
                .findFirst().orElseThrow(() -> new IllegalStateException("公会缺少配置：" + key)).path("value");
    }
}
