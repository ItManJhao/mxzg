/**
 * 独立H2验证真实战斗持久化、回执幂等、失败回滚和权威里程碑已领集合。
 * 使用角色锁及真实事务准备隔离数据，不连接日常数据库，不开放里程碑领取等未恢复玩法。
 */
package com.funsgamex.mxzg;

import java.util.*;
import java.util.concurrent.*;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.*;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.*;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.network.AssetSyncService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "mxzg.main-chapter.challenge-limit=3",
    "spring.datasource.url=jdbc:h2:mem:main_chapter_persist;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class MainChapterPersistenceTest {
    /** 创建独立测试角色。 */
    @Autowired DevelopmentLoginService login;
    /** 本批真实持久挑战/领奖入口。 */
    @Autowired MainChapterService chapters;
    /** 真实阵容保存，测试不绕过归属检查。 */
    @Autowired MainFormationCommandService formations;
    /** 检查角色资产版本。 */
    @Autowired RoleRepository roles;
    /** 比较奖励库存。 */
    @Autowired InventoryService inventory;
    /** 隔离库的夹具和故障注入。 */
    @Autowired JdbcTemplate jdbc;
    /** 验证外层事务回滚。 */
    @Autowired PlatformTransactionManager transactions;
    /** 仅给隔离测试准备的持久事实登记统一版本，不提供或模拟玩家里程碑领取接口。 */
    @Autowired AssetSyncService sync;

    /** 测试角色及持久英雄；token不写入日志。 */
    private record Player(String id, String token, String hero) {}

    /** 强队用旧魅惑之拥真实配置；弱队保留一级独眼梦魇，不伪造战斗结果。 */
    private Player player(boolean strong) {
        var session = login.login("main_" + UUID.randomUUID().toString().substring(0, 12));
        String role = session.role().id();
        String token = "Bearer " + session.session().accessToken();
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,?)",
            hero, role, strong ? 10105011 : 10101001, strong ? 100 : 1, strong ? 9 : 1, strong ? 3 : 0);
        long version = jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id=?", Long.class, role);
        formations.save(token, new MainFormationCommandService.Save(UUID.randomUUID().toString(), version, 1,
            List.of(new Lineup.Slot(2, hero))));
        return new Player(role, token, hero);
    }

    /** 冰晶女巫使用已通关且具有既有时钟的真实夹具，治疗及冻结名称不因结算/改名重写。 */
    @Test void healingReplayPersistsThroughSettlement() throws Exception {
        var player = player(false);
        jdbc.update("UPDATE game_hero SET template_id=10203003,hero_level=1,star=3 WHERE id=?", player.hero());
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,1)", player.id());
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,?)",
                player.id(), java.time.Instant.now().getEpochSecond() - 60);
        var receipt = chapters.challenge(player.token(), id());
        var replay = chapters.replay(player.token(), receipt.battleId()).replay();
        var heals = replay.getPhasesList().stream().flatMap(phase -> phase.getEventsList().stream())
            .filter(event -> event.getKind().equals("recovery")).toList();
        assertFalse(heals.isEmpty());
        assertTrue(heals.stream().anyMatch(event -> event.getReportedHpChange() > 0));
        assertTrue(heals.stream().anyMatch(event -> event.getActualHpChange() > 0));
        assertEquals(roles.findById(player.id()).orElseThrow().nickname(), replay.getAttackerName());
        assertEquals("羽嘉森林2", replay.getDefenderName());
        assertEquals(heals.stream().mapToLong(event -> event.getReportedHpChange()).sum(),
            replay.getUnits(0).getTotalRecovery());
        java.nio.file.Files.createDirectories(java.nio.file.Path.of("../client/temp/healing-review"));
        java.nio.file.Files.write(java.nio.file.Path.of("../client/temp/healing-review/replay.bin"), replay.toByteArray());
        System.out.println("HEALING_REVIEW " + replay.getOutcome() + " rounds=" + replay.getRounds()
            + " healing=" + heals.stream().map(event -> event.getActualHpChange() + "/" + event.getReportedHpChange()).toList());
        var claim = chapters.claim(player.token(), receipt.battleId());
        var role = roles.findById(player.id()).orElseThrow();
        assertEquals(claim, chapters.claim(player.token(), receipt.battleId()));
        assertEquals(role, roles.findById(player.id()).orElseThrow());
        // 仅独立测试库改名，验证回看仍保留开战姓名；不开放改名玩法。
        jdbc.update("UPDATE game_role SET nickname=? WHERE id=?", "结算后改名", player.id());
        assertEquals(replay, chapters.replay(player.token(), receipt.battleId()).replay());
    }

    /** 每次新操作使用新ID；重试由测试显式保留原ID。 */
    private static String id() { return UUID.randomUUID().toString(); }

    /** 已同步空集合来自真实表查询；重复读取不创建主线/里程碑记录，也不增加版本或改钱包。 */
    @Test void milestoneEmptyProgressIsExplicitAndReadOnlyEvenBeforeFirstChapter() {
        var p = player(true);
        var role = roles.findById(p.id()).orElseThrow();
        long revision = roles.revision(p.id());
        var first = chapters.current(p.token());
        assertEquals(0, first.maxCleared());
        assertNotNull(first.milestoneProgress());
        assertEquals(1, first.milestoneProgress().schemaVersion());
        assertTrue(first.milestoneProgress().claimedIds().isEmpty());
        assertEquals(first, chapters.current(p.token()));
        assertEquals(revision, roles.revision(p.id()));
        assertEquals(role, roles.findById(p.id()).orElseThrow());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter WHERE role_id=?", Integer.class, p.id()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_milestone WHERE role_id=?", Integer.class, p.id()));
        assertThrows(UnsupportedOperationException.class, () -> first.milestoneProgress().claimedIds().add(1));
    }

    /** 乱序/非连续已领ID按真实集合冻结；主键与正数/FK约束拒绝坏记录，不从通关数裁剪或补齐。 */
    @Test void milestoneSetIsSortedIsolatedAndProtectedByPersistentConstraints() {
        var p = player(true);
        var other = player(true);
        long before = roles.revision(p.id());
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(p.id());
            jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,?)", p.id(), 7);
            jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,?)", p.id(), 2);
            sync.changed(p.id());
        });
        var current = chapters.current(p.token());
        assertEquals(0, current.maxCleared(), "只读投影不拿通关数猜测或裁剪真实已领集合");
        assertEquals(List.of(2, 7), current.milestoneProgress().claimedIds());
        assertEquals(before + 1, roles.revision(p.id()));
        assertTrue(chapters.current(other.token()).milestoneProgress().claimedIds().isEmpty());
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,?)", p.id(), 2));
        for (int invalid : List.of(0, -1)) {
            assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                    jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,?)", p.id(), invalid));
        }
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,?)", id(), 1));
        assertEquals(current, chapters.current(p.token()));
        assertEquals(before + 1, roles.revision(p.id()), "查询及失败记录均不能推进统一版本");
    }

    /** 新回执保存当时集合；后续真实集合改变和旧回执缺字段都不能重写历史或污染当前集合。 */
    @Test void milestoneReceiptFreezesHistoryAndLegacyMissingFieldRemainsUnknown() {
        var p = player(true);
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(p.id());
            jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,?)", p.id(), 5);
            sync.changed(p.id());
        });
        var battle = chapters.challenge(p.token(), id());
        var receipt = chapters.claim(p.token(), battle.battleId());
        assertEquals(List.of(5), receipt.state().milestoneProgress().claimedIds());
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            roles.lock(p.id());
            jdbc.update("INSERT INTO game_main_chapter_milestone(role_id,reward_id) VALUES (?,?)", p.id(), 2);
            sync.changed(p.id());
        });
        assertEquals(List.of(2, 5), chapters.current(p.token()).milestoneProgress().claimedIds());
        assertEquals(receipt, chapters.claim(p.token(), battle.battleId()), "重放冻结回执不借新集合改写历史");
        var mapper = new tools.jackson.databind.ObjectMapper();
        String stored = jdbc.queryForObject("SELECT settlement_json FROM game_main_chapter_battle WHERE id=?",
                String.class, battle.battleId());
        var old = (tools.jackson.databind.node.ObjectNode) mapper.readTree(stored);
        ((tools.jackson.databind.node.ObjectNode) old.path("state")).remove("milestoneProgress");
        jdbc.update("UPDATE game_main_chapter_battle SET settlement_json=? WHERE id=?",
                mapper.writeValueAsString(old), battle.battleId());
        var beforeRole = roles.findById(p.id()).orElseThrow();
        long beforeRevision = roles.revision(p.id());
        var legacy = chapters.claim(p.token(), battle.battleId());
        assertNull(legacy.state().milestoneProgress(), "旧历史字段缺失保持未知，不反查当前集合或默认未领");
        assertEquals(List.of(2, 5), chapters.current(p.token()).milestoneProgress().claimedIds());
        assertEquals(beforeRole, roles.findById(p.id()).orElseThrow());
        assertEquals(beforeRevision, roles.revision(p.id()));
    }

    /** 构造投影先校验并复制集合，外部变化、重复ID和未知格式不能进入历史回执。 */
    @Test void milestoneProjectionRejectsInvalidFormatsAndFreezesCallerList() {
        var ids = new ArrayList<>(List.of(2, 7));
        var progress = new MainChapterService.MilestoneProgress(1, ids);
        ids.add(5);
        assertEquals(List.of(2, 7), progress.claimedIds());
        assertThrows(UnsupportedOperationException.class, () -> progress.claimedIds().clear());
        assertThrows(IllegalArgumentException.class, () -> new MainChapterService.MilestoneProgress(2, List.of()));
        assertThrows(IllegalArgumentException.class, () -> new MainChapterService.MilestoneProgress(1, null));
        assertThrows(IllegalArgumentException.class, () -> new MainChapterService.MilestoneProgress(1, List.of(0)));
        assertThrows(IllegalArgumentException.class, () -> new MainChapterService.MilestoneProgress(1, List.of(2, 2)));
    }

    /** 延后首场挑战仍累计创角以来的时间；三关结算与重试均保留初始挂机起点和原经验回执。 */
    @Test void threeRealBattlesPersistAndSettleExactlyOnce() {
        var p = player(true);
        jdbc.update("UPDATE game_role SET created_at_seconds=created_at_seconds-1800 WHERE id=?", p.id());
        var initialRole = roles.findById(p.id()).orElseThrow();
        long revision = roles.revision(p.id());
        String firstRequest = id();
        MainChapterService.Receipt first = null;
        MainChapterService.Receipt firstClaim = null;
        for (int mission = 1; mission <= 3; mission++) {
            var before = roles.findById(p.id()).orElseThrow();
            var request = mission == 1 ? firstRequest : id();
            var result = chapters.challenge(p.token(), request);
            if (first == null) { first = result; }
            assertEquals(MainChapterService.Action.BATTLE, result.action());
            assertEquals(mission, result.state().maxCleared());
            assertEquals(initialRole.basics().createdAtSeconds() - 60, jdbc.queryForObject(
                    "SELECT started_at FROM game_main_chapter_idle WHERE role_id=?", Long.class, p.id()),
                    "首次挑战及后续重试都应保留创角以来的半小时和原配置预置的一分钟");
            assertEquals(result.battleId(), result.state().pendingBattleId());
            assertEquals(before, roles.findById(p.id()).orElseThrow());
            assertEquals(result, chapters.challenge(p.token(), request));
            var battle = chapters.replay(p.token(), result.battleId());
            assertEquals("ATTACKER_WIN", battle.replay().getOutcome());
            assertEquals("chapter:lineup:" + mission, battle.replay().getScenario());
            assertFalse(battle.details().pending().isEmpty());
            var claimed = chapters.claim(p.token(), result.battleId());
            if (firstClaim == null) {
                firstClaim = claimed;
            }
            assertEquals(mission, claimed.state().maxCleared());
            assertNull(claimed.state().pendingBattleId());
            assertFalse(claimed.rewards().isEmpty());
            assertNotNull(claimed.actual(), "新结算必须冻结完整实际明细，不丢弃升级附赠");
            assertEquals(p.id(), claimed.actual().roleId());
            assertEquals(claimed.rewards(), claimed.actual().items().stream().filter(item -> item.credited() > 0)
                    .map(item -> new MainChapterRules.Reward(item.itemId(), item.credited())).toList());
            assertTrue(claimed.actual().bonuses().stream().allMatch(bonus ->
                    bonus.source() == com.funsgamex.mxzg.reward.RewardGrantResult.BonusSource.ROLE_LEVEL_UP
                        && bonus.itemId() == 900002));
            assertEquals(claimed, chapters.claim(p.token(), result.battleId()));
        }
        var after = roles.findById(p.id()).orElseThrow();
        assertEquals(initialRole.gold() + 12200, after.gold());
        assertEquals(initialRole.diamonds() + 171, after.diamonds());
        assertEquals(3, after.level());
        assertEquals(120, after.basics().experience());
        assertEquals(revision + 6, roles.revision(p.id()));
        assertEquals(first, chapters.challenge(p.token(), firstRequest));
        assertEquals(firstClaim, chapters.claim(p.token(), firstClaim.battleId()));
        assertEquals(3, chapters.current(p.token()).maxCleared());
        assertThrows(IllegalArgumentException.class, () -> chapters.challenge(p.token(), id()));
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_battle WHERE role_id=?", Integer.class, p.id()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_campaign WHERE role_id=?", Integer.class, p.id()));
    }

    /** 升级前保存的旧回执没有experience；重试应保持缺失且不再次发奖或伪造前置经验。 */
    @Test void legacyReceiptDoesNotInventExperience() {
        var p = player(true);
        var battle = chapters.challenge(p.token(), id());
        var claimed = chapters.claim(p.token(), battle.battleId());
        var mapper = new tools.jackson.databind.ObjectMapper();
        String stored = jdbc.queryForObject("SELECT settlement_json FROM game_main_chapter_battle WHERE id=?",
            String.class, battle.battleId());
        var old = (tools.jackson.databind.node.ObjectNode) mapper.readTree(stored);
        old.remove("experience");
        old.remove("actual");
        jdbc.update("UPDATE game_main_chapter_battle SET settlement_json=? WHERE id=?",
            mapper.writeValueAsString(old), battle.battleId());
        var roleBefore = roles.findById(p.id()).orElseThrow();
        var receipt = chapters.claim(p.token(), battle.battleId());
        assertNull(receipt.experience());
        assertNull(receipt.actual(), "旧回执不得按当前等级或钱包差补造升级附赠");
        assertEquals(claimed.rewards(), receipt.rewards());
        assertEquals(roleBefore, roles.findById(p.id()).orElseThrow());
    }

    /** 已提交主线结果保存真实升级赠钻；后续资产变化或冷会话恢复不能重发、重算或混入额外里程碑奖励。 */
    @Test void levelUpBonusesRemainFrozenAcrossReloginAndReplay() {
        var p = player(true);
        var battle = chapters.challenge(p.token(), id());
        // 第一关200经验足以让当前1级角色升级到2级，旧角色升级规则真实赠送10钻。
        var receipt = chapters.claim(p.token(), battle.battleId());
        assertEquals(1, receipt.actual().bonuses().size());
        assertEquals(new com.funsgamex.mxzg.reward.RewardGrantResult.Bonus(
                com.funsgamex.mxzg.reward.RewardGrantResult.BonusSource.ROLE_LEVEL_UP, 900002, 10),
                receipt.actual().bonuses().getFirst());
        assertEquals(1, receipt.actual().experience().size());
        assertEquals(10, receipt.actual().experience().getFirst().diamonds());
        assertEquals(10 + receipt.rewards().stream().filter(reward -> reward.itemId() == 900002)
                .mapToLong(MainChapterRules.Reward::quantity).sum(),
                receipt.actual().wallet().diamondsAfter() - receipt.actual().wallet().diamondsBefore());
        assertEquals(receipt, chapters.claim(p.token(), battle.battleId()));
        jdbc.update("UPDATE game_role SET diamonds=diamonds+7 WHERE id=?", p.id());
        var after = roles.findById(p.id()).orElseThrow();
        var session = login.login(after.nickname());
        assertEquals(p.id(), session.role().id());
        var afterRelogin = roles.findById(p.id()).orElseThrow();
        assertEquals(after.gold(), afterRelogin.gold());
        assertEquals(after.diamonds(), afterRelogin.diamonds());
        assertEquals(after.level(), afterRelogin.level());
        assertEquals(after.basics().experience(), afterRelogin.basics().experience());
        assertEquals(receipt, chapters.claim("Bearer " + session.session().accessToken(), battle.battleId()));
        assertEquals(afterRelogin, roles.findById(p.id()).orElseThrow(), "恢复读取不能再次写奖；显式重登时间变化单独保留");
    }

    /** 错归属、矛盾附赠/基础/经验与超安全数等历史记录拒绝恢复，不能因为已经发过奖而继续交付损坏内容。 */
    @Test void damagedActualReceiptIsRejectedWithoutChangingAssets() {
        var p = player(true);
        var battle = chapters.challenge(p.token(), id());
        chapters.claim(p.token(), battle.battleId());
        var mapper = new tools.jackson.databind.ObjectMapper();
        String stored = jdbc.queryForObject("SELECT settlement_json FROM game_main_chapter_battle WHERE id=?",
                String.class, battle.battleId());
        var before = roles.findById(p.id()).orElseThrow();
        var revision = roles.revision(p.id());
        for (int scenario = 0; scenario < 5; scenario++) {
            var broken = (tools.jackson.databind.node.ObjectNode) mapper.readTree(stored);
            var actual = (tools.jackson.databind.node.ObjectNode) broken.path("actual");
            switch (scenario) {
                case 0 -> actual.put("roleId", UUID.randomUUID().toString());
                case 1 -> ((tools.jackson.databind.node.ObjectNode) actual.path("bonuses").get(0)).put("quantity", 11);
                case 2 -> ((tools.jackson.databind.node.ObjectNode) broken.path("rewards").get(0)).put("quantity", 1);
                case 3 -> ((tools.jackson.databind.node.ObjectNode) actual.path("experience").get(0)).put("level", 9);
                default -> ((tools.jackson.databind.node.ObjectNode) actual.path("wallet")).put("goldAfter", 9_007_199_254_740_992L);
            }
            jdbc.update("UPDATE game_main_chapter_battle SET settlement_json=? WHERE id=?",
                    mapper.writeValueAsString(broken), battle.battleId());
            assertThrows(IllegalStateException.class, () -> chapters.claim(p.token(), battle.battleId()));
            assertEquals(before, roles.findById(p.id()).orElseThrow());
            assertEquals(revision, roles.revision(p.id()));
        }
        jdbc.update("UPDATE game_main_chapter_battle SET settlement_json=? WHERE id=?", stored, battle.battleId());
        assertNotNull(chapters.claim(p.token(), battle.battleId()).actual());
    }

    /** 新结算若会产生JS无法精确交付的钱包，必须连奖励、待结算清理与回执一起回滚。 */
    @Test void unsafeReceiptNumbersRollBackBeforeCommit() {
        var p = player(true);
        var battle = chapters.challenge(p.token(), id());
        jdbc.update("UPDATE game_role SET gold=9007199254740991 WHERE id=?", p.id());
        var before = roles.findById(p.id()).orElseThrow();
        var state = chapters.current(p.token());
        assertThrows(IllegalStateException.class, () -> chapters.claim(p.token(), battle.battleId()));
        assertEquals(before, roles.findById(p.id()).orElseThrow());
        assertEquals(state, chapters.current(p.token()));
        assertNull(jdbc.queryForObject("SELECT settlement_json FROM game_main_chapter_battle WHERE id=?",
                String.class, battle.battleId()));
    }

    /** 未领奖时再次挑战只结算旧战报；同请求重试不能偷偷生成下一关。 */
    @Test void newChallengeSettlesPendingInsteadOfStartingNextBattle() {
        var p = player(true);
        var first = chapters.challenge(p.token(), id());
        String request = id();
        var settlement = chapters.challenge(p.token(), request);
        assertEquals(MainChapterService.Action.SETTLED, settlement.action());
        assertEquals(first.battleId(), settlement.battleId());
        var next = chapters.challenge(p.token(), id());
        assertEquals(2, next.state().maxCleared());
        long revision = roles.revision(p.id());
        assertEquals(settlement, chapters.challenge(p.token(), request));
        assertEquals(next.battleId(), chapters.current(p.token()).pendingBattleId());
        assertEquals(revision, roles.revision(p.id()));
    }

    /** 同请求并发只生成一场；同战报并发领取只发一次奖励。 */
    @Test void concurrentRequestsAndClaimsUsePersistentReceipts() throws Exception {
        var p = player(true);
        String request = id();
        try (var pool = Executors.newFixedThreadPool(2)) {
            var a = pool.submit(() -> chapters.challenge(p.token(), request));
            var b = pool.submit(() -> chapters.challenge(p.token(), request));
            var battle = a.get(20, TimeUnit.SECONDS);
            assertEquals(battle, b.get(20, TimeUnit.SECONDS));
            long revision = roles.revision(p.id());
            var one = pool.submit(() -> chapters.claim(p.token(), battle.battleId()));
            var two = pool.submit(() -> chapters.claim(p.token(), battle.battleId()));
            assertEquals(one.get(20, TimeUnit.SECONDS), two.get(20, TimeUnit.SECONDS));
            assertEquals(revision + 1, roles.revision(p.id()));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_battle WHERE role_id=?", Integer.class, p.id()));
        }
    }

    /** 库存精确加法溢出保留待领奖和战报，奖励及回执一起回滚；恢复后可安全重试。 */
    @Test void failedSettlementRollsBackAndCanRetry() {
        var p = player(true);
        var win = chapters.challenge(p.token(), id());
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(p.id(), 900101, Long.MAX_VALUE));
        var before = roles.findById(p.id()).orElseThrow();
        var bag = inventory.list(p.id());
        var state = chapters.current(p.token());
        assertThrows(ArithmeticException.class, () -> chapters.claim(p.token(), win.battleId()));
        assertEquals(before, roles.findById(p.id()).orElseThrow());
        assertEquals(bag, inventory.list(p.id()));
        assertEquals(state, chapters.current(p.token()));
        assertNull(jdbc.queryForObject("SELECT settlement_json FROM game_main_chapter_battle WHERE id=?", String.class, win.battleId()));
        jdbc.update("UPDATE game_inventory SET quantity=0 WHERE role_id=? AND item_id=900101", p.id());
        var claimed = chapters.claim(p.token(), win.battleId());
        assertNull(claimed.state().pendingBattleId());
        assertEquals(claimed, chapters.claim(p.token(), win.battleId()));
    }

    /** 外层失败必须连战报、请求回执、通关状态和版本一起回滚。 */
    @Test void challengeRollbackLeavesNoPartialRecords() {
        var p = player(true);
        String request = id();
        var state = chapters.current(p.token());
        assertThrows(IllegalStateException.class, () -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
            chapters.challenge(p.token(), request);
            throw new IllegalStateException("模拟事务提交前失败");
        }));
        assertEquals(state, chapters.current(p.token()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_battle WHERE role_id=?", Integer.class, p.id()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_command WHERE role_id=?", Integer.class, p.id()));
        assertEquals(1, chapters.challenge(p.token(), request).state().maxCleared());
    }

    /** 历史战报头像不受后来英雄星级/进化变化影响；跨角色与损坏战报拒绝读取/发奖。 */
    @Test void ownershipAndImmutableReplayAreEnforced() {
        var p = player(true);
        var other = player(true);
        var win = chapters.challenge(p.token(), id());
        var battle = chapters.replay(p.token(), win.battleId());
        assertTrue(battle.replay().getUnits(0).hasPortraitIconId());
        int portrait = battle.replay().getUnits(0).getPortraitIconId();
        // 隔离库准备另一合法进化状态；回看只能读取原始字节，不重新查询英雄头像。
        jdbc.update("UPDATE game_hero SET template_id=10105008,hero_level=100,star=10,stage=0,evolve_type=1,evolve_level=1 WHERE id=?", p.hero());
        assertEquals(portrait, chapters.replay(p.token(), win.battleId()).replay().getUnits(0).getPortraitIconId());
        assertEquals(battle, chapters.replay(p.token(), win.battleId()));
        assertThrows(IllegalArgumentException.class, () -> chapters.claim(other.token(), win.battleId()));
        assertThrows(IllegalArgumentException.class, () -> chapters.replay(other.token(), win.battleId()));
        var state = chapters.current(p.token());
        jdbc.update("UPDATE game_main_chapter_battle SET replay_bytes=? WHERE id=?", new byte[]{1, 2, 3}, win.battleId());
        assertThrows(IllegalStateException.class, () -> chapters.claim(p.token(), win.battleId()));
        assertEquals(state, chapters.current(p.token()));
    }

    /** 已有通关时钟的弱队第三关失败：保留起点，不推进通关或发奖励，新请求可再战。 */
    @Test void defeatPersistsWithoutProgressOrRewards() {
        var p = player(false);
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,2)", p.id());
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,?)",
                p.id(), java.time.Instant.now().getEpochSecond() - 60);
        var state = chapters.current(p.token());
        var before = roles.findById(p.id()).orElseThrow();
        String request = id();
        var lost = chapters.challenge(p.token(), request);
        assertNotEquals("ATTACKER_WIN", chapters.replay(p.token(), lost.battleId()).replay().getOutcome());
        assertEquals(state, chapters.current(p.token()));
        assertEquals(before, roles.findById(p.id()).orElseThrow());
        assertTrue(chapters.claim(p.token(), lost.battleId()).rewards().isEmpty());
        assertEquals(lost, chapters.challenge(p.token(), request));
        assertNotEquals(lost.battleId(), chapters.challenge(p.token(), id()).battleId());
    }
}
