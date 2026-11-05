/**
 * 每场战斗独立的治疗/契约及普通与105伤害子集执行器：配置→目标→事件→生命/Buff变化。
 * 支持通用治疗事件及自身被动安装；不支持控制改选/临时目标数；不写资产、不生成奖励，不代表完整技能引擎。
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

    /** 每个单位自己的Buff实例集合，与Actor监听通过实例编号关联。 */
    private final Map<Integer, HeroBattleBuffState> buffs = new LinkedHashMap<>();
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
    /** 成功的伤害记录；根动作失败时与血量及Buff一起回滚。 */
    private final List<Damage> damages = new ArrayList<>();
    /** 配置计算伤害、护盾消耗、旧战报扣血与实际血量变化分别保留。 */
    public record Damage(int buffId, int sourceId, int targetId, long incoming,
                         long absorbed, long reported, long actual, boolean dead) {}
    /** 本次可被契约修改的扣血前伤害绝对量。 */
    private static final class DamageFrame {
        /** 原始伤害配置，额外伤害沿用。 */
        final int buffId;
        /** 当前剩余伤害，被199监听减少。 */
        long remaining;
        /** 保存当前伤害上下文，不创建新的资产状态。 */
        DamageFrame(int buffId, long remaining) {
            this.buffId = buffId;
            this.remaining = remaining;
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

        /** 复用旧选目标规则所需的最小属性。 */
        private HeroBattleTargetUtils.Unit target() {
            return new HeroBattleTargetUtils.Unit(actor.id(), faction, position, attack, hp, maxHp);
        }
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

    /** 执行预检的纯100号普通攻击技能；其他技能类型仍拒绝。 */
    @Override
    public void skill(Actor actor, HeroBattleSkillUtils.Skill skill) {
        if (attackContext == null) throw new UnsupportedOperationException("普通攻击缺少根动作上下文");
        var source = require(actor.id());
        if (actor.hasControl(1011) || actor.hasControl(1013) || actor.hasControl(1015)) {
            throw new UnsupportedOperationException("普通攻击控制改选尚未支持");
        }
        for (var art : rules.ordinarySkillArts(skill)) {
            var living = units.values().stream().filter(u -> u.hp() > 0 && !u.actor().isDead()).map(State::target).toList();
            var targets = HeroBattleTargetUtils.select(art.targets(), source.target(), living,
                List.of(require(attackContext.target).target()), attackContext.queued);
            for (int buffId : art.buffs()) {
                if (rules.battleProjectile(buffId)) {
                    for (var target : targets) presentations.add(new Presentation(buffId, actor.id(), target.id()));
                    continue;
                }
                ordinaryDamage(buffId, actor.id(), targets.stream().map(HeroBattleTargetUtils.Unit::id).toList(),
                    attackContext.damageType, false, 0, attackContext.elements, attackContext.decision);
                actor.restore();
            }
        }
    }

    /** 执行单位真实普攻并依序排空1301反击；暂只支持物理普攻，完整技能/回合调度后续接入。 */
    public void attack(int sourceId, int targetId, HeroBattleElementRules elements,
                       java.util.function.DoublePredicate decision) {
        if (attackContext != null) throw new IllegalStateException("技能根动作不能嵌套，反击必须入队");
        var actor = require(sourceId).actor();
        require(targetId);
        rules.ordinarySkillArts(actor.generalAttack());
        var context = new AttackContext(elements, decision, 1);
        context.target = targetId;
        attackContext = context;
        try {
            transaction(() -> {
                started = true;
                events.act(actor, round, null, 0, this);
                int count = 0;
                while (!context.queue.isEmpty()) {
                    if (++count > 128) throw new IllegalStateException("反击队列超过执行上限");
                    var action = context.queue.removeFirst();
                    context.target = action.target();
                    context.queued = true;
                    events.act(require(action.source()).actor(), round, action.skill(), 0, this);
                }
            });
        } finally {
            attackContext = null;
        }
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
        if (rules.isGeneralCounterattackArt(invocation.artId())) {
            if (attackContext == null) throw new IllegalStateException("反击动作没有技能根事务");
            var source = require(invocation.sourceId());
            var living = units.values().stream().filter(u -> u.hp() > 0 && !u.actor().isDead()).map(State::target).toList();
            var selected = HeroBattleTargetUtils.select(rules.battleTargets(invocation.artId()), source.target(), living,
                List.of(require(invocation.targetContext()).target()), false);
            var skill = source.actor().generalAttack();
            rules.ordinarySkillArts(skill);
            for (var target : selected) attackContext.queue.addLast(new CounterAction(source.actor().id(), target.id(), skill));
            return;
        }
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
                if (hasStatus(target.id(), 1009)) {
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

    /** 执行专用trigger，保持事件快照中的关联值，即使同轮监听已被移除也不丢失上下文。 */
    @Override
    public void special(Listener listener, Actor carrier, int targetId) {
        transaction(() -> {
            if (listener.definition().event() == 199) {
                transferDamage(listener, targetId);
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

    /** 校验随机入口返回范围，错误时回滚，不用取模掩盖不兼容算法。 */
    private int randomIndex(int bound) {
        int index = random.index(bound);
        if (index < 0 || index >= bound) {
            throw new IllegalArgumentException("清心随机下标越界");
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
        recoveries.add(new Recovery(listener.definition().buffId(), source.actor().id(),
            contractor.actor().id(), transfer, amount, actual));
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
                .map(State::target).toList();
            var targets = HeroBattleTargetUtils.select(plan.targets(), source.target(), living,
                List.of(context.target()), false);
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

    /** 本场效果设置下一次读取覆盖值；值只保存在战斗状态，根事务会撤回。 */
    public void setOnceAttribute(int unitId, int type, long value) {
        requireCombat(unitId).attributes().setOnce(type, value);
    }

    /** 返回一次性状态只读快照，供动作及回归核对消费边界。 */
    public Map<Integer, Long> onceAttributes(int unitId) {
        return requireCombat(unitId).attributes().snapshot();
    }

    /** 安装已命中的真实1251抗暴实例；由伤害计算移除首层，不伪触发通用到期回调。 */
    public void installCounterCrit(int buffId, int sourceId, int targetId) {
        var spec = rules.battleCounterCrit(buffId);
        require(sourceId);
        require(targetId);
        transaction(() -> installBuff(sourceId, targetId, spec, 0));
    }

    /**
     * 执行已选定目标的普通伤害子集；伤害类型、主动标志和能量由当前技能上下文显式提供。
     * 独立入口拒绝反击配置；技能根入口接后置事件/反击，每目标立即扣血，整组共享事务。
     */
    public void ordinaryDamage(int buffId, int sourceId, List<Integer> targetIds, int damageType,
                               boolean activeSkill, long energy, HeroBattleElementRules elements,
                               java.util.function.DoublePredicate decision) {
        int rate = rules.battleOrdinaryDamageRate(buffId, attackContext != null);
        var targets = List.copyOf(targetIds);
        requireCombat(sourceId);
        targets.forEach(this::requireCombat);
        var calculator = new HeroBattleDamageAction(elements, decision);
        transaction(() -> {
            started = true;
            for (int targetId : targets) {
                var source = require(sourceId);
                var target = require(targetId);
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
                var result = calculator.calculate(request, () -> {
                    var entries = buffs.get(sourceId).removeFirst(1251);
                    if (entries.isEmpty()) throw new IllegalStateException("抗暴标记没有对应实例");
                    removed(sourceId, entries, "counter-crit");
                });
                ordinaryResults.add(result);
                if (result.missed()) {
                    emit(204, target.actor(), source.actor());
                    continue;
                }
                var previous = damageFrame;
                damageFrame = new DamageFrame(buffId, Math.negateExact(result.damage()));
                try {
                    emit(188, source.actor(), target.actor());
                    emit(189, target.actor(), source.actor());
                    deductDamage(buffId, sourceId, targetId, damageFrame.remaining, false);
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
                        emit(177, target.actor(), source.actor());
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
                } finally {
                    damageFrame = previous;
                }
            }
        });
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
            damageFrame = new DamageFrame(buffId, amount);
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
        deductDamage(buffId, sourceId, targetId, amount, true);
    }

    /** 普通伤害延后死亡事件直到攻方后置事件之后；105与契约额外伤害保持原时点。 */
    private void deductDamage(int buffId, int sourceId, int targetId, long amount, boolean finishDeath) {
        State target = require(targetId);
        var absorption = buffs.get(targetId).absorb(amount);
        removed(targetId, absorption.removed(), "shield-depleted");
        long reported = -(amount - absorption.absorbed());
        long actual = -Math.min(target.hp(), amount);
        long nextHp = target.hp() + actual;
        boolean dead = nextHp <= 0;
        units.put(targetId, target.withHp(nextHp));
        target.actor().setDead(dead);
        damages.add(new Damage(buffId, sourceId, targetId, amount, absorption.absorbed(), reported, actual, dead));
        if (dead && finishDeath) {
            finishDeath(sourceId, targetId);
        }
    }

    /** 死亡事件后清理当前支持的实例，并中断本次攻击该目标的后续动作。 */
    private void finishDeath(int sourceId, int targetId) {
        emit(180, require(targetId).actor(), require(sourceId).actor());
        removed(targetId, buffs.get(targetId).clearOnDeath(), "death");
        require(sourceId).actor().interrupt(targetId);
    }

    /** 返回不可变的伤害记录，明确区分旧战报量与真实血量变化。 */
    public List<Damage> damages() {
        return List.copyOf(damages);
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
        int roundBefore = round;
        long nextInstanceBefore = nextBuffInstance;
        int removalSize = removals.size();
        int damageSize = damages.size();
        int ordinarySize = ordinaryResults.size();
        int presentationSize = presentations.size();
        var attributeBefore = new HashMap<Integer, Map<Integer, Long>>();
        int recoverySize = recoveries.size();
        int signalSize = signals.size();
        var installedBefore = root ? new HashSet<>(installed) : null;
        boolean startedBefore = started;
        if (root) {
            steps = 0;
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
                attributeBefore.forEach((id, values) -> combat.get(id).attributes().restore(values));
                ordinaryResults.subList(ordinarySize, ordinaryResults.size()).clear();
                presentations.subList(presentationSize, presentations.size()).clear();
                units.clear();
                units.putAll(before);
                checkpoints.forEach(Actor::rollback);
                damages.subList(damageSize, damages.size()).clear();
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
