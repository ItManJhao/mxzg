package com.funsgamex.mxzg.lineup;

import java.util.ArrayList;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LineupRepository {
    private final JdbcTemplate jdbc;
    public LineupRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Lineup read(String roleId) {
        // One query gives a consistent version and slot set, including an empty lineup.
        return jdbc.query("SELECT r.lineup_version, s.position, s.hero_id FROM game_role r " +
            "LEFT JOIN game_lineup_slot s ON s.role_id = r.id WHERE r.id = ? ORDER BY s.position",
            rows -> {
                if (!rows.next()) throw new IllegalStateException("Role missing");
                long version = rows.getLong("lineup_version");
                var slots = new ArrayList<Lineup.Slot>();
                do {
                    String heroId = rows.getString("hero_id");
                    if (heroId != null) slots.add(new Lineup.Slot(rows.getInt("position"), heroId));
                } while (rows.next());
                return new Lineup(version, slots);
            }, roleId);
    }

    public long lockVersion(String roleId) {
        return jdbc.queryForObject("SELECT lineup_version FROM game_role WHERE id = ? FOR UPDATE", Long.class, roleId);
    }
    public void replace(String roleId, java.util.List<Lineup.Slot> slots) {
        jdbc.update("DELETE FROM game_lineup_slot WHERE role_id = ?", roleId);
        for (var slot : slots) jdbc.update("INSERT INTO game_lineup_slot(role_id, position, hero_id) VALUES (?, ?, ?)",
            roleId, slot.position(), slot.heroId());
        jdbc.update("UPDATE game_role SET lineup_version = lineup_version + 1 WHERE id = ?", roleId);
    }
}
