/**
 * 神职输入迁移回归：在独立H2库验证V18到V19为新版角色补已核实零级，不改已有资产。
 * 手工执行真实Flyway迁移，不启动游戏服务；库存神职经验物品只核对保留，不转换为等级。
 * 本测试只证明数据库初值及约束，不开放神职经验、解锁请求或挂机领取。
 */
package com.funsgamex.mxzg;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import static org.junit.jupiter.api.Assertions.*;

class ClergyStateMigrationTest {
    /** 每个用例独享的内存数据库地址，不读取日常玩家配置。 */
    private String databaseUrl;

    /** 只操作本用例H2数据库的夹具入口，不经过正式发奖或GM。 */
    private JdbcTemplate jdbc;

    /** 从V18创建现有新版库，保留待测V19迁移尚未执行的真实前置结构。 */
    @BeforeEach
    void createPreviousSchema() {
        databaseUrl = "jdbc:h2:mem:clergy_migration_" + UUID.randomUUID()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("18").load().migrate();
        jdbc = new JdbcTemplate(new DriverManagerDataSource(databaseUrl, "sa", ""));
    }

    /** 关闭用例独享内存库，避免重复运行保留数据库实例。 */
    @AfterEach
    void closeDatabase() {
        jdbc.execute("SHUTDOWN");
    }

    /** 只执行到神职输入的V19；以后新增迁移不扩大本回归的历史边界。 */
    private void migrateClergyInput() {
        Flyway.configure().dataSource(databaseUrl, "sa", "").target("19").load().migrate();
    }

    /** 按迁移前后共用的最小写入结构创建角色，不在夹具里指定神职等级。 */
    private String role() {
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,"
                        + "login_account,server_id,state_revision,role_experience,goddess_vip) "
                        + "VALUES (?,?,?,7,123,45,?,'local-1',9,33,2)",
                id, "migration_" + id, "Existing", "migration_" + id);
        return id;
    }

    /** 现有角色只新增零级；其他角色字段、资产版本、挂机起点及900007库存逐项保持。 */
    @Test
    void existingRolesAndClergyExperienceInventoryRemainUnchanged() {
        String roleId = role();
        jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,900007,37,?)",
                roleId, "existing-clergy-exp:" + roleId);
        jdbc.update("INSERT INTO game_main_chapter_idle(role_id,started_at) VALUES (?,123456)", roleId);
        var roleBefore = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        var inventoryBefore = jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", roleId);
        var idleBefore = jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", roleId);

        migrateClergyInput();

        var roleAfter = jdbc.queryForMap("SELECT * FROM game_role WHERE id=?", roleId);
        assertEquals(0, roleAfter.remove("clergy_level"));
        assertEquals(roleBefore, roleAfter, "新增神职输入不得改已有字段、资产或持久版本");
        assertEquals(inventoryBefore, jdbc.queryForList("SELECT * FROM game_inventory WHERE role_id=?", roleId));
        assertEquals(idleBefore, jdbc.queryForMap("SELECT * FROM game_main_chapter_idle WHERE role_id=?", roleId));
    }

    /** 新建角色省略神职字段时取得已核实的数据库零级初值，不依赖页面或首次读取补值。 */
    @Test
    void newRolesReceiveExplicitDatabaseZeroDefault() {
        migrateClergyInput();
        String roleId = role();
        assertEquals(0, jdbc.queryForObject("SELECT clergy_level FROM game_role WHERE id=?", Integer.class, roleId));
    }

    /** 神职输入必须持久存在且非负，非法写入失败后保持原零级，不将null解释成无权益。 */
    @Test
    void nullAndNegativeLevelsAreRejected() {
        migrateClergyInput();
        String roleId = role();
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE game_role SET clergy_level=NULL WHERE id=?", roleId));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE game_role SET clergy_level=-1 WHERE id=?", roleId));
        assertEquals(0, jdbc.queryForObject("SELECT clergy_level FROM game_role WHERE id=?", Integer.class, roleId));
    }
}
