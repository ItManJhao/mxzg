/**
 * 真服背包只读。字段号按仓库里 ResBackPackItem 的声明顺序，从 1 编号。
 * 不是占位 bag.list。
 *
 * GReqBackPackList（c2s 5001）没有字段。整帧 04 00 00 00 89 13 00 00，即 0400000089130000。
 * 5001 = 0x1389，小端是 89 13 00 00。空体安全。
 *
 * 这一帧已经由 WireSession.pullRoleProfile 在空 c2s 2001 之后发出，位于 3007 之前。
 * pullIdle 的链尾是 51001。5001 仍只在 2001 之后发一次，不在 51001 之后补第二帧，也不改空拉语义。
 * Boot.ts 不改。相对顺序仍是
 * 2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 5004、5005 合成，不发 5006 开箱，不发 5008、5009 碎片自选，不发 5011 分解，不发 5012 充值卡。
 * 5002 只收，不主动当请求发。不发 5010、5007、5013。
 * 不写金币，不写钻石。不接 USE_*。无写库。只读 list。
 *
 * s2c 5001 是 GResBackPackList。对得上的名字才用，对不上的号按字段号写。
 * - 1 repeated ResBackPackItem list
 * ResBackPackItem：item_id=1，item_type=2，num=3。
 * 没有的数不写成 0。出现的 0 仍写 0，不把这一格丢掉。
 *
 * 空包体、以及能解开但 list 为 0 条，都是已同步的空背包。
 * list 有包但一条都解不开时返回 null，调用方保持上一次。
 *
 * GResBackpackGain（s2c 5002）登录窗可能没有。客户端不发。
 * - 字段 1 varint type，只打日志，不弹窗，不决定加减。
 * - 字段 2 repeated ResBackPackItem。num > 0 加到同 item_id + item_type；num = 0 删掉该格。
 * num 缺了不当成 0，不加也不删。5001 是整表替换。5002 只在已经收到过 5001 之后合并。
 *
 * 钱包只认 s2c 2001 的金币和宝石。这里不写 Session.gold / diamond，也不写顶栏。
 * 50000 仍只记日志。占位 bag.list / bag.use 仍是 1601 / 1602。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.backpackList。 */
export const WIRE_BAG_CMD = "wire.5001";
/** s2c。客户端不发。数字号是 WireCmd.backpackGain。 */
export const WIRE_BAG_GAIN_CMD = "wire.5002";

export const WIRE_BAG_READONLY_TITLE = "背包（真服只读）";
export const WIRE_BAG_EMPTY = "空背包";
export const WIRE_BAG_UNSYNCED_TOAST = "真服未同步";
export const WIRE_BAG_READONLY_NOTE =
  "只读。不发 5004、5005 合成，不发 5006 开箱，不发 5008、5009 碎片自选，不发 5011 分解，不发 5012 充值卡。5002 仅推送，不主动发。不写金币，不写钻石。占位 bag.list / bag.use 仍是 1601 / 1602";
export const WIRE_BAG_SIDE_EFFECT = "无写库。只读 list。空体安全。进主城已在 2001 之后空拉 5001，不再补发";
export const WIRE_BAG_FIELD_NOTE = "行上 item_id、item_type、num。没有的数不写成 0。对不上的号按字段号写";

export interface WireBagMark {
  field: number;
  text: string;
}

export interface WireBagItem {
  /** ResBackPackItem.item_id。没有时是 null，不写成 0。 */
  itemId: number | null;
  /** ResBackPackItem.item_type。没有时是 null，不写成 0。 */
  itemType: number | null;
  /** ResBackPackItem.num。没有时是 null，不写成 0。出现的 0 仍是 0。 */
  num: number | null;
  /** 对不上 1、2、3 的号。手写的 5002 增量可以不带。 */
  marks?: WireBagMark[];
}

export interface WireBagList {
  items: WireBagItem[];
  /** 对不上字段 1 的外层号。 */
  marks: WireBagMark[];
}

export interface WireBagGain {
  /** 字段 1。没有这个字段时是 null。只打日志。 */
  type: number | null;
  items: WireBagItem[];
}

/**
 * 解 s2c 5001。空包体、以及没有 list 的合法包，都返回空背包。
 * 超长、坏 varint、list 有包但一条都解不开时返回 null。
 */
