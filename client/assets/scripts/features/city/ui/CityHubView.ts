import { _decorator, Button, Color, EventTouch, Node, Sprite, UITransform } from "cc";
import { ConfigLoader } from "../../../config/ConfigLoader";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { view } from "../../../framework/ui/UIRegistry";
import { CityMapQuery, dropCitySpriteLoad, paintCitySpriteWhenReady } from "../../../ui/CityMap";
import { CityEffectHandle, startCityEffects } from "../../../ui/cityEffectPlay";
import {
  CITY_CFG_BTN,
  CITY_CFG_EFFECT,
  CITY_CFG_POS,
  CityMapLayout,
  MainCityBtnFile,
  MainCityEffectFile,
  MainCityPosFile,
  buildCityMapLayout,
  cityAtomLocked,
  layerCoverX,
  mapFramePath,
} from "../../../ui/cityMapLayout";
import { CITY_HUB_PREFAB_PATH, bindClick } from "../../../ui/prefabLoad";
import { assignContentSize, bindVisibleRefresh, fitCityViewport, squeezeWideNode, uiSize } from "../../../ui/visibleFit";
import { CITY_MAP_HOST, CITY_VIEW_ID } from "../config/cityIds";
import { mountCityHubView } from "./cityMount";

const { ccclass, property } = _decorator;

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

const CITY_PLATES: { name: string; layer: number; piece: number }[] = [
  { name: "spr_map_bg4_1", layer: 4, piece: 1 },
  { name: "spr_map_bg3_1", layer: 3, piece: 1 },
  { name: "spr_map_bg2_1", layer: 2, piece: 1 },
  { name: "spr_map_bg1_1", layer: 1, piece: 1 },
  { name: "spr_map_bg1_2", layer: 1, piece: 2 },
];

const plateMisses = new Set<string>();

export interface CityHubOpenArgs {
  loadConfig?: <T>(path: string) => Promise<T>;
  onAtom: (atom: string) => void;
  onMainline: () => void;
  query: CityMapQuery;
}

/**
 * 主城地图。视差和建筑都绑在 CityHub 上。
 * 点击交给打开参数里的 onAtom，主线按钮交给原来的主线页。
 * 锁态只问 query，这里不读协议。
 */
@view({
  id: CITY_VIEW_ID,
  prefab: CITY_HUB_PREFAB_PATH,
  layer: UILayer.Hud,
  cache: false,
  allowMultiple: false,
  hostId: CITY_MAP_HOST,
  mount: mountCityHubView,
})
@ccclass("CityHubView")
export class CityHubView extends BaseView<CityHubOpenArgs> {
  @property(Node)
  parallax: Node | null = null;

  @property([Node])
  mapNodes: Node[] = [];

  @property([Node])
  spots: Node[] = [];

  @property([Node])
  effects: Node[] = [];

  @property(Node)
  btnMainline: Node | null = null;

  private pos: MainCityPosFile | null = null;
  private btn: MainCityBtnFile | null = null;
  private effect: MainCityEffectFile | null = null;
  private layout: CityMapLayout = buildCityMapLayout(null, null, null);
  private views = new Map<string, Node>();
  private spotViews = new Map<string, { sprite: Sprite | null }>();
  private scroll = 0;
  private dragged = false;
  private gestureMoved = false;
  private movedPx = 0;
  private fxHandle: CityEffectHandle | null = null;
  private started = false;
  private clicksBound = false;
  private cleaned = false;

  get root(): Node {
    return this.node;
  }

  /** 左下主线入口。文案仍由 MainApp 写成当前关。 */
  get mainButton(): Node | null {
    return this.btnMainline;
  }

  onOpen(args?: CityHubOpenArgs): void {
    if (args) this.args = args;
    if (this.started) {
      this.refreshLocks();
      return;
    }
    this.started = true;
    this.beginOpen();
    void this.initializeCity();
  }

  onClose(): void {
    this.cleanup();
  }

  dispose(): void {
    this.cleanup();
  }

  /** 等级或开服天变了再刷建筑锁。没有 query 就不改预制上的颜色。 */
  refreshLocks(): void {
    const query = this.args ? this.args.query : null;
    if (!query) {
      GameLog.shared.warn("CityHub", "没有等级数据，不改建筑锁");
      return;
    }
    this.spotViews.forEach((spot, atom) => {
      const locked = cityAtomLocked(atom, query.level(), query.openDay(), query.db());
      if (!spot.sprite) return;
      spot.sprite.grayscale = locked;
      spot.sprite.color = locked ? LOCKED_COLOR : OPEN_COLOR;
    });
  }

