/**
 * 真服成就记录只读。c2s / s2c 都是 12010，AchievementHandler.achievementList。
 * c2s 是 GReqAchievementList，没有字段。整帧 04 00 00 00 ea 2e 00 00。
 * s2c 是 GResAchievementList，只有 repeated PSTaskData task=1。
 * PSTaskData：idx=1 任务号，process=2 进度，state=3（hadReward）。
 *
 * 由 WireSession.pullIdle 在空 c2s 17000 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 12020。不领奖，不改 state，不写钱包。18001 是竞技场只读，接在本帧之后。
 *
 * 服端 getRoleAllTask 会懒建未接取的首链成就并落库。
 * 这不是无副作用的查询。页面写「打开/同步可能在服上补成就」。
 *
 * 空列表是 GResAchievementList.newBuilder().build()。repeated 不落字节，包体可以是空的。
 * 空包体、以及能解开但 task 为 0 条，都是已同步的空成就表，不是未同步。
 * 有 task 包但一条都解不开时返回 null，调用方保持上一次。
 * 粘包只解本帧包体，不把后一帧的字节算进 task。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.achievementList。 */
export const WIRE_ACHIEVEMENT_CMD = "wire.12010";

export const WIRE_ACHIEVEMENT_READONLY_TITLE = "成就记录（真服只读）";
export const WIRE_ACHIEVEMENT_EMPTY = "空成就表";
export const WIRE_ACHIEVEMENT_UNSYNCED_TOAST = "真服未同步";
export const WIRE_ACHIEVEMENT_READONLY_NOTE = "只读。不领奖，不改 state，不写金币";
export const WIRE_ACHIEVEMENT_SIDE_EFFECT = "打开/同步可能在服上补成就";
export const WIRE_ACHIEVEMENT_FIELD_NOTE = "idx 任务号，process 进度，state 即 hadReward";

export interface WireAchievementTask {
  /** PSTaskData.idx。没有时是 null，不写成 0。 */
  idx: number | null;
  /** PSTaskData.process。没有时是 null，不写成 0。 */
  process: number | null;
  /** PSTaskData.state，即 hadReward。没有时是 null，不写成 0。 */
  state: number | null;
}

export interface WireAchievementSnapshot {
  tasks: WireAchievementTask[];
}

/**
 * 解 s2c 12010。空包体和没有 task 的合法包都返回空表。
 * 超长、坏 varint、task 有包但一条都解不开时返回 null。
 */
export function decodeWireAchievement(body: Uint8Array | null | undefined): WireAchievementSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return { tasks: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const tasks: WireAchievementTask[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 1 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const parsed = decodeTask(row.bytes);
    if (!parsed) continue;
    tasks.push(parsed);
  }
  if (blobs > 0 && tasks.length === 0) return null;
  return { tasks };
}

/** 行上写 idx / process / state。不写字段号。 */
export function formatWireAchievementLine(task: WireAchievementTask): string {
  return "idx=" + numText(task.idx) + " / process=" + numText(task.process) + " / state=" + numText(task.state);
}

export function wireAchievementNote(snap: WireAchievementSnapshot): string {
  if (snap.tasks.length === 0) return "空成就表。打开/同步可能在服上补成就。不写金币";
  const parts: string[] = [];
  const n = Math.min(snap.tasks.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireAchievementLine(snap.tasks[i]));
  if (snap.tasks.length > n) parts.push("其余 " + (snap.tasks.length - n) + " 条");
  return parts.join("；") + "。打开/同步可能在服上补成就。不写金币";
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeTask(body: Uint8Array): WireAchievementTask | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const idx = nonNegativeVarint(fields, 1);
  const process = nonNegativeVarint(fields, 2);
  const state = nonNegativeVarint(fields, 3);
  if (idx === null && process === null && state === null) return null;
  return { idx, process, state };
}

function nonNegativeVarint(fields: RawField[], field: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "varint" || typeof row.varint !== "number") continue;
    if (!isFinite(row.varint) || row.varint < 0) continue;
    return Math.floor(row.varint);
  }
  return null;
}

function readRawFields(body: Uint8Array): RawField[] | null {
  const fields: RawField[] = [];
  let i = 0;
  while (i < body.length) {
    const key = readVarint(body, i);
    if (!key) return null;
    const field = key.value >>> 3;
    const wt = key.value & 7;
    i = key.next;
    if (field <= 0) return null;
    if (wt === 0) {
      const val = readVarint(body, i);
      if (!val) return null;
      fields.push({ field, kind: "varint", varint: val.value });
      i = val.next;
      continue;
    }
    if (wt === 2) {
      const len = readVarint(body, i);
      if (!len) return null;
      i = len.next;
      if (len.value < 0 || i + len.value > body.length) return null;
      const blob = body.slice(i, i + len.value);
      i += len.value;
      fields.push({ field, kind: "bytes", bytes: blob });
      continue;
    }
    return null;
  }
  return fields;
}

function readVarint(body: Uint8Array, offset: number): { value: number; next: number } | null {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (i < body.length && shift <= 49) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (!Number.isSafeInteger(value)) return null;
      return { value, next: i };
    }
    shift += 7;
  }
  return null;
}
