/**
 * 真服每日任务列表只读。c2s / s2c 都是 12020。
 * c2s 是 GReqDailyTaskList，空体，没有 page。整帧 04 00 00 00 F4 2E 00 00，即 04000000f42e0000。
 * 12020 = 0x2EF4，小端是 F4 2E 00 00。空体一次。
 * 这是每日任务列表，不是启动链成就列表 12010（空帧 04000000ea2e0000）。
 * 服侧每日任务列表。getDailyTasks 可能 reset / checkNew。loadRoleDailyTask 可能按日刷新宝箱进度。轻懒建、轻日刷可接受。
 * 无扣费，无领奖写。
 * 不是签到列表 13010。不是英雄等级重生次数 4044。不是爬塔首通已领 3203。不是进行中活动 20101。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。
 * 13010 已合。本刀不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 13010 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 13010 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 12021 领每日任务奖。12021 是写号，本刀不编码、不发送。
 * 不发 12022 领活跃宝箱。12022 是写号，本刀不编码、不发送。
 * 26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不做 20011。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 12020 是 GResDailyTaskList。
 * 仓库里没有这份 proto。Task、RewardBoxIdx、DailyValue 按声明顺序从 1 编号，和同仓库签到、七日目标的写法一样。
 * Task 是字段 1，repeated PSTaskData。内层 idx=1，process=2，state=3，和成就 12010、七日目标 21010 的 PSTaskData 相同。
 * 字段 1 若是 varint，不当成一条任务，按字段号写。
 * RewardBoxIdx 是字段 2，repeated int32，可以是未打包的 repeated varint，也可以是打包的 length-delimited。按出现顺序写，不排序。
 * DailyValue 是字段 3 的 varint。
 * 没有这个字段时保持缺省，不写成 0，页上也不补这一项。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。三个字段都缺省，页上写「已同步空表」，不写成 0。
 * 任务包或宝箱打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.dailyTaskList。 */
export const WIRE_DAILY_TASK_LIST_CMD = "wire.12020";

export const WIRE_DAILY_TASK_LIST_FRAME = "04000000f42e0000";
export const WIRE_DAILY_TASK_LIST_EMPTY = "已同步空表";
export const WIRE_DAILY_TASK_LIST_READONLY_TITLE = "每日任务列表（真服只读）";
export const WIRE_DAILY_TASK_LIST_UNSYNCED_TOAST = "真服未同步";
export const WIRE_DAILY_TASK_LIST_READONLY_NOTE =
  "只读展示每日任务列表里实际出现的 Task、RewardBoxIdx、DailyValue。缺字段不写成 0，也不补一项。出现的值如实展示。无领奖入口。不发 12021。不发 12022。26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 13010 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_DAILY_TASK_LIST_SIDE_EFFECT =
  "getDailyTasks 可能 reset、checkNew。loadRoleDailyTask 可能按日刷新宝箱进度。轻懒建、轻日刷可接受。无扣费，无领奖。空 c2s 一次，无 page，挂在 13010 之后。只发 cmd=12020，空帧 04000000f42e0000。不发 12021 领每日任务奖。不发 12022 领活跃宝箱。26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 13010 分开发，勿合并。本刀不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_DAILY_TASK_LIST_FIELD_NOTE =
  "Task、RewardBoxIdx、DailyValue。按声明顺序是字段 1、2、3。Task 是 repeated PSTaskData，内层 idx、process、state。RewardBoxIdx 是 repeated int32。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。5001 / 51001 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 / 26002 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。 */
export const WIRE_DAILY_TASK_LIST_BANNED_CMDS = [
  "wire.12021",
  "wire.12022",
  "wire.20011",
  "wire.4601",
  "wire.29001",
] as const;

export interface WireDailyTaskMark {
  field: number;
  text: string;
}

export interface WireDailyTaskRow {
  /** PSTaskData.idx。没有时是 null，不写成 0。 */
  idx: number | null;
  /** PSTaskData.process。没有时是 null，不写成 0。 */
  process: number | null;
  /** PSTaskData.state。没有时是 null，不写成 0。 */
  state: number | null;
  /** 对不上 idx / process / state 的内层号。 */
  marks: WireDailyTaskMark[];
}

export interface WireDailyTaskListSnapshot {
  /** GResDailyTaskList.Task。字段没出现时是 null，不写成 0。出现过但没有行时是空数组。 */
  tasks: WireDailyTaskRow[] | null;
  /** GResDailyTaskList.RewardBoxIdx。没有时是 null，不写成 0。出现过但没有数时是空数组。 */
  rewardBoxIdx: number[] | null;
  /** GResDailyTaskList.DailyValue。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  dailyValue: number | null;
  /** 对不上字段 1–3 的外层号，以及字段 1 上不是任务包的值。 */
  marks: WireDailyTaskMark[];
}

/**
 * 解 s2c 12020。空包体返回已同步的缺省字段。
 * 超长、坏 varint、任务包解不开、字段 2 打包解不开时返回 null。
 */
