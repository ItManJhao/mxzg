/**
 * 为登录和主城绑定交互、场景宿主和功能导航。根页切换时复用主城顶底栏，
 * 各页面决定自己的打开参数，场景启动组件只选择登录页或主城。
 * 各View的@UIRegistry.view负责静态登记；普通页面导入只让装饰器执行，不下载资源、不属于LoadingPlan。
 * 当前应用撤销时解除自己的依赖绑定，恢复View自身定义，不持有第二份业务状态。
 */
import {Node} from "cc";
import "../../features/battle/ui/MainChapterBattleView";
import "../../features/battle/ui/MainChapterView";
import "../../features/battle/ui/BattleDetailLayer";
import "../../features/battle/ui/ChapterRewardInfoView";
import "../../features/account/ui/RoleProfileView";
import { RoleNameView } from "../../features/account/ui/RoleNameView";
import { WelcomeGiftView } from "../../features/account/ui/WelcomeGiftView";
import type { RoleController } from "../../features/account/RoleController";
import "../../features/bag/ui/BagView";
import "../../features/bag/ui/BagInfoView";
import "../../features/hero/ui/FormationView";
import "../../features/hero/ui/FirstSummonView";
import "../../features/hero/ui/HeroInfoView";
import "../../features/hero/ui/HeroListView";
import "../../features/hero/ui/HeroSkillView";
import "../../features/market/ui/MarketView";
import "../../features/dungeon/ui/DungeonHallView";
import "../../features/dungeon/ui/GoldDungeonView";
import "../../features/arena/ui/ArenaView";
import "../../features/tower/ui/TowerView";
import "../../features/guild/ui/GuildView";
import "../../features/vip/ui/VipView";
import {AccountLoginBinding} from "../../features/account/ui/AccountLoginBinding";
import {AccountLoginView} from "../../features/account/ui/AccountLoginView";
import { CityMapService } from "../../features/city/ui/CityMapService";
import {HomePageBinding} from "../../features/home/ui/HomePageBinding";
import {RemakeHomeView} from "../../features/home/ui/RemakeHomeView";
import { UIManager } from "../../framework/ui/UIManager";
import { UIRegistry } from "../../framework/ui/UIRegistry";
import {HomeFeatureNavigation} from "./HomeFeatureNavigation";
import type { ApplicationAccount } from "./AccountComposition";
import { RemakeNavigation } from "./RemakeNavigation";
import {LoginEntry} from "./LoginEntry";

/** 应用拥有的依赖和动作；View参数不保存账号凭证或复制模块状态。 */
interface ApplicationPageContext {
    /** 当前场景的公共弹窗宿主，应用销毁时解除绑定。 */
    pageHost: Node;

    /** 登录和主城共用当前应用的账号与选服服务。 */
    account: ApplicationAccount;
    /** 主城命名窗口使用的角色协议入口。 */
    role: RoleController;
    /** 登录成功后显式进入游戏的路由状态。 */
    entry: LoginEntry;
    /** 启动完成且玩家已确认进入主城时允许点击功能入口。 */
    inHome(): boolean;

    /** 账号动作结束后由应用重新核对当前路由。 */
    syncRoute(): void;

    /** 当前场景持有的提示宿主，在无单独提示绑定时显示飘字。 */
    showToast(text: string, durationMs?: number): void;
}

/** 本场景的页面和导航，拥有主城挂点、当前导航意图及其清理句柄。 */
export class ApplicationPages {
    /** 当前主城的功能宿主和提示栏，主城创建前、销毁后为 null。 */
    private home: RemakeHomeView | null = null;
    /** 登录页/主城互替、功能页挂接和返回共用一份导航历史。 */
    private readonly navigation: RemakeNavigation;
    /** 当前主城功能的打开意图和等待提示，切换角色时重置。 */
    private readonly features: HomeFeatureNavigation;
    /** 本场景运行时对宿主和页面交互的绑定，销毁时一次撤销。 */
    private readonly unregister: Array<() => void>;

    /** 把两个根页面及主城功能宿主接入统一导航；只在场景初始化时登记。 */
    public constructor(context: ApplicationPageContext) {
        const {model, controller, servers} = context.account;
        const {entry} = context;
        const ui = UIManager.instance;
        this.navigation = new RemakeNavigation(ui, context.pageHost, {
            parent: id => HomeFeatureNavigation.tabForPage(id) ? this.home?.featureHost ?? null : null,
            changed: id => this.home?.showFeature(HomeFeatureNavigation.tabForPage(id) ?? "city", id === "hero-info"),
        });
        this.features = new HomeFeatureNavigation(ui, {
            account: model,
            current: () => this.navigation.current,
            authorized: () => context.inHome() && !model.snapshot.busy && !!model.snapshot.role,
            notice: text => this.showNotice(text),
        });
        ui.install(this.navigation, {showToast: context.showToast});
        this.unregister = [
            ui.setResidentHost("remake-modal", () => context.pageHost),
            UIRegistry.bindViewRuntime(AccountLoginView, {
                createBinding: view => new AccountLoginBinding(model, controller, view as AccountLoginView, () => {
                    ui.closeById("server-picker");
                    entry.confirm();
                    context.syncRoute();
                }, servers),
            }),
            UIRegistry.bindViewRuntime(RemakeHomeView, {
                createBinding: view => {
                    this.home = view as RemakeHomeView;
                    const home = this.home;
                    return new HomePageBinding(model, home, {
                        tabs: HomeFeatureNavigation.tabs,
                        open: id => {
                            if (id !== "role-profile") {
                                return this.features.open(id);
                            }
                            if (!model.snapshot.role || model.snapshot.busy) {
                                return false;
                            }
                            void ui.openById("role-profile", {
                                model,
                                controller: context.role,
                                serverName: servers.servers.find(row => row.id === model.snapshot.role?.serverId)?.name
                                    ?? model.snapshot.role.serverId ?? "区服未同步",
                                logout: () => controller.logout(),
                            }).catch(error => {
                                if (!UIManager.isOpenCancelled(error)) {
                                    this.showNotice("角色详情打开失败，请重试");
                                }
                            });
                            return true;
                        },
                    }, step => {
                        if (step === "name") {
                            RoleNameView.openFor(home, model, context.role);
                        } else {
                            WelcomeGiftView.openFor(home, model, context.role);
                        }
                    });
                },
            }),
        ];
    }

    /** 把连接和页面提示交给当前主城；根页尚未挂载时没有提示栏。 */
    public showNotice(message: string): void {
        this.home?.showNotice(message);
    }

    /** 同步结束旧角色的开页意图并关闭功能页、常驻窗和闲置界面。 */
    public clearRolePages(): void {
        const ui = UIManager.instance;
        this.features.reset();
        ui.invalidatePending();
        this.navigation.back();
        ui.closeAllResidents();
        ui.clearCached();
    }

    /** 场景退出，先关闭活动页，再释放页面绑定和主城底板索引。 */
    public dispose(): void {
        this.features.dispose();
        UIManager.instance.closeAllResidents();
        this.navigation.dispose();
        for (const unregister of this.unregister) {
            unregister();
        }
        this.home = null;
        CityMapService.instance.clearCitySpriteCache();
    }
}
