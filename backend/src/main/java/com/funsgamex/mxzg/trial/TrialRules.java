/**
 * 勇者试炼的旧配置索引。服务端用导出表校验难度、路线、奖励、
 * 匹配区间及助战限制，运行时不会接受客户端给出的对手或资产。
 */
package com.funsgamex.mxzg.trial;

import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.ConfiguredEnemy;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
class TrialRules {
    /** 限定当前已经打通整条路线的难度；其余档保留原展示与战力要求。 */
    private static final int MAX_OPEN_DIFFICULTY = 1;

    /** 难度入口的战力门槛及原界面奖励预览。 */
    record Difficulty(int id, long minimumPower, List<Reward> previewRewards) {}

    /** 一格地图的原始节点，type 为 1 战斗或 2 宝箱，displayLevel 为玩家看到的战斗关号。 */
    record Stage(int difficulty, int node, int type, int displayLevel, int resetNode,
                 int enemyPowerLow, int enemyPowerHigh, List<Reward> rewards) {
        /** 判断地图格是否为战斗，用于跳过独立领取的宝箱格。 */
        boolean battle() {
            return type == 1;
        }
    }

    /** 试炼匹配使用机器人角色表战力，实际战斗从该机器人队伍读取。 */
    record Robot(int id, int level, int avatarId, long power, List<ConfiguredEnemy> enemies) {}

    /** 匹配和规则由旧表导出，未证实的复活价格和次数可以为空与零。 */
    record Config(int schemaVersion, int minimumLevel, int heroMinimumLevel, int battleRounds, String map,
                  int assistDispatchLimit, int assistSelectLimit, int assistPowerRatio, List<Reward> assistRewards,
                  int reviveLimit, Reward reviveCost, int difficultyChoosePower, List<Difficulty> difficulties,
                  List<Stage> stages, List<Robot> robots) {}

    /** 加载时验证的一份完整只读配置；对手属性由共用战斗输入解析。 */
    private final Config config;
    /** 按难度编号保存连续的地图格，从编号 1 开始。 */
    private final List<List<Stage>> routes;

    /** 静态配置缺失时拒绝装配，避免把副本状态写入无法挑战的路线。 */
    TrialRules(ObjectMapper mapper) {
        try (var input = TrialRules.class.getResourceAsStream("/gameplay/trial-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少勇者试炼配置");
            }
            config = mapper.readValue(input, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("无法读取勇者试炼配置", failure);
        }
        if (config.schemaVersion() != 1 || config.minimumLevel() <= 0 || config.heroMinimumLevel() <= 0
                || config.battleRounds() <= 0 || config.battleRounds() > 15 || config.assistDispatchLimit() < 1
                || config.assistSelectLimit() < 1 || config.assistPowerRatio() < 1 || config.robots().isEmpty()
                || config.difficulties().size() != 3 || config.reviveLimit() < 0
                || (config.reviveLimit() > 0 && !validReward(config.reviveCost()))) {
            throw new IllegalStateException("勇者试炼基础规则无效");
        }
        var routes = new ArrayList<List<Stage>>();
        for (int id = 1; id <= config.difficulties().size(); id++) {
            final int difficulty = id;
            var choice = config.difficulties().get(id - 1);
            var stages = config.stages().stream().filter(stage -> stage.difficulty() == difficulty).toList();
            if (choice.id() != id || choice.minimumPower() < 0 || stages.size() != 20
                    || stages.stream().filter(Stage::battle).count() != 15
                    || choice.previewRewards().stream().anyMatch(reward -> !validReward(reward))) {
                throw new IllegalStateException("勇者试炼难度数据无效：" + id);
            }
            for (int index = 0; index < stages.size(); index++) {
                var stage = stages.get(index);
                if (stage.node() != index + 1 || (stage.type() != 1 && stage.type() != 2)
                        || stage.resetNode() < 1 || stage.resetNode() > stage.node()
                        || !stages.get(stage.resetNode() - 1).battle()
                        || stage.rewards().stream().anyMatch(reward -> !validReward(reward))) {
                    throw new IllegalStateException("勇者试炼地图节点无效：" + id + "/" + stage.node());
                }
            }
            routes.add(stages);
        }
        this.routes = List.copyOf(routes);
    }

    /** 决定是否为可交易、可展示的真实奖励。 */
    private static boolean validReward(Reward reward) {
        return reward != null && reward.itemId() > 0 && reward.quantity() > 0;
    }

    /** 提供同一份已验证规则，供资格、展示和奖励同时使用。 */
    Config config() {
        return config;
    }

    /** 读取已验证难度的完整路线，节点仍按原地图顺序。 */
    List<Stage> stages(int difficulty) {
        return routes.get(difficulty - 1);
    }

    /** 读取有效地图格，用于校验当前战斗或箱子。 */
    Stage stage(int difficulty, int node) {
        return stages(difficulty).get(node - 1);
    }

    /** 返回该档当前服务器已开放与否，和角色自身的通关与战力要求分开。 */
    boolean combatReady(int difficulty) {
        return difficulty > 0 && difficulty <= MAX_OPEN_DIFFICULTY;
    }

    /** 先从区间内至多 200 名机器人抽选，找不到时沿旧表先找高于上界、再找低于下界。 */
    Robot pickRobot(long lower, long upper, RandomGenerator random) {
        var pool = config.robots().stream().filter(robot -> robot.power() >= lower && robot.power() <= upper)
                .limit(200).toList();
        if (!pool.isEmpty()) {
            return pool.get(random.nextInt(pool.size()));
        }
        return config.robots().stream().filter(robot -> robot.power() > upper).findFirst().orElseGet(() ->
                config.robots().stream().filter(robot -> robot.power() < lower).findFirst().orElseThrow());
    }
}
