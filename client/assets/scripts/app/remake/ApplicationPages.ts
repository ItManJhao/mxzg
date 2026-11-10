/** 正式页面登记：集中维护类、预制体与页面生命周期适配，业务会话由应用注入，不创建网络连接。 */
import { MainChapterBattleView } from "../../features/battle/ui/MainChapterBattleView";
import { MainChapterView } from "../../features/battle/ui/MainChapterView";
import { BattleDetailLayer } from "../../features/battle/ui/BattleDetailLayer";
import { ChapterRewardInfoView } from "../../features/battle/ui/ChapterRewardInfoView";
import { Node, Prefab } from "cc";
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
import { mountHeroListPage } from "../../features/hero/ui/heroMount";
import { HomeController } from "../../features/home/HomeController";
import { RemakeHomeView } from "../../features/home/ui/RemakeHomeView";
import { ResourceCatalog } from "../../framework/assets/ResourceCatalog";
import { UILayer } from "../../framework/ui/UILayer";
import { UIManager, isOpenCancelled } from "../../framework/ui/UIManager";
import { registerView, viewSpecOf } from "../../framework/ui/UIRegistry";
import { ApplicationResources } from "./ApplicationResources";
import { HomeFeatureNavigation } from "./HomeFeatureNavigation";
import { LoginEntry } from "./LoginEntry";

/** 页面登记需要的应用边界，回调读取当前路由而非复制账号状态。 */
export interface ApplicationPageContext {
    pageHost: Node;
    loginPrefab: Prefab;
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

    /** 返回全部登记的撤销函数，应用关闭时逐个撤销，不影响其他所有者。 */
    public static register(context: ApplicationPageContext): Array<() => void> {
        const { model, service, servers, entry, resources, features, openGm } = context;
        const ui = UIManager.instance;
        const syncRoute = () => context.syncRoute();
        let homeView: RemakeHomeView | null = null;
        const stops: Array<() => void> = [];
        stops.push(ui.setResidentHost("remake-modal", () => context.pageHost));
        stops.push(registerView(BattleDetailLayer, {
            load: () => resources.battlePage("detail"),
            id: "battle-detail", prefab: "prefabs/ui/battle/BattleDetailLayer", layer: UILayer.Popup,
            cache: false, allowMultiple: false, hostId: "remake-modal",
        }));
        stops.push(registerView(ChapterRewardInfoView, {
            id: "chapter-reward-info", prefab: "prefabs/ui/battle/ChapterRewardInfoView", layer: UILayer.Popup,
            cache: false, allowMultiple: false, hostId: "remake-modal",
        }));
        stops.push(registerView(ServerPickerView, {
            id: "server-picker", prefab: ResourceCatalog.prefab_login.ServerPickerView.assetPath, layer: UILayer.Popup,
            cache: false, allowMultiple: false, hostId: "remake-modal",
            load: () => {
                return resources.featurePage("servers");
            },
        }));
        stops.push(registerView(RoleProfileView, {
            id: "role-profile", prefab: ResourceCatalog.prefab_account.RoleProfileView.assetPath,
            layer: UILayer.Popup, cache: false, allowMultiple: false, hostId: "remake-modal",
        }));
        // All business composition lives here. The UI framework imports no account/home classes.
        stops.push(registerView(AccountLoginView, {
            id: "remake-login", prefab: ResourceCatalog.prefab_account.AccountLoginView.assetPath, layer: UILayer.Page,
            cache: false, allowMultiple: false, load: async () => context.loginPrefab,
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
            id: "remake-home", prefab: ResourceCatalog.prefab_remake_home.RemakeHomeView.assetPath, layer: UILayer.Page,
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
            id: "main-chapter-battle", prefab: ResourceCatalog.prefab_battle.MainChapterBattleView.assetPath,
            layer: UILayer.Popup, cache: false, allowMultiple: false, hostId: "main-chapter-field",
        }));
        stops.push(registerView(MainChapterView, {
            id: "remake-campaign", prefab: ResourceCatalog.prefab_battle.MainChapterView.assetPath,
            layer: UILayer.Page, cache: false, allowMultiple: false,
            load: () => resources.battlePage(),
        }));
        stops.push(registerView(FormationView, {
            id: "remake-formation", prefab: ResourceCatalog.prefab_hero.FormationView.assetPath,
            layer: UILayer.Popup, cache: false, allowMultiple: false, hostId: "remake-modal",
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
            id: "hero", prefab: ResourceCatalog.prefab_hero.HeroListView.assetPath, layer: UILayer.Page, cache: false, allowMultiple: false,
            mount: mountHeroListPage, load: () => {
                return resources.heroPage();
            },
        }));
        stops.push(registerView(HeroInfoView, {
            id: "hero-info", prefab: ResourceCatalog.prefab_hero.HeroInfoView.assetPath, layer: UILayer.Page, cache: false, allowMultiple: false,
            mount: mountHeroListPage, load: () => resources.heroPage(true),
        }));
        stops.push(registerView(HeroSkillView, {
            id: "hero-skill", prefab: ResourceCatalog.prefab_hero.HeroSkillView.assetPath, layer: UILayer.Popup, cache: false, allowMultiple: false, hostId: "remake-modal",
            load: () => resources.heroSkillPage(),
        }));
        return stops;
    }
}
