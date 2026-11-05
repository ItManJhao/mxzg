/** 真实199建约与105伤害回归；源码护盾扣血疑点单独固化，不把推测写成修复。 */
package com.funsgamex.mxzg;

import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.*;

class HeroBattleContractDamageTest {
    /** 创建独立的场内单位，攻击100。 */
    private State unit(int id, int faction, long hp) {
        return new State(new Actor(id, List.of()), faction, id, hp, 1000, 100, 0, 0, 0);
    }

    /** 固定选择首个存活敌人；测试不改变清心待审概率。 */
    private HeroBattleHealingExecutor engine(State... units) {
        return new HeroBattleHealingExecutor(new HeroSkillPanelRules(new ObjectMapper()), List.of(units),
            new RandomDecision() {
                /** 此处没有清心，不应请求概率。 */
                public boolean hit(int rate) {
                    throw new AssertionError("不应抽取清心概率");
                }
                /** 契约只在存活敌方候选中选择。 */
                public int index(int bound) {
                    return 0;
                }
            });
    }

    /** 建约形成己方199关联、敌方199零关联及反向200关联，随后治疗自动转回己方。 */
    @Test void contractInstallationAndTreatment() {
        var engine = engine(unit(1, 1, 500), unit(2, 1, 500), unit(3, 2, 500));
        assertEquals(3, engine.establishContract(5181303, 1, 2));
        assertEquals(3, engine.buffs(2).getFirst().value());
        assertEquals(List.of(199, 200), engine.buffs(3).stream().map(row -> row.spec().type()).toList());
        assertEquals(0, engine.buffs(3).getFirst().value());
        assertEquals(2, engine.buffs(3).getLast().value());
        engine.art(new Invocation(1, 2143502, 1, 3));
        assertEquals(507, engine.state(2).hp());
        assertEquals(508, engine.state(3).hp());
    }

    /** 5181303将40%伤害分配给关联敌人；额外伤害不再次触发189。 */
    @Test void damageTransferAndExpiry() {
        var engine = engine(unit(1, 1, 500), unit(2, 1, 500), unit(3, 2, 500));
        engine.establishContract(5181303, 1, 2);
        engine.realDamage(9011201, 3, 2);
        assertEquals(460, engine.state(3).hp());
        assertEquals(440, engine.state(2).hp());
        assertEquals(List.of(40L, 60L), engine.damages().stream().map(Damage::incoming).toList());
        assertEquals(List.of(187, 188, 189), engine.signals().stream().map(Signal::event).toList());
        engine.expireAt(2);
        engine.realDamage(9011201, 3, 2);
        assertEquals(340, engine.state(2).hp());
        assertTrue(engine.buffs(3).isEmpty());
    }

    /** 护盾先消耗/移除，但旧heroHurt又减回吸收量；战报-90而实际-100，作为源码疑点保留。 */
    @Test void shieldSourceBehavior() {
        var engine = engine(unit(1, 1, 500), unit(2, 2, 500));
        engine.art(new Invocation(1, 1063201, 1, 1));
        engine.art(new Invocation(1, 10011201, 1, 2));
        assertEquals(10, engine.buffs(2).getFirst().value());
        engine.realDamage(9011201, 1, 2);
        assertEquals(new Damage(9011201, 1, 2, 100, 10, -90, -100, false), engine.damages().getFirst());
        assertEquals(400, engine.state(2).hp());
        assertTrue(engine.buffs(2).isEmpty());
        assertEquals("shield-depleted", engine.removals().getFirst().reason());
    }

    /** 致死截断到0，先记录180再清理已支持Buff/监听并中断该目标，不触发受击自疗。 */
    @Test void deathCleanup() {
        var engine = engine(unit(1, 1, 500), unit(2, 2, 40));
        engine.initializePassive(2, 101050063, 1);
        engine.realDamage(9011201, 1, 2);
        assertEquals(0, engine.state(2).hp());
        assertTrue(engine.state(2).actor().isDead());
        assertTrue(engine.state(1).actor().interrupted(2));
        assertTrue(engine.buffs(2).isEmpty());
        assertEquals("death", engine.removals().getFirst().reason());
        assertEquals(-40, engine.damages().getFirst().actual());
        assertEquals(List.of(187, 188, 189, 180), engine.signals().stream().map(Signal::event).toList());
        engine.signal(171, 2, 1);
        assertTrue(engine.recoveries().isEmpty());
    }

    /** 建约不选择死亡敌人；没有存活敌人时不安装半组关系。 */
    @Test void candidateAndNoEnemy() {
        var engine = engine(unit(1, 1, 500), unit(2, 2, 0), unit(3, 2, 500));
        assertEquals(3, engine.establishContract(5181303, 1, 1));
        assertTrue(engine.buffs(2).isEmpty());
        var empty = engine(unit(1, 1, 500));
        assertThrows(IllegalStateException.class, () -> empty.establishContract(5181303, 1, 1));
        assertTrue(empty.buffs(1).isEmpty());
        assertThrows(IllegalArgumentException.class, () -> empty.realDamage(1063201, 1, 1));
    }

    /** 关联者已死亡时不分摊伤害；原目标承担全部伤害。 */
    @Test void deadContractorSkipsDamageTransfer() {
        var linked = unit(3, 2, 500);
        var engine = engine(unit(1, 1, 500), unit(2, 1, 500), linked);
        engine.establishContract(5181303, 1, 2);
        linked.actor().setDead(true);
        engine.realDamage(9011201, 1, 2);
        assertEquals(400, engine.state(2).hp());
        assertEquals(500, engine.state(3).hp());
        assertEquals(1, engine.damages().size());
    }
}
