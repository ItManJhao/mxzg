/**
 * 真服世界等级只读。c2s / s2c 都是 51001。
 * c2s 是 GReqWorldLevel，没有字段。整帧 04 00 00 00 39 c7 00 00，即 0400000039c70000。
 * 51001 = 0xC739，小端是 39 c7 00 00。空体安全。
 * 不是角色资料 2001。备选 20101 不做。
 *
 * 由 WireSession.pullIdle 在空 c2s 74100 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间，也不跟 11005、58017 一起补进那一截。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 本模块无写操作号。不写金币，不写钻石。不接 USE_*。
 *
 * s2c 51001 是 GResWorldLevel。对得上的名字才用，对不上的号按字段号写。
 * - 1 level（int64）
 * 没有的数不写成 0。出现的 0 仍写 0。
 *
 * 空包体是已同步，level 保持缺省。解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.worldLevel。 */
export const WIRE_WORLD_CMD = "wire.51001";

export const WIRE_WORLD_READONLY_TITLE = "世界等级（真服只读）";
export const WIRE_WORLD_UNSYNCED_TOAST = "真服未同步";
export const WIRE_WORLD_READONLY_NOTE =
  "只读。本模块无写操作号。不做 20101。不写金币，不写钻石。不夹在 2001 和 3007 中间";
export const WIRE_WORLD_SIDE_EFFECT = "无写库。空体安全。只在 74100 之后发一次";
export const WIRE_WORLD_FIELD_NOTE = "level。没有的数不写成 0。对不上的号按字段号写";

export interface WireWorldMark {
  field: number;
  text: string;
}

export interface WireWorldSnapshot {
  /** GResWorldLevel.level。没有时是 null，不写成 0。 */
  level: number | null;
  /** 对不上字段 1 的号。 */
  marks: WireWorldMark[];
}

/**
 * 解 s2c 51001。空包体返回已同步的缺省 level。
 * 超长、坏 varint 返回 null。
 */
export function decodeWireWorld(body: Uint8Array | null | undefined): WireWorldSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireWorldMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    level: nonNegativeVarint(fields, 1),
    marks,
  };
}

/** 页上和日志都写 level。没有时写「无」。出现的 0 仍写 0。 */
export function formatWireWorldLine(snap: WireWorldSnapshot): string {
  const line = "level=" + numText(snap.level);
  return joinMarks(line, snap.marks);
}

export function wireWorldNote(snap: WireWorldSnapshot): string {
  return formatWireWorldLine(snap) + "。" + WIRE_WORLD_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireWorldSnapshot {
  return { level: null, marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireWorldMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireWorldMark[]): string {
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

function markOf(row: RawField): WireWorldMark | null {
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
