/** 英雄面板属性：按旧装备/套装累加与万分比规则计算；未恢复来源明确列出，不冒充完整旧服属性。 */
package com.funsgamex.mxzg.hero;
import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.*;
@Component
public class HeroPanelRules {
    /** 四属性使用长整数；不同于基础成长，已包含本批恢复的装备与套装。 */
    public record Values(long hp,long atk,long def,long spd) {}
    /** 可追踪的服务端计算结果；pendingSources 非空时不得标记完整属性。 */
    public record State(Values values,List<String> includedSources,List<String> pendingSources,boolean complete) {}
    /** 同源装备配置。 */
    private final Map<Integer,JsonNode> equipment=new HashMap<>();
    /** 同源套装阈值，满足多个阈值时全部累加。 */
    private final List<JsonNode> sets=new ArrayList<>();
    /** 原始 JSON 属性列的严格解析器。 */
    private final ObjectMapper mapper;
    /** 加载旧同源配置，缺失直接拒绝启动。 */
    public HeroPanelRules(ObjectMapper mapper){
        this.mapper=mapper;
        for(var row:rows("equipmenttype"))if(equipment.put(row.path("equipment_type").asInt(),row)!=null)throw new IllegalStateException("重复装备配置");
        rows("equipmentsettype").forEach(sets::add);
    }
    /** 计算当前已恢复来源；不保存派生值，不增加任何养成写入口。 */
    public State calculate(HeroGrowthRules.Stats base,HeroEquipmentRepository.State worn){var result=calculate(base,worn,add->{});var pending=new ArrayList<>(result.pendingSources());pending.add(0,"skill_panel");return new State(result.values(),List.of("base","equipment","equipment_set"),List.copyOf(pending),false); }
    /** 合并技能贡献后统一取整，成长率仅作用于原基础属性。 */
    public State calculate(HeroGrowthRules.Stats base,HeroEquipmentRepository.State worn,java.util.function.Consumer<java.util.function.BiConsumer<Integer,Long>> skills){
        Map<Integer,Long> attrs=new HashMap<>();
        attrs.put(223,(long)base.hp());attrs.put(220,(long)base.atk());attrs.put(224,(long)base.def());attrs.put(101,(long)base.spd());
        Map<Integer,Integer> counts=new HashMap<>();
        for(var item:worn.items()){
            var row=equipment.get(item.templateId());if(row==null||row.path("place").asInt()!=item.slot())throw new IllegalStateException("穿戴配置无效");
            add(attrs,row.path("ability").asString());int set=row.path("set_type").asInt();if(set!=0)counts.merge(set,1,Integer::sum);
        }
        for(var row:sets)if(counts.getOrDefault(Integer.parseInt(row.path("type").asString()),0)>=row.path("num").asInt())add(attrs,row.path("attr").asString());
        skills.accept((type,value)->{attrs.merge(type,value,Math::addExact);if(type==120){int[] keys={223,220,224,101};long[] original={base.hp(),base.atk(),base.def(),base.spd()};for(int i=0;i<keys.length;i++)attrs.merge(keys[i],(long)(original[i]*(value/10000D)),Math::addExact);}});
        var values=new Values(scaleHp(attrs.getOrDefault(223,0L),attrs.getOrDefault(102,0L)),scale(attrs.getOrDefault(220,0L),attrs.getOrDefault(201,0L)),scale(attrs.getOrDefault(224,0L),attrs.getOrDefault(202,0L)),scale(attrs.getOrDefault(101,0L),attrs.getOrDefault(204,0L)));
        return new State(values,List.of("base","equipment","equipment_set","skill_panel"),List.of("soul_skill","talent","runes","awakening","account_and_other_hero_sources"),false);
    }
    /** 旧 initMaxHp 直接使用生命百分比，不套用攻防速 getRate 的50000上限。 */
    private long scaleHp(long value,long rate){double result=value*(1+rate/10000D);if(!Double.isFinite(result)||result<=0||result>9007199254740991D)throw new IllegalStateException("生命面板越界");return (long)result;}
    /** 沿旧 AttributeInfo.getRate 的百分比上限与 double 后向零截断顺序；拒绝前端不安全整数。 */
    private long scale(long value,long rate){double result=value*(1+Math.min(rate,50000)/10000D);if(!Double.isFinite(result)||result<=0||result>9007199254740991D)throw new IllegalStateException("面板属性越界");return (long)result;}
    /** 合并旧属性 JSON 数组；同类型相加，非面板属性保留参与累加但不伪造额外展示。 */
    private void add(Map<Integer,Long> attrs,String text){
        var rows=mapper.readTree(text);if(!rows.isArray())throw new IllegalStateException("装备属性不是数组");
        for(var row:rows){if(!row.isObject())throw new IllegalStateException("装备属性不是对象");for(var key:row.propertyNames()){var value=row.path(key);if(!value.isIntegralNumber()||!value.canConvertToLong())throw new IllegalStateException("装备属性值无效");attrs.merge(Integer.parseInt(key),value.asLong(),Math::addExact);}}
    }
    /** 读取构建时打包的共享表。 */
    private JsonNode rows(String table){try(var input=getClass().getResourceAsStream("/gameplay/"+table+".json")){if(input==null)throw new IllegalStateException("面板配置缺失："+table);var rows=mapper.readTree(input).path("rows");if(!rows.isArray()||rows.isEmpty())throw new IllegalStateException("面板配置为空");return rows;}catch(java.io.IOException error){throw new IllegalStateException("面板配置读取失败",error);}}
}
