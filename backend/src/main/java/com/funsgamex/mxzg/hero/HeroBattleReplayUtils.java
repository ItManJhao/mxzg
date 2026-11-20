/** 逐单位阶段回放校验：核对全体行动顺序、生命连续性和整队胜负，不重算伤害或开放业务入口。 */
package com.funsgamex.mxzg.hero;

import java.util.*;

public final class HeroBattleReplayUtils {
    /** 工具类不保存跨场状态。 */
    private HeroBattleReplayUtils() {}

    /** 按伤害/治疗原顺序重放完整名册生命，拒绝少帧、乱序、未知单位及提前结束；审计场景保持独立来源。 */
    public static void validate(HeroBattleChapterScenario.Result report) {
        boolean dailyGold = "dungeon:gold:1".equals(report.scenario());
        boolean indexed = indexedScenario(report.scenario()) || dailyGold;
        if ((!indexed && !Set.of("main:1:1:1", "main:1:1:2", "main:1:1:3", "audit:duel", "audit:charm", "audit:charm-death", "audit:teams", "audit:control-teams", "audit:frozen", "audit:nanako", "audit:dark-cutter-bleed", "audit:round-limit").contains(report.scenario()))
            || report.rounds() < 1 || report.rounds() > HeroBattleRoundUtils.MAX_ROUNDS || report.frames().isEmpty()) {
            throw new IllegalArgumentException("战斗回放场景或回合范围无效");
        }
        var units = HeroBattleChapterScenario.roster(report.initial());
        if (dailyGold && units.stream().filter(unit -> unit.faction() == 2).count() != 6) {
            throw new IllegalArgumentException("金币副本首关战报缺少原守军");
        }
        if (!indexed && !Set.of("audit:charm", "audit:charm-death", "audit:teams", "audit:control-teams", "audit:frozen", "main:1:1:3").contains(report.scenario()) && units.size() != 2) {
            throw new IllegalArgumentException("该战斗来源未开放多单位");
        }
        if (indexed && units.stream().anyMatch(unit -> unit.id() != unit.position() + (unit.faction() == 2 ? 8 : 0))) {
            throw new IllegalArgumentException("配置化战报名册身份与站位不一致");
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
        var speeds = new HashMap<Integer, HeroBattleAttributeState>();
        var initialSpeeds = new HashMap<Integer, Long>();
        units.forEach(unit -> initialSpeeds.put(unit.id(), unit.opening().speed()));
        var speedBuffs = new HashMap<Long, SpeedBuff>();
        var remaining = new ArrayList<Integer>();
        var order = Comparator.comparingLong((Integer id) -> speeds.containsKey(id)
            ? speeds.get(id).get(101) : initialSpeeds.get(id)).reversed();
        int lastRound = 0;
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
                skipDead(remaining, hp);
                if (frame.sourceId() != 0 || !remaining.isEmpty()) {
                    throw new IllegalArgumentException("战斗缺少回合开始或单位出手");
                }
                lastRound = frame.round();
                units.forEach(unit -> remaining.add(unit.id()));
            } else {
                skipDead(remaining, hp);
                if (remaining.isEmpty() || frame.sourceId() != remaining.removeFirst()) {
                    throw new IllegalArgumentException("战斗出手乱序、重复或死亡单位出手");
                }
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
                updateSpeed(event, units, speeds, speedBuffs);
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
                } else if (event.kind().equals("recovery") || event.kind().equals("revival")) {
                    var heal = event.recovery();
                    if (heal == null || heal.sourceId() != event.sourceId() || heal.targetId() != event.targetId()
                        || heal.buffId() != event.configId()) {
                        throw new IllegalArgumentException("战斗治疗事件身份不一致");
                    }
                    long before = hp.get(heal.targetId());
                    long maximum = units.stream().filter(unit -> unit.id() == heal.targetId()).findFirst().orElseThrow().opening().maxHp();
                    long value = Math.addExact(before, heal.actual());
                    boolean revival = event.kind().equals("revival");
                    if ((revival ? before != 0 : before <= 0) || value <= 0 || value > maximum
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
            remaining.sort(order);
        }
        skipDead(remaining, hp);
        if (HeroBattleChapterScenario.outcome(units, hp, 0) == HeroBattleRoundUtils.Outcome.ONGOING
            && !remaining.isEmpty()) {
            throw new IllegalArgumentException("最终回合仍缺存活单位出手");
        }
        if (!turns.equals(report.turns()) || !hp.equals(report.finalHp()) || lastRound != report.rounds()
            || !all.equals(report.damages()) || !recoveries.equals(report.recoveries())
            || HeroBattleChapterScenario.outcome(units, hp, lastRound) != report.outcome()
            || report.outcome() == HeroBattleRoundUtils.Outcome.ONGOING) {
            throw new IllegalArgumentException("战斗最终结果不一致");
        }
    }

    /** 回放内部速度实例的原目标和基础增量，移除必须精确撤回。 */
    private record SpeedBuff(int targetId, long amount) {}

    /** 从同一帧的真实Buff入场/移除记录重放速度；历史零增量战报沿冻结速度校验。 */
    private static void updateSpeed(HeroBattleHealingExecutor.Trace event, List<HeroBattleChapterScenario.Unit> units,
                                    Map<Integer, HeroBattleAttributeState> speeds, Map<Long, SpeedBuff> buffs) {
        var entry = event.buff();
        var applied = entry == null ? null : buffs.get(entry.instanceId());
        long delta = event.speedDelta();
        if (delta == 0 && applied == null) {
            return;
        }
        if (entry == null || entry.spec().type() != 160 || entry.spec().id() != event.configId()
                || entry.sourceId() != event.sourceId()) {
            throw new IllegalArgumentException("速度增量缺少对应属性Buff");
        }
        if (event.kind().equals("buff.upsert") && delta != 0 && applied == null) {
            buffs.put(entry.instanceId(), new SpeedBuff(event.targetId(), delta));
        } else if (event.kind().equals("buff.remove") && applied != null
                && applied.targetId() == event.targetId() && Math.negateExact(applied.amount()) == delta) {
            buffs.remove(entry.instanceId());
        } else {
            throw new IllegalArgumentException("速度Buff实例重复或移除增量不符");
        }
        var state = speeds.computeIfAbsent(event.targetId(), id -> new HeroBattleAttributeState(units.stream()
            .filter(unit -> unit.id() == id).findFirst().orElseThrow().attributes()));
        state.addBase(101, delta);
    }

    /** 通用生产来源使用正十进制全局uint32索引；历史审计别名另保留原固定准入。 */
    private static boolean indexedScenario(String scenario) {
        if (scenario == null || !scenario.matches("(?:audit:lineup|idle:chapter):[1-9][0-9]{0,9}")) {
            return false;
        }
        long index = Long.parseLong(scenario.substring(scenario.lastIndexOf(':') + 1));
        return index <= 4_294_967_295L;
    }

    /** 跳过排在最前的死亡单位，与执行器只消费当前待出手位的规则一致。 */
    private static void skipDead(List<Integer> remaining, Map<Integer, Long> hp) {
        while (!remaining.isEmpty() && hp.get(remaining.getFirst()) == 0) {
            remaining.removeFirst();
        }
    }
}
