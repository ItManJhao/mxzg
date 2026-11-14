/**
 * 最小精灵持久领域回归：在独立H2验证真实属性生成、实例身份、完整读取和奖励事务原子性。
 * 使用生产SpiritRules、角色行锁及AssetSyncService，不开放GM、领取、穿戴或洗练。
 * V23真实建表与SQL故障夹具仅存在于用例独占内存库，不写入日常角色或普通堆叠库存。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroCapacityService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import com.funsgamex.mxzg.spirit.SpiritRules;
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
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
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

class SpiritInventoryServiceTest {
    /** 测试唯一已授权物品，不把精灵随机属性当作玩家可提交参数。 */
    private static final int ITEM_ID = 2_000_002;
    /** 本用例独占H2地址，结束时关闭，不连接项目日常数据库。 */
    private String databaseUrl;
    /** 只用于用例数据准备、已提交状态核对及故障注入。 */
    private JdbcTemplate jdbc;
    /** 生产服务和调用方共同使用的事务管理器，角色锁持有至外层事务完成。 */
    private DataSourceTransactionManager transactions;
    /** 真实角色锁与持久版本读取入口，本测试不调用角色初始化规则。 */
    private RoleRepository roles;
    /** 实际同源精灵规则，生成与读取均走生产校验。 */
    private SpiritRules rules;
    /** 带生产MANDATORY事务代理的精灵领域入口。 */
    private SpiritInventoryService service;
    /** 真实资产提交通知，仅在外层提交后出现，并发线程可安全记录。 */
    private List<AssetSyncService.Changed> notifications;

    /** 固定最低合法抽样点，使不同实例具有相同属性，验证其仍保留独立身份。 */
    private static final class LowestDraws implements RandomGenerator {
        /** 实际抽样次数，使用原子变量核对等待角色锁时尚未消费随机源。 */
        private final AtomicInteger calls = new AtomicInteger();

        /** 只支持生产生成链的合法半开整数抽样，始终返回0且保留每次调用。 */
        @Override
        public int nextInt(int bound) {
            assertTrue(bound > 0);
            calls.incrementAndGet();
            return 0;
        }

        /** 本批规则不应悄悄改用未约定的长整型随机入口。 */
        @Override
        public long nextLong() {
            throw new AssertionError("未约定的精灵随机入口");
        }
    }

    /** 使用真实V23结构及生产规则，只有钱包不涉及的角色初始化依赖使用替身。 */
    @BeforeEach
    void createIsolatedSpiritInventory() {
        databaseUrl = "jdbc:h2:mem:spirit_inventory_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000";
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("23").load().migrate();
        var source = new DriverManagerDataSource(databaseUrl, "sa", "");
        jdbc = new JdbcTemplate(source);
        transactions = new DataSourceTransactionManager(source);
        notifications = new CopyOnWriteArrayList<>();
        var sync = new AssetSyncService(jdbc, event -> notifications.add((AssetSyncService.Changed) event));
        roles = new RoleRepository(jdbc, sync, mock(RoleRules.class), mock(HeroCapacityService.class));
        var json = new ObjectMapper();
        rules = new SpiritRules(json);
        var target = new SpiritInventoryService(jdbc, roles, rules, sync, json);
        var interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(transactions);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(target);
        factory.addAdvice(interceptor);
        service = (SpiritInventoryService) factory.getProxy();
    }

    /** 关闭本用例独占内存库，不保留实例、连接或后台线程。 */
    @AfterEach
    void closeDatabase() {
        jdbc.execute("SHUTDOWN");
    }

    /** 建立仅属于本独立库的角色，不经过玩家GM或任何奖励入口。 */
    private String role() {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id) "
                        + "VALUES (?,?,?,1,0,0,?,'local-1')", id, "spirit_" + id, "Spirit", "spirit_" + id);
        return id;
    }

    /** 使用真实调用方事务发放，领域方法不得创建独立事务或在提交后补实例。 */
    private List<SpiritInventoryService.Item> grant(String role, int quantity, RandomGenerator random) {
        return new TransactionTemplate(transactions).execute(status -> service.grant(role, ITEM_ID, quantity, random));
    }

    /** 在真实角色锁事务中读取完整状态，不以未加锁的Jdbc查询冒充生产恢复入口。 */
    private SpiritInventoryService.State current(String role) {
        return new TransactionTemplate(transactions).execute(status -> service.current(role));
    }

    /** 读取当前角色实例总数，校验回滚或批量写入是否实际落库。 */
    private int count(String role) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_spirit WHERE role_id=?", Integer.class, role);
    }

    /** 同属性也逐件持久化，完整读取恢复真实技能，不向普通库存写入数量。 */
    @Test
    void generatedInstancesKeepDistinctIdsAndRestoreTheirActualAttributes() {
        String role = role();
        var created = grant(role, 3, new LowestDraws());
        assertEquals(3, created.size());
        assertEquals(3, created.stream().map(SpiritInventoryService.Item::instanceId).distinct().count());
        for (var item : created) {
            assertEquals(UUID.fromString(item.instanceId()).toString(), item.instanceId());
            assertEquals(ITEM_ID, item.itemId());
            assertEquals(1, item.abilityId());
            assertEquals(List.of(new SpiritRules.Skill(1, 150010001, 1)), item.skills());
            rules.validate(new SpiritRules.Generation(item.itemId(), item.abilityId(), item.skills()));
            var stored = jdbc.queryForMap("SELECT hero_id,place,exp,wash_ability_id,wash_skills_json "
                    + "FROM game_spirit WHERE instance_id=?", item.instanceId());
            assertNull(stored.get("hero_id"));
            assertEquals(0, ((Number) stored.get("place")).intValue());
            assertEquals(0L, ((Number) stored.get("exp")).longValue());
            assertEquals(0, ((Number) stored.get("wash_ability_id")).intValue());
            assertEquals("[]", stored.get("wash_skills_json"));
        }
        var restored = current(role);
        assertEquals(1, restored.schemaVersion());
        assertEquals(Set.copyOf(created), Set.copyOf(restored.items()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_inventory WHERE role_id=? AND item_id=?",
                Integer.class, role, ITEM_ID));
        assertEquals(1, roles.revision(role));
        assertEquals(List.of(new AssetSyncService.Changed(role)), notifications);
        assertThrows(UnsupportedOperationException.class, created::clear);
        assertThrows(UnsupportedOperationException.class, () -> created.getFirst().skills().clear());
        assertThrows(UnsupportedOperationException.class, () -> restored.items().clear());
    }

    /** 一千是单次调用保护而非持有容量，合法多次发放仍累计独立实例且同事务只同步一次。 */
    @Test
    void technicalBatchLimitDoesNotBecomeAHoldingCapacity() {
        String role = role();
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            assertEquals(1000, service.grant(role, ITEM_ID, 1000, new LowestDraws()).size());
            assertEquals(1, service.grant(role, ITEM_ID, 1, new LowestDraws()).size());
            assertTrue(notifications.isEmpty());
        });
        assertEquals(1001, count(role));
        assertEquals(1001, current(role).items().size());
        assertEquals(1, roles.revision(role));
        assertEquals(1, notifications.size());
    }

    /** 未知物品、非正/超批量数量及缺随机源都在抽样前拒绝，不能裁成合法数量继续入账。 */
    @Test
    void invalidGrantRequestDoesNotDrawOrWrite() {
        String role = role();
        var random = new LowestDraws();
        for (int quantity : List.of(-1, 0, 1001, Integer.MAX_VALUE)) {
            assertThrows(IllegalArgumentException.class, () -> grant(role, quantity, random));
        }
        assertThrows(IllegalArgumentException.class, () -> new TransactionTemplate(transactions).executeWithoutResult(
                status -> service.grant(role, 900001, 1, random)));
        assertThrows(IllegalArgumentException.class, () -> grant(role, 1, null));
        assertEquals(0, random.calls.get());
        assertEquals(0, count(role));
        assertEquals(0, roles.revision(role));
        assertTrue(notifications.isEmpty());
    }

    /** 后续奖励步骤失败时，实例、角色资产版本和提交通知整体回滚。 */
    @Test
    void outerRewardFailureRollsBackInstancesAndAssetVersion() {
        String role = role();
        assertThrows(IllegalStateException.class, () -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
            assertEquals(2, service.grant(role, ITEM_ID, 2, new LowestDraws()).size());
            assertEquals(2, count(role));
            assertTrue(notifications.isEmpty());
            throw new IllegalStateException("模拟同次其他奖励发放失败");
        }));
        assertEquals(0, count(role));
        assertEquals(0, roles.revision(role));
        assertTrue(current(role).items().isEmpty());
        assertTrue(notifications.isEmpty());
    }

    /** 第二次SQL插入失败也必须回滚首件，不允许把半批实例保存为成功发放。 */
    @Test
    void sqlFailureInTheMiddleOfABatchRollsBackEarlierInstances() {
        String role = role();
        jdbc.execute("ALTER TABLE game_spirit ADD CONSTRAINT spirit_test_one_ability UNIQUE(role_id,ability_id)");
        assertThrows(DataIntegrityViolationException.class, () -> grant(role, 2, new LowestDraws()));
        assertEquals(0, count(role));
        assertEquals(0, roles.revision(role));
        assertTrue(notifications.isEmpty());
    }

    /** 完整读取只返回当前角色，重复恢复不重新抽样、不改UUID和资产版本。 */
    @Test
    void ownershipAndRepeatedReadsKeepTheSameFrozenInstances() {
        String first = role();
        String second = role();
        var random = new LowestDraws();
        grant(first, 2, random);
        int draws = random.calls.get();
        var before = current(first);
        assertEquals(before, current(first));
        assertTrue(current(second).items().isEmpty());
        assertEquals(draws, random.calls.get());
        assertEquals(1, roles.revision(first));
        assertEquals(0, roles.revision(second));
        assertEquals(List.of(new AssetSyncService.Changed(first)), notifications);
        assertThrows(EmptyResultDataAccessException.class, () -> current("missing-spirit-role"));
    }

    /** 坏技能、缺字段、重复/陌生字段及规则中不存在的属性都拒绝整包，不返回部分或空状态。 */
    @Test
    void corruptPersistentSkillsRejectTheWholeState() {
        String role = role();
        var item = grant(role, 1, new LowestDraws()).getFirst();
        String original = jdbc.queryForObject("SELECT skills_json FROM game_spirit WHERE instance_id=?",
                String.class, item.instanceId());
        for (String text : List.of("[]", "null", "{}", "not-json",
                "[{\"sort\":1,\"skillId\":150010001}]",
                "[{\"sort\":1,\"skillId\":150010001,\"level\":3}]",
                "[{\"sort\":1,\"skillId\":999999,\"level\":1}]",
                "[{\"sort\":1,\"skillId\":150010001,\"level\":1,\"unknown\":0}]",
                "[{\"sort\":1,\"sort\":2,\"skillId\":150010001,\"level\":1}]",
                "[{\"sort\":1,\"skillId\":150010001,\"level\":1}] []")) {
            jdbc.update("UPDATE game_spirit SET skills_json=? WHERE instance_id=?", text, item.instanceId());
            assertThrows(IllegalStateException.class, () -> current(role), text);
        }
        jdbc.update("UPDATE game_spirit SET skills_json=? WHERE instance_id=?", original, item.instanceId());
        assertEquals(List.of(item), current(role).items());
        assertEquals(1, roles.revision(role));
        assertEquals(1, notifications.size());
    }

    /** 数据库禁止写入未开放状态，读取也防御绕过约束后的非默认持久值。 */
    @Test
    void unopenedBehaviorsRemainAtTheirPersistedDefaults() {
        String role = role();
        var item = grant(role, 1, new LowestDraws()).getFirst();
        for (String assignment : List.of("hero_id='not-opened'", "place=1", "exp=1",
                "wash_ability_id=1", "wash_skills_json='[1]'")) {
            assertThrows(DataIntegrityViolationException.class,
                    () -> jdbc.update("UPDATE game_spirit SET " + assignment + " WHERE instance_id=?", item.instanceId()));
        }
        jdbc.execute("ALTER TABLE game_spirit DROP CONSTRAINT ck_spirit_instance_unopened");
        jdbc.update("UPDATE game_spirit SET place=1 WHERE instance_id=?", item.instanceId());
        assertThrows(IllegalStateException.class, () -> current(role));
        assertEquals(1, roles.revision(role));
        assertEquals(1, notifications.size());
    }

    /** 缺表或外层事务不能被解释成没有持有，也不在自动提交模式发放任何实例。 */
    @Test
    void missingSchemaAndMissingTransactionAreExplicitFailures() {
        String role = role();
        var random = new LowestDraws();
        assertThrows(IllegalTransactionStateException.class, () -> service.grant(role, ITEM_ID, 1, random));
        assertThrows(IllegalTransactionStateException.class, () -> service.current(role));
        assertEquals(0, random.calls.get());
        jdbc.execute("DROP TABLE game_spirit");
        assertThrows(DataAccessException.class, () -> current(role));
        assertTrue(notifications.isEmpty());
    }

    /** 发放先取得真实角色锁，等待别的奖励提交期间不应提前消费属性随机源。 */
    @Test
    void grantWaitsForTheRoleLockBeforeDrawingAnyAttributes() throws Exception {
        String role = role();
        var random = new LowestDraws();
        var entered = new CountDownLatch(1);
        var contender = new AtomicReference<Future<?>>();
        try (var executor = Executors.newSingleThreadExecutor()) {
            new TransactionTemplate(transactions).executeWithoutResult(status -> {
                roles.lock(role);
                contender.set(executor.submit(() -> {
                    entered.countDown();
                    grant(role, 1, random);
                }));
                assertTrue(assertDoesNotThrow(() -> entered.await(10, TimeUnit.SECONDS)));
                assertThrows(TimeoutException.class, () -> contender.get().get(200, TimeUnit.MILLISECONDS));
                assertEquals(0, random.calls.get());
                assertEquals(0, count(role));
            });
            contender.get().get(10, TimeUnit.SECONDS);
        }
        assertEquals(1, count(role));
        assertEquals(4, random.calls.get());
        assertEquals(1, roles.revision(role));
        assertEquals(List.of(new AssetSyncService.Changed(role)), notifications);
    }
}
