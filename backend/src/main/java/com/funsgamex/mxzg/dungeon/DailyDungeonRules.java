/**
 * 加载各类日常副本对应的旧配置，供副本服务读取关卡、当日次数、报价和神职奖励。
 * 配置在应用启动时校验并冻结，可以由所有角色共用。
 */
package com.funsgamex.mxzg.dungeon;

import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.ConfiguredEnemy;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import java.io.IOException;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class DailyDungeonRules {
    /** 旧神职收益的每万分标准，抽样范围为 1 至 10000。 */
    private static final int BASIS = 10_000;
    /** 各已接入副本的规则集，键为稳定的副本类型。 */
    private final Map<DailyDungeonType, Rules> byType;

    /** 旧神职特权的最小等级、奖励比例和命中概率，比例及概率均为万分比。 */
    private record ClergyBonus(int level, int points, int chance) {}

    /** 原规则导出字段；类型级参数和各关每次基本奖励独立保存。 */
    private record Config(int freeLimit, Map<Integer, Integer> vipLimits, Map<Integer, Long> costs,
                          List<ClergyBonus> clergy, List<StageRow> stages) {}

    /** 由旧配置转换的只读规则，关卡按开放顺序排列，配置从 1 开始连续编号。 */
    record Rules(int freeLimit, Map<Integer, Integer> vipLimits, Map<Integer, Long> costs,
                 List<ClergyBonus> clergy, List<Stage> stages) {
        /** 冻结所有类型级配置及其关卡目录，开放后才能被服务读取。 */
        Rules {
            vipLimits = Map.copyOf(vipLimits);
            costs = Map.copyOf(costs);
            clergy = List.copyOf(clergy);
            stages = List.copyOf(stages);
        }

        /** 当前女神 VIP 可用的总胜场上限，包含免费次数。 */
        int totalLimit(int vipLevel) {
            Integer limit = vipLimits.get(vipLevel);
            if (limit == null) {
                throw new IllegalStateException("日常副本缺少女神 VIP 次数配置：" + vipLevel);
            }
            return limit;
        }

        /** 按下一个计数位置读取原钻石报价，达到总上限时没有新报价。 */
        long nextCost(int wins, int limit) {
            if (wins >= limit) {
                return 0;
            }
            Long cost = costs.get(wins + 1);
            if (cost == null || cost < 0) {
                throw new IllegalStateException("日常副本缺少扣费配置：" + (wins + 1));
            }
            return cost;
        }

        /** 逐项沿用本类型的神职概率及旧 float 舍入，按实际关卡基础奖励计算加成。 */
        List<Reward> rewards(Stage stage, int clergyLevel, RandomGenerator random) {
            var result = new ArrayList<>(stage.rewardPreview());
            for (var bonus : clergy) {
                if (clergyLevel >= bonus.level() && random.nextInt(1, BASIS + 1) <= bonus.chance()) {
                    float factor = (float) bonus.points() / BASIS;
                    for (var reward : stage.rewardPreview()) {
                        result.add(new Reward(reward.itemId(), (long) Math.ceil(reward.quantity() * factor)));
                    }
                }
            }
            return List.copyOf(result);
        }
    }

    /** 单关策划原字段，ribbon 为原标题图序号。 */
    private record StageRow(int stageId, int titleLanguageId, int minimumLevel, long requiredPower, int ribbon,
                            List<Reward> rewardPreview, List<ConfiguredEnemy> enemies) {}

    /** 领域服务读取的已验证关卡，战报名在启动时从已有简体语言表解析。 */
    public record Stage(int id, int titleLanguageId, int minimumLevel, long requiredPower, int ribbon,
                        List<Reward> rewardPreview, List<ConfiguredEnemy> enemies, String opponentName) {
        /** 冻结可供不同角色共用的关卡奖励与原守军。 */
        public Stage {
            rewardPreview = List.copyOf(rewardPreview);
            enemies = List.copyOf(enemies);
        }
    }

    /** 读入配置并冻结，使配置缺口在服务启动时明确失败。 */
    public DailyDungeonRules(ObjectMapper mapper) {
        var loaded = new EnumMap<DailyDungeonType, Rules>(DailyDungeonType.class);
        for (var type : DailyDungeonType.values()) {
            loaded.put(type, readRules(mapper, type));
        }
        this.byType = Map.copyOf(loaded);
    }

    /** 获取本次操作所属类型的规则，同类关卡共享次数、报价和神职。 */
    Rules get(DailyDungeonType type) {
        return byType.get(type);
    }

    /** 从原策划投影读取单类副本，并验证关卡编号、守军和展示用语言。 */
    private static Rules readRules(ObjectMapper mapper, DailyDungeonType type) {
        Config raw;
        try (var input = DailyDungeonRules.class.getResourceAsStream("/gameplay/daily-" + type.key() + "-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少日常副本配置：" + type.key());
            }
            raw = mapper.readValue(input, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("日常副本配置无法读取：" + type.key(), failure);
        }
        if (raw.freeLimit() <= 0 || !raw.vipLimits().containsKey(0) || raw.stages().isEmpty()
                || raw.clergy().stream().anyMatch(bonus -> bonus.level() <= 0
                    || bonus.points() <= 0 || bonus.chance() < 0 || bonus.chance() > BASIS)) {
            throw new IllegalStateException("日常副本类型配置无效：" + type.key());
        }
        var opened = new ArrayList<Stage>();
        for (var row : raw.stages()) {
            if (row.stageId() != opened.size() + 1 || row.titleLanguageId() <= 0 || row.minimumLevel() <= 0
                    || row.requiredPower() < 0 || row.ribbon() <= 0 || row.rewardPreview().isEmpty()
                    || row.enemies().size() != 6 || new HashSet<>(row.enemies().stream()
                        .map(ConfiguredEnemy::position).toList()).size() != row.enemies().size()) {
                throw new IllegalStateException("日常副本关卡配置无效：" + type.scenario(row.stageId()));
            }
            opened.add(new Stage(row.stageId(), row.titleLanguageId(), row.minimumLevel(), row.requiredPower(),
                    row.ribbon(), row.rewardPreview(), row.enemies(), readOpponentName(mapper, row.titleLanguageId())));
        }
        return new Rules(raw.freeLimit(), raw.vipLimits(), raw.costs(), raw.clergy(), opened);
    }

    /** 从与客户端共用的语言表按键查找战报名，缺配置时启动失败。 */
    private static String readOpponentName(ObjectMapper mapper, int id) {
        try (var input = DailyDungeonRules.class.getResourceAsStream("/gameplay/language.json")) {
            if (input != null) {
                for (var row : mapper.readTree(input).path("rows")) {
                    if (row.path("key").asString().equals(Integer.toString(id)) && !row.path("value").asString().isBlank()) {
                        return row.path("value").asString();
                    }
                }
            }
        } catch (IOException failure) {
            throw new IllegalStateException("日常副本语言表无法读取", failure);
        }
        throw new IllegalStateException("日常副本关卡缺少语言配置：" + id);
    }
}
