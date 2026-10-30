/**
 * 真服积天豪礼2只读。c2s / s2c 都是 69001。
 * c2s 是 GReqRechargeDaysBList，空体，没有 page。整帧 04 00 00 00 89 0D 01 00，即 04000000890d0100。
 * 69001 = 0x10D89，小端是 89 0D 01 00。空体一次。
 * 这是积天豪礼2数据，不是已合的英雄殿堂 63001（空帧 0400000019f60000），也不是神迹遗物 62001（空帧 0400000031f20000），也不是周末礼包 61001（空帧 0400000049ee0000）。
 * 服侧轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。
 * 不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。不是签到列表 13010。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。不是星盘 68001。不是灵器 70001。
 * 63001 已合。本刀不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 63001 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 63001 之后发出，只发一次。Boot.ts 不改。
 * 74001 时空魔塔另帧，挂在本帧之后，勿合并。不发 74002。不发 74003。不做 73002。
 * 不夹在 2001 和 3007 中间。
 * 不发 69002 领取积天豪礼2奖励。69002 是写号，本刀不编码、不发送。
 * 不做 71001。71001 本轮不做，不编码、不发送。
 * 不做 20011。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。68001 已在链上，勿重复。70001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 69001 是 GResRechargeDaysBList。list 是 repeated PSRechargeDaysInfo。
 * 仓库里没有这份 proto。day、money、hasReward 按声明顺序从 1 编号。
 * 字段 1 是记录包时，按 repeated PSRechargeDaysInfo 逐条解。外层其它号按字段号写。
 * 字段 1 不是记录包时，整包按同一组字段号解成一条 PSRechargeDaysInfo。
 * day 是字段 1。money 是字段 2。hasReward 是字段 3。
 * 出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 * 没有的数不写成 0。
 *
 * 空包体是已同步。字段缺省，页上写「已同步空表」，不写成 0。
 * 记录包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.rechargeDaysB。 */
export const WIRE_RECHARGE_DAYS_B_CMD = "wire.69001";

export const WIRE_RECHARGE_DAYS_B_FRAME = "04000000890d0100";
export const WIRE_RECHARGE_DAYS_B_EMPTY = "已同步空表";
export const WIRE_RECHARGE_DAYS_B_READONLY_TITLE = "积天豪礼2（真服只读）";
export const WIRE_RECHARGE_DAYS_B_UNSYNCED_TOAST = "真服未同步";
export const WIRE_RECHARGE_DAYS_B_READONLY_NOTE =
  "只读展示积天豪礼2里实际出现的 day、money、hasReward。字段 1 是记录包时按 repeated PSRechargeDaysInfo 写。否则整包按同一组字段号写成一条。缺字段不写成 0，也不补一项。出现的值如实展示。无领奖入口。不重复拉 63001。不发 69002。不做 71001。不做 20011。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 63001 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_RECHARGE_DAYS_B_SIDE_EFFECT =
  "轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。空 c2s 一次，无 page，挂在 63001 之后。只发 cmd=69001，空帧 04000000890d0100。不重复拉 63001。不发 69002。不做 71001。不做 20011。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 63001 分开发，勿合并。本刀不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_RECHARGE_DAYS_B_FIELD_NOTE =
  "day、money、hasReward。按声明顺序是字段 1、2、3。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。63001 / 62001 / 61001 / 26001 / 26002 / 5001 / 51001 / 68001 / 70001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。69002 领取积天豪礼2奖励是写号。71001 本轮不做。 */
export const WIRE_RECHARGE_DAYS_B_BANNED_CMDS = [
  "wire.69002",
  "wire.71001",
  "wire.20011",
  "wire.4601",
  "wire.29001",
] as const;

export interface WireRechargeDaysBMark {
  field: number;
  text: string;
}

export interface WireRechargeDaysBRow {
  /** PSRechargeDaysInfo.day。没有时是 null，不写成 0。 */
  day: number | null;
  /** PSRechargeDaysInfo.money。没有时是 null，不写成 0。 */
  money: number | null;
  /** PSRechargeDaysInfo.hasReward。没有时是 null，不写成 0。 */
  hasReward: number | null;
  /** 对不上 day / money / hasReward 的号。 */
  marks: WireRechargeDaysBMark[];
}

