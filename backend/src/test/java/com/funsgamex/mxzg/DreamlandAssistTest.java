/** 隔离数据库的梦境助战测试，覆盖好友、派遣发奖、战报冻结、跨日以及只读阵容评分。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.dreamland.DreamlandService;
import com.funsgamex.mxzg.dreamland.DreamlandService.Command;
import com.funsgamex.mxzg.dreamland.DreamlandService.Phase;
import com.funsgamex.mxzg.friend.FriendService;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
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
    "spring.datasource.url=jdbc:h2:mem:dreamland_assist;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false",
    "mxzg.dreamland-maintenance.enabled=false"
})
@ActiveProfiles("local")
class DreamlandAssistTest {
    /** 提供隔离账号和真实会话。 */
    @Autowired private DevelopmentLoginService login;
    /** 通过正式业务入口调用助战、阵容和战报。 */
    @Autowired private DreamlandService dreamland;
    /** 通过真实申请和同意建立好友，通过拉黑撤销关系。 */
    @Autowired private FriendService friends;
    /** 读取可布阵的合法成长等级。 */
    @Autowired private HeroGrowthRules growth;
    /** 查询测试编队的完整派遣前面板，用于与真实评分计算比对。 */
    @Autowired private HeroRepository heroes;
    /** 对照普通编队的元素光环评分，并核验普通预览继续拒绝其他角色实例。 */
    @Autowired private HeroMainPowerService powers;
    /** 核验持久资产未重复发放。 */
    @Autowired private RoleRepository roles;
    /** 仅为测试准备隔离角色、已知战力名册及余额。 */
    @Autowired private JdbcTemplate jdbc;
    /** 以可控时刻读取上海自然日。 */
    @Autowired private GameClock clock;

    /** 隔离玩家身份和鉴权令牌。 */
    private record Player(String role, String token) {}

    /** 派遣一次到账，借用受关系和战力约束，上阵后战报读取派遣时的英雄而非其当前等级。 */
    @Test
    void dispatchesOnceAndFreezesEligibleFriendInReplay() throws Exception {
        clock.setEpochSeconds(Instant.parse("2026-11-25T15:45:00Z").getEpochSecond());
        try {
            var lender = player("梦境派遣人");
            var borrower = player("梦境借用人");
            var stranger = player("梦境陌生人");
            String weak = hero(borrower, 10101001, 1, 1, 0);
            int dispatchTemplate = 10204013;
            int dispatchLevel = 200;
            String dispatched = hero(lender, dispatchTemplate, dispatchLevel, 9, 6);
            friend(borrower, FriendService.Action.APPLY, lender);
            friend(lender, FriendService.Action.ACCEPT, borrower);

            rejected("DREAMLAND_ASSIST_OWN_HERO", () -> dreamland.act(lender.token(),
                    command(lender, "DISPATCH_ASSIST", weak)));
            var send = command(lender, "DISPATCH_ASSIST", dispatched);
            DreamlandService.Settlement sent;
            try (var executor = Executors.newFixedThreadPool(2)) {
                var initial = executor.submit(() -> dreamland.act(lender.token(), send));
                var retry = executor.submit(() -> dreamland.act(lender.token(), send));
                sent = initial.get(15, TimeUnit.SECONDS);
                assertEquals(sent, retry.get(15, TimeUnit.SECONDS));
            }
            assertEquals(20_000, sent.actual().wallet().goldAfter());
            assertEquals(20_000, gold(lender));
            rejected("DREAMLAND_ASSIST_ALREADY_DISPATCHED", () -> dreamland.act(lender.token(),
                    command(lender, "DISPATCH_ASSIST", dispatched)));
            assertTrue(dreamland.assistance(stranger.token()).available().isEmpty());
            rejected("DREAMLAND_ASSIST_UNAVAILABLE", () -> dreamland.act(stranger.token(),
                    command(stranger, "SELECT_ASSIST", lender.role())));

            var available = dreamland.assistance(borrower.token());
            var dispatch = available.available().getFirst();
            assertEquals(dreamland.assistance(lender.token()).dispatched(), dispatch);
            assertTrue(dispatch.power() > available.maxAssistPower());
            rejected("DREAMLAND_ASSIST_POWER", () -> dreamland.act(borrower.token(),
                    command(borrower, "SELECT_ASSIST", lender.role())));
            jdbc.update("UPDATE game_hero SET hero_level = ? WHERE id = ?", dispatchLevel - 1, dispatched);

            String strong = hero(borrower, 10105011, growth.limit(200, 6, 14), 14, 6);
            var team = List.of(new Lineup.Slot(2, dispatched), new Lineup.Slot(3, strong));
            rejected("DREAMLAND_FORMATION_INVALID", () -> dreamland.act(borrower.token(), new Command(
                    id(), dreamland.state(borrower.token()).version(), "SAVE_FORMATION", 0, 1, team)));
            var selected = dreamland.act(borrower.token(), command(borrower, "SELECT_ASSIST", lender.role())).state();
            assertEquals(dispatch, selected.assistance());
            assertEquals(dispatch, dreamland.assistance(borrower.token()).selected());
            var saved = dreamland.act(borrower.token(), new Command(id(), selected.version(),
                    "SAVE_FORMATION", 0, 1, team)).state();
            assertEquals(team, saved.slots());
            var cleared = dreamland.act(borrower.token(), command(borrower, "CLEAR_ASSIST", null)).state();
            assertNull(cleared.assistance());
            assertEquals(List.of(new Lineup.Slot(3, strong)), cleared.slots());

            var reselected = dreamland.act(borrower.token(), command(borrower, "SELECT_ASSIST", lender.role())).state();
            var resaved = dreamland.act(borrower.token(), new Command(id(), reselected.version(),
                    "SAVE_FORMATION", 0, 1, team)).state();
            var started = dreamland.act(borrower.token(), new Command(id(), resaved.version(), "START", 0, 0,
                    List.of())).state();
            assertEquals(dispatch, started.assistance());
            assertFalse(dreamland.assistance(borrower.token()).canSelect());
            rejected("DREAMLAND_PHASE", () -> dreamland.act(borrower.token(), command(borrower, "CLEAR_ASSIST", null)));
            friend(lender, FriendService.Action.BLOCK, borrower);
            assertTrue(dreamland.assistance(borrower.token()).available().isEmpty());
            var report = dreamland.act(borrower.token(), new Command(id(), started.version(), "SELECT_BUFF",
                    started.buffs().getFirst().id(), 0, List.of())).state();
            var unit = report.battle().replay().getUnitsList().stream()
                    .filter(row -> row.getFaction() == 1 && row.getPosition() == 2).findFirst().orElseThrow();
            assertEquals(dispatchTemplate, unit.getTemplateId());
            assertEquals(dispatchLevel, unit.getLevel());
            assertEquals(dispatch, dreamland.state(borrower.token()).assistance());

            clock.setEpochSeconds(started.resetAtSeconds());
            var reset = dreamland.state(borrower.token());
            assertEquals(Phase.READY, reset.phase());
            assertNull(reset.assistance());
            assertEquals(List.of(new Lineup.Slot(3, strong)), reset.slots());
            assertNull(dreamland.assistance(lender.token()).dispatched());
            assertEquals(sent, dreamland.act(lender.token(), send));
            assertEquals(20_000, gold(lender));
            dreamland.act(lender.token(), command(lender, "DISPATCH_ASSIST", dispatched));
            assertEquals(dispatchLevel - 1, dreamland.assistance(lender.token()).dispatched().level());
            assertEquals(40_000, gold(lender));
        } finally {
            clock.reset();
        }
    }

    /** 当日合法借将参与同源光环计算；跨日、已解除关系、已换版或非本人阵容不外泄评分。 */
    @Test
    void previewsDreamlandDraftWithFrozenAssistWithoutSaving() {
        clock.setEpochSeconds(Instant.parse("2026-11-25T15:45:00Z").getEpochSecond());
        try {
            var lender = player("预估派遣人");
            var borrower = player("预估借用人");
            String borrowed = hero(lender, 10105008, 60, 5, 3);
            String own = hero(borrower, 10105011, 140, 9, 5);
            var borrowedProfile = heroes.find(lender.role(), borrowed).orElseThrow();
            var ownProfile = heroes.find(borrower.role(), own).orElseThrow();
            var slots = List.of(new Lineup.Slot(2, own), new Lineup.Slot(3, borrowed));
            int teamScore = powers.scoreFormation(List.of(ownProfile, borrowedProfile));
            assertTrue(teamScore > ownProfile.panelStats().power() + borrowedProfile.panelStats().power());

            assertEquals(0, dreamland.previewFormationPower(borrower.token(), id(), 0, 1, List.of()).power());
            friend(borrower, FriendService.Action.APPLY, lender);
            friend(lender, FriendService.Action.ACCEPT, borrower);
            dreamland.act(lender.token(), command(lender, "DISPATCH_ASSIST", borrowed));
            rejected("DREAMLAND_FORMATION_INVALID", () ->
                    dreamland.previewFormationPower(borrower.token(), id(), 0, 1, slots));
            var selected = dreamland.act(borrower.token(), command(borrower, "SELECT_ASSIST", lender.role())).state();
            long revision = roles.revision(borrower.role());
            jdbc.update("UPDATE game_hero SET hero_level=90 WHERE id=?", borrowed);
            String requestId = id();
            assertEquals(new DreamlandService.FormationPower(requestId, selected.version(), teamScore),
                    dreamland.previewFormationPower(borrower.token(), requestId, selected.version(), 1, slots));
            assertEquals(revision, roles.revision(borrower.role()));
            assertEquals(selected, dreamland.state(borrower.token()));
            rejected("FORMATION_POWER_INVALID", () -> powers.previewDraft(borrower.token(), id(), List.of(own, borrowed)));
            rejected("DREAMLAND_STATE_CHANGED", () ->
                    dreamland.previewFormationPower(borrower.token(), id(), selected.version() - 1, 1, slots));
            rejected("DREAMLAND_FORMATION_INVALID", () -> dreamland.previewFormationPower(borrower.token(), id(),
                    selected.version(), 1, List.of(new Lineup.Slot(9, borrowed))));
            friend(lender, FriendService.Action.BLOCK, borrower);
            rejected("DREAMLAND_FORMATION_INVALID", () ->
                    dreamland.previewFormationPower(borrower.token(), id(), selected.version(), 1, slots));
            clock.setEpochSeconds(selected.resetAtSeconds());
            rejected("DREAMLAND_STATE_CHANGED", () ->
                    dreamland.previewFormationPower(borrower.token(), id(), selected.version(), 1, slots));
            var reset = dreamland.state(borrower.token());
            assertEquals(selected.version() + 1, reset.version());
            assertEquals(ownProfile.panelStats().power(), dreamland.previewFormationPower(borrower.token(), id(),
                    reset.version(), 1, List.of(new Lineup.Slot(2, own))).power());
        } finally {
            clock.reset();
        }
    }

    /** 真实登录后为本测试准备可公开的昵称和零金币。 */
    private Player player(String name) {
        var created = login.login("assist_" + id().substring(0, 16));
        String role = created.role().id();
        jdbc.update("UPDATE game_role SET nickname=?, role_level=100, first_named=TRUE, gold=0 WHERE id=?", name, role);
        return new Player(role, "Bearer " + created.session().accessToken());
    }

    /** 写入该测试角色合法配置的英雄，归属随 Id 持久化。 */
    private String hero(Player player, int template, int level, int star, int stage) {
        String hero = id();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,?)",
                hero, player.role(), template, level, star, stage);
        return hero;
    }

    /** 调用真实好友写入口，保证建立双向关系或清理双方好友状态。 */
    private void friend(Player actor, FriendService.Action action, Player target) {
        friends.change(actor.role(), new FriendService.Command(id(), action, target.role(), 0));
    }

    /** 在当前版本构建助战命令，可保存用于重试验证。 */
    private Command command(Player player, String action, String target) {
        return new Command(id(), dreamland.state(player.token()).version(), action, 0, 0, List.of(), target);
    }

    /** 从持久角色档案读取金币，不依赖客户端资产缓存。 */
    private long gold(Player player) {
        return roles.findById(player.role()).orElseThrow().gold();
    }

    /** 生成协议可接受的独立请求和测试夹具标识。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }

    /** 校验业务拒绝返回可供协议定位原因的稳定码。 */
    private static void rejected(String code, Runnable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action::run).getReason());
    }
}
