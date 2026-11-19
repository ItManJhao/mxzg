/** 真实数据库上的开发登录、角色隔离及首次命名事务校验。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.role.RoleService;
import java.util.List;
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

    @Test void repeatLoginKeepsPersistedRoleAndIsolatesAccounts() {
        var first = login.login(" Player_1 ");
        jdbc.update("UPDATE game_role SET gold = 73 WHERE id = ?", first.role().id());
        var again = login.login("player_1");
        assertEquals(first.role().id(), again.role().id());
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

    @Test void concurrentLoginCreatesOneRole() throws Exception {
        try (var executor = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            var tasks = java.util.stream.IntStream.range(0, 8)
                .mapToObj(i -> (java.util.concurrent.Callable<String>) () -> login.login("concurrent_player").role().id())
                .toList();
            var ids = new java.util.HashSet<String>();
            for (var result : executor.invokeAll(tasks)) ids.add(result.get());
            assertEquals(1, ids.size());
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_role WHERE account_key = 'concurrent_player'", Integer.class));
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
