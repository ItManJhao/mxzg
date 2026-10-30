import { heroBaseHp } from "../../config/lookups";
import { Session } from "../../core/Session";
import { StageResultResp, StageReward } from "../../net/protocol/types";

/**
 * 主线简化战报。不改协议号。
 * 我方血量在 herobase 已登记时用 type 10101001、1 星，否则仍是 100。敌方仍是 120。
 * 真服战报上的 hp 不从这张表改写。
 * 自然推进时等级 = 1 + 已通关，下一关 = 已通关 + 1，所以「关卡号 ≤ 等级」必胜，
 * 连打可以推过第 70 关。高于等级的跳关判负。
 * 主线页打当前关时会把等级抬到至少等于关卡号，避免等级暂时落后时判负卡死。
 * 撤退由界面改判负，不在这里自动出现。
 * 「推关到70（调试）」只提供文案和目标关；结算仍走 Mock 的 stage.push，金币和一关关打相同。
 */

/** 每关胜利的占位金币。主线、快速作战和推关调试用同一个数。 */
export const STAGE_WIN_GOLD = 10;
/** 七日目标第 7 日要的关卡。调试按钮推到这里，含本关。 */
export const MAINLINE_PUSH_STAGE = 70;
/** stage.push 单次允许的目标上限。手动 stage.result 不受这限制，70 关之后仍能一关关打。 */
export const MAINLINE_PUSH_MAX = 200;

export type StageRowState = "cleared" | "current" | "locked";

export interface StageRow {
  stageId: number;
  state: StageRowState;
}

export type BattleReason = "clear" | "retreat" | "overreach";
export type BattleActor = "ally" | "enemy" | "none";

export interface BattleUnit {
  name: string;
  hp: number;
  maxHp: number;
}

/** 可选出场。不传时我方仍用角色名、护卫、术士，敌方仍是前锋、守卫、术士。 */
export interface BattleCast {
  name: string;
  maxHp?: number;
}

export interface BattleRound {
  round: number;
  line: string;
  actor: BattleActor;
  allies: BattleUnit[];
  enemies: BattleUnit[];
}

export interface BattlePlan {
  stageId: number;
  level: number;
  win: boolean;
  reason: BattleReason;
  rounds: BattleRound[];
}

const WINDOW = 6;
const ALLY_HP = 100;
const ENEMY_HP = 120;

export function normalizeStageId(stageId: number): number {
  if (typeof stageId !== "number" || !isFinite(stageId) || stageId < 1) return 1;
  return Math.floor(stageId);
}

export function normalizeLevel(level: number): number {
  if (typeof level !== "number" || !isFinite(level) || level < 1) return 1;
  return Math.floor(level);
}

/** 列表只露当前关附近几关。已通关 / 当前 / 未开启。 */
export function listStages(current: number, count = WINDOW): StageRow[] {
  const currentId = normalizeStageId(current);
  const size = count >= 1 ? Math.floor(count) : WINDOW;
  let start = currentId - 2;
  if (start < 1) start = 1;
  const rows: StageRow[] = [];
  for (let i = 0; i < size; i++) {
    const stageId = start + i;
    let state: StageRowState = "locked";
    if (stageId < currentId) state = "cleared";
    else if (stageId === currentId) state = "current";
    rows.push({ stageId, state });
  }
  return rows;
}

/** 只能打下一关。返回 null 表示可以进。文案给 Toast。 */
export function challengeBlock(stageId: number, current: number): string | null {
  const id = normalizeStageId(stageId);
  const next = normalizeStageId(current);
  if (id < next) return "第" + id + "关已通关";
  if (id > next) return "请先通关第" + next + "关";
  return null;
}

export function planBattle(input: {
  stageId: number;
  level: number;
  roleName: string;
  retreat?: boolean;
  /** 真服战报已有胜负时用。不传则仍按关卡和等级比较。 */
  forced?: "win" | "lose";
  /** Mock 名册。不传则第一格仍是角色名。 */
  allies?: BattleCast[];
  /** chapter 守方。不传则仍是前锋、守卫、术士。 */
  enemies?: BattleCast[];
}): BattlePlan {
  const stageId = normalizeStageId(input.stageId);
  const level = normalizeLevel(input.level);
  const roleName = (input.roleName || "").trim() || "勇者";
  if (input.retreat) {
    return {
      stageId,
      level,
      win: false,
      reason: "retreat",
      rounds: [frame(1, "主动撤退", "none", roleName, [1, 1, 1], [1, 1, 1], input.allies, input.enemies)],
    };
  }
  if (input.forced === "lose" || (input.forced !== "win" && stageId > level)) {
    return {
      stageId,
      level,
      win: false,
      reason: "overreach",
      rounds: [
        frame(1, "遭遇强敌", "enemy", roleName, [0.85, 1, 1], [1, 1, 1], input.allies, input.enemies),
        frame(2, "我方受挫", "enemy", roleName, [0.4, 0.7, 0.9], [0.95, 1, 1], input.allies, input.enemies),
        frame(3, "阵线崩溃", "enemy", roleName, [0, 0.25, 0.4], [0.9, 1, 1], input.allies, input.enemies),
        frame(4, "战斗失败", "enemy", roleName, [0, 0, 0], [0.85, 1, 1], input.allies, input.enemies),
      ],
    };
  }
  return {
    stageId,
    level,
    win: true,
    reason: "clear",
    rounds: [
      frame(1, "我方突进", "ally", roleName, [1, 1, 1], [0.72, 1, 1], input.allies, input.enemies),
      frame(2, "集火前排", "ally", roleName, [0.86, 0.94, 1], [0.28, 0.8, 1], input.allies, input.enemies),
      frame(3, "敌方反击", "enemy", roleName, [0.7, 0.82, 0.96], [0, 0.46, 0.74], input.allies, input.enemies),
      frame(4, "敌方溃败", "ally", roleName, [0.7, 0.82, 0.9], [0, 0, 0], input.allies, input.enemies),
    ],
  };
}

