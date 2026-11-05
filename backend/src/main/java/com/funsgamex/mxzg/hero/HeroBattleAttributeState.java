/**
 * 单个战斗单位的属性读取状态，复刻旧AttributeInfo的一次性覆盖、比例折算和效果修正。
 * 从只读输入创建独立实例；不管理血量生命周期、持久面板或Buff安装，调用方负责事务回滚。
 */
package com.funsgamex.mxzg.hero;

import java.util.HashMap;
import java.util.Map;

public final class HeroBattleAttributeState {
    /** 本次战斗的原始属性副本，读取过程不反写输入。 */
    private final Map<Integer, Long> base;
    /** 属性编号到下一次读取的覆盖值；读取即删除，零值也是有效覆盖。 */
    private final Map<Integer, Long> once = new HashMap<>();

    /** 建立独立战斗读取状态；不把入场已折算的攻防速再次作为原始值。 */
    public HeroBattleAttributeState(Map<Integer, Long> attributes) {
        base = new HashMap<>(attributes);
    }

    /** 固定属性Buff按原整数增减；不消费一次性覆盖。 */
    public void addBase(int type, long amount) {
        base.put(type, Math.addExact(base.getOrDefault(type, 0L), amount));
    }

    /** 保存可变基础属性供根动作回滚。 */
    public Map<Integer, Long> baseSnapshot() { return Map.copyOf(base); }

    /** 恢复Buff增减前的基础属性。 */
    public void restoreBase(Map<Integer, Long> values) {
        base.clear();
        base.putAll(values);
    }

    /** 读取当前值：一次性覆盖优先并直接返回，否则依次执行比例及效果修正。 */
    public long get(int type) {
        Long value = once.remove(type);
        if (value != null) {
            return value;
        }
        long result = base.getOrDefault(type, 0L);
        int percent = switch (type) {
            case 101 -> 204;
            case 220 -> 201;
            case 224 -> 202;
            default -> 0;
        };
        result = truncate(result * (1D + (percent == 0 ? 0D : rate(percent))));
        if (type == 205 || type == 219) {
            result = truncate(result + result * rate(10));
        }
        return result;
    }

    /** 沿旧getRate先读取并消费属性，再施加50000上限并除10000；不设零下限。 */
    public double rate(int type) {
        return Math.min(get(type), 50000L) / 10000D;
    }

    /** 设置下一次读取的覆盖值，替换已有一次性值，不影响基础属性。 */
    public void setOnce(int type, long value) {
        once.put(type, value);
    }

    /** 沿旧addOnce先消费当前折算值再相加；失败恢复所有被递归读取的一次性属性。 */
    public void addOnce(int type, long value) {
        var before = snapshot();
        try {
            once.put(type, Math.addExact(get(type), value));
        } catch (RuntimeException error) {
            restore(before);
            throw error;
        }
    }

    /** 保存当前一次性覆盖，供战斗动作事务回滚；快照不可修改。 */
    public Map<Integer, Long> snapshot() {
        return Map.copyOf(once);
    }

    /** 恢复同一战斗单位的动作前快照，不复用其他单位或持久资产的状态。 */
    public void restore(Map<Integer, Long> snapshot) {
        var copy = Map.copyOf(snapshot);
        once.clear();
        once.putAll(copy);
    }

    /** 保留旧double向零截断；超界或非有限数值明确失败，不能返回饱和值。 */
    private static long truncate(double value) {
        if (!Double.isFinite(value) || value >= 0x1p63 || value < -0x1p63) {
            throw new IllegalArgumentException("战斗属性读取超出long范围");
        }
        return (long) value;
    }
}
