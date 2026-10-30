/**
 * 真服时空魔塔个人信息只读。c2s / s2c 都是 74001。
 * c2s 是 GReqTimeTowerInfo，空体，没有 page。整帧 04 00 00 00 11 21 01 00，即 0400000011210100。
 * 74001 = 0x12111，小端是 11 21 01 00。空体一次。
 * 这是时空魔塔个人信息，不是已合的积天豪礼2 69001（空帧 04000000890d0100），也不是英雄殿堂 63001（空帧 0400000019f60000），也不是神迹遗物 62001（空帧 0400000031f20000），也不是周末礼包 61001（空帧 0400000049ee0000）。
 * 服侧轻懒建（getTower 可能 add）可接受。轻日刷（跨日清 failNum）可接受。跨服回包轮次变化可能清 weekPass。无扣费，无领奖，无挑战写。
 * 不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。不是签到列表 13010。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。不是星盘 68001。不是灵器 70001。
 * 69001 已合。本刀不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 69001 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 69001 之后发出，只发一次。Boot.ts 不改。74120 时空冒险另帧，挂在其后，勿合并。
 * 不夹在 2001 和 3007 中间。
 * 不发 74002 挑战。74002 是写号，本刀不编码、不发送。
 * 不发 74003 排行。74003 本刀不挂，不编码、不发送。
 * 不做 73002。73002 本轮不做，不编码、不发送。
 * 不做 71001。71001 本轮不做，不编码、不发送。
 * 不做 20011。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。68001 已在链上，勿重复。70001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 74001 是 GResTimeTowerInfo。仓库里没有这份 proto。
 * mission_id、accumulate_pass、max_pass、heart、mission_mark、starttime、endtime 按声明顺序从 1 编号。
 * mission_id 是字段 1。accumulate_pass 是字段 2。max_pass 是字段 3。heart 是字段 4。
 * mission_mark 是字段 5。starttime 是字段 6。endtime 是字段 7。
 * 出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 * 没有的数不写成 0。
 *
 * 空包体是已同步。字段缺省，页上写「已同步空表」，不写成 0。
 * 包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.timeTower。 */
export const WIRE_TIME_TOWER_CMD = "wire.74001";

export const WIRE_TIME_TOWER_FRAME = "0400000011210100";
export const WIRE_TIME_TOWER_EMPTY = "已同步空表";
export const WIRE_TIME_TOWER_READONLY_TITLE = "时空魔塔（真服只读）";
export const WIRE_TIME_TOWER_UNSYNCED_TOAST = "真服未同步";
export const WIRE_TIME_TOWER_READONLY_NOTE =
  "只读展示时空魔塔个人信息里实际出现的 mission_id、accumulate_pass、max_pass、heart、mission_mark、starttime、endtime。按声明顺序是字段 1–7。缺字段不写成 0，也不补一项。出现的值如实展示。无挑战、无排行入口。不重复拉 69001。不发 74002。不发 74003。不做 73002。不做 71001。不做 20011。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 69001 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_TIME_TOWER_SIDE_EFFECT =
  "轻懒建（getTower 可能 add）可接受。轻日刷（跨日清 failNum）可接受。跨服回包轮次变化可能清 weekPass。无扣费，无领奖，无挑战写。空 c2s 一次，无 page，挂在 69001 之后。只发 cmd=74001，空帧 0400000011210100。不重复拉 69001。不发 74002。不发 74003。不做 73002。不做 71001。不做 20011。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 69001 分开发，勿合并。本刀不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_TIME_TOWER_FIELD_NOTE =
  "mission_id、accumulate_pass、max_pass、heart、mission_mark、starttime、endtime。按声明顺序是字段 1、2、3、4、5、6、7。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。69001 / 63001 / 62001 / 61001 / 26001 / 26002 / 5001 / 51001 / 68001 / 70001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。74002 挑战是写号。74003 排行本刀不挂。73002、71001 本轮不做。 */
export const WIRE_TIME_TOWER_BANNED_CMDS = [
  "wire.74002",
  "wire.74003",
  "wire.73002",
  "wire.71001",
  "wire.20011",
  "wire.4601",
  "wire.29001",
] as const;

export interface WireTimeTowerMark {
  field: number;
  text: string;
}

