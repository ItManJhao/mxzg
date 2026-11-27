/**
 * 本机登录、角色、英雄与背包 Protobuf 二进制长连接：匿名选服、登录统一初始化、同角色连接替换和提交后资产同步。
 * 请求按连接及角色串行处理，业务尚未同步时拒绝访问；挂机领取由默认关闭的事务入口控制，历史回执可独立恢复。
 * 主线、英雄成长和新手赠礼走真实业务回执，开发GM保留原环境边界。
 * 公会操作可能同时更新两名玩家，提交后通知统一在发起者释放角色锁后交付。
 */
package com.funsgamex.mxzg.network;

import com.funsgamex.mxzg.arena.ArenaService;
import com.funsgamex.mxzg.arena.ArenaSeasonService;
import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.campaign.MainChapterFirstRewardService;
import com.funsgamex.mxzg.campaign.MainChapterQuickBattleService;
import com.funsgamex.mxzg.dungeon.DailyDungeonService;
import com.funsgamex.mxzg.dungeon.DailyDungeonType;
import com.funsgamex.mxzg.guild.GuildChanged;
import com.funsgamex.mxzg.guild.GuildDonationService;
import com.funsgamex.mxzg.guild.GuildRankingService;
import com.funsgamex.mxzg.guild.GuildService;
import com.funsgamex.mxzg.guild.GuildShopService;
import com.funsgamex.mxzg.guild.GuildTechnologyService;
import com.funsgamex.mxzg.vip.VipService;
import com.funsgamex.mxzg.quest.QuestChanged;
import com.funsgamex.mxzg.quest.QuestService;
import com.funsgamex.mxzg.rank.RankService;
import com.funsgamex.mxzg.friend.FriendChanged;
import com.funsgamex.mxzg.friend.FriendService;
import com.funsgamex.mxzg.chat.ChatChanged;
import com.funsgamex.mxzg.chat.ChatChannel;
import com.funsgamex.mxzg.chat.ChatService;
import com.funsgamex.mxzg.mail.MailService;
import com.funsgamex.mxzg.hero.HeroArtifactService;
import com.funsgamex.mxzg.hero.HeroEquipmentService;
import com.funsgamex.mxzg.hero.HeroMainPowerService;
import com.funsgamex.mxzg.hero.HeroGodEquipmentService;
import com.funsgamex.mxzg.hero.HeroGodEquipmentShopService;
import com.funsgamex.mxzg.hero.HeroJewelService;
import com.funsgamex.mxzg.hero.HeroStarService;
import com.funsgamex.mxzg.hero.HeroSummonService;
import com.funsgamex.mxzg.hero.HeroFragmentCombineService;
import com.funsgamex.mxzg.hero.HeroLevelService;
import com.funsgamex.mxzg.hero.HeroLockService;
import com.funsgamex.mxzg.lineup.Lineup;
import com.funsgamex.mxzg.market.MarketService;
import com.funsgamex.mxzg.blackmarket.BlackMarketService;
import com.funsgamex.mxzg.smith.SmithService;
import com.funsgamex.mxzg.role.RoleProfileService;
import com.funsgamex.mxzg.role.RoleService;
import com.funsgamex.mxzg.role.WelcomeGiftService;
import com.funsgamex.mxzg.time.GameClock;
import com.funsgamex.mxzg.tower.TowerService;
import com.funsgamex.mxzg.dreamland.DreamlandService;
import com.funsgamex.mxzg.dreamland.DreamlandRankService;
import com.funsgamex.mxzg.trial.TrialService;
import com.funsgamex.mxzg.trial.TrialShopService;
import com.funsgamex.mxzg.rainbow.RainbowCombat;
import com.funsgamex.mxzg.rainbow.RainbowService;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.ReentrantLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.*;
import tools.jackson.databind.*;

@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type = org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
@Profile("local & !production")
@ConditionalOnProperty(name = "mxzg.websocket.enabled", havingValue = "true")
public class GameSocketHandler extends BinaryWebSocketHandler implements SubProtocolCapable {
    private static final String UUID_PATTERN = "[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}";
    private static final int FRAME_LIMIT = GameProtocolCodec.FRAME_LIMIT;
    /** 本地身份提供方，生产环境不装配此处理器。 */
    private final com.funsgamex.mxzg.auth.DevelopmentLoginService login;
    /** 未登录选服也走二进制长连接。 */
    private final com.funsgamex.mxzg.server.ServerCatalog servers;
    /** 当前鉴权角色的本机 GM 服务。 */
    private final com.funsgamex.mxzg.gm.GmService gm;
    /** 游戏时间供鉴权、心跳回包和 GM 校准，连接超时仍使用单调计时。 */
    private final GameClock clock;
    /** 主线阵容保存事务，不恢复其他暂停玩法。 */
    private final com.funsgamex.mxzg.lineup.MainFormationCommandService formations;
    /** 开发只读试战，鉴权及真实阵容读取均在服务端完成。 */
    private final com.funsgamex.mxzg.hero.HeroLineupBattleService battles;
    /** 真实主线持久挑战与幂等结算，角色仅取自鉴权连接。 */
    private final com.funsgamex.mxzg.campaign.MainChapterService chapters;
    /** 挂机普攻演出，不进入主线结算服务。 */
    private final com.funsgamex.mxzg.campaign.MainChapterIdleBattleService idleBattles;
    /** 挂机消费及持久回执入口；数据库锁、幂等和实际发放均归该事务服务。 */
    private final com.funsgamex.mxzg.campaign.MainChapterIdleClaimService idleClaims;
    /** 快速战斗报价、次数、扣费和业务回执使用同一角色的持久事务。 */
    private final MainChapterQuickBattleService quickBattles;
    /** 里程碑稳定业务键的真实领取与只读回执，不接受客户端奖励计划。 */
    private final com.funsgamex.mxzg.campaign.MainChapterMilestoneService milestones;
    /** 普通单抽及旧首抽读写入口，角色来自连接凭证。 */
    private final HeroSummonService heroSummons;
    /** 独立通关奖励领取及按原绝对关卡号恢复。 */
    private final MainChapterFirstRewardService firstRewards;
    /** 精英碎片真实扣除、发放及按原请求恢复。 */
    private final HeroFragmentCombineService fragments;
    /** 普通升级按真实配置扣费和升级，提供同一角色的原收据。 */
    private final HeroLevelService heroLevels;
    /** 英雄锁定和解锁持久操作，角色归属由当前认证连接决定。 */
    private final HeroLockService heroLocks;
    /** 普通装备的真实扣还库存、槽位及原请求回执由英雄装备服务管理。 */
    private final HeroEquipmentService heroEquipment;
    /** 升星校验和消费材料在英雄升星事务中处理。 */
    private final HeroStarService heroStars;
    /** 宝石镶嵌、卸下和合成由同一个事务入口处理。 */
    private final HeroJewelService heroJewels;
    /** 神装穿戴和探宝的独立资产服务。 */
    private final HeroGodEquipmentService heroGodEquipment;
    /** 圣器激活、穿卸、升星和转换均在同一个资产事务入口提交。 */
    private final HeroArtifactService heroArtifacts;
    /** 神装定价、每日限购与真实发放由神装商店事务负责。 */
    private final HeroGodEquipmentShopService godEquipmentShop;
    /** 普通市场货架、购买与刷新均由当前角色的市场服务处理。 */
    private final MarketService market;
    /** 黑市货架和扣款由本模块服务处理，统一资产状态随事务提交后发送。 */
    private final BlackMarketService blackMarket;
    /** 装备合成预演与原请求号对应的持久结算。 */
    private final SmithService smith;
    /** 本区的公会列表和成员操作，所有写入都以当前连接的角色为发起人。 */
    private final GuildService guilds;
    /** 权威周货架与兑换事务。 */
    private final GuildShopService guildShop;
    /** 公会捐献、等级与宝箱事务。 */
    private final GuildDonationService guildDonations;
    /** 当前区服战力榜投影。 */
    private final GuildRankingService guildRanking;
    /** 公会科技的个人状态、升级与重置事务。 */
    private final GuildTechnologyService guildTechnology;
    /** 契约任务领取和 VIP 升档由同一个角色事务处理。 */
    private final VipService vip;
    /** 当前角色任务及成就的权威读取和领取服务。 */
    private final QuestService quests;
    /** 本服和跨服排行榜的权威读取及点赞入口。 */
    private final RankService rankings;
    /** 当前角色的邮件查询及处理入口。 */
    private final MailService mail;
    /** 好友关系、请求和礼物的权威入口。 */
    private final FriendService friends;
    /** 当前认证区服世界频道的查询、发送与已读操作。 */
    private final ChatService chat;
    /** 金币副本首关资格、真实挑战和清扫回执由原事务服务处理。 */
    private final DailyDungeonService dailyDungeon;
    /** 幻境之塔专用阵容、次数及实际结算由爬塔事务负责。 */
    private final TowerService tower;
    /** 梦境连战的权威状态、战报和实际结算。 */
    private final DreamlandService dreamland;
    /** 勇者试炼的角色资格、跨关生命、阵容和奖励统一由试炼事务处理。 */
    private final TrialService trial;
    /** 试炼固定货架购买使用认证角色、统一资产和独立持久回执。 */
    private final TrialShopService trialShop;
    /** 彩虹圣殿神位、挑战与本服战报事务入口。 */
    private final RainbowService rainbow;
    /** 彩虹圣殿独立阵容的读写入口。 */
    private final RainbowCombat rainbowCombat;
    /** 同服梦境通关排行与当日结算规则。 */
    private final DreamlandRankService dreamlandRank;
    /** 竞技场的对手、防守、门票、积分及历史战报。 */
    private final ArenaService arena;
    /** 本服赛季、排名、周宝箱和竞技商店。 */
    private final ArenaSeasonService arenaSeason;
    /** 首次命名与随机名由角色服务处理。 */
    private final RoleService roles;
    /** 当前鉴权角色的形象、称号和二次改名入口。 */
    private final RoleProfileService profiles;
    /** 同一角色只发一次新手赠礼，回包复用通用奖励通知。 */
    private final WelcomeGiftService welcomeGifts;
    private final SessionService sessions;
    private final SessionSnapshotService snapshots;
    /** 按现行连接角色计算布阵草稿的只读战力。 */
    private final HeroMainPowerService formationPower;
    private final ConcurrentMap<String, Connection> connections = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Connection> online = new ConcurrentHashMap<>();
    private final Semaphore capacity = new Semaphore(128);
    private final ReentrantLock[] roleLocks = new ReentrantLock[64];
    /** 跨角色业务的提交后通知，等当前请求释放角色锁再按目标发出。 */
    private final ThreadLocal<RoleNotifications> roleNotifications = new ThreadLocal<>();

    /** 各类快照与页面失效按目标去重，成就批次保留独立内容。 */
    private record RoleNotifications(Set<String> snapshots, Set<String> guildPages,
                                     List<QuestChanged> quests, Set<String> friendPages, Set<String> mailPages) {}

    private static final class Connection {
        final WebSocketSession socket;
        final ReentrantLock lock = new ReentrantLock();
        final long opened = System.nanoTime();
        volatile long lastActivity = opened;
        long rateWindow = opened;
        int rateCount;
        volatile String role;
        /** 从认证快照取得的区服，用于限制世界频道变更通知。 */
        String serverId;
        String token;
        /** 鉴权完成后可向其他角色公开在线状态；连接关闭另行核验。 */
        volatile boolean ready;

        /** 包装发送通道，限制并发发送缓冲；连接标识使用底层会话随机标识。 */
        Connection(WebSocketSession socket) {
            this.socket = new ConcurrentWebSocketSessionDecorator(socket, 5000, 262144);
        }
    }

