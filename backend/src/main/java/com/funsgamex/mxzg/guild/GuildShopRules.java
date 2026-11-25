/**
 * 公会商店货架来自原 shopclan.xlsx 以及 shopcontrol 项的货币和刷新方式。
 * 服务端加载固定货架与周重置时间，启动时检验当前已开放的发奖类型。
 */
package com.funsgamex.mxzg.guild;

import com.funsgamex.mxzg.reward.RewardGrantService;
import java.io.IOException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
class GuildShopRules {
    /** 原 shopcontrol 100600 使用的公会币配置号。 */
    static final int CURRENCY = 901301;
    /** 原商店每周一零点免费刷新，新版统一按上海时区判定。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 精灵 2000003 尚无独立生成和恢复能力，原商品位置保留在货架。 */
    private static final int PENDING_SPIRIT = 2000003;

    /** 商品配置编号、实发件数、每份价格和角色每周最大可买份数。 */
    record Offer(int productId, int itemId, int quantity, int cost, int limit) {
        /** 只有已恢复发奖领域的商品允许兑换。 */
        boolean purchasable() {
            return itemId != PENDING_SPIRIT;
        }
    }

    /** 按原配置顺序完整保存的固定货架。 */
    private final List<Offer> offers;
    /** 购买时以原商品编号查找已校验的权威报价。 */
    private final Map<Integer, Offer> byId;

    /** 装配并验证原始固定货架投影，缺失或重复行阻止启动。 */
    GuildShopRules(ObjectMapper mapper, RewardGrantService grants) {
        var index = new LinkedHashMap<Integer, Offer>();
        try (var stream = GuildShopRules.class.getResourceAsStream("/gameplay/guild-shop-rules.json")) {
            if (stream == null) {
                throw new IllegalStateException("缺少公会商店货架配置");
            }
            var root = mapper.readTree(stream);
            var rows = root.path("products");
            if (!rows.isArray() || rows.isEmpty() || root.path("currency").asInt(0) != CURRENCY) {
                throw new IllegalStateException("公会商店货币或货架配置无效");
            }
            for (var row : rows) {
                var offer = mapper.treeToValue(row, Offer.class);
                if (offer.productId() <= 0 || offer.itemId() <= 0 || offer.quantity() <= 0
                        || offer.cost() <= 0 || offer.limit() <= 0 || index.put(offer.productId(), offer) != null) {
                    throw new IllegalStateException("公会商店商品配置无效：" + offer);
                }
            }
        } catch (IOException failure) {
            throw new IllegalStateException("公会商店货架读取失败", failure);
        }
        offers = List.copyOf(index.values());
        byId = Map.copyOf(index);
        grants.requireSupported(offers.stream().filter(Offer::purchasable).map(Offer::itemId).toList());
    }

    /** 读取展示次序固定的完整货架，含缺少发奖领域的原商品。 */
    List<Offer> list() {
        return offers;
    }

    /** 按原商品编号解析权威报价，未配置则返回 null。 */
    Offer find(int productId) {
        return byId.get(productId);
    }

    /** 返回当前购买周期到期时刻，下周一上海零点的 Unix 秒。 */
    static long resetAfter(long nowSeconds) {
        return Instant.ofEpochSecond(nowSeconds).atZone(SERVER_ZONE).toLocalDate()
                .with(TemporalAdjusters.next(DayOfWeek.MONDAY)).atStartOfDay(SERVER_ZONE).toEpochSecond();
    }
}
