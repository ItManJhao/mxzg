/**
 * 英雄列表、背包、挂机底栏、出阵，把已有贴图填进 P4 壳。
 * 背包格子和页签来自 BackpackItemCell / BackpackTabButton，只改字和图。
 * 背包滚动是 BackpackLayer/spr_box/BagScroll，运行时只往 content 里放格子。
 * 英雄滚动是 HeroListHeroLayer/spr_box/HeroScroll，详情是 HeroInfoLayer/node_panel/DetailBody/DetailScroll。
 * 元素筛选是 HeroListHeroLayer/node_elem/elem_menu/btn_elem0…5（全部、火、水、木、光、暗）。
 * 格子、页签、羊皮纸垫、弹层底都在预制里。找不到只打日志，不新造壳。
 * 不造假英雄、不造假道具、不发新协议。
 */
import { BlockInputEvents, Button, Color, director, Director, Graphics, HorizontalTextAlignment, Label, Mask, Node, Overflow, Prefab, resources, ScrollView, Sprite, SpriteFrame, UITransform, VerticalTextAlignment } from "cc";
import { DESIGN_WIDTH } from "./safeAreaLayout";
import { ConfigDb } from "../config/ConfigLoader";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameStore, StoreBagItem, StoreHero } from "../core/GameStore";
import { GameLog } from "../core/GameLog";
import { Session } from "../core/Session";
import { NetClient } from "../net/NetClient";
import { Proto } from "../net/protocol/Proto";
import { WireSession } from "../net/WireSession";
import { applyIdleClaim, claimToast, IDLE_HERO_EXP_ID, IDLE_ITEM_ID, IDLE_ROLE_EXP_ID } from "../module/idle/rewards";
import { heroBaseStats, heroProfile, heroSkillPage, HeroProfile, itemBagTab, itemIconResource, itemIsWallet, itemProfile, listHeroProfiles, occupationName } from "../config/gameCatalog";
import { chapterDrops, chapterIdleMinute, chapterStageCaption, chapterStageFace, DropFace, heroLevelNeed, heroSpaceCap, heroStarNeeds, heroStarStep, idleCapMs, idleDropEverySec, listDragons, listGodGears, listJewels, listRelics, RelicFace, SacrificeNeed, StarStep, vipIdleBonus, vipIdleLine } from "../config/rosterCatalog";
import { hangFace, hangShownStage } from "../features/battle/model/hangFace";
import { IDLE_UNIX_FLOOR, wireIdleCapMs, wireIdleElapsedMs } from "../net/protocol/wireIdle";
import { formationFaceSlot, WIRE_LINEUP_SAVE_POSITIONS } from "../net/protocol/wireLineUpSave";
import { mainFormationHeroes } from "../net/protocol/starterLineup";
import { formatHangClock, goldPerMin, itemEveryMs } from "../module/idle/rewards";
import { pickHeroTalkLan, plainTalk, readHeroTalkRows } from "./idleHangTalkPlan";
import { hangSpineStem } from "./idleHangRoster";
import {
  hangBarFillBox,
  hangBattleGlowPaths,
  hangBattleGlowStepMs,
  HANG_BATTLE_GLOW_SPEED,
} from "./hangChrome";
import { paintIdleLoot, playIdleHarvest, seatHangTimer, writeHangClock } from "./idleHangView";
import { mountBattleSpine, mountNamedSpine } from "./battleSpine";
import { HERO_DETAIL_SPINE_SEAT_Y, HERO_EMPTY_RING_NAMES, HERO_SKILL_BADGE_OFFSET } from "./heroDetailPlan";
import { deployedHeroIds, localLineupIds, setLocalLineup } from "../module/mainline/localLineup";
import { mockRuntimeEnabled } from "../net/transportSelect";
import { emptyBagToast } from "../module/bag/items";
import { formatStoreBagLine } from "../module/bag/bagView";
import { growAnchorDelta, listWindowSpread, PARCHMENT_FIT_SIDE } from "./ccbiPlace";
import { assignContentSize, bindVisibleRefresh, positiveUiSize, readVisibleBox, uiSize } from "./visibleFit";
import { findNode, loadPrefab, spawnPrefab } from "./prefabLoad";
import { createLabel, createRect, place, setText, uiNode } from "./UiKit";

const INK = new Color(122, 71, 45, 255);
const CREAM = new Color(255, 236, 190, 255);
const COUNT = new Color(255, 248, 220, 255);
const SHORT = new Color(196, 64, 48, 255);
const COST_OK = new Color(254, 255, 255, 255);

const HERO_LIST_BOARD = "prefabs/ui/hero/HeroListHeroLayer";
const HERO_LEVEL_BOARD = "prefabs/ui/hero/HeroInfoUpLevelLayer";
const HERO_STAR_BOARD = "prefabs/ui/hero/HeroInfoUpStarLayer";
const HERO_SKILL_BOARD = "prefabs/ui/hero/HeroSkillInfoLayer";
const HERO_ATTR_BOARD = "prefabs/ui/hero/HeroInfoAttrLayer";
const BAG_INFO_BOARD = "prefabs/ui/backpack/BackpackInfoLayer";
const HERO_CELL = "prefabs/ui/hero/HeroIconCell";
const CATALOG_CELL = "prefabs/ui/hero/CatalogIconCell";
const DRAGON_CARD = "prefabs/ui/hero/DragonCard";
const TEXT_CHIP = "prefabs/ui/common/TextChip";
const INFO_CARD = "prefabs/ui/common/InfoCard";
const DIM_SHEET = "prefabs/ui/common/DimSheet";
/** language 5788。店员那句，不另写文案。 */
const BAG_SHOP_LAN = "5788";
const BAG_SHOP_FALLBACK = "欢迎光临～";
const BAG_PORTRAIT = "shangcheng";
const HERO_EXP_ITEM = 900101;

const COLS = 4;
const HERO_PITCH_X = 108;
const HERO_PITCH_Y = 112;
/** 格子 96。日服设计宽下 pitch ≈ rare-0 加边距再加 10（约 129×131）。118 是底栏之上仍能看见第 5 行大半的间距。 */
/** language 2101–2105。elem 0 是筛选里的全部。六个钮是全部、火、水、木、光、暗。 */
const ELEM_NAME = ["", "火", "水", "木", "光", "暗"];
const HERO_ELEM_BUTTONS = 6;
/** HeroListHeroLayer 上已有的路径。缺了只打日志，不在代码里造钮。 */
const HERO_ELEM_ROW = "node_elem";
const HERO_ELEM_MENU = "node_elem/elem_menu";
const HERO_ELEM_BUTTON = "node_elem/elem_menu/btn_elem";
const HERO_ELEM_SPRITE = "ui/hero/hero-icon_elem-";
/** HeroListLayer 上已有的页签。缺了只打日志，不 new 钮。 */
const HERO_TAB_MENU = "UIMenu_1";
const HERO_TAB_HERO = "UIMenu_1/btn_hero";
const HERO_TAB_BOOK = "UIMenu_1/btn_illustrat";
const HERO_TAB_DRAGON = "UIMenu_1/btn_dragon";
const GEM_PLACES = [
  { id: 1, title: "攻击" },
  { id: 2, title: "生命" },
  { id: 3, title: "速度" },
];
const GEAR_PLACES = [
  { id: 1, title: "戒指" },
  { id: 2, title: "耳环" },
  { id: 3, title: "披风" },
  { id: 4, title: "腰带" },
];

type BagTab = "equip" | "item" | "shard" | "spirit";

const BAG_TABS: { id: BagTab; title: string }[] = [
  { id: "equip", title: "装备" },
  { id: "item", title: "道具" },
  { id: "shard", title: "碎片" },
  { id: "spirit", title: "精灵" },
];

/** 阵法 1 只编码 2/3/5/6/7/8/9。前排 4、后排 4 里多出来的一格留空。 */
const FORM_MAX = WIRE_LINEUP_SAVE_POSITIONS.length;

export function fillPageShell(id: string, view: Node, openHero: (hero: StoreHero) => void): void {
  if (!view.isValid) return;
  if (id === "hero") fillHero(view, openHero);
  else if (id === "bag") fillBag(view);
}

/**
 * 藏掉殿堂缩略图和「地图 / 999」字。地图框 main-scene_spr-map-frame-1 留着，
 * 它是底栏中间的金环水晶，盖住奶油色空板。环心是透明的，后面垫一块奶油色，
 * 底板那两颗黑圆不透出来。不放蓝核。掉落堆抬到环顶上面。
 * 四条收益按原图高度填充。三颗钮各留一个居中的字。中间「战斗」循环 btn-battle 光，字仍在光上面。
 */
export function dressHangPanel(view: Node): void {
  const mark = view as Node & { mxzgHang?: boolean };
  if (mark.mxzgHang) return;
  mark.mxzgHang = true;
  const plate = view.getChildByName("CCSprite_1");
  hideNamed(view, "spr_world");
  hideNamed(view, "lbl_map");
  hideNamed(view, "spr_world_icon");
  hideNamed(view, "lbl_mission_name");
  const frame = plate ? plate.getChildByName("CCSprite_1") : null;
  if (frame) {
    frame.active = true;
    maskCrystalHole(frame);
  }
  // 先收成自定义尺寸。RAW 贴图在 originalSize 还是 null 时，引擎 setContentSize 会读 width。
  pinSprites(view);
  seatHangButton(findNamed(view, "btn_lineup"), "战力UP", 22);
  seatHangButton(findNamed(view, "btn_battle"), "战斗", 22);
  seatHangButton(findNamed(view, "btn_speed_battle"), "高速战斗", 20);
  seatBattleGlow(findNamed(view, "btn_battle"));
  let claimNote = "";
  let seenReward = GameStore.idle().rewardTime;
  let seenClaim = WireSession.claimSerial;
  let hangTickWidth = false;
  const tick = () => {
    if (!view.isValid) return;
    try {
      const idle = GameStore.idle();
      const clock = hangClockText(idle);
      const rates = hangRates();
      writeBar(view, "lbl_progress_time", clock === "未同步" ? "未同步" : clock);
      writeBar(view, "lbl_gold", rates.gold);
      writeBar(view, "lbl_souls", rates.souls);
      writeBar(view, "lbl_exp", rates.exp);
      setBarFill(view, "spr_progress_AFK_bg", "ui/city/main-scene_progress-AFK", clock === "未同步" ? 0 : timeFill(idle));
      setBarFill(view, "CCSprite_4", "ui/city/main-scene_progress-hangs", rates.goldOn ? 1 : 0);
      setBarFill(view, "CCSprite_3", "ui/city/main-scene_progress-exp", rates.soulsOn ? 1 : 0);
      setBarFill(view, "CCSprite_2", "ui/city/main-scene_progress-role-exp", rates.expOn ? 1 : 0);
      syncVip(view, plate);
      const hang = view.parent ? view.parent.getChildByName("IdleHang") : null;
      if (hang) paintIdleLoot(hang, hangLootIcons(rates));
      const bubble = findNamed(view, "node_bubble") || (hang ? hang.getChildByName("node_bubble") : null);
      if (bubble) {
        writeHangClock(bubble, claimNote || clock);
        if (hang) seatHangTimer(hang, bubble);
      }
    } catch (err) {
      if (messageOf(err).indexOf("width") < 0) throw err;
      if (!hangTickWidth) {
        hangTickWidth = true;
        GameLog.shared.warn("MainApp", "hang shell width hangTick");
      }
    }
  };
  const onIdleSync = () => {
    const idle = GameStore.idle();
    if (WireSession.claimSerial !== seenClaim) {
      seenClaim = WireSession.claimSerial;
      const noteText = WireSession.claimNote;
      claimNote = noteText.indexOf("解不开") >= 0 || noteText.indexOf("没有 reward_time") >= 0 ? "领取未生效" : "";
    }
    if (idle.rewardTime !== seenReward) {
      seenReward = idle.rewardTime;
      if (idle.fromStore) claimNote = "";
    }
    tick();
  };
  tick();
  const timer = setInterval(tick, 1000);
  const offIdle = WireSession.onSync(onIdleSync);
  view.once(Node.EventType.NODE_DESTROYED, () => {
    clearInterval(timer);
    offIdle();
  });
  bindHangClaim(view, (text, resetClock) => {
    claimNote = text;
    if (resetClock) dressClock.t = Date.now();
    tick();
  });
}

const COIN_ICON = "ui/common/res-icon_res-1";
const GEM_ICON = "ui/common/res-icon_res-2";
const CHEST_ICON = "ui/city/main-scene_spr-box-2";
const MOON_ICON = "ui/bag/backpack_900101";
const ROLE_ICON = "ui/bag/backpack_900003";

interface HangRates {
  gold: string;
  souls: string;
  exp: string;
  goldOn: boolean;
  soulsOn: boolean;
  expOn: boolean;
  hasTable: boolean;
}

/** 三格来自当前关 reward_base。表没绑上时真服写 —/m，Mock 仍退回旧节奏。 */
function hangRates(): HangRates {
  const minute = chapterIdleMinute(currentStageIdx());
  if (minute) {
    return {
      gold: minute.gold + "/m",
      souls: minute.heroExp + "/m",
      exp: minute.roleExp + "/m",
      goldOn: minute.gold > 0,
      soulsOn: minute.heroExp > 0,
      expOn: minute.roleExp > 0,
      hasTable: true,
    };
  }
  if (Session.source === "wire") {
    return { gold: "—/m", souls: "—/m", exp: "—/m", goldOn: false, soulsOn: false, expOn: false, hasTable: false };
  }
  const cleared = clearedCount();
  const gold = goldPerMin(cleared);
  const every = itemEveryMs(cleared);
  const perMin = every > 0 ? Math.max(1, Math.round(60000 / every)) : 0;
  const sec = Math.max(1, Math.round(every / 1000));
  return {
    gold: gold + "/m",
    souls: perMin + "/m",
    exp: "每" + sec + "s",
    goldOn: gold > 0,
    soulsOn: perMin > 0,
    expOn: sec > 0,
    hasTable: false,
  };
}

/** 有每分钟或 drop_group 才叠图标。没有数据就返回空，场地不留空框。 */
function hangLootIcons(rates: HangRates): string[] {
  const drops = chapterDrops(currentStageIdx());
  if (!rates.hasTable && drops.length === 0 && Session.source === "wire") return [];
  if (!rates.hasTable && drops.length === 0 && !rates.goldOn && !rates.soulsOn) return [];
  const icons: string[] = [];
  if (rates.goldOn || rates.hasTable) icons.push(COIN_ICON, COIN_ICON, COIN_ICON, COIN_ICON);
  if (rates.soulsOn || rates.hasTable) icons.push(MOON_ICON, MOON_ICON);
  if (rates.expOn || rates.hasTable) icons.push(ROLE_ICON);
  icons.push(GEM_ICON, GEM_ICON, CHEST_ICON);
  for (let i = 0; i < drops.length && icons.length < 8; i++) {
    const face = drops[i];
    icons.push(itemIconResource(face.itemType, null) || "ui/bag/backpack_" + face.itemType);
  }
  if (icons.length === 0) return [];
  const pile: string[] = [];
  for (let i = 0; i < 14; i++) pile.push(icons[i % icons.length]);
  return pile;
}

/**
 * 没有角色 VIP 等级时藏起预制上的那一行。s2c 2001 没有 vip_level，不把「未同步」画在战斗钮下面。
 * 有等级时只改预制里的 HangVip。节点不在就不另写一行。三格仍不乘百分比。
 */
function syncVip(view: Node, plate: Node | null): void {
  const host = plate || view;
  const bonus = vipIdleBonus(null);
  const vip = host.getChildByName("HangVip");
  if (!vip) {
    if (bonus) GameLog.shared.warn("Hang", "HangVip 不在预制上，不另写一行");
    return;
  }
  if (!bonus) {
    vip.active = false;
    return;
  }
  vip.active = true;
  setText(vip, vipIdleLine(bonus.level));
}

let battleGlowMissLogged = false;

/**
 * effect2 的 eff_battle_layer_battle。光挂在钮心，画在字下面。
 * 十张都没有时紫底和「战斗」还在。不挡点击。
 */
