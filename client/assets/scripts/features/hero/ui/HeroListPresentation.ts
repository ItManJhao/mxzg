/**
 * 英雄列表的格子展示类型与默认头像；布局由Prefab的SuperContent保存。
 * HeroRosterUtils 提供当前角色数据；本文件不访问网络、旧名册或本地模拟状态。
 */
/** 动态头像缺失时使用的英雄模块默认图片。 */
export const HERO_FACE_FALLBACK = "hero/ui/hero-icon_spr-default";

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
