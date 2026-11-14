/**
 * 挂机权威输入规则回归：核对现有VIP时长、资源加成、世界等级门槛和旧表匹配顺序。
 * 直接读取同源构建配置或注入隔离解析结果，不启动Spring、数据库或领取流程。
 * 测试数据不代表角色实际权益，缺失配置必须明确拒绝，不能以零值冒充有效输入。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.IdleBonusUtils;
import com.funsgamex.mxzg.campaign.IdleRewardRules;
import com.funsgamex.mxzg.campaign.IdleRules;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;

class IdleRewardRulesTest {
    /** 通过生产构造入口加载当前同源规则，不替换配置数值或使用历史target数据作断言。 */
    private IdleRewardRules actualRules() {
        var json = new ObjectMapper();
        return new IdleRewardRules(json, new IdleRules(json));
    }

    /** 读取测试运行时由POM实际打包的源表；缺表直接使当前用例失败。 */
    private JsonNode table(ObjectMapper json, String name) {
        try (var input = IdleRewardRulesTest.class.getResourceAsStream("/gameplay/" + name + ".json")) {
            assertNotNull(input, "测试缺少实际打包配置：" + name);
            return json.readTree(input);
        } catch (java.io.IOException error) {
            throw new AssertionError("测试配置无法关闭：" + name, error);
        }
    }

    /**
     * 仅替换世界增益解析结果；流读取顺序对应system、goddessvip、worldlevelgainexp、clergyprivilege。
     * 字符串bonus继续由真实ObjectMapper解析，避免夹具掩盖旧表的JSON文本字段。
     */
    private IdleRewardRules fixture(JsonNode world) {
        var real = new ObjectMapper();
        var json = spy(new ObjectMapper());
        doReturn(table(real, "system"), table(real, "goddessvip"), world, table(real, "clergyprivilege"))
                .when(json).readTree(any(InputStream.class));
        return new IdleRewardRules(json, new IdleRules(real));
    }

    /** 按源表的字符串格式构造一个世界增益条目；不写配置资源。 */
    private Map<String, Object> worldRow(int index, int minimum, int maximum, int basisPoints) {
        var json = new ObjectMapper();
        String bonus = json.writeValueAsString(List.of(Map.of(
                "item_type", 900003, "bonus", basisPoints, "effect", "IDLE_ROLE_EXP")));
        return Map.of("idx", index, "level_down", minimum, "level_up", maximum, "bonus", bonus);
    }

    /** 将隔离行编码成与导出表相同的rows容器，保留输入行顺序供匹配测试使用。 */
    private JsonNode worldTable(List<Map<String, Object>> rows) {
        var json = new ObjectMapper();
        return json.readTree(json.writeValueAsString(Map.of("table", "worldlevelgainexp", "rows", rows)));
    }

    /** VIP0只表示经权威字段确认的零级，基础上限21600秒，不追加任何收益。 */
    @Test
    void vipZeroKeepsOnlyBaseDurationAndNoBonus() {
        var vip = actualRules().vip(0);
        assertEquals(0, vip.level());
        assertEquals(21600, vip.maxSeconds());
        assertTrue(vip.bonuses().isEmpty());
    }

    /** 旧extra_idle_time单位是秒，VIP2多1小时、VIP13多12小时，不能误当小时数再换算。 */
    @Test
    void vipDurationUsesConfiguredExtraSeconds() {
        var rules = actualRules();
        assertEquals(25200, rules.vip(2).maxSeconds());
        assertEquals(64800, rules.vip(13).maxSeconds());
    }

    /** VIP13三资源均为20%，各自转换为2000万分比，资源ID沿旧ItemType。 */
    @Test
    void vipPercentagesResolveToTheThreeAuthoritativeResourceIds() {
        var bonuses = actualRules().vip(13).bonuses();
        assertEquals(3, bonuses.size());
        assertEquals(Map.of(900001, 2000, 900003, 2000, 900101, 2000), bonuses.stream()
                .collect(Collectors.toMap(IdleBonusUtils.BaseBonus::itemId,
                        IdleBonusUtils.BaseBonus::basisPoints)));
    }

    /** 未知正VIP不能按零级或最高级回退，拒绝不完整权益输入。 */
    @Test
    void unknownVipCannotBecomeAnEmptyBonus() {
        assertThrows(IllegalStateException.class, () -> actualRules().vip(99));
    }

    /** 世界等级加成门槛来自system，69级不适用，70级及以上才需要世界快照。 */
    @Test
    void worldRequirementStartsAtConfiguredRoleLevel() {
        var rules = actualRules();
        assertFalse(rules.needsWorld(69));
        assertTrue(rules.needsWorld(70));
        assertTrue(rules.needsWorld(71));
    }

    /** 未到门槛或世界等级不更高时无加成，不按负等级差选表。 */
    @Test
    void worldBonusRequiresThresholdAndPositiveDifference() {
        var rules = actualRules();
        assertTrue(rules.worldBonuses(69, 100).isEmpty());
        assertTrue(rules.worldBonuses(70, 70).isEmpty());
        assertTrue(rules.worldBonuses(70, 69).isEmpty());
    }

    /** 闭区间边界按实际源表处理；超过999差值没有匹配，不能自行扩成200%封顶。 */
    @Test
    void worldRangesUseInclusiveEndpointsWithoutInventedCap() {
        var rules = actualRules();
        for (int[] sample : List.of(new int[]{1, 500}, new int[]{39, 19500},
                new int[]{40, 20000}, new int[]{999, 20000})) {
            var bonuses = rules.worldBonuses(70, 70 + sample[0]);
            assertEquals(1, bonuses.size());
            assertEquals(900003, bonuses.getFirst().itemId());
            assertEquals(sample[1], bonuses.getFirst().basisPoints());
        }
        assertTrue(rules.worldBonuses(70, 1070).isEmpty());
    }

    /** 旧BaseExcelCache按idx排序后取首个命中；重叠条目不能改按下限或输入行顺序优先。 */
    @Test
    void overlappingWorldRangesUseTheLowestConfigurationId() {
        var world = worldTable(List.of(worldRow(20, 1, 999, 1500), worldRow(10, 10, 20, 500)));
        var bonuses = fixture(world).worldBonuses(70, 80);
        assertEquals(1, bonuses.size());
        assertEquals(500, bonuses.getFirst().basisPoints());
    }

    /** 返回的加成列表冻结，规则版本只反映同源配置，不因重复查询而变化。 */
    @Test
    void bonusListsAndVersionStayStable() {
        var rules = actualRules();
        assertThrows(UnsupportedOperationException.class, () -> rules.vip(13).bonuses().clear());
        assertThrows(UnsupportedOperationException.class, () -> rules.worldBonuses(70, 71).clear());
        assertNotNull(rules.version());
        assertFalse(rules.version().isBlank());
        assertEquals(rules.version(), actualRules().version());
    }

    /** 缺少世界加成字段不能当成显式零加成，否则会把配置损坏伪装成无权益。 */
    @Test
    void missingWorldBonusFieldIsRejected() {
        var world = worldTable(List.of(Map.of("idx", 1, "level_down", 1, "level_up", 1)));
        assertThrows(IllegalStateException.class, () -> fixture(world));
    }
}
