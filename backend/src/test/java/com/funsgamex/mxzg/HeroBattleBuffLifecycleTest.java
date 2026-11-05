/** Buff生命周期与真实治疗护盾链回归；只操作独立内存实例。 */
package com.funsgamex.mxzg;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleBuffState.*;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;

class HeroBattleBuffLifecycleTest {
    /** 构造规则用元数据，duration为回合数。 */
    private Spec spec(int id, int type, int duration, int conflict, int limit, boolean attribute) {
        return new Spec(id, type, duration, true, 2, conflict, limit, attribute);
    }

    /** 创建独立场内单位。 */
    private State unit(int id) {
        return new State(new Actor(id, List.of()), 1, id, 100, 1000, 100, 0, 0, 0);
    }

    /** 使用真实配置的治疗战场。 */
    private HeroBattleHealingExecutor engine(State... states) {
        return new HeroBattleHealingExecutor(new HeroSkillPanelRules(new ObjectMapper()), List.of(states));
    }

    /** 同来源同类型叠层超限替换最早到期项，异来源不计入该层数。 */
    @Test void stackingAndConflict() {
        var state = new HeroBattleBuffState();
        state.add(1, 1, 0, spec(1, 171, 5, 0, 2, false), 0);
        state.add(2, 1, 0, spec(2, 171, 3, 0, 2, false), 0);
        state.add(3, 2, 0, spec(3, 171, 1, 0, 2, false), 0);
        var result = state.add(4, 1, 0, spec(4, 171, 4, 0, 2, false), 0);
        assertEquals(List.of(2L), result.removed().stream().map(Entry::instanceId).toList());
        state.add(5, 1, 0, spec(5, 186, 2, 7, 2, false), 0);
        var conflict = state.add(6, 2, 0, spec(6, 206, 2, 7, 2, false), 0);
        assertEquals(List.of(5L), conflict.removed().stream().map(Entry::instanceId).toList());
    }

    /** 属性Buff按配置ID及来源叠层；同到期回合保留原安装顺序。 */
    @Test void attributeStackAndStableTie() {
        var state = new HeroBattleBuffState();
        state.add(1, 1, 0, spec(1, 160, 2, 0, 1, true), 0);
        assertTrue(state.add(2, 1, 0, spec(2, 160, 2, 0, 1, true), 0).removed().isEmpty());
        assertEquals(1, state.add(3, 1, 0, spec(1, 160, 2, 0, 1, true), 0).removed().getFirst().instanceId());
        var tied = new HeroBattleBuffState();
        tied.add(1, 1, 0, spec(1, 171, 2, 0, 2, false), 0);
        tied.add(2, 1, 0, spec(2, 171, 2, 0, 2, false), 0);
        assertEquals(1, tied.add(3, 1, 0, spec(3, 171, 2, 0, 2, false), 0).removed().getFirst().instanceId());
    }

    /** 到期包含等号；驱散排除不可驱散项和绝对期限>=999的被动。 */
    @Test void expiryAndDispel() {
        var state = new HeroBattleBuffState();
        state.add(1, 1, 5, spec(1, 171, 2, 0, 10, false), 0);
        assertTrue(state.expire(6).isEmpty());
        assertEquals(1, state.expire(7).size());
        state.add(2, 1, 0, spec(2, 171, 999, 0, 10, false), 0);
        state.add(3, 1, 0, new Spec(3, 171, 3, false, 2, 0, 10, false), 0);
        state.add(4, 1, 0, spec(4, 171, 3, 0, 10, false), 0);
        assertEquals(List.of(4L), state.dispel(2).stream().map(Entry::instanceId).toList());
        assertEquals(2, state.snapshot().size());
    }

    /** 真实被动300100001→186→10011201：治疗15生成护盾3，再治50覆盖为10且不续期。 */
    @Test void realTreatmentShieldAndExpiry() {
        var engine = engine(unit(1), unit(2));
        engine.initializePassive(1, 300100001, 1);
        engine.art(new Invocation(1, 2143502, 1, 2));
        var first = engine.buffs(2).getFirst();
        assertEquals(1008, first.spec().type());
        assertEquals(3, first.value());
        assertEquals(2, first.expiresAt());
        engine.expireAt(1);
        engine.art(new Invocation(1, 1063201, 1, 2));
        engine.art(new Invocation(1, 10011201, 1, 2));
        assertEquals(10, engine.buffs(2).getFirst().value());
        assertEquals(first.instanceId(), engine.buffs(2).getFirst().instanceId());
        assertEquals(2, engine.buffs(2).getFirst().expiresAt());
        engine.expireAt(2);
        assertTrue(engine.buffs(2).isEmpty());
        assertEquals("expire", engine.removals().getFirst().reason());
        engine.art(new Invocation(1, 2143502, 1, 2));
        assertTrue(engine.buffs(2).getFirst().instanceId() > first.instanceId());
        engine.dispel(2, 0);
        assertTrue(engine.buffs(2).isEmpty());
        assertEquals(3, engine.buffs(1).stream().filter(entry -> entry.spec().type() == 1008)
            .findFirst().orElseThrow().expiresAt(), "第1回合新建的护盾到第3回合过期");
        engine.dispel(1, 0);
        assertEquals(1, engine.buffs(1).size(), "期限999的被动不驱散");
    }

    /** 护盾跨施加者重用首个实例，替换数值但保留原来源与配置。 */
    @Test void shieldKeepsIdentity() {
        var state = new HeroBattleBuffState();
        var first = state.add(1, 1, 0, spec(1, 1008, 2, 7, 1, false), 30).current();
        var second = state.add(2, 2, 1, spec(2, 1008, 9, 8, 1, false), 10).current();
        assertEquals(first.instanceId(), second.instanceId());
        assertEquals(first.sourceId(), second.sourceId());
        assertEquals(first.spec(), second.spec());
        assertEquals(2, second.expiresAt());
        assertEquals(10, second.value());
    }

    /** 到期同时移除真实被动监听；后续受击不再触发自疗。 */
    @Test void listenerExpiresAndRollbackIncludesShield() {
        var one = unit(1);
        var engine = engine(one, unit(2));
        engine.initializePassive(1, 101050063, 1);
        engine.expireAt(999);
        engine.signal(171, 1, 2);
        assertEquals(100, engine.state(1).hp());
        assertTrue(engine.buffs(1).isEmpty());
        assertThrows(IllegalArgumentException.class, () -> engine.expireAt(998));
        var other = unit(1);
        var broken = engine(other, unit(2));
        broken.initializePassive(1, 300100001, 1);
        other.actor().listen(new Listener(100, 1, new Definition(1, 186, 0,
            List.of(new Art(2114201, 0, true)))));
        assertThrows(IllegalArgumentException.class, () -> broken.art(new Invocation(1, 2143502, 1, 2)));
        assertTrue(broken.buffs(2).isEmpty());
        assertTrue(broken.recoveries().isEmpty());
        assertTrue(broken.signals().isEmpty());
    }
}
