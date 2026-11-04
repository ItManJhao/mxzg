/** 旧HeroDo行动资格：候选技能已选定后判断死亡、强制行动、先手及控制状态，不执行伤害。 */
package com.funsgamex.mxzg.hero;

import java.util.Set;

public final class HeroBattleActionUtils {
    /** 沉默、混乱、背叛、挑衅：选择候选时只能使用普攻。 */
    private static final Set<Integer> ONLY_ATTACK = Set.of(1001, 1011, 1013, 1015);
    /** 主动技能禁止集合；缴械1002只在普攻集合中额外检查。 */
    private static final Set<Integer> PROHIBIT_SKILL = Set.of(1003, 1004, 1005, 1006, 1010, 1012, 1014);

    /** 无状态工具禁止实例化。 */
    private HeroBattleActionUtils() {}

    /** 在选技能阶段读取控制状态；不把封印误当沉默。 */
    public static boolean onlyAttack(Set<Integer> controls) {
        return controls.stream().anyMatch(ONLY_ATTACK::contains);
    }

    /** 死亡优先于所有例外；能量9999与先手绕过禁止状态，普通/主动使用不同集合。 */
    public static boolean canAct(boolean dead, HeroBattleSkillUtils.Skill skill, long skillEnergy,
                                 Set<Integer> controls) {
        if (dead || skill == null) {
            return false;
        }
        if (skill.activeType() != 1 && skill.activeType() != 2) {
            throw new IllegalArgumentException("被动或光环不能直接作为行动技能");
        }
        if (skillEnergy == 9999 || skill.first()) {
            return true;
        }
        return controls.stream().noneMatch(PROHIBIT_SKILL::contains)
            && (skill.activeType() != 2 || !controls.contains(1002));
    }
}
