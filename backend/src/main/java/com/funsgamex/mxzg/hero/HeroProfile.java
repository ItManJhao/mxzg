/** 当前角色的持久英雄投影；locked 是自身锁定，不能解释成未获得。 */
package com.funsgamex.mxzg.hero;

public record HeroProfile(String id, int templateId, int level, int star, boolean locked, boolean deployed, int stage, HeroGrowthRules.Stats baseStats, HeroEquipmentRepository.State equipment) {
    /** 保留领域调用的构造方式；持久读取时补上真实穿戴快照。 */
    public HeroProfile(String id,int templateId,int level,int star,boolean locked,boolean deployed,int stage,HeroGrowthRules.Stats baseStats) { this(id,templateId,level,star,locked,deployed,stage,baseStats,null); }
    /** 返回同一英雄的完整只读穿戴投影，不修改原记录。 */
    public HeroProfile withEquipment(HeroEquipmentRepository.State value) { return new HeroProfile(id,templateId,level,star,locked,deployed,stage,baseStats,value); }
}
