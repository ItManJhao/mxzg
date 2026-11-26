/**
 * 彩虹圣殿独立阵容与保存回执。锁由 RainbowCombat 持有，仓储只在该事务中读写。
 * 英雄被消费时外键移除对应站位，已完成的保存回执保留原结果。
 */
package com.funsgamex.mxzg.rainbow;

import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.rainbow.RainbowCombat.Formation;
import com.funsgamex.mxzg.rainbow.RainbowCombat.FormationSave;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RainbowFormationRepository {
    /** 原草稿和成功结果用于识别同一次重试，避免迟到的保存覆盖新阵容。 */
    record Receipt(long expectedVersion, int formationId, List<Lineup.Slot> slots, FormationSave result) {
        /** 冻结原始站位顺序，回执将用同一份内容校验重试。 */
        Receipt {
            slots = List.copyOf(slots);
        }
    }

    /** 使用角色锁所在事务的数据库连接读取和替换圣殿站位。 */
    private final JdbcTemplate jdbc;
    /** 保存冻结的回执内容和摘要，在重读时检查持久内容。 */
    private final RewardReceiptPayloads payloads;

    /** 注入 JDBC 及项目统一回执编码，仓储本身没有会话或本地状态。 */
    RainbowFormationRepository(JdbcTemplate jdbc, RewardReceiptPayloads payloads) {
        this.jdbc = jdbc;
        this.payloads = payloads;
    }

    /** 返回实际圣殿阵容，首次使用显示原版的空起源阵型。 */
    Formation current(String roleId) {
        var header = jdbc.query("SELECT version, formation_id FROM game_rainbow_formation WHERE role_id=?",
                row -> row.next() ? new Formation(row.getLong(1), row.getInt(2), List.of()) : null, roleId);
        if (header == null) {
            return new Formation(0, 1, List.of());
        }
        var slots = jdbc.query("SELECT position, hero_id FROM game_rainbow_formation_slot WHERE role_id=? ORDER BY position",
                (row, index) -> new Lineup.Slot(row.getInt(1), row.getString(2)), roleId);
        return new Formation(header.version(), header.formationId(), slots);
    }

    /** 更新已通过版本校验的阵容头和全部站位，不读写其他玩法的阵容。 */
    void save(String roleId, long expectedVersion, Formation updated) {
        if (expectedVersion == 0) {
            jdbc.update("INSERT INTO game_rainbow_formation(role_id, version, formation_id) VALUES (?, ?, ?)",
                    roleId, updated.version(), updated.formationId());
        } else {
            int count = jdbc.update("UPDATE game_rainbow_formation SET version=?, formation_id=? WHERE role_id=? AND version=?",
                    updated.version(), updated.formationId(), roleId, expectedVersion);
            if (count != 1) {
                throw new IllegalStateException("圣殿阵容版本已在当前事务外修改");
            }
            jdbc.update("DELETE FROM game_rainbow_formation_slot WHERE role_id=?", roleId);
        }
        for (var slot : updated.slots()) {
            jdbc.update("INSERT INTO game_rainbow_formation_slot(role_id, position, hero_id) VALUES (?, ?, ?)",
                    roleId, slot.position(), slot.heroId());
        }
    }

    /** 按角色与请求编号读原保存结果，首次请求返回 null。 */
    Receipt receipt(String roleId, String requestId) {
        return jdbc.query("SELECT receipt_json, receipt_hash FROM game_rainbow_formation_save WHERE role_id=? AND request_id=?",
                row -> row.next() ? payloads.read(row.getString(1), row.getString(2), Receipt.class) : null,
                roleId, requestId);
    }

    /** 冻结原草稿与已保存结果，必须和圣殿阵容在同一事务提交。 */
    void saveReceipt(String roleId, Receipt receipt) {
        var payload = payloads.freeze(receipt);
        jdbc.update("INSERT INTO game_rainbow_formation_save(role_id, request_id, receipt_json, receipt_hash) VALUES (?, ?, ?, ?)",
                roleId, receipt.result().requestId(), payload.json(), payload.hash());
    }
}
