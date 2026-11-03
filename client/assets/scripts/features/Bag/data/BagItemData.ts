/** 背包协议条目与显示投影类型；应用入口、Controller 和 Model 共用整批校验，显示可见性不改变服务器库存。 */
import type { BagTabKind } from "./BagTabKind";

/** 服务器库存条目，使用绝对数量；当前按物品配置 ID 聚合。 */
export interface BagItemData {
    /** 当前协议的物品配置 ID，尚非旧版独立装备实例 ID。 */
    readonly itemId: number;
    /** 服务器确认的绝对持有数量，必须为正安全整数；数量为零时从列表移除。 */
    readonly quantity: number;
}

/** 预留的本地增量计算类型，当前服务端同步采用完整快照，不从此入口发奖。 */
export interface BagItemDelta {
    /** 当前协议的物品配置 ID，尚非旧版独立装备实例 ID。 */
    readonly itemId: number;
    /** 数量差值，正数增加、负数扣除。 */
    readonly delta: number;
}

/** 校验并复制完整库存，拒绝重复 ID、非正数和不安全整数；全部成功才返回冻结列表，空数组有效，错误时抛出异常。 */
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

/** 页面格子与详情共用的配置显示数据，不持有服务器资产。 */
export interface BagFace {
  /** 本地化物品名称。 */
  title: string;
  /** 详情副标题，目前显示数量。 */
  typeLine: string;
  /** 移除旧富文本标记后的配置说明。 */
  body: string;
  /** 登记在资源目录中的物品图标路径。 */
  icon: string;
  /** 主图加载失败时使用的占位图路径。 */
  fallback: string;
  /** 稀有度对应的底框资源路径。 */
  frame: string;
}

/** 静态显示数据附加分类与可见性，隐藏不等于删除库存。 */
export interface BagItemDisplayData extends BagFace {
    /** 由旧配置 place 映射的分类，不决定物品使用规则。 */
    readonly category: BagTabKind;
    /** 源配置 place=0 时仅隐藏背包格子，不丢弃库存条目或结算奖励。 */
    readonly hiddenInBag: boolean;
}
