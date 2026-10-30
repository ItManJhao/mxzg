import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { HeroRosterEntry, toHeroCard } from "../hero/growth";
import { ArenaOpponent } from "../../net/protocol/types";

/**
 * 竞技场（C10）。固定五名对手，一键结算，不播战报。
 * 玩家战力是名册攻击之和（含武器）。战力不低于对手则胜。
 * 积分和约排名是占位，不是真实排行榜。每天 5 次，按 Mock 开服天重置。
 * 入口锁在 opencondition 的 main_pvp（主线 Lv8），这里不重复判等级。
 */

export const ARENA_START_SCORE = 1000;
export const ARENA_SCORE_MIN = 800;
export const ARENA_SCORE_MAX = 2000;
export const ARENA_DAILY_LIMIT = 5;
export const ARENA_WIN_SCORE = 24;
export const ARENA_LOSE_SCORE = 12;
export const ARENA_WIN_GOLD = 20;

/** 由易到难。起步名册战力 165，能赢前两名。 */
export const ARENA_OPPONENTS: ArenaOpponent[] = [
  { id: 1, name: "见习剑士", score: 960, power: 140 },
  { id: 2, name: "流浪佣兵", score: 1000, power: 165 },
  { id: 3, name: "铁壁守卫", score: 1060, power: 220 },
  { id: 4, name: "银月骑士", score: 1140, power: 320 },
  { id: 5, name: "冠军候补", score: 1300, power: 480 },
];

export interface ArenaSettle {
  win: boolean;
  scoreBefore: number;
  score: number;
  scoreDelta: number;
  goldGain: number;
  rank: number;
}

export function listArenaOpponents(): ArenaOpponent[] {
  const out: ArenaOpponent[] = [];
  for (let i = 0; i < ARENA_OPPONENTS.length; i++) {
    const row = ARENA_OPPONENTS[i];
    out.push({ id: row.id, name: row.name, score: row.score, power: row.power });
  }
  return out;
}

export function findArenaOpponent(id: number): ArenaOpponent | null {
  for (let i = 0; i < ARENA_OPPONENTS.length; i++) {
    if (ARENA_OPPONENTS[i].id === id) return ARENA_OPPONENTS[i];
  }
  return null;
}

/** 名册攻击之和。空名单为 0。武器加成算在攻击里。 */
export function rosterPower(heroes: HeroRosterEntry[] | null | undefined): number {
  if (!heroes) return 0;
  let sum = 0;
  for (let i = 0; i < heroes.length; i++) sum += toHeroCard(heroes[i]).atk;
  return sum;
}

export function clampArenaScore(score: number | undefined): number {
  if (typeof score !== "number" || !isFinite(score)) return ARENA_START_SCORE;
  const value = Math.floor(score);
  if (value < ARENA_SCORE_MIN) return ARENA_SCORE_MIN;
  if (value > ARENA_SCORE_MAX) return ARENA_SCORE_MAX;
  return value;
}

/** 1000 分大约第 41 名。分越高名次越靠前，最低第 1，最高封在第 200。 */
export function rankFromScore(score: number | undefined): number {
  const value = clampArenaScore(score);
  let rank = 1 + Math.floor((1200 - value) / 5);
  if (rank < 1) rank = 1;
  if (rank > 200) rank = 200;
  return rank;
}

export function settleArena(playerPower: number, opponentPower: number, score: number | undefined): ArenaSettle {
  const before = clampArenaScore(score);
  const win = finite(playerPower) >= finite(opponentPower);
  const raw = win ? before + ARENA_WIN_SCORE : before - ARENA_LOSE_SCORE;
  const next = clampArenaScore(raw);
  return {
    win,
    scoreBefore: before,
    score: next,
    scoreDelta: next - before,
    goldGain: win ? ARENA_WIN_GOLD : 0,
    rank: rankFromScore(next),
  };
}

export function arenaScoreLine(score: number, rank: number, power: number): string {
  return "积分 " + finite(score) + " · 约第 " + finite(rank) + " 名 · 战力 " + finite(power);
}

export function arenaDailyLine(used: number, limit: number, gold: number): string {
  const left = chancesLeft(used, limit);
  return "今日剩余 " + left + "/" + finite(limit) + " · 持有金币 " + finite(gold);
}

export function arenaRowText(name: string, score: number, power: number, playerPower: number): string {
  const tag = finite(playerPower) >= finite(power) ? "可胜" : "较难";
  return (name || "对手") + " · 积分 " + finite(score) + " · 战力 " + finite(power) + " · " + tag;
}

export function challengeButtonText(name: string | null, used: number, limit: number): string {
  if (chancesLeft(used, limit) <= 0) return "今日已用完";
  const left = chancesLeft(used, limit);
  if (!name) return "挑战（剩余 " + left + "）";
  return "挑战" + name + "（剩余 " + left + "）";
}

export function arenaReportLine(playerPower: number, opponentPower: number, win: boolean): string {
  return "战力 " + finite(playerPower) + " 对 " + finite(opponentPower) + "，" + (win ? "胜利" : "失败");
}

export function arenaWinToast(name: string, scoreDelta: number, goldGain: number): string {
  return (
    "挑战胜利：击败" +
    (name || "对手") +
    "，积分 +" +
    finite(scoreDelta) +
    "，金币 +" +
    finite(goldGain)
  );
}

export function arenaLoseToast(name: string, scoreDelta: number): string {
  const drop = finite(scoreDelta);
  const lost = drop < 0 ? -drop : 0;
  if (lost <= 0) return "挑战失败：不敌" + (name || "对手") + "，积分没有再降";
  return "挑战失败：不敌" + (name || "对手") + "，积分 -" + lost;
}

export function arenaResultToast(
  name: string,
  win: boolean,
  scoreDelta: number,
  goldGain: number
): string {
  if (win) return arenaWinToast(name, scoreDelta, goldGain);
  return arenaLoseToast(name, scoreDelta);
}

export function arenaNoChanceToast(): string {
  return "今日挑战次数已用完";
}

export function arenaMissingToast(): string {
  return "没有这位对手";
}

export function arenaFailToast(resp: { code?: number } | null | undefined): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  if (code === ErrorCode.ARENA_NO_CHANCE) return arenaNoChanceToast();
  if (code === ErrorCode.ARENA_NOT_FOUND) return arenaMissingToast();
  return errorText(code);
}

export function emptyArenaToast(): string {
  return "没有可挑战的对手";
}

/** 挑战打完才把钱包写进 Session。失败或次数用完时金币不变，调用方可以不调。 */
export function applyArenaChallenge(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
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
