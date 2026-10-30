/**
 * 真服召唤次数只读。c2s / s2c 都是 4004。
 * c2s 没有字段，也没有 page。整帧 04 00 00 00 a4 0f 00 00，即 04000000a40f0000。
 * 4004 = 0x0FA4，小端是 A4 0F 00 00。
 * 不是英雄列表 4001。不是占位 summon.pull（1501）。
 *
 * 由 WireSession.pullIdle 在空 c2s 27001 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 4002 召唤、4005 累积召唤奖。不做 58001、58007、4201。
 * 副作用仅可能懒建 HeroSummon。不写金币，不写钻石。不接 USE_*。
 *
 * s2c 4004 是 GResHeroSummonCount。对得上的名字才用，对不上的号按字段号写。
 * - 1 free_time
 * - 2 senior_free_time
 * 没有的数不写成 0。
 *
 * 空包体是已同步。两个次数都可以没有。
 * 解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.heroSummonCount。 */
export const WIRE_SUMMON_CMD = "wire.4004";

export const WIRE_SUMMON_READONLY_TITLE = "召唤（真服只读）";
export const WIRE_SUMMON_UNSYNCED_TOAST = "真服未同步";
export const WIRE_SUMMON_READONLY_NOTE =
  "只读。不召唤，不领累积奖。不发 4002、4005。不做 58001、58007、4201。不写金币，不写钻石。英雄列表仍是 4001";
export const WIRE_SUMMON_SIDE_EFFECT = "可能懒建 HeroSummon。无 page";
export const WIRE_SUMMON_FIELD_NOTE = "free_time、senior_free_time。没有的数不写成 0。对不上的号按字段号写";

export interface WireSummonMark {
  field: number;
  text: string;
}

export interface WireSummonSnapshot {
  /** GResHeroSummonCount.free_time。没有时是 null，不写成 0。 */
  freeTime: number | null;
  /** GResHeroSummonCount.senior_free_time。没有时是 null，不写成 0。 */
  seniorFreeTime: number | null;
  /** 对不上 1、2 的号。 */
  marks: WireSummonMark[];
}

/**
 * 解 s2c 4004。空包体返回已同步的空次数。
 * 超长、坏 varint 返回 null。
 */
export function decodeWireSummon(body: Uint8Array | null | undefined): WireSummonSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireSummonMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    freeTime: nonNegativeVarint(fields, 1),
    seniorFreeTime: nonNegativeVarint(fields, 2),
    marks,
  };
}

/** 页上和日志都写 free_time / senior_free_time。没有的格子写「无」。 */
export function formatWireSummonLine(snap: WireSummonSnapshot): string {
  const line = "free_time=" + numText(snap.freeTime) + " / senior_free_time=" + numText(snap.seniorFreeTime);
  return joinMarks(line, snap.marks);
}

export function wireSummonNote(snap: WireSummonSnapshot): string {
  return formatWireSummonLine(snap) + "。" + WIRE_SUMMON_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireSummonSnapshot {
  return { freeTime: null, seniorFreeTime: null, marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireSummonMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireSummonMark[]): string {
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

function markOf(row: RawField): WireSummonMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint) && row.varint >= 0) {
    return { field: row.field, text: String(Math.floor(row.varint)) };
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
