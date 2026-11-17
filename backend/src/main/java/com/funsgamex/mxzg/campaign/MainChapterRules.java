/**
 * 同源完整主线目录及挑战与结算规则，依据旧BattleHandler的3001/3002流程。
 * 读取同源关卡表，区分已通关与待领奖；只计算决策，不发奖、不写库、不开放网络入口。
 */
package com.funsgamex.mxzg.campaign;

import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public final class MainChapterRules {
    /** 服务端可信的新挑战上限；仅限制新挑战，不能阻止历史待结算和回执恢复。 */
    private final int challengeLimit;
    /** 全局关卡索引对应门槛、敌方定位和首通奖励，不包含挂机收益。 */
    private final Map<Integer, Stage> stages;
    /** 旧模式/章节/小关对应的原全局记录；原表重复定位保留，不擅自选择其中一关。 */
    private final Map<StageKey, List<Stage>> locations;
    /** 全局关卡对应的有效敌人，保持原配置顺序；空模板占位不生成战斗单位。 */
    private final Map<Integer, List<Enemy>> enemies;
    /** 同源章节语言名称，构建时读取；用于开战时冻结敌方名称，不随回看重新查表。 */
    private final Map<Integer, String> chapterNames = new HashMap<>();

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

    /** 原表敌方定位；后段奖励关可能共用此定位，真正进度身份始终使用全局idx。 */
    public record StageKey(int mode, int chapter, int mission) {}

    /** 怪物原始属性修正，kind沿旧固定值/比例语义，不能预先合并而改变截断顺序。 */
    public record Modifier(int type, int kind, long value) {}

    /** 同源敌人配置；装备/符文保留原数组文本，构建器必须明确预检而不能默默忽略。 */
    public record Enemy(int configId, int position, int template, int level, int star,
                        List<Modifier> modifiers, String equipment, String runes) {
        /** 冻结属性顺序，调用方不能改变目录或下一场输入。 */
        public Enemy {
            modifiers = List.copyOf(modifiers);
        }
    }

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

    /** 使用已接通的连续九关默认范围；完整目录存在不表示其余关卡已开放。 */
    public MainChapterRules(ObjectMapper mapper) {
        this(mapper, 9);
    }

    /** 装配完整目录与独立新挑战范围；坏索引/内容明确失败，源表重复定位保留并标待确认。 */
    @Autowired
    public MainChapterRules(ObjectMapper mapper,
            @Value("${mxzg.main-chapter.challenge-limit:9}") int challengeLimit) {
        var result = new HashMap<Integer, Stage>();
        var byLocation = new HashMap<StageKey, List<Stage>>();
        var language = new HashMap<String, String>();
        for (var row : rows(mapper, "language")) {
            language.put(row.path("key").asString(), row.path("value").asString());
        }
        for (var row : rows(mapper, "chapterreward")) {
            int index = integer(row, "idx");
            int mode = integer(row, "mode_id");
            int chapter = integer(row, "chapter_id");
            int mission = integer(row, "mission_id");
            int level = integer(row, "level");
            long power = number(row, "combat_effectiveness");
            tavernLimits.put(index, number(row, "tavern_point_max"));
            if (index < 1 || mode < 1 || chapter < 1 || mission < 1 || level < 1) {
                throw new IllegalStateException("主线关卡定位或门槛无效：" + index);
            }
            String name = language.get(Integer.toString(43100 + chapter));
            if (name == null || name.isBlank()) {
                throw new IllegalStateException("主线章节语言缺失：" + chapter);
            }
            chapterNames.put(chapter, name);
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
            var stage = new Stage(index, mode, chapter, mission, level, power, rewards);
            if (result.put(index, stage) != null) {
                throw new IllegalStateException("重复主线关卡：" + index);
            }
            byLocation.computeIfAbsent(new StageKey(mode, chapter, mission), key -> new ArrayList<>()).add(stage);
        }
        for (int index = 1; index <= result.size(); index++) {
            if (!result.containsKey(index)) {
                throw new IllegalStateException("主线配置缺失：" + index);
            }
        }
        if (challengeLimit < 1 || challengeLimit > result.size()) {
            throw new IllegalStateException("主线新挑战上限不在同源目录中：" + challengeLimit);
        }
        this.challengeLimit = challengeLimit;
        stages = Map.copyOf(result);
        var frozenLocations = new HashMap<StageKey, List<Stage>>();
        byLocation.forEach((key, value) -> frozenLocations.put(key, List.copyOf(value)));
        locations = Map.copyOf(frozenLocations);
        enemies = readEnemies(mapper);
    }

    /** 返回完整目录中的一关；配置可读不代表新挑战已获开放或战斗依赖已全部支持。 */
    public Stage stage(int index) {
        var value = stages.get(index);
        if (value == null) {
            throw new IllegalArgumentException("主线全局关卡配置不存在：" + index);
        }
        return value;
    }

    /** 根据旧三维定位取得唯一全局关卡；后段重复定位明确拒绝，调用方须使用已知全局idx。 */
    public Stage stage(int mode, int chapter, int mission) {
        var values = locations.get(new StageKey(mode, chapter, mission));
        if (values == null) {
            throw new IllegalArgumentException("主线模式/章节/小关配置不存在");
        }
        if (values.size() != 1) {
            throw new IllegalArgumentException("主线模式/章节/小关定位不唯一，须使用全局关卡索引");
        }
        return values.getFirst();
    }

    /** 只读完整目录，按全局索引排序，供依赖扫描；不会扩大新挑战范围。 */
    public List<Stage> catalog() {
        return stages.values().stream().sorted(Comparator.comparingInt(Stage::index)).toList();
    }

    /** 返回原顺序的有效敌人；调用方仍须检查装备、符文、技能等运行依赖。 */
    public List<Enemy> enemies(int index) {
        stage(index);
        return enemies.get(index);
    }

    /** 旧三维反查会命中前一奖励关的重复定位保留为待确认，不按note猜测应改成哪组敌人。 */
    public boolean enemyMappingPending(int index) {
        var stage = stage(index);
        return locations.get(new StageKey(stage.mode(), stage.chapter(), stage.mission())).getFirst().index() != index;
    }

    /** 当前可信配置只限制新挑战，历史状态可以高于此值。 */
    public int challengeLimit() {
        return challengeLimit;
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
        if (progress.maxCleared() >= challengeLimit) {
            throw new IllegalArgumentException("当前开放范围已通关");
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

    /** 按旧BattleHandler的章节语言43100+chapter与全局关卡序号生成本场敌方名。 */
    public String opponentName(int index) {
        var stage = stage(index);
        return chapterNames.get(stage.chapter()) + stage.index();
    }

    /** 发奖成功时清除待领奖，不再次推进关卡；必须与资产写入共同提交。 */
    public Progress settled(Progress progress) {
        if (progress.rewardPending()) {
            stage(progress.maxCleared());
        }
        return new Progress(progress.maxCleared(), false);
    }

    /** 关联旧三维敌方与奖励关；未被奖励引用的敌组保留给外部审计，不因未开放源歧义阻断默认范围。 */
    private Map<Integer, List<Enemy>> readEnemies(ObjectMapper mapper) {
        var result = new HashMap<Integer, List<Enemy>>();
        var seats = new HashSet<String>();
        var ids = new HashSet<Integer>();
        for (var row : rows(mapper, "chapter")) {
            int configId = integer(row, "idx");
            var location = new StageKey(integer(row, "mode_id"), integer(row, "chapter_id"), integer(row, "mission_id"));
            var matches = locations.get(location);
            if (matches == null) {
                matches = List.of();
            }
            int position = integer(row, "pos");
            if (!ids.add(configId) || configId < 1 || position < 1 || position > 8
                    || !seats.add(location + ":" + position)) {
                throw new IllegalStateException("主线敌方行号或站位重复/无效：" + configId);
            }
            int template = integer(row, "hero_type");
            if (template == 0) {
                continue;
            }
            int level = integer(row, "hero_level");
            int star = integer(row, "hero_star");
            if (level < 1 || star < 1) {
                throw new IllegalStateException("主线敌方等级或星级无效：" + configId);
            }
            var modifiers = new ArrayList<Modifier>();
            for (var modifier : array(mapper, row, "attr")) {
                int type = integer(modifier, "type");
                int kind = integer(modifier, "kind");
                if (type < 1 || (kind != 1 && kind != 2)) {
                    throw new IllegalStateException("主线敌方属性修正无效：" + configId);
                }
                modifiers.add(new Modifier(type, kind, number(modifier, "value")));
            }
            array(mapper, row, "equipment");
            array(mapper, row, "runes");
            for (var stage : matches) {
                result.computeIfAbsent(stage.index(), key -> new ArrayList<>()).add(new Enemy(configId,
                    position, template, level, star, modifiers, row.path("equipment").asString(), row.path("runes").asString()));
            }
        }
        var frozen = new HashMap<Integer, List<Enemy>>();
        for (var stage : catalog()) {
            var values = result.get(stage.index());
            if (values == null || values.isEmpty()) {
                throw new IllegalStateException("主线敌方配置为空：" + stage.index());
            }
            frozen.put(stage.index(), List.copyOf(values));
        }
        return Map.copyOf(frozen);
    }

    /** 原表数组使用字符串存储；拒绝缺字段、坏JSON及非数组，不把它们解释为空依赖。 */
    private static JsonNode array(ObjectMapper mapper, JsonNode row, String key) {
        if (!row.path(key).isString()) {
            throw new IllegalStateException("主线数组配置不是字符串：" + key);
        }
        var value = mapper.readTree(row.path(key).asString());
        if (value == null || !value.isArray()) {
            throw new IllegalStateException("主线数组配置无效：" + key);
        }
        return value;
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
