/**
 * 挂机神职输入规则回归：从真实神职表或隔离解析结果校验等级与已解锁IDLE_AWARD条目。
 * 只读取配置并调用纯计算，不启动Spring、不写角色等级或领取资产；保留旧无特权空值语义。
 * 缺失的适用概率、非法配置和未知等级必须拒绝，不能以空列表冒充有效无权益。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.CampaignRules;
import com.funsgamex.mxzg.campaign.IdleBonusUtils;
import com.funsgamex.mxzg.campaign.IdleRewardRules;
import com.funsgamex.mxzg.campaign.IdleRules;
import java.io.InputStream;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;

class ClergyInputRulesTest {
    /** 构造当前真实规则，不使用手写神职等级或旧target残留作为期望来源。 */
    private IdleRewardRules actualRules() {
        var json = new ObjectMapper();
        return new IdleRewardRules(json, new IdleRules(json));
    }

    /** 读取本次Maven按现有POM打包的源表，缺表直接使当前用例失败。 */
    private JsonNode table(ObjectMapper json, String name) {
        try (var input = ClergyInputRulesTest.class.getResourceAsStream("/gameplay/" + name + ".json")) {
            assertNotNull(input, "测试缺少实际打包配置：" + name);
            return json.readTree(input);
        } catch (java.io.IOException error) {
            throw new AssertionError("测试配置无法关闭：" + name, error);
        }
    }

    /** 仅替换第四次流读取的神职表，其他三表及字符串JSON解析沿用真实实现。 */
    private IdleRewardRules fixture(JsonNode clergy) {
        var real = new ObjectMapper();
        var json = spy(new ObjectMapper());
        doReturn(table(real, "system"), table(real, "goddessvip"),
                table(real, "worldlevelgainexp"), clergy)
                .when(json).readTree(any(InputStream.class));
        return new IdleRewardRules(json, new IdleRules(real));
    }

    /** 取一份可修改的真实神职表，单个用例不改共享文件或其他测试夹具。 */
    private ObjectNode clergyTable() {
        return (ObjectNode) table(new ObjectMapper(), "clergyprivilege");
    }

    /** 按已存在的配置键定位行，测试不得用新建空行掩盖错误等级。 */
    private ObjectNode row(ObjectNode table, int level) {
        for (var value : table.path("rows")) {
            if (value.path("clergy_level").asInt() == level) {
                return (ObjectNode) value;
            }
        }
        throw new AssertionError("测试找不到神职等级：" + level);
    }

    /** 0至5级无挂机条目；6/9级一条，10/11级同时保留6和10的两条50%。 */
    @Test
    void realLevelsUnlockAllMatchingEntries() {
        var rules = actualRules();
        for (int level : List.of(0, 1, 5)) {
            assertTrue(rules.clergy(level).isEmpty());
        }
        var six = new IdleBonusUtils.ClergyBonus("clergy:6", 5000, 10000);
        var ten = new IdleBonusUtils.ClergyBonus("clergy:10", 5000, 10000);
        assertEquals(List.of(six), rules.clergy(6));
        assertEquals(List.of(six), rules.clergy(9));
        assertEquals(List.of(six, ten), rules.clergy(10));
        assertEquals(List.of(six, ten), rules.clergy(11));
    }

    /** 两个真实解锁条目分别抽样、分别ceil，基础单件1得到追加1+1，不合成一次100%。 */
    @Test
    void realUnlockedEntriesCalculateIndependently() {
        var draws = new AtomicInteger();
        var result = IdleBonusUtils.calculate(List.of(new CampaignRules.Reward(900001, 1)),
                List.of(), List.of(), actualRules().clergy(10), bound -> {
                    assertEquals(10000, bound);
                    draws.incrementAndGet();
                    return 9999;
                });
        assertEquals(2, draws.get());
        assertEquals(List.of(1L, 1L), result.clergyAdditions().stream()
                .map(addition -> addition.reward().quantity()).toList());
        assertEquals(List.of(new CampaignRules.Reward(900001, 3)), result.total());
    }

    /** 源行反序时仍按旧配置主键升序返回，保持6级先于10级的随机消费顺序。 */
    @Test
    void inputOrderDoesNotOverrideLevelOrder() {
        var table = clergyTable();
        var original = table.path("rows");
        var reversed = new ObjectMapper().createArrayNode();
        for (int index = original.size() - 1; index >= 0; index--) {
            reversed.add(original.get(index));
        }
        table.set("rows", reversed);
        assertEquals(List.of("clergy:6", "clergy:10"), fixture(table).clergy(11).stream()
                .map(IdleBonusUtils.ClergyBonus::key).toList());
    }

    /** 其他类型可缺少挂机字段，未知非挂机类型也不能使既有挂机输入错误地拒绝启动。 */
    @Test
    void unrelatedPrivilegeTypesDoNotRequireIdleFields() {
        var table = clergyTable();
        row(table, 8).put("unlock_privilege", "{\"type\":\"STALL_SHOP\"}");
        row(table, 11).put("unlock_privilege", "{\"type\":\"PET_DUNGEON\"}");
        assertEquals(2, fixture(table).clergy(11).size());
    }

    /** 旧加载器跳过空白字段；缺失、null、空白、JSON null及空对象均明确表示该行无特权。 */
    @Test
    void noPrivilegeRepresentationsRemainValid() {
        for (String value : new String[]{"", " ", "null", "{}"}) {
            var table = clergyTable();
            row(table, 0).put("unlock_privilege", value);
            assertTrue(fixture(table).clergy(0).isEmpty());
        }
        var missing = clergyTable();
        row(missing, 0).remove("unlock_privilege");
        assertTrue(fixture(missing).clergy(0).isEmpty());
        var nullable = clergyTable();
        row(nullable, 0).putNull("unlock_privilege");
        assertTrue(fixture(nullable).clergy(0).isEmpty());
    }

    /** 坏JSON或非对象不是无特权的合法表示，不能被当成零加成忽略。 */
    @Test
    void malformedPrivilegeCannotMasqueradeAsEmpty() {
        for (String value : List.of("{broken", "[]", "7")) {
            var table = clergyTable();
            row(table, 0).put("unlock_privilege", value);
            assertThrows(RuntimeException.class, () -> fixture(table));
        }
    }

    /** 已识别IDLE_AWARD必须具备合法概率和系数，不将缺失或非法字段当成0。 */
    @Test
    void applicableIdleFieldsMustBeCompleteAndValid() {
        for (String value : List.of(
                "{\"type\":\"IDLE_AWARD\",\"value\":5000}",
                "{\"type\":\"IDLE_AWARD\",\"chance\":10000}",
                "{\"type\":\"IDLE_AWARD\",\"value\":-1,\"chance\":10000}",
                "{\"type\":\"IDLE_AWARD\",\"value\":5000,\"chance\":10001}")) {
            var table = clergyTable();
            row(table, 6).put("unlock_privilege", value);
            assertThrows(IllegalStateException.class, () -> fixture(table));
        }
    }

    /** 不存在的等级与重复配置主键均拒绝，合法无挂机收益与未知等级必须区分。 */
    @Test
    void unknownLevelsAndDuplicateKeysReject() {
        var rules = actualRules();
        assertThrows(IllegalStateException.class, () -> rules.clergy(-1));
        assertThrows(IllegalStateException.class, () -> rules.clergy(12));
        assertThrows(IllegalStateException.class, () -> rules.clergy(999));
        var table = clergyTable();
        row(table, 11).put("clergy_level", 10);
        assertThrows(IllegalStateException.class, () -> fixture(table));
    }

    /** 规则返回的条目不可修改，避免后续装配污染其他角色共享的配置。 */
    @Test
    void unlockedEntriesAreImmutable() {
        var entries = actualRules().clergy(10);
        assertThrows(UnsupportedOperationException.class, () -> entries.clear());
    }
}
