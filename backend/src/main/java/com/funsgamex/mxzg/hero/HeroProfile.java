/** 当前角色的持久英雄投影；locked 是自身锁定，不能解释成未获得。 */
package com.funsgamex.mxzg.hero;

public record HeroProfile(String id, int templateId, int level, int star, boolean locked, boolean deployed, int stage, HeroGrowthRules.Stats baseStats) {}
