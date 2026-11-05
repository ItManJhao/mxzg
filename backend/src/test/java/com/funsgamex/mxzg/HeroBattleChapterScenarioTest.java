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
        var broken = new HeroBattleChapterScenario.Result(report.scenario(), report.outcome(), report.rounds(),
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

    /** 保留两份真实初始属性，仅互换攻守身份，验证执行器实际算出败局；不是主线第二关。 */
    @Test void reversedRealInputsProduceIndependentDefeat() throws Exception {
        var mapper = new ObjectMapper();
        var scenario = new HeroBattleChapterScenario(mapper);
        var initial = scenario.initial();
        var result = scenario.runIndependentDuel(List.of(withId(initial.getLast(), 1), withId(initial.getFirst(), 2)),
            rate -> rate == 1D);
        assertEquals(HeroBattleRoundUtils.Outcome.DEFENDER_WIN, result.outcome());
        assertEquals(0, result.attackerHp());
        assertTrue(result.defenderHp() > 0);
        HeroBattleReplayUtils.validate(result);
        assertEquals("audit:duel", result.scenario());
        var wire = HeroBattleReplayProtocolUtils.encode(result);
        assertEquals("audit:duel", wire.getScenario());
        assertEquals("DEFENDER_WIN", wire.getOutcome());
        Files.write(Path.of("target/independent-reversed-duel-replay.pb"), wire.toByteArray());
        Files.writeString(Path.of("target/independent-reversed-duel-report.json"),
            mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
    }

    /** 回合上限边界夹具只验证记录完整性，不冒充真实关卡计算结果。 */
    @Test void roundLimitRequiresAllFifteenCompleteRounds() {
        var initial = new HeroBattleChapterScenario(new ObjectMapper()).initial();
        long a = initial.getFirst().opening().hp(), d = initial.getLast().opening().hp();
        var frames = new ArrayList<HeroBattleChapterScenario.Frame>();
        var turns = new ArrayList<HeroBattleChapterScenario.Turn>();
        for (int round = 1; round <= 15; round++) {
            for (int source = 0; source <= 2; source++) {
                frames.add(new HeroBattleChapterScenario.Frame(round, source, a, d, a, d, List.of(), List.of()));
                if (source != 0) turns.add(new HeroBattleChapterScenario.Turn(round, source, 0, a, d));
            }
        }
        var result = new HeroBattleChapterScenario.Result("audit:round-limit", HeroBattleRoundUtils.Outcome.DEFENDER_WIN,
            15, initial, turns, List.of(), frames, a, d);
        assertDoesNotThrow(() -> HeroBattleReplayUtils.validate(result));
        frames.removeLast();
        var truncated = new HeroBattleChapterScenario.Result(result.scenario(), result.outcome(), 15, initial, turns, List.of(), frames, a, d);
        assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(truncated));
    }

    /** 结局之后追加空阶段也必须拒绝，不能因为没有伤害而放行。 */
    @Test void replayRejectsFramesAfterDeath() {
        var result = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        var frames = new ArrayList<>(result.frames());
        frames.add(new HeroBattleChapterScenario.Frame(result.rounds(), 1, result.attackerHp(), 0,
            result.attackerHp(), 0, List.of(), List.of()));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(withFrames(result, frames)));
    }

    /** 同一回合重复开始或同一单位重复出手，血量不变也不得放行。 */
    @Test void replayRejectsDuplicateRoundStartAndTurn() {
        var result = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        for (int source : List.of(0, 1)) {
            var frames = new ArrayList<>(result.frames());
            var previous = frames.get(source);
            frames.add(source + 1, new HeroBattleChapterScenario.Frame(1, source,
                previous.attackerAfter(), previous.defenderAfter(), previous.attackerAfter(), previous.defenderAfter(),
                List.of(), List.of()));
            assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(withFrames(result, frames)));
        }
    }

    /** 伤害集合与事件轨迹必须一致，否则编码后的客户端回放会丢伤害。 */
    @Test void replayRejectsMissingDamageTrace() {
        var result = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        var frames = new ArrayList<>(result.frames());
        var frame = frames.get(1);
        frames.set(1, new HeroBattleChapterScenario.Frame(frame.round(), frame.sourceId(), frame.attackerBefore(),
            frame.defenderBefore(), frame.attackerAfter(), frame.defenderAfter(), frame.damages(), List.of()));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(withFrames(result, frames)));
    }

    /** 重建测试输入身份，其余配置与计算属性保持不变。 */
    private static HeroBattleChapterScenario.Unit withId(HeroBattleChapterScenario.Unit unit, int id) {
        return new HeroBattleChapterScenario.Unit(id, unit.template(), unit.level(), unit.star(), unit.stage(),
            unit.position(), unit.attributes(), unit.opening(), unit.skills());
    }

    /** 仅替换待检阶段，保留最终值，确保测试能发现伪造的连续性。 */
    private static HeroBattleChapterScenario.Result withFrames(HeroBattleChapterScenario.Result result,
        List<HeroBattleChapterScenario.Frame> frames) {
        return new HeroBattleChapterScenario.Result(result.scenario(), result.outcome(), result.rounds(), result.initial(), result.turns(),
            result.damages(), frames, result.attackerHp(), result.defenderHp());
    }

    /** 真实第二关按配置执行；零概率流血不得产生安装或后续流血伤害。 */
    @Test void realSecondMissionCompletesWithoutInventingBleed() throws Exception {
        var mapper = new ObjectMapper();
        var scenario = new HeroBattleChapterScenario(mapper);
        var result = scenario.runMission(2, rate -> {
            assertTrue(rate == 0D || rate == 1D, "新增随机依赖需要先核对");
            return rate == 1D;
        });
        assertEquals("main:1:1:2", result.scenario());
        assertEquals(HeroBattleRoundUtils.Outcome.ATTACKER_WIN, result.outcome());
        assertEquals(3, result.rounds());
        assertEquals(102, result.attackerHp());
        assertEquals(0, result.defenderHp());
        assertEquals(10505005, result.initial().getLast().template());
        assertEquals(2, result.initial().getLast().level());
        assertEquals(5, result.initial().getLast().star());
        assertTrue(result.frames().stream().flatMap(frame -> frame.trace().stream())
            .anyMatch(trace -> trace.kind().equals("presentation") && trace.configId() == 5051101));
        assertFalse(result.frames().stream().flatMap(frame -> frame.trace().stream()).anyMatch(trace -> trace.configId() == 5051301));
        HeroBattleReplayUtils.validate(result);
        Files.writeString(Path.of("target/chapter-1-1-2-report.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
        Files.write(Path.of("target/chapter-1-1-2-replay.pb"), HeroBattleReplayProtocolUtils.encode(result).toByteArray());
        assertThrows(IllegalArgumentException.class, () -> scenario.initial(3));
    }

    /** 概率非零的真实流血配置继续拒绝，防止把“不安装”错误扩大到完整流血实现。 */
    @Test void positiveBleedProbabilityRemainsUnsupported() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        assertTrue(rules.battleZeroProbabilityBleed(5051301));
        assertFalse(rules.battleZeroProbabilityBleed(5051201));
        assertThrows(IllegalArgumentException.class, () -> rules.battleZeroProbabilityBleed(5051303));
    }

    /** 零概率流血仍消费抗性；判定器非法命中时，根动作伤害和一次性读取一起回滚。 */
    @Test void zeroBleedConsumesResistanceAndRollsBackOnInvalidDecision() {
        var mapper = new ObjectMapper();
        var units = new HeroBattleChapterScenario(mapper).initial(2);
        for (boolean invalidDecision : List.of(false, true)) {
            var states = units.stream().map(unit -> new HeroBattleHealingExecutor.State(
                new HeroBattleEventProcessor.Actor(unit.id(), unit.skills()), unit.id(), unit.position(),
                unit.opening().hp(), unit.opening().maxHp(), unit.opening().attack(), 0, 0, 0)).toList();
            var engine = new HeroBattleHealingExecutor(new HeroSkillPanelRules(mapper), states);
            units.forEach(unit -> engine.bindCombatData(unit.id(), unit.template(), unit.attributes()));
            var elements = new HeroBattleElementRules(mapper);
            engine.beginRound(1, List.of(2, 1), elements, rate -> rate == 1D);
            engine.setOnceAttribute(1, 325, 1234);
            java.util.function.DoublePredicate decision = rate -> rate == 1D
                || (invalidDecision && !engine.onceAttributes(1).containsKey(325));
            if (invalidDecision) {
                assertThrows(IllegalStateException.class, () -> engine.act(2, 1, 0, elements, decision));
                assertEquals(units.getFirst().opening().hp(), engine.state(1).hp());
                assertEquals(1234L, engine.onceAttributes(1).get(325));
                assertTrue(engine.damages().isEmpty());
                assertTrue(engine.trace().isEmpty());
            } else {
                engine.act(2, 1, 0, elements, decision);
                assertFalse(engine.onceAttributes(1).containsKey(325));
                assertTrue(engine.state(1).hp() < units.getFirst().opening().hp());
                assertFalse(engine.trace().stream().anyMatch(trace -> trace.configId() == 5051301));
            }
        }
    }
}
