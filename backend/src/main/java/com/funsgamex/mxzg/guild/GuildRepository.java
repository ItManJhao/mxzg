/**
 * 公会持久化查询和事务写入。
 * 成员唯一归属由数据库保护，成员与申请列表始终从当前角色和公会记录投影。
 */
package com.funsgamex.mxzg.guild;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class GuildRepository {
    /** 同一游戏数据库中的公会及角色事务。 */
    private final JdbcTemplate jdbc;
    /** 名册和推荐列表共用的公会等级配置。 */
    private final GuildRules rules;
    /** 按已校验的配置整数在数据库内判定空位，让排序先于分页。 */
    private final String capacityByLevel;

    /** 成员身份读取或写操作加锁后使用的公会信息。 */
    record Guild(String id, String name, String leaderId, String description, int badgeId, int level, int experience) {
        /** 用当前人数与持久等级生成公会概要，成员页和推荐页采用同一投影。 */
        GuildService.Summary summary(int memberCount, GuildRules rules) {
            var configured = rules.level(level);
            return new GuildService.Summary(id, name, memberCount, configured.capacity(), description,
                badgeId, level, experience, configured.nextLevelExperience());
        }
    }

    /** 注入数据库与等级配置，准备区服推荐页的容量排序表达式。 */
    GuildRepository(JdbcTemplate jdbc, GuildRules rules) {
        this.jdbc = jdbc;
        this.rules = rules;
        capacityByLevel = rules.gate.levels().stream()
            .map(level -> " WHEN " + level.level() + " THEN " + level.capacity())
            .collect(Collectors.joining("", "CASE g.guild_level", " END"));
    }

    /** 将当前持久行映射为同一公会记录，供目录、成员身份与加锁查询复用。 */
    private static Guild readGuild(ResultSet row, int index) throws SQLException {
        return new Guild(row.getString("id"), row.getString("name"), row.getString("leader_role_id"),
            row.getString("description"), row.getInt("badge_id"), row.getInt("guild_level"), row.getInt("experience"));
    }

    /** 查角色当前公会，同区服条件同时保护跨服读取。 */
    Guild memberGuild(String roleId) {
        return jdbc.query("""
            SELECT g.* FROM game_guild_member m
            JOIN game_guild g ON g.id=m.guild_id JOIN game_role r ON r.id=m.role_id AND r.server_id=g.server_id
            WHERE m.role_id=?
            """, GuildRepository::readGuild, roleId).stream().findFirst().orElse(null);
    }

    /** 锁住同区服公会，容量、会长权限及解散从这条持久行串行判断。 */
    Guild lockGuild(String serverId, String guildId) {
        return jdbc.query("""
            SELECT * FROM game_guild WHERE server_id=? AND id=? FOR UPDATE
            """, GuildRepository::readGuild, serverId, guildId).stream().findFirst().orElse(null);
    }

    /** 首次创建写入公会及选中的徽章，区服内原始名称摘要由唯一约束保护。 */
    void insertGuild(String id, String serverId, String leaderId, String name, String nameKey,
                     String description, int badgeId, long now) {
        jdbc.update("""
            INSERT INTO game_guild(id,server_id,name,name_key,description,leader_role_id,created_at_seconds,badge_id)
            VALUES (?,?,?,?,?,?,?,?)
            """, id, serverId, name, nameKey, description, leaderId, now, badgeId);
    }

    /** 持有角色及公会锁时加入，角色主键禁止同时加入两个公会。 */
    void insertMember(String guildId, String roleId, long now) {
        jdbc.update("INSERT INTO game_guild_member(role_id,guild_id,joined_at_seconds) VALUES (?,?,?)",
            roleId, guildId, now);
    }

    /** 持有公会锁时保存通过审核的公告，其他资料沿用原值。 */
    void updateNotice(String guildId, String notice) {
        jdbc.update("UPDATE game_guild SET description=? WHERE id=?", notice, guildId);
    }

    /** 读取本公会当前人数，用于容量和会长退出限制。 */
    int memberCount(String guildId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_guild_member WHERE guild_id=?", Integer.class, guildId);
    }

    /** 汇总在事务中已存在的真实成员标识，提交时通知公会页刷新。 */
    List<String> memberIds(String guildId) {
        return jdbc.queryForList("SELECT role_id FROM game_guild_member WHERE guild_id=?", String.class, guildId);
    }

    /** 同查成员资料与当前主阵战力，会长优先，余下按加入顺序。 */
    List<GuildService.Member> members(Guild guild) {
        return jdbc.query("""
            SELECT r.id,r.nickname,r.role_level,r.head_id,r.border_id,r.current_main_power FROM game_guild_member m
            JOIN game_role r ON r.id=m.role_id WHERE m.guild_id=?
            ORDER BY CASE WHEN r.id=? THEN 0 ELSE 1 END,m.joined_at_seconds,r.id
            """, (row, index) -> new GuildService.Member(row.getString(1), row.getString(2), row.getInt(3),
            guild.leaderId().equals(row.getString(1)), row.getInt(4), row.getInt(5),
            row.getObject("current_main_power", Integer.class)), guild.id(), guild.leaderId());
    }

    /** 会长读取申请者当前头像、头像框和主阵战力，排序与申请顺序一致。 */
    List<GuildService.Member> applicants(String guildId) {
        return jdbc.query("""
            SELECT r.id,r.nickname,r.role_level,r.head_id,r.border_id,r.current_main_power FROM game_guild_application a
            JOIN game_role r ON r.id=a.role_id WHERE a.guild_id=? ORDER BY a.applied_at_seconds,r.id
            """, (row, index) -> new GuildService.Member(row.getString(1), row.getString(2), row.getInt(3), false,
            row.getInt(4), row.getInt(5), row.getObject("current_main_power", Integer.class)),
            guildId);
    }

    /** 按本会等级统计真实空位后分页，搜索仍按建会顺序返回。 */
    List<GuildService.Summary> browse(String serverId, String query, int limit, long offset) {
        return jdbc.query("""
            SELECT g.id,g.name,g.leader_role_id,g.description,g.badge_id,g.guild_level,g.experience,
                   COUNT(m.role_id) AS member_count
            FROM game_guild g LEFT JOIN game_guild_member m ON m.guild_id=g.id
            WHERE g.server_id=? AND (?='' OR LOCATE(?,g.name)>0)
            GROUP BY g.id,g.name,g.leader_role_id,g.description,g.badge_id,g.guild_level,g.experience,g.created_at_seconds
            ORDER BY CASE WHEN ?='' AND COUNT(m.role_id)>=(%s) THEN 1 ELSE 0 END,g.created_at_seconds DESC,g.id
            LIMIT ? OFFSET ?
            """.formatted(capacityByLevel),
            (row, index) -> readGuild(row, index).summary(row.getInt("member_count"), rules),
            serverId, query, query, query, limit, offset);
    }

    /** 查询该角色仍有效的申请标记，供推荐列表同步按钮。 */
    List<String> appliedGuilds(String roleId) {
        return jdbc.queryForList("SELECT guild_id FROM game_guild_application WHERE role_id=? ORDER BY guild_id",
            String.class, roleId);
    }

    /** 仅查询目标公会确实存在的待审申请。 */
    boolean hasApplication(String guildId, String roleId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_guild_application WHERE guild_id=? AND role_id=?",
            Integer.class, guildId, roleId) == 1;
    }

    /** 角色及公会锁内新增一条申请，服务层处理重复申请。 */
    void insertApplication(String guildId, String roleId, long now) {
        jdbc.update("INSERT INTO game_guild_application(guild_id,role_id,applied_at_seconds) VALUES (?,?,?)",
            guildId, roleId, now);
    }

    /** 拒绝时只撤销本公会的一条申请。 */
    void deleteApplication(String guildId, String roleId) {
        jdbc.update("DELETE FROM game_guild_application WHERE guild_id=? AND role_id=?", guildId, roleId);
    }

    /** 加入公会后撤销全部待审申请，返回对应公会会长供页面刷新。 */
    List<String> clearApplications(String roleId) {
        var leaders = jdbc.queryForList("""
            SELECT DISTINCT g.leader_role_id FROM game_guild_application a
            JOIN game_guild g ON g.id=a.guild_id WHERE a.role_id=?
            """, String.class, roleId);
        jdbc.update("DELETE FROM game_guild_application WHERE role_id=?", roleId);
        return leaders;
    }

    /** 单人成员离开时清理公会选择和所有申请，返回原申请者供推荐页刷新。 */
    List<String> removeGuild(String guildId) {
        var applicants = jdbc.queryForList("SELECT role_id FROM game_guild_application WHERE guild_id=?",
            String.class, guildId);
        jdbc.update("DELETE FROM game_guild_application WHERE guild_id=?", guildId);
        jdbc.update("DELETE FROM game_guild WHERE id=?", guildId);
        return applicants;
    }

    /** 退出事务内删除成员，并保存该角色下次可申请的时间。 */
    void leave(String guildId, String roleId, long rejoinAtSeconds) {
        jdbc.update("DELETE FROM game_guild_member WHERE guild_id=? AND role_id=?", guildId, roleId);
        if (jdbc.update("UPDATE game_guild_leave SET rejoin_at_seconds=? WHERE role_id=?", rejoinAtSeconds, roleId) == 0) {
            jdbc.update("INSERT INTO game_guild_leave(role_id,rejoin_at_seconds) VALUES (?,?)", roleId, rejoinAtSeconds);
        }
    }

    /** 查询主动退出的截止秒，尚未发生主动退出时为 0。 */
    long rejoinAt(String roleId) {
        return jdbc.queryForList("SELECT rejoin_at_seconds FROM game_guild_leave WHERE role_id=?", Long.class, roleId)
            .stream().findFirst().orElse(0L);
    }

    /** 角色配置启用累计充值门槛时读取真实持久充值点。 */
    long recharge(String roleId) {
        return jdbc.queryForObject("SELECT total_recharge FROM game_role WHERE id=?", Long.class, roleId);
    }

    /** 读取此前成功提交的命令摘要，相同请求编号更换动作或参数会被拒绝。 */
    String commandKey(String roleId, String requestId) {
        return jdbc.queryForList("SELECT command_key FROM game_guild_command WHERE role_id=? AND request_id=?",
            String.class, roleId, requestId).stream().findFirst().orElse(null);
    }

    /** 公会操作与提交标记在同一事务内写入，回滚时可重试。 */
    void saveCommand(String roleId, String requestId, String commandKey) {
        jdbc.update("INSERT INTO game_guild_command(role_id,request_id,command_key) VALUES (?,?,?)",
            roleId, requestId, commandKey);
    }
}
