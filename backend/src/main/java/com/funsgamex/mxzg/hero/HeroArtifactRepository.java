/**
 * 圣器实例和已激活槽位的持久读写入口。
 * 圣器归角色、激活归英雄，交易写操作统一在角色锁内提交。
 */
package com.funsgamex.mxzg.hero;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class HeroArtifactRepository {
    /** 独立圣器保存模板与部位；未佩戴时英雄 ID 为 null。 */
    public record Item(String instanceId, int templateId, int slot, String heroId) {}
    /** 角色名册中已经实际激活的圣器格。 */
    public record ActivatedSlot(String heroId, int slot) {}

    /** 共用应用数据库连接，写入由业务事务触发。 */
    private final JdbcTemplate jdbc;
    /** 校验实例部位与已安装的圣器配置。 */
    private final HeroArtifactRules rules;

    /** 注入持久配置与实际角色数据库。 */
    public HeroArtifactRepository(JdbcTemplate jdbc, HeroArtifactRules rules) {
        this.jdbc = jdbc;
        this.rules = rules;
    }

    /** 读取角色全部装备实例及当前佩戴去向。 */
    public List<Item> list(String roleId) {
        return jdbc.query("""
                SELECT id, template_id, slot, hero_id FROM game_hero_artifact WHERE role_id=? ORDER BY id
                """, (row, index) -> {
                    var item = new Item(row.getString("id"), row.getInt("template_id"), row.getInt("slot"),
                            row.getString("hero_id"));
                    rules.requireSlotTemplate(item.templateId(), item.slot());
                    return item;
                }, roleId);
    }

    /** 读取已激活槽，卸下圣器不撤销同一英雄的激活记录。 */
    public List<ActivatedSlot> activated(String roleId) {
        return jdbc.query("""
                SELECT hero_id, slot FROM game_hero_artifact_slot WHERE role_id=? ORDER BY hero_id, slot
                """, (row, index) -> new ActivatedSlot(row.getString("hero_id"), row.getInt("slot")), roleId);
    }

    /** 本角色已戴圣器按所属英雄分组，供名册、四维和战斗共用。 */
    public Map<String, List<Item>> equipped(String roleId) {
        return list(roleId).stream().filter(item -> item.heroId() != null).collect(Collectors.groupingBy(Item::heroId));
    }

    /** 写入激活记录并返回立即佩戴的赠品。 */
    public Item activate(String roleId, String heroId, HeroArtifactRules.Slot slot) {
        jdbc.update("INSERT INTO game_hero_artifact_slot(role_id,hero_id,slot) VALUES (?,?,?)", roleId, heroId, slot.slot());
        return create(roleId, rules.requireSlotTemplate(slot.rewardTemplateId(), slot.slot()), heroId);
    }

    /** 新建一件真实实例，适用于激活和后续同源奖励；可暂不关联英雄。 */
    public Item create(String roleId, HeroArtifactRules.Definition template, String heroId) {
        var id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO game_hero_artifact(id,role_id,template_id,slot,hero_id) VALUES (?,?,?,?,?)",
                id, roleId, template.templateId(), template.slot(), heroId);
        return new Item(id, template.templateId(), template.slot(), heroId);
    }

    /** 将未佩戴装备写到目标英雄激活位置。 */
    public Item wear(String roleId, Item item, String heroId) {
        requireOne(jdbc.update("UPDATE game_hero_artifact SET hero_id=? WHERE role_id=? AND id=? AND hero_id IS NULL",
                heroId, roleId, item.instanceId()));
        return new Item(item.instanceId(), item.templateId(), item.slot(), heroId);
    }

    /** 解除原穿戴关系并返还原独立实例。 */
    public Item remove(String roleId, Item item) {
        requireOne(jdbc.update("UPDATE game_hero_artifact SET hero_id=NULL WHERE role_id=? AND id=? AND hero_id=?",
                roleId, item.instanceId(), item.heroId()));
        return new Item(item.instanceId(), item.templateId(), item.slot(), null);
    }

    /** 升级和完美转换只替换配置；原持久 ID 和槽位不变。 */
    public Item replaceTemplate(String roleId, Item item, int targetId) {
        rules.requireSlotTemplate(targetId, item.slot());
        requireOne(jdbc.update("UPDATE game_hero_artifact SET template_id=? WHERE role_id=? AND id=? AND template_id=?",
                targetId, roleId, item.instanceId(), item.templateId()));
        return new Item(item.instanceId(), targetId, item.slot(), item.heroId());
    }

    /** 消耗未佩戴的一件配方实例，事务失败时会完整恢复。 */
    public void consume(String roleId, Item item) {
        requireOne(jdbc.update("DELETE FROM game_hero_artifact WHERE role_id=? AND id=? AND hero_id IS NULL",
                roleId, item.instanceId()));
    }

    /** 清理已删除英雄的佩戴关系，保留同角色的圣器实例。 */
    public void releaseHero(String roleId, String heroId) {
        jdbc.update("UPDATE game_hero_artifact SET hero_id=NULL WHERE role_id=? AND hero_id=?", roleId, heroId);
    }

    /** 玩家资产更新只允许精确作用于已经校验的一行。 */
    private static void requireOne(int rows) {
        if (rows != 1) {
            throw new IllegalStateException("圣器持久状态在交易中发生变化");
        }
    }
}
