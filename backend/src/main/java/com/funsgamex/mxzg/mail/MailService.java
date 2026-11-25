/**
 * 角色信箱领域服务。玩家只能操作本角色已有的系统邮件，发信仅供可信服务端功能调用。
 * 附件、邮件状态与持久幂等回执在角色锁内同事务提交。
 */
package com.funsgamex.mxzg.mail;

import com.funsgamex.mxzg.campaign.MainChapterRules;
import com.funsgamex.mxzg.reward.RewardFeedbackService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Service
public class MailService {
    /** 预留列表协议与奖励回执的传输空间，信箱满时显式拒绝新投递。 */
    private static final int MAX_INBOX_SIZE = 256;
    /** 单份邮件最多容纳的正式物品格数。 */
    private static final int MAX_ATTACHMENTS = 30;
    /** 新版期限采用上海时间计算。 */
    private static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");
    /** 本协议展示使用的数量必须可以由前端准确表示。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;

    /** 邮件动作，OPEN 在读取正文的同时标记为已读。 */
    public enum Action {
        OPEN, CLAIM, CLAIM_ALL, DELETE, DELETE_READ;

        /** 单封动作要求稳定邮件 ID，批量操作不提交任何邮件 ID。 */
        boolean requiresMail() {
            return this == OPEN || this == CLAIM || this == DELETE;
        }
    }

    /** 主界面列表字段，时间使用 Unix 秒，批量领取可结清没有附件的邮件。 */
    public record MailEntry(String id, String title, long createdAt, boolean read, boolean claimed,
                            boolean hasAttachments) {}

    /** 一次打开一封正文与附件配置，物品数量来自原信件。 */
    public record MailDetail(String id, String content, List<Reward> attachments) {}

    /** 最新信箱索引，正文仅在打开详情时交付。 */
    public record MailboxState(List<MailEntry> entries) {}

    /** 客户端只指定动作及邮件，不决定任何发放物品。 */
    public record Command(String requestId, Action action, String mailId) {}

    /** 业务回包核验请求编号，详情和奖励按本次动作返回。 */
    public record MailboxReceipt(String requestId, MailboxState state, MailDetail detail,
                                 RewardFeedbackService.Notice notice) {}

    /** 来信已登记；消息监听者仅在事务提交成功后向收件角色推送刷新。 */
    public record Changed(String roleId) {}

    /** 统一角色行充当邮箱操作与资产变更的写锁。 */
    private final RoleRepository roles;
    /** 信件和重复请求记录的共享仓储。 */
    private final MailRepository mail;
    /** 游戏时钟决定相对时间、过期和奖励生效。 */
    private final GameClock clock;
    /** 用已过关卡计算特殊邮件附件中的酒馆点数容量。 */
    private final MainChapterRules chapters;
    /** 通用奖励使用实际物品配置并通知资产变化。 */
    private final RewardGrantService grants;
    /** 奖励弹窗仅展示统一结算返回的实际到账内容。 */
    private final RewardFeedbackService feedback;
    /** 从持久回执恢复已提交的原始奖励。 */
    private final RewardReceiptPayloads receipts;
    /** 冻结正式附件并从原表读取清理天数。 */
    private final ObjectMapper json;
    /** 发信推送监听遵循数据库提交边界。 */
    private final ApplicationEventPublisher events;
    /** 原配置 mail_delete_day，已收邮件的保留天数。 */
    private final int retentionDays;

    /** 注入可信库存、章节、时钟及消息服务。 */
    MailService(RoleRepository roles, MailRepository mail, GameClock clock, MainChapterRules chapters,
                RewardGrantService grants, RewardFeedbackService feedback, RewardReceiptPayloads receipts,
                ObjectMapper json, ApplicationEventPublisher events) {
        this.roles = roles;
        this.mail = mail;
        this.clock = clock;
        this.chapters = chapters;
        this.grants = grants;
        this.feedback = feedback;
        this.receipts = receipts;
        this.json = json;
        this.events = events;
        retentionDays = readRetentionDays();
    }

