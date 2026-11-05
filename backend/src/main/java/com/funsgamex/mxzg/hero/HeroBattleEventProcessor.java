/**
 * 最小战斗行动与Buff事件处理：行动、受击及治疗事件；200/311交给专用处理器，不能当成普通动作列表。
 * 每场战斗独立创建；只操作临时单位，不写资产。动作效果必须由调用者提供执行器，不提供空实现。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;

public final class HeroBattleEventProcessor {
    /** 本批明确支持的旧事件编号；其他类型不得当作已执行。 */
    private static final Set<Integer> SUPPORTED = Set.of(197, 172, 173, 170, 171, 186, 206, 199, 200, 311, 174, 175, 178, 179, 181, 182, 184, 190, 194);
    /** 战斗是否已结束，触发处理器在每个监听前读取。 */
    private boolean ended;

    /** 原动作ID、施加者来源（0施加者/1携带者）、是否配置选目标；不在这里猜目标。 */
    public record Art(int id, int sourceType, boolean hasTargets) {
        /** 未知来源拒绝。 */
        public Art {
            if (id <= 0 || (sourceType != 0 && sourceType != 1)) {
                throw new IllegalArgumentException("触发动作来源无效");
            }
        }
    }

    /** 已解析的通用动作触发Buff配置；173可限制技能ID，动作保留配置顺序。 */
    public record Definition(int buffId, int event, int skillFilter, List<Art> arts) {
        /** 未支持事件明确失败；不把未知处理器返回成功。 */
        public Definition {
            if (buffId <= 0 || !SUPPORTED.contains(event) || skillFilter < 0) {
                throw new IllegalArgumentException("尚未支持的战斗触发Buff");
            }
            arts = List.copyOf(arts);
        }
    }

    /** 本场监听实例；sourceId用于区分自身与外来Buff，同配置的不同实例不合并。 */
    public record Listener(long instanceId, int sourceId, Definition definition, long value) {
        /** 普通动作监听没有额外关联值；反向契约显式传入契约单位编号。 */
        public Listener(long instanceId, int sourceId, Definition definition) {
            this(instanceId, sourceId, definition, 0);
        }
    }
    /** 交给动作执行器的真实动作及来源、选目标上下文；targetContext不是最终目标列表。 */
    public record Invocation(int buffId, int artId, int sourceId, int targetContext) {}

    /** 一场战斗中的单位临时状态，与持久HeroProfile和输入快照分离。 */
    public static final class Actor {
        /** 本场单位编号，供来源/目标定位。 */
        private final int id;
        /** 只读技能计划，包含配置推导的先手标志。 */
        private final List<HeroBattleSkillUtils.Skill> skills;
        /** 当前有效控制Buff类型，本批不负责持续时间或叠层。 */
        private final Set<Integer> controls = new HashSet<>();
        /** 监听安装顺序；同优先级稳定保留，不按Buff ID排序。 */
        private final List<Listener> listeners = new ArrayList<>();
        /** 当前出手中断标记；与旧restore一致在每个监听处理后清空。 */
        private final Set<Integer> interrupts = new HashSet<>();
        /** 本次出手已关闭后置伤害触发的目标，合法新出手时清空；不能每段伤害重置。 */
        private final Set<Integer> closedDamageTargets = new HashSet<>();
        /** 当前选中的是队列反击动作；控制伤害后置事件资格，不代表已执行反击技能。 */
        private boolean counterattack;
        /** 死亡优先阻止行动，不能被能量9999绕过。 */
        private boolean dead;
        /** 挂机封印与1007状态共同控制事件触发，不代替行动禁止集合。 */
        private boolean hangUpSeal;
        /** 最近一次基础治疗量；治疗前设置，嵌套治疗可按旧语义覆盖，不使用局部变量替代。 */
        private long lastTreatment;
        /** 本次已选定技能；行动前事件改变控制状态也不重新选技能。 */
        private HeroBattleSkillUtils.Skill current;

        /** 从只读计划创建独立临时单位，不持有角色凭证或数据库。 */
        public Actor(int id, List<HeroBattleSkillUtils.Skill> skills) {
            if (id <= 0) {
                throw new IllegalArgumentException("战斗单位编号无效");
            }
            this.id = id;
            this.skills = List.copyOf(skills);
        }

        /** 动作事务只修改的临时状态，用于失败回滚与被动初始化回滚。 */
        record Checkpoint(Set<Integer> interrupts, List<Listener> listeners, long lastTreatment, boolean dead,
                          Set<Integer> closedDamageTargets, boolean counterattack,
                          Set<Integer> controls, boolean hangUpSeal, HeroBattleSkillUtils.Skill current) {}

        /** 保存本场动作状态，不包含数据库或角色资产。 */
        Checkpoint checkpoint() {
            return new Checkpoint(Set.copyOf(interrupts), List.copyOf(listeners), lastTreatment, dead,
                Set.copyOf(closedDamageTargets), counterattack, Set.copyOf(controls), hangUpSeal, current);
        }

        /** 失败时恢复动作前状态，不把失败的嵌套治疗残留到下一次动作。 */
        void rollback(Checkpoint state) {
            interrupts.clear();
            interrupts.addAll(state.interrupts());
            listeners.clear();
            listeners.addAll(state.listeners());
            lastTreatment = state.lastTreatment();
            dead = state.dead();
            closedDamageTargets.clear();
            closedDamageTargets.addAll(state.closedDamageTargets());
            counterattack = state.counterattack();
            controls.clear();
            controls.addAll(state.controls());
            hangUpSeal = state.hangUpSeal();
            current = state.current();
        }

        /** 反击1301取当前技能计划中的普通攻击，不借用主动技能。 */
        public HeroBattleSkillUtils.Skill generalAttack() {
            return skills.stream().filter(skill -> skill.activeType() == 2).reduce((a, b) -> b)
                .orElseThrow(() -> new IllegalStateException("单位缺少普通攻击技能"));
        }

        /** 旧isCounterattack条件：控制整组伤害后置事件，不是单纯是否追加反击动作。 */
        public boolean canTriggerDamage(boolean fixedAttack, boolean buffAllowsCounterattack, int targetId) {
            return !fixedAttack && buffAllowsCounterattack && !counterattack
                && !closedDamageTargets.contains(targetId);
        }

        /** 命中且后置处理完成后关闭目标；未命中提前返回时不得调用，防止下一段错误跳过事件。 */
        public void finishDamage(boolean buffAllowsCounterattack, int targetId) {
            if (buffAllowsCounterattack || counterattack) {
                closedDamageTargets.add(targetId);
            }
        }

        /** 仅在合法出手开始时清空本次目标标记，不在目标循环、嵌套伤害或事件回调中重置。 */
        private void beginDamageAction() {
            closedDamageTargets.clear();
        }

        /** 取得当前单位未使用的监听实例编号，保留已有手工安装的监听。 */
        long nextListenerId() {
            return Math.addExact(listeners.stream().mapToLong(Listener::instanceId).max().orElse(0), 1);
        }

        /** 治疗前设置基础量，供治疗相关事件读取。 */
        void treatment(long value) {
            lastTreatment = value;
        }

        /** 返回最近基础治疗量，尚未发生治疗时为0。 */
        public long lastTreatment() {
            return lastTreatment;
        }

        /** 返回本场编号。 */
        public int id() { return id; }
        /** 由实际效果处理器更新死亡状态。 */
        public void setDead(boolean value) { dead = value; }
        /** 设置旧挂机封印标志；不开放挂机玩法。 */
        public void setHangUpSeal(boolean value) { hangUpSeal = value; }
        /** 查询当前控制状态，供效果执行器判断禁疗与未支持的目标改选。 */
        public boolean hasControl(int type) {
            return controls.contains(type);
        }

        /** 查询战场标记的死亡状态，不通过施法者配置推测。 */
        public boolean isDead() {
            return dead;
        }

        /** 安装或移除当前有效控制类型；持续时间管理后续接入。 */
        public void control(int type, boolean present) {
            if (present) {
                controls.add(type);
            } else {
                controls.remove(type);
            }
        }
        /** 安装独立监听；同一实例重复登记拒绝，避免重复触发。 */
        public void listen(Listener listener) {
            Objects.requireNonNull(listener.definition());
            if (listener.instanceId() <= 0 || listener.sourceId() <= 0
                || listeners.stream().anyMatch(row -> row.instanceId() == listener.instanceId())) {
                throw new IllegalArgumentException("战斗Buff实例无效或重复");
            }
            listeners.add(listener);
        }
        /** 移除后续事件的监听；不修改本次已经捕获的触发快照。 */
        public void remove(long instanceId) { listeners.removeIf(row -> row.instanceId() == instanceId); }
        /** 记录当前出手被中断的目标。 */
        public void interrupt(int target) { interrupts.add(target); }
        /** 查询当前出手中断标记，供真实动作执行器使用。 */
        public boolean interrupted(int target) { return interrupts.contains(target); }
        /** 旧restore只清中断标记，不清Buff或控制状态。 */
        void restore() { interrupts.clear(); }
    }

    /** 必须实现真实动作处理；未支持的动作应抛错，不能空回调伪造战斗完成。 */
    public interface Executor {
        /** 执行选中技能的动作；此接口不默认计算伤害或奖励。 */
        void skill(Actor actor, HeroBattleSkillUtils.Skill skill);
        /** 按动作ID执行效果，来源和目标上下文已经依旧规则确定。 */
        void art(Invocation invocation);
        /** 专用监听处理器；未实现时必须拒绝，不能用空回调冒充驱散/契约。 */
        default void special(Listener listener, Actor carrier, int target) {
            throw new UnsupportedOperationException("尚未支持的特殊Buff：" + listener.definition().event());
        }
    }

    /** 显式标记战斗结束，后续Buff处理不执行动作。 */
    public void end() { ended = true; }

    /**
     * 候选选择→行动前事件→资格校验→技能动作→使用事件→攻击事件；反击省略最后两类。
     * @return true仅表示本批范围的技能执行器已调用，不代表完整伤害、战斗或结算完成。
     */
    public boolean act(Actor actor, int round, HeroBattleSkillUtils.Skill queuedAction,
                       long skillEnergy, Executor executor) {
        Objects.requireNonNull(executor);
        if (ended) {
            return false;
        }
        actor.current = HeroBattleSkillUtils.choose(actor.skills, round, queuedAction,
            HeroBattleActionUtils.onlyAttack(actor.controls));
        actor.counterattack = queuedAction != null;
        dispatch(197, actor, actor.id, executor);
        if (!HeroBattleActionUtils.canAct(actor.dead, actor.current, skillEnergy, actor.controls)) {
            return false;
        }
        actor.beginDamageAction();
        executor.skill(actor, actor.current);
        if (queuedAction == null) {
            dispatch(actor.current.activeType() == 1 ? 173 : 172, actor, actor.id, executor);
            dispatch(170, actor, actor.id, executor);
        }
        return true;
    }

    /** 按旧监听快照稳定排序：外来Buff先执行，自身其次；本批通用类型priority均为0。 */
    public void dispatch(int event, Actor carrier, int target, Executor executor) {
        if (!SUPPORTED.contains(event) && !Set.of(187, 188, 189, 180, 177, 176, 204).contains(event)) {
            throw new IllegalArgumentException("尚未支持的战斗事件：" + event);
        }
        Objects.requireNonNull(executor);
        if (carrier == null || carrier.hangUpSeal || carrier.controls.contains(1007)) {
            return;
        }
        var pending = carrier.listeners.stream().filter(row -> (row.definition().event() == event || (event == 206 && row.definition().event() == 200) || (event == 189 && row.definition().event() == 199)))
            .sorted(Comparator.comparing(row -> row.sourceId() == carrier.id)).toList();
        for (var listener : pending) {
            var definition = listener.definition();
            if (definition.event() == 199 || definition.event() == 200 || definition.event() == 311) {
                // 旧专用trigger不经过AbstractArtTrigger的战斗结束检查。
                executor.special(listener, carrier, target);
            } else if (!ended && (event != 173 || definition.skillFilter() == 0
                || (carrier.current != null && carrier.current.skillId() == definition.skillFilter()))) {
                int targetContext = target;
                for (var art : definition.arts()) {
                    int source = art.sourceType() == 0 ? listener.sourceId() : carrier.id;
                    targetContext = art.hasTargets() || listener.sourceId() != carrier.id ? carrier.id : targetContext;
                    executor.art(new Invocation(definition.buffId(), art.id(), source, targetContext));
                }
            }
            carrier.restore();
        }
    }
}
