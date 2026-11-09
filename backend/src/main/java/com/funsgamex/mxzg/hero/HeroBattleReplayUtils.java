/** 逐单位阶段回放校验：核对全体行动顺序、生命连续性和整队胜负，不重算伤害或开放业务入口。 */
package com.funsgamex.mxzg.hero;

import java.util.*;

public final class HeroBattleReplayUtils {
    /** 工具类不保存跨场状态。 */
    private HeroBattleReplayUtils() {}

    /** 按伤害/治疗原顺序重放完整名册生命，拒绝少帧、乱序、未知单位及提前结束；审计场景保持独立来源。 */
    public static void validate(HeroBattleChapterScenario.Result report) {
        if (!Set.of("main:1:1:1", "main:1:1:2", "main:1:1:3", "audit:duel", "audit:charm", "audit:charm-death", "audit:teams", "audit:control-teams", "audit:frozen", "audit:nanako", "audit:dark-cutter-bleed", "audit:round-limit", "audit:lineup:1", "audit:lineup:2", "audit:lineup:3", "idle:chapter:1", "idle:chapter:2", "idle:chapter:3").contains(report.scenario())
            || report.rounds() < 1 || report.rounds() > HeroBattleRoundUtils.MAX_ROUNDS || report.frames().isEmpty()) {
            throw new IllegalArgumentException("战斗回放场景或回合范围无效");
        }
        var units = HeroBattleChapterScenario.roster(report.initial());
        if (!Set.of("audit:charm", "audit:charm-death", "audit:teams", "audit:control-teams", "audit:frozen", "main:1:1:3", "audit:lineup:1", "audit:lineup:2", "audit:lineup:3", "idle:chapter:1", "idle:chapter:2", "idle:chapter:3").contains(report.scenario()) && units.size() != 2) {
            throw new IllegalArgumentException("该战斗来源未开放多单位");
        }
        if (report.scenario().equals("main:1:1:3")) {
            if (units.size() != 3) {
                throw new IllegalArgumentException("第3关必须保留真实三单位名册");
            }
            for (int index = 0; index < units.size(); index++) {
                var unit = units.get(index);
                if (unit.id() != index + 1 || unit.faction() != (index == 0 ? 1 : 2)
                    || unit.template() != (index == 2 ? 10104004 : 10101001)
                    || unit.position() != (index == 2 ? 3 : 2)
                    || unit.level() != (index == 0 ? 1 : 2)) {
                    throw new IllegalArgumentException("第3关名册与已核对配置不符");
                }
            }
        }
        var hp = new LinkedHashMap<Integer, Long>();
        units.forEach(unit -> hp.put(unit.id(), unit.opening().hp()));
        var order = HeroBattleRoundUtils.order(units.stream()
            .map(unit -> new HeroBattleRoundUtils.Unit(unit.id(), unit.opening().speed())).toList());
        int lastRound = 0;
        int cursor = 0;
        var turns = new ArrayList<HeroBattleChapterScenario.Turn>();
        var all = new ArrayList<HeroBattleHealingExecutor.Damage>();
        var recoveries = new ArrayList<HeroBattleHealingExecutor.Recovery>();
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
            // 治疗与伤害必须按原执行顺序重放，分开遍历会丢失同一招的中间血量。
            for (var event : frame.trace()) {
                if (event.kind().equals("damage")) {
                    var hit = event.damage();
                    if (hit == null || hit.actual() > 0 || !hp.containsKey(hit.targetId())) {
                        throw new IllegalArgumentException("战斗伤害目标或符号无效");
                    }
                    long value = Math.addExact(hp.get(hit.targetId()), hit.actual());
                    if (value < 0 || hit.dead() != (value == 0)) {
                        throw new IllegalArgumentException("战斗死亡状态不一致");
                    }
                    hp.put(hit.targetId(), value);
                    all.add(hit);
                } else if (event.kind().equals("recovery")) {
                    var heal = event.recovery();
                    if (heal == null || heal.sourceId() != event.sourceId() || heal.targetId() != event.targetId()
                        || heal.buffId() != event.configId()) {
                        throw new IllegalArgumentException("战斗治疗事件身份不一致");
                    }
                    long before = hp.get(heal.targetId());
                    long maximum = units.stream().filter(unit -> unit.id() == heal.targetId()).findFirst().orElseThrow().opening().maxHp();
                    long value = Math.addExact(before, heal.actual());
                    if (before <= 0 || value <= 0 || value > maximum
                        || heal.actual() != Math.min(heal.reported(), maximum - before)) {
                        throw new IllegalArgumentException("战斗治疗血量或溢出量不一致");
                    }
                    hp.put(heal.targetId(), value);
                    recoveries.add(heal);
                }
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
            || !all.equals(report.damages()) || !recoveries.equals(report.recoveries())
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
