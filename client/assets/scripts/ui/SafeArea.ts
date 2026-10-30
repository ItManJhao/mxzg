/**
 * H5 安全区（B8）。
 *
 * 读 Creator 3.8 已经算好的可见区域和 sys.getSafeAreaRect，
 * 把 Boot 的 SafeFrame、主城 Page/Toast 挪进安全区。
 * 不调用 view.setDesignResolutionSize，不改项目里的 Fit Width / Fit Height。
 *
 * 桌面浏览器通常没有刘海。预览边距：
 * - 控制台 localStorage.setItem("mxzg.safe", "88,0,34,0") 后改变窗口大小
 * - 或预览地址加 ?safe=88,0,34,0
 * 顺序是上、右、下、左，单位是设计分辨率像素。
 */
import { Color, Node, screen, sys, UITransform, view } from "cc";
import { GameLog } from "../core/GameLog";
import {
  applySafeFrame,
  formatAdapt,
  formatAdaptShort,
  layoutSafeFrame,
  metricsFrom,
  parseInsetOverride,
  SafeRect,
  wantsSafeDebug,
} from "./safeAreaLayout";
import { createLabel, setText } from "./UiKit";

const PREVIEW_KEY = "mxzg.safe";
const DEBUG_W = 360;
const DEBUG_H = 28;

export interface SafeTarget {
  node: Node;
  /** false：只平移到安全区中心（全屏遮罩）。默认会在安全区比设计分辨率小时缩小。 */
  scale?: boolean;
}

export interface BindSafeAreaOptions {
  canvas: Node;
  targets: SafeTarget[];
  /** 默认不画。只有 ?safeDebug=1 或 mxzg.safeDebug=1 时才在左上角显示尺寸。 */
  debugLabel?: boolean;
}

export interface SafeAreaBinding {
  refresh(): void;
  dispose(): void;
}

type SizeLike = { width?: number; height?: number };
type ResizeHost = {
  on?: (type: string, callback: () => void) => void;
  off?: (type: string, callback: () => void) => void;
};

export function bindSafeArea(options: BindSafeAreaOptions): SafeAreaBinding {
  let label: Node | null = null;
  let disposed = false;
  let pendingText = "";
  let loggedText = "";
  let logTimer: ReturnType<typeof setTimeout> | null = null;
  const timers: Array<ReturnType<typeof setTimeout>> = [];

  const writeLog = (text: string) => {
    pendingText = text;
    if (text !== loggedText && !logTimer) {
      loggedText = text;
      GameLog.shared.debug("SafeArea", text);
    }
    if (logTimer) return;
    logTimer = setTimeout(() => {
      logTimer = null;
      if (disposed || pendingText === loggedText) return;
      loggedText = pendingText;
      GameLog.shared.debug("SafeArea", pendingText);
    }, 400);
  };

  const refresh = () => {
    if (disposed) return;
    const metrics = readEngineMetrics(canvasSize(options.canvas));
    const frame = layoutSafeFrame(metrics);
    for (const target of options.targets) {
      if (!target.node.isValid) continue;
      applySafeFrame(target.node, frame, target.scale !== false);
    }
    const text = formatAdapt(metrics, frame);
    writeLog(text);
    if (options.debugLabel === false) return;
    label = syncDebugLabel(
      options.canvas,
      label,
      formatAdaptShort(metrics, frame),
      metrics.visibleWidth,
      metrics.visibleHeight,
      frame.insets.left,
      frame.insets.top
    );
  };

  const stopResize = listenResize(refresh);
  refresh();
  timers.push(setTimeout(refresh, 0));
  timers.push(setTimeout(refresh, 50));

  return {
    refresh,
    dispose() {
      if (disposed) return;
      disposed = true;
      stopResize();
      for (const timer of timers) clearTimeout(timer);
      timers.length = 0;
      if (logTimer) {
        clearTimeout(logTimer);
        logTimer = null;
      }
      if (label && label.isValid) label.destroy();
      label = null;
    },
  };
}

export function readEngineMetrics(fallbackSize?: { width: number; height: number } | null) {
  const visible = readSize(view, "getVisibleSize");
  const design = readSize(view, "getDesignResolutionSize");
  const visibleW = visible.width > 0 ? visible.width : fallbackSize?.width ?? 0;
  const visibleH = visible.height > 0 ? visible.height : fallbackSize?.height ?? 0;
  return metricsFrom(visibleW, visibleH, design.width, design.height, readSafeRect(), readPreviewOverride());
}

