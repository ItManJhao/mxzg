/** 主线挂机演出服务：按旧3006读取持久三人选择和已通关怪物，只生成普攻战报，不领奖、不推进主线。 */
package com.funsgamex.mxzg.campaign;

import java.util.concurrent.ThreadLocalRandom;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import com.funsgamex.mxzg.hero.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class MainChapterIdleBattleService {
    /** 当前连接的鉴权入口。 */
    private final SessionService sessions;
    /** 与主线、阵容保存共用的角色锁。 */
    private final RoleRepository roles;
    /** 主线进度仅用于选择当前已通关关卡。 */
    private final MainChapterService chapters;
    /** 持久挂机选择，重连不重抽。 */
    private final MainChapterIdleService idle;
    /** 当前主阵容版本。 */
    private final MainFormationStateService formations;
    /** 已支持属性和技能的权威输入。 */
    private final HeroBattleInputService inputs;
    /** 共用真实伤害计算与事件执行器。 */
    private final HeroBattleChapterScenario battles;

    /** 回包版本与本场战报在同一角色锁内生成。 */
    public record Encounter(int stage, long assetRevision, long lineupVersion, HeroBattleChapterScenario.Result replay) {}

    /** 注入已有领域服务，不持有跨场战斗状态。 */
    public MainChapterIdleBattleService(SessionService sessions, RoleRepository roles, MainChapterService chapters,
            MainChapterIdleService idle, MainFormationStateService formations, HeroBattleInputService inputs, ObjectMapper mapper) {
        this.sessions = sessions; this.roles = roles; this.chapters = chapters; this.idle = idle;
        this.formations = formations; this.inputs = inputs; this.battles = new HeroBattleChapterScenario(mapper);
    }

    /** 每次遇敌取一场只读战报；客户端不能指定角色、属性、怪物或奖励。 */
    @Transactional
    public Encounter encounter(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        int stage = chapters.current(token).maxCleared();
        var formation = formations.current(role);
        var state = idle.withLineup(role, idle.snapshot(role, stage, java.time.Instant.now().getEpochSecond()), formation);
        if (state == null || state.slots().isEmpty()) throw new IllegalArgumentException("挂机尚未解锁或阵容为空");
        var current = inputs.currentForIdle(token);
        var selected = current.units().stream().filter(unit -> state.slots().stream().anyMatch(slot ->
            slot.heroId().equals(unit.hero().id()) && slot.position() == unit.position())).toList();
        if (selected.size() != state.slots().size()) throw new IllegalStateException("挂机选择与当前名册不一致");
        var input = new HeroBattleInputService.Input(current.assetRevision(), current.lineupVersion(),
            current.formationId(), selected, current.pending());
        int enemyCount = (int) battles.initial(stage).stream().filter(unit -> unit.faction() == 2).count();
        var random = ThreadLocalRandom.current();
        var replay = battles.runIdle(stage, input, random.nextInt(3), random.nextInt(enemyCount), rate -> random.nextDouble() < rate);
        HeroBattleReplayUtils.validate(replay);
        return new Encounter(stage, current.assetRevision(), current.lineupVersion(), replay);
    }
}
