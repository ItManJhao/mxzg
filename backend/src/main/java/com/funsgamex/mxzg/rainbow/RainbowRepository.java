/**
 * 彩虹圣殿持久化。神位、进化、挑战回执和待发邮件由服务层在事务中一起提交。
 * 英雄属性装配可读取当前占位，过期判定使用统一游戏时钟。
 */
package com.funsgamex.mxzg.rainbow;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RainbowRepository {
    /** 占位原始时间；空位只保留已完成的最高进化等级。 */
    public record Occupation(String serverId, int seatId, int evolution, String roleId, Instant expiresAt,
                             Instant occupiedAt) {}

    /** 胜负回执冻结实际阵容和战报，按原请求键恢复。 */
    record Attempt(String roleId, String requestId, String serverId, int seatId, int step, long lineupVersion,
                   String battleId, String name, int power, boolean won, long foughtAt, byte[] replay) {}

    /** 玩家失去神位后需要投递的系统邮件类型和所在神位。 */
    record Notice(String id, String roleId, int seatId, boolean expired) {}

    /** 所有写入沿调用方事务持有的数据库连接执行。 */
    private final JdbcTemplate jdbc;

    /** 注入事务 JDBC 连接。 */
    RainbowRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 与同服竞技场共用区服行锁，顺序在任何角色锁之前。 */
    void lockServer(String serverId) {
        jdbc.queryForObject("SELECT id FROM game_server WHERE id=? FOR UPDATE", String.class, serverId);
    }

    /** 读取本区已写入的神位行；未出现的位置由配置投影为空位。 */
    List<Occupation> seats(String serverId) {
        return jdbc.query("""
                SELECT server_id,seat_id,evolution,role_id,expires_at,occupied_at
                  FROM game_rainbow_seat WHERE server_id=? ORDER BY seat_id
                """, (row, index) -> occupation(row), serverId);
    }

    /** 查询玩家已登记的神位。调用方用自己的事务时间判断是否到期。 */
    public Optional<Occupation> occupiedBy(String roleId) {
        return jdbc.query("""
                SELECT server_id,seat_id,evolution,role_id,expires_at,occupied_at
                  FROM game_rainbow_seat WHERE role_id=?
                """, row -> row.next() ? Optional.of(occupation(row)) : Optional.empty(), roleId);
    }

    /** 已取得同服写锁后转移神位，兼容首次被攻下时尚无持久行。 */
    void occupy(String serverId, int seatId, int evolution, String roleId, long now, long end) {
        if (jdbc.update("""
                UPDATE game_rainbow_seat SET evolution=?,role_id=?,occupied_at=?,expires_at=?
                 WHERE server_id=? AND seat_id=?
                """, evolution, roleId, now, end, serverId, seatId) == 0) {
            jdbc.update("""
                    INSERT INTO game_rainbow_seat(server_id,seat_id,evolution,role_id,occupied_at,expires_at)
                    VALUES (?,?,?,?,?,?)
                    """, serverId, seatId, evolution, roleId, now, end);
        }
    }

    /** 释放指定占位者并保留进化记录。区服锁保证过期清理不会清空后来胜者。 */
    void clear(Occupation occupation) {
        jdbc.update("""
                UPDATE game_rainbow_seat SET role_id=NULL,occupied_at=0,expires_at=0
                 WHERE server_id=? AND seat_id=? AND role_id=?
                """, occupation.serverId(), occupation.seatId(), occupation.roleId());
    }

    /** 查询玩家的失败冷却截止毫秒，0 表示从未进入冷却。 */
    long cooldown(String roleId) {
        return jdbc.query("SELECT ends_at FROM game_rainbow_cooldown WHERE role_id=?",
                row -> row.next() ? row.getLong(1) : 0L, roleId);
    }

    /** 同一角色锁内更新失败冷却，成功场次不调用。 */
    void setCooldown(String roleId, long end) {
        if (jdbc.update("UPDATE game_rainbow_cooldown SET ends_at=? WHERE role_id=?", end, roleId) == 0) {
            jdbc.update("INSERT INTO game_rainbow_cooldown(role_id,ends_at) VALUES (?,?)", roleId, end);
        }
    }

    /** 查找本人同一次已提交战斗，重试沿用原战报。 */
    Attempt attempt(String roleId, String requestId) {
        return jdbc.query("SELECT * FROM game_rainbow_attempt WHERE role_id=? AND request_id=?",
                row -> row.next() ? attempt(row) : null, roleId, requestId);
    }

    /** 同时记录胜负，角色重连不会为同一请求再打一次。 */
    void save(Attempt value) {
        jdbc.update("""
                INSERT INTO game_rainbow_attempt(role_id,request_id,server_id,seat_id,evolution_step,lineup_version,
                    battle_id,attacker_name,attacker_power,won,fought_at,replay) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                """, value.roleId(), value.requestId(), value.serverId(), value.seatId(), value.step(),
                value.lineupVersion(), value.battleId(), value.name(), value.power(), value.won(), value.foughtAt(),
                value.replay());
    }

    /** 仅查询本服该神位最近成功记录，单页上限使用旧配置。 */
    List<Attempt> history(String serverId, int seatId, int limit) {
        return jdbc.query("""
                SELECT * FROM game_rainbow_attempt WHERE server_id=? AND seat_id=? AND won=TRUE
                 ORDER BY fought_at DESC,battle_id DESC LIMIT ?
                """, (row, index) -> attempt(row), serverId, seatId, limit);
    }

    /** 扫描已到期的区服供定时释放；与业务请求共用同一过期处理入口。 */
    List<String> dueServers(long now) {
        return jdbc.queryForList("""
                SELECT DISTINCT server_id FROM game_rainbow_seat WHERE expires_at>0 AND expires_at<=?
                ORDER BY server_id
                """, String.class, now);
    }

    /** 持久记录通知，邮件暂不可投递时保留任务。 */
    void enqueueNotice(Occupation previous, boolean expired) {
        jdbc.update("INSERT INTO game_rainbow_notice(id,role_id,seat_id,expired) VALUES (?,?,?,?)",
                UUID.randomUUID().toString(), previous.roleId(), previous.seatId(), expired);
    }

    /** 分页按编号扫描，个别邮箱已满时后续邮件仍可处理。 */
    List<String> noticeIds(String afterId, int limit) {
        return jdbc.queryForList("SELECT id FROM game_rainbow_notice WHERE id>? ORDER BY id LIMIT ?",
                String.class, afterId, limit);
    }

    /** 锁住一封待投递邮件，避免两个后台实例重复发送。 */
    Notice lockNotice(String id) {
        return jdbc.query("SELECT id,role_id,seat_id,expired FROM game_rainbow_notice WHERE id=? FOR UPDATE",
                row -> row.next() ? new Notice(row.getString(1), row.getString(2), row.getInt(3), row.getBoolean(4))
                        : null, id);
    }

    /** 邮件入箱后同事务移除该待投递任务。 */
    void removeNotice(String id) {
        jdbc.update("DELETE FROM game_rainbow_notice WHERE id=?", id);
    }

    /** 数据库存储 Unix 毫秒，空位的时间转换为纪元。 */
    private static Occupation occupation(ResultSet row) throws SQLException {
        return new Occupation(row.getString(1), row.getInt(2), row.getInt(3), row.getString(4),
                Instant.ofEpochMilli(row.getLong(5)), Instant.ofEpochMilli(row.getLong(6)));
    }

    /** 恢复与挑战编号关联的原始保存字段。 */
    private static Attempt attempt(ResultSet row) throws SQLException {
        return new Attempt(row.getString("role_id"), row.getString("request_id"), row.getString("server_id"),
                row.getInt("seat_id"), row.getInt("evolution_step"), row.getLong("lineup_version"),
                row.getString("battle_id"), row.getString("attacker_name"), row.getInt("attacker_power"),
                row.getBoolean("won"), row.getLong("fought_at"), row.getBytes("replay"));
    }
}
