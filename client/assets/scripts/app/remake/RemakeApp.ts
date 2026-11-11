/**
 * 重做版应用装配入口，装配选服、登录、角色和背包；其他玩法入口暂停。
 * 应用持有模块服务及资源作用域，界面通过唯一 UIManager 打开，关闭应用时统一释放。
 */
import {clearCitySpriteCache} from "../../features/city/ui/CityMap";
import {clearPrefabCache, collectPrefabCache} from "../../framework/assets/PrefabLoader";
import {ResourceAssetsUtils} from "../../framework/assets/ResourceAssets";
import {AccountComposition} from "./AccountComposition";
import {ApplicationNotice} from "./ApplicationNotice";
import { MainChapterController } from "../../features/battle/MainChapterController";
import {ApplicationPages} from "./ApplicationPages";
import {ApplicationResources} from "./ApplicationResources";
import {DevelopmentPreview} from "./DevelopmentPreview";

import {BattlePreviewController} from "../../features/battle/BattlePreviewController";
import {FormationController} from "../../features/hero/FormationController";

import {BagModel} from "../../features/bag/BagModel";
import {GmController} from "../../features/gm/GmController";
import {GmView} from "../../features/gm/ui/GmView";
import {loadPrefab} from "../../framework/assets/PrefabLoader";
import {Protocol} from "../../platform/Protocol";

import {GameConfig} from "../../config/GameConfig";
import {GConfig} from "../../config/GConfig";

import {_decorator, Component, director, Director, game, Game, Label, Node, Prefab} from "cc";
import {PREVIEW} from "cc/env";
import {GameLog} from "../../core/GameLog";
import {BagController} from "../../features/bag/BagController";
import {HeroRosterController} from "../../features/hero/HeroRosterController";
import {RemakeHomeView} from "../../features/home/ui/RemakeHomeView";
import {UILayer} from "../../framework/ui/UILayer";
import {isOpenCancelled, UIManager} from "../../framework/ui/UIManager";
import {registerView} from "../../framework/ui/UIRegistry";
import {GameSocketClient} from "../../platform/GameSocketClient";
import {BootChrome, loadBootCopy} from "./bootChrome";
import {HomeFeatureNavigation, REMAKE_FEATURE_ROUTES} from "./HomeFeatureNavigation";
import {LoginEntry} from "./LoginEntry";
import type {LogoSplashHandle} from "./logoSplash";
import {playLogoSplash} from "./logoSplash";
import {slideFeaturePage} from "./PageTransition";
import {RemakeNavigation} from "./RemakeNavigation";
import {runStartup, StartupCancelled} from "./StartupFlow";

import {RoleController} from "../../features/account/RoleController";
import {AssetStateBinding} from "./AssetStateBinding";

const {ccclass, property} = _decorator;


/** 应用生命周期入口：协调会话、页面和启动流程，具体装配交给独立组件。 */
@ccclass("RemakeApp")
export class RemakeApp extends Component {
    /** 场景指定的登录预制体，不随会话切换重建配置。 */
    @property(Prefab) loginPrefab: Prefab | null = null;
    /** 启动加载画面，复用项目原有资源。 */
    @property(Prefab) loadingPrefab: Prefab | null = null;
    /** 正式页面的场景宿主。 */
    @property(Node) pageHost: Node | null = null;
    /** 加载画面与启动动画的场景宿主。 */
    @property(Node) startupHost: Node | null = null;
    /** 完整长连接地址，由场景保存；凭证不进入 URL。 */
    @property socketUrl = "ws://127.0.0.1:18080/api/v1/game/socket";
    /** 独立只读战报验收页的清理函数，不影响正常登录流程。 */
    private development: DevelopmentPreview | null = null;
    /** 应用提示独立于主城生命周期。 */
    private notices: ApplicationNotice | null = null;
    /** 独立提示与UIManager的绑定，销毁时只移除本应用句柄。 */
    private offNotice: (() => void) | null = null;
    /** 场景保存提示布局，启动失败也能显示。 */
    @property(Node) noticePanel: Node | null = null;
    /** 独立提示的文字节点，与提示面板静态绑定。 */
    @property(Label) noticeLabel: Label | null = null;
    /** 应用唯一游戏连接，销毁时断开并解除回调。 */
    private gameSocket: GameSocketClient | null = null;
    /** 正式页面导航，负责当前页及主城根页的关闭。 */
    private navigation: RemakeNavigation | null = null;
    /** 账号状态订阅解除函数，应用退出时调用。 */
    private offAccount: (() => void) | null = null;
    /** 应用持有的角色与背包统一状态协调器，销毁时先解除，再释放模块。 */
    private assetState: AssetStateBinding | null = null;
    /** 本应用初始化的背包模块，应用退出时释放。 */
    private bagModule: BagController | null = null;
    /** 本应用登记的页面与宿主撤销函数。 */
    private unregisterViews: Array<() => void> = [];
    /** 最近请求的根路由，避免重复打开相同页面。 */
    private requestedRoute = "";
    /** 应用是否仍接受路由和异步回调。 */
    private alive = false;
    /** 启动任务是否完成，完成前不根据账号状态切页。 */
    private started = false;
    /** 当前启动进度画面及失败重试提示。 */
    private chrome: BootChrome | null = null;
    /** 启动动画句柄，负责取消动画及音乐。 */
    private logo: LogoSplashHandle | null = null;
    /** 路由切换代次，防止旧页面加载完成后隐藏新加载层。 */
    private routeEpoch = 0;
    /** 当前根路由是否仍在等待打开与首帧显示。 */
    private routePending = false;
    /** 等待引擎绘制的完成回调，销毁时统一结束。 */
    private paintWaiters = new Set<() => void>();
    /** 应用预热资源唯一所有者，与页面动态作用域分开。 */
    private readonly resources = new ApplicationResources();
    /** 主城功能导航所有者，只协调已接入的功能入口。 */
    private features: HomeFeatureNavigation | null = null;

