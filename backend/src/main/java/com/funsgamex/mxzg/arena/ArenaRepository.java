/**
 * 竞技场持久化。角色锁内保存候选、防守阵容、进度和双方冻结结算。
 * VIP 查询只读取已结算场次；战败也计参与，读取不会创建角色记录。
 */
package com.funsgamex.mxzg.arena;

import com.funsgamex.mxzg.arena.ArenaService.Challenge;
import com.funsgamex.mxzg.arena.ArenaService.Defense;
import com.funsgamex.mxzg.arena.ArenaService.DefenseSaveResult;
import com.funsgamex.mxzg.arena.ArenaService.History;
import com.funsgamex.mxzg.arena.ArenaService.State;
import com.funsgamex.mxzg.arena.ArenaService.TicketPurchase;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.google.protobuf.InvalidProtocolBufferException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ArenaRepository {
    /** 旧攻方表强制配置 ID 大于零。真人行以单独角色列标识，旧列仅填兼容值。 */
    private static final int PLAYER_LEGACY_OPPONENT_ID = 1;
    /** 匹配仅针对同服角色，候选至少有一份有效的持久阵容。 */
    private static final String MATCHABLE = """
            r.role_level>=6 AND (EXISTS(SELECT 1 FROM game_arena_defense_slot d WHERE d.role_id=r.id)
                OR EXISTS(SELECT 1 FROM game_lineup_slot s WHERE s.role_id=r.id AND s.position BETWEEN 1 AND 8))
            """;

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

    /** 真人匹配及候选卡所需的当前角色与主战力。 */
    record MatchPlayer(String roleId, String name, int level, int score, long power, int avatarId, int borderId) {}

    /** 当前角色按旧匹配顺序的位置及候选池，供强弱配比使用。 */
    record MatchPool(int viewerRank, List<MatchPlayer> players) {}

    /** 原防守草稿与已提交结果；角色行锁内精确识别丢包重试。 */
    record DefenseReceipt(long expectedVersion, int formationId, List<Lineup.Slot> slots, DefenseSaveResult result) {}

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

    /** 按旧排序从本人前后取候选。接近榜首或末尾时，分别从榜首或榜尾取够同服合格角色。 */
    MatchPool matchPool(String roleId, String serverId, int limit) {
        int half = limit / 2;
        return jdbc.query("""
                WITH ranked AS (
                    SELECT r.id,r.nickname,r.role_level,r.cup,r.current_main_power,r.head_id,r.border_id,
                        CASE WHEN %s THEN TRUE ELSE FALSE END AS eligible,
                        COUNT(*) OVER () AS population,
                        ROW_NUMBER() OVER (ORDER BY r.cup DESC,r.arena_last_battle_at_seconds,r.role_level DESC,n.public_id,r.id) AS place
                    FROM game_role r LEFT JOIN game_role_public_number n ON n.role_id=r.id WHERE r.server_id=?
                )
                SELECT candidate.*,viewer.place AS viewer_rank
                FROM ranked candidate CROSS JOIN ranked viewer
                WHERE viewer.id=? AND candidate.id<>viewer.id AND candidate.eligible=TRUE
                    AND (viewer.place<=? OR viewer.place+?>viewer.population
                        OR (candidate.place+?>=viewer.place AND candidate.place<=viewer.place+?))
                ORDER BY CASE WHEN viewer.place>? AND viewer.place+?>viewer.population
                    THEN candidate.place END DESC,candidate.place LIMIT ?
                """.formatted(MATCHABLE), row -> {
                    if (!row.next()) {
                        return new MatchPool(0, List.of());
                    }
                    int viewerRank = row.getInt("viewer_rank");
                    var players = new ArrayList<MatchPlayer>();
                    do {
                        players.add(matchRow(row, 0));
                    } while (row.next());
                    return new MatchPool(viewerRank, players);
                }, serverId, roleId, half, half, half, half, half, half, limit);
    }

    /** 重开时复用原候选槽位，资料变化或失去防守英雄按当前角色数据读取。 */
    List<MatchPlayer> candidates(String roleId, String serverId) {
        return jdbc.query("""
                SELECT r.id,r.nickname,r.role_level,r.cup,r.current_main_power,r.head_id,r.border_id
                FROM game_arena_player_candidate c JOIN game_role r ON r.id=c.target_id
                WHERE c.role_id=? AND r.server_id=? AND %s ORDER BY c.position
                """.formatted(MATCHABLE), ArenaRepository::matchRow, roleId, serverId);
    }

    /** 替换当前会话角色持久候选顺序，客户端从同一名单选择挑战目标。 */
    void replaceCandidates(String roleId, List<MatchPlayer> players) {
        jdbc.update("DELETE FROM game_arena_player_candidate WHERE role_id=?", roleId);
        for (int index = 0; index < players.size(); index++) {
            jdbc.update("INSERT INTO game_arena_player_candidate(role_id,position,target_id) VALUES (?,?,?)",
                    roleId, index + 1, players.get(index).roleId());
        }
    }

    /** 冻结同场参与时间，用于旧匹配对同杯角色的稳定次序。 */
    void observeBattle(String roleId, long atSeconds) {
        jdbc.update("UPDATE game_role SET arena_last_battle_at_seconds=? WHERE id=?", atSeconds, roleId);
    }

    /** 查询专用阵型及真实有效的站位，尚未保存时由调用者回退到主阵。 */
    Defense defense(String roleId) {
        var selected = jdbc.query("SELECT version,formation_id FROM game_arena_defense WHERE role_id=?",
                (row, index) -> new Defense(row.getLong(1), row.getInt(2), List.of(), false), roleId);
        if (selected.isEmpty()) {
            return null;
        }
        var header = selected.getFirst();
        var slots = jdbc.query("SELECT position,hero_id FROM game_arena_defense_slot WHERE role_id=? ORDER BY position",
                (row, index) -> new Lineup.Slot(row.getInt(1), row.getString(2)), roleId);
        return new Defense(header.version(), header.formationId(), slots, false);
    }

    /** 持久化变更后的防守版本及所属站位，不修改主线阵容。 */
    void saveDefense(String roleId, Defense old, Defense updated) {
        if (old == null) {
            jdbc.update("INSERT INTO game_arena_defense(role_id,version,formation_id) VALUES (?,?,?)",
                    roleId, updated.version(), updated.formationId());
        } else {
            jdbc.update("UPDATE game_arena_defense SET version=?,formation_id=? WHERE role_id=?",
                    updated.version(), updated.formationId(), roleId);
            jdbc.update("DELETE FROM game_arena_defense_slot WHERE role_id=?", roleId);
        }
        for (var slot : updated.slots()) {
            jdbc.update("INSERT INTO game_arena_defense_slot(role_id,position,hero_id) VALUES (?,?,?)",
                    roleId, slot.position(), slot.heroId());
        }
    }

    /** 按角色和原命令恢复成功的防守阵容回执。 */
    DefenseReceipt defenseReceipt(String roleId, String requestId) {
        return jdbc.query("SELECT receipt_json,receipt_hash FROM game_arena_defense_save WHERE role_id=? AND request_id=?",
                row -> row.next() ? payloads.read(row.getString(1), row.getString(2), DefenseReceipt.class) : null,
                roleId, requestId);
    }

    /** 同事务冻结原草稿与实际生效阵容，重复请求不重复变更版本。 */
    void saveDefenseReceipt(String roleId, DefenseReceipt receipt) {
        var saved = payloads.freeze(receipt);
        jdbc.update("INSERT INTO game_arena_defense_save(role_id,request_id,receipt_json,receipt_hash) VALUES (?,?,?,?)",
                roleId, receipt.result().requestId(), saved.json(), saved.hash());
    }

    /** 合并攻防视角并按结算时刻和同秒内序号取得最近战报，旧机器人记录仍按原参与序号。 */
    List<History> history(String roleId, int limit) {
        return jdbc.query("""
                SELECT * FROM (
                    SELECT a.battle_id,a.opponent_id,a.opponent_name,a.won,a.score_delta,a.settled_at_seconds,
                        a.opponent_role_id,FALSE AS defense,COALESCE(d.id,0) AS player_order,a.settlement_number
                    FROM game_arena_challenge a LEFT JOIN game_arena_defense_history d ON d.battle_id=a.battle_id
                    WHERE a.role_id=?
                    UNION ALL
                    SELECT d.battle_id,0,d.opponent_name,d.won,d.score_delta,d.settled_at_seconds,d.opponent_role_id,
                        TRUE,d.id,0 FROM game_arena_defense_history d WHERE d.role_id=?
                ) histories ORDER BY settled_at_seconds DESC,player_order DESC,settlement_number DESC LIMIT ?
                """, ArenaRepository::historyRow, roleId, roleId, limit);
    }

    /** 按原命令编号查历史结果，避免战报丢失后再次扣费和写入进度。 */
    Challenge receipt(String roleId, String requestId) {
        return jdbc.query("""
                SELECT request_id,battle_id,report_bytes,receipt_json,receipt_hash
                  FROM game_arena_challenge WHERE role_id=? AND request_id=?
                """, row -> row.next() ? readChallenge(roleId, row) : null, roleId, requestId);
    }

    /** 同一真人战报只接受原攻方及其防守方查询；查阅不重复结算。 */
    Challenge byBattle(String roleId, String battleId) {
        return jdbc.query("""
                SELECT a.request_id,a.battle_id,a.report_bytes,a.receipt_json,a.receipt_hash,a.role_id
                FROM game_arena_challenge a LEFT JOIN game_arena_defense_history d ON d.battle_id=a.battle_id
                WHERE a.battle_id=? AND (a.role_id=? OR d.role_id=?)
                """, row -> row.next() ? readChallenge(row.getString(6), row) : null, battleId, roleId, roleId);
    }

    /** 同一事务保存战斗历史的查询列、原报告和实际发奖回执。 */
    void saveChallenge(Challenge result) {
        var bytes = result.replay().toByteArray();
        var history = result.record();
        var saved = payloads.freeze(new StoredChallenge(result.requestId(), result.roleId(), result.assetRevision(), history,
                defenseDeltaSign(result.state(), 1), result.actual(), hash(bytes)));
        jdbc.update("""
                INSERT INTO game_arena_challenge(role_id,request_id,battle_id,settlement_number,opponent_id,opponent_name,
                    won,score_delta,settled_at_seconds,report_bytes,receipt_json,receipt_hash,opponent_role_id)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, result.roleId(), result.requestId(), history.battleId(), result.state().settledChallenges(),
                history.opponentRoleId() == null ? history.opponentId() : PLAYER_LEGACY_OPPONENT_ID, history.opponentName(), history.won(),
                history.scoreDelta(), history.settledAtSeconds(), bytes, saved.json(), saved.hash(), history.opponentRoleId());
    }

    /** 同场保存守方独立视角和实际扣分，与攻方回执在一笔事务提交。 */
    void saveDefenseHistory(String roleId, History record) {
        jdbc.update("""
                INSERT INTO game_arena_defense_history(battle_id,role_id,opponent_role_id,opponent_name,won,score_delta,settled_at_seconds)
                VALUES (?,?,?,?,?,?,?)
                """, record.battleId(), roleId, record.opponentRoleId(), record.opponentName(), record.won(),
                record.scoreDelta(), record.settledAtSeconds());
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
        String target = row.getString(7);
        return new History(row.getString(1), target == null ? row.getInt(2) : 0, row.getString(3), row.getBoolean(4),
                row.getInt(5), row.getLong(6), target, row.getBoolean(8));
    }

    /** 映射竞技场的公开候选卡片，尚未计算的主阵战力显示为零。 */
    private static MatchPlayer matchRow(ResultSet row, int index) throws SQLException {
        return new MatchPlayer(row.getString("id"), row.getString("nickname"), row.getInt("role_level"),
                row.getInt("cup"), row.getLong("current_main_power"), row.getInt("head_id"),
                row.getInt("border_id"));
    }

    /** 校验冻结回执与原始二进制的关联，损坏数据不能作为未结算处理。 */
    private Challenge readChallenge(String roleId, ResultSet row) throws SQLException {
        var requestId = row.getString(1);
        var bytes = row.getBytes(3);
        var saved = payloads.read(row.getString(4), row.getString(5), StoredChallenge.class);
        if (!roleId.equals(saved.roleId()) || !requestId.equals(saved.requestId())
                || !row.getString(2).equals(saved.record().battleId()) || !hash(bytes).equals(saved.replayHash())) {
            throw new IllegalStateException("竞技场历史归属、索引或战报摘要无效");
        }
        try {
            return new Challenge(requestId, roleId, saved.assetRevision(), saved.record(),
                    BattleReplay.parseFrom(bytes), defenseDeltaSign(saved.state(), -1), saved.actual());
        } catch (InvalidProtocolBufferException failure) {
            throw new IllegalStateException("竞技场原战报无法读取", failure);
        }
    }

    /** 通用奖励回执要求非负数。快照冻存守方扣分绝对值，恢复时按原守方标识还原符号。 */
    private static State defenseDeltaSign(State state, int sign) {
        var history = state.history().stream().map(record -> record.defense() && record.scoreDelta() != 0
                ? new History(record.battleId(), record.opponentId(), record.opponentName(), record.won(),
                        sign * Math.abs(record.scoreDelta()), record.settledAtSeconds(), record.opponentRoleId(), true)
                : record).toList();
        return new State(state.score(), state.freeRemaining(), state.robotWins(), state.settledChallenges(), state.resetAtSeconds(),
                state.newcomerActive(), state.opponents(), history, state.ticketBalance(), state.ticketPriceDiamonds());
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
