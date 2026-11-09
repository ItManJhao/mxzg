/**
 * 当前主线队伍的服务端战力读取，供MainChapterService的等级/战力门槛使用。
 * 按旧QueryHeros路径从持久英雄组装面板来源，不把阵型或元素光环重复计入评分。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HeroMainPowerService {
    /** 鉴权并锁定当前角色，读取同一版本的持久阵容。 */
    private final HeroBattleInputService inputs;
    /** 普通装备、套装与原始基础属性组装。 */
    private final HeroPanelRules panels;
    /** 当前解锁静态技能属性贡献，不执行战斗触发。 */
    private final HeroSkillPanelRules skills;
    /** 持久进化的原始属性贡献。 */
    private final HeroEvolutionRules evolution;
    /** 同源评分公式。 */
    private final HeroPowerRules powers;

    /** 队伍总分、逐英雄分值与输入版本；pending非空时不能声称完整还原旧服战力。 */
    public record State(long assetRevision, long lineupVersion, int total,
                        Map<String, Integer> heroes, List<String> pending) {
        /** 评分是只读投影，调用者不能修改持久状态或覆盖缺口。 */
        public State {
            heroes = Map.copyOf(heroes);
            pending = List.copyOf(pending);
        }
    }

    /** 复用现有属性规则，避免另造英雄数据源。 */
    public HeroMainPowerService(HeroBattleInputService inputs, HeroPanelRules panels,
            HeroSkillPanelRules skills, HeroEvolutionRules evolution, HeroPowerRules powers) {
        this.inputs = inputs;
        this.panels = panels;
        this.skills = skills;
        this.evolution = evolution;
        this.powers = powers;
    }

    /**
     * 在同一角色事务内读取已保存队伍并逐英雄取整求和，空队伍返回0。
     * 当前仅含已恢复属性来源；后续挑战必须保留范围校验，不能只看战力达到门槛。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State current(String token) {
        var input = inputs.current(token);
        var scores = new LinkedHashMap<String, Integer>();
        int total = 0;
        var pending = new LinkedHashSet<String>();
        for (var unit : input.units()) {
            var hero = unit.hero();
            var evolved = evolution.resolve(hero.templateId(), hero.evolution().type(), hero.evolution().level());
            var attributes = panels.attributes(hero.baseStats(), hero.equipment(), add -> {
                skills.contribute(hero.templateId(), hero.star(), hero.stage(), add);
                evolved.attributes().forEach(add);
            });
            int score = powers.score(attributes);
            if (scores.put(hero.id(), score) != null) {
                throw new IllegalStateException("主线队伍英雄重复");
            }
            total = Math.addExact(total, score);
            pending.addAll(hero.panelStats().pendingSources());
        }
        return new State(input.assetRevision(), input.lineupVersion(), total, scores, List.copyOf(pending));
    }
}
