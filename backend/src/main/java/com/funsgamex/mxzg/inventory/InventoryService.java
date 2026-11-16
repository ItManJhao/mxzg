/**
 * 普通堆叠库存的查询、发放和扣除，发放在调用方事务内锁定真实角色并返回本次到账明细。
 * 外层业务负责奖励资格、请求幂等和回执提交；本服务不创建独立事务或完整资产快照。
 * 精灵及冒险点由独立领域持有，本入口拒绝item.type=8/11的读写，不将错误堆叠混入普通库存。
 */
package com.funsgamex.mxzg.inventory;

import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
public class InventoryService {
    /** itemId 是配置 ID，instanceId 是稳定库存记录 ID，字符串传输避免前端整数精度损失。 */
    public record Item(int itemId, long quantity, String instanceId) {}

    /**
     * 本次普通库存实际入账结果，只有外层事务提交后才成为已确认奖励。
     * @param itemId 普通物品配置ID，不是实例身份
     * @param instanceId 实际写入记录的稳定字符串ID，保留历史stack:格式，不强制为UUID
     * @param beforeQuantity 本次写入前的持有数量，记录不存在时为0
     * @param quantity 本次实际增加的正数，不是最终持有数量
     * @param afterQuantity 精确相加后的真实持有数量
     */
    public record Credit(int itemId, String instanceId, long beforeQuantity,
                         long quantity, long afterQuantity) {}

    /** 库存持久化入口，由 Spring 注入。 */
    private final JdbcTemplate jdbc;

    /** 同事务更新版本并安排提交后同步。 */
    private final AssetSyncService sync;

    /** 由Spring注入的真实角色行锁入口，发放在读取旧余额前取得锁并持有至外层事务结束。 */
    private final RoleRepository roles;

    /** 原item表中所有精灵配置ID，只用于拒绝错误堆叠，不保存实例或维护第二份奖励映射。 */
    private final Set<Integer> spiritItemIds;

    /** 原item表中全部冒险点类型配置ID，独立领域迁移后连合法0的错误堆叠也拒绝。 */
    private final Set<Integer> tavernItemIds;

    /** 在调用方事务内条件扣普通物品，余额不足返回false；精灵和冒险点不能从堆叠扣除。 */
    public boolean debit(String roleId, int itemId, long amount) {
        if (amount <= 0) throw new IllegalArgumentException("Nonpositive inventory debit");
        requireStackItem(itemId);
        sync.requireTransaction();
        boolean changed = jdbc.update("UPDATE game_inventory SET quantity=quantity-? WHERE role_id=? AND item_id=? AND quantity>=?", amount, roleId, itemId, amount) == 1;
        if(changed) sync.changed(roleId);
        return changed;
    }

    /** 注入持久化、角色锁和同步出口，从可信item表读取独立领域类型边界；坏结构拒绝启动。 */
    public InventoryService(JdbcTemplate jdbc, AssetSyncService sync, ObjectMapper mapper,
                            RoleRepository roles) {
        this.jdbc = jdbc;
        this.sync = sync;
        this.roles = roles;
        var ids = new HashSet<Integer>();
        var points = new HashSet<Integer>();
        try (var input = getClass().getResourceAsStream("/gameplay/item.json")) {
            if (input == null) {
                throw new IllegalStateException("普通库存缺少物品类型配置");
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("普通库存物品类型配置无效");
            }
            for (var row : rows) {
                int type = row.path("type").asInt();
                if (type == 8 || type == 11) {
                    var target = type == 8 ? ids : points;
                    if (!row.path("idx").isIntegralNumber() || !row.path("idx").canConvertToInt()
                            || row.path("idx").asInt() <= 0 || !target.add(row.path("idx").asInt())) {
                        throw new IllegalStateException("独立领域物品类型配置无效");
                    }
                }
            }
        } catch (java.io.IOException failure) {
            throw new IllegalStateException("普通库存物品类型配置读取失败", failure);
        }
        spiritItemIds = Set.copyOf(ids);
        tavernItemIds = Set.copyOf(points);
    }

