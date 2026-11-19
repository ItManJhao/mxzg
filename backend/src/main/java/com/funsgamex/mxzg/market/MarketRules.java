/**
 * 普通市场的商品池、开放等级和手动刷新配置。
 * 只读取同源策划投影，为角色事务提供原权重和成交价；随机结果由市场服务持久化。
 */
package com.funsgamex.mxzg.market;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
final class MarketRules {
    /** 商品成交消耗仅为原表的金币或钻石。 */
    static final int GOLD = 900001;
    /** 市场手动付费刷新与部分商品使用钻石。 */
    static final int DIAMONDS = 900002;

    /** 原商品配置编号、抽样资格、实际成交价和客户端折扣显示值，100 表示原价。 */
    record Product(int id, int weight, int minimumLevel, int maximumLevel, int itemId, long quantity,
                   int costItemId, long costQuantity, int purchaseLimit, int discount) {}

    /** 策划同批导出的市场控制值、VIP 付费刷新上限和完整候选商品。 */
    record Config(int minimumLevel, int shelfSize, int freeRefreshLimit, int freeRefreshSeconds,
                  int refreshCostItemId, long refreshCostQuantity, Map<Integer, Integer> paidLimits,
                  List<Product> products) {}

    /** 随进程启动读取，运行期间的货架不能由客户端改价或更换商品。 */
    private final Config config;
    /** 商品原编号到成交规则，只用于恢复已经上架的商品。 */
    private final Map<Integer, Product> productsById;

    /** 载入同源投影并拒绝缺失、重复或不支持的货币型配置。 */
    MarketRules(ObjectMapper mapper) {
        try (var input = getClass().getResourceAsStream("/gameplay/market-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少普通市场配置");
            }
            config = mapper.readValue(input, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("普通市场配置读取失败", failure);
        }
        if (config.minimumLevel() <= 0 || config.shelfSize() <= 0 || config.freeRefreshLimit() <= 0
                || config.freeRefreshSeconds() <= 0 || !currency(config.refreshCostItemId())
                || config.refreshCostQuantity() <= 0 || !config.paidLimits().containsKey(0)
                || config.paidLimits().values().stream().anyMatch(value -> value == null || value <= 0)) {
            throw new IllegalStateException("普通市场的刷新配置不合法");
        }
        var index = new HashMap<Integer, Product>();
        for (var product : config.products()) {
            if (product.id() <= 0 || product.weight() <= 0 || product.minimumLevel() <= 0
                    || product.maximumLevel() < product.minimumLevel() || product.itemId() <= 0
                    || product.quantity() <= 0 || !currency(product.costItemId()) || product.costQuantity() <= 0
                    || product.purchaseLimit() <= 0 || product.discount() < 1 || product.discount() > 100
                    || index.put(product.id(), product) != null) {
                throw new IllegalStateException("普通市场商品配置不合法：" + product.id());
            }
        }
        if (index.size() < config.shelfSize()) {
            throw new IllegalStateException("普通市场候选商品不足");
        }
        productsById = Map.copyOf(index);
    }

    /** 返回货架生成、免费补充与刷新价格所用的原始规则。 */
    Config config() {
        return config;
    }

    /** 读取当前角色女神 VIP 配置的每日付费刷新上限。 */
    int paidLimit(int vipLevel) {
        Integer limit = config.paidLimits().get(vipLevel);
        if (limit == null) {
            throw new IllegalStateException("普通市场缺少女神 VIP 配置：" + vipLevel);
        }
        return limit;
    }

    /** 按持久货架的原商品编号读取同一策划行。 */
    Product requireProduct(int productId) {
        var product = productsById.get(productId);
        if (product == null) {
            throw new IllegalStateException("普通市场缺少持久货架的商品：" + productId);
        }
        return product;
    }

    /** 从等级区间内按权重无放回抽满货架，再按原客户端的商品编号排序。 */
    List<Product> draw(int level, RandomGenerator random) {
        var candidates = new ArrayList<Product>();
        long total = 0;
        for (var product : config.products()) {
            if (product.minimumLevel() <= level && level <= product.maximumLevel()) {
                candidates.add(product);
                total += product.weight();
            }
        }
        if (candidates.size() < config.shelfSize()) {
            throw new IllegalStateException("普通市场没有足够的等级候选：" + level);
        }
        var result = new ArrayList<Product>();
        for (int slot = 0; slot < config.shelfSize(); slot++) {
            long point = random.nextLong(total);
            int index = 0;
            while (point >= candidates.get(index).weight()) {
                point -= candidates.get(index).weight();
                index++;
            }
            var selected = candidates.remove(index);
            total -= selected.weight();
            result.add(selected);
        }
        result.sort(Comparator.comparingInt(Product::id));
        return List.copyOf(result);
    }

    /** 判断该配置货币是否走现有角色钱包。 */
    private static boolean currency(int itemId) {
        return itemId == GOLD || itemId == DIAMONDS;
    }
}
