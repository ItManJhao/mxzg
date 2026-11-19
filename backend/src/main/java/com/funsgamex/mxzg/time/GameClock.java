/**
 * 游戏服统一时钟，为玩法计算、资产快照和鉴权回包提供同一个游戏时间。
 * 开发 GM 可临时调整本进程的偏移；会话有效期及网络超时继续使用各自的真实时钟。
 */
package com.funsgamex.mxzg.time;

import java.time.Duration;
import java.time.Instant;
import java.time.InstantSource;
import org.springframework.stereotype.Component;

@Component
public class GameClock implements InstantSource {
    /** 限制目标日期为公元 9999 年以内，便于各端以普通日历日期显示。 */
    private static final long MAX_EPOCH_SECONDS = 253_402_300_799L;

    /** 以真实时间作为偏移基准；测试中可注入可控的时间源。 */
    private final InstantSource source;

    /** 游戏时间相对真实时间的偏移，null 表示正常时间；内存中保留到恢复或进程重启。 */
    private volatile Duration offset;

    /** GM 回包使用的毫秒时间及当前读取是否应用了开发偏移。 */
    public record Reading(long serverTimeMs, boolean overridden) {}

    /** 游戏服默认读取本进程真实时间，初始状态没有 GM 偏移。 */
    public GameClock() {
        this(InstantSource.system());
    }

    /** 允许专项时钟测试控制真实时间经过的长度。 */
    GameClock(InstantSource source) {
        this.source = source;
    }

    /** 返回当前游戏时间点，设置偏移后仍随真实时间推进。 */
    @Override
    public Instant instant() {
        return current(offset);
    }

    /** 返回玩法规则和期限库存使用的 Unix 秒。 */
    public long epochSeconds() {
        return instant().getEpochSecond();
    }

    /** 返回登录和心跳协议用于校准客户端的 Unix 毫秒。 */
    @Override
    public long millis() {
        return instant().toEpochMilli();
    }

    /** 同时读取时间与偏移状态，避免并发调整导致两个字段不对应。 */
    public Reading read() {
        var active = offset;
        return new Reading(current(active).toEpochMilli(), active != null);
    }

    /** 将当前游戏时间校准到指定 Unix 秒，返回写入结果并继续走时。 */
    public Reading setEpochSeconds(long epochSeconds) {
        if (epochSeconds <= 0 || epochSeconds > MAX_EPOCH_SECONDS) {
            throw new IllegalArgumentException("游戏时间超出支持范围");
        }
        var target = Instant.ofEpochSecond(epochSeconds);
        offset = Duration.between(source.instant(), target);
        return new Reading(target.toEpochMilli(), true);
    }

    /** 清除开发偏移并返回恢复后的真实时间。 */
    public Reading reset() {
        offset = null;
        return new Reading(source.millis(), false);
    }

    /** 根据调用方读取到的偏移状态计算游戏时间。 */
    private Instant current(Duration active) {
        var now = source.instant();
        return active == null ? now : now.plus(active);
    }
}
