/** 旧BattleContext的普通排序、胜负与初始属性修正规则；不管理技能、资产或奖励。 */
package com.funsgamex.mxzg.hero;

import java.util.*;

public final class HeroBattleRoundUtils {
    /** 旧普通战斗回合上限，主线没有额外覆盖。 */
    public static final int MAX_ROUNDS = 15;
    /** 旧战斗类型 4 的回合上限，竞技场超时同样判攻方负。 */
    public static final int ARENA_MAX_ROUNDS = 20;
    /** 旧战斗类型 11 的单层回合上限，永恒梦境连续冒险每层单独计算。 */
    public static final int DREAMLAND_MAX_ROUNDS = 10;
    /** 默认普通SkillDo没有能量写入路径；保留0，不根据未使用常量发明能量收支。 */
    public static final long NORMAL_SKILL_ENERGY = 0;
    /** 当前排序所需速度与单位编号；输入顺序为攻方在前、守方在后。 */
    public record Unit(int id, long speed) {}
    /** ONGOING尚未结束；双方同时死亡时按旧checkOver优先判攻方失败。 */
    public enum Outcome { ONGOING, ATTACKER_WIN, DEFENDER_WIN }

    /** 无状态工具禁止实例化。 */
    private HeroBattleRoundUtils() {}

    /** 速度降序，同速保留原始顺序；本入口不处理先手技能，需要调用方预检。 */
    public static List<Integer> order(List<Unit> units) {
        return units.stream().sorted(Comparator.comparingLong(Unit::speed).reversed()).map(Unit::id).toList();
    }

    /** 先检查攻方全灭，再检查守方；打满15回合仍未结束默认守方胜，不算平局。 */
    public static Outcome outcome(boolean attackerAlive, boolean defenderAlive, int completedRounds) {
        return outcome(attackerAlive, defenderAlive, completedRounds, MAX_ROUNDS);
    }

    /** 按战斗类型的原回合上限判定，双方同时死亡仍优先判攻方失败。 */
    static Outcome outcome(boolean attackerAlive, boolean defenderAlive, int completedRounds, int maxRounds) {
        if (completedRounds < 0) {
            throw new IllegalArgumentException("已完成回合不能为负");
        }
        if (!attackerAlive) {
            return Outcome.DEFENDER_WIN;
        }
        if (!defenderAlive) {
            return Outcome.ATTACKER_WIN;
        }
        return completedRounds >= maxRounds ? Outcome.DEFENDER_WIN : Outcome.ONGOING;
    }

    /** 旧kind1直接赋值；kind2按原值乘万分比而不是增加万分比，逐项向零截断。 */
    public static long initialAttribute(long base, int kind, long value) {
        if (kind == 1) {
            return value;
        }
        if (kind != 2) {
            throw new IllegalArgumentException("初始属性修正类型不支持");
        }
        double result = base * (value / 10000D);
        if (!Double.isFinite(result) || result >= 0x1p63 || result < -0x1p63) {
            throw new IllegalArgumentException("初始属性修正溢出");
        }
        return (long) result;
    }
}
