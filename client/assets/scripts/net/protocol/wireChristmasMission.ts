/**
 * 真服圣诞连线只读。c2s / s2c 都是 76081。活动 CHRISTMAS_MISSION / promo085。
 * c2s 是 GReqChristmasMissionGetDataInfo，空体，没有 page，没有 FIELD。整帧 04 00 00 00 31 29 01 00，即 0400000031290100。
 * 76081 = 0x12931，小端是 31 29 01 00。空体一次。
 * 这是圣诞连线数据，不是已合的出游寻春 76301（空帧 040000000d2a0100），也不是约惠圣诞礼包 76101（空帧 0400000045290100）。
 * 服侧轻懒建可接受。轻日刷可接受（跨日清 mission/box）。未开活动回默认空包可接受。无扣费，无领奖，无养成写。
 * 不是出游寻春 76301。不是约惠圣诞 76101。不是黑五活动 76001。不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。不是星盘 68001。不是灵器 70001。
 * 76301 已合。本刀不重复拉 76301，也不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 76301 分开发，勿合并成一个请求。不并入 76301。
 *
 * 由 WireSession.pullIdle 在空 c2s 76301 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 76082 领任务奖。76082 本刀不编码、不发送。
 * 不发 76083 进度推送。76083 是 s2c，本刀不编码、不发送。
 * 不发 76084 领任务箱。76084 本刀不编码、不发送。
 * 旁支勿夹 76121、76122、76141、76142、76143、76161、76162、76163。这些不编码、不发送。
 * 76520 关卡榜另帧编码空体，挂在其后，勿合并。不并入本帧。
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
 * s2c 76081 是 GResChristmasMissionGetDataInfo。仓库里没有这份 proto。
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

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.christmasMission。 */
export const WIRE_CHRISTMAS_MISSION_CMD = "wire.76081";

export const WIRE_CHRISTMAS_MISSION_FRAME = "0400000031290100";
export const WIRE_CHRISTMAS_MISSION_EMPTY = "已同步空表";
export const WIRE_CHRISTMAS_MISSION_READONLY_TITLE = "圣诞连线（真服只读）";
export const WIRE_CHRISTMAS_MISSION_UNSYNCED_TOAST = "真服未同步";
export const WIRE_CHRISTMAS_MISSION_READONLY_NOTE =
  "只读展示圣诞连线里实际出现的 mission、mission_box_reward_record、open_day。按声明顺序是字段 1–3。mission、mission_box_reward_record 按内层字段号写，不发明行名字。缺字段不写成 0，也不补一项。出现的值如实展示。无领任务奖、无进度写、无领任务箱入口。不发 76082。不发 76083。不发 76084。旁支勿夹 76121、76122、76141、76143、76161、76163。76520 关卡榜另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是出游寻春 76301。不是约惠圣诞 76101。5001、51001、68001、70001 已有，勿重复。76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76301 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_CHRISTMAS_MISSION_SIDE_EFFECT =
  "轻懒建可接受。轻日刷可接受。跨日清 mission/box 可接受。未开活动回默认空包可接受。无扣费，无领奖，无养成写。空 c2s 一次，无 page，无 FIELD，挂在 76301 之后。只发 cmd=76081，空帧 0400000031290100。不并入 76301。与 76301 分开发。不发 76082。76082 是领任务奖，不编码、不发送。不发 76083。76083 是进度推送，不编码、不发送。不发 76084。76084 是领任务箱，不编码、不发送。旁支勿夹 76121、76122、76141、76143、76161、76163。76520 关卡榜另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是出游寻春 76301。不是约惠圣诞 76101。不是黑五活动 76001。不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。本刀不重复拉 76301，也不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_CHRISTMAS_MISSION_FIELD_NOTE =
  "mission、mission_box_reward_record、open_day。按声明顺序是字段 1、2、3。mission、mission_box_reward_record 不发明内层名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。76301 / 76101 / 76001 / 75901 / 75801 / 75131 / 75121 / 75101 / 76542 / 74120 / 74001 / 69001 / 63001 / 62001 / 61001 / 26001 / 26002 / 5001 / 51001 / 68001 / 70001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。76082 是领任务奖。76083 是进度推送。76084 是领任务箱。76121、76122、76141、76142、76143、76161、76162、76163 是旁支。76520 关卡榜另帧编码空体，不在这张未编码表里。75001、76501、73002、71001 本轮不做。74121、74122 不夹发。 */
