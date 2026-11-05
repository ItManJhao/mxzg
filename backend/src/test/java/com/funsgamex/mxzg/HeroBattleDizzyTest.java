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

}
