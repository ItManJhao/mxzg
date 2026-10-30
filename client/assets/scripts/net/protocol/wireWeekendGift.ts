/**
 * 真服周末礼包只读。c2s / s2c 都是 61001。
 * c2s 是 GReqWeekendGiftData，空体，没有 page。整帧 04 00 00 00 49 EE 00 00，即 0400000049ee0000。
 * 61001 = 0xEE49，小端是 49 EE 00 00。空体一次。
 * 这是周末礼包 / 周末活动数据，不是已合的每月福利列表 26001（空帧 0400000091650000），也不是每日福利列表 26002（空帧 0400000092650000），也不是启动链成就列表 12010（空帧 04000000ea2e0000）。
 * 服侧轻懒建、轻日刷可接受。无扣费，无领奖写。不发明领奖写号。
 * 不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。不是签到列表 13010。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。
 * 26001 已合。本刀不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 26001 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 26001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 61002 领奖。61002 是写号，本刀不编码、不发送。
 * 62001 神迹遗物另只读接在其后，勿合并。本文件不编 62001。
 * 不做备份 63001。63001 本轮不做，不编码、不发送。
 * 不发 12021 领每日任务奖。12021 是写号，本刀不编码、不发送。
 * 不发 12022 领活跃宝箱。12022 是写号，本刀不编码、不发送。
 * 不做 20011。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 61001 是 GResWeekendGiftData。
 * 仓库里没有这份 proto。start_time、end_time、reward_status 按声明顺序从 1 编号。
 * start_time 是字段 1。end_time 是字段 2。reward_status 是字段 3，repeated。
 * 内层 idx、status 按声明顺序从 1 编号。idx 是字段 1，status 是字段 2。
 * 字段 3 若是 varint，不当成一条记录，按字段号写。
 * 没有这个字段时保持缺省，不写成 0，页上也不补这一项。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。字段缺省，页上写「已同步空表」，不写成 0。
 * 记录包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.weekendGift。 */
export const WIRE_WEEKEND_GIFT_CMD = "wire.61001";

export const WIRE_WEEKEND_GIFT_FRAME = "0400000049ee0000";
export const WIRE_WEEKEND_GIFT_EMPTY = "已同步空表";
export const WIRE_WEEKEND_GIFT_READONLY_TITLE = "周末礼包（真服只读）";
export const WIRE_WEEKEND_GIFT_UNSYNCED_TOAST = "真服未同步";
export const WIRE_WEEKEND_GIFT_READONLY_NOTE =
  "只读展示周末礼包里实际出现的 start_time、end_time、reward_status。reward_status 是 repeated，内层 idx、status。缺字段不写成 0，也不补一项。出现的值如实展示。无领奖入口。不重复拉 26001。不发 61002。不做 62001。不做 63001。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。5001、51001 已有，勿重复。26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 26001 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_WEEKEND_GIFT_SIDE_EFFECT =
  "轻懒建、轻日刷可接受。无扣费，无领奖写。空 c2s 一次，无 page，挂在 26001 之后。只发 cmd=61001，空帧 0400000049ee0000。不重复拉 26001。不发 61002。不做 62001。不做 63001。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 26001 分开发，勿合并。本刀不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_WEEKEND_GIFT_FIELD_NOTE =
  "start_time、end_time、reward_status。按声明顺序是字段 1、2、3。reward_status 内层 idx、status。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。26001 / 26002 / 5001 / 51001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 / 62001 / 63001 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。不发明领奖写号。61002 是领奖写号。62001 神迹遗物另帧，勿合并。63001 英雄殿堂另帧，勿合并。 */
export const WIRE_WEEKEND_GIFT_BANNED_CMDS = [
  "wire.61002",
  "wire.12021",
  "wire.12022",
  "wire.20011",
  "wire.4601",
  "wire.29001",
] as const;

export interface WireWeekendGiftMark {
  field: number;
  text: string;
}

