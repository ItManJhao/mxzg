/**
 * 统一界面管理：协调异步加载、打开取消、返回、缓存和释放，具体业务由应用注册的页面适配器提供。
 */
import { director, Director, Node, Prefab } from "cc";
import { ErrorUtils } from "../../core/ErrorUtils";
import { GameLog } from "../../core/GameLog";
import { PrefabLoader } from "../assets/PrefabLoader";
import { UIOpenLogUtils } from "./UIOpenLogUtils";
import { BaseView } from "./BaseView";
import { UILayer, UI_LAYER_ORDER, UI_WINDOW_LAYERS } from "./UILayer";
import { ViewClass, ViewSpec, UIRegistry } from "./UIRegistry";
import { ViewCloseUtils } from "./ViewCloseUtils";
import { ModalLayer } from "./ModalLayer";
export interface PageNav {
    readonly current: string | null;
    openChild(id: string): void;
    back(): boolean;
}
export interface UIManagerHost {
    showToast(text: string, durationMs?: number): void;
    /** 页面已经进栈之后才调用。失败和取消不调用。 */
    onPageOpened?(id: string): void;
}
interface OpenPage {
    id: string;
    host: Node;
    view: BaseView<unknown>;
}
/** 主页面打开意图，切页可取消资源或页面就绪的等待。 */
interface PageIntent {
    /** 导航按页面 ID 保留当前目标。 */
    readonly id: string;
    /** 页面资源或就绪等待期间收到取消时拒绝。 */
    readonly cancelled: Promise<never>;
    /** 取消等待，打开入口随后释放本次实例。 */
    readonly cancel: () => void;
}
/** 一个真实弹窗实例；准备中的窗口也参与模态归属，不以页面id覆盖另一份实例。 */
interface ResidentPage extends OpenPage {
    /** 本次打开的注册配置，包含当前实例的模态和关闭模式。 */
    spec: ViewSpec;
    /** 打开/重新置顶时递增，仅在宿主不属于同一节点树时作为先后次序。 */
    order: number;
    /** true表示该实例已取消或开始释放，迟到准备结果不能重新登记。 */
    cancelled: boolean;
    /** 开页等待中的取消出口；准备成功、失败或关闭后清空。 */
    rejectOpening: ((error: Error) => void) | null;
    /** 对应节点的外部销毁监听；本管理器主动释放前解除，防止重入清理。 */
    onDestroyed: (() => void) | null;
    /** 层级激活状态监听；宿主或祖先隐藏/恢复时重新决定共享模态归属。 */
    onActiveChanged: (() => void) | null;
    /** 已交给本实例的最近打开意图；单实例合并准备时据此只应用末次参数。 */
    appliedIntent: ResidentIntent | null;
}
/** 单实例弹窗的当前使用意图；普通打开同样接管归属，不将父子关系保存在业务View中。 */
interface ResidentIntent {
    /** 最近一次打开传入的参数，在共享准备完成前允许被后来的意图替换。 */
    readonly args: unknown;
    /** 已挂载的真实子窗；null表示尚在资源加载阶段，取消时不得等待其兑现。 */
    view: BaseView<unknown> | null;
    /** 当前负责子窗的父页；null表示普通打开，明确接管并解除旧父页归属。 */
    readonly owner: BaseView<unknown> | null;
    /** 解除当前父页关闭登记的句柄；普通打开无父页，关闭/转交后清空。 */
    stopOwner: (() => void) | null;
}
/** 加载还没进栈，玩家已经去了别的页。不 Toast，不改底栏。 */
export class OpenCancelled extends Error {
    constructor() {
        super("打开已取消");
        this.name = "OpenCancelled";
    }
}
/**
 * 正式界面的统一开关，Page走应用注入的导航，其他层挂到登记的宿主。
 * 预制没装上之前不进页面栈，避免留下可点的空壳。
 * 每次打开带一个意图。加载期间切走，旧意图作废，不能再压栈。
 * 常驻层在同宿主按层级绘制；窗口层按ViewSpec共享一份模态节点，关闭后恢复下层配置。
 */
export class UIManager {
    /** 识别界面打开被替换或取消的正常退出，不把其他异常误当取消。 */
    public static isOpenCancelled(err: unknown): boolean {
        return err instanceof OpenCancelled;
    }

    /** 已反馈的开窗异常按对象身份记录；不持有异常，避免调用方再次弹出同一失败。 */
    private static readonly reportedFailures = new WeakSet<object>();

    /** true表示框架已通过全局飘字报告该异常，调用方仍可处理自己的恢复逻辑。 */
    public static isFailureReported(error: unknown): boolean {
        return typeof error === "object" && error !== null && UIManager.reportedFailures.has(error);
    }

    /** 返回页面管理计数；缓存页面与活动页面分开，不能以缓存数非零认定泄漏。 */
    public snapshot(): Record<string, number> {
        return {
            pages: Array.from(this.pages.values()).reduce((sum, group) => sum + group.length, 0),
            residents: this.residents.size, cached: this.cached.size, prepared: this.prepared.size,
            opening: this.opening.size, pendingResident: this.pendingResident.size, intents: this.pageIntents.size,
            modalNodes: this.modalLayer.snapshot().nodes, modalActive: this.modalLayer.snapshot().active
        };
    }
    static readonly instance = new UIManager();
    /** 应用提示独立于正式导航，播放时长缺省时由飘字组件决定。 */
    private notice: ((text: string, durationMs?: number) => void) | null = null;
    /** 由场景应用绑定提示，返回只撤销本次绑定的句柄。 */
    public bindNotice(show: (text: string, durationMs?: number) => void): () => void {
        this.notice = show;
        return () => {
            if (this.notice === show) {
                this.notice = null;
            }
        };
    }

