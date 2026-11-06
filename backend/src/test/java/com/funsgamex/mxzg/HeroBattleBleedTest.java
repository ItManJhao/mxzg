/** 旧流血安装、实时攻击、周期末移除与专项战报回归；全部为内存战场，不读取玩家库。 */
package com.funsgamex.mxzg;

import java.util.*;
import java.nio.file.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleBleedTest {
    /** 使用真实技能配置与确定的边界属性，便于手算每次扣血。 */
    private HeroBattleHealingExecutor engine(long hp) {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var skills = rules.battleSchedule(rules.select(10104004, 4, 0));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, skills), 1, 1, hp, hp, 100, 0, 0, 0),
            new State(new Actor(2, skills), 2, 1, hp, hp, 100, 0, 0, 0)));
        for (int id : List.of(1, 2)) {
            engine.bindCombatData(id, 10104004, Map.of(220, 100L, 150, 500L));
        }
        return engine;
    }

    /** 安装当回合不扣血；实时一次性攻击只影响首次结算，第二次伤害后到期移除。 */
    @Test void ticksReadCurrentAttackAndExpireAfterFinalDamage() {
        var engine = engine(1000);
        var elements = new HeroBattleElementRules(new ObjectMapper());
        engine.applyBleed(5051303, 1, 2, rate -> rate == 1D);
        assertEquals(1000, engine.state(2).hp());
        engine.setOnceAttribute(1, 220, 200);
        engine.beginRound(1, List.of(1, 2), elements, rate -> rate == 1D);
        assertEquals(970, engine.state(2).hp());
        assertEquals(1, engine.buffs(2).size());
        engine.beginRound(2, List.of(1, 2), elements, rate -> rate == 1D);
        assertEquals(955, engine.state(2).hp());
        assertTrue(engine.buffs(2).isEmpty());
        assertEquals("expire", engine.removals().getLast().reason());
        assertEquals(List.of(183, 177, 183, 177, 209), engine.signals().stream().map(s -> s.event()).toList());
        engine.beginRound(3, List.of(1, 2), elements, rate -> rate == 1D);
        assertEquals(2, engine.damages().size());
    }

    /** 免疫不消费抗性；零概率仍读取抗性，但不安装。随机失败回滚读取。 */
    @Test void immunityResistanceZeroAndRollback() {
        var engine = engine(1000);
        engine.setOnceAttribute(2, 325, 2000);
        engine.state(2).actor().control(152, true);
        engine.applyBleed(5051303, 1, 2, rate -> { fail("免疫不得判定"); return false; });
        assertEquals(2000L, engine.onceAttributes(2).get(325));
        engine.state(2).actor().control(152, false);
        assertThrows(IllegalStateException.class, () -> engine.applyBleed(5051303, 1, 2, rate -> {
            assertEquals(.8, rate, 1e-12);
            throw new IllegalStateException("故障注入");
        }));
        assertEquals(2000L, engine.onceAttributes(2).get(325));
        engine.applyBleed(5051301, 1, 2, rate -> { assertEquals(0D, rate); return false; });
        assertTrue(engine.onceAttributes(2).isEmpty());
        assertTrue(engine.buffs(2).isEmpty());
    }

    /** 冲突替换与负面驱散统一移除；死亡不重复产生到期事件。 */
    @Test void replacementDispelAndDeath() {
        var engine = engine(10);
        engine.applyBleed(5051303, 1, 2, rate -> true);
        engine.applyBleed(5051303, 1, 2, rate -> true);
        assertEquals(1, engine.buffs(2).size());
        assertEquals("replace", engine.removals().getFirst().reason());
        engine.dispel(2, 2);
        assertTrue(engine.buffs(2).isEmpty());
        engine.applyBleed(5051303, 1, 2, rate -> true);
        engine.beginRound(1, List.of(1, 2), new HeroBattleElementRules(new ObjectMapper()), rate -> true);
        assertEquals(0, engine.state(2).hp());
        assertTrue(engine.buffs(2).isEmpty());
        assertEquals("death", engine.removals().getLast().reason());
        assertTrue(engine.signals().stream().noneMatch(s -> s.event() == 209));
    }

    /** 流血来源死亡后仍留在战场可查询；护盾沿现有旧规则报告吸收，疑点不被本批改写。 */
    @Test void sourceDeathAndShieldUseExistingPipeline() {
        var engine = engine(1000);
        engine.art(new HeroBattleEventProcessor.Invocation(1, 1063201, 1, 1));
        engine.art(new HeroBattleEventProcessor.Invocation(1, 10011201, 1, 2));
        engine.applyBleed(5051303, 1, 2, rate -> true);
        engine.state(1).actor().setDead(true);
        engine.beginRound(1, List.of(1, 2), new HeroBattleElementRules(new ObjectMapper()), rate -> true);
        var damage = engine.damages().getLast();
        assertEquals(15, damage.incoming());
        assertEquals(10, damage.absorbed());
        assertEquals(-5, damage.reported());
        assertEquals(-15, damage.actual());
        assertTrue(engine.removals().stream().anyMatch(removal -> removal.reason().equals("shield-depleted")));
    }

    /** 从真实三级主动生成独立Protobuf战报，明确只包含本批主动和普攻。 */
    @Test void independentSkillReplay() throws Exception {
        var mapper = new ObjectMapper();
        var report = new HeroBattleChapterScenario(mapper).runIndependentDarkCutterBleed(rate -> rate >= 1D);
        assertEquals("audit:dark-cutter-bleed", report.scenario());
        var trace = report.frames().stream().flatMap(frame -> frame.trace().stream()).toList();
        assertTrue(trace.stream().anyMatch(event -> event.kind().equals("buff.upsert") && event.configId() == 5051303));
        assertTrue(trace.stream().anyMatch(event -> event.kind().equals("damage") && event.configId() == 5051303));
        assertTrue(trace.stream().anyMatch(event -> event.kind().equals("buff.remove") && event.configId() == 5051303));
        HeroBattleReplayUtils.validate(report);
        Files.writeString(Path.of("target/independent-dark-cutter-bleed-report.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report));
        Files.write(Path.of("target/independent-dark-cutter-bleed-replay.pb"), HeroBattleReplayProtocolUtils.encode(report).toByteArray());
    }
}
