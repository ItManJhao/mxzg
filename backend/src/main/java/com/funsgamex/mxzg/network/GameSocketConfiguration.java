/** 登录和背包的本机长连接入口；local 默认启用，生产部署仍须配置来源与会话协调。 */
package com.funsgamex.mxzg.network;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type = org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
@Profile("local & !production")
@ConditionalOnProperty(name = "mxzg.websocket.enabled", havingValue = "true")
@EnableWebSocket
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
