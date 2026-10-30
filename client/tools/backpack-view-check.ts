/**
 * 背包新视图的行为检查。不进 Creator，不读 resources。
 * 预制绑定看 JSON。格子、页签、详情用假实例把 @property 填上，相当于反序列化之后。
 */
import { readFileSync } from "fs";
import { _decorator, assetManager, Button, createdNodes, director, Director, Label, Layers, Mask, Node, Prefab, ScrollView, Sprite, UITransform } from "cc";
import { bindGameCatalog } from "../assets/scripts/config/gameCatalog";
import { clearPrefabCache } from "../assets/scripts/ui/prefabLoad";
import { ConfigDb } from "../assets/scripts/config/ConfigLoader";
import { ConfigTableFile } from "../assets/scripts/config/types";
import { GameLog } from "../assets/scripts/core/GameLog";
import { BagModel } from "../assets/scripts/features/Bag/BagModel";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { BagController } from "../assets/scripts/features/Bag/BagController";
import { BagEvent } from "../assets/scripts/features/Bag/BagEvent";
import { remakeConfig } from "../assets/scripts/config/RemakeConfig";
import { BaseView } from "../assets/scripts/framework/ui/BaseView";
import { BagInfoView } from "../assets/scripts/features/Bag/ui/BagInfoView";
import { BagItemView } from "../assets/scripts/features/Bag/ui/BagItemView";
import { BagTabView } from "../assets/scripts/features/Bag/ui/BagTabView";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { SuperContent } from "../assets/scripts/framework/ui/SuperContent";
import { fillPageShell } from "../assets/scripts/ui/screenFill";
import { BagView } from "../assets/scripts/features/Bag/ui/BagView";
import { UILayer } from "../assets/scripts/framework/ui/UILayer";
import { isOpenCancelled, UIManager } from "../assets/scripts/framework/ui/UIManager";
import { view, viewCtorById, viewSpecOf } from "../assets/scripts/framework/ui/UIRegistry";

const { ccclass } = _decorator;

@view({
  id: "life",
  prefab: "prefabs/test/Life",
  load: () => loadTestPrefab("test/Life"),
  layer: UILayer.Page,
  cache: true,
  allowMultiple: false,
})
@ccclass("LifeView")
class LifeView extends BaseView {
  static creates = 0;
  static binds = 0;
  static opens = 0;
  static closes = 0;
  static unbinds = 0;
  static disposes = 0;

  onCreate(): void {
    LifeView.creates += 1;
  }

  onBind(): void {
    LifeView.binds += 1;
  }

  onOpen(): void {
    LifeView.opens += 1;
  }

  onClose(): void {
    LifeView.closes += 1;
  }

  onUnbind(): void {
    LifeView.unbinds += 1;
  }

  dispose(): void {
    LifeView.disposes += 1;
  }
}

@view({
  id: "multi",
  prefab: "prefabs/test/Multi",
  load: () => loadTestPrefab("test/Multi"),
  layer: UILayer.Page,
  cache: false,
  allowMultiple: true,
})
@ccclass("MultiView")
class MultiView extends BaseView {
  static opens = 0;

  onOpen(): void {
    MultiView.opens += 1;
  }
}

/** Test fixtures use the injected loader; they are deliberately outside the shipped Prefab plan. */
function loadTestPrefab(path: string): Promise<Prefab> {
  return new Promise((resolve, reject) => {
    assetManager.loadBundle("test", (error, bundle) => {
      if (error || !bundle) { reject(error || new Error("test bundle missing")); return; }
      bundle.load(path, Prefab, (failure, asset) => {
        if (failure || !asset) reject(failure || new Error("test prefab missing"));
        else resolve(asset);
      });
    });
  });
}

const CELL_UUID = "c4e8a1b2-7d33-4f61-9a20-6b5e0d4c8f11";
const TAB_UUID = "d5f9b2c3-8e44-4072-ab31-7c6f1e5d9022";
const INFO_UUID = "f151a2c1-a24a-4e5d-9d67-2096089cde82";
const DIM_UUID = "2b05e8f4-a16c-4397-d055-6ecf12a19084";
const VIEW_TYPE = "7b14eCiPFhNH45qnwssTV5h";
const CELL_TYPE = "8c25fGzTWlOIJ97oBw9Xm9y";
const TAB_TYPE = "9d360LEXnpPMaCMsS1Ob3CD";
const INFO_TYPE = "ae471PVb4tAQrGdwj5fcIGU";

type PrefabObj = {
  __type__?: string;
  _name?: string;
  _components?: { __id__?: number }[];
  __id__?: number;
  __uuid__?: string;
  node?: { __id__?: number } | null;
  [key: string]: unknown;
};

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

function openLineCount(): number {
  const recent = GameLog.shared.recent();
  let n = 0;
  for (let i = 0; i < recent.length; i++) {
    if (recent[i].message.indexOf("打开界面 ") === 0) n += 1;
  }
  return n;
}

function assertOpenLine(viewName: string, prefab: string): void {
  const recent = GameLog.shared.recent();
  const line = recent[recent.length - 1];
  const head = "打开界面 " + viewName + " ui " + prefab + " 耗时 ";
  assert(line.tag === "UIManager" && line.level === "info" && line.message.indexOf(head) === 0, "UIManager open log " + (line ? line.tag + " " + line.message : "(none)"));
  assert(line.message.lastIndexOf("ms") === line.message.length - 2, "open log ends with milliseconds");
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function prefabAt(path: string): PrefabObj[] {
  return JSON.parse(read(path)) as PrefabObj[];
}

function idOf(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const id = (value as { __id__?: number }).__id__;
  return typeof id === "number" ? id : null;
}

function spriteFrameOf(data: PrefabObj[], nodeId: number): string {
  const node = data[nodeId];
  const comps = node._components || [];
  for (let i = 0; i < comps.length; i++) {
    const comp = data[comps[i].__id__];
    if (!comp || comp.__type__ !== "cc.Sprite") continue;
    const frame = comp._spriteFrame as { __uuid__?: string } | null;
    return frame && frame.__uuid__ ? frame.__uuid__ : "";
  }
  return "";
}

function uuidOf(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const uuid = (value as { __uuid__?: string }).__uuid__;
  return typeof uuid === "string" ? uuid : "";
}

function componentOn(data: PrefabObj[], typeName: string): { index: number; comp: PrefabObj } {
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i].__type__ === typeName) return { index: i, comp: data[i] };
  }
  throw new Error("预制上没有组件 " + typeName);
}

