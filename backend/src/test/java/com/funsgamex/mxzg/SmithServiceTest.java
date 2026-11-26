/**
 * 验证隔离 H2 中的装备锻造与一键报价。使用真实登录、钱包和背包，
 * 检查连档合成、资产版本、扣费回滚、旧报价及同编号并发重试。
 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.smith.SmithService;
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

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:smith;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class SmithServiceTest {
    /** 武器部位最初可消耗的原始装备配置。 */
    private static final int BASE_WEAPON = 1001001;
    /** 单锻测试的首档产物，同时是一键工序的中间材料。 */
    private static final int FIRST_UPGRADE = 1001002;
    /** 一键连档测试约定的最终成品。 */
    private static final int SECOND_UPGRADE = 1001003;
    /** 用于验证一键武器不触及另外三个部位。 */
    private static final int BASE_HELMET = 1002001;

    /** 通过真实本地身份创建隔离角色和重登会话。 */
    @Autowired private DevelopmentLoginService login;
    /** WebSocket 同款领域入口。 */
    @Autowired private SmithService smith;
    /** 读取真实金币与资产版本，比较提交和回滚的结果。 */
    @Autowired private RoleRepository roles;
    /** 验证材料扣除、物品到账及其他部位未被消费。 */
    @Autowired private InventoryService inventory;
    /** 设定隔离数据库中的角色等级、钱包和累计充值。 */
    @Autowired private JdbcTemplate jdbc;
    /** 用共享资产事务写入测试背包材料。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 隔离角色和实际鉴权凭证。 */
    private record Player(String account, String id, String token) {}

    /** 同编号并发单锻只扣一次，重登时可用新会话取回原成交。 */
    @Test
    void singleForgeChargesAndGrantsOnceAcrossConcurrentRetries() throws Exception {
        var player = player(5, 10_000);
        credit(player, BASE_WEAPON, 7);
        long start = roles.revision(player.id());
        String request = id();
        SmithService.Receipt receipt;
        try (var threads = Executors.newFixedThreadPool(2)) {
            var first = threads.submit(() -> smith.forge(player.token(), request, FIRST_UPGRADE, 2));
            var second = threads.submit(() -> smith.forge(player.token(), request, FIRST_UPGRADE, 2));
            receipt = first.get(10, TimeUnit.SECONDS);
            assertEquals(receipt, second.get(10, TimeUnit.SECONDS));
        }
        assertEquals(start + 1, receipt.assetRevision());
        assertEquals(4_224, receipt.goldCost());
        assertEquals(List.of(new Reward(FIRST_UPGRADE, 2)), receipt.rewards());
        assertEquals(5_776, gold(player));
        assertEquals(1, quantity(player, BASE_WEAPON));
        assertEquals(2, quantity(player, FIRST_UPGRADE));
        assertFailure("IDEMPOTENCY_CONFLICT", () -> smith.forge(player.token(), request, FIRST_UPGRADE, 1));
        String restored = "Bearer " + login.login(player.account()).session().accessToken();
        assertEquals(receipt, smith.forge(restored, request, FIRST_UPGRADE, 2));
        assertEquals(receipt.assetRevision(), roles.revision(player.id()));
    }

    /** 一键报价准确预测当前部位跨档、净产物和金币，结算后只有净产物留在背包。 */
    @Test
    void quickPreviewAndCommitAgreeAcrossChainedRecipes() {
        var player = player(25, 100_000);
        credit(player, BASE_WEAPON, 10);
        credit(player, BASE_HELMET, 7);
        long current = roles.revision(player.id());
        var quote = smith.preview(player.token(), 1);
        assertEquals(current, quote.assetRevision());
        assertEquals(10_982, quote.goldCost());
        assertEquals(List.of(new Reward(SECOND_UPGRADE, 1)), quote.rewards());
        assertEquals(current, roles.revision(player.id()));
        assertEquals(100_000, gold(player));
        assertEquals(10, quantity(player, BASE_WEAPON));

        String request = id();
        var receipt = smith.forgeAll(player.token(), request, 1, current);
        assertEquals(current + 1, receipt.assetRevision());
        assertEquals(quote.goldCost(), receipt.goldCost());
        assertEquals(quote.rewards(), receipt.rewards());
        assertEquals(89_018, gold(player));
        assertEquals(1, quantity(player, BASE_WEAPON));
        assertEquals(0, quantity(player, FIRST_UPGRADE));
        assertEquals(1, quantity(player, SECOND_UPGRADE));
        assertEquals(7, quantity(player, BASE_HELMET));
        assertEquals(receipt, smith.forgeAll(player.token(), request, 1, current));
        assertEquals(receipt.assetRevision(), roles.revision(player.id()));
    }

    /** 缺材料时已经尝试的扣金币同事务回滚，旧一键报价和无配方成品也被拒绝。 */
    @Test
    void insufficientMaterialAndStaleQuoteLeaveAssetsUntouched() {
        var player = player(25, 5_000);
        credit(player, BASE_WEAPON, 3);
        var quote = smith.preview(player.token(), 1);
        assertFailure("SMITH_INSUFFICIENT_MATERIAL", () -> smith.forge(player.token(), id(), FIRST_UPGRADE, 2));
        assertFailure("SMITH_INSUFFICIENT_GOLD", () -> smith.forge(player.token(), id(), FIRST_UPGRADE, 3));
        assertFailure("SMITH_RECIPE_INVALID", () -> smith.forge(player.token(), id(), BASE_WEAPON, 1));
        assertEquals(5_000, gold(player));
        assertEquals(3, quantity(player, BASE_WEAPON));
        assertEquals(quote.assetRevision(), roles.revision(player.id()));

        credit(player, BASE_HELMET, 1);
        assertFailure("SMITH_PREVIEW_CHANGED", () -> smith.forgeAll(player.token(), id(), 1, quote.assetRevision()));
        assertEquals(5_000, gold(player));
        assertEquals(0, quantity(player, FIRST_UPGRADE));
    }

    /** 基础铁匠铺等级和一键权限分别检查，累计充值可提前满足一键，空报价不扣资产。 */
    @Test
    void openingLevelQuickEntitlementAndEmptyQuoteMatchLegacy() {
        var locked = player(4, 20_000);
        assertFailure("SMITH_LOCKED", () -> smith.forge(locked.token(), id(), FIRST_UPGRADE, 1));
        var player = player(24, 20_000);
        assertFailure("SMITH_QUICK_LOCKED", () -> smith.preview(player.token(), 1));
        jdbc.update("UPDATE game_role SET total_recharge=1 WHERE id=?", player.id());
        var quote = smith.preview(player.token(), 1);
        assertEquals(0, quote.goldCost());
        assertEquals(List.of(), quote.rewards());
        assertFailure("SMITH_EMPTY", () -> smith.forgeAll(player.token(), id(), 1, quote.assetRevision()));
        assertEquals(20_000, gold(player));
        assertEquals(quote.assetRevision(), roles.revision(player.id()));
    }

    /** 创建独立开发角色，并用测试库设定等级与金币。 */
    private Player player(int level, long gold) {
        String account = "smith_" + id().substring(0, 12);
        var loggedIn = login.login(account);
        var roleId = loggedIn.role().id();
        jdbc.update("UPDATE game_role SET role_level=?,gold=? WHERE id=?", level, gold, roleId);
        return new Player(account, roleId, "Bearer " + loggedIn.session().accessToken());
    }

    /** 用正常库存语义写隔离测试材料，使报价能检查真实版本变化。 */
    private void credit(Player player, int itemId, long quantity) {
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(player.id(), itemId, quantity));
    }

    /** 读取已提交堆叠量，没有同类型物品时返回 0。 */
    private long quantity(Player player, int itemId) {
        return inventory.find(player.id(), itemId).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 从真实持久角色读取金币。 */
    private long gold(Player player) {
        return roles.findById(player.id()).orElseThrow().gold();
    }

    /** 测试每次实际操作使用独立业务编号。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }

    /** 校验领域拒绝交付给统一信封的稳定原因。 */
    private static void assertFailure(String code, Runnable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action::run).getReason());
    }
}
