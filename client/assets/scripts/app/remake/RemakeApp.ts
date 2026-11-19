/**
 * Remake.scene 的启动入口。创建账号、模块与根页面，按三段资源计划推进登录和主城。
 * 场景退出时释放这些对象；各模块通过统一连接接收数据并处理自己的玩法。
 */
import { _decorator, Component, director, Director, game, Game, Label, Node, Prefab } from "cc";
import { GameLog } from "../../core/GameLog";
import { ServerClock } from "../../core/ServerClock";
import { PrefabLoader } from "../../framework/assets/PrefabLoader";
import { ResourceAssetsUtils } from "../../framework/assets/ResourceAssetsUtils";
import { ToastManager } from "../../framework/ui/ToastManager";
import { UIManager } from "../../framework/ui/UIManager";
import { AccountComposition, type ApplicationAccount } from "./AccountComposition";
import { ApplicationPages } from "./ApplicationPages";
import { ApplicationResources } from "./ApplicationResources";
import { ApplicationModules } from "./ApplicationModules";
import { BootChrome } from "./BootChrome";
import { DevelopmentPreview } from "./DevelopmentPreview";
import { LoginEntry } from "./LoginEntry";
import { LogoSplashUtils, type LogoSplashHandle } from "./LogoSplashUtils";
import { StartupFlowUtils, StartupCancelled } from "./StartupFlowUtils";

const {ccclass, property} = _decorator;

/** 应用生命周期入口：协调会话、页面和启动流程，具体装配交给独立组件。 */
@ccclass("RemakeApp")
export class RemakeApp extends Component {
    /** 场景持有本地bootstrap加载画面；远程资源失败时保留进度及重试入口。 */
    @property(Prefab) loadingPrefab: Prefab | null = null;
    /** 正式页面的场景宿主。 */
    @property(Node) pageHost: Node | null = null;
    /** 加载画面与启动动画的场景宿主。 */
    @property(Node) startupHost: Node | null = null;
    /** 完整长连接地址，由场景保存；凭证不进入 URL。 */
    @property socketUrl = "ws://127.0.0.1:18080/api/v1/game/socket";
    /** 本场景的开发预览入口，启动时检查预览模式，退出时释放快捷键和临时窗口。 */
    private development: DevelopmentPreview | null = null;
    /** 应用提示独立于主城生命周期。 */
    private notices: ToastManager | null = null;
    /** 独立提示与UIManager的绑定，销毁时只移除本应用句柄。 */
    private offNotice: (() => void) | null = null;
    /** 场景保存提示布局，启动失败也能显示。 */
    @property(Node) noticePanel: Node | null = null;
    /** 独立提示的文字节点，与提示面板静态绑定。 */
    @property(Label) noticeLabel: Label | null = null;
    /** 本次启动持有的账号与连接，退出场景时释放并保留持久凭证。 */
    private account: ApplicationAccount | null = null;
    /** 本场景装配的模块，共用账号状态，随场景卸载。 */
    private modules: ApplicationModules | null = null;
    /** 当前场景的根页面和功能导航，角色变化时关闭原界面。 */
    private pages: ApplicationPages | null = null;
    /** 账号状态订阅解除函数，应用退出时调用。 */
    private offAccount: (() => void) | null = null;
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

    /** 编辑器启动应用时装配唯一会话服务和页面注册，并执行新链路启动流程。 */
    async start(): Promise<void> {
        this.notices = new ToastManager(this.noticePanel, this.noticeLabel);
        this.offNotice = UIManager.instance.bindNotice((text, duration) => this.notices?.show(text, duration));
        try {
            await this.initialize();
        } catch (error) {
            GameLog.shared.classified("APP", "error", "RemakeApp", "启动装配失败：" + String(error));
            if (this.isValid) this.notices.show("启动失败，请重新打开预览", 0);
        }
    }

    /** 启动唯一连接、业务模块和页面路由，再执行登录恢复及三段资源准备。 */
    private async initialize(): Promise<void> {
        this.development = new DevelopmentPreview(this.pageHost, this.startupHost, () => this.isValid);
        if (await this.development.start()) return;
        if (!this.loadingPrefab || !this.pageHost || !this.startupHost) throw new Error("Remake 场景未绑定本地加载 Prefab 或启动宿主，请重新打开已更新的 Remake.scene");
        const account = await AccountComposition.create(this.socketUrl);
        const {model, controller, servers} = account;
        if (!this.isValid) {
            controller.dispose();
            return;
        }
        this.account = account;
        game.on(Game.EVENT_HIDE, this.onBackground, this);
        game.on(Game.EVENT_SHOW, this.onForeground, this);
        const entry = new LoginEntry();
        const inHome = () => this.alive && this.started && entry.route(true) === "remake-home";
        const syncRoute = () => this.syncRootRoute(model, entry);
        this.modules = new ApplicationModules(account, this.development, inHome,
            () => this.clearRolePages(), text => this.pages?.showNotice(text));
        this.pages = new ApplicationPages({
            pageHost: this.pageHost,
            account,
            role: this.modules.role,
            entry,
            inHome,
            syncRoute,
            showToast: (text, duration) => this.notices?.show(text, duration),
        });
        this.alive = true;
        this.offAccount = model.subscribe(syncRoute);
        void this.boot(async () => {
            await servers.load();
            await controller.restore();
        }, async () => {
            const route = entry.route(!!model.snapshot.role);
            this.requestedRoute = route;
            UIManager.instance.keepOnly(route);
            await this.openRootPage(route, this.routeEpoch);
        }).then(() => {
            if (!this.alive) return;
            this.started = true;
            syncRoute();
        }).catch(error => {
            if (this.alive) GameLog.shared.classified("APP", "error", "RemakeApp", "启动失败：" + String(error));
        });
    }

