/**
 * 特权礼包期限和挂机加成配置：读取旧表，保留每条独立加成及Asia/Shanghai期限规则。
 * 供只读挂机输入和后续购买流程复用，不提供购买、发奖或持有状态写入接口。
 * 期限计算只给出候选秒数；实际权益仍以持久记录为准，不从库存物品或显示等级推断持有。
 */
package com.funsgamex.mxzg.privilege;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public final class PrivilegeGiftRules {
    /** 所有新版区服自然日的已确认时区，不使用部署机器默认时区。 */
    private static final ZoneId RESET_ZONE = ZoneId.of("Asia/Shanghai");
    /** 旧期限按一天86400秒计算，不复用期限物品的减1秒公式。 */
    private static final long DAY_SECONDS = 86400;
    /** 本批只读取这三种挂机效果，其他礼包玩法不因本类存在而开放。 */
    private static final Set<String> IDLE_EFFECTS = Set.of("IDLE_ROLE_EXP", "IDLE_GOLD", "IDLE_HERO_EXP");
    /** 配置ID到不可变期限/挂机条目，不保存角色持有状态。 */
    private final Map<Integer, Gift> gifts;
    /** 实际共享源表内容版本，供输入快照冻结，不是资产revision。 */
    private final String version;

    /** 一条礼包挂机加成，重复项保持原顺序，不提前合并。
     * @param itemId 原表资源配置ID
     * @param basisPoints 非负万分比，逐条作用于基础资源
     * @param effect 三个已筛选的IDLE效果之一
     */
    public record Bonus(int itemId, int basisPoints, String effect) {}

    /** 单个礼包配置，配置存在不代表当前角色持有。
     * @param id 旧特权idx，不是充值商品ID或库存物品ID
     * @param limitDays 非负天数，0表示续购分支不重写既有到期秒
     * @param timeMode 0按购买当天上海零点，1按购买时刻计算
     * @param idleBonuses 仅挂机适用条目，保留原顺序和重复项
     */
    public record Gift(int id, int limitDays, int timeMode, List<Bonus> idleBonuses) {
        /** 冻结共享条目，调用者不能改写配置或丢弃重复项。 */
        public Gift {
            idleBonuses = List.copyOf(idleBonuses);
        }
    }

    /** 启动读取原表；缺表、重复配置或适用条目缺字段时拒绝，不补造零加成。 */
    public PrivilegeGiftRules(ObjectMapper json) {
        try (var input = PrivilegeGiftRules.class.getResourceAsStream("/gameplay/promotionprivilegegift.json")) {
            if (input == null) {
                throw new IllegalStateException("特权礼包配置缺失");
            }
            byte[] content = input.readAllBytes();
            var rows = json.readTree(new java.io.ByteArrayInputStream(content)).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("特权礼包配置为空或结构非法");
            }
            var loaded = new HashMap<Integer, Gift>();
            for (var row : rows) {
                int id = number(row, "idx");
                int days = number(row, "limit_day");
                int mode = number(row, "time_mode");
                if (id < 1 || mode > 1) {
                    throw new IllegalStateException("特权礼包ID或期限模式非法：" + id);
                }
                var gift = new Gift(id, days, mode, readBonuses(json, row, id));
                if (loaded.putIfAbsent(id, gift) != null) {
                    throw new IllegalStateException("特权礼包配置ID重复：" + id);
                }
            }
            gifts = Map.copyOf(loaded);
            version = "privilege-gift-v1:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (java.io.IOException error) {
            throw new IllegalStateException("读取特权礼包配置失败", error);
        } catch (java.security.NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少礼包规则摘要算法", error);
        }
    }

    /** 返回实际配置；适用持有记录缺配置时拒绝，不换成相似礼包或零加成。 */
    public Gift config(int giftId) {
        var gift = gifts.get(giftId);
        if (gift == null) {
            throw new IllegalStateException("未知特权礼包配置：" + giftId);
        }
        return gift;
    }

    /**
     * 按旧续购公式计算候选到期秒，不写库、不重置计数，也不证明允许购买。
     * 限时礼包以本次购买时刻重新计算，不叠加剩余；0天分支保留旧到期值，新记录应传0。
     * @param previousEndTime 原持久到期秒，0表示永久，不得把已有有限期自动清成0
     * @param nowSeconds 服务端一次捕获的购买时刻，非客户端自报时刻
     */
    public long renewedEndTime(int giftId, long previousEndTime, long nowSeconds) {
        if (previousEndTime < 0 || nowSeconds < 0) {
            throw new IllegalArgumentException("礼包期限或购买时刻不能为负");
        }
        var gift = config(giftId);
        if (gift.limitDays() == 0) {
            return previousEndTime;
        }
        long start = nowSeconds;
        if (gift.timeMode() == 0) {
            start = Instant.ofEpochSecond(nowSeconds).atZone(RESET_ZONE).toLocalDate()
                    .atStartOfDay(RESET_ZONE).toEpochSecond();
        }
        return Math.addExact(start, Math.multiplyExact((long) gift.limitDays(), DAY_SECONDS));
    }

    /** 返回礼包源表内容版本，不随持有记录、时钟或其他模块状态变化。 */
    public String version() {
        return version;
    }

    /** 先辨认效果再读取挂机数值；无bonus合法为空，不按show_level或其他玩法字段判断收益。 */
    private static List<Bonus> readBonuses(ObjectMapper json, JsonNode row, int giftId) {
        var raw = row.path("bonus");
        if (raw.isMissingNode() || raw.isNull()) {
            return List.of();
        }
        if (!raw.isString()) {
            throw new IllegalStateException("礼包加成必须保留原JSON文本：" + giftId);
        }
        if (raw.asString().isBlank()) {
            return List.of();
        }
        var entries = json.readTree(raw.asString());
        if (entries == null || entries.isNull()) {
            return List.of();
        }
        if (!entries.isArray()) {
            throw new IllegalStateException("礼包加成列表非法：" + giftId);
        }
        var bonuses = new ArrayList<Bonus>();
        for (var entry : entries) {
            var effect = entry.path("effect");
            if (!effect.isString() || effect.asString().isBlank()) {
                throw new IllegalStateException("礼包加成效果缺失：" + giftId);
            }
            if (IDLE_EFFECTS.contains(effect.asString())) {
                int item = number(entry, "item_type");
                int points = number(entry, "bonus");
                if (item < 1) {
                    throw new IllegalStateException("礼包挂机资源ID非法：" + giftId);
                }
                bonuses.add(new Bonus(item, points, effect.asString()));
            }
        }
        return List.copyOf(bonuses);
    }

    /** 严格读取非负整数，缺字段、字符串或溢出不解释为0。 */
    private static int number(JsonNode row, String name) {
        var value = row.path(name);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() < 0) {
            throw new IllegalStateException("礼包配置字段非法：" + name);
        }
        return value.asInt();
    }
}
