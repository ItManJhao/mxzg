/**
 * 英雄和背包的羊皮纸窗口适配，按可见区域缩放已有 Prefab。
 * 由 PrefabLayout 调用；尺寸未就绪时等待引擎帧，节点销毁时停止等待。
 */
import { director, Director, Node, UITransform } from "cc";

import { GameLog } from "../../core/GameLog";

import { listWindowSpread, PARCHMENT_FIT_SIDE } from "./ccbiPlace";

import { assignContentSize, bindVisibleRefresh, positiveUiSize, readVisibleBox } from "./visibleFit";

interface ParchmentFit {
  extraTop: number;
  extraBottom: number;
  extra: number;
}

const NO_PARCHMENT: ParchmentFit = { extraTop: 0, extraBottom: 0, extra: 0 };

/** 按当前窗口适配羊皮纸；尚无尺寸时安排等待，并绑定窗口变化刷新。 */
function fitParchmentWindow(view: Node): ParchmentFit {
  const mark = view as Node & { mxzgParchment?: ParchmentFit; mxzgParchmentBound?: boolean };
  if (!applyParchmentFit(view)) watchParchment(view);
  if (!mark.mxzgParchmentBound) {
    mark.mxzgParchmentBound = true;
    bindVisibleRefresh(view, () => {
      if (!view.isValid) return;
      if (!applyParchmentFit(view)) watchParchment(view);
    });
  }
  return mark.mxzgParchment || NO_PARCHMENT;
}

/** 读取 CommonPanel1（旧资源回退 spr_bg）的纸面尺寸并等比缩小；尺寸未就绪返回 false。 */
function applyParchmentFit(view: Node): boolean {
  const mark = view as Node & { mxzgParchment?: ParchmentFit };
  const bg = (view.getChildByName("CommonPanel1") || view.getChildByName("spr_bg"));
  const ui = view.getComponent(UITransform);
  const bgUi = bg ? bg.getComponent(UITransform) : null;
  const rootSize = positiveUiSize(ui);
  const bgSize = positiveUiSize(bgUi);
  if (!bg || !ui || !bgUi || !rootSize || !bgSize) {
    syncParchmentPlate(view, bg);
    return false;
  }
  const visible = readVisibleBox();
  const spread = listWindowSpread({
    rootW: rootSize.width,
    rootH: rootSize.height,
    anchorY: ui.anchorY,
    bgY: bg.position.y,
    bgAy: bgUi.anchorY,
    bgH: bgSize.height * Math.abs(bg.scale.y || 1),
    visibleW: visible.width,
    side: PARCHMENT_FIT_SIDE,
  });
  if (spread.scale > 1 || spread.extraTop !== 0 || spread.extraBottom !== 0) {
    GameLog.shared.classified("FRAMEWORK", "warn", "UI", "羊皮纸铺窗忽略放大 " + spread.scale);
  }
  const scale = spread.scale > 1 ? 1 : spread.scale;
  view.setScale(scale, scale, 1);
  view.setPosition(-(0.5 - ui.anchorX) * rootSize.width * scale, spread.rootY, 0);
  syncParchmentPlate(view, bg);
  mark.mxzgParchment = { extraTop: 0, extraBottom: 0, extra: 0 };
  return true;
}

/** 仅适配背包与英雄列表的羊皮纸根，其他界面保持原布局。 */
export function seatParchmentList(view: Node): void {
  if (view.name !== "BagView" && view.name !== "HeroListView") return;
  fitParchmentWindow(view);
}

/** 等待羊皮纸和背景尺寸导入；完成、超时或节点销毁后停止帧监听。 */
function watchParchment(view: Node): void {
  const mark = view as Node & { mxzgParchment?: ParchmentFit; mxzgParchmentWait?: boolean };
  if (mark.mxzgParchmentWait || mark.mxzgParchment) return;
  mark.mxzgParchmentWait = true;
  let frames = 0;
  const retry = () => {
    if (!view.isValid) {
      director.off(Director.EVENT_AFTER_UPDATE, retry);
      return;
    }
    frames += 1;
    const ui = view.getComponent(UITransform);
    const bg = (view.getChildByName("CommonPanel1") || view.getChildByName("spr_bg"));
    const bgUi = bg ? bg.getComponent(UITransform) : null;
    const ready = !!positiveUiSize(ui) && !!positiveUiSize(bgUi);
    if (!ready && frames < 45) return;
    director.off(Director.EVENT_AFTER_UPDATE, retry);
    mark.mxzgParchmentWait = false;
    if (!ready || mark.mxzgParchment) return;
    fitParchmentWindow(view);
  };
  director.on(Director.EVENT_AFTER_UPDATE, retry);
  view.once(Node.EventType.NODE_DESTROYED, () => {
    director.off(Director.EVENT_AFTER_UPDATE, retry);
  });
}

/** 同步英雄列表已有纸面垫片；BagView 使用自身 spr_box 纸面，不要求额外的 ParchmentPlate。 */
function syncParchmentPlate(view: Node, bg: Node | null): void {
  if (view.name === "BagView") return;
  if (!view.isValid || !bg || !bg.isValid || bg.parent !== view) return;
  const ui = bg.getComponent(UITransform);
  const size = positiveUiSize(ui);
  const w = size ? size.width : 640;
  const h = size ? size.height : 672;
  const ax = ui && typeof ui.anchorX === "number" ? ui.anchorX : 0.5;
  const ay = ui && typeof ui.anchorY === "number" ? ui.anchorY : 0.5;
  const plate = view.getChildByName("ParchmentPlate");
  if (!plate) {
    GameLog.shared.classified("FRAMEWORK", "warn", "UI", "羊皮纸没有 ParchmentPlate");
    return;
  }
  const plateUi = plate.getComponent(UITransform);
  assignContentSize(plateUi, w, h);
  if (plateUi) plateUi.setAnchorPoint(0.5, 0.5);
  const index = bg.getSiblingIndex();
  plate.setPosition(bg.position.x + (0.5 - ax) * w, bg.position.y + (0.5 - ay) * h, 0);
  if (plate.getSiblingIndex() > index) plate.setSiblingIndex(index);
}
