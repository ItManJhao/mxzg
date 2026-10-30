/**
 * 真服诸神祭坛只读。c2s / s2c 都是 75121。
 * c2s 是 GReqZSJTInfo，空体，没有 page，没有 FIELD。整帧 04 00 00 00 71 25 01 00，即 0400000071250100。
 * 75121 = 0x12571，小端是 71 25 01 00。空体一次。
 * 这是诸神祭坛信息，不是已合的七神器 75101（空帧 040000005d250100），也不是斩魔之路 76542（空帧 04000000fe2a0100）。
 * 服侧轻懒建（getPromotionInfo）可接受。轮次重置可接受。轻日刷（getMoneyDrawNum 隔日清零钻石抽次数并 update）可接受。无扣费，无领奖，无养成写。
 * 不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。不是签到列表 13010。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。不是星盘 68001。不是灵器 70001。
 * 75101 已合。本刀不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 75101 分开发，勿合并成一个请求。不并入 75101。
 *
 * 由 WireSession.pullIdle 在空 c2s 75101 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 75122 抽奖。75122 是 GReqZSJTLuckDraw.type，本刀不编码、不发送。
 * 75131 赏月佳肴另帧，挂在其后，勿合并。不并入本帧。
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
 * s2c 75121 是 GResZSJTInfo。仓库里没有这份 proto。
 * info 按声明顺序是字段 1，长度包。info.floor 是内层字段 1，varint。
 * moneyDrawNum 按声明顺序是外层字段 2，varint。
 * 外层字段 1 若是 varint，不当成 floor，按字段号写。
 * 没有这个字段时保持缺省，不写成 0，页上也不补这一项。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。内层对不上的号写成 info.字段N。
 *
 * 空包体是已同步。floor 与 moneyDrawNum 缺省，页上写「已同步空表」，不写成 0。
 * 包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.zhuShenJiTan。 */
export const WIRE_ZHU_SHEN_JI_TAN_CMD = "wire.75121";

export const WIRE_ZHU_SHEN_JI_TAN_FRAME = "0400000071250100";
export const WIRE_ZHU_SHEN_JI_TAN_EMPTY = "已同步空表";
export const WIRE_ZHU_SHEN_JI_TAN_READONLY_TITLE = "诸神祭坛（真服只读）";
export const WIRE_ZHU_SHEN_JI_TAN_UNSYNCED_TOAST = "真服未同步";
export const WIRE_ZHU_SHEN_JI_TAN_READONLY_NOTE =
  "只读展示诸神祭坛里实际出现的 info.floor 与 moneyDrawNum。缺字段不写成 0，也不补一项。出现的值如实展示。无抽奖入口。不发 75122。75122 是 GReqZSJTLuckDraw.type，不编码、不发送。75131 赏月佳肴另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是七神器 75101。5001、51001、68001、70001 已有，勿重复。75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75101 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_ZHU_SHEN_JI_TAN_SIDE_EFFECT =
  "轻懒建（getPromotionInfo）可接受。轮次重置可接受。轻日刷（getMoneyDrawNum 隔日清零钻石抽次数并 update）可接受。无扣费，无领奖，无养成写。空 c2s 一次，无 page，挂在 75101 之后。只发 cmd=75121，空帧 0400000071250100。不并入 75101。与 75101 分开发。不发 75122。75122 是抽奖，不编码、不发送。75131 赏月佳肴另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。本刀不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_ZHU_SHEN_JI_TAN_FIELD_NOTE =
  "info.floor。info 按声明顺序是字段 1，floor 是内层字段 1。moneyDrawNum 是外层字段 2。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。75101 / 76542 / 74120 / 74001 / 69001 / 63001 / 62001 / 61001 / 26001 / 26002 / 5001 / 51001 / 68001 / 70001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。75122 是抽奖，不编码。75131 赏月佳肴另帧编码空体，不在这张未编码表里。74121、74122 不夹发。 */
