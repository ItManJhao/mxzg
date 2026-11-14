/**
 * 完整挂机收益的无状态装配：将一次权威输入、普通累计状态及服务器随机源组合成计算候选。
 * 按活动016/034/044、普通随机、神职的旧抽样顺序执行，保留神职前的分来源与分窗奖励。
 * 不读取数据库或时钟、不判断快照是否仍是最新、不发奖；后续领取事务负责持久版本与幂等。
 */
package com.funsgamex.mxzg.campaign;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.random.RandomGenerator;

public final class IdleRewardUtils {
    /** 当前已核实的三活动计算顺序；输入必须全齐，不能用缺项代表未开启。 */
    private static final List<Integer> ACTIVITY_IDS = List.of(16, 34, 44);
    /** 当前已核实VIP13的上限为18小时，不接受扩大到未核实的计算范围。 */
    private static final int MAX_VERIFIED_SECONDS = 64_800;

    /** 阻止将无状态装配工具实例化；所需规则和随机源均由调用方显式传入。 */
    private IdleRewardUtils() {}

    /** 三活动各自的原始掉落，未适用时仍保留明确的空结果位置。
     * @param activityId 对应输入Control的活动类型16、34或44
     * @param rewards 总次数倍乘后的原始条目，不在神职前合并同物品
     */
    public record ActivityReward(int activityId, List<CampaignRules.Reward> rewards) {
        /** 冻结活动分项，后续调用者不能重写候选或调整神职取整粒度。 */
        public ActivityReward {
            rewards = List.copyOf(rewards);
        }
    }

    /** 可审计的完整纯计算候选，不是领取回执或已经提交的资产。
     * @param input 原样保留本次冻结的权益、配置版本与同次服务器秒，不重读当前权益
     * @param stageId 本次奖励关卡，由后续持有角色锁的领取层从真实通关状态取得
     * @param seconds 已由服务端按同次VIP上限截取的计算秒数
     * @param previousDropSeconds 计算前的累计窗口秒数，结果在ordinary.dropSeconds
     * @param previousCounters 计算前的保底/原始数量快照，结果在ordinary.counters
     * @param ordinary 基础及普通随机分窗结果，不能把其中rewards再次加入最终总量
     * @param activities 按016/034/044保留三份活动结果，适用原因位于input.activities
     * @param outcome 独立加成分项与最终合并总奖励，尚未持久化或发放
     */
    public record Result(IdleRewardInputService.Input input, int stageId, int seconds,
                         int previousDropSeconds, Map<Integer, IdleRules.Counter> previousCounters,
                         IdleRules.Roll ordinary, List<ActivityReward> activities,
                         IdleBonusUtils.Result outcome) {
        /** 冻结计算前状态与活动结果，不保存对调用者可变Map/List的引用。 */
        public Result {
            previousCounters = Map.copyOf(previousCounters);
            activities = List.copyOf(activities);
        }
    }

