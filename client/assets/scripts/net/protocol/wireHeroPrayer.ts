/**
 * 真服英雄祈愿数据只读。c2s / s2c 都是 4201。
 * c2s 是 GReqHeroPrayerData，空体，没有 page。整帧 04 00 00 00 69 10 00 00，即 0400000069100000。
 * 4201 = 0x1069，小端是 69 10 00 00。空体一次。
 * 不是穿戴皮肤英雄列表 4401。不是激活皮肤列表 4402。
 * 4401、4402 已合。本刀不重复拉 4401，也不重复拉 4402。与已合刀分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 4401 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不发 4202 英雄祈愿（扣道具 + 发奖）。
 * 74104 宠物图鉴另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 服侧轻懒建 hero_prayer。特权过期清字段。只读展示。无扣费，无领奖。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 4201 是 GResHeroPrayerData。
 * 仓库里其它消息也是按声明顺序从 1 编号。privilege、end_time 按声明顺序是 1、2。
 * privilege 是 0/1。end_time 未开为 0。
 * 没有这个字段时保持缺省，不写成 0。出现的 0 仍写 0。对不上的号按字段号写。
 *
 * 空包体是已同步。privilege、end_time 都保持缺省，不写成 0。
 * 解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.heroPrayerData。 */
export const WIRE_HERO_PRAYER_CMD = "wire.4201";

export const WIRE_HERO_PRAYER_READONLY_TITLE = "英雄祈愿数据（真服只读）";
export const WIRE_HERO_PRAYER_UNSYNCED_TOAST = "真服未同步";
export const WIRE_HERO_PRAYER_READONLY_NOTE =
  "只读展示 privilege、end_time。privilege：0/1。end_time 未开为 0。无祈愿写入口。不发 4202 英雄祈愿。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 4401 分刀，勿合并。本刀不重复拉 4401。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_HERO_PRAYER_SIDE_EFFECT =
  "轻懒建 hero_prayer。特权过期清字段。只读展示。无扣费，无领奖。空 c2s 一次，无 page，挂在 4401 之后。不发 4202 英雄祈愿。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 4401 分刀，勿合并";
export const WIRE_HERO_PRAYER_FIELD_NOTE =
  "privilege、end_time。privilege：0/1。end_time 未开为 0。没有的数不写成 0。对不上的号按字段号写";

export interface WireHeroPrayerMark {
  field: number;
  text: string;
}

export interface WireHeroPrayerSnapshot {
  /** GResHeroPrayerData.privilege。0/1。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  privilege: number | null;
  /** GResHeroPrayerData.end_time。未开为 0。没有时是 null，不写成 0。出现的 0 仍写 0。 */
  endTime: number | null;
  /** 对不上字段 1、2 的号。 */
  marks: WireHeroPrayerMark[];
}

/**
 * 解 s2c 4201。空包体返回已同步的缺省 privilege、end_time。
 * 超长、坏 varint 返回 null。
 */
export function decodeWireHeroPrayer(body: Uint8Array | null | undefined): WireHeroPrayerSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireHeroPrayerMark[] = [];
  let privilege: number | null = null;
  let endTime: number | null = null;
  let sawPrivilege = false;
  let sawEnd = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawPrivilege) {
        sawPrivilege = true;
        privilege = nonNegative(row.varint);
        if (privilege === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint") {
      if (!sawEnd) {
        sawEnd = true;
        endTime = nonNegative(row.varint);
        if (endTime === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { privilege, endTime, marks };
}

/** 页上和日志都写 privilege、end_time。没有时写「无」。出现的 0 仍写 0。end_time 为 0 时标明未开。 */
export function formatWireHeroPrayerLine(snap: WireHeroPrayerSnapshot): string {
  return joinMarks("privilege=" + numText(snap.privilege) + " / end_time=" + endTimeText(snap.endTime), snap.marks);
}

export function wireHeroPrayerNote(snap: WireHeroPrayerSnapshot): string {
  return formatWireHeroPrayerLine(snap) + "。" + WIRE_HERO_PRAYER_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireHeroPrayerSnapshot {
  return { privilege: null, endTime: null, marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function endTimeText(value: number | null): string {
  if (value === null) return "无";
  if (value === 0) return "0 未开";
  return String(value);
}

function joinMarks(line: string, marks: WireHeroPrayerMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireHeroPrayerMark[]): string {
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

function markOf(row: RawField): WireHeroPrayerMark | null {
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
