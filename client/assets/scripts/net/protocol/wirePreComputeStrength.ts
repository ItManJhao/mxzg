/**
 * 真服预计算战斗力。c2s / s2c 都是 3103。
 * c2s 是 GReqPreComputeStrength。空壳可以发。
 * 3103 = 0x0C1F，小端是 1f 0c 00 00。
 * 空壳整帧 04 00 00 00 1f 0c 00 00，即 040000001f0c0000。
 * 字段 1 hero_ids 是 repeated int64。字段 2 type 是 string。字段 3 line_up_type 是 int32。
 * 空白的 type、空白的 line_up_type 不编进包，不收成 1，也不收成 0。
 * 空的 hero_ids 同样不编字段 1。三个都空时包体就是空壳。
 *
 * 战斗链续在已合的 3102 之后：…→3102→3103。
 * 主线页点「空壳探针」或「预计算」才发。不跟 3102 同一发，不从 3102、3001、3006 的回包自动接。
 * 不进 pullIdle，不接活动链末，不夹活动号。Boot.ts 不改。
 * 不跟 3099、3101 合并。不发 3100、3097、3098。不跟 3030 混发。
 *
 * 副作用：只计算。不开战，不落库，无领奖，无扣费，不写养成。不回拉 3007。
 * 不发 3002、3005、3008、3011。硬禁 3013、4601、29001。
 * 不把 Mock 1201 / 1202 当真服。不写金币，不写钻石。不回落 Mock。不接 USE_*。不改 CityChrome。
 * 不播 spine，不走 planWireSpineReplay。
 *
 * s2c 是 GResPreComputeStrength。字段 1 fighting（int32），字段 2 type（string，回声）。
 * 空 hero_ids 的探针回 fighting=0，这是成功，不是未同步。出现的 0 仍写 0。
 * 没有的数不写成 0。空包体是已同步，fighting 保持缺省，页上不 Toast。
 * type 回声要和这次发出的 type 对上。没发 type 时期望回包也不带 type。
 *
 * hero_ids 可以手填，也可以从已同步的 3101 副本队列预填。
 * 只收每一行字段 2 的正整数：单个 varint、packed 逗号串，或嵌套里的字段 1。
 * 0 和 -1 不收。字段 1、字段 3 不当 hero_id。没有字段 2 时不发明 id。
 */
const MAX_BODY = 65536;
const MAX_TYPE = 32;
const MAX_HERO_IDS = 16;
const INT32_MAX = 2147483647;
const INT32_MIN = -2147483648;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.preComputeStrength。 */
export const WIRE_PRECOMPUTE_CMD = "wire.3103";

/** 空壳。hero_ids 空、不带 type、不带 line_up_type。 */
export const WIRE_PRECOMPUTE_FRAME = "040000001f0c0000";

export const WIRE_PRECOMPUTE_FIGHTING_FIELD = 1;
export const WIRE_PRECOMPUTE_HERO_FIELD = 1;
export const WIRE_PRECOMPUTE_TYPE_FIELD = 2;
export const WIRE_PRECOMPUTE_LINEUP_FIELD = 3;

/** 3101 行上当 hero_id 收的字段。不是行上的字段 1，也不是字段 3。 */
export const WIRE_PRECOMPUTE_LINEUP_HERO_FIELD = 2;

export const WIRE_PRECOMPUTE_EMPTY = "已同步";
export const WIRE_PRECOMPUTE_UNSYNCED = "真服未同步";
export const WIRE_PRECOMPUTE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_PRECOMPUTE_ABSENT = "fighting 未带";

