/** 正式页面登记：集中维护类、预制体与页面生命周期适配，业务会话由应用注入，不创建网络连接。 */
import { MainChapterBattleView } from "../../features/battle/ui/MainChapterBattleView";
import { MainChapterView } from "../../features/battle/ui/MainChapterView";
import { BattleDetailLayer } from "../../features/battle/ui/BattleDetailLayer";
import { ChapterRewardInfoView } from "../../features/battle/ui/ChapterRewardInfoView";
import { Node } from "cc";
import { PREVIEW } from "cc/env";
import { AccountController } from "../../features/account/AccountController";
import { AccountModel } from "../../features/account/AccountModel";
import { AccountService } from "../../features/account/AccountService";
import { ServerSelection } from "../../features/account/ServerSelection";
import { AccountLoginView } from "../../features/account/ui/AccountLoginView";
import { RoleProfileView } from "../../features/account/ui/RoleProfileView";
import { ServerPickerView } from "../../features/account/ui/ServerPickerView";
import { BagView } from "../../features/bag/ui/BagView";
import { BagInfoView } from "../../features/bag/ui/BagInfoView";
import { prepareInventoryConfig } from "../../config/RemakeConfig";
import { FormationView } from "../../features/hero/ui/FormationView";
import { HeroInfoView } from "../../features/hero/ui/HeroInfoView";
import { HeroListView } from "../../features/hero/ui/HeroListView";
import { HeroSkillView } from "../../features/hero/ui/HeroSkillView";
import { HomeController } from "../../features/home/HomeController";
import { RemakeHomeView } from "../../features/home/ui/RemakeHomeView";
import { UILayer } from "../../framework/ui/UILayer";
import { UIManager, isOpenCancelled } from "../../framework/ui/UIManager";
import { registerView, viewSpecOf } from "../../framework/ui/UIRegistry";
import { ApplicationResources } from "./ApplicationResources";
import { HomeFeatureNavigation } from "./HomeFeatureNavigation";
import { LoginEntry } from "./LoginEntry";

/** 页面登记需要的应用边界，回调读取当前路由而非复制账号状态。 */
export interface ApplicationPageContext {
    pageHost: Node;
    valid(): boolean;
    model: AccountModel;
    service: AccountService;
    servers: ServerSelection;
    entry: LoginEntry;
    resources: ApplicationResources;
    features: HomeFeatureNavigation;
    syncRoute(): void;
    onHome(view: RemakeHomeView): void;
    openGm(): void;
}

export class ApplicationPages {
    private constructor() { }

