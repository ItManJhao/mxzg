/** 角色基础资料回归：仅使用隔离内存库验证旧初始化规则、持久快照与事务回滚。 */
package com.funsgamex.mxzg;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.role.*;
import com.funsgamex.mxzg.network.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties="spring.datasource.url=jdbc:h2:mem:role_basics;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@ActiveProfiles("local")
class RoleBasicsTest {
    /** 创建独立账号，验证统一登录初始化。 */
    @Autowired DevelopmentLoginService login;
    /** 读取持久资料并锁定角色。 */
    @Autowired RoleRepository roles;
    /** 原配置规则，不复用英雄经验。 */
    @Autowired RoleRules rules;
    /** 真实统一状态快照入口。 */
    @Autowired SessionSnapshotService snapshots;
    /** 测试事务内设置资料，不开放业务修改接口。 */
    @Autowired JdbcTemplate jdbc;
    /** 资产版本随提交递增。 */
    @Autowired AssetSyncService sync;
    /** 构造提交及回滚边界。 */
    @Autowired PlatformTransactionManager manager;
    /** 新角色采用原表初始值，首个统一快照补齐空公会和主阵战力，重连保留全部角色字段。 */
    @Test
    void initializeAndRestore() {
        String account = "role_" + UUID.randomUUID().toString().substring(0, 12);
        var player = login.login(account);
        var role = player.role();
        var basics = role.basics();
        assertEquals(1, role.level());
        assertEquals(0, basics.experience());
        assertEquals(1000, basics.cup());
        assertEquals(410304012, basics.imageId());
        assertEquals(0, basics.headId());
        assertEquals(0, basics.borderId());
        assertEquals(120, basics.experienceToNextLevel());
        assertEquals(360, rules.threshold(2));
        assertEquals(0, rules.threshold(300));
        assertTrue(basics.createdAtSeconds() > 0);
        assertTrue(basics.lastLoginAtSeconds() >= basics.createdAtSeconds());
        assertNull(role.guildName());
        assertNull(role.power());
        String token = "Bearer " + player.session().accessToken();
        var restored = snapshots.snapshot(token);
        assertEquals("", restored.role().guildName());
        assertEquals(0, restored.role().power());
        assertEquals(basics, restored.role().basics());
        var persisted = roles.findById(role.id()).orElseThrow();
        assertEquals(restored.role(), persisted.withGuildName(""));
        assertEquals(restored.role(), snapshots.snapshot(token).role());
        assertEquals(role.id(), login.login(account).role().id());
        assertThrows(IllegalArgumentException.class, () -> rules.threshold(301));
    }

    /** 角色资料与版本同时提交，回滚后分别核对持久记录、完整快照以及其他角色的隔离。 */
    @Test
    void atomicPersistenceAndIsolation() {
        var player = login.login("role_" + UUID.randomUUID().toString().substring(0, 12));
        String id = player.role().id();
        var other = login.login("role_" + UUID.randomUUID().toString().substring(0, 12));
        var tx = new TransactionTemplate(manager);
        // 首次完整初始化包含独立冒险点懒建；后续资料事务以已同步版本为基线。
        String token = "Bearer " + player.session().accessToken();
        long before = snapshots.snapshot(token).revision();
        tx.executeWithoutResult(status -> {
            roles.lock(id);
            jdbc.update("UPDATE game_role SET role_experience=66,cup=1400 WHERE id=?", id);
            sync.changed(id);
        });
        var state = snapshots.snapshot(token);
        assertEquals(66, state.role().basics().experience());
        assertEquals(1400, state.role().basics().cup());
        assertEquals(before + 1, state.revision());
        var committedRole = roles.findById(id).orElseThrow();
        assertEquals(state.role(), committedRole.withGuildName(""));
        tx.executeWithoutResult(status -> {
            roles.lock(id);
            jdbc.update("UPDATE game_role SET role_experience=99 WHERE id=?", id);
            roles.recordLogin(id, state.role().basics().lastLoginAtSeconds() + 100);
            status.setRollbackOnly();
        });
        assertEquals(committedRole, roles.findById(id).orElseThrow());
        assertEquals(state.role(), snapshots.snapshot(token).role());
        assertEquals(before + 1, roles.revision(id));
        assertEquals(other.role(), roles.findById(other.role().id()).orElseThrow());
        assertThrows(IllegalStateException.class, () -> roles.recordLogin(id, 100));
    }
}
