/**
 * 持久阵容的只读战斗输入：在角色锁内读取主线、挂机或独立玩法的阵型、站位和英雄，组装未折算属性与技能。
 * 阵型加成沿旧FormationReceivers加入战斗输入，不回写英雄面板；未恢复来源明确列出。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.lineup.MainFormationRules;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class HeroBattleInputService {
    /** 对应持久站位的英雄；attributes保留全部编号及未折算加成，hero仍是独立面板快照；opening仅代表入场基础折算，skillSchedule不执行触发；element来自英雄模板，不受外观影响。 */
    public record Unit(int position, HeroProfile hero, Map<Integer, Long> attributes,
                       List<HeroEvolutionRules.Skill> skills, HeroBattleAttributeUtils.Opening opening,
                       List<HeroBattleSkillUtils.Skill> skillSchedule, int element) {
        /** 冻结战斗输入，禁止临时计算反写快照。 */
        public Unit {
            attributes = Map.copyOf(attributes);
            skills = List.copyOf(skills);
            skillSchedule = List.copyOf(skillSchedule);
        }

        /** 为本次战斗创建独立读取状态；不能在每次属性读取时重建，否则会丢失一次性消费。 */
        public HeroBattleAttributeState newAttributeState() {
            return new HeroBattleAttributeState(attributes);
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
    /** 英雄真实元素及克制配置，仅用于战斗输入。 */
    private final HeroBattleElementRules elements;
    /** 共用进化属性和同类型技能覆盖。 */
    private final HeroEvolutionRules evolution;

    /** 注入现有领域入口，不引入资产缓存或新查询协议。 */
    public HeroBattleInputService(SessionService sessions, RoleRepository roles,
                                 MainFormationStateService formations, MainFormationRules formationRules,
                                 HeroRepository heroes, HeroPanelRules panels,
                                 HeroSkillPanelRules skills, HeroEvolutionRules evolution,
                                 HeroBattleDefenseRules defense, HeroBattleElementRules elements) {
        this.sessions = sessions;
        this.roles = roles;
        this.formations = formations;
        this.formationRules = formationRules;
        this.heroes = heroes;
        this.panels = panels;
        this.skills = skills;
        this.evolution = evolution;
        this.defense = defense;
        this.elements = elements;
    }

    /**
     * 在角色锁内二次鉴权并读取阵型；只读校验持久站位，不自动修复或写入版本。
     * 保存规则会过滤无效请求，持久数据若仍需过滤则视为损坏，拒绝组装部分阵容。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Input current(String token) {
        return read(token, false);
    }

    /** 旧LANG_UP独立阵型固定起源序列1，不把主线后续选择的阵型加成带入挂机。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Input currentForIdle(String token) {
        return read(token, true);
    }

    /** 将指定玩法已保存的阵容组装为同一战斗输入，调用方须依业务事务锁定角色并验证会话。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public Input forFormation(String role, long version, int formationId, List<Lineup.Slot> slots) {
        var formation = formations.current(role);
        return assemble(role, formation, version, formationId, formationId, slots);
    }

    /** 主线使用所选阵型，挂机使用起源阵型的站位属性。 */
    private Input read(String token, boolean idle) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        var formation = formations.current(role);
        int attributesFormationId = idle ? 1 : formation.formationId();
        return assemble(role, formation, formation.version(), formation.formationId(),
                attributesFormationId, formation.slots());
    }

    /** 复用角色名册、原站位加成及神装、圣器套装技能，校验专用阵容与同一永久解锁目录。 */
    private Input assemble(String role, MainFormationStateService.State unlocked, long version, int formationId,
                           int attributesFormationId, List<Lineup.Slot> slots) {
        var roster = heroes.list(role);
        var owned = new HashMap<String, HeroProfile>();
        roster.forEach(hero -> owned.put(hero.id(), hero));
        var candidates = roster.stream().map(hero -> new MainFormationRules.Hero(
            hero.id(), hero.templateId(), hero.level(), hero.star())).toList();
        var unlocks = new MainFormationRules.Unlocks(
            new HashSet<>(unlocked.unlockedIds()), unlocked.assistanceUnlocked());
        var validated = formationRules.normalize(formationId, unlocks, candidates, slots);
        if (!validated.equals(slots)) {
            throw new IllegalStateException("持久阵容不符合已解锁阵型或英雄规则");
        }

        var units = new ArrayList<Unit>();
        for (var slot : validated) {
            var hero = owned.get(slot.heroId());
            var evolved = evolution.resolve(hero.templateId(), hero.evolution().type(), hero.evolution().level());
            var position = formationRules.position(attributesFormationId, slot.position());
            var attributes = panels.attributes(hero.baseStats(), hero.equipment(), add -> {
                // 旧 BattleTemplate 先设置星级基础系数，再累加其他来源的同编号属性。
                add.accept(150, defense.coefficient(hero.star()));
                skills.contribute(hero.templateId(), hero.star(), hero.stage(), add);
                evolved.attributes().forEach(add);
                hero.growthAttributes().forEach(add);
                // 与旧FormationReceivers一致：按阵型/站位加入原始属性，百分比不提前折算。
                position.attributes().forEach(add);
            });
            var selected = new ArrayList<>(evolution.applySkills(
                skills.select(hero.templateId(), hero.star(), hero.stage()), evolved));
            selected.addAll(hero.loadoutSkills());
            units.add(new Unit(slot.position(), hero, attributes, selected,
                HeroBattleAttributeUtils.opening(attributes), skills.battleSchedule(selected), elements.element(hero.templateId())));
        }
        var pending = List.of("soul_talent_runes_awakening", "account_and_team_sources",
                "battle_special_attributes_and_triggers");
        return new Input(roles.revision(role), version, attributesFormationId, units, pending);
    }
}
