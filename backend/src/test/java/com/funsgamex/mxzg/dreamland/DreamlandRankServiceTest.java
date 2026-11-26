/**
 * 验证永恒梦境本服排序及上海零点的邮箱奖励。
 * 隔离数据库中的名次、奖励行和角色库存经过真实事务更新。
 */
package com.funsgamex.mxzg.dreamland;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.mail.MailService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:dreamland_rank;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false",
    "mxzg.dreamland-maintenance.enabled=false", "mxzg.arena-maintenance.enabled=false",
    "mxzg.idle-activity-maintenance.enabled=false"
})
@ActiveProfiles("local")
class DreamlandRankServiceTest {
    /** 固定在上海午夜，便于测试相邻的自然日。 */
    private static final long MIDNIGHT = Instant.parse("2026-11-25T16:00:00Z").getEpochSecond();

    /** 创建拥有真实会话的隔离榜单角色。 */
    @Autowired private DevelopmentLoginService login;
    /** 校验本服榜单并触发后台持久结算。 */
    @Autowired private DreamlandRankService rank;
    /** 既有邮箱验证附件及实际领取。 */
    @Autowired private MailService mail;
    /** 角色锁沿用原仓储。 */
    @Autowired private RoleRepository roles;
    /** 核对旧奖励表的两种物品到账和数量。 */
    @Autowired private InventoryService inventory;
    /** 模拟跨日及两个同楼层胜场。 */
    @Autowired private GameClock clock;
    /** 批量准备榜单和核对冻结流水。 */
    @Autowired private JdbcTemplate jdbc;
    /** 和胜场确认一样在持有角色锁的事务内更新榜单。 */
    @Autowired private TransactionTemplate transactions;

    /** 供测试发起鉴权查询和查阅自身邮箱的角色。 */
    private record Player(String roleId, String token) {}

    /** 恢复游戏时钟，测试较早日期不影响其他调用。 */
    @AfterEach
    void resetClock() {
        clock.reset();
    }

    /** 跨日后的新胜场不能抢昨天名次，且同时送信也只领得一份正确附件。 */
    @Test
    void freezesYesterdayBeforeNewWinAndDeliversOnlyOnce() throws Exception {
        String realm = server();
        String otherRealm = server();
        var first = player(realm, 25);
        var second = player(realm, 25);
        var visitor = player(otherRealm, 25);
        var locked = player(realm, 24);
        assertEquals("DREAMLAND_LEVEL",
                assertThrows(ResponseStatusException.class, () -> rank.ranking(locked.token())).getReason());
        assertEquals(0, rank.ranking(first.token()).own().rank());

        clock.setEpochSeconds(MIDNIGHT - 3600);
        record(first, 5);
        record(visitor, 6);
        clock.setEpochSeconds(MIDNIGHT - 1800);
        record(second, 5);
        record(first, 5);
        var before = rank.ranking(second.token());
        assertEquals(MIDNIGHT, before.resetAtSeconds());
        assertEquals(List.of(first.roleId(), second.roleId()), before.entries().stream()
                .map(DreamlandRankService.RankEntry::roleId).toList());
        assertEquals(2, before.own().rank());
        assertTrue(before.entries().getFirst().achievedAtSeconds() < before.own().achievedAtSeconds());

        clock.setEpochSeconds(MIDNIGHT + 1);
        record(second, 6);
        rank.settleServer(realm);
        rank.settleServer(realm);
        assertEquals(1, rank.ranking(second.token()).own().rank());
        var prizes = rank.pending(clock.epochSeconds(), 100).stream()
                .filter(key -> realm.equals(key.serverId())).toList();
        assertEquals(List.of(first.roleId(), second.roleId()), prizes.stream()
                .map(DreamlandRankRepository.PrizeKey::roleId).toList());
        assertTrue(prizes.stream().allMatch(key -> key.periodEnd() == MIDNIGHT));
        assertTrue(mail.list(first.roleId()).entries().isEmpty());

        try (var executor = Executors.newFixedThreadPool(2)) {
            var firstWorker = executor.submit(() -> rank.deliver(prizes.getFirst(), clock.epochSeconds()));
            var retryWorker = executor.submit(() -> rank.deliver(prizes.getFirst(), clock.epochSeconds()));
            firstWorker.get(15, TimeUnit.SECONDS);
            retryWorker.get(15, TimeUnit.SECONDS);
        }
        var inbox = mail.list(first.roleId()).entries();
        assertEquals(1, inbox.size());
        var entry = inbox.getFirst();
        assertEquals("永恒梦境排名奖励", entry.title());
        var detail = mail.change(first.roleId(), command(MailService.Action.OPEN, entry.id())).detail();
        assertTrue(detail.content().contains("2026-11-25"));
        assertEquals(List.of(new Reward(901401, 305), new Reward(900101, 510000)), detail.attachments());
        long beforeCoin = quantity(first.roleId(), 901401);
        long beforeHeroExperience = quantity(first.roleId(), 900101);
        var claim = command(MailService.Action.CLAIM, entry.id());
        mail.change(first.roleId(), claim);
        mail.change(first.roleId(), claim);
        assertEquals(beforeCoin + 305, quantity(first.roleId(), 901401));
        assertEquals(beforeHeroExperience + 510000, quantity(first.roleId(), 900101));
        assertFalse(rank.pending(clock.epochSeconds(), 100).contains(prizes.getFirst()));
    }

