/**
 * 挂机底栏上沿：金环不要被掉落堆盖住，四条进度按原图高度填，战斗钮播已有光。
 * 坐标来自 BattlePanelLayer（640×1280、锚点底左）和 seatAboveChrome 的底栏让位。
 * 不猜主城云、effect 6 / 15，也不把 btn-scale-battle 蓝核放进金环。
 */
import { CITY_BAR_BOTTOM, CITY_VIEW_H } from "./cityMapLayout";

/** Prefab 根。centerInParent 把底左角放到画面中心左下。 */
export const HANG_PANEL_W = 640;
export const HANG_PANEL_H = 1280;

/** 奶油板。子坐标相对板心。 */
export const HANG_PLATE = { x: 320, y: 91, w: 640, h: 369 };

/** 金环水晶 main-scene_spr-map-frame-1，162×162，板内 (1, 87.5)。 */
export const HANG_CRYSTAL = { x: 1, y: 87.5, w: 162, h: 162 };

/**
 * res-block 骨架高 202.48。挂机宿主缩放 0.42。
 * 图标堆比骨架中心高 28，计时泡再高 80，这是原来三件的相对位置，只改整组的高度。
 */
export const HANG_LOOT_SPINE_SCALE = 0.42;
export const HANG_LOOT_SPINE_H = 202.48;
export const HANG_LOOT_GAP = 16;
export const HANG_LOOT_ICON_ABOVE_SPINE = 28;
export const HANG_LOOT_BUBBLE_ABOVE_SPINE = 80;
/** 气泡尾巴在左边，中心仍偏到堆的右侧。只改高度。 */
export const HANG_LOOT_BUBBLE_X = 48;

/** 槽是 166×36。AFK 填充原图 158×28，正好嵌进槽。其余条用同一宽度。 */
export const HANG_BAR_FILL_W = 158;

const HANG_BAR_FILL_H: { [art: string]: number } = {
  "ui/city/main-scene_progress-AFK": 28,
  "ui/city/main-scene_progress-hangs": 24,
  "ui/city/main-scene_progress-exp": 24,
  "ui/city/main-scene_progress-role-exp": 4,
};

/** effect2.eff_battle_layer_battle。speed 和开战帧一样是 0.01 秒。帧是 0–9。 */
export const HANG_BATTLE_GLOW_SPEED = 24;
export const HANG_BATTLE_GLOW_COUNT = 10;
export const HANG_BATTLE_GLOW_STEM = "ui/city/main-scene-effect_btn-battle-";

/** 底栏让位之后，面板根的 y。和 centerInParent + seatAboveChrome 同一套数。 */
export function hangPanelRootY(): number {
  const centered = -(0.5 - 0) * HANG_PANEL_H;
  const bottom = centered;
  const limit = -CITY_VIEW_H / 2 + CITY_BAR_BOTTOM;
  const lift = bottom < limit ? limit - bottom : 0;
  return centered + lift;
}

/** 金环顶边，画面中心系。 */
export function hangCrystalTopY(): number {
  return hangPanelRootY() + HANG_PLATE.y + HANG_CRYSTAL.y + HANG_CRYSTAL.h / 2;
}

/** res-block 中心。底边离开金环顶 HANG_LOOT_GAP。 */
export function hangLootSpineY(): number {
  const half = (HANG_LOOT_SPINE_H * HANG_LOOT_SPINE_SCALE) / 2;
  return Math.round(hangCrystalTopY() + half + HANG_LOOT_GAP);
}

export function hangLootIconY(): number {
  return hangLootSpineY() + HANG_LOOT_ICON_ABOVE_SPINE;
}

export function hangLootBubbleY(): number {
  return hangLootSpineY() + HANG_LOOT_BUBBLE_ABOVE_SPINE;
}

/** 进度填充盒子。角色经验原图只有 4 像素高，不能拉成一条色带。 */
export function hangBarFillBox(art: string): { w: number; h: number } {
  const height = HANG_BAR_FILL_H[art];
  return { w: HANG_BAR_FILL_W, h: height || 24 };
}

export function hangBattleGlowPaths(): string[] {
  const out: string[] = [];
  for (let i = 0; i < HANG_BATTLE_GLOW_COUNT; i++) out.push(HANG_BATTLE_GLOW_STEM + String(i));
  return out;
}

/** effect2 speed × 10 毫秒。读不到正数时用表上的 24。 */
export function hangBattleGlowStepMs(speed: number): number {
  const value = isFinite(speed) && speed > 0 ? speed : HANG_BATTLE_GLOW_SPEED;
  const ms = Math.floor(value * 10);
  return ms < 16 ? 16 : ms;
}
