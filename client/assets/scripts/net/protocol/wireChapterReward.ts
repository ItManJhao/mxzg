/**
 * 真服关卡奖励列表只读。c2s / s2c 都是 3010。
 * c2s 是 GReqChapterRewardList，空体，没有 page。整帧 04 00 00 00 c2 0b 00 00，即 04000000c20b0000。
 * 3010 = 0x0BC2，小端是 c2 0b 00 00。
 *
 * 战斗链续在已合的 3007、3001 之后：…→3007→…→3001→3010。
 * 主线页打开时只读拉一次。须已有 3007 的 idx。3001 仍只在点「挑战」时发，本刀不重发。
 * 不进 pullIdle，不接活动链末（不接 76251 后面），不夹活动号。Boot.ts 不改。
 * 本刀不挑战，不结算。
 *
 * 副作用：只读 chapterRewardId。轻懒建、轻日刷可接受。无扣费，无领奖，无养成写。
 * 不发 3002、3005、3008、3011、3013。3012 另只读接在其后，不从本帧发。3006 挂在 3012 之后，不从本帧发。活动 76271 仍暂缓。
 * 不重发 3007、3004、3001、3099、3101、18001、3203。
 * 硬禁 4601、29001。不把 Mock 1201 / 1202 当真服。
 * 不写金币，不写钻石。不回落 Mock。不接 spine。不接 USE_*。不改 CityChrome。
 *
 * s2c 是 GResChapterRewardList。list 是字段 1，repeated int32，已领首通 idx。
 * 可以是未打包的 repeated varint，也可以是 proto3 打包的 length-delimited。
 * 服不保证顺序。客户端按出现顺序写，不排序。
 * 没有这个字段时不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 空包体是已同步空表。字段 1 的打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.chapterRewardList。 */
export const WIRE_CHAPTER_REWARD_CMD = "wire.3010";

export const WIRE_CHAPTER_REWARD_FRAME = "04000000c20b0000";

export const WIRE_CHAPTER_REWARD_EMPTY = "已同步空表";
export const WIRE_CHAPTER_REWARD_UNSYNCED = "真服未同步";
export const WIRE_CHAPTER_REWARD_UNSYNCED_TOAST = "真服未同步";
export const WIRE_CHAPTER_REWARD_ABSENT = "未带";

export const WIRE_CHAPTER_REWARD_NOTE =
  "主线页展示已领首通。打开页只读拉空 c2s 3010（GReqChapterRewardList，整帧 04000000c20b0000）。战斗链是 …→3007→…→3001→3010。须已有 3007。不重发 3007、3004、3001、3099、3101、18001、3203。不发 3002、3005、3008、3011、3013。不从本帧发 3012。3006 挂在 3012 之后，不从本帧发。76271 仍暂缓。硬禁 4601、29001。不把 Mock 1201/1202 当真服。本刀不挑战，不结算。不进 pullIdle，不夹活动号。缺字段不写成 0。空包体是已同步空表。未同步 Toast「真服未同步」。不回落 Mock。不写金币，不写钻石。不接 spine。不改 Boot";

export const WIRE_CHAPTER_REWARD_SIDE_EFFECT =
  "只读 chapterRewardId。轻懒建可接受。轻日刷可接受。无扣费，无领奖，无养成写。空 c2s 一次，无 page，挂在已合 3001 之后，主线页打开时发。不重发 3001。不进 pullIdle。不发 3002、3005、3008、3011、3013。不从本帧发 3012。3006 挂在 3012 之后，不从本帧发。不发 76271。不重发 3007、3004、3099、3101、18001、3203。硬禁 4601、29001";

/** 本刀不编码这些号。3007 / 3004 / 3001 / 3099 / 3101 / 18001 / 3203 已有自己的帧，由战斗链断言不重发。 */
export const WIRE_CHAPTER_REWARD_BANNED_CMDS = [
  "wire.3002",
  "wire.3008",
  "wire.3011",
  "wire.3013",
  "wire.76271",
  "wire.4601",
  "wire.29001",
  "wire.1201",
  "wire.1202",
] as const;

export interface WireChapterRewardMark {
  field: number;
  text: string;
}

export interface WireChapterRewardSnapshot {
  /** 空包体。list 保持空，页上写「已同步空表」。 */
  empty: boolean;
  /** GResChapterRewardList.list。没有这个字段时是空数组，不写成 0。 */
  list: number[];
  marks: WireChapterRewardMark[];
}

/**
 * 解 s2c 3010。空包体返回已同步空表。
 * 超长、坏 varint、字段 1 打包解不开时返回 null。
 */
export function decodeWireChapterReward(body: Uint8Array | null | undefined): WireChapterRewardSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return { empty: true, list: [], marks: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const list: number[] = [];
  const marks: WireChapterRewardMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint") {
      const value = accepted(row.varint);
      if (value === null) {
        const mark = markOf(row);
        if (mark) marks.push(mark);
      } else {
        list.push(value);
      }
      continue;
    }
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) list.push(packed[j]);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { empty: false, list, marks };
}

/** 主线页上的已领首通。null 是还没同步。空包体写「已同步空表」。缺 list 不写成 0。 */
export function formatWireChapterReward(snap: WireChapterRewardSnapshot | null): string {
  if (!snap) return "已领首通 " + WIRE_CHAPTER_REWARD_UNSYNCED;
  if (snap.empty) return "已领首通 " + WIRE_CHAPTER_REWARD_EMPTY;
  if (snap.list.length === 0) return joinMarks("已领首通 " + WIRE_CHAPTER_REWARD_ABSENT, snap.marks);
  const n = Math.min(snap.list.length, 8);
  const parts: string[] = [];
  for (let i = 0; i < n; i++) parts.push("idx=" + String(snap.list[i]));
  let line = "已领首通 " + parts.join("、");
  if (snap.list.length > n) line += "…+" + (snap.list.length - n);
  return joinMarks(line, snap.marks);
}

export function formatWireChapterRewardLine(idx: number): string {
  return "idx=" + String(idx);
}

function joinMarks(line: string, marks: WireChapterRewardMark[]): string {
  if (marks.length === 0) return line;
  const parts: string[] = [];
  for (let i = 0; i < marks.length; i++) parts.push("字段" + marks[i].field + "=" + marks[i].text);
  return line + " / " + parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function markOf(row: RawField): WireChapterRewardMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    if (row.bytes.length === 0) return { field: row.field, text: "空" };
    return { field: row.field, text: "包" + row.bytes.length };
  }
  return { field: row.field, text: "未解" };
}

function accepted(value: number | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  if (value === -1) return -1;
  if (value < 0) return null;
  return Math.floor(value);
}

function readPackedVarints(body: Uint8Array): number[] | null {
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
      fields.push({ field, kind: "bytes", bytes: body.slice(i, i + len.value) });
      i += len.value;
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

function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}
