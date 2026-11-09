/** 旧伤害日志口径的边界回归；只检查展示统计，不改变仍待审的护盾扣血规则。 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Damage;
import com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Recovery;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario;
import com.funsgamex.mxzg.protocol.GameProtocol;
import tools.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class HeroBattleStatisticsTest {
    /** 星级分段与进化分支使用开战输入；后续解析另一状态不影响已经返回的头像身份。 */
    @Test void freezesAppearanceAndRejectsUnknownEvolution() {
        var rules = new com.funsgamex.mxzg.hero.HeroBattleAppearanceRules(new ObjectMapper());
        int before = rules.icon(10105008, 5, 0, 0);
        int evolved = rules.icon(10105008, 10, 1, 1);
        assertEquals(20111008, evolved);
        assertNotEquals(before, evolved);
        assertEquals(before, rules.icon(10105008, 5, 0, 0));
        assertThrows(IllegalArgumentException.class, () -> rules.icon(10105008, 10, 1, 0));
        assertThrows(IllegalArgumentException.class, () -> rules.icon(10101001, 1, 1, 1));
    }

    /** 过量伤害只算实际扣血，但护盾依旧先加到负扣血量再取绝对值，不能改成伤害相加。 */
    @Test void preservesLegacyShieldAndOverkillConvention() {
        var hits = List.of(
            new Damage(1, 1, 2, 100, 80, -20, -10, true),
            new Damage(1, 1, 3, 100, 0, -100, -10, true),
            new Damage(1, 4, 3, 100, 80, -20, -100, false));
        assertEquals(80, HeroBattleReplayProtocolUtils.totalDamage(hits, 1));
        assertEquals(20, HeroBattleReplayProtocolUtils.totalDamage(hits, 4));
        assertEquals(0, HeroBattleReplayProtocolUtils.totalDamage(hits, 3));
    }

    /** 超出64位统计范围必须明确失败，不能溢出成负数后挑错最高伤害英雄。 */
    @Test void rejectsOverflow() {
        var hit = new Damage(1, 1, 2, Long.MAX_VALUE, 0, -Long.MAX_VALUE, -Long.MAX_VALUE, false);
        assertThrows(ArithmeticException.class,
            () -> HeroBattleReplayProtocolUtils.totalDamage(List.of(hit, hit), 1));
    }

    /** 满血和溢出治疗仍计修正后的完整数值；统计属于施法者，负治疗沿旧日志直接相加。 */
    @Test void recoveryKeepsOverhealOwnershipAndSign() {
        var recoveries = List.of(
            new Recovery(1, 1, 2, 80, 100, 10),
            new Recovery(1, 1, 3, 50, 60, 0),
            new Recovery(1, 1, 1, -10, -10, -10),
            new Recovery(1, 4, 1, 20, 30, 20));
        assertEquals(150, HeroBattleReplayProtocolUtils.totalRecovery(recoveries, 1));
        assertEquals(30, HeroBattleReplayProtocolUtils.totalRecovery(recoveries, 4));
        assertEquals(0, HeroBattleReplayProtocolUtils.totalRecovery(recoveries, 2));
    }

    /** 治疗累计同样拒绝64位上下溢，不能回绕后显示错误的进度条。 */
    @Test void recoveryRejectsOverflow() {
        var positive = new Recovery(1, 1, 2, 1, Long.MAX_VALUE, 0);
        var negative = new Recovery(1, 1, 2, -1, Long.MIN_VALUE, 0);
        assertThrows(ArithmeticException.class,
            () -> HeroBattleReplayProtocolUtils.totalRecovery(List.of(positive, positive), 1));
        assertThrows(ArithmeticException.class,
            () -> HeroBattleReplayProtocolUtils.totalRecovery(List.of(negative, negative), 1));
    }

    /** 独立映射夹具验证非零治疗与星级写入二进制；快照冻结后原列表变化不影响历史值。 */
    @Test void freezesAndEncodesRecoveryWithLegacyAbsence() throws Exception {
        var original = new HeroBattleChapterScenario(new ObjectMapper()).run(rate -> rate == 1D);
        var recoveries = new ArrayList<Recovery>();
        recoveries.add(new Recovery(1063201, 1, 1, 50, 108, 0));
        var frames = new ArrayList<>(original.frames());
        var firstFrame = frames.getFirst();
        var trace = new ArrayList<>(firstFrame.trace());
        trace.add(new com.funsgamex.mxzg.hero.HeroBattleHealingExecutor.Trace("recovery", firstFrame.round(), 1, 1,
            1063201, null, null, null, "", recoveries.getFirst()));
        frames.set(0, new HeroBattleChapterScenario.Frame(firstFrame.round(), firstFrame.sourceId(), firstFrame.before(),
            firstFrame.after(), firstFrame.damages(), trace));
        var snapshot = new HeroBattleChapterScenario.Result(original.scenario(), original.outcome(), original.rounds(),
            original.initial(), original.turns(), original.damages(), frames, original.finalHp(), recoveries);
        recoveries.clear();
        var wire = GameProtocol.BattleReplay.parseFrom(HeroBattleReplayProtocolUtils.encode(snapshot).toByteArray());
        assertEquals(108, wire.getUnits(0).getTotalRecovery());
        assertTrue(wire.getUnits(0).hasTotalRecovery());
        assertEquals(original.initial().getFirst().portraitIconId().intValue(), wire.getUnits(0).getPortraitIconId());
        assertFalse(GameProtocol.BattleReplayUnit.parseFrom(wire.getUnits(0).toBuilder()
            .clearPortraitIconId().build().toByteArray()).hasPortraitIconId());
        assertEquals(original.initial().getFirst().star(), wire.getUnits(0).getStar());
        var old = GameProtocol.BattleReplayUnit.parseFrom(wire.getUnits(0).toBuilder().clearTotalRecovery().build().toByteArray());
        assertFalse(old.hasTotalRecovery(), "旧战报缺失仍须保留字段不存在，不能变成真实0");
    }
}
