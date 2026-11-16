/**
 * 冒险点真实WS专项：随机独立H2和回环随机端口核对首包、GM准备、提交推送及重连。
 * 测试只显式开启本隔离实例GM，玩家领取保持关闭；普通库存与冒险点领域始终分别核对。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=true",
        "mxzg.main-chapter.idle-claim-enabled=false"
})
@ActiveProfiles("local")
class TavernPointSocketTest {
    /** 本类独享的随机H2地址，不读取本机日常文件数据库。 */
    private static final String DATABASE_URL = "jdbc:h2:mem:tavern_socket_" + UUID.randomUUID()
            + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
    /** 本测试进程内由框架选择的回环端口。 */
    @LocalServerPort
    private int port;
    /** 创建真实会话的本地开发身份入口，账号均随机独立。 */
    @Autowired
    private DevelopmentLoginService login;
    /** 只用于校验独立角色版本和故障回滚，不绕过生产角色锁写资产。 */
    @Autowired
    private RoleRepository roles;
    /** 生产统一快照入口，用于晚期快照失败回滚边界。 */
    @Autowired
    private SessionSnapshotService snapshots;
    /** 本隔离库故障注入与持久事实查询入口。 */
    @Autowired
    private JdbcTemplate jdbc;

    /** 将随机数据库作为本测试类唯一连接源，不能意外回退日常库。 */
    @DynamicPropertySource
    static void isolatedDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> DATABASE_URL);
    }

    /** 一条真实二进制响应，令牌只存在未写盘的登录响应中。 */
    private record Received(byte[] wire, JsonNode frame) {}

    /** 只连接本测试端口的二进制客户端，事件与响应按kind分别缓存。 */
    private final class Peer implements WebSocket.Listener, AutoCloseable {
        /** 本连接专属HTTP/WS客户端，结束时释放。 */
        private final HttpClient client = HttpClient.newHttpClient();
        /** 网络线程送入完整二进制帧，测试线程按业务顺序取出。 */
        private final BlockingQueue<byte[]> incoming = new LinkedBlockingQueue<>();
        /** 等待响应期间先到的state.changed，不把它当作业务回执。 */
        private final BlockingQueue<Received> events = new LinkedBlockingQueue<>();
        /** 单帧分片缓存，last=true时清空。 */
        private final ByteArrayOutputStream fragments = new ByteArrayOutputStream();
        /** 本测试的真实回环连接，不接触日常服务。 */
        private final WebSocket socket;
        /** 首包确认后保存的连接标识，不能作为持久资产版本。 */
        private String connectionId;

        /** 以生产Protobuf子协议连接本测试实例，不使用HTTP业务回退。 */
        private Peer() {
            socket = client.newWebSocketBuilder().subprotocols(GameProtocolCodec.SUBPROTOCOL)
                    .connectTimeout(Duration.ofSeconds(5))
                    .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), this).join();
        }

        /** 启动接收背压许可，让首包及后续事件可正常交付。 */
        @Override
        public void onOpen(WebSocket opened) {
            opened.request(1);
        }

        /** 合并一帧分片后交付测试线程，不输出凭证或把普通库存推测成冒险点。 */
        @Override
        public CompletionStage<?> onBinary(WebSocket opened, ByteBuffer data, boolean last) {
            byte[] bytes = new byte[data.remaining()];
            data.get(bytes);
            fragments.writeBytes(bytes);
            if (last) {
                incoming.add(fragments.toByteArray());
                fragments.reset();
            }
            opened.request(1);
            return null;
        }

        /** 固定期限内接收真实帧；超时失败，不从数据库补造期望响应。 */
        private Received receive() throws Exception {
            byte[] wire = incoming.poll(5, TimeUnit.SECONDS);
            assertNotNull(wire, "冒险点WS未按期返回真实帧");
            return new Received(wire, GameProtocolCodec.decode(wire));
        }

        /** 每次传输使用新Frame.id，GM业务requestId由调用方明确复用以核对持久幂等。 */
        private Received request(String name, Object body) throws Exception {
            String id = UUID.randomUUID().toString();
            var frame = new LinkedHashMap<String, Object>(Map.of("version", 1, "kind", "request",
                    "name", name, "id", id, "body", body));
            if (connectionId != null) {
                frame.put("connectionId", connectionId);
            }
            socket.sendBinary(ByteBuffer.wrap(GameProtocolCodec.encode(frame)), true).get(5, TimeUnit.SECONDS);
            var received = receive();
            while (received.frame().path("kind").asString().equals("event")) {
                events.add(received);
                received = receive();
            }
            assertEquals(id, received.frame().path("id").asString());
            if (name.equals("session.login") || name.equals("session.authenticate")) {
                if (received.frame().path("ok").asBoolean()) {
                    connectionId = received.frame().path("body").path("connectionId").asString();
                }
            }
            return received;
        }

        /** 真实恢复首包，不签发新凭证或查询独立背包。 */
        private Received authenticate(String token) throws Exception {
            var received = request("session.authenticate", Map.of("accessToken", token,
                    "clientInstanceId", UUID.randomUUID().toString()));
            assertTrue(received.frame().path("ok").asBoolean());
            return received;
        }

        /** 消费一条真实提交事件，不允许用重复首包或回执代替。 */
        private Received stateChanged() throws Exception {
            var event = events.poll();
            if (event == null) {
                event = receive();
            }
            assertEquals("event", event.frame().path("kind").asString());
            assertEquals("state.changed", event.frame().path("name").asString());
            return event;
        }

        /** 幂等重放和只读请求不得多发空状态；首次懒初始化也应收敛为唯一首包。 */
        private void assertNoStateChange() throws InterruptedException {
            assertTrue(events.isEmpty());
            assertNull(incoming.poll(150, TimeUnit.MILLISECONDS));
        }

        /** 释放本测试连接及客户端，不留下真实在线会话。 */
        @Override
        public void close() {
            socket.abort();
            client.close();
        }
    }

    /** 核对独立点数格式、同次版本和普通库存隔离；余额超过关卡cap仍必须保留。 */
    private void assertPointState(JsonNode state, long count, long revision) {
        assertEquals(revision, state.path("revision").asLong());
        assertEquals(revision, state.path("mainChapter").path("assetRevision").asLong());
        var points = state.path("tavernPoints");
        assertEquals(1, points.path("schemaVersion").asInt());
        assertEquals(count, points.path("adventureCount").asLong());
        assertEquals(11_000, points.path("limit").asLong());
        for (var item : state.path("inventory")) {
            assertNotEquals(900401, item.path("itemId").asInt());
        }
    }

    /** 真实登录首包初始化2000；重复恢复不再写入，不多推一份初始化事件。 */
    @Test
    void loginAndRepeatedAuthenticationCarryTheCommittedInitialState() throws Exception {
        String account = "tavern_" + UUID.randomUUID().toString().substring(0, 12);
        String token;
        long revision;
        try (var peer = new Peer()) {
            var accepted = peer.request("session.login", Map.of("account", account, "serverId", "local-1",
                    "clientInstanceId", UUID.randomUUID().toString())).frame();
            assertTrue(accepted.path("ok").asBoolean());
            var state = accepted.path("body").path("initial");
            revision = state.path("revision").asLong();
            assertPointState(state, 2_000, revision);
            token = accepted.path("body").path("session").path("accessToken").asString();
            peer.assertNoStateChange();
        }
        try (var peer = new Peer()) {
            var accepted = peer.authenticate(token);
            assertPointState(accepted.frame().path("body").path("initial"), 2_000, revision);
            assertFalse(accepted.frame().path("body").has("session"));
            peer.assertNoStateChange();
            Files.write(Path.of("target/tavern-point-initial.pb"), accepted.wire());
        }
    }

    /** GM显式无cap准备与原回执同事务；重复请求不补发，state.changed和重连保留真实超额余额。 */
    @Test
    void gmUsesTheIndependentBalanceAndPersistentIdempotencyAcrossReconnect() throws Exception {
        var player = login.login("tavern_" + UUID.randomUUID().toString().substring(0, 12));
        String role = player.role().id();
        long finalRevision;
        try (var peer = new Peer()) {
            var initial = peer.authenticate(player.session().accessToken()).frame().path("body").path("initial");
            long initialRevision = initial.path("revision").asLong();
            assertPointState(initial, 2_000, initialRevision);
            String request = UUID.randomUUID().toString();
            var command = Map.of("requestId", request, "kind", "item", "configId", 900401, "quantity", 9999);
            var first = peer.request("gm.grant", command).frame();
            assertTrue(first.path("ok").asBoolean());
            var changed = peer.stateChanged();
            assertPointState(changed.frame().path("body"), 11_999, initialRevision + 1);
            Files.write(Path.of("target/tavern-point-event.pb"), changed.wire());
            Files.write(Path.of("target/tavern-point-snapshot.pb"), changed.wire());
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_gm_grant WHERE role_id=? AND request_id=?",
                    Integer.class, role, request));
            assertEquals(first.path("body"), peer.request("gm.grant", command).frame().path("body"));
            peer.assertNoStateChange();
            var conflict = peer.request("gm.grant", Map.of("requestId", request, "kind", "item",
                    "configId", 900401, "quantity", 1)).frame();
            assertFalse(conflict.path("ok").asBoolean());
            assertEquals("GM_REQUEST_CONFLICT", conflict.path("error").path("code").asString());
            peer.assertNoStateChange();
            finalRevision = initialRevision + 1;
        }
        assertEquals(finalRevision, roles.revision(role));
        assertEquals(11_999, jdbc.queryForObject("SELECT adventure_count FROM game_tavern_point WHERE role_id=?", Long.class, role));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_inventory WHERE role_id=? AND item_id=900401", Integer.class, role));
        try (var peer = new Peer()) {
            var restored = peer.authenticate(player.session().accessToken());
            assertPointState(restored.frame().path("body").path("initial"), 11_999, finalRevision);
            peer.assertNoStateChange();
            Files.write(Path.of("target/tavern-point-restored.pb"), restored.wire());
        }
    }

    /** 新只读状态不开放酒馆任务、刷新、领奖或日常新挂机领取；拒绝不改变余额和版本。 */
    @Test
    void snapshotExtensionDoesNotEnableTavernOrIdleClaimCommands() throws Exception {
        var player = login.login("tavern_" + UUID.randomUUID().toString().substring(0, 12));
        String role = player.role().id();
        try (var peer = new Peer()) {
            peer.authenticate(player.session().accessToken());
            long revision = roles.revision(role);
            for (String name : List.of("tavern.info", "tavern.refresh", "tavern.claim", "tavern.task.accept")) {
                var rejected = peer.request(name, Map.of()).frame();
                assertFalse(rejected.path("ok").asBoolean());
                assertEquals("UNKNOWN_MESSAGE", rejected.path("error").path("code").asString());
            }
            var idleRejected = peer.request("chapter.idle.claim", Map.of("requestId", UUID.randomUUID().toString(),
                    "expectedOperationVersion", 1)).frame();
            assertFalse(idleRejected.path("ok").asBoolean());
            assertEquals("IDLE_CLOSED", idleRejected.path("error").path("code").asString());
            peer.assertNoStateChange();
            assertEquals(revision, roles.revision(role));
            assertEquals(2_000, jdbc.queryForObject("SELECT adventure_count FROM game_tavern_point WHERE role_id=?", Long.class, role));
        }
    }

    /** 快照末段发现普通库存坏类型时，前段冒险点懒建和revision必须一同回滚。 */
    @Test
    void aLaterSnapshotFailureRollsBackLazyInitializationAndItsRevision() {
        var player = login.login("tavern_" + UUID.randomUUID().toString().substring(0, 12));
        String role = player.role().id();
        long revision = roles.revision(role);
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,900401,0,?)",
                role, "illegal-tavern:" + role);
        assertThrows(IllegalStateException.class, () -> snapshots.snapshot("Bearer " + player.session().accessToken()));
        assertEquals(revision, roles.revision(role));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_tavern_point WHERE role_id=?", Integer.class, role));
    }
}
