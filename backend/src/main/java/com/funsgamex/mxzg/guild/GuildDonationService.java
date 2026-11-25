/**
 * 公会捐献和日贡献宝箱。沿用公会成员门槛及角色在前、公会在后的锁顺序。
 * 扣费、奖励、贡献、经验和回执由同一事务持久化，资产与公会通知在提交后发出。
 */
package com.funsgamex.mxzg.guild;

import com.funsgamex.mxzg.quest.QuestMetric;
import com.funsgamex.mxzg.quest.QuestProgressEvent;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GuildDonationService {
    /** 上海自然日截止时间，跨区玩家客户端也使用同一服务口径。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");
    /** 请求以及持久公会身份采用原协议标准的小写 UUID。 */
    private static final Pattern UUID_TEXT = Pattern.compile("[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}");

    /** 写操作针对当前成员公会与当前日，按已同步配置编号执行。 */
    public record Command(String requestId, String guildId, long resetAt, int optionId) {}
    /** 原捐献档位的费用、勋章件数和增加的公会经验。 */
    public record Tier(int id, int costItemId, int costAmount, int medals, int experience) {}
    /** 每日宝箱的贡献门槛、服务器已领状态和实际配置奖励。 */
    public record Chest(int id, int points, boolean claimed, List<RewardGrantService.Reward> rewards) {}
    /** 当前角色公会的权威捐献页，requestId 仅在写操作回应中存在。 */
    public record State(String requestId, String guildId, long resetAt, int level, int experience,
            int nextLevelExperience, int nextCapacity, int dailyPoints, int donatedTier, List<Tier> tiers,
            List<Chest> chests) {}

    /** 大厅统一判定公会开放条件和角色归属。 */
    private final GuildService guildAccess;
    /** 当前公会与成员的持久状态，提供与退会共用的加锁入口。 */
    private final GuildRepository guilds;
    /** 角色写锁、金币/钻石钱包与统一资产版本。 */
    private final RoleRepository roles;
    /** 按自然日保存捐献及宝箱且按原请求去重。 */
    private final GuildDonationRepository donations;
    /** 从老表整理的三档金额、经验与宝箱奖励。 */
    private final GuildDonationRules rules;
    /** 大厅和成员容量共用的公会经验分级表。 */
    private final GuildRules guildRules;
    /** 游戏时钟负责每日重置，不读取机器时区。 */
    private final GameClock clock;
    /** 发放真实物品及钱包奖励，由统一事务记资产版本。 */
    private final RewardGrantService grants;
    /** 根据实际发放结果登记提交后的通用获得窗。 */
    private final RewardFeedbackService feedback;
    /** 捐献成功时刷新个人任务进度，并通知同会成员重读公开捐献状态。 */
    private final ApplicationEventPublisher events;

    /** 装配捐献事务依赖，不建立额外钱包或成员模型。 */
    GuildDonationService(GuildService guildAccess, GuildRepository guilds, RoleRepository roles,
            GuildDonationRepository donations, GuildDonationRules rules, GuildRules guildRules, GameClock clock,
            RewardGrantService grants, RewardFeedbackService feedback, ApplicationEventPublisher events) {
        this.guildAccess = guildAccess;
        this.guilds = guilds;
        this.roles = roles;
        this.donations = donations;
        this.rules = rules;
        this.guildRules = guildRules;
        this.clock = clock;
        this.grants = grants;
        this.feedback = feedback;
        this.events = events;
    }

    /** 鉴权后在同一只读事务内投影公会资料和当前日进度。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public State info(String roleId) {
        guildAccess.requireAccess(roleId);
        var guild = requireMembership(roleId);
        return state(roleId, guild, resetAt(clock.epochSeconds()), null);
    }

    /** 每日只能选择一个捐献档位，重复请求返回已提交后的权威状态。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State donate(String roleId, Command input) {
        return apply(roleId, input, false);
    }

    /** 仅有真实同会身份并满足日总进度时，领取本人该档宝箱。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public State claim(String roleId, Command input) {
        return apply(roleId, input, true);
    }

    /** 在角色锁与公会锁内核对快照、操作资格和重试，捐献成功才刷新个人任务进度。 */
    private State apply(String roleId, Command input, boolean chest) {
        if (input == null || input.requestId() == null || !UUID_TEXT.matcher(input.requestId()).matches()
                || input.guildId() == null || !UUID_TEXT.matcher(input.guildId()).matches()
                || input.resetAt() <= 0 || input.optionId() < 1 || input.optionId() > rules.tiers.size()) {
            throw GuildService.invalid("GUILD_DONATION_REQUEST_INVALID");
        }
        roles.lock(roleId);
        var actor = guildAccess.requireAccess(roleId);
        var membership = requireMembership(roleId);
        if (!membership.id().equals(input.guildId())) {
            throw reject("GUILD_DONATION_CHANGED");
        }
        var guild = guilds.lockGuild(actor.serverId(), membership.id());
        if (guild == null) {
            throw reject("GUILD_NOT_MEMBER");
        }

        long now = clock.epochSeconds();
        long resetAt = resetAt(now);
        int slot = chest ? input.optionId() : 0;
        var existing = donations.forRequest(roleId, input.requestId());
        if (existing != null) {
            if (!existing.guildId().equals(input.guildId()) || existing.resetAt() != input.resetAt()
                    || existing.slot() != slot || existing.optionId() != input.optionId()) {
                throw reject("GUILD_DONATION_REQUEST_CONFLICT");
            }
            return state(roleId, guild, resetAt, input.requestId());
        }
        if (resetAt != input.resetAt()) {
            throw reject("GUILD_DONATION_RESET");
        }
        if (donations.dayForRole(roleId, resetAt).stream().anyMatch(receipt -> receipt.slot() == slot)) {
            throw reject(chest ? "GUILD_DONATION_CHEST_CLAIMED" : "GUILD_DONATION_ALREADY_DONATED");
        }

        List<RewardGrantService.Reward> plan;
        int points = 0;
        if (chest) {
            var box = rules.chests.get(input.optionId() - 1);
            if (donations.dailyPoints(guild.id(), resetAt) < box.points()) {
                throw reject("GUILD_DONATION_CHEST_LOCKED");
            }
            plan = box.rewards();
        } else {
            var tier = rules.tiers.get(input.optionId() - 1);
            guild = donateToGuild(roleId, guild, tier);
            points = tier.points();
            plan = List.of(new RewardGrantService.Reward(GuildDonationRules.MEDALS_ITEM_ID, tier.medals()));
        }

        // 配置只发金币与普通勋章，酒馆上限不参与此业务。
        var actual = grants.grant(roleId, plan, new RewardGrantService.Context(now, 0), ThreadLocalRandom.current());
        String receiptId = UUID.randomUUID().toString();
        donations.insert(roleId, input.requestId(), new GuildDonationRepository.Receipt(guild.id(), resetAt,
                slot, input.optionId(), points), receiptId);
        feedback.publish(receiptId, roleId, roles.revision(roleId), RewardFeedbackService.Mode.POPUP, actual, input.requestId());
        if (!chest) {
            events.publishEvent(new QuestProgressEvent(roleId, QuestMetric.CLAN_DONATE));
            events.publishEvent(new GuildChanged(Set.copyOf(guilds.memberIds(guild.id()))));
        }
        return state(roleId, guild, resetAt, input.requestId());
    }

    /** 扣除原档位金额并按旧等级表结转经验，公会最高级仍保留实际获得的经验。 */
    private GuildRepository.Guild donateToGuild(String roleId, GuildRepository.Guild guild, GuildDonationRules.Tier tier) {
        boolean paid = switch (tier.costItemId()) {
            case GuildDonationRules.GOLD_ITEM_ID -> roles.debitGold(roleId, tier.costAmount());
            case GuildDonationRules.DIAMONDS_ITEM_ID -> roles.debitDiamonds(roleId, tier.costAmount());
            default -> throw new IllegalStateException("公会捐献不支持该费用物品：" + tier.costItemId());
        };
        if (!paid) {
            throw reject("GUILD_DONATION_INSUFFICIENT");
        }
        int level = guild.level();
        int experience = Math.addExact(guild.experience(), tier.experience());
        while (level < guildRules.gate.levels().size() && experience >= guildRules.level(level).nextLevelExperience()) {
            experience -= guildRules.level(level).nextLevelExperience();
            level++;
        }
        guilds.updateExperience(guild.id(), level, experience);
        return new GuildRepository.Guild(guild.id(), guild.name(), guild.leaderId(), guild.description(),
                guild.badgeId(), level, experience);
    }

    /** 按原自然日汇总本会贡献、本人档位及宝箱状态。 */
    private State state(String roleId, GuildRepository.Guild guild, long resetAt, String requestId) {
        var activity = donations.dayForRole(roleId, resetAt);
        int donatedTier = activity.stream().filter(row -> row.slot() == 0).mapToInt(GuildDonationRepository.Receipt::optionId)
                .findFirst().orElse(0);
        var boxes = rules.chests.stream().map(box -> new Chest(box.id(), box.points(),
                activity.stream().anyMatch(row -> row.slot() == box.id()), box.rewards())).toList();
        int nextCapacity = guild.level() < guildRules.gate.levels().size() ? guildRules.level(guild.level() + 1).capacity() : 0;
        return new State(requestId, guild.id(), resetAt, guild.level(), guild.experience(),
                guildRules.level(guild.level()).nextLevelExperience(), nextCapacity, donations.dailyPoints(guild.id(), resetAt),
                donatedTier, rules.tiers.stream().map(GuildDonationRules.Tier::display).toList(), boxes);
    }

    /** 非成员不展示隔会进度，也无法扣费或领取。 */
    private GuildRepository.Guild requireMembership(String roleId) {
        var guild = guilds.memberGuild(roleId);
        if (guild == null) {
            throw reject("GUILD_NOT_MEMBER");
        }
        return guild;
    }

    /** 返回当前自然日结束的 Unix 秒，正好在零点进入新一日。 */
    private static long resetAt(long epochSeconds) {
        return Instant.ofEpochSecond(epochSeconds).atZone(SERVER_ZONE).toLocalDate().plusDays(1)
                .atStartOfDay(SERVER_ZONE).toEpochSecond();
    }

    /** 将业务拒绝映射成现有 WS 错误类型，进入客户端统一反馈。 */
    private static ResponseStatusException reject(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
