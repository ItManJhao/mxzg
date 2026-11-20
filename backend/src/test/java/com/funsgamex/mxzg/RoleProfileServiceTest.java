/** 独立 H2 验证个人空间的头像、装饰期限、图鉴及改名资产事务。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroGrantService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleProfileService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleService;
import com.funsgamex.mxzg.role.RoleTitle;
import com.funsgamex.mxzg.time.GameClock;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:role_personal_space;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class RoleProfileServiceTest {
    /** 通过正常入口创建隔离角色与有效会话。 */
    @Autowired private DevelopmentLoginService login;

    /** 被测的自身资料服务。 */
    @Autowired private RoleProfileService profiles;

    /** 保存首次命名并读取改名后的真实持久角色资料。 */
    @Autowired private RoleService names;

    /** 读取版本并为独立角色准备钱包。 */
    @Autowired private RoleRepository roles;

    /** 以真实发奖路径准备图鉴英雄。 */
    @Autowired private HeroGrantService heroes;

    /** 准备真实改名卡并核对扣除后的普通库存。 */
    @Autowired private InventoryService inventory;

    /** 建立测试用外层发奖及回滚事务。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 仅用于准备恢复旧状态以及未接入发放玩法的称号测试记录。 */
    @Autowired private JdbcTemplate jdbc;

    /** 头像框激活时控制统一游戏时间，测完还原为真实时间。 */
    @Autowired private GameClock clock;

    /** 当前独立角色、用于重登的开发账号和真实认证参数。 */
    private record Player(String account, String id, String token) {}

    /** 只有当前角色图鉴能授权形象，删除已获得的英雄实例也不丢失已解锁形象。 */
    @Test
    void artworkUsesPrivateHistoricalIllustration() {
        Player owner = player();
        Player other = player();
        int available = 110_101_001;
        assertEquals(List.of(), profiles.images(owner.token()));
        assertRejected("ROLE_IMAGE_UNAVAILABLE", () -> profiles.changeImage(owner.token(), available));
        String heroId = new TransactionTemplate(transactions).execute(status ->
            heroes.grant(owner.id(), 10_101_001, 1).getFirst().instanceId());
        assertEquals(List.of(available), profiles.images(owner.token()));
        assertEquals(List.of(), profiles.images(other.token()));
        assertRejected("ROLE_IMAGE_UNAVAILABLE", () -> profiles.changeImage(other.token(), available));
        assertRejected("ROLE_IMAGE_UNAVAILABLE", () -> profiles.changeImage(owner.token(), 210_101_001));
        assertRejected("ROLE_IMAGE_UNAVAILABLE", () -> profiles.changeImage(owner.token(), 10_101_001));
        jdbc.update("DELETE FROM game_hero WHERE id=? AND role_id=?", heroId, owner.id());

        var before = names.current(owner.token()).basics();
        long revision = roles.revision(owner.id());
        profiles.changeImage(owner.token(), available);
        var after = names.current(owner.token()).basics();
        assertEquals(available, after.imageId());
        assertEquals(before.headId(), after.headId());
        assertEquals(before.borderId(), after.borderId());
        assertEquals(revision + 1, roles.revision(owner.id()));
        profiles.changeImage(owner.token(), available);
        assertEquals(revision + 1, roles.revision(owner.id()));
        assertEquals(available, login.login(owner.account()).role().basics().imageId());
    }

    /** 免费头像与历史图鉴解锁都由本人持有，佩戴后统一版本只更新一次。 */
    @Test
    void avatarFollowsPrivateHeroHistory() {
        Player owner = player();
        Player other = player();
        int heroAvatar = 10_101_001;
        assertEquals(List.of(1), profiles.decorations(owner.token()).headIds());
        assertRejected("ROLE_HEAD_UNAVAILABLE", () -> profiles.changeHead(owner.token(), heroAvatar));
        assertRejected("ROLE_HEAD_UNAVAILABLE", () -> profiles.changeHead(owner.token(), 30_101_001));

        String heroId = new TransactionTemplate(transactions).execute(status ->
            heroes.grant(owner.id(), heroAvatar, 1).getFirst().instanceId());
        jdbc.update("DELETE FROM game_hero WHERE id=? AND role_id=?", heroId, owner.id());
        assertEquals(List.of(1, heroAvatar), profiles.decorations(owner.token()).headIds());
        assertEquals(List.of(1), profiles.decorations(other.token()).headIds());
        long revision = roles.revision(owner.id());
        profiles.changeHead(owner.token(), heroAvatar);
        profiles.changeHead(owner.token(), heroAvatar);
        assertEquals(revision + 1, roles.revision(owner.id()));
        assertEquals(heroAvatar, login.login(owner.account()).role().basics().headId());
    }

    /** 头像框先扣道具激活再佩戴，到期查询恢复旧版免费框。 */
    @Test
    void borderActivationAndEquippingKeepTheirOwnState() {
        Player owner = player();
        Player other = player();
        int borderId = 5;
        int itemId = 1_005_005;
        var defaultBorder = new RoleProfileService.RoleBorder(0, -1);
        assertEquals(List.of(defaultBorder), profiles.decorations(owner.token()).borders());
        assertRejected("ROLE_BORDER_UNAVAILABLE", () -> profiles.changeBorder(owner.token(), borderId));
        assertRejected("ROLE_BORDER_COST_NOT_ENOUGH", () -> profiles.activateBorder(owner.token(), borderId));
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(owner.id(), itemId, 2));

        clock.setEpochSeconds(Instant.parse("2026-11-20T03:00:00Z").getEpochSecond());
        try {
            long revision = roles.revision(owner.id());
            profiles.activateBorder(owner.token(), borderId);
            profiles.activateBorder(owner.token(), borderId);
            assertEquals(revision + 1, roles.revision(owner.id()));
            assertEquals(0, names.current(owner.token()).basics().borderId());
            assertEquals(1, inventory.find(owner.id(), itemId).orElseThrow().quantity());
            var activated = new RoleProfileService.RoleBorder(borderId,
                Instant.parse("2026-11-27T16:00:00Z").getEpochSecond());
            assertEquals(List.of(defaultBorder, activated), profiles.decorations(owner.token()).borders());
            assertEquals(List.of(defaultBorder), profiles.decorations(other.token()).borders());
            profiles.changeBorder(owner.token(), borderId);
            assertEquals(borderId, names.current(owner.token()).basics().borderId());

            clock.setEpochSeconds(activated.expiresAtSeconds() + 1);
            assertRejected("ROLE_BORDER_UNAVAILABLE", () -> profiles.changeBorder(owner.token(), borderId));
            assertEquals(List.of(defaultBorder), profiles.decorations(owner.token()).borders());
            assertEquals(0, names.current(owner.token()).basics().borderId());
            assertEquals(revision + 3, roles.revision(owner.id()));
        } finally {
            clock.reset();
        }
    }

    /** 贵重标记使用角色真实充值额，零级亦可持久化聊天展示偏好。 */
    @Test
    void peerageVisibilityPersistsWithoutARecharge() {
        Player owner = player();
        Player other = player();
        assertEquals(0, profiles.decorations(owner.token()).totalRecharge());
        assertTrue(profiles.decorations(owner.token()).showPeerage());
        long revision = roles.revision(owner.id());
        profiles.setPeerageVisibility(owner.token(), false);
        profiles.setPeerageVisibility(owner.token(), false);
        assertEquals(revision + 1, roles.revision(owner.id()));
        assertTrue(profiles.decorations(other.token()).showPeerage());

        jdbc.update("UPDATE game_role SET total_recharge=? WHERE id=?", 6_100_000L, owner.id());
        var reentered = login.login(owner.account()).session().accessToken();
        var restored = profiles.decorations("Bearer " + reentered);
        assertEquals(6_100_000L, restored.totalRecharge());
        assertFalse(restored.showPeerage());
    }

    /** 持有改名卡时不扣钻；用完卡后按原价扣钻，同名重试和错误不重复扣费。 */
    @Test
    void renameUsesOriginalCostsAndOneRevisionPerChange() {
        Player owner = namedPlayer();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.creditCurrency(owner.id(), 0, 1000);
            inventory.credit(owner.id(), 902044, 1);
        });
        long revision = roles.revision(owner.id());
        assertRejected("ROLE_RENAME_PAYMENT_INVALID", () -> profiles.rename(owner.token(), "青云", 1));
        assertEquals(revision, roles.revision(owner.id()));

        profiles.rename(owner.token(), "青云", 2);
        assertEquals("青云", names.current(owner.token()).nickname());
        assertEquals(1000, names.current(owner.token()).diamonds());
        assertEquals(0, cardBalance(owner));
        assertEquals(++revision, roles.revision(owner.id()));
        assertRejected("ROLE_NAME_SAME", () -> profiles.rename(owner.token(), "青云", 2));
        assertRejected("ROLE_RENAME_COST_NOT_ENOUGH", () -> profiles.rename(owner.token(), "翠羽", 2));
        profiles.rename(owner.token(), "翠羽", 1);
        assertEquals(112, names.current(owner.token()).diamonds());
        assertEquals(++revision, roles.revision(owner.id()));
        assertRejected("ROLE_RENAME_COST_NOT_ENOUGH", () -> profiles.rename(owner.token(), "晚钟", 1));
        assertEquals(revision, roles.revision(owner.id()));
        assertEquals("翠羽", login.login(owner.account()).role().nickname());
    }

    /** 同服两个角色争用一名时仅一个扣费；外层事务撤销时名称、余额和版本保持原值。 */
    @Test
    void renameClaimsUniquelyAndRollsBack() throws Exception {
        Player first = namedPlayer();
        Player second = namedPlayer();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            inventory.credit(first.id(), 902044, 1);
            inventory.credit(second.id(), 902044, 1);
        });
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var a = executor.submit(() -> renameAfter(start, first));
            var b = executor.submit(() -> renameAfter(start, second));
            start.countDown();
            assertEquals(List.of("OK", "ROLE_NAME_EXISTS"), List.of(a.get(), b.get()).stream().sorted().toList());
        }
        assertEquals(1, cardBalance(first) + cardBalance(second));
        Player loser = cardBalance(first) == 1 ? first : second;
        long revision = roles.revision(loser.id());
        var before = names.current(loser.token());
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            profiles.rename(loser.token(), "断云", 2);
            status.setRollbackOnly();
        });
        assertEquals(1, cardBalance(loser));
        assertEquals(before, names.current(loser.token()));
        assertEquals(revision, roles.revision(loser.id()));
    }

    /** 未命名角色不能用付费改名跳过首次命名，历史角色改名也不应获取赠礼。 */
    @Test
    void renamePreservesWelcomeGiftEligibility() {
        Player player = player();
        assertRejected("ROLE_NAME_NOT_CONFIRMED", () -> profiles.rename(player.token(), "白沙", 1));
        jdbc.update("UPDATE game_role SET first_named=TRUE WHERE id=?", player.id());
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(player.id(), 902044, 1));
        profiles.rename(player.token(), "白沙", 2);
        assertFalse(names.current(player.token()).welcomeGiftAvailable());
        assertTrue(names.current(player.token()).firstNamed());
    }

    /** 称号只查询当前角色的持久记录，按旧协议回传永久、回收及原到期秒。 */
    @Test
    void titlesAreOwnedAndRetainExactLegacyEndTime() {
        Player owner = player();
        Player other = player();
        for (var title : List.of(new RoleTitle(1, -1), new RoleTitle(2, 0), new RoleTitle(3, 1))) {
            jdbc.update("INSERT INTO game_role_title(role_id,title_id,end_time_seconds) VALUES (?,?,?)",
                owner.id(), title.idx(), title.endTimeSeconds());
        }
        long revision = roles.revision(owner.id());
        assertEquals(List.of(new RoleTitle(1, -1), new RoleTitle(2, 0), new RoleTitle(3, 1)), profiles.titles(owner.token()));
        assertEquals(List.of(), profiles.titles(other.token()));
        assertEquals(revision, roles.revision(owner.id()));
    }

    /** 用 V40 中真实已有的名字和两笔星级数据验证 V41 的增量回填。 */
    @Test
    void migrationBackfillsRealProgressOnly() {
        var source = new DriverManagerDataSource("jdbc:h2:mem:role_profile_upgrade;MODE=MySQL;"
            + "DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "sa", "");
        var database = new JdbcTemplate(source);
        try {
            Flyway.configure().dataSource(source).target("40").load().migrate();
            database.update("""
                INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id,claimed_nickname)
                VALUES ('named','named','拥有名字',1,0,0,'named','local-1',?),
                    ('legacy','legacy','旧角色',1,0,0,'legacy','local-1',NULL)
                """, "拥有名字".getBytes(StandardCharsets.UTF_8));
            database.update("""
                INSERT INTO game_hero(id,role_id,template_id,hero_level,star)
                VALUES ('hero1','legacy',10105007,1,5),('hero2','legacy',10105007,1,6)
                """);
            Flyway.configure().dataSource(source).load().migrate();
            assertEquals(List.of("named"), database.queryForList(
                "SELECT id FROM game_role WHERE welcome_gift_eligible=TRUE", String.class));
            assertEquals(List.of(6), database.queryForList(
                "SELECT max_star FROM game_hero_illustration WHERE role_id='legacy' AND template_id=10105007", Integer.class));
            assertEquals(List.of(), database.queryForList("SELECT role_id FROM game_role_title", String.class));
        } finally {
            database.execute("SHUTDOWN");
        }
    }

    /** 用独立账号创建未经首次命名的新角色。 */
    private Player player() {
        String account = "profile" + UUID.randomUUID().toString().substring(0, 12);
        var result = login.login(account);
        return new Player(account, result.role().id(), "Bearer " + result.session().accessToken());
    }

    /** 按真实首次命名入口准备已经命名的角色。 */
    private Player namedPlayer() {
        var player = player();
        names.setName(player.token(), names.randomName(player.token()));
        return player;
    }

    /** 返回持久改名卡数量，记录不存在时为零。 */
    private long cardBalance(Player player) {
        return inventory.find(player.id(), 902044).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 从同一门闩启动两个角色的真实改名，并收集业务结果。 */
    private String renameAfter(CountDownLatch start, Player player) throws InterruptedException {
        start.await();
        try {
            profiles.rename(player.token(), "寒川", 2);
            return "OK";
        } catch (ResponseStatusException rejected) {
            return rejected.getReason();
        }
    }

    /** 断言付款或选择失败返回稳定业务码。 */
    private static void assertRejected(String reason, Runnable action) {
        assertEquals(reason, assertThrows(ResponseStatusException.class, action::run).getReason());
    }
}
