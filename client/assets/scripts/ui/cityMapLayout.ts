/**
 * 主城地图层（方案 B）的纯布局。
 * 只排视差底板、建筑点和活动图标，不包含 Pilot 的 7 项底栏、顶栏和日文图字。
 * 坐标：配置里的 x/y 是父节点左下角空间里的锚点位置；屏幕坐标原点在画面中心。
 * 设计分辨率是 640×1280。视口宽跟当前可见宽走，可以大于或小于 640。
 * 底板仍是 map-bg-city-* 多层长图，逻辑宽约 1500，不把一张图拉满屏幕。
 */
import { entryAccess, findNavEntry, GateSnapshot } from "../config/nav";

export const CITY_CFG_POS = "config/maincity/maincitypos";
export const CITY_CFG_BTN = "config/maincity/createmaincitybtn";
export const CITY_CFG_EFFECT = "config/maincity/maincityeffect";

export const CITY_VIEW_W = 640;
export const CITY_VIEW_H = 1280;
export const CITY_MAP_W = 1500;
export const CITY_MAP_H = 1280;
/**
 * 底栏盖住设计画面底部的高度。城景本身停在 y=0，贴图铺到屏底，由底栏盖住。
 * 页面壳用这个高度把超出底栏的整页往上让。布局自检的画面坐标不含上移。
 */
export const CITY_BAR_BOTTOM = 140;
/** 近景到远景。近的跟手更快。 */
export const CITY_PARALLAX_SPEEDS = [1.3, 1, 0.82, 0.63];
export const CITY_MAP_VARIANT = 1;

export interface MainCityPosRow {
  idx: number;
  atom: string;
  zorder: number;
  x: number;
  y: number;
}

export interface MainCityPosFile {
  main?: MainCityPosRow[];
}

export interface MainCityActRow {
  idx: number;
  atom: string;
  path?: string;
  type?: number;
  row?: number;
  col?: number;
}

export interface MainCityBtnFile {
  act?: { [atom: string]: MainCityActRow };
}

export interface MainCityEffectRow {
  idx: number;
  type?: string;
  para?: string;
  parent?: string;
  x: number;
  y: number;
  z?: number;
}

export interface MainCityEffectFile {
  maincityeffect?: MainCityEffectRow[];
}

export interface CityMapNode {
  name: string;
  /** 空表示挂在视差容器上。 */
  parent: string | null;
  x: number;
  y: number;
  ax: number;
  ay: number;
  w: number;
  h: number;
  scale: number;
  /** resources 路径，不含 /spriteFrame。 */
  frame?: string;
  parallax?: { ratio: number; ox: number; oy: number };
}

export interface CitySpot {
  atom: string;
  label: string;
  parent: string;
  x: number;
  y: number;
  scale: number;
  /** 按顺序试，缺图就换下一张。 */
  icons: string[];
}

export interface CityEffectSpot {
  name: string;
  parent: string;
  x: number;
  y: number;
  /** 动画型首帧路径；spine 型为 null */
  frame: string | null;
  /** anim | spine */
  kind: string;
  /** spine 资源 stem（resources/spine/<stem>），仅 kind=spine */
  spine: string | null;
}

export interface CityActivitySpot {
  atom: string;
  label: string;
  /** 画面中心为原点，不跟地图滚动。 */
  x: number;
  y: number;
  icons: string[];
}

export interface CityMapLayout {
  viewW: number;
  viewH: number;
  mapScale: number;
  contentW: number;
  scroll: number;
  minScroll: number;
  maxScroll: number;
  nodes: CityMapNode[];
  buildings: CitySpot[];
  effects: CityEffectSpot[];
  activities: CityActivitySpot[];
}

export interface CityAtomRoute {
  panel: string;
  /** tab：走底栏那条 onTab；open：走已有的 openChild / open*。 */
  via: "tab" | "open";
}

interface FrameSize {
  w: number;
  h: number;
}

