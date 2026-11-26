/**
 * 勇者试炼固定兑换货架。装载原 shopadventure 投影，提供价格、可见等级、限购和周更新规则。
 * 此处没有角色状态，实际余额、购买次数与回执由 TrialShopService 在事务内处理。
 */
package com.funsgamex.mxzg.trial;

import com.funsgamex.mxzg.reward.RewardGrantService;
import java.io.IOException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
final class TrialShopRules {
    /** 原 shopcontrol 100700 使用的试炼之血配置编号。 */
    static final int CURRENCY = 901201;
    /** 所有新区服的周更新使用上海自然日。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");

    /** 一份商品的奖励、单价、等级与周期上限，0 代表不限购。 */
    record Product(int id, RewardGrantService.Reward reward, int price, int purchaseLimit, int appearLevel) {}

    /** 商店入口开放等级、唯一扣费物品和策划固定货架。 */
    private record Config(int minimumLevel, int currencyItemId, List<Product> products) {}

    /** 玩家打开或购买时必须达到的角色等级。 */
    private final int minimumLevel;
    /** 所有商品按策划编号稳定排序，对不同等级投影同一版本的货架。 */
    private final List<Product> products;
    /** 商品配置编号索引，用于服务器按真实报价交易。 */
    private final Map<Integer, Product> byId;

    /** 读取固定货架，缺失、重复及无法发放的配置在启动时立即报错。 */
    TrialShopRules(ObjectMapper mapper, RewardGrantService grants) {
        Config config;
        try (var input = getClass().getResourceAsStream("/gameplay/trial-shop-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少勇者试炼商店配置");
            }
            config = mapper.readValue(input, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("勇者试炼商店配置读取失败", failure);
        }
        if (config.minimumLevel() <= 0 || config.currencyItemId() != CURRENCY
                || config.products() == null || config.products().isEmpty()) {
            throw new IllegalStateException("勇者试炼商店缺少入口或商品配置");
        }
        var index = new HashMap<Integer, Product>();
        for (var product : config.products()) {
            if (product.id() <= 0 || product.price() <= 0 || product.purchaseLimit() < 0 || product.appearLevel() <= 0
                    || product.reward() == null || product.reward().itemId() <= 0 || product.reward().quantity() <= 0
                    || index.put(product.id(), product) != null) {
                throw new IllegalStateException("勇者试炼商店商品配置无效：" + product.id());
            }
        }
        this.minimumLevel = config.minimumLevel();
        products = index.values().stream().sorted(Comparator.comparingInt(Product::id)).toList();
        byId = Map.copyOf(index);
        grants.requireSupported(products.stream().map(product -> product.reward().itemId()).toList());
    }

    /** 取得玩家访问货架的试炼开放等级。 */
    int minimumLevel() {
        return minimumLevel;
    }

    /** 取得当前等级可见的所有货位，顺序与策划商品编号一致。 */
    List<Product> list(int roleLevel) {
        return products.stream().filter(product -> product.appearLevel() <= roleLevel).toList();
    }

    /** 取得指定可见商品的实际报价，未达到等级或未知编号返回 null。 */
    Product find(int offerId, int roleLevel) {
        var product = byId.get(offerId);
        return product != null && product.appearLevel() <= roleLevel ? product : null;
    }

    /** 返回当前商店周期到期的下周一上海零点 Unix 秒。 */
    static long resetAfter(long nowSeconds) {
        return Instant.ofEpochSecond(nowSeconds).atZone(SERVER_ZONE).toLocalDate()
                .with(TemporalAdjusters.next(DayOfWeek.MONDAY)).atStartOfDay(SERVER_ZONE).toEpochSecond();
    }
}
