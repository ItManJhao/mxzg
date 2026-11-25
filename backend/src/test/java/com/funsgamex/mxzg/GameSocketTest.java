/** 游戏长连接集成测试：随机端口、独立 H2 与合成账号，验证会话、资产和已开放玩法的真实 Protobuf 往返。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.*;
import com.funsgamex.mxzg.dungeon.DailyDungeonType;
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
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"})
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
    /** 用真实英雄发放事务准备个人空间的图鉴解锁。 */
    @Autowired com.funsgamex.mxzg.hero.HeroGrantService heroGrants;
    /** 用正常保存接口准备独立副本测试阵容，供历史最高战力门槛读取。 */
    @Autowired com.funsgamex.mxzg.lineup.MainFormationCommandService formations;
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

        /** 在当前连接上等一次指定的提交通知，容许它先于或晚于操作回包。 */
        JsonNode event(String name) throws InterruptedException {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (System.nanoTime() < deadline) {
                var event = events.poll();
                if (event == null) {
                    event = messages.poll(Math.max(1, deadline - System.nanoTime()), TimeUnit.NANOSECONDS);
                }
                if (event != null && event.path("name").asString().equals(name)) {
                    return event;
                }
            }
            throw new AssertionError("没有收到 " + name);
        }

        /** 在同一超时内读取资产操作的下一帧。任务进度可以交错，其他事件仍由调用方严格核对。 */
        JsonNode pollAssetOperation(long timeout, TimeUnit unit) throws InterruptedException {
            long deadline = System.nanoTime() + unit.toNanos(timeout);
            while (System.nanoTime() < deadline) {
                var frame = events.poll();
                if (frame == null) {
                    frame = messages.poll(Math.max(1, deadline - System.nanoTime()), TimeUnit.NANOSECONDS);
                }
                if (frame == null) {
                    return null;
                }
                assertEquals("event", frame.path("kind").asString());
                assertEquals(connectionId, frame.path("connectionId").asString());
                if (!"quest.changed".equals(frame.path("name").asString())) {
                    return frame;
                }
                assertTrue(frame.path("body").path("completed").isArray());
            }
            return null;
        }

        /** 释放测试 socket 与 HTTP 线程，不在测试间残留连接。 */
        @Override public void close() { socket.abort(); client.close(); }
    }

    /** 两个真实连接接收好友关系和赠礼通知，再通过统一背包资产实际领取。 */
    @Test
    void friendsSynchronizeAcrossAuthenticatedConnections() throws Exception {
        var first = player();
        var second = player();
        String firstId = first.role().id();
        String secondId = second.role().id();
        String targetName = "联机好友" + secondId.substring(0, 6);
        jdbc.update("UPDATE game_role SET nickname=?,first_named=TRUE WHERE id=?", targetName, secondId);

        try (var requester = new Peer(); var recipient = new Peer()) {
            assertTrue(requester.authenticate(first.session().accessToken()).path("ok").asBoolean());
            assertTrue(recipient.authenticate(second.session().accessToken()).path("ok").asBoolean());
            var search = requester.request("friend.search", Map.of("query", " " + targetName + " "));
            assertTrue(search.path("ok").asBoolean());
            assertEquals(targetName, search.path("body").path("query").asString());
            assertEquals(secondId, search.path("body").path("entries").path(0).path("roleId").asString());

            friendAction(requester, "APPLY", secondId, 0);
            recipient.event("friend.changed");
            requester.event("friend.changed");
            var pending = recipient.request("friend.state", Map.of()).path("body");
            assertEquals(firstId, pending.path("applications").path(0).path("roleId").asString());
            var accepted = friendAction(recipient, "ACCEPT", firstId, 0);
            assertEquals(firstId, accepted.path("state").path("friends").path(0).path("roleId").asString());
            requester.event("friend.changed");
            recipient.event("friend.changed");

            long resetAt = accepted.path("state").path("resetAt").asLong();
            var sent = friendAction(requester, "SEND", secondId, resetAt);
            assertEquals("TIPS", sent.path("notice").path("mode").asString());
            recipient.event("friend.changed");
            var gift = recipient.request("friend.state", Map.of()).path("body").path("gifts").path(0);
            assertEquals(firstId, gift.path("roleId").asString());
            var claim = friendAction(recipient, "CLAIM", firstId, resetAt);
            assertEquals(10, claim.path("state").path("friendship").asLong());
            assertEquals("TIPS", claim.path("notice").path("mode").asString());
            assertTrue(claim.path("state").path("gifts").isEmpty());
        }
    }

    /** 发起单目标好友动作，核对业务请求编号随真实二进制响应原样返回。 */
    private JsonNode friendAction(Peer peer, String action, String targetId, long resetAt) throws Exception {
        String requestId = UUID.randomUUID().toString();
        var response = peer.request("friend.change", Map.of("requestId", requestId, "action", action,
                "targetId", targetId, "resetAt", resetAt));
        assertTrue(response.path("ok").asBoolean(), () -> response.path("error").path("code").asString());
        assertEquals(requestId, response.path("body").path("requestId").asString());
        return response.path("body");
    }

    /** 两个隔离账号通过真实二进制连接保存防守、匹配挑战并核对双方记录和排行。 */
    @Test
    void arenaPlayersUseDefenseAndShareCommittedReplay() throws Exception {
        String server = "arena-test-" + UUID.randomUUID().toString().substring(0, 8);
        jdbc.update("INSERT INTO game_server(id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)",
                server, "local", "测试区", "竞技场隔离服");
        jdbc.update("INSERT INTO game_role_public_sequence(server_id) VALUES (?)", server);
        var attacker = arenaPlayer(server);
        var defender = arenaPlayer(server);
        String attackerId = attacker.role().id();
        String defenderId = defender.role().id();
        arenaFormation(attacker, 10104004, 100, 4);
        String defendingHero = arenaFormation(defender, 10101001, 1, 1);
        try (var first = new Peer(); var second = new Peer()) {
            assertTrue(first.authenticate(attacker.session().accessToken()).path("ok").asBoolean());
            assertTrue(second.authenticate(defender.session().accessToken()).path("ok").asBoolean());
            assertTrue(arenaBody(first, "arena.state", Map.of()).path("newcomerActive").asBoolean());
            assertTrue(arenaBody(second, "arena.defense", Map.of()).path("fallback").asBoolean());
            String editId = UUID.randomUUID().toString();
            var defense = arenaBody(second, "arena.defense.save", Map.of("requestId", editId, "expectedVersion", 0,
                    "formationId", 1, "slots", List.of(Map.of("position", 5, "heroId", defendingHero))));
            assertEquals(editId, defense.path("requestId").asString());
            assertEquals(1, defense.path("defense").path("version").asLong());
            assertFalse(defense.path("defense").path("fallback").asBoolean());

            jdbc.update("UPDATE game_arena_progress SET robot_wins=5,settled_challenges=5,opponents='' WHERE role_id=?",
                    attackerId);
            var renewed = arenaBody(first, "arena.refresh", Map.of());
            assertFalse(renewed.path("newcomerActive").asBoolean());
            assertTrue(renewed.path("opponents").valueStream().anyMatch(row -> defenderId.equals(row.path("roleId").asString())));
            String requestId = UUID.randomUUID().toString();
            var challenge = Map.of("requestId", requestId, "opponentId", 0, "opponentRoleId", defenderId);
            var result = arenaBody(first, "arena.challenge", challenge);
            var summary = result.path("record");
            assertTrue(summary.path("won").asBoolean());
            assertEquals(defenderId, summary.path("opponentRoleId").asString());
            assertEquals("arena:pvp:" + defenderId, result.path("replay").path("scenario").asString());
            second.event("state.changed");
            var defenseHistory = arenaBody(second, "arena.state", Map.of()).path("history").path(0);
            assertEquals(attackerId, defenseHistory.path("opponentRoleId").asString());
            assertTrue(defenseHistory.path("defense").asBoolean());
            assertFalse(defenseHistory.path("won").asBoolean());
            assertEquals(-10, defenseHistory.path("scoreDelta").asInt());
            assertEquals(summary.path("battleId"), defenseHistory.path("battleId"));
            assertEquals(result.path("replay"), arenaBody(second, "arena.replay",
                    Map.of("battleId", summary.path("battleId").asString())));
            assertEquals(result, arenaBody(first, "arena.challenge", challenge));
            assertEquals(1010, arenaBody(first, "arena.ranking", Map.of()).path("own").path("score").asInt());
            assertFalse(arenaBody(first, "arena.season", Map.of()).path("chests").isEmpty());
        }
    }

    /** 建立隔离区服的角色，复用登录及主线初始化来生成同真实连接一致的持久状态。 */
    private DevelopmentLoginService.LoginResult arenaPlayer(String server) {
        var result = login.login("arena_" + UUID.randomUUID().toString().substring(0, 12), server);
        campaign.initialize("Bearer " + result.session().accessToken());
        return result;
    }

    /** 给隔离测试账号保存真实主阵，场内数据仍由竞技场服务读取持久记录。 */
    private String arenaFormation(DevelopmentLoginService.LoginResult player, int template, int level, int star) {
        String role = player.role().id();
        String hero = UUID.randomUUID().toString();
        jdbc.update("UPDATE game_role SET role_level=18 WHERE id=?", role);
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,0)",
                hero, role, template, level, star);
        long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, role);
        formations.save("Bearer " + player.session().accessToken(), new com.funsgamex.mxzg.lineup.MainFormationCommandService.Save(
                UUID.randomUUID().toString(), version, 1, List.of(new com.funsgamex.mxzg.lineup.Lineup.Slot(2, hero))));
        return hero;
    }

    /** 核对业务成功并返回 Protobuf 解码后的类型化载荷，不在断言日志打印凭证。 */
    private JsonNode arenaBody(Peer peer, String name, Map<String, ?> body) throws Exception {
        var response = peer.request(name, body);
        assertTrue(response.path("ok").asBoolean(), () -> response.path("error").path("code").asString());
        return response.path("body");
    }

    /** 真实长连接保存、重试和重连，资产快照可与独立任务进度事件交错。 */
    @Test
    void formationSaveSynchronizesAndRecovers() throws Exception {
        var player = player();
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10105008,1,5)",
                hero, player.role().id());
        long expected = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?",
                Long.class, player.role().id());
        var body = Map.of("requestId", UUID.randomUUID().toString(), "expectedVersion", expected,
                "formationId", 1, "slots", List.of(Map.of("position", 2, "heroId", hero)));
        try (var peer = new Peer()) {
            peer.authenticate(player.session().accessToken());
            var result = peer.request("formation.save", body);
            assertTrue(result.path("ok").asBoolean(), () -> result.path("error").path("code").asString());
            assertEquals(expected + 1, result.path("body").path("version").asLong());
            var changed = peer.pollAssetOperation(5, TimeUnit.SECONDS);
            assertNotNull(changed);
            assertEquals("state.changed", changed.path("name").asString());
            assertEquals(hero, changed.path("body").path("mainFormation").path("slots").get(0).path("heroId").asString());
            assertTrue(peer.request("formation.save", body).path("ok").asBoolean());
        }
        try (var peer = new Peer()) {
            var restored = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            assertEquals(expected + 1, restored.path("mainFormation").path("version").asLong());
            assertFalse(restored.path("mainFormation").path("options").isEmpty());
        }
    }

    /** 真实连接评分未保存草稿，校验原编号、空队伍、所有权和请求后原阵容仍为空。 */
    @Test
    void formationDraftPowerUsesOnlyOwnedHeroesWithoutWriting() throws Exception {
        var owner = login.login("draft_" + UUID.randomUUID().toString().substring(0, 12), "local-1");
        var other = login.login("draft_" + UUID.randomUUID().toString().substring(0, 12), "local-1");
        String ownerId = owner.role().id();
        var tx = new org.springframework.transaction.support.TransactionTemplate(transactions);
        var draft = tx.execute(status -> List.of(heroGrants.grant(ownerId, 10304004, 1).getFirst().instanceId(),
            heroGrants.grant(ownerId, 10304012, 1).getFirst().instanceId()));
        String foreign = tx.execute(status -> heroGrants.grant(other.role().id(), 10101001, 1).getFirst().instanceId());
        String token = owner.session().accessToken();
        try (var peer = new Peer()) {
            var initial = peer.authenticate(token).path("body").path("initial");
            long revision = initial.path("revision").asLong();
            int individualTotal = initial.path("heroes").valueStream()
                .mapToInt(hero -> hero.path("panelStats").path("power").asInt()).sum();
            assertEquals(0, initial.path("role").path("power").asInt(-1));

            String requestId = UUID.randomUUID().toString();
            var preview = peer.request("formation.power", Map.of("requestId", requestId, "heroIds", draft));
            assertTrue(preview.path("ok").asBoolean(), preview::toString);
            var result = preview.path("body");
            assertEquals(requestId, result.path("requestId").asString());
            assertEquals(draft, result.path("heroIds").valueStream().map(JsonNode::asString).toList());
            assertTrue(result.path("power").asInt() > individualTotal, "两木草稿应获得真实元素光环");
            assertEquals(revision, result.path("assetRevision").asLong());

            String emptyId = UUID.randomUUID().toString();
            var empty = peer.request("formation.power", Map.of("requestId", emptyId, "heroIds", List.of())).path("body");
            assertEquals(emptyId, empty.path("requestId").asString());
            assertTrue(empty.path("heroIds").isArray());
            assertTrue(empty.path("heroIds").isEmpty());
            assertEquals(0, empty.path("power").asInt(-1));

            var invalidDrafts = List.of(List.of(draft.getFirst(), foreign),
                List.of(draft.getFirst(), UUID.randomUUID().toString()), List.of("invalid"),
                List.of(draft.getFirst(), draft.getFirst()), Collections.nCopies(7, draft.getFirst()));
            for (var invalid : invalidDrafts) {
                var reply = peer.request("formation.power", Map.of("requestId", UUID.randomUUID().toString(), "heroIds", invalid));
                assertFalse(reply.path("ok").asBoolean(true));
                assertEquals("FORMATION_POWER_INVALID", reply.path("error").path("code").asString());
                assertTrue(reply.path("body").isNull());
            }
            var invalidId = peer.request("formation.power", Map.of("requestId", "invalid", "heroIds", draft));
            assertEquals("FORMATION_POWER_INVALID", invalidId.path("error").path("code").asString());

            String nextId = UUID.randomUUID().toString();
            var repeated = peer.request("formation.power", Map.of("requestId", nextId, "heroIds", draft)).path("body");
            assertEquals(nextId, repeated.path("requestId").asString());
            assertEquals(result.path("power"), repeated.path("power"));
            assertEquals(revision, roles.revision(ownerId));
            assertEquals(0, jdbc.queryForObject("SELECT max_main_power FROM game_role WHERE id=?", Integer.class, ownerId));
            assertEquals(0, jdbc.queryForObject("SELECT current_main_power FROM game_role WHERE id=?", Integer.class, ownerId));
            assertTrue(peer.events.isEmpty());
        }
        try (var recovered = new Peer()) {
            var initial = recovered.authenticate(token).path("body").path("initial");
            assertEquals(0, initial.path("role").path("power").asInt(-1));
            assertTrue(initial.path("mainFormation").path("slots").isEmpty());
        }
    }

    /** 真实连接先免费再扣券，使用与任务推送交错的资产快照及重登首包核验英雄和余额。 */
    @Test
    void normalSummonWithTicketPublishesAndReconnects() throws Exception {
        var player = login.login("draw_" + UUID.randomUUID().toString().substring(0, 15), "local-1");
        new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(status ->
                inventory.credit(player.role().id(), 900201, 1));
        var paidKey = Map.of("requestId", UUID.randomUUID().toString());
        JsonNode paidState;
        JsonNode receipt;
        try (var peer = new Peer()) {
            var initial = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            assertEquals(1, stackQuantity(initial, 900201));
            var free = peer.request("hero.summon.normal", Map.of("requestId", UUID.randomUUID().toString()));
            assertTrue(free.path("ok").asBoolean());
            var freeState = peer.pollAssetOperation(5, TimeUnit.SECONDS);
            assertNotNull(freeState);
            assertEquals("state.changed", freeState.path("name").asString());
            assertEquals(1, stackQuantity(freeState.path("body"), 900201));

            var paid = peer.request("hero.summon.normal", paidKey);
            assertTrue(paid.path("ok").asBoolean());
            receipt = paid.path("body");
            var push = peer.pollAssetOperation(5, TimeUnit.SECONDS);
            assertNotNull(push);
            assertEquals("state.changed", push.path("name").asString());
            paidState = push.path("body");
            assertEquals(receipt.path("assetRevision").asLong(), paidState.path("revision").asLong());
            assertEquals(freeState.path("body").path("heroSummon"), paidState.path("heroSummon"));
            assertEquals(0, stackQuantity(paidState, 900201));
            assertEquals(2, stackQuantity(paidState, 900302));
            var hero = receipt.path("actual").path("heroes").get(0);
            assertEquals(2, paidState.path("heroes").size());
            assertTrue(paidState.path("heroes").valueStream().anyMatch(owned ->
                    owned.path("id").equals(hero.path("instanceId"))
                    && owned.path("templateId").equals(hero.path("templateId"))));
        }
        try (var peer = new Peer()) {
            var restored = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            assertEquals(paidState.path("inventory"), restored.path("inventory"));
            assertEquals(paidState.path("heroes"), restored.path("heroes"));
            assertEquals(paidState.path("revision"), restored.path("revision"));
            assertEquals(receipt, peer.request("hero.summon.normal", paidKey).path("body"));
        }
    }

    /** 按配置编号从真实快照读堆叠数量；扣尽的堆叠不再投影给客户端。 */
    private long stackQuantity(JsonNode state, int itemId) {
        return state.path("inventory").valueStream().filter(item -> item.path("itemId").asInt() == itemId)
                .mapToLong(item -> item.path("quantity").asLong()).sum();
    }

    /** 实际二进制进阶扣费、同步一次，重试后核对资产或奖励没有重复，重连按原编号恢复。 */
    @Test
    void heroStageAdvanceSynchronizesAndRecoversReceipt() throws Exception {
        var player = player();
        String role = player.role().id();
        var hero = jdbc.queryForObject("SELECT id FROM game_hero WHERE role_id=? AND template_id=10101001",
                String.class, role);
        jdbc.update("UPDATE game_hero SET hero_level=30 WHERE id=?", hero);
        jdbc.update("UPDATE game_role SET gold=25000 WHERE id=?", role);
        new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(status ->
                inventory.credit(role, 900102, 50));
        var key = UUID.randomUUID().toString();
        var request = Map.of("requestId", key, "heroId", hero, "expectedStage", 0);
        JsonNode receipt;

        try (var peer = new Peer()) {
            var initial = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            var unknown = peer.request("hero.stage.advance.status", Map.of("requestId", key)).path("body");
            assertFalse(unknown.path("found").asBoolean());
            assertFalse(unknown.has("receipt"));
            var response = peer.request("hero.stage.advance", request);
            assertTrue(response.path("ok").asBoolean(), response.path("error").toString());
            receipt = response.path("body");
            assertEquals(0, receipt.path("fromStage").asInt(-1));
            assertEquals(1, receipt.path("toStage").asInt());
            assertEquals(role, receipt.path("roleId").asString());
            var change = peer.pollAssetOperation(5, TimeUnit.SECONDS);
            assertNotNull(change);
            assertEquals("state.changed", change.path("name").asString());
            var state = change.path("body");
            assertEquals(initial.path("revision").asLong() + 1, state.path("revision").asLong());
            assertEquals(receipt.path("assetRevision").asLong(), state.path("revision").asLong());
            assertEquals(15000, state.path("role").path("gold").asLong());
            assertEquals(stackQuantity(initial, 900102) - 50, stackQuantity(state, 900102));
            assertTrue(state.path("heroes").valueStream().anyMatch(row -> row.path("id").asString().equals(hero)
                    && row.path("stage").asInt() == 1 && row.path("level").asInt() == 30));
            assertEquals(receipt, peer.request("hero.stage.advance", request).path("body"));
            assertEquals("IDEMPOTENCY_CONFLICT", peer.request("hero.stage.advance",
                    Map.of("requestId", key, "heroId", hero, "expectedStage", 1)).path("error").path("code").asString());
            assertNull(peer.pollAssetOperation(250, TimeUnit.MILLISECONDS));
        }

        try (var peer = new Peer()) {
            var initial = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            assertEquals(receipt.path("assetRevision").asLong(), initial.path("revision").asLong());
            assertTrue(initial.path("heroes").valueStream().anyMatch(row -> row.path("id").asString().equals(hero)
                    && row.path("stage").asInt() == 1));
            var restored = peer.request("hero.stage.advance.status", Map.of("requestId", key)).path("body");
            assertTrue(restored.path("found").asBoolean());
            assertEquals(receipt, restored.path("receipt"));
        }
    }

    /** 三种培养走真实 WebSocket 指令、统一推送及重新鉴权，验证二进制快照字段。 */
    @Test
    void heroGrowthSynchronizesStarsGemsAndIndependentGodEquipment() throws Exception {
        var player = player();
        String role = player.role().id();
        jdbc.update("UPDATE game_role SET role_level=70 WHERE id=?", role);
        String target = growthHero(role, 10105010, 5);
        String high = growthHero(role, 10105010, 9);
        String first = growthHero(role, 10105010, 5);
        String second = growthHero(role, 10104005, 5);
        var third = List.of(growthHero(role, 10105008, 5), growthHero(role, 10105007, 5),
                growthHero(role, 10105009, 5));
        new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(status ->
                inventory.credit(role, 1011001, 4));
        jdbc.update("INSERT INTO game_god_equipment_lottery(role_id,draw_count) VALUES (?,14)", role);
        long revision;
        String gemInstance;
        String divineInstance;
        try (var peer = new Peer()) {
            var initial = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            assertEquals(1, initial.path("godEquipment").path("requiredWorldLevel").asInt());
            var star = peer.request("hero.star.upgrade", Map.of("requestId", UUID.randomUUID().toString(),
                    "heroId", target, "expectedStar", 5, "materials", List.of(
                    Map.of("row", 0, "heroIds", List.of(first), "useReplacement", false),
                    Map.of("row", 1, "heroIds", List.of(second), "useReplacement", false),
                    Map.of("row", 2, "heroIds", third, "useReplacement", false))));
            var promoted = committedGrowth(peer, star);
            assertEquals(6, snapshotHero(promoted, target).path("star").asInt());
            assertFalse(promoted.path("heroes").valueStream().anyMatch(hero -> first.equals(hero.path("id").asString())));

            var jewel = peer.request("hero.jewel.change", Map.of("requestId", UUID.randomUUID().toString(),
                    "heroId", high, "action", "EQUIP", "itemId", 1011001, "slot", 1));
            var socketed = committedGrowth(peer, jewel);
            gemInstance = snapshotHero(socketed, high).path("gems").path("items").get(0).path("instanceId").asString();
            assertFalse(gemInstance.isBlank());
            assertEquals(3, stackQuantity(socketed, 1011001));

            var draw = peer.request("hero.god-equipment.draw", Map.of("requestId", UUID.randomUUID().toString(),
                    "count", 1, "maxDiamonds", 0));
            var drawn = committedGrowth(peer, draw);
            var item = drawn.path("godEquipment").path("items").get(0);
            divineInstance = item.path("instanceId").asString();
            assertFalse(item.has("heroId"));
            assertEquals(item.path("templateId").asInt(), draw.path("body").path("rewards").get(0).path("templateId").asInt());

            var worn = peer.request("hero.god-equipment.change", Map.of("requestId", UUID.randomUUID().toString(),
                    "heroId", target, "slot", item.path("slot").asInt(), "action", "EQUIP", "instanceId", divineInstance));
            var ready = committedGrowth(peer, worn);
            assertEquals(target, ready.path("godEquipment").path("items").get(0).path("heroId").asString());
            revision = ready.path("revision").asLong();
        }
        try (var peer = new Peer()) {
            var restored = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            assertEquals(revision, restored.path("revision").asLong());
            assertEquals(6, snapshotHero(restored, target).path("star").asInt());
            assertEquals(gemInstance, snapshotHero(restored, high).path("gems").path("items").get(0).path("instanceId").asString());
            assertEquals(divineInstance, restored.path("godEquipment").path("items").get(0).path("instanceId").asString());
        }
    }

    /** 圣器激活、神装商店购买以及重登均交付来自同一资产事务的真实状态。 */
    @Test
    void artifactAndGodShopSynchronizeThroughTheBinarySocket() throws Exception {
        var player = player();
        String role = player.role().id();
        jdbc.update("UPDATE game_role SET role_level=70, diamonds=3000 WHERE id=?", role);
        String hero = growthHero(role, 10105010, 9);
        jdbc.update("UPDATE game_hero SET hero_level=200 WHERE id=?", hero);
        new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(status ->
                inventory.credit(role, 901812, 60));
        String artifactId;
        long revision;
        try (var peer = new Peer()) {
            var initial = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            assertEquals(0, initial.path("artifacts").path("slots").size());
            long resetAt = initial.path("godEquipment").path("shop").path("resetAt").asLong();
            assertTrue(resetAt > 0);
            var activation = peer.request("hero.artifact.change", Map.of("requestId", UUID.randomUUID().toString(),
                    "heroId", hero, "slot", 1, "action", "ACTIVATE"));
            var unlocked = committedGrowth(peer, activation);
            artifactId = activation.path("body").path("instanceId").asString();
            assertEquals(hero, unlocked.path("artifacts").path("slots").get(0).path("heroId").asString());
            assertEquals(artifactId, unlocked.path("artifacts").path("items").get(0).path("instanceId").asString());
            assertEquals(908101, unlocked.path("artifacts").path("items").get(0).path("templateId").asInt());
            assertEquals(2000, unlocked.path("role").path("diamonds").asInt());

            var order = Map.of("requestId", UUID.randomUUID().toString(), "productId", 1, "count", 2, "resetAt", resetAt);
            var paid = peer.request("hero.god-equipment.shop.buy", order);
            var purchased = committedGrowth(peer, paid);
            assertEquals(50, stackQuantity(purchased, 901812));
            assertEquals(2, stackQuantity(purchased, 901814));
            assertEquals(2, purchased.path("godEquipment").path("shop").path("purchases").get(0).path("purchased").asInt());
            assertEquals(paid.path("body"), peer.request("hero.god-equipment.shop.buy", order).path("body"));
            revision = purchased.path("revision").asLong();
        }
        try (var peer = new Peer()) {
            var restored = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            assertEquals(revision, restored.path("revision").asLong());
            assertEquals(artifactId, restored.path("artifacts").path("items").get(0).path("instanceId").asString());
            assertEquals(2, restored.path("godEquipment").path("shop").path("purchases").get(0).path("purchased").asInt());
        }
    }

    /** 准备此次角色的素材与高星对象，只写独立测试数据库。 */
    private String growthHero(String role, int templateId, int star) {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,star,hero_level) VALUES (?,?,?,?,1)",
                id, role, templateId, star);
        return id;
    }

    /** 在任务通知、奖励反馈交错时取得实际养成事务快照，核对回执版本。 */
    private JsonNode committedGrowth(Peer peer, JsonNode response) throws InterruptedException {
        assertTrue(response.path("ok").asBoolean(), response.path("error").toString());
        var event = peer.pollAssetOperation(5, TimeUnit.SECONDS);
        while (event != null && event.path("name").asString().equals("reward.granted")) {
            event = peer.pollAssetOperation(5, TimeUnit.SECONDS);
        }
        assertNotNull(event);
        assertEquals("state.changed", event.path("name").asString());
        var state = event.path("body");
        assertEquals(response.path("body").path("assetRevision").asLong(), state.path("revision").asLong());
        return state;
    }

    /** 从指定版本名册按实例取快照，不把模板号当作英雄身份。 */
    private JsonNode snapshotHero(JsonNode state, String id) {
        return state.path("heroes").valueStream().filter(hero -> id.equals(hero.path("id").asString()))
                .findFirst().orElseThrow();
    }

    /** 真实二进制锁定与解锁同步名册，重复编号、异参和他人实例不会覆盖现状。 */
    @Test
    void heroLockPersistsAndReplaysWithoutChangingNewState() throws Exception {
        var player = player();
        String role = player.role().id();
        String hero = jdbc.queryForObject("SELECT id FROM game_hero WHERE role_id=? AND template_id=10101001",
                String.class, role);
        String lockId = UUID.randomUUID().toString();
        var lock = Map.of("requestId", lockId, "heroId", hero, "locked", true);
        var unlock = Map.of("requestId", UUID.randomUUID().toString(), "heroId", hero, "locked", false);
        JsonNode lockedReceipt;
        long unlockedRevision;

        try (var peer = new Peer()) {
            var initial = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            assertFalse(initial.path("heroes").valueStream().filter(row -> hero.equals(row.path("id").asString()))
                    .findFirst().orElseThrow().path("locked").asBoolean());
            var locked = peer.request("hero.lock.set", lock);
            assertTrue(locked.path("ok").asBoolean(), locked.path("error").toString());
            lockedReceipt = locked.path("body");
            assertEquals(hero, lockedReceipt.path("heroId").asString());
            assertTrue(lockedReceipt.path("locked").asBoolean());
            var committed = peer.events.poll(5, TimeUnit.SECONDS);
            assertNotNull(committed);
            assertEquals("state.changed", committed.path("name").asString());
            var state = committed.path("body");
            assertEquals(initial.path("revision").asLong() + 1, state.path("revision").asLong());
            assertEquals(lockedReceipt.path("assetRevision").asLong(), state.path("revision").asLong());
            assertTrue(state.path("heroes").valueStream().anyMatch(row -> hero.equals(row.path("id").asString())
                    && row.path("locked").asBoolean()));

            var unlocked = peer.request("hero.lock.set", unlock);
            assertTrue(unlocked.path("ok").asBoolean(), unlocked.path("error").toString());
            assertFalse(unlocked.path("body").path("locked").asBoolean(true));
            unlockedRevision = unlocked.path("body").path("assetRevision").asLong();
            assertEquals(state.path("revision").asLong() + 1, unlockedRevision);
            var unlockedEvent = peer.events.poll(5, TimeUnit.SECONDS);
            assertNotNull(unlockedEvent);
            assertEquals(unlockedRevision, unlockedEvent.path("body").path("revision").asLong());
            assertEquals(lockedReceipt, peer.request("hero.lock.set", lock).path("body"));
            assertEquals("IDEMPOTENCY_CONFLICT", peer.request("hero.lock.set",
                    Map.of("requestId", lockId, "heroId", hero, "locked", false)).path("error").path("code").asString());
            assertNull(peer.events.poll(250, TimeUnit.MILLISECONDS));
        }
        try (var peer = new Peer()) {
            var initial = peer.authenticate(player.session().accessToken()).path("body").path("initial");
            assertEquals(unlockedRevision, initial.path("revision").asLong());
            assertTrue(initial.path("heroes").valueStream().anyMatch(row -> hero.equals(row.path("id").asString())
                    && !row.path("locked").asBoolean(true)));
            assertEquals(lockedReceipt, peer.request("hero.lock.set", lock).path("body"));
        }
        try (var peer = new Peer()) {
            var other = player();
            peer.authenticate(other.session().accessToken());
            assertEquals("HERO_NOT_FOUND", peer.request("hero.lock.set", lock).path("error").path("code").asString());
        }
    }

    /** 个人空间经真实 WS 校验鉴权、图鉴、称号期限、改名扣费、状态推送与重登恢复。 */
    @Test
    void personalSpaceCommandsPublishAndRecover() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        int unlockedImage = 110101001;
        assertPersonalSpaceRequiresAuthentication(unlockedImage);

        String accessToken;
        JsonNode committed;
        try (var peer = new Peer()) {
            var entered = peer.request("session.login", Map.of("account", "profile_" + suffix,
                "serverId", "local-2", "clientInstanceId", UUID.randomUUID().toString()));
            assertTrue(entered.path("ok").asBoolean());
            var loginBody = entered.path("body");
            peer.connectionId = loginBody.path("connectionId").asString();
            accessToken = loginBody.path("session").path("accessToken").asString();
            var initial = loginBody.path("initial");
            var role = initial.path("role");
            String roleId = role.path("id").asString();
            assertEquals("local-2", role.path("serverId").asString());
            assertFalse(role.path("firstNamed").asBoolean());
            assertTrue(role.path("basics").path("imageId").asInt() > 0);
            assertTrue(initial.path("inventory").isArray());
            assertEquals(0, personalResponse(peer, "role.image.list", Map.of()).path("imageIds").size());
            assertEquals(0, personalResponse(peer, "role.titles.list", Map.of()).path("titles").size());

            personalResponse(peer, "role.name.set", Map.of("nickname", "原名" + suffix));
            var named = personalStateChanged(peer, initial.path("revision").asLong() + 1);
            assertEquals("原名" + suffix, named.path("role").path("nickname").asString());

            new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(status -> {
                roles.creditCurrency(roleId, 0, 1000);
                inventory.credit(roleId, 902044, 1);
                heroGrants.grant(roleId, 10101001, 1);
                jdbc.update("""
                    INSERT INTO game_role_title(role_id,title_id,end_time_seconds) VALUES (?,?,?),(?,?,?),(?,?,?)
                    """, roleId, 1, -1, roleId, 2, 0, roleId, 3, 1_800_000_000L);
            });
            long preparedRevision = named.path("revision").asLong() + 1;
            var prepared = personalStateChanged(peer, preparedRevision);
            assertEquals(1, stackQuantity(prepared, 902044));
            assertEquals(List.of(unlockedImage), personalResponse(peer, "role.image.list", Map.of()).path("imageIds")
                .valueStream().map(JsonNode::asInt).toList());
            var titles = personalResponse(peer, "role.titles.list", Map.of()).path("titles");
            assertEquals(List.of(1, 2, 3), titles.valueStream().map(value -> value.path("idx").asInt()).toList());
            assertEquals(List.of(-1L, 0L, 1_800_000_000L),
                titles.valueStream().map(value -> value.path("endTimeSeconds").asLong()).toList());

            var locked = peer.request("role.image.change", Map.of("imageId", 210101001));
            assertEquals("ROLE_IMAGE_UNAVAILABLE", locked.path("error").path("code").asString());
            personalResponse(peer, "role.image.change", Map.of("imageId", unlockedImage));
            var selected = personalStateChanged(peer, preparedRevision + 1);
            var basics = selected.path("role").path("basics");
            assertEquals(unlockedImage, basics.path("imageId").asInt());
            assertEquals(role.path("basics").path("headId"), basics.path("headId"));

            var wrongPayment = peer.request("role.name.rename", Map.of("nickname", "改名" + suffix, "paymentType", 1));
            assertEquals("ROLE_RENAME_PAYMENT_INVALID", wrongPayment.path("error").path("code").asString());
            personalResponse(peer, "role.name.rename", Map.of("nickname", "改名" + suffix, "paymentType", 2));
            var cardPaid = personalStateChanged(peer, preparedRevision + 2);
            assertEquals("改名" + suffix, cardPaid.path("role").path("nickname").asString());
            assertEquals(0, stackQuantity(cardPaid, 902044));
            assertEquals(1000, cardPaid.path("role").path("diamonds").asLong());

            personalResponse(peer, "role.name.rename", Map.of("nickname", "新名" + suffix, "paymentType", 1));
            committed = personalStateChanged(peer, preparedRevision + 3);
            assertEquals("新名" + suffix, committed.path("role").path("nickname").asString());
            assertEquals(112, committed.path("role").path("diamonds").asLong());
            assertTrue(committed.path("role").path("welcomeGiftAvailable").asBoolean());
            var repeated = peer.request("role.name.rename", Map.of("nickname", "新名" + suffix, "paymentType", 1));
            assertEquals("ROLE_NAME_SAME", repeated.path("error").path("code").asString());
            assertNull(peer.events.poll());
            assertNull(peer.messages.poll(100, TimeUnit.MILLISECONDS));
        }

        try (var restoredPeer = new Peer()) {
            var restore = restoredPeer.authenticate(accessToken);
            assertTrue(restore.path("ok").asBoolean());
            var restored = restore.path("body").path("initial");
            assertEquals(committed.path("role"), restored.path("role"));
            assertEquals(committed.path("inventory"), restored.path("inventory"));
            assertEquals(committed.path("revision"), restored.path("revision"));
            assertEquals(1, personalResponse(restoredPeer, "role.image.list", Map.of()).path("imageIds").size());
            assertEquals(3, personalResponse(restoredPeer, "role.titles.list", Map.of()).path("titles").size());
        }
    }

    /** 真实装饰协议验证本人资格、头像与框快照、激活扣费和重登后的展示偏好。 */
    @Test
    void decorationsCommandsPublishAndRecover() throws Exception {
        try (var anonymous = new Peer()) {
            var denied = anonymous.request("role.decorations.list", Map.of());
            assertEquals("UNAUTHENTICATED", denied.path("error").path("code").asString());
        }
        var player = login.login("decor_" + UUID.randomUUID().toString().substring(0, 12), "local-1");
        String token = player.session().accessToken();
        String roleId = player.role().id();
        int avatarId = 10_101_001;
        int borderId = 1;
        int borderItem = 1_005_001;
        new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(status -> {
            inventory.credit(roleId, borderItem, 2);
            heroGrants.grant(roleId, avatarId, 1);
        });

        long finalRevision;
        try (var peer = new Peer()) {
            var initial = peer.authenticate(token).path("body").path("initial");
            long revision = initial.path("revision").asLong();
            var listed = personalResponse(peer, "role.decorations.list", Map.of());
            assertEquals(List.of(1, avatarId), listed.path("headIds").valueStream().map(JsonNode::asInt).toList());
            assertEquals(0, listed.path("borders").get(0).path("id").asInt());
            assertEquals(-1, listed.path("borders").get(0).path("expiresAtSeconds").asLong());
            assertTrue(listed.path("showPeerage").asBoolean());
            assertEquals(0, listed.path("totalRecharge").asLong());
            var lockedAvatar = peer.request("role.head.change", Map.of("id", 10102002));
            assertEquals("ROLE_HEAD_UNAVAILABLE", lockedAvatar.path("error").path("code").asString());

            personalResponse(peer, "role.head.change", Map.of("id", avatarId));
            var avatarChanged = personalStateChanged(peer, ++revision);
            assertEquals(avatarId, avatarChanged.path("role").path("basics").path("headId").asInt());
            var lockedBorder = peer.request("role.border.change", Map.of("id", borderId));
            assertEquals("ROLE_BORDER_UNAVAILABLE", lockedBorder.path("error").path("code").asString());

            var activated = personalResponse(peer, "role.border.activate", Map.of("id", borderId));
            var borderIds = activated.path("borders").valueStream().map(value -> value.path("id").asInt()).toList();
            assertEquals(List.of(0, borderId), borderIds);
            var activatedState = personalStateChanged(peer, ++revision);
            assertEquals(1, stackQuantity(activatedState, borderItem));
            assertEquals(0, activatedState.path("role").path("basics").path("borderId").asInt());
            personalResponse(peer, "role.border.activate", Map.of("id", borderId));
            assertEquals(revision, roles.revision(roleId));

            personalResponse(peer, "role.border.change", Map.of("id", borderId));
            var borderChanged = personalStateChanged(peer, ++revision);
            assertEquals(borderId, borderChanged.path("role").path("basics").path("borderId").asInt());
            var hidden = personalResponse(peer, "role.peerage.display", Map.of("visible", false));
            assertFalse(hidden.path("showPeerage").asBoolean());
            personalStateChanged(peer, ++revision);
            finalRevision = revision;
        }
        try (var restored = new Peer()) {
            var initial = restored.authenticate(token).path("body").path("initial");
            var basics = initial.path("role").path("basics");
            assertEquals(finalRevision, initial.path("revision").asLong());
            assertEquals(avatarId, basics.path("headId").asInt());
            assertEquals(borderId, basics.path("borderId").asInt());
            assertEquals(1, stackQuantity(initial, borderItem));
            var state = personalResponse(restored, "role.decorations.list", Map.of());
            assertFalse(state.path("showPeerage").asBoolean());
            assertEquals(List.of(0, borderId), state.path("borders").valueStream()
                .map(value -> value.path("id").asInt()).toList());
        }
    }

    /** 未归属会话不得查询或修改角色个人空间。 */
    private void assertPersonalSpaceRequiresAuthentication(int imageId) throws Exception {
        var requests = Map.of("role.image.list", Map.of(), "role.titles.list", Map.of(),
            "role.image.change", Map.of("imageId", imageId),
            "role.name.rename", Map.of("nickname", "匿名", "paymentType", 1));
        for (var entry : requests.entrySet()) {
            // 未鉴权业务请求被拒绝后连接即关闭，每个协议使用各自的未认证连接。
            try (var peer = new Peer()) {
                assertEquals("UNAUTHENTICATED", peer.request(entry.getKey(), entry.getValue()).path("error")
                    .path("code").asString());
            }
        }
    }

    /** 校验个人空间成功回包，仅由事件读取权威资产后的结果。 */
    private JsonNode personalResponse(Peer peer, String name, Object body) throws Exception {
        var response = peer.request(name, body);
        assertTrue(response.path("ok").asBoolean(), () -> name + " 失败：" + response.path("error").path("code").asString());
        return response.path("body");
    }

    /** 检查响应前后均能到达一次指定版本的角色状态事件。 */
    private JsonNode personalStateChanged(Peer peer, long revision) throws InterruptedException {
        var event = peer.events.poll();
        if (event == null) {
            event = peer.messages.poll(5, TimeUnit.SECONDS);
        }
        assertNotNull(event);
        assertEquals("state.changed", event.path("name").asString());
        var body = event.path("body");
        assertEquals(revision, body.path("revision").asLong());
        return body;
    }

    /** 本测试显式关闭GM开发能力，试战也必须由服务端拒绝，不依赖本机local默认值。 */
    @Test void battlePreviewRequiresDevelopmentSwitch() throws Exception {
        var player = player();
        try (var peer = new Peer()) {
            peer.authenticate(player.session().accessToken());
            assertEquals("GM_DISABLED", peer.request("battle.preview", Map.of("mission", 1)).path("error").path("code").asString());
        }
    }

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

    /** 普通断线不撤销自身令牌；离线期间可信库存事务提交后，重连恢复最新真实背包。 */
    @Test void reconnectReadsCommittedInventory() throws Exception {
        var player = player();
        tools.jackson.databind.JsonNode initial;
        try (var first = new Peer()) {
            initial = first.authenticate(player.session().accessToken()).path("body").path("initial");
        }
        new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(status ->
                inventory.credit(player.role().id(), 900101, 5));
        try (var second = new Peer()) {
            var state = second.authenticate(player.session().accessToken()).path("body").path("initial");
            assertTrue(state.path("revision").asLong() > initial.path("revision").asLong());
            assertNotEquals(initial.path("inventory"), state.path("inventory"));
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
            assertEquals("UNKNOWN_MESSAGE", peer.request("hero.evolve", Map.of()).path("error").path("code").asString());
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

    /** 不同角色同时在线且背包各自归属；一次可信库存事务只向资产所属账号推送。 */
    @Test void accountsRemainIsolated() throws Exception {
        var first = player();
        var second = player();
        try (var one = new Peer(); var two = new Peer()) {
            one.authenticate(first.session().accessToken());
            two.authenticate(second.session().accessToken());
            new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(status ->
                    inventory.credit(first.role().id(), 900101, 5));
            var event = one.messages.poll(5, TimeUnit.SECONDS);
            assertNotNull(event);
            assertEquals(first.role().id(), event.path("body").path("role").path("id").asString());
            assertNull(two.messages.poll(150, TimeUnit.MILLISECONDS));
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
            peer.socket.sendBinary(ByteBuffer.wrap(new byte[GameProtocolCodec.FRAME_LIMIT+1]), true).join();
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

    /** 真实 TypeScript 连接覆盖市场扣费、限购、发奖、重登及货架刷新协议。 */
    @Test void typescriptLoginAndBagRoundTrip() throws Exception {
        String marketAccount = "market_" + UUID.randomUUID().toString().substring(0, 8);
        var buyer = login.login(marketAccount, "local-1");
        // 隔离数据库提供足够货币，测试使用真实随机货架，不依赖新号随机到了哪件低价商品。
        jdbc.update("UPDATE game_role SET gold = ?, diamonds = ? WHERE id = ?", 10_000_000L, 100_000L, buyer.role().id());
        var script = java.nio.file.Path.of("..", "client", "tools", "run-game-socket-live.cjs").toAbsolutePath().normalize();
        var process = new ProcessBuilder("node", script.toString(), Integer.toString(port), RUN_ID, marketAccount)
                .redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(40, TimeUnit.SECONDS), "客户端联调进程超时");
            String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            assertTrue(output.contains("PASS real TS client"), output);
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }

    /** 真实 TypeScript 连接覆盖金币副本战斗、清扫、资产快照和同请求重登恢复。 */
    @Test void dailyDungeonChallengeAndSweepRoundTrip() throws Exception {
        runDailyDungeonRoundTrip(DailyDungeonType.GOLD, false);
    }

    /** 金币前三关共享当天免费和付费次数，每关保存原战报及到账。 */
    @Test void goldDungeonStageProgressRoundTrip() throws Exception {
        runDailyDungeonRoundTrip(DailyDungeonType.GOLD, true);
    }

    /** 真实客户端通过经验副本的挑战、扫荡、重登，并核对金币次数互不影响。 */
    @Test void experienceDungeonRoundTrip() throws Exception {
        runDailyDungeonRoundTrip(DailyDungeonType.EXPERIENCE, false);
    }

    /** 核对英雄、羁绊和精灵三组正式协议、首通回执以及实际到账。 */
    @Test
    void additionalDailyDungeonRoutesSettleRealRewards() throws Exception {
        var player = player();
        String role = player.role().id();
        String hero = UUID.randomUUID().toString();
        jdbc.update("UPDATE game_role SET role_level=60 WHERE id=?", role);
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10104004,100,4)", hero, role);
        long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, role);
        formations.save("Bearer " + player.session().accessToken(),
                new com.funsgamex.mxzg.lineup.MainFormationCommandService.Save(UUID.randomUUID().toString(), version, 1,
                        List.of(new com.funsgamex.mxzg.lineup.Lineup.Slot(2, hero))));
        try (var peer = new Peer()) {
            assertTrue(peer.authenticate(player.session().accessToken()).path("ok").asBoolean());
            for (var type : List.of(DailyDungeonType.HERO, DailyDungeonType.FETTER, DailyDungeonType.SPIRIT)) {
                String prefix = "dungeon." + type.key();
                var list = peer.request(prefix + ".list", Map.of());
                assertTrue(list.path("ok").asBoolean());
                assertEquals(9, list.path("body").path("stages").size());
                assertEquals(0, list.path("body").path("wins").asInt());
                var command = Map.of("requestId", UUID.randomUUID().toString(), "stageId", 1,
                        "sweep", false, "maxDiamonds", 0);
                var result = peer.request(prefix + ".challenge", command);
                assertTrue(result.path("ok").asBoolean(), () -> "副本拒绝 " + type.key() + " " + result.path("error"));
                var receipt = result.path("body");
                assertTrue(receipt.path("won").asBoolean());
                assertEquals(type.scenario(1), receipt.path("replay").path("scenario").asString());
                assertEquals(1, receipt.path("state").path("wins").asInt());
                assertEquals(receipt, peer.request(prefix + ".challenge", command).path("body"));
            }
        }
        var quantities = new HashMap<Integer, Long>();
        for (var item : inventory.list(role)) {
            quantities.merge(item.itemId(), item.quantity(), Long::sum);
        }
        assertEquals(10L, quantities.get(20003000));
        assertEquals(2L, quantities.get(20004000));
        assertEquals(4L, quantities.get(901501));
        assertEquals(60L, quantities.get(901401));
    }

    /** 为真实客户端准备独立角色、足够余额和合法阵容，多关流程使用原 VIP8 四次上限。 */
    private void runDailyDungeonRoundTrip(DailyDungeonType type, boolean multiStage) throws Exception {
        boolean experience = type == DailyDungeonType.EXPERIENCE;
        String account = (experience ? "experience_dungeon_" : multiStage ? "gold_dungeon_progress_" : "gold_dungeon_")
                + UUID.randomUUID().toString().substring(0, 8);
        var player = login.login(account, "local-1");
        String roleId = player.role().id();
        jdbc.update("UPDATE game_role SET role_level=?,diamonds=?,goddess_vip=? WHERE id=?",
                experience ? 17 : 15, 1_000, multiStage ? 8 : 2, roleId);
        record Member(int templateId, int star, int position) {}
        var members = multiStage || experience
                ? List.of(new Member(10104004, 4, 2), new Member(10505005, 5, 3),
                        new Member(10204005, 4, 5), new Member(10204004, 4, 6), new Member(10405005, 5, 7))
                : List.of(new Member(10104004, 4, 2));
        var lineup = new ArrayList<com.funsgamex.mxzg.lineup.Lineup.Slot>();
        for (var member : members) {
            String heroId = UUID.randomUUID().toString();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,?)",
                    heroId, roleId, member.templateId(), 100, member.star(), 0);
            lineup.add(new com.funsgamex.mxzg.lineup.Lineup.Slot(member.position(), heroId));
        }
        long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, roleId);
        formations.save("Bearer " + player.session().accessToken(),
                new com.funsgamex.mxzg.lineup.MainFormationCommandService.Save(UUID.randomUUID().toString(), version, 1, lineup));
        if (multiStage) {
            jdbc.update("UPDATE game_role SET max_main_power=52501 WHERE id=? AND max_main_power < 52501", roleId);
        }

        var script = java.nio.file.Path.of("..", "client", "tools", "run-game-socket-live.cjs").toAbsolutePath().normalize();
        var process = new ProcessBuilder("node", script.toString(), Integer.toString(port), RUN_ID, account)
                .redirectErrorStream(true).start();
        try {
            assertTrue(process.waitFor(40, TimeUnit.SECONDS), "副本联调进程超时");
            String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            assertEquals(0, process.exitValue(), output);
            var result = experience ? "PASS real TS experience dungeon"
                    : multiStage ? "PASS real TS gold dungeon progression" : "PASS real TS gold dungeon →";
            assertTrue(output.contains(result), output);
        } finally {
            if (process.isAlive()) {
                process.destroyForcibly();
            }
        }
    }

    /** 初始容量 300 英雄带完整四槽与面板可经真实长连接恢复，仍拒绝超过 256KB 的消息。 */
    @Test void fullRosterFitsBoundedFrame() throws Exception {
        var owner=login.login("capacity_"+UUID.randomUUID().toString().substring(0,12),"local-1");
        for(int i=0;i<300;i++){
            String hero=UUID.randomUUID().toString();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,1,1)",hero,owner.role().id());
            for(int slot=1;slot<=4;slot++)jdbc.update("INSERT INTO game_equipment(id,role_id,template_id,slot,soul_level,hero_id) VALUES (?,?,?,?,0,?)",UUID.randomUUID().toString(),owner.role().id(),1000001+slot*1000,slot,hero);
        }
        try(var peer=new Peer()){
            var accepted=peer.authenticate(owner.session().accessToken());assertTrue(accepted.path("ok").asBoolean());
            var initial=accepted.path("body").path("initial");assertEquals(300,initial.path("heroes").size());
            var hero=initial.path("heroes").get(0);assertEquals(4,hero.path("equipment").path("items").size());assertTrue(hero.path("panelStats").path("values").path("atk").asLong()>hero.path("baseStats").path("atk").asLong());
            var encoded=GameProtocolCodec.encode(Map.of("version",1,"kind","event","name","state.changed","body",initial));
            assertTrue(encoded.length>65536);assertTrue(encoded.length<=GameProtocolCodec.FRAME_LIMIT);
        }
        assertEquals(262144,GameProtocolCodec.FRAME_LIMIT);
        assertThrows(IllegalArgumentException.class,()->GameProtocolCodec.decode(new byte[GameProtocolCodec.FRAME_LIMIT+1]));
        assertThrows(IllegalArgumentException.class,()->GameProtocolCodec.encode(Map.of("version",1,"kind","request","name","session.login","body",Map.of("account","x".repeat(GameProtocolCodec.FRAME_LIMIT+1),"serverId","local-1","clientInstanceId","frame-limit-test"))));
    }
    /** 两个真实连接覆盖建会审批、公告广播、经验与成员主阵战力，以及冷重登恢复。 */
    @Test
    void guildMembershipSynchronizesAndRestores() throws Exception {
        var founder = player();
        var candidate = player();
        var candidateId = candidate.role().id();
        String guildName = "远征" + UUID.randomUUID().toString().substring(0, 7);
        int badgeId = 12;
        jdbc.update("UPDATE game_role SET role_level=18,diamonds=100 WHERE id=?", founder.role().id());
        jdbc.update("UPDATE game_role SET role_level=18 WHERE id=?", candidateId);
        try (var leader = new Peer(); var member = new Peer()) {
            leader.authenticate(founder.session().accessToken());
            var guest = member.authenticate(candidate.session().accessToken()).path("body").path("initial");
            assertEquals("", guest.path("role").path("guildName").asString());
            int currentPower = guest.path("role").path("power").asInt();
            assertTrue(currentPower > 0);

            var create = Map.of("name", guildName, "requestId", UUID.randomUUID().toString(),
                "action", "CREATE", "badgeId", badgeId);
            var created = leader.request("guild.change", create);
            assertTrue(created.path("ok").asBoolean(), created::toString);
            var guildId = created.path("body").path("guild").path("id").asString();
            assertFalse(guildId.isBlank());
            assertEquals(badgeId, created.path("body").path("guild").path("badgeId").asInt());
            assertEquals(0, leader.event("state.changed").path("body").path("role").path("diamonds").asLong());
            assertTrue(leader.request("guild.change", create).path("ok").asBoolean());

            var matching = member.request("guild.list", Map.of("query", guildName, "page", 1));
            var listedGuild = matching.path("body").path("guilds").get(0);
            assertEquals(guildId, listedGuild.path("id").asString());
            assertEquals(badgeId, listedGuild.path("badgeId").asInt());
            assertEquals(1, listedGuild.path("level").asInt());
            assertTrue(listedGuild.has("experience"));
            assertEquals(750, listedGuild.path("nextLevelExperience").asInt());
            var application = member.request("guild.change",
                Map.of("requestId", UUID.randomUUID().toString(), "action", "APPLY", "guildId", guildId));
            assertTrue(application.path("ok").asBoolean(), application::toString);
            leader.event("guild.updated");
            // 模拟未再次登录的历史角色，查询申请者时应只读补算，不改写对方的行。
            jdbc.update("UPDATE game_role SET current_main_power=NULL WHERE id=?", candidateId);
            var pending = leader.request("guild.list", Map.of());
            var applicant = pending.path("body").path("applications").get(0);
            var profile = guest.path("role").path("basics");
            assertEquals(candidateId, applicant.path("id").asString());
            assertTrue(applicant.has("headId"));
            assertTrue(applicant.has("borderId"));
            assertEquals(profile.path("headId"), applicant.path("headId"));
            assertEquals(profile.path("borderId"), applicant.path("borderId"));
            assertEquals(currentPower, applicant.path("power").asInt());
            assertNull(jdbc.queryForObject("SELECT current_main_power FROM game_role WHERE id=?", Integer.class, candidateId));

            var decision = leader.request("guild.change",
                Map.of("requestId", UUID.randomUUID().toString(), "action", "APPROVE", "applicantId", candidateId));
            assertTrue(decision.path("ok").asBoolean(), decision::toString);
            assertEquals(2, decision.path("body").path("members").size());
            var approved = decision.path("body").path("members").valueStream()
                .filter(person -> candidateId.equals(person.path("id").asString())).findFirst().orElseThrow();
            assertEquals(applicant.path("headId"), approved.path("headId"));
            assertEquals(applicant.path("borderId"), approved.path("borderId"));
            assertEquals(currentPower, approved.path("power").asInt());
            assertEquals(guildName, member.event("state.changed").path("body").path("role").path("guildName").asString());
            member.event("guild.updated");
            var edited = leader.request("guild.change", Map.of("requestId", UUID.randomUUID().toString(),
                "action", "UPDATE_NOTICE", "guildId", guildId, "description", "周末集合"));
            assertEquals("周末集合", edited.path("body").path("guild").path("description").asString());
            member.event("guild.updated");
            assertEquals("周末集合", member.request("guild.list", Map.of()).path("body").path("guild").path("description").asString());
        }
        try (var restored = new Peer()) {
            var initial = restored.authenticate(candidate.session().accessToken()).path("body").path("initial");
            assertEquals(guildName, initial.path("role").path("guildName").asString());
            var restoredGuild = restored.request("guild.list", Map.of()).path("body");
            assertEquals(2, restoredGuild.path("members").size());
            assertEquals(badgeId, restoredGuild.path("guild").path("badgeId").asInt());
            assertEquals("周末集合", restoredGuild.path("guild").path("description").asString());
            var left = restored.request("guild.change", Map.of("requestId", UUID.randomUUID().toString(), "action", "LEAVE"));
            assertTrue(left.path("ok").asBoolean(), left::toString);
            assertTrue(left.path("body").path("rejoinAtSeconds").asLong() > 0);
            assertEquals("", restored.event("state.changed").path("body").path("role").path("guildName").asString());
        }
    }

    /** 契约资格、首次领取、同请求去重以及断开后通过统一快照恢复，均走真实 WebSocket。 */
    @Test
    void vipClaimSynchronizesAndRestores() throws Exception {
        var account = player();
        var roleId = account.role().id();
        String token = account.session().accessToken();
        var valid = Map.of("requestId", UUID.randomUUID().toString(), "taskId", 100200);
        try (var peer = new Peer()) {
            var initial = peer.authenticate(token).path("body").path("initial");
            assertEquals(0, initial.path("vip").path("level").asInt(-1));
            assertEquals(4, initial.path("vip").path("tasks").size());
            assertEquals("VIP_TASK_NOT_REACHED", peer.request("vip.claim", valid).path("error").path("code").asString());
            jdbc.update("UPDATE game_role SET role_level=5 WHERE id=?", roleId);

            var response = peer.request("vip.claim", valid);
            assertTrue(response.path("ok").asBoolean(), response::toString);
            var receipt = response.path("body");
            assertEquals(roleId, receipt.path("roleId").asString());
            assertEquals(100200, receipt.path("taskId").asInt());
            var stateFrame = peer.event("state.changed");
            var notice = peer.event("reward.granted").path("body");
            assertEquals(notice, receipt.path("notice"));
            assertEquals(20, notice.path("items").get(0).path("credited").asLong());
            var snapshot = stateFrame.path("body");
            assertEquals(receipt.path("assetRevision"), snapshot.path("revision"));
            assertEquals(initial.path("role").path("diamonds").asLong() + 20, snapshot.path("role").path("diamonds").asLong());
            assertTrue(snapshot.path("vip").path("tasks").valueStream().anyMatch(task ->
                    task.path("id").asInt() == 100200 && task.path("claimed").asBoolean()));
            assertEquals(receipt, peer.request("vip.claim", valid).path("body"));
            java.nio.file.Files.write(java.nio.file.Path.of("target", "vip-claim-wire.pb"), GameProtocolCodec.encode(response));
            java.nio.file.Files.write(java.nio.file.Path.of("target", "vip-state-wire.pb"), GameProtocolCodec.encode(stateFrame));
        }
        try (var restored = new Peer()) {
            var snapshot = restored.authenticate(token).path("body").path("initial");
            assertTrue(snapshot.path("vip").path("tasks").valueStream().anyMatch(task ->
                    task.path("id").asInt() == 100200 && task.path("claimed").asBoolean()));
            assertEquals("VIP_TASK_CLAIMED", restored.request("vip.claim", Map.of(
                    "requestId", UUID.randomUUID().toString(), "taskId", 100200)).path("error").path("code").asString());
        }
    }

    /** 关闭 GM 时所有开发操作均由服务端拒绝，普通心跳仍可用。 */
    @Test void gmDisabledIsEnforced() throws Exception {
        var player = player();
        String requestId = UUID.randomUUID().toString();
        try (var peer = new Peer()) {
            peer.authenticate(player.session().accessToken());
            assertFalse(peer.request("gm.status", Map.of()).path("body").path("enabled").asBoolean());
            for (var command : Map.of(
                    "gm.grant", Map.of("requestId", requestId, "kind", "item", "configId", 900101, "quantity", 1),
                    "gm.level.set", Map.of("requestId", requestId, "level", 15),
                    "gm.chapter.set", Map.of("requestId", requestId, "mission", 4),
                    "gm.time.get", Map.of(),
                    "gm.time.set", Map.of("unixSeconds", 2_500_000_000L)).entrySet()) {
                var reply = peer.request(command.getKey(), command.getValue());
                assertEquals("GM_DISABLED", reply.path("error").path("code").asString(), command.getKey());
            }
            assertTrue(peer.request("session.heartbeat", Map.of()).path("ok").asBoolean());
        }
    }

    /** 原库存 HTTP 路由已退役，默认客户端不能再通过它回退读取。 */
    @Test void inventoryHttpEndpointIsRetired() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            var response = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/inventory")).GET().build(), HttpResponse.BodyHandlers.discarding());
            assertEquals(404, response.statusCode());
        }
    }
}
