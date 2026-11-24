/**
 * 幻境之塔的静态规则和配置楼层，由导出工具从原策划表生成。
 * 所有角色共用同一份配置，精力、通关、领取及出阵状态由 TowerService 管理。
 */
package com.funsgamex.mxzg.tower;

import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.ConfiguredEnemy;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class TowerRules {
    /** 已校验的精力、开放楼层、扫荡报价及各档里程碑。 */
    private final Config config;

    /** 旧策划表投影，精力恢复以秒为单位，扫荡报价从当日第一次开始。 */
    record Config(int minimumLevel, int maxEnergy, int rechargeSeconds, String opponentName,
                  List<Long> sweepCosts, List<Floor> floors, List<Milestone> milestones) {
        /** 冻结静态配置，禁止战斗和预览修改原表。 */
        Config {
            sweepCosts = List.copyOf(sweepCosts);
            floors = List.copyOf(floors);
            milestones = List.copyOf(milestones);
        }
    }

    /** 按原表区分建议战力、首通自动到账、扫荡和用于实际战斗的守军。 */
    record Floor(int floor, long recommendedPower, List<Reward> firstRewards, List<Reward> sweepRewards,
                 List<ConfiguredEnemy> enemies) {
        /** 奖励和守军跨场共用，禁止临时状态写入此处。 */
        Floor {
            firstRewards = List.copyOf(firstRewards);
            sweepRewards = List.copyOf(sweepRewards);
            enemies = List.copyOf(enemies);
        }
    }

    /** 已开放楼层内按原配置编号独立领取的里程碑。 */
    record Milestone(int id, int floor, List<Reward> rewards) {
        /** 冻结领取配置，防止共享预览对象改变发奖条件。 */
        Milestone {
            rewards = List.copyOf(rewards);
        }
    }

    /** 启动时读取楼层和里程碑配置，缺层、缺奖励或重复配置编号会阻止装配。 */
    public TowerRules(ObjectMapper mapper) {
        try (var input = TowerRules.class.getResourceAsStream("/gameplay/tower-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少幻境之塔配置");
            }
            config = mapper.readValue(input, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("无法读取幻境之塔配置", failure);
        }
        if (config.minimumLevel() <= 0 || config.maxEnergy() <= 0 || config.rechargeSeconds() <= 0
                || config.opponentName() == null || !config.opponentName().contains("%s")
                || config.sweepCosts().isEmpty() || config.sweepCosts().stream().anyMatch(cost -> cost < 0)
                || config.milestones().isEmpty()) {
            throw new IllegalStateException("幻境之塔规则无效");
        }
        // V56 只保存了第 10 层的已领状态，迁移后仍对应策划编号 1。
        var first = config.milestones().getFirst();
        if (first.id() != 1 || first.floor() != 10) {
            throw new IllegalStateException("幻境之塔原第 10 层里程碑编号不一致");
        }
        int previousMilestoneFloor = 0;
        var milestoneIds = new HashSet<Integer>();
        for (var milestone : config.milestones()) {
            if (milestone.id() <= 0 || !milestoneIds.add(milestone.id()) || milestone.floor() <= previousMilestoneFloor
                    || milestone.floor() > config.floors().size() || milestone.rewards().isEmpty()) {
                throw new IllegalStateException("幻境之塔里程碑配置无效：" + milestone.id());
            }
            previousMilestoneFloor = milestone.floor();
        }
        int expected = 1;
        for (var floor : config.floors()) {
            var positions = new HashSet<Integer>();
            if (floor.floor() != expected++ || floor.firstRewards().isEmpty() || floor.sweepRewards().isEmpty()
                    || floor.recommendedPower() < 0 || floor.enemies().size() != 6
                    || floor.enemies().stream().anyMatch(unit -> unit.position() < 1 || unit.position() > 8
                        || !positions.add(unit.position()))) {
                throw new IllegalStateException("幻境之塔楼层配置无效：" + floor.floor());
            }
        }
    }

    /** 返回已校验的全区规则，消费和发奖使用相同的数据。 */
    Config config() {
        return config;
    }
}
