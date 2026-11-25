/** 公会战力排行的共用读模型。公会和主城按各自门槛及区服范围读取真实战力和本人公会。 */
package com.funsgamex.mxzg.guild;

import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.world.WorldLevelService;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GuildRankingService {
    /** 旧本服公会榜最多展示前一百名。 */
    private static final int RANK_SIZE = 100;

    /** 可公开展示的公会战力和资料，rank 为 0 表示本人公会未进入主榜。 */
    public record Entry(int rank, String guildId, String serverId, String name, int badgeId, String leaderName, long power) {}

    /** 同一只读快照中的主榜和本人行。未入会时 own 为 null。 */
    public record State(List<Entry> entries, Entry own) {
        /** 冻结本次公会排行顺序，避免响应装配改写视图。 */
        public State {
            entries = List.copyOf(entries);
        }
    }

    /** 登录角色的权威区服及等级，不接受调用者传入目标区服。 */
    private final RoleRepository roles;
    /** 排行和本人公会的只读查询。 */
    private final GuildRankingRepository ranking;
    /** 公会与排行榜共用等级门槛。 */
    private final GuildRules rules;
    /** 由当前角色的区服读取世界等级。 */
    private final WorldLevelService world;

    /** 装配查询域中实际使用的区服、规则和持久资料来源。 */
    GuildRankingService(RoleRepository roles, GuildRankingRepository ranking, GuildRules rules,
                        WorldLevelService world) {
        this.roles = roles;
        this.ranking = ranking;
        this.rules = rules;
        this.world = world;
    }

    /** 按已鉴权的角色读本区服排行，主榜和本人行共用一次成员与战力查询。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public State list(String roleId) {
        var role = roles.findById(roleId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION"));
        if (role.level() < rules.gate.levelRequired() || (rules.gate.worldLevelRequired() > 1
                && world.current(role.serverId()).level() < rules.gate.worldLevelRequired())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "GUILD_LOCKED");
        }
        return listWithinServers(roleId, List.of(role.serverId()), RANK_SIZE);
    }

    /** 在调用方只读快照中投影已授权区服范围内的前 N 名与本人公会。 */
    public State listWithinServers(String roleId, List<String> serverIds, int limit) {
        if (serverIds.isEmpty()) {
            return new State(List.of(), null);
        }
        var entries = new ArrayList<Entry>();
        Entry own = null;
        for (var row : ranking.list(serverIds, roleId, limit)) {
            var entry = new Entry(row.rank(), row.guildId(), row.serverId(), row.name(), row.badgeId(), row.leaderName(), row.power());
            if (entry.rank() > 0) {
                entries.add(entry);
            }
            if (row.own()) {
                own = entry;
            }
        }
        return new State(entries, own);
    }
}
