/** 英雄页面专项：验证真实名册、页面生命周期、资源Bundle路由与异步格子复用，不连接游戏服务器。 */
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";
import { RedDotFixture } from "./RedDotFixture";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";

import { FormationView } from "../assets/scripts/features/hero/ui/FormationView";
import { HeroInfoView } from "../assets/scripts/features/hero/ui/HeroInfoView";
import { HeroIllustrationView } from "../assets/scripts/features/hero/ui/HeroIllustrationView";
import { HeroEvolutionCatalogView } from "../assets/scripts/features/hero/ui/HeroEvolutionCatalogView";
import { HeroLevelController } from "../assets/scripts/features/hero/HeroLevelController";
import { HeroLevelEvent } from "../assets/scripts/features/hero/utils/HeroLevelEvent";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { HeroSkillView } from "../assets/scripts/features/hero/ui/HeroSkillView";
import { HeroRosterUtils } from "../assets/scripts/features/hero/utils/HeroRosterUtils";
import { HeroGrowthDisplayUtils } from "../assets/scripts/features/hero/utils/HeroGrowthDisplayUtils";
import { HeroCreationUtils } from "../assets/scripts/features/hero/utils/HeroCreationUtils";
import { HeroStarUtils } from "../assets/scripts/features/hero/utils/HeroStarUtils";
import { HeroJewelUtils } from "../assets/scripts/features/hero/utils/HeroJewelUtils";
import { HeroPortraitUtils } from "../assets/scripts/features/hero/utils/HeroPortraitUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { HeroRosterEvent } from "../assets/scripts/features/hero/utils/HeroRosterEvent";
import { RedDotManager } from "../assets/scripts/framework/ui/RedDotManager";
import { GameRedDotKey } from "../assets/scripts/features/common/utils/GameRedDotKey";
/** 英雄模块回归：核对显式初始化、唯一状态、事件清理和异步会话隔离。 */
import { HeroRosterController } from "../assets/scripts/features/hero/HeroRosterController";
/** Display-only helpers retained for the Remake flow. */
/**
 * 英雄列表竖切的检查。不启动 Creator。
 * 核对开关、预制绑定、名册数据，以及经 UIManager 打开和关掉。
 *
 * npx --yes esbuild client/tools/hero-view-check.ts --bundle --platform=node --format=cjs --tsconfig=client/tools/tsconfig.check.json --outfile=/tmp/mxzg-hero-view-check.js && node /tmp/mxzg-hero-view-check.js
 */
import { existsSync, readFileSync } from "fs";

import { join } from "path";

import { assetManager, Button, director, Director, Label, Mask, Node, Prefab, resources, Sprite, SpriteFrame, UIOpacity, UITransform } from "cc";

import { HeroIconCellView } from "../assets/scripts/features/hero/ui/HeroIconCellView";
import { HeroCreationCellView } from "../assets/scripts/features/hero/ui/HeroCreationCellView";

import { HeroListView } from "../assets/scripts/features/hero/ui/HeroListView";

/** 行为替身的视口高度，真实布局从完整HeroListView的SuperContent与Widget读取。 */
const HERO_PORT_H = 517;
/** 当前Prefab视口宽度，避免将旧540宽的夹具与四列真实格子混用。 */
const HERO_PORT_W = 572;

import { AccountModel } from "../assets/scripts/features/account/AccountModel";

import { AccountController } from "../assets/scripts/features/account/AccountController";

import { HeroCatalog } from "../assets/scripts/features/hero/utils/HeroCatalog";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";

import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";



import type { OwnedHero } from "../assets/scripts/features/hero/data/HeroSnapshotUtils";

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
  _components?: { __id__?: number }[];
  node?: { __id__?: number };
  [key: string]: unknown;
}

function loadPrefab(path: string): PrefabObj[] {
  return JSON.parse(read(path)) as PrefabObj[];
}

function component(data: PrefabObj[], typeId: string): { index: number; comp: PrefabObj } {
  for (let i = 0; i < data.length; i++) {
    if (data[i].__type__ === typeId) return { index: i, comp: data[i] };
  }
  throw new Error("预制上没有组件 " + typeId);
}

function idOf(value: unknown): number {
  const ref = value as { __id__?: number } | null;
  if (!ref || typeof ref.__id__ !== "number") return -1;
  return ref.__id__;
}

/** 验证实际节点名称，允许 Creator 重排序列化索引。 */
function assertNode(data: PrefabObj[], comp: PrefabObj, field: string, nodeId: number, nodeName: string): void {
  const id = idOf(comp[field]);

  const node = data[id];
  assert(node && node.__type__ === "cc.Node" && node._name === nodeName, field + " 指向的不是 " + nodeName);
}

/** 验证绑定组件类型，不依赖序列化数组位置。 */
function assertComp(data: PrefabObj[], comp: PrefabObj, field: string, compId: number, typeName: string): void {
  const id = idOf(comp[field]);

  const target = data[id];
  assert(target && target.__type__ === typeName, field + " 指向的不是 " + typeName);
}