    private nav: PageNav | null = null;
    private host: UIManagerHost | null = null;
    private armed = new Set<string>();
    private prepared = new Map<string, OpenPage>();
    private pages = new Map<string, OpenPage[]>();
    /** 已关闭的页面按最近关闭顺序保存；取出重开或淘汰时移除。 */
    private cached = new Map<string, OpenPage & {
        closedAt: number;
    }>();
    /** 最多保留六个已关闭的缓存页，超量时从最早关闭的页面开始淘汰。 */
    public static readonly maxCachedPages = 6;
    /** 页面从关闭起闲置十分钟后到期，单位为毫秒；重新打开后停止闲置计时。 */
    public static readonly cacheIdleMs = 600_000;
    /** 只在存在闲置页面时等待最近到期时间；清空、取完和卸载时取消。 */
    private cacheTimer: ReturnType<typeof setTimeout> | null = null;
    /** 已完成打开的弹窗按实际宿主保存；同一页面可以有多份实例。 */
    private residents = new Map<Node, ResidentPage>();
    private residentHosts = new Map<string, () => Node | null>();
    private residentEpoch = new Map<string, number>();
    /** 已挂载但仍在whenReady等待中的弹窗，取消时只释放对应宿主。 */
    private pendingResident = new Map<Node, ResidentPage>();
    /** 单实例弹窗按页面id保留唯一当前意图；窗口关闭移除，旧父页与旧异步续段不可撤销后来意图。 */
    private readonly residentIntents = new Map<string, ResidentIntent>();
    /** 真实弹窗的先后编号，重复打开已有窗口时递增以反映置顶。 */
    private nextResidentOrder = 1;
    /** 当前管理器唯一的模态节点，所有弹窗共用；卸载时统一销毁。 */
    private readonly modalLayer = new ModalLayer(() => this.refreshModal());
    /** 节点层级活跃事件合并至帧末执行，避免在引擎遍历激活树时重排兄弟节点。 */
    private modalRefreshPending = false;
    private opening = new Map<string, Promise<BaseView<unknown>>>();
    /** 未进页面栈的打开意图，主页面切换和应用卸载会撤销。 */
    private readonly pageIntents = new Set<PageIntent>();
    install(nav: PageNav, host: UIManagerHost): void {
        this.nav = nav;
        this.host = host;
    }

    /** 卸载匹配的导航：取消在途意图，清理闲置页面、全部弹窗及共享模态；活动Page宿主由导航先关闭。 */
    uninstall(nav: PageNav): void {
        if (this.nav !== nav) {
            return;
        }
        this.invalidatePending();
        this.clearCached();
        this.closeAllResidents();
        this.cancelModalRefresh();
        this.modalLayer.dispose();
        this.nav = null;
        this.host = null;
    }

    /**
     * 打开已注册视图；先等@UIRegistry.view.prepare的配置，再按唯一地址取得Prefab，Page意图有效后才交给导航。
     * 窗口层按ViewSpec共享模态。失败清理本次实例并提示，取消时保留当前页面。
     */
    async open<T>(ctor: ViewClass<T>, args?: T): Promise<BaseView<T>> {
        const spec = UIRegistry.viewSpecOf(ctor);
        if (!spec) {
            throw new Error("视图未注册");
        }
        if (spec.layer !== UILayer.Page) {
            if (!spec.hostId) {
                throw new Error("常驻界面缺少 hostId " + spec.id);
            }
            return this.openResident(ctor, spec, args);
        }
        if (!this.nav) {
            throw new Error("UIManager 还没接上页面栈");
        }
        if (!spec.allowMultiple) {
            const existing = this.top(spec.id);
            if (existing && this.nav.current === spec.id) {
                const started = GameLog.monoNow();
                if (spec.prepare) {
                    await spec.prepare();
                }
                if (!existing.host.isValid || this.top(spec.id) !== existing || this.nav?.current !== spec.id) {
                    throw new OpenCancelled();
                }
                existing.view.runOpen(args);
                await existing.view.whenReady();
                if (!existing.view.node?.isValid || this.top(spec.id) !== existing || this.nav?.current !== spec.id) {
                    throw new OpenCancelled();
                }
                this.noteOpened(existing.view, spec, started);
                return existing.view as BaseView<T>;
            }
            const pending = this.opening.get(spec.id);
            if (pending) {
                return (await pending) as BaseView<T>;
            }
        }
        const reused = spec.allowMultiple ? null : this.takeCache(spec.id);
        const job = reused ? this.reopen(reused, spec, args) : this.openNew(ctor, spec, args);
        if (!spec.allowMultiple) {
            this.opening.set(spec.id, job);
        }
        try {
            return (await job) as BaseView<T>;
        }
        finally {
            if (this.opening.get(spec.id) === job) {
                this.opening.delete(spec.id);
            }
        }
    }

    /**
     * 打开随父页显示期关闭的单实例窗口；普通open或其他父页后来打开同id时接管归属。
     * 父页在加载完成前关闭会立即撤销自己的意图；同id在途打开只挂载一次，并采用末次参数。
     */
    public openChild<T>(owner: BaseView<unknown>, ctor: ViewClass<T>, args?: T): Promise<BaseView<T>> {
        const spec = UIRegistry.viewSpecOf(ctor);
        if (!spec || !UI_WINDOW_LAYERS.has(spec.layer) || spec.allowMultiple || !spec.hostId) {
            return Promise.reject(new Error("子窗口必须登记为有宿主的单实例窗口"));
        }
        return this.openResident(ctor, spec, args, owner);
    }

