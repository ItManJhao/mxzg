package com.funsgamex.mxzg.hero;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class HeroRepository {
    private static final RowMapper<HeroProfile> MAPPER = (row, index) -> new HeroProfile(
        row.getString("id"), row.getInt("template_id"), row.getInt("hero_level"), row.getInt("star"));
    private final JdbcTemplate jdbc;
    public HeroRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<HeroProfile> list(String roleId) {
        return jdbc.query("SELECT * FROM game_hero WHERE role_id = ? ORDER BY id", MAPPER, roleId);
    }
    public Optional<HeroProfile> find(String roleId, String heroId) {
        return jdbc.query("SELECT * FROM game_hero WHERE role_id = ? AND id = ?", MAPPER, roleId, heroId)
            .stream().findFirst();
    }
}
