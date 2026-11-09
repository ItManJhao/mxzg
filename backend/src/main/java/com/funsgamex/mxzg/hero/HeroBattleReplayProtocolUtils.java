/** 将已通过回放校验的选定关卡映射成Protobuf；不注册请求、不写玩家状态。 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.protocol.GameProtocol;

public final class HeroBattleReplayProtocolUtils {
    /** 无状态映射工具。 */
    private HeroBattleReplayProtocolUtils() {}

    /** 校验血量过程后编码；保留64位扣血与Buff实例，不转换成浮点或JSON。 */
    public static GameProtocol.BattleReplay encode(HeroBattleChapterScenario.Result report) {
        HeroBattleReplayUtils.validate(report);
        var result = GameProtocol.BattleReplay.newBuilder().setSchemaVersion(1)
            .setScenario(report.scenario()).setOutcome(report.outcome().name()).setRounds(report.rounds());
        for (var unit : report.initial()) {
            result.addUnits(GameProtocol.BattleReplayUnit.newBuilder().setUnitId(unit.id())
                .setFaction(unit.faction()).setMaxHp(unit.opening().maxHp()).setTemplateId(unit.template()).setLevel(unit.level()).setPosition(unit.position()).setInitialHp(unit.opening().hp())
                .setFinalHp(report.finalHp().get(unit.id()))
                .setTotalDamage(totalDamage(report.damages(), unit.id()))
                .setTotalTakenDamage(totalTakenDamage(report, unit.id()))
                .setTotalRecovery(totalRecovery(report.recoveries(), unit.id()))
                .setStar(unit.star())
                .setPortraitIconId(java.util.Objects.requireNonNull(unit.portraitIconId(), "战报历史头像未冻结")));
        }
        for (var frame : report.frames()) {
            var phase = GameProtocol.BattleReplayPhase.newBuilder().setRound(frame.round()).setSourceId(frame.sourceId());
            for (var trace : frame.trace()) {
                var event = GameProtocol.BattleReplayEvent.newBuilder().setKind(trace.kind())
                    .setSourceId(trace.sourceId()).setTargetId(trace.targetId()).setConfigId(trace.configId());
                if (trace.skill() != null) {
                    event.setSkillLevel(trace.skill().level()).setSkillType(trace.skill().activeType());
                }
                if (trace.damage() != null) {
                    event.setActualHpChange(trace.damage().actual()).setReportedHpChange(trace.damage().reported())
                        .setDead(trace.damage().dead());
                }
                if (trace.recovery() != null) {
                    event.setActualHpChange(trace.recovery().actual())
                        .setReportedHpChange(trace.recovery().reported()).setDead(false);
                }
                if (trace.buff() != null) {
                    event.setBuffInstanceId(trace.buff().instanceId()).setExpiresAtRound(trace.buff().expiresAt())
                        .setBuffValue(trace.buff().value());
                }
                if (!trace.reason().isEmpty()) {
                    event.setRemovalReason(trace.reason());
                }
                phase.addEvents(event);
            }
            result.addPhases(phase);
        }
        return result.build();
    }

    /** 沿旧heroHurt→HeroFightLog口径累计，包括过量伤害遇盾的反直觉结果；不改护盾规则。 */
    public static long totalDamage(java.util.List<HeroBattleHealingExecutor.Damage> damages, int unitId) {
        long total = 0;
        for (var hit : damages) {
            if (hit.sourceId() == unitId) {
                long signed = Math.addExact(hit.actual(), hit.absorbed());
                total = Math.addExact(total, Math.absExact(signed));
            }
        }
        return total;
    }

    /** 沿旧replenish→addRecovery口径记施法者的修正后治疗量，包含溢出且保留符号；累计溢出拒绝。 */
    public static long totalRecovery(java.util.List<HeroBattleHealingExecutor.Recovery> recoveries, int unitId) {
        long total = 0;
        for (var recovery : recoveries) {
            if (recovery.sourceId() == unitId) {
                total = Math.addExact(total, recovery.reported());
            }
        }
        return total;
    }

    /** 承伤只累计本单位实际减少的血量；统计冻结到战报，不依赖客户端播放时点。 */
    private static long totalTakenDamage(HeroBattleChapterScenario.Result report, int unitId) {
        long total = 0;
        for (var hit : report.damages()) {
            if (hit.targetId() == unitId) {
                total = Math.addExact(total, Math.negateExact(hit.actual()));
            }
        }
        return total;
    }
}
