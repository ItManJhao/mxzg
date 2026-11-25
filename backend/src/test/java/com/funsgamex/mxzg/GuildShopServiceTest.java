/** 隔离数据库验证公会币兑换、每周切换、角色归属和持久幂等。 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.guild.GuildService;
import com.funsgamex.mxzg.guild.GuildShopService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
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
    "spring.datasource.url=jdbc:h2:mem:guild_shop;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class GuildShopServiceTest {
    /** 公会币配置 ID，与公会捐献发放和商城使用一致。 */
    private static final int GUILD_COIN = 901301;
    /** 准备隔离区服的真实角色。 */
    @Autowired private DevelopmentLoginService login;
    /** 用公开业务加入公会，覆盖成员归属。 */
    @Autowired private GuildService guilds;
    /** 和 WebSocket 使用同一个事务入口。 */
    @Autowired private GuildShopService shop;
    /** 记录隔离角色普通资产余额和实际发货。 */
    @Autowired private InventoryService inventory;
    /** 检查资产版本是否只写入一次。 */
    @Autowired private RoleRepository roles;
    /** 隔离账本的玩家准备以及实例结果检查。 */
    @Autowired private JdbcTemplate jdbc;
    /** 配置统一游戏时间验证周一界线。 */
    @Autowired private GameClock clock;
    /** 为测试数据运行和线上相同的库存写事务。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 定价、数量和周限取原配置；并发重复只扣一次，重登保留进度。 */
    @Test
    void exchangesWithAuthoritativePriceAndPersistsConcurrentReplay() throws Exception {
        String owner = player(3500);
        String guildId = createGuild(owner);
        var state = shop.list(owner);
        assertEquals(17, state.products().size());
        assertEquals(new GuildShopService.Product(1, 20104016, 30, 1500, 2, 0, true), state.products().getFirst());
        assertEquals(new GuildShopService.Product(6, 20205020, 50, 15000, 1, 0, true), state.products().get(5));
        long revision = roles.revision(owner);
        var order = order(guildId, state.resetAtSeconds(), 1, 2);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> shop.buy(owner, order));
            var second = executor.submit(() -> shop.buy(owner, order));
            assertEquals(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
            assertEquals(2, first.get().products().getFirst().purchased());
        }
        assertEquals(500, balance(owner, GUILD_COIN));
        assertEquals(60, balance(owner, 20104016));
        assertEquals(revision + 1, roles.revision(owner));
        assertEquals(2, shop.list(owner).products().getFirst().purchased());
        reject("GUILD_SHOP_LIMIT", () -> shop.buy(owner, order(guildId, state.resetAtSeconds(), 1, 1)));
        reject("GUILD_SHOP_REQUEST_REUSED", () -> shop.buy(owner, new GuildShopService.BuyRequest(
                order.requestId(), guildId, order.productId(), 1, state.resetAtSeconds())));
    }

    /** 周一上海零点转换周期，旧报价不会当成新货架购买，历史请求只重放。 */
    @Test
    void refreshesOnShanghaiMondayAndRejectsOldQuote() {
        try {
            long monday = Instant.parse("2026-11-29T16:00:00Z").getEpochSecond();
            clock.setEpochSeconds(monday - 20);
            String owner = player(5000);
            String guildId = createGuild(owner);
            var state = shop.list(owner);
            assertEquals(monday, state.resetAtSeconds());
            var command = order(guildId, monday, 1, 2);
            var receipt = shop.buy(owner, command);
            clock.setEpochSeconds(monday);
            assertEquals(monday + 7 * 86400, shop.list(owner).resetAtSeconds());
            assertEquals(0, shop.list(owner).products().getFirst().purchased());
            assertEquals(receipt, shop.buy(owner, command));
            assertEquals(2000, balance(owner, GUILD_COIN));
            reject("GUILD_SHOP_RESET", () -> shop.buy(owner, order(guildId, monday, 1, 1)));
            assertEquals(1, shop.buy(owner, order(guildId, monday + 7 * 86400, 1, 1))
                    .products().getFirst().purchased());
        } finally {
            clock.reset();
        }
    }

    /** 仅当前同区公会可购买。未恢复精灵不扣币，月兔按已接入逻辑实际生成。 */
    @Test
    void rejectsUnavailableAndNonMembershipWhileGrantingSupportedSpirit() {
        String owner = player(550);
        reject("GUILD_SHOP_MEMBERSHIP_CHANGED", () -> shop.list(owner));
        String guildId = createGuild(owner);
        var state = shop.list(owner);
        assertFalse(state.products().get(13).purchasable());
        assertTrue(state.products().get(14).purchasable());
        reject("GUILD_SHOP_PRODUCT_UNAVAILABLE", () -> shop.buy(owner, order(guildId, state.resetAtSeconds(), 14, 1)));
        reject("GUILD_SHOP_INSUFFICIENT", () -> shop.buy(owner, order(guildId, state.resetAtSeconds(), 1, 1)));
        reject("GUILD_SHOP_MEMBERSHIP_CHANGED", () -> shop.buy(owner,
                order(UUID.randomUUID().toString(), state.resetAtSeconds(), 15, 1)));
        assertEquals(550, balance(owner, GUILD_COIN));
        shop.buy(owner, order(guildId, state.resetAtSeconds(), 15, 1));
        assertEquals(50, balance(owner, GUILD_COIN));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_spirit WHERE role_id=? AND item_id=2000002",
                Integer.class, owner));
    }

    /** 创建具备公会解锁条件、独立资产事务入账的隔离角色。 */
    private String player(long coins) {
        String roleId = login.login("shop_" + UUID.randomUUID().toString().substring(0, 12), "local-1").role().id();
        jdbc.update("UPDATE game_role SET role_level=50,diamonds=100 WHERE id=?", roleId);
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(roleId, GUILD_COIN, coins));
        return roleId;
    }

    /** 通过公会服务实际建会，确认角色成员归属。 */
    private String createGuild(String roleId) {
        return guilds.change(roleId, new GuildService.Command(UUID.randomUUID().toString(), GuildService.Action.CREATE,
                null, null, "商店" + UUID.randomUUID().toString().substring(0, 8), null)).guild().id();
    }

    /** 查询持久背包的指定商品数量，空余额为零。 */
    private long balance(String roleId, int itemId) {
        return inventory.list(roleId).stream().filter(item -> item.itemId() == itemId)
                .mapToLong(InventoryService.Item::quantity).findFirst().orElse(0);
    }

    /** 构造一次确切周周期及所属公会内的购买命令。 */
    private static GuildShopService.BuyRequest order(String guildId, long resetAtSeconds, int productId, int count) {
        return new GuildShopService.BuyRequest(UUID.randomUUID().toString(), guildId, productId, count, resetAtSeconds);
    }

    /** 验证已经映射的真实失败原因。 */
    private static void reject(String reason, Runnable action) {
        assertEquals(reason, assertThrows(ResponseStatusException.class, action::run).getReason());
    }
}
