/**
 * 为一场游戏装配唯一的模块实例，共用账号操作、统一资产快照和奖励展示。
 * 场景向这里交付主城就绪状态。业务请求、恢复规则及页面交互由各模块实现。
 */
import { AccountOperations } from "../../features/account/AccountOperations";
import { EntryGateUtils } from "../../config/EntryGateUtils";
import { GameConfig } from "../../config/GameConfig";
import { GConfig } from "../../config/GConfig";
import type { AccountModel } from "../../features/account/AccountModel";
import { RoleController } from "../../features/account/RoleController";
import { ArenaController } from "../../features/arena/ArenaController";
import { DreamlandController } from "../../features/dreamland/DreamlandController";
import { TrialController } from "../../features/trial/TrialController";
import { RainbowController } from "../../features/rainbow/RainbowController";
import { GuildTechnologyController } from "../../features/guild/GuildTechnologyController";
import { TrialShopController } from "../../features/trial/TrialShopController";
import { BagController } from "../../features/bag/BagController";
import { BlackMarketController } from "../../features/blackmarket/BlackMarketController";
import { MainChapterSession } from "../../features/battle/MainChapterSession";
import { DailyDungeonController } from "../../features/dungeon/DailyDungeonController";
import { GuildController } from "../../features/guild/GuildController";
import { FriendController } from "../../features/friend/FriendController";
import { ChatController } from "../../features/chat/ChatController";
import { MailController } from "../../features/mail/MailController";
import { FormationController } from "../../features/hero/FormationController";
import { HeroArtifactController } from "../../features/hero/HeroArtifactController";
import { HeroEquipmentController } from "../../features/hero/HeroEquipmentController";
import { HeroLevelController } from "../../features/hero/HeroLevelController";
import { HeroRosterController } from "../../features/hero/HeroRosterController";
import { HeroRosterModel } from "../../features/hero/HeroRosterModel";
import { HeroStarController } from "../../features/hero/HeroStarController";
import { HeroJewelController } from "../../features/hero/HeroJewelController";
import { HeroGodEquipmentController } from "../../features/hero/HeroGodEquipmentController";
import { MarketController } from "../../features/market/MarketController";
import { QuestController } from "../../features/quest/QuestController";
import { RankingController } from "../../features/ranking/RankingController";
import { RewardBinding } from "../../features/reward/RewardBinding";
import { SmithController } from "../../features/smith/SmithController";
import { TowerController } from "../../features/tower/TowerController";
import { VipController } from "../../features/vip/VipController";
import { EventDispatcher } from "../../framework/EventDispatcher";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { Protocol } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { AccountComposition, type ApplicationAccount } from "./AccountComposition";
import { AssetStateBinding } from "./AssetStateBinding";
import { ApplicationRedDots } from "./ApplicationRedDots";
import { QuestCompletionBinding } from "./QuestCompletionBinding";
import type { DevelopmentPreview } from "./DevelopmentPreview";

/** 含页面操作状态的模块随账号重置，并在场景结束时释放。 */
interface SessionModule {
    /** 当前角色离开时结束内存中的操作进度。 */
    resetSession(): void;
    /** 场景退出时释放模块监听。 */
    dispose(): void;
}

export class ApplicationModules {
    /** 当前应用的角色协议入口，主城首次命名窗口共用。 */
    public readonly role: RoleController;
    /** 统一角色快照，用于识别已提交的公会身份变化。 */
    private readonly accountModel: AccountModel;
    /** 负责整包校验、原子提交及角色变更时的模块清理。 */
    private readonly assets: AssetStateBinding;
    /** 本次应用唯一反馈队列，主城就绪后可以展示积压的通知。 */
    private readonly rewards: RewardBinding;
    /** 角色状态到红点树的订阅，随会话重置、随应用回收。 */
    private readonly redDots: ApplicationRedDots;
    /** 待显示的成就通知只属于当前场景和角色。 */
    private readonly questCompletion: QuestCompletionBinding;
    /** 需要随账号重置和应用释放的操作模块。 */
    private readonly sessions: readonly SessionModule[];
    /** 模块卸载时先结束连接回调，再释放状态订阅。 */
    private readonly unbind: () => void;

