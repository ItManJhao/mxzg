/**
 * 每场战斗独立的130号治疗动作执行器：真实配置→目标选择→禁疗检查→生命变化记录。
 * 只支持无治疗监听/控制改选/临时目标数的普通动作；不写资产、不生成奖励，不代表完整技能引擎。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;

public final class HeroBattleHealingExecutor implements Executor {
    /** 复用现有同源配置索引，不另建缓存。 */
    private final HeroSkillPanelRules rules;
    /** 本场单位按传入顺序存放；血量变化仅保存在本执行器。 */
    private final Map<Integer, State> units = new LinkedHashMap<>();
    /** 已成功执行的治疗记录，与实际血量增量分别保存。 */
    private final List<Recovery> recoveries = new ArrayList<>();

    /** 即时治疗配置，比例为万分比。 */
    public record Effect(int buffId, int attackRate) {}
    /** 已验证的完整动作，避免混有未知效果时执行一半。 */
    public record Plan(HeroBattleTargetUtils.Plan targets, List<Effect> effects) {
        /** 防止调用方修改预检后的效果顺序。 */
        public Plan {
            effects = List.copyOf(effects);
        }
    }
    /** 本场状态；attack及治疗属性是当前战斗折算值，不能再次乘英雄面板比例。 */
    public record State(Actor actor, int faction, int position, long hp, long maxHp,
                        long attack, long treatment, long treatmentRate, long receivedRate) {
        /** 当前子集仅接受生命上限有效的英雄单位。 */
        public State {
            Objects.requireNonNull(actor);
            if (position <= 0 || maxHp <= 0 || hp < 0 || hp > maxHp) {
                throw new IllegalArgumentException("治疗单位状态无效");
            }
        }

        /** 保持单位与属性不变，仅产生新的本场生命快照。 */
        private State withHp(long value) {
            return new State(actor, faction, position, value, maxHp, attack,
                treatment, treatmentRate, receivedRate);
        }

        /** 复用旧选目标规则所需的最小属性。 */
        private HeroBattleTargetUtils.Unit target() {
            return new HeroBattleTargetUtils.Unit(actor.id(), faction, position, attack);
        }
    }
    /** 基础治疗、战报治疗值、实际生命变化；满血时后者可为0。 */
    public record Recovery(int buffId, int sourceId, int targetId, long base,
                           long reported, long actual) {}

    /** 创建独立战场；重复单位编号拒绝，避免状态互相覆盖。 */
    public HeroBattleHealingExecutor(HeroSkillPanelRules rules, List<State> initial) {
        this.rules = Objects.requireNonNull(rules);
        for (var unit : initial) {
            if (units.put(unit.actor().id(), unit) != null) {
                throw new IllegalArgumentException("治疗战场单位编号重复");
            }
        }
    }

    /** 尚未接入完整技能/反击调度；明确拒绝，不能用单个治疗动作伪造技能完成。 */
    @Override
    public void skill(Actor actor, HeroBattleSkillUtils.Skill skill) {
        throw new UnsupportedOperationException("治疗执行器尚不支持整组技能调度");
    }

    /** 执行普通触发动作；配置及全部结果先计算，成功后一次提交本场血量和记录。 */
    @Override
    public void art(Invocation invocation) {
        Plan plan = rules.battleHealing(invocation.artId());
        State source = require(invocation.sourceId());
        State context = require(invocation.targetContext());
        if (source.actor().hasControl(1011) || source.actor().hasControl(1013)
            || source.actor().hasControl(1015)) {
            throw new UnsupportedOperationException("治疗动作尚未支持控制改选");
        }
        var living = units.values().stream()
            .filter(unit -> unit.hp() > 0 && !unit.actor().isDead()).map(State::target).toList();
        var targets = HeroBattleTargetUtils.select(plan.targets(), source.target(), living,
            List.of(context.target()), false);
        var staged = new LinkedHashMap<>(units);
        var records = new ArrayList<Recovery>();
        boolean firstEffect = true;
        for (var effect : plan.effects()) {
            for (var target : targets) {
                State defender = staged.get(target.id());
                if (defender.hp() <= 0 || defender.actor().isDead()
                    || (firstEffect && source.actor().interrupted(target.id())) || defender.actor().hasControl(1009)) {
                    continue;
                }
                long base = percent(source.attack(), effect.attackRate());
                if (base <= 0) {
                    continue;
                }
                long amount = Math.addExact(base, source.treatment());
                amount = Math.addExact(amount, percent(amount, source.treatmentRate()));
                amount = Math.addExact(amount, percent(amount, defender.receivedRate()));
                // 旧HeroDo只按缺失生命封顶，BattleContext记录的仍为封顶前治疗值。
                long actual = Math.min(amount, defender.maxHp() - defender.hp());
                long nextHp = Math.addExact(defender.hp(), actual);
                if (nextHp <= 0) {
                    throw new UnsupportedOperationException("负治疗跨越死亡边界尚未支持");
                }
                staged.put(target.id(), defender.withHp(nextHp));
                records.add(new Recovery(effect.buffId(), source.actor().id(), target.id(), base, amount, actual));
            }
            // 旧executeBuffArt在每个Buff后清中断；暂存计算避免失败时修改实际集合。
            firstEffect = false;
        }
        source.actor().restore();
        units.clear();
        units.putAll(staged);
        recoveries.addAll(records);
    }

    /** 返回当前生命快照，供战场或测试读取，不暴露可写状态Map。 */
    public State state(int id) {
        return require(id);
    }

    /** 返回不可变的治疗记录快照。 */
    public List<Recovery> recoveries() {
        return List.copyOf(recoveries);
    }

    /** 不存在的来源/上下文不能猜测为施法者自身。 */
    private State require(int id) {
        State unit = units.get(id);
        if (unit == null) {
            throw new IllegalArgumentException("治疗战场单位不存在：" + id);
        }
        return unit;
    }

    /** 沿旧AttributeUtil逐步向零取整，溢出拒绝，不写入损坏状态。 */
    private static long percent(long value, long rate) {
        double result = value * (rate / 10000D);
        if (!Double.isFinite(result) || result >= 0x1p63 || result < -0x1p63) {
            throw new IllegalArgumentException("治疗数值溢出");
        }
        return (long) result;
    }
}
