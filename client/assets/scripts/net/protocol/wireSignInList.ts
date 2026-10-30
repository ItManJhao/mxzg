/**
 * 真服签到列表只读。c2s / s2c 都是 13010。
 * c2s 是 GReqSignInList，空体，没有 page。整帧 04 00 00 00 D2 32 00 00，即 04000000d2320000。
 * 13010 = 0x32D2，小端是 D2 32 00 00。空体一次。
 * 服侧签到列表。getSignday 轻懒建。跨日、跨月可能把签到日重置并写库。轻懒建、轻日刷、轻月刷可接受。
 * 无扣费，无领奖写。
 * 不是英雄等级重生次数 4044。不是爬塔首通已领 3203。不是进行中活动 20101。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。
 * 4044 已合。本刀不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 4044 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 4044 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 13011 签到领奖。13011 是写号，本刀不编码、不发送。
 * 12020 每日任务列表另只读接在其后，勿合并。不做 20011。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 13010 是 GResSignInList。
 * 仓库里其它消息也是按声明顺序从 1 编号。days、isSignIn、month、charged、newServer 按声明顺序是 1、2、3、4、5。
 * days 是字段 1，repeated int32，可以是未打包的 repeated varint，也可以是打包的 length-delimited。按出现顺序写，不排序。
 * isSignIn、month、charged、newServer 是字段 2、3、4、5 的 varint。bool 也按出现的 0/1 写，不改写成 true/false。
 * 没有这个字段时保持缺省，不写成 0，页上也不补这一项。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。五个字段都缺省，页上写「已同步空表」，不写成 0。
 * 解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.signInList。 */
export const WIRE_SIGN_IN_LIST_CMD = "wire.13010";

export const WIRE_SIGN_IN_LIST_FRAME = "04000000d2320000";
export const WIRE_SIGN_IN_LIST_EMPTY = "已同步空表";
export const WIRE_SIGN_IN_LIST_READONLY_TITLE = "签到列表（真服只读）";
export const WIRE_SIGN_IN_LIST_UNSYNCED_TOAST = "真服未同步";
export const WIRE_SIGN_IN_LIST_READONLY_NOTE =
  "只读展示签到列表里实际出现的 days、isSignIn、month、charged、newServer。缺字段不写成 0，也不补一项。出现的值如实展示。无领奖入口。不发 13011。12020 每日任务列表另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 4044 分开发，勿合并。不是启动链 12010。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_SIGN_IN_LIST_SIDE_EFFECT =
  "getSignday 轻懒建。跨日、跨月可能把签到日重置并写库。轻懒建、轻日刷、轻月刷可接受。无扣费，无领奖。空 c2s 一次，无 page，挂在 4044 之后。只发 cmd=13010，空帧 04000000d2320000。不发 13011 签到领奖。12020 每日任务列表另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 4044 分开发，勿合并。本刀不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。不是启动链 12010";
export const WIRE_SIGN_IN_LIST_FIELD_NOTE =
  "days、isSignIn、month、charged、newServer。按声明顺序是字段 1、2、3、4、5。days 是 repeated int32。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。5001 / 51001 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。 */
export const WIRE_SIGN_IN_LIST_BANNED_CMDS = [
  "wire.13011",
  "wire.20011",
  "wire.4601",
  "wire.29001",
] as const;

export interface WireSignInListMark {
  field: number;
  text: string;
}

export interface WireSignInListSnapshot {
  /** GResSignInList.days。字段没出现时是 null，不写成 0。出现过但没有数时是空数组。 */
  days: number[] | null;
  /** GResSignInList.isSignIn。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  isSignIn: number | null;
  /** GResSignInList.month。没有时是 null，不写成 0。 */
  month: number | null;
  /** GResSignInList.charged。没有时是 null，不写成 0。 */
  charged: number | null;
  /** GResSignInList.newServer。没有时是 null，不写成 0。 */
  newServer: number | null;
  /** 对不上字段 1–5 的外层号。 */
  marks: WireSignInListMark[];
}

/**
 * 解 s2c 13010。空包体返回已同步的缺省字段。
 * 超长、坏 varint、字段 1 打包解不开时返回 null。
 */
export function decodeWireSignInList(body: Uint8Array | null | undefined): WireSignInListSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireSignInListMark[] = [];
  let days: number[] | null = null;
  let isSignIn: number | null = null;
  let month: number | null = null;
  let charged: number | null = null;
  let newServer: number | null = null;
  let sawIsSignIn = false;
  let sawMonth = false;
  let sawCharged = false;
  let sawNewServer = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (days === null) days = [];
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      } else {
        days.push(value);
      }
      continue;
    }
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      if (days === null) days = [];
      for (let j = 0; j < packed.length; j++) days.push(packed[j]);
      continue;
    }
    if (row.field === 2 && row.kind === "varint") {
      if (!sawIsSignIn) {
        sawIsSignIn = true;
        isSignIn = accepted(row.varint);
        if (isSignIn === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 3 && row.kind === "varint") {
      if (!sawMonth) {
        sawMonth = true;
        month = accepted(row.varint);
        if (month === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 4 && row.kind === "varint") {
      if (!sawCharged) {
        sawCharged = true;
        charged = accepted(row.varint);
        if (charged === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 5 && row.kind === "varint") {
      if (!sawNewServer) {
        sawNewServer = true;
        newServer = accepted(row.varint);
        if (newServer === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { days, isSignIn, month, charged, newServer, marks };
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireSignInListLine(snap: WireSignInListSnapshot): string {
  const parts: string[] = [];
  if (snap.days !== null) parts.push("days=" + (snap.days.length === 0 ? "空" : numList(snap.days)));
  if (snap.isSignIn !== null) parts.push("isSignIn=" + String(snap.isSignIn));
  if (snap.month !== null) parts.push("month=" + String(snap.month));
  if (snap.charged !== null) parts.push("charged=" + String(snap.charged));
  if (snap.newServer !== null) parts.push("newServer=" + String(snap.newServer));
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_SIGN_IN_LIST_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireSignInListNote(snap: WireSignInListSnapshot): string {
  return formatWireSignInListLine(snap) + "。" + WIRE_SIGN_IN_LIST_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireSignInListSnapshot {
  return { days: null, isSignIn: null, month: null, charged: null, newServer: null, marks: [] };
}

function numList(values: number[]): string {
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function joinMarks(line: string, marks: WireSignInListMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireSignInListMark[]): string {
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

function markOf(row: RawField): WireSignInListMark | null {
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
