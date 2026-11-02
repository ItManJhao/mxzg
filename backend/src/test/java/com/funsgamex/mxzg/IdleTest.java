/** 普通挂机回归：独立 H2 合成时间验证计时边界、真实事务、持久收据、并发与随机保底，不修改玩家库。 */
package com.funsgamex.mxzg;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.*;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:idle;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password="})
@ActiveProfiles("local")
class IdleTest {
    @Autowired IdleService idle;
    @Autowired IdleRules rules;
    @Autowired CampaignService campaign;
    @Autowired DevelopmentLoginService login;
    @Autowired JdbcTemplate jdbc;
    @Autowired RoleRepository roles;
    @Autowired InventoryService inventory;
    private record Player(String account,String role,String token) {}
    /** 使用正常入口建立本测试独立角色；不修改服务端时钟。 */
    private Player player() {
        String account="idle_"+UUID.randomUUID().toString().substring(0,12);
        var result=login.login(account,"local-1");String token="Bearer "+result.session().accessToken();campaign.initialize(token);
        return new Player(account,result.role().id(),token);
    }
    /** 生成新的单次领取标识。 */
    private IdleService.Request request(long revision) { return new IdleService.Request(UUID.randomUUID().toString(),revision); }
    /** 仅改测试库计时夹具，避免真实等待六小时。 */
    private void elapsed(Player p,int seconds) { jdbc.update("UPDATE game_idle SET started_at=? WHERE role_id=?",Instant.now().getEpochSecond()-seconds,p.role()); }
    /** 检查失败业务码。 */
    private void rejected(String code,Runnable work) { assertEquals(code,assertThrows(ResponseStatusException.class,work::run).getReason()); }

