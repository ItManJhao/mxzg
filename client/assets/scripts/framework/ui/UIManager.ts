import { Node, Prefab } from "cc";
import { messageOf } from "../../core/errors";
import { GameLog, monoNow } from "../../core/GameLog";
import { loadPrefab, spawnPrefab } from "../../ui/prefabLoad";
import { logViewReady } from "./UIOpenLog";
import { BaseView } from "./BaseView";
import { UILayer } from "./UILayer";
import { ViewClass, ViewSpec, viewCtorById, viewSpecOf } from "./UIRegistry";
import { bindViewCloser } from "./ViewClose";

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

/** 加载还没进栈，玩家已经去了别的页。不 Toast，不改底栏。 */
export class OpenCancelled extends Error {
  constructor() {
    super("打开已取消");
    this.name = "OpenCancelled";
  }
}

export function isOpenCancelled(err: unknown): boolean {
  return err instanceof OpenCancelled;
}

/**
 * 正式界面的开关。页面仍进 PanelNav / UIShell。
 * 没登记的页面继续走原来的 presentPage，这里不接。
 * 预制没装上之前不进页面栈，避免留下可点的空壳。
 * 每次打开带一个意图。加载期间切走，旧意图作废，不能再压栈。
 * 非 Page 且写了 hostId 的界面挂到常驻宿主，不进页面栈，也不改底栏。
 */
export class UIManager {
  static readonly instance = new UIManager();

  private nav: PageNav | null = null;
  private host: UIManagerHost | null = null;
  private armed = new Set<string>();
  private prepared = new Map<string, OpenPage>();
  private pages = new Map<string, OpenPage[]>();
  private cached = new Map<string, OpenPage>();
  private residents = new Map<string, OpenPage>();
  private residentHosts = new Map<string, () => Node | null>();
  private residentEpoch = new Map<string, number>();
  private pendingResident = new Map<string, Node>();
  private opening = new Map<string, Promise<BaseView<unknown>>>();
  private tokens = new Map<number, string>();
  private nextToken = 1;

  install(nav: PageNav, host: UIManagerHost): void {
    this.nav = nav;
    this.host = host;
  }

  /** Release only the application that owns this navigation binding. */
  uninstall(nav: PageNav): void {
    if (this.nav !== nav) return;
    this.invalidatePending();
    this.nav = null;
    this.host = null;
  }

  /**
   * 打开已注册的视图。
   * 预制、脚本都装好，并且这次打开还有效，才压进页面栈。
   * 失败时壳已经销毁，并 Toast。取消时只拆壳。
   */
  async open<T>(ctor: ViewClass<T>, args?: T): Promise<BaseView<T>> {
    const spec = viewSpecOf(ctor);
    if (!spec) throw new Error("视图未注册");
    if (spec.layer !== UILayer.Page) {
      if (!spec.hostId) throw new Error("常驻界面缺少 hostId " + spec.id);
      return this.openResident(ctor, spec, args);
    }
    if (!this.nav) throw new Error("UIManager 还没接上页面栈");
    if (!spec.allowMultiple) {
      const existing = this.top(spec.id);
      if (existing && this.nav.current === spec.id) {
        const started = monoNow();
        existing.view.runOpen(args);
        await existing.view.whenReady();
        this.noteOpened(existing.view, spec, started);
        return existing.view as BaseView<T>;
      }
      const pending = this.opening.get(spec.id);
      if (pending) return (await pending) as BaseView<T>;
    }
    const reused = spec.allowMultiple ? null : this.takeCache(spec.id);
    const job = reused ? this.reopen(reused, spec, args) : this.openNew(ctor, spec, args);
    if (!spec.allowMultiple) this.opening.set(spec.id, job);
    try {
      return (await job) as BaseView<T>;
    } finally {
      if (this.opening.get(spec.id) === job) this.opening.delete(spec.id);
    }
  }

  /**
   * presentPage 里调用。只有 open() 已经装好、刚登记过的页面才返回宿主。
   * 没登记的返回 null，调用方继续走原来的壳。
   */
  createPageHost(id: string): Node | null {
    if (!this.armed.has(id)) return null;
    this.armed.delete(id);
    const ready = this.prepared.get(id);
    this.prepared.delete(id);
    if (!ready) return null;
    const list = this.pages.get(id) || [];
    list.push(ready);
    this.pages.set(id, list);
    return ready.host;
  }

  /** 常驻层的父节点。Page 不看这里。 */
  setResidentHost(id: string, provider: () => Node | null): () => void {
    this.residentHosts.set(id, provider);
    return () => { if (this.residentHosts.get(id) === provider) this.residentHosts.delete(id); };
  }

