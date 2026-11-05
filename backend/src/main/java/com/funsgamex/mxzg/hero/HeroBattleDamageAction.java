/**
 * 普通伤害的属性读取与计算动作，按旧FightUtil顺序消费一次性属性。
 * 只产出扣血前结果；未接护盾、死亡或战报。多目标计算失败恢复所有参与者的一次性属性。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import java.util.function.DoublePredicate;

public final class HeroBattleDamageAction {
    /** 旧属性枚举顺序中的负面状态伤害加成；即使目标无对应状态也要读取属性。 */
    private static final List<Integer> STATUS_BONUSES = List.of(260, 261, 262, 263, 264, 265, 301, 302, 303, 304, 305, 306);
    /** 同源元素配置，由应用装配注入。 */
    private final HeroBattleElementRules elements;
    /** 外部明确提供的随机判定，不内置推定算法；随机源状态不属于本类回滚范围。 */
    private final DoublePredicate random;

    /**
     * 单目标计算上下文：伤害类型1物理/2法术，技能伤害为万分比，能量为旧整数点数。
     * jobBonus是守方职业对应的攻方属性281至285；activeStatusBonuses由真实目标状态判断提供。
     * hasCounterCrit表示攻方有抗暴Buff；独立计算入口缺少移除回调时拒绝，战场入口在根事务内提供回调。
     */
    public record Request(HeroBattleAttributeState attacker, HeroBattleAttributeState defender,
                          int attackerElement, int defenderElement, int damageType,
                          int skillDamage, boolean activeSkill, long energy, boolean fixedAttack,
                          boolean sealed, boolean hasCounterCrit, int jobBonus, Set<Integer> activeStatusBonuses) {
        /** 验证明确上下文，不为未知伤害类型、职业或状态来源补中性倍率。 */
        public Request {
            Objects.requireNonNull(attacker);
            Objects.requireNonNull(defender);
            activeStatusBonuses = Set.copyOf(activeStatusBonuses);
            if ((damageType != 1 && damageType != 2) || jobBonus < 281 || jobBonus > 285
                || !STATUS_BONUSES.containsAll(activeStatusBonuses)) {
                throw new IllegalArgumentException("普通伤害上下文尚未支持");
            }
        }
    }

    /** 未扣血的负数伤害；miss时-1是旧计算标记，不能当真实扣血；暴击抽样与实际暴击分开记录。 */
    public record Result(long damage, boolean missed, boolean rolledCritical, boolean critical, boolean blocked) {}

    /** 注入配置与判定源；无默认随机实现，保留缺失RandomUtils的核查边界。 */
    public HeroBattleDamageAction(HeroBattleElementRules elements, DoublePredicate random) {
        this.elements = Objects.requireNonNull(elements);
        this.random = Objects.requireNonNull(random);
    }

    /**
     * 按目标顺序计算整个动作，成功保留消费；任一计算失败恢复动作开始时所有一次性属性。
     * 返回前不发布结果或修改血量；随机源已消耗的抽样不自动回退，不可据此声称可确定性重放。
     */
    public List<Result> execute(List<Request> requests) {
        var plan = List.copyOf(requests);
        var snapshots = new IdentityHashMap<HeroBattleAttributeState, Map<Integer, Long>>();
        for (var request : plan) {
            snapshots.computeIfAbsent(request.attacker(), HeroBattleAttributeState::snapshot);
            snapshots.computeIfAbsent(request.defender(), HeroBattleAttributeState::snapshot);
        }
        try {
            var results = new ArrayList<Result>();
            for (var request : plan) {
                results.add(calculate(request));
            }
            return List.copyOf(results);
        } catch (RuntimeException error) {
            snapshots.forEach(HeroBattleAttributeState::restore);
            throw error;
        }
    }

    /** 严格沿旧calDamage的读取顺序计算，不能预读成Map或复用被消费前的攻击/精准值。 */
    private Result calculate(Request r) {
        return calculate(r, null);
    }

    /** 由战场根事务调用；抗暴移除回调必须与属性、Buff和血量共同回滚。 */
    Result calculate(Request r, Runnable removeCounterCrit) {
        var a = r.attacker();
        var d = r.defender();
        long attack = a.get(220);
        long fixedDamage = a.get(221);
        double armor = a.rate(203);
        double damageAdd = a.rate(270);
        double skill = r.skillDamage() / 10000D;
        double element = elements.damageMultiplier(r.attackerElement(), r.defenderElement(), a);
        double defense = HeroBattleAttributeUtils.defenseRate(d.get(224), d.get(150));
        double reduce = Math.min(d.rate(291), 0.75D);
        double skillAdd = r.activeSkill() ? a.rate(200) : 0D;
        double elementHit = elements.pair(r.attackerElement(), r.defenderElement()).hit() / 10000D;
        double precision = Math.min((a.rate(211) + elementHit - 1D) * 0.3D, 0.45D);
        double weak = d.rate(230);
        double resistance = d.rate(r.damageType() == 1 ? 241 : 240);
        double typeAdd = a.rate(r.damageType() == 1 ? 271 : 272);
        if (!random.test(HeroBattleHitUtils.hitChance(a.rate(226), d.rate(227)))) {
            return new Result(-1, true, false, false, false);
        }
        boolean rolledCritical = random.test(HeroBattleHitUtils.criticalChance(a.rate(207), d.rate(208)));
        var critical = HeroBattleHitUtils.critical(r.fixedAttack(), rolledCritical, r.sealed(), r.hasCounterCrit());
        if (critical.removeCounterCrit()) {
            if (removeCounterCrit == null) {
                throw new IllegalArgumentException("普通伤害抗暴Buff移除回调尚未接入");
            }
            removeCounterCrit.run();
        }
        double criticalDamage = critical.readCriticalDamage()
            ? HeroBattleHitUtils.criticalMultiplier(a.rate(222)) : 1D;
        double criticalRate = critical.critical() ? criticalDamage : 1D;
        boolean blocked = !r.fixedAttack() && random.test(
            HeroBattleHitUtils.blockChance(a.rate(211), elementHit, d.rate(210)));
        double block = HeroBattleHitUtils.blockReduction(blocked, rolledCritical);
        double energy = r.fixedAttack() ? 1D : r.activeSkill() ? Math.max(0D, (r.energy() - 100D) / 100D) : 0D;
        int spellType = r.damageType() == 1 ? 340 : 341;
        double spellDefense = spell(d.get(spellType));
        double damage = attack * (1D - (defense + spellDefense) * (1D - Math.min(armor, 1D)));
        double sacred = a.get(220) * a.rate(225) * 0.7D;
        double statusAdd = 0D;
        for (int type : STATUS_BONUSES) {
            double rate = a.rate(type);
            if (rate != 0D && r.activeStatusBonuses().contains(type)) {
                statusAdd += rate;
            }
        }
        double job = a.rate(r.jobBonus());
        double effect = a.rate(10);
        double spellDamage = spell(a.get(spellType));
        double total = (damage + sacred) * (1D - reduce) * (1D - block)
            * (1D + damageAdd + precision) * criticalRate * element * (skill + skillAdd + energy)
            * (1D + weak) * (1D + statusAdd) * (1D + job) * (1D - resistance)
            * (1D + typeAdd) * (1D + effect) * (1D + spellDamage);
        total += fixedDamage;
        if (!Double.isFinite(total) || total >= 0x1p63 || total <= -0x1p63) {
            throw new IllegalArgumentException("普通伤害计算超出long范围");
        }
        return new Result((long) Math.min(-total, -1D), false, rolledCritical, critical.critical(), blocked);
    }

    /** 旧驱使/咒术折算：负值产生非有限结果时拒绝整次动作，不当成零倍率。 */
    private static double spell(long value) {
        double result = 0.01D * Math.pow(value, 0.45D);
        if (!Double.isFinite(result)) {
            throw new IllegalArgumentException("驱使或咒术属性不能完成伤害折算");
        }
        return result;
    }
}
