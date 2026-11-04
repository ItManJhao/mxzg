/** 英雄名册归属、统一快照及保留阵容规则的独立数据库回归。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroQueries;
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
    @Autowired HeroQueries heroes;
    @Autowired com.funsgamex.mxzg.network.SessionSnapshotService snapshots;
    @Autowired LineupService lineups;
    @Autowired com.funsgamex.mxzg.hero.HeroBattleInputService battleInputs;
    @Autowired JdbcTemplate jdbc;
    @LocalServerPort int port;
    private final HttpClient http = HttpClient.newHttpClient();
    private record Player(String account, String roleId, String authorization) {}
    private Player player() {
        String account = "test_" + UUID.randomUUID().toString().substring(0, 12);
        var result = login.login(account);
        return new Player(account, result.role().id(), "Bearer " + result.session().accessToken());
    }
    /** 阵容输入与名册共用持久进化/技能；保留暴击而不将四维展示值反当基础再加一次。 */
    @Test void battleInputSharesRulesAndOwnership(){
        var owner=player();var other=player();String id=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage,evolve_type,evolve_level) VALUES (?,?,10105008,1,5,0,1,2)",id,owner.roleId());
        assertTrue(battleInputs.current(owner.authorization()).units().isEmpty());
        lineups.save(owner.authorization(),save(0,new Lineup.Slot(2,id)));
        var result=battleInputs.current(owner.authorization());var unit=result.units().getFirst();
        assertEquals(1,result.lineupVersion());assertEquals(2,unit.position());assertEquals(id,unit.hero().id());
        assertEquals(300L,unit.attributes().get(207));assertEquals(300L,unit.attributes().get(201));
        assertEquals(unit.hero().baseStats().atk()+7500,unit.attributes().get(220));
        assertEquals((long)(unit.attributes().get(220)*1.03),unit.hero().panelStats().values().atk());
        assertTrue(unit.skills().contains(new com.funsgamex.mxzg.hero.HeroEvolutionRules.Skill(101050081,5)));
        assertTrue(unit.skills().stream().anyMatch(skill->skill.level()==0),"普攻必须保留");
        assertEquals(2,unit.skills().size(),"未解锁被动不能加入战斗输入");
        assertFalse(result.pending().isEmpty());assertTrue(battleInputs.current(other.authorization()).units().isEmpty());
        assertThrows(UnsupportedOperationException.class,()->unit.attributes().put(220,1L));
        assertThrows(UnsupportedOperationException.class,()->unit.skills().clear());
        assertEquals(result,battleInputs.current(owner.authorization()));
    }
    /** 进化状态来自持久记录，统一快照与协议保留技能覆盖和属性；不提供进化写协议。 */
    @Test void evolutionPersistsAndSynchronizes() throws Exception {
        var owner=player();var other=player();String id=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105008,1,5,0)",id,owner.roleId());
        var original=snapshots.snapshot(owner.authorization()).heroes().getFirst();
        assertEquals(0,original.evolution().type());assertNull(original.evolution().skill());
        jdbc.update("UPDATE game_hero SET evolve_type=1,evolve_level=2 WHERE id=?",id);
        var evolved=snapshots.snapshot(owner.authorization()).heroes().getFirst();
        assertEquals(2,evolved.evolution().level());assertEquals(101050081,evolved.evolution().skill().skillId());assertEquals(5,evolved.evolution().skill().level());
        assertEquals((long)((original.panelStats().values().atk()+7500)*1.03),evolved.panelStats().values().atk());
        assertEquals((long)((original.panelStats().values().hp()+45000)*1.03),evolved.panelStats().values().hp());
        assertTrue(evolved.panelStats().includedSources().contains("evolution"));assertFalse(evolved.panelStats().complete());
        assertEquals(evolved,snapshots.snapshot(owner.authorization()).heroes().getFirst());
        assertTrue(snapshots.snapshot(other.authorization()).heroes().isEmpty());
        var bytes=com.funsgamex.mxzg.network.GameProtocolCodec.encode(Map.of("version",1,"kind","event","name","state.changed","body",snapshots.snapshot(owner.authorization())));
        var decoded=com.funsgamex.mxzg.network.GameProtocolCodec.decode(bytes).path("body").path("heroes").get(0).path("evolution");
        assertEquals(2,decoded.path("level").asInt());assertEquals(5,decoded.path("skill").path("level").asInt());
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE game_hero SET evolve_level=0 WHERE id=?",id));
        jdbc.update("UPDATE game_hero SET evolve_level=999 WHERE id=?",id);
        assertThrows(IllegalArgumentException.class,()->snapshots.snapshot(owner.authorization()));
    }
    /** 登录/恢复完整快照必须读取本角色持久名册，不返回暂停占位空数组或其他角色英雄。 */
    @Test void unifiedSnapshotContainsOnlyOwnedHeroes() {
        var owner=player(); var other=player();
        String first=seedHero(owner),second=seedHero(owner);seedHero(other);
        jdbc.update("UPDATE game_hero SET is_locked=TRUE WHERE id=?", first);
        lineups.save(owner.authorization(),save(0,new Lineup.Slot(2,first)));
        var snapshot=snapshots.snapshot(owner.authorization());
        var selected=snapshot.heroes().stream().filter(hero->hero.id().equals(first)).findFirst().orElseThrow();
        assertTrue(selected.locked());assertTrue(selected.deployed());
        assertEquals(0,selected.stage());assertNotNull(selected.baseStats());assertTrue(selected.baseStats().hp()>0);
        var reserve=snapshot.heroes().stream().filter(hero->hero.id().equals(second)).findFirst().orElseThrow();
        assertFalse(reserve.locked());assertFalse(reserve.deployed());
        assertEquals(Set.of(first,second),snapshot.heroes().stream().map(hero->hero.id()).collect(java.util.stream.Collectors.toSet()));
        assertEquals(snapshot.heroes(),snapshots.snapshot(owner.authorization()).heroes());
        assertEquals(owner.roleId(),snapshot.role().id());
        assertEquals(300,snapshot.heroRoster().capacity());
        assertEquals(0,snapshot.heroRoster().buySpaceTimes());
        jdbc.update("UPDATE game_role SET hero_capacity=301,hero_capacity_buys=1,goddess_vip=1 WHERE id=?",owner.roleId());
        var expanded=snapshots.snapshot(owner.authorization()).heroRoster();
        assertEquals(326,expanded.capacity());assertEquals(1,expanded.buySpaceTimes());
        assertEquals(300,snapshots.snapshot(other.authorization()).heroRoster().capacity());
    }
    /** 持久四槽进入统一快照并经 Protobuf 保留长 ID；空槽与他人装备严格区分。 */
    @Test void equipmentPersistsInUnifiedSnapshot() throws Exception {
        var owner=player();var other=player();String first=seedHero(owner),second=seedHero(owner),foreign=seedHero(other);
        String id="9223372036854775801";
        jdbc.update("INSERT INTO game_equipment(id,role_id,template_id,slot,soul_level,hero_id) VALUES (?,?,1001001,1,3,?)",id,owner.roleId(),first);
        jdbc.update("INSERT INTO game_equipment(id,role_id,template_id,slot,soul_level,hero_id) VALUES (?,?,1002001,2,0,?)",UUID.randomUUID().toString(),other.roleId(),foreign);
        var snapshot=snapshots.snapshot(owner.authorization());
        var hero=snapshot.heroes().stream().filter(row->row.id().equals(first)).findFirst().orElseThrow();
        assertEquals(id,hero.equipment().items().getFirst().instanceId());
        assertEquals(3,hero.equipment().items().getFirst().soulLevel());assertNull(hero.equipment().items().getFirst().soulSkill(),"旧999星门槛不因有附魂等级而跳过");
        assertEquals(hero.baseStats().atk()+33,hero.panelStats().values().atk());assertFalse(hero.panelStats().complete());
        assertTrue(snapshot.heroes().stream().filter(row->row.id().equals(second)).findFirst().orElseThrow().equipment().items().isEmpty());
        assertEquals(hero.equipment(),snapshots.snapshot(owner.authorization()).heroes().stream().filter(row->row.id().equals(first)).findFirst().orElseThrow().equipment());
        var wire=com.funsgamex.mxzg.network.GameProtocolCodec.encode(Map.of("version",1,"kind","event","name","state.changed","body",snapshot));
        var decoded=com.funsgamex.mxzg.network.GameProtocolCodec.decode(wire).path("body").path("heroes");
        boolean found=false;for(var row:decoded)if(row.path("id").asString().equals(first)){assertEquals(id,row.path("equipment").path("items").get(0).path("instanceId").asString());found=true;}
        assertTrue(found);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("INSERT INTO game_equipment(id,role_id,template_id,slot,soul_level,hero_id) VALUES (?,?,1001001,1,0,?)",UUID.randomUUID().toString(),owner.roleId(),first));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("INSERT INTO game_equipment(id,role_id,template_id,slot,soul_level,hero_id) VALUES (?,?,1001001,1,0,?)",UUID.randomUUID().toString(),owner.roleId(),foreign));
        jdbc.update("DELETE FROM game_equipment WHERE id=?",id);
        var cleared=snapshots.snapshot(owner.authorization()).heroes().stream().filter(row->row.id().equals(first)).findFirst().orElseThrow();
        assertTrue(cleared.equipment().items().isEmpty());assertEquals(cleared.baseStats().atk(),cleared.panelStats().values().atk());
    }
    /** 统一快照包含真实技能面板加成；刷新后仍从持久星级/强化读取，客户端不补算。 */
    @Test void skillPanelIsIncludedInSnapshot(){
        var p=player();String id=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10103003,30,3,1)",id,p.roleId());
        var first=snapshots.snapshot(p.authorization()).heroes().getFirst();
        assertEquals((long)(first.baseStats().hp()*1.1),first.panelStats().values().hp());assertEquals((long)(first.baseStats().def()*1.16),first.panelStats().values().def());
        assertTrue(first.panelStats().includedSources().contains("skill_panel"));assertFalse(first.panelStats().pendingSources().contains("skill_panel"));assertEquals(first.panelStats(),snapshots.snapshot(p.authorization()).heroes().getFirst().panelStats());
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
    /** 阵容与英雄旧路由已退役，后续仅保留领域规则测试。 */
    @Test void retiredHeroAndLineupHttpCannotBeCalled() throws Exception {
        assertEquals(404,request("GET","/api/v1/heroes",null,null).statusCode());
        assertEquals(404,request("PUT","/api/v1/lineups/main",null,"{}").statusCode());
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