export interface WireTimeTowerSnapshot {
  /** GResTimeTowerInfo.mission_id。没有时是 null，不写成 0。 */
  missionId: number | null;
  /** GResTimeTowerInfo.accumulate_pass。没有时是 null，不写成 0。 */
  accumulatePass: number | null;
  /** GResTimeTowerInfo.max_pass。没有时是 null，不写成 0。 */
  maxPass: number | null;
  /** GResTimeTowerInfo.heart。没有时是 null，不写成 0。 */
  heart: number | null;
  /** GResTimeTowerInfo.mission_mark。没有时是 null，不写成 0。 */
  missionMark: number | null;
  /** GResTimeTowerInfo.starttime。没有时是 null，不写成 0。 */
  starttime: number | null;
  /** GResTimeTowerInfo.endtime。没有时是 null，不写成 0。 */
  endtime: number | null;
  /** 对不上这七个号的字段，或同一号的后续值。 */
  marks: WireTimeTowerMark[];
}

/**
 * 解 s2c 74001。空包体返回已同步的缺省字段。
 * 超长、坏 varint 时返回 null。
 */
export function decodeWireTimeTower(body: Uint8Array | null | undefined): WireTimeTowerSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  return decodeFields(fields);
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireTimeTowerLine(snap: WireTimeTowerSnapshot): string {
  const parts: string[] = [];
  if (snap.missionId !== null) parts.push("mission_id=" + String(snap.missionId));
  if (snap.accumulatePass !== null) parts.push("accumulate_pass=" + String(snap.accumulatePass));
  if (snap.maxPass !== null) parts.push("max_pass=" + String(snap.maxPass));
  if (snap.heart !== null) parts.push("heart=" + String(snap.heart));
  if (snap.missionMark !== null) parts.push("mission_mark=" + String(snap.missionMark));
  if (snap.starttime !== null) parts.push("starttime=" + String(snap.starttime));
  if (snap.endtime !== null) parts.push("endtime=" + String(snap.endtime));
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_TIME_TOWER_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireTimeTowerNote(snap: WireTimeTowerSnapshot): string {
  return formatWireTimeTowerLine(snap) + "。" + WIRE_TIME_TOWER_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireTimeTowerSnapshot {
  return {
    missionId: null,
    accumulatePass: null,
    maxPass: null,
    heart: null,
    missionMark: null,
    starttime: null,
    endtime: null,
    marks: [],
  };
}

function decodeFields(fields: RawField[]): WireTimeTowerSnapshot | null {
  const marks: WireTimeTowerMark[] = [];
  let missionId: number | null = null;
  let accumulatePass: number | null = null;
  let maxPass: number | null = null;
  let heart: number | null = null;
  let missionMark: number | null = null;
  let starttime: number | null = null;
  let endtime: number | null = null;
  let sawMission = false;
  let sawAccumulate = false;
  let sawMax = false;
  let sawHeart = false;
  let sawMark = false;
  let sawStart = false;
  let sawEnd = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && !sawMission) {
      sawMission = true;
      missionId = accepted(row.varint);
      if (missionId === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 2 && row.kind === "varint" && !sawAccumulate) {
      sawAccumulate = true;
      accumulatePass = accepted(row.varint);
      if (accumulatePass === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 3 && row.kind === "varint" && !sawMax) {
      sawMax = true;
      maxPass = accepted(row.varint);
      if (maxPass === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 4 && row.kind === "varint" && !sawHeart) {
      sawHeart = true;
      heart = accepted(row.varint);
      if (heart === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 5 && row.kind === "varint" && !sawMark) {
      sawMark = true;
      missionMark = accepted(row.varint);
      if (missionMark === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 6 && row.kind === "varint" && !sawStart) {
      sawStart = true;
      starttime = accepted(row.varint);
      if (starttime === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 7 && row.kind === "varint" && !sawEnd) {
      sawEnd = true;
      endtime = accepted(row.varint);
      if (endtime === null) pushMark(marks, row);
      continue;
    }
    pushMark(marks, row);
  }
  return { missionId, accumulatePass, maxPass, heart, missionMark, starttime, endtime, marks };
}

function pushMark(marks: WireTimeTowerMark[], row: RawField): void {
  const mark = markOf(row);
  if (mark) marks.push(mark);
}

function joinMarks(line: string, marks: WireTimeTowerMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireTimeTowerMark[]): string {
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

function markOf(row: RawField): WireTimeTowerMark | null {
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
