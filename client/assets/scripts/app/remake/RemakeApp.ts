import { _decorator, Asset, Component, director, Director, Node, Prefab, sys } from "cc";
import { AccountModel } from "../../features/account/AccountModel";
import { AccountApi, readSession } from "../../features/account/AccountApi";
import { AccountService } from "../../features/account/AccountService";
import { AccountController } from "../../features/account/AccountController";
import { AccountLoginView } from "../../features/account/ui/AccountLoginView";
import { JsonClient } from "../../platform/http/JsonClient";
import { createXhrAdapter } from "../../platform/http/XhrAdapter";
import { HomeController } from "../../features/home/HomeController";
import { RemakeHomeView } from "../../features/home/ui/RemakeHomeView";
import { UIManager, isOpenCancelled } from "../../framework/ui/UIManager";
import { registerView } from "../../framework/ui/UIRegistry";
import { UILayer } from "../../framework/ui/UILayer";
import { RemakeNavigation } from "./RemakeNavigation";
import { prepareStartupConfig, remakeConfig } from "../../config/RemakeConfig";
import { BootChrome, loadBootCopy } from "../../ui/bootChrome";
import { playLogoSplash } from "../../ui/logoSplash";
import type { LogoSplashHandle } from "../../ui/logoSplash";
import { runStartup, StartupCancelled } from "./StartupFlow";
import { LoginEntry } from "./LoginEntry";
import { createStartupResourceScope, STARTUP_RESOURCE_KEYS } from "./StartupResources";
import type { ResourceScope } from "../../framework/assets/ResourcePool";
import { createHomeResourceScope } from "./HomeResources";
import { createHeroResourceScope, loadHeroPage } from "./HeroResources";
import { HeroListView } from "../../features/hero/ui/HeroListView";
import { mountHeroListPage } from "../../features/hero/ui/heroMount";
import { HeroApi } from "../../features/hero/HeroApi";
import { HeroCatalog } from "../../features/hero/HeroCatalog";
import { HeroRosterModel } from "../../features/hero/HeroRosterModel";
import { HeroRosterService } from "../../features/hero/HeroRosterService";
import { HeroRosterController } from "../../features/hero/HeroRosterController";
import { HomeFeatureNavigation, REMAKE_FEATURE_ROUTES } from "./HomeFeatureNavigation";
import { ServerSelection } from "../../features/account/ServerSelection";
import { ServerPickerView } from "../../features/account/ui/ServerPickerView";
import { CampaignApi } from "../../features/battle/CampaignApi";
import { slideFeaturePage } from "./PageTransition";
import { createFeatureResourceScope, loadFeaturePage } from "./FeatureResources";
import { BagView } from "../../features/Bag/ui/BagView";
import { BagController } from "../../features/Bag/BagController";
import { mountBackpackPage } from "../../features/Bag/ui/BagMount";
import { BagApi } from "../../features/Bag/BagApi";
import { BagItemCatalog } from "../../features/Bag/BagItemCatalog";
import { CampaignController } from "../../features/battle/CampaignController";
import { CampaignView } from "../../features/battle/ui/CampaignView";
import { mountCampaignPage } from "../../features/battle/ui/CampaignMount";
import { FormationView } from "../../features/hero/ui/FormationView";
import { FormationController } from "../../features/hero/FormationController";
import { LineupApi } from "../../features/hero/LineupApi";

const { ccclass, property } = _decorator;
const SESSION_KEY = "mxzg.remake.developmentSession";

/** Application composition and startup; existing loading artwork and page manager are reused. */
@ccclass("RemakeApp")
export class RemakeApp extends Component {
  @property(Prefab) loginPrefab: Prefab | null = null;
  @property(Prefab) loadingPrefab: Prefab | null = null;
  @property(Node) pageHost: Node | null = null;
  @property(Node) startupHost: Node | null = null;
  @property apiBaseUrl = "http://127.0.0.1:18080";
  private navigation: RemakeNavigation | null = null;
  private offAccount: (() => void) | null = null;
  private bagModule: BagController | null = null;
  private unregisterViews: Array<() => void> = [];
  private requestedRoute = "";
  private alive = false;
  private started = false;
  private chrome: BootChrome | null = null;
  private logo: LogoSplashHandle | null = null;
  private routeEpoch = 0;
  private routePending = false;
  private paintWaiters = new Set<() => void>();
  private startupResources: ResourceScope<Asset> | null = null;
  private homeResources: ResourceScope<Prefab> | null = null;
  private heroResources: ResourceScope<Prefab> | null = null;
  private features: HomeFeatureNavigation | null = null;
  private featureResources: ResourceScope<Prefab> | null = null;