function readSafeRect(): SafeRect | null {
  try {
    if (!sys || typeof sys.getSafeAreaRect !== "function") return null;
    const rect = sys.getSafeAreaRect();
    if (!rect || typeof rect.width !== "number" || typeof rect.height !== "number") return null;
    if (!(rect.width > 0) || !(rect.height > 0)) return null;
    return {
      x: typeof rect.x === "number" ? rect.x : 0,
      y: typeof rect.y === "number" ? rect.y : 0,
      width: rect.width,
      height: rect.height,
    };
  } catch (_err) {
    return null;
  }
}

function readPreviewOverride() {
  const fromUrl = previewFromLocation();
  if (fromUrl) return fromUrl;
  try {
    const store = (globalThis as { localStorage?: { getItem(key: string): string | null } }).localStorage;
    if (!store || typeof store.getItem !== "function") return null;
    return parseInsetOverride(store.getItem(PREVIEW_KEY));
  } catch (_err) {
    return null;
  }
}

function previewSearch(): string | null {
  try {
    const search = (globalThis as { location?: { search?: string } }).location?.search;
    return search && search.length > 0 ? search : null;
  } catch (_err) {
    return null;
  }
}

function previewStored(key: string): string | null {
  try {
    const store = (globalThis as { localStorage?: { getItem(key: string): string | null } }).localStorage;
    if (!store || typeof store.getItem !== "function") return null;
    return store.getItem(key);
  } catch (_err) {
    return null;
  }
}

function previewFromLocation() {
  try {
    const search = (globalThis as { location?: { search?: string } }).location?.search;
    if (!search || search.length < 2) return null;
    const query = search.charAt(0) === "?" ? search.slice(1) : search;
    const parts = query.split("&");
    for (const part of parts) {
      const eq = part.indexOf("=");
      if (eq <= 0) continue;
      const key = decodeURIComponent(part.slice(0, eq));
      if (key !== "safe") continue;
      return parseInsetOverride(decodeURIComponent(part.slice(eq + 1)));
    }
    return null;
  } catch (_err) {
    return null;
  }
}

function canvasSize(canvas: Node): { width: number; height: number } | null {
  if (!canvas.isValid) return null;
  const ui = canvas.getComponent(UITransform) as { contentSize?: SizeLike } | null;
  const size = ui?.contentSize;
  if (!size || typeof size.width !== "number" || typeof size.height !== "number") return null;
  return { width: size.width, height: size.height };
}

function syncDebugLabel(
  canvas: Node,
  current: Node | null,
  text: string,
  visibleWidth: number,
  visibleHeight: number,
  left: number,
  top: number
): Node | null {
  if (!canvas.isValid) return current;
  if (!wantsSafeDebug(previewSearch(), previewStored("mxzg.safeDebug"))) {
    if (current && current.isValid) current.destroy();
    return null;
  }
  let label = current && current.isValid ? current : null;
  if (!label) {
    label = createLabel(text, 14, {
      color: new Color(170, 205, 175, 220),
      width: DEBUG_W,
      height: DEBUG_H,
      align: "left",
    });
    label.name = "SafeDebug";
    label.parent = canvas;
  } else {
    setText(label, text);
  }
  const x = -visibleWidth / 2 + left + 8 + DEBUG_W / 2;
  const y = visibleHeight / 2 - top - 8 - DEBUG_H / 2;
  label.setPosition(x, y, 0);
  const count = canvas.children ? canvas.children.length : 1;
  label.setSiblingIndex(count > 0 ? count - 1 : 0);
  return label;
}

function listenResize(handler: () => void): () => void {
  const offs = [
    hook(view as ResizeHost, "canvas-resize", handler),
    hook(screen as ResizeHost, "window-resize", handler),
    hook(screen as ResizeHost, "orientation-change", handler),
  ];
  return () => {
    for (const off of offs) off();
  };
}

function hook(host: ResizeHost | null | undefined, type: string, handler: () => void): () => void {
  if (!host || typeof host.on !== "function") return () => {};
  try {
    host.on(type, handler);
  } catch (_err) {
    return () => {};
  }
  return () => {
    if (typeof host.off !== "function") return;
    try {
      host.off(type, handler);
    } catch (_err) {
      // 切场景时 view 可能已经拆掉
    }
  };
}

function readSize(host: unknown, method: string): { width: number; height: number } {
  try {
    const target = host as Record<string, unknown> | null;
    const fn = target && target[method];
    if (typeof fn !== "function") return { width: 0, height: 0 };
    const size = (fn as () => SizeLike).call(target) as SizeLike | null | undefined;
    return {
      width: size && typeof size.width === "number" ? size.width : 0,
      height: size && typeof size.height === "number" ? size.height : 0,
    };
  } catch (_err) {
    return { width: 0, height: 0 };
  }
}
