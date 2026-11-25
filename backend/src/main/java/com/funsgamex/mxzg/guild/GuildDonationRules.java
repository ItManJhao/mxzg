/**
 * 公会捐献配置。按旧客户端 clandonate/clandonateactivity 保留档位、奖励和日总进度。
 * 服务端启动时验证全表，业务只接受配置编号。
 */
package com.funsgamex.mxzg.guild;

import com.funsgamex.mxzg.reward.RewardGrantService;
import java.io.IOException;
import java.util.List;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
final class GuildDonationRules {
    /** 沿用普通堆叠物品身份，公会商店与捐献使用同一个余额。 */
    static final int MEDALS_ITEM_ID = 901301;
    /** 低档消耗角色金币。 */
    static final int GOLD_ITEM_ID = 900001;
    /** 中高档消耗角色钻石。 */
    static final int DIAMONDS_ITEM_ID = 900002;

    /** 配置档位分开保存日贡献点和公会经验，当前三档的两项数值相同。 */
    record Tier(int id, int costItemId, int costAmount, int medals, int experience, int points) {
        /** 投影客户端需要展示的价格、勋章和公会经验。 */
        GuildDonationService.Tier display() {
            return new GuildDonationService.Tier(id, costItemId, costAmount, medals, experience);
        }
    }

    /** 公会总贡献达到指定点数后可领取的奖励配置。 */
    record Chest(int id, int points, List<RewardGrantService.Reward> rewards) {
        /** 避免读表后的可变列表被后续展示请求修改。 */
        Chest {
            rewards = List.copyOf(rewards);
        }
    }

    /** 随构建一起发行的两张旧捐献规则表投影。 */
    record Config(List<Tier> tiers, List<Chest> chests) {}

    /** 按原编号排序的三档捐献。 */
    final List<Tier> tiers;
    /** 按原编号及点数升序排列的三个宝箱。 */
    final List<Chest> chests;

    /** 加载并验证档位、奖励分路和展示布局的约定，任何缺失都拒绝启动。 */
    GuildDonationRules(ObjectMapper mapper, RewardGrantService grants) {
        try (var stream = getClass().getResourceAsStream("/gameplay/guild-donation-rules.json")) {
            if (stream == null) {
                throw new IllegalStateException("缺少公会捐献规则");
            }
            var config = mapper.readValue(stream, Config.class);
            tiers = List.copyOf(config.tiers());
            chests = List.copyOf(config.chests());
        } catch (IOException failure) {
            throw new IllegalStateException("公会捐献规则读取失败", failure);
        }

        if (tiers.size() != 3 || chests.size() != 3) {
            throw new IllegalStateException("公会捐献需要三种档位和三档宝箱");
        }
        grants.requireSupported(List.of(MEDALS_ITEM_ID));
        int points = 0;
        for (int i = 0; i < tiers.size(); i++) {
            var tier = tiers.get(i);
            var chest = chests.get(i);
            if (tier.id() != i + 1 || chest.id() != i + 1 || tier.medals() <= 0 || tier.experience() <= 0
                    || tier.points() <= 0 || tier.costAmount() <= 0 || chest.points() <= points
                    || (tier.costItemId() != GOLD_ITEM_ID && tier.costItemId() != DIAMONDS_ITEM_ID)
                    || chest.rewards().isEmpty() || chest.rewards().stream().anyMatch(item -> item.quantity() <= 0)) {
                throw new IllegalStateException("公会捐献档位或宝箱配置无效：" + (i + 1));
            }
            grants.requireSupported(chest.rewards().stream().map(RewardGrantService.Reward::itemId).toList());
            points = chest.points();
        }
    }
}
