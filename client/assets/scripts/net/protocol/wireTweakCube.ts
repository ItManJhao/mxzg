/**
 * 真服魔方数据只读。c2s / s2c 都是 75501。
 * c2s 是 GReqTweakCube，没有字段，没有 page。整帧 04 00 00 00 ed 26 01 00，即 04000000ed260100。
 * 75501 = 0x126ED，小端是 ed 26 01 00。空体一次。handler getData 不读 req。
 * 不是星盘数据 68001。不是图腾信息 74300。不是浮空岛时间 73001。不是角色资料 2001。
 *
 * 由 WireSession.pullIdle 在空 c2s 68001 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不做 34001。不做 20011。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 75502 添加、75503 卸下、75504 开格子、75505 清 cd。
 * 75506 是等级推送，勿发、勿当拉包请求，不订阅，不编成 c2s。
 * 服侧轻懒建：首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉。无扣费，无领奖。管理员认定可接受，同星盘。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 75501 是 GResTweakCube。对得上的名字才用，对不上的号按字段号写。
 * 仓库里其它消息也是按声明顺序从 1 编号。
 * - 1 rank_hero。repeated int64。单条 varint，或打包的 varint
 * - 2 open_count
 * - 3 repeated PSTrench trench
 * PSTrench：index=1，hero_id=2，last_change_time=3。
 * 没有的数不写成 0。出现的 0 仍写 0。
 *
 * 空包体是已同步，open_count 保持缺省，rank_hero 与 trench 为空。
 * trench 有包但一条都解不开，或 rank_hero 打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.tweakCubeData。 */
export const WIRE_CUBE_CMD = "wire.75501";

export const WIRE_CUBE_READONLY_TITLE = "魔方数据（真服只读）";
export const WIRE_CUBE_EMPTY = "空槽";
export const WIRE_CUBE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_CUBE_READONLY_NOTE =
  "只读展示，无添加、卸下、开格子、清 cd 入口。不发 75502、75503、75504、75505。75506 是等级推送，勿发、勿当拉包。不做 34001，不做 20011。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_CUBE_SIDE_EFFECT =
  "轻懒建。首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉。无扣费，无领奖。管理员认定可接受，同星盘。空 c2s 一次，无 page，挂在 68001 之后。不发 75502、75503、75504、75505。75506 是等级推送，勿当拉包。不做 34001，不做 20011";
export const WIRE_CUBE_FIELD_NOTE =
  "rank_hero、open_count、trench 的 index、hero_id、last_change_time。没有的数不写成 0。对不上的号按字段号写";

export interface WireCubeMark {
  field: number;
  text: string;
}

export interface WireCubeTrench {
  /** PSTrench.index。没有时是 null，不写成 0。 */
  index: number | null;
  /** PSTrench.hero_id。没有时是 null，不写成 0。 */
  heroId: number | null;
  /** PSTrench.last_change_time。没有时是 null，不写成 0。 */
  lastChangeTime: number | null;
  /** 对不上 index、hero_id、last_change_time 的号。 */
  marks: WireCubeMark[];
}

export interface WireCubeSnapshot {
  /** GResTweakCube.rank_hero。没有这个字段时是空数组，不写成 0。 */
  rankHero: number[];
  /** GResTweakCube.open_count。没有时是 null，不写成 0。 */
  openCount: number | null;
  /** GResTweakCube.trench。没有这个字段时是空数组，不写成 0。 */
  trenches: WireCubeTrench[];
  /** 对不上字段 1、字段 2、字段 3 的外层号。 */
  marks: WireCubeMark[];
}

/**
 * 解 s2c 75501。空包体返回已同步的空 rank_hero、缺省 open_count 和空 trench。
 * 超长、坏 varint、trench 有包但一条都解不开、rank_hero 打包解不开时返回 null。
 */
export function decodeWireTweakCube(body: Uint8Array | null | undefined): WireCubeSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const rankHero: number[] = [];
  const trenches: WireCubeTrench[] = [];
  const marks: WireCubeMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 2 && row.kind === "varint") continue;
    if (row.field === 1 && row.kind === "varint" && typeof row.varint === "number") {
      if (isFinite(row.varint) && row.varint >= 0) rankHero.push(Math.floor(row.varint));
      continue;
    }
    if (row.field === 1 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) rankHero.push(packed[j]);
      continue;
    }
    if (row.field === 3 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeTrench(row.bytes);
      if (!parsed) continue;
      trenches.push(parsed);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && trenches.length === 0) return null;
  return {
    rankHero,
    openCount: nonNegativeVarint(fields, 2),
    trenches,
    marks,
  };
}

/** 页上写 rank_hero、open_count 和 trench 条数。没有时写「无」。trench 为 0 写「空槽」。 */
export function formatWireTweakCubeHead(snap: WireCubeSnapshot): string {
  const list = snap.trenches.length === 0 ? WIRE_CUBE_EMPTY : snap.trenches.length + " 条";
  return joinMarks(
    "rank_hero=" + numList(snap.rankHero) + " / open_count=" + numText(snap.openCount) + " / trench=" + list,
    snap.marks
  );
}

/** 行上写 index / hero_id / last_change_time。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireTweakCubeLine(row: WireCubeTrench): string {
  return joinMarks(
    "index=" + numText(row.index) + " / hero_id=" + numText(row.heroId) + " / last_change_time=" + numText(row.lastChangeTime),
    row.marks
  );
}

export function wireTweakCubeNote(snap: WireCubeSnapshot): string {
  const head = formatWireTweakCubeHead(snap);
  const tail = WIRE_CUBE_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.trenches.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.trenches.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireTweakCubeLine(snap.trenches[i]));
  if (snap.trenches.length > n) parts.push("其余 " + (snap.trenches.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireCubeSnapshot {
  return { rankHero: [], openCount: null, trenches: [], marks: [] };
}

function numList(values: number[]): string {
  if (values.length === 0) return "无";
  const n = Math.min(values.length, 8);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(String(values[i]));
  if (values.length > n) return head.join(",") + "…+" + (values.length - n);
  return head.join(",");
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

function joinMarks(line: string, marks: WireCubeMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireCubeMark[]): string {
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

function decodeTrench(body: Uint8Array): WireCubeTrench | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireCubeMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2 || row.field === 3) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    index: nonNegativeVarint(fields, 1),
    heroId: nonNegativeVarint(fields, 2),
    lastChangeTime: nonNegativeVarint(fields, 3),
    marks,
  };
}

function markOf(row: RawField): WireCubeMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint) && row.varint >= 0) {
    return { field: row.field, text: String(Math.floor(row.varint)) };
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

function nonNegativeVarint(fields: RawField[], field: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "varint" || typeof row.varint !== "number") continue;
    if (!isFinite(row.varint) || row.varint < 0) continue;
    return Math.floor(row.varint);
  }
  return null;
}

function readPackedVarints(body: Uint8Array): number[] | null {
  const values: number[] = [];
  let i = 0;
  while (i < body.length) {
    const val = readVarint(body, i);
    if (!val) return null;
    if (!isFinite(val.value) || val.value < 0) return null;
    values.push(Math.floor(val.value));
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
  while (i < body.length && shift <= 49) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (!Number.isSafeInteger(value)) return null;
      return { value, next: i };
    }
    shift += 7;
  }
  return null;
}
