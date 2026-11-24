/**
 * 针对 V57 已有数据验证五星历史迁移。
 * 冻结原回执，覆盖曾获后消耗、同实例重复证据、精确星级和 GM 批量发放。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HeroFiveStarMigrationTest {
    /** V57 只靠已有成功回执迁移，不能由现有五星英雄或重复证据增加进度。 */
    @Test
    void restoresOnlyFiveStarEvidenceFromLegacyReceipts() {
        String database = "jdbc:h2:mem:hero_five_star_" + id()
                + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(database, "sa", "").target("57").load().migrate();
        var jdbc = new JdbcTemplate(new DriverManagerDataSource(database, "sa", ""));
        try {
            String role = role(jdbc);
            String other = role(jdbc);
            var five = new HeroGrantService.Granted(id(), 10205020, 1, 5, 0);
            var four = new HeroGrantService.Granted(id(), 10104004, 1, 4, 0);
            var six = new HeroGrantService.Granted(id(), 10205020, 1, 6, 0);
            var payloads = new RewardReceiptPayloads(new ObjectMapper());
            var frozen = payloads.freeze(Map.of("roleId", role, "actual",
                    Map.of("roleId", role, "heroes", List.of(five, four, six))));

            jdbc.update("""
                    INSERT INTO game_hero_normal_summon(role_id,request_id,first_draw,receipt_id,asset_revision,
                        normal_free_at_seconds,payload_json,payload_hash)
                    VALUES (?,?,TRUE,?,1,1,?,?)
                    """, role, id(), id(), frozen.json(), frozen.hash());
            jdbc.update("""
                    INSERT INTO game_hero_fragment_combination(role_id,request_id,receipt_id,payload_json,payload_hash)
                    VALUES (?,?,?,?,?)
                    """, role, id(), id(), frozen.json(), frozen.hash());
            String gm = id();
            jdbc.update("INSERT INTO game_gm_grant(role_id,request_id,kind,config_id,quantity) VALUES (?,?,'hero',10204013,2)",
                    role, gm);
            jdbc.update("INSERT INTO game_gm_grant(role_id,request_id,kind,config_id,quantity) VALUES (?,?,'hero',10104004,3)",
                    role, id());
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10205020,1,5)",
                    id(), role);
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10205020,1,5)",
                    id(), other);

            Flyway.configure().dataSource(database, "sa", "").load().migrate();
            assertEquals(List.of(five.instanceId(), "gm:" + gm).stream().sorted().toList(),
                    jdbc.queryForList("SELECT acquisition_key FROM game_hero_five_star_grant WHERE role_id=? ORDER BY acquisition_key",
                            String.class, role));
            assertEquals(3L, jdbc.queryForObject("SELECT SUM(quantity) FROM game_hero_five_star_grant WHERE role_id=?",
                    Long.class, role));
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM game_hero_five_star_grant WHERE role_id=?",
                    Integer.class, other));
        } finally {
            jdbc.execute("SHUTDOWN");
        }
    }

    /** 创建没有发放历史的旧版角色，供回执外键和角色隔离使用。 */
    private static String role(JdbcTemplate jdbc) {
        String role = id();
        jdbc.update("""
                INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id)
                VALUES (?,?,?,1,0,0,?,'local-1')
                """, role, role, role, role);
        return role;
    }

    /** 为每段独立历史证据生成数据库原回执使用的规范编号。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
