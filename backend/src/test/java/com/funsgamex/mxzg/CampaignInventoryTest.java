package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.*;
import com.funsgamex.mxzg.inventory.InventoryController;
import com.funsgamex.mxzg.role.RoleService;
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

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=jdbc:h2:mem:campaign_inventory;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa","spring.datasource.password="
})
@ActiveProfiles("local")
class CampaignInventoryTest {
    @Autowired DevelopmentLoginService login;
    @Autowired CampaignService campaign;
    @Autowired InventoryController inventory;
    @Autowired RoleService roles;
    @Autowired JdbcTemplate jdbc;
    @LocalServerPort int port;
    record Player(String account,String role,String token) {}
    Player player() {
        String name="night_"+UUID.randomUUID().toString().substring(0,12);
        var result=login.login(name);
        return new Player(name,result.role().id(),"Bearer "+result.session().accessToken());
    }
    String request() { return UUID.randomUUID().toString(); }
    long count(String table,String role) { return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE role_id=?",Long.class,role); }
    @Test void worldsKeepIndependentRolesAndInventory() {
        var first=player();var second=login.login(first.account(),"local-2");String token="Bearer "+second.session().accessToken();
        assertNotEquals(first.role(),second.role().id());assertEquals("local-2",second.role().serverId());
        campaign.initialize(first.token());
        assertEquals(2,inventory.list(first.token()).size());assertTrue(inventory.list(token).isEmpty());
        assertEquals(first.role(),login.login(first.account(),"local-1").role().id());
        assertEquals(400,assertThrows(ResponseStatusException.class,()->login.login(first.account(),"not-a-server")).getStatusCode().value());
    }
    @Test void starterGrantIsOnceOnlyUnderConcurrentStart() throws Exception {
        var p=player();var pool=Executors.newFixedThreadPool(2);
        try {
            var a=pool.submit(()->campaign.initialize(p.token()));var b=pool.submit(()->campaign.initialize(p.token()));
            assertTrue(a.get().initialized());assertTrue(b.get().initialized());
        } finally { pool.shutdownNow(); }
        assertEquals(3,count("game_hero",p.role()));assertEquals(3,count("game_lineup_slot",p.role()));
        assertEquals(50,jdbc.queryForObject("SELECT quantity FROM game_inventory WHERE role_id=? AND item_id=900101",Long.class,p.role()));
    }
    @Test void battleResumesAndSameRequestDoesNotProduceAnotherBattle() {
        var p=player();campaign.initialize(p.token());String key=request();
        var battle=campaign.challenge(p.token(),key);
        assertEquals(battle,campaign.challenge(p.token(),key));
        assertEquals(battle,campaign.challenge(p.token(),request()));
        assertEquals(battle,campaign.current(p.token()).pending());assertEquals(1,count("game_battle",p.role()));
        assertTrue(battle.won());assertFalse(battle.hits().isEmpty());
        for(var hit:battle.hits()) { assertTrue(hit.damage()>0);assertTrue(hit.remainingHp()>=0); }
    }
    @Test void claimIsOwnedDurableAndIdempotent() {
        var p=player();var other=player();campaign.initialize(p.token());
        var battle=campaign.challenge(p.token(),request());
        assertEquals(404,assertThrows(ResponseStatusException.class,()->campaign.claim(other.token(),battle.id())).getStatusCode().value());
        var result=campaign.claim(p.token(),battle.id());
        assertEquals(4000,result.role().gold());assertEquals(2,result.stageId());assertTrue(result.battle().claimed());
        assertEquals(result,campaign.claim(p.token(),battle.id()));
        var relogin=login.login(p.account());String token="Bearer "+relogin.session().accessToken();
        assertEquals(4000,relogin.role().gold());assertEquals(2,campaign.current(token).stageId());
        assertEquals(result.inventory(),inventory.list(token));assertNull(campaign.current(token).pending());
    }
    @Test void concurrentClaimAwardsOnlyOnce() throws Exception {
        var p=player();campaign.initialize(p.token());var battle=campaign.challenge(p.token(),request());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var a=pool.submit(()->campaign.claim(p.token(),battle.id()));var b=pool.submit(()->campaign.claim(p.token(),battle.id()));
            assertEquals(4000,a.get().role().gold());assertEquals(4000,b.get().role().gold());
        } finally { pool.shutdownNow(); }
        assertEquals(4000,roles.current(p.token()).gold());assertEquals(2,campaign.current(p.token()).stageId());
    }
    @Test void awardFailureRollsBackWalletProgressAndClaimFlag() {
        var p=player();campaign.initialize(p.token());var battle=campaign.challenge(p.token(),request());
        jdbc.update("UPDATE game_inventory SET quantity=? WHERE role_id=? AND item_id=900101",Long.MAX_VALUE,p.role());
        assertThrows(RuntimeException.class,()->campaign.claim(p.token(),battle.id()));
        assertEquals(0,roles.current(p.token()).gold());assertEquals(1,campaign.current(p.token()).stageId());
        assertFalse(campaign.current(p.token()).pending().claimed());
    }
    @Test void incompleteSetupAndBadRequestsDoNotCreateBattles() {
        var p=player();
        assertEquals(401,assertThrows(ResponseStatusException.class,()->campaign.initialize(null)).getStatusCode().value());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->campaign.challenge(p.token(),request())).getStatusCode().value());
        assertEquals(400,assertThrows(ResponseStatusException.class,()->campaign.challenge(p.token(),"bad")).getStatusCode().value());
        campaign.initialize(p.token());jdbc.update("DELETE FROM game_lineup_slot WHERE role_id=?",p.role());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->campaign.challenge(p.token(),request())).getStatusCode().value());
        assertEquals(0,count("game_battle",p.role()));
    }
    @Test void defeatDoesNotCarryRewards() {
        var ally=new CampaignBattle.Unit("a",true,2,10101001,"a",1,1,1,0,1);
        var enemy=new CampaignBattle.Unit("e",false,2,10101001,"e",1,100,100,100,100);
        var result=CampaignBattle.resolve(request(),"test",1,List.of(ally,enemy),List.of(new CampaignRules.Reward(900001,100)));
        assertFalse(result.won());assertTrue(result.rewards().isEmpty());
    }
    @Test void publicServerCatalogAndAuthenticatedCampaignWorkOverHttp() throws Exception {
        var http=HttpClient.newHttpClient();
        var servers=http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/servers")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertEquals(200,servers.statusCode());assertTrue(servers.body().contains("local-2"));
        var p=player();
        var init=http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/campaign/initialize"))
            .header("Authorization",p.token()).POST(HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.ofString());
        assertEquals(200,init.statusCode());assertTrue(init.body().contains("\"initialized\":true"));
        var denied=http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/inventory")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertEquals(401,denied.statusCode());
    }
}
