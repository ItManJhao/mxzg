/**
 * 主线挑战、结算、独立通关奖励和英雄早期成长的真实 WebSocket 回归，核对提交事件和重新鉴权。
 * 使用独立H2和随机端口，验证真实发放、状态更新与回执重放。
 */
package com.funsgamex.mxzg;
import com.funsgamex.mxzg.auth.*;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
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
    /** 隔离测试写入持久事实前取得真实角色锁，不经未开放的里程碑业务接口。 */
    @Autowired RoleRepository roles;
    /** 同事务提交统一版本，真实在线连接应只接到提交后的完整状态。 */
    @Autowired AssetSyncService sync;
    /** 测试夹具写入与回滚使用应用真实事务管理。 */
    @Autowired PlatformTransactionManager transactions;
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

    /** 登录明确交付真实空集；非连续持久集合经提交事件和重新鉴权恢复，读取不改版本或开放领取。 */
    @Test void milestoneProgressFollowsLoginCommittedSnapshotAndAuthentication() throws Exception {
        String token;
        String role;
        long revision;
        try (var peer = new Peer()) {
            var accepted = peer.request("session.login", Map.of("account",
                    "milestone_" + UUID.randomUUID().toString().substring(0, 12), "serverId", "local-1",
                    "clientInstanceId", UUID.randomUUID().toString()));
            assertTrue(accepted.path("ok").asBoolean());
            peer.connectionId = accepted.path("body").path("connectionId").asString();
            token = accepted.path("body").path("session").path("accessToken").asString();
            var initial = accepted.path("body").path("initial");
            role = initial.path("role").path("id").asString();
            assertEquals(0, initial.path("mainChapter").path("maxCleared").asInt());
            assertMilestones(initial.path("mainChapter"), List.of());
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_milestone WHERE role_id=?",
                    Integer.class, role));
            long before = roles.revision(role);
            new TransactionTemplate(transactions).executeWithoutResult(status -> {
                roles.lock(role);
                jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,?)", role, 7);
                jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,?)", role, 2);
                sync.changed(role);
                sync.changed(role);
            });
            var event = peer.messages.poll(5, TimeUnit.SECONDS);
            assertNotNull(event, "真实持久集合提交后未发送完整状态");
            assertEquals("state.changed", event.path("name").asString());
            assertMilestones(event.path("body").path("mainChapter"), List.of(2, 7));
            revision = roles.revision(role);
            assertEquals(before + 1, revision, "同事务多次变更只登记一次统一版本");
            assertEquals(revision, event.path("body").path("mainChapter").path("assetRevision").asLong());
            assertEquals(revision, event.path("body").path("revision").asLong());
            write("milestone-event", event);
            assertTrue(peer.request("session.heartbeat", Map.of()).path("ok").asBoolean());
            assertTrue(peer.events.isEmpty(), "只读心跳不得补写或重复推送里程碑进度");
        }
        try (var restored = new Peer()) {
            var accepted = restored.authenticate(token);
            assertTrue(accepted.path("ok").asBoolean());
            assertFalse(accepted.path("body").has("session"), "互通文件不保存签发凭证");
            assertMilestones(accepted.path("body").path("initial").path("mainChapter"), List.of(2, 7));
            assertEquals(revision, roles.revision(role), "重新鉴权只读取原集合，不改资产版本");
            write("milestone-auth", accepted);
            java.nio.file.Files.write(java.nio.file.Path.of("target/chapter-config-scope.pb"), GameProtocolCodec.encode(accepted));
        }
        var other = login.login("milestone_" + UUID.randomUUID().toString().substring(0, 12));
        try (var peer = new Peer()) {
            var accepted = peer.authenticate(other.session().accessToken());
            assertMilestones(accepted.path("body").path("initial").path("mainChapter"), List.of());
            write("milestone-empty", accepted);
        }
    }

    /** 校验协议下发默认 550 关及真实里程碑集合，保留空数组和缺字段的区别。 */
    private void assertMilestones(JsonNode state, List<Integer> expected) {
        assertTrue(state.has("challengeLimit"), "新快照必须交付当前服务端可信范围");
        assertEquals(550, state.path("challengeLimit").asInt());
        assertTrue(state.has("milestoneProgress"), "新版统一状态必须明确交付里程碑集合");
        var progress = state.path("milestoneProgress");
        assertEquals(1, progress.path("schemaVersion").asInt());
        assertTrue(progress.path("claimedIds").isArray());
        var ids = new ArrayList<Integer>();
        progress.path("claimedIds").forEach(id -> ids.add(id.asInt()));
        assertEquals(expected, ids);
    }

    /** 原生 WebSocket 走实际信封，确认新号首战、独立领装备、扣碎片、批量升级和重登恢复。 */
    @Test void firstRewardAndFragmentReceiptsRoundTripOverRealSocket() throws Exception {
        var player = login.login("growth_" + UUID.randomUUID().toString().substring(0, 12));
        String token = player.session().accessToken();
        var chapter = Map.of("chapter", 1);
        String requestId = UUID.randomUUID().toString();
        String levelRequest = UUID.randomUUID().toString();
        JsonNode firstReward;
        JsonNode fragment;
        JsonNode upgradeReceipt;
        try (var peer = new Peer()) {
            var accepted = peer.authenticate(token);
            assertTrue(accepted.path("ok").asBoolean());
            var unclaimed = peer.request("chapter.firstreward.claim.status", chapter);
            assertTrue(unclaimed.path("ok").asBoolean());
            assertFalse(unclaimed.path("body").path("found").asBoolean(true));
            var tooSoon = peer.request("chapter.firstreward.claim", chapter);
            assertEquals("FIRST_REWARD_NOT_REACHED", tooSoon.path("error").path("code").asString());

            var summon = peer.request("hero.summon.first", Map.of("requestId", UUID.randomUUID().toString()));
            assertTrue(summon.path("ok").asBoolean());
            var hero = summon.path("body").path("actual").path("heroes").get(0);
            var formation = accepted.path("body").path("initial").path("mainFormation");
            assertTrue(peer.request("formation.save", Map.of("requestId", UUID.randomUUID().toString(),
                    "expectedVersion", formation.path("version").asLong(), "formationId", formation.path("formationId").asInt(),
                    "slots", List.of(Map.of("position", 2, "heroId", hero.path("instanceId").asString())))).path("ok").asBoolean());
            var battle = peer.request("chapter.challenge", Map.of("requestId", UUID.randomUUID().toString()));
            assertEquals(1, battle.path("body").path("state").path("maxCleared").asInt());
            var settled = peer.request("chapter.claim", Map.of("battleId", battle.path("body").path("battleId").asString()));
            assertTrue(settled.path("ok").asBoolean());

            var first = peer.request("chapter.firstreward.claim", chapter);
            assertTrue(first.path("ok").asBoolean(), first.toString());
            firstReward = first.path("body");
            assertEquals(1001001, firstReward.path("actual").path("items").get(0).path("itemId").asInt());
            assertEquals(firstReward, peer.request("chapter.firstreward.claim", chapter).path("body"));

            var combined = peer.request("bag.fragment.combine", Map.of("requestId", requestId, "itemId", 20204004, "quantity", 1));
            assertTrue(combined.path("ok").asBoolean(), combined.toString());
            fragment = combined.path("body");
            assertEquals(30, fragment.path("costQuantity").asLong());
            assertEquals(10204004, fragment.path("actual").path("heroes").get(0).path("templateId").asInt());

            var statusBefore = peer.request("hero.level.upgrade.status", Map.of("requestId", levelRequest));
            assertTrue(statusBefore.path("ok").asBoolean(), statusBefore.toString());
            assertFalse(statusBefore.path("body").path("found").asBoolean(true));
            long beforeRevision = roles.revision(player.role().id());
            var level = Map.of("requestId", levelRequest, "heroId", hero.path("instanceId").asString(),
                    "expectedLevel", 1, "levels", 5);
            var upgraded = peer.request("hero.level.upgrade", level);
            assertTrue(upgraded.path("ok").asBoolean(), upgraded.toString());
            upgradeReceipt = upgraded.path("body");
            assertEquals(1, upgradeReceipt.path("fromLevel").asInt());
            assertEquals(6, upgradeReceipt.path("toLevel").asInt());
            assertEquals(beforeRevision + 1, upgradeReceipt.path("assetRevision").asLong());
            assertEquals(player.role().id(), upgradeReceipt.path("roleId").asString());
            assertTrue(peer.events.stream().anyMatch(event -> event.path("name").asString().equals("state.changed")
                    && event.path("body").path("revision").asLong() == beforeRevision + 1));
            assertEquals(upgradeReceipt, peer.request("hero.level.upgrade", level).path("body"));
            assertEquals(beforeRevision + 1, roles.revision(player.role().id()));
        }
        try (var restored = new Peer()) {
            var accepted = restored.authenticate(token);
            assertTrue(accepted.path("ok").asBoolean());
            var initial = accepted.path("body").path("initial");
            assertEquals(1, initial.path("mainChapter").path("firstRewardProgress").path("claimedChapters").get(0).asInt());
            assertEquals(2, initial.path("heroes").size());
            assertEquals(firstReward, restored.request("chapter.firstreward.claim.status", chapter).path("body").path("receipt"));
            assertEquals(fragment, restored.request("bag.fragment.combine.status", Map.of("requestId", requestId))
                    .path("body").path("receipt"));
            assertEquals(upgradeReceipt, restored.request("hero.level.upgrade.status", Map.of("requestId", levelRequest))
                    .path("body").path("receipt"));
            assertEquals(3590, initial.path("role").path("gold").asLong());
            assertTrue(initial.path("inventory").valueStream()
                    .anyMatch(item -> item.path("itemId").asInt() == 900101 && item.path("quantity").asLong() == 395));
            assertTrue(initial.path("heroes").valueStream().anyMatch(hero ->
                    hero.path("id").asString().equals(upgradeReceipt.path("heroId").asString())
                            && hero.path("level").asInt() == 6));
        }
    }

    /** 独立库真实协议跑通前三关与第四关准入，核对冻结伤害、经验、重连和默认 550 关上限。 */
    @Test void challengeRestoreReplayAndClaimThroughBinarySocket() throws Exception {
        var player = login.login("test_" + UUID.randomUUID().toString().substring(0, 12));
        String role = player.role().id();
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,100,1)", hero, role);
        String token = player.session().accessToken();
        try (var peer = new Peer()) {
            var init = peer.authenticate(token);
            assertEquals(0, init.path("body").path("initial").path("mainChapter").path("maxCleared").asInt());
            assertMilestones(init.path("body").path("initial").path("mainChapter"), List.of());
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
                assertFalse(original.path("body").has("actual"), "未结算战报不携带虚构到账");
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
                for (var unit : replay.path("body").path("replay").path("units")) {
                    assertTrue(unit.has("totalDamage"));
                    assertTrue(unit.has("totalTakenDamage"));
                    assertTrue(unit.has("totalRecovery"));
                    assertTrue(unit.path("star").asInt() > 0);
                    assertTrue(unit.path("totalDamage").asLong() >= 0);
                }
                var beforeExperience = jdbc.queryForMap("SELECT role_level,role_experience FROM game_role WHERE id=?", role);
                var claim = peer.request("chapter.claim", Map.of("battleId", battle));
                assertTrue(claim.path("ok").asBoolean(), claim.toString());
                assertFalse(claim.path("body").path("rewards").isEmpty());
                var actual = claim.path("body").path("actual");
                assertMilestones(claim.path("body").path("state"), List.of());
                assertEquals(role, actual.path("roleId").asString());
                assertFalse(actual.path("items").isEmpty());
                assertTrue(actual.has("bonuses"), "协议须保留已确认无附赠与旧明细缺失的区别");
                long bonusDiamonds = 0;
                for (var bonus : actual.path("bonuses")) {
                    assertEquals("ROLE_LEVEL_UP", bonus.path("source").asString());
                    assertEquals(900002, bonus.path("itemId").asInt());
                    bonusDiamonds += bonus.path("quantity").asLong();
                }
                assertEquals(mission == 2 ? 0 : 10, bonusDiamonds, "前三关仅真实升级赠钻，不凭额外奖励提示发里程碑奖励");
                if (mission == 1) {
                    write("reward-settled", claim);
                }
                var roleAfter = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role);
                var experience = claim.path("body").path("experience");
                assertEquals(((Number) beforeExperience.get("role_level")).intValue(), experience.path("beforeLevel").asInt());
                assertEquals(((Number) beforeExperience.get("role_experience")).longValue(), experience.path("beforeExp").asLong());
                assertEquals(((Number) roleAfter.get("role_level")).intValue(), experience.path("afterLevel").asInt());
                assertEquals(((Number) roleAfter.get("role_experience")).longValue(), experience.path("afterExp").asLong());
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
            assertEquals(550, init.path("body").path("initial").path("mainChapter").path("challengeLimit").asInt());
            var fourth = peer.request("chapter.challenge", Map.of("requestId", UUID.randomUUID().toString()));
            assertTrue(fourth.path("ok").asBoolean(), fourth.toString());
            assertEquals(4, fourth.path("body").path("state").path("maxCleared").asInt());
        }
        assertEquals(4, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_battle WHERE role_id=?", Integer.class, role));
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
        // 已通关夹具必须具有已存在的计时；登录和挑战均不能替缺行猜补免费起点。
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,?)",
                role, java.time.Instant.now().getEpochSecond() - 60);
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