    /** 读取普通堆叠并保留身份；先校验全部记录，独立领域错误堆叠即使数量为0也拒绝整包。 */
    public List<Item> list(String roleId) {
        var items = jdbc.query("SELECT item_id,quantity,instance_id FROM game_inventory WHERE role_id=? ORDER BY item_id",
                this::readStored, roleId);
        if (items.stream().anyMatch(item -> spiritItemIds.contains(item.itemId())
                || tavernItemIds.contains(item.itemId()))) {
            throw new IllegalStateException("普通库存包含独立领域错误堆叠，不能替代精灵实例或冒险点");
        }
        return items.stream().filter(item -> item.quantity() > 0).toList();
    }

    /**
     * 在调用方事务内先锁真实角色，再精确增加普通库存并返回本次实际到账数量及稳定身份。
     * 精灵和冒险点必须经所属领域入口；普通旧记录保留原ID，即使余额为0也不替换身份。
     * @throws ArithmeticException 新余额超出long范围时拒绝，库存和同步版本均不写入
     * @throws IllegalStateException 缺事务、旧记录损坏或写入行数异常时拒绝，由外层处理整体回滚
     */
    public Credit credit(String roleId, int itemId, long quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Nonpositive inventory credit");
        }
        requireStackItem(itemId);
        sync.requireTransaction();
        roles.lock(roleId);
        var existing = findStored(roleId, itemId);
        long beforeQuantity = existing.map(Item::quantity).orElse(0L);
        long afterQuantity = Math.addExact(beforeQuantity, quantity);
        String instanceId = existing.map(Item::instanceId).orElseGet(() -> UUID.randomUUID().toString());
        int written;
        if (existing.isPresent()) {
            written = jdbc.update("UPDATE game_inventory SET quantity=? WHERE role_id=? AND item_id=? AND instance_id=?",
                    afterQuantity, roleId, itemId, instanceId);
        } else {
            written = jdbc.update("INSERT INTO game_inventory(role_id,item_id,quantity,instance_id) VALUES (?,?,?,?)",
                    roleId, itemId, afterQuantity, instanceId);
        }
        if (written != 1) {
            throw new IllegalStateException("普通库存写入行数异常");
        }
        sync.changed(roleId);
        return new Credit(itemId, instanceId, beforeQuantity, quantity, afterQuantity);
    }

    /**
     * 只读指定普通库存记录，包含合法零余额；不存在返回空，损坏记录拒绝，不清理库存或推进版本。
     * 精灵和冒险点由所属领域读取；需要一致余额的业务须在自己的角色锁事务内调用。
     */
    public Optional<Item> find(String roleId, int itemId) {
        requireStackItem(itemId);
        return findStored(roleId, itemId);
    }

    /** 按角色与配置读取唯一持久记录，供发放和只读余额查询共享同一套旧记录校验。 */
    private Optional<Item> findStored(String roleId, int itemId) {
        return jdbc.query("SELECT item_id,quantity,instance_id FROM game_inventory WHERE role_id=? AND item_id=?",
                this::readStored, roleId, itemId).stream().findFirst();
    }

    /** 保留真实非空字符串身份，拒绝NULL或负余额，不把损坏记录当作新建零余额库存。 */
    private Item readStored(ResultSet row, int index) throws SQLException {
        long quantity = row.getLong("quantity");
        boolean missingQuantity = row.wasNull();
        String instanceId = row.getString("instance_id");
        if (missingQuantity || quantity < 0 || instanceId == null || instanceId.isBlank()) {
            throw new IllegalStateException("普通库存持久数量或身份非法");
        }
        return new Item(row.getInt("item_id"), quantity, instanceId);
    }

    /** 按可信配置拒绝全部精灵和冒险点类型，不能通过普通库存绕过独立领域规则。 */
    private void requireStackItem(int itemId) {
        if (spiritItemIds.contains(itemId)) {
            throw new IllegalArgumentException("精灵必须按独立实例处理：" + itemId);
        }
        if (tavernItemIds.contains(itemId)) {
            throw new IllegalArgumentException("冒险点必须由酒馆领域处理：" + itemId);
        }
    }
}
