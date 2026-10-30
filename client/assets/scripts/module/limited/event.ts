import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { ITEM_CAFE_BEAN, ITEM_EXP_POTION, CAFE_BEAN_NAME } from "../bag/items";
import { IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../idle/rewards";
import { LimitedOfferRow, LimitedPackPay, LimitedPackRow, LimitedPay } from "../../net/protocol/types";

/**
 * 限时活动。一个入口里放限时兑换、点石成金和限时礼包。
 * 兑换和点石的次数跟着开服天清空，已经换到或点到的不收回。
 * 限时礼包开服第 1 天到第 7 天可买，每种库存 1，不按天补货。
 * 「模拟购买」不接真实支付。
 */

export const LIMITED_EX_BEAN_ID = 1;
export const LIMITED_EX_GOLD_ID = 2;

export const LIMITED_BEAN_ITEM_ID = ITEM_CAFE_BEAN;
export const LIMITED_BEAN_COST = 2;
export const LIMITED_BEAN_LIMIT = 2;

export const LIMITED_GOLD_COST = 50;
export const LIMITED_GOLD_REWARD = 4;
export const LIMITED_GOLD_LIMIT = 3;

export const LIMITED_STONE_LIMIT = 3;
export const LIMITED_STONE_DIAMOND = 5;
export const LIMITED_STONE_GOLD = 100;

export const LIMITED_PACK_DAYS = 7;
export const LIMITED_PACK_DIAMOND_ID = 1;
export const LIMITED_PACK_MOCK_ID = 2;
export const LIMITED_PACK_PRICE = 15;
export const LIMITED_PACK_GOLD = 180;
export const LIMITED_PACK_STONE = 3;
export const LIMITED_PACK_MOCK_DIAMOND = 30;

export interface LimitedOffer {
  id: number;
  pay: LimitedPay;
  costItemId: number;
  costName: string;
  costCount: number;
  rewardItemId: number;
  rewardName: string;
  rewardCount: number;
  limit: number;
}

export interface LimitedPackDef {
  id: number;
  name: string;
  pay: LimitedPackPay;
  price: number;
  gold: number;
  diamond: number;
  itemId: number;
  itemName: string;
  itemCount: number;
  /** 含当天。开服天大于它则本轮结束。 */
  openThrough: number;
}

export const LIMITED_OFFERS: readonly LimitedOffer[] = [
  {
    id: LIMITED_EX_BEAN_ID,
    pay: "item",
    costItemId: LIMITED_BEAN_ITEM_ID,
    costName: CAFE_BEAN_NAME,
    costCount: LIMITED_BEAN_COST,
    rewardItemId: ITEM_EXP_POTION,
    rewardName: "经验药水",
    rewardCount: 1,
    limit: LIMITED_BEAN_LIMIT,
  },
  {
    id: LIMITED_EX_GOLD_ID,
    pay: "gold",
    costItemId: 0,
    costName: "金币",
    costCount: LIMITED_GOLD_COST,
    rewardItemId: IDLE_ITEM_ID,
    rewardName: IDLE_ITEM_NAME,
    rewardCount: LIMITED_GOLD_REWARD,
    limit: LIMITED_GOLD_LIMIT,
  },
];

export const LIMITED_PACKS: readonly LimitedPackDef[] = [
  {
    id: LIMITED_PACK_DIAMOND_ID,
    name: "开服礼包",
    pay: "diamond",
    price: LIMITED_PACK_PRICE,
    gold: LIMITED_PACK_GOLD,
    diamond: 0,
    itemId: IDLE_ITEM_ID,
    itemName: IDLE_ITEM_NAME,
    itemCount: LIMITED_PACK_STONE,
    openThrough: LIMITED_PACK_DAYS,
  },
  {
    id: LIMITED_PACK_MOCK_ID,
    name: "限时补给",
    pay: "mock",
    price: 0,
    gold: 0,
    diamond: LIMITED_PACK_MOCK_DIAMOND,
    itemId: ITEM_EXP_POTION,
    itemName: "经验药水",
    itemCount: 1,
    openThrough: LIMITED_PACK_DAYS,
  },
];

export function findLimitedOffer(id: number): LimitedOffer | null {
  const offerId = finite(id);
  for (let i = 0; i < LIMITED_OFFERS.length; i++) {
    if (LIMITED_OFFERS[i].id === offerId) return LIMITED_OFFERS[i];
  }
  return null;
}

export function findLimitedPack(id: number): LimitedPackDef | null {
  const packId = finite(id);
  for (let i = 0; i < LIMITED_PACKS.length; i++) {
    if (LIMITED_PACKS[i].id === packId) return LIMITED_PACKS[i];
  }
  return null;
}

export function listLimitedOffers(
  boughtOf: (id: number) => number,
  ownedOf: (itemId: number) => number
): LimitedOfferRow[] {
  const out: LimitedOfferRow[] = [];
  for (let i = 0; i < LIMITED_OFFERS.length; i++) {
    const offer = LIMITED_OFFERS[i];
    out.push(toOfferRow(offer, boughtOf(offer.id), offer.pay === "item" ? ownedOf(offer.costItemId) : 0));
  }
  return out;
}

export function listLimitedPacks(openDay: number, boughtOf: (id: number) => boolean): LimitedPackRow[] {
  const out: LimitedPackRow[] = [];
  for (let i = 0; i < LIMITED_PACKS.length; i++) {
    const pack = LIMITED_PACKS[i];
    out.push(toPackRow(pack, openDay, boughtOf(pack.id)));
  }
  return out;
}

export function limitedDaysLeft(openDay: number, through: number): number {
  const day = finite(openDay);
  const end = finite(through);
  if (day < 1 || end < 1 || day > end) return 0;
  return end - day + 1;
}

export function limitedCountdown(openDay: number, through = LIMITED_PACK_DAYS): string {
  const left = limitedDaysLeft(openDay, through);
  if (left <= 0) return "开服第 " + finite(openDay) + " 天 · 本轮已结束";
  return "开服第 " + finite(openDay) + " 天 · 剩余 " + left + " 天";
}

export function limitedHeadLine(openDay: number): string {
  return "开服第 " + finite(openDay) + " 天 · 兑换和点石按天刷新";
}

export function limitedWalletLine(gold: number, diamond: number, beans: number): string {
  return "持有金币 " + finite(gold) + " · 钻石 " + finite(diamond) + " · 咖啡豆 ×" + finite(beans);
}

export function limitedOfferLine(row: LimitedOfferRow): string {
  const cost = row.pay === "gold" ? "金币 " + finite(row.costCount) : (row.costName || "材料") + " ×" + finite(row.costCount);
  const reward = (row.rewardName || "道具") + " ×" + finite(row.rewardCount);
  const stock = "今日 " + finite(row.bought) + "/" + finite(row.limit);
  if (row.pay === "item") return cost + " → " + reward + " · " + stock + " · 持有 ×" + finite(row.owned);
  return cost + " → " + reward + " · " + stock;
}

export function limitedOfferSoldOut(row: LimitedOfferRow): boolean {
  return finite(row.limit) > 0 && finite(row.bought) >= finite(row.limit);
}

export function limitedOfferButton(row: LimitedOfferRow): string {
  return limitedOfferSoldOut(row) ? "已兑完" : "兑换";
}

export function limitedExchangeToast(costName: string, costCount: number, pay: string, rewardName: string, rewardCount: number): string {
  const cost = pay === "gold" ? "金币 " + finite(costCount) : (costName || "材料") + " ×" + finite(costCount);
  return "兑换成功：消耗" + cost + "，获得" + (rewardName || "道具") + " ×" + finite(rewardCount);
}

export function limitedSoldOutToast(rewardName: string): string {
  return (rewardName || "这样兑换") + "今日已兑完";
}

export function limitedGoldShortToast(cost: number): string {
  return "金币不足，兑换需要 " + finite(cost);
}

export function limitedItemShortToast(name: string, cost: number): string {
  return (name || "材料") + "不足，兑换需要 " + finite(cost);
}

export function limitedMissingToast(): string {
  return "没有这个兑换";
}

export function limitedExchangeFailToast(
  resp: { code?: number; pay?: string; costName?: string; costCount?: number; rewardName?: string } | null | undefined
): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  const cost = resp && typeof resp.costCount === "number" ? resp.costCount : 0;
  const costName = resp && resp.costName ? resp.costName : "";
  const rewardName = resp && resp.rewardName ? resp.rewardName : "";
  if (code === ErrorCode.LIMITED_EX_NOT_FOUND) return limitedMissingToast();
  if (code === ErrorCode.LIMITED_EX_SOLD_OUT) return limitedSoldOutToast(rewardName);
  if (code === ErrorCode.LIMITED_EX_GOLD_SHORT) return limitedGoldShortToast(cost);
  if (code === ErrorCode.LIMITED_EX_ITEM_SHORT) return limitedItemShortToast(costName, cost);
  return errorText(code);
}

