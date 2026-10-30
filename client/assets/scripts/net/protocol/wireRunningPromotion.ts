/**
 * 真服进行中活动只读。c2s / s2c 都是 20101。
 * c2s 是 GReqRunningPromotion，空体，没有 page。整帧 04 00 00 00 85 4E 00 00，即 04000000854e0000。
 * 20101 = 0x4E85，小端是 85 4E 00 00。空体一次。
 * 服侧 PromotionNewHandler.getAllRunningPromotion；PromotionNewGMsg.GReq/GResRunningPromotion。
 * 副作用是 promotionControlService.getAllWillRun() 组列表。纯读。无扣费，无领奖，不写养成。
 * 不是副本队列 3101。不是阵法 3099。不是世界等级 51001。不是背包 5001。不是基金列表 20001。
 * 3101 已合。本刀不重复拉 3101，也不重复拉 3099。与 3101 分开发，勿合并成一个请求。
 * 同文件 20102 非空体，勿挂、勿编码。
 *
 * 由 WireSession.pullIdle 在空 c2s 3101 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发各活动领奖写号（分散在各 Promotion*Handler）。仓内已对过的同族领奖/写号是 20018、20013、20004、20010，本刀不编码。
 * 不做 20011。51001 已在链上，勿重复。5001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 20101 是 GResRunningPromotion。promotions 是字段 1，repeated PbPromotionData。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * PbPromotionData：1 id，2 start_time，3 end_time，4 clear_time，5 turns。
 * 没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。出现的值如实展示。
 * 对不上的号按字段号写。
 *
 * 空包体是已同步。promotions 为空，页上写「空进行中活动」。
 * promotions 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.runningPromotion。 */
export const WIRE_RUNNING_PROMOTION_CMD = "wire.20101";

export const WIRE_RUNNING_PROMOTION_FRAME = "04000000854e0000";
export const WIRE_RUNNING_PROMOTION_READONLY_TITLE = "进行中活动（真服只读）";
export const WIRE_RUNNING_PROMOTION_EMPTY = "空进行中活动";
export const WIRE_RUNNING_PROMOTION_ROW_EMPTY = "（缺省）";
export const WIRE_RUNNING_PROMOTION_UNSYNCED_TOAST = "真服未同步";
export const WIRE_RUNNING_PROMOTION_READONLY_NOTE =
  "只读展示进行中活动 promotions。缺字段保持缺省。出现的值如实展示。无领奖入口。不发各活动领奖写号（20018、20013、20004、20010，分散在各 Promotion*Handler）。同文件 20102 非空体勿挂。不做 20011。51001 已有，勿重复。5001 已有，勿重复。3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3101 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_RUNNING_PROMOTION_SIDE_EFFECT =
  "promotionControlService.getAllWillRun() 组列表。纯读。无扣费，无领奖，不写养成。空 c2s 一次，无 page，挂在 3101 之后。只发 cmd=20101，空帧 04000000854e0000。不发各活动领奖写号（20018、20013、20004、20010）。同文件 20102 非空体勿挂。不做 20011。51001 已有，勿重复。5001 已有，勿重复。3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3101 分开发，勿合并。本刀不重复拉 3101，也不重复拉 3099";
export const WIRE_RUNNING_PROMOTION_FIELD_NOTE =
  "promotions 为 repeated PbPromotionData。id、start_time、end_time、clear_time、turns。没有的数不写成 0。出现的 0 仍写 0。出现的值如实展示。对不上的号按字段号写";

/** 活动领奖写号。分散在各 Promotion*Handler。本模块不编码、不发出。 */
export const WIRE_RUNNING_PROMOTION_CLAIM_CMDS = ["wire.20018", "wire.20013", "wire.20004", "wire.20010"] as const;

/** 本刀硬禁：同文件非空体、已禁号、有 page 的号，以及活动领奖写号。5001 / 51001 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。 */
export const WIRE_RUNNING_PROMOTION_BANNED_CMDS = [
  "wire.20102",
  "wire.20011",
  "wire.4601",
  "wire.29001",
  "wire.20018",
  "wire.20013",
  "wire.20004",
  "wire.20010",
] as const;

export interface WireRunningPromotionMark {
  field: number;
  text: string;
}

export interface WireRunningPromotionRow {
  /** PbPromotionData.id。没有时是 null，不写成 0。 */
  id: number | null;
  /** PbPromotionData.start_time。没有时是 null，不写成 0。 */
  startTime: number | null;
  /** PbPromotionData.end_time。没有时是 null，不写成 0。 */
  endTime: number | null;
  /** PbPromotionData.clear_time。没有时是 null，不写成 0。 */
  clearTime: number | null;
  /** PbPromotionData.turns。没有时是 null，不写成 0。 */
  turns: number | null;
  /** 对不上 1–5 的号。 */
  marks: WireRunningPromotionMark[];
}

export interface WireRunningPromotionSnapshot {
  /** GResRunningPromotion.promotions。没有这个字段时是空数组。 */
  rows: WireRunningPromotionRow[];
  /** 对不上字段 1 的外层号。字段 1 不是 message 时也记在这里。 */
  marks: WireRunningPromotionMark[];
}

