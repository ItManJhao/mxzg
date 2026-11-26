/** 从旧策划投影读取聊天门槛，核对部署的跨服分组并执行文本规则。 */
package com.funsgamex.mxzg.chat;

import com.funsgamex.mxzg.role.RoleNameRules;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
final class ChatRules {
    /** V71 正文字段能存储的最大 UTF-16 长度，配置上限不能大于此值。 */
    private static final int STORAGE_LENGTH = 102;
    /** 旧世界频道的广告数字匹配集合，拼接六个即触发限制。 */
    private static final Pattern AD_DIGITS = Pattern.compile(
            "[+=＋＝0123456789１２３４５６７８９０㈠㈡㈢㈣㈤㈥㈦㈧㈨⑴⑵⑶⑷⑸⑹⑺⑻⑼⒈⒉⒊⒋⒌⒍⒎⒏⒐①②④⑤⑥⑦⑧⑨〇一二三四五六七八九百佰千仟万亿壹貳叁肆陸柒捌汣]");

    /** 角色发言的原策划最低等级，与频道是否可浏览无关。 */
    private final int sendLevel;
    /** 有对应房间的角色可切换跨服频道和全服频道的最低等级。 */
    private final Map<ChatChannel, Integer> entryLevels;
    /** 只收录部署显式声明的两类房间；内层从区服 ID 映射到房间键。 */
    private final Map<ChatChannel, Map<String, String>> groupRooms;
    /** 同一角色两次成功发布之间的间隔，单位秒。 */
    private final int sendIntervalSeconds;
    /** 原服计算显示长度的上限，ASCII 和 Latin-1 计一。 */
    private final int textLimit;
    /** 同源简中配置词表，作为当前可用的聊天文本过滤来源。 */
    private final RoleNameRules sensitiveWords;

    /** 从随服务交付的策划投影读取等级和文本参数，校验部署传入的区服映射。 */
    ChatRules(ObjectMapper json, RoleNameRules sensitiveWords,
              @Value("${mxzg.chat.cross-rooms:}") String crossRooms,
              @Value("${mxzg.chat.global-rooms:}") String globalRooms) {
        this.sensitiveWords = sensitiveWords;
        var rows = readRows(json, "system");
        sendLevel = positive(rows, "chat_unlock_main_level", 300);
        sendIntervalSeconds = positive(rows, "chat_frequency_at_least", 3600);
        textLimit = positive(rows, "chat_num", STORAGE_LENGTH);
        var conditions = readRows(json, "opencondition");
        entryLevels = Map.of(ChatChannel.CROSS, level(conditions, "main_chat_cross_share"),
                ChatChannel.GLOBAL, level(conditions, "main_chat_city"));
        groupRooms = Map.of(ChatChannel.CROSS, configuredRooms(crossRooms),
                ChatChannel.GLOBAL, configuredRooms(globalRooms));
    }

    /** 比较持久角色等级与旧版发言门槛。 */
    boolean canSend(int level) {
        return level >= sendLevel;
    }

    /** 跨服及全服标签由旧策划角色等级开放，其他频道不需要这个额外等级。 */
    boolean canEnter(ChatChannel channel, int level) {
        return level >= entryLevels.getOrDefault(channel, 0);
    }

    /** 匹配部署明示的频道房间，没有配置的区服保持未开放。 */
    String groupRoom(ChatChannel channel, String serverId) {
        return groupRooms.getOrDefault(channel, Map.of()).get(serverId);
    }

    /** 从房间配置反查在线无正文通知可到达的区服集合。 */
    Set<String> roomServers(ChatRoom room) {
        return groupRooms.getOrDefault(room.channel(), Map.of()).entrySet().stream()
                .filter(entry -> entry.getValue().equals(room.key()))
                .map(Map.Entry::getKey).collect(Collectors.toUnmodifiableSet());
    }

    /** 返回两次成功发布必须相隔的秒数。 */
    int sendIntervalSeconds() {
        return sendIntervalSeconds;
    }

    /** 清理旧换行和 &，核对长度及控制字符，返回用于幂等比较的单行原文。 */
    String normalize(String input) {
        if (input == null || input.isEmpty()) {
            throw rejected("CHAT_INVALID");
        }
        if (input.length() > textLimit) {
            throw rejected("CHAT_CONTENT_TOO_LONG");
        }
        String normalized = input.replace('\r', ' ').replace('\n', ' ').replace('&', '*').strip();
        if (normalized.isBlank() || normalized.codePoints().anyMatch(Character::isISOControl)) {
            throw rejected("CHAT_INVALID");
        }
        long extra = normalized.codePoints().filter(letter -> letter > 0xff).count();
        if (normalized.length() + extra > textLimit) {
            throw rejected("CHAT_CONTENT_TOO_LONG");
        }
        return normalized;
    }

    /** 对新发言应用旧数字广告阈值及简中配置遮盖，返回可公开投递的正文。 */
    String filterForPublic(String normalized) {
        if (AD_DIGITS.matcher(normalized).results().limit(6).count() == 6) {
            throw rejected("CHAT_CONTENT_RESTRICTED");
        }
        return sensitiveWords.maskBlocked(normalized);
    }

    /** 读取 system 配置的某个严格正整数并给出明确的部署异常。 */
    private static int positive(JsonNode rows, String key, int max) {
        for (var row : rows) {
            if (row.path("key").asString().equals(key)) {
                var value = row.path("value");
                if (value.isIntegralNumber() && value.canConvertToInt() && value.asInt() > 0 && value.asInt() <= max) {
                    return value.asInt();
                }
                break;
            }
        }
        throw new IllegalStateException("聊天规则缺少合法配置 " + key);
    }

    /** 读取只依赖角色等级的条件，缺项时明确报告配置问题。 */
    private static int level(JsonNode rows, String atom) {
        var row = rows.valueStream().filter(item -> atom.equals(item.path("atom").asString()))
                .findFirst().orElseThrow(() -> new IllegalStateException("聊天缺少开放条件：" + atom));
        int level = row.path("condition_value").asInt(-1);
        if (row.path("condition_type").asInt() != 1 || level < 1) {
            throw new IllegalStateException("聊天配置的开放条件无效：" + atom);
        }
        return level;
    }

    /** 解析逗号分隔的区服=房间配置，拒绝重复区服和非法标识。 */
    private static Map<String, String> configuredRooms(String raw) {
        if (raw.isBlank()) {
            return Map.of();
        }
        Map<String, String> rooms = new HashMap<>();
        for (String entry : raw.split(",", -1)) {
            String[] pair = entry.strip().split("=", -1);
            if (pair.length != 2 || !pair[0].matches("[A-Za-z0-9_-]{1,32}")
                    || !pair[1].matches("[A-Za-z0-9_-]{1,64}") || rooms.putIfAbsent(pair[0], pair[1]) != null) {
                throw new IllegalStateException("聊天区服房间配置格式无效，需使用唯一的区服=房间对");
            }
        }
        return Map.copyOf(rooms);
    }

    /** 加载发行包内使用的旧策划投影，配置缺失时拒绝启动。 */
    private static JsonNode readRows(ObjectMapper json, String table) {
        try (var input = ChatRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input != null) {
                var rows = json.readTree(input).path("rows");
                if (rows.isArray()) {
                    return rows;
                }
            }
            throw new IllegalStateException("聊天配置行缺失：" + table);
        } catch (IOException error) {
            throw new IllegalStateException("聊天规则读取失败：" + table, error);
        }
    }

    /** 返回通信层使用的稳定失败原因。 */
    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
