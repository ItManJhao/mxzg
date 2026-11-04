/** 以真实旧装备表验证套装累计、取整和未恢复声明，不访问玩家数据库。 */
package com.funsgamex.mxzg;
import com.funsgamex.mxzg.hero.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class HeroPanelRulesTest {
    /** 普通装备固定值生效，未穿戴时不产生虚假加成，基础对象保持不变。 */
    @Test void equipmentAndEmpty(){
        var rules=new HeroPanelRules(new ObjectMapper());var base=new HeroGrowthRules.Stats(1000,100,100,100);
        var empty=rules.calculate(base,new HeroEquipmentRepository.State(List.of()));
        assertEquals(100,empty.values().atk());assertEquals(1000,empty.values().hp());
        var result=rules.calculate(base,new HeroEquipmentRepository.State(List.of(item(1001001,1))));
        assertEquals(133,result.values().atk());assertEquals(100,base.atk());assertFalse(result.complete());assertTrue(result.pendingSources().contains("skill_panel"));
        assertThrows(IllegalStateException.class,()->rules.calculate(base,new HeroEquipmentRepository.State(List.of(item(1001001,2)))));
    }
    /** 2/3/4 件门槛分别触发，并累计而非只取最高一档；最后向零截断。 */
    @Test void cumulativeSetThresholds(){
        var rules=new HeroPanelRules(new ObjectMapper());var base=new HeroGrowthRules.Stats(1000,100,100,100);
        var two=rules.calculate(base,new HeroEquipmentRepository.State(List.of(item(1001007,1),item(1002007,2))));
        assertEquals(2592,two.values().hp());assertEquals(376,two.values().atk());
        var three=rules.calculate(base,new HeroEquipmentRepository.State(List.of(item(1001007,1),item(1002007,2),item(1003007,3))));
        assertEquals(4952,three.values().hp());assertEquals(387,three.values().atk());
        var four=rules.calculate(base,new HeroEquipmentRepository.State(List.of(item(1001007,1),item(1002007,2),item(1003007,3),item(1004007,4))));
        assertEquals(5000,four.values().hp());assertEquals(569,four.values().atk());
    }
    /** 夹具只提供持久只读记录，不开放穿戴接口。 */
    private HeroEquipmentRepository.Item item(int template,int slot){return new HeroEquipmentRepository.Item("test-"+slot,template,slot,0);}
}
