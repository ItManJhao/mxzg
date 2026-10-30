/**
 * 绑定 CityHub.prefab。中间是旧主城：map-bg-city 视差板和建筑图标。
 * 路径相对 assets：prefabs/ui/city/CityHub。底板丢图时才用 resources 补 spriteFrame。
 * 按节点名绑定。根上的 CityHubView 走新路径，这里不调用它。USE_CITY_HUB_PREFAB 为 false，或加载 / 绑节点失败时，
 * MainApp 只挂这份预制。缺了只打日志，不退回代码地图。
 * 视口宽跟 view.getVisibleSize() 走。底板仍是 map-bg-city-* 多层长图，不拉成一张。
 * 建筑点击交给原来的 onCityAtom。根上的 BtnMainline 打开原来的主线页。
 * 活动通栏不画在这张 Prefab 上，避免盖住建筑。右上活动仍是 CityChrome 的 ActGroup。
 */
import { Button, Color, EventTouch, Node, Sprite, UITransform } from "cc";
import { ConfigLoader } from "../config/ConfigLoader";
import { GameLog } from "../core/GameLog";
import { CityMapHandle, CityMapQuery, dropCitySpriteLoad, paintCitySpriteWhenReady } from "./CityMap";
import {
  CITY_CFG_BTN,
  CITY_CFG_EFFECT,
  CITY_CFG_POS,
  CityMapLayout,
  CityMapNode,
  MainCityBtnFile,
  MainCityEffectFile,
  MainCityPosFile,
  buildCityMapLayout,
  cityAtomLocked,
  layerCoverX,
  mapFramePath,
} from "./cityMapLayout";
import { startCityEffects, CityEffectHandle } from "./cityEffectPlay";
import { takeStagedHub } from "./cityStage";
import { CITY_CHROME_PREFAB_PATH, CITY_HUB_PREFAB_PATH, bindClick, loadPrefab, spawnPrefab } from "./prefabLoad";
import { assignContentSize, bindVisibleRefresh, fitCityViewport, squeezeWideNode, uiSize } from "./visibleFit";

export { CITY_HUB_PREFAB_PATH };

export interface CityHubHandle extends CityMapHandle {
  /** 屏幕固定的主线入口。文案由 MainApp 写成当前关。 */
  mainButton: Node | null;
}

const LOCKED_COLOR = new Color(150, 150, 150, 255);
const OPEN_COLOR = new Color(255, 255, 255, 255);
const DRAG_PX = 12;

const MAP_NODES = [
  "CityParallax",
  "spr_map_bg4",
  "spr_map_bg3",
  "spr_map_bg2",
  "spr_map_bg1",
  "spr_map_bg4_1",
  "spr_map_bg3_1",
  "spr_map_bg2_1",
  "spr_map_bg1_1",
  "spr_map_bg1_2",
];