function seatBattleGlow(button: Node | null): void {
  if (!button || button.getChildByName("BattleGlow")) return;
  const glow = uiNode("BattleGlow");
  const glowUi = glow.addComponent(UITransform);
  assignContentSize(glowUi, 224, 102);
  const image = glow.addComponent(Sprite);
  image.sizeMode = Sprite.SizeMode.CUSTOM;
  image.type = Sprite.Type.SIMPLE;
  glow.setPosition(0, 0, 0);
  try {
    glow.parent = button;
    glow.setSiblingIndex(0);
  } catch (_err) {
    if (glow.isValid) glow.destroy();
    return;
  }
  const step = hangBattleGlowStepMs(HANG_BATTLE_GLOW_SPEED);
  const paths = hangBattleGlowPaths();
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };
  button.once(Node.EventType.NODE_DESTROYED, stop);
  const pending: Promise<SpriteFrame | null>[] = [];
  for (let i = 0; i < paths.length; i++) pending.push(loadGlowFrame(paths[i]));
  Promise.all(pending).then((frames) => {
    if (!glow.isValid) {
      stop();
      return;
    }
    const ready: SpriteFrame[] = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame) ready.push(frame);
    }
    if (ready.length === 0) {
      noteBattleGlowMiss();
      glow.active = false;
      return;
    }
    let index = 0;
    const tick = () => {
      if (!glow.isValid) {
        stop();
        return;
      }
      const frame = ready[index % ready.length];
      try {
        image.spriteFrame = frame;
      } catch (_err) {
        index += 1;
        return;
      }
      const size = frameSize(frame);
      const ui = glow.getComponent(UITransform);
      if (ui && size) assignContentSize(ui, size.width, size.height);
      index += 1;
    };
    tick();
    timer = setInterval(tick, step);
  });
}

function loadGlowFrame(path: string): Promise<SpriteFrame | null> {
  return new Promise((resolve) => {
    try {
      resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
        if (err || !asset) resolve(null);
        else resolve(asset);
      });
    } catch (_err) {
      resolve(null);
    }
  });
}

function noteBattleGlowMiss(): void {
  if (battleGlowMissLogged) return;
  battleGlowMissLogged = true;
  GameLog.shared.warn("Mainline", "挂机战斗钮光 main-scene-effect_btn-battle 没有挂上，紫底仍在");
}

/** 条上的字原来是 0×0 再 SHRINK，看起来像空槽。右对齐铺进槽里。 */
function writeBar(view: Node, name: string, text: string): void {
  const node = findNamed(view, name);
  if (!node) return;
  node.setScale(1, 1, 1);
  const ui = node.getComponent(UITransform);
  if (ui) {
    ui.setAnchorPoint(1, 0.5);
    assignContentSize(ui, 118, 24);
  }
  const label = node.getComponent(Label);
  if (!label) return;
  try {
    label.string = text;
    label.fontSize = 16;
    label.lineHeight = 20;
    label.overflow = Overflow.SHRINK;
    label.horizontalAlign = HorizontalTextAlignment.RIGHT;
  } catch (_err) {
    /* 字号装配读到空尺寸时这一拍留原字，下一拍再写。 */
  }
}

function setBarFill(view: Node, barName: string, art: string, ratio: number): void {
  const bar = findNamed(view, barName);
  if (!bar) return;
  let fill = bar.getChildByName("HangFill");
  if (!fill) {
    const box = hangBarFillBox(art);
    const next = sprite("HangFill", box.w, box.h, art);
    // 进树会走装配并读 width。尺寸还是 null 时这一拍不挂，下一拍再试。
    if (!uiSize(next.getComponent(UITransform))) {
      next.destroy();
      return;
    }
    try {
      place(next, bar, 0, 0);
    } catch (_err) {
      if (next.isValid) next.destroy();
      return;
    }
    fill = next;
  }
  const image = fill.getComponent(Sprite);
  const span = ratio <= 0 ? 0 : Math.min(1, ratio);
  // FILLED 组装器在贴图还没挂上时读 spriteFrame.width。这一拍留普通图，下一拍再填。
  if (!image || !fillFrameReady(image) || !uiSize(fill.getComponent(UITransform))) {
    calmFill(image, fill);
    if (barName === "spr_progress_AFK_bg") seatHangProgressSpine(bar, span);
    return;
  }
  try {
    if (image.type !== Sprite.Type.FILLED) {
      image.type = Sprite.Type.FILLED;
      image.fillType = Sprite.FillType.HORIZONTAL;
      image.fillStart = 0;
    }
    image.fillRange = span;
    setNodeActive(fill, span > 0);
  } catch (_err) {
    calmFill(image, fill);
    noteHangWidthOnce("setBarFill");
  }
  if (barName === "spr_progress_AFK_bg") seatHangProgressSpine(bar, span);
}

/** 贴图和纹理都在，组装器读 spriteFrame.width 才不会碰到 null。 */
function fillFrameReady(image: Sprite): boolean {
  try {
    const frame = image.spriteFrame;
    if (!frame) return false;
    const texture = frame.texture;
    if (!texture || typeof texture.width !== "number" || !(texture.width > 0)) return false;
    const rect = frame.rect;
    if (!rect || typeof rect.width !== "number") return false;
    return true;
  } catch (_err) {
    return false;
  }
}

function frameSize(frame: SpriteFrame): { width: number; height: number } | null {
  try {
    const size = frame.originalSize;
    if (!size || typeof size.width !== "number" || typeof size.height !== "number") return null;
    if (!(size.width > 0) || !(size.height > 0)) return null;
    return { width: size.width, height: size.height };
  } catch (_err) {
    return null;
  }
}

function calmFill(image: Sprite | null, fill: Node): void {
  if (image && image.type !== Sprite.Type.SIMPLE) {
    try {
      image.type = Sprite.Type.SIMPLE;
    } catch (_err) {
      /* 下一拍再改回普通图。 */
    }
  }
  setNodeActive(fill, false);
}

function setNodeActive(node: Node, active: boolean): void {
  if (!node.isValid || node.active === active) return;
  try {
    node.active = active;
  } catch (_err) {
    /* 启用时引擎仍可能读 width。下一拍再试。 */
  }
}

const hangWidthSteps = new Set<string>();

function noteHangWidthOnce(step: string): void {
  if (hangWidthSteps.has(step)) return;
  hangWidthSteps.add(step);
  GameLog.shared.warn("MainApp", "hang shell width " + step);
}

/**
 * jindutiao 铺在宝箱条上，遮罩跟着已挂机比例拉开。底下的填充图仍在。
 * Mask 一启用就会读 contentSize.width。节点还没挂上尺寸时先不挂遮罩，下一拍再试。
 */
function seatHangProgressSpine(bar: Node, ratio: number): void {
  const size = uiSize(bar.getComponent(UITransform));
  const width = size && size.width > 0 ? size.width : 166;
  const height = size && size.height > 0 ? size.height : 36;
  const drawn = Math.max(0, Math.round(width * ratio));
  let mask = bar.getChildByName("HangSpineMask");
  if (!mask) {
    mask = uiNode("HangSpineMask");
    const created = mask.addComponent(UITransform);
    created.setAnchorPoint(0, 0.5);
    if (!assignContentSize(created, drawn, height)) {
      mask.destroy();
      return;
    }
    mask.setPosition(-width * 0.5, 0, 0);
    try {
      mask.parent = bar;
    } catch (_err) {
      if (mask.isValid) mask.destroy();
      return;
    }
    const spine = uiNode("Spine");
    const spineUi = spine.addComponent(UITransform);
    assignContentSize(spineUi, 275, 39);
    spine.setScale(width / 275, height / 39, 1);
    spine.setPosition(width * 0.5, 0, 0);
    try {
      spine.parent = mask;
    } catch (_err) {
      if (spine.isValid) spine.destroy();
    }
    if (spine.isValid && spine.parent === mask) mountNamedSpine(spine, "jindutiao", "stand");
  }
  const maskUi = mask.getComponent(UITransform);
  if (!assignContentSize(maskUi, drawn, height)) {
    setNodeActive(mask, false);
    return;
  }
  try {
    if (!mask.getComponent(Mask)) {
      const maskComp = mask.addComponent(Mask);
      maskComp.type = Mask.Type.GRAPHICS_RECT;
    }
    setNodeActive(mask, ratio > 0);
  } catch (_err) {
    // onEnable 仍可能在尺寸空档读 width。条上的填充图还在，下一拍再挂遮罩。
    setNodeActive(mask, false);
  }
}

/** 底栏宝箱。Mock 走 idle.claim，真服只发已有的空 3005。 */
function bindHangClaim(view: Node, note: (text: string, resetClock: boolean) => void): void {
  const buttons = [findNamed(view, "btn_icon"), findNamed(view, "spr_box")];
  let busy = false;
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    if (!button) continue;
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      if (busy) return;
      busy = true;
      const hang = view.parent ? view.parent.getChildByName("IdleHang") : null;
      if (hang) playIdleHarvest(hang);
      void claimHang(view, note).then(() => {
        busy = false;
      });
    });
  }
}

async function claimHang(view: Node, note: (text: string, resetClock: boolean) => void): Promise<void> {
  if (Session.source === "wire") {
    if (!WireSession.claimIdle()) {
      note("真服未连接", false);
      return;
    }
    note("已发领取", false);
    return;
  }
  try {
    const resp = await Proto.idleClaim({}, NetClient.shared);
    if (!view.isValid) return;
    if (!resp.ok) {
      note(errorText(resp.code ?? ErrorCode.IDLE_EMPTY), false);
      return;
    }
    applyIdleClaim(resp);
    note(claimToast(countReward(resp, 1), countReward(resp, IDLE_ITEM_ID), countReward(resp, IDLE_ROLE_EXP_ID), countReward(resp, IDLE_HERO_EXP_ID)), true);
  } catch (err) {
    note(messageOf(err), false);
  }
}

function countReward(resp: { rewards?: { id: number; count: number }[] }, id: number): number {
  const rewards = resp.rewards;
  if (!rewards) return 0;
  let total = 0;
  for (let i = 0; i < rewards.length; i++) {
    if (rewards[i].id !== id) continue;
    const count = rewards[i].count;
    if (typeof count === "number" && isFinite(count) && count > 0) total += Math.floor(count);
  }
  return total;
}

/** 英雄出阵。真服发 3100（formation_id 字段 5），空包后再进战斗。Mock 只在 ?dev=mock 时记本局。 */
export function bindFormationSheet(view: Node, onConfirm: () => void): void {
  silenceBigMenus(view);
  writeNamed(view, "lbl_title", "英雄出阵");
  const title = findNamed(view, "lbl_title");
  if (title) {
    const label = title.getComponent(Label);
    if (label && label.fontSize > 32) label.fontSize = 28;
  }
  fitButton(findNamed(view, "btn_confirm"), "出阵", 26);
  for (let n = 1; n <= 9; n++) {
    const lock = findNamed(view, "spr_lock_" + n);
    if (lock) lock.active = n === 9;
  }
  let elem = 0;
  let selected = formationIds();
  let cellPrefab: Prefab | null = null;
  const paint = () => {
    if (!view.isValid || !cellPrefab) return;
    paintFormationGrid(view, elem, selected, cellPrefab, (heroId) => {
      selected = toggleId(selected, heroId);
      paint();
    });
    paintFormationSlots(view, selected, (heroId) => {
      selected = toggleId(selected, heroId);
      paint();
    });
    const owned = GameStore.heroes();
    const roster = rosterOf(elem);
    if (!owned) writeNamed(view, "lbl_tip", "名册未到");
    else if (owned.length === 0) writeNamed(view, "lbl_tip", "空名册，没有可上阵的英雄");
    else if (roster.length === 0) writeNamed(view, "lbl_tip", "这个元素没有");
    else writeNamed(view, "lbl_tip", selected.length >= FORM_MAX ? "上阵 " + FORM_MAX + "/" + FORM_MAX : "已选 " + selected.length + "/" + FORM_MAX);
  };
  for (let i = 0; i <= 5; i++) {
    const button = findNamed(view, "btn_elem" + i);
    const pick = i;
    if (!button) continue;
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      elem = pick;
      const markNode = findNamed(view, "spr_select");
      if (markNode && button.parent) {
        if (markNode.parent !== button.parent) markNode.parent = button.parent;
        markNode.setPosition(button.position.x, button.position.y, 0);
      }
      paint();
    });
  }
  const confirm = findNamed(view, "btn_confirm");
  if (confirm) {
    confirm.setSiblingIndex(Math.max(0, (confirm.parent ? confirm.parent.children.length : 1) - 1));
    if (!confirm.getComponent(Button)) confirm.addComponent(Button);
    let saving = false;
    confirm.on(Button.EventType.CLICK, () => {
      if (saving) return;
      if (selected.length === 0) {
        GameLog.shared.info("Mainline", "出阵没有英雄，仍留在挂机");
        return;
      }
      if (Session.source === "wire") {
        const beforeSave = WireSession.lineUpSaveSerial;
        const beforeLine = WireSession.lineUpSerial;
        if (!WireSession.saveMainFormation(selected)) {
          GameLog.shared.info("Mainline", "出阵未发出 3100，服未连接");
          writeNamed(view, "lbl_tip", "服未连接，没有发出 3100");
          return;
        }
        saving = true;
        GameLog.shared.info("Mainline", "出阵已发 3100，formation_id=1，等待空包后再等 3101");
        writeNamed(view, "lbl_tip", "已发 3100，等待 3101");
        let off = (): void => {};
        const timer = setTimeout(() => {
          saving = false;
          off();
          if (view.isValid) writeNamed(view, "lbl_tip", "3100 或 3101 无回包，不出战");
          GameLog.shared.info("Mainline", "3100 或 3101 无回包，不出战");
        }, 8000);
        const stop = () => {
          clearTimeout(timer);
          off();
        };
        off = WireSession.onSync(() => {
          if (!view.isValid) {
            stop();
            return;
          }
          if (WireSession.lineUpSaveSerial === beforeSave) return;
          if (WireSession.lineUpSerial === beforeLine) return;
          stop();
          onConfirm();
        });
        view.once(Node.EventType.NODE_DESTROYED, stop);
        return;
      }
      if (!mockRuntimeEnabled()) {
        GameLog.shared.info("Mainline", "未开 ?dev=mock，不记本地出阵");
        return;
      }
      setLocalLineup(selected);
      onConfirm();
    });
  }
  void loadPrefab(HERO_CELL).then(
    (loaded) => {
      if (!view.isValid) return;
      cellPrefab = loaded;
      paint();
    },
    (err) => {
      GameLog.shared.warn("Hero", "出阵格子预制没挂上 " + messageOf(err));
    }
  );
  const offForm = WireSession.onSync(() => paint());
  view.once(Node.EventType.NODE_DESTROYED, () => offForm());
}

