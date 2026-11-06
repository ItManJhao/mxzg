/** 开发阵容试战真实WebSocket回归：独立H2、随机端口，不修改日常玩家库。 */
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
    "spring.datasource.url=jdbc:h2:mem:battle_socket;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=true"})
@ActiveProfiles("local")
class GameBattlePreviewSocketTest {
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


    /** 通过真实鉴权、保存和试战协议跑前三关，确认版本及数据库不发生变化。 */
    @Test void savedLineupReturnsTypedReplayWithoutAssetEvents() throws Exception {
        var player = login.login("test_" + UUID.randomUUID().toString().substring(0, 12));
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,1,1)", hero, player.role().id());
        try (var peer = new Peer()) {
            assertTrue(peer.authenticate(player.session().accessToken()).path("ok").asBoolean());
            assertEquals("BATTLE_EMPTY", peer.request("battle.preview", Map.of("mission", 1)).path("error").path("code").asString());
            long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, player.role().id());
            assertTrue(peer.request("formation.save", Map.of("requestId", UUID.randomUUID().toString(),
                "expectedVersion", version, "formationId", 1, "slots", List.of(Map.of("position", 5, "heroId", hero))))
                .path("ok").asBoolean());
            peer.events.clear();
            var before = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", player.role().id());
            for (int mission = 1; mission <= 3; mission++) {
                var response = peer.request("battle.preview", Map.of("mission", mission));
                assertTrue(response.path("ok").asBoolean(), response.toString());
                java.nio.file.Files.write(java.nio.file.Path.of("target/lineup-preview-" + mission + ".pb"), GameProtocolCodec.encode(response));
                var body = response.path("body");
                assertEquals(mission, body.path("mission").asInt());
                assertEquals(version + 1, body.path("lineupVersion").asLong());
                assertFalse(body.path("pending").isEmpty());
                assertEquals("audit:lineup:" + mission, body.path("replay").path("scenario").asString());
                assertEquals(5, body.path("replay").path("units").get(0).path("position").asInt());
                assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", player.role().id()));
                assertTrue(peer.events.isEmpty(), "试战不推送资产变化");
            }
            assertEquals("BATTLE_INVALID", peer.request("battle.preview", Map.of("mission", 4)).path("error").path("code").asString());
        }
    }

    /** 魅惑之拥通过真实协议返回完整战报；保留普攻与破甲事件，不写角色或英雄。 */
    @Test void charmPreviewUsesRealSocketAndKeepsAssets() throws Exception {
        var player = login.login("test_" + UUID.randomUUID().toString().substring(0, 12));
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10105011,1,5)", hero, player.role().id());
        try (var peer = new Peer()) {
            assertTrue(peer.authenticate(player.session().accessToken()).path("ok").asBoolean());
            long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, player.role().id());
            assertTrue(peer.request("formation.save", Map.of("requestId", UUID.randomUUID().toString(),
                "expectedVersion", version, "formationId", 1, "slots", List.of(Map.of("position", 2, "heroId", hero))))
                .path("ok").asBoolean());
            var roleBefore = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", player.role().id());
            var heroBefore = jdbc.queryForMap("SELECT * FROM game_hero WHERE id=?", hero);
            var response = peer.request("battle.preview", Map.of("mission", 3));
            assertTrue(response.path("ok").asBoolean());
            assertEquals(10105011, response.path("body").path("replay").path("units").get(0).path("templateId").asInt());
            assertEquals(roleBefore, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", player.role().id()));
            assertEquals(heroBefore, jdbc.queryForMap("SELECT * FROM game_hero WHERE id=?", hero));
            java.nio.file.Files.write(java.nio.file.Path.of("target/lineup-preview-charm.pb"), GameProtocolCodec.encode(response));
        }
    }

    /** 保存魅惑之拥与奈奈子的真实混合阵容，逐关验证试战返回和全部持久业务状态。 */
    @Test void mixedLineupPlaysThreeMissionsWithoutSettlementWrites() throws Exception {
        var player = login.login("test_" + UUID.randomUUID().toString().substring(0, 12));
        String roleId = player.role().id();
        String charm = UUID.randomUUID().toString();
        String nanako = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,50,9,3)",
            charm, roleId);
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10205023,80,7,5)",
            nanako, roleId);
        try (var peer = new Peer()) {
            assertTrue(peer.authenticate(player.session().accessToken()).path("ok").asBoolean());
            long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, roleId);
            var save = peer.request("formation.save", Map.of("requestId", UUID.randomUUID().toString(),
                "expectedVersion", version, "formationId", 1,
                "slots", List.of(Map.of("position", 2, "heroId", charm), Map.of("position", 5, "heroId", nanako))));
            assertTrue(save.path("ok").asBoolean(), save.toString());
            peer.events.clear();
            // 明确使用已推进的进度，证明试战既不会重置旧进度也不会发奖。
            jdbc.update("MERGE INTO game_campaign(role_id,initialized,stage_id,role_exp) KEY(role_id) VALUES (?,TRUE,2,75)", roleId);
            var before = mixedPreviewState(roleId);
            long revision = ((Number) before.get("role").getFirst().get("state_revision")).longValue();
            for (int mission : List.of(1, 2, 3, 3)) {
                var response = peer.request("battle.preview", Map.of("mission", mission));
                assertTrue(response.path("ok").asBoolean(), response.toString());
                var body = response.path("body");
                var replay = body.path("replay");
                assertEquals(mission, body.path("mission").asInt());
                assertEquals(version + 1, body.path("lineupVersion").asLong());
                assertEquals(revision, body.path("assetRevision").asLong());
                assertEquals("audit:lineup:" + mission, replay.path("scenario").asString());
                assertEquals("ATTACKER_WIN", replay.path("outcome").asString());
                var units = replay.path("units");
                assertEquals(mission == 3 ? 4 : 3, units.size());
                assertEquals(10105011, units.get(0).path("templateId").asInt());
                assertEquals(2, units.get(0).path("unitId").asInt());
                assertEquals(10205023, units.get(1).path("templateId").asInt());
                assertEquals(5, units.get(1).path("unitId").asInt());
                for (int index = 2; index < units.size(); index++) {
                    assertEquals(0, units.get(index).path("finalHp").asLong());
                }
                var events = new ArrayList<JsonNode>();
                replay.path("phases").forEach(phase -> phase.path("events").forEach(events::add));
                assertEquals(units.size() - 2, countBuff(events, "buff.upsert", 1113103));
                assertEquals(units.size() - 2, countBuff(events, "buff.remove", 1113103));
                assertEquals(units.size() - 3, countBuff(events, "buff.upsert", 1113203));
                assertTrue(events.stream().anyMatch(event -> event.path("kind").asString().equals("buff.upsert")
                    && event.path("sourceId").asInt() == 5), "奈奈子真实入场技能必须进入战报");
                assertEquals(before, mixedPreviewState(roleId));
                assertTrue(peer.events.isEmpty(), "只读试战不得推送资产变化");
                java.nio.file.Files.write(java.nio.file.Path.of("target/lineup-mixed-" + mission + ".pb"),
                    GameProtocolCodec.encode(response));
            }
        }
    }

    /** 按配置ID统计真实回包中的监听或增益生命周期事件。 */
    private static long countBuff(List<JsonNode> events, String kind, int configId) {
        return events.stream().filter(event -> event.path("kind").asString().equals(kind)
            && event.path("configId").asInt() == configId).count();
    }

    /** 对比角色资产版本、英雄、库存、阵容、关卡与通关凭据。各表按主键排序。 */
    private Map<String, List<Map<String, Object>>> mixedPreviewState(String roleId) {
        var state = new LinkedHashMap<String, List<Map<String, Object>>>();
        state.put("role", jdbc.queryForList("SELECT * FROM game_role WHERE id=?", roleId));
        state.put("heroes", jdbc.queryForList("SELECT * FROM game_hero WHERE role_id=? ORDER BY id", roleId));
        state.put("inventory", jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=? ORDER BY item_id", roleId));
        state.put("timed", jdbc.queryForList("SELECT * FROM game_timed_inventory WHERE role_id=? ORDER BY instance_id", roleId));
        state.put("lineup", jdbc.queryForList("SELECT * FROM game_lineup_slot WHERE role_id=? ORDER BY position", roleId));
        state.put("unlocks", jdbc.queryForList("SELECT * FROM game_formation_unlock WHERE role_id=? ORDER BY formation_id", roleId));
        state.put("campaign", jdbc.queryForList("SELECT * FROM game_campaign WHERE role_id=?", roleId));
        state.put("battle", jdbc.queryForList("SELECT * FROM game_battle WHERE role_id=? ORDER BY id", roleId));
        return state;
    }

    /** 未鉴权不得试战；合法账号的未支持技能明确拒绝而非网络请求失败。 */
    @Test void unauthorizedAndUnsupportedAreRejected() throws Exception {
        try (var peer = new Peer()) {
            assertFalse(peer.request("battle.preview", Map.of("mission", 1)).path("ok").asBoolean());
        }
        var player = login.login("test_" + UUID.randomUUID().toString().substring(0, 12));
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10105008,1,10)", hero, player.role().id());
        try (var peer = new Peer()) {
            peer.authenticate(player.session().accessToken());
            long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, player.role().id());
            peer.request("formation.save", Map.of("requestId", UUID.randomUUID().toString(), "expectedVersion", version,
                "formationId", 1, "slots", List.of(Map.of("position", 2, "heroId", hero))));
            assertEquals("BATTLE_UNSUPPORTED", peer.request("battle.preview", Map.of("mission", 1)).path("error").path("code").asString());
        }
    }
}
