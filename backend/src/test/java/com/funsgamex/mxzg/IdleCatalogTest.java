/**
 * 全主线挂机目录回归：生产IdleRules逐行对应原chapterreward，包括20关以后与其他难度。
 * 仅验证配置与纯计算，不放开挑战、不改玩家计时或资产；领取事务仍复用原服务。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.CampaignRules;
import com.funsgamex.mxzg.campaign.IdleRules;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Random;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class IdleCatalogTest {
    /** 直接加载生产投影并逐行核对原基础奖励和随机组，防止只扩数量而漏掉其他难度。 */
    @Test
    void everyOriginalGlobalIndexHasItsOwnIdleRewards() throws Exception {
        var mapper = new ObjectMapper();
        var rules = new IdleRules(mapper);
        try (var input = getClass().getResourceAsStream("/gameplay/chapterreward.json")) {
            assertNotNull(input);
            var rows = mapper.readTree(input).path("rows");
            assertEquals(rows.size(), rules.data().stages().size());
            assertTrue(rows.size() > 20);
            for (var row : rows) {
                var stage = rules.stage(row.path("idx").asInt());
                assertEquals(row.path("drop_group").asInt(), stage.group());
                var base = mapper.readTree(row.path("reward_base").asString());
                assertEquals(base.size(), stage.base().size());
                for (int index = 0; index < base.size(); index++) {
                    assertEquals(new CampaignRules.Reward(base.get(index).path("item_type").asInt(),
                            base.get(index).path("item_num").asLong()), stage.base().get(index));
                }
            }
        }
    }

    /** 跨20关后用21自己的速率结算，不能沿20关封顶或把首通奖励当挂机基础。 */
    @Test
    void stageTwentyOneUsesItsOwnBaseForWholeMinutes() {
        var rules = new IdleRules(new ObjectMapper());
        assertEquals(260, rules.stage(20).base().getFirst().quantity());
        assertEquals(270, rules.stage(21).base().getFirst().quantity());
        var roll = rules.roll(21, 119, 0, Map.of(), new Random(21));
        assertEquals(rules.stage(21).base(), roll.baseRewards());
        assertEquals(119, roll.dropSeconds());
    }

    /** 其他难度和末关的基础量仍按独立全局idx计算，未知关卡不回退为已存在收益。 */
    @Test
    void laterModesAndLastStageRemainDistinctAndUnknownStagesFail() {
        var rules = new IdleRules(new ObjectMapper());
        for (int id : List.of(131, 221, 321, 431, 550, 551, 850)) {
            assertEquals(rules.stage(id).base(),
                    rules.roll(id, 60, 0, Map.of(), new Random(id)).baseRewards());
        }
        assertEquals(3030, rules.stage(850).base().getFirst().quantity());
        assertThrows(NoSuchElementException.class, () -> rules.stage(0));
        assertThrows(NoSuchElementException.class, () -> rules.stage(851));
    }
}
