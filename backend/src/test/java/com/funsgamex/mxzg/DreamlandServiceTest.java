/**
 * 用隔离角色和原关卡验证永恒梦境事务。覆盖截止时间自动推进、跨日、续战生命与
 * 失败、未确认胜场及封顶相关的资产防重放边界。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.dreamland.DreamlandService;
import com.funsgamex.mxzg.dreamland.DreamlandService.Command;
import com.funsgamex.mxzg.dreamland.DreamlandService.Phase;
import com.funsgamex.mxzg.dreamland.DreamlandService.State;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.util.Comparator;
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
    "spring.datasource.url=jdbc:h2:mem:dreamland;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false",
    "mxzg.dreamland-maintenance.enabled=false"
})
@ActiveProfiles("local")
class DreamlandServiceTest {
    /** 真实开发登录和重新鉴权，只使用随机隔离账号。 */
    @Autowired private DevelopmentLoginService login;
    /** 使用实际玩法事务入口及后台推进。 */
    @Autowired private DreamlandService service;
    /** 用成长配置为隔离角色准备合法六人阵容。 */
    @Autowired private HeroGrowthRules growth;
    /** 对比进度及原奖励到账前后的持久钱包。 */
    @Autowired private RoleRepository roles;
    /** 为隔离角色准备等级、英雄和已知初始钱包。 */
    @Autowired private JdbcTemplate jdbc;
    /** 模拟每天开始和定时自动结算，不等待真实分钟。 */
    @Autowired private GameClock clock;

    /** 标记当前测试角色及当前登录授权。 */
    private record Player(String account, String role, String token) {}

    /** 用原六层守军跑到第二次选增益及封顶，验证断线和重发不会新增战斗或资产。 */
    @Test
    void advancesSixFloorsAndCarriesHpWithFrozenSettlement() throws Exception {
        clock.setEpochSeconds(Instant.parse("2026-11-25T01:00:00Z").getEpochSecond());
        try {
            var player = player(24);
            assertFailure("DREAMLAND_LEVEL", () -> service.state(player.token()));
            jdbc.update("UPDATE game_role SET role_level=100 WHERE id=?", player.role());
            var initial = service.state(player.token());
            assertEquals(6, initial.maxFloor());
            assertEquals(Phase.READY, initial.phase());
            assertFailure("DREAMLAND_MILESTONE_LOCKED",
                    () -> service.act(player.token(), command(initial, "CLAIM", 5)));
            var team = strongTeam(player);
            var saved = service.act(player.token(),
                    new Command(id(), initial.version(), "SAVE_FORMATION", 0, 1, team)).state();
            var start = service.act(player.token(), command(saved, "START", 0)).state();
            assertEquals(3, start.buffs().size());
            assertEquals(1, start.challengeCount());
            assertFailure("DREAMLAND_STATE_CHANGED",
                    () -> service.act(player.token(), command(saved, "START", 0)));
            assertFailure("DREAMLAND_BUFF_INVALID",
                    () -> service.act(player.token(), command(start, "SELECT_BUFF", 999)));

            var first = command(start, "SELECT_BUFF", start.buffs().getFirst().id());
            DreamlandService.Settlement stage;
            try (var executor = Executors.newFixedThreadPool(2)) {
                var begin = executor.submit(() -> service.act(player.token(), first));
                var retry = executor.submit(() -> service.act(player.token(), first));
                stage = begin.get(15, TimeUnit.SECONDS);
                assertEquals(stage, retry.get(15, TimeUnit.SECONDS));
            }
            var newToken = "Bearer " + login.login(player.account()).session().accessToken();
            assertEquals(stage.state(), service.state(newToken));
            assertEquals(stage, service.act(newToken, first));
            var openingGold = roles.findById(player.role()).orElseThrow().gold();
            for (int floor = 1; floor <= 6; floor++) {
                var battle = stage.state().battle();
                assertEquals(floor, battle.floor());
                assertTrue(battle.won(), "第 " + floor + " 层");
                assertEquals("dreamland:" + floor, battle.replay().getScenario());
                assertTrue(battle.replay().getRounds() >= 1 && battle.replay().getRounds() <= 10);
                assertEquals(openingGold, roles.findById(player.role()).orElseThrow().gold());
                var confirm = command(stage.state(), "NEXT", 0);
                var acknowledged = service.act(newToken, confirm);
                assertEquals(floor, acknowledged.state().highestFloor());
                if (floor == 6) {
                    assertEquals(Phase.READY, acknowledged.state().phase());
                    assertEquals(6, acknowledged.state().todayRewardFloor());
                    assertEquals(107500, acknowledged.actual().wallet().goldAfter() - openingGold);
                    assertEquals(acknowledged, service.act(newToken, confirm));
                    var milestone = command(acknowledged.state(), "CLAIM", 5);
                    var claimed = service.act(newToken, milestone);
                    assertTrue(claimed.state().milestones().getFirst().claimed());
                    assertEquals(30000, claimed.actual().items().getFirst().credited());
                    assertEquals(claimed, service.act(newToken, milestone));
                } else if (floor == 5) {
                    assertEquals(Phase.SELECT_BUFF, acknowledged.state().phase());
                    var state = acknowledged.state();
                    stage = service.act(newToken, command(state, "SELECT_BUFF", state.buffs().getFirst().id()));
                } else {
                    assertEquals(Phase.NEXT_BATTLE, acknowledged.state().phase());
                    assertNull(acknowledged.actual());
                    stage = service.act(newToken, command(acknowledged.state(), "NEXT", 0));
                    long nextScan = (acknowledged.state().deadlineSeconds() + 59) / 60 * 60;
                    assertEquals(nextScan, stage.state().deadlineSeconds());
                    var previous = battle.replay().getUnitsList();
                    var next = stage.state().battle().replay().getUnitsList();
                    for (int index = 0; index < team.size(); index++) {
                        assertEquals(previous.get(index).getFinalHp(), next.get(index).getInitialHp());
                    }
                }
            }
        } finally {
            clock.reset();
        }
    }

    /** 跨日不补打旧等待增益或确认上期战报，只发放已经确认的旧日楼层。 */
    @Test
    void shanghaiResetKeepsOnlyAcknowledgedWins() {
        long lateEvening = Instant.parse("2026-11-25T15:45:00Z").getEpochSecond();
        clock.setEpochSeconds(lateEvening);
        try {
            var waiting = player(100);
            var waitingStart = startStrongTeam(waiting);
            var playing = player(100);
            var playingStart = startStrongTeam(playing);
            var first = service.act(playing.token(), command(playingStart, "SELECT_BUFF",
                    playingStart.buffs().getFirst().id())).state();
            assertTrue(first.battle().won());
            var acknowledged = service.act(playing.token(), command(first, "NEXT", 0)).state();
            var pending = service.act(playing.token(), command(acknowledged, "NEXT", 0)).state();
            assertTrue(pending.battle().won());
            assertEquals(2, pending.battle().floor());
            assertEquals(1, pending.highestFloor());
            assertEquals(0, roles.findById(playing.role()).orElseThrow().gold());
            assertTrue(waitingStart.deadlineSeconds() < waitingStart.resetAtSeconds());
            assertTrue(pending.deadlineSeconds() < pending.resetAtSeconds());

            clock.setEpochSeconds(pending.resetAtSeconds());
            service.advanceDue(waiting.role());
            var resetWithoutBattle = service.state(waiting.token());
            assertEquals(Phase.READY, resetWithoutBattle.phase());
            assertEquals(waitingStart.version() + 1, resetWithoutBattle.version());
            assertEquals(0, resetWithoutBattle.highestFloor());
            assertEquals(0, roles.findById(waiting.role()).orElseThrow().gold());

            var resetWithPartialReward = service.state(playing.token());
            assertEquals(Phase.READY, resetWithPartialReward.phase());
            assertEquals(pending.version() + 1, resetWithPartialReward.version());
            assertEquals(1, resetWithPartialReward.highestFloor());
            assertEquals(0, resetWithPartialReward.todayRewardFloor());
            assertEquals(0, resetWithPartialReward.challengeCount());
            assertEquals(20000, roles.findById(playing.role()).orElseThrow().gold());
            assertEquals(resetWithPartialReward, service.state(playing.token()));
            assertEquals(20000, roles.findById(playing.role()).orElseThrow().gold());
        } finally {
            clock.reset();
        }
    }

    /** 保存这个隔离角色的真实强阵容并进入第一轮增益。 */
    private State startStrongTeam(Player player) {
        var initial = service.state(player.token());
        var saved = service.act(player.token(), new Command(id(), initial.version(), "SAVE_FORMATION",
                0, 1, strongTeam(player))).state();
        return service.act(player.token(), command(saved, "START", 0)).state();
    }

    /** 到期自动选增益，弱英雄失败后没有楼层奖励，上海零点清零当日挑战次数。 */
    @Test
    void autoSelectsAndSettlesDefeatBeforeShanghaiReset() {
        clock.setEpochSeconds(Instant.parse("2026-11-25T03:00:00Z").getEpochSecond());
        try {
            var player = player(25);
            var initial = service.state(player.token());
            var loneHero = hero(player, 10101001, 1, 1, 0);
            var saved = service.act(player.token(), new Command(id(), initial.version(), "SAVE_FORMATION",
                    0, 1, List.of(new Lineup.Slot(2, loneHero)))).state();
            var start = service.act(player.token(), command(saved, "START", 0)).state();
            clock.setEpochSeconds(start.deadlineSeconds() - 2);
            service.advanceDue(player.role());
            assertEquals(start, service.state(player.token()));
            clock.setEpochSeconds(start.deadlineSeconds());
            service.advanceDue(player.role());
            var result = service.state(player.token());
            assertEquals(Phase.RESULT, result.phase());
            assertFalse(result.battle().won());
            clock.setEpochSeconds(result.deadlineSeconds());
            var finished = service.state(player.token());
            assertEquals(Phase.READY, finished.phase());
            assertEquals(0, finished.highestFloor());
            assertEquals(0, roles.findById(player.role()).orElseThrow().gold());
            clock.setEpochSeconds(result.resetAtSeconds());
            var reset = service.state(player.token());
            assertEquals(0, reset.challengeCount());
            assertEquals(0, reset.startFloor());
            assertEquals(Instant.parse("2026-11-26T16:00:00Z").getEpochSecond(), reset.resetAtSeconds());
        } finally {
            clock.reset();
        }
    }

    /** 新合法操作使用当前持久版本；重复请求测试显式复用同一命令。 */
    private static Command command(State state, String action, int choice) {
        return new Command(id(), state.version(), action, choice, 0, List.of());
    }

    /** 创建当前测试的独立角色并将初始余额设为可验证的 0。 */
    private Player player(int level) {
        String account = "dreamland_" + id().substring(0, 8);
        var created = login.login(account);
        var role = created.role().id();
        jdbc.update("UPDATE game_role SET role_level=?,gold=0 WHERE id=?", level, role);
        return new Player(account, role, "Bearer " + created.session().accessToken());
    }

    /** 复用已验过的六人高阶真实阵容，通过配置等级保证准备数据合法。 */
    private List<Lineup.Slot> strongTeam(Player player) {
        int star = MainChapterProgressionPreview.lateChapterLeaderStar(550);
        int level = growth.limit(200, 6, star);
        String lead = hero(player, 10105011, level, star, 6);
        return MainChapterProgressionPreview.prepareLateChapterLineup(jdbc, player.role(), lead, 200, star, level)
                .stream().sorted(Comparator.comparingInt(Lineup.Slot::position)).toList();
    }

    /** 插入归属该隔离角色的合法配置英雄作为挑战前提。 */
    private String hero(Player player, int template, int level, int star, int stage) {
        String hero = id();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,?)",
                hero, player.role(), template, level, star, stage);
        return hero;
    }

    /** 与协议一样使用稳定 UUID 标识。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }

    /** 检查被拒绝的操作符合约定状态码。 */
    private static void assertFailure(String code, Runnable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action::run).getReason());
    }
}
