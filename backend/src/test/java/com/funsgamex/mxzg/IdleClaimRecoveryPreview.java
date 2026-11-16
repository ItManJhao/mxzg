/**
 * 客户端挂机领取恢复的独立真实后端宿主：仅测试类路径可用，强制回环随机端口及本次run的文件H2。
 * 首次仅准备六个测试角色的已通关/累计夹具，活动控制走真实维护服务；重启不重置资产、起点或回执。
 * 通过同run的enabled/read-only两次进程验证持久恢复；只读HTTP仅提供实例身份，不增加业务HTTP或控制接口。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.IdleActivityMaintenanceService;
import com.funsgamex.mxzg.campaign.MainChapterIdleStateRepository;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

/** 显式运行的测试进程，不被普通应用组件扫描或打进生产包。 */
public final class IdleClaimRecoveryPreview {
    /** 每个恢复场景独立角色，避免重置前一场已提交起点来伪造新可领时间。 */
    private static final List<String> ACCOUNTS = List.of("idle_direct", "idle_lost_receipt", "idle_lost_state",
            "idle_reload", "idle_other", "idle_pending");
    /** 本进程经命令行校验的唯一运行标识，身份探针不返回凭证或资产。 */
    private static String run;
    /** 本进程固定启动模式；读取历史回执不因read-only开关改变。 */
    private static String mode;

    /** 测试入口类不需要实例，所有进程内可变业务状态仍归Spring领域服务。 */
    private IdleClaimRecoveryPreview() {
    }

    /**
     * 只接受run和启动模式，数据目录由run派生，不接收任意数据库、端口或外部配置地址。
     * 退出时保存不含会话的持久事实，再关闭Spring及H2；后续同run可启动read-only恢复进程。
     */
    public static void main(String[] args) throws Exception {
        Map<String, String> options = readOptions(args);
        run = options.get("run");
        mode = options.get("mode");
        Path root = Path.of("target", "idle-recovery-live-" + run).toAbsolutePath().normalize();
        Path target = Path.of("target").toAbsolutePath().normalize();
        if (!root.getParent().equals(target) || !Files.isRegularFile(Path.of("pom.xml"))) {
            throw new IllegalStateException("必须从本项目backend目录启动独立恢复宿主");
        }
        Files.createDirectories(root);
        Path stop = root.resolve("stop-" + mode + ".request");
        if (Files.exists(stop)) {
            throw new IllegalStateException("同阶段已存在停止请求，请使用新阶段或检查原测试归属后处理");
        }
        String database = "jdbc:h2:file:" + root.resolve("game").toString().replace('\\', '/')
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_ON_EXIT=FALSE;WRITE_DELAY=0";
        try (var context = open(database)) {
            JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
            verifyDatabase(jdbc, root);
            String server = "idle-recovery-" + run.substring(0, 8);
            prepare(context, server);
            int port = ((WebServerApplicationContext) context).getWebServer().getPort();
            Map<String, Object> ready = new LinkedHashMap<>();
            ready.put("kind", "mxzg-owned-socket-it");
            ready.put("run", run);
            ready.put("phase", mode);
            ready.put("pid", ProcessHandle.current().pid());
            ready.put("port", port);
            ready.put("serverId", server);
            ready.put("accounts", ACCOUNTS);
            ready.put("databaseRoot", root.toString());
            ready.put("stopRequest", stop.toString());
            writeJson(context, root.resolve("facts-start-" + mode + ".json"), facts(jdbc, server));
            writeJson(context, root.resolve("ready-" + mode + ".json"), ready);
            System.out.println("[IDLE-RECOVERY] ready run=" + run + " phase=" + mode + " port=" + port);
            waitForStop(context, root, server, stop);
            writeJson(context, root.resolve("facts-stop-" + mode + ".json"), facts(jdbc, server));
        }
        Files.writeString(root.resolve("stopped-" + mode + ".json"),
                "{\"run\":\"" + run + "\",\"phase\":\"" + mode + "\",\"pid\":"
                        + ProcessHandle.current().pid() + ",\"stopped\":true}");
    }

