/**
 * 新挂机底栏的日服装饰。宝箱闪光、金环垫色和缩放光、四条原图填充、掉落堆。
 * 不改关卡字、不改收益句子，也不走 dressHangPanel（那条会藏关号并把字缩成 16）。
 * 节点只在这一个文件里按名字取。BattleHangView 自己不搜树。
 */
import { Color, Node, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { chapterDrops, chapterIdleMinute, idleCapMs } from "../../../config/rosterCatalog";
import { itemIconResource } from "../../../config/gameCatalog";
import { GameLog } from "../../../core/GameLog";
import { GameStore } from "../../../core/GameStore";
import { IDLE_UNIX_FLOOR, wireIdleCapMs, wireIdleElapsedMs } from "../../../net/protocol/wireIdle";
import { hangBarFillBox, hangBattleGlowPaths, hangBattleGlowStepMs, HANG_BATTLE_GLOW_SPEED } from "../../../ui/hangChrome";
import { HangFace, hangShownStage } from "../model/hangFace";
import { paintIdleLoot, seatHangTimer } from "../../../ui/idleHangView";
import { assignContentSize } from "../../../ui/visibleFit";
import { createRect, place, uiNode } from "../../../ui/UiKit";

const COIN_ICON = "ui/common/res-icon_res-1";
const GEM_ICON = "ui/common/res-icon_res-2";
const CHEST_ICON = "ui/city/main-scene_spr-box-2";
const MOON_ICON = "ui/bag/backpack_900101";
const ROLE_ICON = "ui/bag/backpack_900003";
const RING_FX = "ui/city/main-scene-effect_btn-scale-battle-";
const BOX_FX = "ui/box-effect/box-effect_box-unopen-";
const CREAM = new Color(249, 233, 211, 255);

let ringMiss = false;
let boxMiss = false;
let glowMiss = false;

/** 底栏已经在预制上。这里补日服那一层光、填充和掉落。缺板时什么都不做。 */
export function dressHangChrome(panel: Node, face: HangFace): void {
  if (!panel || !panel.isValid) return;
  const plate = panel.getChildByName("CCSprite_1");
  if (!plate) return;
  const frame = plate.getChildByName("CCSprite_1");
  if (frame) {
    frame.active = true;
    seatCrystalFill(frame);
    loopSprite(frame, "HangRingFx", framePaths(RING_FX), 120, 80, () => noteOnce("ring"));
  }
  const mission = plate.getChildByName("lbl_mission_name");
  if (mission) mission.setSiblingIndex(Math.max(0, plate.children.length - 1));
  seatChest(plate);
  seatFill(plate, "spr_progress_AFK_bg", "ui/city/main-scene_progress-AFK", timeRatio());
  seatFill(plate, "CCSprite_4", "ui/city/main-scene_progress-hangs", face.gold === "—/m" ? 0 : 1);
  seatFill(plate, "CCSprite_3", "ui/city/main-scene_progress-exp", face.souls === "—/m" ? 0 : 1);
  seatFill(plate, "CCSprite_2", "ui/city/main-scene_progress-role-exp", face.exp === "—/m" ? 0 : 1);
  const battle = findBattleButton(panel, plate);
  if (battle) loopSprite(battle, "BattleGlow", hangBattleGlowPaths(), 224, hangBattleGlowStepMs(HANG_BATTLE_GLOW_SPEED), () => noteOnce("glow"), 102);
  const hang = panel.parent ? panel.parent.getChildByName("IdleHang") : null;
  if (hang) paintIdleLoot(hang, lootIcons(face));
  const bubble = plate.getChildByName("node_bubble");
  if (bubble && hang) seatHangTimer(hang, bubble);
}

function findBattleButton(panel: Node, plate: Node): Node | null {
  const menu = plate.getChildByName("menu");
  if (menu) {
    const local = menu.getChildByName("btn_battle");
    if (local) return local;
  }
  const shell = panel.parent;
  if (!shell) return null;
  return shell.getChildByName("btn_battle");
}

/** CCBI spr_box：(-253, 75.5)，44×44，main-scene_spr-box-2。不混进金币宝石堆。 */
function seatChest(plate: Node): void {
  let box = plate.getChildByName("spr_box");
  if (!box) {
    box = uiNode("spr_box");
    const created = box.addComponent(UITransform);
    assignContentSize(created, 44, 44);
    created.setAnchorPoint(0.5, 0.5);
    const image = box.addComponent(Sprite);
    image.sizeMode = Sprite.SizeMode.CUSTOM;
    image.type = Sprite.Type.SIMPLE;
    try {
      place(box, plate, -253, 75.5);
    } catch (_err) {
      if (box.isValid) box.destroy();
      return;
    }
  }
  box.active = true;
  box.setPosition(-253, 75.5, 0);
  const ui = box.getComponent(UITransform);
  if (ui) {
    ui.setAnchorPoint(0.5, 0.5);
    assignContentSize(ui, 44, 44);
  }
  const sprite = box.getComponent(Sprite) || box.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  const node = box;
  try {
    resources.load(CHEST_ICON + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (!node.isValid || err || !asset) return;
      const image = node.getComponent(Sprite);
      if (!image) return;
      image.spriteFrame = asset;
      image.sizeMode = Sprite.SizeMode.CUSTOM;
    });
  } catch (_err) {
    /* 宝箱图没挂上时节点还在。 */
  }
  box.setSiblingIndex(Math.max(0, plate.children.length - 1));
  const mission = plate.getChildByName("lbl_mission_name");
  if (mission) mission.setSiblingIndex(Math.max(0, plate.children.length - 1));
  loopSprite(box, "HangBoxFx", framePaths(BOX_FX), 56, 60, () => noteOnce("box"));
}

