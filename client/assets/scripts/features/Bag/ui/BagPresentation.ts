/**
 * 背包页签、空槽数量和空列表提示。
 * 由 BagView 使用；库存唯一所有者为 BagModel，本文件不保存数量或处理道具使用。
 */
import type { BagTabKind } from "../data/BagTabKind";

const BAG_MIN_SLOTS = 20;
const BAG_SLOT_BATCH = 4;

export const BAG_TABS: { id: BagTabKind; title: string }[] = [
  { id: "equip", title: "装备" },
  { id: "item", title: "道具" },
  { id: "shard", title: "碎片" },
  { id: "spirit", title: "精灵" },
];

/** Empty-slot policy: at least 20 entries, padded in batches of four. No geometry here. */
/** 按既定规则返回至少 20 个、以四格补齐的背包展示槽数量。 */
export function bagSlotCount(count: number): number {
  return Math.ceil(Math.max(count, BAG_MIN_SLOTS) / BAG_SLOT_BATCH) * BAG_SLOT_BATCH;
}

/** 返回当前背包为空时的提示，不推断库存同步状态。 */
export function emptyBagToast(): string { return '背包是空的'; }
