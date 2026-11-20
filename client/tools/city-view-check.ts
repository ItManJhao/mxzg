/**
 * 主城入口回归。使用引擎替身核对预制体绑定、红点状态和开关生命周期。
 */
import { Node } from "cc";
import { readFileSync } from "fs";

import { join } from "path";

import { CityMapLayoutUtils, CITY_EDGE_BLEED } from "../assets/scripts/features/city/ui/CityMapLayoutUtils";
import { CityChromeView } from "../assets/scripts/features/city/ui/CityChromeView";
import { CityHubView } from "../assets/scripts/features/city/ui/CityHubView";
import { GameRedDotKey } from "../assets/scripts/features/common/utils/GameRedDotKey";
import { RedDotManager } from "../assets/scripts/framework/ui/RedDotManager";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";

import { TAB_SELECTED_SCALE, CityTabUtils } from "../assets/scripts/features/city/utils/CityTabUtils";

const root = process.cwd();

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function classId(uuid: string): string {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  let out = hex.slice(0, 5);
  for (let i = 5; i < hex.length; i += 3) {
    const h1 = parseInt(hex[i], 16);
    const h2 = parseInt(hex[i + 1], 16);
    const h3 = parseInt(hex[i + 2], 16);
    out += BASE64[(h1 << 2) | (h2 >> 2)];
    out += BASE64[((h2 & 3) << 4) | h3];
  }
  return out;
}

function metaUuid(path: string): string {
  const meta = JSON.parse(read(path)) as { uuid?: string };
  if (!meta.uuid) throw new Error("缺少 uuid " + path);
  return meta.uuid;
}

interface PrefabObj {
  __type__?: string;
  _name?: string;
  _active?: boolean;
  _spriteFrame?: { __uuid__?: string };
  _children?: { __id__?: number }[];
  _components?: { __id__?: number }[];
  node?: { __id__?: number };
}

function loadPrefab(path: string): PrefabObj[] {
  return JSON.parse(read(path)) as PrefabObj[];
}

function component(data: PrefabObj[], typeId: string): PrefabObj {
  for (let i = 0; i < data.length; i++) {
    if (data[i].__type__ === typeId) return data[i];
  }
  throw new Error("预制上没有组件 " + typeId);
}

function nodeAt(data: PrefabObj[], ref: { __id__?: number } | null | undefined): PrefabObj {
  if (!ref || typeof ref.__id__ !== "number") throw new Error("节点引用是空的");
  const node = data[ref.__id__];
  if (!node || node.__type__ !== "cc.Node" || !node._name) throw new Error("引用不是节点 " + ref.__id__);
  return node;
}

function nodeName(data: PrefabObj[], ref: { __id__?: number } | null | undefined): string {
  return nodeAt(data, ref)._name || "";
}

function parentName(data: PrefabObj[], ref: { __id__?: number } | null | undefined): string {
  const node = nodeAt(data, ref) as PrefabObj & { _parent?: { __id__?: number } };
  if (!node._parent || typeof node._parent.__id__ !== "number") return "";
  const parent = data[node._parent.__id__];
  return parent && parent._name ? parent._name : "";
}

/** 检查红点为对应按钮的隐藏子节点，并使用原红点 SpriteFrame。 */
function checkRedDotNode(data: PrefabObj[], target: PrefabObj): void {
  const children = target._children || [];
  const dots = children.map(ref => nodeAt(data, ref)).filter(node => node._name === "RedDot");
  assert(dots.length === 1 && dots[0]._active === false, `${target._name} 恰有一个默认隐藏的红点`);
  const sprite = dots[0]._components?.map(ref => data[ref.__id__!]).find(comp => comp.__type__ === "cc.Sprite");
  const source = metaUuid("client/assets/bundles/module/common/ui/other_spr-reddot-1.png.meta");
  assert(sprite?._spriteFrame?.__uuid__ === `${source}@f9941`, `${target._name} 使用原红点资源`);
}

