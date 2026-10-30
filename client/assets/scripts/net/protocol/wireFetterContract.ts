/**
 * 真服契约只读。c2s / s2c 都是 28107。
 * c2s 是 GReqFetterContractInfo，空体，没有 page。整帧 04 00 00 00 CB 6D 00 00，即 04000000cb6d0000。
 * 28107 = 0x6DCB，小端是 CB 6D 00 00。空体一次。
 * 不是神兵道具 75615。不是职级信息 75606。不是羁绊数据 28100。
 * 75615、75606 已合。本刀不重复拉 75615，也不重复拉 75606。与已合刀分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 75615 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 28101 升级、28102 升技、28104 突破、28105 重置、28106 铸魂、28108 解锁契约、28109 洗炼。
 * 不发 28002、28003、28004。不发 28201、28202、28203、28204、28205。
 * 3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧允许 getFetterTask 轻懒建。只读，无解锁、无扣费、无领奖。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 28107 是 GResFetterContractInfo。contracts 是字段 1，repeated int32，已激活契约。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * contracts 可以是未打包的 repeated varint，也可以是 proto3 打包的 length-delimited。
 * 服不保证顺序。客户端按出现顺序写，不排序。
 * 没有这个字段时保持缺省，不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。contracts 为空，页上写「空契约」。
 * 字段 1 的打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.fetterContract。 */
export const WIRE_FETTER_CONTRACT_CMD = "wire.28107";

export const WIRE_FETTER_CONTRACT_READONLY_TITLE = "查看契约（真服只读）";
export const WIRE_FETTER_CONTRACT_EMPTY = "空契约";
export const WIRE_FETTER_CONTRACT_UNSYNCED_TOAST = "真服未同步";
export const WIRE_FETTER_CONTRACT_READONLY_NOTE =
  "只读展示已激活契约 contracts。不保证顺序，按出现顺序写。无解锁契约、升级、升技、突破、重置、铸魂、洗炼入口。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003、28004。不发 28201、28202、28203、28204、28205。3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75615 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_FETTER_CONTRACT_SIDE_EFFECT =
  "轻懒建（getFetterTask）。只读，无解锁、无扣费、无领奖。空 c2s 一次，无 page，挂在 75615 之后。只发 cmd=28107，空帧 04000000cb6d0000。不发 28101 升级、28102 升技、28104 突破、28105 重置、28106 铸魂、28108 解锁契约、28109 洗炼。不发 28002、28003、28004。不发 28201、28202、28203、28204、28205。3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75615、75606 分开发，勿合并。本刀不重复拉 75615，也不重复拉 75606";
export const WIRE_FETTER_CONTRACT_FIELD_NOTE =
  "contracts。已激活契约 id。不保证顺序。没有的数不写成 0。出现的值如实展示。对不上的号按字段号写";

export interface WireFetterContractMark {
  field: number;
  text: string;
}

export interface WireFetterContractSnapshot {
  /** GResFetterContractInfo.contracts。没有这个字段时是空数组，不写成 0。 */
  contracts: number[];
  /** 对不上字段 1 的外层号。 */
  marks: WireFetterContractMark[];
}

/**
 * 解 s2c 28107。空包体返回已同步的空契约。
 * 超长、坏 varint、字段 1 打包解不开时返回 null。
 */
export function decodeWireFetterContract(body: Uint8Array | null | undefined): WireFetterContractSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const contracts: number[] = [];
  const marks: WireFetterContractMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      } else {
        contracts.push(value);
      }
      continue;
    }
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) contracts.push(packed[j]);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { contracts, marks };
}

/** 页上写 contracts。没有时写「空契约」。出现的 0 仍写 0。不排序。 */
export function formatWireFetterContractHead(snap: WireFetterContractSnapshot): string {
  const list = snap.contracts.length === 0 ? WIRE_FETTER_CONTRACT_EMPTY : numList(snap.contracts);
  return joinMarks("contracts=" + list, snap.marks);
}

/** 一行一个已激活契约 id。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireFetterContractLine(id: number): string {
  return "id=" + String(id);
}

export function wireFetterContractNote(snap: WireFetterContractSnapshot): string {
  const head = formatWireFetterContractHead(snap);
  const tail = WIRE_FETTER_CONTRACT_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.contracts.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.contracts.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireFetterContractLine(snap.contracts[i]));
  if (snap.contracts.length > n) parts.push("其余 " + (snap.contracts.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireFetterContractSnapshot {
  return { contracts: [], marks: [] };
}

function numList(values: number[]): string {
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function joinMarks(line: string, marks: WireFetterContractMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireFetterContractMark[]): string {
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

function markOf(row: RawField): WireFetterContractMark | null {
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