/**
 * 解 s2c 20101。空包体返回已同步的空列表。
 * 超长、坏 varint、promotions 有包但一条都解不开时返回 null。
 */
export function decodeWireRunningPromotion(body: Uint8Array | null | undefined): WireRunningPromotionSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const rows: WireRunningPromotionRow[] = [];
  const marks: WireRunningPromotionMark[] = [];
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
    const mark = markOf(row, 0);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && rows.length === 0) return null;
  return { rows, marks };
}

/** 页上写条数。没有 promotions 时写「空进行中活动」。 */
export function formatWireRunningPromotionHead(snap: WireRunningPromotionSnapshot): string {
  const list = snap.rows.length === 0 ? WIRE_RUNNING_PROMOTION_EMPTY : snap.rows.length + " 条";
  return joinMarks(list, snap.marks);
}

/** 一行一个 PbPromotionData。缺的字段不写。全缺时写「（缺省）」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireRunningPromotionLine(row: WireRunningPromotionRow): string {
  const parts: string[] = [];
  if (row.id !== null) parts.push("id=" + String(row.id));
  if (row.startTime !== null) parts.push("start_time=" + String(row.startTime));
  if (row.endTime !== null) parts.push("end_time=" + String(row.endTime));
  if (row.clearTime !== null) parts.push("clear_time=" + String(row.clearTime));
  if (row.turns !== null) parts.push("turns=" + String(row.turns));
  const named = parts.length === 0 ? WIRE_RUNNING_PROMOTION_ROW_EMPTY : parts.join(" / ");
  return joinMarks(named, row.marks);
}

export function wireRunningPromotionNote(snap: WireRunningPromotionSnapshot): string {
  const head = formatWireRunningPromotionHead(snap);
  const tail = WIRE_RUNNING_PROMOTION_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.rows.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireRunningPromotionLine(snap.rows[i]));
  if (snap.rows.length > n) parts.push("其余 " + (snap.rows.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireRunningPromotionSnapshot {
  return { rows: [], marks: [] };
}

function emptyRow(): WireRunningPromotionRow {
  return { id: null, startTime: null, endTime: null, clearTime: null, turns: null, marks: [] };
}

function joinMarks(line: string, marks: WireRunningPromotionMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireRunningPromotionMark[]): string {
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

function decodeRow(body: Uint8Array): WireRunningPromotionRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const row = emptyRow();
  const taken: boolean[] = [false, false, false, false, false, false];
  for (let i = 0; i < fields.length; i++) {
    const item = fields[i];
    if (item.kind === "varint" && item.field >= 1 && item.field <= 5 && !taken[item.field]) {
      const value = accepted(item.varint);
      if (value !== null) {
        taken[item.field] = true;
        if (item.field === 1) row.id = value;
        else if (item.field === 2) row.startTime = value;
        else if (item.field === 3) row.endTime = value;
        else if (item.field === 4) row.clearTime = value;
        else row.turns = value;
        continue;
      }
    }
    const mark = markOf(item, 0);
    if (mark) row.marks.push(mark);
  }
  return row;
}

function markOf(row: RawField, depth: number): WireRunningPromotionMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    return { field: row.field, text: formatBlob(row.bytes, depth) };
  }
  return { field: row.field, text: "未解" };
}

function formatBlob(bytes: Uint8Array, depth: number): string {
  if (bytes.length === 0) return "空";
  const text = utf8Printable(bytes);
  if (text !== null) return text;
  if (depth < 2) {
    const nested = readRawFields(bytes);
    if (nested && nested.length > 0) {
      const parts: string[] = [];
      for (let i = 0; i < nested.length; i++) {
        const mark = markOf(nested[i], depth + 1);
        if (mark) parts.push("字段" + mark.field + "=" + mark.text);
      }
      if (parts.length > 0) return parts.join(",");
    }
  }
  const packed = readPackedVarints(bytes);
  if (packed && packed.length > 0) {
    const n = Math.min(packed.length, 8);
    const head: string[] = [];
    for (let i = 0; i < n; i++) head.push(String(packed[i]));
    if (packed.length > n) return head.join(",") + "…+" + (packed.length - n);
    return head.join(",");
  }
  return "未解";
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

function accepted(value: number | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  if (value === -1) return -1;
  if (value < 0) return null;
  return Math.floor(value);
}

function readPackedVarints(body: Uint8Array): number[] | null {
  const values: number[] = [];
  let i = 0;
  while (i < body.length) {
    const val = readVarint(body, i);
    if (!val) return null;
    const value = accepted(val.value);
    if (value === null) return null;
    values.push(value);
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
  while (i < body.length && shift <= 63) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (isProtoInt64Neg1(body, offset, i)) return { value: -1, next: i };
      if (!Number.isSafeInteger(value) || value < 0) return null;
      return { value, next: i };
    }
    shift += 7;
  }
  return null;
}

/** protobuf int64 的 -1：九个 0xFF 再加 0x01。 */
function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}