  /** 按注册 id 打开。没登记就失败。 */
  async openById<T = unknown>(id: string, args?: T): Promise<BaseView<T>> {
    const ctor = viewCtorById(id);
    if (!ctor) throw new Error("视图未注册 " + id);
    return this.open(ctor as ViewClass<T>, args);
  }

  /** 页面栈往回退一层。已经在根上时返回 false。常驻层不跟着关。 */
  back(): boolean {
    if (!this.nav) return false;
    return this.nav.back();
  }

  isOpen(target: Function | string | object): boolean {
    const id = this.idOf(target);
    if (!id) return false;
    const resident = this.residents.get(id);
    if (resident && resident.host.isValid) return true;
    return !!this.top(id);
  }

  /** 关掉常驻界面，或当前这一页。常驻界面不要求它是页面栈顶。 */
  close(view?: object): boolean {
    if (view) {
      const spec = viewSpecOf(view.constructor);
      if (spec && spec.layer !== UILayer.Page) return this.closeResident(spec.id);
      if (!this.nav) return false;
      if (!spec || this.nav.current !== spec.id) return false;
    }
    return this.back();
  }

  /** 按 id 关掉。常驻界面在加载中也会作废这次打开。 */
  closeById(id: string): boolean {
    const ctor = viewCtorById(id);
    const spec = ctor ? viewSpecOf(ctor) : null;
    if (spec && spec.layer !== UILayer.Page) return this.closeResident(spec.id);
    if (this.nav && this.nav.current === id) return this.nav.back();
    return false;
  }

  toast(text: string): void {
    if (this.host) this.host.showToast(text, 1600);
  }

  /**
   * 后来的页面导航只留下目标页的打开意图。
   * 背包还在加载时玩家去了别的页，这次打开就不能再压栈。
   */
  keepOnly(id: string): void {
    for (const [token, page] of this.tokens) {
      if (page !== id) this.tokens.delete(token);
    }
  }

  /** 丢掉所有还没进栈的打开。 */
  invalidatePending(): void {
    this.tokens.clear();
  }

  /**
   * 页面栈要销毁宿主之前问一下。cache 的页面先摘下来，不销毁。
   * 节点已经没了就不能缓存。
   */
  retainOnClose(node: Node): boolean {
    for (const list of this.pages.values()) {
      for (let i = 0; i < list.length; i++) {
        const page = list[i];
        if (page.host !== node) continue;
        const ctor = viewCtorById(page.id);
        const spec = ctor ? viewSpecOf(ctor) : null;
        return !!(spec && spec.cache && node.isValid);
      }
    }
    return false;
  }

  /** PanelNav 关页之后调用。视图自己退订。缓存的页面只 onClose。 */
  noteClosed(id: string): void {
    const list = this.pages.get(id);
    if (!list || list.length === 0) return;
    const page = list.pop();
    if (!page) return;
    if (list.length === 0) this.pages.delete(id);
    page.view.runClose();
    const ctor = viewCtorById(id);
    const spec = ctor ? viewSpecOf(ctor) : null;
    if (spec && spec.cache && page.host.isValid && page.view.node && page.view.node.isValid) {
      page.host.removeFromParent();
      this.cached.set(id, page);
      return;
    }
    page.view.runUnbind();
    page.view.runDispose();
  }

  private idOf(target: Function | string | object): string | null {
    if (typeof target === "string") return target;
    if (typeof target === "function") {
      const spec = viewSpecOf(target);
      return spec ? spec.id : null;
    }
    const spec = viewSpecOf(target.constructor);
    return spec ? spec.id : null;
  }

  private residentParent(spec: ViewSpec): Node | null {
    if (!spec.hostId) return null;
    const provider = this.residentHosts.get(spec.hostId);
    if (!provider) return null;
    const node = provider();
    if (!node || !node.isValid) return null;
    return node;
  }

  private async openResident<T>(ctor: ViewClass<T>, spec: ViewSpec, args: unknown): Promise<BaseView<T>> {
    if (!spec.allowMultiple) {
      const existing = this.residents.get(spec.id);
      if (existing && (!existing.host.isValid || !existing.view.node || !existing.view.node.isValid)) {
        this.residents.delete(spec.id);
      }
      const alive = this.residents.get(spec.id);
      if (alive) {
        const started = monoNow();
        alive.view.runOpen(args);
        await alive.view.whenReady();
        this.noteOpened(alive.view, spec, started);
        return alive.view as BaseView<T>;
      }
      const pending = this.opening.get(spec.id);
      if (pending) return (await pending) as BaseView<T>;
    }
    const job = this.openResidentNew(ctor, spec, args);
    if (!spec.allowMultiple) this.opening.set(spec.id, job);
    try {
      return (await job) as BaseView<T>;
    } finally {
      if (this.opening.get(spec.id) === job) this.opening.delete(spec.id);
    }
  }

