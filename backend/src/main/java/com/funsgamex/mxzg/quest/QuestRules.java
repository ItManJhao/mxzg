/**
 * 每日任务、日活跃宝箱和成就链的原策划规则。
 * 服务启动时校验配置；所有角色共享同一份不可变规则，进度和领取由 QuestService 负责。
 */
package com.funsgamex.mxzg.quest;

import com.funsgamex.mxzg.quest.QuestRepository.MetricKey;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import java.io.IOException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
final class QuestRules {
    /** 日常成就入口等级、任务及宝箱原表。 */
    private final Configuration config;
    /** 记录每个有后续成就的前置编号，最终档领取后仍可查看。 */
    private final Set<Integer> predecessors;

    /**
     * 日任务或成就配置。condition 对应旧计数类型的可选条件；previousId 为 0 表示首档。
     * requiredLevel、points 仅在每日任务使用，零值表示不额外限制等级或发放活跃分。
     */
    record Task(int id, QuestMetric metric, int condition, long target, String title, String destination,
                int requiredLevel, int points, int previousId, List<Reward> rewards) {
        /** 冻结该档固定奖励，以便预览和发奖使用同一份原表。 */
        Task {
            rewards = List.copyOf(rewards);
        }
    }

    /** 玩家单日活跃累计达到 points 时可领的宝箱。 */
    record Milestone(int id, int points, List<Reward> rewards) {
        /** 冻结宝箱对应的原配置奖励。 */
        Milestone {
            rewards = List.copyOf(rewards);
        }
    }

    /** 等级门槛和原表的三个有序分组。 */
    record Configuration(int requiredLevel, List<Task> daily, List<Task> achievements, List<Milestone> milestones) {
        /** 复制分组以便数据库和网络服务共用读取。 */
        Configuration {
            daily = List.copyOf(daily);
            achievements = List.copyOf(achievements);
            milestones = List.copyOf(milestones);
        }
    }

    /** 读取原表配置并检查编号、奖励和成就前置链。 */
    QuestRules(ObjectMapper mapper) {
        try (var source = QuestRules.class.getResourceAsStream("/gameplay/quest-rules.json")) {
            if (source == null) {
                throw new IllegalStateException("日常成就配置缺失");
            }
            config = mapper.readValue(source, Configuration.class);
        } catch (IOException failure) {
            throw new IllegalStateException("日常成就配置读取失败", failure);
        }
        if (config.requiredLevel() <= 0 || config.daily().isEmpty() || config.achievements().isEmpty()
                || config.milestones().isEmpty()) {
            throw new IllegalStateException("日常成就配置不完整");
        }
        Map<Integer, Task> allAchievements = new HashMap<>();
        Set<Integer> next = new HashSet<>();
        for (Task achievement : config.achievements()) {
            validateTask(achievement);
            if (achievement.points() != 0 || achievement.requiredLevel() != 0
                    || allAchievements.put(achievement.id(), achievement) != null) {
                throw new IllegalStateException("成就配置不合法：" + achievement.id());
            }
            if (achievement.previousId() > 0) {
                next.add(achievement.previousId());
            }
        }
        for (Task achievement : config.achievements()) {
            validateChain(achievement, allAchievements);
        }
        Set<Integer> daily = new HashSet<>();
        for (Task task : config.daily()) {
            validateTask(task);
            if (task.previousId() != 0 || task.requiredLevel() <= 0 || task.points() <= 0
                    || !daily.add(task.id())) {
                throw new IllegalStateException("每日任务配置不合法：" + task.id());
            }
        }
        Set<Integer> milestoneIds = new HashSet<>();
        Set<Integer> thresholds = new HashSet<>();
        for (Milestone milestone : config.milestones()) {
            if (milestone.id() <= 0 || milestone.points() <= 0 || !validRewards(milestone.rewards())
                    || !milestoneIds.add(milestone.id()) || !thresholds.add(milestone.points())) {
                throw new IllegalStateException("日活跃宝箱配置不合法：" + milestone.id());
            }
        }
        predecessors = Set.copyOf(next);
    }

    /** 取得已经验证的规则供任务服务投影。 */
    Configuration config() {
        return config;
    }

    /** 返回任务是否还有后续档，前端据此显示首个活动任务或已领取的最后一档。 */
    boolean hasSuccessor(int id) {
        return predecessors.contains(id);
    }

    /** 取得原计数定义，星级、品质等按配置条件精确匹配。 */
    Set<MetricKey> keys(List<Task> tasks) {
        return tasks.stream().map(task -> new MetricKey(task.metric(), task.condition()))
                .collect(Collectors.toUnmodifiableSet());
    }

    /** 检查所有任务共用的基础字段，不接受解析失败的名称、类型或奖励。 */
    private static void validateTask(Task task) {
        if (task.id() <= 0 || task.metric() == null || task.condition() < 0 || task.target() <= 0
                || task.title() == null || task.title().isBlank() || task.destination() == null
                || task.previousId() < 0 || !validRewards(task.rewards())) {
            throw new IllegalStateException("日常成就任务配置不合法：" + task.id());
        }
    }

    /** 检查前置编号存在且终止，异常时拒绝启动，避免给玩家留下不可领取的链。 */
    private static void validateChain(Task task, Map<Integer, Task> index) {
        Set<Integer> path = new HashSet<>();
        while (task.previousId() > 0) {
            if (!path.add(task.id()) || !index.containsKey(task.previousId())) {
                throw new IllegalStateException("成就前置链无效：" + task.id());
            }
            task = index.get(task.previousId());
        }
    }

    /** 原配置每档必须存在实际正奖励。 */
    private static boolean validRewards(List<Reward> rewards) {
        return !rewards.isEmpty() && rewards.stream().allMatch(reward -> reward.itemId() > 0 && reward.quantity() > 0);
    }
}
