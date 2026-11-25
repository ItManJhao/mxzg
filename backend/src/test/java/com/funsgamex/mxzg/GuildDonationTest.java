/** 在隔离内存库校验公会捐献、宝箱、自然日回执及真实公会动作对任务进度的影响。 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.guild.GuildDonationService;
import com.funsgamex.mxzg.guild.GuildService;
import com.funsgamex.mxzg.quest.QuestService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
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
    "spring.datasource.url=jdbc:h2:mem:guild_donation;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class GuildDonationTest {
    /** 创建本次测试独立角色，不复用常驻服或原有角色数据。 */
    @Autowired private DevelopmentLoginService login;
    /** 通过真实建会及审批准备同会、未入会的测试身份。 */
    @Autowired private GuildService guilds;
    /** 验证三档费用和等级、每日总进度的真实事务。 */
    @Autowired private GuildDonationService donations;
    /** 查询真实公会事务产生的当前任务和成就，未提交或重复操作不得修改进度。 */
    @Autowired private QuestService quests;
    /** 检查钱包到账并核对统一资产版本。 */
    @Autowired private RoleRepository roles;
    /** 隔离测试环境设置钱包、等级及读取堆叠到账。 */
    @Autowired private JdbcTemplate jdbc;
    /** 隔离应用的游戏时钟，用于跨上海零点的重置验证。 */
    @Autowired private GameClock clock;
    /** 模拟上层事务回滚，验证资产、经验与公会贡献均回滚。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 真实扣费、经验结转和跨零点重试，验证回滚和重试不会重复刷新每日进度。 */
    @Test
    void donateOnceAndRollOverWithoutDuplicatingReceipts() {
        String owner = player(20000, 500);
        String guild = create(owner);
        jdbc.update("UPDATE game_guild SET experience=730 WHERE id=?", guild);
        var today = donations.info(owner);
        var first = command(guild, today.resetAt(), 1);
        long revision = roles.revision(owner);

        new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
            assertEquals(50, donations.donate(owner, first).dailyPoints());
            transaction.setRollbackOnly();
        });
        assertEquals(20000, roles.findById(owner).orElseThrow().gold());
        assertEquals(730, donations.info(owner).experience());
        assertEquals(0, donations.info(owner).dailyPoints());
        assertEquals(0, medals(owner));
        assertEquals(0, donationTask(owner));

        var donated = donations.donate(owner, first);
        assertEquals(2, donated.level());
        assertEquals(30, donated.experience());
        assertEquals(1600, donated.nextLevelExperience());
        assertEquals(16, donated.nextCapacity());
        assertEquals(1, donated.donatedTier());
        assertEquals(50, donated.dailyPoints());
        assertEquals(0, roles.findById(owner).orElseThrow().gold());
        assertEquals(100, medals(owner));
        assertEquals(revision + 1, roles.revision(owner));
        assertEquals(donated, donations.donate(owner, first));
        assertEquals(1, donationTask(owner));
        reject("GUILD_DONATION_REQUEST_CONFLICT", () -> donations.donate(owner,
                new GuildDonationService.Command(first.requestId(), guild, today.resetAt(), 2)));
        reject("GUILD_DONATION_ALREADY_DONATED", () -> donations.donate(owner, command(guild, today.resetAt(), 3)));
        reject("GUILD_DONATION_CHEST_LOCKED", () -> donations.claim(owner, command(guild, today.resetAt(), 1)));
        assertEquals(100, medals(owner));

        try {
            clock.setEpochSeconds(today.resetAt() + 1);
            var tomorrow = donations.info(owner);
            assertEquals(today.resetAt() + 86400, tomorrow.resetAt());
            assertEquals(0, tomorrow.dailyPoints());
            assertEquals(0, tomorrow.donatedTier());
            assertEquals(0, donations.donate(owner, first).dailyPoints());
            assertEquals(0, donationTask(owner));
            reject("GUILD_DONATION_RESET", () -> donations.donate(owner, command(guild, today.resetAt(), 3)));
            assertEquals(200, donations.donate(owner, command(guild, tomorrow.resetAt(), 3)).dailyPoints());
            assertEquals(100, roles.findById(owner).orElseThrow().diamonds());
            assertEquals(900, medals(owner));
        } finally {
            clock.reset();
        }
    }

    /** 捐献点数为全员共享，只有正式入会的申请者才收到其个人入会成就进度。 */
    @Test
    void groupChestUsesCommittedTotalAndOneClaimPerPerson() {
        String owner = player(0, 1000);
        String guild = create(owner);
        String visitor = player(0, 500);
        long resetAt = donations.info(owner).resetAt();
        reject("GUILD_NOT_MEMBER", () -> donations.info(visitor));
        reject("GUILD_NOT_MEMBER", () -> donations.claim(visitor, command(guild, resetAt, 1)));
        for (int i = 1; i <= 5; i++) {
            String donor = player(0, 400);
            guilds.change(donor, change(GuildService.Action.APPLY, guild, null, null));
            assertEquals(0, joinAchievement(donor));
            guilds.change(owner, change(GuildService.Action.APPROVE, guild, donor, null));
            assertEquals(1, joinAchievement(donor));
            var donated = donations.donate(donor, command(guild, resetAt, 3));
            assertEquals(i * 200, donated.dailyPoints());
            assertEquals(800, medals(donor));
        }
        var before = donations.info(owner);
        assertEquals(0, before.donatedTier());
        assertEquals(1000, before.dailyPoints());
        assertFalse(before.chests().getFirst().claimed());
        var claim = command(guild, resetAt, 1);
        assertTrue(donations.claim(owner, claim).chests().getFirst().claimed());
        assertTrue(donations.claim(owner, claim).chests().getFirst().claimed());
        assertEquals(50, medals(owner));
        assertEquals(10000, roles.findById(owner).orElseThrow().gold());
        reject("GUILD_DONATION_CHEST_CLAIMED", () -> donations.claim(owner, command(guild, resetAt, 1)));
        reject("GUILD_DONATION_CHEST_LOCKED", () -> donations.claim(owner, command(guild, resetAt, 2)));
        reject("GUILD_DONATION_INSUFFICIENT", () -> donations.donate(owner, command(guild, resetAt, 1)));
        assertEquals(1000, donations.info(owner).dailyPoints());
    }

    /** 读取玩家当前上海日自己的公会捐献任务。 */
    private long donationTask(String role) {
        return quests.snapshot(role).daily().stream().filter(task -> task.id() == 8).findFirst().orElseThrow().current();
    }

    /** 读取申请者入会成就，验证审批结果不会落在会长名下。 */
    private long joinAchievement(String role) {
        return quests.snapshot(role).achievements().stream()
                .filter(task -> task.id() == 104100).findFirst().orElseThrow().current();
    }

    /** 让角色通过真实开发登录建档，再在隔离库准备捐献可用的余额。 */
    private String player(long gold, long diamonds) {
        String account = "donation_" + UUID.randomUUID().toString().substring(0, 16);
        String id = login.login(account, "local-1").role().id();
        jdbc.update("UPDATE game_role SET role_level=30,gold=?,diamonds=?,first_named=TRUE WHERE id=?", gold, diamonds, id);
        return id;
    }

    /** 通过正式公会入口建会，返回以角色真实归属保存的公会 ID。 */
    private String create(String owner) {
        return guilds.change(owner, change(GuildService.Action.CREATE, null, null,
                "捐献" + UUID.randomUUID().toString().substring(0, 8))).guild().id();
    }

    /** 根据本次展示的公会和截止秒生成独立捐献命令。 */
    private GuildDonationService.Command command(String guild, long resetAt, int optionId) {
        return new GuildDonationService.Command(UUID.randomUUID().toString(), guild, resetAt, optionId);
    }

    /** 生成成员场景的独立公会申请、审批或创建命令。 */
    private GuildService.Command change(GuildService.Action action, String guild, String role, String name) {
        return new GuildService.Command(UUID.randomUUID().toString(), action, guild, role, name, null);
    }

    /** 从同一持久堆叠读出商店可实际消费的 901301 余额。 */
    private long medals(String role) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(quantity),0) FROM game_inventory WHERE role_id=? AND item_id=901301",
                Long.class, role);
    }

    /** 任何业务拒绝都应带上约定的真实错误码。 */
    private void reject(String code, Runnable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action::run).getReason());
    }
}