  private async openResidentNew<T>(ctor: ViewClass<T>, spec: ViewSpec, args: unknown): Promise<BaseView<T>> {
    const started = monoNow();
    const epoch = this.residentEpoch.get(spec.id) || 0;
    const parent = this.residentParent(spec);
    if (!parent) throw new Error("常驻层没有宿主 " + (spec.hostId || spec.id));
    let viewNode: Node | null = null;
    let view: BaseView<unknown> | null = null;
    try {
      let prefab: Prefab;
      try {
        prefab = spec.load ? await spec.load() : await loadPrefab(spec.prefab);
      } catch (err) {
        throw new Error(spec.prefab + " " + messageOf(err));
      }
      this.ensureResident(spec.id, epoch);
      if (!parent.isValid) throw new Error("页面已关");
      viewNode = spec.mount ? await spec.mount(parent, prefab) : spawnPrefab(prefab, parent);
      if (!viewNode || !viewNode.isValid) throw new Error("页面已关");
      this.pendingResident.set(spec.id, viewNode);
      this.ensureResident(spec.id, epoch);
      const found = viewNode.getComponent(ctor);
      if (!found) throw new Error(spec.prefab + " 上没有视图组件");
      view = found;
      if (spec.createController) found.attachController(spec.createController(found));
      found.runOpen(args as T);
      await found.whenReady();
      this.ensureResident(spec.id, epoch);
      if (!viewNode.isValid || !found.node || !found.node.isValid) throw new Error("页面已关");
      this.pendingResident.delete(spec.id);
      this.residents.set(spec.id, { id: spec.id, host: viewNode, view: found });
      this.noteOpened(found, spec, started);
      return found as BaseView<T>;
    } catch (err) {
      const cancelled = isOpenCancelled(err) || (this.residentEpoch.get(spec.id) || 0) !== epoch;
      this.pendingResident.delete(spec.id);
      if (view) {
        view.runClose();
        view.runUnbind();
        view.runDispose();
      }
      if (viewNode && viewNode.isValid) viewNode.destroy();
      this.residents.delete(spec.id);
      if (!cancelled) this.reportOpenFailed(spec.id, err);
      if (cancelled && !isOpenCancelled(err)) throw new OpenCancelled();
      throw err instanceof Error ? err : new Error(messageOf(err));
    }
  }

  private ensureResident(id: string, epoch: number): void {
    if ((this.residentEpoch.get(id) || 0) !== epoch) throw new OpenCancelled();
  }

  private closeResident(id: string): boolean {
    const had = this.opening.has(id) || this.pendingResident.has(id) || this.residents.has(id);
    this.residentEpoch.set(id, (this.residentEpoch.get(id) || 0) + 1);
    const pending = this.pendingResident.get(id) || null;
    this.pendingResident.delete(id);
    const page = this.residents.get(id) || null;
    if (page) this.residents.delete(id);
    if (page) {
      page.view.runClose();
      page.view.runUnbind();
      page.view.runDispose();
    }
    const node = (page && page.host) || pending;
    if (node && node.isValid) node.destroy();
    return had;
  }

  private top(id: string): OpenPage | null {
    const list = this.pages.get(id);
    if (!list || list.length === 0) return null;
    return list[list.length - 1];
  }

  private takeCache(id: string): OpenPage | null {
    const page = this.cached.get(id);
    if (!page) return null;
    this.cached.delete(id);
    if (!page.host.isValid || !page.view.node || !page.view.node.isValid) return null;
    return page;
  }

  private issue(id: string): number {
    const token = this.nextToken;
    this.nextToken += 1;
    this.tokens.set(token, id);
    return token;
  }

  private async openNew(ctor: ViewClass<unknown>, spec: ViewSpec, args: unknown): Promise<BaseView<unknown>> {
    const started = monoNow();
    const shell = new Node("LiveShell");
    const origin = this.nav ? this.nav.current : null;
    const token = this.issue(spec.id);
    let view: BaseView<unknown> | null = null;
    try {
      view = await this.mount(shell, ctor, spec, args);
      this.noteOpened(view, spec, started);
      this.ensureCurrent(token, spec.id, origin);
      if (!shell.isValid || !view.node || !view.node.isValid) throw new Error("页面已关");
      this.stage(spec, shell, view, token);
    } catch (err) {
      throw this.abandon(spec, shell, view, token, err);
    }
    this.notify(spec.id);
    return view;
  }

