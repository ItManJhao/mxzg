/** 阵型永久状态在隔离内存库验证事务、归属、协议和幂等读取，不访问玩家库。 */
package com.funsgamex.mxzg;
import java.util.*;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import com.funsgamex.mxzg.network.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:formation_state;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password="})
@ActiveProfiles("local")
class MainFormationStateTest {
    @Autowired DevelopmentLoginService login;
    @Autowired MainFormationStateService formations;
    @Autowired SessionSnapshotService snapshots;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    /** 创建隔离账号，不发放正常玩法奖励。 */
    private DevelopmentLoginService.LoginResult player(){return login.login("formation_"+UUID.randomUUID().toString().substring(0,12));}
    /** 只在本用例数据库准备达到门槛的英雄。 */
    private void seed(String role,int count){for(int i=0;i<count;i++)jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,10105008,1,10)",UUID.randomUUID().toString(),role);}
    /** 默认、解锁、重复读取、英雄减少、角色隔离及二进制字段保留。 */
    @Test void unlocksPersistAndSnapshotIsStable() throws Exception {
        var p=player();var other=player();String token="Bearer "+p.session().accessToken();
        var initial=snapshots.snapshot(token);assertEquals(List.of(1),initial.mainFormation().unlockedIds());assertFalse(initial.mainFormation().assistanceUnlocked());
        seed(p.role().id(),6);var unlocked=snapshots.snapshot(token);
        assertTrue(unlocked.mainFormation().assistanceUnlocked());assertEquals(8,unlocked.mainFormation().unlockedIds().size());assertEquals(initial.revision()+1,unlocked.revision());
        assertEquals(unlocked.revision(),snapshots.snapshot(token).revision());
        jdbc.update("DELETE FROM game_hero WHERE role_id=?",p.role().id());
        assertEquals(unlocked.mainFormation(),snapshots.snapshot(token).mainFormation());
        assertFalse(formations.current(other.role().id()).assistanceUnlocked());
        var bytes=GameProtocolCodec.encode(Map.of("version",1,"kind","event","name","state.changed","body",snapshots.snapshot(token)));
        assertTrue(GameProtocolCodec.decode(bytes).path("body").path("mainFormation").path("assistanceUnlocked").asBoolean());
    }
    /** 解锁、英雄和revision随同一事务回滚，不能只保存永久标记。 */
    @Test void unlockRollbackIsAtomic(){
        var p=player();String id=p.role().id();var tx=new TransactionTemplate(transactions);
        long revision=jdbc.queryForObject("SELECT state_revision FROM game_role WHERE id=?",Long.class,id);
        tx.executeWithoutResult(status->{seed(id,6);assertTrue(formations.refresh(id).assistanceUnlocked());status.setRollbackOnly();});
        assertEquals(List.of(1),formations.current(id).unlockedIds());assertFalse(formations.current(id).assistanceUnlocked());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_hero WHERE role_id=?",Integer.class,id));
        assertEquals(revision,jdbc.queryForObject("SELECT state_revision FROM game_role WHERE id=?",Long.class,id));
    }
    /** 无事务拒绝写入；非法选中阵型不能静默重置。 */
    @Test void refusesUnsafeRefreshAndInvalidSelection(){
        var p=player();assertThrows(org.springframework.transaction.IllegalTransactionStateException.class,()->formations.refresh(p.role().id()));
        jdbc.update("UPDATE game_role SET main_formation_id=2 WHERE id=?",p.role().id());
        assertThrows(IllegalStateException.class,()->formations.current(p.role().id()));
    }
}
