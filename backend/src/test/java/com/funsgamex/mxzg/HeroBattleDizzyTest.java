/** 真实1041301眩晕的概率、行动资格、冲突与生命周期回归；仅使用独立内存战场。 */
package com.funsgamex.mxzg;

import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleDizzyTest {
    /** 构造真实技能和模板身份，双方生命充足，不连接玩家库。 */
    private HeroBattleHealingExecutor engine() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var skills = rules.battleSchedule(rules.select(10104004, 4, 0));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, skills), 1, 1, 1000, 1000, 100, 0, 0, 0),
            new State(new Actor(2, skills), 2, 1, 1000, 1000, 100, 0, 0, 0)));
        var attributes = new HeroBattleChapterScenario(new ObjectMapper()).initial().get(0).attributes();
        engine.bindCombatData(1, 10104004, attributes);
        engine.bindCombatData(2, 10104004, attributes);
        return engine;
    }

    /** 一次性属性按旧单位读取，成功事件先被控再施控，未到期限仍禁止行动。 */
    @Test void probabilityEventsAndExpiry() {
        var engine = engine();
        engine.setOnceAttribute(2, 212, 2000);
        engine.setOnceAttribute(1, 219, 5000);
        engine.setOnceAttribute(2, 217, 1000);
        engine.applyDizzy(1041301, 1, 2, probability -> {
            assertEquals(.35 * .9 * 1.5 * .8, probability, 1e-12);
            return true;
        });
        assertTrue(engine.onceAttributes(1).isEmpty());
        assertTrue(engine.onceAttributes(2).isEmpty());
        assertTrue(engine.state(2).actor().hasControl(1005));
        assertEquals(List.of(185, 207), engine.signals().stream().map(s -> s.event()).toList());
        assertEquals(2, engine.signals().get(0).carrierId());
        assertEquals(1, engine.signals().get(1).carrierId());
        assertEquals(2, engine.buffs(2).get(0).expiresAt());
        assertEquals(engine.buffs(2).get(0), engine.lastControl(2));
        engine.expireAt(1);
        assertTrue(engine.state(2).actor().hasControl(1005));
        engine.expireAt(2);
        assertFalse(engine.state(2).actor().hasControl(1005));
        assertEquals("expire", engine.removals().get(0).reason());
    }

    /** 免控在属性读取和随机之前返回；未命中消费属性但不安装、不产生控制事件。 */
    @Test void immunityAndMiss() {
        var engine = engine();
        engine.setOnceAttribute(2, 212, 1000);
        engine.state(2).actor().control(153, true);
        engine.applyDizzy(1041301, 1, 2, probability -> { fail("免控不得随机"); return true; });
        assertEquals(Map.of(212, 1000L), engine.onceAttributes(2));
        engine.state(2).actor().control(153, false);
        engine.applyDizzy(1041301, 1, 2, probability -> false);
        assertTrue(engine.onceAttributes(2).isEmpty());
        assertTrue(engine.buffs(2).isEmpty());
        assertTrue(engine.signals().isEmpty());
        assertFalse(engine.state(2).actor().hasControl(1005));
    }

    /** 同冲突组重新安装刷新期限；旧实例移除不能误清新眩晕，驱散后才恢复。 */
    @Test void replacementAndDispel() {
        var engine = engine();
        engine.applyDizzy(1041301, 1, 2, probability -> true);
        long first = engine.buffs(2).get(0).instanceId();
        engine.expireAt(1);
        engine.applyDizzy(1041301, 1, 2, probability -> true);
        assertEquals(1, engine.buffs(2).size());
        assertNotEquals(first, engine.buffs(2).get(0).instanceId());
        assertEquals(3, engine.buffs(2).get(0).expiresAt());
        assertTrue(engine.state(2).actor().hasControl(1005));
        engine.dispel(2, 2);
        assertTrue(engine.state(2).actor().hasControl(1005));
        engine.dispel(2, 3);
        assertFalse(engine.state(2).actor().hasControl(1005));
    }

    /** 判定失败异常必须回滚一次性消费，不能留下半个控制或成功记录。 */
    @Test void failedDecisionRollsBack() {
        var engine = engine();
        engine.setOnceAttribute(2, 212, 1000);
        assertThrows(IllegalStateException.class, () -> engine.applyDizzy(1041301, 1, 2,
            probability -> { throw new IllegalStateException("独立故障注入"); }));
        assertEquals(Map.of(212, 1000L), engine.onceAttributes(2));
        assertTrue(engine.trace().isEmpty());
        assertNull(engine.lastControl(2));
        assertTrue(engine.signals().isEmpty());
        assertTrue(engine.buffs(2).isEmpty());
    }
    /** 眩晕时实际行动入口不出手，到期后重新产生技能记录；不只检查标记。 */
    @Test void actualActionResumesAfterExpiry() {
        var engine = engine();
        var elements = new HeroBattleElementRules(new ObjectMapper());
        engine.expireAt(1);
        engine.applyDizzy(1041301, 1, 2, probability -> true);
        engine.act(2, 1, 0, elements, probability -> probability == 1D);
        assertTrue(engine.trace().stream().noneMatch(t -> t.kind().equals("skill.begin")));
        engine.expireAt(3);
        engine.act(2, 1, 0, elements, probability -> probability == 1D);
        assertTrue(engine.trace().stream().anyMatch(t -> t.kind().equals("skill.begin")));
    }

    /** 死亡清理同步解除眩晕，已死目标不可重复安装。 */
    @Test void deathClearsControl() {
        var engine = engine();
        engine.applyDizzy(1041301, 1, 2, probability -> true);
        for (int i = 0; i < 100 && !engine.state(2).actor().isDead(); i++) {
            engine.realDamage(9011201, 1, 2);
        }
        assertTrue(engine.state(2).actor().isDead());
        assertFalse(engine.state(2).actor().hasControl(1005));
        assertTrue(engine.buffs(2).isEmpty());
        assertTrue(engine.removals().stream().anyMatch(r -> r.reason().equals("death")));
        engine.applyDizzy(1041301, 1, 2, probability -> { fail("死亡不得随机"); return true; });
        assertTrue(engine.buffs(2).isEmpty());
    }

    /** 真实主动技能从伤害进入眩晕；控制判定异常会撤回之前同技能已扣的血量。 */
    @Test void realActiveSkillAndRootRollback() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var skill = rules.battleSchedule(rules.select(10104004, 4, 0)).stream()
            .filter(value -> value.activeType() == 1).findFirst().orElseThrow();
        var elements = new HeroBattleElementRules(new ObjectMapper());
        var engine = engine();
        engine.expireAt(Math.max(1, skill.initialRound()));
        engine.act(1, 2, 0, elements, probability -> probability > 0);
        assertTrue(engine.state(2).hp() < 1000);
        assertTrue(engine.state(2).actor().hasControl(1005));
        assertEquals(1041301, engine.lastControl(2).spec().id());

        var failed = engine();
        failed.expireAt(Math.max(1, skill.initialRound()));
        assertThrows(IllegalStateException.class, () -> failed.act(1, 2, 0, elements, probability -> {
            if (Math.abs(probability - .35) < 1e-12) {
                throw new IllegalStateException("眩晕判定故障");
            }
            return probability > 0;
        }));
        assertEquals(1000, failed.state(2).hp());
        assertTrue(failed.trace().isEmpty());
        assertNull(failed.lastControl(2));
        assertFalse(failed.state(2).actor().hasControl(1005));
    }

    /** 真实207配置只接受1004，不能因安装眩晕1005而误触发；移除不清历史。 */
    @Test void controllingFilterUsesActualConfiguration() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var definition = rules.battleTrigger(2234201);
        assertEquals(207, definition.event());
        assertTrue(rules.matchesControlTrigger(2234201, 1004));
        assertFalse(rules.matchesControlTrigger(2234201, 1005));
        var engine = engine();
        var listener = new HeroBattleEventProcessor.Listener(500, 1, definition);
        engine.state(1).actor().listen(listener);
        assertFalse(engine.controlMatches(listener, engine.state(1).actor(), 2));
        engine.applyDizzy(1041301, 1, 2, probability -> true);
        assertFalse(engine.controlMatches(listener, engine.state(1).actor(), 2));
        engine.dispel(2, 3);
        assertNotNull(engine.lastControl(2));
    }

    /** 独立处理器验证过滤、先被控后施控及来源目标；不冒充缺失的185策划配置。 */
    @Test void controlDispatchChecksFilterBeforeArts() {
        var processor = new HeroBattleEventProcessor();
        var actor = new Actor(1, List.of());
        var seen = new ArrayList<Integer>();
        for (int event : List.of(185, 207)) {
            actor.listen(new HeroBattleEventProcessor.Listener(event, 1,
                new HeroBattleEventProcessor.Definition(event, event, 0,
                    List.of(new HeroBattleEventProcessor.Art(event, 1, false)))));
        }
        var executor = new HeroBattleEventProcessor.Executor() {
            public void skill(Actor carrier, HeroBattleSkillUtils.Skill skill) { fail(); }
            public boolean controlMatches(HeroBattleEventProcessor.Listener listener, Actor carrier, int target) {
                assertEquals(2, target);
                return listener.definition().event() == 185;
            }
            public void art(HeroBattleEventProcessor.Invocation invocation) {
                assertEquals(1, invocation.sourceId());
                assertEquals(2, invocation.targetContext());
                seen.add(invocation.artId());
            }
        };
        processor.dispatch(185, actor, 2, executor);
        processor.dispatch(207, actor, 2, executor);
        assertEquals(List.of(185), seen);
        processor.end();
        processor.dispatch(185, actor, 2, executor);
        assertEquals(1, seen.size());
    }

    /** 真实三击破冰配置安装计数，受击逐次扣减，最后先移除再通知攻击者。 */
    @Test void frozenHitCounterAndBreakIce() {
        var engine = engine();
        engine.applyFrozen(2223301, 1, 2, rate -> true);
        assertTrue(engine.state(2).actor().hasControl(1004));
        assertEquals(3, engine.buffs(2).getFirst().value());
        engine.signal(171, 2, 1);
        engine.signal(171, 2, 1);
        assertEquals(1, engine.buffs(2).getFirst().value());
        engine.signal(171, 2, 1);
        assertFalse(engine.state(2).actor().hasControl(1004));
        assertTrue(engine.buffs(2).isEmpty());
        assertEquals("break-ice", engine.removals().getFirst().reason());
        var signal = engine.signals().getLast();
        assertEquals(208, signal.event());
        assertEquals(1, signal.carrierId());
        assertEquals(2, signal.targetId());
    }

    /** 真实207监听由冰冻命中触发，原始两条属性Buff到期统一移除。 */
    @Test void frozenTriggersRealControlAttributes() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var engine = engine();
        engine.state(1).actor().listen(new HeroBattleEventProcessor.Listener(500, 1, rules.battleTrigger(2234203)));
        engine.applyFrozen(2223301, 1, 2, rate -> true);
        assertEquals(List.of(2234301, 2234403), engine.buffs(1).stream().map(v -> v.spec().id()).toList());
        engine.expireAt(2);
        assertTrue(engine.buffs(1).isEmpty());
        assertFalse(engine.state(2).actor().hasControl(1004));
    }

    /** 第二条监听故障撤回冰冻、前一条监听已经安装的属性增益及记录。 */
    @Test void controlAttributeFailureRollsBackWholeRoot() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var engine = engine();
        engine.state(1).actor().listen(new HeroBattleEventProcessor.Listener(500, 1, rules.battleTrigger(2234201)));
        engine.state(1).actor().listen(new HeroBattleEventProcessor.Listener(501, 1,
            new HeroBattleEventProcessor.Definition(2234201, 207, 0,
                List.of(new HeroBattleEventProcessor.Art(99999999, 1, false)))));
        assertThrows(RuntimeException.class, () -> engine.applyFrozen(2223301, 1, 2, rate -> true));
        assertTrue(engine.buffs(1).isEmpty());
        assertTrue(engine.buffs(2).isEmpty());
        assertNull(engine.lastControl(2));
        assertTrue(engine.trace().isEmpty());
        assertFalse(engine.state(2).actor().hasControl(1004));
    }

    /** 冰冻使用216抗性而非217；未命中不发控制事件，到期后解除行动限制。 */
    @Test void frozenUsesOwnResistanceAndExpiry() {
        var engine = engine();
        engine.setOnceAttribute(2, 216, 2000);
        engine.setOnceAttribute(2, 217, 9000);
        engine.applyFrozen(2051301, 1, 2, rate -> {
            assertEquals(.15 * .8, rate, 1e-12);
            return false;
        });
        assertEquals(java.util.Map.of(217, 9000L), engine.onceAttributes(2));
        assertTrue(engine.signals().isEmpty());
        engine.applyFrozen(2051301, 1, 2, rate -> true);
        assertEquals(999, engine.buffs(2).getFirst().value());
        engine.expireAt(2);
        assertFalse(engine.state(2).actor().hasControl(1004));
        assertTrue(engine.signals().stream().noneMatch(v -> v.event() == 208));
    }

    /** 旧属性安装不对死亡来源继续增加属性或留下实例。 */
    @Test void deadSourceCannotReceiveControlAttributes() {
        var engine = engine();
        engine.state(1).actor().setDead(true);
        engine.art(new HeroBattleEventProcessor.Invocation(2234201, 2234301, 1, 2));
        assertTrue(engine.buffs(1).isEmpty());
    }

    /** 到期逐实例通知原施加者；驱散只移除，不错误发送到期事件。 */
    @Test void expirySignalsOriginalSourceAndDispelDoesNot() {
        var engine = engine();
        engine.applyDizzy(1041301, 1, 2, rate -> true);
        engine.expireAt(2);
        var expired = engine.signals().stream().filter(v -> v.event() == 209).toList();
        assertEquals(1, expired.size());
        assertEquals(1, expired.getFirst().carrierId());
        assertEquals(2, expired.getFirst().targetId());
        var dispelled = engine();
        dispelled.applyDizzy(1041301, 1, 2, rate -> true);
        dispelled.dispel(2, 3);
        dispelled.expireAt(2);
        assertTrue(dispelled.signals().stream().noneMatch(v -> v.event() == 209));
    }

    /** 四组真实入场配置：敌方减抗、自身三监听；减抗影响真实冰冻概率并触发207。 */
    @Test void nanakoOpeningPassiveAndControlChain() {
        var engine = engine();
        engine.initializePassive(1, 102050234, 1);
        assertEquals(List.of(2234201, 2234501, 2234701), engine.buffs(1).stream().map(v -> v.spec().id()).toList());
        assertEquals(List.of(2234101), engine.buffs(2).stream().map(v -> v.spec().id()).toList());
        assertThrows(IllegalArgumentException.class, () -> engine.initializePassive(1, 102050234, 1));
        double baseRate = new HeroSkillPanelRules(new ObjectMapper()).battleFrozenDefinition(2223301).rate();
        engine.applyFrozen(2223301, 1, 2, rate -> {
            assertEquals(baseRate * 1.1, rate, 1e-12);
            return true;
        });
        assertTrue(engine.buffs(1).stream().anyMatch(v -> v.spec().id() == 2234301));
        assertTrue(engine.buffs(1).stream().anyMatch(v -> v.spec().id() == 2234401));
        engine.signal(171, 2, 1);
        engine.signal(171, 2, 1);
        engine.signal(171, 2, 1);
        assertFalse(engine.state(2).actor().hasControl(1004));
        assertEquals(1000, engine.state(2).hp()); // 旧208 value=0不匹配1004，不能偷偷触发全体伤害。
    }

}
