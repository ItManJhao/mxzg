/** 普通英雄升级用例：会话鉴权、角色锁、持久幂等及资产/等级原子提交，不实现任何升阶或升星。 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.role.*;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HeroLevelService {
    public record Request(String requestId, Integer expectedLevel) {}
    public record Receipt(String requestId, String heroId, int fromLevel, int toLevel, String configVersion) {}
    public record Preview(HeroProfile hero, int stage, int levelLimit, HeroGrowthRules.Stats current,
        HeroGrowthRules.Stats next, HeroGrowthRules.Cost cost, long gold, long experience, String status, String configVersion) {}
    public record Result(Receipt operation, Preview preview, List<HeroProfile> heroes, RoleProfile role, List<InventoryService.Item> inventory) {}
    private final SessionService sessions;
    private final RoleRepository roles;
    private final HeroRepository heroes;
    private final InventoryService inventory;
    private final HeroGrowthRules rules;
    private final JdbcTemplate jdbc;

    /** 注入现有身份/角色/库存入口及唯一基础属性规则，不建立第二份玩家状态。 */
    public HeroLevelService(SessionService sessions, RoleRepository roles, HeroRepository heroes,
        InventoryService inventory, HeroGrowthRules rules, JdbcTemplate jdbc) {
        this.sessions=sessions; this.roles=roles; this.heroes=heroes; this.inventory=inventory; this.rules=rules; this.jdbc=jdbc;
    }

    /** 预览也在角色锁内取一致的等级/钱包/库存快照，不从客户端接收可信数值。 */
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Preview preview(String token, String heroId) {
        String role = sessions.requireRole(token); roles.lock(role); return describe(role, heroId);
    }

    /** 当前角色的准确条件；已到阶上限明确提示需突破，缺配置抛错而不是展示免费升级。 */
    private Preview describe(String roleId, String heroId) {
        var hero = heroes.find(roleId, heroId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "HERO_NOT_FOUND"));
        int stage = jdbc.queryForObject("SELECT stage FROM game_hero WHERE role_id=? AND id=?", Integer.class, roleId, heroId);
        int limit = rules.limit(hero.level(), stage, hero.star());
        var current = rules.stats(hero.templateId(), hero.star(), hero.level(), stage);
        long gold = roles.findById(roleId).orElseThrow().gold();
        long experience = inventory.list(roleId).stream().filter(item -> item.itemId()==900101).mapToLong(InventoryService.Item::quantity).sum();
        if (hero.level() >= limit) return new Preview(hero, stage, limit, current, null, null, gold, experience, "LEVEL_LIMIT", rules.version());
        var cost = rules.cost(hero.level());
        String status = gold < cost.gold() ? "INSUFFICIENT_GOLD" : experience < cost.experience() ? "INSUFFICIENT_HERO_EXP" : "READY";
        return new Preview(hero, stage, limit, current, rules.stats(hero.templateId(), hero.star(), hero.level()+1, stage), cost, gold, experience, status, rules.version());
    }

    /** 同一 requestId 只执行一次；重放保留原收据，但返回锁内最新状态，避免旧资产快照覆盖新操作。 */
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Result upgrade(String token, String heroId, Request request) {
        String role = sessions.requireRole(token);
        if (request == null || request.requestId()==null || !request.requestId().matches("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}")
            || request.expectedLevel()==null || request.expectedLevel()<1) throw error(HttpStatus.BAD_REQUEST, "INVALID_UPGRADE_REQUEST");
        roles.lock(role);
        var previous = jdbc.query("SELECT * FROM game_hero_level_request WHERE role_id=? AND request_id=?",
            (row,index) -> new Receipt(row.getString("request_id"),row.getString("hero_id"),row.getInt("from_level"),row.getInt("to_level"),row.getString("config_version")),role,request.requestId());
        if (!previous.isEmpty()) {
            var receipt = previous.getFirst();
            if (!receipt.heroId().equals(heroId) || receipt.fromLevel()!=request.expectedLevel()) throw error(HttpStatus.CONFLICT,"IDEMPOTENCY_CONFLICT");
            return result(role, receipt);
        }
        var before = describe(role,heroId);
        if (before.hero().level()!=request.expectedLevel()) throw error(HttpStatus.CONFLICT,"HERO_LEVEL_CHANGED");
        if (!before.status().equals("READY")) throw error(HttpStatus.CONFLICT,before.status());
        if (!roles.debitGold(role,before.cost().gold())) throw error(HttpStatus.CONFLICT,"INSUFFICIENT_GOLD");
        if (!inventory.debit(role,900101,before.cost().experience())) throw error(HttpStatus.CONFLICT,"INSUFFICIENT_HERO_EXP");
        int level = before.hero().level();
        if (jdbc.update("UPDATE game_hero SET hero_level=hero_level+1 WHERE role_id=? AND id=? AND hero_level=?",role,heroId,level)!=1)
            throw error(HttpStatus.CONFLICT,"HERO_LEVEL_CHANGED");
        var receipt = new Receipt(request.requestId(),heroId,level,level+1,rules.version());
        jdbc.update("INSERT INTO game_hero_level_request(role_id,request_id,hero_id,from_level,to_level,config_version) VALUES (?,?,?,?,?,?)",
            role,receipt.requestId(),heroId,level,level+1,rules.version());
        return result(role,receipt);
    }

    /** 所有关联快照在同一事务/角色锁中读取；收据的原等级与最新英雄等级语义分开。 */
    private Result result(String role, Receipt receipt) {
        return new Result(receipt,describe(role,receipt.heroId()),heroes.list(role),roles.findById(role).orElseThrow(),inventory.list(role));
    }

    /** 使用稳定错误码作为 ProblemDetail 的 detail，客户端可区分限制、资源与冲突。 */
    private static ResponseStatusException error(HttpStatus status, String code) { return new ResponseStatusException(status,code); }
}
