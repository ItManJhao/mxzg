/**
 * 永恒梦境助战持久化：由梦境服务在角色锁内保存当日派遣快照及已选好友。
 * 只有同区服的双向好友可读取派遣，关系解除后既有战斗仍使用开战时冻结的攻方。
 */
package com.funsgamex.mxzg.dreamland;

import com.funsgamex.mxzg.hero.HeroEquipmentRepository;
import com.funsgamex.mxzg.hero.HeroEvolutionRules;
import com.funsgamex.mxzg.hero.HeroGrowthRules;
import com.funsgamex.mxzg.hero.HeroProfile;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
class DreamlandAssistRepository {
    /** 双向关系、同服及黑名单在一次读取中校验，避免分别读取时组合出无效的候选。 */
    private static final String FRIEND_DISPATCHES = """
            SELECT sender.id, sender.nickname, dispatch.hero_json
            FROM game_friend_relation relation
            JOIN game_friend_relation reverse_relation
                ON reverse_relation.role_id = relation.target_id AND reverse_relation.target_id = relation.role_id
            JOIN game_role borrower ON borrower.id = relation.role_id
            JOIN game_role sender ON sender.id = relation.target_id AND sender.server_id = borrower.server_id
            JOIN game_dreamland_dispatch dispatch ON dispatch.role_id = sender.id
            WHERE borrower.id = :role AND dispatch.reset_at_seconds = :reset
                AND NOT EXISTS (SELECT 1 FROM game_friend_block blocked
                    WHERE blocked.role_id = borrower.id AND blocked.target_id = sender.id)
                AND NOT EXISTS (SELECT 1 FROM game_friend_block blocked
                    WHERE blocked.role_id = sender.id AND blocked.target_id = borrower.id)
            """;

    /** 派遣时冻结面板战力及战斗原始输入；借用时不重新读取派遣人的装备及进化。 */
    record HeroSnapshot(String id, int templateId, int level, int star, int stage, int power,
                        HeroGrowthRules.Stats baseStats, HeroEquipmentRepository.State equipment,
                        HeroEvolutionRules.State evolution, Map<Integer, Long> growthAttributes,
                        List<HeroEvolutionRules.Skill> loadoutSkills) {
        /** 提取可序列化的完整战斗来源，包括名册网络快照有意省略的加成与套装技能。 */
        static HeroSnapshot capture(HeroProfile hero) {
            return new HeroSnapshot(hero.id(), hero.templateId(), hero.level(), hero.star(), hero.stage(),
                    hero.panelStats().power(), hero.baseStats(), hero.equipment(), hero.evolution(),
                    hero.growthAttributes(), hero.loadoutSkills());
        }

        /** 仅供战斗组装和站位校验使用，组装时会应用借用人的当前阵型。 */
        HeroProfile battleHero() {
            return new HeroProfile(id, templateId, level, star, false, false, stage, baseStats, equipment,
                    null, evolution, null, growthAttributes, loadoutSkills);
        }
    }

    /** 将确认过区服及关系的派遣人身份与冻结英雄配对。 */
    record Dispatch(String roleId, String roleName, HeroSnapshot hero) {
        /** 只向客户端公开头像、站位、战力提示所需的字段。 */
        DreamlandService.AssistHero view() {
            return new DreamlandService.AssistHero(roleId, roleName, hero.id(), hero.templateId(), hero.level(),
                    hero.star(), hero.power());
        }
    }

    /** 当前借用人选择的派遣角色和英雄 ID；同一个角色下一天可以派遣其他英雄。 */
    record Selection(String senderId, String heroId) {}

    /** 与梦境进度和资产使用同一个数据库事务。 */
    private final NamedParameterJdbcTemplate jdbc;
    /** 只序列化派遣时的内部战斗快照。 */
    private final ObjectMapper mapper;

    /** 注入共用连接和 JSON 序列化器。 */
    DreamlandAssistRepository(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    /** 返回角色本日派遣，跨日旧行不会阻止再次派遣。 */
    Dispatch ownDispatch(String role, long resetAt) {
        return jdbc.query("""
                SELECT sender.id, sender.nickname, dispatch.hero_json
                FROM game_dreamland_dispatch dispatch JOIN game_role sender ON sender.id = dispatch.role_id
                WHERE sender.id = :role AND dispatch.reset_at_seconds = :reset
                """, Map.of("role", role, "reset", resetAt), this::readDispatch).stream().findFirst().orElse(null);
    }

    /** 列出当日已派遣的同区服好友，战力上限由借用人的名册确定。 */
    List<Dispatch> available(String role, long resetAt) {
        return jdbc.query(FRIEND_DISPATCHES + " ORDER BY sender.nickname, sender.id",
                Map.of("role", role, "reset", resetAt), this::readDispatch);
    }

    /** 重新核验指定好友仍有当日派遣；不存在、跨区、已移除或已拉黑均返回空。 */
    Dispatch availableFrom(String role, String sender, long resetAt) {
        return jdbc.query(FRIEND_DISPATCHES + " AND sender.id = :sender",
                Map.of("role", role, "reset", resetAt, "sender", sender), this::readDispatch)
                .stream().findFirst().orElse(null);
    }

    /** 在派遣人角色锁内覆盖上个自然日的快照，首日派遣时创建持久行。 */
    void saveDispatch(String role, long resetAt, HeroSnapshot hero) {
        var args = Map.of("role", role, "reset", resetAt, "hero", mapper.writeValueAsString(hero));
        if (jdbc.update("""
                UPDATE game_dreamland_dispatch SET reset_at_seconds = :reset, hero_json = :hero WHERE role_id = :role
                """, args) == 0) {
            jdbc.update("""
                    INSERT INTO game_dreamland_dispatch(role_id, reset_at_seconds, hero_json) VALUES(:role, :reset, :hero)
                    """, args);
        }
    }

    /** 查找指定自然日的选择，用于再次校验以及从阵容移除旧英雄。 */
    Selection selection(String role, long resetAt) {
        return jdbc.query("""
                SELECT sender_id, hero_id FROM game_dreamland_borrow WHERE role_id = :role AND reset_at_seconds = :reset
                """, Map.of("role", role, "reset", resetAt),
                (row, index) -> new Selection(row.getString("sender_id"), row.getString("hero_id")))
                .stream().findFirst().orElse(null);
    }

    /** 保存已在角色锁内核验的当日选择，后续仍会按最新好友关系及战力复查。 */
    void saveSelection(String role, long resetAt, Dispatch dispatch) {
        var args = Map.of("role", role, "reset", resetAt, "sender", dispatch.roleId(), "hero", dispatch.hero().id());
        if (jdbc.update("""
                UPDATE game_dreamland_borrow SET sender_id = :sender, hero_id = :hero, reset_at_seconds = :reset
                WHERE role_id = :role
                """, args) == 0) {
            jdbc.update("""
                    INSERT INTO game_dreamland_borrow(role_id, sender_id, hero_id, reset_at_seconds)
                    VALUES(:role, :sender, :hero, :reset)
                    """, args);
        }
    }

    /** 在取消选择或跨日变更阵容的同一事务删除选择。 */
    void clearSelection(String role) {
        jdbc.update("DELETE FROM game_dreamland_borrow WHERE role_id = :role", Map.of("role", role));
    }

    /** 还原派遣时的内部战斗快照，持久数据损坏时拒绝带缺项开战。 */
    private Dispatch readDispatch(ResultSet row, int index) throws SQLException {
        var hero = mapper.readValue(row.getString("hero_json"), HeroSnapshot.class);
        return new Dispatch(row.getString("id"), row.getString("nickname"), hero);
    }
}
