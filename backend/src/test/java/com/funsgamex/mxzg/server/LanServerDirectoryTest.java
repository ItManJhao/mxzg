/** 内网区服目录回归：验证个人服发布、Protobuf 地址传递，以及个人实例登记与共享库的隔离。 */
package com.funsgamex.mxzg.server;

import com.funsgamex.mxzg.network.GameProtocolCodec;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class LanServerDirectoryTest {
    /** 真实个人端点的格式样例，编码测试不会连接此地址。 */
    private static final String SOCKET = "wss://dev-wang.test:18082/api/v1/game/socket";
    /** 模拟管理员通过两次保存更新内网目录。 */
    @TempDir Path temporary;
    /** 每个用例单独的内存库，覆盖最小真实区服与角色字段。 */
    private JdbcTemplate jdbc;
    /** 与测试数据库关联的事务管理器，用于验证启动登记及失败回滚。 */
    private DataSourceTransactionManager transactions;

    /** 建立相当于本地开发种子的两行区服，不加载游戏资源或访问打包机实库。 */
    @BeforeEach
    void seed() {
        var data = new DriverManagerDataSource("jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1");
        jdbc = new JdbcTemplate(data);
        transactions = new DataSourceTransactionManager(data);
        jdbc.execute("CREATE TABLE game_server(id VARCHAR(32) PRIMARY KEY, region_id VARCHAR(32), region_name VARCHAR(64),"
                + " server_name VARCHAR(64), enabled BOOLEAN, opened_at_seconds BIGINT)");
        jdbc.execute("CREATE TABLE game_role(id VARCHAR(36) PRIMARY KEY,server_id VARCHAR(32))");
        jdbc.update("INSERT INTO game_server VALUES ('local-1','local','本地开发区','开发一服',true,123),"
                + "('local-2','local','本地开发区','开发二服',true,null)");
    }

    /** 将域名路由发布给客户端，验证目录更新立即可见且本机登录和玩法维护不会采纳远程行。 */
    @Test
    void sharedDirectoryPublishesRemoteRoutesWithoutHostingThem() throws Exception {
        var file = temporary.resolve("servers.json");
        var catalog = catalog(new LanServerDirectory(file.toString(), "", "", ""));
        Files.writeString(file, document(entry("dev-wang", SOCKET)));
        var advertised = catalog.published();
        assertEquals(List.of("local-1", "local-2", "dev-wang"), advertised.stream().map(ServerCatalog.Server::id).toList());
        assertEquals("共享验收服", advertised.getFirst().name());
        var bytes = GameProtocolCodec.encode(Map.of("version", 1, "kind", "response", "name", "servers.list",
                "ok", true, "body", Map.of("items", advertised)));
        var items = GameProtocolCodec.decode(bytes).path("body").path("items");
        assertFalse(items.get(0).has("socketUrl"));
        assertEquals(SOCKET, items.get(2).path("socketUrl").asString());
        assertEquals("开发一服", catalog.list().getFirst().name());
        assertEquals(2, catalog.list().size());
        assertThrows(ResponseStatusException.class, () -> catalog.require("dev-wang"));
        Files.writeString(file, document(""));
        assertEquals(2, catalog.published().size());
    }

    /** 个人实例只服务自己的 ID，改显示名称和重启保留已有角色与开服信息。 */
    @Test
    void personalIdentitySurvivesRestartAndRejectsOtherIds() {
        var personal = catalog(new LanServerDirectory("", "dev-wang", "小王", ""));
        assertEquals("dev-wang", personal.require(null));
        assertEquals(1, personal.published().size());
        assertNull(personal.published().getFirst().socketUrl());
        assertThrows(ResponseStatusException.class, () -> personal.require("local-1"));
        jdbc.update("INSERT INTO game_role VALUES ('mine','dev-wang')");
        jdbc.update("UPDATE game_server SET opened_at_seconds=100 WHERE id='dev-wang'");
        var restarted = catalog(new LanServerDirectory("", "dev-wang", "小王联调", ""));
        assertEquals("小王联调", restarted.list().getFirst().name());
        assertEquals(100L, jdbc.queryForObject("SELECT opened_at_seconds FROM game_server WHERE id='dev-wang'", Long.class));
        assertThrows(IllegalStateException.class, () -> catalog(new LanServerDirectory("", "dev-lee", "小李", "")));
        restarted.requireResumableRole("mine");
        jdbc.update("INSERT INTO game_role VALUES ('elsewhere','local-1')");
        assertThrows(ResponseStatusException.class, () -> restarted.requireResumableRole("elsewhere"));
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM game_server", Integer.class));
    }

    /** 个人配置误指向已有共享角色的库时，禁止在共享库中增加身份或改写现有记录。 */
    @Test
    void sharedDataPreventsPersonalRegistration() {
        jdbc.update("INSERT INTO game_role VALUES ('existing','local-1')");
        assertThrows(IllegalStateException.class, () -> catalog(new LanServerDirectory("", "dev-wang", "小王", "")));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM game_server", Integer.class));
    }

    /** 拒绝重复注册、明文或含凭证/参数的路由、配置混用，以及通配的浏览器来源。 */
    @Test
    void refusesInvalidDirectoryAndOrigin() throws Exception {
        var file = temporary.resolve("servers.json");
        var catalog = catalog(new LanServerDirectory(file.toString(), "", "", ""));
        String first = entry("dev-wang", SOCKET);
        for (String rows : List.of(first + "," + first, first + "," + entry("dev-other", SOCKET),
                entry("local-1", SOCKET), entry("dev-wang", SOCKET.replace("wss:", "ws:")),
                entry("dev-wang", SOCKET.replace("//", "//user@")), entry("dev-wang", SOCKET + "?token=x"))) {
            Files.writeString(file, document(rows));
            assertThrows(IllegalArgumentException.class, catalog::published);
        }
        assertThrows(IllegalArgumentException.class, () -> new LanServerDirectory(file.toString(), "dev-wang", "小王", ""));
        assertThrows(IllegalArgumentException.class, () -> new LanServerDirectory("", "dev-wang", "小王", "*"));
        var personal = new LanServerDirectory("", "dev-wang", "小王", "https://shared.test:18082");
        assertTrue(List.of(personal.allowedOrigins()).contains("https://shared.test:18082"));
    }

    /** 装配使用同一隔离数据库的目录服务，使重复构造模拟实例重新启动。 */
    private ServerCatalog catalog(LanServerDirectory lan) {
        return new ServerCatalog(jdbc, Optional.of(lan), transactions);
    }

    /** 返回测试目录文档，可使用空数组验证已退出的个人实例即时消失。 */
    private String document(String entries) {
        return "{\"sharedName\":\"共享验收服\",\"servers\":[" + entries + "]}";
    }

    /** 生成一个测试用个人服记录，入参是需要验证的区服 ID 和连接地址。 */
    private String entry(String id, String socket) {
        return "{\"id\":\"" + id + "\",\"name\":\"个人服\",\"socketUrl\":\"" + socket + "\"}";
    }
}
