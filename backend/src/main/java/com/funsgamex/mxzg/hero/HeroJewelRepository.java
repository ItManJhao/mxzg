/**
 * 保存角色各英雄的已镶嵌宝石。快照按角色批量读取，操作服务在角色锁事务内写入。
 * 已镶槽位和背包堆叠分别持久化，卸下归还库存由业务服务处理。
 */
package com.funsgamex.mxzg.hero;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HeroJewelRepository {
    /** 实例 ID 是当前镶嵌槽记录，模板 ID 和槽位是宝石配置。 */
    public record Item(String instanceId, int templateId, int slot) {}

    /** 保存及读取已镶嵌关系，普通库存由 InventoryService 持有。 */
    private final JdbcTemplate jdbc;

    /** 使用服务端统一持久化连接。 */
    public HeroJewelRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 一次读出角色全部镶嵌关系，按英雄实例 ID 分组并按槽位排序。 */
    public Map<String, List<Item>> byRole(String roleId) {
        var equipped = new HashMap<String, List<Item>>();
        jdbc.query("SELECT hero_id,id,template_id,slot FROM game_hero_jewel WHERE role_id=? ORDER BY hero_id,slot", row -> {
            equipped.computeIfAbsent(row.getString("hero_id"), key -> new ArrayList<>()).add(read(row, 0));
        }, roleId);
        equipped.replaceAll((heroId, items) -> List.copyOf(items));
        return Map.copyOf(equipped);
    }

    /** 查询一个英雄当前已镶嵌的宝石；空槽无持久记录。 */
    public List<Item> forHero(String roleId, String heroId) {
        return jdbc.query("SELECT id,template_id,slot FROM game_hero_jewel WHERE role_id=? AND hero_id=? ORDER BY slot",
            this::read, roleId, heroId);
    }

    /** 换装保留槽关系 ID，空槽首次镶嵌生成新关系。 */
    public void wear(String roleId, String heroId, int itemId, int slot, Item previous) {
        int changed;
        if (previous == null) {
            changed = jdbc.update("INSERT INTO game_hero_jewel(id,role_id,hero_id,slot,template_id) VALUES (?,?,?,?,?)",
                UUID.randomUUID().toString(), roleId, heroId, slot, itemId);
        } else {
            changed = jdbc.update("UPDATE game_hero_jewel SET template_id=? WHERE role_id=? AND hero_id=? AND id=? AND slot=?",
                itemId, roleId, heroId, previous.instanceId(), slot);
        }
        requireChanged(changed);
    }

    /** 仅删除同一角色、英雄及实例的镶嵌记录，调用者先归还宝石。 */
    public void remove(String roleId, String heroId, Item item) {
        requireChanged(jdbc.update("DELETE FROM game_hero_jewel WHERE role_id=? AND hero_id=? AND id=?",
            roleId, heroId, item.instanceId()));
    }

    /** 保留真实持久实例身份及配置槽位。 */
    private Item read(ResultSet row, int index) throws SQLException {
        return new Item(row.getString("id"), row.getInt("template_id"), row.getInt("slot"));
    }

    /** 异常影响行数表示事务前提被破坏，必须回滚库存和回执。 */
    private void requireChanged(int changed) {
        if (changed != 1) {
            throw new IllegalStateException("英雄宝石槽写入数量无效");
        }
    }
}
