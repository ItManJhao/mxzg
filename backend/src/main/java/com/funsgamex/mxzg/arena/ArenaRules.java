/**
 * 普通竞技场的原策划配置及计算规则。
 * 提供新手机器人、真人候选配比、攻击倍率、积分与奖励，扣费及持久结果由竞技场服务处理。
 */
package com.funsgamex.mxzg.arena;

import com.funsgamex.mxzg.arena.ArenaRepository.MatchPlayer;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.ConfiguredEnemy;
import com.funsgamex.mxzg.hero.HeroBattleRoundUtils;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
final class ArenaRules {
    /** 门票使用已接入的普通库存, 对应旧竞技场物品配置。 */
    static final int TICKET_ID = 900501;
    /** 旧神职概率与奖励比例的基数，单位为万分之一。 */
    private static final int BASIS = 10_000;
    /** 已校验的原表数值、掉落和阵容，不保存角色进度。 */
    private final Config config;
    /** 按配置机器人编号查找，可用于持久对手恢复。 */
    private final Map<Integer, Bot> bots;

    /** 对手的真实展示和原守军，不从角色名册虚构 NPC。 */
    record Bot(int id, String name, int level, int score, int avatarId, List<ConfiguredEnemy> enemies) {
        /** 冻结机器人阵容，供匹配及战斗共用。 */
        Bot {
            enemies = List.copyOf(enemies);
        }
    }

    /** 在完整权重池中抽取一组原竞技场参与奖励。 */
    record Drop(int weight, List<Reward> items) {}

    /** 记录原神职等级、万分比加成和命中概率。 */
    private record ClergyBonus(int level, int points, int chance) {}

    /** 从策划表导出的配置，规则加载后不会随角色或会话变化。 */
    record Config(int minimumLevel, int freeLimit, int ticketPriceDiamonds, int opponentCount,
                  int newcomerWins, int historyLimit, int roundLimit, Map<Integer, Long> attackRates,
                  List<Bot> bots, List<Drop> rewards, List<ClergyBonus> clergy) {
        /** 冻结战斗规则及原始数据，避免服务修改全局配置。 */
        Config {
            attackRates = Map.copyOf(attackRates);
            bots = List.copyOf(bots);
            rewards = List.copyOf(rewards);
            clergy = List.copyOf(clergy);
        }
    }

