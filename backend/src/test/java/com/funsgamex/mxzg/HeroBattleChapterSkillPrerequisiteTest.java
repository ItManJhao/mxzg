/**
 * 验证深入主线所需的回合治疗、中毒与职业追击。
 * 使用原技能表和明确的双单位属性夹具，不访问玩家数据。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleElementRules;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.Actor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Damage;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.State;
import com.funsgamex.mxzg.hero.HeroEvolutionRules.Skill;
import com.funsgamex.mxzg.hero.HeroSkillPanelRules;
import java.util.List;
import java.util.Map;
import java.util.function.DoublePredicate;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class HeroBattleChapterSkillPrerequisiteTest {
    /** 真实元素表及技能表由同一读取器装配。 */
    private final ObjectMapper mapper = new ObjectMapper();
    /** 固定将正在核对的控制与普通命中分开，避免随机掩盖后续动作。 */
    private final HeroBattleElementRules elements = new HeroBattleElementRules(mapper);

    /** 创建可执行真实技能的切片战场；施法者初始损血，守方职业由原模板提供。 */
    private HeroBattleHealingExecutor engine(int source, int target, int active, int general) {
        return engine(source, target, active, general, 1);
    }

    /** 为专项选择技能原等级，守方始终使用原模板职业。 */
    private HeroBattleHealingExecutor engine(int source, int target, int active, int general, int skillLevel) {
        var rules = new HeroSkillPanelRules(mapper);
        var skills = rules.battleSchedule(List.of(new Skill(active, skillLevel), new Skill(general, 0)));
        var engine = new HeroBattleHealingExecutor(rules, List.of(
            new State(new Actor(1, skills), 1, 2, 1000, 10000, 1000, 0, 0, 0),
            new State(new Actor(2, List.of()), 2, 2, 10000, 10000, 0, 0, 0, 0)));
        engine.bindCombatData(1, source, Map.of(220, 1000L, 150, 500L));
        engine.bindCombatData(2, target, Map.of(150, 500L));
        return engine;
    }

    /** 以真实第1回合主动触发已配置伤害、控制和后续。 */
    private void cast(HeroBattleHealingExecutor engine, DoublePredicate decision) {
        engine.beginRound(1, List.of(1, 2), elements, decision);
        engine.act(1, 2, 100, elements, decision);
    }

    /** 森镜之灵的原技能保留中毒安装与坦克追击，102号追击按来源攻击上限封顶。 */
    @Test
    void poisonTicksAndMaximumHpStrikeUsesConfiguredCap() {
        var engine = engine(10305008, 10504012, 103050081, 103050080);
        DoublePredicate hit = probability -> probability >= 0.5D;
        cast(engine, hit);
        assertTrue(engine.buffs(2).stream().anyMatch(entry -> entry.spec().id() == 3081301));
        var strike = engine.damages().stream().filter(damage -> damage.buffId() == 3081501).findFirst().orElseThrow();
        assertEquals(100L, strike.incoming());
        assertTrue(engine.damages().stream().noneMatch(damage -> damage.buffId() == 3081301));
        engine.beginRound(2, List.of(1, 2), elements, hit);
        assertEquals(3081301, engine.damages().getLast().buffId());
        assertEquals(200L, engine.damages().getLast().incoming());
    }

    /** 比例治疗沿原回合监听对携带者执行，并读取施加者该回合的攻击。 */
    @Test
    void roundTreatmentUsesCurrentAttackAndOriginalCarrier() {
        var engine = engine(10305006, 10504012, 103050061, 103050060);
        DoublePredicate hit = probability -> probability >= 0.5D;
        cast(engine, hit);
        assertEquals(1000L, engine.state(1).hp());
        assertTrue(engine.buffs(1).stream().anyMatch(entry -> entry.spec().id() == 3061301));
        engine.setOnceAttribute(1, 220, 500L);
        engine.beginRound(2, List.of(1, 2), elements, hit);
        var recovery = engine.recoveries().getLast();
        assertEquals(3061401, recovery.buffId());
        assertEquals(1, recovery.targetId());
        assertEquals(200L, recovery.base());
    }

    /** 艾妮利娅必须实际命中眩晕并匹配职业1才增加追击，主伤即使一段命中也不足以触发。 */
    @Test
    void stunFollowupRequiresAppliedControlAndMatchingJob() {
        var stunned = engine(10405008, 10305008, 104050081, 104050080);
        cast(stunned, probability -> probability >= 0.3D);
        assertEquals(4081401, stunned.lastControl(2).spec().id());
        assertTrue(stunned.damages().stream().map(Damage::buffId).anyMatch(id -> id == 4081601));

        var resisted = engine(10405008, 10305008, 104050081, 104050080);
        cast(resisted, probability -> probability >= 0.5D);
        assertNull(resisted.lastControl(2));
        assertTrue(resisted.damages().stream().map(Damage::buffId).noneMatch(id -> id == 4081601));

        var differentJob = engine(10405008, 10504012, 104050081, 104050080);
        cast(differentJob, probability -> probability >= 0.3D);
        assertEquals(4081401, differentJob.lastControl(2).spec().id());
        assertTrue(differentJob.damages().stream().map(Damage::buffId).noneMatch(id -> id == 4081601));
    }

    /** 亚瑟的两条后续按目标职业分别使用原概率，条件不改变已经结算的主体伤害。 */
    @Test
    void arthurUsesDifferentStunChanceByTargetJob() {
        var other = engine(10205009, 10101001, 102050091, 102050090);
        cast(other, probability -> probability >= 0.5D);
        assertNull(other.lastControl(2));
        assertTrue(other.damages().stream().anyMatch(damage -> damage.buffId() == 2091301));

        var fighter = engine(10205009, 10104005, 102050091, 102050090);
        cast(fighter, probability -> probability >= 0.5D);
        assertEquals(2091701, fighter.lastControl(2).spec().id());

        var lowerThreshold = engine(10205009, 10101001, 102050091, 102050090);
        cast(lowerThreshold, probability -> probability >= 0.35D);
        assertEquals(2091601, lowerThreshold.lastControl(2).spec().id());
    }

    /** 菲林德之翼三级只给职业4追加眩晕与独立持续伤害，安装回合不提前扣血。 */
    @Test
    void filindAppliesStunAndPeriodicDamageToJobFourOnly() {
        DoublePredicate hit = probability -> probability >= 0.5D;
        var selected = engine(10305018, 10304004, 103050181, 103050180, 3);
        cast(selected, hit);
        assertEquals(3181503, selected.lastControl(2).spec().id());
        assertTrue(selected.buffs(2).stream().anyMatch(entry -> entry.spec().id() == 3181603));
        assertFalse(selected.damages().stream().anyMatch(damage -> damage.buffId() == 3181603));
        selected.beginRound(2, List.of(1, 2), elements, hit);
        assertEquals(3181603, selected.damages().getLast().buffId());
        assertEquals(650L, selected.damages().getLast().incoming());

        var other = engine(10305018, 10101001, 103050181, 103050180, 3);
        cast(other, hit);
        assertNull(other.lastControl(2));
        assertFalse(other.buffs(2).stream().anyMatch(entry -> entry.spec().id() == 3181603));
        assertTrue(other.damages().stream().anyMatch(damage -> damage.buffId() == 3181303));
    }
}