/** 英雄详情：装备圈、属性、技能、育成页签。不发升级、穿戴协议。 */
export function dressHeroDetail(view: Node, hero: StoreHero): void {
  silenceBigMenus(view);
  const evolve = findNamed(view, "node_evolve");
  if (evolve) evolve.active = false;
  const showHead = () => {
    keepEmptyRings(view);
    const profile = heroProfile(hero.heroType);
    const name = hero.name || (profile ? profile.name : "英雄");
    writeNamed(view, "lbl_hero_name", name);
    const elem = profile && profile.elem !== null ? profile.elem : 0;
    const badge = findNamed(view, "icon_elem");
    if (badge) paintSprite(badge, "ui/hero/hero-icon_elem-" + clamp(elem, 0, 5));
    const stars = findNamed(view, "node_star");
    const count = hero.star ?? (profile && profile.star) ?? 0;
    paintStarMarks(stars, count > 5 ? 5 : count);
    if (stars) {
      const extra = stars.getChildByName("lbl_count");
      if (extra) {
        extra.active = count > 5;
        setText(extra, count > 5 ? String(count) : "");
      }
    }
    const bat = findNamed(view, "bat_node");
    const powerText = hero.fighting === null ? "—" : String(hero.fighting);
    const powerNode = bat ? bat.getChildByName("FightValue") : null;
    if (powerNode) setText(powerNode, powerText);
    else GameLog.shared.warn("Hero", "HeroInfoLayer 没有 FightValue");
    const oldSpine = findNamed(view, "DetailSpine");
    if (oldSpine) oldSpine.destroy();
    if (hero.heroId) {
      const ring = findNamed(view, "node_equip");
      const spot = uiNode("DetailSpine");
      if (ring) {
        place(spot, ring, 0, 0);
        const circle = ring.getChildByName("spr_circle");
        if (circle) spot.setSiblingIndex(circle.getSiblingIndex() + 1);
      } else {
        place(spot, view, 320, 620);
      }
      mountBattleSpine(spot, hangSpineStem(hero.heroId, hero.heroType), () => {
        if (spot.isValid) spot.active = false;
      }, { seatY: HERO_DETAIL_SPINE_SEAT_Y });
      if (ring) raiseEquipMenus(ring);
    }
    seatHeroTalk(view, hero.level);
  };
  showHead();
  let refresh = () => {};
  bindHeroChrome(view, () => {
    const all = GameStore.heroes();
    if (!all || all.length < 2) {
      flashToast(view, "没有其它英雄");
      return null;
    }
    let index = -1;
    for (let i = 0; i < all.length; i++) {
      if (all[i].heroId !== null && all[i].heroId === hero.heroId) index = i;
    }
    if (index < 0) {
      flashToast(view, "没有其它英雄");
      return null;
    }
    return { all, index };
  }, (next) => {
    hero = next;
    showHead();
    refresh();
  });
  const panel = findNamed(view, "node_panel") || view;
  const body = findNamed(view, "DetailBody");
  if (!body) GameLog.shared.warn("Hero", "HeroInfoLayer 没有 DetailBody");
  const tabNames = ["btn_tab_grow", "btn_tab_star", "btn_tab_gem", "btn_tab_gear"];
  const tabNodes: Node[] = [];
  for (let i = 0; i < tabNames.length; i++) {
    const button = findNamed(view, tabNames[i]);
    if (button) tabNodes.push(button);
  }
  if (tabNodes.length < tabNames.length) GameLog.shared.warn("Hero", "HeroInfoLayer 的 scroll_view_tab 缺少详情页签");
  let tab = 0;
  let gemPlace = 1;
  let gearPlace = 1;
  let grow: Node | null = null;
  let starBoard: Node | null = null;
  let catalogs: Prefab | null = null;
  let loggedBoard = false;
  const paint = () => {
    if (!view.isValid) return;
    for (let i = 0; i < tabNodes.length; i++) paintTab(tabNodes[i], i === tab);
    if (grow) grow.active = tab === 0;
    if (starBoard) starBoard.active = tab === 1;
    if (body) body.active = tab >= 2;
    const profile = heroProfile(hero.heroType);
    const stats = heroBaseStats(hero.heroType, hero.star ?? (profile ? profile.star : 1));
    if (tab === 0) {
      if (grow) fillGrowBoard(view, grow, hero, profile, stats);
      else if (!loggedBoard) {
        loggedBoard = true;
        GameLog.shared.warn("Hero", "HeroInfoUpLevelLayer 没有挂上");
      }
    } else if (tab === 1) {
      if (starBoard) fillStarBoard(view, starBoard, hero, profile);
      else if (!loggedBoard) {
        loggedBoard = true;
        GameLog.shared.warn("Hero", "HeroInfoUpStarLayer 没有挂上");
      }
    } else if (body && tab === 2) {
      paintGems(view, body, catalogs, gemPlace, (placeId) => {
        gemPlace = placeId;
        paint();
      });
    } else if (body) {
      paintGears(view, body, catalogs, gearPlace, (placeId) => {
        gearPlace = placeId;
        paint();
      });
    }
  };
  refresh = paint;
  for (let i = 0; i < tabNodes.length; i++) {
    const index = i;
    const button = tabNodes[i];
    const mark = button as Node & { mxzgDetailTab?: boolean };
    if (mark.mxzgDetailTab) continue;
    mark.mxzgDetailTab = true;
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      tab = index;
      paint();
    });
  }
  void loadPrefab(CATALOG_CELL).then(
    (loaded) => {
      if (!view.isValid) return;
      catalogs = loaded;
      paint();
    },
    (err) => {
      GameLog.shared.warn("Hero", "图鉴格子预制没挂上 " + messageOf(err));
    }
  );
  holdUpgrade(findNamed(view, "btn_evolution"), "升级");
  void mountNested(view, HERO_LEVEL_BOARD, "GrowBoard").then((node) => {
    if (!node || !view.isValid) return;
    grow = node;
    seatOnPanel(node, panel, 318, 150);
    silenceBigMenus(node);
    const grade = findNamed(node, "btn_up_grade");
    if (grade) grade.active = false;
    holdUpgrade(findNamed(node, "btn_up_level"), "升级");
    const attr = findNamed(node, "btn_attr_detail");
    const attrMark = attr as (Node & { mxzgAttr?: boolean }) | null;
    if (attr && attrMark && !attrMark.mxzgAttr) {
      attrMark.mxzgAttr = true;
      if (!attr.getComponent(Button)) attr.addComponent(Button);
      attr.on(Button.EventType.CLICK, () => showAttrBoard(view, hero));
    }
    for (let i = 1; i <= 6; i++) {
      const mark = findNamed(node, "sp_grade" + i);
      if (mark) mark.active = false;
    }
    paint();
  });
  void mountNested(view, HERO_STAR_BOARD, "StarBoard").then((node) => {
    if (!node || !view.isValid) return;
    starBoard = node;
    seatOnPanel(node, panel, 320, 112.5);
    silenceBigMenus(node);
    const button = findNamed(node, "btn_up_star");
    setGray(button, false);
    if (button) {
      if (!button.getComponent(Button)) button.addComponent(Button);
      button.on(Button.EventType.CLICK, () => {
        GameLog.shared.info("Hero", "升星没有服端写协议，不改星级");
        flashToast(view, "不发升星协议");
      });
    }
    paint();
  });
  paint();
}

interface ParchmentFit {
  extraTop: number;
  extraBottom: number;
  extra: number;
}

const NO_PARCHMENT: ParchmentFit = { extraTop: 0, extraBottom: 0, extra: 0 };

/** 英雄列表上的绿字调试气泡。背包的店员框是 1:1 壳，不在这里收。 */
function hideDebugBubble(view: Node): void {
  const bubble = findNamed(view, "node_bubble");
  if (bubble) bubble.active = false;
}

/**
 * 640 宽的羊皮纸按当前可视设计宽缩小，底左角锚点仍居中。
 * 可视宽 ≥ 640 时缩放为 1。不放大，也不把九宫格拉高去贴顶栏底栏。
 * Prefab 宽保持 640。全屏底图由壳单独铺，不跟着这层缩小。
 */
function fitParchmentWindow(view: Node): ParchmentFit {
  const mark = view as Node & { mxzgParchment?: ParchmentFit; mxzgParchmentBound?: boolean };
  if (!applyParchmentFit(view)) watchParchment(view);
  if (!mark.mxzgParchmentBound) {
    mark.mxzgParchmentBound = true;
    bindVisibleRefresh(view, () => {
      if (!view.isValid) return;
      if (!applyParchmentFit(view)) watchParchment(view);
    });
  }
  return mark.mxzgParchment || NO_PARCHMENT;
}

/** 尺寸齐了才写缩放。没齐返回 false，调用方等下一帧。 */
function applyParchmentFit(view: Node): boolean {
  const mark = view as Node & { mxzgParchment?: ParchmentFit };
  const bg = view.getChildByName("spr_bg");
  const ui = view.getComponent(UITransform);
  const bgUi = bg ? bg.getComponent(UITransform) : null;
  const rootSize = positiveUiSize(ui);
  const bgSize = positiveUiSize(bgUi);
  if (!bg || !ui || !bgUi || !rootSize || !bgSize) {
    syncParchmentPlate(view, bg);
    return false;
  }
  const visible = readVisibleBox();
  const spread = listWindowSpread({
    rootW: rootSize.width,
    rootH: rootSize.height,
    anchorY: ui.anchorY,
    bgY: bg.position.y,
    bgAy: bgUi.anchorY,
    bgH: bgSize.height * Math.abs(bg.scale.y || 1),
    visibleW: visible.width,
    side: PARCHMENT_FIT_SIDE,
  });
  if (spread.scale > 1 || spread.extraTop !== 0 || spread.extraBottom !== 0) {
    GameLog.shared.warn("UI", "羊皮纸铺窗忽略放大 " + spread.scale);
  }
  const scale = spread.scale > 1 ? 1 : spread.scale;
  view.setScale(scale, scale, 1);
  view.setPosition(-(0.5 - ui.anchorX) * rootSize.width * scale, spread.rootY, 0);
  syncParchmentPlate(view, bg);
  mark.mxzgParchment = { extraTop: 0, extraBottom: 0, extra: 0 };
  return true;
}

/** BagView 只走 mountCcbiView，不进 fillBag。列表窗在这里用同一套缩放。 */
export function seatParchmentList(view: Node): void {
  if (view.name !== "BackpackLayer" && view.name !== "HeroListLayer") return;
  fitParchmentWindow(view);
}

/** 羊皮纸尺寸晚一帧才有。等到了再铺，不等就停。不把失败结果缓存下来。 */
function watchParchment(view: Node): void {
  const mark = view as Node & { mxzgParchment?: ParchmentFit; mxzgParchmentWait?: boolean };
  if (mark.mxzgParchmentWait || mark.mxzgParchment) return;
  mark.mxzgParchmentWait = true;
  let frames = 0;
  const retry = () => {
    if (!view.isValid) {
      director.off(Director.EVENT_AFTER_UPDATE, retry);
      return;
    }
    frames += 1;
    const ui = view.getComponent(UITransform);
    const bg = view.getChildByName("spr_bg");
    const bgUi = bg ? bg.getComponent(UITransform) : null;
    const ready = !!positiveUiSize(ui) && !!positiveUiSize(bgUi);
    if (!ready && frames < 45) return;
    director.off(Director.EVENT_AFTER_UPDATE, retry);
    mark.mxzgParchmentWait = false;
    if (!ready || mark.mxzgParchment) return;
    fitParchmentWindow(view);
  };
  director.on(Director.EVENT_AFTER_UPDATE, retry);
  view.once(Node.EventType.NODE_DESTROYED, () => {
    director.off(Director.EVENT_AFTER_UPDATE, retry);
  });
}

/**
 * 奶油色垫在 spr_bg 后面。九宫格贴图画出来就盖住它；贴图没挂上时页签后面仍有一块纸。
 * Graphics 绕节点原点画，所以垫片要放在底图的视觉中心，不能放在锚点上。
 */
function syncParchmentPlate(view: Node, bg: Node | null): void {
  if (!view.isValid || !bg || !bg.isValid || bg.parent !== view) return;
  const ui = bg.getComponent(UITransform);
  const size = positiveUiSize(ui);
  const w = size ? size.width : 640;
  const h = size ? size.height : 672;
  const ax = ui && typeof ui.anchorX === "number" ? ui.anchorX : 0.5;
  const ay = ui && typeof ui.anchorY === "number" ? ui.anchorY : 0.5;
  const plate = view.getChildByName("ParchmentPlate");
  if (!plate) {
    GameLog.shared.warn("UI", "羊皮纸没有 ParchmentPlate");
    return;
  }
  const plateUi = plate.getComponent(UITransform);
  assignContentSize(plateUi, w, h);
  if (plateUi) plateUi.setAnchorPoint(0.5, 0.5);
  const index = bg.getSiblingIndex();
  plate.setPosition(bg.position.x + (0.5 - ax) * w, bg.position.y + (0.5 - ay) * h, 0);
  if (plate.getSiblingIndex() > index) plate.setSiblingIndex(index);
}

function growNode(node: Node, extraTop: number, extraBottom: number): void {
  const ui = node.getComponent(UITransform);
  const size = positiveUiSize(ui);
  if (!ui || !size) return;
  const extra = extraTop + extraBottom;
  if (extra === 0) return;
  ui.setContentSize(size.width, size.height + extra);
  node.setPosition(node.position.x, node.position.y + growAnchorDelta(ui.anchorY, extraTop, extraBottom), node.position.z);
}

function nudge(root: Node, name: string, dy: number): void {
  if (dy === 0) return;
  const node = findNamed(root, name);
  if (!node) return;
  node.setPosition(node.position.x, node.position.y + dy, node.position.z);
}

/** 图鉴页才露出进化图鉴。英雄页是永久皮肤，两颗不叠在一起。圣龙两颗都收起。 */
function showHeroCorner(board: Node | null, tab: "hero" | "book" | "dragon"): void {
  if (!board) return;
  const evolve = findNamed(board, "btn_evolve");
  const skin = findNamed(board, "btn_permanent_skin");
  if (evolve) evolve.active = tab === "book";
  if (skin) skin.active = tab === "hero";
}

function spreadHeroBoard(board: Node, fit: ParchmentFit): void {
  nudge(board, "node_elem", fit.extraTop);
  const box = board.getChildByName("spr_box");
  if (box) growNode(box, fit.extraTop, fit.extraBottom);
  nudge(board, "node_capacity", -fit.extraBottom);
  nudge(board, "bottom_menu", -fit.extraBottom);
  const pattern = board.getChildByName("CCSprite_1");
  if (pattern && fit.extraBottom !== 0) {
    pattern.setPosition(pattern.position.x, pattern.position.y - fit.extraBottom, pattern.position.z);
  }
}

function fillHero(view: Node, openHero: (hero: StoreHero) => void): void {
  // 空名册也用预制页签、羊皮纸和格子。空数组画锁定图鉴，不造账号英雄。
  silenceBigMenus(view);
  hideDebugBubble(view);
  const fit = fitParchmentWindow(view);
  fitButton(findNamed(view, "btn_hero"), "英雄", 20);
  fitButton(findNamed(view, "btn_illustrat"), "图鉴", 20);
  fitButton(findNamed(view, "btn_dragon"), "圣龙", 20);
  const cap = findNamed(view, "node_capacity");
  if (cap) cap.active = true;
  let tab: "hero" | "book" | "dragon" = "hero";
  let elem = 0;
  let board: Node | null = null;
  let content: Node | null = null;
  let cells: Prefab | null = null;
  let dragons: Prefab | null = null;
  let catalogs: Prefab | null = null;
  let texts: Prefab | null = null;
  const paint = () => {
    if (!content || !content.isValid || !board || !cells) return;
    clearChildren(content);
    markHeroTabs(view, tab);
    showHeroCorner(board, tab);
    markElem(board, elem);
    const elemRow = findNode(board, HERO_ELEM_ROW);
    if (elemRow) elemRow.active = tab !== "dragon";
    const all = GameStore.heroes();
    const space = heroSpaceLine(all);
    writeNamed(view, "lbl_capacity", space);
    writeNamed(board, "lbl_capacity", space);
    const empty = content.parent ? content.parent.getChildByName("lbl_empty") : null;
    if (empty) empty.active = false;
    if (tab === "dragon") {
      paintDragonBoard(view, content, dragons, catalogs, texts);
      return;
    }
    const deployed = deployedSet();
    if (tab === "hero" && all && all.length > 0) {
      const roster = rosterOf(elem);
      const shown = paddedSlots(roster.length);
      for (let i = 0; i < shown; i++) {
        const hero = i < roster.length ? roster[i] : null;
        const cell = spawnPrefab(cells, content);
        bindHeroCell(cell, hero, hero ? deployed.has(hero.heroId || 0) : false, hero ? () => openHero(hero) : null, false);
        place(cell, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -52, HERO_PITCH_Y));
      }
      sizeScroll(content, slotRows(shown) * HERO_PITCH_Y + 20, 360 + fit.extra);
      return;
    }
    paintHeroBook(view, content, elem, deployed, openHero, cells, texts);
  };
  const pickElem = (id: number) => {
    if (id === elem && tab !== "dragon") return;
    elem = id;
    if (tab === "dragon") tab = "hero";
    paint();
    pinHeroScrollTop(board);
  };
  const showTab = (next: "hero" | "book" | "dragon") => {
    tab = next;
    paint();
    pinHeroScrollTop(board);
  };
  void Promise.all([
    mountNested(view, HERO_LIST_BOARD, "HeroBoard"),
    loadPrefab(HERO_CELL),
    loadPrefab(DRAGON_CARD),
    loadPrefab(CATALOG_CELL),
    loadPrefab(TEXT_CHIP),
  ]).then(
    (loaded) => {
      const node = loaded[0] as Node | null;
      if (!node || !view.isValid) {
        GameLog.shared.warn("Hero", "HeroListHeroLayer 没有挂上");
        return;
      }
      board = node;
      cells = loaded[1] as Prefab;
      dragons = loaded[2] as Prefab;
      catalogs = loaded[3] as Prefab;
      texts = loaded[4] as Prefab;
      const menu = findNode(view, HERO_TAB_MENU);
      if (menu && menu.parent === view) node.setSiblingIndex(menu.getSiblingIndex());
      spreadHeroBoard(node, fit);
      showHeroCorner(node, tab);
      content = heroScrollContent(node, fit);
      if (cap) cap.active = false;
      const big = findNode(node, "node_capacity");
      const menuHit = big ? big.getChildByName("UIMenu_1") : null;
      const menuUi = menuHit ? menuHit.getComponent(UITransform) : null;
      if (menuUi) menuUi.setContentSize(0, 0);
      bindElemRow(node, pickElem);
      bindHeroPageTabs(view, showTab);
      paint();
      pinHeroScrollTop(board);
    },
    (err) => {
      GameLog.shared.warn("Hero", "英雄列表预制没挂上 " + messageOf(err));
    }
  );
  const offHero = WireSession.onSync(() => paint());
  view.once(Node.EventType.NODE_DESTROYED, () => offHero());
}

function fillBag(view: Node): void {
  // Historical Boot/Main never mounts the new role-session bag against GameStore/WireSession.
  flashToast(view, "历史入口背包已退役，请使用 Remake.scene");
}

/**
 * 已有 ScrollView。content 若跟 view 并列，就收进 view。遮罩画在真正包住格子的那个节点上。
 */
