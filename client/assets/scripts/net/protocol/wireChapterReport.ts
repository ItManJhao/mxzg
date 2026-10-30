/**
 * 真服挂机战报。c2s / s2c 都是 3006。
 * c2s 是 GReqChapterReport，不是空体。字段 1 chapterIdx，字段 2 firstPos。
 * 3006 = 0x0BBE，小端是 be 0b 00 00。
 * chapterIdx=1、firstPos=1 的整帧是 08 00 00 00 be 0b 00 00 08 01 10 01，即 08000000be0b000008011001。
 * 小于 1 的数在发出前收成 1，不把 0 编出去。客户端没有章节表，探针默认就是 1、1。
 *
 * 战斗链续在已合的 3001、3010、3012 之后：…→3001→3010→3012→3006。
 * 主线页点「挂机战报」才发。不跟 3012 同一发，不重发 3012，也不重发 3001。
 * 不进 pullIdle，不接活动链末（不接 76251 后面），不夹活动号。Boot.ts 不改。
 * 挂机域和 3004 同一片，职责不同。本刀不发 3005，不改挂机领取。
 *
 * 副作用：只 invoke battle(HANG_UP) 算一帧。不写 receiveReward，不推进 chapterId，不落库。
 * 无领奖，无扣费。胜了不回拉 3007。
 * 不发 3002、3005、3008、3011。硬禁 3013。3102 请求战报另帧，不从本帧自动发。
 * 不重发 3007、3004、3001、3010、3012、3099、3101、18001、3203。
 * 硬禁 4601、29001。不把 Mock 1201 / 1202 当真服。
 * 不写金币，不写钻石。不回落 Mock。不接 USE_*。不改 CityChrome。
 *
 * s2c 是 GResChapterReport。按声明顺序：字段 1 report，字段 2 chapterIdx，字段 3 firstPos。
 * report 是 length-delimited 的 BattleReport，rounds 和 3001 同一套，走 decodeWireBattleReport。
 * 有 report 才在主线页走 planWireSpineReplay / mountBattleSpine。不另写 spine。
 * 没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 空包体是已同步空表。report 有包但整段解不开时返回 null，调用方保持上一次。
 */
import { decodeWireBattleReport, WireBattleMark, WireBattleReport } from "./wireBattle";

const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.chapterReport。 */
export const WIRE_CHAPTER_REPORT_CMD = "wire.3006";

/** chapterIdx=1、firstPos=1。不是空帧 04000000be0b0000。 */
export const WIRE_CHAPTER_REPORT_FRAME = "08000000be0b000008011001";

export const WIRE_CHAPTER_REPORT_DEFAULT_IDX = 1;
export const WIRE_CHAPTER_REPORT_DEFAULT_POS = 1;

/** GResChapterReport.report。声明顺序第 1 个字段。和 3001 的 report 同一套 BattleReport。 */
export const WIRE_CHAPTER_REPORT_REPORT_FIELD = 1;
/** GResChapterReport.chapterIdx。声明顺序第 2 个字段。 */
export const WIRE_CHAPTER_REPORT_IDX_FIELD = 2;
/** GResChapterReport.firstPos。声明顺序第 3 个字段。 */
export const WIRE_CHAPTER_REPORT_POS_FIELD = 3;

export const WIRE_CHAPTER_REPORT_EMPTY = "已同步空表";
export const WIRE_CHAPTER_REPORT_UNSYNCED = "真服未同步";
export const WIRE_CHAPTER_REPORT_UNSYNCED_TOAST = "真服未同步";
export const WIRE_CHAPTER_REPORT_ABSENT = "未带";
export const WIRE_CHAPTER_REPORT_NO_REPORT = "没有 report";

export const WIRE_CHAPTER_REPORT_NOTE =
  "主线页「挂机战报」发 c2s 3006（GReqChapterReport，chapterIdx=1、firstPos=1 整帧 08000000be0b000008011001）。不是空帧。战斗链是 …→3012→3006。3102 挂在其后，不从本帧自动发。3004 空壳另帧挂在其后，不从本帧自动发。须已有 3007。不重发 3012、3010、3001、3007、3004、3099、3101、18001、3203。不发 3002、3005、3008、3011。硬禁 3013。3102 另帧，不从本帧自动发。硬禁 4601、29001。不把 Mock 1201/1202 当真服。report 走 3001 的 decodeWireBattleReport，rounds 走 planWireSpineReplay。不进 pullIdle，不夹活动号。缺字段不写成 0。空包体是已同步空表。未同步 Toast「真服未同步」。不回落 Mock。不写 receiveReward，不推进 chapterId，不落库。不写金币，不写钻石。不改 Boot";

export const WIRE_CHAPTER_REPORT_SIDE_EFFECT =
  "只 invoke battle(HANG_UP) 计算。不写 receiveReward，不推进 chapterId，不落库。无领奖，无扣费。胜了不回拉 3007。带 chapterIdx 和 firstPos，不是空帧，挂在已合 3012 之后，主线页点「挂机战报」才发。不重发 3012。不重发 3001。不进 pullIdle。不发 3002。不发 3005。不发 3008、3011。硬禁 3013。3102 另帧，不从本帧自动发。3004 空壳另帧，不从本帧自动发。不重发 3007、3004、3010、3099、3101、18001、3203。硬禁 4601、29001";

