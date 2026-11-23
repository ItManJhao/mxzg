/** 持久英雄只读投影：面板取同一批穿戴数据，派生的原始属性和套装技能仅供战斗使用。 */
package com.funsgamex.mxzg.hero;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

    /** 从持久穿戴生成面板及战斗属性，将已激活的神装、圣器技能交给战斗排期。 */
    public HeroProfile withLoadout(HeroEquipmentRepository.State value, Gems gemSlots, Map<Integer, Long> attributes,
                                  HeroPanelRules rules, HeroSkillPanelRules skillRules,
                                  HeroEvolutionRules evolutionRules, List<HeroEvolutionRules.Skill> loadoutSkills) {
        var definition = evolutionRules.resolve(templateId, evolution.type(), evolution.level());
        var panel = rules.calculate(baseStats, value, add -> {
            skillRules.contribute(templateId, star, stage, add);
            definition.attributes().forEach(add);
            attributes.forEach(add);
        });
        var included = new java.util.ArrayList<>(panel.includedSources());
        included.add("evolution");
        included.add("jewels");
        included.add("god_equipment");
        included.add("artifacts");
        panel = new HeroPanelRules.State(panel.values(), List.copyOf(included), panel.pendingSources(),
                panel.complete(), panel.power());
        return new HeroProfile(id, templateId, level, star, locked, deployed, stage, baseStats, value, panel,
                evolution, gemSlots, Map.copyOf(attributes), List.copyOf(loadoutSkills));
    }
}