function assertNodeRef(data: PrefabObj[], comp: PrefabObj, field: string, nodeId: number, nodeName: string): void {
  const id = idOf(comp[field]);
  const node = data[id!];
  assert(node && node.__type__ === "cc.Node" && node._name === nodeName, field + " 指向的不是 " + nodeName);
}

function assertCompRef(data: PrefabObj[], comp: PrefabObj, field: string, compId: number, typeName: string): void {
  const id = idOf(comp[field]);
  const target = data[id!];
  assert(target && target.__type__ === typeName, field + " 指向的不是 " + typeName);
}

function assertRootOwns(data: PrefabObj[], compIndex: number): void {
  const root = data[1];
  const ids = (root._components || []).map((row) => row.__id__);
  assert(ids.indexOf(compIndex) >= 0, "根节点组件列表没有 " + compIndex);
  const comp = data[compIndex];
  assert(comp && idOf(comp.node) === 1, "组件 node 应是根节点");
}

function checkPrefabBindings(): void {
  const layer = prefabAt("client/assets/prefabs/ui/backpack/BackpackLayer.prefab");
  const view = componentOn(layer, VIEW_TYPE);
  assertRootOwns(layer, view.index);
  assertNodeRef(layer, view.comp, "sprBox", 10, "spr_box");
  const scroll=layer[idOf(view.comp.bagScroll)!],scrollNode=layer[idOf(scroll.node)!];
  assert(scrollNode._name==="BagScroll"&&scroll.__type__!=="cc.ScrollView","BagView binds the one SuperScroll");
  const content=layer[idOf(scroll._content)!],port=layer[idOf(content._parent)!];
  assert(content._name==="content"&&port._name==="view"&&idOf(port._parent)===idOf(scroll.node),"source Prefab owns BagScroll/view/content hierarchy");
  assert(layer.some(row=>row.__type__==="cc.Mask"&&idOf(row.node)===idOf(content._parent)),"viewport owns Mask");
  assertNodeRef(layer, view.comp, "tabContent", 41, "content");
  assertNodeRef(layer, view.comp, "bubble", 83, "spr_bubble_bg");
  assertCompRef(layer, view.comp, "talk", 99, "cc.Label");
  assertNodeRef(layer, view.comp, "portrait", 91, "node_portrait");
  assertNodeRef(layer, view.comp, "hitMenu", 48, "UIMenu_1");
  assert(view.comp.btnClose === null, "BackpackLayer 没有关闭按钮，btnClose 应是 null");
  assert(uuidOf(layer.find(row => "overrideCellSize" in row)!.cellPrefab) === CELL_UUID, "SuperContent.cellPrefab uuid");
  assert(uuidOf(view.comp.tabPrefab) === TAB_UUID, "tabPrefab uuid");
  assert(uuidOf(view.comp.infoPrefab) === INFO_UUID, "infoPrefab uuid");
  assert(uuidOf(view.comp.dimPrefab) === DIM_UUID, "dimPrefab uuid");

  const cellData = prefabAt("client/assets/prefabs/ui/backpack/BackpackItemCell.prefab");
  const cell = componentOn(cellData, CELL_TYPE);
  assertRootOwns(cellData, cell.index);
  assertNodeRef(cellData, cell.comp, "frame", 5, "spr_frame");
  assertNodeRef(cellData, cell.comp, "icon", 17, "spr_icon");
  assertCompRef(cellData, cell.comp, "count", 27, "cc.Label");
  assertNodeRef(cellData, cell.comp, "selectMark", 11, "spr_select");
  const slotPlate = "5e56f13c-937b-4e86-a0d7-b8abb2aa05fb@f9941";
  const selectFrame = "6c69245c-edfa-463d-a6a4-c897ba93ac12@f9941";
  assert(spriteFrameOf(cellData, 5) === slotPlate, "spr_frame 底图应是 common/other_rare-0");
  assert(spriteFrameOf(cellData, 11) === selectFrame, "spr_select 仍是选中框");
  assert(spriteFrameOf(cellData, 5) !== spriteFrameOf(cellData, 11), "底图不能和选中框同一张");
  assert(cellData[17]._active === false, "空槽预制不能默认亮着问号图标");
  const portrait = layer[idOf(view.comp.portrait)!];
  assert(portrait._lscale.x === 1 && portrait._lscale.y === 1, "店员立绘是 1 倍，不再缩成一小块");
  assert(portrait._lpos.x === 200 && portrait._lpos.y === 748, "店员抬至羊皮纸上沿，身体仍落在背包底图后面");
  const order = (layer[1]._children || []).map((row) => row.__id__);
  assert(order[0] === idOf(view.comp.portrait), "node_portrait 画在羊皮纸和 spr_bg 下面");

  const tabData = prefabAt("client/assets/prefabs/ui/backpack/BackpackTabButton.prefab");
  const tab = componentOn(tabData, TAB_TYPE);
  assertRootOwns(tabData, tab.index);
  assertCompRef(tabData, tab.comp, "title", 13, "cc.Label");
  assertCompRef(tabData, tab.comp, "button", 7, "cc.Button");

  const infoData = prefabAt("client/assets/prefabs/ui/backpack/BackpackInfoLayer.prefab");
  const info = componentOn(infoData, INFO_TYPE);
  assertRootOwns(infoData, info.index);
  assertNodeRef(infoData, info.comp, "bg", 4, "spr_bg");
  assertCompRef(infoData, info.comp, "propName", 22, "cc.Label");
  assertCompRef(infoData, info.comp, "propType", 28, "cc.Label");
  assertCompRef(infoData, info.comp, "desc", 40, "cc.Label");
  assertNodeRef(infoData, info.comp, "icon", 13, "spr_icon");
  assertNodeRef(infoData, info.comp, "rare", 115, "spr_rare");
  assertCompRef(infoData, info.comp, "btnClose", 109, "cc.Button");
  assertCompRef(infoData, info.comp, "btnEnter", 77, "cc.Button");
  assertCompRef(infoData, info.comp, "enterLabel", 82, "cc.Label");
  assertCompRef(infoData, info.comp, "btnSrc", 55, "cc.Button");
  assertNodeRef(infoData, info.comp, "btnDetail", 58, "btn_detail");
  assertNodeRef(infoData, info.comp, "btnDecompose", 86, "btn_decompose");
  assertNodeRef(infoData, info.comp, "hitMenu", 47, "menu");
  assertNodeRef(infoData, info.comp, "hitMenuClose", 101, "menu_close");
}