/** 本刀不编码这些号。3005 / 3004 / 3001 / 3010 / 3012 / 3007 已有自己的帧，由战斗链断言不重发。3013 硬禁。 */
export const WIRE_CHAPTER_REPORT_BANNED_CMDS = [
  "wire.3002",
  "wire.3008",
  "wire.3011",
  "wire.3013",
  "wire.4601",
  "wire.29001",
  "wire.1201",
  "wire.1202",
] as const;

export interface WireChapterReportSnapshot {
  /** 空包体。report 和两个下标都保持缺省。 */
  empty: boolean;
  /** 字段 1。没有时是 null。 */
  report: WireBattleReport | null;
  /** 字段 2。没有时是 null，不写成 0。 */
  chapterIdx: number | null;
  /** 字段 3。没有时是 null，不写成 0。 */
  firstPos: number | null;
  marks: WireBattleMark[];
}

/** 小于 1、缺省或不是数时写成 1。禁止把 0 编出去。 */
export function normalizeWireChapterReportIndex(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) return WIRE_CHAPTER_REPORT_DEFAULT_IDX;
  return Math.floor(value);
}

export function readWireChapterReportQuery(data: unknown): { chapterIdx: number; firstPos: number } {
  let chapterIdx = WIRE_CHAPTER_REPORT_DEFAULT_IDX;
  let firstPos = WIRE_CHAPTER_REPORT_DEFAULT_POS;
  if (data && typeof data === "object") {
    const raw = data as { chapterIdx?: unknown; firstPos?: unknown };
    if (typeof raw.chapterIdx === "number") chapterIdx = normalizeWireChapterReportIndex(raw.chapterIdx);
    if (typeof raw.firstPos === "number") firstPos = normalizeWireChapterReportIndex(raw.firstPos);
  }
  return { chapterIdx, firstPos };
}

/** GReqChapterReport。字段 1 chapterIdx，字段 2 firstPos。1、1 的包体是 `08 01 10 01`。 */
export function encodeWireChapterReportBody(chapterIdx: number, firstPos: number): Uint8Array {
  const idx = normalizeWireChapterReportIndex(chapterIdx);
  const pos = normalizeWireChapterReportIndex(firstPos);
  const parts: number[] = [];
  pushVarint(parts, (1 << 3) | 0);
  pushVarint(parts, idx);
  pushVarint(parts, (2 << 3) | 0);
  pushVarint(parts, pos);
  return Uint8Array.from(parts);
}

/**
 * 解 s2c 3006。空包体返回已同步空表。
 * 超长、坏 varint、report 有包但整段解不开时返回 null，调用方保持上一次。
 */
export function decodeWireChapterReport(body: Uint8Array | null | undefined): WireChapterReportSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return { empty: true, report: null, chapterIdx: null, firstPos: null, marks: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const snap: WireChapterReportSnapshot = {
    empty: false,
    report: null,
    chapterIdx: null,
    firstPos: null,
    marks: [],
  };
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === WIRE_CHAPTER_REPORT_REPORT_FIELD && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeWireBattleReport(row.bytes);
      if (!parsed) continue;
      snap.report = parsed;
      continue;
    }
    if (row.field === WIRE_CHAPTER_REPORT_IDX_FIELD && row.kind === "varint") {
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) snap.marks.push(mark);
      } else {
        snap.chapterIdx = value;
      }
      continue;
    }
    if (row.field === WIRE_CHAPTER_REPORT_POS_FIELD && row.kind === "varint") {
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) snap.marks.push(mark);
      } else {
        snap.firstPos = value;
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) snap.marks.push(mark);
  }
  if (blobs > 0 && !snap.report) return null;
  return snap;
}

/** 主线页上的挂机战报。null 是还没同步。空包体写「已同步空表」。缺的数不写成 0。 */
export function formatWireChapterReport(snap: WireChapterReportSnapshot | null): string {
  if (!snap) return "挂机战报 " + WIRE_CHAPTER_REPORT_UNSYNCED;
  if (snap.empty) return "挂机战报 " + WIRE_CHAPTER_REPORT_EMPTY;
  const parts: string[] = [];
  if (snap.chapterIdx !== null) parts.push("chapterIdx=" + String(snap.chapterIdx));
  if (snap.firstPos !== null) parts.push("firstPos=" + String(snap.firstPos));
  if (snap.report) parts.push("report rounds " + snap.report.rounds.length);
  else parts.push(WIRE_CHAPTER_REPORT_NO_REPORT);
  const line = parts.length === 0 ? "挂机战报 " + WIRE_CHAPTER_REPORT_ABSENT : "挂机战报 " + parts.join(" / ");
  return joinMarks(line, snap.marks);
}

function joinMarks(line: string, marks: WireBattleMark[]): string {
  if (marks.length === 0) return line;
  const parts: string[] = [];
  const n = Math.min(marks.length, 6);
  for (let i = 0; i < n; i++) parts.push("字段" + marks[i].field + "=" + marks[i].text);
  if (marks.length > n) parts.push("其余 " + (marks.length - n) + " 项");
  return line + " / " + parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function markOf(row: RawField): WireBattleMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    if (row.bytes.length === 0) return { field: row.field, text: "空" };
    return { field: row.field, text: "包" + row.bytes.length };
  }
  return { field: row.field, text: "未解" };
}

function accepted(value: number | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  if (value === -1) return -1;
  if (value < 0) return null;
  return Math.floor(value);
}

function pushVarint(parts: number[], value: number): void {
  let n = Math.floor(value);
  if (n < 0) n = 0;
  while (n > 127) {
    parts.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  parts.push(n);
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
      fields.push({ field, kind: "bytes", bytes: body.slice(i, i + len.value) });
      i += len.value;
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

function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}
