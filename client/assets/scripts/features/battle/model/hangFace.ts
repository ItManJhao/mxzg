/**
 * 挂机主面板上要写的字。只读 GameStore 和 chapterreward。
 * 不解协议。关卡没同步时标题写「主线未同步」，不编一关名字。
 * 三格和旧挂机条同一套：表上的每分钟，真服没表写 —/m，Mock 才退回旧节奏。
 */
import { chapterIdleMinute, chapterStageCaption, chapterStageNumbers, idleCapMs } from "../../../config/rosterCatalog";
import { GameStore } from "../../../core/GameStore";
import { Session } from "../../../core/Session";
import { formatHangClock, goldPerMin, itemEveryMs } from "../../../module/idle/rewards";
import { IDLE_UNIX_FLOOR, wireIdleCapMs, wireIdleElapsedMs } from "../../../net/protocol/wireIdle";
import { hangFightStageId } from "../../../ui/idleHangSkirmishPlan";

export interface HangFace {
  /** 章关长文案。写在左侧关卡标，不叠在金环上。 */
  caption: string;
  /** 金环里的关号数字。没同步是空串。 */
  ring: string;
  clock: string;
  gold: string;
  souls: string;
  exp: string;
  /** 关卡号已经从 Store 读到。没有时标题是「主线未同步」。 */
  synced: boolean;
}

export function hangFace(nowMs: number, openedAtMs: number): HangFace {
  const synced = chapterSynced();
  const idx = stageIdx();
  const rate = rates();
  return {
    caption: captionOf(synced, idx),
    ring: ringOf(synced, idx),
    clock: clockText(nowMs, openedAtMs),
    gold: rate.gold,
    souls: rate.souls,
    exp: rate.exp,
    synced,
  };
}

function chapterSynced(): boolean {
  const mock = GameStore.mockStageId();
  const chapter = GameStore.chapter();
  return (mock !== null && mock >= 1) || chapter.nowIdx !== null || chapter.maxIdx !== null;
}

/**
 * 面板上的当前关，和开战日志同一套。
 * chapter.idx 是阵位行，前几行都还是第 1 关。不能拿 maxIdx 去对那一列。
 * 真服没同步时是 null。收益在没关号时仍按第 1 关的表，不把标题写成第 1 关。
 */
export function hangShownStage(): number | null {
  const chapter = GameStore.chapter();
  const wire = Session.source === "wire" || GameStore.source === "wire";
  return hangFightStageId(GameStore.mockStageId(), chapter.nowIdx, chapter.maxIdx, wire);
}

function stageIdx(): number {
  const shown = hangShownStage();
  return shown === null ? 1 : shown;
}

function captionOf(synced: boolean, idx: number): string {
  if (!synced) return "主线未同步";
  const place = chapterStageCaption(idx);
  if (place) return place;
  if (idx >= 1) return "第" + idx + "关";
  return "主线未同步";
}

/** 金环只留关号。有章关表时用 missionId，否则用进战关号本身。 */
function ringOf(synced: boolean, idx: number): string {
  if (!synced) return "";
  const place = chapterStageNumbers(idx);
  if (place) return String(place.missionId);
  if (idx >= 1) return String(idx);
  return "";
}

function rates(): { gold: string; souls: string; exp: string } {
  const minute = chapterIdleMinute(stageIdx());
  if (minute) {
    return {
      gold: minute.gold + "/m",
      souls: minute.heroExp + "/m",
      exp: minute.roleExp + "/m",
    };
  }
  if (Session.source === "wire") return { gold: "—/m", souls: "—/m", exp: "—/m" };
  const cleared = clearedCount();
  const gold = goldPerMin(cleared);
  const every = itemEveryMs(cleared);
  const perMin = every > 0 ? Math.max(1, Math.round(60000 / every)) : 0;
  const sec = Math.max(1, Math.round(every / 1000));
  return { gold: gold + "/m", souls: perMin + "/m", exp: "每" + sec + "s" };
}

function clearedCount(): number {
  const stage = GameStore.mockStageId();
  if (stage !== null) return Math.max(0, stage - 1);
  const chapter = GameStore.chapter();
  if (chapter.fromStore && chapter.nowIdx !== null && chapter.nowIdx > 1) return chapter.nowIdx - 1;
  return 0;
}

function clockText(nowMs: number, openedAtMs: number): string {
  const idle = GameStore.idle();
  const now = typeof nowMs === "number" && isFinite(nowMs) ? nowMs : 0;
  if (idle.fromStore && (idle.rewardTime === null || !isFinite(idle.rewardTime) || idle.rewardTime < IDLE_UNIX_FLOOR)) {
    return "未同步";
  }
  const opened = typeof openedAtMs === "number" && isFinite(openedAtMs) ? openedAtMs : now;
  let elapsed = 0;
  if (idle.fromStore) elapsed = wireIdleElapsedMs(idle.rewardTime, now);
  else if (idle.anchorMs !== null && idle.anchorMs >= 1e9) elapsed = Math.max(0, now - idle.anchorMs);
  else elapsed = Math.max(0, now - opened);
  const cap = idle.fromStore ? wireIdleCapMs(idle.maxRewardTime, idleCapMs()) : idleCapMs();
  if (cap !== null && elapsed > cap) elapsed = cap;
  return formatHangClock(elapsed);
}
