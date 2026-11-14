/** 长连接与GM启用边界：核对真实local配置默认值及关闭覆盖，生产即使误开开关也不装配本机能力。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.gm.GmService;
import com.funsgamex.mxzg.network.GameSocketConfiguration;
import com.funsgamex.mxzg.network.GameSocketHandler;
import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;

class GameSocketActivationTest {
    /** 读取真实local资源，用无系统环境变量的上下文验证重启后的默认GM配置，不连接数据库。 */
    @Test void localGmEnabledByDefault() throws IOException {
        var environment = localEnvironment();
        assertEquals(Boolean.TRUE, environment.getProperty("mxzg.gm.enabled", Boolean.class));
    }

    /** 保留显式关闭入口，不能因本机默认开启而忽略运维给出的false。 */
    @Test void localGmCanBeExplicitlyDisabled() throws IOException {
        var environment = localEnvironment();
        environment.setProperty("MXZG_GM_ENABLED", "false");
        assertEquals(Boolean.FALSE, environment.getProperty("mxzg.gm.enabled", Boolean.class));
    }

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

    /** production与local同时激活且误设开启时，仍不装配本机处理器或GM，不能只依赖隐藏前端入口。 */
    @Test void productionCannotEnableLocalPilot() {
        new WebApplicationContextRunner().withInitializer(context -> context.getEnvironment().setActiveProfiles("local", "production"))
            .withPropertyValues("mxzg.websocket.enabled=true", "mxzg.gm.enabled=true")
            .withUserConfiguration(GameSocketConfiguration.class, GameSocketHandler.class, GmService.class)
            .run(context -> {
                assertNull(context.getStartupFailure());
                assertTrue(context.getBeansOfType(GameSocketHandler.class).isEmpty());
                assertTrue(context.getBeansOfType(GameSocketConfiguration.class).isEmpty());
                assertTrue(context.getBeansOfType(GmService.class).isEmpty());
            });
    }

    /** 加载实际local YAML并隔离机器环境；测试只解析配置，不启动服务或写任何角色资产。 */
    private static MockEnvironment localEnvironment() throws IOException {
        var environment = new MockEnvironment();
        var local = new YamlPropertySourceLoader().load("application-local", new ClassPathResource("application-local.yml"));
        for (var source : local) {
            environment.getPropertySources().addLast(source);
        }
        return environment;
    }
}
