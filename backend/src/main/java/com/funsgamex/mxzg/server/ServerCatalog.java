package com.funsgamex.mxzg.server;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** These are logical worlds in this backend, not invented external endpoints. */
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Server unavailable");
        return selected;
    }
}

@RestController
@RequestMapping("/api/v1/servers")
class ServerController {
    private final ServerCatalog catalog;
    ServerController(ServerCatalog catalog) { this.catalog = catalog; }
    @GetMapping public List<ServerCatalog.Server> list() { return catalog.list(); }
}
