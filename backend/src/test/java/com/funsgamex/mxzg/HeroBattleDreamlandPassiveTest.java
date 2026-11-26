/**
 * 核对梦境守军实际安装和触发被动、持续伤害与解除效果。
 * 从同源战斗表读取规则，使用独立战斗状态和可观测的随机输入。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.RandomDecision;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules.Skill;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleDreamlandPassiveTest {
    /** 幼龙入场只抽一次40%，成功后每次普攻伤害给原受击者挂两回合灼烧。 */
    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void babyDragonRollsOnlyOnceForItsOpeningBurnListener(boolean succeeds) {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var rates = new ArrayList<Integer>();
        var decision = new RandomDecision() {
            /** 记录一次入场抽样的旧万分整数，并返回本用例的命中结果。 */
            @Override
            public boolean hit(int rate) {
                rates.add(rate);
                return succeeds;
            }

            /** 固定首个可选目标，让伤害后的选择顺序可重复。 */
            @Override
            public int index(int bound) {
                return 0;
            }
        };
        var actors = List.of(new Actor(1, rules.battleSchedule(List.of(new Skill(101040170, 0)))),
            new Actor(2, List.of()));
        var engine = new HeroBattleHealingExecutor(rules, List.of(state(actors.get(0), 1), state(actors.get(1), 2)),
            decision);
        engine.bindCombatData(1, 10104017, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10404012, Map.of(150, 500L));
        engine.initializePassive(1, 101040173, 1);
        assertEquals(succeeds, engine.buffs(1).stream().anyMatch(entry -> entry.spec().id() == 1173101));

        for (int round = 1; round <= 2; round++) {
            engine.beginRound(round, List.of(1, 2), elements, chance -> chance >= 1D);
            engine.act(1, 2, 100, elements, chance -> chance >= 1D);
        }

        assertEquals(List.of(4000), rates);
        var applied = engine.trace().stream().filter(event -> event.kind().equals("buff.upsert")
            && event.configId() == 1173201).toList();
        assertEquals(succeeds ? List.of(3, 4) : List.of(), applied.stream().map(event -> event.buff().expiresAt()).toList());
        var burns = engine.buffs(2).stream().filter(entry -> entry.spec().id() == 1173201).toList();
        assertEquals(succeeds ? List.of(4) : List.of(), burns.stream().map(entry -> entry.expiresAt()).toList());
        assertTrue(burns.stream().allMatch(entry -> entry.sourceId() == 1));
    }

    /** 时光刺客实际使用同等级替换普攻，御使精灵则受击后仅给自身加成。 */
    @Test
    void timeAssassinUsesReplacementAndSpiritOnlyBuffsItselfWhenHit() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var assassin = new Actor(1, rules.battleSchedule(List.of(new Skill(102050100, 0))));
        var spirit = new Actor(2, List.of());
        var engine = new HeroBattleHealingExecutor(rules, List.of(state(assassin, 1), state(spirit, 2)));
        engine.bindCombatData(1, 10205010, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10404012, Map.of(150, 500L));

        engine.initializePassive(1, 102050103, 1);
        engine.initializePassive(2, 104040123, 1);
        assertEquals(102050105, assassin.generalAttack().skillId());
        assertEquals(263, rules.controlAttribute(2103201).attribute());
        assertTrue(engine.buffs(1).stream().anyMatch(entry -> entry.spec().id() == 2103201));

        engine.beginRound(1, List.of(1, 2), elements, chance -> chance >= 1D);
        engine.act(1, 2, 100, elements, chance -> chance >= 1D);

        assertTrue(engine.trace().stream().anyMatch(event -> event.kind().equals("skill.begin")
            && event.configId() == 102050105));
        assertFalse(engine.buffs(1).stream().anyMatch(entry -> entry.spec().id() == 4123201));
        var defense = engine.buffs(2).stream().filter(entry -> entry.spec().id() == 4123201).findFirst().orElseThrow();
        assertEquals(2, defense.sourceId());
        assertEquals(4, defense.expiresAt());
        engine.expireAt(4);
        assertFalse(engine.buffs(2).stream().anyMatch(entry -> entry.spec().id() == 4123201));
    }

    /** 开局霜寒覆盖敌方、尊重各自抗性，并在到期时还原实时速度。 */
    @Test
    void lucianFrostUsesTargetResistanceAndExpires() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var engine = new HeroBattleHealingExecutor(rules, List.of(state(new Actor(1, List.of()), 1),
            state(new Actor(2, List.of()), 2), state(new Actor(3, List.of()), 2)));
        engine.bindCombatData(1, 10205022, Map.of(101, 100L));
        engine.bindCombatData(2, 10404012, Map.of(101, 100L));
        engine.bindCombatData(3, 10404012, Map.of(101, 100L, 322, 10000L));

        engine.initializePassive(1, 102050224, 1);

        assertTrue(engine.buffs(1).stream().anyMatch(entry -> entry.spec().id() == 2224201));
        assertTrue(engine.buffs(3).isEmpty());
        assertEquals(List.of(-800L), engine.trace().stream().filter(event -> event.configId() == 2224101)
            .map(HeroBattleHealingExecutor.Trace::speedDelta).toList());
        engine.expireAt(2);
        assertTrue(engine.buffs(2).isEmpty());
        assertEquals(List.of(-800L, 800L), engine.trace().stream().filter(event -> event.configId() == 2224101)
            .map(HeroBattleHealingExecutor.Trace::speedDelta).toList());
    }

    /** 尼罗每次附加印记强化自身，同一目标上的另一名施加者不会贡献三层门槛。 */
    @Test
    void nileCountsForestMarksByTheirSource() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var skills = rules.battleSchedule(List.of(new Skill(101050200, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(state(new Actor(1, skills), 1),
            state(new Actor(2, skills), 1), state(new Actor(3, List.of()), 2)));
        engine.bindCombatData(1, 10105020, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10105020, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(3, 10404012, Map.of(150, 500L));
        engine.initializePassive(1, 101050204, 1);
        engine.initializePassive(2, 101050204, 1);
        engine.beginRound(1, List.of(1, 2, 3), elements, chance -> chance > 0D);

        engine.act(1, 3, 100, elements, chance -> chance > 0D);
        engine.act(2, 3, 100, elements, chance -> chance > 0D);
        engine.act(1, 3, 100, elements, chance -> chance > 0D);
        assertFalse(engine.buffs(3).stream().anyMatch(entry -> entry.spec().id() == 1204501));

        engine.act(1, 3, 100, elements, chance -> chance > 0D);

        assertEquals(3L, engine.buffs(1).stream().filter(entry -> entry.spec().id() == 1204401).count());
        assertEquals(1L, engine.buffs(2).stream().filter(entry -> entry.spec().id() == 1204401).count());
        var threshold = engine.buffs(3).stream().filter(entry -> entry.spec().id() == 1204501)
            .findFirst().orElseThrow();
        assertEquals(1, threshold.sourceId());
    }

    /** 追击的101选择器排除主动技能先选中的单位，只伤害其余两名敌方。 */
    @Test
    void furyFollowupExcludesTheOriginalSkillTarget() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var elements = new HeroBattleElementRules(mapper);
        var skills = rules.battleSchedule(List.of(new Skill(104050100, 0), new Skill(104050101, 1)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(state(new Actor(1, skills), 1),
            state(new Actor(2, List.of()), 2), state(new Actor(3, List.of()), 2), state(new Actor(4, List.of()), 2)));
        engine.bindCombatData(1, 10405010, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, 10404012, Map.of(220, 2500L, 150, 500L));
        engine.bindCombatData(3, 10404012, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(4, 10404012, Map.of(220, 1000L, 150, 500L));
        engine.initializePassive(1, 104050104, 1);
        engine.beginRound(1, List.of(1, 2, 3, 4), elements, chance -> chance > 0D);

        engine.act(1, 2, 100, elements, chance -> chance > 0D);

        assertEquals(List.of(2), engine.trace().stream().filter(event -> event.kind().equals("damage")
            && event.configId() == 4101201).map(HeroBattleHealingExecutor.Trace::targetId).toList());
        assertEquals(List.of(3, 4), engine.trace().stream().filter(event -> event.kind().equals("damage")
            && event.configId() == 4104201).map(HeroBattleHealingExecutor.Trace::targetId).toList());
    }

    /** 构造有充足生命的实际英雄格，避免前几次伤害结束战斗。 */
    private static State state(Actor actor, int faction) {
        return new State(actor, faction, actor.id(), 10000, 10000, 1000, 0, 0, 0);
    }
}
