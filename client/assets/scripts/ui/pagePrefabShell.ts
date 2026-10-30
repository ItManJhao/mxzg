/**
 * 在已经打开的页面上盖一层 1:1 Prefab，方便看新界面。
 * 关闭壳只是藏起来，下面的代码页 / 旧 Prefab / 协议探针还在。
 * 加载失败留原来的页面，不留空画面。
 */
import { Button, Color, director, Director, Graphics, instantiate, Label, Node, Overflow, Prefab, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { labelCenterInParent, sliceAnchorShift } from "./ccbiPlace";
import { CITY_BAR_BOTTOM, CITY_VIEW_H } from "./cityMapLayout";
import { messageOf } from "../core/errors";
import { GameLog, monoNow } from "../core/GameLog";
import { GameStore } from "../core/GameStore";
import { chapterIdleMinute } from "../config/rosterCatalog";
import { hangShownStage } from "../features/battle/model/hangFace";
import { WireSession } from "../net/WireSession";
import { formatWireQuickBattle } from "../net/protocol/wireQuickBattle";
import { bindHangFill, mountIdleHang } from "./idleHangView";
import { beginHangBattle } from "./hangBattle";
import { PAGE_SHELL_FIGHT, pagePrefabShell, USE_PAGE_PREFAB_SHELL } from "./prefabShellMap";
import { CHAPTER_REWARD_PREFAB, dressChapterRewardBoard, mountChapterMap } from "./chapterMapView";
import { bindFormationSheet, dressChapterPreview, dressHangPanel, dressHeroDetail, fillPageShell, hangMissionCaption, pinSprites, seatParchmentList } from "./screenFill";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { UIManager } from "../framework/ui/UIManager";
import { cancelPageOpen, logOpenedPrefab, notePrefabReady, pageOpenToken, prefabBaseName } from "../framework/ui/UIOpenLog";
import { setText } from "./UiKit";
import { assignContentSize, bindVisibleRefresh, fitVisibleRoot, positiveUiSize, uiSize } from "./visibleFit";

/** 挂机底栏「快速战斗」。已有壳。3013 开战硬禁，只读 3012 次数。 */
export const HANG_QUICK_PREFAB = "prefabs/ui/quick-battle/QuickBattleLayer";
/** 挂机底栏「我要变强」。已有壳，标题是英雄变强。不新发协议。 */
export const HANG_GROW_PREFAB = "prefabs/ui/hero/HeroSuggestLayer";
/** 挂机「战斗」先打开的出阵。确认不新发协议。 */
export const HANG_FORMATION_PREFAB = "prefabs/ui/hero/HeroSelectLayer";
/** 挂机关卡标打开的预览。出战仍走原来的挑战，不新发协议。 */
export const HANG_CHAPTER_PREFAB = "prefabs/ui/chapter/ChapterPreviewLayer";
/** 英雄格子点开的详情。 */
export const HERO_INFO_PREFAB = "prefabs/ui/hero/HeroInfoLayer";
const PAGE_SHELL_PREFAB = "prefabs/ui/common/PagePrefabShell";
const LIST_BACKDROP_PREFAB = "prefabs/ui/common/ListBackdrop";
const DIM_SHEET = "prefabs/ui/common/DimSheet";
const HANG_CHIP = "prefabs/ui/battle/HangMissionChip";

export { PAGE_SHELL_FIGHT, USE_PAGE_PREFAB_SHELL };

/** 挂机左侧空地长按，打开真服探针。不画在底栏上。 */
export const HANG_PROBE_EVENT = "mxzg-wire-probe";
const HANG_PROBE_MS = 720;
/** 壳底图还没挂上时垫一层近黑，避免透出只读标题。贴图到了就盖住它。 */
const LIST_BACKDROP_DIM = new Color(22, 16, 20, 255);

interface ShellHold {
  want: boolean;
  root: Node | null;
  /** 壳还在加载。第二次进来不再盖一层。 */
  pending?: boolean;
  /** 真服只读页的节点。壳盖住之前先藏，避免切换时闪出标题。 */
  veiled?: Node[];
}

const holds = new Map<Node, ShellHold>();

export function setPagePrefabShellVisible(page: Node, visible: boolean): void {
  let hold = holds.get(page);
  if (!hold) {
    hold = { want: visible, root: null };
    holds.set(page, hold);
  } else {
    hold.want = visible;
  }
  if (hold.root && hold.root.isValid) hold.root.active = visible;
  if (page.isValid) {
    const dim = findShellBackdrop(page, "ShellBackdropDim");
    const art = findShellBackdrop(page, "ShellBackdrop");
    if (dim) dim.active = visible;
    if (art) art.active = visible;
  }
  const veiled = hold.veiled || [];
  for (let i = 0; i < veiled.length; i++) {
    const node = veiled[i];
    if (node.isValid) node.active = !visible;
  }
}

/** 盖上对照表里的 Prefab。没有对照就什么都不做。 */
export async function attachPagePrefabShell(page: Node, id: string): Promise<void> {
  if (!USE_PAGE_PREFAB_SHELL) return;
  const spec = pagePrefabShell(id);
  if (!spec) return;
  const token = pageOpenToken(id);
  if (!page.isValid) {
    cancelPageOpen(id, token);
    return;
  }
  let hold = holds.get(page);
  if (hold && (hold.root || hold.pending)) {
    if (hold.root) notePrefabReady(id, hold.root.getChildByName(prefabBaseName(spec.path)), spec.path, id, token);
    return;
  }
  if (!hold) {
    hold = { want: true, root: null };
    holds.set(page, hold);
  }
  hold.pending = true;
  const backdrop = shellBackdrop(id);
  if (backdrop) veilUnderShell(page, hold);
  page.once(Node.EventType.NODE_DESTROYED, () => {
    holds.delete(page);
  });
  let noted = false;
  try {
    if (backdrop) await mountListBackdrop(page, backdrop);
    const prefab = await loadPrefab(spec.path);
    const shellPrefab = await loadPrefab(PAGE_SHELL_PREFAB);
    if (!page.isValid) return;
    if (hold.root) return;
    const root = instantiate(shellPrefab);
    root.name = "PagePrefabShell";
    if (spec.fight) mountIdleHang(root);
    else if (!backdrop) {
      const dim = root.getChildByName("dim");
      if (dim) {
        dim.active = true;
        // 9:16 的可视宽仍约 720。垫图按这个盖，不收成设计宽 640，否则左右露底。
        paintShellDim(dim, 720, 1280);
      } else GameLog.shared.warn("MainApp", "PagePrefabShell 下没有 dim");
    }
    const view = spawnPrefab(prefab, root);
    mountCcbiView(view);
    fillPageShell(id, view, (hero) => {
      void openHangSheet(root, HERO_INFO_PREFAB, (sheet) => dressHeroDetail(sheet, hero));
    });
    if (spec.fight) dressHangPanel(view);
    const close = findDescendant(view, "btn_close");
    if (close) {
      liftNode(close, view);
      bindTap(close, () => setPagePrefabShellVisible(page, false));
    }
    const raise = () => pinShell(root, page);
    page.on(Node.EventType.CHILD_ADDED, raise);
    root.parent = page;
    root.active = hold.want;
    hold.root = root;
    hold.pending = false;
    notePrefabReady(id, view, spec.path, id, token);
    noted = true;
    raise();
    if (spec.fight) {
      bindHangFill(root);
      bindFightChrome(view, root, page);
    } else if (backdrop) {
      seatListShell(root);
    }
    GameLog.shared.info("MainApp", "page prefab shell " + id + " " + spec.path);
  } catch (err) {
    hold.pending = false;
    restoreVeil(page, hold);
    GameLog.shared.error("MainApp", "page prefab shell " + id + " " + messageOf(err) + "，仍用原来的页面");
    if (!noted && page.isValid) cancelPageOpen(id, token);
  }
}

/** 英雄列表用角色岩洞，背包用店内。正式服羊皮纸是浮在这张全屏底上的。 */
function shellBackdrop(id: string): string[] | null {
  if (id === "hero") return ["ui/maps/map-bg-role-1"];
  if (id === "bag") return ["ui/bag/map-bg-backpack-1", "ui/maps/map-bg-backpack-1"];
  return null;
}

/** 先藏只读页。底图预制随后再铺，壳加载期间不再闪「真服只读」。 */
function veilUnderShell(page: Node, hold: ShellHold): void {
  const veiled: Node[] = [];
  const kids = page.children.slice();
  for (let i = 0; i < kids.length; i++) {
    if (!kids[i].active) continue;
    kids[i].active = false;
    veiled.push(kids[i]);
  }
  hold.veiled = veiled;
}

async function mountListBackdrop(page: Node, paths: string[]): Promise<void> {
  if (!page.isValid || page.getChildByName("ListBackdrop")) return;
  let prefab: Prefab;
  try {
    prefab = await loadPrefab(LIST_BACKDROP_PREFAB);
  } catch (err) {
    GameLog.shared.warn("MainApp", "ListBackdrop 没有挂上 " + messageOf(err));
    return;
  }
  if (!page.isValid || page.getChildByName("ListBackdrop")) return;
  const pack = spawnPrefab(prefab, page);
  pack.name = "ListBackdrop";
  const dim = pack.getChildByName("ShellBackdropDim");
  const art = pack.getChildByName("ShellBackdrop");
  // 第一帧按 9:16 可视宽铺。列表壳随后拉到真实可见尺寸。
  if (dim) paintListDim(dim, 720, 1280);
  else GameLog.shared.warn("MainApp", "ListBackdrop 下没有 ShellBackdropDim");
  if (!art) {
    GameLog.shared.warn("MainApp", "ListBackdrop 下没有 ShellBackdrop");
    return;
  }
  const sprite = art.getComponent(Sprite);
  if (sprite) {
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.type = Sprite.Type.SIMPLE;
  }
  const loadAt = (index: number) => {
    if (!art.isValid || index >= paths.length) return;
    resources.load(paths[index] + "/spriteFrame", SpriteFrame, (err, frame) => {
      if (!art.isValid) return;
      if (err || !frame) {
        loadAt(index + 1);
        return;
      }
      if (sprite) sprite.spriteFrame = frame;
    });
  };
  loadAt(0);
}

function restoreVeil(page: Node, hold: ShellHold): void {
  dropBackdrop(page);
  dropBackdrop(hold.root);
  const veiled = hold.veiled || [];
  for (let i = 0; i < veiled.length; i++) {
    if (veiled[i].isValid) veiled[i].active = true;
  }
  hold.veiled = [];
}

/** 挂机底钮预制已经在壳上时，补上这一次打开的耗时。还没挂上就等正在进行的加载。 */
function noteHangPanelReady(root: Node, token: number): void {
  const spec = pagePrefabShell("mainline");
  const path = spec ? spec.path : "prefabs/ui/battle/BattlePanelLayer";
  const panel = root.getChildByName(prefabBaseName(path));
  if (!panel) return;
  notePrefabReady("mainline", panel, path, "mainline", token);
}

/**
 * 底栏「战斗」自己的挂机壳。大理石站场、英雄和演武在等 Prefab 之前就铺上。
 * 底钮仍是 BattlePanelLayer（战力UP / 战斗 / 高速战斗）和收益条。
 * 顶栏战力、头像仍是主城壳上的 hangHud，不在这一页再画一条。
 * 没有「功能页」。探针只留给 ?dev=wire，或左侧空地长按。
 * Prefab 失败时站场还在。不补代码按钮。中间「战斗」仍发 PAGE_SHELL_FIGHT。
 */
export async function mountHangBattleShell(page: Node): Promise<void> {
  const token = pageOpenToken("mainline");
  if (!page.isValid) {
    cancelPageOpen("mainline", token);
    return;
  }
  let hold = holds.get(page);
  if (hold && hold.root) {
    noteHangPanelReady(hold.root, token);
    return;
  }
  if (!hold) {
    hold = { want: true, root: null };
    holds.set(page, hold);
  }
  let shellPrefab: Prefab;
  try {
    shellPrefab = await loadPrefab(PAGE_SHELL_PREFAB);
  } catch (err) {
    GameLog.shared.warn("MainApp", "PagePrefabShell 没有挂上 " + messageOf(err));
    if (page.isValid) cancelPageOpen("mainline", token);
    return;
  }
  if (!page.isValid) return;
  if (hold.root) {
    noteHangPanelReady(hold.root, token);
    return;
  }
  const root = instantiate(shellPrefab);
  root.name = "PagePrefabShell";
  mountIdleHang(root);
  bindHangProbe(root, page);
  root.on(Node.EventType.CHILD_ADDED, () => raiseHangProbe(root));
  const raise = () => pinShell(root, page);
  page.on(Node.EventType.CHILD_ADDED, raise);
  root.parent = page;
  root.active = hold.want;
  hold.root = root;
  raise();
  bindHangFill(root);
  page.once(Node.EventType.NODE_DESTROYED, () => {
    holds.delete(page);
  });
  const spec = pagePrefabShell("mainline");
  const path = spec ? spec.path : "prefabs/ui/battle/BattlePanelLayer";
  let view: Node | null = null;
  try {
    const prefab = await loadPrefab(path);
    if (!page.isValid || !root.isValid) {
      if (page.isValid) cancelPageOpen("mainline", token);
      return;
    }
    view = spawnHangPanel(prefab, root);
    notePrefabReady("mainline", view, path, "mainline", token);
    const panel = view;
    hangShellStep("mountCcbiView", () => mountCcbiView(panel));
    hangShellStep("dressHangPanel", () => dressHangPanel(panel));
    hangShellStep("bindFightChrome", () => bindFightChrome(panel, root, page));
    hangShellStep("dropFlatHangButtons", () => dropFlatHangButtons(root));
    hangShellStep("mountHangMissionChip", () => mountHangMissionChip(root, page));
    hangShellStep("raiseHangProbe", () => raiseHangProbe(root));
    GameLog.shared.info("MainApp", "hang battle shell " + path);
  } catch (err) {
    if ((!view || !view.isValid) && page.isValid) cancelPageOpen("mainline", token);
    if (isWidthRead(err) && root.isValid) {
      noteHangShellWidth(view && view.isValid ? "afterPanel" : "spawnPanel");
      if (!view || !view.isValid) {
        GameLog.shared.warn("MainApp", "不补代码按钮");
        mountHangMissionChip(root, page);
        raiseHangProbe(root);
      }
      return;
    }
    GameLog.shared.error("MainApp", "hang battle shell " + messageOf(err) + "，站场仍在");
    if (!root.isValid) return;
    if (view && view.isValid) {
      GameLog.shared.error("MainApp", "挂机面板已经在，不补扁平调试钮");
      dropFlatHangButtons(root);
      try {
        bindFightChrome(view, root, page);
      } catch (wireErr) {
        GameLog.shared.error("MainApp", "hang fight chrome " + messageOf(wireErr));
      }
      mountHangMissionChip(root, page);
      raiseHangProbe(root);
      return;
    }
    GameLog.shared.warn("MainApp", "不补代码按钮");
    mountHangMissionChip(root, page);
    raiseHangProbe(root);
  }
}

/**
 * 先收成自定义尺寸再进激活树。
 * 预览里 RAW 图在 originalSize 还是空的时候，一启用就会让引擎读 width。
 */
function spawnHangPanel(prefab: Prefab, parent: Node): Node {
  const view = instantiate(prefab);
  pinSprites(view);
  try {
    view.active = false;
  } catch (err) {
    if (!isWidthRead(err)) throw err;
    noteHangShellWidth("hidePanel");
  }
  view.parent = parent;
  try {
    view.active = true;
  } catch (err) {
    if (!isWidthRead(err)) throw err;
    noteHangShellWidth("showPanel");
  }
  return view;
}

const hangWidthSteps = new Set<string>();

function noteHangShellWidth(step: string): void {
  if (hangWidthSteps.has(step)) return;
  hangWidthSteps.add(step);
  GameLog.shared.warn("MainApp", "hang shell width " + step);
}

function isWidthRead(err: unknown): boolean {
  const message = messageOf(err);
  return message.indexOf("reading 'width'") >= 0 || message.indexOf('reading "width"') >= 0;
}

function hangShellStep(step: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    if (!isWidthRead(err)) throw err;
    noteHangShellWidth(step);
  }
}

