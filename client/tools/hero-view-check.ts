import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { HeroInfoView } from "../assets/scripts/features/hero/ui/HeroInfoView";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { presentHeroRoster } from "../assets/scripts/features/hero/HeroRosterPresentation";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { HeroRosterEvent } from "../assets/scripts/features/hero/HeroRosterEvent";
/** 英雄模块回归：核对显式初始化、唯一状态、事件清理和异步会话隔离。 */
import { HeroRosterController } from "../assets/scripts/features/hero/HeroRosterController";
/** Display-only helpers retained for the Remake flow. */
/**
 * 英雄列表竖切的检查。不启动 Creator。
 * 核对开关、预制绑定、名册数据，以及经 UIManager 打开和关掉。
 *
 * npx --yes esbuild client/tools/hero-view-check.ts --bundle --platform=node --format=cjs --tsconfig=client/tools/tsconfig.check.json --outfile=/tmp/mxzg-hero-view-check.js && node /tmp/mxzg-hero-view-check.js
 */
import { readFileSync } from "fs";

import { join } from "path";

import { Button, director, Director, Label, Mask, Node, Prefab, resources, Sprite, SpriteFrame, UITransform } from "cc";

import { HeroIconCellView } from "../assets/scripts/features/hero/ui/HeroIconCellView";

import { HeroListBoardView } from "../assets/scripts/features/hero/ui/HeroListBoardView";

import { HeroListView } from "../assets/scripts/features/hero/ui/HeroListView";

import { HERO_PORT_H } from "../assets/scripts/features/hero/ui/heroChrome";

import { AccountModel } from "../assets/scripts/features/account/AccountModel";

import { AccountService } from "../assets/scripts/features/account/AccountService";

import { HeroCatalog } from "../assets/scripts/features/hero/HeroCatalog";

import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";



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
  assert(boardPrefab.__uuid__ === "d3a470c0-fa13-47fa-811e-f38c7317e9d8", "boardPrefab 是 HeroListHeroLayer");
  assert(!("cellPrefab" in view.comp),"Cell 资源只在 SuperContent 维护");
  assertNode(layer, view.comp, "sprBg", 5, "CommonPanel1");
  assertNode(layer, view.comp, "parchment", 155, "ParchmentPlate");
  assert(!("titleRoot" in view.comp), "标题归 CommonPanel1 维护");
  assert(!("infoPrefab" in view.comp), "英雄列表不得保留未使用的旧详情资源绑定");
  assert(uiHeight(layer, idOf(layer[idOf(view.comp.heroTitle)].node)) === 32, "英雄页签字有高度");
  assert(uiHeight(layer, idOf(layer[idOf(view.comp.bookTitle)].node)) === 32, "图鉴页签字有高度");
  assert(uiHeight(layer, idOf(layer[idOf(view.comp.dragonTitle)].node)) === 32, "圣龙页签字有高度");

  const boardData = loadPrefab("client/assets/prefabs/ui/hero/HeroListBoardView.prefab");
  const listConfig=boardData.find((row:any)=>row.columns!==undefined) as any;
  assert(listConfig.columns===4 && listConfig.cellPrefab.__uuid__==="e7c1a4b0-6d28-4f53-9c11-2a8b7e6d5c40","SuperContent 四列及格子资源绑定");
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
  assert(uiHeight(boardData, 119) === HERO_PORT_H, "滚动视口延伸至容量栏上方");
  assert(uiHeight(boardData, 123) === HERO_PORT_H, "view 跟滚动视口一样高");
  assert(uiHeight(boardData, 119) + 88 < uiHeight(boardData, 5), "滚动视口与顶部偏移不超过装饰底板");
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
  (prefab as any).data=prefab._instantiate();
  return prefab;
}

