/** 回归试炼和梦境的守军被动，使用原等级和共享战斗事件执行器验算。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules.Skill;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleSharedGuardListenerTest {
    /** 从游戏配置恢复被动，测试内不替换原动作或触发时点。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(new ObjectMapper());
    /** 共用真实元素规则，控制测试概率以稳定触发和落空结果。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(new ObjectMapper());

    /** 提米六档均可初始化，友方和敌方的离场都只治疗原施加者，第四档后额外提升暴击率。 */
    @Test
    void timiUsesOriginalCasterWhenOtherUnitsFall() {
        for (int level = 1; level <= 6; level++) {
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    fighter(1, 1, 1, 3000, new Skill(103050150, 0), new Skill(103050154, level)),
                    fighter(2, 1, 2, 1, new Skill(101050200, 0)),
                    fighter(3, 2, 1, 10000, new Skill(101050200, 0)),
                    fighter(4, 2, 2, 1, new Skill(101050200, 0))));
            battle.bindCombatData(1, 10305015, Map.of(220, 500L, 150, 500L));
            for (int id : List.of(2, 3, 4)) {
                battle.bindCombatData(id, 10105020, Map.of(220, 500L, 150, 500L));
            }
            battle.initializePassive(1, 103050154, level);
            assertTrue(buffIds(battle, 1).isEmpty());
            for (int id : List.of(2, 3, 4)) {
                assertEquals(List.of(3154100 + level), buffIds(battle, id));
            }
            battle.beginRound(1, List.of(1, 2, 3, 4), elements, chance -> chance >= 1D);
            battle.ordinaryDamage(1011401, 3, List.of(2), 1, false, 0, elements, chance -> chance >= 1D);
            battle.ordinaryDamage(1011401, 1, List.of(4), 1, false, 0, elements, chance -> chance >= 1D);
            int heal = level < 3 ? (level + 1) * 100 : 1000;
            assertEquals(3000 + 2L * heal, battle.state(1).hp());
            assertEquals(List.of(1, 1), battle.recoveries().stream()
                    .map(HeroBattleHealingExecutor.Recovery::sourceId).toList());
            assertEquals(level < 4 ? 4 : 6, buffIds(battle, 1).size());
            assertTrue(buffIds(battle, 2).isEmpty());
            assertTrue(buffIds(battle, 4).isEmpty());
        }
    }

    /** 普攻监听尊重各档概率，只选一名敌人，持续三回合并按旧同组规则刷新。 */
    @Test
    void holyKnightArmorReductionIsAnOrdinaryAttackReaction() {
        for (int level = 1; level <= 3; level++) {
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    fighter(1, 1, 1, 10000, new Skill(104050070, 0), new Skill(104050074, level)),
                    fighter(2, 2, 1, 10000, new Skill(101050200, 0)),
                    fighter(3, 2, 2, 10000, new Skill(101050200, 0))), new FixedRandom());
            battle.bindCombatData(1, 10405007, Map.of(220, 200L, 150, 500L));
            for (int id : List.of(2, 3)) {
                battle.bindCombatData(id, 10105020, Map.of(220, 200L, 150, 500L));
            }
            battle.initializePassive(1, 104050074, level);
            assertEquals(List.of(4074100 + level), buffIds(battle, 1));
            battle.beginRound(1, List.of(1, 2, 3), elements, chance -> chance >= 1D);
            battle.attack(1, 3, elements, chance -> chance >= 1D);
            assertTrue(buffIds(battle, 2).isEmpty());
            for (int hit = 0; hit < 2; hit++) {
                battle.attack(1, 3, elements, chance -> chance >= 0.5D);
            }
            assertEquals(List.of(4074200 + level), buffIds(battle, 2));
            assertTrue(buffIds(battle, 3).isEmpty());
            battle.expireAt(4);
            assertTrue(buffIds(battle, 2).isEmpty());
        }
    }

    /** 装配真实技能排期和固定生命，便于控制触发顺序。 */
    private State fighter(int id, int faction, int position, long hp, Skill... skills) {
        return new State(new Actor(id, rules.battleSchedule(List.of(skills))), faction, position,
                hp, 10000, 200, 0, 0, 0);
    }

    /** 读取该单位已安装的状态，保留安装顺序用于断言。 */
    private static List<Integer> buffIds(HeroBattleHealingExecutor battle, int unit) {
        return battle.buffs(unit).stream().map(entry -> entry.spec().id()).toList();
    }

    /** 固定抽取首项，概率由伤害调用显式注入。 */
    private static final class FixedRandom implements HeroBattleHealingExecutor.RandomDecision {
        /** 保留确定性监听安装，实际受击分支不使用本入口。 */
        @Override
        public boolean hit(int configuredRate) {
            return configuredRate == 10000;
        }

        /** 让随机选择稳定落在首个敌方候选。 */
        @Override
        public int index(int bound) {
            return 0;
        }
    }
}