/** 校验当前真实页面结构与字段绑定；序列化索引可重排，业务节点顺序和类型仍必须正确。 */
function checkPrefab(): void {
  const viewType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroListView.ts.meta"));
  const cellType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroIconCellView.ts.meta"));
  const layer = loadPrefab("client/assets/bundles/module/hero/prefabs/HeroListView.prefab");
  const view = component(layer, viewType);
  assert((layer[1]._components || []).some((row) => row.__id__ === view.index), "HeroListLayer 根上有 HeroListView");
  assertComp(layer, view.comp, "btnHero", 38, "cc.Button");
  assert(!["btnBook", "btnDragon", "heroTitle", "bookTitle", "dragonTitle", "tabMenu"].some(key => key in view.comp),
    "纯静态标题及未开放页签不需要View脚本绑定");
  assert(!("boardRoot" in view.comp) && layer.some(row => row._name === "HeroBoard"),
    "静态HeroBoard只是容器，不再另绑列表板组件");
  assert(!("boardPrefab" in view.comp) && !("sprBg" in view.comp) && !("parchment" in view.comp),
    "完整页面直接绑定静态列表板，不再加载板子或调整旧羊皮纸");
  assert(!("cellPrefab" in view.comp), "Cell资源只在SuperContent维护");
  const background = layer.find(row => row._name === "Background")!;
  assert(background && (background._components as {__id__:number}[]).some(ref => layer[ref.__id__].__type__ === "cc.Widget"),
    "完整预制体已有四边Widget背景，不再组装PagePrefabShell");
  assert(layer.some(row => row.__type__ === "b1717x10KxEaZM0E/9VbOly"), "通过统一ViewportScale适配内容容器");
  for (const name of ["RosterTab", "CatalogTab", "DragonTab"]) {
    const node = layer.find(row => row._name === name)!;
    const title = layer.find(row => row.__type__ === "cc.Node" && row._name === "Label" && idOf(row._parent) === layer.indexOf(node))!;
    assert(uiHeight(layer, layer.indexOf(title)) === 32, name + "页签文字在Prefab保存可读高度");
    assert(node._active === (name !== "DragonTab"), "名册与图鉴页签默认显示，圣龙仅在图鉴模式展示");
  }
  assertComp(layer, view.comp, "catalogTab", 261, "cc.Button");
  assertComp(layer, view.comp, "evolutionCatalogButton", 172, "cc.Button");
  assert((view.comp.catalogElements as unknown[]).length === 5, "图鉴绑定独立的五元素筛选");

  const boardData = layer;
  const listConfig=boardData.find((row:any)=>row.columns!==undefined) as any;
  assert(listConfig.columns===4 && listConfig.cellPrefab.__uuid__==="e7c1a4b0-6d28-4f53-9c11-2a8b7e6d5c40","SuperContent 四列及格子资源绑定");
  const board = view;
  assertComp(boardData, board.comp, "heroScroll", 119, classId(metaUuid("client/assets/scripts/framework/ui/SuperScroll.ts.meta")));
  const scroll = boardData[idOf(board.comp.heroScroll)];
  const content = boardData[idOf(scroll._content)];
  assert(content._name === "content" && boardData[idOf(content._parent)]._name === "view", "滚动内容与Mask视口保留静态层级");
  assertComp(boardData, board.comp, "emptyLabel", 139, "cc.Label");
  const emptyLabel = boardData[idOf(board.comp.emptyLabel)];
  assert(Number(emptyLabel._fontSize) >= 24 && Number(emptyLabel._lineHeight) >= 32, "空态文字在手机宽度下可读");
  assert(uiHeight(boardData, idOf(emptyLabel.node)) >= Number(emptyLabel._lineHeight) * 3,
    "错误原因和两行操作提示不能压进单行文本框后自动缩小");
  assertComp(boardData, board.comp, "capacityLabel", 88, "cc.Label");
  assert(uiHeight(boardData, idOf(scroll.node)) === HERO_PORT_H, "滚动视口延伸至容量栏上方");
  assert(uiHeight(boardData, idOf(content._parent)) === HERO_PORT_H, "view 跟滚动视口一样高");
  assert(uiHeight(boardData, idOf(scroll.node)) + 88 < uiHeight(boardData, boardData.findIndex(row => row._name === "HeroGridFrame")), "滚动视口与顶部偏移不超过装饰底板");
  const elems = board.comp.elemButtons as { __id__?: number }[];
  assert(elems.length === 6, "六个元素钮");
  for (let i = 0; i < elems.length; i++) {
    const button = boardData[elems[i].__id__!];
    assert(button.__type__ === "cc.Button", "第" + i + "个元素仍绑定Button");
  }

  const cellData = loadPrefab("client/assets/bundles/module/hero/prefabs/HeroIconCellView.prefab");
  // 初始星全隐藏时旧Layout曾保存-1宽；静态尺寸须合法并能容纳五星，运行时仍由原Layout更新。
  for (const transform of cellData.filter(row => row.__type__ === "cc.UITransform")) {
    assert(transform._contentSize.width >= 0 && transform._contentSize.height >= 0,
      "英雄格所有静态UITransform保持非负尺寸");
  }
  const starGroup = cellData.find(row => row._name === "Stars")!;
  const starParts = starGroup._components.map((row: { __id__: number }) => cellData[row.__id__]);
  const starTransform = starParts.find((row: PrefabObj) => row.__type__ === "cc.UITransform")!;
  const starLayout = starParts.find((row: PrefabObj) => row.__type__ === "cc.Layout")!;
  const fullStarWidth = starGroup._children.reduce((width: number, child: { __id__: number }) => {
    const node = cellData[child.__id__];
    const transform = node._components.map((row: { __id__: number }) => cellData[row.__id__])
      .find((row: PrefabObj) => row.__type__ === "cc.UITransform")!;
    return width + transform._contentSize.width * (starLayout._affectedByScale ? node._lscale.x : 1);
  }, starLayout._paddingLeft + starLayout._paddingRight)
    + Math.max(0, starGroup._children.length - 1) * starLayout._spacingX;
  assert(starTransform._contentSize.width === fullStarWidth, "星容器初始宽度等于原五子星宽、缩放、边距及间距");
  const cell = component(cellData, cellType);
  assertNode(cellData, cell.comp, "face", 19, "spr_face");
  const faceScale = cellData[idOf(cell.comp.face)]._lscale;
  assert(faceScale.x === 0.9 && faceScale.y === 0.9, "名册头像按 0.9 缩放，不缩小品质框和等级");
  assertComp(cellData, cell.comp, "nameLabel", 29, "cc.Label");
  assertNode(cellData, cell.comp, "elem", 31, "spr_elem");
  assertComp(cellData, cell.comp, "levelLabel", 71, "cc.Label");
  assertNode(cellData, cell.comp, "lock", 73, "spr_lock");
  assertNode(cellData, cell.comp, "battle", 79, "spr_battle");
  const level = cellData[idOf(cell.comp.levelLabel)];
  const levelNode = cellData[idOf(level.node)];
  assert(levelNode._lpos.x > 0 && levelNode._lpos.y > 0 && level._enableOutline === true,
    "名册等级位于头像右上角，白字保留描边");
  const rosterBackground = cellData[idOf(cell.comp.rosterFrame)];
  assert(cellData[idOf(rosterBackground.node)]._name === "spr_bg", "品质框绑定头像下方底图");
  for (const [field, resource, count] of [
    ["rosterFrames", "other_rare", 6], ["rosterStarFrames", "other_star", 2],
  ] as const) {
    const frames = cell.comp[field] as { __uuid__: string }[];
    assert(frames.length === count && frames.every((frame, index) => frame.__uuid__
      === metaUuid(`client/assets/bundles/module/common/ui/${resource}-${index}.png.meta`) + "@f9941"),
      "名册使用原版品质框及亮色星级资源");
  }
  const creationData = loadPrefab("client/assets/bundles/module/hero/prefabs/HeroCreationCellView.prefab");
  const creationType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroCreationCellView.ts.meta"));
  for (const [data, cellTypeId] of [[cellData, cellType], [creationData, creationType]] as const) {
    const binding = component(data, cellTypeId).comp;
    const anchor = data[idOf(binding.reminderAnchor)];
    assert(anchor?._name === "ReminderAnchor" && anchor._active === true, "格子仅保留可用红点锚点");
    const components = anchor._components.map((row: { __id__: number }) => data[row.__id__]);
    const ui = components.find((row: PrefabObj) => row.__type__ === "cc.UITransform");
    assert(components.length === 1 && ui?._contentSize.width === 28 && ui._contentSize.height === 28
      && anchor._lpos.x === 55.8 && anchor._lpos.y === 55.8, "英雄格留存原尺寸和偏移，图片来自公共预制体");
  }
  const stars = cell.comp.stars as { __id__?: number }[];
  assert(stars.map(row => cellData[row.__id__!]?._name).join(",") === "star0,star1,star2,star3,star4",
    "五颗星按业务节点star0到star4绑定，不依赖Creator序列化数组索引");

  const infoType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroInfoView.ts.meta"));
  const infoData = loadPrefab("client/assets/bundles/module/hero/prefabs/HeroInfoView.prefab");
  const info = component(infoData, infoType);
  assert((infoData[1]._components || []).some((row) => row.__id__ === info.index), "HeroInfoLayer 根上有 HeroInfoView");
  assert(infoData[idOf(info.comp.portrait)]._name === "node_equip", "立绘挂在 node_equip");
  assert(!("talk" in info.comp) && !("hitMenus" in info.comp), "只读详情不保留无用旧布局与养成台词绑定");
  assert(infoData.some(row => row._name === "Background"), "详情背景保存在完整Prefab");
  const infoText = JSON.stringify(infoData);
  assert(infoText.indexOf("图鉴") >= 0, "详情底栏有图鉴");
  assert(infoText.indexOf("一键穿装") >= 0 && infoText.indexOf("一键卸下") >= 0 && infoText.indexOf("升级") >= 0,
    "现在的详情保留一键穿装、一键卸下和普通升级");
  assert(infoText.indexOf("设置") >= 0 && infoText.indexOf("展开") >= 0, "详情有设置和展开");
}

function uiHeight(data: PrefabObj[], nodeId: number): number {
  const node = data[nodeId];
  const comps = (node && node._components) || [];
  for (let i = 0; i < comps.length; i++) {
    const comp = data[comps[i].__id__ || -1];
    const size = comp && (comp._contentSize as { height?: number } | undefined);
    if (comp && comp.__type__ === "cc.UITransform" && size && typeof size.height === "number") return size.height;
  }
  return -1;
}

function sized(name: string, width: number, height: number): Node {
  const node = new Node(name);
  node.addComponent(UITransform).setContentSize(width, height);
  return node;
}

function labelOn(node: Node, text: string): Label {
  const label = node.addComponent(Label);
  label.string = text;
  return label;
}

function buttonOn(name: string): Button {
  const node = new Node(name);
  node.addComponent(Sprite);
  return node.addComponent(Button);
}

function fakePrefab(build: (node: Node) => void): Prefab {
  const prefab = new Prefab() as Prefab & { _instantiate: () => Node };
  prefab._instantiate = () => {
    const node = new Node("inst");
    build(node);
    return node;
  };
  (prefab as any).data=prefab._instantiate();
  return prefab;
}

/** 根尺寸与缩放读取当前真实Cell，内部字段只替身显示绑定，避免旧夹具134高冒充现在124高。 */
function makeCell(node: Node, view = HeroIconCellView): void {
  node.name = "HeroIconCellView";
  const source = loadPrefab("client/assets/bundles/module/hero/prefabs/HeroIconCellView.prefab");
  const root = source[idOf(source[0].data)];
  const transform = (root._components || []).map(ref => source[ref.__id__!])
    .find(row => row.__type__ === "cc.UITransform")!;
  const size = transform._contentSize as { width: number; height: number };
  const scale = root._lscale as { x: number; y: number; z: number };
  node.addComponent(UITransform).setContentSize(size.width, size.height);
  node.setScale(scale.x, scale.y, scale.z);
  const cell = node.addComponent(view);
  cell.button = node.addComponent(Button);
  cell.face = new Node("spr_face");
  cell.face.addComponent(Sprite);
  cell.face.parent = node;
  cell.nameLabel = labelOn(new Node("lbl_name"), "");
  if (cell.nameLabel.node) cell.nameLabel.node.parent = node;
  cell.elem = new Node("spr_elem");
  cell.elem.addComponent(Sprite);
  cell.elem.parent = node;
  cell.stars = [];
  for (let i = 0; i < 5; i++) {
    const star = new Node("star" + i);
    star.addComponent(Sprite);
    star.parent = node;
    cell.stars.push(star);
  }
  cell.levelLabel = labelOn(new Node("lbl_level"), "");
  if (cell.levelLabel.node) cell.levelLabel.node.parent = node;
  cell.lock = new Node("spr_lock");
  cell.lock.parent = node;
  cell.battle = new Node("spr_battle");
  cell.battle.parent = node;
  cell.reminderAnchor = new Node("ReminderAnchor");
  cell.reminderAnchor.parent = node;
  cell.reminderAnchor.addComponent(UITransform).setContentSize(28, 28);
}

