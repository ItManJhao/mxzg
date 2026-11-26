/** 用梦境和试炼守军的真实技能排期验证高等级后续动作，检查概率、到期与扣血战报。 */
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HeroBattleHighLevelFollowupTest {
    /** 真实配置用于装配技能和元素，不替换伤害动作或设置伪状态。 */
    private final ObjectMapper mapper = new ObjectMapper();
    /** 探测战斗时走生产技能预检。 */
    private final HeroSkillPanelRules rules = new HeroSkillPanelRules(mapper);
    /** 固定测试概率后仍由生产伤害与治疗规则结算。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(mapper);

    /** 二级保持零概率咒印和追加诅咒，三级命中后装咒印并以第二份诅咒覆盖第一份。 */
    @Test
    void doombringerAddsMantraAndTheOriginalCursesAtHigherLevels() {
        for (int level : List.of(2, 3)) {
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    fighter(1, 1, 1, 10000, new Skill(105050060, 0), new Skill(105050061, level),
                            new Skill(105050063, level)),
                    fighter(2, 2, 1, 10000, new Skill(101050200, 0))));
            bind(battle, 1, 10505006, 200);
            bind(battle, 2, 10105020, 200);
            var order = List.of(1, 2);
            battle.beginRound(1, order, elements, chance -> chance > 0D);
            battle.act(1, 2, 100, elements, chance -> chance > 0D);
            var expected = level == 2 ? List.of(5061502) : List.of(5061403, 5061603);
            assertEquals(expected, buffIds(battle, 2));
            assertEquals(1000, rules.controlAttribute(5061403).amount());

            battle.beginRound(2, order, elements, chance -> chance > 0D);
            battle.act(1, 2, 100, elements, chance -> chance > 0D);
            assertTrue(battle.removals().stream().anyMatch(removal -> removal.reason().equals("detonate")
                    && removal.unitId() == 2));
            assertTrue(battle.damages().stream().anyMatch(hit -> hit.buffId() == 5063400 + level && hit.incoming() > 0));
            assertEquals(level == 2 ? List.of() : List.of(5061403, 5063303), buffIds(battle, 2));
            battle.expireAt(4);
            assertTrue(buffIds(battle, 2).isEmpty());
        }
    }

    /** 三级萝莫拉按 50% 逐目标移除最先安装的可驱散增益，保留另一个增益与中性结界。 */
    @Test
    void lumolaRemovesOneEnemyGainAfterTheOriginalHit() {
        var battle = new HeroBattleHealingExecutor(rules, List.of(
                fighter(1, 1, 1, 10000, new Skill(103050200, 0), new Skill(103050201, 3)),
                fighter(2, 2, 1, 10000, new Skill(104050050, 0), new Skill(104050053, 3)),
                fighter(3, 2, 2, 10000, new Skill(101050200, 0), new Skill(101050203, 1))));
        bind(battle, 1, 10305020, 200);
        bind(battle, 2, 10405005, 200);
        bind(battle, 3, 10105020, 200);
        battle.beginRound(2, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        battle.act(2, 1, 100, elements, chance -> chance >= 1D);
        battle.act(3, 1, 100, elements, chance -> chance >= 1D || chance == 0.6D);
        assertEquals(List.of(4053203, 4053303, 1203301, 1203401), buffIds(battle, 2));
        assertEquals(List.of(4053203, 4053303), buffIds(battle, 3));

        battle.beginRound(3, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        battle.act(1, 2, 100, elements, chance -> chance >= 1D || chance == 0.5D);
        assertEquals(List.of(4053303, 1203301), buffIds(battle, 2));
        assertEquals(List.of(4053303), buffIds(battle, 3));
        assertEquals(List.of(2, 3), battle.removals().stream()
                .filter(removal -> removal.reason().equals("dispel") && removal.entry().spec().id() == 4053203)
                .map(HeroBattleHealingExecutor.Removal::unitId).toList());
        assertTrue(rules.inertBattleEffect(3201402));
    }

    /** 结界持续两回合，原施加者结界到期时仅执行一份该档全队治疗。 */
    @Test
    void warGoddessWardExpiresIntoOneTeamHeal() {
        for (int level : List.of(2, 3)) {
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    fighter(1, 1, 1, 8000, new Skill(104050050, 0), new Skill(104050053, level)),
                    fighter(2, 1, 2, 8000, new Skill(101050200, 0)),
                    fighter(3, 2, 1, 8000, new Skill(101050200, 0))));
            bind(battle, 1, 10405005, 200);
            bind(battle, 2, 10105020, 200);
            bind(battle, 3, 10105020, 200);
            battle.beginRound(2, List.of(1, 2, 3), elements, chance -> chance >= 1D);
            battle.act(1, 3, 100, elements, chance -> chance >= 1D);
            assertEquals(List.of(4053200 + level, 4053300 + level), buffIds(battle, 2));

            battle.expireAt(4);
            var healing = battle.recoveries();
            assertEquals(List.of(1, 2), healing.stream().map(HeroBattleHealingExecutor.Recovery::targetId).toList());
            assertTrue(healing.stream().allMatch(entry -> entry.buffId() == 4053400 + level && entry.sourceId() == 1));
            assertTrue(buffIds(battle, 1).isEmpty());
            assertTrue(buffIds(battle, 2).isEmpty());
        }
    }

    /** 三级夏亚在队友印记清除前检查死亡事件，活着的原施加者获得长期施疗。 */
    @Test
    void xayahDeathListenerUsesLivingOriginalCasterAndTheFallenAllyMark() {
        var battle = new HeroBattleHealingExecutor(rules, List.of(
                fighter(1, 1, 8, 10000, new Skill(104050140, 0), new Skill(104050141, 3)),
                fighter(2, 1, 2, 1, new Skill(101050200, 0)),
                fighter(3, 2, 1, 10000, new Skill(101050200, 0))));
        bind(battle, 1, 10405014, 200);
        bind(battle, 2, 10105020, 200);
        bind(battle, 3, 10105020, 2000);
        battle.beginRound(1, List.of(1, 2, 3), elements, chance -> chance >= 1D);
        battle.act(1, 3, 100, elements, chance -> chance >= 1D);
        assertEquals(List.of(4141303, 4141403), buffIds(battle, 2));

        battle.attack(3, 2, elements, chance -> chance >= 1D);
        assertEquals(0, battle.state(2).hp());
        assertTrue(buffIds(battle, 1).contains(4141603));
        assertFalse(buffIds(battle, 2).contains(4141303));
        assertEquals(1500, rules.controlAttribute(4141603).amount());
    }

    /** 莫露可的延迟伤害和自身减伤在原到期回合执行各自等级配置。 */
    @Test
    void morukoAppliesTheTwoHighLevelDelayedEffectsAtExpiry() {
        for (int level : List.of(2, 3)) {
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    fighter(1, 1, 1, 10000, new Skill(105050070, 0), new Skill(105050071, level)),
                    fighter(2, 2, 8, 10000, new Skill(101050200, 0))));
            bind(battle, 1, 10505007, 200);
            bind(battle, 2, 10105020, 200);
            var order = List.of(1, 2);
            battle.beginRound(1, order, elements, chance -> chance >= 1D);
            battle.act(1, 2, 100, elements, chance -> chance >= 1D);
            assertEquals(List.of(5071300 + level, 5071500 + level), buffIds(battle, 2));
            battle.beginRound(2, order, elements, chance -> chance >= 1D);
            assertFalse(battle.damages().stream().anyMatch(hit -> hit.buffId() == 5071400 + level));

            battle.beginRound(3, order, elements, chance -> chance >= 1D);
            assertTrue(battle.damages().stream().anyMatch(hit -> hit.buffId() == 5071400 + level
                    && hit.targetId() == 2 && hit.incoming() > 0));
            assertEquals(List.of(5071600 + level), buffIds(battle, 1));
            assertTrue(buffIds(battle, 2).isEmpty());
        }
    }

    /** 黑暗切割者高等级先击倒原目标，再重选存活敌人追加同档攻击。 */
    @Test
    void darkCutterFollowsADeathWithTheSameLevelAttack() {
        for (int level : List.of(2, 3)) {
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    fighter(1, 1, 1, 10000, new Skill(105050050, 0), new Skill(105050053, level)),
                    fighter(2, 2, 1, 1, new Skill(101050200, 0)),
                    fighter(3, 2, 2, 10000, new Skill(101050200, 0))));
            bind(battle, 1, 10505005, 200);
            bind(battle, 2, 10105020, 200);
            bind(battle, 3, 10105020, 200);
            battle.beginRound(2, List.of(1, 2, 3), elements, chance -> chance >= 1D);
            battle.act(1, 2, 100, elements, chance -> chance >= 1D);

            assertEquals(0, battle.state(2).hp());
            assertTrue(battle.damages().stream().anyMatch(hit -> hit.buffId() == 5055200 + level
                    && hit.targetId() == 3 && hit.incoming() > 0));
        }
    }

    /** 非致死伤害跨过 50% 时，高等级一次性监听按原目标安装减伤或护甲。 */
    @Test
    void highLevelHealthThresholdDispatchesTheOriginalShieldingAttributes() {
        for (int passive : List.of(102050104, 102050184)) {
            boolean teamArmor = passive == 102050184;
            for (int level : List.of(2, 3)) {
                var battle = new HeroBattleHealingExecutor(rules, List.of(
                        fighter(1, 1, 1, 6500, new Skill(102050100, 0)),
                        fighter(2, 1, 8, 10000, new Skill(101050200, 0)),
                        fighter(3, 2, 1, 10000, new Skill(101050200, 0))));
                bind(battle, 1, teamArmor ? 10205018 : 10205010, 200);
                bind(battle, 2, 10105020, 200);
                bind(battle, 3, 10105020, 3000);
                battle.initializePassive(1, passive, level);
                battle.beginRound(1, List.of(1, 2, 3), elements, chance -> chance >= 1D);
                battle.attack(3, 1, elements, chance -> chance >= 1D);

                int effect = (teamArmor ? 2184300 : 2104300) + level;
                assertTrue(battle.state(1).hp() > 0 && battle.state(1).hp() < 5000);
                assertTrue(buffIds(battle, 1).contains(effect));
                assertEquals(teamArmor, buffIds(battle, 2).contains(effect));
                var definition = rules.controlAttribute(effect);
                assertEquals(teamArmor ? 202 : 291, definition.attribute());
                assertEquals(teamArmor ? 4000 + level * 2000 : 2000 + level * 1000, definition.amount());
                battle.expireAt(4);
                assertFalse(buffIds(battle, 1).contains(effect));
            }
        }
    }

    /** 受到暴击后，高等级诺薇亚之心把自身普攻排入原反击队列。 */
    @Test
    void highLevelNoviaCountersCriticalHitsWithTheRegularAttack() {
        for (int level : List.of(2, 3)) {
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    fighter(1, 1, 1, 10000, new Skill(102050180, 0)),
                    fighter(2, 2, 1, 10000, new Skill(101050200, 0))));
            bind(battle, 1, 10205018, 200);
            battle.bindCombatData(2, 10105020, Map.of(220, 200L, 150, 500L, 207, 10000L));
            battle.initializePassive(1, 102050183, level);
            battle.beginRound(1, List.of(1, 2), elements, chance -> chance >= 1D);
            battle.attack(2, 1, elements, chance -> chance >= 1D);

            assertTrue(battle.damages().stream().anyMatch(hit -> hit.sourceId() == 2 && hit.targetId() == 1));
            assertTrue(battle.damages().stream().anyMatch(hit -> hit.sourceId() == 1 && hit.targetId() == 2));
        }
    }

    /** 战争女神高档死亡触发仍可消耗限次，按旧攻击比例治疗幸存队友。 */
    @Test
    void higherLevelWarGoddessDeathHealsLivingAlliesOnce() {
        for (int level : List.of(2, 3)) {
            var battle = new HeroBattleHealingExecutor(rules, List.of(
                    fighter(1, 1, 1, 1, new Skill(104050050, 0)),
                    fighter(2, 1, 8, 5000, new Skill(101050200, 0)),
                    fighter(3, 2, 1, 10000, new Skill(101050200, 0))));
            bind(battle, 1, 10405005, 200);
            bind(battle, 2, 10105020, 200);
            bind(battle, 3, 10105020, 2000);
            battle.initializePassive(1, 104050054, level);
            battle.beginRound(1, List.of(1, 2, 3), elements, chance -> chance >= 1D);
            battle.attack(3, 1, elements, chance -> chance >= 1D);

            assertEquals(0, battle.state(1).hp());
            var healing = battle.recoveries();
            assertEquals(1, healing.size());
            assertEquals(4054300 + level, healing.getFirst().buffId());
            assertEquals(2, healing.getFirst().targetId());
            assertEquals(level == 2 ? 400L : 480L, healing.getFirst().base());
        }
    }

    /** 创建保留真实技能排期的单位，指定初始伤势以观察治疗和死亡变化。 */
    private State fighter(int id, int faction, int position, long hp, Skill... skills) {
        return new State(new Actor(id, rules.battleSchedule(List.of(skills))), faction, position,
                hp, 10000, 200, 0, 0, 0);
    }

    /** 为正式目标和伤害选择绑定原模板，并用稳定基础属性控制其他随机因素。 */
    private void bind(HeroBattleHealingExecutor battle, int id, int template, long attack) {
        battle.bindCombatData(id, template, Map.of(220, attack, 150, 500L));
    }

    /** 读取实例安装顺序，便于断言驱散移除哪一项。 */
    private static List<Integer> buffIds(HeroBattleHealingExecutor battle, int id) {
        return battle.buffs(id).stream().map(entry -> entry.spec().id()).toList();
    }
}