/** 面板已经在时，清掉代码补的扁平蓝钮。Prefab 钮没有叫 bg 的色块。 */
function dropFlatHangButtons(root: Node): void {
  const names = ["btn_lineup", "btn_battle", "btn_speed_battle"];
  const kids = root.children.slice();
  for (let i = 0; i < kids.length; i++) {
    const node = kids[i];
    if (names.indexOf(node.name) < 0) continue;
    if (!node.getChildByName("bg")) continue;
    node.destroy();
  }
}

function pinShell(root: Node, page: Node): void {
  if (!root.isValid || root.parent !== page) return;
  const kids = page.children;
  let overlay = -1;
  for (let i = 0; i < kids.length; i++) {
    if (kids[i] !== root && kids[i].name === "BattleEndHold") {
      overlay = i;
      break;
    }
  }
  if (overlay < 0) {
    root.setSiblingIndex(Math.max(0, kids.length - 1));
    return;
  }
  if (kids.indexOf(root) > overlay) root.setSiblingIndex(overlay);
}

/** 左侧空地。不挡中间「战斗」和底栏三钮。按住约 0.7 秒才打开探针。 */
export function bindHangProbe(root: Node, page: Node): void {
  const spot = root.getChildByName("HangProbeHotspot");
  if (!spot) {
    GameLog.shared.warn("Mainline", "PagePrefabShell 下没有 HangProbeHotspot");
    return;
  }
  spot.active = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  };
  spot.on(Node.EventType.TOUCH_START, () => {
    const battle = root.getChildByName("HangBattle");
    if (battle && battle.active) return;
    clear();
    timer = setTimeout(() => {
      timer = null;
      if (!page.isValid || !root.isValid || !root.active) return;
      page.emit(HANG_PROBE_EVENT);
    }, HANG_PROBE_MS);
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  });
  spot.on(Node.EventType.TOUCH_END, clear);
  spot.on(Node.EventType.TOUCH_CANCEL, clear);
}

