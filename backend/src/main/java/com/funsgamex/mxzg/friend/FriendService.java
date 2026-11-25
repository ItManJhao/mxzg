/** 主城好友的权威关系和友情礼物服务，统一使用角色事务、可靠回执和通用发奖。 */
package com.funsgamex.mxzg.friend;

import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FriendService {
    /** 新版统一自然日时区。 */
    private static final ZoneId SHANGHAI = ZoneId.of("Asia/Shanghai");
    /** 搜索最多展示五十个同服角色，推荐的配置上限更小。 */
    private static final int SEARCH_LIMIT = 50;

    /** 好友、赠领与黑名单的已开放操作。 */
    public enum Action {
        APPLY, ACCEPT, REJECT, REMOVE, BLOCK, UNBLOCK, SEND, SEND_ALL, CLAIM, CLAIM_ALL;

        /** 一键操作由服务器从实际关系选择全部目标。 */
        private boolean batch() {
            return this == SEND_ALL || this == CLAIM_ALL;
        }

        /** 赠送和领取必须校验用户看到的上海自然日期次。 */
        private boolean requiresDay() {
            return this == SEND || this == SEND_ALL || this == CLAIM || this == CLAIM_ALL;
        }
    }

    /** 公开资料及仅对当前关系可读的标志。礼物状态 0 为无、1 为待领、2 为已领。 */
    public record Entry(String roleId, String serverId, String name, int level, int headId, int borderId, long power,
                        long lastLoginAt, int giftState, boolean sentToday, boolean requested) {}

    /** 四个页签的权威列表、容量及剩余赠送依据；礼物列表只包含待领条目。 */
    public record State(long resetAt, int friendLimit, int blockLimit, int sentToday, int sendLimit, long friendship,
                        List<Entry> friends, List<Entry> gifts, List<Entry> applications, List<Entry> blocked) {
        /** 冻结查询结果供客户端安全复用。 */
        public State {
            friends = List.copyOf(friends);
            gifts = List.copyOf(gifts);
            applications = List.copyOf(applications);
            blocked = List.copyOf(blocked);
        }
    }

    /** 当前关键词与真实本区角色列表，客户端用原关键词校验迟到回包。 */
    public record SearchResult(String query, List<Entry> entries) {
        /** 冻结搜索结果与旧请求关联。 */
        public SearchResult {
            entries = List.copyOf(entries);
        }
    }

    /** 发起者提供操作标识、原目标和展示期次；批量目标为空，永久操作期次为 0。 */
    public record Command(String requestId, Action action, String targetId, long resetAt) {}

    /** 原幂等编号与当前角色的更新状态，奖励为空时无发奖。 */
    public record ChangeResult(String requestId, State state, RewardFeedbackService.Notice notice) {}

    /** 角色权限、行锁、资产版本。 */
    private final RoleRepository roles;
    /** 同一数据源的好友、礼物和可靠回执持久化。 */
    private final FriendRepository repository;
    /** 统一游戏服务端时钟。 */
    private final GameClock clock;
    /** 已校验的容量及奖励策划数据。 */
    private final FriendRules rules;
    /** 发放真实资产，生成通用反馈并保存可靠回执。 */
    private final RewardGrantService grants;
    private final RewardFeedbackService feedback;
    private final RewardReceiptPayloads receipts;
    /** 事务内登记关系刷新和由真实业务达成的每日/成就信号。 */
    private final ApplicationEventPublisher events;

    /** 装配角色、关系、时间与通用发奖组件。 */
    FriendService(RoleRepository roles, FriendRepository repository, GameClock clock, FriendRules rules,
                  RewardGrantService grants, RewardFeedbackService feedback, RewardReceiptPayloads receipts,
                  ApplicationEventPublisher events) {
        this.roles = roles;
        this.repository = repository;
        this.clock = clock;
        this.rules = rules;
        this.grants = grants;
        this.feedback = feedback;
        this.receipts = receipts;
        this.events = events;
    }

    /** 在同一只读快照内读取四页真实关系。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public State state(String roleId) {
        requireRole(roleId);
        return snapshot(roleId, resetAt(clock.epochSeconds()));
    }

    /** 不具备同服在线清单时仍支持非空名称模糊查找。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public SearchResult search(String roleId, String query) {
        return search(roleId, query, Set.of());
    }

    /** 空关键词推荐可信在线快照中的同服候选，非空查询只匹配本服名称。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public SearchResult search(String roleId, String query, Set<String> onlineRoleIds) {
        String canonical = query == null ? "" : query.strip();
        if (canonical.length() > 64 || canonical.codePoints().anyMatch(Character::isISOControl)) {
            throw rejected("FRIEND_INVALID");
        }
        var role = requireRole(roleId);
        int limit = canonical.isEmpty() ? rules.recommendationLimit : SEARCH_LIMIT;
        return new SearchResult(canonical, repository.search(roleId, role.serverId(), canonical, onlineRoleIds, limit));
    }

    /** 按同一锁顺序执行变更，事务成功返回更新快照；重试仅复用原回执。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ChangeResult change(String roleId, Command command) {
        validate(roleId, command);
        var roleBeforeLock = requireRole(roleId);
        if (command.targetId() != null) {
            requireTarget(roleBeforeLock, command);
        }
        long now = clock.epochSeconds();
        long resetAt = resetAt(now);
        Set<String> locked = lockActors(roleId, command, resetAt);
        var saved = repository.receipt(roleId, command.requestId());
        if (saved != null) {
            return restore(roleId, command, resetAt, saved);
        }
        if (command.action().requiresDay() && command.resetAt() != resetAt) {
            throw rejected("FRIEND_DAY_CHANGED");
        }
        var affected = new LinkedHashSet<String>();
        affected.add(roleId);
        List<Reward> rewards = switch (command.action()) {
            case SEND, SEND_ALL -> send(roleId, command.targetId(), resetAt, now, locked, affected);
            case CLAIM, CLAIM_ALL -> claim(roleId, command.targetId(), resetAt);
            default -> {
                changeRelation(roleId, command, resetAt, now, affected);
                yield List.of();
            }
        };
        var notice = grant(roleId, command.requestId(), rewards, now);
        repository.saveReceipt(roleId, command, notice == null ? null : receipts.freeze(notice));
        events.publishEvent(new FriendChanged(List.copyOf(affected)));
        return new ChangeResult(command.requestId(), snapshot(roleId, resetAt), notice);
    }

    /** 锁住操作实际会改动的角色；批量送礼按同一全局顺序，避免与移除或一键领取死锁。 */
    private Set<String> lockActors(String roleId, Command command, long resetAt) {
        Set<String> locked = new TreeSet<>();
        locked.add(roleId);
        if (command.targetId() != null) {
            locked.add(command.targetId());
        } else if (command.action() == Action.SEND_ALL) {
            repository.unsent(roleId, resetAt).forEach(target -> locked.add(target.id()));
        }
        locked.forEach(roles::lock);
        return locked;
    }

    /** 校验永久关系指令并对当前两个角色执行变更。 */
    private void changeRelation(String roleId, Command command, long resetAt, long now, Set<String> affected) {
        String targetId = command.targetId();
        switch (command.action()) {
            case APPLY -> {
                requireCanConnect(roleId, targetId);
                if (!repository.application(roleId, targetId)) {
                    repository.addApplication(roleId, targetId, now);
                    affected.add(targetId);
                }
            }
            case ACCEPT -> {
                requireCanConnect(roleId, targetId);
                if (!repository.removeApplication(targetId, roleId)) {
                    throw rejected("FRIEND_APPLICATION_MISSING");
                }
                repository.removeApplication(roleId, targetId);
                repository.addFriends(roleId, targetId);
                affected.add(targetId);
                // 原 FriendAddEvent 对双方各增加一次历史成就进度，不按实时人数倒减。
                events.publishEvent(new QuestProgressEvent(roleId, QuestMetric.FRIEND_NUM, 0, 1));
                events.publishEvent(new QuestProgressEvent(targetId, QuestMetric.FRIEND_NUM, 0, 1));
            }
            case REJECT -> {
                if (!repository.removeApplication(targetId, roleId)) {
                    throw rejected("FRIEND_APPLICATION_MISSING");
                }
                affected.add(targetId);
            }
            case REMOVE -> {
                if (!repository.friends(roleId, targetId)) {
                    throw rejected("FRIEND_RELATION_MISSING");
                }
                repository.removeFriends(roleId, targetId, resetAt);
                affected.add(targetId);
            }
            case BLOCK -> {
                if (repository.blocked(roleId, targetId)) {
                    throw rejected("FRIEND_ALREADY_BLOCKED");
                }
                if (repository.blockCount(roleId) >= rules.blockLimit) {
                    throw rejected("FRIEND_BLOCK_LIMIT");
                }
                repository.addBlock(roleId, targetId, now);
                repository.removeFriends(roleId, targetId, resetAt);
                repository.removeApplication(roleId, targetId);
                repository.removeApplication(targetId, roleId);
                affected.add(targetId);
            }
            case UNBLOCK -> {
                if (!repository.removeBlock(roleId, targetId)) {
                    throw rejected("FRIEND_NOT_BLOCKED");
                }
            }
            default -> throw new IllegalStateException("好友关系操作类型错误");
        }
    }

    /** 双方拉黑、已是好友及达到容量时不能创建或接受好友关系。 */
    private void requireCanConnect(String roleId, String targetId) {
        if (repository.blocked(roleId, targetId) || repository.blocked(targetId, roleId)) {
            throw rejected("FRIEND_BLOCKED");
        }
        if (repository.friends(roleId, targetId)) {
            throw rejected("FRIEND_ALREADY");
        }
        if (repository.friendCount(roleId) >= rules.friendLimit) {
            throw rejected("FRIEND_LIMIT");
        }
        if (repository.friendCount(targetId) >= rules.friendLimit) {
            throw rejected("FRIEND_TARGET_LIMIT");
        }
    }

    /** 赠送按实际送达计奖励及任务，仍保留原批量赠送对长时间离线好友的配额行为。 */
    private List<Reward> send(String roleId, String targetId, long resetAt, long now, Set<String> locked, Set<String> affected) {
        int remaining = rules.sendLimit - repository.sentToday(roleId, resetAt);
        if (remaining <= 0) {
            throw rejected("FRIEND_SEND_LIMIT");
        }
        int delivered = 0;
        if (targetId != null) {
            if (!repository.friends(roleId, targetId)) {
                throw rejected("FRIEND_RELATION_MISSING");
            }
            if (repository.sentTo(roleId, targetId, resetAt)) {
                throw rejected("FRIEND_ALREADY_SENT");
            }
            repository.addGift(roleId, targetId, resetAt, true);
            affected.add(targetId);
            delivered = 1;
        } else {
            for (var target : repository.unsent(roleId, resetAt).stream().filter(row -> locked.contains(row.id())).limit(remaining).toList()) {
                boolean active = target.lastLoginAt() > now - FriendRules.INACTIVE_SECONDS;
                repository.addGift(roleId, target.id(), resetAt, active);
                if (active) {
                    affected.add(target.id());
                    delivered++;
                }
            }
        }
        if (delivered == 0) {
            throw rejected("FRIEND_NO_GIFTS");
        }
        events.publishEvent(new QuestProgressEvent(roleId, QuestMetric.FRIEND_GIFT, 0, delivered));
        return multiplied(rules.sendRewards, delivered);
    }

    /** 领取先核对今日已领次数，按原阈值分配完整礼包和超额礼包。 */
    private List<Reward> claim(String roleId, String senderId, long resetAt) {
        int fullRemaining = Math.max(0, rules.receiveLimit - repository.claimedToday(roleId, resetAt));
        int received = repository.claim(roleId, senderId, resetAt);
        if (received == 0) {
            throw rejected("FRIEND_NO_GIFTS");
        }
        int full = Math.min(received, fullRemaining);
        var rewards = new ArrayList<>(multiplied(rules.receiveRewards, full));
        rewards.addAll(multiplied(rules.excessRewards, received - full));
        return rewards;
    }

    /** 当前事务的赠送或领取奖励复用通用背包入账和飘字。 */
    private RewardFeedbackService.Notice grant(String roleId, String requestId, List<Reward> rewards, long now) {
        if (rewards.isEmpty()) {
            return null;
        }
        var actual = grants.grant(roleId, rewards, new RewardGrantService.Context(now, 0), ThreadLocalRandom.current());
        return feedback.publish(UUID.randomUUID().toString(), roleId, roles.revision(roleId), RewardFeedbackService.Mode.TIPS,
                actual, requestId);
    }

    /** 复读完全相同请求的付款回执；当前快照永远按真实今日状态生成。 */
    private ChangeResult restore(String roleId, Command command, long resetAt, FriendRepository.Receipt saved) {
        if (!command.equals(saved.command())) {
            throw rejected("FRIEND_REQUEST_CONFLICT");
        }
        var notice = saved.noticeJson() == null ? null : receipts.read(saved.noticeJson(), saved.noticeHash(), RewardFeedbackService.Notice.class);
        if (notice != null && (!roleId.equals(notice.roleId()) || !command.requestId().equals(notice.requestId())
                || notice.mode() != RewardFeedbackService.Mode.TIPS || !RewardReceiptPayloads.validId(notice.receiptId()))) {
            throw new IllegalStateException("好友历史回执归属不符");
        }
        return new ChangeResult(command.requestId(), snapshot(roleId, resetAt), notice);
    }

    /** 从当前已提交的关系和真实库存搭出客户端四页快照。 */
    private State snapshot(String roleId, long resetAt) {
        var friends = repository.friends(roleId, resetAt);
        return new State(resetAt, rules.friendLimit, rules.blockLimit, repository.sentToday(roleId, resetAt), rules.sendLimit,
                repository.friendship(roleId), friends, friends.stream().filter(row -> row.giftState() == 1).toList(),
                repository.applications(roleId), repository.blocked(roleId));
    }

    /** 拒绝非法编号、自身操作以及带伪造目标或期次的批量/永久操作。 */
    private static void validate(String roleId, Command command) {
        if (command == null || command.action() == null || !RewardReceiptPayloads.validId(command.requestId())
                || (command.action().batch() ? command.targetId() != null : !RewardReceiptPayloads.validId(command.targetId()))
                || roleId.equals(command.targetId()) || (command.action().requiresDay() ? command.resetAt() <= 0 : command.resetAt() != 0)) {
            throw rejected("FRIEND_INVALID");
        }
    }

    /** 当前身份来自连接，缺失时按未登录处理。 */
    private RoleProfile requireRole(String roleId) {
        return roles.findById(roleId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION"));
    }

    /** 好友关系只在同服建立；黑名单可屏蔽本部署内的有效跨服角色。 */
    private void requireTarget(RoleProfile role, Command command) {
        var target = roles.findById(command.targetId()).orElseThrow(() -> rejected("FRIEND_NOT_FOUND"));
        if (command.action() != Action.BLOCK && command.action() != Action.UNBLOCK && !role.serverId().equals(target.serverId())) {
            throw rejected("FRIEND_NOT_FOUND");
        }
    }

    /** 计算原礼包乘以实际份数，数量为零时不发放。 */
    private static List<Reward> multiplied(List<Reward> items, int amount) {
        return amount == 0 ? List.of() : items.stream().map(item -> new Reward(item.itemId(), Math.multiplyExact(item.quantity(), amount))).toList();
    }

    /** 返回当前上海自然日的次日零点 Unix 秒。 */
    private static long resetAt(long now) {
        return Instant.ofEpochSecond(now).atZone(SHANGHAI).toLocalDate().plusDays(1).atStartOfDay(SHANGHAI).toEpochSecond();
    }

    /** 通过通信层交付可识别的业务拒绝码。 */
    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
