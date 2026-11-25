/**
 * 公会固定货架的只读报价与购买入口。购买在角色锁内校验成员身份、周限购及背包公会币。
 * 扣款、真实发货、限购和冻结回执同事务提交，库存和获得窗走项目统一同步链。
 */
package com.funsgamex.mxzg.guild;

import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GuildShopService {
    /** 客户端可见的权威报价。每份奖励数量与价格为配置值，purchased 为本周累计购买份数。 */
    public record Product(int productId, int itemId, int quantity, int cost, int limit, int purchased,
                          boolean purchasable) {}

    /** 角色当前公会、周周期和有序货架。只读请求的 requestId 为空。 */
    public record State(String requestId, String guildId, long resetAtSeconds, List<Product> products) {
        /** 冻结发出的货架列表，避免后续事务影响历史回执。 */
        public State {
            products = List.copyOf(products);
        }
    }

    /** 只接收客户端确认的当期商品、份数和归属。金额和奖励由服务端报价决定。 */
    public record BuyRequest(String requestId, String guildId, int productId, int count, long resetAtSeconds) {}

    /** 成功请求和原回包一起冻结，供同请求重试时核对。 */
    private record Stored(BuyRequest request, State state) {}

    /** 由应用装配的同库连接，用于周限购及持久回执。 */
    private final JdbcTemplate jdbc;
    /** 唯一角色资产锁，协调扣费、退会和正式发放。 */
    private final RoleRepository roles;
    /** 当前真实同区公会归属，不使用客户端提供的角色资料。 */
    private final GuildRepository guilds;
    /** 固定商品货架和周刷新规则。 */
    private final GuildShopRules rules;
    /** 统一可信服务端时钟。 */
    private final GameClock clock;
    /** 公会币在普通堆叠背包内扣除。 */
    private final InventoryService inventory;
    /** 实际发放沿用普通库存和精灵实例等既有领域。 */
    private final RewardGrantService grants;
    /** 真实发货在事务提交后使用通用表现。 */
    private final RewardFeedbackService feedback;
    /** 冻结原购买结果并验证重放数据完整性。 */
    private final RewardReceiptPayloads receipts;

    /** 装配同库资产、发奖与会员校验。 */
    GuildShopService(JdbcTemplate jdbc, RoleRepository roles, GuildRepository guilds,
            GuildShopRules rules, GameClock clock, InventoryService inventory, RewardGrantService grants,
            RewardFeedbackService feedback, RewardReceiptPayloads receipts) {
        this.jdbc = jdbc;
        this.roles = roles;
        this.guilds = guilds;
        this.rules = rules;
        this.clock = clock;
        this.inventory = inventory;
        this.grants = grants;
        this.feedback = feedback;
        this.receipts = receipts;
    }

    /** 用登录角色读取当前同区公会货架，不写限购、资产或余额。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public State list(String roleId) {
        var guild = requireGuild(roleId, null);
        long reset = GuildShopRules.resetAfter(clock.epochSeconds());
        return snapshot(roleId, guild.id(), reset, null);
    }

    /** 校验所见公会及周期，按服务器报价实际交易；相同请求成功后可安全重放。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State buy(String roleId, BuyRequest request) {
        if (request == null || !RewardReceiptPayloads.validId(request.requestId())
                || !RewardReceiptPayloads.validId(request.guildId()) || request.productId() <= 0
                || request.count() <= 0 || request.resetAtSeconds() <= 0) {
            throw failure(HttpStatus.BAD_REQUEST, "GUILD_SHOP_REQUEST_INVALID");
        }
        roles.lock(roleId);
        var guild = requireGuild(roleId, request.guildId());
        var previous = previous(roleId, request);
        if (previous != null) {
            return previous;
        }
        long now = clock.epochSeconds();
        long reset = GuildShopRules.resetAfter(now);
        if (reset != request.resetAtSeconds()) {
            throw failure(HttpStatus.CONFLICT, "GUILD_SHOP_RESET");
        }
        var offer = rules.find(request.productId());
        if (offer == null || !offer.purchasable()) {
            throw failure(HttpStatus.CONFLICT, "GUILD_SHOP_PRODUCT_UNAVAILABLE");
        }
        // 先用长整数相加，避免超大订单绕过周限购。
        long count = (long) stock(roleId, reset).getOrDefault(offer.productId(), 0) + request.count();
        if (count > offer.limit()) {
            throw failure(HttpStatus.CONFLICT, "GUILD_SHOP_LIMIT");
        }
        long charge = Math.multiplyExact((long) offer.cost(), request.count());
        if (!inventory.debit(roleId, GuildShopRules.CURRENCY, charge)) {
            throw failure(HttpStatus.CONFLICT, "GUILD_SHOP_INSUFFICIENT");
        }
        var reward = new RewardGrantService.Reward(offer.itemId(),
                Math.multiplyExact((long) offer.quantity(), request.count()));
        var actual = grants.grant(roleId, List.of(reward), new RewardGrantService.Context(now, 0),
                ThreadLocalRandom.current());
        saveStock(roleId, offer.productId(), reset, Math.toIntExact(count));
        var result = snapshot(roleId, guild.id(), reset, request.requestId());
        var frozen = receipts.freeze(new Stored(request, result));
        jdbc.update("""
                INSERT INTO game_guild_shop_receipt (role_id, request_id, result_json, result_hash)
                VALUES (?, ?, ?, ?)
                """, roleId, request.requestId(), frozen.json(), frozen.hash());
        feedback.publish(UUID.randomUUID().toString(), roleId, roles.revision(roleId),
                RewardFeedbackService.Mode.POPUP, actual, request.requestId());
        return result;
    }

    /** 确认同区真实成员身份。旧公会的确认请求换会后失效。 */
    private GuildRepository.Guild requireGuild(String roleId, String guildId) {
        var guild = guilds.memberGuild(roleId);
        if (guild == null || (guildId != null && !guildId.equals(guild.id()))) {
            throw failure(HttpStatus.CONFLICT, "GUILD_SHOP_MEMBERSHIP_CHANGED");
        }
        return guild;
    }

    /** 组合固定商品与同角色当前周的购买进度，资产余额仍由统一背包读。 */
    private State snapshot(String roleId, String guildId, long reset, String requestId) {
        var purchased = stock(roleId, reset);
        var products = rules.list().stream().map(offer -> new Product(offer.productId(), offer.itemId(),
                offer.quantity(), offer.cost(), offer.limit(), purchased.getOrDefault(offer.productId(), 0),
                offer.purchasable())).toList();
        return new State(requestId, guildId, reset, products);
    }

    /** 只读取该周期购买明细，上一周记录由下一次购买惰性替换。 */
    private Map<Integer, Integer> stock(String roleId, long reset) {
        var purchased = new HashMap<Integer, Integer>();
        jdbc.query("""
                SELECT product_id, purchased FROM game_guild_shop_stock WHERE role_id=? AND reset_at_seconds=?
                """, rows -> {
                    while (rows.next()) {
                        purchased.put(rows.getInt("product_id"), rows.getInt("purchased"));
                    }
                    return null;
                }, roleId, reset);
        return purchased;
    }

    /** 持有角色锁期间更新既有商品行，没有行则插入。 */
    private void saveStock(String roleId, int productId, long reset, int count) {
        if (jdbc.update("""
                UPDATE game_guild_shop_stock SET reset_at_seconds=?, purchased=? WHERE role_id=? AND product_id=?
                """, reset, count, roleId, productId) == 0) {
            jdbc.update("""
                    INSERT INTO game_guild_shop_stock (role_id, product_id, reset_at_seconds, purchased)
                    VALUES (?, ?, ?, ?)
                    """, roleId, productId, reset, count);
        }
    }

    /** 仅同内容的原成功请求可重放。请求编号碰撞不视为新交易。 */
    private State previous(String roleId, BuyRequest request) {
        var previous = jdbc.query("""
                SELECT result_json, result_hash FROM game_guild_shop_receipt WHERE role_id=? AND request_id=?
                """, (row, index) -> receipts.read(row.getString("result_json"), row.getString("result_hash"),
                    Stored.class), roleId, request.requestId()).stream().findFirst().orElse(null);
        if (previous == null) {
            return null;
        }
        if (!request.equals(previous.request())) {
            throw failure(HttpStatus.CONFLICT, "GUILD_SHOP_REQUEST_REUSED");
        }
        return previous.state();
    }

    /** 提供已登记的玩家业务错误，事务将自动回滚。 */
    private static ResponseStatusException failure(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
