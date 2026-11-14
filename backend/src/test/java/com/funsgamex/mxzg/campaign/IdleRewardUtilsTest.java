/**
 * 完整挂机纯装配回归：串联冻结活动、普通随机与神职，核对同一随机源的调用顺序和旧分项取整。
 * 使用隔离规则与已明确标注的输入夹具，不启动Spring、数据库或领取入口，不写生产配置和资产。
 * 失败只保证候选不返回且previous不被修改；已消费的服务器随机源不假装回滚。
 */
package com.funsgamex.mxzg.campaign;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class IdleRewardUtilsTest {
    /**
     * 一次期望抽样，方法和范围都属于契约，不能仅凭总调用次数判定顺序正确。
     * @param method bound/range/double分别对应三个显式随机入口
     * @param origin 整数区间起点；其他入口为0
     * @param bound 整数排他上界；double入口为0
     * @param value 本次固定返回点，double权重值不先换算成整数
     */
    private record Step(String method, int origin, int bound, double value) {}

    /** 用脚本逐次核验活动、普通概率/权重/数量与神职对同一随机对象的实际调用。 */
    private static final class ScriptedRandom implements RandomGenerator {
        /** 本次计算的固定调用脚本，构造后不可改写。 */
        private final List<Step> steps;
        /** 下一次应消费的脚本位置，构造时为0，仅成功核验入口后递增。 */
        private int cursor;

        /** 绑定本用例全部预期调用，空脚本表示任何随机消费都属于错误。 */
        private ScriptedRandom(Step... steps) {
            this.steps = List.of(steps);
        }

        /** 记录单上界抽样；活动和普通概率虽可同为百万上界，返回点仍按全链脚本区分。 */
        @Override
        public int nextInt(int bound) {
            var step = next("bound", 0, bound);
            assertTrue(step.value() >= 0 && step.value() < bound);
            return (int) step.value();
        }

        /** 记录数量半开区间，固定数量也要求按旧入口消费一次随机。 */
        @Override
        public int nextInt(int origin, int bound) {
            var step = next("range", origin, bound);
            assertTrue(step.value() >= origin && step.value() < bound);
            return (int) step.value();
        }

        /** 记录旧权重nextDouble入口，不接受整数权重随机替代。 */
        @Override
        public double nextDouble() {
            var step = next("double", 0, 0);
            assertTrue(step.value() >= 0 && step.value() < 1);
            return step.value();
        }

        /** 拒绝默认方法偷偷消费其他随机入口。 */
        @Override
        public long nextLong() {
            throw new AssertionError("纯装配不得调用未登记的nextLong");
        }

        /** 核对本次方法和范围，额外抽样在访问脚本外时立即失败。 */
        private Step next(String method, int origin, int bound) {
            assertTrue(cursor < steps.size(), "不应额外消费随机：" + method);
            var step = steps.get(cursor++);
            assertEquals(step.method(), method, "随机方法顺序错误");
            assertEquals(step.origin(), origin, "随机区间起点错误");
            assertEquals(step.bound(), bound, "随机区间上界错误");
            return step;
        }

        /** 计算结束或晚期失败后检查没有少抽，不声称失败能回滚已消费随机。 */
        private void exhausted() {
            assertEquals(steps.size(), cursor, "随机脚本未完全消费");
        }
    }

    /** 定义一次活动、普通概率或神职的单上界抽样。 */
    private Step point(int bound, int value) {
        return new Step("bound", 0, bound, value);
    }

    /** 定义一次数量随机，不把固定数量优化成直接返回。 */
    private Step quantity(int minimum, int exclusiveMaximum, int value) {
        return new Step("range", minimum, exclusiveMaximum, value);
    }

    /** 定义一次旧权重浮点抽样。 */
    private Step weight(double value) {
        return new Step("double", 0, 0, value);
    }

    /** 构造测试奖励，配置ID与数量均由具体边界用例明确给出。 */
    private CampaignRules.Reward reward(int id, long amount) {
        return new CampaignRules.Reward(id, amount);
    }

    /** 经已有解析依赖注入小规则，避免改写真实JSON或运行依赖Spring的服务。 */
    private IdleRules rules(long base, boolean ordinary, int chance) {
        var data = new IdleRules.Data("test-idle-assembly-v1", 60, 60, 21600, 43200,
                List.of(new IdleRules.Stage(1, 10, List.of(reward(900001, base)))),
                ordinary ? List.of(new IdleRules.Trigger(10, 1, 101, chance, 100, 1000)) : List.of(),
                ordinary ? List.of(new IdleRules.Drop(101, 900101, 3, 1, 3),
                        new IdleRules.Drop(101, 900102, 4, 1, 3)) : List.of());
        var mapper = mock(ObjectMapper.class);
        when(mapper.readValue(any(InputStream.class), eq(IdleRules.Data.class))).thenReturn(data);
        return new IdleRules(mapper);
    }

    /** 构造明确未发布的完整三控制；这只是隔离夹具，不是生产活动初始化。 */
    private List<IdleRewardInputService.Activity> inactive() {
        return new ArrayList<>(List.of(
                unavailable(16), unavailable(34), unavailable(44)));
    }

    /** 构造一项明确未发布状态，不用缺行或空控制代表无活动。 */
    private IdleRewardInputService.Activity unavailable(int id) {
        return new IdleRewardInputService.Activity(new IdleActivityService.Control(id, false,
                Optional.empty(), 1), IdleRewardInputService.ActivityStatus.NOT_PUBLISHED, Optional.empty());
    }

    /** 构造与统一时刻1000秒相容的完整记录期；044保留真实可为0的运营轮次。 */
    private IdleActivityService.Period period(int id) {
        return new IdleActivityService.Period(0, 2000, 3000, id == 44 ? 0 : 1, 0, 0);
    }

    /** 将一次已确认适用的冻结掉落行装入控制，不在纯计算中重新查询当前配置。 */
    private IdleRewardInputService.Activity applicable(int id, int frequency, int chance,
                                                       List<CampaignRules.Reward> rewards) {
        var drop = new IdleActivityRules.Drop(100000 + id, id == 44 ? null : 1,
                rewards, frequency, chance);
        return new IdleRewardInputService.Activity(new IdleActivityService.Control(id, true,
                Optional.of(period(id)), 7), IdleRewardInputService.ActivityStatus.APPLICABLE, Optional.of(drop));
    }

    /** 封装合法低于世界门槛的角色及完整活动夹具，两个规则版本与普通配置一并冻结。 */
    private IdleRewardInputService.Input input(IdleRules rules,
                                               List<IdleRewardInputService.Activity> activities,
                                               List<IdleBonusUtils.BaseBonus> bonuses,
                                               List<IdleBonusUtils.ClergyBonus> clergy) {
        return input(rules, 20, rules.data().version(), activities, bonuses, clergy);
    }

    /** 允许版本及角色等级边界变体，其他来源保持明确完整，避免缺依赖被空列表冒充。 */
    private IdleRewardInputService.Input input(IdleRules rules, int level, String idleVersion,
                                               List<IdleRewardInputService.Activity> activities,
                                               List<IdleBonusUtils.BaseBonus> bonuses,
                                               List<IdleBonusUtils.ClergyBonus> clergy) {
        return new IdleRewardInputService.Input("test-role", "local-1", level, 0, clergy.isEmpty() ? 0 : 10,
                21600, 1000, "idle-input-test-v1", idleVersion, Optional.empty(), bonuses, clergy, List.of(),
                new IdleRewardInputService.ActivityInput(OptionalLong.of(0), OptionalLong.of(1), activities));
    }

    /** 按ID取最终数量，缺物品返回0，不依赖最终列表实现的排序细节。 */
    private long amount(IdleRewardUtils.Result result, int id) {
        return result.outcome().total().stream().filter(item -> item.itemId() == id)
                .mapToLong(CampaignRules.Reward::quantity).sum();
    }

    /** 同一随机源按016/034/044、普通概率/浮点权重/数量、神职顺序消费，并形成各自不同结果。 */
    @Test
    void oneRandomSourceFollowsTheLegacyWholeChainOrder() {
        var rules = rules(3, true, 500000);
        var activities = List.of(
                applicable(16, 10000, 6936, List.of(reward(901701, 1))),
                applicable(34, 10000, 0, List.of(reward(900502, 1))),
                applicable(44, 10000, 6936, List.of(reward(901702, 1))));
        var random = new ScriptedRandom(point(1000000, 0), point(1000000, 999999),
                point(1000000, 6936), point(1000000, 0), weight(0.75), quantity(1, 4, 3), point(10000, 4999));
        var result = IdleRewardUtils.calculate(rules, input(rules, activities, List.of(),
                List.of(new IdleBonusUtils.ClergyBonus("clergy-6", 5000, 5000))), 1, 60, 0, Map.of(), random);
        random.exhausted();
        assertEquals(List.of(16, 34, 44), result.activities().stream()
                .map(IdleRewardUtils.ActivityReward::activityId).toList());
        assertEquals(List.of(reward(901701, 1)), result.activities().get(0).rewards());
        assertTrue(result.activities().get(1).rewards().isEmpty());
        assertEquals(List.of(reward(901702, 1)), result.activities().get(2).rewards());
        assertEquals(List.of(reward(900102, 3)), result.ordinary().dropRewards());
        assertEquals(2, amount(result, 901701));
        assertEquals(5, amount(result, 900102));
        assertEquals(5, amount(result, 900001));
    }

    /** 四种明确不适用原因都不增加随机消费，剩余阶段继续使用相同脚本位置。 */
    @Test
    void inapplicableActivitiesNeverConsumeRandomOrInventDropRows() {
        var rules = rules(3, true, 500000);
        var activities = inactive();
        activities.set(1, new IdleRewardInputService.Activity(new IdleActivityService.Control(34, true,
                Optional.of(new IdleActivityService.Period(1100, 2000, 3000, 1, 1100, 0)), 1),
                IdleRewardInputService.ActivityStatus.OUTSIDE_RECORD_PERIOD, Optional.empty()));
        activities.set(2, new IdleRewardInputService.Activity(new IdleActivityService.Control(44, true,
                Optional.of(new IdleActivityService.Period(0, 2000, 3000, 0, 0, 2)), 1),
                IdleRewardInputService.ActivityStatus.SERVER_TOO_YOUNG, Optional.empty()));
        var random = new ScriptedRandom(point(1000000, 0), weight(0), quantity(1, 4, 1));
        var result = IdleRewardUtils.calculate(rules, input(rules, activities, List.of(), List.of()),
                1, 60, 0, Map.of(), random);
        random.exhausted();
        assertTrue(result.activities().stream().allMatch(item -> item.rewards().isEmpty()));
        var low = inactive();
        low.set(0, new IdleRewardInputService.Activity(new IdleActivityService.Control(16, true,
                Optional.of(period(16)), 1), IdleRewardInputService.ActivityStatus.ROLE_LEVEL_TOO_LOW, Optional.empty()));
        var lowRandom = new ScriptedRandom(point(1000000, 999999));
        IdleRewardUtils.calculate(rules, input(rules, 1, rules.data().version(), low, List.of(), List.of()),
                1, 60, 0, Map.of(), lowRandom);
        lowRandom.exhausted();
    }

    /** 活动显式0概率仍抽一次，抽到0会中，不能优化为无奖励或把普通概率端点套过来。 */
    @Test
    void explicitZeroActivityChanceStillConsumesItsDraw() {
        var rules = rules(1, false, 0);
        var activities = inactive();
        activities.set(1, applicable(34, 3600, 0, List.of(reward(900502, 1))));
        var random = new ScriptedRandom(point(1000000, 0));
        var result = IdleRewardUtils.calculate(rules, input(rules, activities, List.of(), List.of()),
                1, 60, 0, Map.of(), random);
        random.exhausted();
        assertEquals(1, amount(result, 900502));
    }

    /** 零秒不抽活动或普通掉落，但旧神职仍按每条概率抽一次，不能整条链提前返回。 */
    @Test
    void zeroSecondsPreserveClergyDrawWithoutActivityOrOrdinaryDraws() {
        var rules = rules(3, true, 500000);
        var activities = List.of(applicable(16, 100, 6936, List.of(reward(901701, 1))),
                unavailable(34), unavailable(44));
        var random = new ScriptedRandom(point(10000, 9999));
        var result = IdleRewardUtils.calculate(rules, input(rules, activities, List.of(),
                List.of(new IdleBonusUtils.ClergyBonus("clergy", 5000, 10000))), 1, 0, 0, Map.of(), random);
        random.exhausted();
        assertTrue(result.outcome().total().isEmpty());
    }

    /** 一项活动固定与随机共两次先形成数量2，50%神职只能追加1，不能按两次单件分别ceil。 */
    @Test
    void activityAggregatesItsCountBeforeClergyRounding() {
        var rules = rules(3, false, 0);
        var activities = inactive();
        activities.set(0, applicable(16, 60, 6936, List.of(reward(900001, 1))));
        var random = new ScriptedRandom(point(1000000, 0), point(10000, 0));
        var result = IdleRewardUtils.calculate(rules, input(rules, activities, List.of(),
                List.of(new IdleBonusUtils.ClergyBonus("clergy", 5000, 10000))), 1, 60, 0, Map.of(), random);
        random.exhausted();
        assertEquals(List.of(reward(900001, 2)), result.activities().getFirst().rewards());
        assertEquals(List.of(2L, 1L), result.outcome().clergyAdditions().stream()
                .map(item -> item.reward().quantity()).toList());
        assertEquals(8, amount(result, 900001));
    }

    /** 基础与不同活动同ID仍分别ceil，不能提前合并1+1+1后只追加2。 */
    @Test
    void duplicateIdsAcrossActivitySourcesKeepIndependentClergyParts() {
        var rules = rules(1, false, 0);
        var activities = List.of(applicable(16, 10000, 0, List.of(reward(900001, 1))), unavailable(34),
                applicable(44, 10000, 0, List.of(reward(900001, 1))));
        var random = new ScriptedRandom(point(1000000, 0), point(1000000, 0), point(10000, 0));
        var result = IdleRewardUtils.calculate(rules, input(rules, activities, List.of(),
                List.of(new IdleBonusUtils.ClergyBonus("clergy", 5000, 10000))), 1, 60, 0, Map.of(), random);
        random.exhausted();
        assertEquals(List.of(1L, 1L, 1L), result.outcome().clergyAdditions().stream()
                .map(item -> item.reward().quantity()).toList());
        assertEquals(6, amount(result, 900001));
    }

    /** 同一活动原配置重复ID也不合并，1和3各追加1与2，不能合4后只追加2。 */
    @Test
    void duplicateRewardRowsInsideOneActivityRemainSeparate() {
        var rules = rules(0, false, 0);
        var activities = inactive();
        activities.set(0, applicable(16, 10000, 0, List.of(reward(900001, 1), reward(900001, 3))));
        var random = new ScriptedRandom(point(1000000, 0), point(10000, 0));
        var result = IdleRewardUtils.calculate(rules, input(rules, activities, List.of(),
                List.of(new IdleBonusUtils.ClergyBonus("clergy", 5000, 10000))), 1, 60, 0, Map.of(), random);
        random.exhausted();
        assertEquals(List.of(reward(900001, 1), reward(900001, 3)), result.activities().getFirst().rewards());
        assertEquals(7, amount(result, 900001));
    }

    /** 同窗随机先合并，跨窗仍分项；相同两次3件在同窗追加3、跨窗追加2+2。 */
    @Test
    void ordinaryWindowBoundariesSurviveTheWholeAssembly() {
        var rules = rules(0, true, 500000);
        for (int previousSeconds : List.of(0, 43140)) {
            var random = new ScriptedRandom(point(1000000, 0), weight(0), quantity(1, 4, 3),
                    point(1000000, 0), weight(0), quantity(1, 4, 3), point(10000, 0));
            var result = IdleRewardUtils.calculate(rules, input(rules, inactive(), List.of(),
                    List.of(new IdleBonusUtils.ClergyBonus("clergy", 5000, 10000))),
                    1, 120, previousSeconds, Map.of(), random);
            random.exhausted();
            assertEquals(previousSeconds == 0 ? List.of(reward(900101, 6))
                    : List.of(reward(900101, 3), reward(900101, 3)), result.ordinary().dropRewards());
            assertEquals(previousSeconds == 0 ? 9 : 10, amount(result, 900101));
        }
    }

    /** 基础加成每条只使用基础3，不能把活动100纳入底数或与上一条追加连乘。 */
    @Test
    void baseBonusesIgnoreActivityRewardsAndRoundEachSource() {
        var rules = rules(3, false, 0);
        var activities = inactive();
        activities.set(0, applicable(16, 10000, 0, List.of(reward(900001, 100))));
        var random = new ScriptedRandom(point(1000000, 0));
        var result = IdleRewardUtils.calculate(rules, input(rules, activities,
                List.of(new IdleBonusUtils.BaseBonus("vip", 900001, 5000),
                        new IdleBonusUtils.BaseBonus("gift", 900001, 5000)), List.of()),
                1, 60, 0, Map.of(), random);
        random.exhausted();
        assertEquals(List.of(1L, 1L), result.outcome().baseAdditions().stream()
                .map(item -> item.reward().quantity()).toList());
        assertEquals(105, amount(result, 900001));
    }

    /** 神职条目共用同一随机源但各抽一次，阈值两侧不能合并成一次判定。 */
    @Test
    void multipleClergyEntriesRetainIndependentProbabilityDraws() {
        var rules = rules(3, false, 0);
        var random = new ScriptedRandom(point(10000, 4999), point(10000, 5000));
        var result = IdleRewardUtils.calculate(rules, input(rules, inactive(), List.of(),
                List.of(new IdleBonusUtils.ClergyBonus("clergy-6", 5000, 5000),
                        new IdleBonusUtils.ClergyBonus("clergy-10", 5000, 5000))),
                1, 60, 0, Map.of(), random);
        random.exhausted();
        assertEquals(5, amount(result, 900001));
        assertEquals(List.of("clergy-6"), result.outcome().clergyAdditions().stream()
                .map(IdleBonusUtils.Addition::key).toList());
    }

    /** 缺项、重复或乱序控制均在任何抽样前拒绝，不能把缺输入等同于无活动。 */
    @Test
    void incompleteDuplicateOrReorderedActivitiesFailBeforeRandom() {
        var rules = rules(1, true, 500000);
        var complete = inactive();
        for (var entries : List.of(List.of(complete.get(0), complete.get(1)),
                List.of(complete.get(0), complete.get(0), complete.get(2)),
                List.of(complete.get(1), complete.get(0), complete.get(2)))) {
            var random = new ScriptedRandom();
            assertThrows(IllegalArgumentException.class, () -> IdleRewardUtils.calculate(rules,
                    input(rules, entries, List.of(), List.of()), 1, 60, 0, Map.of(), random));
            random.exhausted();
        }
    }

    /** 适用缺行、非适用附行和轮次不匹配均先失败，不能先计算普通随机再发现缺依赖。 */
    @Test
    void inconsistentActivityStatusAndFrozenDropFailBeforeRandom() {
        var rules = rules(1, true, 500000);
        var valid = applicable(16, 10000, 0, List.of(reward(901701, 1)));
        var mismatched = new IdleActivityRules.Drop(100016, 2, List.of(reward(901701, 1)), 10000, 0);
        var invalid = List.of(
                new IdleRewardInputService.Activity(valid.control(), IdleRewardInputService.ActivityStatus.APPLICABLE,
                        Optional.empty()),
                new IdleRewardInputService.Activity(unavailable(16).control(),
                        IdleRewardInputService.ActivityStatus.NOT_PUBLISHED, valid.drop()),
                new IdleRewardInputService.Activity(valid.control(), IdleRewardInputService.ActivityStatus.APPLICABLE,
                        Optional.of(mismatched)));
        for (var entry : invalid) {
            var entries = inactive();
            entries.set(0, entry);
            var random = new ScriptedRandom();
            assertThrows(IllegalArgumentException.class, () -> IdleRewardUtils.calculate(rules,
                    input(rules, entries, List.of(), List.of()), 1, 60, 0, Map.of(), random));
            random.exhausted();
        }
    }

    /** 矛盾的期外、等级不足、开服日数状态在抽样前拒绝，不默默漏掉已经适用的来源。 */
    @Test
    void contradictoryFrozenActivityReasonsAndDaysFailBeforeRandom() {
        var rules = rules(1, true, 500000);
        var invalid = List.of(
                new IdleRewardInputService.Activity(applicable(16, 10000, 0, List.of(reward(901701, 1))).control(),
                        IdleRewardInputService.ActivityStatus.OUTSIDE_RECORD_PERIOD, Optional.empty()),
                new IdleRewardInputService.Activity(applicable(44, 10000, 0, List.of(reward(901702, 1))).control(),
                        IdleRewardInputService.ActivityStatus.ROLE_LEVEL_TOO_LOW, Optional.empty()),
                new IdleRewardInputService.Activity(applicable(34, 10000, 0, List.of(reward(900502, 1))).control(),
                        IdleRewardInputService.ActivityStatus.SERVER_TOO_YOUNG, Optional.empty()));
        var random = new ScriptedRandom();
        for (var entry : invalid) {
            var entries = inactive();
            entries.set(List.of(16, 34, 44).indexOf(entry.control().activityId()), entry);
            assertThrows(IllegalArgumentException.class, () -> IdleRewardUtils.calculate(rules,
                    input(rules, entries, List.of(), List.of()), 1, 60, 0, Map.of(), random));
        }
        var input = input(rules, inactive(), List.of(), List.of());
        var wrongDays = new IdleRewardInputService.Input(input.roleId(), input.serverId(), input.roleLevel(),
                input.vipLevel(), input.clergyLevel(), input.maxSeconds(), input.serverTimeSeconds(),
                input.rulesVersion(), input.idleRulesVersion(), input.world(), input.baseBonuses(),
                input.clergyBonuses(), input.gifts(), new IdleRewardInputService.ActivityInput(
                        OptionalLong.of(0), OptionalLong.of(999), input.activities().entries()));
        assertThrows(IllegalArgumentException.class, () -> IdleRewardUtils.calculate(rules,
                wrongDays, 1, 60, 0, Map.of(), random));
        random.exhausted();
    }

    /** 版本、时段、基础加成或神职规则明显非法时先拒绝，不消耗任何完整链随机。 */
    @Test
    void invalidVersionIntervalAndBonusesAreRejectedBeforeRandom() {
        var rules = rules(1, true, 500000);
        var activities = List.of(applicable(16, 10000, 0, List.of(reward(901701, 1))),
                unavailable(34), unavailable(44));
        var random = new ScriptedRandom();
        assertThrows(IllegalArgumentException.class, () -> IdleRewardUtils.calculate(rules,
                input(rules, 20, "different-version", activities, List.of(), List.of()),
                1, 60, 0, Map.of(), random));
        assertThrows(java.util.NoSuchElementException.class, () -> IdleRewardUtils.calculate(rules,
                input(rules, activities, List.of(), List.of()), 2, 60, 0, Map.of(), random));
        for (int seconds : List.of(-1, 21601)) {
            assertThrows(IllegalArgumentException.class, () -> IdleRewardUtils.calculate(rules,
                    input(rules, activities, List.of(), List.of()), 1, seconds, 0, Map.of(), random));
        }
        assertThrows(IllegalArgumentException.class, () -> IdleRewardUtils.calculate(rules,
                input(rules, activities, List.of(new IdleBonusUtils.BaseBonus("invalid", 900001, -1)), List.of()),
                1, 60, 0, Map.of(), random));
        assertThrows(IllegalArgumentException.class, () -> IdleRewardUtils.calculate(rules,
                input(rules, activities, List.of(), List.of(new IdleBonusUtils.ClergyBonus("invalid", 5000, 10001))),
                1, 60, 0, Map.of(), random));
        random.exhausted();
    }

    /** 负计数及非法累计窗口先拒绝，原Map在所有异常路径保持不变。 */
    @Test
    void invalidPreviousCountersAndWindowDoNotMutateTheirInput() {
        var rules = rules(1, true, 500000);
        for (var counter : List.of(new IdleRules.Counter(-1, 0), new IdleRules.Counter(1, -1))) {
            var previous = new HashMap<>(Map.of(1, counter));
            var random = new ScriptedRandom();
            assertThrows(IllegalArgumentException.class, () -> IdleRewardUtils.calculate(rules,
                    input(rules, inactive(), List.of(), List.of()), 1, 60, 0, previous, random));
            assertEquals(Map.of(1, counter), previous);
            random.exhausted();
        }
        var previous = Map.of(1, new IdleRules.Counter(2, 3));
        for (int accumulated : List.of(-1, 43200)) {
            var random = new ScriptedRandom();
            assertThrows(IllegalArgumentException.class, () -> IdleRewardUtils.calculate(rules,
                    input(rules, inactive(), List.of(), List.of()), 1, 60, accumulated, previous, random));
            random.exhausted();
        }
    }

    /** 活动倍乘和最终合并的晚期溢出都不能返回部分结果，已消费随机不假装回滚。 */
    @Test
    void lateOverflowNeverReturnsPartialCandidateOrChangesPrevious() {
        var previous = new HashMap<>(Map.of(1, new IdleRules.Counter(2, 3)));
        var expected = Map.copyOf(previous);
        var rules = rules(1, false, 0);
        var overflowingBase = rules(Long.MAX_VALUE, false, 0);
        var noDraws = new ScriptedRandom();
        assertThrows(ArithmeticException.class, () -> IdleRewardUtils.calculate(overflowingBase,
                input(overflowingBase, inactive(), List.of(), List.of()), 1, 120, 0, previous, noDraws));
        assertEquals(expected, previous);
        noDraws.exhausted();
        var activities = inactive();
        activities.set(0, applicable(16, 30, 0, List.of(reward(901701, Long.MAX_VALUE))));
        var multiplied = new ScriptedRandom(point(1000000, 1));
        var candidate = new AtomicReference<IdleRewardUtils.Result>();
        assertThrows(ArithmeticException.class, () -> candidate.set(IdleRewardUtils.calculate(rules,
                input(rules, activities, List.of(), List.of()), 1, 60, 0, previous, multiplied)));
        assertNull(candidate.get());
        assertEquals(expected, previous);
        multiplied.exhausted();

        var largeBase = rules(Long.MAX_VALUE, false, 0);
        var mergeActivities = inactive();
        mergeActivities.set(0, applicable(16, 10000, 0, List.of(reward(900001, 1))));
        var merged = new ScriptedRandom(point(1000000, 0));
        assertThrows(ArithmeticException.class, () -> candidate.set(IdleRewardUtils.calculate(largeBase,
                input(largeBase, mergeActivities, List.of(), List.of()), 1, 60, 0, previous, merged)));
        assertNull(candidate.get());
        assertEquals(expected, previous);
        merged.exhausted();
    }

    /** 成功结果独立冻结原计数及新计数，调用者清空原Map或尝试改结果都不能改变候选。 */
    @Test
    void successfulCandidateFreezesInputsAndEveryOutputCollection() {
        var rules = rules(3, true, 500000);
        var previous = new HashMap<>(Map.of(1, new IdleRules.Counter(2, 3)));
        var snapshot = Map.copyOf(previous);
        var frozenInput = input(rules, inactive(), List.of(), List.of());
        var random = new ScriptedRandom(point(1000000, 999999));
        var result = IdleRewardUtils.calculate(rules, frozenInput, 1, 60, 0, previous, random);
        random.exhausted();
        assertSame(frozenInput, result.input());
        assertEquals(snapshot, previous);
        assertEquals(snapshot, result.previousCounters());
        assertEquals(new IdleRules.Counter(2, 4), result.ordinary().counters().get(1));
        previous.clear();
        assertEquals(snapshot, result.previousCounters());
        assertThrows(UnsupportedOperationException.class, result.previousCounters()::clear);
        assertThrows(UnsupportedOperationException.class, result.ordinary().counters()::clear);
        assertThrows(UnsupportedOperationException.class, result.activities()::clear);
        assertThrows(UnsupportedOperationException.class, result.activities().getFirst().rewards()::clear);
        assertThrows(UnsupportedOperationException.class, result.outcome().total()::clear);
    }
}
