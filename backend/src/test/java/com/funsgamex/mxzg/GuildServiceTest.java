/** 隔离数据库验证公会授权、徽章、角色归属、幂等扣费、冷却及并发容量。 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.guild.GuildService;
import com.funsgamex.mxzg.guild.GuildService.Action;
import com.funsgamex.mxzg.guild.GuildService.Command;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:guild_membership;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class GuildServiceTest {
    /** 由真实的开发登录创建互不干扰的测试角色。 */
    @Autowired private DevelopmentLoginService login;
    /** 统一写入口与成员快照。 */
    @Autowired private GuildService guilds;
    /** 检查持久钱包扣费、角色版本以及未意外写入的资产。 */
    @Autowired private RoleRepository roles;
    /** 准备隔离测试角色等级、钻石和冷却条件。 */
    @Autowired private JdbcTemplate jdbc;
    /** 测试独立回滚时复用实际事务管理。 */
    @Autowired private PlatformTransactionManager transactions;
    /** 调整隔离测试服统一时钟，验证退会期限。 */
    @Autowired private GameClock clock;

    /** 同名按区隔离、建会恰好扣 100 钻，重复确认只读当前状态，更换参数拒绝。 */
    @Test
    void createIsAtomicAndIdempotent() {
        String owner = player("local-1", 17, 100);
        String name = "公会" + UUID.randomUUID().toString().substring(0, 8);
        var create = command(Action.CREATE, null, null, name);
        reject("GUILD_LOCKED", () -> guilds.list(owner, "", 1));
        reject("GUILD_LOCKED", () -> guilds.change(owner, create));
        prepare(owner, 18, 99);
        reject("GUILD_INSUFFICIENT", () -> guilds.change(owner, create));
        assertTrue(guilds.list(owner, name, 1).guilds().isEmpty());
        prepare(owner, 18, 100);
        long before = roles.revision(owner);
        var created = guilds.change(owner, create);
        assertEquals(64, created.nameLimit());
        assertEquals(18, created.levelRequired());
        assertEquals(100, created.createCostDiamonds());
        assertEquals(15, created.guild().capacity());
        assertEquals(name, guilds.nameForRole(owner));
        assertEquals(1, created.members().size());
        assertTrue(created.members().getFirst().leader());
        assertEquals(0, roles.findById(owner).orElseThrow().diamonds());
        assertEquals(before + 1, roles.revision(owner));
        assertEquals(created, guilds.change(owner, create));
        reject("GUILD_REQUEST_CONFLICT", () -> guilds.change(owner,
            new Command(create.requestId(), Action.CREATE, null, null, "另一个公会", null)));

        String duplicate = player("local-1", 18, 100);
        reject("GUILD_NAME_TAKEN", () -> guilds.change(duplicate, create));
        assertEquals(100, roles.findById(duplicate).orElseThrow().diamonds());
        String foreign = player("local-2", 18, 100);
        assertTrue(guilds.list(foreign, name, 1).guilds().isEmpty());
        reject("GUILD_NOT_FOUND", () -> guilds.change(foreign,
            command(Action.APPLY, created.guild().id(), null, null)));
        assertEquals(name, guilds.change(foreign, create).guild().name());
    }

    /** 兼容旧建会命令及显式默认徽章，越界或重用编号改徽章都不改变钱包和公会。 */
    @Test
    void badgeValidationPreservesLegacyCreateAndRetry() {
        String owner = player("local-1", 18, 200);
        String name = "公会" + UUID.randomUUID().toString().substring(0, 8);
        var legacy = command(Action.CREATE, null, null, name);
        for (int invalidBadge : List.of(-1, 44)) {
            reject("GUILD_REQUEST_INVALID", () -> guilds.change(owner,
                new Command(legacy.requestId(), Action.CREATE, null, null, name, null, invalidBadge)));
        }
        assertEquals(200, roles.findById(owner).orElseThrow().diamonds());
        assertNull(guilds.list(owner, "", 1).guild());

        var created = guilds.change(owner, legacy);
        assertEquals(0, created.guild().badgeId());
        assertEquals(created, guilds.change(owner,
            new Command(legacy.requestId(), Action.CREATE, null, null, name, null, 0)));
        reject("GUILD_REQUEST_CONFLICT", () -> guilds.change(owner,
            new Command(legacy.requestId(), Action.CREATE, null, null, name, null, 43)));
        assertEquals(0, guilds.list(owner, "", 1).guild().badgeId());
        assertEquals(100, roles.findById(owner).orElseThrow().diamonds());
    }

    /** 日服长度使用 64 个显示字符单位，Latin-1 计一，汉字计二。 */
    @Test
    void validatesConfiguredDisplayedNameLength() {
        String ascii = player("local-1", 18, 100);
        String asciiName = "A".repeat(64);
        reject("GUILD_NAME_INVALID", () -> guilds.change(ascii, command(Action.CREATE, null, null, asciiName + "A")));
        assertEquals(asciiName, guilds.change(ascii, command(Action.CREATE, null, null, asciiName)).guild().name());
        String cjk = player("local-1", 18, 100);
        String cjkName = "花".repeat(32);
        reject("GUILD_NAME_INVALID", () -> guilds.change(cjk, command(Action.CREATE, null, null, cjkName + "花")));
        assertEquals(cjkName, guilds.change(cjk, command(Action.CREATE, null, null, cjkName)).guild().name());
    }

    /** 双角色申请、审批、退出，其他公会的申请随入会删除，失败操作不会修改成员。 */
    @Test
    void applicationPermissionAndLeaveArePersisted() {
        String owner = player("local-1", 18, 200);
        String nextOwner = player("local-1", 18, 100);
        String applicant = player("local-1", 18, 100);
        String secondApplicant = player("local-1", 18, 100);
        var first = createGuild(owner);
        var second = createGuild(nextOwner);
        var firstApply = command(Action.APPLY, first.id(), null, null);
        var applied = guilds.change(applicant, firstApply);
        assertEquals(List.of(first.id()), applied.appliedGuildIds());
        assertEquals(applied, guilds.change(applicant, firstApply));
        guilds.change(applicant, command(Action.APPLY, second.id(), null, null));
        guilds.change(secondApplicant, command(Action.APPLY, first.id(), null, null));
        assertEquals(2, guilds.list(owner, "", 1).applications().size());
        var approve = command(Action.APPROVE, first.id(), applicant, null);
        assertEquals(2, guilds.change(owner, approve).guild().memberCount());
        assertEquals(2, guilds.change(owner, approve).guild().memberCount());
        assertEquals(first.name(), guilds.nameForRole(applicant));
        assertTrue(guilds.list(applicant, "", 1).applications().isEmpty());
        assertTrue(guilds.list(nextOwner, "", 1).applications().isEmpty());
        reject("GUILD_FORBIDDEN", () -> guilds.change(applicant,
            command(Action.APPROVE, first.id(), secondApplicant, null)));
        var reject = command(Action.REJECT, first.id(), secondApplicant, null);
        assertTrue(guilds.change(owner, reject).applications().isEmpty());
        assertTrue(guilds.list(secondApplicant, "", 1).appliedGuildIds().isEmpty());
        reject("GUILD_LEADER_CANNOT_LEAVE", () -> guilds.change(owner,
            command(Action.LEAVE, first.id(), null, null)));

        var leave = command(Action.LEAVE, first.id(), null, null);
        long now = clock.epochSeconds();
        var left = guilds.change(applicant, leave);
        assertNull(left.guild());
        assertEquals("", guilds.nameForRole(applicant));
        assertTrue(left.rejoinAtSeconds() >= now + 7200);
        assertEquals(left, guilds.change(applicant, leave));
        reject("GUILD_COOLDOWN", () -> guilds.change(applicant, firstApplyWithNewId(first)));
        try {
            clock.setEpochSeconds(left.rejoinAtSeconds() + 1);
            assertFalse(guilds.change(applicant, firstApplyWithNewId(first)).appliedGuildIds().isEmpty());
        } finally {
            clock.reset();
        }
        assertNull(guilds.change(owner, command(Action.LEAVE, first.id(), null, null)).guild());
        assertTrue(guilds.list(applicant, first.name(), 1).guilds().isEmpty());
        assertFalse(guilds.list(applicant, "", 1).appliedGuildIds().contains(first.id()));
    }

    /** 创建与加入中的持久写入同事务回滚，原请求编号在回滚后可继续确认。 */
    @Test
    void rollsBackMembershipCostAndCommandTogether() {
        String owner = player("local-1", 18, 100);
        String name = "公会" + UUID.randomUUID().toString().substring(0, 12);
        var create = command(Action.CREATE, null, null, name);
        long before = roles.revision(owner);
        new TransactionTemplate(transactions).executeWithoutResult(transaction -> {
            assertNotNull(guilds.change(owner, create).guild());
            transaction.setRollbackOnly();
        });
        assertEquals("", guilds.nameForRole(owner));
        assertEquals(before, roles.revision(owner));
        assertEquals(100, roles.findById(owner).orElseThrow().diamonds());
        assertEquals(name, guilds.change(owner, create).guild().name());
    }

    /** 两个公会竞争同一申请者时最多批准一笔，所有其余申请被清理。 */
    @Test
    void concurrentApprovalsProduceOneMembership() throws Exception {
        String ownerA = player("local-1", 18, 100);
        String ownerB = player("local-1", 18, 100);
        String applicant = player("local-1", 18, 100);
        var guildA = createGuild(ownerA);
        var guildB = createGuild(ownerB);
        guilds.change(applicant, firstApplyWithNewId(guildA));
        guilds.change(applicant, firstApplyWithNewId(guildB));
        var ready = new CountDownLatch(1);
        try (var threads = Executors.newFixedThreadPool(2)) {
            var first = threads.submit(() -> concurrentApprove(ready, ownerA, guildA.id(), applicant));
            var second = threads.submit(() -> concurrentApprove(ready, ownerB, guildB.id(), applicant));
            ready.countDown();
            assertEquals(List.of("GUILD_APPLICATION_MISSING", "approved"),
                List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)).stream().sorted().toList());
        }
        var membership = guilds.list(applicant, "", 1).guild();
        assertTrue(List.of(guildA.id(), guildB.id()).contains(membership.id()));
        assertTrue(guilds.list(ownerA, "", 1).applications().isEmpty());
        assertTrue(guilds.list(ownerB, "", 1).applications().isEmpty());
    }

    /** 默认推荐以空位优先，审批和待审仍以服务端容量为准。 */
    @Test
    void browseAndReviewRespectGuildCapacity() {
        String owner = player("local-1", 18, 100);
        var guild = createGuild(owner);
        String waiting = player("local-1", 18, 0);
        guilds.change(waiting, firstApplyWithNewId(guild));
        for (int i = 1; i < guild.capacity(); i++) {
            String applicant = player("local-1", 18, 0);
            guilds.change(applicant, firstApplyWithNewId(guild));
            guilds.change(owner, command(Action.APPROVE, guild.id(), applicant, null));
        }
        assertEquals(guild.capacity(), guilds.list(owner, "", 1).guild().memberCount());
        reject("GUILD_FULL", () -> guilds.change(owner, command(Action.APPROVE, guild.id(), waiting, null)));
        assertEquals(List.of(waiting), guilds.list(owner, "", 1).applications().stream().map(GuildService.Member::id).toList());
        String outsider = player("local-1", 18, 0);
        reject("GUILD_FULL", () -> guilds.change(outsider, firstApplyWithNewId(guild)));

        String search = UUID.randomUUID().toString().substring(0, 10);
        for (int i = 0; i <= 10; i++) {
            String other = player("local-1", 18, 100);
            guilds.change(other, command(Action.CREATE, null, null, search + i));
        }
        var page1 = guilds.list(outsider, search, 1);
        var page2 = guilds.list(outsider, search, 2);
        assertEquals(10, page1.guilds().size());
        assertTrue(page1.hasMore());
        assertEquals(1, page2.guilds().size());
        assertFalse(page2.hasMore());
        assertFalse(page1.guilds().contains(page2.guilds().getFirst()));
        assertFalse(guilds.list(outsider, "", 1).guilds().stream().anyMatch(row -> row.id().equals(guild.id())));
    }

    /** 通过各真实审批事务竞争同一角色，返回已确认的业务结果。 */
    private String concurrentApprove(CountDownLatch ready, String owner, String guild, String applicant)
            throws InterruptedException {
        assertTrue(ready.await(10, TimeUnit.SECONDS));
        try {
            guilds.change(owner, command(Action.APPROVE, guild, applicant, null));
            return "approved";
        } catch (ResponseStatusException failure) {
            return failure.getReason();
        }
    }

    /** 创建使用短前缀的新角色，所有账户数据只写入当前隔离数据库。 */
    private String player(String serverId, int level, long diamonds) {
        String roleId = login.login("guild_" + UUID.randomUUID().toString().substring(0, 12), serverId).role().id();
        prepare(roleId, level, diamonds);
        return roleId;
    }

    /** 给当前测试角色设置场景所需的等级与余额。 */
    private void prepare(String roleId, int level, long diamonds) {
        jdbc.update("UPDATE game_role SET role_level=?,diamonds=? WHERE id=?", level, diamonds, roleId);
    }

    /** 用真实创建命令产生便于区分的测试公会。 */
    private GuildService.Summary createGuild(String owner) {
        return guilds.change(owner,
            command(Action.CREATE, null, null, "公会" + UUID.randomUUID().toString().substring(0, 12))).guild();
    }

    /** 使用新请求号申请，确保实际执行服务器资格校验。 */
    private static Command firstApplyWithNewId(GuildService.Summary guild) {
        return command(Action.APPLY, guild.id(), null, null);
    }

    /** 为该操作生成可持久重放的请求编号。 */
    private static Command command(Action action, String guild, String applicant, String name) {
        return new Command(UUID.randomUUID().toString(), action, guild, applicant, name, null);
    }

    /** 验证调用失败且返回明确业务原因。 */
    private static void reject(String reason, Runnable action) {
        assertEquals(reason, assertThrows(ResponseStatusException.class, action::run).getReason());
    }
}
