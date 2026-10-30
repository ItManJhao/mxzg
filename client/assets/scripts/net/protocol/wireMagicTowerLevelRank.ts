/**
 * 真服关卡榜只读。c2s / s2c 都是 76520。
 * c2s 是 GReqMagicTowerLevelRank，空体，没有 page，没有 FIELD。整帧 04 00 00 00 e8 2a 01 00，即 04000000e82a0100。
 * 76520 = 0x12AE8，小端是 e8 2a 01 00。空体一次。
 * 这是关卡榜，不是已合的圣诞连线 76081（空帧 0400000031290100），也不是出游寻春 76301（空帧 040000000d2a0100），也不是斩魔之路 76542（空帧 04000000fe2a0100）。
 * 服侧纯读可接受。无扣费，无领奖，无养成写。
 * 不是圣诞连线 76081。不是出游寻春 76301。不是约惠圣诞 76101。不是黑五活动 76001。不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。不是星盘 68001。不是灵器 70001。
 * 76081 已合。本刀不重复拉 76081，也不重复拉 76301，也不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 76081 分开发，勿合并成一个请求。不并入 76081。
 *
 * 由 WireSession.pullIdle 在空 c2s 76081 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 76501–76506。这些本刀不编码、不发送。76501 本轮仍不做。
 * 不发 76543、76544。这些本刀不编码、不发送。
 * 76251 春日踏青另帧编码空体，挂在其后，勿合并。不并入本帧。
 * 不重复发已合的 76542。
 * 不做 75001。75001 本轮不做，不编码、不发送。
 * 不做 73002。73002 本轮不做，不编码、不发送。
 * 不做 71001。71001 本轮不做，不编码、不发送。
 * 不做 20011。
 * 不夹发 74121、74122。74121、74122 本刀不编码、不发送。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。68001 已在链上，勿重复。70001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 76520 是 GResMagicTowerLevelRank。仓库里没有这份 proto。
 * self、list 按声明顺序从 1 编号。self 是字段 1。list 是字段 2，repeated。
 * 行内 rid、server_id、name、border_id、head_id、pass_level、pass_time、rank 按声明顺序是字段 1–8。
 * name 是字符串。其余按标量写。长度包对不上行时按字段号写，不当成 0。
 * 出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 * 没有的数不写成 0。
 *
 * 空包体是已同步。字段缺省，页上写「已同步空表」，不写成 0。
 * 包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.magicTowerLevelRank。 */
export const WIRE_MAGIC_TOWER_LEVEL_RANK_CMD = "wire.76520";

export const WIRE_MAGIC_TOWER_LEVEL_RANK_FRAME = "04000000e82a0100";
export const WIRE_MAGIC_TOWER_LEVEL_RANK_EMPTY = "已同步空表";
export const WIRE_MAGIC_TOWER_LEVEL_RANK_READONLY_TITLE = "关卡榜（真服只读）";
export const WIRE_MAGIC_TOWER_LEVEL_RANK_UNSYNCED_TOAST = "真服未同步";
export const WIRE_MAGIC_TOWER_LEVEL_RANK_READONLY_NOTE =
  "只读展示关卡榜里实际出现的 self、list。self、list 按声明顺序是字段 1、2。行内 rid、server_id、name、border_id、head_id、pass_level、pass_time、rank 按声明顺序是字段 1–8。缺字段不写成 0，也不补一项。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不发 76501。不发 76502。不发 76503。不发 76504。不发 76505。不发 76506。不发 76543。不发 76544。76251 春日踏青另帧，挂在其后，勿合并。不重复拉 76542。不做 75001。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是圣诞连线 76081。不是出游寻春 76301。不是斩魔之路 76542。5001、51001、68001、70001 已有，勿重复。76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76081 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_MAGIC_TOWER_LEVEL_RANK_SIDE_EFFECT =
  "纯读可接受。无扣费，无领奖，无养成写。空 c2s 一次，无 page，无 FIELD，挂在 76081 之后。只发 cmd=76520，空帧 04000000e82a0100。不并入 76081。与 76081 分开发。不发 76501。不发 76502。不发 76503。不发 76504。不发 76505。不发 76506。不发 76543。不发 76544。76251 春日踏青另帧，挂在其后，勿合并。不重复拉 76542。不做 75001。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是圣诞连线 76081。不是出游寻春 76301。不是约惠圣诞 76101。不是斩魔之路 76542。5001、51001、68001、70001 已有，勿重复。76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。本刀不重复拉 76081，也不重复拉 76301，也不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_MAGIC_TOWER_LEVEL_RANK_FIELD_NOTE =
  "self、list。按声明顺序是字段 1、2。行内 rid、server_id、name、border_id、head_id、pass_level、pass_time、rank 按声明顺序是字段 1–8。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。76081 / 76301 / 76101 / 76001 / 75901 / 75801 / 75131 / 75121 / 75101 / 76542 / 74120 / 74001 / 69001 / 63001 / 62001 / 61001 / 26001 / 26002 / 5001 / 51001 / 68001 / 70001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。76501–76506、76543、76544 禁发。76251 春日踏青另帧编码空体，不在这张未编码表里。75001、73002、71001 本轮不做。74121、74122 不夹发。 */
