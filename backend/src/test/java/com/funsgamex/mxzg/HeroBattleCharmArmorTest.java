/** 魅惑之拥主动破甲增益回归：真实配置动作、属性生效及到期/驱散恢复，仅使用内存战场。 */
package com.funsgamex.mxzg;

import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleCharmArmorTest {
    /** 同源元素规则，确定判定避免随机分支掩盖属性变化。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(new ObjectMapper());

    /** 独立属性动作夹具：高生命护甲靶；只验111140x，不替换未知目标选择或普攻来伪造完整技能。 */
    private HeroBattleHealingExecutor engine() {
        var rules = new HeroSkillPanelRules(new ObjectMapper());
        var plan = rules.battleSchedule(rules.select(10101001, 1, 0));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, plan), 1, 2, 100000, 100000, 1000, 0, 0, 0),
            new State(new Actor(2, plan), 2, 2, 100000, 100000, 1000, 0, 0, 0)));
        for (int id : List.of(1, 2)) {
            engine.bindCombatData(id, 10105011, Map.of(220, 1000L, 224, 1000L, 150, 500L));
        }
        engine.beginRound(1, List.of(1, 2), elements, rate -> rate == 1D);
        return engine;
    }

    /** 对固定目标执行同一普通伤害配置，返回护盾处理前的实际计算值。 */
    private long damage(HeroBattleHealingExecutor engine) {
        engine.ordinaryDamage(1011401, 1, List.of(2), 1, false, 0, elements, rate -> rate == 1D);
        return engine.damages().getLast().incoming();
    }

    /** 三个等级的真实属性动作均只给自身加破甲，第三回合开始到期后伤害恢复基线。 */
    @Test void allLevelsApplyToSelfAndExpire() {
        for (int star : List.of(5, 6, 7)) {
            var engine = engine();
            long baseline = damage(engine);
            engine.art(new HeroBattleEventProcessor.Invocation(1, 1111401 + star - 5, 1, 2));
            assertEquals(1, engine.buffs(1).size());
            assertTrue(engine.buffs(2).isEmpty());
            var buff = engine.buffs(1).getFirst();
            assertEquals(1111401 + star - 5, buff.spec().id());
            assertEquals(3, buff.expiresAt());
            assertTrue(damage(engine) > baseline);
            engine.beginRound(2, List.of(1, 2), elements, rate -> rate == 1D);
            assertFalse(engine.buffs(1).isEmpty());
            engine.beginRound(3, List.of(1, 2), elements, rate -> rate == 1D);
            assertTrue(engine.buffs(1).isEmpty());
            assertEquals(baseline, damage(engine));
            assertEquals("expire", engine.removals().getLast().reason());
        }
    }

    /** 正面驱散立即撤销加成，重复驱散不重复减属性；后续动作可以再次安装。 */
    @Test void dispelRestoresAttributeExactlyOnce() {
        var engine = engine();
        long baseline = damage(engine);
        engine.art(new HeroBattleEventProcessor.Invocation(1, 1111401, 1, 2));
        engine.dispel(1, 1);
        engine.dispel(1, 1);
        assertEquals(baseline, damage(engine));
        assertEquals(1, engine.removals().size());
        engine.beginRound(5, List.of(1, 2), elements, rate -> rate == 1D);
        engine.art(new HeroBattleEventProcessor.Invocation(1, 1111401, 1, 2));
        assertEquals(1, engine.buffs(1).size());
        assertTrue(damage(engine) > baseline);
    }
    /** 同冲突组重复安装替换旧实例，不重复加成；死亡统一移除且后续到期不重复回调。 */
    @Test void replacementAndDeathCleanUpOnce() {
        var engine = engine();
        engine.art(new HeroBattleEventProcessor.Invocation(1, 1111401, 1, 2));
        long boosted = damage(engine);
        engine.art(new HeroBattleEventProcessor.Invocation(1, 1111401, 1, 2));
        assertEquals(1, engine.buffs(1).size());
        assertEquals(boosted, damage(engine));
        assertEquals("replace", engine.removals().getLast().reason());
        engine.setOnceAttribute(2, 220, 10000000);
        engine.ordinaryDamage(1011401, 2, List.of(1), 1, false, 0, elements, rate -> rate == 1D);
        assertEquals(0, engine.state(1).hp());
        assertTrue(engine.buffs(1).isEmpty());
        assertEquals("death", engine.removals().getLast().reason());
        int removed = engine.removals().size();
        engine.expireAt(3);
        assertEquals(removed, engine.removals().size());
    }

    /** 使用完整初始技能和真实四单位生成二进制战报，固定种子仅供复验；不替换普攻。 */
    @Test void completeSkillReplayIncludesRandomTargetsNormalAndArmor() throws Exception {
        var mapper = new ObjectMapper();
        var scenario = new HeroBattleChapterScenario(mapper);
        for (int star : List.of(5, 6, 7)) {
            var report = scenario.runIndependentCharm(star, 17, rate -> rate >= 1D);
            assertEquals(report, scenario.runIndependentCharm(star, 17, rate -> rate >= 1D));
            var trace = report.frames().stream().flatMap(frame -> frame.trace().stream()).toList();
            assertTrue(trace.stream().anyMatch(event -> event.kind().equals("presentation") && event.configId() == 1110200));
            assertTrue(trace.stream().anyMatch(event -> event.kind().equals("buff.upsert") && event.configId() == 1111401 + star - 5));
            assertTrue(trace.stream().anyMatch(event -> event.kind().equals("buff.remove") && event.configId() == 1111401 + star - 5));
            var first = report.frames().stream().filter(frame -> frame.sourceId() == 1).findFirst().orElseThrow();
            var targets = first.trace().stream().filter(event -> event.kind().equals("damage")
                && event.configId() == 1111301 + star - 5).map(event -> event.targetId()).toList();
            assertEquals(2, new HashSet<>(targets).size());
            HeroBattleReplayUtils.validate(report);
            String file = "target/independent-charm-star-" + star;
            java.nio.file.Files.write(java.nio.file.Path.of(file + "-replay.pb"), HeroBattleReplayProtocolUtils.encode(report).toByteArray());
            java.nio.file.Files.writeString(java.nio.file.Path.of(file + "-report.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report));
        }
    }

}
