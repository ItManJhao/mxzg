/**
 * 挂机纯规则边界回归：直接调用现有IdleRules，锁定旧服保底、上限和累计窗口语义。
 * 不启动Spring、数据库或领取入口；合成配置仅通过测试解析器注入，不能当作开放关卡或完整加成验收。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.CampaignRules;
import com.funsgamex.mxzg.campaign.IdleRules;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class IdleRulesBoundaryTest {
    /** 可控制概率、权重和数量端点的随机源；计数用于验证封顶/保底短路，不模拟资产状态。 */
    private static final class Draws implements RandomGenerator {
        /** 百万分概率抽样点，0至999999，每次概率判定复用。 */
        private final int chancePoint;
        /** 权重抽样点，由用例保证处于所选表的权重总和内。 */
        private final int weightPoint;
        /** true取数量上端点，false取下端点。 */
        private final boolean upperQuantity;
        /** 已执行概率判定次数，构造后从0累计，用于判断是否被保底跳过。 */
        private int chanceCalls;
        /** 所有随机调用次数，构造后从0累计，用于判断封顶是否完全停止抽取。 */
        private int calls;

        /** 指定本用例抽样端点；不依赖随机种子或概率波动。 */
        private Draws(int chancePoint, int weightPoint, boolean upperQuantity) {
            this.chancePoint = chancePoint;
            this.weightPoint = weightPoint;
            this.upperQuantity = upperQuantity;
        }

        /** 概率和权重采用不同端点；遇到越界夹具立即失败，不回绕隐藏问题。 */
        @Override
        public int nextInt(int bound) {
            calls++;
            int point = weightPoint;
            if (bound == 1_000_000) {
                chanceCalls++;
                point = chancePoint;
            }
            assertTrue(point >= 0 && point < bound, "测试抽样点必须落在合法区间");
            return point;
        }

        /** 观察生产方法传入的半开区间，选择数量最小值或最大值。 */
        @Override
        public int nextInt(int origin, int bound) {
            calls++;
            assertTrue(origin < bound);
            return upperQuantity ? bound - 1 : origin;
        }

        /** 拒绝未约定的抽样入口，防止规则改动后测试悄悄走另一随机路径。 */
        @Override
        public long nextLong() {
            throw new AssertionError("未约定的挂机随机入口");
        }
    }

    /** 构造两关不同掉落表但同类别的规则，便于验证跨关计数；只替换测试解析结果。 */
    private IdleRules fixture(int chance, int guarantee, int cap, int quantity) {
        var stages = List.of(
                new IdleRules.Stage(1, 10, List.of(new CampaignRules.Reward(900001, 200))),
                new IdleRules.Stage(2, 20, List.of(new CampaignRules.Reward(900001, 220))));
        var triggers = List.of(
                new IdleRules.Trigger(10, 1, 101, chance, guarantee, cap),
                new IdleRules.Trigger(20, 1, 102, chance, guarantee, cap));
        var drops = List.of(
                new IdleRules.Drop(101, 1001, 1, quantity, quantity),
                new IdleRules.Drop(102, 1002, 1, quantity, quantity));
        return fixture(new IdleRules.Data("test-only", 60, 60, 21600, 43200, stages, triggers, drops));
    }

    /** 通过构造入口的解析依赖提供边界夹具，不改生产配置和规则实现。 */
    private IdleRules fixture(IdleRules.Data data) {
        var mapper = mock(ObjectMapper.class);
        when(mapper.readValue(any(InputStream.class), eq(IdleRules.Data.class))).thenReturn(data);
        return new IdleRules(mapper);
    }

    /** 读取指定物品产出，未产出返回0，避免依赖奖励列表排列。 */
    private long quantity(IdleRules.Roll roll, int item) {
        return roll.rewards().stream().filter(reward -> reward.itemId() == item)
                .mapToLong(CampaignRules.Reward::quantity).sum();
    }

    /** 真实已导入配置：89/90秒的基础次数相同，随机次数在半分钟边界增加。 */
    @Test
    void realConfigUsesDifferentBaseAndRandomRounding() {
        var rules = new IdleRules(new ObjectMapper());
        var before = rules.roll(1, 89, 0, Map.of(), new Draws(999999, 0, false));
        var at = rules.roll(1, 90, 0, Map.of(), new Draws(999999, 0, false));
        assertEquals(200, quantity(before, 900001));
        assertEquals(200, quantity(at, 900001));
        assertEquals(1, before.counters().get(1).misses());
        assertEquals(2, at.counters().get(1).misses());
    }

    /** 同类别跨组继续保底，成功奖励取新关配置，输入快照不被修改。 */
    @Test
    void guaranteeSurvivesStageAndGroupChange() {
        var rules = fixture(0, 3, 100, 1);
        var draws = new Draws(999999, 0, false);
        var first = rules.roll(1, 120, 0, Map.of(), draws);
        assertEquals(new IdleRules.Counter(0, 2), first.counters().get(1));
        var second = rules.roll(2, 60, first.dropSeconds(), first.counters(), draws);
        assertEquals(0, quantity(second, 1001));
        assertEquals(1, quantity(second, 1002));
        assertEquals(new IdleRules.Counter(1, 0), second.counters().get(1));
        assertEquals(new IdleRules.Counter(0, 2), first.counters().get(1));
        assertEquals(2, draws.chanceCalls, "第三次保底不得再抽命中概率");
    }

    /** 达上限后即使达到保底也跳过，既不抽奖也不推进未中计数。 */
    @Test
    void capPrecedesGuaranteeAndFreezesMisses() {
        var rules = fixture(1_000_000, 3, 10, 1);
        var draws = new Draws(0, 0, false);
        var previous = Map.of(1, new IdleRules.Counter(10, 9));
        var roll = rules.roll(1, 180, 0, previous, draws);
        assertEquals(previous, roll.counters());
        assertEquals(0, quantity(roll, 1001));
        assertEquals(0, draws.calls);
    }

    /** 抽前未达上限就发完整数量，不裁剪到剩余额度；之后停止该类别。 */
    @Test
    void quantityMayOvershootCapOnce() {
        var rules = fixture(1_000_000, 99, 10, 11);
        var draws = new Draws(0, 0, false);
        var roll = rules.roll(1, 120, 0, Map.of(1, new IdleRules.Counter(9, 0)), draws);
        assertEquals(11, quantity(roll, 1001));
        assertEquals(new IdleRules.Counter(20, 0), roll.counters().get(1));
        assertEquals(1, draws.chanceCalls);
    }

    /** 恰好到12小时先处理旧窗口，随后清零数量和未中计数，不拖到下次领取。 */
    @Test
    void exactResetClearsCountersAfterOldWindowReward() {
        var rules = fixture(0, 3, 100, 1);
        var roll = rules.roll(1, 60, 43140, Map.of(1, new IdleRules.Counter(4, 2)),
                new Draws(999999, 0, false));
        assertEquals(1, quantity(roll, 1001));
        assertEquals(0, roll.dropSeconds());
        assertTrue(roll.counters().isEmpty());
    }

    /** 30+30秒跨窗口各四舍五入为1次，不能合并为总时长的一次抽取。 */
    @Test
    void eachResetSliceRoundsSeparately() {
        var rules = fixture(1_000_000, 99, 100, 1);
        var split = rules.roll(1, 60, 43170, Map.of(), new Draws(0, 0, false));
        var whole = rules.roll(1, 60, 0, Map.of(), new Draws(0, 0, false));
        assertEquals(2, quantity(split, 1001));
        assertEquals(1, quantity(whole, 1001));
        assertEquals(200, quantity(split, 900001), "基础资源不随随机窗口重复发放");
        assertEquals(30, split.dropSeconds());
        assertEquals(new IdleRules.Counter(1, 0), split.counters().get(1));
    }

    /** 旧窗口已封顶不妨碍重置后的新窗口产出，不把旧数量带入新窗口。 */
    @Test
    void resetReopensCappedCategory() {
        var rules = fixture(1_000_000, 99, 10, 1);
        var roll = rules.roll(1, 120, 43140, Map.of(1, new IdleRules.Counter(10, 5)),
                new Draws(0, 0, false));
        assertEquals(1, quantity(roll, 1001));
        assertEquals(60, roll.dropSeconds());
        assertEquals(new IdleRules.Counter(1, 0), roll.counters().get(1));
    }

    /** 普通随机严格小于概率：0不命中，满值全中，阈值相等不命中。 */
    @Test
    void probabilityEndpointsAreStrict() {
        assertEquals(0, quantity(fixture(0, 99, 100, 1)
                .roll(1, 60, 0, Map.of(), new Draws(0, 0, false)), 1001));
        assertEquals(1, quantity(fixture(1_000_000, 99, 100, 1)
                .roll(1, 60, 0, Map.of(), new Draws(999999, 0, false)), 1001));
        var rules = fixture(250000, 99, 100, 1);
        assertEquals(1, quantity(rules.roll(1, 60, 0, Map.of(), new Draws(249999, 0, false)), 1001));
        assertEquals(0, quantity(rules.roll(1, 60, 0, Map.of(), new Draws(250000, 0, false)), 1001));
    }

    /** 权重区间相邻不重叠，数量最小和最大端点均可抽到。 */
    @Test
    void weightsAndQuantityUseCorrectEndpoints() {
        var data = fixture(1_000_000, 99, 100, 1).data();
        var rules = fixture(new IdleRules.Data(data.version(), 60, 60, 21600, 43200,
                data.stages(), data.triggers(), List.of(
                        new IdleRules.Drop(101, 1001, 1, 2, 4),
                        new IdleRules.Drop(101, 1003, 3, 5, 7),
                        new IdleRules.Drop(102, 1002, 1, 1, 1))));
        assertEquals(2, quantity(rules.roll(1, 60, 0, Map.of(), new Draws(0, 0, false)), 1001));
        assertEquals(4, quantity(rules.roll(1, 60, 0, Map.of(), new Draws(0, 0, true)), 1001));
        assertEquals(5, quantity(rules.roll(1, 60, 0, Map.of(), new Draws(0, 1, false)), 1003));
        assertEquals(7, quantity(rules.roll(1, 60, 0, Map.of(), new Draws(0, 3, true)), 1003));
    }

    /** 非法时段拒绝计算，不抽随机也不修改调用方计数；这不是领取入口门槛测试。 */
    @Test
    void invalidIntervalsLeaveInputsUntouched() {
        var rules = fixture(0, 99, 100, 1);
        var draws = new Draws(0, 0, false);
        var previous = new HashMap<>(Map.of(1, new IdleRules.Counter(2, 3)));
        for (int[] interval : List.of(new int[]{-1, 0}, new int[]{21601, 0},
                new int[]{60, -1}, new int[]{60, 43200})) {
            assertThrows(IllegalArgumentException.class,
                    () -> rules.roll(1, interval[0], interval[1], previous, draws));
        }
        assertEquals(Map.of(1, new IdleRules.Counter(2, 3)), previous);
        assertEquals(0, draws.calls);
    }
}
