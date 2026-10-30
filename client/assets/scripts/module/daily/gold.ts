import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../idle/rewards";
import { DailyTier } from "../../net/protocol/types";

/**
 * 日常金币副本（C12）。只做金币，经验副本和英雄副本以后再加。
 * 三档难度，一键结算，不播战报。战力不低于建议值则胜，发放该档金币。
 * 普通和困难再发强化石。失败不发奖励。每天 2 次，按 Mock 开服天重置。
 * 入口锁在 opencondition 的 main_mission（主线 Lv15），这里不重复判等级。
 *
 * 起步名册战力 165，能过简单（120）和普通（160），困难（240）会失败。
 */

export const DAILY_GOLD_KIND = "gold";
export const DAILY_GOLD_LIMIT = 2;
export const DAILY_ITEM_ID = IDLE_ITEM_ID;
export const DAILY_ITEM_NAME = IDLE_ITEM_NAME;

/** 由易到难。奖励写在档上，打开页面就能预览。 */
export const DAILY_GOLD_TIERS: DailyTier[] = [
  { id: 1, name: "简单", power: 120, gold: 120, itemId: DAILY_ITEM_ID, itemName: DAILY_ITEM_NAME, itemCount: 0 },
  { id: 2, name: "普通", power: 160, gold: 200, itemId: DAILY_ITEM_ID, itemName: DAILY_ITEM_NAME, itemCount: 1 },
  { id: 3, name: "困难", power: 240, gold: 320, itemId: DAILY_ITEM_ID, itemName: DAILY_ITEM_NAME, itemCount: 2 },
];

export interface DailySettle {
  win: boolean;
  goldGain: number;
  itemGain: number;
}

export function listDailyTiers(): DailyTier[] {
  const out: DailyTier[] = [];
  for (let i = 0; i < DAILY_GOLD_TIERS.length; i++) {
    const row = DAILY_GOLD_TIERS[i];
    out.push({
      id: row.id,
      name: row.name,
      power: row.power,
      gold: row.gold,
      itemId: row.itemId,
      itemName: row.itemName,
      itemCount: row.itemCount,
    });
  }
  return out;
}

export function findDailyTier(id: number): DailyTier | null {
  for (let i = 0; i < DAILY_GOLD_TIERS.length; i++) {
    if (DAILY_GOLD_TIERS[i].id === id) return DAILY_GOLD_TIERS[i];
  }
  return null;
}

export function settleDailyGold(playerPower: number, tier: DailyTier): DailySettle {
  const win = finite(playerPower) >= finite(tier.power);
  return {
    win,
    goldGain: win ? finite(tier.gold) : 0,
    itemGain: win ? finite(tier.itemCount) : 0,
  };
}

export function dailyAttemptsLine(used: number, limit: number): string {
  return "今日剩余 " + chancesLeft(used, limit) + "/" + finite(limit);
}

export function dailyPowerLine(playerPower: number, gold: number): string {
  return "我方战力 " + finite(playerPower) + " · 持有金币 " + finite(gold);
}

export function dailyPreviewLine(tier: DailyTier | null): string {
  if (!tier) return "先选择难度，再看金币奖励";
  return "奖励预览：" + tier.name + " · " + rewardBits(tier.gold, tier.itemName, tier.itemCount);
}

export function dailyRowText(tier: DailyTier, playerPower: number): string {
  const tag = finite(playerPower) >= finite(tier.power) ? "可胜" : "较难";
  return tier.name + " · 建议战力 " + finite(tier.power) + " · " + rewardBits(tier.gold, tier.itemName, tier.itemCount) + " · " + tag;
}

export function dailyChallengeButton(name: string | null, used: number, limit: number): string {
  if (chancesLeft(used, limit) <= 0) return "今日已用完";
  if (!name) return "先选择难度";
  return "挑战" + name + "（剩余 " + chancesLeft(used, limit) + "）";
}

export function dailyReportLine(playerPower: number, needPower: number, name: string, win: boolean): string {
  return "战力 " + finite(playerPower) + " 对 " + finite(needPower) + "，" + (name || "金币副本") + (win ? "胜利" : "失败");
}

export function dailyWinToast(name: string, goldGain: number, itemName: string, itemGain: number): string {
  const who = name || "金币副本";
  let text = "金币副本结算：" + who + "，金币 +" + finite(goldGain);
  if (finite(itemGain) > 0) text += "，" + (itemName || DAILY_ITEM_NAME) + " ×" + finite(itemGain);
  return text;
}

export function dailyLoseToast(name: string): string {
  return "金币副本挑战失败：" + (name || "该难度") + "，奖励未发放";
}

export function dailyNoChanceToast(): string {
  return "今日金币副本次数已用完";
}

export function dailyMissingToast(): string {
  return "没有这个难度";
}

export function dailyEmptyToast(): string {
  return "请先选择难度";
}

export function dailyResultToast(name: string, win: boolean, goldGain: number, itemName: string, itemGain: number): string {
  if (win) return dailyWinToast(name, goldGain, itemName, itemGain);
  return dailyLoseToast(name);
}

export function dailyFailToast(resp: { code?: number } | null | undefined): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  if (code === ErrorCode.DAILY_NO_CHANCE) return dailyNoChanceToast();
  if (code === ErrorCode.DAILY_NOT_FOUND) return dailyMissingToast();
  return errorText(code);
}

/** 结算打完才把钱包写进 Session。失败或次数用完时金币不变，调用方可以不调。 */
export function applyDailyChallenge(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

function rewardBits(gold: number, itemName: string, itemCount: number): string {
  const goldText = "金币 +" + finite(gold);
  if (finite(itemCount) <= 0) return goldText;
  const name = itemName || DAILY_ITEM_NAME;
  return goldText + " · " + name + " ×" + finite(itemCount);
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
