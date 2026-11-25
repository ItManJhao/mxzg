/** 隔离数据库中的好友往来验证，覆盖真实关系、礼物到账、任务进度和自然日回执。 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.friend.FriendService;
import com.funsgamex.mxzg.friend.FriendService.Action;
import com.funsgamex.mxzg.friend.FriendService.Command;
import com.funsgamex.mxzg.quest.QuestService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:friend_service;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class FriendServiceTest {
    /** 独立创建测试角色，使用真实角色档案初始化。 */
    @Autowired private DevelopmentLoginService login;
    /** 模拟各账号打开好友面板和真实往来。 */
    @Autowired private FriendService friends;
    /** 核对好友建立成就和每日赠送进度。 */
    @Autowired private QuestService quests;
    /** 从事务提交结果核对金币余额。 */
    @Autowired private RoleRepository roles;
    /** 准备隔离测试的角色昵称、等级和区服。 */
    @Autowired private JdbcTemplate jdbc;
    /** 控制测试时间跨过上海零点。 */
    @Autowired private GameClock clock;
    /** 制造事务回滚，核对礼物和任务不会单独提交。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 同服名称搜索、真实在线推荐、申请、审批和双向关系，和黑名单一起读取。 */
    @Test
    void searchApplyAcceptRemoveAndUnblock() {
        String actor = player("沙盒甲", "local-1");
        String target = player("好友样本乙", "local-1");
        jdbc.update("UPDATE game_server SET enabled=TRUE WHERE id='local-2'");
        String remote = player("好友样本丙", "local-2");
        var found = friends.search(actor, " 好友样本 ");
        assertEquals("好友样本", found.query());
        assertEquals(List.of(target), found.entries().stream().map(FriendService.Entry::roleId).toList());
        assertTrue(friends.search(actor, "%").entries().isEmpty());
        assertTrue(friends.search(actor, "").entries().isEmpty());
        assertEquals(List.of(target), friends.search(actor, "", Set.of(actor, target, remote)).entries().stream()
                .map(FriendService.Entry::roleId).toList());
        reject("FRIEND_NOT_FOUND", () -> friends.change(actor, command(Action.APPLY, remote, 0)));

        friends.change(actor, command(Action.APPLY, target, 0));
        assertTrue(friends.search(actor, "好友样本").entries().getFirst().requested());
        assertEquals(actor, friends.state(target).applications().getFirst().roleId());
        friends.change(target, command(Action.REJECT, actor, 0));
        assertTrue(friends.state(target).applications().isEmpty());
        assertFalse(friends.search(actor, "好友样本").entries().getFirst().requested());

        connect(actor, target);
        assertEquals(target, friends.state(actor).friends().getFirst().roleId());
        assertEquals(actor, friends.state(target).friends().getFirst().roleId());
        assertTrue(friends.search(actor, "好友样本").entries().isEmpty());
        assertEquals(1, friendAchievement(actor));
        assertEquals(1, friendAchievement(target));

        friends.change(actor, command(Action.REMOVE, target, 0));
        assertTrue(friends.state(target).friends().isEmpty());
        assertEquals(1, friendAchievement(actor));
        connect(target, actor);
        long resetAt = friends.state(actor).resetAt();
        friends.change(target, command(Action.SEND, actor, resetAt));
        friends.change(actor, command(Action.BLOCK, target, 0));
        assertEquals(target, friends.state(actor).blocked().getFirst().roleId());
        assertTrue(friends.state(actor).gifts().isEmpty());
        assertTrue(friends.state(target).friends().isEmpty());
        reject("FRIEND_BLOCKED", () -> friends.change(target, command(Action.APPLY, actor, 0)));
        assertTrue(friends.search(target, "沙盒甲").entries().isEmpty());
        friends.change(actor, command(Action.UNBLOCK, target, 0));
        assertTrue(friends.state(actor).blocked().isEmpty());
        assertEquals(actor, friends.search(target, "沙盒甲").entries().getFirst().roleId());
        assertTrue(friends.state(actor).friends().isEmpty());
    }

    /** 赠送与领取分别持久化可靠回执，旧日只能复读回执，不能重新赠领。 */
    @Test
    void giftTransactionsRetryAndResetAtShanghaiMidnight() {
        String sender = player("赠礼样本", "local-1");
        String recipient = player("领取样本", "local-1");
        connect(sender, recipient);
        long resetAt = friends.state(sender).resetAt();
        Command send = command(Action.SEND, recipient, resetAt);
        new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
            assertEquals(1, friends.change(sender, send).state().sentToday());
            transaction.setRollbackOnly();
        });
        assertEquals(0, gold(sender));
        assertTrue(friends.state(recipient).gifts().isEmpty());
        assertEquals(0, giftTask(sender));

        var delivered = friends.change(sender, send);
        assertEquals(1, delivered.state().sentToday());
        assertTrue(delivered.state().friends().getFirst().sentToday());
        assertEquals(delivered.notice(), friends.change(sender, send).notice());
        assertEquals(3000, gold(sender));
        assertEquals(1, giftTask(sender));
        assertEquals(1, friends.state(recipient).gifts().getFirst().giftState());
        reject("FRIEND_ALREADY_SENT", () -> friends.change(sender, command(Action.SEND, recipient, resetAt)));
        reject("FRIEND_REQUEST_CONFLICT", () -> friends.change(sender,
                new Command(send.requestId(), Action.SEND_ALL, null, resetAt)));

        Command claim = command(Action.CLAIM, sender, resetAt);
        var claimed = friends.change(recipient, claim);
        assertTrue(claimed.state().gifts().isEmpty());
        assertEquals(2, claimed.state().friends().getFirst().giftState());
        assertEquals(10, claimed.state().friendship());
        assertEquals(10000, gold(recipient));
        assertEquals(0, giftTask(recipient));
        assertEquals(claimed.notice(), friends.change(recipient, claim).notice());
        reject("FRIEND_NO_GIFTS", () -> friends.change(recipient, command(Action.CLAIM_ALL, null, resetAt)));

        try {
            clock.setEpochSeconds(resetAt + 1);
            assertEquals(resetAt + 86400, friends.state(sender).resetAt());
            assertEquals(0, friends.state(sender).sentToday());
            assertEquals(0, friends.state(recipient).friends().getFirst().giftState());
            assertEquals(0, giftTask(sender));
            assertEquals(delivered.notice(), friends.change(sender, send).notice());
            assertEquals(3000, gold(sender));
            reject("FRIEND_DAY_CHANGED", () -> friends.change(sender, command(Action.SEND, recipient, resetAt)));
        } finally {
            clock.reset();
        }
    }

    /** 一键领取十一份时前十份赠友情点，第十一份只赠超额金币。 */
    @Test
    void bulkReceiveUsesConfiguredFullAndExcessGiftRewards() {
        String recipient = player("批量领取样本", "local-1");
        long resetAt = friends.state(recipient).resetAt();
        for (int i = 1; i <= 11; i++) {
            String sender = player("批量赠礼样本" + i, "local-1");
            connect(sender, recipient);
            friends.change(sender, command(Action.SEND_ALL, null, resetAt));
            assertEquals(3000, gold(sender));
        }
        assertEquals(11, friends.state(recipient).gifts().size());
        Command command = command(Action.CLAIM_ALL, null, resetAt);
        var result = friends.change(recipient, command);
        assertEquals(100, result.state().friendship());
        assertTrue(result.state().gifts().isEmpty());
        assertEquals(101000, gold(recipient));
        assertEquals(result.notice(), friends.change(recipient, command).notice());
        assertEquals(101000, gold(recipient));
    }

    /** 创建真实角色，固定公开昵称和初始钱包以便断言。 */
    private String player(String name, String serverId) {
        String account = "friend_" + UUID.randomUUID().toString().substring(0, 16);
        String id = login.login(account, serverId).role().id();
        jdbc.update("UPDATE game_role SET nickname=?,role_level=18,first_named=TRUE,gold=0 WHERE id=?", name, id);
        return id;
    }

    /** 在真实申请与审批路径建立双方好友关系。 */
    private void connect(String actor, String target) {
        friends.change(actor, command(Action.APPLY, target, 0));
        friends.change(target, command(Action.ACCEPT, actor, 0));
    }

    /** 生成独立操作编号，允许显式保存以验证重试。 */
    private Command command(Action action, String targetId, long resetAt) {
        return new Command(UUID.randomUUID().toString(), action, targetId, resetAt);
    }

    /** 读取每日赠送友情点任务的真实进度，校验可走到好友入口。 */
    private long giftTask(String roleId) {
        var task = quests.snapshot(roleId).daily().stream().filter(entry -> entry.id() == 2).findFirst().orElseThrow();
        assertEquals("main_friend", task.destination());
        return task.current();
    }

    /** 读取首个里程碑，关系删除后也保留个人历史达成数量。 */
    private long friendAchievement(String roleId) {
        return quests.snapshot(roleId).achievements().stream().filter(entry -> entry.id() == 103300).findFirst().orElseThrow().current();
    }

    /** 直接从角色权威钱包读取金币。 */
    private long gold(String roleId) {
        return roles.findById(roleId).orElseThrow().gold();
    }

    /** 校验拒绝携带网络层所约定的业务原因。 */
    private void reject(String code, Runnable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action::run).getReason());
    }
}
