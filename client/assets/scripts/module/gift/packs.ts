import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { ITEM_EXP_POTION, ITEM_GOLD_BAG } from "../bag/items";
import { IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../idle/rewards";
import {
  GiftAccRow,
  GiftAccState,
  GiftLevelRow,
  GiftLevelState,
  GiftRechargeKind,
} from "../../net/protocol/types";

/**
 * 礼包骨架。一个入口里放升级有礼、每日礼包、首充和累充。
 * 不接真实支付。「模拟充值」只改本局 Mock 的钻石、道具和累充金额。
 * 升级有礼看主线等级（1 + 已通关），每档只领一次。
 * 每日礼包花钻石，跟着开服天刷新，已经买到的不收回。
 */

export const GIFT_LEVELS: readonly GiftBundle[] = [
  { level: 5, gold: 100, diamond: 0, itemId: IDLE_ITEM_ID, itemName: IDLE_ITEM_NAME, itemCount: 3 },
  { level: 10, gold: 0, diamond: 20, itemId: ITEM_EXP_POTION, itemName: "经验药水", itemCount: 1 },
  { level: 15, gold: 200, diamond: 0, itemId: ITEM_GOLD_BAG, itemName: "小金币袋", itemCount: 1 },
];

export const GIFT_DAILY_PRICE = 10;
export const GIFT_DAILY_GOLD = 80;
export const GIFT_DAILY_ITEM_ID = IDLE_ITEM_ID;
export const GIFT_DAILY_ITEM_NAME = IDLE_ITEM_NAME;
export const GIFT_DAILY_ITEM_COUNT = 2;

/** 首充计入累充的金额。单位是模拟的「元」，不是钻石。 */
export const GIFT_FIRST_AMOUNT = 6;
export const GIFT_FIRST_DIAMOND = 60;
export const GIFT_FIRST_ITEM_ID = ITEM_EXP_POTION;
export const GIFT_FIRST_ITEM_NAME = "经验药水";
export const GIFT_FIRST_ITEM_COUNT = 1;

/** 累充页再点一次「模拟充值」加上的金额，并另发一笔钻石。 */
export const GIFT_RECHARGE_STEP = 30;
export const GIFT_RECHARGE_DIAMOND = 30;

export const GIFT_ACC_TIERS: readonly GiftBundle[] = [
  { level: 6, gold: 150, diamond: 0, itemId: 0, itemName: "", itemCount: 0 },
  { level: 30, gold: 0, diamond: 30, itemId: IDLE_ITEM_ID, itemName: IDLE_ITEM_NAME, itemCount: 5 },
  { level: 68, gold: 0, diamond: 0, itemId: ITEM_GOLD_BAG, itemName: "小金币袋", itemCount: 2 },
];

/** level 在升级有礼里是主线等级，在累充里是金额门槛。 */
export interface GiftBundle {
  level: number;
  gold: number;
  diamond: number;
  itemId: number;
  itemName: string;
  itemCount: number;
}

export function findGiftLevel(level: number): GiftBundle | null {
  const need = finite(level);
  for (let i = 0; i < GIFT_LEVELS.length; i++) {
    if (GIFT_LEVELS[i].level === need) return GIFT_LEVELS[i];
  }
  return null;
}

export function findGiftAcc(amount: number): GiftBundle | null {
  const need = finite(amount);
  for (let i = 0; i < GIFT_ACC_TIERS.length; i++) {
    if (GIFT_ACC_TIERS[i].level === need) return GIFT_ACC_TIERS[i];
  }
  return null;
}

export function giftAccCap(): number {
  let cap = 0;
  for (let i = 0; i < GIFT_ACC_TIERS.length; i++) {
    if (GIFT_ACC_TIERS[i].level > cap) cap = GIFT_ACC_TIERS[i].level;
  }
  return cap;
}

export function parseGiftRecharge(value: unknown): GiftRechargeKind | null {
  if (value === "first" || value === "acc") return value;
  return null;
}

export function giftLevelState(mainLevel: number, need: number, claimed: boolean): GiftLevelState {
  if (claimed) return "claimed";
  if (finite(mainLevel) >= finite(need)) return "claimable";
  return "locked";
}

export function giftAccState(total: number, need: number, claimed: boolean): GiftAccState {
  if (claimed) return "claimed";
  if (finite(total) >= finite(need)) return "claimable";
  return "locked";
}

export function listGiftLevels(mainLevel: number, claimedOf: (level: number) => boolean): GiftLevelRow[] {
  const out: GiftLevelRow[] = [];
  for (let i = 0; i < GIFT_LEVELS.length; i++) {
    const row = GIFT_LEVELS[i];
    out.push(toLevelRow(row, giftLevelState(mainLevel, row.level, claimedOf(row.level))));
  }
  return out;
}

export function listGiftAcc(total: number, claimedOf: (amount: number) => boolean): GiftAccRow[] {
  const out: GiftAccRow[] = [];
  for (let i = 0; i < GIFT_ACC_TIERS.length; i++) {
    const row = GIFT_ACC_TIERS[i];
    out.push(toAccRow(row, giftAccState(total, row.level, claimedOf(row.level))));
  }
  return out;
}

export function giftHeadLine(level: number, openDay: number): string {
  return "主线 Lv" + finite(level) + " · 开服第 " + finite(openDay) + " 天";
}

export function giftWalletLine(gold: number, diamond: number): string {
  return "持有金币 " + finite(gold) + " · 钻石 " + finite(diamond);
}

export function giftLevelLine(row: GiftLevelRow): string {
  return "Lv" + finite(row.level) + " · " + giftRewardText(row.gold, row.diamond, row.itemName, row.itemCount) + " · " + levelStateName(row.state);
}

export function giftDailyLine(price: number, bought: boolean): string {
  const status = bought ? "今日已购买" : "今日可购买";
  return (
    "每日礼包 · 钻石 " +
    finite(price) +
    " · " +
    giftRewardText(GIFT_DAILY_GOLD, 0, GIFT_DAILY_ITEM_NAME, GIFT_DAILY_ITEM_COUNT) +
    " · " +
    status
  );
}

export function giftFirstLine(done: boolean, amount: number): string {
  if (done) return "首充已完成 · 已计入累充 " + finite(amount);
  return "尚未首充 · 模拟充值计入累充 " + finite(amount);
}

export function giftFirstRewardLine(): string {
  return "首充可得 " + giftRewardText(0, GIFT_FIRST_DIAMOND, GIFT_FIRST_ITEM_NAME, GIFT_FIRST_ITEM_COUNT);
}

export function giftMeterLine(total: number, cap: number): string {
  const shown = finite(total);
  const goal = finite(cap);
  if (goal <= 0) return "累充 " + shown;
  const width = 10;
  let filled = Math.round((shown / goal) * width);
  if (filled < 0) filled = 0;
  if (filled > width) filled = width;
  if (shown > 0 && filled === 0) filled = 1;
  let bar = "";
  for (let i = 0; i < width; i++) bar += i < filled ? "■" : "□";
  return "累充 " + shown + "/" + goal + "  " + bar;
}

export function giftAccLine(row: GiftAccRow): string {
  return "累充 " + finite(row.amount) + " · " + giftRewardText(row.gold, row.diamond, row.itemName, row.itemCount) + " · " + accStateName(row.state);
}

export function giftAccHint(step: number, diamond: number): string {
  return "再模拟充值一次，累充 +" + finite(step) + "，并获得钻石 +" + finite(diamond);
}

export function giftLevelButton(state: GiftLevelState): string {
  if (state === "claimed") return "已领取";
  if (state === "locked") return "未达到";
  return "领取";
}

export function giftDailyButton(bought: boolean): string {
  return bought ? "今日已购买" : "购买";
}

export function giftFirstButton(done: boolean): string {
  return done ? "已完成" : "模拟充值";
}

export function giftAccButton(state: GiftAccState): string {
  if (state === "claimed") return "已领取";
  if (state === "locked") return "未达到";
  return "领取";
}

export function giftRechargeButton(): string {
  return "模拟充值";
}

export function giftRewardText(gold: number, diamond: number, itemName: string, itemCount: number): string {
  const parts: string[] = [];
  if (finite(gold) > 0) parts.push("金币 +" + finite(gold));
  if (finite(diamond) > 0) parts.push("钻石 +" + finite(diamond));
  if (finite(itemCount) > 0 && itemName) parts.push(itemName + " ×" + finite(itemCount));
  if (parts.length === 0) return "无额外道具";
  return parts.join("、");
}

export function giftLevelClaimToast(
  level: number,
  gold: number,
  diamond: number,
  itemName: string,
  itemCount: number
): string {
  return "领取成功：升级有礼 Lv" + finite(level) + "，" + giftRewardText(gold, diamond, itemName, itemCount);
}

export function giftDailyBuyToast(price: number, gold: number, itemName: string, itemCount: number): string {
  return "购买成功：每日礼包，消耗钻石 " + finite(price) + "，" + giftRewardText(gold, 0, itemName, itemCount);
}

export function giftFirstToast(amount: number, diamond: number, itemName: string, itemCount: number): string {
  return "模拟充值成功：首充完成，累充 +" + finite(amount) + "，" + giftRewardText(0, diamond, itemName, itemCount);
}

export function giftRechargeToast(amount: number, diamond: number): string {
  return "模拟充值成功：累充 +" + finite(amount) + "，" + giftRewardText(0, diamond, "", 0);
}

export function giftAccClaimToast(
  amount: number,
  gold: number,
  diamond: number,
  itemName: string,
  itemCount: number
): string {
  return "领取成功：累充 " + finite(amount) + "，" + giftRewardText(gold, diamond, itemName, itemCount);
}

export function giftLevelLockedToast(level: number): string {
  return "主线达到 Lv" + finite(level) + " 后才能领取";
}

export function giftLevelClaimedToast(level: number): string {
  return "Lv" + finite(level) + " 奖励已经领取";
}

export function giftLevelMissingToast(): string {
  return "没有这一档升级奖励";
}

export function giftDailyBoughtToast(): string {
  return "今日礼包已购买";
}

export function giftDailyShortToast(price: number): string {
  return "钻石不足，每日礼包需要 " + finite(price);
}

export function giftFirstDoneToast(): string {
  return "首充已完成";
}

export function giftAccLockedToast(amount: number): string {
  return "累充未达到 " + finite(amount);
}

export function giftAccClaimedToast(amount: number): string {
  return "累充 " + finite(amount) + " 奖励已经领取";
}

export function giftAccMissingToast(): string {
  return "没有这一档累充";
}

export function giftRechargeInvalidToast(): string {
  return "请选择充值方式";
}

export function giftLevelFailToast(
  resp: { code?: number; level?: number } | null | undefined
): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  const level = resp && typeof resp.level === "number" ? resp.level : 0;
  if (code === ErrorCode.GIFT_LEVEL_NOT_FOUND) return giftLevelMissingToast();
  if (code === ErrorCode.GIFT_LEVEL_LOCKED) return giftLevelLockedToast(level);
  if (code === ErrorCode.GIFT_LEVEL_CLAIMED) return giftLevelClaimedToast(level);
  return errorText(code);
}

