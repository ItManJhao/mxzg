/**
 * 普通单抽在独立内存库的事务回归，覆盖免费、扣券、名册容量、原回执恢复和首关结算。
 * 名册容量和数据库约束只在专门拒绝场景造夹具，首关路径不使用GM或预置角色进度。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.campaign.MainChapterService;
import com.funsgamex.mxzg.hero.HeroSummonService;
import com.funsgamex.mxzg.hero.HeroSummonRules;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
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
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
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
    /** 生产普通单抽及旧首抽入口。 */
    @Autowired private HeroSummonService summons;
    /** 实际装配的旧服普通单抽权重池，用固定落点覆盖星级边界。 */
    @Autowired private HeroSummonRules rules;
    /** 用真实持久格式建立已经过冷却期的历史抽取夹具。 */
    @Autowired private RewardReceiptPayloads payloads;
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
        HeroSummonService.Receipt receipt;
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
        assertEquals("SUMMON_ALREADY_COMPLETED", assertThrows(HeroSummonService.Rejected.class,
                () -> summons.first(player.token(), UUID.randomUUID().toString())).code());
        assertEquals("SUMMON_TICKET_INSUFFICIENT", assertThrows(HeroSummonService.Rejected.class,
                () -> summons.summon(player.token(), UUID.randomUUID().toString())).code());
        assertEquals("SUMMON_INVALID", assertThrows(HeroSummonService.Rejected.class,
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
        assertEquals("SUMMON_CAPACITY_FULL", assertThrows(HeroSummonService.Rejected.class,
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
        jdbc.execute("ALTER TABLE game_hero_normal_summon ADD CONSTRAINT " + constraint + " CHECK (role_id <> '"
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
            jdbc.execute("ALTER TABLE game_hero_normal_summon DROP CONSTRAINT " + constraint);
        }
        var receipt = summons.summon(player.token(), requestId);
        assertEquals(revision + 1, receipt.assetRevision());
        assertEquals(1, points(player));
    }

    /** 持有券仍优先用免费；一张券并发点击仅一笔成功，重发原业务键不会再扣券或重抽。 */
    @Test
    void freeFirstThenOnlyOneConcurrentTicketDraw() throws Exception {
        var player = player();
        snapshots.snapshot(player.token());
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,900201,1,?)",
                player.role(), UUID.randomUUID().toString());
        var first = summons.summon(player.token(), UUID.randomUUID().toString());
        assertEquals(1, tickets(player));
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var draw = (java.util.concurrent.Callable<HeroSummonService.Receipt>) () -> {
                try {
                    return summons.summon(player.token(), UUID.randomUUID().toString());
                } catch (HeroSummonService.Rejected rejected) {
                    assertEquals("SUMMON_TICKET_INSUFFICIENT", rejected.code());
                    return null;
                }
            };
            var left = executor.submit(draw);
            var right = executor.submit(draw);
            var a = left.get(10, TimeUnit.SECONDS);
            var b = right.get(10, TimeUnit.SECONDS);
            assertNotEquals(a == null, b == null);
            var paid = a != null ? a : b;
            assertEquals(first.state(), paid.state());
            assertEquals(first.assetRevision() + 1, paid.assetRevision());
            assertEquals(1, paid.actual().heroes().size());
            assertEquals(paid, summons.summon(player.token(), paid.requestId()));
            assertFalse(summons.status(player.token(), paid.requestId()).found());
            assertEquals("SUMMON_ALREADY_COMPLETED", assertThrows(HeroSummonService.Rejected.class,
                    () -> summons.first(player.token(), paid.requestId())).code());
        }
        var state = snapshots.snapshot(player.token());
        assertEquals(0, tickets(player));
        assertEquals(2, points(player));
        assertEquals(2, state.heroes().size());
        assertEquals(first.state(), state.heroSummon());
    }

    /** 已过冷却且持有券时再次免费并更新冷却，扣券后写回执失败时资产及版本整体回滚。 */
    @Test
    void cooldownRefreshAndTicketRollback() {
        var player = player();
        snapshots.snapshot(player.token());
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,900201,1,?)",
                player.role(), UUID.randomUUID().toString());
        var first = summons.first(player.token(), UUID.randomUUID().toString());
        var oldState = new HeroSummonService.State(1, true, 1);
        var history = new HeroSummonService.Receipt(1, first.requestId(), first.receiptId(), player.role(),
                first.assetRevision(), oldState, first.actual());
        var frozen = payloads.freeze(history);
        jdbc.update("UPDATE game_hero_normal_summon SET normal_free_at_seconds=1,payload_json=?,payload_hash=? "
                + "WHERE role_id=? AND request_id=?", frozen.json(), frozen.hash(), player.role(), first.requestId());
        long now = Instant.now().getEpochSecond();
        var free = summons.summon(player.token(), UUID.randomUUID().toString());
        assertTrue(free.state().normalFreeAtSeconds() >= now + 43_200);
        assertEquals(1, tickets(player));
        var key = UUID.randomUUID().toString();
        jdbc.execute("ALTER TABLE game_hero_normal_summon ADD CONSTRAINT ck_ticket_rollback "
                + "CHECK (request_id <> '" + key + "')");
        try {
            assertThrows(DataIntegrityViolationException.class, () -> summons.summon(player.token(), key));
        } finally {
            jdbc.execute("ALTER TABLE game_hero_normal_summon DROP CONSTRAINT ck_ticket_rollback");
        }
        assertEquals(1, tickets(player));
        assertEquals(2, points(player));
        assertEquals(2, snapshots.snapshot(player.token()).heroes().size());
        assertEquals(free.assetRevision(), roles.revision(player.role()));
        assertEquals(free.state(), summons.summon(player.token(), key).state());
        assertEquals(0, tickets(player));
    }

    /** 验证原万分权重边界和星内末位；首次固定模板不消耗随机。 */
    @Test
    void starRollPrecedesHeroRoll() {
        var random = org.mockito.Mockito.mock(java.util.random.RandomGenerator.class);
        assertEquals(10304012, rules.rewards(true, random).getFirst().itemId());
        org.mockito.Mockito.verifyNoInteractions(random);
        org.mockito.Mockito.when(random.nextLong(10_000)).thenReturn(5_299L, 5_300L, 9_999L);
        org.mockito.Mockito.when(random.nextLong(11_463)).thenReturn(11_462L);
        org.mockito.Mockito.when(random.nextLong(3_894)).thenReturn(0L);
        org.mockito.Mockito.when(random.nextLong(235)).thenReturn(234L);
        assertEquals(10301001, rules.rewards(false, random).getFirst().itemId());
        assertEquals(10102002, rules.rewards(false, random).getFirst().itemId());
        assertEquals(10505015, rules.rewards(false, random).getFirst().itemId());
    }

    /** 实际升级已存在首抽的旧库，确认原请求、摘要、英雄回执、免费时间和版本保留。 */
    @Test
    void migrationPreservesExistingFreeDraw() {
        var player = player();
        var first = summons.first(player.token(), UUID.randomUUID().toString());
        var frozen = payloads.freeze(first);
        var source = new DriverManagerDataSource("jdbc:h2:mem:summon_upgrade_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "sa", "");
        var old = new JdbcTemplate(source);
        try {
            Flyway.configure().dataSource(source).target("32").load().migrate();
            old.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id)"
                    + " VALUES (?,?,?,1,0,0,?,'local-1')", player.role(), "existing", "Existing", "existing");
            old.update("INSERT INTO game_hero_first_summon(role_id,request_id,receipt_id,asset_revision,"
                            + "normal_free_at_seconds,payload_json,payload_hash) VALUES (?,?,?,?,?,?,?)",
                    player.role(), first.requestId(), first.receiptId(), first.assetRevision(),
                    first.state().normalFreeAtSeconds(), frozen.json(), frozen.hash());
            Flyway.configure().dataSource(source).target("33").load().migrate();
            var restored = old.queryForMap("SELECT * FROM game_hero_normal_summon WHERE role_id=? AND request_id=?",
                    player.role(), first.requestId());
            assertEquals(true, restored.get("first_draw"));
            assertEquals(first.assetRevision(), restored.get("asset_revision"));
            assertEquals(first.state().normalFreeAtSeconds(), restored.get("normal_free_at_seconds"));
            assertEquals(first.receiptId(), restored.get("receipt_id"));
            assertEquals(first, payloads.read(old.queryForObject("SELECT payload_json FROM game_hero_normal_summon",
                    String.class), (String) restored.get("payload_hash"), HeroSummonService.Receipt.class));
        } finally {
            old.execute("SHUTDOWN");
        }
    }

    /** 读取普通召唤券的实际持久堆叠余额。 */
    private long tickets(Player player) {
        return jdbc.queryForObject("SELECT quantity FROM game_inventory WHERE role_id=? AND item_id=900201",
                Long.class, player.role());
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
