/** 普通挂机用例：服务端时钟、持久掉落状态与角色锁事务；查询不抽奖，领取收据使网络重试不重复发奖。 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.*;
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

    /** 复用角色锁、库存和会话，不另建资产缓存或客户端时钟。 */
    public IdleService(JdbcTemplate jdbc, SessionService sessions, RoleRepository roles, InventoryService inventory, IdleRules rules, ObjectMapper json) {
        this.jdbc=jdbc; this.sessions=sessions; this.roles=roles; this.inventory=inventory; this.rules=rules; this.json=json;
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
    /** 同请求返回原随机奖励与最新资产；不同请求必须匹配领取前 revision，防止连点消耗下一段时间。 */
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Result claim(String token, Request request) {
        if (request==null || request.requestId()==null || !request.requestId().matches("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}")
            || request.expectedRevision()==null || request.expectedRevision()<0) throw error(HttpStatus.BAD_REQUEST,"INVALID_IDLE_REQUEST");
        String role=prepare(token);
        var old=jdbc.query("SELECT receipt_json FROM game_idle_receipt WHERE role_id=? AND request_id=?",
            (r,i)->json.readValue(r.getString(1),Receipt.class),role,request.requestId());
        if (!old.isEmpty()) {
            if (old.getFirst().expectedRevision()!=request.expectedRevision()) throw error(HttpStatus.CONFLICT,"IDEMPOTENCY_CONFLICT");
            return result(role,old.getFirst());
        }
        var saved=saved(role); long now=Instant.now().getEpochSecond(); var state=state(role,saved,now);
        if (saved.revision()!=request.expectedRevision()) throw error(HttpStatus.CONFLICT,"IDLE_STATE_CHANGED");
        if (!state.claimable()) throw error(HttpStatus.CONFLICT,"IDLE_NOT_READY");
        var roll=rules.roll(state.rewardStage(),state.elapsedSeconds(),saved.dropSeconds(),saved.counters().values(),ThreadLocalRandom.current());
        for (var reward:roll.rewards()) {
            if (reward.itemId()==900001) jdbc.update("UPDATE game_role SET gold=gold+? WHERE id=?",reward.quantity(),role);
            else if (reward.itemId()==900002) jdbc.update("UPDATE game_role SET diamonds=diamonds+? WHERE id=?",reward.quantity(),role);
            else if (reward.itemId()==900003) jdbc.update("UPDATE game_campaign SET role_exp=role_exp+? WHERE role_id=?",reward.quantity(),role);
            else inventory.credit(role,reward.itemId(),reward.quantity());
        }
        jdbc.update("UPDATE game_idle SET started_at=?,revision=revision+1,drop_seconds=?,counters_json=? WHERE role_id=?",now,
            roll.dropSeconds(),json.writeValueAsString(new SavedCounters(roll.counters())),role);
        var receipt=new Receipt(request.requestId(),request.expectedRevision(),now,state.elapsedSeconds(),state.rewardStage(),rules.data().version(),roll.rewards());
        jdbc.update("INSERT INTO game_idle_receipt(role_id,request_id,expected_revision,receipt_json) VALUES (?,?,?,?)",
            role,request.requestId(),request.expectedRevision(),json.writeValueAsString(receipt));
        return result(role,receipt);
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
