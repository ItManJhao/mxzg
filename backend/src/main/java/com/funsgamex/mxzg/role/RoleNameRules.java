/**
 * 首次命名的格式、配置敏感词和随机名来源。只读取服务端配置，不修改角色状态。
 */
package com.funsgamex.mxzg.role;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
class RoleNameRules {
    /** 保留旧名字允许的字符范围，拒绝单行输入框无法正常显示的控制字符。 */
    private static final Pattern NAME_PATTERN = Pattern.compile("[\\p{Graph}\\p{Space}\\p{Blank}\\w\\u0020-\\uFE4F]+");
    /** 旧服系统展示符号，避免昵称冒用游戏内标签。 */
    private static final String RESERVED_SYMBOLS = "◆★◎●|_<>";

    /** 按原策划显示长度计数，Latin-1 计 1，其余字符计 2。 */
    private final int maxLength;
    /** 旧 xing 表的简体名字前段，按原配置行等概率抽取。 */
    private final List<String> prefixes;
    /** 旧 nick 表的简体名字后段，按原配置行等概率抽取。 */
    private final List<String> suffixes;
    /** 简体敏感词转小写后用于任意位置匹配，仅服务端持有。 */
    private final Set<String> blocked;

    /** 从现行 system 表读取确认的长度，姓名片段和敏感词来自原表的服务端投影。 */
    RoleNameRules(ObjectMapper mapper) {
        var system = read(mapper, "/gameplay/system.json").path("rows");
        maxLength = system.valueStream()
            .filter(row -> row.path("key").asString().equals("player_name_length"))
            .findFirst().orElseThrow(() -> new IllegalStateException("缺少角色名字长度配置"))
            .path("value").asInt();
        if (maxLength < 1 || maxLength > 64) {
            throw new IllegalStateException("角色名字长度超出持久字段容量");
        }
        var rules = read(mapper, "/gameplay/role-name-rules.json");
        prefixes = strings(rules.path("prefixes"));
        suffixes = strings(rules.path("suffixes"));
        blocked = new HashSet<>();
        for (var word : strings(rules.path("blocked"))) {
            blocked.add(word.toLowerCase(Locale.ROOT));
        }
    }

    /** 去除首尾空白及换行并校验合法性，通过后返回实际保存的名字。 */
    Optional<String> validate(String input) {
        if (input == null) {
            return Optional.empty();
        }
        String nickname = input.trim().replace("\r", "").replace("\n", "");
        if (nickname.isBlank() || nickname.length() > maxLength || !NAME_PATTERN.matcher(nickname).matches()) {
            return Optional.empty();
        }
        int length = 0;
        for (int index = 0; index < nickname.length(); index++) {
            char letter = nickname.charAt(index);
            length += letter <= 0xff ? 1 : 2;
            if (length > maxLength || Character.isISOControl(letter) || RESERVED_SYMBOLS.indexOf(letter) >= 0) {
                return Optional.empty();
            }
        }
        String lowered = nickname.toLowerCase(Locale.ROOT);
        for (int start = 0; start < lowered.length(); start++) {
            for (int end = start + 1; end <= lowered.length(); end++) {
                if (blocked.contains(lowered.substring(start, end))) {
                    return Optional.empty();
                }
            }
        }
        return Optional.of(nickname);
    }

    /** 各抽一个原表片段拼接为候选，确认可用的昵称仍由提交事务认领。 */
    String randomCandidate() {
        var random = ThreadLocalRandom.current();
        return prefixes.get(random.nextInt(prefixes.size())) + suffixes.get(random.nextInt(suffixes.size()));
    }

    /** 读取服务器随构建附带的规则，失配时提示部署修复。 */
    private static JsonNode read(ObjectMapper mapper, String path) {
        try (var stream = RoleNameRules.class.getResourceAsStream(path)) {
            if (stream == null) {
                throw new IllegalStateException("首次命名配置缺失：" + path);
            }
            return mapper.readTree(stream);
        } catch (IOException error) {
            throw new IllegalStateException("首次命名配置读取失败：" + path, error);
        }
    }

    /** 保留投影中每一行的原始文本与顺序。 */
    private static List<String> strings(JsonNode table) {
        if (!table.isArray() || table.isEmpty()) {
            throw new IllegalStateException("首次命名配置为空");
        }
        var result = new ArrayList<String>();
        for (var row : table) {
            if (!row.isString() || row.asString().isBlank()) {
                throw new IllegalStateException("首次命名配置含空文本");
            }
            result.add(row.asString());
        }
        return List.copyOf(result);
    }
}