function checkFramework(): void {
  const files = [
    "client/assets/scripts/framework/ui/UIManager.ts",
    "client/assets/scripts/framework/ui/UIRegistry.ts",
    "client/assets/scripts/framework/ui/UILayer.ts",
    "client/assets/scripts/framework/ui/BaseView.ts",
    "client/assets/scripts/framework/ui/ViewCloseUtils.ts",
  ];
  const banned = ["CityHubView", "CityChromeView", "features/city", "BackpackView"];
  for (let i = 0; i < files.length; i++) {
    const text = read(files[i]);
    for (let j = 0; j < banned.length; j++) {
      assert(text.indexOf(banned[j]) < 0, files[i] + " mentions " + banned[j]);
    }
  }
  const manager = read("client/assets/scripts/framework/ui/UIManager.ts");
  assert(manager.indexOf("setResidentHost") >= 0, "UIManager can host a resident view");
  assert(manager.indexOf("openById") >= 0 && manager.indexOf("closeById") >= 0, "UIManager opens and closes by id");
  assert(manager.indexOf("back()") >= 0, "UIManager can go back");
  const layer = read("client/assets/scripts/framework/ui/UILayer.ts");
  assert(layer.indexOf("Hud") >= 0, "HUD layer exists");
}

const NARROW_VIEWS = [576, 590, 640, 720, 996];

function rightTreeOverhang(viewW: number): number {
  const layout = CityMapLayoutUtils.buildCityMapLayout(null, null, null, { viewW, viewH: 1280 });
  const plate = CityMapLayoutUtils.findCityNode(layout, "spr_map_bg1_2");
  const layer = CityMapLayoutUtils.findCityNode(layout, "spr_map_bg1");
  assert(plate !== null && layer !== null && layer.parallax, "right foreground plate is on the near layer");
  const scroll = layout.minScroll;
  const layerX = CityMapLayoutUtils.layerAnchorX(scroll, layer.parallax.ratio, layer.parallax.ox);
  const right = layerX + plate.x * layer.scale;
  return right - (-scroll + viewW);
}

