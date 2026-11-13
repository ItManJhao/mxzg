/** 英雄页面专项：验证真实名册、页面生命周期、资源Bundle路由与异步格子复用，不连接游戏服务器。 */
import { UIManager } from "../assets/scripts/framework/ui/UIManager";

/** 离线读取分组后的真实配置源文件，原config逻辑地址不变。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");
import { HeroInfoView } from "../assets/scripts/features/hero/ui/HeroInfoView";
import { HeroSkillView } from "../assets/scripts/features/hero/ui/HeroSkillView";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { RemakeConfigUtils } from "../assets/scripts/config/RemakeConfigUtils";
import { HeroRosterUtils } from "../assets/scripts/features/hero/utils/HeroRosterUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { ResourceAssetsUtils } from "../assets/scripts/framework/assets/ResourceAssetsUtils";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { HeroRosterEvent } from "../assets/scripts/features/hero/utils/HeroRosterEvent";
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

import { assetManager, Button, director, Director, Label, Mask, Node, Prefab, resources, Sprite, SpriteFrame, UITransform } from "cc";

import { HeroIconCellView } from "../assets/scripts/features/hero/ui/HeroIconCellView";

import { HeroListView } from "../assets/scripts/features/hero/ui/HeroListView";

/** 行为替身的视口高度，真实布局从完整HeroListView的SuperContent与Widget读取。 */
const HERO_PORT_H = 720;

import { AccountModel } from "../assets/scripts/features/account/AccountModel";

import { AccountService } from "../assets/scripts/features/account/AccountService";

import { HeroCatalog } from "../assets/scripts/features/hero/utils/HeroCatalog";

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
  for (const name of ["btn_hero", "btn_illustrat", "btn_dragon"]) {
    const node = layer.find(row => row._name === name)!;
    const title = layer.find(row => row.__type__ === "cc.Node" && row._name === "Label" && idOf(row._parent) === layer.indexOf(node))!;
    assert(uiHeight(layer, layer.indexOf(title)) === 32, name + "页签文字在Prefab保存可读高度");
    assert(name === "btn_hero" || node._active === false, "未开放页签在Prefab默认隐藏");
  }

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
  assert(uiHeight(boardData, idOf(scroll.node)) + 88 < uiHeight(boardData, boardData.findIndex(row => row._name === "spr_box")), "滚动视口与顶部偏移不超过装饰底板");
  const elems = board.comp.elemButtons as { __id__?: number }[];
  assert(elems.length === 6, "六个元素钮");
  for (let i = 0; i < elems.length; i++) {
    const button = boardData[elems[i].__id__!];
    assert(button.__type__ === "cc.Button", "第" + i + "个元素仍绑定Button");
  }

  const cellData = loadPrefab("client/assets/bundles/module/hero/prefabs/HeroIconCellView.prefab");
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
  const infoData = loadPrefab("client/assets/bundles/module/hero/prefabs/HeroInfoView.prefab");
  const info = component(infoData, infoType);
  assert((infoData[1]._components || []).some((row) => row.__id__ === info.index), "HeroInfoLayer 根上有 HeroInfoView");
  assert(infoData[idOf(info.comp.portrait)]._name === "node_equip", "立绘挂在 node_equip");
  assert(!("talk" in info.comp) && !("hitMenus" in info.comp), "只读详情不保留无用旧布局与养成台词绑定");
  assert(infoData.some(row => row._name === "Background"), "详情背景保存在完整Prefab");
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
  board.heroScroll = sized("HeroScroll", 540, HERO_PORT_H);
  board.heroScroll.parent = box;

  board.scroll = board.heroScroll.addComponent(SuperScroll);
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
  const elemRow = new Node("node_elem");
  elemRow.parent = node;
  board.elemButtons = [];
  for (let i = 0; i < 6; i++) {
    const button = buttonOn("btn_elem" + i);
    button.node.parent = elemRow;
    board.elemButtons.push(button);
  }
  const evolve = new Node("btn_evolve");
  evolve.parent = node;
  evolve.active = false;
  return board;
}

