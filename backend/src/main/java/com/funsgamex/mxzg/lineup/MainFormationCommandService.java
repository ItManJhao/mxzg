/** 主线阵容保存事务：按原版规则归一化、持久幂等和版本校验，提交后通过统一快照同步。 */
package com.funsgamex.mxzg.lineup;

import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.network.AssetSyncService;
import tools.jackson.databind.ObjectMapper;

@Service
public class MainFormationCommandService {
    /**
     * 保存请求：位置顺序参与旧版同模板的先到优先规则，不预排序原始输入。
     * @param requestId 持久幂等键，结果不明时复用原值。
     * @param expectedVersion 编辑草稿时取得的服务器阵容版本。
     * @param formationId 用户选择的阵型ID，必须永久解锁。
     * @param slots 原始请求顺序的站位和实例身份；角色归属由服务端检查。
     */
    public record Save(String requestId, Long expectedVersion, Integer formationId, List<Lineup.Slot> slots) {}
    /** 成功回执；阵容内容从统一同步读取，不在客户端用回执推算。 */
    public record Saved(String requestId, long version) {}
    /** 当前连接鉴权，不接收客户端指定角色。 */
    private final SessionService sessions;
    /** 同角色事务的统一锁及资产版本。 */
    private final RoleRepository roles;
    /** 同事务回执和选中阵型持久入口。 */
    private final JdbcTemplate jdbc;
    /** 现有站位和阵容版本仓库。 */
    private final LineupRepository lineups;
    /** 登录与发放共用的永久解锁状态。 */
    private final MainFormationStateService states;
    /** 旧版配置和保存顺序规则。 */
    private final MainFormationRules rules;
    /** 同事务只递增一次资产版本，提交后推送。 */
    private final AssetSyncService sync;
    /** 只用于稳定记录请求摘要，不在网络上传输JSON。 */
    private final ObjectMapper mapper;

    /** 注入共享服务；不建立独立资产缓存或网络通道。 */
    public MainFormationCommandService(SessionService sessions, RoleRepository roles, JdbcTemplate jdbc,
            LineupRepository lineups, MainFormationStateService states, MainFormationRules rules,
            AssetSyncService sync, ObjectMapper mapper) {
        this.sessions = sessions;
        this.roles = roles;
        this.jdbc = jdbc;
        this.lineups = lineups;
        this.states = states;
        this.rules = rules;
        this.sync = sync;
        this.mapper = mapper;
    }

    /** 同角色锁内先检查回执，再校验版本及原版规则；任何失败均回滚，结果不明时可重试原请求。 */
    @Transactional
    public Saved save(String token, Save request) {
        if (request == null || request.requestId() == null ||
                !request.requestId().matches("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}") ||
                request.expectedVersion() == null || request.expectedVersion() < 0 ||
                request.formationId() == null || request.formationId() <= 0 ||
                request.slots() == null || request.slots().size() > 9 ||
                request.slots().stream().anyMatch(slot -> slot == null || slot.position() == null ||
                    slot.heroId() == null || slot.heroId().isBlank() || slot.heroId().length() > 96)) {
            throw rejected("FORMATION_INVALID");
        }
        String role = sessions.requireRole(token);
        roles.lock(role);
        String hash = fingerprint(request);
        var previous = jdbc.query("SELECT payload_hash,result_version FROM game_formation_save WHERE role_id=? AND request_id=?",
                (row, n) -> Map.entry(row.getString(1), row.getLong(2)), role, request.requestId());
        if (!previous.isEmpty()) {
            if (!previous.getFirst().getKey().equals(hash)) {
                throw rejected("FORMATION_REQUEST_CONFLICT");
            }
            return new Saved(request.requestId(), previous.getFirst().getValue());
        }
        var current = states.refresh(role);
        if (current.version() != request.expectedVersion()) {
            throw rejected("FORMATION_CHANGED");
        }
        var owned = jdbc.query("SELECT id,template_id,hero_level,star FROM game_hero WHERE role_id=?",
                (row, n) -> new MainFormationRules.Hero(row.getString(1), row.getInt(2), row.getInt(3), row.getInt(4)), role);
        List<Lineup.Slot> normalized;
        try {
            normalized = rules.normalize(request.formationId(),
                    new MainFormationRules.Unlocks(new HashSet<>(current.unlockedIds()), current.assistanceUnlocked()),
                    owned, request.slots()).stream().sorted(Comparator.comparingInt(Lineup.Slot::position)).toList();
        } catch (IllegalArgumentException error) {
            throw rejected("FORMATION_INVALID");
        }
        if (normalized.isEmpty()) {
            throw rejected("FORMATION_EMPTY");
        }
        long version = current.version();
        if (current.formationId() != request.formationId() || !current.slots().equals(normalized)) {
            jdbc.update("UPDATE game_role SET main_formation_id=? WHERE id=?", request.formationId(), role);
            lineups.replace(role, normalized);
            sync.changed(role);
            version = lineups.read(role).version();
        }
        jdbc.update("INSERT INTO game_formation_save(role_id,request_id,payload_hash,result_version) VALUES (?,?,?,?)",
                role, request.requestId(), hash, version);
        return new Saved(request.requestId(), version);
    }

    /** 原始顺序和所有业务参数均参与摘要；相同键换参数不能被当作重试。 */
    private String fingerprint(Save request) {
        try {
            byte[] bytes = mapper.writeValueAsString(request).getBytes(StandardCharsets.UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (java.security.NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少请求摘要算法", error);
        }
    }

    /** 输出稳定业务码；由网络边界记录和关联失败，不在底层重复打印。 */
    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
}