  start(): void {
    if (!this.loginPrefab || !this.loadingPrefab || !this.pageHost || !this.startupHost) throw new Error("Remake 场景未绑定页面/加载 Prefab 或启动宿主，请重新打开已更新的 Remake.scene");
    const model = new AccountModel();
    const http = new JsonClient(this.apiBaseUrl, createXhrAdapter());
    const api = new AccountApi(http);
    const storage = sys.localStorage;
    let savedServer: string | null = null;
    try { savedServer = storage.getItem("mxzg.remake.selectedServer"); } catch { }
    const servers = new ServerSelection(http, id => storage.setItem("mxzg.remake.selectedServer", id), savedServer);
    const campaignApi = new CampaignApi(http);
    const service = new AccountService(model, api, {
      read: () => { const saved = storage.getItem(SESSION_KEY); return saved ? readSession(JSON.parse(saved)) : null; },
      write: session => storage.setItem(SESSION_KEY, JSON.stringify(session)),
      clear: () => storage.removeItem(SESSION_KEY),
    });
    BagController.instance.initialize({ account: model, authorization: service, api: new BagApi(http) });
    this.bagModule = BagController.instance;
    const ui = UIManager.instance;
    const entry = new LoginEntry();
    let homeView: RemakeHomeView | null = null;
    let syncRoute = () => {};
    this.navigation = new RemakeNavigation(ui, this.pageHost, {
      parent: id => Object.values(REMAKE_FEATURE_ROUTES).includes(id) ? homeView?.featureHost || null : null,
      content: () => homeView?.cityContent || null,
      changed: id => homeView?.showFeature(id === "remake-campaign" ? "battle" : id === "hero" || id === "bag" ? id : "city"),
    },slideFeaturePage);
    const features = this.features = new HomeFeatureNavigation(ui, {
      current: () => this.navigation?.current || null,
      authorized: () => this.alive && this.started && !model.snapshot.busy && !!model.snapshot.role && entry.route(true) === "remake-home",
      notice: text => homeView?.showNotice(text),
    });
    ui.install(this.navigation, { showToast: text => console.warn("[RemakeUI] " + text) });
    this.unregisterViews.push(ui.setResidentHost("remake-modal", () => this.pageHost));
    this.unregisterViews.push(registerView(ServerPickerView, {
      id: "server-picker", prefab: "prefabs/ui/login/ChooseServerLayer", layer: UILayer.Popup,
      cache: false, allowMultiple: false, hostId: "remake-modal",
      load: () => {
        if (!this.featureResources) this.featureResources = createFeatureResourceScope();
        return loadFeaturePage(this.featureResources,"servers");
      },
    }));
    // All business composition lives here. The UI framework imports no account/home classes.
    this.unregisterViews.push(registerView(AccountLoginView, {
      id: "remake-login", prefab: "prefabs/ui/account/AccountLogin", layer: UILayer.Page,
      cache: false, allowMultiple: false, load: async () => this.loginPrefab!,
      createController: view => new AccountController(model, service, view as AccountLoginView, () => {
        ui.closeById("server-picker");
        entry.confirm();
        syncRoute();
      }, { selection: servers, openPicker: () => {
        void ui.openById("server-picker", servers).catch(error => {
          if (!this.alive || isOpenCancelled(error)) return;
          model.replace({ ...model.snapshot, error: error instanceof Error ? error.message : "选服界面加载失败" });
        });
      } }, async () => {
        await service.authenticated(token => campaignApi.initialize(token));
        await BagController.instance.refresh(true);
      }),
    }));
    this.unregisterViews.push(registerView(RemakeHomeView, {
      id: "remake-home", prefab: "bundles/remake-home/RemakeHome", layer: UILayer.Page,
      cache: false, allowMultiple: false, load: async () => {
        if (!this.homeResources) this.homeResources = createHomeResourceScope();
        return this.homeResources.load("home");
      },
      createController: view => {
        homeView = view as RemakeHomeView;
        return new HomeController(model, service, homeView, id => features.open(id));
      },
    }));
    this.unregisterViews.push(registerView(HeroListView, {
      id: "hero", prefab: "prefabs/ui/hero/HeroListLayer", layer: UILayer.Page,
      cache: false, allowMultiple: false, mount: mountHeroListPage,
      load: async () => {
        if (!this.heroResources) this.heroResources = createHeroResourceScope();
        return loadHeroPage(this.heroResources);
      },
      createController: view => {
        const catalog = new HeroCatalog(remakeConfig.get("config/herotype"), remakeConfig.get("config/item"));
        const roster = new HeroRosterModel();
        const rosterService = new HeroRosterService(roster, model, service, new HeroApi(http));
        try {
          return new HeroRosterController(roster, rosterService, catalog, view as HeroListView, text => homeView?.showNotice(text));
        } catch (error) { rosterService.dispose(); throw error; }
      },
    }));
    const itemCatalog = () => new BagItemCatalog(remakeConfig.get<{rows:Record<string,unknown>[]}>("config/item")!,
      remakeConfig.get<{rows:Record<string,unknown>[]}>("config/language")!);
    const loadFeature = (group: "bag" | "campaign" | "formation") => {
      if (!this.featureResources) this.featureResources = createFeatureResourceScope();
      return loadFeaturePage(this.featureResources,group);
    };
    this.unregisterViews.push(registerView(FormationView, {
      id:"remake-formation",prefab:"prefabs/ui/hero/HeroSelectLayer",layer:UILayer.Popup,hostId:"remake-modal",cache:false,allowMultiple:false,
      load:()=>loadFeature("formation"),
      createController:view=>new FormationController(model,service,new HeroApi(http),new LineupApi(http),
        new HeroCatalog(remakeConfig.get("config/herotype"),remakeConfig.get("config/item")),view as FormationView),
    }));
    const chooseFormation = () => new Promise<boolean>((resolve,reject)=>{
      void ui.openById("remake-formation",{complete:resolve}).catch(reject);
    });
    this.unregisterViews.push(registerView(BagView, {
      id:"bag",prefab:"prefabs/ui/backpack/BackpackLayer",layer:UILayer.Page,cache:false,allowMultiple:false,
      mount:mountBackpackPage,load:() => loadFeature("bag"),
    }));
    this.unregisterViews.push(registerView(CampaignView, {
      id:"remake-campaign",prefab:"prefabs/ui/battle/BattlePanelLayer",layer:UILayer.Page,cache:false,allowMultiple:false,
      mount:mountCampaignPage,load:() => loadFeature("campaign"),
      createController:view => {
        (view as CampaignView).configure(itemCatalog(),() => model.snapshot.role?.level || 1,chooseFormation,()=>{ui.closeById("remake-formation");});
        return new CampaignController(model,service,campaignApi,view as CampaignView,text => homeView?.showNotice(text));
      },
    }));
    this.alive = true;
    this.startupResources = createStartupResourceScope();
    syncRoute = () => {
      if (!this.alive || !this.started) return;
      if (model.snapshot.busy) {
        this.chrome?.show();
        this.chrome?.setStage("同步角色资料");
        this.chrome?.setRatio(0);
        return;
      }
      if (!model.snapshot.role) { entry.reset(); features.reset(); }
      const route = entry.route(!!model.snapshot.role);
      if (route === this.requestedRoute) {
        if (!this.routePending) this.chrome?.hide();
        return;
      }
      this.requestedRoute = route;
      ui.keepOnly(route);
      const epoch = ++this.routeEpoch;
      this.routePending = true;
      this.chrome?.show();
      this.chrome?.setStage(route === "remake-home" ? "准备主城" : "准备登录界面");
      this.chrome?.setRatio(0);
      void ui.openById(route).then(async () => {
        if (!this.alive || epoch !== this.routeEpoch) return;
        this.chrome?.setRatio(1);
        await this.reveal(epoch, route === "remake-home");
        if (epoch === this.routeEpoch) this.routePending = false;
      }).catch(async error => {
        if (!this.alive || epoch !== this.routeEpoch) return;
        this.routePending = false;
        if (isOpenCancelled(error)) {
          // A login -> home -> login change can cancel an earlier load of the same route.
          if (this.requestedRoute === route) { this.requestedRoute = ""; syncRoute(); }
          return;
        }
        if (this.requestedRoute === route) this.requestedRoute = "";
        console.error("[RemakeUI] " + route, error);
        if (await this.chrome?.prompt("界面加载失败，请重试", "重试")) syncRoute();
      });
    };
    this.offAccount = model.subscribe(syncRoute);
    void this.boot(async () => {
      await servers.load();
      await service.restore();
    }, async () => {
      const route = entry.route(!!model.snapshot.role);
      this.requestedRoute = route;
      ui.keepOnly(route);
      await ui.openById(route);
    }).then(() => {
      if (!this.alive) return;
      this.started = true;
      syncRoute();
    }).catch(error => {
      if (this.alive) console.error("[RemakeStartup]", error);
    });
  }