function seatPrefabScroll(scroll: Node, width: number, height: number, warnTag: string): Node | null {
  const port = scroll.getChildByName("view");
  let content = scroll.getChildByName("content");
  if (!content && port) content = port.getChildByName("content");
  if (!content) return null;
  if (port && content.parent !== port) content.parent = port;
  content.setPosition(0, 0, 0);
  const hostMask = scroll.getComponent(Mask);
  if (hostMask && port) scroll.removeComponent(hostMask);
  const scrollUi = scroll.getComponent(UITransform);
  const scrollSize = positiveUiSize(scrollUi);
  const useW = scrollSize && scrollSize.width > 0 ? scrollSize.width : width;
  assignContentSize(scrollUi, useW, height);
  if (port) {
    const viewUi = port.getComponent(UITransform);
    const viewSize = positiveUiSize(viewUi);
    assignContentSize(viewUi, viewSize && viewSize.width > 0 ? viewSize.width : useW, height);
  }
  armScrollMask(port || scroll);
  const scroller = scroll.getComponent(ScrollView);
  if (!scroller) GameLog.shared.warn(warnTag, scroll.name + " 没有 ScrollView");
  else if (scroller.content !== content) scroller.content = content;
  return content;
}

/**
 * 矩形遮罩要等节点进了场景再描。提前 addComponent 时模板经常是空的，视口里的格子全部看不见。
 */
function armScrollMask(node: Node): void {
  const draw = () => {
    if (!node.isValid) return false;
    let mask = node.getComponent(Mask);
    if (!mask) mask = node.addComponent(Mask);
    if (!node.activeInHierarchy) return false;
    const ui = node.getComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!ui || !size) {
      mask.enabled = false;
      return false;
    }
    mask.enabled = true;
    if (mask.type !== Mask.Type.GRAPHICS_RECT) mask.type = Mask.Type.GRAPHICS_RECT;
    assignContentSize(ui, size.width, size.height);
    return !!node.getComponent(Graphics);
  };
  if (draw()) return;
  let frames = 0;
  const retry = () => {
    if (!node.isValid) {
      director.off(Director.EVENT_AFTER_UPDATE, retry);
      return;
    }
    frames += 1;
    const drawn = draw();
    if (drawn || frames > 45) {
      if (!drawn && node.isValid && !node.getComponent(Graphics)) {
        const mask = node.getComponent(Mask);
        if (mask) mask.enabled = false;
      }
      director.off(Director.EVENT_AFTER_UPDATE, retry);
    }
  };
  director.on(Director.EVENT_AFTER_UPDATE, retry);
  node.once(Node.EventType.NODE_DESTROYED, () => {
    director.off(Director.EVENT_AFTER_UPDATE, retry);
  });
}

function adoptLayer(node: Node, layer: number): void {
  node.layer = layer;
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) adoptLayer(kids[i], layer);
}

/**
 * spr_box/HeroScroll 写在 HeroListHeroLayer 里。
 * 预制把 content 和空的 view 并列，遮罩在宿主上。跟背包一样收进 view，卸掉宿主上的空模板。
 * 不另造滚动节点。
 */
function heroScrollContent(board: Node, fit: ParchmentFit): Node | null {
  const box = findNode(board, "spr_box");
  const scroll = box ? box.getChildByName("HeroScroll") : null;
  if (!box || !scroll) {
    GameLog.shared.warn("Hero", "HeroListHeroLayer 的 spr_box 下没有 HeroScroll");
    return null;
  }
  const height = 320 + fit.extra;
  const content = seatPrefabScroll(scroll, 540, height, "Hero");
  if (!content) GameLog.shared.warn("Hero", "HeroScroll 没有 content");
  return content;
}

/** 上半区店员和对话框都在 BackpackLayer 上。句子用 language 5788。 */
function dressBagTalk(view: Node): void {
  const mark = view as Node & { mxzgBagTalk?: boolean };
  if (mark.mxzgBagTalk) return;
  mark.mxzgBagTalk = true;
  const bubble = findNamed(view, "spr_bubble_bg");
  if (bubble) bubble.active = true;
  const line = findNamed(view, "lbl_talk");
  if (line) {
    line.active = true;
    setText(line, bagShopLine());
  }
  const portrait = findNamed(view, "node_portrait");
  if (!portrait) {
    GameLog.shared.warn("Bag", "BackpackLayer 没有 node_portrait");
    return;
  }
  portrait.active = true;
  mountNamedSpine(portrait, BAG_PORTRAIT, "act");
}

function bagShopLine(): string {
  const db = ConfigDb.current;
  const file = db ? db.tables.get("language") : null;
  const rows = file && Array.isArray(file.rows) ? file.rows : [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as { key?: unknown; value?: unknown };
    if (row.key === undefined || String(row.key) !== BAG_SHOP_LAN) continue;
    const text = plainTalk(typeof row.value === "string" ? row.value : "");
    if (text) return text;
  }
  return BAG_SHOP_FALLBACK;
}

function paintFormationGrid(view: Node, elem: number, selected: number[], cells: Prefab, toggle: (id: number) => void): void {
  const scroll = findNamed(view, "scroll_view_backpack");
  const content = scroll ? scroll.getChildByName("content") : null;
  const host = content || scroll;
  const grid = host ? host.getChildByName("FormGrid") : null;
  if (!grid) {
    GameLog.shared.warn("Hero", "出阵滚动里没有 FormGrid");
    return;
  }
  clearChildren(grid);
  const roster = rosterOf(elem);
  for (let i = 0; i < roster.length; i++) {
    const hero = roster[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const on = hero.heroId !== null && selected.indexOf(hero.heroId) >= 0;
    const cell = spawnPrefab(cells, grid);
    bindHeroCell(cell, hero, false, () => {
      if (hero.heroId) toggle(hero.heroId);
    }, false, on);
    const x = content ? 70 + col * 130 : -180 + col * 110;
    const y = content ? -56 - row * HERO_PITCH_Y : -row * 100;
    place(cell, grid, x, y);
  }
  if (content) {
    const rows = roster.length === 0 ? 1 : Math.ceil(roster.length / COLS);
    sizeScroll(content, rows * HERO_PITCH_Y + 24, 250);
  }
}

function paintFormationSlots(view: Node, selected: number[], onRemove: (heroId: number) => void): void {
  const roster = GameStore.heroes() || [];
  const placed: { [slot: number]: number } = {};
  for (let i = 0; i < selected.length; i++) {
    const slotNo = formationFaceSlot(i);
    if (slotNo === null) continue;
    placed[slotNo] = selected[i];
  }
  let power = 0;
  let known = false;
  for (let slotNo = 1; slotNo <= 9; slotNo++) {
    const slot = findNamed(view, "node_icon_" + slotNo);
    if (!slot) continue;
    const box = slot.getComponent(UITransform);
    const slotSize = positiveUiSize(box);
    if (box && slotSize && (slotSize.width < 8 || slotSize.height < 8)) box.setContentSize(80, 80);
    const heroId = placed[slotNo];
    const hero = heroId ? heroById(roster, heroId) : null;
    const label = findNamed(slot, "lbl_attr_add_" + slotNo);
    const face = slot.getChildByName("spr_face");
    const front = slotNo <= 4;
    if (!hero || !hero.heroType) {
      if (face) face.active = false;
      if (label) {
        label.active = true;
        setText(label, front ? "前" : "后");
      }
      continue;
    }
    if (!face) {
      GameLog.shared.warn("Hero", "出阵 " + slot.name + " 没有 spr_face");
    } else {
      face.active = true;
      paintFirst(face, [heroFace(hero), "ui/hero/hero-icon_spr-default"]);
      face.setSiblingIndex(Math.max(0, slot.children.length - 1));
      if (hero.heroId !== null) {
        const picked = hero.heroId;
        const mark = face as Node & { mxzgSlot?: boolean };
        if (!mark.mxzgSlot) {
          mark.mxzgSlot = true;
          if (!face.getComponent(Button)) face.addComponent(Button);
          face.on(Button.EventType.CLICK, () => {
            const id = (face as Node & { mxzgHero?: number }).mxzgHero;
            if (id) onRemove(id);
          });
        }
        (face as Node & { mxzgHero?: number }).mxzgHero = picked;
      }
    }
    if (hero.fighting !== null) {
      power += hero.fighting;
      known = true;
    }
    if (slotNo === 9) {
      const lock = findNamed(view, "spr_lock_9");
      if (lock && slot.parent && lock.parent === slot.parent && lock.getSiblingIndex() > slot.getSiblingIndex()) {
        lock.setSiblingIndex(slot.getSiblingIndex());
      }
    }
    if (label) {
      const stats = heroBaseStats(hero.heroType, hero.star);
      label.active = true;
      setText(label, stats ? (front ? "前 " : "后 ") + stats.atk : front ? "前" : "后");
    }
  }
  writeNamed(view, "lbl_battle_count", known ? String(power) : "—");
}

/** 挂机左上角的关卡字。和 BattleHangView 同一套，不拿 chapter.idx 把后面的关写成第 1 关。 */
export function hangMissionCaption(): string {
  return hangFace(Date.now(), Date.now()).caption;
}

/** 已有 ChapterPreviewLayer。产出用这一关 reward_base，掉落用 drop_group。只有当前关出战，不新发协议。 */
export function dressChapterPreview(view: Node, onFight: () => void, stageIdx?: number): void {
  const live = currentStageIdx();
  const idx = typeof stageIdx === "number" && isFinite(stageIdx) && stageIdx >= 1 ? Math.floor(stageIdx) : live;
  const mock = GameStore.mockStageId();
  const chapter = GameStore.chapter();
  const known = (mock !== null && mock >= 1) || chapter.nowIdx !== null || chapter.maxIdx !== null;
  const placeName = known ? chapterStageCaption(idx) || "" : "";
  const head = placeName || (known && idx >= 1 ? "第" + idx + "关" : "主线未同步");
  const face = known ? chapterStageFace(idx) : null;
  const area = face && face.name ? face.name : "";
  writeStageTitle(view, area ? head + " " + area : head, area.length > 0);
  const minute = known ? chapterIdleMinute(idx) : null;
  if (!minute) {
    if (known) GameLog.shared.info("Mainline", "关卡预览没有 chapterreward，产出写 —");
    writeKeep(view, "lbl_res1", "—");
    writeKeep(view, "lbl_res2", "—");
    writeKeep(view, "lbl_res3", "—");
  } else {
    writeKeep(view, "lbl_res1", minute.gold + "/m");
    writeKeep(view, "lbl_res2", minute.heroExp + "/m");
    writeKeep(view, "lbl_res3", minute.roleExp + "/m");
  }
  paintPreviewDrops(view, known ? chapterDrops(idx) : []);
  const current = known && idx === live;
  fitButton(findNamed(view, "btn_confirm"), current ? "出战" : "查看", 28);
  const confirm = findNamed(view, "btn_confirm");
  if (!confirm) {
    GameLog.shared.warn("Mainline", "关卡预览没有 btn_confirm，不能出战");
    return;
  }
  if (!confirm.getComponent(Button)) confirm.addComponent(Button);
  confirm.on(Button.EventType.CLICK, () => {
    if (!current) {
      GameLog.shared.info("Mainline", "关卡 " + idx + " 不是当前关，不出战");
      flashToast(view, "不发跳关");
      return;
    }
    onFight();
  });
}

function paintPreviewDrops(view: Node, drops: DropFace[]): void {
  const scroll = findNamed(view, "scroll_view");
  const host = scroll ? scroll.getChildByName("content") || scroll : null;
  const row = host ? host.getChildByName("PreviewDrops") : null;
  if (!row) {
    GameLog.shared.warn("Mainline", "关卡预览没有 PreviewDrops");
    return;
  }
  const empty = row.getChildByName("lbl_empty");
  const old = row.children.slice();
  for (let i = 0; i < old.length; i++) {
    if (old[i].name !== "lbl_empty") old[i].destroy();
  }
  if (drops.length === 0) {
    if (empty) {
      empty.active = true;
      setText(empty, "这一关没有掉落表");
    }
    return;
  }
  if (empty) empty.active = false;
  void loadPrefab(CATALOG_CELL).then(
    (prefab) => {
      if (!row.isValid) return;
      const n = drops.length < 6 ? drops.length : 6;
      const every = idleDropEverySec();
      for (let i = 0; i < n; i++) {
        const face = drops[i];
        const profile = itemProfile(face.itemType, null);
        const cell = spawnPrefab(prefab, row);
        const path = (profile && profile.icon) || itemIconResource(face.itemType, null) || "ui/bag/backpack_" + face.itemType;
        bindCatalogCell(cell, path, profile ? profile.rare : 0, 1, () => showInfoCard(view, dropCard(face, every)));
        place(cell, row, (i - (n - 1) / 2) * 78, 0);
      }
    },
    (err) => {
      GameLog.shared.warn("Mainline", "掉落格子预制没挂上 " + messageOf(err));
    }
  );
}

/** 名册用 heroId。图鉴格子还没有实例 id 时用 heroType，空槽保持预制名。 */
function heroCellId(hero: StoreHero | null): number | null {
  if (!hero) return null;
  if (typeof hero.heroId === "number" && isFinite(hero.heroId)) return Math.floor(hero.heroId);
  if (typeof hero.heroType === "number" && isFinite(hero.heroType)) return Math.floor(hero.heroType);
  return null;
}

function bindHeroCell(
  cell: Node,
  hero: StoreHero | null,
  deployed: boolean,
  onTap: (() => void) | null,
  locked: boolean,
  marked = false
): void {
  const cellId = heroCellId(hero);
  if (cellId !== null) cell.name = "HeroIconCell_" + cellId;
  const face = findNamed(cell, "spr_face");
  const name = findNamed(cell, "lbl_name");
  const elemNode = findNamed(cell, "spr_elem");
  const lock = findNamed(cell, "spr_lock");
  const battle = findNamed(cell, "spr_battle");
  const level = findNamed(cell, "lbl_level");
  const mark = findNamed(cell, "lbl_mark");
  if (mark) mark.active = marked;
  const profile = hero ? heroProfile(hero.heroType) : null;
  if (face) {
    const image = face.getComponent(Sprite);
    if (image) image.grayscale = false;
    if (!hero || !hero.heroType) face.active = false;
    else {
      face.active = true;
      paintFirst(face, [heroFace(hero), "ui/hero/hero-icon_spr-default"]);
      if (locked && image) image.grayscale = true;
    }
  }
  if (name) {
    const showName = !!hero && !hero.heroType;
    name.active = showName;
    if (showName && hero) setText(name, shortName(hero.name));
  }
  const elem = hero ? heroListElem(hero) : null;
  if (elemNode) {
    const showElem = elem !== null;
    elemNode.active = showElem;
    if (showElem && elem !== null) paintSprite(elemNode, HERO_ELEM_SPRITE + elem);
  }
  const stars = hero ? hero.star ?? (profile && profile.star) ?? 0 : 0;
  const n = hero ? clamp(stars, 0, 5) : 0;
  for (let i = 0; i < 5; i++) {
    const star = cell.getChildByName("star" + i);
    if (!star) continue;
    star.active = i < n;
    if (i < n) star.setPosition((i - (n - 1) / 2) * 15, -40, 0);
  }
  if (level) {
    const showLevel = !!hero && hero.level !== null;
    level.active = showLevel;
    if (showLevel && hero && hero.level !== null) setText(level, String(hero.level));
  }
  if (lock) lock.active = !!hero && locked;
  if (battle) battle.active = !!hero && !locked && deployed;
  if (onTap) {
    if (!cell.getComponent(Button)) cell.addComponent(Button);
    cell.on(Button.EventType.CLICK, onTap);
  }
}

function paintGems(view: Node, body: Node, catalogs: Prefab | null, placeId: number, onPick: (id: number) => void): void {
  paintPlaces(body, "btn_gem_", GEM_PLACES, placeId, onPick);
  paintCatalogRows(view, body, catalogs, listJewels(placeId).map((jewel) => {
    const owned = bagCount(jewel.id);
    const face = itemProfile(jewel.id, null);
    return {
      icon: face && face.icon ? face.icon : "ui/bag/backpack_" + jewel.id,
      rare: jewel.rare,
      owned,
      onTap: () => showInfoCard(view, jewelCard(jewel.id, placeId, jewel.rare, jewel.star, owned)),
    };
  }));
}

function paintGears(view: Node, body: Node, catalogs: Prefab | null, placeId: number, onPick: (id: number) => void): void {
  paintPlaces(body, "btn_gear_", GEAR_PLACES, placeId, onPick);
  paintCatalogRows(view, body, catalogs, listGodGears(placeId).map((gear) => {
    const owned = bagCount(gear.id);
    const face = itemProfile(gear.id, null);
    return {
      icon: face && face.icon ? face.icon : "ui/bag/backpack_" + gear.id,
      rare: gear.rare,
      owned,
      onTap: () => showInfoCard(view, gearCard(gear.id, gear.name, placeId, gear.rare, gear.star, owned)),
    };
  }));
}

function paintCatalogRows(
  view: Node,
  body: Node,
  catalogs: Prefab | null,
  rows: { icon: string; rare: number; owned: number; onTap: () => void }[]
): void {
  const scroll = body.getChildByName("DetailScroll");
  const content = scroll ? scroll.getChildByName("content") : null;
  const empty = scroll ? scroll.getChildByName("lbl_empty") : null;
  if (!scroll || !content) {
    GameLog.shared.warn("Hero", "DetailBody 下没有 DetailScroll");
    return;
  }
  clearChildren(content);
  if (rows.length === 0) {
    if (empty) {
      empty.active = true;
      setText(empty, "这一页还没有配置");
    }
    return;
  }
  if (empty) empty.active = false;
  if (!catalogs) return;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cell = spawnPrefab(catalogs, content);
    bindCatalogCell(cell, row.icon, row.rare, row.owned, row.onTap);
    place(cell, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -52, HERO_PITCH_Y));
  }
  sizeScroll(content, slotRows(rows.length) * HERO_PITCH_Y + 20, 160);
  if (view && !view.isValid) return;
}

