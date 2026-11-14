/**
 * 挂机活动纯规则回归：验证旧轮次覆盖优先级、百万概率边界、取整及冻结掉落行的奖励分项。
 * 使用隔离投影或实际构建资源，不启动Spring、不访问数据库、不修改角色活动状态。
 * 夹具只证明计算边界，不表示活动已开启，也不替代后续权威记录期与开服日输入。
 */
package com.funsgamex.mxzg.campaign;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class IdleActivityRulesTest {
    /** 构造保留null轮次的单行隔离投影，允许用例有意传入非法值。 */
    private Map<String, Object> row(int id, Integer turns, int frequency, int chance,
                                    List<Map<String, Object>> rewards) {
        var row = new HashMap<String, Object>();
        row.put("id", id);
        row.put("turns", turns);
        row.put("frequencySeconds", frequency);
        row.put("gainChance", chance);
        row.put("rewards", rewards);
        return row;
    }

    /** 构造明确的奖励数量，不以Java窄类型掩盖数量溢出测试。 */
    private Map<String, Object> reward(int itemId, long quantity) {
        return Map.of("itemId", itemId, "quantity", quantity);
    }

    /** 构造允许044等级门槛为null的活动投影。 */
    private Map<String, Object> activity(int id, Integer minimum, List<Map<String, Object>> drops) {
        var activity = new HashMap<String, Object>();
        activity.put("id", id);
        activity.put("minimumRoleLevelExclusive", minimum);
        activity.put("drops", drops);
        return activity;
    }

    /** 默认隔离投影包含三种活动，不依赖真实记录期或数据库当前轮次。 */
    private List<Map<String, Object>> activities() {
        return new ArrayList<>(List.of(
                activity(16, 20, List.of(row(2, 1, 120, 6936, List.of(
                        reward(900001, 2), reward(900001, 3), reward(900002, 1))))),
                activity(34, 50, List.of(row(4, 1, 3600, 0, List.of(reward(900502, 1))))),
                activity(44, null, List.of(row(8, null, 1234, 6936, List.of(reward(901702, 1)))))));
    }

    /** 编码schema1隔离投影，保留自报version以验证生产摘要不信任此值。 */
    private byte[] content(List<Map<String, Object>> activities) {
        return new ObjectMapper().writeValueAsBytes(Map.of("schema", 1, "randomFrequencySeconds", 60,
                "version", "untrusted-version", "activities", activities));
    }

    /** 经与生产一致的原字节构造入口解析夹具，不绕过数值和结构校验。 */
    private IdleActivityRules rules(List<Map<String, Object>> activities) {
        return new IdleActivityRules(new ObjectMapper(), content(activities));
    }

    /** 实际构建投影保留三张源表概率及周期，044不凭空套用角色等级门槛。 */
    @Test
    void actualProjectionLoadsAllThreeVerifiedActivities() {
        var rules = new IdleActivityRules(new ObjectMapper());
        assertEquals(1, rules.rule(16).minimumRoleLevelExclusive().orElseThrow());
        assertEquals(10, rules.rule(34).minimumRoleLevelExclusive().orElseThrow());
        assertTrue(rules.rule(44).minimumRoleLevelExclusive().isEmpty());
        for (int[] sample : List.of(new int[]{16, 1234, 6936}, new int[]{34, 3600, 0},
                new int[]{44, 1234, 6936})) {
            var row = rules.selectedDrop(sample[0], 1);
            assertEquals(sample[1], row.frequencySeconds());
            assertEquals(sample[2], row.gainChance());
        }
    }

    /** 016严格大于1级、034严格大于10级；044仍要求真实合法等级，但不增加活动门槛。 */
    @Test
    void roleEligibilityUsesExclusiveVerifiedThresholds() {
        var rules = new IdleActivityRules(new ObjectMapper());
        assertFalse(rules.roleEligible(16, 1));
        assertTrue(rules.roleEligible(16, 2));
        assertFalse(rules.roleEligible(34, 10));
        assertTrue(rules.roleEligible(34, 11));
        assertTrue(rules.roleEligible(44, 1));
        assertThrows(IllegalArgumentException.class, () -> rules.roleEligible(44, 0));
        assertThrows(IllegalStateException.class, () -> rules.roleEligible(99, 1));
    }

    /** 上海开服日零点为0，次秒为1；第二天零点仍为1，次秒才为2，忠实保留旧ceil边界。 */
    @Test
    void openDaysPreserveShanghaiMidnightExactSecondBoundary() {
        long opened = Instant.parse("2026-11-13T06:00:00Z").getEpochSecond();
        long midnight = Instant.parse("2026-11-12T16:00:00Z").getEpochSecond();
        assertEquals(0, IdleActivityRules.serverOpenDays(opened, midnight));
        assertEquals(1, IdleActivityRules.serverOpenDays(opened, midnight + 1));
        assertEquals(1, IdleActivityRules.serverOpenDays(opened, midnight + 86_400));
        assertEquals(2, IdleActivityRules.serverOpenDays(opened, midnight + 86_401));
    }

    /** UTC日界不能替代上海日界；UTC00点已是上海08点，此时开服日数应为1而不是0。 */
    @Test
    void openDaysUseExplicitShanghaiInsteadOfUtcDateBoundary() {
        long opened = Instant.parse("2026-11-13T06:00:00Z").getEpochSecond();
        long utcMidnight = Instant.parse("2026-11-13T00:00:00Z").getEpochSecond();
        assertEquals(1, IdleActivityRules.serverOpenDays(opened, utcMidnight));
    }

    /** 未来开服沿ceil保留负日数，不强行钳成0或以当前时间初始化；异常Unix秒必须拒绝。 */
    @Test
    void futureOpeningAndInvalidTimesDoNotInventAStartedServer() {
        long opened = Instant.parse("2026-11-15T06:00:00Z").getEpochSecond();
        long previousDayNoon = Instant.parse("2026-11-13T04:00:00Z").getEpochSecond();
        long futureMidnight = Instant.parse("2026-11-14T16:00:00Z").getEpochSecond();
        assertEquals(-1, IdleActivityRules.serverOpenDays(opened, previousDayNoon));
        assertEquals(-2, IdleActivityRules.serverOpenDays(opened, futureMidnight - 172_800));
        assertEquals(0, IdleActivityRules.serverOpenDays(opened, futureMidnight - 1));
        assertThrows(IllegalArgumentException.class, () -> IdleActivityRules.serverOpenDays(-1, 0));
        assertThrows(IllegalArgumentException.class, () -> IdleActivityRules.serverOpenDays(0, -1));
        assertThrows(IllegalArgumentException.class, () -> IdleActivityRules.serverOpenDays(Long.MAX_VALUE, 0));
        assertThrows(IllegalArgumentException.class, () -> IdleActivityRules.serverOpenDays(0, Long.MAX_VALUE));
    }

    /** 旧缓存按idx升序put轮次Map，016及034同轮次均使用最大idx，不能受输入顺序影响。 */
    @Test
    void loopingActivitiesUseLargestIdForTheExactTurns() {
        var activities = activities();
        for (int id : List.of(16, 34)) {
            activities.set(id == 16 ? 0 : 1, activity(id, 20, List.of(
                    row(9, 1, 100, 0, List.of(reward(901701, 9))),
                    row(20, 2, 100, 0, List.of(reward(901701, 20))),
                    row(2, 1, 100, 0, List.of(reward(901701, 2))))));
        }
        var rules = rules(activities);
        for (int id : List.of(16, 34)) {
            assertEquals(9, rules.selectedDrop(id, 1).id());
            assertEquals(20, rules.selectedDrop(id, 2).id());
            assertThrows(IllegalStateException.class, () -> rules.selectedDrop(id, 3));
            assertThrows(IllegalArgumentException.class, () -> rules.selectedDrop(id, 0));
        }
    }

    /** 044沿旧getAll首行，只按idx最小值选择，不套用轮次或输入行顺序。 */
    @Test
    void activity44UsesTheLowestIdAndHasNoTurns() {
        var activities = activities();
        activities.set(2, activity(44, null, List.of(
                row(90, null, 120, 0, List.of(reward(901702, 90))),
                row(3, null, 120, 0, List.of(reward(901702, 3))))));
        var rules = rules(activities);
        assertEquals(3, rules.selectedDrop(44, 0).id());
        assertEquals(3, rules.selectedDrop(44, 99).id());
        assertNull(rules.selectedDrop(44, 1).turns());
    }

    /** 59秒没有随机，119秒只抽一次；固定周期与随机周期分别向下取整。 */
    @Test
    void fixedAndRandomCountsUseIndependentFloorBoundaries() {
        var rules = rules(activities());
        var calls = new AtomicInteger();
        assertTrue(rules.drop(16, 1, 59, bound -> {
            calls.incrementAndGet();
            return bound - 1;
        }).isEmpty());
        assertTrue(rules.drop(16, 1, 119, bound -> {
            calls.incrementAndGet();
            return bound - 1;
        }).isEmpty());
        assertEquals(1, calls.get());
        var result = rules.drop(16, 1, 120, bound -> bound - 1);
        assertEquals(List.of(new CampaignRules.Reward(900001, 2), new CampaignRules.Reward(900001, 3),
                new CampaignRules.Reward(900002, 1)), result);
    }

    /** 百万概率沿旧小于等于比较，0仍抽样且随机值为0可中，不可优化成直接无奖励。 */
    @Test
    void zeroAndExactProbabilityEndpointsStillSampleWithInclusiveComparison() {
        var rules = rules(activities());
        var calls = new AtomicInteger();
        assertEquals(List.of(new CampaignRules.Reward(900502, 1)), rules.drop(34, 1, 60, bound -> {
            assertEquals(1_000_000, bound);
            calls.incrementAndGet();
            return 0;
        }));
        assertEquals(1, calls.get());
        assertTrue(rules.drop(34, 1, 60, bound -> 1).isEmpty());
        assertFalse(rules.drop(16, 1, 60, bound -> 6936).isEmpty());
        assertTrue(rules.drop(16, 1, 60, bound -> 6937).isEmpty());
    }

    /** 固定1次与随机2次相加后统一乘3；重复物品、原始顺序和冻结分项均保留。 */
    @Test
    void combinedCountMultipliesEachOriginalRewardWithoutMerging() {
        var rules = rules(activities());
        var result = rules.drop(16, 1, 120, bound -> 0);
        assertEquals(List.of(new CampaignRules.Reward(900001, 6), new CampaignRules.Reward(900001, 9),
                new CampaignRules.Reward(900002, 3)), result);
        assertThrows(UnsupportedOperationException.class, result::clear);
        assertThrows(UnsupportedOperationException.class, () -> rules.selectedDrop(16, 1).rewards().clear());
    }

    /** 百万是允许的旧概率上界，仍为每个60秒窗口调用随机源，达到18小时不能超抽。 */
    @Test
    void maximumChanceAndDurationRemainWithinTheVerifiedBounds() {
        var activities = activities();
        activities.set(0, activity(16, 0, List.of(row(1, 1, 1, 1_000_000,
                List.of(reward(900001, 1))))));
        var calls = new AtomicInteger();
        assertEquals(List.of(new CampaignRules.Reward(900001, 65_880)),
                rules(activities).drop(16, 1, 64_800, bound -> {
                    calls.incrementAndGet();
                    return bound - 1;
                }));
        assertEquals(1080, calls.get());
    }

    /** 非法时长和未知轮次在抽样前拒绝；0秒合法但不能掩盖适用活动配置缺失。 */
    @Test
    void invalidInputIsRejectedBeforeAnyRandomDraw() {
        var rules = rules(activities());
        var calls = new AtomicInteger();
        java.util.function.IntUnaryOperator random = bound -> calls.incrementAndGet();
        assertThrows(IllegalArgumentException.class, () -> rules.drop(16, 1, -1, random));
        assertThrows(IllegalArgumentException.class, () -> rules.drop(16, 1, 64_801, random));
        assertThrows(IllegalArgumentException.class, () -> rules.drop(16, 1, 60, null));
        assertThrows(IllegalStateException.class, () -> rules.drop(16, 2, 0, random));
        assertThrows(IllegalStateException.class, () -> rules.rule(99));
        assertTrue(rules.drop(16, 1, 0, random).isEmpty());
        assertEquals(0, calls.get());
    }

    /** 随机源不能返回负数或排他上界，否则拒绝，避免错误源改变概率。 */
    @Test
    void invalidRandomValuesCannotBecomeSuccessfulDrops() {
        var rules = rules(activities());
        assertThrows(IllegalArgumentException.class, () -> rules.drop(16, 1, 60, bound -> -1));
        assertThrows(IllegalArgumentException.class, () -> rules.drop(16, 1, 60, bound -> bound));
    }

    /** 奖励先按配置分项，合并次数后倍乘；溢出不截断、不返回局部候选。 */
    @Test
    void rewardMultiplicationOverflowRejectsTheWholeCandidate() {
        var activities = activities();
        activities.set(0, activity(16, 20, List.of(row(1, 1, 60, 0,
                List.of(reward(900001, 1), reward(900002, Long.MAX_VALUE))))));
        var rules = rules(activities);
        assertThrows(ArithmeticException.class, () -> rules.drop(16, 1, 60, bound -> 0));
        assertEquals(Long.MAX_VALUE, rules.selectedDrop(16, 1).rewards().get(1).quantity());
    }

    /** 组合入口只使用已冻结行，新配置即使同活动同轮次的全部数值变化也不能替换输入。 */
    @Test
    void frozenDropIsUsedInsteadOfTheCurrentConfiguration() {
        var frozen = rules(activities()).selectedDrop(16, 1);
        var changed = activities();
        changed.set(0, activity(16, 20, List.of(row(99, 1, 60, 1_000_000,
                List.of(reward(900008, 7))))));
        var current = rules(changed);
        assertNotEquals(frozen, current.selectedDrop(16, 1));

        var result = IdleActivityRules.drop(frozen, 120, bound -> 6937);

        assertEquals(List.of(new CampaignRules.Reward(900001, 2), new CampaignRules.Reward(900001, 3),
                new CampaignRules.Reward(900002, 1)), result);
        assertEquals(List.of(new CampaignRules.Reward(900008, 28)),
                current.drop(16, 1, 120, bound -> 6937));
        assertEquals(2, frozen.id());
        assertEquals(120, frozen.frequencySeconds());
    }

    /** 公开Drop不能绕过解析校验，缺奖励、非法轮次/周期/概率和非正奖励均在构造时拒绝。 */
    @Test
    void directlyConstructedDropsRejectMalformedFields() {
        var valid = List.of(new CampaignRules.Reward(900001, 1));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityRules.Drop(0, 1, valid, 60, 0));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityRules.Drop(1, 0, valid, 60, 0));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityRules.Drop(1, -1, valid, 60, 0));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityRules.Drop(1, 1, valid, 0, 0));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityRules.Drop(1, 1, valid, 60, -1));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityRules.Drop(1, 1, valid, 60, 1_000_001));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityRules.Drop(1, 1, null, 60, 0));
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityRules.Drop(1, 1, List.of(), 60, 0));
        for (var reward : List.of(new CampaignRules.Reward(0, 1), new CampaignRules.Reward(900001, 0),
                new CampaignRules.Reward(900001, -1))) {
            assertThrows(IllegalArgumentException.class,
                    () -> new IdleActivityRules.Drop(1, 1, List.of(reward), 60, 0));
        }
        var withNull = new ArrayList<CampaignRules.Reward>();
        withNull.add(null);
        assertThrows(IllegalArgumentException.class, () -> new IdleActivityRules.Drop(1, 1, withNull, 60, 0));
        assertNull(new IdleActivityRules.Drop(1, null, valid, 60, 1_000_000).turns());
    }

    /** 冻结行入口先拒绝非法参数，不受原列表修改影响，概率0仍抽且结果不可变。 */
    @Test
    void frozenDropEntryValidatesBeforeSamplingAndFreezesCollections() {
        var original = new ArrayList<>(List.of(new CampaignRules.Reward(900001, 1)));
        var frozen = new IdleActivityRules.Drop(1, null, original, 60, 0);
        original.clear();
        var calls = new AtomicInteger();
        java.util.function.IntUnaryOperator random = bound -> {
            assertEquals(1_000_000, bound);
            calls.incrementAndGet();
            return 0;
        };
        assertThrows(IllegalArgumentException.class, () -> IdleActivityRules.drop(null, 60, random));
        assertThrows(IllegalArgumentException.class, () -> IdleActivityRules.drop(frozen, -1, random));
        assertThrows(IllegalArgumentException.class, () -> IdleActivityRules.drop(frozen, 64_801, random));
        assertThrows(IllegalArgumentException.class, () -> IdleActivityRules.drop(frozen, 60, null));
        assertTrue(IdleActivityRules.drop(frozen, 0, random).isEmpty());
        assertEquals(0, calls.get());

        var result = IdleActivityRules.drop(frozen, 60, random);

        assertEquals(1, calls.get());
        assertEquals(List.of(new CampaignRules.Reward(900001, 2)), result);
        assertThrows(UnsupportedOperationException.class, result::clear);
        assertThrows(UnsupportedOperationException.class, () -> frozen.rewards().clear());
    }

    /** 版本来自实际原字节SHA-256，自报version无权替换摘要，字节改变即形成另一版本。 */
    @Test
    void versionHashesTheActualInputBytes() throws Exception {
        var bytes = content(activities());
        var rules = new IdleActivityRules(new ObjectMapper(), bytes);
        assertEquals("idle-activities-v1:" + HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(bytes)), rules.version());
        byte[] changed = (new String(bytes, StandardCharsets.UTF_8) + "\n").getBytes(StandardCharsets.UTF_8);
        assertNotEquals(rules.version(), new IdleActivityRules(new ObjectMapper(), changed).version());
    }

    /** 缺活动、重复活动或掉落idx以及字段缺失都必须拒绝，不补空列表或概率0。 */
    @Test
    void incompleteOrDuplicateProjectionCannotBeUsedAsNoActivity() {
        var missing = activities();
        missing.removeLast();
        assertThrows(IllegalStateException.class, () -> rules(missing));
        var duplicate = activities();
        duplicate.add(duplicate.getFirst());
        assertThrows(IllegalStateException.class, () -> rules(duplicate));
        var duplicateRows = activities();
        var row = row(1, 1, 60, 0, List.of(reward(900001, 1)));
        duplicateRows.set(0, activity(16, 20, List.of(row, row)));
        assertThrows(IllegalStateException.class, () -> rules(duplicateRows));
        for (String field : List.of("id", "turns", "frequencySeconds", "gainChance", "rewards")) {
            var activities = activities();
            var incomplete = row(1, 1, 60, 0, List.of(reward(900001, 1)));
            incomplete.remove(field);
            activities.set(0, activity(16, 20, List.of(incomplete)));
            assertThrows(IllegalStateException.class, () -> rules(activities), field);
        }
    }

    /** 非法周期、概率、奖励及044伪造门槛/轮次均拒绝，不把结构错误当合法零。 */
    @Test
    void malformedValuesAreRejectedAtRuleLoading() {
        var invalidRows = List.of(
                row(0, 1, 60, 0, List.of(reward(900001, 1))),
                row(1, 0, 60, 0, List.of(reward(900001, 1))),
                row(1, 1, 0, 0, List.of(reward(900001, 1))),
                row(1, 1, 60, -1, List.of(reward(900001, 1))),
                row(1, 1, 60, 1_000_001, List.of(reward(900001, 1))),
                row(1, 1, 60, 0, List.of(reward(0, 1))),
                row(1, 1, 60, 0, List.of(reward(900001, 0))),
                row(1, 1, 60, 0, List.of(reward(900001, -1))),
                row(1, 1, 60, 0, List.of()));
        for (var invalid : invalidRows) {
            var activities = activities();
            activities.set(0, activity(16, 20, List.of(invalid)));
            assertThrows(IllegalStateException.class, () -> rules(activities));
        }
        var wrongLevel = activities();
        wrongLevel.set(2, activity(44, 0, List.of(row(1, null, 60, 0, List.of(reward(900001, 1))))));
        assertThrows(IllegalStateException.class, () -> rules(wrongLevel));
        var wrongTurns = activities();
        wrongTurns.set(2, activity(44, null, List.of(row(1, 1, 60, 0, List.of(reward(900001, 1))))));
        assertThrows(IllegalStateException.class, () -> rules(wrongTurns));
    }
}
