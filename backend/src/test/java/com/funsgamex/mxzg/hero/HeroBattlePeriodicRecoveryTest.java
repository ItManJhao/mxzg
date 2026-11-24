/** 验证圣光精灵的持续伤害统计按拥有者隔离，分摊遵循旧取整并可回滚。 */
package com.funsgamex.mxzg.hero;

import java.util.OptionalLong;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HeroBattlePeriodicRecoveryTest {
    /** 验证同一来源多次伤害累积，旧规则按存活人数取整并清空本轮累计。 */
    @Test
    void distributesSignedDamageByLivingFactionSize() {
        var recovery = new HeroBattlePeriodicRecovery();
        recovery.record(1, -1001);
        recovery.record(1, -1000);
        recovery.record(2, -1000);
        recovery.record(1, 12);
        assertEquals(OptionalLong.of(60), recovery.consume(1, 1800, 6));
        assertEquals(OptionalLong.empty(), recovery.consume(1, 1800, 6));
        assertEquals(OptionalLong.of(30), recovery.consume(2, 1800, 6));
        recovery.record(2, -1);
        assertEquals(OptionalLong.of(0), recovery.consume(2, 1800, 1));
    }

    /** 战斗步骤失败后能恢复原累计，正式移除状态会丢弃原值。 */
    @Test
    void checkpointRestoresAccumulators() {
        var recovery = new HeroBattlePeriodicRecovery();
        recovery.record(1, -1000);
        var checkpoint = recovery.checkpoint();
        recovery.record(1, -2000);
        assertEquals(OptionalLong.of(540), recovery.consume(1, 1800, 1));
        recovery.restore(checkpoint);
        recovery.clear(1);
        assertEquals(OptionalLong.empty(), recovery.consume(1, 1800, 1));
        recovery.restore(checkpoint);
        assertEquals(OptionalLong.of(180), recovery.consume(1, 1800, 1));
    }
}
