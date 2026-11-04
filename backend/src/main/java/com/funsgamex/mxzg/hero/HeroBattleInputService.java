/**
 * 主线阵容的只读战斗输入基础：同一角色锁内读取持久阵容和英雄，共用面板属性与技能选择规则。
 * 目前仅内部验算使用，明确列出未恢复来源，不调用简化战斗、不提供挑战或阵容写协议。
 */
package com.funsgamex.mxzg.hero;
import java.util.*;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.lineup.LineupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
@Service
public class HeroBattleInputService {
    /** 对应持久站位的英雄；attributes为完整编号的当前已恢复加成，skills含普攻与进化覆盖。 */
    public record Unit(int position,HeroProfile hero,Map<Integer,Long> attributes,List<HeroEvolutionRules.Skill> skills) {
        /** 拷贝只读输入，不能通过战斗临时状态反写英雄快照。 */
        public Unit { attributes=Map.copyOf(attributes);skills=List.copyOf(skills); }
    }
    /** 同时保留资产与阵容版本；pending非空表示禁止当作完整战斗输入。 */
    public record Input(long assetRevision,long lineupVersion,List<Unit> units,List<String> pending) {
        /** 冻结全部集合，空阵容保留为空。 */
        public Input { units=List.copyOf(units);pending=List.copyOf(pending); }
    }
    /** 会话鉴权入口，不接收客户端角色ID。 */
    private final SessionService sessions;
    /** 同一角色行锁和资产版本。 */
    private final RoleRepository roles;
    /** 持久主线站位与阵容版本。 */
    private final LineupRepository lineups;
    /** 唯一英雄读取入口，限定所属角色。 */
    private final HeroRepository heroes;
    /** 与详情共用属性累加，返回未折算属性。 */
    private final HeroPanelRules panels;
    /** 与详情面板共用基础技能选择。 */
    private final HeroSkillPanelRules skills;
    /** 当前进化总属性与同类型技能覆盖。 */
    private final HeroEvolutionRules evolution;
    /** 注入现有领域入口，不增加状态副本或查询协议。 */
    public HeroBattleInputService(SessionService sessions,RoleRepository roles,LineupRepository lineups,HeroRepository heroes,HeroPanelRules panels,HeroSkillPanelRules skills,HeroEvolutionRules evolution){this.sessions=sessions;this.roles=roles;this.lineups=lineups;this.heroes=heroes;this.panels=panels;this.skills=skills;this.evolution=evolution;}
    /** 在角色锁内二次鉴权，按持久站位组装；外来英雄或重复实例视为损坏数据并拒绝。 */
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Input current(String token){
        String role=sessions.requireRole(token);roles.lock(role);sessions.requireRole(token);
        var formation=lineups.read(role);Map<String,HeroProfile> owned=new HashMap<>();heroes.list(role).forEach(hero->owned.put(hero.id(),hero));
        var units=new ArrayList<Unit>();Set<String> seen=new HashSet<>();Set<Integer> positions=new HashSet<>();
        for(var slot:formation.slots()){
            var hero=owned.get(slot.heroId());
            if(hero==null||!seen.add(hero.id())||!positions.add(slot.position()))throw new IllegalStateException("阵容归属或站位损坏");
            var evolved=evolution.resolve(hero.templateId(),hero.evolution().type(),hero.evolution().level());
            var attributes=panels.attributes(hero.baseStats(),hero.equipment(),add->{skills.contribute(hero.templateId(),hero.star(),hero.stage(),add);evolved.attributes().forEach(add);});
            var selected=evolution.applySkills(skills.select(hero.templateId(),hero.star(),hero.stage()),evolved);
            units.add(new Unit(slot.position(),hero,attributes,selected));
        }
        return new Input(roles.revision(role),formation.version(),units,List.of("formation_unlock_and_template_limits","soul_talent_runes_awakening","account_and_team_sources","battle_special_attributes_and_triggers"));
    }
}
