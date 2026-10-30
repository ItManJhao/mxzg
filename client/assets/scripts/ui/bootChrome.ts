/**
 * 启动加载层和热更层。两套 prefab 节点名相同，按名字绑。
 * 挂在 SafeFrame 上。项目设计分辨率是 640×1280。进场景后按可见尺寸铺，不再按父节点 2000 放大。
 * Prefab 加载失败只打日志，不另造 LoadingLayer / UpdateLayer。
 */
import { Asset, BlockInputEvents, Button, Color, Label, Mask, Node, Prefab, Sprite, SpriteFrame, UIOpacity, UITransform, resources } from "cc";
import { ConfigLoader } from "../config/ConfigLoader";
import { GameLog } from "../core/GameLog";
import { mountNamedSpine } from "./battleSpine";
import { findNode, loadPrefab, spawnPrefab } from "./prefabLoad";
import { bindVisibleRefresh, fitVisibleRoot } from "./visibleFit";
import { createButton, createLabel, place, setText, uiNode } from "./UiKit";
import { loginLayout } from "../features/account/ui/LoginLayout";

/** 登陆界面人物簇。spine/jiemian，动作 stand。 */
const BOOT_CAST_STEM = "jiemian";
const BOOT_CAST_CLIP = "stand";

/** LoadingLayer / UpdateLayer 的底图。logo 阶段用同一张，不再另铺黑底。 */
export const LOADING_BG_FRAME = "ui/maps/map-bg-loading";
/**
 * 和登录页共用 768×1300 底图与 cover 规则，人物也走同一套宽度适配。
 * 和 LoadingLayer 预制里 Bg 的 contentSize 一致。
 */
export const LOADING_BG_DRAW_W = 768;
export const LOADING_BG_DRAW_H = 1300;

export const LOADING_PREFAB_PATH = "prefabs/ui/login/LoadingLayer";
export const UPDATE_PREFAB_PATH = "prefabs/ui/login/UpdateLayer";

const FILL_W = 524;
const FILL_LEFT = -FILL_W / 2;
const TIP_MS = 3500;
const SPINE_STEM = "jindutiao";
const SPINE_CLIP = "stand";
/** 提示字。清单要求 #ffeeb2。 */
export const BOOT_TIP_COLOR = new Color(255, 238, 178, 255);
/** 阶段字（检查版本 / 登录 / 同步角色）。 */
export const BOOT_STAGE_COLOR = new Color(255, 244, 220, 255);
/** 百分比。 */
export const BOOT_PERCENT_COLOR = new Color(255, 248, 230, 255);

export type BootChromeKind = "loading" | "update";

export interface BootCopy {
  versionFail: string;
  retry: string;
  /** 版本失败层重试一次之后的按钮。language 47647 是「跳过」，表没到时用「继续」。 */
  versionSkip: string;
  newVersion: string;
  wifi: string;
  verify: string;
  tips: string[];
}

const COPY_FALLBACK: BootCopy = {
  versionFail: "校验版本失败",
  retry: "重试",
  versionSkip: "继续",
  newVersion: "有新版本啦！",
  wifi: "请在wifi环境下，点击下载按钮进行更新。",
  verify: "正在验证资源，请耐心等候",
  tips: [],
};