    /** 主动关闭仍归本父页持有的全部子窗及在途意图；已经被其他打开接管的同id窗口不受影响。 */
    public closeChildren(owner: BaseView<unknown>): boolean {
        let closed = false;
        for (const [id, intent] of Array.from(this.residentIntents)) {
            if (intent.owner === owner && this.residentIntents.get(id) === intent) {
                closed = this.closeResident(id) || closed;
            }
        }
        return closed;
    }

    /** 当前已显示的单实例子窗仍归本父页时返回true；准备期接管后旧调用方不能确认其展示结果。 */
    public ownsChild(owner: BaseView<unknown>, view: BaseView<unknown>): boolean {
        const page = this.findResident(view);
        const intent = page ? this.residentIntents.get(page.id) : null;
        return !!page && this.residents.get(page.host) === page && !page.cancelled && page.host.isValid
            && intent?.owner === owner && intent.view === view && page.appliedIntent === intent;
    }

    /**
     * RemakeNavigation.openChild取走已准备的Page宿主，正式登记为活动页面。
     * 没有对应准备记录时返回null，由导航拒绝未准备好的页面。
     */
    createPageHost(id: string): Node | null {
        if (!this.armed.has(id)) {
            return null;
        }
        this.armed.delete(id);
        const ready = this.prepared.get(id);
        this.prepared.delete(id);
        if (!ready) {
            return null;
        }
        const list = this.pages.get(id) || [];
        list.push(ready);
        this.pages.set(id, list);
        return ready.host;
    }

    /** 常驻层的父节点。Page 不看这里。 */
    setResidentHost(id: string, provider: () => Node | null): () => void {
        this.residentHosts.set(id, provider);
        return () => {
            if (this.residentHosts.get(id) === provider) {
                this.residentHosts.delete(id);
            }
        };
    }

    /** 按注册 id 打开。没登记就失败。 */
    async openById<T = unknown>(id: string, args?: T): Promise<BaseView<T>> {
        const ctor = UIRegistry.viewCtorById(id);
        if (!ctor) {
            throw new Error("视图未注册 " + id);
        }
        return this.open(ctor as ViewClass<T>, args);
    }

    /** 页面栈往回退一层。已经在根上时返回 false。常驻层不跟着关。 */
    back(): boolean {
        if (!this.nav) {
            return false;
        }
        return this.nav.back();
    }

    /** 判断指定页面或真实实例是否已打开；准备中的弹窗仍由opening/pending计数表示。 */
    isOpen(target: Function | string | object): boolean {
        if (typeof target === "object") {
            return Array.from(this.residents.values()).some(page => page.view === target && page.host.isValid)
                || Array.from(this.pages.values()).some(group => group.some(page => page.view === target && page.host.isValid));
        }
        const id = this.idOf(target);
        if (!id) {
            return false;
        }
        if (Array.from(this.residents.values()).some(page => page.id === id && page.host.isValid)) {
            return true;
        }
        return !!this.top(id);
    }

    /** 关闭指定真实弹窗或当前页面；同id多份弹窗时不会误关另一份实例。 */
    close(view?: object): boolean {
        if (view) {
            const resident = this.findResident(view);
            if (resident) {
                this.disposeResident(resident);
                return true;
            }
            const spec = UIRegistry.viewSpecOf(view.constructor);
            if (spec && spec.layer !== UILayer.Page) {
                return false;
            }
            if (!this.nav) {
                return false;
            }
            if (!spec || this.nav.current !== spec.id) {
                return false;
            }
        }
        return this.back();
    }

    /** 按id关闭该类所有弹窗及在途打开；实例关闭使用close(view)，不波及同id的其他窗口。 */
    closeById(id: string): boolean {
        if (this.residentEpoch.has(id)) {
            return this.closeResident(id);
        }
        const ctor = UIRegistry.viewCtorById(id);
        const spec = ctor ? UIRegistry.viewSpecOf(ctor) : null;
        if (spec && spec.layer !== UILayer.Page) {
            return this.closeResident(spec.id);
        }
        if (this.nav && this.nav.current === id) {
            return this.nav.back();
        }
        return false;
    }
    /** 通过当前应用的全局飘字显示业务反馈，使用飘字组件的默认播放时长。 */
    toast(text: string): void {
        if (this.notice) {
            this.notice(text);
        } else if (this.host) {
            this.host.showToast(text);
        }
    }

    /**
     * 后来的页面导航只留下目标页的打开意图。
     * 背包还在加载时玩家去了别的页，这次打开就不能再压栈。
     */
    keepOnly(id: string): void {
        for (const intent of this.pageIntents) {
            if (intent.id !== id) {
                this.cancelPageOpening(intent);
            }
        }
    }

    /** 撤销所有还未进栈的打开，包括已挂载但仍在等待就绪的页面。 */
    invalidatePending(): void {
        for (const intent of this.pageIntents) {
            this.cancelPageOpening(intent);
        }
    }

    /** 立即撤销旧等待，同 ID 可以开始新的打开。 */
    private cancelPageOpening(intent: PageIntent): void {
        this.pageIntents.delete(intent);
        this.opening.delete(intent.id);
        intent.cancel();
    }

    /** 销毁所有已关闭的缓存页；不关闭正在显示或正在打开的页面，也不清空共享预制体池。 */
    public clearCached(): void {
        const pages = Array.from(this.cached.values());
        this.cached.clear();
        this.cancelCacheTimer();
        for (const page of pages) {
            this.releasePage(page);
        }
    }

