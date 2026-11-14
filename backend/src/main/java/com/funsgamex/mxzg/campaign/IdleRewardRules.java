/**
 * 挂机VIP、世界等级与神职规则：从共享策划表生成不可变的时长和已解锁加成条目。
 * 由IdleRewardInputService读取角色权威状态后查询，不持有玩家数据、不判断活动或礼包权益。
 * 本类只准备已经核实的来源，不能将返回条目解释为完整挂机收益或领取许可。
 */
package com.funsgamex.mxzg.campaign;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public final class IdleRewardRules {
    /** 旧表中的金币、角色经验和英雄经验配置ID，不是库存实例ID。 */
    private static final int GOLD = 900001, ROLE_EXPERIENCE = 900003, HERO_EXPERIENCE = 900101;

    /** VIP等级到已核实的时长及加成配置，启动后不再改变。 */
    private final Map<Integer, Vip> vips;
    /** 按旧Excel主键升序保存的世界等级差区间，重叠时首条生效。 */
    private final List<WorldRange> worldRanges;
    /** 合法已解锁神职等级到累计挂机特权，配置0明确为空，不以缺表或未知等级代替0。 */
    private final Map<Integer, List<IdleBonusUtils.ClergyBonus>> clergy;
    /** 开始享受世界经验增益的角色等级，由system.world_gain_level读取。 */
    private final int worldGainLevel;
    /** 实际配置输入及基础挂机投影的内容版本，不是角色资产revision。 */
    private final String version;
    /** 装配时使用的普通挂机投影版本，供纯计算拒绝跨版本混用，不缓存第二份规则。 */
    private final String idleRulesVersion;

    /**
     * 已确认等级对应的VIP规则，0级不应用加成或额外时长。
     * @param level 持久羁绊VIP等级
     * @param maxSeconds 本次挂机可计算的最大秒数，含基础上限
     * @param bonuses 仅VIP三种基础资源的独立万分比条目
     */
    public record Vip(int level, int maxSeconds, List<IdleBonusUtils.BaseBonus> bonuses) {
        /** 冻结加成列表，调用者不能修改共享规则。 */
        public Vip {
            bonuses = List.copyOf(bonuses);
        }
    }

    /**
     * 世界差值配置，不因区间起点排序而改变旧idx优先级。
     * @param id 旧表主键
     * @param minimum 等级差下限，包含端点
     * @param maximum 等级差上限，包含端点
     * @param bonuses 此行匹配IDLE_ROLE_EXP的基础资源加成
     */
    private record WorldRange(int id, int minimum, int maximum, List<IdleBonusUtils.BaseBonus> bonuses) {}

    /** 启动解析共享规则，缺表、缺字段、重复键及数值溢出拒绝启动，不以0补齐。 */
    public IdleRewardRules(ObjectMapper json, IdleRules idleRules) {
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (java.security.NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少规则摘要算法", error);
        }
        int threshold = -1;
        for (var row : rows(json, "system", digest)) {
            if (row.path("key").asString().equals("world_gain_level")) {
                if (threshold != -1) {
                    throw new IllegalStateException("世界等级增益门槛重复");
                }
                threshold = number(row, "value");
            }
        }
        if (threshold < 1) {
            throw new IllegalStateException("世界等级增益门槛缺失或非法");
        }
        worldGainLevel = threshold;
        var loadedVips = new HashMap<Integer, Vip>();
        for (var row : rows(json, "goddessvip", digest)) {
            int level = number(row, "vip_level");
            int extra = number(row, "extra_idle_time");
            int rolePercent = number(row, "charater_exp_bonus");
            int goldPercent = number(row, "gold_bonus");
            int heroPercent = number(row, "heroes_exp_bonus");
            var bonuses = level == 0 ? List.<IdleBonusUtils.BaseBonus>of() : List.of(
                    vipBonus(level, ROLE_EXPERIENCE, rolePercent),
                    vipBonus(level, GOLD, goldPercent),
                    vipBonus(level, HERO_EXPERIENCE, heroPercent));
            int maxSeconds = Math.addExact(idleRules.data().maxSeconds(), level == 0 ? 0 : extra);
            if (loadedVips.putIfAbsent(level, new Vip(level, maxSeconds, bonuses)) != null) {
                throw new IllegalStateException("挂机VIP等级重复：" + level);
            }
        }
        if (!loadedVips.containsKey(0)) {
            throw new IllegalStateException("挂机VIP零级配置缺失");
        }
        vips = Map.copyOf(loadedVips);
        var ranges = new ArrayList<WorldRange>();
        var seen = new java.util.HashSet<Integer>();
        for (var row : rows(json, "worldlevelgainexp", digest)) {
            int id = number(row, "idx");
            int minimum = number(row, "level_down");
            int maximum = number(row, "level_up");
            if (id < 1 || minimum > maximum || !seen.add(id)) {
                throw new IllegalStateException("世界等级差区间非法或重复：" + id);
            }
            if (!row.path("bonus").isString()) {
                throw new IllegalStateException("世界等级加成必须是原表JSON文本");
            }
            var bonuses = json.readTree(row.path("bonus").asString());
            if (bonuses == null || !bonuses.isArray()) {
                throw new IllegalStateException("世界等级加成内容非法：" + id);
            }
            var entries = new ArrayList<IdleBonusUtils.BaseBonus>();
            for (var bonus : bonuses) {
                int item = number(bonus, "item_type");
                int points = number(bonus, "bonus");
                if (item < 1 || !bonus.path("effect").isString()) {
                    throw new IllegalStateException("世界等级加成条目非法：" + id);
                }
                if (bonus.path("effect").asString().equals("IDLE_ROLE_EXP")) {
                    entries.add(new IdleBonusUtils.BaseBonus("world:" + id, item, points));
                }
            }
            ranges.add(new WorldRange(id, minimum, maximum, List.copyOf(entries)));
        }
        ranges.sort(Comparator.comparingInt(WorldRange::id));
        worldRanges = List.copyOf(ranges);
        clergy = readClergy(json, digest);
        idleRulesVersion = idleRules.data().version();
        digest.update(idleRulesVersion.getBytes(StandardCharsets.UTF_8));
        version = "idle-base-v1:" + HexFormat.of().formatHex(digest.digest());
    }

    /** 返回可信等级的规则；正等级缺配置时拒绝，不退回VIP0。 */
    public Vip vip(int level) {
        var value = vips.get(level);
        if (value == null) {
            throw new IllegalStateException("未知挂机VIP等级：" + level);
        }
        return value;
    }

    /** 角色达到旧门槛时才依赖世界快照，未达到则明确不适用。 */
    public boolean needsWorld(int roleLevel) {
        if (roleLevel < 1) {
            throw new IllegalArgumentException("角色等级非法");
        }
        return roleLevel >= worldGainLevel;
    }

    /** 按idx首个闭区间匹配基础经验加成；未达门槛、世界不更高或差值无配置返回空。 */
    public List<IdleBonusUtils.BaseBonus> worldBonuses(int roleLevel, int worldLevel) {
        if (worldLevel < 1) {
            throw new IllegalArgumentException("世界等级非法");
        }
        if (!needsWorld(roleLevel) || worldLevel <= roleLevel) {
            return List.of();
        }
        int difference = worldLevel - roleLevel;
        return worldRanges.stream().filter(range -> difference >= range.minimum() && difference <= range.maximum())
                .findFirst().map(WorldRange::bonuses).orElse(List.of());
    }

    /**
     * 返回持久已解锁等级对应的全部挂机特权，按旧配置等级升序独立保留。
     * 未知等级明确拒绝；合法0或尚未解锁挂机特权的等级返回不可变空列表。
     */
    public List<IdleBonusUtils.ClergyBonus> clergy(int level) {
        var entries = clergy.get(level);
        if (entries == null) {
            throw new IllegalStateException("未知已解锁神职等级：" + level);
        }
        return entries;
    }

    /** 返回规则来源内容版本，供未来回执冻结；不能代替资产或世界快照版本。 */
    public String version() {
        return version;
    }

    /** 返回本来源装配时的普通挂机投影标识，不能用组合摘要反推或默认当前版本。 */
    public String idleRulesVersion() {
        return idleRulesVersion;
    }

    /** 将VIP原百分比转换为万分比；保留三资源条目独立计算。 */
    private static IdleBonusUtils.BaseBonus vipBonus(int level, int item, int percent) {
        return new IdleBonusUtils.BaseBonus("vip:" + level, item, IdleBonusUtils.vipBasisPoints(percent));
    }

    /**
     * 解析神职合法等级和IDLE_AWARD条目；先筛选类型，再要求本玩法需要的概率/系数字段。
     * 其他玩法条目可以没有挂机概率；旧空白/null/{}表示无特权，不给未知等级或IDLE缺字段补0。
     */
    private static Map<Integer, List<IdleBonusUtils.ClergyBonus>> readClergy(ObjectMapper json, MessageDigest digest) {
        var levels = new java.util.TreeMap<Integer, JsonNode>();
        for (var row : rows(json, "clergyprivilege", digest)) {
            int level = number(row, "clergy_level");
            if (levels.putIfAbsent(level, row) != null) {
                throw new IllegalStateException("神职配置等级重复：" + level);
            }
        }
        if (!levels.containsKey(0)) {
            throw new IllegalStateException("神职零级配置缺失");
        }
        var result = new HashMap<Integer, List<IdleBonusUtils.ClergyBonus>>();
        var unlocked = new ArrayList<IdleBonusUtils.ClergyBonus>();
        for (var entry : levels.entrySet()) {
            int level = entry.getKey();
            var raw = entry.getValue().path("unlock_privilege");
            if (!raw.isMissingNode() && !raw.isNull()) {
                if (!raw.isString()) {
                    throw new IllegalStateException("神职特权必须保留原JSON文本：" + level);
                }
                var privilege = raw.asString().isBlank() ? null : json.readTree(raw.asString());
                if (privilege != null && !privilege.isNull()) {
                    if (!privilege.isObject()) {
                        throw new IllegalStateException("神职特权内容非法：" + level);
                    }
                    var type = privilege.path("type");
                    if (!type.isMissingNode() && !type.isNull() && !type.isString()) {
                        throw new IllegalStateException("神职特权类型非法：" + level);
                    }
                    if ("IDLE_AWARD".equals(type.asString())) {
                        int points = number(privilege, "value");
                        int chance = number(privilege, "chance");
                        if (chance > 10000) {
                            throw new IllegalStateException("神职挂机概率超出万分比：" + level);
                        }
                        unlocked.add(new IdleBonusUtils.ClergyBonus("clergy:" + level, points, chance));
                    }
                }
            }
            result.put(level, List.copyOf(unlocked));
        }
        return Map.copyOf(result);
    }

    /** 读取明确表并参与来源摘要；空表或无法解析直接拒绝，不依赖旧target缓存补字段。 */
    private static JsonNode rows(ObjectMapper json, String table, MessageDigest digest) {
        try (var input = IdleRewardRules.class.getResourceAsStream("/gameplay/" + table + ".json")) {
            if (input == null) {
                throw new IllegalStateException("挂机输入配置缺失：" + table);
            }
            byte[] content = input.readAllBytes();
            digest.update(table.getBytes(StandardCharsets.UTF_8));
            digest.update((byte) 0);
            digest.update(content);
            var rows = json.readTree(new java.io.ByteArrayInputStream(content)).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("挂机输入配置为空：" + table);
            }
            return rows;
        } catch (java.io.IOException error) {
            throw new IllegalStateException("读取挂机输入配置失败：" + table, error);
        }
    }

    /** 严格读取非负整数，拒绝缺失、字符串、负数和溢出值。 */
    private static int number(JsonNode row, String field) {
        var value = row.path(field);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() < 0) {
            throw new IllegalStateException("挂机输入字段非法：" + field);
        }
        return value.asInt();
    }
}