function makeCell(node: Node): void {
  node.name = "HeroIconCellView";
  node.addComponent(UITransform).setContentSize(124,134);
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

  board.heroScroll.addComponent(SuperScroll);
  board.heroPort = sized("view", 540, HERO_PORT_H);
  board.heroPort.parent = board.heroScroll;
  board.heroContent = sized("content", 540, 320);
  board.heroContent.parent = board.heroPort;
  board.heroPort.addComponent(Mask);
  board.heroScroll.getComponent(SuperScroll)!.content = board.heroContent;
  board.heroContent.getComponent(UITransform)!.setAnchorPoint(0.5,1);
  const list=board.heroContent.addComponent(SuperContent);
  list.cellPrefab=fakePrefab(makeCell);list.columns=4;list.spacingX=12;list.spacingY=8;list.paddingLeft=60;list.paddingRight=60;
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
  const model = new HeroRosterModel();
  const service = new HeroRosterController(model);
  service.initialize();service.resetSession("local-1/hero-ui");
  /** 模拟已由应用验收的统一回包，不再模拟已删除的查询接口。 */
  const sync=(heroes:OwnedHero[])=>service.onNotify(Protocol.STATE_CHANGED,{heroes,role:{},inventory:[],revision:1});
  const catalog = new HeroCatalog(JSON.parse(read("client/assets/resources/config/herotype.json")), JSON.parse(read("client/assets/resources/config/item.json")));
  const samples = [
    {id:"reserve",templateId:10101001,level:99,star:9,deployed:false},
    {id:"lower",templateId:10101001,level:1,star:3,deployed:true},
    {id:"higher",templateId:10101001,level:1,star:4,deployed:true},
    {id:"level",templateId:10101001,level:2,star:4,deployed:true},
    {id:"template",templateId:10101002,level:2,star:4,deployed:true},
  ];
  const sorted=presentHeroRoster({status:"ready",heroes:samples,error:"",rosterInfo:{capacity:326,buySpaceTimes:1}},catalog,0);
  assert(sorted.capacityLine==="英雄：5/326","直接显示服务端总容量，不重复叠加 VIP");
  assert(sorted.cells.map(cell=>cell.instanceId).join(",")==="template,level,higher,lower,reserve","旧版上阵、星级、等级、模板优先级");
  assert(samples[0].id==="reserve","展示排序不修改唯一名册");
  const view = makeView();
  let notice = "";
  view.configureRoster(model,service,catalog,text=>{notice=text;});
  const baseline=EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated);
  try {
    // Deliberately contaminate the legacy store; the injected source must ignore it.
    assert(!read("client/assets/scripts/features/hero/ui/HeroListView.ts").includes("WireSession"), "no retired network source");
    view.runOpen(); await view.whenReady(); pump(2);
    assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated)===baseline+1,"开页只增加一个名册监听");
    view.runOpen();
    assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated)===baseline+1,"重复开页不叠加监听");
    const board = boardOf(view);

    assert(cellsOf(view).length === 0, "加载时不读旧名册或图鉴");
    assert(board.emptyLabel!.string === "正在加载英雄…", "绘制加载状态");
    assert(!view.btnBook!.node.active && !view.btnDragon!.node.active, "隐藏未接入页签");
    assert(!board.skin!.active && !board.evolve!.active, "隐藏未接入养成按钮");
    sync([]); pump(1);
    assert(board.emptyLabel!.string === "尚未获得英雄" && cellsOf(view).length === 0, "真实空名册不回退图鉴");
    assert(board.capacityLabel!.string === "英雄：0/—", "不显示旧协议容量");
    view.btnHero!.node.emit(Button.EventType.CLICK); pump(1);
    assert(notice.includes("自动同步"), "点击不发送重复查询");
    sync([{ id: "f45747b7-f032-4d00-9546-3504b9a967e5", templateId: 10101001, level: 7, star: 4, locked:true, deployed:true }]);pump(1);
    const cells = cellsOf(view);
    assert(cells.length === 1 && !cells[0].nameLabel!.node.active, "正式列表不在头像上叠名称");
    assert(cells[0].levelLabel!.string === "7" && cells[0].stars.filter(node => node.active).length === 4, "等级和星级来自实例");
    cells[0].node.emit(Button.EventType.CLICK);
    assert(notice.indexOf("详情暂未开放") >= 0 && !view.node.parent!.getChildByName("HeroDetailSheet"), "不打开旧详情");
    board.elemButtons[2].node.emit(Button.EventType.CLICK); pump(1);
    assert(cellsOf(view).length === 0 && board.emptyLabel!.string === "没有符合筛选条件的英雄", "筛选空态");
    board.elemButtons[0].node.emit(Button.EventType.CLICK); pump(1);
    assert(cellsOf(view).length === 1, "切回全部显示英雄");
    assert(cells[0].lock!.active && cells[0].battle!.active,"自身锁定与上阵可同时显示");
    assert(!cells[0].face!.getComponent(Sprite)!.grayscale,"已拥有的锁定英雄不能灰显为未获得");
    view.runDispose();sync([]);
    assert(model.snapshot.status === "ready" && model.snapshot.heroes.length === 0,"页面关闭后模块继续接收同步");
  } finally {
    view.runDispose();
    assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated)===baseline,"关页只清理本页名册监听");
    service.dispose(); view.node.destroy();

  }
}