function paintPlaces(body: Node, prefix: string, places: { id: number; title: string }[], current: number, onPick: (id: number) => void): void {
  const other = prefix === "btn_gem_" ? "btn_gear_" : "btn_gem_";
  for (let i = 1; i <= 4; i++) {
    const hidden = body.getChildByName(other + i);
    if (hidden) hidden.active = false;
  }
  for (let i = 0; i < places.length; i++) {
    const spec = places[i];
    const button = body.getChildByName(prefix + spec.id);
    if (!button) {
      GameLog.shared.warn("Hero", "DetailBody 没有 " + prefix + spec.id);
      continue;
    }
    button.active = true;
    paintTab(button, spec.id === current);
    const mark = button as Node & { mxzgPlace?: boolean };
    if (mark.mxzgPlace) continue;
    mark.mxzgPlace = true;
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => onPick(spec.id));
  }
}

function paintDragonBoard(view: Node, content: Node, dragonsPrefab: Prefab | null, catalogs: Prefab | null, texts: Prefab | null): void {
  const dragons = listDragons();
  const relics = listRelics();
  if (!dragonsPrefab || !catalogs) {
    GameLog.shared.warn("Hero", "圣龙格子预制没挂上");
    return;
  }
  if (dragons.length === 0 && relics.length === 0) {
    placeText(texts, content, "这一页还没有配置", 0, -40, 18, INK, 360, 36);
    sizeScroll(content, 400, 400);
    return;
  }
  for (let i = 0; i < dragons.length; i++) {
    const face = dragons[i];
    const card = spawnPrefab(dragonsPrefab, content);
    const portrait = findNamed(card, "spr_face");
    if (portrait) paintFirst(portrait, [face.portrait, "ui/dragon/dragon_btn-illustration"]);
    const name = findNamed(card, "lbl_name");
    if (name) setText(name, face.name);
    if (!card.getComponent(Button)) card.addComponent(Button);
    card.on(Button.EventType.CLICK, () => showInfoCard(view, {
      icon: face.portrait,
      title: face.name,
      typeLine: "圣龙图鉴",
      body: dragonBlurb(),
      fallback: "ui/dragon/dragon_btn-illustration",
    }));
    place(card, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -70, 140));
  }
  const dRows = dragons.length === 0 ? 0 : Math.ceil(dragons.length / COLS);
  let y = dragons.length === 0 ? -24 : -70 - dRows * 140 - 16;
  placeText(texts, content, "圣物", 0, y, 18, INK, 120, 28);
  y -= 56;
  for (let i = 0; i < relics.length; i++) {
    const relic = relics[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const owned = relicOwned(relic);
    const cell = spawnPrefab(catalogs, content);
    bindCatalogCell(cell, relic.icon, relic.rare, owned, () => showInfoCard(view, relicCard(relic, owned)));
    place(cell, content, -162 + col * HERO_PITCH_X, y - row * HERO_PITCH_Y);
  }
  const rRows = relics.length === 0 ? 1 : Math.ceil(relics.length / COLS);
  const height = Math.abs(y) + rRows * HERO_PITCH_Y + 40;
  sizeScroll(content, height, 400);
}

function bindCatalogCell(cell: Node, icon: string, rare: number, owned: number, onTap: () => void): void {
  const frame = findNamed(cell, "spr_frame");
  const face = findNamed(cell, "spr_icon");
  const lock = findNamed(cell, "spr_lock");
  const count = findNamed(cell, "lbl_count");
  if (frame) paintSprite(frame, rareFrame(rare));
  if (face) {
    face.active = true;
    paintFirst(face, [icon, "ui/bag/backpack_spr-default"]);
    const image = face.getComponent(Sprite);
    if (image) image.grayscale = owned <= 0;
  }
  if (lock) lock.active = owned <= 0;
  if (count) {
    count.active = owned > 0;
    if (owned > 0) setText(count, String(owned));
  }
  if (!cell.getComponent(Button)) cell.addComponent(Button);
  cell.on(Button.EventType.CLICK, onTap);
}

function placeText(prefab: Prefab | null, parent: Node, text: string, x: number, y: number, font: number, ink: Color, width: number, height: number): void {
  if (!prefab || !parent.isValid) {
    GameLog.shared.warn("UI", "TextChip 没有挂上");
    return;
  }
  const node = spawnPrefab(prefab, parent);
  const label = node.getComponent(Label);
  if (label) {
    label.string = text;
    label.fontSize = font;
    label.lineHeight = font + 4;
    label.color = ink;
    label.overflow = Overflow.CLAMP;
  }
  assignContentSize(node.getComponent(UITransform), width, height);
  node.setPosition(x, y, 0);
}

/**
 * 元素跟 herotype。类型对不上表时才用 s2c 4001 字段 6。
 * 0 是全部。1–5 以外不当成某一系。
 */
function heroListElem(hero: StoreHero): number | null {
  const profile = heroProfile(hero.heroType);
  if (profile && profile.elem !== null && profile.elem >= 1 && profile.elem <= HERO_ELEM_BUTTONS - 1) return profile.elem;
  if (hero.heroId === null) return null;
  const list = WireSession.heroes;
  if (!list) return null;
  for (let i = 0; i < list.length; i++) {
    if (list[i].heroId !== hero.heroId) continue;
    const elem = list[i].elem;
    if (elem === null || elem < 1 || elem > HERO_ELEM_BUTTONS - 1) return null;
    return elem;
  }
  return null;
}

function rosterOf(elem: number): StoreHero[] {
  const all = GameStore.heroes();
  if (!all) return [];
  if (elem <= 0) return all;
  const rows: StoreHero[] = [];
  for (let i = 0; i < all.length; i++) {
    if (heroListElem(all[i]) === elem) rows.push(all[i]);
  }
  return rows;
}

/** 未获得的图鉴留在这一系里，灰头像加锁，不从筛选结果里拿掉。顺序跟 herotype。 */
function paintHeroBook(
  view: Node,
  content: Node,
  elem: number,
  deployed: Set<number>,
  openHero: (hero: StoreHero) => void,
  cells: Prefab,
  texts: Prefab | null
): void {
  const book = bookOf(elem);
  if (book.length === 0) {
    const shown = paddedSlots(0);
    for (let i = 0; i < shown; i++) {
      const cell = spawnPrefab(cells, content);
      bindHeroCell(cell, null, false, null, false);
      place(cell, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -52, HERO_PITCH_Y));
    }
    placeText(texts, content, "这一页还没有配置", 0, -40, 18, INK, 360, 36);
    sizeScroll(content, slotRows(shown) * HERO_PITCH_Y + 20, 400);
    return;
  }
  const shown = paddedSlots(book.length);
  for (let i = 0; i < shown; i++) {
    const profile = i < book.length ? book[i] : null;
    const cell = spawnPrefab(cells, content);
    if (!profile) {
      bindHeroCell(cell, null, false, null, false);
      place(cell, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -52, HERO_PITCH_Y));
      continue;
    }
    const owned = heroByType(profile.type);
    bindHeroCell(
      cell,
      owned || { heroId: null, heroType: profile.type, name: profile.name, level: null, star: profile.star, fighting: null },
      owned ? deployed.has(owned.heroId || 0) : false,
      () => {
        if (owned) openHero(owned);
        else showInfoCard(view, profileCard(profile));
      },
      !owned
    );
    place(cell, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -52, HERO_PITCH_Y));
  }
  sizeScroll(content, slotRows(shown) * HERO_PITCH_Y + 20, 400);
}

function dragonBlurb(): string {
  const snap = WireSession.dragon;
  const bits = ["图鉴。没有单独的物种立绘。"];
  if (snap && snap.attrLevel !== null) bits.push("服务器圣龙等级 " + snap.attrLevel);
  else if (!snap) bits.push("圣龙数据未同步");
  else bits.push("等级未带");
  return bits.join("\n");
}

function bagRows(tab: BagTab): StoreBagItem[] {
  const all = GameStore.bag();
  if (!all) return [];
  const rows: StoreBagItem[] = [];
  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    if (item.num !== null && item.num <= 0) continue;
    if (itemIsWallet(item.itemType, item.itemId)) continue;
    if (itemBagTab(item.itemType, item.itemId) !== tab) continue;
    rows.push(item);
  }
  return rows;
}

function deployedSet(): Set<number> {
  const set = new Set<number>();
  const ids = deployedHeroIds();
  for (let i = 0; i < ids.length; i++) set.add(ids[i]);
  return set;
}

function bookOf(elem: number): HeroProfile[] {
  const all = listHeroProfiles();
  if (elem === 0) return all;
  const rows: HeroProfile[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].elem === elem) rows.push(all[i]);
  }
  return rows;
}

function heroByType(type: number): StoreHero | null {
  const all = GameStore.heroes();
  if (!all) return null;
  for (let i = 0; i < all.length; i++) {
    if (all[i].heroType === type) return all[i];
  }
  return null;
}

function heroById(roster: StoreHero[], id: number): StoreHero | null {
  for (let i = 0; i < roster.length; i++) {
    if (roster[i].heroId === id) return roster[i];
  }
  return null;
}

function toggleId(selected: number[], id: number): number[] {
  const next = selected.slice();
  const index = next.indexOf(id);
  if (index >= 0) {
    next.splice(index, 1);
    return next;
  }
  if (next.length >= FORM_MAX) return next;
  next.push(id);
  return next;
}

/** 打开出阵时按站位排。Mock 本局记录仍按点选顺序，最多 FORM_MAX。 */
function formationIds(): number[] {
  if (mockRuntimeEnabled()) {
    const local = localLineupIds();
    if (local.length > 0) return local.slice(0, FORM_MAX);
  }
  const line = GameStore.formation() || (Session.source === "wire" ? WireSession.lineUp : null);
  const ranked = mainFormationHeroes(line).slice().sort(byFormationPosition);
  const ids: number[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const id = ranked[i].heroId;
    if (ids.indexOf(id) >= 0) continue;
    ids.push(id);
    if (ids.length >= FORM_MAX) break;
  }
  return ids;
}

function byFormationPosition(a: { position: number | null }, b: { position: number | null }): number {
  const ar = formationRank(a.position);
  const br = formationRank(b.position);
  if (ar !== br) return ar - br;
  return 0;
}

function formationRank(position: number | null): number {
  if (position === null) return 1000;
  for (let i = 0; i < WIRE_LINEUP_SAVE_POSITIONS.length; i++) {
    if (WIRE_LINEUP_SAVE_POSITIONS[i] === position) return i;
  }
  return 500 + position;
}

function heroSpaceShown(): number {
  if (Session.source === "wire" && WireSession.heroCapacity !== null && WireSession.heroCapacity >= 0) {
    return WireSession.heroCapacity;
  }
  return heroSpaceCap();
}

/** 环心透明。垫在金环后面，底板黑圆不从洞里露出来。不放蓝核。 */
function maskCrystalHole(frame: Node): void {
  const parent = frame.parent;
  if (!parent || parent.getChildByName("HangCrystalFill")) return;
  const size = positiveUiSize(frame.getComponent(UITransform));
  const w = size && size.width > 8 ? size.width : 162;
  const h = size && size.height > 8 ? size.height : 162;
  const fill = createRect("HangCrystalFill", w, h, new Color(249, 233, 211, 255));
  const index = frame.getSiblingIndex();
  fill.parent = parent;
  fill.setPosition(frame.position.x, frame.position.y, frame.position.z);
  fill.setSiblingIndex(index);
}

/**
 * 一颗钮只留一个居中的字。不另画扁平色块。
 * 请求的字号是画面上的大小。侧钮缩放 0.8，本地字号要除掉这一档，避免再缩一次。
 */
function seatHangButton(node: Node | null, text: string, size: number): void {
  if (!node) return;
  const scale = Math.abs(node.scale.y);
  const drawn = scale > 0.05 && scale < 0.99 ? Math.round(size / scale) : size;
  fitButton(node, text, drawn);
  const kids = node.children;
  let kept = false;
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    const label = child.getComponent(Label);
    if (!label) continue;
    if (kept) {
      child.active = false;
      continue;
    }
    kept = true;
    const box = child.getComponent(UITransform);
    const parentSize = positiveUiSize(node.getComponent(UITransform));
    if (box && parentSize && parentSize.width > 8) {
      box.setAnchorPoint(0.5, 0.5);
      assignContentSize(box, Math.max(8, parentSize.width - 16), Math.max(8, parentSize.height - 8));
    }
    try {
      child.active = true;
      child.setPosition(0, 0, 0);
      child.setScale(1, 1, 1);
      label.string = text;
      label.fontSize = drawn;
      label.lineHeight = drawn + 4;
      label.overflow = Overflow.SHRINK;
      label.horizontalAlign = HorizontalTextAlignment.CENTER;
      label.verticalAlign = VerticalTextAlignment.CENTER;
    } catch (_err) {
      /* 钮字装配读到空尺寸时这一拍留原字。 */
    }
  }
}

function fitButton(node: Node | null, text: string, size: number): void {
  if (!node) return;
  const spriteComp = node.getComponent(Sprite);
  if (spriteComp) spriteComp.sizeMode = Sprite.SizeMode.CUSTOM;
  eachLabel(node, (label, host) => {
    const ui = host.getComponent(UITransform);
    const parent = host.parent ? host.parent.getComponent(UITransform) : null;
    const parentSize = positiveUiSize(parent);
    if (ui && parentSize && parentSize.width > 8) {
      assignContentSize(ui, Math.max(8, parentSize.width - 8), Math.max(8, parentSize.height - 4));
    }
    try {
      label.string = text;
      label.fontSize = size;
      label.lineHeight = size + 4;
      label.overflow = Overflow.SHRINK;
    } catch (_err) {
      /* 钮字装配读到空尺寸时这一拍留原字。 */
    }
  });
}

function writeNamed(root: Node, name: string, text: string): void {
  const node = findNamed(root, name);
  if (!node) return;
  setText(node, text);
  const label = node.getComponent(Label);
  if (!label) return;
  const scaled = Math.abs(node.scale.x - 1) > 0.05 || Math.abs(node.scale.y - 1) > 0.05;
  if (scaled) {
    label.overflow = Overflow.SHRINK;
    const namedSize = positiveUiSize(node.getComponent(UITransform));
    if (namedSize && namedSize.width < 40) {
      assignContentSize(node.getComponent(UITransform), 360, 64);
    }
    return;
  }
  if (label.fontSize > 28) {
    label.fontSize = 18;
    label.overflow = Overflow.SHRINK;
  }
}

function writeKeep(root: Node, name: string, text: string): void {
  const node = findNamed(root, name);
  if (node) setText(node, text);
}

function tintNamed(root: Node, name: string, color: Color): void {
  const node = findNamed(root, name);
  const label = node ? node.getComponent(Label) : null;
  if (label) label.color = color;
}

function holdUpgrade(node: Node | null, title: string): void {
  if (!node) return;
  fitButton(node, title, 22);
  setGray(node, false);
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, () => {
    GameLog.shared.info("Hero", "英雄升级没有服端写协议，按钮停用，不改等级");
    const host = node.parent;
    flashToast(host && host.parent ? host.parent : node, "不发升级协议");
  });
}

type HeroPick = { all: StoreHero[]; index: number } | null;

