import { _decorator, Color, Label, Node, Overflow, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { CITY_BAR } from "../../../config/nav";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { view } from "../../../framework/ui/UIRegistry";
import { CityChrome, CityChromeActions, isCityTab, layoutCityTab, layoutCityHeader, prepareCityTab, setCityTabSelected, TabState } from "../../../ui/CityChrome";
import { tabPaintState } from "../../../ui/cityTabScale";
import { CITY_CHROME_PREFAB_PATH, bindClick, tintSprite } from "../../../ui/prefabLoad";
import { createLabel, setText, uiNode } from "../../../ui/UiKit";
import { assignContentSize, bindVisibleRefresh, fitVisibleRoot, squeezeWideNode, stretchBar, uiSize } from "../../../ui/visibleFit";
import { CITY_CHROME_HOST, CITY_CHROME_VIEW_ID } from "../config/cityIds";
import { mountCityChromeView } from "./cityMount";

const { ccclass, property } = _decorator;

const PREFAB_TAB_SELECTED = new Color(255, 210, 140, 255);
const PREFAB_TAB_OPEN = new Color(255, 255, 255, 255);
const PREFAB_TAB_LOCKED = new Color(160, 164, 176, 255);
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

const TAB_ICON: { [id: string]: string } = {
  fetter: "ui/city/main-scene_spr-fetters-unlock",
};

const ACTIVITY_NAMES = [
  "ActRecommend",
  "ActSevenDay",
  "ActHeroArrive",
  "ActPrivilege",
  "ActWelfare",
  "BtnActExpand",
  "ActLimitGift",
  "ActLimitTime",
];

export interface CityChromeOpenArgs {
  onTab: (id: string) => void;
  actions: CityChromeActions;
}

/**
 * 顶栏和底栏。挂在 UIShell 的 chrome 层，不进页面栈。
 * 货币、战力和头像只显示 MainApp 送进来的字符串，这里不读协议。
 */
@view({
  id: CITY_CHROME_VIEW_ID,
  prefab: CITY_CHROME_PREFAB_PATH,
  layer: UILayer.Hud,
  cache: false,
  allowMultiple: false,
  hostId: CITY_CHROME_HOST,
  mount: mountCityChromeView,
})
@ccclass("CityChromeView")
export class CityChromeView extends BaseView<CityChromeOpenArgs> implements CityChrome {
  @property(Node)
  lblName: Node | null = null;

  @property(Node)
  lblSub: Node | null = null;

  @property(Node)
  lblLevel: Node | null = null;

  @property(Node)
  levelBg: Node | null = null;

  @property(Node)
  avatar: Node | null = null;

  @property(Node)
  goldValue: Node | null = null;

  @property(Node)
  gemValue: Node | null = null;

  @property(Node)
  powerValue: Node | null = null;

  @property(Node)
  actGroup: Node | null = null;

  @property(Node)
  utilityRow: Node | null = null;

  @property(Node)
  bottomBg: Node | null = null;

  @property(Node)
  tabCity: Node | null = null;

  @property(Node)
  tabHero: Node | null = null;

  @property(Node)
  tabBag: Node | null = null;

  @property(Node)
  tabBattle: Node | null = null;

  @property(Node)
  tabDungeon: Node | null = null;

  @property(Node)
  tabClan: Node | null = null;

  @property(Node)
  tabFetter: Node | null = null;

  @property([Node])
  activityButtons: Node[] = [];

  @property(Node)
  btnReplay: Node | null = null;

  @property(Node)
  btnFriend: Node | null = null;

  @property(Node)
  btnMail: Node | null = null;

  @property(Node)
  btnRank: Node | null = null;

  @property(Node)
  btnMore: Node | null = null;

  private onTab: ((id: string) => void) | null = null;
  private actions: CityChromeActions | null = null;
  private tabs: { [id: string]: Node } = {};
  private started = false;

  get root(): Node {
    return this.node;
  }

  onOpen(args?: CityChromeOpenArgs): void {
    if (args) {
      this.args = args;
      this.onTab = args.onTab;
      this.actions = args.actions;
    }
    if (this.started) return;
    this.started = true;
    this.beginOpen();
    try {
      this.bindAll();
      this.finishOpen();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(messageOf(err));
      GameLog.shared.warn("CityChrome", "没有挂上 " + error.message);
      this.failOpen(error);
    }
  }

  setIdentity(nameLine: string, subLine: string): void {
    if (this.lblName) setText(this.lblName, nameLine);
    if (!this.lblSub) return;
    const debug = subLine.indexOf("真服 ·") === 0;
    this.lblSub.active = !debug;
    setText(this.lblSub, debug ? "" : subLine);
  }

  setCurrencies(goldLine: string, diamondLine: string): void {
    if (this.goldValue) setText(this.goldValue, goldLine);
    if (this.gemValue) setText(this.gemValue, diamondLine);
  }

  setPower(text: string): void {
    const node = this.powerValue;
    if (!node) return;
    setText(node, text);
    const label = node.getComponent(Label);
    if (label) label.overflow = Overflow.SHRINK;
    assignContentSize(node.getComponent(UITransform), 68, 24);
  }

  setLevelBadge(text: string): void {
    const show = text.length > 0;
    if (this.lblLevel) {
      this.lblLevel.active = show;
      if (show) setText(this.lblLevel, text);
    }
    if (this.levelBg) this.levelBg.active = show;
  }

  setAvatar(icon: string | null): void {
    this.paintAvatar(icon);
  }

  setTabs(tabs: TabState[]): void {
    const paint = tabPaintState(tabs.map((tab) => tab.state));
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const button = this.tabs[tab.id];
      if (!button) continue;
      const state = paint[i] === "locked" ? "locked" : paint[i] === "selected" ? "selected" : "open";
      setCityTabSelected(button, state === "selected");
      tintSprite(button, prefabTabColor(state));
      const lock = button.getChildByName("Lock");
      if (lock) {
        const locked = tab.state === "locked";
        lock.active = locked;
        if (locked) paintLockLevel(lock, tab.lockLevel && tab.lockLevel > 1 ? tab.lockLevel : 0);
      }
    }
  }

  setCityExtras(visible: boolean): void {
    if (this.actGroup) this.actGroup.active = visible;
    if (this.utilityRow) this.utilityRow.active = visible;
  }

  private bindAll(): void {
    this.sealBottom();
    const tabNodes = [this.tabCity, this.tabHero, this.tabBag, this.tabBattle, this.tabDungeon, this.tabClan, this.tabFetter];
    if (tabNodes.length !== CITY_BAR.length) throw new Error("底栏按钮数量不对");
    for (let i = 0; i < CITY_BAR.length; i++) {
      const entry = CITY_BAR[i];
      const button = tabNodes[i];
      if (!button) throw new Error("缺少节点 " + entry.id);
      prepareCityTab(button);
      const lock = button.getChildByName("Lock");
      if (lock) lock.active = false;
      const label = button.getChildByName("Label");
      if (label) label.active = false;
      mountTabCaption(button, TAB_CAPTION[entry.id] || "");
      mountTabIcon(button, TAB_ICON[entry.id] || "");
      bindClick(button, () => {
        if (this.onTab) this.onTab(entry.id);
      });
      this.tabs[entry.id] = button;
    }
    this.bindActivity();
    this.bindMore();
    this.requireNode(this.lblName, "LblName");
    this.requireNode(this.lblSub, "LblSub");
    this.requireNode(this.goldValue, "CurrencyGold/Value");
    this.requireNode(this.gemValue, "CurrencyGem/Value");
    this.requireNode(this.powerValue, "PowerSlot/Value");
    this.requireNode(this.lblLevel, "LblLevel");
    this.requireNode(this.levelBg, "LevelBg");
    this.requireNode(this.avatar, "Avatar");
    this.requireNode(this.actGroup, "ActGroup");
    this.requireNode(this.utilityRow, "UtilityRow");
    bindVisibleRefresh(this.node, () => {
      if (!this.node || !this.node.isValid) return;
      const box = fitVisibleRoot(this.node);
      this.fitChildren(box.width);
    });
    GameLog.shared.info("CityChrome", "view " + CITY_CHROME_PREFAB_PATH);
  }

  private bindActivity(): void {
    const buttons = this.activityButtons;
    if (!buttons || buttons.length !== ACTIVITY_NAMES.length) throw new Error("ActGroup 按钮没有绑全");
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      if (!button) throw new Error("缺少节点 " + ACTIVITY_NAMES[i]);
      bindClick(button, () => {
        if (this.actions) this.actions.openActivity();
        else GameLog.shared.warn("CityChrome", "活动按钮没有回调");
      });
    }
  }

  private bindMore(): void {
    const more = [this.btnReplay, this.btnFriend, this.btnRank, this.btnMore];
    const names = ["BtnReplay", "BtnFriend", "BtnRank", "BtnMore"];
    for (let i = 0; i < more.length; i++) {
      const button = more[i];
      if (!button) throw new Error("缺少节点 " + names[i]);
      bindClick(button, () => {
        if (this.actions) this.actions.openMore();
        else GameLog.shared.warn("CityChrome", "更多按钮没有回调");
      });
    }
    const mail = this.requireNode(this.btnMail, "BtnMail");
    bindClick(mail, () => {
      if (this.actions) this.actions.openMail();
      else GameLog.shared.warn("CityChrome", "邮件按钮没有回调");
    });
  }

  private requireNode(node: Node | null, label: string): Node {
    if (!node) throw new Error("缺少节点 " + label);
    return node;
  }

  /**
   * 底栏只用预制上的 Bg。不再铺运行时色块，避免七个键后面多一层深色垫。
   */
  private sealBottom(): void {
    const bg = this.requireNode(this.bottomBg, "BottomBar/Bg");
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

  /**
   * 顶栏底栏按可见宽拉开。这里只看根的直接子节点，用来拉条，不拿来找业务节点。
   */
  private fitChildren(width: number): void {
    const kids = this.node.children;
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (child.name === "TopBar" || child.name === "top-bg") stretchBar(child, width, "top");
      else if (child.name === "BottomBar" || child.name === "bottom-bg") stretchBar(child, width, "bottom");
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
    layoutCityHeader(this.node,width);
  }

  private paintAvatar(icon: string | null): void {
    const avatar = this.avatar;
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
}

function mountTabCaption(button: Node, path: string): void {
  if (!path) return;
  const size = uiSize(button.getComponent(UITransform));
  const plate = size ? size.height : 78;
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

function prefabTabColor(state: TabState["state"]): Color {
  if (state === "locked") return PREFAB_TAB_LOCKED;
  if (state === "selected") return PREFAB_TAB_SELECTED;
  return PREFAB_TAB_OPEN;
}
