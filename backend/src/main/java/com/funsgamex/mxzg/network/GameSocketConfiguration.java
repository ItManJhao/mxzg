/** 登录和背包的本机长连接入口；local 默认启用，生产部署仍须配置来源与会话协调。 */
package com.funsgamex.mxzg.network;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.web.socket.config.annotation.*;
import com.funsgamex.mxzg.server.LanServerDirectory;

@Configuration
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type = org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
@Profile("local & !production")
@ConditionalOnProperty(name = "mxzg.websocket.enabled", havingValue = "true")
@EnableWebSocket
public class GameSocketConfiguration implements WebSocketConfigurer {
    /** 当前实例的游戏二进制协议入口，由 Spring 注入。 */
    private final GameSocketHandler handler;
    /** 内网运行配置限定可跨来源访问该实例的预览页和共享 H5 页面。 */
    private final LanServerDirectory lan;

    /** 注入真实的游戏处理器与允许来源；生产配置不装配此本地入口。 */
    public GameSocketConfiguration(GameSocketHandler handler, LanServerDirectory lan) {
        this.handler = handler;
        this.lan = lan;
    }

    /** 开启已有本地预览来源和显式登记的共享 H5 来源，保留 Spring 的同源握手。 */
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/api/v1/game/socket")
                .setAllowedOrigins(lan.allowedOrigins());
    }
}
