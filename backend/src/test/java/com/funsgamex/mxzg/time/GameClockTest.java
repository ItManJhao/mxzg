/**
 * 用可控真实时间验证开发时钟向前与向后校准、继续走时和恢复。
 * 测试不访问数据库，也不依赖机器时区和等待。
 */
package com.funsgamex.mxzg.time;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GameClockTest {
    /** 调时后推进秒和毫秒，恢复读取真实时间，非法时间不改变原偏移。 */
    @Test
    void offsetAdvancesAndResetUsesActualTime() {
        var real = new AtomicReference<>(Instant.parse("2026-11-19T12:00:00.125Z"));
        var clock = new GameClock(real::get);
        var idleClock = clock.withZone(ZoneOffset.UTC);
        var future = Instant.parse("2026-11-21T12:00:00Z");
        assertEquals(real.get().toEpochMilli(), clock.read().serverTimeMs());
        assertFalse(clock.read().overridden());

        var changed = clock.setEpochSeconds(future.getEpochSecond());
        assertTrue(changed.overridden());
        assertEquals(future.toEpochMilli(), changed.serverTimeMs());
        real.updateAndGet(value -> value.plusMillis(2_345));
        assertEquals(future.plusMillis(2_345), idleClock.instant());
        assertEquals(future.getEpochSecond() + 2, clock.epochSeconds());
        assertThrows(IllegalArgumentException.class, () -> clock.setEpochSeconds(0));
        assertThrows(IllegalArgumentException.class, () -> clock.setEpochSeconds(Long.MAX_VALUE));
        assertEquals(future.toEpochMilli() + 2_345, clock.millis());

        var past = Instant.parse("2026-11-01T00:00:00Z");
        assertEquals(past.toEpochMilli(), clock.setEpochSeconds(past.getEpochSecond()).serverTimeMs());
        assertEquals(past, clock.instant());
        var restored = clock.reset();
        assertFalse(restored.overridden());
        assertEquals(real.get().toEpochMilli(), restored.serverTimeMs());
        assertEquals(real.get(), idleClock.instant());
    }
}
