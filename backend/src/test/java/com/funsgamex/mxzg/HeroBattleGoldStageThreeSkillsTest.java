/** 通过真实一级技能配置检查金币第三关的治疗守护、庇护分伤与石化普攻替换。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleGoldStageThreeSkillsTest {
    /** 三名队友先治疗，再给重新排序后的最低血量比例者施加护甲、火灵和反击烈火。 */
    @Test void lightSpiritSelectsProtectionAfterHealing() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var lightSpirit = actor(rules, 1, 10305007, 5);
        var enemy = actor(rules, 4, 10301001, 1);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                new State(lightSpirit, 1, 3, 5_000, 10_000, 100, 0, 0, 0),
                new State(new Actor(2, List.of()), 1, 5, 4_600, 10_000, 100, 0, 0, 0),
                new State(new Actor(3, List.of()), 1, 8, 480, 1_000, 100, 0, 0, 0),
                new State(enemy, 2, 2, 13_000, 13_000, 100, 0, 0, 0),
                new State(new Actor(5, List.of()), 1, 2, 5_100, 10_000, 100, 0, 0, 0)));
        bind(engine, 1, 10305007, 1_000);
        for (int id : List.of(2, 3, 4, 5)) {
            bind(engine, id, 10301001, 300);
        }
        var order = List.of(1, 2, 3, 4, 5);
        engine.beginRound(1, order, elements, chance -> chance > 0);
        engine.act(1, 4, 100, elements, chance -> chance > 0);
        assertEquals(List.of(2, 3, 1), engine.recoveries().stream()
                .map(HeroBattleHealingExecutor.Recovery::targetId).toList());
        assertEquals(5_760, engine.state(1).hp());
        assertEquals(5_360, engine.state(2).hp());
        assertEquals(1_000, engine.state(3).hp());
        assertEquals(List.of(3071401, 3071601), buffs(engine, 5));
        engine.attack(4, 5, elements, chance -> chance > 0);
        assertEquals(List.of(3071701), buffs(engine, 4));
        assertEquals(5, engine.buffs(4).getFirst().sourceId());
        engine.beginRound(2, order, elements, chance -> chance > 0);
        var fire = engine.damages().getLast();
        assertEquals(3071701, fire.buffId());
        assertEquals(700, fire.incoming());
        assertEquals(12_300, engine.state(4).hp());
        assertTrue(buffs(engine, 4).isEmpty());
        assertTrue(buffs(engine, 5).isEmpty());
    }

    /** 庇护选最高攻击的两名其他队友，分出40%扣血前的原伤害，自身只获得两项属性。 */
    @Test void flameKnightShelterTransfersDamageToItsCaster() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var knight = actor(rules, 1, 10105007, 5);
        var enemy = actor(rules, 4, 10301001, 1);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                state(knight, 1, 8), state(new Actor(2, List.of()), 1, 2),
                state(new Actor(3, List.of()), 1, 3), state(enemy, 2, 2),
                state(new Actor(5, List.of()), 1, 7)));
        bind(engine, 1, 10105007, 500);
        bind(engine, 2, 10301001, 400);
        bind(engine, 3, 10301001, 600);
        bind(engine, 4, 10301001, 1_500);
        bind(engine, 5, 10301001, 10);
        var order = List.of(1, 2, 3, 4, 5);
        engine.beginRound(1, order, elements, chance -> chance > 0);
        engine.act(1, 4, 100, elements, chance -> chance > 0);
        assertEquals(List.of(1071501, 1071601), buffs(engine, 1));
        assertEquals(List.of(1071201, 1071301, 1071401), buffs(engine, 2));
        assertEquals(List.of(1071201, 1071301, 1071401), buffs(engine, 3));
        assertTrue(buffs(engine, 5).isEmpty());
        engine.attack(4, 2, elements, chance -> chance > 0);
        assertEquals(2, engine.damages().size());
        var share = engine.damages().getFirst();
        var direct = engine.damages().getLast();
        assertEquals(1, share.targetId());
        assertEquals(2, direct.targetId());
        assertEquals(4, share.sourceId());
        assertEquals(direct.buffId(), share.buffId());
        assertEquals((share.incoming() + direct.incoming()) * 4 / 10, share.incoming());
        engine.beginRound(2, order, elements, chance -> chance > 0);
        assertFalse(buffs(engine, 2).isEmpty());
        engine.beginRound(3, order, elements, chance -> chance > 0);
        assertTrue(buffs(engine, 2).isEmpty());
    }

    /** 爱德华的入场被动替换普攻，主动与替换普攻独立石化，两个能量配置均不写战报。 */
    @Test void edwardKeepsPetrifyWithoutDormantEnergyMutation() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var edward = actor(rules, 1, 10505004, 5);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                state(edward, 1, 2), state(new Actor(2, List.of()), 2, 2),
                state(new Actor(3, List.of()), 2, 3)));
        bind(engine, 1, 10505004, 1_000);
        bind(engine, 2, 10301001, 100);
        bind(engine, 3, 10301001, 100);
        engine.initializePassive(1, 105050042, 1);
        engine.beginRound(1, List.of(1, 2, 3), elements, chance -> chance > 0);
        engine.act(1, 2, 100, elements, chance -> chance > 0);
        assertEquals(Set.of(2, 3), engine.damages().stream()
                .filter(damage -> damage.buffId() == 5041201)
                .map(HeroBattleHealingExecutor.Damage::targetId).collect(Collectors.toSet()));
        assertEquals(List.of(5041701), buffs(engine, 1));
        assertEquals(List.of(5041501), buffs(engine, 2));
        assertEquals(List.of(5041501), buffs(engine, 3));
        engine.beginRound(2, List.of(1, 2, 3), elements, chance -> chance > 0);
        engine.attack(1, 2, elements, chance -> chance > 0);
        assertEquals(5042301, engine.damages().getLast().buffId());
        assertEquals(List.of(5042401), buffs(engine, 2));
        assertTrue(engine.trace().stream().anyMatch(event -> event.configId() == 5042201));
        assertFalse(engine.trace().stream().anyMatch(event -> event.configId() == 5041301 || event.configId() == 5042601));
    }

    /** 读取真实模板的现有技能排期，复用副本的初始强化档。 */
    private static Actor actor(HeroSkillPanelRules rules, int id, int template, int stars) {
        return new Actor(id, rules.battleSchedule(rules.select(template, stars, 0)));
    }

    /** 提供比单次技能伤害更高的固定生命，留出多段验证空间。 */
    private static State state(Actor actor, int faction, int position) {
        return new State(actor, faction, position, 10_000, 10_000, 100, 0, 0, 0);
    }

    /** 冻结本专项用到的真实计算输入，控制与护甲保持常规基值。 */
    private static void bind(HeroBattleHealingExecutor engine, int id, int template, long attack) {
        engine.bindCombatData(id, template, Map.of(220, attack, 150, 500L));
    }

    /** 方便核对某个单位身上仍有效的配置及安装顺序。 */
    private static List<Integer> buffs(HeroBattleHealingExecutor engine, int unitId) {
        return engine.buffs(unitId).stream().map(entry -> entry.spec().id()).toList();
    }
}
