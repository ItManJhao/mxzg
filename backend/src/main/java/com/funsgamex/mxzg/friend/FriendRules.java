/** 好友容量、自然日次数和赠领奖励均从同源 system 表读取。 */
package com.funsgamex.mxzg.friend;

import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
final class FriendRules {
    /** 原配置中的友情点道具。 */
    static final int FRIENDSHIP_ITEM_ID = 900301;
    /** 批量赠送时超过七天未登录的好友占当日赠送次数，但不获得礼物。 */
    static final long INACTIVE_SECONDS = 7 * 86_400L;
    /** 好友与黑名单分别使用各自的策划上限。 */
    final int friendLimit;
    final int blockLimit;
    /** 单角色每日送礼和领取完整礼包的次数上限。 */
    final int sendLimit;
    final int receiveLimit;
    /** 空关键词返回的在线推荐上限。 */
    final int recommendationLimit;
    /** 每次实际送达好友、正常领取及超额领取对应的策划发奖列表。 */
    final List<Reward> sendRewards;
    final List<Reward> receiveRewards;
    final List<Reward> excessRewards;

    /** 启动时校验相关策划行，玩法运行时只读取不可变值。 */
    FriendRules(ObjectMapper mapper) {
        try (var input = FriendRules.class.getResourceAsStream("/gameplay/system.json")) {
            if (input == null) {
                throw new IllegalStateException("好友配置文件缺失");
            }
            Map<String, JsonNode> values = new HashMap<>();
            mapper.readTree(input).path("rows").forEach(row -> values.put(row.path("key").asString(), row.path("value")));
            friendLimit = positive(values, "global_friend_max");
            blockLimit = positive(values, "blacklist_max_num");
            sendLimit = positive(values, "friend_reward_send_limit");
            receiveLimit = positive(values, "friend_reward_receive_limit");
            recommendationLimit = positive(values, "friend_recommend_count");
            sendRewards = rewards(mapper, values, "friend_gift_send_reward");
            receiveRewards = rewards(mapper, values, "friend_gift_receive_reward");
            excessRewards = rewards(mapper, values, "friend_gift_receive_over_reward");
        } catch (IOException error) {
            throw new IllegalStateException("读取好友配置失败", error);
        }
    }

    /** 正数上限为玩法不变量，缺行或配置错误时立即停止装配。 */
    private static int positive(Map<String, JsonNode> values, String key) {
        int value = setting(values, key).asInt(0);
        if (value < 1 || value > 1_000) {
            throw new IllegalStateException("好友数量配置无效：" + key);
        }
        return value;
    }

    /** 将原表 JSON 文本转成通用发奖数据，禁止空礼包与无效数量。 */
    private static List<Reward> rewards(ObjectMapper mapper, Map<String, JsonNode> values, String key) {
        var rows = mapper.readTree(setting(values, key).asString());
        var result = rows.valueStream().map(row -> new Reward(row.path("item_type").asInt(), row.path("item_num").asLong())).toList();
        if (!rows.isArray() || result.isEmpty() || result.stream().anyMatch(row -> row.itemId() <= 0 || row.quantity() <= 0)) {
            throw new IllegalStateException("好友礼包配置无效：" + key);
        }
        return result;
    }

    /** 返回同源配置，缺失时给出行名。 */
    private static JsonNode setting(Map<String, JsonNode> values, String key) {
        JsonNode value = values.get(key);
        if (value == null) {
            throw new IllegalStateException("好友配置缺少：" + key);
        }
        return value;
    }
}
