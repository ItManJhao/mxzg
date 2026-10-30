/**
 * 真服七日目标只读。c2s / s2c 都是 21010。
 * c2s 是 GReqSevenDayTargetList，没有字段。整帧 04 00 00 00 12 52 00 00。
 * 21010 = 0x5212，小端是 12 52 00 00。不要写成 02 52（那是另一号）。
 * 旧号 21000 / 21001 不用。不是占位 goal7.view / goal7.claim（2301 / 2302）。
 * 不是七日登录 22000，也不是点金 17000。
 *
 * 由 WireSession.pullIdle 在空 c2s 22000 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 21011、21012。21013 只收，不当成 c2s，也不改这份表。不写钱包。不接 USE_*。
 *
 * s2c 21010 是 GResSevenDayTargetList：
 * - 1 repeated PSTaskData task。idx=1，process=2，state=3（0 未领，1 已领）
 * - 2 reward_box_idx。可以重复，没有时不写成 0
 * - 3 seven_day_value。已领任务数。没有时不写成 0
 * - 4 curr_day。没有时不写成 0
 *
 * 空表：task 可以没有，外层仍非空，必带 seven_day_value 和 curr_day。这是已同步，不是未同步。
 * 空包体同样按已同步的空表打开。task 有包但一条都解不开时返回 null，调用方保持上一次。
 *
 * 副作用：首次拉取可能建档，并懒填计数。不发奖。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.sevenDayTarget。 */
export const WIRE_GOAL7_CMD = "wire.21010";
/** s2c 21013。只订阅，不编码，不改表。 */
export const WIRE_GOAL7_PUSH_CMD = "wire.21013";

export const WIRE_GOAL7_READONLY_TITLE = "七日目标（真服只读）";
export const WIRE_GOAL7_EMPTY = "空表";
export const WIRE_GOAL7_UNSYNCED_TOAST = "真服未同步";
export const WIRE_GOAL7_READONLY_NOTE = "只读。不领奖，不发 21011、21012，不写金币";
export const WIRE_GOAL7_SIDE_EFFECT = "首次拉取可能建档，并懒填计数。不发奖";
export const WIRE_GOAL7_PUSH_NOTE = "21013 只收，不当成 c2s，不改这份表";
export const WIRE_GOAL7_FIELD_NOTE =
  "curr_day 当前天。seven_day_value 已领任务数。reward_box_idx 宝箱序号。行上 idx 任务号，process 进度，state 0 未领 / 1 已领";

export interface WireGoal7Task {
  /** PSTaskData.idx。没有时是 null，不写成 0。 */
  idx: number | null;
  /** PSTaskData.process。没有时是 null，不写成 0。 */
  process: number | null;
  /** PSTaskData.state。0 未领，1 已领。没有时是 null，不写成 0。 */
  state: number | null;
}

export interface WireGoal7Snapshot {
  /** GResSevenDayTargetList.curr_day。没有时是 null。 */
  currDay: number | null;
  /** GResSevenDayTargetList.seven_day_value。已领任务数。没有时是 null。 */
  sevenDayValue: number | null;
  /** GResSevenDayTargetList.reward_box_idx。没有这个字段时是空数组，不写成 0。 */
  rewardBoxIdx: number[];
  tasks: WireGoal7Task[];
}

/**
 * 解 s2c 21010。空包体、以及没有 task 的合法包，都返回空表。
 * 超长、坏 varint、task 有包但一条都解不开时返回 null。
 */
export function decodeWireGoal7(body: Uint8Array | null | undefined): WireGoal7Snapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const tasks: WireGoal7Task[] = [];
  const boxes: number[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 2 && row.kind === "varint" && typeof row.varint === "number") {
      if (isFinite(row.varint) && row.varint >= 0) boxes.push(Math.floor(row.varint));
      continue;
    }
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) boxes.push(packed[j]);
      continue;
    }
    if (row.field !== 1 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const parsed = decodeTask(row.bytes);
    if (!parsed) continue;
    tasks.push(parsed);
  }
  if (blobs > 0 && tasks.length === 0) return null;
  return {
    currDay: nonNegativeVarint(fields, 4),
    sevenDayValue: nonNegativeVarint(fields, 3),
    rewardBoxIdx: boxes,
    tasks,
  };
}

export function formatWireGoalHead(snap: WireGoal7Snapshot): string {
  return (
    "curr_day=" +
    numText(snap.currDay) +
    " / seven_day_value=" +
    numText(snap.sevenDayValue) +
    " / reward_box_idx=" +
    boxText(snap.rewardBoxIdx)
  );
}

/** 行上写 idx / process / state。0、1 同时写未领、已领。其它数字不另起名字。 */
export function formatWireGoalLine(task: WireGoal7Task): string {
  return "idx=" + numText(task.idx) + " / process=" + numText(task.process) + " / state=" + stateText(task.state);
}

export function wireGoalNote(snap: WireGoal7Snapshot): string {
  const head = formatWireGoalHead(snap);
  if (snap.tasks.length === 0) return head + "。" + WIRE_GOAL7_EMPTY + "。" + WIRE_GOAL7_SIDE_EFFECT + "。不写金币";
  const parts: string[] = [];
  const n = Math.min(snap.tasks.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireGoalLine(snap.tasks[i]));
  if (snap.tasks.length > n) parts.push("其余 " + (snap.tasks.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + WIRE_GOAL7_SIDE_EFFECT + "。不写金币";
}

function emptySnapshot(): WireGoal7Snapshot {
  return { currDay: null, sevenDayValue: null, rewardBoxIdx: [], tasks: [] };
}

function stateText(state: number | null): string {
  if (state === null) return "无";
  if (state === 0) return "0 · 未领";
  if (state === 1) return "1 · 已领";
  return String(state);
}

function boxText(values: number[]): string {
  if (values.length === 0) return "无";
  return values.join(",");
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

function decodeTask(body: Uint8Array): WireGoal7Task | null {
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

function readPackedVarints(body: Uint8Array): number[] | null {
  const values: number[] = [];
  let i = 0;
  while (i < body.length) {
    const val = readVarint(body, i);
    if (!val) return null;
    if (!isFinite(val.value) || val.value < 0) return null;
    values.push(Math.floor(val.value));
    i = val.next;
  }
  return values;
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