    /** 编辑器启动应用时装配唯一会话服务和页面注册，并执行新链路启动流程。 */
    async start(): Promise<void> {
        this.notices = new ApplicationNotice(this.noticePanel, this.noticeLabel);
        this.offNotice = UIManager.instance.bindNotice((text, duration) => this.notices?.show(text, duration));
        try {
            await this.initialize();
        } catch (error) {
            GameLog.shared.classified("APP", "error", "RemakeApp", "启动装配失败：" + String(error));
            if (this.isValid) this.notices.show("启动失败，请重新打开预览", 0);
        }
    }

    /** 开发分流完成后，装配正式会话、业务模块与页面。 */
    private async initialize(): Promise<void> {
        this.development = new DevelopmentPreview(this.pageHost, this.startupHost, () => this.isValid);
        if (await this.development.start()) return;
        if (!this.loginPrefab || !this.loadingPrefab || !this.pageHost || !this.startupHost) throw new Error("Remake 场景未绑定页面/加载 Prefab 或启动宿主，请重新打开已更新的 Remake.scene");
        const {model, socket, service, servers} = await AccountComposition.create(this.socketUrl);
        if (!this.isValid) {
            socket.disconnect();
            return;
        }
        this.gameSocket = socket;
        game.on(Game.EVENT_HIDE, this.onBackground, this);
        game.on(Game.EVENT_SHOW, this.onForeground, this);
        BagController.instance.initialize();
        this.bagModule = BagController.instance;
        const roleController = new RoleController(role => service.acceptRole(role));
        HeroRosterController.instance.initialize();
        const formation = FormationController.instance;
        formation.configure((body, received, failed) => service.deliverAuthenticated(
            token => socket.saveFormation(token, body),
            frame => {
                if (this.alive) received(frame);
            },
            error => {
                if (this.alive) failed(error);
            },
        ));
        formation.initialize();
        const chapter = MainChapterController.instance;
        chapter.configure((name, body, received, failed) => service.deliverAuthenticated(
            token => socket.chapter(token, name, body),
            frame => { if (this.alive) received(frame); },
            error => { if (this.alive) failed(error); },
        ), () => model.snapshot.role?.level || 0, () => {
            const basics = model.snapshot.role?.basics;
            return basics ? { headId: basics.headId, borderId: basics.borderId } : null;
        });
        chapter.initialize();
        const assets = this.assetState = new AssetStateBinding(model, BagController.instance, roleController, HeroRosterController.instance, formation, () => {
            // 身份切换时统一关闭角色页面，页面自身无需比较角色键；取消在途打开也由UIManager负责。
            this.development?.cancelReplay();
            UIManager.instance.closeById("remake-campaign");
            UIManager.instance.closeById("bag");
            UIManager.instance.closeById("remake-formation");
        }, chapter);
        service.onInitialized = frame => assets.apply(frame);
        socket.onState = frame => assets.apply(frame);
        let connectionNotice = "";
        socket.onRejected = (token, message) => service.rejectSession(token, message);
        // 重连鉴权首包就是统一恢复数据，不再单独补查钱包或背包。
        socket.onReady = () => {
            if (connectionNotice) homeView?.showNotice("");
            connectionNotice = "";
            if (!model.snapshot.role || model.snapshot.busy) return;
            if (socket.latestState) assets.apply(socket.latestState);
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
        let syncRoute = () => {
        };
        this.navigation = new RemakeNavigation(ui, this.pageHost, {
            parent: id => Object.values(REMAKE_FEATURE_ROUTES).includes(id) ? homeView?.featureHost || null : null,
            content: () => homeView?.cityContent || null,
            changed: id => homeView?.showFeature(id === "remake-campaign" ? "battle" : id === "hero-info" ? "hero" : id === "hero" || id === "bag" ? id : "city"),
        }, slideFeaturePage);
        const battlePreview = new BattlePreviewController(async (mission, received) => {
            let failure: unknown = null;
            await service.deliverAuthenticated(token => socket.previewBattle(token, mission),
                frame => { if (this.alive) received(frame); }, error => { failure = error; });
            if (failure) throw failure;
        });
        this.unregisterViews.push(() => battlePreview.dispose());
        const gm = new GmController(
            () => service.authenticated(token => socket.request(token, Protocol.GM_STATUS)),
            body => service.authenticated(async token => (await socket.gmGrant(token, body)).body));
        if (PREVIEW) this.unregisterViews.push(registerView(GmView, {
            id: "gm",
            prefab: "prefabs/ui/gm/GmView",
            layer: UILayer.Popup,
            cache: false,
            allowMultiple: false,
            hostId: "remake-modal",
            load: async () => {
                await GameConfig.instance.prepare([GConfig.HeroType, GConfig.Item, GConfig.Language]);
                return loadPrefab("prefabs/ui/gm/GmView");
            }
        }));
        const openGm = () => {
            const role = model.snapshot.role;
            if (!PREVIEW || !role || model.snapshot.busy) return;
            void ui.openById("gm", {
                controller: gm, roleId: role.id, nickname: role.nickname,
                openLineupBattle: (mission: number) => {
                    ui.toast("正在读取保存阵容，仅试战、不发奖…");
                    void battlePreview.preview(mission).then(async result => {
                        if (!result || !this.alive) return;
                        ui.closeById("gm");
                        await this.development?.openLineupBattle(result);
                    }).catch(error => ui.toast("试战失败：" + String(error)));
                }, openSkillAudit: () => {
                    ui.closeById("gm");
                    void this.development!.openSkillAudit().catch(error => ui.toast("技能验收打开失败：" + String(error)));
                }
            }).catch(error => ui.toast("GM 打开失败：" + String(error)));
        };
        const features = this.features = new HomeFeatureNavigation(ui, {
            current: () => this.navigation?.current || null,
            authorized: () => this.alive && this.started && !model.snapshot.busy && !!model.snapshot.role && entry.route(true) === "remake-home",
            notice: text => homeView?.showNotice(text),
        });
        ui.install(this.navigation, {showToast: (text, duration) => this.notices?.show(text, duration)});
        this.unregisterViews.push(...ApplicationPages.register({
            pageHost: this.pageHost,
            loginPrefab: this.loginPrefab!,
            valid: () => this.alive,
            model,
            service,
            servers,
            entry,
            features,
            resources: this.resources,
            openGm,
            syncRoute: () => syncRoute(),
            onHome: view => {
                homeView = view;
            },
        }));
        this.alive = true;
        syncRoute = () => {
            if (!this.alive || !this.started) return;
            if (model.snapshot.busy || !model.snapshot.role) {
                this.resources.stopBackground();
                ui.closeById("remake-formation");
                ui.closeById("hero-level");
                ui.closeById("role-profile");
                ui.closeById("gm");
                gm.reset();
            }
            if (model.snapshot.busy) {
                if (this.routePending) {
                    this.routeEpoch++;
                    this.routePending = false;
                    this.requestedRoute = "";
                }
                this.chrome?.show();
                this.chrome?.setStage("同步角色资料");
                this.chrome?.setRatio(0);
                return;
            }
            if (!model.snapshot.role) {
                entry.reset();
                features.reset();
            }
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
            void this.openRootPage(route, epoch).then(async () => {
                if (!this.alive || epoch !== this.routeEpoch) return;
                this.chrome?.setRatio(1);
                await this.reveal(epoch, route === "remake-home");
                if (epoch === this.routeEpoch) this.routePending = false;
                if (route === "remake-home" && epoch === this.routeEpoch && this.alive) {
                    void this.resources.prepareBackground(() => this.afterPaint(), () => this.alive && epoch === this.routeEpoch && !model.snapshot.busy && !!model.snapshot.role).catch(error => {
                        if (this.alive && epoch === this.routeEpoch) {
                            GameLog.shared.classified("APP", "warn", "RemakeApp", "后台资源准备失败，返回主城时可重试：" + String(error));
                        }
                    });
                }
            }).catch(async error => {
                if (!this.alive || epoch !== this.routeEpoch) return;
                this.routePending = false;
                if (isOpenCancelled(error) || error instanceof StartupCancelled) {
                    // A login -> home -> login change can cancel an earlier load of the same route.
                    if (this.requestedRoute === route) {
                        this.requestedRoute = "";
                        syncRoute();
                    }
                    return;
                }
                if (this.requestedRoute === route) this.requestedRoute = "";
                GameLog.shared.classified("APP", "error", "RemakeApp", route + " 打开失败：" + String(error));
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
            if (this.alive) GameLog.shared.classified("APP", "error", "RemakeApp", "启动失败：" + String(error));
        });
    }

    /** 第二段完成可配置模块准备后才开主城；路由取消时不再打开旧页面或更新进度。 */
    private async openRootPage(route: string, epoch: number): Promise<void> {
        const active = () => this.alive && epoch === this.routeEpoch;
        if (route === "remake-home") {
            await this.resources.prepareStage("enterGame", (label, ratio) => {
                if (!active()) return;
                this.chrome?.setStage(label);
                this.chrome?.setRatio(ratio * 0.9);
            }, active);
        }
        if (!active()) throw new StartupCancelled("页面准备已取消");
        this.chrome?.setStage(route === "remake-home" ? "显示主城" : "显示登录界面");
        await UIManager.instance.openById(route);
    }

    /** 顺序执行配置、资源、会话恢复与开页，失败时保留可重试的加载画面。 */
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
                    {
                        label: "准备登录资源", weight: 70, run: async progress => {
                            await this.resources.prepareStage("login", (_label, ratio) => progress(ratio, 1), () => this.alive);
                            const copy = await loadBootCopy();
                            if (this.alive) chrome.setTips(copy.tips);
                        }
                    },
                    {label: "准备账号信息", weight: 10, run: async () => restore()},
                    {label: "准备登录界面", weight: 20, run: async () => openPage()},
                ], (label, ratio) => {
                    chrome.setStage(label);
                    chrome.setRatio(ratio);
                }, () => this.alive);
                await this.reveal(this.routeEpoch, this.requestedRoute === "remake-home");
                return;
            } catch (error) {
                if (!this.alive || error instanceof StartupCancelled) return;
                GameLog.shared.classified("APP", "error", "RemakeApp", "启动任务失败：" + String(error));
                if (!await chrome.prompt("加载失败，请重试", "重试")) return;
            }
        }
    }

    /** 等待实际绘制后淡出加载层，旧路由不得隐藏新路由的进度。 */
    private async reveal(epoch: number, home: boolean): Promise<void> {
        await this.afterPaint();
        await this.afterPaint();
        if (!this.alive || epoch !== this.routeEpoch) return;
        await this.chrome?.fadeOut(0.3);
        if (!this.alive || epoch !== this.routeEpoch) return;
        this.chrome?.hide();
        if (home) this.logo?.stopMusic();
    }

    /** 等待一次引擎绘制，应用退出时仍保证Promise结束。 */
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
    private onForeground(): void {
        this.gameSocket?.setBackground(false);
    }

    /** 应用销毁时清理开发演示、页面注册与会话资源。 */
    onDestroy(): void {
        this.development?.dispose();
        this.development = null;
        this.offNotice?.();
        this.offNotice = null;
        this.notices?.dispose();
        this.notices = null;
        this.alive = false;
        this.started = false;
        game.off(Game.EVENT_HIDE, this.onBackground, this);
        game.off(Game.EVENT_SHOW, this.onForeground, this);
        if (this.gameSocket) {
            this.gameSocket.onReady = this.gameSocket.onDisconnected = this.gameSocket.onRejected = this.gameSocket.onState = null;
            this.gameSocket.disconnect();
            this.gameSocket = null;
        }
        this.routeEpoch++;
        for (const done of this.paintWaiters) done();
        this.logo?.stop();
        this.logo?.stopMusic();
        this.logo = null;
        this.chrome?.destroy();
        this.chrome = null;
        this.assetState?.dispose();
        this.assetState = null;
        this.offAccount?.();
        this.offAccount = null;
        this.features?.dispose();
        this.features = null;
        UIManager.instance.closeById("gm");
        UIManager.instance.closeById("role-profile");
        UIManager.instance.closeById("server-picker");
        UIManager.instance.closeById("remake-formation");
        this.navigation?.dispose();
        this.navigation = null;
        this.bagModule?.dispose();
        this.bagModule = null;
        this.resources.dispose();
        for (const unregister of this.unregisterViews.splice(0)) unregister();
        clearCitySpriteCache();
        ResourceAssetsUtils.releaseResidents();
        clearPrefabCache();
    }

    /** 距离上次闲置预制体检查的秒数；只随当前应用update推进，销毁后不再运行。 */
    private prefabCollectionSeconds = 0;

    /** 推进服务器时钟估算，每30秒检查无人使用的预制体缓存，不清理预加载持有。 */
    update(dt: number): void {
        BagModel.instance.advanceClock(dt);
        this.prefabCollectionSeconds += dt;
        if (this.prefabCollectionSeconds >= 30) {
            this.prefabCollectionSeconds = 0;
            collectPrefabCache();
        }
    }

}
