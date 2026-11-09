/**
 * 本机登录、角色、英雄与背包 Protobuf 二进制长连接：匿名选服、登录统一初始化、同角色连接替换和提交后资产同步。
 * 请求按连接及角色串行处理，业务尚未同步时拒绝访问；开放主线阵容保存和受开关保护的开发GM发放，英雄升级等玩法写操作仍暂停。
 */
package com.funsgamex.mxzg.network;

import com.funsgamex.mxzg.auth.SessionService;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.ReentrantLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.*;
import tools.jackson.databind.*;

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type = org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
@Profile("local & !production")
@ConditionalOnProperty(name = "mxzg.websocket.enabled", havingValue = "true")
public class GameSocketHandler extends BinaryWebSocketHandler implements SubProtocolCapable {
    private static final String UUID_PATTERN = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
    private static final int FRAME_LIMIT = GameProtocolCodec.FRAME_LIMIT;
    /** 本地身份提供方，生产环境不装配此处理器。 */
    private final com.funsgamex.mxzg.auth.DevelopmentLoginService login;
    /** 未登录选服也走二进制长连接。 */
    private final com.funsgamex.mxzg.server.ServerCatalog servers;
    /** 当前鉴权角色的本机 GM 服务。 */
    private final com.funsgamex.mxzg.gm.GmService gm;
    /** 主线阵容保存事务，不恢复其他暂停玩法。 */
    private final com.funsgamex.mxzg.lineup.MainFormationCommandService formations;
    /** 开发只读试战，鉴权及真实阵容读取均在服务端完成。 */
    private final com.funsgamex.mxzg.hero.HeroLineupBattleService battles;
    /** 真实主线持久挑战与幂等结算，角色仅取自鉴权连接。 */
    private final com.funsgamex.mxzg.campaign.MainChapterService chapters;
    /** 挂机普攻演出，不进入主线结算服务。 */
    private final com.funsgamex.mxzg.campaign.MainChapterIdleBattleService idleBattles;
    private final SessionService sessions;
    private final SessionSnapshotService snapshots;
    private final ConcurrentMap<String, Connection> connections = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Connection> online = new ConcurrentHashMap<>();
    private final Semaphore capacity = new Semaphore(128);
    private final ReentrantLock[] roleLocks = new ReentrantLock[64];

    private static final class Connection {
        final WebSocketSession socket;
        final ReentrantLock lock = new ReentrantLock();
        final long opened = System.nanoTime();
        volatile long lastActivity = opened;
        long rateWindow = opened;
        int rateCount;
        volatile String role;
        String token;
        boolean ready;

        /** 包装发送通道，限制并发发送缓冲；连接标识使用底层会话随机标识。 */
        Connection(WebSocketSession socket) {
            this.socket = new ConcurrentWebSocketSessionDecorator(socket, 5000, 262144);
        }
    }

    /** 注入共享鉴权和快照服务，创建固定数量角色锁，避免锁表无限增长。 */
    public GameSocketHandler(SessionService sessions, SessionSnapshotService snapshots, com.funsgamex.mxzg.auth.DevelopmentLoginService login, com.funsgamex.mxzg.server.ServerCatalog servers, com.funsgamex.mxzg.gm.GmService gm, com.funsgamex.mxzg.lineup.MainFormationCommandService formations, com.funsgamex.mxzg.hero.HeroLineupBattleService battles, com.funsgamex.mxzg.campaign.MainChapterService chapters, com.funsgamex.mxzg.campaign.MainChapterIdleBattleService idleBattles) {
        this.idleBattles = idleBattles;
        this.chapters = chapters;
        this.battles = battles;
        this.formations = formations;
        this.gm=gm;
        this.sessions = sessions; this.snapshots = snapshots; this.login=login; this.servers=servers;
        Arrays.setAll(roleLocks, index -> new ReentrantLock());
    }

    /** 声明唯一二进制子协议；不协商旧 JSON 或自动回退。 */
    @Override public List<String> getSubProtocols() { return List.of(GameProtocolCodec.SUBPROTOCOL); }

