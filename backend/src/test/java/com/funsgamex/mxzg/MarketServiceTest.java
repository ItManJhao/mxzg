/** 普通市场的独立数据库回归：核对持久货架、配置成交、限购及两套刷新计时。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.market.MarketService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
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
    "spring.datasource.url=jdbc:h2:mem:ordinary_market;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class MarketServiceTest {
    /** 建立隔离角色与用于重登的新凭证。 */
    @Autowired private DevelopmentLoginService login;
    /** 实际事务入口，与 WebSocket 使用同一份实例。 */
    @Autowired private MarketService service;
    /** 读取测试角色的真实财产与资产版本。 */
    @Autowired private RoleRepository roles;
    /** 读取普通市场商品实际到账数量。 */
    @Autowired private InventoryService inventory;
    /** 只用来设置隔离库的余额、商品夹具和计时边界。 */
    @Autowired private JdbcTemplate jdbc;
    /** 用于构造库存溢出，使事务在完成扣款之后验证到回滚。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 独立开发账号、真实角色标识和会话。 */
    private record Player(String account, String roleId, String token) {}

    /** 六个不重复商品；商店重新打开及重登不会替换货架或重置已购。 */
    @Test
    void purchaseUsesOriginalPriceAndPersistsLimitAndReceipt() throws Exception {
        Player player = player();
        var initial = service.list(player.token());
        assertEquals(6, initial.offers().size());
        assertEquals(6, initial.offers().stream().map(MarketService.Offer::productId).distinct().count());
        assertEquals(5, initial.freeRefreshes());
        assertEquals(80, initial.paidRefreshLimit());
        assertEquals(initial, service.list(player.token()));
        var product = initial.offers().stream().filter(offer -> offer.purchasable() && offer.itemId() != 2_000_002)
                .findFirst().orElseThrow();
        long originalCurrency = balance(player, product.costItemId());
        long originalQuantity = quantity(player, product.itemId());
        long originalRevision = roles.revision(player.roleId());
        String key = UUID.randomUUID().toString();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> service.buy(player.token(), key, initial.shelfVersion(), product.productId(), 1));
            var duplicate = executor.submit(() -> service.buy(player.token(), key, initial.shelfVersion(), product.productId(), 1));
            assertEquals(first.get(10, TimeUnit.SECONDS), duplicate.get(10, TimeUnit.SECONDS));
            assertEquals(originalRevision + 1, first.get().assetRevision());
        }
        assertEquals(originalCurrency - product.costQuantity(), balance(player, product.costItemId()));
        assertEquals(originalQuantity + product.quantity(), quantity(player, product.itemId()));
        assertEquals(originalRevision + 1, roles.revision(player.roleId()));
        var next = "Bearer " + login.login(player.account()).session().accessToken();
        var restored = service.list(next);
        assertEquals(1, restored.offers().stream().filter(offer -> offer.productId() == product.productId())
                .findFirst().orElseThrow().purchased());
        assertEquals(restored, service.buy(next, key, initial.shelfVersion(), product.productId(), 1).state());
        assertFailure("MARKET_LIMIT", () -> service.buy(next, UUID.randomUUID().toString(),
                restored.shelfVersion(), product.productId(), 1));
        assertFailure("IDEMPOTENCY_CONFLICT", () -> service.refresh(next, key, restored.shelfVersion()));
    }

    /** 免费次数先用、付费刷新按原价，迟到请求不能购买新货架同编号商品。 */
    @Test
    void manualRefreshUsesFreeBeforePaidAndGuardsShelfVersion() {
        Player player = player();
        var initial = service.list(player.token());
        long balance = balance(player, 900002);
        long revision = roles.revision(player.roleId());
        long version = initial.shelfVersion();
        for (int index = initial.freeRefreshLimit(); index > 0; index--) {
            String key = UUID.randomUUID().toString();
            var free = service.refresh(player.token(), key, version);
            assertEquals(free, service.refresh(player.token(), key, version));
            assertEquals(++version, free.state().shelfVersion());
            assertEquals(index - 1, free.state().freeRefreshes());
            assertEquals(revision, free.assetRevision());
        }
        assertEquals(balance, balance(player, 900002));
        var paid = service.refresh(player.token(), UUID.randomUUID().toString(), version);
        assertEquals(1, paid.state().paidRefreshes());
        assertEquals(balance - 20, balance(player, 900002));
        assertEquals(revision + 1, paid.assetRevision());
        assertFailure("MARKET_SHELF_CHANGED", () -> service.buy(player.token(), UUID.randomUUID().toString(),
                initial.shelfVersion(), initial.offers().getFirst().productId(), 1));
    }

    /** 上海日切只清付费次数；自然免费补充和已购商品在同货架上保存。 */
    @Test
    void restoresFreeAndDailyPaidCountsWithoutRerolling() {
        Player player = player();
        var initial = service.list(player.token());
        int firstProduct = initial.offers().getFirst().productId();
        long now = Instant.now().getEpochSecond();
        jdbc.update("UPDATE game_market SET free_refreshes=0, paid_refreshes=80, next_free_refresh_at=?, "
                + "next_paid_reset_at=? WHERE role_id=?", now + 300, now + 300, player.roleId());
        assertFailure("MARKET_REFRESH_LIMIT", () -> service.refresh(player.token(), UUID.randomUUID().toString(),
                initial.shelfVersion()));
        jdbc.update("UPDATE game_market SET next_paid_reset_at=?, next_free_refresh_at=? WHERE role_id=?",
                now - 20, now - 7201, player.roleId());
        jdbc.update("UPDATE game_market_offer SET purchased=1 WHERE role_id=? AND product_id=?", player.roleId(), firstProduct);
        jdbc.update("UPDATE game_role SET goddess_vip=1 WHERE id=?", player.roleId());
        var state = service.list(player.token());
        assertEquals(initial.shelfVersion(), state.shelfVersion());
        assertEquals(initial.offers().stream().map(MarketService.Offer::productId).toList(),
                state.offers().stream().map(MarketService.Offer::productId).toList());
        assertEquals(1, state.offers().getFirst().purchased());
        assertEquals(2, state.freeRefreshes());
        assertEquals(now + 7199, state.nextFreeRefreshAt());
        assertEquals(0, state.paidRefreshes());
        assertEquals(85, state.paidRefreshLimit());
        assertEquals(LocalTime.MIDNIGHT,
                Instant.ofEpochSecond(state.nextPaidResetAt()).atZone(ZoneId.of("Asia/Shanghai")).toLocalTime());
    }

    /** 未恢复的紫色精灵明确拒绝；实际库存发奖失败后扣款、限购、回执和版本均恢复原值。 */
    @Test
    void unavailableRewardsAndFailedCreditDoNotCharge() {
        Player player = player();
        var shelf = service.list(player.token());
        jdbc.update("DELETE FROM game_market_offer WHERE role_id=? AND product_id IN (2,4)", player.roleId());
        jdbc.update("INSERT INTO game_market_offer(role_id,product_id,purchased) VALUES (?,2,0),(?,4,0)",
                player.roleId(), player.roleId());
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(player.roleId(), 900501, Long.MAX_VALUE));
        long balance = balance(player, 900002);
        long revision = roles.revision(player.roleId());
        var pending = service.list(player.token()).offers().stream().filter(offer -> offer.productId() == 2)
                .findFirst().orElseThrow();
        assertFalse(pending.purchasable());
        assertFailure("MARKET_REWARD_UNAVAILABLE", () -> service.buy(player.token(), UUID.randomUUID().toString(),
                shelf.shelfVersion(), 2, 1));
        assertThrows(ArithmeticException.class, () -> service.buy(player.token(), UUID.randomUUID().toString(),
                shelf.shelfVersion(), 4, 1));
        assertEquals(balance, balance(player, 900002));
        assertEquals(revision, roles.revision(player.roleId()));
        assertEquals(0, jdbc.queryForObject("SELECT purchased FROM game_market_offer WHERE role_id=? AND product_id=4",
                Integer.class, player.roleId()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_market_request WHERE role_id=?",
                Integer.class, player.roleId()));
    }

    /** 新建一级测试角色并设高余额，让真实随机货架中的任一普通商品可完成成交。 */
    private Player player() {
        String account = "market_" + UUID.randomUUID().toString().substring(0, 12);
        var loginResult = login.login(account);
        String roleId = loginResult.role().id();
        jdbc.update("UPDATE game_role SET gold=1000000000, diamonds=1000000 WHERE id=?", roleId);
        return new Player(account, roleId, "Bearer " + loginResult.session().accessToken());
    }

    /** 从真实角色资料查当前币种余额。 */
    private long balance(Player player, int itemId) {
        var role = roles.findById(player.roleId()).orElseThrow();
        return itemId == 900001 ? role.gold() : role.diamonds();
    }

    /** 从唯一普通库存查数量，尚未持有时为 0。 */
    private long quantity(Player player, int itemId) {
        return inventory.find(player.roleId(), itemId).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 比较玩家长连接收到的稳定市场错误原因。 */
    private static void assertFailure(String reason, Runnable operation) {
        assertEquals(reason, assertThrows(ResponseStatusException.class, operation::run).getReason());
    }
}
