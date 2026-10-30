/**
 * 真服基金列表只读。c2s / s2c 都是 20001。
 * c2s 是 GReqPromotionList，没有字段。整帧 04 00 00 00 21 4e 00 00，即 04000000214e0000。
 * 20001 = 0x4E21，小端是 21 4e 00 00。空体一次。
 * 不是角色资料 2001。不是世界等级 51001。
 *
 * 由 WireSession.pullIdle 在空 c2s 51001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不做 3007。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 20018 领奖。旁路不发 20004、20010。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 20001 是 GResPromotionList。对得上的名字才用，对不上的号按字段号写。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * - 1 is_buy_foundation
 * - 2 repeated PSMapData foundation_reward_record
 * PSMapData：key=1，value=2。
 * 没有的数不写成 0。出现的 0 仍写 0。
 *
 * 空包体是已同步，is_buy_foundation 保持缺省，记录表为空。
 * 记录有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.promotionList。 */
export const WIRE_PROMOTION_CMD = "wire.20001";

export const WIRE_PROMOTION_READONLY_TITLE = "基金列表（真服只读）";
export const WIRE_PROMOTION_EMPTY = "空记录";
export const WIRE_PROMOTION_UNSYNCED_TOAST = "真服未同步";
export const WIRE_PROMOTION_READONLY_NOTE =
  "只读展示，无领奖入口。不发 20018。旁路不发 20004、20010。不做 3007。不写金币，不写钻石。不回落 Mock";
export const WIRE_PROMOTION_SIDE_EFFECT = "只读。空 c2s 一次，挂在 51001 之后。不发 20018。不碰 20004、20010。不做 3007";
export const WIRE_PROMOTION_FIELD_NOTE =
  "is_buy_foundation、foundation_reward_record 的 key、value。没有的数不写成 0。对不上的号按字段号写";

export interface WirePromotionMark {
  field: number;
  text: string;
}

export interface WirePromotionRecord {
  /** PSMapData.key。没有时是 null，不写成 0。 */
  key: number | null;
  /** PSMapData.value。没有时是 null，不写成 0。 */
  value: number | null;
  /** 对不上 key、value 的号。 */
  marks: WirePromotionMark[];
}

export interface WirePromotionSnapshot {
  /** GResPromotionList.is_buy_foundation。没有时是 null，不写成 0。 */
  isBuyFoundation: number | null;
  records: WirePromotionRecord[];
  /** 对不上字段 1、字段 2 的外层号。 */
  marks: WirePromotionMark[];
}

/**
 * 解 s2c 20001。空包体返回已同步的缺省 is_buy_foundation 和空记录。
 * 超长、坏 varint、记录有包但一条都解不开时返回 null。
 */
export function decodeWirePromotion(body: Uint8Array | null | undefined): WirePromotionSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const records: WirePromotionRecord[] = [];
  const marks: WirePromotionMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") continue;
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeRecord(row.bytes);
      if (!parsed) continue;
      records.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && records.length === 0) return null;
  return {
    isBuyFoundation: nonNegativeVarint(fields, 1),
    records,
    marks,
  };
}

/** 页上写 is_buy_foundation 和记录条数。没有时写「无」。记录为 0 写「空记录」。 */
export function formatWirePromotionHead(snap: WirePromotionSnapshot): string {
  const list = snap.records.length === 0 ? WIRE_PROMOTION_EMPTY : snap.records.length + " 条";
  return joinMarks("is_buy_foundation=" + numText(snap.isBuyFoundation) + " / " + list, snap.marks);
}

/** 行上写 key / value。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWirePromotionLine(row: WirePromotionRecord): string {
  return joinMarks("key=" + numText(row.key) + " / value=" + numText(row.value), row.marks);
}

export function wirePromotionNote(snap: WirePromotionSnapshot): string {
  const head = formatWirePromotionHead(snap);
  const tail = WIRE_PROMOTION_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.records.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.records.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWirePromotionLine(snap.records[i]));
  if (snap.records.length > n) parts.push("其余 " + (snap.records.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WirePromotionSnapshot {
  return { isBuyFoundation: null, records: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WirePromotionMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WirePromotionMark[]): string {
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

function decodeRecord(body: Uint8Array): WirePromotionRecord | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WirePromotionMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    key: nonNegativeVarint(fields, 1),
    value: nonNegativeVarint(fields, 2),
    marks,
  };
}

function markOf(row: RawField): WirePromotionMark | null {
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
