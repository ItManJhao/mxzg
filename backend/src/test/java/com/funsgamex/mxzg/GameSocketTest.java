/** 登录/背包长连接集成测试：随机端口、独立 H2 与合成账号，通过真实 WebSocket 验证会话边界。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.*;
import com.funsgamex.mxzg.campaign.CampaignService;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Import;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:socket_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="})
@ActiveProfiles("local")
@Import(GameSocketTest.IdentityProbe.class)
class GameSocketTest {
    private static final String RUN_ID = UUID.randomUUID().toString();

    /** 仅测试上下文提供随机实例身份，客户端核对后才允许创建合成账号。 */
    @RestController
    @org.springframework.boot.test.context.TestComponent
    static class IdentityProbe {
        /** 返回本轮随机身份，不暴露数据库位置或任何玩家信息。 */
        @GetMapping("/api/v1/socket-test-identity")
        public Map<String, String> identity() { return Map.of("kind", "mxzg-owned-socket-it", "run", RUN_ID); }
    }
    @LocalServerPort int port;
    @Autowired DevelopmentLoginService login;
    @Autowired SessionService sessions;
    @Autowired CampaignService campaign;
    @Autowired JdbcTemplate jdbc;
    private final ObjectMapper json = new ObjectMapper();

    /** 创建本测试专用账号，按真实初始化流程获得背包，不触碰文件数据库。 */
    private DevelopmentLoginService.LoginResult player() {
        var result = login.login("ws_" + UUID.randomUUID().toString().substring(0, 15), "local-1");
        campaign.initialize("Bearer " + result.session().accessToken());
        return result;
    }

    private final class Peer implements WebSocket.Listener, AutoCloseable {
        final HttpClient client = HttpClient.newHttpClient();
        final BlockingQueue<JsonNode> messages = new LinkedBlockingQueue<>();
        final CompletableFuture<Integer> closed = new CompletableFuture<>();
        final StringBuilder fragments = new StringBuilder();
        WebSocket socket;
        String connectionId;

        /** 建立真实本机连接，限定握手等待时间。 */
        Peer() {
            socket = client.newWebSocketBuilder().connectTimeout(Duration.ofSeconds(5))
                .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), this).join();
        }

        /** 开始按帧消费，避免 JDK 客户端背压阻止测试接收。 */
        @Override public void onOpen(WebSocket socket) { socket.request(1); }

        /** 合并分片后解析信封，测试不输出含令牌的请求体。 */
        @Override public CompletionStage<?> onText(WebSocket socket, CharSequence data, boolean last) {
            fragments.append(data);
            if (last) { messages.add(json.readTree(fragments.toString())); fragments.setLength(0); }
            socket.request(1); return null;
        }

        /** 捕获服务端关闭，用于超时和非法帧断言。 */
        @Override public CompletionStage<?> onClose(WebSocket socket, int status, String reason) {
            closed.complete(status); return null;
        }

        /** 传输异常解除等待，而不是测试永久挂起。 */
        @Override public void onError(WebSocket socket, Throwable error) { closed.completeExceptionally(error); }

        /** 发出可关联请求，并确认服务器回显 id；事件测试单独读取队列。 */
        JsonNode request(String name, Object body) throws Exception {
            String id = UUID.randomUUID().toString();
            Map<String, Object> frame = new LinkedHashMap<>(Map.of("version", 1, "kind", "request", "name", name, "id", id, "body", body));
            if (connectionId != null) frame.put("connectionId", connectionId);
            socket.sendText(json.writeValueAsString(frame), true).get(5, TimeUnit.SECONDS);
            JsonNode response = messages.poll(5, TimeUnit.SECONDS);
            assertNotNull(response, "服务端未在期限内响应");
            assertEquals(id, response.path("id").asString());
            assertEquals(name, response.path("name").asString());
            return response;
        }

        /** 完成首帧鉴权，保存本连接标识，但尚不执行恢复同步。 */
        JsonNode authenticate(String token) throws Exception {
            JsonNode response = request("session.authenticate", Map.of("accessToken", token, "clientInstanceId", UUID.randomUUID().toString()));
            if (response.path("ok").asBoolean()) connectionId = response.path("body").path("connectionId").asString();
            return response;
        }

        /** 释放测试 socket 与 HTTP 线程，不在测试间残留连接。 */
        @Override public void close() { socket.abort(); client.close(); }
    }

    /** 未鉴权禁止读背包；正常鉴权后仍须先同步，快照与背包查询完全一致。 */
    @Test void authenticationAndSyncGate() throws Exception {
        var player = player();
        try (var unauthenticated = new Peer()) {
            assertEquals("UNAUTHENTICATED", unauthenticated.request("inventory.list", Map.of()).path("error").path("code").asString());
            assertEquals(1008, unauthenticated.closed.get(5, TimeUnit.SECONDS));
        }
        try (var peer = new Peer()) {
            assertTrue(peer.authenticate(player.session().accessToken()).path("ok").asBoolean());
            assertEquals("NOT_READY", peer.request("inventory.list", Map.of()).path("error").path("code").asString());
            var sync = peer.request("session.sync", Map.of());
            assertTrue(sync.path("ok").asBoolean());
            assertEquals(player.role().id(), sync.path("body").path("role").path("id").asString());
            assertEquals(sync.path("body").path("inventory"), peer.request("inventory.list", Map.of()).path("body"));
            assertTrue(peer.request("session.heartbeat", Map.of()).path("body").path("serverTimeMs").asLong() > 0);
        }
    }

    /** 新令牌接管后，旧连接获顶号事件且旧令牌不能重连或继续 HTTP 访问。 */
    @Test void replacementRevokesOldCredential() throws Exception {
        var player = player();
        try (var old = new Peer(); var replacement = new Peer()) {
            assertTrue(old.authenticate(player.session().accessToken()).path("ok").asBoolean());
            var next = sessions.issue(player.role().id());
            assertTrue(replacement.authenticate(next.accessToken()).path("ok").asBoolean());
            var event = old.messages.poll(5, TimeUnit.SECONDS);
            assertNotNull(event); assertEquals("session.kicked", event.path("name").asString());
            assertEquals(1008, old.closed.get(5, TimeUnit.SECONDS));
            assertThrows(ResponseStatusException.class, () -> sessions.requireRole("Bearer " + player.session().accessToken()));
            try (var rejected = new Peer()) {
                assertEquals("UNAUTHENTICATED", rejected.authenticate(player.session().accessToken()).path("error").path("code").asString());
            }
            assertTrue(replacement.request("session.sync", Map.of()).path("ok").asBoolean());
        }
    }

    /** 普通断线不撤销自身令牌；重连后获取正常战斗领奖产生的最新背包。 */
    @Test void reconnectReadsCommittedInventory() throws Exception {
        var player = player();
        JsonNode initial;
        try (var first = new Peer()) {
            first.authenticate(player.session().accessToken());
            initial = first.request("session.sync", Map.of()).path("body").path("inventory");
        }
        String token = "Bearer " + player.session().accessToken();
        var battle = campaign.challenge(token, UUID.randomUUID().toString());
        assertTrue(battle.won()); campaign.claim(token, battle.id());
        try (var second = new Peer()) {
            assertTrue(second.authenticate(player.session().accessToken()).path("ok").asBoolean());
            var sync = second.request("session.sync", Map.of());
            assertNotEquals(initial, sync.path("body").path("inventory"));
            assertEquals(sync.path("body").path("inventory"), second.request("inventory.list", Map.of()).path("body"));
        }
    }

    /** 已连接令牌过期后下一请求拒绝，不能依靠已鉴权标记永久访问。 */
    @Test void expirationIsCheckedPerRequest() throws Exception {
        var player = player();
        try (var peer = new Peer()) {
            peer.authenticate(player.session().accessToken());
            jdbc.update("UPDATE game_session SET expires_at=TIMESTAMP '2000-01-01 00:00:00' WHERE role_id=?", player.role().id());
            assertEquals("UNAUTHENTICATED", peer.request("session.sync", Map.of()).path("error").path("code").asString());
        }
    }

    /** 旧连接标识、客户端指定角色和未知消息均不能绕过会话边界。 */
    @Test void invalidPayloadAndConnectionAreRejected() throws Exception {
        var player = player();
        try (var peer = new Peer()) {
            peer.authenticate(player.session().accessToken());
            assertEquals("INVALID_MESSAGE", peer.request("session.sync", Map.of("roleId", UUID.randomUUID().toString())).path("error").path("code").asString());
            assertEquals("UNKNOWN_MESSAGE", peer.request("hero.level.upgrade", Map.of()).path("error").path("code").asString());
            peer.connectionId = "obsolete";
            assertEquals("SESSION_REPLACED", peer.request("session.sync", Map.of()).path("error").path("code").asString());
        }
    }

    /** 未发送首帧的空连接自动回收，不占用长期容量。 */
    @Test void unauthenticatedConnectionTimesOut() throws Exception {
        try (var peer = new Peer()) { assertEquals(1008, peer.closed.get(8, TimeUnit.SECONDS)); }
    }

    /** 同一令牌重连可替换残留 socket；旧关闭回调不能删除新在线映射。 */
    @Test void sameCredentialReconnectKeepsReplacementOnline() throws Exception {
        var player = player();
        try (var first = new Peer(); var second = new Peer()) {
            first.authenticate(player.session().accessToken());
            assertTrue(second.authenticate(player.session().accessToken()).path("ok").asBoolean());
            assertEquals(1008, first.closed.get(5, TimeUnit.SECONDS));
            assertTrue(second.request("session.sync", Map.of()).path("ok").asBoolean());
            assertTrue(second.request("inventory.list", Map.of()).path("ok").asBoolean());
        }
    }

    /** 不同角色同时在线且背包各自归属；一次正常奖励不会污染其他账号。 */
    @Test void accountsRemainIsolated() throws Exception {
        var first = player(); var second = player();
        try (var one = new Peer(); var two = new Peer()) {
            one.authenticate(first.session().accessToken()); two.authenticate(second.session().accessToken());
            var before = two.request("session.sync", Map.of()).path("body").path("inventory");
            String token = "Bearer " + first.session().accessToken();
            var battle = campaign.challenge(token, UUID.randomUUID().toString()); campaign.claim(token, battle.id());
            assertTrue(one.request("session.sync", Map.of()).path("ok").asBoolean());
            assertEquals(before, two.request("inventory.list", Map.of()).path("body"));
        }
    }

    /** 重复 JSON 字段不能覆盖消息版本，超大帧由容器/处理器拒绝。 */
    @Test void duplicateFieldsAndOversizedFramesCloseConnection() throws Exception {
        try (var peer = new Peer()) {
            peer.socket.sendText("{\"version\":1,\"version\":2}", true).join();
            assertEquals(1007, peer.closed.get(5, TimeUnit.SECONDS));
        }
        try (var peer = new Peer()) {
            peer.socket.sendText("x".repeat(70000), true).join();
            int status = peer.closed.get(5, TimeUnit.SECONDS);
            assertTrue(status == 1009 || status == 1008);
        }
        try (var peer = new Peer()) {
            // UTF-8 三字节字符不足 64K 个，但总字节已经超限。
            peer.socket.sendText("中".repeat(23000), true).join();
            int status = peer.closed.get(5, TimeUnit.SECONDS);
            assertTrue(status == 1009 || status == 1008);
        }
    }

    /** 浏览器跨来源握手被拒绝，不能因为 HTTP CORS 设置而放开长连接来源。 */
    @Test void foreignOriginIsRejected() {
        try (var client = HttpClient.newHttpClient()) {
            var failure = assertThrows(CompletionException.class, () -> client.newWebSocketBuilder()
                .header("Origin", "https://untrusted.invalid").connectTimeout(Duration.ofSeconds(5))
                .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), new WebSocket.Listener() {}).join());
            assertInstanceOf(WebSocketHandshakeException.class, failure.getCause());
            assertEquals(403, ((WebSocketHandshakeException) failure.getCause()).getResponse().statusCode());
        }
    }

    /** 用真实 TypeScript 账号/背包模块连接本测试服务器，覆盖两端协议字段和恢复流程。 */
    @Test void typescriptLoginAndBagRoundTrip() throws Exception {
        var script = java.nio.file.Path.of("..", "client", "tools", "run-game-socket-live.cjs").toAbsolutePath().normalize();
        var process = new ProcessBuilder("node", script.toString(), Integer.toString(port), RUN_ID).redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(40, TimeUnit.SECONDS), "客户端联调进程超时");
            String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            assertTrue(output.contains("PASS real TS client"), output);
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    /** 原库存 HTTP 路由已退役，默认客户端不能再通过它回退读取。 */
    @Test void inventoryHttpEndpointIsRetired() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var response = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/inventory")).GET().build(), HttpResponse.BodyHandlers.discarding());
            assertEquals(404, response.statusCode());
        }
    }
}
