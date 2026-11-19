/** 金币副本首关的配置读取与纯奖励运算，只使用原策划表的服务端投影。 */
package com.funsgamex.mxzg.dungeon;

import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.ConfiguredEnemy;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class DailyDungeonRules {
    /** 旧神职收益的每万分标准，抽样范围为 1 至 10000。 */
    private static final int BASIS = 10_000;
    /** 进程内只读的首关规则；源表有新副本时仍只加载明确接入的首关。 */
    private final Config config;
    /** 开战时冻结的敌方原关卡名字，来自已有简体语言表。 */
    private final String opponentName;

    /** 旧神职特权的最小等级、奖励比例和命中概率，比例及概率均为万分比。 */
    private record ClergyBonus(int level, int points, int chance) {}

    /** 原规则导出字段；免费上限、各 VIP 上限及每次报价独立保存。 */
    private record Config(int stageId, int titleLanguageId, int minimumLevel, long requiredPower, int freeLimit,
                          Map<Integer, Integer> vipLimits, Map<Integer, Long> costs, List<Reward> rewardPreview,
                          List<ClergyBonus> clergy, List<ConfiguredEnemy> enemies) {}

    /** 读入配置并冻结，使配置缺口在服务启动时明确失败。 */
    public DailyDungeonRules(ObjectMapper mapper) {
        Config raw;
        try (var input = getClass().getResourceAsStream("/gameplay/daily-gold-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少金币副本首关配置");
            }
            raw = mapper.readValue(input, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("金币副本首关配置无法读取", failure);
        }
        if (raw.stageId() != 1 || raw.titleLanguageId() <= 0 || raw.minimumLevel() <= 0 || raw.requiredPower() < 0
                || raw.freeLimit() <= 0 || !raw.vipLimits().containsKey(0) || raw.rewardPreview().isEmpty()
                || raw.enemies().isEmpty() || raw.clergy().stream().anyMatch(bonus -> bonus.level() <= 0
                    || bonus.points() <= 0 || bonus.chance() < 0 || bonus.chance() > BASIS)) {
            throw new IllegalStateException("金币副本首关配置无效");
        }
        this.config = new Config(raw.stageId(), raw.titleLanguageId(), raw.minimumLevel(), raw.requiredPower(),
                raw.freeLimit(), Map.copyOf(raw.vipLimits()), Map.copyOf(raw.costs()), List.copyOf(raw.rewardPreview()),
                List.copyOf(raw.clergy()), List.copyOf(raw.enemies()));
        this.opponentName = readOpponentName(mapper, raw.titleLanguageId());
    }

    /** 返回当前唯一开放的金币副本关卡。 */
    public int stageId() {
        return config.stageId();
    }

    /** 返回首关的真实原名语言键。 */
    public int titleLanguageId() {
        return config.titleLanguageId();
    }

    /** 返回与原关卡标题一致的战报守方名称。 */
    public String opponentName() {
        return opponentName;
    }

    /** 包含日常副本入口和当前关卡两层角色等级条件。 */
    public boolean unlocked(int level) {
        return level >= config.minimumLevel();
    }

    /** 旧服务端严格要求历史最高主阵容战力高于此门槛。 */
    public long requiredPower() {
        return config.requiredPower();
    }

    /** 所有角色相同的免费次数，只计已获胜或成功扫荡。 */
    public int freeLimit() {
        return config.freeLimit();
    }

    /** 当前女神 VIP 可用的总胜场上限，包含免费次数。 */
    public int totalLimit(int vipLevel) {
        Integer limit = config.vipLimits().get(vipLevel);
        if (limit == null) {
            throw new IllegalStateException("金币副本缺少女神 VIP 次数配置：" + vipLevel);
        }
        return limit;
    }

    /** 按下一个计数位置读取原钻石报价，达到总上限时没有新报价。 */
    public long nextCost(int wins, int limit) {
        if (wins >= limit) {
            return 0;
        }
        Long cost = config.costs().get(wins + 1);
        if (cost == null || cost < 0) {
            throw new IllegalStateException("金币副本缺少扣费配置：" + (wins + 1));
        }
        return cost;
    }

    /** 原表的基础奖励预览，神职加成只在获胜时实际计算。 */
    public List<Reward> rewardPreview() {
        return config.rewardPreview();
    }

    /** 返回冻结的原守军行，不随机替换英雄或略去技能。 */
    public List<ConfiguredEnemy> enemies() {
        return config.enemies();
    }

    /** 逐项按旧神职规则抽样，使用旧 float 乘法和向上取整，通用发奖再合并同 ID。 */
    public List<Reward> rewards(int clergyLevel, RandomGenerator random) {
        var result = new ArrayList<>(rewardPreview());
        for (var bonus : config.clergy()) {
            if (clergyLevel >= bonus.level() && random.nextInt(1, BASIS + 1) <= bonus.chance()) {
                float factor = (float) bonus.points() / BASIS;
                for (var reward : rewardPreview()) {
                    result.add(new Reward(reward.itemId(), (long) Math.ceil(reward.quantity() * factor)));
                }
            }
        }
        return List.copyOf(result);
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
            throw new IllegalStateException("金币副本语言表无法读取", failure);
        }
        throw new IllegalStateException("金币副本首关缺少语言配置：" + id);
    }
}
