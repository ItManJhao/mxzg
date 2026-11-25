/**
 * 普通市场的查看、手动刷新和购买。角色行锁保护货架、购买限额及钱包，真实发奖与回执在同一事务。
 * 货架仅在首次生成或手动刷新时更换，角色资产仍使用公共快照与通用奖励反馈。
 */
package com.funsgamex.mxzg.market;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MarketService {
    /** 每日付费次数以项目区服统一时区的零点为界。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 紫色、金色精灵的真实实例规则和详情尚未恢复，只展示原商品。 */
    private static final List<Integer> PENDING_REWARDS = List.of(2_000_003, 2_000_004);
    /** 原任务配置用于区分市场购买与其他商店的类型编号。 */
    private static final int MARKET_SHOP_TYPE = 100100;

    /** 一件配置商品及本货架的真实累购次数。优惠字段为百分比，价格已是实际成交价。 */
    public record Offer(int productId, int itemId, long quantity, int costItemId, long costQuantity,
                        int purchaseLimit, int purchased, int discount, boolean purchasable) {}

    /**
     * 当前持久货架和刷新状态。freeRefreshes 为可用免费数，paidRefreshes 为当天已用付费数。
     * 计时为 Unix 秒，免费次数满时 nextFreeRefreshAt 为0。
     */
    public record State(long shelfVersion, List<Offer> offers, int freeRefreshes, int paidRefreshes,
                        long nextFreeRefreshAt, long nextPaidResetAt, int refreshCostItemId, long refreshCostQuantity,
                        int freeRefreshLimit, int paidRefreshLimit) {
        /** 冻结暴露给协议和持久回执的完整货架。 */
        public State {
            offers = List.copyOf(offers);
        }
    }

    /** 商店命令的原成功结果。免费刷新没有钱包更改，资产版本可能保持0。 */
    public record Receipt(String requestId, String roleId, long assetRevision, State state) {}

    /** 通过唯一持久会话校验应操作的真实角色。 */
    private final SessionService sessions;
    /** 角色行锁、真实钱包和统一资产版本。 */
    private final RoleRepository roles;
    /** 真实市场条件、货架、刷新次数与回执的持久入口。 */
    private final MarketRepository market;
    /** 策划货架、权重、限购和刷新配置。 */
    private final MarketRules rules;
    /** 通用资产分发，普通物品和已开放精灵分别由自己的领域入账。 */
    private final RewardGrantService grants;
    /** 提交成功后发送旧购买对应的通用奖励弹窗。 */
    private final RewardFeedbackService feedback;
    /** 货架刷新、自然日限额及期限奖励共用的游戏时钟。 */
    private final GameClock clock;
    /** 原普通市场购买结算的任务进度通知，刷新货架时不使用。 */
    private final ApplicationEventPublisher events;

    /** 装配游戏时钟与资产服务，预检现阶段可买商品的实际发奖能力。 */
    MarketService(SessionService sessions, RoleRepository roles, MarketRepository market, MarketRules rules,
                  RewardGrantService grants, RewardFeedbackService feedback, GameClock clock,
                  ApplicationEventPublisher events) {
        this.sessions = sessions;
        this.roles = roles;
        this.market = market;
        this.rules = rules;
        this.grants = grants;
        this.feedback = feedback;
        this.clock = clock;
        this.events = events;
        grants.requireSupported(rules.config().products().stream().map(MarketRules.Product::itemId)
                .filter(itemId -> !PENDING_REWARDS.contains(itemId)).distinct().toList());
    }

    /** 首次打开生成货架，后续查询只按游戏时钟补充到期的刷新次数。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State list(String token) {
        String roleId = lock(token);
        var access = requireAccess(roleId);
        return state(roleId, current(roleId, access.level(), clock.epochSeconds()), access.vip());
    }

    /**
     * 根据当前货架购买配置商品。成功时同事务扣款、更新限购、发奖和冻结原回执。
     * 货架时限和奖励日期使用本次捕获的游戏时间。
     * 重发同一小写 UUID 命令只返回原结果，换参数或换货架时拒绝购买。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt buy(String token, String requestId, long shelfVersion, int productId, int count) {
        validate(requestId, shelfVersion);
        if (productId <= 0 || count <= 0) {
            throw failure(HttpStatus.BAD_REQUEST, "INVALID_MARKET_REQUEST");
        }
        String roleId = lock(token);
        var command = new MarketRepository.Command(shelfVersion, productId, count);
        var prior = previous(roleId, requestId, command);
        if (prior != null) {
            return prior;
        }
        var access = requireAccess(roleId);
        long now = clock.epochSeconds();
        var stock = current(roleId, access.level(), now);
        requireShelf(stock, shelfVersion);
        Integer purchased = market.purchased(roleId, productId);
        if (purchased == null) {
            throw failure(HttpStatus.CONFLICT, "MARKET_PRODUCT_MISSING");
        }
        var product = rules.requireProduct(productId);
        if (PENDING_REWARDS.contains(product.itemId())) {
            throw failure(HttpStatus.CONFLICT, "MARKET_REWARD_UNAVAILABLE");
        }
        if ((long) purchased + count > product.purchaseLimit()) {
            throw failure(HttpStatus.CONFLICT, "MARKET_LIMIT");
        }
        debit(roleId, product.costItemId(), Math.multiplyExact(product.costQuantity(), count));
        market.buy(roleId, productId, purchased + count);
        var reward = new RewardGrantService.Reward(product.itemId(), Math.multiplyExact(product.quantity(), count));
        // 市场商品不含酒馆冒险点，无须查询或初始化主线状态。
        var actual = grants.grant(roleId, List.of(reward), new RewardGrantService.Context(now, 0),
                ThreadLocalRandom.current());
        var receipt = new Receipt(requestId, roleId, roles.revision(roleId), state(roleId, stock, access.vip()));
        market.saveReceipt(command, receipt);
        events.publishEvent(new QuestProgressEvent(roleId, QuestMetric.SHOP_BUY, MARKET_SHOP_TYPE, count));
        feedback.publish(UUID.randomUUID().toString(), roleId, receipt.assetRevision(),
                RewardFeedbackService.Mode.POPUP, actual, requestId);
        return receipt;
    }

    /** 手动刷新按游戏时钟补次数，优先使用免费次数；刷新后原货架上的购买请求失效。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt refresh(String token, String requestId, long shelfVersion) {
        validate(requestId, shelfVersion);
        String roleId = lock(token);
        var command = new MarketRepository.Command(shelfVersion, 0, 0);
        var prior = previous(roleId, requestId, command);
        if (prior != null) {
            return prior;
        }
        var access = requireAccess(roleId);
        long now = clock.epochSeconds();
        var stock = current(roleId, access.level(), now);
        requireShelf(stock, shelfVersion);
        var config = rules.config();
        int free = stock.freeRefreshes();
        int paid = stock.paidRefreshes();
        long nextFree = stock.nextFreeAt();
        if (free > 0) {
            if (free == config.freeRefreshLimit()) {
                nextFree = now + config.freeRefreshSeconds();
            }
            free--;
        } else {
            if (paid >= rules.paidLimit(access.vip())) {
                throw failure(HttpStatus.CONFLICT, "MARKET_REFRESH_LIMIT");
            }
            debit(roleId, config.refreshCostItemId(), config.refreshCostQuantity());
            paid++;
        }
        var next = new MarketRepository.Stock(Math.incrementExact(stock.shelfVersion()), free, paid,
                nextFree, stock.nextPaidResetAt());
        market.update(roleId, next);
        market.putOffers(roleId, rules.draw(access.level(), ThreadLocalRandom.current()));
        var receipt = new Receipt(requestId, roleId, roles.revision(roleId), state(roleId, next, access.vip()));
        market.saveReceipt(command, receipt);
        return receipt;
    }

    /** 校验和锁定当前角色，等待其他写操作时如果登录资格失效，停止本请求。 */
    private String lock(String token) {
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw failure(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        return roleId;
    }

    /** 使用已锁定的真实角色和策划开放条件，拒绝低于门槛的访问。 */
    private MarketRepository.Access requireAccess(String roleId) {
        var access = market.access(roleId);
        if (access.level() < rules.config().minimumLevel()) {
            throw failure(HttpStatus.FORBIDDEN, "MARKET_LOCKED");
        }
        return access;
    }

    /** 仅第一次抽样初始化。之后补免费库存及上海零点的付费计数，不改变原货架或商品限购。 */
    private MarketRepository.Stock current(String roleId, int level, long now) {
        var config = rules.config();
        var stock = market.stock(roleId);
        int limit = config.freeRefreshLimit();
        if (stock == null) {
            stock = new MarketRepository.Stock(1, limit, 0, 0, paidResetAfter(now));
            market.insert(roleId, stock);
            market.putOffers(roleId, rules.draw(level, ThreadLocalRandom.current()));
            return stock;
        }
        int free = stock.freeRefreshes();
        int paid = stock.paidRefreshes();
        long nextFree = stock.nextFreeAt();
        long nextPaid = stock.nextPaidResetAt();
        if (free < limit && now >= nextFree) {
            long recovered = 1 + (now - nextFree) / config.freeRefreshSeconds();
            free += (int) Math.min(limit - free, recovered);
            nextFree = free == limit ? 0 : nextFree + recovered * config.freeRefreshSeconds();
        }
        if (now >= nextPaid) {
            paid = 0;
            nextPaid = paidResetAfter(now);
        }
        var updated = new MarketRepository.Stock(stock.shelfVersion(), free, paid, nextFree, nextPaid);
        if (!updated.equals(stock)) {
            market.update(roleId, updated);
        }
        return updated;
    }

    /** 计算下一次上海零点的 Unix 秒，与免费补充时钟互相独立。 */
    private static long paidResetAfter(long now) {
        return Instant.ofEpochSecond(now).atZone(SERVER_ZONE).toLocalDate().plusDays(1)
                .atStartOfDay(SERVER_ZONE).toEpochSecond();
    }

    /** 返回商品及其当前限购进度，未接通的精灵仍保留实际位置、权重和价格。 */
    private State state(String roleId, MarketRepository.Stock stock, int vip) {
        var config = rules.config();
        var offers = market.offers(roleId).stream().map(row -> {
            var product = rules.requireProduct(row.productId());
            return new Offer(product.id(), product.itemId(), product.quantity(), product.costItemId(), product.costQuantity(),
                    product.purchaseLimit(), row.purchased(), product.discount(), !PENDING_REWARDS.contains(product.itemId()));
        }).toList();
        return new State(stock.shelfVersion(), offers, stock.freeRefreshes(), stock.paidRefreshes(), stock.nextFreeAt(),
                stock.nextPaidResetAt(), config.refreshCostItemId(), config.refreshCostQuantity(), config.freeRefreshLimit(),
                rules.paidLimit(vip));
    }

    /** 重发只返回既有持久回执，同一 ID 更换货架、商品或购买份数视为冲突。 */
    private Receipt previous(String roleId, String requestId, MarketRepository.Command command) {
        var saved = market.receipt(roleId, requestId);
        if (saved == null) {
            return null;
        }
        if (!saved.command().equals(command)) {
            throw failure(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
        }
        return saved.receipt();
    }

    /** 钱包余额为成交前的唯一事实，条件扣款失败时整个市场命令回滚。 */
    private void debit(String roleId, int itemId, long quantity) {
        boolean spent = switch (itemId) {
            case MarketRules.GOLD -> roles.debitGold(roleId, quantity);
            case MarketRules.DIAMONDS -> roles.debitDiamonds(roleId, quantity);
            default -> throw new IllegalStateException("普通市场的货币配置不合法：" + itemId);
        };
        if (!spent) {
            throw failure(HttpStatus.CONFLICT, "MARKET_INSUFFICIENT");
        }
    }

    /** 只允许提交当前货架版本，过时选择必须重新读取实际货架。 */
    private static void requireShelf(MarketRepository.Stock stock, long expected) {
        if (stock.shelfVersion() != expected) {
            throw failure(HttpStatus.CONFLICT, "MARKET_SHELF_CHANGED");
        }
    }

    /** 校验命令用于重发保护的编号及所见货架版本。 */
    private static void validate(String requestId, long shelfVersion) {
        if (!RewardReceiptPayloads.validId(requestId) || shelfVersion <= 0) {
            throw failure(HttpStatus.BAD_REQUEST, "INVALID_MARKET_REQUEST");
        }
    }

    /** 统一为长连接可映射的业务错误，不附带其他角色的市场信息。 */
    private static ResponseStatusException failure(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
