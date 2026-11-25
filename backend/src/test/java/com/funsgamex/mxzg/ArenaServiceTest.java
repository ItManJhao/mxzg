/**
 * 用独立数据库和真实战斗核对竞技场候选、门票、胜负、发奖、战报及原回执。
 * 仅用夹具设置测试阵容、钱包和时钟，进度与资产通过生产服务提交。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.arena.ArenaRepository;
import com.funsgamex.mxzg.arena.ArenaSeasonService;
import com.funsgamex.mxzg.arena.ArenaService;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.util.HashSet;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:arena_backend;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class ArenaServiceTest {
    /** 真实创建隔离角色和重登录凭证。 */
    @Autowired private DevelopmentLoginService login;
    /** 挑战、购买和重试的生产入口。 */
    @Autowired private ArenaService arena;
    /** 验证真人结算实际反映到正式的区服积分榜。 */
    @Autowired private ArenaSeasonService season;
    /** 使用和 VIP 相同的权威参与查询。 */
    @Autowired private ArenaRepository repository;
    /** 测试用真实主线阵容保存。 */
    @Autowired private MainFormationCommandService formations;
    /** 真实购买前后钱包与资产版本查询。 */
    @Autowired private RoleRepository roles;
    /** 核对门票实际扣加。 */
    @Autowired private InventoryService inventory;
    /** 构造测试角色的独立前置条件。 */
    @Autowired private JdbcTemplate jdbc;
    /** 推进上海零点边界，测试结束还原游戏时钟。 */
    @Autowired private GameClock clock;

    /** 持有隔离开发账号、角色和带认证头的游戏凭证。 */
    private record Player(String account, String id, String token) {}

    /** 验证解锁、真实败场奖励、三次免费、购票并发幂等和零点次数。 */
    @Test
    void participationTicketsRollbackAndMidnight() throws Exception {
        var player = player(7);
        assertEquals(0, repository.settledChallenges(player.id()));
        assertFailure("ARENA_LEVEL", () -> arena.current(player.token()));
        jdbc.update("UPDATE game_role SET role_level=8 WHERE id=?", player.id());
        var fresh = arena.current(player.token());
        assertEquals(1_000, fresh.score());
        assertEquals(3, fresh.freeRemaining());
        assertEquals(3, new HashSet<>(fresh.opponents()).size());
        assertTrue(fresh.opponents().stream().allMatch(bot -> bot.level() == 8 && bot.power() > 0));
        assertEquals(fresh, arena.current(player.token()));
        assertFailure("ARENA_OPPONENT", () -> arena.challenge(player.token(), id(), 999));
        int opponent = fresh.opponents().getFirst().id();
        assertFailure("ARENA_BATTLE_UNAVAILABLE", () -> arena.challenge(player.token(), id(), opponent));
        deploy(player, 10101001, 1, 1);
        var first = arena.challenge(player.token(), id(), opponent);
        assertFalse(first.record().won());
        assertEquals(0, first.record().scoreDelta());
        assertFalse(first.actual().items().isEmpty());
        assertEquals(1, repository.settledChallenges(player.id()));
        assertEquals(2, first.state().freeRemaining());
        assertEquals(List.of(2, 3, 5, 6), first.replay().getUnitsList().stream()
                .filter(unit -> unit.getFaction() == 2).map(unit -> unit.getPosition()).toList());
        arena.challenge(player.token(), id(), opponent);
        arena.challenge(player.token(), id(), opponent);
        assertFailure("ARENA_TICKETS", () -> arena.challenge(player.token(), id(), opponent));
        assertEquals(3, repository.settledChallenges(player.id()));

        String purchase = id();
        long wallet = roles.findById(player.id()).orElseThrow().diamonds();
        long revision = roles.revision(player.id());
        ArenaService.TicketPurchase bought;
        try (var threads = Executors.newFixedThreadPool(2)) {
            var firstCall = threads.submit(() -> arena.buyTickets(player.token(), purchase, 2));
            var secondCall = threads.submit(() -> arena.buyTickets(player.token(), purchase, 2));
            bought = firstCall.get(15, TimeUnit.SECONDS);
            assertEquals(bought, secondCall.get(15, TimeUnit.SECONDS));
        }
        assertEquals(40, bought.spentDiamonds());
        assertEquals(revision + 1, bought.assetRevision());
        assertEquals(wallet - 40, roles.findById(player.id()).orElseThrow().diamonds());
        assertEquals(2L, quantity(player));
        assertFailure("ARENA_REQUEST_CONFLICT", () -> arena.buyTickets(player.token(), purchase, 1));
        jdbc.update("DELETE FROM game_lineup_slot WHERE role_id=?", player.id());
        assertFailure("ARENA_BATTLE_UNAVAILABLE", () -> arena.challenge(player.token(), id(), opponent));
        assertEquals(2L, quantity(player));
        assertEquals(3, repository.settledChallenges(player.id()));
        deploy(player, 10101001, 1, 1);

        var paid = arena.challenge(player.token(), id(), opponent);
        assertFalse(paid.record().won());
        assertEquals(1L, quantity(player));
        assertEquals(4, repository.settledChallenges(player.id()));
        assertEquals(4, paid.state().history().size());
        assertEquals(paid.record(), paid.state().history().getFirst());
        var other = player(8);
        assertFailure("ARENA_REPORT", () -> arena.replay(other.token(), paid.record().battleId()));
        var restoredToken = "Bearer " + login.login(player.account()).session().accessToken();
        assertEquals(paid.replay(), arena.replay(restoredToken, paid.record().battleId()));
        assertEquals(paid, arena.challenge(restoredToken, paid.requestId(), opponent));
        assertFailure("ARENA_REQUEST_CONFLICT", () -> arena.challenge(restoredToken, paid.requestId(), 999));
        assertEquals(1L, quantity(player));
        try {
            clock.setEpochSeconds(paid.state().resetAtSeconds());
            assertEquals(0, arena.current(restoredToken).freeRemaining());
            clock.setEpochSeconds(paid.state().resetAtSeconds() + 1);
            var next = arena.current(restoredToken);
            assertEquals(3, next.freeRemaining());
            assertEquals(4, next.settledChallenges());
            assertEquals(paid.state().opponents(), next.opponents());
        } finally {
            clock.reset();
        }
    }

    /** 第五胜后进入真人阶段，门票、回放及原机器人请求仍然有效。 */
    @Test
    void fiveWinsExitNewcomerAndOriginalChallengeRetries() throws Exception {
        var player = player(8);
        deploy(player, 10104004, 100, 4);
        var state = arena.current(player.token());
        int opponent = state.opponents().getFirst().id();
        var purchase = arena.buyTickets(player.token(), id(), 2);
        var request = id();
        ArenaService.Challenge first;
        try (var threads = Executors.newFixedThreadPool(2)) {
            var firstCall = threads.submit(() -> arena.challenge(player.token(), request, opponent));
            var secondCall = threads.submit(() -> arena.challenge(player.token(), request, opponent));
            first = firstCall.get(15, TimeUnit.SECONDS);
            assertEquals(first, secondCall.get(15, TimeUnit.SECONDS));
        }
        assertTrue(first.record().won());
        assertEquals(10, first.record().scoreDelta());
        assertEquals(purchase.assetRevision() + 1, first.assetRevision());
        assertEquals(1, first.state().robotWins());
        assertEquals(1, repository.settledChallenges(player.id()));
        for (int wins = 2; wins <= 5; wins++) {
            var challenge = arena.challenge(player.token(), id(), opponent);
            assertTrue(challenge.record().won());
            assertEquals(wins, challenge.state().robotWins());
            assertEquals(wins, challenge.state().settledChallenges());
        }
        var finished = arena.current(player.token());
        assertFalse(finished.newcomerActive());
        assertTrue(finished.opponents().stream().allMatch(candidate -> candidate.id() == 0 && candidate.roleId() != null));
        assertEquals(0L, finished.ticketBalance());
        assertTrue(finished.score() > first.state().score());
        assertFailure("ARENA_OPPONENT", () -> arena.challenge(player.token(), id(), opponent));
        assertEquals(1, arena.buyTickets(player.token(), id(), 1).quantity());
        assertEquals(first, arena.challenge(player.token(), request, opponent));
        assertEquals(first.replay(), arena.replay(player.token(), first.record().battleId()));
    }

    /** 同服两名真人使用独立防守阵，双方杯数和单一战报在同笔事务中更新。 */
    @Test
    void playerMatchingDefenseAndBidirectionalHistory() {
        var attacker = player(18, "local-2");
        var defender = player(18, "local-2");
        var remote = player(18, "local-1");
        var attackHero = deploy(attacker, 10104004, 100, 4);
        deploy(defender, 10101001, 1, 1);
        deploy(remote, 10101001, 1, 1);
        var defenseHero = hero(defender, 10101001, 2, 1);
        var defaultDefense = arena.defense(defender.token());
        assertTrue(defaultDefense.fallback());
        assertEquals(0, defaultDefense.version());
        assertEquals(2, defaultDefense.slots().getFirst().position());
        var deployment = List.of(new Lineup.Slot(5, defenseHero));
        String saveId = id();
        assertFailure("ARENA_FORMATION_INVALID", () -> arena.saveDefense(defender.token(), id(), 0, 1,
                List.of(new Lineup.Slot(5, attackHero))));
        var savedDefense = arena.saveDefense(defender.token(), saveId, 0, 1, deployment);
        assertFalse(savedDefense.defense().fallback());
        assertEquals(1, savedDefense.defense().version());
        assertEquals(savedDefense, arena.saveDefense(defender.token(), saveId, 0, 1, deployment));
        assertFailure("ARENA_FORMATION_CHANGED", () -> arena.saveDefense(defender.token(), id(), 0, 1, deployment));

        arena.current(attacker.token());
        jdbc.update("UPDATE game_arena_progress SET robot_wins=5,settled_challenges=5,opponents='' WHERE role_id=?", attacker.id());
        var candidates = arena.refresh(attacker.token());
        assertFalse(candidates.newcomerActive());
        assertEquals(List.of(defender.id()), candidates.opponents().stream().map(ArenaService.Opponent::roleId).toList());
        assertEquals(candidates, arena.current(attacker.token()));
        assertFailure("ARENA_OPPONENT", () -> arena.challenge(attacker.token(), id(), 0, remote.id()));

        String request = id();
        var win = arena.challenge(attacker.token(), request, 0, defender.id());
        assertTrue(win.record().won());
        assertEquals(10, win.record().scoreDelta());
        assertEquals(1010, win.state().score());
        assertEquals(5, win.state().robotWins());
        assertEquals(6, win.state().settledChallenges());
        assertEquals(2, win.state().freeRemaining());
        assertEquals("arena:pvp:" + defender.id(), win.replay().getScenario());
        assertEquals(List.of(5), win.replay().getUnitsList().stream().filter(unit -> unit.getFaction() == 2)
                .map(unit -> unit.getPosition()).toList());

        var defenseView = arena.current(defender.token());
        assertEquals(990, defenseView.score());
        assertEquals(0, defenseView.settledChallenges());
        assertEquals(3, defenseView.freeRemaining());
        var defendRecord = defenseView.history().getFirst();
        assertTrue(defendRecord.defense());
        assertFalse(defendRecord.won());
        assertEquals(attacker.id(), defendRecord.opponentRoleId());
        assertEquals(-10, defendRecord.scoreDelta());
        assertEquals(win.replay(), arena.replay(defender.token(), defendRecord.battleId()));
        assertFailure("ARENA_REPORT", () -> arena.replay(remote.token(), defendRecord.battleId()));
        assertEquals(win, arena.challenge(attacker.token(), request, 0, defender.id()));
        assertEquals(List.of(attacker.id(), defender.id()), season.ranking(attacker.token()).entries().stream()
                .map(ArenaSeasonService.RankEntry::roleId).toList());
        assertEquals(2, season.ranking(defender.token()).own().rank());

        jdbc.update("UPDATE game_arena_progress SET robot_wins=5,settled_challenges=5,opponents='' WHERE role_id=?", defender.id());
        arena.refresh(defender.token());
        String retryId = id();
        var counterattack = arena.challenge(defender.token(), retryId, 0, attacker.id());
        assertFalse(counterattack.record().won());
        assertEquals(0, counterattack.record().scoreDelta());
        assertEquals(990, counterattack.state().score());
        assertEquals(defendRecord, counterattack.state().history().get(1));
        assertEquals(counterattack, arena.challenge(defender.token(), retryId, 0, attacker.id()));
        var wonDefense = arena.current(attacker.token()).history().getFirst();
        assertTrue(wonDefense.defense());
        assertTrue(wonDefense.won());
        assertEquals(0, wonDefense.scoreDelta());

        jdbc.update("DELETE FROM game_hero WHERE role_id=? AND id=?", defender.id(), defenseHero);
        var fallback = arena.defense(defender.token());
        assertTrue(fallback.fallback());
        assertEquals(1, fallback.version());
        assertEquals(defaultDefense.slots(), fallback.slots());
    }

    /** 24 组原阵容都能运行真实战斗，历史返回最后 20 场且不裁剪幂等回执。 */
    @Test
    void allConfiguredBotsPlayAndHistoryIsBounded() {
        var player = player(8);
        deploy(player, 10101001, 1, 1);
        arena.current(player.token());
        assertEquals(20, arena.buyTickets(player.token(), id(), 24).spentDiamonds() / 24);
        ArenaService.Challenge first = null;
        for (int opponent = 1; opponent <= 24; opponent++) {
            int second = opponent == 24 ? 1 : opponent + 1;
            int third = second == 24 ? 1 : second + 1;
            jdbc.update("UPDATE game_arena_progress SET opponents=? WHERE role_id=?",
                    opponent + "," + second + "," + third, player.id());
            var challenge = arena.challenge(player.token(), id(), opponent);
            assertEquals("arena:" + opponent, challenge.replay().getScenario());
            assertFalse(challenge.record().won());
            if (first == null) {
                first = challenge;
            }
        }
        assertEquals(24, repository.settledChallenges(player.id()));
        assertEquals(20, arena.current(player.token()).history().size());
        assertEquals(first, arena.challenge(player.token(), first.requestId(), first.record().opponentId()));
    }

    /** 创建独立测试角色，由夹具提供足够购买测试门票的钻石。 */
    private Player player(int level) {
        return player(level, "local-1");
    }

    /** 在指定测试区服创建独立角色，以验证跨服隔离。 */
    private Player player(int level, String server) {
        String account = "arena_" + id().substring(0, 8);
        var player = login.login(account, server);
        jdbc.update("UPDATE game_role SET role_level=?,diamonds=600 WHERE id=?", level, player.role().id());
        return new Player(account, player.role().id(), "Bearer " + player.session().accessToken());
    }

    /** 用生产保存接口部署强或弱测试英雄，战斗使用真实模板属性。 */
    private String deploy(Player player, int template, int level, int star) {
        String hero = hero(player, template, level, star);
        long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, player.id());
        formations.save(player.token(), new MainFormationCommandService.Save(id(), version, 1,
                List.of(new Lineup.Slot(2, hero))));
        return hero;
    }

    /** 构造专用防守可选英雄，真实保存校验英雄身份与位置。 */
    private String hero(Player player, int template, int level, int star) {
        String hero = id();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,0)",
                hero, player.id(), template, level, star);
        return hero;
    }

    /** 读取旧竞技场门票的当前持有量。 */
    private long quantity(Player player) {
        return inventory.find(player.id(), 900501).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 检查服务器实际返回的业务错误。 */
    private static void assertFailure(String code, Runnable call) {
        assertEquals(code, assertThrows(ResponseStatusException.class, call::run).getReason());
    }

    /** 创建新的规范测试命令或角色记录编号。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
