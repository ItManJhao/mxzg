/** 原主线3001/3002规则回归：验证真实首通奖励、胜负进度和待领奖优先级，不访问数据库。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.campaign.MainChapterRules;
import com.funsgamex.mxzg.campaign.MainChapterRules.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class MainChapterRulesTest {
    /** 每例读取构建时打包的真实配置，避免测试自造门槛和奖励。 */
    private final MainChapterRules rules = new MainChapterRules(new ObjectMapper());

    /** 第一关奖励来自first_reward，不误用每次挂机的200金币和10经验。 */
    @Test void firstRewardsKeepOriginalTypesAndAmounts() {
        var first = rules.stage(1);
        assertEquals(1, first.mode());
        assertEquals(1, first.chapter());
        assertEquals(1, first.mission());
        assertEquals(7, first.firstRewards().size());
        assertTrue(first.firstRewards().contains(new Reward(900001, 4000)));
        assertTrue(first.firstRewards().contains(new Reward(900003, 200)));
        assertTrue(first.firstRewards().contains(new Reward(20204004, 30)));
        assertTrue(first.firstRewards().contains(new Reward(1004001, 1)));
        assertTrue(rules.stage(2).firstRewards().contains(new Reward(900002, 151)));
        assertTrue(rules.stage(3).firstRewards().contains(new Reward(20005000, 1)));
        assertThrows(UnsupportedOperationException.class, () -> first.firstRewards().clear());
    }

    /** 未通关从第一关开始，战力和等级均由服务器在挑战前校验。 */
    @Test void admissionChecksBothServerRequirements() {
        var initial = new Progress(0, false);
        assertEquals(new Decision(Action.CHALLENGE, rules.stage(1)), rules.decide(initial, 1, 1));
        assertThrows(IllegalArgumentException.class, () -> rules.decide(initial, 1, 0));
        assertThrows(IllegalArgumentException.class, () -> rules.decide(initial, 0, 1));
        assertThrows(IllegalArgumentException.class, () -> rules.decide(new Progress(3, false), 300, 99999));
    }

    /** 胜利立即记录已通关；再次挑战只补领奖，不检查下一关门槛也不越关。 */
    @Test void pendingSettlementTakesPriorityOverAnotherBattle() {
        var won = rules.complete(new Progress(0, false), 1, true);
        assertEquals(new Progress(1, true), won);
        assertEquals(new Decision(Action.SETTLE_PENDING, rules.stage(1)), rules.decide(won, 0, 0));
        assertEquals(rules.stage(1).firstRewards(), rules.pendingRewards(won));
        var settled = rules.settled(won);
        assertEquals(new Progress(1, false), settled);
        assertEquals(2, rules.decide(settled, 1, 1).stage().index());
        assertTrue(rules.pendingRewards(settled).isEmpty());
        assertEquals(settled, rules.settled(settled));
    }

    /** 第三关胜利仍可结算，不能因下一关未支持而卡住已赢奖励。 */
    @Test void lastSupportedVictoryCanStillSettle() {
        var won = rules.complete(new Progress(2, false), 3, true);
        assertEquals(Action.SETTLE_PENDING, rules.decide(won, 0, 0).action());
        assertFalse(rules.pendingRewards(won).isEmpty());
        assertThrows(IllegalArgumentException.class, () -> rules.decide(rules.settled(won), 300, 99999));
    }

    /** 失败不推进、不产生奖励，可再次挑战同一关。 */
    @Test void defeatLeavesProgressAndRewardStateUnchanged() {
        var before = new Progress(1, false);
        var after = rules.complete(before, 2, false);
        assertEquals(before, after);
        assertTrue(rules.pendingRewards(after).isEmpty());
        assertEquals(2, rules.decide(after, 1, 1).stage().index());
    }

    /** 旧战报、越关和未领奖时再提交结果必须拒绝，不能纯靠布尔胜利推进。 */
    @Test void rejectsStaleOrImpossibleProgress() {
        assertThrows(IllegalArgumentException.class, () -> new Progress(0, true));
        assertThrows(IllegalArgumentException.class, () -> new Progress(-1, false));
        assertThrows(IllegalArgumentException.class, () -> rules.complete(new Progress(0, false), 2, true));
        assertThrows(IllegalArgumentException.class, () -> rules.complete(new Progress(1, true), 2, true));
        assertThrows(IllegalArgumentException.class, () -> rules.complete(new Progress(1, false), 1, true));
    }
}
