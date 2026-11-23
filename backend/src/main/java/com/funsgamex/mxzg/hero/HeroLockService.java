/**
 * 处理自己英雄的锁定和解锁。由游戏长连接调用，在角色锁事务内记录设值与原请求结果。
 * 锁定值与当前版本由统一快照提供；仅真实设置变化才递增版本并通知客户端。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HeroLockService {
    /** 设值结果和提交时的资产版本；重复请求原样返回。 */
    public record Receipt(String requestId, String heroId, boolean locked, long assetRevision) {}

    /** 鉴权提供角色归属，拿到角色锁后重新验证。 */
    private final SessionService sessions;
    /** 负责角色行锁以及读取持久资产版本。 */
    private final RoleRepository roles;
    /** 更新英雄锁和成功收据使用同一数据库事务。 */
    private final JdbcTemplate jdbc;
    /** 真实变更提交后通知统一资产快照入口。 */
    private final AssetSyncService assets;

    /** 注入共用鉴权、角色锁、数据库和统一状态入口。 */
    public HeroLockService(SessionService sessions, RoleRepository roles, JdbcTemplate jdbc, AssetSyncService assets) {
        this.sessions = sessions;
        this.roles = roles;
        this.jdbc = jdbc;
        this.assets = assets;
    }

    /** 设定当前角色英雄的锁定状态。同一请求原样返回，同键异参拒绝。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt set(String token, String requestId, String heroId, boolean locked) {
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        var previous = jdbc.query("SELECT hero_id,locked,asset_revision "
                        + "FROM game_hero_lock_request WHERE role_id=? AND request_id=?",
                row -> row.next() ? new Receipt(requestId, row.getString("hero_id"), row.getBoolean("locked"),
                        row.getLong("asset_revision")) : null, roleId, requestId);
        if (previous != null) {
            if (!previous.heroId().equals(heroId) || previous.locked() != locked) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
            }
            return previous;
        }
        Boolean current = jdbc.query("SELECT is_locked FROM game_hero WHERE role_id=? AND id=?",
                row -> row.next() ? row.getBoolean("is_locked") : null, roleId, heroId);
        if (current == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "HERO_NOT_FOUND");
        }
        if (current != locked) {
            jdbc.update("UPDATE game_hero SET is_locked=? WHERE role_id=? AND id=?", locked, roleId, heroId);
            assets.changed(roleId);
        }
        var receipt = new Receipt(requestId, heroId, locked, roles.revision(roleId));
        jdbc.update("INSERT INTO game_hero_lock_request(role_id,request_id,hero_id,locked,asset_revision) VALUES (?,?,?,?,?)",
                roleId, requestId, heroId, locked, receipt.assetRevision());
        return receipt;
    }
}
