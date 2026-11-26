/**
 * 在隔离库验证黑市实际报价、到账、交易恢复和上海日切。
 * 通过真实的任务和竞技场服务检查扣费、限购与每日任务共用同一事务及账本。
 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.arena.ArenaSeasonService;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.blackmarket.BlackMarketService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.market.MarketService;
import com.funsgamex.mxzg.quest.QuestService;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:black_market;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class BlackMarketServiceTest {
    /** 实际道具摊位编号与黑市任务的计数来源参数。 */
    private static final int STALL = 100800;
    /** 玩家从竞技场和黑市访问同一本购买记录。 */
    private static final int ARENA = 100500;

    /** 创建隔离角色，并用于重登后验证持久记录。 */
    @Autowired private DevelopmentLoginService login;
    /** 与长连接使用同一实际黑市交易入口。 */
    @Autowired private BlackMarketService market;
    /** 读取另一入口的真实竞技货架与交易结果。 */
    @Autowired private ArenaSeasonService arena;
    /** 检查已持久化每日任务进度及跳转。 */
    @Autowired private QuestService quests;
    /** 验证资产版本和当期余额。 */
    @Autowired private RoleRepository roles;
    /** 读取实际到货、竞技币消耗及溢出回滚。 */
    @Autowired private InventoryService inventory;
    /** 设置隔离库角色等级、神职及钱包夹具。 */
    @Autowired private JdbcTemplate jdbc;
    /** 创建库存夹具时沿实际资产事务提交。 */
    @Autowired private PlatformTransactionManager transactions;
    /** 捕获上海自然日边界的独立游戏时钟。 */
    @Autowired private GameClock clock;

    /** 本次隔离账号、角色标识及 WS 等价认证凭证。 */
    private record Player(String account, String id, String token) {}

    /** 真实黑市仅显示等级已开放商品，神职与女神 VIP 分开校验。 */
    @Test
    void fixedCatalogAndClergyGateFollowLegacyTables() {
        var player = player(6, 1000);
        var stall = market.list(player.token(), STALL);
        assertEquals(List.of(100800, 101000, 100300, 101500), stall.tabs().stream()
                .map(BlackMarketService.Tab::shopType).toList());
        assertEquals(14, stall.offers().size());
        var first = offer(stall, 1);
        assertEquals(901812, first.itemId());
        assertEquals(10, first.quantity());
        assertEquals(900002, first.costItemId());
        assertEquals(248, first.costQuantity());
        assertEquals(10, first.purchaseLimit());
        assertEquals(80, first.discount());
        assertEquals(stall.nextRefreshAt(), stall.shelfVersion());
        assertFailure("BLACK_MARKET_LOCKED", () -> market.list(player.token(), ARENA));
        assertFailure("BLACK_MARKET_PRODUCT_MISSING", () -> purchase(player, stall, 15, 1));
        assertFalse(offer(stall, 14).purchasable());
        jdbc.update("UPDATE game_role SET goddess_vip=7 WHERE id=?", player.id());
        assertFailure("BLACK_MARKET_CLERGY_REQUIRED", () -> purchase(player, stall, 14, 1));

        jdbc.update("UPDATE game_role SET clergy_level=7,role_level=80 WHERE id=?", player.id());
        assertTrue(offer(market.list(player.token(), STALL), 14).purchasable());
        assertEquals(902002, offer(market.list(player.token(), STALL), 15).itemId());
        var prophecy = market.list(player.token(), 100300);
        assertEquals(900603, prophecy.currencyItemId());
        assertEquals(90, prophecy.offers().size());
        assertTrue(prophecy.offers().stream().noneMatch(MarketService.Offer::purchasable));
        assertFailure("BLACK_MARKET_UNAVAILABLE", () -> purchase(player, prophecy, 1, 1));
        assertEquals(1000, diamonds(player));
    }

    /** 并发重试只成交一次，成功份数、任务前往、库存及钻石同时持久化。 */
    @Test
    void purchaseCommitsOnceAndCountsActualUnits() throws Exception {
        var player = player(9, 2000);
        var stall = market.list(player.token(), STALL);
        assertEquals("main_black_market", daily(player, 9).destination());
        assertEquals("main_shop", daily(player, 10).destination());
        assertEquals(0, daily(player, 9).current());
        long original = roles.revision(player.id());
        String requestId = id();
        BlackMarketService.Receipt receipt;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> market.buy(player.token(), requestId, STALL, stall.shelfVersion(), 1, 2));
            var second = executor.submit(() -> market.buy(player.token(), requestId, STALL, stall.shelfVersion(), 1, 2));
            receipt = first.get(10, TimeUnit.SECONDS);
            assertEquals(receipt, second.get(10, TimeUnit.SECONDS));
        }
        assertEquals(original + 1, receipt.assetRevision());
        assertEquals(1504, diamonds(player));
        assertEquals(20, quantity(player, 901812));
        assertEquals(2, offer(receipt.state(), 1).purchased());
        assertEquals(1, daily(player, 9).current());
        assertEquals(2, trackedPurchases(player, stall.shelfVersion()));
        assertEquals(0, daily(player, 10).current());
        assertFailure("IDEMPOTENCY_CONFLICT", () -> market.buy(player.token(), requestId, STALL,
                stall.shelfVersion(), 1, 1));
        assertFailure("BLACK_MARKET_LIMIT", () -> purchase(player, stall, 1, 9));
        assertFailure("BLACK_MARKET_INSUFFICIENT", () -> purchase(player, stall, 1, 8));
        assertEquals(2, trackedPurchases(player, stall.shelfVersion()));

        String restored = "Bearer " + login.login(player.account()).session().accessToken();
        assertEquals(2, offer(market.list(restored, STALL), 1).purchased());
        assertEquals(receipt, market.buy(restored, requestId, STALL, stall.shelfVersion(), 1, 2));
    }

    /** 过上海零点后同货架重置限购，旧新命令不能绕开期次，旧成功回执仍可重试。 */
    @Test
    void shanghaiMidnightResetsLimitsAndRejectsStaleOrders() {
        var player = player(9, 100);
        try {
            clock.setEpochSeconds(Instant.parse("2026-11-25T15:50:00Z").getEpochSecond());
            var day = market.list(player.token(), STALL);
            assertEquals(Instant.parse("2026-11-25T16:00:00Z").getEpochSecond(), day.nextRefreshAt());
            String requestId = id();
            var bought = market.buy(player.token(), requestId, STALL, day.shelfVersion(), 8, 1);
            assertFailure("BLACK_MARKET_LIMIT", () -> purchase(player, day, 8, 1));
            assertEquals(1, daily(player, 9).current());

            clock.setEpochSeconds(day.nextRefreshAt() + 1);
            var refreshed = market.list(player.token(), STALL);
            assertEquals(day.nextRefreshAt() + 24 * 60 * 60, refreshed.nextRefreshAt());
            assertEquals(day.offers().stream().map(MarketService.Offer::productId).toList(),
                    refreshed.offers().stream().map(MarketService.Offer::productId).toList());
            assertEquals(0, offer(refreshed, 8).purchased());
            assertEquals(0, daily(player, 9).current());
            assertFailure("BLACK_MARKET_SHELF_CHANGED", () -> purchase(player, day, 8, 1));
            assertEquals(bought, market.buy(player.token(), requestId, STALL, day.shelfVersion(), 8, 1));
            assertEquals(80, diamonds(player));
            assertEquals(1, offer(purchase(player, refreshed, 8, 1).state(), 8).purchased());
            assertEquals(1, daily(player, 9).current());
        } finally {
            clock.reset();
        }
    }

    /** 发奖错误发生在扣钻后时，资产、限购与任务均恢复原值。 */
    @Test
    void rewardFailureRollsBackCurrencyAndTask() {
        var player = player(9, 1000);
        credit(player, 900501, Long.MAX_VALUE);
        long revision = roles.revision(player.id());
        var state = market.list(player.token(), STALL);
        assertThrows(ArithmeticException.class, () -> purchase(player, state, 2, 1));
        assertEquals(1000, diamonds(player));
        assertEquals(revision, roles.revision(player.id()));
        assertEquals(0, offer(market.list(player.token(), STALL), 2).purchased());
        assertEquals(0, daily(player, 9).current());
    }

    /** 两入口对同一个竞技商品共享真实竞技币、期次、已购与同一交易回执。 */
    @Test
    void arenaPurchasesShareNativeStockAndDoNotCountAsStall() {
        var player = player(9, 0);
        var state = market.list(player.token(), ARENA);
        var product = state.offers().getFirst();
        assertEquals(arena.shop(player.token()).refreshAt(), state.shelfVersion());
        assertEquals(900901, state.currencyItemId());
        credit(player, state.currencyItemId(), product.costQuantity() * 3);
        var source = arena.buy(player.token(), id(), product.productId(), 1, state.shelfVersion());
        assertEquals(1, offer(market.list(player.token(), ARENA), product.productId()).purchased());

        var purchased = purchase(player, state, product.productId(), 1);
        assertEquals(2, offer(purchased.state(), product.productId()).purchased());
        assertEquals(2, arena.shop(player.token()).offers().getFirst().purchased());
        assertEquals(product.quantity() * 2, quantity(player, product.itemId()));
        assertEquals(product.costQuantity(), quantity(player, state.currencyItemId()));
        assertEquals(0, daily(player, 9).current());
        assertEquals(0, daily(player, 10).current());
        assertTrue(purchased.assetRevision() > source.notice().assetRevision());
        assertEquals(purchased, market.buy(player.token(), purchased.requestId(), ARENA,
                state.shelfVersion(), product.productId(), 1));
    }

    /** 以真实开发登录创建隔离测试角色，按场景设置钱包和等级。 */
    private Player player(int level, long diamonds) {
        String account = "black_" + id().substring(0, 12);
        var result = login.login(account);
        var roleId = result.role().id();
        jdbc.update("UPDATE game_role SET role_level=?,diamonds=? WHERE id=?", level, diamonds, roleId);
        return new Player(account, roleId, "Bearer " + result.session().accessToken());
    }

    /** 用新请求编号针对已经读到的报价提交实际交易。 */
    private BlackMarketService.Receipt purchase(Player player, BlackMarketService.State state, int productId, int count) {
        return market.buy(player.token(), id(), state.shopType(), state.shelfVersion(), productId, count);
    }

    /** 从权威货架找到对应原商品编号的显示状态。 */
    private static MarketService.Offer offer(BlackMarketService.State state, int productId) {
        return state.offers().stream().filter(row -> row.productId() == productId).findFirst().orElseThrow();
    }

    /** 从任务快照取一条实际展示给玩家的当日任务。 */
    private QuestService.QuestTask daily(Player player, int taskId) {
        return quests.snapshot(player.id()).daily().stream().filter(task -> task.id() == taskId).findFirst().orElseThrow();
    }

    /** 查询原始购买份数，任务列表为显示完成状态而将进度限制在任务目标内。 */
    private long trackedPurchases(Player player, long period) {
        return jdbc.queryForObject("""
                SELECT amount FROM game_quest_counter
                WHERE role_id=? AND period_end_seconds=? AND metric='SHOP_BUY' AND condition_value=?
                """, Long.class, player.id(), period, STALL);
    }

    /** 查询实际钱包，避免用预览报价代替余额。 */
    private long diamonds(Player player) {
        return roles.findById(player.id()).orElseThrow().diamonds();
    }

    /** 读取背包唯一库存，当前没有该物品时返回零。 */
    private long quantity(Player player, int itemId) {
        return inventory.find(player.id(), itemId).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 为隔离角色创建真实库存前提，并纳入资产事务。 */
    private void credit(Player player, int itemId, long amount) {
        new TransactionTemplate(transactions).executeWithoutResult(transaction -> inventory.credit(player.id(), itemId, amount));
    }

    /** 产生规范的小写 UUID 请求标志。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }

    /** 验证客户端收到的稳定业务错误原因。 */
    private static void assertFailure(String reason, Runnable action) {
        assertEquals(reason, assertThrows(ResponseStatusException.class, action::run).getReason());
    }
}