    /**
     * 无任何已打开/已挂载准备实例时释放闲置模态节点，覆盖不安装导航的独立预览卸载。
     * 仍有其他应用窗口时不得清理；重复调用安全，返回true表示本次确实释放了节点。
     */
    public releaseUnusedModal(): boolean {
        if (this.residents.size > 0 || this.pendingResident.size > 0) {
            return false;
        }
        const existed = this.modalLayer.snapshot().nodes > 0;
        this.cancelModalRefresh();
        this.modalLayer.dispose();
        return existed;
    }

    /** 释放业务视图。清理异常记录其来源，后续宿主销毁或导航仍可完成。 */
    private releaseView(id: string, view: BaseView<unknown>): void {
        try {
            view.runDispose();
        }
        catch (error) {
            GameLog.shared.classified("FRAMEWORK", "error", "UIManager",
                "页面清理失败 " + id + " " + (error instanceof Error ? error.stack || error.message : String(error)));
        }
    }

    /** 业务释放后由同一个管理器销毁宿主和其持有的资源。 */
    private releasePage(page: OpenPage): void {
        this.releaseView(page.id, page.view);
        if (page.host.isValid) {
            page.host.destroy();
        }
    }

    /** 回收过期或超过数量上限的闲置页；时间为单调时钟毫秒，仅用于缓存年龄。 */
    public collectCached(now = GameLog.monoNow()): number {
        let removed = 0;
        for (const [id, page] of this.cached) {
            if (now - page.closedAt < UIManager.cacheIdleMs && this.cached.size <= UIManager.maxCachedPages) {
                continue;
            }
            this.cached.delete(id);
            this.releasePage(page);
            removed++;
        }
        this.scheduleCacheCollection();
        return removed;
    }

    /** 取消本管理器的闲置检查，不影响页面或资源加载任务。 */
    private cancelCacheTimer(): void {
        if (this.cacheTimer !== null) {
            clearTimeout(this.cacheTimer);
            this.cacheTimer = null;
        }
    }

    /** 仅为最早关闭的缓存页安排一次检查；后台节流后在下一次执行时按真实年龄回收。 */
    private scheduleCacheCollection(): void {
        this.cancelCacheTimer();
        const oldest = this.cached.values().next().value;
        if (!oldest) {
            return;
        }
        const delay = Math.max(1, oldest.closedAt + UIManager.cacheIdleMs - GameLog.monoNow());
        this.cacheTimer = setTimeout(() => {
            this.cacheTimer = null;
            this.collectCached();
        }, delay);
    }

    /** 导航关闭页面时保留可重用实例。关闭钩子抛错时释放旧页并继续切换。 */
    noteClosed(id: string): void {
        const list = this.pages.get(id);
        if (!list || list.length === 0) {
            return;
        }
        const page = list.pop();
        if (!page) {
            return;
        }
        if (list.length === 0) {
            this.pages.delete(id);
        }
        try {
            page.view.runClose();
        } catch (error) {
            GameLog.shared.classified("FRAMEWORK", "error", "UIManager",
                "页面关闭失败 " + id + " " + (error instanceof Error ? error.stack || error.message : String(error)));
            this.releasePage(page);
            return;
        }
        const ctor = UIRegistry.viewCtorById(id);
        const spec = ctor ? UIRegistry.viewSpecOf(ctor) : null;
        if (spec && spec.cache && page.host.isValid && page.view.node && page.view.node.isValid) {
            page.host.active = false;
            page.host.removeFromParent();
            const previous = this.cached.get(id);
            if (previous && previous !== page) {
                this.releasePage(previous);
            }
            this.cached.delete(id);
            this.cached.set(id, { ...page, closedAt: GameLog.monoNow() });
            this.collectCached();
            return;
        }
        this.releasePage(page);
    }

    /** 将页面ID、View类或实例解析到已注册ID；未注册对象返回null，不创建页面。 */
    private idOf(target: Function | string | object): string | null {
        if (typeof target === "string") {
            return target;
        }
        if (typeof target === "function") {
            const spec = UIRegistry.viewSpecOf(target);
            return spec ? spec.id : null;
        }
        const spec = UIRegistry.viewSpecOf(target.constructor);
        return spec ? spec.id : null;
    }

    private residentParent(spec: ViewSpec): Node | null {
        if (!spec.hostId) {
            return null;
        }
        const provider = this.residentHosts.get(spec.hostId);
        if (!provider) {
            return null;
        }
        const node = provider();
        if (!node || !node.isValid) {
            return null;
        }
        return node;
    }

    /** 打开或置顶弹窗；单实例窗口复用，同id多实例各自保留生命周期。 */
    private async openResident<T>(ctor: ViewClass<T>, spec: ViewSpec, args: unknown,
        owner?: BaseView<unknown>): Promise<BaseView<T>> {
        if (spec.allowMultiple) {
            return this.openResidentNew(ctor, spec, args);
        }
        const intent = this.replaceResidentIntent(spec.id, args, owner);
        if (this.residentIntents.get(spec.id) !== intent) {
            throw new OpenCancelled();
        }
        const pending = this.opening.get(spec.id);
        if (pending) {
            const view = await pending;
            const page = this.findResident(view);
            if (!page) {
                throw new OpenCancelled();
            }
            // 准备完成的同步通知也可能又提出一次打开；只补尚未应用的最新参数。
            await this.applyResidentIntent(page, args);
            return view as BaseView<T>;
        }
        const alive = Array.from(this.residents.values()).find(page => page.id === spec.id && page.host.isValid);
        const epoch = this.residentEpoch.get(spec.id) || 0;
        this.residentEpoch.set(spec.id, epoch);
        // 先登记共享任务再开始加载，父页同步关闭或重复点击也能撤销/合并同一意图。
        const job = Promise.resolve().then(() => {
            this.ensureResident(spec.id, epoch);
            return alive ? this.reopenResident(alive, spec, args) : this.openResidentNew(ctor, spec, args);
        });
        this.opening.set(spec.id, job);
        try {
            return (await job) as BaseView<T>;
        }
        finally {
            if (this.opening.get(spec.id) === job) {
                this.opening.delete(spec.id);
                const current = this.residentIntents.get(spec.id);
                if (current && !this.residentPages().some(page => page.id === spec.id)) {
                    this.releaseResidentIntent(spec.id, current);
                }
            }
        }
    }