/** 仓内 map-bg-city 的像素尺寸。加载到贴图后仍以这里排版，避免和配置坐标错位。 */
const FRAME_SIZE: { [key: string]: FrameSize } = {
  "1-1-1": { w: 488, h: 937 },
  "1-2-1": { w: 238, h: 1085 },
  "2-1-1": { w: 1500, h: 890 },
  "2-2-1": { w: 120, h: 140 },
  "3-1-1": { w: 1428, h: 689 },
  "4-1-1": { w: 1200, h: 900 },
  "1-1-2": { w: 488, h: 937 },
  "1-2-2": { w: 238, h: 1098 },
  "2-1-2": { w: 1500, h: 890 },
  "2-2-2": { w: 120, h: 140 },
  "3-1-2": { w: 1428, h: 689 },
  "4-1-2": { w: 1200, h: 900 },
};

const LABELS: { [atom: string]: string } = {
  main_ancient: "远古遗迹",
  main_hero_make: "英雄合成",
  main_summon: "召唤",
  main_blessingpool: "祈福池",
  main_shop: "商店",
  main_smith_shop: "铁匠铺",
  main_pub_task: "酒馆任务",
  main_altar: "祭坛",
  main_prophet_tree: "先知之树",
  main_fantasy_land: "幻境之地",
  main_pvp: "竞技场",
  main_fantasy_tower: "幻境之塔",
  main_black_market: "黑市",
  main_hero_pernute: "英雄置换",
  main_hero_palace: "英雄殿堂",
  main_exotic_adventure: "异域冒险",
  main_magic_cube: "魔方",
  main_crusade_group: "远征团",
  main_country_war: "国战",
  act_privilege: "特权",
  act_welfare: "福利",
  act_limit_time_activity: "限时活动",
  act_month_invest: "月投资",
  act_recharge_first: "首充",
  act_sevent_day_target: "七日目标",
  act_sevent_day_gift: "七日礼包",
  act_new_server_limit_activity: "新服限时",
  act_day_first_recharge: "每日首充",
  act_hero_arrive: "英雄降临",
  act_limit_gift: "限时礼包",
  act_mid_autumn: "中秋",
  act_happy_month: "欢乐月",
  act_clan_gvg: "公会战",
  act_clan_boss: "公会首领",
  act_festival_gift: "节日礼包",
  act_sevent_day_christmass_gift: "圣诞七日",
  act_develop_gift_activity: "养成礼包",
  main_champion: "冠军赛",
  act_new_year: "新年",
  act_limit_time_server: "限时开服",
  main_champion_cross: "跨服冠军",
  act_mystery_box: "神秘宝箱",
  act_adven_note: "冒险笔记",
  act_secret_treasure: "秘宝",
  act_seven_artifact: "七神器",
  act_supre_gift: "至尊礼包",
  act_appreciate_moon: "赏月",
  act_halloween: "万圣节",
  act_black_friday: "黑五",
  act_christmas: "圣诞",
  act_war_order: "战令",
  act_spring: "春节",
};

/** 能对上现有页面的 atom。其余走 PanelNav.openChild(atom)，由占位页或真服 Toast 接住。 */
const ROUTES: { [atom: string]: CityAtomRoute } = {
  main_summon: { panel: "summon", via: "tab" },
  main_smith_shop: { panel: "smith", via: "tab" },
  main_hero_palace: { panel: "hero", via: "tab" },
  main_shop: { panel: "shop", via: "open" },
  main_blessingpool: { panel: "wish", via: "open" },
  main_pvp: { panel: "arena", via: "open" },
  main_fantasy_tower: { panel: "tower", via: "open" },
  main_prophet_tree: { panel: "prophet", via: "open" },
  act_sevent_day_target: { panel: "goal7", via: "open" },
  act_sevent_day_gift: { panel: "login7", via: "open" },
  act_sevent_day_christmass_gift: { panel: "login7", via: "open" },
  act_welfare: { panel: "gift", via: "open" },
  act_recharge_first: { panel: "gift", via: "open" },
  act_day_first_recharge: { panel: "gift", via: "open" },
  act_supre_gift: { panel: "gift", via: "open" },
  act_develop_gift_activity: { panel: "gift", via: "open" },
  act_festival_gift: { panel: "gift", via: "open" },
  act_limit_time_activity: { panel: "limited", via: "open" },
  act_limit_gift: { panel: "limited", via: "open" },
  act_new_server_limit_activity: { panel: "limited", via: "open" },
};

