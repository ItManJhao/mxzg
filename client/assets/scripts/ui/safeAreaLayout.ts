/**
 * 安全区计算（不依赖 cc）。
 * 设计分辨率兜底与 project.json 一致：640×1280 竖屏，只 Fit Height。
 * 运行时若 view 已经给出设计分辨率，用引擎的数，不用这里覆盖。
 * Fit Height 的可视设计宽 = 屏宽 × 1280 / 屏高，不读设计宽。
 * iPhone 14 Pro（393×852）仍约 590；9:16 仍约 720，比设计宽多出左右各 40。
 */

export const DESIGN_WIDTH = 640;
export const DESIGN_HEIGHT = 1280;

export interface SafeInsets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** 与 sys.getSafeAreaRect 相同：原点在可见区域左下角。 */
export interface SafeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AdaptMetrics {
  visibleWidth: number;
  visibleHeight: number;
  designWidth: number;
  designHeight: number;
  insets: SafeInsets;
}

export interface SafeFrame {
  /** 相对画面中心，把内容挪到安全区中心。 */
  offsetX: number;
  offsetY: number;
  /** 不超过 1。安全区比设计分辨率小时才缩小，避免和 FIT_WIDTH / FIT_HEIGHT 抢缩放。 */
  scale: number;
  safeWidth: number;
  safeHeight: number;
  insets: SafeInsets;
}

export interface Transformable {
  setPosition(x: number, y: number, z?: number): void;
  setScale(x: number, y: number, z?: number): void;
}

/** `top,right,bottom,left`，设计分辨率像素。空串或负数无效。 */
export function parseInsetOverride(raw: string | null | undefined): SafeInsets | null {
  if (!raw) return null;
  const bits = raw.split(",");
  if (bits.length !== 4) return null;
  const parts = bits.map((part) => part.trim());
  if (parts.some((part) => part.length === 0)) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !isFinite(n) || n < 0)) return null;
  return { top: nums[0], right: nums[1], bottom: nums[2], left: nums[3] };
}

export function clampInsets(visibleWidth: number, visibleHeight: number, insets: SafeInsets): SafeInsets {
  const left = nonNeg(insets.left);
  const right = nonNeg(insets.right);
  const top = nonNeg(insets.top);
  const bottom = nonNeg(insets.bottom);
  const sumX = left + right;
  const sumY = top + bottom;
  const sx = visibleWidth >= 0 && sumX > visibleWidth && sumX > 0 ? visibleWidth / sumX : 1;
  const sy = visibleHeight >= 0 && sumY > visibleHeight && sumY > 0 ? visibleHeight / sumY : 1;
  return { left: left * sx, right: right * sx, top: top * sy, bottom: bottom * sy };
}

export function insetsFromSafeRect(visibleWidth: number, visibleHeight: number, safe: SafeRect): SafeInsets {
  const width = nonNeg(visibleWidth);
  const height = nonNeg(visibleHeight);
  return clampInsets(width, height, {
    left: nonNeg(safe.x),
    bottom: nonNeg(safe.y),
    right: nonNeg(width - safe.x - safe.width),
    top: nonNeg(height - safe.y - safe.height),
  });
}

/**
 * safe 为空或宽高不是正数时，视为整屏都可用。
 * preview 有值时盖过 safe（桌面预览没有刘海时用）。
 */
export function metricsFrom(
  visibleWidth: number,
  visibleHeight: number,
  designWidth: number,
  designHeight: number,
  safe: SafeRect | null,
  preview: SafeInsets | null
): AdaptMetrics {
  const visibleW = positive(visibleWidth, DESIGN_WIDTH);
  const visibleH = positive(visibleHeight, DESIGN_HEIGHT);
  const designW = positive(designWidth, DESIGN_WIDTH);
  const designH = positive(designHeight, DESIGN_HEIGHT);
  const rect =
    safe && positive(safe.width, 0) > 0 && positive(safe.height, 0) > 0
      ? safe
      : { x: 0, y: 0, width: visibleW, height: visibleH };
  let insets = insetsFromSafeRect(visibleW, visibleH, rect);
  if (preview) insets = clampInsets(visibleW, visibleH, preview);
  return {
    visibleWidth: visibleW,
    visibleHeight: visibleH,
    designWidth: designW,
    designHeight: designH,
    insets,
  };
}