function checkSources(): void {
  const views = [
    "client/assets/scripts/features/Bag/ui/BagView.ts",
    "client/assets/scripts/features/Bag/ui/BagItemView.ts",
    "client/assets/scripts/features/Bag/ui/BagTabView.ts",
    "client/assets/scripts/features/Bag/ui/BagInfoView.ts",
  ];
  for (let i = 0; i < views.length; i++) {
    const text = read(views[i]);
    assert(text.indexOf("getChildByName") < 0, views[i] + " 不应 getChildByName");
    assert(text.indexOf("findNamed") < 0, views[i] + " 不应 findNamed");
  }
  const cellSrc = read("client/assets/scripts/features/Bag/ui/BagItemView.ts");
  assert(cellSrc.indexOf("ui/common/other_rare-") >= 0, "运行时格子底图走 other_rare");
  assert(cellSrc.indexOf("backpack_item-frame-1") < 0, "运行时不再把细金框刷进 spr_frame");
  assert(cellSrc.indexOf("backpack_spr-rare-") < 0, "运行时不再把稀有文字图刷进 spr_frame");
  assert(cellSrc.indexOf("other_spr-null") < 0, "空槽不再换成菱形空图");
  const mount = read("client/assets/scripts/features/Bag/ui/BagMount.ts");
  assert(mount.indexOf("findNamed") < 0, "backpackMount 不应整树搜索");
  const fill = read("client/assets/scripts/ui/screenFill.ts");
  const bagStart = fill.indexOf("function fillBag");
  const bagEnd = fill.indexOf("function seatPrefabScroll");
  assert(bagStart >= 0 && bagEnd > bagStart, "legacy bag entry exists");
  const bag = fill.slice(bagStart, bagEnd);
  assert(bag.includes("历史入口背包已退役") && !bag.includes("bag.runOpen()"), "legacy entry cannot mount the new bag against wire data");
  assert(!bag.includes("setPosition") && !bag.includes("removeComponent") && !bag.includes("content.parent"), "legacy entry cannot repair or override list authoring");
  const main = read("client/assets/scripts/ui/MainApp.ts");
  assert(main.indexOf("USE_PAGE_PREFAB_SHELL") >= 0, "MainApp 仍有页面壳开关");
  assert(main.indexOf("attachPagePrefabShell") >= 0, "MainApp 仍挂旧壳");
  assert(main.indexOf("id !== CITY_TAB") >= 0, "主城仍不盖壳");
  assert(!main.includes("UIManager.instance.open(BagView)") && main.includes("历史入口背包已退役"), "legacy Main does not create a second bag pipeline");
  assert(main.indexOf("UIManager.instance.createPageHost") >= 0, "presentPage 先问新视图");
  const present = main.slice(main.indexOf("private presentPage"), main.indexOf("private battleTabIsProbe"));
  assert(present.indexOf("createPageHost") >= 0 && present.indexOf("createPageHost") < present.indexOf("beginPageOpen"), "UIManager 页面不走预制壳计时");
  assert(read("client/assets/scripts/framework/ui/UIManager.ts").indexOf("noteOpened(") >= 0, "UIManager 在 whenReady 之后打打开行");
  assert(main.indexOf("USE_BATTLE_PREFAB") < 0, "MainApp 不应出现 USE_BATTLE_PREFAB");
  assert(main.indexOf("buildWireMainlinePage") < 0, "MainApp 不应出现 buildWireMainlinePage");
  assert(main.indexOf('uiNode("Wire') < 0, "MainApp 不应再造 Wire 节点");
  const backFn = main.slice(main.indexOf("private back()"), main.indexOf("private allow("));
  assert(backFn.indexOf("this.panels?.back()") >= 0, "旧页面返回仍走页面栈");
  assert(backFn.indexOf("UIManager") < 0, "MainApp.back 不改走 UIManager");
  const detail =
    read("client/assets/scripts/features/Bag/ui/BagMount.ts") +
    read("client/assets/scripts/features/Bag/ui/BagInfoView.ts");
  assert(detail.indexOf("195, 148") < 0, "详情底不再写死 195,148");
  assert(detail.indexOf("125, 330") < 0, "详情卡不再写死 125,330");
  assert(detail.indexOf("320, 480") < 0, "遮罩不再写死 320,480");
  assert(detail.indexOf("720, 1100") < 0, "遮罩不再写死 720×1100");
  const manager = read("client/assets/scripts/framework/ui/UIManager.ts");
  assert(manager.indexOf("背包没有打开") >= 0, "加载失败要有可见提示");
  assert(manager.indexOf("shell.destroy()") >= 0, "加载失败要销毁还没进栈的壳");
  assert(manager.indexOf("mountBackpackPage") < 0 && manager.indexOf("backpackMount") < 0, "UIManager 不写死背包挂载");
  assert(manager.indexOf("keepOnly") >= 0, "打开意图可以被后来的页面取消");
  assert(manager.indexOf("onPageOpened") >= 0, "入栈成功才通知底栏");
  assert(manager.indexOf("OpenCancelled") >= 0, "取消和失败分开");
  const base = read("client/assets/scripts/framework/ui/BaseView.ts");
  assert(base.indexOf("onCreate") >= 0 && base.indexOf("onBind") >= 0, "BaseView 有 onCreate/onBind");
  assert(base.indexOf("onUnbind") >= 0 && base.indexOf("dispose") >= 0, "BaseView 有 onUnbind/dispose");
  assert(base.indexOf("failOpen") >= 0, "BaseView 能拒绝 whenReady");
  const bagView = read("client/assets/scripts/features/Bag/ui/BagView.ts");
  assert(bagView.indexOf("failOpen") >= 0, "背包挂载失败要拒绝 whenReady");
  assert(bagView.indexOf("finally") < 0, "不能 catch 之后仍 finishOpen");
  assert(bagView.indexOf("mount: mountBackpackPage") >= 0, "挂载策略写在背包 ViewSpec 上");
  assert(bagView.indexOf("cache: false") >= 0 && bagView.indexOf("allowMultiple: false") >= 0, "背包不缓存、不叠两份");
  const openChildFn = main.slice(main.indexOf("private openChild("), main.indexOf("private back("));
  const bagAt = openChildFn.indexOf('id === "bag"');
  const bagBranchEnd = openChildFn.indexOf("this.panels?.openChild(id)", bagAt);
  assert(bagAt >= 0 && bagBranchEnd > bagAt, "背包打开分支还在");
  assert(openChildFn.slice(bagAt, bagBranchEnd).indexOf("refreshChrome") < 0, "背包还没进栈不能刷底栏");
  assert(main.indexOf("onPageOpened") >= 0, "MainApp 在入栈后刷新底栏");
  assert(main.indexOf("keepOnly") >= 0, "切换页面会取消未完成的打开");
  assert(main.indexOf("setBeforeOpen") >= 0, "页面栈切换时带上打开意图");
  const boot = read("client/assets/scripts/core/Boot.ts");
  assert(boot.indexOf("USE_PAGE_PREFAB_SHELL") < 0, "Boot 不应出现页面壳开关");
}