export function limitedStoneFree(used: number): boolean {
  return finite(used) <= 0;
}

export function limitedStoneCost(used: number): number {
  return limitedStoneFree(used) ? 0 : LIMITED_STONE_DIAMOND;
}

export function limitedStoneLine(used: number, limit: number, goldGain: number, diamondCost: number): string {
  const left = Math.max(0, finite(limit) - finite(used));
  const remain = "今日剩余 " + left + "/" + finite(limit);
  if (limitedStoneFree(used) && left > 0) return remain + " · 今日首次免费，可得金币 " + finite(goldGain);
  if (left <= 0) return remain + " · 今日次数已用完";
  return remain + " · 钻石 " + finite(diamondCost) + " 换金币 " + finite(goldGain);
}

export function limitedStoneRateLine(): string {
  return "固定汇率：钻石 " + LIMITED_STONE_DIAMOND + " 换金币 " + LIMITED_STONE_GOLD + "。每天第一次免费";
}

export function limitedStoneButton(used: number, limit: number): string {
  if (finite(used) >= finite(limit)) return "今日已用完";
  if (limitedStoneFree(used)) return "免费点石";
  return "钻石点石（" + LIMITED_STONE_DIAMOND + "）";
}

export function limitedStoneToast(free: boolean, cost: number, goldGain: number, used: number, limit: number): string {
  const left = Math.max(0, finite(limit) - finite(used));
  const remain = "今日剩余 " + left + "/" + finite(limit);
  if (free) return "点石成功：免费获得金币 " + finite(goldGain) + "，" + remain;
  return "点石成功：消耗钻石 " + finite(cost) + "，获得金币 " + finite(goldGain) + "，" + remain;
}

