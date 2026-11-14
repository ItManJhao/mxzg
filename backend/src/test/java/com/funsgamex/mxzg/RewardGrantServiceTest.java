/**
 * 共享可信发奖的真实事务专项：在独立H2验证类型分发、实际到账结果、回滚与角色锁串行。
 * 使用生产配置、领域服务和AssetSyncService，只有测试库中的回执表用于演示外层业务幂等。
 * 不启动玩家协议或服务，不连接日常角色库，也不把这些用例当作新挂机领取已开放的证据。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroCapacityService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.inventory.TimedInventoryService;
import com.funsgamex.mxzg.inventory.TimedItemRules;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Context;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.role.RoleExperienceService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import com.funsgamex.mxzg.spirit.SpiritRules;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.random.RandomGenerator;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class RewardGrantServiceTest {
    /** 固定在上海自然日结束前一秒，验证期限按自然日而非领取后满七天计算。 */
    private static final long NOW = Instant.parse("2026-11-14T15:59:59Z").getEpochSecond();
    /** 所有用例的默认可信上下文，酒馆上限对应当前已核实的前三关。 */
    private static final Context CONTEXT = new Context(NOW, 11_000);
    /** 当前唯一恢复的精灵配置ID，不是实例身份。 */
    private static final int SPIRIT = 2_000_002;
    /** 独立库的数据准备、已提交核对和回执SQL故障注入入口。 */
    private JdbcTemplate jdbc;
    /** 全部真实领域及测试外层业务共同使用的事务管理器。 */
    private DataSourceTransactionManager transactions;
    /** 真实角色行锁、钱包和版本读取入口，不保存第二份角色状态。 */
    private RoleRepository roles;
    /** 真实同源角色经验门槛，用于构造最后一级的准确边界。 */
    private RoleRules roleRules;
    /** 普通库存唯一入口，实际结果必须与它读取的持久记录一致。 */
    private InventoryService inventory;
    /** 带生产MANDATORY事务代理的精灵领域，读取不会重新抽样。 */
    private SpiritInventoryService spirits;
    /** 带生产MANDATORY事务代理的共享发奖入口。 */
    private RewardGrantService service;
    /** 实际结果和测试回执共用的JSON编解码器，不写入玩家协议。 */
    private ObjectMapper json;
    /** 真实提交后事件，线程安全记录并发用例中的每次角色通知。 */
    private List<AssetSyncService.Changed> notifications;

    /** 固定合法最低抽样点，并记录精灵真实生成链消费的随机次数。 */
    private static final class LowestDraws implements RandomGenerator {
        /** 跨并发线程统计真实抽样次数，拒绝和等待角色锁期间必须保持为零。 */
        private final AtomicInteger calls = new AtomicInteger();

        /** 返回合法半开区间的最低值，保留固定单项配置仍需抽样的行为。 */
        @Override
        public int nextInt(int bound) {
            assertTrue(bound > 0);
            calls.incrementAndGet();
            return 0;
        }

        /** 本批精灵规则不应改用未约定的长整型随机入口。 */
        @Override
        public long nextLong() {
            throw new AssertionError("未约定的精灵随机入口");
        }
    }

    /**
     * 测试业务持久化的原请求指纹和实际结果，不参与生产表或协议定义。
     * @param fingerprint 该测试请求原始理论计划的固定JSON，用于拒绝同键异内容
     * @param resultJson 外层事务保存的真实发奖结果，不从最新资产反向重建
     */
    private record SavedReceipt(String fingerprint, String resultJson) {}

    /** 以真实迁移建立独占H2，所有发奖依赖使用同一数据库和真实事务边界。 */
    @BeforeEach
    void createIsolatedRewardDomain() {
        String url = "jdbc:h2:mem:reward_grant_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000";
        Flyway.configure().dataSource(url, "sa", "").target("23").load().migrate();
        var source = new DriverManagerDataSource(url, "sa", "");
        jdbc = new JdbcTemplate(source);
        transactions = new DataSourceTransactionManager(source);
        notifications = new CopyOnWriteArrayList<>();
        var sync = new AssetSyncService(jdbc, event -> notifications.add((AssetSyncService.Changed) event));
        json = new ObjectMapper();
        roleRules = new RoleRules(json);
        // 本用例直接插入独立角色，不调用创建角色；容量依赖不参与任何被测奖励路径。
        roles = new RoleRepository(jdbc, sync, roleRules, mock(HeroCapacityService.class));
        inventory = new InventoryService(jdbc, sync, json, roles);
        var experience = transactional(new RoleExperienceService(roleRules, roles, jdbc, sync),
                RoleExperienceService.class);
        var timedRules = new TimedItemRules(json);
        var timed = new TimedInventoryService(jdbc, sync, timedRules);
        spirits = transactional(new SpiritInventoryService(jdbc, roles, new SpiritRules(json), sync, json),
                SpiritInventoryService.class);
        service = transactional(new RewardGrantService(roles, experience, inventory, timedRules, timed,
                spirits, sync, json), RewardGrantService.class);
        jdbc.execute("CREATE TABLE reward_test_receipt (role_id VARCHAR(36) NOT NULL, "
                + "request_id VARCHAR(64) NOT NULL, fingerprint TEXT NOT NULL, result_json TEXT NOT NULL, "
                + "PRIMARY KEY(role_id,request_id))");
    }

    /** 关闭本用例独占内存库，清除测试回执和全部角色数据。 */
    @AfterEach
    void closeDatabase() {
        if (jdbc != null) {
            jdbc.execute("SHUTDOWN");
        }
    }

    /** 为真实领域方法安装与生产注解一致的Spring事务代理，不替换方法实现。 */
    private <T> T transactional(T target, Class<T> type) {
        var interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(transactions);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(target);
        factory.addAdvice(interceptor);
        return type.cast(factory.getProxy());
    }

    /** 在独立库建立指定经验和钱包边界的角色，数据准备不产生奖励通知。 */
    private String role(int level, long experience, long gold, long diamonds) {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,role_experience,"
                        + "gold,diamonds,login_account,server_id) VALUES (?,?,?,?,?,?,?,?,'local-1')",
                id, "reward_" + id, "Reward", level, experience, gold, diamonds, "reward_" + id);
        return id;
    }

    /** 插入仅用于前置余额的普通记录，不调用发奖、不推进同步版本。 */
    private void seedStack(String role, int itemId, long quantity) {
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,?,?,?)",
                role, itemId, quantity, UUID.randomUUID().toString());
    }

    /** 在可信外层事务调用共享发奖，返回后事务已经完成提交。 */
    private RewardGrantResult grant(String role, List<Reward> rewards, Context context, RandomGenerator random) {
        return new TransactionTemplate(transactions).execute(status -> service.grant(role, rewards, context, random));
    }

    /** 读取指定结果条目；缺项明确失败，避免零到账项被静默漏掉。 */
    private RewardGrantResult.Outcome outcome(RewardGrantResult result, int itemId) {
        return result.items().stream().filter(item -> item.itemId() == itemId).findFirst().orElseThrow();
    }

    /** 按生产角色锁和真实校验恢复精灵，不以临时结果代替持久实例。 */
    private SpiritInventoryService.State spiritState(String role) {
        return new TransactionTemplate(transactions).execute(status -> spirits.current(role));
    }

    /** 核对一个角色的所有资产写入均已回滚，包括实例、普通库存与资产版本。 */
    private void assertNoRewardAssets(String role) {
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_inventory WHERE role_id=?", Integer.class, role));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_timed_inventory WHERE role_id=?", Integer.class, role));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_spirit WHERE role_id=?", Integer.class, role));
        assertEquals(0, roles.revision(role));
        assertTrue(notifications.isEmpty());
    }

    /** 多类型真实发奖共用一次资产版本，并保留逐件实例和酒馆实际截顶结果。 */
    @Test
    void mixedRewardsCommitActualDomainResultsWithOneRevisionAndNotification() {
        String role = role(1, 100, 100, 20);
        seedStack(role, 900401, 10_995);
        var random = new LowestDraws();
        var result = new TransactionTemplate(transactions).execute(status -> {
            var granted = service.grant(role, List.of(
                    new Reward(900001, 7), new Reward(900002, 2), new Reward(900003, 20),
                    new Reward(900101, 40), new Reward(1001001, 3), new Reward(900401, 4),
                    new Reward(902025, 2), new Reward(SPIRIT, 2), new Reward(900001, 3),
                    new Reward(900101, 5), new Reward(900401, 8)), CONTEXT, random);
            assertTrue(notifications.isEmpty());
            assertEquals(1, roles.revision(role));
            return granted;
        });
        assertEquals(List.of(900001, 900002, 900003, 900101, 1001001, 900401, 902025, SPIRIT),
                result.items().stream().map(RewardGrantResult.Outcome::itemId).toList());
        assertEquals(new RewardGrantResult.Outcome(900001, 10, 10, 0, RewardGrantResult.Reduction.NONE),
                outcome(result, 900001));
        assertEquals(new RewardGrantResult.Outcome(900101, 45, 45, 0, RewardGrantResult.Reduction.NONE),
                outcome(result, 900101));
        assertEquals(new RewardGrantResult.Outcome(900401, 12, 5, 7, RewardGrantResult.Reduction.TAVERN_CAP),
                outcome(result, 900401));
        assertEquals(new RoleRepository.CurrencyCredit(100, 20, 110, 32), result.wallet());
        var storedRole = roles.findById(role).orElseThrow();
        assertEquals(110, storedRole.gold());
        assertEquals(32, storedRole.diamonds());
        assertEquals(2, storedRole.level());
        assertEquals(0, storedRole.basics().experience());
        assertEquals(List.of(new RoleRules.ExperienceGain(1, 100, 20, 20, 0, 2, 0, 10)), result.experience());
        assertEquals(List.of(new RewardGrantResult.Bonus(RewardGrantResult.BonusSource.ROLE_LEVEL_UP, 900002, 10)),
                result.bonuses());
        assertEquals(List.of(new RewardGrantResult.TavernChange(10_995, 11_000, 11_000)), result.tavern());
        assertEquals(3, result.stacks().size());
        for (var credit : result.stacks()) {
            var stored = inventory.find(role, credit.itemId()).orElseThrow();
            assertEquals(credit.instanceId(), stored.instanceId());
            assertEquals(credit.afterQuantity(), stored.quantity());
            assertEquals(credit.beforeQuantity() + credit.quantity(), credit.afterQuantity());
        }
        assertEquals(45, inventory.find(role, 900101).orElseThrow().quantity());
        assertEquals(3, inventory.find(role, 1001001).orElseThrow().quantity());
        assertEquals(2, result.timedItems().size());
        assertEquals(2, result.timedItems().stream().map(TimedInventoryService.Item::instanceId).distinct().count());
        for (var item : result.timedItems()) {
            assertEquals(902025, item.itemId());
            assertEquals(NOW, item.activeAtSeconds());
            assertEquals(Instant.parse("2026-11-20T15:59:59Z").getEpochSecond(), item.expiresAtSeconds());
            assertEquals(item.expiresAtSeconds(), jdbc.queryForObject(
                    "SELECT expires_at_seconds FROM game_timed_inventory WHERE instance_id=?", Long.class, item.instanceId()));
        }
        assertEquals(2, result.spirits().items().size());
        assertEquals(SpiritInventoryService.SCHEMA_VERSION, result.spirits().schemaVersion());
        assertEquals(Set.copyOf(result.spirits().items()), Set.copyOf(spiritState(role).items()));
        assertEquals(2, result.spirits().items().stream().map(SpiritInventoryService.Item::instanceId).distinct().count());
        for (var item : result.spirits().items()) {
            assertEquals(SPIRIT, item.itemId());
            assertEquals(1, item.abilityId());
            assertEquals(List.of(new SpiritRules.Skill(1, 150010001, 1)), item.skills());
        }
        assertEquals(8, random.calls.get());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_inventory WHERE role_id=? AND item_id IN (900003,902025,2000002)",
                Integer.class, role));
        assertEquals(1, roles.revision(role));
        assertEquals(List.of(new AssetSyncService.Changed(role)), notifications);
    }

    /** 满级和已超酒馆上限均保留零到账明细，不倒扣资产、不推进版本或发送空通知。 */
    @Test
    void mergedRewardsAtExistingCapsKeepIgnoredReasonsWithoutCreatingAWrite() {
        String role = role(300, 7, 100, 20);
        seedStack(role, 900401, 11_002);
        var before = roles.findById(role).orElseThrow();
        var result = grant(role, List.of(new Reward(900003, 100), new Reward(900401, 20),
                new Reward(900003, 200), new Reward(900401, 30)), CONTEXT, new LowestDraws());
        assertEquals(new RewardGrantResult.Outcome(900003, 300, 0, 300, RewardGrantResult.Reduction.ROLE_MAX_LEVEL),
                outcome(result, 900003));
        assertEquals(new RewardGrantResult.Outcome(900401, 50, 0, 50, RewardGrantResult.Reduction.TAVERN_CAP),
                outcome(result, 900401));
        assertEquals(List.of(new RoleRules.ExperienceGain(300, 7, 300, 0, 300, 300, 7, 0)), result.experience());
        assertEquals(List.of(new RewardGrantResult.TavernChange(11_002, 11_000, 11_002)), result.tavern());
        assertTrue(result.stacks().isEmpty());
        assertTrue(result.bonuses().isEmpty());
        assertEquals(before, roles.findById(role).orElseThrow());
        assertEquals(11_002, inventory.find(role, 900401).orElseThrow().quantity());
        assertEquals(0, roles.revision(role));
        assertTrue(notifications.isEmpty());
    }

    /** 零酒馆额度且原来没有库存时，仍冻结原因与前后余额，不新建空记录。 */
    @Test
    void zeroTavernAllowanceDoesNotCreateAnEmptyStack() {
        String role = role(1, 0, 0, 0);
        var result = grant(role, List.of(new Reward(900401, 11)), new Context(NOW, 0), new LowestDraws());
        assertEquals(new RewardGrantResult.Outcome(900401, 11, 0, 11, RewardGrantResult.Reduction.TAVERN_CAP),
                result.items().getFirst());
        assertEquals(List.of(new RewardGrantResult.TavernChange(0, 0, 0)), result.tavern());
        assertTrue(result.stacks().isEmpty());
        assertNoRewardAssets(role);
    }

    /** 最后一级只接纳所缺经验，超额独立记为忽略，升级赠钻与直接钻石来源分开冻结。 */
    @Test
    void reachingTheMaximumLevelSeparatesAcceptedExperienceAndBonusDiamonds() {
        long previousExperience = roleRules.threshold(299) - 1;
        String role = role(299, previousExperience, 0, 0);
        var result = grant(role, List.of(new Reward(900003, 40), new Reward(900002, 3),
                new Reward(900003, 60)), CONTEXT, new LowestDraws());
        assertEquals(new RewardGrantResult.Outcome(900003, 100, 1, 99, RewardGrantResult.Reduction.ROLE_MAX_LEVEL),
                outcome(result, 900003));
        assertEquals(List.of(new RoleRules.ExperienceGain(299, previousExperience, 100, 1, 99, 300, 0, 200)),
                result.experience());
        assertEquals(new RewardGrantResult.Outcome(900002, 3, 3, 0, RewardGrantResult.Reduction.NONE),
                outcome(result, 900002));
        assertEquals(List.of(new RewardGrantResult.Bonus(RewardGrantResult.BonusSource.ROLE_LEVEL_UP, 900002, 200)),
                result.bonuses());
        assertEquals(new RoleRepository.CurrencyCredit(0, 0, 0, 203), result.wallet());
        assertEquals(300, roles.findById(role).orElseThrow().level());
        assertEquals(0, roles.findById(role).orElseThrow().basics().experience());
        assertEquals(1, roles.revision(role));
        assertEquals(1, notifications.size());
    }

    /** 全部15项及已恢复期限可提前验证，未知或未恢复精灵在抽样和任何资产写入前拒绝。 */
    @Test
    void candidateSupportAndWholePlanValidationRejectUnknownRoutesBeforeDrawing() {
        service.requireSupported(List.of(900001, 900002, 900003, 900101, 900102, 900401, 900502,
                901701, 901702, 1001001, 1002001, 1003001, 1004001, SPIRIT, 20003000, 902025));
        assertThrows(IllegalArgumentException.class, () -> service.requireSupported(List.of(900001, Integer.MAX_VALUE)));
        assertThrows(IllegalArgumentException.class, () -> service.requireSupported(List.of(2_000_003)));
        assertThrows(IllegalArgumentException.class, () -> service.requireSupported(Arrays.asList(900001, null)));
        String role = role(1, 0, 0, 0);
        var random = new LowestDraws();
        assertThrows(IllegalArgumentException.class, () -> grant(role, List.of(new Reward(900001, 10),
                new Reward(SPIRIT, 1), new Reward(Integer.MAX_VALUE, 1)), CONTEXT, random));
        assertEquals(0, random.calls.get());
        assertEquals(0, roles.findById(role).orElseThrow().gold());
        assertNoRewardAssets(role);
    }

    /** 精灵和期限拆行均不能绕过1000单次保护，合并后1001在抽样和前项钱包写入前整次拒绝。 */
    @Test
    void splitInstanceQuantitiesAreMergedBeforeTheirTechnicalBatchLimits() {
        for (int itemId : List.of(SPIRIT, 902025)) {
            String role = role(1, 0, 0, 0);
            var random = new LowestDraws();
            assertThrows(IllegalArgumentException.class, () -> grant(role, List.of(new Reward(900001, 10),
                    new Reward(itemId, 600), new Reward(itemId, 401)), CONTEXT, random));
            assertEquals(0, random.calls.get());
            assertEquals(0, roles.findById(role).orElseThrow().gold());
            assertNoRewardAssets(role);
        }
    }

    /** 不同期限配置也共享整笔1000件技术保护，不能按物品ID分别放行绕过总写入上限。 */
    @Test
    void differentTimedItemIdsShareTheWholePlanTechnicalBatchLimit() {
        String role = role(1, 0, 0, 0);
        var random = new LowestDraws();
        assertThrows(IllegalArgumentException.class, () -> grant(role, List.of(new Reward(900001, 10),
                new Reward(SPIRIT, 1), new Reward(902025, 600), new Reward(902026, 401)), CONTEXT, random));
        assertEquals(0, random.calls.get());
        assertEquals(0, roles.findById(role).orElseThrow().gold());
        assertNoRewardAssets(role);
    }

    /** 任意重复物品合并溢出都在写入和抽样前失败，不能依赖SQL截断或跳过坏条目。 */
    @Test
    void mergedQuantityOverflowDoesNotDrawOrWriteEarlierRewards() {
        String role = role(1, 0, 0, 0);
        var random = new LowestDraws();
        assertThrows(ArithmeticException.class, () -> grant(role, List.of(new Reward(SPIRIT, 1),
                new Reward(900001, Long.MAX_VALUE), new Reward(900001, 1)), CONTEXT, random));
        assertEquals(0, random.calls.get());
        assertEquals(0, roles.findById(role).orElseThrow().gold());
        assertNoRewardAssets(role);
    }

    /** 末项钱包溢出时，此前已写入的经验、附赠、堆叠、期限和精灵必须全部回滚。 */
    @Test
    void aLaterDomainFailureRollsBackAllEarlierRewardsAndTheirRevision() {
        String role = role(1, 100, 100, Long.MAX_VALUE - 10);
        var before = roles.findById(role).orElseThrow();
        var random = new LowestDraws();
        assertThrows(ArithmeticException.class, () -> grant(role, List.of(new Reward(900001, 10),
                new Reward(900003, 20), new Reward(900101, 30), new Reward(1001001, 4),
                new Reward(900401, 5), new Reward(902025, 1), new Reward(SPIRIT, 1),
                new Reward(900002, 1)), CONTEXT, random));
        assertEquals(4, random.calls.get());
        assertEquals(before, roles.findById(role).orElseThrow());
        assertNoRewardAssets(role);
    }

    /** 共享发奖成功而外层回执唯一键失败时，同一事务内的资产和第一条回执也全部回滚。 */
    @Test
    void outerReceiptPersistenceFailureRollsBackTheGrantAndReceiptTogether() {
        String role = role(1, 100, 100, 20);
        var before = roles.findById(role).orElseThrow();
        var random = new LowestDraws();
        assertThrows(DataIntegrityViolationException.class,
                () -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
                    var result = service.grant(role, List.of(new Reward(900001, 10), new Reward(900003, 20),
                            new Reward(900101, 30), new Reward(902025, 1), new Reward(SPIRIT, 1)), CONTEXT, random);
                    String text = json.writeValueAsString(result);
                    jdbc.update("INSERT INTO reward_test_receipt VALUES (?,?,?,?)", role, "receipt-fails", "same", text);
                    jdbc.update("INSERT INTO reward_test_receipt VALUES (?,?,?,?)", role, "receipt-fails", "same", text);
                }));
        assertEquals(4, random.calls.get());
        assertEquals(before, roles.findById(role).orElseThrow());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM reward_test_receipt", Integer.class));
        assertNoRewardAssets(role);
    }

    /** 真实角色锁使两个事务串行，等待者不提前抽样，两笔提交各自只产生一个版本和通知。 */
    @Test
    void concurrentGrantsWaitForTheRoleLockAndNotifyOncePerCommit() throws Exception {
        String role = role(1, 0, 100, 20);
        var firstDraws = new LowestDraws();
        var secondDraws = new LowestDraws();
        var entered = new CountDownLatch(1);
        var contender = new AtomicReference<Future<RewardGrantResult>>();
        var rewards = List.of(new Reward(900001, 10), new Reward(900101, 5), new Reward(SPIRIT, 1));
        try (var executor = Executors.newSingleThreadExecutor()) {
            var first = new TransactionTemplate(transactions).execute(status -> {
                roles.lock(role);
                contender.set(executor.submit(() -> {
                    entered.countDown();
                    return grant(role, rewards, CONTEXT, secondDraws);
                }));
                assertTrue(assertDoesNotThrow(() -> entered.await(10, TimeUnit.SECONDS)));
                assertThrows(TimeoutException.class, () -> contender.get().get(200, TimeUnit.MILLISECONDS));
                assertEquals(0, secondDraws.calls.get());
                var result = service.grant(role, rewards, CONTEXT, firstDraws);
                assertTrue(notifications.isEmpty());
                return result;
            });
            var second = contender.get().get(10, TimeUnit.SECONDS);
            assertEquals(new RoleRepository.CurrencyCredit(100, 20, 110, 20), first.wallet());
            assertEquals(new RoleRepository.CurrencyCredit(110, 20, 120, 20), second.wallet());
        }
        assertEquals(120, roles.findById(role).orElseThrow().gold());
        assertEquals(10, inventory.find(role, 900101).orElseThrow().quantity());
        assertEquals(2, spiritState(role).items().size());
        assertEquals(4, firstDraws.calls.get());
        assertEquals(4, secondDraws.calls.get());
        assertEquals(2, roles.revision(role));
        assertEquals(List.of(new AssetSyncService.Changed(role), new AssetSyncService.Changed(role)), notifications);
    }

    /** 外层持久回执冻结真实结果，后续资产变化和重放均不重算属性、不再调用共享发奖。 */
    @Test
    void serializedActualResultsStayFrozenAndOuterReplayDoesNotGrantAgain() {
        String role = role(1, 100, 100, 20);
        var rewards = List.of(new Reward(900001, 10), new Reward(900003, 20), new Reward(900101, 30),
                new Reward(900401, 12), new Reward(902025, 1), new Reward(SPIRIT, 1));
        var random = new LowestDraws();
        var grantCalls = new AtomicInteger();
        var first = replayableGrant(role, "frozen-result", rewards, random, grantCalls);
        String saved = jdbc.queryForObject("SELECT result_json FROM reward_test_receipt WHERE role_id=? AND request_id=?",
                String.class, role, "frozen-result");
        var restored = json.readValue(saved, RewardGrantResult.class);
        assertEquals(first, restored);
        assertThrows(UnsupportedOperationException.class, () -> restored.items().clear());
        assertThrows(UnsupportedOperationException.class, () -> restored.stacks().clear());
        assertThrows(UnsupportedOperationException.class, () -> restored.spirits().items().getFirst().skills().clear());
        grant(role, List.of(new Reward(900001, 7), new Reward(900003, 50), new Reward(900101, 2),
                new Reward(900401, 3), new Reward(902026, 1), new Reward(SPIRIT, 1)), CONTEXT, new LowestDraws());
        var afterChanges = roles.findById(role).orElseThrow();
        var currentSpirits = spiritState(role);
        long revision = roles.revision(role);
        int notificationCount = notifications.size();
        var replay = replayableGrant(role, "frozen-result", rewards, random, grantCalls);
        assertEquals(first, replay);
        assertEquals(saved, json.writeValueAsString(replay));
        assertEquals(1, grantCalls.get());
        assertEquals(4, random.calls.get());
        assertEquals(afterChanges, roles.findById(role).orElseThrow());
        assertEquals(currentSpirits, spiritState(role));
        assertEquals(2, currentSpirits.items().size());
        assertEquals(30, restored.stacks().stream().filter(item -> item.itemId() == 900101).findFirst().orElseThrow().afterQuantity());
        assertEquals(32, inventory.find(role, 900101).orElseThrow().quantity());
        assertEquals(1, restored.spirits().items().size());
        assertEquals(2, revision);
        assertEquals(revision, roles.revision(role));
        assertEquals(notificationCount, notifications.size());
    }

    /** 外层测试业务先锁角色并查成功回执；相同请求只恢复保存结果，异内容明确拒绝。 */
    private RewardGrantResult replayableGrant(String role, String requestId, List<Reward> rewards,
                                              RandomGenerator random, AtomicInteger grantCalls) {
        String fingerprint = json.writeValueAsString(rewards);
        return new TransactionTemplate(transactions).execute(status -> {
            roles.lock(role);
            var saved = jdbc.query("SELECT fingerprint,result_json FROM reward_test_receipt WHERE role_id=? AND request_id=?",
                    (row, index) -> new SavedReceipt(row.getString(1), row.getString(2)), role, requestId);
            if (!saved.isEmpty()) {
                if (!saved.getFirst().fingerprint().equals(fingerprint)) {
                    throw new IllegalArgumentException("测试业务请求指纹冲突");
                }
                return json.readValue(saved.getFirst().resultJson(), RewardGrantResult.class);
            }
            grantCalls.incrementAndGet();
            var result = service.grant(role, rewards, CONTEXT, random);
            jdbc.update("INSERT INTO reward_test_receipt VALUES (?,?,?,?)",
                    role, requestId, fingerprint, json.writeValueAsString(result));
            return result;
        });
    }

    /** 没有外层事务禁止直接发放，领域方法不能自行提交来绕过业务幂等与回执边界。 */
    @Test
    void grantRequiresTheOuterBusinessTransaction() {
        String role = role(1, 0, 0, 0);
        var random = new LowestDraws();
        assertThrows(IllegalTransactionStateException.class,
                () -> service.grant(role, List.of(new Reward(SPIRIT, 1)), CONTEXT, random));
        assertEquals(0, random.calls.get());
        assertNoRewardAssets(role);
    }
}