function checkRegistry(): void {
  const spec = viewSpecOf(BagView);
  assert(spec !== null, "BagView 未注册");
  assert(spec.id === "bag", "页面 id 应是 bag");
  assert(spec.prefab === "prefabs/ui/backpack/BackpackLayer", "预制路径");
  assert(spec.layer === UILayer.Page, "层应是 Page");
  assert(spec.cache === false, "背包不缓存");
  assert(spec.allowMultiple === false, "背包不叠两份");
  assert(typeof spec.mount === "function", "背包挂载在 ViewSpec 上");
  assert(viewCtorById("bag") === BagView, "id bag 应对回 BagView");
  assert(viewCtorById("hero") === null, "这一阶段不登记别的页");
  assert(UIManager.instance.createPageHost("bag") === null, "没 open 时 presentPage 继续走旧壳");
  assert(UIManager.instance.createPageHost("hero") === null, "未迁移页面不进 UIManager");
}

function sized(name: string, width: number, height: number): Node {
  const node = new Node(name);
  node.addComponent(UITransform).setContentSize(width, height);
  return node;
}

function labelOn(node: Node): Label {
  return node.addComponent(Label);
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
  (prefab as any).data = prefab._instantiate();
  return prefab;
}

function makeView(): BagView {
  const scene = new Node("scene");
  const host = new Node("BackpackLayer");
  host.parent = scene;
  const hostUi = host.addComponent(UITransform);
  hostUi.setContentSize(640, 960);
  hostUi.setAnchorPoint(0, 0);
  const view = host.addComponent(BagView);
  view.sprBox = sized("spr_box", 560, 520);
  view.sprBox.parent = host;
  const scrollNode = sized("BagScroll",520,555); scrollNode.parent=view.sprBox;
  const port=sized("view",520,555); port.parent=scrollNode;
  (port.getComponent(UITransform) as UITransform).setAnchorPoint(0.5,1); port.addComponent(Mask);
  const content=sized("content",520,555); content.parent=port; content.setPosition(-260,0,0);
  (content.getComponent(UITransform) as UITransform).setAnchorPoint(0,1);
  const list=content.addComponent(SuperContent) as SuperContent;
  list.spacingX=22;list.spacingY=22;list.paddingLeft=35;list.paddingRight=35;list.paddingTop=8;list.paddingBottom=38;
  view.bagScroll=scrollNode.addComponent(SuperScroll) as SuperScroll;
  view.bagScroll.content=content;
  view.tabContent = new Node("tabs");
  view.tabContent.layer = Layers.Enum.UI_2D;
  view.tabContent.parent = host;
  view.bubble = new Node("bubble");
  view.bubble.parent = host;
  view.talk = labelOn(new Node("lbl_talk"));
  if (view.talk.node) view.talk.node.parent = host;
  view.portrait = new Node("node_portrait");
  view.portrait.parent = host;
  view.hitMenu = sized("UIMenu_1", 0, 0);
  view.hitMenu.parent = host;
  view.btnClose = null;
  list.cellPrefab = fakePrefab((node) => {
    node.addComponent(UITransform).setContentSize(96,96);
    const cell = node.addComponent(BagItemView);
    cell.button = node.addComponent(Button);
    cell.frame = new Node("spr_frame");
    cell.frame.addComponent(Sprite);
    cell.frame.parent = node;
    cell.icon = new Node("spr_icon");
    cell.icon.addComponent(Sprite);
    cell.icon.parent = node;
    cell.selectMark = new Node("spr_select");
    cell.selectMark.parent = node;
    cell.count = labelOn(new Node("lbl_count"));
    if (cell.count.node) cell.count.node.parent = node;
  });
  view.tabPrefab = fakePrefab((node) => {
    node.addComponent(Sprite);
    const tab = node.addComponent(BagTabView);
    tab.title = labelOn(new Node("lbl_title"));
    if (tab.title.node) tab.title.node.parent = node;
    tab.button = buttonOn("btn");
    if (tab.button.node) tab.button.node.parent = node;
  });
  view.infoPrefab = fakePrefab((node) => {
    const cardUi = node.addComponent(UITransform);
    cardUi.setContentSize(390, 300);
    cardUi.setAnchorPoint(0, 0);
    const info = node.addComponent(BagInfoView);
    info.bg = new Node("spr_bg");
    info.bg.setPosition(195, 150, 0);
    info.bg.parent = node;
    info.propName = labelOn(new Node("lbl_prop_name"));
    info.propType = labelOn(new Node("lbl_prop_type"));
    info.desc = labelOn(new Node("lbl_desc"));
    info.icon = new Node("spr_icon");
    info.icon.addComponent(Sprite);
    info.rare = new Node("spr_rare");
    info.rare.addComponent(Sprite);
    info.btnClose = buttonOn("btn_close");
    info.btnEnter = buttonOn("btn_enter");
    info.enterLabel = labelOn(new Node("enter"));
    info.btnSrc = buttonOn("btn_src");
    info.btnDetail = new Node("btn_detail");
    info.btnDecompose = new Node("btn_decompose");
    info.hitMenu = sized("menu", 640, 960);
    info.hitMenuClose = sized("menu_close", 640, 960);
  });
  view.dimPrefab = fakePrefab((node) => {
    const dim = sized("dim", 720, 1280);
    const dimUi = dim.getComponent(UITransform) as UITransform;
    dimUi.setAnchorPoint(0.5, 0.5);
    dim.parent = node;
  });
  view.bagScroll.onEnable();
  return view;
}

