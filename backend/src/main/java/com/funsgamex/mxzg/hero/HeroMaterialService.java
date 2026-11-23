/**
 * 多种消耗英雄的培养业务共用的卸装和删除步骤。
 * 配方与费用由调用者决定，角色锁、材料校验和事务由外层操作持有。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.inventory.InventoryService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class HeroMaterialService {
    /** 普通装备返还到原角色普通库存。 */
    private final InventoryService inventory;
    /** 读取素材英雄的独立穿戴关系。 */
    private final HeroEquipmentRepository equipment;
    /** 解销素材英雄的镶嵌宝石。 */
    private final HeroJewelService jewels;
    /** 解销素材英雄已戴神装。 */
    private final GodEquipmentRepository godEquipment;
    /** 解销素材英雄已戴圣器，保留原实例。 */
    private final HeroArtifactRepository artifacts;
    /** 清理普通穿戴关系以及已校验的英雄。 */
    private final JdbcTemplate jdbc;

    /** 使用现有装备、背包及角色数据库，不管理外层事务。 */
    public HeroMaterialService(InventoryService inventory, HeroEquipmentRepository equipment, HeroJewelService jewels,
                               GodEquipmentRepository godEquipment, HeroArtifactRepository artifacts, JdbcTemplate jdbc) {
        this.inventory = inventory;
        this.equipment = equipment;
        this.jewels = jewels;
        this.godEquipment = godEquipment;
        this.artifacts = artifacts;
        this.jdbc = jdbc;
    }

    /**
     * 先卸装并删除同角色未锁定素材，失败返回 false 时调用方回滚整个事务。
     * 英雄等级、强化费用如何返还由调用方的玩法规则处理。
     */
    public boolean remove(String roleId, HeroProfile material) {
        for (var slot : equipment.slots(roleId, material.id())) {
            if (slot.equipped()) {
                inventory.credit(roleId, slot.templateId(), 1);
            }
        }
        jdbc.update("DELETE FROM game_equipment WHERE role_id=? AND hero_id=?", roleId, material.id());
        jewels.releaseForConsumedHero(roleId, material.id());
        godEquipment.releaseHero(roleId, material.id());
        artifacts.releaseHero(roleId, material.id());
        return jdbc.update("DELETE FROM game_hero WHERE role_id=? AND id=? AND is_locked=FALSE",
                roleId, material.id()) == 1;
    }
}
