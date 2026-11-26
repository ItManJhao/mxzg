/**
 * 公会浏览、成员管理和公告编辑，由已鉴权的游戏协议调用。
 * 角色锁先于公会锁，余额、成员、科技生效引起的战力与命令标记在同一事务提交。
 */
package com.funsgamex.mxzg.guild;

import com.funsgamex.mxzg.chat.ChatChannel;
import com.funsgamex.mxzg.chat.ChatService;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.network.AssetSyncService;
import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import com.funsgamex.mxzg.world.WorldLevelService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GuildService {
    /** 旧公会列表一次展示十项。 */
    private static final int PAGE_SIZE = 10;
    /** 公会名称与完整搜索文本的实际字符串长度上限。 */
    private static final int MAX_SEARCH_LENGTH = 64;
    /** 创建可选择的最后一张原版徽章编号。 */
    private static final int MAX_BADGE_ID = 43;
    /** 持久命令、角色和公会标识采用规范小写 UUID。 */
    private static final Pattern UUID_TEXT =
            Pattern.compile("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}");

    /** 当前已恢复的公会写操作。 */
    public enum Action { CREATE, APPLY, APPROVE, REJECT, LEAVE, UPDATE_NOTICE }

    /** 当前角色的确认命令；申请提供公会 ID，审批提供真实申请者 ID。 */
    public record Command(String requestId, Action action, String guildId, String applicantId,
                          String name, String description, Integer badgeId) {
        /** 旧命令未选择徽章，保持原 00 徽章及持久请求摘要。 */
        public Command(String requestId, Action action, String guildId, String applicantId,
                       String name, String description) {
            this(requestId, action, guildId, applicantId, name, description, null);
        }
    }

    /** 公会的持久资料、实际人数和本级经验，容量和经验门槛来自同一等级配置。 */
    public record Summary(String id, String name, int memberCount, int capacity, String description, int badgeId,
                          int level, int experience, int nextLevelExperience) {}

    /** 成员或申请者的公开资料。只有未计算过主阵战力的旧角色在持久读取时暂缺 power。 */
    public record Member(String id, String nickname, int level, boolean leader, int headId, int borderId, Integer power) {}

    /**
     * 公会页的权威状态。guild 为空时提供推荐、已申请标记和离会截止秒。
     * 只有会长收到申请清单。requestId 仅用于对应已经提交的变更。
     */
    public record State(String requestId, int levelRequired, int createCostDiamonds, int nameLimit, Summary guild,
                        List<Member> members, List<Member> applications, List<Summary> guilds, int page,
                        boolean hasMore, List<String> appliedGuildIds, long rejoinAtSeconds) {
        /** 冻结响应中按当前事务读取的各个名单。 */
        public State {
            members = List.copyOf(members);
            applications = List.copyOf(applications);
            guilds = List.copyOf(guilds);
            appliedGuildIds = List.copyOf(appliedGuildIds);
        }
    }

    /** 角色权威资料、钱包和游戏共用的写锁。 */
    private final RoleRepository roles;
    /** 公会成员和申请状态的唯一持久化入口。 */
    private final GuildRepository guilds;
    /** 创建费用、人数、命名及公会开放配置。 */
    private final GuildRules rules;
    /** 各区世界等级；低于门槛时拒绝读取或修改未开放的公会。 */
    private final WorldLevelService world;
    /** 退会冷却和操作时间使用统一游戏时钟。 */
    private final GameClock clock;
    /** 角色公会身份与钱包共用提交后快照与版本。 */
    private final AssetSyncService sync;
    /** 提交后公会名单更新由通信层订阅。 */
    private final ApplicationEventPublisher events;
    /** 读取及刷新真实主阵战力，公会身份切换时同步生效的科技加成。 */
    private final HeroMainPowerService powers;
    /** 检查角色是否具备生效科技，避免无科技的身份变更多做一次名册评分。 */
    private final GuildTechnologyAttributes guildTechnology;
    /** 在同一事务发布建会世界公告，以及只对本会成员可见的入会公告。 */
    private final ChatService chat;

    /** 装配公会业务使用的角色、事件、世界状态、科技属性与聊天服务。 */
    GuildService(RoleRepository roles, GuildRepository guilds, GuildRules rules, WorldLevelService world,
                 GameClock clock, AssetSyncService sync, ApplicationEventPublisher events, HeroMainPowerService powers,
                 GuildTechnologyAttributes guildTechnology, ChatService chat) {
        this.roles = roles;
        this.guilds = guilds;
        this.rules = rules;
        this.world = world;
        this.clock = clock;
        this.sync = sync;
        this.events = events;
        this.powers = powers;
        this.guildTechnology = guildTechnology;
        this.chat = chat;
    }

    /** 在同一只读快照内读取当前角色的公会或区服推荐页；页码从 1 开始。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public State list(String roleId, String query, int page) {
        String search = text(query).strip();
        if (page < 1 || search.length() > MAX_SEARCH_LENGTH) {
            throw invalid("GUILD_REQUEST_INVALID");
        }
        return state(requireAccess(roleId), search, page, null);
    }

    /** 从角色当前的真实成员记录取公会名，供统一角色快照在持有角色锁时调用。 */
    public String nameForRole(String roleId) {
        var guild = guilds.memberGuild(roleId);
        return guild == null ? "" : guild.name();
    }

    /**
     * 在事务内提交一次已认证操作。重复请求保持原提交效果，并读取当前状态供页面恢复。
     * 审批同时锁住申请者与操作者。建会选择非默认徽章时将徽章加入持久命令摘要。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State change(String roleId, Command input) {
        var command = validated(input);
        lockRoles(roleId, command.applicantId());
        var actor = requireAccess(roleId);
        String intent = String.join("\u0000", command.action().name(), command.guildId(),
                command.applicantId(), command.name(), command.description());
        if (command.badgeId() != null && command.badgeId() > 0) {
            intent += "\u0000" + command.badgeId();
        }
        String key = digest(intent);
        String committed = guilds.commandKey(roleId, command.requestId());
        if (committed != null) {
            if (!committed.equals(key)) {
                throw conflict("GUILD_REQUEST_CONFLICT");
            }
            return state(actor, "", 1, command.requestId());
        }

        long now = clock.epochSeconds();
        var affected = new LinkedHashSet<String>();
        switch (command.action()) {
            case CREATE -> create(actor, command, now, affected);
            case APPLY -> apply(actor, command, now, affected);
            case APPROVE -> review(actor, command, now, true, affected);
            case REJECT -> review(actor, command, now, false, affected);
            case LEAVE -> leave(actor, command, now, affected);
            case UPDATE_NOTICE -> updateNotice(actor, command, affected);
        }
        guilds.saveCommand(roleId, command.requestId(), key);
        if (!affected.isEmpty()) {
            events.publishEvent(new GuildChanged(affected));
        }
        return state(actor, "", 1, command.requestId());
    }

    /** 校验费用并保存公会资料和创建者，再按旧公告 1 发布本服邀请。 */
    private void create(RoleProfile actor, Command command, long now, Set<String> affected) {
        requireNoGuild(actor.id());
        if (rules.createRechargeRequired > 0 && guilds.recharge(actor.id()) < rules.createRechargeRequired) {
            throw conflict("GUILD_RECHARGE_REQUIRED");
        }
        String name = rules.validatedName(command.name());
        String description = rules.validatedNotice(command.description());
        String guildId = UUID.randomUUID().toString();
        try {
            guilds.insertGuild(guildId, actor.serverId(), actor.id(), name, digest(name), description,
                command.badgeId() == null ? 0 : command.badgeId(), now);
        } catch (DuplicateKeyException duplicate) {
            throw conflict("GUILD_NAME_TAKEN");
        }
        if (rules.createCostDiamonds > 0 && !roles.debitDiamonds(actor.id(), rules.createCostDiamonds)) {
            throw conflict("GUILD_INSUFFICIENT");
        }
        join(guildId, actor.id(), now, affected);
        chat.publishNotice(actor.serverId(), ChatChannel.WORLD, null,
                "%s创建了%s公会，实力宏厚，赶紧前往加入吧！".formatted(actor.nickname(), name), 1);
    }

    /** 检查申请时的身份、剩余容量与冷却，重复待审申请不写第二条。 */
    private void apply(RoleProfile actor, Command command, long now, Set<String> affected) {
        var guild = requireGuild(actor.serverId(), command.guildId());
        requireCanJoin(actor.id(), guild, now);
        if (!guilds.hasApplication(guild.id(), actor.id())) {
            guilds.insertApplication(guild.id(), actor.id(), now);
            affected.add(guild.leaderId());
        }
    }

    /** 只有会长可审批真实待审记录；批准并写入成员后按旧公告 2 欢迎新成员。 */
    private void review(RoleProfile actor, Command command, long now, boolean approve, Set<String> affected) {
        var guild = managedGuild(actor, command.guildId());
        String target = command.applicantId();
        var applicant = roles.findById(target).orElseThrow(() -> conflict("GUILD_APPLICATION_MISSING"));
        if (!actor.serverId().equals(applicant.serverId()) || !guilds.hasApplication(guild.id(), target)) {
            throw conflict("GUILD_APPLICATION_MISSING");
        }
        if (approve) {
            requireLevel(applicant);
            requireCanJoin(target, guild, now);
            join(guild.id(), target, now, affected);
            chat.publishNotice(actor.serverId(), ChatChannel.GUILD, guild.id(),
                    "%s加入了公会大家庭，公会实力得到大幅度提升！欢迎欢迎！".formatted(applicant.nickname()), 2);
        } else {
            guilds.deleteApplication(guild.id(), target);
            affected.add(target);
        }
    }

    /** 会长可编辑或清空本会公告；实际文本变化才通知所有在线成员刷新。 */
    private void updateNotice(RoleProfile actor, Command command, Set<String> affected) {
        var guild = managedGuild(actor, command.guildId());
        String notice = rules.validatedNotice(command.description());
        if (!notice.equals(guild.description())) {
            guilds.updateNotice(guild.id(), notice);
            affected.addAll(guilds.memberIds(guild.id()));
        }
    }

    /** 在公会锁内校验当前管理身份，现有职务中只有会长可以审批或修改公告。 */
    private GuildRepository.Guild managedGuild(RoleProfile actor, String expectedGuildId) {
        var guild = ownGuild(actor, expectedGuildId);
        if (!guild.leaderId().equals(actor.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "GUILD_FORBIDDEN");
        }
        return guild;
    }

    /** 在角色锁内登记入会，启用保留的个人科技并刷新战力，撤销其他申请。 */
    private void join(String guildId, String roleId, long now, Set<String> affected) {
        guilds.insertMember(guildId, roleId, now);
        if (!guildTechnology.current(roleId).isEmpty()) {
            powers.observe(roleId);
        }
        events.publishEvent(new QuestProgressEvent(roleId, QuestMetric.JOIN_CLAN, 0, 1));
        affected.addAll(guilds.clearApplications(roleId));
        affected.addAll(guilds.memberIds(guildId));
        sync.changed(roleId);
    }

    /** 单人会长退出时解散。离会停用个人科技并刷新战力，培养进度由原角色保留。 */
    private void leave(RoleProfile actor, Command command, long now, Set<String> affected) {
        var guild = ownGuild(actor, command.guildId());
        boolean onlyMember = guilds.memberCount(guild.id()) == 1;
        if (!onlyMember && guild.leaderId().equals(actor.id())) {
            throw conflict("GUILD_LEADER_CANNOT_LEAVE");
        }
        boolean hadActiveTechnology = !guildTechnology.current(actor.id()).isEmpty();
        guilds.leave(guild.id(), actor.id(), Math.addExact(now, rules.rejoinSeconds));
        if (onlyMember) {
            affected.addAll(guilds.removeGuild(guild.id()));
        } else {
            affected.addAll(guilds.memberIds(guild.id()));
        }
        if (hadActiveTechnology) {
            powers.observe(actor.id());
        }
        sync.changed(actor.id());
    }

    /** 读取同区目标并锁定；未知和外区公会都不给出成员资料。 */
    private GuildRepository.Guild requireGuild(String serverId, String guildId) {
        var guild = guilds.lockGuild(serverId, guildId);
        if (guild == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "GUILD_NOT_FOUND");
        }
        return guild;
    }

    /** 从权威成员关系取操作者公会，客户端若带了旧公会 ID 则拒绝变更。 */
    private GuildRepository.Guild ownGuild(RoleProfile actor, String expectedGuildId) {
        var memberGuild = guilds.memberGuild(actor.id());
        if (memberGuild == null) {
            throw conflict("GUILD_NOT_MEMBER");
        }
        if (!expectedGuildId.isEmpty() && !memberGuild.id().equals(expectedGuildId)) {
            throw conflict("GUILD_REQUEST_CONFLICT");
        }
        return requireGuild(actor.serverId(), memberGuild.id());
    }

    /** 创建和加入只能由当前没有成员身份的角色提交。 */
    private void requireNoGuild(String roleId) {
        if (guilds.memberGuild(roleId) != null) {
            throw conflict("GUILD_ALREADY_MEMBER");
        }
    }

    /** 申请和批准共用真实容量与冷却校验，截止秒内仍禁止入会。 */
    private void requireCanJoin(String roleId, GuildRepository.Guild guild, long now) {
        requireNoGuild(roleId);
        if (guilds.rejoinAt(roleId) >= now) {
            throw conflict("GUILD_COOLDOWN");
        }
        if (guilds.memberCount(guild.id()) >= rules.level(guild.level()).capacity()) {
            throw conflict("GUILD_FULL");
        }
    }

    /** 读取鉴权角色，并按原条件同时核对角色和当前区服世界等级。 */
    RoleProfile requireAccess(String roleId) {
        var profile = roles.findById(roleId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION"));
        requireLevel(profile);
        if (rules.gate.worldLevelRequired() > 1 && world.current(profile.serverId()).level() < rules.gate.worldLevelRequired()) {
            throw conflict("GUILD_LOCKED");
        }
        return profile;
    }

    /** 角色恰好达到配置门槛时即可进入或批准加入公会。 */
    private void requireLevel(RoleProfile profile) {
        if (profile.level() < rules.gate.levelRequired()) {
            throw conflict("GUILD_LOCKED");
        }
    }

    /** 审批先锁两个角色再锁公会，其他命令只锁当前角色。 */
    private void lockRoles(String roleId, String applicantId) {
        if (applicantId.isEmpty() || roleId.equals(applicantId)) {
            roles.lock(roleId);
            return;
        }
        if (roles.findById(applicantId).isEmpty()) {
            throw conflict("GUILD_APPLICATION_MISSING");
        }
        if (roleId.compareTo(applicantId) < 0) {
            roles.lock(roleId);
            roles.lock(applicantId);
        } else {
            roles.lock(applicantId);
            roles.lock(roleId);
        }
    }

    /** 成员页与区内目录共用公会等级和经验投影，申请名单仅交付会长。 */
    private State state(RoleProfile actor, String query, int page, String requestId) {
        int level = rules.gate.levelRequired();
        int cost = rules.createCostDiamonds;
        int nameLimit = rules.nameLimit;
        var guild = guilds.memberGuild(actor.id());
        if (guild != null) {
            var members = withMainPower(guilds.members(guild));
            var summary = guild.summary(members.size(), rules);
            List<Member> requests = guild.leaderId().equals(actor.id()) ? withMainPower(guilds.applicants(guild.id())) : List.of();
            return new State(requestId, level, cost, nameLimit, summary, members, requests, List.of(),
                1, false, List.of(), 0);
        }
        var found = guilds.browse(actor.serverId(), query, PAGE_SIZE + 1, (page - 1L) * PAGE_SIZE);
        boolean hasMore = found.size() > PAGE_SIZE;
        var visible = hasMore ? found.subList(0, PAGE_SIZE) : found;
        return new State(requestId, level, cost, nameLimit, null, List.of(), List.of(), visible, page, hasMore,
            guilds.appliedGuilds(actor.id()), guilds.rejoinAt(actor.id()));
    }

    /** 只有旧角色的持久投影为 null 才从主阵读取；空阵容的真实 0 直接交付。 */
    private List<Member> withMainPower(List<Member> members) {
        return members.stream().map(member -> {
            if (member.power() != null) {
                return member;
            }
            return new Member(member.id(), member.nickname(), member.level(), member.leader(), member.headId(),
                member.borderId(), powers.readCurrentForRole(member.id()));
        }).toList();
    }

    /** 按操作校验参数，编辑公告须显式传文本；空字符串代表主动清空。 */
    private static Command validated(Command input) {
        if (input == null || input.action() == null || !UUID_TEXT.matcher(text(input.requestId())).matches()) {
            throw invalid("GUILD_REQUEST_INVALID");
        }
        var command = new Command(input.requestId(), input.action(), text(input.guildId()), text(input.applicantId()),
            text(input.name()), text(input.description()), input.badgeId());
        boolean hasGuild = !command.guildId().isEmpty();
        boolean hasApplicant = !command.applicantId().isEmpty();
        boolean hasText = !command.name().isEmpty() || !command.description().isEmpty();
        if (command.badgeId() != null && (command.action() != Action.CREATE
                || command.badgeId() < 0 || command.badgeId() > MAX_BADGE_ID)) {
            throw invalid("GUILD_REQUEST_INVALID");
        }
        if (hasGuild && !UUID_TEXT.matcher(command.guildId()).matches()
                || hasApplicant && !UUID_TEXT.matcher(command.applicantId()).matches()) {
            throw invalid("GUILD_REQUEST_INVALID");
        }
        boolean shape = switch (command.action()) {
            case CREATE -> !hasGuild && !hasApplicant;
            case APPLY -> hasGuild && !hasApplicant && !hasText;
            case APPROVE, REJECT -> hasApplicant && !hasText;
            case LEAVE -> !hasApplicant && !hasText;
            case UPDATE_NOTICE -> hasGuild && !hasApplicant && command.name().isEmpty() && input.description() != null;
        };
        // 命令摘要使用空字符分隔各字段，业务名称与公告均拒绝该字符。
        if (!shape || command.name().indexOf('\0') >= 0 || command.description().indexOf('\0') >= 0) {
            throw invalid("GUILD_REQUEST_INVALID");
        }
        return command;
    }

    /** 协议未填写可选参数时收到 null 或空串，两者采用同一个校验值。 */
    private static String text(String value) {
        return value == null ? "" : value;
    }

    /** 以 UTF-8 原文记录名称或操作摘要，避免数据库排序规则改变原本的名称比较。 */
    private static String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException unavailable) {
            throw new IllegalStateException("缺少应用所需 SHA-256", unavailable);
        }
    }

    /** 格式非法，以协议错误码证实没有发生写入。 */
    static ResponseStatusException invalid(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }

    /** 持久状态改变导致当前操作不再满足业务条件。 */
    private static ResponseStatusException conflict(String reason) {
        return new ResponseStatusException(HttpStatus.CONFLICT, reason);
    }
}
