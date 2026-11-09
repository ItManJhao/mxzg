/** 独立H2验证真实战斗持久化、请求/战报幂等、失败回滚和归属隔离，不开放游戏协议。 */
package com.funsgamex.mxzg;

import java.util.*;
import java.util.concurrent.*;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.*;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.lineup.*;
import com.funsgamex.mxzg.role.RoleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
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

    /** 每次新操作使用新ID；重试由测试显式保留原ID。 */
    private static String id() { return UUID.randomUUID().toString(); }

    /** 首场胜利只推进；完整三关结算后历史经验仍冻结，重试不使用当前等级重算。 */
    @Test void threeRealBattlesPersistAndSettleExactlyOnce() {
        var p = player(true);
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
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM game_main_chapter_idle WHERE role_id=?", Integer.class, p.id()), "胜利事务已保存挂机起点，不等待客户端接包");
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
        jdbc.update("UPDATE game_main_chapter_battle SET settlement_json=? WHERE id=?",
            mapper.writeValueAsString(old), battle.battleId());
        var roleBefore = roles.findById(p.id()).orElseThrow();
        var receipt = chapters.claim(p.token(), battle.battleId());
        assertNull(receipt.experience());
        assertEquals(claimed.rewards(), receipt.rewards());
        assertEquals(roleBefore, roles.findById(p.id()).orElseThrow());
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

    /** 发奖中途失败保留待领奖和战报，奖励及回执一起回滚；恢复后可安全重试。 */
    @Test void failedSettlementRollsBackAndCanRetry() {
        var p = player(true);
        var win = chapters.challenge(p.token(), id());
        new TransactionTemplate(transactions).executeWithoutResult(status -> inventory.credit(p.id(), 900101, Long.MAX_VALUE));
        var before = roles.findById(p.id()).orElseThrow();
        var bag = inventory.list(p.id());
        var state = chapters.current(p.token());
        assertThrows(org.springframework.dao.DataAccessException.class, () -> chapters.claim(p.token(), win.battleId()));
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

    /** 历史战报不受后来英雄改变影响；跨角色与损坏战报拒绝读取/发奖。 */
    @Test void ownershipAndImmutableReplayAreEnforced() {
        var p = player(true);
        var other = player(true);
        var win = chapters.challenge(p.token(), id());
        var battle = chapters.replay(p.token(), win.battleId());
        jdbc.update("UPDATE game_hero SET hero_level=1 WHERE id=?", p.hero());
        assertEquals(battle, chapters.replay(p.token(), win.battleId()));
        assertThrows(IllegalArgumentException.class, () -> chapters.claim(other.token(), win.battleId()));
        assertThrows(IllegalArgumentException.class, () -> chapters.replay(other.token(), win.battleId()));
        var state = chapters.current(p.token());
        jdbc.update("UPDATE game_main_chapter_battle SET replay_bytes=? WHERE id=?", new byte[]{1, 2, 3}, win.battleId());
        assertThrows(IllegalStateException.class, () -> chapters.claim(p.token(), win.battleId()));
        assertEquals(state, chapters.current(p.token()));
    }

    /** 弱队真实第三关失败：保存战报但不推进、不发奖励，新请求可再战。 */
    @Test void defeatPersistsWithoutProgressOrRewards() {
        var p = player(false);
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,2)", p.id());
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
