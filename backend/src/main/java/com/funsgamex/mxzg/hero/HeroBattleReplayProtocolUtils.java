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
                .setTemplateId(unit.template()).setLevel(unit.level()).setPosition(unit.position()).setInitialHp(unit.opening().hp())
                .setFinalHp(unit.id() == 1 ? report.attackerHp() : report.defenderHp()));
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
}