    /** 初始一分钟可领；同请求重放奖励固定，最新资产不被旧收据覆盖，重登与初始化不重置计时。 */
    @Test void claimReplayAndRelogin() {
        var p=player();var state=idle.current(p.token());assertTrue(state.claimable());assertEquals(1,state.rewardStage());
        var req=request(state.revision());var result=idle.claim(p.token(),req);
        assertEquals(200,result.role().gold());assertEquals(1,result.state().revision());assertEquals(10,result.roleExperience());
        var replay=idle.claim(p.token(),req);assertEquals(result.receipt(),replay.receipt());assertEquals(result.inventory(),replay.inventory());
        jdbc.update("UPDATE game_role SET gold=gold+1 WHERE id=?",p.role());assertEquals(201,idle.claim(p.token(),req).role().gold());
        var again=login.login(p.account(),"local-1");campaign.initialize("Bearer "+again.session().accessToken());
        assertEquals(result.state().startedAt(),idle.current("Bearer "+again.session().accessToken()).startedAt());
        assertEquals(result.receipt(),idle.claim("Bearer "+again.session().accessToken(),req).receipt());
        rejected("IDEMPOTENCY_CONFLICT",()->idle.claim(p.token(),new IdleService.Request(req.requestId(),1L)));
    }
    /** 未来时间和不足一分钟拒绝；超过六小时只发六小时，不保留溢出或尾数。 */
    @Test void clockBoundariesAndCap() {
        var p=player();elapsed(p,-100);assertEquals(0,idle.current(p.token()).elapsedSeconds());
        rejected("IDLE_NOT_READY",()->idle.claim(p.token(),request(0)));elapsed(p,20);
        rejected("IDLE_NOT_READY",()->idle.claim(p.token(),request(0)));elapsed(p,50000);
        var result=idle.claim(p.token(),request(0));assertEquals(21600,result.receipt().seconds());assertEquals(72000,result.role().gold());
        assertTrue(result.state().elapsedSeconds()<60);assertEquals(3600,result.roleExperience());
    }
    /** 不同请求同时领取同一 revision 只成功一次；同请求并发重放不再次抽奖或发奖。 */
    @Test void concurrentClaims() throws Exception {
        var p=player();var req=request(0);
        try (var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->idle.claim(p.token(),req));var b=pool.submit(()->idle.claim(p.token(),req));
            assertEquals(a.get().receipt(),b.get().receipt());assertEquals(200,roles.findById(p.role()).orElseThrow().gold());
            elapsed(p,60);
            Callable<Integer> work=()->{try {idle.claim(p.token(),request(1));return 200;}catch(ResponseStatusException error){return error.getStatusCode().value();}};
            var results=pool.invokeAll(List.of(work,work));var statuses=new ArrayList<Integer>();for(var r:results)statuses.add(r.get());
            Collections.sort(statuses);assertEquals(List.of(200,409),statuses);
        }
    }
    /** 收据插入故障回滚已经发放的资产、计时和保底；无会话/跨账号不能复用他人收据。 */
    @Test void rollbackAndIsolation() {
        var p=player();var before=idle.current(p.token());var items=inventory.list(p.role());
        jdbc.execute("ALTER TABLE game_idle_receipt ADD CONSTRAINT idle_test_fail CHECK (role_id <> '"+p.role()+"')");
        try {assertThrows(RuntimeException.class,()->idle.claim(p.token(),request(0)));}
        finally {jdbc.execute("ALTER TABLE game_idle_receipt DROP CONSTRAINT idle_test_fail");}
        assertEquals(0,roles.findById(p.role()).orElseThrow().gold());assertEquals(items,inventory.list(p.role()));
        assertEquals(before.startedAt(),idle.current(p.token()).startedAt());assertEquals(0,idle.current(p.token()).revision());
        assertEquals(401,assertThrows(ResponseStatusException.class,()->idle.current(null)).getStatusCode().value());
        var other=player();var req=request(0);var first=idle.claim(p.token(),req);elapsed(other,0);
        rejected("IDLE_NOT_READY",()->idle.claim(other.token(),req));assertEquals(0,roles.findById(other.role()).orElseThrow().gold());
        assertFalse(first.receipt().rewards().isEmpty());
    }
    /** 待领奖的真实胜利取已通关关卡，领奖推进后收益仍取刚通关的关卡。 */
    @Test void stageUsesCompletedBattle() {
        var p=player();var battle=campaign.challenge(p.token(),UUID.randomUUID().toString());assertTrue(battle.won());
        assertEquals(1,idle.current(p.token()).rewardStage());campaign.claim(p.token(),battle.id());
        assertEquals(1,idle.current(p.token()).rewardStage());
        jdbc.update("UPDATE game_campaign SET stage_id=8 WHERE role_id=?",p.role());assertEquals(7,idle.current(p.token()).rewardStage());
        assertEquals(220,idle.current(p.token()).rates().stream().filter(r->r.itemId()==900001).findFirst().orElseThrow().quantity());
    }
    /** 强制概率未中来验证保底；上限阻止后续掉落，跨累计窗口清零；基础和随机次数采用不同取整。 */
    @Test void guaranteeCapRoundingAndReset() {
        var noLuck=new Random(1) { @Override public int nextInt(int bound) { return bound-1; } };
        var triggers=rules.data().triggers().stream().filter(t->t.group()==rules.stage(1).group()).toList();
        var guaranteed=new HashMap<Integer,IdleRules.Counter>();
        for(var t:triggers)guaranteed.put(t.type(),new IdleRules.Counter(0,t.guarantee()-1));
        var roll=rules.roll(1,60,0,guaranteed,noLuck);
        assertTrue(roll.counters().values().stream().allMatch(c->c.quantity()>0 && c.misses()==0));
        var capped=new HashMap<Integer,IdleRules.Counter>();for(var t:triggers)capped.put(t.type(),new IdleRules.Counter(t.maximum(),0));
        assertEquals(3,rules.roll(1,60,0,capped,noLuck).rewards().size());
        var eighty=rules.roll(1,89,0,Map.of(),noLuck);var ninety=rules.roll(1,90,0,Map.of(),noLuck);
        assertEquals(200,ninety.rewards().stream().filter(r->r.itemId()==900001).findFirst().orElseThrow().quantity());
        assertEquals(1,eighty.counters().get(1).misses());assertEquals(2,ninety.counters().get(1).misses());
        var reset=rules.roll(1,120,43140,capped,noLuck);assertEquals(60,reset.dropSeconds());
        // 必掉组仍会产出；概率组才应在重置后的第一次尝试累计一次未中。
        for(var trigger:triggers) {
            var counter=reset.counters().get(trigger.type());
            if(trigger.chance()==1000000)assertTrue(counter.quantity()>0 && counter.misses()==0);
            else {assertEquals(0,counter.quantity());assertEquals(1,counter.misses());}
        }
    }
}
