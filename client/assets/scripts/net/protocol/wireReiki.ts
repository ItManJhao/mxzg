/**
 * 真服灵器数据只读。c2s / s2c 都是 70001。
 * c2s 是 GReqReikiEquipData，没有字段。整帧 04 00 00 00 71 11 01 00，即 0400000071110100。
 * 70001 = 0x11171，小端是 71 11 01 00。空体一次。
 * 不是角色资料 2001。不是基金列表 20001。不是超值首充 20012。不是世界等级 51001。
 *
 * 由 WireSession.pullIdle 在空 c2s 20012 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不做 20011。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 70002 激活、70003 穿、70004 卸、70005 转换、70006 合成。
 * 70007、70008 是推送，不当拉包请求，不订阅，不编成 c2s。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 70001 是 GResReikiEquipData。对得上的名字才用，对不上的号按字段号写。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * - 1 repeated PSReikiEquipData list
 * PSReikiEquipData：hero_id=1，sys_id=2，reiki_equip_id=3。
 * 没有的数不写成 0。出现的 0 仍写 0。
 *
 * 空包体是已同步，list 为空。
 * list 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.reikiEquipData。 */
export const WIRE_REIKI_CMD = "wire.70001";

export const WIRE_REIKI_READONLY_TITLE = "灵器数据（真服只读）";
export const WIRE_REIKI_EMPTY = "空列表";
export const WIRE_REIKI_UNSYNCED_TOAST = "真服未同步";
export const WIRE_REIKI_READONLY_NOTE =
  "只读展示，无激活、穿戴、卸下、转换、合成入口。不发 70002、70003、70004、70005、70006。70007、70008 是推送，不当拉包请求。不做 20011。不写金币，不写钻石。不回落 Mock";
export const WIRE_REIKI_SIDE_EFFECT =
  "只读。空 c2s 一次，挂在 20012 之后。不发 70002、70003、70004、70005、70006。70007、70008 仅推送。不做 20011";
export const WIRE_REIKI_FIELD_NOTE =
  "list 的 hero_id、sys_id、reiki_equip_id。没有的数不写成 0。对不上的号按字段号写";

export interface WireReikiMark {
  field: number;
  text: string;
}

export interface WireReikiRow {
  /** PSReikiEquipData.hero_id。没有时是 null，不写成 0。 */
  heroId: number | null;
  /** PSReikiEquipData.sys_id。没有时是 null，不写成 0。 */
  sysId: number | null;
  /** PSReikiEquipData.reiki_equip_id。没有时是 null，不写成 0。 */
  reikiEquipId: number | null;
  /** 对不上 hero_id、sys_id、reiki_equip_id 的号。 */
  marks: WireReikiMark[];
}

export interface WireReikiSnapshot {
  /** GResReikiEquipData.list。没有这个字段时是空数组，不写成 0。 */
  rows: WireReikiRow[];
  /** 对不上字段 1 的外层号。 */
  marks: WireReikiMark[];
}

/**
 * 解 s2c 70001。空包体返回已同步的空列表。
 * 超长、坏 varint、list 有包但一条都解不开时返回 null。
 */
export function decodeWireReiki(body: Uint8Array | null | undefined): WireReikiSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const rows: WireReikiRow[] = [];
  const marks: WireReikiMark[] = [];
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

/** 页上写 list 条数。0 条写「空列表」。 */
export function formatWireReikiHead(snap: WireReikiSnapshot): string {
  const list = snap.rows.length === 0 ? WIRE_REIKI_EMPTY : snap.rows.length + " 条";
  return joinMarks(list, snap.marks);
}

/** 行上写 hero_id / sys_id / reiki_equip_id。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireReikiLine(row: WireReikiRow): string {
  return joinMarks(
    "hero_id=" + numText(row.heroId) + " / sys_id=" + numText(row.sysId) + " / reiki_equip_id=" + numText(row.reikiEquipId),
    row.marks
  );
}

export function wireReikiNote(snap: WireReikiSnapshot): string {
  const head = formatWireReikiHead(snap);
  const tail = WIRE_REIKI_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.rows.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireReikiLine(snap.rows[i]));
  if (snap.rows.length > n) parts.push("其余 " + (snap.rows.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireReikiSnapshot {
  return { rows: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireReikiMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireReikiMark[]): string {
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

function decodeRow(body: Uint8Array): WireReikiRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireReikiMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2 || row.field === 3) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    heroId: nonNegativeVarint(fields, 1),
    sysId: nonNegativeVarint(fields, 2),
    reikiEquipId: nonNegativeVarint(fields, 3),
    marks,
  };
}

function markOf(row: RawField): WireReikiMark | null {
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