export function decodeWireDailyTaskList(body: Uint8Array | null | undefined): WireDailyTaskListSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireDailyTaskMark[] = [];
  let tasks: WireDailyTaskRow[] | null = null;
  let rewardBoxIdx: number[] | null = null;
  let dailyValue: number | null = null;
  let sawDailyValue = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const parsed = decodeTask(row.bytes);
      if (!parsed) return null;
      if (tasks === null) tasks = [];
      tasks.push(parsed);
      continue;
    }
    if (row.field === 2 && row.kind === "varint") {
      if (rewardBoxIdx === null) rewardBoxIdx = [];
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      } else {
        rewardBoxIdx.push(value);
      }
      continue;
    }
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      if (rewardBoxIdx === null) rewardBoxIdx = [];
      for (let j = 0; j < packed.length; j++) rewardBoxIdx.push(packed[j]);
      continue;
    }
    if (row.field === 3 && row.kind === "varint") {
      if (!sawDailyValue) {
        sawDailyValue = true;
        dailyValue = accepted(row.varint);
        if (dailyValue === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { tasks, rewardBoxIdx, dailyValue, marks };
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireDailyTaskListLine(snap: WireDailyTaskListSnapshot): string {
  const parts: string[] = [];
  if (snap.tasks !== null) parts.push("Task=" + (snap.tasks.length === 0 ? "空" : taskList(snap.tasks)));
  if (snap.rewardBoxIdx !== null) {
    parts.push("RewardBoxIdx=" + (snap.rewardBoxIdx.length === 0 ? "空" : numList(snap.rewardBoxIdx)));
  }
  if (snap.dailyValue !== null) parts.push("DailyValue=" + String(snap.dailyValue));
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_DAILY_TASK_LIST_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireDailyTaskListNote(snap: WireDailyTaskListSnapshot): string {
  return formatWireDailyTaskListLine(snap) + "。" + WIRE_DAILY_TASK_LIST_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireDailyTaskListSnapshot {
  return { tasks: null, rewardBoxIdx: null, dailyValue: null, marks: [] };
}

function taskList(rows: WireDailyTaskRow[]): string {
  const n = Math.min(rows.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatTask(rows[i]));
  if (rows.length > n) return head.join(";") + "…+" + (rows.length - n);
  return head.join(";");
}

function formatTask(row: WireDailyTaskRow): string {
  const parts: string[] = [];
  if (row.idx !== null) parts.push("idx=" + String(row.idx));
  if (row.process !== null) parts.push("process=" + String(row.process));
  if (row.state !== null) parts.push("state=" + String(row.state));
  const body = parts.length === 0 && row.marks.length === 0 ? "空" : parts.join(",");
  return joinMarks(body, row.marks);
}

function numList(values: number[]): string {
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function joinMarks(line: string, marks: WireDailyTaskMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireDailyTaskMark[]): string {
  const parts: string[] = [];
  for (let i = 0; i < marks.length; i++) parts.push("字段" + marks[i].field + "=" + marks[i].text);
  return parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeTask(body: Uint8Array): WireDailyTaskRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireDailyTaskMark[] = [];
  let idx: number | null = null;
  let process: number | null = null;
  let state: number | null = null;
  let sawIdx = false;
  let sawProcess = false;
  let sawState = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && !sawIdx) {
      sawIdx = true;
      idx = accepted(row.varint);
      if (idx === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint" && !sawProcess) {
      sawProcess = true;
      process = accepted(row.varint);
      if (process === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 3 && row.kind === "varint" && !sawState) {
      sawState = true;
      state = accepted(row.varint);
      if (state === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { idx, process, state, marks };
}

function markOf(row: RawField): WireDailyTaskMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    const text = utf8Printable(row.bytes);
    if (text !== null) return { field: row.field, text };
    return { field: row.field, text: "未解" };
  }
  return { field: row.field, text: "未解" };
}

function utf8Printable(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return null;
  let text = "";
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (_err) {
    return null;
  }
  if (!text) return null;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 32 || code === 127) return null;
  }
  return text;
}

function accepted(value: number | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  if (value === -1) return -1;
  if (value < 0) return null;
  return Math.floor(value);
}

function readPackedVarints(body: Uint8Array): number[] | null {
  const values: number[] = [];
  let i = 0;
  while (i < body.length) {
    const val = readVarint(body, i);
    if (!val) return null;
    const value = accepted(val.value);
    if (value === null) return null;
    values.push(value);
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
  while (i < body.length && shift <= 63) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (isProtoInt64Neg1(body, offset, i)) return { value: -1, next: i };
      if (!Number.isSafeInteger(value) || value < 0) return null;
      return { value, next: i };
    }
    shift += 7;
  }
  return null;
}

/** protobuf int64 的 -1：九个 0xFF 再加 0x01。 */
function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}
