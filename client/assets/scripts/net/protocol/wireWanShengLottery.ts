/**
 * 真服万圣抽奖只读。c2s / s2c 都是 75901。活动 WAN_SHENG_LOTTERY / promo078。
 * c2s 是 GReqHalloweenLotteryGetDataInfo，空体，没有 page，没有 FIELD。整帧 04 00 00 00 7d 28 01 00，即 040000007d280100。
 * 75901 = 0x1287D，小端是 7d 28 01 00。空体一次。
 * 这是万圣抽奖活动数据，不是已合的秋赏明月 75801（空帧 0400000019280100），也不是赏月佳肴 75131（空帧 040000007b250100）。
 * 服侧轻懒建（getPromotionInfo）可接受。轮次清 select/次数/记录可接受。非开启回默认可接受。无扣费，无领奖，无抽奖。
 * 不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。不是星盘 68001。不是灵器 70001。
 * 75801 已合。本刀不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 75801 分开发，勿合并成一个请求。不并入 75801。
 *
 * 由 WireSession.pullIdle 在空 c2s 75801 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 75902 选档。75902 本刀不编码、不发送。
 * 不发 75903 抽奖。75903 本刀不编码、不发送。
 * 不发 75904 领次数奖。75904 本刀不编码、不发送。
 * 不夹发 75931、75932 万圣礼包。75931、75932 本刀不编码、不发送。
 * 不夹发 75941、75942、75943、75944 万圣任务。75941–75944 本刀不编码、不发送。
 * 76001 黑五活动另帧，挂在其后，勿合并。不并入本帧。不发 76002。不发 76003。不发 76004。不发 76005。
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
 * s2c 75901 是 GResHalloweenLotteryGetDataInfo。仓库里没有这份 proto。
 * select_info、lottery_reward、lottery_count、lottery_best_remaining_count、last_lottery_id 按声明顺序从 1 编号。
 * select_info 是字段 1。lottery_reward 是字段 2。lottery_count 是字段 3。lottery_best_remaining_count 是字段 4。last_lottery_id 是字段 5。
 * select_info、lottery_reward 是 repeated。能解成消息时按内层字段号写，不发明行名字。解不成消息时按打包的数写。
 * lottery_count、lottery_best_remaining_count、last_lottery_id 按标量写。长度包按字段号写，不当成 0。
 * 出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 * 没有的数不写成 0。
 *
 * 空包体是已同步。字段缺省，页上写「已同步空表」，不写成 0。
 * 包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.wanShengLottery。 */
export const WIRE_WAN_SHENG_LOTTERY_CMD = "wire.75901";

export const WIRE_WAN_SHENG_LOTTERY_FRAME = "040000007d280100";
export const WIRE_WAN_SHENG_LOTTERY_EMPTY = "已同步空表";
export const WIRE_WAN_SHENG_LOTTERY_READONLY_TITLE = "万圣抽奖（真服只读）";
export const WIRE_WAN_SHENG_LOTTERY_UNSYNCED_TOAST = "真服未同步";
export const WIRE_WAN_SHENG_LOTTERY_READONLY_NOTE =
  "只读展示万圣抽奖里实际出现的 select_info、lottery_reward、lottery_count、lottery_best_remaining_count、last_lottery_id。按声明顺序是字段 1–5。select_info、lottery_reward 按内层字段号写，不发明行名字。缺字段不写成 0，也不补一项。出现的值如实展示。无选档、无抽奖、无领次数奖入口。不发 75902。不发 75903。不发 75904。不夹发 75931、75932。不夹发 75941、75942、75943、75944。76001 黑五活动另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是秋赏明月 75801。5001、51001、68001、70001 已有，勿重复。75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75801 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_WAN_SHENG_LOTTERY_SIDE_EFFECT =
  "轻懒建（getPromotionInfo）可接受。轮次清 select/次数/记录可接受。非开启回默认可接受。无扣费，无领奖，无抽奖。空 c2s 一次，无 page，无 FIELD，挂在 75801 之后。只发 cmd=75901，空帧 040000007d280100。不并入 75801。与 75801 分开发。不发 75902。75902 是选档，不编码、不发送。不发 75903。75903 是抽奖，不编码、不发送。不发 75904。75904 是领次数奖，不编码、不发送。不夹发 75931、75932 万圣礼包。不夹发 75941、75942、75943、75944 万圣任务。76001 黑五活动另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。本刀不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_WAN_SHENG_LOTTERY_FIELD_NOTE =
  "select_info、lottery_reward、lottery_count、lottery_best_remaining_count、last_lottery_id。按声明顺序是字段 1、2、3、4、5。select_info、lottery_reward 不发明内层名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。75801 / 75131 / 75121 / 75101 / 76542 / 74120 / 74001 / 69001 / 63001 / 62001 / 61001 / 26001 / 26002 / 5001 / 51001 / 68001 / 70001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。75902 是选档。75903 是抽奖。75904 是领次数奖。75931、75932 是万圣礼包。75941–75944 是万圣任务。76001 黑五活动另帧编码空体，不在这张未编码表里。75001、76501、73002、71001 本轮不做。74121、74122 不夹发。 */
