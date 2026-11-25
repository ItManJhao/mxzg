/**
 * 独立数据库验证普通竞技场的周期边界、区服排名、系统邮件、宝箱、点赞与商店。
 * 夹具仅准备角色、历史挑战和时间，结算及发奖使用生产事务。
 */
package com.funsgamex.mxzg.arena;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.mail.MailService;
import com.funsgamex.mxzg.quest.QuestService;
import com.funsgamex.mxzg.quest.QuestService.QuestKind;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:arena_season_test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false",
    "mxzg.arena-maintenance.enabled=false", "mxzg.idle-activity-maintenance.enabled=false"
})
@ActiveProfiles("local")
class ArenaSeasonServiceTest {
    /** 实际竞技场结算与发奖入口。 */
    @Autowired private ArenaSeasonService arena;
    /** 用开发渠道创建隔离角色和凭证。 */
    @Autowired private DevelopmentLoginService login;
    /** 验证奖励作为邮件附件入库，领取后才进钱包。 */
    @Autowired private MailService mail;
    /** 成就由实际竞技场榜名次触发，领奖使用原永久任务事务。 */
    @Autowired private QuestService quests;
    /** 读取持久钱包和赛季积分。 */
    @Autowired private RoleRepository roles;
    /** 兑换扣除实际竞技币。 */
    @Autowired private InventoryService inventory;
    /** 只用固定时点和资料构造可重验隔离夹具。 */
    @Autowired private JdbcTemplate jdbc;
    /** 模拟区服每日与赛季边界。 */
    @Autowired private GameClock clock;
    /** 为测试角色准备初始货币，使用通用库存入口。 */
    @Autowired private TransactionTemplate transactions;

    /** 独立角色资料的主键和当前会话。 */
    private record Player(String roleId, String token) {}

    /** 测试不继续占用共享游戏时钟。 */
    @AfterEach
    void resetClock() {
        clock.reset();
    }

    /** 排名先积分后战力，按旧两种奖励结算，重复维护和并发投递不会重发。 */
    @Test
    void settlesBothRanksAtMidnightAndDeliversExactlyOnce() throws Exception {
        time("2026-11-29T23:00:00+08:00");
        configure("local-1", "2026-11-23T18:00:00+08:00");
        int score = 2800;
        var owner = player("local-1", 100, score, 5000);
        var lowerPower = player("local-1", 100, score, 100);
        var otherRealm = player("local-2", 100, 9000, 9000);
        assertEquals(1, arena.ranking(owner.token()).own().rank());
        assertEquals(2, arena.ranking(lowerPower.token()).own().rank());
        assertFalse(arena.ranking(owner.token()).entries().stream().anyMatch(row -> row.roleId().equals(otherRealm.roleId())));
        var before = arena.current(owner.token());
        assertEquals(epoch("2026-11-30T00:00:00+08:00"), before.seasonEndsAt());
        assertEquals(before.seasonEndsAt(), before.dailyEndsAt());
        assertEquals(12, before.dailyTiers().size());

        clock.setEpochSeconds(before.seasonEndsAt());
        try (var threads = Executors.newFixedThreadPool(2)) {
            var first = threads.submit(() -> arena.maintain("local-1"));
            var repeat = threads.submit(() -> arena.maintain("local-1"));
            first.get(15, TimeUnit.SECONDS);
            repeat.get(15, TimeUnit.SECONDS);
        }
        var prizes = arena.pending(clock.epochSeconds(), 50).stream()
                .filter(key -> key.roleId().equals(owner.roleId())).toList();
        assertEquals(List.of("daily", "season"), prizes.stream().map(ArenaSeasonRepository.PrizeKey::kind).toList());
        float cup = score / 1000.0f;
        int reduced = (int) (score * (1 - (2 * cup * cup + cup + 15) / 100.0f));
        assertEquals(reduced, roles.findById(owner.roleId()).orElseThrow().basics().cup());
        assertEquals(9000, roles.findById(otherRealm.roleId()).orElseThrow().basics().cup());
        assertEquals(epoch("2026-12-07T00:00:00+08:00"), arena.current(owner.token()).seasonEndsAt());
        assertEquals(1, bestRank(owner));
        assertEquals(2, bestRank(lowerPower));
        assertEquals(0, bestRank(otherRealm));

        assertTrue(mail.list(owner.roleId()).entries().isEmpty());
        long beforeDiamonds = roles.findById(owner.roleId()).orElseThrow().diamonds();
        try (var threads = Executors.newFixedThreadPool(2)) {
            var first = threads.submit(() -> arena.deliver(prizes.getFirst(), clock.epochSeconds()));
            var repeat = threads.submit(() -> arena.deliver(prizes.getFirst(), clock.epochSeconds()));
            first.get(15, TimeUnit.SECONDS);
            repeat.get(15, TimeUnit.SECONDS);
        }
        arena.deliver(prizes.getLast(), clock.epochSeconds());
        var inbox = mail.list(owner.roleId()).entries();
        assertEquals(2, inbox.size());
        assertEquals(beforeDiamonds, roles.findById(owner.roleId()).orElseThrow().diamonds());
        var weekly = inbox.stream().filter(entry -> entry.title().equals("竞技场赛季奖励")).findFirst().orElseThrow();
        var opened = mail.change(owner.roleId(), new MailService.Command(id(), MailService.Action.OPEN, weekly.id()));
        assertTrue(opened.detail().content().contains("第1名"));
        assertEquals(List.of(1005010, 900002, 900901),
                opened.detail().attachments().stream().map(item -> item.itemId()).toList());
    }

