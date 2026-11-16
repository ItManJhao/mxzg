/**
 * 暂停的简化挂机领域：保留game_idle旧计时和回执回归，当前玩家链使用MainChapterIdleClaimService。
 * 查询不抽奖，原收据仍阻止重复发放；非简化经验奖励共用真实发放入口，不写精灵或冒险点假堆叠。
 * 本链没有当前完整权益及关卡封顶规则，不得接回玩家领取入口。
 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.*;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.tavern.TavernPointRules;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Service
public class IdleService {
    public record Request(String requestId, Long expectedRevision) {}
    public record State(long serverTime, long startedAt, long revision, int elapsedSeconds, int maxSeconds,
        int frequency, int rewardStage, List<CampaignRules.Reward> rates, boolean claimable, String configVersion) {}
    public record Receipt(String requestId, long expectedRevision, long claimedAt, int seconds, int rewardStage,
        String configVersion, List<CampaignRules.Reward> rewards) {}
    public record Result(Receipt receipt, State state, RoleProfile role, List<InventoryService.Item> inventory, long roleExperience) {}
    public record SavedCounters(Map<Integer, IdleRules.Counter> values) {}
    private record Saved(long startedAt, long revision, int dropSeconds, SavedCounters counters) {}
    private final JdbcTemplate jdbc;
    private final SessionService sessions;
    private final RoleRepository roles;
    private final InventoryService inventory;
    private final IdleRules rules;
    private final ObjectMapper json;
    /** 真实资产共享分发，持久回执和随机结果仍归当前外层事务。 */
    private final RewardGrantService grants;

    /** 注入保留计时规则与共享发奖入口，不另建资产缓存或恢复玩家协议。 */
    public IdleService(JdbcTemplate jdbc, SessionService sessions, RoleRepository roles,
            InventoryService inventory, IdleRules rules, ObjectMapper json, RewardGrantService grants) {
        this.jdbc = jdbc;
        this.sessions = sessions;
        this.roles = roles;
        this.inventory = inventory;
        this.rules = rules;
        this.json = json;
        this.grants = grants;
    }
    /** 主线初始化事务持有角色锁时调用；既有角色只初始化一次，不补发迁移前的离线时长。 */
    public void initialize(String role) {
        if (jdbc.queryForObject("SELECT COUNT(*) FROM game_idle WHERE role_id=?", Integer.class, role) == 0)
            jdbc.update("INSERT INTO game_idle(role_id,started_at,counters_json) VALUES (?,?,?)", role,
                Instant.now().getEpochSecond()-rules.data().initialSeconds(), json.writeValueAsString(new SavedCounters(Map.of())));
    }
    /** 在角色锁内取时间和关卡快照；已登录但尚未初始化角色不能提前领取。 */
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public State current(String token) {
        String role=prepare(token); return state(role, saved(role), Instant.now().getEpochSecond());
    }
    /** 同请求返回原随机奖励与最新资产；新请求的共享发奖、计时、旧经验和收据仍同事务提交。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Result claim(String token, Request request) {
        if (request == null || request.requestId() == null
                || !request.requestId().matches("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}")
                || request.expectedRevision() == null || request.expectedRevision() < 0) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_IDLE_REQUEST");
        }
        String role = prepare(token);
        var old = jdbc.query("SELECT receipt_json FROM game_idle_receipt WHERE role_id=? AND request_id=?",
                (row, index) -> json.readValue(row.getString(1), Receipt.class), role, request.requestId());
        if (!old.isEmpty()) {
            if (old.getFirst().expectedRevision() != request.expectedRevision()) {
                throw error(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
            }
            return result(role, old.getFirst());
        }
        var saved = saved(role);
        long now = Instant.now().getEpochSecond();
        var state = state(role, saved, now);
        if (saved.revision() != request.expectedRevision()) {
            throw error(HttpStatus.CONFLICT, "IDLE_STATE_CHANGED");
        }
        if (!state.claimable()) {
            throw error(HttpStatus.CONFLICT, "IDLE_NOT_READY");
        }
        var roll = rules.roll(state.rewardStage(), state.elapsedSeconds(), saved.dropSeconds(),
                saved.counters().values(), ThreadLocalRandom.current());
        grantRewards(role, roll.rewards(), now);
        jdbc.update("UPDATE game_idle SET started_at=?,revision=revision+1,drop_seconds=?,counters_json=? WHERE role_id=?",
                now, roll.dropSeconds(), json.writeValueAsString(new SavedCounters(roll.counters())), role);
        var receipt = new Receipt(request.requestId(), request.expectedRevision(), now, state.elapsedSeconds(),
                state.rewardStage(), rules.data().version(), roll.rewards());
        jdbc.update("INSERT INTO game_idle_receipt(role_id,request_id,expected_revision,receipt_json) VALUES (?,?,?,?)",
                role, request.requestId(), request.expectedRevision(), json.writeValueAsString(receipt));
        return result(role, receipt);
    }

    /**
     * 保留旧简化经验，其余奖励交唯一领域；抽中的精灵保存真实实例，冒险点不再混入普通背包。
     * 旧简化链没有关卡封顶，安全整数上限只作技术边界；完整挂机继续由新服务冻结真实上限。
     */
    private void grantRewards(String role, List<CampaignRules.Reward> rewards, long now) {
        var actualRewards = new ArrayList<RewardGrantService.Reward>();
        for (var reward : rewards) {
            if (reward.itemId() == 900003) {
                jdbc.update("UPDATE game_campaign SET role_exp=role_exp+? WHERE role_id=?", reward.quantity(), role);
            } else {
                actualRewards.add(new RewardGrantService.Reward(reward.itemId(), reward.quantity()));
            }
        }
        grants.grant(role, actualRewards,
                new RewardGrantService.Context(now, TavernPointRules.MAX_SAFE_INTEGER),
                ThreadLocalRandom.current());
    }
    /** 会话解析与初始化检查均在可信服务端完成，所有写路径使用同一角色行锁。 */
    private String prepare(String token) {
        String role=sessions.requireRole(token); roles.lock(role);
        if (jdbc.queryForObject("SELECT COUNT(*) FROM game_campaign WHERE role_id=? AND initialized=TRUE",Integer.class,role)==0)
            throw error(HttpStatus.CONFLICT,"ROLE_NOT_INITIALIZED");
        initialize(role); return role;
    }
    /** 读取持久计时与保底状态，事务内查询无并发写入。 */
    private Saved saved(String role) {
        return jdbc.queryForObject("SELECT * FROM game_idle WHERE role_id=?",(r,i)->new Saved(r.getLong("started_at"),r.getLong("revision"),
            r.getInt("drop_seconds"),json.readValue(r.getString("counters_json"),SavedCounters.class)),role);
    }
    /** 待领奖胜利也算已通关；旧版收益按领取时最高通关关卡计算整段，而非分段切换收益。 */
    private State state(String role, Saved saved, long now) {
        int stage=Math.max(1,jdbc.queryForObject("SELECT stage_id FROM game_campaign WHERE role_id=?",Integer.class,role)-1);
        var pending=jdbc.query("SELECT snapshot_json FROM game_battle WHERE role_id=? AND claimed=FALSE",
            (r,i)->json.readValue(r.getString(1),CampaignBattle.Report.class),role);
        for (var battle:pending) if (battle.won()) stage=Math.max(stage,battle.stageId());
        int elapsed=(int)Math.max(0,Math.min(rules.data().maxSeconds(),now-saved.startedAt()));
        return new State(now,saved.startedAt(),saved.revision(),elapsed,rules.data().maxSeconds(),rules.data().frequency(),stage,
            rules.stage(stage).base(),elapsed>=rules.data().frequency(),rules.data().version());
    }
    /** 收据描述原操作，附带当前钱包/库存与计时，不能用历史余额覆盖后续升级或领奖。 */
    private Result result(String role, Receipt receipt) {
        return new Result(receipt,state(role,saved(role),Instant.now().getEpochSecond()),roles.findById(role).orElseThrow(),inventory.list(role),
            jdbc.queryForObject("SELECT role_exp FROM game_campaign WHERE role_id=?",Long.class,role));
    }
    /** 稳定业务错误码，前端区分等待、状态冲突与无效请求。 */
    private static ResponseStatusException error(HttpStatus status,String code) { return new ResponseStatusException(status,code); }
}
