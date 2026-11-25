/**
 * 主城排行榜的五张权威榜、详情与每榜每日点赞。依登录身份读取本服或实际已启用的同区服组，
 * 点赞资格、原系统金币奖励与持久回执在同一角色锁下提交。
 */
package com.funsgamex.mxzg.rank;

import com.funsgamex.mxzg.guild.GuildRankingService;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.server.ServerCatalog;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RankService {
    /** 榜内保留原排名前百；详情列表最多展示前五十，前百的本人名次仍可读取。 */
    private static final int RANK_SIZE = 100;
    /** 旧排行榜详情协议下发的榜上行数上限。 */
    private static final int SHOWN_SIZE = 50;
    /** 原膜拜金币走统一钱包发奖配置。 */
    private static final int GOLD_ITEM_ID = 900001;
    /** 点赞次数按上海自然日零点重置。 */
    private static final ZoneId RANK_ZONE = ZoneId.of("Asia/Shanghai");

    /** 大厅中的固定显示顺序，和旧服本服、跨服页一致。 */
    public enum BoardKind {
        CHAPTER, GUILD, POWER, CROSS_GUILD, CROSS_POWER;

        /** 是否读取已配置的跨服范围。 */
        private boolean isCross() {
            return this == CROSS_GUILD || this == CROSS_POWER;
        }

        /** 是否使用公会成员历史战力的聚合读模型。 */
        private boolean isGuild() {
            return this == GUILD || this == CROSS_GUILD;
        }
    }

    /** 公开排行榜行，rank 为零表示本人未进入原前百名，个人行不携带会长或徽章。 */
    public record Entry(int rank, String id, String serverId, String name, long score, int level,
                        int headId, int borderId, int badgeId, String leaderName) {}

    /** 一种有首名的榜，及当前角色在本自然日是否已经点过。 */
    public record Board(BoardKind kind, Entry leader, boolean liked) {}

    /** 角色可见的排行大厅，resetAt 为当前自然日结束的 Unix 秒。 */
    public record Overview(int crossLevel, long resetAt, boolean crossUnlocked, List<Board> boards) {
        /** 冻结各页可见榜的顺序和首位快照。 */
        public Overview {
            boards = List.copyOf(boards);
        }
    }

    /** 榜上前五十和单独的本人行，未加入公会时 own 可为空。 */
    public record State(BoardKind kind, List<Entry> entries, Entry own) {
        /** 冻结本次快照的排行顺序。 */
        public State {
            entries = List.copyOf(entries);
        }
    }

    /** 本次确认的榜、所见首位和所见自然日，仅由服务端提供金币数量。 */
    public record LikeCommand(String requestId, BoardKind kind, String targetId, long resetAt) {}

    /** 返回当前大厅状态与本请求原始实际奖励，同请求重试返回相同提示身份。 */
    public record LikeResult(Overview overview, RewardFeedbackService.Notice rewardNotice) {}

    /** 同库角色行是唯一写锁，角色资料只从权威记录读取。 */
    private final RoleRepository roles;
    /** 当前部署已有的跨服区组来源，只使用启用且同区的真实服务器。 */
    private final ServerCatalog servers;
    /** 只读个人榜和持久点赞回执。 */
    private final RankRepository ranking;
    /** 公会模块与主城共用同一真实战力聚合查询。 */
    private final GuildRankingService guilds;
    /** 原表开放条件和金币配置。 */
    private final RankRules rules;
    /** 统一游戏时钟用于自然日与统一发奖。 */
    private final GameClock clock;
    /** 按现有奖励事务写真实钱包与资产版本。 */
    private final RewardGrantService grants;
    /** 旧服点赞的飘字奖励走提交后的统一提示。 */
    private final RewardFeedbackService feedback;
    /** 用统一校验防止重放损坏、重复或跨身份回执。 */
    private final RewardReceiptPayloads receipts;

    /** 注入排行读取、服务器分组及统一发奖路径，启动时校验金币可发。 */
    RankService(RoleRepository roles, ServerCatalog servers, RankRepository ranking, GuildRankingService guilds,
                RankRules rules, GameClock clock, RewardGrantService grants, RewardFeedbackService feedback,
                RewardReceiptPayloads receipts) {
        this.roles = roles;
        this.servers = servers;
        this.ranking = ranking;
        this.guilds = guilds;
        this.rules = rules;
        this.clock = clock;
        this.grants = grants;
        this.feedback = feedback;
        this.receipts = receipts;
        grants.requireSupported(List.of(GOLD_ITEM_ID));
    }

    /** 按登录角色读取大厅，所有可见榜与点赞状态来自同一个快照。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Overview overview(String roleId) {
        return overview(requireLocalAccess(roleId), resetAt(clock.epochSeconds()));
    }

    /** 按原列表长度读取当前已开放的单榜及真实本人名次。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public State list(String roleId, BoardKind kind) {
        var role = requireLocalAccess(roleId);
        requireBoardAccess(role, kind);
        var full = state(role.id(), kind, scope(role, kind), RANK_SIZE);
        return new State(kind, full.entries().stream().limit(SHOWN_SIZE).toList(), full.own());
    }

    /** 同一个自然日每榜只点赞一次；先取得角色锁，再读取已提交的重试回执。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LikeResult like(String roleId, LikeCommand command) {
        if (command == null || !RewardReceiptPayloads.validId(command.requestId())
                || !RewardReceiptPayloads.validId(command.targetId()) || command.kind() == null || command.resetAt() <= 0) {
            throw failure(HttpStatus.BAD_REQUEST, "RANK_INVALID");
        }
        roles.lock(roleId);
        var role = requireLocalAccess(roleId);
        long now = clock.epochSeconds();
        long resetAt = resetAt(now);
        var saved = ranking.receipt(roleId, command.requestId());
        if (saved != null) {
            return restore(role, command, resetAt, saved);
        }
        requireBoardAccess(role, command.kind());
        if (command.resetAt() != resetAt) {
            throw failure(HttpStatus.CONFLICT, "RANK_LIKE_RESET");
        }
        if (ranking.liked(roleId, resetAt).contains(command.kind())) {
            throw failure(HttpStatus.CONFLICT, "RANK_ALREADY_LIKED");
        }
        var leaders = state(roleId, command.kind(), scope(role, command.kind()), 1).entries();
        if (leaders.isEmpty() || !leaders.getFirst().id().equals(command.targetId())) {
            throw failure(HttpStatus.CONFLICT, "RANK_LEADER_CHANGED");
        }
        var actual = grants.grant(roleId, List.of(new Reward(GOLD_ITEM_ID, rules.likeGold)),
                new RewardGrantService.Context(now, 0), ThreadLocalRandom.current());
        var notice = feedback.publish(UUID.randomUUID().toString(), roleId, roles.revision(roleId),
                RewardFeedbackService.Mode.TIPS, actual, command.requestId());
        ranking.insert(roleId, command, receipts.freeze(notice));
        return new LikeResult(overview(role, resetAt), notice);
    }

    /** 校验原请求及回执的归属，当前自然日已变化时仍返回最新大厅和原奖励。 */
    private LikeResult restore(RoleProfile role, LikeCommand command, long resetAt, RankRepository.Stored saved) {
        if (!command.equals(saved.command())) {
            throw failure(HttpStatus.CONFLICT, "RANK_REQUEST_CONFLICT");
        }
        var notice = receipts.read(saved.noticeJson(), saved.noticeHash(), RewardFeedbackService.Notice.class);
        if (notice == null || !role.id().equals(notice.roleId()) || !command.requestId().equals(notice.requestId())
                || !RewardReceiptPayloads.validId(notice.receiptId()) || notice.mode() != RewardFeedbackService.Mode.TIPS) {
            throw new IllegalStateException("排行榜点赞历史回执归属或类型无效");
        }
        return new LikeResult(overview(role, resetAt), notice);
    }

    /** 按原版仅加入确有首位的榜，跨服门槛单独返回以区分没有上榜者。 */
    private Overview overview(RoleProfile role, long resetAt) {
        boolean crossUnlocked = role.level() >= rules.crossLevel;
        var local = List.of(role.serverId());
        var cross = crossUnlocked ? sameRegionServers(role.serverId()) : List.<String>of();
        var liked = ranking.liked(role.id(), resetAt);
        var boards = new ArrayList<Board>();
        for (var kind : BoardKind.values()) {
            var entries = state(role.id(), kind, kind.isCross() ? cross : local, 1).entries();
            if (!entries.isEmpty()) {
                boards.add(new Board(kind, entries.getFirst(), liked.contains(kind)));
            }
        }
        return new Overview(rules.crossLevel, resetAt, crossUnlocked, boards);
    }

    /** 把共用的个人、公会查询行映射为单榜快照。 */
    private State state(String roleId, BoardKind kind, List<String> servers, int limit) {
        if (kind.isGuild()) {
            var guildState = guilds.listWithinServers(roleId, servers, limit);
            var own = guildState.own() == null ? null : guildEntry(guildState.own());
            return new State(kind, guildState.entries().stream().map(RankService::guildEntry).toList(), own);
        }
        var rows = ranking.players(kind, servers, roleId, limit);
        var own = rows.stream().filter(row -> roleId.equals(row.id())).findFirst().orElse(null);
        return new State(kind, rows.stream().filter(row -> row.rank() > 0).toList(), own);
    }

    /** 公会展示徽章和会长，通用头像和等级字段保持 0。 */
    private static Entry guildEntry(GuildRankingService.Entry guild) {
        return new Entry(guild.rank(), guild.guildId(), guild.serverId(), guild.name(), guild.power(),
                0, 0, 0, guild.badgeId(), guild.leaderName());
    }

    /** 从服务端身份和榜种推导读榜区服，调用者不能扩大区服范围。 */
    private List<String> scope(RoleProfile role, BoardKind kind) {
        return kind.isCross() ? sameRegionServers(role.serverId()) : List.of(role.serverId());
    }

    /** 旧中心动态分组未迁移，当前只读取启用且与本人一区的实际服务器。 */
    private List<String> sameRegionServers(String currentServer) {
        var catalog = servers.list();
        var own = catalog.stream().filter(server -> server.enabled() && currentServer.equals(server.id())).findFirst();
        if (own.isEmpty()) {
            return List.of();
        }
        String region = own.orElseThrow().regionId();
        return catalog.stream().filter(server -> server.enabled() && region.equals(server.regionId()))
                .map(ServerCatalog.Server::id).toList();
    }

    /** 读取登录角色，本服排行榜门槛未达时拒绝查询或交易。 */
    private RoleProfile requireLocalAccess(String roleId) {
        var role = roles.findById(roleId).orElseThrow(() -> failure(HttpStatus.UNAUTHORIZED, "INVALID_SESSION"));
        if (role.level() < rules.localLevel) {
            throw failure(HttpStatus.CONFLICT, "RANK_LOCKED");
        }
        return role;
    }

    /** 本服开放后，跨服详情与点赞仍另受原等级条件约束。 */
    private void requireBoardAccess(RoleProfile role, BoardKind kind) {
        if (kind == null) {
            throw failure(HttpStatus.BAD_REQUEST, "RANK_INVALID");
        }
        if (kind.isCross() && role.level() < rules.crossLevel) {
            throw failure(HttpStatus.CONFLICT, "RANK_CROSS_LOCKED");
        }
    }

    /** 返回当前上海自然日结束的 Unix 秒。 */
    private static long resetAt(long now) {
        return Instant.ofEpochSecond(now).atZone(RANK_ZONE).toLocalDate().plusDays(1).atStartOfDay(RANK_ZONE).toEpochSecond();
    }

    /** 将领域拒绝转换为现有协议错误体，不写钱包或排行资格。 */
    private static ResponseStatusException failure(HttpStatus status, String code) {
        return new ResponseStatusException(status, code);
    }
}
