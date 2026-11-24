/**
 * 在隔离数据库中用真实角色阵容和原守军验证幻境之塔。
 * 覆盖前十层、首次失败后的精力恢复、扫荡、里程碑和冻结重试。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import com.funsgamex.mxzg.tower.TowerRepository;
import com.funsgamex.mxzg.tower.TowerService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
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
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:fantasy_tower;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class TowerServiceTest {
    /** 准备隔离开发角色及重新登录。 */
    @Autowired private DevelopmentLoginService login;
    /** 使用真实幻境事务入口。 */
    @Autowired private TowerService tower;
    /** 读取别的模块所用的最高通关进度。 */
    @Autowired private TowerRepository progress;
    /** 复用测试角色的主线阵型保存与持久读取。 */
    @Autowired private MainFormationCommandService mainFormation;
    /** 检查保存幻境阵型不会改变主线。 */
    @Autowired private MainFormationStateService formations;
    /** 由原成长表计算高星测试阵容合法等级。 */
    @Autowired private HeroGrowthRules growth;
    /** 比较真实到账物品及钱包。 */
    @Autowired private InventoryService inventory;
    /** 检查角色钱包和统一版本。 */
    @Autowired private RoleRepository roles;
    /** 只构造隔离等级、阵容及余额等前提。 */
    @Autowired private JdbcTemplate jdbc;
    /** 在独立用例中推进服务器秒，测试实际精力恢复和零点。 */
    @Autowired private GameClock clock;

    /** 隔离账号、角色和本次授权。 */
    private record Player(String account, String role, String token) {}

    /** 走真实十层、首次通关发奖、后续回放、扫荡扣费及独立里程碑。 */
    @Test
    void clearTenFloorsAndClaimMilestoneWithFrozenRetries() throws Exception {
        var player = player(15);
        assertFailure("TOWER_LEVEL", () -> tower.current(player.token()));
        jdbc.update("UPDATE game_role SET role_level=16 WHERE id=?", player.role());
        String weak = hero(player, 10101001, 1, 1, 0);
        var originalMain = List.of(new Lineup.Slot(2, weak));
        long mainVersion = formations.current(player.role()).version();
        mainFormation.save(player.token(), new MainFormationCommandService.Save(id(), mainVersion, 1, originalMain));
        var firstState = tower.current(player.token());
        assertEquals(originalMain, firstState.slots());
        assertEquals(0, firstState.formationVersion());
        assertEquals(20, firstState.energy());
        assertEquals(IntStream.rangeClosed(1, 10).boxed().toList(),
                firstState.floors().stream().map(TowerService.FloorState::floor).toList());
        assertFailure("TOWER_FORMATION_EMPTY", () -> tower.challenge(player.token(), id(), 1));
        assertFailure("TOWER_FLOOR", () -> tower.challenge(player.token(), id(), 2));
        assertFailure("TOWER_SWEEP_FLOOR", () -> tower.sweep(player.token(), id(), 1, 0));
        assertFailure("TOWER_MILESTONE_LOCKED", () -> tower.claimMilestone(player.token(), id(), 1));

        var strong = strongTeam(player);
        var saved = tower.saveFormation(player.token(), 0, 1, strong);
        assertEquals(1, saved.formationVersion());
        assertEquals(strong, saved.slots());
        assertEquals(originalMain, formations.current(player.role()).slots());
        assertFailure("TOWER_FORMATION_CHANGED", () -> tower.saveFormation(player.token(), 0, 1, originalMain));
        assertEquals(saved, tower.saveFormation(player.token(), 1, 1, strong));

        String lastRequest = id();
        String output = System.getProperty("mxzg.test.tower.replays");
        TowerService.Settlement last = null;
        long revision = roles.revision(player.role());
        for (int floor = 1; floor <= 10; floor++) {
            last = tower.challenge(player.token(), floor == 10 ? lastRequest : id(), floor);
            assertTrue(last.won(), "第 " + floor + " 层");
            assertEquals("tower:" + floor, last.replay().getScenario());
            assertEquals(6, last.replay().getUnitsList().stream().filter(unit -> unit.getFaction() == 2).count());
            assertEquals(floor, last.state().highestCleared());
            assertEquals(20, last.state().energy());
            assertEquals(revision + floor, last.assetRevision());
            assertEquals(firstState.floors().get(floor - 1).firstRewards(), actual(last));
            assertFalse(last.state().milestone().claimed());
            if (output != null) {
                Files.write(Files.createDirectories(Path.of(output)).resolve("tower-" + floor + ".pb"),
                        last.replay().toByteArray());
            }
        }
        assertEquals(10, progress.highestCleared(player.role()));
        assertFailure("TOWER_FLOOR", () -> tower.challenge(player.token(), id(), 11));

        var token = relogin(player);
        assertEquals(last, tower.challenge(token, lastRequest, 10));
        assertEquals(strong, tower.current(token).slots());
        assertFailure("TOWER_REQUEST_CONFLICT", () -> tower.sweep(token, lastRequest, 10, 0));
        assertFailure("TOWER_SWEEP_FLOOR", () -> tower.sweep(token, id(), 9, 0));
        var firstSweep = tower.sweep(token, id(), 10, 0);
        assertEquals(firstState.floors().getLast().sweepRewards(), actual(firstSweep));
        assertNull(firstSweep.replay());
        assertEquals(1, firstSweep.state().sweeps());
        assertEquals(10, tower.sweep(token, id(), 10, 0).state().nextSweepCostDiamonds());
        assertFailure("TOWER_COST_CHANGED", () -> tower.sweep(token, id(), 10, 0));
        var paid = tower.sweep(token, id(), 10, 10);
        assertEquals(paid, tower.sweep(token, paid.requestId(), 10, 10));
        assertEquals(90, roles.findById(player.role()).orElseThrow().diamonds());

        var milestone = tower.claimMilestone(token, id(), 1);
        assertEquals(List.of(new Reward(1001003, 1), new Reward(1002003, 1)), actual(milestone));
        assertTrue(milestone.state().milestone().claimed());
        assertFailure("TOWER_MILESTONE_CLAIMED", () -> tower.claimMilestone(token, id(), 1));
        assertEquals(10, progress.highestCleared(player.role()));
        String restored = relogin(player);
        assertEquals(milestone, tower.claimMilestone(restored, milestone.requestId(), 1));
        assertTrue(tower.current(restored).milestone().claimed());
        assertEquals(1, inventory.list(player.role()).stream().filter(item -> item.itemId() == 1001003)
                .mapToLong(InventoryService.Item::quantity).sum());

        clock.setEpochSeconds(paid.state().sweepResetAtSeconds());
        try {
            assertEquals(0, tower.current(restored).sweeps());
            assertEquals(1, tower.sweep(restored, id(), 10, 0).state().sweeps());
        } finally {
            clock.reset();
        }
    }

    /** 同一失败并发重试只扣一次，保留原战报并按原精力间隔恢复。 */
    @Test
    void defeatConsumesOneEnergyAndRecoversOnOriginalSecond() throws Exception {
        var player = player(16);
        String weak = hero(player, 10101001, 1, 1, 0);
        tower.saveFormation(player.token(), 0, 1, List.of(new Lineup.Slot(2, weak)));
        String request = id();
        TowerService.Settlement defeat;
        long revision = roles.revision(player.role());
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> tower.challenge(player.token(), request, 1));
            var retry = executor.submit(() -> tower.challenge(player.token(), request, 1));
            defeat = first.get(15, TimeUnit.SECONDS);
            assertEquals(defeat, retry.get(15, TimeUnit.SECONDS));
        }
        assertFalse(defeat.won());
        assertNull(defeat.actual());
        assertEquals(revision, defeat.assetRevision());
        assertEquals(19, defeat.state().energy());
        assertEquals(0, defeat.state().highestCleared());
        long rechargeAt = defeat.state().nextEnergyAtSeconds();
        clock.setEpochSeconds(rechargeAt - 1);
        try {
            assertEquals(19, tower.current(player.token()).energy());
            clock.setEpochSeconds(rechargeAt);
            var full = tower.current(player.token());
            assertEquals(20, full.energy());
            assertEquals(0, full.nextEnergyAtSeconds());
            assertEquals(defeat, tower.challenge(relogin(player), request, 1));
        } finally {
            clock.reset();
        }
    }

    /** 建立独立角色，不从开发工具注入已有幻境或 VIP 进度。 */
    private Player player(int level) {
        String account = "tower_" + id().substring(0, 8);
        var logged = login.login(account);
        var role = logged.role().id();
        jdbc.update("UPDATE game_role SET role_level=?,gold=0,diamonds=100 WHERE id=?", level, role);
        return new Player(account, role, "Bearer " + logged.session().accessToken());
    }

    /** 返回重登后的授权，重复请求通过新连接也可恢复。 */
    private String relogin(Player player) {
        return "Bearer " + login.login(player.account()).session().accessToken();
    }

    /** 用已验收的六人阵容和合法成长数据准备隔离挑战。 */
    private List<Lineup.Slot> strongTeam(Player player) {
        int star = MainChapterProgressionPreview.lateChapterLeaderStar(550);
        int level = growth.limit(200, 6, star);
        String lead = hero(player, 10105011, level, star, 6);
        return MainChapterProgressionPreview.prepareLateChapterLineup(jdbc, player.role(), lead, 200, star, level)
                .stream().sorted(Comparator.comparingInt(Lineup.Slot::position)).toList();
    }

    /** 为此测试角色插入真实模板的英雄实例。 */
    private String hero(Player player, int template, int level, int star, int stage) {
        String hero = id();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,?)",
                hero, player.role(), template, level, star, stage);
        return hero;
    }

    /** 从真实结算读取各发放物品，不拿配置预览替代到账结果。 */
    private static List<Reward> actual(TowerService.Settlement settlement) {
        return settlement.actual().items().stream()
                .map(item -> new Reward(item.itemId(), item.credited())).toList();
    }

    /** 核对业务错误码，调用方正常保留当前连接。 */
    private static void assertFailure(String code, Runnable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action::run).getReason());
    }

    /** 测试角色附加的实例和请求都使用协议支持的 UUID。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
