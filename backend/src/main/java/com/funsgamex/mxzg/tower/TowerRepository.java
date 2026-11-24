/**
 * 持久化单角色的幻境进度、阵容和原结算。TowerService 在角色锁中写入，
 * VIP 只读取最高已通关楼层，领层数奖励时不会改写该进度。
 */
package com.funsgamex.mxzg.tower;

import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.google.protobuf.InvalidProtocolBufferException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TowerRepository {
    /** 精力锚点及扫荡重置时间均为 Unix 秒，阵容版本 0 表示仍未保存幻境阵容。 */
    record Progress(int highestCleared, int energy, long energyTimeSeconds, int sweepTimes,
                    long sweepResetAtSeconds, boolean milestoneClaimed, long formationVersion, int formationId) {}

    /** 记住本次目标是楼层或里程碑 ID，重发时核对原目标及确认报价。 */
    record Recorded(int targetId, long maxDiamonds, TowerService.Settlement result) {}

    /** 结算 JSON 与原战报分开冻结，供重连后按请求编号恢复。 */
    private record ReceiptData(String roleId, long assetRevision, TowerService.Action action, int targetId,
                               long maxDiamonds, int floor, boolean won, String replayHash,
                               TowerService.State state, RewardGrantResult actual) {}

    /** 共用角色锁所在的数据库连接。 */
    private final JdbcTemplate jdbc;
    /** 通用事务结果的冻结及完整性检查。 */
    private final RewardReceiptPayloads payloads;

    /** 注入数据库和回执工具，不加载玩家副本。 */
    public TowerRepository(JdbcTemplate jdbc, RewardReceiptPayloads payloads) {
        this.jdbc = jdbc;
        this.payloads = payloads;
    }

    /** 返回 VIP 等下游读取的权威最高通关，初次进入前为 0。 */
    public int highestCleared(String role) {
        return jdbc.query("SELECT highest_cleared FROM game_tower WHERE role_id=?",
                row -> row.next() ? row.getInt(1) : 0, role);
    }

    /** 查询当前幻境进度，尚未写入时返回 null。 */
    Progress progress(String role) {
        return jdbc.query("""
                SELECT highest_cleared,energy,energy_time_seconds,sweep_times,sweep_reset_at_seconds,
                       milestone_claimed,formation_version,formation_id
                  FROM game_tower WHERE role_id=?
                """, row -> row.next() ? new Progress(row.getInt(1), row.getInt(2), row.getLong(3), row.getInt(4),
                    row.getLong(5), row.getBoolean(6), row.getLong(7), row.getInt(8)) : null, role);
    }

    /** 仅在角色锁内初始化或写入进度，轮转日期和恢复精力也沿用本入口。 */
    void saveProgress(String role, Progress previous, Progress next) {
        if (previous == null) {
            jdbc.update("""
                    INSERT INTO game_tower(role_id,highest_cleared,energy,energy_time_seconds,sweep_times,
                        sweep_reset_at_seconds,milestone_claimed,formation_version,formation_id)
                    VALUES (?,?,?,?,?,?,?,?,?)
                    """, role, next.highestCleared(), next.energy(), next.energyTimeSeconds(), next.sweepTimes(),
                    next.sweepResetAtSeconds(), next.milestoneClaimed(), next.formationVersion(), next.formationId());
        } else if (!previous.equals(next)) {
            jdbc.update("""
                    UPDATE game_tower SET highest_cleared=?,energy=?,energy_time_seconds=?,sweep_times=?,
                        sweep_reset_at_seconds=?,milestone_claimed=?,formation_version=?,formation_id=? WHERE role_id=?
                    """, next.highestCleared(), next.energy(), next.energyTimeSeconds(), next.sweepTimes(),
                    next.sweepResetAtSeconds(), next.milestoneClaimed(), next.formationVersion(), next.formationId(), role);
        }
    }

    /** 按固定位次读取同角色已提交的幻境专用阵容。 */
    List<Lineup.Slot> slots(String role) {
        return jdbc.query("SELECT position,hero_id FROM game_tower_formation_slot WHERE role_id=? ORDER BY position",
                (row, index) -> new Lineup.Slot(row.getInt(1), row.getString(2)), role);
    }

    /** 仅更新幻境站位，由调用方在同一事务递增幻境版本。 */
    void replaceSlots(String role, List<Lineup.Slot> slots) {
        jdbc.update("DELETE FROM game_tower_formation_slot WHERE role_id=?", role);
        for (var slot : slots) {
            jdbc.update("INSERT INTO game_tower_formation_slot(role_id,position,hero_id) VALUES (?,?,?)",
                    role, slot.position(), slot.heroId());
        }
    }

    /** 按同角色请求编号重读验证后的原结算，不用当前楼层或配置重算奖励。 */
    Recorded receipt(String role, String requestId) {
        return jdbc.query("""
                SELECT action_kind,target_id,max_diamonds,report_bytes,receipt_json,receipt_hash
                  FROM game_tower_request WHERE role_id=? AND request_id=?
                """, row -> {
                    if (!row.next()) {
                        return null;
                    }
                    var report = row.getBytes(4);
                    var saved = payloads.read(row.getString(5), row.getString(6), ReceiptData.class);
                    if (!role.equals(saved.roleId()) || !row.getString(1).equals(saved.action().name())
                            || row.getInt(2) != saved.targetId() || row.getLong(3) != saved.maxDiamonds()
                            || !Objects.equals(saved.replayHash(), replayHash(report))) {
                        throw new IllegalStateException("幻境之塔历史结算与原请求不一致");
                    }
                    return new Recorded(saved.targetId(), saved.maxDiamonds(),
                            new TowerService.Settlement(requestId, role, saved.assetRevision(), saved.action(),
                                saved.floor(), saved.won(), replay(report), saved.state(), saved.actual()));
                }, role, requestId);
    }

    /** 随结算冻结原账单及战报，损坏回执不会被识别成新请求。 */
    void saveReceipt(int targetId, long maxDiamonds, TowerService.Settlement result) {
        byte[] report = result.replay() == null ? null : result.replay().toByteArray();
        var frozen = payloads.freeze(new ReceiptData(result.roleId(), result.assetRevision(), result.action(),
                targetId, maxDiamonds, result.floor(), result.won(), replayHash(report), result.state(), result.actual()));
        jdbc.update("""
                INSERT INTO game_tower_request(role_id,request_id,action_kind,target_id,max_diamonds,
                    report_bytes,receipt_json,receipt_hash) VALUES (?,?,?,?,?,?,?,?)
                """, result.roleId(), result.requestId(), result.action().name(), targetId, maxDiamonds,
                report, frozen.json(), frozen.hash());
    }

    /** 按原协议恢复挑战战报，扫荡和里程碑没有战报。 */
    private static BattleReplay replay(byte[] report) {
        if (report == null) {
            return null;
        }
        try {
            return BattleReplay.parseFrom(report);
        } catch (InvalidProtocolBufferException failure) {
            throw new IllegalStateException("幻境之塔原战报无法读取", failure);
        }
    }

    /** 将挑战的二进制战报绑定到原结算数据。 */
    private static String replayHash(byte[] report) {
        if (report == null) {
            return null;
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(report));
        } catch (NoSuchAlgorithmException failure) {
            throw new IllegalStateException("缺少幻境之塔战报摘要算法", failure);
        }
    }
}