export function limitedStoneNoChanceToast(): string {
  return "今日点石次数已用完";
}

export function limitedStoneShortToast(cost: number): string {
  return "钻石不足，点石需要 " + finite(cost);
}

export function limitedStoneFailToast(resp: { code?: number; cost?: number } | null | undefined): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  const cost = resp && typeof resp.cost === "number" ? resp.cost : LIMITED_STONE_DIAMOND;
  if (code === ErrorCode.LIMITED_STONE_NO_CHANCE) return limitedStoneNoChanceToast();
  if (code === ErrorCode.LIMITED_STONE_SHORT) return limitedStoneShortToast(cost);
  return errorText(code);
}

export function limitedPackEnded(openDay: number, through: number): boolean {
  return limitedDaysLeft(openDay, through) <= 0;
}

export function limitedPackLine(row: LimitedPackRow): string {
  const price = row.pay === "mock" ? "模拟购买" : "钻石 " + finite(row.price);
  const reward = limitedRewardText(row.gold, row.diamond, row.itemName, row.itemCount);
  return (row.name || "礼包") + " · " + price + " · " + reward + " · " + limitedPackStatus(row);
}

export function limitedPackButton(row: LimitedPackRow): string {
  if (row.bought) return "已经购买";
  if (row.ended) return "已结束";
  if (row.pay === "mock") return "模拟购买";
  return "购买";
}

