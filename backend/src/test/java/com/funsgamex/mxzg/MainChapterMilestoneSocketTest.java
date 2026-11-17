/**
 * 里程碑真实WS＋PB回归，验证玩家入口、提交快照、断线原键恢复和跨角色隔离。
 * 使用随机回环端口及独立内存H2；明确播种通关夹具，不连接日常数据库或开放开发GM。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.MainChapterIdleStateRepository;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.role.RoleRepository;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
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
    "spring.datasource.url=jdbc:h2:mem:milestone_socket;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false",
    "mxzg.main-chapter.challenge-limit=9"
})
@ActiveProfiles("local")
class MainChapterMilestoneSocketTest {
    /** 本次独立服务随机端口，不连接固定日常端口。 */
    @LocalServerPort private int port;
    /** 只创建独立测试身份，不输出会话。 */
    @Autowired private DevelopmentLoginService login;
    /** 明确测试进度及持久事实检查入口。 */
    @Autowired private JdbcTemplate jdbc;
    /** 播种同样取得生产角色行锁。 */
    @Autowired private RoleRepository roles;
    /** 本类内存库事务。 */
    @Autowired private PlatformTransactionManager transactions;
    /** 原累计初始化，快照读取不补建。 */
    @Autowired private MainChapterIdleStateRepository idle;
    /** 原统一版本，不伪造客户端事件。 */
    @Autowired private AssetSyncService sync;

    /** 实际二进制连接，事件与响应统一解析但按传输ID独立等待。 */
    private final class Peer implements WebSocket.Listener, AutoCloseable {
        /** 原始分片组合缓冲，收到完整PB后清空。 */
        private final ByteArrayOutputStream partial = new ByteArrayOutputStream();
        /** 服务端完整消息队列；测试等待有严格上限。 */
        private final LinkedBlockingQueue<JsonNode> received = new LinkedBlockingQueue<>();
        /** 本连接接纳的原事务事件，不把业务回执伪装成状态。 */
        private final List<JsonNode> events = new ArrayList<>();
        /** 本次原生长连接，关闭只影响本实例。 */
        private final WebSocket socket;
        /** 鉴权后绑定原连接ID，每次请求必须保持相同连接。 */
        private String connectionId;

        /** 固定回环随机端口，强制实际子协议，不允许JSON或HTTP回退。 */
        private Peer() throws Exception {
            socket = HttpClient.newHttpClient().newWebSocketBuilder().subprotocols("mxzg.protobuf.v2")
                    .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), this)
                    .get(5, TimeUnit.SECONDS);
        }

        /** 继续接收并按完整PB边界解码，失败交测试线程超时/断言。 */
        @Override
        public java.util.concurrent.CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
            byte[] bytes = new byte[data.remaining()];
            data.get(bytes);
            partial.writeBytes(bytes);
            if (last) {
                try {
                    received.add(GameProtocolCodec.decode(partial.toByteArray()));
                } catch (java.io.IOException error) {
                    return CompletableFuture.failedFuture(error);
                }
                partial.reset();
            }
            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }

        /** 初次开放接收窗口，不发送额外业务请求。 */
        @Override
        public void onOpen(WebSocket webSocket) { webSocket.request(1); }

        /** 仅在此方法把内存测试凭证交真实鉴权，不写日志或产物。 */
        private JsonNode authenticate(String token) throws Exception {
            JsonNode frame = request("session.authenticate", Map.of("accessToken", token,
                    "clientInstanceId", UUID.randomUUID().toString()));
            connectionId = frame.path("connectionId").asString();
            assertTrue(frame.path("ok").asBoolean());
            return frame;
        }

        /** 按真实传输ID等待一次响应，保存途中事务事件；10秒未回复明确失败。 */
        private JsonNode request(String name, Object body) throws Exception {
            String id = UUID.randomUUID().toString();
            var frame = new java.util.LinkedHashMap<String, Object>();
            frame.put("version", 1);
            frame.put("kind", "request");
            frame.put("name", name);
            frame.put("id", id);
            frame.put("body", body);
            if (connectionId != null) { frame.put("connectionId", connectionId); }
            socket.sendBinary(ByteBuffer.wrap(GameProtocolCodec.encode(frame)), true).get(3, TimeUnit.SECONDS);
            long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
            while (System.nanoTime() < deadline) {
                JsonNode reply = received.poll(1, TimeUnit.SECONDS);
                if (reply == null) { continue; }
                if (reply.path("kind").asString().equals("event")) { events.add(reply); }
                if (reply.path("id").asString().equals(id)) { return reply; }
            }
            throw new AssertionError("本次独立WS请求没有在期限内结束：" + name);
        }

        /** 只关闭本测试连接，不停止服务或其他连接。 */
        @Override
        public void close() { socket.abort(); }
    }

    /** 真实领取一次后丢弃连接，重新鉴权与status/重复claim恢复原结果，快照含同一英雄和集合。 */
    @Test
    void actualPlayerClaimAndReconnectRestoreOneHeroAndOriginalReceipt() throws Exception {
        var player = login.login("milestone_ws_" + UUID.randomUUID().toString().substring(0, 8));
        String role = player.role().id();
        String token = player.session().accessToken();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(role);
            jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,15)", role);
            idle.initializeForChallenge(role, Instant.now().getEpochSecond() - 120);
            sync.changed(role);
        });
        JsonNode original;
        try (var peer = new Peer()) {
            peer.authenticate(token);
            var before = peer.request("chapter.milestone.claim.status", Map.of("rewardId", 100));
            assertFalse(before.path("body").path("found").asBoolean());
            original = peer.request("chapter.milestone.claim", Map.of("rewardId", 100));
            assertTrue(original.path("ok").asBoolean(), original.toString());
            assertEquals(100, original.path("body").path("rewardId").asInt());
            assertEquals(1, original.path("body").path("actual").path("heroes").size());
            assertTrue(peer.events.stream().anyMatch(event -> event.path("name").asString().equals("state.changed")
                    && event.path("body").path("mainChapter").path("milestoneProgress").path("claimedIds").path(0).asInt() == 100));
            assertFalse(peer.events.stream().anyMatch(event -> event.path("name").asString().equals("reward.granted")),
                    "旧3008静默发奖由确认回执复用通用展示，不增加提前奖励事件");
        }
        long revision = roles.revision(role);
        try (var peer = new Peer()) {
            var restored = peer.authenticate(token);
            assertEquals(100, restored.path("body").path("initial").path("mainChapter")
                    .path("milestoneProgress").path("claimedIds").get(0).asInt());
            var status = peer.request("chapter.milestone.claim.status", Map.of("rewardId", 100));
            assertEquals(original.path("body"), status.path("body").path("receipt"));
            assertEquals(original.path("body"), peer.request("chapter.milestone.claim", Map.of("rewardId", 100)).path("body"));
        }
        assertEquals(revision, roles.revision(role));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=? AND template_id=10105007", Integer.class, role));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_milestone_receipt WHERE role_id=?", Integer.class, role));
        var other = login.login("milestone_other_" + UUID.randomUUID().toString().substring(0, 8));
        try (var peer = new Peer()) {
            peer.authenticate(other.session().accessToken());
            assertFalse(peer.request("chapter.milestone.claim.status", Map.of("rewardId", 100)).path("body").path("found").asBoolean());
            var failure = peer.request("chapter.milestone.claim", Map.of("rewardId", 100));
            assertEquals("MILESTONE_NOT_REACHED", failure.path("error").path("code").asString());
            assertTrue(peer.request("session.heartbeat", Map.of()).path("ok").asBoolean());
        }
    }
}
