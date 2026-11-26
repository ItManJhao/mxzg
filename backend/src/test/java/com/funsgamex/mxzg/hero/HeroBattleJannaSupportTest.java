/** 使用旧迦娜技能配置复验先手分支与偷取增益，检查真实来源、期限和战斗数值。 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Invocation;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules.Skill;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleJannaSupportTest {
    /** 加载生产技能和元素配置，测试只固定随机判定及战场输入。 */
    private final ObjectMapper mapper = new ObjectMapper();
    /** 解析真实技能的原动作和目标。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(mapper);
    /** 由正常动作读取伤害属性，而非手工改血。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(mapper);

    /** 迦娜与最快敌方平速时得到闪避，敌方更快时得到速度，同阵营快于自己不改变分支。 */
    @Test
    void comparesLiveEnemySpeedAndAcceptsATie() {
        for (int level : List.of(1, 2, 3)) {
            for (int enemySpeed : List.of(100, 110)) {
                var battle = battle(0, janna(level), simple(2, 1, 8), simple(3, 2, 1));
                bind(battle, 1, 10105022, 100);
                bind(battle, 2, 10105020, 300);
                bind(battle, 3, 10105020, enemySpeed);
                battle.initializePassive(1, 101050224, level);
                battle.beginRound(1, List.of(1, 2, 3), elements, chance -> chance > 0D);

                int effect = (enemySpeed == 100 ? 1224300 : 1224400) + level;
                assertTrue(buffs(battle, 1).contains(effect));
                assertTrue(buffs(battle, 2).isEmpty());
                assertTrue(buffs(battle, 3).isEmpty());
                var attribute = rules.controlAttribute(effect);
                assertEquals(enemySpeed == 100 ? 227 : 204, attribute.attribute());
                assertEquals(1, attribute.duration());
                battle.expireAt(2);
                assertFalse(buffs(battle, 1).contains(effect));
            }
        }
    }

    /** 301 的启动目标只负责进入动作，实际从敌方队列至多前三名合格持有者各偷一项。 */
    @Test
    void stealsOneEligibleGainPerDonorInEnemyOrder() {
        var goddess = fighter(2, 2, 1, new Skill(104050050, 0), new Skill(104050053, 2));
        var battle = battle(1, janna(3), goddess, simple(3, 2, 2), simple(4, 2, 3), simple(5, 2, 4));
        bind(battle, 1, 10105022, 100);
        bind(battle, 2, 10405005, 100);
        for (int unit : List.of(3, 4, 5)) {
            bind(battle, unit, 10105020, 100);
        }
        battle.beginRound(2, List.of(1, 2, 3, 4, 5), elements, chance -> chance > 0D);
        battle.act(2, 1, 100, elements, chance -> chance > 0D);
        battle.art(new Invocation(1111403, 1111403, 2, 2));
        assertEquals(List.of(4053202, 4053302, 1111403), buffs(battle, 2));
        battle.act(1, 5, 100, elements, chance -> chance > 0D);

        assertEquals(List.of(4053202, 4053302), buffs(battle, 2));
        assertEquals(List.of(4053302), buffs(battle, 3));
        assertEquals(List.of(4053302), buffs(battle, 4));
        assertEquals(List.of(4053202, 4053302), buffs(battle, 5));
        assertEquals(List.of(1111403, 4053202), buffs(battle, 1));
        assertTrue(battle.buffs(1).stream().allMatch(buff -> buff.sourceId() == 2
                && buff.expiresAt() == 4 && buff.value() == 0L && buff.copiedFromEnemy()));
    }

    /** 旧偷取保留速度增益的原期限，挂载时不重放加速，移除时仍执行原属性回调。 */
    @Test
    void preservesOriginalExpiryWithoutReapplyingTheStolenSpeed() {
        var nile = fighter(3, 2, 2, new Skill(101050200, 0), new Skill(101050203, 1));
        var battle = battle(0, janna(2), simple(2, 2, 1), nile);
        bind(battle, 1, 10105022, 100);
        bind(battle, 2, 10105020, 100);
        bind(battle, 3, 10105020, 100);
        battle.beginRound(2, List.of(1, 2, 3), elements, chance -> chance > 0D);
        battle.act(3, 1, 100, elements, chance -> chance > 0D);
        assertEquals(110, battle.currentSpeed(2));
        assertEquals(100, battle.currentSpeed(1));
        battle.act(1, 3, 100, elements, chance -> chance > 0D);

        assertEquals(100, battle.currentSpeed(2));
        assertEquals(100, battle.currentSpeed(1));
        assertEquals(List.of(1203301), buffs(battle, 1));
        assertEquals(3, battle.buffs(1).getFirst().sourceId());
        assertEquals(4, battle.buffs(1).getFirst().expiresAt());
        battle.expireAt(4);
        assertEquals(90, battle.currentSpeed(1));
    }

    /** 构建各随机入口可重复的真实战场，保留候选数量约束。 */
    private HeroBattleHealingExecutor battle(int pick, State... rows) {
        return new HeroBattleHealingExecutor(rules, List.of(rows), new HeroBattleHealingExecutor.RandomDecision() {
            @Override
            public boolean hit(int rate) {
                return rate > 0;
            }

            @Override
            public int index(int bound) {
                return Math.min(pick, bound - 1);
            }
        });
    }

    /** 迦娜以原普攻和对应等级第二主动出战。 */
    private State janna(int level) {
        return fighter(1, 1, 1, new Skill(101050220, 0), new Skill(101050223, level));
    }

    /** 创建有合法普攻的独立目标，未指定主动技能时只执行普攻。 */
    private State simple(int id, int faction, int position) {
        return fighter(id, faction, position, new Skill(101050200, 0));
    }

    /** 建立用于真实排期的单位，留出足够生命观察增益。 */
    private State fighter(int id, int faction, int position, Skill... skills) {
        return new State(new Actor(id, rules.battleSchedule(List.of(skills))), faction, position,
                10000, 10000, 200, 0, 0, 0);
    }

    /** 指定实时速度，用真实模板完成职业和元素判定。 */
    private void bind(HeroBattleHealingExecutor battle, int unit, int template, long speed) {
        battle.bindCombatData(unit, template, Map.of(101, speed, 150, 500L, 220, 200L));
    }

    /** 保留 Buff 安装顺序，便于辨别偷取与冲突替换。 */
    private static List<Integer> buffs(HeroBattleHealingExecutor battle, int unit) {
        return battle.buffs(unit).stream().map(entry -> entry.spec().id()).toList();
    }
}
