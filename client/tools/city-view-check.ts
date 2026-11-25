/**
 * 主城入口回归。使用引擎替身核对预制体绑定、红点状态和开关生命周期。
 */
import { Button, Node, Prefab, UITransform } from "cc";
import { readFileSync } from "fs";

import { join } from "path";

import { CityMapLayoutUtils, CITY_EDGE_BLEED } from "../assets/scripts/features/city/ui/CityMapLayoutUtils";
import { CityHubView } from "../assets/scripts/features/city/ui/CityHubView";
import { GameRedDotKey } from "../assets/scripts/features/common/utils/GameRedDotKey";
import { RedDotManager } from "../assets/scripts/framework/ui/RedDotManager";
import { PrefabLoader } from "../assets/scripts/framework/assets/PrefabLoader";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";

import { CityTabUtils } from "../assets/scripts/features/city/utils/CityTabUtils";

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
  _lpos?: { x: number; y: number; z: number };
  _contentSize?: { width: number; height: number };
  _anchorPoint?: { x: number; y: number };
  data?: { __id__?: number };
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

/** 检查红点挂点保留法阵旧尺寸和偏移，公共预制体提供图案。 */
function checkRedDotAnchor(data: PrefabObj[], target: PrefabObj, x: number): void {
  const children = target._children || [];
  const anchors = children.map(ref => nodeAt(data, ref)).filter(node => node._name === "RedDotAnchor");
  assert(anchors.length === 1 && anchors[0]._active === true, `${target._name} 恰有一个红点定位节点`);
  const anchor = anchors[0];
  assert(anchor._lpos?.x === x && anchor._lpos?.y === 33, `${target._name} 保留原红点位置`);
  const transforms = anchor._components?.map(ref => data[ref.__id__!]) ?? [];
  assert(transforms.length === 1 && transforms[0].__type__ === "cc.UITransform", `${target._name} 使用公共红点`);
  assert(transforms[0]._contentSize?.width === 28 && transforms[0]._contentSize?.height === 28, `${target._name} 保留原红点尺寸`);
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
  assert(!/setPosition|setScale|setContentSize|addComponent|new Node|layoutCityTab|prepareCityTab/.test(chrome),
    "主城顶底栏脚本不创建、重排或缩放固定控件");
  assert(chrome.includes("ViewportLayoutUtils.fitVisibleRoot"), "仅桥接根视口，子布局交给 Widget 和 ViewportScale");
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
  assert(chrome.includes("tabPaintState"), "new chrome keeps a single selected tab");
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
  for (const [entrance, x] of [["spot-main_summon", 55], ["spot-main_hero_make", 70]] as const) {
    const button = (comp.spots || []).find(ref => nodeName(data, ref) === entrance);
    checkRedDotAnchor(data, nodeAt(data, button), x);
  }
  assert(spots.indexOf("spot-main_smith_shop") >= 0, "smith building is bound");
  for (const ref of comp.spots || []) {
    assert(parentName(data, ref) === "BuildingEntries", "building is rendered in the entrance layer: " + nodeName(data, ref));
  }
  const layers = nodeAt(data, comp.node)._children?.map((ref) => nodeName(data, ref)) || [];
  const entries = layers.indexOf("BuildingEntries");
  assert(entries > layers.indexOf("CityParallax") && entries < layers.indexOf("BtnMainline"),
    "entrances render above the map and below the mainline button");
  assert(nodeName(data, comp.btnMainline) === "BtnMainline", "mainline button is bound");
  assert(nodeAt(data, comp.btnMainline)._active === false, "日服主城从底栏战斗进入主线，隐藏地图中额外的重复按钮");
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

/** 检查顶栏布局和导航引用，红点样式统一由公共预制体提供。 */
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
  one("avatarFace", "Face");
  one("avatarBorder", "Border");
  one("lblLevel", "LblLevel");
  one("levelBg", "LevelBg");
  const componentOf = (saved: PrefabObj, type: string) => saved._components?.map(ref => data[ref.__id__!])
    .find(value => value.__type__ === type);
  const transformOf = (saved: PrefabObj) => componentOf(saved, "cc.UITransform");
  const childOf = (saved: PrefabObj, name: string) => {
    const child = saved._children?.map(ref => nodeAt(data, ref)).find(value => value._name === name);
    assert(child, `${saved._name} 的 ${name} 保存于预制体`);
    return child!;
  };
  const namedNode = (name: string) => {
    const saved = data.find(value => value.__type__ === "cc.Node" && value._name === name);
    if (!saved) {
      throw new Error(`顶栏缺少 ${name}`);
    }
    return saved;
  };
  const rootNode = namedNode("CityChromeView");
  const design = transformOf(rootNode)?._contentSize;
  assert(design?.width === 640 && design.height === 1280, "主城常驻层使用项目的 640×1280 设计尺寸");
  const flags = (node: PrefabObj) => (componentOf(node, "cc.Widget") as (PrefabObj & { _alignFlags: number }))?._alignFlags;
  const topDock = childOf(rootNode, "TopDock");
  const bottomDock = childOf(rootNode, "BottomDock");
  const floatingDock = childOf(rootNode, "FloatingDock");
  assert(flags(topDock) === (1 | 16) && flags(bottomDock) === (4 | 16) && flags(floatingDock) === (4 | 16),
    "顶底栏和聊天默认位置通过 Widget 贴住实际屏幕边缘");
  assert(nodeAt(data, rootNode._children!.at(-1)!) === floatingDock, "浮动聊天在顶底栏上方绘制并可重新抓取");
  const scaleType = classId(metaUuid("client/assets/scripts/framework/ui/ViewportScale.ts.meta"));
  const scales = rootNode._components?.map(ref => data[ref.__id__!]).filter(row => row.__type__ === scaleType) as
    Array<PrefabObj & { target: { __id__: number }; designWidth: number; maxScale: number }>;
  assert(scales?.length === 3 && scales.every(row => row.designWidth === 640 && row.maxScale === 1)
    && scales.map(row => nodeName(data, row.target)).join() === "TopDock,BottomDock,FloatingDock",
    "缩放整体对齐，不逐个重排控件");
  const header = childOf(topDock, "TopBar");
  const bar = childOf(bottomDock, "BottomBar");
  assert(transformOf(bar)?._contentSize?.width === 640 && transformOf(header)?._contentSize?.width === 640,
    "顶底栏设计宽度统一为 640");
  const avatar = childOf(header, "Avatar");
  const name = childOf(header, "LblName");
  const powerSlot = childOf(header, "PowerSlot");
  const halfWidth = (node: PrefabObj) => transformOf(node)!._contentSize!.width / 2;
  assert(avatar._lpos!.x - halfWidth(avatar) >= -320
    && avatar._lpos!.x + halfWidth(avatar) < name._lpos!.x - halfWidth(name), "头像位于可见范围且不叠昵称");
  assert(name._lpos!.x + halfWidth(name) < powerSlot._lpos!.x - halfWidth(powerSlot), "昵称不挡战力栏");
  const levelPos = namedNode("LblLevel")._lpos!;
  assert(levelPos.x === avatar._lpos!.x && levelPos.y === namedNode("LevelBg")._lpos!.y, "等级底牌、文字与头像对齐");
  const label = namedNode("LblLevel")._components?.map(ref => data[ref.__id__!])
    .find(value => value.__type__ === "cc.Label") as (PrefabObj & { _fontSize?: number }) | undefined;
  assert(label?._fontSize === 17, "等级字号保留放大后的 17 尺寸");
  one("actGroup", "ActGroup");
  one("utilityRow", "UtilityRow");
  one("bottomBg", "Bg");
  one("tabCity", "TabCity");
  one("tabFetter", "TabFetter");
  const selectionGroup = childOf(bar, "SelectedTabArtwork");
  const selected = comp.selectedTabs;
  assert(Array.isArray(selected) && selected.length === 7, "七个页签都有独立的预制选中外观");
  const keys = ["tabCity", "tabHero", "tabBag", "tabBattle", "tabDungeon", "tabClan", "tabFetter"];
  for (const [index, key] of keys.entries()) {
    const ref = comp[key];
    assert(ref && !Array.isArray(ref), `${key} 绑定底栏入口`);
    const tab = nodeAt(data, ref as { __id__?: number });
    const normal = childOf(tab, "Default");
    const lock = childOf(tab, "Lock");
    assert(tab._children!.indexOf(tab._children!.find(link => nodeAt(data, link) === normal)!)
      < tab._children!.indexOf(tab._children!.find(link => nodeAt(data, link) === lock)!), "锁标在普通图案之后绘制");
    childOf(lock, "Lv");
    const picked = nodeAt(data, (selected as { __id__: number }[])[index]);
    assert(parentName(data, (selected as { __id__: number }[])[index]) === selectionGroup._name, "选中图案绘制于共同前层");
    assert(!componentOf(picked, "cc.Button") && picked._lpos!.x === tab._lpos!.x
      && picked._lpos!.y > tab._lpos!.y && halfWidth(picked) > halfWidth(normal), `${key} 选中图案大且高，点击区不变`);
    assert(picked._active === (index === 0) && normal._active === (index !== 0), `${key} 初始只显示一种外观`);
    for (const artwork of [normal, picked]) {
      childOf(artwork, "RedDotAnchor");
      const caption = childOf(artwork, "Caption");
      const sprite = componentOf(caption, "cc.Sprite");
      assert(sprite?._spriteFrame?.__uuid__, "底栏标题图已经序列化，不运行时创建");
    }
  }
  one("btnMail", "BtnMail");
  const activity = comp.activityButtons;
  if (!Array.isArray(activity)) throw new Error("activity buttons missing");
  assert(activity.length >= 12 && activity.every(ref => componentOf(nodeAt(data, ref), "cc.Button")), "日服活动入口分组使用现有图与按钮");
  assert(parentName(data, comp.actGroup as { __id__: number }) === "TopDock"
    && parentName(data, comp.utilityRow as { __id__: number }) === "BottomDock", "主城活动和快捷行分别跟随各自屏幕边缘");
  one("btnChat", "BtnChat");
  const chat = childOf(floatingDock, "BtnChat");
  assert(chat._lpos!.x === 274 && chat._lpos!.y === 535, "聊天初始位置仍由预制体保存");
  assert(Array.isArray(comp.shortcutButtons)
    && !comp.shortcutButtons.some(ref => nodeName(data, ref) === "BtnChat"), "聊天点击不重复走快捷入口");
  one("utilityEntries", "ShortcutArtwork");
  one("utilityFoldAnchor", "UtilityFoldAnchor");
  const utilityRow = nodeAt(data, comp.utilityRow as { __id__: number });
  const foldItems = childOf(utilityRow, "ShortcutArtwork");
  const plus = childOf(utilityRow, "BtnMore");
  const foldAnchor = childOf(foldItems, "UtilityFoldAnchor");
  assert(foldAnchor._lpos!.x + foldItems._lpos!.x === plus._lpos!.x
    && foldAnchor._lpos!.y + foldItems._lpos!.y === plus._lpos!.y, "工具收拢位置与加号中心重合");
  assert(nodeName(data, utilityRow._children![utilityRow._children!.length - 1]) === "BtnMore", "加号绘制在移动工具上方");
  one("btnRank", "BtnRank");
  assert(childOf(foldItems, "BtnRank")._lpos!.x < plus._lpos!.x
    && childOf(foldItems, "BtnRank")._lpos!.x > childOf(foldItems, "BtnMail")._lpos!.x,
  "排行位于加号左边第一个");
  childOf(foldItems, "BtnDailyTask");
  childOf(utilityRow, "BtnHeroRecommend");
  const shell = "c4e8aHSe2NOkI8Vai2cC0fj";
  const text = read("client/assets/bundles/module/home/prefabs/CityChromeView.prefab");
  assert(text.split(shell).length === 2, "CityChromeShell class id stays once");
}

