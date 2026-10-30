/**
 * 真服许愿池只读。c2s / s2c 都是 27001。
 * c2s 没有字段。整帧 04 00 00 00 79 69 00 00，即 0400000079690000。
 * 27001 = 0x6979，小端是 79 69 00 00。
 * 不是占位 wish.view / wish.draw（2501 / 2502）。备选 4201 本刀不发，也不做页。
 *
 * 由 WireSession.pullIdle 在空 c2s 21010 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 27002 刷新、27003 抽奖、27004 幸运领奖。不写金币，不写钻石。不接 USE_*。
 *
 * s2c 27001 是 GResBlessingPoolList。对得上的名字才用，对不上的号按字段号写。
 * - 1 repeated GResBlessingData blessing_data
 * GResBlessingData：
 * - 1 type
 * - 2 refresh_times
 * - 3 repeated pool_data。子消息没有另起的名字：1 position、2 times、3 item
 * - 4 lucky_value
 * - 5 lucky_reward_id
 * - 6 refresh_time
 * 没有的数不写成 0。
 * item 是子消息时，里面的号对不上名字，按字段号写。解不开写「未解」。
 * 名单以外的号也按字段号写，不另起名字。
 *
 * 空包体、以及能解开但 blessing_data 为 0 条，都是已同步的空表。
 * blessing_data 有包但一条都解不开时返回 null，调用方保持上一次。
 *
 * 副作用：可能懒建，也可能跨日写库。无扣费。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.blessingPool。 */
export const WIRE_WISH_CMD = "wire.27001";

export const WIRE_WISH_READONLY_TITLE = "许愿池（真服只读）";
export const WIRE_WISH_EMPTY = "空表";
export const WIRE_WISH_UNSYNCED_TOAST = "真服未同步";
export const WIRE_WISH_READONLY_NOTE = "只读。不刷新，不抽奖，不领幸运奖。不发 27002、27003、27004。不写金币，不写钻石";
export const WIRE_WISH_SIDE_EFFECT = "可能懒建或跨日写库。无扣费";
export const WIRE_WISH_FIELD_NOTE =
  "type、refresh_times、lucky_value、lucky_reward_id、refresh_time。格子写 position、times。item 对得上才写名字，对不上写字段号";

export interface WireWishMark {
  field: number;
  text: string;
}

export interface WireWishSlot {
  /** pool_data.position。没有时是 null，不写成 0。 */
  position: number | null;
  /** pool_data.times。没有时是 null，不写成 0。 */
  times: number | null;
  /** pool_data.item。没有是 null。解不开是「未解」。子字段按字段号。 */
  item: string | null;
  /** 对不上 position / times / item 的号。 */
  marks: WireWishMark[];
}

export interface WireWishPool {
  /** GResBlessingData.type。没有时是 null。 */
  type: number | null;
  /** GResBlessingData.refresh_times。没有时是 null。 */
  refreshTimes: number | null;
  /** GResBlessingData.lucky_value。没有时是 null。 */
  luckyValue: number | null;
  /** GResBlessingData.lucky_reward_id。没有时是 null。 */
  luckyRewardId: number | null;
  /** GResBlessingData.refresh_time。原数。没有时是 null。 */
  refreshTime: number | null;
  slots: WireWishSlot[];
  /** 对不上 1–6 的号。 */
  marks: WireWishMark[];
}

export interface WireWishSnapshot {
  pools: WireWishPool[];
  /** 对不上 blessing_data 的外层号。 */
  marks: WireWishMark[];
}

/**
 * 解 s2c 27001。空包体、以及没有 blessing_data 的合法包，都返回空表。
 * 超长、坏 varint、blessing_data 有包但一条都解不开时返回 null。
 */
export function decodeWireWish(body: Uint8Array | null | undefined): WireWishSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const pools: WireWishPool[] = [];
  const marks: WireWishMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const pool = decodePool(row.bytes);
      if (pool) pools.push(pool);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && pools.length === 0) return null;
  return { pools, marks };
}

export function formatWireWishHead(pool: WireWishPool): string {
  const head =
    "type=" +
    numText(pool.type) +
    " / refresh_times=" +
    numText(pool.refreshTimes) +
    " / lucky_value=" +
    numText(pool.luckyValue) +
    " / lucky_reward_id=" +
    numText(pool.luckyRewardId) +
    " / refresh_time=" +
    numText(pool.refreshTime);
  return joinMarks(head, pool.marks);
}

