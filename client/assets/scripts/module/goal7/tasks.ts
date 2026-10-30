import { ITEM_EXP_POTION, ITEM_GOLD_BAG } from "../bag/items";
import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../idle/rewards";
import { Goal7Jump, Goal7Reward, Goal7State, Goal7Task } from "../../net/protocol/types";

/**
 * 七日目标（C14）骨架。天数只用来分组，不按登录天锁任务。
 * 进度读当前会话：已通关、召唤次数、英雄升级次数、挂机领取次数。
 * 早期任务完成就能领。第 7 日「通关第 70 关」在通关数到 70 之前保持未开启。
 * 主线调试推关把 clearedStage 推到 70 之后，这里不用改领取逻辑就能领。
 * 金币、钻石进钱包；强化石、小金币袋、经验药水进背包。
 */

export const GOAL7_DAYS = 7;
/** 第 7 日主线目标。C15 把可玩推进接到这个数上即可解锁。 */
export const GOAL7_LATE_STAGE = 70;
export const GOAL7_LATE_ID = "stage-70";

export type Goal7Metric = "stage" | "summon" | "hero" | "idle";

export interface Goal7Def {
  id: string;
  day: number;
  title: string;
  target: number;
  metric: Goal7Metric;
  /** 大于 0 时，已通关没到这个值就保持未开启。只有第 70 关用 70。 */
  unlockStage: number;
  jump: Goal7Jump;
  rewards: Goal7Reward[];
}

export interface Goal7Progress {
  clearedStage: number;
  /** 成功召唤抽出的卡数。单抽 +1，十连 +10。失败不加。 */
  summonCount: number;
  /** 名册里高出 Lv1 的等级之和。英雄页升级和经验药水都算。 */
  heroUpgradeCount: number;
  /** 成功领取挂机的次数。时间太短被拒绝的不加。 */
  idleClaimCount: number;
}

export interface Goal7Tally {
  gold: number;
  diamond: number;
  items: Goal7Reward[];
}

/** 骨架任务。第 5、6 天故意空着。第 7 天只有通关第 70 关。 */
export const GOAL7_TABLE: readonly Goal7Def[] = [
  {
    id: "stage-1",
    day: 1,
    title: "通关主线第1关",
    target: 1,
    metric: "stage",
    unlockStage: 0,
    jump: "mainline",
    rewards: [{ id: 1, name: "金币", count: 40 }],
  },
  {
    id: "summon-1",
    day: 1,
    title: "召唤1次",
    target: 1,
    metric: "summon",
    unlockStage: 0,
    jump: "summon",
    rewards: [{ id: 2, name: "钻石", count: 10 }],
  },
  {
    id: "stage-3",
    day: 2,
    title: "通关主线第3关",
    target: 3,
    metric: "stage",
    unlockStage: 0,
    jump: "mainline",
    rewards: [{ id: 1, name: "金币", count: 60 }],
  },
  {
    id: "hero-1",
    day: 3,
    title: "升级英雄1次",
    target: 1,
    metric: "hero",
    unlockStage: 0,
    jump: "hero",
    rewards: [{ id: 1, name: "金币", count: 50 }],
  },
  {
    id: "idle-1",
    day: 3,
    title: "领取挂机1次",
    target: 1,
    metric: "idle",
    unlockStage: 0,
    jump: "idle",
    rewards: [{ id: IDLE_ITEM_ID, name: IDLE_ITEM_NAME, count: 2 }],
  },
  {
    id: "stage-5",
    day: 4,
    title: "通关主线第5关",
    target: 5,
    metric: "stage",
    unlockStage: 0,
    jump: "mainline",
    rewards: [
      { id: 1, name: "金币", count: 80 },
      { id: ITEM_GOLD_BAG, name: "小金币袋", count: 1 },
    ],
  },
  {
    id: GOAL7_LATE_ID,
    day: 7,
    title: "通关主线第70关",
    target: GOAL7_LATE_STAGE,
    metric: "stage",
    unlockStage: GOAL7_LATE_STAGE,
    jump: "mainline",
    rewards: [
      { id: 1, name: "金币", count: 500 },
      { id: 2, name: "钻石", count: 80 },
      { id: ITEM_EXP_POTION, name: "经验药水", count: 1 },
    ],
  },
];