function pump(frames: number): void {
  for (let i = 0; i < frames; i++) director.emit(Director.EVENT_AFTER_UPDATE);
}

function cells(view: BagView): BagItemView[] {
  const content = view.bagScroll!.content;
  if (!content) return [];
  const out: BagItemView[] = [];
  for (let i = 0; i < content.children.length; i++) {
    const cell = content.children[i].getComponent(BagItemView) as BagItemView | null;
    if (cell) out.push(cell);
  }
  return out;
}

function tabs(view: BagView): BagTabView[] {
  const host = view.tabContent;
  if (!host) return [];
  const out: BagTabView[] = [];
  for (let i = 0; i < host.children.length; i++) {
    const tab = host.children[i].getComponent(BagTabView) as BagTabView | null;
    if (tab) out.push(tab);
  }
  return out;
}

function activeIcons(list: BagItemView[]): BagItemView[] {
  const out: BagItemView[] = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].icon && list[i].icon.active) out.push(list[i]);
  }
  return out;
}

function infoCard(view: BagView): BagInfoView {
  const sheet = view.node.getChildByName("InfoCard");
  assert(sheet !== null, "详情没有盖上来");
  const kids = sheet.children;
  for (let i = 0; i < kids.length; i++) {
    const info = kids[i].getComponent(BagInfoView) as BagInfoView | null;
    if (info) return info;
  }
  throw new Error("InfoCard 上没有 BagInfoView");
}

function noteBag(items: readonly {itemId:number;quantity:number}[] | null): void {
  BagModel.instance.reset("local/test-role");
  if (items) BagModel.instance.replaceAll(items);
}

function bindTables(): void {
  const language: ConfigTableFile<Record<string, unknown>> = {
    table: "language",
    rows: [
      { key: 5788, value: "店里欢迎光临" },
      { key: 10014, value: "木剑" },
      { key: 10020, value: "红药" },
      { key: 10007, value: "碎片甲" },
      { key: 10008, value: "小精灵" },
      { key: 10001, value: "金币" },
      { key: 10021, value: "空药" },
      { key: 10022, value: "无数量药" },
      { key: 20020, value: "回一点血" },
      { key: 20022, value: "数量没同步" },
    ],
  };
  const item: ConfigTableFile<Record<string, unknown>> = {
    table: "item",
    rows: [
      { idx: 14, type: 14, name: 10014, rare_mark: 2, icon: "backpack/sword" },
      { idx: 20, type: 3, name: 10020, rare_mark: 1, icon: "backpack/potion", content: 20020 },
      { idx: 7, type: 7, name: 10007, rare_mark: 1, icon: "backpack/shard" },
      { idx: 8, type: 8, name: 10008, rare_mark: 3, icon: "backpack/spirit" },
      { idx: 1, type: 1, name: 10001, rare_mark: 1, icon: "backpack/gold" },
      { idx: 21, type: 3, name: 10021, rare_mark: 1, icon: "backpack/empty" },
      { idx: 22, type: 3, name: 10022, rare_mark: 1, icon: "backpack/unknown", content: 20022 },
    ],
  };
  const tables = new Map<string, ConfigTableFile<Record<string, unknown>>>();
  tables.set("language", language);
  tables.set("item", item);
  const db = new ConfigDb();
  db.tables = tables;
  ConfigDb.current = db;
  bindGameCatalog(tables);
  (remakeConfig as any).get = (path: string) => tables.get(path.replace("config/", ""));
}

const toasts: string[] = [];

function installNav(): { backs: { n: number }; current: { id: string | null } } {
  const backs = { n: 0 };
  const current = { id: "city" as string | null };
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
  return { backs, current };
}

async function openView(): Promise<BagView> {
  const view = makeView();
  view.runOpen();
  await view.whenReady();
  pump(50);
  return view;
}

