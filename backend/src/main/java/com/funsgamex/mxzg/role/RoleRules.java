/** 角色初始规则与等级经验门槛：直接读取旧策划表的共享导出，不引用英雄升级消耗。 */
package com.funsgamex.mxzg.role;
import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.*;
@Component
public class RoleRules {
    /** 按初始化键读取的非负数值，只存配置，不保存玩家状态。 */
    private final Map<String,Long> initial=new HashMap<>();
    /** 角色等级对应本级经验门槛；不是英雄等级表。 */
    private final Map<Integer,Long> thresholds=new HashMap<>();
    /** 角色最高等级，由 mainlevel 连续等级范围确定。 */
    private final int maxLevel;
    /** 旧规则以首抽英雄星级与类型 ID 拼接的初始形象。 */
    private final int imageId;
    /** 启动读取可信配置；缺键、重复或非整数直接报错，不默认为零。 */
    public RoleRules(ObjectMapper mapper) {
        for(var row:rows(mapper,"inituser")) {
            String key=row.path("key").asString();
            if(Set.of("level","exp","cup","gold","gem").contains(key) && initial.put(key,number(row,"value"))!=null)throw new IllegalStateException("重复角色初始化键");
        }
        for(String key:List.of("level","exp","cup","gold","gem"))initial(key);
        for(var row:rows(mapper,"mainlevel")) {
            int level=Math.toIntExact(number(row,"level"));long exp=number(row,"exp");
            if(level<1 || exp<1 || thresholds.put(level,exp)!=null)throw new IllegalStateException("角色等级表无效");
        }
        maxLevel=thresholds.size();
        for(int level=1;level<=maxLevel;level++)if(!thresholds.containsKey(level))throw new IllegalStateException("角色等级不连续");
        int level=Math.toIntExact(initial("level"));
        if(level<1 || level>maxLevel || (level<maxLevel && initial("exp")>=threshold(level)))throw new IllegalStateException("初始角色经验无效");
        Math.toIntExact(initial("cup"));
        long first=0;
        for(var row:rows(mapper,"system"))if(row.path("key").asString().equals("first_ordinary_lottery"))first=number(row,"value");
        int image=0;
        for(var row:rows(mapper,"herotype"))if(number(row,"type")==first)image=Integer.parseInt(number(row,"star")+""+first);
        if(first<=0 || image<=0)throw new IllegalStateException("初始角色形象配置缺失");
        imageId=image;
    }
    /** 返回指定初始属性；不存在即配置错误。 */
    public long initial(String key) {var value=initial.get(key);if(value==null)throw new IllegalStateException("角色初始化键缺失："+key);return value;}
    /** 读取当前角色等级门槛；最高级没有下一级，返回 0。 */
    public long threshold(int level) {var exp=thresholds.get(level);if(exp==null)throw new IllegalArgumentException("未知角色等级");return level==maxLevel?0:exp;}
    /** 返回由旧首抽配置计算的形象 ID，不创建英雄或开启抽卡。 */
    public int imageId(){return imageId;}
    /** 读取随构建打包的原始导出表，缺失或空表阻止启动。 */
    private static JsonNode rows(ObjectMapper mapper,String table) {
        try(var input=RoleRules.class.getResourceAsStream("/gameplay/"+table+".json")) {
            if(input==null)throw new IllegalStateException("角色配置缺失："+table);
            var rows=mapper.readTree(input).path("rows");if(!rows.isArray()||rows.isEmpty())throw new IllegalStateException("角色配置为空："+table);return rows;
        }catch(java.io.IOException error){throw new IllegalStateException("读取角色配置失败",error);}
    }
    /** 严格读取非负整数，避免配置文本被静默转换成零。 */
    private static long number(JsonNode row,String field) {var value=row.path(field);if(!value.isIntegralNumber()||!value.canConvertToLong()||value.asLong()<0)throw new IllegalStateException("角色数值无效："+field);return value.asLong();}
}
