/**
 * 通用发奖反馈的事务专项：真实Spring事务和独立H2核对提交、回滚、静默、去重及嵌套事务。
 * 仅构造已发放结果以验证展示投影，不调用日常服务、不改变玩法开关，也不以通知代替资产事实。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;

class RewardFeedbackServiceTest {
    /** JavaScript可精确表达的最大协议整数，边界测试不依赖实际钱包上限。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
    /** 每项唯一内存库，只保存事务标记以独立确认持久提交。 */
    private JdbcTemplate jdbc;
    /** 原业务事务入口，登记期间不能发送任何展示。 */
    private TransactionTemplate transaction;
    /** 独立事务入口，不能共享外层的通知去重集合。 */
    private TransactionTemplate requiresNew;
    /** 当前真实反馈服务，每项重新创建，直接调用也保留事务检查。 */
    private RewardFeedbackService feedback;
    /** 实际提交之后按顺序交付的事件，不是等待发奖的队列。 */
    private List<RewardFeedbackService.Notice> notifications;
    /** 当前测试监听行为，可显式模拟交付异常。 */
    private Consumer<RewardFeedbackService.Notice> listener;

    /** 建立独立H2和真实事务管理，不启动端口或复用玩家数据库。 */
    @BeforeEach
    void prepareDatabase() {
        var source = new DriverManagerDataSource("jdbc:h2:mem:reward_feedback_" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(source);
        jdbc.execute("CREATE TABLE committed_marker(id VARCHAR(40) PRIMARY KEY)");
        var manager = new DataSourceTransactionManager(source);
        transaction = new TransactionTemplate(manager);
        requiresNew = new TransactionTemplate(manager);
        requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        notifications = new ArrayList<>();
        listener = notice -> {};
        feedback = new RewardFeedbackService(event -> {
            var notice = ((RewardFeedbackService.Committed) event).notice();
            notifications.add(notice);
            listener.accept(notice);
        });
    }

    /** 结束时确认线程事务集合已清理，并关闭唯一内存库。 */
    @AfterEach
    void closeDatabase() {
        try {
            assertFalse(TransactionSynchronizationManager.hasResource(feedback));
        } finally {
            jdbc.execute("SHUTDOWN");
        }
    }

    /** 构造只包含反馈所需真实结果形状的冻结明细，钱包特意不能用于推算奖励。 */
    private RewardGrantResult actual(String role, List<RewardGrantResult.Outcome> items,
            List<RewardGrantResult.Bonus> bonuses) {
        return new RewardGrantResult(role, items, new RoleRepository.CurrencyCredit(100, 200, 500, 800),
                List.of(), List.of(), List.of(), bonuses, List.of(), new SpiritInventoryService.State(1, List.of()));
    }

    /** 创建全部实际接纳的基础项，不在反馈中回算理论量。 */
    private RewardGrantResult.Outcome outcome(int item, long credited) {
        return new RewardGrantResult.Outcome(item, credited, credited, 0, RewardGrantResult.Reduction.NONE);
    }

    /** 最小合法实际结果，供事务与模式测试复用。 */
    private RewardGrantResult gold(String role) {
        return actual(role, List.of(outcome(900001, 10)), List.of());
    }

    /** 外部不得绕过原业务事务单独发通知，也不能遗留等待下一次事务的集合。 */
    @Test
    void outsideTransactionIsRejected() {
        assertThrows(IllegalStateException.class, () -> feedback.publish(UUID.randomUUID().toString(), "role-a",
                1, RewardFeedbackService.Mode.POPUP, gold("role-a")));
        assertTrue(notifications.isEmpty());
    }

    /** 基础真实到账和升级附赠各计一次，同ID合并，忽略量和已有钱包余额不能混入。 */
    @Test
    void popupMergesActualItemsAndIndependentBonusesOnlyAfterCommit() {
        var actual = actual("role-a", List.of(outcome(900001, 10), outcome(900002, 3), outcome(900001, 4),
                new RewardGrantResult.Outcome(900401, 20, 0, 20, RewardGrantResult.Reduction.TAVERN_CAP)),
                List.of(new RewardGrantResult.Bonus(RewardGrantResult.BonusSource.ROLE_LEVEL_UP, 900002, 2)));
        String receipt = UUID.randomUUID().toString();
        transaction.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO committed_marker VALUES ('popup')");
            feedback.publish(receipt, "role-a", 7, RewardFeedbackService.Mode.POPUP, actual);
            assertTrue(notifications.isEmpty());
        });
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM committed_marker", Integer.class));
        assertEquals(List.of(new RewardFeedbackService.Notice(1, receipt, "role-a", 7,
                RewardFeedbackService.Mode.POPUP, List.of(new RewardFeedbackService.Item(900001, 14),
                new RewardFeedbackService.Item(900002, 5)))), notifications);
        assertThrows(UnsupportedOperationException.class,
                () -> notifications.getFirst().items().add(new RewardFeedbackService.Item(1, 1)));
    }

    /** TIPS复用同一提交出口，保留原回执身份和模式，不重新执行发放。 */
    @Test
    void tipsUsesTheSameCommittedNotice() {
        String receipt = UUID.randomUUID().toString();
        transaction.executeWithoutResult(status -> feedback.publish(receipt, "role-a", 1,
                RewardFeedbackService.Mode.TIPS, gold("role-a")));
        assertEquals(receipt, notifications.getFirst().receiptId());
        assertEquals(RewardFeedbackService.Mode.TIPS, notifications.getFirst().mode());
    }

    /** 静默和全部零实际到账只影响反馈，不产生空奖励窗或虚假实际量。 */
    @Test
    void silentAndZeroActualAmountsDoNotEmitVisibleEvents() {
        var ignored = actual("role-a", List.of(new RewardGrantResult.Outcome(900003, 30, 0, 30,
                RewardGrantResult.Reduction.ROLE_MAX_LEVEL)), List.of());
        transaction.executeWithoutResult(status -> {
            feedback.publish(UUID.randomUUID().toString(), "role-a", 1,
                    RewardFeedbackService.Mode.SILENT, gold("role-a"));
            feedback.publish(UUID.randomUUID().toString(), "role-a", 1,
                    RewardFeedbackService.Mode.POPUP, ignored);
        });
        assertTrue(notifications.isEmpty());
    }

    /** 完全相同的同事务登记只发送一次，不维护跨事务的第二份持久幂等表。 */
    @Test
    void identicalReceiptInOneTransactionIsDeliveredOnce() {
        String receipt = UUID.randomUUID().toString();
        transaction.executeWithoutResult(status -> {
            feedback.publish(receipt, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"));
            feedback.publish(receipt, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"));
        });
        assertEquals(1, notifications.size());
    }

    /** 同一持久回执发生不同内容属于不变量损坏，必须回滚而不是选择其中一版展示。 */
    @Test
    void conflictingDuplicateRollsBackTheOriginalBusinessTransaction() {
        String receipt = UUID.randomUUID().toString();
        assertThrows(IllegalStateException.class, () -> transaction.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO committed_marker VALUES ('conflict')");
            feedback.publish(receipt, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"));
            feedback.publish(receipt, "role-a", 2, RewardFeedbackService.Mode.POPUP, gold("role-a"));
        }));
        assertTrue(notifications.isEmpty());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM committed_marker", Integer.class));
    }

    /** 回滚不交付，后续真实提交不受已清理的旧事务集合影响。 */
    @Test
    void rollbackDiscardsNoticeAndNextTransactionCanRegister() {
        String receipt = UUID.randomUUID().toString();
        transaction.executeWithoutResult(status -> {
            feedback.publish(receipt, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"));
            status.setRollbackOnly();
        });
        assertTrue(notifications.isEmpty());
        transaction.executeWithoutResult(status -> feedback.publish(receipt, "role-a", 1,
                RewardFeedbackService.Mode.POPUP, gold("role-a")));
        assertEquals(1, notifications.size());
    }

    /** 新事务独立提交、恢复外层去重，外层回滚也不能撤销已经提交的内层反馈。 */
    @Test
    void independentTransactionHasItsOwnBatchAndOuterRollbackDoesNotEraseIt() {
        String outer = UUID.randomUUID().toString();
        String inner = UUID.randomUUID().toString();
        transaction.executeWithoutResult(status -> {
            feedback.publish(outer, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"));
            requiresNew.executeWithoutResult(innerStatus -> feedback.publish(inner, "role-b", 1,
                    RewardFeedbackService.Mode.TIPS, gold("role-b")));
            assertEquals(List.of(inner), notifications.stream().map(RewardFeedbackService.Notice::receiptId).toList());
            feedback.publish(outer, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"));
            status.setRollbackOnly();
        });
        assertEquals(List.of(inner), notifications.stream().map(RewardFeedbackService.Notice::receiptId).toList());
    }

    /** 内层回滚后外层登记恢复且仍去重，不能清空外层或错误交付内层。 */
    @Test
    void innerRollbackRestoresTheOuterBatch() {
        String outer = UUID.randomUUID().toString();
        transaction.executeWithoutResult(status -> {
            feedback.publish(outer, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"));
            requiresNew.executeWithoutResult(innerStatus -> {
                feedback.publish(UUID.randomUUID().toString(), "role-b", 1,
                        RewardFeedbackService.Mode.TIPS, gold("role-b"));
                innerStatus.setRollbackOnly();
            });
            feedback.publish(outer, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"));
            assertTrue(notifications.isEmpty());
        });
        assertEquals(List.of(outer), notifications.stream().map(RewardFeedbackService.Notice::receiptId).toList());
    }

    /** 交付渠道故障不能回滚已保存业务，也不能跳过同次事务中其他回执。 */
    @Test
    void deliveryFailureDoesNotRevokeCommitOrSkipAnotherNotice() {
        listener = notice -> {
            if (notice.roleId().equals("role-a")) {
                throw new IllegalStateException("模拟通知发送失败");
            }
        };
        assertDoesNotThrow(() -> transaction.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO committed_marker VALUES ('delivery')");
            feedback.publish(UUID.randomUUID().toString(), "role-a", 1,
                    RewardFeedbackService.Mode.POPUP, gold("role-a"));
            feedback.publish(UUID.randomUUID().toString(), "role-b", 1,
                    RewardFeedbackService.Mode.TIPS, gold("role-b"));
        }));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM committed_marker", Integer.class));
        assertEquals(List.of("role-a", "role-b"), notifications.stream().map(RewardFeedbackService.Notice::roleId).toList());
    }

    /** 跨角色、坏回执、无效版本和数量不安全都拒绝，不能发送精度丢失或归属不明的奖励。 */
    @Test
    void invalidIdentityAndUnsafeAmountsAreRejectedBeforeDelivery() {
        transaction.executeWithoutResult(status -> {
            String receipt = UUID.randomUUID().toString();
            assertThrows(IllegalArgumentException.class, () -> feedback.publish(receipt, "role-b", 1,
                    RewardFeedbackService.Mode.POPUP, gold("role-a")));
            assertThrows(IllegalArgumentException.class, () -> feedback.publish("not-a-receipt", "role-a", 1,
                    RewardFeedbackService.Mode.POPUP, gold("role-a")));
            assertThrows(IllegalArgumentException.class, () -> feedback.publish(receipt, "role-a", 0,
                    RewardFeedbackService.Mode.POPUP, gold("role-a")));
            assertThrows(IllegalArgumentException.class, () -> feedback.publish(receipt, "role-a", MAX_SAFE_INTEGER + 1,
                    RewardFeedbackService.Mode.POPUP, gold("role-a")));
            assertThrows(IllegalArgumentException.class, () -> feedback.publish(receipt, "role-a", 1,
                    null, gold("role-a")));
            var over = actual("role-a", List.of(outcome(900001, MAX_SAFE_INTEGER)), List.of(
                    new RewardGrantResult.Bonus(RewardGrantResult.BonusSource.ROLE_LEVEL_UP, 900001, 1)));
            assertThrows(IllegalArgumentException.class, () -> feedback.publish(receipt, "role-a", 1,
                    RewardFeedbackService.Mode.POPUP, over));
            var negativeBonus = actual("role-a", List.of(), List.of(
                    new RewardGrantResult.Bonus(RewardGrantResult.BonusSource.ROLE_LEVEL_UP, 900002, -1)));
            assertThrows(IllegalArgumentException.class, () -> feedback.publish(receipt, "role-a", 1,
                    RewardFeedbackService.Mode.POPUP, negativeBonus));
        });
        assertTrue(notifications.isEmpty());
    }
}
