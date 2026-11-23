/**
 * 神装独立实例及穿戴状态的数据库入口。
 * 变更只能从持有当前角色锁的事务调用。快照属性由原表和已持久化的词条计算。
 */
package com.funsgamex.mxzg.hero;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GodEquipmentRepository {
    /** 按生成顺序持久化的随机属性编号与等级。 */
    public record Modifier(int type, int level) {}
    /** 真实神装实例。heroId 为空表示未穿戴，属性包含该件基础值和随机词条。 */
    public record Item(String instanceId, int templateId, int slot, String heroId, List<Modifier> modifiers,
                       List<GodEquipmentRules.Attribute> attributes, int star, int quality) {}
    /** 一次 SQL 查询聚合的原始行，相同实例共用词条容器。 */
    private record Entry(String instanceId, int templateId, int slot, String heroId, List<Modifier> modifiers) {}

    /** 角色和装备关系均从同一持久库读取。 */
    private final JdbcTemplate jdbc;
    /** 实例属性和值来自同源配置，数据库只储存持久身份与词条。 */
    private final GodEquipmentRules rules;

    /** 使用共享连接和真实装备规则。 */
    public GodEquipmentRepository(JdbcTemplate jdbc, GodEquipmentRules rules) {
        this.jdbc = jdbc;
        this.rules = rules;
    }

    /** 返回本角色全部实例含穿戴状态，按实例和属性槽稳定读取。 */
    public List<Item> list(String roleId) {
        var entries = jdbc.query("""
                SELECT e.id,e.template_id,e.slot,e.hero_id,m.position,m.attribute_type,m.attribute_level
                FROM game_god_equipment e LEFT JOIN game_god_equipment_modifier m ON m.equipment_id=e.id
                WHERE e.role_id=? ORDER BY e.id,m.position
                """, rows -> {
            var items = new LinkedHashMap<String, Entry>();
            while (rows.next()) {
                String id = rows.getString("id");
                var entry = items.get(id);
                if (entry == null) {
                    entry = new Entry(id, rows.getInt("template_id"), rows.getInt("slot"),
                            rows.getString("hero_id"), new ArrayList<>());
                    items.put(id, entry);
                }
                int position = rows.getInt("position");
                if (!rows.wasNull()) {
                    if (position != entry.modifiers().size() + 1) {
                        throw new IllegalStateException("神装持久词条位置不连续：" + entry.instanceId());
                    }
                    entry.modifiers().add(new Modifier(rows.getInt("attribute_type"), rows.getInt("attribute_level")));
                }
            }
            return List.copyOf(items.values());
        }, roleId);
        return entries.stream().map(this::project).toList();
    }

    /** 为面板、战力和战斗只提供各英雄已穿戴的神装实例。 */
    public Map<String, List<Item>> equipped(String roleId) {
        return list(roleId).stream().filter(item -> item.heroId() != null)
                .collect(Collectors.groupingBy(Item::heroId));
    }

    /** 将一个未绑定的神装按服务端规则入库，调用者负责版本及事务。 */
    public String create(String roleId, GodEquipmentRules.Definition definition, List<Modifier> modifiers) {
        rules.itemAttributes(definition, modifiers);
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_god_equipment(id,role_id,template_id,slot) VALUES (?,?,?,?)",
                id, roleId, definition.templateId(), definition.slot());
        for (int index = 0; index < modifiers.size(); index++) {
            var modifier = modifiers.get(index);
            jdbc.update("""
                    INSERT INTO game_god_equipment_modifier(equipment_id,position,attribute_type,attribute_level)
                    VALUES (?,?,?,?)
                    """, id, index + 1, modifier.type(), modifier.level());
        }
        return id;
    }

    /** 同一角色锁事务中将背包已有实例装入指定英雄。 */
    public void wear(String roleId, String instanceId, String heroId) {
        if (jdbc.update("UPDATE game_god_equipment SET hero_id=? WHERE role_id=? AND id=? AND hero_id IS NULL",
                heroId, roleId, instanceId) != 1) {
            throw new IllegalStateException("神装背包状态已变化");
        }
    }

    /** 清除当前实例的原穿戴关系，装备与随机词条保留。 */
    public void remove(String roleId, String instanceId, String heroId) {
        if (jdbc.update("UPDATE game_god_equipment SET hero_id=NULL WHERE role_id=? AND id=? AND hero_id=?",
                roleId, instanceId, heroId) != 1) {
            throw new IllegalStateException("神装穿戴关联已变化");
        }
    }

    /** 英雄被合法消耗前返还其所有神装，仍由原角色持有。 */
    public void releaseHero(String roleId, String heroId) {
        jdbc.update("UPDATE game_god_equipment SET hero_id=NULL WHERE role_id=? AND hero_id=?", roleId, heroId);
    }

    /** 服务端保留真实实例并校验部位与配置对应。 */
    private Item project(Entry entry) {
        var definition = rules.require(entry.templateId());
        if (entry.slot() != definition.slot()) {
            throw new IllegalStateException("神装实例部位与配置不符：" + entry.instanceId());
        }
        return new Item(entry.instanceId(), entry.templateId(), entry.slot(), entry.heroId(),
                List.copyOf(entry.modifiers()), rules.itemAttributes(definition, entry.modifiers()), definition.star(),
                definition.quality());
    }
}