/** 用静态名册资源装配头像格，保留其他调用方通用夹具。 */
function makeRosterCell(node: Node): void {
  makeCell(node);
  const cell = node.getComponent(HeroIconCellView)!;
  const frame = new Node("RosterFrame");
  frame.parent = node;
  cell.rosterFrame = frame.addComponent(Sprite);
  cell.rosterFrames = Array.from({ length: 6 }, () => new SpriteFrame());
  cell.rosterStarFrames = [new SpriteFrame(), new SpriteFrame()];
  cell.rosterStarBadge = new Node("RosterStarBadge");
  cell.rosterStarBadge.parent = node;
  cell.rosterStarBadge.addComponent(Sprite);
  cell.rosterStarBadgeNumber = new Node("RosterStarBadgeNumber");
  cell.rosterStarBadgeNumber.parent = node;
  cell.rosterStarBadgeNumber.addComponent(Sprite);
}

/** 构造真实静态层级的行为替身，业务控件直接注入HeroListView。 */
function makeBoard(node: Node) {
  node.name = "HeroBoard";
  node.setPosition(-320, -480, 0);
  const rootUi = node.getComponent(UITransform) || node.addComponent(UITransform);
  rootUi.setAnchorPoint(0.5, 0.5);
  rootUi.setContentSize(640, 960);
  const board = { node, heroScroll: null as unknown as Node, heroPort: null as unknown as Node,
    heroContent: null as unknown as Node, emptyLabel: null as unknown as Label,
    capacityLabel: null as unknown as Label, elemButtons: [] as Button[], scroll: null as unknown as SuperScroll };
  const box = sized("spr_box", 580, 450);
  box.parent = node;
  board.heroScroll = sized("HeroScroll", HERO_PORT_W, HERO_PORT_H);
  board.heroScroll.parent = box;

  board.scroll = board.heroScroll.addComponent(SuperScroll);
  board.heroPort = sized("view", HERO_PORT_W, HERO_PORT_H);
  board.heroPort.parent = board.heroScroll;
  board.heroContent = sized("content", HERO_PORT_W, HERO_PORT_H);
  board.heroContent.parent = board.heroPort;
  board.heroPort.addComponent(Mask);
  board.heroScroll.getComponent(SuperScroll)!.content = board.heroContent;
  board.heroContent.getComponent(UITransform)!.setAnchorPoint(0.5,1);
  const list=board.heroContent.addComponent(SuperContent);
  list.cellPrefab=fakePrefab(makeRosterCell);list.columns=4;list.spacingX=12;list.spacingY=8;list.paddingLeft=60;list.paddingRight=60;
  board.heroScroll.getComponent(SuperScroll)!.onEnable();
  const empty = new Node("lbl_empty");
  board.emptyLabel = labelOn(empty, "");
  empty.parent = board.heroScroll;
  const cap = new Node("lbl_capacity");
  board.capacityLabel = labelOn(cap, "空间：20/40");
  const capHost = new Node("node_capacity");
  capHost.setPosition(605, 71.889, 0);
  capHost.parent = node;
  cap.parent = capHost;
  const elemRow = new Node("node_elem");
  elemRow.parent = node;
  board.elemButtons = [];
  for (let i = 0; i < 6; i++) {
    const button = buttonOn("btn_elem" + i);
    button.node.parent = elemRow;
    board.elemButtons.push(button);
  }
  return board;
}

/** 创建包含列表和出阵入口的英雄页测试节点。 */
function makeView(): HeroListView {
  const scene = new Node("scene");
  const host = new Node("HeroListView");
  host.parent = scene;
  host.addComponent(UITransform).setContentSize(640, 960);
  const view = host.addComponent(HeroListView);
  view.btnHero = buttonOn("btn_hero");
  if (view.btnHero.node) view.btnHero.node.parent = host;
  view.lineupButton = buttonOn("LineupButton");
  view.lineupButton.node.parent = host;
  const boardRoot = new Node("HeroBoard");
  boardRoot.parent = host;
  const board = makeBoard(boardRoot);
  view.heroScroll = board.scroll;
  view.emptyLabel = board.emptyLabel;
  view.capacityLabel = board.capacityLabel;
  view.elemButtons = board.elemButtons;
  view.catalogTab = buttonOn("CatalogTab");
  view.catalogTab.node.parent = host;
  view.tabFrames = [new SpriteFrame(), new SpriteFrame()];
  const catalog = new Node("CatalogElements");
  catalog.parent = boardRoot;
  for (const element of ["Fire", "Water", "Wind", "Light", "Dark"]) {
    const button = buttonOn(element + "Button");
    button.node.parent = catalog;
    view.catalogElements.push(button);
  }
  view.catalogSelection = view.catalogElements.map((button) => {
    const ring = new Node("SelectedRing");
    ring.parent = button.node;
    return ring;
  });
  view.rosterSelection = view.elemButtons.map((button) => {
    const ring = new Node("SelectedRing");
    ring.parent = button.node;
    return ring;
  });
  view.dragonTab = buttonOn("DragonTab");
  view.dragonTab.node.parent = host;
  view.astrolabeButton = buttonOn("AstrolabeButton");
  view.astrolabeButton.node.parent = host;
  view.evolutionCatalogButton = buttonOn("EvolutionCatalogButton");
  view.evolutionCatalogButton.node.parent = boardRoot;

  return view;
}

/** 从页面直接绑定取得控件，不再读取已删除的列表板组件。 */
function boardOf(view: HeroListView) {
  return { node: view.node.getChildByName("HeroBoard")!, heroContent: view.heroScroll!.content,
    emptyLabel: view.emptyLabel, capacityLabel: view.capacityLabel, elemButtons: view.elemButtons };
}

function cellsOf(view: HeroListView): HeroIconCellView[] {
  const content = boardOf(view).heroContent;
  if (!content) return [];
  const out: HeroIconCellView[] = [];
  for (let i = 0; i < content.children.length; i++) {
    const cell = content.children[i].getComponent(HeroIconCellView) as HeroIconCellView | null;
    if (cell) out.push(cell);
  }
  return out;
}

function pump(frames: number): void {
  for (let i = 0; i < frames; i++) director.emit(Director.EVENT_AFTER_UPDATE);
}

