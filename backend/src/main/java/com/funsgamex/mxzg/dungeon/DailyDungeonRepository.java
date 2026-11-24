/**
 * 按角色和副本类型持久化关卡进度及共享胜次。
 * 副本服务在角色锁内写入，原回执用于重发和统计跨日累计参与次数。
 */
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
    /** 同类型共享当日胜场；最高通关跨日保留，resetAtSeconds 为上海零点 Unix 秒。 */
    public record Progress(int wins, int highestCleared, long resetAtSeconds) {}

    /** 冻结角色等级、女神 VIP、神职与战报攻方名称。 */
    public record Access(int level, int vip, int clergy, String nickname) {}

    /** 原命令及其结果，判断命令 ID 被误用或篡改。 */
    public record Recorded(boolean sweep, long maxDiamonds, DailyDungeonService.Challenge result) {}

    /** 用摘要保护回执与独立的二进制战报，旧版金币回执没有类型字段。 */
    private record ReceiptData(String roleId, long assetRevision, String battleId, boolean won,
                               DailyDungeonService.State state, RewardGrantResult actual, String replayHash,
                               String dungeonType) {}

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

    /** 返回指定类型的原进度，尚未挑战该类型时没有持久行。 */
    public Progress progress(String role, DailyDungeonType type) {
        return jdbc.query("""
                SELECT wins,highest_cleared,reset_at_seconds FROM game_daily_dungeon
                 WHERE role_id=? AND dungeon_type=?
                """, rows -> {
                    return rows.next() ? new Progress(rows.getInt(1), rows.getInt(2), rows.getLong(3)) : null;
                }, role, type.key());
    }

    /** 同角色锁内写入本类型的共享胜场与最高通关。 */
    public void saveProgress(String role, DailyDungeonType type, Progress before, Progress after) {
        if (before == null) {
            jdbc.update("""
                    INSERT INTO game_daily_dungeon(role_id,dungeon_type,wins,highest_cleared,reset_at_seconds)
                    VALUES (?,?,?,?,?)
                    """, role, type.key(), after.wins(), after.highestCleared(), after.resetAtSeconds());
        } else if (!before.equals(after)) {
            jdbc.update("""
                    UPDATE game_daily_dungeon SET wins=?,highest_cleared=?,reset_at_seconds=?
                     WHERE role_id=? AND dungeon_type=?
                    """, after.wins(), after.highestCleared(), after.resetAtSeconds(), role, type.key());
        }
    }

    /** 按角色统计所有类型的已结算挑战及扫荡，包含失败战斗，超过任务进度上限时截断。 */
    public int participationCount(String role) {
        long count = jdbc.queryForObject("SELECT COUNT(*) FROM game_daily_dungeon_request WHERE role_id=?",
                Long.class, role);
        return (int) Math.min(count, Integer.MAX_VALUE);
    }

    /** 按角色及全类型唯一请求编号恢复冻结结果，验证类型、资产归属和战报摘要。 */
    public Recorded receipt(String role, String requestId) {
        return jdbc.query("""
                SELECT sweep,max_diamonds,report_bytes,receipt_json,receipt_hash,dungeon_type
                  FROM game_daily_dungeon_request WHERE role_id=? AND request_id=?
                """, row -> {
                    if (!row.next()) {
                        return null;
                    }
                    boolean sweep = row.getBoolean(1);
                    long maxDiamonds = row.getLong(2);
                    var replayBytes = row.getBytes(3);
                    var saved = payloads.read(row.getString(4), row.getString(5), ReceiptData.class);
                    var type = DailyDungeonType.fromKey(row.getString(6));
                    var storedType = saved.dungeonType() == null
                            ? DailyDungeonType.GOLD : DailyDungeonType.fromKey(saved.dungeonType());
                    if (!role.equals(saved.roleId()) || (saved.actual() != null && !role.equals(saved.actual().roleId()))
                            || type != storedType || !Objects.equals(saved.replayHash(), replayHash(replayBytes))) {
                        throw new IllegalStateException("日常副本历史结果类型、归属或战报摘要无效");
                    }
                    var receipt = new DailyDungeonService.Challenge(requestId, type, role, saved.assetRevision(),
                            saved.battleId(), saved.won(), sweep, replay(replayBytes), saved.state(), saved.actual());
                    return new Recorded(sweep, maxDiamonds, receipt);
                }, role, requestId);
    }

    /** 同一资产事务冻结当前类型和原命令，不重复计算历史发奖。 */
    public void saveReceipt(long maxDiamonds, DailyDungeonService.Challenge result) {
        byte[] replayBytes = result.replay() == null ? null : result.replay().toByteArray();
        var payload = payloads.freeze(new ReceiptData(result.roleId(), result.assetRevision(), result.battleId(),
                result.won(), result.state(), result.actual(), replayHash(replayBytes), result.type().key()));
        jdbc.update("""
                INSERT INTO game_daily_dungeon_request(role_id,dungeon_type,request_id,sweep,max_diamonds,report_bytes,
                    receipt_json,receipt_hash) VALUES (?,?,?,?,?,?,?,?)
                """, result.roleId(), result.type().key(), result.requestId(), result.sweep(),
                maxDiamonds, replayBytes, payload.json(), payload.hash());
    }

    /** 原二进制战报损坏时抛出持久化错误，扫荡没有回放内容。 */
    private static GameProtocol.BattleReplay replay(byte[] bytes) {
        if (bytes == null) {
            return null;
        }
        try {
            return GameProtocol.BattleReplay.parseFrom(bytes);
        } catch (InvalidProtocolBufferException failure) {
            throw new IllegalStateException("日常副本原战报无法读取", failure);
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
            throw new IllegalStateException("缺少日常副本战报摘要算法", failure);
        }
    }
}
