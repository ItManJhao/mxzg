/**
 * 应用页面依赖装配：只绑定登录/主城Controller与当前场景宿主，不重复保存页面地址或展示参数。
 * 各View的@UIRegistry.view负责静态登记；普通页面导入只让装饰器执行，不下载资源、不属于LoadingPlan。
 * 当前应用撤销时解除自己的依赖绑定，恢复View自身定义，不持有第二份业务状态。
 */
import {Node} from "cc";
import "../../features/battle/ui/MainChapterBattleView";
import "../../features/battle/ui/MainChapterView";
import "../../features/battle/ui/BattleDetailLayer";
import "../../features/battle/ui/ChapterRewardInfoView";
import "../../features/account/ui/RoleProfileView";
import "../../features/account/ui/ServerPickerView";
import "../../features/bag/ui/BagView";
import "../../features/bag/ui/BagInfoView";
import "../../features/hero/ui/FormationView";
import "../../features/hero/ui/HeroInfoView";
import "../../features/hero/ui/HeroListView";
import "../../features/hero/ui/HeroSkillView";
import {AccountController} from "../../features/account/AccountController";
import {AccountModel} from "../../features/account/AccountModel";
import {AccountService} from "../../features/account/AccountService";
import {ServerSelection} from "../../features/account/ServerSelection";
import {AccountLoginView} from "../../features/account/ui/AccountLoginView";
import {HomeController} from "../../features/home/HomeController";
import {RemakeHomeView} from "../../features/home/ui/RemakeHomeView";
import { UIManager } from "../../framework/ui/UIManager";
import { UIRegistry } from "../../framework/ui/UIRegistry";
import {HomeFeatureNavigation} from "./HomeFeatureNavigation";
import {LoginEntry} from "./LoginEntry";

/** 应用拥有的依赖和动作；View参数不保存账号凭证或复制模块状态。 */
export interface ApplicationPageContext {
    /** 当前场景的公共弹窗宿主，应用销毁时解除绑定。 */
    pageHost: Node;

    /** true表示本应用仍存活，异步打开失败时据此拒绝旧提示。 */
    valid(): boolean;

    /** 统一登录和角色状态，Controller与资料页读取同一实例。 */
    model: AccountModel;
    /** 当前应用账号服务，负责登录、退出和WS鉴权。 */
    service: AccountService;
    /** 唯一选服状态，弹窗只修改选择，不发登录请求。 */
    servers: ServerSelection;
    /** 登录成功后显式进入游戏的路由状态。 */
    entry: LoginEntry;
    /** 主城导航操作，页面只转交玩家意图。 */
    features: HomeFeatureNavigation;

    /** 账号动作结束后由应用重新核对当前路由。 */
    syncRoute(): void;

    /** 主城创建完成时让应用取得其内容宿主。 */
    onHome(view: RemakeHomeView): void;

}

/** 无状态装配入口；页面资源时机只在LoadingPlan配置。 */
export class ApplicationPages {
    private constructor() {
    }

    /** 为当前应用绑定两个Controller和公共宿主，返回仅撤销本次装配的清理函数。 */
    public static register(context: ApplicationPageContext): Array<() => void> {
        const {model, service, servers, entry, features} = context;
        const ui = UIManager.instance;
        let homeView: RemakeHomeView | null = null;
        return [
            ui.setResidentHost("remake-modal", () => context.pageHost),
            UIRegistry.bindViewRuntime(AccountLoginView, {
                createController: view => new AccountController(model, service, view as AccountLoginView, () => {
                    ui.closeById("server-picker");
                    entry.confirm();
                    context.syncRoute();
                }, {
                    selection: servers,
                    openPicker: () => {
                        void ui.openById("server-picker", servers).catch(error => {
                            if (!context.valid() || UIManager.isOpenCancelled(error)) return;
                            model.replace({
                                ...model.snapshot,
                                error: error instanceof Error ? error.message : "选服界面加载失败"
                            });
                        });
                    },
                }),
            }),
            UIRegistry.bindViewRuntime(RemakeHomeView, {
                createController: view => {
                    homeView = view as RemakeHomeView;
                    context.onHome(homeView);
                    return new HomeController(model, service, homeView, id => {
                        if (id !== "role-profile") return features.open(id);
                        if (!model.snapshot.role || model.snapshot.busy) return false;
                        void ui.openById("role-profile", {
                            model,
                            logout: () => service.logout(),
                            notice: (text: string) => ui.toast(text),
                        }).catch(error => {
                            if (!UIManager.isOpenCancelled(error)) homeView?.showNotice("角色详情打开失败，请重试");
                        });
                        return true;
                    });
                },
            }),
        ];
    }
}
