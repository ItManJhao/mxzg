/**
 * 前三关首通奖励的事务内分发，按旧ThingService的item.type区分钱包、经验和背包。
 * 由MainChapterService持久结算调用，不注册协议；外层负责鉴权、待领奖凭据和幂等控制。
 */
package com.funsgamex.mxzg.campaign;

import java.util.*;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.RoleExperienceService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.network.AssetSyncService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class MainChapterRewardService {
    /** 只接受已核验前三关的首通奖励，不收客户端奖励清单。 */
    private final MainChapterRules rules;
    /** 原item.type映射；特殊类型不得落入普通库存默认分支。 */
    private final Map<Integer, Integer> types = new HashMap<>();
    /** 角色锁与钱包分发。 */
    private final RoleRepository roles;
    /** 原版角色经验和升级钻石处理。 */
    private final RoleExperienceService experience;
    /** 普通装备/碎片堆叠，以及新版既有英雄经验库存余额的唯一写入口。 */
    private final InventoryService inventory;
    /** 读取特殊余额，使用同一角色锁事务。 */
    private final JdbcTemplate jdbc;
    /** 要求加入外层事务，防止部分发奖。 */
    private final AssetSyncService sync;

    /** 加载类型表并预检前三关的全部奖励，未支持类型阻止进入分发链。 */
    public MainChapterRewardService(MainChapterRules rules, RoleRepository roles,
            RoleExperienceService experience, InventoryService inventory, JdbcTemplate jdbc,
            AssetSyncService sync, ObjectMapper mapper) {
        this.rules = rules;
        this.roles = roles;
        this.experience = experience;
        this.inventory = inventory;
        this.jdbc = jdbc;
        this.sync = sync;
        try (var input = getClass().getResourceAsStream("/gameplay/item.json")) {
            if (input == null) {
                throw new IllegalStateException("奖励物品表缺失");
            }
            for (var row : mapper.readTree(input).path("rows")) {
                int id = row.path("idx").asInt();
                int type = row.path("type").asInt();
                if (id <= 0 || type <= 0 || types.put(id, type) != null) {
                    throw new IllegalStateException("奖励物品类型配置无效");
                }
            }
        } catch (java.io.IOException error) {
            throw new IllegalStateException("奖励物品表读取失败", error);
        }
        for (int index = 1; index <= 3; index++) {
            for (var reward : rules.stage(index).firstRewards()) {
                int type = types.getOrDefault(reward.itemId(), 0);
                if (!Set.of(1, 2, 3, 5, 6, 11).contains(type)
                        || (type != 6 && reward.itemId() != switch (type) {
                            case 1 -> 900001;
                            case 2 -> 900002;
                            case 3 -> 900003;
                            case 5 -> 900101;
                            case 11 -> 900401;
                            default -> 0;
                        })) {
                    throw new IllegalStateException("首通奖励类型尚未接入：" + reward.itemId());
                }
            }
        }
    }

    /**
     * 分发可信待领奖状态对应的原配置奖励，返回奖励处理清单（酒馆封顶可能减少，角色经验沿旧规则在满级忽略）。
     * progress必须由外层从角色持久记录读取；本方法不能独立用于重复请求或玩家领奖协议。
     * 英雄经验沿新版既有900101余额存储；酒馆点沿900401余额存储并施加旧上限，不开放酒馆。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<MainChapterRules.Reward> grant(String roleId, MainChapterRules.Progress progress) {
        sync.requireTransaction();
        roles.lock(roleId);
        return grantPlan(roleId, plan(progress));
    }

    /** 持久战报冻结的首通奖励与酒馆上限；重试不能重新读取已变化的奖励配置。 */
    public record Plan(List<MainChapterRules.Reward> rewards, long tavernLimit) {
        /** 冻结清单，拒绝负上限。 */
        public Plan {
            rewards = List.copyOf(rewards);
            if (tavernLimit < 0) {
                throw new IllegalArgumentException("酒馆上限无效");
            }
        }
    }

    /** 在生成权威战报时保存原奖励配置，无待领奖时计划为空。 */
    public Plan plan(MainChapterRules.Progress progress) {
        return new Plan(rules.pendingRewards(progress), rules.tavernLimit(progress.maxCleared()));
    }

    /** 仅消费服务端持久战报中的奖励计划，调用方须已核对归属、胜利和未结算凭据。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<MainChapterRules.Reward> grantPlan(String roleId, Plan plan) {
        sync.requireTransaction();
        roles.lock(roleId);
        for (var reward : plan.rewards()) {
            if (reward.quantity() <= 0 || !types.containsKey(reward.itemId())
                    || !Set.of(1, 2, 3, 5, 6, 11).contains(types.get(reward.itemId()))) {
                throw new IllegalStateException("持久奖励计划无效");
            }
        }
        var processed = new ArrayList<MainChapterRules.Reward>();
        for (var reward : plan.rewards()) {
            int id = reward.itemId();
            long amount = reward.quantity();
            switch (types.get(id)) {
                case 1 -> roles.creditCurrency(roleId, amount, 0);
                case 2 -> roles.creditCurrency(roleId, 0, amount);
                case 3 -> experience.credit(roleId, amount);
                case 5, 6 -> inventory.credit(roleId, id, amount);
                case 11 -> {
                    var balances = jdbc.query("SELECT quantity FROM game_inventory WHERE role_id=? AND item_id=?",
                        (row, index) -> row.getLong(1), roleId, id);
                    long current = balances.isEmpty() ? 0 : balances.getFirst();
                    if (current < 0) {
                        throw new IllegalStateException("酒馆冒险点余额无效");
                    }
                    long limit = plan.tavernLimit();
                    amount = current >= limit ? 0 : Math.min(amount, limit - current);
                    if (amount > 0) {
                        inventory.credit(roleId, id, amount);
                    }
                }
                default -> throw new IllegalStateException("奖励类型尚未接入：" + id);
            }
            if (amount > 0) {
                processed.add(new MainChapterRules.Reward(id, amount));
            }
        }
        return List.copyOf(processed);
    }
}
