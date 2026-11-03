/** 开放区服目录：供匿名 WS 选服和本地登录校验使用，不注册 HTTP 路由。 */
package com.funsgamex.mxzg.server;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** 数据来自本库实际区服配置，不伪造外部服务器地址。 */
@Service
public class ServerCatalog {
    public record Server(String id, String regionId, String regionName, String name, boolean enabled) {}
    private final JdbcTemplate jdbc;
    public ServerCatalog(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<Server> list() {
        return jdbc.query("SELECT * FROM game_server ORDER BY region_id,id", (row,index) ->
            new Server(row.getString("id"),row.getString("region_id"),row.getString("region_name"),row.getString("server_name"),row.getBoolean("enabled")));
    }
    public String require(String id) {
        String selected = id == null ? "local-1" : id;
        if (list().stream().noneMatch(server -> server.id().equals(selected) && server.enabled()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SERVER_UNAVAILABLE");
        return selected;
    }
}