/** 用唯一配置仓库投影名册，检查页面开关、筛选和出阵窗归属。 */
async function checkRemakeRoster(): Promise<void> {
  const model = new HeroRosterModel();
  const service = new HeroRosterController(model);
  service.initialize();service.resetSession();
  /** 模拟已由应用验收的统一回包，不再模拟已删除的查询接口。 */
  const sync=(heroes:OwnedHero[])=>service.onNotify(Protocol.STATE_CHANGED,{heroes,role:{},inventory:[],revision:1});
  const samples = [
    {id:"reserve",templateId:10101001,level:99,star:9,deployed:false},
    {id:"lower",templateId:10101001,level:1,star:3,deployed:true},
    {id:"higher",templateId:10101001,level:1,star:4,deployed:true},
    {id:"level",templateId:10101001,level:2,star:4,deployed:true},
    {id:"template",templateId:10101002,level:2,star:4,deployed:true},
  ];
  const sorted=HeroRosterUtils.present({status:"ready",heroes:samples,error:"",rosterInfo:{capacity:326,buySpaceTimes:1}},0);
  assert(sorted.capacityLine==="英雄：5/326","直接显示服务端总容量，不重复叠加 VIP");
  assert(sorted.cells.map(cell=>cell.instanceId).join(",")==="template,level,higher,lower,reserve","旧版上阵、星级、等级、模板优先级");
  assert(samples[0].id==="reserve","展示排序不修改唯一名册");
  const view = makeView();
  let notice = "";
  view.configure(model);
  const ui = UIManager.instance, originalOpen = ui.open, originalOpenChild = ui.openChild, originalToast = ui.toast;
  const selectedIds: string[] = [];
  const selectedTemplates: number[] = [];
  let formationOpens = 0;
  let evolutionOpens = 0;
  ui.toast = text => { notice = text; };
  ui.open = (async (ctor: unknown, args: { heroId?: string; entries?: {templateId: number}[]; index?: number }) => {
    if (ctor === HeroIllustrationView) {
      assert(!!args.entries?.[args.index ?? -1] && args.heroId === undefined, "图鉴预览接收模板顺序和索引");
      selectedTemplates.push(args.entries![args.index!].templateId);
    } else {
      assert(ctor === HeroInfoView && !!args.heroId, "名册仍按实例打开英雄详情类");
      selectedIds.push(args.heroId!);
    }
    return view;
  }) as typeof ui.open;
  ui.openChild = (async (owner, ctor) => {
    assert(owner === view, "出阵和进化图鉴以英雄列表为所属页");
    if (ctor === HeroEvolutionCatalogView) {
      evolutionOpens++;
    } else {
      assert(ctor === FormationView, "出阵打开阵容选择窗口");
      formationOpens++;
    }
    return view;
  }) as typeof ui.openChild;
  const baseline=EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated);
  try {
    // Deliberately contaminate the legacy store; the injected source must ignore it.
    const sourceText = read("client/assets/scripts/features/hero/ui/HeroListView.ts");
    assert(!sourceText.includes("WireSession"), "no retired network source");
    assert(!/loadPrefab|spawnPrefab|fitCityMiddle|seatHeroParchment/.test(sourceText), "完整页面不保留壳装配或纸面布局补丁");
    view.runOpen(); await view.whenReady(); pump(2);
    assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated)===baseline+1,"开页只增加一个名册监听");
    view.runOpen();
    assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated)===baseline+1,"重复开页不叠加监听");
    const board = boardOf(view);

    assert(cellsOf(view).length === 0, "加载时不读旧名册或图鉴");
    assert(board.emptyLabel!.string === "正在加载英雄…", "绘制加载状态");
    assert(!view.evolutionCatalogButton!.node.active, "持有名册不显示进化图鉴入口");
    sync([]); pump(1);
    assert(board.emptyLabel!.string === "尚未获得英雄" && cellsOf(view).length === 0, "真实空名册不回退图鉴");
    assert(board.capacityLabel!.string === "英雄：0/—", "不显示旧协议容量");
    view.btnHero!.node.emit(Button.EventType.CLICK); pump(1);
    assert(notice === "", "点击已选名册页签不发送查询也不额外打断浏览");
    view.lineupButton!.node.emit(Button.EventType.CLICK);
    assert(formationOpens === 1, "点击只发起一次所属出阵窗");
    sync([{ id: "f45747b7-f032-4d00-9546-3504b9a967e5", templateId: 10101001, level: 7, star: 4, locked:true, deployed:true }]);pump(1);
    const cells = cellsOf(view);
    assert(cells.length === 1 && !cells[0].nameLabel!.node.active, "正式列表不在头像上叠名称");
    assert(cells[0].levelLabel!.string === "7" && cells[0].stars.filter(node => node.active).length === 4, "等级和星级来自实例");
    assert(!cells[0].elem!.active, "仅名册格隐藏头像属性图标");
    assert(cells[0].rosterFrame!.spriteFrame === cells[0].rosterFrames[3]
      && cells[0].stars[0].getComponent(Sprite)!.spriteFrame === cells[0].rosterStarFrames[0],
      "四星名册格使用紫色品质框和金星");
    cells[0].node.emit(Button.EventType.CLICK);
    assert(selectedIds.join() === "f45747b7-f032-4d00-9546-3504b9a967e5", "选择直接传入真实实例ID，不经过roster回调");
    board.elemButtons[2].node.emit(Button.EventType.CLICK); pump(1);
    assert(cellsOf(view).length === 0 && board.emptyLabel!.string === "没有符合筛选条件的英雄", "筛选空态");
    board.elemButtons[0].node.emit(Button.EventType.CLICK); pump(1);
    assert(cellsOf(view).length === 1, "切回全部显示英雄");
    assert(cells[0].lock!.active && cells[0].battle!.active,"自身锁定与上阵可同时显示");
    assert(!cells[0].face!.getComponent(Sprite)!.grayscale,"已拥有的锁定英雄不能灰显为未获得");
    const deployed = { id: "f45747b7-f032-4d00-9546-3504b9a967e5", templateId: 10101001, level: 7, star: 4, locked: true, deployed: true };
    const reserve = { ...deployed, id: "f45747b7-f032-4d00-9546-3504b9a967e6", deployed: false };
    sync([deployed, reserve]);
    pump(1);
    const [deployedCell, reserveCell] = cellsOf(view);
    const redDots = RedDotManager.instance;
    redDots.set(GameRedDotKey.heroUpgrade(deployed.id), true);
    redDots.set(GameRedDotKey.heroEquipment(reserve.id, 1), true);
    await Promise.resolve();
    const dot = deployedCell.reminderAnchor!.getChildByName("RedDot");
    assert(dot?.active && !reserveCell.reminderAnchor!.getChildByName("RedDot"),
      "仅已上阵英雄显示装备或升级汇总，独立红点事件也可更新已显示的格子");
    redDots.set(GameRedDotKey.heroEquipment(deployed.id, 1), true);
    redDots.set(GameRedDotKey.heroUpgrade(deployed.id), false);
    assert(dot!.active, "升级失效后仍有可穿装备时保持红点");
    redDots.set(GameRedDotKey.heroEquipment(deployed.id, 1), false);
    assert(!dot!.active, "最后一项不可操作时立即熄灭");
    sync([deployed]);
    pump(1);
    view.catalogTab!.node.emit(Button.EventType.CLICK); pump(1);
    const [firstCatalog] = cellsOf(view);
    assert(firstCatalog?.levelLabel?.string === "250" && firstCatalog?.rosterStarBadge?.active,
      "图鉴默认火系，首卡显示该星级的满级与十星翼徽");
    assert(firstCatalog?.face?.getComponent(Sprite)?.grayscale && !firstCatalog?.battle?.active,
      "即时名册未获得的图鉴头像仍能浏览，不带名册上阵状态");
    firstCatalog.node.emit(Button.EventType.CLICK);
    assert(selectedTemplates[0] === 10105023 && selectedIds.length === 1, "图鉴打开独立只读预览");
    assert(!view.elemButtons[0].node.parent!.active && view.catalogElements[0].node.parent!.active
      && !view.capacityLabel!.node.parent!.active && view.evolutionCatalogButton!.node.active,
      "图鉴只显示五元素和进化图鉴入口");
    view.evolutionCatalogButton!.node.emit(Button.EventType.CLICK);
    assert(evolutionOpens === 1, "进化图鉴以名册为父页打开");
    view.catalogElements[3].node.emit(Button.EventType.CLICK); pump(1);
    cellsOf(view)[0].node.emit(Button.EventType.CLICK);
    assert(selectedTemplates[1] === 10405021 && view.catalogSelection[3].active, "光系切换到原版首项");
    view.btnHero!.node.emit(Button.EventType.CLICK); pump(1);
    assert(!view.catalogElements[0].node.parent!.active && view.capacityLabel!.node.parent!.active
      && cellsOf(view)[0].levelLabel!.string === "7", "返回名册恢复当前实例和原筛选");
    view.runClose();
    view.lineupButton!.node.emit(Button.EventType.CLICK);
    assert(formationOpens === 1, "英雄列表关闭后已解绑出阵入口");
    const closedCount = selectedIds.length;
    view.heroScroll!.list.node.emit(SuperContent.SELECT_ITEM, {kind:"owned",instanceId:"closed"});
    assert(selectedIds.length === closedCount, "关闭期间解除列表选择，不打开详情");
    view.runOpen();
    view.runOpen();
    cellsOf(view)[0].node.emit(Button.EventType.CLICK);
    assert(selectedIds.length === closedCount + 1, "关闭重开及重复打开后一次点击仍只选择一次");
    view.runDispose();sync([]);
    assert(model.snapshot.status === "ready" && model.snapshot.heroes.length === 0,"页面关闭后模块继续接收同步");
    view.heroScroll!.list.node.emit(SuperContent.SELECT_ITEM, {kind:"owned",instanceId:"closed"});
    assert(selectedIds.length === closedCount + 1, "释放后列表选择不再导航");
  } finally {
    RedDotManager.instance.reset();
    ui.open = originalOpen;
    ui.openChild = originalOpenChild;
    ui.toast = originalToast;
    view.runDispose();
    assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated)===baseline,"关页只清理本页名册监听");
    service.dispose(); view.node.destroy();

  }
}

/** 验证格子在停用、复用和展示共用时只显示当前来源。 */
async function checkHeroReminderReuse(): Promise<void> {
  const root = new Node("hero-reminder-reuse");
  makeCell(root);
  const cell = root.getComponent(HeroIconCellView)!;
  const model = { kind: "owned" as const, name: "测试英雄", showName: false, face: null,
    elem: null, stars: 1, level: 1, locked: false, deployed: true };
  const dots = RedDotManager.instance;
  const heroA = "first";
  const heroB = "second";
  try {
    dots.set(GameRedDotKey.heroEquipment(heroA, 1), true);
    cell.show(model, GameRedDotKey.heroDetail(heroA));
    await Promise.resolve();
    const dot = cell.reminderAnchor!.getChildByName("RedDot");
    assert(dot?.active, "打开格子即读取已有红点");
    root.active = false;
    cell.onDisable();
    dots.set(GameRedDotKey.heroEquipment(heroA, 1), false);
    dots.set(GameRedDotKey.heroUpgrade(heroA), true);
    assert(!dot!.active, "离屏时解除原格监听");

    cell.show(model, GameRedDotKey.heroDetail(heroB));
    root.active = true;
    cell.onEnable();
    assert(!dot!.active, "复用格不会沿用上一英雄的红点");
    dots.set(GameRedDotKey.heroUpgrade(heroB), true);
    assert(dot!.active && cell.reminderAnchor!.children.length === 1,
      "复用同一个红点节点，只显示当前英雄的状态");

    cell.show(model);
    assert(!dot!.active, "角色资料和战报等共用展示默认隐藏红点");
    dots.set(GameRedDotKey.heroUpgrade(heroB), false);
    dots.set(GameRedDotKey.heroUpgrade(heroB), true);
    assert(!dot!.active, "共用展示已解绑，不响应名册提醒更新");
  } finally {
    cell.onDestroy();
    root.destroy();
    dots.reset();
  }
}

