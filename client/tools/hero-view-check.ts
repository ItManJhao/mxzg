/**
 * 英雄列表竖切的检查。不启动 Creator。
 * 核对开关、预制绑定、名册数据，以及经 UIManager 打开和关掉。
 *
 * npx --yes esbuild client/tools/hero-view-check.ts --bundle --platform=node --format=cjs --tsconfig=client/tools/tsconfig.check.json --outfile=/tmp/mxzg-hero-view-check.js && node /tmp/mxzg-hero-view-check.js
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Button, director, Director, Label, Layers, Mask, Node, Prefab, ScrollView, Sprite, UITransform, assetManager } from "cc";
import { ConfigDb, ConfigTableFile } from "../assets/scripts/config/ConfigLoader";
import { bindGameCatalog } from "../assets/scripts/config/gameCatalog";
import { GameLog } from "../assets/scripts/core/GameLog";
import { GameStore } from "../assets/scripts/core/GameStore";
import { Session } from "../assets/scripts/core/Session";
import { heroViewFromSearch, setUseHeroView, useHeroView } from "../assets/scripts/features/hero/config/HeroFeatureFlag";
import { HeroIconCellView } from "../assets/scripts/features/hero/ui/HeroIconCellView";
import { HeroInfoView } from "../assets/scripts/features/hero/ui/HeroInfoView";
import { HeroListBoardView } from "../assets/scripts/features/hero/ui/HeroListBoardView";
import { HeroListView } from "../assets/scripts/features/hero/ui/HeroListView";
import { HERO_PORT_H, seatHeroParchment } from "../assets/scripts/features/hero/ui/heroChrome";
import { isOpenCancelled, UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UILayer } from "../assets/scripts/framework/ui/UILayer";
import { viewCtorById, viewSpecOf } from "../assets/scripts/framework/ui/UIRegistry";
import { buildHeroList, heroCapacityLine, heroCellLine, heroCellSeat } from "../assets/scripts/module/hero/heroList";
import { WireHeroEntry } from "../assets/scripts/net/protocol/wireHero";
import { WireSession } from "../assets/scripts/net/WireSession";
import { clearPrefabCache } from "../assets/scripts/ui/prefabLoad";
import { barIndex, barSlideDir, pageContentReady, selectedBarId } from "../assets/scripts/ui/barSlide";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { HeroCatalog } from "../assets/scripts/features/hero/HeroCatalog";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { HeroRosterService } from "../assets/scripts/features/hero/HeroRosterService";
import { HeroRosterController } from "../assets/scripts/features/hero/HeroRosterController";
import type { OwnedHero } from "../assets/scripts/features/hero/HeroApi";

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

function assertNode(data: PrefabObj[], comp: PrefabObj, field: string, nodeId: number, nodeName: string): void {
  const id = idOf(comp[field]);
  assert(id === nodeId, field + " 应指向 " + nodeName + " #" + nodeId + "，实际 " + id);
  const node = data[nodeId];
  assert(node && node.__type__ === "cc.Node" && node._name === nodeName, field + " 指向的不是 " + nodeName);
}

function assertComp(data: PrefabObj[], comp: PrefabObj, field: string, compId: number, typeName: string): void {
  const id = idOf(comp[field]);
  assert(id === compId, field + " 应指向 " + typeName + " #" + compId + "，实际 " + id);
  const target = data[compId];
  assert(target && target.__type__ === typeName, field + " 指向的不是 " + typeName);
}

function checkFlag(): void {
  assert(heroViewFromSearch("") === true, "没有参数走新英雄页");
  assert(heroViewFromSearch("?hero=old") === false, "?hero=old 走旧英雄页");
  assert(heroViewFromSearch("?hero=0") === false, "hero=0 走旧英雄页");
  assert(heroViewFromSearch("?hero=false") === false, "hero=false 走旧英雄页");
  assert(heroViewFromSearch("?hero=new") === true, "hero=new 仍走新英雄页");
  assert(heroViewFromSearch("?bag=old") === true, "背包开关不关英雄");
  assert(heroViewFromSearch("?dev=wire&hero=old") === false, "hero=old 夹在别的参数里也生效");
  setUseHeroView(false);
  assert(useHeroView() === false, "关掉开关应回到旧英雄页");
  setUseHeroView(true);
  assert(useHeroView() === true, "打开开关走新英雄页");
}

function checkSources(): void {
  const views = [
    "client/assets/scripts/features/hero/ui/HeroListView.ts",
    "client/assets/scripts/features/hero/ui/HeroListBoardView.ts",
    "client/assets/scripts/features/hero/ui/HeroIconCellView.ts",
    "client/assets/scripts/features/hero/ui/HeroInfoView.ts",
  ];
  for (let i = 0; i < views.length; i++) {
    const text = read(views[i]);
    assert(text.indexOf("getChildByName") < 0, views[i] + " 不应 getChildByName");
    assert(text.indexOf("private async start(") < 0, views[i] + " 不要用 start 生命周期名");
    assert(text.indexOf("findNamed") < 0, views[i] + " 不应 findNamed");
    assert(text.indexOf("findNode") < 0, views[i] + " 不应 findNode");
    assert(text.indexOf("decodeWire") < 0, views[i] + " 不应解协议");
  }
  const list = read("client/assets/scripts/module/hero/heroList.ts");
  assert(list.indexOf("GameStore.heroes") >= 0, "名册读 GameStore");
  assert(list.indexOf("decodeWire") < 0, "列表数据不解字节");
  assert(list.indexOf("listHeroProfiles") >= 0, "图鉴读 herotype");
  const fill = read("client/assets/scripts/ui/screenFill.ts");
  assert(fill.indexOf("function fillHero") >= 0, "旧 fillHero 还在");
  assert(fill.indexOf("bindHeroPageTabs") >= 0, "旧页签绑定还在");
  assert(fill.indexOf("bindElemRow") >= 0, "旧元素筛选还在");
  const shell = read("client/assets/scripts/ui/pagePrefabShell.ts");
  assert(shell.indexOf("fillPageShell") >= 0, "旧壳仍会填英雄页");
  const main = read("client/assets/scripts/ui/MainApp.ts");
  assert(main.indexOf("useHeroView") >= 0, "MainApp 有英雄开关");
  assert(main.indexOf("UIManager.instance.open(HeroListView)") >= 0, "开关打开时走 HeroListView");
  assert(main.indexOf("attachPagePrefabShell") >= 0, "旧壳路径还在");
  assert(main.indexOf("this.panels?.openRoot(id)") >= 0, "旧底栏仍能 openRoot");
  const onTab = main.slice(main.indexOf("private onTab("), main.indexOf("private beginBarSlide"));
  const heroAt = onTab.indexOf('id === "hero" && useHeroView()');
  const heroEnd = onTab.indexOf("this.panels?.openRoot(id)", heroAt + 10);
  assert(heroAt >= 0 && heroEnd > heroAt, "底栏英雄分支还在");
  const heroBranch = onTab.slice(heroAt, heroEnd);
  assert(heroBranch.indexOf("openHeroView(true)") >= 0, "底栏英雄从根上打开");
  assert(heroBranch.indexOf("refreshChrome") < 0, "英雄还没进栈不能刷底栏");
  assert(heroBranch.indexOf("holdBarSlide") < 0, "底栏分支自己不提前收过场");
  const openHero = main.slice(main.indexOf("private openHeroView"), main.indexOf("private popAboveCity"));
  assert(openHero.indexOf("popAboveCity") >= 0, "底栏英雄先回到主城");
  assert(openHero.indexOf("holdBarSlide") >= 0, "英雄预制加载期间留着过场");
  assert(openHero.indexOf("dropWaitingBarSlide(\"hero\")") >= 0, "英雄打开失败丢掉未开始的过场");
  assert(main.indexOf("private popAboveCity") >= 0, "回到主城不取消过场");
  const manager = read("client/assets/scripts/framework/ui/UIManager.ts");
  assert(manager.indexOf("HeroList") < 0 && manager.indexOf("mountHero") < 0, "UIManager 不写死英雄");
  assert(!existsSync(join(root, "client/assets/prefabs/ui/hero/HeroPage.prefab")), "不恢复 HeroPage");
  assert(selectedBarId("hero", "city") === "hero", "当前是英雄时只亮英雄");
  assert(selectedBarId("bag", "hero") === "bag", "背包不跟英雄一起亮");
  assert(selectedBarId("city", "hero") === "city", "主城不跟英雄一起亮");
  assert(barSlideDir(barIndex("city"), barIndex("hero")) === 1, "主城到英雄从右进");
  assert(barSlideDir(barIndex("hero"), barIndex("bag")) === 1, "英雄到背包从右进");
  assert(barSlideDir(barIndex("bag"), barIndex("hero")) === -1, "背包到英雄从左进");
  assert(pageContentReady(["PagePrefabShell"]) === true, "英雄壳挂上就能滑");
  assert(pageContentReady(["ListBackdrop"]) === false, "只有岩洞底时还要等壳");
}

function checkPrefab(): void {
  const viewType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroListView.ts.meta"));
  const boardType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroListBoardView.ts.meta"));
  const cellType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroIconCellView.ts.meta"));
  const layer = loadPrefab("client/assets/prefabs/ui/hero/HeroListLayer.prefab");
  const view = component(layer, viewType);
  assert((layer[1]._components || []).some((row) => row.__id__ === view.index), "HeroListLayer 根上有 HeroListView");
  assertComp(layer, view.comp, "btnHero", 38, "cc.Button");
  assertComp(layer, view.comp, "btnBook", 52, "cc.Button");
  assertComp(layer, view.comp, "btnDragon", 66, "cc.Button");
  assertComp(layer, view.comp, "heroTitle", 44, "cc.Label");
  assertComp(layer, view.comp, "bookTitle", 58, "cc.Label");
  assertComp(layer, view.comp, "dragonTitle", 72, "cc.Label");
  assertNode(layer, view.comp, "tabMenu", 27, "UIMenu_1");
  assertNode(layer, view.comp, "hitLineup", 73, "UIMenu_2");
  assertNode(layer, view.comp, "hitBubbleMenu", 143, "CCMenu_1");
  assertNode(layer, view.comp, "bubble", 121, "node_bubble");
  assertNode(layer, view.comp, "layerCapacity", 105, "node_capacity");
  const boardPrefab = view.comp.boardPrefab as { __uuid__?: string };
  const cellPrefab = view.comp.cellPrefab as { __uuid__?: string };
  assert(boardPrefab.__uuid__ === "d3a470c0-fa13-47fa-811e-f38c7317e9d8", "boardPrefab 是 HeroListHeroLayer");
  assert(cellPrefab.__uuid__ === "e7c1a4b0-6d28-4f53-9c11-2a8b7e6d5c40", "cellPrefab 是 HeroIconCell");
  assertNode(layer, view.comp, "sprBg", 5, "spr_bg");
  assertNode(layer, view.comp, "parchment", 155, "ParchmentPlate");
  assertNode(layer, view.comp, "titleRoot", 11, "node_title");
  const infoPrefab = view.comp.infoPrefab as { __uuid__?: string };
  assert(infoPrefab.__uuid__ === "fa5d3f0c-1441-479b-a182-48d374c7dc6c", "infoPrefab 是 HeroInfoLayer");
  assert(uiHeight(layer, idOf(layer[44].node)) === 32, "英雄页签字有高度");
  assert(uiHeight(layer, idOf(layer[58].node)) === 32, "图鉴页签字有高度");
  assert(uiHeight(layer, idOf(layer[72].node)) === 32, "圣龙页签字有高度");

  const boardData = loadPrefab("client/assets/prefabs/ui/hero/HeroListHeroLayer.prefab");
  const rootPos = boardData[1]._lpos as { x?: number; y?: number };
  assert(rootPos.x === 0 && rootPos.y === 0, "HeroListHeroLayer 根在底左，不再写居中偏移");
  const board = component(boardData, boardType);
  assertNode(boardData, board.comp, "sprBox", 5, "spr_box");
  assertNode(boardData, board.comp, "heroScroll", 119, "HeroScroll");
  assertNode(boardData, board.comp, "heroPort", 123, "view");
  assertNode(boardData, board.comp, "heroContent", 127, "content");
  assertComp(boardData, board.comp, "emptyLabel", 139, "cc.Label");
  const emptyLabel = boardData[idOf(board.comp.emptyLabel)];
  assert(Number(emptyLabel._fontSize) >= 24 && Number(emptyLabel._lineHeight) >= 32, "空态文字在手机宽度下可读");
  assert(uiHeight(boardData, idOf(emptyLabel.node)) >= Number(emptyLabel._lineHeight) * 3,
    "错误原因和两行操作提示不能压进单行文本框后自动缩小");
  assertComp(boardData, board.comp, "capacityLabel", 88, "cc.Label");
  assertNode(boardData, board.comp, "elemRow", 17, "node_elem");
  assertNode(boardData, board.comp, "hitMenu", 89, "UIMenu_1");
  assertNode(boardData, board.comp, "skin", 93, "btn_permanent_skin");
  assertNode(boardData, board.comp, "evolve", 111, "btn_evolve");
  assertNode(boardData, board.comp, "pattern", 11, "CCSprite_1");
  assert(uiHeight(boardData, 119) === HERO_PORT_H, "滚动视口高 388，大约露出 3.5 行");
  assert(uiHeight(boardData, 123) === HERO_PORT_H, "view 跟滚动视口一样高");
  assert(uiHeight(boardData, 119) < 448, "视口不要撑到四行");
  assert(JSON.stringify(boardData).indexOf("永久皮肤") >= 0, "永久皮肤用简体");
  const elems = board.comp.elemButtons as { __id__?: number }[];
  assert(elems.length === 6, "六个元素钮");
  const elemIds = [32, 40, 48, 56, 64, 72];
  for (let i = 0; i < elemIds.length; i++) {
    assert(elems[i].__id__ === elemIds[i], "btn_elem" + i + " 绑定");
    assert(boardData[elemIds[i]].__type__ === "cc.Button", "btn_elem" + i + " 是 Button");
  }

  const cellData = loadPrefab("client/assets/prefabs/ui/hero/HeroIconCell.prefab");
  const cell = component(cellData, cellType);
  assertNode(cellData, cell.comp, "face", 19, "spr_face");
  assertComp(cellData, cell.comp, "nameLabel", 29, "cc.Label");
  assertNode(cellData, cell.comp, "elem", 31, "spr_elem");
  assertComp(cellData, cell.comp, "levelLabel", 71, "cc.Label");
  assertNode(cellData, cell.comp, "lock", 73, "spr_lock");
  assertNode(cellData, cell.comp, "battle", 79, "spr_battle");
  const stars = cell.comp.stars as { __id__?: number }[];
  assert(stars.map((row) => row.__id__).join(",") === "37,43,49,55,61", "五颗星按 star0 到 star4");

  const infoType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroInfoView.ts.meta"));
  const infoData = loadPrefab("client/assets/prefabs/ui/hero/HeroInfoLayer.prefab");
  const info = component(infoData, infoType);
  assert((infoData[1]._components || []).some((row) => row.__id__ === info.index), "HeroInfoLayer 根上有 HeroInfoView");
  assert(infoData[idOf(info.comp.portrait)]._name === "node_equip", "立绘挂在 node_equip");
  const talkLabel = infoData[idOf(info.comp.talk)];
  assert(talkLabel.__type__ === "cc.Label", "台词是 Label");
  assert(infoData[idOf(talkLabel.node)]._name === "lbl_talk", "台词节点是 lbl_talk");
  const infoText = JSON.stringify(infoData);
  assert(infoText.indexOf("图鉴") >= 0, "详情底栏有图鉴");
  assert(infoText.indexOf("穿上") >= 0 && infoText.indexOf("卸下") >= 0 && infoText.indexOf("升级") >= 0, "详情有穿上卸下升级");
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

function checkRegistry(): void {
  const spec = viewSpecOf(HeroListView);
  assert(spec !== null, "HeroListView 未注册");
  assert(spec.id === "hero", "页面 id 应是 hero");
  assert(spec.prefab === "prefabs/ui/hero/HeroListLayer", "预制路径");
  assert(spec.layer === UILayer.Page, "层应是 Page");
  assert(spec.cache === false, "英雄列表不缓存");
  assert(spec.allowMultiple === false, "英雄列表不叠两份");
  assert(typeof spec.mount === "function", "挂载在 ViewSpec 上");
  assert(viewCtorById("hero") === HeroListView, "id hero 应对回 HeroListView");
  assert(UIManager.instance.createPageHost("hero") === null, "没 open 时 presentPage 继续走旧壳");
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
  return prefab;
}

function makeCell(node: Node): void {
  node.name = "HeroIconCell";
  const cell = node.addComponent(HeroIconCellView);
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
    star.parent = node;
    cell.stars.push(star);
  }
  cell.levelLabel = labelOn(new Node("lbl_level"), "");
  if (cell.levelLabel.node) cell.levelLabel.node.parent = node;
  cell.lock = new Node("spr_lock");
  cell.lock.parent = node;
  cell.battle = new Node("spr_battle");
  cell.battle.parent = node;
}

function makeBoard(node: Node): HeroListBoardView {
  node.name = "HeroListHeroLayer";
  node.setPosition(-320, -480, 0);
  const rootUi = node.getComponent(UITransform) || node.addComponent(UITransform);
  rootUi.setAnchorPoint(0.5, 0.5);
  rootUi.setContentSize(640, 960);
  const board = node.addComponent(HeroListBoardView);
  board.sprBox = sized("spr_box", 580, 450);
  board.sprBox.parent = node;
  board.heroScroll = sized("HeroScroll", 540, 320);
  board.heroScroll.parent = board.sprBox;
  board.heroScroll.addComponent(Mask);
  board.heroScroll.addComponent(ScrollView);
  board.heroPort = sized("view", 540, 320);
  board.heroPort.parent = board.heroScroll;
  board.heroContent = sized("content", 540, 320);
  board.heroContent.parent = board.heroScroll;
  const empty = new Node("lbl_empty");
  board.emptyLabel = labelOn(empty, "");
  empty.parent = board.heroScroll;
  const cap = new Node("lbl_capacity");
  board.capacityLabel = labelOn(cap, "空间：20/40");
  const capHost = new Node("node_capacity");
  capHost.setPosition(605, 71.889, 0);
  capHost.parent = node;
  cap.parent = capHost;
  board.elemRow = new Node("node_elem");
  board.elemRow.parent = node;
  board.elemButtons = [];
  for (let i = 0; i < 6; i++) {
    const button = buttonOn("btn_elem" + i);
    if (button.node) button.node.parent = board.elemRow;
    board.elemButtons.push(button);
  }
  board.hitMenu = sized("UIMenu_1", 640, 960);
  board.hitMenu.parent = node;
  board.skin = new Node("btn_permanent_skin");
  board.skin.parent = node;
  const lower = new Node("bottom_menu");
  lower.setPosition(0, 31.6, 0);
  lower.parent = node;
  board.evolve = new Node("btn_evolve");
  board.evolve.parent = lower;
  board.pattern = new Node("CCSprite_1");
  board.pattern.setPosition(320, 47.5, 0);
  board.pattern.parent = node;
  return board;
}

function makeView(): HeroListView {
  const scene = new Node("scene");
  const host = new Node("HeroListLayer");
  host.parent = scene;
  host.addComponent(UITransform).setContentSize(640, 960);
  const view = host.addComponent(HeroListView);
  view.btnHero = buttonOn("btn_hero");
  view.btnBook = buttonOn("btn_illustrat");
  view.btnDragon = buttonOn("btn_dragon");
  if (view.btnHero.node) view.btnHero.node.parent = host;
  if (view.btnBook.node) view.btnBook.node.parent = host;
  if (view.btnDragon.node) view.btnDragon.node.parent = host;
  view.heroTitle = labelOn(new Node("heroTitle"), "英  雄");
  view.bookTitle = labelOn(new Node("bookTitle"), "图  鉴");
  view.dragonTitle = labelOn(new Node("dragonTitle"), "圣 龙");
  view.tabMenu = sized("UIMenu_1", 640, 960);
  view.tabMenu.parent = host;
  view.hitLineup = sized("UIMenu_2", 640, 960);
  view.hitLineup.parent = host;
  view.hitBubbleMenu = sized("CCMenu_1", 640, 960);
  view.hitBubbleMenu.parent = host;
  view.bubble = new Node("node_bubble");
  view.bubble.parent = host;
  view.layerCapacity = new Node("node_capacity");
  view.layerCapacity.parent = host;
  view.boardPrefab = fakePrefab((node) => {
    makeBoard(node);
  });
  view.cellPrefab = fakePrefab((node) => {
    makeCell(node);
  });
  return view;
}

function boardCount(view: HeroListView): number {
  let count = 0;
  const kids = view.node.children;
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].getComponent(HeroListBoardView)) count += 1;
  }
  return count;
}

function boardOf(view: HeroListView): HeroListBoardView {
  const kids = view.node.children;
  for (let i = 0; i < kids.length; i++) {
    const board = kids[i].getComponent(HeroListBoardView) as HeroListBoardView | null;
    if (board) return board;
  }
  throw new Error("没有挂上 HeroListHeroLayer");
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

function heroEntry(heroId: number, heroType: number, level: number, star: number, elem: number | null = null): WireHeroEntry {
  return {
    heroId,
    heroType,
    level,
    stage: null,
    star,
    elem,
    occupation: null,
    isLock: null,
    fighting: null,
  };
}

function noteHeroes(heroes: WireHeroEntry[] | null): void {
  GameStore.noteWire({
    enabled: true,
    account: "hero-check",
    serverId: 1,
    roleId: 1,
    name: "hero-check",
    nameSynced: true,
    level: 1,
    gold: null,
    diamond: null,
    nowIdx: null,
    maxIdx: null,
    heroes,
    bag: null,
    lineUp: null,
    unlockIds: null,
    rewardTime: null,
    maxRewardTime: null,
    battle: null,
  });
}

function bindTables(): void {
  const herotype: ConfigTableFile<Record<string, unknown>> = {
    table: "herotype",
    rows: [
      { type: 101, note: "雷顿", elem: 1, star: 4, item_id: 20701001 },
      { type: 102, note: "水灵", elem: 2, star: 3, item_id: 20701002 },
      { type: 103, note: "木灵", elem: 3, star: 2, item_id: 20701003 },
    ],
  };
  const tables = new Map<string, ConfigTableFile<Record<string, unknown>>>();
  tables.set("herotype", herotype);
  const db = new ConfigDb();
  db.tables = tables;
  ConfigDb.current = db;
  bindGameCatalog(tables);
}

const toasts: string[] = [];

function installNav(): { current: { id: string | null }; backs: { n: number } } {
  const current = { id: "city" as string | null };
  const backs = { n: 0 };
  UIManager.instance.install(
    {
      get current() {
        return current.id;
      },
      openChild(id: string) {
        current.id = id;
      },
      back() {
        if (!current.id || current.id === "city") return false;
        current.id = "city";
        backs.n += 1;
        return true;
      },
    },
    {
      showToast(text: string) {
        toasts.push(text);
      },
    }
  );
  return { current, backs };
}

function pump(frames: number): void {
  for (let i = 0; i < frames; i++) director.emit(Director.EVENT_AFTER_UPDATE);
}

async function openView(): Promise<HeroListView> {
  const view = makeView();
  view.onOpen();
  await view.whenReady();
  pump(2);
  return view;
}

function checkData(): void {
  bindTables();
  const previous = Session.source;
  const previousCap = WireSession.heroCapacity;
  const previousList = WireSession.heroes;
  try {
    GameStore.reset();
    Session.source = "mock";
    WireSession.heroCapacity = null;
    WireSession.heroes = null;
    const missing = buildHeroList("hero", 0);
    assert(missing.synced === false && missing.mode === "book", "未同步走图鉴，不造账号英雄");
    assert(missing.capacityLine === "空间 —/300", "未同步不留预制上的 20/40");
    assert(missing.capacityLine.indexOf("20/40") < 0, "容量字不含假的 20/40");
    assert(missing.cells.filter((cell) => cell.kind === "locked").length === 3, "未同步画出三张表里的锁");
    assert(missing.cells.filter((cell) => cell.kind === "owned").length === 0, "未同步没有已获得");
    assert(missing.cells.filter((cell) => cell.kind === "locked").every((cell) => cell.hero === null), "锁着的格子不写进名册");
    assert(heroCellLine(missing.cells[0]) === "雷顿未获得", "未获得用表里的名字");

    noteHeroes([]);
    const empty = buildHeroList("hero", 0);
    assert(empty.synced === true && empty.mode === "book", "空名册也画图鉴");
    assert(empty.capacityLine === "空间 0/300", "空名册人数是 0");
    assert(heroCellLine(empty.cells[2]) === "木灵未获得", "空名册不把图鉴当成已获得");

    noteHeroes([heroEntry(11, 101, 7, 4), heroEntry(12, 102, 3, 3)]);
    const roster = buildHeroList("hero", 0);
    assert(roster.mode === "roster" && roster.capacityLine === "空间 2/300", "有名册就画名册");
    assert(roster.cells.filter((cell) => cell.kind === "owned").length === 2, "两名英雄");
    assert(roster.cells[0].level === 7 && roster.cells[0].name === "雷顿", "等级和名字来自名册和表");
    assert(roster.cells[0].face === "ui/hero/hero-icon_20701001", "头像走 item_id");
    assert(heroCellLine(roster.cells[0]) === "雷顿 Lv7", "点击文案用真实等级");
    const fire = buildHeroList("hero", 1);
    assert(fire.cells.filter((cell) => cell.kind === "owned").length === 1 && fire.cells[0].name === "雷顿", "火系只留雷顿");
    const book = buildHeroList("book", 0);
    assert(book.mode === "book", "图鉴页签画整张表");
    assert(book.cells.filter((cell) => cell.kind === "locked").length === 1, "没获得的木灵上锁");
    assert(book.cells.filter((cell) => cell.kind === "owned").length === 2, "已获得的仍在图鉴里");

    Session.source = "wire";
    WireSession.heroCapacity = 40;
    assert(heroCapacityLine(GameStore.heroes()) === "空间 2/40", "真服容量用 4001 的 hero_capacity");
    WireSession.heroes = [heroEntry(19, 99, 1, 1, 3)];
    noteHeroes([heroEntry(19, 99, 1, 1)]);
    const fallback = buildHeroList("hero", 3);
    assert(fallback.cells.filter((cell) => cell.kind === "owned").length === 1, "表上没有元素时用已解开的字段 6");
    const seat = heroCellSeat(5);
    assert(seat.x === -162 + 108 && seat.y === -52 - 112, "第二行第二格沿用旧间距");
  } finally {
    Session.source = previous;
    WireSession.heroCapacity = previousCap;
    WireSession.heroes = previousList;
  }
}

async function checkPaint(): Promise<void> {
  bindTables();
  const nav = installNav();
  noteHeroes([heroEntry(11, 101, 7, 4), heroEntry(12, 102, 3, 3)]);
  const view = await openView();
  const board = boardOf(view);
  assert(boardCount(view) === 1, "只挂一份 HeroListHeroLayer");
  assert(board.node.position.x === 0 && board.node.position.y === 0, "板子收回羊皮纸底左");
  const boardUi = board.node.getComponent(UITransform);
  assert(boardUi !== null && boardUi.anchorX === 0 && boardUi.anchorY === 0, "板子锚点在底左");
  view.onOpen();
  pump(1);
  assert(boardCount(view) === 1, "再次打开不再挂第二份");
  assert(board.heroContent !== null && board.heroPort !== null && board.heroContent.parent === board.heroPort, "content 进了 view");
  const portUi = board.heroPort.getComponent(UITransform);
  assert(portUi !== null && portUi.contentSize.height === HERO_PORT_H, "运行时视口露出大约 3.5 行");
  assert(portUi.contentSize.height < 448 && portUi.contentSize.height > 320, "视口介于三行和四行之间");
  const boxUi = board.sprBox ? board.sprBox.getComponent(UITransform) : null;
  assert(boxUi !== null && boxUi.contentSize.height === 450, "不把内框撑高去塞满四行");
  assert(view.heroTitle !== null && view.heroTitle.string === "英  雄", "英雄页签有字");
  assert(view.bookTitle !== null && view.bookTitle.string === "图  鉴", "图鉴页签有字");
  assert(view.dragonTitle !== null && view.dragonTitle.string === "圣 龙", "圣龙页签有字");
  const titleUi = view.heroTitle.node.getComponent(UITransform);
  assert(titleUi !== null && titleUi.contentSize.height > 0, "页签字不是 0 高");
  assert(board.heroScroll !== null && board.heroScroll.getComponent(Mask) === null, "HeroScroll 上的 Mask 要摘掉");
  const portMask = board.heroPort.getComponent(Mask) as Mask | null;
  assert(portMask !== null && portMask.type === Mask.Type.GRAPHICS_RECT, "视口用矩形遮罩");
  assert(view.layerCapacity !== null && view.layerCapacity.active === false, "外层空间字让给板子");
  assert(view.bubble !== null && view.bubble.active === false, "调试气泡收起");
  assert(board.capacityLabel !== null && board.capacityLabel.string === "空间 2/300", "空间字换成名册");
  assert(board.capacityLabel.string.indexOf("20/40") < 0, "不留预制上的 20/40");
  const shown = cellsOf(view);
  assert(shown.length === 16, "不足四行也铺满");
  assert(shown[0].levelLabel !== null && shown[0].levelLabel.string === "7", "第一格等级是 7");
  assert(shown[0].lock !== null && shown[0].lock.active === false, "已获得不上锁");
  assert(shown[0].node.position.x === -162 && shown[0].node.position.y === -52, "第一格落在羊皮纸上");
  assert(shown[2].levelLabel !== null && shown[2].levelLabel.node.active === false, "空槽不写等级");
  const before = toasts.length;
  shown[2].node.emit(Button.EventType.CLICK);
  assert(toasts.length === before, "空槽不提示");
  shown[0].node.emit(Button.EventType.CLICK);
  assert(toasts[before] === "雷顿 Lv7", "点英雄用名册等级，不打开详情");
  if (view.btnDragon && view.btnDragon.node) view.btnDragon.node.emit(Button.EventType.CLICK);
  assert(toasts[before + 1] === "圣龙仍走旧英雄页", "圣龙不在这一刀");
  assert(board.evolve !== null && board.evolve.active === false, "英雄页不露出进化图鉴");
  if (view.btnBook && view.btnBook.node) view.btnBook.node.emit(Button.EventType.CLICK);
  pump(1);
  const booked = cellsOf(view);
  assert(booked.some((cell) => cell.lock !== null && cell.lock.active), "图鉴把未获得的锁上");
  assert(board.evolve !== null && board.evolve.active === true, "图鉴露出进化");
  assert(board.skin !== null && board.skin.active === false, "图鉴收起永久皮肤");
  const elem = board.elemButtons[1];
  if (elem && elem.node) elem.node.emit(Button.EventType.CLICK);
  pump(1);
  const fired = cellsOf(view).filter((cell) => cell.levelLabel !== null && cell.levelLabel.node.active);
  assert(fired.length === 1 && fired[0].levelLabel !== null && fired[0].levelLabel.string === "7", "火系图鉴只留雷顿这一只已获得");
  assert(board.elemButtons[1].node !== null && board.elemButtons[1].node.scale.x === 1, "选中的元素钮放大");
  assert(board.elemButtons[0].node !== null && board.elemButtons[0].node.scale.x === 0.8, "没选中的元素钮收回");
  const menuUi = view.hitLineup ? view.hitLineup.getComponent(UITransform) : null;
  assert(menuUi !== null && menuUi.contentSize.width === 0 && menuUi.contentSize.height === 0, "大 menu 收成 0");
  assert(view.tabMenu !== null && view.tabMenu.getComponent(UITransform) !== null, "页签那排还在");
  const tabUi = view.tabMenu.getComponent(UITransform) as UITransform;
  assert(tabUi.contentSize.width === 640, "页签 menu 不收成 0");

  nav.current.id = "city";
  view.close();
  assert(nav.backs.n === 0, "不在英雄页时关闭不拆栈");
  nav.current.id = "hero";
  view.close();
  assert(nav.backs.n === 1 && nav.current.id === "city", "在英雄页时关闭走页面栈返回");
  view.node.destroy();

  noteHeroes(null);
  const unsynced = await openView();
  const locked = cellsOf(unsynced).filter((cell) => cell.lock !== null && cell.lock.active);
  assert(locked.length === 3, "未同步画三张锁着的图鉴");
  assert(cellsOf(unsynced).every((cell) => !cell.levelLabel || cell.levelLabel.node.active === false), "未同步不写假等级");
  assert(boardOf(unsynced).capacityLabel !== null && boardOf(unsynced).capacityLabel!.string === "空间 —/300", "未同步空间是破折号");
  unsynced.node.destroy();

  noteHeroes([heroEntry(11, 101, 7, 4)]);
  const hidden = makeView();
  hidden.node.active = false;
  hidden.onOpen();
  await hidden.whenReady();
  assert(hidden.node.getComponent(HeroListView) !== null, "隐藏时视图还在");
  assert(cellsOf(hidden).length === 0, "还没进场景时不把格子挂出去");
  hidden.node.active = true;
  pump(2);
  assert(cellsOf(hidden).length === 16, "进场景后铺出格子");
  assert(cellsOf(hidden)[0].levelLabel !== null && cellsOf(hidden)[0].levelLabel!.string === "7", "进场景后画出雷顿");
  hidden.node.destroy();
}

function near(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) < 0.6;
}

async function checkWindow(): Promise<void> {
  bindTables();
  noteHeroes([heroEntry(11, 101, 7, 4)]);
  const seat = seatHeroParchment(441.75, 672, -480, 1);
  assert(seat.height > 900, "羊皮纸高度占满中部");
  assert(seat.top > 900, "纸的上沿贴住顶栏");
  assert(seat.bottom < 50, "纸的下沿贴住底栏");
  assert(seat.extraTop > 80, "页签要跟着纸上沿抬");
  const view = makeView();
  view.node.setPosition(-320, -480, 0);
  view.sprBg = sized("spr_bg", 640, 672);
  view.sprBg.setPosition(320, 441.75, 0);
  view.sprBg.parent = view.node;
  view.parchment = sized("ParchmentPlate", 640, 672);
  view.parchment.setPosition(320, 441.75, 0);
  view.parchment.parent = view.node;
  view.titleRoot = new Node("node_title");
  view.titleRoot.setPosition(320, 770.25, 0);
  view.titleRoot.parent = view.node;
  view.onOpen();
  await view.whenReady();
  pump(2);
  const bgUi = view.sprBg.getComponent(UITransform) as UITransform;
  const plateUi = view.parchment.getComponent(UITransform) as UITransform;
  assert(bgUi.contentSize.height > 900 && plateUi.contentSize.height > 900, "羊皮纸和垫片一起拉高");
  assert(near(view.sprBg.position.y, seat.centerY), "羊皮纸中心落在顶底栏之间");
  assert(near(view.titleRoot.position.y, 770.25 + seat.extraTop), "标题留在纸的上沿");
  const board = boardOf(view);
  assert(near(board.node.position.y, seat.extraTop), "格子板跟着纸上沿抬");
  const pattern = board.pattern;
  const capHost = board.capacityLabel && board.capacityLabel.node ? board.capacityLabel.node.parent : null;
  const evolveHost = board.evolve ? board.evolve.parent : null;
  assert(pattern !== null && near(pattern.position.y, seat.bottom + 36 - board.node.position.y), "花边贴住新的纸底");
  assert(capHost !== null && near(capHost.position.y, seat.bottom + 64 - board.node.position.y), "空间字贴住新的纸底");
  assert(evolveHost !== null && near(evolveHost.position.y, seat.bottom + 28 - board.node.position.y), "进化钮贴住新的纸底");
  const parked = board.node.position.y;
  view.onOpen();
  pump(1);
  assert(board.node.position.y === parked, "再次打开不再把纸抬第二次");
  view.node.destroy();
}

function walkNamed(node: Node, prefix: string, found: { hit: boolean }): void {
  if (node.name.indexOf(prefix) === 0) found.hit = true;
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) walkNamed(kids[i], prefix, found);
}

async function checkDetail(): Promise<void> {
  bindTables();
  const db = ConfigDb.current;
  assert(db !== null, "配置还在");
  if (!db) return;
  const herotalk: ConfigTableFile<Record<string, unknown>> = {
    table: "herotalk",
    rows: [{ level_min: 1, level_max: 99, lan: 70901, note: "十连召唤必出五星" }],
  };
  const language: ConfigTableFile<Record<string, unknown>> = {
    table: "language",
    rows: [{ key: 70901, value: "十连召唤必出五星" }],
  };
  db.tables.set("herotalk", herotalk);
  db.tables.set("language", language);
  noteHeroes([heroEntry(11, 101, 7, 4)]);
  const view = makeView();
  view.infoPrefab = fakePrefab((node) => {
    node.name = "HeroInfoLayer";
    const info = node.addComponent(HeroInfoView);
    info.portrait = new Node("node_equip");
    info.portrait.parent = node;
    info.talkBubble = new Node("spr_bubble");
    info.talkBubble.parent = node;
    info.talk = labelOn(new Node("lbl_talk"), "");
    if (info.talk.node) info.talk.node.parent = node;
    info.nameLabel = labelOn(new Node("lbl_hero_name"), "");
    if (info.nameLabel.node) info.nameLabel.node.parent = node;
    info.wearTitle = labelOn(new Node("wear"), "");
    if (info.wearTitle.node) info.wearTitle.node.parent = node;
    info.offTitle = labelOn(new Node("off"), "");
    if (info.offTitle.node) info.offTitle.node.parent = node;
    info.gradeTitle = labelOn(new Node("grade"), "");
    if (info.gradeTitle.node) info.gradeTitle.node.parent = node;
    info.settingTitle = labelOn(new Node("setting"), "");
    if (info.settingTitle.node) info.settingTitle.node.parent = node;
    info.unfoldTitle = labelOn(new Node("unfold"), "");
    if (info.unfoldTitle.node) info.unfoldTitle.node.parent = node;
    info.bookTitle = labelOn(new Node("book"), "");
    if (info.bookTitle.node) info.bookTitle.node.parent = node;
  });
  view.onOpen();
  await view.whenReady();
  pump(2);
  const before = toasts.length;
  const cell = cellsOf(view)[0];
  cell.node.emit(Button.EventType.CLICK);
  assert(toasts.length === before, "绑了详情就不只弹名字");
  const parent = view.node.parent;
  const sheet = parent ? parent.getChildByName("HeroDetailSheet") : null;
  assert(sheet !== null && sheet.children.length > 0, "详情盖在列表外面");
  const info = sheet.children[0].getComponent(HeroInfoView) as HeroInfoView | null;
  assert(info !== null && info.talk !== null && info.talk.string === "十连召唤必出五星", "详情台词来自 herotalk");
  assert(info.portrait !== null && info.portrait.active === true, "立绘宿主还在");
  const spine = { hit: false };
  walkNamed(info.portrait, "spine-", spine);
  assert(spine.hit, "详情挂上动态立绘节点");
  assert(info.bookTitle !== null && info.bookTitle.string === "图鉴", "详情底栏有图鉴");
  assert(info.wearTitle !== null && info.wearTitle.string === "穿上", "详情有穿上");
  assert(info.offTitle !== null && info.offTitle.string === "卸下", "详情有卸下");
  assert(info.gradeTitle !== null && info.gradeTitle.string === "升级", "详情有升级");
  assert(info.settingTitle !== null && info.settingTitle.string === "设置", "详情有设置");
  assert(info.unfoldTitle !== null && info.unfoldTitle.string === "展开", "详情有展开");
  view.node.destroy();
  if (sheet.isValid) sheet.destroy();
}

async function checkManager(): Promise<void> {
  bindTables();
  noteHeroes([heroEntry(11, 101, 7, 4)]);
  const stack: string[] = ["city"];
  const rootNode = new Node("pageLayer");
  let opens = 0;
  const highlights: string[] = [];
  UIManager.instance.install(
    {
      get current() {
        return stack[stack.length - 1] || null;
      },
      openChild(id: string) {
        opens += 1;
        const host = UIManager.instance.createPageHost(id);
        assert(host !== null && host.isValid && host.name === "LiveShell", "进栈的是已经装好的壳");
        assert(host.getChildByName("PagePrefabShell") !== null, "英雄壳跟背包一样先铺 PagePrefabShell");
        const names: string[] = [];
        for (let i = 0; i < host.children.length; i++) names.push(host.children[i].name);
        assert(pageContentReady(names) === true, "壳挂上之后过场可以播");
        host.parent = rootNode;
        stack.push(id);
      },
      back() {
        if (stack.length <= 1) return false;
        const id = stack.pop() || "";
        const host = rootNode.getChildByName("LiveShell");
        if (host) host.destroy();
        if (id) UIManager.instance.noteClosed(id);
        return true;
      },
    },
    {
      showToast(text: string) {
        toasts.push(text);
      },
      onPageOpened(id: string) {
        highlights.push(id);
      },
    }
  );
  clearPrefabCache();
  assetManager.loadBundle = (_name: string, cb: (err: Error | null, bundle: object | null) => void) => {
    cb(null, {
      load(inner: string, _type: unknown, done: (err: Error | null, asset: Prefab | null) => void) {
        const prefab = new Prefab() as Prefab & { _instantiate: () => Node };
        prefab._instantiate = () => {
          if (inner.indexOf("HeroListLayer") >= 0) {
            const view = makeView();
            view.node.name = "HeroListLayer";
            view.node.removeFromParent();
            return view.node;
          }
          if (inner.indexOf("HeroListHeroLayer") >= 0) {
            const node = new Node("HeroListHeroLayer");
            makeBoard(node);
            return node;
          }
          if (inner.indexOf("HeroIconCell") >= 0) {
            const node = new Node("HeroIconCell");
            makeCell(node);
            return node;
          }
          return new Node(inner.split("/").pop() || "prefab");
        };
        done(null, prefab);
      },
    });
  };
  const opened = await UIManager.instance.open(HeroListView);
  assert(opens === 1, "打开成功才压一层");
  assert(highlights[highlights.length - 1] === "hero", "进栈后才通知底栏");
  assert(stack[stack.length - 1] === "hero", "页面栈停在英雄");
  assert(cellsOf(opened).length === 16, "UIManager 打开后画出格子");
  assert(UIManager.instance.close(opened) === true, "装好的英雄页可以关");
  assert(stack[stack.length - 1] === "city", "关掉回到主城");
  assert(UIManager.instance.createPageHost("hero") === null, "关掉之后不再交出旧壳");

  clearPrefabCache();
  assetManager.loadBundle = (_name: string, cb: (err: Error | null, bundle: null) => void) => {
    cb(new Error("bundle down"), null);
  };
  assetManager.loadAny = (_request: unknown, cb: (err: Error | null, asset: null) => void) => {
    cb(new Error("uuid down"), null);
  };
  const toastAt = toasts.length;
  const opensBefore = opens;
  let failed = false;
  try {
    await UIManager.instance.open(HeroListView);
  } catch (err) {
    failed = !isOpenCancelled(err);
  }
  assert(failed, "预制加载失败要拒绝打开");
  assert(opens === opensBefore, "失败不能压栈");
  assert(toasts[toastAt] === "页面没有打开", "失败要有可见提示");
  assert(UIManager.instance.createPageHost("hero") === null, "失败后不能再交出空壳");
}

async function checkRemakeRoster(): Promise<void> {
  const account = new AccountModel();
  const accountService = new AccountService(account, {
    developmentLogin: async () => ({ session: { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" },
      role: { id: "hero-ui", nickname: "hero-ui", level: 1, gold: 0, diamonds: 0 } }),
    currentRole: async () => { throw new Error("not used"); },
  }, { read: () => null, write: () => {}, clear: () => {} });
  await accountService.login("hero_ui");
  const model = new HeroRosterModel();
  let resolve!: (heroes: OwnedHero[]) => void;
  let response = new Promise<OwnedHero[]>(done => { resolve = done; });
  const service = new HeroRosterService(model, account, accountService, { list: () => response });
  const catalog = new HeroCatalog(JSON.parse(read("client/assets/resources/config/herotype.json")), JSON.parse(read("client/assets/resources/config/item.json")));
  const view = makeView();
  const originalSync = WireSession.onSync;
  let wireSubscriptions = 0;
  WireSession.onSync = function (listener) { wireSubscriptions++; return originalSync.call(WireSession, listener); };
  let notice = "";
  const controller = new HeroRosterController(model, service, catalog, view, text => { notice = text; });
  view.attachController(controller);
  try {
    // Deliberately contaminate the legacy store; the injected source must ignore it.
    bindTables(); noteHeroes([heroEntry(11, 101, 7, 4)]);
    view.runOpen(); await view.whenReady(); pump(2);
    const board = boardOf(view);
    assert(wireSubscriptions === 0, "重做列表不订阅旧 WireSession");
    assert(cellsOf(view).length === 0, "加载时不读旧名册或图鉴");
    assert(board.emptyLabel!.string === "正在加载英雄…", "绘制加载状态");
    assert(!view.btnBook!.node.active && !view.btnDragon!.node.active, "隐藏未接入页签");
    assert(!board.skin!.active && !board.evolve!.active, "隐藏未接入养成按钮");
    resolve([]); await service.refresh(); pump(1);
    assert(board.emptyLabel!.string === "尚未获得英雄" && cellsOf(view).length === 0, "真实空名册不回退图鉴");
    assert(board.capacityLabel!.string === "英雄：0", "不显示旧协议容量");
    response = Promise.reject(new Error("读取失败"));
    view.btnHero!.node.emit(Button.EventType.CLICK); await service.refresh(); pump(1);
    assert(board.emptyLabel!.string.indexOf("点击上方“英雄”重试") >= 0, "失败保留重试入口");
    response = Promise.resolve([{ id: "f45747b7-f032-4d00-9546-3504b9a967e5", templateId: 10101001, level: 7, star: 4 }]);
    view.btnHero!.node.emit(Button.EventType.CLICK); await service.refresh(); pump(1);
    const cells = cellsOf(view);
    assert(cells.length === 1 && cells[0].nameLabel!.string === "独眼梦魇", "复用格子显示新名册与现有简体配置");
    assert(cells[0].levelLabel!.string === "7" && cells[0].stars.filter(node => node.active).length === 4, "等级和星级来自实例");
    cells[0].node.emit(Button.EventType.CLICK);
    assert(notice.indexOf("详情暂未开放") >= 0 && !view.node.parent!.getChildByName("HeroDetailSheet"), "不打开旧详情");
    board.elemButtons[2].node.emit(Button.EventType.CLICK); pump(1);
    assert(cellsOf(view).length === 0 && board.emptyLabel!.string === "没有符合筛选条件的英雄", "筛选空态");
    board.elemButtons[0].node.emit(Button.EventType.CLICK); pump(1);
    assert(cellsOf(view).length === 1, "切回全部显示英雄");
    response = new Promise<OwnedHero[]>(done => { resolve = done; });
    view.btnHero!.node.emit(Button.EventType.CLICK);
    const pending = service.refresh();
    view.runDispose(); resolve([{ id: "f45747b7-f032-4d00-9546-3504b9a967e5", templateId: 10101001, level: 7, star: 4 }]);
    assert(await pending === false && model.snapshot.status === "idle", "关闭后迟到响应作废");
  } finally {
    view.runDispose(); service.dispose(); view.node.destroy();
    WireSession.onSync = originalSync; GameStore.reset();
  }
}

async function main(): Promise<void> {
  await checkRemakeRoster();
  GameLog.shared.mirrorConsole = false;
  checkFlag();
  checkSources();
  checkPrefab();
  checkRegistry();
  checkData();
  await checkPaint();
  await checkWindow();
  await checkDetail();
  await checkManager();
  GameStore.reset();
  ConfigDb.current = null;
  bindGameCatalog(new Map());
  setUseHeroView(true);
  console.log("hero-view-check ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