    /** 限制总连接与入站消息大小；URL 不接受任何查询参数，防止凭证进入访问日志。 */
    @Override public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        if (!GameProtocolCodec.SUBPROTOCOL.equals(session.getAcceptedProtocol()) || session.getUri() == null || session.getUri().getRawQuery() != null || !capacity.tryAcquire()) {
            session.close(CloseStatus.POLICY_VIOLATION); return;
        }
        session.setTextMessageSizeLimit(FRAME_LIMIT);
        session.setBinaryMessageSizeLimit(FRAME_LIMIT);
        connections.put(session.getId(), new Connection(session));
    }

    /** 解析受限信封并按角色串行调度；锁等待最多两秒，超时拒绝，不堆积无界任务。 */
    @Override protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        Connection connection = connections.get(session.getId());
        if (connection == null) return;
        if (!awaitLock(connection.lock)) { close(connection, CloseStatus.POLICY_VIOLATION); return; }
        JsonNode request = null;
        try {
            long now = System.nanoTime();
            if (message.getPayloadLength() > FRAME_LIMIT
                || timedOut(connection, now)) {
                close(connection, CloseStatus.POLICY_VIOLATION); return;
            }
            if (now - connection.rateWindow >= TimeUnit.SECONDS.toNanos(1)) {
                connection.rateWindow = now; connection.rateCount = 0;
            }
            if (++connection.rateCount > 32) { close(connection, CloseStatus.POLICY_VIOLATION); return; }
            byte[] bytes = new byte[message.getPayloadLength()]; message.getPayload().get(bytes);
            request = GameProtocolCodec.decode(bytes);
            validateEnvelope(request);
            String name = request.path("name").asString();
            if (connection.role == null) {
                switch(name) {
                    case "servers.list" -> { fields(request.path("body"),Set.of()); respond(connection,request,Map.of("items",servers.list())); }
                    case "session.login", "session.authenticate" -> authenticate(connection,request);
                    default -> throw rejected("UNAUTHENTICATED");
                }
            } else {
                ReentrantLock roleLock = roleLock(connection.role);
                if (!awaitLock(roleLock)) throw rejected("BUSY");
                try { dispatch(connection, request, name); }
                finally { roleLock.unlock(); }
            }
            connection.lastActivity = now;
        } catch (ResponseStatusException error) {
            String code = error.getStatusCode().value() == 401 ? "UNAUTHENTICATED" : error.getReason();
            fail(connection, request, code == null ? "REQUEST_REJECTED" : code);
            if (connection.role == null || "UNAUTHENTICATED".equals(code) || "SESSION_REPLACED".equals(code)) {
                close(connection, CloseStatus.POLICY_VIOLATION);
            }
        } catch (IllegalArgumentException | com.google.protobuf.InvalidProtocolBufferException error) {
            fail(connection, request, "INVALID_MESSAGE"); close(connection, CloseStatus.BAD_DATA);
        } catch (Exception error) {
            // 不记录原始帧或异常消息，防止鉴权令牌进入日志；未知结果由客户端恢复同步。
            fail(connection, request, "INTERNAL_ERROR"); close(connection, CloseStatus.SERVER_ERROR);
        } finally { connection.lock.unlock(); }
    }

    /** 首帧验证令牌和客户端标识；持久撤销其他令牌后原子替换本进程在线连接。 */
    private void authenticate(Connection connection, JsonNode request) throws IOException {
        JsonNode body = request.path("body");
        com.funsgamex.mxzg.auth.SessionService.IssuedSession issued=null;
        String accessToken;
        if(request.path("name").asString().equals("session.login")) {
            fields(body,Set.of("account","serverId","clientInstanceId"));
            text(body,"clientInstanceId",UUID_PATTERN);
            var result=login.login(text(body,"account","[a-z0-9_-]{3,32}"),text(body,"serverId","[a-z0-9_-]{1,32}"));
            issued=result.session(); accessToken=issued.accessToken();
        } else {
            fields(body, Set.of("accessToken", "clientInstanceId"));
            accessToken = text(body, "accessToken", "[A-Za-z0-9_-]{43}");
        }
        text(body, "clientInstanceId", UUID_PATTERN);
        String token = "Bearer " + accessToken;
        String role = sessions.requireRole(token);
        ReentrantLock roleLock = roleLock(role);
        if (!awaitLock(roleLock)) throw rejected("BUSY");
        try {
            snapshots.claim(token);
            connection.token = token; connection.role = role;
            Connection previous = online.put(role, connection);
            if (connections.get(connection.socket.getId()) != connection || !connection.socket.isOpen()) {
                online.remove(role, connection);
                // 关闭可能发生在数据库接管期间；仍须清理已经撤销凭证的旧连接。
                if (previous != null) close(previous, CloseStatus.POLICY_VIOLATION);
                return;
            }
            if (previous != null && previous != connection) {
                try { send(previous, Map.of("version", 1, "kind", "event", "name", "session.kicked",
                    "connectionId", previous.socket.getId(), "body", Map.of("code", "SESSION_REPLACED"))); }
                catch (IOException | RuntimeException ignored) { /* 旧通道可能已断开，不阻止新连接完成接管。 */ }
                finally { close(previous, CloseStatus.POLICY_VIOLATION); }
            }
            var accepted=new LinkedHashMap<String,Object>();
            accepted.put("connectionId",connection.socket.getId()); accepted.put("roleId",role); accepted.put("serverTimeMs",System.currentTimeMillis());
            accepted.put("initial",snapshots.snapshot(token));
            if(issued!=null) accepted.put("session",issued);
            respond(connection,request,accepted); connection.ready=true;
        } finally { roleLock.unlock(); }
    }

    /** 每次保活重新检查令牌与连接归属；未重做玩法和已退役查询返回 UNKNOWN_MESSAGE。 */
    private void dispatch(Connection connection, JsonNode request, String name) throws IOException {
        if (online.get(connection.role) != connection) throw rejected("SESSION_REPLACED");
        if (!connection.role.equals(sessions.requireRole(connection.token))) throw rejected("UNAUTHENTICATED");
        if (!connection.socket.getId().equals(request.path("connectionId").asString(""))) throw rejected("SESSION_REPLACED");
        if (name.equals("chapter.challenge") || name.equals("chapter.claim") || name.equals("chapter.replay")) {
            chapter(connection, request, name);
            return;
        }
        if (name.equals("chapter.idle.encounter")) {
            fields(request.path("body"), Set.of());
            try {
                var result = idleBattles.encounter(connection.token);
                respond(connection, request, Map.of("stage", result.stage(), "assetRevision", result.assetRevision(),
                    "lineupVersion", result.lineupVersion(), "replay", GameProtocolCodec.tree(com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils.encode(result.replay()))));
            } catch (IllegalArgumentException error) {
                throw rejected("CHAPTER_UNAVAILABLE");
            }
            return;
        }
        if (name.equals("battle.preview")) {
            if (!gm.enabled()) throw rejected("GM_DISABLED");
            var body = request.path("body");
            fields(body, Set.of("mission"));
            if (!body.path("mission").canConvertToInt() || body.path("mission").asInt() < 1
                || body.path("mission").asInt() > 3) throw rejected("BATTLE_INVALID");
            int mission = body.path("mission").asInt();
            com.funsgamex.mxzg.hero.HeroLineupBattleService.Preview result;
            try {
                result = battles.preview(connection.token, mission,
                    rate -> ThreadLocalRandom.current().nextDouble() < rate);
            } catch (IllegalArgumentException error) {
                throw rejected(error.getMessage().contains("非空") ? "BATTLE_EMPTY" : "BATTLE_UNSUPPORTED");
            }
            var pending = new ArrayList<>(result.pending());
            pending.add("random_probability_pending_review");
            respond(connection, request, Map.of("mission", mission, "assetRevision", result.assetRevision(),
                "lineupVersion", result.lineupVersion(), "formationId", result.formationId(), "pending", pending,
                "replay", GameProtocolCodec.tree(com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils.encode(result.battle()))));
            return;
        }
        if(name.equals("gm.grant")) {
            var body=request.path("body");fields(body,Set.of("requestId","kind","configId","quantity"));
            if(!body.path("configId").canConvertToInt()||!body.path("quantity").canConvertToInt())throw rejected("GM_INVALID");
            respond(connection,request,gm.grant(connection.token,text(body,"requestId",UUID_PATTERN),text(body,"kind","hero|item"),body.path("configId").asInt(),body.path("quantity").asInt()));return;
        }
        if (name.equals("formation.save")) {
            var body = request.path("body");
            fields(body, Set.of("requestId", "expectedVersion", "formationId", "slots"));
            if (!body.path("expectedVersion").canConvertToLong() || !body.path("formationId").canConvertToInt() ||
                    !body.path("slots").isArray() || body.path("slots").size() > 9) throw rejected("FORMATION_INVALID");
            var slots = new ArrayList<com.funsgamex.mxzg.lineup.Lineup.Slot>();
            for (var slot : body.path("slots")) {
                fields(slot, Set.of("position", "heroId"));
                if (!slot.path("position").canConvertToInt()) throw rejected("FORMATION_INVALID");
                slots.add(new com.funsgamex.mxzg.lineup.Lineup.Slot(slot.path("position").asInt(), text(slot, "heroId", ".{1,96}")));
            }
            respond(connection, request, formations.save(connection.token,
                new com.funsgamex.mxzg.lineup.MainFormationCommandService.Save(text(body, "requestId", UUID_PATTERN),
                    body.path("expectedVersion").asLong(), body.path("formationId").asInt(), slots)));
            return;
        }
        fields(request.path("body"), Set.of());
        switch (name) {

            case "gm.status" -> respond(connection,request,Map.of("enabled",gm.enabled()));
            case "session.heartbeat" -> respond(connection, request, Map.of("serverTimeMs", System.currentTimeMillis()));

            default -> throw rejected("UNKNOWN_MESSAGE");
        }
    }

    /** 主线命令只接收幂等键或战报ID；业务拒绝保留连接，损坏数据仍由统一异常边界拒绝。 */
    private void chapter(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        boolean challenge = name.equals("chapter.challenge");
        String key = challenge ? "requestId" : "battleId";
        fields(body, Set.of(key));
        String id = text(body, key, UUID_PATTERN);
        try {
            if (name.equals("chapter.replay")) {
                var result = chapters.replay(connection.token, id);
                respond(connection, request, Map.of("battleId", result.id(), "mission", result.details().mission(),
                    "pending", result.details().pending(), "replay", GameProtocolCodec.tree(result.replay())));
            } else {
                var receipt = challenge ? chapters.challenge(connection.token, id) : chapters.claim(connection.token, id);
                respond(connection, request, Map.of("action", receipt.action().name(), "battleId", receipt.battleId(),
                    "state", receipt.state(), "rewards", receipt.rewards()));
            }
        } catch (IllegalArgumentException error) {
            throw rejected("CHAPTER_UNAVAILABLE");
        }
    }

    /** 资产提交成功后向所属在线角色发送完整状态；离线及已失效会话不发送。 */
    @org.springframework.context.event.EventListener
    public void assetsChanged(AssetSyncService.Changed event) {
        ReentrantLock lock=roleLock(event.roleId()); lock.lock();
        try {
            Connection connection=online.get(event.roleId());
            if(connection==null || !connection.ready) return;
            try {
                var state=snapshots.snapshot(connection.token);
                send(connection,Map.of("version",1,"kind","event","name","state.changed","connectionId",connection.socket.getId(),"body",state));
            } catch(Exception error) { close(connection,CloseStatus.SERVER_ERROR); }
        } finally { lock.unlock(); }
    }

    /** 验证解码后的统一信封及关联标识；具体业务字段和阶段继续单独校验。 */
    private static void validateEnvelope(JsonNode request) {
        fields(request, Set.of("version", "kind", "name", "id", "body", "connectionId"));
        if (!request.path("version").isIntegralNumber() || !request.path("version").asString().equals("1")) throw rejected("UNSUPPORTED_VERSION");
        if (!request.path("kind").isString() || !request.path("kind").asString().equals("request")) throw rejected("INVALID_MESSAGE");
        text(request, "id", UUID_PATTERN);
        text(request, "name", "[a-z]+(?:\\.[a-z]+){1,3}");
        if (!request.path("body").isObject()) throw rejected("INVALID_MESSAGE");
    }

    /** 只允许对象包含规定字段；具体必填字段由对应读取函数验证。 */
    private static void fields(JsonNode value, Set<String> allowed) {
        if (value == null || !value.isObject()) throw rejected("INVALID_MESSAGE");
        for (String name : value.propertyNames()) if (!allowed.contains(name)) throw rejected("INVALID_MESSAGE");
    }

    /** 严格读取有格式限制的字符串，不把数值或布尔值隐式转成凭证。 */
    private static String text(JsonNode value, String key, String pattern) {
        JsonNode field = value.path(key);
        if (!field.isString() || field.asString().length() > 128 || !field.asString().matches(pattern)) throw rejected("INVALID_MESSAGE");
        return field.asString();
    }

    /** 返回稳定协议拒绝原因，HTTP 状态只用于适配现有异常类型。 */
    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, code);
    }

    /** 最多等待两秒，让首包发送后的收尾与接管串行完成；超时仍明确拒绝，不无限排队。 */
    private static boolean awaitLock(ReentrantLock lock) {
        try { return lock.tryLock(2, TimeUnit.SECONDS); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); return false; }
    }

    /** 固定散列锁允许角色间并行；碰撞有界等待，超时返回 BUSY，不影响数据归属。 */
    private ReentrantLock roleLock(String role) { return roleLocks[Math.floorMod(role.hashCode(), roleLocks.length)]; }

    /** 返回带原请求标识的成功信封，业务结果仅在事务服务返回后发送。 */
    private void respond(Connection connection, JsonNode request, Object body) throws IOException {
        send(connection, Map.of("version", 1, "kind", "response", "name", request.path("name").asString(),
            "id", request.path("id").asString(), "connectionId", connection.socket.getId(), "ok", true, "body", body));
    }

    /** 有效请求才回关联错误，无法安全关联的畸形数据直接关闭，不回显原始内容。 */
    private void fail(Connection connection, JsonNode request, String code) {
        if (request == null || !request.path("id").isString() || !request.path("id").asString().matches(UUID_PATTERN)
            || !request.path("name").isString() || request.path("name").asString().length() > 64) return;
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("version", 1); response.put("kind", "response"); response.put("name", request.path("name").asString());
        response.put("id", request.path("id").asString()); response.put("connectionId", connection.socket.getId());
        response.put("ok", false); response.put("body", null);
        response.put("error", Map.of("code", code, "message", code, "retryable", code.equals("BUSY")));
        try { send(connection, response); } catch (Exception ignored) { close(connection, CloseStatus.SERVER_ERROR); }
    }

    /** 限制输出帧，发送失败不重做业务，由恢复同步确认状态。 */
    private void send(Connection connection, Object value) throws IOException {
        byte[] payload = GameProtocolCodec.encode(value);
        connection.socket.sendMessage(new BinaryMessage(payload));
    }

    /** 鉴权前五秒，鉴权后六十秒没有有效请求即超时；使用单调时钟避免系统时间调整。 */
    private boolean timedOut(Connection connection, long now) {
        return now - (connection.role == null ? connection.opened : connection.lastActivity)
            > TimeUnit.SECONDS.toNanos(connection.role == null ? 5 : 60);
    }

    /** 定时回收未鉴权及无响应连接；不等待正在处理的连接锁。 */
    @Scheduled(fixedDelay = 1000)
    public void expireConnections() {
        for (Connection connection : connections.values()) {
            if (timedOut(connection, System.nanoTime()) && connection.lock.tryLock()) {
                try { if (timedOut(connection, System.nanoTime())) close(connection, CloseStatus.POLICY_VIOLATION); }
                finally { connection.lock.unlock(); }
            }
        }
    }

    /** 传输错误仅结束该连接，不撤销可用于正常重连的令牌。 */
    @Override public void handleTransportError(WebSocketSession session, Throwable exception) {
        Connection connection = connections.get(session.getId());
        if (connection != null) close(connection, CloseStatus.SERVER_ERROR);
    }

    /** 释放容量与自身在线映射；旧连接关闭回调不能移除已经接管的新连接。 */
    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Connection connection = connections.remove(session.getId());
        if (connection != null) {
            capacity.release();
            if (connection.role != null) online.remove(connection.role, connection);
        }
    }

    /** 主动关闭与异步关闭回调共用幂等清理，确保容量只释放一次。 */
    private void close(Connection connection, CloseStatus status) {
        afterConnectionClosed(connection.socket, status);
        try { connection.socket.close(status); } catch (IOException ignored) { /* 状态已清理，无需复用失效通道。 */ }
    }
}
