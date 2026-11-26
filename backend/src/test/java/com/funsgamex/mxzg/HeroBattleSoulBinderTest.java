/** 核对试炼守军缚魂者的原斩杀、死亡印记与治疗，固定随机判定验证触发边界。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules.Skill;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class HeroBattleSoulBinderTest {
    /** 使用真实配置预检各档斩杀与监听。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(new ObjectMapper());
    /** 元素倍率取正式战斗的原配置。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(new ObjectMapper());

    /** 固定斩杀包含血量比例下界、严格攻击上界，越界后改走可未命中的普通计算。 */
    @Test
    void executionRequiresBothOriginalThresholds() {
        for (long hp : List.of(2999L, 3000L, 3999L, 4000L)) {
            var battle = battle(hp);
            battle.ordinaryDamage(5103303, 1, List.of(2), 1, true, 100, elements, chance -> false);
            boolean executed = hp >= 3000 && hp < 4000;
            assertEquals(!executed, battle.ordinaryResults().getFirst().missed());
            assertEquals(executed ? 0L : hp, battle.state(2).hp());
            assertTrue(battle.signals().stream().noneMatch(signal -> signal.event() == 182));
        }
    }

    /** 零概率的一级追印不安装，三档命中印记在亡者清理前供队伍治疗使用。 */
    @Test
    void deathHealingChecksMarkBeforeClearingFallenUnit() {
        var first = battle(3000);
        first.initializePassive(1, 105050104, 1);
        first.signal(181, 1, 2);
        assertFalse(hasDeathMark(first, 2));

        for (boolean mark : List.of(false, true)) {
            var battle = battle(3999);
            battle.initializePassive(1, 105050104, 3);
            if (mark) {
                battle.beginRound(1, List.of(1, 2, 3, 4), elements, chance -> chance >= 0.6D);
                battle.attack(1, 2, elements, chance -> chance >= 0.6D);
                assertTrue(hasDeathMark(battle, 2));
            }
            battle.ordinaryDamage(5103203, 1, List.of(2), 1, true, 100, elements, chance -> false);
            assertEquals(0, battle.state(2).hp());
            assertEquals(mark ? 4200 : 3000, battle.state(1).hp());
            assertEquals(4200, battle.state(3).hp());
            assertFalse(hasDeathMark(battle, 2));
        }
    }

    /** 构造双方各两名英雄，保留一名活着的守军以触发旧战斗结束之前的死亡监听。 */
    private HeroBattleHealingExecutor battle(long opponentHp) {
        var battle = new HeroBattleHealingExecutor(rules, List.of(
                new State(new Actor(1, rules.battleSchedule(List.of(new Skill(105050100, 0)))),
                        1, 1, 3000, 10000, 1000, 0, 0, 0),
                new State(new Actor(2, List.of()), 2, 1, opponentHp, 10000, 1000, 0, 0, 0),
                new State(new Actor(3, List.of()), 1, 2, 3000, 10000, 1000, 0, 0, 0),
                new State(new Actor(4, List.of()), 2, 2, 10000, 10000, 1000, 0, 0, 0)),
                new HeroBattleHealingExecutor.RandomDecision() {
                    /** 让非零概率通过，独立伤害入口另行控制命中。 */
                    @Override
                    public boolean hit(int configuredRate) {
                        return configuredRate > 0;
                    }

                    /** 本测试的目标均固定，若选取则保留首项。 */
                    @Override
                    public int index(int bound) {
                        return 0;
                    }
                });
        battle.bindCombatData(1, 10505010, Map.of(220, 1000L, 150, 500L));
        for (int id : List.of(2, 3, 4)) {
            battle.bindCombatData(id, 10105020, Map.of(220, 1000L, 150, 500L));
        }
        return battle;
    }

    /** 读取现存的死亡印记，避免把已过期或已清除的记录误算为有效。 */
    private static boolean hasDeathMark(HeroBattleHealingExecutor battle, int id) {
        return battle.buffs(id).stream().anyMatch(entry -> entry.spec().type() == 140);
    }
}