export function limitedPackToast(
  name: string,
  pay: string,
  price: number,
  gold: number,
  diamond: number,
  itemName: string,
  itemCount: number
): string {
  const head = pay === "mock" ? "模拟购买成功：" : "购买成功：";
  const spend = pay === "diamond" && finite(price) > 0 ? "消耗钻石 " + finite(price) + "，" : "";
  return head + (name || "礼包") + "，" + spend + limitedRewardText(gold, diamond, itemName, itemCount);
}

export function limitedPackBoughtToast(name: string): string {
  return (name || "这个礼包") + "已经购买";
}

export function limitedPackEndedToast(): string {
  return "限时礼包已结束";
}

export function limitedPackShortToast(name: string, price: number): string {
  return "钻石不足，" + (name || "限时礼包") + "需要 " + finite(price);
}

export function limitedPackMissingToast(): string {
  return "没有这个礼包";
}

export function limitedPackFailToast(
  resp: { code?: number; name?: string; price?: number } | null | undefined
): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  const name = resp && resp.name ? resp.name : "";
  const price = resp && typeof resp.price === "number" ? resp.price : LIMITED_PACK_PRICE;
  if (code === ErrorCode.LIMITED_PACK_NOT_FOUND) return limitedPackMissingToast();
  if (code === ErrorCode.LIMITED_PACK_BOUGHT) return limitedPackBoughtToast(name);
  if (code === ErrorCode.LIMITED_PACK_ENDED) return limitedPackEndedToast();
  if (code === ErrorCode.LIMITED_PACK_SHORT) return limitedPackShortToast(name, price);
  return errorText(code);
}

export function limitedRewardText(gold: number, diamond: number, itemName: string, itemCount: number): string {
  const parts: string[] = [];
  if (finite(gold) > 0) parts.push("金币 +" + finite(gold));
  if (finite(diamond) > 0) parts.push("钻石 +" + finite(diamond));
  if (finite(itemCount) > 0 && itemName) parts.push(itemName + " ×" + finite(itemCount));
  if (parts.length === 0) return "无额外道具";
  return parts.join("、");
}

/** 成功才把钱包写进 Session。失败不动。道具在下一次背包里读到。 */
export function applyLimitedWallet(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

function toOfferRow(offer: LimitedOffer, bought: number, owned: number): LimitedOfferRow {
  let count = finite(bought);
  if (count < 0) count = 0;
  if (offer.limit > 0 && count > offer.limit) count = offer.limit;
  return {
    id: offer.id,
    pay: offer.pay,
    costItemId: offer.costItemId,
    costName: offer.costName,
    costCount: offer.costCount,
    rewardItemId: offer.rewardItemId,
    rewardName: offer.rewardName,
    rewardCount: offer.rewardCount,
    bought: count,
    limit: offer.limit,
    owned: finite(owned),
  };
}

function toPackRow(pack: LimitedPackDef, openDay: number, bought: boolean): LimitedPackRow {
  const ended = limitedPackEnded(openDay, pack.openThrough);
  return {
    id: pack.id,
    name: pack.name,
    pay: pack.pay,
    price: pack.price,
    gold: pack.gold,
    diamond: pack.diamond,
    itemId: pack.itemId,
    itemName: pack.itemName,
    itemCount: pack.itemCount,
    bought: bought === true,
    ended,
    countdown: limitedCountdown(openDay, pack.openThrough),
  };
}

function limitedPackStatus(row: LimitedPackRow): string {
  if (row.bought) return "已经购买";
  if (row.ended) return "已结束";
  return "可购买";
}

function finite(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
