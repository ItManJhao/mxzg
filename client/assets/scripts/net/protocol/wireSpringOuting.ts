/**
 * 真服出游寻春只读。c2s / s2c 都是 76301。活动 CHU_YOU_XUN_CHUN / promo096。
 * c2s 是 GReqSpringOutingMissionGetDataInfo，空体，没有 page，没有 FIELD。整帧 04 00 00 00 0d 2a 01 00，即 040000000d2a0100。
 * 76301 = 0x12A0D，小端是 0d 2a 01 00。空体一次。
 * 这是出游寻春数据，不是已合的约惠圣诞礼包 76101（空帧 0400000045290100），也不是黑五活动 76001（空帧 04000000e1280100）。
 * 服侧轻懒建可接受。轻日刷可接受（跨日清 mission/box）。未开活动回默认空包可接受。无扣费，无领奖。
 * 不是约惠圣诞 76101。不是黑五活动 76001。不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。不是星盘 68001。不是灵器 70001。
 * 76101 已合。本刀不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 76101 分开发，勿合并成一个请求。不并入 76101。
 *
 * 由 WireSession.pullIdle 在空 c2s 76101 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 76302 领任务奖。76302 本刀不编码、不发送。
 * 不发 76303 更新任务进度推送。76303 本刀不编码、不发送。
 * 不发 76304 领宝箱/皮肤数量奖。76304 本刀不编码、不发送。
 * 勿夹 76305、76306、76307、76308。这些不编码、不发送。
 * 76081 圣诞连线另帧编码空体，挂在其后，勿合并。
 * 不做 75001。75001 本轮不做，不编码、不发送。
 * 不做 76501。76501 本轮不做，不编码、不发送。
 * 不做 73002。73002 本轮不做，不编码、不发送。
 * 不做 71001。71001 本轮不做，不编码、不发送。
 * 不做 20011。
 * 不夹发 74121、74122。74121、74122 本刀不编码、不发送。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。68001 已在链上，勿重复。70001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 76301 是 GResSpringOutingMissionGetDataInfo。仓库里没有这份 proto。
 * mission、mission_box_reward_record、open_day 按声明顺序从 1 编号。
 * mission 是字段 1。mission_box_reward_record 是字段 2。open_day 是字段 3。
 * mission、mission_box_reward_record 是 repeated。能解成消息时按内层字段号写，不发明行名字。解不成消息时按打包的数写。
 * open_day 按标量写。长度包按字段号写，不当成 0。
 * 出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 * 没有的数不写成 0。
 *
 * 空包体是已同步。字段缺省，页上写「已同步空表」，不写成 0。
 * 包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.springOuting。 */
export const WIRE_SPRING_OUTING_CMD = "wire.76301";

export const WIRE_SPRING_OUTING_FRAME = "040000000d2a0100";
export const WIRE_SPRING_OUTING_EMPTY = "已同步空表";
export const WIRE_SPRING_OUTING_READONLY_TITLE = "出游寻春（真服只读）";
export const WIRE_SPRING_OUTING_UNSYNCED_TOAST = "真服未同步";
export const WIRE_SPRING_OUTING_READONLY_NOTE =
  "只读展示出游寻春里实际出现的 mission、mission_box_reward_record、open_day。按声明顺序是字段 1–3。mission、mission_box_reward_record 按内层字段号写，不发明行名字。缺字段不写成 0，也不补一项。出现的值如实展示。无领任务奖、无进度写、无领宝箱入口。不发 76302。不发 76303。不发 76304。勿夹 76305、76306、76307、76308。76081 圣诞连线另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是约惠圣诞 76101。5001、51001、68001、70001 已有，勿重复。76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76101 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_SPRING_OUTING_SIDE_EFFECT =
  "轻懒建可接受。轻日刷可接受。跨日清 mission/box 可接受。未开活动回默认空包可接受。无扣费，无领奖。空 c2s 一次，无 page，无 FIELD，挂在 76101 之后。只发 cmd=76301，空帧 040000000d2a0100。不并入 76101。与 76101 分开发。不发 76302。76302 是领任务奖，不编码、不发送。不发 76303。76303 是更新任务进度推送，不编码、不发送。不发 76304。76304 是领宝箱/皮肤数量奖，不编码、不发送。勿夹 76305、76306、76307、76308。76081 圣诞连线另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是约惠圣诞 76101。不是黑五活动 76001。不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。本刀不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_SPRING_OUTING_FIELD_NOTE =
  "mission、mission_box_reward_record、open_day。按声明顺序是字段 1、2、3。mission、mission_box_reward_record 不发明内层名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。76101 / 76001 / 75901 / 75801 / 75131 / 75121 / 75101 / 76542 / 74120 / 74001 / 69001 / 63001 / 62001 / 61001 / 26001 / 26002 / 5001 / 51001 / 68001 / 70001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。76302 是领任务奖。76303 是更新任务进度推送。76304 是领宝箱/皮肤数量奖。76305–76308 勿夹。76081 圣诞连线另帧编码空体，勿合并。75001、76501、73002、71001 本轮不做。74121、74122 不夹发。 */
export const WIRE_SPRING_OUTING_BANNED_CMDS = [
  "wire.76302",
  "wire.76303",
  "wire.76304",
  "wire.76305",
  "wire.76306",
  "wire.76307",
  "wire.76308",
  "wire.75001",
  "wire.76501",
  "wire.73002",
  "wire.71001",
  "wire.20011",
  "wire.4601",
  "wire.29001",
  "wire.74121",
  "wire.74122",
] as const;

export interface WireSpringOutingMark {
  field: number;
  text: string;
}

export interface WireSpringOutingNum {
  kind: "num";
  value: number;
}

