/**
 * 每场战斗独立的治疗/契约及普通与105伤害子集执行器：配置→目标→事件→生命/Buff变化。
 * 支持通用治疗、固定属性、承伤阈值、攻击偷取、职业条件、控制及格挡盾、庇护和火灵守护。
 * 控制改选和临时目标数仍未接入。
 * 不写资产、不生成奖励，配置预检以外的效果仍拒绝，不代表完整技能引擎。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import com.funsgamex.mxzg.hero.HeroBattleEventProcessor.*;

public final class HeroBattleHealingExecutor implements Executor {
    /** 清心所需随机决策；默认整数概率按用户授权推算并标为待审，测试可注入固定决策。 */
    public interface RandomDecision {
        /** 按旧整数概率参数返回命中结果；参数不在此擅自归一化。 */
        boolean hit(int configuredRate);
        /** 返回[0,bound)下标，沿旧RandomUtil.randomList无放回取样。 */
        int index(int bound);
    }

    /** 可控随机入口；默认使用标记待审的推算算法，测试可注入确定性结果。 */
    private final RandomDecision random;

    /** 复用现有同源配置索引，不另建缓存。 */
    private final HeroSkillPanelRules rules;
    /** 本场单位按传入顺序存放；血量变化仅保存在本执行器。 */
    private final Map<Integer, State> units = new LinkedHashMap<>();
    /** 已成功执行的治疗记录，与实际血量增量分别保存。 */
    private final List<Recovery> recoveries = new ArrayList<>();
    /** 记录敌方标记收到的回合伤害，按旧规则在持续伤害阶段后由携带者一次消费。 */
    private final HeroBattlePeriodicRecovery periodicRecovery = new HeroBattlePeriodicRecovery();
    /** 速度较慢分支累积下次显式选择器额外目标，只在对应单位实际选目标时清掉。 */
    private final Map<Integer, Integer> extraTargets = new HashMap<>();

    /** 每个单位自己的Buff实例集合，与Actor监听通过实例编号关联。 */
    private final Map<Integer, HeroBattleBuffState> buffs = new LinkedHashMap<>();
    /** 沿旧lastControlBuff保留最近成功控制实例，供后续控制触发条件读取；移除不重写历史。 */
    private final Map<Integer, HeroBattleBuffState.Entry> lastControls = new HashMap<>();
    /** 目标到最近移除实例；沿旧lastExpiredBuff所有移除均更新，仅到期检查发送209，根失败恢复。 */
    private final Map<Integer, HeroBattleBuffState.Entry> lastExpired = new HashMap<>();
    /** 战场单位的真实模板身份与独立属性状态；动作失败时属性消费一起恢复。 */
    private final Map<Integer, CombatData> combat = new LinkedHashMap<>();
    /** 模板决定元素/职业，属性来自该单位战斗输入；生命周期与当前执行器一致。 */
    private record CombatData(HeroSkillPanelRules.BattleIdentity identity, HeroBattleAttributeState attributes) {}
    /** 普通伤害计算结果记录，包含未命中；事务失败时撤回，不作为网络战报。 */
    private final List<HeroBattleDamageAction.Result> ordinaryResults = new ArrayList<>();

    /** 真实投射表现的配置/来源/目标记录；后续战报消费，本批不生成动画。 */
    public record Presentation(int buffId, int sourceId, int targetId) {}
    /** 按动作顺序保留投射表现，根事务失败撤回。 */
    private final List<Presentation> presentations = new ArrayList<>();

    /** 返回当前投射表现记录，不等于前端已播放。 */
    public List<Presentation> presentations() { return List.copyOf(presentations); }

    /** 已支持场景的执行顺序记录；非对应类型的载荷为null，不作为网络协议。 */
    public record Trace(String kind, int round, int sourceId, int targetId, int configId,
                        HeroBattleSkillUtils.Skill skill, Damage damage,
                        HeroBattleBuffState.Entry buff, String reason, Recovery recovery, long speedDelta) {
        /** 非治疗事件不携带治疗记录，保留既有事件构建入口。 */
        public Trace(String kind, int round, int sourceId, int targetId, int configId,
                     HeroBattleSkillUtils.Skill skill, Damage damage, HeroBattleBuffState.Entry buff, String reason) {
            this(kind, round, sourceId, targetId, configId, skill, damage, buff, reason, null);
        }

        /** 原有事件保持零速度增量，只有固定速度Buff的增减记录真实差值。 */
        public Trace(String kind, int round, int sourceId, int targetId, int configId,
                     HeroBattleSkillUtils.Skill skill, Damage damage, HeroBattleBuffState.Entry buff, String reason,
                     Recovery recovery) {
            this(kind, round, sourceId, targetId, configId, skill, damage, buff, reason, recovery, 0);
        }
    }
    /** 本场顺序记录，与根事务一起回滚；不把不同类型的独立列表事后拼接。 */
    private final List<Trace> trace = new ArrayList<>();

    /** 返回不可变执行记录；覆盖技能起止、表现、伤害、治疗和Buff安装/移除。 */
    public List<Trace> trace() {
        return List.copyOf(trace);
    }

    /** 本次完整普攻动作上下文；反击共用配置及随机入口，结束或失败后恢复外层。 */
    private AttackContext attackContext;
    /** 额外普攻动作，按旧队列先进先出；不合并同一单位的多个动作。 */
    private record CounterAction(int source, int target, HeroBattleSkillUtils.Skill skill) {}
    /** 一次根动作及其反击队列，不跨场保存。 */
    private static final class AttackContext {
        /** 普通伤害共享的同源元素配置。 */
        final HeroBattleElementRules elements;
        /** 调用者明确提供的普通伤害判定源。 */
        final java.util.function.DoublePredicate decision;
        /** 当前伤害类型，初始入口显式指定；本子集反击沿用同一类型。 */
        final int damageType;
        /** 待执行反击按产生顺序存放。 */
        final Deque<CounterAction> queue = new ArrayDeque<>();
        /** 当前出手单位编号，每次出手或排队反击开始时替换；其他单位的即时伤害不写入此结果。 */
        int damageSourceId;
        /** 当前单位最近一次普通伤害判定，包含未命中及扣血前的原值；每次出手或反击开始时清空。 */
        HeroBattleDamageAction.Result lastDamage;
        /** 当前单位本次出手已判定的带符号总伤害，供旧伤害换盾使用，不受扣盾或剩余生命影响。 */
        long totalDamage;
        /** 当前技能目标上下文与是否为普攻反击。 */
        int target;
        boolean queued;
        /** 保存动作上下文，不设置默认随机。 */
        AttackContext(HeroBattleElementRules elements, java.util.function.DoublePredicate decision, int damageType) {
            this.elements = elements;
            this.decision = decision;
            this.damageType = damageType;
        }
    }

    /** 当前回合，从入场0开始，由战场在到期检查时点显式推进。 */
    private int round;
    /** 本场Buff编号单调递增，实例移除后也不复用，失败时回滚编号。 */
    private long nextBuffInstance = 1;
    /** 已完成的移除记录，区分到期、驱散和替换；失败时回滚。 */
    private final List<Removal> removals = new ArrayList<>();

    /** 移除前完整实例与原因；不等同于完整战报协议。 */
    public record Removal(int unitId, HeroBattleBuffState.Entry entry, String reason) {}

    /** 当前伤害帧仅在187/188/189和伤害处理期间有效，额外伤害不重入189。 */
    private DamageFrame damageFrame;
    /** 177触发期间使用当前命中的战报伤害；嵌套扣血结束后恢复外层记录。 */
    private Damage healthThresholdDamage;
    /** 成功的伤害记录；根动作失败时与血量及Buff一起回滚。 */
    private final List<Damage> damages = new ArrayList<>();
    /** 配置计算伤害、护盾消耗、旧战报扣血与实际血量变化分别保留。 */
    public record Damage(int buffId, int sourceId, int targetId, long incoming,
                         long absorbed, long reported, long actual, boolean dead) {}
    /** 本次可被契约修改的扣血前伤害绝对量。 */
    private static final class DamageFrame {
        /** 原始伤害配置，额外伤害沿用。 */
        final int buffId;
        /** 扣减前原始伤害；爱德华受击按原始比例计算层数。 */
        final long incoming;
        /** 当前剩余伤害，被199监听减少。 */
        long remaining;
        /** true表示105固定伤害，不消耗旧234格挡盾。 */
        final boolean fixedAttack;
        /** 234将本次HitType改为BLOCK；不改普通计算器独立的原始格挡布尔值。 */
        boolean blockShield;
        /** 保存当前伤害上下文，不创建新的资产状态。 */
        DamageFrame(int buffId, long remaining, boolean fixedAttack) {
            this.buffId = buffId;
            this.incoming = remaining;
            this.remaining = remaining;
            this.fixedAttack = fixedAttack;
        }
    }

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


    }
    /** 供按速度、攻击或状态选择的目标延后读取本场属性，普通定位只读快照。 */
    private HeroBattleTargetUtils.Unit target(State unit) {
        int unitId = unit.actor().id();
        var data = combat.get(unitId);
        java.util.function.LongSupplier speed = data == null ? null : () -> data.attributes().get(101);
        java.util.function.LongSupplier attack = data == null ? null : () -> data.attributes().get(220);
        return new HeroBattleTargetUtils.Unit(unitId, unit.faction(), unit.position(),
            unit.attack(), unit.hp(), unit.maxHp(), speed, attack, type -> hasStatus(unitId, type),
            data == null ? null : data.identity().job());
    }

    /** 基础治疗、战报治疗值、实际生命变化；满血时后者可为0。 */
    public record Recovery(int buffId, int sourceId, int targetId, long base,
                           long reported, long actual) {}

    /** 创建独立战场；重复单位编号拒绝，避免状态互相覆盖。 */
    public HeroBattleHealingExecutor(HeroSkillPanelRules rules, List<State> initial) {
        this(rules, initial, inferredRandom(new Random()));
    }

    /**
     * 待审：旧RandomUtils.isHit(int)缺失，经用户授权参考现有RandomUtil.isHit(double)推算。
     * 暂按整数/10000D且nextDouble<=概率；上线前须对照正式服审查，不宣称已证实等价。
     */
    public static RandomDecision inferredRandom(Random generator) {
        Objects.requireNonNull(generator);
        return new RandomDecision() {
            /** 非正概率不抽样；其余沿现有RandomUtil的<=边界，整数换算部分待审。 */
            public boolean hit(int configuredRate) {
                return configuredRate > 0 && generator.nextDouble() <= configuredRate / 10000D;
            }
            /** 沿已核对的旧RandomUtil.randomList使用[0,bound)下标。 */
            public int index(int bound) {
                return generator.nextInt(bound);
            }
        };
    }

    /** 注入已核对的随机决策，测试可固定命中及选人；不在执行器内隐藏概率规则。 */
    public HeroBattleHealingExecutor(HeroSkillPanelRules rules, List<State> initial, RandomDecision random) {
        this.rules = Objects.requireNonNull(rules);
        this.random = random;
        for (var unit : initial) {
            buffs.put(unit.actor().id(), new HeroBattleBuffState());
            if (units.put(unit.actor().id(), unit) != null) {
                throw new IllegalArgumentException("治疗战场单位编号重复");
            }
        }
    }

    /** 执行预检动作及其条件或随机子链，保留真实表现，根动作失败撤回全部状态。 */
    @Override
    public void skill(Actor actor, HeroBattleSkillUtils.Skill skill) {
        if (attackContext == null) throw new UnsupportedOperationException("普通攻击缺少根动作上下文");
        var source = require(actor.id());
        if (actor.hasControl(1011) || actor.hasControl(1013) || actor.hasControl(1015)) {
            throw new UnsupportedOperationException("普通攻击控制改选尚未支持");
        }
        trace.add(new Trace("skill.begin", round, actor.id(), attackContext.target,
            skill.skillId(), skill, null, null, ""));
        for (var art : rules.damageSkillArts(skill)) {
            var living = units.values().stream().filter(u -> u.hp() > 0 && !u.actor().isDead()).map(this::target).toList();
            var fallen = art.targets().selectors().contains(5) ? units.values().stream()
                .filter(u -> u.actor().isDead()).map(this::target).toList() : List.<HeroBattleTargetUtils.Unit>of();
            var targets = HeroBattleTargetUtils.select(withExtraTargets(art.targets(), actor.id()), target(source), living, fallen,
                List.of(target(require(attackContext.target))), attackContext.queued, random::index);
            for (int buffId : art.buffs()) {
                if (rules.battleDirectHealing(buffId)) {
                    applyHealingEffects(rules.battleHealing(buffId - 100).effects(), source, targets);
                    continue;
                }
                var attackHealing = rules.attackHealing(buffId);
                if (attackHealing != null) {
                    applyAttackHealing(buffId, attackHealing, source, targets);
                    continue;
                }
                var resurrection = rules.battleResurrection(buffId);
                if (resurrection != null) {
                    for (var target : targets) {
                        resurrect(buffId, resurrection, source, require(target.id()));
                    }
                    continue;
                }
                int healingRate = rules.battleDamageHealingRate(buffId);
                if (healingRate > 0) {
                    applyDamageHealing(buffId, healingRate, source, targets);
                    continue;
                }
                if (rules.battleProjectile(buffId)) {
                    recordPresentation(buffId, actor.id(), targets);
                    continue;
                }
                var branch = rules.battleRandomArt(buffId);
                if (branch != null) {
                    for (var target : targets) {
                        if (!actor.interrupted(target.id()) && require(target.id()).hp() > 0) {
                            var selected = actionDecision().test(branch.chance() / 10000D) ? branch.hit() : branch.miss();
                            applyImmediateArts(List.of(selected), actor.id(), List.of(target));
                        }
                    }
                    continue;
                }
                if (rules.battleRoundListener(buffId) || rules.battleReactiveProtection(buffId) != null) {
                    for (var target : targets) {
                        installBuffListener(buffId, actor.id(), target.id());
                    }
                    continue;
                }
                if (rules.battleFrozen(buffId)) {
                    for (var target : targets) {
                        applyFrozen(buffId, actor.id(), target.id(), attackContext.decision);
                    }
                    continue;
                }
                if (rules.battleDizzy(buffId)) {
                    for (var target : targets) {
                        applyDizzy(buffId, actor.id(), target.id(), attackContext.decision);
                    }
                    continue;
                }
                if (rules.battleSimpleControl(buffId)) {
                    for (var target : targets) {
                        applySimpleControl(buffId, actor.id(), target.id(), attackContext.decision);
                    }
                    continue;
                }
                if (rules.battleJobCondition(buffId)) {
                    applyJobCondition(buffId, actor.id(), targets);
                    actor.restore();
                    continue;
                }
                if (rules.dailyDungeonCondition(buffId)) {
                    applyDailyCondition(buffId, actor.id(), targets);
                    actor.restore();
                    continue;
                }
                if (rules.battleStatusCondition(buffId)) {
                    applyStatusCondition(buffId, actor.id(), targets);
                    actor.restore();
                    continue;
                }
                if (rules.battleBlockShield(buffId)) {
                    for (var target : targets) {
                        applyBlockShield(buffId, actor.id(), target.id());
                    }
                    continue;
                }
                if (rules.dailySoulWard(buffId) != 0) {
                    for (var target : targets) {
                        installBuffListener(buffId, actor.id(), target.id());
                    }
                    continue;
                }
                var detonation = rules.dailyDetonate(buffId);
                if (detonation != null) {
                    for (var target : targets) {
                        detonate(buffId, detonation, actor.id(), target.id());
                    }
                    continue;
                }
                if (rules.battleDirectAttribute(buffId)) {
                    for (var target : targets) {
                        applyDirectAttribute(buffId, actor.id(), target.id());
                    }
                    continue;
                }
                if (rules.battleAttackStealRate(buffId) > 0) {
                    for (var target : targets) {
                        if (require(target.id()).hp() > 0 && !actor.interrupted(target.id())) {
                            installBuff(actor.id(), target.id(), rules.battleBuff(buffId), 0);
                        }
                    }
                    continue;
                }
                if (rules.battleOnceAttribute(buffId)) {
                    applyOnceAttribute(buffId, source, targets);
                    continue;
                }
                int removeCount = rules.battleDebuffRemovalCount(buffId);
                if (removeCount >= 0) {
                    for (var target : targets) {
                        if (require(target.id()).hp() > 0 && !require(target.id()).actor().isDead()
                                && !actor.interrupted(target.id())) {
                            removed(target.id(), buffs.get(target.id()).removeDebuffs(removeCount), "dispel");
                        }
                    }
                    continue;
                }
                if (rules.attackDamageOverTime(buffId) != null) {
                    for (var target : targets) {
                        applyAttackDamageOverTime(buffId, actor.id(), target.id(), attackContext.decision);
                    }
                    continue;
                }
                ordinaryDamage(buffId, actor.id(), targets.stream().map(HeroBattleTargetUtils.Unit::id).toList(),
                    attackContext.damageType, skill.activeType() == 1, actor.skillEnergy(), attackContext.elements, attackContext.decision);
                if (rules.nanakoDamageChain(buffId)) {
                    nanakoFollowup(buffId - 2233200, actor.id(), targets.stream().map(HeroBattleTargetUtils.Unit::id).toList());
                } else if (rules.battleDamageFollowup(buffId)) {
                    // 旧普通伤害的未命中战报也初始化builder，该目标仍进入独立子动作。
                    applyImmediateArts(buffId, actor.id(), targets);
                }
                actor.restore();
            }
        }
        trace.add(new Trace("skill.end", round, actor.id(), attackContext.target,
            skill.skillId(), skill, null, null, ""));
    }

    /** 旧临时数量只在使用显式选择器的有效出手时清除，由最终选择器使用。 */
    private HeroBattleTargetUtils.Plan withExtraTargets(HeroBattleTargetUtils.Plan plan, int sourceId) {
        if (plan.selectors().isEmpty() || (attackContext != null && attackContext.queued)) {
            return plan;
        }
        var extra = extraTargets.remove(sourceId);
        if (extra == null) {
            return plan;
        }
        int base = plan.count() == 0 ? 99 : plan.count();
        return new HeroBattleTargetUtils.Plan(plan.artId(), plan.selectors(), Math.addExact(base, extra), plan.values());
    }

    /** 生命和死亡条件只影响各自的子动作，沿旧命中与中断规则保留继承目标。 */
    private void applyDailyCondition(int buffId, int sourceId, List<HeroBattleTargetUtils.Unit> targets) {
        var source = require(sourceId);
        var selected = new ArrayList<HeroBattleTargetUtils.Unit>();
        for (var candidate : targets) {
            var defender = require(candidate.id());
            if (source.actor().interrupted(candidate.id())) {
                continue;
            }
            boolean matched = buffId == 1083501 ? defender.actor().isDead()
                : defender.hp() > 0 && HeroBattleConditionUtils.apply(rules.battleHpCondition(buffId), source.actor(),
                    new HeroBattleConditionUtils.Health(sourceId, source.hp(), source.maxHp()),
                    new HeroBattleConditionUtils.Health(candidate.id(), defender.hp(), defender.maxHp()), List.of());
            if (matched) {
                selected.add(candidate);
            }
        }
        if (!selected.isEmpty()) {
            applyImmediateArts(buffId, sourceId, selected);
        }
    }

    /** 引爆消费同类到期伤害，沿旧有符号上限比较和固定伤害时点处理。 */
    private void detonate(int buffId, HeroSkillPanelRules.Detonation config, int sourceId, int targetId) {
        var source = require(sourceId);
        if (source.actor().interrupted(targetId) || require(targetId).actor().isDead()) {
            return;
        }
        long rawDamage = 0;
        for (var entry : buffs.get(targetId).snapshot()) {
            if (entry.spec().type() != config.type()) {
                continue;
            }
            var effect = Objects.requireNonNull(rules.attackDamageOverTime(entry.spec().id()));
            long attack = requireCombat(entry.sourceId()).attributes().get(220);
            long signed = Math.negateExact((long) (attack * (effect.rate() / 10000D)));
            rawDamage = Math.addExact(rawDamage, signed);
            removed(targetId, buffs.get(targetId).removeInstance(entry.instanceId()), "detonate");
        }
        long damage = (long) (rawDamage * (config.rate() / 10000D));
        long limit = (long) (requireCombat(sourceId).attributes().get(220) * (config.attackLimit() / 10000D));
        if (damage != 0) {
            deductDamage(buffId, sourceId, targetId, Math.absExact(Math.min(damage, limit)));
        }
    }

    /** 命中后按旧规则安装固定属性，由统一移除回调到期减回。 */
    private void applyDirectAttribute(int buffId, int sourceId, int targetId) {
        var effect = rules.controlAttribute(buffId);
        var source = require(sourceId);
        var target = require(targetId);
        if (target.hp() <= 0 || target.actor().isDead() || source.actor().interrupted(targetId)) {
            return;
        }
        double chance = rules.directAttributeChance(buffId);
        if (chance < 1D && !actionDecision().test(chance)) {
            return;
        }
        installBuff(sourceId, targetId, rules.battleBuff(buffId), 0);
        requireCombat(targetId).attributes().addBase(effect.attribute(), effect.amount());
    }

    /** 旧职业条件只筛选继承目标，根动作在子动作完成后仍保留自身原目标集合。 */
    private void applyJobCondition(int buffId, int sourceId, List<HeroBattleTargetUtils.Unit> targets) {
        var jobs = rules.jobConditionValues(buffId);
        var actor = require(sourceId).actor();
        var selected = new ArrayList<HeroBattleTargetUtils.Unit>();
        for (var target : targets) {
            if (require(target.id()).hp() <= 0 || actor.interrupted(target.id())) {
                continue;
            }
            if (jobs.contains(requireCombat(target.id()).identity().job())) {
                selected.add(target);
            } else {
                actor.interrupt(target.id());
            }
        }
        if (!selected.isEmpty()) {
            applyImmediateArts(buffId, sourceId, selected);
        }
    }

    /** 219只传入携带任一指定状态的存活目标，外层原始目标不随此条件改变。 */
    private void applyStatusCondition(int buffId, int sourceId, List<HeroBattleTargetUtils.Unit> targets) {
        var statuses = rules.statusConditionValues(buffId);
        var source = require(sourceId).actor();
        var selected = targets.stream().filter(target -> require(target.id()).hp() > 0
            && !source.interrupted(target.id()) && statuses.stream().anyMatch(type -> hasStatus(target.id(), type)))
            .toList();
        if (!selected.isEmpty()) {
            applyImmediateArts(buffId, sourceId, selected);
        }
    }

    /** 登记监听的携带者及原施加者，回合效果与受击守护共用绝对期限和移除回调。 */
    private void installBuffListener(int buffId, int sourceId, int targetId) {
        var target = require(targetId);
        if (target.hp() <= 0 || target.actor().isDead() || require(sourceId).actor().interrupted(targetId)) {
            return;
        }
        var entry = installBuff(sourceId, targetId, rules.battleBuff(buffId), 0);
        target.actor().listen(new Listener(entry.instanceId(), sourceId, rules.battleTrigger(buffId)));
    }

    /** 执行已预检的即时子动作，持续伤害安装到条件筛选后的实际存活目标。 */
    private void applyImmediateArts(int buffId, int sourceId, List<HeroBattleTargetUtils.Unit> context) {
        applyImmediateArts(rules.immediateArts(buffId), sourceId, context);
    }

    /** 执行原动作列表，普通子链与随机分支按同一选目标和效果顺序结算。 */
    private void applyImmediateArts(List<HeroSkillPanelRules.DamageArt> arts, int sourceId,
                                    List<HeroBattleTargetUtils.Unit> context) {
        var source = require(sourceId);
        for (var art : arts) {
            var living = units.values().stream().filter(unit -> unit.hp() > 0 && !unit.actor().isDead())
                .map(this::target).toList();
            var targets = HeroBattleTargetUtils.select(art.targets(), target(source), living,
                context, attackContext.queued, random::index);
            for (int childId : art.buffs()) {
                var healing = rules.attackHealing(childId);
                int damageShieldRate = rules.battleDamageShieldRate(childId);
                boolean inertEffect = rules.inertBattleEffect(childId);
                int damageHealingRate = inertEffect ? 0 : rules.battleDamageHealingRate(childId);
                if (rules.battleProjectile(childId)) {
                    recordPresentation(childId, sourceId, targets);
                } else if (healing != null) {
                    applyAttackHealing(childId, healing, source, targets);
                } else if (damageShieldRate > 0) {
                    applyDamageShield(childId, damageShieldRate, source, targets);
                } else if (damageHealingRate > 0) {
                    applyDamageHealing(childId, damageHealingRate, source, targets);
                } else if (rules.battleSimpleControl(childId)) {
                    for (var target : targets) {
                        applySimpleControl(childId, sourceId, target.id(), attackContext.decision);
                    }
                } else if (rules.battleDizzy(childId)) {
                    for (var target : targets) {
                        applyDizzy(childId, sourceId, target.id(), attackContext.decision);
                    }
                } else if (rules.attackDamageOverTime(childId) != null) {
                    for (var target : targets) {
                        applyAttackDamageOverTime(childId, sourceId, target.id(), attackContext.decision);
                    }
                } else if (rules.battleRoundListener(childId) || rules.battleReactiveProtection(childId) != null) {
                    for (var target : targets) {
                        installBuffListener(childId, sourceId, target.id());
                    }
                } else if (rules.battleJobCondition(childId)) {
                    applyJobCondition(childId, sourceId, targets);
                } else if (rules.battleStatusCondition(childId)) {
                    applyStatusCondition(childId, sourceId, targets);
                } else if (rules.dailyDungeonCondition(childId)) {
                    applyDailyCondition(childId, sourceId, targets);
                } else if (!rules.dailySpeedBranches(childId).isEmpty()) {
                    applySpeedBranch(childId, source, targets);
                } else if (rules.battleDirectAttribute(childId)) {
                    for (var target : targets) {
                        applyDirectAttribute(childId, sourceId, target.id());
                    }
                } else if (rules.battleOnceAttribute(childId)) {
                    applyOnceAttribute(childId, source, targets);
                } else if (!inertEffect) {
                    var targetIds = targets.stream().map(HeroBattleTargetUtils.Unit::id).toList();
                    ordinaryDamage(childId, sourceId, targetIds, attackContext.damageType,
                        source.actor().activeSkill(), source.actor().skillEnergy(),
                        attackContext.elements, attackContext.decision);
                    if (rules.nanakoDamageChain(childId)) {
                        nanakoFollowup(childId - 2233200, sourceId, targetIds);
                    } else if (rules.battleDamageFollowup(childId)) {
                        applyImmediateArts(childId, sourceId, targets);
                    }
                }
                source.actor().restore();
            }
        }
    }

    /** 给合格目标登记一次性属性，数值在下一次实际读取时消费。 */
    private void applyOnceAttribute(int buffId, State source, List<HeroBattleTargetUtils.Unit> targets) {
        var effect = rules.onceDamageAttribute(buffId);
        for (var target : targets) {
            if (require(target.id()).hp() > 0 && !source.actor().interrupted(target.id())) {
                installBuff(source.actor().id(), target.id(), rules.battleBuff(buffId), 0);
                requireCombat(target.id()).attributes().addOnce(effect.attribute(), effect.amount());
            }
        }
    }

    /** 保存非逻辑效果的真实目标和动作编号，供客户端回放。 */
    private void recordPresentation(int buffId, int sourceId, List<HeroBattleTargetUtils.Unit> targets) {
        for (var target : targets) {
            presentations.add(new Presentation(buffId, sourceId, target.id()));
            trace.add(new Trace("presentation", round, sourceId, target.id(), buffId, null, null, null, ""));
        }
    }

    /** 244按存活同阵营的最高实时速度比较，并保留原施加者和携带者的动作身份。 */
    private void applySpeedBranch(int buffId, State source, List<HeroBattleTargetUtils.Unit> targets) {
        var choices = rules.dailySpeedBranches(buffId);
        for (var target : targets) {
            var caster = require(target.id());
            long fastest = units.values().stream()
                .filter(unit -> unit.faction() == caster.faction() && !unit.actor().isDead())
                .mapToLong(unit -> currentSpeed(unit.actor().id())).max().orElseThrow();
            int art = currentSpeed(caster.actor().id()) >= fastest ? choices.getFirst() : choices.getLast();
            executeArt(new Invocation(buffId, art, caster.actor().id(), source.actor().id()));
        }
    }

    /** 安装按真实命中次数消耗的格挡盾；来源与监听都绑定本次实例，替换/到期统一清理。 */
    public void applyBlockShield(int buffId, int sourceId, int targetId) {
        rules.blockShieldCount(buffId);
        transaction(() -> {
            var source = require(sourceId);
            var target = require(targetId);
            if (source.hp() <= 0 || target.hp() <= 0 || source.actor().interrupted(targetId)) {
                return;
            }
            var entry = installBuff(sourceId, targetId, rules.battleBuff(buffId), 0);
            target.actor().listen(new Listener(entry.instanceId(), sourceId,
                new Definition(buffId, 234, 0, List.of())));
        });
    }

    /** 执行单位真实普攻并依序排空1301反击；当前为物理伤害子集，主动技能通过act传入真实能量；完整回合调度后续接入。 */
    public void attack(int sourceId, int targetId, HeroBattleElementRules elements,
                       java.util.function.DoublePredicate decision) {
        act(sourceId, targetId, 0, elements, decision);
    }

    /** 使用真实技能排期执行当前出手；能量必须由战场提供，尚不负责整回合能量收支。 */
    public void act(int sourceId, int targetId, long energy, HeroBattleElementRules elements,
                    java.util.function.DoublePredicate decision) {
        if (attackContext != null) throw new IllegalStateException("技能根动作不能嵌套，反击必须入队");
        var actor = require(sourceId).actor();
        require(targetId);
        rules.damageSkillArts(actor.generalAttack());
        var context = new AttackContext(elements, decision, 1);
        context.target = targetId;
        attackContext = context;
        try {
            transaction(() -> {
                started = true;
                executeActorAction(context, actor, null, energy);
                int count = 0;
                while (!context.queue.isEmpty()) {
                    if (++count > 128) throw new IllegalStateException("反击队列超过执行上限");
                    var action = context.queue.removeFirst();
                    context.target = action.target();
                    context.queued = true;
                    executeActorAction(context, require(action.source()).actor(), action.skill(), 0);
                }
            });
        } finally {
            attackContext = null;
        }
    }

    /** 出手或反击前清空上次伤害及累计值；行动前和技能内的伤害都归当前施法者。 */
    private void executeActorAction(AttackContext context, Actor actor, HeroBattleSkillUtils.Skill skill, long energy) {
        context.damageSourceId = actor.id();
        context.lastDamage = null;
        context.totalDamage = 0;
        events.act(actor, round, skill, energy, this);
    }

    /** 入场安装已预检的完整被动链，不治疗、不触发主动技能使用事件。 */
    public void initializePassive(int unitId, int skillId, int level) {
        if (started) {
            throw new IllegalStateException("战斗动作已开始，不能重新安装入场被动");
        }
        if (HeroSkillPanelRules.usesOpeningBattlePassive(skillId)) {
            initializeOpeningPassive(unitId, skillId, level);
            return;
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

    /** 初始化已预检的入场条件、属性和监听；触发条件本身不产生持久Buff。 */
    private void initializeOpeningPassive(int unitId, int skillId, int level) {
        var plans = rules.openingPassiveArts(skillId, level);
        String key = unitId + ":" + skillId;
        if (installed.contains(key)) throw new IllegalArgumentException("被动技能已安装：" + key);
        transaction(() -> {
            var source = require(unitId);
            var living = units.values().stream().filter(u -> u.hp() > 0 && !u.actor().isDead()).map(this::target).toList();
            for (var plan : plans) {
                var targets = HeroBattleTargetUtils.select(plan.targets(), target(source), living,
                    List.of(target(source)), false, random::index);
                for (int buffId : plan.buffs()) {
                    for (var target : targets) {
                        installOpeningPassiveBuff(unitId, target, buffId, level);
                    }
                }
            }
            installed.add(key);
        });
    }

    /** 仅在原站位条件成立时施加子属性，常驻监听保留原施加者。 */
    private void installOpeningPassiveBuff(int sourceId, HeroBattleTargetUtils.Unit target, int buffId, int level) {
        var replacement = rules.battleOrdinaryReplacement(buffId, level);
        if (replacement != null) {
            require(target.id()).actor().replaceOrdinaryAttack(replacement);
            return;
        }
        var position = rules.openingPositionPassive(buffId);
        if (position != null) {
            if (position.positions().contains(target.position())) {
                for (int child : position.buffs()) {
                    installOpeningPassiveBuff(sourceId, target, child, level);
                }
            }
            return;
        }
        var spec = rules.battleBuff(buffId);
        double chance = rules.openingBuffChance(buffId);
        if (chance < 1D && !random.hit((int) Math.round(chance * 10000D))) {
            return;
        }
        var entry = installBuff(sourceId, target.id(), spec, 0);
        if (spec.type() == 160) {
            var effect = rules.controlAttribute(buffId);
            requireCombat(target.id()).attributes().addBase(effect.attribute(), effect.amount());
        } else if (spec.type() == 163) {
            requireCombat(target.id()).attributes().addBase(102, rules.openingHpPenalty(buffId));
        } else if (rules.battlePeriodicRecovery(buffId) == null) {
            require(target.id()).actor().listen(new Listener(entry.instanceId(), sourceId, rules.battleTrigger(buffId)));
        }
    }

    /** 监听次数耗尽沿统一移除口清理实例与监听，根事务保存完整回滚点。 */
    @Override
    public void triggerExpired(Actor carrier, Listener listener) {
        var removedEntries = buffs.get(carrier.id()).removeInstance(listener.instanceId());
        if (removedEntries.isEmpty()) carrier.remove(listener.instanceId());
        else removed(carrier.id(), removedEntries, "trigger-limit");
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

    /** 分发已核对的战斗动作。百花庇护三档沿用敌方未全灭限制，治疗事件共用根事务。 */
    private void executeArt(Invocation invocation) {
        var passiveEffects = rules.passiveTriggerEffects(invocation.artId());
        if (!passiveEffects.isEmpty()) {
            executePassiveTriggerEffects(invocation, passiveEffects);
            return;
        }
        if (invocation.artId() >= 1113201 && invocation.artId() <= 1113203) {
            // 旧heroHurt先checkOver；最后一名敌人死亡时通用死亡监听不再执行属性动作。
            var source = require(invocation.sourceId());
            if (units.values().stream().anyMatch(unit -> unit.faction() != source.faction() && unit.hp() > 0)) {
                applyDirectAttribute(invocation.artId(), source.actor().id(), source.actor().id());
            }
            return;
        }
        if (invocation.artId() >= 1111401 && invocation.artId() <= 1111403) {
            // 已核对target=[1]，动作来源自身；独立规则测试不冒充完整技能已接通。
            rules.battleDirectAttribute(invocation.artId());
            applyDirectAttribute(invocation.artId(), invocation.sourceId(), invocation.sourceId());
            return;
        }
        if (rules.isExpiryFrozenArt(invocation.artId())) {
            if (attackContext == null) throw new IllegalStateException("到期冰冻缺少回合随机上下文");
            applyFrozen(invocation.artId(), invocation.sourceId(), invocation.targetContext(), attackContext.decision);
            return;
        }
        if (rules.isControlAttributeArt(invocation.artId())) {
            for (var effect : rules.controllingAttributes(invocation.artId() - 100)) {
                int targetId = invocation.sourceId(); // 真实动作target=[1]，为动作来源自身。
                if (require(targetId).actor().isDead() || require(targetId).hp() <= 0) continue;
                installBuff(invocation.sourceId(), targetId, rules.battleBuff(effect.buffId()), 0);
                requireCombat(targetId).attributes().addBase(effect.attribute(), effect.amount());
            }
            return;
        }
        if (rules.isDamageArt(invocation.artId())) {
            if (attackContext == null) throw new IllegalStateException("触发伤害缺少动作环境");
            var source = require(invocation.sourceId());
            var living = units.values().stream().filter(u -> u.hp() > 0 && !u.actor().isDead()).map(this::target).toList();
            var targets = HeroBattleTargetUtils.select(rules.battleTargets(invocation.artId()), target(source), living,
                List.of(target(require(invocation.targetContext()))), false, random::index);
            for (int buffId : rules.damageArtBuffs(invocation.artId())) {
                var targetIds = targets.stream().map(HeroBattleTargetUtils.Unit::id).toList();
                ordinaryDamage(buffId, invocation.sourceId(), targetIds, attackContext.damageType,
                    source.actor().activeSkill(), source.actor().skillEnergy(), attackContext.elements, attackContext.decision);
                if (rules.nanakoDamageChain(buffId)) nanakoFollowup(buffId - 2233200, invocation.sourceId(), targetIds);
            }
            return;
        }
        if (rules.isGeneralCounterattackArt(invocation.artId())) {
            if (attackContext == null) throw new IllegalStateException("反击动作没有技能根事务");
            var source = require(invocation.sourceId());
            var living = units.values().stream().filter(u -> u.hp() > 0 && !u.actor().isDead()).map(this::target).toList();
            var selected = HeroBattleTargetUtils.select(rules.battleTargets(invocation.artId()), target(source), living,
                List.of(target(require(invocation.targetContext()))), false, random::index);
            var skill = source.actor().generalAttack();
            rules.damageSkillArts(skill);
            for (var target : selected) attackContext.queue.addLast(new CounterAction(source.actor().id(), target.id(), skill));
            return;
        }
        State source = require(invocation.sourceId());
        if (invocation.artId() >= 3094201 && invocation.artId() <= 3094203
                && units.values().stream().noneMatch(unit -> unit.faction() != source.faction() && unit.hp() > 0)) {
            // 旧heroHurt在死亡监听前checkOver；最后一个敌人倒下时，伊芙的死亡治疗不再执行。
            return;
        }
        Plan plan = rules.battleHealing(invocation.artId());
        State context = require(invocation.targetContext());
        var living = units.values().stream()
            .filter(unit -> unit.hp() > 0 && !unit.actor().isDead()).map(this::target).toList();
        var targets = HeroBattleTargetUtils.select(plan.targets(), target(source), living,
            List.of(target(context)), false, random::index);
        applyHealingEffects(plan.effects(), source, targets);
    }

    /** 监听子动作继承原事件目标，复用属性、治疗、中毒和控制；210只在成功消费时执行子动作。 */
    private void executePassiveTriggerEffects(Invocation invocation, List<Integer> buffs) {
        var source = require(invocation.sourceId());
        var inheritedTarget = require(invocation.targetContext());
        var living = units.values().stream().filter(unit -> unit.hp() > 0 && !unit.actor().isDead())
            .map(this::target).toList();
        var targets = HeroBattleTargetUtils.select(rules.battleTargets(invocation.artId()), target(source), living,
            List.of(target(inheritedTarget)), false, random::index);
        for (int buffId : buffs) {
            var healing = rules.attackHealing(buffId);
            if (healing != null) {
                applyAttackHealing(buffId, healing, source, targets);
                continue;
            }
            int useLimit = rules.battleUseLimit(buffId);
            if (useLimit > 0) {
                for (var target : targets) {
                    if ((buffId == 4054201 || require(target.id()).hp() > 0) && !source.actor().interrupted(target.id())
                            && source.actor().useLimitedEffect(buffId, useLimit)) {
                        for (int child : rules.battleUseLimitFollowup(buffId)) {
                            executeArt(new Invocation(buffId, child, invocation.sourceId(), target.id()));
                        }
                    }
                }
                source.actor().restore();
                continue;
            }
            var assigned = rules.dailyAssignedSkill(buffId);
            if (assigned != null) {
                for (var target : targets) {
                    if (require(target.id()).hp() > 0 && actionDecision().test(rules.assignedSkillChance(buffId))) {
                        attackContext.queue.addLast(new CounterAction(source.actor().id(), target.id(), assigned));
                    }
                }
                continue;
            }
            int extra = rules.dailyExtraTargets(buffId);
            if (extra > 0) {
                if (!targets.isEmpty() && actionDecision().test(rules.dailyExtraTargetChance(buffId))) {
                    extraTargets.merge(source.actor().id(), extra, Math::addExact);
                }
                continue;
            }
            for (var target : targets) {
                if (rules.attackDamageOverTime(buffId) != null) {
                    applyAttackDamageOverTime(buffId, source.actor().id(), target.id(), actionDecision());
                } else if (rules.battleFrozen(buffId)) {
                    applyFrozen(buffId, source.actor().id(), target.id(), actionDecision());
                } else if (rules.battleDizzy(buffId)) {
                    applyDizzy(buffId, source.actor().id(), target.id(), actionDecision());
                } else if (rules.battleSimpleControl(buffId)) {
                    applySimpleControl(buffId, source.actor().id(), target.id(), actionDecision());
                } else if (rules.battleDirectAttribute(buffId)) {
                    applyDirectAttribute(buffId, source.actor().id(), target.id());
                } else if (rules.dailySeal(buffId)) {
                    applySeal(buffId, source.actor().id(), target);
                } else if (rules.battleOnceAttribute(buffId)) {
                    if (require(target.id()).hp() > 0 && !source.actor().interrupted(target.id())) {
                        var effect = rules.onceDamageAttribute(buffId);
                        installBuff(source.actor().id(), target.id(), rules.battleBuff(buffId), 0);
                        requireCombat(target.id()).attributes().addOnce(effect.attribute(), effect.amount());
                    }
                } else {
                    installBuffListener(buffId, source.actor().id(), target.id());
                }
            }
            source.actor().restore();
        }
    }

    /** 原封印由负面状态处理器判定；成功后禁止被动并执行降暴击子动作。 */
    private void applySeal(int buffId, int sourceId, HeroBattleTargetUtils.Unit target) {
        var defender = require(target.id());
        if (defender.actor().isDead() || hasStatus(target.id(), 152) || require(sourceId).actor().interrupted(target.id())
                || !actionDecision().test(rules.openingBuffChance(buffId))) {
            return;
        }
        installBuff(sourceId, target.id(), rules.battleBuff(buffId), 0);
        defender.actor().control(1007, true);
        applyImmediateArts(buffId, sourceId, List.of(target));
    }

    /** 需要抽样的效果沿用根出手或回合的判定；固定属性及限次本身可随固定伤害触发。 */
    private java.util.function.DoublePredicate actionDecision() {
        if (attackContext == null) {
            throw new IllegalStateException("概率效果缺少战斗判定上下文");
        }
        return attackContext.decision;
    }

    /** 按已选目标执行治疗/护盾，记录准确事件顺序；主动和监听共用同一取整、禁疗及回滚规则。 */
    private void applyHealingEffects(List<Effect> effects, State source, List<HeroBattleTargetUtils.Unit> targets) {
        if (source.actor().hasControl(1011) || source.actor().hasControl(1013)
            || source.actor().hasControl(1015)) {
            throw new UnsupportedOperationException("治疗动作尚未支持控制改选");
        }

        for (var effect : effects) {
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
                if (hasStatus(target.id(), 1009)) {
                    continue;
                }
                replenish(effect.buffId(), source, defender, percent(source.attack(), effect.attackRate()));
            }
            source.actor().restore();
        }
    }

    /** 130按实时攻击，131按施加者最大生命治疗；圣光精灵治疗后另选最低生命比例队友。 */
    private void applyAttackHealing(int buffId, HeroSkillPanelRules.AttackHealing effect,
                                    State source, List<HeroBattleTargetUtils.Unit> targets) {
        int sourceId = source.actor().id();
        var followupTargets = new ArrayList<HeroBattleTargetUtils.Unit>();
        for (var target : targets) {
            if (effect.chance() < 1D && !actionDecision().test(effect.chance())) {
                continue;
            }
            var defender = require(target.id());
            if (defender.hp() <= 0 || defender.actor().isDead() || source.actor().interrupted(target.id())) {
                continue;
            }
            if (effect.followup()) {
                // 旧禁止治疗只阻止回血，目标仍有资格触发该独立子动作。
                followupTargets.add(target);
            }
            if (hasStatus(target.id(), 1009)) {
                continue;
            }
            long basis = effect.maximumHp() ? source.maxHp() : requireCombat(sourceId).attributes().get(220);
            replenish(buffId, source, defender, percent(basis, effect.rate()));
        }
        followupTargets.removeIf(target -> source.actor().interrupted(target.id()));
        if (!followupTargets.isEmpty()) {
            applyImmediateArts(buffId, sourceId, followupTargets);
        }
        source.actor().restore();
    }

    /** 以本次出手最新判定的初始伤害计算132号治疗；最后一次判定未命中时没有治疗。 */
    private void applyDamageHealing(int buffId, int rate, State source, List<HeroBattleTargetUtils.Unit> targets) {
        for (var target : targets) {
            var damage = attackContext.lastDamage;
            if (damage == null || damage.missed()) {
                break;
            }
            var defender = require(target.id());
            if (defender.hp() <= 0 || defender.actor().isDead() || source.actor().interrupted(target.id())
                    || hasStatus(target.id(), 1009)) {
                continue;
            }
            // 普通伤害在旧数值链中为负数；治疗使用同一次扣减前结果的绝对值。
            replenish(buffId, source, defender, Math.absExact(percent(damage.damage(), rate)));
        }
        source.actor().restore();
    }

    /** 按施法者本次累计计算伤害设置护盾；最后一击未中时按旧规则生成零值护盾。 */
    private void applyDamageShield(int buffId, int rate, State source, List<HeroBattleTargetUtils.Unit> targets) {
        int sourceId = source.actor().id();
        long base = attackContext.lastDamage == null || attackContext.lastDamage.missed() ? 0 : attackContext.totalDamage;
        long value = Math.absExact(percent(base, rate));
        var spec = rules.battleBuff(buffId);
        for (var target : targets) {
            var defender = require(target.id());
            if (defender.hp() > 0 && !defender.actor().isDead() && !source.actor().interrupted(target.id())) {
                installBuff(sourceId, target.id(), spec, value);
            }
        }
    }

    /** 正基础治疗共用施疗、受疗和清心事件，按可恢复血量封顶并记录战报。 */
    private void replenish(int buffId, State source, State defender, long base) {
        if (base <= 0) {
            return;
        }
        source.actor().treatment(base);
        emit(186, source.actor(), defender.actor());
        emit(206, defender.actor(), source.actor());
        // 嵌套事件可能治疗同一目标或覆盖施法者最近治疗值，必须重新读取。
        int targetId = defender.actor().id();
        defender = require(targetId);
        long amount = healingAmount(source, defender, source.actor().lastTreatment());
        long actual = Math.min(amount, defender.maxHp() - defender.hp());
        long nextHp = Math.addExact(defender.hp(), actual);
        if (nextHp <= 0) {
            throw new UnsupportedOperationException("负治疗跨越死亡边界尚未支持");
        }
        units.put(targetId, defender.withHp(nextHp));
        recordRecovery(new Recovery(buffId, source.actor().id(), targetId, base, amount, actual));
        emit(311, source.actor(), defender.actor());
    }

    /** 依旧 replenish 顺序叠加固定治疗、施疗倍率和受疗倍率，返回可含溢出的战报值。 */
    private long healingAmount(State source, State defender, long base) {
        long amount = Math.addExact(base, source.treatment());
        amount = Math.addExact(amount, percent(amount, source.treatmentRate()));
        return Math.addExact(amount, percent(amount, defender.receivedRate()));
    }

    /**
     * 安装已命中的清心、反向契约或必中禁疗；反向契约关联由199安装链提供。
     * 当前199随机建约/伤害转移未开放，本入口不伪造双方关系或默认命中概率。
     */
    public void installTreatmentStatus(int buffId, int sourceId, int carrierId, int contractId) {
        var spec = rules.battleTreatmentStatus(buffId);
        require(sourceId);
        require(carrierId);
        if (spec.type() == 200) {
            require(contractId);
        } else if (contractId != 0) {
            throw new IllegalArgumentException("非契约Buff不应携带关联单位");
        }
        transaction(() -> {
            var entry = installBuff(sourceId, carrierId, spec, contractId);
            if (spec.type() == 200 || spec.type() == 311) {
                require(carrierId).actor().listen(new Listener(entry.instanceId(), sourceId,
                    rules.battleTrigger(buffId), contractId));
            }
        });
    }

    /** 查询手工测试状态及实际Buff实例，移除最后一层禁疗后自然恢复，不误清其他来源。 */
    private boolean hasStatus(int unitId, int type) {
        return require(unitId).actor().hasControl(type)
            || buffs.get(unitId).snapshot().stream().anyMatch(entry -> entry.spec().type() == type);
    }

    /** 209读取到期目标的最近移除配置；原施加者是否有匹配监听由事件处理器决定。 */
    @Override
    public boolean expiryMatches(Listener listener, Actor carrier, int targetId) {
        var entry = lastExpired.get(targetId);
        return entry != null && rules.matchesExpiredTrigger(listener.definition().buffId(), entry.spec().id());
    }

    /** 被控185读取携带者，施控207读取目标；历史实例被驱散后仍保留旧lastControl语义。 */
    @Override
    public boolean controlMatches(Listener listener, Actor carrier, int targetId) {
        int unitId = listener.definition().event() == 185 ? carrier.id() : targetId;
        var entry = lastControl(unitId);
        return entry != null && rules.matchesControlTrigger(listener.definition().buffId(), entry.spec().type());
    }

    /** 执行专用监听，保持快照中原关联与当前攻击时点，统一纳入根事务。 */
    @Override
    public void special(Listener listener, Actor carrier, int targetId) {
        transaction(() -> {
            if (listener.definition().event() == 1004) {
                if (buffs.get(carrier.id()).decrement(listener.instanceId()) <= 0) {
                    removed(carrier.id(), buffs.get(carrier.id()).removeInstance(listener.instanceId()), "break-ice");
                    emit(208, require(targetId).actor(), carrier);
                }
                return;
            }
            if (listener.definition().event() == 199) {
                transferDamage(listener, targetId);
                return;
            }
            if (listener.definition().event() == 1014) {
                wakeDeepSleep(listener, carrier);
                return;
            }
            if (listener.definition().event() == 234) {
                consumeBlockShield(listener, carrier);
                return;
            }
            if (listener.definition().event() == 231) {
                applyShelter(listener, targetId);
                return;
            }
            if (listener.definition().event() == 235) {
                applyFireSpirit(listener, carrier, targetId);
                return;
            }
            if (listener.definition().event() == 1204) {
                applyElectricity(listener, carrier);
                return;
            }
            if (listener.definition().event() == 143) {
                splitSoulWard(carrier, targetId);
                return;
            }
            if (listener.definition().event() == 176) {
                applyDamageThreshold(listener, carrier);
                return;
            }
            var config = rules.battleTreatmentSpecial(listener.definition().buffId());
            if (config.type() == 311) {
                pureHeart(carrier, config);
            } else {
                reverseContract(listener, targetId, config.rate());
            }
        });
    }

    /** 灵魂结界按存活持有者分摊当前伤害；独立固定伤害沿旧共享伤害结果逐次消耗护盾。 */
    private void splitSoulWard(Actor carrier, int attackerId) {
        if (damageFrame == null || damageFrame.remaining <= 0) {
            return;
        }
        var defender = require(carrier.id());
        var sharing = units.values().stream().filter(unit -> unit.faction() == defender.faction()
                && unit.hp() > 0 && hasStatus(unit.actor().id(), 143)).toList();
        if (sharing.size() <= 1) {
            return;
        }
        long shared = damageFrame.remaining / sharing.size();
        damageFrame.remaining = shared;
        for (var unit : sharing) {
            if (unit.actor().id() != carrier.id() && shared > 0) {
                var extra = deductDamage(damageFrame.buffId, attackerId, unit.actor().id(), shared, true);
                if (!require(unit.actor().id()).actor().isDead()) {
                    emitHealthThreshold(extra);
                }
                shared -= extra.absorbed();
            }
        }
    }

    /** 爱德华按原始命中的生命比例整数档数叠加属性，旧触发上限不允许到达阈值的那次。 */
    private void applyDamageThreshold(Listener listener, Actor carrier) {
        if (damageFrame == null || damageFrame.fixedAttack || carrier.isDead()) {
            return;
        }
        int buffId = listener.definition().buffId();
        int count = HeroBattleDamageThreshold.occurrences(damageFrame.incoming, require(carrier.id()).maxHp(),
            rules.dailyDamageThreshold(buffId));
        for (int index = 0; index < count && carrier.useLimitedEffect(buffId, 99_999); index++) {
            executeArt(new Invocation(buffId, 5044201, listener.sourceId(), carrier.id()));
        }
    }

    /** 感电在非固定受击后造成附加固定伤害，浮字沿用当前攻击的效果编号。 */
    private void applyElectricity(Listener listener, Actor carrier) {
        if (damageFrame == null || damageFrame.fixedAttack || carrier.isDead()) {
            return;
        }
        var effect = Objects.requireNonNull(rules.attackDamageOverTime(listener.definition().buffId()));
        long attack = requireCombat(listener.sourceId()).attributes().get(220);
        long amount = (long) (attack * (effect.rate() / 10000D));
        deductDamage(damageFrame.buffId, listener.sourceId(), carrier.id(), amount);
    }

    /** 扣血前把原伤害的一部分转为打在活庇护者身上的固定伤害，来源保留原攻击者。 */
    private void applyShelter(Listener listener, int attackerId) {
        if (damageFrame == null) {
            throw new IllegalStateException("庇护未收到扣血前的伤害");
        }
        var protector = require(listener.sourceId());
        if (protector.hp() <= 0 || protector.actor().isDead() || damageFrame.remaining == 0) {
            return;
        }
        var protection = rules.battleReactiveProtection(listener.definition().buffId());
        long shared = percent(damageFrame.remaining, protection.rate());
        if (shared > 0) {
            damageFrame.remaining -= shared;
            deductDamage(damageFrame.buffId, attackerId, protector.actor().id(), shared);
        }
    }

    /** 受有效攻击时按原概率，以守护携带者为烈火施加者；烈火到下回合才扣血。 */
    private void applyFireSpirit(Listener listener, Actor carrier, int attackerId) {
        var protection = rules.battleReactiveProtection(listener.definition().buffId());
        var decision = actionDecision();
        if (decision.test(protection.rate() / 10000D)) {
            applyAttackDamageOverTime(protection.retaliationId(), carrier.id(), attackerId, decision);
        }
    }

    /** 旧深睡在171按已受击次数读万分比整数；成功先移除再递增离场对象，不发送破冰208。 */
    private void wakeDeepSleep(Listener listener, Actor carrier) {
        var entry = buffs.get(carrier.id()).snapshot().stream()
            .filter(value -> value.instanceId() == listener.instanceId()).findFirst().orElseThrow();
        var rates = rules.simpleControl(entry.spec().id()).wakeRates();
        int count = Math.toIntExact(entry.value());
        if (count >= rates.size()) {
            throw new IllegalStateException("深睡受击次数超出已预检配置");
        }
        if (randomIndex(10000) <= rates.get(count)) {
            removed(carrier.id(), buffs.get(carrier.id()).removeInstance(entry.instanceId()), "wake");
        } else {
            buffs.get(carrier.id()).increment(entry.instanceId());
        }
    }

    /** 旧234在189只拦非固定伤害，先计数再移除；多个盾都收到同次事件，不因剩余0跳过。 */
    private void consumeBlockShield(Listener listener, Actor carrier) {
        if (damageFrame == null) {
            throw new IllegalStateException("格挡盾缺少当前扣血上下文");
        }
        if (damageFrame.fixedAttack) {
            return;
        }
        long count = buffs.get(carrier.id()).increment(listener.instanceId());
        damageFrame.remaining = 0;
        damageFrame.blockShield = true;
        if (count >= rules.blockShieldCount(listener.definition().buffId())) {
            removed(carrier.id(), buffs.get(carrier.id()).removeInstance(listener.instanceId()), "trigger-limit");
        }
    }

    /** 旧清心先判概率，再从己方含可驱散负面Buff的全部单位中无放回随机选择。 */
    private void pureHeart(Actor carrier, HeroSkillPanelRules.TreatmentSpecial config) {
        if (random == null) {
            throw new IllegalStateException("清心随机入口缺失");
        }
        if (!random.hit(config.rate())) {
            return;
        }
        int faction = require(carrier.id()).faction();
        var candidates = new ArrayList<>(units.values().stream().filter(unit -> unit.faction() == faction
            && !buffs.get(unit.actor().id()).dispellable(2).isEmpty()).map(unit -> unit.actor().id()).toList());
        int count = config.count();
        if (count <= 0 || candidates.isEmpty()) {
            return;
        }
        var selected = new ArrayList<Integer>();
        if (count == 1) {
            selected.add(candidates.get(randomIndex(candidates.size())));
        } else if (count >= candidates.size()) {
            selected.addAll(candidates);
        } else {
            for (int i = 0; i < count; i++) {
                selected.add(candidates.remove(randomIndex(candidates.size())));
            }
        }
        for (int id : selected) {
            removed(id, buffs.get(id).dispel(2), "pure-heart");
        }
    }

    /** 校验清心/深睡等整数随机入口范围，缺失或越界回滚，不用取模掩盖不兼容算法。 */
    private int randomIndex(int bound) {
        if (random == null) {
            throw new IllegalStateException("战斗整数随机入口缺失");
        }
        int index = random.index(bound);
        if (index < 0 || index >= bound) {
            throw new IllegalArgumentException("战斗随机下标越界");
        }
        return index;
    }

    /** 旧反向契约先扣原治疗量；关联者死亡也不退还，转移回血不再分发治疗/清心事件。 */
    private void reverseContract(Listener listener, int healerId, int rate) {
        State healer = require(healerId);
        State contractor = require(Math.toIntExact(listener.value()));
        State source = require(listener.sourceId());
        long transfer = percent(healer.actor().lastTreatment(), rate);
        healer.actor().treatment(Math.subtractExact(healer.actor().lastTreatment(), transfer));
        if (contractor.actor().isDead() || contractor.hp() <= 0) {
            return;
        }
        long amount = Math.addExact(transfer, source.treatment());
        amount = Math.addExact(amount, percent(amount, source.treatmentRate()));
        amount = Math.addExact(amount, percent(amount, contractor.receivedRate()));
        long actual = Math.min(amount, contractor.maxHp() - contractor.hp());
        long nextHp = Math.addExact(contractor.hp(), actual);
        if (nextHp <= 0) {
            throw new UnsupportedOperationException("契约负治疗死亡边界尚未支持");
        }
        units.put(contractor.actor().id(), contractor.withHp(nextHp));
        recordRecovery(new Recovery(listener.definition().buffId(), source.actor().id(),
            contractor.actor().id(), transfer, amount, actual));
    }

    /** 治疗成功时同时记录统计与顺序事件；不能在结算后由独立列表猜测治疗时点。 */
    private void recordRecovery(Recovery recovery) {
        recoveries.add(recovery);
        trace.add(new Trace("recovery", round, recovery.sourceId(), recovery.targetId(), recovery.buffId(),
            null, null, null, "", recovery));
    }

    /** 倒下对象按施法者攻击复活，存活时复用旧最低血量治疗分支；二者都触发原清心。 */
    private void resurrect(int buffId, HeroSkillPanelRules.Resurrection config, State source, State defender) {
        int attacker = source.actor().id();
        int targetId = defender.actor().id();
        if (defender.actor().isDead()) {
            long base = percent(requireCombat(attacker).attributes().get(220), config.attackRate());
            long reported = healingAmount(source, defender, base);
            long actual = Math.min(reported, defender.maxHp());
            if (actual <= 0) {
                throw new IllegalStateException("复活实际回复量必须大于零");
            }
            defender.actor().setDead(false);
            // 旧 BattlerDo 把活过来的单位放回存活列表末尾，死亡目标也按入列顺序选择。
            units.remove(targetId);
            units.put(targetId, defender.withHp(actual));
            var recovery = new Recovery(buffId, attacker, targetId, base, reported, actual);
            recoveries.add(recovery);
            trace.add(new Trace("revival", round, attacker, targetId, buffId, null, null, null, "", recovery));
            emit(191, defender.actor(), source.actor());
        } else {
            var living = units.values().stream().filter(u -> u.hp() > 0 && !u.actor().isDead()).map(this::target).toList();
            var targets = HeroBattleTargetUtils.select(config.onLiving().targets(), target(source), living,
                List.of(target(defender)), false, random::index);
            int healingBuff = config.onLiving().buffs().getFirst();
            applyAttackHealing(healingBuff, rules.attackHealing(healingBuff), source, targets);
        }
        emit(311, source.actor(), defender.actor());
    }

    /** 已成功安装的契约对，仅用于核对动作选择，不代替Buff实例本身。 */
    public record ContractPair(int buffId, int carrierId, int enemyId) {}

    /**
     * 执行真实199动作的选目标与建约，5181303为友方存活→后排优先→最低血量比例。
     * 旧199属于监听，notTrigger=false；不擅自执行配置中的5181403属性动作。
     */
    public List<ContractPair> contractArt(int artId, int sourceId, int contextId) {
        var plan = rules.battleContractAction(artId);
        State source = require(sourceId);
        State context = require(contextId);
        if (source.actor().hasControl(1011) || source.actor().hasControl(1013)
            || source.actor().hasControl(1015)) {
            throw new UnsupportedOperationException("契约动作尚未支持控制改选");
        }
        var result = new ArrayList<ContractPair>();
        transaction(() -> {
            started = true;
            var living = units.values().stream().filter(unit -> unit.hp() > 0 && !unit.actor().isDead())
                .map(this::target).toList();
            var targets = HeroBattleTargetUtils.select(plan.targets(), target(source), living,
                List.of(target(context)), false, random::index);
            for (int buffId : plan.buffs()) {
                for (var target : targets) {
                    if (!source.actor().interrupted(target.id())) {
                        result.add(new ContractPair(buffId, target.id(), establishContract(buffId, sourceId, target.id())));
                    }
                }
                source.actor().restore();
            }
        });
        return List.copyOf(result);
    }

    /**
     * 执行旧199号建约处理器：随机存活敌人→两份199实例→可选反向200实例。
     * 199的art_list不自动执行；完整主动技能入口尚未开放。
     */
    public int establishContract(int buffId, int sourceId, int defenderId) {
        var config = rules.battleContract(buffId);
        State source = require(sourceId);
        require(defenderId);
        var enemies = units.values().stream().filter(unit -> unit.faction() != source.faction()
            && unit.hp() > 0 && !unit.actor().isDead()).map(unit -> unit.actor().id()).toList();
        if (enemies.isEmpty()) {
            throw new IllegalStateException("没有可建立契约的存活敌人");
        }
        int[] selected = new int[1];
        transaction(() -> {
            started = true;
            selected[0] = enemies.get(randomIndex(enemies.size()));
            var spec = rules.battleBuff(buffId);
            var self = installBuff(sourceId, defenderId, spec, selected[0]);
            require(defenderId).actor().listen(new Listener(self.instanceId(), sourceId,
                rules.battleTrigger(buffId), selected[0]));
            var enemy = installBuff(sourceId, selected[0], spec, 0);
            require(selected[0]).actor().listen(new Listener(enemy.instanceId(), sourceId,
                rules.battleTrigger(buffId), 0));
            if (config.reverseBuff() != 0) {
                installTreatmentStatus(config.reverseBuff(), sourceId, selected[0], defenderId);
            }
        });
        return selected[0];
    }

    /** 入场绑定同一单位的真实模板和原始战斗属性；不接受已折算面板替代原始输入。 */
    public void bindCombatData(int unitId, int templateId, Map<Integer, Long> attributes) {
        require(unitId);
        if (started || combat.containsKey(unitId)) {
            throw new IllegalStateException("战斗已开始或单位属性重复绑定");
        }
        combat.put(unitId, new CombatData(rules.battleIdentity(templateId), new HeroBattleAttributeState(attributes)));
    }

    /** 从已校验的持久阵容输入装配，复用模板/原始属性，不追加资产查询。 */
    public void bindCombatData(int unitId, HeroBattleInputService.Unit input) {
        bindCombatData(unitId, input.hero().templateId(), input.attributes());
    }

    /** 每回合开始前累加战场攻击倍率，只给该时点仍存活的单位。 */
    void addRoundAttackRate(long points) {
        for (var entry : combat.entrySet()) {
            if (require(entry.getKey()).hp() > 0) {
                entry.getValue().attributes().addBase(201, points);
            }
        }
    }

    /** 本场效果设置下一次读取覆盖值；值只保存在战斗状态，根事务会撤回。 */
    public void setOnceAttribute(int unitId, int type, long value) {
        requireCombat(unitId).attributes().setOnce(type, value);
    }

    /** 返回一次性状态只读快照，供动作及回归核对消费边界。 */
    public Map<Integer, Long> onceAttributes(int unitId) {
        return requireCombat(unitId).attributes().snapshot();
    }

    /**
     * 沿旧控制处理器判定并安装眩晕：153免控先返回，再依次读取212、219、217。
     * 成功安装后发出被控185与施控207事件；未命中不伪造Buff。全流程参与根动作回滚。
     * 185读取被控携带者、207读取目标的最近控制类型，再执行配置动作。
     */
    public void applyDizzy(int buffId, int sourceId, int targetId,
                           java.util.function.DoublePredicate decision) {
        double rate = rules.battleDizzyRate(buffId);
        if (rules.immediateArts(buffId).isEmpty()) {
            applyControl(buffId, sourceId, targetId, decision, 1005, rate, 217, 0);
            return;
        }
        if (attackContext == null) {
            throw new IllegalStateException("眩晕追击缺少根动作上下文");
        }
        transaction(() -> {
            if (installControl(buffId, sourceId, targetId, decision, 1005, rate, 217, 0)) {
                applyImmediateArts(buffId, sourceId, List.of(target(require(targetId))));
            }
        });
    }

    /** 原流血入口要求1205，其抗性和回合效果沿用公共攻击比例伤害。 */
    public void applyBleed(int buffId, int sourceId, int targetId,
                           java.util.function.DoublePredicate decision) {
        if (!rules.battleBleed(buffId)) {
            throw new IllegalArgumentException("不是流血配置：" + buffId);
        }
        applyAttackDamageOverTime(buffId, sourceId, targetId, decision);
    }

    /** 按旧负面免疫和配置抗性判定安装中毒、流血或诅咒，安装时不扣血。 */
    private void applyAttackDamageOverTime(int buffId, int sourceId, int targetId,
                                          java.util.function.DoublePredicate decision) {
        var effect = Objects.requireNonNull(rules.attackDamageOverTime(buffId));
        transaction(() -> {
            started = true;
            var source = require(sourceId);
            var target = require(targetId);
            if (target.hp() <= 0 || source.actor().interrupted(targetId) || hasStatus(targetId, 152)) {
                return;
            }
            double resistance = effect.resistance() == 0 ? 0D : requireCombat(targetId).attributes().rate(effect.resistance());
            if (decision.test(effect.chance() * (1D - resistance))) {
                if (effect.chance() == 0D) {
                    throw new IllegalStateException("零概率回合伤害判定不可命中");
                }
                var entry = installBuff(sourceId, targetId, rules.battleBuff(buffId), 0);
                if (effect.type() == 1204) {
                    target.actor().listen(new Listener(entry.instanceId(), sourceId,
                        new Definition(buffId, 1204, 0, List.of())));
                }
            }
        });
    }

    /** 持续伤害使用实时攻击或烈火施加者最大生命，扣盾与死亡清理一致，诅咒另发原队友事件。 */
    private void tickAttackDamageOverTime(int targetId, HeroBattleBuffState.Entry entry) {
        int sourceId = entry.sourceId();
        var effect = Objects.requireNonNull(rules.attackDamageOverTime(entry.spec().id()));
        var source = require(sourceId);
        long basis = effect.type() == 1206 ? source.maxHp() : requireCombat(sourceId).attributes().get(220);
        long amount = (long) (basis * (effect.rate() / 10000D));
        for (var marker : buffs.get(targetId).snapshot()) {
            if (marker.spec().type() == 304 && hasStatus(marker.sourceId(), 303)) {
                periodicRecovery.record(marker.sourceId(), Math.negateExact(amount));
            }
        }
        emit(183, require(targetId).actor(), source.actor());
        if (effect.type() == 1207) {
            for (var ally : units.values()) {
                if (ally.faction() == source.faction()) {
                    emit(195, ally.actor(), source.actor());
                }
            }
        }
        deductDamage(entry.spec().id(), sourceId, targetId, amount);
    }

    /** 冰冻沿216抗性判定，安装受击计数监听；失败回滚控制及其被动增益。 */
    public void applyFrozen(int buffId, int sourceId, int targetId,
                            java.util.function.DoublePredicate decision) {
        var config = rules.battleFrozenDefinition(buffId);
        applyControl(buffId, sourceId, targetId, decision, 1004, config.rate(), 216, config.hitCount());
    }

    /** 解析已支持的直接控制，禁疗也经过旧免控判定并触发控制事件。 */
    public void applySimpleControl(int buffId, int sourceId, int targetId,
                                   java.util.function.DoublePredicate decision) {
        var config = rules.simpleControl(buffId);
        applyControl(buffId, sourceId, targetId, decision, config.type(), config.rate(), config.resistance(), 0);
    }

    /** 共用旧控制安装顺序；冰冻倒数受击次数，深睡递增受击次数，其余控制无专用受击监听。 */
    private void applyControl(int buffId, int sourceId, int targetId,
                              java.util.function.DoublePredicate decision, int controlType,
                              double base, int resistanceType, long value) {
        transaction(() -> installControl(buffId, sourceId, targetId, decision, controlType, base, resistanceType, value));
    }

    /** 在根事务内判定控制，返回本次是否命中，避免嵌套事件改变最近控制后误判追击。 */
    private boolean installControl(int buffId, int sourceId, int targetId,
                                   java.util.function.DoublePredicate decision, int controlType,
                                   double base, int resistanceType, long value) {
        var source = require(sourceId);
        var target = require(targetId);
        started = true;
        if (source.hp() <= 0 || source.actor().isDead() || target.hp() <= 0
                || target.actor().isDead() || source.actor().interrupted(targetId)
                || hasStatus(targetId, 153)) {
            return false;
        }
        double freeControl = requireCombat(targetId).attributes().rate(212);
        double control = requireCombat(sourceId).attributes().rate(219);
        double resistance = resistanceType == 0 ? 0D : requireCombat(targetId).attributes().rate(resistanceType);
        if (!decision.test(base * (1D - resistance) * (1D + control) * (1D - freeControl))) {
            return false;
        }
        var entry = installBuff(sourceId, targetId, rules.battleBuff(buffId), value);
        if (controlType == 1004 || controlType == 1014) {
            target.actor().listen(new Listener(entry.instanceId(), sourceId,
                new Definition(buffId, controlType, 0, List.of())));
        }
        lastControls.put(targetId, entry);
        target.actor().control(controlType, true);
        emit(185, target.actor(), source.actor());
        emit(207, source.actor(), target.actor());
        return true;
    }

    /** 返回最近成功安装的控制实例；null表示从未受控，不等于当前仍处于控制状态。 */
    public HeroBattleBuffState.Entry lastControl(int unitId) {
        require(unitId);
        return lastControls.get(unitId);
    }

    /** 安装已命中的真实1251抗暴实例；由伤害计算移除首层，不伪触发通用到期回调。 */
    public void installCounterCrit(int buffId, int sourceId, int targetId) {
        var spec = rules.battleCounterCrit(buffId);
        require(sourceId);
        require(targetId);
        transaction(() -> installBuff(sourceId, targetId, spec, 0));
    }

    /**
     * 执行已选定目标的普通伤害及固定命中的最大生命追加伤害。
     * 独立入口拒绝反击配置；技能根入口接后置事件/反击，每目标立即扣血，整组共享事务。
     */
    public void ordinaryDamage(int buffId, int sourceId, List<Integer> targetIds, int damageType,
                               boolean activeSkill, long energy, HeroBattleElementRules elements,
                               java.util.function.DoublePredicate decision) {
        var maximumHp = rules.maximumHpDamage(buffId);
        int rate = maximumHp == null ? rules.battleOrdinaryDamageRate(buffId, attackContext != null) : 0;
        double chance = rules.ordinaryDamageChance(buffId);
        var targets = List.copyOf(targetIds);
        requireCombat(sourceId);
        targets.forEach(this::requireCombat);
        var calculator = new HeroBattleDamageAction(elements, decision);
        transaction(() -> {
            started = true;
            for (int targetId : targets) {
                var source = require(sourceId);
                var target = require(targetId);
                if (chance < 1D && !decision.test(chance)) {
                    continue;
                }
                if (source.hp() <= 0 || source.actor().isDead() || target.hp() <= 0
                    || target.actor().isDead() || source.actor().interrupted(targetId)) continue;
                emit(187, source.actor(), target.actor());
                var a = requireCombat(sourceId);
                var d = requireCombat(targetId);
                var activeBonuses = new HashSet<Integer>();
                for (int n = 0; n < 6; n++) {
                    if (hasStatus(targetId, 1001 + n)) activeBonuses.add(260 + n);
                    if (hasStatus(targetId, 1201 + n)) activeBonuses.add(301 + n);
                }
                var request = new HeroBattleDamageAction.Request(a.attributes(), d.attributes(),
                    a.identity().element(), d.identity().element(), damageType, rate, activeSkill, energy,
                    false, hasStatus(sourceId, 1007), hasStatus(sourceId, 1251), d.identity().jobBonus(), activeBonuses);
                var result = maximumHp == null ? calculator.calculate(request, () -> {
                    var entries = buffs.get(sourceId).removeFirst(1251);
                    if (entries.isEmpty()) throw new IllegalStateException("抗暴标记没有对应实例");
                    removed(sourceId, entries, "counter-crit");
                }) : maximumHpResult(maximumHp, a, source, target);
                if (attackContext != null && attackContext.damageSourceId == sourceId) {
                    attackContext.lastDamage = result;
                    if (!result.missed()) {
                        attackContext.totalDamage = Math.addExact(attackContext.totalDamage, result.damage());
                    }
                }
                int resultIndex = ordinaryResults.size();
                ordinaryResults.add(result);
                if (result.missed()) {
                    emit(204, target.actor(), source.actor());
                    continue;
                }
                if (result.damage() == 0) {
                    continue;
                }
                var previous = damageFrame;
                damageFrame = new DamageFrame(buffId, Math.negateExact(result.damage()), false);
                try {
                    emit(188, source.actor(), target.actor());
                    emit(189, target.actor(), source.actor());
                    if (damageFrame.blockShield) {
                        // 旧HitType被盾改为BLOCK会取消isCrit；独立isBlock仍保留原格挡抽样。
                        result = new HeroBattleDamageAction.Result(0, false, result.rolledCritical(), false, result.blocked());
                        ordinaryResults.set(resultIndex, result);
                    }
                    var damage = deductDamage(buffId, sourceId, targetId, damageFrame.remaining, false);
                    boolean allows = rules.damageAllowsCounterattack(buffId);
                    if (source.actor().canTriggerDamage(false, allows, targetId)) {
                        if (result.critical()) emit(174, source.actor(), target.actor());
                        emit(activeSkill ? 182 : 181, source.actor(), target.actor());
                        emit(194, source.actor(), target.actor());
                        if (require(targetId).actor().isDead()) emit(190, source.actor(), target.actor());
                    }
                    if (require(targetId).actor().isDead()) {
                        finishDeath(sourceId, targetId);
                    } else {
                        emitHealthThreshold(damage);
                        if (source.actor().canTriggerDamage(false, allows, targetId)) {
                            if (result.critical()) emit(175, target.actor(), source.actor());
                            if (result.blocked()) {
                                emit(184, target.actor(), source.actor());
                                emit(204, target.actor(), source.actor());
                            }
                            emit(176, target.actor(), source.actor());
                            emit(activeSkill ? 179 : 178, target.actor(), source.actor());
                            emit(171, target.actor(), source.actor());
                        }
                    }
                    source.actor().finishDamage(allows, targetId);
                    // 旧224读取本次伤害结果；原目标死亡则子链不执行，1301再按自身选择器选目标。
                    if (buffId == 2231303 && result.critical() && source.hp() > 0 && target.hp() > 0
                        && !source.actor().interrupted(targetId)) {
                        if (attackContext == null) {
                            throw new IllegalStateException("奈奈子暴击追加缺少技能事务");
                        }
                        executeArt(new HeroBattleEventProcessor.Invocation(2231403, 2231503, sourceId, targetId));
                    }
                } finally {
                    damageFrame = previous;
                }
            }
        });
    }

    /** 反噬取施加者最大生命，其他最大生命伤害取目标生命并按施加者实时攻击封顶。 */
    private HeroBattleDamageAction.Result maximumHpResult(HeroSkillPanelRules.MaximumHpDamage config,
                                                          CombatData attacker, State source, State defender) {
        long damage = percent(config.sourceHp() ? source.maxHp() : defender.maxHp(), config.hpRate());
        if (!config.sourceHp()) {
            damage = Math.min(damage, percent(attacker.attributes().get(220), config.attackLimit()));
        }
        return new HeroBattleDamageAction.Result(-damage, false, false, false, false);
    }

    /** 奈奈子主伤害后对存活目标独立判降攻；成功目标再按职业1执行额外伤害。 */
    private void nanakoFollowup(int level, int sourceId, List<Integer> targets) {
        if (attackContext == null) throw new IllegalStateException("奈奈子子动作缺少根上下文");
        var source = require(sourceId).actor();
        var selected = new ArrayList<Integer>();
        int debuffId = 2233300 + level;
        var effect = rules.controlAttribute(debuffId);
        for (int targetId : targets) {
            var target = require(targetId);
            if (source.isDead() || target.hp() <= 0 || target.actor().isDead() || source.interrupted(targetId)) continue;
            if (!attackContext.decision.test(rules.nanakoDebuffRate(level))) continue;
            installBuff(sourceId, targetId, rules.battleBuff(debuffId), 0);
            requireCombat(targetId).attributes().addBase(effect.attribute(), effect.amount());
            if (requireCombat(targetId).identity().jobBonus() == 281) selected.add(targetId);
            else source.interrupt(targetId);
        }
        ordinaryDamage(2233500 + level, sourceId, selected, attackContext.damageType,
            source.activeSkill(), source.skillEnergy(), attackContext.elements, attackContext.decision);
        source.restore();
    }

    /** 不可变的普通伤害判定记录，未命中不转成1点伤害。 */
    public List<HeroBattleDamageAction.Result> ordinaryResults() {
        return List.copyOf(ordinaryResults);
    }

    /** 缺少入场属性时拒绝，不借用治疗简化属性构造普通伤害。 */
    private CombatData requireCombat(int id) {
        var data = combat.get(id);
        if (data == null) throw new IllegalStateException("战斗单位尚未绑定普通伤害数据：" + id);
        return data;
    }

    /** 使用真实105配置执行最小必中伤害链；不替代普通攻击命中、暴击、反击算法。 */
    public void realDamage(int buffId, int sourceId, int targetId) {
        int rate = rules.battleRealDamageRate(buffId);
        require(sourceId);
        require(targetId);
        transaction(() -> {
            started = true;
            State source = require(sourceId);
            State target = require(targetId);
            if (source.actor().isDead() || source.hp() <= 0 || target.actor().isDead() || target.hp() <= 0
                || source.actor().interrupted(targetId)) {
                return;
            }
            emit(187, source.actor(), target.actor());
            long amount = percent(source.attack(), rate);
            if (amount <= 0) {
                return;
            }
            DamageFrame previous = damageFrame;
            damageFrame = new DamageFrame(buffId, amount, true);
            try {
                emit(188, source.actor(), target.actor());
                emit(189, target.actor(), source.actor());
                deductDamage(buffId, sourceId, targetId, damageFrame.remaining);
            } finally {
                damageFrame = previous;
            }
        });
    }

    /** 旧199只在关联值非0且关联者存活时转移；额外伤害不再触发189，避免重复分摊。 */
    private void transferDamage(Listener listener, int attackerId) {
        if (listener.value() == 0) {
            return;
        }
        if (damageFrame == null) {
            throw new IllegalStateException("契约伤害事件缺少当前伤害上下文");
        }
        State contractor = require(Math.toIntExact(listener.value()));
        if (contractor.hp() <= 0 || contractor.actor().isDead()) {
            return;
        }
        int rate = rules.battleContract(listener.definition().buffId()).damageRate();
        long transfer = percent(damageFrame.remaining, rate);
        if (transfer < 0 || transfer > damageFrame.remaining) {
            throw new UnsupportedOperationException("契约异常伤害比例尚未支持");
        }
        damageFrame.remaining -= transfer;
        deductDamage(damageFrame.buffId, listener.sourceId(), contractor.actor().id(), transfer);
    }

    /**
     * 按旧consumeShield→heroHurt→triggerDefender执行；当前支持类型均非死亡保留Buff。
     * 源码疑点：heroHurt再次减去shieldValue，因此实际扣血仍含抵消量；先忠实保留，待正式服复核。
     */
    private void deductDamage(int buffId, int sourceId, int targetId, long amount) {
        var damage = deductDamage(buffId, sourceId, targetId, amount, true);
        if (!require(targetId).actor().isDead()) {
            emitHealthThreshold(damage);
        }
    }

    /** 普通伤害延后死亡事件直到攻方后置事件之后；105与契约额外伤害保持原时点。 */
    private Damage deductDamage(int buffId, int sourceId, int targetId, long amount, boolean finishDeath) {
        State target = require(targetId);
        var absorption = buffs.get(targetId).absorb(amount);
        removed(targetId, absorption.removed(), "shield-depleted");
        long reported = -(amount - absorption.absorbed());
        long actual = -Math.min(target.hp(), amount);
        long nextHp = target.hp() + actual;
        boolean dead = nextHp <= 0;
        units.put(targetId, target.withHp(nextHp));
        target.actor().setDead(dead);
        var damage = new Damage(buffId, sourceId, targetId, amount, absorption.absorbed(), reported, actual, dead);
        damages.add(damage);
        trace.add(new Trace("damage", round, sourceId, targetId, buffId, null, damage, null, ""));
        if (dead && finishDeath) {
            finishDeath(sourceId, targetId);
        }
        return damage;
    }

    /** 旧177在守方处理阶段读取本次扣盾后的战报量；嵌套伤害不串用同一命中。 */
    private void emitHealthThreshold(Damage damage) {
        var previous = healthThresholdDamage;
        healthThresholdDamage = damage;
        try {
            emit(177, require(damage.targetId()).actor(), require(damage.sourceId()).actor());
        } finally {
            healthThresholdDamage = previous;
        }
    }

    /** 非致死命中从门槛上方跨到严格下方才触发，按旧怪物状态和扣盾后伤害量计算。 */
    @Override
    public boolean crossedHealthThreshold(int buffId, Actor carrier) {
        var damage = healthThresholdDamage;
        var target = require(carrier.id());
        if (damage == null || damage.targetId() != carrier.id() || target.hp() <= 0) {
            return false;
        }
        double threshold = rules.battleHpThreshold(buffId) / 10000D;
        double current = target.hp() * 1D / target.maxHp();
        double before = Math.subtractExact(target.hp(), damage.reported()) * 1D / target.maxHp();
        return before >= threshold && current < threshold;
    }

    /** 死亡事件后清理当前支持的实例，并中断本次攻击该目标的后续动作。 */
    private void finishDeath(int sourceId, int targetId) {
        var fallen = units.remove(targetId);
        units.put(targetId, fallen);
        emit(180, require(targetId).actor(), require(sourceId).actor());
        removed(targetId, buffs.get(targetId).clearOnDeath(), "death");
        require(sourceId).actor().interrupt(targetId);
    }

    /** 返回不可变的伤害记录，明确区分旧战报量与真实血量变化。 */
    public List<Damage> damages() {
        return List.copyOf(damages);
    }

    /** 先移除冲突实例再应用效果；攻击偷取从已经退还旧效果的属性中取值。 */
    private HeroBattleBuffState.Entry installBuff(int sourceId, int targetId,
                                                  HeroBattleBuffState.Spec spec, long value) {
        Actor actor = require(targetId).actor();
        var state = buffs.get(targetId);
        long next = Math.max(actor.nextListenerId(), nextBuffInstance);
        nextBuffInstance = Math.addExact(next, 1);
        var change = state.add(next, sourceId, round, spec, value);
        removed(targetId, change.removed(), "replace");
        var current = change.current();
        if (spec.type() == 166) {
            int rate = rules.battleAttackStealRate(spec.id());
            var targetAttributes = requireCombat(targetId).attributes();
            long stolen = percent(targetAttributes.get(220), rate);
            targetAttributes.addBase(201, -rate);
            requireCombat(sourceId).attributes().addBase(220, stolen);
            current = state.setValue(current.instanceId(), stolen);
        }
        long speed = 0;
        if (spec.type() == 160) {
            var attribute = rules.controlAttribute(spec.id());
            if (attribute.attribute() == 101) {
                speed = attribute.amount();
            }
        }
        trace.add(new Trace("buff.upsert", round, sourceId, targetId, current.spec().id(),
            null, null, current, "", null, speed));
        return current;
    }

    /**
     * 按出手顺序执行回合监听和持续伤害，再执行到期诅咒并移除到期状态。强蓄力先加后减。
     * 本入口不是完整回合（尚无能量收支/女神/周期特殊效果）；必须覆盖全部场内单位且不重复。
     */
    public void beginRound(int currentRound, List<Integer> order, HeroBattleElementRules elements,
                           java.util.function.DoublePredicate decision) {
        if (currentRound <= round || attackContext != null
            || order.size() != units.size() || !new HashSet<>(order).equals(units.keySet())) {
            throw new IllegalArgumentException("回合或单位顺序无效");
        }
        var context = new AttackContext(elements, decision, 1);
        attackContext = context;
        try {
            transaction(() -> {
                started = true;
                round = currentRound;
                events.round(round);
                for (int id : order) {
                    var actor = require(id).actor();
                    if (actor.isHangUpSealed()) continue;
                    for (var entry : buffs.get(id).snapshot()) {
                        if (actor.isDead()) break;
                        if (Set.of(1201, 1203, 1205, 1206).contains(entry.spec().type())) {
                            tickAttackDamageOverTime(id, entry);
                            if (buffs.get(id).snapshot().contains(entry) && entry.expiresAt() <= round) {
                                expireEntry(id, entry);
                            }
                            continue;
                        }
                        if (entry.spec().type() != 201) continue;
                        // 旧executeRoundArt固定使用原Buff施加者和当前携带者。
                        applyImmediateArts(entry.spec().id(), entry.sourceId(), List.of(target(require(id))));
                        if (entry.expiresAt() <= round) expireEntry(id, entry);
                    }
                }
                // 旧固定回合阶段在回合开始监听之后运行，诅咒只在绝对到期回合扣血一次。
                for (int id : order) {
                    var actor = require(id).actor();
                    if (actor.isHangUpSealed()) {
                        continue;
                    }
                    for (var entry : buffs.get(id).snapshot()) {
                        if (actor.isDead()) {
                            break;
                        }
                        if (entry.spec().type() == 1207 && entry.expiresAt() == round) {
                            tickAttackDamageOverTime(id, entry);
                            if (buffs.get(id).snapshot().contains(entry)) {
                                expireEntry(id, entry);
                            }
                        }
                    }
                }
                for (int id : order) {
                    applyPeriodicRecovery(id);
                }
                if (!context.queue.isEmpty()) throw new UnsupportedOperationException("回合开始阶段额外行动尚未接入");
                expireAt(round);
            });
        } finally {
            attackContext = null;
        }
    }

    /** 303在回合伤害结束后按存活队友人数分配累计值，不触发普通施疗与受疗监听。 */
    private void applyPeriodicRecovery(int ownerId) {
        var owner = require(ownerId);
        if (owner.actor().isDead() || owner.actor().isHangUpSealed()) {
            return;
        }
        for (var entry : buffs.get(ownerId).snapshot()) {
            if (entry.spec().type() != 303) {
                continue;
            }
            var config = Objects.requireNonNull(rules.battlePeriodicRecovery(entry.spec().id()));
            var allies = units.values().stream()
                .filter(unit -> unit.faction() == owner.faction() && !unit.actor().isDead())
                .toList();
            var consumed = periodicRecovery.consume(ownerId, config.rate(), allies.size());
            if (consumed.isEmpty()) {
                continue;
            }
            long share = consumed.getAsLong();
            for (var ally : allies) {
                owner.actor().treatment(share);
                long healed = healingAmount(owner, ally, share);
                long actual = Math.min(healed, ally.maxHp() - ally.hp());
                units.put(ally.actor().id(), ally.withHp(Math.addExact(ally.hp(), actual)));
                recordRecovery(new Recovery(entry.spec().id(), ownerId, ally.actor().id(), share, healed, actual));
            }
        }
    }

    /** 战场在旧到期检查时点调用；只推进本批无周期效果的Buff，不模拟整回合战斗。 */
    public void expireAt(int currentRound) {
        if (currentRound < round || currentRound < 0) {
            throw new IllegalArgumentException("Buff回合不能倒退");
        }
        transaction(() -> {
            started = true;
            round = currentRound;
            events.round(currentRound);
            for (var id : units.keySet()) {
                // 逐实例移除后立刻通知，不能先批量删除导致lastExpired指向另一项。
                for (var entry : buffs.get(id).snapshot()) {
                    if (entry.expiresAt() <= round) {
                        expireEntry(id, entry);
                    }
                }
            }
        });
    }

    /** 旧checkExpiredBuff先移除再向原施加者发209；周期和普通到期共用同一入口。 */
    private void expireEntry(int targetId, HeroBattleBuffState.Entry entry) {
        removed(targetId, buffs.get(targetId).removeInstance(entry.instanceId()), "expire");
        emit(209, require(entry.sourceId()).actor(), require(targetId).actor());
    }

    /** 驱散指定效果类别的可驱散实例；绝对到期回合>=999的实例按旧规则保留。 */
    public void dispel(int targetId, int effect) {
        require(targetId);
        if (effect < 0 || effect > 3) {
            throw new IllegalArgumentException("驱散类别无效");
        }
        transaction(() -> removed(targetId, buffs.get(targetId).dispel(effect), "dispel"));
    }

    /** 统一清除监听并退还直接属性和双方攻击偷取，其他未移除状态保持有效。 */
    private void removed(int unitId, List<HeroBattleBuffState.Entry> entries, String reason) {
        for (int controlType : Set.of(1001, 1004, 1005, 1006, 1007, 1010, 1014)) {
            if (entries.stream().anyMatch(entry -> entry.spec().type() == controlType)) {
                require(unitId).actor().control(controlType, buffs.get(unitId).snapshot().stream()
                    .anyMatch(entry -> entry.spec().type() == controlType));
            }
        }
        for (var entry : entries) {
            lastExpired.put(unitId, entry);
            if (entry.spec().type() == 303) {
                periodicRecovery.clear(unitId);
            }
            long speed = 0;
            if (entry.spec().type() == 160) {
                var effect = rules.controlAttribute(entry.spec().id());
                requireCombat(unitId).attributes().addBase(effect.attribute(), -effect.amount());
                if (effect.attribute() == 101) {
                    speed = -effect.amount();
                }
            } else if (entry.spec().type() == 166) {
                requireCombat(unitId).attributes().addBase(201, rules.battleAttackStealRate(entry.spec().id()));
                requireCombat(entry.sourceId()).attributes().addBase(220, Math.negateExact(entry.value()));
            }
            require(unitId).actor().remove(entry.instanceId());
            removals.add(new Removal(unitId, entry, reason));
            trace.add(new Trace("buff.remove", round, entry.sourceId(), unitId, entry.spec().id(),
                null, null, entry, reason, null, speed));
            if (entry.spec().type() == 143 && entry.sourceId() == unitId) {
                int followup = rules.dailySoulWard(entry.spec().id());
                executeArt(new Invocation(entry.spec().id(), followup, unitId, unitId));
            }
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

    /** 保存可核对的事件时点，然后交给已有事件处理器和专用清心/契约处理器。 */
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

    /** 根调用保留回滚点；嵌套动作失败时撤回属性消费、血量、Buff、记录、监听与临时治疗量。 */
    private void transaction(Runnable action) {
        boolean root = depth == 0;
        var before = root ? new LinkedHashMap<>(units) : null;
        var checkpoints = new HashMap<Actor, Actor.Checkpoint>();
        var buffBefore = new HashMap<Integer, List<HeroBattleBuffState.Entry>>();
        var controlsBefore = root ? new HashMap<>(lastControls) : null;
        var expiredBefore = root ? new HashMap<>(lastExpired) : null;
        int roundBefore = round;
        long nextInstanceBefore = nextBuffInstance;
        int removalSize = removals.size();
        int damageSize = damages.size();
        int ordinarySize = ordinaryResults.size();
        int presentationSize = presentations.size();
        int traceSize = trace.size();
        var attributeBefore = new HashMap<Integer, Map<Integer, Long>>();
        var baseBefore = new HashMap<Integer, Map<Integer, Long>>();
        int recoverySize = recoveries.size();
        int signalSize = signals.size();
        var installedBefore = root ? new HashSet<>(installed) : null;
        var periodicRecoveryBefore = root ? periodicRecovery.checkpoint() : null;
        var extraTargetsBefore = root ? new HashMap<>(extraTargets) : null;
        boolean startedBefore = started;
        if (root) {
            steps = 0;
            combat.forEach((id, data) -> baseBefore.put(id, data.attributes().baseSnapshot()));
            combat.forEach((id, data) -> attributeBefore.put(id, data.attributes().snapshot()));
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
                periodicRecovery.restore(periodicRecoveryBefore);
                extraTargets.clear();
                extraTargets.putAll(extraTargetsBefore);
                lastExpired.clear();
                lastExpired.putAll(expiredBefore);
                lastControls.clear();
                lastControls.putAll(controlsBefore);
                baseBefore.forEach((id, values) -> combat.get(id).attributes().restoreBase(values));
                attributeBefore.forEach((id, values) -> combat.get(id).attributes().restore(values));
                ordinaryResults.subList(ordinarySize, ordinaryResults.size()).clear();
                presentations.subList(presentationSize, presentations.size()).clear();
                trace.subList(traceSize, trace.size()).clear();
                units.clear();
                units.putAll(before);
                checkpoints.forEach(Actor::rollback);
                damages.subList(damageSize, damages.size()).clear();
                recoveries.subList(recoverySize, recoveries.size()).clear();
                signals.subList(signalSize, signals.size()).clear();
                buffBefore.forEach((id, state) -> buffs.get(id).restore(state));
                round = roundBefore;
                events.round(roundBefore);
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

    /** 读取战场当前速度，包含未结束的速度Buff，供每回合及回合内排序。 */
    long currentSpeed(int unitId) {
        return requireCombat(unitId).attributes().get(101);
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
