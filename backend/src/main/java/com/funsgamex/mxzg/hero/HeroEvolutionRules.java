/**
 * 进化只读规则基础：按英雄配置、进化分支和等级解析当前总属性及技能覆盖。
 * 供后续持久快照和战斗构建共用；本类不保存玩家状态、不执行进化或战斗。
 */
package com.funsgamex.mxzg.hero;

import java.util.*;
import tools.jackson.databind.*;

public final class HeroEvolutionRules {
    /** 技能类型 ID 和等级；skillId 不是 heroskill.idx。 */
    public record Skill(int skillId, int level) {}
    /** 当前等级的总加成，保留全部属性编号，不能仅截取攻血防速。 */
    public record Definition(Map<Integer,Long> attributes, int oldSkillId, Skill skill) {
        /** 拷贝属性防止调用者修改共享配置；空技能代表未进化。 */
        public Definition { attributes=Map.copyOf(attributes); }
    }
    /** 英雄配置/分支/等级的精确索引；不跨英雄回退。 */
    private final Map<String,Definition> definitions=new HashMap<>();

    /** 加载同源导出表，校验每条进化技能引用与当前同类型替换边界。 */
    public HeroEvolutionRules(ObjectMapper mapper) {
        Set<String> knownSkills=new HashSet<>();
        for(var row:rows(mapper,"heroskill")) knownSkills.add(row.path("type").asInt()+":"+row.path("level").asInt());
        for(var row:rows(mapper,"heroevolvelevel")) {
            int hero=positive(row,"hero_type"),type=positive(row,"evolve_type"),level=positive(row,"level");
            int old=positive(row,"skill_old_id"),id=positive(row,"skill_id"),skillLevel=positive(row,"skill_level");
            // 当前174行均为同类型升级；不同类型涉及旧删除逻辑歧义，必须重新核查，不能猜测。
            if(old!=id || !knownSkills.contains(id+":"+skillLevel)) throw new IllegalStateException("进化技能引用或替换规则未核实");
            Map<Integer,Long> attributes=new LinkedHashMap<>();
            var values=mapper.readTree(row.path("attr").asText());
            if(!values.isArray() || values.isEmpty()) throw new IllegalStateException("进化总属性缺失");
            for(var value:values) {
                if(!value.isObject() || value.size()!=1) throw new IllegalStateException("进化属性结构无效");
                for(var property:value.properties()) {
                    int attribute=Integer.parseInt(property.getKey());
                    var amount=property.getValue();
                    if(attribute<=0 || !amount.isIntegralNumber() || !amount.canConvertToLong()) throw new IllegalStateException("进化属性值无效");
                    attributes.merge(attribute,amount.asLong(),Math::addExact);
                }
            }
            if(definitions.put(key(hero,type,level),new Definition(attributes,old,new Skill(id,skillLevel)))!=null) throw new IllegalStateException("进化配置重复");
        }
    }

    /** 0/0明确未进化；部分零值、负值或不存在的英雄/分支/等级直接拒绝。 */
    public Definition resolve(int heroId,int type,int level) {
        if(heroId<=0 || type<0 || level<0 || (type==0)!=(level==0)) throw new IllegalArgumentException("进化状态无效");
        if(type==0) return new Definition(Map.of(),0,null);
        var value=definitions.get(key(heroId,type,level));
        if(value==null) throw new IllegalArgumentException("进化配置不存在");
        return value;
    }

    /** 沿旧SkillInfo.addSkill保留同类型的较高等级；不修改其他技能或重新执行面板被动。 */
    public List<Skill> applySkills(List<Skill> original,Definition evolution) {
        var result=new ArrayList<Skill>();
        Set<Integer> ids=new HashSet<>();
        for(var skill:original) {
            if(skill.skillId()<=0 || skill.level()<0 || !ids.add(skill.skillId())) throw new IllegalArgumentException("基础技能无效或重复");
            result.add(skill);
        }
        var replacement=evolution.skill();
        if(replacement==null) return List.copyOf(result);
        for(int index=0;index<result.size();index++) {
            var previous=result.get(index);
            if(previous.skillId()==replacement.skillId()) {
                if(replacement.level()>previous.level()) result.set(index,replacement);
                return List.copyOf(result);
            }
        }
        // 旧接收器在技能原来不存在时同样添加，不额外套前端解锁条件。
        result.add(replacement);
        return List.copyOf(result);
    }

    /** 组成只用于配置索引的复合键，不作为玩家实例身份。 */
    private static String key(int hero,int type,int level) { return hero+":"+type+":"+level; }
    /** 必需正整数配置缺失时停止，避免默认零值掩盖损坏。 */
    private static int positive(JsonNode row,String name) {
        var value=row.path(name);
        if(!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt()<=0) throw new IllegalStateException("进化配置字段无效："+name);
        return value.asInt();
    }
    /** 读取构建时的共享配置；文件缺失或空表不允许静默启动规则。 */
    private JsonNode rows(ObjectMapper mapper,String name) {
        try(var input=getClass().getResourceAsStream("/gameplay/"+name+".json")) {
            if(input==null) throw new IllegalStateException("进化规则表缺失："+name);
            var value=mapper.readTree(input).path("rows");
            if(!value.isArray() || value.isEmpty()) throw new IllegalStateException("进化规则表为空："+name);
            return value;
        } catch(java.io.IOException error) { throw new IllegalStateException("进化规则读取失败",error); }
    }
}
