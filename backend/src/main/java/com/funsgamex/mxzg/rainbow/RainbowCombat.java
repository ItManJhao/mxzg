/**
 * 彩虹圣殿独立布阵及守军战斗。布阵保存限定于当前角色，挑战使用服务端保存的阵容和策划守军。
 * 占位、冷却及战报持久化归外层 RainbowService，战斗执行不自行结算。
 */
package com.funsgamex.mxzg.rainbow;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.ConfiguredEnemy;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.Result;
import com.funsgamex.mxzg.hero.HeroBattleInputService;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroPowerRules;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationRules;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RainbowCombat {
    /** 圣殿最多允许八个战斗位置，九号支援位不参与此玩法。 */
    private static final int LAST_BATTLE_POSITION = 8;

    /** 圣殿独立版本和实际站位。版本零表示从未保存。 */
    public record Formation(long version, int formationId, List<Lineup.Slot> slots) {
        /** 以实际站位冻结本次读取，挑战过程不能反写持久名单。 */
        public Formation {
            slots = List.copyOf(slots);
        }
    }

    /** 原请求号及此次实际提交的圣殿阵容版本。 */
    public record FormationSave(String requestId, Formation formation) {}

    /** 真实战报和出发时战力，供外层挑战事务冻结历史。 */
    public record Preview(Result battle, int power) {}

    /** 获取当前会话身份，等待角色锁后复核同一身份。 */
    private final SessionService sessions;
    /** 角色等级及统一行锁，避免同时消费英雄时持久阵容失效。 */
    private final RoleRepository roles;
    /** 圣殿原配置门槛，用于布阵与挑战入口。 */
    private final RainbowRules rules;
    /** 只保存本玩法阵容和相应回执。 */
    private final RainbowFormationRepository formations;
    /** 从持久主阵领域读取角色永久解锁的阵型资格，不读取其站位。 */
    private final MainFormationStateService unlocks;
    /** 复用项目的阵型、去重、等级及站位校验。 */
    private final MainFormationRules formationRules;
    /** 与其他玩法共用持久名册，只允许当前角色的真实英雄实例。 */
    private final HeroRepository heroes;
    /** 组装真实英雄成长、装备、神位加成和阵型信息。 */
    private final HeroBattleInputService battleInputs;
    /** 以原十五回合 PvE 胜负规则执行并验证完整战报。 */
    private final HeroLineupBattleService battles;
    /** 使用统一规则为开战前的实际独立阵容评分，供挑战记录展示。 */
    private final HeroPowerRules powers;

    /** 接入现有阵型、名册与战斗入口，玩法不维护另一份英雄或战斗规则。 */
    RainbowCombat(SessionService sessions, RoleRepository roles, RainbowRules rules,
                  RainbowFormationRepository formations, MainFormationStateService unlocks,
                  MainFormationRules formationRules, HeroRepository heroes,
                  HeroBattleInputService battleInputs, HeroLineupBattleService battles, HeroPowerRules powers) {
        this.sessions = sessions;
        this.roles = roles;
        this.rules = rules;
        this.formations = formations;
        this.unlocks = unlocks;
        this.formationRules = formationRules;
        this.heroes = heroes;
        this.battleInputs = battleInputs;
        this.battles = battles;
        this.powers = powers;
    }

    /** 打开圣殿布阵时读取当前实际版本，首次使用返回空阵容。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Formation formation(String token) {
        return formations.current(requireUnlockedRole(token));
    }

    /** 供已鉴权并持有角色锁的挑战事务检查玩家确认的布阵版本。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public Formation formationForRole(String roleId) {
        return formations.current(roleId);
    }

    /**
     * 独立保存圣殿阵容并冻结成功回执。过期版本请求被拒绝，完全相同的重试返回原结果。
     * @param expectedVersion 打开或上次保存圣殿阵容时取得的独立持久版本。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public FormationSave saveFormation(String token, String requestId, long expectedVersion,
                                       int formationId, List<Lineup.Slot> slots) {
        if (!RewardReceiptPayloads.validId(requestId) || expectedVersion < 0 || formationId <= 0
                || slots == null || slots.isEmpty() || slots.size() > LAST_BATTLE_POSITION
                || slots.stream().anyMatch(RainbowCombat::invalidSlot)) {
            throw rejected(HttpStatus.BAD_REQUEST, "RAINBOW_FORMATION_INVALID");
        }
        String roleId = requireUnlockedRole(token);
        var receipt = formations.receipt(roleId, requestId);
        if (receipt != null) {
            if (!receipt.result().requestId().equals(requestId) || receipt.expectedVersion() != expectedVersion
                    || receipt.formationId() != formationId || !receipt.slots().equals(slots)) {
                throw rejected(HttpStatus.CONFLICT, "RAINBOW_REQUEST_CONFLICT");
            }
            return receipt.result();
        }
        var current = formations.current(roleId);
        if (current.version() != expectedVersion) {
            throw rejected(HttpStatus.CONFLICT, "RAINBOW_FORMATION_CHANGED");
        }
        var accepted = validatedSlots(roleId, formationId, slots);
        if (current.formationId() != formationId || !current.slots().equals(accepted)) {
            current = new Formation(Math.incrementExact(expectedVersion), formationId, accepted);
            formations.save(roleId, expectedVersion, current);
        }
        var result = new FormationSave(requestId, current);
        formations.saveReceipt(roleId, new RainbowFormationRepository.Receipt(expectedVersion, formationId, slots, result));
        return result;
    }

    /**
     * 在服务端挑战事务中执行当前独立阵容。战场始终对抗该神位的进化守军。
     * 缺少出战阵容或守军技能未接通时，终止挑战并拒绝写入占位和冷却。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Preview preview(String roleId, String scenario, List<ConfiguredEnemy> enemies) {
        var formation = formations.current(roleId);
        if (formation.slots().isEmpty()) {
            throw rejected(HttpStatus.CONFLICT, "RAINBOW_FORMATION_EMPTY");
        }
        var input = battleInputs.forFormation(roleId, formation.version(), formation.formationId(), formation.slots());
        // 原版在战斗触发前统计出战属性，计入阵型站位与神位加成。
        int power = input.units().stream().map(unit -> powers.score(unit.attributes())).reduce(0, Math::addExact);
        var random = ThreadLocalRandom.current();
        try {
            var report = battles.configured(scenario, input, enemies, probability -> random.nextDouble() < probability);
            return new Preview(report.battle(), power);
        } catch (IllegalArgumentException failure) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "RAINBOW_BATTLE_UNAVAILABLE", failure);
        }
    }

    /** 在当前角色行锁内复核凭证和原等级门槛，再往下读取独立阵容。 */
    private String requireUnlockedRole(String token) {
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw rejected(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        var role = roles.findById(roleId).orElseThrow();
        if (role.level() < rules.minimumLevel()) {
            throw rejected(HttpStatus.FORBIDDEN, "RAINBOW_LEVEL");
        }
        return roleId;
    }

    /** 检查协议站位编号和规范实例标识，具体所有权由持久名册验证。 */
    private static boolean invalidSlot(Lineup.Slot slot) {
        return slot == null || slot.position() == null || slot.position() < 1
                || slot.position() > LAST_BATTLE_POSITION || !RewardReceiptPayloads.validId(slot.heroId());
    }

    /** 复用永久阵型与原上阵校验，完整草稿合法才保存并按位置排序。 */
    private List<Lineup.Slot> validatedSlots(String roleId, int formationId, List<Lineup.Slot> slots) {
        var main = unlocks.current(roleId);
        var owned = heroes.list(roleId).stream().map(hero -> new MainFormationRules.Hero(
                hero.id(), hero.templateId(), hero.level(), hero.star())).toList();
        List<Lineup.Slot> valid;
        try {
            valid = formationRules.normalize(formationId,
                    new MainFormationRules.Unlocks(new HashSet<>(main.unlockedIds()), false), owned, slots);
        } catch (IllegalArgumentException failure) {
            throw rejected(HttpStatus.BAD_REQUEST, "RAINBOW_FORMATION_INVALID");
        }
        if (valid.size() != slots.size()) {
            throw rejected(HttpStatus.BAD_REQUEST, "RAINBOW_FORMATION_INVALID");
        }
        return valid.stream().sorted(Comparator.comparingInt(Lineup.Slot::position)).toList();
    }

    /** 保留通信层可区分的业务失败码。 */
    private static ResponseStatusException rejected(HttpStatus status, String reason) {
        return new ResponseStatusException(status, reason);
    }
}