    /** 普通打开与子窗打开都接管单实例归属，先解除旧父页登记，旧清理不会关闭新用途。 */
    private replaceResidentIntent(id: string, args: unknown, owner?: BaseView<unknown>): ResidentIntent {
        const previous = this.residentIntents.get(id);
        const intent: ResidentIntent = { args, view: previous?.view || null, owner: owner || null, stopOwner: null };
        let ownerClosed = false;
        if (owner) {
            intent.stopOwner = owner.onViewClose(() => {
                ownerClosed = true;
                if (this.residentIntents.get(id) === intent) {
                    this.closeResident(id);
                }
            });
        }
        // 已关父页的迟到操作必须在接管前拒绝，否则会先抢走并关闭其他页面仍在使用的详情。
        if (ownerClosed) {
            intent.stopOwner?.();
            intent.stopOwner = null;
            return intent;
        }
        this.residentIntents.set(id, intent);
        previous?.stopOwner?.();
        if (previous) {
            previous.stopOwner = null;
        }
        return intent;
    }

    /** 只释放仍匹配的意图和父页引用；旧任务的finally不会清理后来接管的窗口。 */
    private releaseResidentIntent(id: string, intent: ResidentIntent): void {
        if (this.residentIntents.get(id) !== intent) {
            return;
        }
        this.residentIntents.delete(id);
        const stopOwner = intent.stopOwner;
        intent.stopOwner = null;
        stopOwner?.();
    }

    /** 存活弹窗重用同一准备任务；只重画最新参数，不重复实例化或保留旧父页关闭回调。 */
    private async reopenResident(page: ResidentPage, spec: ViewSpec, args: unknown): Promise<BaseView<unknown>> {
        const started = GameLog.monoNow();
        page.spec = spec;
        this.raiseResident(page);
        try {
            if (spec.prepare) {
                await spec.prepare();
            }
            await this.applyResidentIntent(page, args);
            this.noteOpened(page.view, spec, started);
            return page.view;
        } catch (error) {
            const cancelled = page.cancelled || UIManager.isOpenCancelled(error);
            this.disposeResident(page);
            if (!cancelled) {
                this.reportOpenFailed(spec.id, error);
            }
            throw error;
        }
    }

    /** 准备期只提交当前意图；等待中被新选择接管时继续应用末次参数，关闭后不再回调View。 */
    private async applyResidentIntent(page: ResidentPage, args: unknown): Promise<void> {
        do {
            if (page.cancelled || !page.host.isValid) {
                throw new OpenCancelled();
            }
            if (page.spec.allowMultiple) {
                page.view.runOpen(args);
            } else {
                const intent = this.residentIntents.get(page.id);
                if (!intent) {
                    throw new OpenCancelled();
                }
                intent.view = page.view;
                if (page.appliedIntent !== intent) {
                    page.appliedIntent = intent;
                    page.view.runOpen(intent.args);
                }
            }
            await this.waitResidentReady(page);
            if (page.cancelled || !page.host.isValid) {
                throw new OpenCancelled();
            }
        } while (!page.spec.allowMultiple && page.appliedIntent !== this.residentIntents.get(page.id));
    }

    /** 挂载后的准备期也接入共享模态；关闭本实例即可取消，不等待业务页面兑现ready。 */
    private async openResidentNew<T>(ctor: ViewClass<T>, spec: ViewSpec, args: unknown): Promise<BaseView<T>> {
        const started = GameLog.monoNow();
        const epoch = this.residentEpoch.get(spec.id) || 0;
        this.residentEpoch.set(spec.id, epoch);
        const parent = this.residentParent(spec);
        if (!parent) {
            throw new Error("常驻层没有宿主 " + (spec.hostId || spec.id));
        }
        let viewNode: Node | null = null;
        let page: ResidentPage | null = null;
        try {
            const prefab = await this.loadViewPrefab(spec, () => this.ensureResident(spec.id, epoch));
            this.ensureResident(spec.id, epoch);
            if (!parent.isValid) {
                throw new Error("页面已关");
            }
            // 所有页面直接实例化完整Prefab，spawnPrefab将资源引用交给实际节点。
            viewNode = PrefabLoader.spawnPrefab(prefab, parent);
            if (!viewNode.isValid) {
                throw new Error("页面已关");
            }
            this.ensureResident(spec.id, epoch);
            const found = viewNode.getComponent(ctor);
            if (!found) {
                throw new Error(spec.prefab + " 上没有视图组件");
            }
            page = { id: spec.id, host: viewNode, view: found, spec, appliedIntent: null,
                order: this.nextResidentOrder++, cancelled: false, rejectOpening: null,
                onDestroyed: null, onActiveChanged: null };
            const current = page;
            page.onDestroyed = () => this.onResidentDestroyed(current);
            page.onActiveChanged = this.onResidentActivity;
            viewNode.once(Node.EventType.NODE_DESTROYED, page.onDestroyed);
            viewNode.on(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED, page.onActiveChanged);
            this.pendingResident.set(viewNode, page);
            this.raiseResident(page);
            if (spec.createBinding) {
                found.attachBinding(spec.createBinding(found));
            }
            await this.applyResidentIntent(page, args);
            this.ensureResident(spec.id, epoch, page);
            if (!viewNode.isValid || !found.node || !found.node.isValid) {
                throw new Error("页面已关");
            }
            this.pendingResident.delete(viewNode);
            this.residents.set(viewNode, page);
            this.refreshModal();
            this.noteOpened(found, spec, started);
            return found as BaseView<T>;
        }
        catch (error) {
            const cancelled = UIManager.isOpenCancelled(error) || !!page?.cancelled
                || (this.residentEpoch.get(spec.id) || 0) !== epoch;
            if (page) {
                this.disposeResident(page);
            }
            else if (viewNode?.isValid) {
                viewNode.active = false;
                viewNode.destroy();
            }
            if (!cancelled) {
                this.reportOpenFailed(spec.id, error);
            }
            if (cancelled && !UIManager.isOpenCancelled(error)) {
                throw new OpenCancelled();
            }
            throw error instanceof Error ? error : new Error(ErrorUtils.messageOf(error));
        }
    }