/** 验证法阵格激活时显示最新配方，回收后不沿用上一项的提醒。 */
async function checkCreationReminderReuse(): Promise<void> {
  const root = new Node("creation-reminder-reuse");
  makeCell(root, HeroCreationCellView);
  const cell = root.getComponent(HeroCreationCellView)!;
  const recipe = HeroCreationUtils.options([], () => 0)[0];
  const ready = { ...recipe, available: recipe.required, ready: true };
  try {
    root.active = false;
    cell.showRecipe(ready);
    root.active = true;
    cell.onEnable();
    await Promise.resolve();
    const dot = cell.reminderAnchor!.getChildByName("RedDot");
    assert(dot?.active, "配方齐备的虚拟格激活后显示红点");

    root.active = false;
    cell.onDisable();
    assert(!dot!.active, "法阵格离屏时熄灭红点");
    cell.showRecipe({ ...ready, ready: false });
    root.active = true;
    cell.onEnable();
    assert(!dot!.active, "复用格配方费用不足时不沿用原红点");

    cell.showRecipe(ready);
    assert(dot!.active && cell.reminderAnchor!.children.length === 1, "配方再次齐备时复用红点节点");
    cell.showRecipe(recipe);
    assert(!dot!.active, "可见的法阵格缺料后立即熄灭红点");
  } finally {
    cell.onDestroy();
    root.destroy();
  }
}

/** 英雄格子只负责绘制；复用后旧头像不能覆盖新英雄，销毁后迟到结果失效。 */
async function checkHeroCellReuse():Promise<void> {
 const root=new Node("reuse");makeCell(root);const cell=root.getComponent(HeroIconCellView)!;
 const original=resources.load;const pending:Array<{path:string;done:(err:any,asset:any)=>void}>=[];
 resources.load=((path:any,type:any,done:any)=>{pending.push({path,done});}) as any;
 try {
  const face=(path:string)=>({kind:"owned" as const,name:path,showName:true,face:path,elem:null,stars:1,level:1,locked:false,deployed:false});
  cell.show(face("fixture/A"));cell.show(face("fixture/B"));cell.show(face("fixture/B"));
  assert(!read("client/assets/scripts/features/hero/ui/HeroIconCellView.ts").includes("Button.EventType.CLICK"), "格子不持有页面点击回调");
  await new Promise(resolve => setImmediate(resolve));
  const a=new SpriteFrame(),b=new SpriteFrame();pending.filter(x=>x.path==="fixture/B/spriteFrame").forEach(x=>x.done(null,b));
  pending.filter(x=>x.path==="fixture/A/spriteFrame").forEach(x=>x.done(null,a));
  await new Promise(resolve => setImmediate(resolve));
  assert(cell.face!.getComponent(Sprite)!.spriteFrame===b,"迟到旧头像不能覆盖新英雄");
  cell.show(face("fixture/C"));cell.onDestroy();pending.filter(x=>x.path==="fixture/C/spriteFrame").forEach(x=>x.done(null,a));
  assert(cell.face!.getComponent(Sprite)!.spriteFrame===null,"销毁后不写回头像");
 }finally{resources.load=original;root.destroy();}
}
/** 当前Cell高124、视口高517，用24项真实长列表验证末端335可达、保位和缩短归零。 */
function checkHeroScrollBounds():void {
 const root=new Node("long-list"),board=makeBoard(root),scroll=board.scroll,list=scroll.list;
 const source=JSON.parse(read("client/assets/bundles/module/hero/prefabs/HeroListView.prefab"));const config=source.find((row:any)=>row.columns!==undefined);
 for(const key of ["columns","rows","layoutType","gridAxis"] as const)list[key]=config[key];
 for(const key of ["spacingX","spacingY","paddingLeft","paddingRight","paddingTop","paddingBottom"] as const)list[key]=config["_"+key];
 list.setData(Array.from({length:24},(_,i)=>i),()=>{});
 assert(board.heroContent!.getComponent(UITransform)!.height===852,"真实124高格子、20间距与8上边距计算六行高度");
 scroll.restorePosition({x:0,y:335} as any);assert(scroll.readPosition().y===335,"末行可达");
 list.refresh();assert(scroll.readPosition().y===335,"普通刷新保留位置");
 list.setData([1,2,3],()=>{});assert(scroll.readPosition().y===0,"筛选缩短不留下空白滚动区域");root.destroy();
}

/** 验证应用实际开页无需测试注入，使用唯一模块和已准备配置。 */
async function checkDefaultRoster():Promise<void> {
 const service=HeroRosterController.instance;service.initialize();service.resetSession();
 service.onNotify(Protocol.STATE_CHANGED,{revision:1,heroes:[],heroRoster:{capacity:300,buySpaceTimes:0}});
 const page=makeView();try {page.runOpen();await page.whenReady();pump(2);assert(boardOf(page).capacityLabel!.string==="英雄：0/300","实际默认装配显示容量");}
 finally {page.runDispose();page.node.destroy();service.dispose();}
}
/** 详情随快照刷新；应用重置只关闭页面，关闭后的同ID同步不能重新导航。 */
async function checkReadonlyInfo(): Promise<void> {
    const controller = HeroRosterController.instance;
    controller.initialize();
    controller.resetSession();
    const hero = {
        id: "00000000-0000-4000-8000-000000000001", templateId: 10101001,
        level: 1, star: 1, stage: 0,
        panelStats: {
            values: { hp: 120, atk: 30, def: 10, spd: 100 },
            includedSources: ["base", "equipment", "equipment_set"],
            pendingSources: ["skill_panel"], complete: false,
        },
        baseStats: { hp: 120, atk: 30, def: 10, spd: 100 },
    };
    const sync = (rows: any[]) => controller.onNotify(Protocol.STATE_CHANGED, { revision: 1, heroes: rows });
    sync([hero]);
    const root = new Node("info"), page = root.addComponent(HeroInfoView);
    page.summary = new Node("summary").addComponent(Label);
    page.attributes = Array.from({ length: 4 }, () => new Node("attr").addComponent(Label));
    (page as any).mountPortrait = () => {};
    const ui = UIManager.instance, originalOpen = ui.openById;
    let lists = 0, closes = 0;
    ui.openById = (async (id: string) => {
        assert(id === "hero", "详情明确返回英雄列表");
        lists++;
        return page;
    }) as typeof ui.openById;
    page.close = () => {
        closes++;
        page.onClose();
    };
    const before = EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated);
    try {
        page.onOpen({ heroId: hero.id });
        assert(page.attributes[0].string === "攻击：30", "展示服务器面板属性");
        sync([{ ...hero, level: 2, panelStats: { ...hero.panelStats, values: { ...hero.panelStats.values, atk: 35 } } }]);
        assert(page.attributes[0].string === "攻击：35", "同步后详情更新");
        (page as any).goBack();
        assert(lists === 1, "返回按钮打开列表而非主城");
        sync([]);
        assert(lists === 2, "已同步的实例删除返回列表");
        controller.resetSession();
        assert(closes === 1 && lists === 2, "应用重置只关闭详情，不重新打开英雄列表");
        sync([hero]);
        (page as any).goBack();
        assert(lists === 2, "关闭后同实例ID同步和迟到导航均无效");
        page.onOpen({ heroId: hero.id });
        page.onOpen({ heroId: hero.id });
        assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated) === before + 1, "重复打开只保留一份详情订阅");
        page.onClose();
        assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated) === before, "关页释放详情监听");
        controller.resetSession();
        assert(lists === 2, "应用先关闭页面后重置Model，不触发列表导航");
    } finally {
        page.onClose();
        ui.openById = originalOpen;
        controller.dispose();
        root.destroy();
    }
 const data = loadPrefab("client/assets/bundles/module/hero/prefabs/HeroInfoView.prefab");
 const activeButtons = data.filter(row => row.__type__ === "cc.Button" && row._interactable)
   .map(row => data[idOf(row.node)]._name);
  const detail=data.find((row:any)=>row.equipmentIcons);
 assert(detail?.equipmentIcons.length===4&&detail.equipmentFrames.length===4&&detail.equipmentLabels.length===4,"四槽图标、品质框和状态文字必须静态绑定");
 const equipmentNodes = detail?.equipmentButtons?.map((ref: { __id__: number }) => data[ref.__id__]);
 assert(equipmentNodes?.length === 4 && equipmentNodes.every((button: PrefabObj, index: number) =>
   button.__type__ === "cc.Button" && button._interactable === false
     && data[idOf(button.node)]?._name === `EquipmentSlot${index + 1}`), "四个装备槽已绑定，未同步装备时默认禁用");
 const waiting = {
   equipAllButton: "EquipAllButton", unequipAllButton: "UnequipAllButton",
   previousHeroButton: "PreviousHeroButton", nextHeroButton: "NextHeroButton",
 };
 for (const [field, name] of Object.entries(waiting)) {
   const button = data[idOf(detail?.[field])];
   assert(button?.__type__ === "cc.Button" && button._interactable === false && data[idOf(button.node)]?._name === name,
     `${name} 等待当前名册或装备状态再启用`);
 }
 const initiallyAvailable = ["btn_back", "OrdinaryUpgradeButton", "AttributeDetailsButton", "HeroSettingsButton",
   "SkillIcon1", "SkillIcon2", "SkillIcon3", "SkillIcon4", "CultivationTab", "AscensionTab", "GemTab",
   "DivineEquipmentTab", "RuneLevelSlot", "RuneStarSlot"];
 assert(activeButtons.length === initiallyAvailable.length && initiallyAvailable.every(name => activeButtons.includes(name)),
   "详情只绑定已经实现的操作按钮和只读页签/门槛入口");
 const extraBindings = { growthTabs: 4, growthTabLabels: 4, growthTabSelected: 4, lockedSlots: 2,
   lockLabels: 2, stageMarks: 6, skillBadges: 4, skillBadgeLabels: 4, portraitBackdrop: 2 };
 for (const [field, length] of Object.entries(extraBindings)) {
   assert(detail?.[field]?.length === length, `英雄详情 Prefab 绑定缺失：${field}`);
 }
 const tabNodes = detail?.growthTabs.map((ref: { __id__: number }) => data[idOf(data[ref.__id__].node)]);
 const tabRow = data[idOf(tabNodes[0]._parent)];
 assert(tabRow?._name === "GrowthTabRow" && tabNodes.every((node: PrefabObj) => data[idOf(node._parent)] === tabRow)
   && tabRow._components.some((ref: { __id__: number }) => data[ref.__id__].__type__ === "cc.Layout"),
   "隐藏不可达页签后由同一横向 Layout 自动收拢");
 const portrait = data[idOf(detail?.portraitImage)];
 assert(portrait?.__type__ === "cc.Sprite" && portrait._isTrimmedMode === false,
   "正式服立绘保留透明边及比例，不使用自动裁剪坐标");
 const upgradeBindings = {
     upgradeButton: ["cc.Button", "OrdinaryUpgradeButton"],
     upgradeLabel: ["cc.Label", "UpgradeActionLabel"],
     upgradeGold: ["cc.Label", "GoldAmount"],
     upgradeExperience: ["cc.Label", "ExperienceAmount"],
     upgradeStatus: ["cc.Label", "UpgradeLimitStatus"],
     upgradeEffect: ["cc.Sprite", "OrdinaryUpgradeEffect"],
     upgradeEffectOpacity: ["cc.UIOpacity", "OrdinaryUpgradeEffect"],
 };
 for (const [field, [type, name]] of Object.entries(upgradeBindings)) {
     const component = data[idOf(detail?.[field])];
     assert(component?.__type__ === type && data[idOf(component.node)]?._name === name,
         `普通升级 Prefab 绑定错误：${field}`);
 }
 assert(data[idOf(detail?.upgradeCosts)]?._name === "UpgradeCosts"
     && data[idOf(detail?.upgradeReminderAnchor)]?._name === "UpgradeReminderAnchor", "消耗区域与红点锚点由 Prefab 布置");
}