    /** 榜单最多一百行，榜外保留历史楼层，冻结奖励仅覆盖旧策划前五十。 */
    @Test
    void limitsTheBoardAndPayoutAndPreservesOutsideFloor() {
        String realm = server();
        var own = player(realm, 25);
        clock.setEpochSeconds(MIDNIGHT - 3600);
        record(own, 1);
        for (int index = 0; index < 102; index++) {
            String roleId = UUID.randomUUID().toString();
            seedRole(jdbc, realm, roleId);
            jdbc.update("INSERT INTO game_dreamland_rank_best(role_id,server_id,floor,achieved_at) VALUES (?,?,5,?)",
                    roleId, realm, MIDNIGHT - 200 + index);
        }

        var board = rank.ranking(own.token());
        assertEquals(100, board.entries().size());
        assertEquals(100, board.entries().getLast().rank());
        assertEquals(0, board.own().rank());
        assertEquals(1, board.own().floor());
        assertEquals(6, board.rewardTiers().size());
        assertEquals(50, board.rewardTiers().getLast().maxRank());

        clock.setEpochSeconds(MIDNIGHT + 1);
        rank.settleServer(realm);
        assertEquals(50, jdbc.queryForObject("""
                SELECT COUNT(*) FROM game_dreamland_rank_prize WHERE server_id=? AND period_end=?
                """, Integer.class, realm, MIDNIGHT));
        assertEquals(board.entries().get(49).roleId(), jdbc.queryForObject("""
                SELECT role_id FROM game_dreamland_rank_prize WHERE server_id=? AND rank_place=50
                """, String.class, realm));
    }

    /** 旧版本只有确认最高层，没有达成时刻的存量仍入榜但不预生成历史邮件。 */
    @Test
    void migratesOnlyConfirmedRecordsFromVersion75() {
        String url = "jdbc:h2:mem:dreamland_rank_old;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        var oldDb = new JdbcTemplate(new DriverManagerDataSource(url, "sa", ""));
        Flyway.configure().dataSource(url, "sa", "").target("75").load().migrate();
        String confirmed = UUID.randomUUID().toString();
        String unconfirmed = UUID.randomUUID().toString();
        seedRole(oldDb, "local-1", confirmed);
        seedRole(oldDb, "local-1", unconfirmed);
        oldDb.update("INSERT INTO game_dreamland(role_id,wake_at,progress_json) VALUES (?,0,?),(?,0,?)",
                confirmed, "{\"highestFloor\":6}", unconfirmed, "{\"highestFloor\":0,\"floor\":1}");

        Flyway.configure().dataSource(url, "sa", "").load().migrate();
        assertEquals(6, oldDb.queryForObject("SELECT floor FROM game_dreamland_rank_best WHERE role_id=?",
                Integer.class, confirmed));
        assertEquals(0L, oldDb.queryForObject("SELECT achieved_at FROM game_dreamland_rank_best WHERE role_id=?",
                Long.class, confirmed));
        assertEquals(1, oldDb.queryForObject("SELECT COUNT(*) FROM game_dreamland_rank_best", Integer.class));
        assertEquals(0, oldDb.queryForObject("SELECT COUNT(*) FROM game_dreamland_rank_prize", Integer.class));
    }

    /** 创建独立区服，避免本组多个测试复用结算游标。 */
    private String server() {
        String id = "rank-" + UUID.randomUUID().toString().substring(0, 8);
        jdbc.update("INSERT INTO game_server(id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)",
                id, "rank", "梦境测试区", "梦境测试服");
        return id;
    }

    /** 使用真实开发登录建立角色会话，等级由测试填写。 */
    private Player player(String realm, int level) {
        var issued = login.login("rank_" + UUID.randomUUID().toString().substring(0, 12), realm);
        String roleId = issued.role().id();
        jdbc.update("UPDATE game_role SET role_level=? WHERE id=?", level, roleId);
        return new Player(roleId, "Bearer " + issued.session().accessToken());
    }

    /** 使用最少资料填充大量榜单样本，账号键在每条夹具唯一。 */
    private static void seedRole(JdbcTemplate database, String realm, String roleId) {
        database.update("""
                INSERT INTO game_role(id,account_key,nickname,role_level,role_experience,gold,diamonds,server_id,login_account)
                VALUES (?,?,?,25,0,0,0,?,?)
                """, roleId, roleId, "梦境排行", realm, roleId.substring(0, 24));
    }

    /** 在真实胜场调用要求的事务和角色锁内登记测试最高层。 */
    private void record(Player player, int floor) {
        transactions.executeWithoutResult(status -> {
            roles.lock(player.roleId());
            rank.recordBest(roles.findById(player.roleId()).orElseThrow(), floor);
        });
    }

    /** 读取可堆叠附件的实际到账数量，没有该物品时返回零。 */
    private long quantity(String roleId, int itemId) {
        return inventory.list(roleId).stream().filter(item -> item.itemId() == itemId)
                .mapToLong(InventoryService.Item::quantity).sum();
    }

    /** 创建可被同一请求编号重放的邮件命令。 */
    private static MailService.Command command(MailService.Action action, String mailId) {
        return new MailService.Command(UUID.randomUUID().toString(), action, mailId);
    }
}