    /** 原 system 表仍是邮件清理天数的唯一来源，缺失或非法则启动失败。 */
    private int readRetentionDays() {
        try (var input = getClass().getResourceAsStream("/gameplay/system.json")) {
            if (input != null) {
                for (var row : json.readTree(input).path("rows")) {
                    var value = row.path("value");
                    if (row.path("key").asString().equals("mail_delete_day") && value.isIntegralNumber()
                            && value.canConvertToInt() && value.asInt() > 0) {
                        return value.asInt();
                    }
                }
            }
        } catch (IOException error) {
            throw new IllegalStateException("邮件清理规则读取失败", error);
        }
        throw new IllegalStateException("邮件清理天数缺失或不合法");
    }

    /** 对当前收件角色读取尚可展示的标题与领取状态。 */
    @Transactional(readOnly = true)
    public MailboxState list(String roleId) {
        return new MailboxState(mail.list(roleId, cutoff(clock.epochSeconds())));
    }

    /**
     * 可信业务投递。调用方提供已经校验的系统标题、正文和物品配置，不暴露给玩家协议。
     * @return 新邮件标识，用于内部追踪；失败时不发推送。
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public String deliver(String roleId, String title, String content, List<Reward> attachments) {
        if (title == null || title.isBlank() || title.length() > 96 || content == null || content.length() > 8192
                || attachments == null || attachments.size() > MAX_ATTACHMENTS
                || attachments.stream().anyMatch(reward -> reward == null || reward.itemId() <= 0
                        || reward.quantity() <= 0 || reward.quantity() > MAX_SAFE_INTEGER)) {
            throw new IllegalArgumentException("系统邮件标题、正文或附件无效");
        }
        var frozen = List.copyOf(attachments);
        grants.requireSupported(frozen.stream().map(Reward::itemId).toList());
        roles.lock(roleId);
        long now = clock.epochSeconds();
        long cutoff = cutoff(now);
        mail.deleteExpired(roleId, cutoff);
        if (mail.list(roleId, cutoff).size() >= MAX_INBOX_SIZE) {
            throw failure("MAIL_FULL");
        }
        String id = UUID.randomUUID().toString();
        boolean hasAttachments = !frozen.isEmpty();
        var entry = new MailEntry(id, title, now, false, false, hasAttachments);
        mail.insert(roleId, entry, content, frozen.size(), json.writeValueAsString(frozen));
        events.publishEvent(new Changed(roleId));
        return id;
    }

    /** 阅读、领取与删除使用同角色写锁，重复请求只恢复原奖励。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public MailboxReceipt change(String roleId, Command command) {
        validate(command);
        roles.lock(roleId);
        long now = clock.epochSeconds();
        long cutoff = cutoff(now);
        var previous = mail.receipt(roleId, command.requestId());
        if (previous != null) {
            return replay(roleId, command, cutoff, previous);
        }
        var message = command.action().requiresMail() ? requireMessage(roleId, command.mailId(), cutoff) : null;
        MailDetail detail = null;
        RewardFeedbackService.Notice notice = null;
        switch (command.action()) {
            case OPEN -> {
                mail.mark(roleId, command.mailId(), message.entry().claimed());
                detail = detail(message);
            }
            case CLAIM -> {
                if (message.entry().claimed() || !message.entry().hasAttachments()) {
                    throw failure("MAIL_ALREADY_CLAIMED");
                }
                notice = claim(roleId, command.requestId(), now, List.of(message));
            }
            case CLAIM_ALL -> notice = claim(roleId, command.requestId(), now, mail.claimable(roleId));
            case DELETE -> {
                if (!message.entry().read() || !message.entry().claimed()) {
                    throw failure("MAIL_DELETE_BLOCKED");
                }
                mail.delete(roleId, command.mailId());
            }
            case DELETE_READ -> mail.deleteRead(roleId);
        }
        var frozen = notice == null ? null : receipts.freeze(notice);
        mail.save(roleId, command, frozen == null ? null : frozen.json(), frozen == null ? null : frozen.hash());
        return new MailboxReceipt(command.requestId(), new MailboxState(mail.list(roleId, cutoff)), detail, notice);
    }

    /** 按动作确认是否需要邮件编号，避免将批量操作与指定邮件混用。 */
    private static void validate(Command command) {
        if (command == null || command.action() == null || !RewardReceiptPayloads.validId(command.requestId())
                || (command.action().requiresMail() ? !RewardReceiptPayloads.validId(command.mailId()) : command.mailId() != null)) {
            throw failure("MAIL_INVALID");
        }
    }

