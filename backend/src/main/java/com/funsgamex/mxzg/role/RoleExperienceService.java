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
    /** 与其他奖励共享的数据库事务。 */
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
        long diamonds = Math.addExact(role.diamonds(), result.diamonds());
        jdbc.update("UPDATE game_role SET role_level=?,role_experience=?,diamonds=? WHERE id=?",
            result.level(), result.experience(), diamonds, roleId);
        sync.changed(roleId);
        return result;
    }
}
