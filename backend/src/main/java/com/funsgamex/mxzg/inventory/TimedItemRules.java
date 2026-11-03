/** 期限道具可信配置：从原策划表的共享导出读取效果类型和天数，调用者不能自行指定期限。 */
package com.funsgamex.mxzg.inventory;
import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
@Component
public class TimedItemRules {
    /** itemId 为配置 ID，effectType 为旧期限效果类型，validDays 为自然日天数。 */
    public record Rule(int itemId,int effectType,int validDays) {}
    /** 启动时建立的只读配置索引，不存任何玩家数据。 */
    private final Map<Integer,Rule> rules;
    /** 读取构建时打包的同源 JSON，缺失、重复或非法字段直接阻止启动。 */
    public TimedItemRules(ObjectMapper mapper) {
        try(var input=TimedItemRules.class.getResourceAsStream("/gameplay/timelimititem.json")) {
            if(input==null) throw new IllegalStateException("期限配置缺失");
            var root=mapper.readTree(input);var rows=root.path("rows");
            if(!rows.isArray() || rows.isEmpty()) throw new IllegalStateException("期限配置为空");
            var index=new HashMap<Integer,Rule>();
            for(var row:rows) {
                for(String key:List.of("item_id","type","valid_time")) if(!row.path(key).isIntegralNumber() || !row.path(key).canConvertToInt()) throw new IllegalStateException("期限字段无效："+key);
                var rule=new Rule(row.path("item_id").asInt(),row.path("type").asInt(),row.path("valid_time").asInt());
                if(rule.itemId()<=0 || rule.effectType()<0 || rule.validDays()<=0 || index.put(rule.itemId(),rule)!=null) throw new IllegalStateException("期限配置无效或重复");
            }
            rules=Map.copyOf(index);
        } catch(java.io.IOException failure) {throw new IllegalStateException("期限配置读取失败",failure);}
    }
    /** 返回明确的期限规则，未知道具拒绝发放，不能兜底为任意天数。 */
    public Rule require(int itemId) {
        var rule=rules.get(itemId);if(rule==null)throw new IllegalArgumentException("未知期限道具："+itemId);return rule;
    }
}
