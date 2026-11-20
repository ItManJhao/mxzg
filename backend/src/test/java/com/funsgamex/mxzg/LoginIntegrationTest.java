/** 真实数据库上的开发登录、角色隔离及首次命名事务校验。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.role.RoleService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:login;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class LoginIntegrationTest {
    @Autowired DevelopmentLoginService login;
    @Autowired RoleService roles;
    @Autowired SessionService sessions;
    @Autowired JdbcTemplate jdbc;
    @Autowired SessionSnapshotService snapshots;

    /** 重登保留内部角色键及公开编号，其他账号各自分配编号。 */
    @Test void repeatLoginKeepsPersistedRoleAndIsolatesAccounts() {
        var first = login.login(" Player_1 ");
        jdbc.update("UPDATE game_role SET gold = 73 WHERE id = ?", first.role().id());
        var again = login.login("player_1");
        assertEquals(first.role().id(), again.role().id());
        assertEquals(first.role().publicId(), again.role().publicId());
        assertTrue(again.role().publicId().matches("1001[0-9]{6}"));
        assertEquals(73, again.role().gold());
        assertNotEquals(first.session().accessToken(), again.session().accessToken());
        assertEquals(first.role().id(), roles.current("Bearer " + again.session().accessToken()).id());
        assertNotEquals(first.role().id(), login.login("player_2").role().id());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_role WHERE account_key = 'player_1'", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_session WHERE token_hash = ?", Integer.class, first.session().accessToken()));
    }

    @Test void rejectsInvalidAndExpiredCredentials() {
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> login.login("a")).getStatusCode().value());
        assertEquals(401, assertThrows(ResponseStatusException.class, () -> roles.current(null)).getStatusCode().value());
        assertThrows(ResponseStatusException.class, () -> roles.current("Bearer " + "a".repeat(43)));
        var issued = login.login("expiry_test");
        jdbc.update("UPDATE game_session SET expires_at = TIMESTAMP '2000-01-01 00:00:00' WHERE role_id = ?", issued.role().id());
        assertThrows(ResponseStatusException.class, () -> roles.current("Bearer " + issued.session().accessToken()));
    }

    /** 同账号同服并发登录只创建一个角色，并且只使用一个公开编号。 */
    @Test void concurrentLoginCreatesOneRole() throws Exception {
        try (var executor = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var tasks = java.util.stream.IntStream.range(0, 8)
                .mapToObj(i -> (java.util.concurrent.Callable<String>) () -> login.login("concurrent_player").role().id())
                .toList();
            var ids = new java.util.HashSet<String>();
            for (var result : executor.invokeAll(tasks)) ids.add(result.get());
            assertEquals(1, ids.size());
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_role WHERE account_key = 'concurrent_player'", Integer.class));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_role_public_number WHERE role_id=?",
                Integer.class, ids.iterator().next()));
        }
    }

    /** 区服独立号段通过现有角色快照按字符串传输，角色 UUID 继续用于会话和资产归属。 */
    @Test void publicNumberIsDistinctAcrossServersAndRoundTripsOverProtobuf() throws Exception {
        var first = login.login("public_role_one", "local-1").role();
        var second = login.login("public_role_one", "local-2");
        assertTrue(first.publicId().matches("1001[0-9]{6}"));
        assertTrue(second.role().publicId().matches("1002[0-9]{6}"));
        assertNotEquals(first.id(), second.role().id());
        var snapshot = snapshots.snapshot("Bearer " + second.session().accessToken());
        byte[] binary = GameProtocolCodec.encode(Map.of("version", 1, "kind", "event", "name", "state.changed",
            "connectionId", UUID.randomUUID().toString(), "body", snapshot));
        var projected = GameProtocolCodec.decode(binary).path("body").path("role");
        assertTrue(projected.path("publicId").isString());
        assertEquals(second.role().publicId(), projected.path("publicId").asString());
        assertEquals(second.role().id(), projected.path("id").asString());
    }

    /** 并发首次启动新区服只登记一条号段；六位序号用完时扩位，保留同一四位前缀。 */
    @Test void concurrentPublicNumberAllocationSupportsNewServerAndOverflow() throws Exception {
        String serverId = "public-role-test";
        jdbc.update("INSERT INTO game_server(id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)",
            serverId, "local", "本地开发区", "编号测试");
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Callable<String>> tasks = java.util.stream.IntStream.range(0, 6)
                .mapToObj(index -> (Callable<String>) () -> login.login("public_concurrent_" + index, serverId).role().publicId())
                .toList();
            var results = new java.util.HashSet<String>();
            for (var result : executor.invokeAll(tasks)) {
                results.add(result.get());
            }
            assertEquals(java.util.Set.of("1003000001", "1003000002", "1003000003", "1003000004", "1003000005",
                "1003000006"), results);
        }
        jdbc.update("UPDATE game_role_public_sequence SET last_sequence=999999 WHERE server_id=?", serverId);
        assertEquals("10031000000", login.login("public_overflow_test", serverId).role().publicId());
    }

    /** V42 按现有区服和创建时刻补发公开编号，保持角色 UUID 及会话所引用的内部角色不变。 */
    @Test void publicNumberMigrationBackfillsPersistedRoles() {
        var source = new DriverManagerDataSource("jdbc:h2:mem:public_role_upgrade_" + UUID.randomUUID()
            + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "sa", "");
        var database = new JdbcTemplate(source);
        String first = "00000000-0000-4000-8000-000000000001";
        String second = "00000000-0000-4000-8000-000000000002";
        String otherServer = "00000000-0000-4000-8000-000000000003";
        try {
            Flyway.configure().dataSource(source).target("41").load().migrate();
            database.update("""
                INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,
                    login_account,server_id,created_at_seconds,last_login_at_seconds)
                VALUES (?, 'public_old_1', '旧角色一', 1, 0, 0, 'public_old_1', 'local-1', 200, 300),
                    (?, 'public_old_2', '旧角色二', 1, 0, 0, 'public_old_2', 'local-1', 100, 300),
                    (?, 'public_old_3', '旧角色三', 1, 0, 0, 'public_old_3', 'local-2', 200, 300)
                """, first, second, otherServer);
            Flyway.configure().dataSource(source).target("42").load().migrate();
            assertEquals("1001000002", database.queryForObject("SELECT public_id FROM game_role_public_number WHERE role_id=?",
                String.class, first));
            assertEquals("1001000001", database.queryForObject("SELECT public_id FROM game_role_public_number WHERE role_id=?",
                String.class, second));
            assertEquals("1002000001", database.queryForObject("SELECT public_id FROM game_role_public_number WHERE role_id=?",
                String.class, otherServer));
            assertEquals(2L, database.queryForObject("SELECT last_sequence FROM game_role_public_sequence WHERE server_id='local-1'",
                Long.class));
        } finally {
            database.execute("SHUTDOWN");
        }
    }

    /** 同服并发认领只成功一次，另一服仍可使用相同名字。 */
    @Test void concurrentlyClaimFirstNameWithinServer() throws Exception {
        var first = login.login("name_concurrent_1", "local-1");
        var second = login.login("name_concurrent_2", "local-1");
        String nickname = "铁盾行者";
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Callable<String>> callers = List.of(
                () -> claimName(first, nickname, start),
                () -> claimName(second, nickname, start));
            var results = callers.stream().map(executor::submit).toList();
            start.countDown();
            var answers = List.of(results.getFirst().get(), results.getLast().get());
            assertTrue(answers.containsAll(List.of("OK", "ROLE_NAME_EXISTS")));
        }
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_role WHERE server_id=? AND nickname=? AND first_named",
            Integer.class, "local-1", nickname));
        var otherServer = login.login("name_other_server", "local-2");
        roles.setName("Bearer " + otherServer.session().accessToken(), nickname);
        assertEquals(nickname, roles.current("Bearer " + otherServer.session().accessToken()).nickname());
    }

    /** 当前配置按显示长度拦截过长中文名，失败后仍能完成命名。 */
    @Test void firstNameValidatesWeightedLength() {
        var player = login.login("name_length_1");
        String token = "Bearer " + player.session().accessToken();
        assertFalse(roles.current(token).firstNamed());
        assertEquals("ROLE_NAME_INVALID",
            assertThrows(ResponseStatusException.class, () -> roles.setName(token, "风".repeat(13))).getReason());
        assertFalse(roles.current(token).firstNamed());
        var maxName = "风".repeat(12) + "a";
        roles.setName(token, maxName);
        assertTrue(roles.current(token).firstNamed());
        assertEquals(maxName, roles.current(token).nickname());
        assertEquals("ROLE_NAME_ALREADY_CONFIRMED",
            assertThrows(ResponseStatusException.class, () -> roles.setName(token, "水云")).getReason());
    }

    /** V34 原样保留旧库历史重名，把两笔历史角色都视为已完成命名。 */
    @Test void keepsLegacyNamesAfterSchemaUpgrade() {
        var source = new DriverManagerDataSource("jdbc:h2:mem:names_upgrade_" + UUID.randomUUID()
            + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "sa", "");
        var database = new JdbcTemplate(source);
        try {
            Flyway.configure().dataSource(source).target("33").load().migrate();
            for (String account : List.of("old_name_a", "old_name_b")) {
                database.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id)"
                    + " VALUES (?,?,?,1,0,0,?,'local-1')", UUID.randomUUID().toString(), account, "旧角色", account);
            }
            Flyway.configure().dataSource(source).load().migrate();
            assertEquals(2, database.queryForObject("SELECT COUNT(*) FROM game_role WHERE nickname=? AND first_named",
                Integer.class, "旧角色"));
        } finally {
            database.execute("SHUTDOWN");
        }
    }

    /** 同时开始两次真实事务，按业务码区分获胜与重名。 */
    private String claimName(DevelopmentLoginService.LoginResult player, String nickname, CountDownLatch start)
            throws InterruptedException {
        start.await();
        try {
            roles.setName("Bearer " + player.session().accessToken(), nickname);
            return "OK";
        } catch (ResponseStatusException rejected) {
            return rejected.getReason();
        }
    }
}