    /** 注入认证快照及各领域服务，聊天与角色操作均由当前连接身份分派。 */
    public GameSocketHandler(SessionService sessions, SessionSnapshotService snapshots,
            com.funsgamex.mxzg.auth.DevelopmentLoginService login,
            com.funsgamex.mxzg.server.ServerCatalog servers, com.funsgamex.mxzg.gm.GmService gm,
            com.funsgamex.mxzg.lineup.MainFormationCommandService formations,
            com.funsgamex.mxzg.hero.HeroLineupBattleService battles,
            com.funsgamex.mxzg.campaign.MainChapterService chapters,
            com.funsgamex.mxzg.campaign.MainChapterIdleBattleService idleBattles,
            com.funsgamex.mxzg.campaign.MainChapterIdleClaimService idleClaims,
            MainChapterQuickBattleService quickBattles,
            com.funsgamex.mxzg.campaign.MainChapterMilestoneService milestones, HeroSummonService heroSummons,
            MainChapterFirstRewardService firstRewards, HeroFragmentCombineService fragments,
            HeroLevelService heroLevels, HeroLockService heroLocks, HeroEquipmentService heroEquipment,
            HeroStarService heroStars, HeroJewelService heroJewels, HeroGodEquipmentService heroGodEquipment,
            HeroArtifactService heroArtifacts, HeroGodEquipmentShopService godEquipmentShop,
            MarketService market, BlackMarketService blackMarket, SmithService smith, GuildService guilds,
            GuildShopService guildShop,
            GuildDonationService guildDonations, GuildRankingService guildRanking, GuildTechnologyService guildTechnology,
            VipService vip, QuestService quests,
            RankService rankings, MailService mail, FriendService friends, ChatService chat,
            DailyDungeonService dailyDungeon, TowerService tower, DreamlandService dreamland, DreamlandRankService dreamlandRank,
            TrialService trial, TrialShopService trialShop, ArenaService arena, ArenaSeasonService arenaSeason,
            RainbowService rainbow, RainbowCombat rainbowCombat,
            RoleService roles, RoleProfileService profiles, WelcomeGiftService welcomeGifts, GameClock clock,
            HeroMainPowerService formationPower) {
        this.firstRewards = firstRewards;
        this.fragments = fragments;
        this.heroLevels = heroLevels;
        this.heroLocks = heroLocks;
        this.heroEquipment = heroEquipment;
        this.heroStars = heroStars;
        this.heroJewels = heroJewels;
        this.heroGodEquipment = heroGodEquipment;
        this.heroArtifacts = heroArtifacts;
        this.godEquipmentShop = godEquipmentShop;
        this.market = market;
        this.blackMarket = blackMarket;
        this.smith = smith;
        this.guilds = guilds;
        this.guildShop = guildShop;
        this.guildDonations = guildDonations;
        this.guildRanking = guildRanking;
        this.guildTechnology = guildTechnology;
        this.vip = vip;
        this.quests = quests;
        this.rankings = rankings;
        this.mail = mail;
        this.friends = friends;
        this.chat = chat;
        this.dailyDungeon = dailyDungeon;
        this.tower = tower;
        this.dreamland = dreamland;
        this.dreamlandRank = dreamlandRank;
        this.trial = trial;
        this.trialShop = trialShop;
        this.rainbow = rainbow;
        this.rainbowCombat = rainbowCombat;
        this.arena = arena;
        this.arenaSeason = arenaSeason;
        this.roles = roles;
        this.profiles = profiles;
        this.welcomeGifts = welcomeGifts;
        this.milestones = milestones;
        this.heroSummons = heroSummons;
        this.idleClaims = idleClaims;
        this.quickBattles = quickBattles;
        this.idleBattles = idleBattles;
        this.chapters = chapters;
        this.battles = battles;
        this.formations = formations;
        this.gm = gm;
        this.clock = clock;
        this.sessions = sessions;
        this.snapshots = snapshots;
        this.formationPower = formationPower;
        this.login = login;
        this.servers = servers;
        Arrays.setAll(roleLocks, index -> new ReentrantLock());
    }

    /** 声明唯一二进制子协议；不协商旧 JSON 或自动回退。 */
    @Override public List<String> getSubProtocols() { return List.of(GameProtocolCodec.SUBPROTOCOL); }