/** 详情壳上已有的返回、左右和装备钮。只读，不发穿戴。 */
function bindHeroChrome(view: Node, picker: () => HeroPick, onSwitch: (hero: StoreHero) => void): void {
  keepEmptyRings(view);
  const back = findNamed(view, "btn_back");
  const backMark = back as (Node & { mxzgBack?: boolean }) | null;
  if (back && backMark && !backMark.mxzgBack) {
    backMark.mxzgBack = true;
    if (!back.getComponent(Button)) back.addComponent(Button);
    back.on(Button.EventType.CLICK, () => {
      let host: Node | null = view;
      while (host && host.name !== "BattleSheet") host = host.parent;
      if (host && host.isValid) {
        const extra = host.getChildByName("BtnSheetClose");
        if (extra) extra.active = false;
        host.destroy();
        return;
      }
      flashToast(view, "没有上一层");
    });
  }
  holdNav(findNamed(view, "btn_left"), -1, picker, onSwitch);
  holdNav(findNamed(view, "btn_right"), 1, picker, onSwitch);
  const slots = ["btn_equip_1", "btn_equip_2", "btn_equip_3", "btn_equip_4", "btn_runes_1", "btn_runes_2", "btn_artifact_1", "btn_artifact_2"];
  for (let i = 0; i < slots.length; i++) holdReadOnly(findNamed(view, slots[i]), view, "不发穿戴协议", false);
  holdReadOnly(findNamed(view, "btn_wear"), view, "不发穿戴协议", false);
  holdReadOnly(findNamed(view, "btn_disboard"), view, "不发穿戴协议", false);
  holdReadOnly(findNamed(view, "btn_setting"), view, "不发协议", true);
  const only = findNamed(view, "btn_only_show");
  if (only) only.active = false;
  const unfold = findNamed(view, "btn_unfold");
  if (unfold) {
    unfold.active = true;
    setGray(unfold, false);
    fitButton(unfold, "展开", 16);
    if (unfold.parent) unfold.setSiblingIndex(Math.max(0, unfold.parent.children.length - 1));
  }
  holdReadOnly(unfold, view, "不发协议", false);
}

function holdNav(node: Node | null, step: number, picker: () => HeroPick, onSwitch: (hero: StoreHero) => void): void {
  if (!node) return;
  const mark = node as Node & { mxzgHold?: boolean };
  if (mark.mxzgHold) return;
  mark.mxzgHold = true;
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, () => {
    const pick = picker();
    if (!pick) return;
    const count = pick.all.length;
    if (count < 1) return;
    const next = (pick.index + step + count) % count;
    onSwitch(pick.all[next]);
  });
}

function raiseEquipMenus(ring: Node): void {
  const names = ["menu_hero", "menu_equip", "menu_pet", "menu_totem"];
  for (let i = 0; i < names.length; i++) {
    const menu = ring.getChildByName(names[i]);
    if (menu) menu.setSiblingIndex(ring.children.length - 1);
  }
}

function keepEmptyRings(view: Node): void {
  for (let i = 0; i < HERO_EMPTY_RING_NAMES.length; i++) {
    const node = findNamed(view, HERO_EMPTY_RING_NAMES[i]);
    if (!node) continue;
    node.active = true;
    setGray(node, false);
    const kids = node.children.slice();
    for (let k = 0; k < kids.length; k++) {
      if (kids[k].name === "EquipFill") kids[k].destroy();
    }
  }
}

function holdReadOnly(node: Node | null, view: Node, toast: string, gray: boolean): void {
  if (!node) return;
  const mark = node as Node & { mxzgHold?: boolean };
  if (mark.mxzgHold) return;
  mark.mxzgHold = true;
  if (gray) setGray(node, true);
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, () => {
    GameLog.shared.info("Hero", toast);
    flashToast(view, toast);
  });
}

function bindSkillFace(node: Node, view: Node, skillId: number, level: number | null): void {
  const mark = node as Node & { mxzgSkill?: number; mxzgSkillLevel?: number | null; mxzgSkillBound?: boolean };
  mark.mxzgSkill = skillId;
  mark.mxzgSkillLevel = level;
  if (mark.mxzgSkillBound) return;
  mark.mxzgSkillBound = true;
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, () => {
    const id = mark.mxzgSkill;
    if (!id) return;
    showSkillCard(view, id, mark.mxzgSkillLevel === undefined ? null : mark.mxzgSkillLevel);
  });
}

/** 地名标题按 lbl_name 的缩放收进 spr_title_bg，不把 0.5 的字再写成 28。 */
function writeStageTitle(view: Node, text: string, wide: boolean): void {
  const node = findNamed(view, "lbl_name");
  if (!node) return;
  setText(node, text);
  if (!wide) return;
  const label = node.getComponent(Label);
  const ui = node.getComponent(UITransform);
  const scale = Math.abs(node.scale.x);
  const used = scale > 0.05 ? scale : 1;
  const bar = findNamed(view, "spr_title_bg");
  const barSize = positiveUiSize(bar ? bar.getComponent(UITransform) : null);
  const barW = barSize && barSize.width > 8 ? barSize.width : 184;
  const visual = 22;
  if (label) {
    const font = Math.max(12, Math.round(visual / used));
    label.fontSize = font;
    label.lineHeight = font + 4;
    label.overflow = Overflow.SHRINK;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
  }
  assignContentSize(ui, Math.max(8, (barW - 16) / used), Math.max(8, 36 / used));
}

function showSkillCard(view: Node, skillId: number, level: number | null): void {
  const page = heroSkillPage(skillId, level);
  const host = overlayHost(view);
  if (!page) {
    showInfoCard(view, {
      icon: "ui/hero/skill-icon_" + skillId,
      fallback: "ui/hero/hero-icon_spr-default",
      title: "技能 " + skillId,
      typeLine: "技能类型",
      body: "没有这条技能",
    });
    return;
  }
  void Promise.all([loadPrefab(HERO_SKILL_BOARD), loadPrefab(DIM_SHEET)]).then(
    (loaded) => {
      if (!host.isValid) return;
      const old = host.getChildByName("SkillCard");
      if (old) old.destroy();
      const root = spawnPrefab(loaded[1], host);
      root.name = "SkillCard";
      root.setSiblingIndex(Math.max(0, host.children.length - 1));
      const mid = seatDim(root, host, 80);
      const close = () => {
        if (root.isValid) root.destroy();
      };
      bindDimClose(root, close);
      const card = spawnPrefab(loaded[0], root);
      card.setPosition(mid.x - 200, mid.y - 250, 0);
      if (!card.getComponent(BlockInputEvents)) card.addComponent(BlockInputEvents);
      silenceBigMenus(card);
      writeKeep(card, "lbl_name", page.name);
      writeKeep(card, "lbl_active_type", page.name === "普攻" ? "普攻" : "技能类型");
      writeWrap(card, "lbl_info_1", page.blurb || " ");
      const tip = findNamed(card, "node_level_tip");
      if (tip) tip.active = page.next.length > 0;
      if (page.next) writeWrap(card, "lbl_next_level_des", page.next);
      const icon = findNamed(card, "spr_icon");
      if (icon) paintFirst(icon, ["ui/hero/skill-icon_" + skillId, "ui/hero/hero-icon_spr-default"]);
      const shut = findNamed(card, "btn_close");
      if (shut) {
        if (!shut.getComponent(Button)) shut.addComponent(Button);
        shut.on(Button.EventType.CLICK, close);
      } else GameLog.shared.warn("Hero", "HeroSkillInfoLayer 没有 btn_close");
    },
    (err) => {
      GameLog.shared.warn("Hero", "技能窗没有挂上 " + messageOf(err));
    }
  );
}

/** DimSheet 自带暗底和按钮。按宿主锚点把暗底放到画面中间。 */
function seatDim(root: Node, host: Node, pad: number): { x: number; y: number } {
  const box = host.getComponent(UITransform);
  const cardSize = positiveUiSize(box);
  const width = cardSize && cardSize.width > 8 ? cardSize.width : 640;
  const height = cardSize && cardSize.height > 8 ? cardSize.height : 960;
  const ax = box ? box.anchorPoint.x : 0;
  const ay = box ? box.anchorPoint.y : 0;
  const midX = (0.5 - ax) * width;
  const midY = (0.5 - ay) * height;
  const dim = root.getChildByName("dim");
  if (!dim) {
    GameLog.shared.warn("UI", root.name + " 下没有 dim");
    return { x: midX, y: midY };
  }
  assignContentSize(dim.getComponent(UITransform), width + pad, height + pad);
  dim.setPosition(midX, midY, 0);
  return { x: midX, y: midY };
}

function bindDimClose(root: Node, close: () => void): void {
  const dim = root.getChildByName("dim");
  if (!dim) return;
  if (!dim.getComponent(Button)) dim.addComponent(Button);
  dim.on(Button.EventType.CLICK, close);
}

/** HeroInfoAttrLayer 只有滚动区，没有关闭钮。点暗处收起。不发升级。 */
function showAttrBoard(view: Node, hero: StoreHero): void {
  const profile = heroProfile(hero.heroType);
  const stats = heroBaseStats(hero.heroType, hero.star ?? (profile ? profile.star : null));
  const lines = [
    "攻击 " + (stats ? String(stats.atk) : "—"),
    "血量 " + (stats ? String(stats.hp) : "—"),
    "防御 " + (stats ? String(stats.def) : "—"),
    "速度 " + (stats ? String(stats.spd) : "—"),
  ];
  if (hero.fighting !== null) lines.push("战力 " + String(hero.fighting));
  const host = overlayHost(view);
  void Promise.all([loadPrefab(HERO_ATTR_BOARD), loadPrefab(DIM_SHEET)]).then(
    (loaded) => {
      if (!host.isValid) return;
      const old = host.getChildByName("AttrCard");
      if (old) old.destroy();
      const root = spawnPrefab(loaded[1], host);
      root.name = "AttrCard";
      root.setSiblingIndex(Math.max(0, host.children.length - 1));
      const mid = seatDim(root, host, 80);
      const close = () => {
        if (root.isValid) root.destroy();
      };
      bindDimClose(root, close);
      const card = spawnPrefab(loaded[0], root);
      card.setPosition(mid.x - 190, mid.y - 240, 0);
      if (!card.getComponent(BlockInputEvents)) card.addComponent(BlockInputEvents);
      silenceBigMenus(card);
      const scroll = findNamed(card, "scroll_view");
      const content = scroll ? scroll.getChildByName("content") : null;
      if (!content) {
        GameLog.shared.warn("Hero", "HeroInfoAttrLayer 的 scroll_view 下没有 content");
        return;
      }
      for (let i = 0; i < 5; i++) {
        const line = content.getChildByName("lbl_line" + i);
        if (!line) {
          if (i < lines.length) GameLog.shared.warn("Hero", "属性行没有 lbl_line" + i);
          continue;
        }
        const show = i < lines.length;
        line.active = show;
        if (show) setText(line, lines[i]);
      }
    },
    (err) => {
      GameLog.shared.warn("Hero", "HeroInfoAttrLayer 没有挂上 " + messageOf(err));
      flashToast(view, "属性窗没有挂上");
    }
  );
}

function writeWrap(root: Node, name: string, text: string): void {
  const node = findNamed(root, name);
  if (!node) return;
  const label = node.getComponent(Label);
  if (!label) {
    setText(node, text);
    return;
  }
  label.string = text;
  label.overflow = Overflow.RESIZE_HEIGHT;
  const wrapSize = positiveUiSize(node.getComponent(UITransform));
  if (wrapSize && wrapSize.width < 8) assignContentSize(node.getComponent(UITransform), DESIGN_WIDTH, 0);
}

function overlayHost(view: Node): Node {
  let sheet: Node | null = null;
  let shell: Node | null = null;
  let host: Node | null = view;
  while (host) {
    if (host.name === "BattleSheet") sheet = host;
    if (host.name === "PagePrefabShell") shell = host;
    host = host.parent;
  }
  if (sheet && sheet.isValid) return sheet;
  if (shell && shell.isValid) return shell;
  return view;
}

function fillGrowBoard(
  view: Node,
  board: Node,
  hero: StoreHero,
  profile: HeroProfile | null,
  stats: { atk: number; hp: number; def: number; spd: number } | null
): void {
  const star = hero.star ?? ((profile && profile.star) || null);
  const step = heroStarStep(star);
  const limit = step ? step.levelLimit : null;
  const level = hero.level;
  const capped = level !== null && limit !== null && level >= limit;
  writeKeep(board, "lbl_level", level === null ? "—" : limit === null ? String(level) : level + "/" + limit);
  const occ = profile ? profile.occupation : null;
  const occLabel = occupationName(occ);
  writeKeep(board, "lbl_profession", occLabel ? "职业: " + occLabel : "职业: 未知");
  const job = findNamed(board, "icon_occupat");
  if (job) {
    if (occ !== null && occ >= 1 && occ <= 5 && occLabel) {
      job.active = true;
      paintSprite(job, "ui/hero/hero-info_icon-occup-" + occ);
    } else job.active = false;
  }
  writeKeep(board, "lbl_attack", "攻击：" + (stats ? String(stats.atk) : "—"));
  writeKeep(board, "lbl_hp", "血量：" + (stats ? String(stats.hp) : "—"));
  writeKeep(board, "lbl_defense", "防御：" + (stats ? String(stats.def) : "—"));
  writeKeep(board, "lbl_speed", "速度：" + (stats ? String(stats.spd) : "—"));
  const need = level === null || capped ? null : heroLevelNeed(level);
  const gold = knownGold();
  const exp = knownBagCount(HERO_EXP_ITEM);
  writeKeep(board, "lbl_gold_need", need ? String(need.gold) : "—");
  writeKeep(board, "lbl_exp_need", need ? String(need.exp) : "—");
  tintNamed(board, "lbl_gold_need", need && gold !== null && gold < need.gold ? SHORT : COST_OK);
  tintNamed(board, "lbl_exp_need", need && exp !== null && exp < need.exp ? SHORT : COST_OK);
  const maxed = findNamed(board, "lbl_max_tips");
  if (maxed) {
    maxed.active = capped || (level !== null && !need && !heroLevelNeed(level));
    if (maxed.active) setText(maxed, capped ? "已达星级上限" : "已达最大等级");
  }
  const menu = findNamed(board, "skill_menu");
  if (menu) {
    const skills = profile ? profile.skills : [];
    const n = skills.length < 4 ? skills.length : 4;
    if (!menu.getChildByName("skill0")) GameLog.shared.warn("Hero", "skill_menu 下没有 skill0");
    for (let i = 0; i < 4; i++) {
      const slot = menu.getChildByName("skill" + i);
      if (!slot) continue;
      const show = i < n;
      slot.active = show;
      if (!show) continue;
      const skill = skills[i];
      // 技能条 CCSprite_1 锚在 (0, 86)，和 skill_menu 原点重合。图标绕这条的中心排。
      slot.setPosition((i - (n - 1) / 2) * 70, 0, 0);
      paintFirst(slot, ["ui/hero/skill-icon_" + skill.id, "ui/hero/hero-icon_spr-default"]);
      const openedLevel = step && i < step.skillLevels.length ? step.skillLevels[i] : null;
      const badge = slot.getChildByName("badge");
      if (badge) {
        badge.active = openedLevel !== null;
        if (openedLevel !== null) {
          badge.setPosition(HERO_SKILL_BADGE_OFFSET.x, HERO_SKILL_BADGE_OFFSET.y, 0);
          const mark = badge.getChildByName("lbl");
          if (mark) setText(mark, String(openedLevel));
        }
      } else if (openedLevel !== null) {
        GameLog.shared.warn("Hero", "skill" + i + " 下没有 badge");
      }
      bindSkillFace(slot, view, skill.id, openedLevel);
    }
    const box = menu.getComponent(UITransform);
    if (box) box.setContentSize(0, 0);
  }
  const nil = findNamed(board, "node_nil_skill");
  if (nil) nil.active = !profile || profile.skills.length === 0;
}

