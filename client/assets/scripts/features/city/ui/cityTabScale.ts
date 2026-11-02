/**
 * 主城底栏显示规则，由 CityChrome 的导航适配调用；选中项使用 117/78 的放大比例。
 * 按视口分配按钮间距，图标最大保持 640 设计宽度下的大小，不持有页面或玩家状态。
 */
export const TAB_REST_SIZE = 78;
export const TAB_SELECTED_SIZE = 117;
export const TAB_SELECTED_SCALE = TAB_SELECTED_SIZE / TAB_REST_SIZE;

export function tabVisualScale(selected: boolean): number {
  return selected ? TAB_SELECTED_SCALE : 1;
}

/** 七个按钮分布在视口宽度的 90% 内；宽屏只增加间距，不继续放大图标遮挡页面操作。 */
export function cityTabLayout(width: number, index: number, selected: boolean) {
  const step = width * 0.9 / 7;
  const visualStep = Math.min(width, 640) * 0.9 / 7;
  const scale = visualStep / TAB_REST_SIZE * tabVisualScale(selected);
  return { x: -width * 0.45 + step * (index + 0.3125),
    y: 13 + (selected ? visualStep * 0.25 : 0), scale };
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
