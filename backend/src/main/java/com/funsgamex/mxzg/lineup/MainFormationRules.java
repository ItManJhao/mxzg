/**
 * 原版主线阵容规则：精确读取battlematrix，不使用已过期的formation表。
 * 解析永久解锁候选、助战门槛和保存顺序；纯规则不写数据库、不开放阵容协议。
 */
package com.funsgamex.mxzg.lineup;
import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.*;
@Component
public final class MainFormationRules {
    /** 从持久英雄投影提供的规则输入；元素由服务端模板查表，不接收客户端指定。 */
    public record Hero(String id,int templateId,int level,int star) {}
    /** 已解锁阵型与助战状态；调用方必须持久保存，不能按当前英雄数量反向锁定。 */
    public record Unlocks(Set<Integer> formations,boolean assistance) {
        /** 防止调用者篡改已核验结果。 */
        public Unlocks { formations=Set.copyOf(formations); }
    }
    /** 站位是否开放及原始加成编号，后续战斗按自身时序使用。 */
    public record Position(boolean open,Map<Integer,Long> attributes) {
        /** 保留减伤、暴击等全部编号，不折算为四维展示值。 */
        public Position { attributes=Map.copyOf(attributes); }
    }
    /** 英雄模板到元素，供阵型解锁条件匹配。 */
    private final Map<Integer,Integer> elements=new HashMap<>();
    /** 阵型解锁条件，以真实阵型ID索引。 */
    private final Map<Integer,JsonNode> conditions=new HashMap<>();
    /** 阵型ID到位置配置；禁用格也保留，区分禁用与未知位置。 */
    private final Map<Integer,Map<Integer,Position>> positions=new HashMap<>();
    /** 主线battleformation索引0规定的最低英雄等级。 */
    private final int minimumLevel;
    /** 助战需达到的英雄星级与实例数量，不按模板去重统计。 */
    private final int assistanceStar,assistanceCount;
    /** 读取同源规则和引用，关键表/字段损坏时停止而不采用默认门槛。 */
    public MainFormationRules(ObjectMapper mapper){
        for(var row:rows(mapper,"herotype"))elements.put(row.path("type").asInt(),row.path("elem").asInt());
        for(var row:rows(mapper,"battlematrix")){
            var condition=mapper.readTree(row.path("unlockCondition").asText());
            if(!condition.path("type").isArray()||condition.path("star").asInt()<=0||condition.path("target").asInt()<=0||conditions.put(row.path("idx").asInt(),condition)!=null)throw new IllegalStateException("阵型解锁配置无效");
        }
        for(var row:rows(mapper,"battlematrixaddition")){
            int type=row.path("type").asInt(),position=row.path("position").asInt(),open=row.path("is_open").asInt(-1);
            if(!conditions.containsKey(type)||position<=0||(open!=0&&open!=1))throw new IllegalStateException("阵型站位配置无效");
            var attrs=new HashMap<Integer,Long>();
            var ability=mapper.readTree(row.path("ability").asText());
            if(!ability.isArray())throw new IllegalStateException("站位加成无效");
            for(var item:ability)for(var property:item.properties()){
                if(!property.getValue().isIntegralNumber()||!property.getValue().canConvertToLong())throw new IllegalStateException("站位属性值无效");
                attrs.merge(Integer.parseInt(property.getKey()),property.getValue().asLong(),Math::addExact);
            }
            if(positions.computeIfAbsent(type,key->new HashMap<>()).put(position,new Position(open==1,attrs))!=null)throw new IllegalStateException("站位重复");
        }
        if(!positions.keySet().equals(conditions.keySet())||!conditions.containsKey(1))throw new IllegalStateException("阵型与站位表不匹配");
        int minimum=0,star=0,count=0;
        for(var row:rows(mapper,"battleformation"))if(row.path("idx").asInt()==0)minimum=row.path("hero_need_level").asInt();
        for(var row:rows(mapper,"system")){
            if(row.path("key").asText().equals("assistance_unlock_hero_star"))star=row.path("value").asInt();
            if(row.path("key").asText().equals("assistance_unlock_hero_num"))count=row.path("value").asInt();
        }
        if(minimum<=0||star<=0||count<=0)throw new IllegalStateException("主线或助战门槛缺失");
        minimumLevel=minimum;assistanceStar=star;assistanceCount=count;
    }
    /** 在历史解锁集合上只增加；基础阵型1无条件保留，助战一旦解锁不回退。 */
    public Unlocks unlock(Unlocks previous,List<Hero> heroes){
        validateHeroes(heroes);var unlocked=new HashSet<>(previous.formations());
        if(!conditions.keySet().containsAll(unlocked))throw new IllegalArgumentException("未知已解锁阵型");
        unlocked.add(1);
        for(var entry:conditions.entrySet()){
            var condition=entry.getValue();Set<Integer> allowed=new HashSet<>();condition.path("type").forEach(value->allowed.add(value.asInt()));
            long count=heroes.stream().filter(hero->hero.star()>=condition.path("star").asInt()&&allowed.contains(elements.get(hero.templateId()))).count();
            if(count>=condition.path("target").asInt())unlocked.add(entry.getKey());
        }
        boolean assistance=previous.assistance()||heroes.stream().filter(hero->hero.star()>=assistanceStar).count()>=assistanceCount;
        return new Unlocks(unlocked,assistance);
    }
    /** 沿旧保存顺序过滤关闭位、未开放助战、非所属实例、同模板；重复已接纳站位或等级不足拒绝整次输入。 */
    public List<Lineup.Slot> normalize(int formation,Unlocks unlocks,List<Hero> owned,List<Lineup.Slot> requested){
        validateHeroes(owned);if(!positions.containsKey(formation)||!unlocks.formations().contains(formation))throw new IllegalArgumentException("阵型无效或未解锁");
        Map<String,Hero> heroes=new HashMap<>();owned.forEach(hero->heroes.put(hero.id(),hero));
        Set<Integer> usedPositions=new HashSet<>(),templates=new HashSet<>();var result=new ArrayList<Lineup.Slot>();
        for(var slot:requested){
            if(slot==null||slot.position()==null||slot.heroId()==null)throw new IllegalArgumentException("阵容输入缺失");
            var position=positions.get(formation).get(slot.position());
            if(position==null)throw new IllegalArgumentException("阵型不支持该位置");
            if(!position.open())continue;
            if(usedPositions.contains(slot.position()))throw new IllegalArgumentException("上阵位置重复");
            if(slot.position()==9&&!unlocks.assistance())continue;
            var hero=heroes.get(slot.heroId());if(hero==null||templates.contains(hero.templateId()))continue;
            if(hero.level()<minimumLevel)throw new IllegalArgumentException("英雄等级不足");
            templates.add(hero.templateId());usedPositions.add(slot.position());result.add(slot);
        }
        return List.copyOf(result);
    }
    /** 查询真实站位加成；不存在的阵型/位置拒绝，不猜测零加成。 */
    public Position position(int formation,int position){
        var value=positions.getOrDefault(formation,Map.of()).get(position);if(value==null)throw new IllegalArgumentException("未知站位");return value;
    }
    /** 持久名册必须有唯一实例与有效模板、星级；等级0保留给保存规则明确拒绝。 */
    private void validateHeroes(List<Hero> heroes){
        Set<String> ids=new HashSet<>();for(var hero:heroes)if(hero==null||hero.id()==null||hero.id().isBlank()||!ids.add(hero.id())||!elements.containsKey(hero.templateId())||hero.level()<0||hero.star()<=0)throw new IllegalArgumentException("持久英雄资料无效");
    }
    /** 从构建资源读取共享配置，不访问玩家库。 */
    private JsonNode rows(ObjectMapper mapper,String name){
        try(var input=getClass().getResourceAsStream("/gameplay/"+name+".json")){
            if(input==null)throw new IllegalStateException("阵容配置缺失："+name);
            var rows=mapper.readTree(input).path("rows");if(!rows.isArray()||rows.isEmpty())throw new IllegalStateException("阵容配置为空："+name);return rows;
        }catch(java.io.IOException error){throw new IllegalStateException("阵容配置读取失败",error);}
    }
}
