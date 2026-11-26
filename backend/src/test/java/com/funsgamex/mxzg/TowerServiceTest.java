/**
 * 在隔离数据库中用真实角色阵容和原守军验证幻境之塔。
 * 覆盖前三十层、首次失败后的精力恢复、扫荡、独立里程碑和冻结重试。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.chat.ChatChannel;
import com.funsgamex.mxzg.chat.ChatService;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
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
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
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
    /** 确认只有配置标记的真实领奖会发布系统公告。 */
    @Autowired private ChatService chat;
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
    /** 检查历史回执使用的 JSON 映射兼容。 */
    @Autowired private ObjectMapper mapper;

    /** 隔离账号、角色和本次授权。 */
    private record Player(String account, String role, String token) {}

    /** 走真实三十层、发奖、重登、扫荡和三个里程碑，核实公告只发布一次。 */
    @Test
    void clearThirtyFloorsAndClaimMilestonesWithFrozenRetries() throws Exception {
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
        assertEquals(IntStream.rangeClosed(1, 30).boxed().toList(),
                firstState.floors().stream().map(TowerService.FloorState::floor).toList());
        assertEquals(List.of(10, 20, 30),
                firstState.milestones().stream().map(TowerService.MilestoneState::floor).toList());
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
        for (int floor = 1; floor <= 30; floor++) {
            last = tower.challenge(player.token(), floor == 30 ? lastRequest : id(), floor);
            assertTrue(last.won(), "第 " + floor + " 层");
            assertEquals("tower:" + floor, last.replay().getScenario());
            assertEquals(6, last.replay().getUnitsList().stream().filter(unit -> unit.getFaction() == 2).count());
            assertEquals(floor, last.state().highestCleared());
            assertEquals(20, last.state().energy());
            assertEquals(revision + floor, last.assetRevision());
            assertEquals(firstState.floors().get(floor - 1).firstRewards(), actual(last));
            assertTrue(last.state().milestones().stream().noneMatch(TowerService.MilestoneState::claimed));
            if (floor == 19 || floor == 29) {
                int nextMilestone = (floor + 1) / 10;
                assertFailure("TOWER_MILESTONE_LOCKED",
                        () -> tower.claimMilestone(player.token(), id(), nextMilestone));
            }
            if (output != null) {
                Files.write(Files.createDirectories(Path.of(output)).resolve("tower-" + floor + ".pb"),
                        last.replay().toByteArray());
            }
        }
        assertEquals(30, progress.highestCleared(player.role()));
        assertFailure("TOWER_FLOOR", () -> tower.challenge(player.token(), id(), 31));

        var token = relogin(player);
        assertEquals(last, tower.challenge(token, lastRequest, 30));
        assertEquals(strong, tower.current(token).slots());
        assertFailure("TOWER_REQUEST_CONFLICT", () -> tower.sweep(token, lastRequest, 30, 0));
        assertFailure("TOWER_SWEEP_FLOOR", () -> tower.sweep(token, id(), 29, 0));
        var firstSweep = tower.sweep(token, id(), 30, 0);
        assertEquals(firstState.floors().getLast().sweepRewards(), actual(firstSweep));
        assertNull(firstSweep.replay());
        assertEquals(1, firstSweep.state().sweeps());
        assertEquals(10, tower.sweep(token, id(), 30, 0).state().nextSweepCostDiamonds());
        assertFailure("TOWER_COST_CHANGED", () -> tower.sweep(token, id(), 30, 0));
        var paid = tower.sweep(token, id(), 30, 10);
        assertEquals(paid, tower.sweep(token, paid.requestId(), 30, 10));
        assertEquals(90, roles.findById(player.role()).orElseThrow().diamonds());

        // 按非层数顺序领取，证明服务端按各自编号而非最高已领奖台阶记账。
        var tenth = tower.claimMilestone(token, id(), 1);
        assertEquals(List.of(new Reward(1001003, 1), new Reward(1002003, 1)), actual(tenth));
        assertTrue(tenth.state().milestone().claimed());
        var thirtieth = tower.claimMilestone(token, id(), 3);
        assertEquals(List.of(new Reward(20405004, 50)), actual(thirtieth));
        assertFalse(thirtieth.state().milestones().get(1).claimed());
        var twentieth = tower.claimMilestone(token, id(), 2);
        assertEquals(List.of(new Reward(1003004, 1), new Reward(1004004, 1)), actual(twentieth));
        assertFailure("TOWER_MILESTONE_CLAIMED", () -> tower.claimMilestone(token, id(), 1));
        assertFailure("TOWER_MILESTONE_CLAIMED", () -> tower.claimMilestone(token, id(), 3));
        assertEquals(30, progress.highestCleared(player.role()));
        String restored = relogin(player);
        assertEquals(tenth, tower.claimMilestone(restored, tenth.requestId(), 1));
        assertEquals(twentieth, tower.claimMilestone(restored, twentieth.requestId(), 2));
        assertEquals(thirtieth, tower.claimMilestone(restored, thirtieth.requestId(), 3));
        assertEquals(List.of(172), chat.history(player.role(), ChatChannel.SYSTEM, null, 0, 0).messages().stream()
                .map(ChatService.Message::noticeId).toList());
        assertTrue(tower.current(restored).milestones().stream().allMatch(TowerService.MilestoneState::claimed));
        var restoredItems = inventory.list(player.role());
        for (var reward : List.of(new Reward(1001003, 1), new Reward(1002003, 1),
                new Reward(1003004, 1), new Reward(1004004, 1), new Reward(20405004, 50))) {
            assertEquals(reward.quantity(), restoredItems.stream().filter(item -> item.itemId() == reward.itemId())
                    .mapToLong(InventoryService.Item::quantity).sum());
        }

        clock.setEpochSeconds(paid.state().sweepResetAtSeconds());
        try {
            assertEquals(0, tower.current(restored).sweeps());
            assertEquals(1, tower.sweep(restored, id(), 30, 0).state().sweeps());
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

    /** 升级 V56 角色时仅保留既有第 10 层领取，冻结回执的内容与摘要保持原样。 */
    @Test
    void migrateTenthFloorClaimAndReadLegacyState() {
        String database = "jdbc:h2:mem:tower_migration_" + id()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        // H2 的 IN 检查绑定到创建它的会话，测试迁移和夹具写入共用一条隔离连接。
        try (var source = new SingleConnectionDataSource(database, "sa", "", true)) {
            Flyway.configure().dataSource(source).target("56").load().migrate();
            var historical = new JdbcTemplate(source);
            String claimedRole = legacyProgress(historical, true);
            String otherRole = legacyProgress(historical, false);
            String request = id();
            var payloads = new RewardReceiptPayloads(mapper);
            var legacyMilestone = new TowerService.MilestoneState(1, 10, true, List.of(new Reward(1001003, 1)));
            ObjectNode legacyState = mapper.valueToTree(new TowerService.State(16, 10, 10, 20, 20, 0, 1800,
                    0, 5, 0, 1, 0, 1, List.of(), List.of(), legacyMilestone, List.of(legacyMilestone)));
            legacyState.remove("milestones");
            var frozen = payloads.freeze(legacyState);
            historical.update("""
                    INSERT INTO game_tower_request(role_id,request_id,action_kind,target_id,max_diamonds,
                        report_bytes,receipt_json,receipt_hash) VALUES (?,?,?,?,?,?,?,?)
                    """, claimedRole, request, "MILESTONE", 1, 0L, null, frozen.json(), frozen.hash());

            Flyway.configure().dataSource(source).target("60").load().migrate();
            assertEquals(List.of(1), historical.queryForList(
                    "SELECT milestone_id FROM game_tower_milestone_claim WHERE role_id=?", Integer.class, claimedRole));
            assertTrue(historical.queryForList(
                    "SELECT milestone_id FROM game_tower_milestone_claim WHERE role_id=?", Integer.class, otherRole).isEmpty());
            var stored = historical.queryForMap("""
                    SELECT receipt_json,receipt_hash FROM game_tower_request WHERE role_id=? AND request_id=?
                    """, claimedRole, request);
            assertEquals(frozen.json(), stored.get("receipt_json"));
            assertEquals(frozen.hash(), stored.get("receipt_hash"));
            var state = payloads.read(frozen.json(), frozen.hash(), TowerService.State.class);
            assertEquals(10, state.highestCleared());
            assertEquals(List.of(legacyMilestone), state.milestones());
        }
    }

    /** 构造旧版已过第 10 层但可以有不同领取状态的角色。 */
    private static String legacyProgress(JdbcTemplate historical, boolean claimed) {
        String role = id();
        historical.update("""
                INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id)
                VALUES (?,?,?,16,0,0,?,'local-1')
                """, role, role, role, role);
        historical.update("""
                INSERT INTO game_tower(role_id,highest_cleared,energy,energy_time_seconds,
                    sweep_times,sweep_reset_at_seconds,milestone_claimed)
                VALUES (?,10,20,0,0,1,?)
                """, role, claimed);
        return role;
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
