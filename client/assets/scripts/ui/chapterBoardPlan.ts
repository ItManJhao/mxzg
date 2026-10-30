/**
 * 主线章节地图和通关奖励的位置，只取自现有图和 Prefab。
 * chapter.pos 是阵位号。这里不把它换成屏幕坐标。
 * 挂机金环上的缩略图仍藏着，不从这里放回去。
 */

/** ui/chapter/mapXX.jpg 的像素。chapter-world 缩略图是 128，不拿来当这张地图。 */
export const CHAPTER_MAP_W = 640;
export const CHAPTER_MAP_H = 1280;

/**
 * ChapterPreviewLayer 的关闭钮在 640×600 窗里，距右 73.889、距顶 35.47。
 * 地图高 1280，沿用同一边距。坐标相对地图中心。
 */
const PREVIEW_CLOSE_INSET_X = 640 - 566.111;
const PREVIEW_CLOSE_INSET_Y = 600 - 564.53;

/** ChapterPreviewLayer/btn_confirm 的 y。地图底边的关卡条用同一下边距，不是关卡点。 */
const PREVIEW_CONFIRM_BOTTOM = 60;

/** ChapterPreviewLayer 标题字心距窗口顶。 */
const PREVIEW_TITLE_FROM_TOP = 600 - 552.857;

/** ChapterRewardLayer/spr_box。 */
export const CHAPTER_REWARD_BOX_W = 570;
export const CHAPTER_REWARD_BOX_H = 720;

/** ChapterExtraRewardCell。 */
export const CHAPTER_EXTRA_CELL_W = 150;
export const CHAPTER_EXTRA_CELL_H = 180;

export function chapterMapResource(map: string | null | undefined): string | null {
  if (!map || !/^map\d{2}$/.test(map)) return null;
  return "ui/chapter/" + map;
}

/** 没有屏幕坐标。调用方不得用返回值去摆关卡点或 boss 脸。 */
export function chapterStageScreenPos(_pos: number | null | undefined): null {
  return null;
}

export function chapterMapCloseSeat(): { x: number; y: number } {
  return {
    x: CHAPTER_MAP_W / 2 - PREVIEW_CLOSE_INSET_X,
    y: CHAPTER_MAP_H / 2 - PREVIEW_CLOSE_INSET_Y,
  };
}

export function chapterMapRewardSeat(): { x: number; y: number } {
  const close = chapterMapCloseSeat();
  return { x: -close.x, y: close.y };
}

export function chapterMapTitleY(): number {
  return CHAPTER_MAP_H / 2 - PREVIEW_TITLE_FROM_TOP;
}

export function chapterMapStageStripY(): number {
  return -CHAPTER_MAP_H / 2 + PREVIEW_CONFIRM_BOTTOM;
}

/** chapter-reward-lang_1 … _5。表上的 tip_img 超出这五张就不换图。 */
export function extraRewardTipPath(tipImg: number | null | undefined): string | null {
  if (typeof tipImg !== "number" || !isFinite(tipImg)) return null;
  const n = Math.floor(tipImg);
  if (n < 1 || n > 5) return null;
  return "ui/chapter-reward-lang/chapter-reward-lang_" + n;
}

export function extraRewardProgress(cleared: number | null, gate: number): string {
  if (!isFinite(gate) || gate < 1) return "—/—";
  const goal = Math.floor(gate);
  if (cleared === null || !isFinite(cleared)) return "—/" + goal;
  let done = Math.floor(cleared);
  if (done < 0) done = 0;
  if (done > goal) done = goal;
  return done + "/" + goal;
}

/** 当前关是正在打的那一关。已通关数是它前面的关，没同步不写成 0。 */
export function mainlineClearedCount(stageIdx: number | null, synced: boolean): number | null {
  if (!synced || stageIdx === null || !isFinite(stageIdx) || stageIdx < 1) return null;
  const idx = Math.floor(stageIdx);
  return idx > 1 ? idx - 1 : 0;
}

export function fillRewardTip(text: string, gate: number): string {
  const plain = text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
  const goal = isFinite(gate) && gate >= 1 ? String(Math.floor(gate)) : "";
  return plain.replace(/%s/g, goal).trim();
}
