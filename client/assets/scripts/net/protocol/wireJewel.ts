/**
 * 真服英雄宝石只读。c2s / s2c 都是 4101。
 * c2s 是 GReqHeroJewel，没有字段。整帧 04 00 00 00 05 10 00 00，即 0400000005100000。
 * 4101 = 0x1005，小端是 05 10 00 00。
 * 不是英雄列表 4001。不是先知召唤 13044。无 page，空体安全。
 *
 * 由 WireSession.pullIdle 在空 c2s 13044 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 4102 替换、4103 卸、4104 一键穿、4105 一键卸、4106 合成、4107 一键合成。不做 9001。
 * 不写金币，不写钻石。不接 USE_*。无写库。
 *
 * s2c 4101 是 GResHeroJewel。对得上的名字才用，对不上的号按字段号写。
 * - 1 repeated PSHeroJewelData jewel_list
 * PSHeroJewelData：hero_id=1，jewel_list=2（repeated PSJewelData）。
 * PSJewelData：jewel_id=1，place=2，jewel_type=3。仓库里其它消息也是按声明顺序从 1 编号。
 * 没有的数不写成 0。
 *
 * 空包体、以及能解开但 jewel_list 为 0 条，都是已同步的空表。
 * jewel_list 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.heroJewel。 */
export const WIRE_JEWEL_CMD = "wire.4101";

export const WIRE_JEWEL_READONLY_TITLE = "英雄宝石（真服只读）";
export const WIRE_JEWEL_EMPTY = "空表";
export const WIRE_JEWEL_UNSYNCED_TOAST = "真服未同步";
export const WIRE_JEWEL_READONLY_NOTE =
  "只读。不替换，不卸下，不一键穿，不一键卸，不合成，不一键合成。不发 4102、4103、4104、4105、4106、4107。不做 9001。不写金币，不写钻石。英雄列表仍是 4001";
export const WIRE_JEWEL_SIDE_EFFECT = "无写库。无 page。空体安全";
export const WIRE_JEWEL_FIELD_NOTE =
  "英雄写 hero_id。宝石写 jewel_id、place、jewel_type。没有的数不写成 0。对不上的号按字段号写";

export interface WireJewelMark {
  field: number;
  text: string;
}

export interface WireJewelPiece {
  /** PSJewelData.jewel_id。没有时是 null，不写成 0。 */
  jewelId: number | null;
  /** PSJewelData.place。没有时是 null，不写成 0。 */
  place: number | null;
  /** PSJewelData.jewel_type。没有时是 null，不写成 0。 */
  jewelType: number | null;
  /** 对不上 1、2、3 的号。 */
  marks: WireJewelMark[];
}

export interface WireJewelHero {
  /** PSHeroJewelData.hero_id。没有时是 null，不写成 0。 */
  heroId: number | null;
  jewels: WireJewelPiece[];
  /** 对不上 1、2 的号。 */
  marks: WireJewelMark[];
}

export interface WireJewelSnapshot {
  heroes: WireJewelHero[];
  /** 对不上字段 1 的外层号。 */
  marks: WireJewelMark[];
}

/**
 * 解 s2c 4101。空包体、以及没有 jewel_list 的合法包，都返回空表。
 * 超长、坏 varint、jewel_list 有包但一条都解不开时返回 null。
 */
export function decodeWireJewel(body: Uint8Array | null | undefined): WireJewelSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const heroes: WireJewelHero[] = [];
  const marks: WireJewelMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeHero(row.bytes);
      if (!parsed) continue;
      heroes.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && heroes.length === 0) return null;
  return { heroes, marks };
}

/** 英雄行。宝石条数是解开的 repeated，不是把缺的 jewel_id 写成 0。 */
export function formatWireJewelHero(row: WireJewelHero): string {
  const line = "hero_id=" + numText(row.heroId) + " / " + row.jewels.length + " 颗";
  return joinMarks(line, row.marks);
}

/** 宝石行。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireJewelLine(row: WireJewelPiece): string {
  const line =
    "jewel_id=" + numText(row.jewelId) + " / place=" + numText(row.place) + " / jewel_type=" + numText(row.jewelType);
  return joinMarks(line, row.marks);
}

/** 先写英雄，再写这名英雄的宝石。给页面和日志用。 */
export function formatWireJewelRows(snap: WireJewelSnapshot): string[] {
  const rows: string[] = [];
  for (let i = 0; i < snap.heroes.length; i++) {
    const hero = snap.heroes[i];
    rows.push(formatWireJewelHero(hero));
    for (let j = 0; j < hero.jewels.length; j++) rows.push(formatWireJewelLine(hero.jewels[j]));
  }
  return rows;
}

export function formatWireJewelHead(snap: WireJewelSnapshot): string {
  if (snap.heroes.length === 0) return joinMarks(WIRE_JEWEL_EMPTY, snap.marks);
  return joinMarks(snap.heroes.length + " 名", snap.marks);
}

export function wireJewelNote(snap: WireJewelSnapshot): string {
  const head = formatWireJewelHead(snap);
  const tail = WIRE_JEWEL_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.heroes.length === 0) return head + "。" + tail;
  const rows = formatWireJewelRows(snap);
  const parts: string[] = [];
  const n = Math.min(rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(rows[i]);
  if (rows.length > n) parts.push("其余 " + (rows.length - n) + " 行");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireJewelSnapshot {
  return { heroes: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireJewelMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireJewelMark[]): string {
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

function decodeHero(body: Uint8Array): WireJewelHero | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const jewels: WireJewelPiece[] = [];
  const marks: WireJewelMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodePiece(row.bytes);
      if (!parsed) continue;
      jewels.push(parsed);
      continue;
    }
    if (row.field === 1 && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && jewels.length === 0) return null;
  return {
    heroId: nonNegativeVarint(fields, 1),
    jewels,
    marks,
  };
}

function decodePiece(body: Uint8Array): WireJewelPiece | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireJewelMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2 || row.field === 3) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    jewelId: nonNegativeVarint(fields, 1),
    place: nonNegativeVarint(fields, 2),
    jewelType: nonNegativeVarint(fields, 3),
    marks,
  };
}

function markOf(row: RawField): WireJewelMark | null {
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
