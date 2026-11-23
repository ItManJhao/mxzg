/** 持久英雄只读投影：基础、穿戴、进化和面板来自同一角色快照，不保存派生属性。 */
package com.funsgamex.mxzg.hero;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.List;
import java.util.Map;

public record HeroProfile(String id, int templateId, int level, int star, boolean locked, boolean deployed,
                          int stage, HeroGrowthRules.Stats baseStats, HeroEquipmentRepository.State equipment,
                          HeroPanelRules.State panelStats, HeroEvolutionRules.State evolution, Gems gems,
                          @JsonIgnore Map<Integer, Long> growthAttributes) {
    /** 唯一角色快照中的已镶嵌槽；空集合表示尚未镶嵌。 */
    public record Gems(List<HeroJewelRepository.Item> items) {}

    /** 保留领域调用方式；持久读取时才补齐装备和进化，null不冒充未进化。 */
    public HeroProfile(String id, int templateId, int level, int star, boolean locked, boolean deployed,
                       int stage, HeroGrowthRules.Stats baseStats) {
        this(id, templateId, level, star, locked, deployed, stage, baseStats, null, null, null, null, Map.of());
    }

    /** 从同一持久穿戴状态计算面板及战斗输入所需的成长属性；不保存派生面板。 */
    public HeroProfile withLoadout(HeroEquipmentRepository.State value, Gems gemSlots, Map<Integer, Long> attributes,
                                  HeroPanelRules rules, HeroSkillPanelRules skillRules,
                                  HeroEvolutionRules evolutionRules, boolean hasGodEquipmentSetSkills) {
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
        var pending = new java.util.ArrayList<>(panel.pendingSources());
        if (hasGodEquipmentSetSkills) {
            pending.add("god_equipment_set_skills");
        }
        panel = new HeroPanelRules.State(panel.values(), List.copyOf(included), List.copyOf(pending),
                panel.complete(), panel.power());
        return new HeroProfile(id, templateId, level, star, locked, deployed, stage, baseStats, value, panel,
                evolution, gemSlots, Map.copyOf(attributes));
    }
}
