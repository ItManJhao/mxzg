/** 真实5181303动作的选目标及建约链回归，防止配置中未执行的属性动作被误接入。 */
package com.funsgamex.mxzg;

import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.*;
import com.funsgamex.mxzg.hero.HeroBattleTargetUtils.Unit;

class HeroBattleContractActionTest {
    /** 指定实时血量与位置，验证比例而不是绝对血量。 */
    private State state(int id, int faction, int position, long hp, long maxHp) {
        return new State(new Actor(id, List.of()), faction, position, hp, maxHp, 100, 0, 0, 0);
    }

    /** 固定选第一个存活敌人；契约不使用清心概率。 */
    private HeroBattleHealingExecutor engine(State... states) {
        return new HeroBattleHealingExecutor(new HeroSkillPanelRules(new ObjectMapper()), List.of(states),
            new RandomDecision() {
                /** 此测试链不存在清心概率判断。 */
                public boolean hit(int rate) {
                    fail("建约不应使用清心概率");
                    return false;
                }
                /** 确定随机敌方下标，隔离目标选择规则。 */
                public int index(int bound) {
                    return 0;
                }
            });
    }

    /** 后排优先于低血前排；后排内按比例选80/1000，而不是绝对值更低的50/100。 */
    @Test void realActionSelectsRearByRatio() {
        var engine = engine(state(1, 1, 1, 10, 1000), state(2, 1, 5, 50, 100),
            state(3, 1, 6, 80, 1000), state(4, 2, 1, 500, 1000));
        var pairs = engine.contractArt(5181303, 1, 2);
        assertEquals(List.of(new ContractPair(5181303, 3, 4)), pairs);
        assertTrue(engine.buffs(1).isEmpty());
        assertTrue(engine.buffs(2).isEmpty());
        assertEquals(List.of(199), engine.buffs(3).stream().map(row -> row.spec().type()).toList());
        assertEquals(List.of(199, 200), engine.buffs(4).stream().map(row -> row.spec().type()).toList());
        assertThrows(UnsupportedOperationException.class, () -> pairs.clear());
        // 199监听的art_list不走安装后自动执行；不能凭配置引用新增160属性效果。
        assertTrue(engine.buffs(3).stream().noneMatch(row -> row.spec().type() == 160));
        engine.realDamage(9011201, 4, 3);
        assertEquals(20, engine.state(3).hp());
        assertEquals(460, engine.state(4).hp());
    }

    /** 后排无存活目标时回退前排，再按比例选择；死亡后排不进入候选。 */
    @Test void rearFallsBackToFront() {
        var engine = engine(state(1, 1, 1, 500, 1000), state(2, 1, 2, 100, 1000),
            state(3, 1, 5, 0, 1000), state(4, 2, 1, 500, 1000));
        assertEquals(2, engine.contractArt(5181303, 1, 4).getFirst().carrierId());
        assertTrue(engine.buffs(3).isEmpty());
    }

    /** 血量比例相同维持战场输入顺序，不以英雄编号重新排序。 */
    @Test void equalRatiosKeepOrder() {
        var engine = engine(state(1, 1, 1, 500, 1000), state(9, 1, 5, 50, 100),
            state(2, 1, 6, 500, 1000), state(4, 2, 1, 500, 1000));
        assertEquals(9, engine.contractArt(5181303, 1, 1).getFirst().carrierId());
    }

    /** 已中断所选目标时不另选人，动作结束后清中断。 */
    @Test void interruptedSelectedTarget() {
        var source = state(1, 1, 1, 500, 1000);
        source.actor().interrupt(2);
        var engine = engine(source, state(2, 1, 5, 100, 1000), state(3, 2, 1, 500, 1000));
        assertTrue(engine.contractArt(5181303, 1, 1).isEmpty());
        assertTrue(engine.buffs(2).isEmpty());
        assertFalse(source.actor().interrupted(2));
    }

    /** 未支持效果在安装前拒绝；没有敌人时不留下阶段标志或半组Buff。 */
    @Test void invalidActionIsAtomic() {
        var engine = engine(state(1, 1, 1, 500, 1000));
        assertThrows(IllegalArgumentException.class, () -> engine.contractArt(1063201, 1, 1));
        assertThrows(IllegalStateException.class, () -> engine.contractArt(5181303, 1, 1));
        assertTrue(engine.buffs(1).isEmpty());
        engine.initializePassive(1, 101050063, 1);
        assertEquals(1, engine.buffs(1).size());
    }

    /** 前后排筛选本身不截取target_num；最后的数量选择器才负责截断。 */
    @Test void rowSelectionDoesNotTruncate() {
        var source = new Unit(1, 1, 1, 100, 100, 100);
        var rear = new Unit(2, 1, 5, 100, 50, 100);
        var front = new Unit(3, 1, 4, 100, 30, 100);
        assertEquals(List.of(source, front), HeroBattleTargetUtils.select(
            new HeroBattleTargetUtils.Plan(1, List.of(2, 6), 1), source, List.of(source, rear, front), List.of(), false));
        assertEquals(List.of(rear), HeroBattleTargetUtils.select(
            new HeroBattleTargetUtils.Plan(1, List.of(2, 6), 1), rear, List.of(rear), List.of(), false));
    }
}
