/**
 * 主线、独立通关奖励和 VIP 契约的真实 WebSocket 回归，核对提交事件和重新鉴权。
 * 使用独立H2和随机端口，验证真实发放、状态更新与回执重放。
 */
package com.funsgamex.mxzg;
import com.funsgamex.mxzg.auth.*;
import com.funsgamex.mxzg.campaign.IdleActivityMaintenanceService;
import com.funsgamex.mxzg.friend.FriendService;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.Unit;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import com.funsgamex.mxzg.time.GameClock;
import com.funsgamex.mxzg.trial.TrialService;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import tools.jackson.databind.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:chapter_socket;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false",
    "mxzg.dreamland.max-floor=${mxzg.test.dreamland.floor-limit:35}", "mxzg.trial-maintenance.enabled=false"})
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
    /** 隔离角色的前置经验按真实升级门槛准备。 */
    @Autowired RoleRules roleRules;
    /** 按真实英雄养成上限准备可挑战的阵容。 */
    @Autowired HeroGrowthRules growth;
    /** 只为隔离的 600 层连战测试加强攻方，守军和结算仍走实际执行入口。 */
    @MockitoSpyBean HeroLineupBattleService lineupBattles;
    /** 测试角色的两名奖励英雄经正常发奖事务入库。 */
    @Autowired RewardGrantService grants;
    /** 构造奖励事务时使用与游戏一致的时间。 */
    @Autowired GameClock clock;
    /** 为快速战斗样本准备独立区服的可信挂机活动控制。 */
    @Autowired IdleActivityMaintenanceService idleActivity;
    /** 隔离好友关系通过正式申请与同意建立。 */
    @Autowired FriendService friends;
    /** 助战次日结算由测试选择时刻调用同一邮件事务。 */
    @Autowired TrialService trials;
    private final class Peer implements WebSocket.Listener, AutoCloseable {
        final HttpClient client = HttpClient.newHttpClient();
        final BlockingQueue<JsonNode> messages = new LinkedBlockingQueue<>();
        /** 请求等待期间先到的提交事件单独保存，模拟真实客户端按kind路由。 */
        final BlockingQueue<JsonNode> events = new LinkedBlockingQueue<>();
        final CompletableFuture<Integer> closed = new CompletableFuture<>();
        final java.io.ByteArrayOutputStream fragments = new java.io.ByteArrayOutputStream();
        /** 批量客户端的帧间隔，零表示其他业务专项使用普通请求时序。 */
        final Duration frameGap;
        WebSocket socket;
        String connectionId;

        /** 创建不增加发包延迟的普通测试连接。 */
        Peer() {
            this(Duration.ZERO);
        }

        /** 保留服务端的生产帧限制，由批量测试连接主动控制发送速率。 */
        Peer(Duration frameGap) {
            this.frameGap = frameGap;
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

        /** 按配置的最小间隔发包，并确认服务器回显 id；事件测试单独读取队列。 */
        JsonNode request(String name, Object body) throws Exception {
            if (!frameGap.isZero()) {
                Thread.sleep(frameGap);
            }
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

    /** 一个隔离角色经真实协议推进主线、塔和竞技场，核对提交后的任务进度、四项奖励及冷登录恢复。 */
    @Test void advancesVipAfterRealMainTowerAndArenaSettlements() throws Exception {
        String account = "contract_" + UUID.randomUUID().toString().substring(0, 12);
        var player = login.login(account, "local-1");
        String role = player.role().id();
        String token = player.session().accessToken();
        jdbc.update("UPDATE game_role SET role_level=16,goddess_vip=1 WHERE id=?", role);
        String weak = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,1,1)", weak, role);
        var team = new ArrayList<Map<String, Object>>();
        int[] templates = {10104004, 10505005, 10204005, 10204004, 10405005};
        int[] positions = {2, 3, 5, 6, 7};
        for (int index = 0; index < templates.length; index++) {
            String hero = UUID.randomUUID().toString();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,?,?,?)",
                hero, role, templates[index], 100, index == 1 || index == 4 ? 5 : 4);
            team.add(Map.of("position", positions[index], "heroId", hero));
        }

        Map<String, Object> losingCommand;
        JsonNode losingReceipt;
        try (var peer = new Peer()) {
            assertTrue(peer.authenticate(token).path("ok").asBoolean());
            long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, role);
            var weakTeam = Map.of("requestId", UUID.randomUUID().toString(), "expectedVersion", version,
                "formationId", 1, "slots", List.of(Map.of("position", 2, "heroId", weak)));
            var saved = success(peer, "formation.save", weakTeam);
            var list = success(peer, "arena.state", Map.of());
            assertEquals(3, list.path("opponents").size());
            losingCommand = Map.of("requestId", UUID.randomUUID().toString(),
                "opponentId", list.path("opponents").get(0).path("id").asInt());
            losingReceipt = success(peer, "arena.challenge", losingCommand);
            assertFalse(losingReceipt.path("record").path("won").asBoolean());
            assertEquals(1, losingReceipt.path("state").path("settledChallenges").asInt());
            assertEquals(0, losingReceipt.path("state").path("robotWins").asInt());
            // 同连接的下一次响应会将挑战回包之后抵达的提交通知收进事件队列。
            success(peer, "session.heartbeat", Map.of());
            assertTrue(peer.events.stream().anyMatch(event -> vipProgress(event.path("body"), 100700) == 1));
            write("vip-arena-loss", losingReceiptFrame(peer, losingCommand, losingReceipt));

            success(peer, "formation.save", Map.of("requestId", UUID.randomUUID().toString(),
                "expectedVersion", saved.path("version").asLong(), "formationId", 1, "slots", team));
            for (int mission = 1; mission <= 10; mission++) {
                advanceChapter(peer, mission);
            }
        }

        try (var peer = new Peer()) {
            assertTrue(peer.authenticate(token).path("ok").asBoolean());
            for (int mission = 11; mission <= 20; mission++) {
                advanceChapter(peer, mission);
            }
            var state = success(peer, "tower.state", Map.of());
            assertEquals(0, state.path("highestCleared").asInt());
            assertEquals(30, state.path("floors").size());
            assertEquals(3, state.path("milestones").size());
            long towerVersion = state.path("formationVersion").asLong();
            var independent = new ArrayList<>(team);
            Collections.swap(independent, 0, 1);
            independent.set(0, Map.of("position", 2, "heroId", team.get(1).get("heroId")));
            independent.set(1, Map.of("position", 3, "heroId", team.get(0).get("heroId")));
            var towerTeam = success(peer, "tower.formation.save",
                Map.of("expectedVersion", towerVersion, "formationId", 1, "slots", independent));
            assertEquals(team.get(1).get("heroId"), towerTeam.path("slots").get(0).path("heroId").asString());
        }

        try (var peer = new Peer()) {
            assertTrue(peer.authenticate(token).path("ok").asBoolean());
            int energy = success(peer, "tower.state", Map.of()).path("energy").asInt();
            for (int floor = 1; floor <= 10; floor++) {
                var command = Map.of("requestId", UUID.randomUUID().toString(), "floor", floor);
                var response = peer.request("tower.challenge", command);
                assertTrue(response.path("ok").asBoolean(), response.toString());
                var result = response.path("body");
                assertTrue(result.path("won").asBoolean(), "第 " + floor + " 层须真实获胜");
                assertEquals(floor, result.path("state").path("highestCleared").asInt());
                assertEquals(energy, result.path("state").path("energy").asInt());
                assertEquals("tower:" + floor, result.path("replay").path("scenario").asString());
                assertFalse(result.path("actual").path("items").isEmpty());
                write("vip-tower-" + floor, response);
                if (floor == 10) {
                    assertTrue(peer.events.stream().anyMatch(event -> vipProgress(event.path("body"), 100800) == 10));
                    assertEquals(result, success(peer, "tower.challenge", command));
                }
            }
            var sweep = success(peer, "tower.sweep",
                Map.of("requestId", UUID.randomUUID().toString(), "floor", 10, "maxDiamonds", 0));
            assertEquals("SWEEP", sweep.path("action").asString());
            assertFalse(sweep.has("replay"));
            var milestone = success(peer, "tower.milestone.claim",
                Map.of("requestId", UUID.randomUUID().toString(), "milestoneId", 1));
            assertTrue(milestone.path("state").path("milestone").path("claimed").asBoolean());
            assertEquals(2, milestone.path("actual").path("items").size());
        }

        String finalClaim = UUID.randomUUID().toString();
        long beforeClaim;
        try (var peer = new Peer()) {
            var accepted = peer.authenticate(token);
            assertTrue(accepted.path("ok").asBoolean());
            assertEquals(20, vipProgress(accepted.path("body").path("initial"), 100500));
            assertTrue(vipProgress(accepted.path("body").path("initial"), 100600) >= 15);
            assertEquals(10, vipProgress(accepted.path("body").path("initial"), 100800));
            assertEquals(losingReceipt, success(peer, "arena.challenge", losingCommand));
            var report = success(peer, "arena.replay",
                Map.of("battleId", losingReceipt.path("record").path("battleId").asString()));
            assertEquals(losingReceipt.path("replay"), report);
            for (int participation = 2; participation <= 3; participation++) {
                var list = success(peer, "arena.refresh", Map.of());
                var response = peer.request("arena.challenge", Map.of("requestId", UUID.randomUUID().toString(),
                    "opponentId", list.path("opponents").get(0).path("id").asInt()));
                assertTrue(response.path("ok").asBoolean(), response.toString());
                var result = response.path("body");
                assertTrue(result.path("record").path("won").asBoolean());
                assertEquals(participation, result.path("state").path("settledChallenges").asInt());
                assertEquals(participation - 1, result.path("state").path("robotWins").asInt());
                write("vip-arena-win-" + participation, response);
            }
            success(peer, "session.heartbeat", Map.of());
            assertTrue(peer.events.stream().anyMatch(event -> vipProgress(event.path("body"), 100700) == 3));
            beforeClaim = roles.findById(role).orElseThrow().diamonds();
            for (int task : List.of(100500, 100600, 100700, 100800)) {
                var body = Map.of("taskId", task, "requestId", task == 100800 ? finalClaim : UUID.randomUUID().toString());
                var paid = success(peer, "vip.claim", body);
                var item = paid.path("notice").path("items").get(0);
                assertEquals(900002, item.path("itemId").asInt());
                assertEquals(30, item.path("credited").asInt());
            }
            assertEquals(beforeClaim + 120, roles.findById(role).orElseThrow().diamonds());
            assertTrue(peer.events.stream().anyMatch(event -> event.path("body").path("vip").path("level").asInt() == 2));
        }

        try (var peer = new Peer()) {
            var restored = success(peer, "session.login", Map.of("account", account, "serverId", "local-1",
                "clientInstanceId", UUID.randomUUID().toString()));
            peer.connectionId = restored.path("connectionId").asString();
            var snapshot = restored.path("initial");
            assertEquals(role, snapshot.path("role").path("id").asString());
            assertEquals(2, snapshot.path("vip").path("level").asInt());
            assertEquals(beforeClaim + 120, snapshot.path("role").path("diamonds").asLong());
            assertEquals(10, success(peer, "tower.state", Map.of()).path("highestCleared").asInt());
            assertEquals(3, success(peer, "arena.state", Map.of()).path("settledChallenges").asInt());
            success(peer, "vip.claim", Map.of("taskId", 100800, "requestId", finalClaim));
            assertEquals(beforeClaim + 120, roles.findById(role).orElseThrow().diamonds());
        }
    }

    /** 用同一角色实际结算第 70 关并升到 25 级，完成副本和召唤后领取整档奖励。 */
    @Test void advancesVipAfterMainSeventyDailyDungeonAndFiveStarGrants() throws Exception {
        String account = "contract_three_" + UUID.randomUUID().toString().substring(0, 10);
        var player = login.login(account, "local-1");
        String role = player.role().id();
        jdbc.update("UPDATE game_role SET role_level=24,role_experience=?,goddess_vip=2 WHERE id=?",
            roleRules.threshold(24) - 1, role);
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,69)", role);
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,?)", role, clock.epochSeconds());
        String leader = UUID.randomUUID().toString();
        int star = MainChapterProgressionPreview.lateChapterLeaderStar(550);
        int level = growth.limit(200, 6, star);
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,?,?,6)",
            leader, role, level, star);
        var team = MainChapterProgressionPreview.prepareLateChapterLineup(jdbc, role, leader, 200, star, level).stream()
            .map(slot -> Map.of("position", slot.position(), "heroId", slot.heroId())).toList();
        var command = Map.of("taskId", 101200, "requestId", UUID.randomUUID().toString());
        long expectedBalance;
        JsonNode finalReceipt;
        try (var peer = new Peer()) {
            var auth = peer.authenticate(player.session().accessToken());
            assertTrue(auth.path("ok").asBoolean(), auth.toString());
            var initial = auth.path("body").path("initial");
            assertEquals(69, vipProgress(initial, 100900));
            assertEquals(24, vipProgress(initial, 101000));
            assertEquals(0, vipProgress(initial, 101100));
            assertEquals(0, vipProgress(initial, 101200));

            long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, role);
            success(peer, "formation.save", Map.of("requestId", UUID.randomUUID().toString(),
                "expectedVersion", version, "formationId", 1, "slots", team));
            advanceChapter(peer, 70);
            assertTrue(peer.events.stream().anyMatch(event -> vipProgress(event.path("body"), 100900) == 70
                && vipProgress(event.path("body"), 101000) == 25));

            var dungeon = Map.of("requestId", UUID.randomUUID().toString(), "stageId", 1,
                "sweep", false, "maxDiamonds", 0);
            var result = success(peer, "dungeon.gold.challenge", dungeon);
            assertTrue(result.path("won").asBoolean());
            assertTrue(peer.events.stream().anyMatch(event -> vipProgress(event.path("body"), 101100) == 1));
            assertEquals(result, success(peer, "dungeon.gold.challenge", dungeon));

            new TransactionTemplate(transactions).executeWithoutResult(status -> {
                var actual = grants.grant(role, List.of(new RewardGrantService.Reward(10205020, 2)),
                    new RewardGrantService.Context(clock.epochSeconds(), 0), ThreadLocalRandom.current());
                assertEquals(2, actual.heroes().size());
            });
            var draw = success(peer, "hero.summon", Map.of("requestId", UUID.randomUUID().toString(),
                "pool", "ADVANCED", "count", 1, "maxDiamonds", 0));
            assertEquals(5, draw.path("actual").path("heroes").get(0).path("star").asInt());
            assertTrue(peer.events.stream().anyMatch(event -> vipProgress(event.path("body"), 101200) == 3));
            assertTrue(peer.events.stream().noneMatch(event -> vipProgress(event.path("body"), 101100) > 1));

            expectedBalance = roles.findById(role).orElseThrow().diamonds() + 120;
            for (int taskId : List.of(100900, 101000, 101100)) {
                var reward = success(peer, "vip.claim", Map.of("taskId", taskId, "requestId", UUID.randomUUID().toString()));
                assertVipThreeTaskReward(reward);
            }
            finalReceipt = success(peer, "vip.claim", command);
            assertVipThreeTaskReward(finalReceipt);
            assertTrue(peer.events.stream().anyMatch(event -> event.path("body").path("vip").path("level").asInt() == 3));
            assertEquals(expectedBalance, roles.findById(role).orElseThrow().diamonds());
        }

        try (var peer = new Peer()) {
            var restored = success(peer, "session.login", Map.of("account", account, "serverId", "local-1",
                "clientInstanceId", UUID.randomUUID().toString()));
            peer.connectionId = restored.path("connectionId").asString();
            var snapshot = restored.path("initial");
            assertEquals(role, snapshot.path("role").path("id").asString());
            assertEquals(3, snapshot.path("vip").path("level").asInt());
            assertEquals(expectedBalance, snapshot.path("role").path("diamonds").asLong());
            assertEquals(finalReceipt, success(peer, "vip.claim", command));
            assertEquals(expectedBalance, roles.findById(role).orElseThrow().diamonds());
        }
    }

    /** 一个角色用真实主线、召唤、快速战斗和幻境协议达标后，领取四份 VIP4 契约奖励。 */
    @Test void advancesVipAfterQuickBattleAcrossMidnightAndTowerThirty() throws Exception {
        String account = "contract_four_" + UUID.randomUUID().toString().substring(0, 10);
        long now = java.time.Instant.parse("2026-11-24T04:00:00Z").getEpochSecond();
        String server = "vip-four-test";
        jdbc.update("INSERT INTO game_server(id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)",
            server, "vip", "测试区", "契约验收");
        idleActivity.configure(server, now - 86400, Optional.empty(), now);
        clock.setEpochSeconds(now);
        try {
            var player = login.login(account, server);
            String role = player.role().id();
            String token = player.session().accessToken();
            jdbc.update("UPDATE game_server SET opened_at_seconds=? WHERE id='local-1'", now - 86400);
            jdbc.update("UPDATE game_role SET role_level=31,diamonds=4000,goddess_vip=3 WHERE id=?", role);
            jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,99)", role);
            jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,?)", role, now);
            String leader = UUID.randomUUID().toString();
            int star = MainChapterProgressionPreview.lateChapterLeaderStar(550);
            int level = growth.limit(200, 6, star);
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,?,?,6)",
                leader, role, level, star);
            var team = MainChapterProgressionPreview.prepareLateChapterLineup(jdbc, role, leader, 200, star, level).stream()
                .map(slot -> Map.of("position", slot.position(), "heroId", slot.heroId())).toList();

            try (var peer = new Peer()) {
                var authenticated = peer.authenticate(token);
                assertTrue(authenticated.path("ok").asBoolean(), authenticated.path("error").toString());
                var initial = authenticated.path("body").path("initial");
                assertEquals(99, vipProgress(initial, 101300));
                assertEquals(0, vipProgress(initial, 101400));
                assertEquals(0, vipProgress(initial, 101500));
                assertEquals(0, vipProgress(initial, 101600));
                long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, role);
                success(peer, "formation.save", Map.of("requestId", UUID.randomUUID().toString(),
                    "expectedVersion", version, "formationId", 1, "slots", team));
                advanceChapter(peer, 100);
                success(peer, "hero.summon", Map.of("requestId", UUID.randomUUID().toString(),
                    "pool", "ADVANCED", "count", 10, "maxDiamonds", 1980));
                assertTrue(peer.events.stream().anyMatch(event -> vipProgress(event.path("body"), 101400) == 10));

                var quote = success(peer, "chapter.quick-battle.info", Map.of());
                int used = 0;
                for (int price : List.of(0, 50, 100, 200)) {
                    assertEquals(used++, quote.path("usedCount").asInt());
                    assertEquals(price, quote.path("costDiamonds").asInt());
                    var command = quickCommand(quote);
                    var response = peer.request("chapter.quick-battle.claim", command);
                    assertTrue(response.path("ok").asBoolean(), response.path("error").toString());
                    if (price == 0) {
                        write("quick-battle", response);
                    }
                    var result = response.path("body");
                    assertTrue(result.path("actual").path("items").size() > 0);
                    assertEquals(result, success(peer, "chapter.quick-battle.claim", command));
                    quote = result.path("state");
                }
                assertEquals(4, quote.path("usedCount").asInt());
                assertTrue(peer.events.stream().anyMatch(event -> vipProgress(event.path("body"), 101500) == 4));
                clock.setEpochSeconds(quote.path("resetAt").asLong() + 2);
                quote = success(peer, "chapter.quick-battle.info", Map.of());
                assertEquals(0, quote.path("usedCount").asInt());
                assertEquals(0, quote.path("costDiamonds").asInt());
                success(peer, "chapter.quick-battle.claim", quickCommand(quote));
                assertTrue(peer.events.stream().anyMatch(event -> vipProgress(event.path("body"), 101500) == 5));

                var tower = success(peer, "tower.state", Map.of());
                assertEquals(30, tower.path("maxFloor").asInt());
                success(peer, "tower.formation.save", Map.of("expectedVersion", tower.path("formationVersion").asLong(),
                    "formationId", 1, "slots", team));
            }

            // 每次连接最多走十五层，保持与生产连接限速相同。
            for (int start : List.of(1, 16)) {
                try (var peer = new Peer()) {
                    assertTrue(peer.authenticate(token).path("ok").asBoolean());
                    for (int floor = start; floor < start + 15; floor++) {
                        var result = success(peer, "tower.challenge",
                            Map.of("requestId", UUID.randomUUID().toString(), "floor", floor));
                        assertTrue(result.path("won").asBoolean(), "幻境第 " + floor + " 层");
                        assertEquals(floor, result.path("state").path("highestCleared").asInt());
                    }
                }
            }

            long balance = roles.findById(role).orElseThrow().diamonds();
            var lastCommand = Map.of("taskId", 101600, "requestId", UUID.randomUUID().toString());
            JsonNode last;
            try (var peer = new Peer()) {
                var authenticated = peer.authenticate(token);
                assertTrue(authenticated.path("ok").asBoolean(), authenticated.path("error").toString());
                var initial = authenticated.path("body").path("initial");
                var progress = initial.path("vip").path("tasks").valueStream()
                    .map(task -> task.path("progress").asInt(-1)).toList();
                assertEquals(List.of(100, 10, 5, 30), progress);
                for (int taskId : List.of(101300, 101400, 101500)) {
                    assertVipFourReward(success(peer, "vip.claim",
                        Map.of("taskId", taskId, "requestId", UUID.randomUUID().toString())));
                }
                last = success(peer, "vip.claim", lastCommand);
                assertVipFourReward(last);
                assertTrue(peer.events.stream().anyMatch(event -> event.path("body").path("vip").path("level").asInt() == 4));
            }
            try (var peer = new Peer()) {
                var restored = success(peer, "session.login", Map.of("account", account, "serverId", server,
                    "clientInstanceId", UUID.randomUUID().toString()));
                peer.connectionId = restored.path("connectionId").asString();
                assertEquals(4, restored.path("initial").path("vip").path("level").asInt());
                assertEquals(balance + 160, restored.path("initial").path("role").path("diamonds").asLong());
                assertEquals(last, success(peer, "vip.claim", lastCommand));
                assertEquals(balance + 160, roles.findById(role).orElseThrow().diamonds());
            }
        } finally {
            clock.reset();
        }
    }

    /** 用刚读到的当前报价生成快速战斗请求。 */
    private static Map<String, Object> quickCommand(JsonNode quote) {
        return Map.of("requestId", UUID.randomUUID().toString(), "resetAt", quote.path("resetAt").asLong(),
            "usedCount", quote.path("usedCount").asInt());
    }

    /** VIP3 档的四个任务各自发放四十钻。 */
    private static void assertVipFourReward(JsonNode receipt) {
        var item = receipt.path("notice").path("items").get(0);
        assertEquals(900002, item.path("itemId").asInt());
        assertEquals(40, item.path("credited").asInt());
    }

    /** VIP2 档单项发奖的通用反馈匹配真实到账的 30 钻。 */
    private static void assertVipThreeTaskReward(JsonNode receipt) {
        var item = receipt.path("notice").path("items").get(0);
        assertEquals(900002, item.path("itemId").asInt());
        assertEquals(30, item.path("credited").asInt());
    }

    /** 经真实会话和 Protobuf 验证试炼首败续战、十五关、宝箱、重连、任务及次日回退。 */
    @Test void playsCompleteNormalTrialOverWebSocket() throws Exception {
        long now = java.time.Instant.parse("2026-11-25T15:00:00Z").getEpochSecond();
        clock.setEpochSeconds(now);
        try {
            var player = login.login("trial_" + UUID.randomUUID().toString().substring(0, 12), "local-1");
            var token = player.session().accessToken();
            var role = player.role().id();
            jdbc.update("UPDATE game_role SET role_level=30,created_at_seconds=? WHERE id=?", now, role);
            String weak = UUID.randomUUID().toString();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,40,1)",
                    weak, role);
            Map<String, Object> retry;
            JsonNode losing;
            long reset;
            try (var peer = new Peer(Duration.ofMillis(40))) {
                assertTrue(peer.authenticate(token).path("ok").asBoolean());
                var state = success(peer, "trial.state", Map.of());
                assertEquals(30, state.path("minimumLevel").asInt());
                assertEquals(0, state.path("difficulty").asInt());
                assertEquals(3, state.path("difficulties").size());
                var invalid = dreamlandCommand(state, "selectDifficulty");
                invalid.put("choice", 2);
                assertEquals("TRIAL_DIFFICULTY_UNAVAILABLE", peer.request("trial.act", invalid)
                        .path("error").path("code").asString());
                assertEquals(state, success(peer, "trial.state", Map.of()));
                var select = dreamlandCommand(state, "selectDifficulty");
                select.put("choice", 1);
                var choice = peer.request("trial.act", select);
                assertTrue(choice.path("ok").asBoolean(), choice.toString());
                writeTrial("difficulty", choice);
                state = choice.path("body").path("state");
                assertEquals(20, state.path("nodes").size());
                assertEquals(1, state.path("currentNode").asInt());
                assertEquals(6, state.path("nodes").get(0).path("opponent").path("heroes").size());
                reset = state.path("resetAtSeconds").asLong();
                var save = dreamlandCommand(state, "saveFormation");
                save.put("formationId", 1);
                save.put("slots", List.of(Map.of("position", 2, "heroId", weak)));
                state = success(peer, "trial.act", save).path("state");
                retry = dreamlandCommand(state, "fight");
                retry.put("choice", 1);
                var loss = peer.request("trial.act", retry);
                assertTrue(loss.path("ok").asBoolean(), loss.toString());
                losing = loss.path("body");
                assertFalse(losing.path("state").path("battle").path("won").asBoolean());
                assertEquals(0, losing.path("state").path("heroHealth").get(0).path("hp").asLong());
                assertEquals(1, losing.path("state").path("currentNode").asInt());
                writeTrial("loss", loss);
            }

            try (var peer = new Peer(Duration.ofMillis(40))) {
                assertTrue(peer.authenticate(token).path("ok").asBoolean());
                var state = success(peer, "trial.state", Map.of());
                assertEquals(losing.path("state"), state);
                assertEquals(losing, success(peer, "trial.act", retry));
                String leader = UUID.randomUUID().toString();
                int level = growth.limit(200, 6, 14);
                jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,?,14,6)",
                        leader, role, level);
                var save = dreamlandCommand(state, "saveFormation");
                save.put("formationId", 1);
                save.put("slots", List.of(Map.of("position", 2, "heroId", weak),
                        Map.of("position", 3, "heroId", leader)));
                state = success(peer, "trial.act", save).path("state");
                for (int battle = 1; battle <= 15; battle++) {
                    int node = state.path("currentNode").asInt();
                    var fight = dreamlandCommand(state, "fight");
                    fight.put("choice", node);
                    var reply = peer.request("trial.act", fight);
                    assertTrue(reply.path("ok").asBoolean(), reply.toString());
                    var receipt = reply.path("body");
                    var next = receipt.path("state");
                    assertTrue(next.path("battle").path("won").asBoolean(), "试炼战斗 " + battle + " 未胜利");
                    if (battle == 1) {
                        assertDreamlandCredit(receipt, 901201, 55);
                        var firstReportUnits = losing.path("state").path("battle").path("replay").path("units");
                        var retryUnits = next.path("battle").path("replay").path("units");
                        assertEquals(firstReportUnits.size() + 1, retryUnits.size());
                        assertEquals(0, retryUnits.get(0).path("initialHp").asLong());
                        var carriedDefense = losing.path("state").path("nodes").get(0).path("opponent").path("heroes");
                        for (var defender : carriedDefense) {
                            var unit = retryUnits.valueStream().filter(row -> row.path("faction").asInt() == 2
                                    && row.path("position").asInt() == defender.path("position").asInt())
                                    .findFirst().orElseThrow();
                            assertEquals(defender.path("hp").asLong(), unit.path("initialHp").asLong());
                        }
                        writeTrial("fight", reply);
                    }
                    if (battle % 3 == 0) {
                        var claim = dreamlandCommand(next, "claim");
                        claim.put("choice", node + 1);
                        var chest = peer.request("trial.act", claim);
                        assertTrue(chest.path("ok").asBoolean(), chest.toString());
                        next = chest.path("body").path("state");
                        if (battle == 3) {
                            assertEquals(chest.path("body"), success(peer, "trial.act", claim));
                            assertDreamlandCredit(chest.path("body"), 901201, 55);
                            writeTrial("claim", chest);
                        }
                    }
                    state = next;
                }
                assertEquals(0, state.path("currentNode").asInt());
                assertEquals(1, state.path("completedDifficulty").asInt());
                assertEquals(20, state.path("nodes").valueStream().filter(node ->
                        node.path("status").asString().equals("cleared")).count());
                var shop = success(peer, "trial.shop", Map.of());
                var buy = Map.of("requestId", UUID.randomUUID().toString(), "offerId", 1, "count", 1,
                        "refreshAt", shop.path("refreshAt").asLong());
                var purchase = peer.request("trial.shop.buy", buy);
                assertTrue(purchase.path("ok").asBoolean(), purchase.toString());
                assertEquals(purchase.path("body"), success(peer, "trial.shop.buy", buy));
                assertDreamlandCredit(purchase.path("body"), 901503, 5);
                assertEquals(875L, jdbc.queryForObject(
                        "SELECT quantity FROM game_inventory WHERE role_id=? AND item_id=901201", Long.class, role));
                writeTrial("shop-purchase", purchase);
                var quests = success(peer, "quest.list", Map.of());
                var daily = quests.path("daily").valueStream().filter(row -> row.path("id").asInt() == 13)
                        .findFirst().orElseThrow();
                assertEquals(3, daily.path("current").asLong());
                assertEquals("main_proving_lang", daily.path("destination").asString());
                clock.setEpochSeconds(reset);
                var fresh = success(peer, "trial.state", Map.of());
                assertEquals(0, fresh.path("difficulty").asInt());
                assertEquals(1, fresh.path("completedDifficulty").asInt());
                assertTrue(fresh.path("heroHealth").isEmpty());
                var resume = dreamlandCommand(fresh, "selectDifficulty");
                resume.put("choice", 1);
                var resumed = success(peer, "trial.act", resume);
                assertEquals(5, resumed.path("state").path("currentNode").asInt());
                assertDreamlandCredit(resumed, 901201, 235);
            }
        } finally {
            clock.reset();
        }
    }

    /** 下一名原守军技能未接通时，前一胜场的奖励、战报和进度仍然提交。 */
    @Test void blockedTrialOpponentKeepsPreviousVictoryAndAssets() throws Exception {
        long now = java.time.Instant.parse("2026-11-25T15:00:00Z").getEpochSecond();
        clock.setEpochSeconds(now);
        try {
            var player = login.login("trial_guard_" + UUID.randomUUID().toString().substring(0, 10), "local-1");
            String role = player.role().id();
            jdbc.update("UPDATE game_role SET role_level=30,created_at_seconds=? WHERE id=?", now, role);
            String hero = UUID.randomUUID().toString();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,?,14,6)",
                    hero, role, growth.limit(200, 6, 14));
            try (var peer = new Peer()) {
                assertTrue(peer.authenticate(player.session().accessToken()).path("ok").asBoolean());
                var state = success(peer, "trial.state", Map.of());
                var select = dreamlandCommand(state, "selectDifficulty");
                select.put("choice", 1);
                state = success(peer, "trial.act", select).path("state");
                var save = dreamlandCommand(state, "saveFormation");
                save.put("formationId", 1);
                save.put("slots", List.of(Map.of("position", 2, "heroId", hero)));
                state = success(peer, "trial.act", save).path("state");
                // 第 2 节点按历史主阵战力的 25%～30% 匹配，此区间仅含技能待接通的原守军 30。
                jdbc.update("UPDATE game_role SET max_main_power=? WHERE id=?", 181_000, role);
                var fight = dreamlandCommand(state, "fight");
                fight.put("choice", 1);
                var win = peer.request("trial.act", fight);
                assertTrue(win.path("ok").asBoolean(), win.toString());
                var receipt = win.path("body");
                assertDreamlandCredit(receipt, 901201, 55);
                var next = receipt.path("state");
                assertEquals(2, next.path("currentNode").asInt());
                assertEquals("blocked", next.path("nodes").get(1).path("status").asString());
                assertEquals(6, next.path("nodes").get(1).path("opponent").path("heroes").size());
                writeTrial("blocked", win);

                var blocked = dreamlandCommand(next, "fight");
                blocked.put("choice", 2);
                long revision = roles.revision(role);
                var rejected = peer.request("trial.act", blocked);
                assertEquals("TRIAL_OPPONENT_UNAVAILABLE", rejected.path("error").path("code").asString());
                assertEquals(next, success(peer, "trial.state", Map.of()));
                assertEquals(revision, roles.revision(role));
                assertEquals(55L, jdbc.queryForObject(
                        "SELECT quantity FROM game_inventory WHERE role_id=? AND item_id=901201", Long.class, role));
            }
        } finally {
            clock.reset();
        }
    }

    /** 双角色验证助战选择、派遣快照、保存上阵后的锁定，以及次日邮件仅到账一次。 */
    @Test void borrowsTrialFriendAcrossReconnectAndDeliversNextDayMail() throws Exception {
        long now = java.time.Instant.parse("2026-11-25T15:00:00Z").getEpochSecond();
        clock.setEpochSeconds(now);
        try {
            var owner = login.login("trial_owner_" + UUID.randomUUID().toString().substring(0, 10), "local-1");
            var borrower = login.login("trial_guest_" + UUID.randomUUID().toString().substring(0, 10), "local-1");
            String ownerId = owner.role().id();
            String borrowerId = borrower.role().id();
            String ownerToken = owner.session().accessToken();
            String borrowerToken = borrower.session().accessToken();
            jdbc.update("UPDATE game_role SET role_level=30,created_at_seconds=? WHERE id IN (?,?)",
                    now, ownerId, borrowerId);
            friends.change(borrowerId, new FriendService.Command(UUID.randomUUID().toString(),
                    FriendService.Action.APPLY, ownerId, 0));
            friends.change(ownerId, new FriendService.Command(UUID.randomUUID().toString(),
                    FriendService.Action.ACCEPT, borrowerId, 0));
            String ally = UUID.randomUUID().toString();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10204013,40,5,2)",
                    ally, ownerId);
            String strong = UUID.randomUUID().toString();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,?,14,6)",
                    strong, borrowerId, growth.limit(200, 6, 14));
            try (var peer = new Peer()) {
                assertTrue(peer.authenticate(ownerToken).path("ok").asBoolean());
                var state = success(peer, "trial.state", Map.of());
                var dispatch = dreamlandCommand(state, "dispatchAssist");
                dispatch.put("targetId", ally);
                assertTrue(success(peer, "trial.act", dispatch).path("actual").isMissingNode());
                assertEquals(40, success(peer, "trial.assistance", Map.of()).path("dispatched").get(0).path("level").asInt());
            }
            jdbc.update("UPDATE game_hero SET hero_level=50 WHERE id=?", ally);
            long reset;
            try (var peer = new Peer()) {
                assertTrue(peer.authenticate(borrowerToken).path("ok").asBoolean());
                var assist = success(peer, "trial.assistance", Map.of());
                assertEquals(40, assist.path("available").get(0).path("level").asInt());
                var select = dreamlandCommand(assist, "selectAssist");
                select.put("targetId", ally);
                var selected = success(peer, "trial.act", select).path("state");
                var save = dreamlandCommand(selected, "saveFormation");
                save.put("formationId", 1);
                save.put("slots", List.of(Map.of("position", 2, "heroId", strong), Map.of("position", 3, "heroId", ally)));
                var saved = success(peer, "trial.act", save).path("state");
                var cancel = dreamlandCommand(saved, "cancelAssist");
                cancel.put("targetId", ally);
                assertFalse(peer.request("trial.act", cancel).path("ok").asBoolean());
                assertTrue(success(peer, "trial.assistance", Map.of()).path("selected").get(0).path("used").asBoolean());
                var difficulty = dreamlandCommand(saved, "selectDifficulty");
                difficulty.put("choice", 1);
                var active = success(peer, "trial.act", difficulty).path("state");
                var fight = dreamlandCommand(active, "fight");
                fight.put("choice", 1);
                var fought = success(peer, "trial.act", fight).path("state");
                var borrowedUnit = fought.path("battle").path("replay").path("units").valueStream()
                        .filter(unit -> unit.path("faction").asInt() == 1 && unit.path("position").asInt() == 3)
                        .findFirst().orElseThrow();
                assertEquals(40, borrowedUnit.path("level").asInt());
                reset = fought.path("resetAtSeconds").asLong();
            }
            try (var peer = new Peer()) {
                assertTrue(peer.authenticate(borrowerToken).path("ok").asBoolean());
                var state = success(peer, "trial.state", Map.of());
                assertEquals(2, state.path("slots").size());
                clock.setEpochSeconds(reset);
                var next = success(peer, "trial.state", Map.of());
                assertEquals(1, next.path("slots").size());
                assertTrue(success(peer, "trial.assistance", Map.of()).path("selected").isEmpty());
            }
            trials.mailAssistRewards(ownerId);
            trials.mailAssistRewards(ownerId);
            try (var peer = new Peer()) {
                assertTrue(peer.authenticate(ownerToken).path("ok").asBoolean());
                var mail = success(peer, "mail.list", Map.of()).path("entries").valueStream()
                        .filter(row -> row.path("title").asString().equals("勇者试炼支援奖励")).toList();
                assertEquals(1, mail.size());
                assertTrue(mail.getFirst().path("hasAttachments").asBoolean());
            }
        } finally {
            clock.reset();
        }
    }

    /** 保存真实试炼帧供 TS 协议和战报播放器验证，不包含鉴权消息。 */
    private static void writeTrial(String name, JsonNode frame) throws Exception {
        java.nio.file.Files.write(java.nio.file.Path.of("target/trial-" + name + ".pb"), GameProtocolCodec.encode(frame));
    }

    /** 从第1层验证目标上限内的连续胜场、三选一、重连、封顶结算、排行、任务及逐档首通。 */
    @Test void completesDreamlandOverWebSocketAndResumesOriginalBattle() throws Exception {
        int limit = Integer.getInteger("mxzg.test.dreamland.floor-limit", 35);
        var configuration = dreamlandRewards();
        int standardRewardFloors = configuration.path("standardRewardFloorCount").asInt();
        int buffInterval = configuration.path("buffInterval").asInt();
        var frameGap = Duration.ofMillis(40);
        var player = login.login("dream_" + UUID.randomUUID().toString().substring(0, 12), "local-1");
        var role = player.role().id();
        var token = player.session().accessToken();
        jdbc.update("UPDATE game_role SET role_level=100 WHERE id=?", role);
        var hero = UUID.randomUUID().toString();
        int star = MainChapterProgressionPreview.lateChapterLeaderStar(550);
        int level = growth.limit(limit > 465 ? 400 : 200, 6, star);
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,?,?,6)",
            hero, role, level, star);
        var lineup = MainChapterProgressionPreview.prepareLateChapterLineup(jdbc, role, hero, 200, star, level);
        if (limit > 465) {
            doAnswer(call -> {
                @SuppressWarnings("unchecked")
                var frozenTeam = (List<Unit>) call.callRealMethod();
                return MainChapterProgressionPreview.dreamlandAcceptanceTeam(frozenTeam);
            }).when(lineupBattles).freezeDreamlandFormation(any());
        }
        var slots = lineup.stream().map(slot -> Map.of("position", slot.position(), "heroId", slot.heroId())).toList();
        JsonNode first;
        Map<String, Object> choice;
        try (var peer = new Peer(frameGap)) {
            assertTrue(peer.authenticate(token).path("ok").asBoolean());
            var state = success(peer, "dreamland.state", Map.of());
            assertEquals(25, state.path("minimumLevel").asInt());
            assertEquals(limit, state.path("maxFloor").asInt());
            assertEquals("READY", state.path("phase").asString());
            var saved = dreamlandCommand(state, "SAVE_FORMATION");
            saved.put("formationId", 1);
            saved.put("slots", slots);
            state = success(peer, "dreamland.act", saved).path("state");
            state = success(peer, "dreamland.act", dreamlandCommand(state, "START")).path("state");
            assertEquals("SELECT_BUFF", state.path("phase").asString());
            assertEquals(3, state.path("buffs").size());
            choice = dreamlandCommand(state, "SELECT_BUFF");
            choice.put("choice", state.path("buffs").get(0).path("id").asInt());
            var reply = peer.request("dreamland.act", choice);
            assertTrue(reply.path("ok").asBoolean(), reply.toString());
            write("dreamland-floor-1", reply);
            first = reply.path("body");
            assertTrue(first.path("state").path("battle").path("won").asBoolean());
            assertEquals("dreamland:1", first.path("state").path("battle").path("replay").path("scenario").asString());
        }
        JsonNode state;
        try (var peer = new Peer(frameGap)) {
            state = resumeDreamland(peer, token, first.path("state"));
            assertEquals(first, success(peer, "dreamland.act", choice));
            state = advanceDreamlandFloors(peer, state, Math.min(15, limit), buffInterval);
        }
        for (int checkpoint : List.of(30, 100, 200)) {
            if (checkpoint >= limit) {
                break;
            }
            try (var peer = new Peer(frameGap)) {
                state = advanceDreamlandFloors(peer, resumeDreamland(peer, token, state), checkpoint, buffInterval);
            }
        }
        try (var peer = new Peer(frameGap)) {
            state = advanceDreamlandFloors(peer, resumeDreamland(peer, token, state), limit, buffInterval);
            var settle = dreamlandCommand(state, "NEXT");
            var run = success(peer, "dreamland.act", settle);
            state = run.path("state");
            assertEquals("READY", state.path("phase").asString());
            assertTrue(state.path("buffs").isEmpty(), "封顶胜场确认后不应继续三选一");
            var expected = new LinkedHashMap<Integer, Long>();
            for (var stage : configuration.path("stages")) {
                int floor = stage.path("floor").asInt();
                if (floor > limit) {
                    break;
                }
                var rewards = stage.path(floor <= standardRewardFloors ? "standardRewards" : "afterRewards");
                for (var reward : rewards) {
                    expected.merge(reward.path("itemId").asInt(), reward.path("quantity").asLong(), Math::addExact);
                }
            }
            assertEquals(expected.size(), run.path("actual").path("items").size());
            for (var award : expected.entrySet()) {
                assertDreamlandCredit(run, award.getKey(), award.getValue());
            }
            assertEquals(limit, state.path("highestFloor").asInt());
            assertEquals(run, success(peer, "dreamland.act", settle));
            var ranking = success(peer, "dreamland.ranking", Map.of());
            assertEquals(role, ranking.path("own").path("roleId").asString());
            assertEquals(limit, ranking.path("own").path("floor").asInt());
            var milestones = configuration.path("milestones").valueStream()
                .filter(row -> row.path("floor").asInt() <= limit).toList();
            assertEquals(milestones.size(), state.path("milestones").size());
            for (int index = 0; index < milestones.size(); index++) {
                var milestone = milestones.get(index);
                int milestoneId = milestone.path("floor").asInt();
                var claim = dreamlandCommand(state, "CLAIM");
                claim.put("choice", milestoneId);
                var receipt = success(peer, "dreamland.act", claim);
                state = receipt.path("state");
                assertTrue(state.path("milestones").get(index).path("claimed").asBoolean());
                var rewards = milestone.path("rewards");
                assertEquals(rewards.size(), receipt.path("actual").path("items").size());
                for (var reward : rewards) {
                    assertDreamlandCredit(receipt, reward.path("itemId").asInt(), reward.path("quantity").asLong());
                }
                assertEquals(receipt, success(peer, "dreamland.act", claim));
            }
            var tasks = success(peer, "quest.list", Map.of()).path("daily");
            var task = tasks.valueStream().filter(row -> row.path("id").asInt() == 14).findFirst().orElseThrow();
            assertEquals(1, task.path("current").asInt());
            assertEquals("main_infinite", task.path("destination").asString());
            assertEquals((long) limit, jdbc.queryForObject("""
                SELECT amount FROM game_quest_counter WHERE role_id=? AND metric='INFINITE_CHALLENGE'
                    AND period_end_seconds=? AND condition_value=0
                """, Long.class, role, state.path("resetAtSeconds").asLong()));
        }
        clock.setEpochSeconds(state.path("resetAtSeconds").asLong());
        try (var peer = new Peer(frameGap)) {
            assertTrue(peer.authenticate(token).path("ok").asBoolean());
            var resumed = success(peer, "dreamland.state", Map.of());
            int startFloor = Math.max(0, limit - configuration.path("resetFloorCount").asInt());
            assertEquals(startFloor, resumed.path("startFloor").asInt());
            assertEquals(limit, resumed.path("highestFloor").asInt());
            assertEquals(startFloor, resumed.path("todayRewardFloor").asInt());
            assertEquals(0, resumed.path("challengeCount").asInt());
            assertTrue(resumed.path("milestones").valueStream().allMatch(item -> item.path("claimed").asBoolean()));
            var started = success(peer, "dreamland.act", dreamlandCommand(resumed, "START")).path("state");
            var selected = dreamlandCommand(started, "SELECT_BUFF");
            selected.put("choice", started.path("buffs").get(0).path("id").asInt());
            var battle = success(peer, "dreamland.act", selected).path("state").path("battle");
            assertEquals(startFloor + 1, battle.path("floor").asInt());
            assertTrue(battle.path("won").asBoolean());
        } finally {
            clock.reset();
        }
    }

    /** 重新鉴权后从服务器恢复本次冒险，验证同一持久版本和原冻结战报。 */
    private JsonNode resumeDreamland(Peer peer, String token, JsonNode previous) throws Exception {
        assertTrue(peer.authenticate(token).path("ok").asBoolean());
        var restored = success(peer, "dreamland.state", Map.of());
        assertEquals(previous.path("version"), restored.path("version"));
        assertEquals(previous.path("battle"), restored.path("battle"));
        return restored;
    }

    /** 从原配置单独读取楼层和发奖预期，不用服务生成的奖励预览作为断言来源。 */
    private JsonNode dreamlandRewards() throws Exception {
        try (var resource = getClass().getResourceAsStream("/gameplay/dreamland-rules.json")) {
            assertNotNull(resource, "必须包含原梦境奖励配置");
            return new ObjectMapper().readTree(resource);
        }
    }

    /** 连续确认战报并继续挑战，后期优先选原队伍恢复增益，返回目标层待确认战报。 */
    private JsonNode advanceDreamlandFloors(Peer peer, JsonNode state, int targetFloor, int buffInterval) throws Exception {
        int firstFloor = state.path("battle").path("floor").asInt();
        for (int floor = firstFloor; floor < targetFloor; floor++) {
            var acknowledged = success(peer, "dreamland.act", dreamlandCommand(state, "NEXT"));
            state = acknowledged.path("state");
            assertEquals(floor, state.path("highestFloor").asInt());
            assertTrue(acknowledged.path("actual").isMissingNode(), "冒险进行中不应提前发奖");
            Map<String, Object> command;
            if (floor % buffInterval == 0) {
                assertEquals("SELECT_BUFF", state.path("phase").asString());
                assertEquals(3, state.path("buffs").size());
                command = dreamlandCommand(state, "SELECT_BUFF");
                var options = state.path("buffs");
                int choice = options.get(0).path("id").asInt();
                if (state.path("maxFloor").asInt() > 465) {
                    // 只从服务端这次给出的原选项里选恢复，维持数百层连战中的持续生命。
                    choice = options.valueStream().mapToInt(option -> option.path("id").asInt())
                        .filter(id -> id == 10).findFirst().orElse(choice);
                }
                command.put("choice", choice);
            } else {
                assertEquals("NEXT_BATTLE", state.path("phase").asString());
                command = dreamlandCommand(state, "NEXT");
            }
            var reply = peer.request("dreamland.act", command);
            assertTrue(reply.path("ok").asBoolean(), "第 " + (floor + 1) + " 层：" + reply);
            state = reply.path("body").path("state");
            var battle = state.path("battle");
            int nextFloor = floor + 1;
            assertEquals(nextFloor, battle.path("floor").asInt());
            assertEquals("dreamland:" + nextFloor, battle.path("replay").path("scenario").asString());
            assertTrue(battle.path("won").asBoolean(), "第 " + nextFloor + " 层须真实获胜");
            write("dreamland-floor-" + nextFloor, reply);
        }
        return state;
    }

    /** 检查真实协议回执中的到账数量，奖励缺失视为结算失败。 */
    private static void assertDreamlandCredit(JsonNode receipt, int itemId, long amount) {
        var item = receipt.path("actual").path("items").valueStream()
            .filter(row -> row.path("itemId").asInt() == itemId).findFirst().orElseThrow();
        assertEquals(amount, item.path("credited").asLong());
    }

    /** 每次梦境操作使用新请求号；结果未知时由调用者重发原整包。 */
    private static Map<String, Object> dreamlandCommand(JsonNode state, String action) {
        return new LinkedHashMap<>(Map.of("requestId", UUID.randomUUID().toString(),
            "expectedVersion", state.path("version").asLong(), "action", action));
    }

    /** 成功返回请求体并保留失败信封作为断言信息。 */
    private JsonNode success(Peer peer, String name, Map<String, ?> body) throws Exception {
        var response = peer.request(name, body);
        assertTrue(response.path("ok").asBoolean(), response.toString());
        return response.path("body");
    }

    /** 从提交快照按任务编号读取权威进度。 */
    private int vipProgress(JsonNode snapshot, int id) {
        return snapshot.path("vip").path("tasks").valueStream()
            .filter(task -> task.path("id").asInt() == id).findFirst()
            .map(task -> task.path("progress").asInt(-1)).orElse(-1);
    }

    /** 用同一真实挑战、结算通道推进下一关。 */
    private void advanceChapter(Peer peer, int mission) throws Exception {
        var battle = success(peer, "chapter.challenge", Map.of("requestId", UUID.randomUUID().toString()));
        var claim = success(peer, "chapter.claim", Map.of("battleId", battle.path("battleId").asString()));
        assertEquals(mission, claim.path("state").path("maxCleared").asInt());
    }

    /** 原失败回执重发得到相同结算，保存该二进制信封供客户端复验。 */
    private JsonNode losingReceiptFrame(Peer peer, Map<String, Object> command, JsonNode original) throws Exception {
        var response = peer.request("arena.challenge", command);
        assertTrue(response.path("ok").asBoolean(), response.toString());
        assertEquals(original, response.path("body"));
        return response;
    }

    /** 从回执提取已完成关卡，仅供事件断言。 */
    private int missionNumber(JsonNode claim) { return claim.path("body").path("state").path("maxCleared").asInt(); }

    /** 输出真实二进制供客户端跨语言解码，不包含令牌。 */
    private void write(String name, JsonNode frame) throws Exception {
        java.nio.file.Files.write(java.nio.file.Path.of("target/chapter-" + name + ".pb"), GameProtocolCodec.encode(frame));
    }
}
