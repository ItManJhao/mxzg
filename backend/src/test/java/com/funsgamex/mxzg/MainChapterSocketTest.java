/** 主线挑战、登录恢复与结算真实WebSocket回归：独立H2、随机端口，不修改日常玩家库。 */
package com.funsgamex.mxzg;
import com.funsgamex.mxzg.auth.*;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import java.nio.ByteBuffer;
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
import tools.jackson.databind.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:chapter_socket;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"})
@ActiveProfiles("local")
class MainChapterSocketTest {
    /** 本测试专属随机端口。 */
    @LocalServerPort int port;
    /** 合成角色入口，只连接隔离数据库。 */
    @Autowired DevelopmentLoginService login;
    /** 用于准备测试英雄及检查只读边界。 */
    @Autowired JdbcTemplate jdbc;
    private final class Peer implements WebSocket.Listener, AutoCloseable {
        final HttpClient client = HttpClient.newHttpClient();
        final BlockingQueue<JsonNode> messages = new LinkedBlockingQueue<>();
        /** 请求等待期间先到的提交事件单独保存，模拟真实客户端按kind路由。 */
        final BlockingQueue<JsonNode> events = new LinkedBlockingQueue<>();
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
            while (response != null && response.path("kind").asString().equals("event")) {
                events.add(response);
                response = messages.poll(5, TimeUnit.SECONDS);
            }
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


