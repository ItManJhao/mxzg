import { Button, Color, Label, Node, Overflow, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { CITY_BAR, cityBarSlot } from "../config/nav";
import { takeStagedChrome } from "./cityStage";
import {
  bindClick,
  CITY_CHROME_PREFAB_PATH,
  findNode,
  loadPrefab,
  requireNode,
  spawnPrefab,
  tintSprite,
} from "./prefabLoad";
import { createButton, createLabel, paintRect, place, setText, uiNode } from "./UiKit";
import { TAB_REST_SIZE, tabPaintState, tabVisualScale, cityTabLayout } from "./cityTabScale";
import { widthSqueeze } from "./visibleChrome";
import { assignContentSize, bindVisibleRefresh, fitVisibleRoot, squeezeWideNode, stretchBar, uiSize } from "./visibleFit";

export type TabVisual = "selected" | "open" | "locked";

export interface TabState {
  id: string;
  text: string;
  state: TabVisual;
  /** 锁着且主线门槛大于 1 时写在钮上，例如 15。0 表示不写 Lv。 */
  lockLevel?: number;
}

export interface CityChrome {
  root: Node;
  setIdentity(nameLine: string, subLine: string): void;
  setCurrencies(goldLine: string, diamondLine: string): void;
  /** 空串表示没有战力数据，不要留 Prefab 默认的 0。 */
  setPower(text: string): void;
  /** 空串藏掉头像下的占位等级。 */
  setLevelBadge(text: string): void;
  /** null 关掉空褐圈。有路径时用英雄头像盖住框心。 */
  setAvatar(icon: string | null): void;
  setTabs(tabs: TabState[]): void;
  /** 只在主城页显示 ActGroup / UtilityRow。代码壳没有这两块。 */
  setCityExtras(visible: boolean): void;
}

/** Prefab 壳上的活动列表、更多列表和邮件。底栏七项仍走 onTab。 */
export interface CityChromeActions {
  openActivity(): void;
  openMore(): void;
  openMail(): void;
}

/** 右上活动组。点开都进原来的活动列表，不另开导航。 */
const ACTIVITY_HUB_PATHS = [
  "ActGroup/ActRecommend",
  "ActGroup/ActSevenDay",
  "ActGroup/ActHeroArrive",
  "ActGroup/ActPrivilege",
  "ActGroup/ActWelfare",
  "ActGroup/BtnActExpand",
  "ActGroup/ActLimitGift",
  "ActGroup/ActLimitTime",
];

/** 底栏上方工具圆。更多进更多列表。录像、好友、排行没有单独页，也进更多列表。 */
const MORE_HUB_PATHS = [
  "UtilityRow/BtnReplay",
  "UtilityRow/BtnFriend",
  "UtilityRow/BtnRank",
  "UtilityRow/BtnMore",
];

const TAB_SELECTED = new Color(186, 122, 42, 255);
const TAB_OPEN = new Color(46, 110, 190, 255);
const TAB_LOCKED = new Color(78, 84, 98, 255);
const NAME_COLOR = new Color(255, 228, 170, 255);
const SUB_COLOR = new Color(190, 205, 225, 255);
const GOLD_COLOR = new Color(255, 214, 120, 255);
const DIAMOND_COLOR = new Color(150, 216, 235, 255);

/**
 * 顶栏和底栏。挂在 UIShell 的 chrome 层，不进页面栈。
 * 项目设计分辨率 640×1280，原点在画面中心。底栏预制仍按 720 宽摆，运行时再拉满可见宽。
 * 不再手搓顶底栏。MainApp 只挂 CityChrome 预制，缺了只打日志。
 */
export function mountCityChrome(_parent: Node, _onTab: (id: string) => void): CityChrome {
  throw new Error("预制顶底栏未挂上，不手搓一整条");
}


/** 「真服 · 角色 id」是调试行。正式服顶栏只留名字和等级。 */
function applySubLine(node: Node, subLine: string): void {
  const debug = subLine.indexOf("真服 ·") === 0;
  node.active = !debug;
  setText(node, debug ? "" : subLine);
}

function fillOf(state: TabVisual): Color {
  if (state === "locked") return TAB_LOCKED;
  if (state === "selected") return TAB_SELECTED;
  return TAB_OPEN;
}

const PREFAB_TAB_SELECTED = new Color(255, 210, 140, 255);
const PREFAB_TAB_OPEN = new Color(255, 255, 255, 255);
const PREFAB_TAB_LOCKED = new Color(160, 164, 176, 255);

/**
 * main-scene_spr-bottom-bg 原始 640×129，Prefab 里 CUSTOM 拉到 720×129。
 * 底栏宽度至少按 724 拉这张图。不再在它后面铺一整条运行时色块。
 */
const BOTTOM_BG_WIDTH = 724;

/**
 * 底栏字图。副本的文件名是 skin，字是「副本」。
 * 最右一格用日服 VIP 字，不用国服「羁绊」。
 */
const TAB_CAPTION: { [id: string]: string } = {
  city: "ui/city/main-scene-lang_lbl-city",
  hero: "ui/city/main-scene-lang_lbl-hero",
  bag: "ui/city/main-scene-lang_lbl-backpack",
  battle: "ui/city/main-scene-lang_lbl-battle",
  dungeon: "ui/city/main-scene-lang_lbl-skin",
  clan: "ui/city/main-scene-lang_lbl-clan",
  fetter: "ui/city/main-scene-lang_lbl-fetters-unlock",
};

/** 最右一格的图标。Prefab 里可能还是粉钻，这里换成同套皇冠。 */
const TAB_ICON: { [id: string]: string } = {
  fetter: "ui/city/main-scene_spr-fetters-unlock",
};

/**
 * 绑定 CityChrome.prefab。
 * TopBar 下是 LblName、LblSub、CurrencyGold/Value、CurrencyGem/Value。
 * BottomBar 下是 TabCity、TabHero、TabBag、TabBattle、TabDungeon、TabClan、TabFetter，子节点 Label、Lock。
 * 路径相对 assets：prefabs/ui/city/CityChrome。Prefab 不走 resources.load。
 * 七个底栏字是 resources 里的字图（副本文件名 lbl-skin，最右是 VIP）。
 * 不改 USE_CITY_CHROME_PREFAB，也不改 Boot。
 * ActGroup / UtilityRow 仍绑预制上的按钮。没有列表预制时只打日志，不手搓按钮页。BtnMail 打开原来的邮件页。
 * BtnActivity / BtnMorePanel 保持 Prefab 里的未激活，避免再盖一层矩形。
 * 底栏七个钮仍把 id 交给 onTab。战斗进主线，副本进日常副本。
 */
export async function mountCityChromePrefab(
  parent: Node,
  onTab: (id: string) => void,
  actions: CityChromeActions
): Promise<CityChrome> {
  const staged = takeStagedChrome();
  const root = staged ?? spawnPrefab(await loadPrefab(CITY_CHROME_PREFAB_PATH), parent);
  if (staged) root.parent = parent;
  try {
    return bindCityChromePrefab(root, onTab, actions);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

function bindCityChromePrefab(root: Node, onTab: (id: string) => void, actions: CityChromeActions): CityChrome {
  sealBottomBg(root);
  const nameNode = requireNode(root, "TopBar/LblName");
  const subNode = requireNode(root, "TopBar/LblSub");
  const goldNode = requireNode(root, "TopBar/CurrencyGold/Value");
  const diamondNode = requireNode(root, "TopBar/CurrencyGem/Value");
  const tabPath: { [id: string]: string } = {
    city: "BottomBar/TabCity",
    hero: "BottomBar/TabHero",
    bag: "BottomBar/TabBag",
    battle: "BottomBar/TabBattle",
    dungeon: "BottomBar/TabDungeon",
    clan: "BottomBar/TabClan",
    fetter: "BottomBar/TabFetter",
  };
  const buttons: { [id: string]: Node } = {};
  for (let i = 0; i < CITY_BAR.length; i++) {
    const entry = CITY_BAR[i];
    const button = requireNode(root, tabPath[entry.id]);
    prepareCityTab(button);
    const lock = button.getChildByName("Lock");
    if (lock) lock.active = false;
    const label = button.getChildByName("Label");
    if (label) label.active = false;
    mountTabCaption(button, TAB_CAPTION[entry.id] || "");
    mountTabIcon(button, TAB_ICON[entry.id] || "");
    bindClick(button, () => onTab(entry.id));
    buttons[entry.id] = button;
  }
  for (let i = 0; i < ACTIVITY_HUB_PATHS.length; i++) {
    bindClick(requireNode(root, ACTIVITY_HUB_PATHS[i]), () => actions.openActivity());
  }
  for (let i = 0; i < MORE_HUB_PATHS.length; i++) {
    bindClick(requireNode(root, MORE_HUB_PATHS[i]), () => actions.openMore());
  }
  bindClick(requireNode(root, "UtilityRow/BtnMail"), () => actions.openMail());
  bindCityChromeFit(root);

  return {
    root,
    setIdentity(nameLine: string, subLine: string): void {
      setText(nameNode, nameLine);
      applySubLine(subNode, subLine);
    },
    setCurrencies(goldLine: string, diamondLine: string): void {
      setText(goldNode, goldLine);
      setText(diamondNode, diamondLine);
    },
    setPower(text: string): void {
      const node = findNode(root, "TopBar/PowerSlot/Value");
      if (!node) return;
      setText(node, text);
      const label = node.getComponent(Label);
      if (label) label.overflow = Overflow.SHRINK;
      const ui = node.getComponent(UITransform);
      if (ui) ui.setContentSize(68, 24);
    },
    setLevelBadge(text: string): void {
      const label = findNode(root, "TopBar/LblLevel");
      const bg = findNode(root, "TopBar/LevelBg");
      const show = text.length > 0;
      if (label) {
        label.active = show;
        if (show) setText(label, text);
      }
      if (bg) bg.active = show;
    },
    setAvatar(icon: string | null): void {
      paintAvatar(root, icon);
    },
    setTabs(tabs: TabState[]): void {
      const paint = tabPaintState(tabs.map((tab) => tab.state));
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const button = buttons[tab.id];
        if (!button) continue;
        const state = paint[i] === "locked" ? "locked" : paint[i] === "selected" ? "selected" : "open";
        // 字图保持「副本」。不要把「锁·」写进 84px 的 Label，挤开会像「领·副本」。
        setCityTabSelected(button, state === "selected");
        tintSprite(button, prefabTabColor(state));
        const lock = button.getChildByName("Lock");
        if (lock) {
          const locked = tab.state === "locked";
          lock.active = locked;
          if (locked) paintLockLevel(lock, tab.lockLevel && tab.lockLevel > 1 ? tab.lockLevel : 0);
        }
      }
    },
    setCityExtras(visible: boolean): void {
      const act = findNode(root, "ActGroup");
      const utility = findNode(root, "UtilityRow");
      if (act) act.active = visible;
      if (utility) utility.active = visible;
    },
  };
}

/**
 * 顶栏（名字、战力、头像，挂机页也不另画一条）和底栏七项。
 * Widget 左右拉到 view.getVisibleSize() 的宽，不写死 720。
 * 窄屏只把按钮往中间收，背景仍铺满可见宽。
 */
function bindCityChromeFit(root: Node): void {
  bindVisibleRefresh(root, () => {
    if (!root.isValid) return;
    const box = fitVisibleRoot(root);
    fitChromeChildren(root, box.width);
  });
}

/** 底栏贴住已经铺满可见高度的根节点底边，左右仍由 stretchBar 拉到可见宽。 */
function pinBottomBar(bar: Node, width: number): void {
  stretchBar(bar, width, "bottom");
}

function fitChromeChildren(root: Node, width: number): void {
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    if (child.name === "TopBar" || child.name === "top-bg") stretchBar(child, width, "top");
    else if (child.name === "BottomBar" || child.name === "bottom-bg") pinBottomBar(child, width);
    else squeezeWideNode(child, width);
  }
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    if (child.name !== "TopBar" && child.name !== "BottomBar") continue;
    const inner = child.children;
    for (let j = 0; j < inner.length; j++) {
      const node = inner[j];
      if (node.name === "Bg" || node.name === "BgPad") continue;
      if (isCityTab(node.name)) layoutCityTab(node, width);
      else squeezeWideNode(node, width);
    }
  }
  layoutCityHeader(root, width);
}

