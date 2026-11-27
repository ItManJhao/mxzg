/**
 * 内网客户端选服目录。打包机从管理员维护的本地文件发布个人服入口，个人机声明自己承载的唯一服。
 * 仅在 local 配置装配；目录数据不写入共享游戏库，不接受客户端登记或任意连接地址。
 */
package com.funsgamex.mxzg.server;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Component
@Profile("local & !production")
public final class LanServerDirectory {
    /** 账号键含 32 位账号及 @，64 位数据库列给个人服 ID 最多留下 31 位。 */
    private static final Pattern PERSONAL_ID = Pattern.compile("dev-[a-z0-9][a-z0-9_-]{0,26}");
    /** 文件只包含公开目录字段；限制单次匿名查询的读取量和响应规模。 */
    private static final int FILE_LIMIT = 65536;
    /** 解析受维护人管理的小型 JSON 路由表，不解析来自浏览器的配置。 */
    private final JsonMapper json = new JsonMapper();
    /** 共享机的目录绝对路径，未配置时仅公布数据库中的本地区服。 */
    private final Path directoryFile;
    /** 个人模式下本机唯一可承载的服 ID；空串表示常规本地/共享实例。 */
    private final String personalId;
    /** 个人机为本机区服登记的名字；与个人 ID 同时配置。 */
    private final String personalName;
    /** 现有联调预览来源以及明确配置的共享 H5 来源，在 WebSocket 握手时使用。 */
    private final List<String> allowedOrigins;

    /** 解析互斥的共享目录与个人身份配置；额外浏览器来源必须是完整 HTTPS Origin。 */
    public LanServerDirectory(@Value("${mxzg.lan.directory-file:}") String file,
                              @Value("${mxzg.lan.personal-id:}") String personalId,
                              @Value("${mxzg.lan.personal-name:}") String personalName,
                              @Value("${mxzg.lan.shared-origin:}") String sharedOrigin) {
        this.directoryFile = file.isEmpty() ? null : Path.of(file);
        if (directoryFile != null && (!directoryFile.isAbsolute() || !personalId.isEmpty())) {
            throw new IllegalArgumentException("共享目录需要绝对文件路径，且不能同时启用个人服");
        }
        if (personalId.isEmpty() != personalName.isEmpty() || (!personalId.isEmpty()
                && (!PERSONAL_ID.matcher(personalId).matches() || !validName(personalName)))) {
            throw new IllegalArgumentException("个人服 ID 或名称无效");
        }
        this.personalId = personalId;
        this.personalName = personalName;
        var origins = new ArrayList<>(List.of("http://localhost:7456", "http://127.0.0.1:7456",
                "http://localhost:18081", "http://127.0.0.1:18081"));
        if (!sharedOrigin.isEmpty()) {
            checkAddress(sharedOrigin, "https", "");
            origins.add(sharedOrigin);
        }
        this.allowedOrigins = List.copyOf(origins);
    }

    /** 返回本机配置的个人服 ID，空串表示普通区服由本库目录决定。 */
    String personalId() {
        return personalId;
    }

    /** 返回个人服启动时登记的显示名称。 */
    String personalName() {
        return personalName;
    }

    /** 给 WebSocket 框架一个独立的来源清单，始终使用精确匹配。 */
    public String[] allowedOrigins() {
        return allowedOrigins.toArray(String[]::new);
    }

    /** 从单次读取的完整目录快照生成选服项；本地行省略连接地址，不改变数据库中的区服。 */
    List<ServerCatalog.Server> publish(List<ServerCatalog.Server> hosted) {
        if (directoryFile == null) {
            return hosted;
        }
        JsonNode document;
        try (var stream = Files.newInputStream(directoryFile)) {
            byte[] bytes = stream.readNBytes(FILE_LIMIT + 1);
            if (bytes.length > FILE_LIMIT) {
                throw new IllegalArgumentException("内网区服目录超过 64 KiB");
            }
            document = json.readTree(bytes);
        } catch (IOException | tools.jackson.core.JacksonException failure) {
            throw new IllegalStateException("无法读取内网区服目录", failure);
        }
        if (document == null || !document.isObject() || !Set.of("sharedName", "servers").containsAll(document.propertyNames())
                || !document.path("servers").isArray() || document.path("servers").size() > 64) {
            throw new IllegalArgumentException("内网区服目录格式无效");
        }
        String sharedName = document.has("sharedName") ? text(document, "sharedName") : "共享验收服";
        if (!validName(sharedName)) {
            throw new IllegalArgumentException("共享验收服名称无效");
        }
        var rows = new ArrayList<ServerCatalog.Server>();
        var ids = new HashSet<String>();
        for (var local : hosted) {
            ids.add(local.id());
            rows.add(local.id().equals("local-1")
                    ? new ServerCatalog.Server(local.id(), local.regionId(), local.regionName(), sharedName, local.enabled(), null)
                    : local);
        }
        var addresses = new HashSet<URI>();
        for (var item : document.path("servers")) {
            if (!item.isObject() || item.size() != 3 || !Set.of("id", "name", "socketUrl").containsAll(item.propertyNames())) {
                throw new IllegalArgumentException("个人服目录项字段无效");
            }
            String id = text(item, "id");
            String name = text(item, "name");
            String socket = text(item, "socketUrl");
            if (!PERSONAL_ID.matcher(id).matches() || !validName(name) || !ids.add(id)
                    || !addresses.add(checkAddress(socket, "wss", "/api/v1/game/socket"))) {
                throw new IllegalArgumentException("个人服 ID、名称或入口重复或无效");
            }
            rows.add(new ServerCatalog.Server(id, "lan-personal", "个人开发服", name, true, socket));
        }
        return List.copyOf(rows);
    }

    /** 要求短名称无首尾空格和控制字符，避免目录或日志出现不可辨识条目。 */
    private static boolean validName(String name) {
        return !name.isBlank() && name.equals(name.strip()) && name.length() <= 64
                && name.chars().noneMatch(Character::isISOControl);
    }

    /** 精确读取目录字段，不允许 JSON 布尔、数字等类型隐式转换为地址或区服 ID。 */
    private static String text(JsonNode item, String key) {
        if (!item.path(key).isString()) {
            throw new IllegalArgumentException("区服目录缺少文本字段 " + key);
        }
        return item.path(key).asString();
    }

    /** 检查公开入口的协议、主机、端口和固定路径，拒绝凭据、通配、查询及片段。 */
    private static URI checkAddress(String value, String scheme, String path) {
        var uri = URI.create(value);
        if (!scheme.equals(uri.getScheme()) || uri.getHost() == null || uri.getRawUserInfo() != null
                || uri.getRawAuthority().endsWith(":") || uri.getPort() == 0 || uri.getPort() > 65535
                || !path.equals(uri.getRawPath()) || uri.getRawQuery() != null || uri.getRawFragment() != null) {
            throw new IllegalArgumentException("内网地址必须使用 " + scheme + "、明确主机和规定路径");
        }
        return uri;
    }
}
