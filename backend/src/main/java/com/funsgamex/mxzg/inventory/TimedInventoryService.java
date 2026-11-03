/** 期限道具数据基础：逐件保存实例，按旧自然日规则计算期限，读取时回收过期记录。尚不开放发放业务协议。 */
package com.funsgamex.mxzg.inventory;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import com.funsgamex.mxzg.network.AssetSyncService;
@Service
public class TimedInventoryService {
    /** 用户确认所有新版区服统一北京时间日切，不使用部署机器默认时区。 */
    private static final ZoneId RESET_ZONE=ZoneId.of("Asia/Shanghai");
    /** 单件期限物品，ID 全程使用字符串；两个时间均为 Unix 秒。 */
    public record Item(String instanceId, int itemId, long activeAtSeconds, long expiresAtSeconds) {}
    /** 当前有效实例及生成列表时的服务器时刻，客户端不能自行延长期限。 */
    public record State(List<Item> items, long serverTimeSeconds) {}
    /** 唯一持久化入口，不维护内存库存副本。 */
    private final JdbcTemplate jdbc;
    /** 事务内记录版本，提交后同步，回滚不推送。 */
    private final AssetSyncService sync;
    /** 注入共享数据库和资产提交出口。 */
    public TimedInventoryService(JdbcTemplate jdbc, AssetSyncService sync) { this.jdbc=jdbc; this.sync=sync; }
    /** 旧公式：激活当天当地零点 + 有效天数 × 86400 - 1 秒；统一北京时间，不取机器默认值。 */
    public static long expiration(long activeAtSeconds, int validDays) {
        if(activeAtSeconds<0 || validDays<=0) throw new IllegalArgumentException("期限参数无效");
        long start=Instant.ofEpochSecond(activeAtSeconds).atZone(RESET_ZONE).toLocalDate().atStartOfDay(RESET_ZONE).toEpochSecond();
        return Math.subtractExact(Math.addExact(start,Math.multiplyExact((long)validDays,86400L)),1L);
    }
    /** 调用方须持有角色锁与事务，并从期限配置提供物品、效果类型和天数；每次只写一件，不合并同配置实例。 */
    public Item grantOne(String roleId, int itemId, int effectType, int validDays, long nowSeconds) {
        sync.requireTransaction();
        if(itemId<=0 || effectType<0) throw new IllegalArgumentException("期限道具配置无效");
        Item item=new Item(UUID.randomUUID().toString(),itemId,nowSeconds,expiration(nowSeconds,validDays));
        jdbc.update("INSERT INTO game_timed_inventory(instance_id,role_id,item_id,effect_type,active_at_seconds,expires_at_seconds) VALUES (?,?,?,?,?,?)",
            item.instanceId(),roleId,itemId,effectType,nowSeconds,item.expiresAtSeconds());
        sync.changed(roleId); return item;
    }
    /** 角色锁事务内按服务器秒回收 expires<=now 的记录，再读取有效列表；过期删除同样递增版本。 */
    public State current(String roleId, long nowSeconds) {
        sync.requireTransaction();
        if(nowSeconds<0) throw new IllegalArgumentException("服务器时刻无效");
        if(jdbc.update("DELETE FROM game_timed_inventory WHERE role_id=? AND expires_at_seconds<=?",roleId,nowSeconds)>0) sync.changed(roleId);
        List<Item> items=jdbc.query("SELECT instance_id,item_id,active_at_seconds,expires_at_seconds FROM game_timed_inventory WHERE role_id=? ORDER BY instance_id",
            (row,index)->new Item(row.getString(1),row.getInt(2),row.getLong(3),row.getLong(4)),roleId);
        return new State(List.copyOf(items),nowSeconds);
    }
}
