/**
 * 英雄召唤写事务。服务端按同次角色锁读取免费资格、券、钻石和高级保底，
 * 以角色级请求编号冻结结果，失败时回滚扣费、奖品与高级进度。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.HeroSummonRules.Advanced;
import com.funsgamex.mxzg.hero.HeroSummonRules.Pool;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HeroSummonService {
    /** JS 协议整数的精确上限，金额和服务器时间不得溢出。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
    /** 高级召唤积累的旧祈愿道具，可在背包快照查看。 */
    private static final int PRAYER_ITEM = 900303;

    /** 事务锁前后校验当前凭证。 */
    private final SessionService sessions;
    /** 角色锁、钱包和同事务资产版本。 */
    private final RoleRepository roles;
    /** 保存各次召唤结果和高级历史。 */
    private final JdbcTemplate jdbc;
    /** 含 VIP 的英雄名册实际容量入口。 */
    private final HeroCapacityService capacity;
    /** 提供策划配置、抽取和保底规则。 */
    private final HeroSummonRules rules;
    /** 实际创建英雄和发放策划积分。 */
    private final RewardGrantService grants;
    /** 读余额和条件扣除道具。 */
    private final InventoryService inventory;
    /** 校验冻结回执格式和完整性。 */
    private final RewardReceiptPayloads payloads;
    /** 普通和高级召唤免费时点及实际奖励共用的时钟。 */
    private final GameClock clock;

    /** 快照按真实持久资格显示免费、积分和祈愿，旧回执允许缺少新增字段。 */
    public record State(int schemaVersion, boolean firstNormalCompleted, long normalFreeAtSeconds,
                        Long advancedFreeAtSeconds, Boolean pointsExchangeAvailable, Long pointRechargeRequired,
                        Integer pointsCost, Long prayerEndsAtSeconds) {
        /** 构造已有普通单抽格式，用于缺少扩展的持久回执。 */
        public State(int schemaVersion, boolean firstNormalCompleted, long normalFreeAtSeconds) {
            this(schemaVersion, firstNormalCompleted, normalFreeAtSeconds, null, null, null, null, null);
        }

        /** 拒绝坏版本、溢出时间和互相矛盾的普通首抽状态。 */
        public State {
            if (schemaVersion != 1 || normalFreeAtSeconds < 0 || normalFreeAtSeconds > MAX_SAFE_INTEGER
                    || firstNormalCompleted != (normalFreeAtSeconds > 0)
                    || advancedFreeAtSeconds != null && (advancedFreeAtSeconds < 0
                    || advancedFreeAtSeconds > MAX_SAFE_INTEGER)) {
                throw new IllegalStateException("英雄召唤冷却和资格无效");
            }
        }

        /** 使用更新的普通冷却和当前服务端附加资格重新形成回执。 */
        public State withNormalFreeAt(long value) {
            return new State(schemaVersion, value > 0, value, advancedFreeAtSeconds,
                    pointsExchangeAvailable, pointRechargeRequired, pointsCost, prayerEndsAtSeconds);
        }
    }

    /** 历史普通单抽的不可变回执格式，既有持久记录继续读取。 */
    public record Receipt(int schemaVersion, String requestId, String receiptId, String roleId, long assetRevision,
                          State state, RewardGrantResult actual) {}

    /** 新通用召唤回执，按原业务池和次数返回真实英雄及发放明细。 */
    public record DrawReceipt(int schemaVersion, String requestId, String receiptId, String roleId, long assetRevision,
                              State state, RewardGrantResult actual, Pool pool, int count) {}

    /** 旧首抽回执查询结果。 */
    public record Status(String requestId, boolean found, Receipt receipt) {}

    /** 积分兑换依赖实际累计充值和解锁神职。 */
    private record Entitlement(long totalRecharge, int clergyLevel) {}

    /** 数据库中的不可变新回执与已同意的扣费上限。 */
    private record ExistingDraw(String pool, int count, long maxDiamonds, String receiptId, long revision,
                                String json, String hash) {}

    /** 可交付给客户端的召唤业务拒绝。 */
    public static class Rejected extends IllegalArgumentException {
        /** 业务拒绝的稳定错误码。 */
        private final String code;

        /** 保存未提交的业务拒绝原因。 */
        public Rejected(String code, String message) {
            super(message);
            this.code = code;
        }

        /** 返回协议错误码。 */
        public String code() {
            return code;
        }
    }

    /** 注入共享角色锁、发奖、背包、回执入口和召唤冷却时钟。 */
    public HeroSummonService(SessionService sessions, RoleRepository roles, JdbcTemplate jdbc,
            HeroCapacityService capacity, HeroSummonRules rules, RewardGrantService grants,
            InventoryService inventory, RewardReceiptPayloads payloads, GameClock clock) {
        this.sessions = sessions;
        this.roles = roles;
        this.jdbc = jdbc;
        this.capacity = capacity;
        this.rules = rules;
        this.grants = grants;
        this.inventory = inventory;
        this.payloads = payloads;
        this.clock = clock;
    }

    /** 旧普通单抽入口，同一请求仍使用原发奖和旧回执格式。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt summon(String token, String requestId) {
        return drawNormal(authorize(token, requestId), requestId, false);
    }

    /** 历史免费首抽入口仅允许原领用或原请求回放。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt first(String token, String requestId) {
        return drawNormal(authorize(token, requestId), requestId, true);
    }

    /** 新召唤入口按游戏时钟与授权金额扣费，同角色同请求只允许同参数回放。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DrawReceipt draw(String token, String requestId, Pool pool, int count, long maxDiamonds) {
        if (pool == null || count != 1 && count != 10 || pool == Pool.POINTS && count != 1
                || maxDiamonds < 0 || maxDiamonds > MAX_SAFE_INTEGER
                || pool != Pool.ADVANCED && maxDiamonds != 0) {
            throw new Rejected("SUMMON_INVALID", "召唤池、次数或钻石确认金额无效");
        }
        String role = authorize(token, requestId);
        if (pool == Pool.NORMAL && count == 1) {
            var normal = drawNormal(role, requestId, false);
            return new DrawReceipt(1, requestId, normal.receiptId(), role, normal.assetRevision(),
                    normal.state(), normal.actual(), pool, count);
        }
        var existing = findDraw(role, requestId);
        if (existing != null) {
            return replayDraw(existing, role, requestId, pool, count, maxDiamonds);
        }
        if (loadNormal(role, requestId, false) != null) {
            throw new Rejected("SUMMON_REQUEST_CONFLICT", "召唤编号已用于普通单抽");
        }
        requireCapacity(role, count);
        var offer = rules.offer(pool, count);
        long now = clock.epochSeconds();
        var random = ThreadLocalRandom.current();
        var plan = new ArrayList<>(offer.points());
        List<Integer> heroes;
        if (pool == Pool.ADVANCED) {
            var progress = loadAdvanced(role);
            progress = chargeAdvanced(role, offer, count, maxDiamonds, now, progress);
            var draw = rules.advanced(progress, count, random);
            heroes = draw.heroes();
            saveAdvanced(role, draw.progress());
            long freePrayerSpace = rules.prayerCost() - quantity(role, PRAYER_ITEM);
            if (freePrayerSpace > 0) {
                plan.add(new RewardGrantService.Reward(PRAYER_ITEM, Math.min(count, freePrayerSpace)));
            }
        } else {
            chargeItems(role, pool, offer);
            var selected = new ArrayList<Integer>(count);
            for (int index = 0; index < count; index++) {
                selected.add(rules.hero(pool, false, random));
            }
            heroes = selected;
        }
        for (int hero : heroes) {
            plan.add(new RewardGrantService.Reward(hero, 1));
        }
        var actual = grants.grant(role, plan, new RewardGrantService.Context(now, 0), random);
        actual = inDrawOrder(actual, heroes);
        var receipt = new DrawReceipt(1, requestId, UUID.randomUUID().toString(), role,
                roles.revision(role), current(role), actual, pool, count);
        validate(1, receipt.requestId(), receipt.receiptId(), role, receipt.assetRevision(),
                receipt.state(), receipt.actual(), count);
        var frozen = payloads.freeze(receipt);
        jdbc.update("INSERT INTO game_hero_summon_receipt(role_id,request_id,pool,summon_count,max_diamonds,receipt_id,"
                        + "asset_revision,payload_json,payload_hash) VALUES (?,?,?,?,?,?,?,?,?)",
                role, requestId, pool.name(), count, maxDiamonds, receipt.receiptId(), receipt.assetRevision(),
                frozen.json(), frozen.hash());
        return receipt;
    }

    /** 旧首抽状态协议只回放本角色的第一次普通单抽。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Status status(String token, String requestId) {
        String role = authorize(token, requestId);
        var receipt = loadNormal(role, requestId, true);
        return new Status(requestId, receipt != null, receipt);
    }

    /** 登录与资产快照读取该角色的持久免费及门槛状态。 */
    @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
    public State current(String role) {
        var times = jdbc.queryForList("SELECT normal_free_at_seconds FROM game_hero_normal_summon WHERE role_id=? "
                        + "ORDER BY asset_revision DESC LIMIT 1",
                Long.class, role);
        long normal = times.isEmpty() ? 0 : times.getFirst();
        var entitlement = entitlement(role);
        // 祈愿购买尚无可信到账入口；积攒的道具展示在普通背包快照。
        return new State(1, normal > 0, normal, loadAdvanced(role).freeAt(),
                entitlement.totalRecharge() >= rules.pointRechargeRequired(), rules.pointRechargeRequired(),
                rules.pointsCost(entitlement.clergyLevel()), 0L);
    }

    /** 普通单抽按游戏时间判断免费与用券，沿用原表保存唯一回执。 */
    private Receipt drawNormal(String role, String requestId, boolean firstOnly) {
        if (findDraw(role, requestId) != null) {
            throw new Rejected("SUMMON_REQUEST_CONFLICT", "召唤编号已用于另一种召唤");
        }
        var previous = loadNormal(role, requestId, firstOnly);
        if (previous != null) {
            return previous;
        }
        var previousState = current(role);
        boolean first = !previousState.firstNormalCompleted();
        if (firstOnly && !first) {
            throw new Rejected("SUMMON_ALREADY_COMPLETED", "普通免费首抽已完成");
        }
        requireCapacity(role, 1);
        long now = clock.epochSeconds();
        long freeAt = previousState.normalFreeAtSeconds();
        if (now >= freeAt) {
            freeAt = rules.nextFreeAt(now);
        } else if (!inventory.debit(role, rules.ticket().itemId(), rules.ticket().quantity())) {
            throw new Rejected("SUMMON_TICKET_INSUFFICIENT", "普通召唤券不足");
        }
        var state = previousState.withNormalFreeAt(freeAt);
        var random = ThreadLocalRandom.current();
        var actual = grants.grant(role, rules.rewards(first, random), new RewardGrantService.Context(now, 0), random);
        var receipt = new Receipt(1, requestId, UUID.randomUUID().toString(), role, roles.revision(role), state, actual);
        validate(1, receipt.requestId(), receipt.receiptId(), role, receipt.assetRevision(), state, actual, 1);
        var frozen = payloads.freeze(receipt);
        jdbc.update("INSERT INTO game_hero_normal_summon(role_id,request_id,first_draw,receipt_id,asset_revision,"
                        + "normal_free_at_seconds,payload_json,payload_hash) VALUES (?,?,?,?,?,?,?,?)",
                role, requestId, first, receipt.receiptId(), receipt.assetRevision(), freeAt, frozen.json(), frozen.hash());
        return receipt;
    }

    /** 高级享受独立免费时间，券优先并在扣除前检查已同意的钻石上限。 */
    private Advanced chargeAdvanced(String role, HeroSummonRules.Offer offer, int count, long maxDiamonds, long now,
                                    Advanced progress) {
        if (count == 1 && now >= progress.freeAt()) {
            return progress.withFreeAt(Math.addExact(now, offer.freeSeconds()));
        }
        int item = offer.cost().itemId();
        long tickets = Math.min(offer.cost().quantity(), quantity(role, item));
        long diamonds = Math.multiplyExact(offer.cost().quantity() - tickets, rules.diamondPerTicket(count));
        if (diamonds > maxDiamonds) {
            throw new Rejected("SUMMON_DIAMOND_CONFIRM_REQUIRED", "召唤券不足，请确认钻石消耗");
        }
        if (diamonds > 0 && !roles.debitDiamonds(role, diamonds)) {
            throw new Rejected("SUMMON_DIAMONDS_INSUFFICIENT", "钻石不足");
        }
        if (tickets > 0 && !inventory.debit(role, item, tickets)) {
            throw new IllegalStateException("角色锁内高级召唤券数量发生变化");
        }
        return progress;
    }

    /** 普通十连、友情和积分兑换扣除实际道具；积分要先验证累计实付。 */
    private void chargeItems(String role, Pool pool, HeroSummonRules.Offer offer) {
        long cost = offer.cost().quantity();
        if (pool == Pool.POINTS) {
            var value = entitlement(role);
            if (value.totalRecharge() < rules.pointRechargeRequired()) {
                throw new Rejected("SUMMON_POINTS_RECHARGE_REQUIRED", "累计充值未达到积分召唤条件");
            }
            cost = rules.pointsCost(value.clergyLevel());
        }
        if (inventory.debit(role, offer.cost().itemId(), cost)) {
            return;
        }
        throw switch (pool) {
            case NORMAL -> new Rejected("SUMMON_TICKET_INSUFFICIENT", "普通召唤券不足");
            case FRIENDSHIP -> new Rejected("SUMMON_FRIENDSHIP_INSUFFICIENT", "友情点不足");
            case POINTS -> new Rejected("SUMMON_POINTS_INSUFFICIENT", "召唤积分不足");
            case ADVANCED -> new IllegalStateException("高级召唤必须走确认扣费入口");
        };
    }

    /** 按原抽取顺序交付英雄实例，公共奖励合并的物品行仍保留真实到账额。 */
    private RewardGrantResult inDrawOrder(RewardGrantResult actual, List<Integer> order) {
        var byTemplate = new HashMap<Integer, ArrayDeque<HeroGrantService.Granted>>();
        for (var hero : actual.heroes()) {
            byTemplate.computeIfAbsent(hero.templateId(), ignored -> new ArrayDeque<>()).add(hero);
        }
        var heroes = order.stream().map(template -> byTemplate.get(template).remove()).toList();
        return new RewardGrantResult(actual.roleId(), actual.items(), actual.wallet(), actual.stacks(),
                actual.experience(), actual.tavern(), actual.bonuses(), actual.timedItems(), actual.spirits(), heroes);
    }

    /** 账户身份变更后不得继续使用已获得的角色锁提交旧请求。 */
    private String authorize(String token, String requestId) {
        if (!RewardReceiptPayloads.validId(requestId)) {
            throw new Rejected("SUMMON_INVALID", "召唤请求编号无效");
        }
        String role = sessions.requireRole(token);
        roles.lock(role);
        if (!role.equals(sessions.requireRole(token))) {
            throw new IllegalArgumentException("召唤期间身份失效");
        }
        return role;
    }

    /** 扣费前确认本次全部英雄均有真实入册空间。 */
    private void requireCapacity(String role, int count) {
        if (!capacity.hasRoom(role, count)) {
            throw new Rejected("SUMMON_CAPACITY_FULL", "英雄名册空间不足");
        }
    }

    /** 读取原普通单抽的冻结回执并校验列与摘要。 */
    private Receipt loadNormal(String role, String requestId, boolean firstOnly) {
        return jdbc.query("SELECT receipt_id,asset_revision,normal_free_at_seconds,payload_json,payload_hash "
                + "FROM game_hero_normal_summon WHERE role_id=? AND request_id=?" + (firstOnly ? " AND first_draw=TRUE" : ""), row -> {
                    if (!row.next()) {
                        return null;
                    }
                    var receipt = payloads.read(row.getString("payload_json"), row.getString("payload_hash"), Receipt.class);
                    validate(receipt.schemaVersion(), receipt.requestId(), receipt.receiptId(), role,
                            receipt.assetRevision(), receipt.state(), receipt.actual(), 1);
                    if (!requestId.equals(receipt.requestId()) || !role.equals(receipt.roleId())
                            || !receipt.receiptId().equals(row.getString("receipt_id"))
                            || receipt.assetRevision() != row.getLong("asset_revision")
                            || receipt.state().normalFreeAtSeconds() != row.getLong("normal_free_at_seconds")) {
                        throw new IllegalStateException("普通召唤历史回执字段损坏");
                    }
                    return receipt;
                }, role, requestId);
    }

    /** 从新召唤回执查找编号，保留原业务范围与确认金额。 */
    private ExistingDraw findDraw(String role, String requestId) {
        return jdbc.query("SELECT pool,summon_count,max_diamonds,receipt_id,asset_revision,payload_json,payload_hash "
                + "FROM game_hero_summon_receipt WHERE role_id=? AND request_id=?", row -> row.next()
                ? new ExistingDraw(row.getString("pool"), row.getInt("summon_count"), row.getLong("max_diamonds"),
                    row.getString("receipt_id"), row.getLong("asset_revision"), row.getString("payload_json"),
                    row.getString("payload_hash")) : null, role, requestId);
    }

    /** 仅精确匹配的重发允许取原结果，回放无需再次扣费或增发。 */
    private DrawReceipt replayDraw(ExistingDraw row, String role, String requestId, Pool pool, int count,
                                   long maxDiamonds) {
        if (!row.pool().equals(pool.name()) || row.count() != count || row.maxDiamonds() != maxDiamonds) {
            throw new Rejected("SUMMON_REQUEST_CONFLICT", "召唤编号对应的类型、次数或确认金额已变化");
        }
        var receipt = payloads.read(row.json(), row.hash(), DrawReceipt.class);
        validate(receipt.schemaVersion(), receipt.requestId(), receipt.receiptId(), role,
                receipt.assetRevision(), receipt.state(), receipt.actual(), count);
        if (!requestId.equals(receipt.requestId()) || !role.equals(receipt.roleId())
                || !receipt.receiptId().equals(row.receiptId()) || receipt.assetRevision() != row.revision()
                || receipt.pool() != pool || receipt.count() != count) {
            throw new IllegalStateException("召唤历史回执字段损坏");
        }
        return receipt;
    }

    /** 校验回执归属、资产版本和真实新增英雄个数。 */
    private void validate(int version, String requestId, String receiptId, String role, long revision, State state,
                          RewardGrantResult actual, int count) {
        if (version != 1 || !RewardReceiptPayloads.validId(requestId) || !RewardReceiptPayloads.validId(receiptId)
                || revision <= 0 || state == null || actual == null || !role.equals(actual.roleId())
                || actual.heroes().size() != count) {
            throw new IllegalStateException("召唤回执身份、状态或新英雄数量无效");
        }
    }

    /** 已持有角色锁，按真实背包堆叠读取召唤物品余额。 */
    private long quantity(String role, int item) {
        return inventory.find(role, item).map(InventoryService.Item::quantity).orElse(0L);
    }

    /** 读取受信累计实付与持久解锁等级，宝石余额不代表充值。 */
    private Entitlement entitlement(String role) {
        return jdbc.queryForObject("SELECT total_recharge,clergy_level FROM game_role WHERE id=?",
                (row, index) -> new Entitlement(row.getLong("total_recharge"), row.getInt("clergy_level")), role);
    }

    /** 当前英雄高级免费和保底从独立进度读取，缺行表示尚未高级召唤。 */
    private Advanced loadAdvanced(String role) {
        var values = jdbc.query("SELECT * FROM game_hero_summon_progress WHERE role_id=?", (row, index) ->
                new Advanced(row.getLong("advanced_free_at_seconds"), row.getLong("advanced_singles"),
                        row.getLong("advanced_tens"), row.getLong("advanced_draws"),
                        row.getInt("advanced_without_five"), row.getInt("advanced_since_four"),
                        row.getInt("advanced_since_five")), role);
        return values.isEmpty() ? Advanced.initial() : values.getFirst();
    }

    /** 在同一角色锁内写入高级保底进度，不依赖数据库方言的 upsert。 */
    private void saveAdvanced(String role, Advanced value) {
        if (jdbc.update("""
                UPDATE game_hero_summon_progress SET advanced_free_at_seconds=?,advanced_singles=?,advanced_tens=?,
                    advanced_draws=?,advanced_without_five=?,advanced_since_four=?,advanced_since_five=? WHERE role_id=?
                """, value.freeAt(), value.singles(), value.tens(), value.total(), value.withoutFive(),
                value.sinceFour(), value.sinceFive(), role) == 0) {
            jdbc.update("""
                    INSERT INTO game_hero_summon_progress(advanced_free_at_seconds,advanced_singles,advanced_tens,
                        advanced_draws,advanced_without_five,advanced_since_four,advanced_since_five,role_id)
                    VALUES (?,?,?,?,?,?,?,?)
                    """, value.freeAt(), value.singles(), value.tens(), value.total(), value.withoutFive(),
                    value.sinceFour(), value.sinceFive(), role);
        }
    }
}
