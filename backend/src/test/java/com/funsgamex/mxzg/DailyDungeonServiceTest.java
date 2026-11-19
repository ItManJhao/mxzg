/**
 * 独立数据库验证金币首关的旧准入、胜负后的次数和扣款、掉线幂等和上海零点轮换。
 * 使用真实战斗与发奖服务，只有测试角色等级、阵容和钱包由隔离夹具准备。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.dungeon.DailyDungeonService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:daily_gold_dungeon;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class DailyDungeonServiceTest {
    /** 建立隔离角色和模拟重登。 */
    @Autowired private DevelopmentLoginService login;
    /** 生产同一份事务入口。 */
    @Autowired private DailyDungeonService service;
    /** 真实阵容保存及战力峰值写入。 */
    @Autowired private MainFormationCommandService formations;
    /** 读取本次发奖后的实际背包。 */
    @Autowired private InventoryService inventory;
    /** 读取本次扣费及发奖后的真实钱包和版本。 */
    @Autowired private RoleRepository roles;
    /** 只构造隔离角色、英雄和零点等测试边界。 */
    @Autowired private JdbcTemplate jdbc;
    /** 独立用例的游戏时钟，用于验证实际跨日而非手工改次数。 */
    @Autowired private GameClock clock;

    /** 隔离账号、角色及其当前认证。 */
    private record Player(String account, String role, String token) {}

    /** 旧角色等级和首通门槛，普通角色达到两场后不收付费。 */
    @Test
    void levelFormationAndFreeLimit() {
        var player = player(14, 0);
        assertFalse(service.current(player.token()).unlocked());
        assertFailure("DUNGEON_LEVEL", () -> service.challenge(player.token(), id(), false, 0));
        jdbc.update("UPDATE game_role SET role_level=15 WHERE id=?", player.role());
        assertTrue(service.current(player.token()).unlocked());
        assertFalse(service.current(player.token()).canChallenge());
        assertFailure("DUNGEON_FORMATION", () -> service.challenge(player.token(), id(), false, 0));
        deploy(player, 10104004, 100, 4);
        assertFailure("DUNGEON_SWEEP_LOCKED", () -> service.challenge(player.token(), id(), true, 0));
        var initial = service.current(player.token());
        assertEquals(2, initial.freeLimit());
        assertEquals(2, initial.totalLimit());
        assertEquals(0, initial.wins());
        assertEquals(2, initial.rewardPreview().size());
        assertTrue(service.challenge(player.token(), id(), false, 0).won());
        assertTrue(service.challenge(player.token(), id(), true, 0).won());
        assertFailure("DUNGEON_COUNT", () -> service.challenge(player.token(), id(), true, 50));
        assertEquals(100, roles.findById(player.role()).orElseThrow().diamonds());
    }

    /** 检查真实守军、并发幂等和实际奖励，再用游戏时钟跨日验证次数轮换。 */
    @Test
    void firstVictoryClergyRetryAndMidnight() throws Exception {
        var player = player(15, 2);
        jdbc.update("UPDATE game_role SET clergy_level=1 WHERE id=?", player.role());
        deploy(player, 10104004, 100, 4);
        var original = id();
        DailyDungeonService.Challenge won;
        long priorRevision = roles.revision(player.role());
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> service.challenge(player.token(), original, false, 0));
            var repeat = executor.submit(() -> service.challenge(player.token(), original, false, 0));
            won = first.get(15, TimeUnit.SECONDS);
            assertEquals(won, repeat.get(15, TimeUnit.SECONDS));
        }
        assertTrue(won.won());
        assertEquals(priorRevision + 1, won.assetRevision());
        assertEquals(1, won.state().wins());
        assertTrue(won.state().cleared());
        assertEquals("dungeon:gold:1", won.replay().getScenario());
        assertEquals(List.of(10405005, 10104004, 10204005, 10204004, 10104004, 10403001),
                won.replay().getUnitsList().stream().filter(unit -> unit.getFaction() == 2)
                    .map(unit -> unit.getTemplateId()).toList());
        assertEquals(200_000, roles.findById(player.role()).orElseThrow().gold());
        assertEquals(40, quantity(player, 900102));

        var restoredToken = "Bearer " + login.login(player.account()).session().accessToken();
        assertEquals(won, service.challenge(restoredToken, original, false, 0));
        assertFailure("DUNGEON_REQUEST_CONFLICT", () -> service.challenge(restoredToken, original, true, 0));
        clock.setEpochSeconds(won.state().resetAtSeconds() + 1);
        try {
            var next = service.current(restoredToken);
            assertEquals(0, next.wins());
            assertTrue(next.cleared());
            assertEquals(LocalTime.MIDNIGHT, Instant.ofEpochSecond(next.resetAtSeconds())
                    .atZone(ZoneId.of("Asia/Shanghai")).toLocalTime());
            // 模拟其他玩法移去最后一名英雄时，旧扫荡依然只看历史峰值和首通状态。
            jdbc.update("DELETE FROM game_lineup_slot WHERE role_id=?", player.role());
            assertTrue(service.current(restoredToken).canChallenge());
            var sweep = service.challenge(restoredToken, id(), true, 0);
            assertTrue(sweep.sweep());
            assertNull(sweep.replay());
            assertEquals(1, sweep.state().wins());
        } finally {
            clock.reset();
        }
    }

    /** 付费失败仍付原报价，保留次数和历史峰值；钱包或奖励失败时整笔回滚。 */
    @Test
    void paidDefeatAndCreditRollback() {
        var player = player(15, 2);
        deploy(player, 10104004, 100, 4);
        long high = service.current(player.token()).power();
        service.challenge(player.token(), id(), false, 0);
        service.challenge(player.token(), id(), true, 0);
        assertFailure("DUNGEON_COST_CHANGED", () -> service.challenge(player.token(), id(), true, 0));
        deploy(player, 10101001, 1, 1);
        assertEquals(high, service.current(player.token()).power());
        var failed = service.challenge(player.token(), id(), false, 50);
        assertFalse(failed.won());
        assertNull(failed.actual());
        assertEquals(2, failed.state().wins());
        assertEquals(50, roles.findById(player.role()).orElseThrow().diamonds());
        assertEquals(200_000, roles.findById(player.role()).orElseThrow().gold());
        assertEquals(40, quantity(player, 900102));

        jdbc.update("UPDATE game_role SET gold=? WHERE id=?", Long.MAX_VALUE, player.role());
        long revision = roles.revision(player.role());
        assertThrows(ArithmeticException.class, () -> service.challenge(player.token(), id(), true, 50));
        assertEquals(50, roles.findById(player.role()).orElseThrow().diamonds());
        assertEquals(2, service.current(player.token()).wins());
        assertEquals(revision, roles.revision(player.role()));
    }

    /** 创建独立测试角色，显式准备角色等级、消费资格和测试余额。 */
    private Player player(int level, int vip) {
        String account = "daily_gold_" + id().substring(0, 8);
        var player = login.login(account);
        jdbc.update("UPDATE game_role SET role_level=?,goddess_vip=?,gold=0,diamonds=100 WHERE id=?",
                level, vip, player.role().id());
        return new Player(account, player.role().id(), "Bearer " + player.session().accessToken());
    }

    /** 写入新的真实角色英雄，再使用现有阵容命令真实替换第一格。 */
    private void deploy(Player player, int template, int level, int star) {
        String hero = id();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,0)",
                hero, player.role(), template, level, star);
        long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, player.role());
        formations.save(player.token(), new MainFormationCommandService.Save(id(), version, 1,
                List.of(new Lineup.Slot(2, hero))));
    }

    /** 查询此次首关奖励实际落到的普通库存。 */
    private long quantity(Player player, int itemId) {
        return inventory.list(player.role()).stream().filter(item -> item.itemId() == itemId)
                .mapToLong(InventoryService.Item::quantity).sum();
    }

    /** 检查可恢复失败原因，确保失败仍保持连接可用。 */
    private static void assertFailure(String code, Runnable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action::run).getReason());
    }

    /** 为单笔测试请求或实例生成有效持久标识。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
