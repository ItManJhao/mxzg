/**
 * 英雄列表的格子展示类型与默认头像；布局由Prefab的SuperContent保存。
 * HeroRosterUtils 提供当前角色数据；本文件不访问网络、旧名册或本地模拟状态。
 */
import type { HeroIllustrationEntry } from "../utils/HeroIllustrationUtils";

/** 动态头像缺失时使用的英雄模块默认图片。 */
export const HERO_FACE_FALLBACK = "hero/ui/hero-icon_spr-default";

export type HeroCellKind = "empty" | "owned" | "catalog" | "locked";

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

/** 滚动格把当前图鉴配置行交回列表，翻页沿列表顺序。 */
export type HeroIllustrationCellModel = HeroCellModel & { readonly illustration: HeroIllustrationEntry };

/** 将图鉴模板映射为共用头像格需要的只读字段。 */
export class HeroListPresentation {
    /** 本类只提供无状态投影。 */
    private constructor() {}

    /** 未解锁模板灰显头像但仍可点开，不伪造持有实例、上阵或锁定角标。 */
    public static illustrationCell(entry: HeroIllustrationEntry): HeroIllustrationCellModel {
        return {
            kind: entry.unlocked ? "catalog" : "locked",
            name: entry.name,
            showName: false,
            face: entry.face,
            elem: entry.elem,
            stars: entry.stars,
            level: entry.level,
            locked: false,
            deployed: false,
            illustration: entry,
        };
    }
}
