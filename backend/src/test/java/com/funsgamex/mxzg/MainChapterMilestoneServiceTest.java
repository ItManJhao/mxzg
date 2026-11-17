/**
 * 独立H2验证原3008目标、乱序集合、真实英雄入库、原回执恢复及事务回滚。
 * 所有角色和通关均为本测试明确夹具，不连接日常数据库，也不把播种进度称为真实通关。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.MainChapterIdleStateRepository;
import com.funsgamex.mxzg.campaign.MainChapterMilestoneService;
import com.funsgamex.mxzg.campaign.MainChapterService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:chapter_milestone_service;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.main-chapter.challenge-limit=9"
})
@ActiveProfiles("local")
class MainChapterMilestoneServiceTest {
    /** 真实测试身份入口，不输出凭据。 */
    @Autowired private DevelopmentLoginService login;
    /** 待验的原角色锁事务服务。 */
    @Autowired private MainChapterMilestoneService milestones;
    /** 原主线集合与当前状态查询。 */
    @Autowired private MainChapterService chapters;
    /** 最新统一快照，包含真实新增名册。 */
    @Autowired private SessionSnapshotService snapshots;
    /** 本类独占H2，不使用.local文件库。 */
    @Autowired private JdbcTemplate jdbc;
    /** 测试夹具取得原角色行锁。 */
    @Autowired private RoleRepository roles;
    /** 与原服务共用事务管理器。 */
    @Autowired private PlatformTransactionManager transactions;
    /** 已通关夹具显式创建原累计，读取不能补免费起点。 */
    @Autowired private MainChapterIdleStateRepository idle;
    /** 原统一资产版本，夹具写入同样遵守角色锁事务。 */
    @Autowired private AssetSyncService sync;
    /** 只导出无凭据的真实回执/快照夹具，供两端PB与UI复验。 */
    @Autowired private ObjectMapper mapper;

    /** 测试凭据只保留内存，不写导出事实。 */
    private record Player(String role, String token) {}

    /** 明确准备隔离进度，保留合法正数名册容量，不用当前通关推断已领奖。 */
    private Player player(int maxCleared) {
        var accepted = login.login("milestone_" + UUID.randomUUID().toString().substring(0, 12));
        String role = accepted.role().id();
        var tx = new TransactionTemplate(transactions);
        tx.executeWithoutResult(status -> {
            roles.lock(role);
            jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,?)", role, maxCleared);
            idle.initializeForChallenge(role, Instant.now().getEpochSecond() - 120);
            jdbc.update("UPDATE game_role SET hero_capacity=1 WHERE id=?", role);
            sync.changed(role);
        });
        String token = "Bearer " + accepted.session().accessToken();
        snapshots.snapshot(token);
        return new Player(role, token);
    }

    /** 未达15关明确拒绝，未知ID也拒绝，均不写英雄、已领集合、回执或资产版本。 */
    @Test
    void rejectsBeforeTargetAndUnknownIdWithoutConsumingAnything() {
        var player = player(14);
        long revision = roles.revision(player.role());
        var error = assertThrows(MainChapterMilestoneService.Rejected.class, () -> milestones.claim(player.token(), 100));
        assertEquals("MILESTONE_NOT_REACHED", error.code());
        assertEquals("MILESTONE_UNKNOWN", assertThrows(MainChapterMilestoneService.Rejected.class,
                () -> milestones.claim(player.token(), 999)).code());
        assertEquals(revision, roles.revision(player.role()));
        assertEquals(0, count("game_hero", player));
        assertEquals(0, count("game_main_chapter_milestone", player));
        assertEquals(0, count("game_main_chapter_milestone_receipt", player));
    }

    /** 原英雄奖励真正创建五星一级零阶实例，重复及status始终返回同一份冻结结果。 */
    @Test
    void grantsRealHeroOnceAndExportsActualReceiptWithUnifiedSnapshot() throws Exception {
        var player = player(15);
        long revision = roles.revision(player.role());
        var receipt = milestones.claim(player.token(), 100);
        assertEquals(1, receipt.schemaVersion());
        assertEquals(15, receipt.targetChapter());
        assertEquals(revision + 1, receipt.assetRevision());
        assertEquals(List.of(100), receipt.state().milestoneProgress().claimedIds());
        assertEquals(1, receipt.actual().heroes().size());
        var hero = receipt.actual().heroes().getFirst();
        assertEquals(10105007, hero.templateId());
        assertEquals(1, hero.level());
        assertEquals(5, hero.star());
        assertEquals(0, hero.stage());
        assertEquals(hero.instanceId(), jdbc.queryForObject("SELECT id FROM game_hero WHERE role_id=?", String.class, player.role()));
        assertEquals(1, count("game_hero", player));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_inventory WHERE role_id=? AND item_id=10105007", Integer.class, player.role()));
        assertEquals(receipt, milestones.claim(player.token(), 100));
        assertEquals(receipt, milestones.status(player.token(), 100).receipt());
        assertEquals(receipt.assetRevision(), roles.revision(player.role()));
        var snapshot = snapshots.snapshot(player.token());
        assertEquals(receipt.assetRevision(), snapshot.revision());
        assertEquals(1, count("game_main_chapter_milestone_receipt", player));
        Files.write(Path.of("target/chapter-milestone-claimed.pb"), GameProtocolCodec.encode(Map.of(
                "version", 1, "kind", "response", "name", "chapter.milestone.claim", "ok", true, "body", receipt)));
        Files.write(Path.of("target/chapter-milestone-status.pb"), GameProtocolCodec.encode(Map.of(
                "version", 1, "kind", "response", "name", "chapter.milestone.claim.status", "ok", true,
                "body", milestones.status(player.token(), 100))));
        Files.write(Path.of("target/chapter-milestone-snapshot.pb"), GameProtocolCodec.encode(Map.of(
                "version", 1, "kind", "event", "name", "state.changed", "body", snapshot)));
        Files.writeString(Path.of("target/chapter-milestone-review.json"), mapper.writerWithDefaultPrettyPrinter()
                .writeValueAsString(Map.of("isolatedFixture", true, "database", "memory-only",
                        "progressSeeded", 15, "receipt", receipt, "snapshot", snapshot,
                        "status", milestones.status(player.token(), 100))));
    }

    /** 先领30关配置150再领15关配置100，服务端保持旧非顺序资格与真实集合。 */
    @Test
    void supportsNonSequentialRewardIdsWithoutRequiringPreviousClaims() {
        var player = player(30);
        var later = milestones.claim(player.token(), 150);
        assertEquals(List.of(150), later.state().milestoneProgress().claimedIds());
        assertTrue(later.actual().heroes().isEmpty());
        assertEquals(500, later.actual().items().getFirst().credited());
        var first = milestones.claim(player.token(), 100);
        assertEquals(List.of(100, 150), first.state().milestoneProgress().claimedIds());
        assertEquals(1, count("game_hero", player));
        assertEquals(2, count("game_main_chapter_milestone_receipt", player));
    }

    /** 名册后来成长与资产变化不重算历史新英雄，原成功回执先于当前资格读取。 */
    @Test
    void keepsFrozenHeroAndReceiptAfterLaterStateChanges() {
        var player = player(15);
        var receipt = milestones.claim(player.token(), 100);
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(player.role());
            jdbc.update("UPDATE game_hero SET hero_level=2 WHERE role_id=?", player.role());
            jdbc.update("UPDATE game_main_chapter SET max_cleared=14 WHERE role_id=?", player.role());
            sync.changed(player.role());
        });
        assertEquals(receipt, milestones.claim(player.token(), 100));
        assertEquals(receipt, milestones.status(player.token(), 100).receipt());
        assertEquals(1, receipt.actual().heroes().getFirst().level());
        assertEquals(2, jdbc.queryForObject("SELECT hero_level FROM game_hero WHERE role_id=?", Integer.class, player.role()));
        assertTrue(roles.revision(player.role()) > receipt.assetRevision());
    }

    /** 旧集合已有ID却缺原回执不能伪造历史奖；其他角色查询也不能读取此角色的回执。 */
    @Test
    void missingLegacyReceiptRemainsExplicitAndRoleQueriesStayIsolated() {
        var player = player(15);
        jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,100)", player.role());
        assertFalse(milestones.status(player.token(), 100).found());
        assertEquals("MILESTONE_ALREADY_CLAIMED", assertThrows(MainChapterMilestoneService.Rejected.class,
                () -> milestones.claim(player.token(), 100)).code());
        var other = player(15);
        milestones.claim(other.token(), 100);
        assertFalse(milestones.status(player.token(), 100).found());
        assertEquals(0, count("game_hero", player));
    }

    /** 两个并发请求按原角色锁串行化，仅一个英雄、一个已领项和一份成功回执。 */
    @Test
    void concurrentStableKeysReturnOneOriginalResult() throws Exception {
        var player = player(15);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var a = executor.submit(() -> milestones.claim(player.token(), 100));
            var b = executor.submit(() -> milestones.claim(player.token(), 100));
            assertEquals(a.get(), b.get());
        }
        assertEquals(1, count("game_hero", player));
        assertEquals(1, count("game_main_chapter_milestone", player));
        assertEquals(1, count("game_main_chapter_milestone_receipt", player));
    }

    /** 原名册已满时奖励仍入库，符合旧HeroProcessor，不把召唤或GM容量规则套进3008。 */
    @Test
    void rewardMayExceedRosterDisplayCapacityAsLegacyGrantDid() {
        var player = player(15);
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(player.role());
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10101001,1,1)",
                    UUID.randomUUID().toString(), player.role());
            sync.changed(player.role());
        });
        var receipt = milestones.claim(player.token(), 100);
        assertEquals(1, receipt.actual().heroes().size());
        assertEquals(2, count("game_hero", player));
        assertEquals(1, jdbc.queryForObject("SELECT hero_capacity FROM game_role WHERE id=?", Integer.class, player.role()));
    }

    /** 已有异常大钱包不能在成功提交后才被PB拒绝，须整体回滚新英雄、集合及本次版本。 */
    @Test
    void unsafeHistoricalWalletRejectsBeforeCommittingNewHeroOrCollection() {
        var player = player(15);
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(player.role());
            jdbc.update("UPDATE game_role SET gold=? WHERE id=?", 9_007_199_254_740_992L, player.role());
            sync.changed(player.role());
        });
        long revision = roles.revision(player.role());
        var error = assertThrows(IllegalStateException.class, () -> milestones.claim(player.token(), 100));
        assertTrue(error.getMessage().contains("精确非负整数"));
        assertEquals(revision, roles.revision(player.role()));
        assertEquals(0, count("game_hero", player));
        assertEquals(0, count("game_main_chapter_milestone", player));
        assertEquals(0, count("game_main_chapter_milestone_receipt", player));
    }

    /** 回执最后一步写入失败须回滚英雄、集合和版本；移除故障后同稳定键可真正成功一次。 */
    @Test
    void finalReceiptFailureRollsBackHeroCollectionAndRevision() {
        var player = player(15);
        long revision = roles.revision(player.role());
        String constraint = "test_milestone_" + UUID.randomUUID().toString().replace("-", "");
        jdbc.execute("ALTER TABLE game_main_chapter_milestone_receipt ADD CONSTRAINT " + constraint
                + " CHECK (role_id <> '" + player.role() + "')");
        try {
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                    () -> milestones.claim(player.token(), 100));
            assertEquals(0, count("game_hero", player));
            assertEquals(0, count("game_main_chapter_milestone", player));
            assertEquals(revision, roles.revision(player.role()));
        } finally {
            jdbc.execute("ALTER TABLE game_main_chapter_milestone_receipt DROP CONSTRAINT " + constraint);
        }
        milestones.claim(player.token(), 100);
        assertEquals(1, count("game_hero", player));
    }

    /** 只对本测试固定白名单表计数，数据仍限定到明确测试角色。 */
    private int count(String table, Player player) {
        if (!List.of("game_hero", "game_main_chapter_milestone", "game_main_chapter_milestone_receipt").contains(table)) {
            throw new IllegalArgumentException("不允许的测试表");
        }
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE role_id=?", Integer.class, player.role());
    }
}
