/** 逐单位阶段回放校验：核对全体行动顺序、生命连续性和整队胜负，不重算伤害或开放业务入口。 */
package com.funsgamex.mxzg.hero;

import java.util.*;

public final class HeroBattleReplayUtils {
    /** 工具类不保存跨场状态。 */
    private HeroBattleReplayUtils() {}

    /** 重放完整名册生命，拒绝少帧、乱序、未知单位及提前结束；审计场景保持独立来源。 */
    public static void validate(HeroBattleChapterScenario.Result report) {
        if (!Set.of("main:1:1:1", "main:1:1:2", "audit:duel", "audit:teams", "audit:round-limit").contains(report.scenario())
            || report.rounds() < 1 || report.rounds() > HeroBattleRoundUtils.MAX_ROUNDS || report.frames().isEmpty()) {
            throw new IllegalArgumentException("战斗回放场景或回合范围无效");
        }
        var units = HeroBattleChapterScenario.roster(report.initial());
        if (!report.scenario().equals("audit:teams") && units.size() != 2) {
            throw new IllegalArgumentException("该战斗来源未开放多单位");
        }
        var hp = new LinkedHashMap<Integer, Long>();
        units.forEach(unit -> hp.put(unit.id(), unit.opening().hp()));
        var order = HeroBattleRoundUtils.order(units.stream()
            .map(unit -> new HeroBattleRoundUtils.Unit(unit.id(), unit.opening().speed())).toList());
        int lastRound = 0;
        int cursor = 0;
        var turns = new ArrayList<HeroBattleChapterScenario.Turn>();
        var all = new ArrayList<HeroBattleHealingExecutor.Damage>();
        for (var frame : report.frames()) {
            if (HeroBattleChapterScenario.outcome(units, hp, 0) != HeroBattleRoundUtils.Outcome.ONGOING) {
                throw new IllegalArgumentException("战斗已结束后仍有阶段");
            }
            if (!hp.equals(frame.before()) || frame.round() < 1 || frame.round() < lastRound || frame.round() > lastRound + 1) {
                throw new IllegalArgumentException("战斗阶段或前置生命不连续");
            }
            if (frame.round() != lastRound) {
                if (frame.sourceId() != 0 || (lastRound != 0 && nextAlive(order, hp, cursor) < order.size())) {
                    throw new IllegalArgumentException("战斗缺少回合开始或单位出手");
                }
                cursor = 0;
                lastRound = frame.round();
            } else {
                cursor = nextAlive(order, hp, cursor);
                if (cursor >= order.size() || frame.sourceId() != order.get(cursor)) {
                    throw new IllegalArgumentException("战斗出手乱序、重复或死亡单位出手");
                }
                cursor++;
            }
            var traced = frame.trace().stream().filter(trace -> trace.kind().equals("damage"))
                .map(HeroBattleHealingExecutor.Trace::damage).toList();
            if (!traced.equals(frame.damages())) throw new IllegalArgumentException("战斗伤害与事件不一致");
            for (var trace : frame.trace()) {
                if (!hp.containsKey(trace.sourceId()) || !hp.containsKey(trace.targetId())) {
                    throw new IllegalArgumentException("战斗事件引用未知单位");
                }
            }
            for (var hit : frame.damages()) {
                if (hit.actual() > 0 || !hp.containsKey(hit.targetId())) {
                    throw new IllegalArgumentException("战斗伤害目标或符号无效");
                }
                long value = Math.addExact(hp.get(hit.targetId()), hit.actual());
                if (value < 0 || hit.dead() != (value == 0)) throw new IllegalArgumentException("战斗死亡状态不一致");
                hp.put(hit.targetId(), value);
                all.add(hit);
            }
            if (!hp.equals(frame.after())) throw new IllegalArgumentException("战斗阶段结束生命不一致");
            HeroBattleChapterScenario.outcome(units, hp, 0);
            if (frame.sourceId() != 0) {
                turns.add(new HeroBattleChapterScenario.Turn(frame.round(), frame.sourceId(),
                    HeroBattleRoundUtils.NORMAL_SKILL_ENERGY, hp));
            }
        }
        if (HeroBattleChapterScenario.outcome(units, hp, 0) == HeroBattleRoundUtils.Outcome.ONGOING
            && nextAlive(order, hp, cursor) < order.size()) {
            throw new IllegalArgumentException("最终回合仍缺存活单位出手");
        }
        if (!turns.equals(report.turns()) || !hp.equals(report.finalHp()) || lastRound != report.rounds()
            || !all.equals(report.damages())
            || HeroBattleChapterScenario.outcome(units, hp, lastRound) != report.outcome()
            || report.outcome() == HeroBattleRoundUtils.Outcome.ONGOING) {
            throw new IllegalArgumentException("战斗最终结果不一致");
        }
    }

    /** 从当前游标跳过死亡单位；存活单位不可遗漏，同速保持名册的攻方优先稳定顺序。 */
    private static int nextAlive(List<Integer> order, Map<Integer, Long> hp, int cursor) {
        while (cursor < order.size() && hp.get(order.get(cursor)) == 0) cursor++;
        return cursor;
    }
}
