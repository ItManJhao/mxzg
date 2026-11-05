/** 普通伤害读取顺序与动作回滚回归；固定判定序列避免推定缺失的旧随机实现。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleDamageActionTest {
    /** 创建真实配置驱动的计算动作，判定结果按调用顺序提供。 */
    private HeroBattleDamageAction action(boolean... answers) {
        var index = new int[]{0};
        return new HeroBattleDamageAction(new HeroBattleElementRules(new ObjectMapper()), rate -> {
            if (index[0] >= answers.length) throw new IllegalStateException("发生了多余随机调用");
            return answers[index[0]++];
        });
    }

    /** 创建无Buff的普通物理攻击上下文；职业显式为战士，对应281。 */
    private HeroBattleDamageAction.Request request(HeroBattleAttributeState a, HeroBattleAttributeState d) {
        return new HeroBattleDamageAction.Request(a, d, 1, 1, 1, 10000, false, 0, false, false, false, 281, Set.of());
    }

    /** 创建零防御、合法星级系数的守方。 */
    private HeroBattleAttributeState defender() {
        return new HeroBattleAttributeState(Map.of(150, 500L));
    }

    /** 神圣伤害再次读取攻击，不能复用第一次500的一次性攻击。 */
    @Test void sacredDamageReadsAttackAgain() {
        var a = new HeroBattleAttributeState(Map.of(220, 100L, 225, 5000L));
        a.setOnce(220, 500);
        var result = action(true, false, false).execute(List.of(request(a, defender()))).getFirst();
        assertEquals(-535, result.damage());
        assertFalse(result.missed());
        assertTrue(a.snapshot().isEmpty());
    }

    /** 未命中仍消费前置属性，但不能继续消费暴伤、神圣、状态加成或驱使。 */
    @Test void missCommitsOnlyPreHitConsumption() {
        var a = new HeroBattleAttributeState(Map.of(220, 100L));
        var d = defender();
        for (int type : List.of(220, 211, 226, 222, 225, 260, 340)) a.setOnce(type, 100);
        d.setOnce(227, 100);
        var result = action(false).execute(List.of(request(a, d))).getFirst();
        assertTrue(result.missed());
        assertEquals(-1, result.damage());
        assertEquals(Set.of(222, 225, 260, 340), a.snapshot().keySet());
        assertTrue(d.snapshot().isEmpty());
    }

    /** 精准在命中前和格挡前各读一次；后一次读取必须回到基础值。 */
    @Test void blockUsesSecondPrecisionRead() {
        var a = new HeroBattleAttributeState(Map.of(220, 100L));
        var d = new HeroBattleAttributeState(Map.of(150, 500L, 210, 4000L));
        a.setOnce(211, 10000);
        var rates = new ArrayList<Double>();
        var action = new HeroBattleDamageAction(new HeroBattleElementRules(new ObjectMapper()), rate -> {
            rates.add(rate);
            return rates.size() == 1;
        });
        assertEquals(-130, action.execute(List.of(request(a, d))).getFirst().damage());
        assertEquals(List.of(1D, 0D, 0.4D), rates);
    }

    /** 固定攻击仍抽暴击、消费暴伤，但跳过格挡；旧能量乘区保留常数1。 */
    @Test void fixedAttackKeepsLegacyReadBranches() {
        var a = new HeroBattleAttributeState(Map.of(220, 100L));
        var d = defender();
        a.setOnce(222, 5000);
        d.setOnce(210, 9000);
        var r = new HeroBattleDamageAction.Request(a, d, 1, 1, 1, 10000, false, 0, true, false, false, 281, Set.of());
        var result = action(true, true).execute(List.of(r)).getFirst();
        assertEquals(-200, result.damage());
        assertTrue(result.rolledCritical());
        assertFalse(result.critical());
        assertTrue(a.snapshot().isEmpty());
        assertEquals(Map.of(210, 9000L), d.snapshot());
    }

    /** 法术只消费法抗/法术加深和咒术，物理对应属性保持未读。 */
    @Test void magicUsesCorrectAttributeFamily() {
        var a = new HeroBattleAttributeState(Map.of(220, 100L, 272, 2000L));
        var d = new HeroBattleAttributeState(Map.of(150, 500L, 240, 5000L));
        a.setOnce(271, 1000);
        d.setOnce(241, 1000);
        var r = new HeroBattleDamageAction.Request(a, d, 1, 1, 2, 10000, false, 0, false, false, false, 281, Set.of());
        assertEquals(-60, action(true, false, false).execute(List.of(r)).getFirst().damage());
        assertEquals(Map.of(271, 1000L), a.snapshot());
        assertEquals(Map.of(241, 1000L), d.snapshot());
    }

    /** 第二目标后段计算失败，第一目标及所有递归比例消费也必须回滚。 */
    @Test void laterTargetFailureRollsBackWholeAction() {
        var a = new HeroBattleAttributeState(Map.of(220, 100L));
        var first = defender();
        var second = new HeroBattleAttributeState(Map.of(150, 500L, 340, -1L));
        a.setOnce(201, 5000);
        first.setOnce(227, 1000);
        second.setOnce(224, 100);
        var beforeA = a.snapshot();
        var beforeFirst = first.snapshot();
        var beforeSecond = second.snapshot();
        assertThrows(IllegalArgumentException.class, () -> action(true, false, false, true, false, false)
            .execute(List.of(request(a, first), request(a, second))));
        assertEquals(beforeA, a.snapshot());
        assertEquals(beforeFirst, first.snapshot());
        assertEquals(beforeSecond, second.snapshot());
    }

    /** 抗暴移除链尚未接入时拒绝并回滚，不能只清掉标志假装已经移除Buff。 */
    @Test void unsupportedCounterCritAndRandomFailureRestoreReads() {
        var a = new HeroBattleAttributeState(Map.of(220, 100L));
        a.setOnce(220, 200);
        a.setOnce(222, 5000);
        var before = a.snapshot();
        var r = new HeroBattleDamageAction.Request(a, defender(), 1, 1, 1, 10000, false, 0, false, false, true, 281, Set.of());
        assertThrows(IllegalArgumentException.class, () -> action(true, true).execute(List.of(r)));
        assertEquals(before, a.snapshot());
        assertThrows(IllegalStateException.class, () -> action().execute(List.of(request(a, defender()))));
        assertEquals(before, a.snapshot());
    }

    /** 未激活的状态加成仍读取并消费；只有目标实际具有的状态参加乘区。 */
    @Test void inactiveStatusBonusStillConsumesOverride() {
        var a = new HeroBattleAttributeState(Map.of(220, 100L));
        a.setOnce(260, 5000);
        a.setOnce(301, 2000);
        var r = new HeroBattleDamageAction.Request(a, defender(), 1, 1, 1, 10000, false, 0, false, false, false, 281, Set.of(301));
        assertEquals(-120, action(true, false, false).execute(List.of(r)).getFirst().damage());
        assertTrue(a.snapshot().isEmpty());
    }
}
