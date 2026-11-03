/** 独立内存库验证库存身份、逐件期限、自然日计算及回滚，不接触日常玩家库。 */
package com.funsgamex.mxzg;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.inventory.*;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:inventory_identity;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"})
@ActiveProfiles("local")
class InventoryIdentityTest {
    /** 创建隔离测试角色，不复用日常账号。 */
    @Autowired DevelopmentLoginService login;
    /** 普通库存事务入口。 */
    @Autowired InventoryService inventory;
    /** 逐件期限库存事务入口。 */
    @Autowired TimedInventoryService timed;
    /** 测试写入前获取角色锁。 */
    @Autowired RoleRepository roles;
    /** 构造提交和回滚边界。 */
    @Autowired PlatformTransactionManager manager;
    /** 验证真实统一初始化数据。 */
    @Autowired SessionSnapshotService snapshots;
    /** 同配置普通物品叠加并保留 ID；同配置期限物品各自保存、边界过期及回滚。 */
    @Test void stableIdentityAndIndependentExpiry() {
        var player=login.login("id_"+UUID.randomUUID().toString().substring(0,12));String role=player.role().id();
        var tx=new TransactionTemplate(manager);long now=Instant.parse("2030-01-02T10:00:00Z").getEpochSecond();
        tx.executeWithoutResult(status->{roles.lock(role);inventory.credit(role,900102,2);});
        String id=inventory.list(role).getFirst().instanceId();
        tx.executeWithoutResult(status->{roles.lock(role);inventory.credit(role,900102,3);});
        assertEquals(id,inventory.list(role).getFirst().instanceId());assertEquals(5,inventory.list(role).getFirst().quantity());
        tx.executeWithoutResult(status->{roles.lock(role);timed.grantOne(role,902025,now-86400);timed.grantOne(role,902025,now);});
        var all=tx.execute(status->{roles.lock(role);return timed.current(role,now);});
        assertEquals(2,all.items().size());assertNotEquals(all.items().get(0).instanceId(),all.items().get(1).instanceId());
        long end=TimedInventoryService.expiration(now,1);
        assertEquals(Instant.parse("2030-01-02T15:59:59Z").getEpochSecond(),end);
        tx.executeWithoutResult(status->{roles.lock(role);assertEquals(1,timed.current(role,TimedInventoryService.expiration(now-86400,7)).items().size());status.setRollbackOnly();});
        assertEquals(Integer.valueOf(2),tx.<Integer>execute(status->{roles.lock(role);return timed.current(role,now).items().size();}));
        assertEquals(Integer.valueOf(1),tx.<Integer>execute(status->{roles.lock(role);return timed.current(role,TimedInventoryService.expiration(now-86400,7)).items().size();}));
        assertThrows(IllegalStateException.class,()->timed.grantOne(role,902025,now-86400));
        var state=snapshots.snapshot("Bearer "+player.session().accessToken());assertEquals(id,state.inventory().getFirst().instanceId());
        var other=login.login("id_"+UUID.randomUUID().toString().substring(0,12));
        assertTrue(snapshots.snapshot("Bearer "+other.session().accessToken()).timedInventory().items().isEmpty());
    }
}
