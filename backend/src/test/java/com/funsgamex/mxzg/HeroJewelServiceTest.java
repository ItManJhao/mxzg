/**
 * 使用独立 H2 角色验证宝石换装、合成、属性和冻结回执。
 * 夹具只准备需要的英雄星级和真实普通库存，不使用正式服账号或数据库。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroBattleInputService;
import com.funsgamex.mxzg.hero.HeroJewelRepository;
import com.funsgamex.mxzg.hero.HeroJewelRules;
import com.funsgamex.mxzg.hero.HeroJewelService;
import com.funsgamex.mxzg.hero.HeroJewelService.Action;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:hero_jewels;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class HeroJewelServiceTest {
    /** 建立隔离角色和再次认证时的新凭证。 */
    @Autowired private DevelopmentLoginService login;
    /** 与 WebSocket 相同的宝石业务入口。 */
    @Autowired private HeroJewelService service;
    /** 正式宝石定义和真实套装属性入口。 */
    @Autowired private HeroJewelRules rules;
    /** 权威已镶嵌状态。 */
    @Autowired private HeroJewelRepository equipped;
    /** 登录、重连与推送使用的同一资产快照入口。 */
    @Autowired private SessionSnapshotService snapshots;
    /** 实际主线读持久名册时使用的共享战斗属性入口。 */
    @Autowired private HeroBattleInputService battle;
    /** 真实普通库存扣回与查询。 */
    @Autowired private InventoryService inventory;
    /** 同事务资产版本。 */
    @Autowired private RoleRepository roles;
    /** 仅用于测试夹具和回执断言。 */
    @Autowired private JdbcTemplate jdbc;
    /** 供夹具发放和验证外层事务使用。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 隔离角色身份及一名测试英雄。 */
    private record Player(String account, String role, String token, String hero) {}

    /** 单镶、替换、卸下及迟到重放共用实际槽和普通库存。 */
    @Test
    void swapsReturnsAndDoesNotRepeatTheOriginalAction() {
        var player = player(9);
        credit(player, 1011001, 1);
        credit(player, 1011002, 1);
        long before = roles.revision(player.role());
        var initial = changeRequest(player, Action.EQUIP, 1011001, 1, 0);
        var result = service.change(player.token(), initial);
        assertEquals(before + 1, result.assetRevision());
        var firstSlot = worn(player).getFirst();
        assertEquals(0, quantity(player, 1011001));
        assertEquals(List.of(firstSlot), equipped.byRole(player.role()).get(player.hero()));
        var replacement = changeRequest(player, Action.EQUIP, 1011002, 1, 1011001);
        service.change(player.token(), replacement);
        assertEquals(firstSlot.instanceId(), worn(player).getFirst().instanceId());
        assertEquals(1, quantity(player, 1011001));
        assertEquals(0, quantity(player, 1011002));

        rejected("HERO_JEWEL_CHANGED", () -> service.change(player.token(),
            changeRequest(player, Action.UNEQUIP, 0, 1, 1011001)));
        var remove = changeRequest(player, Action.UNEQUIP, 0, 1, 1011002);
        String nextToken = "Bearer " + login.login(player.account()).session().accessToken();
        service.change(nextToken, remove);
        assertTrue(worn(player).isEmpty());
        assertEquals(1, quantity(player, 1011002));
        assertEquals(result, service.change(nextToken, initial));
        assertEquals(before + 3, roles.revision(player.role()));
    }

    /** 一键优先同槽高星；三槽全部镶嵌才应用最低星套装，卸下一枚后取消。 */
    @Test
    void threeSlotsActivateMinimumStarSetAndRespectHeroStar() {
        var player = player(8);
        credit(player, 1011001, 1);
        credit(player, 1011005, 1);
        credit(player, 1021006, 1);
        credit(player, 1031007, 1);
        var wear = changeRequest(player, Action.EQUIP_ALL, 0, 0, 0);
        rejected("HERO_JEWEL_SLOT_LOCKED", () -> service.change(player.token(),
            changeRequest(player, Action.EQUIP, 1031007, 3, 0)));
        assertTrue(service.change(player.token(), wear).changed());
        assertEquals(List.of(1011005, 1021006), worn(player).stream()
            .map(HeroJewelRepository.Item::templateId).toList());
        assertNull(rules.activeSet(worn(player)));
        assertEquals(1, quantity(player, 1011001));

        jdbc.update("UPDATE game_hero SET star=9 WHERE id=?", player.hero());
        long before = roles.revision(player.role());
        assertTrue(service.change(player.token(), changeRequest(player, Action.EQUIP_ALL, 0, 0, 0)).changed());
        assertEquals(5, rules.activeSet(worn(player)).star());
        var attributes = new HashMap<Integer, Long>();
        rules.addAttributes(worn(player), (attr, value) -> attributes.merge(attr, value, Long::sum));
        assertEquals(10L, attributes.get(120));
        assertEquals(2080L, attributes.get(220));
        assertTrue(attributes.containsKey(130), "速度宝石的额外战力属性也参与原属性计算");
        assertFalse(service.change(player.token(), changeRequest(player, Action.EQUIP_ALL, 0, 0, 0)).changed());
        assertEquals(before + 1, roles.revision(player.role()));

        service.change(player.token(), changeRequest(player, Action.UNEQUIP, 0, 1, 1011005));
        assertNull(rules.activeSet(worn(player)));
        service.change(player.token(), changeRequest(player, Action.UNEQUIP_ALL, 0, 0, 0));
        assertTrue(worn(player).isEmpty());
        assertEquals(1, quantity(player, 1011005));
        assertEquals(1, quantity(player, 1021006));
        assertEquals(1, quantity(player, 1031007));
    }

    /** 单合按实际目标配方；一键消耗中间产物后只回净新增，其他槽不参与。 */
    @Test
    void combinesWithinOneSlotAndKeepsOnlyNetRewards() {
        var player = player(9);
        credit(player, 1021001, 10);
        credit(player, 1011001, 30);
        long before = roles.revision(player.role());
        var combine = new HeroJewelService.Request(UUID.randomUUID().toString(), null, Action.COMBINE, 1021002, 0, 0, 2);
        assertEquals(List.of(new RewardGrantService.Reward(1021002, 2)), service.change(player.token(), combine).rewards());
        assertEquals(4, quantity(player, 1021001));
        var combineAll = new HeroJewelService.Request(UUID.randomUUID().toString(), null, Action.COMBINE_ALL, 0, 2, 0, 0);
        var all = service.change(player.token(), combineAll);
        assertEquals(List.of(new RewardGrantService.Reward(1021003, 1)), all.rewards());
        assertEquals(1, quantity(player, 1021001));
        assertEquals(0, quantity(player, 1021002));
        assertEquals(1, quantity(player, 1021003));
        assertEquals(30, quantity(player, 1011001));
        assertEquals(all, service.change(player.token(), combineAll));
        assertEquals(before + 2, roles.revision(player.role()));
        rejected("HERO_JEWEL_RECIPE_INVALID", () -> service.change(player.token(),
            new HeroJewelService.Request(UUID.randomUUID().toString(), null, Action.COMBINE, 1011010, 0, 0, 1)));
    }

    /** 材料变化后旧一键预览不能成交，成功后仍能使用原版本和编号重放。 */
    @Test
    void combineAllGuardsPreviewRevisionAndReplaysCommittedReceipt() {
        var player = player(9);
        credit(player, 1021001, 6);
        long stale = roles.revision(player.role());
        credit(player, 1021001, 3);
        long current = roles.revision(player.role());
        String requestId = UUID.randomUUID().toString();
        rejected("HERO_JEWEL_PREVIEW_CHANGED", () -> service.change(player.token(),
            new HeroJewelService.Request(requestId, null, Action.COMBINE_ALL, 0, 2, 0, 0, stale)));
        assertEquals(9, quantity(player, 1021001));
        assertEquals(current, roles.revision(player.role()));

        var request = new HeroJewelService.Request(requestId, null, Action.COMBINE_ALL, 0, 2, 0, 0, current);
        var result = service.change(player.token(), request);
        assertEquals(current, result.expectedRevision().longValue());
        assertEquals(List.of(new RewardGrantService.Reward(1021003, 1)), result.rewards());
        assertEquals(result, service.change(player.token(), request));
        assertEquals(current + 1, roles.revision(player.role()));
        rejected("IDEMPOTENCY_CONFLICT", () -> service.change(player.token(),
            new HeroJewelService.Request(requestId, null, Action.COMBINE_ALL, 0, 2, 0, 0, stale)));
    }

    /** 归还旧宝石溢出时不消耗新宝石，也不写入回执或推进资产版本。 */
    @Test
    void rollsBackWhenReturningTheReplacedItemFails() {
        var player = player(9);
        credit(player, 1011001, 1);
        credit(player, 1011002, 1);
        service.change(player.token(), changeRequest(player, Action.EQUIP, 1011001, 1, 0));
        credit(player, 1011001, Long.MAX_VALUE);
        long before = roles.revision(player.role());
        var request = changeRequest(player, Action.EQUIP, 1011002, 1, 1011001);
        assertThrows(ArithmeticException.class, () -> service.change(player.token(), request));
        assertEquals(before, roles.revision(player.role()));
        assertEquals(1, quantity(player, 1011002));
        assertEquals(1011001, worn(player).getFirst().templateId());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_hero_jewel_request WHERE role_id=? AND request_id=?",
            Integer.class, player.role(), request.requestId()));
    }

    /** 同一编号并发只扣一次，其他角色不能指定此英雄，消费释放在已有事务内进行。 */
    @Test
    void concurrentReplayAndReleaseKeepOwnership() throws Exception {
        var player = player(9);
        var other = player(9);
        credit(player, 1011001, 1);
        long before = roles.revision(player.role());
        var request = changeRequest(player, Action.EQUIP, 1011001, 1, 0);
        rejected("HERO_NOT_FOUND", () -> service.change(other.token(), request));
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> service.change(player.token(), request));
            var second = executor.submit(() -> service.change(player.token(), request));
            assertEquals(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS));
        }
        assertEquals(before + 1, roles.revision(player.role()));
        assertEquals(0, quantity(player, 1011001));
        rejected("IDEMPOTENCY_CONFLICT", () -> service.change(player.token(), new HeroJewelService.Request(
            request.requestId(), player.hero(), Action.UNEQUIP, 0, 1, 1011001, 0)));
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(player.role());
            service.releaseForConsumedHero(player.role(), player.hero());
            service.releaseForConsumedHero(player.role(), player.hero());
        });
        assertTrue(worn(player).isEmpty());
        assertEquals(1, quantity(player, 1011001));
        assertEquals(before + 2, roles.revision(player.role()));
    }

    /** 实际镶嵌同时改变统一快照的可见槽位、面板攻击和主线输入属性。 */
    @Test
    void appliesOneGemToSnapshotAndMainLineAttributes() {
        var player = player(9);
        jdbc.update("INSERT INTO game_lineup_slot(role_id,position,hero_id) VALUES (?,2,?)", player.role(), player.hero());
        credit(player, 1011001, 1);
        var before = snapshots.snapshot(player.token()).heroes().getFirst();
        var originalInput = battle.current(player.token()).units().getFirst();
        service.change(player.token(), changeRequest(player, Action.EQUIP, 1011001, 1, 0));
        var after = snapshots.snapshot(player.token()).heroes().getFirst();
        var actualInput = battle.current(player.token()).units().getFirst();
        assertEquals(List.of(1011001), after.gems().items().stream().map(HeroJewelRepository.Item::templateId).toList());
        assertTrue(after.panelStats().values().atk() > before.panelStats().values().atk());
        assertEquals(originalInput.attributes().get(220) + 66, actualInput.attributes().get(220));
    }

    /** 创建所需星级的一名英雄，配置编号取现用可升星的琪亚娜。 */
    private Player player(int star) {
        String account = "jewel_" + UUID.randomUUID().toString().substring(0, 12);
        var result = login.login(account);
        String role = result.role().id();
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105010,1,?,0)",
            hero, role, star);
        return new Player(account, role, "Bearer " + result.session().accessToken(), hero);
    }

    /** 通过真实库存事务准备宝石。 */
    private void credit(Player player, int itemId, long quantity) {
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(player.role(), itemId, quantity));
    }

    /** 读取当前独立角色的持久宝石数量。 */
    private long quantity(Player player, int itemId) {
        return inventory.find(player.role(), itemId).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 从权威镶嵌表读取当前英雄状态。 */
    private List<HeroJewelRepository.Item> worn(Player player) {
        return equipped.forHero(player.role(), player.hero());
    }

    /** 构造一次英雄槽位操作，回执测试重用已有请求。 */
    private static HeroJewelService.Request changeRequest(Player player, Action action, int itemId, int slot, int expected) {
        return new HeroJewelService.Request(UUID.randomUUID().toString(), player.hero(), action, itemId, slot, expected, 0);
    }

    /** 使用稳定业务错误而非笼统失败做断言。 */
    private static void rejected(String code, Runnable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action::run).getReason());
    }
}