/** 核对当前主城View与显示工具的分工，不再要求已退役工厂持有导航选中状态。 */
function checkSources(): void {
  const hub = read("client/assets/scripts/features/city/ui/CityHubView.ts");
  const chrome = read("client/assets/scripts/features/city/ui/CityChromeView.ts");
  assert(hub.indexOf("findNode") < 0 && chrome.indexOf("findNode") < 0, "new city views do not findNode");
  assert(hub.indexOf("indexByName") < 0 && chrome.indexOf("indexByName") < 0, "new city views do not index the tree");
  assert(!hub.includes("@UIRegistry.view(") && !chrome.includes("@UIRegistry.view("), "主城子视图只由组合页面持有，不重复登记");
  assert(hub.indexOf("onCityAtom") < 0, "hub does not reimplement routing");
  assert(hub.indexOf("cityAtomLocked") >= 0, "hub still locks buildings from the query");
  assert(chrome.indexOf("setCityExtras") >= 0, "chrome still hides the activity row");
  assert(chrome.indexOf('createRect("BgPad"') < 0, "new chrome does not paint a BgPad");
  assert(chrome.indexOf('getChildByName("BgPad")') >= 0, "new chrome turns an existing BgPad off");
  const chromeTools = read("client/assets/scripts/features/city/ui/CityChromeUtils.ts");
  assert(chromeTools.indexOf('createRect("BgPad"') < 0, "显示工具不重建固定背景");
  assert(!chromeTools.includes("mountCityChromePrefab") && !chromeTools.includes("mountCityChrome("), "旧主城工厂已退役");
  assert(chromeTools.indexOf("layoutCityTab") >= 0 && chromeTools.indexOf("prepareCityTab") >= 0, "显示工具保留导航尺寸规范化与选中缩放");
  assert(hub.indexOf("layerCoverX") >= 0, "hub keeps far layers over the viewport");
  const skyLeft = CityMapLayoutUtils.layerCoverX(0, 0.63, 750, 0.5, 1200, 1.2, 640);
  const skyLeftEdge = skyLeft - 0.5 * 1200 * 1.2;
  assert(skyLeftEdge <= 0, "sky covers the left edge at scroll 0");
  assert(skyLeftEdge + 1200 * 1.2 >= 640, "sky still covers the view when pulled left");
  const skyMid = CityMapLayoutUtils.layerCoverX(-430, 0.63, 750, 0.5, 1200, 1.2, 640);
  assert(Math.abs(skyMid - CityMapLayoutUtils.layerAnchorX(-430, 0.63, 750)) < 0.001, "sky stays put while the view is covered");
  const farLeft = CityMapLayoutUtils.layerCoverX(0, 0.82, 750, 0.5, 1428, 1, 640);
  assert(farLeft - 0.5 * 1428 <= 0, "far city covers the left edge");
  const near = CityMapLayoutUtils.layerCoverX(-860, 1.3, 0, 0, 1500, 1, 640);
  assert(near === CityMapLayoutUtils.layerAnchorX(-860, 1.3, 0), "near layer is not dragged to hide its box");
  const ground = CityMapLayoutUtils.layerCoverX(0, 1, 750, 0.5, 1500, 1, 640);
  assert(ground === CityMapLayoutUtils.layerAnchorX(0, 1, 750), "ground anchor stays when it already fills the content");
  for (let i = 0; i < NARROW_VIEWS.length; i++) {
    const overhang = rightTreeOverhang(NARROW_VIEWS[i]);
    assert(overhang >= CITY_EDGE_BLEED - 0.01, "right tree passes the viewport at width " + NARROW_VIEWS[i]);
    assert(overhang < 64, "right tree stays on the cut building at width " + NARROW_VIEWS[i]);
  }
  const leftPlate = CityMapLayoutUtils.findCityNode(CityMapLayoutUtils.buildCityMapLayout(null, null, null, { viewW: 590, viewH: 1280 }), "spr_map_bg1_1");
  assert(leftPlate !== null && leftPlate.x === 0 && leftPlate.ax === 0, "left foreground plate stays on the content left");
  assert(chrome.includes("home/ui/main-scene-lang_lbl-fetters-unlock"), "chrome keeps the VIP caption");
  assert(Math.abs(TAB_SELECTED_SCALE - 1.5) < 1e-6, "selected tab matches MainSceneCtr 1.5x checked size");
  assert(CityTabUtils.tabVisualScale(true) > CityTabUtils.tabVisualScale(false) * 1.2 && CityTabUtils.tabVisualScale(false) === 1, "only the selected tab grows");
  assert(chrome.indexOf('setCityTabSelected(button, state === "selected")') >= 0, "new chrome scales the selected tab");
  assert(chrome.indexOf("tabPaintState") >= 0, "new chrome keeps a single selected tab");
  assert(chrome.indexOf("layoutCityTab") >= 0, "new chrome keeps the selected scale after fit");
}

/** 核对视差底板、特效和入口仍由预制体绑定，入口绘制在地图之后。 */
function checkHubPrefab(): void {
  const uuid = metaUuid("client/assets/scripts/features/city/ui/CityHubView.ts.meta");
  const data = loadPrefab("client/assets/bundles/module/home/prefabs/CityHubView.prefab");
  const comp = component(data, classId(uuid)) as {
    node?: { __id__?: number };
    parallax?: { __id__?: number };
    mapNodes?: { __id__?: number }[];
    spots?: { __id__?: number }[];
    effects?: { __id__?: number }[];
    btnMainline?: { __id__?: number };
  };
  assert(nodeName(data, comp.parallax) === "CityParallax", "parallax is bound");
  const maps = (comp.mapNodes || []).map((ref) => nodeName(data, ref));
  const need = ["CityParallax", "spr_map_bg1", "spr_map_bg2", "spr_map_bg1_1", "spr_map_bg1_2"];
  for (let i = 0; i < need.length; i++) assert(maps.indexOf(need[i]) >= 0, "map node bound " + need[i]);
  const spots = (comp.spots || []).map((ref) => nodeName(data, ref));
  assert(spots.indexOf("spot-main_summon") >= 0, "summon building is bound");
  const summon = (comp.spots || []).find(ref => nodeName(data, ref) === "spot-main_summon");
  checkRedDotNode(data, nodeAt(data, summon));
  assert(spots.indexOf("spot-main_smith_shop") >= 0, "smith building is bound");
  for (const ref of comp.spots || []) {
    assert(parentName(data, ref) === "BuildingEntries", "building is rendered in the entrance layer: " + nodeName(data, ref));
  }
  const layers = nodeAt(data, comp.node)._children?.map((ref) => nodeName(data, ref)) || [];
  const entries = layers.indexOf("BuildingEntries");
  assert(entries > layers.indexOf("CityParallax") && entries < layers.indexOf("BtnMainline"),
    "entrances render above the map and below the mainline button");
  assert(nodeName(data, comp.btnMainline) === "BtnMainline", "mainline button is bound");
  assert((comp.effects || []).length >= 1, "city effects are bound");
}

