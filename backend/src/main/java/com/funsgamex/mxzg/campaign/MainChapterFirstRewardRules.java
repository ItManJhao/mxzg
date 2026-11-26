/**
 * 原 firstrewardchapter 独立奖励目录。按绝对通关目标查询，筛除当前无法完整发放的整项计划。
 * 由主线状态和领取服务共用，保留同一个资格规则，不开放关卡或改动里程碑。
 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.reward.RewardGrantService;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class MainChapterFirstRewardRules {
    /** 以全局关卡号为键的服务端可完整发放目录，不按源表行号领。 */
    private final Map<Integer, Plan> supported;

    /** 单个关卡的发奖内容及原策划领奖公告标记。 */
    public record Plan(List<RewardGrantService.Reward> rewards, boolean announce) {}

    /** 解析同源奖励表、目标和公告标记；无法完整发放的计划暂不开放。 */
    public MainChapterFirstRewardRules(ObjectMapper mapper, MainChapterRules chapters, RewardGrantService grants) {
        var rewards = new TreeMap<Integer, Plan>();
        var targets = new HashSet<Integer>();
        try (var source = getClass().getResourceAsStream("/gameplay/firstrewardchapter.json")) {
            if (source == null) {
                throw new IllegalStateException("缺少独立通关奖励配置");
            }
            var rows = mapper.readTree(source).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("独立通关奖励配置为空");
            }
            for (var row : rows) {
                int chapter = positiveInt(row.path("chapter"));
                chapters.stage(chapter);
                if (!targets.add(chapter)) {
                    throw new IllegalStateException("独立通关奖励目标重复：" + chapter);
                }
                var plan = readPlan(mapper, row, chapter);
                try {
                    grants.requireSupported(plan.stream().map(RewardGrantService.Reward::itemId).toList());
                } catch (IllegalArgumentException unsupported) {
                    // 未恢复奖励不伪造，不删除其中不支持的单项再开放领取。
                    continue;
                }
                rewards.put(chapter, new Plan(plan, row.path("is_notice").asInt() == 1));
            }
        } catch (IOException error) {
            throw new IllegalStateException("无法读取独立通关奖励配置", error);
        }
        supported = Map.copyOf(rewards);
    }

    /** 只返回当前开放关卡且可全量发放的原计划；null 表示该项未开放或该关无独立奖励。 */
    public Plan plan(int chapter, int challengeLimit) {
        return chapter <= challengeLimit ? supported.get(chapter) : null;
    }

    /** 将数据库真实已领与当前达成条件合并为权威进度，不在界面或登录阶段补领。 */
    public MainChapterService.FirstRewardProgress progress(int maxCleared, int challengeLimit, List<Integer> claimed) {
        var claimedSet = new HashSet<>(claimed);
        var eligible = supported.keySet().stream()
                .filter(chapter -> chapter <= maxCleared && chapter <= challengeLimit && !claimedSet.contains(chapter))
                .sorted().toList();
        return new MainChapterService.FirstRewardProgress(1, claimed, eligible);
    }

    /** 只接受结构明确的正数量发奖计划，保留旧配置中的发奖顺序。 */
    private static List<RewardGrantService.Reward> readPlan(ObjectMapper mapper, JsonNode row, int chapter) {
        var entries = mapper.readTree(row.path("reward").asString());
        if (entries == null || !entries.isArray() || entries.isEmpty()) {
            throw new IllegalStateException("独立通关奖励内容为空：" + chapter);
        }
        var plan = new ArrayList<RewardGrantService.Reward>();
        for (var entry : entries) {
            plan.add(new RewardGrantService.Reward(positiveInt(entry.path("item_type")),
                    positiveInt(entry.path("item_num"))));
        }
        return List.copyOf(plan);
    }

    /** 策划表必须使用正整数，拒绝小数、缺失和字符串转数值。 */
    private static int positiveInt(JsonNode value) {
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() <= 0) {
            throw new IllegalStateException("独立通关奖励配置整数无效");
        }
        return value.asInt();
    }
}