/** 从已安装的真实表核对升星配方、可达符文门槛和正式服例图的立绘。 */
function checkGrowthReference(): void {
    const hero = { id: "fixture", templateId: 10105008, level: 1, star: 5, stage: 0 };
    const strong = HeroGrowthDisplayUtils.forHero(hero);
    assert(strong.tabs.every(Boolean) && strong.runeLevels.join() === "100,7", "可升星英雄显示其可达培养页和符文槽");
    const weak = HeroGrowthDisplayUtils.forHero({ ...hero, templateId: 10101001, star: 1 });
    assert(weak.tabs.join() === "true,false,false,true" && weak.runeLevels.every(gate => gate === null),
        "无升星配方的低星英雄不保留不可达符文或宝石入口");
    assert(HeroStarUtils.recipe(hero)?.rows[0].label.includes("毁灭之烬 ×1"), "升星材料实际使用指定英雄配方");
    assert([1, 2, 3].map(slot => HeroJewelUtils.requiredStar(slot)).join() === "8,8,9",
        "展示正式服三档宝石槽门槛");
    const portrait = HeroPortraitUtils.find(hero.templateId, hero.star);
    assert(portrait?.path === "hero/portraits/10105008_01" && portrait.width > 0 && portrait.height > 0,
        "已收录当前正式服外观和布局尺寸");
    assert(HeroPortraitUtils.find(99999999, 1) === null, "没有立绘的角色可直接回退 Spine");
}

