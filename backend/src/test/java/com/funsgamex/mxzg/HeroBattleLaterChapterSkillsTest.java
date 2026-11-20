/**
 * 使用第 99、100、103 关的真实技能配置回归复活、入场替换普攻和普攻后监听。
 * 场内血量和伤害决策由测试准备，技能排期、目标选择和效果走生产执行器。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class HeroBattleLaterChapterSkillsTest {
    /** 场内使用的技能、动作和Buff均从真实配置读取。 */
    private final HeroSkillPanelRules skills = new HeroSkillPanelRules(new ObjectMapper());
    /** 伤害使用生产元素与倍率配置。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(new ObjectMapper());

    /** 琪亚娜与同队两名受伤角色；第四号的攻击可以真实制造死亡，验证倒下顺序。 */
    private HeroBattleHealingExecutor kianaBattle() {
        var kiana = new Actor(1, skills.battleSchedule(List.of(new HeroEvolutionRules.Skill(101050103, 1),
            new HeroEvolutionRules.Skill(101050100, 0))));
        var engine = new HeroBattleHealingExecutor(skills, List.of(
            new State(kiana, 1, 1, 1000, 1000, 100, 0, 0, 0),
            new State(new Actor(2, List.of()), 1, 2, 300, 1000, 0, 0, 0, 0),
            new State(new Actor(3, List.of()), 1, 3, 100, 1000, 0, 0, 0, 0),
            new State(new Actor(4, List.of()), 2, 1, 1000, 1000, 10000, 0, 0, 0)));
        engine.bindCombatData(1, 10105010, Map.of(220, 100L, 150, 500L));
        engine.bindCombatData(2, 10505008, Map.of(150, 500L));
        engine.bindCombatData(3, 10505008, Map.of(150, 500L));
        engine.bindCombatData(4, 10505008, Map.of(220, 10000L, 150, 500L));
        return engine;
    }

    /** 两名倒下盟友只复活先倒下的一名，恢复攻击的 110%，并交付明确战报事件。 */
    @Test
    void revivesFirstFallenAllyWithOriginalAmount() {
        var engine = kianaBattle();
        var order = List.of(1, 2, 3, 4);
        engine.beginRound(1, order, elements, chance -> true);
        engine.ordinaryDamage(5081501, 4, List.of(3, 2), 1, false, 0, elements, chance -> true);
        assertTrue(engine.state(3).actor().isDead());
        assertTrue(engine.state(2).actor().isDead());
        engine.beginRound(2, order, elements, chance -> true);
        engine.act(1, 4, 100, elements, chance -> true);
        assertEquals(110, engine.state(3).hp());
        assertFalse(engine.state(3).actor().isDead());
        assertTrue(engine.state(2).actor().isDead());
        assertTrue(engine.trace().stream().anyMatch(event -> event.kind().equals("revival")
            && event.targetId() == 3 && event.configId() == 1103201 && event.recovery().actual() == 110));
    }

    /** 无人倒下时治疗生命比例最低队友，走另一个原治疗动作，避免把普通恢复当复活。 */
    @Test
    void healsLowestLivingAllyWhenNobodyFell() {
        var engine = kianaBattle();
        var order = List.of(1, 2, 3, 4);
        engine.beginRound(1, order, elements, chance -> true);
        engine.beginRound(2, order, elements, chance -> true);
        engine.act(1, 4, 100, elements, chance -> true);
        assertEquals(285, engine.state(3).hp());
        assertEquals(300, engine.state(2).hp());
        assertTrue(engine.trace().stream().anyMatch(event -> event.kind().equals("recovery")
            && event.targetId() == 3 && event.configId() == 1103301));
        assertTrue(engine.trace().stream().noneMatch(event -> event.kind().equals("revival")));
    }

    /** 入场后格伦改用同级特化普攻，仍按回合释放原主动，并保留输入快照。 */
    @Test
    void replacesOrdinaryAttackAtPassiveLevelOnlyInsideBattle() {
        var input = skills.battleSchedule(List.of(new HeroEvolutionRules.Skill(102050081, 1),
            new HeroEvolutionRules.Skill(102050083, 1), new HeroEvolutionRules.Skill(102050080, 0)));
        var glenn = new Actor(1, input);
        var engine = new HeroBattleHealingExecutor(skills, List.of(
            new State(glenn, 1, 1, 1000, 1000, 100, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 1, 2000, 2000, 0, 0, 0, 0)));
        engine.bindCombatData(1, 10205008, Map.of(220, 100L, 150, 500L));
        engine.bindCombatData(2, 10505008, Map.of(150, 500L));
        engine.initializePassive(1, 102050083, 1);
        assertEquals(102050085, glenn.generalAttack().skillId());
        assertEquals(1, glenn.generalAttack().level());
        assertEquals(102050080, input.getLast().skillId());
        engine.beginRound(1, List.of(1, 2), elements, chance -> false);
        engine.act(1, 2, 100, elements, chance -> false);
        engine.beginRound(2, List.of(1, 2), elements, chance -> false);
        engine.act(1, 2, 100, elements, chance -> false);
        assertEquals(List.of(102050081, 102050085), engine.trace().stream()
            .filter(event -> event.kind().equals("skill.begin")).map(HeroBattleHealingExecutor.Trace::configId).toList());
    }

    /** 开膛手按同级替换普攻，百分比更低的敌人先于绝对血量更低的敌人被选中。 */
    @Test
    void ripperReplacesOrdinaryAttackAndTargetsLowestHpRatio() {
        var input = skills.battleSchedule(List.of(new HeroEvolutionRules.Skill(103050113, 1),
            new HeroEvolutionRules.Skill(103050110, 0)));
        var ripper = new Actor(1, input);
        var engine = new HeroBattleHealingExecutor(skills, List.of(
            new State(ripper, 1, 1, 1000, 1000, 100, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 1, 1000, 2000, 0, 0, 0, 0),
            new State(new Actor(3, List.of()), 2, 2, 300, 400, 0, 0, 0, 0)));
        engine.bindCombatData(1, 10305011, Map.of(220, 100L, 150, 500L));
        engine.bindCombatData(2, 10305008, Map.of(150, 500L));
        engine.bindCombatData(3, 10305008, Map.of(150, 500L));
        engine.initializePassive(1, 103050113, 1);

        assertEquals(103050115, ripper.generalAttack().skillId());
        assertEquals(1, ripper.generalAttack().level());
        assertEquals(103050110, input.getLast().skillId());
        engine.beginRound(1, List.of(1, 2, 3), elements, chance -> chance >= 1);
        engine.act(1, 3, 100, elements, chance -> chance >= 1);

        assertTrue(engine.trace().stream().anyMatch(event -> event.kind().equals("presentation")
            && event.configId() == 3115201 && event.targetId() == 2));
        assertTrue(engine.trace().stream().anyMatch(event -> event.kind().equals("damage")
            && event.configId() == 3115301 && event.targetId() == 2));
        assertEquals(300, engine.state(3).hp());
    }

    /** 风行之神的监听真实安装；原0号选择器在空候选上移除自身，两次普攻均没有技能伤害增益落地。 */
    @Test
    void windGodOrdinaryAttackKeepsOriginalEmptyBuffTargets() {
        var input = skills.battleSchedule(List.of(new HeroEvolutionRules.Skill(103050063, 1),
            new HeroEvolutionRules.Skill(103050060, 0)));
        var wind = new Actor(1, input);
        var engine = new HeroBattleHealingExecutor(skills, List.of(
            new State(wind, 1, 1, 1000, 1000, 100, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 1, 2000, 2000, 0, 0, 0, 0)));
        engine.bindCombatData(1, 10305006, Map.of(220, 100L, 150, 500L));
        engine.bindCombatData(2, 10305008, Map.of(150, 500L));
        engine.initializePassive(1, 103050063, 1);
        for (int round = 1; round <= 2; round++) {
            engine.beginRound(round, List.of(1, 2), elements, chance -> chance >= 1);
            engine.act(1, 2, 100, elements, chance -> chance >= 1);
        }

        assertEquals(172, skills.battleTrigger(3063101).event());
        assertEquals(List.of(0), skills.battleTargets(3063201).selectors());
        assertEquals(1000, skills.controlAttribute(3063301).amount());
        assertTrue(engine.trace().stream().anyMatch(event -> event.kind().equals("buff.upsert")
            && event.configId() == 3063101 && event.targetId() == 1));
        assertEquals(2, engine.trace().stream().filter(event -> event.kind().equals("skill.begin")
            && event.configId() == 103050060).count());
        assertTrue(engine.trace().stream().noneMatch(event -> event.configId() == 3063301));
    }
}
