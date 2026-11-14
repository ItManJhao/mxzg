/**
 * 月兔精灵纯规则回归：验证真实随机消费顺序、等级边界、非均匀技能权重及持久输入校验。
 * 读取隔离规则或当前生成资源，不启动Spring、不访问数据库，也不开放精灵操作或挂机领取。
 */
package com.funsgamex.mxzg.spirit;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class SpiritRulesTest {
    /** 记录明确的脚本随机序列与每次真实bound，不在测试中运行概率采样。 */
    private static final class ScriptedRandom implements RandomGenerator {
        /** 调用方预先给出的零起点随机值，按调用顺序消费。 */
        private final int[] values;
        /** 已消费位置，仅归当前隔离随机源所有。 */
        private int position;
        /** 保存实际调用边界，用于发现漏掉固定技能数量的一次消费。 */
        private final List<Integer> bounds = new ArrayList<>();

        /** 创建精确序列，外部数组在创建后不能修改本次抽样。 */
        private ScriptedRandom(int... values) {
            this.values = values.clone();
        }

        /** 只允许规则使用已核实的有界整数入口，不悄悄补充其他随机消费。 */
        @Override
        public int nextInt(int bound) {
            bounds.add(bound);
            if (position >= values.length) {
                throw new AssertionError("精灵规则多消费了随机数");
            }
            return values[position++];
        }

        /** 禁止无界抽样，避免规则变动后脚本序列仍假通过。 */
        @Override
        public long nextLong() {
            throw new AssertionError("精灵规则调用了未核实的随机入口");
        }
    }

    /** 构造当前范围的最小隔离投影，两个技能等级各保留两个非均匀候选。 */
    private byte[] content() {
        return """
                {"schema":1,"item":{"itemId":2000002,"rare":2,"skillMaximum":1,
                  "skillCounts":[{"count":1,"weight":10000}],
                  "skillLevels":[{"level":1,"weight":8000},{"level":2,"weight":2000}]},
                 "abilities":[
                  {"id":1,"attributeId":223,"value":1476,"name":"生命","description":"生命+1476"},
                  {"id":2,"attributeId":220,"value":146,"name":"攻击","description":"攻击+146"},
                  {"id":3,"attributeId":224,"value":21,"name":"护甲","description":"护甲+21"},
                  {"id":4,"attributeId":101,"value":5,"name":"速度","description":"速度+5"}],
                 "skills":[
                  {"index":20,"id":150020001,"level":1,"weight":3,"name":"低级神赦","description":"说明2","icon":"skill-icon/150020001"},
                  {"index":10,"id":150010001,"level":1,"weight":1,"name":"低级迅捷","description":"说明1","icon":"skill-icon/150010001"},
                  {"index":30,"id":150010001,"level":2,"weight":1,"name":"中级迅捷","description":"说明3","icon":"skill-icon/150010002"},
                  {"index":40,"id":150020001,"level":2,"weight":5,"name":"中级神赦","description":"说明4","icon":"skill-icon/150020002"}]}
                """.getBytes(StandardCharsets.UTF_8);
    }

    /** 使用真实构建资源核对4次随机、真实141/233权重总数及8000的排他边界。 */
    @Test
    void actualGenerationKeepsFourDrawsAndActualLevelBoundary() {
        var rules = new SpiritRules(new ObjectMapper());
        var low = new ScriptedRandom(0, 9999, 7999, 0);
        var first = rules.create(2000002, low);
        assertEquals(new SpiritRules.Generation(2000002, 1,
                List.of(new SpiritRules.Skill(1, 150010001, 1))), first);
        assertEquals(List.of(4, 10000, 10000, 141), low.bounds);
        var high = new ScriptedRandom(3, 0, 8000, 1);
        var second = rules.create(2000002, high);
        assertEquals(new SpiritRules.Generation(2000002, 4,
                List.of(new SpiritRules.Skill(1, 150020001, 2))), second);
        assertEquals(List.of(4, 10000, 10000, 233), high.bounds);
        assertEquals("生命+1476", rules.ability(1).description());
        assertEquals("低级迅捷", rules.skill(150010001, 1).name());
        rules.validate(first);
        rules.validate(second);
    }

    /** 候选源行乱序时仍按旧idx排区间，权重3不是均匀的第二个半区。 */
    @Test
    void skillWeightIntervalsUseSourceIndexInsteadOfInputOrder() {
        var rules = new SpiritRules(new ObjectMapper(), content());
        var point0 = rules.create(2000002, new ScriptedRandom(0, 0, 0, 0));
        var point1 = rules.create(2000002, new ScriptedRandom(0, 0, 0, 1));
        var point3 = rules.create(2000002, new ScriptedRandom(0, 0, 0, 3));
        assertEquals(150010001, point0.skills().getFirst().skillId());
        assertEquals(150020001, point1.skills().getFirst().skillId());
        assertEquals(150020001, point3.skills().getFirst().skillId());
    }

    /** 坏调用在抽样前拒绝；读取历史实例不会重抽或接受同名邻级技能。 */
    @Test
    void unsupportedItemsAndInvalidStoredFieldsAreRejected() {
        var rules = new SpiritRules(new ObjectMapper(), content());
        var random = new ScriptedRandom();
        assertThrows(IllegalArgumentException.class, () -> rules.create(2000003, random));
        assertTrue(random.bounds.isEmpty());
        assertThrows(IllegalArgumentException.class, () -> rules.create(2000002, null));
        assertThrows(IllegalArgumentException.class, () -> rules.validate(null));
        assertThrows(IllegalArgumentException.class, () -> rules.validate(new SpiritRules.Generation(
                2000003, 1, List.of(new SpiritRules.Skill(1, 150010001, 1)))));
        assertThrows(IllegalArgumentException.class, () -> rules.validate(new SpiritRules.Generation(
                2000002, 5, List.of(new SpiritRules.Skill(1, 150010001, 1)))));
        assertThrows(IllegalArgumentException.class, () -> rules.validate(new SpiritRules.Generation(
                2000002, 1, List.of(new SpiritRules.Skill(2, 150010001, 1)))));
        assertThrows(IllegalArgumentException.class, () -> rules.validate(new SpiritRules.Generation(
                2000002, 1, List.of(new SpiritRules.Skill(1, 150010001, 3)))));
        assertThrows(IllegalArgumentException.class, () -> rules.validate(new SpiritRules.Generation(
                2000002, 1, List.of(new SpiritRules.Skill(1, 150010001, 1),
                        new SpiritRules.Skill(1, 150020001, 1)))));
    }

    /** 构造与加载均冻结结果，调用者不能事后修改共享配置或生成技能。 */
    @Test
    void generationFreezesListAndVersionUsesActualBytes() throws Exception {
        byte[] bytes = content();
        var rules = new SpiritRules(new ObjectMapper(), bytes);
        var skills = new ArrayList<>(List.of(new SpiritRules.Skill(1, 150010001, 1)));
        var generation = new SpiritRules.Generation(2000002, 1, skills);
        skills.clear();
        assertEquals(1, generation.skills().size());
        assertThrows(UnsupportedOperationException.class, () -> generation.skills().clear());
        assertEquals("spirit-rules-v1:" + HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(bytes)), rules.version());
        assertThrows(IllegalArgumentException.class, () -> new SpiritRules.Skill(0, 150010001, 1));
        assertThrows(IllegalArgumentException.class, () -> new SpiritRules.Generation(2000002, 1, List.of()));
    }

    /** 缺权重、溢出、重复及缺显示配置在规则加载阶段拒绝，不能等实际命中才失败。 */
    @Test
    void malformedProjectionIsRejectedBeforeAnyGeneration() {
        String valid = new String(content(), StandardCharsets.UTF_8);
        for (String invalid : List.of(
                valid.replace("\"weight\":8000", "\"weight\":2147483647"),
                valid.replace("\"count\":1", "\"count\":2"),
                valid.replace("\"weight\":3", "\"absent\":3"),
                valid.replace("\"index\":20", "\"index\":10"),
                valid.replace("\"description\":\"说明2\"", "\"description\":\"\""),
                valid.replace("\"level\":2,\"weight\":2000", "\"level\":1,\"weight\":2000"))) {
            assertThrows(IllegalStateException.class, () -> new SpiritRules(new ObjectMapper(),
                    invalid.getBytes(StandardCharsets.UTF_8)));
        }
    }

    /** 随机接口约定被破坏时拒绝生成，不将越界值截断为另一件合法精灵。 */
    @Test
    void outOfRangeRandomValueIsNotClamped() {
        var rules = new SpiritRules(new ObjectMapper(), content());
        assertThrows(IllegalArgumentException.class,
                () -> rules.create(2000002, new ScriptedRandom(4)));
        assertThrows(IllegalArgumentException.class,
                () -> rules.create(2000002, new ScriptedRandom(-1)));
    }
}
