/**
 * 新主线挂机领取的独立事务专项：以真实迁移、领域服务和角色行锁验证累计、回执与完整回滚。
 * 每项使用独占H2和固定服务端时钟，不启动Spring服务、不连接日常玩家库，也不开放客户端按钮。
 * 历史领取结果与最新资产分别核对；测试随机源仅提供确定抽样并观察重放是否再次抽奖。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.campaign.CampaignRules;
import com.funsgamex.mxzg.campaign.IdleActivityControlRules;
import com.funsgamex.mxzg.campaign.IdleActivityMaintenanceService;
import com.funsgamex.mxzg.campaign.IdleActivityRules;
import com.funsgamex.mxzg.campaign.IdleActivityService;
import com.funsgamex.mxzg.campaign.IdleRewardInputService;
import com.funsgamex.mxzg.campaign.IdleRewardRules;
import com.funsgamex.mxzg.campaign.IdleRewardUtils;
import com.funsgamex.mxzg.campaign.IdleRules;
import com.funsgamex.mxzg.campaign.MainChapterIdleClaimService;
import com.funsgamex.mxzg.campaign.MainChapterIdleStateRepository;
import com.funsgamex.mxzg.campaign.MainChapterRules;
import com.funsgamex.mxzg.hero.HeroCapacityService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.inventory.TimedInventoryService;
import com.funsgamex.mxzg.inventory.TimedItemRules;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.privilege.PrivilegeGiftRules;
import com.funsgamex.mxzg.privilege.PrivilegeGiftService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.role.RoleExperienceService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import com.funsgamex.mxzg.spirit.SpiritRules;
import com.funsgamex.mxzg.world.WorldLevelService;
import java.io.InputStream;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;
import java.util.random.RandomGenerator;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MainChapterIdleClaimServiceTest {
    /** 固定在上海中午，活动和礼包边界均从这一可信服务器秒构造。 */
    private static final long NOW = Instant.parse("2026-11-14T04:00:00Z").getEpochSecond();
    /** 当前用例独占的真实数据库，所有领域和领取共用同一连接源。 */
    private JdbcTemplate jdbc;
    /** 与生产事务注解共用的管理器，明确串行化同角色的并发请求。 */
    private DataSourceTransactionManager transactions;
    /** 真实会话签发及锁内复验入口，不以测试令牌绕过身份检查。 */
    private SessionService sessions;
    /** 角色行锁、钱包和资产版本的真实入口。 */
    private RoleRepository roles;
    /** 当前生产角色经验配置，用于构造升级前后的准确边界。 */
    private RoleRules roleRules;
    /** 普通库存的真实读写入口，供回滚和后续资产变化核对。 */
    private InventoryService inventory;
    /** 精灵真实生成及读取入口，所有调用保留生产事务门槛。 */
    private SpiritInventoryService spirits;
    /** 共享可信发奖，不持有本测试请求幂等状态。 */
    private RewardGrantService rewards;
    /** 当前同源普通挂机配置，不使用手写奖励ID清单。 */
    private IdleRules idleRules;
    /** 真实最高通关关卡及酒馆上限配置。 */
    private MainChapterRules chapterRules;
    /** 权威礼包、世界、VIP和活动输入的真实装配入口。 */
    private IdleRewardInputService inputs;
    /** 当前独立库的累计状态入口，不保存测试内存计数副本。 */
    private MainChapterIdleStateRepository states;
    /** 测试数据准备使用的真实活动维护入口，不在领取中补造活动控制。 */
    private IdleActivityMaintenanceService maintenance;
    /** 真实资产同步，记录提交之后实际发布的通知。 */
    private AssetSyncService sync;
    /** 领域及成功回执使用的同一JSON编解码器。 */
    private ObjectMapper json;
    /** 每项测试独立的服务器时钟，只有测试主动推进或回拨。 */
    private TestClock clock;
    /** 确定随机源，跨并发线程准确累计实际抽样次数。 */
    private Draws random;
    /** 带生产事务代理的领取服务，默认以测试显式打开内部入口。 */
    private MainChapterIdleClaimService service;
    /** 当前用例提交之后的真实角色事件，回滚和重放不能追加。 */
    private List<AssetSyncService.Changed> notifications;

    /** 一次测试角色的权威身份，token只在进程内用于调用真实会话校验。 */
    private record Player(String role, String token, String server) {}

    /** 保存所有领取相关表的原值，失败时逐表核对，没有从通知反推持久事实。 */
    private record Stored(Map<String, Object> role, List<Map<String, Object>> idle,
                          List<Map<String, Object>> counters, List<Map<String, Object>> inventory,
                          List<Map<String, Object>> spirits, List<Map<String, Object>> receipts) {}

    /** 固定合法最低抽样点；普通概率、数量、精灵属性均保留实际调用次数。 */
    private static final class Draws implements RandomGenerator {
        /** 已实际消费的所有随机入口次数，拒绝和持久回执恢复期间不得增加。 */
        private final AtomicInteger calls = new AtomicInteger();

        /** 提供合法最低单上界值，活动、神职及精灵仍经过真实随机入口。 */
        @Override
        public int nextInt(int bound) {
            assertTrue(bound > 0);
            calls.incrementAndGet();
            return 0;
        }

        /** 固定数量仍消费一次半开区间抽样，不把确定配置优化成直接返回。 */
        @Override
        public int nextInt(int origin, int bound) {
            assertTrue(origin < bound);
            calls.incrementAndGet();
            return origin;
        }

        /** 普通权重按原double入口取最低点，不用整数抽样代替。 */
        @Override
        public double nextDouble() {
            calls.incrementAndGet();
            return 0;
        }

        /** 拒绝未经这些领域约定的默认长整型抽样。 */
        @Override
        public long nextLong() {
            throw new AssertionError("领取领域不得调用未约定的nextLong");
        }
    }

    /** 可显式推进的可信服务器时钟，不读取客户端时刻。 */
    private static final class TestClock extends Clock {
        /** 当前服务器Unix秒；测试设置后全部输入继续共用同一冻结值。 */
        private final AtomicLong seconds = new AtomicLong(NOW);

        /** 保持UTC展示，业务自然日仍由真实活动/期限规则选择上海时区。 */
        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        /** 当前用例只读取instant；改变展示时区不产生第二份可变时钟。 */
        @Override
        public Clock withZone(ZoneId zone) {
            return Clock.fixed(instant(), zone);
        }

        /** 返回测试当前设置的可信服务器时刻。 */
        @Override
        public Instant instant() {
            return Instant.ofEpochSecond(seconds.get());
        }
    }

    /** 真实迁移建立独占数据库，并装配同源规则、资产领域和生产事务代理。 */
    @BeforeEach
    void createIsolatedClaimDomain() {
        String url = "jdbc:h2:mem:main_idle_claim_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000";
        Flyway.configure().dataSource(url, "sa", "").load().migrate();
        var source = new DriverManagerDataSource(url, "sa", "");
        jdbc = new JdbcTemplate(source);
        transactions = new DataSourceTransactionManager(source);
        json = new ObjectMapper();
        notifications = new CopyOnWriteArrayList<>();
        sync = new AssetSyncService(jdbc, event -> notifications.add((AssetSyncService.Changed) event));
        roleRules = new RoleRules(json);
        // 直接准备独立角色，不调用创建角色；容量依赖不参与领取奖励路径。
        roles = new RoleRepository(jdbc, sync, roleRules, mock(HeroCapacityService.class));
        sessions = new SessionService(jdbc);
        inventory = new InventoryService(jdbc, sync, json, roles);
        var experience = transactional(new RoleExperienceService(roleRules, roles, jdbc, sync), RoleExperienceService.class);
        var timedRules = new TimedItemRules(json);
        var timed = new TimedInventoryService(jdbc, sync, timedRules);
        spirits = transactional(new SpiritInventoryService(jdbc, roles, new SpiritRules(json), sync, json),
                SpiritInventoryService.class);
        rewards = transactional(new RewardGrantService(roles, experience, inventory, timedRules, timed,
                spirits, sync, json), RewardGrantService.class);
        idleRules = new IdleRules(json);
        chapterRules = new MainChapterRules(json);
        var activityRules = new IdleActivityRules(json);
        var activities = new IdleActivityService(jdbc);
        maintenance = transactional(new IdleActivityMaintenanceService(jdbc, activities,
                new IdleActivityControlRules(json), activityRules, json), IdleActivityMaintenanceService.class);
        var giftRules = new PrivilegeGiftRules(json);
        var gifts = transactional(new PrivilegeGiftService(jdbc), PrivilegeGiftService.class);
        inputs = transactional(new IdleRewardInputService(jdbc, new IdleRewardRules(json, idleRules),
                new WorldLevelService(jdbc, transactions, json), gifts, giftRules, activities, activityRules),
                IdleRewardInputService.class);
        states = transactional(new MainChapterIdleStateRepository(jdbc, idleRules), MainChapterIdleStateRepository.class);
        clock = new TestClock();
        random = new Draws();
        service = claimService(true);
    }

    /** 关闭本项独占库，不留下其他用例可见的角色、会话或回执。 */
    @AfterEach
    void closeDatabase() {
        if (jdbc != null) {
            jdbc.execute("SHUTDOWN");
        }
    }

    /** 为真实方法安装与生产注解一致的Spring事务代理，不替换事务内业务实现。 */
    private <T> T transactional(T target, Class<T> type) {
        var interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(transactions);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        var factory = new ProxyFactory(target);
        factory.addAdvice(interceptor);
        return type.cast(factory.getProxy());
    }

    /** 重建无角色缓存的领取服务，可模拟进程重建及入口关闭后恢复已提交回执。 */
    private MainChapterIdleClaimService claimService(boolean enabled) {
        return transactional(new MainChapterIdleClaimService(sessions, roles, jdbc, idleRules, chapterRules,
                inputs, rewards, states, roleRules, sync, json, clock, random, enabled),
                MainChapterIdleClaimService.class);
    }

    /** 创建独立区服、真实控制、角色与旧计时行，既有起点由迁移默认累计字段接续。 */
    private Player player(int level, int vip, long elapsed, int cleared) {
        String server = "claim-" + UUID.randomUUID().toString().substring(0, 8);
        jdbc.update("INSERT INTO game_server(id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)",
                server, "claim", "独立领取区", "独立领取服");
        maintenance.configure(server, NOW - 86_400, Optional.empty(), NOW);
        String role = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,role_experience,gold,diamonds,"
                        + "login_account,server_id,goddess_vip) VALUES (?,?,?,?,0,100,20,?,?,?)",
                role, "claim_" + role, "Claim", level, "claim_" + role, server, vip);
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,?)", role, cleared);
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,?)", role, NOW - elapsed);
        String token = "Bearer " + sessions.issue(role).accessToken();
        return new Player(role, token, server);
    }

    /** 生成本次独立业务意图的规范UUID，重试时由用例保留原值。 */
    private String requestId() {
        return UUID.randomUUID().toString();
    }

    /** 模拟生产入口取得真实角色行锁，再读取或操作同事务领域状态。 */
    private <T> T locked(Player player, Supplier<T> operation) {
        return new TransactionTemplate(transactions).execute(status -> {
            roles.lock(player.role());
            return operation.get();
        });
    }

    /** 取得真实持久累计状态，不从成功回执反推最新版本。 */
    private MainChapterIdleStateRepository.Accumulation accumulation(Player player) {
        return locked(player, () -> states.require(player.role()));
    }

    /** 截取所有当前领取关联记录，后续拒绝或回滚必须保持完全相同。 */
    private Stored stored(Player player) {
        return new Stored(jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", player.role()),
                jdbc.queryForList("SELECT * FROM game_main_chapter_idle WHERE role_id=?", player.role()),
                jdbc.queryForList("SELECT * FROM game_main_chapter_idle_counter WHERE role_id=? ORDER BY group_type", player.role()),
                jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=? ORDER BY item_id", player.role()),
                jdbc.queryForList("SELECT * FROM game_spirit WHERE role_id=? ORDER BY instance_id", player.role()),
                jdbc.queryForList("SELECT * FROM game_main_chapter_idle_receipt WHERE role_id=? ORDER BY request_id", player.role()));
    }

    /** 取已合并理论量；缺项明确失败，避免误把配置漏奖当作零产出。 */
    private long theory(MainChapterIdleClaimService.Receipt receipt, int itemId) {
        return receipt.theoreticalRewards().stream().filter(reward -> reward.itemId() == itemId)
                .mapToLong(CampaignRules.Reward::quantity).findFirst().orElseThrow();
    }

    /** 每次正消费只推进一次操作版本及资产revision，通知必须在提交之后发布。 */
    private void assertOneCommittedConsumption(Player player) {
        assertEquals(2, accumulation(player).operationVersion());
        assertEquals(1, roles.revision(player.role()));
        assertEquals(List.of(new AssetSyncService.Changed(player.role())), notifications);
    }

    /** 119秒基础只结一轮，完整119秒进入随机累计，成功起点直接写本次服务器秒。 */
    @Test
    void oneHundredNineteenSecondsDiscardsBaseRemainderButPersistsWholeDropInterval() {
        var player = player(20, 0, 119, 1);
        var receipt = service.claim(player.token(), requestId(), 1);
        assertEquals(119, receipt.seconds());
        assertEquals(NOW - 119, receipt.previousStartedAtSeconds());
        assertEquals(NOW, receipt.committedAtSeconds());
        assertEquals(200, theory(receipt, 900001));
        assertEquals(300, roles.findById(player.role()).orElseThrow().gold());
        var after = accumulation(player);
        assertEquals(119, after.dropSeconds());
        assertEquals(NOW, after.startedAt());
        assertEquals(new IdleRules.Counter(22, 0), after.counters().get(6));
        assertOneCommittedConsumption(player);
    }

    /** 未满最低60秒不抽样、不留成功回执，也不消费原起点和任何持久版本。 */
    @Test
    void zeroAndFiftyNineSecondsRejectWithoutDrawingOrChangingAnyRecord() {
        for (int elapsed : List.of(0, 59)) {
            var player = player(20, 0, elapsed, 1);
            var before = stored(player);
            int calls = random.calls.get();
            assertThrows(MainChapterIdleClaimService.Rejected.class,
                    () -> service.claim(player.token(), requestId(), 1));
            assertEquals(before, stored(player));
            assertEquals(calls, random.calls.get());
        }
        assertTrue(notifications.isEmpty());
    }

    /** 基础尾数不结转；60/64/65各一轮基础，但分别保存完整随机累计秒数。 */
    @Test
    void baseRoundingAndDropSecondsRemainSeparateAtTheFirstMinute() {
        for (int elapsed : List.of(60, 64, 65)) {
            var player = player(20, 0, elapsed, 1);
            var receipt = service.claim(player.token(), requestId(), 1);
            assertEquals(200, theory(receipt, 900001));
            assertEquals(elapsed, accumulation(player).dropSeconds());
            assertEquals(NOW, accumulation(player).startedAt());
        }
        assertEquals(3, notifications.size());
    }

    /** VIP上限外的时间直接丢弃，起点仍写本次时刻；负时钟不能倒扣或制造新收益。 */
    @Test
    void vipCapDiscardsExcessTimeAndBackwardClockLeavesTheOriginalState() {
        var capped = player(20, 0, 21_659, 1);
        var receipt = service.claim(capped.token(), requestId(), 1);
        assertEquals(21_600, receipt.seconds());
        assertEquals(21_600, accumulation(capped).dropSeconds());
        assertEquals(NOW, accumulation(capped).startedAt());
        var future = player(20, 0, -1, 1);
        var before = stored(future);
        int calls = random.calls.get();
        assertThrows(MainChapterIdleClaimService.Rejected.class,
                () -> service.claim(future.token(), requestId(), 1));
        assertEquals(before, stored(future));
        assertEquals(calls, random.calls.get());
    }

    /** 满12小时先计算旧窗再清空计数，不将旧保底误留到下一笔。 */
    @Test
    void exactResetPersistsZeroSecondsAndClearedCountersInTheSameCommit() {
        var player = player(20, 0, 60, 1);
        jdbc.update("UPDATE game_main_chapter_idle SET drop_seconds=43140 WHERE role_id=?", player.role());
        jdbc.update("INSERT INTO game_main_chapter_idle_counter(role_id,group_type,quantity,misses) VALUES (?,1,4,6)", player.role());
        service.claim(player.token(), requestId(), 1);
        assertEquals(0, accumulation(player).dropSeconds());
        assertTrue(accumulation(player).counters().isEmpty());
        assertOneCommittedConsumption(player);
    }

    /** VIP13可跨多窗，最后仅保留最后半窗累计，不扩大服务器配置给出的18小时范围。 */
    @Test
    void highestVipUsesItsAuthoritativeLimitAcrossResetWindows() {
        var player = player(20, 13, 64_899, 1);
        var receipt = service.claim(player.token(), requestId(), 1);
        assertEquals(64_800, receipt.seconds());
        assertEquals(64_800, receipt.maxSeconds());
        assertEquals(21_600, accumulation(player).dropSeconds());
        assertEquals(NOW, accumulation(player).startedAt());
        assertOneCommittedConsumption(player);
    }

    /** 已提交请求重建服务后先读回执；关闭入口、删除活动前置和过时expected都不触发重算。 */
    @Test
    void rebuiltClosedServiceRestoresReceiptBeforeCheckingCurrentPrerequisites() {
        var player = player(20, 0, 119, 1);
        String id = requestId();
        var receipt = service.claim(player.token(), id, 1);
        int calls = random.calls.get();
        jdbc.update("DELETE FROM game_idle_activity_control WHERE server_id=?", player.server());
        clock.seconds.addAndGet(86_400);
        var rebuilt = claimService(false);
        var before = stored(player);
        assertEquals(receipt, rebuilt.claim(player.token(), id, 1));
        var status = rebuilt.status(player.token(), id);
        assertEquals("COMMITTED", status.status());
        assertEquals(receipt, status.receipt());
        assertEquals(before, stored(player));
        assertEquals(calls, random.calls.get());
        assertEquals(1, notifications.size());
    }

    /** 同键不同expected是请求内容冲突，先于当前控制缺失或入口关闭拒绝。 */
    @Test
    void committedRequestIdRejectsDifferentContentWithoutConsultingNewInputs() {
        var player = player(20, 0, 60, 1);
        String id = requestId();
        service.claim(player.token(), id, 1);
        jdbc.update("DELETE FROM game_idle_activity_control WHERE server_id=?", player.server());
        var before = stored(player);
        int calls = random.calls.get();
        var rejected = assertThrows(MainChapterIdleClaimService.Rejected.class,
                () -> claimService(false).claim(player.token(), id, 2));
        assertFalse(rejected.retryable());
        assertEquals(before, stored(player));
        assertEquals(calls, random.calls.get());
    }

    /** 两个不同意图竞争同一旧版本，只允许一笔实际消费，失败方不能自动改版本再领。 */
    @Test
    void concurrentDifferentRequestIdsConsumeOneExpectedVersionOnly() throws Exception {
        var player = player(20, 0, 119, 1);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Future<Object> first = executor.submit(() -> concurrentClaim(player, requestId(), start));
            Future<Object> second = executor.submit(() -> concurrentClaim(player, requestId(), start));
            start.countDown();
            var results = List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
            assertEquals(1, results.stream().filter(MainChapterIdleClaimService.Receipt.class::isInstance).count());
            assertEquals(1, results.stream().filter(MainChapterIdleClaimService.Rejected.class::isInstance).count());
        }
        assertOneCommittedConsumption(player);
        assertEquals(1, stored(player).receipts().size());
    }

    /** 同键并发在角色锁后恢复同一持久回执，真实随机与精灵生成只执行一轮领取。 */
    @Test
    void concurrentCopiesOfOneRequestRestoreTheSameReceipt() throws Exception {
        var player = player(20, 0, 119, 1);
        String id = requestId();
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> concurrentClaim(player, id, start));
            var second = executor.submit(() -> concurrentClaim(player, id, start));
            start.countDown();
            var receipt = first.get(20, TimeUnit.SECONDS);
            assertInstanceOf(MainChapterIdleClaimService.Receipt.class, receipt);
            assertEquals(receipt, second.get(20, TimeUnit.SECONDS));
        }
        assertOneCommittedConsumption(player);
        assertEquals(1, stored(player).receipts().size());
        assertEquals(2, stored(player).spirits().size());
    }

    /** 在同一同步起点发起调用，并把明确业务拒绝保留为结果以统计竞争结局。 */
    private Object concurrentClaim(Player player, String id, CountDownLatch start) throws InterruptedException {
        assertTrue(start.await(10, TimeUnit.SECONDS));
        try {
            return service.claim(player.token(), id, 1);
        } catch (MainChapterIdleClaimService.Rejected rejected) {
            return rejected;
        }
    }

    /** status只检查持久回执，未找到时不创建累计或读取缺失的活动来源。 */
    @Test
    void missingStatusDoesNotCreateStateOrRequireCompleteRewardInputs() {
        var player = player(20, 0, 60, 1);
        jdbc.update("DELETE FROM game_main_chapter_idle WHERE role_id=?", player.role());
        jdbc.update("DELETE FROM game_idle_activity_control WHERE server_id=?", player.server());
        var before = stored(player);
        var status = claimService(false).status(player.token(), requestId());
        assertEquals("NOT_FOUND", status.status());
        assertNull(status.receipt());
        assertEquals(before, stored(player));
        assertEquals(0, random.calls.get());
        assertTrue(notifications.isEmpty());
    }

    /** 未通关、缺累计或入口关闭均不能借领取请求补免费时钟或推进资产。 */
    @Test
    void newRequestsRejectClosedEntryMissingClockAndUnclearedProgress() {
        var closed = player(20, 0, 60, 1);
        var beforeClosed = stored(closed);
        assertThrows(MainChapterIdleClaimService.Rejected.class,
                () -> claimService(false).claim(closed.token(), requestId(), 1));
        assertEquals(beforeClosed, stored(closed));
        var missing = player(20, 0, 60, 1);
        jdbc.update("DELETE FROM game_main_chapter_idle WHERE role_id=?", missing.role());
        var beforeMissing = stored(missing);
        assertThrows(RuntimeException.class, () -> service.claim(missing.token(), requestId(), 1));
        assertEquals(beforeMissing, stored(missing));
        var uncleared = player(20, 0, 60, 0);
        var beforeUncleared = stored(uncleared);
        assertThrows(MainChapterIdleClaimService.Rejected.class,
                () -> service.claim(uncleared.token(), requestId(), 1));
        assertEquals(beforeUncleared, stored(uncleared));
        assertEquals(0, random.calls.get());
        assertTrue(notifications.isEmpty());
    }

    /** 真实活动控制缺一项时保留输入失败原因，领取不能用无活动兜底或消费任何状态。 */
    @Test
    void missingActivityAuthorityRejectsWithItsCauseBeforeDrawingOrWriting() {
        var player = player(69, 13, 119, 1);
        jdbc.update("DELETE FROM game_idle_activity_control WHERE server_id=? AND activity_id=16", player.server());
        var before = stored(player);
        var rejected = assertThrows(MainChapterIdleClaimService.Rejected.class,
                () -> service.claim(player.token(), requestId(), 1));
        assertEquals("IDLE_INPUT_UNAVAILABLE", rejected.code());
        assertInstanceOf(IllegalStateException.class, rejected.getCause());
        assertTrue(rejected.retryable());
        assertEquals(before, stored(player));
        assertEquals(0, random.calls.get());
        assertTrue(notifications.isEmpty());
    }

    /** 后段英雄经验余额溢出时回滚此前钱包、经验、实例、累计和revision，原请求可重新执行。 */
    @Test
    void laterInventoryFailureRollsBackTheEntireClaimAndCanRetryTheOriginalRequest() {
        var player = player(20, 0, 119, 1);
        String id = requestId();
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,900101,?,?)",
                player.role(), Long.MAX_VALUE, "stack:" + player.role() + ":900101");
        var before = stored(player);
        assertThrows(RuntimeException.class, () -> service.claim(player.token(), id, 1));
        assertEquals(before, stored(player));
        assertTrue(notifications.isEmpty());
        jdbc.update("UPDATE game_inventory SET quantity=0 WHERE role_id=? AND item_id=900101", player.role());
        clock.seconds.incrementAndGet();
        var receipt = service.claim(player.token(), id, 1);
        assertEquals(120, receipt.seconds());
        assertOneCommittedConsumption(player);
    }

    /** 累计条件更新失败也回滚真实发奖，不存在资产已入账而操作版本未消费的半笔领取。 */
    @Test
    void accumulationPersistenceFailureRollsBackAllEarlierDomainWrites() {
        var player = player(20, 0, 119, 1);
        jdbc.execute("ALTER TABLE game_main_chapter_idle ADD CONSTRAINT claim_test_keep_version CHECK(operation_version=1)");
        var before = stored(player);
        assertThrows(RuntimeException.class, () -> service.claim(player.token(), requestId(), 1));
        assertEquals(before, stored(player));
        assertTrue(notifications.isEmpty());
    }

    /** 成功回执写入失败是整笔事务失败，不能保留资产、累计或任何提交通知。 */
    @Test
    void receiptPersistenceFailureRollsBackAssetsCountersAndTheConsumedClock() {
        var player = player(20, 0, 119, 1);
        jdbc.execute("ALTER TABLE game_main_chapter_idle_receipt ADD CONSTRAINT claim_test_receipt_reject CHECK(1=0)");
        var before = stored(player);
        assertThrows(RuntimeException.class, () -> service.claim(player.token(), requestId(), 1));
        assertEquals(before, stored(player));
        assertTrue(notifications.isEmpty());
    }

    /** 领取后其他合法资产变化不改写旧实际结果，重放不把历史余额或实例集合当作当前资产。 */
    @Test
    void historicalActualResultStaysFrozenWhileLatestWalletAndSpiritsAdvance() {
        var player = player(20, 0, 119, 1);
        String id = requestId();
        var receipt = service.claim(player.token(), id, 1);
        var historicalWallet = receipt.actual().wallet();
        var historicalSpirits = receipt.actual().spirits();
        locked(player, () -> rewards.grant(player.role(),
                List.of(new RewardGrantService.Reward(900001, 7), new RewardGrantService.Reward(2_000_002, 1)),
                new RewardGrantService.Context(NOW, chapterRules.tavernLimit(1)), new Draws()));
        int calls = random.calls.get();
        var beforeReplay = stored(player);
        assertEquals(receipt, service.claim(player.token(), id, 1));
        assertEquals(beforeReplay, stored(player));
        assertEquals(historicalWallet, receipt.actual().wallet());
        assertEquals(historicalSpirits, receipt.actual().spirits());
        assertEquals(historicalWallet.goldAfter() + 7, roles.findById(player.role()).orElseThrow().gold());
        assertEquals(historicalSpirits.items().size() + 1,
                locked(player, () -> spirits.current(player.role())).items().size());
        assertEquals(calls, random.calls.get());
        assertEquals(2, roles.revision(player.role()));
        assertEquals(2, notifications.size());
    }

    /** 本次升级与礼包到期秒均使用发奖前统一输入，不在经验入账后重新计算增益。 */
    @Test
    void rewardCalculationFreezesPreGrantLevelAndInclusiveGiftExpiration() {
        var player = player(69, 13, 119, 1);
        jdbc.update("UPDATE game_role SET role_experience=?,clergy_level=6 WHERE id=?",
                roleRules.threshold(69) - 1, player.role());
        jdbc.update("INSERT INTO game_privilege_gift(id,role_id,gift_id,purchased_at_seconds,ends_at_seconds,purchase_count,active) "
                        + "VALUES (?,?,100610,?,?,1,0)", requestId(), player.role(), NOW - 1000, NOW);
        var input = locked(player, () -> inputs.current(player.role(), NOW));
        var expected = IdleRewardUtils.calculate(idleRules, input, 1, 119, 0, Map.of(), new Draws());
        var receipt = service.claim(player.token(), requestId(), 1);
        assertEquals(69, input.roleLevel());
        assertEquals(NOW, input.serverTimeSeconds());
        assertEquals(expected.outcome().total(), receipt.theoreticalRewards());
        assertEquals(69, receipt.actual().experience().getFirst().beforeLevel());
        assertTrue(receipt.actual().experience().getFirst().level() > 69);
        var audit = json.readValue(jdbc.queryForObject(
                "SELECT payload_json FROM game_main_chapter_idle_receipt WHERE role_id=?", String.class, player.role()),
                MainChapterIdleClaimService.AuditV1.class);
        assertEquals(input, audit.calculation().input());
        assertEquals(receipt, audit.receipt());
        assertEquals(NOW, accumulation(player).startedAt());
        assertOneCommittedConsumption(player);
    }

    /** 损坏成功载荷或摘要后停止恢复，不用当前权益重新计算一份貌似相同的奖励。 */
    @Test
    void damagedHistoricalReceiptRejectsBothRecoveryPathsWithoutRegranting() {
        var player = player(20, 0, 119, 1);
        String id = requestId();
        service.claim(player.token(), id, 1);
        jdbc.update("UPDATE game_main_chapter_idle_receipt SET payload_hash=? WHERE role_id=? AND request_id=?",
                "0".repeat(64), player.role(), id);
        var before = stored(player);
        int calls = random.calls.get();
        assertThrows(IllegalStateException.class, () -> service.claim(player.token(), id, 1));
        assertThrows(IllegalStateException.class, () -> service.status(player.token(), id));
        assertEquals(before, stored(player));
        assertEquals(calls, random.calls.get());
        assertEquals(1, notifications.size());
    }

    /** 全部普通候选按本关配置导出，未抽中的不支持精灵也必须在任何随机消费前整笔拒绝。 */
    @Test
    void unsupportedPossibleRewardRejectsBeforeActivityOrdinaryOrClergyDrawing() {
        var player = player(69, 13, 119, 1);
        jdbc.update("UPDATE game_role SET clergy_level=6 WHERE id=?", player.role());
        var source = idleRules.data();
        var drops = new ArrayList<>(source.drops());
        int spiritTable = source.drops().stream().filter(drop -> drop.itemId() == 2_000_002)
                .mapToInt(IdleRules.Drop::table).findFirst().orElseThrow();
        // 仅在隔离解析结果增加合法但尚未恢复的精灵配置，不修改生产文件或手写15项清单。
        drops.add(new IdleRules.Drop(spiritTable, 2_000_001, 1, 1, 1));
        var variant = new IdleRules.Data(source.version(), source.frequency(), source.initialSeconds(),
                source.maxSeconds(), source.resetSeconds(), source.stages(), source.triggers(), drops);
        var candidateRules = parsedRules(variant);
        var candidateService = transactional(new MainChapterIdleClaimService(sessions, roles, jdbc, candidateRules,
                chapterRules, inputs, rewards, states, roleRules, sync, json, clock, random, true),
                MainChapterIdleClaimService.class);
        var before = stored(player);
        assertThrows(IllegalArgumentException.class,
                () -> candidateService.claim(player.token(), requestId(), 1));
        assertEquals(before, stored(player));
        assertEquals(0, random.calls.get());
        assertTrue(notifications.isEmpty());
    }

    /** 当前关触发器缺少全部正权重行时，即使真实活动适用也在活动抽样前拒绝整笔领取。 */
    @Test
    void missingPositiveWeightTableRejectsBeforeAnApplicableActivityCanDraw() {
        var player = player(69, 13, 119, 1);
        var input = locked(player, () -> inputs.current(player.role(), NOW));
        assertEquals(IdleRewardInputService.ActivityStatus.APPLICABLE, input.activities().entries().getFirst().status());
        var source = idleRules.data();
        int group = idleRules.stage(1).group();
        int table = source.triggers().stream().filter(trigger -> trigger.group() == group)
                .mapToInt(IdleRules.Trigger::table).findFirst().orElseThrow();
        var drops = source.drops().stream().filter(drop -> drop.table() != table).toList();
        var variant = new IdleRules.Data(source.version(), source.frequency(), source.initialSeconds(),
                source.maxSeconds(), source.resetSeconds(), source.stages(), source.triggers(), drops);
        var candidateService = transactional(new MainChapterIdleClaimService(sessions, roles, jdbc, parsedRules(variant),
                chapterRules, inputs, rewards, states, roleRules, sync, json, clock, random, true),
                MainChapterIdleClaimService.class);
        var before = stored(player);
        assertThrows(IllegalStateException.class,
                () -> candidateService.claim(player.token(), requestId(), 1));
        assertEquals(before, stored(player));
        assertEquals(0, random.calls.get());
        assertTrue(notifications.isEmpty());
    }

    /** 正权重总和溢出在完整候选预检中失败，不能先消耗真实适用活动的随机源。 */
    @Test
    void overflowingPositiveWeightSumRejectsBeforeAnApplicableActivityCanDraw() {
        var player = player(69, 13, 119, 1);
        var input = locked(player, () -> inputs.current(player.role(), NOW));
        assertEquals(IdleRewardInputService.ActivityStatus.APPLICABLE, input.activities().entries().getFirst().status());
        var source = idleRules.data();
        int group = idleRules.stage(1).group();
        int table = source.triggers().stream().filter(trigger -> trigger.group() == group)
                .mapToInt(IdleRules.Trigger::table).findFirst().orElseThrow();
        var original = source.drops().stream().filter(drop -> drop.table() == table && drop.weight() > 0)
                .findFirst().orElseThrow();
        var drops = new ArrayList<>(source.drops());
        drops.add(new IdleRules.Drop(table, original.itemId(), Integer.MAX_VALUE, original.minimum(), original.maximum()));
        var variant = new IdleRules.Data(source.version(), source.frequency(), source.initialSeconds(),
                source.maxSeconds(), source.resetSeconds(), source.stages(), source.triggers(), drops);
        var candidateService = transactional(new MainChapterIdleClaimService(sessions, roles, jdbc, parsedRules(variant),
                chapterRules, inputs, rewards, states, roleRules, sync, json, clock, random, true),
                MainChapterIdleClaimService.class);
        var before = stored(player);
        assertThrows(ArithmeticException.class,
                () -> candidateService.claim(player.token(), requestId(), 1));
        assertEquals(before, stored(player));
        assertEquals(0, random.calls.get());
        assertTrue(notifications.isEmpty());
    }

    /** 仅通过原解析依赖注入隔离配置，保留生产公式、时间语义和所有领域实现。 */
    private IdleRules parsedRules(IdleRules.Data data) {
        var mapper = mock(ObjectMapper.class);
        when(mapper.readValue(any(InputStream.class), eq(IdleRules.Data.class))).thenReturn(data);
        return new IdleRules(mapper);
    }

    /** 满级忽略全部理论经验时仍消费起点与操作版本，并推送一次新的统一状态revision。 */
    @Test
    void allRewardsIgnoredStillConsumeTheClockAndPublishTheNewOperationVersion() {
        int maximumLevel;
        try (var input = getClass().getResourceAsStream("/gameplay/mainlevel.json")) {
            assertNotNull(input);
            maximumLevel = json.readTree(input).path("rows").size();
        } catch (java.io.IOException failure) {
            throw new AssertionError("读取真实满级边界失败", failure);
        }
        var player = player(maximumLevel, 0, 60, 1);
        jdbc.update("UPDATE game_idle_activity_control SET publication_state=0 WHERE server_id=?", player.server());
        var source = idleRules.data();
        var variant = new IdleRules.Data(source.version(), source.frequency(), source.initialSeconds(),
                source.maxSeconds(), source.resetSeconds(),
                List.of(new IdleRules.Stage(1, source.stages().getFirst().group(),
                        List.of(new CampaignRules.Reward(900003, 10)))), List.of(), List.of());
        var candidateService = transactional(new MainChapterIdleClaimService(sessions, roles, jdbc, parsedRules(variant),
                chapterRules, inputs, rewards, states, roleRules, sync, json, clock, random, true),
                MainChapterIdleClaimService.class);
        var beforeRole = roles.findById(player.role()).orElseThrow();
        var receipt = candidateService.claim(player.token(), requestId(), 1);
        assertTrue(receipt.actual().items().stream().allMatch(item -> item.credited() == 0));
        assertEquals(beforeRole, roles.findById(player.role()).orElseThrow());
        assertEquals(60, accumulation(player).dropSeconds());
        assertEquals(NOW, accumulation(player).startedAt());
        assertOneCommittedConsumption(player);
    }

    /** 等待角色锁期间被撤销的会话须在取得锁后再拒绝，不能依赖排队前的旧鉴权结果。 */
    @Test
    void sessionRevokedWhileWaitingForTheRoleLockCannotCommitAClaim() throws Exception {
        var player = player(20, 0, 119, 1);
        var before = stored(player);
        var entered = new CountDownLatch(1);
        try (var executor = Executors.newSingleThreadExecutor()) {
            var pending = new java.util.concurrent.atomic.AtomicReference<Future<Object>>();
            new TransactionTemplate(transactions).executeWithoutResult(status -> {
                roles.lock(player.role());
                pending.set(executor.submit(() -> {
                    entered.countDown();
                    try {
                        return service.claim(player.token(), requestId(), 1);
                    } catch (RuntimeException failure) {
                        return failure;
                    }
                }));
                assertTrue(assertDoesNotThrow(() -> entered.await(10, TimeUnit.SECONDS)));
                assertThrows(TimeoutException.class, () -> pending.get().get(200, TimeUnit.MILLISECONDS));
                jdbc.update("DELETE FROM game_session WHERE role_id=?", player.role());
            });
            assertInstanceOf(org.springframework.web.server.ResponseStatusException.class,
                    pending.get().get(20, TimeUnit.SECONDS));
        }
        assertEquals(before, stored(player));
        assertEquals(0, random.calls.get());
        assertTrue(notifications.isEmpty());
    }
}