export const WIRE_PRECOMPUTE_NOTE =
  "主线页「空壳探针」发空 c2s 3103（GReqPreComputeStrength，整帧 040000001f0c0000）。「预计算」可带字段 1 hero_ids（repeated int64）、字段 2 type（string）、字段 3 line_up_type（int32）。空白不收成 0，也不收成 1。战斗链是 …→3102→3103。须已有 3007。不重发 3102、3006、3012、3010、3001、3007、3004、3099、3101、18001、3203。不从 3102、3001 或 3006 自动接。hero_ids 可从已同步 3101 的字段 2 预填。不发 3002、3005、3008、3011。硬禁 3013。不发 3100、3097、3098。不跟 3030 混发。硬禁 4601、29001。不把 Mock 1201/1202 当真服。不播 spine。不进 pullIdle，不夹活动号。缺字段不写成 0。出现的 fighting=0 仍写 0，空 hero_ids 的 0 是成功。空包体是已同步。未同步 Toast「真服未同步」。fighting=0 不 Toast。不回落 Mock。只计算。不开战，不落库，无领奖，无扣费。不写金币，不写钻石。不改 Boot";

export const WIRE_PRECOMPUTE_SIDE_EFFECT =
  "只计算。不开战，不落库，无领奖，无扣费，不写养成。不回拉 3007。空壳或带 hero_ids，挂在已合 3102 之后，主线页点按钮才发。不从 3102、3001 或 3006 自动接。不重发 3102。不重发 3001。不进 pullIdle。不发 3002。不发 3005。不发 3008、3011。硬禁 3013。不发 3100、3097、3098。不跟 3030 混发。不重发 3007、3004、3010、3012、3006、3099、3101、18001、3203。硬禁 4601、29001。不播 spine";

/** 本刀不编码这些号。3102 / 3006 / 3001 / 3010 / 3012 / 3007 / 3101 / 3099 已有自己的帧，由战斗链断言不重发。3013 硬禁。 */
export const WIRE_PRECOMPUTE_BANNED_CMDS = [
  "wire.3002",
  "wire.3008",
  "wire.3011",
  "wire.3013",
  "wire.3100",
  "wire.3097",
  "wire.3098",
  "wire.3030",
  "wire.4601",
  "wire.29001",
  "wire.1201",
  "wire.1202",
] as const;

export interface WirePreComputeMark {
  field: number;
  text: string;
}

export interface WirePreComputeQuery {
  /** true 时整帧是空壳，忽略另外三项。 */
  shell: boolean;
  heroIds: number[];
  /** null 表示这次不带 type。空串不发出。 */
  type: string | null;
  /** null 表示这次不带 line_up_type。0 是要发出的 0。 */
  lineUpType: number | null;
}

export interface WirePreComputeSnapshot {
  /** 空包体。fighting 和 type 都保持缺省。 */
  empty: boolean;
  /** 字段 1。没有时是 null，不写成 0。出现的 0 仍是 0。 */
  fighting: number | null;
  /** 字段 2。没有时是 null。出现的空串仍是空串。 */
  type: string | null;
  marks: WirePreComputeMark[];
}

export interface WireLineUpHeroSource {
  rows: { marks: { field: number; text: string }[] }[];
}

/** 从已同步的 3101 行上收 hero_id。没有快照、没有字段 2、或只有 0/-1 时返回空数组。 */
export function heroIdsFromLineUp(snap: WireLineUpHeroSource | null | undefined): number[] {
  if (!snap || !snap.rows) return [];
  const ids: number[] = [];
  for (let r = 0; r < snap.rows.length; r++) {
    const marks = snap.rows[r].marks || [];
    for (let i = 0; i < marks.length; i++) {
      if (marks[i].field !== WIRE_PRECOMPUTE_LINEUP_HERO_FIELD) continue;
      const found = numbersInHeroMark(marks[i].text);
      for (let n = 0; n < found.length; n++) {
        ids.push(found[n]);
        if (ids.length >= MAX_HERO_IDS) return ids;
      }
    }
  }
  return ids;
}

/** 手填的 hero_ids。逗号、顿号、空白分开。0、负数、非数字丢掉。最多 16 个。 */
export function parseHeroIdList(text: string): number[] {
  if (typeof text !== "string" || !text) return [];
  const parts = text.split(/[,，\s]+/);
  const ids: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (!/^[1-9]\d*$/.test(part)) continue;
    const n = Number(part);
    if (!Number.isSafeInteger(n) || n <= 0) continue;
    ids.push(n);
    if (ids.length >= MAX_HERO_IDS) break;
  }
  return ids;
}

