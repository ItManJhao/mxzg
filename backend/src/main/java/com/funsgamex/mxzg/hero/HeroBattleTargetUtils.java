/**
 * 旧版动作目标选择子集：由动作执行器在应用效果前调用，只计算本场目标，不修改资产。
 * 调用者提供战场维护的存活名单；死亡、随机、控制改选和临时目标数尚未接入。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;

public final class HeroBattleTargetUtils {
    /** 已核对的选择器，未知类型不能降级为默认敌人。 */
    private static final Set<Integer> SUPPORTED = Set.of(0, 1, 2, 3, 4, 6, 7, 10, 11, 12);

    /** 纯规则工具禁止实例化。 */
    private HeroBattleTargetUtils() {}

    /** 本场单位编号、阵营、站位、当前折算攻击及实时生命；不使用英雄配置ID代替单位编号。 */
    public record Unit(int id, int faction, int position, double attack, long hp, long maxHp) {
        /** 拒绝无法用于定位或排序的单位。 */
        public Unit {
            if (id <= 0 || position <= 0 || !Double.isFinite(attack)) {
                throw new IllegalArgumentException("战斗目标单位无效");
            }
        }
    }

    /** 原动作编号、按配置排列的选择器及目标数量；0沿用旧版上限99。 */
    public record Plan(int artId, List<Integer> selectors, int count) {
        /** 完整校验选择器后才允许执行，避免执行到一半才发现未支持。 */
        public Plan {
            selectors = List.copyOf(selectors);
            if (artId <= 0 || count < 0 || !SUPPORTED.containsAll(selectors)) {
                throw new IllegalArgumentException("动作目标选择尚未支持或配置无效：" + artId);
            }
        }
    }

    /**
     * 按旧BattleService与选择器顺序选择；上下文仅在无选择器或普通反击时保留。
     * liveUnits按旧战场顺序传入，context必须来自同一战场；返回不可变目标列表。
     * 本入口只接受无混乱/离间/挑衅改选、无临时目标数的动作，不能作为完整技能执行成功。
     */
    public static List<Unit> select(Plan plan, Unit source, List<Unit> liveUnits,
                                    List<Unit> context, boolean ordinaryCounterattack) {
        var targets = new LinkedHashSet<Unit>(context);
        if (ordinaryCounterattack && !targets.isEmpty()) {
            return List.copyOf(targets);
        }
        if (plan.selectors().isEmpty()) {
            return List.copyOf(targets);
        }
        targets.clear();
        int lastType = plan.selectors().getLast();
        for (int type : plan.selectors()) {
            // 旧isLastType比较类型值而非索引；重复出现末项类型时也使用最终数量。
            int count = type == lastType && plan.count() != 0 ? plan.count() : 99;
            switch (type) {
                case 0 -> targets.remove(source);
                case 1 -> targets.add(source);
                case 2, 3 -> liveUnits.stream()
                    .filter(unit -> (unit.faction() == source.faction()) == (type == 2))
                    .forEach(targets::add);
                case 4 -> replace(targets, targets.stream().limit(count).toList());
                case 6, 7 -> {
                    var preferred = targets.stream().filter(unit -> (unit.position() <= 4) == (type == 6)).toList();
                    // 旧规则：目标排为空则保持原集合，不自行截取数量。
                    if (!preferred.isEmpty()) {
                        replace(targets, preferred);
                    }
                }
                case 11 -> replace(targets, targets.stream()
                    .sorted(Comparator.comparingDouble(unit -> unit.hp() * 1D / unit.maxHp()))
                    .limit(count).toList());
                case 10 -> {
                    // 保留旧TreeMap同优先级覆盖语义，不擅自改成稳定排序。
                    var positions = new TreeMap<Integer, Unit>();
                    for (var unit : targets) {
                        int row = (unit.position() - 1) / 4 + 1;
                        int column = (unit.position() - 1) % 4 + 1;
                        int sourceColumn = (source.position() - 1) % 4 + 1;
                        int priority = 10 * (row * 10 + Math.abs(sourceColumn - column)) - column;
                        positions.put(priority, unit);
                    }
                    replace(targets, positions.values().stream().limit(count).toList());
                }
                case 12 -> replace(targets, targets.stream()
                    .sorted(Comparator.comparingDouble(Unit::attack).reversed()).limit(count).toList());
                default -> throw new IllegalStateException("未支持的目标选择器：" + type);
            }
        }
        return List.copyOf(targets);
    }

    /** 用已计算的结果替换有序集合，保留选择器决定的顺序。 */
    private static void replace(LinkedHashSet<Unit> targets, List<Unit> selected) {
        targets.clear();
        targets.addAll(selected);
    }
}
