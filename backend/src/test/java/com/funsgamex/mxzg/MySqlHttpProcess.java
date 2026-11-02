/**
 * MySQL 集成测试的独立 JVM 启动器，仅在测试 classpath 中存在。
 * 凭据经标准输入传递，不落文件或命令行；只管理本对象启动的进程，绑定随机回环 HTTP 端口。
 */
package com.funsgamex.mxzg;

import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

final class MySqlHttpProcess implements AutoCloseable {
    private static String identityRun;
    private final Properties input = new Properties();
    private final Path root;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final ObjectMapper json = new ObjectMapper();
    private Process process;
    private int generation, port;

    /** 输出仅包含本批运行标识和监听端口，供显式 Creator 测试连接使用。 */
    void writePreviewManifest() throws Exception {
        Files.writeString(root.resolve("preview.properties"),"run="+input.getProperty("run")+"\nport="+port+"\npid="+process.pid()+"\n");
        System.out.println("[MYSQL-IT] Creator preview http://127.0.0.1:"+port+" run="+input.getProperty("run")+" manifest="+root.resolve("preview.properties"));
    }

    /** 仅测试 classpath/profile 暴露归属凭证，不包含玩家数据、密码、令牌或管理能力。 */
    @org.springframework.web.bind.annotation.RestController
    @org.springframework.context.annotation.Profile("mysql-it")
    static class IdentityController {
        /** 客户端必须匹配显式运行标识才允许启用测试会话存储和登录。 */
        @org.springframework.web.bind.annotation.GetMapping("/api/v1/test-identity")
        public Map<String,String> identity() { return Map.of("kind","mxzg-owned-mysql-it","run",identityRun==null?"":identityRun); }
    }

    /** 接收本批实例已验证的身份；不接受默认业务配置或共享实例凭据。 */
    MySqlHttpProcess(String url, String user, String password, String database, String uuid, int mysqlPort, String run, Path root) {
        this.root = root;
        input.setProperty("url", url); input.setProperty("user", user); input.setProperty("password", password);
        input.setProperty("database", database); input.setProperty("uuid", uuid);
        input.setProperty("mysqlPort", Integer.toString(mysqlPort)); input.setProperty("run", run);
    }

    /** 新建 JVM 并通过本批唯一就绪文件核对 PID、运行标识和随机监听端口，成功前不发 HTTP 请求。 */
    void start() throws Exception {
        assertTrue(process == null || !process.isAlive());
        Path ready = root.resolve("http-ready-" + (++generation) + ".properties");
        assertFalse(Files.exists(ready)); input.setProperty("ready", ready.toString());
        String java = Path.of(System.getProperty("java.home"), "bin/java.exe").toString();
        String classpath = System.getProperty("surefire.test.class.path", System.getProperty("java.class.path"));
        var builder = new ProcessBuilder(java, "-Duser.timezone=UTC", "-cp", classpath, MySqlHttpProcess.class.getName());
        // 不让继承的 JVM 注入参数或终端配置影响测试子进程；Windows 运行库仍需系统目录。
        var env = builder.environment();
        var retained = new HashMap<String, String>();
        for (String key : List.of("SystemRoot", "WINDIR", "TEMP", "TMP")) if (env.get(key) != null) retained.put(key, env.get(key));
        env.clear(); env.putAll(retained);
        process = builder.redirectErrorStream(true).redirectOutput(root.resolve("http-jvm-" + generation + ".log").toFile()).start();
        record("starting");
        try (var pipe = process.getOutputStream()) { input.store(pipe, null); }
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(60);
        while (process.isAlive() && System.nanoTime() < deadline) {
            if (Files.exists(ready)) {
                var identity = new Properties();
                try (var file = Files.newInputStream(ready)) { identity.load(file); }
                assertEquals(input.getProperty("run"), identity.getProperty("run"));
                assertEquals(Long.toString(process.pid()), identity.getProperty("pid"));
                port = Integer.parseInt(identity.getProperty("port"));
                assertTrue(port > 0 && port != 18080 && port != 3306);
                record("running");
                System.out.println("[MYSQL-IT] HTTP JVM started pid=" + process.pid() + " port=" + port + " generation=" + generation);
                return;
            }
            Thread.sleep(100);
        }
        throw new IllegalStateException("独立 HTTP JVM 未就绪，查看本批 http-jvm 日志");
    }