    /**
     * 在完整输入预校验后，按旧顺序消费同一个服务器随机源并返回全部分项和计数前后值。
     * 只使用输入已冻结的活动Drop，不重新选行、读取状态、判断礼包期限或捕获新时间。
     * @param rules 与input.idleRulesVersion一致的当前工作进程普通挂机规则
     * @param input 由服务端同一次权威读取装配的输入，不接受客户端提交的权益快照
     * @param previous 上次持久化的类别计数，允许旧单次掉落超出上限，永不原地修改
     * @param random 同一次新计算的服务端随机源；领取回执重放不得再次调用本方法
     * @throws IllegalArgumentException 缺项、版本不匹配或结构非法，在首个抽样前拒绝
     * @throws NullPointerException 必需参数为null时在首个抽样前拒绝
     * @throws ArithmeticException 倍乘或合并溢出；不返回部分候选，也不回滚已消费随机源
     */
    public static Result calculate(IdleRules rules, IdleRewardInputService.Input input,
                                   int stageId, int seconds, int dropSeconds,
                                   Map<Integer, IdleRules.Counter> previous, RandomGenerator random) {
        Objects.requireNonNull(rules, "普通挂机规则缺失");
        Objects.requireNonNull(input, "挂机权威输入缺失");
        Objects.requireNonNull(random, "挂机服务器随机源缺失");
        var before = Map.copyOf(previous);
        validate(rules, input, stageId, seconds, dropSeconds, before);

        var activityRewards = new ArrayList<ActivityReward>();
        for (var activity : input.activities().entries()) {
            var rewards = activity.status() == IdleRewardInputService.ActivityStatus.APPLICABLE
                    ? IdleActivityRules.drop(activity.drop().orElseThrow(), seconds, random::nextInt)
                    : List.<CampaignRules.Reward>of();
            activityRewards.add(new ActivityReward(activity.control().activityId(), rewards));
        }
        var ordinary = rules.roll(stageId, seconds, dropSeconds, before, random, input.maxSeconds());
        // 抽样先活动后普通；旧神职接收的列表顺序却是基础、普通、活动，二者不能混为一谈。
        var other = new ArrayList<>(ordinary.dropRewards());
        for (var activity : activityRewards) {
            other.addAll(activity.rewards());
        }
        var outcome = IdleBonusUtils.calculate(ordinary.baseRewards(), other,
                input.baseBonuses(), input.clergyBonuses(), random::nextInt);
        return new Result(input, stageId, seconds, dropSeconds, before, ordinary, activityRewards, outcome);
    }

    /**
     * 在抽样前检查全部结构、累计计数及加成；基础倍乘在旧链同样先于活动抽样。
     * 不推导新权益或重新查询控制，只拒绝组合输入中自相矛盾的记录与未核实计算范围。
     */
    private static void validate(IdleRules rules, IdleRewardInputService.Input input, int stageId,
                                 int seconds, int dropSeconds, Map<Integer, IdleRules.Counter> previous) {
        if (input.roleId() == null || input.roleId().isBlank()
                || input.serverId() == null || input.serverId().isBlank()
                || input.serverTimeSeconds() < 0 || input.roleLevel() < 1
                || input.vipLevel() < 0 || input.clergyLevel() < 0
                || input.rulesVersion() == null || input.rulesVersion().isBlank()
                || input.idleRulesVersion() == null || input.idleRulesVersion().isBlank()
                || !Objects.equals(rules.data().version(), input.idleRulesVersion())
                || input.world() == null
                || input.maxSeconds() < rules.data().maxSeconds()
                || input.maxSeconds() > MAX_VERIFIED_SECONDS
                || seconds < 0 || seconds > input.maxSeconds()
                || dropSeconds < 0 || dropSeconds >= rules.data().resetSeconds()) {
            throw new IllegalArgumentException("挂机计算上下文、时段或规则版本不一致");
        }
        var stage = rules.stage(stageId);
        for (var entry : previous.entrySet()) {
            if (entry.getKey() < 1 || entry.getValue().quantity() < 0 || entry.getValue().misses() < 0) {
                throw new IllegalArgumentException("挂机累计计数非法");
            }
        }
        IdleBonusUtils.validateInputs(stage.base(), List.of(), input.baseBonuses(), input.clergyBonuses());
        for (var base : stage.base()) {
            Math.multiplyExact(base.quantity(), seconds / rules.data().frequency());
        }
        var activityInput = input.activities();
        if (activityInput == null || activityInput.openedAtSeconds() == null || activityInput.openDays() == null
                || activityInput.entries().size() != ACTIVITY_IDS.size()
                || (activityInput.openDays().isPresent() && activityInput.openedAtSeconds().isEmpty())
                || (activityInput.openedAtSeconds().isPresent() && activityInput.openedAtSeconds().getAsLong() < 0)) {
            throw new IllegalArgumentException("挂机三活动完整输入缺失");
        }
        if (activityInput.openDays().isPresent()
                && activityInput.openDays().getAsLong() != IdleActivityRules.serverOpenDays(
                        activityInput.openedAtSeconds().orElseThrow(), input.serverTimeSeconds())) {
            throw new IllegalArgumentException("挂机活动日数与冻结开服时间不一致");
        }
        for (int index = 0; index < ACTIVITY_IDS.size(); index++) {
            validateActivity(activityInput.entries().get(index), ACTIVITY_IDS.get(index), activityInput,
                    input.serverTimeSeconds());
        }
    }