export const WIRE_MAGIC_TOWER_LEVEL_RANK_BANNED_CMDS = [
  "wire.76501",
  "wire.76502",
  "wire.76503",
  "wire.76504",
  "wire.76505",
  "wire.76506",
  "wire.76543",
  "wire.76544",
  "wire.75001",
  "wire.73002",
  "wire.71001",
  "wire.20011",
  "wire.4601",
  "wire.29001",
  "wire.74121",
  "wire.74122",
] as const;

export interface WireMagicTowerLevelRankMark {
  field: number;
  text: string;
}

export interface WireMagicTowerLevelRankRow {
  /** 字段 1。没有时是 null，不写成 0。 */
  rid: number | null;
  /** 字段 2。没有时是 null，不写成 0。 */
  serverId: number | null;
  /** 字段 3。没有时是 null，不写成 0。 */
  name: string | null;
  /** 字段 4。没有时是 null，不写成 0。 */
  borderId: number | null;
  /** 字段 5。没有时是 null，不写成 0。 */
  headId: number | null;
  /** 字段 6。没有时是 null，不写成 0。 */
  passLevel: number | null;
  /** 字段 7。没有时是 null，不写成 0。 */
  passTime: number | null;
  /** 字段 8。没有时是 null，不写成 0。 */
  rank: number | null;
  /** 对不上这八个号的内层号。 */
  marks: WireMagicTowerLevelRankMark[];
}

export interface WireMagicTowerLevelRankSnapshot {
  /** GResMagicTowerLevelRank.self。字段没出现时是 null，不写成 0。 */
  self: WireMagicTowerLevelRankRow | null;
  /** GResMagicTowerLevelRank.list。字段没出现时是 null，不写成 0。出现过但没有行时是空数组。 */
  list: WireMagicTowerLevelRankRow[] | null;
  /** 对不上字段 1、2 的外层号，以及不是行包的值。 */
  marks: WireMagicTowerLevelRankMark[];
}

/**
 * 解 s2c 76520。空包体返回已同步的缺省字段。
 * 超长、坏 varint、行包解不开时返回 null。
 */