    /** 对已核对且仍存活的本批 JVM 发真实 HTTP 请求；断言不回显可能包含令牌的正文。 */
    JsonNode request(String method, String path, String token, Object body, int expected) throws Exception {
        assertTrue(process != null && process.isAlive(), "拒绝请求已停止或未知后端");
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1" + path)).timeout(Duration.ofSeconds(25));
        if (token != null) request.header("Authorization", "Bearer " + token);
        request.header("Content-Type", "application/json").method(method,
            body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        var response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(expected, response.statusCode(), method + " " + path);
        return json.readTree(response.body());
    }

    /** 库存只通过真实 WS 鉴权/同步/读取；失效令牌检查协议错误，不模拟 HTTP 返回。 */
    JsonNode inventory(String token, int expected) throws Exception {
        assertTrue(process != null && process.isAlive(), "拒绝请求未知后端");
        var messages = new java.util.concurrent.LinkedBlockingQueue<JsonNode>();
        var socket = client.newWebSocketBuilder().connectTimeout(Duration.ofSeconds(5))
            .buildAsync(URI.create("ws://127.0.0.1:" + port + "/api/v1/game/socket"), new java.net.http.WebSocket.Listener() {
                final StringBuilder buffer = new StringBuilder();
                @Override public void onOpen(java.net.http.WebSocket webSocket) { webSocket.request(1); }
                @Override public java.util.concurrent.CompletionStage<?> onText(java.net.http.WebSocket webSocket, CharSequence data, boolean last) {
                    buffer.append(data);
                    if (last) { messages.add(json.readTree(buffer.toString())); buffer.setLength(0); }
                    webSocket.request(1); return null;
                }
            }).get(5, TimeUnit.SECONDS);
        try {
            String connection = null;
            JsonNode result = null;
            for (String name : List.of("session.authenticate", "session.sync", "inventory.list")) {
                String id = UUID.randomUUID().toString();
                var frame = new LinkedHashMap<String, Object>();
                frame.put("version", 1); frame.put("kind", "request"); frame.put("name", name); frame.put("id", id);
                frame.put("body", name.equals("session.authenticate") ? Map.of("accessToken", token, "clientInstanceId", UUID.randomUUID().toString()) : Map.of());
                if (connection != null) frame.put("connectionId", connection);
                socket.sendText(json.writeValueAsString(frame), true).get(5, TimeUnit.SECONDS);
                var response = messages.poll(5, TimeUnit.SECONDS);
                assertNotNull(response, "库存 WS 未响应"); assertEquals(id, response.path("id").asString());
                if (expected == 401) {
                    assertFalse(response.path("ok").asBoolean());
                    assertEquals("UNAUTHENTICATED", response.path("error").path("code").asString()); return response;
                }
                assertEquals(200, expected); assertTrue(response.path("ok").asBoolean(), "库存 WS 请求失败");
                connection = response.path("connectionId").asString(); result = response.path("body");
            }
            return result;
        } finally { socket.abort(); }
    }

    /** 停止旧进程后重新执行 java，断言 PID 改变，不能以同 JVM 的上下文刷新替代。 */
    void restart() throws Exception {
        long previous = process.pid(); close(); start(); assertNotEquals(previous, process.pid());
    }

    /** 保存无凭据的逐代归属记录；不记录请求正文或授权头。 */
    private void record(String state) throws Exception {
        Files.writeString(root.resolve("http-process-" + generation + ".properties"), "run=" + input.getProperty("run")
            + "\npid=" + process.pid() + "\nport=" + port + "\nstate=" + state + "\n");
    }

    /** 仅终止持有句柄的测试 JVM；数据目录保留，绝不按端口或 Java 名称终止其他后端。 */
    @Override public void close() throws Exception {
        if (process != null) {
            process.destroy();
            if (!process.waitFor(15, TimeUnit.SECONDS)) { process.destroyForcibly(); process.waitFor(10, TimeUnit.SECONDS); }
            assertFalse(process.isAlive()); record("stopped");
        }
    }

    /** 独立 JVM 入口：先核对本批数据库身份/权限，再启动真实 GameApplication 并原子发布 HTTP 就绪信息。 */
    public static void main(String[] args) throws Exception {
        var input = new Properties(); input.load(System.in);
        String run = input.getProperty("run"), database = input.getProperty("database"), user = input.getProperty("user");
        assertNotNull(run); assertTrue(run.matches("[0-9a-f]{32}"));
        assertEquals("mxzg_it_" + run, database); assertEquals("mxzg_it_" + run.substring(0, 16), user);
        int port = Integer.parseInt(input.getProperty("mysqlPort")); assertTrue(port > 0 && port != 3306 && port != 18080);
        String url = input.getProperty("url");
        assertTrue(url.startsWith("jdbc:mysql://127.0.0.1:" + port + "/" + database + "?"));
        try (var connection = DriverManager.getConnection(url, user, input.getProperty("password")); var statement = connection.createStatement()) {
            try (var row = statement.executeQuery("SELECT VERSION(), DATABASE(), CURRENT_USER(), @@server_uuid, @@port")) {
                row.next(); assertTrue(row.getString(1).startsWith("8.4.")); assertEquals(database, row.getString(2));
                assertEquals(user + "@127.0.0.1", row.getString(3)); assertEquals(input.getProperty("uuid"), row.getString(4)); assertEquals(port, row.getInt(5));
            }
            try (var rows = statement.executeQuery("SHOW GRANTS")) {
                int schemaGrants = 0;
                while (rows.next()) {
                    String grant = rows.getString(1);
                    if (grant.startsWith("GRANT USAGE ON *.* TO ")) continue;
                    assertTrue(grant.startsWith("GRANT ALL PRIVILEGES ON `" + database.replace("_", "\\_") + "`.* TO "));
                    assertFalse(grant.contains("WITH GRANT OPTION")); schemaGrants++;
                }
                assertEquals(1, schemaGrants);
            }
        }
        identityRun=run;
        var app = MySqlIT.openApplication(url, user, input.getProperty("password"), database, true);
        int httpPort = ((WebServerApplicationContext) app).getWebServer().getPort();
        Path ready = Path.of(input.getProperty("ready")), temporary = ready.resolveSibling(ready.getFileName() + ".tmp");
        Files.writeString(temporary, "run=" + run + "\npid=" + ProcessHandle.current().pid() + "\nport=" + httpPort + "\n");
        Files.move(temporary, ready, StandardCopyOption.ATOMIC_MOVE);
    }
}