  private async boot(restore: () => Promise<void>, openPage: () => Promise<void>): Promise<void> {
    const chrome = this.chrome = new BootChrome(this.startupHost!, async () => this.loadingPrefab!);
    const logo = this.logo = playLogoSplash(this.startupHost!, this.node);
    await logo.fadedIn;
    if (!this.alive) return;
    await chrome.open("loading", logo.node);
    if (!this.alive) return;
    if (!chrome.isReady) throw new Error("已有 LoadingLayer 加载失败");
    await logo.held;
    if (!this.alive) return;
    logo.dismiss();
    await logo.done;
    while (this.alive) {
      try {
        chrome.show();
        await runStartup([
          { label: "加载游戏配置", weight: 50, run: async progress => {
            await prepareStartupConfig(progress);
            const copy = await loadBootCopy(<T>(path: string) => remakeConfig.read<T>(path));
            if (this.alive) chrome.setTips(copy.tips);
          } },
          { label: "加载界面资源", weight: 20, run: async progress => {
            let done = 0;
            await Promise.all(STARTUP_RESOURCE_KEYS.map(async key => {
              await this.startupResources!.load(key);
              progress(++done, STARTUP_RESOURCE_KEYS.length);
            }));
          } },
          { label: "准备账号信息", weight: 10, run: async () => restore() },
          { label: "准备登录界面", weight: 20, run: async () => openPage() },
        ], (label, ratio) => { chrome.setStage(label); chrome.setRatio(ratio); }, () => this.alive);
        await this.reveal(this.routeEpoch, this.requestedRoute === "remake-home");
        return;
      } catch (error) {
        if (!this.alive || error instanceof StartupCancelled) return;
        console.error("[RemakeStartup] task failed", error);
        if (!await chrome.prompt("加载失败，请重试", "重试")) return;
      }
    }
  }

