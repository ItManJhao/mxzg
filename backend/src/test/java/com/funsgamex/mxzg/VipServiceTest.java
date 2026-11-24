/** 隔离内存库验证女神契约进度、VIP 升档、通用发奖回执与回滚。 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.HeroSummonRules.Pool;
import com.funsgamex.mxzg.hero.HeroSummonService;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.vip.VipService;
import java.util.List;
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
    "spring.datasource.url=jdbc:h2:mem:vip_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class VipServiceTest {
    /** 真实创建角色和持久会话，数据仅用于隔离测试。 */
    @Autowired private DevelopmentLoginService login;
    /** 当前任务读取和发奖事务的生产入口。 */
    @Autowired private VipService vip;
    /** 实际高级召唤累计写入生产领域。 */
    @Autowired private HeroSummonService summons;
    /** 夹具写入隔离角色的通关、拥有英雄和角色等级前置条件。 */
    @Autowired private JdbcTemplate jdbc;
    /** 用生产入口核对最终钱包和同一持久版本。 */
    @Autowired private RoleRepository roles;
    /** 构造原发奖事务失败，复验回执和资产不会部分保存。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 测试角色的持久身份及访问凭证，均通过开发登录取得。 */
    private record Player(String roleId, String token) {}

    /** 四项进度读取真实领域；当前档位最后一个领奖事务提升 VIP 并冻结本笔奖励。 */
    @Test
    void currentTierUsesRealProgressAndAdvancesFromLastClaim() {
        var player = player();
        String role = player.roleId();
        assertEquals(0, vip.current(role).level());
        assertEquals(List.of(100100, 100200, 100300, 100400),
            vip.current(role).tasks().stream().map(VipService.Task::id).toList());
        assertEquals(0, task(player, 100100).progress());
        assertEquals(1, task(player, 100200).progress());
        assertEquals(0, task(player, 100300).progress());
        assertEquals(0, task(player, 100400).progress());
        rejected("VIP_REQUEST_INVALID", player, "invalid", 100100);
        rejected("VIP_TASK_NOT_REACHED", player, id(), 100100);
        rejected("VIP_TASK_TIER", player, id(), 100500);

        jdbc.update("UPDATE game_role SET role_level=5,diamonds=3000 WHERE id=?", role);
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,3)", role);
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10304012,19,4)", id(), role);
        assertEquals(0, task(player, 100300).progress());
        jdbc.update("UPDATE game_hero SET hero_level=20 WHERE role_id=?", role);
        summons.summon(player.token(), id());
        assertEquals(0, task(player, 100400).progress());
        summons.draw(player.token(), id(), Pool.ADVANCED, 1, 0);
        assertEquals(1, task(player, 100400).progress());
        assertThrows(HeroSummonService.Rejected.class,
            () -> summons.draw(player.token(), id(), Pool.ADVANCED, 10, 0));
        assertEquals(1, task(player, 100400).progress());
        summons.draw(player.token(), id(), Pool.ADVANCED, 10, 1980);
        assertEquals(11, task(player, 100400).progress());

        long originalBalance = balance(player);
        long originalRevision = roles.revision(role);
        vip.claim(player.token(), id(), 100400);
        vip.claim(player.token(), id(), 100300);
        vip.claim(player.token(), id(), 100200);
        assertEquals(0, vip.current(role).level());
        assertTrue(task(player, 100300).claimed());
        assertFalse(task(player, 100100).claimed());

        String finalRequest = id();
        var last = vip.claim(player.token(), finalRequest, 100100);
        assertEquals(1, vip.current(role).level());
        assertEquals(originalBalance + 80, balance(player));
        assertEquals(originalRevision + 4, last.assetRevision());
        assertEquals(last.receiptId(), last.notice().receiptId());
        assertEquals(finalRequest, last.notice().requestId());
        assertEquals(List.of(new RewardFeedbackService.Item(900002, 20)), last.notice().items());
        assertEquals(last, vip.claim(player.token(), finalRequest, 100100));
        rejected("VIP_REQUEST_CONFLICT", player, finalRequest, 100500);
        rejected("VIP_TASK_CLAIMED", player, id(), 100100);
        rejected("VIP_TASK_NOT_REACHED", player(), finalRequest, 100100);
        assertEquals(originalBalance + 80, balance(player));
        assertEquals(last.assetRevision(), roles.revision(role));
    }

    /** 已接通档位从真实状态计算，VIP4 之后未接通的档位拒绝领取。 */
    @Test
    void supportedTiersReadActualProgressAndNextTierCannotAdvance() {
        var player = player();
        String role = player.roleId();
        jdbc.update("UPDATE game_role SET role_level=15,goddess_vip=1 WHERE id=?", role);
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,20)", role);
        long originalBalance = balance(player);
        vip.claim(player.token(), id(), 100500);
        vip.claim(player.token(), id(), 100600);
        assertEquals(originalBalance + 60, balance(player));
        assertEquals(0, task(player, 100700).progress());
        assertEquals(0, task(player, 100800).progress());
        rejected("VIP_TASK_NOT_REACHED", player, id(), 100700);
        rejected("VIP_TASK_NOT_REACHED", player, id(), 100800);
        assertEquals(1, vip.current(role).level());

        jdbc.update("UPDATE game_role SET goddess_vip=2 WHERE id=?", role);
        assertEquals(2, vip.current(role).level());
        assertEquals(20, task(player, 100900).progress());
        assertEquals(15, task(player, 101000).progress());
        assertEquals(0, task(player, 101100).progress());
        assertEquals(0, task(player, 101200).progress());
        rejected("VIP_TASK_NOT_REACHED", player, id(), 100900);
        rejected("VIP_TASK_NOT_REACHED", player, id(), 101100);
        rejected("VIP_TASK_NOT_REACHED", player, id(), 101200);
        jdbc.update("UPDATE game_role SET goddess_vip=3 WHERE id=?", role);
        assertEquals(List.of(20, 0, 0, 0), vip.current(role).tasks().stream().map(VipService.Task::progress).toList());
        rejected("VIP_TASK_NOT_REACHED", player, id(), 101300);
        jdbc.update("UPDATE game_role SET goddess_vip=4 WHERE id=?", role);
        assertNull(task(player, 101700).progress());
        rejected("VIP_TASK_UNAVAILABLE", player, id(), 101700);
        jdbc.update("UPDATE game_role SET goddess_vip=13 WHERE id=?", role);
        assertEquals(new VipService.State(13, List.of()), vip.current(role));
    }

    /** 事务回滚同时撤销奖励和领取资格消耗，原操作编号可正常重试。 */
    @Test
    void rolledBackClaimCanRetryNormally() {
        var player = player();
        jdbc.update("UPDATE game_role SET role_level=5 WHERE id=?", player.roleId());
        var originalBalance = balance(player);
        var originalRevision = roles.revision(player.roleId());
        String request = id();

        new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
            vip.claim(player.token(), request, 100200);
            transaction.setRollbackOnly();
        });

        assertFalse(task(player, 100200).claimed());
        assertEquals(originalBalance, balance(player));
        assertEquals(originalRevision, roles.revision(player.roleId()));
        var receipt = vip.claim(player.token(), request, 100200);
        assertTrue(task(player, 100200).claimed());
        assertEquals(originalBalance + 20, balance(player));
        assertEquals(originalRevision + 1, receipt.assetRevision());
    }

    /** 创建唯一隔离账号，返回生产方法所需的 Bearer 凭证。 */
    private Player player() {
        var entered = login.login("vip_" + id().substring(0, 13), "local-1");
        return new Player(entered.role().id(), "Bearer " + entered.session().accessToken());
    }

    /** 从当前档位查询真实任务，以任务 ID 匹配。 */
    private VipService.Task task(Player player, int taskId) {
        return vip.current(player.roleId()).tasks().stream().filter(task -> task.id() == taskId).findFirst().orElseThrow();
    }

    /** 通过统一角色读取入口取得实际钱包余额。 */
    private long balance(Player player) {
        return roles.findById(player.roleId()).orElseThrow().diamonds();
    }

    /** 断言明确业务错误，避免把其他失败视为有效拒绝。 */
    private void rejected(String code, Player player, String request, int taskId) {
        assertEquals(code, assertThrows(ResponseStatusException.class,
            () -> vip.claim(player.token(), request, taskId)).getReason());
    }

    /** 创建真实领取和业务实例使用的规范 UUID。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
