/**
 * 在隔离库验证勇者试炼兑换，覆盖真实余额、并发重放、等级门槛、限购和上海周一刷新。
 * 测试通过与认证 WebSocket 一致的可事务化服务入口检查库存和资产版本。
 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import com.funsgamex.mxzg.trial.TrialShopService;
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
    "spring.datasource.url=jdbc:h2:mem:trial_shop;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class TrialShopServiceTest {
    /** 试炼挑战和商店共用的试炼之血配置号。 */
    private static final int TRIAL_BLOOD = 901201;
    /** 创建具备真实主键的隔离角色。 */
    @Autowired private DevelopmentLoginService login;
    /** 使用和服务端协议一致的交易边界。 */
    @Autowired private TrialShopService shop;
    /** 读取准确的测试资产余额，并准备足额余额场景。 */
    @Autowired private InventoryService inventory;
    /** 观测是否只提交一次资产。 */
    @Autowired private RoleRepository roles;
    /** 仅用于准备测试角色等级。 */
    @Autowired private JdbcTemplate jdbc;
    /** 设定独立游戏时钟验证周一边界。 */
    @Autowired private GameClock clock;
    /** 使测试入账也使用真实的统一资产事务。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 同一笔兑换并发只扣一次，回执仍携带原实际发奖和资产版本。 */
    @Test
    void exchangesAuthoritativeOfferAndReplaysConcurrentOrder() throws Exception {
        String role = player(30, 3000);
        var shelf = shop.list(role);
        var sample = shelf.offers().getFirst();
        assertEquals(10, shelf.offers().size());
        assertEquals(901503, sample.reward().itemId());
        assertEquals(1250, sample.price());
        assertEquals(0, sample.purchaseLimit());
        long revision = roles.revision(role);
        var request = order(shelf.refreshAt(), 1, 2);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> shop.buy(role, request));
            var second = executor.submit(() -> shop.buy(role, request));
            assertEquals(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
            assertEquals(2, first.get().state().offers().getFirst().purchased());
            assertEquals(revision + 1, first.get().assetRevision());
        }
        assertEquals(500, balance(role, TRIAL_BLOOD));
        assertEquals(10, balance(role, 901503));
        assertEquals(revision + 1, roles.revision(role));
        reject("TRIAL_SHOP_OFFER_UNAVAILABLE", () -> shop.buy(role, order(shelf.refreshAt(), 11, 1)));
        reject("TRIAL_SHOP_INSUFFICIENT", () -> shop.buy(role, order(shelf.refreshAt(), 1, 1)));
        reject("TRIAL_SHOP_REQUEST_REUSED", () -> shop.buy(role,
                new TrialShopService.BuyRequest(request.requestId(), 1, 1, shelf.refreshAt())));
        assertEquals(500, balance(role, TRIAL_BLOOD));
        assertEquals(2, shop.list(role).offers().getFirst().purchased());
    }

    /** 80 级货位每周限购 50 次，周一准确重置，旧报价只有原请求可重放。 */
    @Test
    void refreshesLimitedOfferOnMondayAndRejectsStaleQuote() {
        try {
            long monday = Instant.parse("2026-11-29T16:00:00Z").getEpochSecond();
            clock.setEpochSeconds(monday - 40);
            String role = player(80, 5000);
            assertEquals(monday, shop.list(role).refreshAt());
            assertEquals(50, shop.list(role).offers().getLast().purchaseLimit());
            var command = order(monday, 11, 50);
            var receipt = shop.buy(role, command);
            assertEquals(50, receipt.state().offers().getLast().purchased());
            reject("TRIAL_SHOP_LIMIT", () -> shop.buy(role, order(monday, 11, 1)));
            assertEquals(1300, balance(role, TRIAL_BLOOD));
            clock.setEpochSeconds(monday);
            long nextMonday = monday + 7 * 86400;
            assertEquals(nextMonday, shop.list(role).refreshAt());
            assertEquals(0, shop.list(role).offers().getLast().purchased());
            assertEquals(receipt, shop.buy(role, command));
            reject("TRIAL_SHOP_RESET", () -> shop.buy(role, order(monday, 11, 1)));
            assertEquals(1, shop.buy(role, order(nextMonday, 11, 1)).state().offers().getLast().purchased());
            assertEquals(51, balance(role, 902001));
            assertEquals(1226, balance(role, TRIAL_BLOOD));
            reject("TRIAL_LEVEL", () -> shop.list(player(29, 0)));
        } finally {
            clock.reset();
        }
    }

    /** 登录测试角色并用真实库存服务准备指定等级及初始货币。 */
    private String player(int level, long coins) {
        String id = login.login("trial_shop_" + UUID.randomUUID().toString().substring(0, 12), "local-1").role().id();
        jdbc.update("UPDATE game_role SET role_level=? WHERE id=?", level, id);
        if (coins > 0) {
            new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(id, TRIAL_BLOOD, coins));
        }
        return id;
    }

    /** 从持久背包核对实际到账；未持有时结果为零。 */
    private long balance(String roleId, int itemId) {
        return inventory.list(roleId).stream().filter(item -> item.itemId() == itemId)
                .mapToLong(InventoryService.Item::quantity).findFirst().orElse(0);
    }

    /** 构造一个绑定当前周周期的独立购买请求。 */
    private static TrialShopService.BuyRequest order(long refreshAt, int offerId, int count) {
        return new TrialShopService.BuyRequest(UUID.randomUUID().toString(), offerId, count, refreshAt);
    }

    /** 验证服务端拒绝的业务原因，避免把网络或参数错误当成保护。 */
    private static void reject(String code, Runnable run) {
        assertEquals(code, assertThrows(ResponseStatusException.class, run::run).getReason());
    }
}
