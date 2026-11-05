/** 元素克制与一次性属性回归：使用旧真实配置和独立内存状态，不访问玩家数据库。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleElementAttributeTest {
    /** 验证25组方向关系，克制对伤害13000、命中11500，非克制分别10000。 */
    @Test void loadsAllDirectionalPairs() {
        var rules = new HeroBattleElementRules(new ObjectMapper());
        var targets = Map.of(1, 3, 2, 1, 3, 2, 4, 5, 5, 4);
        for (int attacker = 1; attacker <= 5; attacker++) {
            for (int defender = 1; defender <= 5; defender++) {
                boolean strong = targets.get(attacker) == defender;
                assertEquals(new HeroBattleElementRules.Pair(strong ? 13000 : 10000, strong ? 11500 : 10000),
                    rules.pair(attacker, defender));
            }
        }
        assertThrows(IllegalArgumentException.class, () -> rules.element(-1));
        assertThrows(IllegalArgumentException.class, () -> rules.pair(0, 1));
    }

    /** 水增伤编号253、木增伤252，不能按枚举序号直加；消费对应守方属性一次。 */
    @Test void consumesOnlyMatchingElementBonus() {
        var rules = new HeroBattleElementRules(new ObjectMapper());
        var state = new HeroBattleAttributeState(Map.of(252, 2000L, 253, 4000L));
        state.setOnce(252, 5000);
        state.setOnce(253, 7000);
        assertEquals(1.8D, rules.damageMultiplier(1, 3, state), 1e-12);
        assertEquals(Map.of(253, 7000L), state.snapshot());
        assertEquals(1.5D, rules.damageMultiplier(1, 3, state), 1e-12);
        assertEquals(2D, rules.damageMultiplier(3, 2, state), 1e-12);
        assertTrue(state.snapshot().isEmpty());
    }

    /** 覆盖是完整最终值，跳过攻击百分比读取；零覆盖也必须消费。 */
    @Test void onceValueBypassesRecursiveScaling() {
        var state = new HeroBattleAttributeState(Map.of(220, 100L, 201, 5000L));
        state.setOnce(201, 10000);
        state.setOnce(220, 7);
        assertEquals(7, state.get(220));
        assertEquals(Map.of(201, 10000L), state.snapshot());
        assertEquals(200, state.get(220));
        assertEquals(150, state.get(220));
        state.setOnce(220, 0);
        assertEquals(0, state.get(220));
        assertEquals(150, state.get(220));
    }

    /** 加一次性属性先读取当前值；重复添加基于上一次覆盖而非再次加基础值。 */
    @Test void addOnceReadsThenReplaces() {
        var state = new HeroBattleAttributeState(Map.of(220, 100L, 201, 5000L));
        state.addOnce(220, 10);
        state.addOnce(220, 20);
        assertEquals(180, state.get(220));
        assertEquals(150, state.get(220));
    }

    /** 比例50000上限施加在消费之后；负比例保留，效果只修正治疗比例和控制率。 */
    @Test void rateCapAndEffectConsumptionMatchOldReads() {
        var state = new HeroBattleAttributeState(Map.of(205, 1001L, 219, 1001L, 10, 5000L));
        state.setOnce(10, 10000);
        assertEquals(2002, state.get(205));
        assertEquals(1501, state.get(219));
        state.setOnce(207, 60000);
        assertEquals(5D, state.rate(207));
        assertEquals(0D, state.rate(207));
        state.setOnce(207, -1000);
        assertEquals(-0.1D, state.rate(207));
    }

    /** 快照可恢复递归消费，且修改一场战斗不能污染另一个单位或原始属性。 */
    @Test void snapshotsAndInstancesRemainIndependent() {
        var source = Map.of(220, 100L, 201, 2000L);
        var first = new HeroBattleAttributeState(source);
        var second = new HeroBattleAttributeState(source);
        first.setOnce(201, 5000);
        var saved = first.snapshot();
        assertEquals(150, first.get(220));
        first.restore(saved);
        assertEquals(150, first.get(220));
        assertEquals(120, second.get(220));
        assertEquals(2000L, source.get(201));
        assertThrows(UnsupportedOperationException.class, () -> saved.clear());
    }

    /** 加法溢出必须恢复被消费的一次性值，不留下半次失败状态。 */
    @Test void failedAddRestoresConsumedOverride() {
        var state = new HeroBattleAttributeState(Map.of());
        state.setOnce(220, Long.MAX_VALUE);
        var saved = state.snapshot();
        assertThrows(ArithmeticException.class, () -> state.addOnce(220, 1));
        assertEquals(saved, state.snapshot());
    }

    /** 暴击被抗暴取消时不消费暴伤，普通未暴击仍读取消费；由调用者执行分支要求。 */
    @Test void criticalDecisionDrivesActualOnceRead() {
        var state = new HeroBattleAttributeState(Map.of(222, 1000L));
        state.setOnce(222, 5000);
        var blocked = HeroBattleHitUtils.critical(false, true, false, true);
        assertFalse(blocked.readCriticalDamage());
        assertEquals(Map.of(222, 5000L), state.snapshot());
        var missedCritical = HeroBattleHitUtils.critical(false, false, false, false);
        assertTrue(missedCritical.readCriticalDamage());
        assertEquals(2D, HeroBattleHitUtils.criticalMultiplier(state.rate(222)));
        assertTrue(state.snapshot().isEmpty());
        assertEquals(1.6D, HeroBattleHitUtils.criticalMultiplier(state.rate(222)));
    }
}