/** MainSceneCtr places the background centre on the top edge (half is outside
 * the viewport). Drawing the entire 146px art below that edge doubled its height. */
export function layoutCityHeader(root: Node, width: number): void {
  const top = root.getChildByName("TopBar");
  if (!top) return;
  const background = top.getChildByName("Bg");
  background?.setPosition(0, 40, 0);
  background?.getComponent(UITransform)?.setContentSize(width, width * 146 / 616);
  const positions: Record<string,number> = { NameBg:-0.285,LblName:-0.285,LblSub:-0.285,
    PowerSlot:-0.055,CurrencyGold:0.129,CurrencyGem:0.33,Avatar:-0.435,LevelBg:-0.435,LblLevel:-0.435 };
  for (const name of Object.keys(positions)) {
    const node = top.getChildByName(name);
    if (node) node.setPosition(width * positions[name],node.position.y,0);
  }
}

function paintAvatar(root: Node, icon: string | null): void {
  const avatar = findNode(root, "TopBar/Avatar");
  if (!avatar) return;
  if (!icon) {
    avatar.active = false;
    return;
  }
  avatar.active = true;
  let face = avatar.getChildByName("Face");
  if (!face) {
    face = uiNode("Face");
    const ui = face.addComponent(UITransform);
    ui.setContentSize(78, 78);
    const sprite = face.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    face.setPosition(0, 0, 0);
    face.parent = avatar;
  }
  const mark = face as Node & { mxzgIcon?: string };
  if (mark.mxzgIcon === icon) return;
  mark.mxzgIcon = icon;
  const sprite = face.getComponent(Sprite);
  if (!sprite) return;
  const wanted = icon;
  resources.load(wanted + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (err || !frame || !face || !face.isValid) return;
    if (mark.mxzgIcon !== wanted) return;
    sprite.spriteFrame = frame;
  });
}

