/** 本机长连接试点开关；默认关闭，仅 local 非生产配置可显式启用，不改变现有客户端。 */
package com.funsgamex.mxzg.network;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@Profile("local & !production")
@ConditionalOnProperty(name = "mxzg.websocket.enabled", havingValue = "true")
@EnableWebSocket
@EnableScheduling
public class GameSocketConfiguration implements WebSocketConfigurer {
    private final GameSocketHandler handler;

    /** 注入试点处理器，由配置开关统一控制生命周期。 */
    public GameSocketConfiguration(GameSocketHandler handler) { this.handler = handler; }

    /** 只开放明确的本机预览来源；正式域名和多实例部署不在本批启用。 */
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/api/v1/game/socket")
            .setAllowedOrigins("http://localhost:7456", "http://127.0.0.1:7456",
                "http://localhost:18081", "http://127.0.0.1:18081");
    }
}
