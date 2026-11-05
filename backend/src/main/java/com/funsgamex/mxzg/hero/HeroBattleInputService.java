/**
 * 主线阵容的只读战斗输入：在角色锁内读取持久阵型、站位和英雄，组装未折算属性与技能。
 * 阵型加成沿旧FormationReceivers加入战斗输入，不回写英雄面板；未恢复来源明确列出。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.lineup.MainFormationRules;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class HeroBattleInputService {
    /** 对应持久站位的英雄；attributes保留全部编号及未折算加成，hero仍是独立面板快照；opening仅代表入场基础折算，skillSchedule不执行触发。 */
    public record Unit(int position, HeroProfile hero, Map<Integer, Long> attributes,
                       List<HeroEvolutionRules.Skill> skills, HeroBattleAttributeUtils.Opening opening,
                       List<HeroBattleSkillUtils.Skill> skillSchedule) {
        /** 冻结战斗输入，禁止临时计算反写快照。 */
        public Unit {
            attributes = Map.copyOf(attributes);
            skills = List.copyOf(skills);
            skillSchedule = List.copyOf(skillSchedule);
        }
    }

    /** 阵型与两个持久版本来自同一角色锁；pending非空表示尚非完整战斗输入。 */
    public record Input(long assetRevision, long lineupVersion, int formationId,
                        List<Unit> units, List<String> pending) {
        /** 冻结集合；空阵容保留为空，不代选英雄。 */
        public Input {
            units = List.copyOf(units);
            pending = List.copyOf(pending);
        }
    }

    /** 会话鉴权入口，不接收客户端指定的角色ID。 */
    private final SessionService sessions;
    /** 同一角色行锁和持久资产版本。 */
    private final RoleRepository roles;
    /** 选中阵型、永久解锁和站位的统一持久读取口。 */
    private final MainFormationStateService formations;
    /** 与保存共用的主线规则及站位属性，不复制配置解析器。 */
    private final MainFormationRules formationRules;
    /** 唯一英雄读取口，限定当前角色归属。 */
    private final HeroRepository heroes;
    /** 共用基础、装备及属性累加规则，返回未折算属性。 */
    private final HeroPanelRules panels;
    /** 共用基础技能选择及技能属性贡献。 */
    private final HeroSkillPanelRules skills;
    /** 星级决定的战斗专用防御系数，不加入名册面板。 */
    private final HeroBattleDefenseRules defense;
    /** 共用进化属性和同类型技能覆盖。 */
    private final HeroEvolutionRules evolution;

    /** 注入现有领域入口，不引入资产缓存或新查询协议。 */
    public HeroBattleInputService(SessionService sessions, RoleRepository roles,
                                 MainFormationStateService formations, MainFormationRules formationRules,
                                 HeroRepository heroes, HeroPanelRules panels,
                                 HeroSkillPanelRules skills, HeroEvolutionRules evolution,
                                 HeroBattleDefenseRules defense) {
        this.sessions = sessions;
        this.roles = roles;
        this.formations = formations;
        this.formationRules = formationRules;
        this.heroes = heroes;
        this.panels = panels;
        this.skills = skills;
        this.evolution = evolution;
        this.defense = defense;
    }

    /**
     * 在角色锁内二次鉴权并读取阵型；只读校验持久站位，不自动修复或写入版本。
     * 保存规则会过滤无效请求，持久数据若仍需过滤则视为损坏，拒绝组装部分阵容。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Input current(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        var formation = formations.current(role);
        var roster = heroes.list(role);
        var owned = new HashMap<String, HeroProfile>();
        roster.forEach(hero -> owned.put(hero.id(), hero));
        var candidates = roster.stream().map(hero -> new MainFormationRules.Hero(
            hero.id(), hero.templateId(), hero.level(), hero.star())).toList();
        var unlocks = new MainFormationRules.Unlocks(
            new HashSet<>(formation.unlockedIds()), formation.assistanceUnlocked());
        var validated = formationRules.normalize(formation.formationId(), unlocks, candidates, formation.slots());
        if (!validated.equals(formation.slots())) {
            throw new IllegalStateException("持久阵容不符合已解锁阵型或英雄规则");
        }

        var units = new ArrayList<Unit>();
        for (var slot : validated) {
            var hero = owned.get(slot.heroId());
            var evolved = evolution.resolve(hero.templateId(), hero.evolution().type(), hero.evolution().level());
            var position = formationRules.position(formation.formationId(), slot.position());
            var attributes = panels.attributes(hero.baseStats(), hero.equipment(), add -> {
                // 旧 BattleTemplate 先设置星级基础系数，再累加其他来源的同编号属性。
                add.accept(150, defense.coefficient(hero.star()));
                skills.contribute(hero.templateId(), hero.star(), hero.stage(), add);
                evolved.attributes().forEach(add);
                // 与旧FormationReceivers一致：按阵型/站位加入原始属性，百分比不提前折算。
                position.attributes().forEach(add);
            });
            var selected = evolution.applySkills(
                skills.select(hero.templateId(), hero.star(), hero.stage()), evolved);
            units.add(new Unit(slot.position(), hero, attributes, selected,
                HeroBattleAttributeUtils.opening(attributes), skills.battleSchedule(selected)));
        }
        return new Input(roles.revision(role), formation.version(), formation.formationId(), units,
            List.of("soul_talent_runes_awakening", "account_and_team_sources",
                "battle_special_attributes_and_triggers"));
    }
}
