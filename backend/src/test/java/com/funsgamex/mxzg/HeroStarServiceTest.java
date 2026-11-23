/**
 * 升星事务回归使用独立 H2 库和随机账号，覆盖准确星级、材料保护、扣费与原回执重放。
 * 测试准备专用英雄与装备夹具，真实升星和升级均走领域服务。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.GodEquipmentRepository;
import com.funsgamex.mxzg.hero.GodEquipmentRules;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.hero.HeroLevelService;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.hero.HeroStarRules;
import com.funsgamex.mxzg.hero.HeroStarService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:hero_star;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class HeroStarServiceTest {
    /** 从真实开发入口新建独立角色。 */
    @Autowired private DevelopmentLoginService login;
    /** 真实升星事务入口。 */
    @Autowired private HeroStarService stars;
    /** 真实普通升级，生成升星后需要保存的升级回执。 */
    @Autowired private HeroLevelService levels;
    /** 读取准确成长返还。 */
    @Autowired private HeroGrowthRules growth;
    /** 升星后重新读唯一名册与最高图鉴状态。 */
    @Autowired private HeroRepository heroes;
    /** 核对金币钱包和资产版本。 */
    @Autowired private RoleRepository roles;
    /** 核对材料与卸装备的实际库存。 */
    @Autowired private InventoryService inventory;
    /** 读取真实神装实例与持久词条。 */
    @Autowired private GodEquipmentRepository godEquipment;
    /** 给测试实例选择正式服定义的部位和随机词条。 */
    @Autowired private GodEquipmentRules godRules;
    /** 准备当前内存库专用材料和关系。 */
    @Autowired private JdbcTemplate jdbc;

    /** 本次测试的合成账号，不接触其他角色。 */
    private record Player(String roleId, String token) {}

    /** 升星后保留目标实例、删除材料、返还完整成长和装备，同键仅返回原收据。 */
    @Test void upgradesAndRefundsWhileKeepingPreviousReceipts() {
        var player = player();
        String target = hero(player, 10105010, 5, 1, 0);
        String mainMaterial = hero(player, 10105010, 5, 30, 1);
        String namedMaterial = hero(player, 10104005, 5, 1, 0);
        var otherMaterials = List.of(hero(player, 10105008, 5, 1, 0), hero(player, 10105007, 5, 1, 0),
                hero(player, 10105009, 5, 1, 0));
        jdbc.update("UPDATE game_role SET gold=50000 WHERE id=?", player.roleId());
        stack(player, 900101, 50000);
        var earlier = new HeroLevelService.Request(UUID.randomUUID().toString(), 30);
        var oldReceipt = levels.upgrade(player.token(), mainMaterial, earlier);
        jdbc.update("INSERT INTO game_equipment(id,role_id,template_id,slot,soul_level,hero_id,equipped)"
                        + " VALUES (?,?,?,?,?,?,TRUE)",
                UUID.randomUUID().toString(), player.roleId(), 1001001, 1, 0, mainMaterial);
        var request = new HeroStarService.Request(UUID.randomUUID().toString(), target, 5, List.of(
                materials(0, mainMaterial), materials(1, namedMaterial),
                new HeroStarService.Materials(2, otherMaterials, false)));
        long revision = roles.revision(player.roleId());
        long gold = roles.findById(player.roleId()).orElseThrow().gold();
        long experience = quantity(player, 900101);
        long stone = quantity(player, 900102);
        long equipment = quantity(player, 1001001);
        var receipt = stars.upgrade(player.token(), request);
        var cost = growth.costBetween(1, 31);
        var stageCost = growth.stageRequirement(0);

        assertEquals(6, heroes.find(player.roleId(), target).orElseThrow().star());
        assertTrue(heroes.find(player.roleId(), mainMaterial).isEmpty());
        assertTrue(heroes.find(player.roleId(), namedMaterial).isEmpty());
        for (String material : otherMaterials) {
            assertTrue(heroes.find(player.roleId(), material).isEmpty());
        }
        assertTrue(heroes.illustrations(player.roleId()).contains(new HeroRepository.Illustration(10105010, 6)));
        assertEquals(List.of(new HeroStarRules.Amount(900001, cost.gold() + stageCost.gold()),
                new HeroStarRules.Amount(900101, cost.experience()), new HeroStarRules.Amount(900102, stageCost.stone())),
                receipt.refunded());
        assertEquals(gold + cost.gold() + stageCost.gold(), roles.findById(player.roleId()).orElseThrow().gold());
        assertEquals(experience + cost.experience(), quantity(player, 900101));
        assertEquals(stone + stageCost.stone(), quantity(player, 900102));
        assertEquals(equipment + 1, quantity(player, 1001001));
        assertEquals(revision + 1, receipt.assetRevision());
        assertEquals(oldReceipt, levels.status(player.token(), earlier.requestId()).receipt());
        assertEquals(receipt, stars.upgrade(player.token(), request));
        assertEquals(revision + 1, roles.revision(player.roleId()));
    }

    /** 精确拒绝异星、锁定、上阵、重复、自身和跨角色材料，变更不能产生资产到账。 */
    @Test void rejectsUnavailableOrInexactMaterialWithoutChangingAssets() {
        var player = player();
        var foreign = player();
        String target = hero(player, 10105010, 5, 1, 0);
        String main = hero(player, 10105010, 5, 1, 0);
        String named = hero(player, 10104005, 5, 1, 0);
        String otherA = hero(player, 10105008, 5, 1, 0);
        String otherB = hero(player, 10105007, 5, 1, 0);
        String otherC = hero(player, 10105009, 5, 1, 0);
        String wrong = hero(player, 10105010, 6, 1, 0);
        String external = hero(foreign, 10105010, 5, 1, 0);
        long revision = roles.revision(player.roleId());

        rejected("HERO_STAR_MATERIALS", player, target, materials(0, wrong), materials(1, named),
                materials(2, otherA, otherB, otherC));
        rejected("HERO_STAR_MATERIAL_UNAVAILABLE", player, target, materials(0, external), materials(1, named),
                materials(2, otherA, otherB, otherC));
        rejected("INVALID_HERO_STAR_REQUEST", player, target, materials(0, target), materials(1, named),
                materials(2, otherA, otherB, otherC));
        rejected("INVALID_HERO_STAR_REQUEST", player, target, materials(0, main), materials(1, named),
                materials(2, otherA, otherB, main));
        jdbc.update("UPDATE game_hero SET is_locked=TRUE WHERE id=?", main);
        rejected("HERO_STAR_MATERIAL_UNAVAILABLE", player, target, materials(0, main), materials(1, named),
                materials(2, otherA, otherB, otherC));
        jdbc.update("INSERT INTO game_lineup_slot(role_id,position,hero_id) VALUES (?,?,?)", player.roleId(), 2, named);
        jdbc.update("UPDATE game_hero SET is_locked=FALSE WHERE id=?", main);
        rejected("HERO_STAR_MATERIAL_UNAVAILABLE", player, target, materials(0, main), materials(1, named),
                materials(2, otherA, otherB, otherC));
        assertEquals(revision, roles.revision(player.roleId()));
        assertEquals(5, heroes.find(player.roleId(), target).orElseThrow().star());
    }

    /** 替代物品不足时回滚较早扣除的进阶石，到账后仅对实际所选行扣一件替代品。 */
    @Test void chargesExplicitReplacementAndRollsBackEarlierDebit() {
        var player = player();
        String target = hero(player, 10105008, 9, 1, 0);
        String first = hero(player, 10105008, 5, 1, 0);
        String second = hero(player, 10105008, 5, 1, 0);
        String fire = hero(player, 10105010, 6, 1, 0);
        stack(player, 900102, 10000);
        stack(player, 901809, 0);
        var request = new HeroStarService.Request(UUID.randomUUID().toString(), target, 9,
                List.of(materials(0, first, second), materials(1, fire), new HeroStarService.Materials(2, List.of(), true)));
        long revision = roles.revision(player.roleId());
        assertEquals("INSUFFICIENT_HERO_STAR_ITEMS",
                assertThrows(ResponseStatusException.class, () -> stars.upgrade(player.token(), request)).getReason());
        assertEquals(10000, quantity(player, 900102));
        assertEquals(9, heroes.find(player.roleId(), target).orElseThrow().star());
        assertEquals(revision, roles.revision(player.roleId()));
        stack(player, 901809, 1);
        var receipt = stars.upgrade(player.token(), request);
        assertEquals(10, receipt.toStar());
        assertEquals(0, quantity(player, 900102));
        assertEquals(0, quantity(player, 901809));
        assertEquals(revision + 1, roles.revision(player.roleId()));
        var different = new HeroStarService.Request(request.requestId(), target, 9,
                List.of(materials(0, first), materials(1, fire), new HeroStarService.Materials(2, List.of(), true)));
        assertEquals("IDEMPOTENCY_CONFLICT",
                assertThrows(ResponseStatusException.class, () -> stars.upgrade(player.token(), different)).getReason());
    }

    /** 以真实九星英雄替代道具选择，镶嵌退回普通库存，神装保留同一实例及词条。 */
    @Test void restoresJewelAndGodEquipmentFromConsumedHero() {
        var player = player();
        String target = hero(player, 10105008, 9, 1, 0);
        String first = hero(player, 10105008, 5, 1, 0);
        String second = hero(player, 10105008, 5, 1, 0);
        String fire = hero(player, 10105010, 6, 1, 0);
        String equippedMaterial = hero(player, 10105010, 9, 1, 0);
        stack(player, 900102, 10000);
        jdbc.update("INSERT INTO game_hero_jewel(id,role_id,hero_id,slot,template_id) VALUES (?,?,?,?,?)",
                UUID.randomUUID().toString(), player.roleId(), equippedMaterial, 1, 1011001);
        var definition = godRules.require(1042110);
        var modifiers = godRules.rollModifiers(definition, new Random(4020));
        String instance = godEquipment.create(player.roleId(), definition, modifiers);
        godEquipment.wear(player.roleId(), instance, equippedMaterial);
        var request = new HeroStarService.Request(UUID.randomUUID().toString(), target, 9,
                List.of(materials(0, first, second), materials(1, fire), materials(2, equippedMaterial)));
        long jewels = quantity(player, 1011001);
        long revision = roles.revision(player.roleId());
        assertEquals(10, stars.upgrade(player.token(), request).toStar());
        var returned = godEquipment.list(player.roleId()).getFirst();
        assertEquals(instance, returned.instanceId());
        assertEquals(modifiers, returned.modifiers());
        assertNull(returned.heroId());
        assertEquals(jewels + 1, quantity(player, 1011001));
        assertEquals(revision + 1, roles.revision(player.roleId()));
    }

    /** 创建真实本机区角色及其有效会话。 */
    private Player player() {
        var account = login.login("star_" + UUID.randomUUID().toString().substring(0, 14), "local-1");
        return new Player(account.role().id(), "Bearer " + account.session().accessToken());
    }

    /** 只在该测试库注入给定成长的真实英雄记录，避免依赖随机召唤。 */
    private String hero(Player player, int type, int star, int level, int stage) {
        var id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,?)",
                id, player.roleId(), type, level, star, stage);
        return id;
    }

    /** 设置专用素材余额，合法零保留库存身份。 */
    private void stack(Player player, int itemId, long amount) {
        if (jdbc.update("UPDATE game_inventory SET quantity=? WHERE role_id=? AND item_id=?",
                amount, player.roleId(), itemId) == 0) {
            jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,?,?,?)",
                    player.roleId(), itemId, amount, UUID.randomUUID().toString());
        }
    }

    /** 读取当前真实库存数量，缺失视为空。 */
    private long quantity(Player player, int itemId) {
        return inventory.find(player.roleId(), itemId).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 按升星表原顺序选择纯英雄的一行。 */
    private static HeroStarService.Materials materials(int row, String... heroes) {
        return new HeroStarService.Materials(row, List.of(heroes), false);
    }

    /** 通过真实事务确认预期错误码，测试不会因为泛化异常而误通过。 */
    private void rejected(String reason, Player player, String target, HeroStarService.Materials... selections) {
        var request = new HeroStarService.Request(UUID.randomUUID().toString(), target, 5, List.of(selections));
        assertEquals(reason, assertThrows(ResponseStatusException.class,
                () -> stars.upgrade(player.token(), request)).getReason());
    }
}
