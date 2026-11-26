/**
 * 在独立 H2 通过正式二进制 WebSocket 核对公会科技的扣费、重置、失败回滚和重连回执。
 * 角色初始余额和测试所需的边界进度由夹具准备，科技与资产结果来自实际业务事务。
 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.protocol.GameProtocol;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:guild_technology_socket;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false",
    "mxzg.rainbow-maintenance.enabled=false", "mxzg.arena-maintenance.enabled=false",
    "mxzg.idle-activity-maintenance.enabled=false", "mxzg.trial-maintenance.enabled=false",
    "mxzg.dreamland-maintenance.enabled=false"
})
@ActiveProfiles("local")
class GuildTechnologySocketTest {
    /** 旧公会捐献和科技点亮共用的真实进包道具。 */
    private static final int MEDAL = 901301;
    /** 读取当前成员状态和各职业点亮报价。 */
    private static final String INFO = "guild.technology.info";
    /** 校验、扣费并点亮下一格的协议。 */
    private static final String UPGRADE = "guild.technology.upgrade";
    /** 清除一个职业的个人科技，并返还已投入材料。 */
    private static final String RESET = "guild.technology.reset";

    /** 独立应用的随机握手端口。 */
    @LocalServerPort private int port;
    /** 仅为隔离测试申请新的真实身份和访问令牌。 */
    @Autowired private DevelopmentLoginService login;
    /** 准备边界夹具并核对持久余额、版本和已提交回执条数。 */
    @Autowired private JdbcTemplate jdbc;
    /** 使用实际普通库存入口为测试角色准备贡献。 */
    @Autowired private InventoryService inventory;
    /** 在库存准备阶段创建单独的资产事务。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 保存本轮创建的角色身份，令牌只在测试握手使用。 */
    private record Player(String roleId, String token) {}

    /** 从同一个资产快照或持久读取获得的余额及全局版本。 */
    private record Wallet(long gold, long diamonds, long medals, long revision) {}

    /** 回包保留从服务端实际收到的原始字节，供 TypeScript 互通验证。 */
    private record Incoming(GameProtocol.Frame frame, byte[] bytes) {}

    /** 两个职业共存，按原表逐格扣费和累计重置，超额请求回滚并能重连恢复原回执。 */
    @Test
    void upgradesAndResetsWithoutDoubleSpendingAfterReconnect() throws Exception {
        var player = player(200_000, 1_400, 100);
        var first = command(1, 0);
        var resetWarrior = command(1, 3);
        GameProtocol.GuildTechnologyReceipt firstReceipt;
        GameProtocol.GuildTechnologyReceipt resetReceipt;
        Wallet finalBalance;
        try (var peer = new Peer()) {
            peer.authenticate(player);
            assertFalse(info(peer, null).getMember());
            peer.rejects("GUILD_NOT_MEMBER", UPGRADE, first);
            peer.createGuild();
            var initial = info(peer, "info");
            assertTrue(initial.getMember());
            assertEquals(0, initial.getVersion());
            assertEquals(60, initial.getMaxStage());
            assertEquals(15, initial.getStageGap());
            assertEquals(500, initial.getResetDiamonds());
            assertEquals(List.of(1, 2, 3, 4), initial.getBranchesList().stream()
                    .map(GameProtocol.GuildTechnologyBranch::getProfession).toList());
            var quoted = branch(initial, 1).getNext();
            assertEquals(18_000, quoted.getGold());
            assertEquals(30, quoted.getMedals());
            assertEquals(1, quoted.getStage());
            assertEquals(1, quoted.getSlot());
            assertFalse(quoted.getBlocked());
            var before = wallet(player);
            assertEquals(1_300, before.diamonds());

            firstReceipt = change(peer, UPGRADE, first, "upgrade");
            assertEquals(first.getRequestId(), firstReceipt.getRequestId());
            assertEquals(1, firstReceipt.getVersion());
            var firstNode = branch(firstReceipt.getState(), 1).getNodes(0);
            assertEquals(102, firstNode.getAttributeId());
            assertEquals(1, firstNode.getLevel());
            assertEquals(30, firstNode.getTotal());
            assertEquals(0, branch(firstReceipt.getState(), 2).getStep());
            assertWalletChange(peer, player, firstReceipt, before, -18_000, 0, -30);

            var afterFirst = wallet(player);
            assertEquals(firstReceipt, change(peer, UPGRADE, first, null));
            peer.rejects("GUILD_TECHNOLOGY_CHANGED", UPGRADE, command(1, 0));
            peer.rejects("GUILD_TECHNOLOGY_REQUEST_CONFLICT", UPGRADE, first.toBuilder().setProfession(2).build());
            peer.rejects("GUILD_TECHNOLOGY_REQUEST_CONFLICT", RESET, first);
            assertEquals(1, receipts(player));
            assertEquals(afterFirst, wallet(player));

            var mage = change(peer, UPGRADE, command(2, 1), null);
            assertEquals(1, branch(mage.getState(), 2).getStep());
            assertWalletChange(peer, player, mage, afterFirst, -18_000, 0, -30);
            var afterMage = wallet(player);
            var second = change(peer, UPGRADE, command(1, 2), null);
            assertEquals(2, branch(second.getState(), 1).getStep());
            assertWalletChange(peer, player, second, afterMage, -21_600, 0, -36);

            var afterSecond = wallet(player);
            assertEquals(4, afterSecond.medals());
            peer.rejects("GUILD_TECHNOLOGY_COST_INSUFFICIENT", UPGRADE, command(4, 3));
            assertEquals(afterSecond, wallet(player), "贡献不足时先扣的金币随同事务回滚");
            assertEquals(second.getState(), info(peer, null));
            assertEquals(3, receipts(player));

            resetReceipt = change(peer, RESET, resetWarrior, "reset");
            assertEquals("reset", resetReceipt.getAction());
            assertEquals(0, branch(resetReceipt.getState(), 1).getStep());
            assertEquals(1, branch(resetReceipt.getState(), 2).getStep());
            assertEquals(600, resetReceipt.getState().getResetDiamonds());
            assertWalletChange(peer, player, resetReceipt, afterSecond, 39_600, -500, 66);
            var afterReset = wallet(player);
            assertEquals(resetReceipt, change(peer, RESET, resetWarrior, null));
            assertEquals(afterReset, wallet(player));
            peer.rejects("GUILD_TECHNOLOGY_NOT_TRAINED", RESET, command(1, 4));

            var resetMage = change(peer, RESET, command(2, 4), null);
            assertEquals(700, resetMage.getState().getResetDiamonds());
            assertWalletChange(peer, player, resetMage, afterReset, 18_000, -600, 30);
            var bothReset = wallet(player);
            assertEquals(before.gold(), bothReset.gold());
            assertEquals(before.medals(), bothReset.medals());

            var tank = change(peer, UPGRADE, command(4, 5), null);
            assertWalletChange(peer, player, tank, bothReset, -18_000, 0, -30);
            finalBalance = wallet(player);
            peer.rejects("GUILD_TECHNOLOGY_DIAMONDS_INSUFFICIENT", RESET, command(4, 6));
            assertEquals(finalBalance, wallet(player));
            assertEquals(tank.getState(), info(peer, null));
            assertEquals(6, receipts(player));
        }

        try (var reconnected = new Peer()) {
            assertEquals(finalBalance, wallet(reconnected.authenticate(player)));
            var recoveredUpgrade = change(reconnected, UPGRADE, first, "reconnect");
            assertEquals(firstReceipt.getVersion(), recoveredUpgrade.getVersion());
            assertEquals(firstReceipt.getAssetRevision(), recoveredUpgrade.getAssetRevision());
            assertEquals(6, recoveredUpgrade.getState().getVersion());
            assertEquals(0, branch(recoveredUpgrade.getState(), 1).getStep());
            assertEquals(1, branch(recoveredUpgrade.getState(), 4).getStep());

            var recoveredReset = change(reconnected, RESET, resetWarrior, null);
            assertEquals(resetReceipt.getRequestId(), recoveredReset.getRequestId());
            assertEquals(resetReceipt.getAssetRevision(), recoveredReset.getAssetRevision());
            assertEquals(resetReceipt.getVersion(), recoveredReset.getVersion());
            assertEquals(recoveredUpgrade.getState(), recoveredReset.getState());
            assertEquals(finalBalance, wallet(player));
            assertEquals(6, receipts(player));
        }
    }

    /** 有效会员和足额资产也须符合四职业最高与最低阶段的差值限制。 */
    @Test
    void rejectsStageAdvanceWhenAnotherProfessionIsTooLow() throws Exception {
        var player = player(3_000_000, 1_000, 10_000);
        jdbc.update("INSERT INTO game_guild_technology(role_id,version,resets_completed) VALUES (?,96,0)", player.roleId());
        jdbc.update("INSERT INTO game_guild_technology_branch(role_id,profession,stage,step) VALUES (?,1,16,6)", player.roleId());
        try (var peer = new Peer()) {
            peer.authenticate(player);
            peer.createGuild();
            var state = info(peer, null);
            var quote = branch(state, 1).getNext();
            assertEquals(17, quote.getStage());
            assertEquals(1, quote.getSlot());
            assertTrue(quote.getBlocked());
            assertFalse(branch(state, 2).getNext().getBlocked());
            var before = wallet(player);
            peer.rejects("GUILD_TECHNOLOGY_STAGE_GAP", UPGRADE, command(1, 96));
            assertEquals(before, wallet(player));
            assertEquals(state, info(peer, null));
            assertEquals(0, receipts(player));
        }
    }

    /** 只在独立库预置角色等级和可消费资产，之后由真实公会协议建会。 */
    private Player player(long gold, long diamonds, long medals) {
        var loggedIn = login.login("clan_tech_" + id().substring(0, 8), "local-1");
        var roleId = loggedIn.role().id();
        jdbc.update("UPDATE game_role SET role_level=40,gold=?,diamonds=? WHERE id=?", gold, diamonds, roleId);
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(roleId, MEDAL, medals));
        return new Player(roleId, loggedIn.session().accessToken());
    }

    /** 构造当前职业和树版本对应的玩家确认命令。 */
    private static GameProtocol.GuildTechnologyCommand command(int profession, long version) {
        return GameProtocol.GuildTechnologyCommand.newBuilder().setRequestId(id())
                .setProfession(profession).setExpectedVersion(version).build();
    }

    /** 返回权威科技树，并按需保存客户端互通使用的原始应答。 */
    private static GameProtocol.GuildTechnologyState info(Peer peer, String fixture) throws Exception {
        var incoming = peer.success(INFO, frame -> frame.setEmpty(GameProtocol.Empty.getDefaultInstance()));
        capture(incoming, fixture);
        return incoming.frame().getGuildTechnologyState();
    }

    /** 返回一次成功的职业操作回执，并保留真实帧。 */
    private static GameProtocol.GuildTechnologyReceipt change(Peer peer, String message,
            GameProtocol.GuildTechnologyCommand command, String fixture) throws Exception {
        var incoming = peer.success(message, frame -> frame.setGuildTechnologyCommand(command));
        capture(incoming, fixture);
        return incoming.frame().getGuildTechnologyReceipt();
    }

    /** 输出项目忽略目录中的实际服务端字节供 TypeScript 互通检查。 */
    private static void capture(Incoming incoming, String fixture) throws Exception {
        if (fixture != null) {
            Files.write(Path.of("target", "guild-technology-" + fixture + ".pb"), incoming.bytes());
        }
    }

    /** 按稳定职业编号找到对应分支。 */
    private static GameProtocol.GuildTechnologyBranch branch(GameProtocol.GuildTechnologyState state, int profession) {
        return state.getBranchesList().stream().filter(row -> row.getProfession() == profession).findFirst().orElseThrow();
    }

    /** 获取实际成功记录数，重试或失败不能追加回执。 */
    private int receipts(Player player) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_guild_technology_receipt WHERE role_id=?",
                Integer.class, player.roleId());
    }

    /** 读取交易提交后的三种余额和同一角色的权威资产版本。 */
    private Wallet wallet(Player player) {
        return jdbc.queryForObject("""
                SELECT r.gold,r.diamonds,COALESCE(i.quantity,0),r.state_revision
                  FROM game_role r LEFT JOIN game_inventory i ON i.role_id=r.id AND i.item_id=? WHERE r.id=?
                """, (row, index) -> new Wallet(row.getLong(1), row.getLong(2), row.getLong(3), row.getLong(4)),
                MEDAL, player.roleId());
    }

    /** 从真实提交后的同版快照读取两种钱包资产和实际库存。 */
    private static Wallet wallet(GameProtocol.Snapshot snapshot) {
        long medals = snapshot.getInventoryList().stream().filter(row -> row.getItemId() == MEDAL)
                .mapToLong(GameProtocol.Item::getQuantity).sum();
        return new Wallet(snapshot.getRole().getGold(), snapshot.getRole().getDiamonds(), medals, snapshot.getRevision());
    }

    /** 核对实际余额变化、单次持久版本增长，以及客户端收到的同版资产。 */
    private void assertWalletChange(Peer peer, Player player, GameProtocol.GuildTechnologyReceipt receipt,
            Wallet before, long gold, long diamonds, long medals) throws Exception {
        var expected = new Wallet(before.gold() + gold, before.diamonds() + diamonds, before.medals() + medals,
                before.revision() + 1);
        assertEquals(expected.revision(), receipt.getAssetRevision());
        assertEquals(expected, wallet(player));
        assertEquals(expected, wallet(peer.awaitSnapshot(expected.revision())));
    }

    /** 对齐真实请求、连接实例和外层传输的 UUID 格式。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }

    /** 测试代理接收实际游戏子协议，同时保存最新的资产提交推送。 */
    private final class Peer implements WebSocket.Listener, AutoCloseable {
        /** 每个连接的 HTTP 客户端资源由本代理释放。 */
        private final HttpClient client = HttpClient.newHttpClient();
        /** 响应和推送按 WebSocket 的实际接收顺序等待测试线程。 */
        private final BlockingQueue<Incoming> received = new LinkedBlockingQueue<>();
        /** WebSocket 分片结束时累积成完整一帧。 */
        private final ByteArrayOutputStream fragments = new ByteArrayOutputStream();
        /** 与本轮隔离应用建立的真实业务连接。 */
        private final WebSocket socket;
        /** 鉴权应答为同一协议连接确立的标识。 */
        private String connectionId;
        /** 当前连接已经接纳的最近 asset revision，初始值来自鉴权。 */
        private GameProtocol.Snapshot latest;

        /** 建立只接受实际二进制子协议的测试连接。 */
        private Peer() {
            socket = client.newWebSocketBuilder().subprotocols(GameProtocolCodec.SUBPROTOCOL)
                    .connectTimeout(Duration.ofSeconds(5))
                    .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), this).join();
        }

        /** 启动 JDK WebSocket 的接收窗口。 */
        @Override
        public void onOpen(WebSocket connection) {
            connection.request(1);
        }

        /** 保留原始二进制回包，结束分片后校验完整 Protobuf。 */
        @Override
        public CompletionStage<?> onBinary(WebSocket connection, ByteBuffer fragment, boolean last) {
            byte[] part = new byte[fragment.remaining()];
            fragment.get(part);
            fragments.writeBytes(part);
            if (last) {
                byte[] bytes = fragments.toByteArray();
                fragments.reset();
                try {
                    received.add(new Incoming(GameProtocol.Frame.parseFrom(bytes), bytes));
                } catch (Exception failure) {
                    throw new AssertionError("无法解析公会科技的服务端帧", failure);
                }
            }
            connection.request(1);
            return null;
        }

        /** 从真实认证应答读取当前身份和初始资产快照。 */
        private GameProtocol.Snapshot authenticate(Player player) throws Exception {
            var reply = success("session.authenticate", frame -> frame.setAuthenticate(GameProtocol.Authenticate.newBuilder()
                    .setAccessToken(player.token()).setClientInstanceId(id()))).frame().getAccepted();
            assertEquals(player.roleId(), reply.getRoleId());
            connectionId = reply.getConnectionId();
            latest = reply.getInitial();
            return latest;
        }

        /** 通过真实建会协议获得当前科技点亮所需的会员身份。 */
        private void createGuild() throws Exception {
            var accepted = success("guild.change", frame -> frame.setGuildChangeRequest(GameProtocol.GuildChangeRequest
                    .newBuilder().setAction("CREATE").setRequestId(id()).setName("科技" + id().substring(0, 8))));
            assertTrue(accepted.frame().getGuildState().hasGuild());
        }

        /** 确认识别到服务端拒绝的实际业务码。 */
        private void rejects(String code, String message, GameProtocol.GuildTechnologyCommand command) throws Exception {
            var response = request(message, frame -> frame.setGuildTechnologyCommand(command)).frame();
            assertFalse(response.getOk());
            assertEquals(code, response.getError().getCode());
        }

        /** 仅返回所提交命令的成功帧，错误附带稳定业务码。 */
        private Incoming success(String message, Consumer<GameProtocol.Frame.Builder> payload) throws Exception {
            var response = request(message, payload);
            assertTrue(response.frame().getOk(), () -> message + " " + response.frame().getError().getCode());
            return response;
        }

        /** 为当前已鉴权连接发送新的传输请求，在等应答期间接收已提交的资产变化。 */
        private Incoming request(String message, Consumer<GameProtocol.Frame.Builder> payload) throws Exception {
            var id = id();
            var request = GameProtocol.Frame.newBuilder().setVersion(1).setKind("request").setName(message).setId(id);
            if (connectionId != null) {
                request.setConnectionId(connectionId);
            }
            payload.accept(request);
            socket.sendBinary(request.build().toByteString().asReadOnlyByteBuffer(), true).get(5, TimeUnit.SECONDS);
            var response = next();
            while (response.frame().getKind().equals("event")) {
                acceptEvent(response.frame());
                response = next();
            }
            assertEquals("response", response.frame().getKind());
            assertEquals(id, response.frame().getId());
            assertEquals(message, response.frame().getName());
            return response;
        }

        /** 等待本次成功回执的最新资产帧；合法推送可能先于或晚于应答。 */
        private GameProtocol.Snapshot awaitSnapshot(long revision) throws InterruptedException {
            while (latest.getRevision() < revision) {
                acceptEvent(next().frame());
            }
            assertEquals(revision, latest.getRevision());
            return latest;
        }

        /** 只用版本更新来自同一连接的 `state.changed`，忽略其他玩法事件。 */
        private void acceptEvent(GameProtocol.Frame frame) {
            assertEquals("event", frame.getKind());
            if (frame.getName().equals("state.changed") && frame.getSnapshot().getRevision() > latest.getRevision()) {
                latest = frame.getSnapshot();
            }
        }

        /** 给实际网络回包一个有限等待时间。 */
        private Incoming next() throws InterruptedException {
            var next = received.poll(10, TimeUnit.SECONDS);
            assertNotNull(next, "公会科技 WebSocket 等回包超时");
            return next;
        }

        /** 主动断开测试连接，下一次鉴权由独立连接恢复。 */
        @Override
        public void close() {
            socket.abort();
            client.close();
        }
    }
}
