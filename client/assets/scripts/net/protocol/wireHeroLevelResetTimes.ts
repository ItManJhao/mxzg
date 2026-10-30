/**
 * 真服英雄等级重生次数只读。c2s / s2c 都是 4044。
 * c2s 是 GReqHeroLevelResetTimes，空体，没有 page。整帧 04 00 00 00 CC 0F 00 00，即 04000000cc0f0000。
 * 4044 = 0x0FCC，小端是 CC 0F 00 00。空体一次。
 * 服侧 HeroHandler.levelResetTimes @CMD _4044；CmdCode._4044；HeroSummonService.getHeroSummon。
 * 副作用是 getHeroSummon 可能轻懒建。跨日可能把 times 清零并更新。轻懒建、轻日刷可接受。
 * 无扣费，无领奖，无养成写。
 * 不是爬塔首通已领 3203。不是进行中活动 20101。不是副本队列 3101。不是阵法 3099。
 * 3203 已合。本刀不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 3203 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 3203 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 4043 英雄等级重生（扣费、清符文、降级、返还）。4043 是写号，本刀不编码、不发送。
 * 13010 签到列表另只读接在其后，勿合并。不做 20011。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 4044 是 GResHeroLevelResetTimes。times 是字段 1，int。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * 没有这个字段时保持缺省，不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。times 保持缺省，页上写「times=无」。
 * 解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.heroLevelResetTimes。 */
export const WIRE_HERO_LEVEL_RESET_TIMES_CMD = "wire.4044";

export const WIRE_HERO_LEVEL_RESET_TIMES_FRAME = "04000000cc0f0000";
export const WIRE_HERO_LEVEL_RESET_TIMES_READONLY_TITLE = "英雄等级重生次数（真服只读）";
export const WIRE_HERO_LEVEL_RESET_TIMES_UNSYNCED_TOAST = "真服未同步";
export const WIRE_HERO_LEVEL_RESET_TIMES_READONLY_NOTE =
  "只读展示英雄等级重生次数 times。缺字段保持缺省。出现的值如实展示。无重生、扣费、清符文、降级、返还入口。不发 4043。13010 签到列表另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3203 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_HERO_LEVEL_RESET_TIMES_SIDE_EFFECT =
  "HeroSummonService.getHeroSummon 可能轻懒建。跨日可能把 times 清零并更新。轻懒建、轻日刷可接受。无扣费，无领奖，无养成写。空 c2s 一次，无 page，挂在 3203 之后。只发 cmd=4044，空帧 04000000cc0f0000。不发 4043 英雄等级重生。13010 签到列表另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3203 分开发，勿合并。本刀不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_HERO_LEVEL_RESET_TIMES_FIELD_NOTE =
  "times。英雄等级重生次数。字段 1。没有的数不写成 0。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。13010 签到列表另帧编码空体。5001 / 51001 / 3203 / 20101 / 3101 / 3099 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。 */
export const WIRE_HERO_LEVEL_RESET_TIMES_BANNED_CMDS = [
  "wire.4043",
  "wire.20011",
  "wire.4601",
  "wire.29001",
] as const;

export interface WireHeroLevelResetTimesMark {
  field: number;
  text: string;
}

export interface WireHeroLevelResetTimesSnapshot {
  /** GResHeroLevelResetTimes.times。没有这个字段时是 null，不写成 0。 */
  times: number | null;
  /** 对不上字段 1 的外层号。 */
  marks: WireHeroLevelResetTimesMark[];
}

/**
 * 解 s2c 4044。空包体返回已同步的缺省 times。
 * 超长、坏 varint 时返回 null。
 */
export function decodeWireHeroLevelResetTimes(
  body: Uint8Array | null | undefined
): WireHeroLevelResetTimesSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireHeroLevelResetTimesMark[] = [];
  let times: number | null = null;
  let sawTimes = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      if (!sawTimes) {
        sawTimes = true;
        times = accepted(row.varint);
        if (times === null) {
          const mark = markOf(row);
          if (mark) marks.push(mark);
        }
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { times, marks };
}

/** 页上写 times。没有时写「无」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireHeroLevelResetTimesLine(snap: WireHeroLevelResetTimesSnapshot): string {
  return joinMarks("times=" + numText(snap.times), snap.marks);
}

export function wireHeroLevelResetTimesNote(snap: WireHeroLevelResetTimesSnapshot): string {
  return formatWireHeroLevelResetTimesLine(snap) + "。" + WIRE_HERO_LEVEL_RESET_TIMES_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireHeroLevelResetTimesSnapshot {
  return { times: null, marks: [] };
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireHeroLevelResetTimesMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireHeroLevelResetTimesMark[]): string {
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

function markOf(row: RawField): WireHeroLevelResetTimesMark | null {
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
