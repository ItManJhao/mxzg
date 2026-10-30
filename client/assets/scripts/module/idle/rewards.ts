import { chapterIdleMinute, idleCapMs } from "../../config/rosterCatalog";
import { Session } from "../../core/Session";
import { StageReward } from "../../net/protocol/types";

/**
 * 挂机收益（C4）。
 * 表绑上之后，金币、角色经验、英雄经验按当前关 chapterreward.reward_base 的每分钟数量乘整段时长。
 * 当前关 = 已通关 + 1。封顶用 system.idle_max_time（秒），没读到表时仍是 8 小时。
 * 强化石仍是 Mock 侧的旧节奏，不在 reward_base 里。
 * 快速作战不在这里改进度，只提供文案；结算仍走 stage.result。
 */

/** 表没绑上时的封顶。绑上 system.idle_max_time 之后领取改走 activeIdleCapMs。 */
export const IDLE_CAP_MS = 8 * 60 * 60 * 1000;
export const IDLE_ITEM_ID = 101;
export const IDLE_ITEM_NAME = "强化石";
export const IDLE_ROLE_EXP_ID = 900003;
export const IDLE_HERO_EXP_ID = 900101;
/** 每次点击快速作战连续结算的关数。MVP 为 1，改大即连打数关。 */
export const QUICK_BATTLE_COUNT = 1;

export interface IdleView {
  elapsedMs: number;
  capMs: number;
  capped: boolean;
  goldPerMin: number;
  itemEveryMs: number;
  pendingGold: number;
  pendingItem: number;
  pendingRoleExp: number;
  pendingHeroExp: number;
  capGold: number;
  capItem: number;
  capRoleExp: number;
  capHeroExp: number;
}

export function normalizeCleared(clearedStage: number): number {
  if (typeof clearedStage !== "number" || !isFinite(clearedStage) || clearedStage < 0) return 0;
  return Math.floor(clearedStage);
}

/** 表上的当前关。还没通关时是第 1 关。 */
export function idleStageForCleared(clearedStage: number): number {
  return normalizeCleared(clearedStage) + 1;
}

/** 读到 chapterreward 就用这一关的金币。没有表时仍是未通关 6、每关 +4。 */
export function goldPerMin(clearedStage: number): number {
  const minute = chapterIdleMinute(idleStageForCleared(clearedStage));
  if (minute) return minute.gold;
  return 6 + normalizeCleared(clearedStage) * 4;
}

export function roleExpPerMin(clearedStage: number): number {
  const minute = chapterIdleMinute(idleStageForCleared(clearedStage));
  return minute ? minute.roleExp : 0;
}

export function heroExpPerMin(clearedStage: number): number {
  const minute = chapterIdleMinute(idleStageForCleared(clearedStage));
  return minute ? minute.heroExp : 0;
}

/** system.idle_max_time。表上没有这一项时回到 8 小时。 */
export function activeIdleCapMs(): number {
  const cap = idleCapMs();
  if (cap !== null && cap > 0) return cap;
  return IDLE_CAP_MS;
}

/** 未通关每 30 秒 1 个强化石，每通关缩短 1 秒，最短 10 秒。 */
export function itemEveryMs(clearedStage: number): number {
  const every = 30 * 1000 - normalizeCleared(clearedStage) * 1000;
  return every < 10 * 1000 ? 10 * 1000 : every;
}

export function elapsedSince(nowMs: number, anchorMs: number): number {
  if (typeof nowMs !== "number" || !isFinite(nowMs)) return 0;
  if (typeof anchorMs !== "number" || !isFinite(anchorMs)) return 0;
  const delta = nowMs - anchorMs;
  return delta > 0 ? delta : 0;
}

export function buildIdleView(elapsedMs: number, clearedStage: number): IdleView {
  const capMs = activeIdleCapMs();
  const pending = previewIdle(elapsedMs, clearedStage);
  const cap = previewIdle(capMs, clearedStage);
  return {
    elapsedMs: pending.elapsedMs,
    capMs,
    capped: pending.capped,
    goldPerMin: pending.goldPerMin,
    itemEveryMs: pending.itemEveryMs,
    pendingGold: pending.gold,
    pendingItem: pending.item,
    pendingRoleExp: pending.roleExp,
    pendingHeroExp: pending.heroExp,
    capGold: cap.gold,
    capItem: cap.item,
    capRoleExp: cap.roleExp,
    capHeroExp: cap.heroExp,
  };
}

