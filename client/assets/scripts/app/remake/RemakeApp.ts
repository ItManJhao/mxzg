/**
 * 重做版应用装配入口，装配选服、登录、角色和背包；其他玩法入口暂停。
 * 应用持有模块服务及资源作用域，界面通过唯一 UIManager 打开，关闭应用时统一释放。
 */
import {BagModel} from "../../features/Bag/BagModel";

import { ResourceCatalog } from "../../framework/assets/ResourceCatalog";
import { GameConfig } from "../../config/GameConfig";
import { GConfig } from "../../config/GConfig";

import { _decorator, Asset, Component, director, Director, Node, Prefab, sys, game, Game } from "cc";
import { AccountModel } from "../../features/account/AccountModel";
import { AccountApi, readSession, readRole } from "../../features/account/AccountApi";
import { GameSocketClient } from "../../platform/GameSocketClient";
import { readBagItems, readTimedItems } from "../../features/Bag/data/BagItemData";
import { AccountService } from "../../features/account/AccountService";
import { AccountController } from "../../features/account/AccountController";
import { AccountLoginView } from "../../features/account/ui/AccountLoginView";
import { HomeController } from "../../features/home/HomeController";
import { RemakeHomeView } from "../../features/home/ui/RemakeHomeView";
import { UIManager, isOpenCancelled } from "../../framework/ui/UIManager";
import { registerView } from "../../framework/ui/UIRegistry";
import { UILayer } from "../../framework/ui/UILayer";
import { RemakeNavigation } from "./RemakeNavigation";
import { prepareStartupConfig } from "../../config/RemakeConfig";
import { BootChrome, loadBootCopy } from "./bootChrome";
import { playLogoSplash } from "./logoSplash";
import type { LogoSplashHandle } from "./logoSplash";
import { runStartup, StartupCancelled } from "./StartupFlow";
import { LoginEntry } from "./LoginEntry";
import { createStartupResourceScope, STARTUP_RESOURCE_KEYS } from "./StartupResources";
import type { ResourceScope } from "../../framework/assets/ResourcePool";
import { createHomeResourceScope } from "./HomeResources";
import { HomeFeatureNavigation, REMAKE_FEATURE_ROUTES } from "./HomeFeatureNavigation";
import { ServerSelection } from "../../features/account/ServerSelection";
import { ServerPickerView } from "../../features/account/ui/ServerPickerView";
import { slideFeaturePage } from "./PageTransition";
import { createFeatureResourceScope, loadFeaturePage } from "./FeatureResources";
import { BagView } from "../../features/Bag/ui/BagView";
import { PREVIEW } from "cc/env";
import { GameLog } from "../../core/GameLog";
import { formatServerFrame } from "../../platform/GameProtocolLog";
import { GAME_SOCKET_PROTOCOL } from "../../platform/GameProtocolCodec";
import { BagController } from "../../features/Bag/BagController";
import { mountBagPage } from "../../features/Bag/ui/BagMount";

import { isolatedSocketPreview } from "./IsolatedSocketPreview";
import { AssetStateBinding } from "./AssetStateBinding";
import { RoleController } from "../../features/account/RoleController";

const { ccclass, property } = _decorator;
const SESSION_KEY = "mxzg.remake.developmentSession";

/** Application composition and startup; existing loading artwork and page manager are reused. */
@ccclass("RemakeApp")
export class RemakeApp extends Component {
  @property(Prefab) loginPrefab: Prefab | null = null;
  @property(Prefab) loadingPrefab: Prefab | null = null;
  @property(Node) pageHost: Node | null = null;
  @property(Node) startupHost: Node | null = null;
  /** 完整长连接地址，由场景保存；凭证不进入 URL。 */
  @property socketUrl = "ws://127.0.0.1:18080/api/v1/game/socket";
  private gameSocket: GameSocketClient | null = null;
  private navigation: RemakeNavigation | null = null;
  private offAccount: (() => void) | null = null;
  /** 应用持有的角色与背包统一状态协调器，销毁时先解除，再释放模块。 */
  private assetState: AssetStateBinding | null = null;
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
  private features: HomeFeatureNavigation | null = null;
  private featureResources: ResourceScope<Prefab> | null = null;

