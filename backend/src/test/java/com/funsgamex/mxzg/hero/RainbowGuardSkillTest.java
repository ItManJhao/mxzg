/**
 * 彩虹圣殿全量守军可战性，以及无双假面·晓的受击怒气和多段斩击回归。
 * 使用正式守军和技能表，独立斩击测试固定随机判定以核对临界层数与实际伤害。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules.Skill;
import com.funsgamex.mxzg.rainbow.RainbowRules;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RainbowGuardSkillTest {
    /** 加载正式技能与元素配置，测试不替换任何生效值。 */
    private final ObjectMapper mapper = new ObjectMapper();
    /** 执行器和测试单位共用实际配置的技能排期。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(mapper);
    /** 正式伤害使用的元素规则。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(mapper);

    /** 每个原始进化档都构建六名守军，预检完整技能排期和成长配置。 */
    @Test
    void allGuardianRostersHaveExecutableSkills() {
        var shrine = new RainbowRules(mapper);
        var battle = new HeroBattleChapterScenario(mapper);
        for (int type : List.of(1, 2, 3)) {
            for (int evolution = 1; evolution <= 1000; evolution++) {
                var enemies = shrine.mission(type, evolution).enemies();
                var defenders = battle.freezeTrialDefense(null, enemies);
                assertEquals(6, defenders.size());
                var missing = battle.trialDefenseGaps(defenders);
                assertTrue(missing.isEmpty(), "圣殿 " + type + "/" + evolution + " 守军技能缺口：" + missing);
            }
        }
    }

    /** 不足三层时只出三刀并保留怒气，达到三、六层时增加一、两刀并溅射。 */
    @Test
    void stacksOnIncomingAttacksAndExpendsOnlyAtWholeThresholds() {
        for (int receivedHits : List.of(2, 3, 6, 11)) {
            var battle = battle();
            battle.initializePassive(1, 101050214, 1);
            battle.beginRound(2, List.of(1, 9, 10, 11), elements, chance -> chance > 0D);
            for (int hit = 0; hit < receivedHits; hit++) {
                battle.attack(9, 1, elements, chance -> chance > 0D);
            }
            int rage = Math.min(receivedHits, 10);
            assertEquals(rage, angerLayers(battle));
            int expectedStrikes = 3 + Math.min(rage / 3, 2);

            battle.act(1, 9, 100, elements, chance -> chance > 0D);

            var dealt = battle.damages().stream().filter(damage -> damage.sourceId() == 1).toList();
            assertEquals(expectedStrikes, dealt.stream().filter(damage -> damage.targetId() == 9).count());
            var splash = dealt.stream().filter(damage -> damage.targetId() != 9).toList();
            assertEquals(rage < 3 ? 0 : 2, splash.size());
            if (!splash.isEmpty()) {
                var last = dealt.get(expectedStrikes - 1);
                for (var hit : splash) {
                    assertEquals(last.buffId(), hit.buffId());
                    assertEquals(last.incoming(), hit.incoming());
                }
            }
            assertEquals(rage < 3 ? rage : 0, angerLayers(battle));
        }
    }

    /** 以真实普攻和第二主动技能建立双方阵容，各次选人固定取存活首位。 */
    private HeroBattleHealingExecutor battle() {
        var battle = new HeroBattleHealingExecutor(rules, List.of(
                fighter(1, 1, 2, new Skill(101050210, 0), new Skill(101050213, 1)),
                fighter(9, 2, 2, new Skill(101050200, 0)),
                fighter(10, 2, 3, new Skill(101050200, 0)),
                fighter(11, 2, 5, new Skill(101050200, 0))), new HeroBattleHealingExecutor.RandomDecision() {
                    /** 固定所有非零概率分支以复验原伤害次数。 */
                    @Override
                    public boolean hit(int rate) {
                        return rate > 0;
                    }

                    /** 每次选取剩余候选的首位。 */
                    @Override
                    public int index(int bound) {
                        return 0;
                    }
                });
        for (int unit : List.of(1, 9, 10, 11)) {
            battle.bindCombatData(unit, unit == 1 ? 10105021 : 10105020,
                    Map.of(101, 100L, 150, 500L, 220, 200L));
        }
        return battle;
    }

    /** 预留足够生命以便完整观察五段伤害与溅射，不改变原技能倍率。 */
    private State fighter(int id, int faction, int position, Skill... skills) {
        return new State(new Actor(id, rules.battleSchedule(List.of(skills))), faction, position,
                10_000, 10_000, 200, 0, 0, 0);
    }

    /** 统计真实已安装的 151 怒气实例，区分受击监听本身。 */
    private static long angerLayers(HeroBattleHealingExecutor battle) {
        return battle.buffs(1).stream().filter(entry -> entry.spec().type() == 151).count();
    }
}
