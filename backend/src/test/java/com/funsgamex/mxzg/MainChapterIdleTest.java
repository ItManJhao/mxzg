/** 独立H2验证挂机初始化、恢复、关卡收益和Protobuf，不连接日常玩家数据库。 */
package com.funsgamex.mxzg;
import java.util.*;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.network.*;
import com.funsgamex.mxzg.campaign.IdleRules;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:main_idle_snapshot;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "spring.datasource.username=sa", "spring.datasource.password="})
@ActiveProfiles("local")
class MainChapterIdleTest {
    /** 独立角色创建入口。 */
    @Autowired DevelopmentLoginService login;
    /** 与线上相同的登录恢复快照入口。 */
    @Autowired SessionSnapshotService snapshots;
    /** 仅操作本测试内存库的关卡夹具。 */
    @Autowired JdbcTemplate jdbc;
    /** 真实导出的收益配置。 */
    @Autowired IdleRules rules;

    /** 挂机选人服务，测试随机结果持久化而非固定随机种子。 */
    @Autowired com.funsgamex.mxzg.campaign.MainChapterIdleService idle;
    /** 隔离事务，调用者持有与生产相同的角色锁。 */
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    /** 角色行锁。 */
    @Autowired com.funsgamex.mxzg.role.RoleRepository roles;

    /** 三人内全部保留；多人抽样不重复且重连稳定，阵容版本变化才更新。 */
    @Test void selectedRosterIsBoundToFormationVersion() {
        var session=login.login("idle_roster_"+UUID.randomUUID().toString().substring(0,8));
        String role=session.role().id();
        var slots=java.util.stream.IntStream.rangeClosed(1,5)
            .mapToObj(i -> new com.funsgamex.mxzg.lineup.Lineup.Slot(i,UUID.randomUUID().toString())).toList();
        var tx=new org.springframework.transaction.support.TransactionTemplate(transactions);
        tx.executeWithoutResult(status -> {
            roles.lock(role);
            var state=idle.snapshot(role,1,2000);
            var formation=new com.funsgamex.mxzg.lineup.MainFormationStateService.State(1,List.of(1),false,10,slots,List.of());
            var selected=idle.withLineup(role,state,formation);
            assertEquals(3,selected.slots().size());
            assertEquals(3,new HashSet<>(selected.slots()).size());
            assertTrue(slots.containsAll(selected.slots()));
            assertEquals(selected.slots(),idle.withLineup(role,state,formation).slots());
            var smaller=new com.funsgamex.mxzg.lineup.MainFormationStateService.State(1,List.of(1),false,11,slots.subList(0,2),List.of());
            assertEquals(slots.subList(0,2),idle.withLineup(role,state,smaller).slots());
        });
    }