export const WIRE_ZHU_SHEN_JI_TAN_BANNED_CMDS = [
  "wire.75122",
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

export interface WireZhuShenJiTanMark {
  field: number;
  text: string;
  /** 内层 info 上对不上的号。页上写成 info.字段N。 */
  nested?: boolean;
}

export interface WireZhuShenJiTanSnapshot {
  /** info.floor。字段没出现时是 null，不写成 0。出现的 0 仍是 0。出现的 -1 仍是 -1。 */
  floor: number | null;
  /** moneyDrawNum。字段没出现时是 null，不写成 0。出现的 0 仍是 0。出现的 -1 仍是 -1。 */
  moneyDrawNum: number | null;
  /** 对不上 info.floor / moneyDrawNum 的号。内层号带 nested。 */
  marks: WireZhuShenJiTanMark[];
}

/**
 * 解 s2c 75121。空包体返回已同步的缺省字段。
 * 超长、坏 varint、info 包解不开时返回 null。
 */
export function decodeWireZhuShenJiTan(body: Uint8Array | null | undefined): WireZhuShenJiTanSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireZhuShenJiTanMark[] = [];
  let floor: number | null = null;
  let moneyDrawNum: number | null = null;
  let sawInfo = false;
  let sawMoney = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      if (!sawInfo) {
        sawInfo = true;
        const parsed = decodeInfo(row.bytes);
        if (!parsed) return null;
        floor = parsed.floor;
        for (let j = 0; j < parsed.marks.length; j++) marks.push(parsed.marks[j]);
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint" && !sawMoney) {
      sawMoney = true;
      moneyDrawNum = accepted(row.varint);
      if (moneyDrawNum === null) {
        const mark = markOf(row, false);
        if (mark) marks.push(mark);
      }
      continue;
    }
    const mark = markOf(row, false);
    if (mark) marks.push(mark);
  }
  return { floor, moneyDrawNum, marks };
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireZhuShenJiTanLine(snap: WireZhuShenJiTanSnapshot): string {
  const parts: string[] = [];
  if (snap.floor !== null) parts.push("info.floor=" + String(snap.floor));
  if (snap.moneyDrawNum !== null) parts.push("moneyDrawNum=" + String(snap.moneyDrawNum));
  const marks = marksText(snap.marks);
  if (parts.length === 0 && !marks) return WIRE_ZHU_SHEN_JI_TAN_EMPTY;
  if (parts.length === 0) return marks;
  if (!marks) return parts.join(" / ");
  return parts.join(" / ") + " / " + marks;
}

export function wireZhuShenJiTanNote(snap: WireZhuShenJiTanSnapshot): string {
  return formatWireZhuShenJiTanLine(snap) + "。" + WIRE_ZHU_SHEN_JI_TAN_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireZhuShenJiTanSnapshot {
  return { floor: null, moneyDrawNum: null, marks: [] };
}

function marksText(marks: WireZhuShenJiTanMark[]): string {
  const parts: string[] = [];
  for (let i = 0; i < marks.length; i++) {
    const prefix = marks[i].nested ? "info.字段" : "字段";
    parts.push(prefix + marks[i].field + "=" + marks[i].text);
  }
  return parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeInfo(body: Uint8Array): { floor: number | null; marks: WireZhuShenJiTanMark[] } | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireZhuShenJiTanMark[] = [];
  let floor: number | null = null;
  let sawFloor = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && !sawFloor) {
      sawFloor = true;
      floor = accepted(row.varint);
      if (floor === null) {
        const mark = markOf(row, true);
        if (mark) marks.push(mark);
      }
      continue;
    }
    const mark = markOf(row, true);
    if (mark) marks.push(mark);
  }
  return { floor, marks };
}

function markOf(row: RawField, nested: boolean): WireZhuShenJiTanMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1", nested };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)), nested };
  }
  if (row.kind === "bytes" && row.bytes) {
    const text = utf8Printable(row.bytes);
    if (text !== null) return { field: row.field, text, nested };
    return { field: row.field, text: "未解", nested };
  }
  return { field: row.field, text: "未解", nested };
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
