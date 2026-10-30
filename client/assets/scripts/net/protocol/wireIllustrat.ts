/**
 * 真服英雄图鉴只读。c2s / s2c 都是 4013。
 * c2s 是 GReqIllustratReward，没有字段。整帧 04 00 00 00 ad 0f 00 00，即 04000000ad0f0000。
 * 4013 = 0x0FAD，小端是 ad 0f 00 00。
 * 名字像领奖，实为查看。空体安全。不是英雄列表 4001。不是英雄宝石 4101。
 *
 * 由 WireSession.pullIdle 在空 c2s 4101 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不把 4013 当领奖再发写号。不发 4014。4014 仅 s2c 推送。
 * 不写金币，不写钻石。不接 USE_*。
 *
 * s2c 4013 是 GResIllustratReward。对得上的名字才用，对不上的号按字段号写。
 * - 1 repeated ResIllustratRewardData list
 * ResIllustratRewardData：hero_type=1，star=2。仓库里其它消息也是按声明顺序从 1 编号。
 * 没有的数不写成 0。
 *
 * 空包体、以及能解开但 list 为 0 条，都是已同步的空表。
 * list 有包但一条都解不开时返回 null，调用方保持上一次。
 *
 * 副作用：无档时服端可能懒建空记录。可接受，不规避。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.illustratReward。 */
export const WIRE_ILLUSTRAT_CMD = "wire.4013";

export const WIRE_ILLUSTRAT_READONLY_TITLE = "英雄图鉴（真服只读）";
export const WIRE_ILLUSTRAT_EMPTY = "空表";
export const WIRE_ILLUSTRAT_UNSYNCED_TOAST = "真服未同步";
export const WIRE_ILLUSTRAT_READONLY_NOTE =
  "只读。不把 4013 当领奖再发写号。不发 4014。不写金币，不写钻石。英雄列表仍是 4001。英雄宝石仍是 4101";
export const WIRE_ILLUSTRAT_SIDE_EFFECT = "无档时服端可能懒建空记录。可接受。空体安全";
export const WIRE_ILLUSTRAT_FIELD_NOTE = "行上 hero_type、star。没有的数不写成 0。对不上的号按字段号写";

export interface WireIllustratMark {
  field: number;
  text: string;
}

export interface WireIllustratRow {
  /** ResIllustratRewardData.hero_type。没有时是 null，不写成 0。 */
  heroType: number | null;
  /** ResIllustratRewardData.star。没有时是 null，不写成 0。 */
  star: number | null;
  /** 对不上 1、2 的号。 */
  marks: WireIllustratMark[];
}

export interface WireIllustratSnapshot {
  rows: WireIllustratRow[];
  /** 对不上字段 1 的外层号。 */
  marks: WireIllustratMark[];
}

/**
 * 解 s2c 4013。空包体、以及没有 list 的合法包，都返回空表。
 * 超长、坏 varint、list 有包但一条都解不开时返回 null。
 */
export function decodeWireIllustrat(body: Uint8Array | null | undefined): WireIllustratSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const rows: WireIllustratRow[] = [];
  const marks: WireIllustratMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeRow(row.bytes);
      if (!parsed) continue;
      rows.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && rows.length === 0) return null;
  return { rows, marks };
}

/** 行上写 hero_type / star。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireIllustratLine(row: WireIllustratRow): string {
  const line = "hero_type=" + numText(row.heroType) + " / star=" + numText(row.star);
  return joinMarks(line, row.marks);
}

export function formatWireIllustratHead(snap: WireIllustratSnapshot): string {
  if (snap.rows.length === 0) return joinMarks(WIRE_ILLUSTRAT_EMPTY, snap.marks);
  return joinMarks(snap.rows.length + " 条", snap.marks);
}

export function wireIllustratNote(snap: WireIllustratSnapshot): string {
  const head = formatWireIllustratHead(snap);
  const tail = WIRE_ILLUSTRAT_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.rows.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireIllustratLine(snap.rows[i]));
  if (snap.rows.length > n) parts.push("其余 " + (snap.rows.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireIllustratSnapshot {
  return { rows: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireIllustratMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireIllustratMark[]): string {
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

function decodeRow(body: Uint8Array): WireIllustratRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireIllustratMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    heroType: nonNegativeVarint(fields, 1),
    star: nonNegativeVarint(fields, 2),
    marks,
  };
}

function markOf(row: RawField): WireIllustratMark | null {
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