/** 入口绘制层固定图标比例，位置仍以配置指定的近景或远景图层为准。 */
function checkEntryLayout(): void {
  const positions = { main: [
    { idx: 1, atom: "main_shop", zorder: 2, x: 100, y: 120 },
    { idx: 2, atom: "main_summon", zorder: 3, x: 300, y: 420 },
  ] };
  for (const viewH of [720, 1280, 1440]) {
    const [shop, summon] = CityMapLayoutUtils.buildCityMapLayout(positions, null, null, { viewW: 640, viewH }).buildings;
    assert(shop.parent === "spr_map_bg2" && shop.x === 100 && shop.y === 120, "shop follows its configured layer");
    assert(summon.parent === "spr_map_bg3" && summon.x === 300 && summon.y === 420, "summon follows its configured layer");
    assert(shop.scale === 0.9 && summon.scale === 0.9, "entrances keep their on-screen size as the map scales");
  }
}

function checkChromePrefab(): void {
  const uuid = metaUuid("client/assets/scripts/features/city/ui/CityChromeView.ts.meta");
  const data = loadPrefab("client/assets/bundles/module/home/prefabs/CityChromeView.prefab");
  const comp = component(data, classId(uuid)) as { [key: string]: { __id__?: number } | { __id__?: number }[] };
  const one = (key: string, name: string) => {
    const ref = comp[key];
    if (!ref || Array.isArray(ref)) throw new Error(key + " 不是单节点");
    assert(nodeName(data, ref) === name, key + " bound to " + name);
  };
  one("lblName", "LblName");
  one("goldValue", "Value");
  one("gemValue", "Value");
  one("powerValue", "Value");
  const gold = comp.goldValue;
  const gem = comp.gemValue;
  const power = comp.powerValue;
  const bottom = comp.bottomBg;
  if (!gold || Array.isArray(gold) || !gem || Array.isArray(gem) || !power || Array.isArray(power) || !bottom || Array.isArray(bottom)) {
    throw new Error("chrome value refs missing");
  }
  assert(parentName(data, gold) === "CurrencyGold", "gold value sits under CurrencyGold");
  assert(parentName(data, gem) === "CurrencyGem", "gem value sits under CurrencyGem");
  assert(parentName(data, power) === "PowerSlot", "power value sits under PowerSlot");
  assert(parentName(data, bottom) === "BottomBar", "bottom pad targets BottomBar/Bg");
  one("avatar", "Avatar");
  one("actGroup", "ActGroup");
  one("utilityRow", "UtilityRow");
  one("bottomBg", "Bg");
  one("tabCity", "TabCity");
  one("tabFetter", "TabFetter");
  for (const key of ["tabCity", "tabHero", "tabBag", "tabBattle", "tabDungeon"]) {
    const ref = comp[key];
    assert(ref && !Array.isArray(ref), `${key} 绑定红点入口`);
    checkRedDotNode(data, nodeAt(data, ref as { __id__?: number }));
  }
  one("btnMail", "BtnMail");
  const activity = comp.activityButtons;
  if (!Array.isArray(activity)) throw new Error("activity buttons missing");
  assert(activity.length === 8, "eight activity buttons");
  const names = activity.map((ref) => nodeName(data, ref));
  assert(names.indexOf("ActRecommend") >= 0 && names.indexOf("BtnActExpand") >= 0, "activity row is bound");
  const shell = "c4e8aHSe2NOkI8Vai2cC0fj";
  const text = read("client/assets/bundles/module/home/prefabs/CityChromeView.prefab");
  assert(text.split(shell).length === 2, "CityChromeShell class id stays once");
}

