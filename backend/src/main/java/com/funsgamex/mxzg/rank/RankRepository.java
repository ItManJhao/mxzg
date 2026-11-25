/** 排行榜的真实角色分值查询与点赞回执存取；排行榜本身无需缓存表或客户端上报。 */
package com.funsgamex.mxzg.rank;

import com.funsgamex.mxzg.rank.RankService.BoardKind;
import com.funsgamex.mxzg.rank.RankService.Entry;
import com.funsgamex.mxzg.rank.RankService.LikeCommand;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads.Frozen;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class RankRepository {
    /** 使用同一 JDBC 事务连接，以命名参数展开由服务端查得的区服列表。 */
    private final NamedParameterJdbcTemplate jdbc;

    /** 持久原请求的资格字段和冻结奖励。 */
    record Stored(LikeCommand command, String noticeJson, String noticeHash) {}

    /** 从项目单一数据源读取，不创建独立连接或区服实例。 */
    RankRepository(JdbcTemplate jdbc) {
        this.jdbc = new NamedParameterJdbcTemplate(jdbc);
    }

    /** 按持久已胜关卡或当前战力读榜。同分暂按持久创角时间、角色 ID 排序。 */
    List<Entry> players(BoardKind kind, List<String> serverIds, String roleId, int limit) {
        if (serverIds.isEmpty()) {
            return List.of();
        }
        String score = switch (kind) {
            case CHAPTER -> "COALESCE(chapter.max_cleared, 0)";
            case POWER, CROSS_POWER -> "COALESCE(r.current_main_power, 0)";
            default -> throw new IllegalArgumentException("该排行榜不是个人榜");
        };
        String chapterJoin = kind == BoardKind.CHAPTER ? "LEFT JOIN game_main_chapter chapter ON chapter.role_id=r.id" : "";
        var parameters = new MapSqlParameterSource().addValue("serverIds", serverIds)
                .addValue("limit", limit).addValue("roleId", roleId);
        return jdbc.query("""
            WITH scores AS (
                SELECT r.id, r.server_id, r.nickname, r.role_level, r.head_id, r.border_id, r.created_at_seconds,
                    %s AS rank_score
                FROM game_role r %s
                WHERE r.server_id IN (:serverIds)
            ), ranked AS (
                SELECT scores.*, ROW_NUMBER() OVER (ORDER BY rank_score DESC, created_at_seconds, id) AS place_number
                FROM scores
            )
            SELECT id, server_id, nickname, role_level, head_id, border_id, rank_score,
                CASE WHEN rank_score>0 AND place_number<=:limit THEN place_number ELSE 0 END AS rank_number
            FROM ranked
            WHERE (rank_score>0 AND place_number<=:limit) OR id=:roleId
            ORDER BY place_number, id
            """.formatted(score, chapterJoin), parameters, (row, index) -> new Entry(row.getInt("rank_number"),
                row.getString("id"), row.getString("server_id"), row.getString("nickname"),
                row.getLong("rank_score"), row.getInt("role_level"), row.getInt("head_id"),
                row.getInt("border_id"), 0, ""));
    }

    /** 只查当前角色在指定自然日内已经点过的榜，不加载历史奖励载荷。 */
    Set<BoardKind> liked(String roleId, long resetAt) {
        return Set.copyOf(jdbc.query("""
                SELECT board_kind FROM game_rank_like WHERE role_id=:roleId AND reset_at_seconds=:resetAt
                """, new MapSqlParameterSource("roleId", roleId).addValue("resetAt", resetAt),
                (row, index) -> BoardKind.valueOf(row.getString("board_kind"))));
    }

    /** 同角色同请求重试时找回不可变奖励；未发生过则返回 null。 */
    Stored receipt(String roleId, String requestId) {
        return jdbc.query("""
                SELECT board_kind, target_id, reset_at_seconds, notice_json, notice_hash
                FROM game_rank_like WHERE role_id=:roleId AND request_id=:requestId
                """, new MapSqlParameterSource("roleId", roleId).addValue("requestId", requestId), (row, index) ->
                new Stored(new LikeCommand(requestId, BoardKind.valueOf(row.getString("board_kind")),
                    row.getString("target_id"), row.getLong("reset_at_seconds")), row.getString("notice_json"),
                    row.getString("notice_hash"))).stream().findFirst().orElse(null);
    }

    /** 与该次点赞的实际奖励同事务写入，数据库防止同日同榜重复。 */
    void insert(String roleId, LikeCommand command, Frozen notice) {
        jdbc.update("""
                INSERT INTO game_rank_like(role_id, request_id, board_kind, reset_at_seconds, target_id, notice_json, notice_hash)
                VALUES (:roleId, :requestId, :kind, :resetAt, :targetId, :json, :hash)
                """, new MapSqlParameterSource("roleId", roleId).addValue("requestId", command.requestId())
                .addValue("kind", command.kind().name()).addValue("resetAt", command.resetAt())
                .addValue("targetId", command.targetId()).addValue("json", notice.json()).addValue("hash", notice.hash()));
    }
}
