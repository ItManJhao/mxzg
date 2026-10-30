/**
 * 真服星盘数据只读。c2s / s2c 都是 68001。
 * c2s 是 GReqAstrolabeData，没有字段，没有 page。整帧 04 00 00 00 a1 09 01 00，即 04000000a1090100。
 * 68001 = 0x109A1，小端是 a1 09 01 00。空体一次。handler getData 不读 req。
 * 不是图腾信息 74300。不是浮空岛时间 73001。不是灵器数据 70001。不是角色资料 2001。
 *
 * 由 WireSession.pullIdle 在空 c2s 74300 之后发出，只发一次。Boot.ts 不改。
 * 不夹在 2001 和 3007 中间。不做 20011。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不发 68002 激活元素、68003 点亮星盘、68004 重置、68006 激活星盘。
 * 68005 是更新星数常量，勿发、勿当拉包请求，不订阅，不编成 c2s。
 * 服侧轻懒建：首次 load 可能 astrolabeDao.add 空行。无扣费，无领奖，无日刷写库。管理员认定可接受。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。
 *
 * s2c 68001 是 GResAstrolabeData。对得上的名字才用，对不上的号按字段号写。
 * PSMapData 的 key、value 与基金列表 20001、超值首充 20012 相同，按声明顺序从 1 编号。
 * - 1 maxStar
 * - 2 repeated PSMapData active
 * - 3 repeated int activeElem。单条 varint，或打包的 varint
 * - 4 activeAstrolabe
 * PSMapData：key=1，value=2。
 * 没有的数不写成 0。出现的 0 仍写 0。
 *
 * 空包体是已同步，maxStar 和 activeAstrolabe 保持缺省，active 与 activeElem 为空。
 * active 有包但一条都解不开，或 activeElem 打包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.astrolabeData。 */
export const WIRE_ASTROLABE_CMD = "wire.68001";

export const WIRE_ASTROLABE_READONLY_TITLE = "星盘数据（真服只读）";
export const WIRE_ASTROLABE_EMPTY = "空记录";
export const WIRE_ASTROLABE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_ASTROLABE_READONLY_NOTE =
  "只读展示，无激活元素、点亮星盘、重置、激活星盘入口。不发 68002、68003、68004、68006。68005 是更新星数常量，勿发、勿当拉包。不做 20011。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_ASTROLABE_SIDE_EFFECT =
  "轻懒建。首次 load 可能 astrolabeDao.add 空行。无扣费，无领奖，无日刷写库。管理员认定可接受。空 c2s 一次，无 page，挂在 74300 之后。不发 68002、68003、68004、68006。68005 是更新星数常量，勿当拉包。不做 20011";
export const WIRE_ASTROLABE_FIELD_NOTE =
  "maxStar、active 的 PSMapData key、value、activeElem、activeAstrolabe。没有的数不写成 0。对不上的号按字段号写";

export interface WireAstrolabeMark {
  field: number;
  text: string;
}

export interface WireAstrolabeActive {
  /** PSMapData.key。没有时是 null，不写成 0。 */
  key: number | null;
  /** PSMapData.value。没有时是 null，不写成 0。 */
  value: number | null;
  /** 对不上 key、value 的号。 */
  marks: WireAstrolabeMark[];
}

export interface WireAstrolabeSnapshot {
  /** GResAstrolabeData.maxStar。没有时是 null，不写成 0。 */
  maxStar: number | null;
  /** GResAstrolabeData.active。没有这个字段时是空数组，不写成 0。 */
  active: WireAstrolabeActive[];
  /** GResAstrolabeData.activeElem。没有这个字段时是空数组，不写成 0。 */
  activeElem: number[];
  /** GResAstrolabeData.activeAstrolabe。没有时是 null，不写成 0。 */
  activeAstrolabe: number | null;
  /** 对不上字段 1、字段 2、字段 3、字段 4 的外层号。 */
  marks: WireAstrolabeMark[];
}

/**
 * 解 s2c 68001。空包体返回已同步的缺省 maxStar、空 active、空 activeElem 和缺省 activeAstrolabe。
 * 超长、坏 varint、active 有包但一条都解不开、activeElem 打包解不开时返回 null。
 */
export function decodeWireAstrolabe(body: Uint8Array | null | undefined): WireAstrolabeSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const active: WireAstrolabeActive[] = [];
  const activeElem: number[] = [];
  const marks: WireAstrolabeMark[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 4) && row.kind === "varint") continue;
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeActive(row.bytes);
      if (!parsed) continue;
      active.push(parsed);
      continue;
    }
    if (row.field === 3 && row.kind === "varint" && typeof row.varint === "number") {
      if (isFinite(row.varint) && row.varint >= 0) activeElem.push(Math.floor(row.varint));
      continue;
    }
    if (row.field === 3 && row.kind === "bytes" && row.bytes) {
      const packed = readPackedVarints(row.bytes);
      if (!packed) return null;
      for (let j = 0; j < packed.length; j++) activeElem.push(packed[j]);
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && active.length === 0) return null;
  return {
    maxStar: nonNegativeVarint(fields, 1),
    active,
    activeElem,
    activeAstrolabe: nonNegativeVarint(fields, 4),
    marks,
  };
}

/** 页上写 maxStar、active 条数、activeElem 和 activeAstrolabe。没有时写「无」。active 为 0 写「空记录」。 */
export function formatWireAstrolabeHead(snap: WireAstrolabeSnapshot): string {
  const list = snap.active.length === 0 ? WIRE_ASTROLABE_EMPTY : snap.active.length + " 条";
  return joinMarks(
    "maxStar=" +
      numText(snap.maxStar) +
      " / active=" +
      list +
      " / activeElem=" +
      elemText(snap.activeElem) +
      " / activeAstrolabe=" +
      numText(snap.activeAstrolabe),
    snap.marks
  );
}

/** 行上写 key / value。没有的格子写「无」。出现的 0 仍写 0。 */
export function formatWireAstrolabeLine(row: WireAstrolabeActive): string {
  return joinMarks("key=" + numText(row.key) + " / value=" + numText(row.value), row.marks);
}

export function wireAstrolabeNote(snap: WireAstrolabeSnapshot): string {
  const head = formatWireAstrolabeHead(snap);
  const tail = WIRE_ASTROLABE_SIDE_EFFECT + "。不写金币，不写钻石";
  if (snap.active.length === 0) return head + "。" + tail;
  const parts: string[] = [];
  const n = Math.min(snap.active.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireAstrolabeLine(snap.active[i]));
  if (snap.active.length > n) parts.push("其余 " + (snap.active.length - n) + " 条");
  return head + "。" + parts.join("；") + "。" + tail;
}

function emptySnapshot(): WireAstrolabeSnapshot {
  return { maxStar: null, active: [], activeElem: [], activeAstrolabe: null, marks: [] };
}

function elemText(values: number[]): string {
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

function joinMarks(line: string, marks: WireAstrolabeMark[]): string {
  if (marks.length === 0) return line;
  return line + " / " + marksText(marks);
}

function marksText(marks: WireAstrolabeMark[]): string {
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

function decodeActive(body: Uint8Array): WireAstrolabeActive | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireAstrolabeMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if ((row.field === 1 || row.field === 2) && row.kind === "varint") continue;
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return {
    key: nonNegativeVarint(fields, 1),
    value: nonNegativeVarint(fields, 2),
    marks,
  };
}

function markOf(row: RawField): WireAstrolabeMark | null {
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
