/**
 * 旧 FightUtil 的命中、暴击和格挡数学规则，供后续普通伤害执行器使用。
 * 输入比例已按旧属性万分比转换；不抽随机、不读取或消耗临时属性、不修改Buff和血量。
 */
package com.funsgamex.mxzg.hero;

public final class HeroBattleHitUtils {
    /** 暴击分支的执行要求：是否实际暴击、是否移除首个抗暴Buff、是否读取并消耗暴伤属性。 */
    public record Critical(boolean critical, boolean removeCounterCrit, boolean readCriticalDamage) {}

    /** 无状态规则工具禁止实例化。 */
    private HeroBattleHitUtils() {}

    /** 命中概率：226号命中与227号闪避均为比例；不擅自截断到0至1。 */
    public static double hitChance(double hit, double dodge) {
        finite(hit, dodge);
        return finite(1D - (1D - hit) * dodge);
    }

    /** 暴击概率：207号暴击乘以一减208号抗暴；不是简单相减。 */
    public static double criticalChance(double critical, double resistance) {
        finite(critical, resistance);
        return finite(critical * (1D - resistance));
    }

    /**
     * 有双方元素配置时计算格挡概率；参数分别是211号精准、元素命中克制倍率及格挡比例。
     * 无元素配置时调用方必须直接跳过格挡抽样，不能传入猜测的中性倍率。
     */
    public static double blockChance(double precision, double elementHit, double block) {
        finite(precision, elementHit, block);
        return finite((1D - precision - (elementHit - 1D)) * block);
    }

    /** 暴伤倍率为1.5加222号比例（只设1.5上限）；负比例不自行归零。 */
    public static double criticalMultiplier(double damage) {
        return 1.5D + Math.min(finite(damage), 1.5D);
    }

    /**
     * 已命中后根据抽样结果决定暴击分支；固定攻击也先抽暴击，但不产生实际暴击。
     * 只有可暴击且存在抗暴Buff时移除首个实例并跳过暴伤读取；其他未暴击分支仍读取暴伤。
     */
    public static Critical critical(boolean fixedAttack, boolean rolledCritical, boolean sealed,
                                    boolean hasCounterCrit) {
        if (!fixedAttack && rolledCritical && !sealed) {
            return hasCounterCrit ? new Critical(false, true, false) : new Critical(true, false, true);
        }
        return new Critical(false, false, true);
    }

    /** 格挡减伤为30%，原始暴击抽样成功再加20%；使用抽样结果而非最终暴击标记。 */
    public static double blockReduction(boolean blocked, boolean rolledCritical) {
        return blocked ? 0.3D + (rolledCritical ? 0.2D : 0D) : 0D;
    }

    /** 拒绝非有限输入和中间结果，避免NaN或溢出伪装成有效概率；不添加概率上下限。 */
    private static double finite(double value, double... others) {
        if (!Double.isFinite(value)) {
            throw new IllegalArgumentException("战斗命中计算包含非有限数值");
        }
        for (double other : others) {
            if (!Double.isFinite(other)) {
                throw new IllegalArgumentException("战斗命中计算包含非有限数值");
            }
        }
        return value;
    }
}
