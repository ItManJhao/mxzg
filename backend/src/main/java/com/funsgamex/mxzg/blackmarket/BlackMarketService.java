/**
 * 黑市入口、固定货架及道具兑换。道具限购按上海自然日重置，竞技货架共用竞技场业务。
 * 角色锁保护扣款、发奖、任务计数与原回执，展示中的其他策划货架不能提交交易。
 */
package com.funsgamex.mxzg.blackmarket;

import com.funsgamex.mxzg.arena.ArenaSeasonService;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.market.MarketService.Offer;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BlackMarketService {
    /** 黑市所有自然日期次均在上海日历的零时结算。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 客户端可准确表达的最大整数，用于校验提交的期次。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;

    /** 按当前角色等级可见的页签；available 表示允许进入实际交易。 */
    public record Tab(int shopType, String name, int minimumLevel, boolean available) {}

    /**
     * 当前摊位的实际报价、买入计数和页签。shelfVersion 为当前期次结束的 Unix 秒；永久货架固定为 1。
     * nextRefreshAt 为原策划允许显示的下次自动刷新秒，0 表示界面不展示刷新时间。
     */
    public record State(int shopType, long shelfVersion, long nextRefreshAt, int currencyItemId,
                        List<Tab> tabs, List<Offer> offers) {
        /** 冻结回执中两份展示清单，后续浏览和刷新不改动原成交结果。 */
        public State {
            tabs = List.copyOf(tabs);
            offers = List.copyOf(offers);
        }
    }

    /** 与权威资产版本关联的成交回执，重放保持成交时的货架。 */
    public record Receipt(String requestId, String roleId, long assetRevision, State state) {}

    /** 从唯一会话解析角色并在取得角色行锁后重查会话。 */
    private final SessionService sessions;
    /** 角色资料、行锁、钻石钱包和权威资产版本。 */
    private final RoleRepository roles;
    /** 黑市当期购买量、神职与回执持久化。 */
    private final BlackMarketRepository market;
    /** 原店铺控制值、商品、页签顺序及出现条件。 */
    private final BlackMarketRules rules;
    /** 同一个竞技场商品账本，原竞技场入口和黑市入口都使用它。 */
    private final ArenaSeasonService arena;
    /** 道具摊位使用的真实发奖和资产同步服务。 */
    private final RewardGrantService grants;
    /** 道具购买提交后走原奖励交付通道。 */
    private final RewardFeedbackService feedback;
    /** 计算自动刷新及实际发放时间的统一服务时钟。 */
    private final GameClock clock;
    /** 在黑市成交事务内触发每日任务计数。 */
    private final ApplicationEventPublisher events;

    /** 装配黑市领域依赖，预检当前开放道具全部可真实发放。 */
    BlackMarketService(SessionService sessions, RoleRepository roles, BlackMarketRepository market,
                       BlackMarketRules rules, ArenaSeasonService arena, RewardGrantService grants,
                       RewardFeedbackService feedback, GameClock clock, ApplicationEventPublisher events) {
        this.sessions = sessions;
        this.roles = roles;
        this.market = market;
        this.rules = rules;
        this.arena = arena;
        this.grants = grants;
        this.feedback = feedback;
        this.clock = clock;
        this.events = events;
        grants.requireSupported(rules.catalog(BlackMarketRules.STALL).products().stream()
                .map(BlackMarketRules.Product::itemId).distinct().toList());
    }

    /** 按角色真实等级查询指定摊位。跨日显示期次重置后的计数，读取不写数据库。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public State list(String token, int shopType) {
        var role = role(sessions.requireRole(token));
        var catalog = requireCatalog(role, shopType);
        if (shopType == BlackMarketRules.ARENA) {
            return arenaState(role, catalog, arena.shop(token));
        }
        return catalogState(role, catalog, refreshAt(catalog, clock.epochSeconds()));
    }

    /**
     * 根据服务器当前期次和真实资格成交，持久化同一 UUID 的原回执。
     * 两个入口的竞技场购买共用竞技币和限购，黑市重试只读取原回执。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt buy(String token, String requestId, int shopType, long shelfVersion, int productId, int count) {
        if (!RewardReceiptPayloads.validId(requestId) || shopType <= 0 || shelfVersion <= 0
                || shelfVersion > MAX_SAFE_INTEGER || productId <= 0 || count <= 0) {
            throw failure(HttpStatus.BAD_REQUEST, "INVALID_BLACK_MARKET_REQUEST");
        }
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw failure(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        var command = new BlackMarketRepository.Command(shopType, shelfVersion, productId, count);
        var previous = market.receipt(roleId, requestId);
        if (previous != null) {
            if (!previous.command().equals(command)) {
                throw failure(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
            }
            return previous.receipt();
        }

        var role = role(roleId);
        var catalog = requireCatalog(role, shopType);
        if (!catalog.available()) {
            throw failure(HttpStatus.FORBIDDEN, "BLACK_MARKET_UNAVAILABLE");
        }
        long now = clock.epochSeconds();
        long resetAt = shopType == BlackMarketRules.ARENA ? arena.shop(token).refreshAt() : refreshAt(catalog, now);
        if (shelfVersion != resetAt) {
            throw failure(HttpStatus.CONFLICT, "BLACK_MARKET_SHELF_CHANGED");
        }
        var receipt = shopType == BlackMarketRules.ARENA
                ? buyArena(token, requestId, role, catalog, command)
                : buyStall(requestId, role, catalog, command, now);
        market.saveReceipt(command, receipt);
        return receipt;
    }

    /** 竞技场服务保留原报价、扣币和购买账本，黑市仅将已成交状态转换为通用展示。 */
    private Receipt buyArena(String token, String requestId, RoleProfile role, BlackMarketRules.Catalog catalog,
                             BlackMarketRepository.Command command) {
        var result = arena.buy(token, requestId, command.productId(), command.count(), command.shelfVersion());
        if (result.state().refreshAt() != command.shelfVersion()) {
            throw failure(HttpStatus.CONFLICT, "BLACK_MARKET_SHELF_CHANGED");
        }
        return new Receipt(requestId, role.id(), result.notice().assetRevision(), arenaState(role, catalog, result.state()));
    }

    /** 在同一事务校验货品、扣钻、发奖及累计实际购买份数；失败不会新增任何计数。 */
    private Receipt buyStall(String requestId, RoleProfile role, BlackMarketRules.Catalog catalog,
                             BlackMarketRepository.Command command, long now) {
        var product = catalog.products().stream().filter(row -> row.id() == command.productId()
                        && role.level() >= row.minimumLevel()).findFirst()
                .orElseThrow(() -> failure(HttpStatus.CONFLICT, "BLACK_MARKET_PRODUCT_MISSING"));
        String roleId = role.id();
        if (market.clergyLevel(roleId) < product.requiredClergy()) {
            throw failure(HttpStatus.FORBIDDEN, "BLACK_MARKET_CLERGY_REQUIRED");
        }
        long resetAt = command.shelfVersion();
        int purchased = market.purchases(roleId, resetAt).getOrDefault(product.id(), 0);
        long total = (long) purchased + command.count();
        if (total > product.purchaseLimit()) {
            throw failure(HttpStatus.CONFLICT, "BLACK_MARKET_LIMIT");
        }
        if (!roles.debitDiamonds(roleId, Math.multiplyExact(product.costQuantity(), command.count()))) {
            throw failure(HttpStatus.CONFLICT, "BLACK_MARKET_INSUFFICIENT");
        }
        market.savePurchase(roleId, product.id(), resetAt, Math.toIntExact(total));
        var reward = new Reward(product.itemId(), Math.multiplyExact(product.quantity(), command.count()));
        var actual = grants.grant(roleId, List.of(reward), new RewardGrantService.Context(now, 0),
                ThreadLocalRandom.current());
        long revision = roles.revision(roleId);
        events.publishEvent(new QuestProgressEvent(roleId, QuestMetric.SHOP_BUY,
                BlackMarketRules.STALL, command.count(), now));
        feedback.publish(UUID.randomUUID().toString(), roleId, revision, RewardFeedbackService.Mode.POPUP, actual, requestId);
        return new Receipt(requestId, roleId, revision, catalogState(role, catalog, resetAt));
    }

    /** 保留原商品顺序与成交价，按当前角色等级和真神职标出可买状态。 */
    private State catalogState(RoleProfile role, BlackMarketRules.Catalog catalog, long resetAt) {
        int clergy = catalog.available() ? market.clergyLevel(role.id()) : 0;
        var purchased = catalog.available() ? market.purchases(role.id(), resetAt) : Map.<Integer, Integer>of();
        var offers = catalog.products().stream().filter(product -> role.level() >= product.minimumLevel())
                .map(row -> new Offer(row.id(), row.itemId(), row.quantity(), row.costItemId(), row.costQuantity(),
                        row.purchaseLimit(), purchased.getOrDefault(row.id(), 0), row.discount(),
                        catalog.available() && clergy >= row.requiredClergy())).toList();
        return new State(catalog.shopType(), Math.max(1, resetAt), catalog.showRefreshTime() ? resetAt : 0,
                catalog.currencyItemId(), tabs(role), offers);
    }

    /** 共享竞技场当前商品、报价及限购，不复制竞技货架或推断已购数量。 */
    private State arenaState(RoleProfile role, BlackMarketRules.Catalog catalog, ArenaSeasonService.ShopState state) {
        var offers = state.offers().stream().map(row -> {
            if (row.rewards().size() != 1) {
                throw new IllegalStateException("黑市竞技场展示仅支持单项配置商品：" + row.id());
            }
            var reward = row.rewards().getFirst();
            return new Offer(row.id(), reward.itemId(), reward.quantity(), catalog.currencyItemId(), row.price(),
                    row.purchaseLimit(), row.purchased(), 100, true);
        }).toList();
        return new State(catalog.shopType(), state.refreshAt(), state.refreshAt(), catalog.currencyItemId(),
                tabs(role), offers);
    }

    /** 投影已达到最低等级的原页签，未恢复交易的页签仍带可读的实际目录。 */
    private List<Tab> tabs(RoleProfile role) {
        return rules.visibleTabs(role.level()).stream()
                .map(record -> new Tab(record.shopType(), record.name(), record.minimumLevel(), record.available())).toList();
    }

    /** 查找真实角色，身份失效不读取或写入摊位。 */
    private RoleProfile role(String roleId) {
        return roles.findById(roleId).orElseThrow(() -> failure(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED"));
    }

    /** 检查旧策划的入口、页签准入等级以及请求中的商店号。 */
    private BlackMarketRules.Catalog requireCatalog(RoleProfile role, int shopType) {
        var catalog = rules.catalog(shopType);
        if (catalog == null) {
            throw failure(HttpStatus.BAD_REQUEST, "INVALID_BLACK_MARKET_REQUEST");
        }
        if (role.level() < rules.minimumLevel() || role.level() < catalog.minimumLevel()) {
            throw failure(HttpStatus.FORBIDDEN, "BLACK_MARKET_LOCKED");
        }
        return catalog;
    }

    /** 每日零点、每周一、每月一日刷新，永久货架返回 0。 */
    private static long refreshAt(BlackMarketRules.Catalog catalog, long now) {
        var date = Instant.ofEpochSecond(now).atZone(SERVER_ZONE).toLocalDate();
        return switch (catalog.refreshMode()) {
            case 0 -> 0;
            case 1 -> date.plusDays(1).atStartOfDay(SERVER_ZONE).toEpochSecond();
            case 2 -> date.with(TemporalAdjusters.next(DayOfWeek.MONDAY)).atStartOfDay(SERVER_ZONE).toEpochSecond();
            case 3 -> date.plusMonths(1).withDayOfMonth(1).atStartOfDay(SERVER_ZONE).toEpochSecond();
            default -> throw new IllegalStateException("黑市刷新类型不合法：" + catalog.refreshMode());
        };
    }

    /** 提供可由游戏协议映射的稳定业务错误。 */
    private static ResponseStatusException failure(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
