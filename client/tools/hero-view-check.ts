/** Display-only helpers retained for the Remake flow. */
/**
 * 英雄列表竖切的检查。不启动 Creator。
 * 核对开关、预制绑定、名册数据，以及经 UIManager 打开和关掉。
 *
 * npx --yes esbuild client/tools/hero-view-check.ts --bundle --platform=node --format=cjs --tsconfig=client/tools/tsconfig.check.json --outfile=/tmp/mxzg-hero-view-check.js && node /tmp/mxzg-hero-view-check.js
 */
import { readFileSync } from "fs";

import { join } from "path";

import { Button, director, Director, Label, Mask, Node, Prefab, ScrollView, Sprite, UITransform } from "cc";

import { HeroIconCellView } from "../assets/scripts/features/hero/ui/HeroIconCellView";

import { HeroListBoardView } from "../assets/scripts/features/hero/ui/HeroListBoardView";

import { HeroListView } from "../assets/scripts/features/hero/ui/HeroListView";

import { HERO_PORT_H } from "../assets/scripts/features/hero/ui/heroChrome";

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

function checkPrefab(): void {
  const viewType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroListView.ts.meta"));
  const boardType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroListBoardView.ts.meta"));
  const cellType = classId(metaUuid("client/assets/scripts/features/hero/ui/HeroIconCellView.ts.meta"));
  const layer = loadPrefab("client/assets/prefabs/ui/hero/HeroListView.prefab");
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

  const boardData = loadPrefab("client/assets/prefabs/ui/hero/HeroListBoardView.prefab");
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

  const cellData = loadPrefab("client/assets/prefabs/ui/hero/HeroIconCellView.prefab");
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
  const infoData = loadPrefab("client/assets/prefabs/ui/hero/HeroInfoView.prefab");
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
  node.name = "HeroIconCellView";
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
  node.name = "HeroListBoardView";
  node.setPosition(-320, -480, 0);
  const rootUi = node.getComponent(UITransform) || node.addComponent(UITransform);
  rootUi.setAnchorPoint(0.5, 0.5);
  rootUi.setContentSize(640, 960);
  const board = node.addComponent(HeroListBoardView);
  board.sprBox = sized("spr_box", 580, 450);
  board.sprBox.parent = node;
  board.heroScroll = sized("HeroScroll", 540, HERO_PORT_H);
  board.heroScroll.parent = board.sprBox;

  board.heroScroll.addComponent(ScrollView);
  board.heroPort = sized("view", 540, HERO_PORT_H);
  board.heroPort.parent = board.heroScroll;
  board.heroContent = sized("content", 540, 320);
  board.heroContent.parent = board.heroPort;
  board.heroPort.addComponent(Mask);
  board.heroScroll.getComponent(ScrollView)!.content = board.heroContent;
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
  const host = new Node("HeroListView");
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

function pump(frames: number): void {
  for (let i = 0; i < frames; i++) director.emit(Director.EVENT_AFTER_UPDATE);
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
  let notice = "";
  const controller = new HeroRosterController(model, service, catalog, view, text => { notice = text; });
  view.attachController(controller);
  try {
    // Deliberately contaminate the legacy store; the injected source must ignore it.
    assert(!read("client/assets/scripts/features/hero/ui/HeroListView.ts").includes("WireSession"), "no retired network source");
    view.runOpen(); await view.whenReady(); pump(2);
    const board = boardOf(view);

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
    assert(await pending === true && model.snapshot.status === "ready", "关闭页面不销毁模块，有效查询仍提交到当前角色名册");
  } finally {
    view.runDispose(); service.dispose(); view.node.destroy();

  }
}
async function main() { checkPrefab(); await checkRemakeRoster(); console.log("hero-view-check passed: preserved Prefab bindings, current roster, empty/error/retry/filter, actual instance values and late response isolation"); } main().catch(error => { console.error(error); process.exitCode=1; });
