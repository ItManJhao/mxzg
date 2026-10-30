/**
 * 真服头像框数据只读。c2s / s2c 都是 32001。
 * c2s 是 GReqBorderData，没有字段，没有 page。整帧 04 00 00 00 01 7d 00 00，即 04000000017d0000。
 * 32001 = 0x7D01，小端是 01 7d 00 00。空体一次。
 * 不是头像列表 34001。不是称号列表 55001。不是角色资料 2001。
 * 勿与 34001 合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 34001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不发 32002 道具激活。不发 32003 使用/切换边框。
 * 32003 是服侧推送：当前框过期时服侧可能写 role.borderId 回落并另推 32003。客户端不发，勿当拉包。
 * 4402 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧轻懒建免费框可接受。不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 32001 是 GResBorderData。repeated PSBorderUnit units。
 * 仓库里其它消息也是按声明顺序从 1 编号。units 是字段 1。
 * PSBorderUnit 的 id 是字段 1，active_state 是字段 2。
 * 没有这个字段时保持缺省，不写成 0。出现的 0 仍写 0。对不上的号按字段号写。
 *
 * 空包体是已同步，units 为空，页上写「空头像框」。
 * units 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.borderData。 */
export const WIRE_BORDER_CMD = "wire.32001";

export const WIRE_BORDER_READONLY_TITLE = "头像框数据（真服只读）";
export const WIRE_BORDER_EMPTY = "空头像框";
export const WIRE_BORDER_UNSYNCED_TOAST = "真服未同步";
export const WIRE_BORDER_READONLY_NOTE =
  "只读展示 id、active_state。无激活、切换入口。不发 32002 道具激活。不发 32003 使用/切换边框。32003 过期回落时服侧另推，客户端不发、勿当拉包。4402 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_BORDER_SIDE_EFFECT =
  "轻懒建免费框可接受。当前框过期时服侧可能写 role.borderId 回落并另推 32003。只读展示，客户端不发 32003。空 c2s 一次，无 page，挂在 34001 之后。不发 32002 道具激活。不发 32003 使用/切换边框。32003 是服侧推送，勿当拉包。4402 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁";
export const WIRE_BORDER_FIELD_NOTE = "units 的 id、active_state。没有的数不写成 0。对不上的号按字段号写";

export interface WireBorderMark {
  field: number;
  text: string;
}

export interface WireBorderUnit {
  /** PSBorderUnit.id。没有时是 null，不写成 0。 */
  id: number | null;
  /** PSBorderUnit.active_state。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  activeState: number | null;
  /** 对不上 id、active_state 的号。 */
  marks: WireBorderMark[];
}

export interface WireBorderSnapshot {
  /** GResBorderData.units。没有这个字段时是空数组，不写成 0。 */
  units: WireBorderUnit[];
  /** 对不上字段 1 的外层号。 */
  marks: WireBorderMark[];
}

/**
 * 解 s2c 32001。空包体返回已同步的空头像框。
 * 超长、坏 varint、units 有包但一条都解不开时返回 null。
 */
export function decodeWireBorder(body: Uint8Array | null | undefined): WireBorderSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const units: WireBorderUnit[] = [];
  const marks: WireBorderMark[] = [];
  let unitBlobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      unitBlobs += 1;
      const parsed = decodeUnit(row.bytes);
      if (!parsed) continue;
      units.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (unitBlobs > 0 && units.length === 0) return null;
  return { units, marks };
}

/** 页上写头像框条数。没有时写「空头像框」。 */
export function formatWireBorderHead(snap: WireBorderSnapshot): string {
  const list = snap.units.length === 0 ? WIRE_BORDER_EMPTY : snap.units.length + " 条";
  return joinMarks("units=" + list, snap.marks);
}

/** 行上写 id / active_state。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireBorderLine(row: WireBorderUnit): string {
  return joinMarks("id=" + numText(row.id) + " / active_state=" + numText(row.activeState), row.marks);
}

export function wireBorderNote(snap: WireBorderSnapshot): string {
  const head = formatWireBorderHead(snap);
  const tail = WIRE_BORDER_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.units.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.units.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireBorderLine(snap.units[i]));
  if (snap.units.length > n) parts.push("其余 " + (snap.units.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireBorderSnapshot {
  return { units: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireBorderMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireBorderMark[]): string {
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

function decodeUnit(body: Uint8Array): WireBorderUnit | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireBorderMark[] = [];
  let id: number | null = null;
  let activeState: number | null = null;
  let sawId = false;
  let sawState = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawId) {
        sawId = true;
        id = nonNegative(row.varint);
        if (id === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint") {
      if (!sawState) {
        sawState = true;
        activeState = nonNegative(row.varint);
        if (activeState === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { id, activeState, marks };
}

function markOf(row: RawField): WireBorderMark | null {
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

function nonNegative(value: number | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value) || value < 0) return null;
  return Math.floor(value);
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

/** protobuf int64 的 -1：九个 0xFF 再加 0x01。没有约定时不当成 0，调用方按缺省或字段号记下。 */
function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}
