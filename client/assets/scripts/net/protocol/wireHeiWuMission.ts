/**
 * 真服黑五活动只读。c2s / s2c 都是 76001。活动 HEI_WU_MISSION / promo081。
 * c2s 是 GReqBlackFiveMissionGetDataInfo，空体，没有 page，没有 FIELD。整帧 04 00 00 00 e1 28 01 00，即 04000000e1280100。
 * 76001 = 0x128E1，小端是 e1 28 01 00。空体一次。
 * 这是黑五活动数据，不是已合的万圣抽奖 75901（空帧 040000007d280100），也不是秋赏明月 75801（空帧 0400000019280100）。
 * 服侧轻懒建可接受。轮次清 mission/box/buy/count 可接受。非开启回默认可接受。无扣费，无领奖，无养成写。
 * 不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。不是星盘 68001。不是灵器 70001。
 * 75901 已合。本刀不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 75901 分开发，勿合并成一个请求。不并入 75901。
 *
 * 由 WireSession.pullIdle 在空 c2s 75901 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 76002 领任务奖。76002 本刀不编码、不发送。
 * 不发 76003 进度推。76003 本刀不编码、不发送。
 * 不发 76004 领任务箱。76004 本刀不编码、不发送。
 * 不发 76005 购礼包推。76005 本刀不编码、不发送。
 * 不夹发 76021、76022。76021、76022 本刀不编码、不发送。
 * 76101 约惠圣诞另帧，挂在其后，勿合并。不并入本帧。不发 76102。
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
 * s2c 76001 是 GResBlackFiveMissionGetDataInfo。仓库里没有这份 proto。
 * mission、mission_box_reward_record、mission_reward_count、buy 按声明顺序从 1 编号。
 * mission 是字段 1。mission_box_reward_record 是字段 2。mission_reward_count 是字段 3。buy 是字段 4。
 * mission、mission_box_reward_record、buy 是 repeated。能解成消息时按内层字段号写，不发明行名字。解不成消息时按打包的数写。
 * mission_reward_count 按标量写。长度包按字段号写，不当成 0。
 * 出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 * 没有的数不写成 0。
 *
 * 空包体是已同步。字段缺省，页上写「已同步空表」，不写成 0。
 * 包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.heiWuMission。 */
export const WIRE_HEI_WU_MISSION_CMD = "wire.76001";

export const WIRE_HEI_WU_MISSION_FRAME = "04000000e1280100";
export const WIRE_HEI_WU_MISSION_EMPTY = "已同步空表";
export const WIRE_HEI_WU_MISSION_READONLY_TITLE = "黑五（真服只读）";
export const WIRE_HEI_WU_MISSION_UNSYNCED_TOAST = "真服未同步";
export const WIRE_HEI_WU_MISSION_READONLY_NOTE =
  "只读展示黑五活动里实际出现的 mission、mission_box_reward_record、mission_reward_count、buy。按声明顺序是字段 1–4。mission、mission_box_reward_record、buy 按内层字段号写，不发明行名字。缺字段不写成 0，也不补一项。出现的值如实展示。无领任务奖、无进度写、无领任务箱、无购礼包入口。不发 76002。不发 76003。不发 76004。不发 76005。不夹发 76021、76022。76101 约惠圣诞另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是万圣抽奖 75901。5001、51001、68001、70001 已有，勿重复。75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75901 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_HEI_WU_MISSION_SIDE_EFFECT =
  "轻懒建可接受。轮次清 mission/box/buy/count 可接受。非开启回默认可接受。无扣费，无领奖，无养成写。空 c2s 一次，无 page，无 FIELD，挂在 75901 之后。只发 cmd=76001，空帧 04000000e1280100。不并入 75901。与 75901 分开发。不发 76002。76002 是领任务奖，不编码、不发送。不发 76003。76003 是进度推，不编码、不发送。不发 76004。76004 是领任务箱，不编码、不发送。不发 76005。76005 是购礼包推，不编码、不发送。不夹发 76021、76022。76101 约惠圣诞另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。本刀不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_HEI_WU_MISSION_FIELD_NOTE =
  "mission、mission_box_reward_record、mission_reward_count、buy。按声明顺序是字段 1、2、3、4。mission、mission_box_reward_record、buy 不发明内层名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。75901 / 75801 / 75131 / 75121 / 75101 / 76542 / 74120 / 74001 / 69001 / 63001 / 62001 / 61001 / 26001 / 26002 / 5001 / 51001 / 68001 / 70001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。76002 是领任务奖。76003 是进度推。76004 是领任务箱。76005 是购礼包推。76021、76022 不夹发。76101 约惠圣诞另帧编码空体，不在这张未编码表里。75001、76501、73002、71001 本轮不做。74121、74122 不夹发。 */
