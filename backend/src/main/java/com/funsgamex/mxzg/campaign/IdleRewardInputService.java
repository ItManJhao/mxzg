/**
 * 挂机已恢复来源的权威输入：同一角色锁事务读取等级/VIP/神职，按需取得本区世界快照。
 * 主线只读快照使用VIP时长；本服务准备基础/神职/礼包条目并冻结各服活动控制状态。
 * 三类活动按同次服务器秒、上海开服日数及旧等级门槛筛选；查询只准备输入，不抽奖。
 * 不创建第二份角色状态，不抽奖、不推进计时、不发资产，也不把部分输入当作完整领取资格。
 */
package com.funsgamex.mxzg.campaign;

import com.funsgamex.mxzg.world.WorldLevelService;
import com.funsgamex.mxzg.privilege.PrivilegeGiftRules;
import com.funsgamex.mxzg.privilege.PrivilegeGiftService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.HexFormat;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdleRewardInputService {
    /** 当前角色的持久只读入口，调用者持有角色锁，本服务不缓存角色字段。 */
    private final JdbcTemplate jdbc;
    /** 已核实的VIP、世界和神职规则，不包含角色权益状态。 */
    private final IdleRewardRules rules;
    /** 本区已提交角色等级形成的公共快照，不受外层角色事务回滚影响。 */
    private final WorldLevelService worlds;
    /** 当前角色真实持有记录的只读入口，不从库存或配置反推礼包权益。 */
    private final PrivilegeGiftService gifts;
    /** 礼包期限及挂机条目，不包含角色购买资格或持有状态。 */
    private final PrivilegeGiftRules giftRules;
    /** 各服三类活动真实控制记录；未初始化不能用空列表代替明确未发布。 */
    private final IdleActivityService activities;
    /** 三类活动的等级门槛、选行及抽样规则，输入装配只查询门槛和行、不抽样。 */
    private final IdleActivityRules activityRules;
    /** 已恢复来源的组合配置版本，包含礼包与活动规则；不是资产或控制记录revision。 */
    private final String version;

    /** 同次数据库查询得到的角色上下文，只在当前方法装配期间使用。
     * @param serverId 当前角色所属独立区服
     * @param level 当前锁内角色等级
     * @param vip 当前持久羁绊VIP等级
     * @param clergy 当前持久已解锁神职等级，不由神职经验物品数量推算
     */
    private record RoleInput(String serverId, int level, int vip, int clergy) {}

    /** 活动不适用的已核实原因，不将依赖缺失混为零奖励。 */
    public enum ActivityStatus {
        /** 持久控制明确未发布，不查询记录期或掉落行。 */
        NOT_PUBLISHED,
        /** 本次服务器秒在记录期外，清理期不延长掉落。 */
        OUTSIDE_RECORD_PERIOD,
        /** 016/034角色等级未严格大于配置门槛。 */
        ROLE_LEVEL_TOO_LOW,
        /** 上海旧ceil开服日数尚未达到控制记录的最低天数。 */
        SERVER_TOO_YOUNG,
        /** 全部门槛已核实，掉落行完整；尚未抽样或发奖。 */
        APPLICABLE
    }

    /** 一项活动的控制原值及本角色本次适用结果。
     * @param control 原始持久控制，保留轮次、期限与维护版本以备后续回执冻结
     * @param status 只包含明确适用/不适用结果，坏配置或缺控制会使整次装配失败
     * @param drop 仅适用时存在的不可变掉落行，未到记录期不查询概率或轮次行
     */
    public record Activity(IdleActivityService.Control control, ActivityStatus status,
                           Optional<IdleActivityRules.Drop> drop) {}

    /** 同次活动输入，保留原始开服时间与确实使用过的旧日数，不维护另一份活动状态。
     * @param openedAtSeconds 权威开服Unix秒，未配置明确为空，不默认应用启动时间
     * @param openDays 本次资格判断用到的上海旧ceil日数；三项均可提前排除时为空
     * @param entries 按016、034、044顺序冻结，查询不推进控制或创建角色活动记录
     */
    public record ActivityInput(OptionalLong openedAtSeconds, OptionalLong openDays, List<Activity> entries) {
        /** 冻结适用结果集合，后台控制变化不会修改已返回的输入。 */
        public ActivityInput {
            entries = List.copyOf(entries);
        }
    }

    /** 当前已恢复来源的冻结输入，尚无新主线完整领取事务，不能单独据此发奖。
     * @param roleId 当前锁定角色
     * @param serverId 该角色持久区服，不能由客户端指定另一统计范围
     * @param roleLevel 角色锁内等级
     * @param vipLevel 同次读取的持久VIP等级
     * @param clergyLevel 同次读取的持久已解锁神职等级
     * @param maxSeconds 同一VIP等级派生的最大挂机秒数
     * @param serverTimeSeconds 本次计算入口一次捕获的服务器秒数，各礼包共用
     * @param rulesVersion 本次装配所用配置内容版本
     * @param idleRulesVersion 普通挂机投影版本，纯计算须与传入IdleRules一致，防止混用配置
     * @param world 未达角色等级门槛时明确为空；达到门槛则必须有可信世界快照
     * @param baseBonuses VIP、世界和礼包来源的独立基础加成条目
     * @param clergyBonuses 持久神职等级已解锁的全部挂机特权，分别抽样并逐分项取整
     * @param gifts 原始持有快照，保留过期/active0记录与重复配置，读取不做清理
     * @param activities 三类活动的原始控制、开服日数及适用结果，没有在读取中抽取奖励
     */
    public record Input(String roleId, String serverId, int roleLevel, int vipLevel, int clergyLevel,
                        int maxSeconds, long serverTimeSeconds, String rulesVersion, String idleRulesVersion,
                        Optional<WorldLevelService.Snapshot> world,
                        List<IdleBonusUtils.BaseBonus> baseBonuses,
                        List<IdleBonusUtils.ClergyBonus> clergyBonuses, List<PrivilegeGiftService.Gift> gifts,
                        ActivityInput activities) {
        /** 冻结三份来源列表，不引用可变共享集合。 */
        public Input {
            baseBonuses = List.copyOf(baseBonuses);
            clergyBonuses = List.copyOf(clergyBonuses);
            gifts = List.copyOf(gifts);
        }
    }

    /** 注入真实持久来源并合成规则内容版本，不注入未实现模块的空服务。 */
    public IdleRewardInputService(JdbcTemplate jdbc, IdleRewardRules rules, WorldLevelService worlds,
                                  PrivilegeGiftService gifts, PrivilegeGiftRules giftRules,
                                  IdleActivityService activities, IdleActivityRules activityRules) {
        this.jdbc = jdbc;
        this.rules = rules;
        this.worlds = worlds;
        this.gifts = gifts;
        this.giftRules = giftRules;
        this.activities = activities;
        this.activityRules = activityRules;
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            digest.update(rules.version().getBytes(StandardCharsets.UTF_8));
            digest.update((byte) 0);
            digest.update(giftRules.version().getBytes(StandardCharsets.UTF_8));
            digest.update((byte) 0);
            digest.update(activityRules.version().getBytes(StandardCharsets.UTF_8));
            version = "idle-input-v1:" + HexFormat.of().formatHex(digest.digest());
        } catch (java.security.NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少挂机输入摘要算法", error);
        }
    }

    /**
     * 读取主线只读计时上限；调用方须先持有角色锁，不为显示时长读取无关世界快照。
     * 缺角色或未知VIP明确失败，不把读取异常解释为VIP0。
     */
    @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
    public int maximumSeconds(String roleId) {
        return rules.vip(role(roleId).vip()).maxSeconds();
    }

    /**
     * 在同一角色锁内装配VIP、世界、神职、礼包及一次活动控制快照，共用一个服务器秒。
     * 活动未初始化或适用时缺开服时间/选行明确失败；查询不抽样、不推进轮次。
     * @param nowSeconds 计算入口已捕获的服务端Unix秒，不来自客户端；所有礼包均使用同一时刻
     */
    @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
    public Input current(String roleId, long nowSeconds) {
        if (nowSeconds < 0) {
            throw new IllegalArgumentException("挂机输入服务器时刻不能为负");
        }
        var role = role(roleId);
        var vip = rules.vip(role.vip());
        var clergy = rules.clergy(role.clergy());
        var bonuses = new ArrayList<>(vip.bonuses());
        Optional<WorldLevelService.Snapshot> world = Optional.empty();
        if (rules.needsWorld(role.level())) {
            var snapshot = worlds.current(role.serverId());
            bonuses.addAll(rules.worldBonuses(role.level(), snapshot.level()));
            world = Optional.of(snapshot);
        }
        var held = gifts.held(roleId);
        appendGiftBonuses(bonuses, held, nowSeconds);
        var activityInput = activityInput(activities.current(role.serverId()), role.level(), nowSeconds);
        return new Input(roleId, role.serverId(), role.level(), role.vip(), role.clergy(), vip.maxSeconds(),
                nowSeconds, version, rules.idleRulesVersion(), world, bonuses, clergy, held, activityInput);
    }

    /**
     * 只对可能适用的活动计算一次旧开服日数，并在全部门槛通过后精确查询掉落行。
     * 先排除未发布、记录期外和等级不足是对旧逻辑与条件的等价短路，不读取无用依赖；
     * clearTime不延长掉落期，016/034不创建角色轮次，044沿旧配置最小idx行。
     */
    private ActivityInput activityInput(IdleActivityService.Snapshot snapshot, int roleLevel, long nowSeconds) {
        OptionalLong openDays = OptionalLong.empty();
        var entries = new ArrayList<Activity>();
        for (var control : snapshot.controls()) {
            ActivityStatus status;
            Optional<IdleActivityRules.Drop> drop = Optional.empty();
            if (!control.published()) {
                status = ActivityStatus.NOT_PUBLISHED;
            } else {
                var period = control.period().orElseThrow();
                if (nowSeconds < period.startSeconds() || nowSeconds > period.endSeconds()) {
                    status = ActivityStatus.OUTSIDE_RECORD_PERIOD;
                } else if (!activityRules.roleEligible(control.activityId(), roleLevel)) {
                    status = ActivityStatus.ROLE_LEVEL_TOO_LOW;
                } else {
                    if (openDays.isEmpty()) {
                        long openedAt = snapshot.openedAtSeconds().orElseThrow(
                                () -> new IllegalStateException("适用挂机活动缺少权威开服时间"));
                        openDays = OptionalLong.of(IdleActivityRules.serverOpenDays(openedAt, nowSeconds));
                    }
                    if (openDays.getAsLong() < period.limitDays()) {
                        status = ActivityStatus.SERVER_TOO_YOUNG;
                    } else {
                        status = ActivityStatus.APPLICABLE;
                        drop = Optional.of(activityRules.selectedDrop(control.activityId(), period.turns()));
                    }
                }
            }
            entries.add(new Activity(control, status, drop));
        }
        return new ActivityInput(snapshot.openedAtSeconds(), openDays, entries);
    }

    /**
     * 沿旧主线角色经验/金币/英雄经验的效果顺序追加，各持有记录及配置内重复项独立保留。
     * 先按持久期限筛选再查配置：过期未知配置不阻塞，仍有效或永久记录缺配置则明确失败。
     */
    private void appendGiftBonuses(List<IdleBonusUtils.BaseBonus> bonuses,
                                   List<PrivilegeGiftService.Gift> held, long nowSeconds) {
        for (String effect : List.of("IDLE_ROLE_EXP", "IDLE_GOLD", "IDLE_HERO_EXP")) {
            for (var gift : held) {
                if (!IdleBonusUtils.giftAppliesAt(gift.endsAtSeconds(), nowSeconds)) {
                    continue;
                }
                var entries = giftRules.config(gift.giftId()).idleBonuses();
                for (int index = 0; index < entries.size(); index++) {
                    var entry = entries.get(index);
                    if (entry.effect().equals(effect)) {
                        bonuses.add(new IdleBonusUtils.BaseBonus("gift:" + gift.recordId() + ":" + index,
                                entry.itemId(), entry.basisPoints()));
                    }
                }
            }
        }
    }

    /** 单次读取当前角色持久字段；未找到角色或非法字段拒绝，不接纳前端传入等级/VIP。 */
    private RoleInput role(String roleId) {
        if (roleId == null || roleId.isBlank()) {
            throw new IllegalArgumentException("挂机输入角色标识缺失");
        }
        return jdbc.queryForObject("SELECT server_id,role_level,goddess_vip,clergy_level FROM game_role WHERE id=?", (row, index) -> {
            String serverId = row.getString("server_id");
            int level = row.getInt("role_level");
            boolean levelMissing = row.wasNull();
            int vip = row.getInt("goddess_vip");
            boolean vipMissing = row.wasNull();
            int clergy = row.getInt("clergy_level");
            boolean clergyMissing = row.wasNull();
            if (serverId == null || !serverId.matches("[a-z0-9_-]{1,32}")
                    || levelMissing || level < 1 || vipMissing || vip < 0 || clergyMissing || clergy < 0) {
                throw new IllegalStateException("挂机输入持久字段非法");
            }
            return new RoleInput(serverId, level, vip, clergy);
        }, roleId);
    }
}
