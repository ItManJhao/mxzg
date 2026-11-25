/** 原普通竞技场的每日、赛季奖励和商店表，由配置导出工具生成服务端输入。 */
package com.funsgamex.mxzg.arena;

import com.funsgamex.mxzg.arena.ArenaSeasonService.RewardTier;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import java.io.IOException;
import java.util.List;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
final class ArenaSeasonRules {
    /** 原 ArenaRankService TopN 容量，每日和赛季结算读取同一榜。 */
    static final int RANK_LIMIT = 200;
    /** 原排行榜协议最多下发前五十和本人排名。 */
    static final int VISIBLE_RANKS = 50;
    /** 赛季调整后保留的最低积分。 */
    private static final int SCORE_FLOOR = 1000;
    /** 策划表的日期、奖励档、物品和限制，不持有角色数据。 */
    private final Config config;

    /** 一档周宝箱配置，次数字段为当前赛季内已结算次数。 */
    record ChestRow(int id, int requiredChallenges, int boxPic, List<Reward> rewards) {}

    /** 单个固定商店报价，purchaseLimit 为零表示不限量。 */
    record OfferRow(int id, int requiredLevel, int purchaseLimit, long price, List<Reward> rewards) {}

    /** 每日或赛季奖励档，邮件正文的 [1] 原样替换为名次。 */
    record RankReward(List<RewardTier> tiers, String title, String content) {
        /** 按真实名次匹配上界档，榜外不能虚假结算。 */
        RewardTier tier(int rank) {
            return tiers.stream().filter(tier -> tier.minRank() <= rank && rank <= tier.maxRank())
                    .findFirst().orElseThrow();
        }
    }

    /** 全部导出表及原旧参数。 */
    private record Config(RankReward daily, RankReward season, List<Integer> cupReduction, int likeLimit,
                          List<Reward> likeRewards, List<ChestRow> chests, int shopCurrency, List<OfferRow> offers) {}

    /** 读入由原表导出的完整规则，缺失或无效时拒绝启动。 */
    ArenaSeasonRules(ObjectMapper mapper) {
        try (var input = getClass().getResourceAsStream("/gameplay/arena-season-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("普通竞技场赛季规则缺失");
            }
            config = mapper.readValue(input, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("普通竞技场赛季规则读取失败", failure);
        }
        if (config.cupReduction().size() != 3 || config.likeLimit() <= 0 || config.likeRewards().isEmpty()
                || config.chests().size() != 6 || config.offers().size() != 11 || config.shopCurrency() != 900901
                || config.daily().tiers().isEmpty() || config.season().tiers().isEmpty()) {
            throw new IllegalStateException("普通竞技场赛季规则结构无效");
        }
    }

    /** 读取每日排名奖励档及发信文字。 */
    RankReward daily() {
        return config.daily();
    }

    /** 读取每赛季排名奖励档及发信文字。 */
    RankReward season() {
        return config.season();
    }

    /** 按原 float 公式从结算前积分计算赛季调整，至少保留 1000 分。 */
    int resetScore(int score) {
        float cup = score / 1000.0f;
        float a = config.cupReduction().get(0) / 10000.0f;
        float b = config.cupReduction().get(1) / 10000.0f;
        float c = config.cupReduction().get(2) / 10000.0f;
        return Math.max(SCORE_FLOOR, (int) (score * (1 - (a * cup * cup + b * cup + c) / 100.0f)));
    }

    /** 原竞技场每个自然日最多的点赞对象数。 */
    int likeLimit() {
        return config.likeLimit();
    }

    /** 一次有效点赞的原固定资产奖励。 */
    List<Reward> likeRewards() {
        return config.likeRewards();
    }

    /** 原赛季宝箱排列，按次数字段显示和判断资格。 */
    List<ChestRow> chests() {
        return config.chests();
    }

    /** 普通竞技场兑换通用货币物品 ID。 */
    int shopCurrency() {
        return config.shopCurrency();
    }

    /** 竞技场全部有效目录，角色等级在服务端筛选。 */
    List<OfferRow> offers() {
        return config.offers();
    }

    /** 在服务装配时验证全部配置可能买到或领到的奖励都有真实资产路由。 */
    List<Integer> rewardItems() {
        return Stream.of(config.likeRewards().stream(), chests().stream().flatMap(row -> row.rewards().stream()),
                offers().stream().flatMap(row -> row.rewards().stream()),
                config.daily().tiers().stream().flatMap(row -> row.rewards().stream()),
                config.season().tiers().stream().flatMap(row -> row.rewards().stream()))
                .flatMap(stream -> stream).map(Reward::itemId).distinct().toList();
    }
}
