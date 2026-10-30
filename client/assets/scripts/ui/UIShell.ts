import { Layers, Node, UITransform, view, Widget } from "cc";
import { GameLog } from "../core/GameLog";
import { PageStack } from "./PageStack";
import { UIManager } from "../framework/ui/UIManager";
import { PopupQueue } from "./PopupQueue";
import { bindSafeArea, SafeAreaBinding } from "./SafeArea";
import { BAR_SLIDE_MS, BAR_SLIDE_READY_MS, pageContentReady, SlideCapture, slideOffset, slideTravel } from "./barSlide";
import { StackView } from "./StackView";
import { Toast } from "./Toast";
import { uiNode } from "./UiKit";
import { markPageShown } from "../framework/ui/UIOpenLog";

/**
 * 挂在同一个 Canvas 上的四层：Page / Chrome / Popup / Toast。
 * 场景里不用摆节点，MainApp 调 mount 即可。
 * Page / Chrome / Toast 会按安全区平移并在必要时缩小；弹窗层只平移，遮罩仍盖住画面。
 * Chrome 不进页面栈，顶栏和底栏在打开面板时仍留在上面。
 * 底栏七格切换可以带一次横向缓动。没预约时，打开和关闭仍是立刻完成。
 */
export class UIShell {
  readonly pages = new PageStack();
  readonly popups = new PopupQueue();
  readonly pageLayer: Node;
  readonly chromeLayer: Node;
  readonly popupLayer: Node;
  readonly toastLayer: Node;
  readonly toast: Toast;

  private safeBinding: SafeAreaBinding | null = null;
  private capture: SlideCapture<Node> | null = null;
  private playing: BarSlide | null = null;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor(canvas: Node) {
    this.pageLayer = this.makeLayer(canvas, "LayerPage");
    this.chromeLayer = this.makeLayer(canvas, "LayerChrome");
    this.popupLayer = this.makeLayer(canvas, "LayerPopup");
    this.toastLayer = this.makeLayer(canvas, "LayerToast");
    this.toast = new Toast(this.toastLayer);
    this.safeBinding = bindSafeArea({
      canvas,
      targets: [
        { node: this.pageLayer },
        { node: this.chromeLayer },
        { node: this.popupLayer, scale: false },
        { node: this.toastLayer },
      ],
    });
  }

  static mount(canvas: Node): UIShell {
    return new UIShell(canvas);
  }

  /**
   * 底栏一次切换。dir 1 是新页从右进，dest 是将要打开的页名。
   * 回主城时 dest 为空，只把当前页滑走。
   */
  armBarSlide(dir: 1 | -1, dest: string | null): void {
    this.cancelBarSlide();
    this.capture = new SlideCapture(dir, dest);
  }

  /** 背包预制还在加载。页真正挂上之前不要取消这次预约。 */
  holdBarSlide(): void {
    if (this.capture) this.capture.waiting = true;
  }

  barSlideWaiting(): boolean {
    return !!this.capture && this.capture.waiting && !this.capture.sawPage;
  }

  /** 正在等页就绪，或正在滑。这段时间底栏连点直接丢掉，避免把过场收成瞬切。 */
  barSlideBusy(): boolean {
    return this.capture !== null || this.playing !== null;
  }

  /** 同步切页走完后调用。还在等背包时先留着。 */
  sealBarSlide(): void {
    if (this.playing) return;
    const cap = this.capture;
    if (!cap) return;
    if (cap.waiting && !cap.sawPage) return;
    if (!cap.hasWork()) {
      this.dropCapture();
      return;
    }
    this.beginMotion(false);
  }

  /** 返回、连点、或这次打开失败。正在滑的直接收到终点。 */
  cancelBarSlide(): void {
    if (this.playing) {
      this.complete(this.playing);
      return;
    }
    const cap = this.capture;
    if (!cap) return;
    if (!cap.hasWork()) {
      this.dropCapture();
      return;
    }
    this.beginMotion(true);
  }

  /** 只丢掉还没挂上页的预约。已经在滑的切页不动。 */
  dropWaitingBarSlide(dest: string): void {
    const cap = this.capture;
    if (!cap || cap.dest !== dest || cap.sawPage) return;
    this.dropCapture();
  }

  /**
   * 底栏切换关页时，视图卸载推迟到滑完。
   * 返回 true 表示已经收下，调用方不要再立刻 noteClosed。
   */
  deferBarNote(fn: () => void): boolean {
    if (!this.capture) return false;
    this.capture.takeNote(fn);
    return true;
  }

  openPage(name: string, node: Node): void {
    const joining = !!(this.capture && this.capture.dest === name);
    if (!joining) this.cancelBarSlide();
    this.attach(this.pageLayer, node);
    if (joining && this.capture) this.capture.sawPage = true;
    this.pages.open(name, toView(node, this));
    markPageShown(name);
    if (joining && this.capture && this.capture.waiting) this.sealBarSlide();
  }

