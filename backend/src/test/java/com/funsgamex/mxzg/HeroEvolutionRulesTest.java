/** 以真实进化表验证总属性、技能身份和边界；只运行纯规则，不连接玩家数据库。 */
package com.funsgamex.mxzg;
import com.funsgamex.mxzg.hero.HeroEvolutionRules;
import com.funsgamex.mxzg.hero.HeroEvolutionRules.Skill;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
class HeroEvolutionRulesTest {
    /** 每级读取总属性，不累计上一等级，保留暴击等非四维属性。 */
    @Test void currentLevelUsesTotalAttributes() {
        var rules=new HeroEvolutionRules(new ObjectMapper());
        var first=rules.resolve(10105008,1,1);var second=rules.resolve(10105008,1,2);
        assertEquals(7500L,first.attributes().get(220));assertEquals(7500L,second.attributes().get(220));
        assertEquals(45000L,second.attributes().get(223));assertEquals(300L,second.attributes().get(207));
        assertThrows(UnsupportedOperationException.class,()->second.attributes().put(220,0L));
    }
    /** 未进化与非法状态区分；不按相似英雄或最大等级回退。 */
    @Test void missingAndInvalidStatesAreExplicit() {
        var rules=new HeroEvolutionRules(new ObjectMapper());
        assertTrue(rules.resolve(10105008,0,0).attributes().isEmpty());
        assertThrows(IllegalArgumentException.class,()->rules.resolve(10105008,0,1));
        assertThrows(IllegalArgumentException.class,()->rules.resolve(10105008,1,0));
        assertThrows(IllegalArgumentException.class,()->rules.resolve(10105008,-1,1));
        assertThrows(IllegalArgumentException.class,()->rules.resolve(10101001,1,1));
        assertThrows(IllegalArgumentException.class,()->rules.resolve(10105008,1,999));
    }
    /** 按type替换并保持较高等级，输入不变；未持有的进化技能沿旧服添加。 */
    @Test void skillTypeReplacementMatchesOldAddSkill() {
        var rules=new HeroEvolutionRules(new ObjectMapper());var evolved=rules.resolve(10105008,1,1);
        var original=List.of(new Skill(101050081,1),new Skill(101050082,1));
        var result=rules.applySkills(original,evolved);
        assertEquals(new Skill(101050081,4),result.getFirst());assertEquals(2,result.size());
        assertEquals(1,original.getFirst().level());
        assertEquals(6,rules.applySkills(List.of(new Skill(101050081,6)),evolved).getFirst().level());
        assertEquals(List.of(new Skill(101050081,4)),rules.applySkills(List.of(),evolved));
        assertEquals(original,rules.applySkills(original,rules.resolve(10105008,0,0)));
        assertThrows(IllegalArgumentException.class,()->rules.applySkills(List.of(original.getFirst(),original.getFirst()),evolved));
    }
}
