/**
 * 真服羁绊皮肤只读。c2s / s2c 都是 28200。
 * c2s 是 GReqFashionData，空体，没有 page。整帧 04 00 00 00 28 6E 00 00，即 04000000286e0000。
 * 28200 = 0x6E28，小端是 28 6E 00 00。空体一次。
 * 不是羁绊数据 28100。不是激活皮肤列表 4402。不是宠物图鉴 74104。
 * 28100、74104 已合。本刀不重复拉 28100，也不重复拉 74104。与已合刀分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 28100 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 28201 熔炼、28202 激活、28204 领任务奖、28205 使用皮肤。
 * 28203 任务列表虽只读，本刀勿夹发。
 * 不发 28101、28102、28103、28104、28105、28106、28107、28108、28109。不发 28002、28003。
 * 75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧允许轻懒建 goddess_fashion。无扣费，无发奖，不改皮肤。只读展示。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 28200 是 GResFashionData。active_type 是字段 1，repeated int32。use_type 是字段 2。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * active_type 可以是未打包的 repeated varint，也可以是 proto3 打包的 length-delimited。
 * 没有这个字段时保持缺省，不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。active_type 为空，use_type 保持缺省，页上写「空羁绊皮肤」。
 * 字段 1 的打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.fetterFashion。 */
export const WIRE_FETTER_FASHION_CMD = "wire.28200";

export const WIRE_FETTER_FASHION_READONLY_TITLE = "羁绊皮肤（真服只读）";
export const WIRE_FETTER_FASHION_EMPTY = "空羁绊皮肤";
export const WIRE_FETTER_FASHION_UNSYNCED_TOAST = "真服未同步";
export const WIRE_FETTER_FASHION_READONLY_NOTE =
  "只读展示 active_type 与 use_type。无熔炼、激活、领奖、使用皮肤入口。不发 28201、28202、28203、28204、28205。28203 任务列表虽只读，本刀勿夹发。不发 28101、28102、28103、28104、28105、28106、28107、28108、28109、28002、28003。75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28100 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_FETTER_FASHION_SIDE_EFFECT =
  "轻懒建 goddess_fashion。无扣费，无发奖，不改皮肤。只读展示。空 c2s 一次，无 page，挂在 28100 之后。不发 28201 熔炼、28202 激活、28203 任务列表、28204 领任务奖、28205 使用皮肤。28203 虽只读，本刀勿夹发。不发 28101、28102、28103、28104、28105、28106、28107、28108、28109、28002、28003。75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28100、74104 分开发，勿合并。本刀不重复拉 28100，也不重复拉 74104";
export const WIRE_FETTER_FASHION_FIELD_NOTE =
  "active_type。use_type。没有的数不写成 0。出现的值如实展示。对不上的号按字段号写";

export interface WireFetterFashionMark {
  field: number;
  text: string;
}

export interface WireFetterFashionSnapshot {
  /** GResFashionData.active_type。没有这个字段时是空数组，不写成 0。 */
  activeTypes: number[];
  /** GResFashionData.use_type。没有时是 null，不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
  useType: number | null;
  /** 对不上字段 1、2 的外层号。 */
  marks: WireFetterFashionMark[];
}

/**
 * 解 s2c 28200。空包体返回已同步的空羁绊皮肤，use_type 保持缺省。
 * 超长、坏 varint、字段 1 打包解不开时返回 null。
 */
export function decodeWireFetterFashion(body: Uint8Array | null | undefined): WireFetterFashionSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const activeTypes: number[] = [];
  const marks: WireFetterFashionMark[] = [];
  let useType: number | null = null;
  let sawUse = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      } else {
        activeTypes.push(value);
      }
      continue;
    }
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) activeTypes.push(packed[j]);
      continue;
    }
    if (row.field === 2 && row.kind === "varint") {
      if (!sawUse) {
        sawUse = true;
        useType = accepted(row.varint);
        if (useType === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { activeTypes, useType, marks };
}

/** 页上写 active_type 和 use_type。没有时写「空羁绊皮肤」和「无」。出现的 0 仍写 0。 */
export function formatWireFetterFashionHead(snap: WireFetterFashionSnapshot): string {
  const list = snap.activeTypes.length === 0 ? WIRE_FETTER_FASHION_EMPTY : numList(snap.activeTypes);
  return joinMarks("active_type=" + list + " / use_type=" + numText(snap.useType), snap.marks);
}

/** 一行一个已出现的 active_type。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireFetterFashionLine(activeType: number): string {
  return "type=" + String(activeType);
}

export function wireFetterFashionNote(snap: WireFetterFashionSnapshot): string {
  const head = formatWireFetterFashionHead(snap);
  const tail = WIRE_FETTER_FASHION_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.activeTypes.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.activeTypes.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireFetterFashionLine(snap.activeTypes[i]));
  if (snap.activeTypes.length > n) parts.push("其余 " + (snap.activeTypes.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireFetterFashionSnapshot {
  return { activeTypes: [], useType: null, marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function numList(values: number[]): string {
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function joinMarks(line: string, marks: WireFetterFashionMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireFetterFashionMark[]): string {
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

function markOf(row: RawField): WireFetterFashionMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
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
