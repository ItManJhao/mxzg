/**
 * 从神装商城原表读取固定货架、限购、货币与交换奖池。
 * 探宝和商城生成实例共用 GodEquipmentRules 的真实模板及初始随机词条。
 */
package com.funsgamex.mxzg.hero;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
final class GodEquipmentShopRules {
    /** 单次请求上限沿用旧 ItemSelectLayer 的无限购商品选择范围。 */
    static final int MAXIMUM_PURCHASE = 9_999;

    /** 单件商品。purchaseLimit 为 0 表示本商品没有每日购买上限。 */
    record Product(int productId, int section, int itemId, int quantity, long costQuantity, int purchaseLimit) {}

    /** 每个商城兑换道具的一行权重，templateId 是发放的真实神装。 */
    record Outcome(int templateId, int quantity, int weight) {}

    /** 工具导出的双端同源价格及仅服务端可见的权重。 */
    private record Configuration(int currency, List<Product> products, Map<Integer, List<Outcome>> pools) {}

    /** 神装碎片、固定货架和真实兑换规则只在启动读取一次。 */
    private final Configuration config;
    /** 购买使用原商品编号索引，客户端不能提交新商品或价格。 */
    private final Map<Integer, Product> products;

    /** 校验商城的静态输入，并通过已装配的神装规则验证奖池。 */
    GodEquipmentShopRules(ObjectMapper mapper, GodEquipmentRules equipment) {
        try (var input = getClass().getResourceAsStream("/gameplay/god-equipment-shop.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少神装商城配置");
            }
            config = mapper.readValue(input, Configuration.class);
        } catch (IOException failure) {
            throw new IllegalStateException("读取神装商城配置失败", failure);
        }
        if (config.currency() <= 0 || config.products().isEmpty()) {
            throw new IllegalStateException("神装商城缺少支付货币或商品");
        }
        products = config.products().stream().collect(Collectors.toUnmodifiableMap(Product::productId, value -> value));
        for (var row : products.values()) {
            if (row.productId() <= 0 || row.section() <= 0 || row.itemId() <= 0 || row.quantity() <= 0
                    || row.costQuantity() <= 0 || row.purchaseLimit() < 0) {
                throw new IllegalStateException("神装商城商品配置不合法：" + row.productId());
            }
            var pool = config.pools().get(row.itemId());
            if (pool != null && (pool.isEmpty() || pool.stream().anyMatch(entry -> entry.quantity() <= 0
                    || entry.weight() <= 0 || equipment.require(entry.templateId()).setType() != row.section()))) {
                throw new IllegalStateException("神装商城兑换奖池不合法：" + row.productId());
            }
        }
    }

    /** 返回原配置支付货币，支付不经过钱包或普通市场。 */
    int currency() {
        return config.currency();
    }

    /** 查询固定货架；配置中没有对应商品时返回空。 */
    Product find(int productId) {
        return products.get(productId);
    }

    /** 返回需要通用发奖能力的非兑换商品模板编号。 */
    List<Integer> directItems() {
        return products.values().stream().map(Product::itemId).filter(id -> !config.pools().containsKey(id)).distinct().toList();
    }

    /** 兑换奖励有独立权重池，普通石头没有兑换步骤。 */
    boolean isExchange(int itemId) {
        return config.pools().containsKey(itemId);
    }

    /** 每次按原权重抽取一行，普通商城石头返回空并走通用发奖。 */
    Outcome roll(int itemId, RandomGenerator random) {
        var candidates = config.pools().get(itemId);
        if (candidates == null) {
            return null;
        }
        long point = random.nextLong(candidates.stream().mapToLong(Outcome::weight).sum());
        for (var entry : candidates) {
            point -= entry.weight();
            if (point < 0) {
                return entry;
            }
        }
        throw new IllegalStateException("神装商城兑换权重未命中");
    }
}
