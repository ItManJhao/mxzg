/**
 * 原chapterextrareward里程碑目录，按配置ID读取绝对通关目标及原奖励顺序。
 * 领取服务用本规则校验资格和冻结计划；目录本身不开放关卡、不推断已领、不写资产。
 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.reward.RewardGrantService;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public final class MainChapterMilestoneRules {
    /** 同源完整配置ID目录，顺序不是服务端领取顺序限制。 */
    private final Map<Integer, Entry> entries;
    /** 完整原配置内容摘要，成功回执保存本次版本，不按新配置重算旧奖励。 */
    private final String version;

    /** 单项原始里程碑；targetChapter是全局已通关idx，不能用章节内小关或列表序号替代。 */
    public record Entry(int rewardId, int targetChapter, List<RewardGrantService.Reward> rewards) {
        /** 冻结同源奖励顺序与数量。 */
        public Entry {
            rewards = List.copyOf(rewards);
        }
    }

    /** 读取原六项目录并对照主线目录验证目标；缺配置或重复ID明确拒绝。 */
    public MainChapterMilestoneRules(ObjectMapper mapper, MainChapterRules chapters) {
        try (var input = getClass().getResourceAsStream("/gameplay/chapterextrareward.json")) {
            if (input == null) {
                throw new IllegalStateException("主线里程碑配置缺失");
            }
            byte[] source = input.readAllBytes();
            version = "chapter-milestone-v1:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(source));
            var rows = mapper.readTree(source).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("主线里程碑目录为空");
            }
            var values = new TreeMap<Integer, Entry>();
            for (var row : rows) {
                int id = positive(row.path("idx"));
                int target = positive(row.path("chapter"));
                chapters.stage(target);
                var rewards = new ArrayList<RewardGrantService.Reward>();
                var rewardRows = mapper.readTree(row.path("reward").asString());
                if (!rewardRows.isArray() || rewardRows.isEmpty()) {
                    throw new IllegalStateException("里程碑奖励为空：" + id);
                }
                for (var reward : rewardRows) {
                    rewards.add(new RewardGrantService.Reward(positive(reward.path("item_type")),
                            positive(reward.path("item_num"))));
                }
                if (values.put(id, new Entry(id, target, rewards)) != null) {
                    throw new IllegalStateException("重复里程碑配置ID：" + id);
                }
            }
            entries = Map.copyOf(values);
        } catch (java.io.IOException | java.security.NoSuchAlgorithmException error) {
            throw new IllegalStateException("主线里程碑配置无法读取", error);
        }
    }

    /** 返回真实配置项，未知ID不能通过通关数猜测或按数组下标替代。 */
    public Entry require(int rewardId) {
        var entry = entries.get(rewardId);
        if (entry == null) {
            throw new IllegalArgumentException("里程碑配置不存在：" + rewardId);
        }
        return entry;
    }

    /** 返回完整配置版本，只用于新回执冻结。 */
    public String version() {
        return version;
    }

    /** 校验原表正整数，拒绝字符串、小数及Java整数范围外内容。 */
    private static int positive(tools.jackson.databind.JsonNode value) {
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() <= 0) {
            throw new IllegalStateException("里程碑配置正整数无效");
        }
        return value.asInt();
    }
}
