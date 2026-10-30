/**
 * 开战左右出场光。帧在 ui/battle/battle-appear-left / right 的 0–14。
 * 锚点跟 BattlePage 的 LayerAppear 一样：左 (-180, 0)，右 (180, 0)。
 * 挂机壳上另播，不把 LayerAppear 整层抬上来。
 */

export const BATTLE_APPEAR_FRAME_COUNT = 15;

export const BATTLE_APPEAR_LEFT = { x: -180, y: 0 };
export const BATTLE_APPEAR_RIGHT = { x: 180, y: 0 };

export function battleAppearFramePaths(side: "left" | "right"): string[] {
  const stem = side === "left" ? "ui/battle/battle-appear-left_" : "ui/battle/battle-appear-right_";
  const out: string[] = [];
  for (let i = 0; i < BATTLE_APPEAR_FRAME_COUNT; i++) out.push(stem + String(i));
  return out;
}
