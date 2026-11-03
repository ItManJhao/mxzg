/** 英雄名册容量只读入口：持久基础容量（含已购扩容）加旧 VIP 表加成，不开放购买或 VIP 修改。 */
package com.funsgamex.mxzg.hero;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.*;
@Service
public class HeroCapacityService {
    /** 服务端总容量与已购次数；客户端不能重复加 VIP。 */
    public record State(int capacity,int buySpaceTimes) {}
    /** 唯一数据库入口；读取时由快照调用者持有角色锁。 */
    private final JdbcTemplate jdbc;
    /** VIP 等级到额外格数的只读配置，不保存玩家状态。 */
    private final Map<Integer,Integer> vipSpaces=new HashMap<>();
    /** 当前旧配置的初始容量，新角色创建时写入持久字段。 */
    private final int initial;
    /** 从共享配置加载初始容量和 VIP 加成；缺失或重复拒绝启动。 */
    public HeroCapacityService(JdbcTemplate jdbc,ObjectMapper mapper) {
        this.jdbc=jdbc;int value=-1;
        for(var row:rows(mapper,"system"))if(row.path("key").asString().equals("hero_space_initial")) {
            if(value!=-1)throw new IllegalStateException("英雄初始容量重复");value=number(row,"value");
        }
        if(value<=0)throw new IllegalStateException("英雄初始容量缺失");initial=value;
        for(var row:rows(mapper,"goddessvip"))if(vipSpaces.put(number(row,"vip_level"),number(row,"extra_bag_space"))!=null)throw new IllegalStateException("VIP 容量重复");
        if(!vipSpaces.containsKey(0))throw new IllegalStateException("VIP 零级配置缺失");
    }
    /** 返回旧配置初值，供新角色创建持久容量。 */
    public int initial(){return initial;}
    /** 返回本角色总容量与次数；VIP 为零时按旧规则不加成，未知等级拒绝猜测。 */
    public State current(String roleId) {
        return jdbc.queryForObject("SELECT hero_capacity,hero_capacity_buys,goddess_vip FROM game_role WHERE id=?",(row,index)->{
            int vip=row.getInt("goddess_vip");Integer extra=vipSpaces.get(vip);
            if(extra==null)throw new IllegalStateException("未知 VIP 容量等级");
            return new State(Math.addExact(row.getInt("hero_capacity"),vip>0?extra:0),row.getInt("hero_capacity_buys"));
        },roleId);
    }
    /** 读取构建时打包的同源策划表，缺表或空表直接失败。 */
    private static JsonNode rows(ObjectMapper mapper,String table) {
        try(var input=HeroCapacityService.class.getResourceAsStream("/gameplay/"+table+".json")) {
            if(input==null)throw new IllegalStateException("英雄容量配置缺失："+table);
            var rows=mapper.readTree(input).path("rows");if(!rows.isArray()||rows.isEmpty())throw new IllegalStateException("容量表为空");return rows;
        }catch(java.io.IOException error){throw new IllegalStateException("容量配置读取失败",error);}
    }
    /** 严格读取非负整数，拒绝字符串与溢出。 */
    private static int number(JsonNode row,String key){var value=row.path(key);if(!value.isIntegralNumber()||!value.canConvertToInt()||value.asInt()<0)throw new IllegalStateException("容量数值无效："+key);return value.asInt();}
}