export interface WireRechargeDaysBSnapshot {
  /** 实际出现的 PSRechargeDaysInfo。一条都没有时是 null，不补空行。 */
  rows: WireRechargeDaysBRow[] | null;
  /** 记录包外层对不上的号。整包当成一条时，对不上的号在行上。 */
  marks: WireRechargeDaysBMark[];
}

/**
 * 解 s2c 69001。空包体返回已同步的缺省字段。
 * 超长、坏 varint、记录包解不开时返回 null。
 */
export function decodeWireRechargeDaysB(body: Uint8Array | null | undefined): WireRechargeDaysBSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  let nested = false;
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].field === 1 && fields[i].kind === "bytes") {
      nested = true;
      break;
    }
  }
  if (nested) return decodeRepeated(fields);
  return decodeFlat(fields);
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireRechargeDaysBLine(snap: WireRechargeDaysBSnapshot): string {
  const parts: string[] = [];
  if (snap.rows !== null) parts.push("list=" + (snap.rows.length === 0 ? "空" : rowList(snap.rows)));
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_RECHARGE_DAYS_B_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireRechargeDaysBNote(snap: WireRechargeDaysBSnapshot): string {
  return formatWireRechargeDaysBLine(snap) + "。" + WIRE_RECHARGE_DAYS_B_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireRechargeDaysBSnapshot {
  return { rows: null, marks: [] };
}

function decodeRepeated(fields: RawField[]): WireRechargeDaysBSnapshot | null {
  const marks: WireRechargeDaysBMark[] = [];
  const rows: WireRechargeDaysBRow[] = [];
  let saw = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const parsed = decodeRow(row.bytes);
      if (!parsed) return null;
      saw = true;
      rows.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { rows: saw ? rows : null, marks };
}

function decodeFlat(fields: RawField[]): WireRechargeDaysBSnapshot | null {
  const parsed = decodeRowFields(fields);
  if (!parsed) return null;
  if (!rowHasAnything(parsed)) return { rows: null, marks: parsed.marks };
  return { rows: [parsed], marks: [] };
}

function rowList(rows: WireRechargeDaysBRow[]): string {
  const n = Math.min(rows.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatRow(rows[i]));
  if (rows.length > n) return head.join(";") + "…+" + (rows.length - n);
  return head.join(";");
}

function formatRow(row: WireRechargeDaysBRow): string {
  const parts: string[] = [];
  if (row.day !== null) parts.push("day=" + String(row.day));
  if (row.money !== null) parts.push("money=" + String(row.money));
  if (row.hasReward !== null) parts.push("hasReward=" + String(row.hasReward));
  const body = parts.length === 0 && row.marks.length === 0 ? "空" : parts.join(",");
  return joinMarks(body, row.marks);
}

function rowHasAnything(row: WireRechargeDaysBRow): boolean {
  return row.day !== null || row.money !== null || row.hasReward !== null || row.marks.length > 0;
}

function joinMarks(line: string, marks: WireRechargeDaysBMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireRechargeDaysBMark[]): string {
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

function decodeRow(body: Uint8Array): WireRechargeDaysBRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  return decodeRowFields(fields);
}

function decodeRowFields(fields: RawField[]): WireRechargeDaysBRow | null {
  const marks: WireRechargeDaysBMark[] = [];
  let day: number | null = null;
  let money: number | null = null;
  let hasReward: number | null = null;
  let sawDay = false;
  let sawMoney = false;
  let sawReward = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && !sawDay) {
      sawDay = true;
      day = accepted(row.varint);
      if (day === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint" && !sawMoney) {
      sawMoney = true;
      money = accepted(row.varint);
      if (money === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 3 && row.kind === "varint" && !sawReward) {
      sawReward = true;
      hasReward = accepted(row.varint);
      if (hasReward === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { day, money, hasReward, marks };
}

function markOf(row: RawField): WireRechargeDaysBMark | null {
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