function raiseHangProbe(root: Node): void {
  const chip = root.getChildByName("HangMissionChip");
  if (chip && chip.isValid) chip.setSiblingIndex(Math.max(0, root.children.length - 1));
  const spot = root.getChildByName("HangProbeHotspot");
  if (!spot || !spot.isValid) return;
  spot.setSiblingIndex(Math.max(0, root.children.length - 1));
}

/**
 * 把 ccbi 根放进父节点中心，并修正九宫格底左角和按钮上的字。
 * 设计分辨率是 640×1280。壳预制仍可能是 720 宽，进场景后按可见尺寸铺。
 * 根锚点是 (0,0)。不要用 Widget 的水平/垂直居中，那会把底左角钉在画面中心。
 * 底板已经铺在 0..宽 里的壳，Prefab 根位置写成同一个偏移，编辑器里打开就在设计框中间。
 * 底板中心本来就在根锚点上的壳不要写这个偏移。
 */
export function mountCcbiView(node: Node): void {
  repairCcbiView(node);
  centerInParent(node);
  seatAboveChrome(node);
  seatParchmentList(node);
  watchCcbiSize(node);
}

/**
 * 第一帧 contentSize 还是 null 或 0。先按 Prefab 落点摆，尺寸活了再归一次中。
 * 不在这里重跑 fillPageShell，格子和监听只挂一次。
 */