export function cityAtomLabel(atom: string): string {
  return LABELS[atom] || atom;
}

export function cityAtomRoute(atom: string): CityAtomRoute | null {
  return ROUTES[atom] || null;
}

export function cityAtomLocked(atom: string, level: number, openDay: number, db: GateSnapshot | null): boolean {
  const route = cityAtomRoute(atom);
  if (!route) return false;
  const entry = findNavEntry(route.panel);
  if (!entry) return false;
  return !entryAccess(entry, level, openDay, db).open;
}

export function buildingIconCandidates(atom: string): string[] {
  return ["ui/city/main-city_icon-" + atom];
}

/** config path 是老 plist 名。解帧文件是 main-city_<文件名>；没有就改用 icon-<atom>。 */
export function activityIconCandidates(atom: string, configPath: string | undefined): string[] {
  const out: string[] = [];
  const base = fileBase(configPath || "");
  if (base) out.push("ui/city/main-city_" + base);
  const byAtom = "ui/city/main-city_icon-" + atom;
  if (out.indexOf(byAtom) < 0) out.push(byAtom);
  return out;
}

export function mapFramePath(layer: number, piece: number, variant: number): string {
  return "ui/maps/map-bg-city-" + layer + "-" + piece + "-" + variant;
}

/** eff_main_city_summon → ui/city/main-city-effect_summon（无帧号）。 */
export function effectFrameStem(para: string | undefined): string | null {
  const prefix = "eff_main_city_";
  if (!para || para.indexOf(prefix) !== 0) return null;
  return "ui/city/main-city-effect_" + para.slice(prefix.length);
}

/**
 * 脊柱播失败时改播的序列。dx 图集里的光球和 portrait 帧同是 96×90。
 * chuanghu 只有 27×40 的一张附件，没有对应序列。
 * spr-cloud、main-city-effect_6、main-city-effect_15 不在 maincityeffect 表里，不另摆位置。
 */
export const CITY_SPINE_FRAME_FALLBACK: { [stem: string]: string } = {
  dx: "ui/city/main-city-effect_portrait",
};

/**
 * 按序号探到的帧。0 没有但 1 有（云从 1 起）就从 1 开始。
 * 中间缺一张就停，不把后面的洞接上。
 */
export function takeFrameRun<T>(probed: ReadonlyArray<T | null | undefined>): T[] {
  let start = 0;
  const firstMissing = probed[0] === null || probed[0] === undefined;
  if (firstMissing && probed.length > 1 && probed[1]) start = 1;
  const out: T[] = [];
  for (let i = start; i < probed.length; i++) {
    const frame = probed[i];
    if (frame === null || frame === undefined) break;
    out.push(frame);
  }
  return out;
}

/** res-block 的收起动作。没有 collect-0，0 和负数都落到 collect-1，大于 4 封在 collect-4。 */
export function harvestCollectClip(level: number): string {
  let n = Math.round(level);
  if (!isFinite(n) || n < 1) n = 1;
  if (n > 4) n = 4;
  return "collect-" + String(n);
}

/** 首帧路径，兼容旧调用。 */
export function effectFramePath(para: string | undefined): string | null {
  const stem = effectFrameStem(para);
  if (!stem) return null;
  return stem + "-0";
}

export function frameSize(layer: number, piece: number, variant: number): FrameSize {
  const found = FRAME_SIZE[layer + "-" + piece + "-" + variant];
  if (found) return found;
  return { w: 100, h: 100 };
}

