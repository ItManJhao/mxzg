import { Node } from "cc";
import { GameLog, monoNow } from "../../core/GameLog";

const ENGINE_COMPONENTS = [
  "UITransform",
  "Sprite",
  "Label",
  "Button",
  "Widget",
  "Layout",
  "ScrollView",
  "Mask",
  "Graphics",
  "RichText",
  "ProgressBar",
  "EditBox",
  "BlockInputEvents",
  "Canvas",
  "Camera",
  "PageView",
  "UIOpacity",
];

/**
 * 打开界面耗时。
 * 旧页面起点是 MainApp.presentPage；新 View 由 UIManager 在 whenReady 后记时。
 * 终点（ready）：
 * - 有预制：预制已经 instantiate，并且壳节点挂到页面上（attachPagePrefabShell 在 root.parent 之后；
 *   挂机是 BattlePanelLayer 挂进已经显示的壳）。页面节点会更早 setVisible(true)，那一次不打日志。
 * - 没有预制：UIShell.openPage 里 PageStack 已经 setVisible(true)，页面节点显示出来。
 * 只打一行。关闭、弹窗不走这里。
 */
interface PageWatch {
  id: string;
  token: number;
  started: number;
  expectsPrefab: boolean;
  shown: boolean;
  tag: string;
  content: { view: string; ui: string } | null;
}

let watchSeq = 0;
const watches = new Map<string, PageWatch>();

/** 预制路径的文件名，不带目录和 .prefab。 */
export function prefabBaseName(path: string): string {
  const cut = path.split("/").pop() || path;
  return cut.replace(/\.prefab$/, "");
}

/**
 * 预制根上的业务脚本类名。没有脚本时用节点名（CCBI 类名）。
 * 引擎组件和过短的压缩名跳过。
 */
export function componentClassName(node: Node | null | undefined): string {
  if (!node) return "";
  const list = node.components;
  if (list) {
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      const ctor = row && row.constructor;
      const name = ctor && typeof ctor.name === "string" ? ctor.name : "";
      if (!name || name.length <= 2 || name === "Component") continue;
      if (ENGINE_COMPONENTS.indexOf(name) >= 0) continue;
      return name;
    }
  }
  return node.name || "";
}

/** 开始量打开耗时。同一个页面 id 再打开会换掉上一次还没打完的表。 */
export function beginPageOpen(id: string, expectsPrefab: boolean, tag = "MainApp"): void {
  watchSeq += 1;
  watches.set(id, {
    id,
    token: watchSeq,
    started: monoNow(),
    expectsPrefab,
    shown: false,
    tag,
    content: null,
  });
}

/** 当前这次打开的记号。异步加载结束时对不上就丢掉，避免旧预制给新打开记时。 */
export function pageOpenToken(id: string): number {
  const watch = watches.get(id);
  return watch ? watch.token : 0;
}

/** 页面节点已经 setVisible(true)。没有预制时这就是 ready，立刻打一行。 */
export function markPageShown(id: string): void {
  const watch = watches.get(id);
  if (!watch) return;
  watch.shown = true;
  if (!watch.expectsPrefab && !watch.content) watch.content = { view: id, ui: id };
  if (watch.content) finish(watch);
}

/** 预制内容已经挂上。页面节点还没显示就先记下，等 markPageShown 再打。 */
export function markPageContent(id: string, viewName: string, uiName: string, token = 0): void {
  const watch = watches.get(id);
  if (!watch) return;
  if (token && watch.token !== token) return;
  watch.content = { view: viewName || id, ui: uiName || "(none)" };
  if (watch.shown) finish(watch);
}

/** 预制加载失败。记号对不上时不取消后来的那次打开。 */
export function cancelPageOpen(id: string, token = 0): void {
  const watch = watches.get(id);
  if (!watch) return;
  if (token && watch.token !== token) return;
  watches.delete(id);
}

/** 页面预制挂上之后打打开行。类名取业务脚本，否则节点名，否则预制名，否则页面 id。 */
export function notePrefabReady(pageId: string, view: Node | null, prefabPath: string, fallbackClass: string, token = 0): void {
  const prefab = prefabBaseName(prefabPath);
  const cls = componentClassName(view) || prefab || fallbackClass || pageId;
  markPageContent(pageId, cls, prefab || "(none)", token);
}

/**
 * UIManager 一次打开完成。起点由调用方记在 open / runOpen。
 * 终点是 whenReady 已兑现，也就是 finishOpen。失败和取消不打这行。
 */
export function logViewReady(viewName: string, prefabPath: string, started: number, tag = "UIManager"): void {
  const prefab = prefabBaseName(prefabPath);
  const ms = Math.max(0, Math.round(monoNow() - started));
  GameLog.shared.openView(viewName || prefab || "(none)", prefab || "(none)", { ms, tag });
}

/** 不走页面栈的打开（挂机弹层）。调用方传入从打开到挂上的毫秒。 */
export function logOpenedPrefab(view: Node | null, prefabPath: string, fallbackClass: string, ms = 0, tag = "Mainline"): void {
  const prefab = prefabBaseName(prefabPath);
  const cls = componentClassName(view) || prefab || fallbackClass;
  GameLog.shared.openView(cls, prefab || "(none)", { ms, tag });
}

function finish(watch: PageWatch): void {
  if (watches.get(watch.id) !== watch) return;
  watches.delete(watch.id);
  const ms = Math.max(0, Math.round(monoNow() - watch.started));
  const view = watch.content ? watch.content.view : watch.id;
  const ui = watch.content ? watch.content.ui : watch.id;
  GameLog.shared.openView(view, ui, { ms, tag: watch.tag });
}
