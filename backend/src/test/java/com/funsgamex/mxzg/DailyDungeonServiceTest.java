/**
 * 独立数据库验证日常副本的顺序准入、胜场和累计参与、扣款、掉线幂等和上海零点轮换。
 * 使用真实战斗与发奖服务，只有测试角色等级、阵容和钱包由隔离夹具准备。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.dungeon.DailyDungeonRepository;
import com.funsgamex.mxzg.dungeon.DailyDungeonService;
import com.funsgamex.mxzg.dungeon.DailyDungeonType;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import static com.funsgamex.mxzg.dungeon.DailyDungeonType.EXPERIENCE;
import static com.funsgamex.mxzg.dungeon.DailyDungeonType.GOLD;
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
    /** 以任务使用的同一查询读取持久累计参与。 */
    @Autowired private DailyDungeonRepository dungeon;
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
    /** 使用相同的回执工具构造升级前实际冻结过的首关格式。 */
    @Autowired private RewardReceiptPayloads payloads;
    /** 读取旧格式的测试用 JSON，校验由生产回执工具完成。 */
    @Autowired private ObjectMapper mapper;
    /** 测试阵容沿用已验收主线阵容的原星级和等级上限。 */
    @Autowired private HeroGrowthRules growth;

    /** 隔离账号、角色及其当前认证。 */
    private record Player(String account, String role, String token) {}

    /** 验证角色等级和首通门槛，拒绝及无效命令均不产生参与进度。 */
    @Test
    void levelFormationAndFreeLimit() {
        var player = player(14, 0);
        assertFalse(service.current(player.token(), GOLD).unlocked());
        assertFailure("DUNGEON_LEVEL", () -> service.challenge(player.token(), GOLD, id(), 1, false, 0));
        jdbc.update("UPDATE game_role SET role_level=15 WHERE id=?", player.role());
        assertTrue(service.current(player.token(), GOLD).unlocked());
        assertFalse(service.current(player.token(), GOLD).canChallenge());
        assertFailure("DUNGEON_FORMATION", () -> service.challenge(player.token(), GOLD, id(), 1, false, 0));
        deploy(player, 10104004, 100, 4);
        assertFailure("DUNGEON_SWEEP_LOCKED", () -> service.challenge(player.token(), GOLD, id(), 1, true, 0));
        assertFailure("DUNGEON_REQUEST_INVALID", () -> service.challenge(player.token(), GOLD, "invalid", 1, false, 0));
        assertEquals(0, dungeon.participationCount(player.role()));
        var initial = service.current(player.token(), GOLD);
        assertEquals(2, initial.freeLimit());
        assertEquals(2, initial.totalLimit());
        assertEquals(0, initial.wins());
        assertEquals(2, initial.rewardPreview().size());
        assertTrue(service.challenge(player.token(), GOLD, id(), 1, false, 0).won());
        assertTrue(service.challenge(player.token(), GOLD, id(), 1, true, 0).won());
        assertFailure("DUNGEON_COUNT", () -> service.challenge(player.token(), GOLD, id(), 1, true, 50));
        assertEquals(2, dungeon.participationCount(player.role()));
        assertEquals(100, roles.findById(player.role()).orElseThrow().diamonds());
    }

    /** 检查真实守军、并发幂等和实际奖励，跨日后每日胜场清零而累计参与保留。 */
    @Test
    void firstVictoryClergyRetryAndMidnight() throws Exception {
        var player = player(15, 2);
        jdbc.update("UPDATE game_role SET clergy_level=1 WHERE id=?", player.role());
        deploy(player, 10104004, 100, 4);
        var original = id();
        DailyDungeonService.Challenge won;
        long priorRevision = roles.revision(player.role());
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> service.challenge(player.token(), GOLD, original, 1, false, 0));
            var repeat = executor.submit(() -> service.challenge(player.token(), GOLD, original, 1, false, 0));
            won = first.get(15, TimeUnit.SECONDS);
            assertEquals(won, repeat.get(15, TimeUnit.SECONDS));
        }
        assertTrue(won.won());
        assertEquals(priorRevision + 1, won.assetRevision());
        assertEquals(1, dungeon.participationCount(player.role()));
        assertEquals(1, won.state().wins());
        assertTrue(won.state().cleared());
        assertEquals("dungeon:gold:1", won.replay().getScenario());
        assertEquals(List.of(10405005, 10104004, 10204005, 10204004, 10104004, 10403001),
                won.replay().getUnitsList().stream().filter(unit -> unit.getFaction() == 2)
                    .map(unit -> unit.getTemplateId()).toList());
        assertEquals(200_000, roles.findById(player.role()).orElseThrow().gold());
        assertEquals(40, quantity(player, 900102));

        var restoredToken = "Bearer " + login.login(player.account()).session().accessToken();
        assertEquals(won, service.challenge(restoredToken, GOLD, original, 1, false, 0));
        assertFailure("DUNGEON_REQUEST_CONFLICT", () -> service.challenge(restoredToken, GOLD, original, 1, true, 0));
        clock.setEpochSeconds(won.state().resetAtSeconds() + 1);
        try {
            var next = service.current(restoredToken, GOLD);
            assertEquals(0, next.wins());
            assertEquals(1, dungeon.participationCount(player.role()));
            assertTrue(next.cleared());
            assertEquals(LocalTime.MIDNIGHT, Instant.ofEpochSecond(next.resetAtSeconds())
                    .atZone(ZoneId.of("Asia/Shanghai")).toLocalTime());
            // 模拟其他玩法移去最后一名英雄时，旧扫荡依然只看历史峰值和首通状态。
            jdbc.update("DELETE FROM game_lineup_slot WHERE role_id=?", player.role());
            assertTrue(service.current(restoredToken, GOLD).canChallenge());
            var sweep = service.challenge(restoredToken, GOLD, id(), 1, true, 0);
            assertTrue(sweep.sweep());
            assertNull(sweep.replay());
            assertEquals(1, sweep.state().wins());
            assertEquals(2, dungeon.participationCount(player.role()));
        } finally {
            clock.reset();
        }
    }

    /** 付费失败计参与而保留胜场，钱包或奖励失败时整笔回滚。 */
    @Test
    void paidDefeatAndCreditRollback() {
        var player = player(15, 2);
        deploy(player, 10104004, 100, 4);
        long high = service.current(player.token(), GOLD).power();
        service.challenge(player.token(), GOLD, id(), 1, false, 0);
        service.challenge(player.token(), GOLD, id(), 1, true, 0);
        assertFailure("DUNGEON_COST_CHANGED", () -> service.challenge(player.token(), GOLD, id(), 1, true, 0));
        deploy(player, 10101001, 1, 1);
        assertEquals(high, service.current(player.token(), GOLD).power());
        var failed = service.challenge(player.token(), GOLD, id(), 1, false, 50);
        assertFalse(failed.won());
        assertNull(failed.actual());
        assertEquals(2, failed.state().wins());
        assertEquals(3, dungeon.participationCount(player.role()));
        assertEquals(50, roles.findById(player.role()).orElseThrow().diamonds());
        assertEquals(200_000, roles.findById(player.role()).orElseThrow().gold());
        assertEquals(40, quantity(player, 900102));

        jdbc.update("UPDATE game_role SET gold=? WHERE id=?", Long.MAX_VALUE, player.role());
        long revision = roles.revision(player.role());
        assertThrows(ArithmeticException.class, () -> service.challenge(player.token(), GOLD, id(), 1, true, 50));
        assertEquals(50, roles.findById(player.role()).orElseThrow().diamonds());
        assertEquals(2, service.current(player.token(), GOLD).wins());
        assertEquals(revision, roles.revision(player.role()));
        assertEquals(3, dungeon.participationCount(player.role()));
    }

    /** 第二关继承同组次数，免费战败也更新累计和资产版本，重发原命令保持幂等。 */
    @Test
    void secondStageUnlockBattleSweepAndPersistence() throws Exception {
        var player = player(15, 2);
        deploy(player, 10104004, 100, 4);
        jdbc.update("UPDATE game_role SET max_main_power=30000 WHERE id=?", player.role());
        var initial = service.current(player.token(), GOLD);
        assertEquals(IntStream.rangeClosed(1, 9).boxed().toList(),
                initial.stages().stream().map(DailyDungeonService.StageState::stageId).toList());
        assertEquals(30000, initial.power());
        assertFailure("DUNGEON_POWER", () -> service.challenge(player.token(), GOLD, id(), 2, false, 0));
        jdbc.update("UPDATE game_role SET max_main_power=30001 WHERE id=?", player.role());
        assertFailure("DUNGEON_PREVIOUS_STAGE", () -> service.challenge(player.token(), GOLD, id(), 2, false, 0));
        assertFailure("DUNGEON_STAGE", () -> service.challenge(player.token(), GOLD, id(), 10, false, 0));
        assertTrue(service.challenge(player.token(), GOLD, id(), 1, false, 0).won());
        assertTrue(service.current(player.token(), GOLD).stages().get(1).canChallenge());
        assertFailure("DUNGEON_SWEEP_LOCKED", () -> service.challenge(player.token(), GOLD, id(), 2, true, 0));

        deploy(player, 10101001, 1, 1);
        String lossRequest = id();
        long beforeLossRevision = roles.revision(player.role());
        var loss = service.challenge(player.token(), GOLD, lossRequest, 2, false, 0);
        assertFalse(loss.won());
        assertEquals(1, loss.state().wins());
        assertFalse(loss.state().cleared());
        assertNull(loss.actual());
        assertEquals(beforeLossRevision + 1, loss.assetRevision());
        assertEquals(loss, service.challenge(player.token(), GOLD, lossRequest, 2, false, 0));
        assertEquals(loss.assetRevision(), roles.revision(player.role()));
        assertEquals(2, dungeon.participationCount(player.role()));
        assertEquals(100_000, roles.findById(player.role()).orElseThrow().gold());
        String defeatSamplePath = System.getProperty("mxzg.test.gold.stage2.defeat-replay");
        if (defeatSamplePath != null) {
            Files.write(Path.of(defeatSamplePath), loss.replay().toByteArray());
        }

        deployGoldStageTwoWinners(player);
        var command = id();
        var victory = service.challenge(player.token(), GOLD, command, 2, false, 0);
        assertEquals("dungeon:gold:2", victory.replay().getScenario());
        assertEquals(List.of(10505006, 10405004, 10301001, 10202002, 10304005, 10301001),
                victory.replay().getUnitsList().stream().filter(unit -> unit.getFaction() == 2)
                        .map(unit -> unit.getTemplateId()).toList());
        assertTrue(victory.won());
        assertEquals(2, victory.state().wins());
        assertTrue(victory.state().cleared());
        assertEquals(250_000, roles.findById(player.role()).orElseThrow().gold());
        assertEquals(50, quantity(player, 900102));
        String samplePath = System.getProperty("mxzg.test.gold.stage2.replay");
        if (samplePath != null) {
            Files.write(Path.of(samplePath), victory.replay().toByteArray());
        }

        var restoredToken = "Bearer " + login.login(player.account()).session().accessToken();
        assertEquals(victory, service.challenge(restoredToken, GOLD, command, 2, false, 0));
        assertFailure("DUNGEON_REQUEST_CONFLICT", () -> service.challenge(restoredToken, GOLD, command, 1, false, 0));
        assertFailure("DUNGEON_COST_CHANGED", () -> service.challenge(restoredToken, GOLD, id(), 2, true, 0));
        var sweep = service.challenge(restoredToken, GOLD, id(), 2, true, 50);
        assertEquals(3, sweep.state().wins());
        assertNull(sweep.replay());
        assertEquals(400_000, roles.findById(player.role()).orElseThrow().gold());
        assertEquals(50, roles.findById(player.role()).orElseThrow().diamonds());
        assertEquals(80, quantity(player, 900102));
        assertFailure("DUNGEON_COUNT", () -> service.challenge(restoredToken, GOLD, id(), 1, true, 50));

        clock.setEpochSeconds(sweep.state().resetAtSeconds());
        try {
            assertEquals(3, service.current(restoredToken, GOLD).wins());
            clock.setEpochSeconds(sweep.state().resetAtSeconds() + 1);
            var next = service.current(restoredToken, GOLD);
            assertEquals(0, next.wins());
            assertTrue(next.stages().get(1).cleared());
            assertEquals(0, next.nextCostDiamonds());
            assertTrue(service.challenge(restoredToken, GOLD, id(), 2, true, 0).won());
        } finally {
            clock.reset();
        }
    }

    /** 按顺序通过前两关，再验证第 3 关的严格战力、付费挑战、失败、扫荡和重登。 */
    @Test
    void thirdStageBattleAndSweepPreserveSharedProgress() throws Exception {
        var player = player(15, 8);
        jdbc.update("UPDATE game_role SET diamonds=200 WHERE id=?", player.role());
        deployGoldStageTwoWinners(player);
        jdbc.update("UPDATE game_role SET max_main_power=52501 WHERE id=?", player.role());
        var third = service.current(player.token(), GOLD).stages().get(2);
        assertEquals(52500, third.requiredPower());
        assertFalse(third.unlocked());
        assertFailure("DUNGEON_PREVIOUS_STAGE", () -> service.challenge(player.token(), GOLD, id(), 3, false, 0));
        assertTrue(service.challenge(player.token(), GOLD, id(), 1, false, 0).won());
        assertTrue(service.challenge(player.token(), GOLD, id(), 2, false, 0).won());
        jdbc.update("UPDATE game_role SET max_main_power=52500 WHERE id=?", player.role());
        assertFailure("DUNGEON_POWER", () -> service.challenge(player.token(), GOLD, id(), 3, false, 50));
        jdbc.update("UPDATE game_role SET max_main_power=52501 WHERE id=?", player.role());
        assertFailure("DUNGEON_SWEEP_LOCKED", () -> service.challenge(player.token(), GOLD, id(), 3, true, 50));
        assertFailure("DUNGEON_COST_CHANGED", () -> service.challenge(player.token(), GOLD, id(), 3, false, 0));

        deploy(player, 10101001, 1, 1);
        var loss = service.challenge(player.token(), GOLD, id(), 3, false, 50);
        assertFalse(loss.won());
        assertNull(loss.actual());
        assertEquals(2, loss.state().wins());
        assertEquals(150, roles.findById(player.role()).orElseThrow().diamonds());
        assertEquals(250_000, roles.findById(player.role()).orElseThrow().gold());
        assertEquals(50, quantity(player, 900102));

        deployGoldStageTwoWinners(player);
        var victory = service.challenge(player.token(), GOLD, id(), 3, false, 50);
        assertTrue(victory.won());
        assertEquals("dungeon:gold:3", victory.replay().getScenario());
        var guards = victory.replay().getUnitsList().stream().filter(unit -> unit.getFaction() == 2).toList();
        assertEquals(List.of(10404003, 10205007, 10305007, 10105007, 10505004, 10104004),
                guards.stream().map(unit -> unit.getTemplateId()).toList());
        assertTrue(guards.stream().allMatch(unit -> unit.getLevel() == 40));
        assertEquals(3, victory.state().wins());
        assertEquals(450_000, roles.findById(player.role()).orElseThrow().gold());
        assertEquals(90, quantity(player, 900102));

        var sweep = service.challenge(player.token(), GOLD, id(), 3, true, 50);
        assertNull(sweep.replay());
        assertEquals(4, sweep.state().wins());
        assertEquals(0, service.current(player.token(), EXPERIENCE).wins());
        assertFailure("DUNGEON_COUNT", () -> service.challenge(player.token(), GOLD, id(), 1, true, 50));
        String restored = "Bearer " + login.login(player.account()).session().accessToken();
        assertEquals(victory, service.challenge(restored, GOLD, victory.requestId(), 3, false, 50));
        assertEquals(sweep, service.challenge(restored, GOLD, sweep.requestId(), 3, true, 50));
        assertEquals(3, service.current(restored, GOLD).stages().stream().filter(DailyDungeonService.StageState::cleared).count());
        assertEquals(650_000, roles.findById(player.role()).orElseThrow().gold());
        assertEquals(50, roles.findById(player.role()).orElseThrow().diamonds());
        assertEquals(130, quantity(player, 900102));
        Files.write(Path.of("target", "daily-gold-stage3.pb"), victory.replay().toByteArray());
        Files.write(Path.of("target", "daily-gold-stage3-defeat.pb"), loss.replay().toByteArray());
    }

    /** 经验准入、原守军、神职和独立报价，重登跨日均保留最高通关。 */
    @Test
    void experienceUsesIndependentProgressAndRealAwards() throws Exception {
        var player = player(16, 2);
        assertTrue(service.current(player.token(), GOLD).unlocked());
        assertFalse(service.current(player.token(), EXPERIENCE).unlocked());
        assertFailure("DUNGEON_LEVEL", () -> service.challenge(player.token(), EXPERIENCE, id(), 1, false, 0));
        jdbc.update("UPDATE game_role SET role_level=17,max_main_power=1 WHERE id=?", player.role());
        assertEquals(1, service.current(player.token(), EXPERIENCE).requiredPower());
        assertFailure("DUNGEON_POWER", () -> service.challenge(player.token(), EXPERIENCE, id(), 1, true, 0));
        deployGoldStageTwoWinners(player);
        assertFailure("DUNGEON_STAGE", () -> service.challenge(player.token(), EXPERIENCE, id(), 10, false, 0));
        jdbc.update("UPDATE game_role SET max_main_power=34501 WHERE id=? AND max_main_power<34501", player.role());
        assertFailure("DUNGEON_PREVIOUS_STAGE", () -> service.challenge(player.token(), EXPERIENCE, id(), 2, false, 0));
        assertFailure("DUNGEON_SWEEP_LOCKED", () -> service.challenge(player.token(), EXPERIENCE, id(), 1, true, 0));

        var xpBefore = quantity(player, 900101);
        var gold = service.challenge(player.token(), GOLD, id(), 1, false, 0);
        assertTrue(gold.won());
        assertEquals(0, service.current(player.token(), EXPERIENCE).wins());
        assertFailure("DUNGEON_REQUEST_CONFLICT",
                () -> service.challenge(player.token(), EXPERIENCE, gold.requestId(), 1, false, 0));
        var command = id();
        var win = service.challenge(player.token(), EXPERIENCE, command, 1, false, 0);
        assertTrue(win.won());
        assertEquals("dungeon:experience:1", win.replay().getScenario());
        var guards = win.replay().getUnitsList().stream().filter(unit -> unit.getFaction() == 2).toList();
        assertEquals(List.of(10504002, 10305008, 10404002, 10102002, 10505005, 10503001),
                guards.stream().map(unit -> unit.getTemplateId()).toList());
        assertTrue(guards.stream().allMatch(unit -> unit.getLevel() == 5));
        assertEquals(xpBefore + 60_000, quantity(player, 900101));

        jdbc.update("UPDATE game_role SET clergy_level=3 WHERE id=?", player.role());
        var sweep = service.challenge(player.token(), EXPERIENCE, id(), 1, true, 0);
        assertNull(sweep.replay());
        assertEquals(2, sweep.state().wins());
        assertEquals(50, sweep.state().nextCostDiamonds());
        assertEquals(xpBefore + 180_000, quantity(player, 900101));
        assertFailure("DUNGEON_COST_CHANGED", () -> service.challenge(player.token(), EXPERIENCE, id(), 1, true, 0));
        assertTrue(service.challenge(player.token(), EXPERIENCE, id(), 1, true, 50).won());
        assertEquals(50, roles.findById(player.role()).orElseThrow().diamonds());
        assertEquals(xpBefore + 300_000, quantity(player, 900101));
        assertEquals(1, service.current(player.token(), GOLD).wins());
        assertEquals(0, service.current(player.token(), GOLD).nextCostDiamonds());

        var restored = "Bearer " + login.login(player.account()).session().accessToken();
        assertEquals(win, service.challenge(restored, EXPERIENCE, command, 1, false, 0));
        assertEquals(3, service.current(restored, EXPERIENCE).wins());
        clock.setEpochSeconds(win.state().resetAtSeconds() + 1);
        try {
            var afterReset = service.current(restored, EXPERIENCE);
            assertEquals(0, afterReset.wins());
            assertEquals(0, afterReset.nextCostDiamonds());
            assertTrue(afterReset.cleared());
            assertEquals(0, service.current(restored, GOLD).wins());
            assertTrue(service.current(restored, GOLD).cleared());
            var refreshed = service.challenge(restored, EXPERIENCE, id(), 1, true, 0);
            assertEquals(1, refreshed.state().wins());
            assertEquals(0, service.current(restored, GOLD).wins());
        } finally {
            clock.reset();
        }
        Files.write(Path.of("target", "daily-experience-stage1.pb"), win.replay().toByteArray());
    }

    /** 首关旧回执没有类型及列表字段，迁到通用存储后仍返回原资产、结果和战报。 */
    @Test
    void firstStageFrozenReceiptFromBeforeCatalogue() {
        var player = player(15, 2);
        deploy(player, 10104004, 100, 4);
        var original = service.challenge(player.token(), GOLD, id(), 1, false, 0);
        var record = jdbc.queryForObject("SELECT receipt_json FROM game_daily_dungeon_request WHERE role_id=? AND request_id=?",
                String.class, player.role(), original.requestId());
        var old = (ObjectNode) mapper.readTree(record);
        old.remove("dungeonType");
        ((ObjectNode) old.get("state")).remove("stages");
        var frozen = payloads.freeze(old);
        jdbc.update("UPDATE game_daily_dungeon_request SET receipt_json=?,receipt_hash=? WHERE role_id=? AND request_id=?",
                frozen.json(), frozen.hash(), player.role(), original.requestId());

        var restored = service.challenge(player.token(), GOLD, original.requestId(), 1, false, 0);
        assertEquals(original.replay(), restored.replay());
        assertEquals(original.actual(), restored.actual());
        assertTrue(restored.state().stages().isEmpty());
        assertEquals(1, service.current(player.token(), GOLD).wins());
        assertTrue(service.current(player.token(), GOLD).stages().get(1).unlocked());
    }

    /** 通过真实服务入口连打五类各九关，再扫荡末关，核对原奖励、累计参与和冷重登。 */
    @Test
    void allDailyStagesSettleAndSweep() throws Exception {
        var player = player(200, 8);
        deployLateChapterTeam(player);
        jdbc.update("UPDATE game_role SET diamonds=5000,max_main_power=900001 WHERE id=?", player.role());
        var replayRoot = System.getProperty("mxzg.test.daily.replay-directory");
        String session = player.token();
        int expectedParticipation = 0;
        try {
            for (var type : DailyDungeonType.values()) {
                String token = session;
                var state = service.current(token, type);
                assertEquals(0, state.wins(), type.key());
                assertEquals(9, state.stages().size(), type.key());
                assertFailure("DUNGEON_STAGE", () -> service.challenge(token, type, id(), 10, false, 0));
                for (int stageId = 1; stageId <= 9; stageId++) {
                    if (state.wins() == state.totalLimit()) {
                        clock.setEpochSeconds(state.resetAtSeconds() + 1);
                        state = service.current(token, type);
                    }
                    var stage = state.stages().get(stageId - 1);
                    assertTrue(stage.canChallenge(), type.key() + ":" + stageId);
                    var result = service.challenge(token, type, id(), stageId, false, state.nextCostDiamonds());
                    assertTrue(result.won(), type.key() + ":" + stageId);
                    assertEquals(type.scenario(stageId), result.replay().getScenario());
                    assertEquals(state.wins() + 1, result.state().wins());
                    var credited = result.actual().items().stream()
                            .map(item -> new com.funsgamex.mxzg.reward.RewardGrantService.Reward(item.itemId(), item.credited()))
                            .toList();
                    assertEquals(stage.rewardPreview(), credited);
                    exportReplay(replayRoot, type, stageId, result);
                    state = result.state();
                }
                var sweep = service.challenge(token, type, id(), 9, true, 0);
                assertEquals(2, sweep.state().wins());
                assertNull(sweep.replay());
                String restored = "Bearer " + login.login(player.account()).session().accessToken();
                assertEquals(sweep, service.challenge(restored, type, sweep.requestId(), 9, true, 0));
                assertEquals(9, service.current(restored, type).stages().stream().filter(DailyDungeonService.StageState::cleared).count());
                expectedParticipation += 10;
                assertEquals(expectedParticipation, dungeon.participationCount(player.role()), type.key());
                session = restored;
            }
        } finally {
            clock.reset();
        }
    }

    /** 仅在显式审计时导出实际挑战二进制，不创建伪造战报。 */
    private static void exportReplay(String directory, DailyDungeonType type, int stageId,
                                     DailyDungeonService.Challenge result) throws Exception {
        if (directory != null) {
            Path output = Files.createDirectories(Path.of(directory)).resolve(type.key() + "-" + stageId + ".pb");
            Files.write(output, result.replay().toByteArray());
        }
    }

    /** 复用既有满编预览夹具的六名已接通英雄以及合法成长上限。 */
    private void deployLateChapterTeam(Player player) {
        String leader = id();
        int star = MainChapterProgressionPreview.lateChapterLeaderStar(550);
        int maximumLevel = growth.limit(200, 6, star);
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105011,?,?,6)",
                leader, player.role(), maximumLevel, star);
        var lineup = MainChapterProgressionPreview.prepareLateChapterLineup(
                jdbc, player.role(), leader, 200, star, maximumLevel);
        long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, player.role());
        formations.save(player.token(), new MainFormationCommandService.Save(id(), version, 1, lineup));
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

    /** 上阵五个真实高等级英雄，避免用第一关的单人队挑战第二关六守军。 */
    private void deployGoldStageTwoWinners(Player player) {
        int[] templates = {10104004, 10505005, 10204005, 10204004, 10405005};
        int[] stars = {4, 5, 4, 4, 5};
        int[] positions = {2, 3, 5, 6, 7};
        var slots = new ArrayList<Lineup.Slot>();
        for (int i = 0; i < templates.length; i++) {
            String hero = id();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,0)",
                    hero, player.role(), templates[i], 100, stars[i]);
            slots.add(new Lineup.Slot(positions[i], hero));
        }
        long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, player.role());
        formations.save(player.token(), new MainFormationCommandService.Save(id(), version, 1, slots));
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
