/** 恶魔魅影回归：使用真实配置核对死亡事件、跨目标暴击叠加和实例清理，仅运行内存战场。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleCharmDeathTest {
    /** 真实配置装配，元素规则用于普通伤害。 */
    private final ObjectMapper mapper = new ObjectMapper();
    private final HeroBattleElementRules elements = new HeroBattleElementRules(mapper);

    /** 一名魅惑之拥、一名友方和三名敌方，前后排各有目标，短血敌人用于控制死亡顺序。 */
    private HeroBattleHealingExecutor engine(int level) {
        var rules = new HeroSkillPanelRules(mapper);
        var normal = rules.battleSchedule(rules.select(10101001, 1, 0));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, normal), 1, 1, 100000, 100000, 1000, 0, 0, 0),
            new State(new Actor(2, normal), 1, 2, 100000, 100000, 1000, 0, 0, 0),
            new State(new Actor(3, normal), 2, 1, 1, 1, 1000, 0, 0, 0),
            new State(new Actor(4, normal), 2, 5, 1, 1, 1000, 0, 0, 0),
            new State(new Actor(5, normal), 2, 6, 1, 1, 1000, 0, 0, 0)));
        for (int id : List.of(1, 2, 3, 4, 5)) {
            engine.bindCombatData(id, id == 1 ? 10105011 : 10101001, Map.of(220, 1000L, 224, 1000L, 150, 500L));
        }
        engine.initializePassive(1, 101050113, level);
        engine.beginRound(1, List.of(1, 2, 3, 4, 5), elements, rate -> rate >= 1D);
        return engine;
    }

    /** 一个动作逐个击杀时，上一目标的暴击增益立即供下一目标读取；清场一击不加新层。 */
    @Test void sameActionReadsStacksInTargetOrder() {
        for (int level : List.of(1, 2, 3)) {
            var engine = engine(level);
            for (int id : List.of(3, 4, 5)) {
                var listener = engine.buffs(id).getFirst();
                assertEquals(1113100 + level, listener.spec().id());
                assertEquals(1, listener.sourceId());
            }
            assertTrue(engine.buffs(2).isEmpty());
            engine.ordinaryDamage(1011401, 1, List.of(4, 3, 5), 1, true, 0, elements,
                rate -> rate >= 1D || (rate >= 0.39D && rate <= 0.61D));
            assertEquals(List.of(4, 3, 5), engine.signals().stream().filter(signal -> signal.event() == 180)
                .map(HeroBattleHealingExecutor.Signal::carrierId).toList());
            assertEquals(List.of(false, false, true), engine.ordinaryResults().stream()
                .map(HeroBattleDamageAction.Result::critical).toList());
            assertEquals(List.of(1113200 + level, 1113200 + level), engine.buffs(1).stream()
                .map(entry -> entry.spec().id()).toList());
            for (int id : List.of(3, 4, 5)) {
                assertTrue(engine.buffs(id).isEmpty());
            }
        }
    }

    /** 友方击杀给原施加者叠层；施加者死亡后属性实例被清理，剩余敌方监听无法给死者叠层。 */
    @Test void allyKillUsesOwnerAndOwnerDeathClearsStacks() {
        var engine = engine(3);
        engine.ordinaryDamage(1011401, 2, List.of(3), 1, false, 0, elements, rate -> rate >= 1D);
        assertEquals(1113203, engine.buffs(1).getFirst().spec().id());
        assertTrue(engine.buffs(2).isEmpty());
        engine.dispel(1, 0);
        assertEquals(1, engine.buffs(1).size());
        engine.setOnceAttribute(4, 220, 10000000L);
        engine.ordinaryDamage(1011401, 4, List.of(1), 1, false, 0, elements, rate -> rate >= 1D);
        assertEquals(0L, engine.state(1).hp());
        assertTrue(engine.buffs(1).isEmpty());
        assertTrue(engine.removals().stream().anyMatch(removal -> removal.reason().equals("death")
            && removal.entry().spec().id() == 1113203));
        engine.ordinaryDamage(1011401, 2, List.of(4), 1, false, 0, elements, rate -> rate >= 1D);
        assertTrue(engine.buffs(1).isEmpty());
        assertTrue(engine.buffs(4).isEmpty());
    }

    /** 强化3九星完整配置战报保留所有技能，验证安装、暴击增益、逐敌方清理和结算。 */
    @Test void fullSkillReplayExportsVerifiedDeathEvents() throws Exception {
        var scenario = new HeroBattleChapterScenario(mapper);
        var report = scenario.runIndependentCharmDeath(17, rate -> rate >= 1D || (rate >= 0.55D && rate <= 0.65D));
        var hero = report.initial().getFirst();
        assertEquals(3, hero.stage());
        assertTrue(hero.skills().stream().anyMatch(skill -> skill.skillId() == 101050113 && skill.level() == 3));
        var trace = report.frames().stream().flatMap(frame -> frame.trace().stream()).toList();
        assertEquals(3, trace.stream().filter(event -> event.kind().equals("buff.upsert") && event.configId() == 1113103).count());
        assertEquals(2, trace.stream().filter(event -> event.kind().equals("buff.upsert") && event.configId() == 1113203).count());
        assertEquals(3, trace.stream().filter(event -> event.kind().equals("buff.remove") && event.configId() == 1113103).count());
        assertEquals(HeroBattleRoundUtils.Outcome.ATTACKER_WIN, report.outcome());
        HeroBattleReplayUtils.validate(report);
        Files.write(Path.of("target/independent-charm-death-replay.pb"), HeroBattleReplayProtocolUtils.encode(report).toByteArray());
        Files.writeString(Path.of("target/independent-charm-death-report.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report));
    }
}
