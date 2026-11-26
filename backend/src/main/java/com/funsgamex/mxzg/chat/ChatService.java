/**
 * 认证角色的聊天应用服务。根据区服、公会身份和好友关系解析当前可见范围，
 * 将记录、幂等回执和阅读位置写入同一事务，提交后再通知客户端刷新。
 */
package com.funsgamex.mxzg.chat;

import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChatService {
    /** 单次历史回包的最大消息数。 */
    private static final int PAGE_SIZE = 30;
    /** 旧私聊和系统消息允许保存七个自然日，按游戏服固定时区计算。 */
    private static final ZoneId CHAT_ZONE = ZoneId.of("Asia/Shanghai");

    /** 可信角色资料用于频道鉴权；角色行锁串行化个人发送、已读和关系变更。 */
    private final RoleRepository roles;
    /** 当前范围内的历史、回执和已读位置持久仓储。 */
    private final ChatRepository chat;
    /** 提供原策划发言条件和运营配置的房间分组。 */
    private final ChatRules rules;
    /** 服务端游戏时钟用于消息日期和发言间隔。 */
    private final GameClock clock;
    /** 发布事务完成后的空载荷刷新信号。 */
    private final ApplicationEventPublisher events;

    /** 冻结展示资料。系统消息无角色发送者，应用层交付空角色编号。 */
    public record Message(long id, String roleId, String name, int avatarId, int borderId, int level,
                          String text, long sentAtSeconds, ChatChannel channel, String serverId, int noticeId) {
        /** 在插入后填写数据库分配的消息编号，发送资料与正文保持原样。 */
        Message identified(long number) {
            return new Message(number, roleId, name, avatarId, borderId, level, text, sentAtSeconds, channel, serverId,
                    noticeId);
        }
    }

    /**
     * @param messages 当前可见的本页记录，按编号升序
     * @param latestId 可见窗口最大编号，空时为 0
     * @param readThroughId 持久已读，未确认过时为 0
     * @param unreadCount 留存窗口内他人高于已读水位的可见消息数
     * @param hasMore 是否仍有较早的可见历史
     * @param hasNewer 是否仍有较新的可见历史
     * @param canSend 具备条件可发言，具体限频在发送时再次校验
     * @param channel 当前页的实际频道
     * @param peerRoleId 有选择对象的私聊页携带该对象编号
     * @param scopeId 当前授权范围标识，用于客户端清除已离开的公会或会话缓存
     */
    public record History(List<Message> messages, long latestId, long readThroughId, int unreadCount,
                          boolean hasMore, boolean hasNewer, boolean canSend, ChatChannel channel,
                          String peerRoleId, String scopeId) {
        /** 冻结历史内容，查询结果交给通信层只读投影。 */
        public History {
            messages = List.copyOf(messages);
        }
    }

    /** 最近私聊对端角色的公开资料及该会话的未读和末条编号。 */
    public record Conversation(String roleId, String name, int avatarId, int borderId,
                               int level, int unreadCount, long latestMessageId) {}

    /** 当前角色的频道准入和聚合未读。 */
    public record ChannelSummary(ChatChannel channel, boolean available, int unreadCount) {}

    /** 角色当前能进入的频道及有留存记录的好友会话。 */
    public record Overview(List<ChannelSummary> channels, List<Conversation> conversations) {}

    /** 装配消息仓储、权威角色资料、时间和事务完成通知。 */
    ChatService(RoleRepository roles, ChatRepository chat, ChatRules rules, GameClock clock,
                ApplicationEventPublisher events) {
        this.roles = roles;
        this.chat = chat;
        this.rules = rules;
        this.clock = clock;
        this.events = events;
    }

    /** 旧本服世界调用入口以默认频道查同一个历史，不维护第二套实现。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public History history(String roleId, long afterId, long beforeId) {
        return history(roleId, ChatChannel.WORLD, null, afterId, beforeId);
    }

    /** 服务器授权当前房间后在同一读快照中查询历史及独立未读。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public History history(String roleId, ChatChannel channel, String peerRoleId, long afterId, long beforeId) {
        requireScopeInput(roleId, channel, peerRoleId);
        if (afterId < 0 || beforeId < 0 || (afterId > 0 && beforeId > 0)) {
            throw rejected("CHAT_INVALID");
        }
        RoleProfile role = role(roleId);
        ChatRoom room = room(role, channel, peerRoleId);
        if (room == null) {
            return new History(List.of(), 0, 0, 0, false, false, false, channel, peerRoleId, null);
        }
        long since = cutoff(channel);
        List<Message> page = chat.page(room, roleId, since, afterId, beforeId, PAGE_SIZE);
        long current = chat.readThroughId(room, roleId);
        var counters = chat.counters(room, roleId, since, current);
        boolean hasMore = page.isEmpty() ? afterId > 0 && counters.oldestId() > 0
                : counters.oldestId() < page.getFirst().id();
        boolean hasNewer = page.isEmpty() ? beforeId > 0 && counters.latestId() > 0
                : counters.latestId() > page.getLast().id();
        return new History(page, counters.latestId(), current, counters.unreadCount(),
                hasMore, hasNewer, canSend(role, channel), channel, peerRoleId, room.key());
    }

    /** 按持久权限计算六个页签与当前仍有效的近期会话。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Overview overview(String roleId) {
        var role = role(roleId);
        var conversations = List.copyOf(chat.conversations(role.serverId(), roleId, cutoff(ChatChannel.PRIVATE)));
        int privateUnread = conversations.stream().mapToInt(Conversation::unreadCount).sum();
        List<ChannelSummary> channels = new ArrayList<>();
        for (ChatChannel channel : ChatChannel.values()) {
            if (channel == ChatChannel.PRIVATE) {
                channels.add(new ChannelSummary(channel, true, privateUnread));
                continue;
            }
            var room = room(role, channel, null);
            int unread = room == null ? 0 : chat.counters(room, roleId, cutoff(channel),
                    chat.readThroughId(room, roleId)).unreadCount();
            channels.add(new ChannelSummary(channel, room != null, unread));
        }
        return new Overview(List.copyOf(channels), conversations);
    }

    /** 旧调用按世界频道发布，继续使用 V71 原请求回执。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Message send(String roleId, String requestId, String text) {
        return send(roleId, ChatChannel.WORLD, null, requestId, text);
    }

    /** 当前鉴权角色发布发言。原请求编号绑定同角色、同房间和规范化文本。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Message send(String roleId, ChatChannel channel, String peerRoleId, String requestId, String text) {
        requireScopeInput(roleId, channel, peerRoleId);
        if (channel == ChatChannel.SYSTEM) {
            throw rejected("CHAT_READ_ONLY");
        }
        requireRequestId(requestId);
        String normalized = rules.normalize(text);
        String fingerprint = fingerprint(normalized);
        roles.lock(roleId);
        var role = role(roleId);
        if (!rules.canEnter(channel, role.level())) {
            throw rejected("CHAT_LEVEL_REQUIRED");
        }
        ChatRoom room = requireRoom(role, channel, peerRoleId);
        var previous = chat.receipt(roleId, requestId);
        long since = cutoff(channel);
        if (previous != null) {
            return replay(room, previous, fingerprint, since);
        }
        if (!canSend(role, channel)) {
            throw rejected("CHAT_LEVEL_REQUIRED");
        }
        String publicText = rules.filterForPublic(normalized);
        chat.lockChannel(room);
        long now = clock.epochSeconds();
        if (channel != ChatChannel.PRIVATE) {
            Long lastSentAt = chat.lastPublicSentAt(roleId);
            if (lastSentAt != null && now - lastSentAt < rules.sendIntervalSeconds()) {
                throw rejected("CHAT_RATE_LIMIT");
            }
        }

        var basics = role.basics();
        var draft = new Message(0, roleId, role.nickname(), basics.headId(), basics.borderId(), role.level(),
                publicText, now, channel, role.serverId(), 0);
        var sent = draft.identified(chat.insertMessage(room, draft));
        chat.saveReceipt(room, requestId, fingerprint, sent);
        chat.trim(room, since);
        events.publishEvent(audience(room, role, peerRoleId));
        return sent;
    }

    /** 旧调用按世界频道确认，只推进本服的持久水位。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public History read(String roleId, long throughId) {
        return read(roleId, ChatChannel.WORLD, null, throughId);
    }

    /** 确认可见消息。不同房间或另一名好友的编号均不能推进本房间水位。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public History read(String roleId, ChatChannel channel, String peerRoleId, long throughId) {
        requireScopeInput(roleId, channel, peerRoleId);
        if (throughId <= 0) {
            throw rejected("CHAT_INVALID");
        }
        roles.lock(roleId);
        RoleProfile role = role(roleId);
        ChatRoom room = requireRoom(role, channel, peerRoleId);
        long since = cutoff(channel);
        long current = chat.readThroughId(room, roleId);
        if (throughId > current) {
            if (chat.visible(room, roleId, since, throughId)) {
                chat.advanceRead(room, roleId, current, throughId);
                current = throughId;
                events.publishEvent(new ChatChanged(Set.of(), Set.of(roleId)));
            } else if (!chat.expired(room, since, throughId)) {
                throw rejected("CHAT_INVALID");
            }
        }
        var counters = chat.counters(room, roleId, since, current);
        return new History(List.of(), counters.latestId(), current, counters.unreadCount(),
                false, false, canSend(role, channel), channel, peerRoleId, room.key());
    }

    /** 在触发条件满足的业务事务内写入该服的系统频道，回滚时一起撤销。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public Message publishSystem(String serverId, String text, int noticeId) {
        return publishNotice(serverId, ChatChannel.SYSTEM, null, text, noticeId);
    }

    /** 按原公告配置写入系统、世界或指定公会，当前业务与公告提交保持原子性。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public Message publishNotice(String serverId, ChatChannel channel, String guildId, String text, int noticeId) {
        if (text == null || text.isBlank() || text.length() > 384 || noticeId <= 0
                || text.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("系统聊天公告编号或单行文本无效");
        }
        String key = switch (channel) {
            case SYSTEM, WORLD -> serverId;
            case GUILD -> guildId;
            default -> throw new IllegalArgumentException("该聊天频道不支持服务端公告");
        };
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("系统聊天公告缺少授权范围");
        }
        var room = new ChatRoom(channel, key);
        chat.lockChannel(room);
        var draft = new Message(0, "", "系统", 0, 0, 0, text.strip(), clock.epochSeconds(), channel, serverId, noticeId);
        var sent = draft.identified(chat.insertMessage(room, draft));
        chat.trim(room, cutoff(channel));
        events.publishEvent(channel == ChatChannel.GUILD
                ? new ChatChanged(Set.of(), chat.guildAudience(guildId, ""))
                : new ChatChanged(Set.of(serverId), Set.of()));
        return sent;
    }

    /** 每次请求从真实关系查房间，调用者不能自行传公会或跨服分组。 */
    private ChatRoom room(RoleProfile role, ChatChannel channel, String peerRoleId) {
        if (!rules.canEnter(channel, role.level())) {
            return null;
        }
        String key = switch (channel) {
            case SYSTEM, WORLD -> role.serverId();
            case GUILD -> chat.guild(role.serverId(), role.id());
            case PRIVATE -> peerRoleId != null && chat.friends(role.serverId(), role.id(), peerRoleId)
                    ? privateRoom(role.id(), peerRoleId) : null;
            case CROSS, GLOBAL -> rules.groupRoom(channel, role.serverId());
        };
        return key == null ? null : new ChatRoom(channel, key);
    }

    /** 写操作需要实际授权房间；历史接口使用空页显示执行业务状态。 */
    private ChatRoom requireRoom(RoleProfile role, ChatChannel channel, String peerRoleId) {
        ChatRoom room = room(role, channel, peerRoleId);
        if (room == null) {
            throw rejected("CHAT_CHANNEL_UNAVAILABLE");
        }
        return room;
    }

    /** 非系统频道还需要达到原版基础发言等级。 */
    private boolean canSend(RoleProfile role, ChatChannel channel) {
        return channel != ChatChannel.SYSTEM && rules.canSend(role.level());
    }

    /** 同一好友会话双向共用房间，两方已读独立。 */
    private static String privateRoom(String actor, String peer) {
        return actor.compareTo(peer) < 0 ? actor + ":" + peer : peer + ":" + actor;
    }

    /** 接收范围只由授权房间决定，私聊正文和刷新信号均局限于对应双方。 */
    private ChatChanged audience(ChatRoom room, RoleProfile role, String peerRoleId) {
        return switch (room.channel()) {
            case CROSS, GLOBAL -> new ChatChanged(rules.roomServers(room), Set.of());
            case WORLD, SYSTEM -> new ChatChanged(Set.of(role.serverId()), Set.of());
            case GUILD -> new ChatChanged(Set.of(), chat.guildAudience(room.key(), role.id()));
            case PRIVATE -> new ChatChanged(Set.of(), Set.of(role.id(), peerRoleId));
        };
    }

    /** 消息可见自然日的最早 Unix 秒；固定条数频道不施加日期限制。 */
    private long cutoff(ChatChannel channel) {
        if (!channel.dated()) {
            return 0;
        }
        return clock.instant().atZone(CHAT_ZONE).toLocalDate().minusDays(7)
                .atStartOfDay(CHAT_ZONE).toEpochSecond();
    }

    /** 验证重试绑定同房间和文本，超出留存窗口的原回执不重新发布。 */
    private Message replay(ChatRoom room, ChatRepository.Receipt receipt, String fingerprint, long since) {
        if (!receipt.room().equals(room) || !receipt.contentHash().equals(fingerprint)) {
            throw rejected("CHAT_REQUEST_CONFLICT");
        }
        Message prior = chat.message(room, receipt.messageId(), since);
        if (prior == null) {
            throw rejected("CHAT_REQUEST_EXPIRED");
        }
        return prior;
    }

    /** 仅私聊可指定角色，不能为自己创建私聊或提交无效对象编号。 */
    private static void requireScopeInput(String roleId, ChatChannel channel, String peerRoleId) {
        if (channel == null || (peerRoleId != null && (channel != ChatChannel.PRIVATE || roleId.equals(peerRoleId)))) {
            throw rejected("CHAT_INVALID");
        }
        if (peerRoleId != null) {
            requireRequestId(peerRoleId);
        }
    }

    /** 从角色仓储读取当前登录者，身份缺失时按会话失败处理。 */
    private RoleProfile role(String roleId) {
        return roles.findById(roleId).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION"));
    }

    /** 验证标准小写 UUID。 */
    private static void requireRequestId(String requestId) {
        try {
            if (requestId == null || !UUID.fromString(requestId).toString().equals(requestId)) {
                throw rejected("CHAT_INVALID");
            }
        } catch (IllegalArgumentException invalid) {
            throw rejected("CHAT_INVALID");
        }
    }

    /** 只保存验证重试所需的摘要，原正文随频道留存窗口清理。 */
    private static String fingerprint(String text) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("聊天回执摘要不可用", error);
        }
    }

    /** 返回通信层使用的稳定业务拒绝码。 */
    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
