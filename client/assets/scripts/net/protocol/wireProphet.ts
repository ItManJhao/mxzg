/**
 * 真服先知召唤幸运值只读。c2s / s2c 都是 13044。
 * c2s 是 GReqProphetSummonInfo，没有字段。整帧 04 00 00 00 f4 32 00 00，即 04000000f4320000。
 * 13044 = 0x32F4，小端是 F4 32 00 00。
 * 不是召唤次数 4004。不是占位 summon.pull（1501）。
 *
 * 由 WireSession.pullIdle 在空 c2s 4004 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 13041 抽、13042 置换、13043 确认置换。不做 58007、4201。
 * 不写金币，不写钻石。不接 USE_*。
 *
 * s2c 13044 是 GResProphetSummonInfo。对得上的名字才用，对不上的号按字段号写。
 * - 1 repeated PSProphetLucky luckys
 * PSProphetLucky：type=1，lucky=2。
 * 没有的数不写成 0。
 *
 * 空包体、以及能解开但 luckys 为 0 条，都是已同步的空表。
 * luckys 有包但一条都解不开时返回 null，调用方保持上一次。
 *
 * 副作用：可能懒建 HeroSummon。跨日可能重置 levelResetTimes。只读可接受，不规避。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.prophetSummon。 */
export const WIRE_PROPHET_CMD = "wire.13044";

export const WIRE_PROPHET_READONLY_TITLE = "先知召唤（真服只读）";
export const WIRE_PROPHET_EMPTY = "空表";
export const WIRE_PROPHET_UNSYNCED_TOAST = "真服未同步";
export const WIRE_PROPHET_READONLY_NOTE =
  "只读。不抽，不置换，不确认置换。不发 13041、13042、13043。不做 58007、4201。不写金币，不写钻石。召唤次数仍是 4004";
export const WIRE_PROPHET_SIDE_EFFECT = "可能懒建 HeroSummon。跨日可能重置 levelResetTimes";
export const WIRE_PROPHET_FIELD_NOTE = "行上 type、lucky。没有的数不写成 0。对不上的号按字段号写";

export interface WireProphetMark {
  field: number;
  text: string;
}

export interface WireProphetLucky {
  /** PSProphetLucky.type。没有时是 null，不写成 0。 */
  type: number | null;
  /** PSProphetLucky.lucky。没有时是 null，不写成 0。 */
  lucky: number | null;
  /** 对不上 1、2 的号。 */
  marks: WireProphetMark[];
}

export interface WireProphetSnapshot {
  luckys: WireProphetLucky[];
  /** 对不上字段 1 的外层号。 */
  marks: WireProphetMark[];
}

/**
 * 解 s2c 13044。空包体、以及没有 luckys 的合法包，都返回空表。
 * 超长、坏 varint、luckys 有包但一条都解不开时返回 null。
 */
export function decodeWireProphet(body: Uint8Array | null | undefined): WireProphetSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const luckys: WireProphetLucky[] = [];
  const marks: WireProphetMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeLucky(row.bytes);
      if (!parsed) continue;
      luckys.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && luckys.length === 0) return null;
  return { luckys, marks };
}

/** 行上写 type / lucky。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireProphetLine(row: WireProphetLucky): string {
  const line = "type=" + numText(row.type) + " / lucky=" + numText(row.lucky);
  return joinMarks(line, row.marks);
}

export function formatWireProphetHead(snap: WireProphetSnapshot): string {
  if (snap.luckys.length === 0) return joinMarks(WIRE_PROPHET_EMPTY, snap.marks);
  return joinMarks(snap.luckys.length + " 条", snap.marks);
}

export function wireProphetNote(snap: WireProphetSnapshot): string {
  const head = formatWireProphetHead(snap);
  if (snap.luckys.length === 0) return head + "。" + WIRE_PROPHET_SIDE_EFFECT + "。不写金币，不写钻石";
  const parts: string[] = [];
  const n = Math.min(snap.luckys.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireProphetLine(snap.luckys[i]));
  if (snap.luckys.length > n) parts.push("其余 " + (snap.luckys.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + WIRE_PROPHET_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireProphetSnapshot {
  return { luckys: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireProphetMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireProphetMark[]): string {
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

function decodeLucky(body: Uint8Array): WireProphetLucky | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireProphetMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    type: nonNegativeVarint(fields, 1),
    lucky: nonNegativeVarint(fields, 2),
    marks,
  };
}

function markOf(row: RawField): WireProphetMark | null {
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
