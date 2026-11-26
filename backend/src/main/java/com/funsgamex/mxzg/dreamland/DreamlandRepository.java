/**
 * 保存永恒梦境的角色进度、活跃战报及幂等回执。写入由 DreamlandService 的角色锁串行化，
 * 战报采用原 Protobuf 二进制，不能被进度刷新或客户端重连重新模拟。
 */
package com.funsgamex.mxzg.dreamland;

import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.google.protobuf.InvalidProtocolBufferException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
class DreamlandRepository {
    /** 与其他角色玩法共用的事务内数据库连接。 */
    private final JdbcTemplate jdbc;
    /** 以同一映射器恢复冻结阵容、进度和已触发效果。 */
    private final ObjectMapper mapper;
    /** 冻结原命令回执并验证其完整性。 */
    private final RewardReceiptPayloads payloads;

    /** 状态与可空的当前战报随同一个版本提交。 */
    record Stored(DreamlandService.Progress progress, BattleReplay replay) {}

    /** 该角色一个请求编号所对应的原命令、结果和资产版本。 */
    record Receipt(DreamlandService.Command command, DreamlandService.Settlement result) {}

    /** 风险较大的 Protobuf 战报单独二进制冻结，JSON 只保留其元数据。 */
    private record ReceiptData(DreamlandService.Command command, DreamlandService.State state, String roleId,
                               long assetRevision, RewardGrantResult actual) {}

    /** 注入业务数据库映射器和回执摘要验证。 */
    DreamlandRepository(JdbcTemplate jdbc, ObjectMapper mapper, RewardReceiptPayloads payloads) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.payloads = payloads;
    }

    /** 读取角色唯一的梦境状态，初次打开返回 null。 */
    Stored find(String role) {
        return jdbc.query("SELECT progress_json,report_bytes FROM game_dreamland WHERE role_id=?",
                row -> row.next() ? new Stored(mapper.readValue(row.getString(1), DreamlandService.Progress.class),
                        parseReplay(row.getBytes(2))) : null, role);
    }

    /** 更新玩法唯一状态与到期索引，调用方已持有角色锁。 */
    void save(String role, Stored before, Stored after) {
        if (after.equals(before)) {
            return;
        }
        var progress = after.progress();
        var json = mapper.writeValueAsString(progress);
        var report = bytes(after.replay());
        long wakeAt = progress.run() == null ? 0 : Math.min(progress.resetAt(), progress.run().deadline());
        if (before == null) {
            jdbc.update("INSERT INTO game_dreamland(role_id,wake_at,progress_json,report_bytes) VALUES (?,?,?,?)",
                    role, wakeAt, json, report);
        } else {
            jdbc.update("UPDATE game_dreamland SET wake_at=?,progress_json=?,report_bytes=? WHERE role_id=?",
                    wakeAt, json, report, role);
        }
    }

    /** 读取少量已到期活跃角色，真正推进前还需在角色锁内复查。 */
    List<String> due(long now, int limit) {
        return jdbc.queryForList("""
                SELECT role_id FROM game_dreamland WHERE wake_at>0 AND wake_at<=?
                    ORDER BY wake_at,role_id LIMIT ?
                """, String.class, now, limit);
    }

    /** 从原命令回执返回历史响应，已处理的按钮重发不影响当前梦境。 */
    Receipt receipt(String role, String requestId) {
        return jdbc.query("""
                SELECT receipt_json,receipt_hash,report_bytes FROM game_dreamland_request
                    WHERE role_id=? AND request_id=?
                """, row -> {
                    if (!row.next()) {
                        return null;
                    }
                    var saved = payloads.read(row.getString(1), row.getString(2), ReceiptData.class);
                    if (!role.equals(saved.roleId()) || !requestId.equals(saved.command().requestId())) {
                        throw new IllegalStateException("永恒梦境原回执角色或请求不一致");
                    }
                    var state = saved.state().withReplay(parseReplay(row.getBytes(3)));
                    var result = new DreamlandService.Settlement(requestId, role, saved.assetRevision(),
                            saved.command().action(), state, saved.actual());
                    return new Receipt(saved.command(), result);
                }, role, requestId);
    }

    /** 随同进度和发奖保存初次确认的结果，保留响应原战报。 */
    void saveReceipt(DreamlandService.Command command, DreamlandService.Settlement result) {
        var state = result.state();
        byte[] report = state.battle() == null ? null : bytes(state.battle().replay());
        var frozen = payloads.freeze(new ReceiptData(command, state.withoutReplay(), result.roleId(),
                result.assetRevision(), result.actual()));
        jdbc.update("""
                INSERT INTO game_dreamland_request(role_id,request_id,receipt_json,receipt_hash,report_bytes)
                    VALUES (?,?,?,?,?)
                """, result.roleId(), result.requestId(), frozen.json(), frozen.hash(), report);
    }

    /** 普通状态无需战报，进行中的结果保存原二进制。 */
    private static byte[] bytes(BattleReplay replay) {
        return replay == null ? null : replay.toByteArray();
    }

    /** 数据库内损坏的战报仍属于原结算，不能以新战斗代替。 */
    private static BattleReplay parseReplay(byte[] report) {
        if (report == null) {
            return null;
        }
        try {
            return BattleReplay.parseFrom(report);
        } catch (InvalidProtocolBufferException failure) {
            throw new IllegalStateException("永恒梦境原战报无法读取", failure);
        }
    }
}
