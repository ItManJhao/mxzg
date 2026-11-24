/** 金币副本第二关守军技能专项，以真实配置和可复算的属性检查诅咒与治疗。 */
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
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleGoldStageTwoSkillsTest {
    /** 末日使者只安装60%的诅咒，在绝对到期时使用当前攻击扣血一次。 */
    @Test void doombringerCurseTicksOnlyAtExpiry() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var actor = new Actor(1, rules.battleSchedule(rules.select(10505006, 5, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                new State(actor, 1, 2, 10_000, 10_000, 100, 0, 0, 0),
                new State(new Actor(2, List.of()), 2, 2, 10_000, 10_000, 100, 0, 0, 0)));
        engine.bindCombatData(1, 10505006, Map.of(220, 500L, 150, 500L));
        engine.bindCombatData(2, 10301001, Map.of(220, 100L, 150, 500L));
        var elements = new HeroBattleElementRules(mapper);
        var order = List.of(1, 2);
        engine.beginRound(1, order, elements, chance -> chance >= 0.6);
        engine.act(1, 2, 100, elements, chance -> chance >= 0.6);
        var curse = engine.buffs(2).getFirst();
        assertEquals(List.of(5061501), engine.buffs(2).stream().map(entry -> entry.spec().id()).toList());
        long hp = engine.state(2).hp();
        for (int round = 2; round < curse.expiresAt(); round++) {
            engine.beginRound(round, order, elements, chance -> chance >= 0.6);
            assertEquals(hp, engine.state(2).hp());
        }
        engine.setOnceAttribute(1, 220, 1_000);
        engine.beginRound(curse.expiresAt(), order, elements, chance -> chance >= 0.6);
        assertEquals(hp - 300, engine.state(2).hp());
        assertEquals(5061501, engine.damages().getLast().buffId());
        assertEquals("expire", engine.removals().getLast().reason());
        assertTrue(engine.signals().stream().anyMatch(signal -> signal.event() == 195));
        engine.beginRound(curse.expiresAt() + 1, order, elements, chance -> chance >= 0.6);
        assertEquals(hp - 300, engine.state(2).hp());
    }

    /** 卡伊的独立后续动作选三个存活队友，各以施加者攻击的20%结算。 */
    @Test void kaiHealsAlliesAfterOrdinaryDamage() {
        var mapper = new ObjectMapper();
        var rules = new HeroSkillPanelRules(mapper);
        var actor = new Actor(1, rules.battleSchedule(rules.select(10405004, 5, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
                new State(actor, 1, 2, 5_000, 10_000, 100, 0, 0, 0),
                new State(new Actor(2, List.of()), 1, 3, 5_000, 10_000, 100, 0, 0, 0),
                new State(new Actor(3, List.of()), 1, 5, 5_000, 10_000, 100, 0, 0, 0),
                new State(new Actor(4, List.of()), 2, 2, 10_000, 10_000, 100, 0, 0, 0)));
        engine.bindCombatData(1, 10405004, Map.of(220, 1_000L, 150, 500L));
        for (int id : List.of(2, 3, 4)) {
            engine.bindCombatData(id, 10301001, Map.of(220, 100L, 150, 500L));
        }
        var elements = new HeroBattleElementRules(mapper);
        engine.beginRound(1, List.of(1, 2, 3, 4), elements, chance -> chance >= 1D);
        engine.act(1, 4, 100, elements, chance -> chance >= 1D);
        assertEquals(4041201, engine.damages().getFirst().buffId());
        assertEquals(Set.of(1, 2, 3), engine.recoveries().stream()
                .filter(recovery -> recovery.buffId() == 4041301)
                .map(HeroBattleHealingExecutor.Recovery::targetId).collect(Collectors.toSet()));
        for (int id : List.of(1, 2, 3)) {
            assertEquals(5_200, engine.state(id).hp());
        }
    }
}
