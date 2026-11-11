/**
 * 英雄列表的格子展示类型与提示文案；布局由 Prefab 的 SuperContent 保存。
 * HeroRosterUtils 提供当前角色数据；本文件不访问网络、旧名册或本地模拟状态。
 */
export const HERO_ELEM_COUNT = 6;
export const HERO_FACE_FALLBACK = "hero/ui/hero-icon_spr-default";
export const HERO_LIST_UNCONFIGURED = "这一页还没有配置";

export type HeroListTab = "hero" | "book";
export type HeroCellKind = "empty" | "owned" | "locked";

export interface HeroCellModel {
    readonly instanceId?: string;
    kind: HeroCellKind;
    name: string;
    showName: boolean;
    face: string | null;
    elem: number | null;
    stars: number;
    level: number | null;
    /** 已拥有英雄的自身锁定；未获得图鉴使用 kind=locked 区分。 */
    locked: boolean;
    /** 当前英雄位于服务器主线阵容。 */
    deployed: boolean;
}

export interface HeroListModel {
    synced: boolean;
    mode: "roster" | "book";
    capacityLine: string;
    cells: HeroCellModel[];
    emptyText: string;
}

/** 点格子时给玩家看的一句。锁着的是表里的名字，不是造出来的英雄。 */
/** 生成英雄格子的名称和等级提示；空格返回空文本。 */
export function heroCellLine(cell: HeroCellModel): string {
    if (cell.kind === "empty") return "";
    const name = cell.name || "英雄";
    if (cell.kind === "locked") return name + "未获得";
    if (cell.level === null) return name;
    return name + " Lv" + cell.level;
}