function fillStarBoard(view: Node, board: Node, hero: StoreHero, profile: HeroProfile | null): void {
  const star = hero.star ?? ((profile && profile.star) || 1);
  const cur = heroStarStep(star);
  const nxt = heroStarStep(star + 1);
  const maxed = star >= 14 || !nxt;
  writeKeep(board, "lbl_now_max_level", cur ? String(cur.levelLimit) : "—");
  writeKeep(board, "lbl_now_next_level", maxed ? "—" : nxt ? String(nxt.levelLimit) : "—");
  paintStarMarks(findNamed(board, "node_cur_star"), star);
  const nextStars = findNamed(board, "node_next_star");
  const maxStar = nextStars ? nextStars.getChildByName("MaxStar") : null;
  if (maxed) {
    paintStarMarks(nextStars, 0);
    if (maxStar) maxStar.active = true;
    else if (nextStars) GameLog.shared.warn("Hero", "node_next_star 下没有 MaxStar");
  } else {
    if (maxStar) maxStar.active = false;
    paintStarMarks(nextStars, star + 1);
  }
  const speed = findNamed(board, "lbl_upgrade_speed");
  if (speed) speed.active = false;
  const show = nxt || cur;
  writeKeep(
    board,
    "lbl_upgrade_attack",
    show ? show.attackShow + "%/" + show.hpShow + "%" : "—"
  );
  const from = cur && cur.skillLevels.length > 0 ? cur.skillLevels[0] : null;
  const to = nxt && nxt.skillLevels.length > 0 ? nxt.skillLevels[0] : null;
  writeKeep(board, "lbl_upgrade_skill_all_1", from === null ? "—" : from + "级");
  writeKeep(board, "lbl_upgrade_skill_all_2", maxed || to === null ? "—" : to + "级");
  const skills = profile ? profile.skills : [];
  const icon1 = findNamed(board, "spr_skill_icon_1");
  const icon2 = findNamed(board, "spr_skill_icon_2");
  if (icon1 && skills.length > 0) {
    paintFirst(icon1, ["ui/hero/skill-icon_" + skills[0].id, "ui/hero/hero-icon_spr-default"]);
    bindSkillFace(icon1, view, skills[0].id, from);
  }
  if (icon2 && skills.length > 1) {
    paintFirst(icon2, ["ui/hero/skill-icon_" + skills[1].id, "ui/hero/hero-icon_spr-default"]);
    const level2 = cur && cur.skillLevels.length > 1 ? cur.skillLevels[1] : from;
    bindSkillFace(icon2, view, skills[1].id, level2);
  }
  writeKeep(board, "lbl_skill_level_1", from === null ? "—" : String(from));
  writeKeep(board, "lbl_skill_level_2", to === null ? "—" : String(to));
  writeKeep(board, "lbl_jump", "不发升星协议");
  const button = findNamed(board, "btn_up_star");
  fitButton(button, maxed ? "已满星" : "升星", 22);
  setGray(button, false);
  paintStarCostRow(board, hero, maxed ? null : nxt);
  const goldCost = nxt ? costNum(nxt.cost.concat(nxt.needItem), 900001) : null;
  writeKeep(board, "lbl_gold_need", goldCost === null ? "—" : String(goldCost));
  const gold = knownGold();
  tintNamed(board, "lbl_gold_need", goldCost !== null && gold !== null && gold < goldCost ? SHORT : COST_OK);
}

function paintStarCostRow(board: Node, hero: StoreHero, nxt: StarStep | null): void {
  const row = findNamed(board, "CostRow");
  if (!row) {
    GameLog.shared.warn("Hero", "升星没有 CostRow");
    return;
  }
  const full = row.getChildByName("lbl_full");
  const need = row.getChildByName("lbl_need");
  const nums = namedChildren(row, "lbl_num");
  if (!nxt) {
    if (full) {
      full.active = true;
      setText(full, "已满星");
    } else GameLog.shared.warn("Hero", "CostRow 下没有 lbl_full");
    if (need) need.active = false;
    for (let i = 0; i < 4; i++) {
      const cell = row.getChildByName("cost" + i);
      if (cell) cell.active = false;
      if (nums[i]) nums[i].active = false;
    }
    return;
  }
  if (full) full.active = false;
  const stacks = nxt.cost.concat(nxt.needItem);
  const icons = stacks.length < 4 ? stacks.length : 4;
  for (let i = 0; i < 4; i++) {
    const cell = row.getChildByName("cost" + i);
    const num = nums[i] || null;
    const show = i < icons;
    if (cell) cell.active = show;
    if (num) num.active = show;
    if (!show || !cell) {
      if (show && !cell) GameLog.shared.warn("Hero", "CostRow 下没有 cost" + i);
      continue;
    }
    const stack = stacks[i];
    const face = itemProfile(stack.itemType, null);
    const icon = face && face.icon ? face.icon : "ui/bag/backpack_" + stack.itemType;
    const owned = knownBagCount(stack.itemType);
    paintSprite(cell, rareFrame(face ? face.rare : 0));
    const image = cell.getChildByName("spr_icon");
    if (image) {
      paintFirst(image, [icon, "ui/bag/backpack_spr-default"]);
      const gray = image.getComponent(Sprite);
      if (gray) gray.grayscale = owned !== null && owned < stack.num;
    } else GameLog.shared.warn("Hero", "cost" + i + " 下没有 spr_icon");
    if (num) {
      setText(num, "×" + stack.num);
      const label = num.getComponent(Label);
      if (label) label.color = owned !== null && owned < stack.num ? SHORT : INK;
    }
  }
  const needs = heroStarNeeds(hero.heroType, nxt.star);
  if (!need) return;
  if (needs.length === 0) {
    need.active = false;
    return;
  }
  const bits: string[] = [];
  for (let i = 0; i < needs.length && bits.length < 2; i++) bits.push(sacrificeLine(needs[i]));
  need.active = true;
  setText(need, bits.join("  "));
}

function namedChildren(node: Node, name: string): Node[] {
  const found: Node[] = [];
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].name === name) found.push(kids[i]);
  }
  return found;
}

function costNum(stacks: { itemType: number; num: number }[], itemType: number): number | null {
  for (let i = 0; i < stacks.length; i++) {
    if (stacks[i].itemType === itemType) return stacks[i].num;
  }
  return null;
}

function knownGold(): number | null {
  if (Session.source === "wire" && !Session.wireSync.gold) return null;
  if (typeof Session.gold !== "number" || !isFinite(Session.gold)) return null;
  return Session.gold;
}

function knownBagCount(id: number): number | null {
  if (GameStore.bag() === null) return null;
  return bagCount(id);
}

function heroSpaceLine(all: StoreHero[] | null): string {
  const cap = heroSpaceShown();
  return "空间 " + (all ? all.length : "—") + "/" + cap;
}

function markHeroTabs(view: Node, tab: "hero" | "book" | "dragon"): void {
  paintTab(findNode(view, HERO_TAB_HERO), tab === "hero");
  paintTab(findNode(view, HERO_TAB_BOOK), tab === "book");
  paintTab(findNode(view, HERO_TAB_DRAGON), tab === "dragon");
}

/**
 * 页签在 HeroListLayer/UIMenu_1。板子挂上之后再绑，和 node_elem 的六颗筛选同一套：
 * findNode、钮保持显示、关掉 Button 过渡、只听 CLICK，再把这一排抬到父节点最前。
 * 不把 UIMenu_1 收成 0。缺路径只打日志，不 new 节点。
 * 图鉴留着元素条。圣龙收起元素条。
 */
function bindHeroPageTabs(view: Node, pick: (tab: "hero" | "book" | "dragon") => void): void {
  const menu = findNode(view, HERO_TAB_MENU);
  console.log("[HeroTab] bind UIMenu_1 found=" + !!menu);
  if (!menu) {
    GameLog.shared.warn("Hero", "HeroListLayer 没有 UIMenu_1。请在 prefabs/ui/hero/HeroListLayer 保留 UIMenu_1/btn_hero、btn_illustrat、btn_dragon");
  } else if (menu.parent) {
    menu.active = true;
    menu.setSiblingIndex(menu.parent.children.length - 1);
  }
  const paths: { id: "hero" | "book" | "dragon"; path: string; name: string }[] = [
    { id: "hero", path: HERO_TAB_HERO, name: "btn_hero" },
    { id: "book", path: HERO_TAB_BOOK, name: "btn_illustrat" },
    { id: "dragon", path: HERO_TAB_DRAGON, name: "btn_dragon" },
  ];
  for (let i = 0; i < paths.length; i++) {
    const spec = paths[i];
    const node = findNode(view, spec.path);
    console.log("[HeroTab] bind " + spec.name + " found=" + !!node);
    if (!node) {
      GameLog.shared.warn("Hero", "HeroListLayer 没有 " + spec.path);
      continue;
    }
    node.active = true;
    const mark = node as Node & { mxzgHeroTab?: boolean };
    if (mark.mxzgHeroTab) continue;
    mark.mxzgHeroTab = true;
    const click = node.getComponent(Button) || node.addComponent(Button);
    click.transition = Button.Transition.NONE;
    click.interactable = true;
    node.on(Button.EventType.CLICK, () => {
      console.log("[HeroTab] click " + spec.name);
      pick(spec.id);
    });
  }
}

function markElem(board: Node | null, elem: number): void {
  if (!board) return;
  for (let i = 0; i < HERO_ELEM_BUTTONS; i++) {
    const button = findNode(board, HERO_ELEM_BUTTON + i);
    if (!button) continue;
    holdElemScale(button, i === elem ? 1 : 0.8);
  }
}

/**
 * 只绑预制上的六个钮。没有这条路径就打日志，不 new 节点。
 * 选中的一颗用预制默认 0.8 放大到 1。Button 的缩放过渡会把这一档盖回去，所以关掉。
 */
function bindElemRow(root: Node, pick: (id: number) => void): void {
  const row = findNode(root, HERO_ELEM_ROW);
  const menu = findNode(root, HERO_ELEM_MENU);
  if (!row || !menu) {
    GameLog.shared.warn(
      "Hero",
      "HeroListHeroLayer 没有 " +
        (row ? HERO_ELEM_MENU : HERO_ELEM_ROW) +
        "。请在 prefabs/ui/hero/HeroListHeroLayer 加上 node_elem/elem_menu/btn_elem0…5，贴图 ui/hero/hero-icon_elem-0.png … hero-icon_elem-5.png"
    );
  } else if (row.parent) {
    row.active = true;
    row.setSiblingIndex(row.parent.children.length - 1);
  }
  for (let i = 0; i < HERO_ELEM_BUTTONS; i++) {
    const id = i;
    const button = findNode(root, HERO_ELEM_BUTTON + id);
    if (!button) {
      GameLog.shared.warn("Hero", "HeroListHeroLayer 没有 " + HERO_ELEM_BUTTON + id + "，贴图 " + HERO_ELEM_SPRITE + id + ".png");
      continue;
    }
    button.active = true;
    holdElemScale(button, button.scale.x > 0.9 ? 1 : 0.8);
    const mark = button as Node & { mxzgElem?: boolean };
    if (mark.mxzgElem) continue;
    mark.mxzgElem = true;
    const click = button.getComponent(Button) || button.addComponent(Button);
    click.transition = Button.Transition.NONE;
    paintSprite(button, HERO_ELEM_SPRITE + id);
    button.on(Button.EventType.CLICK, () => pick(id));
  }
}

function holdElemScale(button: Node, scale: number): void {
  const click = button.getComponent(Button);
  if (click) click.transition = Button.Transition.NONE;
  button.setScale(scale, scale, 1);
}

function pinHeroScrollTop(board: Node | null): void {
  if (!board) return;
  const scroll = findNode(board, "spr_box/HeroScroll");
  if (!scroll) return;
  const scroller = scroll.getComponent(ScrollView);
  const content =
    (scroller && scroller.content) || findNode(scroll, "view/content") || scroll.getChildByName("content");
  if (content && content.isValid) content.setPosition(0, 0, 0);
  if (!scroller || typeof scroller.scrollToTop !== "function") return;
  try {
    scroller.scrollToTop(0);
  } catch (_err) {
    /* 视口尺寸还是空的时候滚顶会读 width。格子已经按本地坐标摆在视口顶上。 */
  }
  if (content && content.isValid) content.setPosition(0, 0, 0);
}

function bagTabHost(view: Node): Node | null {
  const scroll = findNamed(view, "btn_scroll_view");
  if (!scroll) return null;
  return scroll.getChildByName("content");
}

function sameBag(a: StoreBagItem, b: StoreBagItem): boolean {
  return a.itemId === b.itemId && a.itemType === b.itemType;
}

function paintTab(node: Node | null, on: boolean): void {
  if (!node) return;
  const button = node.getComponent(Button);
  if (button) button.transition = Button.Transition.NONE;
  paintSprite(node, on ? "ui/common/button_btn-tab-24" : "ui/common/button_btn-tab-23");
}

function setGray(node: Node | null, on: boolean): void {
  if (!node) return;
  const image = node.getComponent(Sprite);
  if (image) image.grayscale = on;
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) setGray(kids[i], on);
}

function flashToast(view: Node, text: string): void {
  GameLog.shared.info("UI", text);
  let sheet: Node | null = null;
  let shell: Node | null = null;
  let host: Node | null = view;
  while (host) {
    if (host.name === "BattleSheet") sheet = host;
    if (host.name === "PagePrefabShell") shell = host;
    host = host.parent;
  }
  const layer = sheet && sheet.isValid ? sheet : shell && shell.isValid ? shell : view;
  const old = layer.getChildByName("ReadToast");
  if (old) old.destroy();
  void loadPrefab(TEXT_CHIP).then(
    (prefab) => {
      if (!layer.isValid) return;
      const again = layer.getChildByName("ReadToast");
      if (again) again.destroy();
      const node = spawnPrefab(prefab, layer);
      node.name = "ReadToast";
      const label = node.getComponent(Label);
      if (label) {
        label.string = text;
        label.fontSize = 22;
        label.lineHeight = 26;
        label.color = CREAM;
      }
      assignContentSize(node.getComponent(UITransform), 520, 40);
      place(node, layer, 0, 180);
      node.setSiblingIndex(Math.max(0, layer.children.length - 1));
      const timer = setTimeout(() => {
        if (node.isValid) node.destroy();
      }, 1600);
      const maybe = timer as { unref?: () => void };
      if (typeof maybe.unref === "function") maybe.unref();
    },
    (err) => {
      GameLog.shared.warn("UI", "TextChip 没有挂上 " + messageOf(err));
    }
  );
}

function mountNested(parent: Node, path: string, name: string): Promise<Node | null> {
  return loadPrefab(path).then(
    (prefab) => {
      if (!parent.isValid) return null;
      const node = spawnPrefab(prefab, parent);
      node.name = name;
      node.setPosition(0, 0, 0);
      return node;
    },
    (err) => {
      GameLog.shared.warn("UI", path + " " + messageOf(err));
      return null;
    }
  );
}

function showBagInfo(view: Node, item: StoreBagItem): void {
  const spec = bagCard(item);
  void Promise.all([loadPrefab(BAG_INFO_BOARD), loadPrefab(DIM_SHEET)]).then(
    (loaded) => {
      if (!view.isValid) return;
      const old = view.getChildByName("InfoCard");
      if (old) old.destroy();
      const root = spawnPrefab(loaded[1], view);
      root.name = "InfoCard";
      root.setSiblingIndex(Math.max(0, view.children.length - 1));
      const dim = root.getChildByName("dim");
      if (dim) {
        // 锚点在中心、位置在 640×960 的 ccbi 中心。宽仍用 720，盖住 9:16 的可视宽。
        assignContentSize(dim.getComponent(UITransform), 720, 1100);
        dim.setPosition(320, 480, 0);
      } else GameLog.shared.warn("Bag", "InfoCard 下没有 dim");
      const close = () => {
        if (root.isValid) root.destroy();
      };
      bindDimClose(root, close);
      const card = spawnPrefab(loaded[0], root);
      card.setPosition(125, 330, 0);
      if (!card.getComponent(BlockInputEvents)) card.addComponent(BlockInputEvents);
      silenceBigMenus(card);
      const bg = findNamed(card, "spr_bg");
      if (bg) bg.setPosition(195, 148, 0);
      writeKeep(card, "lbl_prop_name", spec.title);
      writeKeep(card, "lbl_prop_type", spec.typeLine);
      const desc = findNamed(card, "lbl_desc");
      if (desc) {
        desc.active = true;
        setText(desc, spec.body || " ");
      }
      const icon = findNamed(card, "spr_icon");
      if (icon) paintFirst(icon, [spec.icon, spec.fallback || "ui/bag/backpack_spr-default"]);
      const rare = findNamed(card, "spr_rare");
      if (rare && spec.frame) paintSprite(rare, spec.frame);
      else if (spec.frame) GameLog.shared.warn("Bag", "BackpackInfoLayer 下没有 spr_rare");
      const use = findNamed(card, "btn_enter");
      if (use) {
        use.active = true;
        setGray(use, true);
        fitButton(use, "使用", 22);
        if (!use.getComponent(Button)) use.addComponent(Button);
        use.on(Button.EventType.CLICK, () => {
          GameLog.shared.info("Bag", "背包使用停用，不发 5004–5009");
          flashToast(view, "不发使用协议");
        });
      }
      const detail = findNamed(card, "btn_detail");
      if (detail) detail.active = false;
      const decompose = findNamed(card, "btn_decompose");
      if (decompose) decompose.active = false;
      const src = findNamed(card, "btn_src");
      if (src) {
        setGray(src, true);
        if (!src.getComponent(Button)) src.addComponent(Button);
        src.on(Button.EventType.CLICK, () => flashToast(view, "来源只读，不跳转"));
      }
      const shut = findNamed(card, "btn_close");
      if (shut) {
        if (!shut.getComponent(Button)) shut.addComponent(Button);
        shut.on(Button.EventType.CLICK, close);
      }
    },
    (err) => {
      GameLog.shared.warn("Bag", "背包详情没有挂上 " + messageOf(err));
      showInfoCard(view, spec);
    }
  );
}

function hideNamed(root: Node, name: string): void {
  const node = findNamed(root, name);
  if (node) node.active = false;
}

