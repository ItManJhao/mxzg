/**
 * 服务端应用入口：启动领域服务、持久化和统一定时任务。
 * 世界等级刷新属于独立区服服务生命周期，不依赖本机WebSocket配置是否启用。
 */
package com.funsgamex.mxzg;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GameApplication {
    /** 启动当前部署配置，不在入口创建玩家状态或发奖。 */
    public static void main(String[] args) {
        SpringApplication.run(GameApplication.class, args);
    }
}
