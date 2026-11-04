/** 旧选目标规则回归：使用真实动作配置及独立内存单位，不连接玩家数据库。 */
package com.funsgamex.mxzg;

import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleTargetUtils.*;
import tools.jackson.databind.ObjectMapper;

class HeroBattleTargetsTest {
    /** 施法者位于第一排第二列。 */
    private final Unit source = new Unit(1, 1, 2, 10);
    /** 同阵营高攻击单位。 */
    private final Unit friend = new Unit(2, 1, 5, 30);
    /** 敌方传入顺序刻意不按站位，检验排序与数量限制。 */
    private final List<Unit> enemies = List.of(new Unit(3, 2, 5, 50),
        new Unit(4, 2, 1, 20), new Unit(5, 2, 3, 20), new Unit(6, 2, 2, 10));

    /** 创建本场有序存活名单。 */
    private List<Unit> living() {
        var units = new ArrayList<>(List.of(source, friend));
        units.addAll(enemies);
        return units;
    }

    /** 指定选择器链并返回目标编号，便于核对旧规则。 */
    private List<Integer> select(List<Integer> types, int count) {
        return HeroBattleTargetUtils.select(new Plan(1, types, count), source,
            living(), List.of(), false).stream().map(Unit::id).toList();
    }

    /** 友敌为添加，自身也为添加；移除自身不影响其他目标。 */
    @Test void additiveSelectors() {
        assertEquals(List.of(2), select(List.of(2, 0), 1));
        assertEquals(List.of(3, 4, 5, 6, 1), select(List.of(3, 1), 1));
        assertEquals(List.of(1, 2, 3, 4, 5, 6), select(List.of(2, 3), 1));
    }

    /** 存活选择器只截取原顺序；中间步骤不提前按最终数量截断。 */
    @Test void orderedLimitAndAttack() {
        assertEquals(List.of(3, 4), select(List.of(3, 4), 2));
        assertEquals(List.of(3, 4, 5, 6), select(List.of(3, 4), 0));
        assertEquals(List.of(3, 4), select(List.of(3, 4, 12), 2));
        assertEquals(List.of(2, 1), select(List.of(2, 4, 12), 2));
    }

    /** 先选前排同列，再右侧等距目标；不是直接按位置编号排序。 */
    @Test void positionOrder() {
        assertEquals(List.of(6, 5, 4, 3), select(List.of(3, 10), 4));
        assertEquals(List.of(6), select(List.of(3, 10), 1));
    }

    /** 空配置继承上下文；普通反击绕过配置重选；普通动作清空旧上下文。 */
    @Test void contextAndCounterattack() {
        var context = List.of(friend);
        assertEquals(context, HeroBattleTargetUtils.select(new Plan(1, List.of(), 0),
            source, living(), context, false));
        assertEquals(context, HeroBattleTargetUtils.select(new Plan(1, List.of(3, 4), 1),
            source, living(), context, true));
        var result = HeroBattleTargetUtils.select(new Plan(1, List.of(3, 4), 1),
            source, living(), context, false);
        assertEquals(List.of(enemies.getFirst()), result);
        assertThrows(UnsupportedOperationException.class, () -> result.add(source));
        assertTrue(HeroBattleTargetUtils.select(new Plan(1, List.of(), 0),
            source, living(), List.of(), false).isEmpty());
    }

    /** 真实触发动作选择友方攻击最高两名；未知选择器在执行前拒绝。 */
    @Test void realConfiguration() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var plan = rules.battleTargets(2114201);
        assertEquals(List.of(2, 4, 12), plan.selectors());
        assertEquals(2, plan.count());
        assertEquals(List.of(friend, source), HeroBattleTargetUtils.select(plan,
            source, living(), List.of(enemies.getFirst()), false));
        assertThrows(IllegalArgumentException.class, () -> new Plan(1, List.of(3, 8), 1));
        assertThrows(IllegalArgumentException.class, () -> new Plan(1, List.of(4), -1));
        assertThrows(IllegalStateException.class, () -> rules.battleTargets(Integer.MAX_VALUE));
    }
}
