/**
 * 背包页签、空槽数量和空列表提示。
 * 由 BagView 使用；库存唯一所有者为 BagModel，本文件不保存数量或处理道具使用。
 */
import type { BagTabKind } from "../data/BagTabKind";

/** 最少显示 20 个槽位，包括空槽；不是服务器容量上限。 */
const BAG_MIN_SLOTS = 20;
/** 展示数量按每批 4 格向上补齐。 */
const BAG_SLOT_BATCH = 4;

/** 背包页签的固定显示顺序及文案。 */
export const BAG_TABS: {
  /** 页签分类键，与配置投影和筛选条件一致。 */
  id: BagTabKind;
  /** 分类页签的中文标题。 */
  title: string;
}[] = [
  { id: "equip", title: "装备" },
  { id: "item", title: "道具" },
  { id: "shard", title: "碎片" },
  { id: "spirit", title: "精灵" },
];

/** 按既定规则返回至少 20 个、以四格补齐的背包展示槽数量。 */
export function bagSlotCount(count: number): number {
  return Math.ceil(Math.max(count, BAG_MIN_SLOTS) / BAG_SLOT_BATCH) * BAG_SLOT_BATCH;
}

/** 返回当前背包为空时的提示，不推断库存同步状态。 */
export function emptyBagToast(): string { return '背包是空的'; }
