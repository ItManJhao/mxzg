/**
 * 维护当前游戏实例所承载的区服，向登录和玩法维护提供真实数据库行。
 * 匿名选服另走目录投影，可包含管理员登记的远端个人服，远端条目没有本库写入权限。
 */
package com.funsgamex.mxzg.server;

import java.util.List;
import java.util.Optional;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
@DependsOnDatabaseInitialization
public class ServerCatalog {
    /** 区服的稳定编号、所属分组和显示配置。socketUrl 仅在目录指向其他实例时返回。 */
    public record Server(String id, String regionId, String regionName, String name, boolean enabled, String socketUrl) {}

    /** Spring 注入的当前实例数据库，用于区服登记和在线状态校验。 */
    private final JdbcTemplate jdbc;
    /** 只在内网测试环境装配的目录；其他环境沿用本库的区服列表。 */
    private final Optional<LanServerDirectory> lan;
    /** 个人实例只接纳该区服，空串代表在本库中选择逻辑区服。 */
    private final String personalId;

    /** 在既有数据库迁移完成后初始化个人实例身份，普通实例仅保存依赖。 */
    public ServerCatalog(JdbcTemplate jdbc, Optional<LanServerDirectory> lan, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.lan = lan;
        this.personalId = lan.map(LanServerDirectory::personalId).orElse("");
        if (!personalId.isEmpty()) {
            new TransactionTemplate(transactions).executeWithoutResult(status ->
                    registerPersonalServer(lan.orElseThrow().personalName()));
        }
    }

    /** 在个人专用库中的启动事务内登记区服；拒绝复用已有其他角色或其他个人服身份的数据库。 */
    private void registerPersonalServer(String name) {
        // 所有新开发库均有 V3 的种子行，锁住同一行使并发启动的实例先后判断该库归属。
        jdbc.queryForObject("SELECT id FROM game_server WHERE id='local-1' FOR UPDATE", String.class);
        if (!jdbc.queryForList("SELECT id FROM game_role WHERE server_id<>? LIMIT 1", String.class, personalId).isEmpty()
                || !jdbc.queryForList("SELECT id FROM game_server WHERE region_id='lan-personal' AND id<>? LIMIT 1",
                        String.class, personalId).isEmpty()) {
            throw new IllegalStateException("个人服必须使用自己的独立测试库");
        }
        var regions = jdbc.queryForList("SELECT region_id FROM game_server WHERE id=?", String.class, personalId);
        if (regions.isEmpty()) {
            jdbc.update("INSERT INTO game_server(id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,?)",
                    personalId, "lan-personal", "个人开发服", name, true);
        } else if (regions.getFirst().equals("lan-personal")) {
            // 改显示名不重新开服，不重置 enabled、开服时间或角色。
            jdbc.update("UPDATE game_server SET server_name=? WHERE id=?", name, personalId);
        } else {
            throw new IllegalStateException("个人服 ID 已被本库的其他区服占用");
        }
    }

    /** 返回本机可以维护和接收登录的真实区服，个人模式限定自己的持久区服行。 */
    public List<Server> list() {
        var rows = jdbc.query("SELECT id,region_id,region_name,server_name,enabled FROM game_server ORDER BY region_id,id",
                (row, index) -> new Server(row.getString("id"), row.getString("region_id"),
                        row.getString("region_name"), row.getString("server_name"), row.getBoolean("enabled"), null));
        return personalId.isEmpty() ? rows : rows.stream().filter(server -> personalId.equals(server.id())).toList();
    }

    /** 匿名选服列表按请求读取当前登记；登录、排行榜和定时维护始终使用 list()。 */
    public List<Server> published() {
        var hosted = list();
        return lan.map(directory -> directory.publish(hosted)).orElse(hosted);
    }

    /** 验证区服处于本机承载范围且已经启用，拒绝向当前实例登录到远程区服。 */
    public String require(String id) {
        String selected = id == null ? (personalId.isEmpty() ? "local-1" : personalId) : id;
        if (list().stream().noneMatch(server -> server.id().equals(selected) && server.enabled())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SERVER_UNAVAILABLE");
        }
        return selected;
    }

    /** 个人服恢复令牌前再核对角色的持久区服与开放状态，避免接管外服角色的会话。 */
    public void requireResumableRole(String roleId) {
        if (!personalId.isEmpty() && jdbc.queryForList("""
                SELECT r.id FROM game_role r JOIN game_server s ON s.id=r.server_id
                WHERE r.id=? AND s.id=? AND s.enabled=TRUE
                """, String.class, roleId, personalId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
    }
}
