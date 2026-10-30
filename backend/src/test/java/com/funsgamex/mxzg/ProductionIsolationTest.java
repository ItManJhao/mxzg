package com.funsgamex.mxzg;

import com.funsgamex.mxzg.auth.DevelopmentLoginController;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:production-isolation;MODE=MySQL;DATABASE_TO_LOWER=TRUE",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles({"local", "production"})
class ProductionIsolationTest {
    @Autowired ApplicationContext context;
    @Test void productionNeverRegistersDevelopmentIdentityProvider() {
        assertTrue(context.getBeansOfType(DevelopmentLoginController.class).isEmpty());
        assertTrue(context.getBeansOfType(DevelopmentLoginService.class).isEmpty());
    }
}