/** 公共模板保留旧底栏红点的位置、尺寸、锚点和原贴图。 */
function checkSharedRedDotPrefab(): void {
    const data = loadPrefab("client/assets/bundles/module/common/prefabs/RedDot.prefab");
    const root = nodeAt(data, component(data, "cc.Prefab").data);
    assert(root._name === "RedDot" && root._active === false, "公共红点默认隐藏");
    const position = root._lpos;
    assert(position?.x === 28 && position.y === 28 && position.z === 0, "公共红点保留导航按钮内原相对坐标");
    const transform = component(data, "cc.UITransform");
    assert(transform._contentSize?.width === 28 && transform._contentSize.height === 28, "公共红点保留原尺寸");
    assert(transform._anchorPoint?.x === 0.5 && transform._anchorPoint.y === 0.5, "公共红点保留居中锚点");
    const source = metaUuid("client/assets/bundles/module/common/ui/other_spr-reddot-1.png.meta");
    assert(component(data, "cc.Sprite")._spriteFrame?.__uuid__ === `${source}@f9941`, "公共红点使用原贴图");
}

/** 导航立即切换页面，底栏仍只保留最后一个选中按钮。 */
function checkTabSelection(): void {
  const paint = CityTabUtils.tabPaintState(["selected", "selected", "open", "locked"]);
  assert(paint.join(",") === "open,selected,open,locked");
}
/** 顶底栏状态由 home-presentation 验证；此处检查地图上的两个法阵挂点。 */
async function checkRedDotLifecycle(): Promise<void> {
  const prefab = Object.assign(new Prefab(), { _instantiate: () => {
    const node = new Node("RedDot");
    node.addComponent(UITransform).setContentSize(28, 28);
    return node;
  } });
  const loadPrefab = PrefabLoader.loadPrefab;
  PrefabLoader.loadPrefab = async () => prefab;

  const hub = new Node("CityHubFixture").addComponent(CityHubView);
  const summon = new Node("spot-main_summon");
  const summonAnchor = new Node("RedDotAnchor");
  summonAnchor.parent = summon;
  summonAnchor.addComponent(UITransform).setContentSize(28, 28);
  const creation = new Node("spot-main_hero_make");
  const creationAnchor = new Node("RedDotAnchor");
  creationAnchor.parent = creation;
  creationAnchor.addComponent(UITransform).setContentSize(28, 28);
  Object.assign(hub, {
    started: true,
    views: new Map([[summon.name, summon], [creation.name, creation]]),
  });
  let open = false;
  hub.runOpen({
    onAtom: () => {},
    onMainline: () => {},
    query: { level: () => 1, openDay: () => 0, db: () => open ? { opencondition: [], systemGate: [] } : null },
  });
  const dots = RedDotManager.instance;
  try {
    dots.set(GameRedDotKey.SUMMON + ".test", true);
    await new Promise<void>(resolve => setImmediate(resolve));
    assert(!summonAnchor.getChildByName("RedDot"), "锁定中的法阵不挂红点");
    open = true;
    hub.refreshLocks();
    await new Promise<void>(resolve => setImmediate(resolve));
    assert(summonAnchor.getChildByName("RedDot")?.active, "已亮条件在入口开放后显示");
    dots.set(GameRedDotKey.HERO_CREATION, true);
    dots.set(GameRedDotKey.SUMMON + ".test", false);
    await new Promise<void>(resolve => setImmediate(resolve));
    assert(creationAnchor.getChildByName("RedDot")?.active && summonAnchor.getChildByName("RedDot")?.active === false,
      "两个法阵分别使用各自的条件，不共用显示状态");

    hub.runClose();
    dots.reset();
    assert(!summonAnchor.getChildByName("RedDot") && !creationAnchor.getChildByName("RedDot"), "关闭时释放法阵红点");
  } finally {
    hub.runDispose();
    dots.reset();
    PrefabLoader.loadPrefab = loadPrefab;
  }
}