export function previewIdle(
  elapsedMs: number,
  clearedStage: number
): {
  elapsedMs: number;
  capped: boolean;
  gold: number;
  item: number;
  roleExp: number;
  heroExp: number;
  goldPerMin: number;
  itemEveryMs: number;
} {
  const capMs = activeIdleCapMs();
  const raw = typeof elapsedMs === "number" && isFinite(elapsedMs) ? elapsedMs : 0;
  const capped = raw >= capMs;
  let elapsed = raw;
  if (elapsed < 0) elapsed = 0;
  if (elapsed > capMs) elapsed = capMs;
  const perMin = goldPerMin(clearedStage);
  const rolePerMin = roleExpPerMin(clearedStage);
  const heroPerMin = heroExpPerMin(clearedStage);
  const every = itemEveryMs(clearedStage);
  const gold = Math.floor((elapsed * perMin) / 60000);
  const roleExp = Math.floor((elapsed * rolePerMin) / 60000);
  const heroExp = Math.floor((elapsed * heroPerMin) / 60000);
  const item = every > 0 ? Math.floor(elapsed / every) : 0;
  return {
    elapsedMs: Math.floor(elapsed),
    capped,
    gold,
    item,
    roleExp,
    heroExp,
    goldPerMin: perMin,
    itemEveryMs: every,
  };
}

export function formatDuration(ms: number): string {
  let total = Math.floor((typeof ms === "number" && isFinite(ms) ? ms : 0) / 1000);
  if (total < 0) total = 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return pad(h) + ":" + pad(m) + ":" + pad(s);
}

/**
 * 挂机泡和底栏时间条。满 1 小时写成 hh:mm，和旧日服泡上的 06:00 一样，不带秒。
 * 不满 1 小时仍是 mm:ss。挂机页句子继续用 formatDuration 的 hh:mm:ss。
 */
export function formatHangClock(ms: number): string {
  let total = Math.floor((typeof ms === "number" && isFinite(ms) ? ms : 0) / 1000);
  if (total < 0) total = 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return pad(h) + ":" + pad(m);
  return pad(m) + ":" + pad(s);
}

export function formatItemEvery(everyMs: number): string {
  const sec = Math.max(0, Math.round((typeof everyMs === "number" && isFinite(everyMs) ? everyMs : 0) / 1000));
  if (sec >= 60 && sec % 60 === 0) return "每 " + sec / 60 + " 分钟 1 个";
  return "每 " + sec + " 秒 1 个";
}

export function claimToast(gold: number, item: number, roleExp = 0, heroExp = 0): string {
  const parts: string[] = [];
  if (gold > 0) parts.push("金币 +" + Math.floor(gold));
  if (item > 0) parts.push(IDLE_ITEM_NAME + " +" + Math.floor(item));
  if (roleExp > 0) parts.push("角色经验 +" + Math.floor(roleExp));
  if (heroExp > 0) parts.push("英雄经验 +" + Math.floor(heroExp));
  if (parts.length === 0) return "暂无收益";
  return "领取成功：" + parts.join("，");
}

export function capPreviewLine(gold: number, item: number): string {
  const hours = Math.max(1, Math.round(activeIdleCapMs() / 3600000));
  return "挂满 " + hours + " 小时约可领 金币 " + Math.floor(gold) + "、" + IDLE_ITEM_NAME + " " + Math.floor(item);
}

/** 假定每关都胜利、下一关连着打。界面实际以结算后的 stageId 为准。 */
export function quickStageIds(currentStage: number, count = QUICK_BATTLE_COUNT): number[] {
  const start = typeof currentStage === "number" && isFinite(currentStage) && currentStage >= 1 ? Math.floor(currentStage) : 1;
  const n = typeof count === "number" && isFinite(count) && count >= 1 ? Math.floor(count) : 1;
  const ids: number[] = [];
  for (let i = 0; i < n; i++) ids.push(start + i);
  return ids;
}

export function quickToast(stageId: number, nextStageId: number, rewards: StageReward[] | null | undefined): string {
  const id = typeof stageId === "number" && isFinite(stageId) ? Math.floor(stageId) : 1;
  const next = typeof nextStageId === "number" && isFinite(nextStageId) && nextStageId >= 1 ? Math.floor(nextStageId) : id;
  return "快速作战：第" + id + "关胜利，" + rewardPhrase(rewards) + "，下一关 " + next;
}

export function quickBatchToast(
  firstStageId: number,
  lastStageId: number,
  nextStageId: number,
  gold: number
): string {
  const first = Math.floor(firstStageId);
  const last = Math.floor(lastStageId);
  const next = Math.floor(nextStageId);
  if (first === last) return quickToast(first, next, [{ id: 1, count: gold }]);
  return "快速作战：第" + first + "关至第" + last + "关胜利，金币 +" + Math.floor(gold) + "，下一关 " + next;
}

/** 领取成功才把钱包写进 Session。失败不动。 */
export function applyIdleClaim(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

function rewardPhrase(rewards: StageReward[] | null | undefined): string {
  if (!rewards || rewards.length === 0) return "没有奖励";
  for (let i = 0; i < rewards.length; i++) {
    const count = rewards[i].count;
    if (typeof count !== "number" || !isFinite(count) || count <= 0) continue;
    if (rewards[i].id === 1) return "金币 +" + Math.floor(count);
    if (rewards[i].id === 2) return "钻石 +" + Math.floor(count);
    if (rewards[i].id === IDLE_ITEM_ID) return IDLE_ITEM_NAME + " +" + Math.floor(count);
  }
  return "没有奖励";
}

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}