/** 英雄格子复用后旧头像不能覆盖新英雄，点击只触发最新回调，销毁后迟到结果失效。 */
function checkHeroCellReuse():void {
 const root=new Node("reuse");makeCell(root);const cell=root.getComponent(HeroIconCellView)!;
 const original=resources.load;const pending:Array<{path:string;done:(err:any,asset:any)=>void}>=[];
 resources.load=((path:any,type:any,done:any)=>{pending.push({path,done});}) as any;
 try {
  const face=(path:string)=>({kind:"owned" as const,name:path,showName:true,face:path,elem:null,stars:1,level:1,locked:false,deployed:false});
  let old=0,current=0;cell.show(face("A"),()=>old++);cell.show(face("B"),()=>current++);cell.show(face("B"),()=>current++);
  root.emit(Button.EventType.CLICK);assert(old===0 && current===1,"只保留最新点击");
  const a=new SpriteFrame(),b=new SpriteFrame();pending.filter(x=>x.path==="B/spriteFrame").forEach(x=>x.done(null,b));
  pending.filter(x=>x.path==="A/spriteFrame").forEach(x=>x.done(null,a));
  assert(cell.face!.getComponent(Sprite)!.spriteFrame===b,"迟到旧头像不能覆盖新英雄");
  cell.show(face("C"),null);cell.onDestroy();pending.filter(x=>x.path==="C/spriteFrame").forEach(x=>x.done(null,a));
  assert(cell.face!.getComponent(Sprite)!.spriteFrame===null,"销毁后不写回头像");
 }finally{resources.load=original;root.destroy();}
}
/** 使用真实英雄列表布局配置验证长列表末行可达、刷新保位以及过滤缩短后归位。 */
function checkHeroScrollBounds():void {
 const root=new Node("long-list"),board=makeBoard(root),scroll=board.scroll,list=scroll.list;
 const source=JSON.parse(read("client/assets/prefabs/ui/hero/HeroListBoardView.prefab"));const config=source.find((row:any)=>row.columns!==undefined);
 for(const key of ["columns","rows","layoutType","gridAxis"] as const)list[key]=config[key];
 for(const key of ["spacingX","spacingY","paddingLeft","paddingRight","paddingTop","paddingBottom"] as const)list[key]=config["_"+key];
 list.setData(Array.from({length:20},(_,i)=>i),()=>{});
 assert(board.heroContent!.getComponent(UITransform)!.height===750,"真实格子和间距计算长列表高度");
 scroll.restorePosition({x:0,y:30} as any);assert(scroll.readPosition().y===30,"末行可达");
 list.refresh();assert(scroll.readPosition().y===30,"普通刷新保留位置");
 list.setData([1,2,3],()=>{});assert(scroll.readPosition().y===0,"筛选缩短不留下空白滚动区域");root.destroy();
}

