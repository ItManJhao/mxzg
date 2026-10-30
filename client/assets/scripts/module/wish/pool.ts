import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { ITEM_EXP_POTION, ITEM_WISH_TOKEN, WISH_TOKEN_NAME } from "../bag/items";
import { IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../idle/rewards";
import { WishDrop, WishKind, WishPay } from "../../net/protocol/types";

/**
 * 低级许愿池。入口锁在 opencondition 的 main_blessingpool（主线 Lv10），这里不重复判等级。
 * 一次许愿花金币、许愿符或钻石，从固定 10 格奖池里按游标取一格。
 * 前 9 格是金币、强化石、经验药水，第 10 格是钻石，然后从头循环。
 * 每天 5 次，三种方式共用。次数按 Mock 开服天清空。高级许愿池不在这里。
 */

export const WISH_DAILY_LIMIT = 5;
export const WISH_GOLD_COST = 30;
export const WISH_DIAMOND_COST = 5;
export const WISH_ITEM_COST = 1;
export const WISH_TOKEN_ITEM_ID = ITEM_WISH_TOKEN;

/** 下标 0 到 8 是普通奖，下标 9 是钻石。游标成功后才 +1。 */
export const WISH_DROPS: readonly WishDrop[] = [
  { kind: "gold", name: "金币", count: 40, itemId: 0 },
  { kind: "stone", name: IDLE_ITEM_NAME, count: 2, itemId: IDLE_ITEM_ID },
  { kind: "potion", name: "经验药水", count: 1, itemId: ITEM_EXP_POTION },
  { kind: "gold", name: "金币", count: 60, itemId: 0 },
  { kind: "stone", name: IDLE_ITEM_NAME, count: 1, itemId: IDLE_ITEM_ID },
  { kind: "gold", name: "金币", count: 40, itemId: 0 },
  { kind: "potion", name: "经验药水", count: 1, itemId: ITEM_EXP_POTION },
  { kind: "stone", name: IDLE_ITEM_NAME, count: 3, itemId: IDLE_ITEM_ID },
  { kind: "gold", name: "金币", count: 80, itemId: 0 },
  { kind: "diamond", name: "钻石", count: 8, itemId: 0 },
];

export function parseWishPay(raw: unknown): WishPay | null {
  if (raw !== "gold" && raw !== "item" && raw !== "diamond") return null;
  return raw;
}

export function wishCost(pay: WishPay): number {
  if (pay === "item") return WISH_ITEM_COST;
  if (pay === "diamond") return WISH_DIAMOND_COST;
  return WISH_GOLD_COST;
}

export function dropAt(cursor: number): WishDrop {
  const row = WISH_DROPS[positiveMod(cursor, WISH_DROPS.length)];
  return { kind: row.kind, name: row.name, count: row.count, itemId: row.itemId };
}

export function wishAttemptsLine(used: number, limit: number): string {
  return "今日剩余 " + chancesLeft(used, limit) + "/" + finite(limit);
}

export function wishWalletLine(gold: number, diamond: number, tokens: number): string {
  return "持有金币 " + finite(gold) + " · 钻石 " + finite(diamond) + " · " + WISH_TOKEN_NAME + " ×" + finite(tokens);
}

export function wishNextLine(cursor: number): string {
  return "下一次：" + wishDropText(dropAt(cursor));
}

export function wishPoolLine(): string {
  return "奖池固定循环 10 次：金币、强化石、经验药水，第 10 次是钻石";
}

export function wishDropText(drop: WishDrop): string {
  if (drop.kind === "gold" || drop.kind === "diamond") return drop.name + " " + finite(drop.count);
  return drop.name + " ×" + finite(drop.count);
}

export function wishPayButton(pay: WishPay, used: number, limit: number): string {
  if (chancesLeft(used, limit) <= 0) return "今日已用完";
  if (pay === "item") return WISH_TOKEN_NAME + "许愿（×" + WISH_ITEM_COST + "）";
  if (pay === "diamond") return "钻石许愿（" + WISH_DIAMOND_COST + "）";
  return "金币许愿（" + WISH_GOLD_COST + "）";
}

export function wishSuccessToast(kind: WishKind | string, name: string, count: number, pay: WishPay | string, cost: number): string {
  return "许愿成功：获得" + rewardPhrase(kind, name, count) + "，" + costPhrase(pay, cost);
}

export function wishGoldShortToast(cost: number): string {
  return "金币不足，许愿需要 " + finite(cost || WISH_GOLD_COST);
}

export function wishDiamondShortToast(cost: number): string {
  return "钻石不足，许愿需要 " + finite(cost || WISH_DIAMOND_COST);
}

export function wishItemShortToast(cost: number): string {
  return WISH_TOKEN_NAME + "不足，许愿需要 " + finite(cost || WISH_ITEM_COST);
}

export function wishNoChanceToast(): string {
  return "今日许愿次数已用完";
}

export function wishPayToast(): string {
  return "请选择许愿方式";
}

export function wishFailToast(
  resp: { code?: number; cost?: number; pay?: string } | null | undefined
): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  const cost = resp && typeof resp.cost === "number" ? resp.cost : 0;
  if (code === ErrorCode.WISH_PAY_INVALID) return wishPayToast();
  if (code === ErrorCode.WISH_NO_CHANCE) return wishNoChanceToast();
  if (code === ErrorCode.WISH_GOLD_SHORT) return wishGoldShortToast(cost);
  if (code === ErrorCode.WISH_DIAMOND_SHORT) return wishDiamondShortToast(cost);
  if (code === ErrorCode.WISH_ITEM_SHORT) return wishItemShortToast(cost);
  return errorText(code);
}

/** 许愿成功才把钱包写进 Session。失败不动。道具在下一次背包列表里读到。 */
export function applyWishDraw(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

function rewardPhrase(kind: string, name: string, count: number): string {
  if (kind === "gold") return "金币 " + finite(count);
  if (kind === "diamond") return "钻石 " + finite(count);
  const label = name || "道具";
  return label + " ×" + finite(count);
}

function costPhrase(pay: string, cost: number): string {
  if (pay === "diamond") return "消耗钻石 " + finite(cost);
  if (pay === "item") return "消耗" + WISH_TOKEN_NAME + " ×" + finite(cost);
  return "消耗金币 " + finite(cost);
}

function chancesLeft(used: number, limit: number): number {
  const left = finite(limit) - finite(used);
  if (left < 0) return 0;
  return left;
}

function positiveMod(value: number, size: number): number {
  if (size <= 0) return 0;
  let index = finite(value);
  if (index < 0) index = 0;
  return index % size;
}

function finite(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