    /**
     * 建立模块依赖，在账号恢复前绑定统一状态和通知。账号变化先关闭原角色页面，
     * 然后由各模块清空本轮状态，再提交新角色的完整数据。
     */
    public constructor(
        account: ApplicationAccount,
        preview: DevelopmentPreview,
        inHome: () => boolean,
        clearRolePages: () => void,
        showConnectionNotice: (message: string) => void,
        openAchievements: () => boolean,
    ) {
        const {model, controller, socket} = account;
        this.accountModel = model;
        const operations = new AccountOperations(controller, socket);
        this.rewards = new RewardBinding(controller);
        this.redDots = new ApplicationRedDots(model);
        this.questCompletion = new QuestCompletionBinding(openAchievements);
        this.role = new RoleController(model, operations, this.rewards);
        preview.configureRewards(notice => this.rewards.restore(notice));
        preview.configureGm(controller, operations, inHome);

        const bag = BagController.instance;
        const heroes = HeroRosterController.instance;
        const formation = FormationController.instance;
        const heroLevel = HeroLevelController.instance;
        const heroEquipment = HeroEquipmentController.instance;
        const market = MarketController.instance;
        bag.configure(operations, this.rewards);
        bag.initialize();
        heroes.configure(operations, this.rewards, model);
        heroes.initialize();
        formation.configure(operations);
        formation.initialize();
        heroLevel.configure(operations, model);
        heroLevel.initialize();
        heroEquipment.configure(operations);
        heroEquipment.initialize();
        const heroStar = HeroStarController.instance;
        heroStar.configure(operations, model, this.rewards);
        heroStar.initialize();
        const heroJewel = HeroJewelController.instance;
        heroJewel.configure(operations);
        heroJewel.initialize();
        const godEquipment = HeroGodEquipmentController.instance;
        godEquipment.configure(operations, HeroRosterModel.instance, model);
        godEquipment.initialize();
        const heroArtifacts = HeroArtifactController.instance;
        heroArtifacts.configure(operations, model);
        heroArtifacts.initialize();
        market.configure(operations, model);
        market.initialize();
        const blackMarket = BlackMarketController.instance;
        blackMarket.configure(operations, model);
        blackMarket.initialize();
        const smith = SmithController.instance;
        smith.configure(operations, () => this.assets.acceptedRevision);
        smith.initialize();
        const dailyDungeon = DailyDungeonController.instance;
        dailyDungeon.configure(operations, this.rewards);
        dailyDungeon.initialize();
        const dreamland = DreamlandController.instance;
        dreamland.configure(operations, this.rewards);
        dreamland.initialize();
        const trial = TrialController.instance;
        trial.configure(operations, this.rewards);
        trial.initialize();
        const trialShop = TrialShopController.instance;
        trialShop.configure(operations, this.rewards);
        trialShop.initialize();
        const rainbow = RainbowController.instance;
        rainbow.configure(operations);
        rainbow.initialize();
        const tower = TowerController.instance;
        tower.configure(operations, this.rewards);
        tower.initialize();
        const arena = ArenaController.instance;
        arena.configure(operations, this.rewards);
        arena.initialize();
        const guild = GuildController.instance;
        guild.configure(operations, model);
        guild.initialize();
        const guildTechnology = GuildTechnologyController.instance;
        guildTechnology.configure(operations);
        guildTechnology.initialize();
        const vip = VipController.instance;
        vip.configure(operations, this.rewards);
        vip.initialize();
        const quests = QuestController.instance;
        quests.configure(operations, notice => this.rewards.restore(notice));
        quests.initialize();
        const rankings = RankingController.instance;
        rankings.configure(operations, notice => this.rewards.restore(notice));
        rankings.initialize();
        const friends = FriendController.instance;
        friends.configure(operations, notice => this.rewards.restore(notice));
        friends.initialize();
        const chat = ChatController.instance;
        chat.configure(operations);
        chat.initialize();
        const mail = MailController.instance;
        mail.configure(operations, notice => this.rewards.restore(notice));
        mail.initialize();
        const chapter = new MainChapterSession(controller, operations, this.rewards);
        this.sessions = [chapter, heroLevel, heroEquipment, heroStar, heroJewel, godEquipment,
            heroArtifacts, market, blackMarket, smith, dailyDungeon, dreamland, trial, trialShop,
            rainbow, tower, arena, guild, guildTechnology, vip, quests, rankings, friends, mail, chat];
        this.assets = new AssetStateBinding(model, bag, this.role,
            heroes, formation, () => {
                clearRolePages();
                this.rewards.resetSession();
                this.redDots.resetSession();
                this.questCompletion.resetSession();
            }, chapter.controller, this.sessions, [vip]);
        this.unbind = AccountComposition.bind(account, frame => this.acceptState(frame),
            frame => this.rewards.controller.receive(frame), showConnectionNotice,
            frame => ProtocolRouter.instance.dispatch(guild, frame),
            frame => ProtocolRouter.instance.dispatch(quests, frame),
            frame => {
                switch (frame.name) {
                    case Protocol.MAIL_CHANGED:
                        ProtocolRouter.instance.dispatch(mail, frame);
                        break;
                    case Protocol.FRIEND_CHANGED:
                        ProtocolRouter.instance.dispatch(friends, frame);
                        chat.refreshVisibility();
                        break;
                    case Protocol.CHAT_CHANGED:
                        ProtocolRouter.instance.dispatch(chat, frame);
                        break;
                }
            });
    }

