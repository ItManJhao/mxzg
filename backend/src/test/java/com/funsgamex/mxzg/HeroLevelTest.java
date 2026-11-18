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

    /** 正常首胜→升级→再战斗使用同一属性；重复请求保留原回执，当前状态独立查询。 */
    @Test void realRewardsUpgradeAndBattle() {
        var p=player(true); var before=levels.preview(p.token(),p.hero());
        assertEquals(new HeroGrowthRules.Cost(53,12),before.cost());
        assertEquals(new HeroGrowthRules.Stats(238,56,24,45),before.current());
        assertEquals(new HeroGrowthRules.Stats(253,59,25,46),before.next());
        long revision = roles.revision(p.role());
        var request = request(1);
        var result = levels.upgrade(p.token(), p.hero(), request);
        var upgraded = levels.preview(p.token(), p.hero());
        assertEquals(2, result.toLevel());
        assertEquals(2, upgraded.hero().level());
        assertEquals(3947, upgraded.gold());
        assertEquals(538, upgraded.experience());
        assertEquals(revision + 1, result.assetRevision());
        assertEquals(p.role(), result.roleId());
        assertEquals(result, levels.upgrade(p.token(), p.hero(), request));
        var next = levels.upgrade(p.token(), p.hero(), request(2));
        assertEquals(revision + 2, next.assetRevision());
        assertEquals(result, levels.upgrade(p.token(), p.hero(), request));
        assertEquals(result, levels.status(p.token(), request.requestId()).receipt());
        var latest = levels.preview(p.token(), p.hero());
        assertEquals(3, latest.hero().level());
        var battle=campaign.challenge(p.token(),UUID.randomUUID().toString());
        var unit=battle.units().stream().filter(row->row.id().equals(p.hero())).findFirst().orElseThrow();
        assertEquals(3, unit.level());
        assertEquals(latest.current().hp(), unit.maxHp());
        assertEquals(latest.current().atk(), unit.attack());
    }

    /** 并发重复原批量只扣逐级合计一次；越单笔上限、越阶及改动原级数均拒绝。 */
    @Test void concurrentBatchChargesPerLevelOnlyOnce() throws Exception {
        var p = player(true);
        var before = levels.preview(p.token(), p.hero());
        long revision = roles.revision(p.role());
        int count = rules.levelJumpMax();
        var request = new HeroLevelService.Request(UUID.randomUUID().toString(), 1, count);
        rejected("INVALID_UPGRADE_REQUEST", () -> levels.upgrade(p.token(), p.hero(),
                new HeroLevelService.Request(UUID.randomUUID().toString(), 1, count + 1)));
        var start = new CountDownLatch(1);
        Callable<HeroLevelService.Receipt> run = () -> {
            assertTrue(start.await(5, TimeUnit.SECONDS));
            return levels.upgrade(p.token(), p.hero(), request);
        };
        try (var executor = Executors.newFixedThreadPool(2)) {
            var left = executor.submit(run);
            var right = executor.submit(run);
            start.countDown();
            var receipt = left.get(5, TimeUnit.SECONDS);
            assertEquals(receipt, right.get(5, TimeUnit.SECONDS));
            assertEquals(1 + count, receipt.toLevel());
            assertEquals(revision + 1, receipt.assetRevision());
        }
        var latest = levels.preview(p.token(), p.hero());
        long gold = 0;
        long experience = 0;
        for (int level = 1; level <= count; level++) {
            gold += rules.cost(level).gold();
            experience += rules.cost(level).experience();
        }
        assertEquals(before.gold() - gold, latest.gold());
        assertEquals(before.experience() - experience, latest.experience());
        rejected("IDEMPOTENCY_CONFLICT", () -> levels.upgrade(p.token(), p.hero(),
                new HeroLevelService.Request(request.requestId(), 1, count - 1)));
        jdbc.update("UPDATE game_hero SET hero_level=29 WHERE id=?", p.hero());
        rejected("LEVEL_LIMIT", () -> levels.upgrade(p.token(), p.hero(),
                new HeroLevelService.Request(UUID.randomUUID().toString(), 29, 2)));
        assertEquals(revision + 1, roles.revision(p.role()));
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
        long revision = roles.revision(p.role());
        jdbc.execute("ALTER TABLE game_hero_level_request ADD CONSTRAINT test_upgrade_failure CHECK (hero_id <> '"+p.hero()+"')");
        try { assertThrows(RuntimeException.class,()->levels.upgrade(p.token(),p.hero(),request(1))); }
        finally { jdbc.execute("ALTER TABLE game_hero_level_request DROP CONSTRAINT test_upgrade_failure"); }
        assertEquals(before,levels.preview(p.token(),p.hero())); assertEquals(items,inventory.list(p.role()));
        assertEquals(revision, roles.revision(p.role()));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_hero_level_request WHERE role_id=?",Integer.class,p.role()));
    }
}
