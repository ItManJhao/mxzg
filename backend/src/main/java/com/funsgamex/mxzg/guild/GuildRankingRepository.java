/** 公会排行的只读聚合查询，供 GuildRankingService 一次读取前百名和本人公会。 */
package com.funsgamex.mxzg.guild;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class GuildRankingRepository {
    /** 榜上位置和独立本人行的同一份读取结果。 */
    record RankedGuild(int rank, String guildId, String serverId, String name, int badgeId, String leaderName,
                       long power, boolean own) {}

    /** 共用数据源，仅执行公会成员和角色峰值的只读查询。 */
    private final JdbcTemplate jdbc;

    /** 装配当前项目的 JDBC 数据源。 */
    GuildRankingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * 以旧服的全体成员历史最高战力求和。零战力不上榜，成员未上榜时仍返回其真实公会资料。
     * 新版尚无公会达到该战力的时间，平分使用持久的创建时间与公会 ID 稳定排序。
     */
    List<RankedGuild> list(String serverId, String roleId, int limit) {
        return jdbc.query("""
            WITH totals AS (
                SELECT g.id, g.server_id, g.name, g.badge_id, g.created_at_seconds, leader.nickname AS leader_name,
                    COALESCE(SUM(r.max_main_power), 0) AS total_power
                FROM game_guild g
                JOIN game_role leader ON leader.id=g.leader_role_id
                LEFT JOIN game_guild_member m ON m.guild_id=g.id
                LEFT JOIN game_role r ON r.id=m.role_id AND r.server_id=g.server_id
                WHERE g.server_id=?
                GROUP BY g.id, g.server_id, g.name, g.badge_id, g.created_at_seconds, leader.nickname
            ), placements AS (
                SELECT totals.*,
                    CASE WHEN total_power>0 THEN ROW_NUMBER() OVER (
                        ORDER BY total_power DESC, created_at_seconds, id
                    ) ELSE 0 END AS placement
                FROM totals
            )
            SELECT p.id, p.server_id, p.name, p.badge_id, p.leader_name, p.total_power,
                CASE WHEN p.placement<=? THEN p.placement ELSE 0 END AS rank_number,
                CASE WHEN mine.role_id IS NULL THEN 0 ELSE 1 END AS is_own_guild
            FROM placements p
            LEFT JOIN game_guild_member mine ON mine.guild_id=p.id AND mine.role_id=?
            WHERE p.placement BETWEEN 1 AND ? OR mine.role_id IS NOT NULL
            ORDER BY p.placement, p.id
            """, (row, index) -> new RankedGuild(row.getInt("rank_number"), row.getString("id"),
                row.getString("server_id"), row.getString("name"), row.getInt("badge_id"), row.getString("leader_name"),
                row.getLong("total_power"), row.getBoolean("is_own_guild")), serverId, limit, roleId, limit);
    }
}
