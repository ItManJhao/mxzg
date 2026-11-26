/**
 * 勇者试炼商店的固定报价及兑换事务，由认证 WebSocket 登录角色访问。
 * 试炼之血扣除、原物品实发、限购和冻结回执由同一个角色锁和资产事务保护。
 */
package com.funsgamex.mxzg.trial;

import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TrialShopService {
    /** 面向客户端的权威报价，purchased 是当前周期累计成交份数。 */
    public record Offer(int id, RewardGrantService.Reward reward, int price, int purchaseLimit, int purchased) {}

    /** 读取所见周期、货位以及每个货位的库存限额。 */
    public record State(long refreshAt, List<Offer> offers) {
        /** 冻结当期货架，历史回执可独立于之后的购买重放。 */
        public State {
            offers = List.copyOf(offers);
        }
    }

    /** 客户端只能确认当前周期中的货位和购买份数，成交价格和发奖由服务端决定。 */
    public record BuyRequest(String requestId, int offerId, int count, long refreshAt) {}

    /** 对应冻结资产版本的实际发货和货架。 */
    public record Receipt(String requestId, String roleId, long assetRevision, State state,
                          RewardGrantResult actual) {}

    /** 保存请求以检测相同编号是否被用于另一笔订单。 */
    private record Stored(BuyRequest request, Receipt receipt) {}

    /** 当前角色所在物理数据源，用于周期成交和持久回执。 */
    private final JdbcTemplate jdbc;
    /** 游戏当前角色等级、角色事务锁和统一资产版本来源。 */
    private final RoleRepository roles;
    /** 固定货位规则和开放等级。 */
    private final TrialShopRules rules;
    /** 可信服务端时间，确定当前上海自然周。 */
    private final GameClock clock;
    /** 统一堆叠资产入口，扣除真实试炼之血。 */
    private final InventoryService inventory;
    /** 发奖领域复用已有奖励类型与资产同步。 */
    private final RewardGrantService grants;
    /** 持久化确切的原成功回执，校验数据重读完整性。 */
    private final RewardReceiptPayloads receipts;

    /** 装配同库规则、角色、资产与实际奖励的事务边界。 */
    TrialShopService(JdbcTemplate jdbc, RoleRepository roles, TrialShopRules rules, GameClock clock,
                     InventoryService inventory, RewardGrantService grants, RewardReceiptPayloads receipts) {
        this.jdbc = jdbc;
        this.roles = roles;
        this.rules = rules;
        this.clock = clock;
        this.inventory = inventory;
        this.grants = grants;
        this.receipts = receipts;
    }

    /** 对当前认证角色读取同一周报价；展示余额继续从统一背包取。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public State list(String roleId) {
        return snapshot(roleId, requireLevel(roleId), TrialShopRules.resetAfter(clock.epochSeconds()));
    }

    /** 校验原报价、等级、余额和限购，事务提交后统一资产快照才反映扣费与发货。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt buy(String roleId, BuyRequest request) {
        if (request == null || !RewardReceiptPayloads.validId(request.requestId())
                || request.offerId() <= 0 || request.count() <= 0 || request.refreshAt() <= 0) {
            throw failure(HttpStatus.BAD_REQUEST, "TRIAL_SHOP_REQUEST_INVALID");
        }
        roles.lock(roleId);
        var previous = previous(roleId, request);
        if (previous != null) {
            return previous;
        }
        int roleLevel = requireLevel(roleId);
        long now = clock.epochSeconds();
        long refreshAt = TrialShopRules.resetAfter(now);
        if (refreshAt != request.refreshAt()) {
            throw failure(HttpStatus.CONFLICT, "TRIAL_SHOP_RESET");
        }
        var product = rules.find(request.offerId(), roleLevel);
        if (product == null) {
            throw failure(HttpStatus.CONFLICT, "TRIAL_SHOP_OFFER_UNAVAILABLE");
        }
        long purchased = (long) stock(roleId, refreshAt).getOrDefault(product.id(), 0) + request.count();
        if (purchased > Integer.MAX_VALUE || (product.purchaseLimit() > 0 && purchased > product.purchaseLimit())) {
            throw failure(HttpStatus.CONFLICT, "TRIAL_SHOP_LIMIT");
        }
        long charge = (long) product.price() * request.count();
        if (!inventory.debit(roleId, TrialShopRules.CURRENCY, charge)) {
            throw failure(HttpStatus.CONFLICT, "TRIAL_SHOP_INSUFFICIENT");
        }
        var reward = new RewardGrantService.Reward(product.reward().itemId(),
                Math.multiplyExact(product.reward().quantity(), request.count()));
        var actual = grants.grant(roleId, List.of(reward), new RewardGrantService.Context(now, 0),
                ThreadLocalRandom.current());
        saveStock(roleId, product.id(), refreshAt, Math.toIntExact(purchased));
        var result = new Receipt(request.requestId(), roleId, roles.revision(roleId),
                snapshot(roleId, roleLevel, refreshAt), actual);
        var frozen = receipts.freeze(new Stored(request, result));
        jdbc.update("""
                INSERT INTO game_trial_shop_receipt (role_id, request_id, result_json, result_hash) VALUES (?, ?, ?, ?)
                """, roleId, request.requestId(), frozen.json(), frozen.hash());
        return result;
    }

    /** 缺少当前角色或级别未开放时拒绝读写，并返回可用角色的真实等级。 */
    private int requireLevel(String roleId) {
        var role = roles.findById(roleId).orElseThrow(() -> failure(HttpStatus.UNAUTHORIZED, "LOGIN_REQUIRED"));
        if (role.level() < rules.minimumLevel()) {
            throw failure(HttpStatus.CONFLICT, "TRIAL_LEVEL");
        }
        return role.level();
    }

    /** 组合原配置和当前购买进度，始终只返回此角色已开放的商品。 */
    private State snapshot(String roleId, int level, long refreshAt) {
        var purchased = stock(roleId, refreshAt);
        return new State(refreshAt, rules.list(level).stream()
                .map(row -> new Offer(row.id(), row.reward(), row.price(), row.purchaseLimit(),
                        purchased.getOrDefault(row.id(), 0)))
                .toList());
    }

    /** 只查询当前自然周，读取上周数据不会触发写入。 */
    private Map<Integer, Integer> stock(String roleId, long refreshAt) {
        var purchased = new HashMap<Integer, Integer>();
        jdbc.query("""
                SELECT offer_id, purchased FROM game_trial_shop_stock WHERE role_id=? AND refresh_at=?
                """, rows -> {
                    while (rows.next()) {
                        purchased.put(rows.getInt("offer_id"), rows.getInt("purchased"));
                    }
                    return null;
                }, roleId, refreshAt);
        return purchased;
    }

    /** 在唯一角色锁内累计成交数，跨周首次购买替换对应旧周期记录。 */
    private void saveStock(String roleId, int offerId, long refreshAt, int purchased) {
        if (jdbc.update("""
                UPDATE game_trial_shop_stock SET refresh_at=?, purchased=? WHERE role_id=? AND offer_id=?
                """, refreshAt, purchased, roleId, offerId) == 0) {
            jdbc.update("""
                    INSERT INTO game_trial_shop_stock (role_id, offer_id, refresh_at, purchased) VALUES (?, ?, ?, ?)
                    """, roleId, offerId, refreshAt, purchased);
        }
    }

    /** 同编号只重放内容完全相同的原成功订单，过周仍返回原资产版本及真实结果。 */
    private Receipt previous(String roleId, BuyRequest request) {
        var stored = jdbc.query("""
                SELECT result_json, result_hash FROM game_trial_shop_receipt WHERE role_id=? AND request_id=?
                """, (row, index) -> receipts.read(row.getString("result_json"), row.getString("result_hash"),
                Stored.class), roleId, request.requestId()).stream().findFirst().orElse(null);
        if (stored == null) {
            return null;
        }
        if (!request.equals(stored.request())) {
            throw failure(HttpStatus.CONFLICT, "TRIAL_SHOP_REQUEST_REUSED");
        }
        return stored.receipt();
    }

    /** 将标准业务错误交认证 WebSocket 边界处理，确保事务回滚。 */
    private static ResponseStatusException failure(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
