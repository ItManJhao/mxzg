/** 选定双单位关卡的血量回放校验；仅消费记录，不重算伤害、不代表动画播放协议。 */
package com.funsgamex.mxzg.hero;

public final class HeroBattleReplayUtils {
    /** 工具类不保存跨场状态。 */
    private HeroBattleReplayUtils() {}

    /** 从初始血量逐帧重放实际扣血，拒绝断裂、未知目标和与最终结果不一致的记录。 */
    public static void validate(HeroBattleChapterScenario.Result report) {
        if (!java.util.Set.of("main:1:1:1", "main:1:1:2", "audit:duel", "audit:round-limit").contains(report.scenario())
            || report.initial().size() != 2 || report.initial().getFirst().id() != 1
            || report.initial().getLast().id() != 2 || report.rounds() < 1
            || report.rounds() > HeroBattleRoundUtils.MAX_ROUNDS || report.frames().isEmpty()) {
            throw new IllegalArgumentException("战斗回放单位或回合范围无效");
        }
        long a = report.initial().getFirst().opening().hp();
        long d = report.initial().getLast().opening().hp();
        int lastRound = 0;
        var acted = new java.util.HashSet<Integer>();
        var turns = new java.util.ArrayList<HeroBattleChapterScenario.Turn>();
        var all = new java.util.ArrayList<HeroBattleHealingExecutor.Damage>();
        for (var frame : report.frames()) {
            if (frame.round() < lastRound || frame.round() > lastRound + 1
                || frame.round() < 1 || frame.sourceId() < 0 || frame.sourceId() > 2
                || a != frame.attackerBefore() || d != frame.defenderBefore()) {
                throw new IllegalArgumentException("战斗回放阶段或前置血量不连续");
            }
            if (a <= 0 || d <= 0) {
                throw new IllegalArgumentException("战斗已结束后仍有阶段");
            }
            if (frame.round() != lastRound) {
                if (frame.sourceId() != 0 || (lastRound != 0 && acted.size() != 2)) {
                    throw new IllegalArgumentException("战斗缺少回合开始或单位出手阶段");
                }
                acted.clear();
            } else if (frame.sourceId() == 0 || !acted.add(frame.sourceId())) {
                throw new IllegalArgumentException("战斗回合开始或单位出手重复");
            }
            lastRound = frame.round();
            var traced = frame.trace().stream().filter(trace -> trace.kind().equals("damage"))
                .map(HeroBattleHealingExecutor.Trace::damage).toList();
            if (!traced.equals(frame.damages())) {
                throw new IllegalArgumentException("战斗伤害与事件记录不一致");
            }
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
            if (frame.sourceId() != 0) {
                turns.add(new HeroBattleChapterScenario.Turn(frame.round(), frame.sourceId(),
                    HeroBattleRoundUtils.NORMAL_SKILL_ENERGY, a, d));
            }
        }
        if (a > 0 && d > 0 && acted.size() != 2) {
            throw new IllegalArgumentException("回合上限前出手阶段未完成");
        }
        if (!turns.equals(report.turns()) || a != report.attackerHp() || d != report.defenderHp() || lastRound != report.rounds()
            || !all.equals(report.damages())
            || HeroBattleRoundUtils.outcome(a > 0, d > 0, lastRound) != report.outcome()) {
            throw new IllegalArgumentException("战斗回放最终结果不一致");
        }
    }
}
