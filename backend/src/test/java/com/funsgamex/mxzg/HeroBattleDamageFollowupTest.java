/**
 * 验证梦境与试炼共用的原伤害后续动作、倒戈与伤害换盾。
 * 使用真实策划配置和独立战场，固定概率分支和随机目标避免偶现。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Damage;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.RandomDecision;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroBattleSkillUtils.Skill;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleDamageFollowupTest {
    /** 读取同源动作及每档技能实际配置。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(new ObjectMapper());

    /** 战斗真实元素相克与攻击属性换算。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(new ObjectMapper());

    /** 为原技能提供两名耐久敌人及可供倒戈重选的队友。 */
    private HeroBattleHealingExecutor engine(int template, int activeSkill, int level) {
        var ordinary = new Skill(101010010, 0, 2, 0, 0, false, false);
        var active = new Skill(activeSkill, level, 1, 1, 3, false, false);
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, List.of(active, ordinary)), 1, 2, 300000, 300000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of(active, ordinary)), 2, 2, 300000, 300000, 1000, 0, 0, 0),
            new State(new Actor(3, List.of(ordinary)), 2, 3, 300000, 300000, 1000, 0, 0, 0)), new RandomDecision() {
                /** 独立整数判定沿是否存在有效概率。 */
                public boolean hit(int rate) {
                    return rate > 0;
                }

                /** 随机目标始终取候选中的第一名，确保分段作用在同一真实目标。 */
                public int index(int bound) {
                    return 0;
                }
            });
        var attributes = Map.of(220, 1000L, 150, 300000L, 101, 50L, 226, 10000L, 211, 10000L);
        engine.bindCombatData(1, template, attributes);
        engine.bindCombatData(2, 10101001, attributes);
        engine.bindCombatData(3, 10103003, attributes);
        engine.expireAt(1);
        return engine;
    }

    /** 原五段在最多五次机会内执行，并读取对应等级的倒戈和伤害。 */
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    void originalJannaStrikesFollowEachOtherAndInstallBetray(int level) {
        var engine = engine(10105022, 101050221, level);
        engine.act(1, 2, 100, elements, probability -> probability > 0);
        var expected = IntStream.rangeClosed(0, 4).mapToObj(index -> 1221200 + 100 * index + level).toList();
        assertEquals(expected, engine.damages().stream().map(Damage::buffId).toList());
        assertTrue(engine.buffs(2).stream().anyMatch(row -> row.spec().id() == 1221700 + level));
    }

    /** 第四段未过旧 50% 附加判定时不产生伤害结果，末段也不被调用。 */
    @Test
    void failedOptionalStrikeDoesNotEnterItsDamageFollowup() {
        var engine = engine(10105022, 101050221, 1);
        engine.act(1, 2, 100, elements, probability -> probability > 0 && probability != 0.5D);
        assertEquals(List.of(1221201, 1221301, 1221401), engine.damages().stream().map(Damage::buffId).toList());
    }

    /** 倒戈时普攻同阵营非自身目标，驱散后恢复原来以敌方为目标的多段技能。 */
    @Test
    void betrayedActorAttacksOwnAllyUntilDispelled() {
        var engine = engine(10105022, 101050221, 1);
        engine.applySimpleControl(1221701, 1, 2, probability -> true);
        engine.act(2, 1, 100, elements, probability -> probability > 0);
        assertEquals(List.of(3), engine.damages().stream().map(Damage::targetId).toList());
        engine.dispel(2, 3);
        assertFalse(engine.state(2).actor().hasControl(1013));
        engine.attack(2, 1, elements, probability -> probability > 0);
        assertEquals(List.of(3, 1, 1, 1, 1, 1), engine.damages().stream().map(Damage::targetId).toList());
    }

    /** 喵莉丝的护盾仅由施法者获得，逐档取累计伤害比例，并保留两回合与冰冻。 */
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    void astrologerAddsDamageShieldToSelfAndFreezesOriginalEnemy(int level) {
        var engine = engine(10205021, 102050213, level);
        engine.act(1, 2, 100, elements, probability -> probability > 0);
        long damage = engine.damages().stream().filter(value -> value.buffId() == 2213200 + level)
            .mapToLong(value -> Math.abs(value.incoming())).sum();
        assertTrue(damage > 0);
        var shield = engine.buffs(1).stream().filter(row -> row.spec().id() == 2213400 + level)
            .reduce((earlier, later) -> later).orElseThrow();
        assertEquals(damage * level / 10, shield.value());
        assertEquals(3, shield.expiresAt());
        assertTrue(List.of(2, 3).stream().anyMatch(id -> engine.state(id).actor().hasControl(1004)));
        assertFalse(List.of(2, 3).stream().anyMatch(id -> engine.buffs(id).stream()
            .anyMatch(row -> row.spec().id() == 2213400 + level)));
    }
}