/** 用真实详情生命周期验证升级报价、在途按钮、成功光效和释放范围。 */
async function checkLevelPresentation(): Promise<void> {
    const roster = HeroRosterController.instance;
    roster.initialize();
    roster.resetSession();
    const heroId = "00000000-0000-4000-8000-000000000004";
    const hero = { id: heroId, templateId: 10101001, level: 1, star: 1, stage: 0 };
    roster.onNotify(Protocol.STATE_CHANGED, { revision: 1, heroes: [hero] });
    const level = HeroLevelController.instance;
    const originalDescribe = level.describe;
    const originalUpgrade = level.upgrade;
    const originalScope = ResourceAssetsUtils.createAssetScope;
    let pending = false;
    Object.defineProperty(level, "busy", { configurable: true, get: () => pending });
    let quote: ReturnType<HeroLevelController["describe"]> = {
        status: "ready", fromLevel: 1, levelLimit: 30, gold: 410, heroExp: 105,
        goldEnough: true, heroExpEnough: true, levels: 5, jumpLabel: true,
    };
    const requests: string[] = [];
    level.describe = (id) => {
        assert(id === heroId, "只获取当前实例的升级报价");
        return quote;
    };
    level.upgrade = id => { requests.push(id); };
    let releases = 0;
    const frames = Array.from({ length: 30 }, () => new SpriteFrame());
    let loads = 0;
    ResourceAssetsUtils.createAssetScope = () => ({
        load: async () => frames[loads++],
        dispose: () => { releases++; },
    }) as ReturnType<typeof originalScope>;

    const root = new Node("GrowthInfo");
    const page = root.addComponent(HeroInfoView);
    const child = (name: string) => {
        const node = new Node(name);
        node.parent = root;
        return node;
    };
    page.summary = child("Summary").addComponent(Label);
    page.upgradeButton = child("OrdinaryUpgradeButton").addComponent(Button);
    page.upgradeLabel = child("UpgradeActionLabel").addComponent(Label);
    page.upgradeCosts = child("UpgradeCosts");
    page.upgradeReminderAnchor = child("UpgradeReminderAnchor");
    page.upgradeReminderAnchor.addComponent(UITransform).setContentSize(23, 23);
    page.upgradeGold = child("GoldAmount").addComponent(Label);
    page.upgradeExperience = child("ExperienceAmount").addComponent(Label);
    page.upgradeStatus = child("UpgradeLimitStatus").addComponent(Label);
    page.upgradeEffect = child("OrdinaryUpgradeEffect").addComponent(Sprite);
    page.upgradeEffectOpacity = page.upgradeEffect.node.addComponent(UIOpacity);
    (page as any).mountPortrait = () => {};
    const events = EventDispatcher.instance;
    const before = events.listenerCount(HeroLevelEvent.Updated);
    const reminder = GameRedDotKey.heroUpgrade(heroId);
    const restoreRedDot = RedDotFixture.stubLoad();
    try {
        RedDotManager.instance.set(reminder, true);
        page.onOpen({ heroId });
        await Promise.resolve();
        const dot = page.upgradeReminderAnchor.getChildByName("RedDot");
        assert(page.summary.string.startsWith("等级：1/30"), "详情同时展示等级与当前阶上限");
        assert(page.upgradeLabel.string === "升5级" && page.upgradeCosts.active && dot?.active,
            "旧低级英雄按可承担数量显示升级");
        assert(page.upgradeGold.string === "410" && page.upgradeExperience.string === "105", "显示两项累计消耗");

        quote = { ...quote, jumpLabel: false, goldEnough: false, levels: 0 };
        RedDotManager.instance.set(reminder, false);
        events.emit(HeroLevelEvent.Updated, {});
        assert(page.upgradeGold.color.g < 255 && page.upgradeLabel.string === "升级" && !dot!.active,
            "费用不足时标红，仍可按旧版点击查看缺项");
        page.upgradeButton.node.emit(Button.EventType.CLICK);
        assert(requests.join() === heroId, "按钮只转交当前实例，材料校验留给控制器");

        page.upgradeReminderAnchor = null;
        pending = true;
        events.emit(HeroLevelEvent.Updated, {});
        assert(!page.upgradeButton.interactable && page.upgradeLabel.string === "升级中…" && page.upgradeCosts.active
            && page.upgradeGold.string === "410" && page.upgradeExperience.string === "105",
            "普通升级在途时保留费用区域和价格，只禁用操作");
        pending = false;
        quote = { ...quote, status: "max" };
        events.emit(HeroLevelEvent.Updated, { heroId: "other", fromLevel: 1, toLevel: 2 });
        assert(!page.upgradeButton.node.active && page.upgradeStatus.node.active
            && page.upgradeStatus.string === "已达当前等级上限" && loads === 0, "满级关闭按钮，其他实例确认不播放光效");
        events.emit(HeroLevelEvent.Updated, { heroId, fromLevel: 25, toLevel: 30 });
        await Promise.resolve();
        await Promise.resolve();
        assert(loads === 30 && page.upgradeEffect.node.active && page.upgradeEffectOpacity.opacity === 0,
            "确认结果播放原 30 帧并从透明开始");
        page.update(0.06);
        assert(page.upgradeEffect.spriteFrame === frames[1] && page.upgradeEffectOpacity.opacity === 153,
            "60 毫秒进入第二帧，100 毫秒渐入");
        page.update(1.741);
        assert(!page.upgradeEffect.node.active && !page.upgradeEffect.spriteFrame && releases === 1,
            "完整播放结束释放帧引用");
        page.onOpen({ heroId });
        assert(events.listenerCount(HeroLevelEvent.Updated) === before + 1, "重复打开不叠加升级监听");
        loads = 0;
        events.emit(HeroLevelEvent.Updated, { heroId, fromLevel: 25, toLevel: 30 });
        page.onClose();
        await Promise.resolve();
        await Promise.resolve();
        assert(events.listenerCount(HeroLevelEvent.Updated) === before, "关闭时释放升级监听");
        assert(loads === 30 && releases === 2 && !page.upgradeEffect.node.active,
            "关闭在途光效会撤回持有，晚到的帧不重新显示");
    } finally {
        restoreRedDot();
        RedDotManager.instance.set(reminder, false);
        page.onClose();
        level.describe = originalDescribe;
        level.upgrade = originalUpgrade;
        Reflect.deleteProperty(level, "busy");
        ResourceAssetsUtils.createAssetScope = originalScope;
        roster.dispose();
        root.destroy();
    }
}
/** 升级快照保留已显示图标，替换仍等待新资源，并在换英雄时撤销上一实例的图片。 */
async function checkDetailIconContinuity(): Promise<void> {
    const roster = HeroRosterController.instance;
    roster.initialize();
    roster.resetSession();
    const hero = { id: "00000000-0000-4000-8000-000000000010", templateId: 10101001, level: 1, star: 1, stage: 0 };
    const other = { ...hero, id: "00000000-0000-4000-8000-000000000011" };
    const worn = {
        instanceId: "00000000-0000-4000-8000-000000000012",
        templateId: 1001001,
        slot: 1,
        soulLevel: 0,
    };
    /** 将当前英雄的真实成长和装备投影交给名册入口。 */
    const sync = (revision: number, current: OwnedHero): void => {
        roster.onNotify(Protocol.STATE_CHANGED, { revision, heroes: [current, other] });
    };
    const root = new Node("HeroDetailIcons");
    const page = root.addComponent(HeroInfoView);
    page.skillIcons = [new Node("SkillIcon")];
    page.equipmentIcons = [new Node("EquipmentIcon")];
    page.equipmentFrames = [new Node("EquipmentQualityFrame")];
    (page as any).mountPortrait = () => {};
    const changes: (SpriteFrame | null)[] = [];
    const icons = [...page.skillIcons, ...page.equipmentIcons, ...page.equipmentFrames].map(node => {
        node.parent = root;
        const sprite = node.addComponent(Sprite);
        let current: SpriteFrame | null = null;
        Object.defineProperty(sprite, "spriteFrame", {
            get: () => current,
            set: value => {
                current = value;
                changes.push(value);
            },
        });
        return sprite;
    });
    const oldScope = ResourceAssetsUtils.createAssetScope;
    let finishEquipment!: (frame: SpriteFrame) => void;
    const equipmentLoad = new Promise<SpriteFrame>(resolve => { finishEquipment = resolve; });
    ResourceAssetsUtils.createAssetScope = () => ({
        load: async descriptor => (descriptor.loadPath?.includes("backpack_1001001") ? equipmentLoad : new SpriteFrame()),
        dispose: () => {},
    }) as ReturnType<typeof oldScope>;
    try {
        sync(1, hero);
        page.onOpen({ heroId: hero.id });
        await new Promise(resolve => setImmediate(resolve));
        const first = icons.map(icon => icon.spriteFrame);
        assert(first.every(Boolean), "初次展示技能、空装备槽和品质框");
        changes.length = 0;
        sync(2, { ...hero, level: 6 });
        sync(3, { ...hero, level: 7 });
        assert(!changes.includes(null) && icons.every((icon, index) => icon.spriteFrame === first[index]),
            "连续升级快照不清图，复用当前三种显示资源");

        sync(4, { ...hero, level: 7, equipment: { items: [worn] } });
        assert(icons[1].spriteFrame === first[1], "本英雄实际换装时等新图交付再替换");
        page.onOpen({ heroId: other.id });
        assert(icons.every(icon => !icon.spriteFrame), "切换其他实例时立即撤下旧图");
        const late = new SpriteFrame();
        finishEquipment(late);
        await new Promise(resolve => setImmediate(resolve));
        assert(icons.every(icon => icon.spriteFrame && icon.spriteFrame !== late), "旧英雄的迟到装备未覆盖新英雄");
    } finally {
        page.onClose();
        root.destroy();
        roster.dispose();
        ResourceAssetsUtils.createAssetScope = oldScope;
    }
}

/** 技能窗口关闭后不响应同实例ID的新快照，重开读取当前状态。 */
async function checkReadonlySkillLifecycle(): Promise<void> {
    const controller = HeroRosterController.instance;
    controller.initialize();
    controller.resetSession();
    const hero = {
        id: "00000000-0000-4000-8000-000000000003", templateId: 10101001,
        level: 1, star: 1, stage: 0, baseStats: { hp: 120, atk: 30, def: 10, spd: 100 },
    };
    const sync = (rows: any[]) => controller.onNotify(Protocol.STATE_CHANGED, { revision: 1, heroes: rows });
    sync([hero]);
    const root = new Node("skill"), page = root.addComponent(HeroSkillView);
    page.title = new Node("title").addComponent(Label);
    let closes = 0;
    page.close = () => {
        closes++;
        page.onClose();
    };
    const before = EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated);
    try {
        page.onOpen({ heroId: hero.id, slot: 0 });
        assert(page.title.string.length > 0, "技能窗口读取已同步实例");
        page.onClose();
        const title = page.title.string;
        controller.resetSession();
        sync([hero]);
        (page as any).refresh();
        assert(closes === 0 && page.title.string === title, "关闭后重置和同ID回包不能触发窗口行为");
        page.onOpen({ heroId: hero.id, slot: 0 });
        controller.resetSession();
        assert(closes === 1, "打开状态下数据重置关闭技能窗口");
        assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated) === before, "技能关闭释放自己的订阅");
    } finally {
        page.onClose();
        controller.dispose();
        root.destroy();
    }
}

/** 三个实际元素图标消费点必须从hero包加载并共享帧；包内ui不能被当成独立Bundle。 */
async function checkElementBundleRoutes(): Promise<void> {
    // 前一页面的资源请求由异步池收尾，先等待其失败/释放，避免复用旧测试替身的在途请求。
    await new Promise(resolve => setImmediate(resolve));
    const original = assetManager.loadBundle;
    const frames = new Map<string, SpriteFrame>();
    const requestedBundles: string[] = [];
    assetManager.loadBundle = ((name: string, done: Function) => {
        requestedBundles.push(name);
        done(null, {
            load: (path: string, _type: unknown, callback: Function) => {
                const frame = frames.get(path) || new SpriteFrame();
                frames.set(path, frame);
                callback(null, frame);
            },
        });
    }) as typeof assetManager.loadBundle;
    const controller = HeroRosterController.instance;
    controller.initialize();
    controller.resetSession();
    const hero = {
        id: "00000000-0000-4000-8000-000000000002", templateId: 10101001,
        level: 1, star: 1, stage: 0, baseStats: { hp: 120, atk: 30, def: 10, spd: 100 },
    };
    controller.onNotify(Protocol.STATE_CHANGED, { revision: 1, heroes: [hero] });
    const boardRoot = new Node("ElementBoard");
    const board = makeBoard(boardRoot);
    const cellRoot = new Node("ElementCell");
    makeCell(cellRoot);
    const cell = cellRoot.getComponent(HeroIconCellView)!;
    const detailRoot = new Node("ElementDetail");
    const detail = detailRoot.addComponent(HeroInfoView);
    detail.elementIcon = new Node("ElementIcon");
    detail.elementIcon.parent = detailRoot;
    detail.elementIcon.addComponent(Sprite);
    (detail as any).mountPortrait = () => {};
    try {
        cell.show({
            kind: "owned", name: "测试英雄", showName: true, face: "hero/ui/hero-icon_10101001",
            elem: 5, stars: 1, level: 1, locked: false, deployed: false,
        });
        detail.onOpen({ heroId: hero.id });
        await new Promise(resolve => setImmediate(resolve));
        assert(requestedBundles.length > 0 && requestedBundles.every(name => name === "hero"),
            "所有英雄元素消费点保留hero包名，不请求ui包");
        const pagePrefab = loadPrefab("client/assets/bundles/module/hero/prefabs/HeroListView.prefab");
        const viewType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroListView.ts.meta"));
        const staticBoard = component(pagePrefab, viewType).comp;
        for (let index = 0; index < 6; index++) {
            const button = pagePrefab[(staticBoard.elemButtons as {__id__:number}[])[index].__id__];
            const host = pagePrefab[idOf(button.node)];
            const sprite = (host._components as {__id__:number}[]).map(ref => pagePrefab[ref.__id__]).find(row => row.__type__ === "cc.Sprite")!;
            const uuid = metaUuid("client/assets/bundles/module/hero/ui/hero-icon_elem-" + index + ".png.meta");
            assert((sprite._spriteFrame as {__uuid__:string}).__uuid__ === uuid + "@f9941", "六个筛选图标由完整Prefab静态持有");
        }
        assert(cell.elem!.getComponent(Sprite)!.spriteFrame === frames.get("ui/hero-icon_elem-5/spriteFrame"),
            "英雄格子保留完整资源描述");
        assert(detail.elementIcon.getComponent(Sprite)!.spriteFrame === frames.get("ui/hero-icon_elem-1/spriteFrame"),
            "英雄详情按模板元素使用同一hero包资源");
    } finally {
        detail.onClose();
        boardRoot.destroy();
        cellRoot.destroy();
        detailRoot.destroy();
        controller.dispose();
        assetManager.loadBundle = original;
    }
}