/** 格子写 position、times、item。item 子字段保持字段号。 */
export function formatWireWishSlot(slot: WireWishSlot): string {
  const line = "position=" + numText(slot.position) + " / times=" + numText(slot.times) + " / item=" + itemText(slot.item);
  return joinMarks(line, slot.marks);
}

export function wireWishNote(snap: WireWishSnapshot): string {
  const tail = WIRE_WISH_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.pools.length === 0) {
    const extra = snap.marks.length > 0 ? "。" + marksText(snap.marks) : "";
    return WIRE_WISH_EMPTY + extra + "。" + tail;
  }
  const parts: string[] = [];
  const pools = Math.min(snap.pools.length, 2);
  for (let i = 0; i < pools; i++) {
    const pool = snap.pools[i];
    parts.push(formatWireWishHead(pool));
    const n = Math.min(pool.slots.length, 2);
    for (let j = 0; j < n; j++) parts.push(formatWireWishSlot(pool.slots[j]));
    if (pool.slots.length > n) parts.push("其余 " + (pool.slots.length - n) + " 格");
  }
  if (snap.pools.length > pools) parts.push("其余 " + (snap.pools.length - pools) + " 个池");
  return parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireWishSnapshot {
  return { pools: [], marks: [] };
}

function itemText(item: string | null): string {
  return item === null ? "无" : item;
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireWishMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireWishMark[]): string {
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

function decodePool(body: Uint8Array): WireWishPool | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const slots: WireWishSlot[] = [];
  const marks: WireWishMark[] = [];
  let slotBlobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 3 && row.kind === "bytes" && row.bytes) {
      slotBlobs += 1;
      const slot = decodeSlot(row.bytes);
      if (slot) slots.push(slot);
      continue;
    }
    if (row.field >= 1 && row.field <= 6) continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  const pool: WireWishPool = {
    type: nonNegativeVarint(fields, 1),
    refreshTimes: nonNegativeVarint(fields, 2),
    luckyValue: nonNegativeVarint(fields, 4),
    luckyRewardId: nonNegativeVarint(fields, 5),
    refreshTime: nonNegativeVarint(fields, 6),
    slots,
    marks,
  };
  const named =
    pool.type !== null ||
    pool.refreshTimes !== null ||
    pool.luckyValue !== null ||
    pool.luckyRewardId !== null ||
    pool.refreshTime !== null;
  if (slotBlobs > 0 && slots.length === 0 && !named && marks.length === 0) return null;
  return pool;
}

function decodeSlot(body: Uint8Array): WireWishSlot | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const items: string[] = [];
  const marks: WireWishMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 3) {
      items.push(formatItemField(row));
      continue;
    }
    if (row.field === 1 || row.field === 2) continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    position: nonNegativeVarint(fields, 1),
    times: nonNegativeVarint(fields, 2),
    item: items.length > 0 ? items.join("；") : null,
    marks,
  };
}

function formatItemField(row: RawField): string {
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint) && row.varint >= 0) {
    return String(Math.floor(row.varint));
  }
  if (row.kind === "bytes" && row.bytes) {
    if (row.bytes.length === 0) return "无";
    const inner = readRawFields(row.bytes);
    if (!inner) return "未解";
    if (inner.length === 0) return "无";
    const parts: string[] = [];
    for (let i = 0; i < inner.length; i++) parts.push(formatUnknownField(inner[i]));
    return parts.join(",");
  }
  return "未解";
}

function formatUnknownField(row: RawField): string {
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint) && row.varint >= 0) {
    return "字段" + row.field + "=" + Math.floor(row.varint);
  }
  if (row.kind === "bytes" && row.bytes) {
    const inner = row.bytes.length > 0 ? readRawFields(row.bytes) : [];
    if (inner && inner.length > 0) {
      const parts: string[] = [];
      for (let i = 0; i < inner.length; i++) parts.push(formatUnknownField(inner[i]));
      return "字段" + row.field + "={" + parts.join(",") + "}";
    }
    const text = utf8Printable(row.bytes);
    if (text !== null) return "字段" + row.field + "=" + text;
  }
  return "字段" + row.field + "=未解";
}

function markOf(row: RawField): WireWishMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint) && row.varint >= 0) {
    return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    return { field: row.field, text: formatItemField(row) };
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
