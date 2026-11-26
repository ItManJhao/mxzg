/**
 * 永恒梦境本服排行榜与每日名次奖励。确认胜场时在同一事务刷新历史最佳，
 * 上海零点的名次和奖励冻结后交给独立邮箱投递事务。
 */
package com.funsgamex.mxzg.dreamland;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.dreamland.DreamlandRankRepository.Best;
import com.funsgamex.mxzg.dreamland.DreamlandRankRepository.PrizeKey;
import com.funsgamex.mxzg.mail.MailService;
import com.funsgamex.mxzg.reward.RewardGrantService;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.reward.RewardReceiptPayloads;
import com.funsgamex.mxzg.role.RoleProfile;
import com.funsgamex.mxzg.role.RoleRepository;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DreamlandRankService {
    /** 排行和邮件截止沿用上海自然日。 */
    private static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");
    /** 旧榜展示本服前一百。 */
    private static final int BOARD_LIMIT = 100;
    /** 旧配置对本服前五十发放名次奖励。 */
    private static final int PRIZE_LIMIT = 50;
    /** 旧梦境邮件场景的简体标题。 */
    private static final String PRIZE_TITLE = "永恒梦境排名奖励";

    /** 校验排行榜请求的当前会话。 */
    private final SessionService sessions;
    /** 首次参与和榜外时读取自身角色的权威信息。 */
    private final RoleRepository roles;
    /** 保存本服排名和已冻结的邮件附件。 */
    private final DreamlandRankRepository repository;
    /** 确认新最高层时仍受梦境当前开放范围约束。 */
    private final DreamlandRules rules;
    /** 排序时间和自然日边界均使用游戏服时钟。 */
    private final GameClock clock;
    /** 奖励通过已有系统邮箱到达，领取继续沿用邮箱业务。 */
    private final MailService mail;
    /** 校验历史冻结附件以及整数范围，避免拿新配置重发。 */
    private final RewardReceiptPayloads payloads;
    /** 启动时校验且同源展示的原奖励档位列表。 */
    private final List<RankTier> tiers;

    /**
     * 榜单展示行，rank 为 0 表示未上榜，achievedAtSeconds 为 0 表示没有可用的达成时刻。
     * 角色战力采用当前主阵容，仅供展示。
     */
    public record RankEntry(String roleId, String name, int level, int headId, int headBorderId, long power,
                            int floor, int rank, long achievedAtSeconds) {}

    /** 名次范围包含首末端点，奖励由原策划表提供。 */
    public record RankTier(int minRank, int maxRank, List<Reward> rewards) {}

    /** 只交付本服前一百与本人行；resetAtSeconds 为下一上海零点的 Unix 秒。 */
    public record Ranking(List<RankEntry> entries, RankEntry own, List<RankTier> rewardTiers, long resetAtSeconds) {}

    /** 注入真实会话、排行榜游标、邮箱和发奖规则并验证档位合法性。 */
    DreamlandRankService(SessionService sessions, RoleRepository roles, DreamlandRankRepository repository,
                         DreamlandRules rules, GameClock clock, MailService mail, RewardReceiptPayloads payloads,
                         RewardGrantService grants) {
        this.sessions = sessions;
        this.roles = roles;
        this.repository = repository;
        this.rules = rules;
        this.clock = clock;
        this.mail = mail;
        this.payloads = payloads;
        this.tiers = rules.config().rankRewards().stream()
                .map(row -> new RankTier(row.minRank(), row.maxRank(), List.copyOf(row.rewards()))).toList();
        int first = 1;
        for (var tier : tiers) {
            if (tier.minRank() != first || tier.maxRank() < first || tier.maxRank() > PRIZE_LIMIT
                    || tier.rewards().isEmpty()) {
                throw new IllegalStateException("永恒梦境名次奖励区间无效");
            }
            first = tier.maxRank() + 1;
        }
        if (first != PRIZE_LIMIT + 1) {
            throw new IllegalStateException("永恒梦境名次奖励缺少档位");
        }
        grants.requireSupported(tiers.stream().flatMap(tier -> tier.rewards().stream()).map(Reward::itemId).toList());
    }

    /** 从同一数据库视图内读取本服榜单与自己资料，榜外保留历史最高层。 */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Ranking ranking(String token) {
        String roleId = sessions.requireRole(token);
        var profile = roles.findById(roleId).orElseThrow();
        if (profile.level() < rules.config().minimumLevel()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "DREAMLAND_LEVEL");
        }
        String serverId = profile.serverId();
        var rows = repository.board(serverId, BOARD_LIMIT);
        var entries = new ArrayList<RankEntry>(rows.size());
        RankEntry own = null;
        for (var row : rows) {
            var best = row.best();
            var entry = new RankEntry(best.roleId(), row.name(), row.level(), row.headId(), row.headBorderId(),
                    row.power(), best.floor(), entries.size() + 1, best.achievedAtSeconds());
            entries.add(entry);
            if (roleId.equals(best.roleId())) {
                own = entry;
            }
        }
        if (own == null) {
            var best = repository.best(serverId, roleId);
            var basics = profile.basics();
            own = new RankEntry(roleId, profile.nickname(), profile.level(), basics.headId(), basics.borderId(),
                    profile.power() == null ? 0 : profile.power(), best == null ? 0 : best.floor(),
                    0, best == null ? 0 : best.achievedAtSeconds());
        }
        return new Ranking(List.copyOf(entries), own, tiers, nextMidnight(clock.instant()));
    }

    /**
     * 由已持有角色锁的胜场事务调用。只有已确认的最高层可以进榜，
     * 排名锁内重新采样时钟并先冻结已到期榜单，晚到进度不会计入昨天。
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordBest(RoleProfile profile, int floor) {
        if (floor < 1 || floor > rules.maxFloor()) {
            throw new IllegalArgumentException("梦境历史最高层超出开放范围");
        }
        String serverId = profile.serverId();
        long due = repository.lockSchedule(serverId, nextMidnight(clock.instant()));
        Instant now = clock.instant();
        freezeDue(serverId, due, now);
        repository.saveBest(serverId, new Best(profile.id(), floor, now.getEpochSecond()));
    }

    /** 服务重启或本轮定时检查发现到期时间后，按区服单独冻结奖励。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    void settleServer(String serverId) {
        var due = repository.nextEnd(serverId);
        Instant now = clock.instant();
        if (due != null && due > now.getEpochSecond()) {
            return;
        }
        long lockedEnd = repository.lockSchedule(serverId, nextMidnight(now));
        freezeDue(serverId, lockedEnd, clock.instant());
    }

    /** 漏过零点时按旧服恢复最近一次结算；已经冻结的旧附件保留并通过原流水重试。 */
    private void freezeDue(String serverId, long due, Instant now) {
        if (due > now.getEpochSecond()) {
            return;
        }
        long cutoff = now.atZone(ZONE).toLocalDate().atStartOfDay(ZONE).toEpochSecond();
        var winners = repository.winners(serverId, cutoff, PRIZE_LIMIT);
        for (int index = 0; index < winners.size(); index++) {
            int rank = index + 1;
            var tier = tiers.stream().filter(row -> rank <= row.maxRank()).findFirst().orElseThrow();
            var key = new PrizeKey(serverId, cutoff, winners.get(index));
            repository.savePrize(key, rank, payloads.freeze(tier.rewards()));
        }
        repository.saveNextEnd(serverId, nextMidnight(now));
    }

    /** 查询可投递的少量奖励后逐条调用独立写事务，避免满信箱阻塞其他收件人。 */
    List<PrizeKey> pending(long now, int limit) {
        return repository.pending(now, limit);
    }

    /** 唯一流水行与邮件同事务提交，两台服务器并行恢复也不会重复投递。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    void deliver(PrizeKey key, long now) {
        var prize = repository.lockPrize(key);
        if (prize.mailId() == null && prize.retryAt() <= now) {
            var rewards = Arrays.asList(payloads.read(prize.awards().json(), prize.awards().hash(), Reward[].class));
            var date = Instant.ofEpochSecond(key.periodEnd() - 1).atZone(ZONE).toLocalDate();
            var message = "您在 " + date + " 永恒梦境通关排行榜获得第 " + prize.rank() + " 名，请领取排名奖励。";
            repository.markDelivered(key, mail.deliver(key.roleId(), PRIZE_TITLE, message, rewards));
        }
    }

    /** 投递事务已回滚后另行设置重试时间，已经送达的流水保持原状。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    void delay(PrizeKey key, long retryAt) {
        repository.delay(key, retryAt);
    }

    /** 上海自然日边界用时区计算，避免依赖宿主机设置。 */
    private static long nextMidnight(Instant now) {
        return now.atZone(ZONE).toLocalDate().plusDays(1).atStartOfDay(ZONE).toEpochSecond();
    }
}