function mountTabCaption(button: Node, path: string): void {
  if (!path) return;
  const ui = button.getComponent(UITransform);
  const plate = ui ? ui.contentSize.height : 78;
  const node = uiNode("Caption");
  const captionUi = node.addComponent(UITransform);
  captionUi.setContentSize(plate >= 90 ? 65 : 54, plate >= 90 ? 36 : 30);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  node.setPosition(0, plate >= 90 ? -46 : -36, 0);
  node.parent = button;
  resources.load(path + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (err || !frame || !sprite.isValid) return;
    sprite.spriteFrame = frame;
  });
}

/** 只换指定格子的 Icon。其它格子继续用 Prefab 里的图。 */
function mountTabIcon(button: Node, path: string): void {
  if (!path) return;
  const icon = button.getChildByName("Icon");
  const sprite = icon ? icon.getComponent(Sprite) : null;
  if (!sprite) return;
  resources.load(path + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (err || !frame || !sprite.isValid) return;
    sprite.spriteFrame = frame;
  });
}

interface CityTabMark extends Node {
  mxzgDesign?: { x: number; y: number; sx: number; sy: number };
  mxzgTabRestY?: number;
  mxzgTabSelected?: boolean;
  mxzgTabWidth?: number;
}

export function isCityTab(name: string): boolean {
  return (
    name === "TabCity" ||
    name === "TabHero" ||
    name === "TabBag" ||
    name === "TabBattle" ||
    name === "TabDungeon" ||
    name === "TabClan" ||
    name === "TabFetter"
  );
}