export async function loadBootCopy(read: <T>(path: string) => Promise<T> = ConfigLoader.loadJson): Promise<BootCopy> {
  const copy: BootCopy = {
    versionFail: COPY_FALLBACK.versionFail,
    retry: COPY_FALLBACK.retry,
    versionSkip: COPY_FALLBACK.versionSkip,
    newVersion: COPY_FALLBACK.newVersion,
    wifi: COPY_FALLBACK.wifi,
    verify: COPY_FALLBACK.verify,
    tips: [],
  };
  try {
    const lang = await read<{ rows?: unknown }>("config/language");
    const map = indexLanguage(lang.rows);
    copy.versionFail = pick(map, "47741", copy.versionFail);
    copy.retry = pick(map, "110013", copy.retry);
    copy.versionSkip = pick(map, "47647", copy.versionSkip);
    copy.newVersion = pick(map, "110029", copy.newVersion);
    copy.wifi = pick(map, "110030", copy.wifi);
    copy.verify = pick(map, "47149", copy.verify);
    const tipsFile = await read<{ rows?: unknown }>("config/loadingtips");
    const rows = Array.isArray(tipsFile.rows) ? tipsFile.rows : [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== "object") continue;
      const tips = (row as { tips?: unknown }).tips;
      const key = typeof tips === "number" || typeof tips === "string" ? String(tips) : "";
      const line = key ? map[key] : "";
      if (line) copy.tips.push(line);
    }
  } catch (_err) {
    /* 表还没齐时用上面的字。loadAll 之后会再进缓存。 */
  }
  return copy;
}

export class BootChrome {
  private cancelFade: (() => void) | null = null;
  private root: Node | null = null;
  private kind: BootChromeKind = "loading";
  private ratio = 0;
  private stage = "";
  private tips: string[] = [];
  private tipIndex = -1;
  private tipTimer: ReturnType<typeof setInterval> | null = null;
  private retryResolve: ((ok: boolean) => void) | null = null;
  private destroyed = false;

  constructor(private parent: Node, private load?: (kind: BootChromeKind) => Promise<Prefab>) {}

  /**
   * keepAbove 留在最上面。logo 淡出时用，避免加载层一挂上就把底图盖住。
   */
  async open(kind: BootChromeKind, keepAbove?: Node | null): Promise<void> {
    if (this.destroyed || !this.parent.isValid) return;
    this.kind = kind;
    this.destroyRoot();
    const path = kind === "update" ? UPDATE_PREFAB_PATH : LOADING_PREFAB_PATH;
    let root: Node | null = null;
    try {
      const prefab = this.load ? await this.load(kind) : await loadPrefab(path);
      if (this.destroyed || !this.parent.isValid) return;
      root = spawnPrefab(prefab, this.parent);
    } catch (err) {
      if (this.destroyed || !this.parent.isValid) return;
      GameLog.shared.warn("BootChrome", "加载层预制没有，不另造 " + (kind === "update" ? "UpdateLayer" : "LoadingLayer"));
      return;
    }
    this.root = root;
    this.bindRetry();
    this.apply();
    this.mountSpine();
    this.mountCast();
    this.bindFill();
    this.raise();
    placeAbove(this.parent, keepAbove);
  }

  /** 已经是这一层就不拆掉重挂，避免和 logo 交接时闪一帧黑。 */
  async ensure(kind: BootChromeKind): Promise<void> {
    if (!this.destroyed && this.kind === kind && this.root && this.root.isValid && this.root.active) {
      this.raise();
      return;
    }
    await this.open(kind);
  }

  setStage(text: string): void {
    this.stage = text;
    const node = this.child("Message");
    if (node) setText(node, text);
    tintLabel(node, BOOT_STAGE_COLOR);
  }

  setRatio(ratio: number): void {
    const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
    this.ratio = clamped;
    const width = Math.round(FILL_W * clamped);
    const mask = this.child("BarMask");
    if (mask) {
      const ui = mask.getComponent(UITransform);
      if (ui) {
        const height = ui.contentSize && ui.contentSize.height > 0 ? ui.contentSize.height : 40;
        ui.setContentSize(width, height);
      }
    }
    const head = this.child("BarHead");
    if (head) head.setPosition(FILL_LEFT + width, head.position.y, 0);
    const percent = this.child("Percent");
    if (percent) setText(percent, Math.round(clamped * 100) + "%");
    tintLabel(percent, BOOT_PERCENT_COLOR);
  }