export function decodeWireBagList(body: Uint8Array | null | undefined): WireBagList | null {
  if (!body) return null;
  if (body.length === 0) return emptyList();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const items: WireBagItem[] = [];
  const marks: WireBagMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeItem(row.bytes);
      if (!parsed) continue;
      items.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && items.length === 0) return null;
  return { items, marks };
}

/**
 * 解 s2c 5002。空包体当成没有变更。
 * 坏包、字段 2 有包但一格都解不开时返回 null。
 */
export function decodeWireBagGain(body: Uint8Array | null | undefined): WireBagGain | null {
  if (!body) return null;
  if (body.length === 0) return { type: null, items: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  let type: number | null = null;
  const items: WireBagItem[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && type === null && typeof row.varint === "number") {
      type = row.varint;
      continue;
    }
    if (row.field !== 2 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const item = decodeItem(row.bytes);
    if (!item) continue;
    items.push(item);
  }
  if (blobs > 0 && items.length === 0) return null;
  if (type === null && items.length === 0) return null;
  return { type, items };
}

/**
 * 5002 合并。item_id 和 item_type 都在、且 num > 0 时加到已有数量，没有就新增。
 * num = 0 删掉同 id + 类型。num 缺了不写成 0，这一条不加也不删。
 */
export function applyWireBagGain(list: readonly WireBagItem[], gain: WireBagGain): WireBagItem[] {
  const out = list.map(copyItem);
  for (let i = 0; i < gain.items.length; i++) {
    const delta = gain.items[i];
    if (delta.itemId === null || delta.itemType === null || delta.num === null) continue;
    const idx = findBagItem(out, delta.itemId, delta.itemType);
    if (delta.num === 0) {
      if (idx >= 0) out.splice(idx, 1);
      continue;
    }
    if (delta.num < 0) continue;
    if (idx < 0) {
      out.push(copyItem(delta));
      continue;
    }
    const prev = out[idx].num;
    const sum = (prev === null ? 0 : prev) + delta.num;
    if (sum <= 0) out.splice(idx, 1);
    else out[idx] = { itemId: delta.itemId, itemType: delta.itemType, num: sum, marks: marksOf(out[idx]) };
  }
  return out;
}

/** 行上写 item_id / item_type / num。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireBagLine(item: WireBagItem): string {
  const line = "item_id=" + numText(item.itemId) + " / item_type=" + numText(item.itemType) + " / num=" + numText(item.num);
  return joinMarks(line, marksOf(item));
}

export function formatWireBagHead(list: WireBagList): string {
  if (list.items.length === 0) return joinMarks(WIRE_BAG_EMPTY, list.marks || []);
  return joinMarks(list.items.length + " 件", list.marks || []);
}

export function wireBagNote(list: WireBagList): string {
  const head = formatWireBagHead(list);
  const tail = WIRE_BAG_SIDE_EFFECT + "。不写金币，不写钻石";
  if (list.items.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(list.items.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireBagLine(list.items[i]));
  if (list.items.length > n) parts.push("其余 " + (list.items.length - n) + " 件");
  return head + "。" + parts.join("；") + "。" + tail;
}

export function wireBagGainNote(gain: WireBagGain): string {
  const typeText = gain.type === null ? "无" : String(gain.type);
  return "type " + typeText + "，合并 " + gain.items.length + " 条，顶栏不改";
}

export function findBagItem(items: readonly WireBagItem[], itemId: number | null, itemType: number | null): number {
  if (itemId === null || itemType === null) return -1;
  for (let i = 0; i < items.length; i++) {
    if (items[i].itemId === itemId && items[i].itemType === itemType) return i;
  }
  return -1;
}

function emptyList(): WireBagList {
  return { items: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireBagMark[]): string {
  if (!marks || marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireBagMark[]): string {
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

function decodeItem(body: Uint8Array): WireBagItem | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireBagMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2 || row.field === 3) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    itemId: nonNegativeVarint(fields, 1),
    itemType: nonNegativeVarint(fields, 2),
    num: nonNegativeVarint(fields, 3),
    marks,
  };
}

function markOf(row: RawField): WireBagMark | null {
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

function marksOf(item: WireBagItem): WireBagMark[] {
  return item.marks ? item.marks : [];
}

function copyItem(item: WireBagItem): WireBagItem {
  return {
    itemId: item.itemId,
    itemType: item.itemType,
    num: item.num,
    marks: marksOf(item).map((mark) => ({ field: mark.field, text: mark.text })),
  };
}
