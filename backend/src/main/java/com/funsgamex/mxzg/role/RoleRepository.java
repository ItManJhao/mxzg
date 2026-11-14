/**
 * 角色持久化入口：提供身份读取、写事务角色锁和钱包余额保护。
 * 可信奖励调用方提供外层事务；金币/钻石入账在真实角色行锁内分别精确相加后一次保存。
 * 所有钱包写入继续复用AssetSyncService的同事务版本及提交后通知，不创建独立发奖事务。
 */
package com.funsgamex.mxzg.role;

import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RoleRepository {
    /**
     * 一次钱包写入或整笔可信发奖的真实前后余额，不将升级赠钻混入直接奖励数量。
     * @param goldBefore 写入前的金币余额
     * @param diamondsBefore 写入前的钻石余额
     * @param goldAfter 写入后的金币余额
     * @param diamondsAfter 写入后的钻石余额，整笔发奖时包含升级附赠
     */
    public record CurrencyCredit(long goldBefore, long diamondsBefore, long goldAfter, long diamondsAfter) {}
    /** 共享数据库连接，所有角色字段只有这一处持久化读取。 */
    private final JdbcTemplate jdbc;
    /** 初始值与当前等级经验门槛，由原配置决定。 */
    private final RoleRules rules;
    /** 旧英雄容量配置，只在创建角色时提供持久初值。 */
    private final com.funsgamex.mxzg.hero.HeroCapacityService heroCapacity;
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
    public RoleRepository(JdbcTemplate jdbc, com.funsgamex.mxzg.network.AssetSyncService sync, RoleRules rules, com.funsgamex.mxzg.hero.HeroCapacityService heroCapacity) { this.jdbc=jdbc; this.sync=sync; this.rules=rules; this.heroCapacity=heroCapacity; }
    /** 持有角色锁时读取持久状态版本；同一提交的角色与背包共用此值。 */
    public long revision(String role) { return jdbc.queryForObject("SELECT state_revision FROM game_role WHERE id=?",Long.class,role); }
    /**
     * 在调用方事务内锁定真实钱包，分别校验金币和钻石精确加法后一次保存。
     * 两币种各自允许0但不能同时为0，不把跨币种相加当成余额或奖励有效性条件。
     * 缺角色由持久查询异常拒绝，不创建钱包或发送资产变更通知。
     * @return 本次写入的真实前后余额；仅外层事务提交后才代表持久到账。
     * @throws IllegalArgumentException 奖励为负或两者均为0时拒绝，不执行写入
     * @throws ArithmeticException 任一新余额超出long范围时拒绝，两币种和同步版本都不改写
     * @throws IllegalStateException 缺外层事务、旧余额损坏或写入行数异常时拒绝，由外层整体回滚
     */
    public CurrencyCredit creditCurrency(String role, long gold, long diamonds) {
        if (gold < 0 || diamonds < 0 || (gold == 0 && diamonds == 0)) {
            throw new IllegalArgumentException("无效奖励");
        }
        sync.requireTransaction();
        var current = jdbc.queryForObject("SELECT gold,diamonds FROM game_role WHERE id=? FOR UPDATE", (row, index) -> {
            long currentGold = row.getLong("gold");
            boolean missingGold = row.wasNull();
            long currentDiamonds = row.getLong("diamonds");
            boolean missingDiamonds = row.wasNull();
            if (missingGold || missingDiamonds || currentGold < 0 || currentDiamonds < 0) {
                throw new IllegalStateException("角色持久钱包余额非法");
            }
            return new long[]{currentGold, currentDiamonds};
        }, role);
        long nextGold = Math.addExact(current[0], gold);
        long nextDiamonds = Math.addExact(current[1], diamonds);
        if (jdbc.update("UPDATE game_role SET gold=?,diamonds=? WHERE id=?", nextGold, nextDiamonds, role) != 1) {
            throw new IllegalStateException("角色钱包写入行数异常");
        }
        sync.changed(role);
        return new CurrencyCredit(current[0], current[1], nextGold, nextDiamonds);
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
        jdbc.update("INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id,role_experience,cup,image_id,created_at_seconds,last_login_at_seconds,hero_capacity) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            id,key,account,rules.initial("level"),rules.initial("gold"),rules.initial("gem"),account,serverId,rules.initial("exp"),rules.initial("cup"),rules.imageId(),now,now,heroCapacity.initial());
        return findById(id).orElseThrow();
    }
    /** 显式登录时记录服务器秒；须持有角色锁与事务，变更后统一通知，不把网络重连当作新登录。 */
    public void recordLogin(String roleId,long now) {
        if(now<=0)throw new IllegalArgumentException("登录时间无效");sync.requireTransaction();
        if(jdbc.update("UPDATE game_role SET last_login_at_seconds=? WHERE id=? AND last_login_at_seconds<?",now,roleId,now)>0)sync.changed(roleId);
    }
}