    /** 强制应用、Flyway及网络使用同一个本次文件库；外部数据库变量和配置位置不能覆盖命令行。 */
    private static ConfigurableApplicationContext open(String database) {
        return SpringApplication.run(new Class<?>[] {GameApplication.class, Identity.class}, new String[] {
                "--spring.config.location=classpath:/", "--spring.config.additional-location=",
                "--spring.config.import=", "--spring.profiles.active=local", "--spring.profiles.include=",
                "--server.address=127.0.0.1", "--server.port=0",
                "--spring.datasource.url=" + database, "--spring.datasource.username=sa", "--spring.datasource.password=",
                "--spring.flyway.url=" + database, "--spring.flyway.user=sa", "--spring.flyway.password=",
                "--mxzg.websocket.enabled=true", "--mxzg.gm.enabled=false",
                "--mxzg.main-chapter.idle-claim-enabled=" + mode.equals("enabled"),
                "--mxzg.idle-activity-maintenance.enabled=false"
        });
    }

    /** 参数仅接受规范32位run和两种固定模式；未知参数不透传给Spring或H2。 */
    private static Map<String, String> readOptions(String[] args) {
        var values = new LinkedHashMap<String, String>();
        for (String argument : args) {
            String[] pair = argument.split("=", 2);
            if (pair.length != 2 || !List.of("--run", "--mode").contains(pair[0])
                    || values.putIfAbsent(pair[0].substring(2), pair[1]) != null) {
                throw new IllegalArgumentException("恢复宿主只接受唯一--run及--mode参数");
            }
        }
        if (values.size() != 2 || !values.getOrDefault("run", "").matches("[a-f0-9]{32}")
                || !List.of("enabled", "read-only").contains(values.get("mode"))) {
            throw new IllegalArgumentException("run需32位小写十六进制，mode需enabled或read-only");
        }
        return Map.copyOf(values);
    }

    /** 启动后再次核对实际H2文件位置，拒绝内存、日常.local或其他路径的连接。 */
    private static void verifyDatabase(JdbcTemplate jdbc, Path root) {
        String actual = jdbc.queryForObject("CALL DATABASE_PATH()", String.class);
        if (actual == null || !Path.of(actual).toAbsolutePath().normalize().equals(root.resolve("game"))) {
            throw new IllegalStateException("实际数据库不属于本次独立恢复目录");
        }
    }