function seatCrystalFill(frame: Node): void {
  const parent = frame.parent;
  if (!parent || parent.getChildByName("HangCrystalFill")) return;
  const ui = frame.getComponent(UITransform);
  const w = ui && ui.contentSize.width > 8 ? ui.contentSize.width : 162;
  const h = ui && ui.contentSize.height > 8 ? ui.contentSize.height : 162;
  const fill = createRect("HangCrystalFill", w, h, CREAM);
  const index = frame.getSiblingIndex();
  fill.parent = parent;
  fill.setPosition(frame.position.x, frame.position.y, frame.position.z);
  fill.setSiblingIndex(index);
}

function seatFill(plate: Node, barName: string, art: string, ratio: number): void {
  const bar = plate.getChildByName(barName);
  if (!bar) return;
  let fill = bar.getChildByName("HangFill");
  if (!fill) {
    const box = hangBarFillBox(art);
    fill = uiNode("HangFill");
    const ui = fill.addComponent(UITransform);
    assignContentSize(ui, box.w, box.h);
    const image = fill.addComponent(Sprite);
    image.sizeMode = Sprite.SizeMode.CUSTOM;
    image.type = Sprite.Type.SIMPLE;
    try {
      place(fill, bar, 0, 0);
    } catch (_err) {
      if (fill.isValid) fill.destroy();
      return;
    }
    const node = fill;
    try {
      resources.load(art + "/spriteFrame", SpriteFrame, (err, asset) => {
        if (!node.isValid || err || !asset) return;
        const sprite = node.getComponent(Sprite);
        if (!sprite) return;
        try {
          sprite.spriteFrame = asset;
          sprite.type = Sprite.Type.FILLED;
          sprite.fillType = Sprite.FillType.HORIZONTAL;
          sprite.fillStart = 0;
          const span = (node as Node & { mxzgRatio?: number }).mxzgRatio || 0;
          sprite.fillRange = span;
        } catch (_paint) {
          sprite.type = Sprite.Type.SIMPLE;
        }
      });
    } catch (_err) {
      /* 填充图没挂上时槽还在。 */
    }
  }
  const mark = fill as Node & { mxzgRatio?: number };
  mark.mxzgRatio = ratio <= 0 ? 0 : Math.min(1, ratio);
  const sprite = fill.getComponent(Sprite);
  if (sprite && sprite.type === Sprite.Type.FILLED) {
    try {
      sprite.fillRange = mark.mxzgRatio;
    } catch (_err) {
      /* 贴图还没好时下一拍再填。 */
    }
  }
  fill.active = mark.mxzgRatio > 0;
}

