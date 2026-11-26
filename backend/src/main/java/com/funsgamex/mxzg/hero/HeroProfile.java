/** 持久英雄只读投影。面板合入生效的穿戴、神位、科技，未折算属性和套装技能供战斗使用。 */
package com.funsgamex.mxzg.hero;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public record HeroProfile(String id, int templateId, int level, int star, boolean locked, boolean deployed,
                          int stage, HeroGrowthRules.Stats baseStats, HeroEquipmentRepository.State equipment,
                          HeroPanelRules.State panelStats, HeroEvolutionRules.State evolution, Gems gems,
                          @JsonIgnore Map<Integer, Long> growthAttributes,
                          @JsonIgnore List<HeroEvolutionRules.Skill> loadoutSkills) {
    /** 唯一角色快照中的已镶嵌槽；空集合表示尚未镶嵌。 */
    public record Gems(List<HeroJewelRepository.Item> items) {}

    /** 保留领域调用方式；持久读取时才补齐装备和进化，null不冒充未进化。 */
    public HeroProfile(String id, int templateId, int level, int star, boolean locked, boolean deployed,
                       int stage, HeroGrowthRules.Stats baseStats) {
        this(id, templateId, level, star, locked, deployed, stage, baseStats, null, null, null, null, Map.of(), List.of());
    }

    /** 按相同属性编号合并装备、神位和职业科技，个人评分与开战读取同一份未折算结果。 */
    public HeroProfile withLoadout(HeroEquipmentRepository.State value, Gems gemSlots, Map<Integer, Long> attributes,
                                  Map<Integer, Long> shrineAttributes, Map<Integer, Long> technologyAttributes,
                                  HeroPanelRules rules, HeroSkillPanelRules skillRules,
                                  HeroEvolutionRules evolutionRules, List<HeroEvolutionRules.Skill> loadoutSkills) {
        var bonuses = new HashMap<>(attributes);
        shrineAttributes.forEach((type, amount) -> bonuses.merge(type, amount, Math::addExact));
        technologyAttributes.forEach((type, amount) -> bonuses.merge(type, amount, Math::addExact));
        var definition = evolutionRules.resolve(templateId, evolution.type(), evolution.level());
        var panel = rules.calculate(baseStats, value, add -> {
            skillRules.contribute(templateId, star, stage, add);
            definition.attributes().forEach(add);
            bonuses.forEach(add);
        });
        var included = new java.util.ArrayList<>(panel.includedSources());
        included.add("evolution");
        included.add("jewels");
        included.add("god_equipment");
        included.add("artifacts");
        if (!shrineAttributes.isEmpty()) {
            included.add("rainbow");
        }
        if (!technologyAttributes.isEmpty()) {
            included.add("guild_technology");
        }
        panel = new HeroPanelRules.State(panel.values(), List.copyOf(included), panel.pendingSources(),
                panel.complete(), panel.power(), panel.rawAttributes());
        return new HeroProfile(id, templateId, level, star, locked, deployed, stage, baseStats, value, panel,
                evolution, gemSlots, Map.copyOf(bonuses), List.copyOf(loadoutSkills));
    }
}
