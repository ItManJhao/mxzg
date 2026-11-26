/**
 * 保存黑市道具摊位的当期购买量，并冻结黑市购买命令的原回执。
 * 写入由 BlackMarketService 在角色行锁和资产事务内调用。
 */
package com.funsgamex.mxzg.blackmarket;

import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import java.util.HashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class BlackMarketRepository {
    /** 按原商店、期次、配置商品和份数辨别同一请求的重发。 */
    record Command(int shopType, long shelfVersion, int productId, int count) {}

    /** 经过摘要和归属校验的冻结成交结果和原入参。 */
    record Saved(Command command, BlackMarketService.Receipt receipt) {}

    /** 与当前业务事务绑定的连接，用于读取神职和读写黑市数据。 */
    private final JdbcTemplate jdbc;
    /** 共用历史回执冻结和完整性验证。 */
    private final RewardReceiptPayloads payloads;

    /** 注入事务连接及原回执的校验器。 */
    BlackMarketRepository(JdbcTemplate jdbc, RewardReceiptPayloads payloads) {
        this.jdbc = jdbc;
        this.payloads = payloads;
    }

    /** 读角色真正的神职等级，黑市资格不使用女神 VIP。 */
    int clergyLevel(String roleId) {
        return jdbc.queryForObject("SELECT clergy_level FROM game_role WHERE id=?", Integer.class, roleId);
    }

    /** 仅返回当前自然日已有购买记录，换期后旧计数自然失效。 */
    Map<Integer, Integer> purchases(String roleId, long resetAt) {
        return jdbc.query("SELECT product_id,purchased FROM game_black_market_purchase WHERE role_id=? AND reset_at=?",
                rows -> {
                    var result = new HashMap<Integer, Integer>();
                    while (rows.next()) {
                        result.put(rows.getInt("product_id"), rows.getInt("purchased"));
                    }
                    return result;
                }, roleId, resetAt);
    }

    /** 在持角色锁事务内更新一件商品；每件商品只保留最近一次购买的期次。 */
    void savePurchase(String roleId, int productId, long resetAt, int purchased) {
        int updated = jdbc.update("UPDATE game_black_market_purchase SET reset_at=?,purchased=?"
                        + " WHERE role_id=? AND product_id=?", resetAt, purchased, roleId, productId);
        if (updated == 0) {
            jdbc.update("INSERT INTO game_black_market_purchase(role_id,product_id,reset_at,purchased) VALUES (?,?,?,?)",
                    roleId, productId, resetAt, purchased);
        }
    }

    /** 按已认证角色和原 UUID 读取持久回执，校验摘要及角色、请求、货架归属。 */
    Saved receipt(String roleId, String requestId) {
        return jdbc.query("SELECT shop_type,expected_shelf,product_id,purchase_count,payload_json,payload_hash"
                + " FROM game_black_market_request WHERE role_id=? AND request_id=?", row -> {
            if (!row.next()) {
                return null;
            }
            var command = new Command(row.getInt("shop_type"), row.getLong("expected_shelf"),
                    row.getInt("product_id"), row.getInt("purchase_count"));
            var receipt = payloads.read(row.getString("payload_json"), row.getString("payload_hash"),
                    BlackMarketService.Receipt.class);
            if (!roleId.equals(receipt.roleId()) || !requestId.equals(receipt.requestId())
                    || command.shopType() != receipt.state().shopType()
                    || command.shelfVersion() != receipt.state().shelfVersion()) {
                throw new IllegalStateException("黑市持久回执归属错误");
            }
            return new Saved(command, receipt);
        }, roleId, requestId);
    }

    /** 保存真实提交的原参数和状态，历史恢复无需重新计算成交价格或回写库存。 */
    void saveReceipt(Command command, BlackMarketService.Receipt receipt) {
        var frozen = payloads.freeze(receipt);
        jdbc.update("INSERT INTO game_black_market_request(role_id,request_id,shop_type,expected_shelf,product_id,"
                        + "purchase_count,payload_json,payload_hash) VALUES (?,?,?,?,?,?,?,?)", receipt.roleId(),
                receipt.requestId(), command.shopType(), command.shelfVersion(), command.productId(), command.count(),
                frozen.json(), frozen.hash());
    }
}
