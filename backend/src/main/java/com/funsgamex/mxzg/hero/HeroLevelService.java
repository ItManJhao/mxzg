/**
 * 普通英雄升级及原收据查询，由登录长连接调用。
 * 在同一角色锁事务内扣除金币和英雄经验、提升等级、落原收据及共享快照版本。升阶和升星归各自业务。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HeroLevelService {
    /** 原请求 UUID 用于复查，前置等级用于拒绝旧页面提交，levels 为单笔计划的升级级数。 */
    public record Request(String requestId, int expectedLevel, int levels) {
        /** 单级领域调用走与批量相同的事务及原参数校验。 */
        public Request(String requestId, int expectedLevel) {
            this(requestId, expectedLevel, 1);
        }
    }

    /** 原提交等级和快照版本；历史未带版号的收据沿用迁移值 0。 */
    public record Receipt(String requestId, String heroId, int fromLevel, int toLevel, String configVersion,
            long assetRevision, String roleId) {}

    /** 只读查询结果；未提交的原编号明确返回 found=false。 */
    public record Status(String requestId, boolean found, Receipt receipt) {}

    /** 领域预览给出准确单级成本和基础属性，用于规则检查。 */
    public record Preview(HeroProfile hero, int stage, int levelLimit, HeroGrowthRules.Stats current,
            HeroGrowthRules.Stats next, HeroGrowthRules.Cost cost, long gold, long experience, String status,
            String configVersion) {}

    /** 旧物品配置中的英雄经验，属于可累积库存。 */
    private static final int EXPERIENCE_ITEM_ID = 900101;
    /** UUID 与协议、持久存储约束一致，数值形态的标识不接受。 */
    private static final String UUID_PATTERN = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
    /** 当前请求角色由凭证决定，在取得锁后再次检查。 */
    private final SessionService sessions;
    /** 唯一角色锁、金币余额与快照版本读取入口。 */
    private final RoleRepository roles;
    /** 用认证角色与英雄实例联合查询。 */
    private final HeroRepository heroes;
    /** 用当前库存扣除真实英雄经验。 */
    private final InventoryService inventory;
    /** 等阶上限、跳级总量、逐级价格和基础数值使用策划配置。 */
    private final HeroGrowthRules rules;
    /** 原收据持久化与等级条件更新入口。 */
    private final JdbcTemplate jdbc;
    /** 同一事务复用唯一资产版本，提交后由统一快照分发。 */
    private final AssetSyncService sync;

    /** 注入角色权威数据源与原事务版本出口。 */
    public HeroLevelService(SessionService sessions, RoleRepository roles, HeroRepository heroes,
            InventoryService inventory, HeroGrowthRules rules, JdbcTemplate jdbc, AssetSyncService sync) {
        this.sessions = sessions;
        this.roles = roles;
        this.heroes = heroes;
        this.inventory = inventory;
        this.rules = rules;
        this.jdbc = jdbc;
        this.sync = sync;
    }

    /** 预览也在角色锁内取一致的等级/钱包/库存快照，不从客户端接收可信数值。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Preview preview(String token, String heroId) {
        String role = authorizeLocked(token);
        var hero = requireHero(role, heroId);
        int stage = hero.stage();
        int limit = rules.limit(hero.level(), stage, hero.star());
        var current = hero.baseStats();
        long gold = roles.findById(role).orElseThrow().gold();
        long experience = inventory.list(role).stream()
                .filter(item -> item.itemId() == EXPERIENCE_ITEM_ID).mapToLong(InventoryService.Item::quantity).sum();
        if (hero.level() >= limit) {
            return new Preview(hero, stage, limit, current, null, null, gold, experience, "LEVEL_LIMIT", rules.version());
        }
        var cost = rules.cost(hero.level());
        String status = "READY";
        if (gold < cost.gold()) {
            status = "INSUFFICIENT_GOLD";
        } else if (experience < cost.experience()) {
            status = "INSUFFICIENT_HERO_EXP";
        }
        var next = rules.stats(hero.templateId(), hero.star(), hero.level() + 1, stage);
        return new Preview(hero, stage, limit, current, next, cost, gold, experience, status, rules.version());
    }

    /** 单次提交原等级及升级级数，按旧规则整笔计算。重复请求返回原收据，失败回滚所有变化。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Receipt upgrade(String token, String heroId, Request request) {
        String role = authorizeLocked(token);
        if (request == null || !validId(request.requestId()) || !validId(heroId)
                || request.expectedLevel() <= 0 || request.levels() <= 0) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_UPGRADE_REQUEST");
        }
        var previous = loadReceipt(role, request.requestId());
        if (previous != null) {
            if (!previous.heroId().equals(heroId) || previous.fromLevel() != request.expectedLevel()
                    || previous.toLevel() - previous.fromLevel() != request.levels()) {
                throw error(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
            }
            return previous;
        }
        if (request.levels() > rules.levelJumpMax()) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_UPGRADE_REQUEST");
        }
        var hero = requireHero(role, heroId);
        int from = hero.level();
        if (from != request.expectedLevel()) {
            throw error(HttpStatus.CONFLICT, "HERO_LEVEL_CHANGED");
        }
        if ((long) from + request.levels() > rules.limit(from, hero.stage(), hero.star())) {
            throw error(HttpStatus.CONFLICT, "LEVEL_LIMIT");
        }
        int to = from + request.levels();
        var cost = rules.costBetween(from, to);
        if (!roles.debitGold(role, cost.gold())) {
            throw error(HttpStatus.CONFLICT, "INSUFFICIENT_GOLD");
        }
        if (!inventory.debit(role, EXPERIENCE_ITEM_ID, cost.experience())) {
            throw error(HttpStatus.CONFLICT, "INSUFFICIENT_HERO_EXP");
        }
        if (jdbc.update("UPDATE game_hero SET hero_level=? WHERE role_id=? AND id=? AND hero_level=?",
                to, role, heroId, from) != 1) {
            throw error(HttpStatus.CONFLICT, "HERO_LEVEL_CHANGED");
        }
        sync.changed(role);
        var receipt = new Receipt(request.requestId(), heroId, from, to, rules.version(), roles.revision(role), role);
        jdbc.update("INSERT INTO game_hero_level_request(role_id,request_id,hero_id,from_level,to_level,"
                + "config_version,asset_revision) VALUES (?,?,?,?,?,?,?)",
                role, receipt.requestId(), heroId, from, to, receipt.configVersion(), receipt.assetRevision());
        return receipt;
    }

    /** 只查该认证角色的原提交收据，曾用过的原编号可在当前角色重登后查询。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Status status(String token, String requestId) {
        String role = authorizeLocked(token);
        if (!validId(requestId)) {
            throw error(HttpStatus.BAD_REQUEST, "INVALID_UPGRADE_REQUEST");
        }
        var receipt = loadReceipt(role, requestId);
        return new Status(requestId, receipt != null, receipt);
    }

    /** 持有真实角色锁后重读凭证，防止等待期间已被撤销的会话提交修改。 */
    private String authorizeLocked(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        if (!role.equals(sessions.requireRole(token))) {
            throw error(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        return role;
    }

    /** 读取当前角色拥有的唯一英雄实例，其他角色的英雄与缺失实例等价。 */
    private HeroProfile requireHero(String role, String heroId) {
        return heroes.find(role, heroId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "HERO_NOT_FOUND"));
    }

    /** 按角色和原请求键读取原来等级与提交版本，同名请求在其他角色上看不到原收据。 */
    private Receipt loadReceipt(String role, String requestId) {
        return jdbc.query("SELECT hero_id,from_level,to_level,config_version,asset_revision "
                + "FROM game_hero_level_request WHERE role_id=? AND request_id=?", rows -> {
                    if (!rows.next()) {
                        return null;
                    }
                    return new Receipt(requestId, rows.getString("hero_id"), rows.getInt("from_level"),
                            rows.getInt("to_level"), rows.getString("config_version"), rows.getLong("asset_revision"), role);
                }, role, requestId);
    }

    /** 校验持久业务标识格式，避免模糊匹配或发生隐式类型转换。 */
    private static boolean validId(String id) {
        return id != null && id.matches(UUID_PATTERN);
    }

    /** 统一业务错误码，连接层按稳定码交付，不包含角色数据。 */
    private static ResponseStatusException error(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
