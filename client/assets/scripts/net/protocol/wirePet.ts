/**
 * 真服宠物信息只读。c2s / s2c 都是 74100。
 * c2s 是 GReqPetInfoList，没有字段。整帧 04 00 00 00 74 21 01 00，即 0400000074210100。
 * 74100 = 0x12174，小端是 74 21 01 00。空体安全。
 * 不是英雄列表 4001。不是英雄图鉴 4013。
 *
 * 由 WireSession.pullIdle 在空 c2s 4013 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 74101 升级、74102 携带、74103 卸下。74105、74106 仅 s2c 推送，不主动发。
 * 不写金币，不写钻石。不接 USE_*。无写库。
 *
 * s2c 74100 是 GResPetInfoList。对得上的名字才用，对不上的号按字段号写。
 * - 1 repeated PSPetInfo list
 * PSPetInfo：pet_id=1，sys_id=2，hero_id=3，level=4。仓库里其它消息也是按声明顺序从 1 编号。
 * 没有的数不写成 0。
 *
 * 空包体、以及能解开但 list 为 0 条，都是已同步的空表。
 * 空 list 仍可以是非空外层，可接受。
 * list 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.petInfoList。 */
export const WIRE_PET_CMD = "wire.74100";

export const WIRE_PET_READONLY_TITLE = "宠物信息（真服只读）";
export const WIRE_PET_EMPTY = "空表";
export const WIRE_PET_UNSYNCED_TOAST = "真服未同步";
export const WIRE_PET_READONLY_NOTE =
  "只读。不发 74101 升级、74102 携带、74103 卸下。74105、74106 仅 s2c 推送，不主动发。不写金币，不写钻石。英雄列表仍是 4001。英雄图鉴仍是 4013";
export const WIRE_PET_SIDE_EFFECT = "无写库。空 list 仍非空外层，可接受。空体安全";
export const WIRE_PET_FIELD_NOTE = "行上 pet_id、sys_id、hero_id、level。没有的数不写成 0。对不上的号按字段号写";

export interface WirePetMark {
  field: number;
  text: string;
}

export interface WirePetRow {
  /** PSPetInfo.pet_id。没有时是 null，不写成 0。 */
  petId: number | null;
  /** PSPetInfo.sys_id。没有时是 null，不写成 0。 */
  sysId: number | null;
  /** PSPetInfo.hero_id。没有时是 null，不写成 0。 */
  heroId: number | null;
  /** PSPetInfo.level。没有时是 null，不写成 0。 */
  level: number | null;
  /** 对不上 1、2、3、4 的号。 */
  marks: WirePetMark[];
}

export interface WirePetSnapshot {
  rows: WirePetRow[];
  /** 对不上字段 1 的外层号。 */
  marks: WirePetMark[];
}

/**
 * 解 s2c 74100。空包体、以及没有 list 的合法包，都返回空表。
 * 超长、坏 varint、list 有包但一条都解不开时返回 null。
 */
export function decodeWirePet(body: Uint8Array | null | undefined): WirePetSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const rows: WirePetRow[] = [];
  const marks: WirePetMark[] = [];
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

/** 行上写 pet_id / sys_id / hero_id / level。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWirePetLine(row: WirePetRow): string {
  const line =
    "pet_id=" +
    numText(row.petId) +
    " / sys_id=" +
    numText(row.sysId) +
    " / hero_id=" +
    numText(row.heroId) +
    " / level=" +
    numText(row.level);
  return joinMarks(line, row.marks);
}

export function formatWirePetHead(snap: WirePetSnapshot): string {
  if (snap.rows.length === 0) return joinMarks(WIRE_PET_EMPTY, snap.marks);
  return joinMarks(snap.rows.length + " 条", snap.marks);
}

export function wirePetNote(snap: WirePetSnapshot): string {
  const head = formatWirePetHead(snap);
  const tail = WIRE_PET_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.rows.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWirePetLine(snap.rows[i]));
  if (snap.rows.length > n) parts.push("其余 " + (snap.rows.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WirePetSnapshot {
  return { rows: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WirePetMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WirePetMark[]): string {
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

function decodeRow(body: Uint8Array): WirePetRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WirePetMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2 || row.field === 3 || row.field === 4) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    petId: nonNegativeVarint(fields, 1),
    sysId: nonNegativeVarint(fields, 2),
    heroId: nonNegativeVarint(fields, 3),
    level: nonNegativeVarint(fields, 4),
    marks,
  };
}

function markOf(row: RawField): WirePetMark | null {
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