  private async initializeCity(): Promise<void> {
    try {
      if (!this.args) throw new Error("主城没有打开参数");
      this.collect();
      this.requireBound();
      this.layout = buildCityMapLayout(this.pos, this.btn, this.effect);
      bindVisibleRefresh(this.node, () => this.applyVisible());
      this.ensurePlates();
      const loaded = await Promise.all([
        this.loadCfg<MainCityPosFile>(CITY_CFG_POS),
        this.loadCfg<MainCityBtnFile>(CITY_CFG_BTN),
        this.loadCfg<MainCityEffectFile>(CITY_CFG_EFFECT),
      ]);
      if (this.cleaned || !this.node || !this.node.isValid) {
        this.failOpen(new Error("页面已关"));
        return;
      }
      this.pos = loaded[0];
      this.btn = loaded[1];
      this.effect = loaded[2];
      this.applyVisible();
      this.bindSpots();
      if (this.spotViews.size < 1 || !this.views.has("spot-main_summon")) throw new Error("CityHub 没有建筑按钮");
      this.fxHandle = startCityEffects(this.views, this.layout.effects, (node, parent, x, y) => this.placeBottomLeft(node, parent, x, y));
      this.bindMainline();
      this.bindDrag();
      this.refreshLocks();
      GameLog.shared.info("CityHub", "view buildings=" + this.spotViews.size + " scroll=" + this.scroll + " " + CITY_HUB_PREFAB_PATH);
      this.finishOpen();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(messageOf(err));
      GameLog.shared.warn("CityHub", "没有挂上 " + error.message);
      this.failOpen(error);
    }
  }

  /** 只用预制上绑好的节点。不从根往下扫。 */
  private collect(): void {
    this.views.clear();
    const add = (node: Node | null): void => {
      if (!node) return;
      if (!this.views.has(node.name)) this.views.set(node.name, node);
    };
    add(this.parallax);
    add(this.btnMainline);
    this.addAll(this.mapNodes);
    this.addAll(this.spots);
    this.addAll(this.effects);
  }