    /** 校验三项冻结活动各自的结构与选行，不把缺Drop、重复类型或坏期次算成不适用。 */
    private static void validateActivity(IdleRewardInputService.Activity activity, int expectedId,
                                         IdleRewardInputService.ActivityInput input, long nowSeconds) {
        if (activity == null || activity.control() == null || activity.status() == null || activity.drop() == null) {
            throw new IllegalArgumentException("挂机活动输入不完整");
        }
        var control = activity.control();
        boolean statusSaysPublished = activity.status() != IdleRewardInputService.ActivityStatus.NOT_PUBLISHED;
        if (control.activityId() != expectedId || control.revision() < 1 || control.period() == null
                || control.published() != control.period().isPresent()
                || statusSaysPublished != control.published()) {
            throw new IllegalArgumentException("挂机活动控制状态或顺序不一致");
        }
        if (control.period().isPresent()) {
            var period = control.period().orElseThrow();
            if (period.startSeconds() < 0 || period.endSeconds() < period.startSeconds()
                    || period.clearSeconds() < period.endSeconds() || period.turnsTimeSeconds() < 0
                    || period.limitDays() < 0 || period.turns() < (expectedId == 44 ? 0 : 1)) {
                throw new IllegalArgumentException("挂机活动控制期次非法");
            }
        }
        if (activity.status() != IdleRewardInputService.ActivityStatus.APPLICABLE) {
            if (activity.drop().isPresent()) {
                throw new IllegalArgumentException("不适用挂机活动不能带入掉落行");
            }
            validateInactiveReason(activity, input, nowSeconds);
            return;
        }
        if (activity.drop().isEmpty() || input.openDays().isEmpty()) {
            throw new IllegalArgumentException("适用挂机活动缺少开服日数或掉落行");
        }
        var period = control.period().orElseThrow();
        var drop = activity.drop().orElseThrow();
        if (nowSeconds < period.startSeconds() || nowSeconds > period.endSeconds()
                || input.openDays().getAsLong() < period.limitDays()
                || (expectedId == 44 ? drop.turns() != null : !Objects.equals(drop.turns(), period.turns()))) {
            throw new IllegalArgumentException("适用挂机活动与冻结期次或掉落轮次不一致");
        }
    }

    /**
     * 核对可由冻结原值直接判断的不适用原因，不重读时钟或活动配置。
     * 016/034具体等级资格仍由权威输入层判定；044从未有该门槛，不能伪称等级不足。
     */
    private static void validateInactiveReason(IdleRewardInputService.Activity activity,
                                               IdleRewardInputService.ActivityInput input, long nowSeconds) {
        if (activity.status() == IdleRewardInputService.ActivityStatus.NOT_PUBLISHED) {
            return;
        }
        var period = activity.control().period().orElseThrow();
        boolean withinPeriod = nowSeconds >= period.startSeconds() && nowSeconds <= period.endSeconds();
        switch (activity.status()) {
            case OUTSIDE_RECORD_PERIOD -> {
                if (withinPeriod) {
                    throw new IllegalArgumentException("挂机活动期外状态与冻结时间矛盾");
                }
            }
            case ROLE_LEVEL_TOO_LOW -> {
                if (!withinPeriod || activity.control().activityId() == 44) {
                    throw new IllegalArgumentException("挂机活动等级不足状态不适用于该控制");
                }
            }
            case SERVER_TOO_YOUNG -> {
                if (!withinPeriod || input.openDays().isEmpty()
                        || input.openDays().getAsLong() >= period.limitDays()) {
                    throw new IllegalArgumentException("挂机活动开服天数不足状态与冻结输入矛盾");
                }
            }
            default -> throw new IllegalArgumentException("挂机活动不适用原因非法");
        }
    }
}