export function heroLevelsToUpgrades(levels: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < levels.length; i++) {
    const level = finite(levels[i]);
    if (level > 1) total += level - 1;
  }
  return total;
}

export function goal7Current(def: Goal7Def, progress: Goal7Progress): number {
  let raw = 0;
  if (def.metric === "stage") raw = finite(progress.clearedStage);
  else if (def.metric === "summon") raw = finite(progress.summonCount);
  else if (def.metric === "hero") raw = finite(progress.heroUpgradeCount);
  else raw = finite(progress.idleClaimCount);
  if (raw < 0) raw = 0;
  return raw;
}

/** 已领取优先于未开启。未开启时进度照样显示，方便看到离第 70 关还差多少。 */
export function goal7State(def: Goal7Def, progress: Goal7Progress, claimed: boolean): Goal7State {
  if (claimed) return "claimed";
  const unlock = finite(def.unlockStage);
  if (unlock > 0 && finite(progress.clearedStage) < unlock) return "locked";
  if (goal7Current(def, progress) >= finite(def.target)) return "claimable";
  return "in-progress";
}

export function goal7Shown(current: number, target: number): number {
  const cap = finite(target);
  const value = finite(current);
  if (value < 0) return 0;
  if (cap > 0 && value > cap) return cap;
  return value;
}

export function findGoal7Task(id: string): Goal7Def | null {
  const key = typeof id === "string" ? id.trim() : "";
  if (!key) return null;
  for (let i = 0; i < GOAL7_TABLE.length; i++) {
    if (GOAL7_TABLE[i].id === key) return GOAL7_TABLE[i];
  }
  return null;
}

export function listGoal7Tasks(progress: Goal7Progress, claimed: (id: string) => boolean): Goal7Task[] {
  const out: Goal7Task[] = [];
  for (let i = 0; i < GOAL7_TABLE.length; i++) {
    const def = GOAL7_TABLE[i];
    const current = goal7Current(def, progress);
    out.push({
      id: def.id,
      day: def.day,
      title: def.title,
      state: goal7State(def, progress, claimed(def.id) === true),
      current,
      target: def.target,
      jump: def.jump,
      rewards: copyRewards(def.rewards),
    });
  }
  return out;
}

export function goal7TasksOnDay(tasks: readonly Goal7Task[] | null | undefined, day: number): Goal7Task[] {
  const want = finite(day);
  const out: Goal7Task[] = [];
  if (!tasks) return out;
  for (let i = 0; i < tasks.length; i++) {
    if (finite(tasks[i].day) === want) out.push(tasks[i]);
  }
  return out;
}

export function goal7ClaimableCount(tasks: readonly Goal7Task[] | null | undefined): number {
  if (!tasks) return 0;
  let count = 0;
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].state === "claimable") count += 1;
  }
  return count;
}

export function tallyGoal7(rewards: readonly Goal7Reward[]): Goal7Tally {
  let gold = 0;
  let diamond = 0;
  const items: Goal7Reward[] = [];
  for (let i = 0; i < rewards.length; i++) {
    const row = rewards[i];
    const count = finite(row.count);
    if (count <= 0) continue;
    if (row.id === 1) gold += count;
    else if (row.id === 2) diamond += count;
    else items.push({ id: row.id, name: row.name, count });
  }
  return { gold, diamond, items };
}

export function goal7RewardText(rewards: readonly Goal7Reward[] | null | undefined): string {
  if (!rewards || rewards.length === 0) return "没有奖励";
  const parts: string[] = [];
  for (let i = 0; i < rewards.length; i++) {
    const row = rewards[i];
    const count = finite(row.count);
    const name = row.name || "道具";
    if (row.id === 1 || row.id === 2) parts.push(name + " +" + count);
    else parts.push(name + " ×" + count);
  }
  return parts.join("、");
}