  setTips(lines: string[]): void {
    const next: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const clean = stripHtml(lines[i]);
      if (clean) next.push(clean);
    }
    this.tips = next;
    this.tipIndex = -1;
    this.rotateTip();
    if (this.tipTimer) clearInterval(this.tipTimer);
    if (next.length > 1) this.tipTimer = setInterval(() => this.rotateTip(), TIP_MS);
  }

  show(): void {
    this.cancelFade?.();
    if (this.root && this.root.isValid) {
      const opacity = this.root.getComponent(UIOpacity);
      if (opacity) opacity.opacity = 255;
      this.root.active = true;
      this.raise();
    }
  }

  hide(): void {
    this.cancelFade?.();
    if (this.root && this.root.isValid) this.root.active = false;
    const retry = this.child("Retry");
    if (retry) retry.active = false;
  }

  /** 停在当前层上，等按钮。销毁时得到 false。 */
  prompt(message: string, buttonLabel: string): Promise<boolean> {
    this.show();
    this.setStage(message);
    this.setRetryLabel(buttonLabel);
    const retry = this.child("Retry");
    if (retry) retry.active = true;
    return new Promise((resolve) => {
      if (this.retryResolve) this.retryResolve(false);
      if (!retry) {
        this.retryResolve = null;
        resolve(false);
        return;
      }
      this.retryResolve = resolve;
    });
  }

  destroy(): void {
    this.cancelFade?.();
    this.destroyed = true;
    if (this.tipTimer) clearInterval(this.tipTimer);
    this.tipTimer = null;
    if (this.retryResolve) {
      const resolve = this.retryResolve;
      this.retryResolve = null;
      resolve(false);
    }
    this.destroyRoot();
  }

  get isReady(): boolean { return !!this.root?.isValid; }

  /** Visual transition only. Progress stays tied to the completed startup tasks. */
  fadeOut(seconds = 0.3): Promise<void> {
    this.cancelFade?.();
    const root = this.root;
    if (!root?.isValid) return Promise.resolve();
    const opacity = root.getComponent(UIOpacity) || root.addComponent(UIOpacity);
    return new Promise(resolve => {
      const started = Date.now();
      const finish = () => {
        clearInterval(timer);
        if (this.cancelFade === finish) this.cancelFade = null;
        resolve();
      };
      const timer = setInterval(() => {
        if (!root.isValid) { finish(); return; }
        const fraction = seconds > 0 ? Math.min(1, (Date.now() - started) / (seconds * 1000)) : 1;
        opacity.opacity = Math.round(255 * (1 - fraction));
        if (fraction === 1) finish();
      }, 16);
      this.cancelFade = finish;
    });
  }

  private apply(): void {
    this.setStage(this.stage);
    this.setRatio(this.ratio);
    this.rotateTip();
    const retry = this.child("Retry");
    if (retry) retry.active = false;
  }

  private rotateTip(): void {
    if (this.tips.length === 0) return;
    if (this.tips.length === 1) {
      this.tipIndex = 0;
    } else {
      let next = this.tipIndex;
      do {
        next = Math.floor(Math.random() * this.tips.length);
      } while (next === this.tipIndex);
      this.tipIndex = next;
    }
    const node = this.child("Tips");
    if (node) setText(node, this.tips[this.tipIndex]);
    tintLabel(node, BOOT_TIP_COLOR);
  }

  private mountSpine(): void {
    const host = this.child("BarMask/Spine");
    if (!host) return;
    mountNamedSpine(host, SPINE_STEM, SPINE_CLIP);
  }

  /** 正式服加载画面中间的人物特效。缺套只打日志，底图和进度条仍在。 */
  private mountCast(): void {
    const root = this.root;
    if (!root) return;
    const host = uiNode("BootCast");
    host.addComponent(UITransform).setContentSize(720, 972);
    place(host, root, 0, 0);
    const bg = root.getChildByName("Bg");
    if (bg) host.setSiblingIndex(bg.getSiblingIndex() + 1);
    mountNamedSpine(host, BOOT_CAST_STEM, BOOT_CAST_CLIP, {
      onFail: () => GameLog.shared.warn("Boot", "loading cast miss spine/" + BOOT_CAST_STEM + " clip=" + BOOT_CAST_CLIP),
    });
  }

  /**
   * 抵消 SafeFrame 在窄屏上的缩小，加载层铺满可见高。
   * 背景按 cover 放大，避免上下或左右留黑边。
   */
  private bindFill(): void {
    const root = this.root;
    if (!root) return;
    const apply = () => this.fitRoot();
    bindVisibleRefresh(root, apply);
    const later = setTimeout(apply, 160);
    root.once(Node.EventType.NODE_DESTROYED, () => clearTimeout(later));
  }

  private fitRoot(): void {
    const root = this.root;
    if (!root || !root.isValid) return;
    fitLoadingBackdrop(root);
  }

  private bindRetry(): void {
    const retry = this.child("Retry");
    if (!retry || !retry.getComponent(Button)) return;
    retry.on(Button.EventType.CLICK, () => {
      retry.active = false;
      const resolve = this.retryResolve;
      this.retryResolve = null;
      if (resolve) resolve(true);
    });
  }

  private setRetryLabel(text: string): void {
    const label = this.child("Retry/Label");
    if (label) setText(label, text);
  }

  private raise(): void {
    const root = this.root;
    const parent = root && root.parent;
    if (!root || !parent) return;
    root.setSiblingIndex(Math.max(0, parent.children.length - 1));
  }

  private child(path: string): Node | null {
    if (!this.root || !this.root.isValid) return null;
    return findNode(this.root, path);
  }

  private destroyRoot(): void {
    if (this.root && this.root.isValid) this.root.destroy();
    this.root = null;
  }


}