export function giftDailyFailToast(
  resp: { code?: number; price?: number } | null | undefined
): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  const price = resp && typeof resp.price === "number" ? resp.price : GIFT_DAILY_PRICE;
  if (code === ErrorCode.GIFT_DAILY_BOUGHT) return giftDailyBoughtToast();
  if (code === ErrorCode.GIFT_DAILY_SHORT) return giftDailyShortToast(price);
  return errorText(code);
}

export function giftRechargeFailToast(resp: { code?: number } | null | undefined): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  if (code === ErrorCode.GIFT_FIRST_DONE) return giftFirstDoneToast();
  if (code === ErrorCode.GIFT_RECHARGE_INVALID) return giftRechargeInvalidToast();
  return errorText(code);
}

export function giftAccFailToast(
  resp: { code?: number; amount?: number } | null | undefined
): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  const amount = resp && typeof resp.amount === "number" ? resp.amount : 0;
  if (code === ErrorCode.GIFT_ACC_NOT_FOUND) return giftAccMissingToast();
  if (code === ErrorCode.GIFT_ACC_LOCKED) return giftAccLockedToast(amount);
  if (code === ErrorCode.GIFT_ACC_CLAIMED) return giftAccClaimedToast(amount);
  return errorText(code);
}

/** 成功才把钱包写进 Session。失败不动。道具在下一次背包里读到。 */
export function applyGiftWallet(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

function toLevelRow(bundle: GiftBundle, state: GiftLevelState): GiftLevelRow {
  return {
    level: bundle.level,
    state,
    gold: bundle.gold,
    diamond: bundle.diamond,
    itemId: bundle.itemId,
    itemName: bundle.itemName,
    itemCount: bundle.itemCount,
  };
}

function toAccRow(bundle: GiftBundle, state: GiftAccState): GiftAccRow {
  return {
    amount: bundle.level,
    state,
    gold: bundle.gold,
    diamond: bundle.diamond,
    itemId: bundle.itemId,
    itemName: bundle.itemName,
    itemCount: bundle.itemCount,
  };
}

function levelStateName(state: GiftLevelState): string {
  if (state === "claimed") return "已领取";
  if (state === "claimable") return "可领取";
  return "未达到";
}

function accStateName(state: GiftAccState): string {
  if (state === "claimed") return "已领取";
  if (state === "claimable") return "可领取";
  return "未达到";
}

function finite(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
