/**
 * 真服职级信息只读。c2s / s2c 都是 75606。
 * c2s 是 GReqGetOccupationInfo，空体，没有 page。整帧 04 00 00 00 56 27 01 00，即 0400000056270100。
 * 75606 = 0x12756，小端是 56 27 01 00。空体一次。
 * 75607 晋升职级也吃同一空体 GReqGetOccupationInfo，cmd 小端是 57 27 01 00，整帧 0400000057270100。
 * 客户端只发 cmd=75606。空帧必须是 0400000056270100，绝不能是 75607 的 cmd 字节。
 * 不是神兵数据 75601。不是羁绊皮肤 28200。
 * 75601、28200 已合。本刀不重复拉 75601，也不重复拉 28200。与已合刀分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 75601 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 75607 晋升职级、75609 职级任务手动完成。
 * 75608 是服推，勿当 c2s，不编码发出。
 * 神兵写号仍禁：不发 75602、75603、75604、75605、75619。
 * 75615 神兵道具另只读接在其后，勿合并。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧允许 getOrCreate 轻懒建。无扣费，无领奖。只读展示。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 75606 是 GResGetOccupationInfo。occupationInfo 是字段 1。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * occupationInfo：oc_id 是字段 1，taskInfos 是字段 2，repeated。
 * taskInfos 行：taskId、targetCount、condition、complete_type 按声明顺序是 1、2、3、4。
 * condition 出现 varint 就写原数，出现可打印文本就写原文。没有这个字段时保持缺省，不写成 0。
 * 出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 *
 * 空包体是已同步。occupationInfo 没有时，页上写「空职级」。
 * occupationInfo 有包但解不开时返回 null，调用方保持上一次。
 * taskInfos 有包但一条都解不开时，这一份职级解不开。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.occupation。 */
export const WIRE_OCCUPATION_CMD = "wire.75606";

export const WIRE_OCCUPATION_READONLY_TITLE = "职级信息（真服只读）";
export const WIRE_OCCUPATION_EMPTY = "空职级";
export const WIRE_OCCUPATION_EMPTY_TASKS = "空任务";
export const WIRE_OCCUPATION_UNSYNCED_TOAST = "真服未同步";
export const WIRE_OCCUPATION_READONLY_NOTE =
  "只读展示 oc_id 与 taskInfos 的 taskId、targetCount、condition、complete_type。无晋升、手动完成任务入口。不发 75607、75609。75608 为服推，勿当 c2s。不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75601 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_OCCUPATION_SIDE_EFFECT =
  "允许 getOrCreate 轻懒建。无扣费，无领奖。只读展示。空 c2s 一次，无 page，挂在 75601 之后。只发 cmd=75606，空帧 0400000056270100。75607 同为空体 GReqGetOccupationInfo，不发 75607。不发 75609。75608 为服推，勿当 c2s。不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75601、28200 分开发，勿合并。本刀不重复拉 75601，也不重复拉 28200";
export const WIRE_OCCUPATION_FIELD_NOTE =
  "occupationInfo 写 oc_id 与 taskInfos。行上写 taskId、targetCount、condition、complete_type。没有的数不写成 0。出现的值如实展示";

export interface WireOccupationMark {
  field: number;
  text: string;
}

export interface WireOccupationTask {
  /** taskId。没有时是 null，不写成 0。 */
  taskId: number | null;
  /** targetCount。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  targetCount: number | null;
  /** condition。varint 写成原数文本，可打印文本写原文。没有时是 null，不写成 0。 */
  condition: string | null;
  /** complete_type。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  completeType: number | null;
  /** 对不上 1、2、3、4 的号。 */
  marks: WireOccupationMark[];
}

export interface WireOccupationInfo {
  /** occupationInfo.oc_id。没有时是 null，不写成 0。 */
  ocId: number | null;
  /** occupationInfo.taskInfos。没有这个字段时是空数组。 */
  tasks: WireOccupationTask[];
  /** 对不上 1、2 的号。 */
  marks: WireOccupationMark[];
}

export interface WireOccupationSnapshot {
  /** GResGetOccupationInfo.occupationInfo。没有这个字段时是 null。 */
  info: WireOccupationInfo | null;
  /** 对不上字段 1 的外层号。 */
  marks: WireOccupationMark[];
}

/**
 * 解 s2c 75606。空包体返回已同步的空职级。
 * 超长、坏 varint、occupationInfo 有包但解不开时返回 null。
 */
