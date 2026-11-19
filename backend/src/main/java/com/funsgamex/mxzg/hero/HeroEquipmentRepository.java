/**
 * 普通装备槽位的持久入口。快照只读当前穿戴，卸下后的槽位继续持有原标识和附魂等级。
 * 关系修改由 HeroEquipmentService 在角色锁内协调，背包数量由 InventoryService 持有。
 */
package com.funsgamex.mxzg.hero;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HeroEquipmentRepository {
    /** 实例 ID、配置 ID、槽位和附魂等级，均来自持久记录。 */
    public record Item(String instanceId, int templateId, int slot, int soulLevel, HeroSoulRules.Skill soulSkill) {
        /** 独立规则夹具可仅提供持久四字段，生效技能由读取入口计算。 */
        public Item(String instanceId, int templateId, int slot, int soulLevel) {
            this(instanceId, templateId, slot, soulLevel, null);
        }
    }

    /** 显式同步包装，空列表表示确实未穿戴，缺包装表示旧端未同步。 */
    public record State(List<Item> items) {}

    /** 当前英雄的持久槽位。空槽保留原记录，以便重新穿上时继承同一附魂等级。 */
    public record Slot(String instanceId, int templateId, int slot, boolean equipped) {}

    /** 装备关系写读入口，持久化与库存使用同一事务。 */
    private final JdbcTemplate jdbc;
    /** 附魂生效判定共用旧配置，读取不触发养成操作。 */
    private final HeroSoulRules soulRules;
    /** 校验槽位使用同一普通装备配置，背包和英雄不保存副本。 */
    private final HeroEquipmentRules rules;

    /** 注入装备配置与关系入口，实例之间不共享玩家状态。 */
    public HeroEquipmentRepository(JdbcTemplate jdbc, HeroSoulRules soulRules, HeroEquipmentRules rules) {
        this.jdbc = jdbc;
        this.soulRules = soulRules;
        this.rules = rules;
    }

    /** 一次读取本角色全部已穿戴关系并按英雄分组，避免逐英雄补查。 */
    public Map<String, State> equipped(String roleId) {
        Map<String, List<Item>> groups = new HashMap<>();
        jdbc.query("SELECT e.*,h.star AS hero_star FROM game_equipment e "
                + "JOIN game_hero h ON h.id=e.hero_id AND h.role_id=e.role_id "
                + "WHERE e.role_id=? AND e.equipped=TRUE ORDER BY e.hero_id,e.slot", row -> {
            int template = row.getInt("template_id");
            int slot = row.getInt("slot");
            int soulLevel = row.getInt("soul_level");
            rules.require(template, slot);
            var soul = soulRules.resolve(row.getInt("hero_star"), template, slot, soulLevel);
            groups.computeIfAbsent(row.getString("hero_id"), key -> new ArrayList<>())
                    .add(new Item(row.getString("id"), template, slot, soulLevel, soul));
        }, roleId);
        Map<String, State> result = new HashMap<>();
        groups.forEach((id, items) -> result.put(id, new State(List.copyOf(items))));
        return Map.copyOf(result);
    }

    /** 在角色锁内读取当前英雄的槽位记录，包含已经卸下但保留历史的空槽。 */
    public List<Slot> slots(String roleId, String heroId) {
        return jdbc.query("SELECT id,template_id,slot,equipped FROM game_equipment "
                + "WHERE role_id=? AND hero_id=? ORDER BY slot", (row, index) -> {
            int template = row.getInt("template_id");
            int slot = row.getInt("slot");
            rules.require(template, slot);
            return new Slot(row.getString("id"), template, slot, row.getBoolean("equipped"));
        }, roleId, heroId);
    }

    /** 穿戴到规则给出的槽位，换装更新原记录并保留附魂，首次穿戴建立槽位 ID。 */
    public void wear(String roleId, String heroId, HeroEquipmentRules.Definition definition, Slot previous) {
        int written;
        if (previous == null) {
            written = jdbc.update("INSERT INTO game_equipment(id,role_id,hero_id,template_id,slot) VALUES (?,?,?,?,?)",
                    UUID.randomUUID().toString(), roleId, heroId, definition.templateId(), definition.slot());
        } else {
            written = jdbc.update("UPDATE game_equipment SET template_id=?,equipped=TRUE "
                            + "WHERE role_id=? AND hero_id=? AND id=? AND slot=?",
                    definition.templateId(), roleId, heroId, previous.instanceId(), definition.slot());
        }
        requireWrite(written);
    }

    /** 卸下当前持有的装备，原槽位和附魂等级继续留在英雄名下。 */
    public void remove(String roleId, String heroId, Slot slot) {
        requireWrite(jdbc.update("UPDATE game_equipment SET equipped=FALSE "
                        + "WHERE role_id=? AND hero_id=? AND id=? AND template_id=? AND equipped=TRUE",
                roleId, heroId, slot.instanceId(), slot.templateId()));
    }

    /** 角色锁内写入行数必须是 1，否则回滚整笔穿脱和库存变动。 */
    private static void requireWrite(int written) {
        if (written != 1) {
            throw new IllegalStateException("英雄装备槽位写入异常");
        }
    }
}
