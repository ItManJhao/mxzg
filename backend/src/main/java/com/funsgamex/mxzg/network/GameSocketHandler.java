/**
 * 本机登录/背包长连接试点：鉴权、同角色连接替换、三模块恢复快照和背包刷新。
 * 请求按连接及角色串行处理，业务尚未同步时拒绝访问；不提供英雄升级或其他写操作。
 */
package com.funsgamex.mxzg.network;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.protocol.SessionContract;
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
public class GameSocketHandler extends TextWebSocketHandler {
    private static final String UUID_PATTERN = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
    private static final int FRAME_LIMIT = 65536;
    private final ObjectMapper json;
    private final ObjectMapper incoming = tools.jackson.databind.json.JsonMapper.builder(
        tools.jackson.core.json.JsonFactory.builder().streamReadConstraints(
            tools.jackson.core.StreamReadConstraints.builder().maxNestingDepth(8).maxStringLength(1024).maxNumberLength(16).build()).build())
        .enable(tools.jackson.core.StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
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
    public GameSocketHandler(ObjectMapper json, SessionService sessions, SessionSnapshotService snapshots) {
        this.json = json; this.sessions = sessions; this.snapshots = snapshots;
        Arrays.setAll(roleLocks, index -> new ReentrantLock());
    }

    /** 限制总连接与入站消息大小；URL 不接受任何查询参数，防止凭证进入访问日志。 */
    @Override public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        if (session.getUri() == null || session.getUri().getRawQuery() != null || !capacity.tryAcquire()) {
            session.close(CloseStatus.POLICY_VIOLATION); return;
        }
        session.setTextMessageSizeLimit(FRAME_LIMIT);
        session.setBinaryMessageSizeLimit(FRAME_LIMIT);
        connections.put(session.getId(), new Connection(session));
    }

    /** 解析受限信封并按角色串行调度；无排队空间时明确关闭连接，绝不堆积无界任务。 */
    @Override protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        Connection connection = connections.get(session.getId());
        if (connection == null) return;
        if (!connection.lock.tryLock()) { close(connection, CloseStatus.POLICY_VIOLATION); return; }
        JsonNode request = null;
        try {
            long now = System.nanoTime();
            if (message.getPayloadLength() > FRAME_LIMIT
                || message.getPayload().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > FRAME_LIMIT
                || timedOut(connection, now)) {
                close(connection, CloseStatus.POLICY_VIOLATION); return;
            }
            if (now - connection.rateWindow >= TimeUnit.SECONDS.toNanos(1)) {
                connection.rateWindow = now; connection.rateCount = 0;
            }
            if (++connection.rateCount > 32) { close(connection, CloseStatus.POLICY_VIOLATION); return; }
            request = incoming.readTree(message.getPayload());
            validateEnvelope(request);
            String name = request.path("name").asString();
            if (connection.role == null) {
                if (!name.equals("session.authenticate")) throw rejected("UNAUTHENTICATED");
                authenticate(connection, request);
            } else {
                ReentrantLock roleLock = roleLock(connection.role);
                if (!roleLock.tryLock()) throw rejected("BUSY");
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
        } catch (IllegalArgumentException | tools.jackson.core.JacksonException error) {
            fail(connection, request, "INVALID_MESSAGE"); close(connection, CloseStatus.BAD_DATA);
        } catch (Exception error) {
            // 不记录原始帧或异常消息，防止鉴权令牌进入日志；未知结果由客户端恢复同步。
            fail(connection, request, "INTERNAL_ERROR"); close(connection, CloseStatus.SERVER_ERROR);
        } finally { connection.lock.unlock(); }
    }

    /** 首帧验证令牌和客户端标识；持久撤销其他令牌后原子替换本进程在线连接。 */
    private void authenticate(Connection connection, JsonNode request) throws IOException {
        JsonNode body = request.path("body");
        fields(body, Set.of("accessToken", "clientInstanceId"));
        String accessToken = text(body, "accessToken", "[A-Za-z0-9_-]{43}");
        text(body, "clientInstanceId", UUID_PATTERN);
        String token = "Bearer " + accessToken;
        String role = sessions.requireRole(token);
        ReentrantLock roleLock = roleLock(role);
        if (!roleLock.tryLock()) throw rejected("BUSY");
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
            respond(connection, request, new SessionContract.SessionAccepted(connection.socket.getId(), role, System.currentTimeMillis()));
        } finally { roleLock.unlock(); }
    }

    /** 每次请求重新检查令牌与连接归属；背包刷新仍读取锁内快照，禁止绕过恢复阶段。 */
    private void dispatch(Connection connection, JsonNode request, String name) throws IOException {
        if (online.get(connection.role) != connection) throw rejected("SESSION_REPLACED");
        if (!connection.role.equals(sessions.requireRole(connection.token))) throw rejected("UNAUTHENTICATED");
        if (!connection.socket.getId().equals(request.path("connectionId").asString(""))) throw rejected("SESSION_REPLACED");
        fields(request.path("body"), Set.of());
        switch (name) {
            case "session.sync" -> {
                var snapshot = snapshots.snapshot(connection.token);
                respond(connection, request, snapshot);
                connection.ready = true;
            }
            case "session.heartbeat" -> respond(connection, request, new SessionContract.SessionHeartbeat(System.currentTimeMillis()));
            case "inventory.list" -> {
                if (!connection.ready) throw rejected("NOT_READY");
                respond(connection, request, snapshots.snapshot(connection.token).inventory());
            }
            default -> throw rejected("UNKNOWN_MESSAGE");
        }
    }

    /** 验证统一信封，不允许类型强转、未知字段或缺少关联标识。 */
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

    /** 固定散列锁允许角色间并行；散列碰撞只会短暂返回 BUSY，不影响数据归属。 */
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
        String payload = json.writeValueAsString(value);
        if (payload.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > FRAME_LIMIT) throw new IOException("Snapshot exceeds pilot limit");
        connection.socket.sendMessage(new TextMessage(payload));
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
