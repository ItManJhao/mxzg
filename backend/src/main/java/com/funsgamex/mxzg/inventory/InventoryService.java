/** 库存查询、发放和扣除；调用方在同一角色锁事务内协调资产与业务状态，不允许负数扣费。 */
package com.funsgamex.mxzg.inventory;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class InventoryService {
    /** itemId 是配置 ID，instanceId 是稳定库存记录 ID，字符串传输避免前端整数精度损失。 */
    public record Item(int itemId, long quantity, String instanceId) {}
    /** 库存持久化入口，由 Spring 注入。 */
    private final JdbcTemplate jdbc;
    /** 同事务更新版本并安排提交后同步。 */
    private final com.funsgamex.mxzg.network.AssetSyncService sync;

    /** 在调用方事务内条件扣除指定物品，余额不足返回 false，绝不补建负数记录。 */
    public boolean debit(String roleId, int itemId, long amount) {
        if (amount <= 0) throw new IllegalArgumentException("Nonpositive inventory debit");
        sync.requireTransaction();
        boolean changed = jdbc.update("UPDATE game_inventory SET quantity=quantity-? WHERE role_id=? AND item_id=? AND quantity>=?", amount, roleId, itemId, amount) == 1;
        if(changed) sync.changed(roleId);
        return changed;
    }
    /** 注入库存持久化与提交同步出口。 */
    public InventoryService(JdbcTemplate jdbc, com.funsgamex.mxzg.network.AssetSyncService sync) { this.jdbc = jdbc; this.sync=sync; }
    /** 读取普通堆叠物品，保留记录身份；不混入逐件期限道具。 */
    public List<Item> list(String roleId) {
        return jdbc.query("SELECT item_id,quantity,instance_id FROM game_inventory WHERE role_id=? AND quantity>0 ORDER BY item_id",
            (row,index) -> new Item(row.getInt(1), row.getLong(2), row.getString(3)), roleId);
    }
    /** 在持有角色锁的奖励事务内发放正数库存；同事务登记版本，提交后统一同步。 */
    public void credit(String roleId, int itemId, long quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("Nonpositive inventory credit");
        sync.requireTransaction();
        if (jdbc.update("UPDATE game_inventory SET quantity=quantity+? WHERE role_id=? AND item_id=?", quantity,roleId,itemId)==0)
            jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,?,?,?)",roleId,itemId,quantity,java.util.UUID.randomUUID().toString());
        sync.changed(roleId);
    }
}
