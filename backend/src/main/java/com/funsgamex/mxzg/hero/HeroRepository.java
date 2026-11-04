/** 按角色读取持久英雄；列表和详情共用映射，不生成展示用资产。 */
package com.funsgamex.mxzg.hero;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class HeroRepository {
    /** 已核对的旧基础成长规则，仅计算基础属性，不冒充装备等完整加成。 */
    private final HeroGrowthRules rules;
    /** 一次查询映射自身锁定与主线阵容占用；不逐英雄补查。 */
    private HeroProfile map(java.sql.ResultSet row,int index) throws java.sql.SQLException { return new HeroProfile(
        row.getString("id"), row.getInt("template_id"), row.getInt("hero_level"), row.getInt("star"), row.getBoolean("is_locked"), row.getBoolean("deployed"), row.getInt("stage"), rules.stats(row.getInt("template_id"),row.getInt("star"),row.getInt("hero_level"),row.getInt("stage")),null,null,readEvolution(row)); }
    /** 从持久字段解析精确进化配置；不推断、不默认吞掉非法状态。 */
    private HeroEvolutionRules.State readEvolution(java.sql.ResultSet row) throws java.sql.SQLException {
        int type=row.getInt("evolve_type"),level=row.getInt("evolve_level");
        var definition=evolutionRules.resolve(row.getInt("template_id"),type,level);
        return new HeroEvolutionRules.State(type,level,definition.skill());
    }
    /** 与面板共用的服务端进化配置校验器。 */
    private final HeroEvolutionRules evolutionRules;
    /** 容器注入的数据库入口，只读取指定角色数据。 */
    private final JdbcTemplate jdbc;
    /** 快照共用的本角色持久装备读取入口。 */
    private final HeroEquipmentRepository equipment;
    /** 面板属性在同一快照读取时计算，不另存过期数值。 */
    private final HeroPanelRules panelRules;
    /** 技能面板贡献在服务器统一计算，客户端不重复叠加。 */
    private final HeroSkillPanelRules skillRules;
    /** 注入数据库访问入口。 */
    public HeroRepository(JdbcTemplate jdbc, HeroGrowthRules rules, HeroEquipmentRepository equipment,HeroPanelRules panelRules,HeroSkillPanelRules skillRules,HeroEvolutionRules evolutionRules) { this.jdbc = jdbc; this.rules=rules; this.equipment=equipment;this.panelRules=panelRules;this.skillRules=skillRules;this.evolutionRules=evolutionRules; }

    /** 读取本角色全部实例及主线阵容占用，界面排序由旧版展示规则决定。 */
    public List<HeroProfile> list(String roleId) {
        var equipped=equipment.equipped(roleId);
        return jdbc.query("SELECT h.*, EXISTS (SELECT 1 FROM game_lineup_slot s WHERE s.role_id=h.role_id AND s.hero_id=h.id) AS deployed FROM game_hero h WHERE h.role_id = ? ORDER BY id", this::map, roleId).stream().map(hero->hero.withEquipment(equipped.getOrDefault(hero.id(),new HeroEquipmentRepository.State(List.of())),panelRules,skillRules,evolutionRules)).toList();
    }
    /** 以角色和实例双条件查询，禁止跨角色取得英雄。 */
    public Optional<HeroProfile> find(String roleId, String heroId) {
        var equipped=equipment.equipped(roleId);
        return jdbc.query("SELECT h.*, EXISTS (SELECT 1 FROM game_lineup_slot s WHERE s.role_id=h.role_id AND s.hero_id=h.id) AS deployed FROM game_hero h WHERE h.role_id = ? AND h.id = ?", this::map, roleId, heroId)
            .stream().map(hero->hero.withEquipment(equipped.getOrDefault(hero.id(),new HeroEquipmentRepository.State(List.of())),panelRules,skillRules,evolutionRules)).findFirst();
    }
}