    /** 加载机器人和原战斗类型 4；无效配置拒绝启动。 */
    ArenaRules(ObjectMapper mapper) {
        try (var input = ArenaRules.class.getResourceAsStream("/gameplay/arena-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("竞技场原配置缺失");
            }
            config = mapper.readValue(input, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("竞技场原配置读取失败", failure);
        }
        if (config.minimumLevel() <= 0 || config.freeLimit() <= 0 || config.ticketPriceDiamonds() <= 0
                || config.opponentCount() <= 0 || config.newcomerWins() <= 0 || config.historyLimit() <= 0
                || config.roundLimit() != HeroBattleRoundUtils.ARENA_MAX_ROUNDS
                || config.attackRates().isEmpty() || config.attackRates().entrySet().stream()
                   .anyMatch(rate -> rate.getKey() <= 0 || rate.getKey() > config.roundLimit() || rate.getValue() <= 0)
                || config.rewards().isEmpty() || config.rewards().stream().anyMatch(drop ->
                   drop.weight() <= 0 || drop.items().isEmpty() || drop.items().stream()
                   .anyMatch(item -> item.itemId() <= 0 || item.quantity() <= 0))
                || config.clergy().stream().anyMatch(bonus ->
                   bonus.level() <= 0 || bonus.points() <= 0 || bonus.chance() <= 0 || bonus.chance() > BASIS)) {
            throw new IllegalStateException("竞技场规则配置无效");
        }
        var byId = new LinkedHashMap<Integer, Bot>();
        for (var bot : config.bots()) {
            if (bot.id() <= 0 || bot.name().isBlank() || bot.level() <= 0 || bot.score() < 0 || bot.avatarId() <= 0
                    || bot.enemies().size() != 4 || !Set.copyOf(bot.enemies().stream()
                        .map(ConfiguredEnemy::position).toList()).equals(Set.of(2, 3, 5, 6))
                    || byId.put(bot.id(), bot) != null) {
                throw new IllegalStateException("竞技场机器人配置无效：" + bot.id());
            }
        }
        if (byId.size() < config.opponentCount()) {
            throw new IllegalStateException("竞技场机器人数量少于候选数");
        }
        bots = Map.copyOf(byId);
    }

    /** 取得已冻结的竞技场参数和奖励配置。 */
    Config config() {
        return config;
    }

    /** 根据持久候选编号找到原配置，历史候选损坏时明确失败。 */
    Bot bot(int id) {
        var result = bots.get(id);
        if (result == null) {
            throw new IllegalStateException("竞技场候选机器人配置不存在：" + id);
        }
        return result;
    }

    /** 机器人原权重都为 1，每次刷新从整个配置池随机抽取互不相同的候选。 */
    List<Integer> drawOpponents(RandomGenerator random) {
        var candidates = new ArrayList<>(config.bots().stream().map(Bot::id).toList());
        var selected = new ArrayList<Integer>(config.opponentCount());
        for (int index = 0; index < config.opponentCount(); index++) {
            selected.add(candidates.remove(random.nextInt(candidates.size())));
        }
        return List.copyOf(selected);
    }

    /** 旧版最多从本人积分附近十名找候选，靠前角色匹配更多高战力对手。 */
    static final int MATCH_POOL_SIZE = 10;
    /** 旧版前 32 名使用一弱二强，其余使用二弱一强，找不到时以余下列表补齐。 */
    private static final int STRONG_MATCH_RANK = 32;

    /** 从真实近邻随机取出低战力、高战力和补位角色，每个目标只出现一次。 */
    List<MatchPlayer> drawPlayers(ArenaRepository.MatchPool match, long ownPower, RandomGenerator random) {
        var pool = new ArrayList<>(match.players());
        for (int index = pool.size() - 1; index > 0; index--) {
            java.util.Collections.swap(pool, index, random.nextInt(index + 1));
        }
        var result = new ArrayList<MatchPlayer>(config.opponentCount());
        int lowCount = config.opponentCount() - (match.viewerRank() <= STRONG_MATCH_RANK ? 2 : 1);
        if (lowCount > 0) {
            var lower = pool.stream().filter(player -> player.power() < ownPower).limit(lowCount).toList();
            result.addAll(lower);
            pool.removeAll(lower);
        }
        var higher = pool.stream().filter(player -> player.power() > ownPower)
                .limit(config.opponentCount() - result.size()).toList();
        result.addAll(higher);
        pool.removeAll(higher);
        result.addAll(pool.stream().limit(config.opponentCount() - result.size()).toList());
        return List.copyOf(result);
    }

    /** 原杯数规则按分差计算赢家增量并限制在 1～24；新手战败保持原分。 */
    int scoreGain(int attackerScore, int defenderScore) {
        return Math.clamp(unclampedGain(attackerScore, defenderScore), 1, 24);
    }

    /** 真人守方失败按原服以守方为第一参数取公式的第二项，实际杯数最低为零。 */
    int scoreLoss(int defenderScore, int attackerScore) {
        int spread = 20 + Math.abs(attackerScore - defenderScore) % 10;
        return Math.min(defenderScore, Math.clamp(spread - unclampedGain(defenderScore, attackerScore), 1, 24));
    }

    /** 原 Elo 变体的未限制增量；守方扣分先用该值计算互补项，再各自限制。 */
    private static int unclampedGain(int attackerScore, int defenderScore) {
        int gap = defenderScore - attackerScore;
        double expected = 1.0 / (1.0 + Math.pow(10, gap / 170.0));
        int spread = 20 + Math.abs(gap) % 10;
        return (int) Math.ceil(spread * (1.0 - expected));
    }

    /** 胜负都产生一次权重奖励，命中神职配置时追加实际基础奖励的比例。 */
    List<Reward> rewards(int clergyLevel, RandomGenerator random) {
        int draw = random.nextInt(config.rewards().stream().mapToInt(Drop::weight).sum());
        for (var reward : config.rewards()) {
            if (draw < reward.weight()) {
                return applyClergy(reward.items(), clergyLevel, random);
            }
            draw -= reward.weight();
        }
        throw new IllegalStateException("竞技场掉落权重无效");
    }

    /** 用旧神职规则的 float 比例逐项向上取整，通用发奖随后合并同种道具。 */
    private List<Reward> applyClergy(List<Reward> base, int clergyLevel, RandomGenerator random) {
        var result = new ArrayList<>(base);
        for (var bonus : config.clergy()) {
            if (clergyLevel >= bonus.level() && random.nextInt(BASIS) < bonus.chance()) {
                float factor = (float) bonus.points() / BASIS;
                for (var reward : base) {
                    result.add(new Reward(reward.itemId(), (long) Math.ceil(reward.quantity() * factor)));
                }
            }
        }
        return List.copyOf(result);
    }
}
