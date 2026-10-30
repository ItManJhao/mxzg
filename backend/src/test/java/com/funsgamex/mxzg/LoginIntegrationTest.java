package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.role.RoleController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
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
    @Autowired RoleController roles;
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
}