function watchCcbiSize(node: Node): void {
  const mark = node as Node & { mxzgCcbiWait?: boolean };
  if (mark.mxzgCcbiWait) return;
  if (positiveUiSize(node.getComponent(UITransform))) return;
  mark.mxzgCcbiWait = true;
  let frames = 0;
  const retry = () => {
    if (!node.isValid) {
      director.off(Director.EVENT_AFTER_UPDATE, retry);
      return;
    }
    frames += 1;
    const live = positiveUiSize(node.getComponent(UITransform));
    if (!live && frames < 45) return;
    director.off(Director.EVENT_AFTER_UPDATE, retry);
    mark.mxzgCcbiWait = false;
    if (!live) return;
    repairCcbiView(node);
    centerInParent(node);
    seatAboveChrome(node);
    seatParchmentList(node);
  };
  director.on(Director.EVENT_AFTER_UPDATE, retry);
  node.once(Node.EventType.NODE_DESTROYED, () => {
    director.off(Director.EVENT_AFTER_UPDATE, retry);
  });
}

/**
 * 岩洞 / 店内底先铺在页面上，挡住只读标题。
 * 壳会抵消安全区缩放，底图如果留在页面上就会比羊皮纸小一圈，宽屏两侧露出黑底。
 * 收进壳里以后，跟羊皮纸用同一套可见尺寸。
 */
function seatListShell(root: Node): void {
  adoptListBackdrop(root);
  bindVisibleRefresh(root, () => {
    const box = fitVisibleRoot(root);
    stretchListBackdrop(root, box.width, box.height);
  });
}

function findShellBackdrop(page: Node, name: string): Node | null {
  const onPage = backdropChild(page, name);
  if (onPage) return onPage;
  const hold = holds.get(page);
  const root = hold && hold.root && hold.root.isValid ? hold.root : null;
  return backdropChild(root, name);
}

function backdropChild(host: Node | null, name: string): Node | null {
  if (!host || !host.isValid) return null;
  const direct = host.getChildByName(name);
  if (direct) return direct;
  const pack = host.getChildByName("ListBackdrop");
  return pack ? pack.getChildByName(name) : null;
}

function dropBackdrop(host: Node | null): void {
  if (!host || !host.isValid) return;
  const pack = host.getChildByName("ListBackdrop");
  if (pack) pack.destroy();
  const dim = host.getChildByName("ShellBackdropDim");
  const art = host.getChildByName("ShellBackdrop");
  if (dim && dim.isValid) dim.destroy();
  if (art && art.isValid) art.destroy();
}

function adoptListBackdrop(root: Node): void {
  const page = root.parent;
  if (!page) return;
  const pack = page.getChildByName("ListBackdrop");
  if (pack) {
    pack.parent = root;
    pack.setSiblingIndex(0);
    return;
  }
  const names = ["ShellBackdropDim", "ShellBackdrop"];
  for (let i = 0; i < names.length; i++) {
    const node = page.getChildByName(names[i]);
    if (!node) continue;
    node.parent = root;
    node.setSiblingIndex(i);
  }
}

/** 底图铺满壳的可见框。羊皮纸保持 640，窄于可视宽时再缩小，左右露出岩壁或店景。 */
function stretchListBackdrop(root: Node, width: number, height: number): void {
  if (!(width > 1) || !(height > 1)) return;
  const pack = root.getChildByName("ListBackdrop");
  if (pack) {
    const packUi = pack.getComponent(UITransform);
    assignContentSize(packUi, width, height);
    if (packUi) packUi.setAnchorPoint(0.5, 0.5);
    pack.setPosition(0, 0, 0);
  }
  const names = ["ShellBackdropDim", "ShellBackdrop"];
  for (let i = 0; i < names.length; i++) {
    const node = backdropChild(root, names[i]);
    if (!node || !node.isValid) continue;
    const ui = node.getComponent(UITransform);
    assignContentSize(ui, width, height);
    if (ui) ui.setAnchorPoint(0.5, 0.5);
    node.setPosition(0, 0, 0);
    const sprite = node.getComponent(Sprite);
    if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    if (node.name === "ShellBackdropDim") paintListDim(node, width, height);
  }
}

