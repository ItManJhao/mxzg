/** 按角色读取持久英雄；列表和详情共用映射，不生成展示用资产。 */
package com.funsgamex.mxzg.hero;

import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class HeroRepository {
    /** 以角色曾经实际达到的最高星级解锁形象，英雄离开名册时保留进度。 */
    public record Illustration(int templateId, int maxStar) {}

    /** 已核对的旧基础成长规则，仅计算基础属性，不冒充装备等完整加成。 */
    private final HeroGrowthRules rules;
    /** 一次查询映射自身锁定与主线阵容占用；不逐英雄补查。 */
    private HeroProfile map(java.sql.ResultSet row,int index) throws java.sql.SQLException { return new HeroProfile(
        row.getString("id"), row.getInt("template_id"), row.getInt("hero_level"), row.getInt("star"), row.getBoolean("is_locked"), row.getBoolean("deployed"), row.getInt("stage"), rules.stats(row.getInt("template_id"),row.getInt("star"),row.getInt("hero_level"),row.getInt("stage")),null,null,readEvolution(row),null,Map.of()); }
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
    /** 当前角色全部已镶嵌宝石的批量读取入口。 */
    private final HeroJewelRepository jewels;
    /** 单枚宝石与全部三槽套装共用的权威规则。 */
    private final HeroJewelRules jewelRules;
    /** 当前角色已穿戴神装的批量读取入口。 */
    private final GodEquipmentRepository godEquipment;
    /** 神装基础、随机属性和套装查询共用规则。 */
    private final GodEquipmentRules godEquipmentRules;

    /** 注入持久名册和穿戴来源，列表与详情共用同一属性构造。 */
    public HeroRepository(JdbcTemplate jdbc, HeroGrowthRules rules, HeroEquipmentRepository equipment,
                          HeroPanelRules panelRules, HeroSkillPanelRules skillRules, HeroEvolutionRules evolutionRules,
                          HeroJewelRepository jewels, HeroJewelRules jewelRules,
                          GodEquipmentRepository godEquipment, GodEquipmentRules godEquipmentRules) {
        this.jdbc = jdbc;
        this.rules = rules;
        this.equipment = equipment;
        this.panelRules = panelRules;
        this.skillRules = skillRules;
        this.evolutionRules = evolutionRules;
        this.jewels = jewels;
        this.jewelRules = jewelRules;
        this.godEquipment = godEquipment;
        this.godEquipmentRules = godEquipmentRules;
    }

    /** 读取本角色全部实例及主线阵容占用，界面排序由旧版展示规则决定。 */
    public List<HeroProfile> list(String roleId) {
        var equipped = equipment.equipped(roleId);
        var gems = jewels.byRole(roleId);
        var divine = godEquipment.equipped(roleId);
        return jdbc.query("SELECT h.*, EXISTS (SELECT 1 FROM game_lineup_slot s WHERE s.role_id=h.role_id AND s.hero_id=h.id) AS deployed FROM game_hero h WHERE h.role_id = ? ORDER BY id", this::map, roleId)
            .stream().map(hero -> withLoadout(hero, equipped.get(hero.id()), gems.getOrDefault(hero.id(), List.of()),
                    divine.getOrDefault(hero.id(), List.of()))).toList();
    }
    /** 以角色和实例双条件查询，禁止跨角色取得英雄。 */
    public Optional<HeroProfile> find(String roleId, String heroId) {
        return jdbc.query("SELECT h.*, EXISTS (SELECT 1 FROM game_lineup_slot s WHERE s.role_id=h.role_id AND s.hero_id=h.id) AS deployed FROM game_hero h WHERE h.role_id = ? AND h.id = ?", this::map, roleId, heroId)
            .stream().findFirst().map(hero -> withLoadout(hero, equipment.equipped(roleId).get(heroId),
                    jewels.byRole(roleId).getOrDefault(heroId, List.of()),
                    godEquipment.equipped(roleId).getOrDefault(heroId, List.of())));
    }

    /** 合并同编号培养属性，面板和主线复用结果，保留宝石槽在名册中同步。 */
    private HeroProfile withLoadout(HeroProfile hero, HeroEquipmentRepository.State equipmentState,
                                   List<HeroJewelRepository.Item> gemSlots,
                                   List<GodEquipmentRepository.Item> divineSlots) {
        var attributes = new HashMap<Integer, Long>();
        jewelRules.addAttributes(gemSlots, (type, value) -> attributes.merge(type, value, Math::addExact));
        godEquipmentRules.contribute(divineSlots, (type, value) -> attributes.merge(type, value, Math::addExact));
        var ordinary = equipmentState == null ? new HeroEquipmentRepository.State(List.of()) : equipmentState;
        return hero.withLoadout(ordinary, new HeroProfile.Gems(gemSlots), attributes, panelRules, skillRules,
                evolutionRules, !godEquipmentRules.setSkills(divineSlots).isEmpty());
    }

    /** 读取本角色持久图鉴，供个人空间生成已解锁形象。 */
    public List<Illustration> illustrations(String roleId) {
        return jdbc.query("SELECT template_id,max_star FROM game_hero_illustration WHERE role_id=? ORDER BY template_id",
            (row, index) -> new Illustration(row.getInt("template_id"), row.getInt("max_star")), roleId);
    }

    /** 调用者持有角色锁并已保存真实英雄实例，图鉴只提高该模板的历史最高星级。 */
    public void recordIllustration(String roleId, int templateId, int star) {
        Integer previous = jdbc.query("SELECT max_star FROM game_hero_illustration WHERE role_id=? AND template_id=?",
            row -> row.next() ? row.getInt("max_star") : null, roleId, templateId);
        if (previous == null) {
            jdbc.update("INSERT INTO game_hero_illustration(role_id,template_id,max_star) VALUES (?,?,?)",
                roleId, templateId, star);
        } else if (star > previous) {
            jdbc.update("UPDATE game_hero_illustration SET max_star=? WHERE role_id=? AND template_id=?",
                star, roleId, templateId);
        }
    }
}
