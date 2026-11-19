/** 持久英雄只读投影：基础、穿戴、进化和面板来自同一角色快照，不保存派生属性。 */
package com.funsgamex.mxzg.hero;

public record HeroProfile(String id, int templateId, int level, int star, boolean locked, boolean deployed, int stage, HeroGrowthRules.Stats baseStats, HeroEquipmentRepository.State equipment, HeroPanelRules.State panelStats, HeroEvolutionRules.State evolution) {
    /** 保留领域调用方式；持久读取时才补齐装备和进化，null不冒充未进化。 */
    public HeroProfile(String id,int templateId,int level,int star,boolean locked,boolean deployed,int stage,HeroGrowthRules.Stats baseStats) { this(id,templateId,level,star,locked,deployed,stage,baseStats,null,null,null); }
    /** 合并进化属性与基础技能贡献，统一计算面板四维和单个英雄战力。 */
    public HeroProfile withEquipment(HeroEquipmentRepository.State value, HeroPanelRules rules,
                                     HeroSkillPanelRules skillRules, HeroEvolutionRules evolutionRules) {
        var definition = evolutionRules.resolve(templateId, evolution.type(), evolution.level());
        var panel = rules.calculate(baseStats, value, add -> {
            skillRules.contribute(templateId, star, stage, add);
            definition.attributes().forEach(add);
        });
        var included = new java.util.ArrayList<>(panel.includedSources());
        included.add("evolution");
        panel = new HeroPanelRules.State(panel.values(), java.util.List.copyOf(included), panel.pendingSources(),
                panel.complete(), panel.power());
        return new HeroProfile(id, templateId, level, star, locked, deployed, stage, baseStats, value, panel, evolution);
    }
}