    /** 竞速等待内容就绪与窗口取消；onOpen已同步关窗时直接拒绝，不等待业务结束Promise。 */
    private async waitResidentReady(page: ResidentPage): Promise<void> {
        if (page.cancelled || !page.host.isValid) {
            throw new OpenCancelled();
        }
        const cancelled = new Promise<void>((_resolve, reject) => { page.rejectOpening = reject; });
        try {
            await Promise.race([page.view.whenReady(), cancelled]);
        }
        finally {
            page.rejectOpening = null;
        }
    }

    /** 校验id代次与真实实例，旧加载结果不得重新登记已经关闭的窗口。 */
    private ensureResident(id: string, epoch: number, page?: ResidentPage): void {
        if ((this.residentEpoch.get(id) || 0) !== epoch || page?.cancelled) {
            throw new OpenCancelled();
        }
    }

    /** 按id关闭同类弹窗及在途打开；旧Promise的finally不能删除新一轮打开。 */
    private closeResident(id: string): boolean {
        const pages = this.residentPages().filter(page => page.id === id);
        const had = this.opening.has(id) || pages.length > 0;
        this.residentEpoch.set(id, (this.residentEpoch.get(id) || 0) + 1);
        this.opening.delete(id);
        const intent = this.residentIntents.get(id);
        if (intent) {
            this.releaseResidentIntent(id, intent);
        }
        for (const page of pages) {
            this.disposeResident(page);
        }
        this.refreshModal();
        return had;
    }

    /** 会话结束或应用卸载时取消所有已打开及准备中的弹窗，迟到的资源无法再挂回旧界面。 */
    public closeAllResidents(): void {
        for (const id of Array.from(this.residentEpoch.keys())) {
            this.closeResident(id);
        }
        this.residents.clear();
        this.pendingResident.clear();
        this.modalLayer.hide();
    }

    /** 按对象身份查找已打开或准备中的真实窗口。 */
    private findResident(view: object): ResidentPage | null {
        return this.residentPages().find(page => page.view === view) || null;
    }

    /** 返回唯一实例集合；完成准备时只从pending转移到residents，不重复拥有。 */
    private residentPages(): ResidentPage[] {
        return [...Array.from(this.residents.values()), ...Array.from(this.pendingResident.values())];
    }

    /** 释放弹窗和模态归属。宿主由引擎销毁时，先清理视图，宿主交给当前销毁流程。 */
    private disposeResident(page: ResidentPage, hostDestroying = false): void {
        if (page.cancelled) {
            return;
        }
        this.residents.delete(page.host);
        this.pendingResident.delete(page.host);
        const intent = this.residentIntents.get(page.id);
        if (intent?.view === page.view) {
            this.releaseResidentIntent(page.id, intent);
        }
        page.cancelled = true;
        page.rejectOpening?.(new OpenCancelled());
        page.rejectOpening = null;
        if (!page.spec.allowMultiple) {
            this.opening.delete(page.id);
        }
        if (page.onDestroyed) {
            page.host.off(Node.EventType.NODE_DESTROYED, page.onDestroyed);
            page.onDestroyed = null;
        }
        if (page.onActiveChanged) {
            page.host.off(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED, page.onActiveChanged);
            page.onActiveChanged = null;
        }
        if (!hostDestroying && page.host.isValid) {
            page.host.active = false;
        }
        this.refreshModal();
        if (hostDestroying) {
            this.releaseView(page.id, page.view);
        } else {
            this.releasePage(page);
        }
    }

    /** 处理宿主直接销毁，立即取消等待并恢复下层模态。 */
    private onResidentDestroyed(page: ResidentPage): void {
        page.onDestroyed = null;
        this.disposeResident(page, true);
    }

    /** 打开或重开时提升到同宿主本层顶部，高层窗口保持在上。 */
    private raiseResident(page: ResidentPage): void {
        const parent = page.host.parent;
        if (parent?.isValid) {
            const rank = UI_LAYER_ORDER.indexOf(page.spec.layer);
            const nextLayer = parent.children.findIndex(sibling => {
                const resident = this.residents.get(sibling) ?? this.pendingResident.get(sibling);
                return !!resident && UI_LAYER_ORDER.indexOf(resident.spec.layer) > rank;
            });
            // setSiblingIndex先从旧位置移除节点，目标在旧位置之后时要扣除旧占位。
            const target = nextLayer < 0 ? parent.children.length - 1
                : nextLayer - Number(page.host.getSiblingIndex() < nextLayer);
            page.host.setSiblingIndex(target);
        }
        page.order = this.nextResidentOrder++;
        this.refreshModal();
    }

