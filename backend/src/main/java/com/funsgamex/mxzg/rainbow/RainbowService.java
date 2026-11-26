/**
 * 彩虹圣殿规则和事务入口。按本服竞技场名次决定资格，战斗使用配置守军与独立进攻阵容。
 * 胜负回执、占位转移、冷却、战报和失位通知都以已提交的持久状态为准。
 */
package com.funsgamex.mxzg.rainbow;

import com.funsgamex.mxzg.arena.ArenaSeasonService;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils;
import com.funsgamex.mxzg.hero.HeroBattleRoundUtils;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.mail.MailService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.protocol.GameProtocol.BattleReplay;
import com.funsgamex.mxzg.rainbow.RainbowRepository.Attempt;
import com.funsgamex.mxzg.rainbow.RainbowRepository.Occupation;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import com.google.protobuf.InvalidProtocolBufferException;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.TreeSet;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RainbowService {
    /** 原版属性表的百分比攻击和生命编号。 */
    private static final int ATTACK_RATE = 201;
    /** 原版生命值百分比编号。 */
    private static final int HEALTH_RATE = 102;

    /** 展示用角色资料；有占位时才下发。 */
    public record Owner(String roleId, String name, int level, int headId, int borderId, int imageId) {}

    /** 神位当前进化、守军技能预览和属性加成，百分比以万分数传输。 */
    public record Seat(int id, int type, int evolution, int requiredRank, Owner owner, Long occupiedUntil,
                       int heroTypeId, int heroStar, List<RainbowRules.Skill> activeSkills,
                       List<RainbowRules.Skill> passiveSkills, long attackBonus, long healthBonus) {}

    /** 六个神位与本人的实时资格，时间均为 Unix 毫秒。 */
    public record State(List<Seat> seats, int arenaRank, long cooldownUntil, RainbowCombat.Formation lineup,
                        long serverTime) {}

    /** 某次挑战的原战果与当前可继续操作的神位状态。 */
    public record Challenge(String requestId, State state, String battleId, BattleReplay replay, boolean won,
                            int seatId, int evolution) {}

    /** 历史所用的参战头像、等级、星级来自开战战报。 */
    public record HistoryHero(int heroTypeId, int level, int star, int iconId) {}

    /** 一个胜场的固定摘要，点击回放时单独拉战报。 */
    public record HistoryEntry(String battleId, String name, int evolution, long foughtAt, int power,
                               List<HistoryHero> heroes) {}

    /** 只包含指定本服神位最近的胜场。 */
    public record History(int seatId, List<HistoryEntry> records) {}

    /** 活跃会话是角色身份的唯一输入。 */
    private final SessionService sessions;
    /** 角色锁和可公开的角色资料。 */
    private final RoleRepository roles;
    /** 神位、冷却及挑战回执的唯一数据源。 */
    private final RainbowRepository repository;
    /** 旧版策划的神位、守军及邮件模板。 */
    private final RainbowRules rules;
    /** 独立阵容和真实守军战斗入口。 */
    private final RainbowCombat combat;
    /** 合并竞技场本服排名和区服写锁。 */
    private final ArenaSeasonService arena;
    /** 在线挑战、离线维护和属性都遵循同一个游戏时间。 */
    private final GameClock clock;
    /** 系统邮件按失位原因用原模板投递。 */
    private final MailService mail;
    /** 神位属性变化应立刻更新真实的主阵容战力和历史峰值。 */
    private final HeroMainPowerService power;
    /** 属性变化随提交后的角色快照推送。 */
    private final AssetSyncService assets;

    /** 注入认证、原配置、战斗和同步入口，允许正常登录前加载配置。 */
    RainbowService(SessionService sessions, RoleRepository roles, RainbowRepository repository,
                   RainbowRules rules, RainbowCombat combat, ArenaSeasonService arena, GameClock clock,
                   MailService mail, HeroMainPowerService power, AssetSyncService assets) {
        this.sessions = sessions;
        this.roles = roles;
        this.repository = repository;
        this.rules = rules;
        this.combat = combat;
        this.arena = arena;
        this.clock = clock;
        this.mail = mail;
        this.power = power;
        this.assets = assets;
    }

    /** 刷新本服神位与本人排名，遇到过期占位时先结算，随后再下发新进度。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State state(String token) {
        var profile = authenticated(token);
        arena.prepare(profile.serverId());
        var now = clock.instant();
        lockOccupants(profile.serverId(), profile.id());
        ensureSession(token, profile.id());
        expireSeats(profile.serverId(), now);
        return snapshot(profile, now);
    }

    /** 在本区服串行完成挑战。重试原请求读取原战报，实际神位状态始终返回当前快照。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Challenge challenge(String token, String requestId, int seatId, int evolution, long lineupVersion) {
        var seat = requireSeat(seatId);
        if (!RewardReceiptPayloads.validId(requestId) || !rules.isValidEvolution(evolution) || lineupVersion < 0) {
            throw reject("RAINBOW_REQUEST_INVALID");
        }
        var profile = authenticated(token);
        String serverId = profile.serverId();
        arena.prepare(serverId);
        var now = clock.instant();
        lockOccupants(serverId, profile.id());
        ensureSession(token, profile.id());
        expireSeats(serverId, now);
        var previous = repository.attempt(profile.id(), requestId);
        if (previous != null) {
            if (previous.seatId() != seatId || previous.step() != evolution || previous.lineupVersion() != lineupVersion) {
                throw reject("RAINBOW_REQUEST_CONFLICT");
            }
            return settlement(profile, previous, now);
        }
        var role = roles.findById(profile.id()).orElseThrow();
        if (role.level() < rules.minimumChallengeLevel()) {
            throw reject("RAINBOW_LEVEL");
        }
        var occupied = repository.occupiedBy(role.id()).orElse(null);
        if (occupied != null && occupied.seatId() == seatId) {
            throw reject("RAINBOW_HOLDING");
        }
        if (repository.cooldown(role.id()) > now.toEpochMilli()) {
            throw reject("RAINBOW_COOLDOWN");
        }
        int rank = arena.rankForRole(serverId, role.id());
        if (rank == 0 || rank > seat.requiredArenaRank()) {
            throw reject("RAINBOW_RANK");
        }
        var formation = combat.formationForRole(role.id());
        if (formation.version() != lineupVersion) {
            throw reject("RAINBOW_FORMATION_CHANGED");
        }
        if (formation.slots().isEmpty()) {
            throw reject("RAINBOW_FORMATION_EMPTY");
        }
        var target = repository.seats(serverId).stream().filter(row -> row.seatId() == seatId).findFirst().orElse(null);
        int current = target == null ? 0 : target.evolution();
        var mission = rules.mission(seat.type(), current + evolution);
        var preview = combat.preview(role.id(), "rainbow:" + seat.type() + ":" + mission.evolution(), mission.enemies());
        boolean won = preview.battle().outcome() == HeroBattleRoundUtils.Outcome.ATTACKER_WIN;
        var replay = HeroBattleReplayProtocolUtils.encode(preview.battle()).toBuilder()
                .setAttackerName(role.nickname()).setDefenderName(seat.name() + mission.evolution()).build();
        var attempt = new Attempt(role.id(), requestId, serverId, seatId, evolution, lineupVersion,
                UUID.randomUUID().toString(), role.nickname(), preview.power(), won, now.toEpochMilli(), replay.toByteArray());
        if (won) {
            occupy(role, seat, mission.evolution(), occupied, target, now);
        } else {
            repository.setCooldown(role.id(), now.plusSeconds(rules.challengeCooldownSeconds()).toEpochMilli());
        }
        repository.save(attempt);
        return settlement(role, attempt, now);
    }

    /** 获取同服、同神位最近的胜场，开战后改名或换装不改历史。 */
    @Transactional(readOnly = true, isolation = Isolation.READ_COMMITTED)
    public History history(String token, int seatId) {
        requireSeat(seatId);
        var role = authenticated(token);
        return new History(seatId, repository.history(role.serverId(), seatId, rules.historyLimit()).stream()
                .map(RainbowService::historyEntry).toList());
    }

    /** 只有同服该神位仍列出的胜利记录可以作为公开回放读取。 */
    @Transactional(readOnly = true, isolation = Isolation.READ_COMMITTED)
    public BattleReplay replay(String token, int seatId, String battleId) {
        requireSeat(seatId);
        var role = authenticated(token);
        return repository.history(role.serverId(), seatId, rules.historyLimit()).stream()
                .filter(row -> row.battleId().equals(battleId)).findFirst()
                .map(RainbowService::parseReplay).orElseThrow(() -> reject("RAINBOW_REPLAY_MISSING"));
    }

    /** 定时维护离线玩家的到期神位，按区服顺序取得锁后再处理角色属性。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void releaseExpired(String serverId) {
        repository.lockServer(serverId);
        lockOccupants(serverId, null);
        expireSeats(serverId, clock.instant());
    }

    /** 同事务发送并消费持久通知，满邮箱时回滚留待下一轮。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deliverNotice(String id) {
        var notice = repository.lockNotice(id);
        if (notice != null) {
            var template = rules.mailNotice(requireSeat(notice.seatId()), notice.expired());
            mail.deliver(notice.roleId(), template.subject(), template.content(), List.of());
            repository.removeNotice(id);
        }
    }

    /** 当前会话必须属于已开放彩虹圣殿的角色。 */
    private RoleProfile authenticated(String token) {
        var role = roles.findById(sessions.requireRole(token)).orElseThrow();
        if (role.level() < rules.minimumLevel()) {
            throw reject("RAINBOW_LEVEL");
        }
        return role;
    }

    /** 取得区服锁后按相同排序锁定占位角色和挑战者，避免夺位双方交叉锁定。 */
    private void lockOccupants(String serverId, String actor) {
        var toLock = repository.seats(serverId).stream().map(Occupation::roleId).filter(Objects::nonNull)
                .collect(Collectors.toCollection(TreeSet::new));
        if (actor != null) {
            toLock.add(actor);
        }
        toLock.forEach(roles::lock);
    }

    /** 重新验证取得写锁后的当前会话。 */
    private void ensureSession(String token, String roleId) {
        if (!roleId.equals(sessions.requireRole(token))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID");
        }
    }

    /** 释放到期神位并记录到期邮件，进化等级仍保留给下一名玩家挑战。 */
    private void expireSeats(String serverId, Instant now) {
        for (var seat : repository.seats(serverId)) {
            if (seat.roleId() != null && !seat.expiresAt().isAfter(now)) {
                repository.clear(seat);
                repository.enqueueNotice(seat, true);
                refreshPower(seat.roleId());
            }
        }
    }

    /** 赢方先释放自己的旧位再占新位，被替换的玩家在同一事务失去加成。 */
    private void occupy(RoleProfile role, RainbowRules.Seat seat, int evolution,
                        Occupation previous, Occupation target, Instant now) {
        if (previous != null) {
            repository.clear(previous);
        }
        repository.occupy(role.serverId(), seat.id(), evolution, role.id(), now.toEpochMilli(),
                now.plusSeconds(seat.occupationSeconds()).toEpochMilli());
        refreshPower(role.id());
        if (target != null && target.roleId() != null) {
            repository.enqueueNotice(target, false);
            refreshPower(target.roleId());
        }
    }

    /** 把增减后的英雄真实面板投影到通用战力与资产推送。 */
    private void refreshPower(String roleId) {
        power.observe(roleId);
        assets.changed(roleId);
    }

    /** 以当前本服神位和竞技场榜构造在本个事务可验证的完整页面状态。 */
    private State snapshot(RoleProfile role, Instant now) {
        var stored = repository.seats(role.serverId()).stream()
                .collect(Collectors.toMap(Occupation::seatId, Function.identity()));
        var slots = rules.seats().stream().map(seat -> seatState(seat, stored.get(seat.id()))).toList();
        return new State(slots, arena.rankForRole(role.serverId(), role.id()), repository.cooldown(role.id()),
                combat.formationForRole(role.id()), now.toEpochMilli());
    }

    /** 所有座位都有原守军预览；无人占位时省略角色资料和截止时间。 */
    private Seat seatState(RainbowRules.Seat seat, Occupation row) {
        int evolution = row == null ? 0 : row.evolution();
        boolean occupied = row != null && row.roleId() != null;
        var mission = rules.mission(seat.type(), evolution);
        var guardian = mission.enemies().getFirst();
        return new Seat(seat.id(), seat.type(), evolution, seat.requiredArenaRank(),
                occupied ? owner(row.roleId()) : null, occupied ? row.expiresAt().toEpochMilli() : null,
                guardian.template(), guardian.star(), mission.activeSkills(), mission.passiveSkills(),
                seat.attributes().getOrDefault(ATTACK_RATE, 0L), seat.attributes().getOrDefault(HEALTH_RATE, 0L));
    }

    /** 公开占领者的昵称、角色等级和当前外观。 */
    private Owner owner(String roleId) {
        var role = roles.findById(roleId).orElseThrow();
        var basics = role.basics();
        return new Owner(role.id(), role.nickname(), role.level(), basics.headId(), basics.borderId(), basics.imageId());
    }

    /** 角色重连重复提交时，附带新状态和同次冻结战报。 */
    private Challenge settlement(RoleProfile role, Attempt attempt, Instant now) {
        return new Challenge(attempt.requestId(), snapshot(role, now), attempt.battleId(), parseReplay(attempt),
                attempt.won(), attempt.seatId(), attempt.step());
    }

    /** 由原战报提取攻方名单，历史详情仍保留独立回包。 */
    private static HistoryEntry historyEntry(Attempt attempt) {
        var heroes = parseReplay(attempt).getUnitsList().stream().filter(unit -> unit.getFaction() == 1)
                .map(unit -> new HistoryHero(unit.getTemplateId(), unit.getLevel(), unit.getStar(), unit.getPortraitIconId()))
                .toList();
        return new HistoryEntry(attempt.battleId(), attempt.name(), attempt.step(), attempt.foughtAt(), attempt.power(), heroes);
    }

    /** 持久战报损坏时拒绝恢复，不能再开一场替代原回执。 */
    private static BattleReplay parseReplay(Attempt attempt) {
        try {
            return BattleReplay.parseFrom(attempt.replay());
        } catch (InvalidProtocolBufferException invalid) {
            throw new IllegalStateException("彩虹圣殿战报损坏，battleId=" + attempt.battleId(), invalid);
        }
    }

    /** 数据库神位行可以尚未初始化，合法位置仍由静态规则决定。 */
    private RainbowRules.Seat requireSeat(int seatId) {
        var seat = rules.seat(seatId);
        if (seat == null) {
            throw reject("RAINBOW_SEAT");
        }
        return seat;
    }

    /** 将可预期的玩法拒绝转换为统一 WebSocket 业务错误。 */
    private static ResponseStatusException reject(String code) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
}
