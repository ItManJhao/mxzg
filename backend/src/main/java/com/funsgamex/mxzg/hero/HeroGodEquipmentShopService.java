/**
 * 神装商城的固定货架、每日限购和实际兑换。
 * 购买在角色锁事务内扣碎片、生成独立神装或通过通用发奖发石头，回执与资产版本一起提交。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import com.funsgamex.mxzg.world.WorldLevelService;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HeroGodEquipmentShopService {
    /** 商店次数沿项目固定上海时区的自然日清零。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");

    /** 单个商品在所见周期实际购买的数量，未购买商品不占快照条目。 */
    public record Purchase(int productId, int purchased) {}

    /** 当前自然日结束的 Unix 秒和同日真实购买次数。 */
    public record State(long resetAt, List<Purchase> purchases) {}

    /** 商品原编号、确认份数及玩家所见的当前周期，不接受客户端报价。 */
    public record BuyRequest(String requestId, int productId, int count, long resetAt) {}

    /** 冻结成功购买结果；重试不能重扣碎片、重抽或重发。 */
    public record Receipt(String requestId, String roleId, int productId, int count, long resetAt,
                          int purchased, long assetRevision) {}

    /** 商店每日购买次数与成功回执使用同一真实数据库。 */
    private final JdbcTemplate jdbc;
    /** 当前角色身份只由已鉴权会话决定。 */
    private final SessionService sessions;
    /** 提供角色锁、角色等级与已提交版本。 */
    private final RoleRepository roles;
    /** 以本次可信游戏时钟计算商店自然日。 */
    private final GameClock clock;
    /** 读取角色当前区服的世界等级。 */
    private final WorldLevelService worldLevels;
    /** 同源货架、价格、限购与独立兑换奖池。 */
    private final GodEquipmentShopRules shop;
    /** 神装门槛、模板及随机词条与探宝保持一致。 */
    private final GodEquipmentRules rules;
    /** 神装兑换商品按实际模板生成独立实例。 */
    private final GodEquipmentRepository equipment;
    /** 读取或扣除真实神装碎片堆叠。 */
    private final InventoryService inventory;
    /** 普通神装石头沿用通用资产发放。 */
    private final RewardGrantService grants;
    /** 独立神装和通用发奖共用提交后反馈。 */
    private final RewardFeedbackService feedback;

    /** 装配真实数据库和资产服务，启动时检查普通商城奖励的发放能力。 */
    HeroGodEquipmentShopService(JdbcTemplate jdbc, SessionService sessions, RoleRepository roles, GameClock clock,
            WorldLevelService worldLevels, GodEquipmentShopRules shop, GodEquipmentRules rules,
            GodEquipmentRepository equipment, InventoryService inventory, RewardGrantService grants,
            RewardFeedbackService feedback) {
        this.jdbc = jdbc;
        this.sessions = sessions;
        this.roles = roles;
        this.clock = clock;
        this.worldLevels = worldLevels;
        this.shop = shop;
        this.rules = rules;
        this.equipment = equipment;
        this.inventory = inventory;
        this.grants = grants;
        this.feedback = feedback;
        grants.requireSupported(shop.directItems());
    }

    /** 按服务端当天的周期读取商城状态，不为读快照写入库存。 */
    public State state(String roleId) {
        long resetAt = resetAfter(clock.epochSeconds());
        var purchased = jdbc.query("""
                SELECT product_id, purchased FROM game_god_equipment_shop_stock
                WHERE role_id=? AND reset_at=? ORDER BY product_id
                """, (row, index) -> new Purchase(row.getInt("product_id"), row.getInt("purchased")),
                roleId, resetAt);
        return new State(resetAt, List.copyOf(purchased));
    }

    /** 鉴权、扣除、兑奖、限购和回执同事务提交；相同命令重试只返回原结果。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt buy(String token, BuyRequest request) {
        if (request == null || !RewardReceiptPayloads.validId(request.requestId())
                || request.count() <= 0 || request.count() > GodEquipmentShopRules.MAXIMUM_PURCHASE
                || request.productId() <= 0 || request.resetAt() <= 0) {
            throw failure(HttpStatus.BAD_REQUEST, "GOD_EQUIPMENT_SHOP_REQUEST_INVALID");
        }
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw failure(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        var prior = previous(roleId, request);
        if (prior != null) {
            return prior;
        }
        var role = roles.findById(roleId).orElseThrow();
        if (role.level() < rules.requiredRoleLevel()) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_ROLE_LEVEL");
        }
        if (worldLevels.current(role.serverId()).level() < rules.requiredWorldLevel()) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_WORLD_LEVEL");
        }
        long now = clock.epochSeconds();
        long resetAt = resetAfter(now);
        if (request.resetAt() != resetAt) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_SHOP_RESET");
        }
        var product = shop.find(request.productId());
        if (product == null) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_SHOP_PRODUCT_MISSING");
        }
        int purchased = Math.addExact(purchased(roleId, request.productId(), resetAt), request.count());
        if (product.purchaseLimit() > 0 && purchased > product.purchaseLimit()) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_SHOP_LIMIT");
        }
        long charge = Math.multiplyExact(product.costQuantity(), request.count());
        if (!inventory.debit(roleId, shop.currency(), charge)) {
            throw failure(HttpStatus.CONFLICT, "GOD_EQUIPMENT_SHOP_INSUFFICIENT");
        }
        var credited = grant(roleId, product, request.count(), now);
        saveStock(roleId, product.productId(), resetAt, purchased);
        var receipt = new Receipt(request.requestId(), roleId, request.productId(), request.count(), resetAt,
                purchased, roles.revision(roleId));
        saveReceipt(receipt);
        feedback.publishItems(request.requestId(), roleId, receipt.assetRevision(), RewardFeedbackService.Mode.POPUP,
                credited, request.requestId());
        return receipt;
    }

    /** 商店中石头直接到账。兑换品按配置每件独立抽取真实模板、初始词条及新实例。 */
    private List<RewardFeedbackService.Item> grant(String roleId, GodEquipmentShopRules.Product product,
            int count, long now) {
        var random = ThreadLocalRandom.current();
        int units = Math.multiplyExact(product.quantity(), count);
        if (!shop.isExchange(product.itemId())) {
            var reward = new RewardGrantService.Reward(product.itemId(), units);
            var result = grants.grant(roleId, List.of(reward), new RewardGrantService.Context(now, 0), random);
            return result.items().stream().map(item -> new RewardFeedbackService.Item(item.itemId(), item.credited()))
                    .toList();
        }
        var rewards = new ArrayList<RewardFeedbackService.Item>();
        for (int index = 0; index < units; index++) {
            var reward = shop.roll(product.itemId(), random);
            var definition = rules.require(reward.templateId());
            for (int instance = 0; instance < reward.quantity(); instance++) {
                equipment.create(roleId, definition, rules.rollModifiers(definition, random));
            }
            rewards.add(new RewardFeedbackService.Item(reward.templateId(), reward.quantity()));
        }
        return rewards;
    }

    /** 只读本轮次数；旧周期即使仍存记录也不计入此次限购。 */
    private int purchased(String roleId, int productId, long resetAt) {
        return jdbc.query("""
                SELECT purchased FROM game_god_equipment_shop_stock
                WHERE role_id=? AND product_id=? AND reset_at=?
                """, rows -> rows.next() ? rows.getInt("purchased") : 0, roleId, productId, resetAt);
    }

    /** 在角色锁内更新此商品到最近周期，无需定时逐角色清表。 */
    private void saveStock(String roleId, int productId, long resetAt, int purchased) {
        if (jdbc.update("""
                UPDATE game_god_equipment_shop_stock SET reset_at=?, purchased=? WHERE role_id=? AND product_id=?
                """, resetAt, purchased, roleId, productId) == 0) {
            jdbc.update("""
                    INSERT INTO game_god_equipment_shop_stock(role_id,product_id,reset_at,purchased) VALUES (?,?,?,?)
                    """, roleId, productId, resetAt, purchased);
        }
    }

    /** 使用原命令校验已提交回执，已跨日的同一命令仍返回原结果。 */
    private Receipt previous(String roleId, BuyRequest request) {
        var receipt = jdbc.query("""
                SELECT product_id,bought_count,reset_at,purchased,asset_revision
                FROM game_god_equipment_shop_receipt WHERE role_id=? AND request_id=?
                """, rows -> rows.next() ? new Receipt(request.requestId(), roleId, rows.getInt("product_id"),
                rows.getInt("bought_count"), rows.getLong("reset_at"), rows.getInt("purchased"),
                rows.getLong("asset_revision")) : null, roleId, request.requestId());
        if (receipt != null && (receipt.productId() != request.productId() || receipt.count() != request.count()
                || receipt.resetAt() != request.resetAt())) {
            throw failure(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
        }
        return receipt;
    }

    /** 冻结首次真实成功结果，命令参数与购买资产一起提交。 */
    private void saveReceipt(Receipt receipt) {
        jdbc.update("""
                INSERT INTO game_god_equipment_shop_receipt
                (role_id,request_id,product_id,bought_count,reset_at,purchased,asset_revision) VALUES (?,?,?,?,?,?,?)
                """, receipt.roleId(), receipt.requestId(), receipt.productId(), receipt.count(), receipt.resetAt(),
                receipt.purchased(), receipt.assetRevision());
    }

    /** 换算到下一个上海零点，令零点当秒进入新自然日。 */
    private static long resetAfter(long seconds) {
        return Instant.ofEpochSecond(seconds).atZone(SERVER_ZONE).toLocalDate().plusDays(1)
                .atStartOfDay(SERVER_ZONE).toEpochSecond();
    }

    /** 交给统一长连接出口映射的业务拒绝。 */
    private static ResponseStatusException failure(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
