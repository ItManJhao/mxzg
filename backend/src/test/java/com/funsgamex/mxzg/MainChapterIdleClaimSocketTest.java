/**
 * 新主线挂机领取的真实WS二进制回归：独立H2、回环随机端口，验证回执、统一事件和重连恢复。
 * 仅本测试显式启用服务端领取，活动控制经真实维护入口配置；玩家按钮仍未接入。
 * 数据准备只作用于独立测试库，不连接日常服务器、不调用GM、不以历史回执覆盖当前资产。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.IdleActivityMaintenanceService;
import com.funsgamex.mxzg.campaign.MainChapterIdleStateRepository;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:main_idle_claim_socket;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false",
    "mxzg.main-chapter.idle-claim-enabled=true"
})
@ActiveProfiles("local")
class MainChapterIdleClaimSocketTest {
    /** 本用例组专属回环随机端口，连接目标不读取本机日常服务配置。 */
    @LocalServerPort
    private int port;
    /** 真实开发身份和会话签发入口，账号及区服均由本测试独立创建。 */
    @Autowired
    private DevelopmentLoginService login;
    /** 当前独立数据库的角色锁和已提交资产版本来源。 */
    @Autowired
    private RoleRepository roles;
    /** 同源角色等级门槛，仅用来将独立测试角色准备在真实升级边界前，不改奖励配置。 */
    @Autowired
    private RoleRules roleRules;
    /** 真实累计初建入口，不通过快照读取补造可领取时间。 */
    @Autowired
    private MainChapterIdleStateRepository states;
    /** 显式准备完整活动控制，不将缺表或缺行解释成无活动。 */
    @Autowired
    private IdleActivityMaintenanceService maintenance;
    /** 仅操作本测试H2的区服、已通关进度及结果核对。 */
    @Autowired
    private JdbcTemplate jdbc;
    /** 与生产业务同源的事务管理，夹具初始化也必须持有真实角色锁。 */
    @Autowired
    private PlatformTransactionManager transactions;

    /**
     * 合成角色的真实认证身份；token只存在测试进程，不写互通文件。
     * @param role 当前测试角色持久ID
     * @param accessToken 真实会话签发的凭证，不拼造鉴权状态
     * @param clientInstanceId 同一角色在断线重连时复用的稳定客户端实例UUID
     * @param pendingBattleId 夹具保留的待首通结算标记；为空表示本场没有该标记
     */
    private record Player(String role, String accessToken, String clientInstanceId, String pendingBattleId) {}

    /**
     * 一条服务器实际发送的完整二进制及其协议投影。
     * @param wire 原始Protobuf字节，仅输出不含令牌的响应/事件
     * @param frame 由同源协议描述符解码的正式信封
     */
    private record Received(byte[] wire, JsonNode frame) {}

    /** 本测试专用二进制连接，接收事件和响应分流，不把历史回执当作当前状态。 */
    private final class Peer implements WebSocket.Listener, AutoCloseable {
        /** 当前连接的JDK客户端，结束时关闭并释放网络线程。 */
        private final HttpClient client = HttpClient.newHttpClient();
        /** 网络线程交付的完整原始帧，按实际到达顺序排队。 */
        private final BlockingQueue<byte[]> incoming = new LinkedBlockingQueue<>();
        /** 等待响应时先到的事件，消费后移除，便于核对重放不重复推送。 */
        private final BlockingQueue<Received> events = new LinkedBlockingQueue<>();
        /** 当前消息的二进制分片，last=true入队后清空。 */
        private final ByteArrayOutputStream fragments = new ByteArrayOutputStream();
        /** 本测试回环连接，只发送唯一子协议的Protobuf二进制消息。 */
        private final WebSocket socket;
        /** 首包成功后保存的真实连接标识，后续业务信封必须携带。 */
        private String connectionId;

        /** 采用生产子协议建立有期限的独立回环WS连接，不复用浏览器或日常连接。 */
        private Peer() {
            socket = client.newWebSocketBuilder().subprotocols(GameProtocolCodec.SUBPROTOCOL)
                    .connectTimeout(Duration.ofSeconds(5))
                    .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), this).join();
        }

        /** 开始接收第一帧，避免JDK客户端背压阻塞测试。 */
        @Override
        public void onOpen(WebSocket opened) {
            opened.request(1);
        }

        /** 合并分片并保留真实字节，不在监听线程记录请求凭证或推断业务结果。 */
        @Override
        public CompletionStage<?> onBinary(WebSocket opened, ByteBuffer data, boolean last) {
            byte[] part = new byte[data.remaining()];
            data.get(part);
            fragments.writeBytes(part);
            if (last) {
                incoming.add(fragments.toByteArray());
                fragments.reset();
            }
            opened.request(1);
            return null;
        }

        /** 在固定期限内接收真实Protobuf帧，缺响应直接使测试失败。 */
        private Received receive() throws Exception {
            byte[] wire = incoming.poll(5, TimeUnit.SECONDS);
            assertNotNull(wire, "挂机领取协议未按期返回二进制帧");
            return new Received(wire, GameProtocolCodec.decode(wire));
        }

        /** 使用真实session.authenticate完成连接接管并保留服务器确认的连接ID。 */
        private Received authenticate(Player player) throws Exception {
            var result = request("session.authenticate", Map.of("accessToken", player.accessToken(),
                    "clientInstanceId", player.clientInstanceId()));
            assertTrue(result.frame().path("ok").asBoolean(), "独立测试连接鉴权应成功");
            connectionId = result.frame().path("body").path("connectionId").asString();
            assertFalse(connectionId.isBlank());
            return result;
        }

        /** 每次往返创建新Frame.id；业务requestId由用例显式保留，事件允许先于响应到达。 */
        private Received request(String name, Object body) throws Exception {
            String frameId = UUID.randomUUID().toString();
            var frame = new LinkedHashMap<String, Object>(Map.of("version", 1, "kind", "request",
                    "name", name, "id", frameId, "body", body));
            if (connectionId != null) {
                frame.put("connectionId", connectionId);
            }
            socket.sendBinary(ByteBuffer.wrap(GameProtocolCodec.encode(frame)), true).get(5, TimeUnit.SECONDS);
            var received = receive();
            while (received.frame().path("kind").asString().equals("event")) {
                events.add(received);
                received = receive();
            }
            assertEquals("response", received.frame().path("kind").asString());
            assertEquals(frameId, received.frame().path("id").asString());
            assertEquals(name, received.frame().path("name").asString());
            return received;
        }

        /** 领取提交事件允许先到或后到，调用方取得同一条实际统一快照。 */
        private Received stateChanged() throws Exception {
            var received = events.poll();
            if (received == null) {
                received = receive();
            }
            assertEquals("event", received.frame().path("kind").asString());
            assertEquals("state.changed", received.frame().path("name").asString());
            return received;
        }

        /** 首领还会发送通用实际到账反馈，独立于统一状态，不用它修改资产。 */
        private Received rewardGranted() throws Exception {
            var received = events.poll();
            if (received == null) {
                received = receive();
            }
            assertEquals("event", received.frame().path("kind").asString());
            assertEquals("reward.granted", received.frame().path("name").asString());
            assertEquals(connectionId, received.frame().path("connectionId").asString());
            return received;
        }

        /** 同连接保活作为串行屏障后，确认只读/重放/拒绝没有登记资产或奖励展示通知。 */
        private void assertNoStateChange() throws Exception {
            assertTrue(request("session.heartbeat", Map.of()).frame().path("ok").asBoolean());
            assertTrue(events.isEmpty(), "只读、重放或拒绝不得新增资产或奖励展示事件");
            assertNull(incoming.poll(100, TimeUnit.MILLISECONDS), "业务响应后不应迟到重复事件");
        }

        /** 中止独立连接并释放客户端，不在用例间残留在线身份或网络线程。 */
        @Override
        public void close() {
            socket.abort();
            client.close();
        }
    }

    /**
     * 创建独立区服并经真实维护入口明确三活动，角色保留真实一级初值以避开无关世界等级依赖。
     * ready=true仅在测试角色锁事务中准备已通关第一关与累计；不生成虚假战报或调用挑战结算。
     */
    private Player player(boolean ready, boolean pending) {
        long now = Instant.now().getEpochSecond();
        String server = "idle-ws-" + UUID.randomUUID().toString().substring(0, 8);
        jdbc.update("INSERT INTO game_server(id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)",
                server, "idle-ws", "领取协议测试区", "独立领取测试服");
        maintenance.configure(server, now - 86_400, Optional.empty(), now);
        var loginResult = login.login("idle_ws_" + UUID.randomUUID().toString().substring(0, 12), server);
        String role = loginResult.role().id();
        assertEquals(1, loginResult.role().level());
        String pendingBattleId = pending ? UUID.randomUUID().toString() : null;
        if (ready) {
            new TransactionTemplate(transactions).executeWithoutResult(status -> {
                roles.lock(role);
                jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared,pending_battle_id) VALUES (?,1,?)",
                        role, pendingBattleId);
                assertTrue(states.initializeForChallenge(role, now - 120));
            });
        }
        return new Player(role, loginResult.session().accessToken(), UUID.randomUUID().toString(), pendingBattleId);
    }

    /** 返回全部相关持久事实；只读和重放前后逐表相等，不从通知数量猜测资产未变。 */
    private Map<String, Object> stored(String role) {
        return Map.of(
                "role", jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", role),
                "chapter", jdbc.queryForList("SELECT * FROM game_main_chapter WHERE role_id=?", role),
                "idle", jdbc.queryForList("SELECT * FROM game_main_chapter_idle WHERE role_id=?", role),
                "counters", jdbc.queryForList("SELECT * FROM game_main_chapter_idle_counter WHERE role_id=? ORDER BY group_type", role),
                "inventory", jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=? ORDER BY instance_id", role),
                "timed", jdbc.queryForList("SELECT * FROM game_timed_inventory WHERE role_id=? ORDER BY instance_id", role),
                "spirits", jdbc.queryForList("SELECT * FROM game_spirit WHERE role_id=? ORDER BY instance_id", role),
                "tavernPoints", jdbc.queryForList("SELECT * FROM game_tavern_point WHERE role_id=?", role),
                "receipts", jdbc.queryForList("SELECT * FROM game_main_chapter_idle_receipt WHERE role_id=? ORDER BY request_id", role));
    }

    /** 仅抽取统一快照确认条件，不要求快照与历史回执的版本恰好相等。 */
    private void assertConfirmsReceipt(JsonNode snapshot, JsonNode receipt) {
        assertTrue(snapshot.path("revision").asLong() >= receipt.path("assetRevision").asLong());
        assertEquals(snapshot.path("revision").asLong(), snapshot.path("mainChapter").path("assetRevision").asLong());
        assertEquals(1, snapshot.path("tavernPoints").path("schemaVersion").asInt());
        assertEquals(11_000, snapshot.path("tavernPoints").path("limit").asLong());
        assertEquals(receipt.path("actual").path("tavern").get(0).path("afterQuantity").asLong(),
                snapshot.path("tavernPoints").path("adventureCount").asLong());
        for (var item : snapshot.path("inventory")) {
            assertNotEquals(900401, item.path("itemId").asInt());
        }
        var idle = snapshot.path("mainChapterIdle");
        assertEquals(1, idle.path("claimState").path("schemaVersion").asInt());
        assertTrue(idle.path("claimState").path("operationVersion").asLong()
                >= receipt.path("afterOperationVersion").asLong());
        assertEquals("ENABLED", idle.path("claimState").path("requestMode").asString());
        assertTrue(idle.path("startedAt").asLong() >= receipt.path("committedAtSeconds").asLong());
    }

    /** 首包含创角时钟，未通关时查询不存在的请求不会创建领取记录或发奖。 */
    @Test
    void missingStatusDoesNotCreateAccumulationOrChangeAssets() throws Exception {
        var player = player(false, false);
        try (var peer = new Peer()) {
            var initial = peer.authenticate(player).frame().path("body").path("initial");
            assertEquals(2_000, initial.path("tavernPoints").path("adventureCount").asLong());
            assertEquals(initial.path("revision").asLong(), initial.path("mainChapter").path("assetRevision").asLong());
            var clock = initial.path("mainChapterIdle");
            assertEquals(0, clock.path("rewardStage").asInt(-1));
            assertTrue(clock.path("startedAt").asLong() > 0);
            assertFalse(clock.has("claimState"));
            var before = stored(player.role());
            String requestId = UUID.randomUUID().toString();
            var response = peer.request("chapter.idle.claim.status", Map.of("requestId", requestId)).frame();
            assertTrue(response.path("ok").asBoolean());
            assertEquals(requestId, response.path("body").path("requestId").asString());
            assertEquals("NOT_FOUND", response.path("body").path("status").asString());
            assertFalse(response.path("body").has("receipt"));
            peer.assertNoStateChange();
            assertEquals(before, stored(player.role()));
        }
    }

    /** 首次领取冻结真实升级并带原请求关联；不同Frame重放复用回执，异expected冲突且不再发奖。 */
    @Test
    void claimPushesOnceAndDifferentFramesReplayTheSameBusinessReceipt() throws Exception {
        var player = player(true, true);
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(player.role());
            jdbc.update("UPDATE game_role SET role_experience=? WHERE id=?", roleRules.threshold(1) - 1, player.role());
        });
        String requestId = UUID.randomUUID().toString();
        try (var peer = new Peer()) {
            var initial = peer.authenticate(player).frame().path("body").path("initial");
            assertEquals("ENABLED", initial.path("mainChapterIdle").path("claimState").path("requestMode").asString());
            assertEquals(1, initial.path("mainChapterIdle").path("claimState").path("operationVersion").asLong());
            var body = Map.of("requestId", requestId, "expectedOperationVersion", 1);
            var first = peer.request("chapter.idle.claim", body);
            assertTrue(first.frame().path("ok").asBoolean());
            var receipt = first.frame().path("body");
            assertEquals(requestId, receipt.path("requestId").asString());
            assertEquals(1, receipt.path("beforeOperationVersion").asLong());
            assertEquals(2, receipt.path("afterOperationVersion").asLong());
            assertEquals(1, receipt.path("rewardStage").asInt());
            assertTrue(receipt.path("seconds").asInt() >= 180);
            assertEquals(player.role(), receipt.path("actual").path("roleId").asString());
            assertTrue(receipt.path("actual").path("wallet").path("goldAfter").asLong()
                    > initial.path("role").path("gold").asLong());
            var event = peer.stateChanged();
            assertConfirmsReceipt(event.frame().path("body"), receipt);
            assertEquals(player.pendingBattleId(), event.frame().path("body").path("mainChapter").path("pendingBattleId").asString());
            var rewardEvent = peer.rewardGranted();
            var notice = rewardEvent.frame().path("body");
            assertEquals(1, notice.path("schemaVersion").asInt());
            assertEquals(receipt.path("receiptId").asString(), notice.path("receiptId").asString());
            assertEquals(requestId, notice.path("requestId").asString());
            assertEquals(player.role(), notice.path("roleId").asString());
            assertEquals(receipt.path("assetRevision").asLong(), notice.path("assetRevision").asLong());
            assertEquals("POPUP", notice.path("mode").asString());
            var experience = receipt.path("actual").path("experience");
            assertFalse(experience.isEmpty());
            int beforeLevel = experience.get(0).path("beforeLevel").asInt();
            int afterLevel = experience.get(experience.size() - 1).path("level").asInt();
            assertTrue(afterLevel > beforeLevel, "独立角色跨真实门槛后必须携带升级反馈");
            assertEquals(beforeLevel, notice.path("roleUpgrade").path("beforeLevel").asInt());
            assertEquals(afterLevel, notice.path("roleUpgrade").path("afterLevel").asInt());
            Map<Integer, Long> credited = new LinkedHashMap<>();
            for (var item : receipt.path("actual").path("items")) {
                if (item.path("credited").asLong() > 0) {
                    credited.merge(item.path("itemId").asInt(), item.path("credited").asLong(), Math::addExact);
                }
            }
            for (var bonus : receipt.path("actual").path("bonuses")) {
                credited.merge(bonus.path("itemId").asInt(), bonus.path("quantity").asLong(), Math::addExact);
            }
            assertEquals(credited.size(), notice.path("items").size());
            for (var item : notice.path("items")) {
                assertEquals(credited.get(item.path("itemId").asInt()), item.path("credited").asLong());
            }
            var committed = stored(player.role());
            var repeated = peer.request("chapter.idle.claim", body);
            assertNotEquals(first.frame().path("id").asString(), repeated.frame().path("id").asString());
            assertEquals(receipt, repeated.frame().path("body"));
            var status = peer.request("chapter.idle.claim.status", Map.of("requestId", requestId)).frame();
            assertTrue(status.path("ok").asBoolean());
            assertEquals("COMMITTED", status.path("body").path("status").asString());
            assertEquals(receipt, status.path("body").path("receipt"));
            var conflict = peer.request("chapter.idle.claim",
                    Map.of("requestId", requestId, "expectedOperationVersion", 2)).frame();
            assertFalse(conflict.path("ok").asBoolean());
            assertEquals("IDLE_REQUEST_CONFLICT", conflict.path("error").path("code").asString());
            peer.assertNoStateChange();
            assertEquals(committed, stored(player.role()));
            Files.write(Path.of("target/main-idle-claim-receipt.pb"), first.wire());
            Files.write(Path.of("target/main-idle-claim-event.pb"), event.wire());
            Files.write(Path.of("target/reward-notice.pb"), rewardEvent.wire());
        }
    }

    /** 丢弃旧连接中的提交通知后重新鉴权，统一首包达到回执确认条件，status恢复原历史结果。 */
    @Test
    void reconnectRecoversCommittedReceiptAndCurrentSnapshotWithoutRegranting() throws Exception {
        var player = player(true, false);
        String requestId = UUID.randomUUID().toString();
        JsonNode receipt;
        try (var peer = new Peer()) {
            peer.authenticate(player);
            var first = peer.request("chapter.idle.claim", Map.of("requestId", requestId, "expectedOperationVersion", 1));
            assertTrue(first.frame().path("ok").asBoolean());
            receipt = first.frame().path("body");
            // 不消费Peer缓存的事件，模拟业务未确认统一状态就断线；恢复仍只能使用原请求。
        }
        var committed = stored(player.role());
        try (var restored = new Peer()) {
            var accepted = restored.authenticate(player);
            var initial = accepted.frame().path("body").path("initial");
            assertConfirmsReceipt(initial, receipt);
            assertFalse(accepted.frame().path("body").has("session"), "恢复互通文件不能携带新签发凭证");
            var status = restored.request("chapter.idle.claim.status", Map.of("requestId", requestId));
            assertTrue(status.frame().path("ok").asBoolean());
            assertEquals("COMMITTED", status.frame().path("body").path("status").asString());
            assertEquals(receipt, status.frame().path("body").path("receipt"));
            var replay = restored.request("chapter.idle.claim", Map.of("requestId", requestId, "expectedOperationVersion", 1));
            assertTrue(replay.frame().path("ok").asBoolean());
            assertEquals(receipt, replay.frame().path("body"));
            restored.assertNoStateChange();
            assertEquals(committed, stored(player.role()));
            Files.write(Path.of("target/main-idle-claim-status.pb"), status.wire());
            Files.write(Path.of("target/main-idle-claim-restored.pb"), accepted.wire());
        }
    }

    /** 回执和即时奖励均按当前认证角色隔离；旁观连接不收反馈，同requestId查询也不建立累计。 */
    @Test
    void anotherAuthenticatedRoleCannotReadTheOwnersReceipt() throws Exception {
        var owner = player(true, false);
        var other = player(false, false);
        String requestId = UUID.randomUUID().toString();
        try (var peer = new Peer()) {
            peer.authenticate(other);
            try (var ownerPeer = new Peer()) {
                ownerPeer.authenticate(owner);
                assertTrue(ownerPeer.request("chapter.idle.claim",
                        Map.of("requestId", requestId, "expectedOperationVersion", 1)).frame().path("ok").asBoolean());
                ownerPeer.stateChanged();
                assertEquals(owner.role(), ownerPeer.rewardGranted().frame().path("body").path("roleId").asString());
            }
            var ownerCommitted = stored(owner.role());
            peer.assertNoStateChange();
            var before = stored(other.role());
            var response = peer.request("chapter.idle.claim.status", Map.of("requestId", requestId)).frame();
            assertTrue(response.path("ok").asBoolean());
            assertEquals("NOT_FOUND", response.path("body").path("status").asString());
            assertFalse(response.path("body").has("receipt"));
            peer.assertNoStateChange();
            assertEquals(before, stored(other.role()));
            assertEquals(ownerCommitted, stored(owner.role()));
        }
    }

    /** 同角色接管后只向新连接交付首次领取；旧连接只收到接管通知，不再收资产或奖励。 */
    @Test
    void replacedConnectionCannotReceiveTheNewRewardNotice() throws Exception {
        var player = player(true, false);
        try (var oldPeer = new Peer(); var current = new Peer()) {
            oldPeer.authenticate(player);
            current.authenticate(player);
            assertEquals("session.kicked", oldPeer.receive().frame().path("name").asString());
            var response = current.request("chapter.idle.claim",
                    Map.of("requestId", UUID.randomUUID().toString(), "expectedOperationVersion", 1)).frame();
            assertTrue(response.path("ok").asBoolean());
            current.stateChanged();
            var notice = current.rewardGranted().frame().path("body");
            assertEquals(response.path("body").path("receiptId").asString(), notice.path("receiptId").asString());
            assertEquals(response.path("body").path("requestId").asString(), notice.path("requestId").asString());
            current.assertNoStateChange();
            assertNull(oldPeer.incoming.poll(100, TimeUnit.MILLISECONDS), "被接管旧连接不能收到新领取反馈");
        }
    }
}