export function rewardName(id: number): string {
  if (id === 1) return "金币";
  if (id === 2) return "钻石";
  return "道具" + id;
}

export function rewardLines(rewards: StageReward[] | null | undefined): string[] {
  if (!rewards || rewards.length === 0) return ["没有奖励"];
  const lines: string[] = [];
  for (let i = 0; i < rewards.length; i++) {
    const count = rewards[i].count;
    if (typeof count !== "number" || !isFinite(count) || count <= 0) continue;
    lines.push(rewardName(rewards[i].id) + " +" + Math.floor(count));
  }
  return lines.length > 0 ? lines : ["没有奖励"];
}

export function winToast(stageId: number, rewards: StageReward[] | null | undefined): string {
  return "第" + normalizeStageId(stageId) + "关胜利，" + rewardLines(rewards)[0];
}

export function loseToast(stageId: number): string {
  return "第" + normalizeStageId(stageId) + "关挑战失败，进度不变";
}

export function pushButtonText(): string {
  return "推关到" + MAINLINE_PUSH_STAGE + "（调试）";
}

export function pushHint(): string {
  return "一关关仍可打。调试按钮连推到第" + MAINLINE_PUSH_STAGE + "关，每关金币 +" + STAGE_WIN_GOLD + "，不播战报";
}

export function pushToast(clearedStage: number, nextStageId: number, goldGain: number): string {
  const cleared = finiteStage(clearedStage);
  const next = finiteStage(nextStageId);
  const gold = finiteStage(goldGain);
  return "已推到第" + cleared + "关，金币 +" + gold + "，下一关 " + next;
}

export function pushAlreadyToast(clearedStage: number): string {
  return "已经通关第" + finiteStage(clearedStage) + "关";
}

export function reasonText(reason: BattleReason): string {
  if (reason === "retreat") return "已撤退";
  if (reason === "overreach") return "战力不足";
  return "顺利通关";
}

/** 把 stage.result 写进 Session。ok 为 false 时不动。没带钱包时按奖励 id 本地加。 */
export function applyStageProgress(result: StageResultResp): void {
  if (!result || result.ok !== true) return;
  if (typeof result.nextStageId === "number" && isFinite(result.nextStageId) && result.nextStageId >= 1) {
    Session.stageId = Math.floor(result.nextStageId);
  }
  if (Session.role && typeof result.level === "number" && isFinite(result.level)) {
    Session.role.level = Math.max(1, Math.floor(result.level));
  }
  if (typeof result.openDay === "number" && isFinite(result.openDay) && result.openDay >= 1) {
    Session.openDay = Math.floor(result.openDay);
  }
  if (typeof result.gold === "number" || typeof result.diamond === "number") {
    Session.applyCurrencies(result.gold, result.diamond);
    return;
  }
  const rewards = Array.isArray(result.rewards) ? result.rewards : [];
  let gold = Session.gold;
  let diamond = Session.diamond;
  for (let i = 0; i < rewards.length; i++) {
    const count = rewards[i].count;
    if (typeof count !== "number" || !isFinite(count) || count <= 0) continue;
    if (rewards[i].id === 1) gold += Math.floor(count);
    else if (rewards[i].id === 2) diamond += Math.floor(count);
  }
  Session.applyCurrencies(gold, diamond);
}

function frame(
  round: number,
  line: string,
  actor: BattleActor,
  roleName: string,
  allyRatio: number[],
  enemyRatio: number[],
  allyCast?: BattleCast[],
  enemyCast?: BattleCast[]
): BattleRound {
  const allyNames = [roleName, "护卫", "术士"];
  const enemyNames = ["前锋", "守卫", "术士"];
  const allies: BattleUnit[] = [];
  const enemies: BattleUnit[] = [];
  const allyHp = heroBaseHp(10101001, 1) ?? ALLY_HP;
  const useAllies = !!allyCast && allyCast.length > 0;
  const useEnemies = !!enemyCast && enemyCast.length > 0;
  for (let i = 0; i < allyNames.length; i++) {
    const ally = useAllies ? allyCast[i] : undefined;
    const enemy = useEnemies ? enemyCast[i] : undefined;
    const allyName = ally && ally.name ? ally.name : allyNames[i];
    const enemyName = enemy && enemy.name ? enemy.name : enemyNames[i];
    const allyMax = ally && typeof ally.maxHp === "number" && ally.maxHp > 0 ? Math.floor(ally.maxHp) : allyHp;
    const enemyMax = enemy && typeof enemy.maxHp === "number" && enemy.maxHp > 0 ? Math.floor(enemy.maxHp) : ENEMY_HP;
    allies.push(unit(allyName, allyMax, allyRatio[i]));
    enemies.push(unit(enemyName, enemyMax, enemyRatio[i]));
  }
  return { round, line: "第" + round + "回合 · " + line, actor, allies, enemies };
}

function finiteStage(value: number): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}

function unit(name: string, maxHp: number, ratio: number | undefined): BattleUnit {
  let clamped = typeof ratio === "number" && isFinite(ratio) ? ratio : 0;
  if (clamped < 0) clamped = 0;
  if (clamped > 1) clamped = 1;
  return { name, maxHp, hp: Math.round(maxHp * clamped) };
}