    /** 账号状态变化后同步登录页或主城，同时管理启动层和后台资源的生命周期。 */
    private syncRootRoute(
        model: ApplicationAccount["model"],
        entry: LoginEntry,
    ): void {
        const ui = UIManager.instance;
        if (!this.alive || !this.started) return;
        if (model.snapshot.busy || !model.snapshot.role) {
            this.modules?.setHomeReady(false);
            this.resources.stopBackground();
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
        }
        const route = entry.route(!!model.snapshot.role);
        if (route === this.requestedRoute) {
            if (!this.routePending) {
                this.chrome?.hide();
                this.modules?.setHomeReady(route === "remake-home");
            }
            return;
        }
        this.requestedRoute = route;
        this.modules?.setHomeReady(false);
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
                this.modules?.setHomeReady(true);
                void this.resources.prepareBackground(() => this.afterPaint(), () => this.alive && epoch === this.routeEpoch && !model.snapshot.busy && !!model.snapshot.role).catch(error => {
                    if (this.alive && epoch === this.routeEpoch) {
                        GameLog.shared.classified("APP", "warn", "RemakeApp", "后台资源准备失败，返回主城时可重试：" + String(error));
                    }
                });
            }
        }).catch(async error => {
            if (!this.alive || epoch !== this.routeEpoch) return;
            this.routePending = false;
            if (UIManager.isOpenCancelled(error) || error instanceof StartupCancelled) {
                // 快速退出又登录时，较早的同名页面加载可能已被取消。
                if (this.requestedRoute === route) {
                    this.requestedRoute = "";
                    this.syncRootRoute(model, entry);
                }
                return;
            }
            if (this.requestedRoute === route) this.requestedRoute = "";
            GameLog.shared.classified("APP", "error", "RemakeApp", route + " 打开失败：" + String(error));
            if (await this.chrome?.prompt("界面加载失败，请重试", "重试")) this.syncRootRoute(model, entry);
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

    /** 顺序执行配置、资源、会话恢复与根页准备，失败时保留可重试的加载画面。 */
    private async boot(restore: () => Promise<void>, openPage: () => Promise<void>): Promise<void> {
        const chrome = this.chrome = new BootChrome(this.startupHost!, async () => this.loadingPrefab!);
        const logo = this.logo = LogoSplashUtils.playLogoSplash(this.startupHost!, this.node);
        await logo.fadedIn;
        if (!this.alive) return;
        await chrome.open(logo.node);
        if (!this.alive) return;
        if (!chrome.isReady) throw new Error("已有 LoadingLayer 加载失败");
        await logo.held;
        if (!this.alive) return;
        logo.dismiss();
        await logo.done;
        while (this.alive) {
            try {
                chrome.show();
                await StartupFlowUtils.runStartup([
                    {
                        label: "准备登录资源", weight: 70, run: async progress => {
                            await this.resources.prepareStage("login", (_label, ratio) => progress(ratio, 1), () => this.alive);
                            const tips = await BootChrome.readLoadingTips();
                            if (this.alive) chrome.setTips(tips);
                        }
                    },
                    {label: "准备账号信息", weight: 10, run: async () => restore()},
                    {label: "准备界面", weight: 20, run: async () => openPage()},
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

    /**
     * 统一状态入口确认身份改变后，先同步关闭旧角色界面，再允许它重置Model。
     * 取消页面意图与弹窗准备，不让页面通过旧账号键或清空事件触发返回导航。
     */
    private clearRolePages(): void {
        this.development?.resetSession();
        this.pages?.clearRolePages();
        this.notices?.clear();
    }

    /** 进入后台时暂停连接，连接层清除本次公共时钟的基准。 */
    private onBackground(): void {
        this.account?.socket.setBackground(true);
    }

    /** 返回前台只恢复已登录会话；新鉴权首包统一校准库存和服务器时间。 */
    private onForeground(): void {
        this.account?.socket.setBackground(false);
    }

    /** 结束预览、会话模块、连接与页面，再释放场景资源和监听。 */
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
        this.routeEpoch++;
        for (const done of this.paintWaiters) done();
        this.logo?.stop();
        this.logo?.stopMusic();
        this.logo = null;
        this.chrome?.destroy();
        this.chrome = null;
        this.offAccount?.();
        this.offAccount = null;
        this.modules?.dispose();
        this.modules = null;
        this.account?.controller.dispose();
        this.account = null;
        this.pages?.dispose();
        this.pages = null;
        this.resources.dispose();
        UIManager.instance.releaseUnusedModal();
        ResourceAssetsUtils.releaseResidents();
        PrefabLoader.clearPrefabCache();
    }

    /** 距离上次闲置预制体检查的秒数；只随当前应用update推进，销毁后不再运行。 */
    private prefabCollectionSeconds = 0;

    /** 推进飘字和公共时钟的帧计时，每 30 秒检查闲置预制体。 */
    update(dt: number): void {
        this.notices?.update(dt);
        ServerClock.instance.advance(dt);
        this.prefabCollectionSeconds += dt;
        if (this.prefabCollectionSeconds >= 30) {
            this.prefabCollectionSeconds = 0;
            PrefabLoader.collectPrefabCache();
        }
    }

}
