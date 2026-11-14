/**
 * 独立内存库验证角色经验的真实接纳、满级忽略、跨级附赠和事务边界。
 * 测试只使用隔离角色及既有可信经验入口，不调用英雄升级或主线发奖，也不连接日常玩家库。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.role.*;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:role_experience;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class RoleExperienceTest {
    /** 只创建隔离角色，不连接日常服务。 */
    @Autowired DevelopmentLoginService login;
    /** 本批事务内奖励入口。 */
    @Autowired RoleExperienceService experience;
    /** 原表门槛与纯规则。 */
    @Autowired RoleRules rules;
    /** 核对唯一角色状态和版本。 */
    @Autowired RoleRepository roles;
    /** 外层结算事务的测试替身。 */
    @Autowired PlatformTransactionManager transactions;
    /** 仅准备独立角色的满级经验及钱包边界数据，不发放业务奖励。 */
    @Autowired JdbcTemplate jdbc;

    /** 返回全新隔离角色，不借用玩家数据。 */
    private String player() {
        return login.login("exp_" + UUID.randomUUID().toString().substring(0, 12)).role().id();
    }

    /** 普通经验、准确门槛与多级沿旧表计算，保留前态并只把本次新增量计为接纳。 */
    @Test void originalThresholdAndRewardRules() {
        assertEquals(new RoleRules.ExperienceGain(1, 0, 119, 119, 0, 1, 119, 0),
            rules.addExperience(1, 0, 119));
        assertEquals(new RoleRules.ExperienceGain(1, 0, 120, 120, 0, 2, 0, 10),
            rules.addExperience(1, 0, 120));
        assertEquals(new RoleRules.ExperienceGain(1, 0, 200, 200, 0, 2, 80, 10),
            rules.addExperience(1, 0, 200));
        assertEquals(new RoleRules.ExperienceGain(1, 0, 1205, 1205, 0, 4, 5, 40),
            rules.addExperience(1, 0, 120 + 360 + 720 + 5));
        assertEquals(new RoleRules.ExperienceGain(1, 100, 400, 400, 0, 3, 20, 20),
            rules.addExperience(1, 100, 400));
    }

    /** 到满级时只接纳剩余升级所需经验，准确区分刚好到顶和跨多级溢出。 */
    @Test void finalLevelSeparatesAcceptedExperienceFromIgnoredOverflow() {
        long beforeExperience = rules.threshold(299) - 1;
        assertEquals(new RoleRules.ExperienceGain(299, beforeExperience, 1, 1, 0, 300, 0, 200),
            rules.addExperience(299, beforeExperience, 1));
        assertEquals(new RoleRules.ExperienceGain(299, beforeExperience, 100, 1, 99, 300, 0, 200),
            rules.addExperience(299, beforeExperience, 100));

        long toMaximum = rules.threshold(298) + rules.threshold(299) - 17;
        assertEquals(new RoleRules.ExperienceGain(298, 17, toMaximum - 1, toMaximum - 1, 0,
                299, rules.threshold(299) - 1, 200),
            rules.addExperience(298, 17, toMaximum - 1));
        assertEquals(new RoleRules.ExperienceGain(298, 17, toMaximum, toMaximum, 0, 300, 0, 400),
            rules.addExperience(298, 17, toMaximum));
        assertEquals(new RoleRules.ExperienceGain(298, 17, toMaximum + 5, toMaximum, 5, 300, 0, 400),
            rules.addExperience(298, 17, toMaximum + 5));

        long accepted = rules.threshold(299);
        assertEquals(new RoleRules.ExperienceGain(299, 0, Long.MAX_VALUE, accepted,
                Long.MAX_VALUE - accepted, 300, 0, 200),
            rules.addExperience(299, 0, Long.MAX_VALUE));
    }

    /** 原已满级的历史经验不清除，整次新增均忽略，也不执行会溢出的经验相加。 */
    @Test void alreadyMaximumPreservesHistoricalExperienceAndIgnoresWholeReward() {
        assertEquals(new RoleRules.ExperienceGain(300, 7, 100, 0, 100, 300, 7, 0),
            rules.addExperience(300, 7, 100));
        assertEquals(new RoleRules.ExperienceGain(300, Long.MAX_VALUE, Long.MAX_VALUE, 0,
                Long.MAX_VALUE, 300, Long.MAX_VALUE, 0),
            rules.addExperience(300, Long.MAX_VALUE, Long.MAX_VALUE));
    }

    /** 非法前态和非正奖励拒绝，未满级经验相加溢出仍保持既有整次失败规则。 */
    @Test void invalidExperienceAndOverflowAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(1, 0, 0));
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(1, 0, -1));
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(1, -1, 1));
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(1, 120, 1));
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(0, 0, 1));
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(301, 0, 1));
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(300, -1, 1));
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(300, 7, 0));
        assertThrows(ArithmeticException.class, () -> rules.addExperience(1, 1, Long.MAX_VALUE));
    }

    /** 第一关200经验应真正进入角色，升级奖励与两次经验入账共用一次提交版本。 */
    @Test void rewardsShareRoleVersionAndRealExperienceFields() {
        String id = player();
        var before = roles.findById(id).orElseThrow();
        long revision = roles.revision(id);
        var gains = new TransactionTemplate(transactions).execute(status -> List.of(
            experience.credit(id, 100),
            experience.credit(id, 100)));
        assertEquals(List.of(
            new RoleRules.ExperienceGain(1, 0, 100, 100, 0, 1, 100, 0),
            new RoleRules.ExperienceGain(1, 100, 100, 100, 0, 2, 80, 10)), gains);
        var after = roles.findById(id).orElseThrow();
        assertEquals(2, after.level());
        assertEquals(80, after.basics().experience());
        assertEquals(360, after.basics().experienceToNextLevel());
        assertEquals(before.diamonds() + 10, after.diamonds());
        assertEquals(before.gold(), after.gold());
        assertEquals(revision + 1, roles.revision(id));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_campaign WHERE role_id=?", Integer.class, id));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_inventory WHERE role_id=? AND item_id=900003", Integer.class, id));
    }

    /** 奖励后续步骤失败必须回滚经验、等级、钻石与版本。 */
    @Test void outerFailureRollsBackEveryField() {
        String id = player();
        var before = roles.findById(id).orElseThrow();
        long revision = roles.revision(id);
        assertThrows(IllegalStateException.class, () -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
            experience.credit(id, 200);
            throw new IllegalStateException("模拟后续装备发放失败");
        }));
        assertEquals(before, roles.findById(id).orElseThrow());
        assertEquals(revision, roles.revision(id));
    }

    /** 缺外层事务禁止发放；已满级保留历史经验并返回整量忽略，不增加资产版本。 */
    @Test void requiresTransactionAndIgnoresMaxLevelGain() {
        String id = player();
        assertThrows(org.springframework.transaction.IllegalTransactionStateException.class, () -> experience.credit(id, 200));
        jdbc.update("UPDATE game_role SET role_level=300,role_experience=7 WHERE id=?", id);
        var before = roles.findById(id).orElseThrow();
        long revision = roles.revision(id);
        var gain = new TransactionTemplate(transactions).execute(status -> experience.credit(id, 200));
        assertEquals(new RoleRules.ExperienceGain(300, 7, 200, 0, 200, 300, 7, 0), gain);
        assertEquals(before, roles.findById(id).orElseThrow());
        assertEquals(revision, roles.revision(id));
    }

    /** 最后一级只写入实际所需经验，赠钻一次；后续到顶发放不重复赠钻或推进版本。 */
    @Test void finalLevelResultMatchesCommittedStateAndOnlyRewardsOnce() {
        String id = player();
        long beforeExperience = rules.threshold(299) - 1;
        jdbc.update("UPDATE game_role SET role_level=299,role_experience=? WHERE id=?", beforeExperience, id);
        var before = roles.findById(id).orElseThrow();
        long revision = roles.revision(id);
        var first = new TransactionTemplate(transactions).execute(status -> experience.credit(id, 100));
        var second = new TransactionTemplate(transactions).execute(status -> experience.credit(id, 100));
        assertEquals(new RoleRules.ExperienceGain(299, beforeExperience, 100, 1, 99, 300, 0, 200), first);
        assertEquals(new RoleRules.ExperienceGain(300, 0, 100, 0, 100, 300, 0, 0), second);
        var after = roles.findById(id).orElseThrow();
        assertEquals(300, after.level());
        assertEquals(0, after.basics().experience());
        assertEquals(before.diamonds() + 200, after.diamonds());
        assertEquals(revision + 1, roles.revision(id));
    }

    /** 升级附赠复用钱包边界，负旧余额与赠钻溢出均回滚已经更新的等级、经验和版本。 */
    @Test void invalidDiamondBalanceAndBonusOverflowRollBackExperience() {
        assertDiamondFailureRollsBack(-1, IllegalStateException.class);
        assertDiamondFailureRollsBack(Long.MAX_VALUE, ArithmeticException.class);
    }

    /**
     * 为指定钱包边界创建独立角色，确认升级失败后完整角色及资产版本保持原值。
     * @param diamonds 发放前的钻石余额，用于模拟负余额或升级附赠加法溢出
     * @param errorType 本边界应由可信入口抛出的异常类型
     */
    private void assertDiamondFailureRollsBack(long diamonds, Class<? extends RuntimeException> errorType) {
        String id = player();
        jdbc.update("UPDATE game_role SET diamonds=? WHERE id=?", diamonds, id);
        var before = roles.findById(id).orElseThrow();
        long revision = roles.revision(id);
        assertThrows(errorType, () -> new TransactionTemplate(transactions).executeWithoutResult(status ->
            experience.credit(id, 120)));
        assertEquals(before, roles.findById(id).orElseThrow());
        assertEquals(revision, roles.revision(id));
    }

    /** 同角色并发奖励由角色锁串行，经验不丢失且跨级钻石只产生一次。 */
    @Test void concurrentIndependentRewardsDoNotLoseExperience() throws Exception {
        String id = player();
        var before = roles.findById(id).orElseThrow();
        long revision = roles.revision(id);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var one = executor.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(status -> experience.credit(id, 120)));
            var two = executor.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(status -> experience.credit(id, 120)));
            one.get(10, java.util.concurrent.TimeUnit.SECONDS);
            two.get(10, java.util.concurrent.TimeUnit.SECONDS);
        }
        var after = roles.findById(id).orElseThrow();
        assertEquals(2, after.level());
        assertEquals(120, after.basics().experience());
        assertEquals(before.diamonds() + 10, after.diamonds());
        assertEquals(revision + 2, roles.revision(id));
    }
}
