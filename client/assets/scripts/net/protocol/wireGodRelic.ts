/**
 * 真服神迹遗物只读。c2s / s2c 都是 62001。
 * c2s 是 GReqGodRelicData，空体，没有 page。整帧 04 00 00 00 31 F2 00 00，即 0400000031f20000。
 * 62001 = 0xF231，小端是 31 F2 00 00。空体一次。
 * 这是神迹遗物数据，不是已合的周末礼包 61001（空帧 0400000049ee0000），也不是每月福利列表 26001（空帧 0400000091650000）。
 * 服侧轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。
 * 不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。不是签到列表 13010。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。
 * 61001 已合。本刀不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 61001 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 61001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。
 * 不发 62002 挑战。62002 是写号，本刀不编码、不发送。
 * 不发 62003 买次数。62003 是写号，本刀不编码、不发送。
 * 不发 62004 领星级奖。62004 是写号，本刀不编码、不发送。
 * 不发 62005 扫荡。62005 是写号，本刀不编码、不发送。
 * 不做备选 63001。63001 本轮不做，不编码、不发送。
 * 不做 20011。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 62001 是 GResGodRelicData。
 * 仓库里没有这份 proto。buyCount、canChallengeCount、starMap、starRewardRecord 按声明顺序从 1 编号。
 * buyCount 是字段 1。canChallengeCount 是字段 2。starMap 是字段 3。starRewardRecord 是字段 4。
 * starMap 按本仓库其它 map 读成 repeated 消息。内层 key 是字段 1，value 是字段 2。
 * starRewardRecord 是 repeated。外层 varint 按出现的数写。长度包能解成消息时按内层字段号写，不发明内层名字。解不成消息时按打包的数写。
 * 字段 3 若是 varint，不当成一条记录，按字段号写。
 * 没有这个字段时保持缺省，不写成 0，页上也不补这一项。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 *
 * 空包体是已同步。字段缺省，页上写「已同步空表」，不写成 0。
 * 记录包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.godRelic。 */
export const WIRE_GOD_RELIC_CMD = "wire.62001";

export const WIRE_GOD_RELIC_FRAME = "0400000031f20000";
export const WIRE_GOD_RELIC_EMPTY = "已同步空表";
export const WIRE_GOD_RELIC_READONLY_TITLE = "神迹遗物（真服只读）";
export const WIRE_GOD_RELIC_UNSYNCED_TOAST = "真服未同步";
export const WIRE_GOD_RELIC_READONLY_NOTE =
  "只读展示神迹遗物里实际出现的 buyCount、canChallengeCount、starMap、starRewardRecord。starMap 是 repeated，内层 key、value。starRewardRecord 按出现的数或内层字段号写。缺字段不写成 0，也不补一项。出现的值如实展示。无挑战、买次数、领星级奖、扫荡入口。不重复拉 61001。不发 62002。不发 62003。不发 62004。不发 62005。不做 63001。不做 20011。不是周末礼包 61001。不是每月福利列表 26001。5001、51001 已有，勿重复。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 61001 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_GOD_RELIC_SIDE_EFFECT =
  "轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。空 c2s 一次，无 page，挂在 61001 之后。只发 cmd=62001，空帧 0400000031f20000。不重复拉 61001。不发 62002。不发 62003。不发 62004。不发 62005。不做 63001。不做 20011。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 61001 分开发，勿合并。本刀不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_GOD_RELIC_FIELD_NOTE =
  "buyCount、canChallengeCount、starMap、starRewardRecord。按声明顺序是字段 1、2、3、4。starMap 内层 key、value。starRewardRecord 不发明内层名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。61001 / 26001 / 26002 / 5001 / 51001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 / 63001 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。62002 挑战、62003 买次数、62004 领星级奖、62005 扫荡是写号。63001 英雄殿堂另帧，勿合并。 */
export const WIRE_GOD_RELIC_BANNED_CMDS = [
  "wire.62002",
  "wire.62003",
  "wire.62004",
  "wire.62005",
  "wire.20011",
  "wire.4601",
  "wire.29001",
] as const;

export interface WireGodRelicMark {
  field: number;
  text: string;
}

export interface WireGodRelicMapEntry {
  /** starMap.key。没有时是 null，不写成 0。 */
  key: number | null;
  /** starMap.value。没有时是 null，不写成 0。 */
  value: number | null;
  /** 对不上 key / value 的内层号。 */
  marks: WireGodRelicMark[];
}

export interface WireGodRelicRewardNum {
  kind: "num";
  value: number;
}

export interface WireGodRelicRewardRow {
  kind: "row";
  /** 长度包里实际出现的内层号。不发明名字。 */
  marks: WireGodRelicMark[];
}

export type WireGodRelicReward = WireGodRelicRewardNum | WireGodRelicRewardRow;

export interface WireGodRelicSnapshot {
  /** GResGodRelicData.buyCount。字段没出现时是 null，不写成 0。 */
  buyCount: number | null;
  /** GResGodRelicData.canChallengeCount。字段没出现时是 null，不写成 0。 */
  canChallengeCount: number | null;
  /** GResGodRelicData.starMap。字段没出现时是 null。出现过但没有行时是空数组。 */
  starMap: WireGodRelicMapEntry[] | null;
  /** GResGodRelicData.starRewardRecord。字段没出现时是 null。 */
  starRewardRecord: WireGodRelicReward[] | null;
  /** 对不上字段 1、2、3、4 的外层号，以及字段 3 上不是记录包的值。 */
  marks: WireGodRelicMark[];
}