    /** 未通关不初始化；通关后持久起点不因重连改变，快照读取不发奖。 */
    @Test void clockPersistsAndRatesFollowMainChapterWithoutGranting() throws Exception {
        var session=login.login("idle_"+UUID.randomUUID().toString().substring(0,12));
        String role=session.role().id();
        String token="Bearer "+session.session().accessToken();
        var initial=snapshots.snapshot(token);
        assertNull(initial.mainChapterIdle());
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,?)",role,1);
        var first=snapshots.snapshot(token);
        assertEquals(1,first.mainChapterIdle().rewardStage());
        assertEquals(rules.stage(1).base(),first.mainChapterIdle().rates());
        assertEquals(rules.data().initialSeconds(),first.mainChapterIdle().serverTime()-first.mainChapterIdle().startedAt());
        var restored=snapshots.snapshot(token);
        assertEquals(first.mainChapterIdle().startedAt(),restored.mainChapterIdle().startedAt());
        assertEquals(first.revision(),restored.revision());
        assertEquals(initial.role(),restored.role());
        assertEquals(initial.inventory(),restored.inventory());
        jdbc.update("UPDATE game_main_chapter SET max_cleared=2 WHERE role_id=?",role);
        var next=snapshots.snapshot(token);
        assertEquals(rules.stage(2).base(),next.mainChapterIdle().rates());
        assertEquals(first.mainChapterIdle().startedAt(),next.mainChapterIdle().startedAt());
        var bytes=GameProtocolCodec.encode(Map.of("version",1,"kind","event","name","state.changed","body",next));
        var decoded=GameProtocolCodec.decode(bytes).path("body").path("mainChapterIdle");
        assertEquals(2,decoded.path("rewardStage").asInt());
        assertEquals(next.mainChapterIdle().startedAt(),decoded.path("startedAt").asLong());
        java.nio.file.Files.write(java.nio.file.Path.of("target/main-idle-snapshot.pb"),bytes);
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_idle_receipt WHERE role_id=?",Integer.class,role));
    }

    /** 本场只读演出服务，不调用领奖或修改主线。 */
    @Autowired com.funsgamex.mxzg.campaign.MainChapterIdleBattleService encounters;
    /** 使用真实阵容保存校验，不能由演出服务代选主阵容。 */
    @Autowired com.funsgamex.mxzg.lineup.MainFormationCommandService formations;

    /** 三英雄真实配置、随机首行动、单怪1血、只有普攻；重复演出资产与通关不变。 */
    @Test void encounterUsesThreeOwnedHeroesWithoutRewards() throws Exception {
        var session = login.login("idle_fight_" + UUID.randomUUID().toString().substring(0,8));
        String role = session.role().id(), token = "Bearer " + session.session().accessToken();
        assertThrows(IllegalArgumentException.class, () -> encounters.encounter(token));
        var slots = new ArrayList<com.funsgamex.mxzg.lineup.Lineup.Slot>();
        int[] templates = {10101001, 10104004, 10505005}, stars = {1, 4, 5};
        for (int i = 0; i < 3; i++) {
            String hero = UUID.randomUUID().toString();
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,?,100,?)",
                hero, role, templates[i], stars[i]);
            slots.add(new com.funsgamex.mxzg.lineup.Lineup.Slot(new int[]{2,3,5}[i], hero));
        }
        var beforeSave = snapshots.snapshot(token);
        formations.save(token, new com.funsgamex.mxzg.lineup.MainFormationCommandService.Save(
            UUID.randomUUID().toString(), beforeSave.mainFormation().version(), 1, slots));
        jdbc.update("INSERT INTO game_main_chapter(role_id,max_cleared) VALUES (?,3)", role);
        var before = snapshots.snapshot(token);
        for (int i = 0; i < 6; i++) {
            var result = encounters.encounter(token);
            assertEquals(3, result.stage());
            assertEquals(4, result.replay().initial().size());
            assertEquals(1, result.replay().initial().stream().filter(u -> u.faction() == 2).findFirst().orElseThrow().opening().hp());
            assertTrue(result.replay().initial().stream().allMatch(u -> u.skills().stream().allMatch(k -> k.activeType() == 2)));
            assertTrue(result.replay().turns().getFirst().sourceId() < 9);
            assertEquals(com.funsgamex.mxzg.hero.HeroBattleRoundUtils.Outcome.ATTACKER_WIN, result.replay().outcome());
            var bytes = GameProtocolCodec.encode(Map.of("version",1,"kind","response","name","chapter.idle.encounter","ok",true,
                "body",Map.of("stage",result.stage(),"assetRevision",result.assetRevision(),"lineupVersion",result.lineupVersion(),
                    "replay",GameProtocolCodec.tree(com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils.encode(result.replay())))));
            assertEquals(3,GameProtocolCodec.decode(bytes).path("body").path("stage").asInt());
            java.nio.file.Files.write(java.nio.file.Path.of("target/main-idle-encounter.pb"),bytes);
        }
        var after = snapshots.snapshot(token);
        assertEquals(before.role(), after.role());
        assertEquals(before.inventory(), after.inventory());
        assertEquals(before.revision(), after.revision());
        assertEquals(before.mainChapter(), after.mainChapter());
        assertEquals(before.mainChapterIdle().startedAt(), after.mainChapterIdle().startedAt());
        assertEquals(before.mainChapterIdle().slots(), after.mainChapterIdle().slots());
    }
}