export async function mountCityHubPrefab(
  parent: Node,
  onAtom: (atom: string) => void,
  onMainline: () => void,
  query: CityMapQuery
): Promise<CityHubHandle> {
  const staged = takeStagedHub();
  // 开机已经实例化过就只换父节点。这里再 load + instantiate 会赶在第一帧绘制前，空场景清屏就是几十秒黑。
  const root = staged ?? spawnPrefab(await loadPrefab(CITY_HUB_PREFAB_PATH), parent);
  if (staged) root.parent = parent;
  try {
    return await bindCityHub(root, onAtom, onMainline, query);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

async function bindCityHub(
  root: Node,
  onAtom: (atom: string) => void,
  onMainline: () => void,
  query: CityMapQuery
): Promise<CityHubHandle> {
  let pos: MainCityPosFile | null = null;
  let btn: MainCityBtnFile | null = null;
  let effect: MainCityEffectFile | null = null;
  let layout = buildCityMapLayout(pos, btn, effect);
  const views = indexByName(root);
  for (let i = 0; i < MAP_NODES.length; i++) {
    if (!views.has(MAP_NODES[i])) throw new Error("缺少节点 " + MAP_NODES[i]);
  }
  const parallax = views.get("CityParallax") as Node;
  const gesture = { dragged: false, moved: false };
  const spots = new Map<string, { sprite: Sprite | null }>();
  let bound = 0;
  let scroll = 0;

  const placeBuildings = (): void => {
    for (let i = 0; i < layout.buildings.length; i++) {
      const spot = layout.buildings[i];
      const node = views.get("spot-" + spot.atom);
      const parent = views.get(spot.parent);
      if (!node || !parent) continue;
      node.setScale(spot.scale, spot.scale, 1);
      placeBottomLeft(node, parent, spot.x, spot.y);
    }
  };

  const applyScroll = (next: number): void => {
    scroll = next;
    // 城景贴视口底边。底栏盖在上面。不要把整层上移，否则屏底露出页面黑底。
    placeBottomLeft(parallax, root, scroll, 0);
    for (let i = 0; i < layout.nodes.length; i++) {
      const desc = layout.nodes[i];
      if (!desc.parallax) continue;
      const node = views.get(desc.name);
      if (!node) continue;
      placeBottomLeft(
        node,
        parallax,
        layerCoverX(scroll, desc.parallax.ratio, desc.parallax.ox, desc.ax, desc.w, desc.scale, layout.viewW),
        desc.parallax.oy
      );
    }
  };

  const applyVisible = (): void => {
    if (!root.isValid) return;
    const box = fitCityViewport(root);
    layout = buildCityMapLayout(pos, btn, effect, { viewW: box.width, viewH: box.height });
    const parallaxUi = parallax.getComponent(UITransform);
    if (parallaxUi) {
      assignContentSize(parallaxUi, layout.contentW, layout.viewH);
      parallaxUi.setAnchorPoint(0, 0);
    }
    for (let i = 0; i < layout.nodes.length; i++) {
      const desc = layout.nodes[i];
      const node = views.get(desc.name);
      if (!node) throw new Error("缺少节点 " + desc.name);
      fitNode(node, desc.w, desc.h, desc.ax, desc.ay, desc.scale);
      if (desc.parallax) continue;
      const host = desc.parent ? views.get(desc.parent) : parallax;
      if (!host) continue;
      placeBottomLeft(node, host, desc.x, desc.y);
    }
    for (let i = 0; i < layout.effects.length; i++) {
      const spot = layout.effects[i];
      const node = views.get("fx-" + spot.name);
      if (!node) continue;
      const parent = views.get(spot.parent);
      if (!parent || node.parent !== parent) continue;
      placeBottomLeft(node, parent, spot.x, spot.y);
    }
    placeBuildings();
    const mainButton = views.get("BtnMainline");
    if (mainButton) squeezeWideNode(mainButton, box.width);
    if (!gesture.moved) scroll = layout.scroll;
    else scroll = clamp(scroll, layout.minScroll, layout.maxScroll);
    applyScroll(scroll);
  };

  // 先按空表把视差板摆进屏幕。Prefab 默认 x=-750，等配置再摆的话进城会先黑几秒。
  bindVisibleRefresh(root, applyVisible);
  // 底板丢了再补。不 await：一张图不回调时，视差和特效先挂上。超时不重开解码。
  ensureCityPlates(views);
  const loaded = await Promise.all([
    loadCfg<MainCityPosFile>(CITY_CFG_POS),
    loadCfg<MainCityBtnFile>(CITY_CFG_BTN),
    loadCfg<MainCityEffectFile>(CITY_CFG_EFFECT),
  ]);
  if (!root.isValid) throw new Error("CityHub 已卸下");
  pos = loaded[0];
  btn = loaded[1];
  effect = loaded[2];
  applyVisible();
  for (let i = 0; i < layout.buildings.length; i++) {
    const spot = layout.buildings[i];
    const node = views.get("spot-" + spot.atom);
    if (!node) continue;
    node.setScale(spot.scale, spot.scale, 1);
    const sprite = node.getComponent(Sprite);
    if (sprite) {
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      sprite.color = OPEN_COLOR;
    }
    const button = node.getComponent(Button);
    if (!button) throw new Error(node.name + " 缺少 Button");
    bindAtom(node, spot.atom, onAtom, () => gesture.dragged);
    spots.set(spot.atom, { sprite });
    bound += 1;
  }
  if (bound < 1 || !views.has("spot-main_summon")) throw new Error("CityHub 没有建筑按钮");
  let fxHandle: CityEffectHandle | null = startCityEffects(views, layout.effects, placeBottomLeft);

  let moved = 0;
  const onStart = (): void => {
    gesture.dragged = false;
    moved = 0;
  };
  const onMove = (event: EventTouch): void => {
    const delta = event.getUIDelta();
    const dx = delta && typeof delta.x === "number" ? delta.x : 0;
    moved += Math.abs(dx);
    if (moved > DRAG_PX) {
      gesture.dragged = true;
      gesture.moved = true;
    }
    applyScroll(clamp(scroll + dx, layout.minScroll, layout.maxScroll));
  };
  root.on(Node.EventType.TOUCH_START, onStart);
  root.on(Node.EventType.TOUCH_MOVE, onMove);
  root.on(Node.EventType.TOUCH_CANCEL, onStart);

  const mainButton = views.get("BtnMainline") || null;
  if (mainButton) {
    if (!mainButton.getComponent(Button)) throw new Error("BtnMainline 缺少 Button");
    bindClick(mainButton, () => {
      if (gesture.dragged) return;
      onMainline();
    });
  }

  const refreshLocks = (): void => {
    spots.forEach((spot, atom) => {
      const locked = cityAtomLocked(atom, query.level(), query.openDay(), query.db());
      if (!spot.sprite) return;
      spot.sprite.grayscale = locked;
      spot.sprite.color = locked ? LOCKED_COLOR : OPEN_COLOR;
    });
  };
  refreshLocks();
  GameLog.shared.info(
    "CityHub",
    "prefab buildings=" + bound + " scroll=" + scroll + " " + CITY_HUB_PREFAB_PATH
  );

  return {
    root,
    mainButton,
    refreshLocks,
    dispose() {
      if (fxHandle) {
        fxHandle.stop();
        fxHandle = null;
      }
      if (!root.isValid) return;
      root.off(Node.EventType.TOUCH_START, onStart);
      root.off(Node.EventType.TOUCH_MOVE, onMove);
      root.off(Node.EventType.TOUCH_CANCEL, onStart);
    },
  };
}

function bindAtom(node: Node, atom: string, onAtom: (atom: string) => void, dragged: () => boolean): void {
  bindClick(node, () => {
    if (dragged()) return;
    onAtom(atom);
  });
}

function fitNode(node: Node, w: number, h: number, ax: number, ay: number, scale: number): void {
  const ui = node.getComponent(UITransform);
  if (ui) {
    // 预制刚挂上时 _contentSize 还是 null，直接 setContentSize 会读 width 抛错。
    assignContentSize(ui, w, h);
    ui.setAnchorPoint(ax, ay);
  }
  node.setScale(scale, scale, 1);
  const sprite = node.getComponent(Sprite);
  if (!sprite) return;
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  const trimable = sprite as Sprite & { trim?: boolean };
  if (typeof trimable.trim === "boolean") trimable.trim = false;
}

const CITY_PLATES: { name: string; layer: number; piece: number }[] = [
  { name: "spr_map_bg4_1", layer: 4, piece: 1 },
  { name: "spr_map_bg3_1", layer: 3, piece: 1 },
  { name: "spr_map_bg2_1", layer: 2, piece: 1 },
  { name: "spr_map_bg1_1", layer: 1, piece: 1 },
  { name: "spr_map_bg1_2", layer: 1, piece: 2 },
];

/**
 * 开机加载条里把主城、顶栏预制和三张布局表解进缓存，并多留一次引用。
 * 五张 map-bg 已经是主城预制的依赖，不要再 resources.load 一遍。
 * 顶栏预制（CityChrome，含 4.5MB 方正字）以前要等进了空的 Main 才解，那段等待清屏全黑。
 * 放在开机资源阶段。实例化在 stageCityShell，不放在 MainApp.build 开头。
 */
export function primeCityHub(): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  try {
    jobs.push(loadPrefab(CITY_HUB_PREFAB_PATH).then(holdPrefab));
    jobs.push(loadPrefab(CITY_CHROME_PREFAB_PATH).then(holdPrefab));
    jobs.push(ConfigLoader.loadJson(CITY_CFG_POS));
    jobs.push(ConfigLoader.loadJson(CITY_CFG_BTN));
    jobs.push(ConfigLoader.loadJson(CITY_CFG_EFFECT));
  } catch (_err) {
    return Promise.resolve();
  }
  return Promise.all(jobs).then(
    () => undefined,
    () => undefined
  );
}

function holdPrefab(prefab: { addRef?: () => void }): void {
  if (prefab && typeof prefab.addRef === "function") prefab.addRef();
}

const cityHubPlateMisses = new Set<string>();

/** Prefab 跨 bundle 丢了 spriteFrame 时，城景会空。按 resources 再补。超时不重开解码，晚到的帧仍贴上。 */
function ensureCityPlates(views: Map<string, Node>): void {
  for (let i = 0; i < CITY_PLATES.length; i++) fillCityPlate(views, CITY_PLATES[i], 3);
}

function fillCityPlate(views: Map<string, Node>, plate: { name: string; layer: number; piece: number }, left: number): void {
  const node = views.get(plate.name);
  if (!node) return;
  const sprite = node.getComponent(Sprite);
  if (!sprite || cityPlateReady(sprite)) return;
  const path = mapFramePath(plate.layer, plate.piece, 1);
  void paintCitySpriteWhenReady(path, (frame) => {
    if (!sprite.isValid || cityPlateReady(sprite)) return;
    sprite.spriteFrame = frame;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  }).then((status) => {
    if (!sprite.isValid || cityPlateReady(sprite) || status === "ok") return;
    if (left > 1) {
      dropCitySpriteLoad(path);
      fillCityPlate(views, plate, left - 1);
      return;
    }
    if (cityHubPlateMisses.has(path)) return;
    cityHubPlateMisses.add(path);
    GameLog.shared.warn("CityHub", "plate miss " + path);
  });
}

function cityPlateReady(sprite: Sprite): boolean {
  try {
    const frame = sprite.spriteFrame;
    if (!frame) return false;
    const texture = frame.texture;
    return !!texture && typeof texture.width === "number" && texture.width > 0;
  } catch (_err) {
    return false;
  }
}

function indexByName(root: Node): Map<string, Node> {
  const out = new Map<string, Node>();
  const walk = (node: Node): void => {
    if (!out.has(node.name)) out.set(node.name, node);
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
  };
  walk(root);
  return out;
}

function placeBottomLeft(node: Node, parent: Node, x: number, y: number): void {
  const ui = parent.getComponent(UITransform);
  const size = uiSize(ui) || { width: 0, height: 0 };
  const anchor = anchorOf(ui);
  node.setPosition(x - size.width * anchor.x, y - size.height * anchor.y, 0);
}

function anchorOf(ui: UITransform | null): { x: number; y: number } {
  if (!ui) return { x: 0.5, y: 0.5 };
  if (typeof ui.anchorX === "number" && typeof ui.anchorY === "number") return { x: ui.anchorX, y: ui.anchorY };
  const point = ui.anchorPoint;
  if (point && typeof point.x === "number" && typeof point.y === "number") return { x: point.x, y: point.y };
  return { x: 0.5, y: 0.5 };
}

async function loadCfg<T>(path: string): Promise<T | null> {
  try {
    return await ConfigLoader.loadJson<T>(path);
  } catch (err) {
    GameLog.shared.error("CityHub", path + " " + (err instanceof Error ? err.message : "load failed"));
    return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** 布局类型留下，方便对照 cityMapLayout。运行时位置以 buildCityMapLayout 为准。 */
export type CityHubLayout = CityMapLayout;
