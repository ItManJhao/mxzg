/** 旧服技能分类、候选排期与回合先手排序；供战场和战报校验共用，不执行技能、Buff或伤害。 */
package com.funsgamex.mxzg.hero;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.function.ToLongFunction;

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

    /**
     * 回合开始效果结算后冻结先手顺序。旧服将守方、攻方依序汇总并按速度降序，再逐个插到队首。
     * 普通候选仍按当下速度稳定重排；沉默等控制在真正选技时处理，不改变已定的先手位置。
     */
    static Comparator<Integer> turnOrder(List<HeroBattleChapterScenario.Unit> roster, int round,
                                         ToLongFunction<Integer> speed) {
        var bySpeed = Comparator.comparingLong(speed).reversed();
        var firsts = roster.stream()
                .filter(unit -> {
                    var skill = choose(unit.skills(), round, null, false);
                    return skill != null && skill.first();
                })
                .sorted(Comparator.comparingLong((HeroBattleChapterScenario.Unit unit) -> speed.applyAsLong(unit.id()))
                        .reversed().thenComparing(Comparator.comparingInt(HeroBattleChapterScenario.Unit::faction)
                                .reversed()))
                .toList().reversed();
        var firstPosition = new HashMap<Integer, Integer>();
        for (int index = 0; index < firsts.size(); index++) {
            firstPosition.put(firsts.get(index).id(), index);
        }
        return Comparator.<Integer>comparingInt(id -> firstPosition.getOrDefault(id, Integer.MAX_VALUE))
                .thenComparing(bySpeed);
    }
}