    /** 按真实绘制次序寻找最高模态；更上层的普通窗口保持在遮罩上方。 */
    private refreshModal(): void {
        const candidates = this.residentPages().filter(page => UI_WINDOW_LAYERS.has(page.spec.layer)
            && page.spec.modal && !page.cancelled && page.host.isValid && page.host.activeInHierarchy && page.host.parent?.isValid);
        candidates.sort((left, right) => this.compareResidentOrder(left, right));
        const owner = candidates[candidates.length - 1];
        if (owner) {
            this.modalLayer.showBefore(owner.host, owner.spec.modal!, () => this.close(owner.view));
        }
        else {
            this.modalLayer.hide();
        }
    }

    /** 宿主或祖先的隐藏/恢复统一由框架接收，同一帧只安排一次重新选择。 */
    private readonly onResidentActivity = (): void => {
        if (!this.modalRefreshPending) {
            this.modalRefreshPending = true;
            director.on(Director.EVENT_AFTER_UPDATE, this.onModalFrame);
        }
    };
    /** 等引擎完成节点激活遍历后恢复正确模态，不要求业务View手动刷新。 */
    private readonly onModalFrame = (): void => {
        this.cancelModalRefresh();
        this.refreshModal();
    };
    /** 撤销本管理器尚未执行的模态刷新；卸载后不能由迟到帧重新创建节点。 */
    private cancelModalRefresh(): void {
        this.modalRefreshPending = false;
        director.off(Director.EVENT_AFTER_UPDATE, this.onModalFrame);
    }

    /** 同一树按兄弟索引比较实际显示顺序；不同树无法比较时才采用打开次序。 */
    private compareResidentOrder(left: ResidentPage, right: ResidentPage): number {
        const leftPath: Node[] = [];
        const rightPath: Node[] = [];
        for (let node: Node | null = left.host; node; node = node.parent) {
            leftPath.unshift(node);
        }
        for (let node: Node | null = right.host; node; node = node.parent) {
            rightPath.unshift(node);
        }
        if (leftPath[0] !== rightPath[0]) {
            return left.order - right.order;
        }
        const length = Math.min(leftPath.length, rightPath.length);
        for (let index = 0; index < length; index++) {
            if (leftPath[index] !== rightPath[index]) {
                return leftPath[index].getSiblingIndex() - rightPath[index].getSiblingIndex();
            }
        }
        return leftPath.length - rightPath.length;
    }

    private top(id: string): OpenPage | null {
        const list = this.pages.get(id);
        if (!list || list.length === 0) {
            return null;
        }
        return list[list.length - 1];
    }

    /** 重开前先淘汰过期页；取出的页面不再接受闲置清理。 */
    private takeCache(id: string): OpenPage | null {
        this.collectCached();
        const page = this.cached.get(id);
        if (!page) {
            return null;
        }
        this.cached.delete(id);
        this.scheduleCacheCollection();
        if (!page.host.isValid || !page.view.node || !page.view.node.isValid) {
            return null;
        }
        return page;
    }

    /** 登记独立的打开意图，允许切页取消在途等待。 */
    private issuePageIntent(id: string): PageIntent {
        let cancel!: () => void;
        const cancelled = new Promise<never>((_resolve, reject) => {
            cancel = () => reject(new OpenCancelled());
        });
        const intent = { id, cancel, cancelled };
        this.pageIntents.add(intent);
        return intent;
    }

    /** 下载完成后重新检查导航意图。等待就绪时取消也会释放已经挂载的页面。 */
    private async openNew(ctor: ViewClass<unknown>, spec: ViewSpec, args: unknown): Promise<BaseView<unknown>> {
        const started = GameLog.monoNow();
        const shell = new Node("LiveShell");
        const origin = this.nav ? this.nav.current : null;
        const intent = this.issuePageIntent(spec.id);
        let view: BaseView<unknown> | null = null;
        try {
            const validate = () => this.ensureCurrent(intent, origin);
            const prefab = await Promise.race([this.loadViewPrefab(spec, validate), intent.cancelled]);
            validate();
            view = this.mount(shell, ctor, spec, args, prefab);
            await Promise.race([view.whenReady(), intent.cancelled]);
            validate();
            this.stage(spec, shell, view, intent);
            this.noteOpened(view, spec, started);
        }
        catch (err) {
            throw this.abandon(spec, shell, view, intent, err);
        }
        this.notify(spec.id);
        return view;
    }

    /** 复用已关闭页面；取消或失败时销毁实例，禁止把部分打开的页面重新缓存。 */
    private async reopen(page: OpenPage, spec: ViewSpec, args: unknown): Promise<BaseView<unknown>> {
        const origin = this.nav ? this.nav.current : null;
        const intent = this.issuePageIntent(spec.id);
        const started = GameLog.monoNow();
        try {
            if (spec.prepare) {
                await Promise.race([spec.prepare(), intent.cancelled]);
            }
            this.ensureCurrent(intent, origin);
            if (!page.host.isValid || !page.view.node?.isValid) {
                throw new OpenCancelled();
            }
            page.host.active = true;
            page.view.runOpen(args);
            await Promise.race([page.view.whenReady(), intent.cancelled]);
            this.ensureCurrent(intent, origin);
            this.stage(spec, page.host, page.view, intent);
            this.noteOpened(page.view, spec, started);
        }
        catch (err) {
            throw this.abandon(spec, page.host, page.view, intent, err);
        }
        this.notify(spec.id);
        return page.view;
    }

