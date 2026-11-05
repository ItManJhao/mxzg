/**
 * 单位本场Buff实例集合：沿旧BuffsInfo管理冲突、叠层、到期和可驱散筛选。
 * 不执行效果或移除回调；调用方必须同步移除监听/状态。快照不可变，支持动作失败回滚。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;

public final class HeroBattleBuffState {
    /** 按安装顺序保留实例，不按配置ID覆盖。 */
    private final List<Entry> entries = new ArrayList<>();

    /** 原Buff元数据；attribute区分按配置ID叠层还是按类型叠层，effect为旧0/1/2/3编号。 */
    public record Spec(int id, int type, int duration, boolean dispelled, int effect,
                       int conflict, int stacking, boolean attribute) {
        /** 无效期限/层数拒绝，避免伪造可用实例。 */
        public Spec {
            if (id <= 0 || type <= 0 || duration < 0 || stacking < 1 || effect < 0 || effect > 3) {
                throw new IllegalArgumentException("Buff实例配置无效");
            }
        }
    }

    /** 本场编号、原施加者、绝对到期回合与效果值；重置护盾数值不改变其他字段。 */
    public record Entry(long instanceId, int sourceId, int expiresAt, Spec spec, long value) {}
    /** 安装结果与需要触发移除回调的旧实例；列表去重避免冲突/层数命中同一实例两次。 */
    public record Change(Entry current, List<Entry> removed) {}

    /** 安装新实例；1008护盾优先复用首个现有护盾，只替换数值，不刷新来源、配置或期限。 */
    public Change add(long instanceId, int sourceId, int round, Spec spec, long value) {
        if (instanceId <= 0 || sourceId <= 0 || round < 0) {
            throw new IllegalArgumentException("Buff安装身份或回合无效");
        }
        if (spec.type() == 1008) {
            for (int i = 0; i < entries.size(); i++) {
                var old = entries.get(i);
                if (old.spec().type() == 1008) {
                    var updated = new Entry(old.instanceId(), old.sourceId(), old.expiresAt(), old.spec(), value);
                    entries.set(i, updated);
                    return new Change(updated, List.of());
                }
            }
        }
        if (entries.stream().anyMatch(entry -> entry.instanceId() == instanceId)) {
            throw new IllegalArgumentException("Buff实例编号重复");
        }
        var removed = new LinkedHashSet<Entry>();
        if (spec.conflict() != 0) {
            entries.stream().filter(entry -> entry.spec().conflict() == spec.conflict()).forEach(removed::add);
        }
        var layers = entries.stream().filter(entry -> entry.sourceId() == sourceId
            && (spec.attribute() ? entry.spec().id() == spec.id() : entry.spec().type() == spec.type())).toList();
        if (layers.size() >= spec.stacking()) {
            removed.add(layers.stream().min(Comparator.comparingInt(Entry::expiresAt)).orElseThrow());
        }
        var current = new Entry(instanceId, sourceId, Math.addExact(round, spec.duration()), spec, value);
        entries.removeAll(removed);
        entries.add(current);
        return new Change(current, List.copyOf(removed));
    }

    /** 在旧到期检查时点移除expiry<=当前回合的实例，不执行回合伤害或死亡处理。 */
    public List<Entry> expire(int round) {
        return remove(entries.stream().filter(entry -> entry.expiresAt() <= round).toList());
    }

    /** 沿旧getBuffersBy过滤：绝对到期回合小于999、允许驱散、效果类别相等。 */
    public List<Entry> dispel(int effect) {
        return remove(dispellable(effect));
    }

    /** 返回可驱散项而不提前删除，清心据此选择英雄，再统一调用移除入口。 */
    public List<Entry> dispellable(int effect) {
        return entries.stream().filter(entry -> entry.expiresAt() < 999
            && entry.spec().dispelled() && entry.spec().effect() == effect).toList();
    }

    /** 删除给定快照并返回实际移除项，供调用方执行清理。 */
    private List<Entry> remove(List<Entry> selected) {
        entries.removeAll(selected);
        return List.copyOf(selected);
    }

    /** 返回安装顺序快照，不允许外部改写实例集合。 */
    public List<Entry> snapshot() {
        return List.copyOf(entries);
    }

    /** 根动作失败时恢复此前实例及数值。 */
    public void restore(List<Entry> saved) {
        entries.clear();
        entries.addAll(saved);
    }
}
