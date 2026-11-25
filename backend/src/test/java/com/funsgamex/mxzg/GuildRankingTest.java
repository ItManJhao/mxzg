/** 验证公会本服排行的聚合口径、排序、榜外本人行和开放条件。 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.funsgamex.mxzg.guild.GuildRankingService;
import com.funsgamex.mxzg.guild.GuildRankingService.Entry;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:guild_ranking;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class GuildRankingTest {
    /** 按已认证角色读取完整真实榜单。 */
    @Autowired private GuildRankingService ranking;
    /** 准备隔离库中可明确区分现役战力和峰值的角色。 */
    @Autowired private JdbcTemplate jdbc;

    /** 主榜累加在会成员历史战力，同分稳定，同服隔离，榜外角色仍有自己的公会。 */
    @Test
    void aggregatesOnlyMembersAndProjectsOwnRank() {
        String first = role("local-1", "首领", 18, 150, 12);
        String squad = guild("local-1", "海鸥", first, 120);
        String secondMember = role("local-1", "成员", 18, 100, 3);
        join(squad, secondMember);
        String earlier = guild("local-1", "薄荷", role("local-1", "薄荷会长", 18, 90, 30), 90);
        String later = guild("local-1", "盾牌", role("local-1", "盾牌会长", 18, 90, 25), 130);
        String ownZero = role("local-1", "零分会长", 18, 0, 0);
        String zero = guild("local-1", "新公会", ownZero, 100);
        String outsider = role("local-1", "路人", 18, 1000, 1000);
        String closed = role("local-1", "未开放", 17, 0, 0);
        String foreign = role("local-2", "另一服会长", 18, 500, 90);
        String foreignGuild = guild("local-2", "另一服公会", foreign, 80);

        var state = ranking.list(secondMember);
        assertEquals(List.of(squad, earlier, later), state.entries().stream().map(Entry::guildId).toList());
        assertEquals(List.of(250L, 90L, 90L), state.entries().stream().map(Entry::power).toList());
        assertEquals("首领", state.entries().getFirst().leaderName());
        assertEquals(state.entries().getFirst(), state.own());
        assertEquals(0, ranking.list(ownZero).own().rank());
        assertEquals(zero, ranking.list(ownZero).own().guildId());
        assertNull(ranking.list(outsider).own());
        assertEquals(List.of(foreignGuild), ranking.list(foreign).entries().stream().map(Entry::guildId).toList());
        assertEquals("GUILD_LOCKED", assertThrows(ResponseStatusException.class, () -> ranking.list(closed)).getReason());

        jdbc.update("DELETE FROM game_guild_member WHERE role_id=?", secondMember);
        assertEquals(150, ranking.list(first).entries().getFirst().power());
    }

    /** 前一百名截断，超出的本人公会仍携带真实总分和未上榜标记。 */
    @Test
    void limitsThePublicListWithoutDroppingTheOwnGuild() {
        String server = "ranking-test";
        String ownRole = role(server, "末位会长", 18, 1, 1);
        String ownGuild = guild(server, "末位公会", ownRole, 200);
        for (int index = 0; index < 100; index++) {
            String owner = role(server, "会长" + index, 18, index + 2, 2);
            guild(server, "排行公会" + index, owner, 120);
        }
        var state = ranking.list(ownRole);
        assertEquals(100, state.entries().size());
        assertEquals(101, state.entries().getFirst().power());
        assertEquals(100, state.entries().getLast().rank());
        assertEquals(2, state.entries().getLast().power());
        assertEquals(ownGuild, state.own().guildId());
        assertEquals(0, state.own().rank());
        assertEquals(1, state.own().power());
    }

    /** 建立只用于查询核对的角色行，返回其真实持久 UUID。 */
    private String role(String server, String nickname, int level, int peak, int current) {
        String id = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO game_role (id,account_key,nickname,role_level,gold,diamonds,server_id,login_account,
                max_main_power,current_main_power) VALUES (?,?,?,?,0,0,?,?,?,?)
            """, id, id, nickname, level, server, id, peak, current);
        return id;
    }

    /** 按指定时刻建立公会和会长成员关系，返回公会 UUID。 */
    private String guild(String server, String name, String leader, long createdAt) {
        String id = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO game_guild (id,server_id,name,name_key,description,leader_role_id,created_at_seconds)
                VALUES (?,?,?,?,'',?,?)
            """, id, server, name, name, leader, createdAt);
        join(id, leader);
        return id;
    }

    /** 把本区服角色登记为公会正式成员。 */
    private void join(String guild, String member) {
        jdbc.update("INSERT INTO game_guild_member (role_id,guild_id,joined_at_seconds) VALUES (?,?,200)", member, guild);
    }
}
