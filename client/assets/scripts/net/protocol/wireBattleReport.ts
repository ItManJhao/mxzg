/**
 * 真服请求战报。c2s / s2c 都是 3102。
 * c2s 是 GReqBattleReport，不是空体。字段 1 battle_id（string），字段 2 type（string）。
 * 3102 = 0x0C1E，小端是 1e 0c 00 00。
 * 空壳 04 00 00 00 1e 0c 00 00 不够。探针 battle_id=1、type=1 的整帧是
 * 0a 00 00 00 1e 0c 00 00 0a 01 31 12 01 31，即 0a0000001e0c00000a0131120131。
 * 空白在发出前收成 1，不把空壳编出去。客户端没有战报表，探针默认就是 1、1。
 *
 * 战斗链续在已合的 3006 之后：…→3006→3102。3103 预计算另帧挂在其后，不从本帧自动发，不播 spine。
 * 主线页点「请求战报」才发。不跟 3006 同一发，不重发 3006，也不重发 3001。
 * 不从 3001 或 3006 自动接。3001 / 3006 的战报不落库，拿它们的 battle_id 常回 BATTLE_REPORT_TIMEOUT。
 * 这一帧只给已落库的战报（切磋 / 竞技）或已知有效的 battle_id。
 * 不进 pullIdle，不接活动链末（不接 76251 后面），不夹活动号。Boot.ts 不改。
 * 不跟 3099、3101 合并。不发 3100、3097、3098。
 *
 * 副作用：纯读 getReport。无领奖，无扣费，不写养成。胜了不回拉 3007。
 * 不发 3002、3005、3008、3011。硬禁 3013、4601、29001。
 * 不把 Mock 1201 / 1202 当真服。
 * 不写金币，不写钻石。不回落 Mock。不接 USE_*。不改 CityChrome。
 *
 * s2c 是 GResBattleReport。按声明顺序：字段 1 report，字段 2 type。
 * report 是 length-delimited 的 BattleReport，rounds 和 3001 / 3006 同一套，走 decodeWireBattleReport。
 * 有 report 才在主线页走 planWireSpineReplay / mountBattleSpine。不另写 spine。
 * 没有的字符串不写成空，也不写成 1。出现的空串仍写空。
 * 空包体是已同步空表。report 有包但整段解不开时返回 null，调用方保持上一次。
 */
import { decodeWireBattleReport, WireBattleMark, WireBattleReport } from "./wireBattle";

const MAX_BODY = 65536;
const MAX_BATTLE_ID = 64;
const MAX_TYPE = 32;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.battleReport。 */
export const WIRE_BATTLE_REPORT_CMD = "wire.3102";

/** battle_id=1、type=1。不是空壳 040000001e0c0000。 */
export const WIRE_BATTLE_REPORT_FRAME = "0a0000001e0c00000a0131120131";

export const WIRE_BATTLE_REPORT_EMPTY_SHELL = "040000001e0c0000";

export const WIRE_BATTLE_REPORT_DEFAULT_ID = "1";
export const WIRE_BATTLE_REPORT_DEFAULT_TYPE = "1";

/** GResBattleReport.report。声明顺序第 1 个字段。和 3001 / 3006 的 report 同一套 BattleReport。 */
export const WIRE_BATTLE_REPORT_REPORT_FIELD = 1;
/** GReqBattleReport.battle_id / 本刀 c2s 字段 1。s2c 不回这个号。 */
export const WIRE_BATTLE_REPORT_ID_FIELD = 1;
/** GReqBattleReport.type 与 GResBattleReport.type。声明顺序第 2 个字段，string。 */
export const WIRE_BATTLE_REPORT_TYPE_FIELD = 2;

