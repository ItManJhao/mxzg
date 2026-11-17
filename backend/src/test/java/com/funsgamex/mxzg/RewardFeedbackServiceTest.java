/**
 * 通用发奖反馈的事务专项：真实Spring事务和独立H2核对提交、回滚、静默、去重及嵌套事务。
 * 仅构造已发放结果以验证展示投影，不调用日常服务、不改变玩法开关，也不以通知代替资产事实。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.protocol.GameProtocol;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
                new RewardFeedbackService.Item(900002, 5)), null, null)), notifications);
        assertThrows(UnsupportedOperationException.class,
                () -> notifications.getFirst().items().add(new RewardFeedbackService.Item(1, 1)));
    }

    /** TIPS复用同一提交出口，原五参调用不额外携带请求关联，不重新执行发放。 */
    @Test
    void tipsUsesTheSameCommittedNotice() throws Exception {
        String receipt = UUID.randomUUID().toString();
        transaction.executeWithoutResult(status -> feedback.publish(receipt, "role-a", 1,
                RewardFeedbackService.Mode.TIPS, gold("role-a")));
        assertEquals(receipt, notifications.getFirst().receiptId());
        assertEquals(RewardFeedbackService.Mode.TIPS, notifications.getFirst().mode());
        assertNull(notifications.getFirst().requestId());
        var wire = GameProtocolCodec.encode(Map.of("version", 1, "kind", "event", "name", "reward.granted",
                "body", notifications.getFirst()));
        assertFalse(GameProtocol.Frame.parseFrom(wire).getRewardNotice().hasRequestId());
        assertFalse(GameProtocolCodec.decode(wire).path("body").has("requestId"));
    }

    /** 连续经验链只提取首尾升级，不以钻石量或当前角色状态推算；实时PB保留同一升级摘要。 */
    @Test
    void visibleModesKeepTheOriginalContinuousUpgradeAndWireFields() throws Exception {
        for (var mode : List.of(RewardFeedbackService.Mode.POPUP, RewardFeedbackService.Mode.TIPS)) {
            var actual = withExperience(gold("role-a"), List.of(
                    new RoleRules.ExperienceGain(1, 5, 20, 20, 0, 2, 3, 0),
                    new RoleRules.ExperienceGain(2, 3, 10, 10, 0, 4, 1, 0)));
            String receipt = UUID.randomUUID().toString();
            transaction.executeWithoutResult(status -> feedback.publish(receipt, "role-a", 7, mode, actual));
            var notice = notifications.getLast();
            assertEquals(new RewardFeedbackService.RoleUpgrade(1, 4), notice.roleUpgrade());
            var wire = GameProtocolCodec.encode(Map.of("version", 1, "kind", "event", "name", "reward.granted",
                    "body", notice));
            var typed = GameProtocol.Frame.parseFrom(wire).getRewardNotice();
            assertTrue(typed.hasRoleUpgrade());
            assertEquals(1, typed.getRoleUpgrade().getBeforeLevel());
            assertEquals(4, typed.getRoleUpgrade().getAfterLevel());
            var decoded = GameProtocolCodec.decode(wire).path("body").path("roleUpgrade");
            assertEquals(1, decoded.path("beforeLevel").asInt());
            assertEquals(4, decoded.path("afterLevel").asInt());
        }
        assertEquals(2, notifications.size());
    }

    /** 零正奖励但真实升级仍可显示；无升级或静默不能制造空窗，也不为了显示补发钻石。 */
    @Test
    void upgradeWithoutPositiveItemsIsVisibleButSilentStillDoesNotEmit() throws Exception {
        var empty = actual("role-a", List.of(), List.of());
        var upgrade = withExperience(empty, List.of(new RoleRules.ExperienceGain(1, 9, 1, 1, 0, 2, 0, 0)));
        transaction.executeWithoutResult(status -> {
            feedback.publish(UUID.randomUUID().toString(), "role-a", 1, RewardFeedbackService.Mode.POPUP, upgrade);
            feedback.publish(UUID.randomUUID().toString(), "role-a", 1, RewardFeedbackService.Mode.TIPS, upgrade);
            feedback.publish(UUID.randomUUID().toString(), "role-a", 1, RewardFeedbackService.Mode.SILENT, upgrade);
            feedback.publish(UUID.randomUUID().toString(), "role-a", 1, RewardFeedbackService.Mode.POPUP,
                    withExperience(empty, List.of(new RoleRules.ExperienceGain(2, 3, 4, 4, 0, 2, 7, 0))));
            feedback.publish(UUID.randomUUID().toString(), "role-a", 1, RewardFeedbackService.Mode.POPUP,
                    withExperience(empty, List.of(new RoleRules.ExperienceGain(100, 0, 4, 0, 4, 100, 0, 0))));
        });
        assertEquals(2, notifications.size());
        assertTrue(notifications.stream().allMatch(notice -> notice.items().isEmpty()
                && notice.roleUpgrade().equals(new RewardFeedbackService.RoleUpgrade(1, 2))));
        var wire = GameProtocolCodec.encode(Map.of("version", 1, "kind", "event", "name", "reward.granted",
                "body", notifications.getFirst()));
        var typed = GameProtocol.Frame.parseFrom(wire).getRewardNotice();
        assertEquals(0, typed.getItemsCount());
        assertTrue(typed.hasRoleUpgrade());
        assertEquals(2, typed.getRoleUpgrade().getAfterLevel());
        Files.write(Path.of("target/reward-notice-upgrade-empty.pb"), wire);
    }

    /** 同回执的升级来源也是冻结内容；只有升级范围改变也必须拒绝并回滚，而非叠加第二个窗口。 */
    @Test
    void conflictingUpgradeRollsBackEvenWhenRewardItemsMatch() {
        String receipt = UUID.randomUUID().toString();
        var first = withExperience(gold("role-a"), List.of(new RoleRules.ExperienceGain(1, 0, 1, 1, 0, 2, 0, 0)));
        var different = withExperience(gold("role-a"), List.of(new RoleRules.ExperienceGain(1, 0, 1, 1, 0, 3, 0, 0)));
        assertThrows(IllegalStateException.class, () -> transaction.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO committed_marker VALUES ('upgrade-conflict')");
            feedback.publish(receipt, "role-a", 1, RewardFeedbackService.Mode.POPUP, first);
            feedback.publish(receipt, "role-a", 1, RewardFeedbackService.Mode.POPUP, different);
        }));
        assertTrue(notifications.isEmpty());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM committed_marker", Integer.class));
    }

    /** 非法数值、倒退等级和拼接不连续均拒绝整笔事务，不从破损历史记录猜测一次升级。 */
    @Test
    void malformedExperienceChainsAreRejected() {
        var valid = new RoleRules.ExperienceGain(1, 5, 20, 20, 0, 2, 3, 0);
        var invalidRows = List.of(
                new RoleRules.ExperienceGain(0, 5, 20, 20, 0, 2, 3, 0),
                new RoleRules.ExperienceGain(2, 5, 20, 20, 0, 1, 3, 0),
                new RoleRules.ExperienceGain(1, -1, 20, 20, 0, 2, 3, 0),
                new RoleRules.ExperienceGain(1, MAX_SAFE_INTEGER + 1, 20, 20, 0, 2, 3, 0),
                new RoleRules.ExperienceGain(1, 5, 0, 0, 0, 2, 3, 0),
                new RoleRules.ExperienceGain(1, 5, 20, -1, 21, 2, 3, 0),
                new RoleRules.ExperienceGain(1, 5, 20, 20, -1, 2, 3, 0),
                new RoleRules.ExperienceGain(1, 5, 20, 19, 0, 2, 3, 0),
                new RoleRules.ExperienceGain(1, 5, 20, 0, 20, 2, 3, 0),
                new RoleRules.ExperienceGain(1, 5, 20, 20, 0, 1, 25, 1),
                new RoleRules.ExperienceGain(1, 5, 20, 20, 0, 2, -1, 0),
                new RoleRules.ExperienceGain(1, 5, 20, 20, 0, 2, 3, -1));
        var invalidChains = new ArrayList<List<RoleRules.ExperienceGain>>();
        invalidRows.forEach(row -> invalidChains.add(List.of(row)));
        invalidChains.add(List.of(valid, new RoleRules.ExperienceGain(3, 3, 10, 10, 0, 4, 1, 0)));
        invalidChains.add(List.of(valid, new RoleRules.ExperienceGain(2, 4, 10, 10, 0, 4, 1, 0)));
        for (var chain : invalidChains) {
            assertThrows(IllegalArgumentException.class, () -> transaction.executeWithoutResult(status -> {
                jdbc.update("INSERT INTO committed_marker VALUES ('invalid-upgrade')");
                feedback.publish(UUID.randomUUID().toString(), "role-a", 1, RewardFeedbackService.Mode.POPUP,
                        withExperience(gold("role-a"), chain));
            }));
            assertTrue(notifications.isEmpty());
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM committed_marker", Integer.class));
        }
    }

    /** 保留同一真实结果中的奖励及领域归属，仅替换本用例需要验证的冻结经验链。 */
    private RewardGrantResult withExperience(RewardGrantResult actual, List<RoleRules.ExperienceGain> gains) {
        return new RewardGrantResult(actual.roleId(), actual.items(), actual.wallet(), actual.stacks(), gains,
                actual.tavern(), actual.bonuses(), actual.timedItems(), actual.spirits());
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

    /** 相同原请求的同事务登记只发送一次，协议保留关联但仍使用持久回执作为展示身份。 */
    @Test
    void identicalReceiptInOneTransactionIsDeliveredOnce() throws Exception {
        String receipt = UUID.randomUUID().toString();
        String requestId = UUID.randomUUID().toString();
        transaction.executeWithoutResult(status -> {
            feedback.publish(receipt, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"), requestId);
            feedback.publish(receipt, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"), requestId);
        });
        assertEquals(1, notifications.size());
        assertEquals(requestId, notifications.getFirst().requestId());
        assertEquals(receipt, notifications.getFirst().receiptId());
        var wire = GameProtocolCodec.encode(Map.of("version", 1, "kind", "event", "name", "reward.granted",
                "body", notifications.getFirst()));
        var typed = GameProtocol.Frame.parseFrom(wire).getRewardNotice();
        assertTrue(typed.hasRequestId());
        assertEquals(requestId, typed.getRequestId());
        assertEquals(receipt, typed.getReceiptId());
        assertEquals(requestId, GameProtocolCodec.decode(wire).path("body").path("requestId").asString());
    }

    /** 请求关联属于同一回执内容；更换请求或删去关联不能绕开同事务冲突保护。 */
    @Test
    void conflictingRequestCorrelationRollsBackTheOriginalBusinessTransaction() {
        String receipt = UUID.randomUUID().toString();
        String requestId = UUID.randomUUID().toString();
        for (String conflictingRequest : new String[] { UUID.randomUUID().toString(), null }) {
            assertThrows(IllegalStateException.class, () -> transaction.executeWithoutResult(status -> {
                jdbc.update("INSERT INTO committed_marker VALUES ('request-conflict')");
                feedback.publish(receipt, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"), requestId);
                feedback.publish(receipt, "role-a", 1, RewardFeedbackService.Mode.POPUP,
                        gold("role-a"), conflictingRequest);
            }));
            assertTrue(notifications.isEmpty());
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM committed_marker", Integer.class));
        }
    }

    /** 非空请求关联必须是标准小写UUID；校验失败回滚原业务且不遗留下一事务可见的反馈。 */
    @Test
    void invalidRequestCorrelationRollsBackBusinessAndDiscardsNotices() {
        for (String invalid : List.of("", " ", "not-a-request", "12345678-1234-1234-1234-123456789ABC")) {
            assertThrows(IllegalArgumentException.class, () -> transaction.executeWithoutResult(status -> {
                jdbc.update("INSERT INTO committed_marker VALUES ('invalid-request')");
                feedback.publish(UUID.randomUUID().toString(), "role-a", 1,
                        RewardFeedbackService.Mode.POPUP, gold("role-a"));
                feedback.publish(UUID.randomUUID().toString(), "role-a", 1,
                        RewardFeedbackService.Mode.POPUP, gold("role-a"), invalid);
            }));
            assertTrue(notifications.isEmpty());
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM committed_marker", Integer.class));
        }
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

    /** 新事务独立保留请求关联并自行去重；外层恢复后继续去重，回滚不撤销内层已提交反馈。 */
    @Test
    void independentTransactionHasItsOwnBatchAndOuterRollbackDoesNotEraseIt() {
        String outer = UUID.randomUUID().toString();
        String inner = UUID.randomUUID().toString();
        String outerRequest = UUID.randomUUID().toString();
        String innerRequest = UUID.randomUUID().toString();
        transaction.executeWithoutResult(status -> {
            feedback.publish(outer, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"), outerRequest);
            requiresNew.executeWithoutResult(innerStatus -> {
                feedback.publish(inner, "role-b", 1, RewardFeedbackService.Mode.TIPS, gold("role-b"), innerRequest);
                feedback.publish(inner, "role-b", 1, RewardFeedbackService.Mode.TIPS, gold("role-b"), innerRequest);
            });
            assertEquals(List.of(inner), notifications.stream().map(RewardFeedbackService.Notice::receiptId).toList());
            feedback.publish(outer, "role-a", 1, RewardFeedbackService.Mode.POPUP, gold("role-a"), outerRequest);
            status.setRollbackOnly();
        });
        assertEquals(List.of(inner), notifications.stream().map(RewardFeedbackService.Notice::receiptId).toList());
        assertEquals(innerRequest, notifications.getFirst().requestId());
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
