/** 阵型战斗输入回归：真实保存与只读组装使用独立内存库，验证旧属性编号和面板隔离。 */
package com.funsgamex.mxzg;

import java.util.*;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.lineup.*;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:battle_formation;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class HeroBattleFormationTest {
    /** 隔离账号创建入口。 */
    @Autowired DevelopmentLoginService login;
    /** 已上线协议背后的真实阵容保存服务。 */
    @Autowired MainFormationCommandService commands;
    /** 本批只读战斗输入。 */
    @Autowired HeroBattleInputService inputs;
    /** 面板及资产版本的权威快照，用于检查只读边界。 */
    @Autowired SessionSnapshotService snapshots;
    /** 仅用于准备和破坏独立测试数据。 */
    @Autowired JdbcTemplate jdbc;

    /** 每个用例使用独立角色和真实英雄模板。 */
    private record Player(String role, String token, String hero) {}

    /** 创建满足阵型2解锁条件的测试英雄，不开启升级协议。 */
    private Player player() {
        var result = login.login("test_" + UUID.randomUUID().toString().substring(0, 12));
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10105008,1,10,0)",
            hero, result.role().id());
        return new Player(result.role().id(), "Bearer " + result.session().accessToken(), hero);
    }

    /** 通过真实保存规则提交，版本取自统一快照，不直接篡改正常路径数据。 */
    private void save(Player p, int formation, int position) {
        long version = snapshots.snapshot(p.token()).mainFormation().version();
        commands.save(p.token(), new MainFormationCommandService.Save(UUID.randomUUID().toString(), version,
            formation, List.of(new Lineup.Slot(position, p.hero()))));
    }

    /** 同一英雄同一位置换阵型：旧配置减伤从300变800，不保留上次加成或写回面板。 */
    @Test void selectedFormationChangesOnlyBattleAttributes() {
        var p = player();
        save(p, 1, 2);
        var first = inputs.current(p.token());
        var before = snapshots.snapshot(p.token());
        assertEquals(1, first.formationId());
        assertEquals(840L, first.units().getFirst().attributes().get(150), "10星使用真实战斗防御系数");
        assertEquals(first, inputs.current(p.token()), "重复读取不能累加属性");
        assertEquals(before, snapshots.snapshot(p.token()), "战斗读取不能写资产或版本");
        save(p, 2, 2);
        var second = inputs.current(p.token());
        assertEquals(2, second.formationId());
        assertEquals(first.lineupVersion() + 1, second.lineupVersion());
        assertEquals(first.units().getFirst().attributes().getOrDefault(291, 0L) + 500,
            second.units().getFirst().attributes().get(291));
        assertEquals(first.units().getFirst().hero().panelStats(), second.units().getFirst().hero().panelStats());
        assertEquals(first.units().getFirst().skills(), second.units().getFirst().skills());
        assertFalse(second.pending().contains("formation_unlock_and_template_limits"));
        assertTrue(second.pending().contains("battle_special_attributes_and_triggers"));
        assertThrows(UnsupportedOperationException.class, () -> second.units().getFirst().attributes().clear());
    }

    /** 同阵型换位置保留生命/治疗/攻击万分比编号；离开位置后移除旧加成。 */
    @Test void movingPositionsRebuildsRawBonuses() {
        var p = player();
        save(p, 1, 5);
        var hp = inputs.current(p.token()).units().getFirst();
        save(p, 1, 6);
        var treatment = inputs.current(p.token()).units().getFirst();
        assertEquals(treatment.attributes().getOrDefault(102, 0L) + 300, hp.attributes().get(102));
        assertEquals(hp.attributes().getOrDefault(205, 0L) + 500, treatment.attributes().get(205));
        assertEquals(hp.attributes().get(223), treatment.attributes().get(223), "生命百分比尚不折算到基础生命");
        save(p, 1, 7);
        var attack = inputs.current(p.token()).units().getFirst();
        assertEquals(treatment.attributes().getOrDefault(201, 0L) + 300, attack.attributes().get(201));
        assertEquals(hp.attributes().getOrDefault(205, 0L), attack.attributes().getOrDefault(205, 0L));
        assertEquals(hp.hero().panelStats(), attack.hero().panelStats());
        assertEquals(treatment.attributes().get(220), attack.attributes().get(220));
    }

    /** 空阵仍保留选中阵型；永久助战开放后9号位为有效零加成，不借用普通格子配置。 */
    @Test void emptyAndAssistanceRemainExplicit() {
        var p = player();
        var empty = inputs.current(p.token());
        assertEquals(1, empty.formationId());
        assertTrue(empty.units().isEmpty());
        jdbc.update("UPDATE game_role SET assistance_unlocked=TRUE WHERE id=?", p.role());
        save(p, 1, 9);
        var assist = inputs.current(p.token()).units().getFirst();
        save(p, 1, 5);
        var hp = inputs.current(p.token()).units().getFirst();
        var expected = new HashMap<>(assist.attributes());
        expected.merge(102, 300L, Long::sum);
        assertEquals(expected, hp.attributes());
        assertEquals(9, assist.position());
    }

    /** 损坏的关闭位、未解锁阵型或助战不能静默变成可战斗输入；其他角色保持空阵。 */
    @Test void rejectsInvalidPersistentFormationWithoutRepair() {
        var p = player();
        var other = player();
        save(p, 1, 2);
        jdbc.update("UPDATE game_lineup_slot SET position=1 WHERE role_id=?", p.role());
        assertThrows(IllegalStateException.class, () -> inputs.current(p.token()));
        assertEquals(1, jdbc.queryForObject("SELECT position FROM game_lineup_slot WHERE role_id=?", Integer.class, p.role()));
        jdbc.update("UPDATE game_lineup_slot SET position=9 WHERE role_id=?", p.role());
        assertThrows(IllegalStateException.class, () -> inputs.current(p.token()));
        jdbc.update("UPDATE game_lineup_slot SET position=2 WHERE role_id=?", p.role());
        jdbc.update("DELETE FROM game_formation_unlock WHERE role_id=? AND formation_id=2", p.role());
        jdbc.update("UPDATE game_role SET main_formation_id=2 WHERE id=?", p.role());
        assertThrows(IllegalStateException.class, () -> inputs.current(p.token()));
        assertTrue(inputs.current(other.token()).units().isEmpty());
    }
}
