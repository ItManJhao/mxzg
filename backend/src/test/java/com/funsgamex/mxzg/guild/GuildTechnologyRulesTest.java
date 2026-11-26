/**
 * 验证公会科技的费用表、职业六格属性和跨阶累计规则。
 * 用发行配置执行，避免将测试价格或错误职业映射带入真实升级事务。
 */
package com.funsgamex.mxzg.guild;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.funsgamex.mxzg.guild.GuildTechnologyRules.Cost;
import com.funsgamex.mxzg.guild.GuildTechnologyRules.Progress;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class GuildTechnologyRulesTest {
    /** 与公会升级和英雄计算共用生产规则载入。 */
    private final GuildTechnologyRules rules = new GuildTechnologyRules(new ObjectMapper());

    /** 原六格点满后进入下一阶首格；满级没有可继续扣费的目标。 */
    @Test
    void quotesFirstStepStageTransitionAndMaximum() {
        assertEquals(15, rules.stageGap());
        assertEquals(60, rules.maxStage());
        var first = rules.next(rules.initialProgress());
        assertEquals(new Progress(1, 1), first);
        assertEquals(new Cost(18_000, 30), rules.cost(first));
        var secondStage = rules.next(new Progress(1, 6));
        assertEquals(new Progress(2, 1), secondStage);
        assertEquals(new Cost(24_000, 40), rules.cost(secondStage));
        assertEquals(new Cost(12_792_000, 21_320), rules.cost(new Progress(60, 6)));
        assertNull(rules.next(new Progress(60, 6)));
        assertThrows(IllegalArgumentException.class, () -> rules.next(new Progress(2, 0)));
    }

    /** 四个职业的属性只取各自定义；新一阶未点亮的格子仍保留上一阶加成。 */
    @Test
    void preservesProfessionSpecificNodesAndPreviousStages() {
        var completeStage = new Progress(1, 6);
        var damage = Map.of(102, 30L, 201, 30L, 207, 30L, 222, 60L, 101, 3L, 270, 30L);
        assertEquals(List.of(1, 2, 3, 4), rules.professions());
        assertEquals(damage, rules.attributes(1, completeStage));
        assertEquals(damage, rules.attributes(2, completeStage));
        assertEquals(Map.of(102, 30L, 201, 30L, 212, 30L, 208, 30L, 101, 3L, 291, 30L),
                rules.attributes(3, completeStage));
        assertEquals(Map.of(102, 30L, 201, 30L, 219, 30L, 208, 30L, 101, 3L, 212, 30L),
                rules.attributes(4, completeStage));
        assertEquals(Map.of(102, 60L, 201, 30L, 219, 30L, 208, 30L, 101, 3L, 212, 30L),
                rules.attributes(4, new Progress(2, 1)));
        assertEquals(Map.of(), rules.attributes(1, rules.initialProgress()));
        assertThrows(IllegalArgumentException.class, () -> rules.abilities(5));
    }

    /** 重置退回原投入，按全角色累计次数报价，封顶后的首格报价不回落。 */
    @Test
    void refundsOnlyInvestedStepsAndCapsResetPrice() {
        assertEquals(new Cost(0, 0), rules.refund(rules.initialProgress()));
        assertEquals(new Cost(186_000, 310), rules.refund(new Progress(2, 1)));
        assertEquals(new Cost(684_180_000, 1_067_500), rules.refund(new Progress(60, 6)));
        assertEquals(List.of(500L, 600L, 700L, 800L, 900L, 1000L, 1100L, 1200L, 1300L, 1400L, 1500L),
                IntStream.rangeClosed(0, 10).mapToLong(rules::resetDiamonds).boxed().toList());
        assertEquals(1500, rules.resetDiamonds(Integer.MAX_VALUE));
    }
}
