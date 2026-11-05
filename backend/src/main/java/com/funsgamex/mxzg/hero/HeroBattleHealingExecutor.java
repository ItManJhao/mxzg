/**
 * 每场战斗独立的治疗与治疗护盾执行器：配置→目标→事件→生命/Buff变化。
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

    /** 每个单位自己的Buff实例集合，与Actor监听通过实例编号关联。 */
    private final Map<Integer, HeroBattleBuffState> buffs = new LinkedHashMap<>();
    /** 当前回合，从入场0开始，由战场在到期检查时点显式推进。 */
    private int round;
    /** 本场Buff编号单调递增，实例移除后也不复用，失败时回滚编号。 */
    private long nextBuffInstance = 1;
    /** 已完成的移除记录，区分到期、驱散和替换；失败时回滚。 */
    private final List<Removal> removals = new ArrayList<>();

    /** 移除前完整实例与原因；不等同于完整战报协议。 */
    public record Removal(int unitId, HeroBattleBuffState.Entry entry, String reason) {}

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
            buffs.put(unit.actor().id(), new HeroBattleBuffState());
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
                var entry = installBuff(unitId, unitId, rules.battleBuff(definition.buffId()), 0);
                actor.listen(new Listener(entry.instanceId(), unitId, definition));
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
                    || source.actor().interrupted(target.id())) {
                    continue;
                }
                var spec = rules.battleBuff(effect.buffId());
                if (spec.type() == 1008) {
                    // 护盾不受禁疗限制；此分支在下方治疗禁疗判断之前执行。
                    long value = percent(source.actor().lastTreatment(), effect.attackRate());
                    if (value == Long.MIN_VALUE) {
                        throw new IllegalArgumentException("护盾数值绝对值溢出");
                    }
                    installBuff(source.actor().id(), target.id(), spec, Math.abs(value));
                    continue;
                }
                if (defender.actor().hasControl(1009)) {
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

    /** 安装支持的逻辑Buff，先同步移除旧监听；护盾重用时保留原实例身份。 */
    private HeroBattleBuffState.Entry installBuff(int sourceId, int targetId,
                                                  HeroBattleBuffState.Spec spec, long value) {
        Actor actor = require(targetId).actor();
        var state = buffs.get(targetId);
        long next = Math.max(actor.nextListenerId(), nextBuffInstance);
        nextBuffInstance = Math.addExact(next, 1);
        var change = state.add(next, sourceId, round, spec, value);
        removed(targetId, change.removed(), "replace");
        return change.current();
    }

    /** 战场在旧到期检查时点调用；只推进本批无周期效果的Buff，不模拟整回合战斗。 */
    public void expireAt(int currentRound) {
        if (currentRound < round || currentRound < 0) {
            throw new IllegalArgumentException("Buff回合不能倒退");
        }
        transaction(() -> {
            started = true;
            round = currentRound;
            for (var id : units.keySet()) {
                removed(id, buffs.get(id).expire(round), "expire");
            }
        });
    }

    /** 驱散指定效果类别的可驱散实例；绝对到期回合>=999的实例按旧规则保留。 */
    public void dispel(int targetId, int effect) {
        require(targetId);
        if (effect < 0 || effect > 3) {
            throw new IllegalArgumentException("驱散类别无效");
        }
        transaction(() -> removed(targetId, buffs.get(targetId).dispel(effect), "dispel"));
    }

    /** 统一移除关联监听并保存原因；暂不安装209到期触发等未实现的移除回调。 */
    private void removed(int unitId, List<HeroBattleBuffState.Entry> entries, String reason) {
        for (var entry : entries) {
            require(unitId).actor().remove(entry.instanceId());
            removals.add(new Removal(unitId, entry, reason));
        }
    }

    /** 返回当前单位的独立Buff实例快照，包括护盾值和绝对期限。 */
    public List<HeroBattleBuffState.Entry> buffs(int unitId) {
        require(unitId);
        return buffs.get(unitId).snapshot();
    }

    /** 返回成功移除记录，不暴露可写列表。 */
    public List<Removal> removals() {
        return List.copyOf(removals);
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
        var buffBefore = new HashMap<Integer, List<HeroBattleBuffState.Entry>>();
        int roundBefore = round;
        long nextInstanceBefore = nextBuffInstance;
        int removalSize = removals.size();
        int recoverySize = recoveries.size();
        int signalSize = signals.size();
        var installedBefore = root ? new HashSet<>(installed) : null;
        boolean startedBefore = started;
        if (root) {
            steps = 0;
            buffs.forEach((id, state) -> buffBefore.put(id, state.snapshot()));
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
                buffBefore.forEach((id, state) -> buffs.get(id).restore(state));
                round = roundBefore;
                nextBuffInstance = nextInstanceBefore;
                removals.subList(removalSize, removals.size()).clear();
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
