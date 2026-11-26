/**
 * 永恒梦境独立阵容、连战进度和结算。协议处理层调用状态和命令入口，所有推进、发奖和
 * 原回执在同一角色锁内写入。冻结的攻方与战报用于继续挑战和断线恢复。
 */
package com.funsgamex.mxzg.dreamland;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.DreamlandResult;
import com.funsgamex.mxzg.hero.HeroBattleChapterScenario.Unit;
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
import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DreamlandService {
    /** 报告因战斗能力缺口而自动结束的冒险，保留进度后不再对同一场重试。 */
    private static final Logger LOG = LoggerFactory.getLogger(DreamlandService.class);
    /** 所有新区服使用上海自然日处理起始层、每日奖励次数及跨日收尾。 */
    private static final ZoneId RESET_ZONE = ZoneId.of("Asia/Shanghai");
    /** 旧服每分钟检查自动开始和自动确认，正常续战的两次操作至少跨一个扫描点。 */
    private static final int LEGACY_SCAN_SECONDS = 60;

    /** 响应依据服务端期限和当前阶段，不以客户端画面判断一局是否已经结算。 */
    public enum Phase { READY, SELECT_BUFF, NEXT_BATTLE, RESULT }

    /** 命令中的选择值仅用于增益或里程碑；阵容操作单独附带阵型和站位。 */
    public record Command(String requestId, long expectedVersion, String action, int choice,
                          int formationId, List<Lineup.Slot> slots) {}

    /** 一组可选增益的旧表编号、简体标题和战斗效果。 */
    public record BuffOption(int id, String name, String description) {}

    /** 历史通关里程碑的楼层标识、原奖项和已领取状态。 */
    public record Milestone(int id, int floor, boolean claimed, List<Reward> rewards) {}

    /** 已经完成模拟、尚待玩家确认的战场及原始战报。 */
    public record BattleState(String battleId, int floor, boolean won, @JsonIgnore BattleReplay replay) {}

    /** 当前服务端快照；楼层为绝对值，期限均为 Unix 秒。 */
    public record State(long version, int minimumLevel, int maxFloor, int startFloor, int currentFloor,
                        int highestFloor, int todayHighestFloor, int todayRewardFloor, int challengeCount,
                        Phase phase, long deadlineSeconds, long resetAtSeconds, int activeBuffId,
                        List<BuffOption> buffs, List<Lineup.Slot> slots, int formationId,
                        List<Reward> pendingRewards, List<Milestone> milestones, BattleState battle) {
        /** 历史回执 JSON 不存 Protobuf 对象，二进制战报与 JSON 并行保存。 */
        State withoutReplay() {
            return copyWithReplay(null);
        }

        /** 只为原结果恢复同一场战报，发现半条回执立即拒绝。 */
        State withReplay(BattleReplay replay) {
            if ((battle == null) != (replay == null)
                    || (replay != null && !("dreamland:" + battle.floor()).equals(replay.getScenario()))) {
                throw new IllegalStateException("永恒梦境回执战报与状态不一致");
            }
            return copyWithReplay(replay);
        }

        /** 改变战报承载格式时保留原冻结的玩法数据。 */
        private State copyWithReplay(BattleReplay replay) {
            return new State(version, minimumLevel, maxFloor, startFloor, currentFloor, highestFloor, todayHighestFloor,
                    todayRewardFloor, challengeCount, phase, deadlineSeconds, resetAtSeconds, activeBuffId, buffs, slots,
                    formationId, pendingRewards, milestones,
                    battle == null ? null : new BattleState(battle.battleId(), battle.floor(), battle.won(), replay));
        }
    }

    /** 用户命令冻结原进度与实际到账，当前资产仍由公共快照同步。 */
    public record Settlement(String requestId, String roleId, long assetRevision, String action,
                             State state, RewardGrantResult actual) {}

    /** 已通关的历史与日内绝对楼层；专用阵型 0 表示尚未保存；run 为空表示可以开始。 */
    record Progress(long version, int startFloor, int highestFloor, int todayHighestFloor, int todayRewardFloor,
                    int challengeCount, long resetAt, int formationId, List<Lineup.Slot> slots,
                    int claimedMilestone, Run run) {
        /** 替换本次冒险，不移动当天已领或历史层数。 */
        Progress withRun(Run next) {
            return new Progress(version, startFloor, highestFloor, todayHighestFloor, todayRewardFloor,
                    challengeCount, resetAt, formationId, slots, claimedMilestone, next);
        }

        /** 只在已接受的业务命令或定时变化时递增持久版本。 */
        Progress bump() {
            return new Progress(Math.incrementExact(version), startFloor, highestFloor, todayHighestFloor,
                    todayRewardFloor, challengeCount, resetAt, formationId, slots, claimedMilestone, run);
        }
    }

    /** 序列化冻结攻方、续战生命及用量；当前层仅在战报确认后推进，期限为 Unix 秒。 */
    record Run(int currentFloor, Phase phase, long deadline, int activeBuffId, List<Integer> buffChoices,
               List<Unit> attacker, Map<Integer, Long> remainingHp, Map<Integer, Map<Integer, Integer>> effectUses,
               String battleId, boolean won) {
        /** 回放确认会替换阶段和期限，同时清除已确认战报的身份。 */
        Run advanced(int nextFloor, Phase nextPhase, long nextDeadline) {
            return new Run(nextFloor, nextPhase, nextDeadline, activeBuffId, buffChoices,
                    attacker, remainingHp, effectUses, null, false);
        }
    }

    /** 单次逻辑推进的持久进度、当前战报及需在同事务发放的累计奖励。 */
    private record Step(Progress progress, BattleReplay replay, List<Reward> awards) {}

    /** 对外命令只信任已鉴权的套接字会话。 */
    private final SessionService sessions;
    /** 所有进度和奖励写入复用角色行锁及资产版本。 */
    private final RoleRepository roles;
    /** 梦境持久进度、活跃战报和命令幂等回执。 */
    private final DreamlandRepository repository;
    /** 旧表静态规则和本期开放上限。 */
    private final DreamlandRules rules;
    /** 提供永久解锁阵型及用户首次进入时的默认阵容。 */
    private final MainFormationStateService formations;
    /** 复用相同的站位、英雄等级和同模板校验。 */
    private final MainFormationRules formationRules;
    /** 专用阵容只能保存归属当前角色的英雄。 */
    private final HeroRepository heroes;
    /** 在角色锁中按指定阵容生成攻方基础快照。 */
    private final HeroBattleInputService inputs;
    /** 用统一技能、属性及战报执行链模拟配置守军。 */
    private final HeroLineupBattleService battles;
    /** 结算继续使用可信领奖入口，不直接改钱包或库存。 */
    private final RewardGrantService grants;
    /** 发奖后由应用统一在事务提交完成时同步资产。 */
    private final AssetSyncService sync;
    /** 提供游戏秒和上海自然日，不采用客户端时间。 */
    private final GameClock clock;
    /** 仅实际交战时增加旧「永恒梦境战斗」任务进度。 */
    private final ApplicationEventPublisher events;

    /** 注入现有领域入口和梦境持久化，不读取当前会话或修改资产。 */
    public DreamlandService(SessionService sessions, RoleRepository roles, DreamlandRepository repository,
                            DreamlandRules rules, MainFormationStateService formations, MainFormationRules formationRules,
                            HeroRepository heroes, HeroBattleInputService inputs, HeroLineupBattleService battles,
                            RewardGrantService grants, AssetSyncService sync, GameClock clock,
                            ApplicationEventPublisher events) {
        this.sessions = sessions;
        this.roles = roles;
        this.repository = repository;
        this.rules = rules;
        this.formations = formations;
        this.formationRules = formationRules;
        this.heroes = heroes;
        this.inputs = inputs;
        this.battles = battles;
        this.grants = grants;
        this.sync = sync;
        this.clock = clock;
        this.events = events;
    }

    /** 打开或重连时补做已到期的进度，当前战报仍是本次战斗已持久的原字节。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State state(String token) {
        var profile = access(token);
        return state(profile.id(), catchUp(profile, repository.find(profile.id()), clock.epochSeconds()));
    }

    /** 自动推进与玩家命令串行，取得角色锁后重新取时，避免批次等待时越过上海日界。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void advanceDue(String role) {
        roles.lock(role);
        var stored = repository.find(role);
        if (stored == null || stored.progress().run() == null) {
            return;
        }
        catchUp(roles.findById(role).orElseThrow(), stored, clock.epochSeconds());
    }

    /** 重试返回原结果；首次接受的命令与奖项、任务和回执一起原子提交。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Settlement act(String token, Command command) {
        validateCommand(command);
        var profile = access(token);
        var role = profile.id();
        var receipt = repository.receipt(role, command.requestId());
        if (receipt != null) {
            if (!receipt.command().equals(command)) {
                throw rejected("DREAMLAND_REQUEST_CONFLICT");
            }
            return receipt.result();
        }
        long now = clock.epochSeconds();
        var stored = catchUp(profile, repository.find(role), now);
        if (stored.progress().version() != command.expectedVersion()) {
            throw rejected("DREAMLAND_STATE_CHANGED");
        }
        var step = command(profile, stored, command, now);
        var next = writeStep(role, stored, step);
        var actual = grant(role, step.awards(), now);
        var result = new Settlement(command.requestId(), role, roles.revision(role), command.action(),
                state(role, next), actual);
        repository.saveReceipt(command, result);
        return result;
    }

    /** 未达到旧开放等级拒绝访问；等待角色锁期间的已失效会话也必须拒绝。 */
    private RoleProfile access(String token) {
        String role = sessions.requireRole(token);
        roles.lock(role);
        if (!role.equals(sessions.requireRole(token))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
        var profile = roles.findById(role).orElseThrow();
        if (profile.level() < rules.config().minimumLevel()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "DREAMLAND_LEVEL");
        }
        return profile;
    }

    /** 先限制命令形态，防止无效参数参与幂等排序或被服务端错误忽略。 */
    private static void validateCommand(Command command) {
        if (command == null || !RewardReceiptPayloads.validId(command.requestId())
                || command.expectedVersion() < 0 || command.action() == null || command.slots() == null
                || command.choice() < 0 || command.formationId() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "DREAMLAND_REQUEST_INVALID");
        }
        boolean valid = switch (command.action()) {
            case "START", "NEXT", "END" -> command.choice() == 0 && command.formationId() == 0 && command.slots().isEmpty();
            case "SELECT_BUFF", "CLAIM" -> command.choice() > 0 && command.formationId() == 0 && command.slots().isEmpty();
            case "SAVE_FORMATION" -> command.choice() == 0 && command.formationId() > 0 && !command.slots().isEmpty();
            default -> false;
        };
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "DREAMLAND_REQUEST_INVALID");
        }
    }

    /** 按动作只允许可信的阶段转换；正在运行时允许领取此前达成的里程碑。 */
    private Step command(RoleProfile profile, DreamlandRepository.Stored stored, Command command, long now) {
        var before = stored.progress();
        return switch (command.action()) {
            case "START" -> start(profile.id(), before, now);
            case "SELECT_BUFF" -> selectBuff(profile, before, command.choice(), now);
            case "NEXT" -> next(profile, before, now);
            case "END" -> {
                requireRun(before);
                yield finish(before);
            }
            case "CLAIM" -> claim(before, stored.replay(), command.choice());
            case "SAVE_FORMATION" -> saveFormation(profile.id(), before, command.formationId(), command.slots());
            default -> throw new IllegalStateException("未知的已校验梦境命令");
        };
    }

    /** 初次进入返回版本 0；只在同一天内补做自动挑战，跨日时先结算已确认胜场。 */
    private DreamlandRepository.Stored catchUp(RoleProfile profile, DreamlandRepository.Stored stored, long now) {
        if (stored == null) {
            return new DreamlandRepository.Stored(new Progress(0, 0, 0, 0, 0, 0, nextReset(now),
                    0, List.of(), 0, null), null);
        }
        String role = profile.id();
        if (now >= stored.progress().resetAt()) {
            return resetDay(role, stored, now);
        }
        var current = stored;
        while (current.progress().run() != null) {
            var progress = current.progress();
            var run = progress.run();
            if (run.deadline() > now) {
                break;
            }
            long at = run.deadline();
            var step = automaticStep(profile, progress, at);
            current = writeStep(role, current, step);
            grant(role, step.awards(), now);
        }
        return current;
    }

    /** 按旧服先清理上期活动挑战，确认过的胜场照常到账；未确认战报与未开打楼层不会补打。 */
    private DreamlandRepository.Stored resetDay(String role, DreamlandRepository.Stored stored, long now) {
        var finished = finish(stored.progress());
        grant(role, finished.awards(), now);
        var previous = finished.progress();
        int start = Math.max(0, previous.highestFloor() - rules.config().resetFloorCount());
        var ready = new Progress(previous.version(), start, previous.highestFloor(), start, start, 0,
                nextReset(now), previous.formationId(), previous.slots(), previous.claimedMilestone(), null);
        return writeStep(role, stored, new Step(ready, null, List.of()));
    }

    /** 到期时自动选取已发候选或推进战报；无法执行的战场按旧流程结束并保留已确认胜场。 */
    private Step automaticStep(RoleProfile profile, Progress progress, long at) {
        var run = progress.run();
        try {
            if (run.phase() == Phase.SELECT_BUFF) {
                int choice = run.buffChoices().get(ThreadLocalRandom.current().nextInt(run.buffChoices().size()));
                return selectBuff(profile, progress, choice, at);
            }
            return next(profile, progress, at);
        } catch (ResponseStatusException failure) {
            if (!"DREAMLAND_BATTLE_UNAVAILABLE".equals(failure.getReason())) {
                throw failure;
            }
            LOG.warn("永恒梦境自动战斗无法执行，结束当前冒险，角色={}，楼层={}",
                profile.id(), run.currentFloor() + 1, failure);
            return finish(progress);
        }
    }

    /** 按已解锁阵型保存专用阵容，启动后由开战快照冻结，不允许替换已冻结的英雄。 */
    private Step saveFormation(String role, Progress before, int formationId, List<Lineup.Slot> slots) {
        requireReady(before);
        if (slots.size() > 8 || slots.stream().anyMatch(slot -> slot == null || slot.position() == null
                || slot.position() < 1 || slot.position() > 8 || !RewardReceiptPayloads.validId(slot.heroId()))) {
            throw rejected("DREAMLAND_FORMATION_INVALID");
        }
        var main = formations.current(role);
        var unlocked = new MainFormationRules.Unlocks(new HashSet<>(main.unlockedIds()), false);
        var owned = heroes.list(role).stream().map(hero -> new MainFormationRules.Hero(
                hero.id(), hero.templateId(), hero.level(), hero.star())).toList();
        List<Lineup.Slot> normalized;
        try {
            normalized = formationRules.normalize(formationId, unlocked, owned, slots);
        } catch (IllegalArgumentException error) {
            throw rejected("DREAMLAND_FORMATION_INVALID");
        }
        if (normalized.size() != slots.size()) {
            throw rejected("DREAMLAND_FORMATION_INVALID");
        }
        var sorted = normalized.stream().sorted(Comparator.comparingInt(Lineup.Slot::position)).toList();
        var updated = new Progress(before.version(), before.startFloor(), before.highestFloor(),
                before.todayHighestFloor(), before.todayRewardFloor(), before.challengeCount(), before.resetAt(),
                formationId, sorted, before.claimedMilestone(), null);
        return new Step(updated, null, List.of());
    }

    /** 锁定当前专用阵容，第一次打开时可用已有主线阵容，立即进入增益选择。 */
    private Step start(String role, Progress before, long now) {
        requireReady(before);
        if (before.startFloor() >= rules.maxFloor()) {
            throw rejected("DREAMLAND_FLOOR_UNAVAILABLE");
        }
        var lineup = lineup(role, before);
        if (lineup.slots().isEmpty()) {
            throw rejected("DREAMLAND_FORMATION_EMPTY");
        }
        var input = inputs.forFormation(role, before.version(), lineup.formationId(), lineup.slots());
        var attacker = battles.freezeDreamlandFormation(input);
        var run = new Run(before.startFloor(), Phase.SELECT_BUFF, now + rules.config().buffAutoSeconds(),
                0, rules.chooseBuffs(ThreadLocalRandom.current()), attacker, Map.of(), Map.of(), null, false);
        var started = new Progress(before.version(), before.startFloor(), before.highestFloor(),
                before.todayHighestFloor(), before.todayRewardFloor(), Math.incrementExact(before.challengeCount()),
                before.resetAt(), lineup.formationId(), lineup.slots(), before.claimedMilestone(), run);
        return new Step(started, null, List.of());
    }

    /** 所选增益必须属于本轮已经持久化的候选，新的三项为下次五连胜阶段预先冻结。 */
    private Step selectBuff(RoleProfile profile, Progress progress, int choice, long now) {
        var run = requireRun(progress);
        if (run.phase() != Phase.SELECT_BUFF || !run.buffChoices().contains(choice)) {
            throw rejected("DREAMLAND_BUFF_INVALID");
        }
        var selected = new Run(run.currentFloor(), Phase.NEXT_BATTLE, now, choice,
                rules.chooseBuffs(ThreadLocalRandom.current()), run.attacker(), run.remainingHp(),
                run.effectUses(), null, false);
        return fight(profile, progress.withRun(selected), now, true);
    }

    /** 选择「继续」可启动下一战或确认已播放的战报；五连胜后重新选择增益。 */
    private Step next(RoleProfile profile, Progress progress, long now) {
        var run = requireRun(progress);
        if (run.phase() == Phase.NEXT_BATTLE) {
            return fight(profile, progress, now, false);
        }
        if (run.phase() != Phase.RESULT) {
            throw rejected("DREAMLAND_PHASE");
        }
        if (!run.won()) {
            return finish(progress);
        }
        int floor = run.currentFloor() + 1;
        var config = rules.config();
        boolean chooseBuff = (floor - progress.startFloor()) % config.buffInterval() == 0;
        var phase = chooseBuff ? Phase.SELECT_BUFF : Phase.NEXT_BATTLE;
        var deadline = now + (chooseBuff ? config.buffAutoSeconds() : config.battleFrequencySeconds());
        var won = new Progress(progress.version(), progress.startFloor(), Math.max(progress.highestFloor(), floor),
                Math.max(progress.todayHighestFloor(), floor), progress.todayRewardFloor(), progress.challengeCount(),
                progress.resetAt(), progress.formationId(), progress.slots(), progress.claimedMilestone(),
                run.advanced(floor, phase, deadline));
        return floor == rules.maxFloor() ? finish(won) : new Step(won, null, List.of());
    }

    /** 模拟下一层并只保存原结果及其续战状态；实际经验、发奖和通关确认分阶段提交。 */
    private Step fight(RoleProfile profile, Progress progress, long now, boolean firstWithBuff) {
        var run = progress.run();
        int floor = run.currentFloor() + 1;
        if (floor > rules.maxFloor()) {
            throw rejected("DREAMLAND_FLOOR_UNAVAILABLE");
        }
        var buff = rules.buff(run.activeBuffId());
        boolean applyBuff = buff.addType() == 1 || firstWithBuff;
        var random = ThreadLocalRandom.current();
        DreamlandResult result;
        try {
            result = battles.dreamland(floor, run.attacker(), rules.stage(floor).enemies(), run.remainingHp(),
                    run.effectUses(), applyBuff ? buff.attributeId() : 0, applyBuff ? buff.value() : 0,
                    chance -> random.nextDouble() < chance);
        } catch (IllegalArgumentException | UnsupportedOperationException failure) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "DREAMLAND_BATTLE_UNAVAILABLE", failure);
        }
        var report = HeroBattleReplayProtocolUtils.encode(result.report()).toBuilder()
                .setAttackerName(profile.nickname()).setDefenderName("永恒梦境第" + floor + "层").build();
        boolean won = result.report().outcome() == HeroBattleRoundUtils.Outcome.ATTACKER_WIN;
        var remainingHp = new LinkedHashMap<Integer, Long>();
        run.attacker().forEach(unit -> remainingHp.put(unit.id(), result.report().finalHp().get(unit.id())));
        long deadline = firstWithBuff ? now + rules.config().battleFrequencySeconds() : resultDeadline(run, now);
        var resolved = new Run(run.currentFloor(), Phase.RESULT, deadline,
                run.activeBuffId(), run.buffChoices(), run.attacker(), remainingHp, result.effectUses(),
                UUID.randomUUID().toString(), won);
        events.publishEvent(new QuestProgressEvent(profile.id(), QuestMetric.INFINITE_CHALLENGE, 0, 1, now));
        return new Step(progress.withRun(resolved), report, List.of());
    }

    /**
     * 常规开打不重置原 BATTLE 时钟。确认战报最早在原超时后的分钟扫描点，
     * 且不能在生成这场战报的同一扫描点确认。
     */
    private static long resultDeadline(Run run, long now) {
        long firstDueScan = (run.deadline() + LEGACY_SCAN_SECONDS - 1) / LEGACY_SCAN_SECONDS * LEGACY_SCAN_SECONDS;
        long nextScan = (now / LEGACY_SCAN_SECONDS + 1) * LEGACY_SCAN_SECONDS;
        return Math.max(firstDueScan, nextScan);
    }

    /** 手动结束、失败和达到上限共用结算；只有已确认胜场才计入今天首次达到的楼层。 */
    private Step finish(Progress progress) {
        if (progress.run() == null) {
            return new Step(progress, null, List.of());
        }
        int floor = progress.run().currentFloor();
        var awards = pending(progress);
        var ready = new Progress(progress.version(), progress.startFloor(), progress.highestFloor(),
                progress.todayHighestFloor(), Math.max(floor, progress.todayRewardFloor()), progress.challengeCount(),
                progress.resetAt(), progress.formationId(), progress.slots(), progress.claimedMilestone(), null);
        return new Step(ready, null, awards);
    }

    /** 核对当前首个待领取的目标及历史最高层，保留逐档领取和旧奖励上界标记。 */
    private Step claim(Progress progress, BattleReplay replay, int id) {
        if (id <= progress.claimedMilestone()) {
            throw rejected("DREAMLAND_MILESTONE_CLAIMED");
        }
        var milestone = rules.config().milestones().stream().filter(row -> row.floor() > progress.claimedMilestone())
                .findFirst().orElseThrow(() -> rejected("DREAMLAND_MILESTONE_LOCKED"));
        if (id != milestone.floor() || id > progress.highestFloor() || id > rules.maxFloor()) {
            throw rejected("DREAMLAND_MILESTONE_LOCKED");
        }
        var claimed = new Progress(progress.version(), progress.startFloor(), progress.highestFloor(),
                progress.todayHighestFloor(), progress.todayRewardFloor(), progress.challengeCount(), progress.resetAt(),
                progress.formationId(), progress.slots(), id, progress.run());
        return new Step(claimed, replay, milestone.rewards());
    }

    /** 汇总本日尚未领取的新楼层；从当天回退起点算前五层使用旧完整份额。 */
    private List<Reward> pending(Progress progress) {
        if (progress.run() == null) {
            return List.of();
        }
        var merged = new LinkedHashMap<Integer, Long>();
        int standardEnd = progress.startFloor() + rules.config().standardRewardFloorCount();
        for (int floor = progress.todayRewardFloor() + 1; floor <= progress.run().currentFloor(); floor++) {
            var stage = rules.stage(floor);
            var rewards = floor <= standardEnd ? stage.standardRewards() : stage.afterRewards();
            rewards.forEach(reward -> merged.merge(reward.itemId(), reward.quantity(), Math::addExact));
        }
        return merged.entrySet().stream().map(row -> new Reward(row.getKey(), row.getValue())).toList();
    }

    /** 在同一角色锁中提交新版本；初次操作之前未必有持久行。 */
    private DreamlandRepository.Stored writeStep(String role, DreamlandRepository.Stored before, Step step) {
        var next = new DreamlandRepository.Stored(step.progress().bump(), step.replay());
        // 只读初始状态是临时行；该版本还没有任何数据库更新。
        repository.save(role, before.progress().version() == 0 ? null : before, next);
        return next;
    }

    /** 有真实结算奖励时更新资产版本；空列表不会虚增角色资产版本。 */
    private RewardGrantResult grant(String role, List<Reward> awards, long now) {
        if (awards.isEmpty()) {
            return null;
        }
        var actual = grants.grant(role, awards, new RewardGrantService.Context(now, 0), ThreadLocalRandom.current());
        sync.changed(role);
        return actual;
    }

    /** 展示独立阵容；尚未保存时读取现有主线站位作为草稿，不带助战位。 */
    private LineupState lineup(String role, Progress progress) {
        if (progress.formationId() > 0) {
            return new LineupState(progress.formationId(), progress.slots());
        }
        var main = formations.current(role);
        var slots = main.slots().stream().filter(slot -> slot.position() < 9).toList();
        return new LineupState(main.formationId(), slots);
    }

    /** 确认初次草稿和独立阵容只公开玩法所需的阵型及站位。 */
    private record LineupState(int formationId, List<Lineup.Slot> slots) {}

    /** 描述当前版本、技能选择、累计奖励以及断线后可复播的战报。 */
    private State state(String role, DreamlandRepository.Stored stored) {
        var progress = stored.progress();
        var run = progress.run();
        var lineup = lineup(role, progress);
        var milestones = rules.config().milestones().stream().filter(row -> row.floor() <= rules.maxFloor())
                .map(row -> new Milestone(row.floor(), row.floor(), row.floor() <= progress.claimedMilestone(),
                        row.rewards())).toList();
        List<BuffOption> buffs = run == null || run.phase() != Phase.SELECT_BUFF ? List.of() : run.buffChoices().stream()
                .map(rules::buff).map(buff -> {
                    String[] text = buff.title().split("\n", 2);
                    return new BuffOption(buff.id(), text[0], text.length == 2 ? text[1] : buff.battleTitle());
                }).toList();
        var battle = run == null || run.phase() != Phase.RESULT ? null
                : new BattleState(run.battleId(), run.currentFloor() + 1, run.won(), stored.replay());
        if (battle != null && battle.replay() == null) {
            throw new IllegalStateException("永恒梦境进行中的战报丢失");
        }
        return new State(progress.version(), rules.config().minimumLevel(), rules.maxFloor(), progress.startFloor(),
                run == null ? progress.startFloor() : run.currentFloor(), progress.highestFloor(),
                progress.todayHighestFloor(), progress.todayRewardFloor(), progress.challengeCount(),
                run == null ? Phase.READY : run.phase(), run == null ? 0 : run.deadline(), progress.resetAt(),
                run == null ? 0 : run.activeBuffId(), buffs, lineup.slots(), lineup.formationId(), pending(progress),
                milestones, battle);
    }

    /** READY 以没有活动冒险表示；重发只有原回执能绕过阶段检查。 */
    private static void requireReady(Progress progress) {
        if (progress.run() != null) {
            throw rejected("DREAMLAND_PHASE");
        }
    }

    /** 需要活动冒险的请求在结束后不能意外开启下一局。 */
    private static Run requireRun(Progress progress) {
        if (progress.run() == null) {
            throw rejected("DREAMLAND_PHASE");
        }
        return progress.run();
    }

    /** 返回业务时刻所在上海自然日的下一次零点。 */
    private static long nextReset(long now) {
        return Instant.ofEpochSecond(now).atZone(RESET_ZONE).toLocalDate().plusDays(1)
                .atStartOfDay(RESET_ZONE).toEpochSecond();
    }

    /** 普通玩法冲突由协议统一翻译为玩家反馈，不泄漏内部数据。 */
    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
