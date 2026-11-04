/**
 * 英雄列表和详情相对日服的窗口、页签和台词。
 * 名册数据由 HeroRosterModel 持有；这里只放布局常量和台词展示。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
import { plainTalk } from "../../battle/ui/idleHangTalkPlan";

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

/** 四列头像滚动区域延伸到容量栏上方；静态尺寸与 HeroListBoardView.prefab 一致。 */
export const HERO_PORT_H = 720;

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

/** 从统一配置选择当前等级首条台词，未准备的详情配置不触发隐式加载。 */
export function heroDetailTalk(level: number | null): string {
    if (GameConfig.instance.status(GConfig.HeroTalk).state !== "ready") return "";
    const row = GameConfig.instance.getConfig(GConfig.HeroTalk).find(row => (level || 1) >= row.level_min && (level || 1) <= row.level_max);
    if (!row) return "";
    const word = GameConfig.instance.status(GConfig.Language).state === "ready" ? GameConfig.instance.getConfig(GConfig.Language, row.lan)?.value : undefined;
    return plainTalk(word || row.note || "");
}