/** 导航立即切换页面，底栏仍只保留最后一个选中按钮。 */
function checkTabSelection(): void {
  const paint = CityTabUtils.tabPaintState(["selected", "selected", "open", "locked"]);
  assert(paint.join(",") === "open,selected,open,locked");
}
/** 宽屏只增加导航间距，选中图标不能越长越高而挡住主线挑战按钮。 */
function checkWideTabSize(): void {
  const base = CityTabUtils.cityTabLayout(640, 3, true), wide = CityTabUtils.cityTabLayout(960, 3, true);
  assert(wide.scale === base.scale && wide.y === base.y, "宽屏选中图标保持默认大小和高度");
  assert(CityTabUtils.cityTabLayout(360, 3, true).scale < base.scale, "窄屏仍按可用宽度缩小");
  assert(CityTabUtils.cityTabLayout(960, 6, false).x > CityTabUtils.cityTabLayout(640, 6, false).x, "宽屏按钮间距仍展开");
}

/** 用真实顶底栏和地图订阅验证汇总、锁态切换、关闭解绑和复开同步。 */
function checkRedDotLifecycle(): void {
  const root = new Node("CityChromeFixture");
  const chrome = root.addComponent(CityChromeView);
  const city = new Node("TabCity");
  const dungeon = new Node("TabDungeon");
  const cityDot = new Node("RedDot");
  const dungeonDot = new Node("RedDot");
  const dungeonLock = new Node("Lock");
  cityDot.parent = city;
  dungeonDot.parent = dungeon;
  dungeonLock.parent = dungeon;
  Object.assign(chrome, { started: true, tabs: { city, dungeon } });

  const hub = new Node("CityHubFixture").addComponent(CityHubView);
  const summon = new Node("spot-main_summon");
  const summonDot = new Node("RedDot");
  summonDot.parent = summon;
  Object.assign(hub, { started: true, views: new Map([[summon.name, summon]]) });
  let open = false;
  hub.runOpen({
    onAtom: () => {},
    onMainline: () => {},
    query: { level: () => 1, openDay: () => 0, db: () => open ? { opencondition: [], systemGate: [] } : null },
  });
  const dots = RedDotManager.instance;
  try {
    chrome.runOpen();
    dots.set(GameRedDotKey.SUMMON + ".test", true);
    assert(cityDot.active && !summonDot.active, "主城汇总亮起，锁定中的法阵挂点保持隐藏");
    open = true;
    hub.refreshLocks();
    assert(summonDot.active, "已亮条件在入口开放后立即显示");

    dots.set(GameRedDotKey.DUNGEON + ".test", true);
    assert(!dungeonDot.active, "锁标遮断聚合红点");
    chrome.setTabs([{ id: "dungeon", text: "副本", state: "open" }]);
    assert(dungeonDot.active && !dungeonLock.active, "入口开放后复用当前聚合值");

    chrome.runClose();
    hub.runClose();
    dots.reset();
    assert(cityDot.active && summonDot.active, "关闭后已退订，不再刷旧视图");
    chrome.runOpen();
    assert(!cityDot.active && !dungeonDot.active, "复开立即读取当前状态");
  } finally {
    chrome.runDispose();
    hub.runDispose();
    dots.reset();
  }
}

checkFramework(); checkHubPrefab(); checkEntryLayout(); checkChromePrefab(); checkSources(); checkTabSelection(); checkWideTabSize(); checkRedDotLifecycle(); console.log("city-view passed: bindings, entrance layering, red dot lifecycle, framework isolation and tab layout");
