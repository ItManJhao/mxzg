package com.funsgamex.mxzg.inventory;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class InventoryService {
    public record Item(int itemId, long quantity) {}
    private final JdbcTemplate jdbc;
    public InventoryService(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<Item> list(String roleId) {
        return jdbc.query("SELECT item_id,quantity FROM game_inventory WHERE role_id=? AND quantity>0 ORDER BY item_id",
            (row,index) -> new Item(row.getInt(1), row.getLong(2)), roleId);
    }
    /** The caller holds the role lock in its award transaction. */
    public void credit(String roleId, int itemId, long quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("Nonpositive inventory credit");
        if (jdbc.update("UPDATE game_inventory SET quantity=quantity+? WHERE role_id=? AND item_id=?", quantity,roleId,itemId)==0)
            jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity) VALUES (?,?,?)",roleId,itemId,quantity);
    }
}
