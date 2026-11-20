/**
 * 负责头像、头像框持有期限和贵重标记开关的持久读写。
 * 写入由个人空间服务在角色锁内调用，统一资产版本负责提交后的资料推送。
 */
package com.funsgamex.mxzg.role;

import com.funsgamex.mxzg.network.AssetSyncService;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class RoleDecorationRepository {
    /** 共享角色数据库，保存资料和已激活头像框。 */
    private final JdbcTemplate jdbc;
    /** 变化在角色事务提交后统一同步。 */
    private final AssetSyncService sync;

    /** 累计充值权威余额及聊天展示偏好。 */
    record Peerage(long totalRecharge, boolean showPeerage) {}

    /** 注入共享数据库及角色资产同步出口。 */
    RoleDecorationRepository(JdbcTemplate jdbc, AssetSyncService sync) {
        this.jdbc = jdbc;
        this.sync = sync;
    }

    /** 只读取该角色的累计充值和聊天偏好，未充值角色的余额取持久默认值。 */
    Peerage peerage(String roleId) {
        return jdbc.queryForObject("SELECT total_recharge,peerage_chat_visible FROM game_role WHERE id=?",
            (row, index) -> new Peerage(row.getLong("total_recharge"), row.getBoolean("peerage_chat_visible")), roleId);
    }

    /** 读取有效的道具激活头像框，旧版在到期秒仍可佩戴。 */
    List<RoleProfileService.RoleBorder> activeBorders(String roleId, long now) {
        return jdbc.query("""
            SELECT border_id,expires_at_seconds FROM game_role_border
            WHERE role_id=? AND (expires_at_seconds=-1 OR expires_at_seconds>=?) ORDER BY border_id
            """, (row, index) -> new RoleProfileService.RoleBorder(row.getInt("border_id"), row.getLong("expires_at_seconds")),
            roleId, now);
    }

    /** 保存已经过服务端校验的头像 ID。 */
    void changeHead(String roleId, int id) {
        sync.requireTransaction();
        if (jdbc.update("UPDATE game_role SET head_id=? WHERE id=?", id, roleId) != 1) {
            throw new IllegalStateException("头像更新行数异常");
        }
        sync.changed(roleId);
    }

    /** 保存已经确认佩戴的头像框 ID。 */
    void changeBorder(String roleId, int id) {
        sync.requireTransaction();
        if (jdbc.update("UPDATE game_role SET border_id=? WHERE id=?", id, roleId) != 1) {
            throw new IllegalStateException("头像框更新行数异常");
        }
        sync.changed(roleId);
    }

    /** 角色锁内创建首次激活记录，或覆盖同一头像框上次已经过期的期限。 */
    void activateBorder(String roleId, int id, long expiresAt) {
        sync.requireTransaction();
        int updated = jdbc.update("""
            UPDATE game_role_border SET expires_at_seconds=? WHERE role_id=? AND border_id=?
            """, expiresAt, roleId, id);
        if (updated == 0) {
            jdbc.update("INSERT INTO game_role_border(role_id,border_id,expires_at_seconds) VALUES (?,?,?)",
                roleId, id, expiresAt);
        }
        sync.changed(roleId);
    }

    /**
     * 按旧版查询规则将已佩戴且确认过期的头像框换回免费默认框。
     * 持有记录保留，后续激活可重新计算期限；原角色锁与当前统一快照共享事务。
     */
    void expireEquippedBorder(String roleId, long now) {
        sync.requireTransaction();
        int updated = jdbc.update("""
            UPDATE game_role SET border_id=0
            WHERE id=? AND border_id<>0 AND border_id IN (
                SELECT border_id FROM game_role_border
                WHERE role_id=? AND expires_at_seconds>0 AND expires_at_seconds<?
            )
            """, roleId, roleId, now);
        if (updated == 1) {
            sync.changed(roleId);
        }
    }

    /** 仅在偏好真的变化时推进同一角色版本，重送设置相同值没有副作用。 */
    void setPeerageVisibility(String roleId, boolean show) {
        sync.requireTransaction();
        int updated = jdbc.update("""
            UPDATE game_role SET peerage_chat_visible=? WHERE id=? AND peerage_chat_visible<>?
            """, show, roleId, show);
        if (updated == 1) {
            sync.changed(roleId);
        }
    }
}