export interface WireWeekendGiftRow {
  /** reward_status.idx。没有时是 null，不写成 0。 */
  idx: number | null;
  /** reward_status.status。没有时是 null，不写成 0。 */
  status: number | null;
  /** 对不上 idx / status 的内层号。 */
  marks: WireWeekendGiftMark[];
}

export interface WireWeekendGiftSnapshot {
  /** GResWeekendGiftData.start_time。字段没出现时是 null，不写成 0。 */
  startTime: number | null;
  /** GResWeekendGiftData.end_time。字段没出现时是 null，不写成 0。 */
  endTime: number | null;
  /** GResWeekendGiftData.reward_status。字段没出现时是 null。出现过但没有行时是空数组。 */
  rewardStatus: WireWeekendGiftRow[] | null;
  /** 对不上字段 1、2、3 的外层号，以及字段 3 上不是记录包的值。 */
  marks: WireWeekendGiftMark[];
}

/**
 * 解 s2c 61001。空包体返回已同步的缺省字段。
 * 超长、坏 varint、记录包解不开时返回 null。
 */
export function decodeWireWeekendGift(body: Uint8Array | null | undefined): WireWeekendGiftSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireWeekendGiftMark[] = [];
  let startTime: number | null = null;
  let endTime: number | null = null;
  let rewardStatus: WireWeekendGiftRow[] | null = null;
  let sawStart = false;
  let sawEnd = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && !sawStart) {
      sawStart = true;
      startTime = accepted(row.varint);
      if (startTime === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint" && !sawEnd) {
      sawEnd = true;
      endTime = accepted(row.varint);
      if (endTime === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 3 && row.kind === "bytes" && row.bytes) {
      const parsed = decodeRow(row.bytes);
      if (!parsed) return null;
      if (rewardStatus === null) rewardStatus = [];
      rewardStatus.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { startTime, endTime, rewardStatus, marks };
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireWeekendGiftLine(snap: WireWeekendGiftSnapshot): string {
  const parts: string[] = [];
  if (snap.startTime !== null) parts.push("start_time=" + String(snap.startTime));
  if (snap.endTime !== null) parts.push("end_time=" + String(snap.endTime));
  if (snap.rewardStatus !== null) {
    parts.push("reward_status=" + (snap.rewardStatus.length === 0 ? "空" : rowList(snap.rewardStatus)));
  }
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_WEEKEND_GIFT_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireWeekendGiftNote(snap: WireWeekendGiftSnapshot): string {
  return formatWireWeekendGiftLine(snap) + "。" + WIRE_WEEKEND_GIFT_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireWeekendGiftSnapshot {
  return { startTime: null, endTime: null, rewardStatus: null, marks: [] };
}

function rowList(rows: WireWeekendGiftRow[]): string {
  const n = Math.min(rows.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatRow(rows[i]));
  if (rows.length > n) return head.join(";") + "…+" + (rows.length - n);
  return head.join(";");
}

function formatRow(row: WireWeekendGiftRow): string {
  const parts: string[] = [];
  if (row.idx !== null) parts.push("idx=" + String(row.idx));
  if (row.status !== null) parts.push("status=" + String(row.status));
  const body = parts.length === 0 && row.marks.length === 0 ? "空" : parts.join(",");
  return joinMarks(body, row.marks);
}

function joinMarks(line: string, marks: WireWeekendGiftMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireWeekendGiftMark[]): string {
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

function decodeRow(body: Uint8Array): WireWeekendGiftRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireWeekendGiftMark[] = [];
  let idx: number | null = null;
  let status: number | null = null;
  let sawIdx = false;
  let sawStatus = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && !sawIdx) {
      sawIdx = true;
      idx = accepted(row.varint);
      if (idx === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint" && !sawStatus) {
      sawStatus = true;
      status = accepted(row.varint);
      if (status === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { idx, status, marks };
}

function markOf(row: RawField): WireWeekendGiftMark | null {
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
