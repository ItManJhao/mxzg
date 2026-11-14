/** 挂机加成纯计算回归：验证旧独立截断、神职逐分项ceil、概率端点及溢出拒绝。
 * 只调用无状态工具，不启动Spring/数据库，不以夹具代表真实权益或完整领取验收。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.CampaignRules.Reward;
import com.funsgamex.mxzg.campaign.IdleBonusUtils;
import com.funsgamex.mxzg.campaign.IdleBonusUtils.BaseBonus;
import com.funsgamex.mxzg.campaign.IdleBonusUtils.ClergyBonus;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class IdleBonusUtilsTest {
    /** 已确认沿旧奖励期限：到期前及等号有效，下一秒失效，永久不受时刻影响。 */
    @Test
    void giftExpiryIncludesTheExactEndSecond() {
        assertTrue(IdleBonusUtils.giftAppliesAt(100, 99));
        assertTrue(IdleBonusUtils.giftAppliesAt(100, 100));
        assertFalse(IdleBonusUtils.giftAppliesAt(100, 101));
        assertTrue(IdleBonusUtils.giftAppliesAt(0, Long.MAX_VALUE));
        assertThrows(IllegalArgumentException.class, () -> IdleBonusUtils.giftAppliesAt(-1, 100));
        assertThrows(IllegalArgumentException.class, () -> IdleBonusUtils.giftAppliesAt(100, -1));
    }

    /** 空权益输入保留原奖励、合并重复项且跳过零项，不调用随机源。 */
    @Test
    void noBonusKeepsOriginalRewards() {
        var result = IdleBonusUtils.calculate(List.of(new Reward(900001, 3)),
                List.of(new Reward(900001, 1), new Reward(900002, 0)), List.of(), List.of(),
                bound -> { throw new AssertionError("无神职不应抽样"); });
        assertEquals(List.of(new Reward(900001, 4)), result.total());
        assertTrue(result.baseAdditions().isEmpty());
        assertTrue(result.clergyAdditions().isEmpty());
    }

    /** 两个50%分别取整，3+1+1=5，不能先合100%得6或逐次连乘。 */
    @Test
    void baseBonusesRoundIndependently() {
        var result = IdleBonusUtils.calculate(List.of(new Reward(900001, 3)), List.of(),
                List.of(new BaseBonus("vip", 900001, 5000), new BaseBonus("gift", 900001, 5000)),
                List.of(), bound -> 0);
        assertEquals(List.of(new Reward(900001, 5)), result.total());
        assertEquals(List.of(1L, 1L), result.baseAdditions().stream()
                .map(addition -> addition.reward().quantity()).toList());
    }

    /** VIP/世界/礼包仅以基础资源为底数；随机活动同ID奖励不扩大底数。 */
    @Test
    void baseBonusesIgnoreRandomAndActivityRewards() {
        var result = IdleBonusUtils.calculate(List.of(new Reward(900003, 10)),
                List.of(new Reward(900003, 100), new Reward(900002, 5)),
                List.of(new BaseBonus("vip", 900003, IdleBonusUtils.vipBasisPoints(20)),
                        new BaseBonus("world", 900003, 20000),
                        new BaseBonus("gift", 900003, 5000),
                        new BaseBonus("not-in-base", 900002, 5000)),
                List.of(), bound -> 0);
        assertEquals(List.of(new Reward(900002, 5), new Reward(900003, 137)), result.total());
        assertEquals(3, result.baseAdditions().size());
    }

    /** 神职50%分别作用于基础3及随机/活动各1，追加2+1+1；不能提前合5再ceil得3。 */
    @Test
    void clergyPreservesOriginalFragmentsAndExcludesOtherBonuses() {
        var result = IdleBonusUtils.calculate(List.of(new Reward(900001, 3)),
                List.of(new Reward(900001, 1), new Reward(900001, 1)),
                List.of(new BaseBonus("vip", 900001, 2000), new BaseBonus("gift", 900001, 5000)),
                List.of(new ClergyBonus("clergy-6", 5000, 10000)), bound -> 9999);
        assertEquals(List.of(2L, 1L, 1L), result.clergyAdditions().stream()
                .map(addition -> addition.reward().quantity()).toList());
        assertEquals(List.of(new Reward(900001, 10)), result.total());
    }

    /** 神职6级和10级两条各50%分别向上取整，原始1追加1+1而不是合100%追加1。 */
    @Test
    void multipleClergyEntriesAreIndependent() {
        var calls = new AtomicInteger();
        var result = IdleBonusUtils.calculate(List.of(new Reward(900001, 1)), List.of(), List.of(),
                List.of(new ClergyBonus("clergy-6", 5000, 10000),
                        new ClergyBonus("clergy-10", 5000, 10000)),
                bound -> { assertEquals(10000, bound); calls.incrementAndGet(); return 0; });
        assertEquals(2, calls.get());
        assertEquals(List.of(new Reward(900001, 3)), result.total());
    }

    /** 旧神职1基<=chance等价于0基<chance；每条只抽一次，不按物品重复抽。 */
    @Test
    void clergyProbabilityEndpointsAndDrawCount() {
        for (int[] sample : List.of(new int[]{0, 0, 0}, new int[]{10000, 9999, 2},
                new int[]{5000, 4999, 2}, new int[]{5000, 5000, 0})) {
            var calls = new AtomicInteger();
            var result = IdleBonusUtils.calculate(List.of(new Reward(900001, 1)),
                    List.of(new Reward(900002, 1)), List.of(),
                    List.of(new ClergyBonus("clergy", 5000, sample[0])),
                    bound -> { calls.incrementAndGet(); return sample[1]; });
            assertEquals(sample[2], result.clergyAdditions().size());
            assertEquals(1, calls.get());
        }
    }

    /** 保留旧float乘法的精度边界，不能悄悄改成精确十进制ceil。 */
    @Test
    void clergyRetainsLegacyFloatRounding() {
        var result = IdleBonusUtils.calculate(List.of(new Reward(900101, 16_777_217)), List.of(),
                List.of(new BaseBonus("gift", 900101, 5000)),
                List.of(new ClergyBonus("clergy", 5000, 10000)), bound -> 0);
        assertEquals(8_388_608, result.clergyAdditions().getFirst().reward().quantity());
        assertEquals(8_388_608, result.baseAdditions().getFirst().reward().quantity());
        assertEquals(List.of(new Reward(900101, 33_554_433)), result.total());
    }

    /** 输入和输出互不共享可写列表，结果不能被调用方修改。 */
    @Test
    void inputsStayUnchangedAndResultsAreImmutable() {
        var base = new ArrayList<>(List.of(new Reward(900001, 3)));
        var bonuses = new ArrayList<>(List.of(new BaseBonus("gift", 900001, 5000)));
        var result = IdleBonusUtils.calculate(base, List.of(), bonuses, List.of(), bound -> 0);
        assertEquals(List.of(new Reward(900001, 3)), base);
        assertEquals(1, bonuses.size());
        base.clear();
        bonuses.clear();
        assertEquals(List.of(new Reward(900001, 4)), result.total());
        assertThrows(UnsupportedOperationException.class, () -> result.total().clear());
        assertThrows(UnsupportedOperationException.class, () -> result.baseAdditions().clear());
        assertThrows(UnsupportedOperationException.class, () -> result.clergyAdditions().clear());
    }

    /** 非法金额、重复基础ID、系数和概率在抽样前拒绝，不生成部分结果。 */
    @Test
    void rejectsInvalidInputsBeforeRandom() {
        java.util.function.IntUnaryOperator never = bound -> { throw new AssertionError("不应抽样"); };
        assertThrows(IllegalArgumentException.class, () -> IdleBonusUtils.calculate(
                List.of(new Reward(1, -1)), List.of(), List.of(), List.of(), never));
        assertThrows(IllegalArgumentException.class, () -> IdleBonusUtils.calculate(
                List.of(new Reward(1, 1), new Reward(1, 2)), List.of(), List.of(), List.of(), never));
        assertThrows(IllegalArgumentException.class, () -> IdleBonusUtils.calculate(
                List.of(), List.of(new Reward(0, 1)), List.of(), List.of(), never));
        assertThrows(IllegalArgumentException.class, () -> IdleBonusUtils.calculate(
                List.of(), List.of(), List.of(new BaseBonus("gift", 1, -1)), List.of(), never));
        assertThrows(IllegalArgumentException.class, () -> IdleBonusUtils.calculate(
                List.of(), List.of(), List.of(), List.of(new ClergyBonus("clergy", 5000, 10001)), never));
        assertThrows(IllegalArgumentException.class, () -> IdleBonusUtils.vipBasisPoints(-1));
        assertThrows(ArithmeticException.class, () -> IdleBonusUtils.vipBasisPoints(Integer.MAX_VALUE));
    }

    /** 随机端点越界拒绝；计算值或合并溢出不得静默饱和、绕回或返回部分资产。 */
    @Test
    void rejectsRandomAndAmountOverflow() {
        for (int point : List.of(-1, 10000)) {
            assertThrows(IllegalArgumentException.class, () -> IdleBonusUtils.calculate(
                    List.of(), List.of(), List.of(), List.of(new ClergyBonus("clergy", 5000, 5000)),
                    bound -> point));
        }
        var base = List.of(new Reward(1, Long.MAX_VALUE));
        assertThrows(ArithmeticException.class, () -> IdleBonusUtils.calculate(base, List.of(),
                List.of(new BaseBonus("gift", 1, 20000)), List.of(), bound -> 0));
        assertThrows(ArithmeticException.class, () -> IdleBonusUtils.calculate(base, List.of(),
                List.of(), List.of(new ClergyBonus("clergy", 20000, 10000)), bound -> 0));
        assertThrows(ArithmeticException.class, () -> IdleBonusUtils.calculate(base,
                List.of(new Reward(1, 1)), List.of(), List.of(), bound -> 0));
        assertEquals(Long.MAX_VALUE, base.getFirst().quantity());
    }
}
