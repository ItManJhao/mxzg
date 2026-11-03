/** 登录/背包长连接集成测试：随机端口、独立 H2 与合成账号，通过真实 WebSocket 验证会话边界。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.*;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.protocol.GameProtocol;
import java.nio.ByteBuffer;
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
    /** 测试真实接管锁竞争，不使用概率循环掩盖失败。 */
    @Autowired com.funsgamex.mxzg.network.GameSocketHandler handler;
    @Autowired CampaignService campaign;
    @Autowired JdbcTemplate jdbc;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @Autowired com.funsgamex.mxzg.inventory.InventoryService inventory;
    @Autowired com.funsgamex.mxzg.role.RoleRepository roles;
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
        final java.io.ByteArrayOutputStream fragments = new java.io.ByteArrayOutputStream();
        WebSocket socket;
        String connectionId;

        /** 建立真实本机连接，限定握手等待时间。 */
        Peer() {
            socket = client.newWebSocketBuilder().subprotocols(GameProtocolCodec.SUBPROTOCOL).connectTimeout(Duration.ofSeconds(5))
                .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), this).join();
        }

        /** 开始按帧消费，避免 JDK 客户端背压阻止测试接收。 */
        @Override public void onOpen(WebSocket socket) { socket.request(1); }

        /** 合并分片后解析信封，测试不输出含令牌的请求体。 */
        @Override public CompletionStage<?> onBinary(WebSocket socket, ByteBuffer data, boolean last) {
            byte[] part = new byte[data.remaining()]; data.get(part); fragments.writeBytes(part);
            if (last) {
                try { messages.add(GameProtocolCodec.decode(fragments.toByteArray())); }
                catch (Exception error) { closed.completeExceptionally(error); }
                fragments.reset();
            }
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
            socket.sendBinary(ByteBuffer.wrap(GameProtocolCodec.encode(frame)), true).get(5, TimeUnit.SECONDS);
            JsonNode response = messages.poll(5, TimeUnit.SECONDS);
            assertNotNull(response, "服务端未在期限内响应");
            assertEquals(id, response.path("id").asString());
            assertEquals(name, response.path("name").asString());
            return response;
        }

        /** 完成首帧鉴权与统一初始化，保存本连接标识。 */
        JsonNode authenticate(String token) throws Exception {
            JsonNode response = request("session.authenticate", Map.of("accessToken", token, "clientInstanceId", UUID.randomUUID().toString()));
            if (response.path("ok").asBoolean()) connectionId = response.path("body").path("connectionId").asString();
            return response;
        }

        /** 释放测试 socket 与 HTTP 线程，不在测试间残留连接。 */
        @Override public void close() { socket.abort(); client.close(); }
    }

    /** 未鉴权禁止读背包；正常鉴权后仍须先同步，登录首包同时包含角色与背包，不再提供重复查询。 */
    @Test void authenticationAndSyncGate() throws Exception {
        var player=player();
        try(var anonymous=new Peer()) {
            assertFalse(anonymous.request("servers.list",Map.of()).path("body").path("items").isEmpty());
            assertEquals("UNAUTHENTICATED",anonymous.request("inventory.list",Map.of()).path("error").path("code").asString());
        }
        try(var peer=new Peer()) {
            var accepted=peer.authenticate(player.session().accessToken());
            var initial=accepted.path("body").path("initial");
            assertEquals(player.role().id(),initial.path("role").path("id").asString());
            assertTrue(initial.path("revision").isIntegralNumber());
            assertFalse(initial.path("inventory").isEmpty());
            assertEquals("UNKNOWN_MESSAGE",peer.request("inventory.list",Map.of()).path("error").path("code").asString());
            assertEquals("UNKNOWN_MESSAGE",peer.request("session.sync",Map.of()).path("error").path("code").asString());
            assertTrue(peer.request("session.heartbeat",Map.of()).path("ok").asBoolean());
        }
    }
    /** 无事务调用资产入口必须在写入前拒绝，不产生自动提交的孤立资产变化。 */
    @Test void assetsCannotBeWrittenOutsideTransaction() {
        var player=player();var before=inventory.list(player.role().id());long gold=roles.findById(player.role().id()).orElseThrow().gold();
        assertThrows(IllegalStateException.class,()->inventory.credit(player.role().id(),900101,8));
        assertThrows(IllegalStateException.class,()->roles.creditCurrency(player.role().id(),9,0));
        assertEquals(before,inventory.list(player.role().id()));assertEquals(gold,roles.findById(player.role().id()).orElseThrow().gold());
    }

    /** 本地登录同时完成身份交换、角色与背包首包；选服失败不登录。 */
    @Test void loginContainsUnifiedInitialState() throws Exception {
        try(var unavailable=new Peer()) {
            var denied=unavailable.request("session.login",Map.of("account","invalid_world","serverId","missing-world","clientInstanceId",UUID.randomUUID().toString()));
            assertEquals("SERVER_UNAVAILABLE",denied.path("error").path("code").asString());
        }
        try(var peer=new Peer()) {
            var response=peer.request("session.login",Map.of("account","login_"+UUID.randomUUID().toString().substring(0,12),"serverId","local-2","clientInstanceId",UUID.randomUUID().toString()));
            assertTrue(response.path("ok").asBoolean());
            assertEquals("local-2",response.path("body").path("initial").path("role").path("serverId").asString());
            assertTrue(response.path("body").path("initial").path("inventory").isArray());
            assertEquals(43,response.path("body").path("session").path("accessToken").asString().length());
            assertNull(peer.messages.poll(100,TimeUnit.MILLISECONDS),"首包只交付一次");
        }
    }
    /** 同事务多次修改合并一次推送，角色基础资料、钱包与库存同时可见；回滚不推送且版本不增加。 */
    @Test void committedAssetsPushAndRollbackDoesNot() throws Exception {
        var player=player(); String role=player.role().id(); var tx=new org.springframework.transaction.support.TransactionTemplate(transactions);
        try(var peer=new Peer();var other=new Peer()) {
            var initial=peer.authenticate(player.session().accessToken()).path("body").path("initial");
            other.authenticate(player().session().accessToken());
            tx.executeWithoutResult(status->{roles.lock(role);roles.creditCurrency(role,7,3);jdbc.update("UPDATE game_role SET role_experience=66 WHERE id=?",role);inventory.credit(role,900101,5);inventory.credit(role,900101,6);});
            var event=peer.messages.poll(5,TimeUnit.SECONDS);assertNotNull(event);assertEquals("state.changed",event.path("name").asString());
            assertEquals(initial.path("revision").asLong()+1,event.path("body").path("revision").asLong());
            assertEquals(66,event.path("body").path("role").path("basics").path("experience").asLong());
            assertEquals(initial.path("role").path("gold").asLong()+7,event.path("body").path("role").path("gold").asLong());
            assertEquals(inventory.list(role).stream().filter(item->item.itemId()==900101).findFirst().orElseThrow().quantity(),event.path("body").path("inventory").get(0).path("quantity").asLong());
            assertNull(peer.messages.poll(100,TimeUnit.MILLISECONDS));assertNull(other.messages.poll(100,TimeUnit.MILLISECONDS));
            long revision=roles.revision(role);
            tx.executeWithoutResult(status->{roles.lock(role);inventory.credit(role,900101,99);roles.creditCurrency(role,88,0);status.setRollbackOnly();});
            assertEquals(revision,roles.revision(role));assertNull(peer.messages.poll(150,TimeUnit.MILLISECONDS));
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
            assertTrue(replacement.request("session.heartbeat", Map.of()).path("ok").asBoolean());
        }
    }

    /** 普通断线不撤销自身令牌；重连后获取正常战斗领奖产生的最新背包。 */
    @Test void reconnectReadsCommittedInventory() throws Exception {
        var player=player(); String token="Bearer "+player.session().accessToken(); tools.jackson.databind.JsonNode initial;
        try(var first=new Peer()){initial=first.authenticate(player.session().accessToken()).path("body").path("initial");}
        var battle=campaign.challenge(token,UUID.randomUUID().toString());campaign.claim(token,battle.id());
        try(var second=new Peer()) {
            var state=second.authenticate(player.session().accessToken()).path("body").path("initial");
            assertTrue(state.path("revision").asLong()>initial.path("revision").asLong());assertNotEquals(initial.path("inventory"),state.path("inventory"));
        }
    }

    /** 已连接令牌过期后下一请求拒绝，不能依靠已鉴权标记永久访问。 */
    @Test void expirationIsCheckedPerRequest() throws Exception {
        var player = player();
        try (var peer = new Peer()) {
            peer.authenticate(player.session().accessToken());
            jdbc.update("UPDATE game_session SET expires_at=TIMESTAMP '2000-01-01 00:00:00' WHERE role_id=?", player.role().id());
            assertEquals("UNAUTHENTICATED", peer.request("session.heartbeat", Map.of()).path("error").path("code").asString());
        }
    }

    /** 旧连接标识、客户端指定角色和未知消息均不能绕过会话边界。 */
    @Test void invalidPayloadAndConnectionAreRejected() throws Exception {
        var player = player();
        try (var peer = new Peer()) {
            peer.authenticate(player.session().accessToken());
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
        var player=player();try(var first=new Peer();var second=new Peer()) {
            first.authenticate(player.session().accessToken());
            assertTrue(second.authenticate(player.session().accessToken()).path("body").path("initial").isObject());
            assertEquals(1008,first.closed.get(5,TimeUnit.SECONDS));assertTrue(second.request("session.heartbeat",Map.of()).path("ok").asBoolean());
        }
    }

    /** 确定性占住真实角色锁，验证重连等待短暂收尾，超时有界返回 BUSY。 */
    @Test void reconnectWaitsForRoleLockAndTimesOutBoundedly() throws Exception {
        var player=player();
        var access=handler.getClass().getDeclaredMethod("roleLock",String.class);access.setAccessible(true);
        var lock=(java.util.concurrent.locks.ReentrantLock)access.invoke(handler,player.role().id());
        try(var first=new Peer();var second=new Peer();var executor=Executors.newSingleThreadExecutor()) {
            assertTrue(first.authenticate(player.session().accessToken()).path("ok").asBoolean());
            lock.lock();Future<JsonNode> response;
            try {
                response=executor.submit(()->second.authenticate(player.session().accessToken()));
                long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(1);
                while(!lock.hasQueuedThreads() && !response.isDone() && System.nanoTime()<deadline)Thread.sleep(5);
                assertTrue(lock.hasQueuedThreads(),"重连接管应有界等待角色锁，不能立即返回 BUSY");
            } finally {lock.unlock();}
            assertTrue(response.get(5,TimeUnit.SECONDS).path("ok").asBoolean());
            assertEquals(1008,first.closed.get(5,TimeUnit.SECONDS));
            assertTrue(second.request("session.heartbeat",Map.of()).path("ok").asBoolean());
            try(var third=new Peer()) {
                lock.lock();
                try {
                    var busy=executor.submit(()->third.authenticate(player.session().accessToken())).get(4,TimeUnit.SECONDS);
                    assertEquals("BUSY",busy.path("error").path("code").asString());
                } finally {lock.unlock();}
                assertTrue(second.request("session.heartbeat",Map.of()).path("ok").asBoolean(),"失败接管不影响现有连接");
            }
        }
    }

    /** 不同角色同时在线且背包各自归属；一次正常奖励不会污染其他账号。 */
    @Test void accountsRemainIsolated() throws Exception {
        var first=player();var second=player();try(var one=new Peer();var two=new Peer()) {
            one.authenticate(first.session().accessToken());two.authenticate(second.session().accessToken());
            String token="Bearer "+first.session().accessToken();var battle=campaign.challenge(token,UUID.randomUUID().toString());campaign.claim(token,battle.id());
            var event=one.messages.poll(5,TimeUnit.SECONDS);assertNotNull(event);assertEquals(first.role().id(),event.path("body").path("role").path("id").asString());
            assertNull(two.messages.poll(150,TimeUnit.MILLISECONDS));
        }
    }

    /** 文本、截断二进制和超限帧均拒绝，不回退 JSON。 */
    @Test void malformedAndOversizedBinaryFramesCloseConnection() throws Exception {
        try (var peer = new Peer()) {
            peer.socket.sendText("{\"version\":1}", true).join();
            assertEquals(1003, peer.closed.get(5, TimeUnit.SECONDS));
        }
        try (var peer = new Peer()) {
            peer.socket.sendBinary(ByteBuffer.wrap(new byte[]{10, 127}), true).join();
            assertEquals(1007, peer.closed.get(5, TimeUnit.SECONDS));
        }
        try (var peer = new Peer()) {
            peer.socket.sendBinary(ByteBuffer.wrap(new byte[70000]), true).join();
            int status = peer.closed.get(5, TimeUnit.SECONDS);
            assertTrue(status == 1009 || status == 1008);
        }
    }

    /** 消息名与载荷不一致时拒绝；客户端不能给同步请求塞入角色选择或鉴权数据。 */
    @Test void mismatchedPayloadClosesConnection() throws Exception {
        try (var peer = new Peer()) {
            var frame = GameProtocol.Frame.newBuilder().setVersion(1).setKind("request")
                .setName("session.sync").setId(UUID.randomUUID().toString())
                .setAuthenticate(GameProtocol.Authenticate.newBuilder().setAccessToken("a".repeat(43)).setClientInstanceId(UUID.randomUUID().toString())).build();
            peer.socket.sendBinary(ByteBuffer.wrap(frame.toByteArray()), true).join();
            assertEquals(1007, peer.closed.get(5, TimeUnit.SECONDS));
        }
    }

    /** 未声明二进制子协议的旧客户端不能继续收发 JSON。 */
    @Test void missingSubprotocolCannotUseEndpoint() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var closed = new CompletableFuture<Integer>();
            var socket = client.newWebSocketBuilder().buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"),
                new WebSocket.Listener() {
                    @Override public CompletionStage<?> onClose(WebSocket ws, int status, String reason) { closed.complete(status); return null; }
                }).join();
            try { assertEquals(1008, closed.get(5, TimeUnit.SECONDS)); } finally { socket.abort(); }
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
