/**
 * 真服英雄殿堂只读。c2s / s2c 都是 63001。
 * c2s 是 GReqHeroPalaceData，空体，没有 page。整帧 04 00 00 00 19 F6 00 00，即 0400000019f60000。
 * 63001 = 0xF619，小端是 19 F6 00 00。空体一次。
 * 这是英雄殿堂数据，不是已合的神迹遗物 62001（空帧 0400000031f20000），也不是周末礼包 61001（空帧 0400000049ee0000），也不是每月福利列表 26001（空帧 0400000091650000）。
 * 服侧轻懒建、轻日刷可接受。跨日会清 worshipType。无扣费，无领奖写，无成长写。
 * 不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。不是签到列表 13010。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。
 * 62001 已合。本刀不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 62001 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 62001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 63002 膜拜。63002 是写号，本刀不编码、不发送。
 * 不发 63003 领排名奖。63003 是写号，本刀不编码、不发送。
 * 69001 积天豪礼2另帧，勿合并。69001 编码空体，挂在 63001 之后。不发 69002。不做 71001。
 * 不做 20011。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 63001 是 GResHeroPalaceData，内容是 PSHeroPalace。
 * 仓库里没有这份 proto。type、rankRole、isReward、isWorship、serverRankRole 按声明顺序从 1 编号。
 * 字段 1 是记录包时，按 repeated PSHeroPalace 逐条解。外层其它号按字段号写。
 * 字段 1 不是记录包时，整包按同一组字段号解成一条 PSHeroPalace。
 * type 是字段 1。rankRole 是字段 2。isReward 是字段 3。isWorship 是字段 4。serverRankRole 是字段 5。
 * rankRole、serverRankRole 是 varint 时按出现的数写。是长度包时按内层字段号写，不发明内层名字。
 * worshipType 是服侧日刷字段，不在这份展示名单里。没有这个字段时保持缺省，不写成 0，页上也不补这一项。
 * 出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。字段缺省，页上写「已同步空表」，不写成 0。
 * 记录包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.heroPalace。 */
export const WIRE_HERO_PALACE_CMD = "wire.63001";

export const WIRE_HERO_PALACE_FRAME = "0400000019f60000";
export const WIRE_HERO_PALACE_EMPTY = "已同步空表";
export const WIRE_HERO_PALACE_READONLY_TITLE = "英雄殿堂（真服只读）";
export const WIRE_HERO_PALACE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_HERO_PALACE_READONLY_NOTE =
  "只读展示英雄殿堂里实际出现的 type、rankRole、isReward、isWorship、serverRankRole。字段 1 是记录包时按 repeated PSHeroPalace 写。否则整包按同一组字段号写成一条。rankRole、serverRankRole 是数就写数，是长度包就按内层字段号写。缺字段不写成 0，也不补一项。出现的值如实展示。无膜拜、领排名奖入口。不重复拉 62001。不发 63002。不发 63003。69001 积天豪礼2另帧，勿合并。不做 20011。不是神迹遗物 62001。不是周末礼包 61001。5001、51001 已有，勿重复。62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 62001 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_HERO_PALACE_SIDE_EFFECT =
  "轻懒建、轻日刷可接受。跨日会清 worshipType。无扣费，无领奖写，无成长写。空 c2s 一次，无 page，挂在 62001 之后。只发 cmd=63001，空帧 0400000019f60000。不重复拉 62001。不发 63002。不发 63003。69001 积天豪礼2另帧，勿合并。不做 20011。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 62001 分开发，勿合并。本刀不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_HERO_PALACE_FIELD_NOTE =
  "type、rankRole、isReward、isWorship、serverRankRole。按声明顺序是字段 1、2、3、4、5。rankRole、serverRankRole 不发明内层名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。62001 / 61001 / 26001 / 26002 / 5001 / 51001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。63002 膜拜、63003 领排名奖是写号。69001 积天豪礼2另帧，已编码空体，不在这张未编码表里。 */
export const WIRE_HERO_PALACE_BANNED_CMDS = [
  "wire.63002",
  "wire.63003",
  "wire.20011",
  "wire.4601",
  "wire.29001",
] as const;

export interface WireHeroPalaceMark {
  field: number;
  text: string;
}

export interface WireHeroPalaceNum {
  kind: "num";
  value: number;
}

export interface WireHeroPalaceBlob {
  kind: "blob";
  /** 长度包里实际出现的内层号。不发明名字。 */
  marks: WireHeroPalaceMark[];
}

export type WireHeroPalaceRole = WireHeroPalaceNum | WireHeroPalaceBlob;

export interface WireHeroPalaceRow {
  /** PSHeroPalace.type。没有时是 null，不写成 0。 */
  type: number | null;
  /** PSHeroPalace.rankRole。没有时是 null，不写成 0。 */
  rankRole: WireHeroPalaceRole | null;
  /** PSHeroPalace.isReward。没有时是 null，不写成 0。 */
  isReward: number | null;
  /** PSHeroPalace.isWorship。没有时是 null，不写成 0。 */
  isWorship: number | null;
  /** PSHeroPalace.serverRankRole。没有时是 null，不写成 0。 */
  serverRankRole: WireHeroPalaceRole | null;
  /** 对不上 type / rankRole / isReward / isWorship / serverRankRole 的号。 */
  marks: WireHeroPalaceMark[];
}

