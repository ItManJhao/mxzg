/**
 * 冒险点唯一持久入口：在调用方角色锁事务内懒初始化、读取和接纳可信发奖。
 * 登录/恢复快照、共享发奖和开发GM复用同一记录；已有0与超上限余额保留，不回写历史成功回执。
 * 本服务不生成酒馆任务、不注册玩家操作，也不创建独立事务；实际变更统一提交版本和通知。
 */
package com.funsgamex.mxzg.tavern;

import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TavernPointService {
    /** 当前只读冒险点投影格式；不是资产持久版本或业务操作版本。 */
    public static final int SCHEMA_VERSION = 1;

    /**
     * 本角色当前持久冒险点及同次最高通关关卡上限；超上限余额不裁回。
     * @param schemaVersion 只读结构格式，当前固定为1
     * @param adventureCount 当前绝对余额，合法0不能解释成未初始化
     * @param limit 同次角色锁中读取的最高通关关卡上限，不是下一关上限
     */
    public record State(int schemaVersion, long adventureCount, long limit) {}

    /**
     * 单次可信入账的真实前后量，不含缺记录时一次性初始化的初值。
     * @param beforeQuantity 初始化完成后的原有余额，可能已超业务上限
     * @param quantity 本次实际接纳数量；满额时允许0
     * @param afterQuantity 入账后的真实绝对余额
     */
    public record Credit(long beforeQuantity, long quantity, long afterQuantity) {}

    /** 唯一酒馆点表的SQL入口，与外层业务共用连接和事务。 */
    private final JdbcTemplate jdbc;
    /** Spring注入的真实角色行锁；缺记录初始化和并发发奖按相同角色顺序串行。 */
    private final RoleRepository roles;
    /** Spring注入的同源初值，只有持久记录真正不存在时使用。 */
    private final TavernPointRules rules;
    /** Spring注入的统一版本及提交后状态出口，一事务同角色只增加一次版本。 */
    private final AssetSyncService sync;

    /** 装配唯一持久入口，不建立内存余额副本或另一套通知队列。 */
    public TavernPointService(JdbcTemplate jdbc, RoleRepository roles, TavernPointRules rules,
                              AssetSyncService sync) {
        this.jdbc = jdbc;
        this.roles = roles;
        this.rules = rules;
        this.sync = sync;
    }

    /**
     * 在外层角色事务内返回完整只读状态；真正缺行时按旧规则懒建一次并推进资产版本。
     * 已有0和超上限余额均原样返回；坏记录、负上限或缺少事务拒绝，不能降级为0。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public State current(String roleId, long limit) {
        requireLimit(limit);
        lockRole(roleId);
        var stored = findStored(roleId);
        long count = stored.orElseGet(rules::initialAdventureCount);
        if (stored.isEmpty()) {
            save(roleId, count, false);
        }
        return new State(SCHEMA_VERSION, count, limit);
    }

    /** 查询冒险点是否已达上限。缺记录采用同源初值判断，查看报价不会创建记录或更新资产版本。 */
    @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
    public boolean isFull(String roleId, long limit) {
        requireLimit(limit);
        lockRole(roleId);
        return findStored(roleId).orElseGet(rules::initialAdventureCount) >= limit;
    }

    /**
     * 接纳可信业务奖励并按本次冻结上限截顶；既有超额不倒扣，零到账不产生额外资产变更。
     * 缺行初始化与本次实际奖励同事务提交，但初值不冒充本次奖励；失败由外层整体回滚。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Credit credit(String roleId, long requested, long limit) {
        requireLimit(limit);
        return creditInternal(roleId, requested, limit);
    }

    /** 开发GM明确无关卡封顶准备数据；仍遵守真实角色锁、精确加法、回执外层事务及统一同步。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public Credit creditForDevelopment(String roleId, long requested) {
        return creditInternal(roleId, requested, null);
    }

    /** 在写入前计算完整新值，避免调用方捕获溢出后提交时留下半笔初始化或余额。 */
    private Credit creditInternal(String roleId, long requested, Long limit) {
        if (requested <= 0 || requested > TavernPointRules.MAX_SAFE_INTEGER) {
            throw new IllegalArgumentException("冒险点奖励数量必须为正安全整数");
        }
        lockRole(roleId);
        var stored = findStored(roleId);
        long before = stored.orElseGet(rules::initialAdventureCount);
        long credited = limit == null ? requested
                : before >= limit ? 0 : Math.min(requested, limit - before);
        long after = Math.addExact(before, credited);
        if (after > TavernPointRules.MAX_SAFE_INTEGER) {
            throw new ArithmeticException("冒险点新余额超出安全整数范围");
        }
        if (stored.isEmpty() || credited > 0) {
            save(roleId, after, stored.isPresent());
        }
        return new Credit(before, credited, after);
    }

    /** 资产读写必须在调用方事务中取得真实角色行锁，角色不存在时直接拒绝。 */
    private void lockRole(String roleId) {
        if (roleId == null || roleId.isBlank()) {
            throw new IllegalArgumentException("冒险点缺少角色");
        }
        sync.requireTransaction();
        roles.lock(roleId);
    }

    /** 读取唯一持久记录，缺行才返回空；数据库坏值不能解释成未初始化。 */
    private Optional<Long> findStored(String roleId) {
        return jdbc.query("SELECT adventure_count FROM game_tavern_point WHERE role_id=?",
                this::readCount, roleId).stream().findFirst();
    }

    /** 拒绝NULL、负数及不能通过WS安全传输的余额；合法0和超关卡cap的安全整数保留。 */
    private Long readCount(ResultSet row, int index) throws SQLException {
        long count = row.getLong("adventure_count");
        if (row.wasNull() || count < 0 || count > TavernPointRules.MAX_SAFE_INTEGER) {
            throw new IllegalStateException("冒险点持久余额非法");
        }
        return count;
    }

    /** 保存初始化或真实入账后登记同事务版本；异常写入行数拒绝，由外层回滚。 */
    private void save(String roleId, long count, boolean exists) {
        int written = exists
                ? jdbc.update("UPDATE game_tavern_point SET adventure_count=? WHERE role_id=?", count, roleId)
                : jdbc.update("INSERT INTO game_tavern_point(role_id,adventure_count) VALUES (?,?)", roleId, count);
        if (written != 1) {
            throw new IllegalStateException("冒险点写入行数异常");
        }
        sync.changed(roleId);
    }

    /** 上限由可信主线规则提供，0合法且须能安全传输；负数不表示无上限，GM走明确开发入口。 */
    private void requireLimit(long limit) {
        if (limit < 0 || limit > TavernPointRules.MAX_SAFE_INTEGER) {
            throw new IllegalArgumentException("冒险点上限无效");
        }
    }
}
