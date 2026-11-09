/** 独立内存库验证角色经验、跨级奖励和事务边界；不调用英雄升级或主线发奖入口。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.role.*;
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
    /** 仅准备满级边界数据。 */
    @Autowired JdbcTemplate jdbc;

    /** 返回全新隔离角色，不借用玩家数据。 */
    private String player() {
        return login.login("exp_" + UUID.randomUUID().toString().substring(0, 12)).role().id();
    }

    /** 普通经验、准确门槛、多级与溢出均沿旧表计算；等级奖励来自离开的等级。 */
    @Test void originalThresholdAndRewardRules() {
        assertEquals(new RoleRules.ExperienceGain(1, 119, 0), rules.addExperience(1, 0, 119));
        assertEquals(new RoleRules.ExperienceGain(2, 0, 10), rules.addExperience(1, 0, 120));
        assertEquals(new RoleRules.ExperienceGain(2, 80, 10), rules.addExperience(1, 0, 200));
        assertEquals(new RoleRules.ExperienceGain(4, 5, 40), rules.addExperience(1, 0, 120 + 360 + 720 + 5));
        assertEquals(new RoleRules.ExperienceGain(300, 0, 200), rules.addExperience(299, rules.threshold(299) - 1, 100));
        assertEquals(new RoleRules.ExperienceGain(300, 7, 0), rules.addExperience(300, 7, 100));
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(1, 0, 0));
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(1, 120, 1));
        assertThrows(IllegalArgumentException.class, () -> rules.addExperience(301, 0, 1));
        assertThrows(ArithmeticException.class, () -> rules.addExperience(1, 1, Long.MAX_VALUE));
    }

    /** 第一关200经验应真正进入角色，升级奖励与两次经验入账共用一次提交版本。 */
    @Test void rewardsShareRoleVersionAndRealExperienceFields() {
        String id = player();
        var before = roles.findById(id).orElseThrow();
        long revision = roles.revision(id);
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            experience.credit(id, 100);
            experience.credit(id, 100);
        });
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

    /** 缺外层事务禁止发放；已满级正常空操作，不增加资产版本。 */
    @Test void requiresTransactionAndIgnoresMaxLevelGain() {
        String id = player();
        assertThrows(org.springframework.transaction.IllegalTransactionStateException.class, () -> experience.credit(id, 200));
        jdbc.update("UPDATE game_role SET role_level=300,role_experience=0 WHERE id=?", id);
        var before = roles.findById(id).orElseThrow();
        long revision = roles.revision(id);
        new TransactionTemplate(transactions).executeWithoutResult(status -> experience.credit(id, 200));
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