/**
 * 解 s2c 62001。空包体返回已同步的缺省字段。
 * 超长、坏 varint、记录包解不开时返回 null。
 */
export function decodeWireGodRelic(body: Uint8Array | null | undefined): WireGodRelicSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireGodRelicMark[] = [];
  let buyCount: number | null = null;
  let canChallengeCount: number | null = null;
  let starMap: WireGodRelicMapEntry[] | null = null;
  let starRewardRecord: WireGodRelicReward[] | null = null;
  let sawBuy = false;
  let sawCan = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && !sawBuy) {
      sawBuy = true;
      buyCount = accepted(row.varint);
      if (buyCount === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint" && !sawCan) {
      sawCan = true;
      canChallengeCount = accepted(row.varint);
      if (canChallengeCount === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 3 && row.kind === "bytes" && row.bytes) {
      const parsed = decodeMapEntry(row.bytes);
      if (!parsed) return null;
      if (starMap === null) starMap = [];
      starMap.push(parsed);
      continue;
    }
    if (row.field === 4 && row.kind === "varint") {
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
        continue;
      }
      if (starRewardRecord === null) starRewardRecord = [];
      starRewardRecord.push({ kind: "num", value });
      continue;
    }
    if (row.field === 4 && row.kind === "bytes" && row.bytes) {
      const parsed = decodeRewardBytes(row.bytes);
      if (!parsed) return null;
      if (starRewardRecord === null) starRewardRecord = [];
      for (let j = 0; j < parsed.length; j++) starRewardRecord.push(parsed[j]);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { buyCount, canChallengeCount, starMap, starRewardRecord, marks };
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireGodRelicLine(snap: WireGodRelicSnapshot): string {
  const parts: string[] = [];
  if (snap.buyCount !== null) parts.push("buyCount=" + String(snap.buyCount));
  if (snap.canChallengeCount !== null) parts.push("canChallengeCount=" + String(snap.canChallengeCount));
  if (snap.starMap !== null) {
    parts.push("starMap=" + (snap.starMap.length === 0 ? "空" : mapList(snap.starMap)));
  }
  if (snap.starRewardRecord !== null) {
    parts.push("starRewardRecord=" + (snap.starRewardRecord.length === 0 ? "空" : rewardList(snap.starRewardRecord)));
  }
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_GOD_RELIC_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireGodRelicNote(snap: WireGodRelicSnapshot): string {
  return formatWireGodRelicLine(snap) + "。" + WIRE_GOD_RELIC_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireGodRelicSnapshot {
  return { buyCount: null, canChallengeCount: null, starMap: null, starRewardRecord: null, marks: [] };
}

function mapList(rows: WireGodRelicMapEntry[]): string {
  const n = Math.min(rows.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatMapEntry(rows[i]));
  if (rows.length > n) return head.join(";") + "…+" + (rows.length - n);
  return head.join(";");
}

function formatMapEntry(row: WireGodRelicMapEntry): string {
  const parts: string[] = [];
  if (row.key !== null) parts.push("key=" + String(row.key));
  if (row.value !== null) parts.push("value=" + String(row.value));
  const body = parts.length === 0 && row.marks.length === 0 ? "空" : parts.join(",");
  return joinMarks(body, row.marks);
}

function rewardList(rows: WireGodRelicReward[]): string {
  const n = Math.min(rows.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatReward(rows[i]));
  if (rows.length > n) return head.join(";") + "…+" + (rows.length - n);
  return head.join(";");
}

function formatReward(row: WireGodRelicReward): string {
  if (row.kind === "num") return String(row.value);
  if (row.marks.length === 0) return "空";
  return marksText(row.marks);
}

function joinMarks(line: string, marks: WireGodRelicMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireGodRelicMark[]): string {
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

function decodeMapEntry(body: Uint8Array): WireGodRelicMapEntry | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireGodRelicMark[] = [];
  let key: number | null = null;
  let value: number | null = null;
  let sawKey = false;
  let sawValue = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && !sawKey) {
      sawKey = true;
      key = accepted(row.varint);
      if (key === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    if (row.field === 2 && row.kind === "varint" && !sawValue) {
      sawValue = true;
      value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      }
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { key, value, marks };
}

function decodeRewardBytes(body: Uint8Array): WireGodRelicReward[] | null {
  const fields = readRawFields(body);
  if (fields) {
    const marks: WireGodRelicMark[] = [];
    for (let i = 0; i < fields.length; i++) {
      const mark = markOf(fields[i]);
      if (mark) marks.push(mark);
    }
    return [{ kind: "row", marks }];
  }
  const packed = readPackedNumbers(body);
  if (!packed) return null;
  const rows: WireGodRelicReward[] = [];
  for (let i = 0; i < packed.length; i++) rows.push({ kind: "num", value: packed[i] });
  return rows;
}

function markOf(row: RawField): WireGodRelicMark | null {
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
