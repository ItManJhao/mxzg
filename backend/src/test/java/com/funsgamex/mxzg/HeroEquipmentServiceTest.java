/**
 * 普通装备服务的独立数据库回归。核对真实堆叠与槽位、旧版择优、属性战力、旧选择和回执语义。
 * 所有创建和装备操作都在内存库内进行。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroEquipmentService;
import com.funsgamex.mxzg.hero.HeroEquipmentService.Action;
import com.funsgamex.mxzg.hero.HeroProfile;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.role.RoleRepository;
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

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:ordinary_equipment;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class HeroEquipmentServiceTest {
    /** 建立测试角色，重登重新取凭证。 */
    @Autowired private DevelopmentLoginService login;
    /** 与认证 WebSocket 使用同一真实装备服务。 */
    @Autowired private HeroEquipmentService service;
    /** 背包保留普通装备的原稳定堆叠 ID。 */
    @Autowired private InventoryService inventory;
    /** 装配完整资产，用于验证属性、战力和原槽位。 */
    @Autowired private SessionSnapshotService snapshots;
    /** 用真实角色的资产版本检查幂等与回滚。 */
    @Autowired private RoleRepository roles;
    /** 用事务构造物品发放的测试前置。 */
    @Autowired private PlatformTransactionManager transactions;
    /** 仅用于建立旧历史槽位及读取独立数据库夹具。 */
    @Autowired private JdbcTemplate jdbc;

    /** 测试角色、访问令牌和唯一英雄，凭证仅存在于用例内。 */
    private record Player(String account, String role, String token, String hero) {}

    /** 真实穿戴交换回旧装备；卸下保留槽位附魂，重登及重发均不再次改变资产。 */
    @Test
    void swapAndUnequipKeepSlotAndSynchronize() {
        Player player = player();
        String slot = "9223372036854775811";
        seedWorn(player, slot);
        var bagSword = credit(player, 1001002, 2);
        var original = hero(player);
        long before = roles.revision(player.role());

        var equip = request(player, Action.EQUIP, bagSword, 0, 0);
        var equipped = service.change(player.token(), equip);
        assertTrue(equipped.changed());
        assertEquals(before + 1, equipped.assetRevision());
        assertEquals(1, quantity(player, 1001002));
        assertEquals(1, quantity(player, 1001001));
        var changed = hero(player);
        assertEquals(1001002, changed.equipment().items().getFirst().templateId());
        assertEquals(slot, changed.equipment().items().getFirst().instanceId());
        assertEquals(3, changed.equipment().items().getFirst().soulLevel());
        assertEquals(original.panelStats().values().atk() + 7, changed.panelStats().values().atk());
        assertTrue(changed.panelStats().power() > original.panelStats().power());
        assertEquals(equipped, service.change(player.token(), equip));
        assertEquals(before + 1, roles.revision(player.role()));

        var stale = request(player, Action.UNEQUIP, slot, 1, 1001001);
        assertFailure("HERO_EQUIPMENT_CHANGED", () -> service.change(player.token(), stale));
        var remove = request(player, Action.UNEQUIP, slot, 1, 1001002);
        var removed = service.change(player.token(), remove);
        assertTrue(removed.changed());
        assertEquals(before + 2, removed.assetRevision());
        assertTrue(hero(player).equipment().items().isEmpty());
        assertEquals(2, quantity(player, 1001002));
        assertEquals(bagSword, inventory.find(player.role(), 1001002).orElseThrow().instanceId());
        assertEquals(equipped, service.change(player.token(), equip), "迟到重发不得重新装备");
        assertEquals(before + 2, roles.revision(player.role()));

        var nextToken = "Bearer " + login.login(player.account()).session().accessToken();
        var role = new Player(player.account(), player.role(), nextToken, player.hero());
        assertTrue(hero(role).equipment().items().isEmpty());
        service.change(nextToken, request(role, Action.EQUIP, bagSword, 0, 0));
        assertEquals(changed.equipment(), hero(role).equipment());
        assertEquals(changed.panelStats(), hero(role).panelStats());
    }

    /** 一键按同槽评分严格提升，所有实际更换或摘除共用一个资产版本。 */
    @Test
    void oneKeyUsesBestStackInEachSlotAndLeavesEqualOrWorse() {
        Player player = player();
        credit(player, 1001001, 1);
        credit(player, 1001002, 2);
        for (int template : List.of(1002001, 1003001, 1004001)) {
            credit(player, template, 1);
        }
        // 如线上 WebSocket 一样先取首包，由快照完成正常的挂机状态初始化，再核对装备自身的版本。
        long before = snapshots.snapshot(player.token()).revision();
        var apply = request(player, Action.EQUIP_ALL, null, 0, 0);
        var equipped = service.change(player.token(), apply);
        assertTrue(equipped.changed());
        assertEquals(before + 1, equipped.assetRevision());
        assertEquals(List.of(1001002, 1002001, 1003001, 1004001), hero(player).equipment().items().stream()
                .map(row -> row.templateId()).toList());
        assertEquals(1, quantity(player, 1001001));
        assertEquals(1, quantity(player, 1001002));
        assertEquals(before + 1, roles.revision(player.role()));
        var tryAgain = request(player, Action.EQUIP_ALL, null, 0, 0);
        assertFalse(service.change(player.token(), tryAgain).changed());
        assertEquals(before + 1, roles.revision(player.role()));
        assertFailure("IDEMPOTENCY_CONFLICT", () -> service.change(player.token(), new HeroEquipmentService.Request(
                tryAgain.requestId(), player.hero(), Action.UNEQUIP_ALL, null, 0, 0)));

        var clear = request(player, Action.UNEQUIP_ALL, null, 0, 0);
        var removed = service.change(player.token(), clear);
        assertTrue(removed.changed());
        assertEquals(removed, service.change(player.token(), clear));
        assertEquals(before + 2, roles.revision(player.role()));
        assertTrue(hero(player).equipment().items().isEmpty());
        assertEquals(2, quantity(player, 1001002));
        assertEquals(1, quantity(player, 1004001));
    }

    /** 他人英雄、他人物品和非普通装备不落任何回执或资产。 */
    @Test
    void rejectsForeignAndIneligibleAssets() {
        Player owner = player();
        Player other = player();
        var otherSword = credit(other, 1001002, 1);
        var experience = credit(owner, 900101, 100);
        long before = roles.revision(owner.role());
        assertFailure("EQUIPMENT_NOT_AVAILABLE", () -> service.change(owner.token(),
                request(owner, Action.EQUIP, otherSword, 0, 0)));
        assertFailure("EQUIPMENT_NOT_AVAILABLE", () -> service.change(owner.token(),
                request(owner, Action.EQUIP, experience, 0, 0)));
        assertFailure("HERO_NOT_FOUND", () -> service.change(owner.token(),
                request(other, Action.EQUIP_ALL, null, 0, 0)));
        assertEquals(before, roles.revision(owner.role()));
        assertEquals(1, quantity(other, 1001002));
        assertEquals(100, quantity(owner, 900101));
    }

    /** 归还旧装备失败时回滚槽位、已扣物品、统一版本和原回执。 */
    @Test
    void rollsBackAfterTheSlotChangedWhenReturningOldEquipmentFails() {
        Player player = player();
        seedWorn(player, "9223372036854775812");
        var bagSword = credit(player, 1001002, 1);
        credit(player, 1001001, Long.MAX_VALUE);
        long before = roles.revision(player.role());
        var equip = request(player, Action.EQUIP, bagSword, 0, 0);
        assertThrows(ArithmeticException.class, () -> service.change(player.token(), equip));
        assertEquals(before, roles.revision(player.role()));
        assertEquals(1001001, hero(player).equipment().items().getFirst().templateId());
        assertEquals(1, quantity(player, 1001002));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_hero_equipment_request WHERE role_id=?",
                Integer.class, player.role()));
    }

    /** 同一个编号并发提交只扣一次，后到线程返回同一持久结果。 */
    @Test
    void concurrentDuplicateKeepsOneDebitAndOneRevision() throws Exception {
        Player player = player();
        var bagSword = credit(player, 1001001, 1);
        long before = roles.revision(player.role());
        var equip = request(player, Action.EQUIP, bagSword, 0, 0);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> service.change(player.token(), equip));
            var second = executor.submit(() -> service.change(player.token(), equip));
            assertEquals(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS));
        }
        assertEquals(before + 1, roles.revision(player.role()));
        assertEquals(0, quantity(player, 1001001));
        assertEquals(1, hero(player).equipment().items().size());
    }

    /** 创建有一名旧新手英雄的独立角色。 */
    private Player player() {
        String account = "equipment_" + UUID.randomUUID().toString().substring(0, 12);
        var result = login.login(account);
        String role = result.role().id();
        String heroId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10304012,12,4,0)",
                heroId, role);
        return new Player(account, role, "Bearer " + result.session().accessToken(), heroId);
    }

    /** 直接载入旧长 ID 和槽位附魂，模拟数据库迁移前留下的装备。 */
    private void seedWorn(Player player, String slotId) {
        jdbc.update("INSERT INTO game_equipment(id,role_id,hero_id,template_id,slot,soul_level) VALUES (?,?,?,1001001,1,3)",
                slotId, player.role(), player.hero());
    }

    /** 对测试角色按真实事务发放，返回背包唯一堆叠 ID。 */
    private String credit(Player player, int item, long amount) {
        return new TransactionTemplate(transactions).execute(status -> inventory.credit(player.role(), item, amount).instanceId());
    }

    /** 查询当前角色同一普通堆叠，缺少记录时余额为 0。 */
    private long quantity(Player player, int item) {
        return inventory.find(player.role(), item).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 读取与连接首包相同的权威英雄投影。 */
    private HeroProfile hero(Player player) {
        return snapshots.snapshot(player.token()).heroes().getFirst();
    }

    /** 每次手动操作使用新编号，重放测试直接复用请求。 */
    private static HeroEquipmentService.Request request(Player player, Action action, String equipment, int slot, int template) {
        return new HeroEquipmentService.Request(UUID.randomUUID().toString(), player.hero(), action, equipment, slot, template);
    }

    /** 错误稳定码保持可由客户端统一提示。 */
    private static void assertFailure(String code, Runnable operation) {
        assertEquals(code, assertThrows(ResponseStatusException.class, operation::run).getReason());
    }
}
