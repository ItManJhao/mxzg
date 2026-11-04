/** 主线保存在隔离内存库验证原版归一化、持久回执、版本和统一快照，不访问玩家库。 */
package com.funsgamex.mxzg;

import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.lineup.*;
import com.funsgamex.mxzg.network.SessionSnapshotService;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:formation_save;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password="})
@ActiveProfiles("local")
class MainFormationCommandTest {
    @Autowired DevelopmentLoginService login;
    @Autowired MainFormationCommandService commands;
    @Autowired SessionSnapshotService snapshots;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;

    /** 每个用例使用独立合成账号。 */
    private DevelopmentLoginService.LoginResult player() { return login.login("formation_"+UUID.randomUUID().toString().substring(0,12)); }
    /** 准备真实配置实例，避免依赖开发GM开关。 */
    private String hero(String role, int template, int star) {
        String id=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star) VALUES (?,?,?,1,?)",id,role,template,star);
        return id;
    }
    /** 构造独立幂等保存请求。 */
    private MainFormationCommandService.Save request(long version,int formation,List<Lineup.Slot> slots) {
        return new MainFormationCommandService.Save(UUID.randomUUID().toString(),version,formation,slots);
    }
    /** 同模板、关闭位置和锁定助战沿旧顺序跳过；回执重试不重复增版本。 */
    @Test void normalizesAndReplaysWithoutAssetWrites() {
        var p=player();String token="Bearer "+p.session().accessToken();
        String a=hero(p.role().id(),10105008,5),same=hero(p.role().id(),10105008,5);
        var before=snapshots.snapshot(token);
        var req=request(0,1,List.of(new Lineup.Slot(1,a),new Lineup.Slot(2,a),new Lineup.Slot(3,same),new Lineup.Slot(9,same),new Lineup.Slot(5,UUID.randomUUID().toString())));
        var saved=commands.save(token,req);assertEquals(1,saved.version());
        var after=snapshots.snapshot(token);assertEquals(before.revision()+1,after.revision());
        assertEquals(List.of(new Lineup.Slot(2,a)),after.mainFormation().slots());
        assertEquals(saved,commands.save(token,req));assertEquals(after.revision(),snapshots.snapshot(token).revision());
        var noChange=commands.save(token,request(1,1,List.of(new Lineup.Slot(2,a))));assertEquals(1,noChange.version());
        assertEquals(after.revision(),snapshots.snapshot(token).revision());
        var conflict=new MainFormationCommandService.Save(req.requestId(),0L,1,List.of(new Lineup.Slot(3,a)));
        assertEquals("FORMATION_REQUEST_CONFLICT",assertThrows(ResponseStatusException.class,()->commands.save(token,conflict)).getReason());
        assertEquals("FORMATION_CHANGED",assertThrows(ResponseStatusException.class,()->commands.save(token,request(0,1,List.of(new Lineup.Slot(3,a))))).getReason());
    }
    /** 阵型切换即使站位相同也递增版本；回执和阵容都能随外层事务完整回滚。 */
    @Test void switchesAndRollsBackAllState() {
        var p=player();String token="Bearer "+p.session().accessToken(),id=hero(p.role().id(),10105008,10);
        var before=snapshots.snapshot(token);assertTrue(before.mainFormation().unlockedIds().contains(2));
        var req=request(0,2,List.of(new Lineup.Slot(2,id)));
        new TransactionTemplate(transactions).executeWithoutResult(tx->{commands.save(token,req);tx.setRollbackOnly();});
        assertEquals(0,snapshots.snapshot(token).mainFormation().version());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_formation_save WHERE role_id=?",Integer.class,p.role().id()));
        commands.save(token,req);assertEquals(2,snapshots.snapshot(token).mainFormation().formationId());
        commands.save(token,request(1,1,List.of(new Lineup.Slot(2,id))));assertEquals(2,snapshots.snapshot(token).mainFormation().version());
    }
    /** 空阵、跨角色及未知阵型均失败，不留回执或部分版本。 */
    @Test void rejectsEmptyForeignAndInvalidFormation() {
        var p=player();var other=player();String token="Bearer "+p.session().accessToken();
        String foreign=hero(other.role().id(),10105008,5);
        for(var req:List.of(request(0,1,List.of()),request(0,1,List.of(new Lineup.Slot(2,foreign))),request(0,8,List.of(new Lineup.Slot(2,foreign))))) {
            assertThrows(ResponseStatusException.class,()->commands.save(token,req));
        }
        assertEquals(0,snapshots.snapshot(token).mainFormation().version());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM game_formation_save WHERE role_id=?",Integer.class,p.role().id()));
    }
    /** 两个同版本保存竞争，仅一个提交；角色行锁保护版本与站位原子性。 */
    @Test void serializesConcurrentVersion() throws Exception {
        var p=player();String token="Bearer "+p.session().accessToken(),id=hero(p.role().id(),10105008,5);
        var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        try {
            var futures=new ArrayList<Future<Boolean>>();
            for(int position:List.of(2,3))futures.add(pool.submit(()->{start.await();try{commands.save(token,request(0,1,List.of(new Lineup.Slot(position,id))));return true;}catch(ResponseStatusException e){assertEquals("FORMATION_CHANGED",e.getReason());return false;}}));
            start.countDown();int success=0;for(var future:futures)if(future.get(10,TimeUnit.SECONDS))success++;
            assertEquals(1,success);assertEquals(1,snapshots.snapshot(token).mainFormation().version());
        } finally {pool.shutdownNow();}
    }
}
