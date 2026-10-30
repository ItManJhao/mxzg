/**
 * 真服点金只读。c2s / s2c 都是 17000，BuyGoldHandler.buyGoldList。
 * s2c 是 GResBuyGoldLog：status=1，time=2，repeated PSBuyGoldData list=3（idx=1，num=2）。
 * 不是占位 login7.view / login7.claim / login7.advance（2201–2203）。
 * 不从「七日登录」进入。
 *
 * c2s 没有包体。整帧 04 00 00 00 68 42 00 00。
 * 由 WireSession.pullIdle 在 c2s 4001 page=1 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 12020。20001 在 51001 之后发，不是点金。18001 是竞技场只读，接在 12010 之后。不点金，不写钱包。
 *
 * s2c 17000 按 GResBuyGoldLog 命名。对不上的子字段不补 0。
 * net-20261020 三例同形，一例包体 26 字节：
 * `08 01 10 90 fa da d6 06 1a 04 08 01 10 00 1a 04 08 02 10 00 1a 04 08 03 10 00`
 * - status：三例都是 1。
 * - time：原数。不推开服天。
 * - list：三例各 3 条。idx 为 1 / 2 / 3，num 都是 0。
 * 空包体、或能解开但 list 为 0 条，都是已同步的空表。
 * 有 list 包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.buyGoldList。 */
export const WIRE_ACTIVITY_CMD = "wire.17000";

export const WIRE_ACTIVITY_READONLY_TITLE = "点金（真服只读）";
export const WIRE_ACTIVITY_EMPTY = "已同步空表";
export const WIRE_ACTIVITY_UNSYNCED_TOAST = "真服未同步";
export const WIRE_ACTIVITY_READONLY_NOTE = "只读。不点金，不写金币";
export const WIRE_ACTIVITY_FIELD_NOTE = "status、time 写原数。行上写 idx / num";

export interface WireActivityRow {
  /** PSBuyGoldData.idx。没有时是 null，不写成 0。 */
  idx: number | null;
  /** PSBuyGoldData.num。没有时是 null，不写成 0。 */
  num: number | null;
}

export interface WireActivitySnapshot {
  /** GResBuyGoldLog.status。 */
  status: number | null;
  /** GResBuyGoldLog.time。原数，不是开服天。 */
  time: number | null;
  rows: WireActivityRow[];
}

/**
 * 解 s2c 17000。空包体、以及没有 list 的合法包，都返回空表，不返回 null。
 * 超长、坏 varint、list 有包但一条都解不开时返回 null。
 */
export function decodeWireActivity(body: Uint8Array | null | undefined): WireActivitySnapshot | null {
  if (!body) return null;
  if (body.length === 0) return { status: null, time: null, rows: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const rows: WireActivityRow[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 3 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const parsed = decodeBuyGoldRow(row.bytes);
    if (!parsed) continue;
    rows.push(parsed);
  }
  if (blobs > 0 && rows.length === 0) return null;
  return {
    status: nonNegativeVarint(fields, 1),
    time: nonNegativeVarint(fields, 2),
    rows,
  };
}

/** 行上写 PSBuyGoldData 的 idx / num。 */
export function formatWireActivityLine(row: WireActivityRow): string {
  return "idx=" + numText(row.idx) + " / num=" + numText(row.num);
}

/** status 与 time 的原数。两个都没有就不写。 */
export function formatWireActivityStamp(snap: WireActivitySnapshot): string | null {
  if (snap.status === null && snap.time === null) return null;
  return "status=" + numText(snap.status) + " / time=" + numText(snap.time);
}

export function wireActivityNote(snap: WireActivitySnapshot): string {
  const head = "status=" + numText(snap.status) + " time=" + numText(snap.time);
  if (snap.rows.length === 0) return "已同步空表。" + head + "。不写金币";
  const parts: string[] = [];
  const n = Math.min(snap.rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireActivityLine(snap.rows[i]));
  if (snap.rows.length > n) parts.push("其余 " + (snap.rows.length - n) + " 条");
  return head + " " + parts.join("；") + "。不写金币";
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeBuyGoldRow(body: Uint8Array): WireActivityRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const idx = nonNegativeVarint(fields, 1);
  const num = nonNegativeVarint(fields, 2);
  if (idx === null && num === null) return null;
  return { idx, num };
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
