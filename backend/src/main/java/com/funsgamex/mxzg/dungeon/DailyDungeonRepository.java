/** 角色锁内持久化金币首关的历史通关、每日胜场和二进制回执，供服务端重试恢复。 */
package com.funsgamex.mxzg.dungeon;

import com.funsgamex.mxzg.protocol.GameProtocol;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.google.protobuf.InvalidProtocolBufferException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DailyDungeonRepository {
    /** 角色的关卡进度；resetAtSeconds 是旧规则记录的上海零点 Unix 秒。 */
    public record Progress(int wins, boolean cleared, long resetAtSeconds) {}

    /** 冻结角色等级、女神 VIP、神职与战报攻方名称。 */
    public record Access(int level, int vip, int clergy, String nickname) {}

    /** 原命令及其结果，判断命令 ID 被误用或篡改。 */
    public record Recorded(boolean sweep, long maxDiamonds, DailyDungeonService.Challenge result) {}

    /** 用现有摘要工具保存回执元信息，战报作为独立 Protobuf 二进制列。 */
    private record ReceiptData(String roleId, long assetRevision, String battleId, boolean won,
                               DailyDungeonService.State state, RewardGrantResult actual, String replayHash) {}

    /** 共用角色锁事务的数据连接，呼叫方须先锁角色。 */
    private final JdbcTemplate jdbc;
    /** 共享实际奖励冻结和完整性校验，不用当前库存重算历史。 */
    private final RewardReceiptPayloads payloads;

    /** 注入数据库和通用回执工具。 */
    public DailyDungeonRepository(JdbcTemplate jdbc, RewardReceiptPayloads payloads) {
        this.jdbc = jdbc;
        this.payloads = payloads;
    }

    /** 读取当前资格的持久等级，后续消费不信任客户端展示值。 */
    public Access access(String role) {
        return jdbc.queryForObject("SELECT role_level,goddess_vip,clergy_level,nickname FROM game_role WHERE id=?",
                (row, index) -> new Access(row.getInt(1), row.getInt(2), row.getInt(3), row.getString(4)), role);
    }

    /** 返回原进度；尚未挑战的角色保持缺行。 */
    public Progress progress(String role) {
        return jdbc.query("SELECT wins,cleared,reset_at_seconds FROM game_daily_gold WHERE role_id=?", rows -> {
            return rows.next() ? new Progress(rows.getInt(1), rows.getBoolean(2), rows.getLong(3)) : null;
        }, role);
    }

    /** 同角色锁内写入本场后的胜场与清扫资格。 */
    public void saveProgress(String role, Progress before, Progress after) {
        if (before == null) {
            jdbc.update("INSERT INTO game_daily_gold(role_id,wins,cleared,reset_at_seconds) VALUES (?,?,?,?)",
                    role, after.wins(), after.cleared(), after.resetAtSeconds());
        } else if (!before.equals(after)) {
            jdbc.update("UPDATE game_daily_gold SET wins=?,cleared=?,reset_at_seconds=? WHERE role_id=?",
                    after.wins(), after.cleared(), after.resetAtSeconds(), role);
        }
    }

    /** 重发只读取已提交的原状态、实际奖励和冻结战报；发现损坏拒绝整包。 */
    public Recorded receipt(String role, String requestId) {
        return jdbc.query("SELECT sweep,max_diamonds,report_bytes,receipt_json,receipt_hash "
                + "FROM game_daily_gold_request WHERE role_id=? AND request_id=?", row -> {
                    if (!row.next()) {
                        return null;
                    }
                    boolean sweep = row.getBoolean(1);
                    long maxDiamonds = row.getLong(2);
                    var replayBytes = row.getBytes(3);
                    var saved = payloads.read(row.getString(4), row.getString(5), ReceiptData.class);
                    if (!role.equals(saved.roleId()) || (saved.actual() != null && !role.equals(saved.actual().roleId()))
                            || !Objects.equals(saved.replayHash(), replayHash(replayBytes))) {
                        throw new IllegalStateException("金币副本历史结果归属或战报摘要无效");
                    }
                    var receipt = new DailyDungeonService.Challenge(requestId, role, saved.assetRevision(),
                            saved.battleId(), saved.won(), sweep, replay(replayBytes), saved.state(), saved.actual());
                    return new Recorded(sweep, maxDiamonds, receipt);
                }, role, requestId);
    }

    /** 进度、资产和原命令只在同一事务成功后可见。 */
    public void saveReceipt(long maxDiamonds, DailyDungeonService.Challenge result) {
        byte[] replayBytes = result.replay() == null ? null : result.replay().toByteArray();
        var payload = payloads.freeze(new ReceiptData(result.roleId(), result.assetRevision(), result.battleId(),
                result.won(), result.state(), result.actual(), replayHash(replayBytes)));
        jdbc.update("INSERT INTO game_daily_gold_request(role_id,request_id,sweep,max_diamonds,report_bytes,"
                        + "receipt_json,receipt_hash) VALUES (?,?,?,?,?,?,?)",
                result.roleId(), result.requestId(), result.sweep(), maxDiamonds, replayBytes, payload.json(), payload.hash());
    }

    /** 原二进制战报损坏时抛出持久化错误，扫荡没有回放内容。 */
    private static GameProtocol.BattleReplay replay(byte[] bytes) {
        if (bytes == null) {
            return null;
        }
        try {
            return GameProtocol.BattleReplay.parseFrom(bytes);
        } catch (InvalidProtocolBufferException failure) {
            throw new IllegalStateException("金币副本原战报无法读取", failure);
        }
    }

    /** 把战报摘要绑定到原结算数据，避免用其他场次回放冒充结果。 */
    private static String replayHash(byte[] bytes) {
        if (bytes == null) {
            return null;
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException failure) {
            throw new IllegalStateException("缺少金币副本战报摘要算法", failure);
        }
    }
}