export function decodeWireOccupation(body: Uint8Array | null | undefined): WireOccupationSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireOccupationMark[] = [];
  let info: WireOccupationInfo | null = null;
  let sawInfo = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      if (!sawInfo) {
        sawInfo = true;
        const parsed = decodeInfo(row.bytes);
        if (!parsed) return null;
        info = parsed;
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { info, marks };
}

/** 页上写 oc_id 和任务条数。没有 occupationInfo 时写「空职级」。 */
export function formatWireOccupationHead(snap: WireOccupationSnapshot): string {
  if (!snap.info) return joinMarks("occupationInfo=" + WIRE_OCCUPATION_EMPTY, snap.marks);
  const tasks = snap.info.tasks.length === 0 ? WIRE_OCCUPATION_EMPTY_TASKS : snap.info.tasks.length + " 条";
  const line = "oc_id=" + numText(snap.info.ocId) + " / taskInfos=" + tasks;
  return joinMarks(joinMarks(line, snap.info.marks), snap.marks);
}

/** 一行一个 taskInfos。没有的格子写「无」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireOccupationLine(row: WireOccupationTask): string {
  const line =
    "taskId=" +
    numText(row.taskId) +
    " / targetCount=" +
    numText(row.targetCount) +
    " / condition=" +
    textOrNone(row.condition) +
    " / complete_type=" +
    numText(row.completeType);
  return joinMarks(line, row.marks);
}

/** 先写职级头，再写任务行。给页面和日志用。 */
export function formatWireOccupationRows(snap: WireOccupationSnapshot): string[] {
  if (!snap.info) return [];
  const rows: string[] = [];
  for (let i = 0; i < snap.info.tasks.length; i++) rows.push(formatWireOccupationLine(snap.info.tasks[i]));
  return rows;
}

export function wireOccupationNote(snap: WireOccupationSnapshot): string {
  const head = formatWireOccupationHead(snap);
  const tail = WIRE_OCCUPATION_SIDE_EFFECT + "。不写金币，不写钻石";
  const rows = formatWireOccupationRows(snap);
  if (rows.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(rows[i]);
  if (rows.length > n) parts.push("其余 " + (rows.length - n) + " 行");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireOccupationSnapshot {
  return { info: null, marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function textOrNone(value: string | null): string {
  return value === null ? "无" : value;
}

function joinMarks(line: string, marks: WireOccupationMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireOccupationMark[]): string {
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

function decodeInfo(body: Uint8Array): WireOccupationInfo | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const tasks: WireOccupationTask[] = [];
  const marks: WireOccupationMark[] = [];
  let ocId: number | null = null;
  let sawOc = false;
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawOc) {
        sawOc = true;
        ocId = accepted(row.varint);
        if (ocId === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeTask(row.bytes);
      if (!parsed) continue;
      tasks.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && tasks.length === 0) return null;
  return { ocId, tasks, marks };
}

function decodeTask(body: Uint8Array): WireOccupationTask | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireOccupationMark[] = [];
  let taskId: number | null = null;
  let targetCount: number | null = null;
  let condition: string | null = null;
  let completeType: number | null = null;
  let sawTask = false;
  let sawTarget = false;
  let sawCond = false;
  let sawComplete = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawTask) {
        sawTask = true;
        taskId = accepted(row.varint);
        if (taskId === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint") {
      if (!sawTarget) {
        sawTarget = true;
        targetCount = accepted(row.varint);
        if (targetCount === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 3) {
      if (!sawCond) {
        sawCond = true;
        condition = readCondition(row);
        if (condition === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 4 && row.kind === "varint") {
      if (!sawComplete) {
        sawComplete = true;
        completeType = accepted(row.varint);
        if (completeType === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { taskId, targetCount, condition, completeType, marks };
}

/** condition 缺省保持 null。varint 写原数。空字节是空文本。可打印文本写原文。 */
function readCondition(row: RawField): string | null {
  if (row.kind === "varint") {
    const value = accepted(row.varint);
    return value === null ? null : String(value);
  }
  if (row.kind === "bytes" && row.bytes) {
    if (row.bytes.length === 0) return "";
    return utf8Printable(row.bytes);
  }
  return null;
}

function markOf(row: RawField): WireOccupationMark | null {
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
