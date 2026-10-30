import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../idle/rewards";
import { shardItemId, SUMMON_POOL, SUMMON_SHARD_BASE } from "../summon/pull";
import { BagItem, BagItemKind, BagUseResp } from "../../net/protocol/types";

/**
 * 背包（C7）。金币和钻石仍在顶栏，不进格子。
 * 强化石来自挂机，英雄碎片来自召唤重复。
 * 小金币袋和经验药水是可直接使用的消耗品。
 * 许愿符只在低级许愿池消耗，背包里不能直接使用。
 * 咖啡豆只由咖啡馆招待产出，在限时兑换消耗，背包里不能直接使用。
 * 领队是名册第一名（起步为光耀骑士）。经验满 100 升 1 级。
 */

export const ITEM_GOLD_BAG = 201;
export const ITEM_EXP_POTION = 202;
export const ITEM_WISH_TOKEN = 203;
export const ITEM_CAFE_BEAN = 204;
export const WISH_TOKEN_NAME = "许愿符";
export const CAFE_BEAN_NAME = "咖啡豆";
export const GOLD_BAG_GAIN = 50;
export const EXP_POTION_GAIN = 100;
export const EXP_PER_LEVEL = 100;
export const STARTER_GOLD_BAG = 2;
export const STARTER_EXP_POTION = 2;
export const STARTER_WISH_TOKEN = 2;

interface CatalogRow {
  id: number;
  name: string;
  kind: BagItemKind;
  usable: boolean;
  desc: string;
}

/** 固定格子。碎片不在这里，按持有数量另行列出。 */
const CATALOG: readonly CatalogRow[] = [
  {
    id: ITEM_GOLD_BAG,
    name: "小金币袋",
    kind: "consumable",
    usable: true,
    desc: "使用后获得 " + GOLD_BAG_GAIN + " 金币",
  },
  {
    id: ITEM_EXP_POTION,
    name: "经验药水",
    kind: "consumable",
    usable: true,
    desc: "使用后为领队英雄增加 " + EXP_POTION_GAIN + " 经验，满 " + EXP_PER_LEVEL + " 升 1 级",
  },
  {
    id: ITEM_WISH_TOKEN,
    name: WISH_TOKEN_NAME,
    kind: "material",
    usable: false,
    desc: "在低级许愿池消耗，不能直接使用",
  },
  {
    id: ITEM_CAFE_BEAN,
    name: CAFE_BEAN_NAME,
    kind: "material",
    usable: false,
    desc: "咖啡馆招待获得。可在限时兑换消耗，不能直接使用",
  },
  {
    id: IDLE_ITEM_ID,
    name: IDLE_ITEM_NAME,
    kind: "material",
    usable: false,
    desc: "挂机或邮件获得。在铁匠铺强化武器，不能直接使用",
  },
];

export function emptyBagToast(): string {
  return "背包是空的";
}

export function notEnoughToast(): string {
  return "数量不足";
}

export function notUsableTip(kind?: string, name?: string): string {
  if (kind === "fragment") return "英雄碎片不能直接使用";
  if (name) return name + "不能直接使用";
  return "该道具不能直接使用";
}

export function bagRowText(item: BagItem): string {
  return item.name + " ×" + item.count + " · " + kindLabel(item.kind);
}

export function useButtonText(usable: boolean): string {
  return usable ? "使用" : "不可使用";
}

export function bagUseToast(resp: BagUseResp): string {
  const gain = finiteInt(resp.goldGain);
  if (gain > 0) return "使用成功：金币 +" + gain;
  const exp = finiteInt(resp.expGain);
  const who = resp.heroName || "英雄";
  const level = finiteInt(resp.heroLevel);
  if (resp.leveled && level > 0) return "使用成功：" + who + "升至 Lv" + level;
  if (exp > 0) return "使用成功：" + who + "获得经验 " + exp;
  return "使用成功";
}