function paintListDim(node: Node, width: number, height: number): void {
  paintFill(node, width, height, LIST_BACKDROP_DIM);
}

const SHELL_DIM = new Color(8, 16, 32, 255);

function paintShellDim(node: Node, width: number, height: number): void {
  paintFill(node, width, height, SHELL_DIM);
}

function paintFill(node: Node, width: number, height: number, ink: Color): void {
  const g = node.getComponent(Graphics);
  if (!g || typeof g.clear !== "function" || typeof g.rect !== "function" || typeof g.fill !== "function") return;
  g.clear();
  g.fillColor = ink;
  g.rect(-width / 2, -height / 2, width, height);
  g.fill();
}

/** 九宫格按底左角归位，小按钮上的字回到盒子中心并缩进按钮。 */
export function repairCcbiView(root: Node): void {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    repairSlice(node);
    repairLabel(node);
  }
}

function repairSlice(node: Node): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite || sprite.type !== Sprite.Type.SLICED) return;
  const ui = node.getComponent(UITransform);
  const self = positiveUiSize(ui);
  if (!ui || !self) return;
  const host = sizedAncestor(node);
  if (!host) return;
  const hostSize = positiveUiSize(host.ui);
  if (!hostSize) return;
  const pos = anchorIn(node, host.node);
  const shift = sliceAnchorShift(
    {
      x: pos.x,
      y: pos.y,
      ax: ui.anchorX,
      ay: ui.anchorY,
      w: self.width,
      h: self.height,
      sx: node.scale.x,
      sy: node.scale.y,
    },
    {
      ax: host.ui.anchorX,
      ay: host.ui.anchorY,
      w: hostSize.width,
      h: hostSize.height,
    }
  );
  if (!shift) return;
  node.setPosition(node.position.x + shift.x, node.position.y + shift.y, node.position.z);
}

function repairLabel(node: Node): void {
  const label = node.getComponent(Label);
  const parent = node.parent;
  if (!label || !parent) return;
  const parentUi = parent.getComponent(UITransform);
  const parentSize = positiveUiSize(parentUi);
  if (!parentUi || !parentSize) return;
  const width = parentSize.width;
  const height = parentSize.height;
  const center = labelCenterInParent(parentUi.anchorX, parentUi.anchorY, width, height, node.position.x, node.position.y);
  if (center) node.setPosition(center.x, center.y, node.position.z);
  if (Math.abs(node.scale.x - 1) > 0.05 || Math.abs(node.scale.y - 1) > 0.05) return;
  if (width < 8 || height < 8 || width > 400) return;
  const text = label.string || "";
  const wide = label.fontSize * Math.max(1, text.length) * 0.55 > width;
  const tall = label.fontSize > height * 0.85;
  if (!wide && !tall) return;
  const ui = node.getComponent(UITransform);
  assignContentSize(ui, Math.max(8, width - 8), Math.max(8, height - 4));
  try {
    label.overflow = Overflow.SHRINK;
  } catch (_err) {
    /* 字还没尺寸时装配会读 width。下一帧尺寸活了再修。 */
  }
}

function sizedAncestor(node: Node): { node: Node; ui: UITransform } | null {
  let cur = node.parent;
  while (cur) {
    const ui = cur.getComponent(UITransform);
    if (ui && positiveUiSize(ui)) return { node: cur, ui };
    cur = cur.parent;
  }
  return null;
}

function anchorIn(node: Node, ancestor: Node): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let cur: Node | null = node;
  while (cur && cur !== ancestor) {
    x += cur.position.x;
    y += cur.position.y;
    cur = cur.parent;
  }
  return { x, y };
}

export function centerInParent(node: Node): void {
  const ui = node.getComponent(UITransform);
  if (!ui) {
    node.setPosition(0, 0, 0);
    return;
  }
  const size = positiveUiSize(ui);
  if (!size) {
    // 0×0 再套居中公式会写成 (0,0)，底左角锚点的列表就整页偏出画面。
    // 已经写过偏移的 Prefab（背包、挂机、登录）留在原位。只有还在原点的才先按 640×960 放进中间。
    const ax = typeof ui.anchorX === "number" ? ui.anchorX : 0.5;
    const ay = typeof ui.anchorY === "number" ? ui.anchorY : 0.5;
    const nearOrigin = Math.abs(node.position.x) < 1 && Math.abs(node.position.y) < 1;
    if (nearOrigin && Math.abs(ax) < 0.01 && Math.abs(ay) < 0.01) node.setPosition(-320, -480, 0);
    return;
  }
  node.setPosition(-(0.5 - ui.anchorX) * size.width, -(0.5 - ui.anchorY) * size.height, 0);
}

/** 底边落到 640×1280 底栏下面时，整页上移。短弹窗本来就在安全区里则不动。 */
export function seatAboveChrome(node: Node): void {
  const ui = node.getComponent(UITransform);
  const size = positiveUiSize(ui);
  if (!ui || !size) return;
  const height = size.height;
  const anchorY = typeof ui.anchorY === "number" ? ui.anchorY : 0.5;
  const bottom = node.position.y - height * anchorY;
  const limit = -CITY_VIEW_H / 2 + CITY_BAR_BOTTOM;
  if (bottom >= limit) return;
  node.setPosition(node.position.x, node.position.y + (limit - bottom), node.position.z || 0);
}

/**
 * 挂机壳上的「战斗」要在页进入场景后再绑一次。
 * 第一次挂上时世界矩阵还是空的，按钮会抬偏，全屏 menu 把点击吃掉。
 * 切走再回来是新的一页，矩阵已经稳了，所以第二次才点得中。
 */
