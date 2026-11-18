/**
 * 普通首抽在独立内存库的事务回归，覆盖从零名册、真实奖励、原回执恢复和首关结算。
 * 名册容量和数据库约束只在专门拒绝场景造夹具，首关路径不使用GM或预置角色进度。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.MainChapterService;
import com.funsgamex.mxzg.hero.HeroFirstSummonService;
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
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:hero_first_summon;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class HeroFirstSummonServiceTest {
    /** 创建真实的新测试角色，不存储凭证到文件。 */
    @Autowired private DevelopmentLoginService login;
    /** 生产首抽和原回执读取入口。 */
    @Autowired private HeroFirstSummonService summons;
    /** 重登首包与提交后推送共用的状态装配。 */
    @Autowired private SessionSnapshotService snapshots;
    /** 真实阵容保存和服务端战斗结算。 */
    @Autowired private MainFormationCommandService formations;
    /** 首关必须由普通主线挑战产生实际胜负。 */
    @Autowired private MainChapterService chapters;
    /** 当前持久资产版本，用于确认失败没有部分提交。 */
    @Autowired private RoleRepository roles;
    /** 独立内存库读取实际奖励行；只在拒绝场景调整夹具。 */
    @Autowired private JdbcTemplate jdbc;

    /** 本类用到的角色归属和内存内登录凭证。 */
    private record Player(String role, String token) {}

    /** 验证真实首抽、装备前出战并结算，全程只使用获得的首位英雄。 */
    @Test
    void freshPlayerCanSummonPlaceAndWinFirstChapter() throws Exception {
        var player = player();
        var before = snapshots.snapshot(player.token());
        assertTrue(before.heroes().isEmpty());
        assertFalse(before.heroSummon().firstNormalCompleted());
        assertEquals(0, before.heroSummon().normalFreeAtSeconds());
        assertEquals(0, points(player));
        assertEquals(0, before.mainChapter().maxCleared());

        String requestId = UUID.randomUUID().toString();
        long requestedAt = Instant.now().getEpochSecond();
        var receipt = summons.summon(player.token(), requestId);
        var granted = receipt.actual().heroes().getFirst();
        assertEquals(10304012, granted.templateId());
        assertEquals(1, granted.level());
        assertEquals(4, granted.star());
        assertEquals(0, granted.stage());
        assertEquals(1, receipt.actual().heroes().size());
        assertEquals(1, points(player));
        assertEquals(1, receipt.actual().items().stream().filter(item -> item.itemId() == 900302)
                .findFirst().orElseThrow().credited());
        assertTrue(receipt.state().normalFreeAtSeconds() >= requestedAt + 43_200);
        assertTrue(receipt.state().normalFreeAtSeconds() <= Instant.now().getEpochSecond() + 43_200);
        assertEquals(before.revision() + 1, receipt.assetRevision());
        assertEquals(receipt.actual().wallet().goldBefore(), receipt.actual().wallet().goldAfter());
        assertEquals(receipt.actual().wallet().diamondsBefore(), receipt.actual().wallet().diamondsAfter());

        var after = snapshots.snapshot(player.token());
        assertEquals(receipt.state(), after.heroSummon());
        assertEquals(receipt.assetRevision(), after.revision());
        assertEquals(List.of(granted.instanceId()), after.heroes().stream().map(hero -> hero.id()).toList());
        var wireSnapshot = GameProtocolCodec.decode(GameProtocolCodec.encode(Map.of(
                "version", 1, "kind", "event", "name", "state.changed", "body", after)));
        assertTrue(wireSnapshot.path("body").path("heroSummon").path("firstNormalCompleted").asBoolean());
        var wireReceipt = GameProtocolCodec.decode(GameProtocolCodec.encode(Map.of(
                "version", 1, "kind", "response", "name", "hero.summon.first", "ok", true, "body", receipt)));
        assertEquals(granted.instanceId(), wireReceipt.path("body").path("actual").path("heroes")
                .get(0).path("instanceId").asString());

        formations.save(player.token(), new MainFormationCommandService.Save(UUID.randomUUID().toString(),
                after.mainFormation().version(), after.mainFormation().formationId(),
                List.of(new Lineup.Slot(2, granted.instanceId()))));
        var battle = chapters.challenge(player.token(), UUID.randomUUID().toString());
        assertEquals(MainChapterService.Action.BATTLE, battle.action());
        var replay = chapters.replay(player.token(), battle.battleId());
        assertEquals("ATTACKER_WIN", replay.replay().getOutcome());
        assertEquals(1, replay.details().mission());
        var settled = chapters.claim(player.token(), battle.battleId());
        assertEquals(MainChapterService.Action.SETTLED, settled.action());
        assertEquals(1, settled.state().maxCleared());
        assertNull(settled.state().pendingBattleId());
        assertNotNull(settled.actual());
        assertEquals(receipt, summons.status(player.token(), requestId).receipt());
    }

    /** 双发得到同一冻结回执；新请求ID、另一个角色和坏ID皆不能借用原回执。 */
    @Test
    void concurrentRequestsAndReconnectPreserveOriginalResult() throws Exception {
        var player = player();
        // 重登首包可能初始化旧冒险点；并发首抽只比较初始化完成后的资产版本。
        long revision = snapshots.snapshot(player.token()).revision();
        String requestId = UUID.randomUUID().toString();
        assertFalse(summons.status(player.token(), requestId).found());
        HeroFirstSummonService.Receipt receipt;
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> summons.summon(player.token(), requestId));
            var retry = executor.submit(() -> summons.summon(player.token(), requestId));
            receipt = first.get(10, TimeUnit.SECONDS);
            assertEquals(receipt, retry.get(10, TimeUnit.SECONDS));
        }
        String statusName = "hero.summon.first.status";
        var status = summons.status(player.token(), requestId);
        var wire = GameProtocolCodec.decode(GameProtocolCodec.encode(Map.of(
                "version", 1, "kind", "response", "name", statusName, "ok", true, "body", status)));
        assertTrue(wire.path("body").path("found").asBoolean());
        assertEquals(receipt.receiptId(), wire.path("body").path("receipt").path("receiptId").asString());
        assertEquals(receipt, status.receipt());
        assertEquals(receipt, summons.summon(player.token(), requestId));
        assertTrue(snapshots.snapshot(player.token()).heroSummon().firstNormalCompleted());
        assertFalse(summons.status(player().token(), requestId).found());
        assertEquals("SUMMON_ALREADY_COMPLETED", assertThrows(HeroFirstSummonService.Rejected.class,
                () -> summons.summon(player.token(), UUID.randomUUID().toString())).code());
        assertEquals("SUMMON_INVALID", assertThrows(HeroFirstSummonService.Rejected.class,
                () -> summons.summon(player.token(), "invalid")).code());
        assertEquals(1, points(player));
        assertEquals(1, snapshots.snapshot(player.token()).heroes().size());
        assertEquals(revision + 1, receipt.assetRevision());
        assertEquals(receipt.assetRevision(), roles.revision(player.role()));
    }

    /** 已满名册不扣积分或占用免费机会，腾出一格后原请求可成功。 */
    @Test
    void capacityRejectionPreservesEligibility() {
        var player = player();
        jdbc.update("UPDATE game_role SET hero_capacity=1 WHERE id=?", player.role());
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10304012,1,4)",
                UUID.randomUUID().toString(), player.role());
        long revision = roles.revision(player.role());
        String requestId = UUID.randomUUID().toString();
        assertEquals("SUMMON_CAPACITY_FULL", assertThrows(HeroFirstSummonService.Rejected.class,
                () -> summons.summon(player.token(), requestId)).code());
        assertFalse(summons.status(player.token(), requestId).found());
        assertEquals(revision, roles.revision(player.role()));
        assertEquals(0, points(player));
        jdbc.update("UPDATE game_role SET hero_capacity=2 WHERE id=?", player.role());
        assertEquals(1, summons.summon(player.token(), requestId).actual().heroes().size());
        assertEquals(2, snapshots.snapshot(player.token()).heroes().size());
    }

    /** 写最后一步回执失败时，真实英雄、积分、资格和持久版本全部回滚。 */
    @Test
    void receiptWriteFailureRollsBackEntireGrant() {
        var player = player();
        long revision = snapshots.snapshot(player.token()).revision();
        String requestId = UUID.randomUUID().toString();
        String constraint = "ck_test_summon_write";
        jdbc.execute("ALTER TABLE game_hero_first_summon ADD CONSTRAINT " + constraint + " CHECK (role_id <> '"
                + player.role() + "')");
        try {
            assertThrows(DataIntegrityViolationException.class, () -> summons.summon(player.token(), requestId));
            assertFalse(summons.status(player.token(), requestId).found());
            var after = snapshots.snapshot(player.token());
            assertFalse(after.heroSummon().firstNormalCompleted());
            assertTrue(after.heroes().isEmpty());
            assertEquals(0, points(player));
            assertEquals(revision, after.revision());
        } finally {
            jdbc.execute("ALTER TABLE game_hero_first_summon DROP CONSTRAINT " + constraint);
        }
        var receipt = summons.summon(player.token(), requestId);
        assertEquals(revision + 1, receipt.assetRevision());
        assertEquals(1, points(player));
    }

    /** 创建没有预置英雄、通关或领奖记录的独立测试玩家。 */
    private Player player() {
        var result = login.login("summon_" + UUID.randomUUID().toString().substring(0, 16));
        return new Player(result.role().id(), "Bearer " + result.session().accessToken());
    }

    /** 以真实普通库存行的数量确认积分独立到账。 */
    private long points(Player player) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(quantity),0) FROM game_inventory WHERE role_id=? AND item_id=900302",
                Long.class, player.role());
    }
}
