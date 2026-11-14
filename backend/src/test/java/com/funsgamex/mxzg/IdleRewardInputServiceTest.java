/**
 * 挂机权威输入回归：独立H2库持有真实角色锁后装配VIP、世界、神职、礼包与活动控制。
 * 覆盖分区、事务门槛、缺失拒绝、只读不改资产，以及VIP时长在主线快照中的实际接线。
 * 不连接日常玩家库，不调用新挂机领取或启用其他权益模块。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.IdleRewardInputService;
import com.funsgamex.mxzg.campaign.IdleBonusUtils;
import com.funsgamex.mxzg.campaign.CampaignRules;
import com.funsgamex.mxzg.campaign.IdleRewardRules;
import com.funsgamex.mxzg.campaign.IdleRules;
import com.funsgamex.mxzg.campaign.IdleActivityRules;
import com.funsgamex.mxzg.campaign.IdleActivityService;
import com.funsgamex.mxzg.campaign.IdleRewardUtils;
import com.funsgamex.mxzg.campaign.IdleActivityMaintenanceService;
import com.funsgamex.mxzg.campaign.IdleActivityPublicationUtils;
import com.funsgamex.mxzg.campaign.MainChapterIdleService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.world.WorldLevelService;
import com.funsgamex.mxzg.privilege.PrivilegeGiftService;
import com.funsgamex.mxzg.privilege.PrivilegeGiftRules;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:idle_reward_inputs;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password="})
@ActiveProfiles("local")
class IdleRewardInputServiceTest {
    /** 真实输入装配服务，Spring代理强制事务门槛。 */
    @Autowired private IdleRewardInputService inputs;
    /** 已提交等级的独立区服快照。 */
    @Autowired private WorldLevelService worlds;
    /** 当前独立库的持有记录来源，不提供购买或权益写接口。 */
    @Autowired private PrivilegeGiftService gifts;
    /** 原表礼包期限/加成，输入组合版本包含该来源。 */
    @Autowired private PrivilegeGiftRules giftRules;
    /** 区服开服元数据及三类活动的原始权威状态，不在只读输入中推进轮次。 */
    @Autowired private IdleActivityService activities;
    /** 与输入组合版本对应的服务端独立活动配置。 */
    @Autowired private IdleActivityRules activityRules;
    /** 新恢复的区服控制写入口，用于证明正常维护结果可以接入既有只读及纯计算链。 */
    @Autowired private IdleActivityMaintenanceService maintenance;
    /** 旧规则加载出的真实VIP时长和增益区间。 */
    @Autowired private IdleRewardRules rules;
    /** 基础随机与分窗计算，验证VIP时间可以由服务端上限传入。 */
    @Autowired private IdleRules randomRules;
    /** 现用主线只读快照入口。 */
    @Autowired private MainChapterIdleService idle;
    /** 模拟挑战显式初始化累计，避免只读输入测试依赖快照创建时钟。 */
    @Autowired private com.funsgamex.mxzg.campaign.MainChapterIdleStateRepository idleStates;
    /** 角色持久化与行锁，不建立第二份角色模型。 */
    @Autowired private RoleRepository roles;
    /** 仅用于本测试独立库的数据准备和只读前后核对。 */
    @Autowired private JdbcTemplate jdbc;
    /** 与业务服务相同的事务管理，用于模拟持锁读取。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 为当前H2夹具明确准备区服及三项未发布活动；不把生产空表解释成无活动。 */
    private String role(String serverId, int level, int vip) {
        if (jdbc.queryForObject("SELECT COUNT(*) FROM game_server WHERE id=?", Integer.class, serverId) == 0) {
            jdbc.update("INSERT INTO game_server (id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)",
                    serverId, "input", "输入测试区", "独立测试服");
            for (int activityId : List.of(16, 34, 44)) {
                jdbc.update("INSERT INTO game_idle_activity_control "
                                + "(server_id,activity_id,publication_state,revision) VALUES (?,?,0,1)",
                        serverId, activityId);
            }
        }
        var profile = roles.create("input_" + UUID.randomUUID().toString().substring(0, 8), serverId);
        jdbc.update("UPDATE game_role SET role_level=?,goddess_vip=? WHERE id=?", level, vip, profile.id());
        return profile.id();
    }

    /** 生成当前用例独享的区服，避免不同测试的世界缓存/样本互相影响。 */
    private String server() {
        return "input-" + UUID.randomUUID().toString().substring(0, 8);
    }

    /** 模拟真实调用方先锁当前角色，再执行只读输入装配。 */
    private <T> T locked(String roleId, Supplier<T> read) {
        return new TransactionTemplate(transactions).execute(status -> {
            roles.lock(roleId);
            return read.get();
        });
    }

    /** 权威VIP0明确无加成，未达等级门槛时无需世界模块，不能伪造默认世界等级。 */
    @Test
    void levelGateSkipsWorldDependency() {
        String roleId = role(server(), 69, 0);
        var unavailable = mock(WorldLevelService.class);
        var reader = new IdleRewardInputService(jdbc, rules, unavailable, gifts, giftRules, activities, activityRules);
        var result = locked(roleId, () -> reader.current(roleId, 2000));
        assertEquals(0, result.vipLevel());
        assertEquals(21600, result.maxSeconds());
        assertTrue(result.world().isEmpty());
        assertTrue(result.baseBonuses().isEmpty());
        verifyNoInteractions(unavailable);
    }

    /** 达到门槛后读取本区已提交快照，与同次VIP拼接；其他区高等级不参与平均。 */
    @Test
    void readsOneWorldSnapshotAndDoesNotWriteAssets() {
        String selected = server();
        String roleId = role(selected, 70, 13);
        role(selected, 90, 0);
        role(server(), 200, 0);
        var before = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        var result = locked(roleId, () -> inputs.current(roleId, 2000));
        assertEquals(selected, result.serverId());
        assertEquals(70, result.roleLevel());
        assertEquals(13, result.vipLevel());
        assertEquals(0, result.clergyLevel());
        assertTrue(result.clergyBonuses().isEmpty());
        assertEquals(64800, result.maxSeconds());
        var world = result.world().orElseThrow();
        assertEquals(80, world.level());
        assertEquals(2, world.sampledRoles());
        assertSame(world, worlds.current(selected));
        assertEquals(4, result.baseBonuses().size());
        assertEquals(5000, result.baseBonuses().getLast().basisPoints());
        assertTrue(result.rulesVersion().startsWith("idle-input-v1:"));
        assertEquals(randomRules.data().version(), result.idleRulesVersion());
        assertEquals(2000, result.serverTimeSeconds());
        assertThrows(UnsupportedOperationException.class, () -> result.baseBonuses().clear());
        assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_idle WHERE role_id=?",
                Integer.class, roleId));
    }

    /** 世界来源不可用时整体失败，不能将适用权益误当作没有加成。 */
    @Test
    void applicableWorldFailureIsNotZeroBonus() {
        String selected = server();
        String roleId = role(selected, 70, 0);
        var unavailable = mock(WorldLevelService.class);
        when(unavailable.current(selected)).thenThrow(new IllegalStateException("独立测试：世界不可用"));
        var reader = new IdleRewardInputService(jdbc, rules, unavailable, gifts, giftRules, activities, activityRules);
        assertThrows(IllegalStateException.class, () -> locked(roleId, () -> reader.current(roleId, 2000)));
        verify(unavailable, times(1)).current(selected);
    }

    /** 没有事务、缺角色或正VIP配置缺失均拒绝，不退回默认角色或VIP0。 */
    @Test
    void missingAuthorityRejectsInsteadOfDefaulting() {
        String roleId = role(server(), 70, 999);
        assertThrows(IllegalTransactionStateException.class, () -> inputs.current(roleId, 2000));
        assertThrows(IllegalTransactionStateException.class, () -> inputs.maximumSeconds(roleId));
        assertThrows(IllegalStateException.class, () -> locked(roleId, () -> inputs.current(roleId, 2000)));
        assertThrows(org.springframework.dao.EmptyResultDataAccessException.class,
                () -> new TransactionTemplate(transactions).execute(status -> inputs.current("missing-role", 2000)));
    }

    /** 显示计时只依赖VIP；世界暂时不可用也不阻止已核实的时长读取。 */
    @Test
    void maximumTimeDoesNotNeedWorld() {
        String roleId = role(server(), 70, 2);
        var unavailable = mock(WorldLevelService.class);
        var reader = new IdleRewardInputService(jdbc, rules, unavailable, gifts, giftRules, activities, activityRules);
        assertEquals(25200, locked(roleId, () -> reader.maximumSeconds(roleId)));
        verifyNoInteractions(unavailable);
    }

    /** 挑战显式初始化后VIP动态上限接只读快照，读取不发资产、不重置起点或资产版本。 */
    @Test
    void mainChapterUsesPersistentVipLimit() {
        String roleId = role(server(), 1, 13);
        var before = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        locked(roleId, () -> idleStates.initializeForChallenge(roleId, 2000));
        var first = locked(roleId, () -> idle.snapshot(roleId, 1, 2000));
        var second = locked(roleId, () -> idle.snapshot(roleId, 1, 3000));
        assertEquals(64800, first.maxSeconds());
        assertEquals(randomRules.stage(1).base(), first.rates());
        assertEquals(first.startedAt(), second.startedAt());
        assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId));
    }

    /** VIP13的18小时在已有半窗累计上跨两次重置；基础次数不被窗口分割重复发放。 */
    @Test
    void authoritativeVipLimitSupportsMultipleResetWindows() {
        int limit = rules.vip(13).maxSeconds();
        var result = randomRules.roll(1, limit, 43170, Map.of(), RandomGenerator.of("L64X128MixRandom"), limit);
        assertEquals(21570, result.dropSeconds());
        assertEquals(216000, result.baseRewards().stream().filter(reward -> reward.itemId() == 900001)
                .mapToLong(reward -> reward.quantity()).sum());
        assertThrows(IllegalArgumentException.class, () -> randomRules.roll(1, limit + 1, 0, Map.of(),
                RandomGenerator.getDefault(), limit));
        assertThrows(IllegalArgumentException.class, () -> randomRules.roll(1, limit, 0, Map.of(),
                RandomGenerator.getDefault()));
    }

    /** 新角色神职0来自真实持久列，读取不写资产；空条目不是模块缺失时的临时回退。 */
    @Test
    void initialClergyZeroIsPersistentAndReadOnly() {
        String roleId = role(server(), 69, 0);
        assertEquals(0, jdbc.queryForObject("SELECT clergy_level FROM game_role WHERE id=?", Integer.class, roleId));
        var before = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        var input = locked(roleId, () -> inputs.current(roleId, 2000));
        assertEquals(0, input.clergyLevel());
        assertTrue(input.clergyBonuses().isEmpty());
        assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId));
    }

    /** 持久10级保留6/10两条；已知单件输入各ceil追加1，不把两条合成100%再取整。 */
    @Test
    void unlockedClergyEntriesReachExistingPureCalculation() {
        String roleId = role(server(), 69, 0);
        jdbc.update("UPDATE game_role SET clergy_level=10 WHERE id=?", roleId);
        var input = locked(roleId, () -> inputs.current(roleId, 2000));
        assertEquals(10, input.clergyLevel());
        assertEquals(List.of("clergy:6", "clergy:10"), input.clergyBonuses().stream()
                .map(IdleBonusUtils.ClergyBonus::key).toList());
        var before = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        var result = IdleBonusUtils.calculate(List.of(new CampaignRules.Reward(900001, 1)),
                List.of(), input.baseBonuses(), input.clergyBonuses(), bound -> 9999);
        assertEquals(List.of(new CampaignRules.Reward(900001, 3)), result.total());
        assertThrows(UnsupportedOperationException.class, () -> input.clergyBonuses().clear());
        assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId));
    }

    /** 未知正神职等级不能解释为未解锁；不读取无关世界，不写回成0或改资产版本。 */
    @Test
    void unknownClergyLevelRejectsInsteadOfBecomingZero() {
        String roleId = role(server(), 69, 0);
        jdbc.update("UPDATE game_role SET clergy_level=99 WHERE id=?", roleId);
        var before = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        assertThrows(IllegalStateException.class, () -> locked(roleId, () -> inputs.current(roleId, 2000)));
        assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId));
    }

    /** 只向当前独立测试库准备原始持有记录，不模拟购买成功或改变资产版本。 */
    private void gift(String id, String roleId, int giftId, long endsAt, int count, int active) {
        jdbc.update("INSERT INTO game_privilege_gift "
                + "(id,role_id,gift_id,purchased_at_seconds,ends_at_seconds,purchase_count,active) VALUES (?,?,?,?,?,?,?)",
                id, roleId, giftId, 100, endsAt, count, active);
    }

    /** 到期秒计入，下一秒失效；active0及购买计数不参与加成过滤，读取不清理原始记录。 */
    @Test
    void giftsUseOneFrozenTimeAndPreserveRawState() {
        String roleId = role(server(), 69, 0);
        gift("expiry-a", roleId, 100300, 2000, 0, 0);
        gift("expiry-b", roleId, 100400, 1999, 3, 1);
        var before = jdbc.queryForList("SELECT * FROM game_privilege_gift WHERE role_id=? ORDER BY id", roleId);
        var wallet = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        var at = locked(roleId, () -> inputs.current(roleId, 2000));
        assertEquals(2000, at.serverTimeSeconds());
        assertEquals(2, at.gifts().size());
        assertEquals(1, at.baseBonuses().size());
        assertEquals(900003, at.baseBonuses().getFirst().itemId());
        assertEquals(5000, at.baseBonuses().getFirst().basisPoints());
        assertTrue(locked(roleId, () -> inputs.current(roleId, 2001)).baseBonuses().isEmpty());
        assertEquals(before, jdbc.queryForList("SELECT * FROM game_privilege_gift WHERE role_id=? ORDER BY id", roleId));
        assertEquals(wallet, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId));
    }

    /** 同配置两条永久记录分别截断，3+1+1=5；BUY_GOLD不混入，原始字符串身份与列表保留。 */
    @Test
    void duplicateGiftRecordsRemainIndependentBonuses() {
        String roleId = role(server(), 69, 0);
        gift("9007199254740993", roleId, 100620, 0, 1, 1);
        gift("9007199254740995", roleId, 100620, 0, 0, 0);
        var input = locked(roleId, () -> inputs.current(roleId, 2000));
        assertEquals(2, input.gifts().size());
        assertEquals(2, input.baseBonuses().size());
        assertEquals(List.of("gift:9007199254740993:0", "gift:9007199254740995:0"),
                input.baseBonuses().stream().map(IdleBonusUtils.BaseBonus::key).toList());
        var result = IdleBonusUtils.calculate(List.of(new CampaignRules.Reward(900001, 3)), List.of(),
                input.baseBonuses(), input.clergyBonuses(), bound -> 0);
        assertEquals(List.of(new CampaignRules.Reward(900001, 5)), result.total());
        assertThrows(UnsupportedOperationException.class, () -> input.gifts().clear());
    }

    /** 沿旧先期限后配置：过期未知ID可保留历史记录，仍有效未知ID必须拒绝。 */
    @Test
    void expiredUnknownGiftDoesNotMasqueradeAsValidMissingConfig() {
        String roleId = role(server(), 69, 0);
        gift("unknown-expired", roleId, 999999, 1999, 0, 0);
        var historical = locked(roleId, () -> inputs.current(roleId, 2000));
        assertEquals(1, historical.gifts().size());
        assertTrue(historical.baseBonuses().isEmpty());
        gift("unknown-at-end", roleId, 999999, 2000, 1, 1);
        assertThrows(IllegalStateException.class, () -> locked(roleId, () -> inputs.current(roleId, 2000)));
    }

    /** 输入只读取本角色持有记录，不因同区其他角色拥有永久礼包而共用权益。 */
    @Test
    void giftOwnershipIsIsolatedByRole() {
        String selected = server();
        String roleId = role(selected, 69, 0);
        String other = role(selected, 69, 0);
        gift("other-owned", other, 100610, 0, 1, 1);
        var input = locked(roleId, () -> inputs.current(roleId, 2000));
        assertTrue(input.gifts().isEmpty());
        assertTrue(input.baseBonuses().isEmpty());
    }

    /** 适用持有表查询失败不能回退为空；只读计时上限仍不查询礼包权益。 */
    @Test
    void giftStoreFailureRejectsInputButDoesNotAffectVipTime() {
        String roleId = role(server(), 69, 2);
        var unavailable = mock(PrivilegeGiftService.class);
        when(unavailable.held(roleId)).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("测试持有表不可用"));
        var reader = new IdleRewardInputService(jdbc, rules, worlds, unavailable, giftRules, activities, activityRules);
        assertEquals(25200, locked(roleId, () -> reader.maximumSeconds(roleId)));
        verifyNoInteractions(unavailable);
        assertThrows(org.springframework.dao.DataAccessResourceFailureException.class,
                () -> locked(roleId, () -> reader.current(roleId, 2000)));
        verify(unavailable, times(1)).held(roleId);
    }

    /** 冻结过期控制而不推进轮次，记录期外不查缺失轮次行；资产和修订保持原值。 */
    @Test
    void freezesExpiredActivityWithoutAdvancingCycleOrChangingAssets() {
        String selected = server();
        String roleId = role(selected, 69, 0);
        jdbc.update("UPDATE game_server SET opened_at_seconds=100 WHERE id=?", selected);
        jdbc.update("UPDATE game_idle_activity_control SET publication_state=1,start_seconds=1000,"
                        + "end_seconds=2000,clear_seconds=3000,turns=7,turns_time=900,limit_days=2,revision=5 "
                        + "WHERE server_id=? AND activity_id=16", selected);
        var before = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        var controls = jdbc.queryForList("SELECT * FROM game_idle_activity_control WHERE server_id=? ORDER BY activity_id", selected);
        var input = locked(roleId, () -> inputs.current(roleId, 2001));
        assertEquals(100, input.activities().openedAtSeconds().orElseThrow());
        assertTrue(input.activities().openDays().isEmpty());
        assertEquals(List.of(16, 34, 44), input.activities().entries().stream()
                .map(IdleRewardInputService.Activity::control)
                .map(IdleActivityService.Control::activityId).toList());
        var selectedActivity = input.activities().entries().getFirst();
        var control = selectedActivity.control();
        assertTrue(control.published());
        assertEquals(5, control.revision());
        assertEquals(7, control.period().orElseThrow().turns());
        assertEquals(2000, control.period().orElseThrow().endSeconds());
        assertEquals(IdleRewardInputService.ActivityStatus.OUTSIDE_RECORD_PERIOD, selectedActivity.status());
        assertTrue(selectedActivity.drop().isEmpty());
        assertFalse(input.activities().entries().get(1).control().published());
        assertThrows(UnsupportedOperationException.class, () -> input.activities().entries().clear());
        assertEquals(controls, jdbc.queryForList("SELECT * FROM game_idle_activity_control WHERE server_id=? ORDER BY activity_id", selected));
        assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId));
    }

    /** 缺活动初始化不等同明确未发布，完整输入失败但VIP时长仍能独立读取。 */
    @Test
    void missingActivityInitializationIsNotNoActivities() {
        String selected = server();
        String roleId = role(selected, 69, 2);
        jdbc.update("DELETE FROM game_idle_activity_control WHERE server_id=? AND activity_id=34", selected);
        var before = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        assertThrows(IllegalStateException.class, () -> locked(roleId, () -> inputs.current(roleId, 2000)));
        assertEquals(25200, locked(roleId, () -> inputs.maximumSeconds(roleId)));
        assertEquals(before, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId));
    }

    /** 相同角色锁内只读取一次活动快照，读取错误不回退为空；计时路径不接触该来源。 */
    @Test
    void readsActivityOnceAndPropagatesUnavailableSource() {
        String selected = server();
        String roleId = role(selected, 69, 2);
        var source = mock(IdleActivityService.class);
        var reader = new IdleRewardInputService(jdbc, rules, worlds, gifts, giftRules, source, activityRules);
        assertEquals(25200, locked(roleId, () -> reader.maximumSeconds(roleId)));
        verifyNoInteractions(source);
        var frozen = locked(roleId, () -> activities.current(selected));
        when(source.current(selected)).thenReturn(frozen);
        var input = locked(roleId, () -> reader.current(roleId, 2000));
        assertSame(frozen.controls().getFirst(), input.activities().entries().getFirst().control());
        assertTrue(input.activities().entries().stream()
                .allMatch(entry -> entry.status() == IdleRewardInputService.ActivityStatus.NOT_PUBLISHED));
        verify(source, times(1)).current(selected);
        when(source.current(selected)).thenThrow(new IllegalStateException("测试活动存储不可用"));
        assertThrows(IllegalStateException.class, () -> locked(roleId, () -> reader.current(roleId, 2000)));
        verify(source, times(2)).current(selected);
    }

    /** 仅向当前独立H2夹具发布活动，不模拟运营接口或在生产服务中创建默认控制。 */
    private void publish(String serverId, int activityId, long start, long end, int turns, int limitDays) {
        jdbc.update("UPDATE game_idle_activity_control SET publication_state=1,start_seconds=?,"
                        + "end_seconds=?,clear_seconds=?,turns=?,turns_time=?,limit_days=?,revision=revision+1 "
                        + "WHERE server_id=? AND activity_id=?",
                start, end, Math.addExact(end, 1000), turns, start, limitDays, serverId, activityId);
    }

    /** 记录开始/结束秒均有效；clear仍在查看期不延长掉落，输入准备不抽随机数。 */
    @Test
    void activityRecordPeriodIncludesBothEndpointsButNotClearPeriod() {
        String selected = server();
        String roleId = role(selected, 11, 0);
        jdbc.update("UPDATE game_server SET opened_at_seconds=100 WHERE id=?", selected);
        publish(selected, 16, 1000, 2000, 1, 0);
        for (long now : List.of(1000L, 2000L)) {
            var input = locked(roleId, () -> inputs.current(roleId, now));
            var activity = input.activities().entries().getFirst();
            assertEquals(IdleRewardInputService.ActivityStatus.APPLICABLE, activity.status());
            assertEquals(100100, activity.drop().orElseThrow().id());
            assertEquals(6936, activity.drop().orElseThrow().gainChance());
            assertEquals(now, input.serverTimeSeconds());
        }
        for (long now : List.of(999L, 2001L, 3000L)) {
            var input = locked(roleId, () -> inputs.current(roleId, now));
            assertEquals(IdleRewardInputService.ActivityStatus.OUTSIDE_RECORD_PERIOD,
                    input.activities().entries().getFirst().status());
            assertTrue(input.activities().openDays().isEmpty());
        }
    }

    /** 016要求等级>1，034要求>10；044不误加角色门槛，结果顺序仍为16/34/44。 */
    @Test
    void activitiesUseTheirOwnStrictRoleLevelGates() {
        String selected = server();
        String levelOne = role(selected, 1, 0);
        String levelTen = role(selected, 10, 0);
        String levelEleven = role(selected, 11, 0);
        jdbc.update("UPDATE game_server SET opened_at_seconds=100 WHERE id=?", selected);
        for (int id : List.of(16, 34, 44)) {
            publish(selected, id, 1000, 2000, id == 44 ? 0 : 1, 0);
        }
        var first = locked(levelOne, () -> inputs.current(levelOne, 2000));
        assertEquals(List.of(IdleRewardInputService.ActivityStatus.ROLE_LEVEL_TOO_LOW,
                        IdleRewardInputService.ActivityStatus.ROLE_LEVEL_TOO_LOW,
                        IdleRewardInputService.ActivityStatus.APPLICABLE),
                first.activities().entries().stream().map(IdleRewardInputService.Activity::status).toList());
        var second = locked(levelTen, () -> inputs.current(levelTen, 2000));
        assertEquals(IdleRewardInputService.ActivityStatus.ROLE_LEVEL_TOO_LOW,
                second.activities().entries().get(1).status());
        var third = locked(levelEleven, () -> inputs.current(levelEleven, 2000));
        assertTrue(third.activities().entries().stream()
                .allMatch(entry -> entry.status() == IdleRewardInputService.ActivityStatus.APPLICABLE));
        assertEquals(0, third.activities().entries().get(1).drop().orElseThrow().gainChance());
        assertEquals(0, third.activities().entries().get(2).control().period().orElseThrow().turns());
    }

    /** 负责人确认的上海ceil日界：第3天恰好零点仍是2，下一秒才满足3天限制。 */
    @Test
    void serverOpeningDayKeepsConfirmedMidnightBoundary() {
        String selected = server();
        String roleId = role(selected, 11, 0);
        long opened = java.time.Instant.parse("2026-11-11T04:00:00Z").getEpochSecond();
        long midnight = java.time.Instant.parse("2026-11-12T16:00:00Z").getEpochSecond();
        jdbc.update("UPDATE game_server SET opened_at_seconds=? WHERE id=?", opened, selected);
        publish(selected, 16, opened, midnight + 100, 1, 3);
        var atMidnight = locked(roleId, () -> inputs.current(roleId, midnight));
        assertEquals(2, atMidnight.activities().openDays().orElseThrow());
        assertEquals(IdleRewardInputService.ActivityStatus.SERVER_TOO_YOUNG,
                atMidnight.activities().entries().getFirst().status());
        var afterMidnight = locked(roleId, () -> inputs.current(roleId, midnight + 1));
        assertEquals(3, afterMidnight.activities().openDays().orElseThrow());
        assertEquals(IdleRewardInputService.ActivityStatus.APPLICABLE,
                afterMidnight.activities().entries().getFirst().status());
    }

    /** 适用时缺开服时间拒绝；记录期外和等级不足明确排除时不要求无用依赖。 */
    @Test
    void necessaryOpeningTimeCannotBeDefaultedAndInapplicableCycleIsNotLookedUp() {
        String selected = server();
        String roleId = role(selected, 11, 0);
        publish(selected, 16, 1000, 2000, 999, 0);
        assertTrue(locked(roleId, () -> inputs.current(roleId, 2001)).activities().openDays().isEmpty());
        assertThrows(IllegalStateException.class, () -> locked(roleId, () -> inputs.current(roleId, 2000)));
        jdbc.update("UPDATE game_server SET opened_at_seconds=100 WHERE id=?", selected);
        assertThrows(IllegalStateException.class, () -> locked(roleId, () -> inputs.current(roleId, 2000)));
        jdbc.update("UPDATE game_role SET role_level=1 WHERE id=?", roleId);
        jdbc.update("UPDATE game_server SET opened_at_seconds=NULL WHERE id=?", selected);
        var excluded = locked(roleId, () -> inputs.current(roleId, 2000));
        assertEquals(IdleRewardInputService.ActivityStatus.ROLE_LEVEL_TOO_LOW,
                excluded.activities().entries().getFirst().status());
        assertTrue(excluded.activities().openDays().isEmpty());
        assertEquals(21600, locked(roleId, () -> inputs.maximumSeconds(roleId)));
    }

    /** 真实持久输入可直接交纯装配；已知基础追加独立取整，角色/库存/权益全部保持只读。 */
    @Test
    void authoritativeSourcesReachCompletePureCalculationWithoutWrites() {
        String selected = server();
        String roleId = role(selected, 70, 13);
        role(selected, 90, 0);
        jdbc.update("UPDATE game_role SET clergy_level=10 WHERE id=?", roleId);
        jdbc.update("UPDATE game_server SET opened_at_seconds=100 WHERE id=?", selected);
        for (int id : List.of(16, 34, 44)) {
            publish(selected, id, 1000, 2000, id == 44 ? 0 : 1, 0);
        }
        gift("pure-held", roleId, 100610, 0, 1, 0);
        var roleBefore = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        var inventoryBefore = jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", roleId);
        var giftsBefore = jdbc.queryForList("SELECT * FROM game_privilege_gift WHERE role_id=?", roleId);
        var controlsBefore = jdbc.queryForList("SELECT * FROM game_idle_activity_control WHERE server_id=? ORDER BY activity_id", selected);
        var input = locked(roleId, () -> inputs.current(roleId, 2000));
        var random = mock(RandomGenerator.class);
        when(random.nextInt(anyInt())).thenReturn(0);
        when(random.nextDouble()).thenReturn(0.0);
        when(random.nextInt(anyInt(), anyInt())).thenAnswer(invocation -> invocation.getArgument(0));
        var result = IdleRewardUtils.calculate(randomRules, input, 1, 60, 0, Map.of(), random);
        var total = result.outcome().total().stream().collect(java.util.stream.Collectors.toMap(
                CampaignRules.Reward::itemId, CampaignRules.Reward::quantity));
        // 金币200+神职100+100+VIP40；经验10+5+5+VIP2+世界5+礼包5。
        assertEquals(440L, total.get(900001));
        assertEquals(32L, total.get(900003));
        // 英雄经验25+神职13+13+VIP5+礼包12，保持ceil与截断的不同口径。
        assertEquals(68L, total.get(900101));
        for (int id : List.of(901701, 900502, 901702)) {
            assertEquals(3L, total.get(id));
        }
        assertSame(input, result.input());
        assertEquals(new IdleRules.Counter(11, 0), result.ordinary().counters().get(6));
        assertEquals(roleBefore, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId));
        assertEquals(inventoryBefore, jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", roleId));
        assertEquals(giftsBefore, jdbc.queryForList("SELECT * FROM game_privilege_gift WHERE role_id=?", roleId));
        assertEquals(controlsBefore, jdbc.queryForList("SELECT * FROM game_idle_activity_control WHERE server_id=? ORDER BY activity_id", selected));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_idle WHERE role_id=?", Integer.class, roleId));
    }

    /** 真实初始化/发布/tick产出的控制进入冻结输入及纯计算，不用手写控制行替代正常维护。 */
    @Test
    void maintainedControlsReachFrozenInputAndPureResultWithoutGrantingAssets() {
        String selected = server();
        jdbc.update("INSERT INTO game_server (id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)",
                selected, "input", "维护测试区", "独立维护服");
        String roleId = roles.create("maint_" + UUID.randomUUID().toString().substring(0, 8), selected).id();
        jdbc.update("UPDATE game_role SET role_level=69,clergy_level=6 WHERE id=?", roleId);
        var roleBefore = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        var inventoryBefore = jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", roleId);
        long opened = java.time.Instant.parse("2026-11-12T16:00:00Z").getEpochSecond();
        var publication = new IdleActivityPublicationUtils.Publication(1, opened, opened + 1000, opened + 2000, 0,
                List.of(new IdleActivityPublicationUtils.Exchange(1,
                        "[{\"item_type\":900001,\"item_num\":2}]", "[{\"item_type\":901702,\"item_num\":1}]", 5, 0, 0)));
        maintenance.configure(selected, opened, java.util.Optional.of(publication), opened);
        var beforeTick = locked(roleId, () -> inputs.current(roleId, opened + 60));
        assertEquals(List.of(IdleRewardInputService.ActivityStatus.APPLICABLE,
                        IdleRewardInputService.ActivityStatus.OUTSIDE_RECORD_PERIOD,
                        IdleRewardInputService.ActivityStatus.APPLICABLE),
                beforeTick.activities().entries().stream().map(IdleRewardInputService.Activity::status).toList());
        assertEquals(0, beforeTick.activities().entries().get(2).control().period().orElseThrow().turnsTimeSeconds());
        maintenance.maintain(selected, opened + 60);
        var afterTick = locked(roleId, () -> inputs.current(roleId, opened + 60));
        assertEquals(opened, afterTick.activities().entries().get(2).control().period().orElseThrow().turnsTimeSeconds());
        assertEquals(0, beforeTick.activities().entries().get(2).control().period().orElseThrow().turnsTimeSeconds());
        var random = mock(RandomGenerator.class);
        when(random.nextInt(anyInt())).thenReturn(0);
        when(random.nextDouble()).thenReturn(0.0);
        when(random.nextInt(anyInt(), anyInt())).thenAnswer(invocation -> invocation.getArgument(0));
        var candidate = IdleRewardUtils.calculate(randomRules, afterTick, 1, 60, 0, Map.of(), random);
        assertEquals(List.of(new CampaignRules.Reward(901701, 1)), candidate.activities().getFirst().rewards());
        assertTrue(candidate.activities().get(1).rewards().isEmpty());
        assertEquals(List.of(new CampaignRules.Reward(901702, 1)), candidate.activities().get(2).rewards());
        assertEquals(roleBefore, jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId));
        assertEquals(inventoryBefore, jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", roleId));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_idle WHERE role_id=?", Integer.class, roleId));
    }
}