async function checkBehavior(): Promise<void> {
  bindTables(); const nav=installNav();
  noteBag(null); const unsynced=await openView();
  assert(cells(unsynced).length===20&&activeIcons(cells(unsynced)).length===0,"idle inventory is distinct from ready empty");
  assert(unsynced.talk.string==="背包尚未同步","unsynced message");unsynced.runDispose();unsynced.node.destroy();
  noteBag([{itemId:14,quantity:1},{itemId:20,quantity:3},{itemId:7,quantity:2},{itemId:8,quantity:5},{itemId:1,quantity:99}]);
  const before=EventDispatcher.instance.listenerCount(BagEvent.BagUpdate);
  const beforeSync=EventDispatcher.instance.listenerCount(BagEvent.BagSyncStateChanged);
  const view=await openView();
  assert(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate)===before+1,"one event subscription per opened View");
  assert(EventDispatcher.instance.listenerCount(BagEvent.BagSyncStateChanged)===beforeSync+1,"one separate status subscription per opened View");
  const slots=cells(view);assert(slots.length===20&&activeIcons(slots).length===1,"ready item category reads BagModel immediately");
  assert(view.bagScroll.content.parent.getComponent(Mask).enabled,"authored viewport Mask remains enabled");
  assert(slots[0].node.position.x===83&&slots[0].node.position.y===-56,"Inspector layout survives module migration");
  assert(view.bagScroll.content.getComponent(UITransform).height===614,"native content sizing survives migration");
  const tabRow=tabs(view);assert(tabRow.map(tab=>tab.title.string).join("/")==="装备/道具/碎片/精灵","four categories");
  for(const index of [0,2,3,1]) {
    tabRow[index].node.emit(Button.EventType.CLICK);
    assert(activeIcons(cells(view)).length===1,"category uses config and current Model items");
  }
  const cell=activeIcons(cells(view))[0];cell.node.emit(Button.EventType.CLICK);
  assert(infoCard(view).propName.string==="红药","details use configuration");
  assert(infoCard(view).enterLabel.string==="确定","current API bag is read-only, no legacy use protocol");
  for(let i=0;i<5;i++)view.refreshFromModel();
  assert(cells(view)[0]===cell,"data refresh reuses Cell");
  assert(cell.selectMark.active,"selection preserved");
  view.bagScroll.restorePosition(new (require("cc").Vec2)(0,45));
  view.refreshFromModel();assert(view.bagScroll.readPosition().y===45,"same category keeps scroll offset");
  const external=EventDispatcher.instance.on(BagEvent.BagUpdate,()=>{});
  view.runClose();assert(EventDispatcher.instance.listenerCount(BagEvent.BagSyncStateChanged)===beforeSync,"close releases status subscription too");assert(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate)===before+1,"closing removes only own subscription");
  noteBag([{itemId:20,quantity:9}]);view.runOpen();await view.whenReady();pump(1);
  assert(activeIcons(cells(view))[0].count.string==="9","reopen immediately reads latest Model");
  assert(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate)===before+2,"reopen has no duplicate subscription");
  view.runOpen();assert(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate)===before+2,"reopening the current View does not duplicate listeners");
  nav.current.id="bag";view.close();assert(nav.backs.n===1,"existing UIManager navigation retained");
  view.runDispose();view.node.destroy();external();external();
  assert(EventDispatcher.instance.listenerCount(BagEvent.BagUpdate)===before,"all page-owned listeners are released");
  assert(EventDispatcher.instance.listenerCount(BagEvent.BagSyncStateChanged)===beforeSync,"reopen/dispose has no remaining status listener");
  noteBag([]);const empty=await openView();
  assert(cells(empty).length===20&&empty.talk.string==="背包为空","ready empty retains authored empty slots");
  empty.runDispose();empty.node.destroy();
  noteBag([{itemId:20,quantity:2}]);const hidden=makeView();hidden.node.active=false;hidden.runOpen();await hidden.whenReady();
  assert(cells(hidden).length===0,"render waits for mounting without repairing hierarchy");hidden.node.active=true;pump(1);
  assert(activeIcons(cells(hidden)).length===1,"after mounting current Model renders");hidden.runDispose();hidden.node.destroy();
}

