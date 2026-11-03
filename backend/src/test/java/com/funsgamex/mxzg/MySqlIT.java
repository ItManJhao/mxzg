/**
 * 独立 MySQL 8.4 集成验收：每次创建全新本机实例与受限库账号，使用真实迁移及 Spring 业务。
 * 只由 mysql-it Maven profile 执行；不接受外部 JDBC 地址或玩家库凭据，不注册生产故障注入入口。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.CampaignService;
import com.funsgamex.mxzg.campaign.CampaignBattle;
import com.funsgamex.mxzg.hero.HeroQueries;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.LineupService;
import com.funsgamex.mxzg.role.RoleService;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class MySqlIT {
    private OwnedMysql mysql;
    private ConfigurableApplicationContext app;
    private JdbcTemplate jdbc;
    private DevelopmentLoginService login;
    private CampaignService campaign;
    private LineupService lineups;
    private RoleService roles;
    private HeroQueries heroes;
    private SessionSnapshotService snapshots;
    /** 在原事务快照入口验证库存，不重新暴露已退役的 HTTP 查询。 */
    /** 按配置 ID、记录 ID 和 long 数量比较 Protobuf 结果，忽略 JSON IntNode 与 Protobuf int64 投影的节点类型差异。 */
    private static java.util.List<com.funsgamex.mxzg.inventory.InventoryService.Item> inventoryValues(tools.jackson.databind.JsonNode items) {
        var result = new java.util.ArrayList<com.funsgamex.mxzg.inventory.InventoryService.Item>();
        for (var item : items) result.add(new com.funsgamex.mxzg.inventory.InventoryService.Item(item.path("itemId").asInt(), item.path("quantity").asLong(), item.path("instanceId").asString()));
        return result;
    }

    private java.util.List<com.funsgamex.mxzg.inventory.InventoryService.Item> inventory(String token) { return snapshots.snapshot(token).inventory(); }
    /** 期限测试成功后才允许保留隔离预览；默认测试不创建预览账号。 */
    private boolean previewEligible;
    private record Player(String account, String id, String token) {}

    /** 在任何迁移前创建独占实例并校验版本、身份、库名、权限和服务器 UUID。 */
    @BeforeAll void start() throws Exception {
        mysql = new OwnedMysql();
        try {
            mysql.initialize();
            // 本批全新库先到 V3，写入明确合成夹具，再由真实应用迁移 V5，验证已有数据保留。
            org.flywaydb.core.Flyway.configure().dataSource(mysql.url(),mysql.user,mysql.password).cleanDisabled(true).target("3").load().migrate();
            try(var connection=mysql.connect();var statement=connection.createStatement()) {
                statement.executeUpdate("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id) VALUES ('00000000-0000-4000-8000-000000000001','it_v3_migration','it_v3_migration',1,500,0,'it_v3_migration','local-1')");
                statement.executeUpdate("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',10101001,2,1)");
                statement.executeUpdate("INSERT INTO game_inventory(role_id,item_id,quantity) VALUES ('00000000-0000-4000-8000-000000000001',900101,100)");
            }
            boot();
        }
        catch (Exception | AssertionError failure) { close(); throw failure; }
    }

    /** 每次重启都先执行隔离检查；最高优先级进程内配置不允许环境中的业务库覆盖。 */
    private void boot() throws Exception {
        mysql.guard();
        app = openApplication(mysql.url(), mysql.user, mysql.password, mysql.database, false);
        jdbc = app.getBean(JdbcTemplate.class);
        login = app.getBean(DevelopmentLoginService.class);
        campaign = app.getBean(CampaignService.class);
        lineups = app.getBean(LineupService.class);
        roles = app.getBean(RoleService.class);
        heroes = app.getBean(HeroQueries.class);
        snapshots = app.getBean(SessionSnapshotService.class);
    }

    /** 父测试与独立 JVM 共用真实应用启动配置，排除外部环境并固定专用数据源；HTTP 仅绑定随机回环端口。 */
    static ConfigurableApplicationContext openApplication(String url, String user, String password, String database, boolean http) {
        var spring = new SpringApplication(GameApplication.class);
        spring.setWebApplicationType(http ? WebApplicationType.SERVLET : WebApplicationType.NONE);
        spring.setAdditionalProfiles("local", "mysql-it");
        var environment = new StandardEnvironment();
        // 不继承终端中的业务库、独立 Flyway 连接或外部配置位置；只读本工程 classpath 配置。
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().addFirst(new MapPropertySource("owned-mysql-it", Map.ofEntries(
                Map.entry("spring.config.location", "classpath:/"),
                Map.entry("server.address", "127.0.0.1"),
                Map.entry("server.port", "0"),
                Map.entry("spring.datasource.url", url),
                Map.entry("spring.datasource.username", user),
                Map.entry("spring.datasource.password", password),
                Map.entry("spring.datasource.hikari.maximum-pool-size", "12"),
                Map.entry("spring.flyway.url", url),
                Map.entry("spring.flyway.user", user),
                Map.entry("spring.flyway.password", password),
                Map.entry("spring.flyway.schemas", database),
                Map.entry("spring.flyway.default-schema", database),
                Map.entry("spring.flyway.create-schemas", "false"),
                Map.entry("spring.flyway.clean-disabled", "true"),
                Map.entry("spring.main.banner-mode", "off"),
                Map.entry("logging.level.root", "WARN"))));
        spring.setEnvironment(environment);
        return spring.run();
    }

    /** 关闭本批上下文和持有的原生进程句柄；不删除库或猜测其他进程的归属。 */
    @AfterAll void close() throws Exception {
        try {
            if (previewEligible && Boolean.getBoolean("mxzg.mysql.preview")) prepareTimedPreview();
            if (app != null) { app.close(); app = null; }
            if(previewEligible && Boolean.getBoolean("mxzg.mysql.preview")) {
                mysql.guard();Path root=Files.createDirectory(mysql.root.resolve("creator-preview"));
                try(var http=new MySqlHttpProcess(mysql.url(),mysql.user,mysql.password,mysql.database,mysql.uuid,mysql.port,mysql.run,root)) {
                    http.start();http.writePreviewManifest();
                    System.out.println("[MYSQL-IT] Preview retained for at most 45 minutes; create exact stop file: "+root.resolve("stop-preview"));
                    long deadline=System.nanoTime()+TimeUnit.MINUTES.toNanos(45);
                    while(!Files.exists(root.resolve("stop-preview")) && System.nanoTime()<deadline)Thread.sleep(250);
                }
            }
        } finally {
            try { if (app != null) { app.close(); app = null; } }
            finally { if (mysql != null) mysql.close(); }
        }
    }

    /** 创建只存在于本批专用库的随机合成测试账号。 */
    private Player player() {
        String account = "it_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        var result = login.login(account, "local-1");
        return new Player(account, result.role().id(), "Bearer " + result.session().accessToken());
    }

    /** 真 MySQL 验证期限同配置不同实例、事务回滚、到期回收与重启保留。 */
    @Test @Order(13) void timedInventoryIdentityAndExpiry() throws Exception {
        boot();var p=player();
        var timed=app.getBean(com.funsgamex.mxzg.inventory.TimedInventoryService.class);
        var repository=app.getBean(com.funsgamex.mxzg.role.RoleRepository.class);
        var tx=new org.springframework.transaction.support.TransactionTemplate(app.getBean(org.springframework.transaction.PlatformTransactionManager.class));
        long now=Instant.now().getEpochSecond();
        tx.executeWithoutResult(status->{repository.lock(p.id());timed.grantOne(p.id(),902025,now-86400);timed.grantOne(p.id(),902025,now);});
        var original=snapshots.snapshot(p.token()).timedInventory().items();assertEquals(2,original.size());
        assertNotEquals(original.get(0).instanceId(),original.get(1).instanceId());
        long end=original.stream().mapToLong(com.funsgamex.mxzg.inventory.TimedInventoryService.Item::expiresAtSeconds).min().orElseThrow();
        long revision=snapshots.snapshot(p.token()).revision();
        tx.executeWithoutResult(status->{repository.lock(p.id());assertEquals(1,timed.current(p.id(),end).items().size());status.setRollbackOnly();});
        assertEquals(revision,snapshots.snapshot(p.token()).revision());assertEquals(original,snapshots.snapshot(p.token()).timedInventory().items());
        boot();assertEquals(original,snapshots.snapshot(p.token()).timedInventory().items());
        var refreshed=app.getBean(com.funsgamex.mxzg.inventory.TimedInventoryService.class);
        var locks=app.getBean(com.funsgamex.mxzg.role.RoleRepository.class);
        var transaction=new org.springframework.transaction.support.TransactionTemplate(app.getBean(org.springframework.transaction.PlatformTransactionManager.class));
        transaction.executeWithoutResult(status->{locks.lock(p.id());assertEquals(1,refreshed.current(p.id(),end).items().size());});
        assertEquals(revision+1,snapshots.snapshot(p.token()).revision());
        assertEquals(1,snapshots.snapshot(p.token()).timedInventory().items().size());
        previewEligible=true;
    }

    /** 仅在本轮专用库创建可视夹具：角色经验 66、两张同配置周卡，其中一张四分钟到期；绝不进入业务发放入口。 */
    private void prepareTimedPreview() throws Exception {
        mysql.guard();
        var player=login.login("bag_timed_preview","local-1");
        var timed=app.getBean(com.funsgamex.mxzg.inventory.TimedInventoryService.class);
        var inventory=app.getBean(com.funsgamex.mxzg.inventory.InventoryService.class);
        var locks=app.getBean(com.funsgamex.mxzg.role.RoleRepository.class);
        var tx=new org.springframework.transaction.support.TransactionTemplate(app.getBean(org.springframework.transaction.PlatformTransactionManager.class));
        long now=Instant.now().getEpochSecond();
        tx.executeWithoutResult(status->{
            locks.lock(player.role().id());
            inventory.credit(player.role().id(),900601,5);
            assertEquals(1,jdbc.update("UPDATE game_role SET role_experience=66 WHERE id=?",player.role().id()));
            var shortItem=timed.grantOne(player.role().id(),902025,now);
            timed.grantOne(player.role().id(),902025,now);
            assertEquals(1,jdbc.update("UPDATE game_timed_inventory SET expires_at_seconds=? WHERE role_id=? AND instance_id=?",now+240,player.role().id(),shortItem.instanceId()));
        });
        System.out.println("[MYSQL-IT] synthetic preview account=bag_timed_preview, one short fixture expires="+(now+240));
    }
    /** 重启后资产完全一致，读取时刻允许前进；不能将运行时钟当持久资产比较。 */
    private static void assertStoredState(SessionSnapshotService.Snapshot before, SessionSnapshotService.Snapshot after) {
        assertEquals(before.role(),after.role());assertEquals(before.heroes(),after.heroes());assertEquals(before.inventory(),after.inventory());
        assertEquals(before.revision(),after.revision());assertEquals(before.timedInventory().items(),after.timedInventory().items());
        assertTrue(after.timedInventory().serverTimeSeconds()>=before.timedInventory().serverTimeSeconds());
    }
    /** 查询当前专用库中的标量，不接受外部连接。 */
    private long number(String sql, Object... args) { return jdbc.queryForObject(sql, Long.class, args); }

    /** 比较业务拒绝状态，不泄露会话值。 */
    private void rejected(int code, Runnable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action::run).getStatusCode().value());
    }

    /** 空库必须执行现行八份迁移，真实 MySQL 列类型、索引和约束须可查询。 */
    @Test @Order(1) void emptySchemaMigratesWithRealMysqlTypesAndConstraints() {
        assertEquals(500,number("SELECT gold FROM game_role WHERE login_account='it_v3_migration'"));
        assertEquals(2,number("SELECT hero_level FROM game_hero WHERE id='00000000-0000-4000-8000-000000000002'"));
        assertEquals(0,number("SELECT stage FROM game_hero WHERE id='00000000-0000-4000-8000-000000000002'"));
        assertEquals(100,number("SELECT quantity FROM game_inventory WHERE role_id='00000000-0000-4000-8000-000000000001' AND item_id=900101"));
        assertEquals("stack:00000000-0000-4000-8000-000000000001:900101",jdbc.queryForObject("SELECT instance_id FROM game_inventory WHERE role_id='00000000-0000-4000-8000-000000000001' AND item_id=900101",String.class));
        assertEquals(0,number("SELECT created_at_seconds FROM game_role WHERE login_account='it_v3_migration'"));
        assertEquals(0,number("SELECT role_experience FROM game_role WHERE login_account='it_v3_migration'"));
        System.out.println("[MYSQL-IT] V3 synthetic role/hero/inventory retained after V8; stage=0");
        assertEquals(8, number("SELECT COUNT(*) FROM flyway_schema_history WHERE success=1"));
        assertEquals("bigint", jdbc.queryForObject("SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='game_inventory' AND COLUMN_NAME='quantity'", String.class));
        assertEquals("timestamp", jdbc.queryForObject("SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='game_session' AND COLUMN_NAME='expires_at'", String.class));
        assertEquals(1, number("SELECT COUNT(DISTINCT INDEX_NAME) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='game_role' AND INDEX_NAME='uq_role_account_server' AND NON_UNIQUE=0"));
        assertTrue(number("SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_TYPE='FOREIGN KEY'") >= 7);
        var p = player(); campaign.initialize(p.token());
        assertThrows(RuntimeException.class, () -> jdbc.update("UPDATE game_inventory SET quantity=-1 WHERE role_id=?", p.id()));
        assertThrows(RuntimeException.class, () -> jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,1,1,'missing-role')", UUID.randomUUID().toString()));
    }

    /** 伪造预期 UUID 只读验证本批实例，确认身份不符时启动保护确实中止。 */
    @Test @Order(0) void startupGuardRejectsWrongServerIdentity() throws Exception {
        String expected = mysql.uuid;
        try {
            mysql.uuid = UUID.randomUUID().toString();
            assertThrows(AssertionError.class, mysql::guard);
        } finally { mysql.uuid = expected; }
        mysql.guard();
    }

    /** 用专用表锁观察至少两个真实数据库请求同时等待，再释放执行竞争。 */
    private <T> List<T> overlap(String label, List<Callable<T>> tasks) throws Exception {
        try (var blocker = mysql.connect(); var lock = blocker.createStatement();
             var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            lock.execute("LOCK TABLES game_role WRITE");
            var barrier = new CyclicBarrier(tasks.size());
            var jobs = tasks.stream().map(task -> pool.submit(() -> { barrier.await(10, TimeUnit.SECONDS); return task.call(); })).toList();
            int waiting = 0;
            try {
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                while (System.nanoTime() < deadline) {
                    waiting = (int) number("SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE USER=? AND DB=DATABASE() AND LOWER(STATE) LIKE '%lock%' AND LOWER(INFO) LIKE '%game_role%'", mysql.user);
                    if (waiting >= tasks.size()) break;
                    Thread.sleep(20);
                }
                assertTrue(waiting >= tasks.size(), "未观察到真实 MySQL 请求重叠：" + label);
                assertTrue(jobs.stream().noneMatch(Future::isDone));
                System.out.println("[MYSQL-IT] overlap " + label + " waiting=" + waiting);
            } finally { lock.execute("UNLOCK TABLES"); }
            var results = new ArrayList<T>();
            for (var job : jobs) results.add(job.get(20, TimeUnit.SECONDS));
            return results;
        }
    }

    /** 真正并发创建相同账号/区服只能产生一个角色，不同账号及区服保持隔离。 */
    @Test @Order(2) void concurrentRoleCreationAndWorldIsolation() throws Exception {
        String account = "race_" + UUID.randomUUID().toString().substring(0, 12);
        Callable<String> create = () -> login.login(account, "local-1").role().id();
        var ids = overlap("role-create", List.of(create, create));
        assertEquals(ids.getFirst(), ids.getLast());
        assertEquals(1, number("SELECT COUNT(*) FROM game_role WHERE login_account=? AND server_id='local-1'", account));
        assertEquals(ids.getFirst(), login.login(account, "local-1").role().id());
        var second = login.login(account, "local-2");
        assertNotEquals(ids.getFirst(), second.role().id());
        assertNotEquals(ids.getFirst(), player().id());
        assertTrue(inventory("Bearer " + second.session().accessToken()).isEmpty());
        rejected(401, () -> roles.current(null));
        rejected(401, () -> roles.current("Bearer " + "a".repeat(43)));
    }

    /** 同版本并发保存只能有一个胜者；外来英雄、非法阵位和旧版本都不能覆盖。 */
    @Test @Order(3) void lineupVersionsOwnershipAndConcurrentSave() throws Exception {
        var p = player(); var other = player(); campaign.initialize(p.token()); campaign.initialize(other.token());
        var original = lineups.current(p.token());
        var owned = heroes.list(p.token());
        var foreign = heroes.list(other.token()).getFirst().id();
        rejected(400, () -> lineups.save(p.token(), new Lineup.Save(original.version(), List.of(new Lineup.Slot(2, foreign)))));
        rejected(400, () -> lineups.save(p.token(), new Lineup.Save(original.version(), List.of(new Lineup.Slot(1, owned.getFirst().id())))));
        var tasks = new ArrayList<Callable<Integer>>();
        for (var hero : owned.subList(0, 2)) tasks.add(() -> {
            try { lineups.save(p.token(), new Lineup.Save(original.version(), List.of(new Lineup.Slot(2, hero.id())))); return 200; }
            catch (ResponseStatusException failure) { return failure.getStatusCode().value(); }
        });
        var results = overlap("lineup-save", tasks); Collections.sort(results);
        assertEquals(List.of(200, 409), results);
        var saved = lineups.current(p.token()); assertEquals(original.version() + 1, saved.version());
        assertEquals(saved, lineups.current(p.token()));
        rejected(409, () -> lineups.save(p.token(), new Lineup.Save(original.version(), List.of())));
        assertEquals(saved, lineups.current(p.token()));
    }

    /** 挑战与领取均制造数据库等待重叠，检查战报、货币、库存、经验及关卡仅变化一次。 */
    @Test @Order(4) void concurrentChallengesAndClaimsAreIdempotent() throws Exception {
        var p = player(); campaign.initialize(p.token()); String request = UUID.randomUUID().toString();
        var reports = this.<CampaignBattle.Report>overlap("challenge", List.of(() -> campaign.challenge(p.token(), request), () -> campaign.challenge(p.token(), request)));
        assertEquals(reports.getFirst(), reports.getLast()); var report = reports.getFirst(); assertTrue(report.won());
        assertEquals(1, number("SELECT COUNT(*) FROM game_battle WHERE role_id=?", p.id()));
        rejected(404, () -> campaign.claim(player().token(), report.id()));
        var results = this.<CampaignService.Settlement>overlap("claim", List.of(() -> campaign.claim(p.token(), report.id()), () -> campaign.claim(p.token(), report.id())));
        assertEquals(results.getFirst(), results.getLast());
        assertEquals(results.getFirst(), campaign.claim(p.token(), report.id()));
        assertEquals(4000, roles.current(p.token()).gold()); assertEquals(0, roles.current(p.token()).diamonds());
        assertEquals(550, number("SELECT quantity FROM game_inventory WHERE role_id=? AND item_id=900101", p.id()));
        assertEquals(200, number("SELECT role_exp FROM game_campaign WHERE role_id=?", p.id()));
        assertEquals(2, campaign.current(p.token()).stageId()); assertNull(campaign.current(p.token()).pending());
        assertEquals(1, number("SELECT COUNT(*) FROM game_battle WHERE role_id=? AND claimed=1", p.id()));
        assertTrue(campaign.challenge(p.token(), request).claimed());
    }

    /** 用本批合成库存溢出在发奖中途触发失败，证明整个真实事务回滚，无生产故障钩子。 */
    @Test @Order(5) void midAwardFailureRollsBackEveryWrite() {
        var p = player(); campaign.initialize(p.token()); var report = campaign.challenge(p.token(), UUID.randomUUID().toString());
        jdbc.update("UPDATE game_inventory SET quantity=? WHERE role_id=? AND item_id=900101", Long.MAX_VALUE, p.id());
        var before = inventory(p.token());
        assertThrows(RuntimeException.class, () -> campaign.claim(p.token(), report.id()));
        assertEquals(before, inventory(p.token())); assertEquals(0, roles.current(p.token()).gold());
        assertEquals(0, number("SELECT role_exp FROM game_campaign WHERE role_id=?", p.id()));
        assertEquals(1, campaign.current(p.token()).stageId()); assertFalse(campaign.current(p.token()).pending().claimed());
        assertEquals(0, number("SELECT COUNT(*) FROM game_inventory WHERE role_id=? AND item_id=900401", p.id()));
        System.out.println("[MYSQL-IT] rollback verified: inventory/gold/experience/stage/claim");
    }

    /** 明确 UTC 会话，核验 TIMESTAMP 往返误差及过期拒绝，不修改系统时钟。 */
    @Test @Order(6) void utcTimestampRoundTripAndExpiry() {
        assertEquals(ZoneOffset.UTC, ZoneId.systemDefault().normalized());
        assertEquals("+00:00", jdbc.queryForObject("SELECT @@session.time_zone", String.class));
        var p = player();
        var expires = jdbc.queryForObject("SELECT expires_at FROM game_session WHERE role_id=?", Timestamp.class, p.id()).toInstant();
        assertTrue(Math.abs(Duration.between(Instant.now().plusSeconds(3600), expires).toSeconds()) <= 2);
        jdbc.update("UPDATE game_session SET expires_at=? WHERE role_id=?", Timestamp.from(Instant.now().minusSeconds(10)), p.id());
        rejected(401, () -> inventory(p.token())); rejected(401, () -> roles.current(p.token()));
        System.out.println("[MYSQL-IT] timezone JVM=UTC JDBC=UTC MySQL=+00:00; expired session rejected");
    }

    /** 关闭重建完整应用上下文和连接池，并终止重启本批 MySQL，核验未领/已领奖持久化与迁移不重放。 */
    @Test @Order(7) void applicationAndOwnedDatabaseRestartPreserveData() throws Exception {
        var p = player(); campaign.initialize(p.token()); var lineup = lineups.current(p.token());
        var heroRows = heroes.list(p.token()); var report = campaign.challenge(p.token(), UUID.randomUUID().toString());
        app.close(); app = null; boot();
        assertEquals(report, campaign.current(p.token()).pending()); assertEquals(lineup, lineups.current(p.token()));
        var settled = campaign.claim(p.token(), report.id());
        app.close(); app = null; mysql.restart(); boot();
        var again = login.login(p.account(), "local-1"); String token = "Bearer " + again.session().accessToken();
        assertEquals(p.id(), again.role().id());
        var previous=settled.role();var current=again.role();
        assertEquals(previous.gold(),current.gold());assertEquals(previous.diamonds(),current.diamonds());assertEquals(previous.level(),current.level());
        assertEquals(previous.basics().createdAtSeconds(),current.basics().createdAtSeconds());assertEquals(previous.basics().experience(),current.basics().experience());
        assertTrue(current.basics().lastLoginAtSeconds()>=previous.basics().lastLoginAtSeconds());
        assertEquals(settled.inventory(), inventory(token)); assertEquals(lineup, lineups.current(token));
        assertEquals(heroRows, heroes.list(token)); assertEquals(2, campaign.current(token).stageId());
        assertEquals(200, number("SELECT role_exp FROM game_campaign WHERE role_id=?", p.id()));
        assertEquals(8, number("SELECT COUNT(*) FROM flyway_schema_history WHERE success=1"));
        var replay=campaign.claim(token,report.id());
        assertEquals(settled.battle(),replay.battle());assertEquals(settled.inventory(),replay.inventory());assertEquals(settled.stageId(),replay.stageId());
        assertEquals(current,replay.role(),"重放携带当前角色快照，登录时间不是历史奖励收据");
        System.out.println("[MYSQL-IT] application contexts restarted=2; owned mysqld restarted=1; pending/claimed persisted; migrations=8");
    }

    /** 通过独立 JVM 的真实 HTTP 完成业务链，在未领奖和已领奖两个阶段分别终止进程再登录核验恢复。 */
    /** 独立 JVM 使用 WS 完成选服/登录/角色背包初始化；重启后凭证和版本持久恢复。 */
    @Test @Order(8) void websocketInitializationSurvivesIndependentJvmRestarts() throws Exception {
        try(var process=new MySqlHttpProcess(mysql.url(),mysql.user,mysql.password,mysql.database,mysql.uuid,mysql.port,mysql.run,mysql.root)) {
            process.start();assertTrue(process.exchange("servers.list",Map.of()).path("body").path("items").size()>=2);
            String account="ws_"+mysql.run.substring(0,12);
            var accepted=process.exchange("session.login",Map.of("account",account,"serverId","local-1","clientInstanceId",UUID.randomUUID().toString()));
            assertTrue(accepted.path("ok").asBoolean());String token=accepted.path("body").path("session").path("accessToken").asString();
            var initial=accepted.path("body").path("initial");assertTrue(initial.path("inventory").isEmpty());assertTrue(initial.path("revision").asLong()>=0);
            var basics=initial.path("role").path("basics");assertEquals(1000,basics.path("cup").asInt());assertEquals(410304012,basics.path("imageId").asInt());assertEquals(120,basics.path("experienceToNextLevel").asLong());assertTrue(basics.path("createdAtSeconds").asLong()>0);
            campaign.initialize("Bearer "+token);
            var state=snapshots.snapshot("Bearer "+token);assertTrue(state.revision()>0);
            process.restart();assertEquals(state.inventory(),inventoryValues(process.inventory(token,200)));
            var restored=process.exchange("session.authenticate",Map.of("accessToken",token,"clientInstanceId",UUID.randomUUID().toString())).path("body").path("initial");
            assertEquals(basics,restored.path("role").path("basics"));
            assertEquals(state.revision(),restored.path("revision").asLong());assertEquals(state.role().id(),restored.path("role").path("id").asString());
            process.restart();assertEquals(state.inventory(),inventoryValues(process.inventory(token,200)));
            jdbc.update("UPDATE game_session SET expires_at=TIMESTAMP '2000-01-01 00:00:00' WHERE role_id=?",state.role().id());process.inventory(token,401);
            System.out.println("[MYSQL-IT] WS+PB unified init persisted across independent JVM restarts; no game HTTP");
        }
    }

    /** 真 MySQL 锁等待证明升级重复请求和不同请求真正重叠；收据失败必须回滚全部资产/等级。 */
    @Test @Order(9) void heroUpgradeConcurrencyAndRollback() throws Exception {
        boot(); var levels=app.getBean(com.funsgamex.mxzg.hero.HeroLevelService.class);
        var p=player();campaign.initialize(p.token());var battle=campaign.challenge(p.token(),UUID.randomUUID().toString());
        assertTrue(battle.won());campaign.claim(p.token(),battle.id());String hero=heroes.list(p.token()).getFirst().id();
        var request=new com.funsgamex.mxzg.hero.HeroLevelService.Request(UUID.randomUUID().toString(),1);
        Callable<com.funsgamex.mxzg.hero.HeroLevelService.Result> upgrade=()->levels.upgrade(p.token(),hero,request);
        var repeated=overlap("hero-upgrade-same-request",List.of(upgrade,upgrade));
        assertEquals(repeated.getFirst(),repeated.getLast());assertEquals(3947,roles.current(p.token()).gold());
        var jobs=new ArrayList<Callable<Integer>>();
        for(int i=0;i<2;i++)jobs.add(()->{
            try {levels.upgrade(p.token(),hero,new com.funsgamex.mxzg.hero.HeroLevelService.Request(UUID.randomUUID().toString(),2));return 200;}
            catch(ResponseStatusException failure){assertEquals("HERO_LEVEL_CHANGED",failure.getReason());return failure.getStatusCode().value();}
        });
        var outcomes=overlap("hero-upgrade-different-request",jobs);Collections.sort(outcomes);assertEquals(List.of(200,409),outcomes);
        assertEquals(3,levels.preview(p.token(),hero).hero().level());assertEquals(2,number("SELECT COUNT(*) FROM game_hero_level_request WHERE role_id=?",p.id()));
        var before=levels.preview(p.token(),hero);
        // 已有收据也包含该英雄，故故障约束仅针对下一等级，避免给有效历史数据制造冲突。
        jdbc.execute("ALTER TABLE game_hero_level_request ADD CONSTRAINT it_upgrade_failure CHECK (hero_id <> '"+hero+"' OR from_level <> 3)");
        try {assertThrows(RuntimeException.class,()->levels.upgrade(p.token(),hero,new com.funsgamex.mxzg.hero.HeroLevelService.Request(UUID.randomUUID().toString(),3)));}
        finally {jdbc.execute("ALTER TABLE game_hero_level_request DROP CHECK it_upgrade_failure");}
        assertEquals(before,levels.preview(p.token(),hero));assertEquals(2,number("SELECT COUNT(*) FROM game_hero_level_request WHERE role_id=?",p.id()));
        System.out.println("[MYSQL-IT] hero upgrade concurrency=2 observed groups; receipt failure rolls back gold/experience/level");
    }

    /** 正常 HTTP 首胜奖励足够升级；第二场使用新属性，独立 JVM 重启后重登/重放不再扣费。 */
    /** 一笔事务的多处资产写入共享一个持久版本，回滚不增加版本，应用重启保留已提交数据。 */
    @Test @Order(10) void assetRevisionCommitRollbackAndRestart() throws Exception {
        var p=player();var repo=app.getBean(com.funsgamex.mxzg.role.RoleRepository.class);var inventory=app.getBean(com.funsgamex.mxzg.inventory.InventoryService.class);
        var tx=new org.springframework.transaction.support.TransactionTemplate(app.getBean(org.springframework.transaction.PlatformTransactionManager.class));
        long before=repo.revision(p.id());
        tx.executeWithoutResult(status->{repo.lock(p.id());repo.creditCurrency(p.id(),17,3);inventory.credit(p.id(),900101,8);inventory.credit(p.id(),900101,4);});
        assertEquals(before+1,repo.revision(p.id()));var committed=snapshots.snapshot(p.token());
        tx.executeWithoutResult(status->{repo.lock(p.id());inventory.credit(p.id(),900101,99);repo.creditCurrency(p.id(),99,0);status.setRollbackOnly();});
        assertStoredState(committed,snapshots.snapshot(p.token()));
        app.close();boot();assertStoredState(committed,snapshots.snapshot(p.token()));
        assertEquals("bigint",jdbc.queryForObject("SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='game_role' AND COLUMN_NAME='state_revision'",String.class));
    }

    /** 独立 MySQL 经 HTTP 并发领取后重启 JVM 和数据库，验证计时、随机收据和资产均不重复。 */
    /** 暂停的挂机仍保留真实 MySQL 领域幂等与重启测试，不发布网络入口。 */
    @Test @Order(11) void idleDomainClaimAndRestart() throws Exception {
        var p=player();campaign.initialize(p.token());var idle=app.getBean(com.funsgamex.mxzg.campaign.IdleService.class);
        var state=idle.current(p.token());assertTrue(state.claimable());
        var request=new com.funsgamex.mxzg.campaign.IdleService.Request(UUID.randomUUID().toString(),state.revision());
        var first=idle.claim(p.token(),request);assertEquals(first.receipt(),idle.claim(p.token(),request).receipt());
        var assets=snapshots.snapshot(p.token());app.close();mysql.restart();boot();
        var restored=app.getBean(com.funsgamex.mxzg.campaign.IdleService.class).claim(p.token(),request);
        assertEquals(first.receipt(),restored.receipt());assertStoredState(assets,snapshots.snapshot(p.token()));
    }

    /** 角色基础字段与版本持久化，应用重启后完整恢复，回滚不影响经验和外观。 */
    @Test @Order(14) void roleBasicsPersistAndRollback() throws Exception {
        var p=player();var repo=app.getBean(com.funsgamex.mxzg.role.RoleRepository.class);
        var sync=app.getBean(com.funsgamex.mxzg.network.AssetSyncService.class);
        var tx=new org.springframework.transaction.support.TransactionTemplate(app.getBean(org.springframework.transaction.PlatformTransactionManager.class));
        long before=repo.revision(p.id());
        tx.executeWithoutResult(status->{repo.lock(p.id());jdbc.update("UPDATE game_role SET role_experience=66,cup=1450,head_id=12,border_id=34 WHERE id=?",p.id());sync.changed(p.id());});
        var committed=snapshots.snapshot(p.token());assertEquals(before+1,committed.revision());
        tx.executeWithoutResult(status->{repo.lock(p.id());jdbc.update("UPDATE game_role SET role_experience=99 WHERE id=?",p.id());sync.changed(p.id());status.setRollbackOnly();});
        assertStoredState(committed,snapshots.snapshot(p.token()));
        app.close();boot();var restored=snapshots.snapshot(p.token());assertStoredState(committed,restored);
        assertEquals(66,restored.role().basics().experience());assertEquals(1450,restored.role().basics().cup());
        assertEquals(12,restored.role().basics().headId());assertEquals(34,restored.role().basics().borderId());assertEquals(410304012,restored.role().basics().imageId());
        System.out.println("[MYSQL-IT] role basics persisted; rollback/restart preserve role and unified revision");
    }

    /** 仅拥有本次新建数据目录的 MySQL 进程；不能配置或重用任何外部数据库。 */
    private static final class OwnedMysql implements AutoCloseable {
        private final String run = UUID.randomUUID().toString().replace("-", "");
        private final Instant created = Instant.now();
        private final String database = "mxzg_it_" + run;
        private final String user = "mxzg_it_" + run.substring(0, 16);
        private final String password = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        private Path home, executable, root, data, init;
        private int port;
        private String uuid, version;
        private Process process;
        private int launches;

        /** 显式检查二进制和 8.4 版本，原子创建唯一目录，先记录边界再执行任何数据库初始化写入。 */
        void initialize() throws Exception {
            String configured = System.getProperty("mxzg.mysql.home");
            if (configured == null || configured.isBlank()) throw new IllegalArgumentException("必须显式设置 mxzg.mysql.home；禁止连接默认业务库");
            home = Path.of(configured).toRealPath(); executable = home.resolve("bin/mysqld.exe");
            if (!Files.isRegularFile(executable)) throw new IllegalArgumentException("缺少 MySQL ZIP 二进制");
            var probe = new ProcessBuilder(executable.toString(), "--no-defaults", "--version").redirectErrorStream(true).start();
            version = new String(probe.getInputStream().readAllBytes()).strip();
            if (!probe.waitFor(10, TimeUnit.SECONDS) || probe.exitValue() != 0 || !version.contains("Ver 8.4.")) throw new IllegalArgumentException("要求实际 MySQL 8.4 二进制");
            Path parent = Path.of("target/mysql-it").toAbsolutePath().normalize(); Files.createDirectories(parent);
            root = Files.createDirectory(parent.resolve(run)); data = root.resolve("data"); init = root.resolve("bootstrap.sql");
            try (var socket = new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"))) { port = socket.getLocalPort(); }
            if (port == 18080 || port == 3306) throw new IllegalStateException("拒绝保留端口");
            record("created");
            System.out.println("[MYSQL-IT] " + version + " target=127.0.0.1:" + port + "/" + database + " user=" + user + " run=" + run + " retain=stopped-owned-datadir");
            var initialize = new ProcessBuilder(executable.toString(), "--no-defaults", "--basedir=" + home,
                "--datadir=" + data, "--no-monitor", "--initialize-insecure").redirectErrorStream(true).redirectOutput(root.resolve("initialize.log").toFile()).start();
            if (!initialize.waitFor(60, TimeUnit.SECONDS)) { initialize.destroyForcibly(); throw new IllegalStateException("独立实例初始化超时"); }
            if (initialize.exitValue() != 0) throw new IllegalStateException("独立实例初始化失败，查看本批 initialize.log");
            uuid = Files.readAllLines(data.resolve("auto.cnf")).stream().filter(s -> s.startsWith("server-uuid=")).findFirst().orElseThrow().substring(12);
            // 转义授权模式中的下划线，避免数据库级权限匹配同名前缀的其他库。
            Files.writeString(init, "CREATE DATABASE `" + database + "` CHARACTER SET utf8mb4;\n"
                + "CREATE USER '" + user + "'@'127.0.0.1' IDENTIFIED BY '" + password + "';\n"
                + "GRANT ALL PRIVILEGES ON `" + database.replace("_", "\\_") + "`.* TO '" + user + "'@'127.0.0.1';\n"
                + "ALTER USER 'root'@'localhost' ACCOUNT LOCK;\n");
            try { launch(true); guard(); }
            finally { Files.deleteIfExists(init); }
            record("running");
        }

        /** 固定回环地址和唯一端口，禁止默认配置文件、X 协议及系统服务注册。 */
        private void launch(boolean bootstrap) throws Exception {
            Path errorLog = root.resolve("mysql-error-" + (++launches) + ".log");
            var args = new ArrayList<>(List.of(executable.toString(), "--no-defaults", "--basedir=" + home,
                "--datadir=" + data, "--no-monitor", "--port=" + port, "--bind-address=127.0.0.1", "--mysqlx=OFF", "--skip-name-resolve",
                "--default-time-zone=+00:00", "--skip-log-bin", "--innodb-buffer-pool-size=64M", "--innodb-redo-log-capacity=64M",
                "--log-error=" + errorLog));
            if (bootstrap) args.add("--init-file=" + init.toString().replace('\\', '/'));
            process = new ProcessBuilder(args).redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.appendTo(root.resolve("process.log").toFile())).start();
            long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(40);
            while (System.nanoTime() < until && process.isAlive()) {
                // 先以本批新日志证明该进程已绑定自己的端口，避免端口竞争时误连其他实例。
                if (Files.exists(errorLog) && Files.readString(errorLog).contains("ready for connections")) {
                    try (var connection = connect()) { return; } catch (SQLException notReady) { /* 等待本批引导完成。 */ }
                }
                Thread.sleep(100);
            }
            throw new IllegalStateException("独立实例未就绪，保留本批日志；未连接其他服务");
        }

        /** 地址完全由本批创建记录生成，不读取 MXZG_DATABASE_* 或外部 JDBC 参数。 */
        String url() { return "jdbc:mysql://127.0.0.1:" + port + "/" + database + "?sslMode=DISABLED&allowPublicKeyRetrieval=true&connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&preserveInstants=true&connectTimeout=1000&socketTimeout=20000"; }

        /** 连接时仅使用本批受限用户，管理身份从不运行应用或测试。 */
        Connection connect() throws SQLException { return DriverManager.getConnection(url(), user, password); }

        /** 启动迁移之前拒绝服务器 UUID、版本、库、用户或授权范围的任何偏差。 */
        void guard() throws Exception {
            if (process == null || !process.isAlive() || !database.equals("mxzg_it_" + run) || !Files.isDirectory(data)) throw new IllegalStateException("归属检查失败");
            try (var connection = connect(); var statement = connection.createStatement()) {
                try (var row = statement.executeQuery("SELECT VERSION(), DATABASE(), CURRENT_USER(), @@server_uuid, @@port")) {
                    row.next(); assertTrue(row.getString(1).startsWith("8.4.")); assertEquals(database, row.getString(2));
                    assertEquals(user + "@127.0.0.1", row.getString(3)); assertEquals(uuid, row.getString(4)); assertEquals(port, row.getInt(5));
                }
                try (var rows = statement.executeQuery("SHOW GRANTS")) {
                    int schemaGrants = 0;
                    while (rows.next()) {
                        String grant = rows.getString(1);
                        if (grant.startsWith("GRANT USAGE ON *.* TO ")) continue;
                        assertTrue(grant.startsWith("GRANT ALL PRIVILEGES ON `" + database.replace("_", "\\_") + "`.* TO "), "拒绝超出专用库的权限");
                        assertFalse(grant.contains("WITH GRANT OPTION")); schemaGrants++;
                    }
                    assertEquals(1, schemaGrants);
                }
            }
        }

        /** 只终止由本对象持有句柄启动的独立实例，再用同一已验证目录重启。 */
        void restart() throws Exception { stop(); launch(false); guard(); record("restarted"); }

        /** 精确停止本对象的进程，不按端口、名称或系统服务猜测进程。 */
        private void stop() throws Exception {
            if (process != null && process.isAlive()) {
                process.destroy();
                if (!process.waitFor(15, TimeUnit.SECONDS)) { process.destroyForcibly(); process.waitFor(10, TimeUnit.SECONDS); }
                if (process.isAlive()) throw new IllegalStateException("本批 MySQL 进程未停止");
            }
        }

        /** 保留无凭据的归属记录，便于负责人核对停止状态与数据去向。 */
        private void record(String state) throws Exception {
            Files.writeString(root.resolve("ownership.properties"), "run=" + run + "\nstate=" + state + "\nhost=127.0.0.1\nport=" + port
                + "\ndatabase=" + database + "\nuser=" + user + "\nuuid=" + uuid + "\npid=" + (process == null ? "none" : process.pid())
                + "\nversion=" + version + "\ncreated=" + created + "\nupdated=" + Instant.now() + "\nretention=stopped; no automatic drop; bootstrap credentials removed\n");
        }

        /** 删除唯一的临时引导凭据文件，保留专用数据库和审计记录，不启用 clean。 */
        @Override public void close() throws Exception {
            stop();
            if (root != null) { if (init != null) Files.deleteIfExists(init); record("stopped"); System.out.println("[MYSQL-IT] retained stopped instance " + root); }
        }
    }
}
