/**
 * 普通市场的货架、刷新进度和成功回执存储。
 * 由 MarketService 在角色行锁内调用，所有写入与同次扣费和发奖共用事务。
 */
package com.funsgamex.mxzg.market;

import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class MarketRepository {
    /** 更新货架时才会递增货架版本；计时绝对值均为 Unix 秒。 */
    record Stock(long shelfVersion, int freeRefreshes, int paidRefreshes, long nextFreeAt, long nextPaidResetAt) {}

    /** 同一角色行上的等级和女神 VIP，分别决定候选货架及每日付费上限。 */
    record Access(int level, int vip) {}

    /** 当前货架中的商品编号与已经购买的份数。 */
    record OfferStock(int productId, int purchased) {}

    /** 冻结与本次请求关联的参数；商品和份数同为0表示刷新。 */
    record Command(long shelfVersion, int productId, int count) {}

    /** 与冻结命令一起读取的原成功回执，匹配后才返回调用方。 */
    record Saved(Command command, MarketService.Receipt receipt) {}

    /** 查询货架与回执的共享连接，由 Spring 绑定同一业务事务。 */
    private final JdbcTemplate jdbc;
    /** 已有持久回执校验器，防止损坏历史被当作尚未执行。 */
    private final RewardReceiptPayloads payloads;

    /** 注入市场持久读写和原结果摘要校验器。 */
    MarketRepository(JdbcTemplate jdbc, RewardReceiptPayloads payloads) {
        this.jdbc = jdbc;
        this.payloads = payloads;
    }

    /** 从已锁定的真实角色读取等级和女神 VIP。 */
    Access access(String roleId) {
        return jdbc.queryForObject("SELECT role_level,goddess_vip FROM game_role WHERE id=?",
                (row, index) -> new Access(row.getInt("role_level"), row.getInt("goddess_vip")), roleId);
    }

    /** 读取市场计时和货架版本，尚未打开过市场的角色返回 null。 */
    Stock stock(String roleId) {
        return jdbc.query("SELECT shelf_version,free_refreshes,paid_refreshes,next_free_refresh_at,"
                + "next_paid_reset_at FROM game_market WHERE role_id=?", row -> {
            if (!row.next()) {
                return null;
            }
            return new Stock(row.getLong("shelf_version"), row.getInt("free_refreshes"),
                    row.getInt("paid_refreshes"), row.getLong("next_free_refresh_at"), row.getLong("next_paid_reset_at"));
        }, roleId);
    }

    /** 初次打开时建立角色货架进度，当前事务随后写入真实已抽商品。 */
    void insert(String roleId, Stock stock) {
        jdbc.update("INSERT INTO game_market(role_id,shelf_version,free_refreshes,paid_refreshes,"
                        + "next_free_refresh_at,next_paid_reset_at) VALUES (?,?,?,?,?,?)", roleId,
                stock.shelfVersion(), stock.freeRefreshes(), stock.paidRefreshes(), stock.nextFreeAt(), stock.nextPaidResetAt());
    }

    /** 保存自然时间补充或手动刷新后的进度，购买次数由商品记录单独保存。 */
    void update(String roleId, Stock stock) {
        jdbc.update("UPDATE game_market SET shelf_version=?,free_refreshes=?,paid_refreshes=?,next_free_refresh_at=?,"
                        + "next_paid_reset_at=? WHERE role_id=?", stock.shelfVersion(), stock.freeRefreshes(),
                stock.paidRefreshes(), stock.nextFreeAt(), stock.nextPaidResetAt(), roleId);
    }

    /** 按原客户端的商品编号升序取当前货架，重复打开不重抽。 */
    List<OfferStock> offers(String roleId) {
        return jdbc.query("SELECT product_id,purchased FROM game_market_offer WHERE role_id=? ORDER BY product_id",
                (row, index) -> new OfferStock(row.getInt("product_id"), row.getInt("purchased")), roleId);
    }

    /** 当前货架指定商品已购份数，商品没上架返回 null。 */
    Integer purchased(String roleId, int productId) {
        return jdbc.query("SELECT purchased FROM game_market_offer WHERE role_id=? AND product_id=?",
                row -> row.next() ? row.getInt("purchased") : null, roleId, productId);
    }

    /** 在同一持锁事务替换手动刷新的货架，并按新货架重置货品购买计数。 */
    void putOffers(String roleId, List<MarketRules.Product> products) {
        jdbc.update("DELETE FROM game_market_offer WHERE role_id=?", roleId);
        jdbc.batchUpdate("INSERT INTO game_market_offer(role_id,product_id,purchased) VALUES (?,?,0)",
                products, products.size(), (statement, product) -> {
                    statement.setString(1, roleId);
                    statement.setInt(2, product.id());
                });
    }

    /** 写入原在架商品累购数，更新异常时令同笔扣费发奖回滚。 */
    void buy(String roleId, int productId, int purchased) {
        if (jdbc.update("UPDATE game_market_offer SET purchased=? WHERE role_id=? AND product_id=?",
                purchased, roleId, productId) != 1) {
            throw new IllegalStateException("普通市场在架商品购买次数更新失败");
        }
    }

    /** 按角色和持久请求标识读取结果，不根据现在的商品配置重算历史。 */
    Saved receipt(String roleId, String requestId) {
        return jdbc.query("SELECT expected_shelf,product_id,purchase_count,payload_json,payload_hash "
                + "FROM game_market_request WHERE role_id=? AND request_id=?", row -> {
            if (!row.next()) {
                return null;
            }
            var command = new Command(row.getLong("expected_shelf"), row.getInt("product_id"), row.getInt("purchase_count"));
            var receipt = payloads.read(row.getString("payload_json"), row.getString("payload_hash"), MarketService.Receipt.class);
            if (!roleId.equals(receipt.roleId()) || !requestId.equals(receipt.requestId())) {
                throw new IllegalStateException("普通市场持久回执归属错误");
            }
            return new Saved(command, receipt);
        }, roleId, requestId);
    }

    /** 冻结请求参数和含原货架的结果，使同一请求在重登后仍返回一致回执。 */
    void saveReceipt(Command command, MarketService.Receipt receipt) {
        var result = payloads.freeze(receipt);
        jdbc.update("INSERT INTO game_market_request(role_id,request_id,expected_shelf,product_id,purchase_count,"
                        + "payload_json,payload_hash) VALUES (?,?,?,?,?,?,?)", receipt.roleId(), receipt.requestId(),
                command.shelfVersion(), command.productId(), command.count(), result.json(), result.hash());
    }
}