/** 证明模板显示只按需查询当前主键，既不读取整表，也不保留上次显示副本。 */
async function checkDirectTemplateLookup(): Promise<void> {
    const config = await ConfigFixtureUtils.installReal(new GameConfig());
    const direct = Object.create(config) as GameConfig;
    const get = config.getConfig.bind(config);
    let title = "首次模板名称";
    let fallback = false;
    let omittedIcon = false;
    let omittedElement = false;
    const calls: Array<{ name: string; key: unknown }> = [];
    direct.getFile = (() => {
        throw new Error("模板查询不应读取整张配置表");
    }) as typeof direct.getFile;
    direct.getConfig = ((name: typeof GConfig.HeroType | typeof GConfig.Item, key: number) => {
        assert(key !== undefined, "模板投影必须使用主键，不取整表");
        calls.push({ name, key });
        const row = get(name, key);
        return row && name === GConfig.HeroType ? {
            ...row,
            note: title,
            item_id: omittedIcon ? undefined : fallback ? 0 : (row as any).item_id,
            elem: omittedElement ? undefined : (row as any).elem,
        } : row;
    }) as typeof direct.getConfig;
    const first = HeroCatalog.find(10101001, direct)!;
    assert(first.name === title && first.elem === 1 && first.icon === "hero/ui/hero-icon_20101001",
        "当前模板保留名称、元素和配置item_id头像规则");
    title = "更新后的模板名称";
    assert(HeroCatalog.find(10101001, direct)?.name === title && first.name === "首次模板名称",
        "再次查询取得当前行，不读页面旧索引；返回值不修改以前的投影");
    assert(calls.length === 2 && calls.every(call => call.name === GConfig.HeroType && call.key === 10101001),
        "正常头像只查询所需英雄行，不扫描全英雄或物品表");
    fallback = true;
    assert(HeroCatalog.find(10101001, direct)?.icon === "hero/ui/hero-icon_20101001",
        "缺item_id时保留原有同模板物品hero-icon回退");
    assert(calls[calls.length - 1].name === GConfig.Item && calls[calls.length - 1].key === 10101001,
        "物品回退也只查询目标主键");
    omittedIcon = true;
    omittedElement = true;
    const incomplete = HeroCatalog.find(10101001, direct)!;
    assert(incomplete.icon === "hero/ui/hero-icon_20101001" && incomplete.elem === null,
        "可选item_id缺失仍走同源物品头像，缺元素明确为null，不猜默认元素");
    assert(HeroCatalog.find(999999999, direct) === null && HeroCatalog.find(0, direct) === null,
        "未知或非法模板保留明确缺失");
}

/** 按当前英雄配置核对头像，确保名册和出阵共用图标，不保留单独的名册副本。 */
async function checkSharedHeroPortraitAssets(): Promise<void> {
    const config = await ConfigFixtureUtils.installReal(new GameConfig());
    const iconIds = new Set(config.getConfig(GConfig.HeroType).map(row => row.item_id).filter(id => id > 0));
    const dir = join(root, "client/assets/bundles/module/hero/ui");
    for (const id of iconIds) {
        const file = join(dir, `hero-icon_${id}.png`);
        const duplicate = join(dir, `roster-hero-icon_${id}.png`);
        assert(existsSync(file) && existsSync(file + ".meta"), `缺少共享头像资源 ${id}`);
        assert(!existsSync(duplicate) && !existsSync(duplicate + ".meta"), `仍保留重复的名册头像 ${id}`);
    }
}

/** 页签复用当前英雄的红点分支，翻页和关窗不沿用上一英雄的提醒。 */
async function checkGrowthReminderTabs(): Promise<void> {
    const data = loadPrefab("client/assets/bundles/module/hero/prefabs/HeroInfoView.prefab");
    const detail = data.find(row => row.growthTabs)!;
    assert(detail.growthReminderAnchors.length === 4, "四个培养页签分别绑定提醒锚点");
    detail.growthReminderAnchors.forEach((ref: { __id__: number }, index: number) => {
        const anchor = data[ref.__id__];
        const tabButton = data[detail.growthTabs[index].__id__];
        assert(idOf(anchor._parent) === idOf(tabButton.node), "提醒跟随对应页签");
        assert(anchor._name === "GrowthReminderAnchor", "提醒锚点使用统一命名");
        assert(anchor._components.length === 1 && data[anchor._components[0].__id__].__type__ === "cc.UITransform",
            "页签只保存布局，显示使用公共预制体");
    });

    const model = HeroRosterModel.instance;
    const previous = model.snapshot;
    const hero = { id: "growth-red-dot", templateId: 10105008, star: 9, level: 120 };
    const reserve = { id: "growth-red-dot-reserve", templateId: 10101001, star: 1, level: 1 };
    const root = new Node("HeroInfoFixture");
    const view = root.addComponent(HeroInfoView);
    for (const name of HeroGrowthDisplayUtils.tabNames) {
        const tab = new Node(name);
        tab.parent = root;
        view.growthTabs.push(tab.addComponent(Button));
        view.growthTabLabels.push(new Node("Title").addComponent(Label));
        view.growthTabSelected.push(new Node("Selection"));
        const anchor = new Node("GrowthReminderAnchor");
        anchor.parent = tab;
        anchor.setPosition(46, 18, 0);
        anchor.addComponent(UITransform).setContentSize(28, 28);
        view.growthReminderAnchors.push(anchor);
    }
    const dots = RedDotManager.instance;
    const paths = [GameRedDotKey.heroUpgrade(hero.id), GameRedDotKey.heroStar(hero.id),
        GameRedDotKey.heroJewel(hero.id, 2), GameRedDotKey.heroGodEquipment(hero.id, 4)];
    try {
        model.replace({ ...previous, heroes: [hero, reserve], status: "ready" });
        view.runOpen({ heroId: hero.id, heroIds: [hero.id, reserve.id] });
        dots.setMany(Object.fromEntries(paths.map(path => [path, true])));
        await Promise.resolve();
        assert(view.growthReminderAnchors.every(anchor => anchor.getChildByName("RedDot")?.active), "四个培养分支独立点亮");
        dots.set(paths[1], false);
        assert(view.growthReminderAnchors[1].getChildByName("RedDot")?.active === false, "升星条件变化立即熄灭");
        assert(view.growthReminderAnchors[2].getChildByName("RedDot")?.active === true, "宝石提醒仍独立点亮");
        (view as unknown as { moveHero(step: 1): void }).moveHero(1);
        assert(view.growthReminderAnchors.every(anchor => !anchor.getChildByName("RedDot")?.active), "翻页不继承旧英雄提醒");
        assert(view.growthTabs[1].node.active === false, "无配方时不显示升星页签");
        dots.set(paths[1], true);
        assert(view.growthReminderAnchors.every(anchor => !anchor.getChildByName("RedDot")?.active), "旧英雄后续更新不串亮");
        view.runClose();
        assert(view.growthReminderAnchors.every(anchor => !anchor.getChildByName("RedDot")), "关页释放全部页签提醒");
    } finally {
        view.runDispose();
        root.destroy();
        dots.setMany(Object.fromEntries(paths.map(path => [path, false])));
        model.replace(previous);
    }
}

/** 顺序执行英雄页面和数据回归，最后报告全部检查结果。 */
async function main() {
  await ConfigFixtureUtils.installReal();
  await checkDirectTemplateLookup();
  await checkSharedHeroPortraitAssets();
  checkGrowthReference();
  await checkDefaultRoster();
  await checkReadonlyInfo();
  await checkLevelPresentation();
  await checkDetailIconContinuity();
  await checkReadonlySkillLifecycle();
  await checkElementBundleRoutes();
  await checkHeroCellReuse();
  const restoreRedDot = RedDotFixture.stubLoad();
  try {
    await checkHeroReminderReuse();
    await checkCreationReminderReuse();
    await checkGrowthReminderTabs();
    checkHeroScrollBounds();
    checkPrefab();
    await checkRemakeRoster();
  } finally {
    restoreRedDot();
  }
  console.log("hero-view-check passed: direct page bindings, roster rendering and selection, filter, current instance and late image isolation");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
