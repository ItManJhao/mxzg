/**
 * 礼包权威持有记录的只读入口：按当前角色读取原始记录，保留期限、购买次数和active状态。
 * 由已持有角色锁并验证角色存在的输入装配层调用；不在本服务再次查角色或缓存持有状态。
 * 不清过期记录、不推断库存权益、不提供购买/续购写入口；缺表或查询失败不能当作没有礼包。
 */
package com.funsgamex.mxzg.privilege;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PrivilegeGiftService {
    /** 礼包持久记录的唯一读取入口，复用当前角色事务连接，不维护第二份权益状态。 */
    private final JdbcTemplate jdbc;

    /** 礼包持有记录的冻结值；是否适用于本次挂机由奖励规则和统一计算时刻判断。
     * @param recordId 独立持久记录ID，以字符串保留，不转换为数值
     * @param giftId 礼包配置ID，同角色可以有多条相同配置记录
     * @param purchasedAtSeconds 原始购买Unix秒，非负
     * @param endsAtSeconds 原始结束Unix秒，0表示永久；不要求大于本次购买时刻
     * @param purchaseCount 原始购买次数，过期记录可能为0，本次读取不清理
     * @param active 原始状态0或1，不在持有读取层过滤
     */
    public record Gift(String recordId, int giftId, long purchasedAtSeconds, long endsAtSeconds,
                       int purchaseCount, int active) {}

    /** 注入现有数据库入口，不装配购买、库存或发奖服务。 */
    public PrivilegeGiftService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * 在调用者已锁定并验证存在的角色事务内，读取全部原始礼包记录并冻结返回列表。
     * 包含过期、active为0和重复配置记录；只有可信表实际无行才返回空，查询错误直接抛出。
     * @param roleId 上游已校验归属及存在性的当前角色ID，不是客户端任意指定角色
     */
    @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
    public List<Gift> held(String roleId) {
        if (roleId == null || roleId.isBlank()) {
            throw new IllegalArgumentException("礼包持有记录角色标识缺失");
        }
        var held = jdbc.query("SELECT id,gift_id,purchased_at_seconds,ends_at_seconds,purchase_count,active "
                + "FROM game_privilege_gift WHERE role_id=? ORDER BY id", (row, index) -> {
            String id = row.getString("id");
            int giftId = row.getInt("gift_id");
            boolean giftMissing = row.wasNull();
            long purchasedAt = row.getLong("purchased_at_seconds");
            boolean purchasedMissing = row.wasNull();
            long endsAt = row.getLong("ends_at_seconds");
            boolean endsMissing = row.wasNull();
            int count = row.getInt("purchase_count");
            boolean countMissing = row.wasNull();
            int active = row.getInt("active");
            boolean activeMissing = row.wasNull();
            if (id == null || id.isBlank() || giftMissing || giftId <= 0
                    || purchasedMissing || purchasedAt < 0 || endsMissing || endsAt < 0
                    || countMissing || count < 0 || activeMissing || (active != 0 && active != 1)) {
                throw new IllegalStateException("礼包持有记录字段非法");
            }
            return new Gift(id, giftId, purchasedAt, endsAt, count, active);
        }, roleId);
        return List.copyOf(held);
    }
}
