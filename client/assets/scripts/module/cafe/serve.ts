import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { CAFE_BEAN_NAME, ITEM_CAFE_BEAN } from "../bag/items";

/**
 * 咖啡馆招待。入口锁在 opencondition 的 main_cafe（主线 Lv12），这里不重复判等级。
 * 一次派出 1 到 2 名已拥有的英雄。MVP 不走墙钟，派出后立刻可领。
 * 领取给金币和咖啡豆。每天 3 次，次数按 Mock 开服天清空。未领取的招待留着。
 * 咖啡豆进背包，不能直接使用。
 */

export const CAFE_DAILY_LIMIT = 3;
export const CAFE_MAX_HEROES = 2;
export const CAFE_GOLD_ONE = 60;
export const CAFE_GOLD_TWO = 100;
export const CAFE_BEAN_ONE = 1;
export const CAFE_BEAN_TWO = 2;
export const CAFE_BEAN_ITEM_ID = ITEM_CAFE_BEAN;

export interface CafeReward {
  gold: number;
  beans: number;
}

export interface CafeIdRead {
  ids: number[];
  /** empty 没选，bad 不是正整数，空字符串表示可以继续校验。 */
  problem: "" | "empty" | "bad";
}

export function cafeReward(heroCount: number): CafeReward {
  const count = finite(heroCount);
  if (count >= CAFE_MAX_HEROES) return { gold: CAFE_GOLD_TWO, beans: CAFE_BEAN_TWO };
  if (count === 1) return { gold: CAFE_GOLD_ONE, beans: CAFE_BEAN_ONE };
  return { gold: 0, beans: 0 };
}

/** 非数组或空数组是 empty。里面有非正数则整单 bad，不挑出合法的。 */
export function readCafeHeroIds(raw: unknown): CafeIdRead {
  if (!Array.isArray(raw) || raw.length === 0) return { ids: [], problem: "empty" };
  const ids: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const value = raw[i];
    if (typeof value !== "number" || !isFinite(value) || value <= 0) return { ids: [], problem: "bad" };
    ids.push(Math.floor(value));
  }
  return { ids, problem: "" };
}

export function cafeHasDuplicate(ids: number[]): boolean {
  const seen: { [id: number]: boolean } = {};
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (seen[id]) return true;
    seen[id] = true;
  }
  return false;
}

export function cafeAttemptsLine(used: number, limit: number): string {
  return "今日剩余 " + chancesLeft(used, limit) + "/" + finite(limit);
}

export function cafeWalletLine(gold: number, beans: number): string {
  return "持有金币 " + finite(gold) + " · " + CAFE_BEAN_NAME + " ×" + finite(beans);
}

export function cafePreviewLine(): string {
  return (
    "1 人可得金币 +" +
    CAFE_GOLD_ONE +
    "、" +
    CAFE_BEAN_NAME +
    " ×" +
    CAFE_BEAN_ONE +
    "；2 人可得金币 +" +
    CAFE_GOLD_TWO +
    "、" +
    CAFE_BEAN_NAME +
    " ×" +
    CAFE_BEAN_TWO +
    "。派出后立刻可领"
  );
}

export function cafeStatusLine(names: string[], ready: boolean): string {
  const who = joinNames(names);
  if (!who) return "还没有派出英雄";
  if (ready) return "招待中：" + who + "，可以领取";
  return "招待中：" + who;
}

export function cafeHeroRow(name: string, level: number, picked: boolean, serving: boolean): string {
  const who = name || "英雄";
  let mark = "可选";
  if (serving) mark = "招待中";
  else if (picked) mark = "已选";
  return who + " Lv" + finite(level) + " · " + mark;
}

export function cafeSendButton(count: number, used: number, limit: number, busy: boolean): string {
  if (busy) return "招待中，请先领取";
  if (chancesLeft(used, limit) <= 0) return "今日已用完";
  const picked = finite(count);
  if (picked <= 0) return "请选择英雄";
  return "派出招待（" + picked + "人）";
}

export function cafeClaimButton(ready: boolean): string {
  if (ready) return "领取招待";
  return "还没有招待";
}

export function cafeSendToast(names: string[]): string {
  const who = joinNames(names);
  if (!who) return "已派出招待";
  return "已派出招待：" + who;
}

export function cafeClaimToast(goldGain: number, beanName: string, beanGain: number): string {
  let text = "招待完成：金币 +" + finite(goldGain);
  if (finite(beanGain) > 0) text += "，" + (beanName || CAFE_BEAN_NAME) + " ×" + finite(beanGain);
  return text;
}

export function cafeEmptyToast(): string {
  return "没有可招待的英雄";
}

export function cafeNoHeroToast(): string {
  return "请先选择招待的英雄";
}

export function cafeTooManyToast(): string {
  return "一次最多派出 " + CAFE_MAX_HEROES + " 名英雄";
}

export function cafeDuplicateToast(): string {
  return "请选择不同的英雄";
}

export function cafeMissingToast(): string {
  return "没有这名英雄";
}

export function cafeBusyToast(): string {
  return "英雄正在招待，请先领取";
}

export function cafeNoChanceToast(): string {
  return "今日招待次数已用完";
}

export function cafeNothingToast(): string {
  return "还没有可领取的招待";
}

export function cafeFailToast(resp: { code?: number } | null | undefined): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  if (code === ErrorCode.CAFE_NO_HERO) return cafeNoHeroToast();
  if (code === ErrorCode.CAFE_TOO_MANY) return cafeTooManyToast();
  if (code === ErrorCode.CAFE_DUPLICATE) return cafeDuplicateToast();
  if (code === ErrorCode.CAFE_HERO_MISSING) return cafeMissingToast();
  if (code === ErrorCode.CAFE_BUSY) return cafeBusyToast();
  if (code === ErrorCode.CAFE_NO_CHANCE) return cafeNoChanceToast();
  if (code === ErrorCode.CAFE_NOTHING) return cafeNothingToast();
  return errorText(code);
}

/** 领取成功才把钱包写进 Session。派出和失败都不改顶栏。咖啡豆在下一次背包列表里读到。 */
export function applyCafeClaim(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

export function joinNames(names: string[] | null | undefined): string {
  const parts: string[] = [];
  const list = names || [];
  for (let i = 0; i < list.length; i++) {
    if (list[i]) parts.push(list[i]);
  }
  return parts.join("、");
}

function chancesLeft(used: number, limit: number): number {
  const left = finite(limit) - finite(used);
  if (left < 0) return 0;
  return left;
}

function finite(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