async function checkOpenFailure(): Promise<void> {
  const stack: string[] = ["city"];
  let opens = 0;
  let backs = 0;
  const highlights: string[] = [];
  const root = new Node("pageLayer");
  UIManager.instance.install(
    {
      get current() {
        return stack[stack.length - 1] || null;
      },
      openChild(id: string) {
        opens += 1;
        const host = UIManager.instance.createPageHost(id);
        assert(host !== null && host.isValid, "进栈的壳必须已经装好");
        host.parent = root;
        stack.push(id);
      },
      back() {
        if (stack.length <= 1) return false;
        backs += 1;
        const id = stack.pop() || "";
        const host = root.getChildByName("LiveShell");
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

  const failBundle = (_name: string, cb: (err: Error | null, bundle: null) => void) => {
    cb(new Error("bundle down"), null);
  };
  const failAny = (_request: unknown, cb: (err: Error | null, asset: null) => void) => {
    cb(new Error("uuid down"), null);
  };
  assetManager.loadBundle = failBundle;
  assetManager.loadAny = failAny;
  clearPrefabCache();

  const mark = createdNodes.length;
  const toastAt = toasts.length;
  const openLinesAt = openLineCount();
  let failed = false;
  try {
    await UIManager.instance.open(BagView);
  } catch (_err) {
    failed = true;
  }
  assert(failed, "预制加载失败要拒绝打开");
  assert(openLineCount() === openLinesAt, "预制没装上不打打开界面");
  assert(opens === 0, "预制加载失败不能压进页面栈");
  assert(backs === 0, "还没进栈就不用再 pop");
  assert(stack.length === 1 && stack[0] === "city", "失败后仍停在原来的页");
  assert(root.children.length === 0, "失败后页面层上没有壳");
  assert(toasts[toastAt] === "背包没有打开", "失败要 Toast，不能只打日志");
  assert(highlights.length === 0, "加载失败不能改底栏高亮");
  const shells = createdNodes.slice(mark).filter((node) => node.name === "LiveShell");
  assert(shells.length === 1, "失败路径会先建壳再拆掉");
  assert(shells[0].isValid === false && shells[0].parent === null, "失败的 LiveShell 不能留在场景里挡点击");
  assert(UIManager.instance.createPageHost("bag") === null, "失败后不能再交出空壳");

  clearPrefabCache();
  const bare = new Prefab() as Prefab & { _instantiate: () => Node };
  bare._instantiate = () => new Node("bare");
  assetManager.loadBundle = (_name: string, cb: (err: Error | null, bundle: object | null) => void) => {
    cb(null, {
      load(_path: string, _type: unknown, done: (err: Error | null, asset: Prefab | null) => void) {
        done(null, bare);
      },
    });
  };
  const markBare = createdNodes.length;
  const toastBare = toasts.length;
  let missing = false;
  try {
    await UIManager.instance.open(BagView);
  } catch (_err) {
    missing = true;
  }
  assert(missing, "预制上没有视图组件要拒绝打开");
  assert(opens === 0, "没有视图组件也不能压进页面栈");
  assert(toasts[toastBare] === "背包没有打开", "缺组件也要 Toast");
  assert(highlights.length === 0, "缺组件不能改底栏高亮");
  const bareShells = createdNodes.slice(markBare).filter((node) => node.name === "LiveShell");
  assert(bareShells.length === 1 && bareShells[0].isValid === false && bareShells[0].parent === null, "缺组件的壳也要销毁");
  assert(root.children.length === 0, "缺组件时页面层仍是空的");

  clearPrefabCache();
  assetManager.loadBundle = (_name: string, cb: (err: Error | null, bundle: object | null) => void) => {
    cb(null, {
      load(inner: string, _type: unknown, done: (err: Error | null, asset: Prefab | null) => void) {
        const prefab = new Prefab() as Prefab & { _instantiate: () => Node };
        prefab._instantiate = () => {
          const node = new Node(inner);
          if (inner.indexOf("BackpackLayer") >= 0) return makeView().node;
          return node;
        };
        done(null, prefab);
      },
    });
  };
  const opened = await UIManager.instance.open(BagView);
  assertOpenLine("BagView", "BackpackLayer");
  assert(opens === 1 && stack[stack.length - 1] === "bag", "装好之后才进栈");
  assert(highlights.length === 1 && highlights[0] === "bag", "进栈之后才通知底栏");
  assert(opened.node.isValid && opened.node.parent !== null, "装好的视图留在页面上");
  const live = root.getChildByName("LiveShell");
  assert(live !== null && live.isValid && live.parent === root, "进栈的是装好的壳");
  assert(UIManager.instance.close(opened) === true, "装好的背包可以关");
  assert(backs === 1 && stack[stack.length - 1] === "city", "关闭后回到原来的页");
  assert(root.getChildByName("LiveShell") === null, "关闭后壳不留在页面层");
  clearPrefabCache();
}

interface Harness {
  stack: string[];
  opens: number;
  backs: number;
  highlights: string[];
  root: Node;
}

function installHarness(cacheClose: boolean): Harness {
  const stack = ["city"];
  const box: Harness = { stack, opens: 0, backs: 0, highlights: [], root: new Node("pageLayer") };
  UIManager.instance.install(
    {
      get current() {
        return stack[stack.length - 1] || null;
      },
      openChild(id: string) {
        box.opens += 1;
        const host = UIManager.instance.createPageHost(id);
        assert(host !== null && host.isValid, "进栈的壳必须已经装好");
        host.parent = box.root;
        stack.push(id);
      },
      back() {
        if (stack.length <= 1) return false;
        box.backs += 1;
        const id = stack.pop() || "";
        const host = box.root.children[box.root.children.length - 1] || null;
        if (cacheClose) {
          if (id) UIManager.instance.noteClosed(id);
          if (host && host.isValid && host.parent) host.destroy();
        } else {
          if (host) host.destroy();
          if (id) UIManager.instance.noteClosed(id);
        }
        return true;
      },
    },
    {
      showToast(text: string) {
        toasts.push(text);
      },
      onPageOpened(id: string) {
        box.highlights.push(id);
      },
    }
  );
  return box;
}

function blankPiece(): Prefab {
  const piece = new Prefab() as Prefab & { _instantiate: () => Node };
  piece._instantiate = () => new Node("piece");
  return piece;
}

function bagNode(inner: string, withCells: boolean): Node {
  if (inner.indexOf("BackpackLayer") >= 0 && withCells) return makeView().node;
  const node = new Node(inner);
  if (inner.indexOf("BackpackLayer") >= 0) node.addComponent(BagView);
  return node;
}

function holdLoads(make: (inner: string) => Node): { release: () => void; loads: { n: number } } {
  const loads = { n: 0 };
  let hold = true;
  const pending: (() => void)[] = [];
  assetManager.loadBundle = (_name: string, cb: (err: Error | null, bundle: object | null) => void) => {
    loads.n += 1;
    const run = () => {
      cb(null, {
        load(inner: string, _type: unknown, done: (err: Error | null, asset: Prefab | null) => void) {
          const prefab = new Prefab() as Prefab & { _instantiate: () => Node };
          prefab._instantiate = () => make(inner);
          done(null, prefab);
        },
      });
    };
    if (hold) pending.push(run);
    else run();
  };
  return {
    loads,
    release() {
      hold = false;
      const list = pending.splice(0, pending.length);
      for (let i = 0; i < list.length; i++) list[i]();
    },
  };
}

function resetLife(): void {
  LifeView.creates = 0;
  LifeView.binds = 0;
  LifeView.opens = 0;
  LifeView.closes = 0;
  LifeView.unbinds = 0;
  LifeView.disposes = 0;
}

async function checkOpenRaces(): Promise<void> {
  const node = new Node("life");
  const life = node.addComponent(LifeView);
  resetLife();
  life.runOpen();
  life.runOpen();
  life.runClose();
  life.runClose();
  life.runUnbind();
  life.runUnbind();
  life.runDispose();
  life.runDispose();
  life.runOpen();
  assert(LifeView.creates === 1 && LifeView.binds === 1, "onCreate/onBind 只走一次");
  assert(LifeView.opens === 2, "onOpen 每次显示一次");
  assert(LifeView.closes === 1, "onClose 每次关掉一次");
  assert(LifeView.unbinds === 1 && LifeView.disposes === 1, "onUnbind/dispose 只走一次");
  node.destroy();

  const nav = installHarness(false);
  clearPrefabCache();
  const gate = holdLoads((inner) => bagNode(inner, true));
  const toastAt = toasts.length;
  const mark = createdNodes.length;
  let switched = false;
  const switching = UIManager.instance.open(BagView).then(
    () => {
      throw new Error("切走之后不应打开成功");
    },
    (err) => {
      switched = isOpenCancelled(err);
      if (!switched) throw err;
    }
  );
  nav.stack.push("mail");
  gate.release();
  await switching;
  assert(switched, "加载期间切到别的页要取消");
  assert(nav.opens === 0, "取消后不能再压栈");
  assert(toasts.length === toastAt, "取消不 Toast");
  assert(nav.highlights.length === 0, "取消不改底栏高亮");
  assert(nav.root.children.length === 0, "取消后页面层上没有壳");
  const switchedShells = createdNodes.slice(mark).filter((item) => item.name === "LiveShell");
  assert(switchedShells.length === 1 && switchedShells[0].isValid === false, "取消的 LiveShell 要销毁");
  nav.stack.pop();

  clearPrefabCache();
  const gateOnly = holdLoads((inner) => bagNode(inner, true));
  const toastOnly = toasts.length;
  let dropped = false;
  const dropping = UIManager.instance.open(BagView).then(
    () => {
      throw new Error("意图作废后不应打开成功");
    },
    (err) => {
      dropped = isOpenCancelled(err);
      if (!dropped) throw err;
    }
  );
  UIManager.instance.keepOnly("hero");
  gateOnly.release();
  await dropping;
  assert(dropped, "切页意图要取消旧打开");
  assert(nav.opens === 0, "意图作废后不能压栈");
  assert(toasts.length === toastOnly, "意图作废不 Toast");
  assert(nav.highlights.length === 0, "意图作废不改高亮");

  clearPrefabCache();
  const gateSame = holdLoads((inner) => bagNode(inner, true));
  const kept = UIManager.instance.open(BagView);
  UIManager.instance.keepOnly("bag");
  gateSame.release();
  const keptView = await kept;
  assert(nav.opens === 1 && nav.stack[nav.stack.length - 1] === "bag", "同一页的意图还要进栈");
  assert(nav.highlights.length === 1 && nav.highlights[0] === "bag", "进栈后通知一次底栏");
  assert(UIManager.instance.close(keptView) === true, "打开成功的背包能关");
  assert(nav.stack[nav.stack.length - 1] === "city", "关掉后回到原来的页");

  clearPrefabCache();
  const gateDup = holdLoads((inner) => bagNode(inner, true));
  const proto = BagView.prototype as unknown as { onOpen(args?: unknown): void };
  const origOpen = proto.onOpen;
  let openCount = 0;
  proto.onOpen = function (this: BagView, args?: unknown): void {
    openCount += 1;
    origOpen.call(this, args);
  };
  try {
    const opensBeforeDup = nav.opens;
    const highlightsBeforeDup = nav.highlights.length;
    const first = UIManager.instance.open(BagView);
    const second = UIManager.instance.open(BagView);
    gateDup.release();
    const pair = await Promise.all([first, second]);
    assert(pair[0] === pair[1], "不允许叠两份时共用同一个实例");
    assert(openCount === 1, "进行中的第二次打开不再 onOpen");
    assert(nav.opens === opensBeforeDup + 1, "重复打开只压一层");
    assert(nav.highlights.length === highlightsBeforeDup + 1, "重复打开只通知一次底栏");
    assert(UIManager.instance.close(pair[0]) === true, "重复打开的那一层能关");
  } finally {
    proto.onOpen = origOpen;
  }

  clearPrefabCache();
  assetManager.loadBundle = (_name: string, cb: (err: Error | null, bundle: object | null) => void) => {
    cb(null, {
      load(inner: string, _type: unknown, done: (err: Error | null, asset: Prefab | null) => void) {
        if (inner.indexOf("BackpackItemCell") >= 0) {
          done(new Error("cell down"), null);
          return;
        }
        const prefab = new Prefab() as Prefab & { _instantiate: () => Node };
        prefab._instantiate = () => bagNode(inner, false);
        done(null, prefab);
      },
    });
  };
  const toastCell = toasts.length;
  const opensBeforeCell = nav.opens;
  const highlightsBeforeCell = nav.highlights.length;
  let cellFailed = false;
  try {
    await UIManager.instance.open(BagView);
  } catch (err) {
    cellFailed = !isOpenCancelled(err);
  }
  assert(cellFailed, "start 失败要拒绝 whenReady");
  assert(nav.opens === opensBeforeCell, "start 失败不能压栈");
  assert(nav.highlights.length === highlightsBeforeCell, "start 失败不改高亮");
  assert(toasts[toastCell] === "背包没有打开", "start 失败要 Toast");
  assert(nav.root.children.length === 0, "start 失败不留空壳");

  clearPrefabCache();
  MultiView.opens = 0;
  const gateMulti = holdLoads((inner) => {
    const made = new Node(inner);
    if (inner.indexOf("test/Multi") >= 0) made.addComponent(MultiView);
    return made;
  });
  const multiA = UIManager.instance.open(MultiView);
  const multiB = UIManager.instance.open(MultiView);
  gateMulti.release();
  const multis = await Promise.all([multiA, multiB]);
  assert(multis[0] !== multis[1], "allowMultiple 各开一份");
  assert(MultiView.opens === 2, "allowMultiple 两份各 onOpen 一次");
  assert(nav.opens === opensBeforeCell + 2, "allowMultiple 压两层");
  assert(UIManager.instance.close() === true, "先关上面一份");
  assert(UIManager.instance.close() === true, "再关下面一份");

  clearPrefabCache();
  resetLife();
  const cachedNav = installHarness(true);
  const gateLife = holdLoads((inner) => {
    const made = new Node(inner);
    if (inner.indexOf("test/Life") >= 0) made.addComponent(LifeView);
    return made;
  });
  gateLife.release();
  const lifeOpen = await UIManager.instance.open(LifeView);
  assertOpenLine("LifeView", "Life");
  assert(cachedNav.opens === 1, "缓存页第一次要进栈");
  assert(LifeView.creates === 1 && LifeView.binds === 1 && LifeView.opens === 1, "第一次打开走 create/bind/open");
  assert(UIManager.instance.close(lifeOpen) === true, "缓存页可以关");
  assert(lifeOpen.node.isValid, "cache 关掉后节点还在");
  assert(LifeView.closes === 1 && LifeView.unbinds === 0 && LifeView.disposes === 0, "cache 只 onClose，不 unbind/dispose");
  const loadsAfter = gateLife.loads.n;
  clearPrefabCache();
  const lifeAgain = await UIManager.instance.open(LifeView);
  assert(lifeAgain === lifeOpen, "cache 第二次还是同一个实例");
  assert(gateLife.loads.n === loadsAfter, "cache 第二次不再加载");
  assert(LifeView.creates === 1 && LifeView.binds === 1 && LifeView.opens === 2, "cache 再次打开只再 onOpen");
  assert(cachedNav.highlights.length === 2, "cache 再次进栈也通知底栏");
  assert(UIManager.instance.close(lifeAgain) === true, "缓存页第二次也能关");
  clearPrefabCache();
}

async function main(): Promise<void> {
  GameLog.shared.mirrorConsole = false;
  checkPrefabBindings();
  checkSources();
  checkRegistry();
  await checkBehavior();
  const legacy=makeView();
  fillPageShell("bag",legacy.node,()=>{});
  assert(cells(legacy).length===0,"retired legacy entry cannot mount the new BagView");legacy.runDispose();legacy.node.destroy();
  await checkOpenFailure();
  await checkOpenRaces();
  BagModel.instance.reset(null);
  ConfigDb.current = null;
  bindGameCatalog(new Map());
  console.log("backpack-view-check ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
