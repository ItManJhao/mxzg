package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroController;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.LineupService;
import com.jayway.jsonpath.JsonPath;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:hero_lineup;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class HeroLineupTest {
    @Autowired DevelopmentLoginService login;
    @Autowired HeroController heroes;
    @Autowired LineupService lineups;
    @Autowired JdbcTemplate jdbc;
    @LocalServerPort int port;
    private final HttpClient http = HttpClient.newHttpClient();
    private record Player(String account, String roleId, String authorization) {}
    private Player player() {
        String account = "test_" + UUID.randomUUID().toString().substring(0, 12);
        var result = login.login(account);
        return new Player(account, result.role().id(), "Bearer " + result.session().accessToken());
    }
    private String seedHero(Player player) {
        String id = UUID.randomUUID().toString();
        // Fixtures only: production has no client-facing grant endpoint.
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,1,1)", id, player.roleId());
        return id;
    }
    private Lineup.Save save(long version, Lineup.Slot... slots) { return new Lineup.Save(version, Arrays.asList(slots)); }
    private void invalid(Player player, Lineup.Save request) {
        var before = lineups.current(player.authorization());
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> lineups.save(player.authorization(), request)).getStatusCode().value());
        assertEquals(before, lineups.current(player.authorization()));
    }

    @Test void emptyPlayerHasNoFabricatedHeroesOrLineup() {
        var player = player();
        assertTrue(heroes.list(player.authorization()).isEmpty());
        assertEquals(new Lineup(0, List.of()), lineups.current(player.authorization()));
    }
    @Test void heroQueriesAreIsolatedByAuthenticatedOwner() {
        var owner = player(); var other = player(); String id = seedHero(owner);
        assertEquals(id, heroes.list(owner.authorization()).getFirst().id());
        assertEquals(10101001, heroes.detail(owner.authorization(), id).templateId());
        assertTrue(heroes.list(other.authorization()).isEmpty());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> heroes.detail(other.authorization(), id)).getStatusCode().value());
        assertEquals(401, assertThrows(ResponseStatusException.class, () -> heroes.list(null)).getStatusCode().value());
    }
    @Test void lineupPersistsAcrossSessionsAndNoOpDoesNotBumpVersion() {
        var player = player(); String a = seedHero(player), b = seedHero(player);
        var saved = lineups.save(player.authorization(), save(0, new Lineup.Slot(9,b), new Lineup.Slot(2,a)));
        assertEquals(1, saved.version()); assertEquals(2, saved.slots().getFirst().position());
        var reloaded = login.login(player.account());
        assertEquals(saved, lineups.current("Bearer " + reloaded.session().accessToken()));
        assertEquals(saved, lineups.save(player.authorization(), save(1, new Lineup.Slot(9,b), new Lineup.Slot(2,a))));
        assertEquals(new Lineup(2, List.of()), lineups.save(player.authorization(), save(1)));
    }
    @Test void malformedUnownedAndDuplicateSlotsNeverReplaceExistingLineup() {
        var owner = player(); var other = player(); String a = seedHero(owner), b = seedHero(owner), foreign = seedHero(other);
        lineups.save(owner.authorization(), save(0, new Lineup.Slot(2,a)));
        invalid(owner, save(1, new Lineup.Slot(3,foreign)));
        invalid(owner, save(1, new Lineup.Slot(3,UUID.randomUUID().toString())));
        invalid(owner, save(1, new Lineup.Slot(2,a), new Lineup.Slot(2,b)));
        invalid(owner, save(1, new Lineup.Slot(2,a), new Lineup.Slot(3,a)));
        invalid(owner, save(1, new Lineup.Slot(1,a)));
        invalid(owner, save(1, new Lineup.Slot(4,a)));
        invalid(owner, save(1, new Lineup.Slot(null,a)));
        invalid(owner, save(1, new Lineup.Slot(2,"bad-id")));
        invalid(owner, save(1, (Lineup.Slot)null));
        invalid(owner, new Lineup.Save(null, List.of()));
        invalid(owner, new Lineup.Save(1L, null));
        assertTrue(lineups.current(other.authorization()).slots().isEmpty());
    }
    @Test void staleVersionAndMissingIdentityAreRejected() {
        var player = player(); String id = seedHero(player);
        var saved = lineups.save(player.authorization(), save(0, new Lineup.Slot(2,id)));
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> lineups.save(player.authorization(), save(0))).getStatusCode().value());
        assertEquals(saved, lineups.current(player.authorization()));
        assertEquals(401, assertThrows(ResponseStatusException.class, () -> lineups.save(null, save(0))).getStatusCode().value());
    }
    @Test void concurrentSavesWithSameVersionHaveOneWinner() throws Exception {
        var player = player(); String a = seedHero(player), b = seedHero(player);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var jobs = new ArrayList<Future<Integer>>();
            for (String id : List.of(a,b)) jobs.add(executor.submit(() -> {
                start.await();
                try { lineups.save(player.authorization(), save(0, new Lineup.Slot(2,id))); return 200; }
                catch (ResponseStatusException error) { return error.getStatusCode().value(); }
            }));
            start.countDown();
            var outcomes = new ArrayList<Integer>();
            for (var job : jobs) outcomes.add(job.get(10, TimeUnit.SECONDS));
            Collections.sort(outcomes); assertEquals(List.of(200,409), outcomes);
        }
        var saved = lineups.current(player.authorization());
        assertEquals(1,saved.version()); assertEquals(1,saved.slots().size());
    }
    private HttpResponse<String> request(String method, String path, String auth, String json) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
        if (auth != null) builder.header("Authorization", auth);
        if (json != null) builder.header("Content-Type","application/json");
        return http.send(builder.method(method, json == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json)).build(), HttpResponse.BodyHandlers.ofString());
    }
    @Test void realHttpContractAndCreatorPutPreflight() throws Exception {
        var player = player(); String id = seedHero(player);
        assertEquals(200, request("GET","/api/v1/heroes",player.authorization(),null).statusCode());
        assertEquals(401, request("GET","/api/v1/heroes",null,null).statusCode());
        String body = "{\"expectedVersion\":0,\"slots\":[{\"position\":2,\"heroId\":\""+id+"\"}]}";
        var saved = request("PUT","/api/v1/lineups/main",player.authorization(),body);
        assertEquals(200,saved.statusCode()); assertEquals(1,((Number)JsonPath.read(saved.body(),"$.version")).intValue());
        assertEquals(409,request("PUT","/api/v1/lineups/main",player.authorization(),body).statusCode());
        assertEquals(400,request("PUT","/api/v1/lineups/main",player.authorization(),body.replace("\"position\":2","\"position\":2.5")).statusCode());
        assertEquals(400,request("PUT","/api/v1/lineups/main",player.authorization(),body.replace("\"position\":2","\"position\":\"2\"")).statusCode());
        var preflight = HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/lineups/main"))
            .header("Origin","http://localhost:7456").header("Access-Control-Request-Method","PUT")
            .header("Access-Control-Request-Headers","authorization,content-type").method("OPTIONS",HttpRequest.BodyPublishers.noBody()).build();
        assertEquals(200,http.send(preflight,HttpResponse.BodyHandlers.ofString()).statusCode());
    }
    @Test void migrationFromExistingV1PreservesRolesAndSessions() {
        String url = "jdbc:h2:mem:upgrade_" + UUID.randomUUID() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        org.flywaydb.core.Flyway.configure().dataSource(url,"sa","").target("1").load().migrate();
        var legacy = new JdbcTemplate(new org.springframework.jdbc.datasource.DriverManagerDataSource(url,"sa",""));
        String id = UUID.randomUUID().toString();
        legacy.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds) VALUES (?,?,?,7,123,45)",id,"existing_player","Existing");
        legacy.update("INSERT INTO game_session(token_hash,role_id,expires_at) VALUES (?,?,TIMESTAMP '2099-01-01 00:00:00')","a".repeat(64),id);
        org.flywaydb.core.Flyway.configure().dataSource(url,"sa","").load().migrate();
        assertEquals(123L,legacy.queryForObject("SELECT gold FROM game_role WHERE id = ?",Long.class,id));
        assertEquals(0L,legacy.queryForObject("SELECT lineup_version FROM game_role WHERE id = ?",Long.class,id));
        assertEquals(1,legacy.queryForObject("SELECT COUNT(*) FROM game_session WHERE role_id = ?",Integer.class,id));
        assertEquals(0,legacy.queryForObject("SELECT COUNT(*) FROM game_hero",Integer.class));
    }
}
