/** 普通装备持久只读入口；统一快照持有角色锁，不提供穿脱或发放业务。 */
package com.funsgamex.mxzg.hero;
import java.util.*;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;
@Repository
public class HeroEquipmentRepository {
    /** 实例 ID、配置 ID、槽位和附魂等级，均来自持久记录。 */
    public record Item(String instanceId, int templateId, int slot, int soulLevel) {}
    /** 显式同步包装；空列表表示确实未穿戴，缺包装表示旧端未同步。 */
    public record State(List<Item> items) {}
    /** 唯一持久读取入口。 */
    private final JdbcTemplate jdbc;
    /** 同源装备配置的槽位约束，玩家状态不存于此。 */
    private final Map<Integer,Integer> slots = new HashMap<>();
    /** 加载同源表，拒绝未知或重复配置，不猜测装备位置。 */
    public HeroEquipmentRepository(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc=jdbc;
        try(var input=getClass().getResourceAsStream("/gameplay/equipmenttype.json")) {
            if(input==null)throw new IllegalStateException("装备配置缺失");
            for(var row:mapper.readTree(input).path("rows")) {
                int id=row.path("equipment_type").asInt(), slot=row.path("place").asInt();
                if(id<=0||slot<1||slot>4||slots.put(id,slot)!=null)throw new IllegalStateException("装备配置无效");
            }
            if(slots.isEmpty())throw new IllegalStateException("装备表为空");
        }catch(java.io.IOException error){throw new IllegalStateException("装备配置读取失败",error);}
    }
    /** 一次读取本角色全部穿戴关系并按英雄分组，避免逐英雄补查。 */
    public Map<String,State> equipped(String roleId) {
        Map<String,List<Item>> groups=new HashMap<>();
        jdbc.query("SELECT * FROM game_equipment WHERE role_id=? AND hero_id IS NOT NULL ORDER BY hero_id,slot", row->{
            int template=row.getInt("template_id"),slot=row.getInt("slot");
            if(!Objects.equals(slots.get(template),slot))throw new IllegalStateException("持久装备槽位与配置不符");
            groups.computeIfAbsent(row.getString("hero_id"),key->new ArrayList<>()).add(new Item(row.getString("id"),template,slot,row.getInt("soul_level")));
        },roleId);
        Map<String,State> result=new HashMap<>();groups.forEach((id,items)->result.put(id,new State(List.copyOf(items))));
        return Map.copyOf(result);
    }
}
