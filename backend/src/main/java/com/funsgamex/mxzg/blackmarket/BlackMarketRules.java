/**
 * 黑市页签和货品配置，按现有策划表导入固定货架、刷新方式和成交条件。
 * 服务端使用同一份配置决定玩家可见的商品及可操作的摊位。
 */
package com.funsgamex.mxzg.blackmarket;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
final class BlackMarketRules {
    /** 道具摊位也是旧版每日任务的实际商店类型。 */
    static final int STALL = 100800;
    /** 竞技场货架必须沿用竞技场的商店数据和限购记录。 */
    static final int ARENA = 100500;
    /** 道具摊位唯一用于真实扣费的钱包货币。 */
    private static final int DIAMONDS = 900002;

    /** 原策划的页面准入等级和页签顺序。 */
    record Config(int minimumLevel, List<Catalog> tabs) {}

    /** 页面原配置；刷新方式分别为无、每日、每周和每月。 */
    record Catalog(int shopType, String name, int minimumLevel, int refreshMode, int currencyItemId,
                   boolean showRefreshTime, List<Product> products) {

        /** 当前已接入真实交易的是道具与竞技场货架。 */
        boolean available() {
            return shopType == STALL || shopType == ARENA;
        }
    }

    /** 一件在售商品的显示及报价规则；购买数量上限为 0 表示原表不限购。 */
    record Product(int id, int minimumLevel, int requiredClergy, int itemId, long quantity,
                   int costItemId, long costQuantity, int purchaseLimit, int discount) {}

    /** 游戏进程内只读的全部黑市规则，启动时验证。 */
    private final Config config;

    /** 读取原策划产物并拒绝缺失道具或竞技场目录的错误配置。 */
    BlackMarketRules(ObjectMapper mapper) {
        try (var input = getClass().getResourceAsStream("/gameplay/black-market-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少黑市配置");
            }
            config = mapper.readValue(input, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("黑市配置读取失败", failure);
        }
        var catalogIds = new HashSet<Integer>();
        for (var catalog : config.tabs()) {
            if (catalog.shopType() <= 0 || !catalogIds.add(catalog.shopType()) || catalog.name().isBlank()
                    || catalog.minimumLevel() < config.minimumLevel() || catalog.currencyItemId() <= 0
                    || catalog.refreshMode() < 0 || catalog.refreshMode() > 3
                    || catalog.products().isEmpty() != (catalog.shopType() == ARENA)) {
                throw new IllegalStateException("黑市摊位配置不合法：" + catalog.shopType());
            }
            validateProducts(catalog);
        }
        if (config.minimumLevel() <= 0 || !catalogIds.contains(STALL) || !catalogIds.contains(ARENA)) {
            throw new IllegalStateException("黑市入口或基础摊位配置不合法");
        }
        if (catalog(STALL).refreshMode() != 1 || catalog(STALL).currencyItemId() != DIAMONDS
                || catalog(ARENA).refreshMode() != 2 || catalog(ARENA).currencyItemId() != 900901) {
            throw new IllegalStateException("黑市道具或竞技场的期次与币种不合法");
        }
    }

    /** 校验同一货架的商品 ID 唯一，并确保道具摊位的报价与钻石扣费一致。 */
    private void validateProducts(Catalog catalog) {
        var ids = new HashSet<Integer>();
        for (var product : catalog.products()) {
            if (product.id() <= 0 || !ids.add(product.id()) || product.minimumLevel() <= 0
                    || product.itemId() <= 0 || product.quantity() <= 0
                    || product.costItemId() <= 0 || product.costQuantity() <= 0
                    || product.requiredClergy() < 0 || product.purchaseLimit() < 0
                    || product.discount() <= 0 || product.discount() > 100
                    || catalog.shopType() == STALL
                    && (product.costItemId() != DIAMONDS || product.purchaseLimit() == 0)) {
                throw new IllegalStateException("黑市货品配置不合法：" + catalog.shopType() + "/" + product.id());
            }
        }
    }

    /** 返回整个入口至少需要的角色等级。 */
    int minimumLevel() {
        return config.minimumLevel();
    }

    /** 按策划页签顺序返回玩家等级可显示的货架。 */
    List<Catalog> visibleTabs(int level) {
        return config.tabs().stream().filter(tab -> level >= tab.minimumLevel()).toList();
    }

    /** 使用原商店类型查找对应货架，未登记时返回 null。 */
    Catalog catalog(int shopType) {
        return config.tabs().stream().filter(tab -> tab.shopType() == shopType).findFirst().orElse(null);
    }
}
