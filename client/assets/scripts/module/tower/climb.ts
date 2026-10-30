import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../idle/rewards";

/**
 * 幻境之塔（C11）。当前层一键结算，不播战报。
 * 战力不低于守关则胜，层数 +1，给金币和强化石。失败层数不变。
 * 每天 10 次，按 Mock 开服天重置。通关第 20 层后不再前进。
 * 入口锁在 opencondition 的 main_fantasy_tower（主线 Lv16），这里不重复判等级。
 * 不是幻魔塔。幻魔塔另走开服第 30 天。
 *
 * 起步名册战力 165，能过第 1 到第 4 层（战力 100 / 120 / 140 / 160），第 5 层 180 会失败。
 */

export const TOWER_MAX_FLOOR = 20;
export const TOWER_DAILY_LIMIT = 10;
export const TOWER_WIN_STONE = 1;
export const TOWER_ITEM_ID = IDLE_ITEM_ID;
export const TOWER_ITEM_NAME = IDLE_ITEM_NAME;
export const TOWER_GOLD_BASE = 20;
export const TOWER_GOLD_STEP = 10;
export const TOWER_POWER_BASE = 100;
export const TOWER_POWER_STEP = 20;

const GUARDIANS = ["迷雾守卫", "镜影剑士", "梦境法师", "星河幻影", "塔心守关"];

export interface TowerSettle {
  win: boolean;
  floor: number;
  nextFloor: number;
  floorPower: number;
  goldGain: number;
  itemGain: number;
}

export function clampTowerFloor(floor: number | undefined): number {
  if (typeof floor !== "number" || !isFinite(floor)) return 1;
  const value = Math.floor(floor);
  if (value < 1) return 1;
  if (value > TOWER_MAX_FLOOR + 1) return TOWER_MAX_FLOOR + 1;
  return value;
}

export function towerCleared(floor: number | undefined): boolean {
  return clampTowerFloor(floor) > TOWER_MAX_FLOOR;
}

/** 第 1 层战力 100，之后每层 +20。已到塔顶为 0。 */
export function floorPower(floor: number | undefined): number {
  const value = clampTowerFloor(floor);
  if (value > TOWER_MAX_FLOOR) return 0;
  return TOWER_POWER_BASE + (value - 1) * TOWER_POWER_STEP;
}

/** 第 1 层 30 金币，之后每层再多 10。失败和塔顶为 0。 */
export function goldForFloor(floor: number | undefined): number {
  const value = clampTowerFloor(floor);
  if (value > TOWER_MAX_FLOOR) return 0;
  return TOWER_GOLD_BASE + value * TOWER_GOLD_STEP;
}

export function floorGuardianName(floor: number | undefined): string {
  const value = clampTowerFloor(floor);
  if (value > TOWER_MAX_FLOOR) return "";
  const index = (value - 1) % GUARDIANS.length;
  return GUARDIANS[index];
}

export function settleTower(playerPower: number, floor: number | undefined): TowerSettle {
  const current = clampTowerFloor(floor);
  const need = floorPower(current);
  if (current > TOWER_MAX_FLOOR) {
    return { win: false, floor: current, nextFloor: current, floorPower: 0, goldGain: 0, itemGain: 0 };
  }
  const win = finite(playerPower) >= need;
  return {
    win,
    floor: current,
    nextFloor: win ? current + 1 : current,
    floorPower: need,
    goldGain: win ? goldForFloor(current) : 0,
    itemGain: win ? TOWER_WIN_STONE : 0,
  };
}

export function towerFloorLine(
  floor: number,
  maxFloor: number,
  name: string,
  power: number,
  cleared: boolean
): string {
  if (cleared) return "已到达塔顶 · 共 " + finite(maxFloor) + " 层";
  const who = name || "守关";
  return (
    "当前第 " +
    finite(floor) +
    " 层 / " +
    finite(maxFloor) +
    " · 守关 " +
    who +
    " · 战力 " +
    finite(power)
  );
}

export function towerPowerLine(playerPower: number, floorPowerValue: number, cleared: boolean): string {
  if (cleared) return "我方战力 " + finite(playerPower);
  const tag = finite(playerPower) >= finite(floorPowerValue) ? "可胜" : "较难";
  return "我方战力 " + finite(playerPower) + " · " + tag;
}

export function towerDailyLine(used: number, limit: number, gold: number, stone: number): string {
  const left = chancesLeft(used, limit);
  return (
    "今日剩余 " +
    left +
    "/" +
    finite(limit) +
    " · 持有金币 " +
    finite(gold) +
    " · 强化石 ×" +
    finite(stone)
  );
}

export function towerChallengeButton(floor: number, used: number, limit: number, cleared: boolean): string {
  if (cleared) return "已到塔顶";
  if (chancesLeft(used, limit) <= 0) return "今日已用完";
  return "挑战第" + finite(floor) + "层（剩余 " + chancesLeft(used, limit) + "）";
}

export function towerReportLine(playerPower: number, floorPowerValue: number, floor: number, win: boolean): string {
  return "战力 " + finite(playerPower) + " 对 " + finite(floorPowerValue) + "，第" + finite(floor) + "层" + (win ? "胜利" : "失败");
}

export function towerWinToast(
  floor: number,
  nextFloor: number,
  goldGain: number,
  itemName: string,
  itemGain: number
): string {
  const name = itemName || TOWER_ITEM_NAME;
  return (
    "通关第" +
    finite(floor) +
    "层，进入第" +
    finite(nextFloor) +
    "层，金币 +" +
    finite(goldGain) +
    "，" +
    name +
    " ×" +
    finite(itemGain)
  );
}

export function towerLoseToast(floor: number): string {
  return "第" + finite(floor) + "层挑战失败，层数不变";
}

export function towerNoChanceToast(): string {
  return "今日挑战次数已用完";
}

export function towerClearedToast(): string {
  return "已到达塔顶";
}

export function towerResultToast(
  floor: number,
  nextFloor: number,
  win: boolean,
  goldGain: number,
  itemName: string,
  itemGain: number
): string {
  if (win) return towerWinToast(floor, nextFloor, goldGain, itemName, itemGain);
  return towerLoseToast(floor);
}

export function towerFailToast(resp: { code?: number } | null | undefined): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  if (code === ErrorCode.TOWER_NO_CHANCE) return towerNoChanceToast();
  if (code === ErrorCode.TOWER_CLEARED) return towerClearedToast();
  return errorText(code);
}

/** 挑战打完才把钱包写进 Session。失败或次数用完时金币不变，调用方可以不调。 */
export function applyTowerChallenge(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
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
