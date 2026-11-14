/**
 * 精灵统一快照的真实WS回归：独立H2、回环随机端口，验证首包、提交后事件与重连身份。
 * 实例由测试直接调用可信领域服务准备，不新增GM或玩家发放协议；导出无凭证二进制供TS互通检查。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
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
    "spring.datasource.url=jdbc:h2:mem:spirit_socket;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class SpiritSocketTest {
    /** 当前用例组独占的回环随机端口，不连接日常后端。 */
    @LocalServerPort
    private int port;
    /** 合成测试角色登录，不借用玩家凭证或数据库。 */
    @Autowired
    private DevelopmentLoginService login;
    /** 真实精灵生成和读取入口，仅在测试事务内准备实例。 */
    @Autowired
    private SpiritInventoryService spirits;
    /** 验证普通库存不能写入假精灵。 */
    @Autowired
    private InventoryService inventory;
    /** 读取已提交资产版本并模拟已有角色锁。 */
    @Autowired
    private RoleRepository roles;
    /** 验证错误普通堆叠不能通过统一快照伪装成合法实例。 */
    @Autowired
    private SessionSnapshotService snapshots;
    /** 独立库中的事务边界。 */
    @Autowired
    private PlatformTransactionManager transactions;
    /** 只向独立库注入损坏记录，检查读取拒绝。 */
    @Autowired
    private JdbcTemplate jdbc;

    /** 一条真实网络帧及其解码投影，不包含测试请求令牌。 */
    private record Received(byte[] wire, JsonNode frame) {}

    /** 本测试专用二进制连接，分片在监听线程合并，断开时释放所有网络资源。 */
    private final class Peer implements WebSocket.Listener, AutoCloseable {
        /** 当前连接的JDK客户端，结束时关闭以释放线程。 */
        private final HttpClient client = HttpClient.newHttpClient();
        /** 原始完整帧队列，保留真实字节供跨语言验证。 */
        private final BlockingQueue<byte[]> incoming = new LinkedBlockingQueue<>();
        /** 当前二进制消息的分片，last=true后清空。 */
        private final ByteArrayOutputStream fragments = new ByteArrayOutputStream();
        /** 当前回环连接，不执行文本消息或HTTP业务调用。 */
        private final WebSocket socket;
        /** 鉴权成功后设置，后续业务信封复用服务端确认的连接ID。 */
        private String connectionId;

        /** 建立有超时和唯一子协议的独立WS连接。 */
        private Peer() {
            socket = client.newWebSocketBuilder().subprotocols(GameProtocolCodec.SUBPROTOCOL)
                    .connectTimeout(Duration.ofSeconds(5))
                    .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), this).join();
        }

        /** 启用首帧消费，避免客户端背压导致测试等待。 */
        @Override
        public void onOpen(WebSocket opened) {
            opened.request(1);
        }

        /** 合并原始分片后入队，不在网络线程记录凭证或修改资产。 */
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

        /** 在固定期限内取实际二进制并解码，超时直接使当前测试失败。 */
        private Received receive() throws Exception {
            byte[] wire = incoming.poll(5, TimeUnit.SECONDS);
            assertNotNull(wire, "精灵快照未按期到达");
            return new Received(wire, GameProtocolCodec.decode(wire));
        }

        /** 完成已有鉴权协议，保存连接ID；不引入精灵读取或发放请求。 */
        private Received authenticate(String token) throws Exception {
            var result = request("session.authenticate", Map.of("accessToken", token,
                    "clientInstanceId", UUID.randomUUID().toString()));
            assertTrue(result.frame().path("ok").asBoolean());
            connectionId = result.frame().path("body").path("connectionId").asString();
            return result;
        }

        /** 发出一条正式Protobuf请求，并核对关联ID和名称。 */
        private Received request(String name, Object body) throws Exception {
            String id = UUID.randomUUID().toString();
            var frame = new LinkedHashMap<String, Object>(Map.of("version", 1, "kind", "request",
                    "name", name, "id", id, "body", body));
            if (connectionId != null) {
                frame.put("connectionId", connectionId);
            }
            socket.sendBinary(ByteBuffer.wrap(GameProtocolCodec.encode(frame)), true).get(5, TimeUnit.SECONDS);
            var received = receive();
            assertEquals("response", received.frame().path("kind").asString());
            assertEquals(id, received.frame().path("id").asString());
            assertEquals(name, received.frame().path("name").asString());
            return received;
        }

        /** 中止当前测试连接后关闭客户端，不残留连接或线程。 */
        @Override
        public void close() {
            socket.abort();
            client.close();
        }
    }

    /** 创建零精灵的合成角色，真实配置决定其余初始资产。 */
    private DevelopmentLoginService.LoginResult player() {
        return login.login("spirit_" + UUID.randomUUID().toString().substring(0, 12));
    }

    /** 两次生成使用同一合法随机点，证明同属性仍保留不同实例ID。 */
    private Random identicalRandom() {
        return new Random(0) {
            /** 始终选择当前半开区间第一个合法点，技能数量固定时也仍会调用。 */
            @Override
            public int nextInt(int bound) {
                return 0;
            }

            /** 旧权重实现抽double，固定点同样保持每次生成路径一致。 */
            @Override
            public double nextDouble() {
                return 0;
            }
        };
    }

    /** 提取实例身份集合，同时校验每件具有实际单能力和一个完整技能。 */
    private HashSet<String> identities(JsonNode state) {
        assertEquals(1, state.path("schemaVersion").asInt());
        var ids = new HashSet<String>();
        for (var item : state.path("items")) {
            assertEquals(2000002, item.path("itemId").asInt());
            assertTrue(item.path("abilityId").asInt() > 0);
            assertEquals(1, item.path("skills").size());
            assertEquals(1, item.path("skills").get(0).path("sort").asInt());
            assertTrue(item.path("skills").get(0).path("skillId").asInt() > 0);
            assertTrue(ids.add(item.path("instanceId").asString()));
        }
        return ids;
    }

    /** 正式首包、提交事件、重连均携带同一真实实例；数量不会落入普通库存或触发领取。 */
    @Test
    void independentInstancesTravelThroughInitialEventAndReconnect() throws Exception {
        var player = player();
        String role = player.role().id();
        long before = roles.revision(role);
        var expected = new ArrayList<String>();
        try (var peer = new Peer()) {
            var accepted = peer.authenticate(player.session().accessToken());
            assertTrue(identities(accepted.frame().path("body").path("initial").path("spiritInventory")).isEmpty());
            new TransactionTemplate(transactions).executeWithoutResult(status -> {
                roles.lock(role);
                for (var item : spirits.grant(role, 2000002, 2, identicalRandom())) {
                    expected.add(item.instanceId());
                }
            });
            var changed = peer.receive();
            assertEquals("state.changed", changed.frame().path("name").asString());
            assertEquals(before + 1, changed.frame().path("body").path("revision").asLong());
            assertEquals(new HashSet<>(expected), identities(changed.frame().path("body").path("spiritInventory")));
            assertEquals(2, new HashSet<>(expected).size());
            Files.write(Path.of("target/spirit-event.pb"), changed.wire());
        }
        assertEquals(before + 1, roles.revision(role));
        assertTrue(inventory.list(role).stream().noneMatch(item -> item.itemId() == 2000002));
        try (var restored = new Peer()) {
            var accepted = restored.authenticate(player.session().accessToken());
            assertEquals(new HashSet<>(expected), identities(accepted.frame().path("body").path("initial").path("spiritInventory")));
            assertFalse(accepted.frame().path("body").has("session"), "互通文件不能携带会话凭证");
            Files.write(Path.of("target/spirit-restored.pb"), accepted.wire());
        }
        assertEquals(before + 1, roles.revision(role));
        try (var other = new Peer()) {
            var accepted = other.authenticate(player().session().accessToken());
            assertTrue(identities(accepted.frame().path("body").path("initial").path("spiritInventory")).isEmpty());
        }
    }

    /** 原普通库存写入口及完整快照都拒绝假精灵，不迁移或猜补旧随机属性。 */
    @Test
    void stackInventoryCannotMasqueradeAsSpiritInstances() {
        var player = player();
        String role = player.role().id();
        long before = roles.revision(role);
        assertThrows(IllegalArgumentException.class, () -> new TransactionTemplate(transactions)
                .executeWithoutResult(status -> inventory.credit(role, 2000002, 1)));
        assertEquals(before, roles.revision(role));
        assertTrue(inventory.list(role).isEmpty());
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,?,?,?)",
                role, 2000002, 1, UUID.randomUUID().toString());
        assertThrows(IllegalStateException.class, () -> snapshots.snapshot("Bearer " + player.session().accessToken()));
        assertEquals(before, roles.revision(role));
    }

    /** 领取和精灵写入均无业务消息入口，不能用新增快照字段反向推断接口开放。 */
    @Test
    void snapshotExtensionDoesNotOpenNewPlayerCommands() throws Exception {
        var player = player();
        long before = roles.revision(player.role().id());
        try (var peer = new Peer()) {
            peer.authenticate(player.session().accessToken());
            for (String name : List.of("chapter.idle.claim", "spirit.grant", "spirit.upgrade", "spirit.equip")) {
                var response = peer.request(name, Map.of());
                assertFalse(response.frame().path("ok").asBoolean());
                assertEquals("UNKNOWN_MESSAGE", response.frame().path("error").path("code").asString());
            }
        }
        assertEquals(before, roles.revision(player.role().id()));
    }
}
