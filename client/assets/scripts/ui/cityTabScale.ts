/**
 * 日服底栏是 UIMenuItemScale：点中的那一格放大，其余回到原大。
 * 96/78 是预制里战斗格相对其它格的尺寸。选中态用这个倍数，不再把战斗格做死成 96。
 */
export const TAB_REST_SIZE = 78;
export const TAB_SELECTED_SIZE = 117;
export const TAB_SELECTED_SCALE = TAB_SELECTED_SIZE / TAB_REST_SIZE;

export function tabVisualScale(selected: boolean): number {
  return selected ? TAB_SELECTED_SCALE : 1;
}

/** MainSceneCtr: seven cells share 90% of the width; checked cell uses 1.5x. */
export function cityTabLayout(width: number, index: number, selected: boolean) {
  const step = width * 0.9 / 7;
  const scale = step / TAB_REST_SIZE * tabVisualScale(selected);
  return { x: -width * 0.45 + step * (index + 0.3125),
    y: 13 + (selected ? step * 0.25 : 0), scale };
}

/**
 * 一帧里只留最后一格 selected。其余 selected 收成 open，locked 不动。
 * 英雄还在导航根上、当前页又是背包时，两边都会被标成 selected，两键一起放大。
 */
export function tabPaintState(states: string[]): string[] {
  let chosen = -1;
  for (let i = 0; i < states.length; i++) {
    if (states[i] === "selected") chosen = i;
  }
  const out: string[] = [];
  for (let i = 0; i < states.length; i++) {
    if (states[i] === "selected" && i !== chosen) out.push("open");
    else out.push(states[i]);
  }
  return out;
}
