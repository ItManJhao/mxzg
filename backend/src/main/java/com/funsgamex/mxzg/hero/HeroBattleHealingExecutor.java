/**
 * 每场战斗独立的130号治疗动作执行器：真实配置→目标选择→禁疗检查→生命变化记录。
 * 支持通用治疗事件及自身被动安装；不支持控制改选/临时目标数；不写资产、不生成奖励，不代表完整技能引擎。
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

    /** 本场事件调度器，与本场Actor使用同一实例。 */
    private final HeroBattleEventProcessor events = new HeroBattleEventProcessor();
    /** 成功发生的事件顺序，失败事务会一起撤回。 */
    private final List<Signal> signals = new ArrayList<>();
    /** 单位编号与被动技能编号组成安装键；每场只安装一次，不以重复打开页面叠层。 */
    private final Set<String> installed = new HashSet<>();
    /** 当前嵌套调用深度，0表示没有正在执行的事务。 */
    private int depth;
    /** 单次根调用的动作/事件总数，用于明确拒绝循环配置，不截断后返回成功。 */
    private int steps;
    /** 首次动作或事件开始后不可追加入场被动。 */
    private boolean started;

    /** 事件时点的双方血量与携带者最近治疗量，便于核对先事件后回血。 */
    public record Signal(int event, int carrierId, int targetId, long carrierHp,
                         long targetHp, long lastTreatment) {}

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

    /** 入场安装已预检的完整被动链，不治疗、不触发主动技能使用事件。 */
    public void initializePassive(int unitId, int skillId, int level) {
        if (started) {
            throw new IllegalStateException("战斗动作已开始，不能重新安装入场被动");
        }
        var definitions = rules.battleHealingPassive(skillId, level);
        Actor actor = require(unitId).actor();
        String key = unitId + ":" + skillId;
        if (installed.contains(key)) {
            throw new IllegalArgumentException("被动技能已安装：" + key);
        }
        transaction(() -> {
            for (var definition : definitions) {
                actor.listen(new Listener(actor.nextListenerId(), unitId, definition));
            }
            installed.add(key);
        });
    }

    /** 战场提交真实事件；171由伤害流程提供，本入口不伪造受击或扣血。 */
    public void signal(int event, int carrierId, int targetId) {
        transaction(() -> {
            started = true;
            emit(event, require(carrierId).actor(), require(targetId).actor());
        });
    }

    /** 执行普通触发动作，嵌套事件共享事务；未知效果或循环失败时全部撤回。 */
    @Override
    public void art(Invocation invocation) {
        transaction(() -> {
            started = true;
            executeArt(invocation);
        });
    }

    /** 沿旧顺序分发186、206，读取可被嵌套覆盖的最近治疗量，再回血并分发311。 */
    private void executeArt(Invocation invocation) {
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
        for (var effect : plan.effects()) {
            for (var target : targets) {
                State defender = require(target.id());
                if (defender.hp() <= 0 || defender.actor().isDead()
                    || source.actor().interrupted(target.id()) || defender.actor().hasControl(1009)) {
                    continue;
                }
                long base = percent(source.attack(), effect.attackRate());
                if (base <= 0) {
                    continue;
                }
                source.actor().treatment(base);
                emit(186, source.actor(), defender.actor());
                emit(206, defender.actor(), source.actor());
                // 嵌套事件可能治疗同一目标或覆盖施法者最近治疗值，必须重新读取。
                defender = require(target.id());
                long amount = Math.addExact(source.actor().lastTreatment(), source.treatment());
                amount = Math.addExact(amount, percent(amount, source.treatmentRate()));
                amount = Math.addExact(amount, percent(amount, defender.receivedRate()));
                long actual = Math.min(amount, defender.maxHp() - defender.hp());
                long nextHp = Math.addExact(defender.hp(), actual);
                if (nextHp <= 0) {
                    throw new UnsupportedOperationException("负治疗跨越死亡边界尚未支持");
                }
                units.put(target.id(), defender.withHp(nextHp));
                recoveries.add(new Recovery(effect.buffId(), source.actor().id(), target.id(), base, amount, actual));
                emit(311, source.actor(), defender.actor());
            }
            source.actor().restore();
        }
    }

    /** 保存可核对的事件时点，然后交给已有事件处理器；311不允许安装未支持的清心监听。 */
    private void emit(int event, Actor carrier, Actor target) {
        if (++steps > 128) {
            throw new IllegalStateException("治疗事件链超过当前执行上限，可能存在循环");
        }
        signals.add(new Signal(event, carrier.id(), target.id(), require(carrier.id()).hp(),
            require(target.id()).hp(), carrier.lastTreatment()));
        events.dispatch(event, carrier, target.id(), this);
    }

    /** 事件顺序不可变快照；记录事件发生不代表该事件存在监听。 */
    public List<Signal> signals() {
        return List.copyOf(signals);
    }

    /** 根调用保留回滚点；嵌套治疗失败时撤回血量、记录、监听与临时治疗量。 */
    private void transaction(Runnable action) {
        boolean root = depth == 0;
        var before = root ? new LinkedHashMap<>(units) : null;
        var checkpoints = new HashMap<Actor, Actor.Checkpoint>();
        int recoverySize = recoveries.size();
        int signalSize = signals.size();
        var installedBefore = root ? new HashSet<>(installed) : null;
        boolean startedBefore = started;
        if (root) {
            steps = 0;
            units.values().forEach(unit -> checkpoints.put(unit.actor(), unit.actor().checkpoint()));
        }
        depth++;
        try {
            if (depth > 32) {
                throw new IllegalStateException("治疗动作嵌套超过当前执行上限");
            }
            action.run();
        } catch (RuntimeException error) {
            if (root) {
                units.clear();
                units.putAll(before);
                checkpoints.forEach(Actor::rollback);
                recoveries.subList(recoverySize, recoveries.size()).clear();
                signals.subList(signalSize, signals.size()).clear();
                installed.clear();
                installed.addAll(installedBefore);
                started = startedBefore;
            }
            throw error;
        } finally {
            depth--;
        }
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
