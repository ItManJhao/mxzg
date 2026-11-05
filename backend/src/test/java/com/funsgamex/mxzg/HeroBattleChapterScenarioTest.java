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
        assertEquals(56, result.finalHp().get(1));
        assertEquals(0, result.finalHp().get(2));
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
            report.initial(), report.turns(), report.damages(), frames, report.finalHp());
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
        assertEquals(0, result.finalHp().get(1));
        assertTrue(result.finalHp().get(2) > 0);
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
                frames.add(new HeroBattleChapterScenario.Frame(round, source, Map.of(1, a, 2, d), Map.of(1, a, 2, d), List.of(), List.of()));
                if (source != 0) turns.add(new HeroBattleChapterScenario.Turn(round, source, 0, Map.of(1, a, 2, d)));
            }
        }
        var result = new HeroBattleChapterScenario.Result("audit:round-limit", HeroBattleRoundUtils.Outcome.DEFENDER_WIN,
            15, initial, turns, List.of(), frames, Map.of(1, a, 2, d));
        assertDoesNotThrow(() -> HeroBattleReplayUtils.validate(result));
        frames.removeLast();
        var truncated = new HeroBattleChapterScenario.Result(result.scenario(), result.outcome(), 15, initial, turns, List.of(), frames, Map.of(1, a, 2, d));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(truncated));
    }

    /** 结局之后追加空阶段也必须拒绝，不能因为没有伤害而放行。 */
    @Test void replayRejectsFramesAfterDeath() {
        var result = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        var frames = new ArrayList<>(result.frames());
        frames.add(new HeroBattleChapterScenario.Frame(result.rounds(), 1, result.finalHp(), result.finalHp(), List.of(), List.of()));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(withFrames(result, frames)));
    }

    /** 同一回合重复开始或同一单位重复出手，血量不变也不得放行。 */
    @Test void replayRejectsDuplicateRoundStartAndTurn() {
        var result = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        for (int source : List.of(0, 1)) {
            var frames = new ArrayList<>(result.frames());
            var previous = frames.get(source);
            frames.add(source + 1, new HeroBattleChapterScenario.Frame(1, source,
                previous.after(), previous.after(),
                List.of(), List.of()));
            assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(withFrames(result, frames)));
        }
    }

    /** 伤害集合与事件轨迹必须一致，否则编码后的客户端回放会丢伤害。 */
    @Test void replayRejectsMissingDamageTrace() {
        var result = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        var frames = new ArrayList<>(result.frames());
        var frame = frames.get(1);
        frames.set(1, new HeroBattleChapterScenario.Frame(frame.round(), frame.sourceId(), frame.before(), frame.after(), frame.damages(), List.of()));
        assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(withFrames(result, frames)));
    }

    /** 重建测试输入身份，其余配置与计算属性保持不变。 */
    private static HeroBattleChapterScenario.Unit withId(HeroBattleChapterScenario.Unit unit, int id) {
        return new HeroBattleChapterScenario.Unit(id, id == 1 ? 1 : 2, unit.template(), unit.level(), unit.star(), unit.stage(),
            unit.position(), unit.attributes(), unit.opening(), unit.skills());
    }

    /** 仅替换待检阶段，保留最终值，确保测试能发现伪造的连续性。 */
    private static HeroBattleChapterScenario.Result withFrames(HeroBattleChapterScenario.Result result,
        List<HeroBattleChapterScenario.Frame> frames) {
        return new HeroBattleChapterScenario.Result(result.scenario(), result.outcome(), result.rounds(), result.initial(), result.turns(),
            result.damages(), frames, result.finalHp());
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
        assertEquals(102, result.finalHp().get(1));
        assertEquals(0, result.finalHp().get(2));
        assertEquals(10505005, result.initial().getLast().template());
        assertEquals(2, result.initial().getLast().level());
        assertEquals(5, result.initial().getLast().star());
        assertTrue(result.frames().stream().flatMap(frame -> frame.trace().stream())
            .anyMatch(trace -> trace.kind().equals("presentation") && trace.configId() == 5051101));
        assertFalse(result.frames().stream().flatMap(frame -> frame.trace().stream()).anyMatch(trace -> trace.configId() == 5051301));
        HeroBattleReplayUtils.validate(result);
        Files.writeString(Path.of("target/chapter-1-1-2-report.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
        Files.write(Path.of("target/chapter-1-1-2-replay.pb"), HeroBattleReplayProtocolUtils.encode(result).toByteArray());
        assertThrows(IllegalArgumentException.class, () -> scenario.initial(4));
    }

    /** 第3关真实双敌方保持配置站位，分别生成眩晕命中/未命中整场夹具，不改玩家资产。 */
    @Test
    void thirdChapterRunsBothControlBranches() throws Exception {
        var mapper = new ObjectMapper();
        var scenario = new HeroBattleChapterScenario(mapper);
        var initial = scenario.initial(3);
        assertEquals(List.of(1, 2, 2), initial.stream().map(HeroBattleChapterScenario.Unit::faction).toList());
        assertEquals(List.of(10101001, 10101001, 10104004), initial.stream().map(HeroBattleChapterScenario.Unit::template).toList());
        assertEquals(List.of(2, 2, 3), initial.stream().map(HeroBattleChapterScenario.Unit::position).toList());
        assertEquals(List.of(1, 2, 2), initial.stream().map(HeroBattleChapterScenario.Unit::level).toList());
        // 旧元素光环idx=1：两个元素1单位使守方全队增加102/201各300，攻方单英雄不增加。
        assertEquals(0L, initial.get(0).attributes().getOrDefault(102, 0L));
        for (var enemy : initial.subList(1, 3)) {
            assertEquals(300L, enemy.attributes().get(102));
            assertEquals(300L, enemy.attributes().get(201));
        }
        assertEquals(List.of(238L, 182L, 302L), initial.stream().map(unit -> unit.opening().hp()).toList());
        assertEquals(List.of(56L, 72L, 93L), initial.stream().map(unit -> unit.opening().attack()).toList());
        for (boolean controlHit : List.of(false, true)) {
            var result = scenario.runMission(3, rate -> rate == 1D || (controlHit && Math.abs(rate - .35D) < 1e-12));
            assertEquals("main:1:1:3", result.scenario());
            assertEquals(HeroBattleRoundUtils.Outcome.DEFENDER_WIN, result.outcome());
            assertEquals(2, result.rounds());
            assertEquals(Map.of(1, 0L, 2, controlHit ? 182L : 104L, 3, 302L), result.finalHp());
            assertEquals(controlHit, result.frames().stream().anyMatch(frame -> frame.round() == 1
                && frame.sourceId() == 1 && frame.trace().isEmpty()));
            assertEquals(Set.of(1, 2, 3), result.finalHp().keySet());
            HeroBattleReplayUtils.validate(result);
            var controls = result.frames().stream().flatMap(frame -> frame.trace().stream())
                .filter(trace -> trace.kind().equals("buff.upsert") && trace.configId() == 1041301).toList();
            assertEquals(controlHit, !controls.isEmpty());
            String name = controlHit ? "chapter-1-1-3-control" : "chapter-1-1-3";
            Files.writeString(Path.of("target/" + name + "-report.json"),
                mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
            Files.write(Path.of("target/" + name + "-replay.pb"), HeroBattleReplayProtocolUtils.encode(result).toByteArray());
        }
    }

    /** 不能把第一关双单位结果改名后冒充第三关真实战报。 */
    @Test
    void thirdChapterRejectsRelabeledDuel() {
        var report = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        var forged = new HeroBattleChapterScenario.Result("main:1:1:3", report.outcome(), report.rounds(),
            report.initial(), report.turns(), report.damages(), report.frames(), report.finalHp());
        assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(forged));
    }

    /** 真实配置的两名我方同时受控，保留独立来源与每个目标的安装/移除，不伪造战报事件。 */
    @Test
    void independentControlTeamProducesMultiTargetEffects() throws Exception {
        var mapper = new ObjectMapper();
        var report = new HeroBattleChapterScenario(mapper).runIndependentControlTeam(
            rate -> rate == 1D || Math.abs(rate - .35D) < 1e-12);
        assertEquals("audit:control-teams", report.scenario());
        assertEquals(4, report.initial().size());
        var first = report.frames().stream().filter(frame -> frame.round() == 1 && frame.sourceId() == 3)
            .findFirst().orElseThrow();
        assertEquals(Set.of(1, 4), first.trace().stream()
            .filter(trace -> trace.kind().equals("presentation") && trace.configId() == 1041101)
            .map(HeroBattleHealingExecutor.Trace::targetId).collect(java.util.stream.Collectors.toSet()));
        assertEquals(2, first.trace().stream()
            .filter(trace -> trace.kind().equals("buff.upsert") && trace.configId() == 1041301).count());
        HeroBattleReplayUtils.validate(report);
        Files.writeString(Path.of("target/independent-control-teams-report.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report));
        Files.write(Path.of("target/independent-control-teams-replay.pb"), HeroBattleReplayProtocolUtils.encode(report).toByteArray());
    }

    /** 概率非零的真实流血配置继续拒绝，防止把“不安装”错误扩大到完整流血实现。 */
    @Test void positiveBleedProbabilityRemainsUnsupported() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        assertTrue(rules.battleZeroProbabilityBleed(5051301));
        assertFalse(rules.battleZeroProbabilityBleed(5051201));
        assertThrows(IllegalArgumentException.class, () -> rules.battleZeroProbabilityBleed(5051303));
    }

    /** 使用真实第1关双方属性各两名，独立来源标识，不冒充有眩晕缺口的第3关。 */
    @Test
    void fourUnitsContinueAfterFirstEnemyDeathAndKeepSnapshots() throws Exception {
        var mapper = new ObjectMapper();
        var scenario = new HeroBattleChapterScenario(mapper);
        var result = scenario.runIndependentTeams(teams(scenario), rate -> rate == 1D);
        assertEquals("audit:teams", result.scenario());
        assertEquals(Set.of(10, 11, 20, 21), result.finalHp().keySet());
        assertEquals(List.of(10, 11, 20, 21), result.turns().stream().filter(turn -> turn.round() == 1)
            .map(HeroBattleChapterScenario.Turn::sourceId).toList());
        assertTrue(result.frames().stream().anyMatch(frame -> frame.after().get(20) == 0 && frame.after().get(21) > 0));
        for (var frame : result.frames()) {
            assertEquals(result.finalHp().keySet(), frame.before().keySet());
            assertEquals(result.finalHp().keySet(), frame.after().keySet());
            if (frame.sourceId() != 0) assertTrue(frame.before().get(frame.sourceId()) > 0);
            assertThrows(UnsupportedOperationException.class, () -> frame.after().put(999, 0L));
        }
        HeroBattleReplayUtils.validate(result);
        var wire = HeroBattleReplayProtocolUtils.encode(result);
        assertEquals(4, wire.getUnitsCount());
        assertEquals(List.of(1, 1, 2, 2), wire.getUnitsList().stream().map(unit -> unit.getFaction()).toList());
        Files.write(Path.of("target/independent-teams-replay.pb"), wire.toByteArray());
        Files.writeString(Path.of("target/independent-teams-report.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
    }

    /** 胜负依据双方所有单位：单人死亡不结束，同时全灭攻方败，上限守方胜。 */
    @Test
    void teamOutcomeChecksAllMembersAndExactSnapshotIdentity() {
        var units = teams(new HeroBattleChapterScenario(new ObjectMapper()));
        assertEquals(HeroBattleRoundUtils.Outcome.ONGOING,
            HeroBattleChapterScenario.outcome(units, Map.of(10, 1L, 11, 0L, 20, 0L, 21, 1L), 1));
        assertEquals(HeroBattleRoundUtils.Outcome.ATTACKER_WIN,
            HeroBattleChapterScenario.outcome(units, Map.of(10, 1L, 11, 0L, 20, 0L, 21, 0L), 15));
        assertEquals(HeroBattleRoundUtils.Outcome.DEFENDER_WIN,
            HeroBattleChapterScenario.outcome(units, Map.of(10, 0L, 11, 0L, 20, 0L, 21, 0L), 1));
        assertEquals(HeroBattleRoundUtils.Outcome.DEFENDER_WIN,
            HeroBattleChapterScenario.outcome(units, Map.of(10, 1L, 11, 0L, 20, 0L, 21, 1L), 15));
        assertThrows(IllegalArgumentException.class,
            () -> HeroBattleChapterScenario.outcome(units, Map.of(10, 1L, 11, 1L, 20, 1L), 1));
    }

    /** 生命连续也不能容忍换出手者，少一个单位的阶段快照必须拒绝。 */
    @Test
    void multiReplayRejectsWrongActorAndMissingUnit() {
        var scenario = new HeroBattleChapterScenario(new ObjectMapper());
        var result = scenario.runIndependentTeams(teams(scenario), rate -> rate == 1D);
        var original = result.frames().get(1);
        for (boolean wrongActor : List.of(false, true)) {
            var before = new HashMap<>(original.before());
            if (!wrongActor) before.remove(21);
            var frames = new ArrayList<>(result.frames());
            frames.set(1, new HeroBattleChapterScenario.Frame(original.round(), wrongActor ? 11 : original.sourceId(),
                before, original.after(), original.damages(), original.trace()));
            assertThrows(IllegalArgumentException.class, () -> HeroBattleReplayUtils.validate(withFrames(result, frames)));
        }
    }

    /** 重复模板可分属多个实例，重复身份、同侧站位冲突和缺失阵营不得进入战场。 */
    @Test
    void teamRosterRejectsAmbiguousIdentity() {
        var scenario = new HeroBattleChapterScenario(new ObjectMapper());
        var units = teams(scenario);
        assertThrows(IllegalArgumentException.class, () -> scenario.runIndependentTeams(List.of(units.get(0), units.get(0), units.get(2)), rate -> true));
        assertThrows(IllegalArgumentException.class, () -> scenario.runIndependentTeams(units.stream().filter(unit -> unit.faction() == 1).toList(), rate -> true));
        var overlap = new ArrayList<>(units);
        overlap.set(1, teamUnit(units.get(1), 11, 1, 2));
        assertThrows(IllegalArgumentException.class, () -> scenario.runIndependentTeams(overlap, rate -> true));
    }

    /** 每侧两名真实配置属性英雄，审计站位让两名攻方先选同一敌人；打乱阵营输入验证稳定排序。 */
    private static List<HeroBattleChapterScenario.Unit> teams(HeroBattleChapterScenario scenario) {
        var initial = scenario.initial();
        return List.of(teamUnit(initial.getLast(), 20, 2, 2), teamUnit(initial.getFirst(), 10, 1, 2),
            teamUnit(initial.getLast(), 21, 2, 3), teamUnit(initial.getFirst(), 11, 1, 1));
    }

    /** 仅指定审计单位身份、阵营和站位，属性保持真实配置结果。 */
    private static HeroBattleChapterScenario.Unit teamUnit(HeroBattleChapterScenario.Unit unit, int id, int faction, int position) {
        return new HeroBattleChapterScenario.Unit(id, faction, unit.template(), unit.level(), unit.star(), unit.stage(),
            position, unit.attributes(), unit.opening(), unit.skills());
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
    /** 真实服务端冰冻安装与到期生成演出夹具，来源显式标为audit。 */
    @Test void independentFrozenReplay() throws Exception {
        var mapper = new ObjectMapper();
        var report = new HeroBattleChapterScenario(mapper).runIndependentFrozen(rate -> rate == 1D);
        HeroBattleReplayUtils.validate(report);
        assertTrue(report.frames().stream().flatMap(f -> f.trace().stream())
            .anyMatch(t -> t.kind().equals("buff.upsert") && t.configId() == 2234801));
        assertTrue(report.frames().stream().flatMap(f -> f.trace().stream())
            .anyMatch(t -> t.kind().equals("buff.remove") && t.configId() == 2234801));
        Files.write(Path.of("target/independent-frozen-replay.pb"), HeroBattleReplayProtocolUtils.encode(report).toByteArray());
    }

    /** 真实奈奈子完整五技能开场、施法与到期冰冻生成独立战报；不连接数据库。 */
    @Test void completeNanakoReplay() throws Exception {
        var mapper = new ObjectMapper();
        var report = new HeroBattleChapterScenario(mapper).runIndependentNanako(rate -> rate >= 0.5);
        assertEquals(5, report.initial().getFirst().skills().size());
        Files.writeString(Path.of("target/independent-nanako-report.json"),
            mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report));
        Files.write(Path.of("target/independent-nanako-replay.pb"), HeroBattleReplayProtocolUtils.encode(report).toByteArray());
        var trace = report.frames().stream().flatMap(v -> v.trace().stream()).toList();
        assertTrue(trace.stream().anyMatch(v -> v.configId() == 2231303));
        assertTrue(trace.stream().anyMatch(v -> v.configId() == 2233202));
        assertTrue(trace.stream().anyMatch(v -> v.configId() == 2234802));
    }

    /** 固定正概率命中覆盖暴击追加；与到期冰冻夹具分开，避免提前结束导致误称覆盖全路径。 */
    @Test void completeNanakoCriticalReplay() throws Exception {
        var mapper = new ObjectMapper();
        var report = new HeroBattleChapterScenario(mapper).runIndependentNanako(rate -> rate > 0);
        var firstAttack = report.frames().stream().filter(frame -> frame.sourceId() == 1).findFirst().orElseThrow();
        var skillStarts = firstAttack.trace().stream().filter(event -> event.kind().equals("skill.begin"))
            .map(event -> event.configId()).toList();
        assertEquals(List.of(102050231, 102050230), skillStarts);
        var wire = HeroBattleReplayProtocolUtils.encode(report);
        Files.write(Path.of("target/independent-nanako-critical-replay.pb"), wire.toByteArray());
        Files.writeString(Path.of("target/independent-nanako-critical-report.json"),
            mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report));
    }

    /** 五星/六星由旧星级表选择真实一级/二级技能，零概率追加不能被固定判定误触发。 */
    @Test void lowerStarNanakoReplays() throws Exception {
        var mapper = new ObjectMapper();
        var scenario = new HeroBattleChapterScenario(mapper);
        for (int star : List.of(5, 6)) {
            int level = star - 4;
            var report = scenario.runIndependentNanako(star, rate -> rate >= 0.5);
            var unit = report.initial().getFirst();
            assertEquals(star, unit.star());
            assertEquals(5, unit.skills().size());
            assertTrue(unit.skills().stream().allMatch(skill -> skill.level() ==
                (skill.skillId() == 102050230 ? 0 : level)));
            var trace = report.frames().stream().flatMap(frame -> frame.trace().stream()).toList();
            assertTrue(trace.stream().anyMatch(event -> event.configId() == 2231300 + level));
            assertTrue(trace.stream().anyMatch(event -> event.configId() == 2233200 + level));
            assertTrue(trace.stream().anyMatch(event -> event.configId() == 2234800 + level));
            var critical = scenario.runIndependentNanako(star, rate -> rate > 0);
            var first = critical.frames().stream().filter(frame -> frame.sourceId() == 1).findFirst().orElseThrow();
            assertEquals(List.of(102050231), first.trace().stream()
                .filter(event -> event.kind().equals("skill.begin")).map(event -> event.configId()).toList());
            String prefix = "target/independent-nanako-star-" + star;
            Files.write(Path.of(prefix + "-replay.pb"), HeroBattleReplayProtocolUtils.encode(report).toByteArray());
            Files.writeString(Path.of(prefix + "-report.json"),
                mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report));
        }
        assertThrows(IllegalArgumentException.class, () -> scenario.runIndependentNanako(4, rate -> true));
        assertThrows(IllegalArgumentException.class, () -> scenario.runIndependentNanako(8, rate -> true));
    }

}
