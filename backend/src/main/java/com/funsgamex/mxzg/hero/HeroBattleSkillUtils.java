/** 旧服技能分类与回合排期规则；只选择候选技能，不执行Buff触发、禁止行动或伤害结算。 */
package com.funsgamex.mxzg.hero;

import java.util.List;

public final class HeroBattleSkillUtils {
    /** activeType沿旧枚举：0被动、1主动、2普攻、3光环；initialRound/coolRound来自精确技能等级配置，first由动作内260号先手Buff推导。 */
    public record Skill(int skillId, int level, int activeType, int initialRound, int coolRound, boolean countStats, boolean first) {
        /** 拒绝非法配置，避免冷却除零或把未知类别当成主动。 */
        public Skill {
            if (skillId <= 0 || level < 0 || activeType < 0 || activeType > 3 || initialRound < 0 || coolRound < 0) {
                throw new IllegalArgumentException("战斗技能排期配置无效");
            }
        }
    }

    /** 无状态工具禁止实例化。 */
    private HeroBattleSkillUtils() {}

    /** 精确保留旧isCanRelease模运算；配置初始回合为0时采用实例回合，不另加current>=initial判断。 */
    public static boolean canRelease(Skill skill, int currentRound, int instanceInitialRound) {
        if (skill == null) {
            return false;
        }
        int initial = skill.initialRound() == 0 ? instanceInitialRound : skill.initialRound();
        return ((long) currentRound - initial) % ((long) skill.coolRound() + 1) == 0;
    }

    /** 旧HeroDo顺序：追加行动优先、只能普攻次之，再按原列表选首个可释放主动，否则普攻。 */
    public static Skill choose(List<Skill> skills, int currentRound, Skill queuedAction, boolean onlyAttack) {
        if (queuedAction != null) {
            return queuedAction;
        }
        Skill ordinary = null;
        for (var skill : skills) {
            if (skill.activeType() == 2) {
                ordinary = skill;
            }
        }
        if (!onlyAttack) {
            for (var skill : skills) {
                if (skill.activeType() == 1 && canRelease(skill, currentRound, 0)) {
                    return skill;
                }
            }
        }
        return ordinary;
    }
}
