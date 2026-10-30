import { _decorator, Component } from "cc";
import { requestViewClose } from "./ViewClose";
import type { ViewController } from "./UIRegistry";
import { EventScope } from "../EventScope";

const { ccclass } = _decorator;

/**
 * 正式界面的基类。节点引用用子类上的 @property，不在这里搜整棵树。
 * 打开和关闭走 UIManager。生命周期由 run* 包一层，避免重复调用。
 * onCreate / onBind 一份实例只走一次。onOpen 每次显示一次。
 * onClose 每次关掉一次。onUnbind / dispose 卸掉时各一次。
 */
@ccclass("BaseView")
export class BaseView<TArgs = unknown> extends Component {
  protected args: TArgs | undefined;
  private ready: Promise<void> | null = null;
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((err: Error) => void) | null = null;
  private readySettled = false;
  private created = false;
  private bound = false;
  private shown = false;
  private unbound = false;
  private disposed = false;
  private controller: ViewController | null = null;
  private readonly eventScope = new EventScope(this.constructor.name);

  /** Views register their own event/button disposers; closing never clears another owner's listeners. */
  protected ownListener(stop: () => void): void { this.eventScope.add(stop); }

  /** UIManager attaches the application-created controller before opening the View. */
  attachController(controller: ViewController): void {
    if (this.created || this.disposed || this.controller) throw new Error("Controller must be attached once before View creation");
    if (typeof controller.show !== "function" || typeof controller.close !== "function") {
      throw new Error("BaseView.attachController 只接受页面生命周期适配器；模块 BaseController 必须由应用管理");
    }
    this.controller = controller;
  }

  /** 实例第一次挂上时。 */
  onCreate(): void {}

  /** 数据和节点绑上时。卸掉之前只走一次。 */
  onBind(): void {}

  /** 每次显示。UIManager 在预制挂进层之后调用。 */
  onOpen(args?: TArgs): void {
    this.args = args;
  }

  /** 每次关掉。退订放这里。 */
  onClose(): void {}

  /** 和节点解开。缓存的页面关掉时不走这里。 */
  onUnbind(): void {}

  /** 实例不要了。只走一次。 */
  dispose(): void {}

  /** 关掉自己这一页。不是最上面一层时 UIManager 不会拆下面的页。 */
  close(): void {
    requestViewClose(this);
  }

  whenReady(): Promise<void> {
    return this.ready || Promise.resolve();
  }

  /** 第一次异步开页之前调用，让 open() 能等到格子挂上。 */
  protected beginOpen(): void {
    if (this.ready) return;
    this.readySettled = false;
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
  }

  protected finishOpen(): void {
    if (this.readySettled) return;
    this.readySettled = true;
    const resolve = this.resolveReady;
    this.resolveReady = null;
    this.rejectReady = null;
    if (resolve) resolve();
  }

  /** 异步挂载失败。whenReady 必须拒绝，不能再当成打开成功。 */
  protected failOpen(err: Error): void {
    if (this.readySettled) return;
    this.readySettled = true;
    const reject = this.rejectReady;
    this.resolveReady = null;
    this.rejectReady = null;
    if (reject) reject(err);
  }

  runCreate(): void {
    if (this.created || this.disposed) return;
    this.created = true;
    this.onCreate();
  }

  runBind(): void {
    if (this.bound || this.unbound || this.disposed) return;
    this.runCreate();
    this.bound = true;
    this.onBind();
  }

  runOpen(args?: TArgs): void {
    if (this.disposed || this.unbound) return;
    this.runBind();
    this.args = args;
    this.shown = true;
    this.onOpen(args);
    this.controller?.show();
  }

  runClose(): void {
    if (!this.shown) return;
    this.shown = false;
    try { this.controller?.close(); }
    finally {
      try { this.onClose(); }
      finally { this.eventScope.clear(); }
    }
  }

  runUnbind(): void {
    if (!this.bound || this.unbound) return;
    this.unbound = true;
    this.bound = false;
    this.onUnbind();
  }

  runDispose(): void {
    if (this.disposed) return;
    this.runClose();
    this.runUnbind();
    this.disposed = true;
    this.dispose();
    this.controller = null;
  }
}
