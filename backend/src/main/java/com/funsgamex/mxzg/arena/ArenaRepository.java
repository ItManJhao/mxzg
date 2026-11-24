/**
 * 新手竞技场持久化。角色锁内保存对手、进度和冻结结算，战报和回执一起提交。
 * VIP 查询只读取已结算场次；战败也计参与，读取不会创建角色记录。
 */
package com.funsgamex.mxzg.arena;

import com.funsgamex.mxzg.arena.ArenaService.Challenge;
import com.funsgamex.mxzg.arena.ArenaService.History;
import com.funsgamex.mxzg.arena.ArenaService.State;
import com.funsgamex.mxzg.arena.ArenaService.TicketPurchase;
import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.google.protobuf.InvalidProtocolBufferException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ArenaRepository {
    /** 角色进度，累计参与和胜场跨日保留，dailyChallenges 随上海零点结算。 */
    record Progress(int robotWins, int settledChallenges, int dailyChallenges, long resetAtSeconds,
                    List<Integer> opponents) {
        /** 冻结名单；页面重开复用同一名单，刷新才会换一组。 */
        Progress {
            opponents = List.copyOf(opponents);
        }

        /** 刷新共同名单，原挑战次数及角色日结算时点保持。 */
        Progress withOpponents(List<Integer> selection) {
            return new Progress(robotWins, settledChallenges, dailyChallenges, resetAtSeconds, selection);
        }
    }

    /** 结算时冻结真实奖励与战报摘要，历史回执不重读箱子或当前阵容。 */
    private record StoredChallenge(String requestId, String roleId, long assetRevision, History record, State state,
                                   RewardGrantResult actual, String replayHash) {}

    /** 用事务连接按角色归属读写，调用方先锁角色。 */
    private final JdbcTemplate jdbc;
    /** 奖励回执的序列化与完整性校验，复用共用精确整数约束。 */
    private final RewardReceiptPayloads payloads;

    /** 注入竞技场存储所用事务连接与通用回执序列化能力。 */
    public ArenaRepository(JdbcTemplate jdbc, RewardReceiptPayloads payloads) {
        this.jdbc = jdbc;
        this.payloads = payloads;
    }

    /** 读取 VIP 的长期竞技场参与次数，未进入过竞技场的角色返回零。 */
    public int settledChallenges(String roleId) {
        return jdbc.query("SELECT settled_challenges FROM game_arena_progress WHERE role_id=?",
                row -> row.next() ? row.getInt(1) : 0, roleId);
    }

    /** 同一角色锁下读取对战神职等级，竞技场奖励取结算前真实数据。 */
    int clergyLevel(String roleId) {
        return jdbc.queryForObject("SELECT clergy_level FROM game_role WHERE id=?", Integer.class, roleId);
    }

    /** 查询当前对手和进度，角色尚未进入竞技场时返回空。 */
    Progress progress(String roleId) {
        return jdbc.query("""
                SELECT robot_wins,settled_challenges,daily_challenges,reset_at_seconds,opponents
                  FROM game_arena_progress WHERE role_id=?
                """, row -> {
                    if (!row.next()) {
                        return null;
                    }
                    var raw = row.getString(5);
                    var selection = raw.isEmpty() ? List.<Integer>of()
                            : Arrays.stream(raw.split(",", -1)).map(Integer::valueOf).toList();
                    return new Progress(row.getInt(1), row.getInt(2), row.getInt(3), row.getLong(4), selection);
                }, roleId);
    }

    /** 同角色事务写入当日次数和保留中的机器人名单，相同状态无需写入。 */
    void saveProgress(String roleId, Progress before, Progress after) {
        var selection = after.opponents().stream().map(String::valueOf).collect(Collectors.joining(","));
        if (before == null) {
            jdbc.update("""
                    INSERT INTO game_arena_progress(role_id,robot_wins,settled_challenges,daily_challenges,
                        reset_at_seconds,opponents) VALUES (?,?,?,?,?,?)
                    """, roleId, after.robotWins(), after.settledChallenges(), after.dailyChallenges(),
                    after.resetAtSeconds(), selection);
        } else if (!before.equals(after)) {
            jdbc.update("""
                    UPDATE game_arena_progress SET robot_wins=?,settled_challenges=?,daily_challenges=?,
                        reset_at_seconds=?,opponents=? WHERE role_id=?
                    """, after.robotWins(), after.settledChallenges(), after.dailyChallenges(),
                    after.resetAtSeconds(), selection, roleId);
        }
    }

    /** 从原结算提取显示记录，按同角色事务分配的顺序展示最新配置条数。 */
    List<History> history(String roleId, int limit) {
        return jdbc.query("""
                SELECT battle_id,opponent_id,opponent_name,won,score_delta,settled_at_seconds
                  FROM game_arena_challenge WHERE role_id=? ORDER BY settlement_number DESC LIMIT ?
                """, ArenaRepository::historyRow, roleId, limit);
    }

    /** 按原命令编号查历史结果，避免战报丢失后再次扣费和写入进度。 */
    Challenge receipt(String roleId, String requestId) {
        return jdbc.query("""
                SELECT request_id,battle_id,report_bytes,receipt_json,receipt_hash
                  FROM game_arena_challenge WHERE role_id=? AND request_id=?
                """, row -> {
                    return readChallenge(roleId, row);
                }, roleId, requestId);
    }

    /** 按真实角色和战报编号查阅原结果，跨角色查询返回空。 */
    Challenge byBattle(String roleId, String battleId) {
        return jdbc.query("""
                SELECT request_id,battle_id,report_bytes,receipt_json,receipt_hash
                  FROM game_arena_challenge WHERE role_id=? AND battle_id=?
                """, row -> {
                    return readChallenge(roleId, row);
                }, roleId, battleId);
    }

    /** 同一事务保存战斗历史的查询列、原报告和实际发奖回执。 */
    void saveChallenge(Challenge result) {
        var bytes = result.replay().toByteArray();
        var history = result.record();
        var saved = payloads.freeze(new StoredChallenge(result.requestId(), result.roleId(), result.assetRevision(), history,
                result.state(), result.actual(), hash(bytes)));
        jdbc.update("""
                INSERT INTO game_arena_challenge(role_id,request_id,battle_id,settlement_number,opponent_id,opponent_name,
                    won,score_delta,settled_at_seconds,report_bytes,receipt_json,receipt_hash)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                """, result.roleId(), result.requestId(), history.battleId(), result.state().settledChallenges(),
                history.opponentId(), history.opponentName(), history.won(), history.scoreDelta(),
                history.settledAtSeconds(), bytes, saved.json(), saved.hash());
    }

    /** 恢复门票购买的实际入账，复核角色和原命令归属。 */
    TicketPurchase ticketReceipt(String roleId, String requestId) {
        return jdbc.query("""
                SELECT receipt_json,receipt_hash FROM game_arena_ticket_purchase WHERE role_id=? AND request_id=?
                """, row -> {
                    if (!row.next()) {
                        return null;
                    }
                    var result = payloads.read(row.getString(1), row.getString(2), TicketPurchase.class);
                    if (!roleId.equals(result.roleId()) || !requestId.equals(result.requestId())) {
                        throw new IllegalStateException("竞技场门票历史结果归属无效");
                    }
                    return result;
                }, roleId, requestId);
    }

    /** 冻结门票购买的原扣费与实际库存增量，用于断线恢复。 */
    void saveTicketReceipt(TicketPurchase result) {
        var saved = payloads.freeze(result);
        jdbc.update("""
                INSERT INTO game_arena_ticket_purchase(role_id,request_id,receipt_json,receipt_hash) VALUES (?,?,?,?)
                """, result.roleId(), result.requestId(), saved.json(), saved.hash());
    }

    /** 将历史展示列映射到该场战斗记录。 */
    private static History historyRow(ResultSet row, int index) throws SQLException {
        return new History(row.getString(1), row.getInt(2), row.getString(3), row.getBoolean(4),
                row.getInt(5), row.getLong(6));
    }

    /** 校验冻结回执与原始二进制的关联，损坏数据不能作为未结算处理。 */
    private Challenge readChallenge(String roleId, ResultSet row) throws SQLException {
        if (!row.next()) {
            return null;
        }
        var requestId = row.getString(1);
        var bytes = row.getBytes(3);
        var saved = payloads.read(row.getString(4), row.getString(5), StoredChallenge.class);
        if (!roleId.equals(saved.roleId()) || !requestId.equals(saved.requestId())
                || !row.getString(2).equals(saved.record().battleId()) || !hash(bytes).equals(saved.replayHash())) {
            throw new IllegalStateException("竞技场历史归属、索引或战报摘要无效");
        }
        try {
            return new Challenge(requestId, roleId, saved.assetRevision(), saved.record(),
                    BattleReplay.parseFrom(bytes), saved.state(), saved.actual());
        } catch (InvalidProtocolBufferException failure) {
            throw new IllegalStateException("竞技场原战报无法读取", failure);
        }
    }

    /** 将不可变战报字节绑定到历史结算。 */
    private static String hash(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException failure) {
            throw new IllegalStateException("缺少竞技场战报摘要算法", failure);
        }
    }
}