/** 模拟引擎按钮截断冒泡，检查拖动不会误开窗，下一次点击照常生效。 */
function checkDragThenTap(): void {
  const map = new Node("CityGestureFixture");
  const hub = map.addComponent(CityHubView);
  const summon = new Node("spot-main_summon");
  const mainline = new Node("BtnMainline");
  for (const node of [summon, mainline]) {
    node.parent = map;
    node.addComponent(Button);
  }
  const clicks: string[] = [];
  Object.assign(hub, {
    layout: CityMapLayoutUtils.buildCityMapLayout({ main: [{ atom: "main_summon", x: 0, y: 0, zorder: 2 }] }, null, null),
    views: new Map([[summon.name, summon]]),
    btnMainline: mainline,
    args: { onAtom: (atom: string) => clicks.push(atom), onMainline: () => clicks.push("mainline") },
  });

  const listeners = new Map<string, { callback: (...args: unknown[]) => void; owner: unknown; capture: boolean }>();
  map.on = (type, callback, owner, capture = false) => listeners.set(type, { callback, owner, capture });
  map.off = (type, callback, owner, capture = false) => {
    const registered = listeners.get(type);
    if (registered && registered.callback === callback && registered.owner === owner && registered.capture === capture) {
      listeners.delete(type);
    }
  };
  const hooks = hub as unknown as { bindSpots(): void; bindMainline(): void; bindDrag(): void };
  hooks.bindSpots();
  hooks.bindMainline();
  hooks.bindDrag();

  const { TOUCH_START, TOUCH_MOVE, TOUCH_END, TOUCH_CANCEL } = Node.EventType;
  // 子 Button 会在处理开始、移动和结束时停止冒泡；捕获监听和地图自身触摸不受影响。
  const touch = (target: Node, type: string, dx = 0): void => {
    const listener = listeners.get(type);
    if (listener && (listener.capture || target === map || type === TOUCH_CANCEL)) {
      listener.callback.call(listener.owner, { getUIDelta: () => ({ x: dx }) });
    }
    if (target !== map && type === TOUCH_END) {
      target.emit(Button.EventType.CLICK);
    }
  };
  touch(summon, TOUCH_START);
  touch(summon, TOUCH_END);
  assert(clicks.join() === "main_summon", "地图刚打开时可点建筑入口");
  for (const dx of [-500, 500]) {
    touch(map, TOUCH_START);
    touch(map, TOUCH_MOVE, dx);
    touch(map, TOUCH_END);
  }
  touch(summon, TOUCH_START);
  touch(summon, TOUCH_END);
  assert(clicks.length === 2, "拖出又拖回后，新触摸不继承上一轮拖动标记");

  touch(summon, TOUCH_START);
  touch(summon, TOUCH_MOVE, 7);
  touch(summon, TOUCH_MOVE, 7);
  touch(summon, TOUCH_END);
  assert(clicks.length === 2, "从建筑按钮起拖且累计越过阈值时，不误触建筑入口");
  touch(mainline, TOUCH_START);
  touch(mainline, TOUCH_END);
  assert(clicks.join() === "main_summon,main_summon,mainline", "新的主线点击不受上一次拖动影响");

  touch(summon, TOUCH_START);
  touch(summon, TOUCH_MOVE, -100);
  touch(summon, TOUCH_CANCEL);
  assert(clicks.length === 3, "取消手势不打开入口");
  hub.onClose();
  assert(listeners.size === 0, "关闭地图时按注册阶段清理全部触摸监听");
}

/** 先检查预制绑定与样式，再复验拖动点击和动态红点生命周期。 */
async function main(): Promise<void> {
    checkFramework();
    checkHubPrefab();
    checkEntryLayout();
    checkChromePrefab();
    checkSharedRedDotPrefab();
    checkSources();
    checkTabSelection();
    checkDragThenTap();
    await checkRedDotLifecycle();
    console.log("city-view passed: bindings, entrance layering, drag then tap, red dot lifecycle, framework isolation and tab layout");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
