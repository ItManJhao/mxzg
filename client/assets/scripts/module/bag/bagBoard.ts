import type { BagTabKind } from "../../config/gameCatalog";

const BAG_MIN_SLOTS = 20;
const BAG_SLOT_BATCH = 4;

export const BAG_TABS: { id: BagTabKind; title: string }[] = [
  { id: "equip", title: "装备" },
  { id: "item", title: "道具" },
  { id: "shard", title: "碎片" },
  { id: "spirit", title: "精灵" },
];

/** Empty-slot policy: at least 20 entries, padded in batches of four. No geometry here. */
export function bagSlotCount(count: number): number {
  return Math.ceil(Math.max(count, BAG_MIN_SLOTS) / BAG_SLOT_BATCH) * BAG_SLOT_BATCH;
}