export const WIRE_BATTLE_REPORT_EMPTY = "已同步空表";
export const WIRE_BATTLE_REPORT_UNSYNCED = "真服未同步";
export const WIRE_BATTLE_REPORT_UNSYNCED_TOAST = "真服未同步";
export const WIRE_BATTLE_REPORT_ABSENT = "未带";
export const WIRE_BATTLE_REPORT_NO_REPORT = "没有 report";
export const WIRE_BATTLE_REPORT_TIMEOUT_NOTE =
  "3001/3006 战报不落库，拿它们的 battle_id 常回 BATTLE_REPORT_TIMEOUT。只查已落库战报（切磋/竞技）或已知有效 id。不自动接在 3001/3006 后面";

export const WIRE_BATTLE_REPORT_NOTE =
  "主线页「请求战报」发 c2s 3102（GReqBattleReport，battle_id=1、type=1 整帧 0a0000001e0c00000a0131120131）。不是空壳 040000001e0c0000。字段 1 battle_id、字段 2 type 都是 string。战斗链是 …→3006→3102。3103 挂在其后，不从本帧自动发，不播 spine。须已有 3007。不重发 3006、3012、3010、3001、3007、3004、3099、3101、18001、3203。不从 3001 或 3006 自动接。3001/3006 战报不落库，常回 BATTLE_REPORT_TIMEOUT。不发 3002、3005、3008、3011。硬禁 3013。不发 3100、3097、3098。硬禁 4601、29001。不把 Mock 1201/1202 当真服。report 走 decodeWireBattleReport，rounds 走 planWireSpineReplay。不进 pullIdle，不夹活动号。缺字段不写成 0。空包体是已同步空表。未同步 Toast「真服未同步」。不回落 Mock。纯读 getReport。无领奖，无扣费。不写金币，不写钻石。不改 Boot";

export const WIRE_BATTLE_REPORT_SIDE_EFFECT =
  "纯读 getReport。无领奖，无扣费，不写养成。胜了不回拉 3007。带 battle_id 和 type，不是空壳，挂在已合 3006 之后，主线页点「请求战报」才发。不从 3001 或 3006 自动接。3001/3006 的 battle_id 常回 BATTLE_REPORT_TIMEOUT。3103 另帧，不从本帧自动发。不播 spine。不重发 3006。不重发 3001。不进 pullIdle。不发 3002。不发 3005。不发 3008、3011。硬禁 3013。不发 3100、3097、3098。不重发 3007、3004、3010、3012、3099、3101、18001、3203。硬禁 4601、29001";

/** 本刀不编码这些号。3006 / 3005 / 3004 / 3001 / 3010 / 3012 / 3007 已有自己的帧，由战斗链断言不重发。3013 硬禁。 */
export const WIRE_BATTLE_REPORT_BANNED_CMDS = [
  "wire.3002",
  "wire.3008",
  "wire.3011",
  "wire.3013",
  "wire.3100",
  "wire.3097",
  "wire.3098",
  "wire.4601",
  "wire.29001",
  "wire.1201",
  "wire.1202",
] as const;

export interface WireBattleReportSnapshot {
  /** 空包体。report 和 type 都保持缺省。 */
  empty: boolean;
  /** 字段 1。没有时是 null。 */
  report: WireBattleReport | null;
  /** 字段 2。没有时是 null，不写成空串，也不写成 1。出现的空串仍是空串。 */
  type: string | null;
  marks: WireBattleMark[];
}

/** 空白、缺省或不是字符串时写成 fallback。超长按码点截断。不把空壳编出去。 */
export function normalizeWireBattleReportText(value: unknown, fallback: string, maxLen: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.replace(/[\r\n]/g, "").trim();
  if (!trimmed) return fallback;
  const chars = Array.from(trimmed);
  if (chars.length <= maxLen) return trimmed;
  return chars.slice(0, maxLen).join("");
}