    /**
     * 只在首次创建时准备合法活动控制和六个一级角色；重启读取原记录，不签发多余会话或改写资产。
     * maxCleared=1是明确测试夹具，不冒称已通过真实挑战；真实领取仍消费正式领域规则及同库事务。
     */
    private static void prepare(ConfigurableApplicationContext context, String server) {
        JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM game_server WHERE id=?", Integer.class, server) == 0) {
            if (mode.equals("read-only")) {
                throw new IllegalStateException("只读恢复阶段不能创建新夹具库");
            }
            long now = Instant.now().getEpochSecond();
            jdbc.update("INSERT INTO game_server(id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)",
                    server, "idle-recovery", "独立恢复测试", "独立领取恢复服");
            context.getBean(IdleActivityMaintenanceService.class).configure(server, now - 86_400,
                    Optional.empty(), now);
        }
        RoleRepository roles = context.getBean(RoleRepository.class);
        TransactionTemplate transaction = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        for (String account : ACCOUNTS) {
            var current = roles.findByAccount(account, server);
            if (current.isPresent()) {
                continue;
            }
            if (mode.equals("read-only")) {
                throw new IllegalStateException("只读恢复阶段缺少原测试角色");
            }
            var player = context.getBean(DevelopmentLoginService.class).login(account, server);
            transaction.executeWithoutResult(status -> {
                String role = player.role().id();
                roles.lock(role);
                jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,1)", role);
                boolean created = context.getBean(MainChapterIdleStateRepository.class)
                        .initializeForChallenge(role, Instant.now().getEpochSecond() - 120);
                if (!created) {
                    throw new IllegalStateException("新夹具角色不能复用既有累计");
                }
                context.getBean(AssetSyncService.class).changed(role);
            });
        }
    }

    /** 保存本次角色的持久资产、独立冒险点及旧堆叠隔离事实，不输出game_session或登录凭据。 */
    private static Map<String, Object> facts(JdbcTemplate jdbc, String server) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("run", run);
        values.put("phase", mode);
        values.put("recordedAtSeconds", Instant.now().getEpochSecond());
        values.put("roles", jdbc.queryForList("SELECT id,login_account,role_level,gold,diamonds,role_experience,"
                + "state_revision,last_login_at_seconds FROM game_role WHERE server_id=? ORDER BY login_account", server));
        for (String table : List.of("game_main_chapter", "game_main_chapter_idle", "game_main_chapter_idle_counter",
                "game_inventory", "game_timed_inventory", "game_spirit", "game_tavern_point")) {
            values.put(table, jdbc.queryForList("SELECT item.* FROM " + table + " item JOIN game_role role "
                    + "ON item.role_id=role.id WHERE role.server_id=? ORDER BY item.role_id", server));
        }
        values.put("receipts", jdbc.queryForList("SELECT item.role_id,item.request_id,item.receipt_id,"
                + "item.expected_operation_version,item.before_operation_version,item.after_operation_version,"
                + "item.committed_at_seconds,item.asset_revision,item.payload_hash FROM game_main_chapter_idle_receipt item "
                + "JOIN game_role role ON item.role_id=role.id WHERE role.server_id=? ORDER BY item.role_id,item.request_id", server));
        values.put("summary", jdbc.queryForList("SELECT role.id,role.login_account,role.gold,role.diamonds,"
                + "role.role_level,role.role_experience,role.state_revision AS asset_revision,idle.started_at,"
                + "idle.operation_version,(SELECT COUNT(*) FROM game_main_chapter_idle_receipt receipt WHERE receipt.role_id=role.id) AS receipt_count,"
                + "(SELECT COUNT(*) FROM game_inventory inventory WHERE inventory.role_id=role.id) AS stack_rows,"
                + "(SELECT COUNT(*) FROM game_timed_inventory timed WHERE timed.role_id=role.id) AS timed_rows,"
                + "(SELECT COUNT(*) FROM game_spirit spirit WHERE spirit.role_id=role.id) AS spirit_rows "
                + ",(SELECT point.adventure_count FROM game_tavern_point point WHERE point.role_id=role.id) AS adventure_count "
                + ",(SELECT COUNT(*) FROM game_inventory point_stack WHERE point_stack.role_id=role.id AND point_stack.item_id=900401) AS legacy_tavern_stack_rows "
                + "FROM game_role role JOIN game_main_chapter_idle idle ON idle.role_id=role.id "
                + "WHERE role.server_id=? ORDER BY role.login_account", server));
        return values;
    }

    /** 同目录的audit/stop请求均须完全匹配run；只读审计不新增业务HTTP，也不执行文件中的命令。 */
    private static void waitForStop(ConfigurableApplicationContext context, Path root, String server, Path stop) throws Exception {
        Path audit = root.resolve("audit-" + mode + ".request");
        while (!Thread.currentThread().isInterrupted()) {
            if (Files.isRegularFile(audit) && Files.readString(audit).trim().equals(run)) {
                writeJson(context, root.resolve("audit-" + mode + ".json"), facts(context.getBean(JdbcTemplate.class), server));
                Files.delete(audit);
            }
            if (Files.isRegularFile(stop) && Files.readString(stop).trim().equals(run)) {
                return;
            }
            Thread.sleep(200);
        }
    }

    /** 本次独立目录原子写入就绪或事实文件，不触及已有资源、用户文档及其他测试run。 */
    private static void writeJson(ConfigurableApplicationContext context, Path path, Object value) throws Exception {
        Path temporary = path.resolveSibling(path.getFileName() + ".tmp");
        Files.writeString(temporary, context.getBean(ObjectMapper.class).writeValueAsString(value));
        Files.move(temporary, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    /** 只显式导入本测试宿主，不进入生产包扫描或普通后端启动。 */
    @TestComponent
    @RestController
    public static class Identity {
        /** 只返回实例归属及当前只读模式，客户端先核对run才允许连接正式业务WS。 */
        @GetMapping("/api/v1/test-identity")
        public Map<String, String> identity() {
            return Map.of("kind", "mxzg-owned-socket-it", "run", run, "phase", mode);
        }
    }
}
