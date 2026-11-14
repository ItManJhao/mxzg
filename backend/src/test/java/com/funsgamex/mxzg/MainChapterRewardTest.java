/** 独立H2验证前三关真实奖励分发、酒馆上限与整体回滚；不创建通关或领奖协议。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.*;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:chapter_rewards;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class MainChapterRewardTest {
    /** 独立测试角色创建入口。 */
    @Autowired DevelopmentLoginService login;
    /** 本批分发逻辑，不包含请求幂等。 */
    @Autowired MainChapterRewardService rewards;
    /** 配置上限与关卡奖励。 */
    @Autowired MainChapterRules rules;
    /** 核对角色钱包、等级和版本。 */
    @Autowired RoleRepository roles;
    /** 核对普通库存与余额，不访问玩家库。 */
    @Autowired InventoryService inventory;
    /** 模拟外层结算事务。 */
    @Autowired PlatformTransactionManager transactions;
    /** 准备余额边界及核对未创建穿戴记录。 */
    @Autowired JdbcTemplate jdbc;

    /** 创建不含奖励和布阵的独立角色。 */
    private String player() {
        return login.login("award_" + UUID.randomUUID().toString().substring(0, 12)).role().id();
    }

    /** 按配置ID查询已入账余额，缺记录等于零。 */
    private long count(String role, int id) {
        return inventory.list(role).stream().filter(item -> item.itemId() == id)
            .mapToLong(InventoryService.Item::quantity).sum();
    }

    /** 使用真实前三关清单：金币/钻石入钱包，经验升级，装备和碎片入背包，版本每关一次。 */
    @Test void originalThreeStageRewardsUseCorrectDestinations() {
        String role = player();
        var before = roles.findById(role).orElseThrow();
        long revision = roles.revision(role);
        for (int stage = 1; stage <= 3; stage++) {
            int index = stage;
            var granted = new TransactionTemplate(transactions).execute(status ->
                rewards.grant(role, new MainChapterRules.Progress(index, true)));
            assertEquals(rules.stage(stage).firstRewards(), granted);
        }
        var after = roles.findById(role).orElseThrow();
        assertEquals(before.gold() + 12200, after.gold());
        assertEquals(before.diamonds() + 151 + 20, after.diamonds());
        assertEquals(3, after.level());
        assertEquals(120, after.basics().experience());
        assertEquals(1700, count(role, 900101));
        assertEquals(300, count(role, 900401));
        assertEquals(2, count(role, 1004001));
        assertEquals(1, count(role, 1003001));
        assertEquals(30, count(role, 20204004));
        assertEquals(1, count(role, 20005000));
        assertEquals(0, count(role, 900003));
        assertEquals(revision + 3, roles.revision(role));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_equipment WHERE role_id=?", Integer.class, role));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=?", Integer.class, role));
    }

    /** 酒馆奖励只补到已通关上限；原有超上限余额不扣回，其他奖励照常处理。 */
    @Test void tavernCapDoesNotOverflowOrRemoveExistingBalance() {
        String role = player();
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(role, 900401, 10990));
        var first = new TransactionTemplate(transactions).execute(status ->
            rewards.grant(role, new MainChapterRules.Progress(1, true)));
        assertTrue(first.contains(new MainChapterRules.Reward(900401, 10)));
        assertEquals(11000, count(role, 900401));
        jdbc.update("UPDATE game_inventory SET quantity=12000 WHERE role_id=? AND item_id=900401", role);
        var second = new TransactionTemplate(transactions).execute(status ->
            rewards.grant(role, new MainChapterRules.Progress(2, true)));
        assertTrue(second.stream().noneMatch(item -> item.itemId() == 900401));
        assertEquals(12000, count(role, 900401));
        assertEquals(1000, count(role, 900101));
    }

    /** 无待领奖不写任何奖励或版本；离开事务直接调用必须拒绝。 */
    @Test void absentPendingRewardIsNoOpAndTransactionIsRequired() {
        String role = player();
        long revision = roles.revision(role);
        var result = new TransactionTemplate(transactions).execute(status ->
            rewards.grant(role, new MainChapterRules.Progress(0, false)));
        assertTrue(result.isEmpty());
        assertEquals(revision, roles.revision(role));
        assertTrue(inventory.list(role).isEmpty());
        assertThrows(org.springframework.transaction.IllegalTransactionStateException.class,
            () -> rewards.grant(role, new MainChapterRules.Progress(1, true)));
    }

    /** 首通适配不能把满级忽略的理论经验返回为到账奖励，其他原奖励仍正常入账。 */
    @Test
    void maximumLevelDoesNotReportIgnoredExperienceAsAReceivedReward() {
        String role = player();
        jdbc.update("UPDATE game_role SET role_level=300,role_experience=7 WHERE id=?", role);
        var before = roles.findById(role).orElseThrow();
        long revision = roles.revision(role);
        var received = new TransactionTemplate(transactions).execute(status ->
                rewards.grant(role, new MainChapterRules.Progress(1, true)));
        assertEquals(rules.stage(1).firstRewards().stream().filter(reward -> reward.itemId() != 900003).toList(),
                received);
        var after = roles.findById(role).orElseThrow();
        assertEquals(300, after.level());
        assertEquals(7, after.basics().experience());
        long directDiamonds = rules.stage(1).firstRewards().stream().filter(reward -> reward.itemId() == 900002)
                .mapToLong(MainChapterRules.Reward::quantity).sum();
        assertEquals(before.diamonds() + directDiamonds, after.diamonds());
        assertEquals(revision + 1, roles.revision(role));
    }

    /** 中途库存精确加法溢出时，已经执行的金币、经验、升级奖和酒馆点也全部回滚。 */
    @Test void laterRewardFailureRollsBackEarlierRewards() {
        String role = player();
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(role, 900101, Long.MAX_VALUE));
        var before = roles.findById(role).orElseThrow();
        var bag = inventory.list(role);
        long revision = roles.revision(role);
        assertThrows(ArithmeticException.class,
            () -> new TransactionTemplate(transactions).executeWithoutResult(status ->
                rewards.grant(role, new MainChapterRules.Progress(1, true))));
        assertEquals(before, roles.findById(role).orElseThrow());
        assertEquals(bag, inventory.list(role));
        assertEquals(revision, roles.revision(role));
    }
}
