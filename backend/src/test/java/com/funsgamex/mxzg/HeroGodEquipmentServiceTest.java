/**
 * 神装事务与同源规则回归。全部实例、扣费与回执在隔离 H2，
 * 重点检查真实保底产出、角色和槽位校验、换装归还及原请求重放。
 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.*;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.GodEquipmentRepository;
import com.funsgamex.mxzg.hero.GodEquipmentRules;
import com.funsgamex.mxzg.hero.HeroGodEquipmentService;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:hero_god_equipment;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class HeroGodEquipmentServiceTest {
    /** 每个用例的新账号、所属角色、凭证和英雄。 */
    private record Player(String roleId, String token, String heroId) {}
    /** 创建测试角色所需的普通服务。 */
    @Autowired private DevelopmentLoginService login;
    /** 生产同一神装事务入口。 */
    @Autowired private HeroGodEquipmentService service;
    /** 仅用于构造前置神装或直接核对独立持久关系。 */
    @Autowired private GodEquipmentRepository equipment;
    /** 生产同表投影，测试最低星与多档叠加。 */
    @Autowired private GodEquipmentRules rules;
    /** 核对旧券支付和神装不落普通堆叠。 */
    @Autowired private InventoryService inventory;
    /** 核对回执及原资产版本。 */
    @Autowired private RoleRepository roles;
    /** 读取真实名册面板，验证装备事务中的属性不只在规则层生效。 */
    @Autowired private HeroRepository heroes;
    /** 限测试使用的初始状态写入口。 */
    @Autowired private JdbcTemplate jdbc;
    /** 构造明确拥有的神装与券时使用原事务管理器。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 免费触发原第十五抽保底，神装入独立库存，同请求重放不会生成第二件。 */
    @Test
    void freeGuaranteeCreatesIndependentItemAndReplays() {
        Player player = player(70, 6);
        jdbc.update("INSERT INTO game_god_equipment_lottery(role_id,draw_count) VALUES (?,14)", player.roleId());
        long before = roles.revision(player.roleId());
        assertTrue(service.state(player.roleId()).freeDraw());
        var request = new HeroGodEquipmentService.DrawRequest(id(), 1, 0);
        var receipt = service.draw(player.token(), request);

        assertEquals(0, receipt.diamondsPaid());
        assertEquals(before + 1, receipt.assetRevision());
        var state = service.state(player.roleId());
        assertEquals(0, state.drawCount());
        assertFalse(state.freeDraw());
        assertEquals(1, state.items().size());
        var item = state.items().getFirst();
        assertNull(item.heroId());
        assertEquals(item.templateId(), receipt.rewards().getFirst().templateId());
        assertTrue(inventory.list(player.roleId()).stream().noneMatch(row -> row.itemId() == item.templateId()));
        assertEquals(receipt, service.draw(player.token(), request));
        assertEquals(state.items(), service.state(player.roleId()).items());
        assertFailure("GOD_EQUIPMENT_DRAW_PRICE_CHANGED",
                () -> service.draw(player.token(), new HeroGodEquipmentService.DrawRequest(id(), 1, 0)));
        assertEquals(receipt.assetRevision(), roles.revision(player.roleId()));

        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(player.roleId(), 901815, 1));
        var paidByToken = service.draw(player.token(), new HeroGodEquipmentService.DrawRequest(id(), 1, 0));
        assertEquals(0, paidByToken.diamondsPaid());
        assertEquals(1, service.state(player.roleId()).drawCount());
        assertTrue(inventory.list(player.roleId()).stream().noneMatch(row -> row.itemId() == 901815));
    }

    /** 同部位替换归还原实例，旧选择和他人物品均不能改变资产。 */
    @Test
    void replaceAndRemovePreserveInstancesAndRejectStaleClicks() {
        Player player = player(70, 6);
        Player other = player(70, 6);
        String first = create(player, 1040101);
        String next = create(player, 1040102);
        String foreign = create(other, 1040103);
        long before = roles.revision(player.roleId());
        long initialAttack = heroes.find(player.roleId(), player.heroId()).orElseThrow().panelStats().values().atk();
        var equip = change(player, HeroGodEquipmentService.Action.EQUIP, first, null);
        var firstReceipt = service.change(player.token(), equip);
        assertEquals(before + 1, firstReceipt.assetRevision());
        assertEquals(first, equipment.equipped(player.roleId()).get(player.heroId()).getFirst().instanceId());
        assertEquals(initialAttack + 387,
                heroes.find(player.roleId(), player.heroId()).orElseThrow().panelStats().values().atk());
        assertFailure("GOD_EQUIPMENT_CHANGED",
                () -> service.change(player.token(), change(player, HeroGodEquipmentService.Action.EQUIP, next, null)));
        assertFailure("GOD_EQUIPMENT_NOT_FOUND",
                () -> service.change(player.token(), change(player, HeroGodEquipmentService.Action.EQUIP, foreign, first)));
        assertEquals(before + 1, roles.revision(player.roleId()));

        var replacement = service.change(player.token(), change(player, HeroGodEquipmentService.Action.EQUIP, next, first));
        assertEquals(before + 2, replacement.assetRevision());
        assertNull(equipment.list(player.roleId()).stream().filter(item -> item.instanceId().equals(first))
                .findFirst().orElseThrow().heroId());
        assertEquals(next, equipment.equipped(player.roleId()).get(player.heroId()).getFirst().instanceId());
        assertFailure("GOD_EQUIPMENT_CHANGED",
                () -> service.change(player.token(), change(player, HeroGodEquipmentService.Action.UNEQUIP, first, null)));
        // 旧规则只有穿戴会检查等级，卸下不会因当前门槛变化卡住。
        jdbc.update("UPDATE game_role SET role_level=1 WHERE id=?", player.roleId());
        var removed = service.change(player.token(), change(player, HeroGodEquipmentService.Action.UNEQUIP, next, null));
        assertEquals(before + 3, removed.assetRevision());
        assertTrue(equipment.equipped(player.roleId()).isEmpty());
        assertEquals(2, equipment.list(player.roleId()).size());
        assertEquals(initialAttack, heroes.find(player.roleId(), player.heroId()).orElseThrow().panelStats().values().atk());
        assertEquals(firstReceipt, service.change(player.token(), equip));
        assertTrue(equipment.equipped(player.roleId()).isEmpty());
    }

    /** 角色等级限制探宝和穿戴，神装穿戴额外核对英雄星级。 */
    @Test
    void gatesUseAuthorizedRoleAndHeroState() {
        Player early = player(69, 6);
        String first = create(early, 1040101);
        assertFailure("GOD_EQUIPMENT_ROLE_LEVEL",
                () -> service.change(early.token(), change(early, HeroGodEquipmentService.Action.EQUIP, first, null)));
        assertFailure("GOD_EQUIPMENT_ROLE_LEVEL",
                () -> service.draw(early.token(), new HeroGodEquipmentService.DrawRequest(id(), 1, 0)));
        Player lowStar = player(70, 5);
        String second = create(lowStar, 1040101);
        assertFailure("GOD_EQUIPMENT_HERO_STAR",
                () -> service.change(lowStar.token(), change(lowStar, HeroGodEquipmentService.Action.EQUIP, second, null)));
        assertEquals(1, service.state(lowStar.roleId()).requiredWorldLevel());
        assertTrue(equipment.equipped(lowStar.roleId()).isEmpty());
    }

    /** 一星同套装四件同时得到二件和四件属性，真实单件基础属性仍保留。 */
    @Test
    void setThresholdsUseMinimumStarAndAddBothStages() {
        var items = List.of(item(1040101), item(1040201), item(1040301), item(1040401));
        var attributes = new HashMap<Integer, Long>();
        rules.contribute(items, (type, value) -> attributes.merge(type, value, Long::sum));
        assertEquals(774L, attributes.get(220));
        assertEquals(600L, attributes.get(202));
        assertTrue(rules.setSkills(items).isEmpty());
        attributes.clear();
        rules.contribute(List.of(item(1050101), item(1040201)), (type, value) -> attributes.merge(type, value, Long::sum));
        assertEquals(300L, attributes.get(202));
    }

    /** 只给隔离用例准备实际英雄与角色等级。 */
    private Player player(int level, int star) {
        var signed = login.login("divine_" + UUID.randomUUID().toString().substring(0, 20));
        var role = signed.role().id();
        var hero = id();
        jdbc.update("UPDATE game_role SET role_level=? WHERE id=?", level, role);
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105010,1,?,0)",
                hero, role, star);
        return new Player(role, "Bearer " + signed.session().accessToken(), hero);
    }

    /** 在隔离数据库以生产创建规则准备指定实例。 */
    private String create(Player player, int templateId) {
        var definition = rules.require(templateId);
        return new TransactionTemplate(transactions).execute(status -> {
            roles.lock(player.roleId());
            return equipment.create(player.roleId(), definition, rules.rollModifiers(definition, new Random(1L)));
        });
    }

    /** 构造给定基础装备的只读属性输入，不改变任何账号。 */
    private GodEquipmentRepository.Item item(int templateId) {
        var definition = rules.require(templateId);
        return new GodEquipmentRepository.Item(id(), templateId, definition.slot(), null, List.of(),
                rules.itemAttributes(definition, List.of()), definition.star(), definition.quality());
    }

    /** 穿戴用新请求号，换装时携带本次原先看到的槽位实例。 */
    private static HeroGodEquipmentService.Request change(Player player, HeroGodEquipmentService.Action action,
                                                          String instance, String expected) {
        return new HeroGodEquipmentService.Request(id(), player.heroId(), 1, action, instance, expected);
    }

    /** 生成测试环境独立实例和请求号。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }

    /** 精确核对该次失败的业务拒绝码。 */
    private static void assertFailure(String code, Runnable attempt) {
        assertEquals(code, assertThrows(ResponseStatusException.class, attempt::run).getReason());
    }
}
