package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Service
public class CampaignService {
    public record State(int stageId, boolean initialized, CampaignBattle.Report pending,
        List<CampaignRules.Reward> rewards, List<CampaignBattle.Unit> units, boolean available) {}
    public record Settlement(CampaignBattle.Report battle, RoleProfile role, List<InventoryService.Item> inventory, int stageId) {}
    private final JdbcTemplate jdbc;
    private final SessionService sessions;
    private final RoleRepository roles;
    private final HeroRepository heroes;
    private final InventoryService inventory;
    private final CampaignRules rules;
    private final ObjectMapper json;
    public CampaignService(JdbcTemplate jdbc, SessionService sessions, RoleRepository roles,
        HeroRepository heroes, InventoryService inventory, CampaignRules rules, ObjectMapper json) {
        this.jdbc=jdbc;this.sessions=sessions;this.roles=roles;this.heroes=heroes;
        this.inventory=inventory;this.rules=rules;this.json=json;
    }
    private void lock(String role) { jdbc.queryForObject("SELECT id FROM game_role WHERE id=? FOR UPDATE",String.class,role); }
    public State current(String token) { return state(sessions.requireRole(token)); }
    private State state(String role) {
        var rows=jdbc.query("SELECT stage_id,initialized FROM game_campaign WHERE role_id=?",
            (row,index)->new State(row.getInt(1),row.getBoolean(2),null,List.of(),List.of(),false),role);
        var current=rows.isEmpty()?new State(1,false,null,List.of(),List.of(),false):rows.getFirst();
        var pending=jdbc.query("SELECT snapshot_json,claimed FROM game_battle WHERE role_id=? AND claimed=FALSE ORDER BY id",
            (row,index)->json.readValue(row.getString(1),CampaignBattle.Report.class).claimed(row.getBoolean(2)),role);
        var stage=rules.stage(current.stageId());
        return new State(current.stageId(),current.initialized(),pending.isEmpty()?null:pending.getFirst(),
            stage==null?List.of():stage.rewards(), current.initialized()?units(role,stage):List.of(),stage!=null && current.initialized());
    }
    /** Explicit once-only starter grant, after Start. Existing heroes/lineups are retained. */
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public State initialize(String token) {
        String role=sessions.requireRole(token);lock(role);
        var current=state(role);
        if(current.initialized()) return current;
        if(jdbc.queryForObject("SELECT COUNT(*) FROM game_campaign WHERE role_id=?",Integer.class,role)==0)
            jdbc.update("INSERT INTO game_campaign(role_id,stage_id,initialized) VALUES (?,1,FALSE)",role);
        if(heroes.list(role).isEmpty()) {
            int[] positions={2,5,8};int index=0;
            for(int template:rules.starters()) {
                String id=UUID.randomUUID().toString();
                jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,?,1,1)",id,role,template);
                jdbc.update("INSERT INTO game_lineup_slot(role_id,position,hero_id) VALUES (?,?,?)",role,positions[index++],id);
            }
            jdbc.update("UPDATE game_role SET lineup_version=lineup_version+1 WHERE id=?",role);
        }
        inventory.credit(role,900101,50);inventory.credit(role,900102,2);
        jdbc.update("UPDATE game_campaign SET initialized=TRUE WHERE role_id=?",role);
        return state(role);
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public CampaignBattle.Report challenge(String token,String requestId) {
        String role=sessions.requireRole(token);
        if(requestId==null || !requestId.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid request ID");
        lock(role);
        var previous=jdbc.query("SELECT snapshot_json,claimed FROM game_battle WHERE role_id=? AND request_id=?",
            (row,index)->json.readValue(row.getString(1),CampaignBattle.Report.class).claimed(row.getBoolean(2)),role,requestId);
        if(!previous.isEmpty()) return previous.getFirst();
        var current=state(role);
        if(!current.initialized()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Initialize role first");
        if(current.pending()!=null) return current.pending();
        var stage=rules.stage(current.stageId());
        if(stage==null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Current content completed");
        var battle=CampaignBattle.resolve(UUID.randomUUID().toString(),rules.version(),stage.id(),current.units(),stage.rewards());
        if(battle.units().stream().noneMatch(CampaignBattle.Unit::ally)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Lineup is empty");
        jdbc.update("INSERT INTO game_battle(id,role_id,request_id,stage_id,claimed,snapshot_json) VALUES (?,?,?,?,FALSE,?)",
            battle.id(),role,requestId,stage.id(),json.writeValueAsString(battle));
        return battle;
    }
    private List<CampaignBattle.Unit> units(String role,CampaignRules.Stage stage) {
        var units=new ArrayList<CampaignBattle.Unit>();
        jdbc.query("SELECT h.*,s.position FROM game_lineup_slot s JOIN game_hero h ON h.id=s.hero_id AND h.role_id=s.role_id WHERE s.role_id=? ORDER BY s.position",
            (org.springframework.jdbc.core.RowCallbackHandler)row->{
                var hero=rules.hero(row.getInt("template_id"),row.getInt("star"));
                units.add(unit(row.getString("id"),true,row.getInt("position"),row.getInt("hero_level"),hero));
            },role);
        int index=0;
        if(stage!=null) for(var enemy:stage.enemies()) units.add(unit("enemy-"+index++,false,enemy.position(),enemy.level(),rules.hero(enemy.templateId(),enemy.star())));
        return List.copyOf(units);
    }
    private CampaignBattle.Unit unit(String id,boolean ally,int position,int level,CampaignRules.Hero hero) {
        return new CampaignBattle.Unit(id,ally,position,hero.templateId(),hero.name(),level,hero.hp(),hero.atk(),hero.def(),hero.spd());
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Settlement claim(String token,String battleId) {
        String role=sessions.requireRole(token);lock(role);
        var reports=jdbc.query("SELECT snapshot_json,claimed FROM game_battle WHERE id=? AND role_id=?",
            (row,index)->json.readValue(row.getString(1),CampaignBattle.Report.class).claimed(row.getBoolean(2)),battleId,role);
        if(reports.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Battle not found");
        var battle=reports.getFirst();
        if(!battle.claimed()) {
            var current=state(role);
            if(battle.stageId()!=current.stageId()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Stage changed");
            for(var reward:battle.rewards()) {
                if(reward.itemId()==900001) jdbc.update("UPDATE game_role SET gold=gold+? WHERE id=?",reward.quantity(),role);
                else if(reward.itemId()==900002) jdbc.update("UPDATE game_role SET diamonds=diamonds+? WHERE id=?",reward.quantity(),role);
                else if(reward.itemId()==900003) jdbc.update("UPDATE game_campaign SET role_exp=role_exp+? WHERE role_id=?",reward.quantity(),role);
                else inventory.credit(role,reward.itemId(),reward.quantity());
            }
            if(battle.won()) jdbc.update("UPDATE game_campaign SET stage_id=stage_id+1 WHERE role_id=?",role);
            jdbc.update("UPDATE game_battle SET claimed=TRUE WHERE id=?",battle.id());
        }
        return new Settlement(battle.claimed(true),roles.findById(role).orElseThrow(),inventory.list(role),state(role).stageId());
    }
}
