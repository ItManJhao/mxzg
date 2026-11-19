/**
 * 新主线挂机领取的服务器时间及随机源装配，领域测试可显式替换为固定时钟和可计数随机源。
 * 时间只在一次新领取内读取一次；随机源使用线程安全SecureRandom，角色间并发不共享不安全的生成器状态。
 * 此处不开放领取，入口开关仍由服务端配置单独控制。
 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.time.GameClock;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.random.RandomGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MainChapterIdleClaimConfiguration {
    /** 将公共游戏时钟作为挂机领取的 UTC 时钟；自然日仍由既有上海时区规则计算。 */
    @Bean("mainChapterIdleClaimClock")
    public Clock clock(GameClock clock) {
        return clock.withZone(ZoneOffset.UTC);
    }

    /** 提供线程安全的服务端抽样源，不接受客户端种子，重放分支不消费。 */
    @Bean("mainChapterIdleClaimRandom")
    public RandomGenerator random() {
        return new SecureRandom();
    }
}
