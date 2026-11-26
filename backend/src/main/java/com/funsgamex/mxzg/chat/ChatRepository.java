/** 持久消息、已读游标和发送回执。频道及房间由服务端确认后才交给查询。 */
package com.funsgamex.mxzg.chat;

import com.funsgamex.mxzg.chat.ChatService.Conversation;
import com.funsgamex.mxzg.chat.ChatService.Message;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class ChatRepository {
    /** 历史页面、单条回执及系统记录使用同一冻结字段。 */
    private static final String MESSAGE_COLUMNS = """
            m.id, m.sender_id, m.sender_name, m.avatar_id, m.border_id, m.sender_level,
            m.content, m.sent_at_seconds, m.channel_type, m.server_id, m.notice_id
            """;

    /** 读取当前房间，同时应用接收方屏蔽关系与频道可见时间。 */
    private static final String VISIBLE = """
            m.channel_type=? AND m.room_key=? AND m.sent_at_seconds>=? AND NOT EXISTS (
                SELECT 1 FROM game_friend_block b WHERE b.role_id=? AND b.target_id=m.sender_id
            )
            """;

    /** 事务连接供应分页、游标和发送回执的读写。 */
    private final JdbcTemplate jdbc;

    /** 原操作绑定房间和摘要，记录超出正文时间窗口后仍可验证重试。 */
    record Receipt(long messageId, ChatRoom room, String contentHash) {}

    /** 当前接收者的可见窗口边界和来自他人的未读数。 */
    record Counters(long oldestId, long latestId, int unreadCount) {}

    /** 复用应用数据源的事务连接。 */
    ChatRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 读取同服公会身份，缺少成员关系时返回空。 */
    String guild(String serverId, String roleId) {
        return jdbc.query("""
                SELECT g.id FROM game_guild_member member JOIN game_guild g ON g.id=member.guild_id
                WHERE member.role_id=? AND g.server_id=?
                """, (row, index) -> row.getString(1), roleId, serverId).stream().findFirst().orElse(null);
    }

    /** 收集当前公会成员用于事务提交后的定向刷新。 */
    Set<String> guildAudience(String guildId, String senderId) {
        return Set.copyOf(jdbc.query("""
                SELECT member.role_id FROM game_guild_member member WHERE member.guild_id=? AND NOT EXISTS (
                    SELECT 1 FROM game_friend_block b WHERE b.role_id=member.role_id AND b.target_id=?
                )
                """, (row, index) -> row.getString(1), guildId, senderId));
    }

    /** 双向有效好友才能访问私聊，任一方拉黑会立即撤回访问。 */
    boolean friends(String serverId, String roleId, String peerId) {
        return !jdbc.query("""
                SELECT p.id FROM game_friend_relation f
                JOIN game_friend_relation reciprocal ON reciprocal.role_id=f.target_id AND reciprocal.target_id=f.role_id
                JOIN game_role p ON p.id=f.target_id AND p.server_id=?
                WHERE f.role_id=? AND f.target_id=?
                    AND NOT EXISTS (SELECT 1 FROM game_friend_block b WHERE
                        (b.role_id=f.role_id AND b.target_id=f.target_id) OR
                        (b.role_id=f.target_id AND b.target_id=f.role_id))
                """, (row, index) -> row.getString(1), serverId, roleId, peerId).isEmpty();
    }

    /** 找到仍在好友列表且有可见消息的私聊，按最近消息倒序并计算未读。 */
    List<Conversation> conversations(String serverId, String roleId, long since) {
        return jdbc.query("""
                SELECT p.id, p.nickname, p.head_id, p.border_id, p.role_level, MAX(m.id) AS latest_id,
                    SUM(CASE WHEN m.id>COALESCE(seen.read_through_id,0) AND m.sender_id<>f.role_id
                        THEN 1 ELSE 0 END) AS unread_count
                FROM game_friend_relation f
                JOIN game_friend_relation reciprocal ON reciprocal.role_id=f.target_id AND reciprocal.target_id=f.role_id
                JOIN game_role p ON p.id=f.target_id AND p.server_id=?
                JOIN game_chat_message m ON m.channel_type=5 AND m.room_key=CASE
                    WHEN f.role_id<f.target_id THEN CONCAT(f.role_id,':',f.target_id)
                    ELSE CONCAT(f.target_id,':',f.role_id) END
                LEFT JOIN game_chat_read seen ON seen.role_id=f.role_id AND seen.channel_type=5 AND seen.room_key=m.room_key
                WHERE f.role_id=? AND m.sent_at_seconds>=?
                    AND NOT EXISTS (SELECT 1 FROM game_friend_block b WHERE
                        (b.role_id=f.role_id AND b.target_id=f.target_id) OR
                        (b.role_id=f.target_id AND b.target_id=f.role_id))
                GROUP BY p.id, p.nickname, p.head_id, p.border_id, p.role_level
                ORDER BY latest_id DESC
                """, (row, index) -> new Conversation(row.getString("id"), row.getString("nickname"),
                row.getInt("head_id"), row.getInt("border_id"), row.getInt("role_level"),
                row.getInt("unread_count"), row.getLong("latest_id")), serverId, roleId, since);
    }

    /** 首次使用房间时初始化写锁，保持该房间消息编号与提交顺序一致。 */
    void lockChannel(ChatRoom room) {
        jdbc.update("""
                INSERT INTO game_chat_room (channel_type,room_key) VALUES (?,?)
                ON DUPLICATE KEY UPDATE room_key=room_key
                """, room.channel().wireId(), room.key());
    }

    /** 返回同角色操作的范围、签名及已提交消息号。 */
    Receipt receipt(String roleId, String requestId) {
        return jdbc.query("""
                SELECT message_id,channel_type,room_key,content_hash FROM game_chat_receipt
                WHERE sender_id=? AND request_id=?
                """, (row, index) -> new Receipt(row.getLong("message_id"), new ChatRoom(
                ChatChannel.fromWire(row.getInt("channel_type")), row.getString("room_key")), row.getString("content_hash")),
                roleId, requestId).stream().findFirst().orElse(null);
    }

    /** 重试仍可读出当前房间留存期内的原消息及冻结资料。 */
    Message message(ChatRoom room, long id, long since) {
        return jdbc.query("SELECT " + MESSAGE_COLUMNS + " FROM game_chat_message m"
                        + " WHERE m.channel_type=? AND m.room_key=? AND m.id=? AND m.sent_at_seconds>=?",
                ChatRepository::messageRow, room.channel().wireId(), room.key(), id, since).stream().findFirst().orElse(null);
    }

    /** 取得末次非私聊发送时间，已裁剪正文及换线重连都保留限频。 */
    Long lastPublicSentAt(String roleId) {
        return jdbc.query("""
                SELECT sent_at_seconds FROM game_chat_receipt
                WHERE sender_id=? AND channel_type<>5 ORDER BY message_id DESC LIMIT 1
                """, (row, index) -> row.getLong(1), roleId).stream().findFirst().orElse(null);
    }

    /** 保存可见消息。系统没有角色发送者，以 SQL NULL 存储。 */
    long insertMessage(ChatRoom room, Message message) {
        var keys = new GeneratedKeyHolder();
        int inserted = jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                    INSERT INTO game_chat_message
                        (server_id,sender_id,sender_name,avatar_id,border_id,sender_level,content,sent_at_seconds,
                            channel_type,room_key,notice_id)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)
                    """, new String[]{"id"});
            statement.setString(1, message.serverId());
            if (message.roleId().isEmpty()) {
                statement.setNull(2, Types.VARCHAR);
            } else {
                statement.setString(2, message.roleId());
            }
            statement.setString(3, message.name());
            statement.setInt(4, message.avatarId());
            statement.setInt(5, message.borderId());
            statement.setInt(6, message.level());
            statement.setString(7, message.text());
            statement.setLong(8, message.sentAtSeconds());
            statement.setInt(9, room.channel().wireId());
            statement.setString(10, room.key());
            if (message.noticeId() == 0) {
                statement.setNull(11, Types.INTEGER);
            } else {
                statement.setInt(11, message.noticeId());
            }
            return statement;
        }, keys);
        Number key = keys.getKey();
        if (inserted != 1 || key == null || key.longValue() <= 0) {
            throw new IllegalStateException("聊天未生成有效消息编号");
        }
        return key.longValue();
    }

    /** 写入轻量回执，裁剪正文后仍保留幂等身份和限频水位。 */
    void saveReceipt(ChatRoom room, String requestId, String contentHash, Message message) {
        jdbc.update("""
                INSERT INTO game_chat_receipt
                    (message_id,server_id,sender_id,request_id,content_hash,sent_at_seconds,channel_type,room_key)
                VALUES (?,?,?,?,?,?,?,?)
                """, message.id(), message.serverId(), message.roleId(), requestId, contentHash,
                message.sentAtSeconds(), room.channel().wireId(), room.key());
    }

    /** 在房间锁内裁剪按时间或数量超出当前频道保留窗口的消息。 */
    void trim(ChatRoom room, long since) {
        int channel = room.channel().wireId();
        if (since > 0) {
            jdbc.update("DELETE FROM game_chat_message WHERE channel_type=? AND room_key=? AND sent_at_seconds<?",
                    channel, room.key(), since);
        }
        var oldest = jdbc.query("""
                SELECT id FROM game_chat_message WHERE channel_type=? AND room_key=? ORDER BY id DESC LIMIT 1 OFFSET ?
                """, (row, index) -> row.getLong(1), channel, room.key(), room.channel().retention() - 1);
        if (!oldest.isEmpty()) {
            jdbc.update("DELETE FROM game_chat_message WHERE channel_type=? AND room_key=? AND id<?",
                    channel, room.key(), oldest.getFirst());
        }
    }

    /** 最近和往前分页倒序取一页；恢复补读从当前游标正序取。 */
    List<Message> page(ChatRoom room, String roleId, long since, long afterId, long beforeId, int pageSize) {
        String query = "SELECT " + MESSAGE_COLUMNS + " FROM game_chat_message m WHERE " + VISIBLE;
        int channel = room.channel().wireId();
        if (afterId > 0) {
            return jdbc.query(query + " AND m.id>? ORDER BY m.id ASC LIMIT ?",
                    ChatRepository::messageRow, channel, room.key(), since, roleId, afterId, pageSize);
        }
        if (beforeId > 0) {
            return jdbc.query(query + " AND m.id<? ORDER BY m.id DESC LIMIT ?",
                    ChatRepository::messageRow, channel, room.key(), since, roleId, beforeId, pageSize).reversed();
        }
        return jdbc.query(query + " ORDER BY m.id DESC LIMIT ?",
                ChatRepository::messageRow, channel, room.key(), since, roleId, pageSize).reversed();
    }

    /** 私聊与公共频道共用可见范围校验；本人的消息不生未读，系统消息正常计数。 */
    Counters counters(ChatRoom room, String roleId, long since, long readThroughId) {
        return jdbc.queryForObject("""
                SELECT COALESCE(MIN(m.id),0) AS oldest_id, COALESCE(MAX(m.id),0) AS latest_id,
                    COALESCE(SUM(CASE WHEN m.id>? AND (m.sender_id IS NULL OR m.sender_id<>?) THEN 1 ELSE 0 END),0)
                        AS unread_count
                FROM game_chat_message m WHERE
                """ + VISIBLE, (row, index) -> new Counters(row.getLong("oldest_id"), row.getLong("latest_id"),
                row.getInt("unread_count")), readThroughId, roleId, room.channel().wireId(), room.key(), since, roleId);
    }

    /** 己方该房间已确认的最高可见编号，首次确认前返回零。 */
    long readThroughId(ChatRoom room, String roleId) {
        return jdbc.query("""
                SELECT read_through_id FROM game_chat_read WHERE role_id=? AND channel_type=? AND room_key=?
                """, (row, index) -> row.getLong(1), roleId, room.channel().wireId(), room.key()).stream()
                .findFirst().orElse(0L);
    }

    /** 只允许确认当前房间、当前接收方真实可见的留存记录。 */
    boolean visible(ChatRoom room, String roleId, long since, long id) {
        return !jdbc.query("SELECT m.id FROM game_chat_message m WHERE " + VISIBLE + " AND m.id=?",
                (row, index) -> row.getLong(1), room.channel().wireId(), room.key(), since, roleId, id).isEmpty();
    }

    /** 同房间确有此编号且正文已超出留存时容忍迟到确认，原已读水位保持不变。 */
    boolean expired(ChatRoom room, long since, long id) {
        return !jdbc.query("""
                SELECT r.message_id FROM game_chat_receipt r WHERE r.channel_type=? AND r.room_key=? AND r.message_id=?
                    AND NOT EXISTS (SELECT 1 FROM game_chat_message m WHERE m.id=r.message_id AND m.sent_at_seconds>=?)
                """, (row, index) -> row.getLong(1), room.channel().wireId(), room.key(), id, since).isEmpty();
    }

    /** 在角色锁内单调推进指定房间的已读，不修改其余频道或资产状态。 */
    void advanceRead(ChatRoom room, String roleId, long previouslyRead, long throughId) {
        if (previouslyRead == 0) {
            jdbc.update("INSERT INTO game_chat_read (role_id,channel_type,room_key,read_through_id) VALUES (?,?,?,?)",
                    roleId, room.channel().wireId(), room.key(), throughId);
        } else {
            jdbc.update("UPDATE game_chat_read SET read_through_id=? WHERE role_id=? AND channel_type=? AND room_key=?",
                    throughId, roleId, room.channel().wireId(), room.key());
        }
    }

    /** 将冻结资料映射为回包记录，系统消息的角色号留空。 */
    private static Message messageRow(ResultSet row, int index) throws SQLException {
        String sender = row.getString("sender_id");
        return new Message(row.getLong("id"), sender == null ? "" : sender, row.getString("sender_name"),
                row.getInt("avatar_id"), row.getInt("border_id"), row.getInt("sender_level"),
                row.getString("content"), row.getLong("sent_at_seconds"), ChatChannel.fromWire(row.getInt("channel_type")),
                row.getString("server_id"), row.getInt("notice_id"));
    }
}
