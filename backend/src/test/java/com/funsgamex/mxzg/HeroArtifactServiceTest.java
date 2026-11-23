/**
 * 圣器激活、穿换卸、升星和转换的隔离 H2 回归。
 * 测试同时核对持久身份、真实消耗、共享快照和幂等收据。
 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroArtifactRepository;
import com.funsgamex.mxzg.hero.HeroArtifactRules;
import com.funsgamex.mxzg.hero.HeroArtifactService;
import com.funsgamex.mxzg.hero.HeroArtifactService.Action;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.List;
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
        "spring.datasource.url=jdbc:h2:mem:hero_artifacts;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class HeroArtifactServiceTest {
    /** 测试角色凭证与当次唯一英雄。 */
    private record Player(String roleId, String token, String heroId) {}
    /** 使用真实开发登录创建独立角色。 */
    @Autowired private DevelopmentLoginService login;
    /** 当前完整圣器交易。 */
    @Autowired private HeroArtifactService artifacts;
    /** 读取真实旧套装规则。 */
    @Autowired private HeroArtifactRules rules;
    /** 读写指定隔离角色的独立圣器。 */
    @Autowired private HeroArtifactRepository equipment;
    /** 成功后的真实四维及名册。 */
    @Autowired private HeroRepository heroes;
    /** 钻石余额与持久资产版本。 */
    @Autowired private RoleRepository roles;
    /** 隔离角色的实际升级素材。 */
    @Autowired private InventoryService inventory;
    /** 测试准备使用同一应用数据库。 */
    @Autowired private JdbcTemplate jdbc;
    /** 以真实事务发放配方测试材料。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 等级恰好达标才激活，真实赠品立即穿戴，重放只读原回执。 */
    @Test
    void activatesAtLegacyGatesAndReplays() {
        Player player = player(190, 8);
        long revision = roles.revision(player.roleId());
        long baseAttack = heroes.find(player.roleId(), player.heroId()).orElseThrow().panelStats().values().atk();
        var earlyNecklace = request(player, 2, Action.ACTIVATE, null, null, 0);
        reject("ARTIFACT_SLOT_NOT_ACTIVATABLE", () -> artifacts.change(player.token(), earlyNecklace));
        var ring = request(player, 1, Action.ACTIVATE, null, null, 0);
        var receipt = artifacts.change(player.token(), ring);
        assertEquals(908101, receipt.templateId());
        assertEquals(2000, roles.findById(player.roleId()).orElseThrow().diamonds());
        assertEquals(revision + 1, receipt.assetRevision());
        assertEquals(receipt, artifacts.change(player.token(), ring));
        assertEquals(1, artifacts.state(player.roleId()).slots().size());
        assertEquals(player.heroId(), artifacts.state(player.roleId()).items().getFirst().heroId());
        assertTrue(heroes.find(player.roleId(), player.heroId()).orElseThrow().panelStats().values().atk() > baseAttack);
        assertFalse(inventory.list(player.roleId()).stream().anyMatch(item -> item.itemId() == 908101));
        reject("IDEMPOTENCY_CONFLICT", () -> artifacts.change(player.token(),
                new HeroArtifactService.Request(ring.requestId(), player.heroId(), 2, Action.ACTIVATE,
                        null, null, 0, List.of(), List.of(), List.of())));
    }

    /** 另一账号或玩家未见的装备不会替换当前圣器；卸下不清除激活。 */
    @Test
    void wornSlotIsStableAcrossReplaceAndRemove() {
        Player player = player(200, 9);
        Player other = player(200, 9);
        var initial = artifacts.change(player.token(), request(player, 1, Action.ACTIVATE, null, null, 0));
        var foreign = create(other, 908103);
        var next = create(player, 908103);
        reject("ARTIFACT_NOT_FOUND", () -> artifacts.change(player.token(),
                request(player, 1, Action.EQUIP, foreign, initial.instanceId(), 0)));
        reject("ARTIFACT_SLOT_CHANGED", () -> artifacts.change(player.token(),
                request(player, 1, Action.EQUIP, next, null, 0)));
        artifacts.change(player.token(), request(player, 1, Action.EQUIP, next, initial.instanceId(), 0));
        assertNull(equipment.list(player.roleId()).stream().filter(row -> row.instanceId().equals(initial.instanceId()))
                .findFirst().orElseThrow().heroId());
        artifacts.change(player.token(), request(player, 1, Action.UNEQUIP, next, null, 0));
        assertTrue(equipment.equipped(player.roleId()).isEmpty());
        assertEquals(List.of(new HeroArtifactRepository.ActivatedSlot(player.heroId(), 1)),
                artifacts.state(player.roleId()).slots());
    }

    /** 原配方按星级严格验证真实英雄，替代道具可分份选择，转换保留本体 ID。 */
    @Test
    void upgradesWithActualMaterialsAndTransformsOriginalInstance() {
        Player player = player(200, 9);
        var ring = artifacts.change(player.token(), request(player, 1, Action.ACTIVATE, null, null, 0));
        String wrong = addHero(player.roleId(), 1, 5);
        String material = addHero(player.roleId(), 1, 6);
        credit(player, 908097, 1);
        var refused = new HeroArtifactService.Request(id(), player.heroId(), 1, Action.UPGRADE, ring.instanceId(),
                null, 908103, List.of(), List.of(wrong), List.of());
        long originalRevision = roles.revision(player.roleId());
        reject("ARTIFACT_UPGRADE_MATERIALS", () -> artifacts.change(player.token(), refused));
        assertEquals(originalRevision, roles.revision(player.roleId()));
        assertEquals(1, inventory.find(player.roleId(), 908097).orElseThrow().quantity());
        var step = new HeroArtifactService.Request(id(), player.heroId(), 1, Action.UPGRADE, ring.instanceId(),
                null, 908103, List.of(), List.of(material), List.of());
        var upgraded = artifacts.change(player.token(), step);
        assertEquals(upgraded, artifacts.change(player.token(), step));
        assertEquals(originalRevision + 1, upgraded.assetRevision());
        assertTrue(heroes.find(player.roleId(), material).isEmpty());
        assertTrue(heroes.find(player.roleId(), wrong).isPresent());
        assertEquals(0, inventory.find(player.roleId(), 908097).orElseThrow().quantity());

        credit(player, 908099, 1);
        credit(player, 901808, 3);
        var perfect = new HeroArtifactService.Request(id(), player.heroId(), 1, Action.UPGRADE, ring.instanceId(),
                null, 908105, List.of(), List.of(), List.of(901808, 901808, 901808));
        assertEquals(908105, artifacts.change(player.token(), perfect).templateId());
        var transformed = artifacts.change(player.token(), request(player, 1, Action.TRANSFORM, ring.instanceId(),
                null, 908107));
        assertEquals(ring.instanceId(), transformed.instanceId());
        assertEquals(908107, artifacts.state(player.roleId()).items().getFirst().templateId());
        assertEquals(1700, roles.findById(player.roleId()).orElseThrow().diamonds());
    }

    /** 旧套装允许高品补低品，但等品异组的完美戒指和项链不能混配。 */
    @Test
    void setFollowsLegacyRarityAndGroup() {
        var low = new HeroArtifactRepository.Item(id(), 908101, 1, null);
        var high = new HeroArtifactRepository.Item(id(), 908108, 2, null);
        var otherHigh = new HeroArtifactRepository.Item(id(), 908105, 1, null);
        assertEquals(1, rules.activeSets(List.of(high, low)).getFirst().setId());
        assertTrue(rules.activeSets(List.of(high, otherHigh)).isEmpty());
        var paired = new HeroArtifactRepository.Item(id(), 908107, 1, null);
        assertEquals(500010001, rules.activeSets(List.of(paired, high)).getFirst().skillId());
    }

    /** 创建足额钻石并固定英雄等级的独立角色。 */
    private Player player(int level, int star) {
        var session = login.login("artifact_" + id().replace("-", "").substring(0, 18));
        String roleId = session.role().id();
        jdbc.update("UPDATE game_role SET diamonds=3000 WHERE id=?", roleId);
        return new Player(roleId, "Bearer " + session.session().accessToken(), addHero(roleId, level, star));
    }

    /** 为当前测试角色准备一名指定星级的真实素材。 */
    private String addHero(String roleId, int level, int star) {
        String hero = id();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105010,?,?,0)",
                hero, roleId, level, star);
        return hero;
    }

    /** 给某个隔离角色准备一件闲置圣器，不修改其他账号。 */
    private String create(Player player, int templateId) {
        return new TransactionTemplate(transactions).execute(status -> {
            roles.lock(player.roleId());
            return equipment.create(player.roleId(), rules.find(templateId), null).instanceId();
        });
    }

    /** 按普通物品真实库存发放一份测试配方材料。 */
    private void credit(Player player, int itemId, int quantity) {
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(player.roleId(), itemId, quantity));
    }

    /** 生成没有素材的请求；升星测试显式给出全部素材选择。 */
    private static HeroArtifactService.Request request(Player player, int slot, Action action, String item,
                                                       String expected, int target) {
        return new HeroArtifactService.Request(id(), player.heroId(), slot, action, item, expected, target,
                List.of(), List.of(), List.of());
    }

    /** 生成测试用的合法小写 UUID。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }

    /** 业务拒绝必须为预期原因。 */
    private static void reject(String expected, Runnable run) {
        assertEquals(expected, assertThrows(ResponseStatusException.class, run::run).getReason());
    }
}
