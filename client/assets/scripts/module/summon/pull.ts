import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { SummonDrop } from "../../net/protocol/types";

/**
 * 召唤（C6）。单抽和十连都花钻石。
 * 顺序固定，方便预览对照名册：新英雄进 C5 列表，已拥有的转碎片。
 * 碎片记在 Mock 道具里，背包页会列出来。
 */

export const SUMMON_SINGLE_COST = 10;
export const SUMMON_TEN_COST = 90;
export const SUMMON_SHARD_GAIN = 10;
/** 碎片道具 id = 这个基数 + 英雄 id。避开金币 1、钻石 2、强化石 101。 */
export const SUMMON_SHARD_BASE = 40000;

export interface SummonCandidate {
  id: number;
  name: string;
  star: number;
}

/**
 * 下标 0 起循环。起步三名已经在名册里，所以第 2、4、6 次是碎片。
 * 第一次是新英雄霜刃刺客。
 */
export const SUMMON_POOL: readonly SummonCandidate[] = [
  { id: 10004, name: "霜刃刺客", star: 2 },
  { id: 10001, name: "光耀骑士", star: 3 },
  { id: 10005, name: "炎狱卫士", star: 3 },
  { id: 10002, name: "林间游侠", star: 2 },
  { id: 10006, name: "潮汐祭司", star: 1 },
  { id: 10003, name: "星辉法师", star: 1 },
  { id: 10007, name: "暮色猎手", star: 2 },
  { id: 10008, name: "圣歌诗人", star: 1 },
];

export type { SummonDrop };

export function shardItemId(heroId: number): number {
  const id = typeof heroId === "number" && isFinite(heroId) ? Math.floor(heroId) : 0;
  return SUMMON_SHARD_BASE + id;
}

export function poolAt(index: number): SummonCandidate {
  const size = SUMMON_POOL.length;
  let cursor = typeof index === "number" && isFinite(index) ? Math.floor(index) : 0;
  if (cursor < 0) cursor = 0;
  return SUMMON_POOL[cursor % size];
}

export function isSummonCount(count: number): boolean {
  return count === 1 || count === 10;
}

export function summonCost(count: number): number {
  if (count === 10) return SUMMON_TEN_COST;
  if (count === 1) return SUMMON_SINGLE_COST;
  return 0;
}

export function singleButtonText(): string {
  return "召唤一次（钻石 " + SUMMON_SINGLE_COST + "）";
}

export function tenButtonText(): string {
  return "召唤十次（钻石 " + SUMMON_TEN_COST + "）";
}

export function ownedDiamondText(diamond: number): string {
  const value = typeof diamond === "number" && isFinite(diamond) ? Math.max(0, Math.floor(diamond)) : 0;
  return "持有钻石 " + value;
}

export function dropLine(drop: SummonDrop): string {
  if (drop.kind === "new") return "新英雄 · " + drop.name + " · " + drop.star + "星";
  const gain = typeof drop.shardGain === "number" && isFinite(drop.shardGain) ? Math.floor(drop.shardGain) : 0;
  const owned = typeof drop.shardOwned === "number" && isFinite(drop.shardOwned) ? Math.floor(drop.shardOwned) : 0;
  return "重复 · " + drop.name + " · 碎片 +" + gain + "（持有 " + owned + "）";
}

export function summonResultText(drops: SummonDrop[] | null | undefined): string {
  if (!drops || drops.length === 0) return "还没有召唤。新英雄会进入英雄列表";
  const lines: string[] = [];
  for (let i = 0; i < drops.length; i++) lines.push(dropLine(drops[i]));
  return lines.join("\n");
}

export function summonToast(resp: {
  count?: number;
  drops?: SummonDrop[] | null;
  newCount?: number;
  shardCount?: number;
}): string {
  const drops = resp && resp.drops ? resp.drops : [];
  const count = resp && typeof resp.count === "number" ? resp.count : drops.length;
  if (count === 1 && drops.length === 1) {
    const drop = drops[0];
    if (drop.kind === "new") return "召唤成功，获得" + drop.name;
    const gain = typeof drop.shardGain === "number" && isFinite(drop.shardGain) ? Math.floor(drop.shardGain) : SUMMON_SHARD_GAIN;
    return "召唤成功，" + drop.name + "已拥有，转化为碎片 ×" + gain;
  }
  const fresh = resp && typeof resp.newCount === "number" && isFinite(resp.newCount) ? Math.floor(resp.newCount) : 0;
  const shards = resp && typeof resp.shardCount === "number" && isFinite(resp.shardCount) ? Math.floor(resp.shardCount) : 0;
  return "十连完成，新英雄 " + fresh + "，碎片 " + shards;
}

export function diamondShortToast(count: number, need: number): string {
  const label = count === 10 ? "十连" : "召唤";
  const value = typeof need === "number" && isFinite(need) ? Math.floor(need) : 0;
  return "钻石不足，" + label + "需要 " + value;
}

export function summonFailToast(
  resp: { code?: number; count?: number; needDiamond?: number } | null | undefined
): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  if (code === ErrorCode.SUMMON_DIAMOND_SHORT) {
    const need = resp && typeof resp.needDiamond === "number" ? resp.needDiamond : 0;
    const count = resp && typeof resp.count === "number" ? resp.count : 1;
    if (need > 0) return diamondShortToast(count, need);
    return errorText(ErrorCode.SUMMON_DIAMOND_SHORT);
  }
  if (code === ErrorCode.SUMMON_COUNT_INVALID) return errorText(ErrorCode.SUMMON_COUNT_INVALID);
  return errorText(code);
}

/** 召唤成功才把钱包写进 Session。失败不动。 */
export function applySummon(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}
