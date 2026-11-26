/**
 * 铁匠铺普通装备结算。单次锻造和一键锻造走同一角色锁、资产版本和持久回执。
 * 一键报价在锁内读取金币与背包，确认时核对该资产版本，再按同一规则结算。
 */
package com.funsgamex.mxzg.smith;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.random.RandomGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Service
public class SmithService {
    /** 业务回执 ID 使用客户端生成的规范 UUID，断线后原样重试。 */
    private static final String UUID_PATTERN = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
    /** 客户端可准确表达的最大整数，货币、数量和资产版本均使用这一安全界限。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;

    /** 当前部位的真实金币报价和将留在背包里的净新增成品，空成品表示当前不可一键锻造。 */
    public record Preview(int slot, long assetRevision, long goldCost, List<Reward> rewards) {
        /** 报价冻结到本次预览，后续资产变化不会修改它。 */
        public Preview {
            rewards = List.copyOf(rewards);
        }
    }

    /** 与资产版本关联的原成交结果；一键锻造的 itemId 和 count 为 0，由 slot 表明范围。 */
    public record Receipt(String requestId, String roleId, long assetRevision, int slot, int itemId, int count,
                          long goldCost, List<Reward> rewards) {
        /** 冻结真实净产物，重登和重试保持相同回执。 */
        public Receipt {
            rewards = List.copyOf(rewards);
        }
    }

    /** 单锻由成品和数量决定；一键以部位和已确认的资产版本决定。 */
    private record Command(String requestId, int itemId, int count, int slot, long expectedRevision) {}
    /** 规划中的一档锻造，材料含当前库存及前档本次产物。 */
    private record Step(SmithRules.Recipe recipe, long count) {}
    /** 同一角色锁内生成的完整计划，回执只展示项间抵消后的产物。 */
    private record Plan(List<Step> steps, long goldCost, List<Reward> netRewards) {}
    /** 历史原命令及冻结结算，用来区分网络重试和复用编号。 */
    private record Saved(Command command, Receipt receipt) {}

    /** WebSocket 身份来源，等角色锁后复核登录凭证。 */
    private final SessionService sessions;
    /** 持有唯一角色资产锁、金币和持久资产版本。 */
    private final RoleRepository roles;
    /** 普通物品堆叠来源；已穿装备另存于英雄槽位，不能充当锻造材料。 */
    private final InventoryService inventory;
    /** 可信配方及一键开放规则。 */
    private final SmithRules rules;
    /** 经通用发放积累实际获得的装备品质成就。 */
    private final RewardGrantService grants;
    /** 只交付实际净产物的共用发奖反馈，由原事务提交后推送。 */
    private final RewardFeedbackService feedback;
    /** 统一业务时钟，给本次可信发放提供固定秒值。 */
    private final GameClock clock;
    /** 收据和原充值记录均随同一数据库角色锁读取。 */
    private final JdbcTemplate jdbc;
    /** 历史回执使用数据库 JSON，网络回包仍由统一 Protobuf 信封持有。 */
    private final ObjectMapper mapper;