    /** 真实协议跑通三关、重新鉴权恢复待领奖、幂等结算与版本事件，不访问日常库。 */
    @Test void challengeRestoreReplayAndClaimThroughBinarySocket() throws Exception {
        var player = login.login("test_" + UUID.randomUUID().toString().substring(0, 12));
        String role = player.role().id();
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,100,1)", hero, role);
        String token = player.session().accessToken();
        try (var peer = new Peer()) {
            var init = peer.authenticate(token);
            assertEquals(0, init.path("body").path("initial").path("mainChapter").path("maxCleared").asInt());
            long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, role);
            assertTrue(peer.request("formation.save", Map.of("requestId", UUID.randomUUID().toString(),
                "expectedVersion", version, "formationId", 1, "slots", List.of(Map.of("position", 2, "heroId", hero))))
                .path("ok").asBoolean());
        }
        for (int mission = 1; mission <= 3; mission++) {
            String command = UUID.randomUUID().toString();
            String battle;
            JsonNode original;
            long gold = jdbc.queryForObject("SELECT gold FROM game_role WHERE id=?", Long.class, role);
            try (var peer = new Peer()) {
                assertTrue(peer.authenticate(token).path("ok").asBoolean());
                original = peer.request("chapter.challenge", Map.of("requestId", command));
                assertTrue(original.path("ok").asBoolean(), original.toString());
                assertEquals("BATTLE", original.path("body").path("action").asString());
                battle = original.path("body").path("battleId").asString();
                assertEquals(mission, original.path("body").path("state").path("maxCleared").asInt());
                assertEquals(gold, jdbc.queryForObject("SELECT gold FROM game_role WHERE id=?", Long.class, role));
                assertEquals(original.path("body"), peer.request("chapter.challenge", Map.of("requestId", command)).path("body"));
                assertTrue(peer.events.stream().anyMatch(e -> e.path("body").path("mainChapter").path("pendingBattleId").asString().equals(battle)));
            }
            try (var peer = new Peer()) {
                var restored = peer.authenticate(token);
                assertEquals(battle, restored.path("body").path("initial").path("mainChapter").path("pendingBattleId").asString());
                write("restore-" + mission, restored);
                var replay = peer.request("chapter.replay", Map.of("battleId", battle));
                assertTrue(replay.path("ok").asBoolean(), replay.toString());
                assertEquals("chapter:lineup:" + mission, replay.path("body").path("replay").path("scenario").asString());
                assertEquals("ATTACKER_WIN", replay.path("body").path("replay").path("outcome").asString());
                write("replay-" + mission, replay);
                var claim = peer.request("chapter.claim", Map.of("battleId", battle));
                assertTrue(claim.path("ok").asBoolean(), claim.toString());
                assertFalse(claim.path("body").path("rewards").isEmpty());
                var roleAfter = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role);
                var idleReport = peer.request("chapter.idle.encounter", Map.of());
                assertTrue(idleReport.path("ok").asBoolean(), idleReport.toString());
                assertEquals("idle:chapter:" + mission, idleReport.path("body").path("replay").path("scenario").asString());
                assertEquals(roleAfter, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role), "遇敌不发奖");
                assertEquals(claim.path("body"), peer.request("chapter.claim", Map.of("battleId", battle)).path("body"));
                assertEquals(roleAfter, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role));
                // 旧挑战回执仍是原战报，不能再次变成领奖，更不能重打。
                assertEquals(original.path("body"), peer.request("chapter.challenge", Map.of("requestId", command)).path("body"));
                assertEquals(replay.path("body"), peer.request("chapter.replay", Map.of("battleId", battle)).path("body"));
                var event = peer.events.stream().filter(e -> e.path("body").path("mainChapter").path("maxCleared").asInt() == missionNumber(claim)
                    && !e.path("body").path("mainChapter").has("pendingBattleId")).findFirst().orElseThrow();
                assertEquals(event.path("body").path("revision").asLong(), event.path("body").path("mainChapter").path("assetRevision").asLong());
                write("claimed-" + mission, event);
                write("receipt-" + mission, claim);
                var stranger = login.login("test_" + UUID.randomUUID().toString().substring(0, 12));
                try (var other = new Peer()) {
                    assertTrue(other.authenticate(stranger.session().accessToken()).path("ok").asBoolean());
                    assertEquals("CHAPTER_UNAVAILABLE", other.request("chapter.replay", Map.of("battleId", battle)).path("error").path("code").asString());
                    assertEquals("CHAPTER_UNAVAILABLE", other.request("chapter.claim", Map.of("battleId", battle)).path("error").path("code").asString());
                    assertTrue(other.request("session.heartbeat", Map.of()).path("ok").asBoolean());
                }
            }
        }
        try (var peer = new Peer()) {
            var init = peer.authenticate(token);
            assertEquals(3, init.path("body").path("initial").path("mainChapter").path("maxCleared").asInt());
            assertFalse(init.path("body").path("initial").path("mainChapter").has("pendingBattleId"));
            assertEquals("CHAPTER_UNAVAILABLE", peer.request("chapter.challenge", Map.of("requestId", UUID.randomUUID().toString())).path("error").path("code").asString());
        }
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_battle WHERE role_id=?", Integer.class, role));
    }

    /** 真实弱队败北后重连和重战，再换混合阵容获胜；核对两种结果的资产与待领奖边界。 */
    @Test void defeatReconnectRetryThenMixedVictory() throws Exception {
        var player = login.login("test_" + UUID.randomUUID().toString().substring(0, 12));
        String role = player.role().id();
        String token = player.session().accessToken();
        String first = UUID.randomUUID().toString();
        String second = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,1,1)", first, role);
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10104004,1,1)", second, role);
        // 独立夹具直接准备第三关进度，战斗和后续重试全部经过真实二进制协议。
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,2)", role);
        String command = UUID.randomUUID().toString();
        JsonNode original;
        JsonNode replay;
        Map<String, Object> before;
        try (var peer = new Peer()) {
            assertTrue(peer.authenticate(token).path("ok").asBoolean());
            long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, role);
            assertTrue(peer.request("formation.save", Map.of("requestId", UUID.randomUUID().toString(),
                "expectedVersion", version, "formationId", 1, "slots", List.of(
                    Map.of("position", 2, "heroId", first))))
                .path("ok").asBoolean());
            before = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role);
            original = peer.request("chapter.challenge", Map.of("requestId", command));
            assertTrue(original.path("ok").asBoolean(), original.toString());
            replay = peer.request("chapter.replay", Map.of("battleId", original.path("body").path("battleId").asString()));
            assertTrue(replay.path("ok").asBoolean(), replay.toString());
            assertNotEquals("ATTACKER_WIN", replay.path("body").path("replay").path("outcome").asString());
            assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role));
        }
        try (var peer = new Peer()) {
            var restored = peer.authenticate(token).path("body").path("initial").path("mainChapter");
            assertEquals(2, restored.path("maxCleared").asInt());
            assertFalse(restored.has("pendingBattleId"));
            assertEquals(original.path("body"), peer.request("chapter.challenge", Map.of("requestId", command)).path("body"));
            String battle = original.path("body").path("battleId").asString();
            assertEquals(replay.path("body"), peer.request("chapter.replay", Map.of("battleId", battle)).path("body"));
            var claim = peer.request("chapter.claim", Map.of("battleId", battle));
            assertTrue(claim.path("ok").asBoolean(), claim.toString());
            assertTrue(claim.path("body").path("rewards").isEmpty());
            var retried = peer.request("chapter.challenge", Map.of("requestId", UUID.randomUUID().toString()));
            assertTrue(retried.path("ok").asBoolean(), retried.toString());
            assertNotEquals(battle, retried.path("body").path("battleId").asString());
            assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role));
            assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_battle WHERE role_id=?", Integer.class, role));
            // 此测试验证协议胜利闭环，不验证一级混合队伍胜率；明确强化隔离夹具，避免随机命中造成偶发失败。
            jdbc.update("UPDATE game_hero SET hero_level=100 WHERE role_id=?", role);
            long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, role);
            assertTrue(peer.request("formation.save", Map.of("requestId", UUID.randomUUID().toString(),
                "expectedVersion", version, "formationId", 1, "slots", List.of(
                    Map.of("position", 2, "heroId", first), Map.of("position", 3, "heroId", second))))
                .path("ok").asBoolean());
            var mixed = peer.request("chapter.challenge", Map.of("requestId", UUID.randomUUID().toString()));
            assertTrue(mixed.path("ok").asBoolean(), mixed.toString());
            assertEquals(3, mixed.path("body").path("state").path("maxCleared").asInt());
            assertEquals(mixed.path("body").path("battleId"), mixed.path("body").path("state").path("pendingBattleId"));
            assertEquals(before.get("gold"), jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role).get("gold"));
        }
    }

    /** 从回执提取已完成关卡，仅供事件断言。 */
    private int missionNumber(JsonNode claim) { return claim.path("body").path("state").path("maxCleared").asInt(); }

    /** 输出真实二进制供客户端跨语言解码，不包含令牌。 */
    private void write(String name, JsonNode frame) throws Exception {
        java.nio.file.Files.write(java.nio.file.Path.of("target/chapter-" + name + ".pb"), GameProtocolCodec.encode(frame));
    }
}