export const WIRE_CHRISTMAS_MISSION_BANNED_CMDS = [
  "wire.76082",
  "wire.76083",
  "wire.76084",
  "wire.76121",
  "wire.76122",
  "wire.76141",
  "wire.76142",
  "wire.76143",
  "wire.76161",
  "wire.76162",
  "wire.76163",
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

export interface WireChristmasMissionMark {
  field: number;
  text: string;
}

export interface WireChristmasMissionNum {
  kind: "num";
  value: number;
}

export interface WireChristmasMissionRow {
  kind: "row";
  /** 长度包里实际出现的内层号。不发明名字。 */
  marks: WireChristmasMissionMark[];
}

export type WireChristmasMissionPiece = WireChristmasMissionNum | WireChristmasMissionRow;

export interface WireChristmasMissionSnapshot {
  /** GResChristmasMissionGetDataInfo.mission。没有时是 null，不写成 0。 */
  mission: WireChristmasMissionPiece[] | null;
  /** GResChristmasMissionGetDataInfo.mission_box_reward_record。没有时是 null，不写成 0。 */
  missionBoxRewardRecord: WireChristmasMissionPiece[] | null;
  /** GResChristmasMissionGetDataInfo.open_day。没有时是 null，不写成 0。 */
  openDay: number | null;
  /** 对不上这三个号的字段，或标量上对不上的值。 */
  marks: WireChristmasMissionMark[];
}

/**
 * 解 s2c 76081。空包体返回已同步的缺省字段。
 * 超长、坏 varint、列表包解不开时返回 null。
 */
export function decodeWireChristmasMission(body: Uint8Array | null | undefined): WireChristmasMissionSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  return decodeFields(fields);
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireChristmasMissionLine(snap: WireChristmasMissionSnapshot): string {
  const parts: string[] = [];
  if (snap.mission !== null) parts.push(formatList("mission", snap.mission));
  if (snap.missionBoxRewardRecord !== null) parts.push(formatList("mission_box_reward_record", snap.missionBoxRewardRecord));
  if (snap.openDay !== null) parts.push("open_day=" + String(snap.openDay));
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_CHRISTMAS_MISSION_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireChristmasMissionNote(snap: WireChristmasMissionSnapshot): string {
  return formatWireChristmasMissionLine(snap) + "。" + WIRE_CHRISTMAS_MISSION_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireChristmasMissionSnapshot {
  return {
    mission: null,
    missionBoxRewardRecord: null,
    openDay: null,
    marks: [],
  };
}

function decodeFields(fields: RawField[]): WireChristmasMissionSnapshot | null {
  const marks: WireChristmasMissionMark[] = [];
  let mission: WireChristmasMissionPiece[] | null = null;
  let missionBoxRewardRecord: WireChristmasMissionPiece[] | null = null;
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

function append(list: WireChristmasMissionPiece[] | null, pieces: WireChristmasMissionPiece[]): WireChristmasMissionPiece[] {
  if (!list) return pieces.slice();
  for (let i = 0; i < pieces.length; i++) list.push(pieces[i]);
  return list;
}

function piecesOf(row: RawField): WireChristmasMissionPiece[] | "bad" | "mark" {
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

function decodeListBytes(body: Uint8Array): WireChristmasMissionPiece[] | null {
  const fields = readRawFields(body);
  if (fields) return [rowOf(fields)];
  const packed = readPackedNumbers(body);
  if (!packed) return null;
  return numsOf(packed);
}

function rowOf(fields: RawField[]): WireChristmasMissionRow {
  const marks: WireChristmasMissionMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const mark = markOf(fields[i]);
    if (mark) marks.push(mark);
  }
  return { kind: "row", marks };
}

function numsOf(values: number[]): WireChristmasMissionNum[] {
  const rows: WireChristmasMissionNum[] = [];
  for (let i = 0; i < values.length; i++) rows.push({ kind: "num", value: values[i] });
  return rows;
}

function formatList(name: string, pieces: WireChristmasMissionPiece[]): string {
  if (pieces.length === 0) return name + "=空";
  let allNum = true;
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].kind !== "num") allNum = false;
  }
  if (allNum) {
    const n = Math.min(pieces.length, 8);
    const head: string[] = [];
    for (let i = 0; i < n; i++) head.push(String((pieces[i] as WireChristmasMissionNum).value));
    if (pieces.length > n) return name + "=" + head.join(",") + "…+" + (pieces.length - n);
    return name + "=" + head.join(",");
  }
  const n = Math.min(pieces.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatPiece(pieces[i]));
  if (pieces.length > n) return name + "=" + head.join(";") + "…+" + (pieces.length - n);
  return name + "=" + head.join(";");
}

function formatPiece(piece: WireChristmasMissionPiece): string {
  if (piece.kind === "num") return String(piece.value);
  if (piece.marks.length === 0) return "空";
  return marksText(piece.marks);
}

function pushMark(marks: WireChristmasMissionMark[], row: RawField): void {
  const mark = markOf(row);
  if (mark) marks.push(mark);
}

function joinMarks(line: string, marks: WireChristmasMissionMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireChristmasMissionMark[]): string {
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

function markOf(row: RawField): WireChristmasMissionMark | null {
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