  /** 编辑器启动应用时装配唯一会话服务和页面注册，并执行新链路启动流程。 */
  async start(): Promise<void> {
    if (!this.loginPrefab || !this.loadingPrefab || !this.pageHost || !this.startupHost) throw new Error("Remake 场景未绑定页面/加载 Prefab 或启动宿主，请重新打开已更新的 Remake.scene");
    const model = new AccountModel();
    const connection=await isolatedSocketPreview(this.socketUrl,sys.localStorage);
    if(!this.isValid)return;
    const socket = new GameSocketClient(connection.socketUrl, {
      create: url => new WebSocket(url, GAME_SOCKET_PROTOCOL),
      onReceive: PREVIEW ? frame => {
        const message = formatServerFrame(frame);
        if (message) GameLog.shared.debug("WS接收", message);
      } : undefined,
      validateSnapshot: value => {
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("恢复数据无效");
        const snapshot = value as Record<string, unknown>;
        readRole(snapshot.role); readBagItems(snapshot.inventory); readTimedItems(snapshot.timedInventory);
        if(!Number.isSafeInteger(snapshot.revision) || Number(snapshot.revision)<0) throw new Error("状态版本无效");
      },
    });
    this.gameSocket = socket;
    game.on(Game.EVENT_HIDE, this.onBackground, this);
    game.on(Game.EVENT_SHOW, this.onForeground, this);
    const api = new AccountApi(socket);
    const storage = connection.storage;
    let savedServer: string | null = null;
    try { savedServer = storage.getItem("mxzg.remake.selectedServer"); } catch { }
    const servers = new ServerSelection(socket, id => storage.setItem("mxzg.remake.selectedServer", id), savedServer);
    const service = new AccountService(model, api, {
      read: () => { const saved = storage.getItem(SESSION_KEY); return saved ? readSession(JSON.parse(saved)) : null; },
      write: session => storage.setItem(SESSION_KEY, JSON.stringify(session)),
      clear: () => storage.removeItem(SESSION_KEY),
    });
    BagController.instance.initialize();
    this.bagModule = BagController.instance;
    const roleController=new RoleController(role=>service.acceptRole(role));
    const assets=this.assetState=new AssetStateBinding(model,BagController.instance,roleController);
    service.onInitialized=frame=>assets.apply(frame);
    socket.onState=frame=>assets.apply(frame);
    let connectionNotice = "";
    socket.onRejected = (token, message) => service.rejectSession(token, message);
    // 重连鉴权首包就是统一恢复数据，不再单独补查钱包或背包。
    socket.onReady = () => {
      if (connectionNotice) homeView?.showNotice("");
      connectionNotice = "";
      if (!model.snapshot.role || model.snapshot.busy) return;
      if(socket.latestState) assets.apply(socket.latestState);
    };
    // 连接提示不改变账号 busy/role，避免断网被误当换号而清空模块和在途收据。
    socket.onDisconnected = message => {
      if (!model.snapshot.role || model.snapshot.busy) return;
      connectionNotice = message;
      homeView?.showNotice(message);
    };
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
      id: "server-picker", prefab: ResourceCatalog.prefab_login.ServerPickerView.assetPath, layer: UILayer.Popup,
      cache: false, allowMultiple: false, hostId: "remake-modal",
      load: () => {
        if (!this.featureResources) this.featureResources = createFeatureResourceScope();
        return loadFeaturePage(this.featureResources,"servers");
      },
    }));
    // All business composition lives here. The UI framework imports no account/home classes.
    this.unregisterViews.push(registerView(AccountLoginView, {
      id: "remake-login", prefab: ResourceCatalog.prefab_account.AccountLoginView.assetPath, layer: UILayer.Page,
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
      } }),
    }));
    this.unregisterViews.push(registerView(RemakeHomeView, {
      id: "remake-home", prefab: ResourceCatalog.prefab_remake_home.RemakeHomeView.assetPath, layer: UILayer.Page,
      cache: false, allowMultiple: false, load: async () => {
        if (!this.homeResources) this.homeResources = createHomeResourceScope();
        return this.homeResources.load("home");
      },
      createController: view => {
        homeView = view as RemakeHomeView;
        return new HomeController(model, service, homeView, id => features.open(id));
      },
    }));
    const loadFeature = (group: "bag" | "campaign" | "formation") => {
      if (!this.featureResources) this.featureResources = createFeatureResourceScope();
      return loadFeaturePage(this.featureResources,group);
    };
    this.unregisterViews.push(registerView(BagView, {
      id:"bag",prefab:ResourceCatalog.prefab_Bag.BagView.assetPath,layer:UILayer.Page,cache:false,allowMultiple:false,
      mount:mountBagPage,load:() => loadFeature("bag"),
    }));
    this.alive = true;
    this.startupResources = createStartupResourceScope();
    syncRoute = () => {
      if (!this.alive || !this.started) return;
      if(model.snapshot.busy || !model.snapshot.role)ui.closeById("hero-level");
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
            const copy = await loadBootCopy();
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
  /** 平台进入后台时由应用统一暂停通信及背包计时，不让背包控制器依赖账号。 */
  private onBackground(): void {
    BagModel.instance.suspendClock();
    this.gameSocket?.setBackground(true);
  }

  /** 返回前台只恢复已登录会话；新鉴权首包统一校准库存和服务器时间。 */
  private onForeground(): void { this.gameSocket?.setBackground(false); }

  /** 应用销毁时先关闭页面，再释放模块、会话观察和资源作用域。 */
  onDestroy(): void {
    this.alive = false;
    this.started = false;
    game.off(Game.EVENT_HIDE, this.onBackground, this);
    game.off(Game.EVENT_SHOW, this.onForeground, this);
    if (this.gameSocket) {
      this.gameSocket.onReady = this.gameSocket.onDisconnected = this.gameSocket.onRejected = this.gameSocket.onState = null;
      this.gameSocket.disconnect(); this.gameSocket = null;
    }
    this.routeEpoch++;
    for (const done of this.paintWaiters) done();
    this.logo?.stop(); this.logo?.stopMusic(); this.logo = null;
    this.chrome?.destroy(); this.chrome = null;
    this.startupResources?.dispose(); this.startupResources = null;
    this.assetState?.dispose(); this.assetState = null;
    this.offAccount?.(); this.offAccount = null;
    this.features?.dispose(); this.features = null;
    UIManager.instance.closeById("server-picker");
    UIManager.instance.closeById("remake-formation");
    this.navigation?.dispose(); this.navigation = null;
    this.bagModule?.dispose(); this.bagModule = null;
    this.homeResources?.dispose(); this.homeResources = null;
    this.featureResources?.dispose(); this.featureResources = null;
    for (const unregister of this.unregisterViews.splice(0)) unregister();
  }
  /** 无单调时钟的平台持续累计背包时间，不随背包窗口关闭停止。 */
  update(dt: number): void { BagModel.instance.advanceClock(dt); }

}
