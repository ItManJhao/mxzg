/**
 * 角色经验奖励的事务内分发入口，供主线等服务端奖励调用，不提供玩家升级请求。
 * 等级、经验及升级钻石同事务入账，共用唯一资产版本；业务请求去重由外层结算负责。
 */
package com.funsgamex.mxzg.role;

import com.funsgamex.mxzg.network.AssetSyncService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoleExperienceService {
    /** 同源经验门槛和升级奖励，不在服务中手写数值。 */
    private final RoleRules rules;
    /** 角色锁与唯一角色读取入口。 */
    private final RoleRepository roles;
    /** 保存等级与经验的共享数据库连接，写入继续加入外层奖励事务。 */
    private final JdbcTemplate jdbc;
    /** 同事务只递增一次版本，回滚不推送。 */
    private final AssetSyncService sync;

    /** 注入现有角色和同步入口，不持有本地玩家副本。 */
    public RoleExperienceService(RoleRules rules, RoleRepository roles, JdbcTemplate jdbc, AssetSyncService sync) {
        this.rules = rules;
        this.roles = roles;
        this.jdbc = jdbc;
        this.sync = sync;
    }

    /**
     * 在已鉴权奖励事务内给指定角色增加经验，内部复用角色行锁。
     * 必须加入外层事务，禁止单独自动提交；不创建英雄升级、穿脱或玩家发奖接口。
     * 升级钻石复用钱包的旧余额及精确加法校验，与等级经验共享版本和回滚边界。
     * @param roleId 外层已鉴权的持久角色ID，不接收客户端指定的领奖对象
     * @param amount 本次可信奖励申请的正经验数量
     * @return 实际前后经验、接纳与满级忽略量及升级附赠；已满级空操作不推进资产版本
     * @throws IllegalStateException 经验写入行数异常或钱包损坏时拒绝，外层事务整体回滚
     * @throws ArithmeticException 经验累计或升级钻石余额溢出时拒绝，外层事务整体回滚
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public RoleRules.ExperienceGain credit(String roleId, long amount) {
        sync.requireTransaction();
        roles.lock(roleId);
        var role = roles.findById(roleId).orElseThrow();
        var result = rules.addExperience(role.level(), role.basics().experience(), amount);
        if (result.level() == role.level() && result.experience() == role.basics().experience()) {
            return result;
        }
        if (jdbc.update("UPDATE game_role SET role_level=?,role_experience=? WHERE id=?",
                result.level(), result.experience(), roleId) != 1) {
            throw new IllegalStateException("角色经验写入行数异常");
        }
        if (result.diamonds() > 0) {
            roles.creditCurrency(roleId, 0, result.diamonds());
        }
        sync.changed(roleId);
        return result;
    }
}