export function layoutSafeFrame(metrics: AdaptMetrics): SafeFrame {
  const insets = clampInsets(metrics.visibleWidth, metrics.visibleHeight, metrics.insets);
  const safeWidth = Math.max(0, metrics.visibleWidth - insets.left - insets.right);
  const safeHeight = Math.max(0, metrics.visibleHeight - insets.top - insets.bottom);
  const designW = positive(metrics.designWidth, DESIGN_WIDTH);
  const designH = positive(metrics.designHeight, DESIGN_HEIGHT);
  const scaleW = safeWidth / designW;
  const scaleH = safeHeight / designH;
  let scale = Math.min(1, scaleW, scaleH);
  if (!isFinite(scale) || scale < 0) scale = 0;
  return {
    offsetX: (insets.left - insets.right) / 2,
    offsetY: (insets.bottom - insets.top) / 2,
    scale,
    safeWidth,
    safeHeight,
    insets,
  };
}

export function applySafeFrame(node: Transformable, frame: SafeFrame, scaleContent: boolean): void {
  node.setPosition(frame.offsetX, frame.offsetY, 0);
  if (scaleContent) node.setScale(frame.scale, frame.scale, 1);
  else node.setScale(1, 1, 1);
}

export function formatAdapt(metrics: AdaptMetrics, frame: SafeFrame): string {
  const n = (value: number) => String(Math.round(value));
  return (
    "visible " +
    n(metrics.visibleWidth) +
    "x" +
    n(metrics.visibleHeight) +
    " design " +
    n(metrics.designWidth) +
    "x" +
    n(metrics.designHeight) +
    " L" +
    n(frame.insets.left) +
    " R" +
    n(frame.insets.right) +
    " T" +
    n(frame.insets.top) +
    " B" +
    n(frame.insets.bottom) +
    " scale " +
    frame.scale.toFixed(2)
  );
}

/**
 * 左上角分辨率行默认不画。预览要看时加 ?safeDebug=1，或 localStorage mxzg.safeDebug=1。
 * 控制台 debug 日志不受这一行开关影响。
 */
export function wantsSafeDebug(search: string | null | undefined, stored: string | null | undefined): boolean {
  if (stored === "1") return true;
  if (!search) return false;
  const query = search.charAt(0) === "?" ? search.slice(1) : search;
  const parts = query.split("&");
  for (let i = 0; i < parts.length; i++) {
    const eq = parts[i].indexOf("=");
    const key = eq >= 0 ? parts[i].slice(0, eq) : parts[i];
    const value = eq >= 0 ? parts[i].slice(eq + 1) : "";
    if (key === "safeDebug" && value === "1") return true;
  }
  return false;
}

/** 左上角一行，比控制台短，避免被 Label 裁掉。 */
export function formatAdaptShort(metrics: AdaptMetrics, frame: SafeFrame): string {
  const n = (value: number) => String(Math.round(value));
  return (
    n(metrics.visibleWidth) +
    "x" +
    n(metrics.visibleHeight) +
    " L" +
    n(frame.insets.left) +
    " T" +
    n(frame.insets.top) +
    " R" +
    n(frame.insets.right) +
    " B" +
    n(frame.insets.bottom) +
    " x" +
    frame.scale.toFixed(2)
  );
}

function nonNeg(value: number): number {
  return typeof value === "number" && isFinite(value) && value > 0 ? value : 0;
}

function positive(value: number, fallback: number): number {
  return typeof value === "number" && isFinite(value) && value > 0 ? value : fallback;
}
