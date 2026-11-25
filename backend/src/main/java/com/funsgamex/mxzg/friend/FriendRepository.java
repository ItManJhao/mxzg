/** 好友私有关系、礼物和回执的持久化。业务锁与发奖由 FriendService 同一事务负责。 */
package com.funsgamex.mxzg.friend;

import com.funsgamex.mxzg.friend.FriendService.Action;
import com.funsgamex.mxzg.friend.FriendService.Command;
import com.funsgamex.mxzg.friend.FriendService.Entry;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads.Frozen;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class FriendRepository {
    /** 四个页签与搜索只公开角色业务资料。 */
    private static final String PROFILE = "r.id, r.server_id, r.nickname, r.role_level, r.head_id, r.border_id, "
            + "r.current_main_power, r.last_login_at_seconds";
    /** 没有赠送上下文的查询复用相同投影，但不读取任何其他角色礼物。 */
    private static final String DEFAULT_FLAGS = ", 0 AS gift_state, FALSE AS sent_today, FALSE AS requested";
    /** JDBC 共用连接只执行当前角色授权的表读写。 */
    private final NamedParameterJdbcTemplate jdbc;

    /** 同一业务编号的原始操作与可选通用奖励反馈。 */
    record Receipt(Command command, String noticeJson, String noticeHash) {}

    /** 批量选取候选前保留最后登录时间，判断旧版七天不活跃的好友。 */
    record Recipient(String id, long lastLoginAt) {}

    /** 装配现有数据源，与外层业务事务共用连接。 */
    FriendRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 返回当前角色好友及该上海自然日内分向的礼物状态。 */
    List<Entry> friends(String roleId, long resetAt) {
        return jdbc.query("""
                SELECT %s,
                    CASE WHEN incoming.delivered=TRUE THEN CASE WHEN incoming.claimed=TRUE THEN 2 ELSE 1 END ELSE 0 END AS gift_state,
                    CASE WHEN outgoing.sender_id IS NULL THEN FALSE ELSE TRUE END AS sent_today, FALSE AS requested
                FROM game_friend_relation f JOIN game_role r ON r.id=f.target_id
                LEFT JOIN game_friend_gift incoming ON incoming.sender_id=f.target_id
                    AND incoming.recipient_id=f.role_id AND incoming.reset_at_seconds=:resetAt
                LEFT JOIN game_friend_gift outgoing ON outgoing.sender_id=f.role_id
                    AND outgoing.recipient_id=f.target_id AND outgoing.reset_at_seconds=:resetAt
                WHERE f.role_id=:roleId
                ORDER BY r.last_login_at_seconds DESC, r.current_main_power DESC, r.id
                """.formatted(PROFILE), actorDay(roleId, resetAt), FriendRepository::entry);
    }

    /** 列出发给当前角色的申请，按申请时间排序。 */
    List<Entry> applications(String roleId) {
        return jdbc.query("""
                SELECT %s%s FROM game_friend_application a JOIN game_role r ON r.id=a.requester_id
                WHERE a.recipient_id=:roleId ORDER BY a.created_at_seconds DESC, r.id
                """.formatted(PROFILE, DEFAULT_FLAGS), actor(roleId), FriendRepository::entry);
    }

    /** 列出当前角色主动加入的黑名单，不公开对方的黑名单。 */
    List<Entry> blocked(String roleId) {
        return jdbc.query("""
                SELECT %s%s FROM game_friend_block b JOIN game_role r ON r.id=b.target_id
                WHERE b.role_id=:roleId ORDER BY b.created_at_seconds DESC, r.id
                """.formatted(PROFILE, DEFAULT_FLAGS), actor(roleId), FriendRepository::entry);
    }

    /** 名称模糊查询限定本区，空查询只使用可信在线角色集合。 */
    List<Entry> search(String roleId, String serverId, String query, Set<String> onlineIds, int limit) {
        if (query.isEmpty() && onlineIds.isEmpty()) {
            return List.of();
        }
        var parameters = actor(roleId).addValue("serverId", serverId).addValue("limit", limit);
        String filter;
        if (query.isEmpty()) {
            filter = "r.id IN (:onlineIds)";
            parameters.addValue("onlineIds", onlineIds);
        } else {
            filter = "LOCATE(LOWER(:query), LOWER(r.nickname))>0";
            parameters.addValue("query", query);
        }
        return jdbc.query("""
                SELECT %s, 0 AS gift_state, FALSE AS sent_today,
                    CASE WHEN pending.requester_id IS NULL THEN FALSE ELSE TRUE END AS requested
                FROM game_role r
                LEFT JOIN game_friend_application pending ON pending.requester_id=:roleId AND pending.recipient_id=r.id
                WHERE r.server_id=:serverId AND r.id<>:roleId AND r.first_named=TRUE AND %s
                    AND NOT EXISTS(SELECT 1 FROM game_friend_relation f WHERE f.role_id=:roleId AND f.target_id=r.id)
                    AND NOT EXISTS(SELECT 1 FROM game_friend_block b
                        WHERE (b.role_id=:roleId AND b.target_id=r.id) OR (b.role_id=r.id AND b.target_id=:roleId))
                ORDER BY r.last_login_at_seconds DESC, r.nickname, r.id LIMIT :limit
                """.formatted(PROFILE, filter), parameters, FriendRepository::entry);
    }

    /** 读取本角色真实友情点库存，不复制或增加独立余额。 */
    long friendship(String roleId) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(quantity),0) FROM game_inventory WHERE role_id=:roleId AND item_id=:itemId",
                actor(roleId).addValue("itemId", FriendRules.FRIENDSHIP_ITEM_ID), Long.class);
    }

    /** 返回当前角色实际好友数量，用于上限校验。 */
    int friendCount(String roleId) {
        return count("SELECT COUNT(*) FROM game_friend_relation WHERE role_id=:roleId", actor(roleId));
    }

    /** 返回当前角色主动拉黑的总数。 */
    int blockCount(String roleId) {
        return count("SELECT COUNT(*) FROM game_friend_block WHERE role_id=:roleId", actor(roleId));
    }

    /** 权威检查两人是否已有好友关系。 */
    boolean friends(String roleId, String targetId) {
        return count("SELECT COUNT(*) FROM game_friend_relation WHERE role_id=:roleId AND target_id=:targetId",
                pair(roleId, targetId)) > 0;
    }

    /** 源角色是否主动拉黑目标。 */
    boolean blocked(String roleId, String targetId) {
        return count("SELECT COUNT(*) FROM game_friend_block WHERE role_id=:roleId AND target_id=:targetId",
                pair(roleId, targetId)) > 0;
    }

    /** 检查请求人发给接收人的申请是否仍有效。 */
    boolean application(String requester, String recipient) {
        return count("SELECT COUNT(*) FROM game_friend_application WHERE requester_id=:roleId AND recipient_id=:targetId",
                pair(requester, recipient)) > 0;
    }

    /** 同时创建两个方向的永久好友关系。 */
    void addFriends(String roleId, String targetId) {
        jdbc.update("INSERT INTO game_friend_relation(role_id,target_id) VALUES (:roleId,:targetId),(:targetId,:roleId)",
                pair(roleId, targetId));
    }

    /** 移除双向好友关系与这对角色今天未领的礼物，保留次数和回执。 */
    void removeFriends(String roleId, String targetId, long resetAt) {
        jdbc.update("""
                DELETE FROM game_friend_relation WHERE (role_id=:roleId AND target_id=:targetId)
                    OR (role_id=:targetId AND target_id=:roleId)
                """, pair(roleId, targetId));
        jdbc.update("""
                UPDATE game_friend_gift SET delivered=FALSE WHERE reset_at_seconds=:resetAt AND claimed=FALSE
                    AND ((sender_id=:roleId AND recipient_id=:targetId) OR (sender_id=:targetId AND recipient_id=:roleId))
                """, pair(roleId, targetId).addValue("resetAt", resetAt));
    }

    /** 保存一条从请求人到接收人的申请。 */
    void addApplication(String requester, String recipient, long now) {
        jdbc.update("INSERT INTO game_friend_application(requester_id,recipient_id,created_at_seconds) VALUES (:roleId,:targetId,:now)",
                pair(requester, recipient).addValue("now", now));
    }

    /** 删除申请人发出的指定申请，返回它此前是否存在。 */
    boolean removeApplication(String requester, String recipient) {
        return jdbc.update("DELETE FROM game_friend_application WHERE requester_id=:roleId AND recipient_id=:targetId",
                pair(requester, recipient)) > 0;
    }

    /** 将目标加入源角色黑名单。 */
    void addBlock(String roleId, String targetId, long now) {
        jdbc.update("INSERT INTO game_friend_block(role_id,target_id,created_at_seconds) VALUES (:roleId,:targetId,:now)",
                pair(roleId, targetId).addValue("now", now));
    }

    /** 删除定向黑名单关系并返回是否删除成功。 */
    boolean removeBlock(String roleId, String targetId) {
        return jdbc.update("DELETE FROM game_friend_block WHERE role_id=:roleId AND target_id=:targetId", pair(roleId, targetId)) > 0;
    }

    /** 查询自然日内已用送礼次数，含批量计入但不实际赠送的非活跃好友。 */
    int sentToday(String roleId, long resetAt) {
        return count("SELECT COUNT(*) FROM game_friend_gift WHERE sender_id=:roleId AND reset_at_seconds=:resetAt", actorDay(roleId, resetAt));
    }

    /** 查询自然日内已领取的份数，包括超额奖励。 */
    int claimedToday(String roleId, long resetAt) {
        return count("SELECT COUNT(*) FROM game_friend_gift WHERE recipient_id=:roleId AND reset_at_seconds=:resetAt AND claimed=TRUE",
                actorDay(roleId, resetAt));
    }

    /** 检查是否已计为送给该好友。 */
    boolean sentTo(String roleId, String targetId, long resetAt) {
        return count("""
                SELECT COUNT(*) FROM game_friend_gift WHERE sender_id=:roleId AND recipient_id=:targetId AND reset_at_seconds=:resetAt
                """, pair(roleId, targetId).addValue("resetAt", resetAt)) > 0;
    }

    /** 列出尚未计入赠送的真实好友，近期登陆的角色优先。 */
    List<Recipient> unsent(String roleId, long resetAt) {
        return jdbc.query("""
                SELECT r.id,r.last_login_at_seconds FROM game_friend_relation f JOIN game_role r ON r.id=f.target_id
                WHERE f.role_id=:roleId AND NOT EXISTS(SELECT 1 FROM game_friend_gift gift
                    WHERE gift.sender_id=:roleId AND gift.recipient_id=r.id AND gift.reset_at_seconds=:resetAt)
                ORDER BY r.last_login_at_seconds DESC,r.current_main_power DESC,r.id
                """, actorDay(roleId, resetAt), (row, index) -> new Recipient(row.getString("id"), row.getLong("last_login_at_seconds")));
    }

    /** 插入当日一个已用赠送名额，只有送达的礼物可被领取。 */
    void addGift(String roleId, String targetId, long resetAt, boolean delivered) {
        jdbc.update("""
                INSERT INTO game_friend_gift(sender_id,recipient_id,reset_at_seconds,delivered)
                VALUES (:roleId,:targetId,:resetAt,:delivered)
                """, pair(roleId, targetId).addValue("resetAt", resetAt).addValue("delivered", delivered));
    }

    /** 单领或一键领取只标记真实未领礼物，由事务根据实际份数计算奖励。 */
    int claim(String roleId, String senderId, long resetAt) {
        var parameters = actorDay(roleId, resetAt).addValue("senderId", senderId);
        String senderFilter = senderId == null ? "" : " AND sender_id=:senderId";
        return jdbc.update("""
                UPDATE game_friend_gift SET claimed=TRUE WHERE recipient_id=:roleId AND reset_at_seconds=:resetAt
                    AND delivered=TRUE AND claimed=FALSE
                """ + senderFilter, parameters);
    }

    /** 读取同请求的持久结果，用于重试时核对原业务。 */
    Receipt receipt(String roleId, String requestId) {
        return jdbc.query("""
                SELECT action,target_id,reset_at_seconds,notice_json,notice_hash FROM game_friend_change
                WHERE role_id=:roleId AND request_id=:requestId
                """, actor(roleId).addValue("requestId", requestId), (row, index) -> new Receipt(
                    new Command(requestId, Action.valueOf(row.getString("action")), row.getString("target_id"), row.getLong("reset_at_seconds")),
                    row.getString("notice_json"), row.getString("notice_hash"))).stream().findFirst().orElse(null);
    }

    /** 同实际事务保存原操作和可重放的奖励展示。 */
    void saveReceipt(String roleId, Command command, Frozen notice) {
        jdbc.update("""
                INSERT INTO game_friend_change(role_id,request_id,action,target_id,reset_at_seconds,notice_json,notice_hash)
                VALUES (:roleId,:requestId,:action,:targetId,:resetAt,:noticeJson,:noticeHash)
                """, pair(roleId, command.targetId()).addValue("requestId", command.requestId())
                    .addValue("action", command.action().name()).addValue("resetAt", command.resetAt())
                    .addValue("noticeJson", notice == null ? null : notice.json())
                    .addValue("noticeHash", notice == null ? null : notice.hash()));
    }

    /** 映射公开资料，并区分申请、送礼与领取状态。 */
    private static Entry entry(ResultSet row, int index) throws SQLException {
        return new Entry(row.getString("id"), row.getString("server_id"), row.getString("nickname"), row.getInt("role_level"),
                row.getInt("head_id"), row.getInt("border_id"), row.getLong("current_main_power"), row.getLong("last_login_at_seconds"),
                row.getInt("gift_state"), row.getBoolean("sent_today"), row.getBoolean("requested"));
    }

    /** 统一读取 SQL 聚合计数。 */
    private int count(String sql, MapSqlParameterSource parameters) {
        return jdbc.queryForObject(sql, parameters, Integer.class);
    }

    /** 为当前角色条件绑定业务参数。 */
    private static MapSqlParameterSource actor(String roleId) {
        return new MapSqlParameterSource("roleId", roleId);
    }

    /** 为一对角色绑定来源及目标。 */
    private static MapSqlParameterSource pair(String roleId, String targetId) {
        return actor(roleId).addValue("targetId", targetId);
    }

    /** 为分日统计绑定当前期次。 */
    private static MapSqlParameterSource actorDay(String roleId, long resetAt) {
        return actor(roleId).addValue("resetAt", resetAt);
    }
}
