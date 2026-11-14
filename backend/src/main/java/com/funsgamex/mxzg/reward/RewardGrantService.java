/**
 * 服务端可信奖励的共享事务分发：校验支持能力、合并最终理论量，并返回真实到账与实例明细。
 * 首通结算等业务在角色锁外层事务中调用；资格、请求幂等和成功回执不归本服务，不注册玩家协议。
 * 加成必须先逐条完成取整再传入；本层不重算挂机规则、不读取玩家可控奖励或创建独立事务。
 */
package com.funsgamex.mxzg.reward;

import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.inventory.TimedInventoryService;
import com.funsgamex.mxzg.inventory.TimedItemRules;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleExperienceService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.role.RoleRules;
import com.funsgamex.mxzg.spirit.SpiritInventoryService;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class RewardGrantService {
    /** 单次期限实例写入最多1000件的技术保护；超限整单拒绝，不是持有容量且不静默截奖。 */
    private static final int MAX_TIMED_GRANT_QUANTITY = 1_000;
    /** 原item表的类型索引，仅支持明确接入的领域分路，未知类型没有普通库存兜底。 */
    private final Map<Integer, Integer> types;
    /** 角色锁、钱包和真实前后资料，由Spring注入。 */
    private final RoleRepository roles;
    /** 角色经验及升级赠钻的唯一写入口。 */
    private final RoleExperienceService experience;
    /** 普通配置堆叠、英雄经验及酒馆点余额入口。 */
    private final InventoryService inventory;
    /** 上海自然日期限规则，用于随机前预检。 */
    private final TimedItemRules timedRules;
    /** 期限实例的唯一写入口，不调用会清理过期物品的current方法。 */
    private final TimedInventoryService timed;
    /** 已授权的2000002精灵真实生成及持久化入口。 */
    private final SpiritInventoryService spirits;
    /** 要求外层事务，并复用所有领域共同的版本/提交后推送。 */
    private final AssetSyncService sync;

    /**
     * 加成逐条取整后的可信最终理论量；同配置在本层精确合并。
     * @param itemId 可信规则产生的真实配置ID，不是实例ID
     * @param quantity 最终正理论量，不从客户端接收
     */
    public record Reward(int itemId, long quantity) {}

    /**
     * 同一次业务开始时冻结的服务器秒和最高通关关卡酒馆上限，不从客户端接受。
     * @param nowSeconds 本次业务统一使用的服务器Unix秒
     * @param tavernLimit 按最高已通关关卡冻结的酒馆900401上限，不是下一关上限
     */
    public record Context(long nowSeconds, long tavernLimit) {
        /** 时间及上限不能为负；当前首通无期限奖励，时间只对期限分路生效。 */
        public Context {
            if (nowSeconds < 0 || tavernLimit < 0) {
                throw new IllegalArgumentException("可信发奖时间或酒馆上限无效");
            }
        }
    }

    /** 注入已有领域服务，从同源item表建立唯一类型分路，不另造模块奖励清单。 */
    public RewardGrantService(RoleRepository roles, RoleExperienceService experience,
            InventoryService inventory, TimedItemRules timedRules, TimedInventoryService timed,
            SpiritInventoryService spirits, AssetSyncService sync, ObjectMapper json) {
        this.roles = roles;
        this.experience = experience;
        this.inventory = inventory;
        this.timedRules = timedRules;
        this.timed = timed;
        this.spirits = spirits;
        this.sync = sync;
        var index = new HashMap<Integer, Integer>();
        try (var input = getClass().getResourceAsStream("/gameplay/item.json")) {
            if (input == null) {
                throw new IllegalStateException("奖励物品表缺失");
            }
            var rows = json.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("奖励物品表结构无效");
            }
            for (var row : rows) {
                var id = row.path("idx");
                var type = row.path("type");
                if (!id.isIntegralNumber() || !id.canConvertToInt() || id.asInt() <= 0
                        || !type.isIntegralNumber() || !type.canConvertToInt() || type.asInt() <= 0
                        || index.put(id.asInt(), type.asInt()) != null) {
                    throw new IllegalStateException("奖励物品类型配置无效");
                }
            }
        } catch (java.io.IOException failure) {
            throw new IllegalStateException("奖励物品表读取失败", failure);
        }
        types = Map.copyOf(index);
    }

    /**
     * 在业务抽奖前校验全部可能奖励ID，而非仅校验这次抽中的结果。
     * 只验证能力，不访问玩家、不抽样、不发奖；未来挂机装配应在任何随机消费前调用。
     */
    public void requireSupported(Collection<Integer> itemIds) {
        if (itemIds == null) {
            throw new IllegalArgumentException("奖励候选清单缺失");
        }
        for (Integer itemId : itemIds) {
            requireType(itemId);
        }
    }

    /**
     * 发放可信最终计划并返回事务内真实结果；重复调用会再次发放，外层必须先查业务回执。
     * 整个计划在写入及实例抽样前完成类型、合并数量、实例批量与期限计算预检；任何失败由外层整体回滚。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public RewardGrantResult grant(String roleId, List<Reward> rewards, Context context, RandomGenerator random) {
        sync.requireTransaction();
        if (roleId == null || roleId.isBlank() || context == null || random == null) {
            throw new IllegalArgumentException("可信发奖缺少角色、上下文或随机源");
        }
        var merged = prepare(rewards, context);
        roles.lock(roleId);
        var before = roles.findById(roleId).orElseThrow();
        if (before.gold() < 0 || before.diamonds() < 0) {
            throw new IllegalStateException("角色持久钱包余额非法");
        }
        var outcomes = new ArrayList<RewardGrantResult.Outcome>();
        var stacks = new ArrayList<InventoryService.Credit>();
        var gains = new ArrayList<RoleRules.ExperienceGain>();
        var tavern = new ArrayList<RewardGrantResult.TavernChange>();
        var bonuses = new ArrayList<RewardGrantResult.Bonus>();
        var timedItems = new ArrayList<TimedInventoryService.Item>();
        var spiritItems = new ArrayList<SpiritInventoryService.Item>();
        for (var reward : merged) {
            int id = reward.itemId();
            long requested = reward.quantity();
            long credited = requested;
            var reason = RewardGrantResult.Reduction.NONE;
            switch (requireType(id)) {
                case 1 -> roles.creditCurrency(roleId, requested, 0);
                case 2 -> roles.creditCurrency(roleId, 0, requested);
                case 3 -> {
                    var gain = experience.credit(roleId, requested);
                    gains.add(gain);
                    credited = gain.accepted();
                    if (gain.ignored() > 0) {
                        reason = RewardGrantResult.Reduction.ROLE_MAX_LEVEL;
                    }
                    if (gain.diamonds() > 0) {
                        bonuses.add(new RewardGrantResult.Bonus(
                                RewardGrantResult.BonusSource.ROLE_LEVEL_UP, 900002, gain.diamonds()));
                    }
                }
                case 5, 6 -> stacks.add(inventory.credit(roleId, id, requested));
                case 8 -> spiritItems.addAll(spirits.grant(roleId, id, Math.toIntExact(requested), random));
                case 11 -> {
                    long current = inventory.find(roleId, id).map(InventoryService.Item::quantity).orElse(0L);
                    credited = current >= context.tavernLimit() ? 0 : Math.min(requested, context.tavernLimit() - current);
                    if (credited < requested) {
                        reason = RewardGrantResult.Reduction.TAVERN_CAP;
                    }
                    // 零到账也保留旧余额和身份，不创建空库存，不推进资产版本。
                    if (credited > 0) {
                        stacks.add(inventory.credit(roleId, id, credited));
                    }
                    tavern.add(new RewardGrantResult.TavernChange(current, context.tavernLimit(), current + credited));
                }
                case 16 -> {
                    for (long index = 0; index < requested; index++) {
                        timedItems.add(timed.grantOne(roleId, id, context.nowSeconds()));
                    }
                }
                default -> throw new IllegalStateException("奖励分路未实现：" + id);
            }
            outcomes.add(new RewardGrantResult.Outcome(id, requested, credited, requested - credited, reason));
        }
        var after = roles.findById(roleId).orElseThrow();
        return new RewardGrantResult(roleId, outcomes,
                new RoleRepository.CurrencyCredit(before.gold(), before.diamonds(), after.gold(), after.diamonds()),
                stacks, gains, tavern, bonuses, timedItems,
                new SpiritInventoryService.State(SpiritInventoryService.SCHEMA_VERSION, spiritItems));
    }

    /** 全量预检并精确合并同ID，保留首次出现顺序；不得拆行绕过精灵批量保护。 */
    private List<Reward> prepare(List<Reward> rewards, Context context) {
        if (rewards == null) {
            throw new IllegalArgumentException("奖励计划缺失");
        }
        var merged = new LinkedHashMap<Integer, Long>();
        for (var reward : rewards) {
            if (reward == null || reward.quantity() <= 0) {
                throw new IllegalArgumentException("奖励数量必须为正");
            }
            requireType(reward.itemId());
            merged.merge(reward.itemId(), reward.quantity(), Math::addExact);
        }
        var result = new ArrayList<Reward>();
        long timedQuantity = 0;
        for (var entry : merged.entrySet()) {
            int type = requireType(entry.getKey());
            if (type == 8) {
                SpiritInventoryService.requireSupportedGrant(entry.getKey(), entry.getValue());
            } else if (type == 16) {
                timedQuantity = Math.addExact(timedQuantity, entry.getValue());
                if (timedQuantity > MAX_TIMED_GRANT_QUANTITY) {
                    throw new IllegalArgumentException("期限实例单次技术批量超限：" + entry.getKey());
                }
                TimedInventoryService.expiration(context.nowSeconds(), timedRules.require(entry.getKey()).validDays());
            }
            result.add(new Reward(entry.getKey(), entry.getValue()));
        }
        return List.copyOf(result);
    }

    /** 按真实item.type及已恢复的特殊ID拒绝未支持能力，未知配置不能落入堆叠兜底。 */
    private int requireType(Integer itemId) {
        int type = itemId == null ? 0 : types.getOrDefault(itemId, 0);
        boolean supported = switch (type) {
            case 1 -> itemId == 900001;
            case 2 -> itemId == 900002;
            case 3 -> itemId == 900003;
            case 5 -> itemId == 900101;
            case 6 -> true;
            case 11 -> itemId == 900401;
            case 8 -> {
                SpiritInventoryService.requireSupportedGrant(itemId, 1);
                yield true;
            }
            case 16 -> {
                timedRules.require(itemId);
                yield true;
            }
            default -> false;
        };
        if (!supported) {
            throw new IllegalArgumentException("奖励类型尚未接入：" + itemId + "，type=" + type);
        }
        return type;
    }
}