/** 空白返回 null，表示不带这个字段。超长按码点截断。不把空白收成 1。 */
export function parsePreComputeType(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const trimmed = text.replace(/[\r\n]/g, "").trim();
  if (!trimmed) return null;
  const chars = Array.from(trimmed);
  if (chars.length <= MAX_TYPE) return trimmed;
  return chars.slice(0, MAX_TYPE).join("");
}

/** 空白返回 null。0 和 -1 都是要发出的数。超出 int32 的丢掉。 */
export function parseLineUpType(text: unknown): number | null {
  if (typeof text === "number" && Number.isFinite(text)) return clampInt32(Math.floor(text));
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!/^-?(0|[1-9]\d*)$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n)) return null;
  return clampInt32(n);
}

export function readWirePreComputeQuery(data: unknown): WirePreComputeQuery {
  if (!data || typeof data !== "object") {
    return { shell: true, heroIds: [], type: null, lineUpType: null };
  }
  const raw = data as { shell?: unknown; heroIds?: unknown; type?: unknown; lineUpType?: unknown };
  if (raw.shell === true) return { shell: true, heroIds: [], type: null, lineUpType: null };
  const heroIds = Array.isArray(raw.heroIds) ? clampHeroIds(raw.heroIds) : [];
  const type = parsePreComputeType(raw.type);
  const lineUpType = parseLineUpType(raw.lineUpType as string | number | null);
  return { shell: false, heroIds, type, lineUpType };
}

/** 没发 type，回包也不带 type，记 omit。两边相同记 match。否则 mismatch。 */
export function preComputeTypeEcho(sent: string | null, echoed: string | null): "omit" | "match" | "mismatch" {
  if (sent === null) return echoed === null ? "omit" : "mismatch";
  return echoed === sent ? "match" : "mismatch";
}

/** GReqPreComputeStrength。shell 或三项都空时返回空包体。 */
export function encodeWirePreComputeBody(query: WirePreComputeQuery): Uint8Array {
  if (query.shell) return new Uint8Array(0);
  const parts: number[] = [];
  for (let i = 0; i < query.heroIds.length; i++) pushVarintField(parts, WIRE_PRECOMPUTE_HERO_FIELD, query.heroIds[i]);
  if (query.type !== null) pushString(parts, WIRE_PRECOMPUTE_TYPE_FIELD, query.type);
  if (query.lineUpType !== null) pushSigned32Field(parts, WIRE_PRECOMPUTE_LINEUP_FIELD, query.lineUpType);
  return Uint8Array.from(parts);
}

/**
 * 解 s2c 3103。空包体返回已同步，fighting 保持缺省。
 * 字段 1 出现的 0 记成 0。超长、坏 varint 返回 null，调用方保持上一次。
 */
export function decodeWirePreComputeStrength(body: Uint8Array | null | undefined): WirePreComputeSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return { empty: true, fighting: null, type: null, marks: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const snap: WirePreComputeSnapshot = { empty: false, fighting: null, type: null, marks: [] };
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === WIRE_PRECOMPUTE_FIGHTING_FIELD && row.kind === "varint" && typeof row.varint === "number") {
      const value = acceptedInt(row.varint);
      if (value === null) snap.marks.push({ field: row.field, text: "未解" });
      else snap.fighting = value;
      continue;
    }
    if (row.field === WIRE_PRECOMPUTE_TYPE_FIELD && row.kind === "bytes" && row.bytes) {
      const text = decodeUtf8(row.bytes);
      if (text === null) snap.marks.push({ field: row.field, text: "未解" });
      else snap.type = text;
      continue;
    }
    const mark = markOf(row);
    if (mark) snap.marks.push(mark);
  }
  return snap;
}

