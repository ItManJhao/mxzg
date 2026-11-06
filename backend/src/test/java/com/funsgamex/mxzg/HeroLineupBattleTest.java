/** 持久阵容进入真实关卡的隔离H2回归：验证归属、完整技能、只读版本和逐单位结果。 */
package com.funsgamex.mxzg;

import java.util.*;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.hero.*;
import com.funsgamex.mxzg.lineup.*;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:lineup_battle;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class HeroLineupBattleTest {
    /** 仅创建隔离库测试角色。 */
    @Autowired DevelopmentLoginService login;
    /** 真实阵容保存入口。 */
    @Autowired MainFormationCommandService formations;
    /** 本批服务，不调用网络或奖励入口。 */
    @Autowired HeroLineupBattleService battles;
    /** 用于比较战斗前后的完整权威快照。 */
    @Autowired SessionSnapshotService snapshots;
    /** 核对输入属性只累加一次。 */
    @Autowired HeroBattleInputService inputs;
    /** 仅向隔离H2准备测试英雄。 */
    @Autowired JdbcTemplate jdbc;

    /** 一个测试角色及其独立英雄实例。 */
    private record Player(String role, String token, String hero) {}

    /** 用真实模板创建英雄，后续必须通过保存服务布阵。 */
    private Player player(int template, int star) {
        var session = login.login("test_" + UUID.randomUUID().toString().substring(0, 12));
        String hero = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,1,?,0)",
            hero, session.role().id(), template, star);
        return new Player(session.role().id(), "Bearer " + session.session().accessToken(), hero);
    }

    /** 正常路径使用真实版本和保存服务，不能靠直接写站位绕过归属验证。 */
    private void save(Player player, List<Lineup.Slot> slots) {
        var state = snapshots.snapshot(player.token());
        formations.save(player.token(), new MainFormationCommandService.Save(UUID.randomUUID().toString(),
            state.mainFormation().version(), 1, slots));
    }

    /** 比较全部持久业务数据；回包服务器时钟正常前进不属于资产写入。 */
    private void assertAssetsUnchanged(SessionSnapshotService.Snapshot before, SessionSnapshotService.Snapshot after) {
        assertEquals(before.role(), after.role());
        assertEquals(before.heroes(), after.heroes());
        assertEquals(before.inventory(), after.inventory());
        assertEquals(before.revision(), after.revision());
        assertEquals(before.timedInventory().items(), after.timedInventory().items());
        assertTrue(after.timedInventory().serverTimeSeconds() >= before.timedInventory().serverTimeSeconds());
        assertEquals(before.heroRoster(), after.heroRoster());
        assertEquals(before.mainFormation(), after.mainFormation());
    }

    /** 前三关均使用持久英雄和站位，返回版本与缺口，计算不改资产快照。 */
    @Test void savedRosterRunsThreeMissionsWithoutWritingAssets() {
        var p = player(10101001, 1);
        save(p, List.of(new Lineup.Slot(5, p.hero())));
        var before = snapshots.snapshot(p.token());
        var input = inputs.current(p.token());
        for (int mission = 1; mission <= 3; mission++) {
            var result = battles.preview(p.token(), mission, rate -> rate == 1D);
            assertEquals("audit:lineup:" + mission, result.battle().scenario());
            assertEquals(input.assetRevision(), result.assetRevision());
            assertEquals(input.lineupVersion(), result.lineupVersion());
            assertEquals(input.pending(), result.pending());
            assertFalse(result.pending().isEmpty());
            var attacker = result.battle().initial().getFirst();
            assertEquals(5, attacker.position());
            assertEquals(5, attacker.id());
            assertEquals(input.units().getFirst().attributes(), attacker.attributes(), "单英雄不重复阵型加成");
            assertEquals(input.units().getFirst().skillSchedule(), attacker.skills());
            assertEquals(mission == 3 ? 3 : 2, result.battle().initial().size());
            assertAssetsUnchanged(before, snapshots.snapshot(p.token()));
        }
    }

    /** 多单位保留独立身份，同一版本重复运行不串用生命或Buff。 */
    @Test void multipleOwnedUnitsAndRepeatedRunsStayIndependent() {
        var p = player(10101001, 1);
        String second = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,10104004,1,4,0)", second, p.role());
        save(p, List.of(new Lineup.Slot(2, p.hero()), new Lineup.Slot(3, second)));
        var first = battles.preview(p.token(), 3, rate -> rate == 1D);
        assertEquals(4, first.battle().initial().size());
        var wire = HeroBattleReplayProtocolUtils.encode(first.battle());
        assertEquals("audit:lineup:3", wire.getScenario());
        assertEquals(4, wire.getUnitsCount());
        assertEquals(first.battle().frames().size(), wire.getPhasesCount());
        assertEquals(Set.of(2, 3, 10, 11), first.battle().finalHp().keySet());
        assertEquals(first, battles.preview(p.token(), 3, rate -> rate == 1D));
    }

    /** 强化解锁的纯属性被动只在初始属性累加一次；不再因非奈奈子编号被拦截。 */
    @Test void unlockedStaticPassiveRunsWithoutDoubleCounting() {
        var p = player(10104004, 4);
        jdbc.update("UPDATE game_hero SET stage=1,hero_level=30 WHERE id=?", p.hero());
        save(p, List.of(new Lineup.Slot(2, p.hero())));
        var before = snapshots.snapshot(p.token());
        var input = inputs.current(p.token());
        assertTrue(input.units().getFirst().skillSchedule().stream()
            .anyMatch(skill -> skill.skillId() == 101040042 && skill.countStats()));
        var result = battles.preview(p.token(), 1, rate -> rate == 1D);
        assertEquals(input.units().getFirst().attributes(), result.battle().initial().getFirst().attributes());
        assertEquals(input.units().getFirst().opening(), result.battle().initial().getFirst().opening());
        assertAssetsUnchanged(before, snapshots.snapshot(p.token()));
    }

    /** 魅惑之拥真实初始技能可进入前三关，不删普攻、不改资产。 */
    @Test void charmRosterRunsCompleteInitialSkills() {
        var p = player(10105011, 5);
        save(p, List.of(new Lineup.Slot(2, p.hero())));
        var before = snapshots.snapshot(p.token());
        for (int mission : List.of(1, 2, 3)) {
            var result = battles.preview(p.token(), mission, rate -> rate == 1D);
            assertTrue(result.battle().frames().stream().flatMap(frame -> frame.trace().stream())
                .anyMatch(trace -> trace.kind().equals("buff.upsert") && trace.configId() == 1111401));
            assertAssetsUnchanged(before, snapshots.snapshot(p.token()));
        }
    }

    /** 强化1解锁破甲和生命比例，确认完整只读试战沿用一次折算且不会安装静态Buff。 */
    @Test void charmStaticPassiveUsesLegacyRankAndOpeningAttributes() {
        var cases = List.of(
            new int[] {5, 1, 0},
            new int[] {6, 2, 1000},
            new int[] {7, 2, 1000},
            new int[] {8, 3, 1500}
        );
        for (var expected : cases) {
            int star = expected[0];
            int skillLevel = expected[1];
            long hpRate = expected[2];
            var p = player(10105011, star);
            jdbc.update("UPDATE game_hero SET hero_level=30 WHERE id=?", p.hero());
            save(p, List.of(new Lineup.Slot(2, p.hero())));
            var locked = inputs.current(p.token()).units().getFirst();
            assertTrue(locked.skillSchedule().stream().noneMatch(skill -> skill.skillId() == 101050112));

            jdbc.update("UPDATE game_hero SET stage=1 WHERE id=?", p.hero());
            var before = snapshots.snapshot(p.token());
            var input = inputs.current(p.token()).units().getFirst();
            var passive = input.skillSchedule().stream()
                .filter(skill -> skill.skillId() == 101050112)
                .findFirst().orElseThrow();
            assertEquals(skillLevel, passive.level(), "星级 " + star);
            assertTrue(passive.countStats());
            assertEquals(locked.attributes().getOrDefault(203, 0L) + 6400L, input.attributes().get(203));
            long totalHpRate = locked.attributes().getOrDefault(102, 0L) + hpRate;
            assertEquals(totalHpRate, input.attributes().getOrDefault(102, 0L));
            long hp = (long) (input.attributes().get(223) * (1 + totalHpRate / 10000D));

            var report = battles.preview(p.token(), 3, rate -> rate == 1D).battle();
            var attacker = report.initial().getFirst();
            assertEquals(input.attributes(), attacker.attributes());
            assertEquals(hp, attacker.opening().hp());
            assertEquals(hp, attacker.opening().maxHp());
            assertEquals(hp, report.frames().getFirst().before().get(2));
            assertTrue(report.frames().stream().flatMap(frame -> frame.trace().stream())
                .noneMatch(event -> event.kind().equals("buff.upsert")
                    && (event.configId() == 1112100 + skillLevel || event.configId() == 1112200 + skillLevel)));
            assertAssetsUnchanged(before, snapshots.snapshot(p.token()));
        }
    }

    /** 隔离库保存强化3魅惑之拥，验证正常只读试战入口安装死亡监听且资产快照保持一致。 */
    @Test void savedCharmDeathPassiveRunsInReadOnlyBattle() {
        var p = player(10105011, 9);
        jdbc.update("UPDATE game_hero SET stage=3,hero_level=50 WHERE id=?", p.hero());
        save(p, List.of(new Lineup.Slot(2, p.hero())));
        var before = snapshots.snapshot(p.token());
        var report = battles.preview(p.token(), 3, rate -> rate >= 1D).battle();
        assertTrue(report.initial().getFirst().skills().stream()
            .anyMatch(skill -> skill.skillId() == 101050113 && skill.level() == 3));
        assertEquals(2, report.frames().getFirst().trace().stream()
            .filter(event -> event.kind().equals("buff.upsert") && event.configId() == 1113103).count());
        assertEquals(1, report.frames().stream().flatMap(frame -> frame.trace().stream())
            .filter(event -> event.kind().equals("buff.upsert") && event.configId() == 1113203).count());
        assertAssetsUnchanged(before, snapshots.snapshot(p.token()));
    }

    /** 空阵、越界关卡和陌生角色不得被自动替换为固定测试英雄。 */
    @Test void rejectsEmptyForeignAndUnsupportedMission() {
        var owner = player(10101001, 1);
        var other = player(10101001, 1);
        save(owner, List.of(new Lineup.Slot(2, owner.hero())));
        assertThrows(IllegalArgumentException.class, () -> battles.preview(other.token(), 1, rate -> true));
        assertThrows(RuntimeException.class, () -> save(other, List.of(new Lineup.Slot(2, owner.hero()))));
        assertThrows(IllegalArgumentException.class, () -> battles.preview(owner.token(), 4, rate -> true));
        assertThrows(RuntimeException.class, () -> battles.preview("Bearer invalid", 1, rate -> true));
    }

    /** 未支持技能不静默降级到普攻；助战位不冒充普通站位。 */
    @Test void rejectsUnsupportedSkillsAndAssistanceWithoutMutations() {
        var p = player(10105008, 10);
        save(p, List.of(new Lineup.Slot(2, p.hero())));
        var before = snapshots.snapshot(p.token());
        assertThrows(IllegalArgumentException.class, () -> battles.preview(p.token(), 1, rate -> true));
        assertAssetsUnchanged(before, snapshots.snapshot(p.token()));
        jdbc.update("UPDATE game_role SET assistance_unlocked=TRUE WHERE id=?", p.role());
        save(p, List.of(new Lineup.Slot(9, p.hero())));
        var failure = assertThrows(IllegalArgumentException.class, () -> battles.preview(p.token(), 1, rate -> true));
        assertTrue(failure.getMessage().contains("助战"));
    }
}
