/**
 * 幻境之塔的服务器入口：管理专用阵容、最高通关、精力和每日扫荡，
 * 挑战、扫荡和里程碑领取使用共用战斗、资产与回执，按角色串行提交。
 */
package com.funsgamex.mxzg.tower;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.chat.ChatService;
import com.funsgamex.mxzg.hero.HeroBattleInputService;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleRoundUtils;
import com.funsgamex.mxzg.hero.HeroLineupBattleService;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationRules;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.reward.RewardGrantResult;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import com.funsgamex.mxzg.tower.TowerRepository.Progress;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Stream;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TowerService {
    /** 扫荡在上海自然日零点重置，精力按经过的服务器秒数恢复。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 与客户端报价使用的精确整数范围相同。 */
    private static final long MAX_DIAMONDS = 9_007_199_254_740_991L;

    /** 授权解析和角色切换检查。 */
    private final SessionService sessions;
    /** 同一角色行锁，读取等级、昵称和资产版本。 */
    private final RoleRepository roles;
    /** 角色幻境独立进度、阵容和原战报。 */
    private final TowerRepository tower;
    /** 从旧策划表导出的全区开放楼层及资源规则。 */
    private final TowerRules.Config config;
    /** 各个楼层不随玩家状态变化的展示内容。 */
    private final List<FloorState> floors;
    /** 复用主线已解锁阵型；初次编辑从主阵容起草。 */
    private final MainFormationStateService formations;
    /** 主线与幻境使用同一站位、阵型解锁和英雄选择规则。 */
    private final MainFormationRules formationRules;
    /** 幻境阵容保存按当前角色真实英雄校验。 */
    private final HeroRepository heroes;
    /** 以专用阵容及实时英雄状态组装原始属性与技能。 */
    private final HeroBattleInputService battleInputs;
    /** 共用的服务端战斗和战报校验。 */
    private final HeroLineupBattleService battles;
    /** 使用真实库存与钱包结果统一发奖。 */
    private final RewardGrantService grants;
    /** 通关后更新包含 VIP 进度的统一状态。 */
    private final AssetSyncService sync;
    /** 读取同一操作使用的服务器时间。 */
    private final GameClock clock;
    /** 塔挑战与扫荡真实结算后，在原事务登记每日任务次数。 */
    private final ApplicationEventPublisher events;
    /** 在领奖事务内发布原配置标记的本服系统公告。 */
    private final ChatService chat;

    /** 结算动作，挑战有战报，扫荡与里程碑直接发奖。 */
    public enum Action { CHALLENGE, SWEEP, MILESTONE }

    /** 守军预览使用的配置站位、模板、等级和星级。 */
    public record EnemyState(int position, int templateId, int level, int star) {}

    /** 每层首通奖励与扫荡奖励独立显示，建议战力只用于展示。 */
    public record FloorState(int floor, long recommendedPower, List<Reward> firstRewards, List<Reward> sweepRewards,
                             List<EnemyState> enemies) {
        /** 冻结楼层预览。 */
        public FloorState {
            firstRewards = List.copyOf(firstRewards);
            sweepRewards = List.copyOf(sweepRewards);
            enemies = List.copyOf(enemies);
        }
    }

    /** 里程碑领取结果独立于实际已通关最高层。 */
    public record MilestoneState(int id, int floor, boolean claimed, List<Reward> rewards) {
        /** 冻结里程碑预览。 */
        public MilestoneState {
            rewards = List.copyOf(rewards);
        }
    }

    /** 最高通关从 0 开始；精力满时下次恢复为 0；扫荡次数与费用按上海自然日。 */
    public record State(int minimumLevel, int highestCleared, int maxFloor, int energy, int maxEnergy,
                        long nextEnergyAtSeconds, int rechargeSeconds, int sweeps, int sweepLimit,
                        long nextSweepCostDiamonds, long sweepResetAtSeconds, long formationVersion, int formationId,
                        List<Lineup.Slot> slots, List<FloorState> floors, MilestoneState milestone,
                        List<MilestoneState> milestones) {
        /** 冻结塔状态；初版回执只有第 10 层里程碑，恢复时保留原结算内容。 */
        public State {
            slots = List.copyOf(slots);
            floors = List.copyOf(floors);
            milestones = milestones == null ? List.of(milestone) : List.copyOf(milestones);
        }
    }

    /** 奖励和战报取自原回执，重发时无需重算战斗。 */
    public record Settlement(String requestId, String roleId, long assetRevision, Action action, int floor, boolean won,
                             BattleReplay replay, State state, RewardGrantResult actual) {
        /** 拒绝和原动作、角色或战果不一致的历史结算。 */
        public Settlement {
            if (!RewardReceiptPayloads.validId(requestId) || roleId == null || roleId.isBlank() || assetRevision < 0
                    || action == null || floor < 1 || state == null || floor > state.maxFloor()
                    || (action == Action.CHALLENGE) != (replay != null) || (action != Action.CHALLENGE && !won)
                    || won != (actual != null) || (actual != null && !roleId.equals(actual.roleId()))
                    || (replay != null && (!("tower:" + floor).equals(replay.getScenario())
                        || won != HeroBattleRoundUtils.Outcome.ATTACKER_WIN.name().equals(replay.getOutcome())))) {
                throw new IllegalArgumentException("幻境之塔结算与实际战斗不一致");
            }
        }
    }

    /** 装配战斗、奖励和公告，并在启动时检查开放楼层的奖励。 */
    public TowerService(SessionService sessions, RoleRepository roles, TowerRepository tower, TowerRules rules,
                        MainFormationStateService formations, MainFormationRules formationRules, HeroRepository heroes,
                        HeroBattleInputService battleInputs, HeroLineupBattleService battles,
                        RewardGrantService grants, AssetSyncService sync, GameClock clock,
                        ApplicationEventPublisher events, ChatService chat) {
        this.sessions = sessions;
        this.roles = roles;
        this.tower = tower;
        this.config = rules.config();
        this.formations = formations;
        this.formationRules = formationRules;
        this.heroes = heroes;
        this.battleInputs = battleInputs;
        this.battles = battles;
        this.grants = grants;
        this.sync = sync;
        this.clock = clock;
        this.events = events;
        this.chat = chat;
        this.floors = config.floors().stream().map(row -> new FloorState(row.floor(), row.recommendedPower(),
                row.firstRewards(), row.sweepRewards(), row.enemies().stream().map(enemy -> new EnemyState(
                    enemy.position(), enemy.template(), enemy.level(), enemy.star())).toList())).toList();
        var floorRewards = config.floors().stream().flatMap(row -> Stream.concat(
                row.firstRewards().stream(), row.sweepRewards().stream()));
        var milestoneRewards = config.milestones().stream().flatMap(row -> row.rewards().stream());
        grants.requireSupported(Stream.concat(floorRewards, milestoneRewards)
                .map(Reward::itemId).distinct().toList());
    }

    /** 查询当前角色的已恢复精力和当日扫荡进度，低于开门等级不能进入。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State current(String token) {
        var role = access(token).id();
        var stored = tower.progress(role);
        var current = normalize(stored, clock.instant());
        tower.saveProgress(role, stored, current);
        return state(role, current);
    }

    /** 只保存幻境阵型，不改主线出阵；首次确认默认草稿也会建立专用阵容。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State saveFormation(String token, long expectedVersion, int formationId, List<Lineup.Slot> slots) {
        var role = access(token).id();
        var stored = tower.progress(role);
        var before = normalize(stored, clock.instant());
        if (expectedVersion != before.formationVersion()) {
            throw rejected("TOWER_FORMATION_CHANGED");
        }
        var normalized = validateFormation(role, formationId, slots);
        if (before.formationVersion() > 0 && before.formationId() == formationId && tower.slots(role).equals(normalized)) {
            tower.saveProgress(role, stored, before);
            return state(role, before);
        }
        var after = new Progress(before.highestCleared(), before.energy(), before.energyTimeSeconds(),
                before.sweepTimes(), before.sweepResetAtSeconds(),
                before.formationVersion() + 1, formationId);
        tower.saveProgress(role, stored, after);
        tower.replaceSlots(role, normalized);
        return state(role, after);
    }

    /** 挑战下一层，失败扣一次精力，胜利提升最高楼层并自动发放该层首通奖励。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Settlement challenge(String token, String requestId, int floor) {
        return settle(token, requestId, Action.CHALLENGE, floor, 0);
    }

    /** 扫荡最高已通关楼层，按旧表使用一次次数及确认过的报价。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Settlement sweep(String token, String requestId, int floor, long maxDiamonds) {
        return settle(token, requestId, Action.SWEEP, floor, maxDiamonds);
    }

    /** 单独领取已达成的配置里程碑，成功后通关层数保持不变。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Settlement claimMilestone(String token, String requestId, int milestoneId) {
        return settle(token, requestId, Action.MILESTONE, milestoneId, 0);
    }

    /** 重试读取原回执，新结算在角色锁内提交奖励、进度及配置要求的公告。 */
    private Settlement settle(String token, String requestId, Action action, int targetId, long maxDiamonds) {
        if (!RewardReceiptPayloads.validId(requestId) || targetId < 1 || maxDiamonds < 0 || maxDiamonds > MAX_DIAMONDS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TOWER_REQUEST_INVALID");
        }
        var profile = access(token);
        var role = profile.id();
        var previous = tower.receipt(role, requestId);
        if (previous != null) {
            if (previous.result().action() != action || previous.targetId() != targetId
                    || previous.maxDiamonds() != maxDiamonds) {
                throw rejected("TOWER_REQUEST_CONFLICT");
            }
            return previous.result();
        }
        Instant now = clock.instant();
        var stored = tower.progress(role);
        var before = normalize(stored, now);
        var random = ThreadLocalRandom.current();
        var outcome = switch (action) {
            case CHALLENGE -> fight(profile, before, targetId, now, random);
            case SWEEP -> sweep(role, before, targetId, maxDiamonds);
            case MILESTONE -> milestone(role, before, targetId);
        };
        tower.saveProgress(role, stored, outcome.progress());
        var actual = outcome.rewards().isEmpty() ? null : grants.grant(role, outcome.rewards(),
                new RewardGrantService.Context(now.getEpochSecond(), 0), random);
        if (action == Action.CHALLENGE && actual != null) {
            sync.changed(role);
        }
        var result = new Settlement(requestId, role, roles.revision(role), action, outcome.floor(), actual != null,
                outcome.replay(), state(role, outcome.progress()), actual);
        tower.saveReceipt(targetId, maxDiamonds, result);
        if (action != Action.MILESTONE) {
            events.publishEvent(new QuestProgressEvent(role, QuestMetric.TOWER_CHALLENGE, 0, 1));
        } else if (outcome.announce()) {
            chat.publishSystem(profile.serverId(), "%s成功通关幻境之塔%d层，领取了强力五星英雄，真是让人羡慕！"
                    .formatted(profile.nickname(), outcome.floor()), 172);
        }
        return result;
    }

    /** 持有一次操作的进度、奖励及领奖公告标记，由外层事务一起提交。 */
    private record Outcome(int floor, Progress progress, BattleReplay replay, List<Reward> rewards, boolean announce) {
        /** 挑战和扫荡仅结算进度、战报与奖励，不触发里程碑公告。 */
        private Outcome(int floor, Progress progress, BattleReplay replay, List<Reward> rewards) {
            this(floor, progress, replay, rewards, false);
        }
    }

    /** 用已保存的幻境阵容执行当前层；胜场不消耗精力，首次跌破上限开始计时。 */
    private Outcome fight(RoleProfile role, Progress before, int floor, Instant now, ThreadLocalRandom random) {
        if (floor > floors.size() || floor != before.highestCleared() + 1) {
            throw rejected("TOWER_FLOOR");
        }
        if (before.energy() <= 0) {
            throw rejected("TOWER_ENERGY");
        }
        var slots = tower.slots(role.id());
        if (slots.isEmpty()) {
            throw rejected("TOWER_FORMATION_EMPTY");
        }
        var rule = config.floors().get(floor - 1);
        BattleReplay report;
        try {
            var input = battleInputs.forFormation(role.id(), before.formationVersion(), before.formationId(), slots);
            var result = battles.configured("tower:" + floor, input, rule.enemies(), chance -> random.nextDouble() < chance);
            report = HeroBattleReplayProtocolUtils.encode(result.battle()).toBuilder()
                .setAttackerName(role.nickname()).setDefenderName(config.opponentName().formatted(floor)).build();
        } catch (IllegalArgumentException failure) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "TOWER_BATTLE_UNAVAILABLE", failure);
        }
        boolean won = HeroBattleRoundUtils.Outcome.ATTACKER_WIN.name().equals(report.getOutcome());
        long energyTime = !won && before.energy() == config.maxEnergy() ? now.getEpochSecond() : before.energyTimeSeconds();
        var after = new Progress(won ? floor : before.highestCleared(), before.energy() - (won ? 0 : 1), energyTime,
                before.sweepTimes(), before.sweepResetAtSeconds(),
                before.formationVersion(), before.formationId());
        return new Outcome(floor, after, report, won ? rule.firstRewards() : List.of());
    }

    /** 按当日扫荡序号扣费，拒绝过期报价与非最高已通关楼层。 */
    private Outcome sweep(String role, Progress before, int floor, long maxDiamonds) {
        if (floor > floors.size() || floor != before.highestCleared()) {
            throw rejected("TOWER_SWEEP_FLOOR");
        }
        if (before.sweepTimes() >= config.sweepCosts().size()) {
            throw rejected("TOWER_SWEEP_LIMIT");
        }
        long cost = config.sweepCosts().get(before.sweepTimes());
        if (cost > maxDiamonds) {
            throw rejected("TOWER_COST_CHANGED");
        }
        if (cost > 0 && !roles.debitDiamonds(role, cost)) {
            throw rejected("TOWER_DIAMONDS");
        }
        var after = new Progress(before.highestCleared(), before.energy(), before.energyTimeSeconds(),
                before.sweepTimes() + 1, before.sweepResetAtSeconds(),
                before.formationVersion(), before.formationId());
        return new Outcome(floor, after, null, config.floors().get(floor - 1).sweepRewards());
    }

    /** 验证指定档位资格并保存领取记录，返回奖励与旧配置的公告标记。 */
    private Outcome milestone(String role, Progress before, int milestoneId) {
        var milestone = config.milestones().stream()
                .filter(row -> row.id() == milestoneId && row.floor() <= before.highestCleared())
                .findFirst().orElseThrow(() -> rejected("TOWER_MILESTONE_LOCKED"));
        if (tower.claimedMilestones(role).contains(milestoneId)) {
            throw rejected("TOWER_MILESTONE_CLAIMED");
        }
        tower.saveMilestoneClaim(role, milestoneId);
        return new Outcome(milestone.floor(), before, null, milestone.rewards(), milestone.announce());
    }

    /** 进入角色锁后重新判断会话和旧开门等级，避免旧连接在等待期间继续操作。 */
    private RoleProfile access(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        if (!role.equals(sessions.requireRole(token))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        var profile = roles.findById(role).orElseThrow();
        if (profile.level() < config.minimumLevel()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "TOWER_LEVEL");
        }
        return profile;
    }

    /** 使用旧角色阵型解锁和站位，拒绝过期或无效草稿；现有战斗未接助战位。 */
    private List<Lineup.Slot> validateFormation(String role, int formationId, List<Lineup.Slot> slots) {
        if (slots == null || slots.isEmpty() || slots.size() > 8
                || slots.stream().anyMatch(slot -> slot == null || slot.position() == null
                    || slot.position() < 1 || slot.position() > 8 || !RewardReceiptPayloads.validId(slot.heroId()))) {
            throw rejected("TOWER_FORMATION_INVALID");
        }
        var current = formations.current(role);
        var owned = heroes.list(role).stream().map(hero -> new MainFormationRules.Hero(
                hero.id(), hero.templateId(), hero.level(), hero.star())).toList();
        List<Lineup.Slot> valid;
        try {
            valid = formationRules.normalize(formationId,
                    new MainFormationRules.Unlocks(new HashSet<>(current.unlockedIds()), false), owned, slots);
        } catch (IllegalArgumentException failure) {
            throw rejected("TOWER_FORMATION_INVALID");
        }
        if (valid.size() != slots.size()) {
            throw rejected("TOWER_FORMATION_INVALID");
        }
        return valid.stream().sorted(Comparator.comparingInt(Lineup.Slot::position)).toList();
    }

    /** 以完整恢复间隔计算精力，在上海零点重置每日扫荡，尚未入塔时返回初始进度。 */
    private Progress normalize(Progress stored, Instant now) {
        long tomorrow = now.atZone(SERVER_ZONE).toLocalDate().plusDays(1).atStartOfDay(SERVER_ZONE).toEpochSecond();
        if (stored == null) {
            return new Progress(0, config.maxEnergy(), 0, 0, tomorrow, 0, 1);
        }
        long seconds = now.getEpochSecond();
        long energyTime = stored.energyTimeSeconds();
        int energy = stored.energy();
        if (energy < config.maxEnergy() && seconds > energyTime) {
            long intervals = (seconds - energyTime) / config.rechargeSeconds();
            energy = (int) Math.min(energy + intervals, config.maxEnergy());
            energyTime = energy == config.maxEnergy() ? 0 : energyTime + intervals * config.rechargeSeconds();
        }
        boolean reset = seconds >= stored.sweepResetAtSeconds();
        return new Progress(stored.highestCleared(), energy, energyTime, reset ? 0 : stored.sweepTimes(),
                reset ? tomorrow : stored.sweepResetAtSeconds(),
                stored.formationVersion(), stored.formationId());
    }

    /** 构建权威视图，包含每档已领取状态；未保存专用阵容时用主阵容作为草稿。 */
    private State state(String role, Progress progress) {
        int formationId = progress.formationId();
        List<Lineup.Slot> slots;
        if (progress.formationVersion() == 0) {
            var main = formations.current(role);
            formationId = main.formationId();
            slots = main.slots().stream().filter(slot -> slot.position() != 9).toList();
        } else {
            slots = tower.slots(role);
        }
        long nextEnergy = progress.energy() == config.maxEnergy() ? 0 : progress.energyTimeSeconds() + config.rechargeSeconds();
        long cost = progress.sweepTimes() < config.sweepCosts().size() ? config.sweepCosts().get(progress.sweepTimes()) : 0;
        var claimed = tower.claimedMilestones(role);
        var milestones = config.milestones().stream().map(row ->
                new MilestoneState(row.id(), row.floor(), claimed.contains(row.id()), row.rewards())).toList();
        return new State(config.minimumLevel(), progress.highestCleared(), floors.size(), progress.energy(),
                config.maxEnergy(), nextEnergy, config.rechargeSeconds(), progress.sweepTimes(), config.sweepCosts().size(),
                cost, progress.sweepResetAtSeconds(), progress.formationVersion(), formationId, slots, floors,
                milestones.getFirst(), milestones);
    }

    /** 统一产生业务拒绝码，外层协议处理用户反馈。 */
    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