export function decodeWireMagicTowerLevelRank(body: Uint8Array | null | undefined): WireMagicTowerLevelRankSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireMagicTowerLevelRankMark[] = [];
  let self: WireMagicTowerLevelRankRow | null = null;
  let list: WireMagicTowerLevelRankRow[] | null = null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const parsed = decodeRow(row.bytes);
      if (!parsed) return null;
      if (self === null) self = parsed;
      else {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      const parsed = decodeRow(row.bytes);
      if (!parsed) return null;
      if (list === null) list = [];
      list.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { self, list, marks };
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireMagicTowerLevelRankLine(snap: WireMagicTowerLevelRankSnapshot): string {
  const parts: string[] = [];
  if (snap.self !== null) parts.push("self=" + formatRow(snap.self));
  if (snap.list !== null) parts.push("list=" + (snap.list.length === 0 ? "空" : rowList(snap.list)));
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_MAGIC_TOWER_LEVEL_RANK_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireMagicTowerLevelRankNote(snap: WireMagicTowerLevelRankSnapshot): string {
  return formatWireMagicTowerLevelRankLine(snap) + "。" + WIRE_MAGIC_TOWER_LEVEL_RANK_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireMagicTowerLevelRankSnapshot {
  return { self: null, list: null, marks: [] };
}

function rowList(rows: WireMagicTowerLevelRankRow[]): string {
  const n = Math.min(rows.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatRow(rows[i]));
  if (rows.length > n) return head.join(";") + "…+" + (rows.length - n);
  return head.join(";");
}

function formatRow(row: WireMagicTowerLevelRankRow): string {
  const parts: string[] = [];
  if (row.rid !== null) parts.push("rid=" + String(row.rid));
  if (row.serverId !== null) parts.push("server_id=" + String(row.serverId));
  if (row.name !== null) parts.push("name=" + row.name);
  if (row.borderId !== null) parts.push("border_id=" + String(row.borderId));
  if (row.headId !== null) parts.push("head_id=" + String(row.headId));
  if (row.passLevel !== null) parts.push("pass_level=" + String(row.passLevel));
  if (row.passTime !== null) parts.push("pass_time=" + String(row.passTime));
  if (row.rank !== null) parts.push("rank=" + String(row.rank));
  const body = parts.length === 0 && row.marks.length === 0 ? "空" : parts.join(",");
  return joinMarks(body, row.marks);
}

function joinMarks(line: string, marks: WireMagicTowerLevelRankMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireMagicTowerLevelRankMark[]): string {
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

function decodeRow(body: Uint8Array): WireMagicTowerLevelRankRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireMagicTowerLevelRankMark[] = [];
  let rid: number | null = null;
  let serverId: number | null = null;
  let name: string | null = null;
  let borderId: number | null = null;
  let headId: number | null = null;
  let passLevel: number | null = null;
  let passTime: number | null = null;
  let rank: number | null = null;
  let sawRid = false;
  let sawServer = false;
  let sawName = false;
  let sawBorder = false;
  let sawHead = false;
  let sawLevel = false;
  let sawTime = false;
  let sawRank = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (takeNum(row, 1, sawRid)) {
      sawRid = true;
      rid = accepted(row.varint);
      if (rid === null) pushMark(marks, row);
      continue;
    }
    if (takeNum(row, 2, sawServer)) {
      sawServer = true;
      serverId = accepted(row.varint);
      if (serverId === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 3 && !sawName && row.kind === "bytes" && row.bytes) {
      sawName = true;
      const text = utf8Printable(row.bytes);
      if (text !== null) name = text;
      else if (row.bytes.length === 0) name = "";
      else pushMark(marks, row);
      continue;
    }
    if (takeNum(row, 4, sawBorder)) {
      sawBorder = true;
      borderId = accepted(row.varint);
      if (borderId === null) pushMark(marks, row);
      continue;
    }
    if (takeNum(row, 5, sawHead)) {
      sawHead = true;
      headId = accepted(row.varint);
      if (headId === null) pushMark(marks, row);
      continue;
    }
    if (takeNum(row, 6, sawLevel)) {
      sawLevel = true;
      passLevel = accepted(row.varint);
      if (passLevel === null) pushMark(marks, row);
      continue;
    }
    if (takeNum(row, 7, sawTime)) {
      sawTime = true;
      passTime = accepted(row.varint);
      if (passTime === null) pushMark(marks, row);
      continue;
    }
    if (takeNum(row, 8, sawRank)) {
      sawRank = true;
      rank = accepted(row.varint);
      if (rank === null) pushMark(marks, row);
      continue;
    }
    pushMark(marks, row);
  }
  return { rid, serverId, name, borderId, headId, passLevel, passTime, rank, marks };
}

function takeNum(row: RawField, field: number, seen: boolean): boolean {
  return row.field === field && row.kind === "varint" && !seen;
}

function pushMark(marks: WireMagicTowerLevelRankMark[], row: RawField): void {
  const mark = markOf(row);
  if (mark) marks.push(mark);
}

function markOf(row: RawField): WireMagicTowerLevelRankMark | null {
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
