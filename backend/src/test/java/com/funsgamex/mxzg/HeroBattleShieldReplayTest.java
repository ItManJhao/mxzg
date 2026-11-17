/**
 * 护盾耗尽战报专项：使用真实治疗盾、普通技能和伤害执行器生成独立内存战报。
 * 只验证既有扣血、移除顺序和统计，并导出供客户端互通的 Protobuf，不访问玩家库或发奖。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleAppearanceRules;
import com.funsgamex.mxzg.hero.HeroBattleAttributeUtils;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario;
import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Invocation;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Damage;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Trace;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleRoundUtils;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import com.funsgamex.mxzg.protocol.GameProtocol;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class HeroBattleShieldReplayTest {
    /** 本批只读配置解析器，各测试仍创建独立引擎和 Buff 实例。 */
    private final ObjectMapper mapper = new ObjectMapper();

    /** 同源技能规则提供真实普通技能及治疗盾动作，不伪造伤害或 Buff 记录。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(mapper);

    /** 同源元素规则；本场同元素模板不额外引入克制倍率。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(mapper);

    /** 存活耗尽不当成死亡；原盾覆盖保留实例，耗尽后重施新建实例，统计仍沿既有数值口径。 */
    @Test
    void survivingDepletionAndReapplicationKeepOrderedReplay() throws Exception {
        var report = battle(1500, true, false);
        var attacks = report.damages().stream().filter(hit -> hit.sourceId() == 2).toList();
        assertEquals(List.of(1000L, 1000L), attacks.stream().map(Damage::incoming).toList());
        assertEquals(List.of(100L, 100L), attacks.stream().map(Damage::absorbed).toList());
        assertEquals(List.of(-900L, -900L), attacks.stream().map(Damage::reported).toList());
        assertEquals(List.of(-1000L, -500L), attacks.stream().map(Damage::actual).toList());
        assertFalse(attacks.getFirst().dead());
        assertTrue(attacks.getLast().dead());

        var upserts = traces(report, "buff.upsert").stream()
            .filter(trace -> trace.configId() == 10011201).toList();
        assertEquals(List.of(1L, 1L, 3L), upserts.stream().map(trace -> trace.buff().instanceId()).toList());
        assertEquals(List.of(3, 3, 4), upserts.stream().map(trace -> trace.buff().expiresAt()).toList());
        var removals = traces(report, "buff.remove");
        assertEquals(List.of("shield-depleted", "shield-depleted"), removals.stream().map(Trace::reason).toList());
        assertEquals(List.of(1L, 3L), removals.stream().map(trace -> trace.buff().instanceId()).toList());
        assertTrue(removals.stream().allMatch(trace -> trace.targetId() == 10 && trace.buff().value() == 100),
            "耗尽移除沿用吸收前的真实Entry，不伪造零值实例");
        assertRemovalBeforeHit(report.frames().get(1).trace(), 10, false);
        assertRemovalBeforeHit(report.frames().getLast().trace(), 10, true);

        var wire = export(report, "survival");
        assertEquals(2, wire.getRounds());
        assertEquals(5, wire.getPhasesCount());
        assertUnit(wire, 2, 1000, 1300, 100, 1000);
        assertUnit(wire, 10, 0, 100, 1500, 0);
    }

    /** 当击耗尽致死时先移除盾，再记扣血，最后只清理尚存的其他实例，不重复移除同一盾。 */
    @Test
    void lethalDepletionPrecedesDamageAndIndependentDeathCleanup() throws Exception {
        var report = battle(400, false, true);
        var hit = report.damages().getFirst();
        assertEquals(1000, hit.incoming());
        assertEquals(100, hit.absorbed());
        assertEquals(-900, hit.reported());
        assertEquals(-400, hit.actual());
        assertTrue(hit.dead());
        var action = report.frames().getLast().trace();
        assertEquals(List.of("skill.begin", "presentation", "buff.remove", "damage", "buff.remove", "skill.end"),
            action.stream().map(Trace::kind).toList());
        assertEquals(List.of("shield-depleted", "death"), traces(report, "buff.remove").stream().map(Trace::reason).toList());
        assertEquals(List.of(1L, 2L), traces(report, "buff.remove").stream().map(trace -> trace.buff().instanceId()).toList());
        assertEquals(10011201, action.get(2).configId());
        assertEquals(19004303, action.get(4).configId());
        assertRemovalBeforeHit(action, 10, true);

        var wire = export(report, "death");
        assertEquals(1, wire.getRounds());
        assertEquals(2, wire.getPhasesCount());
        assertUnit(wire, 2, 1000, 300, 0, 500);
        assertUnit(wire, 10, 0, 0, 400, 0);
        var events = wire.getPhases(1).getEventsList();
        assertEquals("shield-depleted", events.get(2).getRemovalReason());
        assertEquals("death", events.get(4).getRemovalReason());
        assertEquals(100, events.get(2).getBuffValue());
    }

    /** 同一真实多目标动作逐目标耗尽，各实例独立移除；存活目标不能被另一个目标死亡一并清理。 */
    @Test
    void multiTargetActionKeepsShieldInstancesAndStatisticsSeparate() {
        var units = List.of(unit(2, 1, 2, 10101001, 1, 1000, 1000, 100),
            unit(10, 2, 2, 10101001, 2, 1000, 100, 50),
            unit(11, 2, 3, 10104004, 2, 400, 100, 40));
        var engine = engine(units);
        engine.beginRound(1, List.of(2, 10, 11), elements, rate -> rate == 1D);
        shield(engine, 10);
        shield(engine, 11);
        int traceStart = engine.trace().size();
        engine.ordinaryDamage(1011401, 2, List.of(10, 11), 1, false, 0, elements, rate -> rate == 1D);

        var hits = engine.damages();
        assertEquals(List.of(480L, 480L), hits.stream().map(Damage::incoming).toList());
        assertEquals(List.of(100L, 100L), hits.stream().map(Damage::absorbed).toList());
        assertEquals(List.of(-380L, -380L), hits.stream().map(Damage::reported).toList());
        assertEquals(List.of(-480L, -400L), hits.stream().map(Damage::actual).toList());
        assertEquals(520, engine.state(10).hp());
        assertFalse(engine.state(10).actor().isDead());
        assertTrue(engine.state(11).actor().isDead());
        var action = engine.trace().subList(traceStart, engine.trace().size());
        assertEquals(List.of("buff.remove", "damage", "buff.remove", "damage"), action.stream().map(Trace::kind).toList());
        assertEquals(List.of(10, 10, 11, 11), action.stream().map(Trace::targetId).toList());
        assertEquals(List.of(1L, 2L), engine.removals().stream().map(removal -> removal.entry().instanceId()).toList());
        assertEquals(680, HeroBattleReplayProtocolUtils.totalDamage(hits, 2));
    }

    /** 按真实回合顺序执行只含普通技能的独立场景，准备动作明确属于边界夹具而非玩家技能资格。 */
    private HeroBattleChapterScenario.Result battle(long targetHp, boolean reapply, boolean deathStatus) {
        var units = List.of(unit(2, 1, 2, 10101001, 1, 1000, 1000, 100),
            unit(10, 2, 2, 10101001, 1, targetHp, 100, 50));
        var engine = engine(units);
        var frames = new ArrayList<HeroBattleChapterScenario.Frame>();
        var turns = new ArrayList<HeroBattleChapterScenario.Turn>();
        int completed = 0;
        for (int round = 1; round <= 2; round++) {
            int current = round;
            frame(engine, units, frames, round, 0, () -> {
                engine.beginRound(current, List.of(2, 10), elements, rate -> rate == 1D);
                if (current == 1 || reapply) {
                    shield(engine, 10);
                    if (current == 1 && reapply) {
                        engine.art(new Invocation(1, 10011201, 2, 10));
                    }
                }
                if (deathStatus) {
                    engine.installCounterCrit(19004303, 10, 10);
                }
            });
            for (int source : List.of(2, 10)) {
                if (engine.state(source).hp() == 0) {
                    continue;
                }
                int target = source == 2 ? 10 : 2;
                frame(engine, units, frames, round, source,
                    () -> engine.attack(source, target, elements, rate -> rate == 1D));
                turns.add(new HeroBattleChapterScenario.Turn(round, source,
                    HeroBattleRoundUtils.NORMAL_SKILL_ENERGY, snapshot(engine, units)));
                if (HeroBattleChapterScenario.outcome(units, snapshot(engine, units), 0)
                    != HeroBattleRoundUtils.Outcome.ONGOING) {
                    break;
                }
            }
            completed = round;
            if (HeroBattleChapterScenario.outcome(units, snapshot(engine, units), 0)
                != HeroBattleRoundUtils.Outcome.ONGOING) {
                break;
            }
        }
        return new HeroBattleChapterScenario.Result("audit:lineup:1",
            HeroBattleChapterScenario.outcome(units, snapshot(engine, units), completed), completed,
            units, turns, engine.damages(), frames, snapshot(engine, units), engine.recoveries());
    }

    /** 创建真实模板和普通技能，属性值显式作为护盾/过量伤害边界夹具，不冒充真实成长配置。 */
    private HeroBattleChapterScenario.Unit unit(int id, int faction, int position, int template,
                                                int level, long hp, long attack, long speed) {
        var attributes = Map.of(220, attack, 223, hp, 101, speed, 150, 500L);
        var ordinary = rules.battleSchedule(rules.select(template, 1, 0)).stream()
            .filter(skill -> skill.activeType() == 2).toList();
        assertEquals(1, ordinary.size());
        return new HeroBattleChapterScenario.Unit(id, faction, template, level, 1, 0, position,
            attributes, HeroBattleAttributeUtils.opening(attributes), ordinary,
            new HeroBattleAppearanceRules(mapper).icon(template, 1, 0, 0));
    }

    /** 每次从名册创建独立临时引擎，保留真实模板对应的伤害元素和属性。 */
    private HeroBattleHealingExecutor engine(List<HeroBattleChapterScenario.Unit> units) {
        var states = units.stream().map(unit -> new State(new Actor(unit.id(), unit.skills()),
            unit.faction(), unit.position(), unit.opening().hp(), unit.opening().maxHp(),
            unit.opening().attack(), 0, 0, 0)).toList();
        var engine = new HeroBattleHealingExecutor(rules, states);
        units.forEach(unit -> engine.bindCombatData(unit.id(), unit.template(), unit.attributes()));
        return engine;
    }

    /** 真实1063201先记录基础治疗500，再由10011201生成其20%的治疗盾100；满血治疗仍保留报告量。 */
    private void shield(HeroBattleHealingExecutor engine, int target) {
        engine.art(new Invocation(1, 1063201, 2, 2));
        engine.art(new Invocation(1, 10011201, 2, target));
    }

    /** 截取成功动作新增的真实事件与伤害；保持前后全名册生命连续。 */
    private void frame(HeroBattleHealingExecutor engine, List<HeroBattleChapterScenario.Unit> units,
                       List<HeroBattleChapterScenario.Frame> frames, int round, int source, Runnable action) {
        var before = snapshot(engine, units);
        int damageStart = engine.damages().size();
        int traceStart = engine.trace().size();
        action.run();
        frames.add(new HeroBattleChapterScenario.Frame(round, source, before, snapshot(engine, units),
            engine.damages().subList(damageStart, engine.damages().size()),
            engine.trace().subList(traceStart, engine.trace().size())));
    }

    /** 快照只读引擎当前生命，死亡单位仍保留，不从伤害报告量反推。 */
    private Map<Integer, Long> snapshot(HeroBattleHealingExecutor engine, List<HeroBattleChapterScenario.Unit> units) {
        var hp = new LinkedHashMap<Integer, Long>();
        units.forEach(unit -> hp.put(unit.id(), engine.state(unit.id()).hp()));
        return Map.copyOf(hp);
    }

    /** 按原执行顺序选择一种事件，用于核对跨回合的实例和原因。 */
    private List<Trace> traces(HeroBattleChapterScenario.Result report, String kind) {
        return report.frames().stream().flatMap(frame -> frame.trace().stream())
            .filter(trace -> trace.kind().equals(kind)).toList();
    }

    /** 耗尽事件必须紧邻其真实伤害之前，且生死由伤害字段决定，不由移除原因推断。 */
    private void assertRemovalBeforeHit(List<Trace> action, int target, boolean dead) {
        for (int index = 0; index < action.size(); index++) {
            var event = action.get(index);
            if (!event.reason().equals("shield-depleted")) {
                continue;
            }
            var hit = action.get(index + 1);
            assertEquals("damage", hit.kind());
            assertEquals(target, hit.targetId());
            assertEquals(dead, hit.damage().dead());
            return;
        }
        fail("缺少本动作应有的护盾耗尽事件");
    }

    /** 由生产映射器校验整场后导出原始PB，并核对Java二进制往返，不手工构造协议事件。 */
    private GameProtocol.BattleReplay export(HeroBattleChapterScenario.Result report, String suffix) throws Exception {
        var wire = HeroBattleReplayProtocolUtils.encode(report);
        var bytes = wire.toByteArray();
        assertEquals(wire, GameProtocol.BattleReplay.parseFrom(bytes));
        Files.write(Path.of("target/shield-depleted-" + suffix + ".pb"), bytes);
        Files.writeString(Path.of("target/shield-depleted-" + suffix + ".json"),
            mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report));
        return wire;
    }

    /** 核对协议内冻结的统计，不让Buff移除事件被当成额外伤害或治疗。 */
    private void assertUnit(GameProtocol.BattleReplay wire, int id, long hp, long damage,
                            long taken, long recovery) {
        var unit = wire.getUnitsList().stream().filter(value -> value.getUnitId() == id).findFirst().orElseThrow();
        assertEquals(hp, unit.getFinalHp());
        assertEquals(damage, unit.getTotalDamage());
        assertEquals(taken, unit.getTotalTakenDamage());
        assertEquals(recovery, unit.getTotalRecovery());
    }
}
