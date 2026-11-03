/** 背包协议条目与显示投影类型；应用入口、Controller 和 Model 共用整批校验，显示可见性不改变服务器库存。 */
import type { BagTabKind } from "./BagTabKind";

/** 服务器库存条目，使用绝对数量；当前按物品配置 ID 聚合。 */
export interface BagItemData {
    /** 当前协议的物品配置 ID，尚非旧版独立装备实例 ID。 */
    readonly itemId: number;
    /** 稳定库存记录 ID，字符串保留精度；旧快照可缺失，不能由配置 ID 冒充。 */
    readonly instanceId?: string;
    /** 服务器确认的绝对持有数量，必须为正安全整数；数量为零时从列表移除。 */
    readonly quantity: number;
}

/** 校验并复制完整库存，拒绝重复 ID、非正数和不安全整数；全部成功才返回冻结列表，空数组有效，错误时抛出异常。 */
export function readBagItems(value: unknown): readonly BagItemData[] {
    if (!Array.isArray(value)) throw new Error("背包数据无效");
    const seen = new Set<number>();
    const instances = new Set<string>();
    const rows = value.map(item => {
        if (!item || typeof item !== "object" || !Number.isSafeInteger(item.itemId) || item.itemId <= 0 ||
            !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || seen.has(item.itemId)) {
            throw new Error("背包条目无效");
        }
        if (item.instanceId !== undefined) {
            if (typeof item.instanceId !== "string" || !item.instanceId.length || item.instanceId.length > 96 || instances.has(item.instanceId)) throw new Error("库存实例 ID 无效");
            instances.add(item.instanceId);
        }
        seen.add(item.itemId);
        return Object.freeze({ itemId: item.itemId as number, quantity: item.quantity as number, ...(item.instanceId === undefined ? {} : { instanceId: item.instanceId as string }) });
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

/** 期限物品每件独立，不与同配置堆叠库存合并；时间单位均为 Unix 秒。 */
export interface BagTimedItem {
    /** 服务端持久实例 ID，不转为 number。 */
    readonly instanceId: string;
    /** Item 配置 ID，用于显示名称和图标。 */
    readonly itemId: number;
    /** 服务器记录的激活时刻。 */
    readonly activeAtSeconds: number;
    /** 到达该秒即过期，回收由服务端负责。 */
    readonly expiresAtSeconds: number;
}
/** 整批校验期限快照，不合并同配置的不同实例；缺失字段代表旧协议未提供此类数据。 */
export function readTimedItems(value: unknown): readonly BagTimedItem[] {
    if (value === undefined) return Object.freeze([]);
    const state = value as { items: unknown; serverTimeSeconds: number };
    if (!state || !Number.isSafeInteger(state.serverTimeSeconds) || state.serverTimeSeconds < 0 || !Array.isArray(state.items)) throw new Error("期限库存无效");
    const seen = new Set<string>();
    return Object.freeze(state.items.map(item => {
        if (!item || typeof item.instanceId !== "string" || !item.instanceId.length || item.instanceId.length > 96 || seen.has(item.instanceId) ||
            !Number.isSafeInteger(item.itemId) || item.itemId <= 0 || !Number.isSafeInteger(item.activeAtSeconds) || item.activeAtSeconds < 0 ||
            !Number.isSafeInteger(item.expiresAtSeconds) || item.expiresAtSeconds < item.activeAtSeconds || item.expiresAtSeconds <= state.serverTimeSeconds) throw new Error("期限物品无效");
        seen.add(item.instanceId);
        return Object.freeze({ instanceId:item.instanceId, itemId:item.itemId, activeAtSeconds:item.activeAtSeconds, expiresAtSeconds:item.expiresAtSeconds });
    }));
}

/** 格子的只读显示投影；期限物品数量固定为一，以 key 区分同配置不同实例。 */
export interface BagListItem extends BagItemData {
    /** 普通堆叠与期限实例各自命名空间中的稳定选中键。 */
    readonly key: string;
    /** 仅期限实例具有 Unix 秒到期值，不由配置天数重新计算。 */
    readonly expiresAtSeconds?: number;
}
