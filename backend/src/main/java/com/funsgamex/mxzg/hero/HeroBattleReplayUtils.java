/** 选定双单位关卡的血量回放校验；仅消费记录，不重算伤害、不代表动画播放协议。 */
package com.funsgamex.mxzg.hero;

public final class HeroBattleReplayUtils {
    /** 工具类不保存跨场状态。 */
    private HeroBattleReplayUtils() {}

    /** 从初始血量逐帧重放实际扣血，拒绝断裂、未知目标和与最终结果不一致的记录。 */
    public static void validate(HeroBattleChapterScenario.Result report) {
        long a = report.initial().getFirst().opening().hp();
        long d = report.initial().getLast().opening().hp();
        int lastRound = 0;
        var all = new java.util.ArrayList<HeroBattleHealingExecutor.Damage>();
        for (var frame : report.frames()) {
            if (frame.round() < lastRound || frame.round() > lastRound + 1
                || frame.round() < 1 || frame.sourceId() < 0 || frame.sourceId() > 2
                || a != frame.attackerBefore() || d != frame.defenderBefore()) {
                throw new IllegalArgumentException("战斗回放阶段或前置血量不连续");
            }
            lastRound = frame.round();
            for (var hit : frame.damages()) {
                if (hit.actual() > 0 || hit.targetId() < 1 || hit.targetId() > 2) {
                    throw new IllegalArgumentException("战斗回放伤害目标或符号无效");
                }
                if (hit.targetId() == 1) {
                    a = Math.addExact(a, hit.actual());
                } else {
                    d = Math.addExact(d, hit.actual());
                }
                long hp = hit.targetId() == 1 ? a : d;
                if (hp < 0 || hit.dead() != (hp == 0)) {
                    throw new IllegalArgumentException("战斗回放死亡状态不一致");
                }
                all.add(hit);
            }
            if (a != frame.attackerAfter() || d != frame.defenderAfter()) {
                throw new IllegalArgumentException("战斗回放帧末血量不一致");
            }
        }
        if (a != report.attackerHp() || d != report.defenderHp() || lastRound != report.rounds()
            || !all.equals(report.damages())
            || HeroBattleRoundUtils.outcome(a > 0, d > 0, lastRound) != report.outcome()) {
            throw new IllegalArgumentException("战斗回放最终结果不一致");
        }
    }
}
