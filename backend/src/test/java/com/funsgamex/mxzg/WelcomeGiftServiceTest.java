/**
 * 使用独立 H2 库核对新手赠礼的真实发放、资格、重复领取和事务回滚。
 * 角色、钱包和库存均走正常服务入口。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleService;
import com.funsgamex.mxzg.role.WelcomeGiftService;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:welcome_gift;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
@RecordApplicationEvents
class WelcomeGiftServiceTest {
    /** 创建独立测试角色和可用连接凭证。 */
    @Autowired private DevelopmentLoginService login;
    /** 真实首次命名入口。 */
    @Autowired private RoleService names;
    /** 读取领取前后持久资产版本。 */
    @Autowired private RoleRepository roles;
    /** 按正常路径读取客户端会收到的整包状态。 */
    @Autowired private SessionSnapshotService snapshots;
    /** 被测的首次赠礼事务。 */
    @Autowired private WelcomeGiftService gifts;
    /** 仅用于将独立测试角色模拟成 V34 的迁移角色。 */
    @Autowired private JdbcTemplate jdbc;
    /** 制造领取完成但提交前回滚的事务。 */
    @Autowired private PlatformTransactionManager transactions;
    /** 断言只发布已提交的状态与发奖通知。 */
    @Autowired private ApplicationEvents events;

    /** 同一测试账号和角色的认证资料，重登替换原凭证。 */
    private record Player(String account, String role, String token) {}

    /** 命名后获得资格，发放原配置、一次状态与奖励通知，重登可恢复原回执。 */
    @Test
    void grantsAllConfiguredItemsOnce() {
        Player player = player();
        assertFalse(snapshots.snapshot(player.token()).role().welcomeGiftAvailable());
        assertUnavailable(player);
        name(player);
        var before = snapshots.snapshot(player.token());
        assertTrue(before.role().welcomeGiftAvailable());
        assertTrue(before.role().firstNamed());
        events.clear();

        var receipt = gifts.claim(player.token());
        assertEquals(player.role(), receipt.roleId());
        assertEquals(before.revision() + 1, receipt.assetRevision());
        assertEquals(RewardFeedbackService.Mode.POPUP, receipt.mode());
        assertEquals(List.of(new RewardFeedbackService.Item(900002, 492),
            new RewardFeedbackService.Item(900102, 200), new RewardFeedbackService.Item(900101, 2000),
            new RewardFeedbackService.Item(1001001, 1)), receipt.items());
        var after = snapshots.snapshot(player.token());
        assertFalse(after.role().welcomeGiftAvailable());
        assertEquals(before.role().diamonds() + 492, after.role().diamonds());
        assertEquals(before.role().gold(), after.role().gold());
        assertEquals(200, quantity(after, 900102) - quantity(before, 900102));
        assertEquals(2000, quantity(after, 900101) - quantity(before, 900101));
        assertEquals(1, quantity(after, 1001001) - quantity(before, 1001001));
        assertEquals(quantity(before, 900201), quantity(after, 900201));
        assertEquals(List.of(receipt), events.stream(RewardFeedbackService.Committed.class)
            .map(RewardFeedbackService.Committed::notice).toList());
        assertEquals(1, events.stream(AssetSyncService.Changed.class).count());

        assertEquals(receipt, gifts.claim(player.token()));
        assertEquals(after.revision(), roles.revision(player.role()));
        assertEquals(1, events.stream(RewardFeedbackService.Committed.class).count());
        String restoredToken = "Bearer " + login.login(player.account()).session().accessToken();
        assertFalse(snapshots.snapshot(restoredToken).role().welcomeGiftAvailable());
        assertEquals(after.role().diamonds(), snapshots.snapshot(restoredToken).role().diamonds());
        assertEquals(receipt, gifts.claim(restoredToken));
    }

    /** 历史角色迁移保留原名，首次命名认领键为空时无展示或领取资格。 */
    @Test
    void doesNotRetroactivelyOpenGiftForLegacyName() {
        Player player = player();
        jdbc.update("UPDATE game_role SET first_named=TRUE WHERE id=?", player.role());
        var role = snapshots.snapshot(player.token()).role();
        assertTrue(role.firstNamed());
        assertFalse(role.welcomeGiftAvailable());
        assertUnavailable(player);
    }

    /** 并发事务只发放一份，并向两个调用者交付同一回执。 */
    @Test
    void serializesConcurrentClaims() throws Exception {
        Player player = player();
        name(player);
        var before = snapshots.snapshot(player.token());
        var start = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> claimAfter(start, player));
            var second = executor.submit(() -> claimAfter(start, player));
            start.countDown();
            assertEquals(first.get(), second.get());
        }
        var after = snapshots.snapshot(player.token());
        assertEquals(before.revision() + 1, after.revision());
        assertEquals(before.role().diamonds() + 492, after.role().diamonds());
        assertFalse(after.role().welcomeGiftAvailable());
    }

    /** 原事务回滚时撤销领取回执与资产，在线事件也必须全部取消。 */
    @Test
    void rollsBackAssetsReceiptAndNotifications() {
        Player player = player();
        name(player);
        var before = snapshots.snapshot(player.token());
        events.clear();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            gifts.claim(player.token());
            assertFalse(roles.findById(player.role()).orElseThrow().welcomeGiftAvailable());
            status.setRollbackOnly();
        });
        var after = snapshots.snapshot(player.token());
        assertTrue(after.role().welcomeGiftAvailable());
        assertEquals(before.revision(), after.revision());
        assertEquals(before.role().diamonds(), after.role().diamonds());
        assertEquals(before.inventory(), after.inventory());
        assertEquals(0, events.stream(RewardFeedbackService.Committed.class).count());
        assertEquals(0, events.stream(AssetSyncService.Changed.class).count());

        assertEquals(before.revision() + 1, gifts.claim(player.token()).assetRevision());
        assertFalse(snapshots.snapshot(player.token()).role().welcomeGiftAvailable());
    }

    /** 创建仍未命名的角色，返回独立凭证。 */
    private Player player() {
        String account = "gift_" + UUID.randomUUID().toString().substring(0, 16);
        var created = login.login(account);
        return new Player(account, created.role().id(), "Bearer " + created.session().accessToken());
    }

    /** 走首次命名事务产生真实领取资格，不直接写资格。 */
    private void name(Player player) {
        names.setName(player.token(), "新月" + player.role().substring(0, 8));
    }

    /** 统一起跑点，保证两个领取使用独立线程上的事务。 */
    private RewardFeedbackService.Notice claimAfter(CountDownLatch start, Player player) throws InterruptedException {
        start.await();
        return gifts.claim(player.token());
    }

    /** 不具备资格时返回稳定业务拒绝码。 */
    private void assertUnavailable(Player player) {
        assertEquals("WELCOME_GIFT_UNAVAILABLE",
            assertThrows(ResponseStatusException.class, () -> gifts.claim(player.token())).getReason());
    }

    /** 从统一快照读取指定普通物品数量，尚未持有按零处理。 */
    private long quantity(SessionSnapshotService.Snapshot snapshot, int itemId) {
        return snapshot.inventory().stream().filter(item -> item.itemId() == itemId)
            .mapToLong(InventoryService.Item::quantity).sum();
    }
}
