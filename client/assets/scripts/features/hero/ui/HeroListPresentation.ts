/**
 * 英雄列表的格子展示类型和布局计算。
 * HeroRosterPresentation 提供当前角色数据；本文件不访问网络、旧名册或本地模拟状态。
 */
export const HERO_LIST_COLS = 4;
export const HERO_LIST_PITCH_X = 108;
export const HERO_LIST_PITCH_Y = 112;
export const HERO_LIST_ORIGIN_X = -162;
export const HERO_LIST_ORIGIN_Y = -52;
export const HERO_ELEM_COUNT = 6;
export const HERO_FACE_FALLBACK = ResourceCatalog.hero.hero_icon_spr_default.path;
export const HERO_LIST_UNCONFIGURED = "这一页还没有配置";

export type HeroListTab = "hero" | "book";
export type HeroCellKind = "empty" | "owned" | "locked";

export interface HeroCellModel {
  kind: HeroCellKind;
  name: string;
  showName: boolean;
  face: string | null;
  elem: number | null;
  stars: number;
  level: number | null;
  locked: boolean;
  deployed: boolean;
}

export interface HeroListModel {
  synced: boolean;
  mode: "roster" | "book";
  capacityLine: string;
  cells: HeroCellModel[];
  emptyText: string;
  contentFloor: number;
}

/** 点格子时给玩家看的一句。锁着的是表里的名字，不是造出来的英雄。 */
/** 生成英雄格子的名称和等级提示；空格返回空文本。 */
export function heroCellLine(cell: HeroCellModel): string {
  if (cell.kind === "empty") return "";
  const name = cell.name || "英雄";
  if (cell.kind === "locked" || cell.locked) return name + "未获得";
  if (cell.level === null) return name;
  return name + " Lv" + cell.level;
}

/** 按既定四列间距计算格子坐标，单位为设计像素。 */
export function heroCellSeat(index: number): { x: number; y: number } {
  return {
    x: HERO_LIST_ORIGIN_X + (index % HERO_LIST_COLS) * HERO_LIST_PITCH_X,
    y: HERO_LIST_ORIGIN_Y - Math.floor(index / HERO_LIST_COLS) * HERO_LIST_PITCH_Y,
  };
}

/** 按格子数量计算内容高度，保留既有最小展示高度。 */
export function heroContentHeight(cellCount: number, floor: number): number {
  const rows = cellCount <= 0 ? 4 : Math.max(4, Math.ceil(cellCount / HERO_LIST_COLS));
  return Math.max(floor, rows * HERO_LIST_PITCH_Y + 20);
}
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