    /** 登记页面的异步资源入口并返回撤销函数；登录页不再由场景提前持有，下载失败由启动流程提供重试。 */
    public static register(context: ApplicationPageContext): Array<() => void> {
        const { model, service, servers, entry, resources, features, openGm } = context;
        const ui = UIManager.instance;
        const syncRoute = () => context.syncRoute();
        let homeView: RemakeHomeView | null = null;
        const stops: Array<() => void> = [];
        stops.push(ui.setResidentHost("remake-modal", () => context.pageHost));
        stops.push(registerView(BattleDetailLayer, {
            load: () => resources.battlePage("detail"),
            id: "battle-detail", prefab: "bundles/battle/prefabs/BattleDetailLayer", layer: UILayer.Popup,
            cache: false, allowMultiple: false, hostId: "remake-modal",
            modal: { mask: true, closeOnOutside: true },
        }));
        stops.push(registerView(ChapterRewardInfoView, {
            id: "chapter-reward-info", prefab: "bundles/battle/prefabs/ChapterRewardInfoView", layer: UILayer.Popup,
            cache: false, allowMultiple: false, hostId: "remake-modal",
            modal: { mask: true, closeOnOutside: true },
        }));
        stops.push(registerView(ServerPickerView, {
            id: "server-picker", prefab: "bundles/login/prefabs/ServerPickerView", layer: UILayer.Popup,
            cache: false, allowMultiple: false, hostId: "remake-modal",
            modal: { mask: true, closeOnOutside: true },
            load: () => {
                return resources.featurePage("servers");
            },
        }));
        stops.push(registerView(RoleProfileView, {
            id: "role-profile", prefab: "bundles/login/prefabs/RoleProfileView",
            layer: UILayer.Popup, cache: false, allowMultiple: false, hostId: "remake-modal",
            modal: { mask: true, closeOnOutside: true },
        }));
        // All business composition lives here. The UI framework imports no account/home classes.
        stops.push(registerView(AccountLoginView, {
            id: "remake-login", prefab: "bundles/login/prefabs/AccountLoginView", layer: UILayer.Page,
            cache: false, allowMultiple: false,
            createController: view => new AccountController(model, service, view as AccountLoginView, () => {
                ui.closeById("server-picker");
                entry.confirm();
                syncRoute();
            }, {
                selection: servers, openPicker: () => {
                    void ui.openById("server-picker", servers).catch(error => {
                        if(!context.valid() || isOpenCancelled(error)) return;
                        model.replace({ ...model.snapshot, error: error instanceof Error ? error.message : "选服界面加载失败" });
                    });
                }
            }),
        }));
        stops.push(registerView(RemakeHomeView, {
            id: "remake-home", prefab: "bundles/home/prefabs/RemakeHomeView", layer: UILayer.Page,
            cache: false, allowMultiple: false, load: async () => {
                return resources.homePage();
            },
            createController: view => {
                homeView = view as RemakeHomeView;
                context.onHome(homeView);
                return new HomeController(model, service, homeView, id => {
                    if(id !== "role-profile") return features.open(id);
                    if(!model.snapshot.role || model.snapshot.busy) return false;
                    void ui.openById("role-profile", {
                        model, openGm: PREVIEW ? openGm : undefined, logout: () => service.logout(), notice: (text: string) => ui.toast(text),
                    }).catch(error => {
                        if(!isOpenCancelled(error)) homeView?.showNotice("角色详情打开失败，请重试");
                    });
                    return true;
                });
            },
        }));
        const loadFeature = (group: "campaign" | "formation") => {
            return resources.featurePage(group);
        };
        stops.push(registerView(MainChapterBattleView, {
            load: () => resources.battlePage("field"),
            id: "main-chapter-battle", prefab: "bundles/battle/prefabs/MainChapterBattleView",
            layer: UILayer.Popup, cache: false, allowMultiple: false, hostId: "main-chapter-field",
        }));
        stops.push(registerView(MainChapterView, {
            id: "remake-campaign", prefab: "bundles/battle/prefabs/MainChapterView",
            layer: UILayer.Page, cache: false, allowMultiple: false,
            load: () => resources.battlePage(),
        }));
        stops.push(registerView(FormationView, {
            id: "remake-formation", prefab: "bundles/hero/prefabs/FormationView",
            layer: UILayer.Popup, cache: false, allowMultiple: false, hostId: "remake-modal",
            modal: { mask: true, closeOnOutside: true },
            load: () => loadFeature("formation"),
        }));
        // 页面注册仅负责点击时的配置前置条件，不参与LoadingPlan的资源选择。
        for (const view of [BagView, BagInfoView]) {
            const spec = viewSpecOf(view)!;
            const load = async () => {
                await prepareInventoryConfig();
                return resources.preparedPage(spec.prefab);
            };
            const unregister = registerView(view, { ...spec, load });
            stops.push(() => {
                if (viewSpecOf(view)?.load !== load) {
                    return;
                }
                unregister();
                registerView(view, spec);
            });
        }
        stops.push(registerView(HeroListView, {
            id: "hero", prefab: "bundles/hero/prefabs/HeroListView", layer: UILayer.Page, cache: false, allowMultiple: false,
            load: () => {
                return resources.heroPage();
            },
        }));
        stops.push(registerView(HeroInfoView, {
            id: "hero-info", prefab: "bundles/hero/prefabs/HeroInfoView", layer: UILayer.Page, cache: false, allowMultiple: false,
            load: () => resources.heroPage(true),
        }));
        stops.push(registerView(HeroSkillView, {
            id: "hero-skill", prefab: "bundles/hero/prefabs/HeroSkillView", layer: UILayer.Popup, cache: false, allowMultiple: false, hostId: "remake-modal",
            modal: { mask: true, closeOnOutside: true },
            load: () => resources.heroSkillPage(),
        }));
        return stops;
    }
}