    /** 意图还在，而且玩家没有切到别的页。 */
    private ensureCurrent(intent: PageIntent, origin: string | null): void {
        if (!this.pageIntents.has(intent)) {
            throw new OpenCancelled();
        }
        if (!this.nav) {
            throw new Error("UIManager 还没接上页面栈");
        }
        if (this.nav.current !== origin && this.nav.current !== intent.id) {
            throw new OpenCancelled();
        }
    }

    /** 装好了才登记进栈。只清掉这一次的意图，别的打开还留着。 */
    private stage(spec: ViewSpec, shell: Node, view: BaseView<unknown>, intent: PageIntent): void {
        if (!this.nav) {
            throw new Error("UIManager 还没接上页面栈");
        }
        if (!shell.isValid || !view.node?.isValid) {
            throw new OpenCancelled();
        }
        this.prepared.set(spec.id, { id: spec.id, host: shell, view });
        this.armed.add(spec.id);
        if (spec.allowMultiple || this.nav.current !== spec.id) {
            this.nav.openChild(spec.id);
        }
        if (!this.top(spec.id)) {
            throw new Error("页面没有挂上 " + spec.id);
        }
        this.pageIntents.delete(intent);
    }

    /** 已经在栈上才刷新底栏。 */
    private notify(id: string): void {
        if (this.host && this.host.onPageOpened) {
            this.host.onPageOpened(id);
        }
    }

    /** 终止尚未完成的打开，关闭View并销毁外壳；主动取消不作为加载失败重复报告。 */
    private abandon(spec: ViewSpec, shell: Node, view: BaseView<unknown> | null, intent: PageIntent, err: unknown): Error {
        const pending = this.pageIntents.delete(intent);
        const cancelled = UIManager.isOpenCancelled(err) || !pending;
        if (this.prepared.get(spec.id)?.host === shell) {
            this.armed.delete(spec.id);
            this.prepared.delete(spec.id);
        }
        if (view) {
            this.releasePage({ id: spec.id, host: shell, view });
        } else if (shell.isValid) {
            shell.destroy();
        }
        if (!cancelled) {
            this.reportOpenFailed(spec.id, err);
        }
        if (cancelled && !UIManager.isOpenCancelled(err)) {
            GameLog.shared.classified("FRAMEWORK", "info", "UI", "打开已取消 " + spec.id + " " + ErrorUtils.messageOf(err));
            return new OpenCancelled();
        }
        return err instanceof Error ? err : new Error(ErrorUtils.messageOf(err));
    }

    /** 先准备页面配置，再按唯一地址加载Prefab；配置等待期间取消则不继续下载或挂载。 */
    private async loadViewPrefab(spec: ViewSpec, validate: () => void): Promise<Prefab> {
        try {
            if (spec.prepare) {
                await spec.prepare();
            }
            validate();
            return spec.load ? await spec.load() : await PrefabLoader.loadPrefab(spec.prefab);
        }
        catch (error) {
            if (UIManager.isOpenCancelled(error)) {
                throw error;
            }
            throw new Error(spec.prefab + " " + ErrorUtils.messageOf(error));
        }
    }

    /** 为宿主保留预制依赖并同步绑定视图，调用方持有实例后再等待异步就绪。 */
    private mount(shell: Node, ctor: ViewClass<unknown>, spec: ViewSpec, args: unknown, prefab: Prefab): BaseView<unknown> {
        if (!shell.isValid) {
            throw new Error("页面已关");
        }
        PrefabLoader.retainPrefabForNode(prefab, shell);
        const viewNode = PrefabLoader.spawnPrefab(prefab, shell);
        if (!shell.isValid || !viewNode.isValid) {
            throw new Error("页面已关");
        }
        const found = viewNode.getComponent(ctor);
        if (!found) {
            throw new Error(spec.prefab + " 上没有视图组件");
        }
        try {
            if (spec.createBinding) {
                found.attachBinding(spec.createBinding(found));
            }
            found.runOpen(args);
        }
        catch (error) {
            this.releaseView(spec.id, found);
            throw error;
        }
        return found;
    }

    /**
     * whenReady 已经兑现（finishOpen）才打打开行。
     * 新开从openNew进入，含配置准备、预制加载和runOpen；再次打开同样从配置准备量到whenReady。
     * 加载失败、取消、whenReady 拒绝都不打这行。
     */
    private noteOpened(view: BaseView<unknown>, spec: ViewSpec, started: number): void {
        const ctor = view.constructor as {
            name?: string;
        };
        const raw = ctor && typeof ctor.name === "string" ? ctor.name : "";
        const viewName = raw && raw.length > 2 && raw !== "Component" ? raw : spec.id;
        UIOpenLogUtils.logViewReady(viewName, spec.prefab, started, "UIManager");
    }

    /** 页面还没进栈。Toast 给玩家看，日志留给排查。取消不走这里。 */
    private reportOpenFailed(id: string, err: unknown): void {
        if (UIManager.isFailureReported(err)) {
            return;
        }
        if (typeof err === "object" && err !== null) {
            UIManager.reportedFailures.add(err);
        }
        const text = id === "bag" ? "背包没有打开" : "页面没有打开";
        GameLog.shared.classified("FRAMEWORK", "error", "UIManager", text + " " + ErrorUtils.messageOf(err));
        this.toast(text);
    }
}
ViewCloseUtils.bindViewCloser((view) => {
    UIManager.instance.close(view);
});
