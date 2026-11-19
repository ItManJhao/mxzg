/**
 * 长连接鉴权接管与恢复快照：同一角色锁内读取钱包、库存实例、冒险点、主线已领及普通召唤冷却。
 * 登录首包和提交后state.changed共用本入口；冒险点真正缺行才按旧规则懒建，不生成酒馆任务。
 */
package com.funsgamex.mxzg.network;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.inventory.TimedInventoryService;
import com.funsgamex.mxzg.role.*;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import com.funsgamex.mxzg.tavern.TavernPointService;
import com.funsgamex.mxzg.time.GameClock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class SessionSnapshotService {
    /** 角色、库存与持久版本的一致读结果；英雄名册与库存处于同一角色锁事务。 */
    public record Snapshot(RoleProfile role, List<HeroProfile> heroes, List<InventoryService.Item> inventory,
                           long revision, TimedInventoryService.State timedInventory, HeroCapacityService.State heroRoster,
                           com.funsgamex.mxzg.lineup.MainFormationStateService.State mainFormation,
                           com.funsgamex.mxzg.campaign.MainChapterService.State mainChapter,
                           com.funsgamex.mxzg.campaign.MainChapterIdleService.State mainChapterIdle,
                           SpiritInventoryService.State spiritInventory, TavernPointService.State tavernPoints,
                           HeroSummonService.State heroSummon) {}
    /** 持久会话鉴权，在角色锁内再次确认凭证。 */
    private final SessionService sessions;
    /** 唯一钱包与版本读取入口，同时提供角色行锁。 */
    private final RoleRepository roles;
    /** 唯一库存读取入口，不保存额外缓存。 */
    private final InventoryService inventory;

    /** 逐件期限库存，在同一角色事务内回收过期记录。 */
    private final TimedInventoryService timed;
    /** 独立精灵实例的唯一持久读取入口；同配置不合并、不从普通库存推断。 */
    private final SpiritInventoryService spirits;
    /** 按角色读取持久英雄实例，不在客户端生成或跨角色查询。 */
    private final HeroRepository heroes;

    /** 同一角色锁内读取总容量和扩容次数。 */
    private final HeroCapacityService capacity;

    /** 与新英雄和积分同版本交付的普通召唤免费时间。 */
    private final HeroSummonService heroSummons;

    /** 与名册同事务的阵型永久解锁和站位投影。 */
    private final com.funsgamex.mxzg.lineup.MainFormationStateService formations;

    /** 与角色资产同事务恢复通关与待领奖，不携带整场战报。 */
    private final com.funsgamex.mxzg.campaign.MainChapterService chapters;

    /** 新主线挂机时钟与收益配置，随同一快照恢复。 */
    private final com.funsgamex.mxzg.campaign.MainChapterIdleService idle;

    /** 独立持久冒险点，与同次已通关关卡上限组成完整只读投影。 */
    private final TavernPointService tavernPoints;

    /** 可信主线关卡规则只在快照装配处提供上限，不反向注入角色持久入口。 */
    private final com.funsgamex.mxzg.campaign.MainChapterRules chapterRules;

    /** 期限库存与主线挂机共用一次读取到的游戏时间。 */
    private final GameClock clock;

    /** 注入各领域持久数据入口和游戏时钟，在统一读取事务内聚合状态。 */
    public SessionSnapshotService(SessionService sessions, RoleRepository roles, InventoryService inventory,
            TimedInventoryService timed, HeroRepository heroes, HeroCapacityService capacity,
            com.funsgamex.mxzg.lineup.MainFormationStateService formations,
            com.funsgamex.mxzg.campaign.MainChapterService chapters,
            com.funsgamex.mxzg.campaign.MainChapterIdleService idle, SpiritInventoryService spirits,
            TavernPointService tavernPoints, com.funsgamex.mxzg.campaign.MainChapterRules chapterRules,
            HeroSummonService heroSummons, GameClock clock) {
        this.idle = idle;
        this.chapters = chapters;
        this.sessions = sessions;
        this.roles = roles;
        this.inventory = inventory;
        this.timed = timed;
        this.spirits = spirits;
        this.heroes = heroes;
        this.capacity = capacity;
        this.formations = formations;
        this.tavernPoints = tavernPoints;
        this.chapterRules = chapterRules;
        this.heroSummons = heroSummons;
        this.clock = clock;
    }

    /** 锁内再次校验，撤销同角色其他令牌；并发接管中已失效的令牌不能复活。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public String claim(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.revokeOthers(role, token);
        return role;
    }

    /** 同一角色锁内组装资产与玩法状态；期限库存和挂机共享一次游戏时间，坏状态整包拒绝。 */
    @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
    public Snapshot snapshot(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        var formation = formations.refresh(role);
        long now = clock.epochSeconds();
        var timedState = timed.current(role, now);
        var spiritState = spirits.current(role);
        var chapter = chapters.current(token);
        var pointState = tavernPoints.current(role, chapterRules.tavernLimit(chapter.maxCleared()));
        // 冒险点首次懒建可能推进同一事务版本；对齐时保留里程碑集合和可信新挑战范围。
        chapter = new com.funsgamex.mxzg.campaign.MainChapterService.State(
                chapter.maxCleared(), chapter.pendingBattleId(), roles.revision(role), chapter.milestoneProgress(),
                chapter.challengeLimit(), chapter.firstRewardProgress());
        var idleState = idle.snapshot(role, chapter.maxCleared(), now);
        idleState = idle.withLineup(role, idleState, formation);
        return new Snapshot(roles.findById(role).orElseThrow(), heroes.list(role), inventory.list(role),
                roles.revision(role), timedState, capacity.current(role), formation, chapter, idleState, spiritState,
                pointState, heroSummons.current(role));
    }
}
