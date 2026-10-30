import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import {
  clampWeaponLevel,
  missingHeroToast,
  toHeroCard,
  WEAPON_MAX_LEVEL,
  WEAPON_NAME,
  weaponAtkBonus,
  HeroRosterEntry,
} from "../hero/growth";
import { SmithGear } from "../../net/protocol/types";

/**
 * 铁匠铺（C9）。只做一件事：把英雄的新手短剑强化一级。
 * 消耗金币和强化石。强化石来自挂机或邮件，背包里不能直接使用。
 * 没有武器时先补 Lv1，这一步不扣金币也不扣石头。
 */

/** 每次强化消耗 1 个强化石。 */
export const STRENGTHEN_STONE_COST = 1;

/** 未满级：Lv1→2 为 20 金，之后每级再 +10。满级为 0。 */
export function strengthenGoldCost(level: number | undefined): number {
  const lv = clampWeaponLevel(level);
  if (lv >= WEAPON_MAX_LEVEL) return 0;
  return 20 + (lv - 1) * 10;
}

export function toSmithGear(entry: HeroRosterEntry): SmithGear {
  const card = toHeroCard(entry);
  const level = card.weaponLevel;
  const capped = level >= WEAPON_MAX_LEVEL;
  return {
    heroId: card.id,
    heroName: card.name,
    weaponName: card.weaponName || WEAPON_NAME,
    weaponLevel: level,
    maxLevel: WEAPON_MAX_LEVEL,
    atk: card.atk,
    weaponAtk: card.weaponAtk,
    nextWeaponAtk: capped ? card.weaponAtk : weaponAtkBonus(level + 1),
    goldCost: strengthenGoldCost(level),
    stoneCost: capped ? 0 : STRENGTHEN_STONE_COST,
  };
}

export function smithWalletLine(gold: number, stones: number): string {
  return "持有金币 " + finite(gold) + " · 强化石 ×" + finite(stones);
}

export function smithRowText(name: string, weaponLevel: number): string {
  return (name || "英雄") + " · " + WEAPON_NAME + " Lv" + finite(weaponLevel);
}

export function smithHeroLine(gear: SmithGear): string {
  return gear.heroName + " · " + gear.weaponName + " Lv" + gear.weaponLevel + " · 攻击 " + gear.atk;
}

export function smithCostLine(gear: SmithGear): string {
  if (gear.weaponLevel >= gear.maxLevel) return "武器已达最高强化";
  const nextAtk = gear.atk - gear.weaponAtk + gear.nextWeaponAtk;
  return (
    "强化至 Lv" +
    (gear.weaponLevel + 1) +
    " 后攻击 " +
    nextAtk +
    " · 消耗金币 " +
    gear.goldCost +
    "、强化石 ×" +
    gear.stoneCost
  );
}

export function strengthenButtonText(gear: SmithGear | null): string {
  if (!gear) return "强化";
  if (gear.weaponLevel >= gear.maxLevel) return "已满级";
  return "强化（金币 " + gear.goldCost + " · 强化石 ×" + gear.stoneCost + "）";
}

export function weaponLineText(weaponName: string | undefined, level: number | undefined, bonus: number | undefined): string {
  const name = weaponName || WEAPON_NAME;
  const lv = clampWeaponLevel(level);
  const atk = typeof bonus === "number" && isFinite(bonus) ? Math.floor(bonus) : weaponAtkBonus(lv);
  return "武器 " + name + " Lv" + lv + " · 攻击 +" + atk;
}

export function strengthenToast(name: string, weapon: string, level: number, gold: number, stone: number): string {
  const who = name || "英雄";
  const item = weapon || WEAPON_NAME;
  return (
    "强化成功：" +
    who +
    "的" +
    item +
    "升至 Lv" +
    finite(level) +
    "，消耗金币 " +
    finite(gold) +
    "、强化石 ×" +
    finite(stone)
  );
}

export function smithGoldShortToast(need: number): string {
  return "金币不足，强化需要 " + finite(need);
}

export function smithStoneShortToast(need: number): string {
  return "强化石不足，强化需要 " + finite(need);
}

export function smithMaxToast(): string {
  return "武器已达最高强化";
}

export function smithFailToast(
  resp: { code?: number; needGold?: number; needStone?: number; goldCost?: number; stoneCost?: number } | null | undefined
): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  if (code === ErrorCode.SMITH_GOLD_SHORT) {
    const need = resp && typeof resp.needGold === "number" ? resp.needGold : 0;
    if (need > 0) return smithGoldShortToast(need);
    return errorText(ErrorCode.SMITH_GOLD_SHORT);
  }
  if (code === ErrorCode.SMITH_STONE_SHORT) {
    const need = resp && typeof resp.needStone === "number" ? resp.needStone : 0;
    if (need > 0) return smithStoneShortToast(need);
    return errorText(ErrorCode.SMITH_STONE_SHORT);
  }
  if (code === ErrorCode.SMITH_LEVEL_MAX) return smithMaxToast();
  if (code === ErrorCode.HERO_NOT_FOUND) return missingHeroToast();
  return errorText(code);
}

/** 强化成功才把钱包写进 Session。失败不动。武器等级在下一次英雄列表里读到。 */
export function applySmithStrengthen(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

export function emptySmithToast(): string {
  return "没有可强化的英雄";
}

function finite(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
