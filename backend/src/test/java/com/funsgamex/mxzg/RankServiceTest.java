/** 独立 H2 库验证排行榜门槛、真实取分、跨服边界及点赞奖励的持续幂等。 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.rank.RankService;
import com.funsgamex.mxzg.rank.RankService.Board;
import com.funsgamex.mxzg.rank.RankService.BoardKind;
import com.funsgamex.mxzg.rank.RankService.LikeCommand;
import com.funsgamex.mxzg.reward.RewardFeedbackService.Mode;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:rank_service;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class RankServiceTest {
    /** 使用线上同款服务和数据库迁移验证榜单及点赞。 */
    @Autowired private RankService ranking;
    /** 准备固定分值和启用区服、单独核查钱包。 */
    @Autowired private JdbcTemplate jdbc;
    /** 调整服务端时间以跨过上海零点。 */
    @Autowired private GameClock clock;

    /** 五榜使用各自持久数据，跨服只读同组启用区服，且门槛由角色等级决定。 */
    @Test
    void pullsFiveBoardsFromActualServerScopes() {
        String local = server("rank-local", "rank-region", true);
        String peer = server("rank-peer", "rank-region", true);
        String disabled = server("rank-disabled", "rank-region", false);
        String foreign = server("rank-foreign", "other-region", true);
        String own = role(local, 42, 90, 120, 11);
        String leader = role(local, 41, 210, 300, 22);
        String guild = guild(local, leader, "本服公会");
        join(guild, own);
        String crossLeader = role(peer, 43, 425, 450, 55);
        String crossGuild = guild(peer, crossLeader, "同组公会");
        String crossPeak = role(peer, 44, 0, 500, 12);
        guild(disabled, role(disabled, 45, 30, 500, 44), "停用区公会");
        guild(foreign, role(foreign, 45, 300, 600, 100), "其他区公会");
        String locked = role(local, 17, 0, 0, 0);
        String localOnly = role(local, 18, 250, 250, 10);

        reject("RANK_LOCKED", () -> ranking.overview(locked));
        reject("RANK_CROSS_LOCKED", () -> ranking.list(localOnly, BoardKind.CROSS_POWER));
        assertFalse(ranking.overview(localOnly).crossUnlocked());
        assertEquals(List.of(BoardKind.CHAPTER, BoardKind.GUILD, BoardKind.POWER),
                ranking.overview(localOnly).boards().stream().map(Board::kind).toList());

        var available = ranking.overview(own);
        assertTrue(available.crossUnlocked());
        assertEquals(40, available.crossLevel());
        assertEquals(List.of(leader, guild, localOnly, crossGuild, crossLeader),
                available.boards().stream().map(row -> row.leader().id()).toList());
        assertEquals(List.of(22L, 420L, 250L, 450L, 425L),
                available.boards().stream().map(row -> row.leader().score()).toList());
        assertEquals(peer, available.boards().getLast().leader().serverId());
        assertEquals(11, ranking.list(own, BoardKind.CHAPTER).own().score());
        assertEquals(guild, ranking.list(own, BoardKind.CROSS_GUILD).own().id());
        var zero = ranking.list(crossPeak, BoardKind.CROSS_POWER).own();
        assertEquals(0, zero.rank());
        assertEquals(0, zero.score());
        assertNull(ranking.list(localOnly, BoardKind.GUILD).own());
    }

    /** 详情只展示前五十，但仍返回原版榜内的真实本人第 51 名。 */
    @Test
    void retainsTheActualOwnRankOutsideTheDisplayedFifty() {
        String world = server("rank-pagination", "rank-pagination", true);
        for (int index = 0; index < 50; index++) {
            role(world, 40, 5 + index, 80, 0);
        }
        String own = role(world, 40, 4, 4, 0);

        var power = ranking.list(own, BoardKind.POWER);
        assertEquals(50, power.entries().size());
        assertEquals(54L, power.entries().getFirst().score());
        assertEquals(50, power.entries().getLast().rank());
        assertEquals(51, power.own().rank());
        assertEquals(own, power.own().id());
    }

    /** 每个榜只发一次 30,000 金币，重试保留现有回执，换日恢复资格并拒绝迟到的新请求。 */
    @Test
    void grantsExactlyOneLikePerBoardAndShanghaiDay() {
        String world = server("rank-like", "rank-like", true);
        String own = role(world, 40, 100, 150, 12);
        String follower = role(world, 41, 10, 50, 8);
        clock.setEpochSeconds(Instant.parse("2026-11-25T15:00:00Z").getEpochSecond());
        try {
            var resetAt = ranking.overview(own).resetAt();
            assertEquals(Instant.parse("2026-11-25T16:00:00Z").getEpochSecond(), resetAt);
            assertFalse(board(own, BoardKind.POWER).liked());
            var staleLeader = new LikeCommand(id(), BoardKind.POWER, follower, resetAt);
            reject("RANK_LEADER_CHANGED", () -> ranking.like(own, staleLeader));
            assertEquals(0, gold(own));

            var command = new LikeCommand(id(), BoardKind.POWER, own, resetAt);
            var result = ranking.like(own, command);
            assertEquals(Mode.TIPS, result.rewardNotice().mode());
            assertEquals(30000, gold(own));
            assertTrue(board(own, BoardKind.POWER).liked());
            assertEquals(result.rewardNotice(), ranking.like(own, command).rewardNotice());
            reject("RANK_REQUEST_CONFLICT", () -> ranking.like(own,
                    new LikeCommand(command.requestId(), BoardKind.CHAPTER, own, resetAt)));
            reject("RANK_ALREADY_LIKED", () -> ranking.like(own,
                    new LikeCommand(id(), BoardKind.POWER, own, resetAt)));
            assertEquals(30000, gold(own));

            ranking.like(own, new LikeCommand(id(), BoardKind.CHAPTER, own, resetAt));
            assertEquals(60000, gold(own));
            clock.setEpochSeconds(resetAt);
            assertFalse(board(own, BoardKind.POWER).liked());
            reject("RANK_LIKE_RESET", () -> ranking.like(own,
                    new LikeCommand(id(), BoardKind.POWER, own, resetAt)));
            assertEquals(result.rewardNotice(), ranking.like(own, command).rewardNotice());
            ranking.like(own, new LikeCommand(id(), BoardKind.POWER, own, ranking.overview(own).resetAt()));
            assertEquals(90000, gold(own));
        } finally {
            clock.reset();
        }
    }

    /** 同一角色并发重发相同请求只产生一笔实际发放，两个结果共享已提交回执。 */
    @Test
    void serializesAConcurrentRetryBehindTheRoleLock() throws Exception {
        String world = server("rank-like-retry", "rank-like-retry", true);
        String own = role(world, 40, 100, 100, 12);
        var command = new LikeCommand(id(), BoardKind.POWER, own, ranking.overview(own).resetAt());
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> {
                start.await();
                return ranking.like(own, command);
            });
            var second = pool.submit(() -> {
                start.await();
                return ranking.like(own, command);
            });
            start.countDown();
            assertEquals(first.get(10, TimeUnit.SECONDS).rewardNotice(), second.get(10, TimeUnit.SECONDS).rewardNotice());
        }
        assertEquals(30000, gold(own));
    }

    /** 找到已实际开放的榜，避免将空榜或门槛误当成未点赞状态。 */
    private Board board(String role, BoardKind kind) {
        return ranking.overview(role).boards().stream().filter(row -> row.kind() == kind).findFirst().orElseThrow();
    }

    /** 写入确定用于跨服过滤测试的服务器记录。 */
    private String server(String id, String region, boolean enabled) {
        jdbc.update("INSERT INTO game_server(id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,?)",
                id, region, region, id, enabled);
        return id;
    }

    /** 用真实角色主队投影、峰值和关卡记录驱动排名。 */
    private String role(String server, int level, int power, int peak, int chapter) {
        String id = id();
        jdbc.update("""
                INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,server_id,login_account,
                    current_main_power,max_main_power) VALUES (?,?,?,?,0,0,?,?,?,?)
                """, id, id, id, level, server, id, power, peak);
        if (chapter > 0) {
            jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,?)", id, chapter);
        }
        return id;
    }

    /** 建立实际公会及会长成员关系。 */
    private String guild(String server, String leader, String name) {
        String guild = id();
        jdbc.update("""
                INSERT INTO game_guild(id,server_id,name,name_key,description,leader_role_id,created_at_seconds)
                    VALUES (?,?,?,?,'',?,120)
                """, guild, server, name, name, leader);
        join(guild, leader);
        return guild;
    }

    /** 添加公会成员，真实历史峰值计入公会总分。 */
    private void join(String guild, String member) {
        jdbc.update("INSERT INTO game_guild_member(role_id,guild_id,joined_at_seconds) VALUES (?,?,200)", member, guild);
    }

    /** 直接读取持久钱包以核对实际发放，而非只看响应展示。 */
    private long gold(String role) {
        return jdbc.queryForObject("SELECT gold FROM game_role WHERE id=?", Long.class, role);
    }

    /** 断言服务器拒绝类别，避免通用异常被当成预期业务结果。 */
    private static void reject(String code, Executable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action).getReason());
    }

    /** 生成与线上协议一致的小写请求标识。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