  private addAll(list: Node[] | null): void {
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const node = list[i];
      if (!node) continue;
      if (!this.views.has(node.name)) this.views.set(node.name, node);
    }
  }

  private requireBound(): void {
    if (!this.parallax) throw new Error("缺少节点 CityParallax");
    for (let i = 0; i < MAP_NODES.length; i++) {
      if (!this.views.has(MAP_NODES[i])) throw new Error("缺少节点 " + MAP_NODES[i]);
    }
    if (!this.btnMainline) throw new Error("缺少节点 BtnMainline");
    if (!this.btnMainline.getComponent(Button)) throw new Error("BtnMainline 缺少 Button");
  }

  private bindSpots(): void {
    if (this.clicksBound) return;
    this.clicksBound = true;
    const onAtom = this.args ? this.args.onAtom : null;
    if (!onAtom) throw new Error("主城没有建筑回调");
    for (let i = 0; i < this.layout.buildings.length; i++) {
      const spot = this.layout.buildings[i];
      const node = this.views.get("spot-" + spot.atom);
      if (!node) continue;
      node.setScale(spot.scale, spot.scale, 1);
      const sprite = node.getComponent(Sprite);
      if (sprite) {
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.color = OPEN_COLOR;
      }
      if (!node.getComponent(Button)) throw new Error(node.name + " 缺少 Button");
      bindClick(node, () => {
        if (this.dragged) return;
        onAtom(spot.atom);
      });
      this.spotViews.set(spot.atom, { sprite });
    }
  }

  private bindMainline(): void {
    const button = this.btnMainline;
    const onMainline = this.args ? this.args.onMainline : null;
    if (!button || !onMainline) throw new Error("主城没有主线按钮");
    bindClick(button, () => {
      if (this.dragged) return;
      onMainline();
    });
  }

  private bindDrag(): void {
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchStart, this);
  }

  private onTouchStart(): void {
    this.dragged = false;
    this.movedPx = 0;
  }

  private onTouchMove(event: EventTouch): void {
    const delta = event.getUIDelta();
    const dx = delta && typeof delta.x === "number" ? delta.x : 0;
    this.movedPx += Math.abs(dx);
    if (this.movedPx > DRAG_PX) {
      this.dragged = true;
      this.gestureMoved = true;
    }
    this.applyScroll(clamp(this.scroll + dx, this.layout.minScroll, this.layout.maxScroll));
  }

  private applyVisible(): void {
    if (!this.node || !this.node.isValid || !this.parallax) return;
    const box = fitCityViewport(this.node);
    this.layout = buildCityMapLayout(this.pos, this.btn, this.effect, { viewW: box.width, viewH: box.height });
    const parallaxUi = this.parallax.getComponent(UITransform);
    if (parallaxUi) {
      assignContentSize(parallaxUi, this.layout.contentW, this.layout.viewH);
      parallaxUi.setAnchorPoint(0, 0);
    }
    for (let i = 0; i < this.layout.nodes.length; i++) {
      const desc = this.layout.nodes[i];
      const node = this.views.get(desc.name);
      if (!node) throw new Error("缺少节点 " + desc.name);
      fitNode(node, desc.w, desc.h, desc.ax, desc.ay, desc.scale);
      if (desc.parallax) continue;
      const host = desc.parent ? this.views.get(desc.parent) : this.parallax;
      if (!host) continue;
      this.placeBottomLeft(node, host, desc.x, desc.y);
    }
    for (let i = 0; i < this.layout.effects.length; i++) {
      const spot = this.layout.effects[i];
      const node = this.views.get("fx-" + spot.name);
      if (!node) continue;
      const parent = this.views.get(spot.parent);
      if (!parent || node.parent !== parent) continue;
      this.placeBottomLeft(node, parent, spot.x, spot.y);
    }
    this.placeBuildings();
    if (this.btnMainline) squeezeWideNode(this.btnMainline, box.width);
    if (!this.gestureMoved) this.scroll = this.layout.scroll;
    else this.scroll = clamp(this.scroll, this.layout.minScroll, this.layout.maxScroll);
    this.applyScroll(this.scroll);
  }

  private placeBuildings(): void {
    for (let i = 0; i < this.layout.buildings.length; i++) {
      const spot = this.layout.buildings[i];
      const node = this.views.get("spot-" + spot.atom);
      const parent = this.views.get(spot.parent);
      if (!node || !parent) continue;
      node.setScale(spot.scale, spot.scale, 1);
      this.placeBottomLeft(node, parent, spot.x, spot.y);
    }
  }

  private applyScroll(next: number): void {
    if (!this.parallax) return;
    this.scroll = next;
    // 城景贴视口底边。底栏盖在上面。不要把整层上移，否则屏底露出页面黑底。
    this.placeBottomLeft(this.parallax, this.node, this.scroll, 0);
    for (let i = 0; i < this.layout.nodes.length; i++) {
      const desc = this.layout.nodes[i];
      if (!desc.parallax) continue;
      const node = this.views.get(desc.name);
      if (!node) continue;
      this.placeBottomLeft(
        node,
        this.parallax,
        layerCoverX(this.scroll, desc.parallax.ratio, desc.parallax.ox, desc.ax, desc.w, desc.scale, this.layout.viewW),
        desc.parallax.oy
      );
    }
  }

  private placeBottomLeft(node: Node, parent: Node, x: number, y: number): void {
    const ui = parent.getComponent(UITransform);
    const size = uiSize(ui) || { width: 0, height: 0 };
    const anchor = anchorOf(ui);
    node.setPosition(x - size.width * anchor.x, y - size.height * anchor.y, 0);
  }

  private ensurePlates(): void {
    for (let i = 0; i < CITY_PLATES.length; i++) this.fillPlate(CITY_PLATES[i], 3);
  }

  private fillPlate(plate: { name: string; layer: number; piece: number }, left: number): void {
    const node = this.views.get(plate.name);
    if (!node) return;
    const sprite = node.getComponent(Sprite);
    if (!sprite || plateReady(sprite)) return;
    const path = mapFramePath(plate.layer, plate.piece, 1);
    void paintCitySpriteWhenReady(path, (frame) => {
      if (!sprite.isValid || plateReady(sprite)) return;
      sprite.spriteFrame = frame;
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    }).then((status) => {
      if (!sprite.isValid || plateReady(sprite) || status === "ok") return;
      if (left > 1) {
        dropCitySpriteLoad(path);
        this.fillPlate(plate, left - 1);
        return;
      }
      if (plateMisses.has(path)) return;
      plateMisses.add(path);
      GameLog.shared.warn("CityHub", "plate miss " + path);
    });
  }

  private async loadCfg<T>(path: string): Promise<T | null> {
    try {
      return await (this.args?.loadConfig || ConfigLoader.loadJson)<T>(path);
    } catch (err) {
      GameLog.shared.error("CityHub", path + " " + (err instanceof Error ? err.message : "load failed"));
      return null;
    }
  }

  private cleanup(): void {
    if (this.cleaned) return;
    this.cleaned = true;
    if (this.fxHandle) {
      this.fxHandle.stop();
      this.fxHandle = null;
    }
    if (!this.node || !this.node.isValid) return;
    this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchStart, this);
  }
}

function fitNode(node: Node, w: number, h: number, ax: number, ay: number, scale: number): void {
  const ui = node.getComponent(UITransform);
  if (ui) {
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

function plateReady(sprite: Sprite): boolean {
  try {
    const frame = sprite.spriteFrame;
    if (!frame) return false;
    const texture = frame.texture;
    return !!texture && typeof texture.width === "number" && texture.width > 0;
  } catch (_err) {
    return false;
  }
}

function anchorOf(ui: UITransform | null): { x: number; y: number } {
  if (!ui) return { x: 0.5, y: 0.5 };
  if (typeof ui.anchorX === "number" && typeof ui.anchorY === "number") return { x: ui.anchorX, y: ui.anchorY };
  const point = ui.anchorPoint;
  if (point && typeof point.x === "number" && typeof point.y === "number") return { x: point.x, y: point.y };
  return { x: 0.5, y: 0.5 };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