/** 主线页上的预计算。null 是还没同步。fighting=0 写成 0，不写成未同步。 */
export function formatWirePreCompute(snap: WirePreComputeSnapshot | null): string {
  if (!snap) return "预计算 " + WIRE_PRECOMPUTE_UNSYNCED;
  if (snap.empty) return "预计算 " + WIRE_PRECOMPUTE_EMPTY;
  const fight = snap.fighting === null ? WIRE_PRECOMPUTE_ABSENT : "fighting=" + snap.fighting;
  const type = snap.type === null ? "" : snap.type.length === 0 ? " / type 空" : " / type=" + snap.type;
  return joinMarks("预计算 " + fight + type, snap.marks);
}

function clampHeroIds(values: unknown[]): number[] {
  const ids: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const raw = values[i];
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isSafeInteger(n) || n <= 0) continue;
    ids.push(n);
    if (ids.length >= MAX_HERO_IDS) break;
  }
  return ids;
}

function clampInt32(n: number): number | null {
  if (n > INT32_MAX || n < INT32_MIN) return null;
  return n;
}

function numbersInHeroMark(text: string): number[] {
  if (!text) return [];
  if (/^[0-9]+(,[0-9]+)*$/.test(text)) {
    const ids: number[] = [];
    const parts = text.split(",");
    for (let i = 0; i < parts.length; i++) {
      const n = positiveId(parts[i]);
      if (n !== null) ids.push(n);
    }
    return ids;
  }
  const ids: number[] = [];
  const re = /字段1=([1-9]\d*)/g;
  let found: RegExpExecArray | null = re.exec(text);
  while (found) {
    const n = positiveId(found[1]);
    if (n !== null) ids.push(n);
    found = re.exec(text);
  }
  return ids;
}

function positiveId(text: string): number | null {
  if (!/^[1-9]\d*$/.test(text)) return null;
  const n = Number(text);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

function acceptedInt(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  if (value === -1) return -1;
  if (value < 0) return null;
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

function joinMarks(line: string, marks: WirePreComputeMark[]): string {
  if (marks.length === 0) return line;
  const parts: string[] = [];
  const n = Math.min(marks.length, 6);
  for (let i = 0; i < n; i++) parts.push("字段" + marks[i].field + "=" + marks[i].text);
  if (marks.length > n) parts.push("其余 " + (marks.length - n) + " 项");
  return line + " / " + parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function markOf(row: RawField): WirePreComputeMark | null {
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

function pushString(parts: number[], field: number, text: string): void {
  const bytes = utf8(text);
  pushVarint(parts, (field << 3) | 2);
  pushVarint(parts, bytes.length);
  for (let i = 0; i < bytes.length; i++) parts.push(bytes[i]);
}

function pushVarintField(parts: number[], field: number, value: number): void {
  pushVarint(parts, field << 3);
  pushVarint(parts, value);
}

function pushSigned32Field(parts: number[], field: number, value: number): void {
  pushVarint(parts, field << 3);
  if (value >= 0) {
    pushVarint(parts, value);
    return;
  }
  pushNeg32Varint(parts, value);
}

function pushNeg32Varint(parts: number[], value: number): void {
  let n = value >>> 0;
  for (let i = 0; i < 4; i++) {
    parts.push((n & 0x7f) | 0x80);
    n = n >>> 7;
  }
  parts.push((n & 0x0f) | 0x70 | 0x80);
  parts.push(0xff, 0xff, 0xff, 0xff, 0x01);
}

function pushVarint(parts: number[], value: number): void {
  let n = Math.floor(value);
  if (n < 0) n = 0;
  while (n > 127) {
    parts.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  parts.push(n);
}

function utf8(text: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text);
  const parts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }
    if (c < 0x80) parts.push(c);
    else if (c < 0x800) parts.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) parts.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else parts.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return Uint8Array.from(parts);
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
  } catch (_err) {
    return null;
  }
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
      continue;
    }
    return null;
  }
  return out;
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
