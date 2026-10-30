import { ITEM_EXP_POTION, ITEM_GOLD_BAG } from "../bag/items";
import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../idle/rewards";
import { Login7Day, Login7DayState, Login7Reward } from "../../net/protocol/types";

/**
 * 七日登录（C13）。按角色登录天领奖，不看开服天。
 * 新号是第 1 天。已到达且未领的天可以领，含今天之前没领的。
 * 未来天拒绝。已经领过的再点也拒绝。
 * 金币、钻石进钱包；强化石、小金币袋、经验药水进背包。
 */

export const LOGIN7_DAYS = 7;

interface Login7Row {
  day: number;
  rewards: Login7Reward[];
}

/** 七天奖励。id 1 金币、id 2 钻石，其余进背包。 */
export const LOGIN7_TABLE: readonly Login7Row[] = [
  { day: 1, rewards: [{ id: 1, name: "金币", count: 80 }] },
  { day: 2, rewards: [{ id: 2, name: "钻石", count: 15 }] },
  { day: 3, rewards: [{ id: IDLE_ITEM_ID, name: IDLE_ITEM_NAME, count: 3 }] },
  {
    day: 4,
    rewards: [
      { id: 1, name: "金币", count: 120 },
      { id: ITEM_GOLD_BAG, name: "小金币袋", count: 1 },
    ],
  },
  {
    day: 5,
    rewards: [
      { id: 2, name: "钻石", count: 30 },
      { id: ITEM_EXP_POTION, name: "经验药水", count: 1 },
    ],
  },
  {
    day: 6,
    rewards: [
      { id: 1, name: "金币", count: 200 },
      { id: IDLE_ITEM_ID, name: IDLE_ITEM_NAME, count: 5 },
    ],
  },
  {
    day: 7,
    rewards: [
      { id: 1, name: "金币", count: 300 },
      { id: 2, name: "钻石", count: 50 },
      { id: ITEM_GOLD_BAG, name: "小金币袋", count: 2 },
    ],
  },
];

export interface Login7Tally {
  gold: number;
  diamond: number;
  items: Login7Reward[];
}

export function clampLoginDay(day: number): number {
  let value = finite(day);
  if (value < 1) value = 1;
  if (value > LOGIN7_DAYS) value = LOGIN7_DAYS;
  return value;
}

/** 已领取优先于未到达，种子里勾过的天保持已领取。 */
export function login7State(day: number, loginDay: number, claimed: boolean): Login7DayState {
  if (claimed) return "claimed";
  if (finite(day) > clampLoginDay(loginDay)) return "locked";
  return "ready";
}

export function findLogin7Rewards(day: number): Login7Reward[] | null {
  const value = finite(day);
  for (let i = 0; i < LOGIN7_TABLE.length; i++) {
    if (LOGIN7_TABLE[i].day === value) return copyRewards(LOGIN7_TABLE[i].rewards);
  }
  return null;
}

export function listLogin7Days(loginDay: number, claimed: (day: number) => boolean): Login7Day[] {
  const dayNow = clampLoginDay(loginDay);
  const out: Login7Day[] = [];
  for (let i = 0; i < LOGIN7_TABLE.length; i++) {
    const row = LOGIN7_TABLE[i];
    out.push({
      day: row.day,
      state: login7State(row.day, dayNow, claimed(row.day) === true),
      rewards: copyRewards(row.rewards),
    });
  }
  return out;
}

export function tallyLogin7(rewards: readonly Login7Reward[]): Login7Tally {
  let gold = 0;
  let diamond = 0;
  const items: Login7Reward[] = [];
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

export function login7RewardText(rewards: readonly Login7Reward[] | null | undefined): string {
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

export function login7RowText(day: Login7Day, loginDay: number): string {
  const tag = login7Tag(day, loginDay);
  return "第" + finite(day.day) + "天 · " + login7RewardText(day.rewards) + " · " + tag;
}

export function login7HeadLine(loginDay: number): string {
  return "角色登录第 " + clampLoginDay(loginDay) + " 天";
}

export function login7OpenDayLine(openDay: number): string {
  const day = finite(openDay) >= 1 ? finite(openDay) : 1;
  return "开服第 " + day + " 天显示在这里，只供对照";
}

export function login7WalletLine(gold: number, diamond: number): string {
  return "持有金币 " + finite(gold) + " · 钻石 " + finite(diamond);
}

export function login7ClaimButton(loginDay: number, todayClaimed: boolean): string {
  if (finite(loginDay) < 1) return "读取中";
  if (todayClaimed) return "今日已领取";
  return "领取第" + clampLoginDay(loginDay) + "天";
}

export function login7AdvanceButton(): string {
  return "下一天（调试）";
}

export function login7TodayClaimed(days: readonly Login7Day[] | null | undefined, loginDay: number): boolean {
  if (!days) return false;
  const today = clampLoginDay(loginDay);
  for (let i = 0; i < days.length; i++) {
    if (days[i].day === today) return days[i].state === "claimed";
  }
  return false;
}

export function login7ClaimToast(day: number, rewards: readonly Login7Reward[]): string {
  return "领取成功：第" + finite(day) + "天，" + login7RewardText(rewards);
}

export function login7LockedToast(day: number): string {
  if (finite(day) >= 1) return "第" + finite(day) + "天尚未到达";
  return "这一天尚未到达";
}

export function login7ClaimedToast(day: number): string {
  if (finite(day) >= 1) return "第" + finite(day) + "天奖励已经领取";
  return "这一天的奖励已经领取";
}

export function login7MissingToast(): string {
  return "没有这一天";
}

export function login7AdvanceToast(day: number): string {
  return "角色登录天来到第" + clampLoginDay(day) + "天，奖励尚未自动领取";
}

export function login7MaxToast(): string {
  return "已经是第7天";
}

export function login7WaitToast(): string {
  return "请稍候，奖励还在读取";
}

export function login7FailToast(resp: { code?: number; day?: number } | null | undefined): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  const day = resp && typeof resp.day === "number" ? resp.day : 0;
  if (code === ErrorCode.LOGIN7_LOCKED) return login7LockedToast(day);
  if (code === ErrorCode.LOGIN7_CLAIMED) return login7ClaimedToast(day);
  if (code === ErrorCode.LOGIN7_NOT_FOUND) return login7MissingToast();
  if (code === ErrorCode.LOGIN7_MAX) return login7MaxToast();
  return errorText(code);
}

/** 领取成功才把钱包写进 Session。失败不动。道具在下一次背包里读到。 */
export function applyLogin7Claim(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

function login7Tag(day: Login7Day, loginDay: number): string {
  if (day.state === "claimed") return "已领取";
  if (day.state === "locked") return "未到达";
  if (finite(day.day) === clampLoginDay(loginDay)) return "今日可领";
  return "可补领";
}

function copyRewards(rewards: readonly Login7Reward[]): Login7Reward[] {
  const out: Login7Reward[] = [];
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