    /** 注入角色、背包、策划和奖励领域，页面无需另查已同步的库存。 */
    public SmithService(SessionService sessions, RoleRepository roles, InventoryService inventory, SmithRules rules,
                        RewardGrantService grants, RewardFeedbackService feedback, GameClock clock,
                        JdbcTemplate jdbc, ObjectMapper mapper) {
        this.sessions = sessions;
        this.roles = roles;
        this.inventory = inventory;
        this.rules = rules;
        this.grants = grants;
        this.feedback = feedback;
        this.clock = clock;
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    /** 给当前栏位生成唯一资产版本下的成本和净产物；空报价不写库存，也不增加资产版本。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Preview preview(String token, int slot) {
        requireSlot(slot);
        var role = lockRole(token);
        requireAccess(role, true);
        var plan = planForSlot(role, slot);
        return new Preview(slot, roles.revision(role.id()), plan.goldCost(), plan.netRewards());
    }

    /** 按配置锻造指定数量；扣材料、金币、发货、成就和回执一起提交。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt forge(String token, String requestId, int itemId, int count) {
        requireRequestId(requestId);
        if (itemId <= 0 || count <= 0) {
            throw reject(HttpStatus.BAD_REQUEST, "INVALID_SMITH_REQUEST");
        }
        var command = new Command(requestId, itemId, count, 0, 0);
        var role = lockRole(token);
        var previous = replay(role.id(), command);
        if (previous != null) {
            return previous;
        }
        requireAccess(role, false);
        var recipe = rules.find(itemId);
        if (recipe == null) {
            throw reject(HttpStatus.BAD_REQUEST, "SMITH_RECIPE_INVALID");
        }
        long gold = Math.multiplyExact(count, recipe.goldCost());
        if (gold > role.gold() || gold > MAX_SAFE_INTEGER) {
            throw reject(HttpStatus.CONFLICT, "SMITH_INSUFFICIENT_GOLD");
        }
        var plan = new Plan(List.of(new Step(recipe, count)), gold, List.of(new Reward(itemId, count)));
        return settle(role.id(), command, recipe.slot(), plan);
    }

    /** 确认当前部位报价；材料变化或金币版本变化时要求重新计算，原成功请求仍然可重放。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt forgeAll(String token, String requestId, int slot, long expectedRevision) {
        requireRequestId(requestId);
        requireSlot(slot);
        if (expectedRevision < 0 || expectedRevision > MAX_SAFE_INTEGER) {
            throw reject(HttpStatus.BAD_REQUEST, "INVALID_SMITH_REQUEST");
        }
        var command = new Command(requestId, 0, 0, slot, expectedRevision);
        var role = lockRole(token);
        var previous = replay(role.id(), command);
        if (previous != null) {
            return previous;
        }
        requireAccess(role, true);
        if (roles.revision(role.id()) != expectedRevision) {
            throw reject(HttpStatus.CONFLICT, "SMITH_PREVIEW_CHANGED");
        }
        var plan = planForSlot(role, slot);
        if (plan.steps().isEmpty()) {
            throw reject(HttpStatus.CONFLICT, "SMITH_EMPTY");
        }
        return settle(role.id(), command, slot, plan);
    }

    /** 由低到高预算该部位。消费同次制造的中间件时从净新增产物中扣除。 */
    private Plan planForSlot(RoleProfile role, int slot) {
        var available = new HashMap<Integer, Long>();
        inventory.list(role.id()).forEach(item -> available.put(item.itemId(), item.quantity()));
        Map<Integer, Long> net = new TreeMap<>();
        var steps = new ArrayList<Step>();
        long gold = role.gold();
        if (gold < 0 || gold > MAX_SAFE_INTEGER) {
            throw new IllegalStateException("铁匠铺读取了无效的角色金币余额");
        }
        long remaining = gold;
        for (var recipe : rules.forSlot(slot)) {
            long materials = available.getOrDefault(recipe.materialId(), 0L);
            long count = Math.min(materials / recipe.materialQuantity(), remaining / recipe.goldCost());
            if (count == 0) {
                continue;
            }
            long consumed = count * recipe.materialQuantity();
            remaining -= count * recipe.goldCost();
            available.put(recipe.materialId(), materials - consumed);
            available.merge(recipe.itemId(), count, Math::addExact);
            net.merge(recipe.materialId(), -consumed, Math::addExact);
            net.merge(recipe.itemId(), count, Math::addExact);
            steps.add(new Step(recipe, count));
        }
        var rewards = net.entrySet().stream().filter(item -> item.getValue() > 0)
                .map(item -> new Reward(item.getKey(), item.getValue())).toList();
        return new Plan(List.copyOf(steps), gold - remaining, rewards);
    }

    /** 先扣实际金币，再逐档扣材料并发货，后档可以使用同一事务中刚发放的前档。 */
    private Receipt settle(String roleId, Command command, int slot, Plan plan) {
        if (!roles.debitGold(roleId, plan.goldCost())) {
            throw reject(HttpStatus.CONFLICT, "SMITH_INSUFFICIENT_GOLD");
        }
        var context = new RewardGrantService.Context(clock.epochSeconds(), 0);
        for (var step : plan.steps()) {
            var recipe = step.recipe();
            long materialCount = Math.multiplyExact(step.count(), recipe.materialQuantity());
            if (!inventory.debit(roleId, recipe.materialId(), materialCount)) {
                throw reject(HttpStatus.CONFLICT, "SMITH_INSUFFICIENT_MATERIAL");
            }
            // 发放每档的实物，使可信装备品质成就按原版记录，界面只展示最终净产物。
            grants.grant(roleId, List.of(new Reward(recipe.itemId(), step.count())), context, RandomGenerator.getDefault());
        }
        var receipt = new Receipt(command.requestId(), roleId, roles.revision(roleId), slot,
                command.itemId(), command.count(), plan.goldCost(), plan.netRewards());
        int written = jdbc.update("""
            INSERT INTO game_smith_request(role_id,request_id,item_id,forge_count,slot_id,expected_revision,receipt_json)
            VALUES (?,?,?,?,?,?,?)
            """, roleId, command.requestId(), command.itemId(), command.count(), command.slot(),
                command.expectedRevision(), mapper.writeValueAsString(receipt));
        if (written != 1) {
            throw new IllegalStateException("铁匠铺回执写入行数异常");
        }
        publishReward(receipt);
        return receipt;
    }

    /** 验明现存登录持有真实角色锁，换号期间不会执行已经等待的旧命令。 */
    private RoleProfile lockRole(String token) {
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw reject(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        return roles.findById(roleId).orElseThrow();
    }

    /** 核对角色等级，一键按旧规则允许低于门槛但已累计充值的角色使用。 */
    private void requireAccess(RoleProfile role, boolean quick) {
        if (role.level() < SmithRules.REQUIRED_LEVEL) {
            throw reject(HttpStatus.CONFLICT, "SMITH_LOCKED");
        }
        if (quick && role.level() < rules.quickLevel()) {
            long recharge = jdbc.queryForObject("SELECT total_recharge FROM game_role WHERE id=?", Long.class, role.id());
            if (recharge <= 0) {
                throw reject(HttpStatus.CONFLICT, "SMITH_QUICK_LOCKED");
            }
        }
    }

    /** 返回当前角色同参数的原回执；原编号已属于不同参数时拒绝。 */
    private Receipt replay(String roleId, Command command) {
        var saved = jdbc.query("""
            SELECT item_id,forge_count,slot_id,expected_revision,receipt_json
            FROM game_smith_request WHERE role_id=? AND request_id=?
            """, rows -> rows.next() ? new Saved(new Command(command.requestId(), rows.getInt("item_id"),
                rows.getInt("forge_count"), rows.getInt("slot_id"), rows.getLong("expected_revision")),
                mapper.readValue(rows.getString("receipt_json"), Receipt.class)) : null, roleId, command.requestId());
        if (saved == null) {
            return null;
        }
        if (!command.equals(saved.command())) {
            throw reject(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
        }
        var receipt = saved.receipt();
        if (!roleId.equals(receipt.roleId()) || !command.requestId().equals(receipt.requestId())) {
            throw new IllegalStateException("铁匠铺历史回执身份异常");
        }
        publishReward(receipt);
        return receipt;
    }

    /** 复用原请求号作为发奖展示身份，失败重试可补展示，前端按原身份去重。 */
    private void publishReward(Receipt receipt) {
        var items = receipt.rewards().stream().map(reward -> new RewardFeedbackService.Item(
                reward.itemId(), reward.quantity())).toList();
        feedback.publishItems(receipt.requestId(), receipt.roleId(), receipt.assetRevision(),
                RewardFeedbackService.Mode.POPUP, items, receipt.requestId());
    }

    /** 拒绝无效持久编号，避免无法关联的请求进入资产事务。 */
    private static void requireRequestId(String requestId) {
        if (requestId == null || !requestId.matches(UUID_PATTERN)) {
            throw reject(HttpStatus.BAD_REQUEST, "INVALID_SMITH_REQUEST");
        }
    }

    /** 部位必须属于实际普通四槽。 */
    private static void requireSlot(int slot) {
        if (slot < 1 || slot > SmithRules.SLOT_COUNT) {
            throw reject(HttpStatus.BAD_REQUEST, "INVALID_SMITH_REQUEST");
        }
    }

    /** 用稳定业务码交给统一信封，失败整笔回滚。 */
    private static ResponseStatusException reject(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