    /** 拒绝已过期、不存在或归属其他角色的邮件，不泄露具体原因。 */
    private MailRepository.Message requireMessage(String roleId, String id, long cutoff) {
        var message = mail.find(roleId, id, cutoff);
        if (message == null) {
            throw failure("MAIL_NOT_FOUND");
        }
        return message;
    }

    /** 读取邮件正文和冻结附件；附件读取不受当前库存变动影响。 */
    private MailDetail detail(MailRepository.Message message) {
        return new MailDetail(message.entry().id(), message.content(), attachments(message));
    }

    /** 合并结算实际附件；按原版一键领取同时把纯文字邮件设为已读已收。 */
    private RewardFeedbackService.Notice claim(String roleId, String requestId, long now,
                                              List<MailRepository.Message> messages) {
        if (messages.isEmpty()) {
            return null;
        }
        var rewards = messages.stream().flatMap(message -> attachments(message).stream()).toList();
        for (var message : messages) {
            mail.mark(roleId, message.entry().id(), true);
        }
        if (rewards.isEmpty()) {
            return null;
        }
        long tavernLimit = chapters.tavernLimit(mail.maxCleared(roleId));
        var actual = grants.grant(roleId, rewards, new RewardGrantService.Context(now, tavernLimit),
            ThreadLocalRandom.current());
        return feedback.publish(UUID.randomUUID().toString(), roleId, roles.revision(roleId),
            RewardFeedbackService.Mode.POPUP, actual, requestId);
    }

    /** 读取邮件已冻结的原始奖励计划。 */
    private List<Reward> attachments(MailRepository.Message message) {
        return List.copyOf(Arrays.asList(json.readValue(message.attachments(), Reward[].class)));
    }

    /** 回包丢失后允许同命令恢复金币、物品及实际反馈，回执不产生再次发放。 */
    private MailboxReceipt replay(String roleId, Command command, long cutoff, MailRepository.Saved previous) {
        if (!command.action().name().equals(previous.action()) || !Objects.equals(command.mailId(), previous.mailId())) {
            throw failure("MAIL_REQUEST_CONFLICT");
        }
        var notice = previous.noticeJson() == null ? null
            : receipts.read(previous.noticeJson(), previous.noticeHash(), RewardFeedbackService.Notice.class);
        if (notice != null && (!roleId.equals(notice.roleId()) || !command.requestId().equals(notice.requestId())
                || !RewardReceiptPayloads.validId(notice.receiptId()) || notice.mode() != RewardFeedbackService.Mode.POPUP)) {
            throw new IllegalStateException("邮件历史发奖回执归属或类型无效");
        }
        var detail = command.action() == Action.OPEN ? detail(requireMessage(roleId, command.mailId(), cutoff)) : null;
        return new MailboxReceipt(command.requestId(), new MailboxState(mail.list(roleId, cutoff)), detail, notice);
    }

    /** 原规则按已收到邮件的发布时间计算七天保留期限。 */
    private long cutoff(long now) {
        return Instant.ofEpochSecond(now).atZone(ZONE).minusDays(retentionDays).toEpochSecond();
    }

    /** 明确业务拒绝，沿用现有协议错误映射。 */
    private static ResponseStatusException failure(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
