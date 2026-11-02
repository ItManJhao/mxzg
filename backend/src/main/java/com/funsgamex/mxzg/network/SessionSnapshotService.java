/** 长连接鉴权接管与恢复快照；复用原角色锁，保持会话撤销和三模块快照的事务边界。 */
package com.funsgamex.mxzg.network;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.*;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class SessionSnapshotService {
    public record Snapshot(RoleProfile role, List<HeroProfile> heroes, List<InventoryService.Item> inventory) {}
    private final SessionService sessions;
    private final RoleRepository roles;
    private final HeroRepository heroes;
    private final InventoryService inventory;

    /** 注入原有数据入口，不新增玩家状态副本。 */
    public SessionSnapshotService(SessionService sessions, RoleRepository roles, HeroRepository heroes, InventoryService inventory) {
        this.sessions = sessions; this.roles = roles; this.heroes = heroes; this.inventory = inventory;
    }

    /** 锁内再次校验，撤销同角色其他令牌；并发接管中已失效的令牌不能复活。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public String claim(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.revokeOthers(role, token);
        return role;
    }

    /** 在同一角色锁中读取钱包、英雄和背包，避免升级中间状态被恢复到前端。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Snapshot snapshot(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        return new Snapshot(roles.findById(role).orElseThrow(), heroes.list(role), inventory.list(role));
    }
}
