/** 长连接鉴权接管与恢复快照；复用原角色锁，保持会话撤销和角色/背包快照的事务边界。 */
package com.funsgamex.mxzg.network;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.inventory.TimedInventoryService;
import com.funsgamex.mxzg.role.*;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class SessionSnapshotService {
    /** 角色、库存与持久版本的一致读结果；英雄名册与库存处于同一角色锁事务。 */
    public record Snapshot(RoleProfile role, List<HeroProfile> heroes, List<InventoryService.Item> inventory, long revision, TimedInventoryService.State timedInventory, HeroCapacityService.State heroRoster, com.funsgamex.mxzg.lineup.MainFormationStateService.State mainFormation, com.funsgamex.mxzg.campaign.MainChapterService.State mainChapter, com.funsgamex.mxzg.campaign.MainChapterIdleService.State mainChapterIdle) {}
    /** 持久会话鉴权，在角色锁内再次确认凭证。 */
    private final SessionService sessions;
    /** 唯一钱包与版本读取入口，同时提供角色行锁。 */
    private final RoleRepository roles;
    /** 唯一库存读取入口，不保存额外缓存。 */
    private final InventoryService inventory;

    /** 逐件期限库存，在同一角色事务内回收过期记录。 */
    private final TimedInventoryService timed;
    /** 按角色读取持久英雄实例，不在客户端生成或跨角色查询。 */
    private final HeroRepository heroes;

    /** 同一角色锁内读取总容量和扩容次数。 */
    private final HeroCapacityService capacity;

    /** 与名册同事务的阵型永久解锁和站位投影。 */
    private final com.funsgamex.mxzg.lineup.MainFormationStateService formations;

    /** 与角色资产同事务恢复通关与待领奖，不携带整场战报。 */
    private final com.funsgamex.mxzg.campaign.MainChapterService chapters;

    /** 新主线挂机时钟与收益配置，随同一快照恢复。 */
    private final com.funsgamex.mxzg.campaign.MainChapterIdleService idle;

    /** 注入原有数据入口，不新增玩家状态副本。 */
    public SessionSnapshotService(SessionService sessions, RoleRepository roles, InventoryService inventory, TimedInventoryService timed, HeroRepository heroes, HeroCapacityService capacity,com.funsgamex.mxzg.lineup.MainFormationStateService formations, com.funsgamex.mxzg.campaign.MainChapterService chapters, com.funsgamex.mxzg.campaign.MainChapterIdleService idle) {
        this.idle = idle;
        this.chapters = chapters;
        this.sessions = sessions; this.roles = roles; this.inventory = inventory; this.timed=timed; this.heroes=heroes; this.capacity=capacity;this.formations=formations;
    }

    /** 锁内再次校验，撤销同角色其他令牌；并发接管中已失效的令牌不能复活。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public String claim(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.revokeOthers(role, token);
        return role;
    }

    /** 在同一角色锁中读取钱包、持久版本、背包和英雄名册，避免升级中间状态被恢复到前端。 */
    @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
    public Snapshot snapshot(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        var formation=formations.refresh(role);
        var timedState=timed.current(role,java.time.Instant.now().getEpochSecond());
        var chapter = chapters.current(token);
        var idleState = idle.snapshot(role, chapter.maxCleared(), java.time.Instant.now().getEpochSecond());
        idleState = idle.withLineup(role, idleState, formation);
        return new Snapshot(roles.findById(role).orElseThrow(), heroes.list(role), inventory.list(role), roles.revision(role), timedState, capacity.current(role),formation,chapter,idleState);
    }
}
