/** 角色持久化入口，提供当前身份读取、写事务角色锁与受余额保护的金币扣除。 */
package com.funsgamex.mxzg.role;

import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RoleRepository {
    /** 共享数据库连接，所有角色字段只有这一处持久化读取。 */
    private final JdbcTemplate jdbc;
    /** 初始值与当前等级经验门槛，由原配置决定。 */
    private final RoleRules rules;
    /** 行映射保留持久字段，等级门槛按可信配置派生。 */
    private RoleProfile map(java.sql.ResultSet row,int index) throws java.sql.SQLException {
        int level=row.getInt("role_level");
        return new RoleProfile(row.getString("id"),row.getString("nickname"),level,row.getLong("gold"),row.getLong("diamonds"),row.getString("server_id"),
            new RoleBasics(row.getLong("role_experience"),row.getInt("cup"),row.getInt("head_id"),row.getInt("image_id"),row.getInt("border_id"),row.getInt("language_id"),row.getLong("created_at_seconds"),row.getLong("last_login_at_seconds"),rules.threshold(level)));
    }
    /** 资产版本与事务提交同步，由所有钱包写入共同使用。 */
    private final com.funsgamex.mxzg.network.AssetSyncService sync;

    /** 写用例在事务内先锁角色行，使发奖、阵容与升级按相同角色顺序串行。 */
    public void lock(String roleId) { jdbc.queryForObject("SELECT id FROM game_role WHERE id=? FOR UPDATE", String.class, roleId); }

    /** 调用者必须持有角色锁；余额不足不写入，数据库条件同时防止负余额。 */
    public boolean debitGold(String roleId, long amount) {
        if (amount <= 0) throw new IllegalArgumentException("Nonpositive gold debit");
        sync.requireTransaction();
        boolean changed=jdbc.update("UPDATE game_role SET gold=gold-? WHERE id=? AND gold>=?", amount, roleId, amount) == 1;
        if(changed) sync.changed(roleId);
        return changed;
    }

    /** 注入角色持久化与资产同步出口。 */
    public RoleRepository(JdbcTemplate jdbc, com.funsgamex.mxzg.network.AssetSyncService sync, RoleRules rules) { this.jdbc=jdbc; this.sync=sync; this.rules=rules; }
    /** 持有角色锁时读取持久状态版本；同一提交的角色与背包共用此值。 */
    public long revision(String role) { return jdbc.queryForObject("SELECT state_revision FROM game_role WHERE id=?",Long.class,role); }
    /** 已验证奖励事务调用；只允许正数，金币和钻石共享提交同步。 */
    public void creditCurrency(String role, long gold, long diamonds) {
        if(gold<0 || diamonds<0 || gold+diamonds<=0) throw new IllegalArgumentException("无效奖励");
        sync.requireTransaction();
        jdbc.update("UPDATE game_role SET gold=gold+?,diamonds=diamonds+? WHERE id=?",gold,diamonds,role); sync.changed(role);
    }

    /** 查询默认区服的账号角色，不创建资料。 */
    public Optional<RoleProfile> findByAccount(String account) {
        return findByAccount(account, "local-1");
    }
    /** 按账号及区服读取唯一角色，区服之间不共享资料。 */
    public Optional<RoleProfile> findByAccount(String account, String serverId) {
        return jdbc.query("SELECT * FROM game_role WHERE login_account = ? AND server_id = ?", this::map, account, serverId).stream().findFirst();
    }

    /** 按服务端已鉴权的角色 ID 读取基础资料。 */
    public Optional<RoleProfile> findById(String id) {
        return jdbc.query("SELECT * FROM game_role WHERE id = ?", this::map, id).stream().findFirst();
    }

    /** 按旧初始化规则创建默认区服角色。 */
    public RoleProfile create(String account) {
        return create(account, "local-1");
    }
    /** 按原表创建独立角色；不执行新手奖励、英雄初始化或其他模块业务。 */
    public RoleProfile create(String account, String serverId) {
        String id = UUID.randomUUID().toString();
        String key = serverId.equals("local-1") ? account : account + "@" + serverId;
        long now=java.time.Instant.now().getEpochSecond();
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id,role_experience,cup,image_id,created_at_seconds,last_login_at_seconds) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            id,key,account,rules.initial("level"),rules.initial("gold"),rules.initial("gem"),account,serverId,rules.initial("exp"),rules.initial("cup"),rules.imageId(),now,now);
        return findById(id).orElseThrow();
    }
    /** 显式登录时记录服务器秒；须持有角色锁与事务，变更后统一通知，不把网络重连当作新登录。 */
    public void recordLogin(String roleId,long now) {
        if(now<=0)throw new IllegalArgumentException("登录时间无效");sync.requireTransaction();
        if(jdbc.update("UPDATE game_role SET last_login_at_seconds=? WHERE id=? AND last_login_at_seconds<?",now,roleId,now)>0)sync.changed(roleId);
    }
}