export function goal7Tag(state: Goal7State): string {
  if (state === "locked") return "未开启";
  if (state === "claimable") return "可领取";
  if (state === "claimed") return "已领取";
  return "进行中";
}

export function goal7TitleLine(task: Goal7Task): string {
  return task.title + " · " + goal7Tag(task.state);
}

export function goal7DetailLine(task: Goal7Task): string {
  return goal7Shown(task.current, task.target) + "/" + finite(task.target) + " · " + goal7RewardText(task.rewards);
}

export function goal7HeadLine(clearedStage: number, claimable: number): string {
  return "已通关第 " + finite(clearedStage) + " 关 · 可领 " + finite(claimable) + " 项";
}

export function goal7SubLine(): string {
  return "天数只分组。第7日通关第70关后可领，主线或挂机可调试推关";
}

export function goal7WalletLine(gold: number, diamond: number): string {
  return "持有金币 " + finite(gold) + " · 钻石 " + finite(diamond);
}

export function goal7DayHint(day: number, count: number): string {
  if (finite(count) <= 0) return "这一天还没有目标";
  if (finite(day) === 7) return "通关第70关后可领取。主线或挂机点「推关到70（调试）」";
  return "完成后点领取。还没完成会提示";
}

export function goal7DayLabel(day: number): string {
  return "第" + finite(day) + "天";
}

export function goal7GoText(jump: string): string {
  if (jump === "mainline") return "前往主线";
  if (jump === "summon") return "前往召唤";
  if (jump === "hero") return "前往英雄";
  if (jump === "idle") return "前往挂机";
  return "前往";
}

export function goal7ClaimText(state: Goal7State | string): string {
  if (state === "claimed") return "已领取";
  if (state === "locked") return "未开启";
  return "领取";
}

export function goal7ClaimToast(title: string, rewards: readonly Goal7Reward[]): string {
  const name = title || "目标";
  return "领取成功：" + name + "，" + goal7RewardText(rewards);
}

export function goal7LockedToast(target: number): string {
  const stage = finite(target);
  if (stage >= GOAL7_LATE_STAGE) return "通关第" + stage + "关后才能领取";
  return "目标尚未开启";
}

export function goal7IncompleteToast(title: string, current: number, target: number): string {
  const name = title || "目标";
  return name + "尚未完成（" + goal7Shown(current, target) + "/" + finite(target) + "）";
}

export function goal7ClaimedToast(title: string): string {
  if (title) return title + "已经领取";
  return "这个目标已经领取";
}

export function goal7MissingToast(): string {
  return "没有这个目标";
}

export function goal7BadJumpToast(): string {
  return "这里还去不了";
}

export function goal7FailToast(
  resp: { code?: number; title?: string; current?: number; target?: number } | null | undefined
): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  const title = resp && typeof resp.title === "string" ? resp.title : "";
  const current = resp && typeof resp.current === "number" ? resp.current : 0;
  const target = resp && typeof resp.target === "number" ? resp.target : 0;
  if (code === ErrorCode.GOAL7_NOT_FOUND) return goal7MissingToast();
  if (code === ErrorCode.GOAL7_LOCKED) return goal7LockedToast(target);
  if (code === ErrorCode.GOAL7_INCOMPLETE) return goal7IncompleteToast(title, current, target);
  if (code === ErrorCode.GOAL7_CLAIMED) return goal7ClaimedToast(title);
  return errorText(code);
}

/** 领取成功才把钱包写进 Session。失败不动。道具在下一次背包里读到。 */
export function applyGoal7Claim(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

export function copyGoal7Rewards(rewards: readonly Goal7Reward[]): Goal7Reward[] {
  return copyRewards(rewards);
}

function copyRewards(rewards: readonly Goal7Reward[]): Goal7Reward[] {
  const out: Goal7Reward[] = [];
  for (let i = 0; i < rewards.length; i++) {
    const row = rewards[i];
    out.push({ id: row.id, name: row.name, count: row.count });
  }
  return out;
}

function finite(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
