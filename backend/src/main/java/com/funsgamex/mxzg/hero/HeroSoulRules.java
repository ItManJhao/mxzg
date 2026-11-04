/** 附魂技能只读解析：沿旧服务器门槛选择技能，不开启附魂操作，也不重复计入初始面板。 */
package com.funsgamex.mxzg.hero;
import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.*;
@Component
public class HeroSoulRules {
    /** 已生效的附魂技能配置 ID 和等级，不是装备实例 ID。 */
    public record Skill(int skillId,int level) {}
    /** 旧配置全局第一行的英雄星级门槛。 */
    private final int requiredHeroStar;
    /** 当前客户端同源表字段名保留原拼写 need_euqip_rare。 */
    private final int requiredRare;
    /** 装备星级门槛，与英雄星级分离。 */
    private final int requiredEquipStar;
    /** 装备稀有度、星级和位置配置。 */
    private final Map<Integer,JsonNode> equipment=new HashMap<>();
    /** 位置/附魂等级到技能，不把槽位当技能 ID。 */
    private final Map<String,Skill> skills=new HashMap<>();
    /** 读取旧同源三表并校验技能等级引用；缺配置不猜测。 */
    public HeroSoulRules(ObjectMapper mapper){
        var gate=rows(mapper,"heroequipsoulextra").get(0);
        requiredHeroStar=gate.path("need_star").asInt();requiredRare=gate.path("need_euqip_rare").asInt();requiredEquipStar=gate.path("need_equip_star").asInt();
        if(requiredHeroStar<=0||requiredRare<=0||requiredEquipStar<=0)throw new IllegalStateException("附魂门槛无效");
        for(var row:rows(mapper,"equipmenttype"))equipment.put(row.path("equipment_type").asInt(),row);
        Set<String> known=new HashSet<>();for(var row:rows(mapper,"heroskill"))known.add(row.path("type").asInt()+":"+row.path("level").asInt());
        for(var row:rows(mapper,"heroequipsoul")){
            var skill=new Skill(row.path("skill").asInt(),row.path("skill_level").asInt());
            if(!known.contains(skill.skillId()+":"+skill.level())||skills.put(row.path("place").asInt()+":"+row.path("level").asInt(),skill)!=null)throw new IllegalStateException("附魂技能配置无效");
        }
    }
    /** 返回实际旧门槛；当前为999，不自行改为可开放等级。 */
    public int requiredHeroStar(){return requiredHeroStar;}
    /** 仅符合全部门槛时返回技能；未生效返回null，不能按附魂等级直接加属性。 */
    public Skill resolve(int heroStar,int templateId,int slot,int soulLevel){
        var config=equipment.get(templateId);if(config==null||config.path("place").asInt()!=slot||soulLevel<0)throw new IllegalStateException("附魂装备资料无效");
        if(soulLevel==0||heroStar<requiredHeroStar||config.path("rare").asInt()<requiredRare||config.path("star").asInt()<requiredEquipStar)return null;
        var skill=skills.get(slot+":"+soulLevel);if(skill==null)throw new IllegalStateException("附魂技能等级缺失");return skill;
    }
    /** 读取构建时打包的共享配置，不保存玩家状态。 */
    private JsonNode rows(ObjectMapper mapper,String name){try(var input=getClass().getResourceAsStream("/gameplay/"+name+".json")){if(input==null)throw new IllegalStateException("附魂表缺失："+name);var rows=mapper.readTree(input).path("rows");if(!rows.isArray()||rows.isEmpty())throw new IllegalStateException("附魂表为空");return rows;}catch(java.io.IOException error){throw new IllegalStateException("附魂表读取失败",error);}}
}
