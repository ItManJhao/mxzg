/** 主线阵型和永久解锁状态：与登录/英雄变化共用角色锁事务，只读下发，不提供阵容保存协议。 */
package com.funsgamex.mxzg.lineup;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.*;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
@Service
public class MainFormationStateService {
    /** 选中阵型、永久解锁与现有持久站位；version只代表阵容版本，不替代资产revision。 */
    public record State(int formationId,List<Integer> unlockedIds,boolean assistanceUnlocked,long version,List<Lineup.Slot> slots) {
        /** 所有集合冻结，禁止临时战斗状态反写。 */
        public State { unlockedIds=List.copyOf(unlockedIds);slots=List.copyOf(slots); }
    }
    /** 同一事务数据库入口。 */
    private final JdbcTemplate jdbc;
    /** 角色行锁，串行化登录恢复和英雄变更。 */
    private final RoleRepository roles;
    /** 永久解锁规则，不用客户端上报条件。 */
    private final MainFormationRules rules;
    /** 既有持久阵容与版本。 */
    private final LineupRepository lineups;
    /** 与英雄变更共用一次资产版本和提交后通知。 */
    private final AssetSyncService sync;
    /** 注入已有数据入口，不保存角色缓存。 */
    public MainFormationStateService(JdbcTemplate jdbc,RoleRepository roles,MainFormationRules rules,LineupRepository lineups,AssetSyncService sync){this.jdbc=jdbc;this.roles=roles;this.rules=rules;this.lineups=lineups;this.sync=sync;}
    /** 必须在业务事务中调用；按角色锁更新新增解锁，历史true和已解锁ID不删除。 */
    @Transactional(propagation=Propagation.MANDATORY)
    public State refresh(String role){
        sync.requireTransaction();roles.lock(role);
        var previous=current(role);
        var owned=jdbc.query("SELECT id,template_id,hero_level,star FROM game_hero WHERE role_id=?",(row,n)->new MainFormationRules.Hero(row.getString(1),row.getInt(2),row.getInt(3),row.getInt(4)),role);
        var unlocked=rules.unlock(new MainFormationRules.Unlocks(new HashSet<>(previous.unlockedIds()),previous.assistanceUnlocked()),owned);
        boolean changed=false;
        for(int id:unlocked.formations())if(!previous.unlockedIds().contains(id)){
            jdbc.update("INSERT INTO game_formation_unlock(role_id,formation_id) VALUES (?,?)",role,id);changed=true;
        }
        if(unlocked.assistance()!=previous.assistanceUnlocked()){
            jdbc.update("UPDATE game_role SET assistance_unlocked=TRUE WHERE id=?",role);changed=true;
        }
        if(changed)sync.changed(role);
        return current(role);
    }
    /** 读取持久状态；基础阵型1隐式永久解锁，异常选中阵型拒绝，不重置玩家选择。 */
    public State current(String role){
        var unlocked=new ArrayList<>(jdbc.query("SELECT formation_id FROM game_formation_unlock WHERE role_id=? ORDER BY formation_id",(row,n)->row.getInt(1),role));unlocked.add(0,1);
        var selected=jdbc.queryForMap("SELECT main_formation_id,assistance_unlocked FROM game_role WHERE id=?",role);
        int formation=((Number)selected.get("main_formation_id")).intValue();
        if(!unlocked.contains(formation))throw new IllegalStateException("选中阵型未解锁");
        rules.position(formation,1);
        var lineup=lineups.read(role);
        return new State(formation,unlocked,(Boolean)selected.get("assistance_unlocked"),lineup.version(),lineup.slots());
    }
}