/** 七个键先收成同样大小。战斗格预制是 96，并且比其它格高一截。 */
export function prepareCityTab(button: Node): void {
  const mark = button as CityTabMark;
  const ui = button.getComponent(UITransform);
  const size = uiSize(ui);
  if (ui && size && (size.width > TAB_REST_SIZE + 0.5 || size.height > TAB_REST_SIZE + 0.5)) {
    assignContentSize(ui, TAB_REST_SIZE, TAB_REST_SIZE);
  }
  const icon = button.getChildByName("Icon");
  if (icon) {
    const iconUi = icon.getComponent(UITransform);
    const iconSize = uiSize(iconUi);
    if (iconUi && iconSize && (iconSize.width > 60 || iconSize.height > 60)) {
      assignContentSize(iconUi, 56, 56);
      const sprite = icon.getComponent(Sprite);
      if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    }
  }
  if (mark.mxzgTabRestY === undefined) {
    const y = button.position && typeof button.position.y === "number" ? button.position.y : 0;
    mark.mxzgTabRestY = y > 20 ? 13 : y;
  }
  const press = button.getComponent(Button);
  if (press && press.transition === Button.Transition.SCALE) press.transition = Button.Transition.NONE;
}

/** 窄屏收拢之后再乘选中倍数。Button 的缩放过渡会把 scale 弹回 1，所以先关掉。 */
export function layoutCityTab(button: Node, visibleW: number): void {
  const mark = button as CityTabMark;
  prepareCityTab(button);
  if (visibleW > 0) mark.mxzgTabWidth = visibleW;
  const width = mark.mxzgTabWidth && mark.mxzgTabWidth > 0 ? mark.mxzgTabWidth : visibleW;
  const names = ["TabCity","TabHero","TabBag","TabBattle","TabDungeon","TabClan","TabFetter"];
  const index = names.indexOf(button.name);
  if (index >= 0 && width > 0) {
    const layout = cityTabLayout(width,index,mark.mxzgTabSelected === true);
    button.setPosition(layout.x,layout.y,button.position.z);
    button.setScale(layout.scale,layout.scale,1);
    return;
  }
  const restY = mark.mxzgTabRestY !== undefined ? mark.mxzgTabRestY : 0;
  if (!mark.mxzgDesign) {
    const pos = button.position;
    const x = pos && typeof pos.x === "number" ? pos.x : 0;
    const z = pos && typeof pos.z === "number" ? pos.z : 0;
    button.setPosition(x, restY, z);
    button.setScale(1, 1, 1);
  } else {
    mark.mxzgDesign.sx = 1;
    mark.mxzgDesign.sy = 1;
    mark.mxzgDesign.y = restY;
  }
  squeezeWideNode(button, width);
  const mul = tabVisualScale(mark.mxzgTabSelected === true);
  const squeeze = widthSqueeze(width);
  button.setScale(mul * squeeze, mul * squeeze, 1);
}