export function bagFailToast(resp: { code?: number; kind?: string; name?: string; heroName?: string } | null | undefined): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  if (code === ErrorCode.BAG_EMPTY) return emptyBagToast();
  if (code === ErrorCode.BAG_NOT_ENOUGH) return notEnoughToast();
  if (code === ErrorCode.BAG_NOT_FOUND) return errorText(ErrorCode.BAG_NOT_FOUND);
  if (code === ErrorCode.BAG_COUNT_INVALID) return errorText(ErrorCode.BAG_COUNT_INVALID);
  if (code === ErrorCode.BAG_NOT_USABLE) return notUsableTip(resp?.kind, resp?.name);
  if (code === ErrorCode.BAG_HERO_MAX) {
    const who = resp && resp.heroName ? resp.heroName : "英雄";
    return who + "已达最高等级，无法使用";
  }
  return errorText(code);
}

/** 使用成功才把钱包写进 Session。失败不动。英雄等级在下一次英雄列表里读到。 */
export function applyBagUse(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

export function heroIdFromShard(itemId: number): number | null {
  const id = finiteInt(itemId);
  if (id <= SUMMON_SHARD_BASE) return null;
  const heroId = id - SUMMON_SHARD_BASE;
  if (heroId < 1 || heroId > 999999) return null;
  return heroId;
}

/**
 * 只列出数量大于 0 的道具。
 * 顺序：小金币袋、经验药水、许愿符、咖啡豆、强化石，然后碎片和其它材料按 id 升序。
 * 金币 id 1、钻石 id 2 不进背包。
 */
export function listBagItems(
  counts: { [id: number]: number } | null | undefined,
  heroName?: (heroId: number) => string
): BagItem[] {
  const bag = counts || {};
  const items: BagItem[] = [];
  const used: { [id: number]: boolean } = {};
  for (let i = 0; i < CATALOG.length; i++) {
    const row = CATALOG[i];
    const count = positiveCount(bag[row.id]);
    if (count <= 0) continue;
    used[row.id] = true;
    items.push({
      id: row.id,
      name: row.name,
      count,
      kind: row.kind,
      usable: row.usable,
      desc: row.desc,
    });
  }
  const extras: number[] = [];
  const keys = Object.keys(bag);
  for (let i = 0; i < keys.length; i++) {
    const id = finiteInt(Number(keys[i]));
    if (id <= 0 || used[id] || isCurrency(id)) continue;
    if (positiveCount(bag[id]) <= 0) continue;
    extras.push(id);
  }
  extras.sort((a, b) => a - b);
  for (let i = 0; i < extras.length; i++) {
    const id = extras[i];
    const count = positiveCount(bag[id]);
    const heroId = heroIdFromShard(id);
    if (heroId !== null && id === shardItemId(heroId)) {
      const named = heroName ? heroName(heroId) : "";
      const who = named || poolName(heroId);
      items.push({
        id,
        name: who + "碎片",
        count,
        kind: "fragment",
        usable: false,
        desc: "重复召唤获得，不能直接使用",
      });
      continue;
    }
    items.push({
      id,
      name: "道具" + id,
      count,
      kind: "material",
      usable: false,
      desc: "不能直接使用",
    });
  }
  return items;
}

/** 经验累加。满 EXP_PER_LEVEL 升 1 级，到最高级后多余经验丢掉。 */
export function applyHeroExp(
  level: number,
  exp: number,
  gain: number,
  maxLevel: number
): { level: number; exp: number; leveled: boolean } {
  let nextLevel = finiteInt(level);
  if (nextLevel < 1) nextLevel = 1;
  let nextExp = finiteInt(exp) + finiteInt(gain);
  if (nextExp < 0) nextExp = 0;
  let leveled = false;
  const cap = finiteInt(maxLevel);
  while (nextExp >= EXP_PER_LEVEL && nextLevel < cap) {
    nextExp -= EXP_PER_LEVEL;
    nextLevel += 1;
    leveled = true;
  }
  if (nextLevel >= cap) nextExp = 0;
  return { level: nextLevel, exp: nextExp, leveled };
}

function kindLabel(kind: BagItemKind): string {
  if (kind === "consumable") return "可使用";
  if (kind === "fragment") return "碎片";
  return "材料";
}

function poolName(heroId: number): string {
  for (let i = 0; i < SUMMON_POOL.length; i++) {
    if (SUMMON_POOL[i].id === heroId) return SUMMON_POOL[i].name;
  }
  return "英雄" + heroId;
}

function isCurrency(id: number): boolean {
  return id === 1 || id === 2;
}

function positiveCount(value: number | undefined): number {
  const count = finiteInt(value);
  return count > 0 ? count : 0;
}

function finiteInt(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
