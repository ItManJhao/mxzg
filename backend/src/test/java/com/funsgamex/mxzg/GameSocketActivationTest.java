/** 长连接启用边界：显式关闭有效，生产配置即使误开开关也不能注册本机处理器。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.network.GameSocketConfiguration;
import com.funsgamex.mxzg.network.GameSocketHandler;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import static org.junit.jupiter.api.Assertions.*;

class GameSocketActivationTest {
    /** 显式关闭时不创建配置和处理器，也不要求额外业务依赖。 */
    @Test void explicitlyDisabled() {
        new WebApplicationContextRunner().withInitializer(context -> context.getEnvironment().setActiveProfiles("local"))
            .withPropertyValues("mxzg.websocket.enabled=false")
            .withUserConfiguration(GameSocketConfiguration.class, GameSocketHandler.class)
            .run(context -> {
                assertNull(context.getStartupFailure());
                assertTrue(context.getBeansOfType(GameSocketHandler.class).isEmpty());
                assertTrue(context.getBeansOfType(GameSocketConfiguration.class).isEmpty());
            });
    }

    /** production 与 local 同时激活时仍拒绝试点，避免开发端点被配置误带上线。 */
    @Test void productionCannotEnableLocalPilot() {
        new WebApplicationContextRunner().withInitializer(context -> context.getEnvironment().setActiveProfiles("local", "production"))
            .withPropertyValues("mxzg.websocket.enabled=true")
            .withUserConfiguration(GameSocketConfiguration.class, GameSocketHandler.class)
            .run(context -> {
                assertNull(context.getStartupFailure());
                assertTrue(context.getBeansOfType(GameSocketHandler.class).isEmpty());
                assertTrue(context.getBeansOfType(GameSocketConfiguration.class).isEmpty());
            });
    }
}
