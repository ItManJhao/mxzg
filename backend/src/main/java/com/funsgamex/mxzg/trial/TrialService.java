/**
 * 勇者试炼的角色事务入口。组织难度、关卡、攻守生命、好友助战及发奖，
 * 统一在角色锁中保存进度和原请求回执。
 */
package com.funsgamex.mxzg.trial;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.HeroBattleInputService;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.hero.HeroProfile;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.lineup.MainFormationStateService;
import com.funsgamex.mxzg.mail.MailService;
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
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TrialService {
    /** 所有区服使用同一个上海自然日，单位为纪元秒。 */
    private static final ZoneId RESET_ZONE = ZoneId.of("Asia/Shanghai");

    /** 一次客户端操作的身份、比较版本及动作专用参数。 */
    public record Command(String requestId, long expectedVersion, String action, int choice, int formationId,
                          List<Lineup.Slot> slots, String targetId, List<String> heroIds) {}

    /** 玩家英雄血量以实例 ID 保存，改动站位不会复原损失。 */
    public record HeroHealth(String heroId, long hp, long maxHp) {}

    /** 守方展示用的冻结名册及剩余生命，战斗属性仍由服务端持有。 */
    public record OpponentHero(int position, int templateId, int level, int star, int element, long hp, long maxHp) {}

    /** 已经匹配的守军预览；没有匹配的未来关卡不会伪造对手数据。 */
    public record Opponent(String name, long power, int level, int avatarId, int formationId,
                           List<OpponentHero> heroes) {}

    /** 一格路线状态，领取资格、类型及奖励由当前服务端进度推导。 */
    public record Node(int node, String type, String status, int displayLevel, List<Reward> rewards,
                       Opponent opponent) {}

    /** 保留最近一次战斗身份与原二进制战报，重连不会重新抽签战斗。 */
    public record Battle(String battleId, int node, boolean won, @JsonIgnore BattleReplay replay) {}

    /** 选难度时展示原策划的战力要求及奖励预览。 */
    public record Difficulty(int id, long minimumPower, List<Reward> rewards, boolean combatReady) {}

    /** 当前区服自然日玩法快照，角色资产独立走统一快照。 */
    public record State(long version, int minimumLevel, long resetAtSeconds, int difficulty, int maxDifficulty,
                        int completedDifficulty, int currentNode, int reviveUsed, int reviveLimit, Reward reviveCost,
                        int formationId, List<Lineup.Slot> slots, List<Node> nodes, List<HeroHealth> heroHealth,
                        List<Reward> todayRewards, Battle battle, List<Difficulty> difficulties) {
        /** 持久快照与原战报分开存储；读取回执时恢复对应报告。 */
        State withReplay(BattleReplay replay) {
            var restored = battle == null ? null : new Battle(battle.battleId(), battle.node(), battle.won(), replay);
            return new State(version, minimumLevel, resetAtSeconds, difficulty, maxDifficulty, completedDifficulty,
                    currentNode, reviveUsed, reviveLimit, reviveCost, formationId, slots, nodes, heroHealth,
                    todayRewards, restored, difficulties);
        }
    }

    /** 原操作回执，actual 仅在动作真实到账时存在。 */
    public record Settlement(String requestId, String roleId, long assetRevision, String action,
                             State state, RewardGrantResult actual) {
        /** 将独立存储的报告附回不可变结果。 */
        Settlement withReplay(BattleReplay replay) {
            return new Settlement(requestId, roleId, assetRevision, action, state.withReplay(replay), actual);
        }
    }

    /** 只公开好友的派遣展示数据和本日是否已经保存上阵。 */
    public record AssistHero(String roleId, String roleName, String heroId, int templateId, int level,
                             int star, long power, boolean used) {}

    /** 当前自然日派遣、已选及好友候选列表。 */
    public record Assistance(long version, long resetAtSeconds, List<AssistHero> dispatched,
                             List<AssistHero> selected, List<AssistHero> available,
                             int dispatchLimit, long maxAssistPower) {}

    /** 内部状态只在一个角色事务内可变，字段序列化用于断线和跨日恢复。 */
    static final class Progress {
        /** 已落库操作版本，用于拒绝旧界面提交。 */
        public long version;
        /** 本轮的下一次上海零点，过期时重置当日数据。 */
        public long resetAt;
        /** 当天选择的难度，0 是待选择。 */
        public int difficulty;
        /** 历史最高已通关难度，用于解锁后一档。 */
        public int completedDifficulty;
        /** 上一自然日的选择，用于同档难度回退。 */
        public int yesterdayDifficulty;
        /** 上一自然日的当前战斗格，0 表示以前没有连续游戏。 */
        public int yesterdayNode;
        /** 当前战斗节点，0 表示尚未选择或已全部打完。 */
        public int currentNode;
        /** 历史最高已通过战斗关号，用于成就最大值。 */
        public int highestLevel;
        /** 试炼阵型，0 表示尚未保存，从主线可用普通位派生。 */
        public int formationId;
        /** 玩家独立保存的试炼站位，跨日只移除过期借用。 */
        public List<Lineup.Slot> slots = List.of();
        /** 本日已击败守军或已经领取的宝箱格号。 */
        public Set<Integer> cleared = new LinkedHashSet<>();
        /** 当日已经参与挑战的英雄血量，按真实英雄实例键入。 */
        public Map<String, HeroHealth> heroHealth = new LinkedHashMap<>();
        /** 节点编号对应冻结对手；跨日和换难度都重新匹配。 */
        public Map<Integer, TrialCombat.Defense> opponents = new LinkedHashMap<>();
        /** 本日已选的助战英雄快照，键为好友英雄的实例 ID。 */
        public Map<String, TrialRepository.Dispatch> selected = new LinkedHashMap<>();
        /** 当日保存过上阵的好友英雄 ID，记录后禁止取消选择。 */
        public Set<String> used = new LinkedHashSet<>();
        /** 当天挑战、补发和宝箱的总奖励按物品合并。 */
        public Map<Integer, Long> rewards = new LinkedHashMap<>();
        /** 最近一次试炼对战的身份和结果；原战报另列存档。 */
        public Battle lastBattle;
    }

    /** 沿用主线阵型口径，但不读取主线助战位。 */
    private record Formation(int id, List<Lineup.Slot> slots) {}

    /** 取得当前角色的真实会话身份并在锁内复查。 */
    private final SessionService sessions;
    /** 锁定试炼进度、查询角色等级和角色资产版本。 */
    private final RoleRepository roles;
    /** 读取、保存进度、回执和派遣身份。 */
    private final TrialRepository repository;
    /** 原规则由配置导出，玩法不接受客户端资格、价格或守军。 */
    private final TrialRules rules;
    /** 读取真实库存英雄的资格和上阵属性。 */
    private final HeroRepository heroes;
    /** 初次进入使用主线可用阵型和合法站位。 */
    private final MainFormationStateService formations;
    /** 复用主线和梦境已经使用的阵容输入规约。 */
    private final HeroBattleInputService battleInputs;
    /** 真实主线历史战力用于难度解锁和匹配。 */
    private final HeroMainPowerService powers;
    /** 匹配、真实对战及守方剩余血量展示。 */
    private final TrialCombat combat;
    /** 可信奖励进入同一个角色资产事务。 */
    private final RewardGrantService grants;
    /** 只有真实发奖才增加持久资产版本并提交后推送。 */
    private final AssetSyncService sync;
    /** 服务端时钟及上海自然日边界。 */
    private final GameClock clock;
    /** 通关和成就事件跟随试炼事务提交。 */
    private final ApplicationEventPublisher events;
    /** 次日派遣使用的奖励由统一邮件模块投递。 */
    private final MailService mail;

    /** 装配领域依赖并尽早检查试炼奖励均能走统一入库路径。 */
    TrialService(SessionService sessions, RoleRepository roles, TrialRepository repository, TrialRules rules,
                 HeroRepository heroes, MainFormationStateService formations, HeroBattleInputService battleInputs,
                 HeroMainPowerService powers, TrialCombat combat, RewardGrantService grants, AssetSyncService sync,
                 GameClock clock, ApplicationEventPublisher events, MailService mail) {
        this.sessions = sessions;
        this.roles = roles;
        this.repository = repository;
        this.rules = rules;
        this.heroes = heroes;
        this.formations = formations;
        this.battleInputs = battleInputs;
        this.powers = powers;
        this.combat = combat;
        this.grants = grants;
        this.sync = sync;
        this.clock = clock;
        this.events = events;
        this.mail = mail;
        grants.requireSupported(rules.config().stages().stream().flatMap(stage -> stage.rewards().stream())
                .map(Reward::itemId).distinct().toList());
        grants.requireSupported(rules.config().assistRewards().stream().map(Reward::itemId).toList());
    }

    /** 读取当前试炼，可在同一事务内处理跨日清理，重连恢复最近战报。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State state(String token) {
        var role = access(token);
        var stored = current(role.id(), clock.epochSeconds());
        return view(role.id(), stored.progress(), stored.replay(), powers.observe(role.id()).maximum());
    }

    /** 读取真正的同区服好友派遣、自己的本日派遣和冻结选择。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Assistance assistance(String token) {
        var role = access(token);
        var p = current(role.id(), clock.epochSeconds()).progress();
        var own = repository.ownDispatches(role.id(), p.resetAt).stream().map(dispatch -> dispatch.view(false)).toList();
        var selected = p.selected.values().stream().map(dispatch -> dispatch.view(p.used.contains(dispatch.snapshot().id())))
                .toList();
        var available = repository.friendDispatches(role.id(), p.resetAt).stream()
                .map(dispatch -> dispatch.view(p.used.contains(dispatch.snapshot().id())))
                .sorted(Comparator.comparingLong(AssistHero::power).reversed()).toList();
        return new Assistance(p.version, p.resetAt, own, selected, available, rules.config().assistDispatchLimit(),
                assistLimit(role.id()));
    }

    /** 事务内重放历史请求或执行一次有效操作，随后一起保存战报、奖励及回执。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Settlement act(String token, Command command) {
        validateCommand(command);
        var role = access(token);
        var existing = repository.receipt(role.id(), command.requestId());
        if (existing != null) {
            if (!existing.command().equals(command)) {
                throw conflict("TRIAL_REQUEST_CONFLICT");
            }
            return existing.result();
        }
        long now = clock.epochSeconds();
        var stored = current(role.id(), now);
        var p = stored.progress();
        if (p.version != command.expectedVersion()) {
            throw conflict("TRIAL_STATE_CHANGED");
        }
        boolean persisted = p.version > 0;
        long maximum = powers.observe(role.id()).maximum();
        BattleReplay replay = stored.replay();
        List<Reward> awards = List.of();
        switch (command.action()) {
            case "selectDifficulty" -> awards = selectDifficulty(role, p, command.choice(), now, maximum);
            case "saveFormation" -> saveFormation(role.id(), p, command.formationId(), command.slots());
            case "fight" -> {
                var result = fight(role, p, command.choice(), now, maximum);
                replay = result.replay();
                if (result.won()) {
                    awards = rules.stage(p.difficulty, command.choice()).rewards();
                }
            }
            case "claim" -> awards = claim(p, command.choice());
            case "dispatchAssist" -> dispatchAssist(role, p, command.targetId());
            case "selectAssist" -> selectAssist(role, p, command.targetId());
            case "cancelAssist" -> cancelAssist(p, command.targetId());
            case "revive" -> throw conflict("TRIAL_REVIVE_UNAVAILABLE");
            default -> throw badRequest();
        }
        p.version++;
        var actual = grant(role.id(), p, awards, now);
        repository.save(role.id(), persisted, p, replay);
        var result = new Settlement(command.requestId(), role.id(), roles.revision(role.id()), command.action(),
                view(role.id(), p, replay, maximum), actual);
        repository.saveReceipt(command, result);
        return result;
    }

    /** 按派遣角色锁批量投递前一天的助战奖励，收件箱满时事务回滚后可重试。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void mailAssistRewards(String roleId) {
        roles.lock(roleId);
        int used = repository.markDueAssistRewards(roleId, clock.epochSeconds());
        if (used > 0) {
            var rewards = rules.config().assistRewards().stream()
                    .map(reward -> new Reward(reward.itemId(), Math.multiplyExact(reward.quantity(), used))).toList();
            mail.deliver(roleId, "勇者试炼支援奖励", "你的支援英雄已被好友用于勇者试炼。", rewards);
        }
    }

    /** 尚未到达原开放等级以及等待角色锁期间失效的会话均拒绝。 */
    private RoleProfile access(String token) {
        String roleId = sessions.requireRole(token);
        roles.lock(roleId);
        if (!roleId.equals(sessions.requireRole(token))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        var role = roles.findById(roleId).orElseThrow();
        if (role.level() < rules.config().minimumLevel()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "TRIAL_LEVEL");
        }
        return role;
    }

    /** 新角色为版本 0，已有进度过零点后保留长期解锁、阵容及连续参与位置。 */
    private TrialRepository.Stored current(String role, long now) {
        var stored = repository.find(role);
        long reset = resetAt(now);
        if (stored == null) {
            var initial = new Progress();
            initial.resetAt = reset;
            return new TrialRepository.Stored(initial, null);
        }
        var p = stored.progress();
        if (p.resetAt == reset) {
            return stored;
        }
        if (p.resetAt > reset) {
            throw conflict("TRIAL_CLOCK_REGRESSED");
        }
        var next = new Progress();
        next.version = p.version + 1;
        next.resetAt = reset;
        next.formationId = p.formationId;
        next.slots = p.slots.stream().filter(slot -> !p.selected.containsKey(slot.heroId())).toList();
        next.completedDifficulty = p.completedDifficulty;
        next.highestLevel = p.highestLevel;
        if (p.difficulty > 0 && p.resetAt == dayStart(now)) {
            next.yesterdayDifficulty = p.difficulty;
            next.yesterdayNode = p.currentNode > 0 ? p.currentNode
                    : rules.stages(p.difficulty).stream().filter(TrialRules.Stage::battle).toList().getLast().node();
        }
        repository.save(role, true, next, null);
        return new TrialRepository.Stored(next, null);
    }

    /** 经过历史通关和旧战力门槛后锁定当日难度，同难度续玩按原回退格发放已跳过奖励。 */
    private List<Reward> selectDifficulty(RoleProfile role, Progress p, int choice, long now, long maximum) {
        if (p.difficulty != 0) {
            throw conflict("TRIAL_DIFFICULTY_ALREADY_SELECTED");
        }
        if (!rules.combatReady(choice)) {
            throw conflict("TRIAL_DIFFICULTY_UNAVAILABLE");
        }
        if (choice > maxDifficulty(p, maximum)) {
            throw conflict("TRIAL_DIFFICULTY_LOCKED");
        }
        p.difficulty = choice;
        p.currentNode = choice == p.yesterdayDifficulty
                ? rules.stage(choice, p.yesterdayNode).resetNode() : 1;
        List<Reward> awards = new ArrayList<>();
        for (var stage : rules.stages(choice)) {
            if (stage.node() > p.currentNode) {
                break;
            }
            if (stage.battle()) {
                match(role, p, stage, now, maximum);
            }
            if (stage.node() < p.currentNode) {
                p.cleared.add(stage.node());
                awards.addAll(stage.rewards());
                if (stage.battle()) {
                    recordVictory(role.id(), p, stage.displayLevel(), now);
                }
            }
        }
        return merged(awards);
    }

    /** 验证编辑后的普通站位和最多一名助战；保存上阵即按旧规则计入派遣奖励。 */
    private void saveFormation(String role, Progress p, int formationId, List<Lineup.Slot> slots) {
        var input = lineupInput(role, p, formationId, slots);
        p.formationId = formationId;
        p.slots = List.copyOf(slots);
        for (var unit : input.units()) {
            String id = unit.hero().id();
            var borrowed = p.selected.get(id);
            if (borrowed != null && p.used.add(id)) {
                repository.recordAssistUsed(role, borrowed, p.resetAt);
            }
        }
    }

    /** 仅许可当前战斗节点；双方生命保存，获胜才推进、发奖并计数。 */
    private TrialCombat.Result fight(RoleProfile role, Progress p, int node, long now, long maximum) {
        if (p.difficulty == 0 || node != p.currentNode) {
            throw conflict("TRIAL_NODE_LOCKED");
        }
        var stage = rules.stage(p.difficulty, node);
        var formation = currentFormation(role.id(), p);
        var attacker = lineupInput(role.id(), p, formation.id(), formation.slots());
        var defense = p.opponents.get(node);
        if (defense == null) {
            throw new IllegalStateException("勇者试炼当前关卡没有已匹配的对手");
        }
        if (!combat.ready(defense)) {
            throw conflict("TRIAL_OPPONENT_UNAVAILABLE");
        }
        var result = combat.battle(role, p.difficulty, node, attacker, p.heroHealth, defense);
        p.heroHealth.putAll(result.attacker());
        p.opponents.put(node, defense.withHealth(result.defender()));
        p.lastBattle = new Battle(UUID.randomUUID().toString(), node, result.won(), null);
        if (!result.won()) {
            return result;
        }
        p.cleared.add(node);
        recordVictory(role.id(), p, stage.displayLevel(), now);
        var next = rules.stages(p.difficulty).stream().filter(row -> row.node() > node && row.battle())
                .findFirst().orElse(null);
        p.currentNode = next == null ? 0 : next.node();
        if (next == null) {
            p.completedDifficulty = Math.max(p.completedDifficulty, p.difficulty);
        } else {
            match(role, p, next, now, maximum);
        }
        return result;
    }

    /** 击败宝箱前一个守军后独立领取奖励，宝箱不阻塞后续战斗。 */
    private List<Reward> claim(Progress p, int node) {
        if (p.difficulty == 0 || node <= 1 || node > rules.stages(p.difficulty).size()) {
            throw conflict("TRIAL_NODE_LOCKED");
        }
        var stage = rules.stage(p.difficulty, node);
        if (stage.battle() || !p.cleared.contains(node - 1)) {
            throw conflict("TRIAL_NODE_LOCKED");
        }
        if (!p.cleared.add(node)) {
            throw conflict("TRIAL_CHEST_CLAIMED");
        }
        return stage.rewards();
    }

    /** 记录匹配到的守军，后续失败重试仍用这一份快照和上一次剩余生命。 */
    private void match(RoleProfile role, Progress p, TrialRules.Stage stage, long now, long maximum) {
        try {
            p.opponents.put(stage.node(), combat.match(role, dayStart(now), maximum, stage,
                    List.copyOf(p.opponents.values())));
        } catch (IllegalArgumentException | UnsupportedOperationException failure) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "TRIAL_BATTLE_UNAVAILABLE", failure);
        }
    }

    /** 据原派遣上限冻结已经达到参战等级的本人英雄，当日不能重复派出。 */
    private void dispatchAssist(RoleProfile role, Progress p, String heroId) {
        var hero = heroes.find(role.id(), heroId).orElseThrow(() -> conflict("TRIAL_ASSIST_UNAVAILABLE"));
        var own = repository.ownDispatches(role.id(), p.resetAt);
        if (hero.level() < rules.config().heroMinimumLevel() || own.size() >= rules.config().assistDispatchLimit()
                || own.stream().anyMatch(dispatch -> hero.id().equals(dispatch.snapshot().id()))) {
            throw conflict("TRIAL_ASSIST_UNAVAILABLE");
        }
        repository.dispatch(role.id(), p.resetAt, TrialRepository.HeroSnapshot.capture(hero));
    }

    /** 仅从当日好友派遣中借用原快照，使用本人最强英雄核对 120% 门槛。 */
    private void selectAssist(RoleProfile role, Progress p, String heroId) {
        if (p.selected.size() >= rules.config().assistSelectLimit() || p.selected.containsKey(heroId)) {
            throw conflict("TRIAL_ASSIST_UNAVAILABLE");
        }
        var dispatch = repository.friendDispatches(role.id(), p.resetAt).stream()
                .filter(candidate -> candidate.snapshot().id().equals(heroId)).findFirst()
                .orElseThrow(() -> conflict("TRIAL_ASSIST_UNAVAILABLE"));
        if (dispatch.snapshot().power() >= assistLimit(role.id())) {
            throw conflict("TRIAL_ASSIST_POWER");
        }
        p.selected.put(heroId, dispatch);
    }

    /** 仅能取消尚未保存到试炼阵容的本日助战。 */
    private static void cancelAssist(Progress p, String heroId) {
        if (p.used.contains(heroId) || p.selected.remove(heroId) == null) {
            throw conflict("TRIAL_ASSIST_UNAVAILABLE");
        }
    }

    /** 由角色最高单体战力重算借用上界，使用万分比整数避免客户端浮点漂移。 */
    private long assistLimit(String role) {
        long best = heroes.list(role).stream().mapToLong(hero -> hero.panelStats().power()).max().orElse(0);
        return (best * rules.config().assistPowerRatio() + 9_999) / 10_000;
    }

    /** 检查活动英雄仍属于自己或已经确认借用，并且至少存在一个普通上阵位置。 */
    private HeroBattleInputService.Input lineupInput(String role, Progress p, int placement, List<Lineup.Slot> slots) {
        if (slots.isEmpty() || slots.size() > 6 || slots.stream().anyMatch(slot ->
                slot.position() == null || slot.position() <= 0 || slot.position() > 8)) {
            throw conflict("TRIAL_FORMATION_INVALID");
        }
        var owned = eligibleHeroes(role);
        HeroProfile borrowed = null;
        for (var slot : slots) {
            if (owned.containsKey(slot.heroId())) {
                continue;
            }
            var allowed = p.selected.get(slot.heroId());
            if (allowed == null || borrowed != null) {
                throw conflict("TRIAL_FORMATION_INVALID");
            }
            borrowed = allowed.snapshot().hero();
        }
        try {
            return battleInputs.forAssistedFormation(role, p.version, placement, slots, borrowed);
        } catch (IllegalArgumentException | IllegalStateException failure) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "TRIAL_FORMATION_INVALID", failure);
        }
    }

    /** 只把符合试炼等级要求的本人英雄纳入独立阵容。 */
    private Map<String, HeroProfile> eligibleHeroes(String role) {
        return heroes.list(role).stream().filter(hero -> hero.level() >= rules.config().heroMinimumLevel())
                .collect(Collectors.toMap(HeroProfile::id, Function.identity()));
    }

    /** 已保存阵容保留自己的有效英雄，过期借用和已分解英雄不会送入战斗。 */
    private Formation currentFormation(String role, Progress p) {
        var owned = eligibleHeroes(role);
        if (p.formationId != 0) {
            return new Formation(p.formationId, p.slots.stream().filter(slot -> owned.containsKey(slot.heroId())
                    || p.selected.containsKey(slot.heroId())).toList());
        }
        var fallback = formations.current(role);
        return new Formation(fallback.formationId(), fallback.slots().stream().filter(slot -> slot.position() <= 8
                && owned.containsKey(slot.heroId())).toList());
    }

    /** 累计实际通关次数，试炼关数成就按新的历史最高关号增加。 */
    private void recordVictory(String role, Progress p, int displayLevel, long now) {
        events.publishEvent(new QuestProgressEvent(role, QuestMetric.PASS_ADVEN, 0, 1, now));
        if (displayLevel > p.highestLevel) {
            int improvement = displayLevel - p.highestLevel;
            p.highestLevel = displayLevel;
            events.publishEvent(new QuestProgressEvent(role, QuestMetric.ADVEN_LEVEL, 0, improvement, now));
        }
    }

    /** 关卡、宝箱及每日继承奖走统一真实资产入账，进度与回执失败时会一并回滚。 */
    private RewardGrantResult grant(String role, Progress p, List<Reward> awards, long now) {
        if (awards.isEmpty()) {
            return null;
        }
        var actual = grants.grant(role, awards, new RewardGrantService.Context(now, 0), ThreadLocalRandom.current());
        awards.forEach(reward -> p.rewards.merge(reward.itemId(), reward.quantity(), Math::addExact));
        sync.changed(role);
        return actual;
    }

    /** 合并回退跳过的奖励，保持旧节点产出总量和顺序。 */
    private static List<Reward> merged(List<Reward> awards) {
        var quantities = new LinkedHashMap<Integer, Long>();
        awards.forEach(reward -> quantities.merge(reward.itemId(), reward.quantity(), Math::addExact));
        return rewardList(quantities);
    }

    /** 将编号到数量的内部累计映射转为下发奖励格式。 */
    private static List<Reward> rewardList(Map<Integer, Long> quantities) {
        return quantities.entrySet().stream().map(row -> new Reward(row.getKey(), row.getValue())).toList();
    }

    /** 快照由同一持久角色进度构造，未开放的地图点仍显示原布局和产出。 */
    private State view(String role, Progress p, BattleReplay replay, long maximum) {
        var formation = currentFormation(role, p);
        var nodes = p.difficulty == 0 ? List.<Node>of() : rules.stages(p.difficulty).stream().map(stage -> {
            var defense = p.opponents.get(stage.node());
            return new Node(stage.node(), stage.battle() ? "battle" : "chest", nodeStatus(p, stage, defense),
                    stage.displayLevel(), stage.rewards(), defense == null ? null : combat.opponent(defense));
        }).toList();
        var difficulties = rules.config().difficulties().stream().map(difficulty ->
                new Difficulty(difficulty.id(), difficulty.minimumPower(), difficulty.previewRewards(),
                        rules.combatReady(difficulty.id()))).toList();
        var battle = p.lastBattle == null ? null
                : new Battle(p.lastBattle.battleId(), p.lastBattle.node(), p.lastBattle.won(), replay);
        return new State(p.version, rules.config().minimumLevel(), p.resetAt, p.difficulty, maxDifficulty(p, maximum),
                p.completedDifficulty, p.currentNode, 0, 0, null, formation.id(), formation.slots(),
                nodes, List.copyOf(p.heroHealth.values()), rewardList(p.rewards), battle, difficulties);
    }

    /** 战斗格显示实际可用性；未支持的原守军保持当前匹配，宝箱依然可以单独领取。 */
    private String nodeStatus(Progress p, TrialRules.Stage stage, TrialCombat.Defense defense) {
        if (p.cleared.contains(stage.node())) {
            return "cleared";
        }
        boolean available = stage.battle() ? stage.node() == p.currentNode : p.cleared.contains(stage.node() - 1);
        if (available && stage.battle() && defense != null && !combat.ready(defense)) {
            return "blocked";
        }
        return available ? "available" : "locked";
    }

    /** 策划条件和服务端实际可用范围共同决定玩家当前可选档位。 */
    private int maxDifficulty(Progress p, long power) {
        return rules.config().difficulties().stream()
                .filter(difficulty -> rules.combatReady(difficulty.id()) && difficulty.id() <= p.completedDifficulty + 1
                        && power >= difficulty.minimumPower())
                .mapToInt(TrialRules.Difficulty::id).max().orElse(0);
    }

    /** 业务校验动作的专属字段，即使测试或其他内部调用方不经 WS 也不能伪造命令。 */
    private static void validateCommand(Command command) {
        if (command == null || !RewardReceiptPayloads.validId(command.requestId()) || command.expectedVersion() < 0
                || command.action() == null || command.slots() == null || command.heroIds() == null
                || command.choice() < 0 || command.formationId() < 0) {
            throw badRequest();
        }
        boolean noLineup = command.formationId() == 0 && command.slots().isEmpty();
        boolean noTarget = command.targetId() == null;
        boolean valid = switch (command.action()) {
            case "selectDifficulty", "fight", "claim" -> command.choice() > 0 && noLineup && noTarget
                    && command.heroIds().isEmpty();
            case "saveFormation" -> command.choice() == 0 && command.formationId() > 0 && noTarget
                    && command.heroIds().isEmpty();
            case "dispatchAssist", "selectAssist", "cancelAssist" -> command.choice() == 0 && noLineup
                    && RewardReceiptPayloads.validId(command.targetId()) && command.heroIds().isEmpty();
            case "revive" -> command.choice() == 0 && noLineup && noTarget && !command.heroIds().isEmpty()
                    && command.heroIds().size() <= 6 && new HashSet<>(command.heroIds()).size() == command.heroIds().size()
                    && command.heroIds().stream().allMatch(RewardReceiptPayloads::validId);
            default -> false;
        };
        if (!valid) {
            throw badRequest();
        }
    }

    /** 计算上海自然日开始秒数，用于连续日比较和新角色机器匹配。 */
    private static long dayStart(long now) {
        return Instant.ofEpochSecond(now).atZone(RESET_ZONE).toLocalDate().atStartOfDay(RESET_ZONE).toEpochSecond();
    }

    /** 计算当前试炼会话的下一次自然日重置秒数。 */
    private static long resetAt(long now) {
        return Instant.ofEpochSecond(now).atZone(RESET_ZONE).toLocalDate().plusDays(1)
                .atStartOfDay(RESET_ZONE).toEpochSecond();
    }

    /** 统一返回客户端可识别的错误命令。 */
    private static ResponseStatusException badRequest() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "TRIAL_REQUEST_INVALID");
    }

    /** 返回可安全提示的领域拒绝码，数据库错误仍由事务框架处理。 */
    private static ResponseStatusException conflict(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