    /** 限制总连接与入站消息大小；URL 不接受任何查询参数，防止凭证进入访问日志。 */
    @Override public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        if (!GameProtocolCodec.SUBPROTOCOL.equals(session.getAcceptedProtocol()) || session.getUri() == null || session.getUri().getRawQuery() != null || !capacity.tryAcquire()) {
            session.close(CloseStatus.POLICY_VIOLATION); return;
        }
        session.setTextMessageSizeLimit(FRAME_LIMIT);
        session.setBinaryMessageSizeLimit(FRAME_LIMIT);
        connections.put(session.getId(), new Connection(session));
    }

    /** 解析受限信封，匿名目录可列出个人实例；已登录业务按本机角色串行调度。 */
    @Override protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        Connection connection = connections.get(session.getId());
        if (connection == null) return;
        if (!awaitLock(connection.lock)) { close(connection, CloseStatus.POLICY_VIOLATION); return; }
        JsonNode request = null;
        try {
            long now = System.nanoTime();
            if (message.getPayloadLength() > FRAME_LIMIT
                || timedOut(connection, now)) {
                close(connection, CloseStatus.POLICY_VIOLATION); return;
            }
            if (now - connection.rateWindow >= TimeUnit.SECONDS.toNanos(1)) {
                connection.rateWindow = now; connection.rateCount = 0;
            }
            if (++connection.rateCount > 32) { close(connection, CloseStatus.POLICY_VIOLATION); return; }
            byte[] bytes = new byte[message.getPayloadLength()]; message.getPayload().get(bytes);
            request = GameProtocolCodec.decode(bytes);
            validateEnvelope(request);
            String name = request.path("name").asString();
            if (connection.role == null) {
                switch(name) {
                    case "servers.list" -> {
                        fields(request.path("body"), Set.of());
                        respond(connection, request, Map.of("items", servers.published()));
                    }
                    case "session.login", "session.authenticate" -> authenticate(connection,request);
                    default -> throw rejected("UNAUTHENTICATED");
                }
            } else {
                ReentrantLock roleLock = roleLock(connection.role);
                if (!awaitLock(roleLock)) throw rejected("BUSY");
                var notifications = name.equals("guild.change") || name.equals("guild.donation.donate")
                    || name.equals("friend.change") || name.startsWith("arena.") || name.startsWith("dreamland.")
                    || name.startsWith("trial.") || name.startsWith("rainbow.")
                    ? new RoleNotifications(new LinkedHashSet<>(), new LinkedHashSet<>(), new ArrayList<>(),
                        new LinkedHashSet<>(), new LinkedHashSet<>()) : null;
                if (notifications != null) {
                    roleNotifications.set(notifications);
                }
                try { dispatch(connection, request, name); }
                finally {
                    roleLock.unlock();
                    if (notifications != null) {
                        roleNotifications.remove();
                        notifications.snapshots().forEach(id -> assetsChanged(new AssetSyncService.Changed(id)));
                        notifications.guildPages().forEach(id -> notifyRolePage(id, "guild.updated"));
                        notifications.quests().forEach(this::questChanged);
                        notifications.friendPages().forEach(id -> notifyRolePage(id, "friend.changed"));
                        notifications.mailPages().forEach(id -> notifyRolePage(id, "mail.changed"));
                    }
                }
            }
            connection.lastActivity = now;
        } catch (com.funsgamex.mxzg.campaign.MainChapterIdleClaimService.Rejected error) {
            fail(connection, request, error.code(), error.getMessage(), error.retryable());
        } catch (ResponseStatusException error) {
            String code = error.getStatusCode().value() == 401 ? "UNAUTHENTICATED" : error.getReason();
            fail(connection, request, code == null ? "REQUEST_REJECTED" : code);
            if (connection.role == null || "UNAUTHENTICATED".equals(code) || "SESSION_REPLACED".equals(code)) {
                close(connection, CloseStatus.POLICY_VIOLATION);
            }
        } catch (IllegalArgumentException | com.google.protobuf.InvalidProtocolBufferException error) {
            fail(connection, request, "INVALID_MESSAGE"); close(connection, CloseStatus.BAD_DATA);
        } catch (Exception error) {
            // 不记录原始帧或异常消息，防止鉴权令牌进入日志；未知结果由客户端恢复同步。
            fail(connection, request, "INTERNAL_ERROR"); close(connection, CloseStatus.SERVER_ERROR);
        } finally { connection.lock.unlock(); }
    }

    /** 首帧登录或恢复后接管当前角色；个人服接管旧令牌前核对角色所属区服。 */
    private void authenticate(Connection connection, JsonNode request) throws IOException {
        JsonNode body = request.path("body");
        com.funsgamex.mxzg.auth.SessionService.IssuedSession issued=null;
        String accessToken;
        if(request.path("name").asString().equals("session.login")) {
            fields(body,Set.of("account","serverId","clientInstanceId"));
            text(body,"clientInstanceId",UUID_PATTERN);
            var result=login.login(text(body,"account","[a-z0-9_-]{3,32}"),text(body,"serverId","[a-z0-9_-]{1,32}"));
            issued=result.session(); accessToken=issued.accessToken();
        } else {
            fields(body, Set.of("accessToken", "clientInstanceId"));
            accessToken = text(body, "accessToken", "[A-Za-z0-9_-]{43}");
        }
        text(body, "clientInstanceId", UUID_PATTERN);
        String token = "Bearer " + accessToken;
        String role = sessions.requireRole(token);
        if (issued == null) {
            servers.requireResumableRole(role);
        }
        ReentrantLock roleLock = roleLock(role);
        if (!awaitLock(roleLock)) throw rejected("BUSY");
        try {
            snapshots.claim(token);
            connection.token = token; connection.role = role;
            Connection previous = online.put(role, connection);
            if (connections.get(connection.socket.getId()) != connection || !connection.socket.isOpen()) {
                online.remove(role, connection);
                // 关闭可能发生在数据库接管期间；仍须清理已经撤销凭证的旧连接。
                if (previous != null) close(previous, CloseStatus.POLICY_VIOLATION);
                return;
            }
            if (previous != null && previous != connection) {
                try { send(previous, Map.of("version", 1, "kind", "event", "name", "session.kicked",
                    "connectionId", previous.socket.getId(), "body", Map.of("code", "SESSION_REPLACED"))); }
                catch (IOException | RuntimeException ignored) { /* 旧通道可能已断开，不阻止新连接完成接管。 */ }
                finally { close(previous, CloseStatus.POLICY_VIOLATION); }
            }
            var accepted=new LinkedHashMap<String,Object>();
            accepted.put("connectionId",connection.socket.getId()); accepted.put("roleId",role); accepted.put("serverTimeMs",clock.millis());
            var initial = snapshots.snapshot(token);
            connection.serverId = initial.role().serverId();
            accepted.put("initial", initial);
            if(issued!=null) accepted.put("session",issued);
            respond(connection,request,accepted); connection.ready=true;
        } finally { roleLock.unlock(); }
    }

    /** 核对当前连接归属后分派业务协议，爬塔、竞技场及其他命令均使用鉴权角色。 */
    private void dispatch(Connection connection, JsonNode request, String name) throws IOException {
        if (online.get(connection.role) != connection) throw rejected("SESSION_REPLACED");
        if (!connection.role.equals(sessions.requireRole(connection.token))) throw rejected("UNAUTHENTICATED");
        if (!connection.socket.getId().equals(request.path("connectionId").asString(""))) throw rejected("SESSION_REPLACED");
        if (name.equals("role.name.random")) {
            fields(request.path("body"), Set.of());
            respond(connection, request, Map.of("nickname", roles.randomName(connection.token)));
            return;
        }
        if (name.equals("role.name.set")) {
            var body = request.path("body");
            fields(body, Set.of("nickname"));
            roles.setName(connection.token, body.path("nickname").asString());
            respond(connection, request, Map.of());
            return;
        }
        if (name.equals("role.image.list") || name.equals("role.image.change")
                || name.equals("role.titles.list") || name.equals("role.name.rename")) {
            personalSpace(connection, request, name);
            return;
        }
        if (name.equals("role.decorations.list") || name.equals("role.head.change") || name.equals("role.border.change")
                || name.equals("role.border.activate") || name.equals("role.peerage.display")) {
            decorations(connection, request, name);
            return;
        }
        if (name.equals("role.welcome.claim")) {
            fields(request.path("body"), Set.of());
            respond(connection, request, welcomeGifts.claim(connection.token));
            return;
        }
        if (name.equals("chapter.challenge") || name.equals("chapter.claim") || name.equals("chapter.replay")) {
            chapter(connection, request, name);
            return;
        }
        if (name.equals("chapter.idle.claim") || name.equals("chapter.idle.claim.status")) {
            idleClaim(connection, request, name);
            return;
        }
        if (name.equals("chapter.milestone.claim") || name.equals("chapter.milestone.claim.status")) {
            milestone(connection, request, name);
            return;
        }
        if (name.equals("hero.summon") || name.equals("hero.summon.normal") || name.equals("hero.summon.first")
                || name.equals("hero.summon.first.status")) {
            summon(connection, request, name);
            return;
        }
        if (name.equals("chapter.firstreward.claim") || name.equals("chapter.firstreward.claim.status")) {
            firstReward(connection, request, name.equals("chapter.firstreward.claim"));
            return;
        }
        if (name.equals("bag.fragment.combine") || name.equals("bag.fragment.combine.status")) {
            combineFragment(connection, request, name.equals("bag.fragment.combine"));
            return;
        }
        if (name.equals("hero.level.upgrade") || name.equals("hero.level.upgrade.status")) {
            heroLevel(connection, request, name.equals("hero.level.upgrade"));
            return;
        }
        if (name.equals("hero.stage.advance") || name.equals("hero.stage.advance.status")) {
            heroStage(connection, request, name.equals("hero.stage.advance"));
            return;
        }
        if (name.equals("hero.lock.set")) {
            setHeroLock(connection, request);
            return;
        }
        if (name.equals("hero.equipment.change")) {
            changeEquipment(connection, request);
            return;
        }
        if (name.equals("hero.star.upgrade") || name.equals("hero.jewel.change")
                || name.equals("hero.god-equipment.change") || name.equals("hero.god-equipment.draw")
                || name.equals("hero.artifact.change") || name.equals("hero.god-equipment.shop.buy")) {
            heroGrowth(connection, request, name);
            return;
        }
        if (name.equals("market.list") || name.equals("market.buy") || name.equals("market.refresh")) {
            market(connection, request, name);
            return;
        }
        if (name.equals("black-market.list") || name.equals("black-market.buy")) {
            blackMarket(connection, request, name.equals("black-market.list"));
            return;
        }
        if (name.equals("smith.preview") || name.equals("smith.forge") || name.equals("smith.forge.all")) {
            smith(connection, request, name);
            return;
        }
        if (name.equals("guild.list") || name.equals("guild.change")) {
            guild(connection, request, name);
            return;
        }
        switch (name) {
            case "guild.shop.list", "guild.shop.buy", "guild.donation.info", "guild.donation.donate",
                    "guild.donation.claim", "guild.ranking", "guild.technology.info", "guild.technology.upgrade",
                    "guild.technology.reset" -> {
                guildFeature(connection, request, name);
                return;
            }
            default -> { /* 其余已认证业务继续按现有入口分流。 */ }
        }
        if (name.equals("vip.claim")) {
            claimVipTask(connection, request);
            return;
        }
        if (name.equals("quest.list") || name.equals("quest.claim")) {
            questRequest(connection, request, name);
            return;
        }
        if (name.equals("ranking.overview") || name.equals("ranking.list") || name.equals("ranking.like")) {
            rankingRequest(connection, request, name);
            return;
        }
        switch (name) {
            case "mail.list", "mail.change", "friend.state", "friend.search", "friend.change" -> {
                socialRequest(connection, request, name);
                return;
            }
            default -> { /* 其余已认证业务继续按原入口处理。 */ }
        }
        switch (name) {
            case "chat.history", "chat.send", "chat.read", "chat.overview" -> {
                chatRequest(connection, request, name);
                return;
            }
            default -> { /* 其余已认证业务继续按原入口处理。 */ }
        }
        switch (name) {
            case "tower.state", "tower.formation.save", "tower.challenge", "tower.sweep", "tower.milestone.claim" -> {
                towerRequest(connection, request, name);
                return;
            }
            case "arena.state", "arena.refresh", "arena.challenge", "arena.replay", "arena.ticket.buy",
                 "arena.ranking", "arena.season", "arena.chest.claim", "arena.like", "arena.defense",
                 "arena.defense.save", "arena.shop", "arena.shop.buy" -> {
                arenaRequest(connection, request, name);
                return;
            }
            case "dreamland.state", "dreamland.act", "dreamland.assistance", "dreamland.ranking",
                 "dreamland.formation.power" -> {
                dreamlandRequest(connection, request, name);
                return;
            }
            case "trial.state", "trial.act", "trial.assistance" -> {
                trialRequest(connection, request, name);
                return;
            }
            case "trial.shop", "trial.shop.buy" -> {
                trialShopRequest(connection, request, name);
                return;
            }
            case "rainbow.state", "rainbow.lineup.save", "rainbow.challenge", "rainbow.history", "rainbow.replay" -> {
                rainbowRequest(connection, request, name);
                return;
            }
            case "chapter.quick-battle.info", "chapter.quick-battle.claim" -> {
                quickBattle(connection, request, name);
                return;
            }
        }
        var dungeonType = switch (name) {
            case "dungeon.gold.list", "dungeon.gold.challenge" -> DailyDungeonType.GOLD;
            case "dungeon.experience.list", "dungeon.experience.challenge" -> DailyDungeonType.EXPERIENCE;
            case "dungeon.hero.list", "dungeon.hero.challenge" -> DailyDungeonType.HERO;
            case "dungeon.fetter.list", "dungeon.fetter.challenge" -> DailyDungeonType.FETTER;
            case "dungeon.spirit.list", "dungeon.spirit.challenge" -> DailyDungeonType.SPIRIT;
            default -> null;
        };
        if (dungeonType != null) {
            dailyDungeon(connection, request, dungeonType, name.endsWith(".list"));
            return;
        }
        if (name.equals("chapter.idle.encounter")) {
            fields(request.path("body"), Set.of());
            try {
                var result = idleBattles.encounter(connection.token);
                respond(connection, request, Map.of("stage", result.stage(), "assetRevision", result.assetRevision(),
                    "lineupVersion", result.lineupVersion(), "replay", GameProtocolCodec.tree(com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils.encode(result.replay()))));
            } catch (IllegalArgumentException error) {
                throw rejected("CHAPTER_UNAVAILABLE");
            }
            return;
        }
        if (name.equals("battle.preview")) {
            if (!gm.enabled()) throw rejected("GM_DISABLED");
            var body = request.path("body");
            fields(body, Set.of("mission"));
            if (!body.path("mission").isIntegralNumber() || !body.path("mission").canConvertToInt()
                || body.path("mission").asInt() < 1) throw rejected("BATTLE_INVALID");
            int mission = body.path("mission").asInt();
            com.funsgamex.mxzg.hero.HeroLineupBattleService.Preview result;
            try {
                result = battles.preview(connection.token, mission,
                    rate -> ThreadLocalRandom.current().nextDouble() < rate);
            } catch (IllegalArgumentException error) {
                throw rejected(error.getMessage().contains("非空") ? "BATTLE_EMPTY" : "BATTLE_UNSUPPORTED");
            }
            var pending = new ArrayList<>(result.pending());
            pending.add("random_probability_pending_review");
            respond(connection, request, Map.of("mission", mission, "assetRevision", result.assetRevision(),
                "lineupVersion", result.lineupVersion(), "formationId", result.formationId(), "pending", pending,
                "replay", GameProtocolCodec.tree(com.funsgamex.mxzg.hero.HeroBattleReplayProtocolUtils.encode(result.battle()))));
            return;
        }
        if (name.startsWith("gm.")) {
            handleGm(connection, request, name);
            return;
        }
        if (name.equals("formation.power")) {
            formationPower(connection, request);
            return;
        }
        if (name.equals("formation.save")) {
            var body = request.path("body");
            fields(body, Set.of("requestId", "expectedVersion", "formationId", "slots"));
            if (!body.path("expectedVersion").canConvertToLong() || !body.path("formationId").canConvertToInt() ||
                    !body.path("slots").isArray() || body.path("slots").size() > 9) throw rejected("FORMATION_INVALID");
            var slots = new ArrayList<com.funsgamex.mxzg.lineup.Lineup.Slot>();
            for (var slot : body.path("slots")) {
                fields(slot, Set.of("position", "heroId"));
                if (!slot.path("position").canConvertToInt()) throw rejected("FORMATION_INVALID");
                slots.add(new com.funsgamex.mxzg.lineup.Lineup.Slot(slot.path("position").asInt(), text(slot, "heroId", ".{1,96}")));
            }
            respond(connection, request, formations.save(connection.token,
                new com.funsgamex.mxzg.lineup.MainFormationCommandService.Save(text(body, "requestId", UUID_PATTERN),
                    body.path("expectedVersion").asLong(), body.path("formationId").asInt(), slots)));
            return;
        }
        fields(request.path("body"), Set.of());
        switch (name) {

            case "session.heartbeat" -> respond(connection, request, Map.of("serverTimeMs", clock.millis()));

            default -> throw rejected("UNKNOWN_MESSAGE");
        }
    }

    /** 只收队伍草稿的实例列表，回显该列表和同次服务端评分。 */
    private void formationPower(Connection connection, JsonNode request) throws IOException {
        var body = request.path("body");
        fields(body, Set.of("requestId", "heroIds"));
        var heroes = body.path("heroIds");
        if (!heroes.isArray() || heroes.size() > HeroMainPowerService.MAX_DRAFT_HEROES) {
            throw rejected("FORMATION_POWER_INVALID");
        }
        var ids = new ArrayList<String>(heroes.size());
        for (var hero : heroes) {
            ids.add(hero.asString());
        }
        respond(connection, request, formationPower.previewDraft(connection.token, body.path("requestId").asString(), ids));
    }

    /** 查询当前角色报价，或提交一次报价凭据并回送冻结的实际发奖结果。 */
    private void quickBattle(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        try {
            if (name.equals("chapter.quick-battle.info")) {
                fields(body, Set.of());
                respond(connection, request, quickBattles.info(connection.role));
                return;
            }
            fields(body, Set.of("requestId", "resetAt", "usedCount"));
            String requestId = text(body, "requestId", UUID_PATTERN);
            long resetAt = operationAmount(body, "resetAt", "QUICK_BATTLE_REQUEST_INVALID");
            var used = body.path("usedCount");
            if (!used.isIntegralNumber() || !used.canConvertToInt() || used.asInt() < 0) {
                throw rejected("QUICK_BATTLE_REQUEST_INVALID");
            }
            respond(connection, request, quickBattles.claim(connection.role, requestId, resetAt, used.asInt()));
        } catch (MainChapterQuickBattleService.Rejected error) {
            fail(connection, request, error.code(), error.getMessage(), false);
        }
    }

    /** 解析个人空间的只读查询和变更请求，角色由已验证的会话决定。 */
    private void personalSpace(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        switch (name) {
            case "role.image.list" -> {
                fields(body, Set.of());
                respond(connection, request, Map.of("imageIds", profiles.images(connection.token)));
            }
            case "role.titles.list" -> {
                fields(body, Set.of());
                respond(connection, request, Map.of("titles", profiles.titles(connection.token)));
            }
            case "role.image.change" -> {
                fields(body, Set.of("imageId"));
                var image = body.path("imageId");
                if (!image.isIntegralNumber() || !image.canConvertToInt() || image.asInt() <= 0) {
                    throw rejected("ROLE_IMAGE_UNAVAILABLE");
                }
                profiles.changeImage(connection.token, image.asInt());
                respond(connection, request, Map.of());
            }
            case "role.name.rename" -> {
                fields(body, Set.of("nickname", "paymentType"));
                var payment = body.path("paymentType");
                if (!payment.isIntegralNumber() || !payment.canConvertToInt()) {
                    throw rejected("ROLE_RENAME_PAYMENT_INVALID");
                }
                profiles.rename(connection.token, body.path("nickname").asString(), payment.asInt());
                respond(connection, request, Map.of());
            }
            default -> throw rejected("UNKNOWN_MESSAGE");
        }
    }

    /** 查询或更新当前角色的装饰，并返回该角色最新的装饰资格。 */
    private void decorations(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        switch (name) {
            case "role.decorations.list" -> fields(body, Set.of());
            case "role.peerage.display" -> {
                fields(body, Set.of("visible"));
                if (!body.path("visible").isBoolean()) {
                    throw rejected("INVALID_MESSAGE");
                }
                profiles.setPeerageVisibility(connection.token, body.path("visible").asBoolean());
            }
            case "role.head.change", "role.border.change", "role.border.activate" -> {
                fields(body, Set.of("id"));
                var id = body.path("id");
                if (!id.isIntegralNumber() || !id.canConvertToInt() || id.asInt() < 0) {
                    throw rejected("INVALID_MESSAGE");
                }
                switch (name) {
                    case "role.head.change" -> profiles.changeHead(connection.token, id.asInt());
                    case "role.border.change" -> profiles.changeBorder(connection.token, id.asInt());
                    default -> profiles.activateBorder(connection.token, id.asInt());
                }
            }
            default -> throw rejected("UNKNOWN_MESSAGE");
        }
        respond(connection, request, profiles.decorations(connection.token));
    }

    /** 设置角色状态或开发实例游戏时间。仅开关查询在 GM 关闭时可调用。 */
    private void handleGm(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        if (name.equals("gm.status")) {
            fields(body, Set.of());
            respond(connection, request, Map.of("enabled", gm.enabled()));
            return;
        }
        if (!gm.enabled()) {
            throw rejected("GM_DISABLED");
        }
        switch (name) {
            case "gm.grant" -> {
                fields(body, Set.of("requestId", "kind", "configId", "quantity"));
                if (!body.path("configId").canConvertToInt() || !body.path("quantity").canConvertToInt()) {
                    throw rejected("GM_INVALID");
                }
                respond(connection, request, gm.grant(connection.token, text(body, "requestId", UUID_PATTERN),
                    text(body, "kind", "hero|item"), body.path("configId").asInt(), body.path("quantity").asInt()));
            }
            case "gm.level.set", "gm.chapter.set" -> {
                boolean roleLevel = name.equals("gm.level.set");
                String key = roleLevel ? "level" : "mission";
                fields(body, Set.of("requestId", key));
                var value = body.path(key);
                if (!value.canConvertToInt()) {
                    throw rejected(roleLevel ? "GM_INVALID_LEVEL" : "GM_INVALID_CHAPTER");
                }
                String requestId = text(body, "requestId", UUID_PATTERN);
                var result = roleLevel ? gm.setRoleLevel(connection.token, requestId, value.asInt())
                    : gm.setChapter(connection.token, requestId, value.asInt());
                respond(connection, request, Map.of("requestId", result.requestId(), key, result.value()));
            }
            case "gm.time.get" -> {
                fields(body, Set.of());
                respond(connection, request, clock.read());
            }
            case "gm.time.set" -> {
                fields(body, Set.of("unixSeconds"));
                var value = body.path("unixSeconds");
                if (!value.canConvertToLong()) {
                    throw rejected("GM_INVALID_TIME");
                }
                GameClock.Reading reading;
                try {
                    long seconds = value.asLong();
                    reading = seconds == 0 ? clock.reset() : clock.setEpochSeconds(seconds);
                } catch (IllegalArgumentException error) {
                    throw rejected("GM_INVALID_TIME");
                }
                respond(connection, request, reading);
            }
            default -> throw rejected("UNKNOWN_MESSAGE");
        }
    }

    /**
     * 挂机命令仅接收业务请求键和显式安全消费版本，角色和收益由锁内事务决定。
     * status只读指定回执；数据库锁超时明确返回忙，其他存储故障交统一异常边界，不伪装成未提交。
     */
    private void idleClaim(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        boolean claim = name.equals("chapter.idle.claim");
        fields(body, claim ? Set.of("requestId", "expectedOperationVersion") : Set.of("requestId"));
        String requestId = text(body, "requestId", UUID_PATTERN);
        long expectedVersion = 0;
        if (claim) {
            var version = body.path("expectedOperationVersion");
            if (!version.isIntegralNumber() || !version.canConvertToLong()
                    || version.asLong() <= 0 || version.asLong() > 9_007_199_254_740_991L) {
                throw rejected("IDLE_INVALID");
            }
            expectedVersion = version.asLong();
        }
        try {
            Object result = claim
                ? idleClaims.claim(connection.token, requestId, expectedVersion)
                : idleClaims.status(connection.token, requestId);
            respond(connection, request, result);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "IDLE_BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 里程碑只接收原配置正ID；业务拒绝保留连接，锁忙明确可重试且不伪装为未发奖。 */
    private void milestone(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        fields(body, Set.of("rewardId"));
        var id = body.path("rewardId");
        if (!id.isIntegralNumber() || !id.canConvertToInt() || id.asInt() <= 0) {
            fail(connection, request, "MILESTONE_INVALID", "通关奖励编号无效", false);
            return;
        }
        try {
            Object result = name.equals("chapter.milestone.claim")
                    ? milestones.claim(connection.token, id.asInt()) : milestones.status(connection.token, id.asInt());
            respond(connection, request, result);
        } catch (com.funsgamex.mxzg.campaign.MainChapterMilestoneService.Rejected error) {
            fail(connection, request, error.code(), error.getMessage(), false);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "MILESTONE_BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 读取统一召唤请求的池、次数和已确认钻石上限；旧单抽继续回放原回执。 */
    private void summon(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        boolean general = name.equals("hero.summon");
        fields(body, general ? Set.of("requestId", "pool", "count", "maxDiamonds") : Set.of("requestId"));
        String requestId = body.path("requestId").asString();
        try {
            Object result = switch (name) {
                case "hero.summon" -> heroSummons.draw(connection.token, requestId,
                    com.funsgamex.mxzg.hero.HeroSummonRules.Pool.valueOf(body.path("pool").asString()),
                    body.path("count").asInt(), body.path("maxDiamonds").asLong(0L));
                case "hero.summon.normal" -> heroSummons.summon(connection.token, requestId);
                case "hero.summon.first" -> heroSummons.first(connection.token, requestId);
                default -> heroSummons.status(connection.token, requestId);
            };
            respond(connection, request, result);
        } catch (HeroSummonService.Rejected error) {
            fail(connection, request, error.code(), error.getMessage(), false);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "SUMMON_BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 只接收绝对关卡号，发奖资格及配置由服务端事务判定。 */
    private void firstReward(Connection connection, JsonNode request, boolean claim) throws IOException {
        var body = request.path("body");
        fields(body, Set.of("chapter"));
        try {
            int chapter = body.path("chapter").asInt();
            Object result = claim ? firstRewards.claim(connection.token, chapter) : firstRewards.status(connection.token, chapter);
            respond(connection, request, result);
        } catch (MainChapterFirstRewardService.Rejected error) {
            fail(connection, request, error.code(), error.getMessage(), false);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "FIRST_REWARD_BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 合成只传消耗物品、次数与业务键；恢复只传原业务键，不接受发奖结果或角色ID。 */
    private void combineFragment(Connection connection, JsonNode request, boolean combine) throws IOException {
        var body = request.path("body");
        fields(body, combine ? Set.of("requestId", "itemId", "quantity") : Set.of("requestId"));
        String requestId = body.path("requestId").asString();
        try {
            Object result;
            if (combine) {
                var parameters = new HeroFragmentCombineService.Request(requestId,
                        body.path("itemId").asInt(), body.path("quantity").asInt());
                result = fragments.combine(connection.token, parameters);
            } else {
                result = fragments.status(connection.token, requestId);
            }
            respond(connection, request, result);
        } catch (HeroFragmentCombineService.Rejected error) {
            fail(connection, request, error.code(), error.getMessage(), false);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "FRAGMENT_BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 只接收原 UUID、实例、前置等级及升级级数；库存和等级仍由统一快照提供。 */
    private void heroLevel(Connection connection, JsonNode request, boolean upgrade) throws IOException {
        var body = request.path("body");
        fields(body, upgrade ? Set.of("requestId", "heroId", "expectedLevel", "levels") : Set.of("requestId"));
        try {
            String requestId = body.path("requestId").asString();
            if (!upgrade) {
                respond(connection, request, heroLevels.status(connection.token, requestId));
                return;
            }
            var expected = body.path("expectedLevel");
            var levels = body.path("levels");
            if (!expected.isIntegralNumber() || !expected.canConvertToInt()
                    || !levels.isIntegralNumber() || !levels.canConvertToInt()) {
                throw rejected("INVALID_UPGRADE_REQUEST");
            }
            var parameters = new HeroLevelService.Request(requestId, expected.asInt(), levels.asInt());
            respond(connection, request, heroLevels.upgrade(connection.token, body.path("heroId").asString(), parameters));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "HERO_UPGRADE_BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 进阶接收实例与预期阶级，恢复只按原 UUID 查询已提交收据。 */
    private void heroStage(Connection connection, JsonNode request, boolean advance) throws IOException {
        var body = request.path("body");
        fields(body, advance ? Set.of("requestId", "heroId", "expectedStage") : Set.of("requestId"));
        try {
            String requestId = body.path("requestId").asString();
            if (!advance) {
                respond(connection, request, heroLevels.stageStatus(connection.token, requestId));
                return;
            }
            var expected = body.path("expectedStage");
            if (!expected.isIntegralNumber() || !expected.canConvertToInt()) {
                throw rejected("INVALID_HERO_STAGE_REQUEST");
            }
            var parameters = new HeroLevelService.StageRequest(requestId, body.path("heroId").asString(),
                    expected.asInt());
            respond(connection, request, heroLevels.advanceStage(connection.token, parameters));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "HERO_UPGRADE_BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 校验本次设值，成功回包确认原请求；当前英雄锁定状态随统一快照更新。 */
    private void setHeroLock(Connection connection, JsonNode request) throws IOException {
        var body = request.path("body");
        fields(body, Set.of("requestId", "heroId", "locked"));
        String requestId = text(body, "requestId", UUID_PATTERN);
        String heroId = text(body, "heroId", UUID_PATTERN);
        if (!body.path("locked").isBoolean()) {
            throw rejected("INVALID_HERO_LOCK_REQUEST");
        }
        try {
            respond(connection, request, heroLocks.set(connection.token, requestId, heroId, body.path("locked").asBoolean()));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "HERO_LOCK_BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 装备命令只接收当前选择，回包返回原因或成功回执；最新槽位仍使用统一快照。 */
    private void changeEquipment(Connection connection, JsonNode request) throws IOException {
        var body = request.path("body");
        HeroEquipmentService.Action action;
        try {
            action = HeroEquipmentService.Action.valueOf(body.path("action").asString());
        } catch (IllegalArgumentException error) {
            throw rejected("INVALID_EQUIPMENT_REQUEST");
        }
        fields(body, switch (action) {
            case EQUIP -> Set.of("requestId", "heroId", "action", "equipmentId");
            case UNEQUIP -> Set.of("requestId", "heroId", "action", "equipmentId", "slot", "expectedTemplateId");
            case EQUIP_ALL, UNEQUIP_ALL -> Set.of("requestId", "heroId", "action");
        });
        var parameters = new HeroEquipmentService.Request(body.path("requestId").asString(),
                body.path("heroId").asString(), action, body.path("equipmentId").asString(null),
                body.path("slot").asInt(), body.path("expectedTemplateId").asInt());
        try {
            respond(connection, request, heroEquipment.change(connection.token, parameters));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "HERO_EQUIPMENT_BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 按养成协议交给对应事务；持久数据只通过原统一快照发布。 */
    private void heroGrowth(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        try {
            Object receipt = switch (name) {
                case "hero.star.upgrade" -> upgradeHeroStar(connection.token, body);
                case "hero.jewel.change" -> changeHeroJewel(connection.token, body);
                case "hero.god-equipment.change" -> changeHeroGodEquipment(connection.token, body);
                case "hero.artifact.change" -> changeHeroArtifact(connection.token, body);
                case "hero.god-equipment.shop.buy" -> buyGodEquipment(connection.token, body);
                case "hero.god-equipment.draw" -> {
                    fields(body, Set.of("requestId", "count", "maxDiamonds"));
                    yield heroGodEquipment.draw(connection.token, new HeroGodEquipmentService.DrawRequest(
                            body.path("requestId").asString(), body.path("count").asInt(),
                            body.path("maxDiamonds").asLong()));
                }
                default -> throw rejected("INVALID_MESSAGE");
            };
            respond(connection, request, receipt);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "HERO_GROWTH_BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 按配置行读取玩家选择的素材；资产归属、资格和替代价格统一由领域服务核查。 */
    private HeroStarService.Receipt upgradeHeroStar(String token, JsonNode body) {
        fields(body, Set.of("requestId", "heroId", "expectedStar", "materials"));
        var rows = body.path("materials");
        if (!rows.isArray() || rows.size() > 12) {
            throw rejected("INVALID_HERO_STAR_REQUEST");
        }
        var materials = new ArrayList<HeroStarService.Materials>();
        for (var row : rows) {
            fields(row, Set.of("row", "heroIds", "useReplacement"));
            var ids = row.path("heroIds");
            if (!ids.isArray() || ids.size() > 30) {
                throw rejected("INVALID_HERO_STAR_REQUEST");
            }
            var heroes = new ArrayList<String>();
            for (var id : ids) {
                heroes.add(id.asString());
            }
            materials.add(new HeroStarService.Materials(row.path("row").asInt(), heroes,
                    row.path("useReplacement").asBoolean()));
        }
        return heroStars.upgrade(token, new HeroStarService.Request(body.path("requestId").asString(),
                body.path("heroId").asString(), body.path("expectedStar").asInt(), materials));
    }

    /** 解析宝石操作，一键合成可绑定玩家已确认的持久资产版本。 */
    private HeroJewelService.Receipt changeHeroJewel(String token, JsonNode body) {
        fields(body, Set.of("requestId", "heroId", "action", "itemId", "slot", "expectedItemId", "count",
                "expectedRevision"));
        HeroJewelService.Action action;
        try {
            action = HeroJewelService.Action.valueOf(body.path("action").asString());
        } catch (IllegalArgumentException error) {
            throw rejected("INVALID_HERO_JEWEL_REQUEST");
        }
        Long expectedRevision = body.has("expectedRevision")
                ? operationAmount(body, "expectedRevision", "INVALID_HERO_JEWEL_REQUEST") : null;
        return heroJewels.change(token, new HeroJewelService.Request(body.path("requestId").asString(),
                body.path("heroId").asString(null), action, body.path("itemId").asInt(), body.path("slot").asInt(),
                body.path("expectedItemId").asInt(), body.path("count").asInt(), expectedRevision));
    }

    /** 神装穿脱使用实例字符串和期望槽内实例，禁止以配置号替代实例。 */
    private HeroGodEquipmentService.Receipt changeHeroGodEquipment(String token, JsonNode body) {
        fields(body, Set.of("requestId", "heroId", "slot", "action", "instanceId", "expectedInstanceId"));
        HeroGodEquipmentService.Action action;
        try {
            action = HeroGodEquipmentService.Action.valueOf(body.path("action").asString());
        } catch (IllegalArgumentException error) {
            throw rejected("INVALID_GOD_EQUIPMENT_REQUEST");
        }
        return heroGodEquipment.change(token, new HeroGodEquipmentService.Request(body.path("requestId").asString(),
                body.path("heroId").asString(), body.path("slot").asInt(), action,
                body.path("instanceId").asString(null), body.path("expectedInstanceId").asString(null)));
    }

    /** 圣器操作只读取玩家选择的实例，槽位归属和所有消耗由服务端复核。 */
    private HeroArtifactService.Receipt changeHeroArtifact(String token, JsonNode body) {
        fields(body, Set.of("requestId", "heroId", "slot", "action", "instanceId", "expectedInstanceId",
                "targetTemplateId", "materialInstanceIds", "materialHeroIds", "replacementItemIds"));
        HeroArtifactService.Action action;
        try {
            action = HeroArtifactService.Action.valueOf(body.path("action").asString());
        } catch (IllegalArgumentException error) {
            throw rejected("INVALID_HERO_ARTIFACT_REQUEST");
        }
        var artifactIds = artifactMaterialIds(body.path("materialInstanceIds"));
        var heroIds = artifactMaterialIds(body.path("materialHeroIds"));
        var replacement = body.path("replacementItemIds");
        if (!replacement.isArray() || replacement.size() > 12) {
            throw rejected("INVALID_HERO_ARTIFACT_REQUEST");
        }
        var replacementIds = new ArrayList<Integer>();
        for (var id : replacement) {
            if (id.asInt() <= 0) {
                throw rejected("INVALID_HERO_ARTIFACT_REQUEST");
            }
            replacementIds.add(id.asInt());
        }
        return heroArtifacts.change(token, new HeroArtifactService.Request(text(body, "requestId", UUID_PATTERN),
                text(body, "heroId", UUID_PATTERN), body.path("slot").asInt(), action,
                body.path("instanceId").asString(null), body.path("expectedInstanceId").asString(null),
                body.path("targetTemplateId").asInt(), artifactIds, heroIds, replacementIds));
    }

    /** 拒绝形状不正确或过大的圣器素材选择，不接受配置号替代实例 ID。 */
    private List<String> artifactMaterialIds(JsonNode values) {
        if (!values.isArray() || values.size() > 12) {
            throw rejected("INVALID_HERO_ARTIFACT_REQUEST");
        }
        var ids = new ArrayList<String>();
        for (var value : values) {
            var id = value.asString();
            if (!id.matches(UUID_PATTERN)) {
                throw rejected("INVALID_HERO_ARTIFACT_REQUEST");
            }
            ids.add(id);
        }
        return ids;
    }

    /** 购买只传商品、数量和已见日周期，价格和开服条件在交易内读取。 */
    private HeroGodEquipmentShopService.Receipt buyGodEquipment(String token, JsonNode body) {
        fields(body, Set.of("requestId", "productId", "count", "resetAt"));
        return godEquipmentShop.buy(token, new HeroGodEquipmentShopService.BuyRequest(
                text(body, "requestId", UUID_PATTERN), body.path("productId").asInt(),
                body.path("count").asInt(), body.path("resetAt").asLong()));
    }

    /** 市场命令只接收玩家选择，价格、数量限制和角色归属由已鉴权的市场事务确定。 */
    private void market(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        if (name.equals("market.list")) {
            fields(body, Set.of());
            respond(connection, request, market.list(connection.token));
            return;
        }
        boolean buy = name.equals("market.buy");
        fields(body, buy ? Set.of("requestId", "shelfVersion", "productId", "count")
                : Set.of("requestId", "shelfVersion"));
        long shelfVersion = body.path("shelfVersion").asLong();
        int productId = body.path("productId").asInt();
        int count = body.path("count").asInt();
        if (shelfVersion <= 0 || shelfVersion > 9_007_199_254_740_991L || (buy && (productId <= 0 || count <= 0))) {
            throw rejected("INVALID_MARKET_REQUEST");
        }
        String requestId = text(body, "requestId", UUID_PATTERN);
        try {
            var result = buy ? market.buy(connection.token, requestId, shelfVersion, productId, count)
                    : market.refresh(connection.token, requestId, shelfVersion);
            respond(connection, request, result);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 由认证连接执行装备合成，配方成本和批量预演均由服务端决定。 */
    private void smith(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        String code = "INVALID_SMITH_REQUEST";
        try {
            var result = switch (name) {
                case "smith.preview" -> {
                    fields(body, Set.of("slot"));
                    yield smith.preview(connection.token, operationIndex(body, "slot", code));
                }
                case "smith.forge" -> {
                    fields(body, Set.of("requestId", "itemId", "count"));
                    yield smith.forge(connection.token, text(body, "requestId", UUID_PATTERN),
                            operationIndex(body, "itemId", code), operationIndex(body, "count", code));
                }
                case "smith.forge.all" -> {
                    fields(body, Set.of("requestId", "slot", "expectedRevision"));
                    yield smith.forgeAll(connection.token, text(body, "requestId", UUID_PATTERN),
                            operationIndex(body, "slot", code), operationAmount(body, "expectedRevision", code));
                }
                default -> throw rejected(code);
            };
            respond(connection, request, result);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 按连接身份查看已到期的黑市货架，购买只接受已看版本、配置商品和次数。 */
    private void blackMarket(Connection connection, JsonNode request, boolean list) throws IOException {
        var body = request.path("body");
        String code = "INVALID_BLACK_MARKET_REQUEST";
        fields(body, list ? Set.of("shopType") : Set.of("requestId", "shopType", "shelfVersion", "productId", "count"));
        int shopType = operationIndex(body, "shopType", code);
        try {
            if (list) {
                respond(connection, request, blackMarket.list(connection.token, shopType));
                return;
            }
            long shelfVersion = operationAmount(body, "shelfVersion", code);
            if (shelfVersion == 0) {
                throw rejected(code);
            }
            respond(connection, request, blackMarket.buy(connection.token, text(body, "requestId", UUID_PATTERN),
                    shopType, shelfVersion, operationIndex(body, "productId", code),
                    operationIndex(body, "count", code)));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /**
     * 复用两类副本的查询与结算协议。角色由连接确定，副本类型由协议入口决定。
     * 客户端只选择关卡并确认扫荡和价格。
     */
    private void dailyDungeon(Connection connection, JsonNode request, DailyDungeonType type, boolean list)
            throws IOException {
        var body = request.path("body");
        try {
            if (list) {
                fields(body, Set.of());
                respond(connection, request, dailyDungeon.current(connection.token, type));
                return;
            }
            fields(body, Set.of("requestId", "stageId", "sweep", "maxDiamonds"));
            long maxDiamonds = body.path("maxDiamonds").asLong();
            var stage = body.path("stageId");
            if (!body.path("sweep").isBoolean() || !body.path("maxDiamonds").isIntegralNumber()
                    || !body.path("maxDiamonds").canConvertToLong()
                    || (!stage.isMissingNode() && (!stage.isIntegralNumber() || !stage.canConvertToInt() || stage.asInt() < 1))
                    || maxDiamonds < 0 || maxDiamonds > 9_007_199_254_740_991L) {
                throw rejected("DUNGEON_REQUEST_INVALID");
            }
            var result = dailyDungeon.challenge(connection.token, type,
                    text(body, "requestId", UUID_PATTERN), stage.asInt(1), body.path("sweep").asBoolean(), maxDiamonds);
            var response = new LinkedHashMap<String, Object>();
            response.put("requestId", result.requestId());
            response.put("roleId", result.roleId());
            response.put("assetRevision", result.assetRevision());
            response.put("battleId", result.battleId());
            response.put("won", result.won());
            response.put("sweep", result.sweep());
            response.put("state", result.state());
            if (result.replay() != null) {
                response.put("replay", GameProtocolCodec.tree(result.replay()));
            }
            if (result.actual() != null) {
                response.put("actual", result.actual());
            }
            respond(connection, request, response);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 爬塔仅接收格位、目标层或里程碑及确认报价，所有实际挑战与发奖由角色事务完成。 */
    private void towerRequest(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        try {
            if (name.equals("tower.state")) {
                fields(body, Set.of());
                respond(connection, request, tower.current(connection.token));
                return;
            }
            if (name.equals("tower.formation.save")) {
                fields(body, Set.of("expectedVersion", "formationId", "slots"));
                var slots = body.path("slots");
                if (!slots.isArray() || slots.size() > 9) {
                    throw rejected("TOWER_REQUEST_INVALID");
                }
                var lineup = new ArrayList<Lineup.Slot>();
                for (JsonNode slot : slots) {
                    fields(slot, Set.of("position", "heroId"));
                    lineup.add(new Lineup.Slot(operationIndex(slot, "position", "TOWER_REQUEST_INVALID"),
                        text(slot, "heroId", UUID_PATTERN)));
                }
                respond(connection, request, tower.saveFormation(connection.token,
                    operationAmount(body, "expectedVersion", "TOWER_REQUEST_INVALID"),
                    operationIndex(body, "formationId", "TOWER_REQUEST_INVALID"), lineup));
                return;
            }
            var result = switch (name) {
                case "tower.challenge" -> {
                    fields(body, Set.of("requestId", "floor"));
                    yield tower.challenge(connection.token, text(body, "requestId", UUID_PATTERN),
                        operationIndex(body, "floor", "TOWER_REQUEST_INVALID"));
                }
                case "tower.sweep" -> {
                    fields(body, Set.of("requestId", "floor", "maxDiamonds"));
                    yield tower.sweep(connection.token, text(body, "requestId", UUID_PATTERN),
                        operationIndex(body, "floor", "TOWER_REQUEST_INVALID"),
                        operationAmount(body, "maxDiamonds", "TOWER_REQUEST_INVALID"));
                }
                case "tower.milestone.claim" -> {
                    fields(body, Set.of("requestId", "milestoneId"));
                    yield tower.claimMilestone(connection.token, text(body, "requestId", UUID_PATTERN),
                        operationIndex(body, "milestoneId", "TOWER_REQUEST_INVALID"));
                }
                default -> throw rejected("TOWER_REQUEST_INVALID");
            };
            var response = new LinkedHashMap<String, Object>();
            response.put("requestId", result.requestId());
            response.put("roleId", result.roleId());
            response.put("assetRevision", result.assetRevision());
            response.put("action", result.action().name());
            response.put("floor", result.floor());
            response.put("won", result.won());
            response.put("state", result.state());
            if (result.replay() != null) {
                response.put("replay", GameProtocolCodec.tree(result.replay()));
            }
            if (result.actual() != null) {
                response.put("actual", result.actual());
            }
            respond(connection, request, response);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 查询或变更当前角色的梦境。校验操作专属字段，服务器计算楼层、阵容和奖品。 */
    private void dreamlandRequest(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        String code = "DREAMLAND_REQUEST_INVALID";
        try {
            if (name.equals("dreamland.formation.power")) {
                fields(body, Set.of("requestId", "expectedVersion", "formationId", "slots"));
                respond(connection, request, dreamland.previewFormationPower(connection.token,
                        text(body, "requestId", UUID_PATTERN), operationAmount(body, "expectedVersion", code),
                        operationIndex(body, "formationId", code), dreamlandFormationSlots(body.path("slots"))));
                return;
            }
            if (!name.equals("dreamland.act")) {
                fields(body, Set.of());
                Object state = switch (name) {
                    case "dreamland.state" -> dreamlandState(dreamland.state(connection.token));
                    case "dreamland.assistance" -> dreamland.assistance(connection.token);
                    case "dreamland.ranking" -> dreamlandRank.ranking(connection.token);
                    default -> throw rejected(code);
                };
                respond(connection, request, state);
                return;
            }
            String action = text(body, "action",
                "START|SELECT_BUFF|NEXT|END|CLAIM|SAVE_FORMATION|DISPATCH_ASSIST|SELECT_ASSIST|CLEAR_ASSIST");
            var allowed = switch (action) {
                case "SELECT_BUFF", "CLAIM" -> Set.of("requestId", "expectedVersion", "action", "choice", "slots");
                case "SAVE_FORMATION" -> Set.of("requestId", "expectedVersion", "action", "formationId", "slots");
                case "DISPATCH_ASSIST", "SELECT_ASSIST" -> Set.of("requestId", "expectedVersion", "action", "targetId", "slots");
                default -> Set.of("requestId", "expectedVersion", "action", "slots");
            };
            fields(body, allowed);
            boolean savesFormation = action.equals("SAVE_FORMATION");
            var lineup = dreamlandFormationSlots(body.path("slots"));
            if (!savesFormation && !lineup.isEmpty()) {
                throw rejected(code);
            }
            var result = dreamland.act(connection.token, new DreamlandService.Command(
                text(body, "requestId", UUID_PATTERN), operationAmount(body, "expectedVersion", code), action,
                allowed.contains("choice") ? operationIndex(body, "choice", code) : 0,
                savesFormation ? operationIndex(body, "formationId", code) : 0, lineup,
                allowed.contains("targetId") ? text(body, "targetId", UUID_PATTERN) : null));
            var response = new LinkedHashMap<String, Object>();
            response.put("requestId", result.requestId());
            response.put("roleId", result.roleId());
            response.put("assetRevision", result.assetRevision());
            response.put("action", result.action());
            response.put("state", dreamlandState(result.state()));
            if (result.actual() != null) {
                response.put("actual", result.actual());
            }
            respond(connection, request, response);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 只解析梦境允许的普通站位；具体阵型和可选英雄归梦境领域校验。 */
    private static List<Lineup.Slot> dreamlandFormationSlots(JsonNode slots) {
        String code = "DREAMLAND_REQUEST_INVALID";
        if (!slots.isArray() || slots.size() > 8) {
            throw rejected(code);
        }
        var lineup = new ArrayList<Lineup.Slot>(slots.size());
        for (JsonNode slot : slots) {
            fields(slot, Set.of("position", "heroId"));
            lineup.add(new Lineup.Slot(operationIndex(slot, "position", code), text(slot, "heroId", UUID_PATTERN)));
        }
        return lineup;
    }

    /** 梦境战报使用协议描述符转换，避免把 Protobuf 内部字段写入网络回包。 */
    private static Map<String, Object> dreamlandState(DreamlandService.State state) {
        var result = new LinkedHashMap<String, Object>();
        result.put("version", state.version());
        result.put("minimumLevel", state.minimumLevel());
        result.put("maxFloor", state.maxFloor());
        result.put("startFloor", state.startFloor());
        result.put("currentFloor", state.currentFloor());
        result.put("highestFloor", state.highestFloor());
        result.put("todayHighestFloor", state.todayHighestFloor());
        result.put("todayRewardFloor", state.todayRewardFloor());
        result.put("challengeCount", state.challengeCount());
        result.put("phase", state.phase().name());
        result.put("deadlineSeconds", state.deadlineSeconds());
        result.put("resetAtSeconds", state.resetAtSeconds());
        result.put("activeBuffId", state.activeBuffId());
        result.put("buffs", state.buffs());
        result.put("slots", state.slots());
        result.put("formationId", state.formationId());
        result.put("pendingRewards", state.pendingRewards());
        result.put("milestones", state.milestones());
        if (state.assistance() != null) {
            result.put("assistance", state.assistance());
        }
        if (state.battle() != null) {
            var battle = state.battle();
            result.put("battle", Map.of(
                "battleId", battle.battleId(), "floor", battle.floor(), "won", battle.won(),
                "replay", GameProtocolCodec.tree(battle.replay())));
        }
        return result;
    }

    /** 读取同一认证角色的货架或确认当前报价，拒绝客户端传入价格、奖励或角色。 */
    private void trialShopRequest(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        if (name.equals("trial.shop")) {
            fields(body, Set.of());
            respond(connection, request, trialShop.list(connection.role));
            return;
        }
        fields(body, Set.of("requestId", "offerId", "count", "refreshAt"));
        String code = "TRIAL_SHOP_REQUEST_INVALID";
        var buy = new TrialShopService.BuyRequest(text(body, "requestId", UUID_PATTERN),
                operationIndex(body, "offerId", code), operationIndex(body, "count", code),
                operationAmount(body, "refreshAt", code));
        try {
            respond(connection, request, trialShop.buy(connection.role, buy));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException failure) {
            fail(connection, request, "BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 校验试炼动作的专用入参并使用原会话完成查询、挑战与领取。 */
    private void trialRequest(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        String code = "TRIAL_REQUEST_INVALID";
        try {
            if (!name.equals("trial.act")) {
                fields(body, Set.of());
                respond(connection, request, name.equals("trial.state")
                        ? trialState(trial.state(connection.token)) : trial.assistance(connection.token));
                return;
            }
            String action = text(body, "action",
                    "selectDifficulty|saveFormation|fight|claim|revive|dispatchAssist|selectAssist|cancelAssist");
            var allowed = new HashSet<>(Set.of("requestId", "expectedVersion", "action", "slots", "heroIds"));
            boolean hasChoice = Set.of("selectDifficulty", "fight", "claim").contains(action);
            boolean savesFormation = action.equals("saveFormation");
            boolean hasTarget = Set.of("dispatchAssist", "selectAssist", "cancelAssist").contains(action);
            if (hasChoice) {
                allowed.add("choice");
            }
            if (savesFormation) {
                allowed.add("formationId");
            }
            if (hasTarget) {
                allowed.add("targetId");
            }
            fields(body, allowed);
            var slots = body.path("slots");
            if (!slots.isArray() || slots.size() > 8) {
                throw rejected(code);
            }
            var lineup = new ArrayList<Lineup.Slot>(slots.size());
            for (var slot : slots) {
                fields(slot, Set.of("position", "heroId"));
                lineup.add(new Lineup.Slot(operationIndex(slot, "position", code),
                        text(slot, "heroId", UUID_PATTERN)));
            }
            var ids = body.path("heroIds");
            if (!ids.isArray() || ids.size() > 6) {
                throw rejected(code);
            }
            var heroIds = new ArrayList<String>(ids.size());
            for (var id : ids) {
                if (!id.isString() || !id.asString().matches(UUID_PATTERN)) {
                    throw rejected(code);
                }
                heroIds.add(id.asString());
            }
            var result = trial.act(connection.token, new TrialService.Command(
                    text(body, "requestId", UUID_PATTERN), operationAmount(body, "expectedVersion", code), action,
                    hasChoice ? operationIndex(body, "choice", code) : 0,
                    savesFormation ? operationIndex(body, "formationId", code) : 0, lineup,
                    hasTarget ? text(body, "targetId", UUID_PATTERN) : null, heroIds));
            var response = new LinkedHashMap<String, Object>();
            response.put("requestId", result.requestId());
            response.put("roleId", result.roleId());
            response.put("assetRevision", result.assetRevision());
            response.put("action", result.action());
            response.put("state", trialState(result.state()));
            if (result.actual() != null) {
                response.put("actual", result.actual());
            }
            respond(connection, request, response);
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException failure) {
            fail(connection, request, "BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 将可空的原生成战报通过描述符写回 Protobuf，不把内部对象属性串给协议层。 */
    private static Map<String, Object> trialState(TrialService.State state) {
        var result = new LinkedHashMap<String, Object>();
        result.put("version", state.version());
        result.put("minimumLevel", state.minimumLevel());
        result.put("resetAtSeconds", state.resetAtSeconds());
        result.put("difficulty", state.difficulty());
        result.put("maxDifficulty", state.maxDifficulty());
        result.put("completedDifficulty", state.completedDifficulty());
        result.put("currentNode", state.currentNode());
        result.put("reviveUsed", state.reviveUsed());
        result.put("reviveLimit", state.reviveLimit());
        if (state.reviveCost() != null) {
            result.put("reviveCost", state.reviveCost());
        }
        result.put("formationId", state.formationId());
        result.put("slots", state.slots());
        result.put("nodes", state.nodes());
        result.put("heroHealth", state.heroHealth());
        result.put("todayRewards", state.todayRewards());
        result.put("difficulties", state.difficulties());
        if (state.battle() != null) {
            var battle = state.battle();
            result.put("battle", Map.of("battleId", battle.battleId(), "node", battle.node(), "won", battle.won(),
                    "replay", GameProtocolCodec.tree(battle.replay())));
        }
        return result;
    }

    /** 校验彩虹圣殿协议字段并调用已鉴权事务；战报以现有 Protobuf 结构编码。 */
    private void rainbowRequest(Connection connection, JsonNode request, String name) throws IOException {
        String invalid = "RAINBOW_REQUEST_INVALID";
        var body = request.path("body");
        try {
            switch (name) {
                case "rainbow.state" -> {
                    fields(body, Set.of());
                    respond(connection, request, rainbow.state(connection.token));
                }
                case "rainbow.lineup.save" -> {
                    fields(body, Set.of("requestId", "expectedVersion", "formationId", "slots"));
                    var slots = body.path("slots");
                    if (!slots.isArray() || slots.size() > 9) {
                        throw rejected(invalid);
                    }
                    var lineup = new ArrayList<Lineup.Slot>();
                    for (JsonNode slot : slots) {
                        fields(slot, Set.of("position", "heroId"));
                        lineup.add(new Lineup.Slot(operationIndex(slot, "position", invalid),
                                text(slot, "heroId", UUID_PATTERN)));
                    }
                    respond(connection, request, rainbowCombat.saveFormation(connection.token,
                            text(body, "requestId", UUID_PATTERN), operationAmount(body, "expectedVersion", invalid),
                            operationIndex(body, "formationId", invalid), lineup));
                }
                case "rainbow.challenge" -> {
                    fields(body, Set.of("requestId", "seatId", "evolution", "expectedLineupVersion"));
                    var outcome = rainbow.challenge(connection.token, text(body, "requestId", UUID_PATTERN),
                            operationIndex(body, "seatId", invalid), operationIndex(body, "evolution", invalid),
                            operationAmount(body, "expectedLineupVersion", invalid));
                    respond(connection, request, Map.of("requestId", outcome.requestId(), "state", outcome.state(),
                            "battleId", outcome.battleId(), "replay", GameProtocolCodec.tree(outcome.replay()),
                            "won", outcome.won(), "seatId", outcome.seatId(), "evolution", outcome.evolution()));
                }
                case "rainbow.history" -> {
                    fields(body, Set.of("seatId"));
                    respond(connection, request, rainbow.history(connection.token, operationIndex(body, "seatId", invalid)));
                }
                case "rainbow.replay" -> {
                    fields(body, Set.of("seatId", "battleId"));
                    respond(connection, request, GameProtocolCodec.tree(rainbow.replay(connection.token,
                            operationIndex(body, "seatId", invalid), text(body, "battleId", UUID_PATTERN))));
                }
                default -> throw rejected(invalid);
            }
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "神位争夺进行中，请稍后重试", true);
        }
    }

    /** 竞技场路由校验参数并使用现行会话，攻防、赛季结算和回执由对应事务处理。 */
    private void arenaRequest(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        try {
            switch (name) {
                case "arena.state", "arena.refresh" -> {
                    fields(body, Set.of());
                    respond(connection, request, name.equals("arena.state")
                        ? arena.current(connection.token) : arena.refresh(connection.token));
                }
                case "arena.challenge" -> {
                    fields(body, Set.of("requestId", "opponentId", "opponentRoleId"));
                    String targetRole = body.has("opponentRoleId") ? text(body, "opponentRoleId", UUID_PATTERN) : null;
                    long targetIndex = operationAmount(body, "opponentId", "ARENA_REQUEST_INVALID");
                    if (targetIndex > Integer.MAX_VALUE || (targetIndex == 0) != (targetRole != null)) {
                        throw rejected("ARENA_REQUEST_INVALID");
                    }
                    var result = arena.challenge(connection.token, text(body, "requestId", UUID_PATTERN),
                        (int) targetIndex, targetRole);
                    var response = new LinkedHashMap<String, Object>();
                    response.put("requestId", result.requestId());
                    response.put("roleId", result.roleId());
                    response.put("assetRevision", result.assetRevision());
                    response.put("record", result.record());
                    response.put("replay", GameProtocolCodec.tree(result.replay()));
                    response.put("state", result.state());
                    if (result.actual() != null) {
                        response.put("actual", result.actual());
                    }
                    respond(connection, request, response);
                }
                case "arena.replay" -> {
                    fields(body, Set.of("battleId"));
                    respond(connection, request, GameProtocolCodec.tree(
                        arena.replay(connection.token, text(body, "battleId", UUID_PATTERN))));
                }
                case "arena.ticket.buy" -> {
                    fields(body, Set.of("requestId", "quantity"));
                    respond(connection, request, arena.buyTickets(connection.token, text(body, "requestId", UUID_PATTERN),
                        operationIndex(body, "quantity", "ARENA_REQUEST_INVALID")));
                }
                case "arena.ranking" -> {
                    fields(body, Set.of());
                    respond(connection, request, arenaSeason.ranking(connection.token));
                }
                case "arena.season" -> {
                    fields(body, Set.of());
                    respond(connection, request, arenaSeason.current(connection.token));
                }
                case "arena.chest.claim" -> {
                    fields(body, Set.of("requestId", "chestId", "seasonEndsAt"));
                    respond(connection, request, arenaSeason.claimChest(connection.token,
                        text(body, "requestId", UUID_PATTERN), operationIndex(body, "chestId", "ARENA_REQUEST_INVALID"),
                        operationAmount(body, "seasonEndsAt", "ARENA_REQUEST_INVALID")));
                }
                case "arena.like" -> {
                    fields(body, Set.of("requestId", "targetRoleId", "dailyEndsAt"));
                    respond(connection, request, arenaSeason.like(connection.token, text(body, "requestId", UUID_PATTERN),
                        text(body, "targetRoleId", UUID_PATTERN), operationAmount(body, "dailyEndsAt", "ARENA_REQUEST_INVALID")));
                }
                case "arena.defense" -> {
                    fields(body, Set.of());
                    respond(connection, request, arena.defense(connection.token));
                }
                case "arena.defense.save" -> {
                    fields(body, Set.of("requestId", "expectedVersion", "formationId", "slots"));
                    var slots = body.path("slots");
                    if (!slots.isArray() || slots.size() > 9) {
                        throw rejected("ARENA_REQUEST_INVALID");
                    }
                    var lineup = new ArrayList<Lineup.Slot>();
                    for (JsonNode slot : slots) {
                        fields(slot, Set.of("position", "heroId"));
                        lineup.add(new Lineup.Slot(operationIndex(slot, "position", "ARENA_REQUEST_INVALID"),
                            text(slot, "heroId", UUID_PATTERN)));
                    }
                    respond(connection, request, arena.saveDefense(connection.token, text(body, "requestId", UUID_PATTERN),
                        operationAmount(body, "expectedVersion", "ARENA_REQUEST_INVALID"),
                        operationIndex(body, "formationId", "ARENA_REQUEST_INVALID"), lineup));
                }
                case "arena.shop" -> {
                    fields(body, Set.of());
                    respond(connection, request, arenaSeason.shop(connection.token));
                }
                case "arena.shop.buy" -> {
                    fields(body, Set.of("requestId", "offerId", "quantity", "refreshAt"));
                    respond(connection, request, arenaSeason.buy(connection.token, text(body, "requestId", UUID_PATTERN),
                        operationIndex(body, "offerId", "ARENA_REQUEST_INVALID"),
                        operationIndex(body, "quantity", "ARENA_REQUEST_INVALID"),
                        operationAmount(body, "refreshAt", "ARENA_REQUEST_INVALID")));
                }
                default -> throw rejected("ARENA_REQUEST_INVALID");
            }
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 校验请求中的正整数关卡、目标、格位或数量，拒绝超过领域整型的值。 */
    private static int operationIndex(JsonNode body, String key, String code) {
        var value = body.path(key);
        if (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() < 1) {
            throw rejected(code);
        }
        return value.asInt();
    }

    /** 校验版本或报价是两端均能精确表示的非负整数。 */
    private static long operationAmount(JsonNode body, String key, String code) {
        var value = body.path(key);
        if (!value.isIntegralNumber() || !value.canConvertToLong()
                || value.asLong() < 0 || value.asLong() > 9_007_199_254_740_991L) {
            throw rejected(code);
        }
        return value.asLong();
    }

    /** 查询使用本区公会，创建可选择徽章。成员身份、资格及费用由领域服务判断。 */
    private void guild(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        if (name.equals("guild.list")) {
            fields(body, Set.of("query", "page"));
            var query = body.path("query").asString("");
            respond(connection, request, guilds.list(connection.role, query, body.path("page").asInt(1)));
            return;
        }
        fields(body, Set.of("requestId", "action", "guildId", "applicantId", "name", "description", "badgeId"));
        var requestId = text(body, "requestId", UUID_PATTERN);
        GuildService.Action action;
        try {
            action = GuildService.Action.valueOf(body.path("action").asString(""));
        } catch (IllegalArgumentException error) {
            throw rejected("GUILD_REQUEST_INVALID");
        }
        var command = new GuildService.Command(requestId, action, body.path("guildId").asString(null),
            body.path("applicantId").asString(null), body.path("name").asString(null),
            body.path("description").asString(null), body.has("badgeId") ? body.path("badgeId").asInt() : null);
        try {
            respond(connection, request, guilds.change(connection.role, command));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "公会数据正忙，请稍后重试", true);
        }
    }

    /** 公会功能使用当前连接身份，兑换、捐献和科技各自校验其报价与操作版本。 */
    private void guildFeature(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        try {
            switch (name) {
                case "guild.shop.list" -> {
                    fields(body, Set.of());
                    respond(connection, request, guildShop.list(connection.role));
                }
                case "guild.shop.buy" -> {
                    fields(body, Set.of("requestId", "guildId", "productId", "count", "resetAtSeconds"));
                    var code = "GUILD_SHOP_REQUEST_INVALID";
                    var buy = new GuildShopService.BuyRequest(text(body, "requestId", UUID_PATTERN),
                        text(body, "guildId", UUID_PATTERN), operationIndex(body, "productId", code),
                        operationIndex(body, "count", code), operationAmount(body, "resetAtSeconds", code));
                    respond(connection, request, guildShop.buy(connection.role, buy));
                }
                case "guild.donation.info" -> {
                    fields(body, Set.of());
                    respond(connection, request, guildDonations.info(connection.role));
                }
                case "guild.donation.donate", "guild.donation.claim" -> {
                    fields(body, Set.of("requestId", "guildId", "resetAt", "optionId"));
                    var code = "GUILD_DONATION_REQUEST_INVALID";
                    var command = new GuildDonationService.Command(text(body, "requestId", UUID_PATTERN),
                        text(body, "guildId", UUID_PATTERN), operationAmount(body, "resetAt", code),
                        operationIndex(body, "optionId", code));
                    respond(connection, request, name.equals("guild.donation.donate")
                        ? guildDonations.donate(connection.role, command) : guildDonations.claim(connection.role, command));
                }
                case "guild.ranking" -> {
                    fields(body, Set.of());
                    respond(connection, request, guildRanking.list(connection.role));
                }
                case "guild.technology.info" -> {
                    fields(body, Set.of());
                    respond(connection, request, guildTechnology.info(connection.role));
                }
                case "guild.technology.upgrade", "guild.technology.reset" -> {
                    fields(body, Set.of("requestId", "profession", "expectedVersion"));
                    var code = "GUILD_TECHNOLOGY_REQUEST_INVALID";
                    var command = new GuildTechnologyService.Command(text(body, "requestId", UUID_PATTERN),
                            operationIndex(body, "profession", code), operationAmount(body, "expectedVersion", code));
                    respond(connection, request, name.equals("guild.technology.upgrade")
                            ? guildTechnology.upgrade(connection.role, command) : guildTechnology.reset(connection.role, command));
                }
                default -> throw rejected("GUILD_REQUEST_INVALID");
            }
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "公会数据正忙，请稍后重试", true);
        }
    }

    /** 邮件和好友只对当前鉴权角色操作，公开搜索仅投影当前在线推荐和同服匹配。 */
    private void socialRequest(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        try {
            switch (name) {
                case "mail.list" -> {
                    fields(body, Set.of());
                    respond(connection, request, mail.list(connection.role));
                }
                case "mail.change" -> {
                    fields(body, Set.of("requestId", "action", "mailId"));
                    var action = MailService.Action.valueOf(text(body, "action", "OPEN|CLAIM|CLAIM_ALL|DELETE|DELETE_READ"));
                    var id = body.has("mailId") ? text(body, "mailId", UUID_PATTERN) : null;
                    var command = new MailService.Command(text(body, "requestId", UUID_PATTERN), action, id);
                    respond(connection, request, mail.change(connection.role, command));
                }
                case "friend.state" -> {
                    fields(body, Set.of());
                    respond(connection, request, friends.state(connection.role));
                }
                case "friend.search" -> {
                    fields(body, Set.of("query"));
                    var query = text(body, "query", "[^\\p{Cntrl}]{0,80}").strip();
                    var targets = query.isEmpty() ? onlineFriendCandidates() : Set.<String>of();
                    respond(connection, request, friends.search(connection.role, query, targets));
                }
                case "friend.change" -> {
                    fields(body, Set.of("requestId", "action", "targetId", "resetAt"));
                    var action = FriendService.Action.valueOf(text(body, "action",
                            "APPLY|ACCEPT|REJECT|REMOVE|BLOCK|UNBLOCK|SEND|SEND_ALL|CLAIM|CLAIM_ALL"));
                    var target = body.has("targetId") ? text(body, "targetId", UUID_PATTERN) : null;
                    var command = new FriendService.Command(text(body, "requestId", UUID_PATTERN), action,
                            target, operationAmount(body, "resetAt", "FRIEND_INVALID"));
                    respond(connection, request, friends.change(connection.role, command));
                }
                default -> throw rejected("INVALID_MESSAGE");
            }
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "社交数据正忙，请稍后重试", true);
        }
    }

    /** 复制当前连接候选，仅用于空查询推荐，区服及资格仍由好友领域校验。 */
    private Set<String> onlineFriendCandidates() {
        long now = System.nanoTime();
        return online.entrySet().stream().filter(entry -> {
            var connection = entry.getValue();
            return connection.ready && connection.socket.isOpen() && !timedOut(connection, now);
        }).map(Map.Entry::getKey).collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    /** 通过当前鉴权角色处理各频道的历史、发言和已读，编号按精确十进制字符串传输。 */
    private void chatRequest(Connection connection, JsonNode request, String name) throws IOException {
        JsonNode body = request.path("body");
        ChatChannel channel = chatChannel(body);
        String peer = body.has("peerRoleId") ? text(body, "peerRoleId", UUID_PATTERN) : null;
        switch (name) {
            case "chat.history" -> {
                fields(body, Set.of("afterId", "beforeId", "channel", "peerRoleId"));
                if (body.has("afterId") && body.has("beforeId")) {
                    throw rejected("CHAT_INVALID");
                }
                long afterId = body.has("afterId") ? chatCursor(body, "afterId") : 0;
                long beforeId = body.has("beforeId") ? chatCursor(body, "beforeId") : 0;
                if (body.has("beforeId") && beforeId == 0) {
                    throw rejected("CHAT_INVALID");
                }
                respond(connection, request, chatHistory(chat.history(connection.role, channel, peer, afterId, beforeId)));
            }
            case "chat.send" -> {
                fields(body, Set.of("requestId", "text", "channel", "peerRoleId"));
                String requestId = text(body, "requestId", UUID_PATTERN);
                if (!body.path("text").isString() || body.path("text").asString().length() > 408) {
                    throw rejected("CHAT_CONTENT_TOO_LONG");
                }
                var message = chat.send(connection.role, channel, peer, requestId, body.path("text").asString());
                Map<String, Object> receipt = new LinkedHashMap<>();
                receipt.put("requestId", requestId);
                receipt.put("message", chatMessage(message));
                if (peer != null) {
                    receipt.put("peerRoleId", peer);
                }
                respond(connection, request, receipt);
            }
            case "chat.read" -> {
                fields(body, Set.of("throughId", "channel", "peerRoleId"));
                respond(connection, request, chatHistory(chat.read(connection.role, channel, peer,
                        chatCursor(body, "throughId"))));
            }
            case "chat.overview" -> {
                fields(body, Set.of());
                respond(connection, request, chatOverview(chat.overview(connection.role)));
            }
            default -> throw rejected("INVALID_MESSAGE");
        }
    }

    /** 省略频道继续使用世界频道，明确传入的频道号必须在协议约定范围内。 */
    private static ChatChannel chatChannel(JsonNode body) {
        if (!body.has("channel")) {
            return ChatChannel.WORLD;
        }
        var channel = body.path("channel");
        if (!channel.isIntegralNumber() || !channel.canConvertToInt()) {
            throw rejected("CHAT_INVALID");
        }
        return ChatChannel.fromWire(channel.asInt());
    }

    /** 校验可重放的十进制游标，拒绝前导零与超出存储范围的值。 */
    private static long chatCursor(JsonNode body, String field) {
        String value = text(body, field, "0|[1-9][0-9]{0,18}");
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException overflow) {
            throw rejected("CHAT_INVALID");
        }
    }

    /** 投影按授权范围读取的聊天页与已读状态，缺少权限的范围不提供范围标识。 */
    private static Map<String, Object> chatHistory(ChatService.History result) {
        Map<String, Object> body = new LinkedHashMap<>(Map.of(
            "messages", result.messages().stream().map(GameSocketHandler::chatMessage).toList(),
            "latestId", Long.toString(result.latestId()), "readThroughId", Long.toString(result.readThroughId()),
            "unreadCount", result.unreadCount(), "hasMore", result.hasMore(),
            "hasNewer", result.hasNewer(), "canSend", result.canSend(), "channel", result.channel().wireId()));
        if (result.peerRoleId() != null) {
            body.put("peerRoleId", result.peerRoleId());
        }
        if (result.scopeId() != null) {
            body.put("scopeId", result.scopeId());
        }
        return body;
    }

    /** 只交付可见房间的显示资料、频道和纯文本。系统发送人编号为空。 */
    private static Map<String, Object> chatMessage(ChatService.Message message) {
        Map<String, Object> body = new LinkedHashMap<>(Map.of("id", Long.toString(message.id()),
            "roleId", message.roleId(), "name", message.name(),
            "avatarId", message.avatarId(), "borderId", message.borderId(), "level", message.level(),
            "text", message.text(), "sentAtSeconds", message.sentAtSeconds(), "channel", message.channel().wireId(),
            "serverId", message.serverId()));
        if (message.noticeId() > 0) {
            body.put("noticeId", message.noticeId());
        }
        return body;
    }

    /** 投影各频道权限、未读计数及当前可读的好友会话。 */
    private static Map<String, Object> chatOverview(ChatService.Overview overview) {
        return Map.of("channels", overview.channels().stream().map(row -> Map.of(
                        "channel", row.channel().wireId(), "available", row.available(), "unreadCount", row.unreadCount())).toList(),
                "conversations", overview.conversations().stream().map(row -> Map.of(
                        "roleId", row.roleId(), "name", row.name(), "avatarId", row.avatarId(), "borderId", row.borderId(),
                        "level", row.level(), "unreadCount", row.unreadCount(),
                        "latestMessageId", Long.toString(row.latestMessageId()))).toList());
    }

    /** 按连接角色读取排行榜，点赞只提交看到的榜首和当日期次。 */
    private void rankingRequest(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        try {
            if (name.equals("ranking.overview")) {
                fields(body, Set.of());
                respond(connection, request, rankings.overview(connection.role));
                return;
            }
            var kind = RankService.BoardKind.valueOf(text(body, "kind", "CHAPTER|GUILD|POWER|CROSS_GUILD|CROSS_POWER"));
            if (name.equals("ranking.list")) {
                fields(body, Set.of("kind"));
                respond(connection, request, rankings.list(connection.role, kind));
                return;
            }
            fields(body, Set.of("kind", "requestId", "targetId", "resetAt"));
            var requestId = text(body, "requestId", UUID_PATTERN);
            var targetId = text(body, "targetId", UUID_PATTERN);
            var resetAt = operationAmount(body, "resetAt", "RANK_INVALID");
            var result = rankings.like(connection.role, new RankService.LikeCommand(requestId, kind, targetId, resetAt));
            respond(connection, request, Map.of("requestId", requestId, "overview", result.overview(), "notice", result.rewardNotice()));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "排行榜数据正忙，请稍后重试", true);
        }
    }

    /** 读取本连接的任务快照，或领取经期次和业务流水校验的奖励。 */
    private void questRequest(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        try {
            if (name.equals("quest.list")) {
                fields(body, Set.of());
                respond(connection, request, quests.snapshot(connection.role));
                return;
            }
            fields(body, Set.of("requestId", "kind", "id", "resetAt"));
            var requestId = text(body, "requestId", UUID_PATTERN);
            var kind = QuestService.QuestKind.valueOf(text(body, "kind", "DAILY|ACHIEVEMENT|MILESTONE"));
            var id = operationIndex(body, "id", "QUEST_REQUEST_INVALID");
            var resetAt = operationAmount(body, "resetAt", "QUEST_REQUEST_INVALID");
            var result = quests.claim(connection.role, kind, id, resetAt, requestId, request.path("id").asString());
            respond(connection, request, Map.of("requestId", requestId, "snapshot", result.snapshot(),
                    "notice", result.rewardNotice()));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "任务数据正忙，请稍后重试", true);
        }
    }

    /** 以稳定任务编号领取，快照同步档位，冻结奖励通知也随回包交付以覆盖即时推送缺失。 */
    private void claimVipTask(Connection connection, JsonNode request) throws IOException {
        var body = request.path("body");
        fields(body, Set.of("requestId", "taskId"));
        var requestId = text(body, "requestId", UUID_PATTERN);
        var task = body.path("taskId");
        if (!task.isIntegralNumber() || !task.canConvertToInt() || task.asInt() <= 0) {
            throw rejected("VIP_REQUEST_INVALID");
        }
        try {
            var receipt = vip.claim(connection.token, requestId, task.asInt());
            respond(connection, request, Map.of("requestId", receipt.requestId(), "roleId", receipt.roleId(),
                    "assetRevision", receipt.assetRevision(), "taskId", receipt.taskId(), "notice", receipt.notice()));
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "角色数据正忙，请稍后重试", true);
        }
    }

    /** 主线命令只接收幂等键或战报ID；业务拒绝保留连接，损坏数据仍由统一异常边界拒绝。 */
    private void chapter(Connection connection, JsonNode request, String name) throws IOException {
        var body = request.path("body");
        boolean challenge = name.equals("chapter.challenge");
        String key = challenge ? "requestId" : "battleId";
        fields(body, Set.of(key));
        String id = text(body, key, UUID_PATTERN);
        try {
            if (name.equals("chapter.replay")) {
                var result = chapters.replay(connection.token, id);
                respond(connection, request, Map.of("battleId", result.id(), "mission", result.details().mission(),
                    "pending", result.details().pending(), "replay", GameProtocolCodec.tree(result.replay())));
            } else {
                var receipt = challenge ? chapters.challenge(connection.token, id) : chapters.claim(connection.token, id);
                var response = new LinkedHashMap<String, Object>();
                response.put("action", receipt.action().name());
                response.put("battleId", receipt.battleId());
                response.put("state", receipt.state());
                response.put("rewards", receipt.rewards());
                if (receipt.experience() != null) {
                    response.put("experience", receipt.experience());
                }
                if (receipt.actual() != null) {
                    response.put("actual", receipt.actual());
                }
                respond(connection, request, response);
            }
        } catch (IllegalArgumentException error) {
            throw rejected("CHAPTER_UNAVAILABLE");
        }
    }

    /** 跨角色业务的快照暂留到请求解锁，其余资产提交按原方式发送。 */
    @org.springframework.context.event.EventListener
    public void assetsChanged(AssetSyncService.Changed event) {
        var notifications = roleNotifications.get();
        if (notifications != null) {
            notifications.snapshots().add(event.roleId());
            return;
        }
        ReentrantLock lock=roleLock(event.roleId()); lock.lock();
        try {
            Connection connection=online.get(event.roleId());
            if(connection==null || !connection.ready) return;
            try {
                var state=snapshots.snapshot(connection.token);
                send(connection,Map.of("version",1,"kind","event","name","state.changed","connectionId",connection.socket.getId(),"body",state));
            } catch(Exception error) { close(connection,CloseStatus.SERVER_ERROR); }
        } finally { lock.unlock(); }
    }

    /** 公会成员或待审列表提交后，只通知相关在线角色重新读取页面状态。 */
    @org.springframework.transaction.event.TransactionalEventListener
    public void guildChanged(GuildChanged event) {
        var notifications = roleNotifications.get();
        if (notifications != null) {
            notifications.guildPages().addAll(event.roleIds());
            return;
        }
        event.roleIds().forEach(id -> notifyRolePage(id, "guild.updated"));
    }

    /** 新发信事务提交后通知收件人刷新，离线角色下一次登录读取邮件。 */
    @org.springframework.transaction.event.TransactionalEventListener
    public void mailChanged(MailService.Changed event) {
        var notifications = roleNotifications.get();
        if (notifications != null) {
            notifications.mailPages().add(event.roleId());
            return;
        }
        notifyRolePage(event.roleId(), "mail.changed");
    }

    /** 好友事务提交后通知双方，先结束当前角色的请求锁。 */
    @org.springframework.transaction.event.TransactionalEventListener
    public void friendChanged(FriendChanged event) {
        var notifications = roleNotifications.get();
        if (notifications != null) {
            notifications.friendPages().addAll(event.roleIds());
            return;
        }
        event.roleIds().forEach(id -> notifyRolePage(id, "friend.changed"));
    }

    /** 只向提交时确认的区服和角色发送空载荷通知，正文由每个接收者单独鉴权拉取。 */
    @org.springframework.transaction.event.TransactionalEventListener
    public void chatChanged(ChatChanged event) {
        if (event.serverIds().isEmpty()) {
            event.roleIds().forEach(roleId -> notifyChatConnection(online.get(roleId)));
            return;
        }
        online.values().forEach(connection -> {
            if (connection.serverId != null && (event.serverIds().contains(connection.serverId)
                    || event.roleIds().contains(connection.role))) {
                notifyChatConnection(connection);
            }
        });
    }

    /** 仅使用线程安全的 WebSocket 发送队列，广播过程不相互获取玩家的请求锁。 */
    private void notifyChatConnection(Connection connection) {
        if (connection == null || !connection.ready || online.get(connection.role) != connection || !connection.socket.isOpen()) {
            return;
        }
        try {
            send(connection, Map.of("version", 1, "kind", "event", "name", "chat.changed",
                "connectionId", connection.socket.getId(), "body", Map.of()));
        } catch (IOException | RuntimeException error) {
            close(connection, CloseStatus.SERVER_ERROR);
        }
    }

    /** 同一角色锁内检查现行连接，页面失效事件不携带私人资料。 */
    private void notifyRolePage(String roleId, String protocol) {
        var lock = roleLock(roleId);
        lock.lock();
        try {
            var connection = online.get(roleId);
            if (connection != null && connection.ready && connection.socket.isOpen()) {
                try {
                    send(connection, Map.of("version", 1, "kind", "event", "name", protocol,
                        "connectionId", connection.socket.getId(), "body", Map.of()));
                } catch (IOException | RuntimeException error) {
                    close(connection, CloseStatus.SERVER_ERROR);
                }
            }
        } finally {
            lock.unlock();
        }
    }

    /** 已提交的任务变更发往目标角色，涉及其他角色时等当前请求解锁。 */
    @org.springframework.context.event.EventListener
    public void questChanged(QuestChanged event) {
        var notifications = roleNotifications.get();
        if (notifications != null) {
            notifications.quests().add(event);
            return;
        }
        var lock = roleLock(event.roleId());
        lock.lock();
        try {
            var connection = online.get(event.roleId());
            if (connection != null && connection.ready && connection.socket.isOpen()) {
                try {
                    send(connection, Map.of("version", 1, "kind", "event", "name", "quest.changed",
                        "connectionId", connection.socket.getId(), "body", Map.of("completed", event.completed())));
                } catch (IOException | RuntimeException error) {
                    close(connection, CloseStatus.SERVER_ERROR);
                }
            }
        } finally {
            lock.unlock();
        }
    }

    /**
     * 通用发奖只交付给当前角色的有效在线连接；资产提交及版本仍由state.changed负责。
     * 换号、接管或离线不发送，交付失败也不重新执行发奖；历史展示由原业务回执恢复。
     */
    @org.springframework.context.event.EventListener
    public void rewardGranted(com.funsgamex.mxzg.reward.RewardFeedbackService.Committed event) {
        var notice = event.notice();
        ReentrantLock lock = roleLock(notice.roleId());
        lock.lock();
        try {
            Connection connection = online.get(notice.roleId());
            if (connection == null || !connection.ready
                    || connections.get(connection.socket.getId()) != connection || !connection.socket.isOpen()) {
                return;
            }
            try {
                if (!notice.roleId().equals(connection.role)
                        || !notice.roleId().equals(sessions.requireRole(connection.token))) {
                    close(connection, CloseStatus.POLICY_VIOLATION);
                    return;
                }
                send(connection, Map.of("version", 1, "kind", "event", "name", "reward.granted",
                        "connectionId", connection.socket.getId(), "body", notice));
            } catch (Exception error) {
                close(connection, CloseStatus.SERVER_ERROR);
            }
        } finally {
            lock.unlock();
        }
    }

    /** 验证统一信封及关联标识；模块名与动作名各段可以带连字符，按登记的全名分派。 */
    private static void validateEnvelope(JsonNode request) {
        fields(request, Set.of("version", "kind", "name", "id", "body", "connectionId"));
        if (!request.path("version").isIntegralNumber() || !request.path("version").asString().equals("1")) throw rejected("UNSUPPORTED_VERSION");
        if (!request.path("kind").isString() || !request.path("kind").asString().equals("request")) throw rejected("INVALID_MESSAGE");
        text(request, "id", UUID_PATTERN);
        text(request, "name", "[a-z]+(?:-[a-z]+)?(?:\\.[a-z]+(?:-[a-z]+)?){1,3}");
        if (!request.path("body").isObject()) throw rejected("INVALID_MESSAGE");
    }

    /** 只允许对象包含规定字段；具体必填字段由对应读取函数验证。 */
    private static void fields(JsonNode value, Set<String> allowed) {
        if (value == null || !value.isObject()) throw rejected("INVALID_MESSAGE");
        for (String name : value.propertyNames()) if (!allowed.contains(name)) throw rejected("INVALID_MESSAGE");
    }

    /** 严格读取有格式限制的字符串，不把数值或布尔值隐式转成凭证。 */
    private static String text(JsonNode value, String key, String pattern) {
        JsonNode field = value.path(key);
        if (!field.isString() || field.asString().length() > 128 || !field.asString().matches(pattern)) throw rejected("INVALID_MESSAGE");
        return field.asString();
    }

    /** 返回稳定协议拒绝原因，HTTP 状态只用于适配现有异常类型。 */
    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, code);
    }

    /** 最多等待两秒，让首包发送后的收尾与接管串行完成；超时仍明确拒绝，不无限排队。 */
    private static boolean awaitLock(ReentrantLock lock) {
        try { return lock.tryLock(2, TimeUnit.SECONDS); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); return false; }
    }

    /** 固定散列锁允许角色间并行；碰撞有界等待，超时返回 BUSY，不影响数据归属。 */
    private ReentrantLock roleLock(String role) { return roleLocks[Math.floorMod(role.hashCode(), roleLocks.length)]; }

    /** 返回带原请求标识的成功信封，业务结果仅在事务服务返回后发送。 */
    private void respond(Connection connection, JsonNode request, Object body) throws IOException {
        send(connection, Map.of("version", 1, "kind", "response", "name", request.path("name").asString(),
            "id", request.path("id").asString(), "connectionId", connection.socket.getId(), "ok", true, "body", body));
    }

    /** 有效请求才回关联错误，无法安全关联的畸形数据直接关闭，不回显原始内容。 */
    private void fail(Connection connection, JsonNode request, String code) {
        fail(connection, request, code, code, code.equals("BUSY"));
    }

    /** 返回领域明确给出的失败原因及可重试标记；仅发送已知消息，不回显原请求或存储异常。 */
    private void fail(Connection connection, JsonNode request, String code, String message, boolean retryable) {
        if (request == null || !request.path("id").isString() || !request.path("id").asString().matches(UUID_PATTERN)
                || !request.path("name").isString() || request.path("name").asString().length() > 64) {
            return;
        }
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("version", 1);
        response.put("kind", "response");
        response.put("name", request.path("name").asString());
        response.put("id", request.path("id").asString());
        response.put("connectionId", connection.socket.getId());
        response.put("ok", false);
        response.put("body", null);
        response.put("error", Map.of("code", code, "message", message, "retryable", retryable));
        try {
            send(connection, response);
        } catch (Exception ignored) {
            close(connection, CloseStatus.SERVER_ERROR);
        }
    }

    /** 限制输出帧，发送失败不重做业务，由恢复同步确认状态。 */
    private void send(Connection connection, Object value) throws IOException {
        byte[] payload = GameProtocolCodec.encode(value);
        connection.socket.sendMessage(new BinaryMessage(payload));
    }

    /** 鉴权前五秒，鉴权后六十秒没有有效请求即超时；使用单调时钟避免系统时间调整。 */
    private boolean timedOut(Connection connection, long now) {
        return now - (connection.role == null ? connection.opened : connection.lastActivity)
            > TimeUnit.SECONDS.toNanos(connection.role == null ? 5 : 60);
    }

    /** 定时回收未鉴权及无响应连接；不等待正在处理的连接锁。 */
    @Scheduled(fixedDelay = 1000)
    public void expireConnections() {
        for (Connection connection : connections.values()) {
            if (timedOut(connection, System.nanoTime()) && connection.lock.tryLock()) {
                try { if (timedOut(connection, System.nanoTime())) close(connection, CloseStatus.POLICY_VIOLATION); }
                finally { connection.lock.unlock(); }
            }
        }
    }

    /** 传输错误仅结束该连接，不撤销可用于正常重连的令牌。 */
    @Override public void handleTransportError(WebSocketSession session, Throwable exception) {
        Connection connection = connections.get(session.getId());
        if (connection != null) close(connection, CloseStatus.SERVER_ERROR);
    }

    /** 释放容量与自身在线映射；旧连接关闭回调不能移除已经接管的新连接。 */
    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Connection connection = connections.remove(session.getId());
        if (connection != null) {
            capacity.release();
            if (connection.role != null) online.remove(connection.role, connection);
        }
    }

    /** 主动关闭与异步关闭回调共用幂等清理，确保容量只释放一次。 */
    private void close(Connection connection, CloseStatus status) {
        afterConnectionClosed(connection.socket, status);
        try { connection.socket.close(status); } catch (IOException ignored) { /* 状态已清理，无需复用失效通道。 */ }
    }
}
