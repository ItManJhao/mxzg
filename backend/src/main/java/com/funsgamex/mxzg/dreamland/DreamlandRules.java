/**
 * 永恒梦境静态规则、关卡、奖励和增益读取。导出器负责从旧表生成资源，
 * 此处验证运行所需数据并决定当前连续开放的关卡范围。
 */
package com.funsgamex.mxzg.dreamland;

import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.ConfiguredEnemy;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.TreeMap;
import java.util.random.RandomGenerator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class DreamlandRules {
    /** 当前已接入的连续守军和回放范围，新增楼层完成实际战斗复验后才可扩展。 */
    private static final int MAX_OPEN_FLOOR = 6;
    /** 原规则包含完整配置；开放范围由本次已验证的连续楼层决定。 */
    private final Config config;
    /** 当前区服可战斗的最后一层，必须落在同一份完整规则内。 */
    private final int maxFloor;

    /** 每层保存旧守军和当天首次达成时使用的两份奖励。 */
    record Stage(int floor, List<Reward> standardRewards, List<Reward> afterRewards, List<ConfiguredEnemy> enemies) {}

    /** category 用于分组抽选，value 为万分比或对应属性编号的原表值。 */
    record Buff(int id, int category, int attributeId, long value, int addType, int weight, String icon,
                int titleLanguageId, int battleLanguageId, String title, String battleTitle) {}

    /** 里程碑标识沿用原楼层键，达成后按旧顺序领取。 */
    record Milestone(int floor, List<Reward> rewards) {}

    /** 原榜单名次的闭区间奖励。 */
    record RankReward(int id, int minRank, int maxRank, List<Reward> rewards) {}

    /** 与导出器共用的配置契约，时间字段以秒为单位。 */
    record Config(int schemaVersion, int minimumLevel, int battleRounds, int formationType, String map,
                  int battleFrequencySeconds, int buffAutoSeconds, int resetFloorCount, int standardRewardFloorCount,
                  int buffInterval, int assistPowerRatio, List<Reward> assistDispatchRewards, List<Stage> stages,
                  List<Buff> buffs, List<Milestone> milestones, List<RankReward> rankRewards) {}

    /** 加载并核对原规则；配置缺层、增益组错误或无效开放范围时拒绝装配。 */
    public DreamlandRules(ObjectMapper mapper, @Value("${mxzg.dreamland.max-floor:6}") int maxFloor) {
        try (var input = DreamlandRules.class.getResourceAsStream("/gameplay/dreamland-rules.json")) {
            if (input == null) {
                throw new IllegalStateException("缺少永恒梦境配置");
            }
            config = mapper.readValue(input, Config.class);
        } catch (IOException failure) {
            throw new IllegalStateException("无法读取永恒梦境配置", failure);
        }
        this.maxFloor = maxFloor;
        if (config.schemaVersion() != 1 || config.minimumLevel() <= 0 || config.battleRounds() != 10
                || config.formationType() <= 0 || config.map().isBlank()
                || config.battleFrequencySeconds() <= 0 || config.buffAutoSeconds() <= 0
                || config.resetFloorCount() <= 0 || config.standardRewardFloorCount() <= 0 || config.buffInterval() <= 0
                || maxFloor < 1 || maxFloor > MAX_OPEN_FLOOR || maxFloor > config.stages().size()) {
            throw new IllegalStateException("永恒梦境开放配置无效");
        }
        validateStages();
        validateBuffsAndMilestones();
    }

    /** 读取验证后的原玩法规则，供进度和发奖共同使用。 */
    Config config() {
        return config;
    }

    /** 返回当前连续开放上限；当前配置之外的楼层不会进入战斗。 */
    int maxFloor() {
        return maxFloor;
    }

    /** 由调用方校验开放范围，读取楼层的原守军和奖励。 */
    Stage stage(int floor) {
        return config.stages().get(floor - 1);
    }

    /** 按权重从原表的各分类抽取一档，稳定保留各分类的排列顺序。 */
    List<Integer> chooseBuffs(RandomGenerator random) {
        var groups = new TreeMap<Integer, List<Buff>>();
        for (var buff : config.buffs()) {
            groups.computeIfAbsent(buff.category(), category -> new ArrayList<>()).add(buff);
        }
        return groups.values().stream().map(group -> chooseBuff(group, random)).toList();
    }

    /** 已选增益的编号应来自已持久化的候选，配置消失时不得替换其效果。 */
    Buff buff(int id) {
        return config.buffs().stream().filter(row -> row.id() == id).findFirst()
                .orElseThrow(() -> new IllegalStateException("永恒梦境增益不存在：" + id));
    }

    /** 验证完整数据连续性，当前开放楼层不能含尚未支持的守军装备或符文。 */
    private void validateStages() {
        int expectedFloor = 1;
        for (var stage : config.stages()) {
            var positions = new HashSet<Integer>();
            if (stage.floor() != expectedFloor++ || stage.enemies().size() != 6
                    || stage.enemies().stream().anyMatch(enemy -> enemy.template() <= 0 || enemy.level() <= 0
                        || enemy.position() < 1 || enemy.position() > 8 || !positions.add(enemy.position()))) {
                throw new IllegalStateException("永恒梦境关卡配置无效：" + stage.floor());
            }
            if (stage.floor() <= maxFloor && stage.enemies().stream().anyMatch(enemy ->
                    !"[]".equals(enemy.equipment()) || !"[]".equals(enemy.runes()))) {
                throw new IllegalStateException("永恒梦境开放关卡含未恢复的守军装备或符文：" + stage.floor());
            }
        }
    }

    /** 三个独立分类及有序里程碑属于旧规则，缺项不能用默认数据替代。 */
    private void validateBuffsAndMilestones() {
        var categories = new HashSet<Integer>();
        var ids = new HashSet<Integer>();
        for (var buff : config.buffs()) {
            if (buff.id() <= 0 || !ids.add(buff.id()) || buff.category() <= 0 || buff.weight() <= 0
                    || buff.attributeId() <= 0 || buff.value() <= 0 || buff.addType() < 0 || buff.addType() > 1
                    || buff.title().isBlank() || buff.battleTitle().isBlank()) {
                throw new IllegalStateException("永恒梦境增益配置无效：" + buff.id());
            }
            categories.add(buff.category());
        }
        if (categories.size() != 3 || config.milestones().isEmpty()) {
            throw new IllegalStateException("永恒梦境增益类别或阶段奖励缺失");
        }
        int previous = 0;
        for (var milestone : config.milestones()) {
            if (milestone.floor() <= previous || milestone.floor() > config.stages().size()
                    || milestone.rewards().isEmpty()) {
                throw new IllegalStateException("永恒梦境阶段奖励配置无效：" + milestone.floor());
            }
            previous = milestone.floor();
        }
    }

    /** 单一类别按原权重抽签，累计权重归零的位置即候选。 */
    private static int chooseBuff(List<Buff> group, RandomGenerator random) {
        int value = random.nextInt(group.stream().mapToInt(Buff::weight).sum());
        for (var buff : group) {
            value -= buff.weight();
            if (value < 0) {
                return buff.id();
            }
        }
        throw new IllegalStateException("永恒梦境增益权重无效");
    }
}
