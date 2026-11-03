/** 长连接鉴权接管与恢复快照；复用原角色锁，保持会话撤销和角色/背包快照的事务边界。 */
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
    /** 角色、库存与持久版本的一致读结果；英雄字段保留但当前暂停加载。 */
    public record Snapshot(RoleProfile role, List<HeroProfile> heroes, List<InventoryService.Item> inventory, long revision) {}
    /** 持久会话鉴权，在角色锁内再次确认凭证。 */
    private final SessionService sessions;
    /** 唯一钱包与版本读取入口，同时提供角色行锁。 */
    private final RoleRepository roles;
    /** 唯一库存读取入口，不保存额外缓存。 */
    private final InventoryService inventory;

    /** 注入原有数据入口，不新增玩家状态副本。 */
    public SessionSnapshotService(SessionService sessions, RoleRepository roles, InventoryService inventory) {
        this.sessions = sessions; this.roles = roles; this.inventory = inventory;
    }

    /** 锁内再次校验，撤销同角色其他令牌；并发接管中已失效的令牌不能复活。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public String claim(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.revokeOthers(role, token);
        return role;
    }

    /** 在同一角色锁中读取钱包、持久版本和背包，避免升级中间状态被恢复到前端。 */
    @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
    public Snapshot snapshot(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        return new Snapshot(roles.findById(role).orElseThrow(), List.of(), inventory.list(role), roles.revision(role));
    }
}