/**
 * 近景右板要比视口多探出这么多。
 * 树图右缘有大约 18px 的透明缺口，只贴齐视口仍会露出后面的天空和远景。
 */
export const CITY_EDGE_BLEED = 32;

/**
 * 近景第二张（树/柱）的右锚，速度沿用视差近景。
 * 近景比内容走得快。右锚若按设计宽 640 钉在内容右缘，比 2:1 更窄的视口拖到最右时，
 * 树会停在视口里面，树缘和视口之间露出天空和远景。
 * 按当前视口把右缘收到视口外。近景盒子不夹，建筑仍挂在原来的父节点上。
 */
export function foregroundPiece2X(viewW: number, mapW: number, speed: number, scale?: number): number {
  const s = scale !== undefined && scale > 0 ? scale : 1;
  const contentW = Math.max(mapW * s, viewW > 0 ? viewW : 0);
  const minScroll = Math.min(0, viewW - contentW);
  const layerX = minScroll * (speed - 1);
  const viewRight = -minScroll + viewW;
  return (viewRight + CITY_EDGE_BLEED - layerX) / s;
}

export function layerAnchorX(scroll: number, ratio: number, ox: number): number {
  return scroll * (ratio - 1) + ox;
}

/**
 * 远景贴图比内容窄，按中线摆时拖到最左会露出页面底色。
 * 层比视口宽就把贴图缘收到视口外。近景 ratio>1 的盒子故意比两张板宽，不在这里夹。
 */
export function layerCoverX(
  scroll: number,
  ratio: number,
  ox: number,
  ax: number,
  width: number,
  scale: number,
  viewW: number
): number {
  const x = layerAnchorX(scroll, ratio, ox);
  if (ratio > 1) return x;
  const visualW = width * (scale > 0 ? scale : 1);
  if (!(visualW > 0) || !(viewW > 0)) return x;
  const viewLeft = -scroll;
  const viewRight = viewLeft + viewW;
  const leftOf = (anchorX: number) => anchorX - ax * visualW;
  let next = x;
  const left = leftOf(next);
  if (left > viewLeft) next -= left - viewLeft;
  const right = leftOf(next) + visualW;
  if (right < viewRight) next += viewRight - right;
  return next;
}

/** 图层锚点在窗口左下角坐标系里的 x。滚动距离乘速度。 */
export function layerWindowX(scroll: number, ratio: number, ox: number): number {
  return scroll * ratio + ox;
}