    /** 整包提交后更新红点，恢复鉴权时同步可见玩法、货架与可访问频道。 */
    private acceptState(frame: GameFrame): void {
        const authenticated = frame.name === Protocol.SESSION_AUTHENTICATE;
        const previousGuild = this.accountModel.snapshot.role?.guildName;
        const previousLevel = this.accountModel.snapshot.role?.level;
        const accepted = EventDispatcher.batchNotifications(() => {
            if (!this.assets.apply(frame)) {
                return false;
            }
            if (authenticated) {
                DailyDungeonController.instance.refreshVisible();
                DreamlandController.instance.refreshVisible();
                TrialController.instance.refreshVisible();
                TrialShopController.instance.refreshVisible();
                RainbowController.instance.refreshVisible();
                TowerController.instance.refreshVisible();
                ArenaController.instance.refreshVisible();
            }
            this.redDots.refreshSnapshot(authenticated);
            return true;
        });
        if (!accepted) {
            return;
        }
        this.rewards.controller.observeRevision(this.assets.acceptedRevision);
        GuildTechnologyController.instance.observeAssets(this.assets.acceptedRevision);
        const guildChanged = previousGuild !== this.accountModel.snapshot.role?.guildName;
        GuildController.instance.refreshRoleState(authenticated, guildChanged);
        if (authenticated || guildChanged) {
            GuildTechnologyController.instance.refreshVisible();
        }
        this.refreshRankingAccess();
        if (guildChanged) {
            ChatController.instance.refreshGuildVisibility();
        } else if (authenticated || previousLevel !== this.accountModel.snapshot.role?.level) {
            ChatController.instance.refresh();
        }
        if (authenticated) {
            MarketController.instance.reloadVisible();
            BlackMarketController.instance.reloadVisible();
            SmithController.instance.resume();
            QuestController.instance.refresh();
            RankingController.instance.refreshVisible();
            FriendController.instance.refreshVisible();
            MailController.instance.refreshVisible();
        }
    }

    /** 主城及游戏配置就绪后开放反馈、红点和聊天预读。 */
    public setHomeReady(ready: boolean): void {
        this.rewards.setReady(ready);
        this.redDots.setReady(ready);
        GuildController.instance.setHomeReady(ready);
        QuestController.instance.setHomeReady(ready);
        this.refreshRankingAccess();
        RankingController.instance.setHomeReady(ready);
        FriendController.instance.setHomeReady(ready);
        MailController.instance.setHomeReady(ready);
        ChatController.instance.setHomeReady(ready);
        this.questCompletion.setReady(ready);
    }

    /** 使用当前配置和真实角色等级决定是否预读排行榜红点。 */
    private refreshRankingAccess(): void {
        const role = this.accountModel.snapshot.role;
        const config = GameConfig.instance;
        const gate = config.getPackageVersion() ? config.getConfig(GConfig.OpenCondition, "main_rank") : undefined;
        RankingController.instance.setUnlocked(!!role && !!gate && EntryGateUtils.isEntryOpen(gate, role.level, 0));
    }

    /** 撤销回调、停止操作，释放模块及其对协议和界面的订阅。 */
    public dispose(): void {
        this.unbind();
        this.assets.dispose();
        this.redDots.dispose();
        this.questCompletion.dispose();
        for (const module of this.sessions) {
            module.dispose();
        }
        this.rewards.dispose();
        BagController.instance.dispose();
    }
}
