import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { ITEM_EXP_POTION, ITEM_GOLD_BAG } from "../bag/items";
import { IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../idle/rewards";
import { ShopCurrency, ShopSku } from "../../net/protocol/types";

/**
 * 基础商店。样例 opencondition 没有商店行，新号即可进。
 * 卖背包里已有的几种道具：强化石、小金币袋、经验药水。
 * 召唤没有单独的消耗品，仍直接花钻石，这里不另卖召唤券。
 * 每样有今日限购。次数按 Mock 开服天清空，已经买进背包的不收回。
 */

export const SHOP_STONE_ID = 1;
export const SHOP_GOLD_BAG_ID = 2;
export const SHOP_POTION_ID = 3;

export const SHOP_STONE_COUNT = 5;
export const SHOP_STONE_PRICE = 40;
export const SHOP_STONE_LIMIT = 3;

export const SHOP_BAG_PRICE = 8;
export const SHOP_BAG_LIMIT = 2;

export const SHOP_POTION_PRICE = 50;
export const SHOP_POTION_LIMIT = 2;

export interface ShopOffer {
  id: number;
  itemId: number;
  name: string;
  count: number;
  currency: ShopCurrency;
  price: number;
  limit: number;
}

/** 固定货架。价格和限购写在这里，打开就能看到。 */
export const SHOP_OFFERS: readonly ShopOffer[] = [
  {
    id: SHOP_STONE_ID,
    itemId: IDLE_ITEM_ID,
    name: IDLE_ITEM_NAME,
    count: SHOP_STONE_COUNT,
    currency: "gold",
    price: SHOP_STONE_PRICE,
    limit: SHOP_STONE_LIMIT,
  },
  {
    id: SHOP_GOLD_BAG_ID,
    itemId: ITEM_GOLD_BAG,
    name: "小金币袋",
    count: 1,
    currency: "diamond",
    price: SHOP_BAG_PRICE,
    limit: SHOP_BAG_LIMIT,
  },
  {
    id: SHOP_POTION_ID,
    itemId: ITEM_EXP_POTION,
    name: "经验药水",
    count: 1,
    currency: "gold",
    price: SHOP_POTION_PRICE,
    limit: SHOP_POTION_LIMIT,
  },
];

export function findShopOffer(id: number): ShopOffer | null {
  const skuId = finite(id);
  for (let i = 0; i < SHOP_OFFERS.length; i++) {
    if (SHOP_OFFERS[i].id === skuId) return SHOP_OFFERS[i];
  }
  return null;
}

export function listShopSkus(
  boughtOf: (id: number) => number,
  ownedOf: (itemId: number) => number
): ShopSku[] {
  const out: ShopSku[] = [];
  for (let i = 0; i < SHOP_OFFERS.length; i++) {
    const offer = SHOP_OFFERS[i];
    out.push(toShopSku(offer, boughtOf(offer.id), ownedOf(offer.itemId)));
  }
  return out;
}

export function shopRefreshLine(openDay: number): string {
  return "限购随开服天刷新 · 当前开服第 " + finite(openDay) + " 天";
}

export function shopWalletLine(gold: number, diamond: number): string {
  return "持有金币 " + finite(gold) + " · 钻石 " + finite(diamond);
}

export function shopSkuLine(sku: ShopSku): string {
  const bundle = (sku.name || "商品") + " ×" + finite(sku.count);
  const stock = shopStockText(sku);
  return bundle + " · " + payName(sku.currency) + " " + finite(sku.price) + " · " + stock + " · 背包 ×" + finite(sku.owned);
}

export function shopBuyButton(sku: ShopSku): string {
  if (shopSoldOut(sku)) return "已售罄";
  return "购买";
}

export function shopBuyToast(name: string, count: number, currency: ShopCurrency | string, price: number): string {
  const item = name || "商品";
  return "购买成功：" + item + " ×" + finite(count) + "，消耗" + payName(currency) + " " + finite(price);
}

export function shopGoldShortToast(price: number): string {
  return "金币不足，购买需要 " + finite(price);
}

export function shopDiamondShortToast(price: number): string {
  return "钻石不足，购买需要 " + finite(price);
}

export function shopSoldOutToast(name: string): string {
  if (name) return name + "今日已售罄";
  return "今日已售罄";
}

export function shopMissingToast(): string {
  return "没有这个商品";
}

export function shopFailToast(
  resp: { code?: number; name?: string; price?: number } | null | undefined
): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  const name = resp && typeof resp.name === "string" ? resp.name : "";
  const price = resp && typeof resp.price === "number" ? resp.price : 0;
  if (code === ErrorCode.SHOP_NOT_FOUND) return shopMissingToast();
  if (code === ErrorCode.SHOP_SOLD_OUT) return shopSoldOutToast(name);
  if (code === ErrorCode.SHOP_GOLD_SHORT) return shopGoldShortToast(price);
  if (code === ErrorCode.SHOP_DIAMOND_SHORT) return shopDiamondShortToast(price);
  return errorText(code);
}

/** 购买成功才把钱包写进 Session。失败不动。道具在下一次背包里读到。 */
export function applyShopBuy(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

export function shopSoldOut(sku: ShopSku): boolean {
  return finite(sku.limit) > 0 && finite(sku.bought) >= finite(sku.limit);
}

function toShopSku(offer: ShopOffer, bought: number, owned: number): ShopSku {
  return {
    id: offer.id,
    itemId: offer.itemId,
    name: offer.name,
    count: offer.count,
    currency: offer.currency,
    price: offer.price,
    bought: clampBought(bought, offer.limit),
    limit: offer.limit,
    owned: finite(owned),
  };
}

function shopStockText(sku: ShopSku): string {
  return "今日 " + finite(sku.bought) + "/" + finite(sku.limit);
}

function payName(currency: ShopCurrency | string): string {
  if (currency === "diamond") return "钻石";
  return "金币";
}

function clampBought(bought: number, limit: number): number {
  let count = finite(bought);
  if (count < 0) count = 0;
  const cap = finite(limit);
  if (cap > 0 && count > cap) count = cap;
  return count;
}

function finite(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
