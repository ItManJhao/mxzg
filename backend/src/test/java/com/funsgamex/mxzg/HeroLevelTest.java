/** 普通升级快速回归，只使用专用 H2 内存库与合成账号，覆盖真实业务事务和正常首胜奖励来源。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.CampaignService;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.sql.Timestamp;
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

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:hero_level;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "spring.datasource.username=sa", "spring.datasource.password="})
@ActiveProfiles("local")
class HeroLevelTest {
    @Autowired DevelopmentLoginService login;
    @Autowired CampaignService campaign;
    @Autowired HeroRepository heroes;
    @Autowired HeroLevelService levels;
    @Autowired HeroGrowthRules rules;
    @Autowired RoleRepository roles;
    @Autowired InventoryService inventory;
    @Autowired JdbcTemplate jdbc;
    private record Player(String token, String role, String hero) {}

    /** 新建本测试内存库中的随机账号，按正常入口初始化；可选领取正常首胜奖励。 */
    private Player player(boolean reward) {
        var account = login.login("lv_" + UUID.randomUUID().toString().substring(0,15),"local-1");
        String token="Bearer "+account.session().accessToken(); campaign.initialize(token);
        if (reward) { var battle=campaign.challenge(token,UUID.randomUUID().toString()); assertTrue(battle.won()); campaign.claim(token,battle.id()); }
        String hero=heroes.list(account.role().id()).stream().filter(row->row.templateId()==10101001).findFirst().orElseThrow().id();
        return new Player(token,account.role().id(),hero);
    }

    /** 构造固定升一级的独立逻辑请求。 */
    private HeroLevelService.Request request(int level) { return new HeroLevelService.Request(UUID.randomUUID().toString(),level); }

    /** 校验可处理错误码，不把不同业务失败合并成笼统失败。 */
    private void rejected(String code, Runnable action) { assertEquals(code,assertThrows(ResponseStatusException.class,action::run).getReason()); }

    /** 正常首胜→升级→再战斗使用同一属性；核对当前行消耗，重复请求只扣一次且返回最新状态。 */
    @Test void realRewardsUpgradeAndBattle() {
        var p=player(true); var before=levels.preview(p.token(),p.hero());
        assertEquals(new HeroGrowthRules.Cost(53,12),before.cost());
        assertEquals(new HeroGrowthRules.Stats(238,56,24,45),before.current());
        assertEquals(new HeroGrowthRules.Stats(253,59,25,46),before.next());
        var request=request(1); var result=levels.upgrade(p.token(),p.hero(),request);
        assertEquals(2,result.preview().hero().level()); assertEquals(3947,result.role().gold()); assertEquals(538,result.preview().experience());
        assertEquals(result,levels.upgrade(p.token(),p.hero(),request));
        var next=levels.upgrade(p.token(),p.hero(),request(2));
        var replay=levels.upgrade(p.token(),p.hero(),request);
        assertEquals(2,replay.operation().toLevel()); assertEquals(3,replay.preview().hero().level()); assertEquals(next.role(),replay.role());
        var battle=campaign.challenge(p.token(),UUID.randomUUID().toString());
        var unit=battle.units().stream().filter(row->row.id().equals(p.hero())).findFirst().orElseThrow();
        assertEquals(3,unit.level()); assertEquals(next.preview().current().hp(),unit.maxHp()); assertEquals(next.preview().current().atk(),unit.attack());
    }

    /** 两种资产不足分别拒绝；无消耗和无等级变化，其他资源不抵扣英雄经验。 */
    @Test void eachResourceShortage() {
        var p=player(false); rejected("INSUFFICIENT_GOLD",()->levels.upgrade(p.token(),p.hero(),request(1)));
        jdbc.update("UPDATE game_role SET gold=100 WHERE id=?",p.role());
        jdbc.update("UPDATE game_inventory SET quantity=11 WHERE role_id=? AND item_id=900101",p.role());
        rejected("INSUFFICIENT_HERO_EXP",()->levels.upgrade(p.token(),p.hero(),request(1)));
        assertEquals(100,roles.findById(p.role()).orElseThrow().gold()); assertEquals(1,heroes.find(p.role(),p.hero()).orElseThrow().level());
    }

    /** 初始 0 阶停在 30，不能因为星级上限 40 就跳过突破；无配置也不能免费升级。 */
    @Test void stageLimitAndMissingConfiguration() {
        var p=player(true); jdbc.update("UPDATE game_hero SET hero_level=30 WHERE id=?",p.hero());
        assertEquals(30,levels.preview(p.token(),p.hero()).levelLimit());
        rejected("LEVEL_LIMIT",()->levels.upgrade(p.token(),p.hero(),request(30)));
        assertThrows(IllegalStateException.class,()->rules.cost(401));
        assertThrows(IllegalStateException.class,()->rules.stats(99999999,1,1,0));
        assertEquals(40,rules.limit(140,6,1));
    }

    /** 归属、会话、过期、预期等级和同键不同参数均须拒绝。 */
    @Test void ownershipAuthenticationAndRequestConflict() {
        var p=player(true); var other=player(true); var req=request(1);
        rejected("HERO_NOT_FOUND",()->levels.upgrade(p.token(),other.hero(),req));
        assertEquals(401,assertThrows(ResponseStatusException.class,()->levels.preview(null,p.hero())).getStatusCode().value());
        levels.upgrade(p.token(),p.hero(),req);
        rejected("IDEMPOTENCY_CONFLICT",()->levels.upgrade(p.token(),other.hero(),req));
        rejected("IDEMPOTENCY_CONFLICT",()->levels.upgrade(p.token(),p.hero(),new HeroLevelService.Request(req.requestId(),2)));
        rejected("HERO_LEVEL_CHANGED",()->levels.upgrade(p.token(),p.hero(),request(1)));
        jdbc.update("UPDATE game_session SET expires_at=? WHERE role_id=?",Timestamp.from(Instant.now().minusSeconds(2)),p.role());
        assertEquals(401,assertThrows(ResponseStatusException.class,()->levels.upgrade(p.token(),p.hero(),request(2))).getStatusCode().value());
    }

    /** 在收据落库时触发专用库约束失败，证明已扣金币/经验和已提升等级全部回滚。 */
    @Test void midTransactionFailureRollsBack() {
        var p=player(true); var before=levels.preview(p.token(),p.hero()); var items=inventory.list(p.role());
        jdbc.execute("ALTER TABLE game_hero_level_request ADD CONSTRAINT test_upgrade_failure CHECK (hero_id <> '"+p.hero()+"')");
        try { assertThrows(RuntimeException.class,()->levels.upgrade(p.token(),p.hero(),request(1))); }
        finally { jdbc.execute("ALTER TABLE game_hero_level_request DROP CONSTRAINT test_upgrade_failure"); }
        assertEquals(before,levels.preview(p.token(),p.hero())); assertEquals(items,inventory.list(p.role()));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_hero_level_request WHERE role_id=?",Integer.class,p.role()));
    }
}