function bindFightChrome(view: Node, root: Node, page: Node): void {
  let follow = false;
  let tries = 0;
  const settle = () => {
    director.off(Director.EVENT_AFTER_UPDATE, settle);
    if (!view.isValid || !root.isValid || !page.isValid) return;
    const live = root as Node & { activeInHierarchy?: boolean };
    const seated = !!root.parent && live.activeInHierarchy !== false;
    wireFightButtons(view, root, page, seated && follow);
    if (!seated) {
      tries += 1;
      if (tries < 90) director.on(Director.EVENT_AFTER_UPDATE, settle);
      return;
    }
    if (!follow) {
      follow = true;
      director.on(Director.EVENT_AFTER_UPDATE, settle);
    }
  };
  settle();
  page.once(Node.EventType.NODE_DESTROYED, () => {
    director.off(Director.EVENT_AFTER_UPDATE, settle);
  });
}

/** 左上角关卡标。点开章节地图，再进已有 ChapterPreviewLayer。不把整窗铺在地上。 */
function mountHangMissionChip(root: Node, page: Node): void {
  if (!root.isValid || root.getChildByName("HangMissionChip")) return;
  void loadPrefab(HANG_CHIP).then(
    (prefab) => {
      if (!root.isValid || root.getChildByName("HangMissionChip")) return;
      const chip = spawnPrefab(prefab, root);
      chip.name = "HangMissionChip";
      chip.setPosition(-240, 220, 0);
      const icon = chip.getChildByName("icon");
      if (icon) paintChipIcon(icon);
      const label = chip.getChildByName("HangMissionLabel");
      if (!label) GameLog.shared.warn("Mainline", "HangMissionChip 下没有 HangMissionLabel");
      if (!chip.getComponent(Button)) chip.addComponent(Button);
      chip.on(Button.EventType.CLICK, () => {
        openChapterMap(root, page);
      });
      const refresh = () => {
        if (!label || !label.isValid) return;
        setText(label, hangMissionCaption());
      };
      refresh();
      const off = WireSession.onSync(refresh);
      chip.once(Node.EventType.NODE_DESTROYED, () => off());
    },
    (err) => {
      GameLog.shared.warn("Mainline", "HangMissionChip 没有挂上 " + messageOf(err));
    }
  );
}

/** 章节地图盖在挂机上。关卡条再打开 ChapterPreviewLayer。奖励窗是 ChapterRewardLayer，不发 3011。 */
function openChapterMap(root: Node, page: Node): void {
  if (!root.isValid) return;
  const old = root.getChildByName("ChapterMapSheet");
  if (old) old.destroy();
  void loadPrefab(DIM_SHEET).then(
    (prefab) => {
      if (!root.isValid) return;
      const again = root.getChildByName("ChapterMapSheet");
      if (again) again.destroy();
      const sheet = spawnPrefab(prefab, root);
      sheet.name = "ChapterMapSheet";
      const dim = sheet.getChildByName("dim");
      if (!dim) GameLog.shared.warn("Mainline", "ChapterMapSheet 下没有 dim");
      const close = () => {
        if (sheet.isValid) sheet.destroy();
      };
      const openPreview = (idx: number) => {
        void openHangSheet(sheet, HANG_CHAPTER_PREFAB, (view) => {
          dressChapterPreview(view, () => {
            close();
            startShellFight(root, page, "章节出战");
          }, idx);
        });
      };
      mountChapterMap(sheet, {
        onStage: openPreview,
        onReward: () => {
          void openHangSheet(sheet, CHAPTER_REWARD_PREFAB, (view) => {
            dressChapterRewardBoard(view, (gate) => openPreview(gate));
          });
        },
        onClose: close,
      });
      sheet.setSiblingIndex(Math.max(0, root.children.length - 1));
    },
    (err) => {
      GameLog.shared.warn("Mainline", "DimSheet 没有挂上，不新建 ChapterMapSheet " + messageOf(err));
    }
  );
}

function paintChipIcon(node: Node): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite) return;
  const path = "ui/city/main-city_icon-main_mission";
  try {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (!node.isValid) return;
      if (err || !asset) {
        GameLog.shared.warn("Mainline", "关卡标 " + path + " 没有挂上，字仍在");
        return;
      }
      sprite.spriteFrame = asset;
    });
  } catch (err) {
    GameLog.shared.warn("Mainline", "关卡标 ui/city/main-city_icon-main_mission 没有挂上，字仍在");
  }
}

/**
 * 日服每次开战都先弹出 HeroSelectLayer（前 4 后 4）。确认后再 beginHangBattle。
 * 战斗钮、底栏、章节出战、结算下一关都走这里。不因已经有阵容跳过。
 * 壳已经不在时返回 false。出阵预制失败只打跳过原因，不开战。
 */
export function startShellFight(root: Node, page: Node, entry = "战斗按钮"): boolean {
  if (!root.isValid || !page.isValid) {
    GameLog.shared.warn("Mainline", "进入 startShellFight 时挂机壳已关");
    GameLog.shared.info("Mainline", "开战入口=" + entry + " 出阵=跳过原因=挂机壳已关");
    return false;
  }
  GameLog.shared.info("Mainline", "进入 startShellFight");
  const go = () => {
    beginHangBattle(page, "我方", "敌方");
    if (!page.isValid) return;
    GameLog.shared.info("Mainline", "开战发出 PAGE_SHELL_FIGHT");
    page.emit(PAGE_SHELL_FIGHT);
  };
  const host = page.isValid ? page : root;
  void openHangSheet(
    host,
    HANG_FORMATION_PREFAB,
    (sheet) => {
      GameLog.shared.info("Mainline", "开战入口=" + entry + " 出阵=开");
      GameLog.shared.info("Mainline", "开战先出阵");
      bindFormationSheet(sheet, () => {
        const wrap = sheet.parent;
        if (wrap && wrap.isValid) wrap.destroy();
        go();
      });
    },
    true
  ).catch((err) => {
    GameLog.shared.info("Mainline", "开战入口=" + entry + " 出阵=跳过原因=出阵预制没有挂上");
    GameLog.shared.warn("Mainline", "开战没有开始 " + messageOf(err));
    toastFightFail();
  });
  return true;
}

function toastFightFail(): void {
  try {
    UIManager.instance.toast("开战没有开始");
  } catch (err) {
    GameLog.shared.warn("Mainline", "开战提示没有弹出 " + messageOf(err));
  }
}