export function buildCityMapLayout(
  pos: MainCityPosFile | null,
  btn: MainCityBtnFile | null,
  effect: MainCityEffectFile | null,
  options?: { viewW?: number; viewH?: number; variant?: number }
): CityMapLayout {
  const viewW = options && options.viewW ? options.viewW : CITY_VIEW_W;
  const viewH = options && options.viewH ? options.viewH : CITY_VIEW_H;
  const variant = options && options.variant ? options.variant : CITY_MAP_VARIANT;
  const mapScale = viewH / CITY_MAP_H;
  // 逻辑宽是多层长图（约 1500）。视口更宽时内容至少铺满视口，避免两侧空出。
  const contentW = Math.max(CITY_MAP_W * mapScale, viewW);
  const minScroll = Math.min(0, viewW - contentW);
  const maxScroll = 0;
  // scroll 0 是内容左缘贴视口左缘。初始停在中间。
  let scroll = -(contentW - viewW) * 0.5;
  if (scroll < minScroll) scroll = minScroll;
  if (scroll > maxScroll) scroll = maxScroll;
  const speeds = CITY_PARALLAX_SPEEDS;
  const mid = CITY_MAP_W * 0.5 * mapScale;

  const plate = (layer: number, piece: number): FrameSize => frameSize(layer, piece, variant);
  const b11 = plate(1, 1);
  const b12 = plate(1, 2);
  const b21 = plate(2, 1);
  const b31 = plate(3, 1);
  const b41 = plate(4, 1);
  const skyScale = mapScale * 1.2;

  const nodes: CityMapNode[] = [
    layerNode("spr_map_bg4", speeds[3], mid, viewH, 0.5, 1, b41.w, b41.h, skyScale),
    layerNode("spr_map_bg3", speeds[2], mid, 390, 0.5, 0, b31.w, b31.h, mapScale),
    layerNode("spr_map_bg2", speeds[1], mid, 0, 0.5, 0, b21.w, b21.h, mapScale),
    layerNode("spr_map_bg1", speeds[0], 0, 0, 0, 0, CITY_MAP_W, CITY_MAP_H, mapScale),
    spriteNode("spr_map_bg4_1", "spr_map_bg4", b41.w * 0.5, b41.h * 0.5, 0.5, 0.5, b41.w, b41.h, mapFramePath(4, 1, variant)),
    spriteNode("spr_map_bg3_1", "spr_map_bg3", b31.w * 0.5, b31.h * 0.5, 0.5, 0.5, b31.w, b31.h, mapFramePath(3, 1, variant)),
    spriteNode("spr_map_bg2_1", "spr_map_bg2", b21.w * 0.5, b21.h * 0.5, 0.5, 0.5, b21.w, b21.h, mapFramePath(2, 1, variant)),
    spriteNode("spr_map_bg1_1", "spr_map_bg1", 0, 0, 0, 0, b11.w, b11.h, mapFramePath(1, 1, variant)),
    spriteNode(
      "spr_map_bg1_2",
      "spr_map_bg1",
      // 右缘跟当前视口走。设计宽 640 只是视口的一种，窄屏不能沿用那一个锚点。
      foregroundPiece2X(viewW, CITY_MAP_W, speeds[0], mapScale),
      0,
      1,
      0,
      b12.w,
      b12.h,
      mapFramePath(1, 2, variant)
    ),
  ];

  const buildings: CitySpot[] = [];
  const rows = pos && Array.isArray(pos.main) ? pos.main : [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.atom) continue;
    const scaleOf = row.zorder === 4 ? skyScale : mapScale;
    buildings.push({
      atom: row.atom,
      label: cityAtomLabel(row.atom),
      parent: parentForZ(row.zorder),
      x: row.x,
      y: row.y,
      scale: scaleOf === 0 ? 0.9 : (1 / scaleOf) * 0.9,
      icons: buildingIconCandidates(row.atom),
    });
  }

  const effects: CityEffectSpot[] = [];
  const effectRows = effect && Array.isArray(effect.maincityeffect) ? effect.maincityeffect : [];
  for (let i = 0; i < effectRows.length; i++) {
    const row = effectRows[i];
    if (!row || !row.parent) continue;
    const kind = (row.type || "anim").toLowerCase();
    const isSpine = kind === "spine";
    effects.push({
      name: row.para || "effect-" + row.idx,
      parent: row.parent,
      x: row.x,
      y: row.y,
      frame: isSpine ? null : effectFramePath(row.para),
      kind: isSpine ? "spine" : "anim",
      spine: isSpine && row.para ? row.para : null,
    });
  }

  // 这 33 个点只留给布局自检。CityMap 不再把它们挂到画面上，避免叠在 ActGroup 上。
  const activities = placeActivities(btn, viewW);
  return {
    viewW,
    viewH,
    mapScale,
    contentW,
    scroll,
    minScroll,
    maxScroll,
    nodes,
    buildings,
    effects,
    activities,
  };
}

export function findCityNode(layout: CityMapLayout, name: string): CityMapNode | null {
  for (let i = 0; i < layout.nodes.length; i++) {
    if (layout.nodes[i].name === name) return layout.nodes[i];
  }
  return null;
}

/**
 * 内容左缘在画面中心坐标系里的 x。
 * scroll 为 0（拖到最左）时等于 -viewW/2，和屏幕左缘重合。
 */