  closePage(): string | null {
    if (this.playing) this.cancelBarSlide();
    const name = this.pages.close();
    if (name) GameLog.shared.info("UIShell", "关闭界面 " + name);
    return name;
  }

  /** 页面栈显隐。底栏预约期间先记下，不立刻改 active。返回 true 表示已接管。 */
  noteBarVisible(node: Node, visible: boolean): boolean {
    const cap = this.capture;
    if (!cap || node.parent !== this.pageLayer) return false;
    if (visible) cap.show(node);
    else cap.hide(node);
    return true;
  }

  /** 页面栈销毁。底栏预约期间先留着节点。返回 true 表示已接管。 */
  noteBarDispose(node: Node): boolean {
    const cap = this.capture;
    if (!cap || node.parent !== this.pageLayer) return false;
    cap.drop(node);
    return true;
  }

  enqueuePopup(name: string, node: Node): void {
    this.attach(this.popupLayer, node);
    this.popups.enqueue(name, toView(node, this));
    GameLog.shared.info("UIShell", "打开弹窗 " + name + " pending=" + this.popups.pending);
  }

  closePopup(): string | null {
    const name = this.popups.closeCurrent();
    if (name) GameLog.shared.info("UIShell", "关闭弹窗 " + name);
    return name;
  }

  showToast(text: string, durationMs?: number): void {
    this.toast.show(text, durationMs);
  }

  dispose(): void {
    this.stopReadyWait();
    if (this.playing) {
      if (this.playing.timer) clearTimeout(this.playing.timer);
      this.playing = null;
    }
    this.capture = null;
    if (!this.safeBinding) return;
    this.safeBinding.dispose();
    this.safeBinding = null;
  }

  private makeLayer(canvas: Node, name: string): Node {
    const node = uiNode(name);
    const ui = node.addComponent(UITransform);
    ui.setContentSize(2000, 2000);
    node.parent = canvas;
    return node;
  }

  private attach(layer: Node, node: Node): void {
    node.layer = Layers.Enum.UI_2D;
    node.active = false;
    node.parent = layer;
  }

  private dropCapture(): void {
    this.stopReadyWait();
    const cap = this.capture;
    this.capture = null;
    if (!cap) return;
    const notes = cap.drainNotes();
    for (let i = 0; i < notes.length; i++) notes[i]();
  }

  private beginMotion(snap: boolean, force = false): void {
    const cap = this.capture;
    if (!cap) return;
    const incomingNow = cap.incoming();
    if (!snap && !force && incomingNow && incomingNow.isValid && !pageContentReady(childNames(incomingNow))) {
      this.scheduleReady(cap);
      return;
    }
    this.stopReadyWait();
    this.capture = null;
    const incoming = incomingNow;
    const outgoing = cap.outgoing;
    const drops = cap.immediateDrops();
    for (let i = 0; i < drops.length; i++) releasePage(drops[i]);
    const midNotes = cap.flushIntermediate();
    for (let i = 0; i < midNotes.length; i++) midNotes[i]();
    const hidden = cap.nodesToHide(incoming);
    for (let i = 0; i < hidden.length; i++) {
      if (hidden[i].isValid) hidden[i].active = false;
    }
    const outgoingNotes = cap.flushOutgoing();
    if (!outgoing || !incoming || outgoing === incoming || !outgoing.isValid || !incoming.isValid) {
      if (incoming && incoming.isValid) incoming.active = true;
      if (outgoing && outgoing !== incoming && outgoing.isValid) {
        outgoing.active = false;
        if (cap.wasDropped(outgoing)) releasePage(outgoing);
      }
      for (let i = 0; i < outgoingNotes.length; i++) outgoingNotes[i]();
      return;
    }
    const travel = slideTravel(this.viewportWidth(), paintedWidth(outgoing), paintedWidth(incoming));
    const play: BarSlide = {
      dir: cap.dir,
      outgoing,
      incoming,
      outBase: spotOf(outgoing),
      inBase: spotOf(incoming),
      travel,
      dropOutgoing: cap.wasDropped(outgoing),
      notes: outgoingNotes,
      resumeOut: pauseWidget(outgoing),
      resumeIn: pauseWidget(incoming),
      timer: null,
    };
    incoming.setSiblingIndex(Math.max(0, this.pageLayer.children.length - 1));
    if (snap) {
      this.playing = play;
      this.complete(play);
      return;
    }
    this.playing = play;
    GameLog.shared.info("UIShell", play.dir > 0 ? "底栏切页 从右进" : "底栏切页 从左进");
    this.apply(play, 0);
    this.tick(play, Date.now());
  }

  /** 旧页先停在原地。下一页出现 PagePrefabShell（或主城/背包内容）后再滑。 */
  private scheduleReady(cap: SlideCapture<Node>): void {
    if (this.readyTimer) return;
    const started = Date.now();
    const step = () => {
      this.readyTimer = null;
      if (this.capture !== cap) return;
      const incoming = cap.incoming();
      if (!incoming || !incoming.isValid) {
        this.beginMotion(true);
        return;
      }
      const ready = pageContentReady(childNames(incoming));
      if (ready || Date.now() - started >= BAR_SLIDE_READY_MS) {
        if (!ready) GameLog.shared.info("UIShell", "底栏切页等待超时，仍开始滑");
        this.beginMotion(false, true);
        return;
      }
      this.readyTimer = later(step, 16);
    };
    this.readyTimer = later(step, 16);
  }