export function setCityTabSelected(button: Node, selected: boolean): void {
  (button as CityTabMark).mxzgTabSelected = selected;
  layoutCityTab(button, 0);
}

/**
 * 底栏只用预制上的 Bg。不再铺运行时色块，避免七个键后面多一层深色垫。
 * 不改七个 Tab 的位置。
 */
function sealBottomBg(root: Node): void {
  const bg = requireNode(root, "BottomBar/Bg");
  const ui = bg.getComponent(UITransform);
  const bottom = bg.parent;
  if (!bottom) return;
  const barUi = bottom.getComponent(UITransform);
  const barSize = uiSize(barUi);
  const bgSize = uiSize(ui);
  const barW = barSize && barSize.width > BOTTOM_BG_WIDTH ? barSize.width : BOTTOM_BG_WIDTH;
  const height = bgSize && bgSize.height > 0 ? bgSize.height : 129;
  if (ui) ui.setContentSize(barW, height);
  const pad = bottom.getChildByName("BgPad");
  if (pad) pad.active = false;
}

function paintLockLevel(lock: Node, level: number): void {
  const text = level > 1 ? "Lv" + level : "";
  let node = lock.getChildByName("Lv");
  if (!text) {
    if (node) node.active = false;
    return;
  }
  if (!node) {
    node = createLabel(text, 16, { color: new Color(255, 244, 220, 255), width: 64, height: 22 });
    node.name = "Lv";
    node.setPosition(0, -20, 0);
    node.parent = lock;
  }
  node.active = true;
  setText(node, text);
  const label = node.getComponent(Label);
  if (label) label.overflow = Overflow.SHRINK;
}

function prefabTabColor(state: TabVisual): Color {
  if (state === "locked") return PREFAB_TAB_LOCKED;
  if (state === "selected") return PREFAB_TAB_SELECTED;
  return PREFAB_TAB_OPEN;
}
