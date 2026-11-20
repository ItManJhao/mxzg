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

    /** 按连续进度挑战，服务器校验战力、等级和第 550 关的默认上限。 */
    @Test void admissionChecksBothServerRequirements() {
        var initial = new Progress(0, false);
        assertEquals(new Decision(Action.CHALLENGE, rules.stage(1)), rules.decide(initial, 1, 1));
        assertThrows(IllegalArgumentException.class, () -> rules.decide(initial, 1, 0));
        assertThrows(IllegalArgumentException.class, () -> rules.decide(initial, 0, 1));
        assertEquals(4, rules.decide(new Progress(3, false), 300, 99999).stage().index());
        assertEquals(21, rules.decide(new Progress(20, false), 300, 99999).stage().index());
        assertEquals(30, rules.decide(new Progress(29, false), 300, 99999).stage().index());
        assertEquals(40, rules.decide(new Progress(39, false), 300, 99999).stage().index());
        assertEquals(41, rules.decide(new Progress(40, false), 300, 99999).stage().index());
        assertThrows(IllegalArgumentException.class, () -> rules.decide(new Progress(99, false), 30, 99999));
        assertEquals(100, rules.decide(new Progress(99, false), 31, 99999).stage().index());
        assertEquals(101, rules.decide(new Progress(100, false), 31, 99999).stage().index());
        assertThrows(IllegalArgumentException.class, () -> rules.decide(new Progress(109, false), 32, 99999));
        assertEquals(110, rules.decide(new Progress(109, false), 33, 99999).stage().index());
        assertThrows(IllegalArgumentException.class, () -> rules.decide(new Progress(299, false), 96, 99999));
        assertEquals(300, rules.decide(new Progress(299, false), 97, 99999).stage().index());
        assertEquals(301, rules.decide(new Progress(300, false), 97, Long.MAX_VALUE).stage().index());
        assertThrows(IllegalArgumentException.class, () -> rules.decide(new Progress(359, false), 116, Long.MAX_VALUE));
        assertEquals(360, rules.decide(new Progress(359, false), 117, Long.MAX_VALUE).stage().index());
        assertEquals(361, rules.decide(new Progress(360, false), 117, Long.MAX_VALUE).stage().index());
        assertThrows(IllegalArgumentException.class, () -> rules.decide(new Progress(399, false), 130, Long.MAX_VALUE));
        assertEquals(400, rules.decide(new Progress(399, false), 131, Long.MAX_VALUE).stage().index());
        assertEquals(401, rules.decide(new Progress(400, false), 131, Long.MAX_VALUE).stage().index());
        assertThrows(IllegalArgumentException.class, () -> rules.decide(new Progress(439, false), 142, Long.MAX_VALUE));
        assertEquals(440, rules.decide(new Progress(439, false), 143, Long.MAX_VALUE).stage().index());
        assertEquals(441, rules.decide(new Progress(440, false), 143, Long.MAX_VALUE).stage().index());
        assertThrows(IllegalArgumentException.class, () -> rules.decide(new Progress(549, false), 200, Long.MAX_VALUE));
        assertEquals(550, rules.decide(new Progress(549, false), 201, Long.MAX_VALUE).stage().index());
        assertThrows(IllegalArgumentException.class, () -> rules.decide(new Progress(550, false), 300, Long.MAX_VALUE));
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

    /** 第 550 关胜利后仍可结算，结清后拒绝挑战第 551 关。 */
    @Test void lastSupportedVictoryCanStillSettle() {
        var won = rules.complete(new Progress(549, false), 550, true);
        assertEquals(Action.SETTLE_PENDING, rules.decide(won, 0, 0).action());
        assertFalse(rules.pendingRewards(won).isEmpty());
        assertThrows(IllegalArgumentException.class, () -> rules.decide(rules.settled(won), 300, Long.MAX_VALUE));
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

    /** 完整850关按全局idx连续索引；章节与模式切换后小关重置不能覆盖旧记录。 */
    @Test void fullCatalogUsesGlobalIndexAndExplicitLocation() {
        assertEquals(850, rules.catalog().size());
        for (int index = 1; index <= 850; index++) {
            assertEquals(index, rules.catalog().get(index - 1).index());
            assertFalse(rules.enemies(index).isEmpty());
        }
        assertEquals(11, rules.stage(1, 2, 1).index());
        assertEquals(131, rules.stage(2, 1, 1).index());
        assertEquals(1, rules.stage(131).mission());
        assertEquals(850, rules.stage(850).index());
        assertThrows(UnsupportedOperationException.class, () -> rules.catalog().clear());
        assertThrows(UnsupportedOperationException.class, () -> rules.enemies(1).clear());
        assertThrows(IllegalArgumentException.class, () -> rules.stage(851));
    }

    /** 源表后300奖励关复用三维定位；保留旧敌组，但不按note或当前序号猜测修配置。 */
    @Test void duplicateRewardLocationRemainsExplicitlyPending() {
        assertFalse(rules.enemyMappingPending(541));
        assertTrue(rules.enemyMappingPending(551));
        assertTrue(rules.enemyMappingPending(850));
        assertEquals(rules.enemies(541), rules.enemies(551));
        assertThrows(IllegalArgumentException.class, () -> rules.stage(5, 12, 1));
        assertEquals(300, rules.catalog().stream().filter(stage -> rules.enemyMappingPending(stage.index())).count());
    }

    /** 检查默认和显式挑战范围，降低范围仍可结算之前已获胜的战斗。 */
    @Test void challengeLimitIsIndependentAndDoesNotBlockPendingHistory() {
        assertEquals(550, rules.challengeLimit());
        assertEquals(4, new MainChapterRules(new ObjectMapper(), 4).challengeLimit());
        var narrowed = new MainChapterRules(new ObjectMapper(), 3);
        assertThrows(IllegalArgumentException.class, () -> narrowed.decide(new Progress(3, false), 300, Long.MAX_VALUE));
        var pending = new Progress(4, true);
        assertEquals(Action.SETTLE_PENDING, narrowed.decide(pending, 0, 0).action());
        assertEquals(rules.stage(4).firstRewards(), narrowed.pendingRewards(pending));
        assertEquals(new Progress(4, false), narrowed.settled(pending));
        assertThrows(IllegalStateException.class, () -> new MainChapterRules(new ObjectMapper(), 0));
        assertThrows(IllegalStateException.class, () -> new MainChapterRules(new ObjectMapper(), 851));
    }
}
