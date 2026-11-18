/**
 * 精英碎片合成事务。校验名册容量、等级和普通堆叠余额，扣除材料并创建真实英雄。
 * 按原业务键冻结生成结果，响应丢失后可恢复一次，角色状态始终由统一快照交付。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HeroFragmentCombineService {
    /** 角色始终由当前凭证确定，锁内复验有效性。 */
    private final SessionService sessions;
    /** 原角色数据、行锁与资产版本。 */
    private final RoleRepository roles;
    /** 原普通物品堆叠消费入口，余额不足不扣除。 */
    private final InventoryService inventory;
    /** 名册真实占用及 VIP 上限。 */
    private final HeroCapacityService capacity;
    /** 同源的配方与权重池。 */
    private final HeroFragmentRules rules;
    /** 通用发奖和真实英雄实例事务。 */
    private final RewardGrantService grants;
    /** 同角色原请求成功结果持久入口。 */
    private final JdbcTemplate jdbc;
    /** 共享回执摘要和协议整数范围检查。 */
    private final RewardReceiptPayloads payloads;

    /** 客户端只提交消耗配置ID、合成次数和原业务键。 */
    public record Request(String requestId, int itemId, int quantity) {}

    /** 原实际结果，含本次真实消耗数量与发放的每个独立英雄。 */
    public record Receipt(int schemaVersion, String requestId, String receiptId, String roleId, long assetRevision,
                          int itemId, int quantity, long costQuantity, RewardGrantResult actual) {}

    /** 查询指定原请求的冻结回执，不重新发奖。 */
    public record Status(String requestId, boolean found, Receipt receipt) {}

    /** 明确的已知业务失败，由连接层给客户端原码。 */
    public static class Rejected extends IllegalArgumentException {
        /** 客户端按原因决定保留或清理原持久意图。 */
        private final String code;

        /** 保存可展示的失败原因。 */
        public Rejected(String code, String message) {
            super(message);
            this.code = code;
        }

        /** 返回稳定的业务拒绝码。 */
        public String code() {
            return code;
        }
    }

    /** 注入原领域服务，不维护独立的名册和库存状态。 */
    public HeroFragmentCombineService(SessionService sessions, RoleRepository roles, InventoryService inventory,
            HeroCapacityService capacity, HeroFragmentRules rules, RewardGrantService grants, JdbcTemplate jdbc,
            RewardReceiptPayloads payloads) {
        this.sessions = sessions;
        this.roles = roles;
        this.inventory = inventory;
        this.capacity = capacity;
        this.rules = rules;
        this.grants = grants;
        this.jdbc = jdbc;
        this.payloads = payloads;
    }

    /** 共用角色锁，原键重试优先；新请求扣料、发放与存回执要么全部提交，要么全部回滚。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt combine(String token, Request request) {
        if (request == null || request.itemId() <= 0 || !validQuantity(request.quantity())) {
            throw new Rejected("FRAGMENT_INVALID", "碎片配置或合成数量无效");
        }
        String role = authorize(token, request.requestId());
        var previous = load(role, request.requestId());
        if (previous != null) {
            if (previous.itemId() != request.itemId() || previous.quantity() != request.quantity()) {
                throw new Rejected("FRAGMENT_REQUEST_CONFLICT", "合成参数与原请求不一致");
            }
            return previous;
        }
        var recipe = rules.recipe(request.itemId());
        if (recipe == null) {
            throw new Rejected("FRAGMENT_UNSUPPORTED", "该碎片暂不可合成");
        }
        if (roles.findById(role).orElseThrow().level() < recipe.requiredLevel()) {
            throw new Rejected("FRAGMENT_LEVEL_REQUIRED", "角色需达到" + recipe.requiredLevel() + "级才能合成");
        }
        if (!capacity.hasRoom(role, request.quantity())) {
            throw new Rejected("FRAGMENT_CAPACITY_FULL", "英雄名册剩余容量不足");
        }
        long cost = Math.multiplyExact((long) recipe.costPerHero(), request.quantity());
        if (!inventory.debit(role, request.itemId(), cost)) {
            throw new Rejected("FRAGMENT_INSUFFICIENT", "碎片数量不足");
        }

        var random = ThreadLocalRandom.current();
        var plan = new ArrayList<RewardGrantService.Reward>(request.quantity());
        for (int index = 0; index < request.quantity(); index++) {
            plan.add(new RewardGrantService.Reward(recipe.draw(random), 1));
        }
        var actual = grants.grant(role, plan, new RewardGrantService.Context(Instant.now().getEpochSecond(), 0), random);
        var receipt = new Receipt(1, request.requestId(), UUID.randomUUID().toString(), role, roles.revision(role),
                request.itemId(), request.quantity(), cost, actual);
        validate(receipt, role, request.requestId(), receipt.receiptId());
        var frozen = payloads.freeze(receipt);
        jdbc.update("INSERT INTO game_hero_fragment_combination(role_id,request_id,receipt_id,payload_json,payload_hash) "
                + "VALUES (?,?,?,?,?)", role, receipt.requestId(), receipt.receiptId(), frozen.json(), frozen.hash());
        return receipt;
    }

    /** 查本角色该编号的冻结结果，没有记录时不猜测是否发过。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Status status(String token, String requestId) {
        var receipt = load(authorize(token, requestId), requestId);
        return new Status(requestId, receipt != null, receipt);
    }

    /** 锁前后检查会话，客户端不能指定要扣除材料的角色。 */
    private String authorize(String token, String requestId) {
        if (!RewardReceiptPayloads.validId(requestId)) {
            throw new Rejected("FRAGMENT_INVALID", "碎片合成请求编号无效");
        }
        String role = sessions.requireRole(token);
        roles.lock(role);
        sessions.requireRole(token);
        return role;
    }

    /** 读取原回执并验证并发重试用的业务键及归属，不依赖新的随机或配置。 */
    private Receipt load(String role, String requestId) {
        return jdbc.query("SELECT receipt_id,payload_json,payload_hash FROM game_hero_fragment_combination "
                + "WHERE role_id=? AND request_id=?", result -> {
                    if (!result.next()) {
                        return null;
                    }
                    var receipt = payloads.read(result.getString("payload_json"), result.getString("payload_hash"), Receipt.class);
                    validate(receipt, role, requestId, result.getString("receipt_id"));
                    return receipt;
                }, role, requestId);
    }

    /** 回执保存时校验真实英雄数量，恢复时校验原结果而不重新抽奖。 */
    private static void validate(Receipt receipt, String role, String requestId, String receiptId) {
        if (receipt == null || receipt.schemaVersion() != 1 || !requestId.equals(receipt.requestId())
                || !RewardReceiptPayloads.validId(receiptId) || !receiptId.equals(receipt.receiptId())
                || !role.equals(receipt.roleId()) || receipt.assetRevision() <= 0 || receipt.itemId() <= 0
                || !validQuantity(receipt.quantity()) || receipt.costQuantity() <= 0 || receipt.actual() == null
                || !role.equals(receipt.actual().roleId()) || receipt.actual().heroes().size() != receipt.quantity()) {
            throw new IllegalStateException("碎片合成回执不完整或归属错误");
        }
    }

    /** 正数次数必须能由原发奖事务一次完成，不截断或拆成不同回执。 */
    private static boolean validQuantity(int quantity) {
        return quantity > 0 && quantity <= HeroGrantService.MAX_GRANT_QUANTITY;
    }
}