export interface WireHeroPalaceSnapshot {
  /** 实际出现的 PSHeroPalace。一条都没有时是 null，不补空行。 */
  rows: WireHeroPalaceRow[] | null;
  /** 记录包外层对不上的号。整包当成一条时，对不上的号在行上。 */
  marks: WireHeroPalaceMark[];
}

/**
 * 解 s2c 63001。空包体返回已同步的缺省字段。
 * 超长、坏 varint、记录包解不开时返回 null。
 */
export function decodeWireHeroPalace(body: Uint8Array | null | undefined): WireHeroPalaceSnapshot | null {
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
export function formatWireHeroPalaceLine(snap: WireHeroPalaceSnapshot): string {
  const parts: string[] = [];
  if (snap.rows !== null) {
    parts.push(snap.rows.length === 0 ? "空" : rowList(snap.rows));
  }
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_HERO_PALACE_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireHeroPalaceNote(snap: WireHeroPalaceSnapshot): string {
  return formatWireHeroPalaceLine(snap) + "。" + WIRE_HERO_PALACE_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireHeroPalaceSnapshot {
  return { rows: null, marks: [] };
}

function decodeRepeated(fields: RawField[]): WireHeroPalaceSnapshot | null {
  const marks: WireHeroPalaceMark[] = [];
  const rows: WireHeroPalaceRow[] = [];
  let saw = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const parsed = decodePalace(row.bytes);
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

function decodeFlat(fields: RawField[]): WireHeroPalaceSnapshot | null {
  const parsed = decodePalaceFields(fields);
  if (!parsed) return null;
  if (!rowHasAnything(parsed)) return { rows: null, marks: parsed.marks };
  return { rows: [parsed], marks: [] };
}

function rowList(rows: WireHeroPalaceRow[]): string {
  const n = Math.min(rows.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatRow(rows[i]));
  if (rows.length > n) return head.join(";") + "…+" + (rows.length - n);
  return head.join(";");
}

function formatRow(row: WireHeroPalaceRow): string {
  const parts: string[] = [];
  if (row.type !== null) parts.push("type=" + String(row.type));
  if (row.rankRole !== null) parts.push("rankRole=" + formatRole(row.rankRole));
  if (row.isReward !== null) parts.push("isReward=" + String(row.isReward));
  if (row.isWorship !== null) parts.push("isWorship=" + String(row.isWorship));
  if (row.serverRankRole !== null) parts.push("serverRankRole=" + formatRole(row.serverRankRole));
  const body = parts.length === 0 && row.marks.length === 0 ? "空" : parts.join(",");
  return joinMarks(body, row.marks);
}

function formatRole(role: WireHeroPalaceRole): string {
  if (role.kind === "num") return String(role.value);
  if (role.marks.length === 0) return "空";
  return marksText(role.marks);
}

function rowHasAnything(row: WireHeroPalaceRow): boolean {
  return (
    row.type !== null ||
    row.rankRole !== null ||
    row.isReward !== null ||
    row.isWorship !== null ||
    row.serverRankRole !== null ||
    row.marks.length > 0
  );
}

function joinMarks(line: string, marks: WireHeroPalaceMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireHeroPalaceMark[]): string {
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

function decodePalace(body: Uint8Array): WireHeroPalaceRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  return decodePalaceFields(fields);
}

function decodePalaceFields(fields: RawField[]): WireHeroPalaceRow | null {
  const marks: WireHeroPalaceMark[] = [];
  let type: number | null = null;
  let rankRole: WireHeroPalaceRole | null = null;
  let isReward: number | null = null;
  let isWorship: number | null = null;
  let serverRankRole: WireHeroPalaceRole | null = null;
  let sawType = false;
  let sawRank = false;
  let sawReward = false;
  let sawWorship = false;
  let sawServer = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && !sawType) {
      sawType = true;
      type = accepted(row.varint);
      if (type === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 2 && !sawRank) {
      sawRank = true;
      const role = readRole(row);
      if (role === null) return null;
      rankRole = role;
      continue;
    }
    if (row.field === 3 && row.kind === "varint" && !sawReward) {
      sawReward = true;
      isReward = accepted(row.varint);
      if (isReward === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 4 && row.kind === "varint" && !sawWorship) {
      sawWorship = true;
      isWorship = accepted(row.varint);
      if (isWorship === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 5 && !sawServer) {
      sawServer = true;
      const role = readRole(row);
      if (role === null) return null;
      serverRankRole = role;
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { type, rankRole, isReward, isWorship, serverRankRole, marks };
}

function readRole(row: RawField): WireHeroPalaceRole | null {
  if (row.kind === "varint") {
    const value = accepted(row.varint);
    if (value === null) return { kind: "blob", marks: markOf(row) ? [markOf(row) as WireHeroPalaceMark] : [] };
    return { kind: "num", value };
  }
  if (row.kind === "bytes" && row.bytes) {
    if (row.bytes.length === 0) return { kind: "blob", marks: [] };
    const fields = readRawFields(row.bytes);
    if (!fields) return null;
    const marks: WireHeroPalaceMark[] = [];
    for (let i = 0; i < fields.length; i++) {
      const mark = markOf(fields[i]);
      if (mark) marks.push(mark);
    }
    return { kind: "blob", marks };
  }
  return { kind: "blob", marks: [] };
}

function markOf(row: RawField): WireHeroPalaceMark | null {
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