export const WIRE_HEI_WU_MISSION_BANNED_CMDS = [
  "wire.76002",
  "wire.76003",
  "wire.76004",
  "wire.76005",
  "wire.76021",
  "wire.76022",
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

export interface WireHeiWuMissionMark {
  field: number;
  text: string;
}

export interface WireHeiWuMissionNum {
  kind: "num";
  value: number;
}

export interface WireHeiWuMissionRow {
  kind: "row";
  /** 长度包里实际出现的内层号。不发明名字。 */
  marks: WireHeiWuMissionMark[];
}

export type WireHeiWuMissionPiece = WireHeiWuMissionNum | WireHeiWuMissionRow;

export interface WireHeiWuMissionSnapshot {
  /** GResBlackFiveMissionGetDataInfo.mission。没有时是 null，不写成 0。 */
  mission: WireHeiWuMissionPiece[] | null;
  /** GResBlackFiveMissionGetDataInfo.mission_box_reward_record。没有时是 null，不写成 0。 */
  missionBoxRewardRecord: WireHeiWuMissionPiece[] | null;
  /** GResBlackFiveMissionGetDataInfo.mission_reward_count。没有时是 null，不写成 0。 */
  missionRewardCount: number | null;
  /** GResBlackFiveMissionGetDataInfo.buy。没有时是 null，不写成 0。 */
  buy: WireHeiWuMissionPiece[] | null;
  /** 对不上这四个号的字段，或标量上对不上的值。 */
  marks: WireHeiWuMissionMark[];
}

/**
 * 解 s2c 76001。空包体返回已同步的缺省字段。
 * 超长、坏 varint、列表包解不开时返回 null。
 */
export function decodeWireHeiWuMission(body: Uint8Array | null | undefined): WireHeiWuMissionSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  return decodeFields(fields);
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireHeiWuMissionLine(snap: WireHeiWuMissionSnapshot): string {
  const parts: string[] = [];
  if (snap.mission !== null) parts.push(formatList("mission", snap.mission));
  if (snap.missionBoxRewardRecord !== null) parts.push(formatList("mission_box_reward_record", snap.missionBoxRewardRecord));
  if (snap.missionRewardCount !== null) parts.push("mission_reward_count=" + String(snap.missionRewardCount));
  if (snap.buy !== null) parts.push(formatList("buy", snap.buy));
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_HEI_WU_MISSION_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireHeiWuMissionNote(snap: WireHeiWuMissionSnapshot): string {
  return formatWireHeiWuMissionLine(snap) + "。" + WIRE_HEI_WU_MISSION_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireHeiWuMissionSnapshot {
  return {
    mission: null,
    missionBoxRewardRecord: null,
    missionRewardCount: null,
    buy: null,
    marks: [],
  };
}

function decodeFields(fields: RawField[]): WireHeiWuMissionSnapshot | null {
  const marks: WireHeiWuMissionMark[] = [];
  let mission: WireHeiWuMissionPiece[] | null = null;
  let missionBoxRewardRecord: WireHeiWuMissionPiece[] | null = null;
  let missionRewardCount: number | null = null;
  let buy: WireHeiWuMissionPiece[] | null = null;
  let sawCount = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 || row.field === 2 || row.field === 4) {
      const pieces = piecesOf(row);
      if (pieces === "bad") return null;
      if (pieces === "mark") {
        pushMark(marks, row);
        continue;
      }
      if (row.field === 1) mission = append(mission, pieces);
      else if (row.field === 2) missionBoxRewardRecord = append(missionBoxRewardRecord, pieces);
      else buy = append(buy, pieces);
      continue;
    }
    if (row.field === 3 && row.kind === "varint" && !sawCount) {
      sawCount = true;
      missionRewardCount = accepted(row.varint);
      if (missionRewardCount === null) pushMark(marks, row);
      continue;
    }
    pushMark(marks, row);
  }
  return { mission, missionBoxRewardRecord, missionRewardCount, buy, marks };
}

function append(list: WireHeiWuMissionPiece[] | null, pieces: WireHeiWuMissionPiece[]): WireHeiWuMissionPiece[] {
  if (!list) return pieces.slice();
  for (let i = 0; i < pieces.length; i++) list.push(pieces[i]);
  return list;
}

function piecesOf(row: RawField): WireHeiWuMissionPiece[] | "bad" | "mark" {
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

function decodeListBytes(body: Uint8Array): WireHeiWuMissionPiece[] | null {
  const fields = readRawFields(body);
  if (fields) return [rowOf(fields)];
  const packed = readPackedNumbers(body);
  if (!packed) return null;
  return numsOf(packed);
}

function rowOf(fields: RawField[]): WireHeiWuMissionRow {
  const marks: WireHeiWuMissionMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const mark = markOf(fields[i]);
    if (mark) marks.push(mark);
  }
  return { kind: "row", marks };
}

function numsOf(values: number[]): WireHeiWuMissionNum[] {
  const rows: WireHeiWuMissionNum[] = [];
  for (let i = 0; i < values.length; i++) rows.push({ kind: "num", value: values[i] });
  return rows;
}

function formatList(name: string, pieces: WireHeiWuMissionPiece[]): string {
  if (pieces.length === 0) return name + "=空";
  let allNum = true;
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].kind !== "num") allNum = false;
  }
  if (allNum) {
    const n = Math.min(pieces.length, 8);
    const head: string[] = [];
    for (let i = 0; i < n; i++) head.push(String((pieces[i] as WireHeiWuMissionNum).value));
    if (pieces.length > n) return name + "=" + head.join(",") + "…+" + (pieces.length - n);
    return name + "=" + head.join(",");
  }
  const n = Math.min(pieces.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatPiece(pieces[i]));
  if (pieces.length > n) return name + "=" + head.join(";") + "…+" + (pieces.length - n);
  return name + "=" + head.join(";");
}

function formatPiece(piece: WireHeiWuMissionPiece): string {
  if (piece.kind === "num") return String(piece.value);
  if (piece.marks.length === 0) return "空";
  return marksText(piece.marks);
}

function pushMark(marks: WireHeiWuMissionMark[], row: RawField): void {
  const mark = markOf(row);
  if (mark) marks.push(mark);
}

function joinMarks(line: string, marks: WireHeiWuMissionMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireHeiWuMissionMark[]): string {
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

function markOf(row: RawField): WireHeiWuMissionMark | null {
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
