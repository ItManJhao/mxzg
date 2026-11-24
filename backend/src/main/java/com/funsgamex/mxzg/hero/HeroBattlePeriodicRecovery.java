/**
 * 记录本场持续伤害与治疗联动的临时累计值。
 * 由战斗执行器在监听命中和回合开头调用，与本场行动一起回滚。
 */
package com.funsgamex.mxzg.hero;

import java.util.HashMap;
import java.util.Map;
import java.util.OptionalLong;

final class HeroBattlePeriodicRecovery {
    /** 键为治疗被动拥有者，值为自上次结算以来扣减前的伤害，伤害记负数。 */
    private final Map<Integer, Long> observedDamage = new HashMap<>();

    /** 给仍持有治疗被动的施放者累计一次持续伤害的原始值。 */
    void record(int ownerId, long rawDamage) {
        if (rawDamage < 0) {
            observedDamage.merge(ownerId, rawDamage, Math::addExact);
        }
    }

    /**
     * 消费本次累计值并返回单个队友的原治疗量。
     * @param basisPoints 将伤害转为治疗的万分比
     * @param livingAllies 本次仍然存活的同阵营人数，包含施加者
     * @return 有累计伤害时保留取整后的零治疗量；没有累计时返回空值
     */
    OptionalLong consume(int ownerId, int basisPoints, int livingAllies) {
        Long damage = observedDamage.remove(ownerId);
        if (damage == null) {
            return OptionalLong.empty();
        }
        long total = Math.abs((long) (damage * (basisPoints / 10000D)));
        return OptionalLong.of(total / livingAllies);
    }

    /** 在对应治疗被动的移除流程里丢弃该次累计。 */
    void clear(int ownerId) {
        observedDamage.remove(ownerId);
    }

    /** 保存行动执行前的伤害快照，以便该行动失败时一起回滚。 */
    Map<Integer, Long> checkpoint() {
        return Map.copyOf(observedDamage);
    }

    /** 恢复已保存的行动快照。 */
    void restore(Map<Integer, Long> checkpoint) {
        observedDamage.clear();
        observedDamage.putAll(checkpoint);
    }
}