function makeView(): HeroListView {
  const scene = new Node("scene");
  const host = new Node("HeroListView");
  host.parent = scene;
  host.addComponent(UITransform).setContentSize(640, 960);
  const view = host.addComponent(HeroListView);
  view.btnHero = buttonOn("btn_hero");
  if (view.btnHero.node) view.btnHero.node.parent = host;
  const boardRoot = new Node("HeroBoard");
  boardRoot.parent = host;
  const board = makeBoard(boardRoot);
  view.heroScroll = board.scroll;
  view.emptyLabel = board.emptyLabel;
  view.capacityLabel = board.capacityLabel;
  view.elemButtons = board.elemButtons;

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

async function checkRemakeRoster(): Promise<void> {
  const model = new HeroRosterModel();
  const service = new HeroRosterController(model);
  service.initialize();service.resetSession();
  /** 模拟已由应用验收的统一回包，不再模拟已删除的查询接口。 */
  const sync=(heroes:OwnedHero[])=>service.onNotify(Protocol.STATE_CHANGED,{heroes,role:{},inventory:[],revision:1});
  const catalog = new HeroCatalog(JSON.parse(read("client/assets/bundles/resources/config/herotype.json")), JSON.parse(read("client/assets/bundles/resources/config/item.json")));
  const samples = [
    {id:"reserve",templateId:10101001,level:99,star:9,deployed:false},
    {id:"lower",templateId:10101001,level:1,star:3,deployed:true},
    {id:"higher",templateId:10101001,level:1,star:4,deployed:true},
    {id:"level",templateId:10101001,level:2,star:4,deployed:true},
    {id:"template",templateId:10101002,level:2,star:4,deployed:true},
  ];
  const sorted=HeroRosterUtils.present({status:"ready",heroes:samples,error:"",rosterInfo:{capacity:326,buySpaceTimes:1}},catalog,0);
  assert(sorted.capacityLine==="英雄：5/326","直接显示服务端总容量，不重复叠加 VIP");
  assert(sorted.cells.map(cell=>cell.instanceId).join(",")==="template,level,higher,lower,reserve","旧版上阵、星级、等级、模板优先级");
  assert(samples[0].id==="reserve","展示排序不修改唯一名册");
  const view = makeView();
  let notice = "";
  view.configure(model, catalog);
  const ui = UIManager.instance, originalOpen = ui.open, originalToast = ui.toast;
  const selectedIds: string[] = [];
  ui.toast = text => { notice = text; };
  ui.open = (async (ctor: unknown, args: { heroId: string }) => {
    assert(ctor === HeroInfoView, "选择直接打开英雄详情类");
    selectedIds.push(args.heroId);
    return view;
  }) as typeof ui.open;
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
    assert(!board.node.getChildByName("btn_evolve")!.active, "隐藏尚未接入的进化入口");
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
    assert(selectedIds.join() === "f45747b7-f032-4d00-9546-3504b9a967e5", "选择直接传入真实实例ID，不经过roster回调");
    board.elemButtons[2].node.emit(Button.EventType.CLICK); pump(1);
    assert(cellsOf(view).length === 0 && board.emptyLabel!.string === "没有符合筛选条件的英雄", "筛选空态");
    board.elemButtons[0].node.emit(Button.EventType.CLICK); pump(1);
    assert(cellsOf(view).length === 1, "切回全部显示英雄");
    assert(cells[0].lock!.active && cells[0].battle!.active,"自身锁定与上阵可同时显示");
    assert(!cells[0].face!.getComponent(Sprite)!.grayscale,"已拥有的锁定英雄不能灰显为未获得");
    view.runClose();
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
    ui.open = originalOpen;
    ui.toast = originalToast;
    view.runDispose();
    assert(EventDispatcher.instance.listenerCount(HeroRosterEvent.Updated)===baseline,"关页只清理本页名册监听");
    service.dispose(); view.node.destroy();

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
/** 使用真实英雄列表布局配置验证长列表末行可达、刷新保位以及过滤缩短后归位。 */
function checkHeroScrollBounds():void {
 const root=new Node("long-list"),board=makeBoard(root),scroll=board.scroll,list=scroll.list;
 const source=JSON.parse(read("client/assets/bundles/module/hero/prefabs/HeroListView.prefab"));const config=source.find((row:any)=>row.columns!==undefined);
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
 await GameConfig.instance.prepare([GConfig.HeroType,GConfig.Item]);
 const service=HeroRosterController.instance;service.initialize();service.resetSession();
 service.onNotify(Protocol.STATE_CHANGED,{revision:1,heroes:[],heroRoster:{capacity:300,buySpaceTimes:0}});
 const page=makeView();try {page.runOpen();await page.whenReady();pump(2);assert(boardOf(page).capacityLabel!.string==="英雄：0/300","实际默认装配显示容量");}
 finally {page.runDispose();page.node.destroy();service.dispose();}
}
/** 只读详情随快照刷新；应用重置只关闭页面，关闭后的同ID同步不能重新导航。 */
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
 const data=loadPrefab("client/assets/bundles/module/hero/prefabs/HeroInfoView.prefab");const buttons=data.filter((x:any)=>x.__type__==="cc.Button"&&x._interactable);
  const detail=data.find((row:any)=>row.equipmentIcons);
 assert(detail?.equipmentIcons.length===4&&detail.equipmentFrames.length===4&&detail.equipmentLabels.length===4,"四槽图标、品质框和状态文字必须静态绑定");
 for(let i=1;i<=4;i++){const slot=data.find((row:any)=>row._name==="EquipmentSlot"+i);assert(slot&&slot._components.every((ref:any)=>data[ref.__id__].__type__!=="cc.Button"||!data[ref.__id__]._interactable),"四槽没有穿脱操作入口");}
 assert(buttons.length===5,"详情仅返回和四个技能说明按钮可操作，不开放升级/扩容");
}
/** 技能窗口关闭后不响应同实例ID的新快照，重开读取当前状态。 */
async function checkReadonlySkillLifecycle(): Promise<void> {
    await RemakeConfigUtils.prepareHeroDetailConfig();
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

/** 顺序执行英雄页面和数据回归，最后报告全部检查结果。 */
async function main() {
  const original = ResourceAssetsUtils.loadConfig;
  ResourceAssetsUtils.loadConfig = async path => JSON.parse(readFileSync(resolveBundleFile(path + ".json"), "utf8"));
  try {
    await checkDefaultRoster();
    await checkReadonlyInfo();
    await checkReadonlySkillLifecycle();
    await checkElementBundleRoutes();
    await checkHeroCellReuse();
    checkHeroScrollBounds();
    checkPrefab();
    await checkRemakeRoster();
    console.log("hero-view-check passed: direct page bindings, roster rendering and selection, filter, current instance and late image isolation");
  } finally {
    ResourceAssetsUtils.loadConfig = original;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
