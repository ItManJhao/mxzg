/**
 * 旧218号血量条件处理：在动作层完成命中及目标资格检查后调用。
 * 失败时写入施法者本次出手中断集合；不执行后续动作、不修改生命或持久资产。
 */
package com.funsgamex.mxzg.hero;

import java.util.List;
import java.util.Objects;

public final class HeroBattleConditionUtils {
    /** 条件工具不持有战斗状态。 */
    private HeroBattleConditionUtils() {}

    /** 原Buff编号、万分比阈值、比较模式（0小于/其他大于等于）、取值来源（0目标/1施法者/其他己方）。 */
    public record HpCondition(int buffId, int threshold, int comparison, int subject) {
        /** Buff编号必须可追溯；参数保留旧整数语义，不擅自限制为布尔或枚举。 */
        public HpCondition {
            if (buffId <= 0) {
                throw new IllegalArgumentException("血量条件Buff编号无效");
            }
        }
    }

    /** 当前血量快照；单位编号用于核对来源，最大生命为0仍保留旧浮点比较语义。 */
    public record Health(int unitId, long hp, long maxHp) {
        /** 拒绝没有战场身份的快照，不把配置ID当作单位ID。 */
        public Health {
            if (unitId <= 0) {
                throw new IllegalArgumentException("血量条件单位编号无效");
            }
        }
    }

    /**
     * 执行已命中的218号条件；false会阻断该施法者对目标后续效果，true不会清除既有中断。
     * livingAllies由战场提供施法者阵营的存活名单，不取全队平均比例，不含死亡单位。
     * 未命中、非英雄、死亡执行限制应在动作层提前处理，不能用此入口冒充完整executeBuff。
     */
    public static boolean apply(HpCondition condition, HeroBattleEventProcessor.Actor source,
                                Health attacker, Health defender, List<Health> livingAllies) {
        Objects.requireNonNull(condition);
        Objects.requireNonNull(source);
        Objects.requireNonNull(attacker);
        Objects.requireNonNull(defender);
        Objects.requireNonNull(livingAllies);
        if (source.id() != attacker.unitId()) {
            throw new IllegalArgumentException("条件施法者与血量快照不一致");
        }
        double ratio;
        if (condition.subject() == 0) {
            ratio = defender.hp() * 1D / defender.maxHp();
        } else if (condition.subject() == 1) {
            ratio = attacker.hp() * 1D / attacker.maxHp();
        } else {
            long hp = livingAllies.stream().mapToLong(Health::hp).sum();
            long maxHp = livingAllies.stream().mapToLong(Health::maxHp).sum();
            ratio = hp * 1D / maxHp;
        }
        double threshold = condition.threshold() / 10000D;
        boolean passed = condition.comparison() == 0 ? ratio < threshold : ratio >= threshold;
        if (!passed) {
            source.interrupt(defender.unitId());
        }
        return passed;
    }
}
