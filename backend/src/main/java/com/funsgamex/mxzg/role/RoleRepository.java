/** 角色持久化入口，提供当前身份读取、写事务角色锁与受余额保护的金币扣除。 */
package com.funsgamex.mxzg.role;

import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class RoleRepository {
    private static final RowMapper<RoleProfile> MAPPER = (row, index) -> new RoleProfile(
        row.getString("id"), row.getString("nickname"), row.getInt("role_level"),
        row.getLong("gold"), row.getLong("diamonds"), row.getString("server_id"));
    private final JdbcTemplate jdbc;

    /** 写用例在事务内先锁角色行，使发奖、阵容与升级按相同角色顺序串行。 */
    public void lock(String roleId) { jdbc.queryForObject("SELECT id FROM game_role WHERE id=? FOR UPDATE", String.class, roleId); }

    /** 调用者必须持有角色锁；余额不足不写入，数据库条件同时防止负余额。 */
    public boolean debitGold(String roleId, long amount) {
        if (amount <= 0) throw new IllegalArgumentException("Nonpositive gold debit");
        return jdbc.update("UPDATE game_role SET gold=gold-? WHERE id=? AND gold>=?", amount, roleId, amount) == 1;
    }

    public RoleRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<RoleProfile> findByAccount(String account) {
        return findByAccount(account, "local-1");
    }
    public Optional<RoleProfile> findByAccount(String account, String serverId) {
        return jdbc.query("SELECT * FROM game_role WHERE login_account = ? AND server_id = ?", MAPPER, account, serverId).stream().findFirst();
    }

    public Optional<RoleProfile> findById(String id) {
        return jdbc.query("SELECT * FROM game_role WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    public RoleProfile create(String account) {
        return create(account, "local-1");
    }
    public RoleProfile create(String account, String serverId) {
        String id = UUID.randomUUID().toString();
        String key = serverId.equals("local-1") ? account : account + "@" + serverId;
        jdbc.update("INSERT INTO game_role(id, account_key, nickname, role_level, gold, diamonds, login_account, server_id) VALUES (?, ?, ?, 1, 0, 0, ?, ?)",
            id, key, account, account, serverId);
        return findById(id).orElseThrow();
    }
}
