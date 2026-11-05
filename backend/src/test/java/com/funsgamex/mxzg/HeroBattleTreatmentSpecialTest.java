/** 清心与反向契约回归；使用真实配置、固定随机输入及独立内存状态，不连接玩家库。 */
package com.funsgamex.mxzg;

import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.*;

class HeroBattleTreatmentSpecialTest {
    /** 创建独立英雄，阵营参数用于排除敌人。 */
    private State unit(int id, int faction) {
        return new State(new Actor(id, List.of()), faction, id, 100, 1000, 100, 0, 0, 0);
    }

    /** 使用真实配置和固定的概率/目标下标，验证逻辑而非统计运气。 */
    private HeroBattleHealingExecutor engine(boolean hit, int index, State... states) {
        return new HeroBattleHealingExecutor(new HeroSkillPanelRules(new ObjectMapper()), List.of(states),
            new RandomDecision() {
                /** 真实清心1级配置参数原样传递2000。 */
                public boolean hit(int rate) {
                    assertEquals(2000, rate);
                    return hit;
                }
                /** 测试显式选择某个候选，不改变候选列表的规则。 */
                public int index(int bound) {
                    return index;
                }
            });
    }

    /** 清心只选有可驱散负面的己方，包括死亡单位；不选敌人，禁疗移除后恢复治疗。 */
    @Test void pureHeartSelectsAndRemovesRealStatus() {
        var dead = unit(3, 1);
        dead.actor().setDead(true);
        var engine = engine(true, 1, unit(1, 1), unit(2, 1), dead, unit(4, 2));
        engine.initializePassive(1, 150300001, 1);
        for (int id : List.of(2, 3, 4)) {
            engine.installTreatmentStatus(1151503, 4, id, 0);
        }
        engine.art(new Invocation(1, 1063201, 1, 1));
        assertEquals(1, engine.buffs(2).size());
        assertTrue(engine.buffs(3).isEmpty());
        assertEquals(1, engine.buffs(4).size());
        assertEquals("pure-heart", engine.removals().getFirst().reason());
        // 独立新场选择活着的目标2，移除禁疗后再验证真正回血。
        var living = engine(true, 0, unit(1, 1), unit(2, 1));
        living.initializePassive(1, 150300001, 1);
        living.installTreatmentStatus(1151503, 1, 2, 0);
        living.art(new Invocation(1, 2143502, 1, 2));
        assertEquals(100, living.state(2).hp());
        living.art(new Invocation(1, 1063201, 1, 1));
        assertTrue(living.buffs(2).isEmpty());
        living.art(new Invocation(1, 2143502, 1, 2));
        assertEquals(115, living.state(2).hp());
    }

    /** 概率未命中不驱散；非法随机下标使回血及驱散整体回滚。 */
    @Test void chanceMissAndInvalidRandomRollback() {
        for (boolean hit : List.of(false, true)) {
            var engine = engine(hit, 99, unit(1, 1), unit(2, 1));
            engine.initializePassive(1, 150300001, 1);
            engine.installTreatmentStatus(1151503, 1, 2, 0);
            if (hit) {
                assertThrows(IllegalArgumentException.class, () -> engine.art(new Invocation(1, 1063201, 1, 1)));
                assertEquals(100, engine.state(1).hp());
                assertTrue(engine.recoveries().isEmpty());
                assertTrue(engine.signals().isEmpty());
            } else {
                engine.art(new Invocation(1, 1063201, 1, 1));
                assertEquals(150, engine.state(1).hp());
            }
            assertEquals(1, engine.buffs(2).size());
            assertTrue(engine.removals().isEmpty());
        }
    }

    /** 构造治疗者攻击400、原契约施加者固定治疗10/治疗加成50%的场景。 */
    private HeroBattleHealingExecutor contract(boolean dead) {
        var linked = unit(1, 1);
        linked.actor().setDead(dead);
        var healer = new State(new Actor(2, List.of()), 2, 2, 100, 1000, 400, 0, 0, 0);
        var source = new State(new Actor(4, List.of()), 1, 4, 100, 1000, 100, 10, 5000, 0);
        var engine = engine(false, 0, linked, healer, unit(3, 2), source);
        engine.installTreatmentStatus(5181503, 4, 3, 1);
        return engine;
    }

    /** 60基础量先转移30，再分别折算；转移使用原契约施加者属性，不重复触发治疗事件。 */
    @Test void reverseContractTransferAndSource() {
        var engine = contract(false);
        engine.installTreatmentStatus(1151503, 4, 1, 0);
        engine.art(new Invocation(1, 2143502, 2, 3));
        assertEquals(160, engine.state(1).hp(), "旧context.replenish直接转移不检查禁疗");
        assertEquals(130, engine.state(3).hp());
        assertEquals(30, engine.state(2).actor().lastTreatment());
        assertEquals(new Recovery(5181503, 4, 1, 30, 60, 60), engine.recoveries().get(0));
        assertEquals(new Recovery(2143502, 2, 3, 60, 30, 30), engine.recoveries().get(1));
        assertEquals(List.of(186, 206, 311), engine.signals().stream().map(Signal::event).toList());
    }

    /** 关联者死亡仍先扣原治疗量；契约到期后移除监听，后续恢复完整治疗。 */
    @Test void deadContractAndExpiryCallback() {
        var engine = contract(true);
        engine.art(new Invocation(1, 2143502, 2, 3));
        assertEquals(100, engine.state(1).hp());
        assertEquals(130, engine.state(3).hp());
        assertEquals(1, engine.recoveries().size());
        engine.dispel(3, 0);
        assertEquals(1, engine.buffs(3).size(), "真实反向契约不可驱散");
        engine.expireAt(2);
        assertTrue(engine.buffs(3).isEmpty());
        engine.art(new Invocation(1, 2143502, 2, 3));
        assertEquals(190, engine.state(3).hp());
    }

    /** 明确拒绝缺失契约对象与概率附加状态，不默认猜链接或命中。 */
    @Test void invalidInstallation() {
        var engine = engine(false, 0, unit(1, 1), unit(2, 2));
        assertThrows(IllegalArgumentException.class, () -> engine.installTreatmentStatus(5181503, 1, 2, 99));
        assertThrows(IllegalArgumentException.class, () -> engine.installTreatmentStatus(1151501, 1, 2, 0));
        assertTrue(engine.buffs(2).isEmpty());
    }

    /** 待审概率按授权推算，固定随机数验证0%、100%、万分比与<=边界；不是旧实现等价证明。 */
    @Test void inferredChanceBoundaryPendingReview() {
        var decision = HeroBattleHealingExecutor.inferredRandom(new Random() {
            /** 固定抽样为20%，用来检测换算与相等边界。 */
            @Override public double nextDouble() {
                return 0.2;
            }
        });
        assertFalse(decision.hit(0));
        assertFalse(decision.hit(-1));
        assertFalse(decision.hit(1999));
        assertTrue(decision.hit(2000));
        assertTrue(decision.hit(10000));
    }
}
