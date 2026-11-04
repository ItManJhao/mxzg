/** 原版主线阵型和助战规则，以真实导出表验证，不开放或写入玩家阵容。 */
package com.funsgamex.mxzg;
import com.funsgamex.mxzg.lineup.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
class MainFormationRulesTest {
    /** 空名册仍解锁基础阵型；实际battlematrix的六星门槛对应阵型2。 */
    @Test void defaultAndRealTableUnlocks(){
        var rules=new MainFormationRules(new ObjectMapper());var empty=new MainFormationRules.Unlocks(Set.of(),false);
        assertEquals(Set.of(1),rules.unlock(empty,List.of()).formations());
        var six=rules.unlock(empty,List.of(new MainFormationRules.Hero("a",10101001,1,6)));
        assertEquals(Set.of(1,2),six.formations());assertFalse(six.assistance());
        assertEquals(six,rules.unlock(six,List.of()),"已解锁阵型不能因英雄消耗而收回");
    }
    /** 助战按六个十星实例统计，即使同模板也计数；解锁后永久保留。 */
    @Test void assistanceThresholdAndLatch(){
        var rules=new MainFormationRules(new ObjectMapper());var heroes=new ArrayList<MainFormationRules.Hero>();
        for(int i=0;i<6;i++)heroes.add(new MainFormationRules.Hero("hero"+i,10101001,1,10));
        var empty=new MainFormationRules.Unlocks(Set.of(),false);
        assertFalse(rules.unlock(empty,heroes.subList(0,5)).assistance());
        var unlocked=rules.unlock(empty,heroes);assertTrue(unlocked.assistance());assertTrue(rules.unlock(unlocked,List.of()).assistance());
        heroes.set(5,new MainFormationRules.Hero("hero5",10101001,1,9));assertFalse(rules.unlock(empty,heroes).assistance());
    }
    /** 先出现模板保留；关闭位、锁定助战和外来英雄不入阵，不改变原输入。 */
    @Test void normalizesInOldRequestOrder(){
        var rules=new MainFormationRules(new ObjectMapper());var unlocked=new MainFormationRules.Unlocks(Set.of(1),false);
        var heroes=List.of(new MainFormationRules.Hero("a",10101001,1,1),new MainFormationRules.Hero("b",10101001,1,1),new MainFormationRules.Hero("c",10301001,1,1));
        var input=List.of(new Lineup.Slot(1,"c"),new Lineup.Slot(3,"b"),new Lineup.Slot(2,"a"),new Lineup.Slot(9,"c"),new Lineup.Slot(5,"foreign"));
        assertEquals(List.of(new Lineup.Slot(3,"b")),rules.normalize(1,unlocked,heroes,input));assertEquals(5,input.size());
        assertEquals(List.of(new Lineup.Slot(9,"c")),rules.normalize(1,new MainFormationRules.Unlocks(Set.of(1),true),heroes,List.of(new Lineup.Slot(9,"c"))));
        assertThrows(IllegalArgumentException.class,()->rules.normalize(1,unlocked,heroes,List.of(new Lineup.Slot(2,"a"),new Lineup.Slot(2,"b"))));
        assertThrows(IllegalArgumentException.class,()->rules.normalize(2,unlocked,heroes,List.of()));
        assertThrows(IllegalArgumentException.class,()->rules.normalize(1,unlocked,heroes,List.of(new Lineup.Slot(99,"a"))));
        assertThrows(IllegalArgumentException.class,()->rules.normalize(1,unlocked,List.of(new MainFormationRules.Hero("a",10101001,0,1)),List.of(new Lineup.Slot(2,"a"))));
    }
    /** 位置加成保留真实编号且不可变，禁止把所有槽当成相同加成。 */
    @Test void positionAttributesRetainBattleIds(){
        var rules=new MainFormationRules(new ObjectMapper());assertFalse(rules.position(1,1).open());
        assertEquals(Map.of(291,300L),rules.position(1,2).attributes());assertEquals(Map.of(102,300L),rules.position(1,5).attributes());
        assertEquals(Map.of(205,500L),rules.position(1,6).attributes());assertTrue(rules.position(1,9).attributes().isEmpty());
        assertThrows(UnsupportedOperationException.class,()->rules.position(1,2).attributes().clear());
    }
}
