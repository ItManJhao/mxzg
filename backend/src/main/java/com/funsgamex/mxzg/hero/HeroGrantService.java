/**
 * 可信奖励的英雄实例入库领域，依据旧HeroProcessor和HeroService的奖励创建链。
 * 由共享发奖事务调用，保持模板原星级、一级零阶，加入原角色锁、阵容刷新和统一版本。
 * 奖励沿旧链允许超出名册显示容量；召唤及开发GM的入口限制不归本服务，不开放召唤玩法。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.lineup.MainFormationStateService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class HeroGrantService {
    /** 单笔可信奖励的技术实例上限，不是名册容量，不静默截断或拆发。 */
    public static final int MAX_GRANT_QUANTITY = 1_000;
    /** 本事务写入英雄的唯一连接。 */
    private final JdbcTemplate jdbc;
    /** 原角色锁，实例创建与其他资产使用同一串行化边界。 */
    private final RoleRepository roles;
    /** 同源初始成长校验，不从客户端接收星级或属性。 */
    private final HeroGrowthRules growth;
    /** 新实例提交前刷新原永久阵容资格，不建立另一份名册。 */
    private final MainFormationStateService formations;
    /** 原事务统一版本和提交后状态通知。 */
    private final AssetSyncService sync;
    /** 真实模板到原始星级，只读配置不保存角色实例。 */
    private final Map<Integer, Integer> initialStars;

    /** 本次真实新建实例的冻结展示身份，不是当前英雄完整快照。 */
    public record Granted(String instanceId, int templateId, int level, int star, int stage) {
        /** 拒绝损坏身份或成长，避免成功回执保存无法对应的英雄。 */
        public Granted {
            if (instanceId == null || !instanceId.matches("[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}")
                    || templateId <= 0 || level <= 0 || star <= 0 || stage < 0) {
                throw new IllegalArgumentException("英雄发奖实例身份或成长无效");
            }
        }
    }

    /** 注入原领域依赖，并读取同源英雄模板的初始星级；坏配置在装配时拒绝。 */
    public HeroGrantService(JdbcTemplate jdbc, RoleRepository roles, HeroGrowthRules growth,
            MainFormationStateService formations, AssetSyncService sync, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.roles = roles;
        this.growth = growth;
        this.formations = formations;
        this.sync = sync;
        var stars = new HashMap<Integer, Integer>();
        try (var input = getClass().getResourceAsStream("/gameplay/herotype.json")) {
            if (input == null) {
                throw new IllegalStateException("奖励英雄模板表缺失");
            }
            var rows = mapper.readTree(input).path("rows");
            if (!rows.isArray() || rows.isEmpty()) {
                throw new IllegalStateException("奖励英雄模板表为空");
            }
            for (var row : rows) {
                var type = row.path("type");
                var star = row.path("star");
                if (!type.isIntegralNumber() || !type.canConvertToInt() || type.asInt() <= 0
                        || !star.isIntegralNumber() || !star.canConvertToInt() || star.asInt() <= 0
                        || stars.put(type.asInt(), star.asInt()) != null) {
                    throw new IllegalStateException("奖励英雄模板或原星级无效");
                }
            }
        } catch (java.io.IOException error) {
            throw new IllegalStateException("奖励英雄模板读取失败", error);
        }
        initialStars = Map.copyOf(stars);
    }

    /** 验证真实模板及一级零阶成长，不查角色、不抽样或写实例。 */
    public void requireSupported(int templateId) {
        Integer star = initialStars.get(templateId);
        if (star == null) {
            throw new IllegalArgumentException("奖励英雄模板不存在：" + templateId);
        }
        growth.stats(templateId, star, 1, 0);
    }

    /**
     * 在原角色锁事务创建独立英雄，成功返回原实例身份供同事务冻结回执。
     * 奖励不做旧召唤入口的容量拦截；后续任一发奖失败由外层整体回滚。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<Granted> grant(String roleId, int templateId, int quantity) {
        sync.requireTransaction();
        requireSupported(templateId);
        if (quantity < 1 || quantity > MAX_GRANT_QUANTITY) {
            throw new IllegalArgumentException("英雄奖励单次技术批量超限");
        }
        roles.lock(roleId);
        var created = new ArrayList<Granted>(quantity);
        int star = initialStars.get(templateId);
        for (int index = 0; index < quantity; index++) {
            var hero = new Granted(UUID.randomUUID().toString(), templateId, 1, star, 0);
            jdbc.update("INSERT INTO game_hero(id,role_id,template_id,hero_level,star,stage) VALUES (?,?,?,?,?,?)",
                    hero.instanceId(), roleId, hero.templateId(), hero.level(), hero.star(), hero.stage());
            created.add(hero);
        }
        formations.refresh(roleId);
        sync.changed(roleId);
        return List.copyOf(created);
    }
}