/** 验证应用实际开页无需测试注入，使用唯一模块和已准备配置。 */
async function checkDefaultRoster():Promise<void> {
 GameConfig.instance.initialize(async path=>JSON.parse(read("client/assets/resources/"+path+".json")));
 await GameConfig.instance.prepare([GConfig.HeroType,GConfig.Item]);
 const service=HeroRosterController.instance;service.initialize();service.resetSession("local-1/default");
 service.onNotify(Protocol.STATE_CHANGED,{revision:1,heroes:[],heroRoster:{capacity:300,buySpaceTimes:0}});
 const page=makeView();try {page.runOpen();await page.whenReady();pump(2);assert(boardOf(page).capacityLabel!.string==="英雄：0/300","实际默认装配显示容量");}
 finally {page.runDispose();page.node.destroy();service.dispose();}
}
/** 只读详情随统一快照刷新，删除与换号返回，关闭后解除监听。 */
async function checkReadonlyInfo():Promise<void> {
 const controller=HeroRosterController.instance;controller.initialize();controller.resetSession("local-1/info");
 const hero={id:"00000000-0000-4000-8000-000000000001",templateId:10101001,level:1,star:1,stage:0,baseStats:{hp:120,atk:30,def:10,spd:100}};
 const sync=(rows:any[])=>controller.onNotify(Protocol.STATE_CHANGED,{revision:1,heroes:rows});sync([hero]);
 const root=new Node("info"),page=root.addComponent(HeroInfoView);page.summary=new Node("summary").addComponent(Label);page.attributes=Array.from({length:4},()=>new Node("attr").addComponent(Label));
 (page as any).mountPortrait=()=>{};
 const ui=UIManager.instance,original=ui.back,originalOpen=ui.openById;let backs=0,lists=0;ui.back=()=>{backs++;return true;};ui.openById=(async(id:string)=>{assert(id==="hero","详情明确返回英雄列表");lists++;return page;}) as typeof ui.openById;
 const before=EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated);
 try {page.onOpen({heroId:hero.id});assert(page.attributes[0].string==="攻击：30","展示服务器基础属性");sync([{...hero,level:2,baseStats:{...hero.baseStats,atk:35}}]);assert(page.attributes[0].string==="攻击：35","同步后详情更新");(page as any).goBack();assert(lists===1,"返回按钮打开列表而非主城");sync([]);assert(lists===2,"实例删除返回列表");controller.resetSession(null);assert(backs===1,"退出账号返回根页面");page.onClose();assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated)===before,"关页释放详情监听");}
 finally {page.onClose();ui.back=original;ui.openById=originalOpen;controller.dispose();root.destroy();}
 const data=loadPrefab("client/assets/prefabs/ui/hero/HeroInfoView.prefab");const buttons=data.filter((x:any)=>x.__type__==="cc.Button"&&x._interactable);
  const detail=data.find((row:any)=>row.equipmentIcons);
 assert(detail?.equipmentIcons.length===4&&detail.equipmentFrames.length===4&&detail.equipmentLabels.length===4,"四槽图标、品质框和状态文字必须静态绑定");
 for(let i=1;i<=4;i++){const slot=data.find((row:any)=>row._name==="EquipmentSlot"+i);assert(slot&&slot._components.every((ref:any)=>data[ref.__id__].__type__!=="cc.Button"||!data[ref.__id__]._interactable),"四槽没有穿脱操作入口");}
 assert(buttons.length===5,"详情仅返回和四个技能说明按钮可操作，不开放升级/扩容");
}
async function main() { await checkDefaultRoster();await checkReadonlyInfo(); checkHeroCellReuse();checkHeroScrollBounds();checkPrefab(); await checkRemakeRoster(); console.log("hero-view-check passed: preserved Prefab bindings, current roster, empty/sync/filter, actual instance values and late response isolation"); } main().catch(error => { console.error(error); process.exitCode=1; });