  private stopReadyWait(): void {
    if (!this.readyTimer) return;
    clearTimeout(this.readyTimer);
    this.readyTimer = null;
  }

  private tick(play: BarSlide, started: number): void {
    if (this.playing !== play) return;
    const t = Math.min(1, (Date.now() - started) / BAR_SLIDE_MS);
    this.apply(play, t);
    if (t >= 1) {
      this.complete(play);
      return;
    }
    play.timer = later(() => this.tick(play, started), 16);
  }

  private apply(play: BarSlide, t: number): void {
    const off = slideOffset(play.dir, play.travel, t);
    if (play.outgoing.isValid) {
      play.outgoing.active = true;
      play.outgoing.setPosition(play.outBase.x + off.outX, play.outBase.y, play.outBase.z);
    }
    if (play.incoming.isValid) {
      play.incoming.active = true;
      play.incoming.setPosition(play.inBase.x + off.inX, play.inBase.y, play.inBase.z);
    }
  }

  private complete(play: BarSlide): void {
    if (this.playing !== play) return;
    this.playing = null;
    if (play.timer) clearTimeout(play.timer);
    play.timer = null;
    if (play.outgoing.isValid) {
      play.outgoing.active = false;
      play.outgoing.setPosition(play.outBase.x, play.outBase.y, play.outBase.z);
      if (play.dropOutgoing) releasePage(play.outgoing);
    }
    if (play.incoming.isValid) {
      play.incoming.active = true;
      play.incoming.setPosition(play.inBase.x, play.inBase.y, play.inBase.z);
    }
    play.resumeOut();
    play.resumeIn();
    for (let i = 0; i < play.notes.length; i++) play.notes[i]();
  }

  private viewportWidth(): number {
    const scale = this.pageLayer.scale && this.pageLayer.scale.x > 0 ? this.pageLayer.scale.x : 1;
    try {
      const size = view.getVisibleSize();
      if (size && size.width > 0) return size.width / scale;
    } catch (_err) {
      /* 可见宽度还没有时按主城页宽滑一屏。 */
    }
    return 720;
  }
}

interface Spot {
  x: number;
  y: number;
  z: number;
}

interface BarSlide {
  dir: 1 | -1;
  outgoing: Node;
  incoming: Node;
  outBase: Spot;
  inBase: Spot;
  travel: number;
  dropOutgoing: boolean;
  notes: Array<() => void>;
  resumeOut: () => void;
  resumeIn: () => void;
  timer: ReturnType<typeof setTimeout> | null;
}

function toView(node: Node, shell: UIShell): StackView {
  return {
    setVisible(visible: boolean) {
      if (shell.noteBarVisible(node, visible)) return;
      node.active = visible;
    },
    dispose() {
      if (shell.noteBarDispose(node)) return;
      releasePage(node);
    },
  };
}

function releasePage(node: Node): void {
  if (UIManager.instance.retainOnClose(node)) {
    node.removeFromParent();
    return;
  }
  if (node.isValid) node.destroy();
}

function spotOf(node: Node): Spot {
  const pos = node.position;
  return {
    x: pos && typeof pos.x === "number" ? pos.x : 0,
    y: pos && typeof pos.y === "number" ? pos.y : 0,
    z: pos && typeof pos.z === "number" ? pos.z : 0,
  };
}

function childNames(node: Node): string[] {
  const kids = node.children;
  if (!kids) return [];
  const names: string[] = [];
  for (let i = 0; i < kids.length; i++) names.push(kids[i].name);
  return names;
}

function uiWidth(node: Node): number {
  const ui = node.getComponent(UITransform) as UITransform | null;
  if (!ui || !ui.contentSize || !(ui.contentSize.width > 0)) return 0;
  return ui.contentSize.width;
}

/** 页根本身经常是空壳，真正铺满的是下一层。 */
function paintedWidth(node: Node): number {
  let width = uiWidth(node);
  const kids = node.children;
  if (!kids) return width;
  for (let i = 0; i < kids.length; i++) {
    const childW = uiWidth(kids[i]);
    if (childW > width) width = childW;
  }
  return width;
}

function pauseWidget(node: Node): () => void {
  const widget = node.getComponent(Widget) as { enabled?: boolean } | null;
  if (!widget || widget.enabled === false) return () => {};
  widget.enabled = false;
  return () => {
    if (!node.isValid) return;
    widget.enabled = true;
  };
}

function later(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
  const timer = setTimeout(fn, ms);
  const raw = timer as { unref?: () => void };
  if (typeof raw.unref === "function") raw.unref();
  return timer;
}
