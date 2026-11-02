/** 背包协议条目与显示投影类型；API 和 Model 共用整批校验，显示可见性不改变服务器库存。 */
import type { BagTabKind } from "./BagTabKind";

/** Absolute quantities from the inventory protocol, independent of any network adapter. */
export interface BagItemData {
    readonly itemId: number;
    readonly quantity: number;
}

export interface BagItemDelta {
    readonly itemId: number;
    readonly delta: number;
}

/** Shared by the API boundary and Model; validate and copy before committing data. */
export function readBagItems(value: unknown): readonly BagItemData[] {
    if (!Array.isArray(value)) throw new Error("背包数据无效");
    const seen = new Set<number>();
    const rows = value.map(item => {
        if (!item || typeof item !== "object" || !Number.isSafeInteger(item.itemId) || item.itemId <= 0 ||
            !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || seen.has(item.itemId)) {
            throw new Error("背包条目无效");
        }
        seen.add(item.itemId);
        return Object.freeze({ itemId: item.itemId as number, quantity: item.quantity as number });
    });
    return Object.freeze(rows);
}

export interface BagFace {
  title: string;
  typeLine: string;
  body: string;
  icon: string;
  fallback: string;
  frame: string;
}

export interface BagItemDisplayData extends BagFace {
    readonly category: BagTabKind;
    /** 源配置 place=0 时仅隐藏背包格子，不丢弃库存条目或结算奖励。 */
    readonly hiddenInBag: boolean;
}