  private async reveal(epoch: number, home: boolean): Promise<void> {
    await this.afterPaint();
    await this.afterPaint();
    if (!this.alive || epoch !== this.routeEpoch) return;
    await this.chrome?.fadeOut(0.3);
    if (!this.alive || epoch !== this.routeEpoch) return;
    this.chrome?.hide();
    if (home) this.logo?.stopMusic();
  }

  private afterPaint(): Promise<void> {
    if (!this.alive) return Promise.resolve();
    return new Promise(resolve => {
      const done = () => {
        director.off(Director.EVENT_AFTER_DRAW, done);
        this.paintWaiters.delete(done);
        resolve();
      };
      this.paintWaiters.add(done);
      director.once(Director.EVENT_AFTER_DRAW, done);
    });
  }
  onDestroy(): void {
    this.alive = false;
    this.started = false;
    this.routeEpoch++;
    for (const done of this.paintWaiters) done();
    this.logo?.stop(); this.logo?.stopMusic(); this.logo = null;
    this.chrome?.destroy(); this.chrome = null;
    this.startupResources?.dispose(); this.startupResources = null;
    this.offAccount?.(); this.offAccount = null;
    this.features?.dispose(); this.features = null;
    UIManager.instance.closeById("server-picker");
    UIManager.instance.closeById("remake-formation");
    this.navigation?.dispose(); this.navigation = null;
    this.bagModule?.dispose(); this.bagModule = null;
    this.homeResources?.dispose(); this.homeResources = null;
    this.heroResources?.dispose(); this.heroResources = null;
    this.featureResources?.dispose(); this.featureResources = null;
    for (const unregister of this.unregisterViews.splice(0)) unregister();
  }
}
