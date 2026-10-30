/**
 * 背包页读 GameStore。名字和图标读 item 表。
 * 真服来自 s2c 5001 / 5002。空数组是已同步的空背包。
 * 对不上表时仍写 item_id / item_type / num，不把缺的数写成 0。
 */
import { GameStore, StoreBagItem } from "../../core/GameStore";
import { itemDisplayName, itemIconResource, itemProfile } from "../../config/gameCatalog";
import { formatWireBagLine, WireBagItem } from "../../net/protocol/wireBag";
import { BagItem } from "../../net/protocol/types";
import { listBagItems } from "./items";

export interface BagFace {
  line: string;
  icon: string | null;
}

export function formatStoreBagLine(item: StoreBagItem): string {
  const raw = formatWireBagLine({
    itemId: item.itemId,
    itemType: item.itemType,
    num: item.num,
  });
  const profile = itemProfile(item.itemType, item.itemId);
  if (!profile) return raw;
  const count = item.num === null ? "数量未同步" : "×" + item.num;
  return profile.name + " " + count + " · " + raw;
}

/**
 * 真服背包。source 是 wire 时只认商店。
 * 不是 wire 时退回传入的会话背包。
 */
export function wireBagBoard(sessionItems: WireBagItem[] | null): {
  kind: "unsynced" | "empty" | "list";
  faces: BagFace[];
} {
  const items = GameStore.source === "wire" ? GameStore.bag() : sessionToStore(sessionItems);
  if (!items) return { kind: "unsynced", faces: [] };
  if (items.length === 0) return { kind: "empty", faces: [] };
  const faces: BagFace[] = [];
  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    faces.push({
      line: formatStoreBagLine(row),
      icon: itemIconResource(row.itemType, row.itemId),
    });
  }
  return { kind: "list", faces };
}

/**
 * Mock 背包。商店已写入时按商店数量列道具，名字仍走原来的消耗品表。
 * item.idx 对得上时改用表内名字。商店还没写入时返回 null。
 */
export function mockBagItems(_proto: BagItem[]): BagItem[] | null {
  if (GameStore.source !== "mock") return null;
  const bag = GameStore.bag();
  if (!bag) return null;
  const counts: { [id: number]: number } = {};
  for (let i = 0; i < bag.length; i++) {
    const row = bag[i];
    if (row.itemId === null || row.num === null || row.num <= 0) continue;
    counts[row.itemId] = row.num;
  }
  const listed = listBagItems(counts);
  const items: BagItem[] = [];
  for (let i = 0; i < listed.length; i++) {
    const row = listed[i];
    const name = itemDisplayName(null, row.id, row.name);
    items.push(name === row.name ? row : { ...row, name });
  }
  return items;
}

export function bagIconFor(id: number): string | null {
  return itemIconResource(null, id);
}

function sessionToStore(items: WireBagItem[] | null): StoreBagItem[] | null {
  if (!items) return null;
  const out: StoreBagItem[] = [];
  for (let i = 0; i < items.length; i++) {
    out.push({ itemId: items[i].itemId, itemType: items[i].itemType, num: items[i].num });
  }
  return out;
}