export function readWireBattleReportQuery(data: unknown): { battleId: string; type: string } {
  let battleId = WIRE_BATTLE_REPORT_DEFAULT_ID;
  let type = WIRE_BATTLE_REPORT_DEFAULT_TYPE;
  if (data && typeof data === "object") {
    const raw = data as { battleId?: unknown; type?: unknown };
    if (typeof raw.battleId === "string") {
      battleId = normalizeWireBattleReportText(raw.battleId, WIRE_BATTLE_REPORT_DEFAULT_ID, MAX_BATTLE_ID);
    }
    if (typeof raw.type === "string") {
      type = normalizeWireBattleReportText(raw.type, WIRE_BATTLE_REPORT_DEFAULT_TYPE, MAX_TYPE);
    }
  }
  return { battleId, type };
}

/** GReqBattleReport。字段 1 battle_id，字段 2 type。1、1 的包体是 `0a 01 31 12 01 31`。 */
export function encodeWireBattleReportBody(battleId: string, type: string): Uint8Array {
  const id = normalizeWireBattleReportText(battleId, WIRE_BATTLE_REPORT_DEFAULT_ID, MAX_BATTLE_ID);
  const kind = normalizeWireBattleReportText(type, WIRE_BATTLE_REPORT_DEFAULT_TYPE, MAX_TYPE);
  const parts: number[] = [];
  pushString(parts, WIRE_BATTLE_REPORT_ID_FIELD, id);
  pushString(parts, WIRE_BATTLE_REPORT_TYPE_FIELD, kind);
  return Uint8Array.from(parts);
}

/**
 * 解 s2c 3102。空包体返回已同步空表。
 * 超长、坏 varint、report 有包但整段解不开时返回 null，调用方保持上一次。
 */
export function decodeWireGetBattleReport(body: Uint8Array | null | undefined): WireBattleReportSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return { empty: true, report: null, type: null, marks: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const snap: WireBattleReportSnapshot = {
    empty: false,
    report: null,
    type: null,
    marks: [],
  };
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === WIRE_BATTLE_REPORT_REPORT_FIELD && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeWireBattleReport(row.bytes);
      if (!parsed) continue;
      snap.report = parsed;
      continue;
    }
    if (row.field === WIRE_BATTLE_REPORT_TYPE_FIELD && row.kind === "bytes" && row.bytes) {
      const text = decodeUtf8(row.bytes);
      if (text === null) {
        snap.marks.push({ field: row.field, text: "未解" });
      } else {
        snap.type = text;
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) snap.marks.push(mark);
  }
  if (blobs > 0 && !snap.report) return null;
  return snap;
}

/** 主线页上的请求战报。null 是还没同步。空包体写「已同步空表」。缺的 type 不写成 1。 */
export function formatWireBattleReport(snap: WireBattleReportSnapshot | null): string {
  if (!snap) return "请求战报 " + WIRE_BATTLE_REPORT_UNSYNCED;
  if (snap.empty) return "请求战报 " + WIRE_BATTLE_REPORT_EMPTY;
  const parts: string[] = [];
  if (snap.type !== null) parts.push(snap.type.length === 0 ? "type 空" : "type=" + snap.type);
  if (snap.report) parts.push("report rounds " + snap.report.rounds.length);
  else parts.push(WIRE_BATTLE_REPORT_NO_REPORT);
  const line = parts.length === 0 ? "请求战报 " + WIRE_BATTLE_REPORT_ABSENT : "请求战报 " + parts.join(" / ");
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

function pushString(parts: number[], field: number, text: string): void {
  const bytes = utf8(text);
  pushVarint(parts, (field << 3) | 2);
  pushVarint(parts, bytes.length);
  for (let i = 0; i < bytes.length; i++) parts.push(bytes[i]);
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

function utf8(text: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text);
  const parts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }
    if (c < 0x80) parts.push(c);
    else if (c < 0x800) parts.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) parts.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else parts.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return Uint8Array.from(parts);
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
  } catch (_err) {
    return null;
  }
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
      continue;
    }
    return null;
  }
  return out;
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
