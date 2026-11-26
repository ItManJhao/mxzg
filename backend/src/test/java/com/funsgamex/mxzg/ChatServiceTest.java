/** 独立 H2 验证聊天的频道隔离、历史、持久游标、发送边界和事务后通知。 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.chat.ChatChanged;
import com.funsgamex.mxzg.chat.ChatChannel;
import com.funsgamex.mxzg.chat.ChatService;
import com.funsgamex.mxzg.chat.ChatService.Message;
import com.funsgamex.mxzg.time.GameClock;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:chat_service;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class ChatServiceTest {
    /** 创建独立服的认证角色。 */
    @Autowired private DevelopmentLoginService login;
    /** 测试玩家能调用的持久聊天操作。 */
    @Autowired private ChatService chat;
    /** 准备每例专属的区服、角色和拉黑关系。 */
    @Autowired private JdbcTemplate jdbc;
    /** 推进限频窗口，并在每例操作结束后恢复。 */
    @Autowired private GameClock clock;
    /** 制造明确回滚，验证消息和游标一起服从事务。 */
    @Autowired private PlatformTransactionManager transactions;
    /** 监听原事务完成后发出的定向和频道事件。 */
    @Autowired private EventProbe events;

    /** 正文只发本服，自己的发言不点亮，已读保持单调并遵守接收方黑名单。 */
    @Test
    void sameServerVisibilityUnreadAndBlock() {
        String serverId = createServer();
        String actor = player(serverId, "玲珑", 18);
        String target = player(serverId, "海月", 17);
        String outsider = player(createServer(), "外区角色", 18);
        assertFalse(chat.history(target, 0, 0).canSend());
        rejects("CHAT_LEVEL_REQUIRED", () -> chat.send(target, requestId(), "hello"));

        Message sent = chat.send(actor, requestId(), " 安好\n旅者 & 伙伴 ");
        assertEquals("安好 旅者 * 伙伴", sent.text());
        assertEquals("玲珑", sent.name());
        assertEquals(18, sent.level());
        assertEquals(0, chat.history(actor, 0, 0).unreadCount());
        assertTrue(chat.history(outsider, 0, 0).messages().isEmpty());
        rejects("CHAT_INVALID", () -> chat.read(outsider, sent.id()));
        rejects("CHAT_INVALID", () -> chat.read(target, sent.id() + 1));
        var prior = chat.history(target, 0, 0);
        assertEquals(List.of(sent), prior.messages());
        assertEquals(1, prior.unreadCount());
        assertEquals(0, prior.readThroughId());
        var confirmed = chat.read(target, sent.id());
        assertTrue(confirmed.messages().isEmpty());
        assertEquals(0, confirmed.unreadCount());
        assertEquals(sent.id(), chat.read(target, sent.id()).readThroughId());
        assertEquals(sent.id(), chat.history(target, sent.id(), 0).readThroughId());
        assertEquals(List.of(new ChatChanged(Set.of(serverId), Set.of())), events.forServer(serverId));
        assertEquals(List.of(new ChatChanged(Set.of(), Set.of(target))), events.forRole(target));

        jdbc.update("INSERT INTO game_friend_block (role_id,target_id,created_at_seconds) VALUES (?,?,?)",
                target, actor, clock.epochSeconds());
        var hidden = chat.history(target, 0, 0);
        assertTrue(hidden.messages().isEmpty());
        assertEquals(0, hidden.latestId());
        assertEquals(sent.id(), hidden.readThroughId());
    }

    /** 发送确认先核原请求，限频和文本边界不会被重试或断开绕过。 */
    @Test
    void validatesTextRateAndIdempotency() {
        String serverId = createServer();
        String actor = player(serverId, "清风", 18);
        rejects("CHAT_INVALID", () -> chat.send(actor, "x", "hello"));
        rejects("CHAT_INVALID", () -> chat.send(actor, requestId(), "   "));
        rejects("CHAT_CONTENT_TOO_LONG", () -> chat.send(actor, requestId(), "晚".repeat(52)));
        rejects("CHAT_CONTENT_RESTRICTED", () -> chat.send(actor, requestId(), "1 2 3 4 5 6"));

        long now = clock.epochSeconds();
        try {
            String request = requestId();
            Message first = chat.send(actor, request, "x".repeat(102));
            assertEquals(first, chat.send(actor, request, first.text()));
            rejects("CHAT_REQUEST_CONFLICT", () -> chat.send(actor, request, "different"));
            rejects("CHAT_RATE_LIMIT", () -> chat.send(actor, requestId(), "new message"));
            clock.setEpochSeconds(now + 6);
            Message second = chat.send(actor, requestId(), "晚".repeat(51));
            assertTrue(second.id() > first.id());
            clock.setEpochSeconds(now + 12);
            String filteredRequest = requestId();
            Message third = chat.send(actor, filteredRequest, "hello q");
            assertEquals("hello *", third.text());
            assertEquals(third, chat.send(actor, filteredRequest, "hello q"));
            rejects("CHAT_REQUEST_CONFLICT", () -> chat.send(actor, filteredRequest, "hello *"));
            assertEquals(List.of(first, second, third), chat.history(actor, 0, 0).messages());
            assertEquals(3, events.forServer(serverId).size());
        } finally {
            clock.reset();
        }
    }

    /** 已经淘汰的游标仍可接续现在的 100 条，重复旧发言不会重新上屏。 */
    @Test
    void paginatesAfterReconnectAndRetainsNewestHundred() {
        String serverId = createServer();
        String actor = player(serverId, "白云", 18);
        String target = player(serverId, "青山", 18);
        long now = clock.epochSeconds();
        List<Message> sent = new ArrayList<>();
        String firstRequest = requestId();
        try {
            for (int index = 0; index < 105; index++) {
                clock.setEpochSeconds(now + index * 6);
                sent.add(chat.send(actor, index == 0 ? firstRequest : requestId(),
                        "hello " + (char) ('a' + index % 26)));
            }
        } finally {
            clock.reset();
        }
        var latest = chat.history(target, 0, 0);
        assertEquals(sent.subList(75, 105), latest.messages());
        assertEquals(100, latest.unreadCount());
        assertTrue(latest.hasMore());
        assertFalse(latest.hasNewer());
        var older = chat.history(target, 0, latest.messages().getFirst().id());
        assertEquals(sent.subList(45, 75), older.messages());
        assertTrue(older.hasNewer());
        var newer = chat.history(target, sent.getFirst().id(), 0);
        assertEquals(sent.subList(5, 35), newer.messages());
        assertTrue(newer.hasNewer());
        assertFalse(newer.hasMore());
        assertEquals(100, chat.read(target, sent.getFirst().id()).unreadCount());
        assertEquals(0, chat.read(target, sent.getLast().id()).unreadCount());
        rejects("CHAT_REQUEST_EXPIRED", () -> chat.send(actor, firstRequest, sent.getFirst().text()));
    }

    /** 原事务回滚时不会留下正文、限频回执或在线通知。 */
    @Test
    void rollbackLeavesNoHistoryOrNotification() {
        String serverId = createServer();
        String actor = player(serverId, "湖光", 18);
        String request = requestId();
        var tx = new TransactionTemplate(transactions);
        tx.executeWithoutResult(status -> {
            chat.send(actor, request, "hello");
            assertTrue(events.forServer(serverId).isEmpty());
            status.setRollbackOnly();
        });
        assertTrue(chat.history(actor, 0, 0).messages().isEmpty());
        assertTrue(events.forServer(serverId).isEmpty());
        Message committed = chat.send(actor, request, "hello");
        assertEquals(List.of(committed), chat.history(actor, 0, 0).messages());
        assertEquals(List.of(new ChatChanged(Set.of(serverId), Set.of())), events.forServer(serverId));
    }

    /** 同服并发写入后只接受一次相同业务请求，另一角色正常使用同一序列。 */
    @Test
    void serializesSameOperationAndSameChannel() throws Exception {
        String serverId = createServer();
        String first = player(serverId, "晨露", 18);
        String other = player(serverId, "微雨", 18);
        String request = requestId();
        var start = new CountDownLatch(1);
        Callable<Message> repeated = () -> {
            start.await();
            return chat.send(first, request, "hello");
        };
        try (var pool = Executors.newFixedThreadPool(3)) {
            var initial = pool.submit(repeated);
            var retry = pool.submit(repeated);
            var second = pool.submit(() -> {
                start.await();
                return chat.send(other, requestId(), "welcome");
            });
            start.countDown();
            var firstResult = initial.get(10, TimeUnit.SECONDS);
            assertEquals(firstResult, retry.get(10, TimeUnit.SECONDS));
            var secondResult = second.get(10, TimeUnit.SECONDS);
            var ids = List.of(firstResult.id(), secondResult.id()).stream().sorted().toList();
            assertEquals(ids, chat.history(first, 0, 0).messages().stream().map(Message::id).toList());
            assertEquals(2, events.forServer(serverId).size());
        }
    }

    /** 私聊只在双向好友参加者间可读，撤销任一方向关系立即隐藏历史和聚合会话。 */
    @Test
    void privateConversationIsPairScopedAndRequiresCurrentFriendship() {
        String server = createServer();
        String first = player(server, "星愿", 18);
        String second = player(server, "青羽", 18);
        String third = player(server, "沙洲", 18);
        friendship(first, second);
        friendship(second, third);
        String request = requestId();
        var sent = chat.send(first, ChatChannel.PRIVATE, second, request, "问候好友");
        var another = chat.send(first, ChatChannel.PRIVATE, second, requestId(), "祝玩得开心");
        assertEquals(sent, chat.send(first, ChatChannel.PRIVATE, second, request, "问候好友"));
        rejects("CHAT_REQUEST_CONFLICT", () -> chat.send(first, request, "问候好友"));
        var received = chat.history(second, ChatChannel.PRIVATE, first, 0, 0);
        assertEquals(List.of(sent, another), received.messages());
        assertEquals(2, received.unreadCount());
        assertEquals(2, chat.overview(second).conversations().getFirst().unreadCount());
        assertEquals(0, chat.overview(first).conversations().getFirst().unreadCount());
        assertTrue(chat.overview(third).conversations().isEmpty());
        rejects("CHAT_INVALID", () -> chat.read(third, ChatChannel.PRIVATE, second, sent.id()));
        assertTrue(chat.history(third, ChatChannel.PRIVATE, first, 0, 0).messages().isEmpty());
        assertTrue(events.forRole(third).isEmpty());
        assertEquals(2, events.forRole(second).size());
        assertEquals(1, chat.read(second, ChatChannel.PRIVATE, first, sent.id()).unreadCount());
        assertEquals(List.of(another), chat.history(second, ChatChannel.PRIVATE, first, sent.id(), 0).messages());
        jdbc.update("INSERT INTO game_friend_block (role_id,target_id,created_at_seconds) VALUES (?,?,?)",
                second, first, clock.epochSeconds());
        assertFalse(chat.history(first, ChatChannel.PRIVATE, second, 0, 0).canSend());
        assertTrue(chat.overview(second).conversations().isEmpty());
        rejects("CHAT_CHANNEL_UNAVAILABLE", () -> chat.send(first, ChatChannel.PRIVATE, second, request, sent.text()));
    }

    /** 公会记录和游标随当前成员关系移动，退出公会后无法读取之前的房间。 */
    @Test
    void guildMembershipSelectsIsolatedHistoryAndReadCursor() {
        String server = createServer();
        String leader = player(server, "公会长", 18);
        String member = player(server, "会员", 18);
        String outsider = player(server, "来客", 18);
        String activeGuild = guild(server, leader, "朝阳");
        String otherGuild = guild(server, outsider, "明月");
        member(activeGuild, member);
        var message = chat.send(leader, ChatChannel.GUILD, null, requestId(), "大家好");
        assertEquals(List.of(message), chat.history(member, ChatChannel.GUILD, null, 0, 0).messages());
        assertTrue(chat.history(outsider, ChatChannel.GUILD, null, 0, 0).messages().isEmpty());
        assertTrue(chat.history(member, 0, 0).messages().isEmpty());
        assertEquals(activeGuild, chat.read(member, ChatChannel.GUILD, null, message.id()).scopeId());
        assertEquals(2, events.forRole(member).size());
        assertTrue(events.forRole(outsider).isEmpty());
        jdbc.update("UPDATE game_guild_member SET guild_id=? WHERE role_id=?", otherGuild, member);
        var changed = chat.history(member, ChatChannel.GUILD, null, 0, 0);
        assertEquals(otherGuild, changed.scopeId());
        assertEquals(0, changed.readThroughId());
        assertTrue(changed.messages().isEmpty());
        rejects("CHAT_INVALID", () -> chat.read(member, ChatChannel.GUILD, null, message.id()));
        jdbc.update("DELETE FROM game_guild_member WHERE role_id=?", member);
        assertFalse(chat.history(member, ChatChannel.GUILD, null, 0, 0).canSend());
    }

    /** 本机确有共同房间的两区服可跨服收发，独立房间及未经准入等级看不到消息。 */
    @Test
    void crossAndGlobalUseConfiguredRoomsAndDistinctLegacyLevels() {
        String actor = player("local-1", "跨越", 35);
        String reader = player("local-2", "异旅", 35);
        String lower = player("local-2", "访客", 22);
        String middle = player("local-2", "银帆", 23);
        String outside = player(createServer(), "隔离", 35);
        var cross = chat.send(actor, ChatChannel.CROSS, null, requestId(), "跨服记录");
        assertEquals("local-1", cross.serverId());
        assertEquals(List.of(cross), chat.history(reader, ChatChannel.CROSS, null, 0, 0).messages());
        assertEquals(List.of(cross), chat.history(middle, ChatChannel.CROSS, null, 0, 0).messages());
        rejects("CHAT_LEVEL_REQUIRED", () -> chat.send(lower, ChatChannel.CROSS, null, requestId(), "低于门槛"));
        rejects("CHAT_LEVEL_REQUIRED", () -> chat.send(middle, ChatChannel.GLOBAL, null, requestId(), "低于门槛"));
        assertTrue(chat.history(outside, ChatChannel.CROSS, null, 0, 0).messages().isEmpty());
        rejects("CHAT_CHANNEL_UNAVAILABLE", () -> chat.send(outside, ChatChannel.CROSS, null, requestId(), "独立房间"));
        assertTrue(chat.history(reader, 0, 0).messages().isEmpty());
        rejects("CHAT_RATE_LIMIT", () -> chat.send(actor, ChatChannel.GLOBAL, null, requestId(), "同一角色公共频道限频"));
        try {
            clock.setEpochSeconds(clock.epochSeconds() + 6);
            var global = chat.send(actor, ChatChannel.GLOBAL, null, requestId(), "全服独立房间");
            assertEquals(List.of(global), chat.history(reader, ChatChannel.GLOBAL, null, 0, 0).messages());
            assertEquals(List.of(cross), chat.history(reader, ChatChannel.CROSS, null, 0, 0).messages());
            assertTrue(chat.history(middle, ChatChannel.GLOBAL, null, 0, 0).messages().isEmpty());
        } finally {
            clock.reset();
        }
    }

    /** 系统公告由业务事务写入，回滚无公告，客户端调用不能伪造系统身份。 */
    @Test
    void systemNoticeIsServerOwnedAndCommitted() {
        String server = createServer();
        String role = player(server, "灯塔", 35);
        String outside = player(createServer(), "岸灯", 35);
        var tx = new TransactionTemplate(transactions);
        tx.executeWithoutResult(status -> {
            chat.publishSystem(server, "闯过幻境之塔", 172);
            status.setRollbackOnly();
        });
        assertTrue(chat.history(role, ChatChannel.SYSTEM, null, 0, 0).messages().isEmpty());
        assertTrue(events.forServer(server).isEmpty());
        var notice = tx.execute(status -> chat.publishSystem(server, "闯过幻境之塔", 172));
        var history = chat.history(role, ChatChannel.SYSTEM, null, 0, 0);
        assertEquals(List.of(notice), history.messages());
        assertEquals(172, notice.noticeId());
        assertEquals("", notice.roleId());
        assertFalse(history.canSend());
        assertEquals(1, history.unreadCount());
        assertEquals(0, chat.read(role, ChatChannel.SYSTEM, null, notice.id()).unreadCount());
        assertTrue(chat.history(outside, ChatChannel.SYSTEM, null, 0, 0).messages().isEmpty());
        rejects("CHAT_READ_ONLY", () -> chat.send(role, ChatChannel.SYSTEM, null, requestId(), "伪造公告"));
    }

    /** 准备已经互相同意的好友关系，操作入口的流程在独立好友和连接测试覆盖。 */
    private void friendship(String first, String other) {
        jdbc.update("INSERT INTO game_friend_relation (role_id,target_id) VALUES (?,?),(?,?)", first, other, other, first);
    }

    /** 创建同服公会和会长资料供聊天隔离场景使用。 */
    private String guild(String server, String leader, String name) {
        String id = requestId();
        jdbc.update("""
                INSERT INTO game_guild (id,server_id,name,name_key,description,leader_role_id,created_at_seconds)
                VALUES (?,?,?,?,?,?,?)
                """, id, server, name, name, "", leader, clock.epochSeconds());
        member(id, leader);
        return id;
    }

    /** 将测试角色加入指定公会。 */
    private void member(String guild, String role) {
        jdbc.update("INSERT INTO game_guild_member (role_id,guild_id,joined_at_seconds) VALUES (?,?,?)",
                role, guild, clock.epochSeconds());
    }

    /** 为每例写入独立启用的区服行，同时覆盖运行中新区服的首次聊天。 */
    private String createServer() {
        String id = "chat-" + UUID.randomUUID().toString().substring(0, 12);
        jdbc.update("""
                INSERT INTO game_server (id,region_id,region_name,server_name,enabled) VALUES (?,?,?,?,TRUE)
                """, id, "local", "独立区", "聊天测试服");
        return id;
    }

    /** 通过正常本地登录新建角色，准备实际发言等级和名称。 */
    private String player(String serverId, String name, int level) {
        String account = "chat_" + UUID.randomUUID().toString().substring(0, 14);
        String id = login.login(account, serverId).role().id();
        jdbc.update("UPDATE game_role SET nickname=?,role_level=?,first_named=TRUE WHERE id=?", name, level, id);
        return id;
    }

    /** 模拟客户端每次独立发言创建的业务 UUID。 */
    private static String requestId() {
        return UUID.randomUUID().toString();
    }

    /** 检查拒绝原因属于稳定的业务通信错误码。 */
    private static void rejects(String code, Runnable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action::run).getReason());
    }

    @TestConfiguration
    static class ProbeConfiguration {
        /** 只在测试中收集事务后事件供断言。 */
        @Bean
        EventProbe eventProbe() {
            return new EventProbe();
        }
    }

    static class EventProbe {
        /** 记录已经提交的事件，需要容纳并发发送。 */
        private final List<ChatChanged> delivered = new java.util.concurrent.CopyOnWriteArrayList<>();

        /** 原事务提交后才记录此次通知。 */
        @TransactionalEventListener
        public void accept(ChatChanged event) {
            delivered.add(event);
        }

        /** 分区观察，防止前一个案例的消息影响下一例。 */
        List<ChatChanged> forServer(String serverId) {
            return delivered.stream().filter(event -> event.serverIds().contains(serverId)).toList();
        }

        /** 读取发给单个角色或其聊天参与者的提交事件。 */
        List<ChatChanged> forRole(String roleId) {
            return delivered.stream().filter(event -> event.roleIds().contains(roleId)).toList();
        }
    }
}
