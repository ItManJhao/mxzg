/** 邮件持久层。调用者必须提供收件人的角色 ID，并负责在角色锁内更新。 */
package com.funsgamex.mxzg.mail;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class MailRepository {
    /** 与钱包和资产版本使用同一个事务的数据源。 */
    private final JdbcTemplate jdbc;

    /** 将邮件行及幂等回执留在游戏库。 */
    MailRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 命令原身份及可选奖励回执，读取时按角色核对。 */
    record Saved(String action, String mailId, String noticeJson, String noticeHash) {}

    /** 邮件详情与冻结附件；列表读取独立的标题索引。 */
    record Message(MailService.MailEntry entry, String content, String attachments) {}

    /** 读取角色的邮件索引，只传标题及状态；按原界面时间倒序。 */
    List<MailService.MailEntry> list(String roleId, long cutoff) {
        return jdbc.query("""
            SELECT id, title, created_at_seconds, is_read, is_claimed, attachment_count
            FROM game_mail WHERE role_id=? AND (is_claimed=FALSE OR created_at_seconds>=?)
            ORDER BY created_at_seconds DESC, id DESC
            """, (row, i) -> new MailService.MailEntry(row.getString("id"), row.getString("title"),
            row.getLong("created_at_seconds"), row.getBoolean("is_read"), row.getBoolean("is_claimed"),
            row.getInt("attachment_count") > 0), roleId, cutoff);
    }

    /** 按已验证的收件人及本邮件 ID 查找详情。 */
    Message find(String roleId, String id, long cutoff) {
        return jdbc.query("""
            SELECT id, title, created_at_seconds, is_read, is_claimed, attachment_count, content, attachments_json
            FROM game_mail WHERE role_id=? AND id=? AND (is_claimed=FALSE OR created_at_seconds>=?)
            """, (row, i) -> new Message(new MailService.MailEntry(row.getString("id"), row.getString("title"),
            row.getLong("created_at_seconds"), row.getBoolean("is_read"), row.getBoolean("is_claimed"),
            row.getInt("attachment_count") > 0), row.getString("content"), row.getString("attachments_json")),
            roleId, id, cutoff).stream().findFirst().orElse(null);
    }

    /** 找到尚未处理的所有邮件；批量领取同时处理不带附件的来信。 */
    List<Message> claimable(String roleId) {
        return jdbc.query("""
            SELECT id, title, created_at_seconds, is_read, is_claimed, attachment_count, content, attachments_json
            FROM game_mail WHERE role_id=? AND is_claimed=FALSE
            ORDER BY created_at_seconds, id
            """, (row, i) -> new Message(new MailService.MailEntry(row.getString("id"), row.getString("title"),
            row.getLong("created_at_seconds"), row.getBoolean("is_read"), row.getBoolean("is_claimed"),
            row.getInt("attachment_count") > 0), "", row.getString("attachments_json")), roleId);
    }

    /** 新邮件由可信调用者投递，附件文字已经过服务层校验。 */
    void insert(String roleId, MailService.MailEntry entry, String content, int attachmentCount, String attachments) {
        jdbc.update("""
            INSERT INTO game_mail(id, role_id, title, content, created_at_seconds, is_read, is_claimed,
                attachment_count, attachments_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, entry.id(), roleId, entry.title(), content, entry.createdAt(), entry.read(), entry.claimed(),
            attachmentCount, attachments);
    }

    /** 阅读或领取在角色锁内更新；领取成功同时标记已读。 */
    void mark(String roleId, String id, boolean claimed) {
        jdbc.update("UPDATE game_mail SET is_read=TRUE, is_claimed=? WHERE role_id=? AND id=?", claimed, roleId, id);
    }

    /** 删除单封已读且附件已清的邮件，其他邮件不受影响。 */
    void delete(String roleId, String id) {
        jdbc.update("DELETE FROM game_mail WHERE role_id=? AND id=? AND is_read=TRUE AND is_claimed=TRUE", roleId, id);
    }

    /** 一键删除已读且附件已领完的邮件。 */
    void deleteRead(String roleId) {
        jdbc.update("DELETE FROM game_mail WHERE role_id=? AND is_read=TRUE AND is_claimed=TRUE", roleId);
    }

    /** 清理已收取且超过原期限的邮件，未领取附件不受影响。 */
    void deleteExpired(String roleId, long cutoff) {
        jdbc.update("DELETE FROM game_mail WHERE role_id=? AND is_claimed=TRUE AND created_at_seconds<?", roleId, cutoff);
    }

    /** 锁内读取角色请求的原参数及奖励回执。 */
    Saved receipt(String roleId, String requestId) {
        return jdbc.query("""
            SELECT action, mail_id, notice_json, notice_hash FROM game_mail_request WHERE role_id=? AND request_id=?
            """, (row, i) -> new Saved(row.getString("action"), row.getString("mail_id"),
            row.getString("notice_json"), row.getString("notice_hash")), roleId, requestId).stream().findFirst().orElse(null);
    }

    /** 记录已完成的命令，与邮件和奖励状态一并提交。 */
    void save(String roleId, MailService.Command command, String notice, String hash) {
        jdbc.update("""
            INSERT INTO game_mail_request(role_id, request_id, action, mail_id, notice_json, notice_hash)
                VALUES (?, ?, ?, ?, ?, ?)
            """, roleId, command.requestId(), command.action().name(), command.mailId(), notice, hash);
    }

    /** 发放邮件中的冒险点时使用当前已通关进度确定原奖励上限。 */
    int maxCleared(String roleId) {
        return jdbc.query("SELECT max_cleared FROM game_main_chapter WHERE role_id=?",
            (row, index) -> row.getInt(1), roleId).stream().findFirst().orElse(0);
    }
}
