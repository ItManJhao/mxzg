/**
 * 主阵容当前战力、布阵草稿预估、公开投影和历史峰值，供角色快照与各玩法共用。
 * 复用同一英雄快照的原属性，应用真实主队元素光环后逐人计分。
 */
package com.funsgamex.mxzg.hero;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HeroMainPowerService {
    /** 草稿评分的上阵人数上限，助战格位不属于该列表。 */
    public static final int MAX_DRAFT_HEROES = 6;
    /** 当前草稿编号及新版英雄实例均使用小写 UUID。 */
    private static final String UUID_PATTERN = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
    /** 草稿通过认证凭证读取当前角色，不接受外部角色 ID。 */
    private final SessionService sessions;
    /** 鉴权并锁定当前角色，读取同一版本的持久阵容。 */
    private final HeroBattleInputService inputs;
    /** 当前主阵容的个人面板分值，修改后走已有角色锁读取。 */
    private final HeroRepository heroes;
    /** 当前主阵容投影与历史峰值的角色持久化入口。 */
    private final RoleRepository roles;
    /** 玩家公开战力与实际战斗共用的元素光环规则。 */
    private final HeroBattleElementRules elements;
    /** 逐英雄按同源评分阈值换算战力。 */
    private final HeroPowerRules powers;
    /** 主阵容战力峰值写入后通知任务领域，始终使用持久战力。 */
    private final ApplicationEventPublisher events;

    /** 队伍总分、逐英雄分值与输入版本；pending非空时不能声称完整还原旧服战力。 */
    public record State(long assetRevision, long lineupVersion, int total,
                        Map<String, Integer> heroes, List<String> pending) {
        /** 评分是只读投影，调用者不能修改持久状态或覆盖缺口。 */
        public State {
            heroes = Map.copyOf(heroes);
            pending = List.copyOf(pending);
        }
    }

    /** 当前阵容战力和历史峰值分别用于当前是否有阵容及旧金币副本门槛。 */
    public record Measured(int current, int maximum) {}

    /** 同次只读评分及原草稿顺序，资产版本对应于该次读取。 */
    public record DraftPower(String requestId, List<String> heroIds, int power, long assetRevision) {
        /** 冻结原英雄顺序，客户端可丢弃已过期草稿的结果。 */
        public DraftPower {
            heroIds = List.copyOf(heroIds);
        }
    }

    /** 注入认证、阵容、英雄和评分规则，草稿与保存后的队伍共用同一口径。 */
    public HeroMainPowerService(SessionService sessions, HeroBattleInputService inputs, HeroRepository heroes, RoleRepository roles,
                                HeroBattleElementRules elements, HeroPowerRules powers, ApplicationEventPublisher events) {
        this.sessions = sessions;
        this.inputs = inputs;
        this.heroes = heroes;
        this.roles = roles;
        this.elements = elements;
        this.powers = powers;
        this.events = events;
    }

    /** 在角色锁内同步当前值和记录峰值，刷新纪录才通知任务领域。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public Measured observe(String roleId) {
        int current = readCurrentForRole(roleId);
        var observed = roles.observeMainPower(roleId, current);
        if (observed.increased()) {
            events.publishEvent(new QuestProgressEvent(roleId, QuestMetric.ROLE_MAX_FIGHTING));
        }
        return new Measured(current, observed.maximum());
    }

    /** 同一角色锁内读取并评分本人草稿，回显一次性请求编号；不写阵容或战力记录。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public DraftPower previewDraft(String token, String requestId, List<String> heroIds) {
        if (!validId(requestId) || heroIds == null || heroIds.size() > MAX_DRAFT_HEROES
                || heroIds.stream().anyMatch(id -> !validId(id))
                || new HashSet<>(heroIds).size() != heroIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "FORMATION_POWER_INVALID");
        }
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        sessions.requireRole(token);
        if (heroIds.isEmpty()) {
            return new DraftPower(requestId, heroIds, 0, roles.revision(roleId));
        }

        var owned = new HashMap<String, HeroProfile>();
        for (var hero : heroes.list(roleId)) {
            owned.put(hero.id(), hero);
        }
        var team = new ArrayList<HeroProfile>(heroIds.size());
        for (String id : heroIds) {
            var hero = owned.get(id);
            if (hero == null) {
                // 过期和非本人实例同样拒绝，禁止回部分分值或透露其他玩家资产。
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "FORMATION_POWER_INVALID");
            }
            team.add(hero);
        }
        return new DraftPower(requestId, heroIds, total(scoreTeam(team)), roles.revision(roleId));
    }

    /** 规范实例与请求编号，防止同一个编号使用不同文本表示。 */
    private static boolean validId(String id) {
        return id != null && id.matches(UUID_PATTERN);
    }

    /** 公会遇到未计算的旧角色时，只读其真实主队。调用方提供一致读事务，不锁定或修改目标角色。 */
    public int readCurrentForRole(String roleId) {
        return totalDeployed(heroes.list(roleId));
    }

    /** 调用方在角色锁内取得当前名册，补齐当前值，避免快照再次读取或组装战斗输入。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public void projectCurrentFromRoster(String roleId, List<HeroProfile> roster) {
        roles.projectCurrentMainPower(roleId, totalDeployed(roster));
    }

    /**
     * 在同一角色事务读取已保存队伍，元素光环合入各英雄原属性再逐英雄计分。
     * 当前仅含已恢复属性来源；后续挑战必须保留范围校验，不能只看战力达到门槛。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State current(String token) {
        var input = inputs.current(token);
        var team = input.units().stream().map(HeroBattleInputService.Unit::hero).toList();
        var scores = scoreTeam(team);
        var pending = new LinkedHashSet<String>();
        for (var hero : team) {
            pending.addAll(hero.panelStats().pendingSources());
        }
        return new State(input.assetRevision(), input.lineupVersion(), total(scores), scores, List.copyOf(pending));
    }

    /** 从名册的真实上阵标记挑选主战成员，沿公共队伍规则计分。 */
    private int totalDeployed(List<HeroProfile> roster) {
        return total(scoreTeam(roster.stream().filter(HeroProfile::deployed).toList()));
    }

    /** 同一份队伍光环应用到各自个人属性，不使用含格位或临时状态的战斗输入属性。 */
    private Map<String, Integer> scoreTeam(List<HeroProfile> team) {
        var aura = elements.teamAura(team.stream().map(HeroProfile::templateId).toList());
        var scores = new LinkedHashMap<String, Integer>();
        for (var hero : team) {
            var panel = hero.panelStats();
            int score = aura.isEmpty() ? panel.power()
                : powers.score(HeroBattleElementRules.applyAura(panel.rawAttributes(), aura));
            if (scores.put(hero.id(), score) != null) {
                throw new IllegalStateException("主线队伍英雄重复");
            }
        }
        return scores;
    }

    /** 对已经逐人换算的战力求和，空队伍为0，拒绝超出协议范围的和。 */
    private static int total(Map<String, Integer> scores) {
        return scores.values().stream().reduce(0, Math::addExact);
    }
}