export function contentLeftX(viewW: number, scroll: number): number {
  return scroll - viewW * 0.5;
}

/** 建筑中心在画面中心坐标系里的位置。 */
export function buildingScreen(layout: CityMapLayout, atom: string, scroll: number): { x: number; y: number } | null {
  let spot: CitySpot | null = null;
  for (let i = 0; i < layout.buildings.length; i++) {
    if (layout.buildings[i].atom === atom) {
      spot = layout.buildings[i];
      break;
    }
  }
  if (!spot) return null;
  const parent = findCityNode(layout, spot.parent);
  if (!parent) return null;
  const anchor = anchorInParallax(layout, parent, scroll);
  const localX = spot.x - parent.w * parent.ax;
  const localY = spot.y - parent.h * parent.ay;
  const px = anchor.x + localX * parent.scale;
  const py = anchor.y + localY * parent.scale;
  return { x: scroll + px - layout.viewW * 0.5, y: py - layout.viewH * 0.5 };
}

function placeActivities(btn: MainCityBtnFile | null, viewW: number): CityActivitySpot[] {
  const raw = btn && btn.act ? btn.act : {};
  const rows: MainCityActRow[] = [];
  const keys = Object.keys(raw);
  for (let i = 0; i < keys.length; i++) {
    const row = raw[keys[i]];
    if (!row || !row.atom) continue;
    rows.push(row);
  }
  rows.sort((a, b) => a.idx - b.idx);
  const icon = 34;
  const gap = 4;
  const cell = icon + gap;
  const cols = Math.max(1, Math.floor((viewW - 24) / cell));
  const top = 470;
  const spots: CityActivitySpot[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const col = i % cols;
    const line = Math.floor(i / cols);
    const count = Math.min(cols, rows.length - line * cols);
    const span = count * cell - gap;
    const x0 = -span / 2 + icon / 2;
    spots.push({
      atom: row.atom,
      label: cityAtomLabel(row.atom),
      x: x0 + col * cell,
      y: top - line * cell,
      icons: activityIconCandidates(row.atom, row.path),
    });
  }
  return spots;
}

function anchorInParallax(layout: CityMapLayout, node: CityMapNode, scroll: number): { x: number; y: number } {
  if (node.parallax) {
    return { x: layerAnchorX(scroll, node.parallax.ratio, node.parallax.ox), y: node.parallax.oy };
  }
  if (!node.parent) return { x: node.x, y: node.y };
  const parent = findCityNode(layout, node.parent);
  if (!parent) return { x: node.x, y: node.y };
  const anchor = anchorInParallax(layout, parent, scroll);
  const localX = node.x - parent.w * parent.ax;
  const localY = node.y - parent.h * parent.ay;
  return { x: anchor.x + localX * parent.scale, y: anchor.y + localY * parent.scale };
}

function parentForZ(zorder: number): string {
  if (zorder === 1) return "spr_map_bg1_1";
  if (zorder === 3) return "spr_map_bg3";
  if (zorder === 4) return "spr_map_bg4";
  return "spr_map_bg2";
}

function layerNode(
  name: string,
  ratio: number,
  ox: number,
  oy: number,
  ax: number,
  ay: number,
  w: number,
  h: number,
  scale: number
): CityMapNode {
  return {
    name,
    parent: null,
    x: 0,
    y: oy,
    ax,
    ay,
    w,
    h,
    scale,
    parallax: { ratio, ox, oy },
  };
}

function spriteNode(
  name: string,
  parent: string,
  x: number,
  y: number,
  ax: number,
  ay: number,
  w: number,
  h: number,
  frame: string
): CityMapNode {
  return { name, parent, x, y, ax, ay, w, h, scale: 1, frame };
}

function fileBase(path: string): string {
  const slash = path.lastIndexOf("/");
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return name;
  return name.slice(0, dot);
}
