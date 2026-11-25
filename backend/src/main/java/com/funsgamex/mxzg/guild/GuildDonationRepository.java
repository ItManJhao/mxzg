/**
 * 公会捐献持久记录。每个自然日的个人档位、宝箱和全公会累计量都从同一批成功回执读取。
 * 由捐献服务在角色锁、公会锁和资产事务内写入。
 */
package com.funsgamex.mxzg.guild;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class GuildDonationRepository {
    /** 使用同一游戏库连接保存业务及资产事务。 */
    private final JdbcTemplate jdbc;

    /** 该条成功业务的重试身份、档位及计入公会的贡献点。 */
    record Receipt(String guildId, long resetAt, int slot, int optionId, int points) {}

    /** 接入共享数据库，服务层负责事务和权限。 */
    GuildDonationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 用原请求 ID 查成功回执，以校验重试参数是否一致。 */
    Receipt forRequest(String roleId, String requestId) {
        return jdbc.query("""
            SELECT guild_id,reset_at_seconds,reward_slot,option_id,points FROM game_guild_donation_receipt
            WHERE role_id=? AND request_id=?
            """, GuildDonationRepository::read, roleId, requestId).stream().findFirst().orElse(null);
    }

    /** 当日个人次数按角色使用，即使中途换会也不重置。 */
    List<Receipt> dayForRole(String roleId, long resetAt) {
        return jdbc.query("""
            SELECT guild_id,reset_at_seconds,reward_slot,option_id,points FROM game_guild_donation_receipt
            WHERE role_id=? AND reset_at_seconds=? ORDER BY reward_slot
            """, GuildDonationRepository::read, roleId, resetAt);
    }

    /** 公会日贡献合计包含当日捐后退出的成员，宝箱回执不计捐献。 */
    int dailyPoints(String guildId, long resetAt) {
        Long total = jdbc.queryForObject("""
            SELECT COALESCE(SUM(points),0) FROM game_guild_donation_receipt
            WHERE guild_id=? AND reset_at_seconds=? AND reward_slot=0
            """, Long.class, guildId, resetAt);
        return Math.toIntExact(total);
    }

    /** 保存本自然日指定动作的唯一回执，生命周期不随公会解散而变化。 */
    void insert(String roleId, String requestId, Receipt receipt, String receiptId) {
        jdbc.update("""
            INSERT INTO game_guild_donation_receipt
                (role_id,request_id,guild_id,reset_at_seconds,reward_slot,option_id,points,receipt_id)
            VALUES (?,?,?,?,?,?,?,?)
            """, roleId, requestId, receipt.guildId(), receipt.resetAt(), receipt.slot(), receipt.optionId(),
            receipt.points(), receiptId);
    }

    /** 将回执字段统一映射为业务记录。 */
    private static Receipt read(ResultSet row, int index) throws SQLException {
        return new Receipt(row.getString(1), row.getLong(2), row.getInt(3), row.getInt(4), row.getInt(5));
    }
}