  private async reopen(page: OpenPage, spec: ViewSpec, args: unknown): Promise<BaseView<unknown>> {
    const origin = this.nav ? this.nav.current : null;
    const token = this.issue(spec.id);
    const started = monoNow();
    try {
      page.view.runOpen(args);
      await page.view.whenReady();
      this.noteOpened(page.view, spec, started);
      this.ensureCurrent(token, spec.id, origin);
      if (!page.host.isValid || !page.view.node || !page.view.node.isValid) throw new Error("页面已关");
      this.stage(spec, page.host, page.view, token);
    } catch (err) {
      const cancelled = isOpenCancelled(err) || !this.tokens.has(token);
      this.tokens.delete(token);
      this.armed.delete(spec.id);
      this.prepared.delete(spec.id);
      page.view.runClose();
      if (page.host.isValid) this.cached.set(spec.id, page);
      if (!cancelled) this.reportOpenFailed(spec.id, err);
      if (cancelled && !isOpenCancelled(err)) {
        GameLog.shared.info("UI", "打开已取消 " + spec.id + " " + messageOf(err));
        throw new OpenCancelled();
      }
      throw err instanceof Error ? err : new Error(messageOf(err));
    }
    this.notify(spec.id);
    return page.view;
  }

  /** 意图还在，而且玩家没有切到别的页。 */
  private ensureCurrent(token: number, id: string, origin: string | null): void {
    if (!this.tokens.has(token)) throw new OpenCancelled();
    if (!this.nav) throw new Error("UIManager 还没接上页面栈");
    if (this.nav.current !== origin && this.nav.current !== id) throw new OpenCancelled();
  }

  /** 装好了才登记进栈。只清掉这一次的意图，别的打开还留着。 */
  private stage(spec: ViewSpec, shell: Node, view: BaseView<unknown>, token: number): void {
    if (!this.nav) throw new Error("UIManager 还没接上页面栈");
    this.prepared.set(spec.id, { id: spec.id, host: shell, view });
    this.armed.add(spec.id);
    if (spec.allowMultiple || this.nav.current !== spec.id) this.nav.openChild(spec.id);
    if (!this.top(spec.id)) throw new Error("页面没有挂上 " + spec.id);
    this.tokens.delete(token);
  }

  /** 已经在栈上才刷新底栏。 */
  private notify(id: string): void {
    if (this.host && this.host.onPageOpened) this.host.onPageOpened(id);
  }

  private abandon(spec: ViewSpec, shell: Node, view: BaseView<unknown> | null, token: number, err: unknown): Error {
    const cancelled = isOpenCancelled(err) || !this.tokens.has(token);
    this.tokens.delete(token);
    this.armed.delete(spec.id);
    this.prepared.delete(spec.id);
    if (view) {
      view.runClose();
      if (!spec.cache) {
        view.runUnbind();
        view.runDispose();
      }
    }
    if (shell.isValid) shell.destroy();
    if (!cancelled) this.reportOpenFailed(spec.id, err);
    if (cancelled && !isOpenCancelled(err)) {
      GameLog.shared.info("UI", "打开已取消 " + spec.id + " " + messageOf(err));
      return new OpenCancelled();
    }
    return err instanceof Error ? err : new Error(messageOf(err));
  }

  private async mount(shell: Node, ctor: ViewClass<unknown>, spec: ViewSpec, args: unknown): Promise<BaseView<unknown>> {
    let prefab: Prefab;
    try {
      prefab = spec.load ? await spec.load() : await loadPrefab(spec.prefab);
    } catch (err) {
      throw new Error(spec.prefab + " " + messageOf(err));
    }
    if (!shell.isValid) throw new Error("页面已关");
    const viewNode = spec.mount ? await spec.mount(shell, prefab) : spawnPrefab(prefab, shell);
    if (!shell.isValid || !viewNode.isValid) throw new Error("页面已关");
    const found = viewNode.getComponent(ctor);
    if (!found) throw new Error(spec.prefab + " 上没有视图组件");
    try {
      if (spec.createController) found.attachController(spec.createController(found));
      found.runOpen(args);
      await found.whenReady();
    } catch (error) {
      found.runDispose();
      throw error;
    }
    return found;
  }

  /**
   * whenReady 已经兑现（finishOpen）才打打开行。
   * 新开从 openNew 进入，含预制加载和 runOpen。再次打开从 runOpen 量到 whenReady。
   * 加载失败、取消、whenReady 拒绝都不打这行。
   */
  private noteOpened(view: BaseView<unknown>, spec: ViewSpec, started: number): void {
    const ctor = view.constructor as { name?: string };
    const raw = ctor && typeof ctor.name === "string" ? ctor.name : "";
    const viewName = raw && raw.length > 2 && raw !== "Component" ? raw : spec.id;
    logViewReady(viewName, spec.prefab, started, "UIManager");
  }

  /** 页面还没进栈。Toast 给玩家看，日志留给排查。取消不走这里。 */
  private reportOpenFailed(id: string, err: unknown): void {
    const text = id === "bag" ? "背包没有打开" : "页面没有打开";
    GameLog.shared.error("UI", text + " " + messageOf(err));
    this.toast(text);
  }
}

bindViewCloser((view) => {
  UIManager.instance.close(view);
});