function timeRatio(): number {
  const idle = GameStore.idle();
  if (idle.fromStore && (idle.rewardTime === null || !isFinite(idle.rewardTime) || idle.rewardTime < IDLE_UNIX_FLOOR)) {
    return 0;
  }
  const now = Date.now();
  let elapsed = 0;
  if (idle.fromStore) elapsed = wireIdleElapsedMs(idle.rewardTime, now);
  else if (idle.anchorMs !== null && idle.anchorMs >= 1e9) elapsed = Math.max(0, now - idle.anchorMs);
  else return 0;
  const cap = idle.fromStore ? wireIdleCapMs(idle.maxRewardTime, idleCapMs()) : idleCapMs();
  if (cap === null || cap <= 0) return elapsed > 0 ? 1 : 0;
  if (elapsed > cap) elapsed = cap;
  return elapsed / cap;
}

function lootIcons(face: HangFace): string[] {
  const shown = hangShownStage();
  const idx = shown === null ? 1 : shown;
  const minute = chapterIdleMinute(idx);
  const hasTable = minute !== null;
  const goldOn = face.gold !== "—/m" && face.gold !== "";
  const soulsOn = face.souls !== "—/m" && face.souls !== "";
  const expOn = face.exp !== "—/m" && face.exp !== "";
  const drops = chapterDrops(idx);
  if (!hasTable && drops.length === 0 && !goldOn && !soulsOn) return [];
  const icons: string[] = [];
  if (goldOn || hasTable) icons.push(COIN_ICON, COIN_ICON, COIN_ICON, COIN_ICON);
  if (soulsOn || hasTable) icons.push(MOON_ICON, MOON_ICON);
  if (expOn || hasTable) icons.push(ROLE_ICON);
  icons.push(GEM_ICON, GEM_ICON);
  for (let i = 0; i < drops.length && icons.length < 8; i++) {
    const faceDrop = drops[i];
    icons.push(itemIconResource(faceDrop.itemType, null) || "ui/bag/backpack_" + faceDrop.itemType);
  }
  if (icons.length === 0) return [];
  const pile: string[] = [];
  for (let i = 0; i < 14; i++) pile.push(icons[i % icons.length]);
  return pile;
}

function framePaths(stem: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 10; i++) out.push(stem + String(i));
  return out;
}

function loopSprite(parent: Node, name: string, paths: string[], size: number, stepMs: number, onEmpty: () => void, height?: number): void {
  if (parent.getChildByName(name)) return;
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  assignContentSize(ui, size, height && height > 0 ? height : size);
  const image = node.addComponent(Sprite);
  image.sizeMode = Sprite.SizeMode.CUSTOM;
  image.type = Sprite.Type.SIMPLE;
  node.setPosition(0, 0, 0);
  try {
    node.parent = parent;
    if (name === "BattleGlow") node.setSiblingIndex(0);
  } catch (_err) {
    if (node.isValid) node.destroy();
    return;
  }
  const frames: SpriteFrame[] = [];
  let left = paths.length;
  let index = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };
  node.once(Node.EventType.NODE_DESTROYED, stop);
  const start = () => {
    if (!node.isValid) return;
    if (frames.length === 0) {
      onEmpty();
      node.active = false;
      return;
    }
    const tick = () => {
      if (!node.isValid) {
        stop();
        return;
      }
      try {
        image.spriteFrame = frames[index % frames.length];
      } catch (_err) {
        index += 1;
        return;
      }
      index += 1;
    };
    tick();
    timer = setInterval(tick, stepMs < 16 ? 16 : stepMs);
  };
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    try {
      resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
        left -= 1;
        if (!err && asset) frames.push(asset);
        if (left <= 0) start();
      });
    } catch (_err) {
      left -= 1;
      if (left <= 0) start();
    }
  }
}

function noteOnce(kind: "ring" | "box" | "glow"): void {
  if (kind === "ring") {
    if (ringMiss) return;
    ringMiss = true;
    GameLog.shared.warn("Mainline", "挂机圆环特效 main-scene-effect_btn-scale-battle 没有挂上，金环图仍在");
    return;
  }
  if (kind === "box") {
    if (boxMiss) return;
    boxMiss = true;
    GameLog.shared.warn("Mainline", "挂机宝箱闪光 box-unopen 没有挂上，宝箱图仍在");
    return;
  }
  if (glowMiss) return;
  glowMiss = true;
  GameLog.shared.warn("Mainline", "挂机战斗钮光 main-scene-effect_btn-battle 没有挂上，紫底仍在");
}
