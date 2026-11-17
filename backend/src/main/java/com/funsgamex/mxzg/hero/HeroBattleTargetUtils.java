/**
 * 旧版动作目标选择子集：由动作执行器在应用效果前调用，只计算本场目标，不修改资产。
 * 调用者提供战场维护的存活名单；死亡、控制改选和临时目标数尚未接入；随机选择由调用方提供有界下标。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;

public final class HeroBattleTargetUtils {
    /** 已核对的选择器，未知类型不能降级为默认敌人。 */
    private static final Set<Integer> SUPPORTED = Set.of(0, 1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 23);

    /** 纯规则工具禁止实例化。 */
    private HeroBattleTargetUtils() {}

    /** 本场身份、站位与生命；speed仅在14排序比较时读取真实属性池，避免其他选择消费一次性速度。 */
    public record Unit(int id, int faction, int position, double attack, long hp, long maxHp,
                       java.util.function.LongSupplier speed) {
        /** 不使用速度选择器的已有调用无须伪造速度；14号选择器遇到缺失会明确拒绝。 */
        public Unit(int id, int faction, int position, double attack, long hp, long maxHp) {
            this(id, faction, position, attack, hp, maxHp, null);
        }
        /** 拒绝无法用于定位或排序的单位。 */
        public Unit {
            if (id <= 0 || position <= 0 || !Double.isFinite(attack)) {
                throw new IllegalArgumentException("战斗目标单位无效");
            }
        }

        /** 目标集合以原身份/状态比较；读取函数的对象身份不能让同一单位在集合中重复。 */
        @Override
        public boolean equals(Object other) {
            return other instanceof Unit unit && id == unit.id && faction == unit.faction
                && position == unit.position && Double.compare(attack, unit.attack) == 0
                && hp == unit.hp && maxHp == unit.maxHp;
        }

        /** 与目标状态相等条件一致，不把临时读取闭包加入散列键。 */
        @Override
        public int hashCode() {
            return Objects.hash(id, faction, position, attack, hp, maxHp);
        }
    }

    /** 原动作编号、选择器、目标数量与target_value参数；数量0沿用旧版上限99。 */
    public record Plan(int artId, List<Integer> selectors, int count, List<Integer> values) {
        /** 不含参数的既有动作保持空参数，不能用默认参数通过23号前后排选择。 */
        public Plan(int artId, List<Integer> selectors, int count) {
            this(artId, selectors, count, List.of());
        }
        /** 完整校验选择器后才允许执行，避免执行到一半才发现未支持。 */
        public Plan {
            selectors = List.copyOf(selectors);
            values = List.copyOf(values);
            if (artId <= 0 || count < 0 || !SUPPORTED.containsAll(selectors)) {
                throw new IllegalArgumentException("动作目标选择尚未支持或配置无效：" + artId);
            }
            if (selectors.contains(23) && (values.isEmpty() || values.stream().anyMatch(value -> value < 1 || value > 2))) {
                throw new IllegalArgumentException("前后排选择参数尚未支持或缺失：" + artId);
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
        return select(plan, source, liveUnits, context, ordinaryCounterattack, bound -> {
            throw new IllegalStateException("随机选目标缺少本场随机源");
        });
    }

    /** 旧RandomSelector/RandomUtil.randomList：逐次从剩余列表移除随机下标；不足数量不抽样、不重排。 */
    public static List<Unit> select(Plan plan, Unit source, List<Unit> liveUnits,
                                    List<Unit> context, boolean ordinaryCounterattack,
                                    java.util.function.IntUnaryOperator randomIndex) {
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
                case 8 -> {
                    if (targets.size() > count) {
                        var remaining = new ArrayList<>(targets);
                        var selected = new ArrayList<Unit>();
                        for (int index = 0; index < count; index++) {
                            int chosen = randomIndex.applyAsInt(remaining.size());
                            if (chosen < 0 || chosen >= remaining.size()) {
                                throw new IllegalArgumentException("随机目标下标越界");
                            }
                            selected.add(remaining.remove(chosen));
                        }
                        replace(targets, selected);
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
                case 14 -> {
                    if (targets.stream().anyMatch(unit -> unit.speed() == null)) {
                        throw new IllegalArgumentException("速度选择缺少本场真实速度：" + plan.artId());
                    }
                    replace(targets, targets.stream().sorted(Comparator.comparingLong((Unit unit) -> unit.speed().getAsLong()).reversed())
                        .limit(count).toList());
                }
                case 23 -> {
                    var priorities = new LinkedHashMap<Unit, Integer>();
                    for (var unit : targets) {
                        int index = plan.values().indexOf((unit.position() - 1) / 4 + 1);
                        if (index < 0) {
                            index = 100;
                        }
                        // 旧RandomUtil.randomInt(1,900)上界排除；每个目标各抽一次，平局保持原集合顺序。
                        int draw = randomIndex.applyAsInt(899);
                        if (draw < 0 || draw >= 899) {
                            throw new IllegalArgumentException("前后排随机优先级越界");
                        }
                        priorities.put(unit, index * 1000 + draw + 1);
                    }
                    replace(targets, targets.stream().sorted(Comparator.comparingInt(priorities::get)).limit(count).toList());
                }
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