    /** 旧赛季的已结算败场计入宝箱，重复请求只能恢复原发放。 */
    @Test
    void chestUsesThisSeasonSettlementsAndFrozenReceipt() {
        time("2026-12-02T09:00:00+08:00");
        configure("local-1", "2026-11-30T15:00:00+08:00");
        var owner = player("local-1", 8, 1000, 100);
        var empty = arena.current(owner.token());
        assertEquals(0, empty.seasonChallenges());
        rejected("ARENA_CHEST_COUNT", () -> arena.claimChest(owner.token(), id(), 1, empty.seasonEndsAt()));
        seedBattles(owner, epoch("2026-11-30T00:00:00+08:00"));
        assertEquals(10, arena.current(owner.token()).seasonChallenges());
        String request = id();
        var claimed = arena.claimChest(owner.token(), request, 1, empty.seasonEndsAt());
        assertTrue(claimed.state().chests().getFirst().claimed());
        assertEquals(5L, quantity(owner, 900402));
        assertEquals(claimed.notice(), arena.claimChest(owner.token(), request, 1, empty.seasonEndsAt()).notice());
        rejected("ARENA_CHEST_CLAIMED", () -> arena.claimChest(owner.token(), id(), 1, empty.seasonEndsAt()));
        clock.setEpochSeconds(empty.seasonEndsAt());
        assertFalse(arena.current(owner.token()).chests().getFirst().claimed());
        rejected("ARENA_SEASON_CHANGED", () -> arena.claimChest(owner.token(), id(), 1, empty.seasonEndsAt()));
        assertEquals(claimed.notice(), arena.claimChest(owner.token(), request, 1, empty.seasonEndsAt()).notice());
        assertEquals(5L, quantity(owner, 900402));
    }

