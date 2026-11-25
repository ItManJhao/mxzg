/** 隔离测试每日任务、活跃宝箱、成就递进和事务后的顶部提示。 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroSummonRules.Pool;
import com.funsgamex.mxzg.hero.HeroSummonService;
import com.funsgamex.mxzg.quest.QuestChanged;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.quest.QuestService;
import com.funsgamex.mxzg.quest.QuestService.QuestKind;
import com.funsgamex.mxzg.quest.QuestService.QuestTask;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:quest_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
@RecordApplicationEvents
class QuestServiceTest {
    /** 正常进入游戏以取得角色与会话。 */
    @Autowired private DevelopmentLoginService login;
    /** 测试真实召唤与日常进度的接入。 */
    @Autowired private HeroSummonService summons;
    /** 生产任务读取及领取事务。 */
    @Autowired private QuestService quests;
    /** 查询实际钻石到账及角色行锁。 */
    @Autowired private RoleRepository roles;
    /** 隔离角色的必要等级、钻石和普通库存实际结果。 */
    @Autowired private JdbcTemplate jdbc;
    /** 修改隔离应用的游戏时钟以经过上海零点。 */
    @Autowired private GameClock clock;
    /** 模拟实际来源在与角色持久化同一事务中发布事件。 */
    @Autowired private ApplicationEventPublisher events;
    /** 隔离事务边界，用于检查通知只在提交后发送。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 返回真实开发会话的角色身份和令牌，用来进入生产领取及召唤路径。 */
    private record Player(String role, String token) {}

    /** 验证登录领奖入库、实际召唤、活跃宝箱达标及自然日跨期防重放。 */
    @Test
    void dailyRewardsAreRealAndResetAcrossShanghaiMidnight() {
        var player = player(20);
        String role = player.role();
        var before = quests.snapshot(role);
        long period = before.resetAt();
        assertEquals(List.of(20, 40, 60, 80, 100), before.milestones().stream()
                .map(QuestService.QuestMilestone::points).toList());
        assertEquals(1, task(before.daily(), 1).current());
        assertEquals("", task(before.daily(), 7).destination());
        reject("QUEST_NOT_COMPLETE", () -> claim(role, QuestKind.MILESTONE, 1, period, id()));

        String dailyLogin = id();
        long initial = diamonds(role);
        var first = claim(role, QuestKind.DAILY, 1, period, dailyLogin);
        assertEquals(5, first.snapshot().activityPoints());
        assertEquals(List.of(new RewardFeedbackService.Item(900002, 20), new RewardFeedbackService.Item(900005, 5)),
                first.rewardNotice().items());
        assertEquals(initial + 20, diamonds(role));
        assertEquals(5L, jdbc.queryForObject("SELECT quantity FROM game_inventory WHERE role_id=? AND item_id=900005",
                Long.class, role));
        assertEquals(first.rewardNotice(), claim(role, QuestKind.DAILY, 1, period, dailyLogin).rewardNotice());
        reject("QUEST_ALREADY_CLAIMED", () -> claim(role, QuestKind.DAILY, 1, period, id()));
        reject("QUEST_REQUEST_CONFLICT", () -> claim(role, QuestKind.MILESTONE, 1, period, dailyLogin));

        summons.summon(player.token(), id());
        summons.draw(player.token(), id(), Pool.ADVANCED, 10, 1980);
        assertEquals(3, task(quests.snapshot(role).daily(), 3).current());
        assertEquals(15, claim(role, QuestKind.DAILY, 3, period, id()).snapshot().activityPoints());
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(role);
            events.publishEvent(new QuestProgressEvent(role, QuestMetric.TOWER_CHALLENGE, 0, 3));
        });
        assertEquals(25, claim(role, QuestKind.DAILY, 6, period, id()).snapshot().activityPoints());
        long beforeBox = diamonds(role);
        var box = claim(role, QuestKind.MILESTONE, 1, period, id());
        assertTrue(box.snapshot().milestones().getFirst().claimed());
        assertEquals(List.of(new RewardFeedbackService.Item(900002, 50)), box.rewardNotice().items());
        assertEquals(beforeBox + 50, diamonds(role));

        try {
            clock.setEpochSeconds(period + 1);
            var after = quests.snapshot(role);
            assertEquals(period + 86_400, after.resetAt());
            assertEquals(0, after.activityPoints());
            assertEquals(0, task(after.daily(), 3).current());
            assertEquals(1, task(after.daily(), 1).current());
            assertFalse(after.milestones().getFirst().claimed());
            assertEquals(first.rewardNotice(), claim(role, QuestKind.DAILY, 1, period, dailyLogin).rewardNotice());
            reject("QUEST_RESET", () -> claim(role, QuestKind.DAILY, 1, period, id()));
            assertEquals(beforeBox + 50, diamonds(role));
        } finally {
            clock.reset();
        }
    }

    /** 验证回滚不发提示，提交时合并达成档，后续同条件变化不重复飘字。 */
    @Test
    void completesOnceAfterCommitAndExposesTheNextAchievementAfterClaim(ApplicationEvents recorded) {
        String role = player(4).role();
        long period = quests.snapshot(role).resetAt();
        assertTrue(quests.snapshot(role).achievements().isEmpty());
        recorded.clear();
        var transaction = new TransactionTemplate(transactions);
        transaction.executeWithoutResult(status -> {
            raiseLevel(role, 10);
            assertEquals(0L, recorded.stream(QuestChanged.class).count());
            status.setRollbackOnly();
        });
        assertEquals(0L, recorded.stream(QuestChanged.class).count());
        assertTrue(quests.snapshot(role).achievements().isEmpty());

        transaction.executeWithoutResult(status -> {
            raiseLevel(role, 10);
            events.publishEvent(new QuestProgressEvent(role, QuestMetric.ADVENTURE_LEVEL));
        });
        assertEquals(List.of(List.of(100100, 100200)), recorded.stream(QuestChanged.class)
                .map(change -> change.completed().stream().map(QuestService.QuestCompletion::id).toList()).toList());
        var before = quests.snapshot(role);
        assertEquals(10, task(before.achievements(), 100100).current());
        assertFalse(before.achievements().stream().anyMatch(task -> task.id() == 100200));
        long prior = diamonds(role);
        String request = id();
        var after = claim(role, QuestKind.ACHIEVEMENT, 100100, period, request);
        assertEquals(prior + 300, diamonds(role));
        assertEquals(10, task(after.snapshot().achievements(), 100200).current());
        assertFalse(after.snapshot().achievements().stream().anyMatch(task -> task.id() == 100100));
        assertEquals(after.rewardNotice(), claim(role, QuestKind.ACHIEVEMENT, 100100, period, request).rewardNotice());
        assertEquals(2L, recorded.stream(QuestChanged.class).flatMap(change -> change.completed().stream()).count());
    }

    /** 在隔离事务内形成一次真实等级变化，模拟角色升级领域的已写入信号。 */
    private void raiseLevel(String role, int level) {
        roles.lock(role);
        jdbc.update("UPDATE game_role SET role_level=? WHERE id=?", level, role);
        events.publishEvent(new QuestProgressEvent(role, QuestMetric.ADVENTURE_LEVEL));
    }

    /** 查找明确配置编号，避免测试依赖列表滚动位置。 */
    private static QuestTask task(List<QuestTask> tasks, int taskId) {
        return tasks.stream().filter(task -> task.id() == taskId).findFirst().orElseThrow();
    }

    /** 发起标准幂等领取，测试时使用同一合法 UUID 构造原信封关联。 */
    private QuestService.ClaimResult claim(String role, QuestKind kind, int task, long period, String request) {
        return quests.claim(role, kind, task, period, request, request);
    }

    /** 校验确切业务拒绝原因。 */
    private static void reject(String reason, Runnable request) {
        assertEquals(reason, assertThrows(ResponseStatusException.class, request::run).getReason());
    }

    /** 真实角色钱包仅使用权威数据库角色资料。 */
    private long diamonds(String role) {
        return roles.findById(role).orElseThrow().diamonds();
    }

    /** 创建随机隔离账号，等级和余额是测试前置。 */
    private Player player(int level) {
        var player = login.login("quest_" + id().substring(0, 12), "local-1");
        jdbc.update("UPDATE game_role SET role_level=?,diamonds=5000 WHERE id=?", level, player.role().id());
        return new Player(player.role().id(), "Bearer " + player.session().accessToken());
    }

    /** 创建规范业务请求 UUID，保证各操作可独立重放。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
