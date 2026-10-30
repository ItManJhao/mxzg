/**
 * 真服羁绊数据只读。c2s / s2c 都是 28100。
 * c2s 是 GReqFetterList，空体，没有 page。整帧 04 00 00 00 C4 6D 00 00，即 04000000c46d0000。
 * 28100 = 0x6DC4，小端是 C4 6D 00 00。空体一次。
 * 不是宠物图鉴 74104。不是英雄祈愿数据 4201。
 * 74104、4201 已合。本刀不重复拉 74104，也不重复拉 4201。与已合刀分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 74104 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 28101 升级、28102 升技、28104 突破、28105 重置、28106 铸魂、28108 解锁契约、28109 洗炼。
 * 不发 28002 领任务奖、28003 精炼。
 * 28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧允许轻懒建（load/getFetterTask）。无扣费，无领奖。只读展示。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 28100 是 GResFetterList。reset_count 是字段 1。goddess 是字段 2，repeated PSFetterData。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * PSFetterData：type、exp、level、skill_level、refine_level、uplimit_level、soul_level、wash_level 按声明顺序是 1 到 8。
 * 没有这个字段时保持缺省，不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。reset_count 保持缺省，goddess 为空，页上写「空羁绊」。
 * goddess 有包但一条都解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.fetterList。 */
export const WIRE_FETTER_CMD = "wire.28100";

export const WIRE_FETTER_READONLY_TITLE = "羁绊数据（真服只读）";
export const WIRE_FETTER_EMPTY = "空羁绊";
export const WIRE_FETTER_UNSYNCED_TOAST = "真服未同步";
export const WIRE_FETTER_READONLY_NOTE =
  "只读展示 reset_count 与 goddess。无升级、升技、突破、重置、铸魂、契约、洗炼、领奖、精炼入口。不发 28101、28102、28104、28105、28106、28108、28109、28002、28003。28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74104 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_FETTER_SIDE_EFFECT =
  "轻懒建（load/getFetterTask）。无扣费，无领奖。只读展示。空 c2s 一次，无 page，挂在 74104 之后。不发 28101 升级、28102 升技、28104 突破、28105 重置、28106 铸魂、28108 解锁契约、28109 洗炼。不发 28002 领任务奖、28003 精炼。28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74104、4201 分开发，勿合并。本刀不重复拉 74104，也不重复拉 4201";
export const WIRE_FETTER_FIELD_NOTE =
  "reset_count。goddess 行上 type、exp、level、skill_level、refine_level、uplimit_level、soul_level、wash_level。没有的数不写成 0。出现的值如实展示。对不上的号按字段号写";

export interface WireFetterMark {
  field: number;
  text: string;
}

export interface WireFetterGoddess {
  /** PSFetterData.type。没有时是 null，不写成 0。 */
  type: number | null;
  /** PSFetterData.exp。没有时是 null，不写成 0。 */
  exp: number | null;
  /** PSFetterData.level。没有时是 null，不写成 0。 */
  level: number | null;
  /** PSFetterData.skill_level。没有时是 null，不写成 0。 */
  skillLevel: number | null;
  /** PSFetterData.refine_level。没有时是 null，不写成 0。 */
  refineLevel: number | null;
  /** PSFetterData.uplimit_level。没有时是 null，不写成 0。 */
  uplimitLevel: number | null;
  /** PSFetterData.soul_level。没有时是 null，不写成 0。 */
  soulLevel: number | null;
  /** PSFetterData.wash_level。没有时是 null，不写成 0。 */
  washLevel: number | null;
  /** 对不上 1 到 8 的号。 */
  marks: WireFetterMark[];
}

export interface WireFetterSnapshot {
  /** GResFetterList.reset_count。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  resetCount: number | null;
  /** GResFetterList.goddess。没有这个字段时是空数组。 */
  goddess: WireFetterGoddess[];
  /** 对不上字段 1、2 的外层号。 */
  marks: WireFetterMark[];
}

/**
 * 解 s2c 28100。空包体返回已同步的空羁绊，reset_count 保持缺省。
 * 超长、坏 varint、goddess 有包但一条都解不开时返回 null。
 */
export function decodeWireFetter(body: Uint8Array | null | undefined): WireFetterSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const goddess: WireFetterGoddess[] = [];
  const marks: WireFetterMark[] = [];
  let blobs = 0;
  let resetCount: number | null = null;
  let sawReset = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawReset) {
        sawReset = true;
        resetCount = accepted(row.varint);
        if (resetCount === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeGoddess(row.bytes);
      if (!parsed) continue;
      goddess.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && goddess.length === 0) return null;
  return { resetCount, goddess, marks };
}

/** 页上写 reset_count 和 goddess 条数。没有时写「无」和「空羁绊」。出现的 0 仍写 0。 */
export function formatWireFetterHead(snap: WireFetterSnapshot): string {
  const list = snap.goddess.length === 0 ? WIRE_FETTER_EMPTY : snap.goddess.length + " 条";
  return joinMarks("reset_count=" + numText(snap.resetCount) + " / goddess=" + list, snap.marks);
}

/** 一行一个 PSFetterData。没有的格子写「无」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireFetterLine(row: WireFetterGoddess): string {
  const line =
    "type=" +
    numText(row.type) +
    " / exp=" +
    numText(row.exp) +
    " / level=" +
    numText(row.level) +
    " / skill_level=" +
    numText(row.skillLevel) +
    " / refine_level=" +
    numText(row.refineLevel) +
    " / uplimit_level=" +
    numText(row.uplimitLevel) +
    " / soul_level=" +
    numText(row.soulLevel) +
    " / wash_level=" +
    numText(row.washLevel);
  return joinMarks(line, row.marks);
}

export function wireFetterNote(snap: WireFetterSnapshot): string {
  const head = formatWireFetterHead(snap);
  const tail = WIRE_FETTER_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.goddess.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.goddess.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireFetterLine(snap.goddess[i]));
  if (snap.goddess.length > n) parts.push("其余 " + (snap.goddess.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireFetterSnapshot {
  return { resetCount: null, goddess: [], marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireFetterMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireFetterMark[]): string {
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

function decodeGoddess(body: Uint8Array): WireFetterGoddess | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireFetterMark[] = [];
  const values: (number | null)[] = [null, null, null, null, null, null, null, null, null];
  const saw: boolean[] = [false, false, false, false, false, false, false, false, false];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field >= 1 && row.field <= 8 && row.kind === "varint") {
      if (!saw[row.field]) {
        saw[row.field] = true;
        const value = accepted(row.varint);
        if (value === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        } else {
          values[row.field] = value;
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    type: values[1],
    exp: values[2],
    level: values[3],
    skillLevel: values[4],
    refineLevel: values[5],
    uplimitLevel: values[6],
    soulLevel: values[7],
    washLevel: values[8],
    marks,
  };
}

function markOf(row: RawField): WireFetterMark | null {
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
