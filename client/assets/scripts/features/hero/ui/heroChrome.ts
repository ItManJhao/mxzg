/**
 * 英雄列表和详情相对日服的窗口、页签和台词。
 * 格子数据仍在 module/hero。这里只放界面上要对齐的数。
 */
import { ConfigDb } from "../../../config/ConfigLoader";
import { plainTalk, pickHeroTalkLan, readHeroTalkRows } from "../../../ui/idleHangTalkPlan";

/** ccbi 页签原文。按钮只有约 111×43，运行时把字收进按钮，不改这句。 */
export const HERO_TAB_HERO = "英  雄";
export const HERO_TAB_BOOK = "图  鉴";
export const HERO_TAB_DRAGON = "圣 龙";

/** 详情底栏。绿钮、橙钮、蓝钮上 ccbi 是空字，日服画面要有这几句。 */
export const HERO_DETAIL_WEAR = "穿上";
export const HERO_DETAIL_OFF = "卸下";
export const HERO_DETAIL_GRADE = "升级";
export const HERO_DETAIL_SETTING = "设置";
export const HERO_DETAIL_UNFOLD = "展开";
export const HERO_DETAIL_BOOK = "图鉴";

/**
 * 格子 96×104，中心从 -52 起，行距 112。
 * 第 4 行中心在 388。视口顶锚点切到这里，露出 3 行再加半行。
 */
export const HERO_PORT_H = 52 + 3 * 112;

/** 顶栏下沿、底栏上沿。羊皮纸贴在这两条之间，不把九宫格再乘一层放大。 */
export const HERO_WINDOW_TOP = 482;
export const HERO_WINDOW_BOTTOM = -499;

export interface HeroParchmentSeat {
  centerY: number;
  height: number;
  top: number;
  bottom: number;
  extraTop: number;
  extraBottom: number;
}

/**
 * 羊皮纸中心锚点。rootScreenY 是列表根在画面上的 y（底左锚点）。
 * 算出贴住主城中部之后的中心、高度，以及相对当前纸要上抬、下延多少。
 */
export function seatHeroParchment(
  currentCenterY: number,
  currentH: number,
  rootScreenY: number,
  scale: number
): HeroParchmentSeat {
  const s = scale > 0.01 ? scale : 1;
  const bottom = (HERO_WINDOW_BOTTOM - rootScreenY) / s;
  const top = (HERO_WINDOW_TOP - rootScreenY) / s;
  const height = currentH > 1 ? Math.max(currentH, top - bottom) : top - bottom;
  const centerY = bottom + height / 2;
  const oldTop = currentCenterY + currentH / 2;
  const oldBottom = currentCenterY - currentH / 2;
  return {
    centerY,
    height,
    top: bottom + height,
    bottom,
    extraTop: top - oldTop,
    extraBottom: oldBottom - bottom,
  };
}

/** 详情台词。herotalk 按等级取第一句，language 对上就用那句，否则用表里的 note。 */
export function heroDetailTalk(level: number | null): string {
  const db = ConfigDb.current;
  const talkFile = db ? db.tables.get("herotalk") : null;
  const rows = readHeroTalkRows(talkFile || null);
  if (rows.length === 0) return "";
  const lan = pickHeroTalkLan(rows, level, 0);
  const fromLan = lan === null ? "" : languageLine(lan);
  if (fromLan) return fromLan;
  return noteOf(talkFile, lan);
}

function languageLine(lan: number): string {
  const db = ConfigDb.current;
  const file = db ? db.tables.get("language") : null;
  const list = file && Array.isArray(file.rows) ? file.rows : [];
  const key = String(lan);
  for (let i = 0; i < list.length; i++) {
    const row = list[i] as { key?: unknown; value?: unknown } | null;
    if (!row || row.key === undefined || row.key === null) continue;
    if (String(row.key) !== key) continue;
    return plainTalk(typeof row.value === "string" ? row.value : "");
  }
  return "";
}

function noteOf(file: { rows?: unknown } | null | undefined, lan: number | null): string {
  const list = file && Array.isArray(file.rows) ? file.rows : [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i] as { lan?: unknown; note?: unknown } | null;
    if (!row) continue;
    if (lan !== null && String(row.lan) !== String(lan)) continue;
    if (typeof row.note === "string" && row.note.trim()) return row.note.trim();
  }
  return "";
}
