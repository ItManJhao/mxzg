/**
 * 真服浮空岛时间只读。c2s / s2c 都是 73001。
 * c2s 是 GReqFloatingIslandsTime，没有字段。整帧 04 00 00 00 29 1d 01 00，即 04000000291d0100。
 * 73001 = 0x11D29，小端是 29 1d 01 00。空体一次。
 * 不是角色资料 2001。不是基金列表 20001。不是超值首充 20012。不是灵器数据 70001。不是世界等级 51001。
 *
 * 由 WireSession.pullIdle 在空 c2s 70001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不做 20011。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 73002。73002 有懒建和日刷写库，不当纯只读。
 * 不发 73003 挑战、73004 买次数。
 * 本号无写库。不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 73001 是 GResFloatingIslandsTime。对得上的名字才用，对不上的号按字段号写。
 * - 2 next_time
 * - 3 stage
 * 没有的数不写成 0。出现的 0 仍写 0。不补字段 1。
 *
 * 空包体是已同步，next_time 和 stage 保持缺省。解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.floatingIslandsTime。 */
export const WIRE_ISLANDS_CMD = "wire.73001";

export const WIRE_ISLANDS_READONLY_TITLE = "浮空岛时间（真服只读）";
export const WIRE_ISLANDS_UNSYNCED_TOAST = "真服未同步";
export const WIRE_ISLANDS_READONLY_NOTE =
  "只读展示 next_time、stage。无挑战、买次数入口。不发 73002。73002 有懒建和日刷写库，不当纯只读。不发 73003 挑战、73004 买次数。不做 20011。本号无写库。不写金币，不写钻石。不回落 Mock";
export const WIRE_ISLANDS_SIDE_EFFECT =
  "本号无写库。空 c2s 一次，挂在 70001 之后。不发 73002、73003、73004。不做 20011";
export const WIRE_ISLANDS_FIELD_NOTE = "next_time、stage。没有的数不写成 0。对不上的号按字段号写";

export interface WireIslandsMark {
  field: number;
  text: string;
}

export interface WireIslandsSnapshot {
  /** GResFloatingIslandsTime.next_time。没有时是 null，不写成 0。 */
  nextTime: number | null;
  /** GResFloatingIslandsTime.stage。没有时是 null，不写成 0。 */
  stage: number | null;
  /** 对不上字段 2、字段 3 的号。 */
  marks: WireIslandsMark[];
}

/**
 * 解 s2c 73001。空包体返回已同步的缺省 next_time 和 stage。
 * 超长、坏 varint 返回 null。
 */
export function decodeWireIslands(body: Uint8Array | null | undefined): WireIslandsSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireIslandsMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 2 || row.field === 3) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    nextTime: nonNegativeVarint(fields, 2),
    stage: nonNegativeVarint(fields, 3),
    marks,
  };
}

/** 页上和日志都写 next_time / stage。没有时写「无」。出现的 0 仍写 0。 */
export function formatWireIslandsLine(snap: WireIslandsSnapshot): string {
  const line = "next_time=" + numText(snap.nextTime) + " / stage=" + numText(snap.stage);
  return joinMarks(line, snap.marks);
}

export function wireIslandsNote(snap: WireIslandsSnapshot): string {
  return formatWireIslandsLine(snap) + "。" + WIRE_ISLANDS_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireIslandsSnapshot {
  return { nextTime: null, stage: null, marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireIslandsMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireIslandsMark[]): string {
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

function markOf(row: RawField): WireIslandsMark | null {
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