    /** 点赞只发一次日奖励，固定商品按等级、竞技币和周购买上限消耗。 */
    @Test
    void likesUseDailyTargetsAndShopUsesWeeklyLimit() {
        time("2026-12-05T09:00:00+08:00");
        configure("local-1", null);
        var owner = player("local-1", 79, 1000, 5000);
        var target = player("local-1", 80, 1000, 8000);
        assertEquals(0, arena.current(owner.token()).seasonEndsAt());
        var ranking = arena.ranking(owner.token());
        assertEquals(10, ranking.likesRemaining());
        String likeRequest = id();
        var did = arena.like(owner.token(), likeRequest, target.roleId(), ranking.dailyEndsAt());
        assertEquals(9, did.ranking().likesRemaining());
        var row = did.ranking().entries().stream().filter(entry -> entry.roleId().equals(target.roleId())).findFirst().orElseThrow();
        assertTrue(row.liked());
        assertEquals(1, row.receivedLikes());
        assertEquals(3000, roles.findById(owner.roleId()).orElseThrow().gold());
        assertEquals(did.notice(), arena.like(owner.token(), likeRequest, target.roleId(), ranking.dailyEndsAt()).notice());
        rejected("ARENA_LIKED", () -> arena.like(owner.token(), id(), target.roleId(), ranking.dailyEndsAt()));
        rejected("ARENA_LIKE_TARGET", () -> arena.like(owner.token(), id(), owner.roleId(), ranking.dailyEndsAt()));
        clock.setEpochSeconds(ranking.dailyEndsAt());
        assertEquals(9, arena.ranking(owner.token()).likesRemaining());
        clock.setEpochSeconds(ranking.dailyEndsAt() + 1);
        assertEquals(10, arena.ranking(owner.token()).likesRemaining());
        rejected("ARENA_LIKE_DAY", () -> arena.like(owner.token(), id(), target.roleId(), ranking.dailyEndsAt()));

        var at79 = arena.shop(owner.token());
        assertEquals(10, at79.offers().size());
        rejected("ARENA_SHOP_OFFER", () -> arena.buy(owner.token(), id(), 11, 1, at79.refreshAt()));
        jdbc.update("UPDATE game_role SET role_level=80 WHERE id=?", owner.roleId());
        var at80 = arena.shop(owner.token());
        assertEquals(11, at80.offers().size());
        assertEquals(52, at80.offers().getLast().price());
        rejected("ARENA_SHOP_CURRENCY", () -> arena.buy(owner.token(), id(), 11, 2, at80.refreshAt()));
        transactions.executeWithoutResult(status -> inventory.credit(owner.roleId(), 900901, 3000));
        String order = id();
        var result = arena.buy(owner.token(), order, 11, 50, at80.refreshAt());
        assertEquals(400, result.state().currencyBalance());
        assertEquals(50, result.state().offers().getLast().purchased());
        assertEquals(50L, quantity(owner, 902001));
        rejected("ARENA_SHOP_LIMIT", () -> arena.buy(owner.token(), id(), 11, 1, at80.refreshAt()));
        clock.setEpochSeconds(at80.refreshAt());
        assertEquals(0, arena.shop(owner.token()).offers().getLast().purchased());
        rejected("ARENA_SHOP_REFRESH", () -> arena.buy(owner.token(), id(), 11, 1, at80.refreshAt()));
        assertEquals(result.notice(), arena.buy(owner.token(), order, 11, 50, at80.refreshAt()).notice());
        assertEquals(50L, quantity(owner, 902001));
    }

    /** 排行展示不提前完成成就，真实名次提交后历史最优保留并按旧档顺次领奖。 */
    @Test
    void arenaRankingAchievementsKeepTrueBestAcrossLossAndRollback() {
        time("2026-12-05T09:00:00+08:00");
        String server = "arena-achievement";
        jdbc.update("INSERT INTO game_server(id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)",
                server, "local", "本地开发区", "独立竞技场服");
        configure(server, "2026-11-30T05:00:00+08:00");
        var owner = player(server, 100, 4100, 5000);
        var defender = player(server, 100, 4090, 6000);
        var ranking = arena.ranking(owner.token());
        assertEquals(1, ranking.own().rank());
        clock.setEpochSeconds(ranking.dailyEndsAt());
        assertEquals(1, arena.ranking(owner.token()).own().rank());
        assertEquals(0, quests.snapshot(owner.roleId()).achievements().stream()
                .filter(task -> task.id() == 115200).findFirst().orElseThrow().current());
        observeRank(server, owner, defender, true);
        assertEquals(0, bestRank(owner));
        observeRank(server, owner, defender, false);
        assertEquals(1, bestRank(owner));
        assertEquals(2, bestRank(defender));
        jdbc.update("UPDATE game_role SET cup=? WHERE id=?", 3500, owner.roleId());
        assertEquals(2, arena.ranking(owner.token()).own().rank());
        observeRank(server, owner, defender, false);
        assertEquals(1, bestRank(owner));
        for (int achievement : List.of(115200, 115300, 115400, 115500)) {
            assertEquals(1, quests.snapshot(owner.roleId()).achievements().stream()
                    .filter(task -> task.id() == achievement).findFirst().orElseThrow().current());
            quests.claim(owner.roleId(), QuestKind.ACHIEVEMENT, achievement, 0, id(), id());
        }
        assertEquals(400000, roles.findById(owner.roleId()).orElseThrow().gold());
    }

