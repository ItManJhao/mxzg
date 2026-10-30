import { CITY_TAB, NavHistory } from "../config/nav";

/** UIShell 用得上的那一截。页面栈负责显隐，这里只记名字。 */
export interface PanelHost<T> {
  readonly pages: { readonly current: string | null; readonly depth: number };
  openPage(name: string, view: T): void;
  closePage(): string | null;
}

/**
 * 主城面板导航。根页面是主城。
 * openRoot 先回到主城再打开底栏项；openChild 压在当前页上面。
 * 返回只关一层。关页时回调 onClose，方便日志页卸掉订阅。
 */
export class PanelNav<T> {
  readonly history = new NavHistory();
  /** 真的要切页时调用。已经在这一页上的点击不会进来。 */
  private beforeOpen: ((id: string) => void) | null = null;

  constructor(
    private readonly host: PanelHost<T>,
    private readonly create: (id: string) => T,
    private readonly onClose: (id: string) => void = () => {}
  ) {}

  /** 切页前丢掉别的未完成打开。MainApp 用来取消还在加载的背包。 */
  setBeforeOpen(fn: (id: string) => void): void {
    this.beforeOpen = fn;
  }

  get current(): string | null {
    return this.history.current;
  }

  get rootTab(): string {
    return this.history.rootTab();
  }

  start(city: T): void {
    this.history.reset(CITY_TAB);
    this.host.openPage(CITY_TAB, city);
  }

  openRoot(id: string): void {
    if (this.history.current === id) return;
    if (this.beforeOpen) this.beforeOpen(id);
    this.popTo(CITY_TAB);
    if (id === CITY_TAB) return;
    this.push(id);
  }

  openChild(id: string): void {
    if (this.history.current === id) return;
    if (this.beforeOpen) this.beforeOpen(id);
    this.push(id);
  }

  /** 已经在主城时返回 false。 */
  back(): boolean {
    if (this.host.pages.depth <= 1) return false;
    const name = this.host.closePage();
    if (name) this.onClose(name);
    this.history.pop();
    return true;
  }

  private popTo(id: string): void {
    let guard = 0;
    while (this.host.pages.current && this.host.pages.current !== id && guard < 16) {
      const name = this.host.closePage();
      guard += 1;
      if (!name) break;
      this.onClose(name);
    }
    this.history.popTo(id);
  }

  private push(id: string): void {
    const view = this.create(id);
    this.host.openPage(id, view);
    this.history.push(id);
  }
}
