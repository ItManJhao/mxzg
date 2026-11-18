/**
 * 独立通关奖励及精英碎片合成的内存库事务检查，正常首战不使用 GM 或播种通关。
 * 单独验证后续配置、材料不足、容量、并发及回执写入失败时的整体回滚。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.MainChapterFirstRewardService;
import com.funsgamex.mxzg.campaign.MainChapterIdleStateRepository;
import com.funsgamex.mxzg.campaign.MainChapterMilestoneService;
import com.funsgamex.mxzg.campaign.MainChapterService;
import com.funsgamex.mxzg.hero.HeroFirstSummonService;
import com.funsgamex.mxzg.hero.HeroFragmentCombineService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationCommandService;
import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:chapter_first_reward_fragment;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.main-chapter.challenge-limit=20",
    "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class MainChapterFirstRewardAndFragmentTest {
    /** 各用例的真实隔离认证入口。 */
    @Autowired private DevelopmentLoginService login;
    /** 正常首战使用首抽的实际英雄实例。 */
    @Autowired private HeroFirstSummonService summon;
    /** 正常保存站位，不直接准备战斗名册。 */
    @Autowired private MainFormationCommandService formations;
    /** 真实挑战、战报与战斗结算。 */
    @Autowired private MainChapterService chapters;
    /** 独立通关奖励的生产入口。 */
    @Autowired private MainChapterFirstRewardService firstRewards;
    /** 与独立通关奖励分开的额外里程碑入口。 */
    @Autowired private MainChapterMilestoneService milestones;
    /** 精英碎片合成的生产入口。 */
    @Autowired private HeroFragmentCombineService fragments;
    /** 登录和断线恢复共用的真实聚合。 */
    @Autowired private SessionSnapshotService snapshots;
    /** 使用原普通库存领域检查当前真实材料数量。 */
    @Autowired private InventoryService inventory;
    /** 播种边界测试时需要原累计时钟。 */
    @Autowired private MainChapterIdleStateRepository idleClock;
    /** 本类独享内存数据库。 */
    @Autowired private JdbcTemplate jdbc;
    /** 测试夹具也遵循角色锁。 */
    @Autowired private RoleRepository roles;
    /** 隔离准备异常数据及前置进度。 */
    @Autowired private PlatformTransactionManager transactions;

    /** 贯穿本批首战、扣料、重试的精英碎片配置。 */
    private static final int TIRUI_FRAGMENT = 20204004;

    /** 内存测试角色和认证凭证，仅用于本类。 */
    private record Player(String role, String token) {}

    /** 新号真实结算30碎片后领取额外装备，再合成真英雄并从原两个键恢复。 */
    @Test
    void freshHeroWinsAndBothIndependentProgressionActionsCommit() throws Exception {
        var player = player();
        assertEquals(List.of(), snapshots.snapshot(player.token()).mainChapter().firstRewardProgress().eligibleChapters());
        var hero = summon.summon(player.token(), id()).actual().heroes().getFirst();
        var current = snapshots.snapshot(player.token());
        formations.save(player.token(), new MainFormationCommandService.Save(id(), current.mainFormation().version(),
                current.mainFormation().formationId(), List.of(new Lineup.Slot(2, hero.instanceId()))));
        var battle = chapters.challenge(player.token(), id());
        assertEquals("ATTACKER_WIN", chapters.replay(player.token(), battle.battleId()).replay().getOutcome());
        var settlement = chapters.claim(player.token(), battle.battleId());
        assertEquals(1, settlement.state().maxCleared());
        assertEquals(30, count(player, TIRUI_FRAGMENT));
        assertEquals(0, count(player, 1001001));
        assertEquals(0, count(player, 1002001));
        assertEquals(List.of(1), settlement.state().firstRewardProgress().eligibleChapters());

        var reward = firstRewards.claim(player.token(), 1);
        assertEquals(1, count(player, 1001001));
        assertEquals(1, count(player, 1002001));
        assertEquals(30, count(player, TIRUI_FRAGMENT));
        assertEquals(List.of(1001001, 1002001), reward.actual().items().stream().map(item -> item.itemId()).toList());
        assertEquals(reward, firstRewards.status(player.token(), 1).receipt());
        assertEquals(reward, firstRewards.claim(player.token(), 1));
        assertEquals(List.of(1), snapshots.snapshot(player.token()).mainChapter().firstRewardProgress().claimedChapters());

        var request = new HeroFragmentCombineService.Request(id(), TIRUI_FRAGMENT, 1);
        var combined = fragments.combine(player.token(), request);
        assertEquals(30, combined.costQuantity());
        assertEquals(0, count(player, TIRUI_FRAGMENT));
        var granted = combined.actual().heroes().getFirst();
        assertEquals(10204004, granted.templateId());
        assertEquals(4, granted.star());
        assertEquals(1, granted.level());
        var latest = snapshots.snapshot(player.token());
        assertEquals(combined.assetRevision(), latest.revision());
        assertEquals(reward.assetRevision() + 1, latest.revision());
        assertEquals(2, latest.heroes().size());
        assertTrue(latest.heroes().stream().anyMatch(entry -> entry.id().equals(granted.instanceId())));
        assertEquals(List.of(), latest.mainChapter().milestoneProgress().claimedIds());
        assertEquals(combined, fragments.combine(player.token(), request));
        assertEquals(combined, fragments.status(player.token(), request.requestId()).receipt());
        assertFalse(firstRewards.status(player().token(), 1).found());
        assertFalse(fragments.status(player().token(), request.requestId()).found());

        var firstWire = GameProtocolCodec.decode(GameProtocolCodec.encode(Map.of("version", 1, "kind", "response",
                "name", "chapter.firstreward.claim", "ok", true, "body", reward)));
        assertEquals(reward.receiptId(), firstWire.path("body").path("receiptId").asString());
        var fragmentWire = GameProtocolCodec.decode(GameProtocolCodec.encode(Map.of("version", 1, "kind", "response",
                "name", "bag.fragment.combine.status", "ok", true, "body", fragments.status(player.token(), request.requestId()))));
        assertEquals(30, fragmentWire.path("body").path("receipt").path("costQuantity").asLong());
        var snapshotWire = GameProtocolCodec.decode(GameProtocolCodec.encode(Map.of("version", 1, "kind", "event",
                "name", "state.changed", "body", latest)));
        assertEquals(1, snapshotWire.path("body").path("mainChapter").path("firstRewardProgress")
                .path("claimedChapters").get(0).asInt());
    }

    /** 原目标按1、5、10、15、20放行，行号2不等于第5关，15关里程碑照常独立发放。 */
    @Test
    void chapterTargetsAndMilestonesRemainIndependent() {
        var player = player();
        assertEquals("FIRST_REWARD_NOT_REACHED", assertThrows(MainChapterFirstRewardService.Rejected.class,
                () -> firstRewards.claim(player.token(), 5)).code());
        assertEquals("FIRST_REWARD_UNKNOWN", assertThrows(MainChapterFirstRewardService.Rejected.class,
                () -> firstRewards.claim(player.token(), 2)).code());
        assertEquals("FIRST_REWARD_UNKNOWN", assertThrows(MainChapterFirstRewardService.Rejected.class,
                () -> firstRewards.claim(player.token(), 25)).code());
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            roles.lock(player.role());
            idleClock.initializeForChallenge(player.role(), Instant.now().getEpochSecond());
            jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,20)", player.role());
        });
        assertEquals(List.of(1, 5, 10, 15, 20), snapshots.snapshot(player.token()).mainChapter()
                .firstRewardProgress().eligibleChapters());
        firstRewards.claim(player.token(), 15);
        assertEquals(30, count(player, 20304004));
        assertEquals(1, milestones.claim(player.token(), 100).actual().heroes().size());
        var snapshot = snapshots.snapshot(player.token());
        assertEquals(List.of(15), snapshot.mainChapter().firstRewardProgress().claimedChapters());
        assertEquals(List.of(100), snapshot.mainChapter().milestoneProgress().claimedIds());
    }

    /** 不足、满容量及非精英碎片均明确拒绝，原资产版本和材料保持一致。 */
    @Test
    void unsupportedInsufficientAndFullRosterDoNotChangeAssets() {
        var player = player();
        var request = new HeroFragmentCombineService.Request(id(), TIRUI_FRAGMENT, 1);
        var initial = snapshots.snapshot(player.token());
        assertEquals("FRAGMENT_INSUFFICIENT", assertThrows(HeroFragmentCombineService.Rejected.class,
                () -> fragments.combine(player.token(), request)).code());
        assertEquals("FRAGMENT_UNSUPPORTED", assertThrows(HeroFragmentCombineService.Rejected.class,
                () -> fragments.combine(player.token(), new HeroFragmentCombineService.Request(id(), 900302, 1))).code());
        assertEquals(initial.revision(), roles.revision(player.role()));

        var hero = summon.summon(player.token(), id());
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            roles.lock(player.role());
            jdbc.update("UPDATE game_role SET hero_capacity=1 WHERE id=?", player.role());
            inventory.credit(player.role(), TIRUI_FRAGMENT, 30);
        });
        long revision = roles.revision(player.role());
        assertEquals("FRAGMENT_CAPACITY_FULL", assertThrows(HeroFragmentCombineService.Rejected.class,
                () -> fragments.combine(player.token(), request)).code());
        assertEquals(revision, roles.revision(player.role()));
        assertEquals(30, count(player, TIRUI_FRAGMENT));
        assertFalse(fragments.status(player.token(), request.requestId()).found());
        assertEquals(hero.actual().heroes().getFirst().instanceId(), snapshots.snapshot(player.token()).heroes().getFirst().id());
    }

    /** 同一业务键并发可回同一批两只，改原参数或换新键也不能重新消费这60片。 */
    @Test
    void parallelCombineReplaysWholeBatchOnce() throws Exception {
        var player = player();
        new TransactionTemplate(transactions).executeWithoutResult(tx -> inventory.credit(player.role(), TIRUI_FRAGMENT, 60));
        long before = snapshots.snapshot(player.token()).revision();
        var request = new HeroFragmentCombineService.Request(id(), TIRUI_FRAGMENT, 2);
        try (var tasks = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = tasks.submit(() -> fragments.combine(player.token(), request));
            var other = tasks.submit(() -> fragments.combine(player.token(), request));
            var original = first.get(10, TimeUnit.SECONDS);
            assertEquals(original, other.get(10, TimeUnit.SECONDS));
            assertEquals(60, original.costQuantity());
            assertEquals(2, original.actual().heroes().size());
        }
        assertEquals("FRAGMENT_REQUEST_CONFLICT", assertThrows(HeroFragmentCombineService.Rejected.class,
                () -> fragments.combine(player.token(), new HeroFragmentCombineService.Request(request.requestId(), TIRUI_FRAGMENT, 1))).code());
        assertEquals("FRAGMENT_INSUFFICIENT", assertThrows(HeroFragmentCombineService.Rejected.class,
                () -> fragments.combine(player.token(), new HeroFragmentCombineService.Request(id(), TIRUI_FRAGMENT, 1))).code());
        assertEquals(0, count(player, TIRUI_FRAGMENT));
        assertEquals(before + 1, roles.revision(player.role()));
        assertEquals(2, snapshots.snapshot(player.token()).heroes().size());
    }

    /** 回执写入故障后验证发装备与三者合成资产均回滚，去除故障后可按原键再领。 */
    @Test
    void receiptWriteFailuresRollBackBothTransactions() {
        var player = player();
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            roles.lock(player.role());
            idleClock.initializeForChallenge(player.role(), Instant.now().getEpochSecond());
            jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,1)", player.role());
            inventory.credit(player.role(), TIRUI_FRAGMENT, 30);
        });
        long revision = snapshots.snapshot(player.token()).revision();
        var request = new HeroFragmentCombineService.Request(id(), TIRUI_FRAGMENT, 1);
        jdbc.execute("ALTER TABLE game_main_chapter_first_reward ADD CONSTRAINT ck_test_reject_chapter CHECK (role_id <> '"
                + player.role() + "')");
        try {
            assertThrows(DataIntegrityViolationException.class, () -> firstRewards.claim(player.token(), 1));
            assertEquals(0, count(player, 1001001));
            assertEquals(0, count(player, 1002001));
            assertFalse(firstRewards.status(player.token(), 1).found());
        } finally {
            jdbc.execute("ALTER TABLE game_main_chapter_first_reward DROP CONSTRAINT ck_test_reject_chapter");
        }
        jdbc.execute("ALTER TABLE game_hero_fragment_combination ADD CONSTRAINT ck_test_reject_fragment CHECK (role_id <> '"
                + player.role() + "')");
        try {
            assertThrows(DataIntegrityViolationException.class, () -> fragments.combine(player.token(), request));
            assertEquals(30, count(player, TIRUI_FRAGMENT));
            assertTrue(snapshots.snapshot(player.token()).heroes().isEmpty());
            assertFalse(fragments.status(player.token(), request.requestId()).found());
            assertEquals(revision, roles.revision(player.role()));
        } finally {
            jdbc.execute("ALTER TABLE game_hero_fragment_combination DROP CONSTRAINT ck_test_reject_fragment");
        }
        assertEquals(revision + 1, firstRewards.claim(player.token(), 1).assetRevision());
        assertEquals(revision + 2, fragments.combine(player.token(), request).assetRevision());
    }

    /** 创建真正的新角色，无默认英雄或自造主线进度。 */
    private Player player() {
        var accepted = login.login("first_reward_" + id().substring(0, 12));
        return new Player(accepted.role().id(), "Bearer " + accepted.session().accessToken());
    }

    /** 读取该角色的指定真实堆叠，缺行按零显示。 */
    private long count(Player player, int itemId) {
        return inventory.find(player.role(), itemId).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 生成互相独立的持久请求编号或测试账号后缀。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
