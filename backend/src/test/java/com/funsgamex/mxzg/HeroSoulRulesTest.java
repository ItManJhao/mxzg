/** 真实旧附魂配置的关闭门槛与纯规则边界，不修改玩家数据库。 */
package com.funsgamex.mxzg;
import com.funsgamex.mxzg.hero.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
class HeroSoulRulesTest {
    /** 正常英雄即使已有附魂等级也不绕过旧999星门槛。 */
    @Test void oldDisabledGateIsPreserved(){var rules=new HeroSoulRules(new ObjectMapper());assertEquals(999,rules.requiredHeroStar());assertNull(rules.resolve(13,1001015,1,3));assertNull(rules.resolve(999,1001015,1,0));}
    /** 仅在纯规则夹具满足全部门槛时查到技能；999星不是实际发放英雄。 */
    @Test void levelAndEquipmentRequirements(){var rules=new HeroSoulRules(new ObjectMapper());assertEquals(new HeroSoulRules.Skill(1001015,1),rules.resolve(999,1001015,1,1));assertEquals(new HeroSoulRules.Skill(1001015,3),rules.resolve(999,1001015,1,3));assertNull(rules.resolve(999,1001001,1,1));assertThrows(IllegalStateException.class,()->rules.resolve(999,1001015,2,1));assertThrows(IllegalStateException.class,()->rules.resolve(999,1001015,1,999));}
}
