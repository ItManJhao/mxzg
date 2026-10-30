/**
 * 真服头像列表只读。c2s / s2c 都是 34001。
 * c2s 是 GReqHeadPortraitList，没有字段，没有 page。整帧 04 00 00 00 d1 84 00 00，即 04000000d1840000。
 * 34001 = 0x84D1，小端是 d1 84 00 00。空体一次。
 * 不是称号列表 55001。不是圣物图鉴 59010。不是角色资料 2001。
 * 勿与 55001 合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 55001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不发 34002。34003 仅为解锁推送，无 c2s，勿当拉包、勿当写号。32001 另只读接在其后。不做 20011。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 34002 更换头像。34003 是解锁推送 s2c，无 c2s，勿发、勿当拉包。32001 另只读接在其后。不做 20011。
 * 服侧轻懒建：RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头。无扣费，无领奖，不改当前头像。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 34001 是 GResHeadPortraitList。repeated int32 idx_list，已解锁头像 id。
 * 仓库里其它消息也是按声明顺序从 1 编号。idx_list 是字段 1。
 * 可以是未打包的 repeated varint，也可以是 proto3 打包的 length-delimited。
 * 没有的数不写成 0。出现的 0 仍写 0。对不上的号按字段号写。
 *
 * 空包体是已同步，idx_list 为空，页上写「空头像」。
 * 字段 1 的打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.headPortraitList。 */
export const WIRE_HEAD_PORTRAIT_CMD = "wire.34001";

export const WIRE_HEAD_PORTRAIT_READONLY_TITLE = "头像列表（真服只读）";
export const WIRE_HEAD_PORTRAIT_EMPTY = "空头像";
export const WIRE_HEAD_PORTRAIT_UNSYNCED_TOAST = "真服未同步";
export const WIRE_HEAD_PORTRAIT_READONLY_NOTE =
  "只读展示已解锁头像 idx_list。无更换入口。不发 34002 更换头像。34003 仅为解锁推送 s2c，无 c2s，勿当拉包、勿当写号。32001 另只读接在其后，勿合并。不做 20011。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_HEAD_PORTRAIT_SIDE_EFFECT =
  "轻懒建。RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头。无扣费，无领奖，不改当前头像。空 c2s 一次，无 page，挂在 55001 之后。不发 34002。34003 是解锁推送，勿发、勿当拉包。32001 另只读接在其后，勿合并。不做 20011";
export const WIRE_HEAD_PORTRAIT_FIELD_NOTE = "idx_list。已解锁头像 id。没有的数不写成 0。对不上的号按字段号写";

export interface WireHeadPortraitMark {
  field: number;
  text: string;
}

export interface WireHeadPortraitSnapshot {
  /** GResHeadPortraitList.idx_list。没有这个字段时是空数组，不写成 0。 */
  idxList: number[];
  /** 对不上字段 1 的外层号。 */
  marks: WireHeadPortraitMark[];
}

/**
 * 解 s2c 34001。空包体返回已同步的空头像。
 * 超长、坏 varint、字段 1 打包解不开时返回 null。
 */
export function decodeWireHeadPortrait(body: Uint8Array | null | undefined): WireHeadPortraitSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const idxList: number[] = [];
  const marks: WireHeadPortraitMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && typeof row.varint === "number") {
      if (isFinite(row.varint) && row.varint >= 0) idxList.push(Math.floor(row.varint));
      continue;
    }
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) idxList.push(packed[j]);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { idxList, marks };
}

/** 页上写 idx_list。没有时写「空头像」。出现的 0 仍写 0。 */
export function formatWireHeadPortraitHead(snap: WireHeadPortraitSnapshot): string {
  const list = snap.idxList.length === 0 ? WIRE_HEAD_PORTRAIT_EMPTY : numList(snap.idxList);
  return joinMarks("idx_list=" + list, snap.marks);
}

/** 一行一个已解锁头像 id。出现的 0 仍写 0。 */
export function formatWireHeadPortraitLine(idx: number): string {
  return "idx=" + String(idx);
}

export function wireHeadPortraitNote(snap: WireHeadPortraitSnapshot): string {
  const head = formatWireHeadPortraitHead(snap);
  const tail = WIRE_HEAD_PORTRAIT_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.idxList.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.idxList.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireHeadPortraitLine(snap.idxList[i]));
  if (snap.idxList.length > n) parts.push("其余 " + (snap.idxList.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireHeadPortraitSnapshot {
  return { idxList: [], marks: [] };
}

function numList(values: number[]): string {
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function joinMarks(line: string, marks: WireHeadPortraitMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireHeadPortraitMark[]): string {
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

function markOf(row: RawField): WireHeadPortraitMark | null {
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

function readPackedVarints(body: Uint8Array): number[] | null {
  const values: number[] = [];
  let i = 0;
  while (i < body.length) {
    const val = readVarint(body, i);
    if (!val) return null;
    if (!isFinite(val.value) || val.value < 0) return null;
    values.push(Math.floor(val.value));
    i = val.next;
  }
  return values;
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