/** 中间「战斗」和两侧底栏抬到壳根上。全屏 menu 不再当命中框。 */
function wireFightButtons(view: Node, root: Node, page: Node, again: boolean): void {
  const battle = findDescendant(root, "btn_battle");
  if (battle) {
    liftNode(battle, root);
    bindTapOnce(battle, () => startShellFight(root, page, "底栏战斗"));
    pokeButton(battle, again);
  }
  bindHangSheets(view, root, again);
  silenceHangMenu(view);
  raiseHangProbe(root);
}

/** menu 是 640×960 的空命中框，盖住中间「战斗」。收成 0 后点击落到按钮上。 */
function silenceHangMenu(view: Node): void {
  const menu = findDescendant(view, "menu");
  if (!menu) return;
  const ui = menu.getComponent(UITransform);
  const size = uiSize(ui);
  if (!size || (size.width <= 400 && size.height <= 400)) return;
  assignContentSize(ui, 0, 0);
}

/**
 * 底栏两侧。快速战斗打开已有 QuickBattleLayer，并读 3012。不发 3013。
 * 我要变强打开已有 HeroSuggestLayer（英雄变强）。关掉回到挂机。
 */
function bindHangSheets(view: Node, host: Node, again: boolean): void {
  const quick = findDescendant(host, "btn_speed_battle") || findDescendant(view, "btn_speed_battle");
  if (quick) {
    liftNode(quick, host);
    bindTapOnce(quick, () => {
      void openHangSheet(host, HANG_QUICK_PREFAB, (sheet) => bindQuickSheet(sheet));
    });
    pokeButton(quick, again);
  }
  const grow = findDescendant(host, "btn_lineup") || findDescendant(view, "btn_lineup");
  if (grow) {
    liftNode(grow, host);
    bindTapOnce(grow, () => {
      void openHangSheet(host, HANG_GROW_PREFAB, (sheet) => bindGrowSheet(sheet));
    });
    pokeButton(grow, again);
  }
}

function bindQuickSheet(sheet: Node): void {
  const write = () => {
    const line = formatWireQuickBattle(WireSession.quickBattle);
    const tip = findDescendant(sheet, "lbl_tip_2");
    if (tip && tip.isValid) setText(tip, line + " · 不发 3013");
    return line;
  };
  write();
  if (!WireSession.hasQuickBattle()) WireSession.pullQuickBattleCount();
  let off = () => {};
  off = WireSession.onSync(() => {
    if (!sheet.isValid) {
      off();
      return;
    }
    write();
  });
  sheet.once(Node.EventType.NODE_DESTROYED, () => off());
  const preview = quickPreviewLine();
  const tip = findDescendant(sheet, "lbl_tip_1");
  if (tip) setText(tip, preview);
  const go = findDescendant(sheet, "btn_quick");
  if (go) {
    liftNode(go, sheet);
    bindTap(go, () => {
      const line = write();
      if (tip && tip.isValid) setText(tip, preview + " · 未发 3013");
      GameLog.shared.info("Mainline", "快速战斗只读 " + line + "，不发 3013。" + preview);
    });
  }
  const info = findDescendant(sheet, "btn_info");
  if (info) {
    bindTap(info, () => {
      if (tip && tip.isValid) setText(tip, "高速战斗按两小时挂机收益预览，不发 3013");
    });
  }
  const jump = findDescendant(sheet, "btn_jump");
  if (jump) {
    bindTap(jump, () => {
      if (tip && tip.isValid) setText(tip, "这一页不跳转");
    });
  }
}

/** 我要变强。四个页签只切换已有节点，不发协议。 */
function bindGrowSheet(sheet: Node): void {
  const panels = ["node_strong", "node_resource", "node_hero", "node_lineup"];
  const show = (name: string) => {
    for (let i = 0; i < panels.length; i++) {
      const node = findDescendant(sheet, panels[i]);
      if (node) node.active = panels[i] === name;
    }
  };
  show("node_strong");
  const name = findDescendant(sheet, "_heroStrongName");
  if (name) setText(name, growLine());
  const pairs = [
    ["btn_strong", "node_strong"],
    ["btn_resource", "node_resource"],
    ["btn_hero", "node_hero"],
    ["btn_lineup", "node_lineup"],
  ];
  for (let i = 0; i < pairs.length; i++) {
    const button = findDescendant(sheet, pairs[i][0]);
    const panel = pairs[i][1];
    if (!button) continue;
    bindTap(button, () => show(panel));
  }
  const strategy = findDescendant(sheet, "btn_strategy");
  if (strategy) {
    bindTap(strategy, () => {
      if (name && name.isValid) setText(name, growLine());
      GameLog.shared.info("Mainline", "我要变强没有服端协议，只展示名册，不改战力，不发 3013");
    });
  }
}

function growLine(): string {
  const heroes = GameStore.heroes() || [];
  if (heroes.length === 0) return "名册是空的";
  const names: string[] = [];
  for (let i = 0; i < heroes.length && names.length < 3; i++) {
    if (heroes[i].name) names.push(heroes[i].name);
  }
  return names.length > 0 ? names.join("、") : "已有英雄";
}

/** idle_speed_up 是 7200 秒，按两小时的 reward_base 预览。不发放。 */
function quickPreviewLine(): string {
  const minute = chapterIdleMinute(hangStageIdx());
  if (!minute) return "两小时收益还没有配置";
  return "两小时约 金币 " + minute.gold * 120 + " · 英雄经验 " + minute.heroExp * 120 + " · 角色经验 " + minute.roleExp * 120;
}

function silenceSheetMenus(root: Node): void {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    if (node.name.indexOf("Menu") < 0 && node.name !== "menu" && node.name.indexOf("menu") < 0) continue;
    const ui = node.getComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!size || size.width < 400 || size.height < 400) continue;
    assignContentSize(ui, 0, 0);
  }
}

function hangStageIdx(): number {
  const shown = hangShownStage();
  return shown === null ? 1 : shown;
}

