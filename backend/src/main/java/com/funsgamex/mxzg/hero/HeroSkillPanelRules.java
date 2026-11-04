/** 按旧 BattleTemplate/SkillInfo/CBuff 解析英雄技能面板加成；不执行战斗触发效果或技能升级。 */
package com.funsgamex.mxzg.hero;
import java.util.*;
import java.util.function.BiConsumer;
import org.springframework.stereotype.Component;
import tools.jackson.databind.*;
@Component
public class HeroSkillPanelRules {
    /** 同源配置解析器，只在启动读取表与属性列表。 */
    private final ObjectMapper mapper;
    /** 模板、强化、星级、动作和 buff 的真实配置索引。 */
    private final Map<String,Map<Integer,JsonNode>> tables=new HashMap<>();
    /** 技能按 type/level 复合键查找，禁止混用行号 idx。 */
    private final Map<String,JsonNode> skills=new HashMap<>();
    /** 启动读取同源表，缺表或重复键明确失败。 */
    public HeroSkillPanelRules(ObjectMapper mapper){
        this.mapper=mapper;
        for(String name:List.of("herotype","heroupgrade","herostar","buffart","buff","heroskill")){
            String key=switch(name){case "herotype"->"type";case "heroupgrade"->"grade";case "herostar"->"star";default->"idx";};
            Map<Integer,JsonNode> rows=new HashMap<>();
            try(var input=getClass().getResourceAsStream("/gameplay/"+name+".json")){
                if(input==null)throw new IllegalStateException("技能面板表缺失："+name);
                for(var row:mapper.readTree(input).path("rows")){
                    if(rows.put(row.path(key).asInt(),row)!=null)throw new IllegalStateException("技能面板配置重复");
                    if(name.equals("heroskill")&&skills.put(row.path("type").asInt()+":"+row.path("level").asInt(),row)!=null)throw new IllegalStateException("技能等级重复");
                }
                if(rows.isEmpty())throw new IllegalStateException("技能面板表为空");tables.put(name,Map.copyOf(rows));
            }catch(java.io.IOException error){throw new IllegalStateException("技能面板表读取失败",error);}
        }
    }
    /** 按真实星级和强化解锁选择四个技能，普攻 level=0；仅属性面板 buff 回调累加，不执行触发链。 */
    public void contribute(int template,int star,int stage,BiConsumer<Integer,Long> add){
        var hero=row("herotype",template);var rank=row("herostar",star);var upgrade=row("heroupgrade",stage);
        for(int slot=1;slot<=5;slot++){
            int id=hero.path("skill_"+slot).asInt();if(id==0||(slot<5&&upgrade.path("skill"+slot).asInt()!=1))continue;
            int level=slot==5?0:rank.path("skill"+slot).asInt();var skill=skills.get(id+":"+level);
            if(skill==null)throw new IllegalStateException("面板技能等级缺失："+id+":"+level);
            int active=skill.path("active_type").asInt();if(active==1||active==2||skill.path("count_stats").asInt()!=1)continue;
            for(var artId:mapper.readTree(skill.path("art_list").asString())){
                var art=row("buffart",artId.asInt());
                for(var buffId:mapper.readTree(art.path("buff_list").asString())){
                    var buff=row("buff",buffId.asInt());int type=buff.path("type").asInt();
                    if(!Set.of(160,163,323,324,330,332).contains(type))continue;
                    String[] values=buff.path("value").asString().split("\\|",-1);
                    if(values.length<2)throw new IllegalStateException("面板 buff 参数缺失");
                    add.accept(type==163?102:Integer.parseInt(values[0]),Long.parseLong(values[type==163?0:1]));
                }
            }
        }
    }
    /** 引用缺失不能按无加成处理。 */
    private JsonNode row(String table,int id){var row=tables.get(table).get(id);if(row==null)throw new IllegalStateException("技能面板配置缺失："+table+":"+id);return row;}
}
