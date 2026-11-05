/** 真实1-1-1配置的完整独立战场验收；不连接玩家库或发放奖励。 */
package com.funsgamex.mxzg;

import java.util.*;
import java.nio.file.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleChapterScenarioTest {
    /** 核对旧kind语义和逐步截断，12000表示120%而非额外加120%。 */
    @Test void initialModifiersFollowOldKindSemantics() {
        assertEquals(67, HeroBattleRoundUtils.initialAttribute(56, 2, 12000));
        assertEquals(142, HeroBattleRoundUtils.initialAttribute(238, 2, 6000));
        assertEquals(99, HeroBattleRoundUtils.initialAttribute(238, 1, 99));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleRoundUtils.initialAttribute(238, 3, 99));
    }

    /** 速度降序且同速保留攻方原始顺序，不按单位ID另排。 */
    @Test void orderingIsStableAtEqualSpeed() {
        assertEquals(List.of(7, 3, 2), HeroBattleRoundUtils.order(List.of(
            new HeroBattleRoundUtils.Unit(3, 45), new HeroBattleRoundUtils.Unit(2, 45),
            new HeroBattleRoundUtils.Unit(7, 60))));
    }

    /** 同时全灭优先判攻方失败；上限回合不是平局，但最后一击获胜仍有效。 */
    @Test void winnerAndRoundLimitMatchLegacyPriority() {
        assertEquals(HeroBattleRoundUtils.Outcome.DEFENDER_WIN, HeroBattleRoundUtils.outcome(false, false, 1));
        assertEquals(HeroBattleRoundUtils.Outcome.ONGOING, HeroBattleRoundUtils.outcome(true, true, 14));
        assertEquals(HeroBattleRoundUtils.Outcome.DEFENDER_WIN, HeroBattleRoundUtils.outcome(true, true, 15));
        assertEquals(HeroBattleRoundUtils.Outcome.ATTACKER_WIN, HeroBattleRoundUtils.outcome(true, false, 15));
    }

    /** 真实成长和怪物修正不混入玩家阵型减伤；我方固定阵型1位置2。 */
    @Test void realInitialStatsAreNotFixtureNumbers() {
        var initial = new HeroBattleChapterScenario(new ObjectMapper()).initial();
        var a = initial.getFirst();
        var d = initial.getLast();
        assertEquals(new HeroBattleAttributeUtils.Opening(238, 238, 56, 24, 45), a.opening());
        assertEquals(new HeroBattleAttributeUtils.Opening(142, 142, 67, 24, 45), d.opening());
        assertEquals(300L, a.attributes().get(291));
        assertFalse(d.attributes().containsKey(291));
        assertEquals(500L, d.attributes().get(150));
    }

    /** 真实关卡从第一回合执行到第三回合持续伤害致死，保存独立报告用于复核。 */
    @Test void completesSelectedRealChapterWithoutPlayerDatabase() throws Exception {
        var mapper = new ObjectMapper();
        var scenario = new HeroBattleChapterScenario(mapper);
        var result = scenario.run(rate -> {
            // 当前阵容命中1、暴击0、格挡0，不借机推定缺失RandomUtils的中间概率边界。
            assertTrue(rate == 0D || rate == 1D, "场景新增随机依赖，需要重新核查");
            return rate == 1D;
        });
        assertEquals(HeroBattleRoundUtils.Outcome.ATTACKER_WIN, result.outcome());
        assertEquals(3, result.rounds());
        assertEquals(56, result.attackerHp());
        assertEquals(0, result.defenderHp());
        assertEquals(List.of(1, 2, 1, 2), result.turns().stream().map(HeroBattleChapterScenario.Turn::sourceId).toList());
        assertTrue(result.turns().stream().allMatch(turn -> turn.skillEnergy() == 0));
        assertEquals(List.of(53L, 62L, 29L, 25L, 53L, 62L, 29L, 25L),
            result.damages().stream().map(HeroBattleHealingExecutor.Damage::incoming).toList());
        HeroBattleReplayUtils.validate(result);
        assertEquals(7, result.frames().size());
        assertEquals(0, result.frames().getLast().sourceId());
        assertEquals(result, scenario.run(rate -> rate == 1D), "重复运行不能串用战斗状态");
        Files.writeString(Path.of("target/chapter-1-1-1-report.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
    }
    /** 删除一个持续伤害帧后，回放必须拒绝，不能只检查最终胜负字段。 */
    @Test void replayRejectsMissingRoundDamage() {
        var report = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        var frames = new ArrayList<>(report.frames());
        frames.remove(3);
        var broken = new HeroBattleChapterScenario.Result(report.outcome(), report.rounds(),
            report.initial(), report.turns(), report.damages(), frames, report.attackerHp(), report.defenderHp());
        assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(broken));
    }
    /** 主动技能表现先于扣血，持续Buff随后安装；到期回合先伤害再移除。 */
    @Test void traceKeepsActualEffectOrder() {
        var result = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        var first = result.frames().get(1).trace();
        assertEquals(List.of("skill.begin", "presentation", "damage", "buff.upsert", "skill.end"),
            first.stream().map(HeroBattleHealingExecutor.Trace::kind).toList());
        assertEquals(101010011, first.getFirst().skill().skillId());
        assertEquals(1011301, first.get(3).buff().spec().id());
        var last = result.frames().getLast().trace();
        assertEquals(List.of("damage", "buff.remove", "damage", "buff.remove"),
            last.stream().map(HeroBattleHealingExecutor.Trace::kind).toList());
        assertEquals("expire", last.get(1).reason());
        assertEquals("death", last.get(3).reason());
        assertEquals(result.damages(), result.frames().stream().flatMap(f -> f.trace().stream())
            .filter(e -> e.kind().equals("damage")).map(HeroBattleHealingExecutor.Trace::damage).toList());
    }
    /** Java二进制往返保留事件顺序和有符号扣血，并输出供客户端解码验证的同一份数据。 */
    @Test void replayProtocolKeepsOrderedEvents() throws Exception {
        var report = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        var message = HeroBattleReplayProtocolUtils.encode(report);
        var bytes = message.toByteArray();
        var decoded = com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay.parseFrom(bytes);
        assertEquals(message, decoded);
        assertEquals(7, decoded.getPhasesCount());
        assertEquals(-53, decoded.getPhases(1).getEvents(2).getActualHpChange());
        assertEquals(56, decoded.getUnits(0).getFinalHp());
        Files.write(Path.of("target/chapter-1-1-1-replay.pb"), bytes);
    }
}