    /** 模拟真实竞技场写入结束时已有的区服和参战角色锁。 */
    private void observeRank(String server, Player owner, Player defender, boolean rollback) {
        transactions.executeWithoutResult(status -> {
            arena.prepare(server);
            List.of(owner.roleId(), defender.roleId()).stream().sorted().forEach(roles::lock);
            arena.recordRanks(server, owner.roleId(), defender.roleId());
            if (rollback) {
                status.setRollbackOnly();
            }
        });
    }

    /** 只有实际业务采样事务提交后才存在永久最优名次。 */
    private long bestRank(Player player) {
        return jdbc.queryForObject("""
                SELECT COALESCE(MAX(amount),0) FROM game_quest_counter WHERE role_id=?
                    AND metric='ARENA_MAX_RANK' AND period_end_seconds=0 AND condition_value=0
                """, Long.class, player.roleId());
    }

    /** 独立角色使用旧合法区服，准备明确的排名和购买前置资料。 */
    private Player player(String server, int level, int cup, int power) {
        var result = login.login("arena_s_" + id().substring(0, 10), server);
        jdbc.update("""
                UPDATE game_role SET role_level=?,cup=?,current_main_power=?,gold=0 WHERE id=?
                """, level, cup, power, result.role().id());
        return new Player(result.role().id(), "Bearer " + result.session().accessToken());
    }

    /** 测试彼此独立设置真实区服开服日期及第一次维护尚无记录的前置。 */
    private void configure(String server, String openedAt) {
        jdbc.update("DELETE FROM game_arena_schedule WHERE server_id=?", server);
        jdbc.update("UPDATE game_server SET opened_at_seconds=? WHERE id=?", openedAt == null ? null : epoch(openedAt), server);
    }

    /** 放置一期之前的一场和新一期十场主攻记录，证明不会按总参与数或胜场读宝箱。 */
    private void seedBattles(Player owner, long start) {
        jdbc.update("""
                INSERT INTO game_arena_progress(role_id,robot_wins,settled_challenges,daily_challenges,reset_at_seconds,opponents)
                VALUES (?,0,11,0,?,'1,2,3')
                """, owner.roleId(), start + 86_400);
        for (int index = 0; index <= 10; index++) {
            jdbc.update("""
                    INSERT INTO game_arena_challenge(role_id,request_id,battle_id,settlement_number,opponent_id,
                        opponent_name,won,score_delta,settled_at_seconds,report_bytes,receipt_json,receipt_hash)
                    VALUES (?,?,?, ?,1,'测试对手',FALSE,0,?,?, 'fixture','fixture')
                    """, owner.roleId(), id(), id(), index + 1, start + index - 1, new byte[]{1});
        }
    }

    /** 读取物品的真实持久数量。 */
    private long quantity(Player player, int itemId) {
        return inventory.find(player.roleId(), itemId).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 验证停在旧业务错误，没有将拒绝掩盖为成功。 */
    private static void rejected(String reason, Runnable command) {
        assertEquals(reason, assertThrows(ResponseStatusException.class, command::run).getReason());
    }

    /** 移动到可复验的带时区服务器秒。 */
    private void time(String value) {
        clock.setEpochSeconds(epoch(value));
    }

    /** 解析明确偏移下的时间，避免依赖本机时区。 */
    private static long epoch(String value) {
        return OffsetDateTime.parse(value).toEpochSecond();
    }

    /** 创建规范业务测试编号。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