export interface WireSpringOutingRow {
  kind: "row";
  /** 长度包里实际出现的内层号。不发明名字。 */
  marks: WireSpringOutingMark[];
}

export type WireSpringOutingPiece = WireSpringOutingNum | WireSpringOutingRow;

export interface WireSpringOutingSnapshot {
  /** GResSpringOutingMissionGetDataInfo.mission。没有时是 null，不写成 0。 */
  mission: WireSpringOutingPiece[] | null;
  /** GResSpringOutingMissionGetDataInfo.mission_box_reward_record。没有时是 null，不写成 0。 */
  missionBoxRewardRecord: WireSpringOutingPiece[] | null;
  /** GResSpringOutingMissionGetDataInfo.open_day。没有时是 null，不写成 0。 */
  openDay: number | null;
  /** 对不上这三个号的字段，或标量上对不上的值。 */
  marks: WireSpringOutingMark[];
}

/**
 * 解 s2c 76301。空包体返回已同步的缺省字段。
 * 超长、坏 varint、列表包解不开时返回 null。
 */
export function decodeWireSpringOuting(body: Uint8Array | null | undefined): WireSpringOutingSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  return decodeFields(fields);
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireSpringOutingLine(snap: WireSpringOutingSnapshot): string {
  const parts: string[] = [];
  if (snap.mission !== null) parts.push(formatList("mission", snap.mission));
  if (snap.missionBoxRewardRecord !== null) parts.push(formatList("mission_box_reward_record", snap.missionBoxRewardRecord));
  if (snap.openDay !== null) parts.push("open_day=" + String(snap.openDay));
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_SPRING_OUTING_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireSpringOutingNote(snap: WireSpringOutingSnapshot): string {
  return formatWireSpringOutingLine(snap) + "。" + WIRE_SPRING_OUTING_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireSpringOutingSnapshot {
  return {
    mission: null,
    missionBoxRewardRecord: null,
    openDay: null,
    marks: [],
  };
}

function decodeFields(fields: RawField[]): WireSpringOutingSnapshot | null {
  const marks: WireSpringOutingMark[] = [];
  let mission: WireSpringOutingPiece[] | null = null;
  let missionBoxRewardRecord: WireSpringOutingPiece[] | null = null;
  let openDay: number | null = null;
  let sawDay = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 || row.field === 2) {
      const pieces = piecesOf(row);
      if (pieces === "bad") return null;
      if (pieces === "mark") {
        pushMark(marks, row);
        continue;
      }
      if (row.field === 1) mission = append(mission, pieces);
      else missionBoxRewardRecord = append(missionBoxRewardRecord, pieces);
      continue;
    }
    if (row.field === 3 && row.kind === "varint" && !sawDay) {
      sawDay = true;
      openDay = accepted(row.varint);
      if (openDay === null) pushMark(marks, row);
      continue;
    }
    pushMark(marks, row);
  }
  return { mission, missionBoxRewardRecord, openDay, marks };
}

function append(list: WireSpringOutingPiece[] | null, pieces: WireSpringOutingPiece[]): WireSpringOutingPiece[] {
  if (!list) return pieces.slice();
  for (let i = 0; i < pieces.length; i++) list.push(pieces[i]);
  return list;
}

function piecesOf(row: RawField): WireSpringOutingPiece[] | "bad" | "mark" {
  if (row.kind === "varint") {
    const value = accepted(row.varint);
    if (value === null) return "mark";
    return [{ kind: "num", value }];
  }
  if (row.kind === "bytes" && row.bytes) {
    const parsed = decodeListBytes(row.bytes);
    if (!parsed) return "bad";
    return parsed;
  }
  return "mark";
}

function decodeListBytes(body: Uint8Array): WireSpringOutingPiece[] | null {
  const fields = readRawFields(body);
  if (fields) return [rowOf(fields)];
  const packed = readPackedNumbers(body);
  if (!packed) return null;
  return numsOf(packed);
}

function rowOf(fields: RawField[]): WireSpringOutingRow {
  const marks: WireSpringOutingMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const mark = markOf(fields[i]);
    if (mark) marks.push(mark);
  }
  return { kind: "row", marks };
}

function numsOf(values: number[]): WireSpringOutingNum[] {
  const rows: WireSpringOutingNum[] = [];
  for (let i = 0; i < values.length; i++) rows.push({ kind: "num", value: values[i] });
  return rows;
}

function formatList(name: string, pieces: WireSpringOutingPiece[]): string {
  if (pieces.length === 0) return name + "=空";
  let allNum = true;
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].kind !== "num") allNum = false;
  }
  if (allNum) {
    const n = Math.min(pieces.length, 8);
    const head: string[] = [];
    for (let i = 0; i < n; i++) head.push(String((pieces[i] as WireSpringOutingNum).value));
    if (pieces.length > n) return name + "=" + head.join(",") + "…+" + (pieces.length - n);
    return name + "=" + head.join(",");
  }
  const n = Math.min(pieces.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatPiece(pieces[i]));
  if (pieces.length > n) return name + "=" + head.join(";") + "…+" + (pieces.length - n);
  return name + "=" + head.join(";");
}

function formatPiece(piece: WireSpringOutingPiece): string {
  if (piece.kind === "num") return String(piece.value);
  if (piece.marks.length === 0) return "空";
  return marksText(piece.marks);
}

function pushMark(marks: WireSpringOutingMark[], row: RawField): void {
  const mark = markOf(row);
  if (mark) marks.push(mark);
}

function joinMarks(line: string, marks: WireSpringOutingMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireSpringOutingMark[]): string {
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

function markOf(row: RawField): WireSpringOutingMark | null {
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

function readPackedNumbers(body: Uint8Array): number[] | null {
  if (body.length === 0) return [];
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
