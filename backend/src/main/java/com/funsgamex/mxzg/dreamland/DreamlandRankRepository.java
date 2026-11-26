/**
 * 持久化永恒梦境历史最高层、按区服结算游标与冻结奖励。
 * 结算和榜单写入共用每服锁，邮件已投递标记在独立事务中逐笔提交。
 */
package com.funsgamex.mxzg.dreamland;

import com.funsgamex.mxzg.reward.RewardReceiptPayloads.Frozen;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class DreamlandRankRepository {
    /** 所有查询使用应用事务绑定的数据库连接。 */
    private final JdbcTemplate jdbc;

    /** 已确认的历史最高层与到达 Unix 秒，存量 0 表示未知。 */
    record Best(String roleId, int floor, long achievedAtSeconds) {}

    /** 名次计算只使用最高层与达成时间，角色资料仅供展示。 */
    record RankRow(Best best, String name, int level, int headId, int headBorderId, long power) {}

    /** 同服同日每个角色只冻结一次奖励。 */
    record PrizeKey(String serverId, long periodEnd, String roleId) {}

    /** 只保存档位当时的附件和摘要，之后重试不读取新配置。 */
    record Prize(int rank, Frozen awards, String mailId, long retryAt) {}

    /** 注入生产连接，仓库不另启事务或自行获取角色锁。 */
    DreamlandRankRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 返回下一结算时刻，未初始化区服为 null。 */
    Long nextEnd(String serverId) {
        return jdbc.query("SELECT next_daily_end FROM game_dreamland_rank_schedule WHERE server_id=?",
                row -> row.next() ? row.getLong(1) : null, serverId);
    }

    /** 初始化后持锁读取实际结算时刻，两个并发初次访问只创建一个游标。 */
    long lockSchedule(String serverId, long firstEnd) {
        if (nextEnd(serverId) == null) {
            jdbc.update("""
                    INSERT INTO game_dreamland_rank_schedule(server_id,next_daily_end) VALUES (?,?)
                    ON DUPLICATE KEY UPDATE next_daily_end=next_daily_end
                    """, serverId, firstEnd);
        }
        return jdbc.queryForObject("""
                SELECT next_daily_end FROM game_dreamland_rank_schedule WHERE server_id=? FOR UPDATE
                """, Long.class, serverId);
    }

    /** 同一次冻结事务推进单个区服的结算游标。 */
    void saveNextEnd(String serverId, long nextEnd) {
        jdbc.update("UPDATE game_dreamland_rank_schedule SET next_daily_end=? WHERE server_id=?", nextEnd, serverId);
    }

    /** 尚未确认过胜场的角色没有最佳记录。 */
    Best best(String serverId, String roleId) {
        return jdbc.query("""
                SELECT floor,achieved_at FROM game_dreamland_rank_best WHERE server_id=? AND role_id=?
                """, row -> row.next() ? new Best(roleId, row.getInt(1), row.getLong(2)) : null, serverId, roleId);
    }

    /** 调用方持有角色与榜单锁，只提高历史记录，不重写同层的达成时间。 */
    void saveBest(String serverId, Best best) {
        var previous = best(serverId, best.roleId());
        if (previous == null) {
            jdbc.update("""
                    INSERT INTO game_dreamland_rank_best(role_id,server_id,floor,achieved_at)
                    VALUES (?,?,?,?)
                    """, best.roleId(), serverId, best.floor(), best.achievedAtSeconds());
        } else if (best.floor() > previous.floor()) {
            jdbc.update("""
                    UPDATE game_dreamland_rank_best SET floor=?,achieved_at=? WHERE server_id=? AND role_id=?
                    """, best.floor(), best.achievedAtSeconds(), serverId, best.roleId());
        }
    }

    /** 当前榜只查询前一百。到达时间相同时用角色号稳定断开并列。 */
    List<RankRow> board(String serverId, int limit) {
        return jdbc.query("""
                SELECT b.role_id,b.floor,b.achieved_at,r.nickname,r.role_level,r.head_id,r.border_id,
                       COALESCE(r.current_main_power,0)
                FROM game_dreamland_rank_best b JOIN game_role r ON r.id=b.role_id
                WHERE b.server_id=? ORDER BY b.floor DESC,b.achieved_at,b.role_id LIMIT ?
                """, (row, index) -> new RankRow(new Best(row.getString(1), row.getInt(2), row.getLong(3)),
                        row.getString(4), row.getInt(5), row.getInt(6), row.getInt(7), row.getLong(8)), serverId, limit);
    }

    /** 读取上海零点之前的胜场，零点同秒的达成属于新一天。 */
    List<String> winners(String serverId, long cutoff, int limit) {
        return jdbc.queryForList("""
                SELECT role_id FROM game_dreamland_rank_best WHERE server_id=? AND achieved_at<?
                ORDER BY floor DESC,achieved_at,role_id LIMIT ?
                """, String.class, serverId, cutoff, limit);
    }

    /** 冻结结算时的名次、附件和摘要。 */
    void savePrize(PrizeKey key, int rank, Frozen awards) {
        jdbc.update("""
                INSERT INTO game_dreamland_rank_prize(server_id,period_end,role_id,rank_place,awards_json,awards_hash)
                VALUES (?,?,?,?,?,?)
                """, key.serverId(), key.periodEnd(), key.roleId(), rank, awards.json(), awards.hash());
    }

    /** 查询本轮到期的少量邮件键，投递前由锁内校验最新状态。 */
    List<PrizeKey> pending(long now, int limit) {
        return jdbc.query("""
                SELECT server_id,period_end,role_id FROM game_dreamland_rank_prize
                WHERE mail_id IS NULL AND retry_at<=? ORDER BY period_end,server_id,rank_place LIMIT ?
                """, (row, index) -> new PrizeKey(row.getString(1), row.getLong(2), row.getString(3)), now, limit);
    }

    /** 同一奖励的并行投递只允许一个事务尝试。 */
    Prize lockPrize(PrizeKey key) {
        return jdbc.queryForObject("""
                SELECT rank_place,awards_json,awards_hash,mail_id,retry_at FROM game_dreamland_rank_prize
                WHERE server_id=? AND period_end=? AND role_id=? FOR UPDATE
                """, (row, index) -> new Prize(row.getInt(1),
                        new Frozen(row.getString(2), row.getString(3)), row.getString(4), row.getLong(5)),
                key.serverId(), key.periodEnd(), key.roleId());
    }

    /** 标记已在当前事务中写入信箱，随后维护可跳过该奖励。 */
    void markDelivered(PrizeKey key, String mailId) {
        jdbc.update("""
                UPDATE game_dreamland_rank_prize SET mail_id=? WHERE server_id=? AND period_end=? AND role_id=?
                """, mailId, key.serverId(), key.periodEnd(), key.roleId());
    }

    /** 为投递失败的单份邮件推迟重试，已投递记录不再变更。 */
    void delay(PrizeKey key, long retryAt) {
        jdbc.update("""
                UPDATE game_dreamland_rank_prize SET retry_at=? WHERE server_id=? AND period_end=?
                    AND role_id=? AND mail_id IS NULL AND retry_at<?
                """, retryAt, key.serverId(), key.periodEnd(), key.roleId(), retryAt);
    }
}
