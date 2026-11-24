/**
 * 主线快速战斗的成功回执仓库。每日次数与契约任务累计均由同一批实际提交记录计算。
 * 快速战斗服务持角色锁写入，查询和重试不会创建记录。
 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MainChapterQuickBattleRepository {
    /** 读写同库角色回执，写入参与快速战斗发奖事务。 */
    private final JdbcTemplate jdbc;
    /** 按共享摘要机制保存和恢复不可重算的结果。 */
    private final RewardReceiptPayloads payloads;

    /** 注入回执的持久连接与摘要助手。 */
    public MainChapterQuickBattleRepository(JdbcTemplate jdbc, RewardReceiptPayloads payloads) {
        this.jdbc = jdbc;
        this.payloads = payloads;
    }

    /** 返回指定角色终身成功次数，供契约任务读取。无回执意为 0 次。 */
    public int totalSuccessful(String roleId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_quick_battle_receipt WHERE role_id=?",
                Integer.class, roleId);
    }

    /** 返回以指定上海零点结束的游戏日的实际成功次数。 */
    public int used(String roleId, long resetAt) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM game_quick_battle_receipt WHERE role_id=? AND reset_at=?",
                Integer.class, roleId, resetAt);
    }

    /** 按角色和请求键返回原次成功结果，未执行过时返回空。 */
    public MainChapterQuickBattleService.Receipt receipt(String roleId, String requestId) {
        var rows = jdbc.query("SELECT payload_json, payload_hash FROM game_quick_battle_receipt WHERE role_id=? AND request_id=?",
                (row, index) -> payloads.read(row.getString(1), row.getString(2),
                        MainChapterQuickBattleService.Receipt.class), roleId, requestId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    /** 在原次奖励事务内保存结果，插入失败时由外层回滚扣费、奖励及次数。 */
    public void save(MainChapterQuickBattleService.Receipt receipt) {
        var frozen = payloads.freeze(receipt);
        jdbc.update("INSERT INTO game_quick_battle_receipt(role_id,request_id,reset_at,payload_json,payload_hash) VALUES (?,?,?,?,?)",
                receipt.roleId(), receipt.requestId(), receipt.state().resetAt(), frozen.json(), frozen.hash());
    }
}