async function openHangSheet(host: Node, path: string, onReady?: (view: Node) => void, surfaceFail = false): Promise<void> {
  if (!host.isValid) {
    if (surfaceFail) throw new Error("挂机壳已关");
    return;
  }
  const started = monoNow();
  const old = host.getChildByName("BattleSheet");
  if (old) old.destroy();
  try {
    const prefab = await loadPrefab(path);
    const dimPrefab = await loadPrefab(DIM_SHEET);
    if (!host.isValid) return;
    const sheet = spawnPrefab(dimPrefab, host);
    sheet.name = "BattleSheet";
    if (!sheet.getChildByName("dim")) GameLog.shared.warn("Mainline", "BattleSheet 下没有 dim");
    const view = spawnPrefab(prefab, sheet);
    mountCcbiView(view);
    silenceSheetMenus(view);
    const close = () => {
      if (sheet.isValid) sheet.destroy();
    };
    const button = findDescendant(view, "btn_close") || findDescendant(view, "btn_back");
    if (button) {
      liftNode(button, view);
      bindTap(button, close);
    } else GameLog.shared.warn("Mainline", path + " 没有 btn_close");
    if (onReady) onReady(view);
    sheet.parent = host;
    const raise = () => {
      if (!sheet.isValid || !host.isValid || sheet.parent !== host) return;
      sheet.setSiblingIndex(Math.max(0, host.children.length - 1));
    };
    raise();
    director.once(Director.EVENT_AFTER_UPDATE, raise);
    logOpenedPrefab(view, path, prefabBaseName(path), Math.max(0, Math.round(monoNow() - started)), "Mainline");
    GameLog.shared.info("Mainline", "hang sheet " + path);
  } catch (err) {
    GameLog.shared.warn("Mainline", "hang sheet " + path + " " + messageOf(err));
    if (surfaceFail) throw err;
  }
}

export function findDescendant(root: Node, name: string): Node | null {
  if (root.name === name) return root;
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const found = findDescendant(kids[i], name);
    if (found) return found;
  }
  return null;
}

export function bindTap(node: Node, fn: () => void): void {
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, fn);
}

/** 同一颗钮只绑一次。CLICK 和 TOUCH_END 都会到，80ms 内只算一下。 */
function bindTapOnce(node: Node, fn: () => void): void {
  const mark = node as Node & { mxzgTap?: boolean };
  if (mark.mxzgTap) return;
  mark.mxzgTap = true;
  if (!node.getComponent(Button)) node.addComponent(Button);
  let last = 0;
  const fire = () => {
    const now = Date.now();
    if (now - last < 80) return;
    last = now;
    fn();
  };
  node.on(Button.EventType.CLICK, fire);
  node.on(Node.EventType.TOUCH_END, fire);
}

/** 进了场景再拨一下 active，指针列表才会收这颗钮。没进场景时不拨。 */
function pokeButton(node: Node, again: boolean): void {
  const mark = node as Node & { mxzgPoked?: boolean; activeInHierarchy?: boolean };
  if (mark.mxzgPoked && !again) return;
  if (!node.parent || mark.activeInHierarchy === false) return;
  mark.mxzgPoked = true;
  try {
    node.active = false;
    node.active = true;
  } catch (err) {
    if (!isWidthRead(err)) throw err;
    noteHangShellWidth("pokeButton");
    if (node.isValid && !node.active) {
      try {
        node.active = true;
      } catch (_again) {
        /* 重新启用仍读 width。钮还在，下一帧再拨。 */
      }
    }
  }
}

/**
 * 全屏 CCMenu 会挡住兄弟节点。把按钮抬到宿主最上层，世界位置不变。
 * 记下 Prefab 里的原位。下一帧矩阵稳了再抬一次，不会停在第一次的空矩阵上。
 * 已经在宿主上时仍把这颗钮放到最前。
 */
export function liftNode(node: Node, host: Node): void {
  const mark = node as Node & { mxzgRest?: { parent: Node; x: number; y: number; z: number } };
  if (!mark.mxzgRest && node.parent && node.parent !== host) {
    mark.mxzgRest = { parent: node.parent, x: node.position.x, y: node.position.y, z: node.position.z };
  }
  const rest = mark.mxzgRest;
  const from = rest && rest.parent.isValid ? rest.parent : node.parent;
  if (!from) return;
  if (from === host) {
    node.setSiblingIndex(Math.max(0, host.children.length - 1));
    return;
  }
  const pos =
    rest && from === rest.parent
      ? { x: rest.x, y: rest.y, z: rest.z }
      : { x: node.position.x, y: node.position.y, z: node.position.z };
  const fromUi = from.getComponent(UITransform);
  const hostUi = host.getComponent(UITransform);
  const fromConv = fromUi as UITransform & {
    convertToWorldSpaceAR?: (p: { x: number; y: number; z?: number }) => { x: number; y: number; z?: number };
  };
  const hostConv = hostUi as UITransform & {
    convertToNodeSpaceAR?: (p: { x: number; y: number; z?: number }) => { x: number; y: number; z?: number };
  };
  if (!fromConv || !fromConv.convertToWorldSpaceAR || !hostConv || !hostConv.convertToNodeSpaceAR) {
    node.setSiblingIndex(Math.max(0, from.children.length - 1));
    return;
  }
  try {
    const world = fromConv.convertToWorldSpaceAR(pos);
    if (!world || !isFinite(world.x) || !isFinite(world.y)) {
      node.setSiblingIndex(Math.max(0, from.children.length - 1));
      return;
    }
    if (node.parent !== host) node.parent = host;
    const local = hostConv.convertToNodeSpaceAR(world);
    if (!local || !isFinite(local.x) || !isFinite(local.y)) {
      node.setSiblingIndex(Math.max(0, host.children.length - 1));
      return;
    }
    node.setPosition(local.x, local.y, local.z || 0);
    node.setSiblingIndex(Math.max(0, host.children.length - 1));
  } catch (_err) {
    if (node.parent) node.setSiblingIndex(Math.max(0, node.parent.children.length - 1));
  }
}
