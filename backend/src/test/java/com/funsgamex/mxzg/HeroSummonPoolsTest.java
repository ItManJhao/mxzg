/**
 * 多池召唤走真实独立内存库，验证消耗、保底、发奖与回执处于同一事务。
 * 仅设置场景所需的资产和资格，所有扣除及新增英雄均调用生产服务。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroSummonRules;
import com.funsgamex.mxzg.hero.HeroSummonRules.Advanced;
import com.funsgamex.mxzg.hero.HeroSummonRules.Pool;
import com.funsgamex.mxzg.hero.HeroSummonService;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import java.util.UUID;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:hero_first_summon;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class HeroSummonPoolsTest {
    /** 在隔离内存库创建真实的新角色。 */
    @Autowired private DevelopmentLoginService login;
    /** 为抽取执行真实扣费和发奖，重发读取原持久回执。 */
    @Autowired private HeroSummonService summons;
    /** 使用真实配置，固定随机落点验证保底优先顺序。 */
    @Autowired private HeroSummonRules rules;
    /** 以正常登录恢复的快照复核完整角色状态。 */
    @Autowired private SessionSnapshotService snapshots;
    /** 设置必要的余额和资格，并检查实际持久记录。 */
    @Autowired private JdbcTemplate jdbc;

    /** 单一测试用户的真实角色标识与会话凭证。 */
    private record Player(String role, String token) {}

    /** 普通十连独立于免费单抽，友情两种动作扣不同数量、重发和改参不会重复发奖。 */
    @Test
    void normalTenAndFriendshipUseTheirOwnBalances() {
        var player = player();
        stock(player, 900201, 10);
        stock(player, 900301, 1100);

        String requestId = UUID.randomUUID().toString();
        var normal = summons.draw(player.token(), requestId, Pool.NORMAL, 10, 0);
        assertFalse(normal.state().firstNormalCompleted());
        assertEquals(10, normal.actual().heroes().size());
        assertEquals(0, quantity(player, 900201));
        assertEquals(10, quantity(player, 900302));
        assertEquals(normal, summons.draw(player.token(), requestId, Pool.NORMAL, 10, 0));
        assertEquals("SUMMON_REQUEST_CONFLICT", assertThrows(HeroSummonService.Rejected.class,
                () -> summons.draw(player.token(), requestId, Pool.FRIENDSHIP, 10, 0)).code());

        var free = summons.draw(player.token(), UUID.randomUUID().toString(), Pool.NORMAL, 1, 0);
        assertTrue(free.state().firstNormalCompleted());
        assertEquals(10304012, free.actual().heroes().getFirst().templateId());
        var friend = summons.draw(player.token(), UUID.randomUUID().toString(), Pool.FRIENDSHIP, 1, 0);
        assertEquals(1, friend.actual().heroes().size());
        assertEquals(1000, quantity(player, 900301));
        var friends = summons.draw(player.token(), UUID.randomUUID().toString(), Pool.FRIENDSHIP, 10, 0);
        assertEquals(10, friends.actual().heroes().size());
        assertEquals(0, quantity(player, 900301));
        assertEquals(33, quantity(player, 900302));
        assertEquals("SUMMON_FRIENDSHIP_INSUFFICIENT", assertThrows(HeroSummonService.Rejected.class,
                () -> summons.draw(player.token(), UUID.randomUUID().toString(), Pool.FRIENDSHIP, 1, 0)).code());
        assertEquals(22, snapshots.snapshot(player.token()).heroes().size());
    }

    /** 核对高级首两单抽与首十连、混合扣费、确认金额、祈愿上限及原回执重发。 */
    @Test
    void advancedPreservesFreeAndMixedPayment() {
        var player = player();
        jdbc.update("UPDATE game_role SET diamonds=2000 WHERE id=?", player.role());
        stock(player, 900303, 29);

        var free = summons.draw(player.token(), UUID.randomUUID().toString(), Pool.ADVANCED, 1, 0);
        assertEquals(10205020, free.actual().heroes().getFirst().templateId());
        assertTrue(free.state().advancedFreeAtSeconds() > 0);
        assertEquals(2000, diamonds(player));
        assertEquals(30, quantity(player, 900303));

        String single = UUID.randomUUID().toString();
        assertEquals("SUMMON_DIAMOND_CONFIRM_REQUIRED", assertThrows(HeroSummonService.Rejected.class,
                () -> summons.draw(player.token(), single, Pool.ADVANCED, 1, 0)).code());
        var second = summons.draw(player.token(), single, Pool.ADVANCED, 1, 220);
        assertEquals(10105010, second.actual().heroes().getFirst().templateId());
        assertEquals(1780, diamonds(player));
        assertEquals(second, summons.draw(player.token(), single, Pool.ADVANCED, 1, 220));
        assertEquals("SUMMON_REQUEST_CONFLICT", assertThrows(HeroSummonService.Rejected.class,
                () -> summons.draw(player.token(), single, Pool.ADVANCED, 1, 221)).code());

        stock(player, 900202, 3);
        String ten = UUID.randomUUID().toString();
        assertEquals("SUMMON_DIAMOND_CONFIRM_REQUIRED", assertThrows(HeroSummonService.Rejected.class,
                () -> summons.draw(player.token(), ten, Pool.ADVANCED, 10, 1385)).code());
        var result = summons.draw(player.token(), ten, Pool.ADVANCED, 10, 1386);
        assertEquals(10, result.actual().heroes().size());
        assertEquals(5, result.actual().heroes().getFirst().star());
        assertEquals(394, diamonds(player));
        assertEquals(0, quantity(player, 900202));
        assertEquals(30, quantity(player, 900303));
        assertEquals(240, quantity(player, 900302));
        assertEquals(free.state().advancedFreeAtSeconds(), result.state().advancedFreeAtSeconds());
    }

    /** 回执写入失败会一起回滚扣钻、英雄、积分、祈愿道具和高级进度。 */
    @Test
    void advancedRollsBackWhenReceiptFails() {
        var player = player();
        snapshots.snapshot(player.token());
        jdbc.update("UPDATE game_role SET diamonds=220 WHERE id=?", player.role());
        var free = summons.draw(player.token(), UUID.randomUUID().toString(), Pool.ADVANCED, 1, 0);
        String second = UUID.randomUUID().toString();
        jdbc.execute("ALTER TABLE game_hero_summon_receipt ADD CONSTRAINT ck_summon_draw_rollback "
                + "CHECK (request_id <> '" + second + "')");
        try {
            assertThrows(DataIntegrityViolationException.class,
                    () -> summons.draw(player.token(), second, Pool.ADVANCED, 1, 220));
        } finally {
            jdbc.execute("ALTER TABLE game_hero_summon_receipt DROP CONSTRAINT ck_summon_draw_rollback");
        }
        assertEquals(220, diamonds(player));
        assertEquals(20, quantity(player, 900302));
        assertEquals(1, quantity(player, 900303));
        assertEquals(1, snapshots.snapshot(player.token()).heroes().size());
        var recovered = summons.draw(player.token(), second, Pool.ADVANCED, 1, 220);
        assertEquals(free.assetRevision() + 1, recovered.assetRevision());
        assertEquals(10105010, recovered.actual().heroes().getFirst().templateId());
    }

    /** 累计充值不足不可兑换，真实达标后按神职折扣扣积分并发放五星。 */
    @Test
    void pointsRequireRechargeAndRespectClergyDiscount() {
        var player = player();
        stock(player, 900302, 800);
        jdbc.update("UPDATE game_role SET diamonds=200000 WHERE id=?", player.role());
        var initial = snapshots.snapshot(player.token()).heroSummon();
        assertFalse(initial.pointsExchangeAvailable());
        assertEquals(200000L, initial.pointRechargeRequired());
        assertEquals(1000, initial.pointsCost());
        String requestId = UUID.randomUUID().toString();
        assertEquals("SUMMON_POINTS_RECHARGE_REQUIRED", assertThrows(HeroSummonService.Rejected.class,
                () -> summons.draw(player.token(), requestId, Pool.POINTS, 1, 0)).code());
        jdbc.update("UPDATE game_role SET total_recharge=200000 WHERE id=?", player.role());
        assertEquals("SUMMON_POINTS_INSUFFICIENT", assertThrows(HeroSummonService.Rejected.class,
                () -> summons.draw(player.token(), requestId, Pool.POINTS, 1, 0)).code());
        jdbc.update("UPDATE game_role SET clergy_level=7 WHERE id=?", player.role());
        var receipt = summons.draw(player.token(), requestId, Pool.POINTS, 1, 0);
        assertTrue(receipt.state().pointsExchangeAvailable());
        assertEquals(800, receipt.state().pointsCost());
        assertEquals(5, receipt.actual().heroes().getFirst().star());
        assertEquals(0, quantity(player, 900302));
        assertEquals(200000, diamonds(player));
    }

    /** 固定落点同时验证第百抽优先、十次未中五星重置和四星上限。 */
    @Test
    void advancedGuaranteesPreserveTheirOwnCounters() {
        var random = mock(RandomGenerator.class);
        var hundredth = rules.advanced(new Advanced(1, 2, 1, 99, 9, 2, 9), 1, random);
        assertEquals(10105007, hundredth.heroes().getFirst());
        assertEquals(new Advanced(1, 2, 1, 100, 9, 2, 9), hundredth.progress());

        var consecutive = rules.advanced(hundredth.progress(), 1, random);
        assertEquals(10105007, consecutive.heroes().getFirst());
        assertEquals(new Advanced(1, 2, 1, 101, 0, 3, 0), consecutive.progress());

        var fourth = rules.advanced(new Advanced(1, 2, 1, 101, 0, 10, 0), 1, random);
        assertEquals(new Advanced(1, 2, 1, 102, 1, 0, 1), fourth.progress());
    }

    /** 创建没有英雄及抽取历史的新测试角色。 */
    private Player player() {
        var result = login.login("summon_pool_" + UUID.randomUUID().toString().substring(0, 16));
        return new Player(result.role().id(), "Bearer " + result.session().accessToken());
    }

    /** 单次写入一个原有可堆叠配置的测试余额。 */
    private void stock(Player player, int itemId, long quantity) {
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,?,?,?)",
                player.role(), itemId, quantity, UUID.randomUUID().toString());
    }

    /** 读取真实的库存余额，缺少记录即没有余额。 */
    private long quantity(Player player, int itemId) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(quantity),0) FROM game_inventory WHERE role_id=? AND item_id=?",
                Long.class, player.role(), itemId);
    }

    /** 返回角色的持久钻石钱包余额。 */
    private long diamonds(Player player) {
        return jdbc.queryForObject("SELECT diamonds FROM game_role WHERE id=?", Long.class, player.role());
    }
}
