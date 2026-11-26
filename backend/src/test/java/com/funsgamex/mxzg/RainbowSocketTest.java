/**
 * 彩虹圣殿的真实 WebSocket 联调，使用独立 H2 库和正常战斗结算。
 * 测试角色只预置等级、竞技场已取得的名次和养成资料，夺位、邮件及属性由生产入口实际提交。
 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.rainbow.RainbowRules;
import com.funsgamex.mxzg.rainbow.RainbowService;
import com.funsgamex.mxzg.time.GameClock;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:rainbow_socket;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false",
    "mxzg.rainbow-maintenance.enabled=false", "mxzg.arena-maintenance.enabled=false",
    "mxzg.idle-activity-maintenance.enabled=false", "mxzg.trial-maintenance.enabled=false",
    "mxzg.dreamland-maintenance.enabled=false"
})
@ActiveProfiles("local")
class RainbowSocketTest {
    /** 零点与到期只在这个隔离应用上下文移动。 */
    private static final long INITIAL_TIME = Instant.parse("2026-11-26T03:00:00Z").getEpochSecond();
    /** 两名挑战者及弱队通过同一个本服榜和神位状态交互。 */
    private static final String HOME_SERVER = "local-1";
    /** 其余角色使用另一独立区服，验证公共记录的区服隔离。 */
    private static final String OTHER_SERVER = "local-2";

    /** 当前测试的随机 HTTP 握手端口。 */
    @LocalServerPort int port;
    /** 开发角色由正常登录服务建立，确保独立会话及配置数据。 */
    @Autowired DevelopmentLoginService login;
    /** 为测试角色准备既有成长事实，检查战力、未发资产与待投递通知。 */
    @Autowired JdbcTemplate jdbc;
    /** 计算预置测试英雄的实际成长上限。 */
    @Autowired HeroGrowthRules growth;
    /** 使用真实守军配置核对回放中的模板、等级、星级和站位。 */
    @Autowired RainbowRules rules;
    /** 后台关闭自动调度。测试显式执行生产到期和邮件事务。 */
    @Autowired RainbowService rainbow;
    /** 测试直接推进独立服时间，不改变 WebSocket 鉴权时钟。 */
    @Autowired GameClock clock;

    /** 保存临时角色的私有令牌及本次实际名册，不打印令牌。 */
    private record Player(String roleId, String token, List<Lineup.Slot> slots) {}

    /** 测试连接使用相同二进制编解码与鉴权顺序，提交事件单独消费。 */
    private final class Peer implements WebSocket.Listener, AutoCloseable {
        /** 为单个测试连接持有并关闭 HTTP 客户端工作线程。 */
        private final HttpClient client = HttpClient.newHttpClient();
        /** 有序接收服务端二进制帧，用户线程从队列按请求 ID 查找应答。 */
        private final BlockingQueue<JsonNode> received = new LinkedBlockingQueue<>();
        /** 等待业务应答时先到的推送，供同一角色后续状态断言。 */
        private final List<JsonNode> events = new ArrayList<>();
        /** 分片缓冲，只由 JDK WebSocket 回调写入，收到末片后清空。 */
        private final ByteArrayOutputStream fragments = new ByteArrayOutputStream();
        /** 活跃的会话连接，关闭时主动停止。 */
        private final WebSocket socket;
        /** 服务端鉴权回显标识，未鉴权时为空。 */
        private String connectionId;

        /** 通过随机端口打开测试 WebSocket，只请求实际二进制子协议。 */
        Peer() {
            socket = client.newWebSocketBuilder().subprotocols(GameProtocolCodec.SUBPROTOCOL)
                    .connectTimeout(Duration.ofSeconds(5))
                    .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), this).join();
        }

        /** 请求首个接收窗口，避免 JDK 等待 backpressure 而未消费帧。 */
        @Override
        public void onOpen(WebSocket peer) {
            peer.request(1);
        }

        /** 将末片合成一条业务信封，再允许下一帧进入。 */
        @Override
        public CompletionStage<?> onBinary(WebSocket peer, ByteBuffer bytes, boolean last) {
            byte[] part = new byte[bytes.remaining()];
            bytes.get(part);
            fragments.writeBytes(part);
            if (last) {
                try {
                    received.add(GameProtocolCodec.decode(fragments.toByteArray()));
                } catch (Exception error) {
                    throw new AssertionError("无法解码圣殿测试回包", error);
                }
                fragments.reset();
            }
            peer.request(1);
            return null;
        }

        /** 认证后返回真实初始化快照，断线时重新建立连接并恢复本人的状态。 */
        JsonNode authenticate(Player player) throws Exception {
            var response = body("session.authenticate", Map.of("accessToken", player.token(), "clientInstanceId", id()));
            connectionId = response.path("connectionId").asString();
            return response.path("initial");
        }

        /** 返回通过信封校验的应答体，失败时附实际业务码。 */
        JsonNode body(String name, Map<String, ?> payload) throws Exception {
            var response = request(name, payload);
            assertTrue(response.path("ok").asBoolean(), () -> name + " " + response.path("error"));
            return response.path("body");
        }

        /** 确认确实收到预期业务拒绝。 */
        void rejects(String code, String name, Map<String, ?> payload) throws Exception {
            var response = request(name, payload);
            assertFalse(response.path("ok").asBoolean());
            assertEquals(code, response.path("error").path("code").asString());
        }

        /** 按协议名称发送实际 WebSocket 命令，期间挂起推送等待单独验收。 */
        JsonNode request(String name, Map<String, ?> payload) throws Exception {
            String outerId = id();
            var frame = new LinkedHashMap<String, Object>(Map.of(
                    "version", 1, "kind", "request", "name", name, "id", outerId, "body", payload));
            if (connectionId != null) {
                frame.put("connectionId", connectionId);
            }
            socket.sendBinary(ByteBuffer.wrap(GameProtocolCodec.encode(frame)), true).get(5, TimeUnit.SECONDS);
            var reply = next();
            while ("event".equals(reply.path("kind").asString())) {
                events.add(reply);
                reply = next();
            }
            assertEquals(outerId, reply.path("id").asString());
            assertEquals(name, reply.path("name").asString());
            return reply;
        }

        /** 等到只属于当前连接的有效面板快照，跳过其他正常提交推送。 */
        JsonNode latestSnapshot(Predicate<JsonNode> matches) throws Exception {
            var pending = new ArrayList<>(events);
            events.clear();
            for (int index = 0; index < 12; index++) {
                var frame = index >= pending.size() ? next() : pending.get(index);
                if ("state.changed".equals(frame.path("name").asString()) && matches.test(frame.path("body"))) {
                    return frame.path("body");
                }
            }
            throw new AssertionError("缺少本次圣殿属性变化的资产快照");
        }

        /** 给每条真实回包一个有限等待窗口。 */
        private JsonNode next() throws InterruptedException {
            var reply = received.poll(10, TimeUnit.SECONDS);
            assertNotNull(reply, "彩虹圣殿 WebSocket 等待回包超时");
            return reply;
        }

        /** 结束指定角色的当前测试会话连接。 */
        @Override
        public void close() {
            socket.abort();
            client.close();
        }
    }

    /** 两个同服角色实际争夺神位，核对资格、独立阵容、战报、属性、到期和分服隔离。 */
    @Test
    void occupiesAndReplacesShrinesOverBinarySocket() throws Exception {
        clock.setEpochSeconds(INITIAL_TIME);
        try {
            var first = player(HOME_SERVER, 34, true);
            var second = player(HOME_SERVER, 35, true);
            var visitor = player(OTHER_SERVER, 35, false);
            try (var one = new Peer(); var two = new Peer(); var outside = new Peer()) {
                one.authenticate(first);
                two.authenticate(second);
                outside.authenticate(visitor);
                Map<String, Object> noArgs = Map.of();
                one.rejects("RAINBOW_LEVEL", "rainbow.state", noArgs);
                jdbc.update("UPDATE game_role SET role_level=35 WHERE id=?", first.roleId());
                var unopened = one.body("rainbow.state", noArgs);
                assertEquals(0, unopened.path("arenaRank").asInt());
                assertEquals(6, unopened.path("seats").size());
                assertEquals(12, seat(unopened, 4).path("heroStar").asInt());
                one.rejects("RAINBOW_RANK", "rainbow.challenge", challenge(4, 1, 0));

                saveMain(one, first);
                saveMain(two, second);
                score(first, 950);
                score(second, 900);
                addHigherRanks();
                var ready = one.body("rainbow.state", noArgs);
                assertEquals(11, ready.path("arenaRank").asInt());
                one.rejects("RAINBOW_RANK", "rainbow.challenge", challenge(1, 1, 0));
                one.rejects("RAINBOW_FORMATION_EMPTY", "rainbow.challenge", challenge(4, 1, 0));
                long oneLineup = saveRainbow(one, first);
                long twoLineup = saveRainbow(two, second);
                one.rejects("RAINBOW_FORMATION_CHANGED", "rainbow.challenge", challenge(4, 1, 0));
                one.rejects("RAINBOW_REQUEST_INVALID", "rainbow.challenge", challenge(4, 2, oneLineup));

                long firstPower = currentPower(first);
                long secondPower = currentPower(second);
                var firstWallet = wallet(first);
                var secondWallet = wallet(second);
                var firstAttempt = challenge(4, 1, oneLineup);
                var won = exported(one, "rainbow.challenge", firstAttempt, "challenge");
                assertWin(won, first, 4, 1);
                var firstSeat = seat(won.path("state"), 4);
                assertEquals(259_200_000L, firstSeat.path("occupiedUntil").asLong()
                        - won.path("state").path("serverTime").asLong());
                assertEquals(rules.seat(4).attributes().get(201).longValue(), firstSeat.path("attackBonus").asLong());
                assertEquals(0, won.path("state").path("cooldownUntil").asLong());
                assertReplayEnemies(won.path("replay"), 3, 1);
                assertTrue(currentPower(first) > firstPower);
                var powered = one.latestSnapshot(snapshot -> snapshot.path("role").path("power").asLong() > firstPower);
                assertEquals(2, powered.path("mainFormation").path("slots").size());
                one.rejects("RAINBOW_HOLDING", "rainbow.challenge", challenge(4, 5, oneLineup));

                var occupiedSecond = two.body("rainbow.challenge", challenge(5, 10, twoLineup));
                assertWin(occupiedSecond, second, 5, 10);
                assertReplayEnemies(occupiedSecond.path("replay"), 3, 10);
                var replaced = two.body("rainbow.challenge", challenge(4, 5, twoLineup));
                assertWin(replaced, second, 4, 6);
                assertReplayEnemies(replaced.path("replay"), 3, 6);
                assertFalse(seat(replaced.path("state"), 5).has("owner"));
                assertEquals(10, seat(replaced.path("state"), 5).path("evolution").asInt());
                assertEquals(firstPower, currentPower(first));
                assertTrue(currentPower(second) > secondPower);
                one.latestSnapshot(snapshot -> snapshot.path("role").path("power").asLong(-1) == firstPower);
                assertEquals(firstWallet, wallet(first));
                assertEquals(secondWallet, wallet(second));

                var history = exported(one, "rainbow.history", Map.of("seatId", 4), "history").path("records");
                assertEquals(2, history.size());
                assertEquals(5, history.get(0).path("evolution").asInt());
                assertEquals(1, history.get(1).path("evolution").asInt());
                assertEquals(first.slots().size(), history.get(1).path("heroes").size());
                var replayQuery = Map.of("seatId", 4, "battleId", won.path("battleId").asString());
                assertEquals(won.path("replay"), exported(two, "rainbow.replay", replayQuery, "replay"));
                assertTrue(outside.body("rainbow.history", Map.of("seatId", 4)).path("records").isEmpty());
                assertFalse(seat(outside.body("rainbow.state", noArgs), 4).has("owner"));
                outside.rejects("RAINBOW_REPLAY_MISSING", "rainbow.replay", replayQuery);
                two.rejects("RAINBOW_REPLAY_MISSING", "rainbow.replay", Map.of(
                        "seatId", 5, "battleId", won.path("battleId").asString()));

                deliver(first, false);
                assertMail(one, "已被其他人占据");
                one.close();
                try (var restored = new Peer()) {
                    var initial = restored.authenticate(first);
                    assertEquals(2, initial.path("mainFormation").path("slots").size());
                    var receipt = restored.body("rainbow.challenge", firstAttempt);
                    assertEquals(won.path("battleId"), receipt.path("battleId"));
                    assertEquals(won.path("replay"), receipt.path("replay"));
                    assertEquals(second.roleId(), seat(receipt.path("state"), 4).path("owner").path("roleId").asString());
                    assertEquals(6, receipt.path("state").path("lineup").path("slots").size());
                    restored.rejects("RAINBOW_REQUEST_CONFLICT", "rainbow.challenge", Map.of(
                            "requestId", firstAttempt.get("requestId"), "seatId", 4, "evolution", 5,
                            "expectedLineupVersion", oneLineup));
                }
                assertEquals(1, attempts(first));
                assertEquals(2, attempts(second));

                var live = seat(replaced.path("state"), 4);
                long expiration = live.path("occupiedUntil").asLong();
                two.close();
                clock.setEpochSeconds(expiration / 1000 - 10);
                rainbow.releaseExpired(HOME_SERVER);
                assertEquals(second.roleId(), jdbc.queryForObject(
                        "SELECT role_id FROM game_rainbow_seat WHERE server_id=? AND seat_id=4", String.class, HOME_SERVER));
                clock.setEpochSeconds(expiration / 1000 + 1);
                rainbow.releaseExpired(HOME_SERVER);
                rainbow.releaseExpired(HOME_SERVER);
                assertEquals(secondPower, currentPower(second));
                deliver(second, true);
                try (var restored = new Peer()) {
                    restored.authenticate(second);
                    var state = exported(restored, "rainbow.state", noArgs, "state");
                    assertFalse(seat(state, 4).has("owner"));
                    assertEquals(6, seat(state, 4).path("evolution").asInt());
                    assertEquals(6, state.path("lineup").path("slots").size());
                    assertMail(restored, "达到时间上限自动失效");
                }
            }
        } finally {
            clock.reset();
        }
    }

    /** 弱队实际战败不会留下神位或公开战绩，冷却跨连接生效且原请求可恢复。 */
    @Test
    void restoresFailureReceiptAndEnforcesCooldownOverReconnect() throws Exception {
        clock.setEpochSeconds(INITIAL_TIME + 12 * 3600);
        try {
            var player = player(OTHER_SERVER, 35, false);
            Map<String, Object> attempt;
            JsonNode lost;
            long version;
            var balance = wallet(player);
            try (var peer = new Peer()) {
                peer.authenticate(player);
                saveMain(peer, player);
                score(player, 880);
                version = saveRainbow(peer, player);
                attempt = challenge(6, 1, version);
                lost = exported(peer, "rainbow.challenge", attempt, "failure");
                assertFalse(lost.path("won").asBoolean());
                assertReplayEnemies(lost.path("replay"), 3, 1);
                assertFalse(seat(lost.path("state"), 6).has("owner"));
                assertEquals(0, seat(lost.path("state"), 6).path("evolution").asInt());
                long end = lost.path("state").path("cooldownUntil").asLong();
                assertEquals(1_200_000, end - lost.path("state").path("serverTime").asLong());
                peer.rejects("RAINBOW_COOLDOWN", "rainbow.challenge", challenge(4, 5, version));
                assertTrue(peer.body("rainbow.history", Map.of("seatId", 6)).path("records").isEmpty());
                peer.rejects("RAINBOW_REPLAY_MISSING", "rainbow.replay",
                        Map.of("seatId", 6, "battleId", lost.path("battleId").asString()));
            }
            try (var peer = new Peer()) {
                peer.authenticate(player);
                var recovered = peer.body("rainbow.challenge", attempt);
                assertEquals(lost.path("battleId"), recovered.path("battleId"));
                assertEquals(lost.path("replay"), recovered.path("replay"));
                assertEquals(1, attempts(player));
                long cooldown = recovered.path("state").path("cooldownUntil").asLong();
                clock.setEpochSeconds(cooldown / 1000 - 10);
                peer.rejects("RAINBOW_COOLDOWN", "rainbow.challenge", challenge(6, 5, version));
                clock.setEpochSeconds(cooldown / 1000 + 1);
                var next = peer.body("rainbow.challenge", challenge(6, 5, version));
                assertFalse(next.path("won").asBoolean());
                assertNotEquals(lost.path("battleId"), next.path("battleId"));
                assertReplayEnemies(next.path("replay"), 3, 5);
                assertEquals(2, attempts(player));
                assertEquals(balance, wallet(player));
            }
        } finally {
            clock.reset();
        }
    }

    /** 从玩家协议实打另外两类守军，确认先手、名册、胜利转位和加成更新。 */
    @Test
    void challengesLordAndKnightAgainstTheirOriginalGuards() throws Exception {
        clock.setEpochSeconds(INITIAL_TIME + 2 * 86_400);
        try {
            var player = player(OTHER_SERVER, 35, true);
            try (var peer = new Peer()) {
                peer.authenticate(player);
                saveMain(peer, player);
                score(player, 3_010);
                long version = saveRainbow(peer, player);
                long basePower = currentPower(player);
                var lord = exported(peer, "rainbow.challenge", challenge(1, 1, version), "lord");
                assertWin(lord, player, 1, 1);
                assertReplayEnemies(lord.path("replay"), 1, 1);
                long lordPower = currentPower(player);
                assertTrue(lordPower > basePower);

                var knight = exported(peer, "rainbow.challenge", challenge(2, 5, version), "knight");
                assertWin(knight, player, 2, 5);
                assertReplayEnemies(knight.path("replay"), 2, 5);
                var previous = seat(knight.path("state"), 1);
                assertFalse(previous.has("owner"));
                assertEquals(1, previous.path("evolution").asInt());
                assertTrue(currentPower(player) > basePower && currentPower(player) < lordPower);
                assertEquals(2, attempts(player));
            }
        } finally {
            clock.reset();
        }
    }

    /** 建立独立测试角色；强队沿用已复验的正常养成，弱队单名初始英雄进场。 */
    private Player player(String serverId, int level, boolean strong) {
        var account = login.login("rb_" + id().substring(0, 8), serverId);
        String role = account.role().id();
        jdbc.update("UPDATE game_role SET role_level=?,cup=0 WHERE id=?", level, role);
        String lead = id();
        int star = strong ? 14 : 5;
        int heroLevel = strong ? growth.limit(400, 6, star) : 1;
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,?,?,?)",
                lead, role, heroLevel, star, strong ? 6 : 0);
        var slots = strong ? MainChapterProgressionPreview.prepareLateChapterLineup(jdbc, role, lead, heroLevel, star, heroLevel)
                : List.of(new Lineup.Slot(2, lead));
        return new Player(role, account.session().accessToken(), slots);
    }

    /** 补十个有效排名事实，使种子测试角色处于第 11、12 名，前十位不可挑战。 */
    private void addHigherRanks() {
        for (int index = 0; index < 10; index++) {
            var role = login.login("rb_rank_" + id().substring(0, 8), HOME_SERVER).role().id();
            jdbc.update("UPDATE game_role SET role_level=35,cup=?,current_main_power=5000 WHERE id=?", 1100 - index, role);
        }
    }

    /** 只准备本人的既有竞技场积分，排名位置按生产查询计算。 */
    private void score(Player player, int cup) {
        jdbc.update("UPDATE game_role SET cup=? WHERE id=?", cup, player.roleId());
    }

    /** 主线存两名和圣殿阵容不同的出战者，便于检查独立保存和战力变更。 */
    private void saveMain(Peer peer, Player player) throws Exception {
        var selected = player.slots().stream().filter(slot -> slot.position() == 2 || slot.position() == 3).toList();
        var version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, player.roleId());
        peer.body("formation.save", formation(version, selected));
    }

    /** 验证圣殿阵容保存的相同业务请求回执与主阵容独立，回传已提交版本。 */
    private long saveRainbow(Peer peer, Player player) throws Exception {
        var command = formation(0, player.slots());
        var saved = peer.body("rainbow.lineup.save", command);
        assertEquals(saved, peer.body("rainbow.lineup.save", command));
        assertEquals(player.slots().size(), saved.path("formation").path("slots").size());
        long version = saved.path("formation").path("version").asLong();
        assertEquals(1, version);
        return version;
    }

    /** 使用通用独立阵容命令结构编码原站位和实例标识。 */
    private static Map<String, Object> formation(long version, List<Lineup.Slot> slots) {
        return Map.of("requestId", id(), "expectedVersion", version, "formationId", 1,
                "slots", slots.stream().map(slot -> Map.of("position", slot.position(), "heroId", slot.heroId())).toList());
    }

    /** 为一次真实挑战分配持久请求号；本次原请求在重连后可复用。 */
    private static Map<String, Object> challenge(int seat, int evolution, long version) {
        return Map.of("requestId", id(), "seatId", seat, "evolution", evolution, "expectedLineupVersion", version);
    }

    /** 取服务端完整地图快照中的稳定席位。 */
    private static JsonNode seat(JsonNode state, int id) {
        return state.path("seats").valueStream().filter(entry -> entry.path("id").asInt() == id).findFirst().orElseThrow();
    }

    /** 确认真实胜场的占领者和目标进化档，挑战回包自身无直接资产奖品。 */
    private static void assertWin(JsonNode result, Player player, int seatId, int evolution) {
        assertTrue(result.path("won").asBoolean(), () -> result.path("replay").path("outcome").asString());
        assertFalse(result.has("notice"));
        var seat = seat(result.path("state"), seatId);
        assertEquals(player.roleId(), seat.path("owner").path("roleId").asString());
        assertEquals(evolution, seat.path("evolution").asInt());
    }

    /** 原战报六个守军的模板、站位、等级和星级完全对应源表的目标进化档。 */
    private void assertReplayEnemies(JsonNode replay, int type, int evolution) {
        var original = rules.mission(type, evolution).enemies().stream().map(enemy ->
                List.of(enemy.template(), enemy.position(), enemy.level(), enemy.star())).sorted(RainbowSocketTest::comparePosition).toList();
        var replayed = replay.path("units").valueStream().filter(unit -> unit.path("faction").asInt() == 2).map(unit ->
                List.of(unit.path("templateId").asInt(), unit.path("position").asInt(),
                        unit.path("level").asInt(), unit.path("star").asInt())).sorted(RainbowSocketTest::comparePosition).toList();
        assertEquals(original, replayed);
        assertTrue(replay.path("rounds").asInt() <= rules.battleRounds());
    }

    /** 对两份战报比较守军位置，避免配置序号与回放遍历顺序影响校验。 */
    private static int comparePosition(List<Integer> first, List<Integer> second) {
        return Integer.compare(first.get(1), second.get(1));
    }

    /** 查询一次真实战力持久值，占位增减应立即重算。 */
    private long currentPower(Player player) {
        return jdbc.queryForObject("SELECT current_main_power FROM game_role WHERE id=?", Long.class, player.roleId());
    }

    /** 检验资产余额及背包数量在无奖励玩法中的实际变化。 */
    private List<Long> wallet(Player player) {
        return jdbc.queryForObject("""
                SELECT gold,diamonds,(SELECT COALESCE(SUM(quantity),0) FROM game_inventory WHERE role_id=?) AS inventory
                  FROM game_role WHERE id=?
                """, (row, index) -> List.of(row.getLong(1), row.getLong(2), row.getLong(3)), player.roleId(), player.roleId());
    }

    /** 同一业务请求必须只写一次战斗结果。 */
    private int attempts(Player player) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_rainbow_attempt WHERE role_id=?", Integer.class, player.roleId());
    }

    /** 通过生产投递事务处理待发的单封通知，重复执行同任务也不重复发信。 */
    private void deliver(Player player, boolean expired) {
        var notices = jdbc.queryForList("SELECT id FROM game_rainbow_notice WHERE role_id=? AND expired=?",
                String.class, player.roleId(), expired);
        assertEquals(1, notices.size());
        rainbow.deliverNotice(notices.getFirst());
        rainbow.deliverNotice(notices.getFirst());
    }

    /** 玩家从真实邮箱读取一封原文通知，校验该通知不带附件或发奖。 */
    private static void assertMail(Peer peer, String content) throws Exception {
        var entries = peer.body("mail.list", Map.of()).path("entries").valueStream()
                .filter(entry -> "彩虹圣殿".equals(entry.path("title").asString())).toList();
        assertEquals(1, entries.size());
        assertFalse(entries.getFirst().path("hasAttachments").asBoolean());
        var opened = peer.body("mail.change", Map.of("action", "OPEN", "requestId", id(),
                "mailId", entries.getFirst().path("id").asString()));
        assertTrue(opened.path("detail").path("content").asString().contains("彩虹护卫圣位" + content));
        assertTrue(opened.path("detail").path("attachments").isEmpty());
        assertFalse(opened.has("notice"));
    }

    /** 保留真实 WebSocket 回包给客户端互通验收，输出只进入忽略的后端测试目录。 */
    private static JsonNode exported(Peer peer, String protocol, Map<String, ?> command, String name) throws Exception {
        var reply = peer.request(protocol, command);
        assertTrue(reply.path("ok").asBoolean(), () -> protocol + " " + reply.path("error"));
        Files.write(Path.of("target/rainbow-" + name + ".pb"), GameProtocolCodec.encode(reply));
        return reply.path("body");
    }

    /** 返回协议支持的标准随机编号，测试角色及各请求彼此隔离。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