/** 和 LoadingLayer 一样：根铺满可见区域，Bg 再按 cover 放大，不留黑边。 */
export function fitLoadingBackdrop(root: Node): void {
  if (!root.isValid) return;
  const box = fitVisibleRoot(root);
  const layout = loginLayout(box.width, box.height);
  const cast = root.getChildByName("BootCast");
  if (cast) {
    cast.setScale(layout.castScale, layout.castScale, 1);
    cast.setPosition(0, layout.castY, 0);
  }
  const bg = root.getChildByName("Bg");
  if (!bg) return;
  const ui = bg.getComponent(UITransform);
  if (ui) ui.setContentSize(layout.backgroundWidth, layout.backgroundHeight);
  bg.setScale(1, 1, 1);
}

function placeAbove(parent: Node, node?: Node | null): void {
  if (!node || !node.isValid || !parent || !parent.isValid || node.parent !== parent) return;
  node.setSiblingIndex(Math.max(0, parent.children.length - 1));
}

function tintLabel(node: Node | null, color: Color): void {
  if (!node) return;
  const label = node.getComponent(Label);
  if (label) label.color = color;
}

function paintSprite(node: Node, sprite: Sprite, path: string): void {
  resources.load(path + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (!node.isValid || err || !frame) return;
    sprite.spriteFrame = frame;
  });
}

function indexLanguage(rows: unknown): { [key: string]: string } {
  const map: { [key: string]: string } = {};
  const list = Array.isArray(rows) ? rows : [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!row || typeof row !== "object") continue;
    const rec = row as { key?: unknown; value?: unknown };
    if (rec.key === undefined || rec.key === null || typeof rec.value !== "string") continue;
    map[String(rec.key)] = stripHtml(rec.value);
  }
  return map;
}

function pick(map: { [key: string]: string }, key: string, fallback: string): string {
  return map[key] || fallback;
}

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export function preloadBootAsset(path: string, type: unknown): Promise<void> {
  return new Promise((resolve) => {
    resources.load(path, type as typeof Asset, () => resolve());
  });
}
