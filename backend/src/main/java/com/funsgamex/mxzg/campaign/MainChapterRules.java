/**
 * 原主线前三关挑战与结算规则，依据旧BattleHandler的3001/3002流程。
 * 读取同源关卡表，区分已通关与待领奖；只计算决策，不发奖、不写库、不开放网络入口。
 */
package com.funsgamex.mxzg.campaign;

import java.util.*;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public final class MainChapterRules {
    /** 当前已验证的连续关卡范围；配置存在不等于战斗已支持。 */
    private static final int LAST_SUPPORTED = 3;
    /** 全局关卡索引对应门槛、敌方定位和首通奖励，不包含挂机收益。 */
    private final Map<Integer, Stage> stages;

    /** 已通关关卡对应的酒馆冒险点上限，独立于普通物品数量。 */
    private final Map<Integer, Long> tavernLimits = new HashMap<>();

    /** 原章表定位与门槛，奖励保持原表顺序和数量。 */
    public record Stage(int index, int mode, int chapter, int mission, int requiredLevel,
                        long requiredPower, List<Reward> firstRewards) {
        /** 防止调用者修改配置奖励。 */
        public Stage {
            firstRewards = List.copyOf(firstRewards);
        }
    }

    /** 服务器配置的物品类型和数量；特殊资源由后续事务分发。 */
    public record Reward(int itemId, long quantity) {}

    /** 与旧chapterId/receiveReward同义；不是早期stage_id的下一关语义。 */
    public record Progress(int maxCleared, boolean rewardPending) {
        /** 损坏进度拒绝使用，不自动归零。 */
        public Progress {
            if (maxCleared < 0 || (maxCleared == 0 && rewardPending)) {
                throw new IllegalArgumentException("主线通关与待领奖状态不一致");
            }
        }
    }

    /** 旧挑战遇到待领奖时仅补结算，本次不再开始新战斗。 */
    public enum Action { CHALLENGE, SETTLE_PENDING }
    /** 决策携带本次处理的关卡，补领奖不能继续生成下一场战报。 */
    public record Decision(Action action, Stage stage) {}

    /** 从原始导出读取前三关并验证门槛和敌人定位，不沿用简化战斗投影。 */
    public MainChapterRules(ObjectMapper mapper) {
        var result = new HashMap<Integer, Stage>();
        var enemies = rows(mapper, "chapter");
        for (var row : rows(mapper, "chapterreward")) {
            int index = integer(row, "idx");
            if (index < 1 || index > LAST_SUPPORTED) {
                continue;
            }
            int mode = integer(row, "mode_id");
            int chapter = integer(row, "chapter_id");
            int mission = integer(row, "mission_id");
            int level = integer(row, "level");
            long power = number(row, "combat_effectiveness");
            tavernLimits.put(index, number(row, "tavern_point_max"));
            if (mode != 1 || chapter != 1 || mission != index || level < 1) {
                throw new IllegalStateException("前三关配置与已支持战场不一致：" + index);
            }
            boolean hasEnemy = false;
            for (var enemy : enemies) {
                if (integer(enemy, "mode_id") == mode && integer(enemy, "chapter_id") == chapter
                        && integer(enemy, "mission_id") == mission && integer(enemy, "hero_type") > 0) {
                    hasEnemy = true;
                }
            }
            if (!hasEnemy) {
                throw new IllegalStateException("主线敌方配置为空：" + index);
            }
            var rewards = new ArrayList<Reward>();
            var rewardRows = mapper.readTree(row.path("first_reward").asString());
            if (rewardRows == null || !rewardRows.isArray() || rewardRows.isEmpty()) {
                throw new IllegalStateException("主线通关奖励无效：" + index);
            }
            for (var reward : rewardRows) {
                int id = integer(reward, "item_type");
                long quantity = number(reward, "item_num");
                if (id < 1 || quantity < 1) {
                    throw new IllegalStateException("主线奖励无效：" + index);
                }
                rewards.add(new Reward(id, quantity));
            }
            if (result.put(index, new Stage(index, mode, chapter, mission, level, power, rewards)) != null) {
                throw new IllegalStateException("重复主线关卡：" + index);
            }
        }
        for (int index = 1; index <= LAST_SUPPORTED; index++) {
            if (!result.containsKey(index)) {
                throw new IllegalStateException("主线配置缺失：" + index);
            }
        }
        stages = Map.copyOf(result);
    }

    /** 只返回已支持关卡；后续关卡不回退为简化普攻。 */
    public Stage stage(int index) {
        var value = stages.get(index);
        if (value == null) {
            throw new IllegalArgumentException("主线当前仅支持前三关：" + index);
        }
        return value;
    }

    /** 旧TavernProcessor未通关时用第一关，否则按已通关关卡封顶；不按下一关取上限。 */
    public long tavernLimit(int maxCleared) {
        int index = maxCleared == 0 ? 1 : maxCleared;
        stage(index);
        return tavernLimits.get(index);
    }

    /**
     * 按已通关进度选择下一关，待领奖优先于门槛检查，沿旧3001顺序。
     * level/power须来自服务端权威角色，不能使用客户端上报或猜测的战力。
     */
    public Decision decide(Progress progress, int level, long power) {
        if (progress.rewardPending()) {
            return new Decision(Action.SETTLE_PENDING, stage(progress.maxCleared()));
        }
        var next = stage(Math.addExact(progress.maxCleared(), 1));
        if (power < next.requiredPower()) {
            throw new IllegalArgumentException("角色战力不足");
        }
        if (level < next.requiredLevel()) {
            throw new IllegalArgumentException("角色等级不足");
        }
        return new Decision(Action.CHALLENGE, next);
    }

    /** 服务端胜利立即推进并留下待领奖，失败不变；请求去重由后续持久事务承担。 */
    public Progress complete(Progress before, int challengedIndex, boolean won) {
        stage(challengedIndex);
        if (before.rewardPending() || challengedIndex != before.maxCleared() + 1) {
            throw new IllegalArgumentException("战报关卡与当前主线状态不一致");
        }
        return won ? new Progress(challengedIndex, true) : before;
    }

    /** 返回待领关卡的first_reward；无待领奖沿旧3002空操作，不凭客户端关卡发奖。 */
    public List<Reward> pendingRewards(Progress progress) {
        return progress.rewardPending() ? stage(progress.maxCleared()).firstRewards() : List.of();
    }

    /** 发奖成功时清除待领奖，不再次推进关卡；必须与资产写入共同提交。 */
    public Progress settled(Progress progress) {
        if (progress.rewardPending()) {
            stage(progress.maxCleared());
        }
        return new Progress(progress.maxCleared(), false);
    }

    /** 读取构建时打包的同源表，缺表或非数组阻止启动。 */
    private static JsonNode rows(ObjectMapper mapper, String table) {
        try (var input = MainChapterRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input == null) {
                throw new IllegalStateException("主线配置缺失：" + table);
            }
            var result = mapper.readTree(input).path("rows");
            if (!result.isArray() || result.isEmpty()) {
                throw new IllegalStateException("主线配置为空：" + table);
            }
            return result;
        } catch (java.io.IOException error) {
            throw new IllegalStateException("读取主线配置失败：" + table, error);
        }
    }

    /** 严格转换配置整数，拒绝溢出。 */
    private static int integer(JsonNode row, String key) {
        return Math.toIntExact(number(row, key));
    }

    /** 缺失字段和字符串不能隐式转换为零。 */
    private static long number(JsonNode row, String key) {
        var value = row.path(key);
        if (!value.isIntegralNumber() || !value.canConvertToLong() || value.asLong() < 0) {
            throw new IllegalStateException("主线配置字段无效：" + key);
        }
        return value.asLong();
    }
}
