/**
 * 本机登录、角色、英雄与背包 Protobuf 二进制长连接：匿名选服、登录统一初始化、同角色连接替换和提交后资产同步。
 * 请求按连接及角色串行处理，业务尚未同步时拒绝访问；挂机领取由默认关闭的事务入口控制，历史回执可独立恢复。
 * 主线、英雄成长和新手赠礼走真实业务回执，开发GM保留原环境边界。
 * 公会操作可能同时更新两名玩家，提交后通知统一在发起者释放角色锁后交付。
 */
package com.funsgamex.mxzg.network;

import com.funsgamex.mxzg.arena.ArenaService;
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
import com.funsgamex.mxzg.vip.VipService;
import com.funsgamex.mxzg.quest.QuestChanged;
import com.funsgamex.mxzg.quest.QuestService;
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
import com.funsgamex.mxzg.role.RoleProfileService;
import com.funsgamex.mxzg.role.RoleService;
import com.funsgamex.mxzg.role.WelcomeGiftService;
import com.funsgamex.mxzg.time.GameClock;
import com.funsgamex.mxzg.tower.TowerService;
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
    /** 本区的公会列表和成员操作，所有写入都以当前连接的角色为发起人。 */
    private final GuildService guilds;
    /** 权威周货架与兑换事务。 */
    private final GuildShopService guildShop;
    /** 公会捐献、等级与宝箱事务。 */
    private final GuildDonationService guildDonations;
    /** 当前区服战力榜投影。 */
    private final GuildRankingService guildRanking;
    /** 契约任务领取和 VIP 升档由同一个角色事务处理。 */
    private final VipService vip;
    /** 当前角色任务及成就的权威读取和领取服务。 */
    private final QuestService quests;
    /** 金币副本首关资格、真实挑战和清扫回执由原事务服务处理。 */
    private final DailyDungeonService dailyDungeon;
    /** 幻境之塔专用阵容、次数及实际结算由爬塔事务负责。 */
    private final TowerService tower;
    /** 新手竞技场的对手、门票、积分及历史战报。 */
    private final ArenaService arena;
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
    /** 一次公会请求提交后待通知的角色，仅保存到当前请求释放角色锁为止。 */
    private final ThreadLocal<GuildNotifications> guildNotifications = new ThreadLocal<>();

    /** 快照与公会页刷新分别按角色去重。 */
    private record GuildNotifications(Set<String> snapshots, Set<String> pages, List<QuestChanged> quests) {}

    private static final class Connection {
        final WebSocketSession socket;
        final ReentrantLock lock = new ReentrantLock();
        final long opened = System.nanoTime();
        volatile long lastActivity = opened;
        long rateWindow = opened;
        int rateCount;
        volatile String role;
        String token;
        boolean ready;

        /** 包装发送通道，限制并发发送缓冲；连接标识使用底层会话随机标识。 */
        Connection(WebSocketSession socket) {
            this.socket = new ConcurrentWebSocketSessionDecorator(socket, 5000, 262144);
        }
    }

    /** 注入认证快照及各领域服务，草稿战力与其它角色操作均由当前连接分派。 */
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
            MarketService market, GuildService guilds, GuildShopService guildShop,
            GuildDonationService guildDonations, GuildRankingService guildRanking, VipService vip, QuestService quests,
            DailyDungeonService dailyDungeon, TowerService tower, ArenaService arena,
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
        this.guilds = guilds;
        this.guildShop = guildShop;
        this.guildDonations = guildDonations;
        this.guildRanking = guildRanking;
        this.vip = vip;
        this.quests = quests;
        this.dailyDungeon = dailyDungeon;
        this.tower = tower;
        this.arena = arena;
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

    /** 解析受限信封并按角色串行调度，公会通知在释放发起者的角色锁后交付。 */
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
                    case "servers.list" -> { fields(request.path("body"),Set.of()); respond(connection,request,Map.of("items",servers.list())); }
                    case "session.login", "session.authenticate" -> authenticate(connection,request);
                    default -> throw rejected("UNAUTHENTICATED");
                }
            } else {
                ReentrantLock roleLock = roleLock(connection.role);
                if (!awaitLock(roleLock)) throw rejected("BUSY");
                var notifications = name.equals("guild.change") || name.equals("guild.donation.donate")
                    ? new GuildNotifications(new LinkedHashSet<>(), new LinkedHashSet<>(), new java.util.ArrayList<>()) : null;
                if (notifications != null) {
                    guildNotifications.set(notifications);
                }
                try { dispatch(connection, request, name); }
                finally {
                    roleLock.unlock();
                    if (notifications != null) {
                        guildNotifications.remove();
                        notifications.snapshots().forEach(id -> assetsChanged(new AssetSyncService.Changed(id)));
                        notifications.pages().forEach(this::notifyGuildUpdated);
                        notifications.quests().forEach(this::questChanged);
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

    /** 首帧鉴权后原子替换本进程在线连接，返回统一状态和游戏时钟。 */
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
            accepted.put("initial",snapshots.snapshot(token));
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
        if (name.equals("guild.list") || name.equals("guild.change")) {
            guild(connection, request, name);
            return;
        }
        switch (name) {
            case "guild.shop.list", "guild.shop.buy", "guild.donation.info", "guild.donation.donate",
                    "guild.donation.claim", "guild.ranking" -> {
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
        switch (name) {
            case "tower.state", "tower.formation.save", "tower.challenge", "tower.sweep", "tower.milestone.claim" -> {
                towerRequest(connection, request, name);
                return;
            }
            case "arena.state", "arena.refresh", "arena.challenge", "arena.replay", "arena.ticket.buy" -> {
                arenaRequest(connection, request, name);
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

    /** 解析单槽和批量宝石操作，未提供的可选字段保留领域的空值。 */
    private HeroJewelService.Receipt changeHeroJewel(String token, JsonNode body) {
        fields(body, Set.of("requestId", "heroId", "action", "itemId", "slot", "expectedItemId", "count"));
        HeroJewelService.Action action;
        try {
            action = HeroJewelService.Action.valueOf(body.path("action").asString());
        } catch (IllegalArgumentException error) {
            throw rejected("INVALID_HERO_JEWEL_REQUEST");
        }
        return heroJewels.change(token, new HeroJewelService.Request(body.path("requestId").asString(),
                body.path("heroId").asString(null), action, body.path("itemId").asInt(), body.path("slot").asInt(),
                body.path("expectedItemId").asInt(), body.path("count").asInt()));
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

    /** 竞技场路由只交付当前连接的角色操作；读取历史战报须经领域校验归属。 */
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
                    fields(body, Set.of("requestId", "opponentId"));
                    var result = arena.challenge(connection.token, text(body, "requestId", UUID_PATTERN),
                        operationIndex(body, "opponentId", "ARENA_REQUEST_INVALID"));
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

    /** 公会功能请求只使用连接身份，兑换和捐献另校验所打开的公会及报价周期。 */
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
                default -> throw rejected("GUILD_REQUEST_INVALID");
            }
        } catch (org.springframework.dao.PessimisticLockingFailureException
                | org.springframework.dao.QueryTimeoutException error) {
            fail(connection, request, "BUSY", "公会数据正忙，请稍后重试", true);
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

    /** 将公会造成的跨角色快照暂留到请求解锁，其余资产提交按原方式发送。 */
    @org.springframework.context.event.EventListener
    public void assetsChanged(AssetSyncService.Changed event) {
        var notifications = guildNotifications.get();
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
        var notifications = guildNotifications.get();
        if (notifications != null) {
            notifications.pages().addAll(event.roleIds());
            return;
        }
        event.roleIds().forEach(this::notifyGuildUpdated);
    }

    /** 同一角色锁内检查现行连接，空通知不携带成员或申请资料。 */
    private void notifyGuildUpdated(String roleId) {
        var lock = roleLock(roleId);
        lock.lock();
        try {
            var connection = online.get(roleId);
            if (connection != null && connection.ready && connection.socket.isOpen()) {
                try {
                    send(connection, Map.of("version", 1, "kind", "event", "name", "guild.updated",
                        "connectionId", connection.socket.getId(), "body", Map.of()));
                } catch (IOException | RuntimeException error) {
                    close(connection, CloseStatus.SERVER_ERROR);
                }
            }
        } finally {
            lock.unlock();
        }
    }

    /** 已提交的任务变更发往目标角色，公会跨角色业务等当前请求解锁后再通知。 */
    @org.springframework.context.event.EventListener
    public void questChanged(QuestChanged event) {
        var notifications = guildNotifications.get();
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

    /** 验证统一信封及关联标识；协议段允许 god-equipment 等拼写，分派仍以登记的全名为准。 */
    private static void validateEnvelope(JsonNode request) {
        fields(request, Set.of("version", "kind", "name", "id", "body", "connectionId"));
        if (!request.path("version").isIntegralNumber() || !request.path("version").asString().equals("1")) throw rejected("UNSUPPORTED_VERSION");
        if (!request.path("kind").isString() || !request.path("kind").asString().equals("request")) throw rejected("INVALID_MESSAGE");
        text(request, "id", UUID_PATTERN);
        text(request, "name", "[a-z]+(?:\\.[a-z]+(?:-[a-z]+)?){1,3}");
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