export const WIRE_WAN_SHENG_LOTTERY_BANNED_CMDS = [
  "wire.75902",
  "wire.75903",
  "wire.75904",
  "wire.75931",
  "wire.75932",
  "wire.75941",
  "wire.75942",
  "wire.75943",
  "wire.75944",
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

export interface WireWanShengLotteryMark {
  field: number;
  text: string;
}

export interface WireWanShengLotteryNum {
  kind: "num";
  value: number;
}

export interface WireWanShengLotteryRow {
  kind: "row";
  /** 长度包里实际出现的内层号。不发明名字。 */
  marks: WireWanShengLotteryMark[];
}

export type WireWanShengLotteryPiece = WireWanShengLotteryNum | WireWanShengLotteryRow;

export interface WireWanShengLotterySnapshot {
  /** GResHalloweenLotteryGetDataInfo.select_info。没有时是 null，不写成 0。 */
  selectInfo: WireWanShengLotteryPiece[] | null;
  /** GResHalloweenLotteryGetDataInfo.lottery_reward。没有时是 null，不写成 0。 */
  lotteryReward: WireWanShengLotteryPiece[] | null;
  /** GResHalloweenLotteryGetDataInfo.lottery_count。没有时是 null，不写成 0。 */
  lotteryCount: number | null;
  /** GResHalloweenLotteryGetDataInfo.lottery_best_remaining_count。没有时是 null，不写成 0。 */
  lotteryBestRemainingCount: number | null;
  /** GResHalloweenLotteryGetDataInfo.last_lottery_id。没有时是 null，不写成 0。 */
  lastLotteryId: number | null;
  /** 对不上这五个号的字段，或标量上对不上的值。 */
  marks: WireWanShengLotteryMark[];
}

/**
 * 解 s2c 75901。空包体返回已同步的缺省字段。
 * 超长、坏 varint、列表包解不开时返回 null。
 */
export function decodeWireWanShengLottery(body: Uint8Array | null | undefined): WireWanShengLotterySnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  return decodeFields(fields);
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireWanShengLotteryLine(snap: WireWanShengLotterySnapshot): string {
  const parts: string[] = [];
  if (snap.selectInfo !== null) parts.push(formatList("select_info", snap.selectInfo));
  if (snap.lotteryReward !== null) parts.push(formatList("lottery_reward", snap.lotteryReward));
  if (snap.lotteryCount !== null) parts.push("lottery_count=" + String(snap.lotteryCount));
  if (snap.lotteryBestRemainingCount !== null) parts.push("lottery_best_remaining_count=" + String(snap.lotteryBestRemainingCount));
  if (snap.lastLotteryId !== null) parts.push("last_lottery_id=" + String(snap.lastLotteryId));
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_WAN_SHENG_LOTTERY_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireWanShengLotteryNote(snap: WireWanShengLotterySnapshot): string {
  return formatWireWanShengLotteryLine(snap) + "。" + WIRE_WAN_SHENG_LOTTERY_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireWanShengLotterySnapshot {
  return {
    selectInfo: null,
    lotteryReward: null,
    lotteryCount: null,
    lotteryBestRemainingCount: null,
    lastLotteryId: null,
    marks: [],
  };
}

function decodeFields(fields: RawField[]): WireWanShengLotterySnapshot | null {
  const marks: WireWanShengLotteryMark[] = [];
  let selectInfo: WireWanShengLotteryPiece[] | null = null;
  let lotteryReward: WireWanShengLotteryPiece[] | null = null;
  let lotteryCount: number | null = null;
  let lotteryBestRemainingCount: number | null = null;
  let lastLotteryId: number | null = null;
  let sawCount = false;
  let sawBest = false;
  let sawLast = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 || row.field === 2) {
      const pieces = piecesOf(row);
      if (pieces === "bad") return null;
      if (pieces === "mark") {
        pushMark(marks, row);
        continue;
      }
      if (row.field === 1) selectInfo = append(selectInfo, pieces);
      else lotteryReward = append(lotteryReward, pieces);
      continue;
    }
    if (row.field === 3 && row.kind === "varint" && !sawCount) {
      sawCount = true;
      lotteryCount = accepted(row.varint);
      if (lotteryCount === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 4 && row.kind === "varint" && !sawBest) {
      sawBest = true;
      lotteryBestRemainingCount = accepted(row.varint);
      if (lotteryBestRemainingCount === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 5 && row.kind === "varint" && !sawLast) {
      sawLast = true;
      lastLotteryId = accepted(row.varint);
      if (lastLotteryId === null) pushMark(marks, row);
      continue;
    }
    pushMark(marks, row);
  }
  return { selectInfo, lotteryReward, lotteryCount, lotteryBestRemainingCount, lastLotteryId, marks };
}

function append(list: WireWanShengLotteryPiece[] | null, pieces: WireWanShengLotteryPiece[]): WireWanShengLotteryPiece[] {
  if (!list) return pieces.slice();
  for (let i = 0; i < pieces.length; i++) list.push(pieces[i]);
  return list;
}

function piecesOf(row: RawField): WireWanShengLotteryPiece[] | "bad" | "mark" {
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

function decodeListBytes(body: Uint8Array): WireWanShengLotteryPiece[] | null {
  const fields = readRawFields(body);
  if (fields) return [rowOf(fields)];
  const packed = readPackedNumbers(body);
  if (!packed) return null;
  return numsOf(packed);
}

function rowOf(fields: RawField[]): WireWanShengLotteryRow {
  const marks: WireWanShengLotteryMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const mark = markOf(fields[i]);
    if (mark) marks.push(mark);
  }
  return { kind: "row", marks };
}

function numsOf(values: number[]): WireWanShengLotteryNum[] {
  const rows: WireWanShengLotteryNum[] = [];
  for (let i = 0; i < values.length; i++) rows.push({ kind: "num", value: values[i] });
  return rows;
}

function formatList(name: string, pieces: WireWanShengLotteryPiece[]): string {
  if (pieces.length === 0) return name + "=空";
  let allNum = true;
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].kind !== "num") allNum = false;
  }
  if (allNum) {
    const n = Math.min(pieces.length, 8);
    const head: string[] = [];
    for (let i = 0; i < n; i++) head.push(String((pieces[i] as WireWanShengLotteryNum).value));
    if (pieces.length > n) return name + "=" + head.join(",") + "…+" + (pieces.length - n);
    return name + "=" + head.join(",");
  }
  const n = Math.min(pieces.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatPiece(pieces[i]));
  if (pieces.length > n) return name + "=" + head.join(";") + "…+" + (pieces.length - n);
  return name + "=" + head.join(";");
}

function formatPiece(piece: WireWanShengLotteryPiece): string {
  if (piece.kind === "num") return String(piece.value);
  if (piece.marks.length === 0) return "空";
  return marksText(piece.marks);
}

function pushMark(marks: WireWanShengLotteryMark[], row: RawField): void {
  const mark = markOf(row);
  if (mark) marks.push(mark);
}

function joinMarks(line: string, marks: WireWanShengLotteryMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireWanShengLotteryMark[]): string {
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

function markOf(row: RawField): WireWanShengLotteryMark | null {
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