function sprite(name: string, width: number, height: number, path: string, fallback?: string): Node {
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  assignContentSize(ui, width, height);
  const image = node.addComponent(Sprite);
  image.sizeMode = Sprite.SizeMode.CUSTOM;
  image.type = Sprite.Type.SIMPLE;
  if (fallback && fallback !== path) paintFirst(node, [path, fallback]);
  else paintSprite(node, path);
  return node;
}

function paintSprite(node: Node, path: string): void {
  paintFirst(node, [path]);
}

function paintFirst(node: Node, paths: string[]): void {
  const image = node.getComponent(Sprite);
  if (!image) return;
  const loadAt = (index: number) => {
    if (!node.isValid || index >= paths.length) return;
    try {
      resources.load(paths[index] + "/spriteFrame", SpriteFrame, (err, asset) => {
        if (!node.isValid) return;
        if (err || !asset) {
          loadAt(index + 1);
          return;
        }
        try {
          image.spriteFrame = asset;
        } catch (_err) {
          return;
        }
      });
    } catch (_err) {
      return;
    }
  };
  loadAt(0);
}

export function pinSprites(node: Node): void {
  const image = node.getComponent(Sprite);
  if (image) image.sizeMode = Sprite.SizeMode.CUSTOM;
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) pinSprites(kids[i]);
}

/** 全屏 menu 会盖住格子。页签那排 UIMenu_1 例外，尺寸留着。其余大 menu 收成 0。 */
function silenceBigMenus(root: Node): void {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    if (node.name.toLowerCase().indexOf("menu") < 0) continue;
    // HeroListLayer/UIMenu_1 下面就是 btn_hero / btn_illustrat / btn_dragon，预制 640×960。
    // 元素条 elem_menu 预制高度是 0，进不了这里。页签这排保持预制尺寸，不收成 0。
    if (node.name === "UIMenu_1" && node.getChildByName("btn_illustrat")) continue;
    const menuSize = positiveUiSize(node.getComponent(UITransform));
    if (!menuSize || menuSize.width < 500 || menuSize.height < 500) continue;
    const ui = node.getComponent(UITransform);
    if (!ui) continue;
    ui.setContentSize(0, 0);
  }
}

/**
 * 育成 / 星UP 放进 node_panel。内容块原点对齐羊皮纸下沿再上移 8，顶上留给页签。
 * pieceX/pieceY 是 CCBI 里 node_all 或 CCNode_1 的位置。
 */
function seatOnPanel(board: Node, panel: Node, pieceX: number, pieceY: number): void {
  if (board.parent !== panel) board.parent = panel;
  board.setPosition(-pieceX, 8 - pieceY, 0);
  const tabs = panel.getChildByName("scroll_view_tab");
  if (tabs) tabs.setSiblingIndex(Math.max(0, panel.children.length - 1));
}

const TALK_INK = new Color(141, 89, 58, 255);

/** 台词在返回下沿之下，并抬到 menu_back 前面。返回中心约 (570, 835)、高 55。 */
function seatHeroTalk(view: Node, level: number | null): void {
  let talk = findNamed(view, "node_talk");
  if (!talk) {
    talk = uiNode("node_talk");
    const ui = talk.addComponent(UITransform);
    assignContentSize(ui, 220, 72);
    ui.setAnchorPoint(0.5, 0.5);
    const bubble = uiNode("spr_bubble");
    const bubbleUi = bubble.addComponent(UITransform);
    assignContentSize(bubbleUi, 220, 72);
    bubbleUi.setAnchorPoint(0.5, 0.5);
    const image = bubble.addComponent(Sprite);
    image.sizeMode = Sprite.SizeMode.CUSTOM;
    image.type = Sprite.Type.SIMPLE;
    place(bubble, talk, 0, 0);
    paintSprite(bubble, "ui/common/other_spr-bubble-5");
    const line = createLabel("", 18, { color: TALK_INK, width: 180, height: 48 });
    line.name = "lbl_talk";
    place(line, talk, 0, 6);
  }
  if (talk.parent !== view) talk.parent = view;
  talk.active = true;
  talk.setPosition(400, 700, 0);
  talk.setSiblingIndex(Math.max(0, view.children.length - 1));
  const line = findNamed(talk, "lbl_talk");
  const text = heroTalkLine(level);
  if (line) setText(line, text);
  if (!text) GameLog.shared.info("Hero", "详情台词 herotalk 还没读到");
}

function heroTalkLine(level: number | null): string {
  const db = ConfigDb.current;
  const talkFile = db ? db.tables.get("herotalk") : null;
  const rows = readHeroTalkRows(talkFile || null);
  if (rows.length === 0) return "";
  const lan = pickHeroTalkLan(rows, level, 0);
  if (lan !== null) {
    const file = db ? db.tables.get("language") : null;
    const list = file && Array.isArray(file.rows) ? file.rows : [];
    const key = String(lan);
    for (let i = 0; i < list.length; i++) {
      const row = list[i] as { key?: unknown; value?: unknown } | null;
      if (!row || row.key === undefined || String(row.key) !== key) continue;
      const text = plainTalk(typeof row.value === "string" ? row.value : "");
      if (text) return text;
    }
  }
  const list = talkFile && Array.isArray(talkFile.rows) ? talkFile.rows : [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i] as { lan?: unknown; note?: unknown } | null;
    if (!row) continue;
    if (lan !== null && String(row.lan) !== String(lan)) continue;
    if (typeof row.note === "string" && row.note.trim()) return row.note.trim();
  }
  return "";
}

function paintStarMarks(host: Node | null, count: number): void {
  if (!host) return;
  if (!host.getChildByName("star0")) {
    GameLog.shared.warn("Hero", host.name + " 下没有 star0");
    return;
  }
  const n = count > 5 ? 5 : count < 0 ? 0 : Math.floor(count);
  for (let i = 0; i < 5; i++) {
    const star = host.getChildByName("star" + i);
    if (!star) continue;
    star.active = i < n;
    if (i < n) star.setPosition((i - (n - 1) / 2) * 24, 0, 0);
  }
}

function findNamed(root: Node, name: string): Node | null {
  if (root.name === name) return root;
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const found = findNamed(kids[i], name);
    if (found) return found;
  }
  return null;
}

function eachLabel(node: Node, fn: (label: Label, host: Node) => void): void {
  const label = node.getComponent(Label);
  if (label) fn(label, node);
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) eachLabel(kids[i], fn);
}

function shortName(name: string): string {
  if (!name) return "";
  return name.length > 4 ? name.slice(0, 4) : name;
}

function clamp(value: number, min: number, max: number): number {
  if (!isFinite(value)) return min;
  const n = Math.floor(value);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function clearedCount(): number {
  const stage = GameStore.mockStageId();
  if (stage !== null) return Math.max(0, stage - 1);
  const chapter = GameStore.chapter();
  if (chapter.fromStore && chapter.nowIdx !== null && chapter.nowIdx > 1) return chapter.nowIdx - 1;
  return 0;
}

function hangClockText(idle: { fromStore: boolean; rewardTime: number | null; maxRewardTime: number | null }): string {
  if (idle.fromStore && (idle.rewardTime === null || !isFinite(idle.rewardTime) || idle.rewardTime < IDLE_UNIX_FLOOR)) {
    return "未同步";
  }
  let elapsed = idle.fromStore ? wireIdleElapsedMs(idle.rewardTime, Date.now()) : Math.max(0, Date.now() - dressClock.t);
  const cap = idle.fromStore ? wireIdleCapMs(idle.maxRewardTime, idleCapMs()) : idleCapMs();
  if (cap !== null && elapsed > cap) elapsed = cap;
  return formatHangClock(elapsed);
}

function timeFill(idle: { fromStore: boolean; rewardTime: number | null; maxRewardTime: number | null }): number {
  if (idle.fromStore && (idle.rewardTime === null || !isFinite(idle.rewardTime) || idle.rewardTime < IDLE_UNIX_FLOOR)) {
    return 0;
  }
  let elapsed = idle.fromStore ? wireIdleElapsedMs(idle.rewardTime, Date.now()) : Math.max(0, Date.now() - dressClock.t);
  const cap = idle.fromStore ? wireIdleCapMs(idle.maxRewardTime, idleCapMs()) : idleCapMs();
  if (cap === null || cap <= 0) return elapsed > 0 ? 1 : 0;
  if (elapsed > cap) elapsed = cap;
  return elapsed / cap;
}

const dressClock = { t: Date.now() };

interface InfoCard {
  icon: string;
  title: string;
  typeLine: string;
  body: string;
  frame?: string;
  fallback?: string;
}

function sizeScroll(content: Node, height: number, minHeight: number): void {
  const ui = content.getComponent(UITransform);
  const size = positiveUiSize(ui);
  const width = size && size.width > 0 ? size.width : 448;
  if (ui) ui.setContentSize(width, Math.max(minHeight, height));
}

function clearChildren(node: Node): void {
  const old = node.children.slice();
  for (let i = 0; i < old.length; i++) old[i].destroy();
}

function paddedSlots(count: number, minRows = 4): number {
  return slotRows(Math.max(count, COLS * minRows), minRows) * COLS;
}

function slotRows(count: number, minRows = 4): number {
  if (count <= 0) return minRows;
  return Math.max(minRows, Math.ceil(count / COLS));
}

function gridX(index: number, origin: number, pitch: number): number {
  return origin + (index % COLS) * pitch;
}

function gridY(index: number, origin: number, pitch: number): number {
  return origin - Math.floor(index / COLS) * pitch;
}

function heroFace(hero: StoreHero): string {
  const profile = heroProfile(hero.heroType);
  if (profile && profile.icon) return profile.icon;
  return "ui/hero/hero-icon_spr-default";
}

function rareFrame(rare: number): string {
  if (rare === 2 || rare === 3 || rare === 4) return "ui/bag/backpack_spr-rare-" + rare;
  return "ui/bag/backpack_item-frame-1";
}

function elemLabel(elem: number | null): string {
  if (elem === null || elem < 1 || elem > 5) return "元素";
  return ELEM_NAME[elem];
}

function placeTitle(id: number, places: { id: number; title: string }[]): string {
  for (let i = 0; i < places.length; i++) {
    if (places[i].id === id) return places[i].title;
  }
  return "";
}

function bagCount(id: number): number {
  const all = GameStore.bag();
  if (!all) return 0;
  let n = 0;
  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    if (item.num !== null && item.num <= 0) continue;
    if (item.itemType !== id && item.itemId !== id) continue;
    n += item.num === null ? 1 : item.num;
  }
  return n;
}

function relicOwned(relic: RelicFace): number {
  let n = 0;
  for (let i = 0; i < relic.stages.length; i++) n += bagCount(relic.stages[i].id);
  return n;
}

function sacrificeLine(need: SacrificeNeed): string {
  if (need.type > 0) {
    const profile = heroProfile(need.type);
    const name = profile ? profile.name : "英雄" + need.type;
    return name + " " + need.star + "星 ×" + need.num;
  }
  if (need.elem > 0) return elemLabel(need.elem) + need.star + "星 ×" + need.num;
  return "任意" + need.star + "星 ×" + need.num;
}

function profileCard(profile: HeroProfile): InfoCard {
  const stats = heroBaseStats(profile.type, profile.star);
  const names: string[] = [];
  for (let i = 0; i < profile.skills.length && i < 4; i++) names.push(profile.skills[i].name);
  const statLine = stats
    ? "攻击 " + stats.atk + "  HP " + stats.hp + "  防御 " + stats.def + "  速度 " + stats.spd
    : "";
  return {
    icon: profile.icon || "ui/hero/hero-icon_spr-default",
    fallback: "ui/hero/hero-icon_spr-default",
    title: profile.name,
    typeLine: elemLabel(profile.elem) + "  " + (profile.star === null ? "—" : profile.star + "星"),
    body: (names.length > 0 ? names.join("  ") : "无技能") + (statLine ? "\n" + statLine : "") + "\n未获得",
  };
}

function dropCard(face: DropFace, every: number | null): InfoCard {
  const profile = itemProfile(face.itemType, null);
  const count = face.min === face.max ? "表内数量 " + face.min : "表内 " + face.min + "–" + face.max;
  const freq = every === null ? "" : "每 " + every + " 秒判定一次。";
  return {
    icon: (profile && profile.icon) || "ui/bag/backpack_" + face.itemType,
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(profile ? profile.rare : 0),
    title: profile && profile.name ? profile.name : "掉落 " + face.itemType,
    typeLine: "可能掉落",
    body: freq + count + "。不在这里掷随机数，也不写进每分钟三格。",
  };
}

function bagCard(item: StoreBagItem): InfoCard {
  const profile = itemProfile(item.itemType, item.itemId);
  const raw = formatStoreBagLine(item);
  const tab = itemBagTab(item.itemType, item.itemId);
  if (!profile) {
    return {
      icon: item.itemId ? "ui/bag/backpack_" + item.itemId : "ui/bag/backpack_spr-default",
      fallback: "ui/bag/backpack_spr-default",
      frame: "ui/bag/backpack_item-frame-1",
      title: "道具",
      typeLine: raw,
      body: "对不上表。缺的数不写成 0。",
    };
  }
  const count = item.num === null ? "数量 无" : "数量 " + item.num;
  const rare = profile.rare > 0 ? "  稀有 " + profile.rare : "";
  return {
    icon: profile.icon || itemIconResource(item.itemType, item.itemId) || "ui/bag/backpack_spr-default",
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(profile.rare),
    title: profile.name || "道具",
    typeLine: "类型：" + bagTabTitle(tab) + "  " + count + rare,
    body: profile.blurb || " ",
  };
}

function jewelCard(id: number, placeId: number, rare: number, star: number, owned: number): InfoCard {
  const face = itemProfile(id, null);
  return {
    icon: face && face.icon ? face.icon : "ui/bag/backpack_" + id,
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(rare),
    title: face && face.name ? face.name : "宝石 " + id,
    typeLine: placeTitle(placeId, GEM_PLACES) + "  " + star + "星  稀有 " + rare,
    body: owned > 0 ? "持有 " + owned : "未获得",
  };
}

function gearCard(id: number, note: string, placeId: number, rare: number, star: number, owned: number): InfoCard {
  const face = itemProfile(id, null);
  const name = face && face.name ? face.name : note || "神装 " + id;
  return {
    icon: face && face.icon ? face.icon : "ui/bag/backpack_" + id,
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(rare),
    title: name,
    typeLine: placeTitle(placeId, GEAR_PLACES) + "  " + star + "星  稀有 " + rare,
    body: (face && face.blurb ? face.blurb + "\n" : "") + (owned > 0 ? "持有 " + owned : "未获得"),
  };
}

function relicCard(relic: RelicFace, owned: number): InfoCard {
  return {
    icon: relic.icon,
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(relic.rare),
    title: relic.name,
    typeLine: "圣物  稀有 " + relic.rare,
    body: (relic.feature || " ") + "\n" + (owned > 0 ? "持有 " + owned : "未获得"),
  };
}

function bagTabTitle(tab: BagTab): string {
  if (tab === "equip") return "装备";
  if (tab === "shard") return "碎片";
  if (tab === "spirit") return "精灵";
  return "道具";
}

function showInfoCard(view: Node, spec: InfoCard): void {
  void loadPrefab(INFO_CARD).then(
    (prefab) => {
      if (!view.isValid) return;
      const old = view.getChildByName("InfoCard");
      if (old) old.destroy();
      const root = spawnPrefab(prefab, view);
      root.name = "InfoCard";
      root.setSiblingIndex(Math.max(0, view.children.length - 1));
      const close = () => {
        if (root.isValid) root.destroy();
      };
      bindDimClose(root, close);
      const card = root.getChildByName("card");
      if (!card) {
        GameLog.shared.warn("UI", "InfoCard 下没有 card");
        return;
      }
      const frame = card.getChildByName("spr_frame");
      if (frame) paintSprite(frame, spec.frame || "ui/bag/backpack_item-frame-1");
      const icon = card.getChildByName("spr_icon");
      if (icon) paintFirst(icon, [spec.icon, spec.fallback || "ui/bag/backpack_spr-default"]);
      const title = card.getChildByName("lbl_title");
      if (title) setText(title, spec.title);
      const kind = card.getChildByName("lbl_type");
      if (kind) setText(kind, spec.typeLine);
      const body = card.getChildByName("lbl_body");
      if (body) setText(body, spec.body || " ");
      const shut = card.getChildByName("btn_close");
      if (shut) {
        if (!shut.getComponent(Button)) shut.addComponent(Button);
        shut.on(Button.EventType.CLICK, close);
      } else GameLog.shared.warn("UI", "InfoCard 下没有 btn_close");
    },
    (err) => {
      GameLog.shared.warn("UI", "InfoCard 没有挂上 " + messageOf(err));
    }
  );
}

function currentStageIdx(): number {
  const shown = hangShownStage();
  return shown === null ? 1 : shown;
}
