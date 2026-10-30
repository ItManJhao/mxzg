import { CITY_BAR } from "../config/nav";

/**
 * 底栏切页的方向和缓动。只服务底栏七格，不改页面栈本身。
 * 日服 MainSceneCtr:changeLayer 用 EaseExponentialOut：下标变大时旧页向左出、新页从右进。
 * 曲线用同一条指数，时长固定，不逐帧对齐 Lua。
 */

const BAR_PAGE: { [id: string]: string } = {
  city: "city",
  hero: "hero",
  bag: "bag",
  battle: "mainline",
  dungeon: "daily",
  clan: "clan",
  fetter: "fetter",
};

export const BAR_SLIDE_MS = 280;
/** 预制还没挂上时继续等。超时后仍播，避免底栏一直锁住。 */
export const BAR_SLIDE_READY_MS = 4000;

const PAGE_BAR: { [page: string]: string } = {
  city: "city",
  hero: "hero",
  "hero-detail": "hero",
  bag: "bag",
  mainline: "battle",
  daily: "dungeon",
  clan: "clan",
  fetter: "fetter",
  fetterData: "fetter",
  fetterFashion: "fetter",
};

/** 当前页自己就是底栏目的地时，只亮这一格。英雄详情仍算英雄。 */
export function barIdForPage(pageId: string): string | null {
  const bar = PAGE_BAR[pageId];
  return bar || null;
}

/**
 * 底栏高亮。当前页能对上七格时只返回那一格。
 * 对不上（邮件等）且导航根是英雄时，仍亮英雄。主城的子页不顺带亮主城。
 */
export function selectedBarId(current: string, root: string): string | null {
  const owner = barIdForPage(current);
  if (owner) return owner;
  if (root === "hero") return "hero";
  return null;
}

/**
 * 空壳和只有岩洞底图时，页还不能播。PagePrefabShell 或主城/背包内容挂上才算就绪。
 */
export function pageContentReady(childNames: string[]): boolean {
  for (let i = 0; i < childNames.length; i++) {
    if (childNames[i] && childNames[i] !== "ListBackdrop") return true;
  }
  return false;
}

export function barIndex(id: string): number {
  for (let i = 0; i < CITY_BAR.length; i++) {
    if (CITY_BAR[i].id === id) return i;
  }
  return -1;
}

/** 主城只露出栈里的旧页，没有新的 open。战斗页是主线，副本页是日常。 */
export function barPageId(id: string): string | null {
  if (barIndex(id) <= 0) return null;
  const page = BAR_PAGE[id];
  return page || null;
}

/** 1：新页从右进。-1：新页从左进。0：不播。 */
export function barSlideDir(fromIndex: number, toIndex: number): -1 | 0 | 1 {
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return 0;
  return toIndex > fromIndex ? 1 : -1;
}

/** Cocos EaseExponentialOut：1 - 2^(-10t)。两端钉死，避免停在 0.999。 */
export function expoOut(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(2, -10 * t);
}

export function slideOffset(dir: -1 | 1, travel: number, t: number): { outX: number; inX: number } {
  const k = expoOut(t);
  return {
    outX: -dir * travel * k,
    inX: dir * travel * (1 - k),
  };
}

/**
 * 滑一屏，两边都盖住视口时中间不留缝。
 * 页比视口宽时要多滑半截差，否则宽页的边还在画面里，对面已经空了。
 */
export function slideTravel(viewW: number, outgoingW: number, incomingW: number): number {
  const view = viewW > 0 ? viewW : 720;
  const outW = outgoingW > 0 ? outgoingW : view;
  const inW = incomingW > 0 ? incomingW : view;
  const wider = Math.max(outW, inW, view);
  return (wider + view) / 2;
}

interface SlideEvent<T> {
  kind: "show" | "hide" | "drop";
  node: T;
}

/**
 * 一次底栏切换里，页面栈会先关掉中间层再打开新页。
 * 这里只记显隐，真正滑的是原来看得见的那一页和最后留下的那一页。
 */
export class SlideCapture<T> {
  readonly dir: 1 | -1;
  readonly dest: string | null;
  waiting = false;
  sawPage = false;
  outgoing: T | null = null;
  private events: SlideEvent<T>[] = [];
  private outgoingNotes: Array<() => void> = [];
  private intermediateNotes: Array<() => void> = [];
  private tookOutgoingNote = false;

  constructor(dir: 1 | -1, dest: string | null) {
    this.dir = dir;
    this.dest = dest;
  }

  hide(node: T): void {
    if (this.outgoing === null) this.outgoing = node;
    this.events.push({ kind: "hide", node });
  }

  show(node: T): void {
    this.events.push({ kind: "show", node });
  }

  drop(node: T): void {
    if (this.outgoing === null) this.outgoing = node;
    this.events.push({ kind: "drop", node });
  }

  hasWork(): boolean {
    return this.outgoing !== null;
  }

  /** 最后一次被显示、而且没有随后关掉或藏起来的页。 */
  incoming(): T | null {
    const dead: T[] = [];
    let incoming: T | null = null;
    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];
      if (ev.kind === "drop") {
        if (dead.indexOf(ev.node) < 0) dead.push(ev.node);
        if (incoming === ev.node) incoming = null;
        continue;
      }
      if (ev.kind === "hide") {
        if (incoming === ev.node) incoming = null;
        continue;
      }
      if (dead.indexOf(ev.node) >= 0) continue;
      if (ev.node === this.outgoing) continue;
      incoming = ev.node;
    }
    return incoming;
  }

  /** 被关掉、但不是正在滑出的那一页。这些不进画面。 */
  immediateDrops(): T[] {
    const out: T[] = [];
    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];
      if (ev.kind !== "drop" || ev.node === this.outgoing) continue;
      if (out.indexOf(ev.node) >= 0) continue;
      out.push(ev.node);
    }
    return out;
  }

  wasDropped(node: T): boolean {
    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];
      if (ev.kind === "drop" && ev.node === node) return true;
    }
    return false;
  }

  /** 切换过程中被点亮又盖住的页，结束后保持隐藏。 */
  nodesToHide(incoming: T | null): T[] {
    const out: T[] = [];
    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];
      if (ev.kind !== "hide") continue;
      if (ev.node === this.outgoing || ev.node === incoming) continue;
      if (this.wasDropped(ev.node)) continue;
      if (out.indexOf(ev.node) >= 0) continue;
      out.push(ev.node);
    }
    return out;
  }

  takeNote(fn: () => void): void {
    if (!this.tookOutgoingNote) {
      this.tookOutgoingNote = true;
      this.outgoingNotes.push(fn);
      return;
    }
    this.intermediateNotes.push(fn);
  }

  flushIntermediate(): Array<() => void> {
    const notes = this.intermediateNotes;
    this.intermediateNotes = [];
    return notes;
  }

  flushOutgoing(): Array<() => void> {
    const notes = this.outgoingNotes;
    this.outgoingNotes = [];
    return notes;
  }

  drainNotes(): Array<() => void> {
    const notes = this.outgoingNotes.concat(this.intermediateNotes);
    this.outgoingNotes = [];
    this.intermediateNotes = [];
    return notes;
  }
}
