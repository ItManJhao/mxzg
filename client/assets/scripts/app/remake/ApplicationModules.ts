/**
 * 为一场游戏装配唯一的模块实例，共用账号操作、统一资产快照和奖励展示。
 * 场景向这里交付主城就绪状态。业务请求、恢复规则及页面交互由各模块实现。
 */
import { AccountOperations } from "../../features/account/AccountOperations";
import { RoleController } from "../../features/account/RoleController";
import { BagController } from "../../features/bag/BagController";
import { MainChapterSession } from "../../features/battle/MainChapterSession";
import { DailyDungeonController } from "../../features/dungeon/DailyDungeonController";
import { FormationController } from "../../features/hero/FormationController";
import { HeroEquipmentController } from "../../features/hero/HeroEquipmentController";
import { HeroLevelController } from "../../features/hero/HeroLevelController";
import { HeroRosterController } from "../../features/hero/HeroRosterController";
import { MarketController } from "../../features/market/MarketController";
import { RewardBinding } from "../../features/reward/RewardBinding";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { Protocol } from "../../platform/Protocol";
import { AccountComposition, type ApplicationAccount } from "./AccountComposition";
import { AssetStateBinding } from "./AssetStateBinding";
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
    /** 负责整包校验、原子提交及角色变更时的模块清理。 */
    private readonly assets: AssetStateBinding;
    /** 本次应用唯一反馈队列，主城就绪后可以展示积压的通知。 */
    private readonly rewards: RewardBinding;
    /** 需要随账号重置和应用释放的操作模块。 */
    private readonly sessions: readonly SessionModule[];
    /** 模块卸载时先结束连接回调，再释放状态订阅。 */
    private readonly unbind: () => void;

    /**
     * 建立业务依赖，在账号恢复前绑定状态和通知。账号变化先关闭原角色页面，
     * 然后由各模块清空本轮状态，再提交新角色的完整数据。
     */
    public constructor(
        account: ApplicationAccount,
        preview: DevelopmentPreview,
        inHome: () => boolean,
        clearRolePages: () => void,
        showConnectionNotice: (message: string) => void,
    ) {
        const {model, controller, socket} = account;
        const operations = new AccountOperations(controller, socket);
        this.rewards = new RewardBinding(controller);
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
        market.configure(operations, model);
        market.initialize();
        const dailyDungeon = DailyDungeonController.instance;
        dailyDungeon.configure(operations, this.rewards);
        dailyDungeon.initialize();
        const chapter = new MainChapterSession(controller, operations, this.rewards);
        this.sessions = [chapter, heroLevel, heroEquipment, market, dailyDungeon];
        this.assets = new AssetStateBinding(model, bag, this.role,
            heroes, formation, () => {
                clearRolePages();
                this.rewards.resetSession();
            }, chapter.controller, this.sessions);
        this.unbind = AccountComposition.bind(account, frame => this.acceptState(frame),
            frame => this.rewards.controller.receive(frame), showConnectionNotice);
    }

    /** 统一快照提交后通知奖励队列；重连时让可见的市场和副本重新校准独立状态。 */
    private acceptState(frame: GameFrame): void {
        if (!this.assets.apply(frame)) {
            return;
        }
        this.rewards.controller.observeRevision(this.assets.acceptedRevision);
        if (frame.name === Protocol.SESSION_AUTHENTICATE) {
            MarketController.instance.reloadVisible();
            DailyDungeonController.instance.refreshVisible();
        }
    }

    /** 主城可见后开放跨页面反馈，登录或切换根页时暂存。 */
    public setHomeReady(ready: boolean): void {
        this.rewards.setReady(ready);
    }

    /** 撤销回调、停止操作，释放模块及其对协议和界面的订阅。 */
    public dispose(): void {
        this.unbind();
        this.assets.dispose();
        for (const module of this.sessions) {
            module.dispose();
        }
        this.rewards.dispose();
        BagController.instance.dispose();
    }
}
